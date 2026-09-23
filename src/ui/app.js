// UI — saha modu · mockup (Spor App.dc.html) baz alındı, üstüne: kalıcılık, gerçek motor, stres düzeltme, hafta×gün ızgarası, önceki seans, dinlenme.
// İLKELER: innerHTML YOK (veri textContent) · klavye yalnız istekle (kg'ye/nota dokun) · type="number" YOK (madde 9) ·
// ÇİZİM: kabuk bir kez kurulur; sekme/faz değişiminde yalnız <main> yeniden dolar; çubuk içi etkileşimler DOM'u yerinde günceller (titreme yok).
import * as S from '../store.js';
import * as P from '../program.js';
import * as M from '../motor.js';

const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v === null || v === undefined || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); } for (const k of kids.flat(9)) if (k !== null && k !== undefined && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k))); return e; };
const svg = d => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); for (const p of d.split('|')) { const e = document.createElementNS('http://www.w3.org/2000/svg', 'path'); e.setAttribute('d', p); s.append(e); } return s; };
const ICON = {
  bugun: 'M4 10v4|M20 10v4|M6 8v8|M18 8v8|M6 12h12|M2 12h2|M20 12h2',
  program: 'M4 5h16v15H4z|M4 10h16|M8 3v4|M16 3v4|M8 14h.01|M12 14h.01|M16 14h.01',
  ilerleme: 'M3 20h18|M4 16l5-5 4 3 7-8|M16 6h4v4',
  aletler: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z|M12 9v4l3 2|M9 2h6|M18 5l1.5-1.5',
  ayarlar: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
};
const TABS = [['bugun', 'Bugün'], ['program', 'Program'], ['ilerleme', 'İlerleme'], ['aletler', 'Aletler'], ['ayarlar', 'Ayarlar']];
const PROGS = ['Deadlift', 'Alper', 'Diger'];
const PROG_AD = { Deadlift: 'Deadlift', Alper: 'Alper Günleri', Diger: 'Diğer Günler' };
const RPE_LIST = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
const STRES_AD = ['çok iyi', 'iyi', 'normal', 'yorgun', 'bitkin'];
const KG_ADIM = 2.5;
const sinyalRenk = s => !s || s === '—' ? 'dim' : s.startsWith('🔴') ? 'red' : s.startsWith('🔵') ? 'blue' : s.startsWith('⏳') ? 'warn' : s.startsWith('⏸') ? 'dim' : 'ok';
const mmss = k => `${Math.floor(k / 60)}:${String(k % 60).padStart(2, '0')}`;
/** K25 — RPE freni gerekçesi (App-G21: öneri sessizce değişmez, nedeni görünür). */
function frenNotu(r) {
  const f = r.fren; if (!f) return null;
  const txt = f.uygulandi
    ? `RPE freni: geçen hafta ${fmt(f.prevKg)} kg RPE ${fmt(f.prevRpe)} (>8) → plan ${fmt(f.plan)} yerine ${fmt(r.onerilen)} kg tekrar`
    : (f.prevRpe === null ? `RPE freni hazır: geçen hafta kayıt yok → plan ${fmt(f.plan)} kg` : `RPE freni: geçen hafta RPE ${fmt(f.prevRpe)} ≤ 8 → plan ${fmt(f.plan)} kg`);
  return el('div', { class: 'small tab ' + (f.uygulandi ? 'warn' : 'dim2'), style: 'margin-top:2px' }, txt + (f.snapshot ? ' (1RM tanımsız — Excel anlık görüntüsü)' : ''));
}

const fmt = M.fmt;
/** Basılı tutunca hızlanan düğme: hemen 1 adım; 400 ms sonra 150 ms'de bir; 1,5 sn sonra ×4 adım. Bitiş belge düzeyinde yakalanır (düğme kaybolsa da durur). */
function hold(btn, fn) {
  let t = null, iv = null, on = false, t0 = 0;
  const ENDS = ['pointerup', 'pointercancel'];
  const stop = () => { if (!on) return; on = false; clearTimeout(t); clearInterval(iv); for (const e of ENDS) document.removeEventListener(e, stop); window.removeEventListener('blur', stop); };
  btn.addEventListener('pointerdown', e => { e.preventDefault(); if (on) return; on = true; t0 = Date.now(); for (const ev of ENDS) document.addEventListener(ev, stop); window.addEventListener('blur', stop);
    fn(1); t = setTimeout(() => { iv = setInterval(() => { if (!btn.isConnected) return stop(); fn(Date.now() - t0 > 1500 ? 4 : 1); }, 150); }, 400); });
  btn.addEventListener('click', e => e.preventDefault());
  return btn;
}

export class App {
  constructor({ root, defs, sync, remote, version }) {
    Object.assign(this, { root, defs, sync, remote, version });
    this.tab = 'bugun'; this.prog = null; this.kilit = {}; this.persist = null; this.msg = null; this.needRefresh = null;
    this.sheet = null; this.plakaKg = 100; this.krono = null; this.progSel = {}; this.ozet = null; this.logCollapsed = false;
    this.sync?.on(() => { if (this.tab === 'ayarlar') this.render(); });
  }
  // ── kabuk ────────────────────────────────────────────────────────
  async start() {
    this.persist = await S.getMeta('persist_granted'); this.kilit = await S.getMeta('kilit', {});
    this.plakaKg = await S.getMeta('plaka_kg', 100);
    this.prog = await this.pickProgram();
    const r = this.root; r.replaceChildren();
    this.hdr = el('div', { class: 'hdr' }, el('div', { style: 'min-width:0' }, this.hK = el('div', { class: 'k' }), this.hT = el('div', { class: 't' })), this.hR = el('div', { class: 'right' }));
    this.strip = el('div', { class: 'strip' }); this.main = el('main'); this.foot = el('div'); this.veil = el('div');
    this.tabbar = el('div', { class: 'tabs' }, ...TABS.map(([id, ad]) => el('button', { 'data-tab': id, onclick: () => this.go(id) }, svg(ICON[id]), el('span', {}, ad))));
    r.append(this.hdr, this.strip, this.main, this.foot, this.tabbar, this.veil);
    let lastY = 0; this.main.addEventListener('scroll', () => { const y = this.main.scrollTop, dy = y - lastY; lastY = y; if (this.root.classList.contains('has-foot')) return this.tabsShow(true);   // seans sırasında sekmeler sabit
      const atEnd = y + this.main.clientHeight >= this.main.scrollHeight - 24; if (dy > 6 && y > 40 && !atEnd) this.tabsShow(false); else if (dy < -4 || y <= 40 || atEnd) this.tabsShow(true); }, { passive: true });
    // alt kenara dokunuş → dock gibi geri gelir
    this.root.addEventListener('pointerdown', e => { if (e.clientY > innerHeight - 28) this.tabsShow(true); }, { passive: true });
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && ['log', 'isinma'].includes(this.c?.seans?.faz)) this.wakeLock(true); });
    // iOS klavye: görsel viewport küçülünce alt çubuk klavyenin üstünde kalsın
    window.visualViewport?.addEventListener('resize', () => { const vv = window.visualViewport; this.root.style.height = vv.height + 'px'; this.root.style.transform = `translateY(${vv.offsetTop}px)`; });
    await this.render();
  }
  go(tab) { if (this.tab === tab) return; this.tab = tab; this.main.scrollTop = 0; this.tabsShow(true);
    const paint = () => { this.main.classList.remove('vin'); void this.main.offsetWidth; this.main.classList.add('vin'); return this.render(); };
    paint(); }   // View Transitions denendi (A13) → iOS 27 standalone'da hayalet görüntü; kaldırıldı, yalnız main.vin
  /** Dock davranışı: aşağı kaydırırken sekmeler gizlenir, yukarı kaydırınca / alt kenara yaklaşınca geri gelir. */
  tabsShow(on) { this.tabbar.classList.toggle('hide', !on); }
  async pickProgram() {
    const today = P.todayKey(); const saved = await S.getMeta('prog');
    for (const p of PROGS) { const c = await this.ctx(p); if (c.v && c.v.day === today && c.v.tamamlanan < c.v.rows.length) return p; }
    return saved ?? PROGS[0];
  }
  async setProg(p) { this.prog = p; await S.setMeta('prog', p); this.render(); }
  /** Program bağlamı: tanım + durum + aktif seans görünümü. */
  async ctx(p) {
    const def = this.defs[p]; if (!def) return { def: null, v: null };
    const [state, stateAll, ov, finished, stres, sev] = await Promise.all([S.stateFor(p, def.cycle), S.stateAllFor(p), S.armVariants(p, def.cycle), S.finishedSessions(p, def.cycle), S.stressFor(p, def.cycle), S.sessionEvents(p, def.cycle)]);
    const idx = P.activeSessionIdx(def, state, this.kilit[p] ?? null, finished, new Date(), ov);
    const v = P.sessionView(def, state, idx, ov);
    const seansKey = v ? `seans:${p}|${def.cycle}|${v.week}|${v.day}` : null;
    const seans = seansKey ? (await S.getMeta(seansKey)) ?? null : null;
    return { p, def, state, stateAll, ov, finished, stres, sev, idx, v, seansKey, seans, wk: P.weekly(def, state, ov) };
  }
  async render() {
    const c = this.c = await this.ctx(this.prog);
    for (const b of this.tabbar.children) b.classList.toggle('sel', b.dataset.tab === this.tab);
    // program şeridi (üstte)
    this.strip.replaceChildren(...PROGS.map(p => el('button', { class: p === this.prog ? 'sel' : '', onclick: () => this.setProg(p) }, el('span', { class: 'dot' }), PROG_AD[p])));
    this.strip.classList.toggle('hidden', this.tab === 'ayarlar' || this.tab === 'aletler' || (this.tab === 'bugun' && ['isinma', 'log', 'ozet'].includes(c.seans?.faz)));
    this.hR.replaceChildren(); this.foot.replaceChildren(); this.foot.className = 'hidden'; this.root.classList.remove('has-foot');
    const top = this.main.scrollTop; this.main.replaceChildren();
    const fn = { bugun: this.rBugun, program: this.rProgram, ilerleme: this.rIlerleme, aletler: this.rAletler, ayarlar: this.rAyarlar }[this.tab];
    await fn.call(this, c);
    this.main.scrollTop = top;
    this.renderSheet();
  }
  head(k, t, ...right) { this.hK.textContent = k; this.hT.textContent = t; this.hR.replaceChildren(...right.filter(Boolean)); this.hdr.classList.remove('one'); }
  footer(cls, ...kids) { this.foot.className = cls; this.foot.replaceChildren(...kids.filter(Boolean)); this.root.classList.toggle('has-foot', cls !== 'hidden'); }
  banners() {
    const out = []; const st = this.sync?.last;
    if (this.persist === false) out.push(el('div', { class: 'banner warn' }, 'Kalıcı depolama izni yok — ana ekrandan açınca iOS verir. Kayıtlar cihazda; senkron/yedek önemli.'));
    if (st?.err && st.err !== 'yok') out.push(el('div', { class: 'banner ' + (st.err === 'giris_gerekli' || st.err === 'yeniden_giris' ? 'warn' : 'err') }, st.err === 'giris_gerekli' || st.err === 'yeniden_giris' ? 'OneDrive için giriş gerekli (Ayarlar). Loglama etkilenmez.' : 'Senkron hatası: ' + st.err));
    return out;
  }
  // ── BUGÜN ─────────────────────────────────────────────────────────
  async rBugun(c) {
    const { def, v, p } = c; const tarih = new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' });
    if (!v) { this.head(tarih, PROG_AD[p]); this.main.append(el('div', { class: 'banner' }, 'Program tanımı yok.')); return; }
    const faz = c.seans?.faz ?? 'onizleme';
    this.wakeLock(faz === 'log' || faz === 'isinma');
    this.head(tarih, `Hafta ${v.week} — ${P.GUN_AD[v.day]} Seansı`);
    this.hdr.classList.add('one');
    const m = el('div', { class: 'pop' }); this.main.append(m);
    if (this.msg) { m.append(el('div', { class: 'banner ok', style: 'margin:0 0 10px' }, this.msg)); this.msg = null; }
    const skew = await S.getMeta('saat_sapmasi_ms'); if (skew) m.append(el('div', { class: 'banner warn', style: 'margin:0 0 10px' }, `Telefon saati sunucudan ${Math.round(Math.abs(skew) / 60000)} dk ${skew > 0 ? 'geride' : 'ileride'} — kayıt sırası bundan etkilenmesin diye saati otomatik yap.`));
    if (faz === 'onizleme') await this.fOnizleme(c, m);
    else if (faz === 'isinma') this.fIsinma(c, m);
    else if (faz === 'log') await this.fLog(c, m);
    else if (faz === 'ozet') await this.fOzet(c, m);
  }
  sureMetni(iso) { const k = Math.max(0, Math.round((Date.now() - new Date(iso)) / 1000)); return mmss(k); }
  tickSure() { clearInterval(this.sureIv); this.sureIv = setInterval(() => { const e = this.foot.querySelector('#sure') ?? this.hR.querySelector('#sure'); if (!e || !this.c?.seans?.started_at) return clearInterval(this.sureIv); e.textContent = this.sureMetni(this.c.seans.started_at); }, 1000); }
  async fazSet(faz, extra = {}) {
    const c = this.c; const s = { ...(c.seans ?? { tik: [], started_at: null, openKey: null }), faz, ...extra };
    if (faz !== 'onizleme' && !s.started_at) { s.started_at = new Date().toISOString(); await S.logSession('started', { program: c.p, cycle: c.def.cycle, week: c.v.week, day: c.v.day }); }
    await S.setMeta(c.seansKey, s); this.main.scrollTop = 0; await this.render();
  }
  stresRozet(c) {
    const { v, stres } = c; const val = stres.get(v.week);
    return el('button', { class: 'sig', style: 'width:100%;border:0;min-height:0;text-align:left;cursor:pointer', onclick: () => { this.sheet = { kind: 'stres' }; this.renderSheet(); } },
      el('span', { class: 'dot ' + (val ? (val >= 4 ? 'warn' : 'acc') : 'dim') }),
      el('span', { style: 'flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, val ? `Stres ${val} · ${STRES_AD[val - 1]}` : 'Stres girilmedi'),
      el('span', { class: 'dim xs' }, '›'));
  }
  sinyalSatiri(c) {
    const w = c.wk.find(x => x.week === c.v.week); const s = w?.sinyal ?? '—';
    return el('div', { class: 'sig' }, el('span', { class: 'dot ' + sinyalRenk(s) }), el('span', { style: 'min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap' }, s === '—' ? `H${c.v.week} sinyal: veri yok` : `${s.replace(/^\S+\s/, '')} · ${w.uyum.split(' • ')[0]}`));
  }
  kolSatiri(c) {
    const { v, p, def } = c; if (!v.kol) return null;
    return el('div', { style: 'margin-top:10px' }, el('div', { class: 'k' }, `Kol · ${v.kol.kas} · varyant (takvim ${v.kol.takvim})`),
      el('div', { class: 'pills' }, ...v.kol.secenekler.map(vr => el('button', { class: 'pill ' + ((v.kolVaryant ?? v.kol.takvim) === vr ? 'sel' : ''), onclick: async () => {
        const secilen = vr === v.kol.takvim ? null : vr;
        if (v.rows.some(r => P.kolBilgi(r) && r.tamam) && !confirm(`Kol satırlarında giriş var. Varyant ${vr}'ye geçilirse o girişler eski egzersiz adıyla saklanır, ekranda görünmez. Devam?`)) return;
        await S.logArmVariant({ program: p, cycle: def.cycle, week: v.week, day: v.day, varyant: secilen }); this.sync?.schedule(); this.render();
      } }, vr))));
  }
  rowCard(c, r, { open = false, onclick = null, now = false } = {}) {
    const prev = P.prevMetni(P.prevEntry(c.stateAll, r, c.v, c.def.cycle));
    const durum = r.tamam ? (r.arda.skipped ? 'ATLANDI' : r.renk === 'yuksek' ? 'RPE ↑' : r.renk === 'dusuk' ? 'RPE ↓' : 'KAYITLI') : (now ? 'ŞİMDİ' : (r.modifier ?? (P.kolBilgi(r) ? 'Kol' : /clean|snatch/i.test(r.egzersiz) ? 'Teknik' : (r.pct_1rm ? '' : 'Aksesuar'))));
    const cls = 'card mark ' + (r.tamam ? (r.arda.skipped ? 'skip' : r.renk === 'yuksek' ? 'hi' : r.renk === 'dusuk' ? 'lo' : 'done') : now ? 'now' : '') + (onclick ? ' tap' : '');
    const yap = r.tamam && !r.arda.skipped ? (r.arda.sets_detail?.length ? P.detayMetni(r.arda.sets_detail) : `${fmt(r.arda.kg)}×${fmt(r.arda.sets)}×${r.arda.reps ?? r.arda.reps_text ?? ''}${r.arda.rpe ? ` · RPE${fmt(r.arda.rpe)}` : ''}`) + (r.arda.note ? ` — ${r.arda.note}` : '') : null;
    const prevA = c.def.program === 'Alper' ? P.prevMetni(P.prevEntry(c.stateAll, r, c.v, c.def.cycle, 'alper')) : null;
    const alp = r.alper && M.isNum(r.alper.kg) ? `Alper: ${fmt(r.alper.kg)}×${fmt(r.alper.sets)}×${r.alper.reps ?? ''}` : (r.onerilen_alper !== null && r.onerilen_alper !== undefined ? `Alper ${fmt(r.onerilen_alper)} kg${prevA ? ` · geçen ${prevA}` : ''}` : null);
    return el(onclick ? 'button' : 'div', { class: cls, onclick },
      el('div', { class: 'h' }, el('div', { class: 'ex' }, r.egzersiz), el('div', { class: 'mod ' + (r.renk === 'yuksek' ? 'warn' : r.renk === 'dusuk' ? 'blue' : now ? 'acc' : '') }, durum)),
      el('div', { class: 'hedef tab' }, r.hedef?.replace(/^.*\n/, '') ?? ''),
      frenNotu(r),
      alp ? el('div', { class: 'small blue tab', style: 'margin-top:2px' }, alp) : null,
      yap ? el('div', { class: 'yap tab' }, yap) : null,
      (open || !r.tamam) && prev ? el('div', { class: 'prev' }, 'Geçen: ' + prev) : null,
      el('div', { class: 'meta' }, [r.dinlenme ? `dinlenme ${P.dinlenmeKisa(r.dinlenme)}` : null, r.plaka ? (r.plakaAlper ? 'Arda · ' : '') + r.plaka : null, r.plakaAlper ? 'Alper · ' + r.plakaAlper : null, r.tamam && r.arda.count > 1 ? `${r.arda.count} kayıt` : null].filter(Boolean).join(' · ')));
  }
  async fOnizleme(c, m) {
    const { v } = c; const tamamlandi = c.finished.has(`${v.week}|${v.day}`) || v.tamamlanan === v.rows.length;
    m.append(el('div', { style: 'display:flex;align-items:baseline;gap:10px;flex-wrap:wrap' }, el('div', { style: 'font-weight:500;font-size:19px;letter-spacing:-.02em' }, `Seans ${v.idx} / ${v.N}`), el('div', { class: 'small mute tab' }, `${v.rows.length} hareket · ${v.tamamlanan} kayıtlı`)));
    m.append(...[el('div', { class: 'sigrow' }, this.sinyalSatiri(c), this.stresRozet(c)), this.kolSatiri(c)].filter(Boolean));
    if (this.kilit[c.p]) m.append(el('div', { class: 'banner', style: 'display:flex;justify-content:space-between;align-items:center' }, `Seans kilidi: ${this.kilit[c.p]}`, el('button', { class: 'pill', onclick: async () => { delete this.kilit[c.p]; await S.setMeta('kilit', this.kilit); this.render(); } }, 'Kaldır')));
    if (v.isinmaBasamak) {
      m.append(el('div', { style: 'margin-top:14px', class: 'h' }, el('div', { class: 'k' }, `Isınma · ${M.topSet(v.rows).egzersiz}`), el('div', { class: 'xs dim2' }, `${v.isinmaBasamak.length + 1} basamak · top set ${fmt(v.topKg)} kg`)));
      m.append(el('div', { class: 'pills tab' }, v.isinmaBasamakAlper ? el('span', { class: 'plbl' }, 'Arda') : null, el('span', { class: 'p' }, 'boş bar'), ...v.isinmaBasamak.map(k => el('span', { class: 'p' }, fmt(k))), el('span', { class: 'p top' }, `${fmt(v.topKg)} kg`)));
      if (v.isinmaBasamakAlper) m.append(el('div', { class: 'pills tab alp' }, el('span', { class: 'plbl' }, 'Alper'), el('span', { class: 'p' }, 'boş bar'), ...v.isinmaBasamakAlper.map(k => el('span', { class: 'p' }, fmt(k))), el('span', { class: 'p top' }, `${fmt(v.topAlperKg)} kg`)));
    }
    m.append(el('div', { class: 'grid', style: 'margin-top:14px' }, ...v.rows.map(r => this.rowCard(c, r, { open: true }))));
    const son = c.sev.filter(e => e.kind === 'finished' && e.note).slice(-1)[0];
    if (son && son.week === v.week && son.day === v.day) m.append(el('div', { class: 'prev', style: 'margin-top:10px' }, 'Seans notu: ' + son.note));
    this.footer('foot', el('button', { class: 'pri', style: 'flex:1', onclick: async () => {
      if (!c.stres.has(v.week)) { this.sheet = { kind: 'stres', sonra: 'isinma' }; this.renderSheet(); return; }
      await this.fazSet(v.isinmaBasamak && !tamamlandi ? 'isinma' : 'log');
    } }, tamamlandi ? 'Seansı aç (düzelt)' : v.tamamlanan > 0 ? 'Seansa devam et' : 'Seansa başla'));
  }
  fIsinma(c, m) {
    const { v } = c; const tik = new Set(c.seans?.tik ?? []); const top = M.topSet(v.rows);
    const adim = [['boş bar', 0, 'teknik · 8-10 tekrar'], ...v.isinmaBasamak.map((k, i) => [fmt(k) + ' kg' + (v.isinmaBasamakAlper ? ` · Alper ${fmt(v.isinmaBasamakAlper[i])}` : ''), k, i === v.isinmaBasamak.length - 1 ? 'top set öncesi son basamak' : `rampa ${i + 1}`])];
    m.append(el('div', { class: 'small mute', style: 'line-height:1.45' }, `${top.egzersiz} için rampa — ${fmt(v.topKg)} kg${v.topAlperKg ? ` (Alper ${fmt(v.topAlperKg)} kg)` : ''} top sete kadar. Her basamağı bitirince dokun; sıra önemli değil.`));
    const list = el('div', { class: 'grid', style: 'margin-top:14px' }); m.append(list);
    const draw = () => list.replaceChildren(...adim.map(([et, kg, sub], i) => el('button', { class: 'isirow' + (tik.has(i) ? ' on' : ''), onclick: async () => { tik.has(i) ? tik.delete(i) : tik.add(i); await S.setMeta(c.seansKey, { ...c.seans, tik: [...tik] }); c.seans.tik = [...tik]; draw(); } },
      el('span', { class: 'tik' }, tik.has(i) ? '✓' : ''), el('span', { style: 'flex:1;min-width:0' }, el('span', { class: 'big tab' }, et), el('span', { class: 'sub' }, sub)), el('span', { class: 'xs dim2 tab' }, kg ? (P.plakaMetni(kg) ?? '') : ''))));
    draw();
    const gec = async () => { const ilk = v.rows.find(r => !r.tamam); if (ilk && tik.size) this.kronoBaslat(c.seansKey, P.oncesiDinlenmeSn(ilk), ilk.egzersiz); await this.fazSet('log', { isinma_bitti_at: tik.size ? new Date().toISOString() : null }); };
    this.footer('foot', el('button', { class: 'sec', style: 'flex:none;min-height:52px', onclick: () => this.fazSet('log') }, 'Atla'), el('button', { class: 'pri', style: 'flex:1', onclick: gec }, 'Hareketlere geç'));
  }
  // ── LOG (aktif seans) ─────────────────────────────────────────────
  async fLog(c, m) {
    const { v } = c;
    m.append(el('div', { class: 'dots' }, ...v.rows.map(r => el('i', { class: r.tamam ? (r.arda.skipped ? 'skip' : 'ok') : '' }))));
    const nowRow = v.rows.find(r => !r.tamam) ?? null;
    const openKey = c.seans?.openKey && v.rows.some(r => r.row_key === c.seans.openKey) ? c.seans.openKey : nowRow?.row_key ?? null;
    const openRow = v.rows.find(r => r.row_key === openKey) ?? null;
    if (v.kol) m.append(this.kolSatiri(c));
    m.append(el('div', { class: 'grid', style: 'margin-top:10px' }, ...v.rows.map(r => this.rowCard(c, r, { open: r === openRow, now: r === openRow, onclick: async () => { await S.setMeta(c.seansKey, { ...c.seans, openKey: r.row_key }); this.render(); } }))));
    const seansBar = this.seansBar(c);
    if (!openRow) { this.footer('log', seansBar, el('div', { class: 'acts', style: 'margin-top:8px' }, el('button', { class: 'pri', onclick: () => this.fazSet('ozet') }, 'Seansı bitir'))); return; }
    this.footer('log', seansBar, ...await this.logBar(c, openRow));
  }
  /** Seans şeridi (çubuğun tepesi): tutamaç · geçen süre · dinlenme rozeti · Bitir. */
  seansBar(c) {
    const sure = el('span', { class: 'chip tab', id: 'sure' }, this.sureMetni(c.seans.started_at)); this.tickSure();
    const grab = el('button', { class: 'grab', title: this.logCollapsed ? 'Aç' : 'Katla', onclick: () => { if (this.dragMoved) { this.dragMoved = false; return; } this.logCollapsed = !this.logCollapsed; this.applyCollapse(); } }, el('span', { class: 'gl' }), el('span', { class: 'gt' }, this.logCollapsed ? '▴  aç' : '▾  katla'));
    this.grabDrag(grab);
    return el('div', { class: 'sbar' }, grab, el('div', { class: 'srow' }, sure, this.kronoPill(), el('span', { style: 'flex:1' }), el('button', { class: 'pill acc', style: 'border-color:var(--acc-line)', onclick: () => this.fazSet('ozet') }, 'Bitir')));
  }
  /** Tutamaç parmağı izler: panel dirençle (rubber band) kayar, pill uzar; eşik (36 px) geçilirse katlanır/açılır, yoksa yaylanıp döner. */
  grabDrag(grab) {
    // iOS sheet deseni: eşik (28 px) geçilir geçilmez içerik anında değişir (tek aşama), panel parmağı izlemeye devam eder, bırakınca yayla oturur.
    let y0 = null, dy = 0, raf = 0, toggled = false; const gl = grab.querySelector('.gl'); const panel = () => this.foot;
    const move = e => { if (y0 === null) return; dy = e.clientY - y0; if (raf) return; raf = requestAnimationFrame(() => { raf = 0; if (y0 === null) return;
      const dir = this.logCollapsed ? -1 : 1; const d = dy * dir;
      if (!toggled && d > 28) { toggled = true; this.dragMoved = true; this.logCollapsed = !this.logCollapsed; this.applyCollapse(); y0 = e.clientY; dy = 0; panel().style.transform = ''; gl.style.transform = ''; return; }
      const eff = d > 0 ? 60 * (1 - Math.exp(-d / 60)) : -14 * (1 - Math.exp(d / 30));
      panel().style.transform = `translateY(${eff * dir}px)`; gl.style.transform = `scaleX(${1 + Math.min(Math.abs(d), 60) / 90})`; if (Math.abs(d) > 6) this.dragMoved = true; }); };
    const end = () => { if (y0 === null) return; y0 = null; const pn = panel(); pn.classList.remove('dragging'); grab.classList.remove('on'); gl.style.transform = ''; pn.style.transform = '';
      document.removeEventListener('pointermove', move); document.removeEventListener('pointerup', end); document.removeEventListener('pointercancel', end); };
    grab.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; toggled = false; this.dragMoved = false; panel().classList.add('dragging'); grab.classList.add('on'); document.addEventListener('pointermove', move); document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end); });
    grab.style.touchAction = 'none';
  }
  applyCollapse() {
    const f = this.foot; const c = this.logCollapsed;
    f.querySelector('.body')?.classList.toggle('hidden', c); f.querySelector('.hh')?.classList.toggle('hidden', c);
    f.querySelector('.oz')?.classList.toggle('hidden', !c); f.querySelector('.kmini')?.classList.toggle('hidden', !c); f.querySelector('.modeb')?.classList.toggle('hidden', c);
    const g = f.querySelector('.grab .gt'); if (g) g.textContent = c ? '▴  aç' : '▾  katla';
  }
  async logBar(c, r) {
    const { def, v, p } = c; const draftKey = `draft:${p}|${def.cycle}|${v.week}|${v.day}|${r.row_key}`;
    const d = (await S.getMeta(draftKey)) ?? { actor: 'arda', kg: null, sets: null, reps: null, rpe: null, note: null, mode: await S.getMeta('log_mode', 'satir'), detail: [] };
    d.mode ??= 'satir'; d.detail ??= [];
    const planKg = () => d.actor === 'alper' ? r.onerilen_alper : r.onerilen;
    const cur = () => d.actor === 'alper' ? r.alper : r.arda;
    const prevE = P.prevEntry(c.stateAll, r, v, def.cycle); const prevA = def.program === 'Alper' ? P.prevEntry(c.stateAll, r, v, def.cycle, 'alper') : null;
    const prevOf = () => d.actor === 'alper' ? prevA : prevE;
    const fill = () => { const q = cur(); d.kg = q?.kg ?? planKg() ?? prevOf()?.kg ?? null; d.sets = q?.sets ?? r.set ?? null; d.reps = q?.reps ?? r.tekrar ?? null; d.rpe = q?.rpe ?? null; d.note = q?.note ?? null; };
    if (d.kg === null && d.sets === null) fill();
    const saveDraft = () => S.setMeta(draftKey, d);
    const ozet = () => d.mode === 'set' ? (d.detail.length ? `${d.detail.length} set · ${P.detayMetni(d.detail.slice(-2))}` : 'set set · henüz set yok') : `${d.kg === null ? '—' : fmt(d.kg)}×${d.sets ?? '—'}×${d.reps ?? r.tekrar_metin ?? '—'}${d.rpe ? ` R${fmt(d.rpe)}` : ''}`;
    // başlık + katla/aç
    const ozetS = el('span', { class: 'oz tab' + (this.logCollapsed ? '' : ' hidden') });
    const kaydetMini = el('button', { class: 'pill sel kmini' + (this.logCollapsed ? '' : ' hidden'), onclick: () => commit() }, 'Kaydet');
    const modeBtn = el('button', { class: 'pill modeb' + (this.logCollapsed ? ' hidden' : ''), title: 'Giriş biçimi', onclick: async () => { d.mode = d.mode === 'set' ? 'satir' : 'set'; await S.setMeta('log_mode', d.mode); saveDraft(); paint(); } });
    const ttl = el('div', { class: 'ttl' }, el('div', { class: 'n' }, r.egzersiz + (r.modifier ? ` · ${r.modifier}` : '')), el('div', { class: 'hh tab' + (this.logCollapsed ? ' hidden' : '') }, r.hedef?.replace(/^.*\n/, '').replace(/\n.*$/s, '').replace(/\s*[▸⚠].*$/, '') ?? ''), modeBtn, ozetS, kaydetMini);
    const body = el('div', { class: 'body' + (this.logCollapsed ? ' hidden' : '') });
    // kişi
    let segBtns = [];
    if (p === 'Alper') body.append(el('div', { class: 'seg' }, ...(segBtns = ['arda', 'alper'].map(a => el('button', { class: d.actor === a ? 'sel' : '', onclick: () => { d.actor = a; fill(); saveDraft(); paint(); } }, a === 'arda' ? 'Arda' : 'Alper')))));
    // kg + plaka
    const kgIn = el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', enterkeyhint: 'done', placeholder: '—', class: 'tab' });
    const kgSub = el('div', { class: 'sub tab' });
    kgIn.addEventListener('change', () => { d.kg = M.parseKg(kgIn.value); saveDraft(); paint(); });
    kgIn.addEventListener('keydown', e => { if (e.key === 'Enter') kgIn.blur(); });
    const step = n => { d.kg = Math.max(0, Math.round(((d.kg ?? planKg() ?? 0) + n) * 100) / 100); saveDraft(); paint(); };
    const plakaBtn = r.barli ? el('button', { class: 'plk-ic', title: 'Plaka hesabı', onclick: () => { this.sheet = { kind: 'plaka', kg: d.kg ?? planKg() ?? prevE?.kg ?? 20, aktar: kg => { d.kg = kg; saveDraft(); paint(); } }; this.renderSheet(); } }, '▬') : null;
    body.append(el('div', { class: 'kgrow' }, hold(el('button', {}, '−'), k => step(-KG_ADIM * k)), el('div', { class: 'mid', onclick: e => { if (e.target !== kgIn) { kgIn.focus(); kgIn.select?.(); } } }, kgIn, kgSub), hold(el('button', { class: 'plus' }, '+'), k => step(KG_ADIM * k)), plakaBtn));
    // set / tekrar / rpe
    const setBtns = [1, 2, 3, 4, 5].map(n => el('button', { class: 'tab', onclick: () => { d.sets = n; saveDraft(); paint(); } }, n));
    const base = r.tekrar ?? 5; const reps = r.tekrar_metin ? [] : [base - 2, base - 1, base, base + 1, base + 2].filter(n => n >= 1);
    const repBtns = reps.map(n => el('button', { class: 'tab', onclick: () => { d.reps = n; saveDraft(); paint(); } }, n));
    const repIn = el('input', { type: 'text', inputmode: 'numeric', placeholder: r.tekrar_metin ?? '…', style: 'flex:none;width:54px;text-align:center', class: 'tab' });
    repIn.addEventListener('change', () => { d.reps = M.parseKg(repIn.value); saveDraft(); paint(); });
    const rpeBtns = RPE_LIST.map(n => el('button', { class: 'tab', onclick: () => { d.rpe = d.rpe === n ? null : n; saveDraft(); paint(); } }, fmt(n)));
    // set-set modu: kayıtlı setler listesi
    const fn = frenNotu(r); if (fn) body.append(fn);
    const setList = el('div', { class: 'sets hidden' });
    body.append(setList);
    const setFld = el('div', { class: 'fld' }, el('div', { class: 'lbl' }, 'Set'), el('div', { class: 'opts' }, ...setBtns)); body.append(setFld);
    body.append(el('div', { class: 'fld' }, el('div', { class: 'lbl' }, 'Tkr'), el('div', { class: 'opts' }, ...repBtns, repIn)));
    body.append(el('div', { class: 'fld' }, el('div', { class: 'lbl' }, 'RPE' + (r.hedef_rpe ? ` ${fmt(r.hedef_rpe)}` : '')), el('div', { class: 'opts rpe' }, ...rpeBtns)));
    // not (isteğe bağlı, düğmeyle açılır)
    const notIn = el('input', { type: 'text', value: d.note ?? '', placeholder: 'not — his, aksaklık, gelecek haftaya…', enterkeyhint: 'done', class: d.note ? '' : 'hidden', style: 'margin-top:7px;min-height:40px' });
    notIn.addEventListener('change', () => { d.note = notIn.value.trim() || null; saveDraft(); paint(); });
    body.append(notIn);
    // eylemler
    const hint = el('div', { class: 'xs warn hidden', style: 'margin-top:6px' });
    const kaydet = el('button', { class: 'pri', onclick: () => commit() });
    const skipBtn = el('button', { class: 'skip', onclick: () => commit({ skipped: true }) });
    const notBtn = el('button', { class: 'skip', title: 'Not', onclick: () => { notIn.classList.remove('hidden'); notIn.focus(); } }, '✎');
    const setKaydet = el('button', { class: 'pri setk hidden', onclick: () => setEkle() }, 'Set kaydet');
    body.append(el('div', { class: 'acts' }, skipBtn, notBtn, setKaydet, kaydet), hint);
    /** Set-set: bir seti taslağa ekle; öncesindeki gerçek mola = önceki set/kayıt/ısınmadan bu yana; sayaç = bu hareketin kendi kategorisi (setler arası). */
    const setEkle = async () => {
      if (d.kg === null || d.kg <= 0) { hint.textContent = d.kg === 0 ? '0 kg set kaydedilmez — kg gir.' : 'kg gir.'; hint.classList.remove('hidden'); return; }
      const now = Date.now();
      const last = d.detail.length ? new Date(d.detail[d.detail.length - 1].ts).getTime() : (c.seans?.last_save_at ? new Date(c.seans.last_save_at).getTime() : (c.seans?.isinma_bitti_at ? new Date(c.seans.isinma_bitti_at).getTime() : null));
      d.detail.push({ n: d.detail.length + 1, kg: d.kg, reps: d.reps, rpe: d.rpe, rest_s: last ? Math.round((now - last) / 1000) : null, rest_plan_s: P.oncesiDinlenmeSn(r), ts: new Date(now).toISOString() });
      d.rpe = null; hint.classList.add('hidden'); await saveDraft();
      this.kronoBaslat(c.seansKey, P.oncesiDinlenmeSn(r), `${r.egzersiz} · set ${d.detail.length + 1}`);
      this.geriBildirim();
      paint(); this.render();   // seans şeridindeki rozet yenilensin (çubuk yerinde kalır, taslak meta'dan gelir)
    };
    const paint = () => {
      kgIn.value = d.kg === null ? '' : fmt(d.kg);
      const pk = planKg(); kgSub.textContent = (r.bw ? 'toplam yük · BW + ek' : (pk !== null && pk !== undefined ? `plan ${fmt(pk)}` : prevOf() ? `geçen ${fmt(prevOf().kg)}` : 'plan yok')) + (prevOf() && pk !== null && pk !== undefined ? ` · geçen ${fmt(prevOf().kg)}` : '') + (r.barli && d.kg ? ` · ${P.plakaMetni(d.kg)?.replace('bir tarafa ', 'yan ') ?? ''}` : '') + ' · ✎ yaz';
      segBtns.forEach(b => b.classList.toggle('sel', b.textContent.toLowerCase() === d.actor));
      setBtns.forEach((b, i) => b.classList.toggle('sel', d.sets === i + 1));
      repBtns.forEach((b, i) => b.classList.toggle('sel', d.reps === reps[i]));
      repIn.value = d.reps !== null && !reps.includes(d.reps) ? String(d.reps) : ''; repIn.classList.toggle('sel', d.reps !== null && !reps.includes(d.reps));
      rpeBtns.forEach((b, i) => b.classList.toggle('sel', d.rpe === RPE_LIST[i]));
      notBtn.classList.toggle('sel', !!d.note);
      const setMode = d.mode === 'set';
      modeBtn.textContent = setMode ? 'Set set' : 'Tek satır'; modeBtn.classList.toggle('sel', setMode);
      setFld.classList.toggle('hidden', setMode); setList.classList.toggle('hidden', !setMode); setKaydet.classList.toggle('hidden', !setMode);
      setList.replaceChildren(...d.detail.map((x, i) => el('div', { class: 'srow-set' }, el('span', { class: 'sn' }, `${i + 1}`), el('span', { class: 'tab', style: 'flex:1' }, `${fmt(x.kg)} × ${x.reps ?? '?'}${M.isNum(x.rpe) ? `  R${fmt(x.rpe)}` : ''}`), el('span', { class: 'xs dim tab' }, M.isNum(x.rest_s) ? `mola ${mmss(x.rest_s)}` : ''), el('button', { class: 'x', title: 'Sil', onclick: async () => { d.detail.splice(i, 1); d.detail.forEach((y, j) => y.n = j + 1); await saveDraft(); paint(); } }, '×'))),
        setMode ? el('div', { class: 'xs dim2', style: 'margin:2px 0 4px' }, d.detail.length ? `sıradaki set ${d.detail.length + 1} · plan ${r.set ?? '?'} set` : `set ${1} · plan ${r.set ?? '?'} set · her setten sonra "Set kaydet"`) : null);
      const q = cur(); kaydet.textContent = setMode ? (d.detail.length ? `Hareketi bitir (${d.detail.length} set)` : 'Hareketi bitir') : (q && !q.skipped ? 'Güncelle' : 'Kaydet'); skipBtn.textContent = q?.skipped ? 'Geri al' : 'Atla';
      kaydet.disabled = setMode && !d.detail.length; kaydet.classList.toggle('bitir', setMode);
      if (setMode && !d.detail.length) kaydet.title = 'Önce en az bir set kaydet'; else kaydet.title = '';
      ozetS.textContent = ozet();
    };
    paint();
    const commit = async ({ skipped = false } = {}) => {
      const q = cur();
      if (skipped && q?.skipped) { await S.appendEvent(await this.deleteEvent(r.ref, d.actor)); await S.setMeta(draftKey, null); this.sync?.schedule(); return this.render(); }
      const setMode = d.mode === 'set' && d.detail.length > 0;
      if (!skipped && !setMode && (d.kg === null || d.kg <= 0)) { hint.textContent = d.kg === 0 ? '0 kg kaydedilmez — yapılmadıysa "Atla", yapıldıysa kg gir.' : 'kg gir (ya da Atla).'; hint.classList.remove('hidden'); this.logCollapsed = false; this.applyCollapse(); return; }
      // gerçek dinlenme: bu seansta önceki kayıttan bu yana geçen süre; plan: bir önceki kayıtta kurulan sayaç
      const now = Date.now(); const last = c.seans?.last_save_at ? new Date(c.seans.last_save_at).getTime() : (c.seans?.isinma_bitti_at ? new Date(c.seans.isinma_bitti_at).getTime() : null);
      const rest_s = setMode ? (d.detail[0].rest_s ?? null) : (last ? Math.round((now - last) / 1000) : null); const rest_plan_s = P.oncesiDinlenmeSn(r);   // bu hareketin ÖNCESİ (set-set: ilk setin molası)
      const data = setMode ? { kg: null, sets: null, reps: null, reps_text: null, rpe: null, note: d.note, sets_detail: d.detail.map(x => ({ n: x.n, kg: x.kg, reps: x.reps, rpe: x.rpe, rest_s: x.rest_s, rest_plan_s: x.rest_plan_s, ts: x.ts })) }
        : { kg: d.kg, sets: d.sets, reps: d.reps, reps_text: r.tekrar_metin && d.reps === null ? r.tekrar_metin : null, rpe: d.rpe, note: d.note };
      try { await S.logSet({ ref: r.ref, actor: d.actor, ...data, skipped, supersedes: q?.event_id ?? null, rest_s: skipped ? null : rest_s, rest_plan_s: skipped ? null : rest_plan_s }); }
      catch (e) { hint.textContent = 'Kaydedilemedi: ' + e.message; hint.classList.remove('hidden'); this.logCollapsed = false; this.applyCollapse(); return; }
      await S.setMeta(draftKey, null); this.sync?.schedule(); this.geriBildirim();
      const rowsAfter = v.rows.map(x => x === r ? { ...x, tamam: true } : x); const nxt = P.sonrakiSatir(rowsAfter, rowsAfter[v.rows.indexOf(r)]);
      if (!skipped && nxt) this.kronoBaslat(c.seansKey, P.oncesiDinlenmeSn(nxt), nxt.egzersiz); else if (!skipped) { this.krono = null; clearInterval(this.kronoIv); }
      await S.setMeta(c.seansKey, { ...c.seans, openKey: null, last_save_at: skipped ? c.seans?.last_save_at ?? null : new Date(now).toISOString() });
      this.render();
    };
    return [ttl, body];
  }
  async deleteEvent(ref, actor) {
    return { id: S.ulid(), ts: new Date().toISOString(), ts_kind: 'device', device: await S.deviceId(), entered_by: 'arda', type: 'set.deleted', ref, schema_v: 1, source: { kind: 'app' }, data: { actor } };
  }
  /** Geri bildirim: iOS'ta vibrate yok → kısa görsel flaş + (izin varsa) kısa bip. */
  geriBildirim(kind = 'ok') {
    try { navigator.vibrate?.(kind === 'ok' ? 12 : [80, 60, 80]); } catch {}
    const f = el('div', { class: 'flash ' + kind }); document.body.append(f); setTimeout(() => f.remove(), 420);
    // Arda 23 Eyl: sayaç bitiminde yalnız görsel flaş (bip yok)
  }
  bip() {
    try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; this.ac ??= new AC(); const o = this.ac.createOscillator(), g = this.ac.createGain(); o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(this.ac.destination); o.start(); o.stop(this.ac.currentTime + 0.18); const o2 = this.ac.createOscillator(); o2.frequency.value = 1175; o2.connect(g); o2.start(this.ac.currentTime + 0.22); o2.stop(this.ac.currentTime + 0.4); } catch {}
  }
  /** iOS 16.4+: seans sırasında ekran uyumasın (dinlenme sayacı görünür kalsın). */
  async wakeLock(on) {
    try { if (on && !this.wl && navigator.wakeLock) { this.wl = await navigator.wakeLock.request('screen'); this.wl.addEventListener('release', () => { this.wl = null; }); } else if (!on && this.wl) { await this.wl.release(); this.wl = null; } } catch {}
  }
  kronoBaslat(key, sn, ad) { clearInterval(this.kronoIv); this.krono = { key, end: Date.now() + sn * 1000, sn, ad, start: Date.now() }; this.kronoIv = setInterval(() => this.kronoTick(), 500); }
  kronoKalan() { const k = this.krono; return k ? Math.round((k.end - Date.now()) / 1000) : 0; }   // negatif = aşım
  kronoMetin(kalan) { return kalan >= 0 ? mmss(kalan) : '+' + mmss(-kalan); }
  kronoTick() {
    const k = this.krono; if (!k) return clearInterval(this.kronoIv);
    const kalan = this.kronoKalan();
    const pct = kalan >= 0 ? Math.round((1 - kalan / k.sn) * 100) : Math.min(100, Math.round((-kalan / k.sn) * 100));
    const pill = this.foot.querySelector('#kpill') ?? this.hR.querySelector('#kpill'); if (pill) { pill.querySelector('.kt').textContent = this.kronoMetin(kalan); pill.classList.toggle('over', kalan < 0); pill.querySelector('.ring').style.setProperty('--pct', `${pct}%`); }
    const big = this.main.querySelector('#krobig'); if (big) { big.textContent = this.kronoMetin(kalan); big.className = 'big tab ' + (kalan >= 0 ? 'on' : 'over'); }
    if (kalan === 0 && !k.bitti) { k.bitti = true; this.geriBildirim('alarm'); if (pill) { pill.classList.add('done'); setTimeout(() => { pill.classList.remove('done'); if (this.kronoBig) { this.kronoBig = false; pill.classList.remove('big'); } }, 1400); } }   // sayaç durmaz: aşım kırmızı sayar; büyükse nabız sonrası küçülür
  }
  /** Başlıktaki dinlenme rozeti: bağımsız, dokununca gizlenir (Geç). */
  kronoPill() {
    const k = this.krono; if (!k) return null; const kalan = this.kronoKalan();
    // Dynamic Island deseni: pil dokununca yaylanarak büyür (büyük sayaç + hareket adı + Geç), tekrar dokununca küçülür; süre bitince nabız verir ve kendiliğinden küçülür.
    const pill = el('button', { id: 'kpill', class: 'kpill' + (kalan < 0 ? ' over' : '') + (this.kronoBig ? ' big' : ''), title: this.kronoBig ? 'Küçült' : 'Büyüt',
        onclick: () => { this.kronoBig = !this.kronoBig; pill.classList.toggle('big', this.kronoBig); pill.title = this.kronoBig ? 'Küçült' : 'Büyüt'; pill.querySelector('.kx').textContent = this.kronoBig ? 'Geç' : '×'; } },
      el('span', { class: 'ring', style: `--pct:${kalan >= 0 ? Math.round((1 - kalan / k.sn) * 100) : 100}%` }),
      el('span', { class: 'kbody' }, el('span', { class: 'kt tab' }, this.kronoMetin(kalan)), el('span', { class: 'kad' }, `${k.ad ?? 'dinlenme'} · plan ${this.kronoMetin(k.sn)}`)),
      el('span', { class: 'kx', title: 'Dinlenmeyi geç', onclick: e => { e.stopPropagation(); this.krono = null; this.kronoBig = false; clearInterval(this.kronoIv); this.render(); } }, this.kronoBig ? 'Geç' : '×'));
    return pill;
  }
  /** Dinlenme uyumu: rest_s/rest_plan_s olan girişler → {n, ort_oran, uyumlu, erken, gec} (±15% bant). */
  dinlenmeStat(entries) {
    const flat = entries.flatMap(s => s?.sets_detail?.length ? s.sets_detail : [s]);
    const xs = flat.filter(s => s && M.isNum(s.rest_s) && M.isNum(s.rest_plan_s) && s.rest_plan_s > 0);
    if (!xs.length) return null;
    const oran = xs.map(s => s.rest_s / s.rest_plan_s);
    const ort = oran.reduce((a, b) => a + b, 0) / oran.length;
    return { n: xs.length, ort, uyumlu: oran.filter(o => o >= 0.85 && o <= 1.15).length, erken: oran.filter(o => o < 0.85).length, gec: oran.filter(o => o > 1.15).length };
  }
  // ── ÖZET ─────────────────────────────────────────────────────────
  async fOzet(c, m) {
    const { v } = c; const done = v.rows.filter(r => r.tamam && !r.arda.skipped);
    const hacim = done.reduce((a, r) => a + ((r.arda.sets_detail?.length ? M.gercekHacimDetay(r.arda.sets_detail) : M.gercekHacim(r.arda.kg, r.arda.sets, r.arda.reps)) ?? 0), 0);
    const rpes = done.map(r => r.arda.rpe).filter(M.isNum); const ort = rpes.length ? Math.round(rpes.reduce((a, b) => a + b, 0) / rpes.length * 10) / 10 : null;
    const sure = c.seans?.started_at ? this.sureMetni(c.seans.started_at) : '—';
    m.append(el('div', { class: 'grid g3' }, ...[['Süre', sure, 'başlangıçtan'], ['Hacim', `${fmt(Math.round(hacim))}`, 'kg · tüm hareketler'], ['Ort. RPE', ort === null ? '—' : fmt(ort), `${done.length}/${v.rows.length} hareket`]].map(([k, val, sub]) => el('div', { class: 'card' }, el('div', { class: 'k2' }, k), el('div', { class: 'tab', style: 'margin-top:4px;font-weight:500;font-size:21px;letter-spacing:-.02em' }, val), el('div', { class: 'xs dim2' }, sub)))));
    const w = c.wk.find(x => x.week === v.week);
    m.append(el('div', { class: 'card', style: 'margin-top:12px' }, el('div', { class: 'k2' }, 'Haftalık sinyal'), el('div', { style: 'display:flex;align-items:center;gap:9px;margin-top:7px' }, el('span', { class: 'dot ' + sinyalRenk(w?.sinyal) }), el('span', { style: 'font-weight:500;font-size:16px' }, w?.sinyal ?? '—')), el('div', { class: 'small mute', style: 'margin-top:5px;line-height:1.45' }, w ? `Uyum ${w.uyum} · gerçek ${fmt(w.gercek)} / beklenen ${fmt(w.min)}–${fmt(w.max)} kg · ${w.doluGun} gün dolu` : '')));
    m.append(el('div', { class: 'k', style: 'margin-top:12px' }, 'Seans notu'));
    const ta = el('textarea', { placeholder: 'his, aksaklık, gelecek haftaya not…', style: 'margin-top:7px' }); ta.value = this.ozet?.note ?? ''; ta.addEventListener('input', () => { this.ozet = { note: ta.value }; }); m.append(ta);
    const restTxt = a => M.isNum(a?.rest_s) ? `mola ${mmss(a.rest_s)}${M.isNum(a.rest_plan_s) ? ` / plan ${mmss(a.rest_plan_s)}` : ''}` : null;
    const restCls = a => !M.isNum(a?.rest_s) || !M.isNum(a?.rest_plan_s) ? 'dim2' : a.rest_s / a.rest_plan_s > 1.15 ? 'red' : a.rest_s / a.rest_plan_s < 0.85 ? 'blue' : 'ok';
    m.append(el('div', { class: 'grid', style: 'margin-top:12px' }, ...v.rows.map(r => el('div', { class: 'card', style: 'padding:9px 11px' },
      el('div', { style: 'display:flex;justify-content:space-between;gap:10px' }, el('span', { style: 'font-size:14px;font-weight:500' }, r.egzersiz + (r.modifier ? ` · ${r.modifier}` : '')), el('span', { class: 'tab ' + (r.tamam ? (r.arda.skipped ? 'dim' : 'ok') : 'warn'), style: 'white-space:nowrap;font-size:14px' }, r.tamam ? (r.arda.skipped ? 'atlandı' : r.arda.sets_detail?.length ? P.detayMetni(r.arda.sets_detail) : `${fmt(r.arda.kg)}×${fmt(r.arda.sets)}×${r.arda.reps ?? r.arda.reps_text ?? ''}${r.arda.rpe ? ` R${fmt(r.arda.rpe)}` : ''}`) : 'girilmedi')),
      r.arda?.sets_detail?.length > 1 ? el('div', { class: 'xs dim tab', style: 'margin-top:3px' }, 'set molaları ' + r.arda.sets_detail.map(x => M.isNum(x.rest_s) ? mmss(x.rest_s) : '—').join(' · ') + ` / plan ${mmss(r.arda.sets_detail[0].rest_plan_s ?? 0)}`) : null,
      restTxt(r.arda) ? el('div', { class: 'xs tab ' + restCls(r.arda), style: 'margin-top:3px' }, 'öncesi ' + restTxt(r.arda)) : (M.isNum(r.arda?.rest_plan_s) ? el('div', { class: 'xs dim2 tab', style: 'margin-top:3px' }, `öncesi plan ${mmss(r.arda.rest_plan_s)} · gerçek ölçülmedi`) : null)))));
    const ds = this.dinlenmeStat(v.rows.map(r => r.arda).filter(Boolean));
    if (ds) m.append(el('div', { class: 'xs dim', style: 'margin-top:8px;line-height:1.45' }, `Dinlenme: ${ds.n} arada ort. plan×${ds.ort.toFixed(2)} · ${ds.uyumlu} uyumlu · ${ds.erken} erken · ${ds.gec} uzun (bant ±%15)`));
    this.footer('foot', el('button', { class: 'sec', style: 'flex:none;min-height:52px', onclick: () => this.fazSet('log') }, 'Geri'), el('button', { class: 'pri', style: 'flex:1', onclick: async () => {
      const dur = c.seans?.started_at ? Math.round((Date.now() - new Date(c.seans.started_at)) / 1000) : null;
      await S.logSession('finished', { program: c.p, cycle: c.def.cycle, week: v.week, day: v.day, duration_s: dur, note: (this.ozet?.note ?? '').trim() || null });
      await S.setMeta(c.seansKey, null); this.ozet = null; this.krono = null; this.sync?.schedule(); this.main.scrollTop = 0;
      if (this.needRefresh) { setTimeout(() => this.needRefresh(), 400); }
      this.render();
    } }, 'Kaydet ve kapat'));
  }
  // ── PROGRAM (hafta × gün ızgarası) ───────────────────────────────
  async rProgram(c) {
    const { def, p, state } = c; this.head(`${def.cycle} · ${[...new Set(def.rows.map(r => r.week))].length} hafta`, 'Program');
    const ss = P.sessions(def, c.ov); const gunler = [...new Set(ss.map(s => s.day))]; const weeks = [...new Set(ss.map(s => s.week))];
    const sel = this.progSel[p] ?? c.idx;
    const m = el('div', { class: 'pop' }); this.main.append(m);
    const top = ss.reduce((a, s) => a + s.rows.filter(r => r.tamam).length, 0);
    m.append(el('div', { class: 'small mute', style: 'line-height:1.45' }, `${weeks.length} hafta · ${ss.length} seans · aktif seans ${c.idx}. Bir güne dokun: içerik altta açılır.`));
    const grid = el('div', { class: 'pgrid', style: `--n:${gunler.length}` });
    grid.append(el('div', { class: 'hd' }, el('div'), ...gunler.map(g => el('div', {}, P.GUN_AD[g].slice(0, 3)))));
    for (const w of weeks) {
      const wk = c.wk.find(x => x.week === w);
      const row = el('div', { class: 'wk' }, el('div', { class: 'wl' }, el('b', {}, `H${w}`), el('span', { class: 'dot ' + sinyalRenk(wk?.sinyal) })));
      for (const g of gunler) {
        const s = ss.find(x => x.week === w && x.day === g);
        if (!s) { row.append(el('div')); continue; }
        const dolu = P.isDolu(s, state), tam = P.isTamam(s, state); const main = M.topSet(s.rows).egzersiz ? s.rows.find(r => r.egzersiz === M.topSet(s.rows).egzersiz) : s.rows[0];
        const n = s.rows.filter(r => state.some(x => x.week === s.week && x.day === s.day && x.row_key === r.row_key && x.actor === 'arda' && !x.deleted && M.isNum(x.kg))).length;
        row.append(el('button', { class: 'cell' + (tam ? ' done' : dolu ? ' part' : '') + (s.idx === c.idx ? ' now' : '') + (s.idx === sel ? ' sel' : ''), onclick: () => { this.progSel[p] = s.idx; this.render(); } },
          el('div', { class: 'd' }, `S${s.idx}`), el('div', { class: 'm' }, main?.egzersiz ?? ''), el('div', { class: 'kg tab' }, main?.onerilen ? `${fmt(main.onerilen)} kg` : ''), el('div', { class: 'st' }, tam ? '✓ tamam' : dolu ? `${n}/${s.rows.length}` : s.idx === c.idx ? 'sırada' : '')));
      }
      grid.append(row);
    }
    m.append(grid);
    const s = ss.find(x => x.idx === sel);
    if (s) {
      const v = P.sessionView(def, state, s.idx, c.ov); const sub = { ...c, v };
      const fin = c.sev.filter(e => e.kind === 'finished' && e.week === s.week && e.day === s.day).slice(-1)[0];
      m.append(el('div', { class: 'h', style: 'margin-top:16px' }, el('div', { class: 'k' }, `Seans ${s.idx} · Hafta ${s.week} ${P.GUN_AD[s.day]}`), el('div', { class: 'xs dim2 tab' }, `${v.tamamlanan}/${v.rows.length}`)));
      m.append(el('div', { class: 'grid', style: 'margin-top:8px' }, ...v.rows.map(r => this.rowCard(sub, r, { open: true }))));
      if (fin?.note) m.append(el('div', { class: 'prev', style: 'margin-top:8px' }, 'Seans notu: ' + fin.note));
      m.append(el('div', { class: 'btnrow' }, s.idx !== c.idx ? el('button', { onclick: async () => { this.kilit[p] = s.idx; await S.setMeta('kilit', this.kilit); this.tab = 'bugun'; this.render(); } }, `Bu seansı Bugün'de aç`) : el('button', { disabled: true }, 'Aktif seans'), this.kilit[p] ? el('button', { class: 'sec', onclick: async () => { delete this.kilit[p]; await S.setMeta('kilit', this.kilit); this.render(); } }, 'Kilidi kaldır') : null));
      const appN = v.rows.filter(r => r.tamam).length;
      if (appN) m.append(el('button', { class: 'sec', style: 'width:100%;margin-top:8px;color:var(--red);border-color:#6a3030', onclick: async () => {
        if (!confirm(`Seans ${s.idx} (H${s.week} ${P.GUN_AD[s.day]}) app kayıtları silinsin mi? Göç/Excel verisi silinmez; takvim bu güne geri çekilir. Silme olay olarak yazılır (geri alınabilir değil).`)) return;
        const n = await S.resetSession(p, def.cycle, s.week, s.day); this.krono = null; this.sync?.schedule(); this.msg = `Seans ${s.idx}: ${n} app kaydı silindi, seans yeniden açıldı.`; this.tab = 'bugun'; delete this.kilit[p]; await S.setMeta('kilit', this.kilit); this.render();
      } }, 'Bu seansın app kayıtlarını sıfırla'));
    }
  }
  // ── İLERLEME ─────────────────────────────────────────────────────
  async rIlerleme(c) {
    const { def, p, wk, stateAll } = c; this.head(def.cycle, 'İlerleme'); const cfg = M.CONFIG[p];
    const m = el('div', { class: 'pop' }); this.main.append(m);
    // Tahmini 1RM (K20): ana kaldırışlar için son tekli (RPE'li) + son üçlü
    const lifts = cfg.weeklyFilter ?? [def.program === 'Deadlift' ? 'Deadlift' : null].filter(Boolean);
    m.append(el('div', { class: 'h' }, el('div', { class: 'k' }, 'Tahmini 1RM · RTS'), el('div', { class: 'xs dim2' }, 'son tekli @RPE + son üçlü')));
    const g = el('div', { class: 'grid', style: 'margin-top:8px' }); m.append(g);
    for (const L of lifts) {
      const rowsL = def.rows.filter(r => r.egzersiz === L);
      const ent = stateAll.filter(s => s.actor === 'arda' && !s.deleted && M.isNum(s.kg) && s.kg > 0 && rowsL.some(r => r.row_key === s.row_key)).sort((a, b) => a.ts < b.ts ? 1 : -1);
      const tek = ent.find(s => s.reps === 1 && M.isNum(s.rpe)), uc = ent.find(s => s.reps === 3);
      const est = M.tahmini1RM({ testTipi: 'Tahmin', tekliKg: tek?.kg ?? null, tekliRpe: tek?.rpe ?? null, ucluKg: uc?.kg ?? null, clamp: cfg.rpeClamp });
      const setup = def.config ?? {}; const resmi = { Deadlift: setup.deadlift_1rm_kg, Squat: setup.squat_1rm_kg, 'Front Squat': setup.front_squat_1rm_kg, 'Bench Press': setup.bench_1rm_arda_kg ?? setup.bench_1rm_cuma_ek_kg }[L];
      g.append(el('div', { class: 'card' }, el('div', { class: 'h' }, el('span', { class: 'ex' }, L), el('span', { class: 'tab acc', style: 'font-weight:500;font-size:19px;letter-spacing:-.02em' }, est ? `${fmt(Math.round(est * 2) / 2)} kg` : '—')),
        el('div', { class: 'xs dim tab', style: 'margin-top:2px' }, [tek ? `${fmt(tek.kg)}×1 @RPE${fmt(tek.rpe)}` : 'tekli yok', uc ? `${fmt(uc.kg)}×3` : null, resmi ? `program 1RM ${fmt(resmi)} kg` : null].filter(Boolean).join(' · '))));
    }
    // Hacim çubukları
    const mx = Math.max(1, ...wk.map(w => Math.max(w.gercek, w.max)));
    m.append(el('div', { class: 'h', style: 'margin-top:16px' }, el('div', { class: 'k' }, `Haftalık hacim · ${lifts.join(' + ') || 'tüm %1RM satırları'}`), el('div', { class: 'xs dim2' }, 'çizgi = beklenen min')));
    m.append(el('div', { class: 'bars' }, ...wk.map(w => { const h = Math.max(2, Math.round(w.gercek / mx * 100)); const line = Math.round((1 - w.min / mx) * 100);
      return el('div', { class: 'b' }, el('div', { class: 'l tab ' + sinyalRenk(w.sinyal) }, w.uyum.split(' ')[0]), el('div', { class: 'col ' + (w.gercek === 0 ? '' : w.gercek < w.min * 0.85 ? 'lo' : 'ok'), style: `height:${h}%` }, el('i', { style: `top:${Math.max(0, Math.min(100, Math.round((1 - (w.min / mx) / (w.gercek / mx || 1)) * 100)))}%;display:${w.gercek ? 'block' : 'none'}` })), el('div', { class: 'l tab' }, w.gercek ? fmt(Math.round(w.gercek)) : '·'), el('div', { class: 'l', style: 'font-size:9.5px' }, `H${w.week}`)); })));
    m.append(el('div', { class: 'k', style: 'margin-top:18px' }, 'Sinyal şeridi'));
    m.append(el('div', { class: 'serit' }, ...wk.map(w => el('i', { class: sinyalRenk(w.sinyal) === 'dim' ? '' : sinyalRenk(w.sinyal), title: `H${w.week} ${w.sinyal}` }))));
    m.append(el('div', { class: 'xs dim2', style: 'margin-top:6px;line-height:1.4' }, wk.map(w => `H${w.week} ${w.sinyal}`).join(' · ')));
    const ds = this.dinlenmeStat(stateAll.filter(s => s.actor === 'arda' && !s.deleted));
    m.append(el('div', { class: 'card', style: 'margin-top:18px' }, el('div', { class: 'k2' }, 'Dinlenme uyumu (app kayıtları)'),
      ds ? el('div', { class: 'grid', style: 'gap:6px;margin-top:9px' },
        el('div', { class: 'kv' }, el('span', {}, 'Ortalama gerçek / plan'), el('span', { class: 'tab ' + (ds.ort > 1.15 ? 'red' : ds.ort < 0.85 ? 'blue' : 'ok') }, `×${ds.ort.toFixed(2)}`)),
        el('div', { class: 'kv' }, el('span', {}, 'Uyumlu (±%15)'), el('span', { class: 'tab' }, `${ds.uyumlu}/${ds.n}`)),
        el('div', { class: 'kv' }, el('span', {}, 'Erken devam'), el('span', { class: 'tab blue' }, ds.erken)),
        el('div', { class: 'kv' }, el('span', {}, 'Uzun dinlenme'), el('span', { class: 'tab red' }, ds.gec)))
      : el('div', { class: 'xs dim2', style: 'margin-top:6px' }, 'Henüz app\'ten kaydedilmiş ardışık set yok; ilk seanstan sonra dolar.')));
    if (def.cycle_ozet?.length) {
      m.append(el('div', { class: 'card', style: 'margin-top:18px' }, el('div', { class: 'k2' }, 'Cycle geçmişi (Excel)'), el('div', { class: 'grid', style: 'gap:6px;margin-top:9px' },
        ...def.cycle_ozet.filter(o => typeof o.Hafta === 'number').map(o => el('div', { class: 'kv' }, el('span', {}, `C${o.Cycle} H${o.Hafta}`), el('span', { class: 'tab' }, `${fmt(Math.round(o['Gerçek Hacim (kg)'] ?? 0))} / ${fmt(Math.round(o['Beklenen Hacim (kg)'] ?? 0))} kg · ${Math.round((o['Uyum %'] ?? 0) * 100)}%`))))));
    }
    m.append(el('div', { class: 'xs dim2', style: 'margin-top:12px;line-height:1.5' }, 'Hacim = kg × set × tekrar, yalnız %1RM\'li satırlar (Excel Weekly Summary ile birebir; Python oracle ile doğrulanıyor). 1RM tahmini RTS tablosu (K18/K20).'));
  }
  // ── ALETLER ──────────────────────────────────────────────────────
  async rAletler() {
    this.head('Aletler', 'Plaka · Dinlenme');
    const m = el('div', { class: 'pop' }); this.main.append(m);
    m.append(el('div', { class: 'k' }, 'Plaka hesabı'), this.plakaBlok(this.plakaKg, kg => { this.plakaKg = kg; S.setMeta('plaka_kg', kg); }));
    m.append(el('div', { class: 'k', style: 'margin-top:20px' }, 'Dinlenme'));
    const k = this.krono; const kalan = this.kronoKalan();
    const box = el('div', { class: 'krobox' }, el('div', { id: 'krobig', class: 'big tab ' + (k ? (kalan >= 0 ? 'on' : 'over') : '') }, k ? this.kronoMetin(kalan) : '—'), el('div', { class: 'xs dim', style: 'margin-top:2px' }, k ? `${k.ad ?? 'elle'} · ${Math.round(k.sn / 60 * 10) / 10} dk${kalan < 0 ? ' · aşım' : ''}` : 'süre seç'),
      el('div', { class: 'krobtns' }, ...[30, 60, 90, 120, 180, 300, 480].map(sn => el('button', { class: k?.sn === sn ? 'sel' : '', onclick: () => { this.kronoBaslat('aletler', sn, 'elle'); this.render(); } }, sn < 120 ? `${sn} sn` : `${sn / 60} dk`))),
      k ? el('button', { class: 'sec', style: 'margin-top:8px;width:100%', onclick: () => { this.krono = null; clearInterval(this.kronoIv); this.render(); } }, 'Durdur') : null);
    m.append(box);
  }
  plakaBlok(kg0, onChange, aktar = null) {
    let kg = kg0; const big = el('input', { type: 'text', inputmode: 'decimal', class: 'big tab', autocomplete: 'off', enterkeyhint: 'done' }); const plates = el('div', { class: 'plates' }); const not = el('div', { class: 'xs dim2', style: 'margin-top:6px' });
    big.addEventListener('change', () => { const v = M.parseKg(big.value); if (v !== null) set(v); else paint(); }); big.addEventListener('keydown', e => { if (e.key === 'Enter') big.blur(); });
    const paint = () => { big.value = fmt(kg); const t = P.plakaMetni(kg); plates.replaceChildren(); not.textContent = '';
      if (!t) { not.textContent = 'kg gir'; return; }
      if (t.startsWith('sadece') || t.startsWith('bar altı')) { plates.append(el('span', { class: 'p' }, t)); return; }
      const [, yan, rest] = /bir tarafa ([\d.]+): (.*)$/.exec(t) ?? []; const parts = (rest ?? '').replace(/\s*\(.*\)$/, '').split(' + ');
      plates.append(el('span', { class: 'p n' }, `tek taraf ${yan}`), ...parts.map(x => el('span', { class: 'p' }, x))); const ek = /\((.*)\)/.exec(t); not.textContent = ek ? `Tek tarafta ${ek[1].replace('−', '')} açık kalıyor (plaka seti 25/20/15/10/5/2.5/1.25).` : 'Bar 20 kg dahil.'; };
    const set = v => { kg = Math.max(0, Math.round(v * 100) / 100); onChange?.(kg); paint(); };
    paint();
    return el('div', {}, el('div', { class: 'plk' }, hold(el('button', {}, '−'), k => set(kg - KG_ADIM * k)), el('div', { class: 'mid' }, big, el('div', { class: 'sub' }, 'bar 20 kg · çift taraf · ✎ sayıya dokun-yaz')), hold(el('button', { class: 'plus' }, '+'), k => set(kg + KG_ADIM * k))), plates, not,
      aktar ? el('div', { class: 'btnrow', style: 'margin-top:14px' }, el('button', { class: 'sec', onclick: () => { this.sheet = null; this.renderSheet(); } }, 'Kapat'), el('button', { class: 'pri', style: 'min-height:48px;font-size:14px', onclick: () => { aktar(kg); this.sheet = null; this.renderSheet(); } }, `${fmt(kg)} kg'yi aktar`)) : null);
  }
  // ── AYARLAR ──────────────────────────────────────────────────────
  async rAyarlar() {
    this.head('Spor · ' + this.version, 'Ayarlar');
    const pend = (await S.pendingEvents()).length; const total = await S.db.events.count(); const last = await S.getMeta('last_sync_at');
    const st = this.remote ? await this.remote.status() : { mode: 'yok' };
    const m = el('div', { class: 'pop' }); this.main.append(m);
    if (this.msg) { m.append(el('div', { class: 'banner ok', style: 'margin:0 0 12px' }, this.msg)); this.msg = null; }
    if (this.needRefresh) m.append(el('div', { class: 'banner', style: 'margin:0 0 12px;display:flex;justify-content:space-between;align-items:center' }, 'Yeni sürüm hazır.', el('button', { class: 'pill sel', onclick: () => this.needRefresh() }, 'Yenile')));
    const it = (a, s, v, cls = '') => el('div', { class: 'it' }, el('span', { style: 'min-width:0' }, el('span', { class: 'a' }, a), s ? el('span', { class: 's' }, s) : null), el('span', { class: 'v tab ' + cls }, v));
    m.append(el('div', { class: 'k', style: 'margin-bottom:8px' }, 'Veri güvenliği'));
    m.append(el('div', { class: 'list' },
      it('Toplam olay', 'cihazdaki salt-ekleme günlüğü', total),
      it('Cihazda bekleyen', 'henüz OneDrive\'a yazılmadı', pend, pend ? 'warn' : ''),
      it('Son başarılı senkron', null, last ? new Date(last).toLocaleString('tr-TR') : '—'),
      it('Kalıcı depolama', 'iOS: ana ekrandan açınca verilir', this.persist === true ? 'verildi' : this.persist === false ? 'REDDEDİLDİ' : 'bilinmiyor', this.persist === false ? 'warn' : 'ok'),
      it('OneDrive', 'cihaz dışı kopya', ({ yok: 'ayarlı değil', giris_gerekli: 'giriş gerekli', yeniden_giris: 'yeniden giriş', hazir: 'hazır · ' + (st.account ?? ''), hata: 'hata' })[st.mode] ?? st.mode)));
    m.append(el('div', { class: 'btnrow' },
      this.remote?.configured ? el('button', { onclick: () => st.mode === 'hazir' ? this.sync.run() : this.remote.login() }, st.mode === 'hazir' ? 'Şimdi senkronla' : 'OneDrive girişi') : null,
      el('button', { onclick: () => this.export() }, 'Dışa aktar'), el('button', { onclick: () => this.main.querySelector('#imp').click() }, 'Yedekten yükle')));
    m.append(el('input', { type: 'file', id: 'imp', accept: '.ndjson,.txt,.json', class: 'hidden', onchange: e => this.import(e.target.files[0]) }));
    // Cutover (C1): göçü yenile — önce zorunlu dışa aktarım, sonra dosya seç; eski göç olayları silinmez, düşürülür
    m.append(el('div', { class: 'k', style: 'margin:14px 0 6px' }, 'Cutover'), el('div', { class: 'btnrow' }, el('button', { onclick: () => this.main.querySelector('#gocimp').click() }, 'Göçü yenile (Excel → app)')),   // iOS: dosya seçici kullanıcı jestiyle senkron açılmalı (kırmızı takım #6)
      el('input', { type: 'file', id: 'gocimp', accept: '.ndjson,.txt', class: 'hidden', onchange: async e => { const f = e.target.files[0]; if (!f) return; const txt = await f.text();
        await this.export();                                          // önce zorunlu yedek (indirme), sonra yenileme
        const r = await S.replaceMigration(txt);
        this.msg = r.hata ? r.hata : `Göç yenilendi: ${r.dusurulen} eski göç olayı düşürüldü · ${r.written} yeni · ${r.skipped} zaten vardı · ${r.bad} bozuk (yedek indirildi)`; this.sync?.schedule(); this.render(); } }),
      el('div', { class: 'xs dim2', style: 'margin-top:6px;line-height:1.5' }, 'Excel\'den yeniden çıkarılan göç dosyası yüklenir; eski göç olayları silinmez, "düşürüldü" olarak işaretlenir ve hesaba girmez. App\'ten girdiğin kayıtlara dokunulmaz.'));
    if (this.sync?.last?.err) m.append(el('div', { class: 'banner err' }, 'Son senkron hatası: ' + this.sync.last.err));
    // deneme sıfırlama (cycle, app kaynaklı)
    m.append(el('div', { class: 'k', style: 'margin:18px 0 8px' }, 'Deneme kayıtları'));
    const sifirla = el('div', { class: 'list' });
    for (const p of PROGS) { const def = this.defs[p]; if (!def) continue; const ss = await S.appSessions(p, def.cycle); const n = ss.reduce((a, x) => a + x.n, 0);
      sifirla.append(el('div', { class: 'it' }, el('span', { style: 'min-width:0' }, el('span', { class: 'a' }, PROG_AD[p]), el('span', { class: 's' }, n ? `${ss.length} seansta ${n} app kaydı (göç verisi hariç)` : 'app kaydı yok')),
        n ? el('button', { class: 'pill', style: 'color:var(--red);border-color:#6a3030', onclick: async () => {
          if (!confirm(`${PROG_AD[p]} ${def.cycle}: ${ss.length} seanstaki ${n} app kaydı silinsin, seanslar yeniden açılsın mı? Göç/Excel verisi kalır.`)) return;
          let t = 0; for (const x of ss) t += await S.resetSession(p, def.cycle, x.week, x.day); this.krono = null; this.sync?.schedule(); this.msg = `${PROG_AD[p]}: ${t} kayıt silindi.`; this.render();
        } }, 'Sıfırla') : el('span', { class: 'v dim2' }, '—')));
    }
    m.append(sifirla, el('div', { class: 'xs dim2', style: 'margin-top:6px;line-height:1.5' }, 'Tek bir seansı geri çekmek için Program sekmesinde o güne dokun → "Bu seansın app kayıtlarını sıfırla". Silme, silme olayı olarak yazılır ve OneDrive\'a yansır.'));
    m.append(el('div', { class: 'k', style: 'margin:18px 0 8px' }, 'Sistem'));
    m.append(el('div', { class: 'list' }, it('Sürüm', 'PWA · GitHub Pages', this.version), it('Cihaz', 'olay günlüğü kimliği', await S.deviceId()),
      ...PROGS.map(p => it(`${PROG_AD[p]} tanımı`, this.defs[p]?.source?.file ?? '', this.defs[p] ? `${this.defs[p].cycle} · ${this.defs[p].rows.length} satır` : '—'))));
    m.append(el('div', { class: 'xs dim2', style: 'margin-top:14px;line-height:1.5' }, 'Kayıtlar önce cihaza (IndexedDB) yazılır; senkron arka planda. "Dışa aktar" tüm olay günlüğünü NDJSON olarak indirir; "Yedekten yükle" aynı dosyayı geri alır (tekrarlar atlanır).'));
  }
  async export() {
    const txt = await S.exportNdjson(); const blob = new Blob([txt], { type: 'application/x-ndjson' });
    const a = el('a', { href: URL.createObjectURL(blob), download: `spor-olaylar-${new Date().toISOString().slice(0, 10)}.ndjson` }); document.body.append(a); a.click(); a.remove();
  }
  async import(file) { if (!file) return; const r = await S.importNdjson(await file.text()); this.msg = `Yüklendi: ${r.written} yeni · ${r.skipped} zaten vardı · ${r.bad} bozuk satır`; this.render(); }
  // ── SHEET (stres / plaka) ─────────────────────────────────────────
  renderSheet() {
    this.veil.replaceChildren(); if (!this.sheet) return;
    const sh = this.sheet; const box = el('div', { class: 'sheet' });
    if (sh.kind === 'stres') {
      const c = this.c; const val = c.stres.get(c.v.week) ?? null;
      box.append(el('div', { class: 't' }, 'Hayat stresi'), el('div', { class: 'sub' }, `Hafta ${c.v.week} için genel yorgunluk/stres. Formüle girmez; haftalık sinyalin yanında not olarak durur.`));
      box.append(el('div', { class: 'stres' }, ...[1, 2, 3, 4, 5].map(n => el('button', { class: val === n ? 'sel' : '', onclick: async () => { await S.logStress({ program: c.p, cycle: c.def.cycle, week: c.v.week, value: n }); this.sync?.schedule(); this.sheet = null; if (sh.sonra) await this.fazSet(c.v.isinmaBasamak ? sh.sonra : 'log'); else this.render(); } }, el('b', {}, n), el('span', {}, STRES_AD[n - 1])))));
      box.append(el('div', { class: 'btnrow', style: 'margin-top:12px' }, el('button', { class: 'sec', onclick: async () => { this.sheet = null; if (sh.sonra) await this.fazSet(c.v.isinmaBasamak ? sh.sonra : 'log'); else this.renderSheet(); } }, sh.sonra ? 'Şimdi değil' : 'Kapat')));
    } else if (sh.kind === 'plaka') {
      box.append(el('div', { class: 'h' }, el('div', { class: 't' }, 'Plaka hesabı'), el('div', { class: 'small dim' }, 'loglama çubuğundan')), this.plakaBlok(sh.kg ?? 20, null, sh.aktar));
    }
    this.veil.append(el('div', { class: 'veil', onclick: e => { if (e.target === e.currentTarget) { this.sheet = null; this.renderSheet(); } } }, box));
  }
}
