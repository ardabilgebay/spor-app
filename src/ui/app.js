// UI — saha modu (Faz 2) · vanilla DOM, innerHTML YOK (veri textContent ile) · klavye yalnız istekle (kg'ye dokun / not)
import * as S from '../store.js';
import * as P from '../program.js';
import * as M from '../motor.js';

const $ = (s, el = document) => el.querySelector(s);
const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== null && v !== undefined) e.setAttribute(k, v); } for (const k of kids.flat()) if (k !== null && k !== undefined) e.append(k.nodeType ? k : document.createTextNode(String(k))); return e; };
const PROGS = ['Deadlift', 'Alper', 'Diger'];
const PROG_AD = { Deadlift: 'Deadlift', Alper: 'Alper Günleri', Diger: 'Diğer Günler' };
const CYCLE = { Deadlift: 'W2', Alper: 'C2', Diger: 'C2' };
const RPE_LIST = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const DINLENME = r => (r.modifier && /single|triple|double|pr attempt|tahmin/i.test(r.modifier)) ? 210 : (/backoff|repeat|load drop/i.test(`${r.modifier} ${r.metod}`) ? 180 : 90);

export class App {
  constructor({ root, defs, sync, remote, version }) {
    Object.assign(this, { root, defs, sync, remote, version });
    this.view = 'bugun'; this.prog = null; this.open = null; this.timer = null; this.kilit = {}; this.persist = null;
    this.sync?.on(() => this.render());
  }
  async start() {
    this.persist = await S.getMeta('persist_granted');
    this.kilit = await S.getMeta('kilit', {});
    this.prog = await this.pickProgram();
    await this.render();
  }
  async pickProgram() {
    const today = P.todayKey(); const saved = await S.getMeta('prog');
    for (const p of PROGS) { const v = await this.sessionOf(p); if (v && v.day === today && v.tamamlanan < v.rows.length) return p; }
    return saved ?? PROGS[0];
  }
  async sessionOf(p) {
    const def = this.defs[p]; if (!def) return null;
    const state = await S.stateFor(p, def.cycle); const ov = await S.armVariants(p, def.cycle);
    const idx = P.activeSessionIdx(def, state, this.kilit[p] ?? null, await S.finishedSessions(p, def.cycle), new Date(), ov);
    return P.sessionView(def, state, idx, ov);
  }
  async render() {
    const root = this.root; root.replaceChildren();
    root.append(el('div', { class: 'menu top-menu' },
      ...[['bugun', 'Bugün'], ['program', 'Program'], ['ayarlar', 'Ayarlar']].map(([v, t]) => el('button', { class: this.view === v ? 'sel' : '', onclick: () => { this.view = v; this.open = null; this.render(); } }, t))));
    if (this.view === 'bugun') await this.renderBugun(root);
    else if (this.view === 'program') await this.renderProgram(root);
    else await this.renderAyarlar(root);
    // sabit çubuk içeriği örtmesin: alt boşluk = çubuk yüksekliği
    const bar = root.querySelector('.bar'); root.style.paddingBottom = bar ? (bar.getBoundingClientRect().height + 24) + 'px' : '40px';
  }
  banner() {
    const out = [];
    const st = this.sync?.last;
    if (this.persist === false) out.push(el('div', { class: 'banner warn' }, 'Kalıcı depolama izni verilmedi — kayıtlar cihazda ama iOS silebilir; senkronun çalıştığından emin ol.'));
    if (st?.err === 'yeniden_giris' || st?.err === 'giris_gerekli') out.push(el('div', { class: 'banner warn' }, 'OneDrive senkronu için giriş gerekli (Ayarlar). Loglama etkilenmez.'));
    else if (st?.err && st.err !== 'yok') out.push(el('div', { class: 'banner err' }, 'Senkron hatası: ' + st.err));
    return out;
  }
  // ── BUGÜN ─────────────────────────────────────────────────────────
  async renderBugun(root) {
    const p = this.prog; const def = this.defs[p]; const v = await this.sessionOf(p);
    root.append(el('div', { class: 'top' }, el('h1', {}, 'Bugün'), el('span', { class: 'small mute' }, new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }))));
    root.append(el('div', { class: 'progs' }, ...PROGS.map(q => el('button', { class: q === p ? 'sel' : '', onclick: async () => { this.prog = q; this.open = null; await S.setMeta('prog', q); this.render(); } }, PROG_AD[q]))));
    root.append(...this.banner());
    if (!v) { root.append(el('div', { class: 'banner info' }, 'Program tanımı yok.')); return; }
    const stres = await S.stressFor(p, def.cycle);
    root.append(el('div', { class: 'card' },
      el('div', { class: 'top' }, el('h2', {}, `Hafta ${v.week} — ${P.GUN_AD[v.day]}`), el('span', { class: 'small mute tab' }, `Seans ${v.idx} / ${v.N} · ${v.tamamlanan}/${v.rows.length}`)),
      this.kilit[p] ? el('div', { class: 'banner info' }, `Seans kilidi açık (${this.kilit[p]}). `, el('button', { class: 'ghost small', onclick: async () => { delete this.kilit[p]; await S.setMeta('kilit', this.kilit); this.render(); } }, 'Kaldır')) : null,
      !stres.has(v.week) ? el('div', {}, el('div', { class: 'lbl' }, `Hayat stresi (hafta ${v.week}) — isteğe bağlı`), el('div', { class: 'stres' }, ...[1, 2, 3, 4, 5].map(n => el('button', { onclick: async () => { await S.logStress({ program: p, cycle: def.cycle, week: v.week, value: n }); this.sync?.schedule(); this.render(); } }, n)))) : el('div', { class: 'small dim' }, `Stres H${v.week}: ${stres.get(v.week)}`),
      v.isinma ? el('div', { class: 'isinma tab' }, v.isinma) : null,
      // BUGÜN!I36 — kol varyantı override (K22): takvim varyantı işaretli; seçim arm_variant.set olayı yazar
      v.kol ? el('div', { style: 'margin-top:8px' }, el('div', { class: 'lbl' }, `Kol · ${v.kol.kas} · varyant (takvim ${v.kol.takvim})`),
        el('div', { class: 'chips' }, ...v.kol.secenekler.map(vr => el('button', { class: (v.kolVaryant ?? v.kol.takvim) === vr ? 'sel' : '', onclick: async () => {
          const secilen = vr === v.kol.takvim ? null : vr;
          if (v.rows.some(r => P.kolBilgi(r) && r.tamam) && !confirm(`Kol satırlarında giriş var. Varyant ${vr}'ye geçilirse o girişler eski egzersiz adıyla saklanır, ekranda görünmez. Devam?`)) return;
          await S.logArmVariant({ program: p, cycle: def.cycle, week: v.week, day: v.day, varyant: secilen }); this.sync?.schedule(); this.open = null; this.render();
        } }, vr)))) : null,
      // A1: seans dolu ama bitmemişse işaretçi burada kalır; "Seansı bitir" ile açıkça kapatılır (session.finished) → sonraki seans
      v.tamamlanan > 0 && v.idx < v.N ? el('div', { style: 'margin-top:8px' },
        el('button', { class: 'ghost small', style: 'min-height:36px', onclick: async () => {
          const eksik = v.rows.length - v.tamamlanan;
          if (eksik > 0 && !confirm(`Seans ${v.idx} bitsin mi? ${eksik} satır boş kalacak (girilmedi).`)) return;
          await S.logSession('finished', { program: p, cycle: def.cycle, week: v.week, day: v.day }); this.sync?.schedule(); this.open = null; this.render();
        } }, `Seansı bitir → Seans ${v.idx + 1}`)) : null,
    ));
    // odak: açık satır = elle açılan ya da ilk tamamlanmamış
    const nowRow = v.rows.find(r => !r.tamam && !(r.arda?.skipped));
    const openKey = this.open ?? nowRow?.row_key ?? null;
    for (const r of v.rows) {
      const isOpen = r.row_key === openKey;
      const cls = ['row', r.tamam ? (r.arda.skipped ? 'skip' : 'done') : '', isOpen && r === nowRow ? 'now' : ''].join(' ');
      const st = r.tamam ? (r.arda.skipped ? 'ATLANDI' : (r.renk === 'yuksek' ? 'RPE ↑' : r.renk === 'dusuk' ? 'RPE ↓' : '✓')) : (r === nowRow ? 'ŞİMDİ YAP' : '');
      const yapilan = r.tamam && !r.arda.skipped ? `${M.fmt(r.arda.kg)}×${M.fmt(r.arda.sets)}×${r.arda.reps ?? r.arda.reps_text ?? ''}${r.arda.rpe ? ` · RPE${M.fmt(r.arda.rpe)}` : ''}${r.arda.note ? ` — ${r.arda.note}` : ''}` : null;
      const alperTxt = r.alper && M.isNum(r.alper.kg) ? `Alper: ${M.fmt(r.alper.kg)}×${M.fmt(r.alper.sets)}×${r.alper.reps ?? ''}` : null;
      root.append(el('div', { class: cls, onclick: () => { this.open = r.row_key; this.render(); } },
        el('div', { class: 'top' }, el('div', { class: 'ex' }, r.egzersiz), el('span', { class: 'state ' + (r.renk === 'yuksek' ? 'rpe-y' : r.renk === 'dusuk' ? 'rpe-d' : '') }, st)),
        el('div', { class: 'hedef' }, r.hedef),
        r.plaka ? el('div', { class: 'plaka tab' }, (r.plakaAlper ? 'Arda · ' : '') + r.plaka) : null,
        r.plakaAlper ? el('div', { class: 'plaka tab' }, 'Alper · ' + r.plakaAlper) : null,
        yapilan ? el('div', { class: 'yapilan tab' }, yapilan) : null, alperTxt ? el('div', { class: 'yapilan tab small mute' }, alperTxt) : null,
        r.tamam && r.arda.count > 1 ? el('div', { class: 'small dim' }, `${r.arda.count} kayıt (düzeltme geçmişi)`) : null,
      ));
    }
    const openRow = v.rows.find(r => r.row_key === openKey);
    if (openRow) root.append(await this.bar(openRow, v, def));
  }
  // ── LOGLAMA ÇUBUĞU ────────────────────────────────────────────────
  async bar(r, v, def) {
    const p = def.program; const draftKey = `draft:${p}|${def.cycle}|${v.week}|${v.day}|${r.row_key}`;
    const d = (await S.getMeta(draftKey)) ?? { actor: 'arda', kg: null, sets: null, reps: null, rpe: null, note: null };
    const planKg = d.actor === 'alper' ? r.onerilen_alper : r.onerilen;
    const cur = d.actor === 'alper' ? r.alper : r.arda;
    if (d.kg === null && d.sets === null) { d.kg = cur?.kg ?? planKg ?? null; d.sets = cur?.sets ?? r.set ?? null; d.reps = cur?.reps ?? r.tekrar ?? null; d.rpe = cur?.rpe ?? null; d.note = cur?.note ?? null; }
    const save = async () => { await S.setMeta(draftKey, d); this.render(); };
    const bar = el('div', { class: 'bar' });
    bar.append(el('div', { class: 'title' }, el('div', { class: 'ex' }, r.egzersiz + (r.modifier ? ` · ${r.modifier}` : '')), el('span', { class: 'timer tab', id: 'timer' })));
    if (p === 'Alper') bar.append(el('div', { class: 'seg', style: 'margin-top:8px' }, ...['arda', 'alper'].map(a => el('button', { class: d.actor === a ? 'sel' : '', onclick: async () => { d.actor = a; d.kg = null; d.sets = null; await save(); } }, a === 'arda' ? 'Arda' : 'Alper'))));
    // KG stepper + dokun-yaz
    const kgIn = el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', value: d.kg === null ? '' : M.fmt(d.kg), placeholder: r.bw ? 'toplam: bw+ek' : 'kg', style: 'text-align:center;font-size:22px;font-weight:600' });
    kgIn.addEventListener('change', async () => { d.kg = M.parseKg(kgIn.value); await S.setMeta(draftKey, d); kgIn.value = d.kg === null ? '' : M.fmt(d.kg); });
    const step = n => { d.kg = Math.max(0, Math.round(((d.kg ?? planKg ?? 0) + n) * 100) / 100); kgIn.value = M.fmt(d.kg); };   // yerinde; kayıt+çizim basma bitince
    bar.append(el('div', { class: 'lbl', style: 'margin-top:8px' }, 'KG' + (planKg !== null ? ` · plan ${M.fmt(planKg)}` : '')), el('div', { class: 'stepper' }, hold(el('button', {}, '−2.5'), () => step(-2.5), save), kgIn, hold(el('button', {}, '+2.5'), () => step(2.5), save)));
    // SET
    const setN = r.set ?? 3; bar.append(el('div', { class: 'lbl', style: 'margin-top:6px' }, 'SET'), el('div', { class: 'chips' }, ...[1, 2, 3, 4, 5].map(n => el('button', { class: d.sets === n ? 'sel' : '', onclick: async () => { d.sets = n; await save(); } }, n))));
    // TEKRAR
    const base = r.tekrar ?? 5; const reps = r.tekrar_metin ? [] : [base - 2, base - 1, base, base + 1, base + 2].filter(n => n >= 1);
    bar.append(el('div', { class: 'lbl', style: 'margin-top:6px' }, 'TEKRAR' + (r.tekrar_metin ? ` · ${r.tekrar_metin}` : '')), el('div', { class: 'chips' }, ...reps.map(n => el('button', { class: d.reps === n ? 'sel' : '', onclick: async () => { d.reps = n; await save(); } }, n)),
      el('button', { class: 'ghost small', onclick: async () => { const t = prompt('Tekrar'); const n = M.parseKg(t); if (n !== null) { d.reps = n; await save(); } } }, '…')));
    // RPE — hareket biter bitmez, aynı akışta
    bar.append(el('div', { class: 'lbl', style: 'margin-top:6px' }, 'RPE' + (r.hedef_rpe ? ` · hedef ${M.fmt(r.hedef_rpe)}` : '')), el('div', { class: 'chips' }, ...RPE_LIST.map(n => el('button', { class: (d.rpe === n ? 'sel' : '') + ' small', style: 'min-width:34px;padding:0 6px', onclick: async () => { d.rpe = n; await save(); } }, M.fmt(n)))));
    // NOT (isteğe bağlı — klavye açılır)
    const notIn = el('input', { type: 'text', value: d.note ?? '', placeholder: 'not (isteğe bağlı)', style: 'margin-top:6px;min-height:38px' });
    notIn.addEventListener('change', async () => { d.note = notIn.value.trim() || null; await S.setMeta(draftKey, d); }); bar.append(notIn);
    // eylemler
    const commit = async ({ skipped = false, aynen = false } = {}) => {
      const data = aynen ? { kg: planKg, sets: r.set, reps: r.tekrar, reps_text: r.tekrar_metin, rpe: d.rpe, note: d.note } : { kg: d.kg, sets: d.sets, reps: d.reps, reps_text: r.tekrar_metin && d.reps === null ? r.tekrar_metin : null, rpe: d.rpe, note: d.note };
      if (!skipped && data.kg === null && !aynen) { $('#timer').textContent = 'kg gir (ya da Atlandı)'; return; }
      const ev = await S.logSet({ ref: r.ref, actor: d.actor, ...data, skipped, supersedes: cur?.event_id ?? null });
      await S.setMeta(draftKey, null); this.sync?.schedule(); this.open = null;
      this.startTimer(DINLENME(r)); this.render(); return ev;
    };
    bar.append(el('div', { class: 'actions' },
      el('button', { class: 'acc', onclick: () => commit() }, cur ? 'Düzelt ve kaydet' : 'Kaydet'),
      el('button', { class: 'ok', title: 'Plan değerleriyle kaydet', onclick: () => commit({ aynen: true }) }, '✓ Aynen'),
      el('button', { onclick: () => commit({ skipped: true }) }, 'Atlandı')));
    return bar;
  }
  startTimer(sec) {
    clearInterval(this.timer); const end = Date.now() + sec * 1000;
    this.timer = setInterval(() => { const t = $('#timer'); if (!t) return; const k = Math.max(0, Math.round((end - Date.now()) / 1000)); t.textContent = k > 0 ? `dinlenme ${Math.floor(k / 60)}:${String(k % 60).padStart(2, '0')}` : 'hazır'; if (k <= 0) clearInterval(this.timer); }, 500);
  }
  // ── PROGRAM ───────────────────────────────────────────────────────
  async renderProgram(root) {
    const p = this.prog; const def = this.defs[p]; const state = await S.stateFor(p, def.cycle);
    root.append(el('h1', {}, PROG_AD[p]), el('div', { class: 'progs' }, ...PROGS.map(q => el('button', { class: q === p ? 'sel' : '', onclick: () => { this.prog = q; this.render(); } }, PROG_AD[q]))));
    const ov = await S.armVariants(p, def.cycle); const wk = P.weekly(def, state, ov);
    root.append(el('div', { class: 'card' }, el('h2', {}, `${def.cycle} haftalık`), el('div', { class: 'kv', style: 'margin-top:6px' }, ...wk.flatMap(w => [el('div', {}, `H${w.week} ${w.sinyal}`), el('div', {}, w.uyum)]))));
    const active = P.activeSessionIdx(def, state, this.kilit[p] ?? null, await S.finishedSessions(p, def.cycle), new Date(), ov);
    for (const s of P.sessions(def, ov)) {
      const dolu = P.isDolu(s, state);
      root.append(el('div', { class: 'row ' + (dolu ? 'done' : '') + (s.idx === active ? ' now' : ''), onclick: async () => { this.kilit[p] = s.idx; await S.setMeta('kilit', this.kilit); this.view = 'bugun'; this.open = null; this.render(); } },
        el('div', { class: 'top' }, el('div', { class: 'ex' }, `S${s.idx} · H${s.week} ${P.GUN_AD[s.day]}`), el('span', { class: 'state' }, dolu ? '✓' : (s.idx === active ? 'SIRADA' : ''))),
        el('div', { class: 'hedef' }, s.rows.map(r => r.egzersiz + (r.modifier ? ` (${r.modifier})` : '')).join(' · '))));
    }
  }
  // ── AYARLAR ───────────────────────────────────────────────────────
  async renderAyarlar(root) {
    const pend = (await S.pendingEvents()).length; const total = await S.db.events.count(); const last = await S.getMeta('last_sync_at');
    const st = this.remote ? await this.remote.status() : { mode: 'yok' };
    root.append(el('h1', {}, 'Ayarlar'));
    if (this.msg) { root.append(el('div', { class: 'banner ok' }, this.msg)); this.msg = null; }
    root.append(el('div', { class: 'card' }, el('h2', {}, 'Veri güvenliği'), el('div', { class: 'kv', style: 'margin-top:6px' },
      el('div', {}, 'Toplam olay'), el('div', {}, total),
      el('div', {}, 'Cihazda bekleyen (senkron)'), el('div', { class: pend ? 'rpe-y' : '' }, pend),
      el('div', {}, 'Son başarılı senkron'), el('div', {}, last ? new Date(last).toLocaleString('tr-TR') : '—'),
      el('div', {}, 'Kalıcı depolama'), el('div', { class: this.persist === false ? 'rpe-y' : '' }, this.persist === true ? 'verildi' : this.persist === false ? 'REDDEDİLDİ' : 'bilinmiyor'),
      el('div', {}, 'OneDrive'), el('div', {}, ({ yok: 'ayarlı değil', giris_gerekli: 'giriş gerekli', yeniden_giris: 'yeniden giriş', hazir: 'hazır · ' + (st.account ?? ''), hata: 'hata' })[st.mode] ?? st.mode)),
      el('div', { class: 'menu' },
        this.remote?.configured ? el('button', { onclick: () => st.mode === 'hazir' ? this.sync.run() : this.remote.login() }, st.mode === 'hazir' ? 'Şimdi senkronla' : 'OneDrive girişi') : null,
        el('button', { onclick: () => this.export() }, 'Dışa aktar'),
        el('button', { onclick: () => $('#imp').click() }, 'Yedekten yükle')),
      el('input', { type: 'file', id: 'imp', accept: '.ndjson,.txt,.json', class: 'hidden', onchange: e => this.import(e.target.files[0]) }),
      this.sync?.last?.err ? el('div', { class: 'banner err' }, 'Son senkron hatası: ' + this.sync.last.err) : null,
    ));
    root.append(el('div', { class: 'card', style: 'margin-top:10px' }, el('h2', {}, 'Sistem'), el('div', { class: 'kv small', style: 'margin-top:6px' },
      el('div', {}, 'Sürüm'), el('div', {}, this.version), el('div', {}, 'Cihaz'), el('div', {}, await S.deviceId()),
      ...PROGS.flatMap(p => [el('div', {}, `${PROG_AD[p]} tanımı`), el('div', {}, this.defs[p] ? `${this.defs[p].cycle} · ${this.defs[p].rows.length} satır` : '—')]))));
  }
  async export() {
    const txt = await S.exportNdjson(); const blob = new Blob([txt], { type: 'application/x-ndjson' });
    const a = el('a', { href: URL.createObjectURL(blob), download: `spor-olaylar-${new Date().toISOString().slice(0, 10)}.ndjson` }); document.body.append(a); a.click(); a.remove();
  }
  async import(file) { if (!file) return; const r = await S.importNdjson(await file.text()); this.msg = `Yüklendi: ${r.written} yeni · ${r.skipped} zaten vardı · ${r.bad} bozuk satır`; this.render(); }
}
/** Basılı tutunca hızlanan düğme (stepper). */
function hold(btn, fn, onEnd = null) {
  // Basılı tutma: 450 ms sonra 120 ms'de bir tekrar. Zamanlayıcılar belge düzeyinde kapatılır — düğme yeniden çizimle
  // DOM'dan düşse bile pointerup yakalanır (22 Eyl: eski sürüm düğme kaybolunca sonsuza dek saymaya devam ediyordu).
  let t = null, iv = null, active = false;
  const ENDS = ['pointerup', 'pointercancel'];
  const stop = () => { if (!active) return; active = false; clearTimeout(t); clearInterval(iv); t = iv = null; for (const ev of ENDS) document.removeEventListener(ev, stop); window.removeEventListener('blur', stop); onEnd?.(); };
  const start = e => { e.preventDefault(); if (active) return; active = true; for (const ev of ENDS) document.addEventListener(ev, stop); window.addEventListener('blur', stop);
    fn(); t = setTimeout(() => { iv = setInterval(() => { if (!btn.isConnected) return stop(); fn(); }, 120); }, 450); };
  btn.addEventListener('pointerdown', start);
  return btn;
}
