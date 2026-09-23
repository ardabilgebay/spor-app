import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import * as S from '../src/store.js'; import * as M from '../src/motor.js';
import * as P from '../src/program.js';
let ok = 0, fail = 0; const t = (n, c, d = '') => c ? ok++ : (fail++, console.log('  ✗', n, d));
const load = p => JSON.parse(readFileSync(new URL(`../data/programdef_${p}.json`, import.meta.url), 'utf8'));
await S.importNdjson(readFileSync(new URL('../../faz1/migrasyon/out/events.ndjson', import.meta.url), 'utf8'));
// Deadlift: W2 state (Excel 23 Eyl: H3 Çar/S8 [C] tarafından işlendi) → aktif seans 9 (H3 Cum), Excel _meta P3 = 9
const dd = load('Deadlift'); const stD = await S.stateFor('Deadlift', 'W2');
t('Deadlift seans sayısı 18', P.sessions(dd).length === 18, P.sessions(dd).length);
const t21 = new Date(2026, 8, 21, 12), t22 = new Date(2026, 8, 22, 6);   // pano girişleri 21 Eyl sabahı (S7) — sabit tarihle deterministik
t('Deadlift aktif seans = 9 (Excel P3, 23 Eyl)', P.activeSessionIdx(dd, stD, null, new Set(), t22) === 9, P.activeSessionIdx(dd, stD, null, new Set(), t22));
t('A1: 21 Eyl\'de de 9 (S8 Excel\'den, ts_kind=estimated → işaretçiyi tutmaz; S7 dolu ve geçmiş)', P.activeSessionIdx(dd, stD, null, new Set(), t21) === 9, P.activeSessionIdx(dd, stD, null, new Set(), t21));
const v7 = P.sessionView(dd, stD, 7);
t('S7 = H3 Pzt, 5 satır, 5 tamam', v7.week === 3 && v7.day === 'Pzt' && v7.rows.length === 5 && v7.tamamlanan === 5, JSON.stringify([v7.week, v7.day, v7.rows.length, v7.tamamlanan]));
t('S7 Chin-up kg 95 (bw toplam)', v7.rows.find(r => r.egzersiz === 'Chin-up').arda.kg === 95);
t('S7 Top Single renk: 7 vs 9 → dusuk', v7.rows[0].renk === 'dusuk', v7.rows[0].renk);
t('S7 ısınma 152.5', v7.isinma === 'ISINMA · Deadlift:   boş bar  →  60  →  92.5  →  115  →  132.5  →  152.5 kg  (TOP SET)', v7.isinma);
t('S7 plaka 152.5', v7.rows[0].plaka === 'bir tarafa 66.25: 2×25 + 15 + 1.25', v7.rows[0].plaka);
const v8 = P.sessionView(dd, stD, 8); t('S8 (H3 Çar) ısınma yok (aksesuar günü)', v8.isinma === null && v8.rows.length === 3, v8.isinma);
t('S8 HEDEF metni', v8.rows[0].hedef === 'Agir\n4×5 · RPE8', JSON.stringify(v8.rows[0].hedef));
// Weekly Deadlift W2 vs Excel: H1 min 3592.5 max 5032.5 gercek 4312.5, uyum "120% • BANT ICI", H3 "87% • kismi (2/3 gun)" (S7+S8 dolu)
const w = P.weekly(dd, stD);
t('W2 H1 weekly birebir', w[0].min === 3592.5 && w[0].max === 5032.5 && w[0].gercek === 4312.5 && w[0].uyum === '120% • BANT ICI' && w[0].sinyal === '🟢 PLANDA', JSON.stringify(w[0]));
t('W2 H3 weekly kısmi', w[2].uyum === '87% • kismi (2/3 gun)', w[2].uyum);
// Diger C2: 22 Eyl H1 Cum (S3) Excel'de loglu → aktif seans 4 (H2 Sal)
const dg = load('Diger'); const stG = await S.stateFor('Diger', 'C2');
t('Diger aktif seans 4', P.activeSessionIdx(dg, stG) === 4, P.activeSessionIdx(dg, stG));
const g1 = P.sessionView(dg, stG, 1);
console.log('  Diger S1:', g1.week, g1.day, g1.rows.map(r => `${r.egzersiz}/${r.modifier ?? ''} ${r.hedef.replace(/\n/g, ' | ')}`).join('  ·  '));
t('Diger S1 Squat Top Single 120 kg', g1.rows.find(r => r.modifier === 'Top Single')?.onerilen === 120);
t('Diger S1 ısınma Squat 120', g1.isinma?.includes('Squat') && g1.isinma.includes('120 kg'), g1.isinma);
// A1 — işaretçi kuralı: bugün cihazdan ilk set girildi → seans 1'de kal; ertesi gün → K14 (2); "session.finished" → 2; kilit kazanır
const s1 = P.sessions(dg)[3]; const r0 = s1.rows[0];   // S4 = H2 Sal (aktif)
await S.logSet({ ref: { program: 'Diger', cycle: dg.cycle, week: s1.week, day: s1.day, row_key: r0.row_key }, actor: 'arda', kg: 42.5, sets: 4, reps: 3, rpe: 7.5 });
const stG2 = await S.stateFor('Diger', dg.cycle);
t('A1: ilk set sonrası seans 4 kalır', P.activeSessionIdx(dg, stG2) === 4, P.activeSessionIdx(dg, stG2));
const yarin = new Date(Date.now() + 36 * 3600e3);
t('A1: ertesi gün K14 → 5', P.activeSessionIdx(dg, stG2, null, new Set(), yarin) === 5, P.activeSessionIdx(dg, stG2, null, new Set(), yarin));
t('A1: session.finished → 5', P.activeSessionIdx(dg, stG2, null, new Set([`${s1.week}|${s1.day}`])) === 5);
const g4 = P.sessionView(dg, stG, 4);
t('S4 = H2 Sal', g4.week === 2 && g4.day === 'Sal', JSON.stringify([g4.week, g4.day]));
const g6 = P.sessionView(dg, stG, 6); const ohpD = g6.rows.find(r => r.egzersiz === 'Standing Barbell OHP' && r.modifier === 'Top Double'), ohpT = g6.rows.find(r => r.egzersiz === 'Standing Barbell OHP' && r.modifier === 'Top Triple');
t('K25 H2 OHP Double: fren → 60 (H1 60×2 RPE9 > 8; plan 62.5)', ohpD?.onerilen === 60 && ohpD.fren?.uygulandi === true && ohpD.fren.plan === 62.5, JSON.stringify([ohpD?.onerilen, ohpD?.fren]));
t('K25 H2 OHP Triple: fren yok → 52.5', ohpT?.onerilen === 52.5 && ohpT.fren === null, JSON.stringify([ohpT?.onerilen, ohpT?.fren]));
const g9 = P.sessionView(dg, stG, 9); const ohp3 = g9.rows.find(r => r.egzersiz === 'Standing Barbell OHP' && r.modifier === 'Top Double');
t('K25 H3 OHP Double: H2 boş → plan 65', ohp3?.onerilen === 65 && ohp3.fren?.uygulandi === false, JSON.stringify([ohp3?.onerilen, ohp3?.fren]));
// K25 kırmızı takım: H2 OHP Double ATLANDI (kg=0) → H3 fren yok, plan 65
const s6 = P.sessions(dg)[5]; const rD = s6.rows.find(r => r.modifier === 'Top Double' && r.egzersiz === 'Standing Barbell OHP');
await S.logSet({ ref: { program: 'Diger', cycle: dg.cycle, week: s6.week, day: s6.day, row_key: rD.row_key }, actor: 'arda', kg: 0, skipped: true, rpe: 9 });
const stG3 = await S.stateFor('Diger', dg.cycle); const ohp3b = P.sessionView(dg, stG3, 9).rows.find(r => r.egzersiz === 'Standing Barbell OHP' && r.modifier === 'Top Double');
t('K25 önceki hafta ATLANDI → fren yok, plan 65 (0 kg önerisi imkânsız)', ohp3b?.onerilen === 65 && ohp3b.fren.uygulandi === false && ohp3b.fren.prevSkipped === true, JSON.stringify([ohp3b?.onerilen, ohp3b?.fren]));
t('K25 saf: kg 0 → plan', M.rpeFreni(9, 0, 65) === 65 && M.rpeFreni(9, 60, 65, 8, true) === 65 && M.rpeFreni(9, 60, 65) === 60 && M.rpeFreni(8, 60, 65) === 65);
// Alper omuz rotasyonu (23 Eyl): H1 HDSP heavy 3×6 · H2 Cheat Side Raise · H3 Heavy OHP
const da = load('Alper'); const alpS = P.sessions(da);
const omuz = h => da.rows.filter(r => r.week === h && r.day === 'Pzt' && /Omuz 1/.test(r.sistem_notu ?? '')).map(r => `${r.egzersiz} ${r.set}×${r.tekrar}`).join();
t('Alper omuz rotasyonu H1/H2/H3/H5', omuz(1) === 'Heavy Dumbbell Shoulder Press 3×6' && omuz(2) === 'Heavy Cheat Side Raise 3×6' && omuz(3) === 'Heavy OHP 3×6' && omuz(5) === 'Heavy Dumbbell Shoulder Press 3×6', [1,2,3,5].map(omuz).join(' | '));
const aV1 = P.sessionView(da, await S.stateFor('Alper', da.cycle), 1);
t('Alper ısınma: Arda 107.5 + Alper 90 rampası', aV1.topKg === 107.5 && aV1.topAlperKg === 90 && JSON.stringify(aV1.isinmaBasamakAlper) === '[35,55,67.5,77.5]', JSON.stringify([aV1.topKg, aV1.topAlperKg, aV1.isinmaBasamakAlper]));
t('A1: kilit 6 kazanır', P.activeSessionIdx(dg, stG2, 6) === 6);
// K22 / BUGÜN!I36 — kol varyant override (Diğer H1 Per: Biceps takvim B → A)
const per1 = P.sessions(dg).find(s => s.week === 1 && s.day === 'Per');
const blok = P.kolBlok(dg, per1.rows);
t('kol blok Biceps takvim B, seçenekler A/B/C', blok && blok.kas === 'Biceps' && blok.takvim === 'B' && blok.secenekler.join('') === 'ABC', JSON.stringify(blok));
const ovA = new Map([['1|Per', 'A']]); const per1A = P.sessions(dg, ovA).find(s => s.week === 1 && s.day === 'Per');
const kolA = per1A.rows.filter(P.kolBilgi);
t('override A: kol satırları havuzdan (slot 1..n), ana kaldırış aynı', per1A.rows[0].egzersiz === 'Snatch' && kolA.length >= 3 && kolA.every(r => r.kol_override) && kolA.map(r => r.egzersiz).join('|') !== per1.rows.filter(P.kolBilgi).map(r => r.egzersiz).join('|'), kolA.map(r => `${r.egzersiz} ${r.set}×${r.tekrar ?? r.tekrar_metin}`).join(' · '));
t('override = takvim (B) → satırlar aynen', P.applyKolOverride(dg, per1.rows, 'B') === per1.rows);
const vA = P.sessionView(dg, stG2, per1A.idx, ovA);
t('sessionView kol bilgisi takvimi korur', vA.kol.takvim === 'B' && vA.kolVaryant === 'A', JSON.stringify([vA.kol, vA.kolVaryant]));
t('Alper Pzt kol bloğu var', !!P.kolBlok(load('Alper'), P.sessions(load('Alper'))[0].rows));
t('Deadlift kol bloğu yok', !P.kolBlok(dd, P.sessions(dd)[0].rows));
// Alper: iki plaka
const al = load('Alper'); const a1 = P.sessionView(al, await S.stateFor('Alper', 'C2'), 1);
t('Alper bench iki plaka satırı', a1.rows[0].plaka && a1.rows[0].plakaAlper && a1.rows[0].plaka !== a1.rows[0].plakaAlper, `${a1.rows[0].plaka} | ${a1.rows[0].plakaAlper}`);
t('Alper HEDEF · Alper 90 kg', a1.rows[0].hedef.endsWith('· Alper 90 kg'), a1.rows[0].hedef);
console.log(`\n  ${ok}/${ok + fail} geçti — ${fail ? 'BASARISIZ' : 'PROGRAM TEST GECTI'}`); process.exit(fail ? 1 : 0);
