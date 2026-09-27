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

/** K25/K26 — Etkin önerilen: `rpe_freni` olan satırda plan = 1RM×pct (MROUND), önceki haftanın aynı satırındaki
 *  gerçek RPE/kg ile frenlenir. Fren yoksa programdef `onerilen` (Excel anlık görüntüsü) aynen. Dönüş: {kg, fren:{prevRpe,prevKg,plan}|null}. */
export function etkinOnerilen(def, state, r) {
  if (!r.rpe_freni) return { kg: r.onerilen, fren: null };
  const cfg = M.CONFIG[def.program];
  const planHesap = M.onerilenKg(M.oneRmFor(def.program, r.egzersiz, def.config), r.pct_1rm, cfg.roundBase);
  const plan = planHesap ?? r.onerilen;                       // 1RM anahtarı yoksa Excel anlık görüntüsü — snapshot:true ile görünür kılınır
  const prev = state.find(s => s.week === r.week - 1 && s.day === r.day && s.row_key === r.row_key && s.actor === 'arda' && !s.deleted) ?? null;
  const kg = M.rpeFreni(prev?.rpe, prev?.kg, plan, r.rpe_freni.esik, !!prev?.skipped);
  return { kg, fren: { prevRpe: prev?.rpe ?? null, prevKg: prev?.kg ?? null, prevSkipped: !!prev?.skipped, plan, snapshot: planHesap === null, uygulandi: M.isNum(kg) && kg !== plan } };
}

/** Seans görünümü: satırlar + plan metni + mevcut girişler + renk + plaka + ısınma. */
/** Uygulama ısınma rampası (Excel K3'ün üstüne; motor paritesi `isinmaBasamak`'ta korunur):
 *  - hedef: top set (Tekrar≤3); yoksa ilk barlı "Ağır/Heavy" satır (Arda 27 Eyl: Hip Thrust Ağır) — kg = önerilen ?? geçen kayıt
 *  - P5 (27 Eyl): hedeften önce olimpik kaldırış varsa (Clean/Snatch) rampa onun kilosunun ÜSTÜNDEN başlar, boş bar yok. */
const OLIMPIK = /^(clean|snatch|power clean|hang clean|hang snatch)\b/i;
export function rampaHesapla(def, state, sess, stateAll = null, viewRows = null) {
  const cfg = M.CONFIG[def.program]; const rows = viewRows ?? sess.rows;   // kırmızı takım #4: K25 frenli önerilenle kur
  const top = M.topSet(rows);
  let hedef = top.egzersiz ? rows.find(r => r.egzersiz === top.egzersiz && r.onerilen === top.kg && M.isNum(r.tekrar) && r.tekrar <= 3) : null, kg = top.kg || null;
  if (!hedef) {
    hedef = rows.find(r => isBarli(r) && /agir|ağır|heavy/i.test(r.modifier ?? ''));
    if (hedef) kg = M.isNum(hedef.onerilen) ? hedef.onerilen : (prevEntry(stateAll ?? state, hedef, sess, def.cycle)?.kg ?? null);
  }
  if (!hedef || !M.isNum(kg) || kg <= 0) return null;
  const hi = rows.indexOf(hedef);
  const oly = rows.slice(0, hi).filter(r => OLIMPIK.test(r.egzersiz)).map(r => {
    const a = state.find(x => x.week === sess.week && x.day === sess.day && x.row_key === r.row_key && x.actor === 'arda' && !x.deleted && !x.skipped);
    const k = a?.sets_detail?.length ? Math.max(...a.sets_detail.map(d => d.kg)) : (a?.kg ?? r.onerilen);
    return M.isNum(k) && k > 0 ? { egz: r.egzersiz, kg: k } : null; }).filter(Boolean).sort((a, b) => b.kg - a.kg)[0] ?? null;
  const tum = M.isinmaBasamaklari(kg, cfg.rampRoundBase) ?? [];
  const basamak = oly ? tum.filter(k => k > oly.kg && k < kg) : tum;
  if (!basamak.length && oly) return null;   // olimpik kilo hedefe yakın/üstünde → ek ısınma yok (kırmızı takım #5)
  return { egz: hedef.egzersiz, rowKey: hedef.row_key, kg, basamak, bosBar: !oly, olimpik: oly, kaynak: top.egzersiz ? 'top' : 'agir' };
}

export function sessionView(def, state, idx, overrides = null, stateAll = null) {
  const cfg = M.CONFIG[def.program];
  const ss = sessions(def, overrides); const sess = ss.find(s => s.idx === idx); if (!sess) return null;
  const rows = sess.rows.map(r => {
    const st = a => state.find(s => s.week === sess.week && s.day === sess.day && s.row_key === r.row_key && s.actor === a && !s.deleted) ?? null;
    const arda = st('arda'), alper = def.program === 'Alper' ? st('alper') : null;
    const eo = etkinOnerilen(def, state, r); r = { ...r, onerilen: eo.kg, fren: eo.fren };
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
  // Alper (K3 eşleniği, Excel'de yok — Arda 23 Eyl): Alper'in top seti = aynı satırın onerilen_alper'i; rampa aynı yüzdelerle
  const topAlper = def.program === 'Alper' && top.egzersiz ? (() => { const r = sess.rows.find(x => x.egzersiz === top.egzersiz && x.onerilen === top.kg); const kgA = r?.onerilen_alper; return M.isNum(kgA) && kgA > 0 ? { kg: kgA, egzersiz: top.egzersiz } : null; })() : null;
  return { ...sess, N: ss.length, rows, rampa: rampaHesapla(def, state, sess, stateAll, rows), topAlperKg: topAlper?.kg ?? null, isinmaBasamakAlper: topAlper ? M.isinmaBasamaklari(topAlper.kg, cfg.rampRoundBase) : null, kol: kolBlok(def, def.rows.filter(r => r.week === sess.week && r.day === sess.day)), isinma: M.isinmaMetni(top.kg, top.egzersiz, cfg.rampRoundBase), isinmaBasamak: M.isinmaBasamaklari(top.kg, cfg.rampRoundBase), topKg: top.kg,
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
  const rowsWith = def.rows.map(r0 => {
    const r = { ...r0, onerilen: etkinOnerilen(def, state, r0).kg };
    const s = state.find(x => x.week === r.week && x.day === r.day && x.row_key === r.row_key && x.actor === 'arda' && !x.deleted);
    const tekrar = r.tekrar ?? r.tekrar_metin;
    return { ...r, hafta: r.week, tekrar, beklenen_hacim: M.beklenenHacim(r.onerilen, r.set, tekrar), beklenen_max: M.beklenenMax(r.metod, r.onerilen, r.set, tekrar, cfg.repeatMaxSets, cfg.maxSetMethods),
      gercek_hacim: s ? (s.sets_detail?.length ? M.gercekHacimDetay(s.sets_detail) : M.gercekHacim(s.kg, s.sets, s.reps)) : null, gercek_rpe: s?.rpe ?? null,
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
export function prevEntry(stateAll, r, sess, cycle, actor = 'arda') {
  const cand = stateAll.filter(s => s.row_key === r.row_key && s.actor === actor && !s.deleted && M.isNum(s.kg) && !s.skipped
    && !(s.cycle === cycle && s.week === sess.week && s.day === sess.day));
  if (!cand.length) return null;
  cand.sort((a, b) => a.ts < b.ts ? 1 : -1);
  return cand[0];
}
/** Set-set detay metni: "180×5 · 200×5 · 200×5 R9" */
export function detayMetni(detail) { return (detail ?? []).map(x => `${M.fmt(x.kg)}×${x.reps ?? '?'}${M.isNum(x.rpe) ? ` R${M.fmt(x.rpe)}` : ''}`).join(' · '); }
export function prevMetni(s) {
  if (!s) return null;
  if (s.sets_detail?.length) return `${detayMetni(s.sets_detail)}${s.note ? ` — ${s.note}` : ''}`;
  const rep = s.reps ?? s.reps_text ?? '';
  return `${M.fmt(s.kg)}×${M.fmt(s.sets)}×${rep}${s.rpe ? ` R${M.fmt(s.rpe)}` : ''}${s.note ? ` — ${s.note}` : ''}`;
}
/** Dinlenme kuralı (Arda, 22 Eyl akşam): mola YALNIZ sıradaki setin türüne bağlı — top set (Single/Double/Triple/PR/Tahmin) öncesi 480 sn
 *  (son ısınmadan sonra da), Agir/heavy set öncesi 300, Backoff/Repeat/Load Drop öncesi 180, aksesuar/kol/light öncesi 90. */
export function dinlenmeKategori(r) {
  if (!r) return 'light';
  const m = `${r.modifier ?? ''} ${r.metod ?? ''}`;
  if (/deload/i.test(m)) return 'backoff';                                   // ANTRENÖR: "Deload Triple" top değil
  if (/single|double|triple|pr attempt|tahmin|amrap/i.test(m)) return 'top'; // Kalibrasyon AMRAP (RPE9) = top yoğunluk
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

/** K2 (cutover sonrası): taban programdef (Excel son hâli) + `data/degisiklikler.json` → çalışma programı. Saf; tabanı değiştirmez.
 *  islem: satir_sil {day, week_min, week_max, row_key_in} · satir_ekle {day, week_min, week_max} + satir (günün sonuna) · alan_doldur {modifier_in, bos_alan} + degerler{modifier: değer}. */
export function degisiklikUygula(def, liste) {
  const out = { ...def, rows: def.rows.map(r => ({ ...r })), degisiklik: [] };
  const hafta = (f, w) => (f.week_min == null || w >= f.week_min) && (f.week_max == null || w <= f.week_max);
  for (const d of liste ?? []) {
    if (d.program !== '*' && d.program !== def.program) continue;
    const f = d.filtre ?? {}; let n = 0;
    if (d.islem === 'satir_sil') { const once = out.rows.length; out.rows = out.rows.filter(r => !(r.day === f.day && hafta(f, r.week) && (f.row_key_in ?? []).includes(r.row_key))); n = once - out.rows.length; }
    else if (d.islem === 'satir_ekle') {
      const weeks = [...new Set(out.rows.filter(r => r.day === f.day && hafta(f, r.week)).map(r => r.week))];
      for (const w of weeks) {
        const s = d.satir; const row_key = `${s.egzersiz}|${s.modifier ?? ''}`;
        if (out.rows.some(r => r.week === w && r.day === f.day && r.row_key === row_key)) continue;   // idempotent
        const son = out.rows.map((r, i) => [r, i]).filter(([r]) => r.week === w && r.day === f.day).pop()[1];
        out.rows.splice(son + 1, 0, { row: 90000 + w * 10 + (f.day === 'Cum' ? 5 : 0), week: w, day: f.day, row_key, egzersiz: s.egzersiz, modifier: s.modifier ?? null, pct_1rm: null, onerilen: null, onerilen_alper: null,
          set: s.set ?? null, tekrar: s.tekrar ?? null, tekrar_metin: null, hedef_rpe: s.hedef_rpe ?? null, metod: null, dinlenme: s.dinlenme ?? null, is_percentage_based: false, bw: false, sistem_notu: s.sistem_notu ?? null, rpe_freni: null, degisiklik: d.id });
        n++;
      }
    } else if (d.islem === 'alan_doldur') {
      for (const r of out.rows) if ((f.modifier_in ?? []).includes(r.modifier) && (r[f.bos_alan] === null || r[f.bos_alan] === undefined) && d.degerler?.[r.modifier] != null) { r[f.bos_alan] = d.degerler[r.modifier]; n++; }
    }
    out.degisiklik.push({ id: d.id, n });
  }
  return out;
}

