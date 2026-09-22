// SPOR APP — HESAP MOTORU (Faz 1) · saf fonksiyonlar, yan etki yok, bağımlılık yok.
// Kaynak: faz1/spec/motor_spec.md (K1–K24). Her fonksiyon başında ilgili kural numarası.
// İLKE: Excel'in "" (boş) → null; 0 → 0. Metin tekrar ("Trap Set") sayı değildir → hacim hesabına girmez.
// SAYI: kg ve oranlar double; yuvarlama noktalarında tamsayı aritmetiği (FLOAT NOTU).

const SCALE = 1_000_000;

/** Excel ROUND(x, n): yarımı sıfırdan uzağa. Tamsayı ölçekle. */
export function excelRound(x, n = 0) {
  if (x === null || x === undefined || Number.isNaN(x)) return null;
  const f = 10 ** n;
  const v = Math.round(Math.abs(x) * f * SCALE) / SCALE;       // float artığını temizle
  const r = Math.floor(v + 0.5) / f;
  return Math.sign(x) * r;
}

/** Excel MROUND(x, base): (x/base) en yakın tam sayıya, yarım sıfırdan uzağa; × base. (K1) */
export function mround(x, base) {
  if (!isNum(x) || !isNum(base) || base === 0) return null;
  const xi = Math.round(x * SCALE), bi = Math.round(base * SCALE);
  const q = xi / bi;
  const qi = Math.sign(q) * Math.floor(Math.abs(q) + 0.5);
  return (qi * bi) / SCALE;
}

export const isNum = v => typeof v === 'number' && Number.isFinite(v);
const nz = v => (v === '' || v === undefined ? null : v);   // Excel "" → null

/** K1/K2 — Önerilen ağırlık. oneRm×pct, MROUND. Guard düşerse null. */
export function onerilenKg(oneRm, pct, roundBase, guard = true) {
  if (!guard || !isNum(oneRm) || !isNum(pct)) return null;
  return mround(oneRm * pct, roundBase);
}

/** K3 — Isınma rampası basamakları (%40/60/75/87). AL/DG'de rampRoundBase sabit 2.5 (config). */
export const ISINMA_YUZDELERI = [0.4, 0.6, 0.75, 0.87];
export function isinmaBasamaklari(topKg, rampRoundBase) {
  if (!isNum(topKg) || topKg === 0) return null;
  return ISINMA_YUZDELERI.map(p => mround(topKg * p, rampRoundBase));
}
export function isinmaMetni(topKg, topEgz, rampRoundBase) {
  const b = isinmaBasamaklari(topKg, rampRoundBase);
  if (!b || !topEgz) return null;
  return `ISINMA · ${topEgz}:   boş bar  →  ${fmt(b[0])}  →  ${fmt(b[1])}  →  ${fmt(b[2])}  →  ${fmt(b[3])}  →  ${fmt(topKg)} kg  (TOP SET)`;
}

/** K11 — Top set: aktif blok satırları içinde Tekrar≤3 olanların Önerilen MAX'ı (⚠ Tekrar, Set değil). */
export function topSet(rows) {
  let best = null;
  for (const r of rows) {
    if (isNum(r.tekrar) && r.tekrar <= 3 && isNum(r.onerilen)) {
      if (best === null || r.onerilen > best.onerilen) best = r;   // MAXIFS + ilk eşleşme (MATCH)
    }
  }
  return best ? { kg: best.onerilen, egzersiz: best.egzersiz } : { kg: 0, egzersiz: null };
}

/** K6 — Beklenen hacim: üçü de sayı olmalı (ISNUMBER). */
export function beklenenHacim(onerilen, set, tekrar) {
  return isNum(onerilen) && isNum(set) && isNum(tekrar) ? mul3(onerilen, set, tekrar) : null;
}
/** K7 — Beklenen-Max: Repeat ise set yerine repeatMaxSets(4). */
export function beklenenMax(metod, onerilen, set, tekrar, repeatMaxSets = 4, maxSetMethods = ['Repeat']) {
  // ⚠ Diger'de "Load Drop" da 4-set varsayımına girer (golden testte bulundu: OR($K="Repeat",$K="Load Drop")).
  if (maxSetMethods.includes(metod)) return isNum(onerilen) && isNum(tekrar) ? mul3(onerilen, repeatMaxSets, tekrar) : null;
  return beklenenHacim(onerilen, set, tekrar);
}
/** K8 — Gerçek hacim: üçü de dolu olmalı (OR(...="")); metin tekrar → null (port kararı, spec K8 BELİRSİZ notu). */
export function gercekHacim(kg, set, tekrar) {
  kg = nz(kg); set = nz(set); tekrar = nz(tekrar);
  if (kg === null || set === null || tekrar === null) return null;
  if (!isNum(kg) || !isNum(set) || !isNum(tekrar)) return null;
  return mul3(kg, set, tekrar);
}
/** K9 — Alper hacim: Q × (Y||N) × (Z||O). */
export function alperHacim(q, y, z, n, o) {
  q = nz(q); y = nz(y); z = nz(z); n = nz(n); o = nz(o);
  if (q === null) return null;
  const s = y ?? n, t = z ?? o;
  if (s === null || t === null || !isNum(q) || !isNum(s) || !isNum(t)) return null;
  return mul3(q, s, t);
}
function mul3(a, b, c) { return Math.round(a * b * c * SCALE) / SCALE; }

/** K10 — Satır ΔRPE. Hafta 6 ve dışlanan modifier'lar null. */
export function deltaRpe(gercekRpe, hedefRpe, hafta, modifier, excludedModifiers) {
  gercekRpe = nz(gercekRpe); hedefRpe = nz(hedefRpe);
  if (gercekRpe === null || !isNum(hedefRpe) || hafta === 6) return null;
  if (excludedModifiers.includes(modifier)) return null;
  return Math.round((gercekRpe - hedefRpe) * SCALE) / SCALE;
}
/** K11 — Blok ΔRPE: AVERAGE, ROUND 2; boş liste → null. */
export function blokDeltaRpe(deltas) {
  const v = deltas.filter(isNum);
  if (!v.length) return null;
  return excelRound(v.reduce((a, b) => a + b, 0) / v.length, 2);
}

/** K17 — Weekly SUMIFS: hafta eşit, pct_1rm dolu, (opsiyonel) egzersiz eşit. */
export function weeklySum(rows, hafta, alan, egzersiz = null) {
  let s = 0;
  for (const r of rows) {
    if (r.hafta !== hafta) continue;
    if (nz(r.pct_1rm) === null) continue;               // ⚠ filtre %1RM≠"" (Yapılan değil)
    if (egzersiz && r.egzersiz !== egzersiz) continue;
    if (isNum(r[alan])) s += r[alan];
  }
  return Math.round(s * SCALE) / SCALE;
}

/** K12 — Uyum metni (Deadlift kalıbı). */
export function uyumMetni(gercek, min, max, doluGun, esik) {
  if (gercek === 0) return '—';
  const pct = excelRound(gercek / min * 100, 0);
  if (doluGun < esik) return `${fmt(pct)}% • kismi (${doluGun}/${esik} gun)`;
  const bant = gercek < min * 0.85 ? 'DUSUK' : gercek <= max * 1.05 ? 'BANT ICI' : 'BANT USTU';
  return `${fmt(pct)}% • ${bant}`;
}

/** K19 — Sinyal. cfg: {esik, stil:'D'|'AL'|'DG'} */
export function sinyal({ hafta, ortDeltaRpe, gercek, min, doluGun, esik, stil }) {
  if (hafta === 6) return '⏸ DELOAD';
  const d = nz(ortDeltaRpe);
  if (stil === 'D') {
    if (gercek === 0 && d === null) return '—';
    if ((isNum(d) && d >= 0.5) || (doluGun === esik && gercek < min * 0.85)) return '🔴 GERI CEK';
    if (isNum(d) && d <= -0.5 && doluGun === esik && gercek >= min * 0.85) return '🔵 YUKSELT';
    return '🟢 PLANDA';
  }
  if (doluGun < esik) return doluGun === 0 ? '—' : `⏳ ${doluGun}/${esik} gün`;
  if ((isNum(d) && d >= 0.5) || gercek < min * 0.85) return '🔴 GERI CEK';
  if (isNum(d) && d <= -0.5 && gercek >= min * 0.85) return '🔵 YUKSELT';
  return '🟢 PLANDA';
}

/** K18 — RTS tablosu (üç dosyada aynı). */
export const RPE_CHART = {
  7:  [0.88, 0.82, 0.80, 0.74, 0.74, 0.68, 0.66, 0.64, 0.62, 0.60, 0.58],
  8:  [0.91, 0.88, 0.82, 0.80, 0.77, 0.71, 0.68, 0.66, 0.64, 0.62, 0.60],
  9:  [0.95, 0.91, 0.89, 0.82, 0.80, 0.74, 0.71, 0.68, 0.66, 0.64, 0.62],
  10: [1.00, 0.95, 0.92, 0.88, 0.82, 0.80, 0.74, 0.71, 0.68, 0.66, 0.64],
};
export function rpeOran(rpe, tekrar, clamp) {
  let r = rpe === null || rpe === undefined || rpe === '' ? 9 : rpe;
  if (clamp) r = Math.max(7, Math.min(10, Math.floor(r)));
  else r = Math.floor(r);
  const row = RPE_CHART[r];
  if (!row) return null;                                 // D'de kelepçesiz: tablo dışı → Excel #N/A → null
  return row[tekrar - 1] ?? null;
}
/** K16 — Tahmini 1RM. Üçlünün RPE'si HER ZAMAN 9 (Excel böyle). testTipi≠Tahmin → tekli kg. */
export function tahmini1RM({ testTipi, tekliKg, tekliRpe, ucluKg, clamp }) {
  tekliKg = nz(tekliKg); ucluKg = nz(ucluKg);
  if (testTipi !== 'Tahmin') return isNum(tekliKg) ? tekliKg : null;
  if (tekliKg === null && ucluKg === null) return null;
  const o1 = rpeOran(tekliRpe, 1, clamp), o3 = rpeOran(9, 3, clamp);
  if (isNum(tekliKg) && o1 === null) return null;         // #N/A
  const t1 = isNum(tekliKg) ? tekliKg / o1 : 0;
  const t3 = isNum(ucluKg) ? ucluKg / o3 : 0;
  return excelRound(Math.max(t1, t3), 1);
}

/** K15 — RPE renk durumu: ≥hedef+0.5 yuksek · ≤hedef−0.5 dusuk · aksi normal; hedef sayı değilse normal. */
export function rpeRenk(gercek, hedef) {
  gercek = nz(gercek); hedef = nz(hedef);
  if (gercek === null || !isNum(hedef)) return 'normal';
  if (gercek >= hedef + 0.5) return 'yuksek';
  if (gercek <= hedef - 0.5) return 'dusuk';
  return 'normal';
}

/** K14 — Seans işaretçisi: kilit varsa [1,N]'e kelepçe; yoksa son+1 (N'i aşma), hiç yoksa 1. */
export function seansIsaretcisi(kilit, sonTamamlanan, N) {
  if (isNum(kilit)) return Math.min(N, Math.max(1, kilit));
  return sonTamamlanan === 0 ? 1 : Math.min(sonTamamlanan + 1, N);
}
/** K11/K14 — Deadlift ardışık-2-seans bandı (AL/DG'de yok: config.hasConsecutiveRpeBand=false). */
export function ardisikYuksekRpe(dRpeSon, dRpeOnceki) {
  return isNum(dRpeSon) && isNum(dRpeOnceki) && dRpeSon >= 0.5 && dRpeOnceki >= 0.5 ? 1 : 0;
}

/** K23 — BUGÜN HEDEF metni (görüntü). İKİ ŞABLON (golden testte bulundu):
 *  'D'  : "<mod>\n<kg> kg · <set>×<tek> · RPE<n> · <metod>" + GRIP dalı + ">>" dalı
 *  'ALDG': "<mod>\n<kg> kg[ · ]<set>×<tek> · RPE<n> · <metod>[ · Alper <kg> kg]" + ">>" dalı (GRIP dalı YOK)
 *  Excel TRIM davranışı: iç çift boşluklar tek boşluğa. */
export function hedefMetni(r, stil = 'D') {
  if (!r) return null;
  let s = '';
  if (nz(r.modifier) !== null) s += r.modifier + '\n';
  let orta = '';
  const kgVar = nz(r.onerilen) !== null, setVar = nz(r.set) !== null;
  if (stil === 'D') {
    if (kgVar) orta += fmt(r.onerilen) + ' kg · ';
    if (setVar) orta += fmt(r.set) + '×' + fmt(r.tekrar);
  } else {
    if (kgVar) orta += fmt(r.onerilen) + ' kg';
    if (setVar) orta += (kgVar ? ' · ' : '') + fmt(r.set) + '×' + fmt(r.tekrar);
  }
  if (nz(r.hedef_rpe) !== null) orta += ' · RPE' + fmt(r.hedef_rpe);
  s += excelTrim(orta);
  if (nz(r.metod) !== null) s += ' · ' + r.metod;
  if (stil !== 'D' && nz(r.onerilen_alper) !== null) s += ' · Alper ' + fmt(r.onerilen_alper) + ' kg';
  const d = r.dinlenme_metin ?? '';
  if (stil === 'D' && d.includes('GRIP')) s += '\n⚠ GRIP: tutus + kayma?';
  const i = d.indexOf('>>');
  if (i >= 0) s += '\n▸ ' + excelTrim(d.slice(i + 2, i + 2 + 200));
  return s;
}
function excelTrim(s) { return s.replace(/ +/g, ' ').trim(); }

/** Sayı → Excel'in metin birleştirmede yazdığı biçim (145 → "145", 132.5 → "132.5", 0.88 → "0.88"). */
export function fmt(v) {
  if (v === null || v === undefined) return '';
  if (typeof v !== 'number') return String(v);
  return String(Math.round(v * SCALE) / SCALE);
}

/** Program konfigürasyonu (CONFIG TABLOSU). */
export const CONFIG = {
  Deadlift: { roundBase: 2.5, rampRoundBase: 2.5, seansSayisi: 18, doluGunEsik: 3, sinyalStil: 'D', hasConsecutiveRpeBand: true, hasSnapshotFallback: true, rpeClamp: false, repeatMaxSets: 4, maxSetMethods: ['Repeat'], hedefStil: 'D', weeklyFilter: null,
    excludedModifiersDeltaRpe: ['Opener Single', 'Second Single', 'Tahmin Single', 'Tahmin Triple', 'PR Attempt'] },
  Alper:    { roundBase: 2.5, rampRoundBase: 2.5, seansSayisi: 12, doluGunEsik: 2, sinyalStil: 'AL', hasConsecutiveRpeBand: false, hasSnapshotFallback: false, rpeClamp: true, repeatMaxSets: 4, maxSetMethods: ['Repeat'], hedefStil: 'ALDG', weeklyFilter: ['Bench Press'],
    excludedModifiersDeltaRpe: ['Opener Single', 'Second Single', 'PR Attempt', 'Tahmin Single', 'Tahmin Triple', 'Backoff Triple', 'Kalibrasyon AMRAP'] },
  Diger:    { roundBase: 2.5, rampRoundBase: 2.5, seansSayisi: 18, doluGunEsik: 3, sinyalStil: 'DG', hasConsecutiveRpeBand: false, hasSnapshotFallback: false, rpeClamp: true, repeatMaxSets: 4, maxSetMethods: ['Repeat', 'Load Drop'], hedefStil: 'ALDG', weeklyFilter: ['Squat', 'Front Squat', 'Bench Press'],
    excludedModifiersDeltaRpe: ['Opener Single', 'Second Single', 'PR Attempt', 'Tahmin Single', 'Tahmin Triple', 'Backoff Triple', 'Kalibrasyon AMRAP'] },
};

/** Türkçe ondalık ayrıştırıcı (protokol madde 9): "17,5"→17.5, "abc"→null, ""→null. */
export function parseKg(s) {
  if (s === null || s === undefined) return null;
  const t = String(s).trim().replace(',', '.');
  if (t === '') return null;
  if (!/^-?\d+(\.\d+)?$/.test(t)) return null;
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
}
