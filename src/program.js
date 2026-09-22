// PROGRAM KATMANI — ProgramDef + set_state → seans modeli. Saf (store'a dokunmaz), motor.js'i kullanır.
import * as M from './motor.js';

const GUN_SIRA = { Deadlift: ['Pzt', 'Car', 'Cum'], Alper: ['Pzt', 'Car'], Diger: ['Sal', 'Per', 'Cum'] };
export const GUN_AD = { Pzt: 'Pazartesi', Sal: 'Salı', Car: 'Çarşamba', Per: 'Perşembe', Cum: 'Cuma' };
const JS_GUN = { 1: 'Pzt', 2: 'Sal', 3: 'Car', 4: 'Per', 5: 'Cum' };   // Date.getDay()
const BAR_KEYS = ['deadlift', 'bench press', 'squat', 'hip thrust', 'bar row', 'clean', 'snatch', 'good morning'];
export const PLAKALAR = [25, 20, 15, 10, 5, 2.5, 1.25], BAR = 20;

export function norm(t) { return String(t ?? '').replace(/[ıİşŞçÇğĞüÜöÖ]/g, c => 'iissccgguuoo'['ıİşŞçÇğĞüÜöÖ'.indexOf(c)]).toLowerCase(); }
export const isBarli = r => !r.bw && BAR_KEYS.some(k => norm(r.egzersiz).includes(k));

/** KOL satırı bilgisi — ProgramDef snapshot'ında `sistem_notu` "Kol · <Kas> · varyant <V>" kalıbı (K4/K22). */
export function kolBilgi(r) { const m = /^Kol · (\S+) · varyant (\w)/.exec(r.sistem_notu ?? ''); return m ? { kas: m[1], varyant: m[2] } : null; }
export function kolVaryantlari(def, kas) { return [...new Set((def.kol_havuzu?.kayitlar ?? []).filter(k => k.kas === kas).map(k => k.varyant))].sort(); }
/** Seansın kol bloğu: {kas, takvim (snapshot varyantı), secenekler} ya da null. */
export function kolBlok(def, rows) {
  const k = rows.map(kolBilgi).find(Boolean); if (!k) return null;
  return { kas: k.kas, takvim: k.varyant, secenekler: kolVaryantlari(def, k.kas) };
}
/**
 * BUGÜN!I36 karşılığı — kol varyant override (K22 `etkin_*_varyant`): kol bloğu `kol_havuzu`'ndan (kas, varyant, slot 1..n) yeniden çözülür.
 * K1/K2 (kısa) slotları kullanılmaz (Excel'de de takvim yolu 1..4). Takvim varyantı seçilirse snapshot satırları aynen kalır.
 * row_key egzersiz adına bağlı → değişen egzersizin girişleri kendi adıyla saklanır (veri kaybı yok; eski ad altındaki girişler görünmez, uyarı UI'da).
 */
export function applyKolOverride(def, rows, varyant) {
  const blok = kolBlok(def, rows); if (!blok || !varyant || varyant === blok.takvim) return rows;
  const havuz = (def.kol_havuzu?.kayitlar ?? []).filter(k => k.kas === blok.kas && k.varyant === varyant && /^\d+$/.test(k.slot)).sort((a, b) => +a.slot - +b.slot);
  if (!havuz.length) return rows;
  const ilk = rows.find(kolBilgi);
  const yeni = havuz.map(k => { const num = typeof k.tekrar === 'number' ? k.tekrar : null; return { ...ilk, row: null, egzersiz: k.egzersiz, modifier: null, row_key: `${k.egzersiz}|`, set: k.set, tekrar: num, tekrar_metin: num === null ? String(k.tekrar) : null,
    onerilen: null, onerilen_alper: null, pct_1rm: null, sistem_notu: `Kol · ${blok.kas} · varyant ${varyant} (override; takvim ${blok.takvim})`, kol_override: true }; });
  const out = []; let eklendi = false;
  for (const r of rows) { if (kolBilgi(r)) { if (!eklendi) { out.push(...yeni); eklendi = true; } } else out.push(r); }
  return out;
}

/** Seans listesi: [{idx, week, day, rows:[...]}] — Excel _meta blok haritası karşılığı. `overrides`: Map<"week|day", varyant> (arm_variant.set). */
export function sessions(def, overrides = null) {
  const out = []; let idx = 0;
  const weeks = [...new Set(def.rows.map(r => r.week))].sort((a, b) => a - b);
  for (const w of weeks) for (const d of GUN_SIRA[def.program]) {
    let rows = def.rows.filter(r => r.week === w && r.day === d);
    if (!rows.length) continue;
    const ov = overrides?.get(`${w}|${d}`) ?? null;
    if (ov) rows = applyKolOverride(def, rows, ov);
    out.push({ idx: ++idx, week: w, day: d, rows, kolVaryant: ov });
  }
  return out;
}

/** Bir seansın "dolu" olması: en az bir satırda arda için kg girilmiş (Excel `Dolu`: COUNT(Yapılan kg)>0). Atlandı (0) da sayı → dolu. */
export function isDolu(sess, state) {
  return sess.rows.some(r => state.find(s => s.week === sess.week && s.day === sess.day && s.row_key === r.row_key && s.actor === 'arda' && !s.deleted && M.isNum(s.kg)));
}
/** Seansın tüm satırları arda için işlenmiş mi (kg ya da atlandı). */
export function isTamam(sess, state) {
  return sess.rows.every(r => state.find(s => s.week === sess.week && s.day === sess.day && s.row_key === r.row_key && s.actor === 'arda' && !s.deleted && M.isNum(s.kg)));
}
/**
 * K14 — aktif seans işaretçisi + APP FARKI (A1): Excel'de BUGÜN sayfası salt-okunur plan; loglama Program sayfasında.
 * App'te Bugün aynı zamanda loglama yüzeyi → ilk set kaydedilir kaydedilmez K14 sonraki seansa atlar, bu yanlış.
 * Kural: son dolu seansa BUGÜN cihazdan giriş yapılmışsa ve seans "session.finished" ile kapatılmamışsa işaretçi orada kalır
 * (seans sürerken ve aynı gün düzeltme için); ertesi gün K14 ilerler. Göç edilmiş (archive/estimated) girişler tutmaz → Excel P3 paritesi korunur.
 * Kilit her zaman kazanır. `finished`: Set<"week|day">. Motor `seansIsaretcisi` (K14) değişmedi.
 */
export function activeSessionIdx(def, state, kilit = null, finished = new Set(), now = new Date(), overrides = null) {
  const ss = sessions(def, overrides); const N = ss.length;
  let son = 0; for (const s of ss) if (isDolu(s, state)) son = Math.max(son, s.idx);   // MAX(doluIdx)
  const k14 = M.seansIsaretcisi(kilit, son, N);
  if (kilit !== null && kilit !== undefined) return k14;
  const sonS = ss.find(s => s.idx === son);
  if (!sonS) return k14;
  const kapali = finished.has(`${sonS.week}|${sonS.day}`);
  const sonTs = lastArdaTs(sonS, state);
  if (!kapali && sonTs && localDay(new Date(sonTs)) === localDay(now)) return son;
  return k14;
}
export function localDay(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
function lastArdaTs(sess, state) {
  let t = null;
  for (const s of state) if (s.week === sess.week && s.day === sess.day && s.actor === 'arda' && !s.deleted && s.ts_kind === 'device' && sess.rows.some(r => r.row_key === s.row_key)) if (!t || s.ts > t) t = s.ts;
  return t;
}
export function todayKey(date = new Date()) { return JS_GUN[date.getDay()] ?? null; }

/** Seans görünümü: satırlar + plan metni + mevcut girişler + renk + plaka + ısınma. */
export function sessionView(def, state, idx, overrides = null) {
  const cfg = M.CONFIG[def.program];
  const ss = sessions(def, overrides); const sess = ss.find(s => s.idx === idx); if (!sess) return null;
  const rows = sess.rows.map(r => {
    const st = a => state.find(s => s.week === sess.week && s.day === sess.day && s.row_key === r.row_key && s.actor === a && !s.deleted) ?? null;
    const arda = st('arda'), alper = def.program === 'Alper' ? st('alper') : null;
    const bugunRow = { ...r, tekrar: r.tekrar ?? r.tekrar_metin, dinlenme_metin: r.dinlenme };
    return {
      ...r, ref: { program: def.program, cycle: def.cycle, week: sess.week, day: sess.day, row_key: r.row_key },
      hedef: M.hedefMetni(bugunRow, cfg.hedefStil), arda, alper,
      renk: M.rpeRenk(arda?.rpe ?? null, r.hedef_rpe), barli: isBarli(r),
      plaka: isBarli(r) ? plakaMetni(arda?.kg ?? r.onerilen) : null,
      plakaAlper: isBarli(r) && def.program === 'Alper' ? plakaMetni(alper?.kg ?? r.onerilen_alper) : null,
      tamam: !!arda && M.isNum(arda.kg),
    };
  });
  const top = M.topSet(sess.rows);
  return { ...sess, N: ss.length, rows, kol: kolBlok(def, def.rows.filter(r => r.week === sess.week && r.day === sess.day)), isinma: M.isinmaMetni(top.kg, top.egzersiz, cfg.rampRoundBase), isinmaBasamak: M.isinmaBasamaklari(top.kg, cfg.rampRoundBase), topKg: top.kg,
    tamamlanan: rows.filter(r => r.tamam).length };
}

/** Plaka: 20 kg bar, greedy; artık kalırsa "(−x eksik)". */
export function plakaMetni(toplam) {
  if (!M.isNum(toplam) || toplam <= 0) return null;
  if (toplam < BAR - 0.01) return `bar altı (bar ${BAR})`;
  if (toplam < BAR + 0.01) return 'sadece bar';
  let kalan = (toplam - BAR) / 2; const yan = kalan, parca = [];
  for (const p of PLAKALAR) { const n = Math.floor((kalan + 1e-6) / p); if (n > 0) { parca.push(n > 1 ? `${n}×${M.fmt(p)}` : M.fmt(p)); kalan -= n * p; } }
  kalan = Math.round(kalan * 1000) / 1000;
  return `bir tarafa ${M.fmt(yan)}: ${parca.join(' + ')}${kalan > 0.001 ? ` (−${M.fmt(kalan)} eksik)` : ''}`;
}

/** Haftalık özet (K17/K12/K19) — Weekly Summary karşılığı. */
export function weekly(def, state, overrides = null) {
  const cfg = M.CONFIG[def.program]; const ss = sessions(def, overrides);
  const weeks = [...new Set(def.rows.map(r => r.week))].sort((a, b) => a - b);
  const rowsWith = def.rows.map(r => {
    const s = state.find(x => x.week === r.week && x.day === r.day && x.row_key === r.row_key && x.actor === 'arda' && !x.deleted);
    const tekrar = r.tekrar ?? r.tekrar_metin;
    return { ...r, hafta: r.week, tekrar, beklenen_hacim: M.beklenenHacim(r.onerilen, r.set, tekrar), beklenen_max: M.beklenenMax(r.metod, r.onerilen, r.set, tekrar, cfg.repeatMaxSets, cfg.maxSetMethods),
      gercek_hacim: s ? M.gercekHacim(s.kg, s.sets, s.reps) : null, gercek_rpe: s?.rpe ?? null,
      delta_rpe: s ? M.deltaRpe(s.rpe, r.hedef_rpe, r.week, r.modifier, cfg.excludedModifiersDeltaRpe) : null };
  });
  return weeks.map(h => {
    const doluGun = ss.filter(s => s.week === h && isDolu(s, state)).length;
    const dl = rowsWith.filter(r => r.week === h).map(r => r.delta_rpe).filter(M.isNum);
    const ortDeltaRpe = dl.length ? M.excelRound(dl.reduce((a, b) => a + b, 0) / dl.length, 2) : null;
    const filt = cfg.weeklyFilter ?? [null];
    const sum = (alan) => filt.reduce((a, e) => a + M.weeklySum(rowsWith, h, alan, e), 0);
    const min = sum('beklenen_hacim'), max = sum('beklenen_max'), ger = sum('gercek_hacim');
    return { week: h, min, max, gercek: ger, doluGun, ortDeltaRpe,
      uyum: M.uyumMetni(ger, min, max, doluGun, cfg.doluGunEsik),
      sinyal: M.sinyal({ hafta: h, ortDeltaRpe, gercek: ger, min, doluGun, esik: cfg.doluGunEsik, stil: cfg.sinyalStil }) };
  });
}

/** Önceki seans: aynı row_key (egzersiz|modifier) için bu seanstan ÖNCEKİ en son arda girişi (tüm cycle'lar). Mockup `e.prev`. */
export function prevEntry(stateAll, r, sess, cycle) {
  const cand = stateAll.filter(s => s.row_key === r.row_key && s.actor === 'arda' && !s.deleted && M.isNum(s.kg) && !s.skipped
    && !(s.cycle === cycle && s.week === sess.week && s.day === sess.day));
  if (!cand.length) return null;
  cand.sort((a, b) => a.ts < b.ts ? 1 : -1);
  return cand[0];
}
export function prevMetni(s) {
  if (!s) return null;
  const rep = s.reps ?? s.reps_text ?? '';
  return `${M.fmt(s.kg)}×${M.fmt(s.sets)}×${rep}${s.rpe ? ` R${M.fmt(s.rpe)}` : ''}${s.note ? ` — ${s.note}` : ''}`;
}
/** Dinlenme kuralı (Arda, 22 Eyl akşam): mola YALNIZ sıradaki setin türüne bağlı — top set (Single/Double/Triple/PR/Tahmin) öncesi 480 sn
 *  (son ısınmadan sonra da), Agir/heavy set öncesi 300, Backoff/Repeat/Load Drop öncesi 180, aksesuar/kol/light öncesi 90. */
export function dinlenmeKategori(r) {
  if (!r) return 'light';
  const m = `${r.modifier ?? ''} ${r.metod ?? ''}`;
  if (/single|double|triple|pr attempt|tahmin/i.test(m)) return 'top';
  if (/backoff|repeat|load drop/i.test(m)) return 'backoff';
  if (/agir|ağır|heavy/i.test(m) || (M.isNum(r.pct_1rm) && M.isNum(r.hedef_rpe) && r.hedef_rpe >= 8)) return 'heavy';
  return 'light';
}
export const DINLENME_SN = { top: 480, heavy: 300, backoff: 180, light: 90 };
/** Kaydedilen satırdan sonra sıradaki tamamlanmamış satır; yoksa null. */
export function sonrakiSatir(rows, r) { const i = rows.indexOf(r); return rows.slice(i + 1).find(x => !x.tamam) ?? rows.slice(0, i).find(x => !x.tamam) ?? null; }
/** Bir setin ÖNCESİNDEKİ plan molası. */
export function oncesiDinlenmeSn(r) { return DINLENME_SN[dinlenmeKategori(r)]; }
/** r kaydedildikten sonra kurulacak sayaç = sıradaki setin öncesi molası (sıradaki yoksa null). */
export function dinlenmeSn(rows, r) { const n = sonrakiSatir(rows, r); return n ? oncesiDinlenmeSn(n) : null; }
/** Kartta gösterilecek kısa dinlenme metni: Excel metninin ilk parçası (• / >> sonrası not). */
export function dinlenmeKisa(t) { return t ? String(t).split(/\s*(?:•|>>)\s*/)[0].trim() : null; }
