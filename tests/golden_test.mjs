// GOLDEN TEST — motor.js vs Excel'in gerçek çıktıları (fa../../faz1/fixtures/golden_*.json).
// Tek değer farkı = BAŞARISIZ. Sayısal eşitlik: tam eşitlik (===); farkı 1e-9 altındakiler ayrıca "float-yakın" sayılır ve raporlanır.
// Kullanım: node golden_test.mjs [--verbose]
import { readFileSync } from 'node:fs';
import * as M from '../src/motor.js';

const VERBOSE = process.argv.includes('--verbose');
const FX = p => JSON.parse(readFileSync(new URL(`../../faz1/fixtures/golden_${p}.json`, import.meta.url), 'utf8'));
const res = { pass: 0, fail: 0, near: 0, skip: 0, fails: [] };
function eq(a, b) {
  if (a === null || a === undefined) return b === null || b === undefined;
  if (typeof a === 'number' && typeof b === 'number') return a === b ? true : (Math.abs(a - b) < 1e-9 ? 'near' : false);
  return a === b;
}
function check(kural, ref, beklenen, hesaplanan) {
  const r = eq(hesaplanan, beklenen);
  if (r === true) res.pass++;
  else if (r === 'near') { res.near++; res.pass++; if (VERBOSE) console.log(`  ~ ${kural} ${ref}: ${hesaplanan} ≈ ${beklenen}`); }
  else { res.fail++; res.fails.push({ kural, ref, beklenen, hesaplanan }); }
}
const isRow = r => r.egzersiz && !String(r.egzersiz).trim().startsWith('--');

function oneRmFor(prog, r, meta) {
  const s = meta.inputs_setup;
  if (prog === 'Deadlift') return s.deadlift_1rm_kg;
  if (prog === 'Alper') return r.egzersiz === 'Bench Press' ? s.bench_1rm_arda_kg : null;
  if (prog === 'Diger') return ({ 'Squat': s.squat_1rm_kg, 'Front Squat': s.front_squat_1rm_kg, 'Bench Press': s.bench_1rm_cuma_ek_kg })[r.egzersiz] ?? null;
}

for (const [prog, key] of [['Deadlift', 'deadlift'], ['Alper', 'alper'], ['Diger', 'diger']]) {
  const fx = FX(key); const cfg = M.CONFIG[prog]; const rows = fx.program_rows.filter(isRow);
  console.log(`\n═══ ${prog} — ${rows.length} egzersiz satırı`);

  // K18 RPE chart
  for (const s of fx.rpe_chart.satirlar) for (let t = 1; t <= 11; t++)
    check('K18', `${prog} RPE${s.rpe} x${t}`, s.oranlar_tekrar_bazinda[String(t)], M.RPE_CHART[s.rpe][t - 1]);

  for (const r of rows) {
    const ref = `${prog} r${r.row} ${r.egzersiz}/${r.modifier ?? ''}`;
    // K1 Önerilen
    if (M.isNum(r.pct_1rm)) {
      const rm = oneRmFor(prog, r, fx.meta);
      if (rm !== null && M.isNum(r.onerilen)) check('K1', ref, r.onerilen, M.onerilenKg(rm, r.pct_1rm, cfg.roundBase));
      else res.skip++;
      if (prog === 'Alper' && r.egzersiz === 'Bench Press' && M.isNum(r.onerilen_alper))
        check('K2', ref, r.onerilen_alper, M.onerilenKg(fx.meta.inputs_setup.bench_1rm_alper_kg, r.pct_1rm, cfg.roundBase));
    }
    // K6/K7/K8/K10
    check('K6', ref, r.beklenen_hacim ?? null, M.beklenenHacim(r.onerilen, r.set, r.tekrar));
    if ('beklenen_max' in r) check('K7', ref, r.beklenen_max ?? null, M.beklenenMax(r.metod, r.onerilen, r.set, r.tekrar, cfg.repeatMaxSets, cfg.maxSetMethods));
    check('K8', ref, r.gercek_hacim ?? null, M.gercekHacim(r.yapilan_kg, r.yapilan_set, r.yapilan_tekrar));
    if ('delta_rpe' in r) check('K10', ref, r.delta_rpe ?? null, M.deltaRpe(r.gercek_rpe, r.hedef_rpe, r.hafta, r.modifier, cfg.excludedModifiersDeltaRpe));
    if (prog === 'Alper' && 'alper_hacim' in r) check('K9', ref, r.alper_hacim ?? null, M.alperHacim(r.yapilan_kg_alper, r.alper_set, r.alper_tekrar, r.yapilan_set, r.yapilan_tekrar));
    // K15 renk (hedef varsa ve gerçek RPE varsa — kural doğrulaması, fixture'da renk yok; sadece çalıştığını gör)
  }

  // K17/K12/K19 Weekly
  const bh = fx.meta_sheet?.blok_haritasi ?? []; const hdr = fx.meta_sheet?.blok_haritasi_header ?? {};
  const col = name => Object.keys(hdr).find(k => hdr[k] === name);
  const cH = col('Hafta'), cD = col('Dolu');
  const doluGun = h => bh.filter(b => b[cH]?.value === h && b[cD]?.value === 1).length;
  for (const w of fx.weekly.haftalik) {
    const h = w['Hafta']?.value; if (!M.isNum(h)) continue;
    const g = k => w[k]?.value ?? null;
    const dRpe = M.excelRound(avg(rows.filter(r => r.hafta === h).map(r => r.delta_rpe).filter(M.isNum)), 2);
    check('K11w', `${prog} H${h} OrtΔRPE`, g('Ort ΔRPE') ?? null, dRpe);
    if (prog === 'Deadlift') {
      const min = M.weeklySum(rows, h, 'beklenen_hacim'), max = M.weeklySum(rows, h, 'beklenen_max'), ger = M.weeklySum(rows, h, 'gercek_hacim');
      check('K17', `${prog} H${h} Min`, g('Beklenen-Min (kg)'), min);
      check('K17', `${prog} H${h} Max`, g('Beklenen-Max (kg)'), max);
      check('K17', `${prog} H${h} Gerçek`, g('Gerçek (kg)'), ger);
      check('K12', `${prog} H${h} Uyum`, g('Uyum'), M.uyumMetni(ger, min, max, doluGun(h), cfg.doluGunEsik));
      check('K19', `${prog} H${h} Sinyal`, g('Sinyal'), M.sinyal({ hafta: h, ortDeltaRpe: g('Ort ΔRPE'), gercek: ger, min, doluGun: doluGun(h), esik: cfg.doluGunEsik, stil: 'D' }));
    } else if (prog === 'Alper') {
      const min = M.weeklySum(rows, h, 'beklenen_hacim', 'Bench Press'), max = M.weeklySum(rows, h, 'beklenen_max', 'Bench Press'), ger = M.weeklySum(rows, h, 'gercek_hacim', 'Bench Press');
      check('K17', `${prog} H${h} Bench Bek`, g('Beklenen Bench (kg)'), min);
      check('K17', `${prog} H${h} Bench Max`, g('Beklenen-Max (kg)'), max);
      check('K17', `${prog} H${h} Bench Ger`, g('Gerçek Bench (kg)'), ger);
      check('K19', `${prog} H${h} Sinyal`, g('Sinyal'), M.sinyal({ hafta: h, ortDeltaRpe: g('Ort ΔRPE'), gercek: ger, min, doluGun: doluGun(h), esik: cfg.doluGunEsik, stil: 'AL' }));
    } else {
      const S = e => M.weeklySum(rows, h, 'beklenen_hacim', e), G = e => M.weeklySum(rows, h, 'gercek_hacim', e);
      check('K17', `${prog} H${h} Squat Bek`, g('Beklenen Squat (kg)'), S('Squat'));
      check('K17', `${prog} H${h} FS Bek`, g('Beklenen Front Squat (kg)'), S('Front Squat'));
      check('K17', `${prog} H${h} Bench Bek`, g('Beklenen Bench (kg)'), S('Bench Press'));
      check('K17', `${prog} H${h} Bench Max`, g('Bench Beklenen-Max (kg)'), M.weeklySum(rows, h, 'beklenen_max', 'Bench Press'));
      const min = S('Squat') + S('Front Squat') + S('Bench Press'), ger = G('Squat') + G('Front Squat') + G('Bench Press');
      check('K19', `${prog} H${h} Sinyal`, g('Sinyal'), M.sinyal({ hafta: h, ortDeltaRpe: g('Ort ΔRPE'), gercek: ger, min, doluGun: doluGun(h), esik: cfg.doluGunEsik, stil: 'DG' }));
    }
  }

  // K23 HEDEF metni + K24 işaretçi → satır bul, metni yeniden kur
  for (const hd of fx.bugun.hedef_satirlari_C13_C26 ?? []) {
    const ptr = hd.H_satir_isaretcisi?.value; if (!M.isNum(ptr)) continue;
    const r = fx.program_rows.find(x => x.row === ptr); if (!r) continue;
    check('K23', `${prog} BUGÜN r${hd.row}→P${ptr}`, hd.C_hedef_metni?.value ?? null, M.hedefMetni(r, cfg.hedefStil));
  }
  // K3 ısınma (canlı) — _meta P21/P22 (D) veya P14/P15 (AL/DG)
  const P = fx.meta_sheet?.p_sutunu ?? {};
  const topKg = P[prog === 'Deadlift' ? 'P21' : 'P14']?.value ?? P[prog === 'Deadlift' ? 'P21' : 'P14'];
  const topEgz = P[prog === 'Deadlift' ? 'P22' : 'P15']?.value ?? P[prog === 'Deadlift' ? 'P22' : 'P15'];
  check('K3', `${prog} BUGÜN C10`, fx.bugun.c10_isinma_satiri?.value ?? null, M.isinmaMetni(M.isNum(topKg) ? topKg : 0, topEgz ?? null, cfg.rampRoundBase));
}

// Spec test vektörleri (fixture dışı, K3/K16/K1 sınır durumları)
console.log('\n═══ Spec vektörleri');
check('K1v', 'MROUND(145.2,2.5)', 145, M.mround(145.2, 2.5));
check('K1v', 'MROUND(132,2.5)', 132.5, M.mround(132, 2.5));
check('K1v', 'MROUND(108.75,2.5) yarım→uzağa', 110, M.mround(108.75, 2.5));
check('K1v', 'MROUND(126.15,2.5)', 125, M.mround(126.15, 2.5));
check('K1v', 'MROUND(90.2,2.5)', 90, M.mround(90.2, 2.5));
check('K1v', 'MROUND(115.5,2.5)', 115, M.mround(115.5, 2.5));
check('K3v', 'isinma 145', 'ISINMA · Deadlift:   boş bar  →  57.5  →  87.5  →  110  →  125  →  145 kg  (TOP SET)', M.isinmaMetni(145, 'Deadlift', 2.5));
check('K16v', 'tahmini 140@RPE8', 153.8, M.tahmini1RM({ testTipi: 'Tahmin', tekliKg: 140, tekliRpe: 8, ucluKg: null, clamp: false }));
check('K16v', 'tahmini gerçekPR → tekli', 170, M.tahmini1RM({ testTipi: 'Gerçek PR', tekliKg: 170, tekliRpe: 10, ucluKg: 150, clamp: false }));
check('K16v', 'tahmini D RPE6.5 kelepçesiz → null(#N/A)', null, M.tahmini1RM({ testTipi: 'Tahmin', tekliKg: 140, tekliRpe: 6.5, ucluKg: null, clamp: false }));
check('K16v', 'tahmini AL RPE6.5 kelepçe→7', M.excelRound(140 / 0.88, 1), M.tahmini1RM({ testTipi: 'Tahmin', tekliKg: 140, tekliRpe: 6.5, ucluKg: null, clamp: true }));
check('K15v', 'renk 8.5 vs 8', 'yuksek', M.rpeRenk(8.5, 8)); check('K15v', 'renk 7.5 vs 8', 'dusuk', M.rpeRenk(7.5, 8)); check('K15v', 'renk 8 vs 8', 'normal', M.rpeRenk(8, 8));
check('K14v', 'P3 kilit boş son7 N18', 8, M.seansIsaretcisi(null, 7, 18)); check('K14v', 'P3 kilit 25→18', 18, M.seansIsaretcisi(25, 3, 18)); check('K14v', 'P3 hiç yok', 1, M.seansIsaretcisi(null, 0, 12));
check('P9', 'parseKg 17,5', 17.5, M.parseKg('17,5')); check('P9', 'parseKg 0,5', 0.5, M.parseKg('0,5')); check('P9', 'parseKg abc', null, M.parseKg('abc')); check('P9', 'parseKg 16,25', 16.25, M.parseKg('16,25')); check('P9', 'parseKg 2,5', 2.5, M.parseKg('2,5'));
check('K4v', 'Trap Set hacim', null, M.beklenenHacim(15, 1, 'Trap Set'));
check('K8v', 'kg=0 atlandı hacim 0', 0, M.gercekHacim(0, 1, 1)); check('K8v', 'kg null → null', null, M.gercekHacim(null, 1, 1));

function avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; }

console.log(`\n══════════════════════════════════════════`);
for (const f of res.fails.slice(0, 40)) console.log(`  ✗ ${f.kural} ${f.ref}\n      beklenen: ${JSON.stringify(f.beklenen)}\n      hesap   : ${JSON.stringify(f.hesaplanan)}`);
if (res.fails.length > 40) console.log(`  … +${res.fails.length - 40} daha`);
console.log(`\n  ${res.pass}/${res.pass + res.fail} geçti · ${res.fail} BAŞARISIZ · ${res.near} float-yakın · ${res.skip} atlandı`);
console.log(res.fail === 0 ? '  GOLDEN TEST GECTI' : '  GOLDEN TEST BASARISIZ');
process.exit(res.fail === 0 ? 0 : 1);
