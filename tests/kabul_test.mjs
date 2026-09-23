// KABUL KAPISI TESTİ (cutover, _APP_Gereksinim_Sozlesmesi.md §C) — C2 app-only seans korunur, C3 yedek→temiz cihaz birebir, C4 iki cihaz çakışması.
// Çalıştır: node tests/kabul_test.mjs   (fake-indexeddb; iki ayrı "cihaz" = iki ayrı Dexie veritabanı adı)
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import * as S from '../src/store.js';
import * as P from '../src/program.js';
let ok = 0, fail = 0; const t = (n, c, d = '') => c ? ok++ : (fail++, console.log('  ✗', n, d));
const load = p => JSON.parse(readFileSync(new URL(`../data/programdef_${p}.json`, import.meta.url), 'utf8'));
const defs = Object.fromEntries(['Deadlift', 'Alper', 'Diger'].map(p => [p, load(p)]));
const mig = readFileSync(new URL('../../faz1/migrasyon/out/events.ndjson', import.meta.url), 'utf8');
const N_MIG = mig.trim().split('\n').length;
const snapshot = async () => { const out = {}; for (const [p, d] of Object.entries(defs)) { const st = await S.stateFor(p, d.cycle); out[p] = { n: st.length, weekly: P.weekly(d, st), idx: P.activeSessionIdx(d, st, null, new Set(), new Date(2026, 8, 24, 12)) }; } return out; };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// ── Cihaz A: göç + app girişleri ─────────────────────────────────────
const r1 = await S.importNdjson(mig); t(`C1 göç ${N_MIG} olay yazıldı`, r1.written === N_MIG && r1.bad === 0, JSON.stringify(r1));
// app-only seans: Deadlift W2 H3 Çar Hip Thrust (telefondan girilmiş gibi, Excel göçündeki aynı satırdan SONRA)
const dd = defs.Deadlift; const s8 = P.sessions(dd).find(s => s.week === 3 && s.day === 'Car');
const appEv = await S.logSet({ ref: { program: 'Deadlift', cycle: dd.cycle, week: 3, day: 'Car', row_key: 'Hip Thrust|Agir' }, actor: 'arda', kg: 200, sets: 4, reps: 5, rpe: 7.5, rest_s: 300, rest_plan_s: 300 });
const appEv2 = await S.logSet({ ref: { program: 'Diger', cycle: defs.Diger.cycle, week: 2, day: 'Sal', row_key: P.sessions(defs.Diger)[3].rows[0].row_key }, actor: 'arda', kg: 42.5, sets: 4, reps: 3, rpe: 7 });
const stD = await S.stateFor('Deadlift', dd.cycle);
const ht = stD.find(s => s.week === 3 && s.day === 'Car' && s.row_key === 'Hip Thrust|Agir' && s.actor === 'arda');
t('C2 aynı satır Excel+app: durum tek kayıt, app (daha yeni ts) kazanır, rest_s korunur', ht && ht.kg === 200 && ht.rest_s === 300 && ht.event_id === appEv.id, JSON.stringify(ht));
t('C2 aynı satır çift sayılmaz: Çar seansında Hip Thrust durumu 1 adet', stD.filter(s => s.week === 3 && s.day === 'Car' && s.row_key === 'Hip Thrust|Agir' && s.actor === 'arda').length === 1);
// yeniden göç (cutover senaryosu): app olayları kaybolmaz, göç idempotent
const r2 = await S.importNdjson(mig); t('C2 yeniden göç: 0 yeni, hepsi zaten var', r2.written === 0 && r2.skipped === N_MIG, JSON.stringify(r2));
const allA = await S.exportNdjson(); const nA = allA.trim().split('\n').length;
t(`C2 yeniden göç sonrası olay sayısı = göç + app (${N_MIG}+2)`, nA === N_MIG + 2, nA);
t('C2 app olayları hâlâ mevcut', allA.includes(appEv.id) && allA.includes(appEv2.id));
const snapA = await snapshot();
t('C2 yeniden göç durum değiştirmedi (Hip Thrust hâlâ app kaydı)', (await S.stateFor('Deadlift', dd.cycle)).find(s => s.row_key === 'Hip Thrust|Agir' && s.week === 3 && s.day === 'Car')?.event_id === appEv.id);

// ── C3: yedek → temiz cihaz (yeni Dexie veritabanı) → birebir ────────
// store.js tek `db` örneği kullanır → temiz cihazı, A'nın tablolarını silip yeniden yükleyerek temsil ediyoruz (aynı şema, sıfır veri).
await S.db.events.clear(); await S.db.set_state.clear(); await S.db.sync_state.clear(); await S.db.meta.clear();
t('C3 temiz cihaz: 0 olay', (await S.db.events.count()) === 0);
const r3 = await S.importNdjson(allA);
t(`C3 yedekten yükle: ${nA} yazıldı, 0 bozuk`, r3.written === nA && r3.bad === 0, JSON.stringify(r3));
const snapB = await snapshot();
for (const p of Object.keys(defs)) {
  t(`C3 ${p} durum sayısı birebir (${snapA[p].n})`, snapA[p].n === snapB[p].n, `${snapA[p].n} vs ${snapB[p].n}`);
  t(`C3 ${p} haftalık özet birebir`, same(snapA[p].weekly, snapB[p].weekly));
  t(`C3 ${p} aktif seans birebir (${snapA[p].idx})`, snapA[p].idx === snapB[p].idx, `${snapA[p].idx} vs ${snapB[p].idx}`);
}
const allB = await S.exportNdjson();
t('C3 yeniden dışa aktarım bayt-bayt aynı', allA === allB, `${allA.length} vs ${allB.length}`);
t('C3 yedek yükleme ikinci kez → 0 yeni (idempotent)', (await S.importNdjson(allA)).written === 0);

// ── C4: iki cihaz aynı satıra yazdı ───────────────────────────────────
const ref = { program: 'Diger', cycle: defs.Diger.cycle, week: 2, day: 'Per', row_key: P.sessions(defs.Diger)[4].rows[0].row_key };
const mk = (id, ts, kg, device) => ({ id, ts, ts_kind: 'device', device, entered_by: 'arda', type: 'set.logged', ref, data: { actor: 'arda', kg, sets: 1, reps: 1, reps_text: null, rpe: 8, note: null, skipped: false }, source: { kind: 'app', device }, schema_v: 1 });
const evA = mk('01TESTAAAAAAAAAAAAAAAAAAAA', '2026-09-22T07:10:00.000+03:00', 100, 'iphone'), evB = mk('01TESTBBBBBBBBBBBBBBBBBBBB', '2026-09-22T07:12:00.000+03:00', 102.5, 'mac');
// sıra 1: A sonra B
await S.importNdjson(JSON.stringify(evA) + '\n' + JSON.stringify(evB) + '\n', { fromRemote: true });
const st1 = (await S.stateFor('Diger', ref.cycle)).find(s => s.week === 2 && s.day === 'Per' && s.row_key === ref.row_key);
t('C4 iki cihaz: geç ts (Mac 102.5) kazanır', st1?.kg === 102.5 && st1.event_id === evB.id, JSON.stringify(st1));
t('C4 kaybeden kayıt (iPhone 100) olay günlüğünde duruyor', !!(await S.db.events.get(evA.id)));
// sıra 2: temiz cihaza ters sırayla (B sonra A) → aynı sonuç (sıra bağımsızlığı)
await S.db.events.clear(); await S.db.set_state.clear(); await S.db.sync_state.clear();
await S.importNdjson(JSON.stringify(evB) + '\n' + JSON.stringify(evA) + '\n', { fromRemote: true });
const st2 = (await S.stateFor('Diger', ref.cycle)).find(s => s.week === 2 && s.day === 'Per' && s.row_key === ref.row_key);
t('C4 ters sıra → aynı kazanan (sıra bağımsız LWW)', st2?.kg === 102.5 && st2.event_id === evB.id, JSON.stringify(st2));
// eşit ts → id kırar (deterministik)
const evC = { ...mk('01TESTCCCCCCCCCCCCCCCCCCCC', evB.ts, 97.5, 'ipad') };
await S.importNdjson(JSON.stringify(evC) + '\n', { fromRemote: true });
const st3 = (await S.stateFor('Diger', ref.cycle)).find(s => s.week === 2 && s.day === 'Per' && s.row_key === ref.row_key);
t('C4 eşit ts → id büyük olan kazanır (C > B)', st3?.event_id === evC.id && st3.kg === 97.5, JSON.stringify(st3));
// gelecekteki ts (saat ileri) kırpılır: bugün + 1 yıl → now'a kırpılır, yine de geçerli bir kayıt
const evF = mk('01TESTFFFFFFFFFFFFFFFFFFFF', new Date(Date.now() + 365 * 864e5).toISOString(), 90, 'bozuk-saat');
await S.importNdjson(JSON.stringify(evF) + '\n', { fromRemote: true });
const st4 = (await S.stateFor('Diger', ref.cycle)).find(s => s.week === 2 && s.day === 'Per' && s.row_key === ref.row_key);
t('C4 gelecek tarihli kayıt kaydedilir; ts now’a kırpılır → şimdilik kazanır (90) ama ebedi değil', !!(await S.db.events.get(evF.id)) && st4?.kg === 90, JSON.stringify(st4));

// ── C1 gerçek cutover: telefon dışa aktarımı (eski göç, farklı ID'ler) + yeni göç → replaceMigration ──
const PHONE = new URL('../../faz1/fixtures/telefon_20260923.ndjson', import.meta.url);
await S.db.events.clear(); await S.db.set_state.clear(); await S.db.sync_state.clear(); await S.db.meta.clear(); await S.rebuildState();
const ph = readFileSync(PHONE, 'utf8'); const rp = await S.importNdjson(ph); const nPh = ph.trim().split('\n').length;
t(`C1 telefon dışa aktarımı yüklendi (${nPh}, 0 bozuk)`, rp.written === nPh && rp.bad === 0, JSON.stringify(rp));
const appIds = ph.trim().split('\n').map(l => JSON.parse(l)).filter(e => e.device !== 'migration').map(e => e.id);
const before = await snapshot();
t('C1 telefon durumu: Deadlift aktif 9, Diğer 4 (Excel P3 ile aynı)', before.Deadlift.idx === 9 && before.Diger.idx === 4, JSON.stringify([before.Deadlift.idx, before.Diger.idx]));
const rr = await S.replaceMigration(mig);
t(`C1 göç yenile: ${rr.dusurulen} eski göç düşürüldü, ${rr.written} yeni yazıldı, 0 bozuk`, rr.dusurulen === 238 && rr.written === N_MIG - 2 && rr.skipped === 2 && rr.bad === 0, JSON.stringify(rr));
t('C1 hiçbir olay silinmedi (eski göç + yeni göç + app + 1 düşürme olayı)', (await S.db.events.count()) === nPh + (N_MIG - 2) + 1, await S.db.events.count());
const supEv = (await S.db.events.where('type').equals('migration.superseded').toArray())[0]; t('C1 düşürme olayı keep_ids = yeni göç (248 göç cihazlı; 2 pano stres hariç) taşır', supEv?.data.keep_ids?.length === 248 && supEv.data.dropped_count === 238, JSON.stringify(supEv?.data && { k: supEv.data.keep_count, d: supEv.data.dropped_count }));
t('C1 app olaylarının hepsi duruyor', (await S.db.events.bulkGet(appIds)).every(Boolean));
const after = await snapshot();
t('C1 yenileme sonrası Deadlift aktif 9, Diğer 4 (değişmedi)', after.Deadlift.idx === 9 && after.Diger.idx === 4, JSON.stringify([after.Deadlift.idx, after.Diger.idx]));
for (const p of Object.keys(defs)) t(`C1 ${p} durum sayısı çiftlenmedi (${before[p].n} → ${after[p].n})`, after[p].n <= before[p].n + 4, `${before[p].n} → ${after[p].n}`);
const htA = (await S.stateFor('Deadlift', 'W2')).find(s => s.week === 3 && s.day === 'Car' && s.row_key === 'Hip Thrust|Agir');
t('C1 Hip Thrust H3 Çar: 200 kg, kazanan app kaydı', htA?.kg === 200 && appIds.includes(htA.event_id), JSON.stringify(htA));
// ikinci kez yenile → düşürülecek eski göç yok (yeni göç düşürülmez çünkü aynı dosya → 0 yeni; düşürülen = yeni göçün 250'si, içerik yeniden yüklenir)
const rr2 = await S.replaceMigration(mig); t('C1 yeniden yenile: aynı dosya → 0 düşürme, 0 yeni, durum aynı', rr2.dusurulen === 0 && rr2.written === 0 && same(await snapshot(), after), JSON.stringify(rr2));
// rebuildState düşürmeyi ts sırasından bağımsız uygular
await S.rebuildState(); t('C1 rebuildState sonrası durum aynı', same(await snapshot(), after));
// kırmızı takım #5: geç gelen ESKİ göç olayı (başka cihazdan pull) — kural bazlı düşürme onu da düşürür
const lateOld = JSON.parse(ph.trim().split('\n').find(l => { const e = JSON.parse(l); return e.device === 'migration' && e.type === 'set.logged' && e.ref?.program === 'Deadlift' && e.ref.cycle === 'W2'; }));
const lateCopy = { ...lateOld, id: lateOld.id.slice(0, -4) + 'ZZZZ', ts: '2026-12-01T00:00:00.000Z', data: { ...lateOld.data, kg: 1 } };   // sahte: geç ts, saçma kg, göç cihazı
await S.importNdjson(JSON.stringify(lateCopy) + '\n', { fromRemote: true });
t('C1 geç gelen eski göç olayı (kural dışı id) duruma girmez', same(await snapshot(), after));
// kırmızı takım #7: bozuk / yanlış dosya → hiçbir şey değişmez
const bad1 = await S.replaceMigration('{"id":"x"}\nnot json\n'); const bad2 = await S.replaceMigration(ph.trim().split('\n').slice(0, 10).join('\n') + '\n');
t('C1 bozuk dosya reddedilir, durum aynı', !!bad1.hata && !!bad2.hata && same(await snapshot(), after), JSON.stringify([bad1, bad2]));
// dışa aktar → temiz cihaz → aynı (düşürme olayı yedekte taşınır)
const dump = await S.exportNdjson(); await S.db.events.clear(); await S.db.set_state.clear(); await S.db.sync_state.clear(); await S.rebuildState();
await S.importNdjson(dump); t('C1 yedek → temiz cihaz: düşürme dahil birebir', same(await snapshot(), after));

console.log(`\n  ${ok}/${ok + fail} geçti — ${fail ? 'KABUL TESTİ BASARISIZ' : 'KABUL TESTİ GECTI'} (taban ≥ 20 kontrol: ${ok + fail >= 20 ? 'ok' : 'TABAN ALTI'})`);
process.exit(fail || ok + fail < 20 ? 1 : 0);
