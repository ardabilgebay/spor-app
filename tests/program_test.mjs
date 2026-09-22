import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import * as S from '../src/store.js'; import * as P from '../src/program.js';
let ok = 0, fail = 0; const t = (n, c, d = '') => c ? ok++ : (fail++, console.log('  ✗', n, d));
const load = p => JSON.parse(readFileSync(new URL(`../data/programdef_${p}.json`, import.meta.url), 'utf8'));
await S.importNdjson(readFileSync(new URL('../../faz1/migrasyon/out/events.ndjson', import.meta.url), 'utf8'));
// Deadlift: W2 state → aktif seans 8 (H3 Çar), Excel _meta P3 = 8
const dd = load('Deadlift'); const stD = await S.stateFor('Deadlift', 'W2');
t('Deadlift seans sayısı 18', P.sessions(dd).length === 18, P.sessions(dd).length);
const t21 = new Date(2026, 8, 21, 12), t22 = new Date(2026, 8, 22, 6);   // pano girişleri 21 Eyl sabahı (S7) — sabit tarihle deterministik
t('Deadlift aktif seans = 8 (Excel P3, ertesi gün)', P.activeSessionIdx(dd, stD, null, new Set(), t22) === 8, P.activeSessionIdx(dd, stD, null, new Set(), t22));
t('A1: antrenman günü (21 Eyl) işaretçi S7\'de kalır', P.activeSessionIdx(dd, stD, null, new Set(), t21) === 7, P.activeSessionIdx(dd, stD, null, new Set(), t21));
const v7 = P.sessionView(dd, stD, 7);
t('S7 = H3 Pzt, 5 satır, 5 tamam', v7.week === 3 && v7.day === 'Pzt' && v7.rows.length === 5 && v7.tamamlanan === 5, JSON.stringify([v7.week, v7.day, v7.rows.length, v7.tamamlanan]));
t('S7 Chin-up kg 95 (bw toplam)', v7.rows.find(r => r.egzersiz === 'Chin-up').arda.kg === 95);
t('S7 Top Single renk: 7 vs 9 → dusuk', v7.rows[0].renk === 'dusuk', v7.rows[0].renk);
t('S7 ısınma 152.5', v7.isinma === 'ISINMA · Deadlift:   boş bar  →  60  →  92.5  →  115  →  132.5  →  152.5 kg  (TOP SET)', v7.isinma);
t('S7 plaka 152.5', v7.rows[0].plaka === 'bir tarafa 66.25: 2×25 + 15 + 1.25', v7.rows[0].plaka);
const v8 = P.sessionView(dd, stD, 8); t('S8 (H3 Çar) ısınma yok (aksesuar günü)', v8.isinma === null && v8.rows.length === 3, v8.isinma);
t('S8 HEDEF metni', v8.rows[0].hedef === 'Agir\n4×5 · RPE8', JSON.stringify(v8.rows[0].hedef));
// Weekly Deadlift W2 vs Excel: H1 min 3592.5 max 5032.5 gercek 4312.5, uyum "120% • BANT ICI", H3 "87% • kismi (1/3 gun)"
const w = P.weekly(dd, stD);
t('W2 H1 weekly birebir', w[0].min === 3592.5 && w[0].max === 5032.5 && w[0].gercek === 4312.5 && w[0].uyum === '120% • BANT ICI' && w[0].sinyal === '🟢 PLANDA', JSON.stringify(w[0]));
t('W2 H3 weekly kısmi', w[2].uyum === '87% • kismi (1/3 gun)', w[2].uyum);
// Diger C2: hiç veri yok → aktif seans 1 (H1 Sal), yarınki pilot
const dg = load('Diger'); const stG = await S.stateFor('Diger', 'C2');
t('Diger aktif seans 1', P.activeSessionIdx(dg, stG) === 1);
const g1 = P.sessionView(dg, stG, 1);
console.log('  Diger S1:', g1.week, g1.day, g1.rows.map(r => `${r.egzersiz}/${r.modifier ?? ''} ${r.hedef.replace(/\n/g, ' | ')}`).join('  ·  '));
t('Diger S1 Squat Top Single 120 kg', g1.rows.find(r => r.modifier === 'Top Single')?.onerilen === 120);
t('Diger S1 ısınma Squat 120', g1.isinma?.includes('Squat') && g1.isinma.includes('120 kg'), g1.isinma);
// A1 — işaretçi kuralı: bugün cihazdan ilk set girildi → seans 1'de kal; ertesi gün → K14 (2); "session.finished" → 2; kilit kazanır
const s1 = P.sessions(dg)[0]; const r0 = s1.rows[0];
await S.logSet({ ref: { program: 'Diger', cycle: dg.cycle, week: s1.week, day: s1.day, row_key: r0.row_key }, actor: 'arda', kg: 42.5, sets: 4, reps: 3, rpe: 7.5 });
const stG2 = await S.stateFor('Diger', dg.cycle);
t('A1: ilk set sonrası seans 1 kalır', P.activeSessionIdx(dg, stG2) === 1, P.activeSessionIdx(dg, stG2));
const yarin = new Date(Date.now() + 36 * 3600e3);
t('A1: ertesi gün K14 → 2', P.activeSessionIdx(dg, stG2, null, new Set(), yarin) === 2, P.activeSessionIdx(dg, stG2, null, new Set(), yarin));
t('A1: session.finished → 2', P.activeSessionIdx(dg, stG2, null, new Set([`${s1.week}|${s1.day}`])) === 2);
t('A1: kilit 5 kazanır', P.activeSessionIdx(dg, stG2, 5) === 5);
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
