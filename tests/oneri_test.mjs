// A29 — öneri kuralları (saf): durum rozeti, AMRAP uyarısı, güç (yüksek/düşük/veri yok), kolay hafta, mola, en çok 3 öneri, programı değiştirmez
import { readFileSync } from 'node:fs';
import * as P from '../src/program.js'; import * as O from '../src/oneri.js';
let ok = 0, fail = 0; const t = (n, c, d = '') => c ? ok++ : (fail++, console.log('  ✗', n, d));
const ov = JSON.parse(readFileSync(new URL('../data/degisiklikler.json', import.meta.url), 'utf8')).degisiklikler;
const load = p => P.degisiklikUygula(JSON.parse(readFileSync(new URL(`../data/programdef_${p}.json`, import.meta.url), 'utf8')), ov);
const dg = load('Diger'); const kopya = JSON.stringify(dg);
let ts = Date.parse('2026-09-20T06:00:00Z');
const kayit = (def, week, day, egz, mod, kg, reps, rpe, extra = {}) => { const r = def.rows.find(x => x.week === week && x.day === day && x.egzersiz === egz && (x.modifier ?? null) === mod); if (!r) throw new Error(`satır yok ${week} ${day} ${egz} ${mod}`);
  ts += 3600e3; return { program: def.program, cycle: def.cycle, week, day, row_key: r.row_key, actor: 'arda', kg, sets: 1, reps, rpe, ts: new Date(ts).toISOString(), deleted: false, skipped: false, ...extra }; };
// H1 hedefte, H2 Salı ağır (Top Triple hedef 8 → 10)
const H1 = [kayit(dg, 1, 'Sal', 'Squat', 'Top Single', 120, 1, 9), kayit(dg, 1, 'Sal', 'Squat', 'Top Triple', 107.5, 3, 8), kayit(dg, 1, 'Per', 'Front Squat', 'Top Single', 67.5, 1, 8), kayit(dg, 1, 'Cum', 'Bench Press', 'Top Single', 112.5, 1, 8)];
const H2 = [kayit(dg, 2, 'Sal', 'Squat', 'Top Triple', 112.5, 3, 10, { sets: 2, sets_detail: [{ n: 1, kg: 112.5, reps: 3, rpe: 9.5 }, { n: 2, kg: 112.5, reps: 3, rpe: 10 }] })];
let st = [...H1, ...H2]; let wk = P.weekly(dg, st);
const d = O.durum(dg, st, wk, 2);
t('ağır hafta rozeti (+2 RPE)', d.tip === 'agir' && d.rozet === 'Bu hafta ağır geldi' && d.cumle.includes('2 RPE yüksek') && d.cumle.includes('9.5 ve 10'), JSON.stringify(d));
t('önceki hafta hedefteydi notu', d.cumle.includes('Bir önceki hafta hedefteydin'));
let on = O.oneriler({ def: dg, state: st, stateAll: st, wk, week: 2, now: new Date('2026-09-29T12:00:00Z') });
t('ilk öneri: AMRAP (H3 Salı) iyi güne denk getir', on[0]?.tip === 'warn' && on[0].baslik.includes('Kalibrasyon AMRAP') && on[0].baslik.includes('H3 Salı'), JSON.stringify(on[0]));
t('en çok 3 öneri, uyarılar önce', on.length <= 3 && on.every((o, i) => i === 0 || ({ warn: 0, info: 1, ok: 2 })[on[i - 1].tip] <= ({ warn: 0, info: 1, ok: 2 })[o.tip]));
// güç
const g = O.guc(dg, st); const sq = g.find(x => x.ad === 'Squat'), be = g.find(x => x.ad === 'Bench Press');
t('güç: Squat tahmini var, programdaki 135 ile oranlı', sq.tahmin > 100 && sq.prog === 135 && sq.oran > 0.8 && sq.oran < 1.1, JSON.stringify(sq));
const st2 = st.map(s => s.row_key.startsWith('Bench') ? { ...s, rpe: null } : s);
t('güç: Bench tekli RPE yoksa veri yok + "RPE gir" önerisi', O.guc(dg, st2).find(x => x.ad === 'Bench Press').veriYok && O.oneriler({ def: dg, state: st2, stateAll: st2, wk: P.weekly(dg, st2), week: 2 }).some(o => o.baslik.startsWith('Bench Press tekli setinde RPE gir')));
// güçlenmiş: Squat 130×1 @7 → tahmin programın üstünde
const st3 = [...st, kayit(dg, 2, 'Sal', 'Squat', 'Double', 130, 1, 7)];
const on3 = O.oneriler({ def: dg, state: st3, stateAll: st3, wk: P.weekly(dg, st3), week: 2 });
t('güçlenmiş: tahmin ≥ %3 yüksek → ok öneri + sıradaki test', on3.some(o => o.tip === 'ok' && o.baslik === 'Squat: güçlenmişsin' && o.neden.includes('Sıradaki test')), JSON.stringify(on3));
// düşük: Squat 105×1 @10
const st4 = [...H1.filter(s => !s.row_key.startsWith('Squat')), kayit(dg, 1, 'Sal', 'Squat', 'Top Single', 105, 1, 10)];
t('düşük: tahmin ≥ %5 altında → uyarı', O.oneriler({ def: dg, state: st4, stateAll: st4, wk: P.weekly(dg, st4), week: 1 }).some(o => o.tip === 'warn' && o.baslik === 'Squat: tahmin programın altında'));
// kolay hafta
const st5 = [kayit(dg, 1, 'Sal', 'Squat', 'Top Single', 120, 1, 7.5), kayit(dg, 1, 'Sal', 'Squat', 'Top Triple', 107.5, 3, 6.5)];
const d5 = O.durum(dg, st5, P.weekly(dg, st5), 1);
t('kolay hafta rozeti', d5.tip === 'kolay' && d5.rozet === 'Bu hafta kolay geldi', JSON.stringify(d5));
// bu hafta boş → geçen haftaya bakar
const d6 = O.durum(dg, H1, P.weekly(dg, H1), 2);
t('bu hafta boşsa "Geçen hafta …"', d6.rozet.startsWith('Geçen hafta') && d6.week === 1, JSON.stringify(d6));
// mola: 2. setten itibaren, medyan %50 uzun → öneri; ilk setler sayılmaz
const now = new Date('2026-09-29T12:00:00Z'); const det = n => Array.from({ length: n }, (_, i) => ({ n: i + 1, kg: 50, reps: 5, rest_s: i === 0 ? 3000 : 135, rest_plan_s: 90, ts: '2026-09-28T06:00:00Z' }));
const molaSt = [{ actor: 'arda', deleted: false, sets_detail: det(4) }, { actor: 'arda', deleted: false, sets_detail: det(4) }];
const ml = O.mola(molaSt, now);
t('mola: ilk setler hariç 6 set, medyan ×1.5', ml?.n === 6 && Math.abs(ml.medyan - 1.5) < 1e-9, JSON.stringify(ml));
t('mola: 6 setten azsa sessiz', O.mola([{ actor: 'arda', deleted: false, sets_detail: det(3) }], now) === null);
t('mola: 14 günden eski setler sayılmaz', O.mola(molaSt, new Date('2026-10-20T12:00:00Z')) === null);
// programı değiştirmez
t('öneri fonksiyonları programdef\'i değiştirmez', JSON.stringify(dg) === kopya);
// Deadlift: 1RM 165, tekli 157.5 @8.5 → güçlenmiş + PR H5 Cuma
const dd = load('Deadlift'); const stD = [kayit(dd, 4, 'Pzt', 'Deadlift', 'Top Single', 157.5, 1, 8.5), kayit(dd, 4, 'Pzt', 'Deadlift', 'Top Triple', 135, 3, 9)];
const onD = O.oneriler({ def: dd, state: stD, stateAll: stD, wk: P.weekly(dd, stD), week: 4 });
t('Deadlift: güçlenmişsin, sıradaki test PR Attempt H5 Cuma', onD.some(o => o.baslik === 'Deadlift: güçlenmişsin' && o.neden.includes('PR Attempt, H5 Cuma')), JSON.stringify(onD));
console.log(`\n  ${ok}/${ok + fail} geçti — ${fail ? 'ÖNERİ TEST BAŞARISIZ' : 'ÖNERİ TEST GECTI'}`); process.exit(fail ? 1 : 0);
