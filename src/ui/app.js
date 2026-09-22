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
const fmt = M.fmt;

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
    await this.render();
  }
  go(tab) { if (this.tab === tab) return; this.tab = tab; this.main.scrollTop = 0; this.render(); }
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
    this.hR.replaceChildren(); this.foot.replaceChildren(); this.foot.className = 'hidden';
    const top = this.main.scrollTop; this.main.replaceChildren();
    const fn = { bugun: this.rBugun, program: this.rProgram, ilerleme: this.rIlerleme, aletler: this.rAletler, ayarlar: this.rAyarlar }[this.tab];
    await fn.call(this, c);
    this.main.scrollTop = top;
    this.renderSheet();
  }
  head(k, t, ...right) { this.hK.textContent = k; this.hT.textContent = t; this.hR.replaceChildren(...right.filter(Boolean)); }
  footer(cls, ...kids) { this.foot.className = cls; this.foot.replaceChildren(...kids.filter(Boolean)); }
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
    const sure = c.seans?.started_at && faz !== 'onizleme' ? el('span', { class: 'chip tab', id: 'sure' }, this.sureMetni(c.seans.started_at)) : null;
    this.head(tarih, `Hafta ${v.week} — ${P.GUN_AD[v.day]}`,
      this.kronoPill(), this.krono ? null : sure, faz === 'log' ? el('button', { class: 'pill acc', style: 'border-color:var(--acc-line)', onclick: () => this.fazSet('ozet') }, 'Bitir') : null);
    if (sure) this.tickSure();
    const m = el('div', { class: 'pop' }); this.main.append(m);
    if (faz === 'onizleme') await this.fOnizleme(c, m);
    else if (faz === 'isinma') this.fIsinma(c, m);
    else if (faz === 'log') await this.fLog(c, m);
    else if (faz === 'ozet') await this.fOzet(c, m);
  }
  sureMetni(iso) { const k = Math.max(0, Math.round((Date.now() - new Date(iso)) / 1000)); return mmss(k); }
  tickSure() { clearInterval(this.sureIv); this.sureIv = setInterval(() => { const e = this.hR.querySelector('#sure'); if (!e || !this.c?.seans?.started_at) return clearInterval(this.sureIv); e.textContent = this.sureMetni(this.c.seans.started_at); }, 1000); }
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
    const yap = r.tamam && !r.arda.skipped ? `${fmt(r.arda.kg)}×${fmt(r.arda.sets)}×${r.arda.reps ?? r.arda.reps_text ?? ''}${r.arda.rpe ? ` · RPE${fmt(r.arda.rpe)}` : ''}${r.arda.note ? ` — ${r.arda.note}` : ''}` : null;
    const alp = r.alper && M.isNum(r.alper.kg) ? `Alper: ${fmt(r.alper.kg)}×${fmt(r.alper.sets)}×${r.alper.reps ?? ''}` : (r.onerilen_alper !== null && r.onerilen_alper !== undefined ? `Alper ${fmt(r.onerilen_alper)} kg` : null);
    return el(onclick ? 'button' : 'div', { class: cls, onclick },
      el('div', { class: 'h' }, el('div', { class: 'ex' }, r.egzersiz), el('div', { class: 'mod ' + (r.renk === 'yuksek' ? 'warn' : r.renk === 'dusuk' ? 'blue' : now ? 'acc' : '') }, durum)),
      el('div', { class: 'hedef tab' }, r.hedef?.replace(/^.*\n/, '') ?? ''),
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
      m.append(el('div', { class: 'pills tab' }, el('span', { class: 'p' }, 'boş bar'), ...v.isinmaBasamak.map(k => el('span', { class: 'p' }, fmt(k))), el('span', { class: 'p top' }, `${fmt(v.topKg)} kg`)));
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
    const adim = [['boş bar', 0, 'teknik · 8-10 tekrar'], ...v.isinmaBasamak.map((k, i) => [fmt(k) + ' kg', k, i === v.isinmaBasamak.length - 1 ? 'top set öncesi son basamak' : `rampa ${i + 1}`])];
    m.append(el('div', { class: 'small mute', style: 'line-height:1.45' }, `${top.egzersiz} için rampa — ${fmt(v.topKg)} kg top sete kadar. Her basamağı bitirince dokun; sıra önemli değil.`));
    const list = el('div', { class: 'grid', style: 'margin-top:14px' }); m.append(list);
    const draw = () => list.replaceChildren(...adim.map(([et, kg, sub], i) => el('button', { class: 'isirow' + (tik.has(i) ? ' on' : ''), onclick: async () => { tik.has(i) ? tik.delete(i) : tik.add(i); await S.setMeta(c.seansKey, { ...c.seans, tik: [...tik] }); c.seans.tik = [...tik]; draw(); } },
      el('span', { class: 'tik' }, tik.has(i) ? '✓' : ''), el('span', { style: 'flex:1;min-width:0' }, el('span', { class: 'big tab' }, et), el('span', { class: 'sub' }, sub)), el('span', { class: 'xs dim2 tab' }, kg ? (P.plakaMetni(kg) ?? '') : ''))));
    draw();
    this.footer('foot', el('button', { class: 'sec', style: 'flex:none;min-height:52px', onclick: () => this.fazSet('log') }, 'Atla'), el('button', { class: 'pri', style: 'flex:1', onclick: () => this.fazSet('log') }, 'Hareketlere geç'));
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
    if (!openRow) { this.footer('foot', el('button', { class: 'pri', style: 'flex:1', onclick: () => this.fazSet('ozet') }, 'Seansı bitir')); return; }
    this.footer('log', ...await this.logBar(c, openRow));
  }
  async logBar(c, r) {
    const { def, v, p } = c; const draftKey = `draft:${p}|${def.cycle}|${v.week}|${v.day}|${r.row_key}`;
    const d = (await S.getMeta(draftKey)) ?? { actor: 'arda', kg: null, sets: null, reps: null, rpe: null, note: null };
    const planKg = () => d.actor === 'alper' ? r.onerilen_alper : r.onerilen;
    const cur = () => d.actor === 'alper' ? r.alper : r.arda;
    const fill = () => { const q = cur(); d.kg = q?.kg ?? planKg() ?? null; d.sets = q?.sets ?? r.set ?? null; d.reps = q?.reps ?? r.tekrar ?? null; d.rpe = q?.rpe ?? null; d.note = q?.note ?? null; };
    if (d.kg === null && d.sets === null) fill();
    const saveDraft = () => S.setMeta(draftKey, d);
    const ozet = () => `${d.kg === null ? '—' : fmt(d.kg)}×${d.sets ?? '—'}×${d.reps ?? r.tekrar_metin ?? '—'}${d.rpe ? ` R${fmt(d.rpe)}` : ''}`;
    // başlık + katla/aç
    const ozetS = el('span', { class: 'oz tab' });
    const chev = el('button', { class: 'chev', onclick: () => { this.logCollapsed = !this.logCollapsed; body.classList.toggle('hidden', this.logCollapsed); ozetS.classList.toggle('hidden', !this.logCollapsed); chev.textContent = this.logCollapsed ? '▴' : '▾'; kaydetMini.classList.toggle('hidden', !this.logCollapsed); } }, this.logCollapsed ? '▴' : '▾');
    const kaydetMini = el('button', { class: 'pill sel hidden', onclick: () => commit() }, 'Kaydet');
    const ttl = el('div', { class: 'ttl' }, el('div', { class: 'n' }, r.egzersiz + (r.modifier ? ` · ${r.modifier}` : '')), el('div', { class: 'hh tab' }, r.hedef?.replace(/^.*\n/, '').replace(/\n.*$/s, '') ?? ''), ozetS, kaydetMini, chev);
    const body = el('div', { class: this.logCollapsed ? 'hidden' : '' });
    // kişi
    let segBtns = [];
    if (p === 'Alper') body.append(el('div', { class: 'seg' }, ...(segBtns = ['arda', 'alper'].map(a => el('button', { class: d.actor === a ? 'sel' : '', onclick: () => { d.actor = a; fill(); saveDraft(); paint(); } }, a === 'arda' ? 'Arda' : 'Alper')))));
    // kg + plaka
    const kgIn = el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', enterkeyhint: 'done', placeholder: '—', class: 'tab' });
    const kgSub = el('div', { class: 'sub tab' });
    kgIn.addEventListener('change', () => { d.kg = M.parseKg(kgIn.value); saveDraft(); paint(); });
    kgIn.addEventListener('keydown', e => { if (e.key === 'Enter') kgIn.blur(); });
    const step = n => { d.kg = Math.max(0, Math.round(((d.kg ?? planKg() ?? 0) + n) * 100) / 100); saveDraft(); paint(); };
    const plakaBtn = r.barli ? el('button', { class: 'plk-ic', title: 'Plaka hesabı', onclick: () => { this.sheet = { kind: 'plaka', kg: d.kg ?? planKg() ?? 20, aktar: kg => { d.kg = kg; saveDraft(); paint(); } }; this.renderSheet(); } }, '▬') : null;
    body.append(el('div', { class: 'kgrow' }, el('button', { onclick: () => step(-KG_ADIM) }, '−'), el('div', { class: 'mid' }, kgIn, kgSub), el('button', { class: 'plus', onclick: () => step(KG_ADIM) }, '+'), plakaBtn));
    // set / tekrar / rpe
    const setBtns = [1, 2, 3, 4, 5].map(n => el('button', { class: 'tab', onclick: () => { d.sets = n; saveDraft(); paint(); } }, n));
    const base = r.tekrar ?? 5; const reps = r.tekrar_metin ? [] : [base - 2, base - 1, base, base + 1, base + 2].filter(n => n >= 1);
    const repBtns = reps.map(n => el('button', { class: 'tab', onclick: () => { d.reps = n; saveDraft(); paint(); } }, n));
    const repIn = el('input', { type: 'text', inputmode: 'numeric', placeholder: r.tekrar_metin ?? '…', style: 'flex:none;width:54px;text-align:center', class: 'tab' });
    repIn.addEventListener('change', () => { d.reps = M.parseKg(repIn.value); saveDraft(); paint(); });
    const rpeBtns = RPE_LIST.map(n => el('button', { class: 'tab', onclick: () => { d.rpe = d.rpe === n ? null : n; saveDraft(); paint(); } }, fmt(n)));
    body.append(el('div', { class: 'fld' }, el('div', { class: 'lbl' }, 'Set'), el('div', { class: 'opts' }, ...setBtns)));
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
    body.append(el('div', { class: 'acts' }, skipBtn, notBtn, kaydet), hint);
    const paint = () => {
      kgIn.value = d.kg === null ? '' : fmt(d.kg);
      const pk = planKg(); kgSub.textContent = r.bw ? 'toplam yük · BW + ek' : (pk !== null && pk !== undefined ? `plan ${fmt(pk)}` : 'plan yok') + (r.barli && d.kg ? ` · ${P.plakaMetni(d.kg)?.replace('bir tarafa ', 'yan ') ?? ''}` : '');
      segBtns.forEach(b => b.classList.toggle('sel', b.textContent.toLowerCase() === d.actor));
      setBtns.forEach((b, i) => b.classList.toggle('sel', d.sets === i + 1));
      repBtns.forEach((b, i) => b.classList.toggle('sel', d.reps === reps[i]));
      repIn.value = d.reps !== null && !reps.includes(d.reps) ? String(d.reps) : ''; repIn.classList.toggle('sel', d.reps !== null && !reps.includes(d.reps));
      rpeBtns.forEach((b, i) => b.classList.toggle('sel', d.rpe === RPE_LIST[i]));
      notBtn.classList.toggle('sel', !!d.note);
      const q = cur(); kaydet.textContent = q && !q.skipped ? 'Güncelle' : 'Kaydet'; skipBtn.textContent = q?.skipped ? 'Geri al' : 'Atla';
      ozetS.textContent = ozet(); ozetS.classList.toggle('hidden', !this.logCollapsed);
    };
    paint();
    const commit = async ({ skipped = false } = {}) => {
      const q = cur();
      if (skipped && q?.skipped) { await S.appendEvent(await this.deleteEvent(r.ref, d.actor)); await S.setMeta(draftKey, null); this.sync?.schedule(); return this.render(); }
      if (!skipped && d.kg === null) { hint.textContent = 'kg gir (ya da Atla).'; hint.classList.remove('hidden'); this.logCollapsed = false; body.classList.remove('hidden'); return; }
      // gerçek dinlenme: bu seansta önceki kayıttan bu yana geçen süre; plan: bir önceki kayıtta kurulan sayaç
      const now = Date.now(); const last = c.seans?.last_save_at ? new Date(c.seans.last_save_at).getTime() : null;
      const rest_s = last ? Math.round((now - last) / 1000) : null; const rest_plan_s = c.seans?.last_rest_plan_s ?? null;
      const data = { kg: d.kg, sets: d.sets, reps: d.reps, reps_text: r.tekrar_metin && d.reps === null ? r.tekrar_metin : null, rpe: d.rpe, note: d.note };
      await S.logSet({ ref: r.ref, actor: d.actor, ...data, skipped, supersedes: q?.event_id ?? null, rest_s: skipped ? null : rest_s, rest_plan_s: skipped ? null : rest_plan_s });
      await S.setMeta(draftKey, null); this.sync?.schedule();
      let plan = null;
      if (!skipped) { plan = P.dinlenmeSn(v.rows.map(x => x === r ? { ...x, tamam: true } : x), r); this.kronoBaslat(c.seansKey, plan, P.sonrakiSatir(v.rows, r)?.egzersiz ?? 'sonraki'); }
      await S.setMeta(c.seansKey, { ...c.seans, openKey: null, last_save_at: skipped ? c.seans?.last_save_at ?? null : new Date(now).toISOString(), last_rest_plan_s: plan ?? c.seans?.last_rest_plan_s ?? null });
      if (navigator.vibrate) navigator.vibrate(12);
      this.render();
    };
    return [ttl, body];
  }
  async deleteEvent(ref, actor) {
    return { id: S.ulid(), ts: new Date().toISOString(), ts_kind: 'device', device: await S.deviceId(), entered_by: 'arda', type: 'set.deleted', ref, schema_v: 1, source: { kind: 'app' }, data: { actor } };
  }
  kronoBaslat(key, sn, ad) { clearInterval(this.kronoIv); this.krono = { key, end: Date.now() + sn * 1000, sn, ad, start: Date.now() }; this.kronoIv = setInterval(() => this.kronoTick(), 500); }
  kronoKalan() { const k = this.krono; return k ? Math.max(0, Math.round((k.end - Date.now()) / 1000)) : 0; }
  kronoTick() {
    const k = this.krono; if (!k) return clearInterval(this.kronoIv);
    const kalan = this.kronoKalan();
    const pill = this.hR.querySelector('#kpill'); if (pill) { pill.querySelector('.kt').textContent = kalan > 0 ? mmss(kalan) : 'hazır'; pill.classList.toggle('done', kalan <= 0); pill.querySelector('.ring').style.setProperty('--pct', `${Math.round((1 - kalan / k.sn) * 100)}%`); }
    const big = this.main.querySelector('#krobig'); if (big) { big.textContent = kalan > 0 ? mmss(kalan) : 'hazır'; big.className = 'big tab ' + (kalan > 0 ? 'on' : 'done'); }
    if (kalan <= 0) { clearInterval(this.kronoIv); if (navigator.vibrate) navigator.vibrate([80, 60, 80]); }
  }
  /** Başlıktaki dinlenme rozeti: bağımsız, dokununca gizlenir (Geç). */
  kronoPill() {
    const k = this.krono; if (!k) return null; const kalan = this.kronoKalan();
    return el('button', { id: 'kpill', class: 'kpill' + (kalan <= 0 ? ' done' : ''), title: 'Dinlenmeyi geç', onclick: () => { this.krono = null; clearInterval(this.kronoIv); this.render(); } },
      el('span', { class: 'ring', style: `--pct:${Math.round((1 - kalan / k.sn) * 100)}%` }), el('span', { class: 'kt tab' }, kalan > 0 ? mmss(kalan) : 'hazır'), el('span', { class: 'kx' }, '×'));
  }
  // ── ÖZET ─────────────────────────────────────────────────────────
  async fOzet(c, m) {
    const { v } = c; const done = v.rows.filter(r => r.tamam && !r.arda.skipped);
    const hacim = done.reduce((a, r) => a + (M.gercekHacim(r.arda.kg, r.arda.sets, r.arda.reps) ?? 0), 0);
    const rpes = done.map(r => r.arda.rpe).filter(M.isNum); const ort = rpes.length ? Math.round(rpes.reduce((a, b) => a + b, 0) / rpes.length * 10) / 10 : null;
    const sure = c.seans?.started_at ? this.sureMetni(c.seans.started_at) : '—';
    m.append(el('div', { class: 'grid g3' }, ...[['Süre', sure, 'başlangıçtan'], ['Hacim', `${fmt(Math.round(hacim))}`, 'kg · tüm hareketler'], ['Ort. RPE', ort === null ? '—' : fmt(ort), `${done.length}/${v.rows.length} hareket`]].map(([k, val, sub]) => el('div', { class: 'card' }, el('div', { class: 'k2' }, k), el('div', { class: 'tab', style: 'margin-top:4px;font-weight:500;font-size:21px;letter-spacing:-.02em' }, val), el('div', { class: 'xs dim2' }, sub)))));
    const w = c.wk.find(x => x.week === v.week);
    m.append(el('div', { class: 'card', style: 'margin-top:12px' }, el('div', { class: 'k2' }, 'Haftalık sinyal'), el('div', { style: 'display:flex;align-items:center;gap:9px;margin-top:7px' }, el('span', { class: 'dot ' + sinyalRenk(w?.sinyal) }), el('span', { style: 'font-weight:500;font-size:16px' }, w?.sinyal ?? '—')), el('div', { class: 'small mute', style: 'margin-top:5px;line-height:1.45' }, w ? `Uyum ${w.uyum} · gerçek ${fmt(w.gercek)} / beklenen ${fmt(w.min)}–${fmt(w.max)} kg · ${w.doluGun} gün dolu` : '')));
    m.append(el('div', { class: 'k', style: 'margin-top:12px' }, 'Seans notu'));
    const ta = el('textarea', { placeholder: 'his, aksaklık, gelecek haftaya not…', style: 'margin-top:7px' }); ta.value = this.ozet?.note ?? ''; ta.addEventListener('input', () => { this.ozet = { note: ta.value }; }); m.append(ta);
    m.append(el('div', { class: 'grid', style: 'margin-top:12px' }, ...v.rows.map(r => el('div', { class: 'card', style: 'display:flex;justify-content:space-between;gap:10px;padding:9px 11px' }, el('span', { style: 'font-size:14px;font-weight:500' }, r.egzersiz + (r.modifier ? ` · ${r.modifier}` : '')), el('span', { class: 'tab ' + (r.tamam ? (r.arda.skipped ? 'dim' : 'ok') : 'warn'), style: 'white-space:nowrap;font-size:14px' }, r.tamam ? (r.arda.skipped ? 'atlandı' : `${fmt(r.arda.kg)}×${fmt(r.arda.sets)}×${r.arda.reps ?? r.arda.reps_text ?? ''}${r.arda.rpe ? ` R${fmt(r.arda.rpe)}` : ''}`) : 'girilmedi')))));
    this.footer('foot', el('button', { class: 'sec', style: 'flex:none;min-height:52px', onclick: () => this.fazSet('log') }, 'Geri'), el('button', { class: 'pri', style: 'flex:1', onclick: async () => {
      const dur = c.seans?.started_at ? Math.round((Date.now() - new Date(c.seans.started_at)) / 1000) : null;
      await S.logSession('finished', { program: c.p, cycle: c.def.cycle, week: v.week, day: v.day, duration_s: dur, note: (this.ozet?.note ?? '').trim() || null });
      await S.setMeta(c.seansKey, null); this.ozet = null; this.krono = null; this.sync?.schedule(); this.main.scrollTop = 0; this.render();
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
    const k = this.krono; const kalan = k ? Math.max(0, Math.round((k.end - Date.now()) / 1000)) : 0;
    const box = el('div', { class: 'krobox' }, el('div', { id: 'krobig', class: 'big tab ' + (k ? (kalan > 0 ? 'on' : 'done') : '') }, k ? (kalan > 0 ? mmss(kalan) : 'hazır') : '—'), el('div', { class: 'xs dim', style: 'margin-top:2px' }, k ? `${k.ad ?? 'elle'} · ${Math.round(k.sn / 60 * 10) / 10} dk` : 'süre seç'),
      el('div', { class: 'btnrow', style: 'margin-top:14px' }, ...[90, 120, 180, 210].map(sn => el('button', { class: k?.sn === sn && kalan > 0 ? 'sel' : '', onclick: () => { this.kronoBaslat('aletler', sn, 'elle'); this.render(); } }, sn >= 120 ? `${sn / 60} dk` : `${sn} sn`)), k ? el('button', { class: 'sec', onclick: () => { this.krono = null; clearInterval(this.kronoIv); this.render(); } }, 'Durdur') : null));
    m.append(box);
  }
  plakaBlok(kg0, onChange, aktar = null) {
    let kg = kg0; const big = el('div', { class: 'big tab' }); const plates = el('div', { class: 'plates' }); const not = el('div', { class: 'xs dim2', style: 'margin-top:6px' });
    const paint = () => { big.textContent = `${fmt(kg)} kg`; const t = P.plakaMetni(kg); plates.replaceChildren(); not.textContent = '';
      if (!t) { not.textContent = 'kg gir'; return; }
      if (t.startsWith('sadece') || t.startsWith('bar altı')) { plates.append(el('span', { class: 'p' }, t)); return; }
      const [, yan, rest] = /bir tarafa ([\d.]+): (.*)$/.exec(t) ?? []; const parts = (rest ?? '').replace(/\s*\(.*\)$/, '').split(' + ');
      plates.append(el('span', { class: 'p n' }, `tek taraf ${yan}`), ...parts.map(x => el('span', { class: 'p' }, x))); const ek = /\((.*)\)/.exec(t); not.textContent = ek ? `Tek tarafta ${ek[1].replace('−', '')} açık kalıyor (plaka seti 25/20/15/10/5/2.5/1.25).` : 'Bar 20 kg dahil.'; };
    const set = v => { kg = Math.max(0, Math.round(v * 100) / 100); onChange?.(kg); paint(); };
    paint();
    return el('div', {}, el('div', { class: 'plk' }, el('button', { onclick: () => set(kg - KG_ADIM) }, '−'), el('div', { class: 'mid' }, big, el('div', { class: 'sub' }, 'bar 20 kg · çift taraf')), el('button', { class: 'plus', onclick: () => set(kg + KG_ADIM) }, '+')), plates, not,
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
    if (this.sync?.last?.err) m.append(el('div', { class: 'banner err' }, 'Son senkron hatası: ' + this.sync.last.err));
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
