// A29 (29 Eyl, Arda: "çıkan sinyale göre app yorum versin, başkası baksa da anlasın, güncel sonuca göre öneri olsun")
// Saf kurallar — DOM yok, test edilir, iOS'a aynen taşınır. Öneriler programı DEĞİŞTİRMEZ; yalnız ne görüldüğünü ve nedenini söyler.
// Eşikler (Arda onayı 29 Eyl): hedef RPE sapması ≥ 1 · tahmini 1RM programdakinden ≥ %3 yüksek / ≥ %5 düşük · hacim < %85 · mola ≥ %20 sapma.
import * as M from './motor.js';
import * as P from './program.js';

export const ESIK = { rpe: 1, birmYuksek: 0.03, birmDusuk: 0.05, hacim: 0.85, mola: 0.2, molaMinSet: 6, molaGun: 14 };
const OZEL = /AMRAP|Tahmin|PR Attempt|Kalibrasyon/i;
const f1 = v => M.fmt(Math.round(v * 10) / 10);
const gunAd = s => `H${s.week} ${P.GUN_AD[s.day] ?? s.day}`;

/** Programın 1RM'i (Setup/Inputs) — ana kaldırış adına göre. */
export function programBirm(def, L) {
  const c = def.config ?? {};
  return { Deadlift: c.deadlift_1rm_kg, Squat: c.squat_1rm_kg, 'Front Squat': c.front_squat_1rm_kg, 'Bench Press': c.bench_1rm_arda_kg ?? c.bench_1rm_cuma_ek_kg, 'Standing Barbell OHP': c.ohp_1rm_kg }[L] ?? null;
}
export function anaKaldirislar(def) { return M.CONFIG[def.program]?.weeklyFilter ?? (def.program === 'Deadlift' ? ['Deadlift'] : []); }

/** Güç: her ana kaldırış için tahmini 1RM (son RPE'li tekli + son üçlü, RTS). Tekli RPE yoksa tahmin güvenilir sayılmaz (veriYok). */
export function guc(def, stateAll) {
  const cfg = M.CONFIG[def.program];
  return anaKaldirislar(def).map(L => {
    const rowsL = def.rows.filter(r => r.egzersiz === L);
    const ent = stateAll.filter(s => s.actor === 'arda' && !s.deleted && !s.skipped && M.isNum(s.kg) && s.kg > 0 && rowsL.some(r => r.row_key === s.row_key)).sort((a, b) => a.ts < b.ts ? 1 : -1);
    const tek = ent.find(s => s.reps === 1 && M.isNum(s.rpe)) ?? null, uc = ent.find(s => s.reps === 3) ?? null;
    const prog = programBirm(def, L);
    if (!tek) return { ad: L, tahmin: null, prog, tek: null, uc, veriYok: true };
    const t = M.tahmini1RM({ testTipi: 'Tahmin', tekliKg: tek.kg, tekliRpe: tek.rpe, ucluKg: uc?.kg ?? null, clamp: cfg.rpeClamp });
    const tahmin = M.isNum(t) ? Math.round(t * 2) / 2 : null;
    return { ad: L, tahmin, prog, tek, uc, oran: tahmin && prog ? tahmin / prog : null, veriYok: tahmin === null };
  });
}

/** Bir haftanın hedef-RPE sapması: satır satır (yalnız hedefi ve RPE'si olan, Excel'in hariç tuttuğu modifier'lar hariç). */
export function rpeSapma(def, state, week) {
  const cfg = M.CONFIG[def.program]; const satir = [];
  for (const r of def.rows.filter(x => x.week === week && M.isNum(x.hedef_rpe))) {
    const s = state.find(x => x.week === week && x.day === r.day && x.row_key === r.row_key && x.actor === 'arda' && !x.deleted && !x.skipped);
    if (!s || !M.isNum(s.rpe)) continue;
    const d = M.deltaRpe(s.rpe, r.hedef_rpe, r.week, r.modifier, cfg.excludedModifiersDeltaRpe);
    if (M.isNum(d)) satir.push({ r, s, d, rpeler: (s.sets_detail ?? []).map(x => x.rpe).filter(M.isNum) });
  }
  const ort = satir.length ? satir.reduce((a, x) => a + x.d, 0) / satir.length : null;
  return { ort, satir };
}

/** Durum rozeti + tek cümle. hafta = şu anki seansın haftası; o hafta boşsa bir önceki haftaya bakılır. */
export function durum(def, state, wk, week) {
  const cfg = M.CONFIG[def.program];
  let w = wk.find(x => x.week === week); let gecen = false;
  if (w && !w.doluGun && !state.some(s => s.week === week && s.actor === 'arda' && !s.deleted)) { const o = wk.filter(x => x.week < week && x.doluGun).pop(); if (o) { w = o; gecen = true; } }
  if (!w) return { tip: 'bos', rozet: 'Henüz kayıt yok', cumle: 'Bu cycle\'da henüz set girilmedi.', week };
  const hf = gecen ? 'Geçen hafta' : 'Bu hafta';
  const gun = `${w.doluGun}/${cfg.doluGunEsik} gün yapıldı`;
  if (w.week === 6) return { tip: 'planda', rozet: 'Hafif hafta', cumle: 'Deload haftası: düşük yük, toparlanma.', gun, week: w.week };
  const sp = rpeSapma(def, state, w.week);
  const enKotu = [...sp.satir].sort((a, b) => Math.abs(b.d) - Math.abs(a.d))[0];
  const ornek = enKotu ? ` (${enKotu.r.egzersiz}${enKotu.r.modifier ? ' ' + enKotu.r.modifier : ''} hedef ${f1(enKotu.r.hedef_rpe)}, yaptığın ${(enKotu.rpeler.length > 1 ? enKotu.rpeler : [enKotu.s.rpe]).map(f1).join(' ve ')})` : '';
  const once = wk.find(x => x.week === w.week - 1); const onceSp = once ? rpeSapma(def, state, once.week).ort : null;
  if (M.isNum(sp.ort) && sp.ort >= ESIK.rpe) return { tip: 'agir', rozet: `${hf} ağır geldi`, cumle: `Setler hedeften ortalama ${f1(sp.ort)} RPE yüksek${ornek}.${M.isNum(onceSp) && onceSp < ESIK.rpe ? ' Bir önceki hafta hedefteydin; tek seferlik bir düşüş (yorgunluk, hastalık) olabilir.' : ''}`, gun, week: w.week, sapma: sp };
  if (M.isNum(sp.ort) && sp.ort <= -ESIK.rpe) return { tip: 'kolay', rozet: `${hf} kolay geldi`, cumle: `Setler hedeften ortalama ${f1(-sp.ort)} RPE düşük${ornek}.`, gun, week: w.week, sapma: sp };
  const bitti = w.doluGun >= cfg.doluGunEsik || wk.some(x => x.week > w.week && x.doluGun);
  if (bitti && w.min > 0 && w.gercek < w.min * ESIK.hacim) return { tip: 'eksik', rozet: `${hf} eksik kaldı`, cumle: `Planlanan işin %${Math.round(w.gercek / w.min * 100)}'i yapıldı.`, gun, week: w.week, sapma: sp };
  if (!bitti) return { tip: 'suruyor', rozet: `${hf} sürüyor`, cumle: M.isNum(sp.ort) ? `Şimdiye kadar setler hedefe yakın (ortalama ${sp.ort >= 0 ? '+' : ''}${f1(sp.ort)} RPE).` : 'Şimdiye kadar hedef RPE\'li set yok.', gun, week: w.week, sapma: sp };
  return { tip: 'planda', rozet: `${hf} planda`, cumle: M.isNum(sp.ort) ? `Setler hedefe yakın (ortalama ${sp.ort >= 0 ? '+' : ''}${f1(sp.ort)} RPE), plan tamamlandı.` : 'Plan tamamlandı.', gun, week: w.week, sapma: sp };
}

/** Sıradaki (henüz yapılmamış) seanslardan ilk eşleşen. */
function siradaki(def, state, ov, kosul) {
  for (const s of P.sessions(def, ov)) { if (P.isDolu(s, state)) continue; const r = s.rows.find(kosul); if (r) return { s, r }; }
  return null;
}

/** Mola sapması: son 14 gün, her hareketin 2. setinden itibaren (ilk setin molası hareket geçişini de içerir). */
export function mola(stateAll, now = new Date()) {
  const sinir = now.getTime() - ESIK.molaGun * 864e5;
  const xs = stateAll.filter(s => s.actor === 'arda' && !s.deleted).flatMap(s => (s.sets_detail ?? []).filter(x => x.n > 1 && M.isNum(x.rest_s) && M.isNum(x.rest_plan_s) && x.rest_plan_s > 0 && new Date(x.ts).getTime() >= sinir));
  if (xs.length < ESIK.molaMinSet) return null;
  const o = xs.map(x => x.rest_s / x.rest_plan_s).sort((a, b) => a - b); const med = o[Math.floor(o.length / 2)];
  return { n: xs.length, medyan: med };
}

/** En çok 3 öneri, önem sırasıyla. {tip: warn|info|ok, baslik, neden} */
export function oneriler({ def, state, stateAll, wk, week, ov = null, now = new Date() }) {
  const out = []; const d = durum(def, state, wk, week); const g = guc(def, stateAll);
  // 1) Ağır geçen haftadan sonra yaklaşan AMRAP / tahmin / PR
  const oz = siradaki(def, state, ov, r => OZEL.test(r.modifier ?? '') || OZEL.test(r.metod ?? ''));
  if (d.tip === 'agir' && oz) out.push({ tip: 'warn', baslik: `${oz.r.egzersiz} ${oz.r.modifier} (${gunAd(oz.s)}) — iyi hissettiğin güne denk getir`, neden: `Bu set 1RM'i yeniden ayarlar; ${d.week}. haftada setler hedeften ${f1(d.sapma.ort)} RPE ağırdı. Yorgunken yapılırsa sonraki haftaların kiloları gereğinden düşük çıkar.` });
  // 2) Eksik hafta
  if (d.tip === 'eksik') { const at = def.rows.filter(r => r.week === d.week && !state.some(s => s.week === r.week && s.day === r.day && s.row_key === r.row_key && s.actor === 'arda' && !s.deleted && !s.skipped) && (anaKaldirislar(def).includes(r.egzersiz)));
    out.push({ tip: 'warn', baslik: `H${d.week}'te ana kaldırışlardan ${at.length} satır yapılmadı`, neden: at.slice(0, 3).map(r => `${P.GUN_AD[r.day]} ${r.egzersiz}${r.modifier ? ' ' + r.modifier : ''}`).join(', ') || d.cumle }); }
  // 3) Güç: yüksek / düşük / veri yok
  for (const x of g) {
    if (x.veriYok) { const t = siradaki(def, state, ov, r => r.egzersiz === x.ad && r.tekrar === 1 && !r.tekrar_metin);
      out.push({ tip: 'info', baslik: `${x.ad} tekli setinde RPE gir${t ? ` (${gunAd(t.s)})` : ''}`, neden: `${x.ad} için RPE'li tekli yok; güç tahmini yapılamıyor.` }); continue; }
    if (!M.isNum(x.oran)) continue;
    if (x.oran - 1 >= ESIK.birmYuksek) { const t = siradaki(def, state, ov, r => r.egzersiz === x.ad && OZEL.test(r.modifier ?? ''));
      out.push({ tip: 'ok', baslik: `${x.ad}: güçlenmişsin`, neden: `Tahmini 1RM ${M.fmt(x.tahmin)} kg, programdaki ${M.fmt(x.prog)} kg (%${Math.round((x.oran - 1) * 100)} yüksek; ${M.fmt(x.tek.kg)}×1 RPE ${f1(x.tek.rpe)}).${t ? ` Sıradaki test: ${t.r.modifier}, ${gunAd(t.s)}.` : ''}` }); }
    else if (1 - x.oran >= ESIK.birmDusuk) out.push({ tip: 'warn', baslik: `${x.ad}: tahmin programın altında`, neden: `Tahmini 1RM ${M.fmt(x.tahmin)} kg, programdaki ${M.fmt(x.prog)} kg (%${Math.round((1 - x.oran) * 100)} düşük). Yorgunluk, hastalık ya da eksik RPE olabilir; tek seansla karar verme.` });
  }
  // 4) Kolay gelen hafta
  if (d.tip === 'kolay') out.push({ tip: 'info', baslik: 'Setler hedeften kolay geliyor', neden: `${d.week}. haftada ortalama ${f1(-d.sapma.ort)} RPE düşük. Kiloyu artırmak senin kararın; app programı kendisi değiştirmez.` });
  // 5) Mola
  const ml = mola(stateAll, now);
  if (ml && Math.abs(ml.medyan - 1) >= ESIK.mola) out.push({ tip: 'info', baslik: `Setler arası molalar planın %${Math.round(Math.abs(ml.medyan - 1) * 100)} ${ml.medyan > 1 ? 'uzun' : 'kısa'}`, neden: `Son ${ESIK.molaGun} günde ${ml.n} setin ortası (hareketlerin ilk setleri hariç).` });
  // 6) Hiç uyarı yoksa: planda
  if (!out.some(o => o.tip === 'warn') && (d.tip === 'planda' || d.tip === 'suruyor')) out.push({ tip: 'ok', baslik: 'Plana uygun gidiyorsun', neden: d.cumle });
  const sira = { warn: 0, info: 1, ok: 2 };
  return out.sort((a, b) => sira[a.tip] - sira[b.tip]).slice(0, 3);
}
