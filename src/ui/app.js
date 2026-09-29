// UI — saha modu · mockup (Spor App.dc.html) baz alındı, üstüne: kalıcılık, gerçek motor, stres düzeltme, hafta×gün ızgarası, önceki seans, dinlenme.
// İLKELER: innerHTML YOK (veri textContent) · klavye yalnız istekle (kg'ye/nota dokun) · type="number" YOK (madde 9) ·
// ÇİZİM: kabuk bir kez kurulur; sekme/faz değişiminde yalnız <main> yeniden dolar; çubuk içi etkileşimler DOM'u yerinde günceller (titreme yok).
import * as S from '../store.js';
import * as P from '../program.js';
import * as M from '../motor.js';
import EKIP from '../../data/ekipman.json';

const el = (tag, attrs = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(attrs)) { if (v === null || v === undefined || v === false) continue; if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v); } for (const k of kids.flat(9)) if (k !== null && k !== undefined && k !== false) e.append(k.nodeType ? k : document.createTextNode(String(k))); return e; };
const svg = d => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); for (const p of d.split('|')) { const e = document.createElementNS('http://www.w3.org/2000/svg', 'path'); e.setAttribute('d', p); s.append(e); } return s; };
const ICON = {
  bugun: 'M4 10v4|M20 10v4|M6 8v8|M18 8v8|M6 12h12|M2 12h2|M20 12h2',
  program: 'M4 5h16v15H4z|M4 10h16|M8 3v4|M16 3v4|M8 14h.01|M12 14h.01|M16 14h.01',
  ilerleme: 'M3 20h18|M4 16l5-5 4 3 7-8|M16 6h4v4',
  aletler: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16z|M12 9v4l3 2|M9 2h6|M18 5l1.5-1.5',
  ayarlar: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z|M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
};
// 29 Eyl (Arda, k): 3 sekme — Ayarlar başlıktaki dişlide, plaka hesabı kartta (Aletler kalktı)
const TABS = [['bugun', 'Bugün'], ['program', 'Program'], ['ilerleme', 'İlerleme']];
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
/** T5 (27 Eyl): ekipman — programdef'te alan yok, hareket adından: vücut ağırlığı → BW; "Dumbbell/DB" → dumbbell; barlı → barbell. */
/** A28 (29 Eyl, Arda: "5'lik dumbbell giriyorum ama sağ-sol 10 kg; vücut ağırlığında sadece ilaveyi yazayım; kabloda sayı × 2"):
 *  girdiğin sayı ekipmana göre toplam yüke çevrilir — hacim/grafik toplamı okur; sette ikisi de saklanır (kg = toplam, kg_g = girilen). */
const EKIPMAN_AD = { bar: '▮ barbell', db: '⚌ dumbbell', kablo: '⫶ kablo', makine: '▦ makine', bw: '◯ vücut', serbest: '· serbest' };
const BW_KG = 90;   // Arda 26 Eyl / 29 Eyl: varsayılan; Ayarlar'dan değişir
function ekipTahmin(r) {
  const n = r.egzersiz ?? '';
  if (r.bw && !/machine/i.test(n)) return { tip: 'bw', carpan: 1 };
  if (/dumbbell|\bdb\b/i.test(n)) return { tip: 'db', carpan: /single|waiter/i.test(n) ? 1 : 2 };
  if (/cable|pushdown|pulldown|face pull|pull-through/i.test(n)) return { tip: 'kablo', carpan: /double/i.test(n) ? 2 : 1 };
  if (/machine/i.test(n)) return { tip: 'makine', carpan: 1 };
  if (r.barli) return { tip: 'bar', carpan: 1 };
  return { tip: 'serbest', carpan: 1 };
}
function ekipman(r) { return ekipTahmin(r).tip; }   // eski çağrılar (etiket) — kişiselleştirilmiş hali App.ekipOf
const ekipEtiket = e => e.tip === 'db' || e.tip === 'kablo' ? `${EKIPMAN_AD[e.tip]} ×${e.carpan}` : EKIPMAN_AD[e.tip];
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
    this.sheet = null; this.plakaKg = 100; this.krono = null; this.progSel = {}; this.ozet = null; this.logCollapsed = false; this.odakSayfa = 0;
    this.sync?.on(() => { if (this.tab === 'ayarlar') this.render(); });
    try { window.__spor = this; } catch { }   // test ve hata ayıklama kancası (veriye doğrudan yazmaz)
  }
  // ── kabuk ────────────────────────────────────────────────────────
  /** A28: hareketin ekipmanı — önce kartta Arda'nın seçtiği, sonra data/ekipman.json, sonra addan tahmin. */
  ekipOf(r) { const ov = this.ekipOv?.[r.egzersiz] ?? EKIP.hareket?.[r.egzersiz]; return ov ? { tip: ov.tip, carpan: ov.carpan === 2 ? 2 : 1 } : ekipTahmin(r); }
  vucutOf(actor) { const v = this.vucut?.[actor ?? 'arda']; return M.isNum(v) && v > 0 ? v : null; }
  /** A28: değişiklikten önce girilmiş kaydın kg'sı ne demek (toplam / tek / ek). Kayıt dönüştürülmez — yalnız hazır gelen sayı için. */
  eskiYorum(r, e, rec) {
    const Y = EKIP.eski_yorum ?? {}; const ref = rec?.ref ?? rec ?? {};
    const k = [ref.program ?? rec?.program, ref.cycle ?? rec?.cycle, ref.week ?? rec?.week, ref.day ?? rec?.day, r.egzersiz, rec?.actor ?? rec?.data?.actor ?? 'arda'].join('|');
    return Y.kayit?.[k] ?? Y.hareket?.[r.egzersiz] ?? Y.varsayilan?.[e.tip] ?? 'toplam';
  }
  /** Kayıttaki (set ya da satır) kg'dan girişe hazır gelecek sayı: yeni sette kg_g, eski kayıtta yoruma göre. */
  girilenOf(r, e, x, rec, actor) {
    if (!x || !M.isNum(x.kg)) return null;
    const bw = this.vucutOf(actor); const bwYok = e.tip === 'bw' && !bw;
    const toplamdan = () => bwYok ? x.kg : (M.girilenYuk(x.kg, e.tip, e.carpan, bw) ?? x.kg);
    if (x.ekip) {   // A28 sonrası set: aynı ekipmanla girildiyse girdiği sayı; ekipman/vücut modu değiştiyse toplamdan (kırmızı takım A28-2/4)
      if (M.isNum(x.kg_g) && x.ekip === e.tip && (x.carpan ?? 1) === e.carpan && !bwYok) return x.kg_g;
      return toplamdan();
    }
    const y = this.eskiYorum(r, e, rec ?? x);
    if (y === 'tek' || y === 'ek') return bwYok ? null : x.kg;
    return toplamdan();
  }
  async start() {
    this.persist = await S.getMeta('persist_granted'); this.kilit = await S.getMeta('kilit', {});
    this.plakaKg = await S.getMeta('plaka_kg', 100);
    this.ekipOv = await S.getMeta('ekip_ov', {}); this.vucut = await S.getMeta('vucut_kg', { arda: BW_KG, alper: BW_KG }); if (!M.isNum(this.vucut.alper) && !this.vucut.alperElle) this.vucut = { ...this.vucut, alper: BW_KG };   // 29 Eyl (Arda): Alper de 90, Ayarlar'dan değişir
    this.prog = await this.pickProgram();
    const r = this.root; r.replaceChildren();
    this.hdr = el('div', { class: 'hdr' }, el('div', { style: 'min-width:0' }, this.hK = el('div', { class: 'k' }), this.hT = el('div', { class: 't' })), this.hR = el('div', { class: 'right' }));
    this.strip = el('div', { class: 'strip' }); this.main = this.mainEl = el('main'); this.foot = el('div'); this.veil = el('div');
    this.tabInd = el('span', { class: 'tabind' }); this.island = el('div', { class: 'island hidden', id: 'island' });
    this.tabbar = el('div', { class: 'tabs' }, this.tabInd, ...TABS.map(([id, ad]) => el('button', { 'data-tab': id, onclick: () => { if (this._scrubClick) return; this.go(id); } }, svg(ICON[id]), el('span', {}, ad))));
    r.append(this.hdr, this.strip, this.main, this.foot, this.tabbar, this.island, this.veil);
    this.sekmeKaydir(); this.sekmeSurukle();
    let lastY = 0; const mEl = this.mainEl; mEl.addEventListener('scroll', () => { const y = mEl.scrollTop, dy = y - lastY; lastY = y; if (this.root.classList.contains('has-foot')) return this.tabsShow(true);   // seans sırasında sekmeler sabit
      const atEnd = y + mEl.clientHeight >= mEl.scrollHeight - 24; if (dy > 6 && y > 40 && !atEnd) this.tabsShow(false); else if (dy < -4 || y <= 40 || atEnd) this.tabsShow(true); }, { passive: true });
    // alt kenara dokunuş → dock gibi geri gelir
    this.root.addEventListener('pointerdown', e => { if (e.clientY > innerHeight - 28) this.tabsShow(true); }, { passive: true });
    // (i) seansta gizli sekme çubuğu: alt kenardan yukarı kaydırınca 5 sn görünür
    let ey = null; this.root.addEventListener('touchstart', e => { const y = e.touches[0]?.clientY ?? 0; ey = y > innerHeight - 34 ? y : null; }, { passive: true });
    this.root.addEventListener('touchmove', e => { if (ey === null) return; if ((e.touches[0]?.clientY ?? ey) - ey < -24) { ey = null; this.tabbar.classList.add('goster'); clearTimeout(this._gosterT); this._gosterT = setTimeout(() => this.tabbar.classList.remove('goster'), 5000); } }, { passive: true });
    // (h) dinlenmede 10 sn dokunulmazsa büyük sayaç; dokunuş (tıklama) onu kapatır, alttaki düğmeye geçmez
    this._sonDok = Date.now(); for (const ev of ['pointerdown', 'touchstart', 'keydown']) document.addEventListener(ev, () => { this._sonDok = Date.now(); }, { capture: true, passive: true });
    this.bekle = el('div', { class: 'bekle hidden', onclick: e => { e.stopPropagation(); this.bekleKapat(); } }); r.append(this.bekle);
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && ['log', 'isinma'].includes(this.c?.seans?.faz)) this.wakeLock(true); });
    // iOS klavye: görsel viewport küçülünce alt çubuk klavyenin üstünde kalsın
    window.visualViewport?.addEventListener('resize', () => { const vv = window.visualViewport; this.root.style.height = vv.height + 'px'; this.root.style.transform = `translateY(${vv.offsetTop}px)`; });
    await this.render();
  }
  /** Sekme baloncuğu: seçili sekmenin altında; sürüklerken kesirli konuma kayar. */
  tabIndKonum(f = null) { if (f === null && this._scrub) return; const i = f ?? TABS.findIndex(([id]) => id === this.tab); this.tabInd.style.opacity = i < 0 ? '0' : ''; this.tabInd.style.transform = `translateX(${i * 100}%)`; }
  /** 28 Eyl (Arda): sekmeler arası parmakla geçiş — içerik parmağı izler, baloncuk kayar; eşik/hız geçilirse yandaki sekmeye yayla oturur. */
  /** (c) 29 Eyl: sekmeler arası parmakla geçişte yan sekme CANLI gelir — hedef sekme, yan etkisiz ("kuru") çizimle ayrı bir katmana önceden
   *  çizilir ve parmakla birlikte kayar; bırakınca iki katman yerine oturur, sonra gerçek çizim takılır (içerik aynı olduğu için fark edilmez). */
  sekmeKaydir() {
    const m = this.main; let sx = null, sy = 0, dx = 0, lock = null, t0 = 0, hayal = null;
    const idx = () => TABS.findIndex(([id]) => id === this.tab);
    const W = () => m.clientWidth || 390;
    const hayalYer = (x, anim = false) => { if (!hayal?.el.isConnected) return; hayal.el.style.transition = anim ? 'transform .24s var(--ease-out)' : 'none'; hayal.el.style.transform = `translateX(${hayal.yon * W() + x}px)`; };
    const hayalSil = () => { hayal?.el.remove(); hayal = null; };
    const hayalKur = async (tab, yon) => {
      const seansli = tab === 'bugun' && ['log', 'isinma', 'ozet'].includes(this.c?.seans?.faz); if (seansli || !this.c) return;
      const g = el('main', { class: 'hayal' }); const h = { tab, yon, el: g }; hayal = h;
      const fn = { bugun: this.rBugun, program: this.rProgram, ilerleme: this.rIlerleme }[tab]; const eskiM = this.main, eskiT = this.tab;
      this._kuru = true; this.main = g; this.tab = tab; try { await fn.call(this, this.c); } catch { } finally { this.main = eskiM; this.tab = eskiT; this._kuru = false; }
      if (hayal !== h || sx === null && !h.bekle) return; g.style.top = m.offsetTop + 'px'; g.style.height = m.offsetHeight + 'px'; this.root.insertBefore(g, m.nextSibling); hayalYer(dx); };
    m.addEventListener('touchstart', e => { if (e.touches.length !== 1 || this.sheet || idx() < 0 || e.target.closest('input,textarea,.pager,.xcar,.pgdots,.strip,.pills,.krobtns,.wheel-track,.hstrip,.plk,.barviz,.kgrow')) { sx = null; return; }
      sx = e.touches[0].clientX; sy = e.touches[0].clientY; dx = 0; lock = null; t0 = Date.now(); hayalSil(); }, { passive: true });
    m.addEventListener('touchmove', e => { if (sx === null) return; const x = e.touches[0].clientX - sx, y = e.touches[0].clientY - sy;
      if (!lock && (Math.abs(x) > 12 || Math.abs(y) > 12)) lock = Math.abs(x) > Math.abs(y) * 1.3 ? 'x' : 'y';
      if (lock !== 'x') return; e.preventDefault(); const i = idx(); const kenar = (x > 0 && i === 0) || (x < 0 && i === TABS.length - 1);
      dx = kenar ? x * 0.25 : x; m.classList.add('swiping'); m.style.transform = `translateX(${dx}px)`;
      const yon = dx < 0 ? 1 : -1; const hedefTab = TABS[i + yon]?.[0];
      if (!kenar && hedefTab && (!hayal || hayal.tab !== hedefTab)) { hayalSil(); hayalKur(hedefTab, yon); }
      hayalYer(dx); this.tabIndKonum(Math.max(0, Math.min(TABS.length - 1, i - dx / W()))); }, { passive: false });
    const bit = () => { if (sx === null) return; sx = null; if (lock !== 'x') { hayalSil(); return; } const v = dx / Math.max(1, Date.now() - t0); const i = idx();
      const hedef = (dx < -70 || v < -0.45) ? i + 1 : (dx > 70 || v > 0.45) ? i - 1 : i; m.classList.remove('swiping');
      if (hedef !== i && hedef >= 0 && hedef < TABS.length) { const yon = hedef > i ? 1 : -1;
        if (hayal?.el.isConnected && hayal.tab === TABS[hedef][0]) {   // canlı katman var: ikisi birlikte oturur, sonra gerçek çizim
          m.style.transition = 'transform .24s var(--ease-out)'; m.style.transform = `translateX(${-yon * W()}px)`; hayalYer(-yon * W() + yon * W() - hayal.yon * W() + 0, true); hayal.el.style.transform = 'translateX(0)';
          const h = hayal; setTimeout(() => { m.classList.add('swiping'); m.style.transition = ''; this.go(TABS[hedef][0], true).catch(() => {}).then(() => { m.style.transform = ''; requestAnimationFrame(() => { m.classList.remove('swiping'); h.el.remove(); if (hayal === h) hayal = null; }); }); }, 240);
        } else { hayalSil(); m.classList.add('swiping'); this.go(TABS[hedef][0], true).catch(() => {}).then(() => { m.style.transform = `translateX(${yon * 22}vw)`; m.style.opacity = '.55';
          requestAnimationFrame(() => requestAnimationFrame(() => { m.classList.remove('swiping'); m.style.transform = ''; m.style.opacity = ''; })); }); } }
      else { m.style.transform = ''; m.style.opacity = ''; if (hayal) { const h = hayal; hayalYer(0, true); setTimeout(() => { h.el.remove(); if (hayal === h) hayal = null; }, 250); } this.tabIndKonum(); } };
    m.addEventListener('touchend', bit); m.addEventListener('touchcancel', bit);
  }
  /** 29 Eyl (Arda: "parmak kaydıkça değişsin"): alt çubukta parmak sürüklenince cam baloncuk parmağı izler (büyüyüp sıvı gibi),
   *  parmak başka sekmenin üstüne geçtiği an o sekme açılır; bırakınca baloncuk yayla sekmeye oturur. Dokunma eskisi gibi çalışır. */
  sekmeSurukle() {
    const tb = this.tabbar; const N = TABS.length; let x0 = null, drag = false, cur = 0;
    const kesir = x => { const r = tb.getBoundingClientRect(); const w = (r.width - 12) / N; return Math.max(0, Math.min(N - 1, (x - r.left - 6) / w - 0.5)); };
    tb.addEventListener('pointerdown', e => { x0 = e.clientX; drag = false; cur = TABS.findIndex(([id]) => id === this.tab); });
    tb.addEventListener('pointermove', e => { if (x0 === null) return;
      if (!drag) { if (Math.abs(e.clientX - x0) < 8) return; drag = true; this._scrub = true; tb.classList.add('scrub'); try { tb.setPointerCapture(e.pointerId); } catch {} }
      const f = kesir(e.clientX); this._scrub = false; this.tabIndKonum(f); this._scrub = true;
      const k = Math.round(f); if (k !== cur) { cur = k; this.geriBildirim(); this.go(TABS[k][0], true); } });
    const bit = () => { if (x0 === null) return; x0 = null; if (!drag) return; drag = false; this._scrub = false; tb.classList.remove('scrub'); this.tabIndKonum();
      this._scrubClick = true; setTimeout(() => { this._scrubClick = false; }, 80); };
    tb.addEventListener('pointerup', bit); tb.addEventListener('pointercancel', bit); tb.addEventListener('lostpointercapture', bit);
    tb.style.touchAction = 'none';
  }
  go(tab, kaydirma = false) { if (this.tab === tab) return; this.tab = tab; this.mainEl.scrollTop = 0; this.tabsShow(true); this.tabIndKonum();
    const paint = () => { const me = this.mainEl; me.classList.remove('vin'); void me.offsetWidth; me.classList.add('vin'); return this.render(); };
    if (kaydirma) return this.render(); return paint(); }   // View Transitions denendi (A13) → iOS 27 standalone'da hayalet görüntü; kaldırıldı, yalnız main.vin
  /** Dock davranışı: aşağı kaydırırken sekmeler gizlenir, yukarı kaydırınca / alt kenara yaklaşınca geri gelir. */
  tabsShow(on) { this.tabbar.classList.toggle('hide', !on); }
  async pickProgram() {
    const today = P.todayKey(); const saved = await S.getMeta('prog');
    for (const p of PROGS) { const c = await this.ctx(p); if (c.v && c.v.day === today && c.v.tamamlanan < c.v.rows.length) return p; }
    return saved ?? PROGS[0];
  }
  async setProg(p) { await this._aktifCommit?.(); this.prog = p; await S.setMeta('prog', p); this.render(); }
  /** Program bağlamı: tanım + durum + aktif seans görünümü. */
  async ctx(p) {
    const def = this.defs[p]; if (!def) return { def: null, v: null };
    const [state, stateAll, ov, finished, stres, sev] = await Promise.all([S.stateFor(p, def.cycle), S.stateAllFor(p), S.armVariants(p, def.cycle), S.finishedSessions(p, def.cycle), S.stressFor(p, def.cycle), S.sessionEvents(p, def.cycle)]);
    let idx = P.activeSessionIdx(def, state, this.kilit[p] ?? null, finished, new Date(), ov);
    // 29 Eyl (Arda: "hareket bitince Bugün perşembeyi gösterdi"): bugün başlatılmış ve kapatılmamış seans, kapatılana kadar Bugün'de kalır (işaretçi sıçramaz)
    const ak = this.kilit[p] ? null : await S.getMeta('aktif:' + p);
    if (ak && ak.cycle === def.cycle && ak.gun === P.localDay(new Date()) && !finished.has(`${ak.week}|${ak.day}`)) { const s0 = P.sessions(def, ov).find(x => x.week === ak.week && x.day === ak.day); if (s0) idx = s0.idx; }
    const v = P.sessionView(def, state, idx, ov, stateAll);
    const seansKey = v ? `seans:${p}|${def.cycle}|${v.week}|${v.day}` : null;
    const seans = seansKey ? (await S.getMeta(seansKey)) ?? null : null;
    return { p, def, state, stateAll, ov, finished, stres, sev, idx, v, seansKey, seans, wk: P.weekly(def, state, ov) };
  }
  /** 29 Eyl: çift tamponlu çizim — yeni içerik ayrık bir <main>'de kurulur, bitince tek hamlede takılır (çark seçimi / sekme sürükleme
   *  sırasında boş kare ve titreme yok). Üst üste gelen çizimlerde yalnız en sonuncusu takılır. */
  sonra(fn) { if (this._takili) (this._takili.push(fn)); else requestAnimationFrame(fn); }
  async render() {
    const tok = this._rtok = (this._rtok ?? 0) + 1;
    // 29 Eyl (Arda: "sekme geçişi daha hızlı"): bağlam veri sürümüne göre önbellekte — sekme değişiminde IndexedDB yeniden okunmaz
    const ck = `${this.prog}|${S.ver()}|${P.localDay(new Date())}|${JSON.stringify(this.kilit)}`;
    const c = this._cc?.k === ck ? this._cc.c : await this.ctx(this.prog);
    if (S.ver() === +ck.split('|')[1]) this._cc = { k: ck, c };
    if (tok !== this._rtok) return;
    this.c = c;
    for (const b of this.tabbar.querySelectorAll('button')) b.classList.toggle('sel', b.dataset.tab === this.tab); this.tabIndKonum();
    // program şeridi (üstte)
    this.strip.replaceChildren(...PROGS.map(p => el('button', { class: p === this.prog ? 'sel' : '', onclick: () => this.setProg(p) }, el('span', { class: 'dot' }), PROG_AD[p])));
    this.strip.classList.toggle('hidden', this.tab === 'ayarlar' || this.tab === 'aletler' || (this.tab === 'bugun' && ['isinma', 'log', 'ozet'].includes(c.seans?.faz)));
    const live = this.mainEl; const top = live.scrollTop; const buf = el('main');
    const fn = { bugun: this.rBugun, program: this.rProgram, ilerleme: this.rIlerleme, aletler: this.rAletler, ayarlar: this.rAyarlar }[this.tab];
    const bekleyen = this._takili = []; this.main = buf; this._footSet = false; this._headSet = false; this._islandSet = false;
    try { await fn.call(this, c); } finally { if (this.main === buf) this.main = live; if (this._takili === bekleyen) this._takili = null; }
    if (tok !== this._rtok) return;
    if (!this._headSet) this.hR.replaceChildren();
    const seansta = this.tab === 'bugun' && ['log', 'isinma'].includes(c.seans?.faz);
    this.root.classList.toggle('seans', seansta); this.tabbar.classList.toggle('seans', seansta);   // (i) seans sırasında sekme çubuğu gizli; alttan yukarı kaydırınca gelir
    if (!seansta && this.tab !== 'ayarlar') this.hR.append(el('button', { class: 'disli', title: 'Ayarlar', onclick: () => this.go('ayarlar') }, svg(ICON.ayarlar)));
    if (this.tab === 'ayarlar') this.hR.replaceChildren(el('button', { class: 'disli geri', title: 'Geri', onclick: () => this.go('bugun') }, '‹ Geri'));
    if (!this._footSet) { this.foot.replaceChildren(); this.foot.className = 'hidden'; this.root.classList.remove('has-foot'); }
    if (!this._islandSet) { this.island.replaceChildren(); this.island.classList.add('hidden'); }
    live.replaceChildren(...buf.childNodes); live.scrollTop = top;
    for (const f of bekleyen) requestAnimationFrame(f);
    this.renderSheet();
  }
  head(k, t, ...right) { if (this._kuru) return; this._headSet = true; this.hK.textContent = k; this.hT.textContent = t; this.hR.replaceChildren(...right.filter(Boolean)); this.hdr.classList.remove('one'); }
  footer(cls, ...kids) { if (this._kuru) return; this._footSet = true; if (!this._footRO && window.ResizeObserver) { this._footRO = new ResizeObserver(() => this.root.style.setProperty('--footh', this.foot.offsetHeight + 'px')); this._footRO.observe(this.foot); } this.foot.className = cls; this.foot.replaceChildren(...kids.filter(Boolean)); this.root.classList.toggle('has-foot', cls !== 'hidden'); }
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
    const m = el('div', { class: this._sessiz || ['log', 'isinma'].includes(c.seans?.faz) ? '' : 'pop' }); this.main.append(m);
    if (this.msg) { m.append(el('div', { class: 'banner ok', style: 'margin:0 0 10px' }, this.msg)); this.msg = null; }
    const skew = await S.getMeta('saat_sapmasi_ms'); if (skew) m.append(el('div', { class: 'banner warn', style: 'margin:0 0 10px' }, `Telefon saati sunucudan ${Math.round(Math.abs(skew) / 60000)} dk ${skew > 0 ? 'geride' : 'ileride'} — kayıt sırası bundan etkilenmesin diye saati otomatik yap.`));
    if (faz === 'onizleme') await this.fOnizleme(c, m);
    else if (faz === 'isinma') await this.fIsinma(c, m);
    else if (faz === 'log') await this.fLog(c, m);
    else if (faz === 'ozet') await this.fOzet(c, m);
  }
  sureMetni(iso) { const k = Math.max(0, Math.round((Date.now() - new Date(iso)) / 1000)); return mmss(k); }
  tickSure() { clearInterval(this.sureIv); this.sureIv = setInterval(() => { const e = this.hR.querySelector('#sure') ?? this.foot.querySelector('#sure'); if (!e || !this.c?.seans?.started_at) return clearInterval(this.sureIv); e.textContent = this.sureMetni(this.c.seans.started_at); }, 1000); }
  /** H2 (27 Eyl): rampa, rampanın hareketi sıradaysa gösterilir; seans olimpik kaldırışla başlıyorsa önce log, rampa o hareket gelince. */
  baslangicFaz(v) { const ilk = v.rows.find(r => !r.tamam); return v.rampa && ilk && ilk.row_key === v.rampa.rowKey ? 'isinma' : 'log'; }
  async fazSet(faz, extra = {}) {
    if (this.c?.seans?.faz === 'log' && faz !== 'log') await this._aktifCommit?.();
    const c = this.c; if (c.seansKey) c.seans = (await S.getMeta(c.seansKey)) ?? c.seans; const s = { ...(c.seans ?? { tik: [], started_at: null, openKey: null }), faz, ...extra };
    if (faz !== 'onizleme' && !s.started_at) { s.started_at = new Date().toISOString(); await S.logSession('started', { program: c.p, cycle: c.def.cycle, week: c.v.week, day: c.v.day }); }
    if (faz !== 'onizleme') await S.setMeta('aktif:' + c.p, { cycle: c.def.cycle, week: c.v.week, day: c.v.day, gun: P.localDay(new Date()) });
    await S.setMeta(c.seansKey, s); this.mainEl.scrollTop = 0; await this.render();
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
    const durum = r.tamam ? (r.arda.skipped ? 'ATLANDI' : r.renk === 'yuksek' ? 'RPE ↑' : r.renk === 'dusuk' ? 'RPE ↓' : 'KAYITLI') : (now ? (r.modifier ? `${r.modifier} · ŞİMDİ` : 'ŞİMDİ') : (r.modifier ?? (P.kolBilgi(r) ? 'Kol' : /clean|snatch/i.test(r.egzersiz) ? 'Teknik' : (r.pct_1rm ? '' : 'Aksesuar'))));
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
    const rp = v.rampa;
    if (rp) {
      m.append(el('div', { style: 'margin-top:14px', class: 'h' }, el('div', { class: 'k' }, `Isınma · ${rp.egz}`), el('div', { class: 'xs dim2' }, `${rp.basamak.length + (rp.bosBar ? 1 : 0)} basamak · ${rp.kaynak === 'top' ? 'top set' : 'ağır'} ${fmt(rp.kg)} kg${rp.olimpik ? ` · ${rp.olimpik.egz} ${fmt(rp.olimpik.kg)}'tan sonra` : ''}`)));
      m.append(el('div', { class: 'pills tab' }, v.isinmaBasamakAlper ? el('span', { class: 'plbl' }, 'Arda') : null, rp.bosBar ? el('span', { class: 'p' }, 'boş bar') : null, ...rp.basamak.map(k => el('span', { class: 'p' }, fmt(k))), el('span', { class: 'p top' }, `${fmt(rp.kg)} kg`)));
      if (v.isinmaBasamakAlper && !rp.olimpik) m.append(el('div', { class: 'pills tab alp' }, el('span', { class: 'plbl' }, 'Alper'), el('span', { class: 'p' }, 'boş bar'), ...v.isinmaBasamakAlper.map(k => el('span', { class: 'p' }, fmt(k))), el('span', { class: 'p top' }, `${fmt(v.topAlperKg)} kg`)));
    }
    m.append(el('div', { class: 'grid', style: 'margin-top:14px' }, ...v.rows.map(r => this.rowCard(c, r, { open: true }))));
    const son = c.sev.filter(e => e.kind === 'finished' && e.note).slice(-1)[0];
    if (son && son.week === v.week && son.day === v.day) m.append(el('div', { class: 'prev', style: 'margin-top:10px' }, 'Seans notu: ' + son.note));
    this.footer('foot', el('button', { class: 'pri', style: 'flex:1', onclick: async () => {
      if (!c.stres.has(v.week)) { this.sheet = { kind: 'stres', sonra: 'isinma' }; this.renderSheet(); return; }
      await this.fazSet(!tamamlandi ? this.baslangicFaz(v) : 'log');
    } }, tamamlandi ? 'Seansı aç (düzelt)' : v.tamamlanan > 0 ? 'Seansa devam et' : 'Seansa başla'));
  }
  async fIsinma(c, m) {
    const { v } = c; const tik = new Set(c.seans?.tik ?? []); const rp = v.rampa;
    if (!rp) { await this.fazSet('log', { isinma_gecildi: true }); return; }
    const alp = !rp.olimpik ? v.isinmaBasamakAlper : null;
    const adim = [...(rp.bosBar ? [['boş bar', 0, 'teknik · 8-10 tekrar']] : []), ...rp.basamak.map((k, i) => [fmt(k) + ' kg' + (alp ? ` · Alper ${fmt(alp[i])}` : ''), k, i === rp.basamak.length - 1 ? `${rp.kaynak === 'top' ? 'top set' : 'ağır set'} öncesi son basamak` : `rampa ${i + 1}`])];
    m.append(el('div', { class: 'small mute', style: 'line-height:1.45' }, `${rp.egz} için rampa — ${fmt(rp.kg)} kg${v.topAlperKg && alp ? ` (Alper ${fmt(v.topAlperKg)} kg)` : ''}${rp.olimpik ? ` · ${rp.olimpik.egz} ${fmt(rp.olimpik.kg)} ısınma sayıldı, üstünden başlar` : ''}. Her basamağı bitirince dokun; sıra önemli değil.`));
    const list = el('div', { class: 'grid', style: 'margin-top:14px' }); m.append(list);
    const draw = () => list.replaceChildren(...adim.map(([et, kg, sub], i) => el('button', { class: 'isirow' + (tik.has(i) ? ' on' : ''), onclick: async () => { tik.has(i) ? tik.delete(i) : tik.add(i); await S.setMeta(c.seansKey, { ...c.seans, tik: [...tik] }); c.seans.tik = [...tik]; draw(); } },
      el('span', { class: 'tik' }, tik.has(i) ? '✓' : ''), el('span', { style: 'flex:1;min-width:0' }, el('span', { class: 'big tab' }, et), el('span', { class: 'sub' }, sub)), el('span', { class: 'xs dim2 tab' }, kg ? (P.plakaMetni(kg) ?? '') : ''))));
    draw();
    const gec = async () => { const ilk = v.rows.find(r => !r.tamam); if (ilk && tik.size) this.kronoBaslat(c.seansKey, P.oncesiDinlenmeSn(ilk), ilk.egzersiz, ilk.row_key, { bitAd: 'Isınma', basAd: ilk.egzersiz }); await this.fazSet('log', { isinma_bitti_at: tik.size ? new Date().toISOString() : null, isinma_gecildi: true }); };
    this.footer('foot', el('button', { class: 'sec', style: 'flex:none;min-height:52px', onclick: () => this.fazSet('log', { isinma_gecildi: true }) }, 'Atla'), el('button', { class: 'pri', style: 'flex:1', onclick: gec }, 'Hareketlere geç'));
  }
  // ── LOG (aktif seans) ─────────────────────────────────────────────
  async fLog(c, m) {
    const { v } = c;
    m.append(el('div', { class: 'dots' }, ...v.rows.map(r => el('i', { class: r.tamam ? (r.arda.skipped ? 'skip' : 'ok') : '' }))));
    const nowRow = v.rows.find(r => !r.tamam) ?? null;
    const openKey = c.seans?.openKey && v.rows.some(r => r.row_key === c.seans.openKey) ? c.seans.openKey : nowRow?.row_key ?? null;
    const openRow = v.rows.find(r => r.row_key === openKey) ?? null;
    if (v.rampa && openRow && openRow === nowRow && openRow.row_key === v.rampa.rowKey && !c.seans?.isinma_gecildi && !(c.seans?.tik ?? []).length) { setTimeout(() => this.fazSet('isinma'), 0); return; }   // H2: rampa, hareketi sıraya gelince
    // T1 (27 Eyl) ODAK MODU: sayfa 1 = odak hareket + set yığını + soluk geçmiş/gelecek (3D, cam); sayfa 2 = genel görünüm (tüm liste). Yana kaydırılır.
    const liste = el('div', { class: 'grid', style: 'margin-top:10px' }, ...v.rows.map(r => this.rowCard(c, r, { open: r === openRow, now: r === openRow, onclick: async () => { await this._aktifCommit?.(); await S.setMeta(c.seansKey, { ...(await S.getMeta(c.seansKey)) ?? c.seans, openKey: r.row_key }); this.odakSayfa = 0; this.render(); } })));
    const pg2 = el('section', { class: 'pg' }, v.kol ? this.kolSatiri(c) : null, liste, openRow ? el('button', { class: 'sec', style: 'width:100%;margin-top:14px', onclick: () => this.fazSet('ozet') }, `Seansı bitir · ${v.rows.filter(r => !r.tamam).length} hareket girilmedi`) : null);
    if (!openRow) { m.append(pg2); }
    else {
      // 28 Eyl (Arda, düzeltme): iki sayfa geri — sayfa 1 = hareketler kendi içinde yana kayar + altında o hareketin set yığını (tek çerçeve), sayfa 2 = genel görünüm
      const pg1 = el('section', { class: 'pg stage' });
      const pager = el('div', { class: 'pager' }, pg1, pg2);
      const dots = el('div', { class: 'pgdots' }, el('i', { class: this.odakSayfa ? '' : 'on' }), el('i', { class: this.odakSayfa ? 'on' : '' }));
      pager.addEventListener('scroll', () => { const k = Math.round(pager.scrollLeft / Math.max(1, pager.clientWidth)); if (k !== this.odakSayfa) { this.odakSayfa = k; dots.children[0].classList.toggle('on', !k); dots.children[1].classList.toggle('on', !!k); } }, { passive: true });
      m.append(dots, pager); this.cizEgzKaydirak(c, pg1, v.rows.indexOf(openRow), nowRow);
      if (this.odakSayfa) this.sonra(() => { pager.scrollLeft = pager.clientWidth; });
    }
    const seansBar = this.seansBar(c, openRow);
    if (!openRow) { this.footer('log', seansBar, el('div', { class: 'acts', style: 'margin-top:8px' }, el('button', { class: 'pri', onclick: () => this.fazSet('ozet') }, 'Seansı bitir'))); return; }
    this.footer('log', seansBar, ...await this.logBar(c, openRow));
  }
  /** Hareket kaydırağı (28 Eyl): yatay, native momentum + snap; komşu kartlar küçülüp hafif döner (yan yana yığın).
   *  Etkin kartın altında canlı set çarkı (#deck), diğerlerinde kayıtlı setlerin durağan özeti. Son sayfa = genel görünüm.
   *  Seçim yalnız kullanıcı kaydırmasıyla; hareket değişince ekran yeniden çizilmez (yalnız set yığını ve giriş çubuğu). */
  kartGovde(r, aktor, yap, planT, tk) {
    const alp = aktor === 'alper'; const q = alp ? r.alper : r.arda; const bitti = alp ? !!(q && (M.isNum(q.kg) || q.skipped)) : r.tamam;
    const kgP = alp ? (M.isNum(r.onerilen_alper) ? r.onerilen_alper : null) : (M.isNum(r.onerilen) ? r.onerilen : null);
    const yapQ = q?.skipped ? 'atlandı' : q?.sets_detail?.length ? P.detayMetni(q.sets_detail) : q ? `${fmt(q.kg)}×${fmt(q.sets)}×${q.reps ?? ''}` : '';
    const plk = alp ? r.plakaAlper : r.plaka;
    const alt = [plk ? plk.replace('bir tarafa ', 'yan ') : null, alp ? (M.isNum(r.onerilen) ? `Arda ${fmt(r.onerilen)}` : null) : (M.isNum(r.onerilen_alper) ? `Alper ${fmt(r.onerilen_alper)}` : null)].filter(Boolean).join(' · ');
    // R4-B: büyük rakam yalnız panelde; kartta tek plan satırı
    return el('div', {}, bitti ? el('div', { class: 'l2 tab' }, alp ? yapQ : yap(r)) : el('div', { class: 'planl tab' }, 'plan ', el('b', {}, kgP !== null ? `${fmt(kgP)} kg` : (planT || tk)), kgP !== null ? ` · ${tk}` : '', alt ? ` · ${alt}` : ''));
  }
  cizEgzKaydirak(c, host, oi, nowRow) {
    const v = c.v; const n = v.rows.length;
    const yap = r => r.arda?.skipped ? 'atlandı' : r.arda?.sets_detail?.length ? P.detayMetni(r.arda.sets_detail) : r.arda ? `${fmt(r.arda.kg)}×${fmt(r.arda.sets)}×${r.arda.reps ?? ''}` : '';
    // Tasarım A (28 Eyl): kart = durum satırı · büyük ad · modifier + hedef RPE · dev kg rakamı · yan/Alper; setler aynı kartın içinde, çizginin altında
    const slides = v.rows.map((r, i) => {
      const eq = this.ekipOf(r);
      const planT = (r.hedef?.replace(/^.*\n/, '') ?? '').replace(/\n/g, ' · ').replace(/\s*[▸⚠].*$/, '');
      const tk = `${r.set ?? '?'}×${r.tekrar ?? r.tekrar_metin ?? '?'}`;
      return el('div', { class: 'xslide', 'data-i': i }, el('div', { class: 'xcard ' + (r.tamam ? (r.arda?.skipped ? 'skip' : 'done') : r === nowRow ? 'nowr' : '') },
        el('div', { class: 'l0' }, el('span', { class: 'm' }, [r.tamam ? (r.arda?.skipped ? '— atlandı' : '✓ bitti') : r === nowRow ? '● şimdi' : `sıra ${i + 1}`, `${i + 1}/${n}`].filter(Boolean).join(' · '), el('button', { class: 'ekt', title: 'Ekipman — dokun, değiştir', onclick: e => { e.stopPropagation(); this.ekipSec(r); } }, ekipEtiket(eq))), c.def.program === 'Alper' ? el('span', { class: 'kimsec' }, ...['arda', 'alper'].map(a => el('button', { 'data-a': a, class: a === 'arda' ? 'sel' : '', onclick: e => { e.stopPropagation(); this._aktorSec?.(a); } }, a === 'arda' ? 'Arda' : 'Alper'))) : el('span', { class: 'kim' })),
        el('div', { class: 'v' }, r.egzersiz),
        el('div', { class: 'md' }, [r.modifier, M.isNum(r.hedef_rpe) ? `RPE ${fmt(r.hedef_rpe)}` : null].filter(Boolean).join(' · ') || ' '),
        el('div', { class: 'kh' }, this.kartGovde(r, 'arda', yap, planT, tk))));
    });
    const track = el('div', { class: 'xcar' }, ...slides);
    const deck = el('div', { class: 'deck', id: 'deck' });
    // 28 Eyl (Arda: "Alper'e geçince ana kart da değişmeli"): kişi değişince etkin kartın gövdesi o kişinin planını/kaydını gösterir
    this.kartPlaka = (rowKey, kg) => { const i = v.rows.findIndex(x => x.row_key === rowKey); const sl = slides[i]; const r = v.rows[i]; if (!sl || !r?.barli) return; let k = sl.querySelector('.kp'); if (!k) { k = el('div', { class: 'kp' }); sl.querySelector('.xcard').append(k); } k.replaceChildren(this.plakaMini(kg)); };
    this.kartAktor = (rowKey, aktor) => { const i = v.rows.findIndex(x => x.row_key === rowKey); const sl = slides[i]; if (!sl) return; const r = v.rows[i];
      const planT = (r.hedef?.replace(/^.*\n/, '') ?? '').replace(/\n/g, ' · ').replace(/\s*[▸⚠].*$/, ''); const tk = `${r.set ?? '?'}×${r.tekrar ?? r.tekrar_metin ?? '?'}`;
      sl.querySelector('.kh').replaceChildren(this.kartGovde(r, aktor, yap, planT, tk)); sl.querySelectorAll('.kimsec button').forEach(b => b.classList.toggle('sel', b.dataset.a === aktor)); sl.querySelector('.xcard').classList.toggle('alper', aktor === 'alper'); };
    host.append(el('div', { class: 'combo-w' }, el('div', { class: 'peek l glass' }), el('div', { class: 'peek r glass' }), el('div', { class: 'combo glass' }, track, el('div', { class: 'combo-bag' }, deck))));
    const bas = () => {};
    const sec = async idx => { if (idx === oi || !track.isConnected) return;
      const yazildi = await this._aktifCommit?.(v.rows[idx]); const r = v.rows[idx]; oi = idx; bas(idx); c.seans = { ...((await S.getMeta(c.seansKey)) ?? c.seans), openKey: r.row_key }; await S.setMeta(c.seansKey, c.seans);
      if (yazildi) { this._sessiz = true; try { await this.render(); } finally { this._sessiz = false; } return; }   // kırmızı takım A27-1: yazılan setlerle bayat görünüm kalmasın
      if (v.rampa && r === nowRow && r.row_key === v.rampa.rowKey && !c.seans.isinma_gecildi && !(c.seans.tik ?? []).length) { this._sessiz = true; try { await this.render(); } finally { this._sessiz = false; } return; }
      const kids = await this.logBar(c, r); if (!track.isConnected) return; this.footer('log', this.seansBar(c, r), ...kids); this.applyCollapse(); };
    this.kaydirakBagla(track, slides, { ilk: oi, sec, tmr: '_exTmr' });
  }
  /** Yatay kaydırak fiziği (carkBagla'nın yatay eşi): kart merkezleri DOM'dan; komşular küçülür/solar/hafif döner. */
  kaydirakBagla(track, items, { ilk = 0, sec, tmr }) {
    const mz = it => it.offsetLeft + it.offsetWidth / 2;
    const enYakin = () => { const c = track.scrollLeft + track.clientWidth / 2; let b = 0, bd = Infinity; items.forEach((it, i) => { const x = Math.abs(mz(it) - c); if (x < bd) { bd = x; b = i; } }); return b; };
    const boya = () => { const c = track.scrollLeft + track.clientWidth / 2; const W = items[0]?.offsetWidth || 300; for (const it of items) { const k = Math.max(-1.6, Math.min(1.6, (mz(it) - c) / W)); const a = Math.abs(k);
      it.style.transform = `perspective(900px) rotateY(${-k * 9}deg) scale(${1 - a * 0.07})`; it.style.opacity = String(Math.max(0.35, 1 - a * 0.45)); it.classList.toggle('on', a < 0.5); } };
    let raf = 0, dokunus = 0, sessizBit = 0; clearTimeout(this[tmr]);
    const dokundu = () => { dokunus = Date.now(); };
    for (const ev of ['touchstart', 'touchmove', 'pointerdown', 'wheel']) track.addEventListener(ev, dokundu, { passive: true });
    track.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; boya(); }); clearTimeout(this[tmr]);
      if (!dokunus || !track.isConnected || (Date.now() < sessizBit && dokunus < sessizBit - 400)) return;
      this[tmr] = setTimeout(() => { if (track.isConnected && Date.now() - dokunus < 2500) sec(enYakin()); }, 140); }, { passive: true });
    const kay = this._kaydir; this._kaydir = null;
    this.sonra(() => { const it = items[Math.max(0, Math.min(items.length - 1, ilk))]; sessizBit = Date.now() + 900; const from = kay && items[kay.from] && kay.from !== ilk ? items[kay.from] : null;
      if (from) { track.scrollLeft = mz(from) - track.clientWidth / 2; boya(); setTimeout(() => { if (track.isConnected && it) track.scrollTo({ left: mz(it) - track.clientWidth / 2, behavior: 'smooth' }); }, 90); }   // (l) biten karttan sıradakine görünür kayış
      else { if (it) track.scrollLeft = mz(it) - track.clientWidth / 2; boya(); } });
    return { git: j => { dokundu(); const it = items[j]; if (it) track.scrollTo({ left: mz(it) - track.clientWidth / 2, behavior: 'smooth' }); } };
  }
  /** Yatay şerit seçici (R4-B): native kaydırma + snap; ortadaki değer seçilir. Yalnız parmak/tekerlek dokunuşundan sonraki yerleşme seçer;
   *  programatik konumlama (ayarla) dokunuş bayrağını sıfırlar → kendi kendine değer yazamaz. `varsayilan`: boşken o değerde SOLUK bekler (kaydedilmez). */
  serit(ad, degerler, etiket, secili, onSec, { varsayilan = null } = {}) {
    const items = degerler.map(x => el('span', { class: 'pk tab', 'data-v': x === null ? '' : String(x) }, etiket(x)));
    const track = el('div', { class: 'hstrip' }, el('span', { class: 'hsp' }), ...items, el('span', { class: 'hsp' }));
    const box = el('div', { class: 'picker serit', 'data-ad': ad }, track, el('div', { class: 'hsel' }));
    let cur = degerler.indexOf(secili); let dok = 0; let tmr = 0; let raf = 0; let sonX = secili;
    const mz = it => it.offsetLeft + it.offsetWidth / 2;
    const yakin = () => { const c = track.scrollLeft + track.clientWidth / 2; let b = 0, bd = Infinity; items.forEach((it, i) => { const x = Math.abs(mz(it) - c); if (x < bd) { bd = x; b = i; } }); return b; };
    const boya = () => { const c = track.scrollLeft + track.clientWidth / 2; for (const it of items) { const a = Math.min(2.5, Math.abs(mz(it) - c) / 34); it.style.opacity = String(Math.max(0.12, 1 - a * 0.42)); it.classList.toggle('on', a < 0.5); } };
    const konum = i => { const it = items[i]; if (it) track.scrollLeft = mz(it) - track.clientWidth / 2; boya(); };
    const bosMu = () => box.classList.toggle('bos', cur < 0);
    const sec = i => { dok = 0; if (i === cur) return; cur = i; sonX = degerler[i]; bosMu(); onSec(degerler[i]); };
    const dokundu = () => { dok = Date.now(); };
    for (const ev of ['touchstart', 'touchmove', 'pointerdown', 'wheel']) track.addEventListener(ev, dokundu, { passive: true });
    track.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; boya(); }); clearTimeout(tmr); if (!dok) return;
      tmr = setTimeout(() => { if (track.isConnected && dok && Date.now() - dok < 2500) sec(yakin()); }, 130); }, { passive: true });
    items.forEach((it, i) => it.addEventListener('click', () => { dokundu(); const c = track.scrollLeft + track.clientWidth / 2; if (Math.abs(mz(it) - c) < it.offsetWidth / 2) sec(i); else track.scrollTo({ left: mz(it) - track.clientWidth / 2, behavior: 'smooth' }); }));
    const vs = () => typeof varsayilan === 'function' ? varsayilan() : varsayilan;
    const ilk = () => cur >= 0 ? cur : Math.max(0, degerler.indexOf(vs() ?? degerler[0]));
    bosMu(); this.sonra(() => konum(ilk()));
    // kırmızı takım A26-1: aynı değere yeniden boyama no-op (süren kaydırmayı iptal etmez)
    box.ayarla = x => { if (x === sonX) return; sonX = x; const i = degerler.indexOf(x); if (i === cur && i >= 0) return; dok = 0; clearTimeout(tmr); cur = i; bosMu(); const f = () => konum(ilk()); track.isConnected ? f() : this.sonra(f); };
    // kırmızı takım A26-2: Kaydet'e basılınca yerleşmemiş kaydırma hemen çözülür (son seçilen değer kaybolmaz)
    box.flush = () => { if (dok && Date.now() - dok < 2500) { clearTimeout(tmr); sec(yakin()); } };
    return box;
  }
  /** Dikey seçici (iOS saat seçici): değerler çarkı; ortadaki değer seçilir. ayarla(v) dışarıdan konumlar (seçim tetiklemez). */
  secici(ad, degerler, etiket, secili, onSec) {
    const items = degerler.map(x => el('div', { class: 'pk tab', 'data-v': x === null ? '' : String(x) }, etiket(x)));
    const track = el('div', { class: 'wheel-track pkt' }, el('div', { class: 'wsp' }), ...items, el('div', { class: 'wsp' }));
    const box = el('div', { class: 'picker', 'data-ad': ad }, track, el('div', { class: 'wsel' }));
    let cur = Math.max(0, degerler.indexOf(secili));
    this.carkBagla(track, items, { ilk: cur, aci: 30, tmr: '_pk_' + ad, sec: i => { if (i === cur) return; cur = i; onSec(degerler[i]); } });
    box.ayarla = x => { const i = degerler.indexOf(x); if (i < 0 || i === cur) return; cur = i; const it = items[i]; if (track.isConnected) track.scrollTop = it.offsetTop + it.offsetHeight / 2 - track.clientHeight / 2; else this.sonra(() => { track.scrollTop = it.offsetTop + it.offsetHeight / 2 - track.clientHeight / 2; }); };
    return box;
  }
  /** Ortak çark fiziği (set + hareket çarkı): native momentum + snap; kart konumu DOM'dan ölçülür (sabit adım varsayımı yok, uzun listede kayma olmaz).
   *  Yalnız kullanıcı kaydırması (dokunma/tekerlek) seçim yapar; programatik ilk konum seçmez. */
  carkBagla(track, items, { ilk = 0, sec, tmr, aci = 24 }) {
    const mz = it => it.offsetTop + it.offsetHeight / 2;
    const adim = () => items.length > 1 ? Math.max(1, mz(items[1]) - mz(items[0])) : (items[0]?.offsetHeight || 50);
    const enYakin = () => { const c = track.scrollTop + track.clientHeight / 2; let b = 0, bd = Infinity; items.forEach((it, i) => { const x = Math.abs(mz(it) - c); if (x < bd) { bd = x; b = i; } }); return b; };
    const boya = () => { const c = track.scrollTop + track.clientHeight / 2; const A = adim(); for (const it of items) { const k = Math.max(-2.2, Math.min(2.2, (mz(it) - c) / A)); const a = Math.abs(k);
      it.style.transform = `perspective(520px) rotateX(${-k * aci}deg) scale(${1 - a * 0.07})`; it.style.opacity = String(Math.max(0.1, 1 - a * 0.45)); it.classList.toggle('on', a < 0.5); } };
    // 29 Eyl (Arda: "set kaydedince hareket değişiyor"): seçim yalnız BU çarka son 2,5 sn içinde parmak/tekerlek değdiyse yapılır;
    // programatik konumlamadan sonraki 400 ms'lik kaydırma olayları (iOS snap yeniden hizalaması) yok sayılır; seçilen kart zaten seçiliyse hiçbir şey olmaz.
    let raf = 0, dokunus = 0, sessizBit = 0; clearTimeout(this[tmr]);
    const dokundu = () => { dokunus = Date.now(); };
    for (const ev of ['touchstart', 'touchmove', 'pointerdown', 'wheel']) track.addEventListener(ev, dokundu, { passive: true });
    track.addEventListener('scroll', () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; boya(); }); clearTimeout(this[tmr]);
      if (!dokunus || !track.isConnected || (Date.now() < sessizBit && dokunus < sessizBit - 400)) return;
      this[tmr] = setTimeout(() => { if (track.isConnected && Date.now() - dokunus < 2500) sec(enYakin()); }, 130); }, { passive: true });
    items.forEach(it => it.addEventListener('click', () => { dokundu(); track.scrollTo({ top: mz(it) - track.clientHeight / 2, behavior: 'smooth' }); }));
    this.sonra(() => { const it = items[Math.max(0, Math.min(items.length - 1, ilk))]; sessizBit = Date.now() + 400; if (it) track.scrollTop = mz(it) - track.clientHeight / 2; boya(); });
  }
  /** T1 odak kartı: hareket, ekipman işareti (T5), plan, plaka, geçen, fren gerekçesi, Alper planı. */
  odakKart(c, r, { baslik = true } = {}) {
    const prev = P.prevMetni(P.prevEntry(c.stateAll, r, c.v, c.def.cycle));
    const prevA = c.def.program === 'Alper' ? P.prevMetni(P.prevEntry(c.stateAll, r, c.v, c.def.cycle, 'alper')) : null;
    const eq = this.ekipOf(r);
    return el('div', { class: 'focus glass' },
      el('div', { class: 'row' }, baslik ? el('div', { class: 'ex' }, r.egzersiz) : el('div', { class: 'tag' }, `hareket ${c.v.rows.indexOf(r) + 1} / ${c.v.rows.length}`), el('div', { class: 'tag' }, [r.modifier, ekipEtiket(eq)].filter(Boolean).join(' · '))),
      el('div', { class: 'plan tab' }, (r.hedef?.replace(/^.*\n/, '') ?? '').replace(/\n/g, ' · ') + (r.plaka ? ` · ${r.plaka.replace('bir tarafa ', 'yan ')}` : '')),
      frenNotu(r),
      r.onerilen_alper !== null && r.onerilen_alper !== undefined ? el('div', { class: 'small blue tab', style: 'margin-top:4px' }, `Alper ${fmt(r.onerilen_alper)} kg${prevA ? ` · geçen ${prevA}` : ''}`) : null,
      prev ? el('div', { class: 'prev' }, 'geçen ' + prev) : null);
  }
  /** Seans şeridi (çubuğun tepesi): tutamaç · geçen süre · dinlenme rozeti · Bitir. */
  seansBar(c, row = null) {
    const sure = el('span', { class: 'chip tab', id: 'sure' }, this.sureMetni(c.seans.started_at)); this.tickSure();
    const grab = el('button', { class: 'grab', title: this.logCollapsed ? 'Aç' : 'Katla', onclick: () => { if (this.dragMoved) { this.dragMoved = false; return; } this.logCollapsed = !this.logCollapsed; this.applyCollapse(); } }, el('span', { class: 'gl' }), el('span', { class: 'gt' }, this.logCollapsed ? '▴  aç' : '▾  katla'));
    this.grabDrag(grab);
    // 28 Eyl (Tasarım A): süre başlığın sağında; dinlenme sayacı + Hazırım üstte Dynamic Island kapsülünde; panelde yalnız (gerekirse) Isınma
    this.hR.replaceChildren(sure, el('span', { class: 'hsira tab' }, row ? ` · ${c.v.rows.indexOf(row) + 1}/${c.v.rows.length}` : '')); this.adaCiz();
    return el('div', { class: 'sbar' }, grab, el('div', { class: 'srow' }, c.v.rampa && row && row.row_key === c.v.rampa.rowKey ? el('button', { class: 'pill', title: 'Isınma rampasına dön', onclick: () => this.fazSet('isinma') }, 'Isınma') : null));   // 28 Eyl: Isınma yalnız rampanın hareketinde; Hazırım çubukta küçük düğme   // 29 Eyl: "Bitir" buradan kalktı (yanlışlıkla seansı kapatıyordu) → genel görünümün altında
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
    f.querySelector('.body')?.classList.toggle('hidden', c); f.querySelector('.ttl')?.classList.toggle('hidden', !c);
    f.querySelector('.oz')?.classList.toggle('hidden', !c); f.querySelector('.kmini')?.classList.toggle('hidden', !c); f.querySelector('.modeb')?.classList.toggle('hidden', c);
    const g = f.querySelector('.grab .gt'); if (g) g.textContent = c ? '▴  aç' : '▾  katla';
  }
  async logBar(c, r) {
    const { def, v, p } = c; const draftKey = `draft:${p}|${def.cycle}|${v.week}|${v.day}|${r.row_key}`;
    const d = (await S.getMeta(draftKey)) ?? { actor: 'arda', kg: null, sets: null, reps: null, rpe: null, note: null, mode: 'set', detail: [] };
    d.mode = 'set'; d.detail ??= []; d.notes ??= { arda: d.note ?? null, alper: null };   // T4 (26 Eyl): set-set tek mod; H1: not kişi başına
    // 29 Eyl (Arda: "kalp atışı set ekranında, her set için başlarken ve bitirirken"): nabız setin kendisine yazılır {hr_bas, hr_son}.
    // Eski kayıtlar (dinlenme panelinden, sonraki sete yazılmış hr_once / hr_sonra_onceki) okunurken aynı anlama çevrilir — veri dönüştürülmez.
    const hrBasOf = x => x?.hr_bas ?? x?.hr_once ?? null;
    const hrSonOf = i => d.detail[i]?.hr_son ?? d.detail[i + 1]?.hr_sonra_onceki ?? null;
    let yaziyor = false;
    const planKg = () => d.actor === 'alper' ? r.onerilen_alper : r.onerilen;
    const cur = () => d.actor === 'alper' ? r.alper : r.arda;
    // A28: d.kg = GİRDİĞİN sayı (dumbbell başına / pim / vücuda ek); toplam yük kaydederken hesaplanır
    const E = () => this.ekipOf(r); const bwOf = () => this.vucutOf(d.actor);
    const bwMod = () => E().tip === 'bw' && bwOf() !== null;   // ek yük (+) / destek (−) girişi; vücut bilinmiyorsa eski gibi toplam
    const toplamOf = g => { if (!M.isNum(g)) return null; const e = E(); return e.tip === 'bw' ? (bwMod() ? M.toplamYuk(g, 'bw', 1, bwOf()) : g) : M.toplamYuk(g, e.tip, e.carpan); };
    const setAlanlari = g => { const e = E(); const t = toplamOf(g); return e.tip === 'bw' && !bwMod() ? { kg: t, ekip: 'bw', carpan: 1 } : { kg: t, kg_g: g, ekip: e.tip, carpan: e.carpan, ...(bwMod() ? { bw: bwOf() } : {}) }; };   // kırmızı takım A28-4: her yeni sette ekipman izi (vücut bilinmiyorsa kg_g yok = toplam girildi)
    const isaret = () => M.isNum(d.kg) && d.kg !== 0 ? (d.kg < 0 ? -1 : 1) : (d.bwIs ?? 1);   // kırmızı takım A28-5: iOS ondalık klavyede eksi yok → ek yük / destek düğmesi
    const parseG = v => { if (!bwMod()) return M.parseKg(v); const x = M.parseKgIsaretli(v); return x === null ? null : /^[-−–+]/.test(String(v).trim()) ? x : isaret() * x; };
    const gFmt = g => g === null || g === undefined ? '—' : bwMod() ? (g > 0 ? `+${fmt(g)}` : g < 0 ? `−${fmt(-g)}` : '0') : fmt(g);
    const planG = () => { const pk = planKg(); if (!M.isNum(pk)) return null; const e = E(); return e.tip === 'bw' ? (bwMod() ? M.girilenYuk(pk, 'bw', 1, bwOf()) : pk) : M.girilenYuk(pk, e.tip, e.carpan); };
    const girOf = rec => { if (!rec || rec.skipped) return null; const det = rec.sets_detail?.filter(x => M.isNum(x.kg)) ?? []; const x = det.length ? det.reduce((a, b) => b.kg > a.kg ? b : a) : { kg: rec.kg }; return this.girilenOf(r, E(), x, rec, d.actor); };
    const prevE = P.prevEntry(c.stateAll, r, v, def.cycle); const prevA = def.program === 'Alper' ? P.prevEntry(c.stateAll, r, v, def.cycle, 'alper') : null;
    const prevOf = () => d.actor === 'alper' ? prevA : prevE;
    const fill = () => { yaziyor = false; const q = cur(); d.kg = girOf(q) ?? planG() ?? girOf(prevOf()) ?? null; d.sets = q?.sets ?? r.set ?? null; d.reps = q?.reps ?? r.tekrar ?? null; d.rpe = q?.rpe ?? null; d.notes[d.actor] = q?.note ?? d.notes[d.actor] ?? null; d.note = d.notes[d.actor]; };
    const yukle = () => { const q = cur(); d.details ??= {}; d.detail = d.details[d.actor]?.length ? d.details[d.actor] : (q?.sets_detail?.length && !q.skipped ? q.sets_detail.map(x => ({ ...x })) : []); };   // kırmızı takım T1-2: bitmiş hareket yeniden açılınca kayıtlı setler yığına gelir (supersede eski setleri kaybetmez)
    if (d.kg === null && d.sets === null) { fill(); yukle(); }
    else if (d.gv !== 2 && M.isNum(d.kg)) d.kg = d.kg > 0 ? (this.girilenOf(r, E(), { kg: d.kg }, { program: p, cycle: def.cycle, week: v.week, day: v.day, actor: d.actor }, d.actor) ?? d.kg) : null;   // A28 öncesi taslak: kg toplamdı
    else if (d.gv === 2 && E().tip === 'bw' && d.bwm !== undefined && d.bwm !== bwMod() && M.isNum(d.kg)) d.kg = bwMod() ? M.girilenYuk(d.kg, 'bw', 1, bwOf()) : null;   // kırmızı takım A28-2: vücut kilosu eklendi/silindi → taslaktaki sayı anlamını değiştirmesin
    d.gv = 2;
    const saveDraft = () => S.setMeta(draftKey, { ...d, editIdx: null, yeni: null, editG: null, bwm: E().tip === 'bw' ? bwMod() : undefined });   // düzenleme modu yalnız bellekte (kırmızı takım T1-4)
    const ozet = () => d.mode === 'set' ? (d.detail.length ? `${d.detail.length} set · ${P.detayMetni(d.detail.slice(-2))}` : 'set set · henüz set yok') : `${d.kg === null ? '—' : fmt(d.kg)}×${d.sets ?? '—'}×${d.reps ?? r.tekrar_metin ?? '—'}${d.rpe ? ` R${fmt(d.rpe)}` : ''}`;
    // başlık + katla/aç
    const ozetS = el('span', { class: 'oz tab' + (this.logCollapsed ? '' : ' hidden') });
    const kaydetMini = el('button', { class: 'pill sel kmini' + (this.logCollapsed ? '' : ' hidden'), onclick: () => commit() }, 'Kaydet');
    const modeBtn = el('button', { class: 'pill modeb hidden', title: 'Giriş biçimi', onclick: async () => { d.mode = d.mode === 'set' ? 'satir' : 'set'; await S.setMeta('log_mode', d.mode); saveDraft(); paint(); } });
    const ttl = el('div', { class: 'ttl' + (this.logCollapsed ? '' : ' hidden') }, el('div', { class: 'n' }, r.egzersiz + (r.modifier ? ` · ${r.modifier}` : '')), modeBtn, ozetS, kaydetMini);   // 28 Eyl (sade): ad çarkta; başlık yalnız katlıyken
    const body = el('div', { class: 'body' + (this.logCollapsed ? ' hidden' : '') });
    // kişi
    let segBtns = [];
    let segEl = null; if (p === 'Alper') (segEl = el('div', { class: 'seg' }, ...(segBtns = ['arda', 'alper'].map(a => el('button', { class: d.actor === a ? 'sel' : '', onclick: () => { if (a === d.actor) return; d.details ??= {}; d.details[d.actor] = d.detail; d.editIdx = null; d.yeni = null; d.hrBas = null; d.hrSon = null; d.actor = a; fill(); yukle(); saveDraft(); paint(); this.kartAktor?.(r.row_key, d.actor); } }, a === 'arda' ? 'Arda' : 'Alper')))));   // kırmızı takım T1-1: setler kişi başına
    // kg + plaka
    const kgIn = el('input', { type: 'text', inputmode: 'decimal', autocomplete: 'off', enterkeyhint: 'done', placeholder: '—', class: 'tab' });
    const kgSub = el('div', { class: 'sub tab' });
    // 29 Eyl (Arda: "kg girdikten sonra tekrar/RPE girince kg bozuluyor"): yazılan değer her tuşta taslağa alınır; odaktayken yeniden boyama kutuya dokunmaz
    kgIn.addEventListener('input', () => { yaziyor = true; });   // kırmızı takım A27-5: yazarken ara değer ("1") taslağa yazılmaz; kaydederken kutudan okunur
    kgIn.addEventListener('change', () => { yaziyor = false; d.kg = parseG(kgIn.value); saveDraft(); paint(); });
    kgIn.addEventListener('blur', () => { yaziyor = false; });
    kgIn.addEventListener('keydown', e => { if (e.key === 'Enter') kgIn.blur(); });
    const step = n => { yaziyor = false; d.kg = Math.max(bwMod() ? -(bwOf() - 1) : 0, Math.round(((d.kg ?? planG() ?? 0) + n) * 100) / 100); if (d.kg) d.bwIs = d.kg < 0 ? -1 : 1; saveDraft(); paint(); };
    const plakaBtn = r.barli ? el('button', { class: 'plk-ic', title: 'Plaka hesabı', onclick: () => { this.sheet = { kind: 'plaka', kg: d.kg ?? planKg() ?? prevE?.kg ?? 20, aktar: kg => { d.kg = kg; saveDraft(); paint(); } }; this.renderSheet(); } }, '▬') : null;
    const eq = ekipman(r);
    body.append(el('div', { class: 'kgrow' }, hold(el('button', {}, '−'), k => step(-KG_ADIM * k)), el('div', { class: 'mid well', onclick: e => { if (e.target !== kgIn) { kgIn.focus(); kgIn.select?.(); } } }, kgIn, kgSub), hold(el('button', { class: 'plus' }, '+'), k => step(KG_ADIM * k))));
    const isBtns = [[1, '+ ek yük'], [-1, '− destek']].map(([k, t]) => el('button', { class: 'pill', 'data-is': k, onclick: () => { yaziyor = false; d.bwIs = k; if (M.isNum(d.kg)) d.kg = k * Math.abs(d.kg); saveDraft(); paint(); } }, t));
    const isRow = el('div', { class: 'bwis' }, ...isBtns); body.append(isRow);
    this._aktorSec = a => segBtns.find(b => b.textContent.toLowerCase() === a)?.click();   // R4-B: kişi seçimi kartın köşesinde (düğmeler bu kapanışı tetikler)
    // set / tekrar / rpe
    const setBtns = [1, 2, 3, 4, 5].map(n => el('button', { class: 'tab', onclick: () => { d.sets = n; saveDraft(); paint(); } }, n));
    const base = r.tekrar ?? 5; const reps = r.tekrar_metin ? [] : [base - 2, base - 1, base, base + 1, base + 2].filter(n => n >= 1);
    const repBtns = reps.map(n => el('button', { class: 'tab', onclick: () => { d.reps = n; saveDraft(); paint(); } }, n));
    const repIn = el('input', { type: 'text', inputmode: 'numeric', placeholder: r.tekrar_metin ?? '…', style: 'flex:none;width:54px;text-align:center', class: 'tab' });
    repIn.addEventListener('change', () => { d.reps = M.parseKg(repIn.value); saveDraft(); paint(); });
    const rpeBtns = RPE_LIST.map(n => el('button', { class: 'tab', onclick: () => { d.rpe = d.rpe === n ? null : n; saveDraft(); paint(); } }, fmt(n)));
    // set-set modu: kayıtlı setler listesi
    const setList = el('div', { class: 'sets hidden' });
    body.append(setList);
    const setFld = el('div', { class: 'fld' }, el('div', { class: 'lbl' }, 'Set'), el('div', { class: 'opts' }, ...setBtns)); body.append(setFld);
    // 28 Eyl (Arda: "tekrar ve RPE de set/hareket gibi saat seçici olsun, sabit düğmeler yok"): iOS saat seçici gibi iki dikey çark
    const repDeg = [null, ...Array.from({ length: Math.max(30, (r.tekrar ?? 0) + 10) }, (_, i) => i + 1)];
    // 28 Eyl (R4-B): tekrar | ♥ başta | ♥ sonda | RPE — dört yatay şerit, hepsi 44 pt. Nabız şeritleri varsayılan konumda (95 / 122) SOLUK durur;
    // dokunulmadıkça KAYDEDİLMEZ (varsayılan veri uydurmaz) — parmakla yakın değere kaydırılır ya da ortadakine dokunulur.
    const repPk = this.serit('tkr', [null, ...Array.from({ length: Math.max(30, (r.tekrar ?? 0) + 10) }, (_, i) => i + 1)], x => x === null ? (r.tekrar_metin ?? '—') : String(x), d.reps ?? null, x => { d.reps = x; saveDraft(); paint(); });
    const rpePk = this.serit('rpe', [null, ...RPE_LIST], x => x === null ? '—' : fmt(x), d.rpe ?? null, x => { d.rpe = x; saveDraft(); paint(); });
    const NABIZ = Array.from({ length: 201 }, (_, i) => i + 30);   // 30–230 (eski doğrulama ile aynı)
    const hbPk = this.serit('hrb', NABIZ, x => String(x), M.isNum(d.hrBas) ? d.hrBas : null, x => { d.hrBas = x; saveDraft(); paint(); }, { varsayilan: () => hrBasOf(d.detail[d.detail.length - 1]) ?? 95 });   // (a) önceki setin değerinde bekler
    const hsPk = this.serit('hrs', NABIZ, x => String(x), M.isNum(d.hrSon) ? d.hrSon : null, x => { d.hrSon = x; saveDraft(); paint(); }, { varsayilan: () => hrSonOf(d.detail.length - 1) ?? 122 });
    const kol = (pk, lbl) => el('div', { class: 'pkc' }, pk, el('div', { class: 'pkl' }, lbl));
    body.append(el('div', { class: 'pkrow h4' }, kol(repPk, 'tekrar'), kol(hbPk, '♥ başta'), kol(hsPk, '♥ sonda'), kol(rpePk, 'rpe' + (r.hedef_rpe ? ` · ${fmt(r.hedef_rpe)}` : ''))));
    // not (isteğe bağlı, düğmeyle açılır)
    const notOf = () => d.notes[d.actor] ?? null;
    // eylemler
    const hint = el('div', { class: 'xs warn hidden', style: 'margin-top:6px' });
    const kaydet = el('button', { class: 'pri', onclick: () => commit() });
    const skipBtn = el('button', { class: 'skip', onclick: () => commit({ skipped: true }) });
    const notBtn = el('button', { class: 'skip', title: 'Not', onclick: () => { this.sheet = { kind: 'not', kisi: d.actor, deger: notOf(), onSave: v => { d.notes[d.actor] = v; d.note = v; saveDraft(); paint(); } }; this.renderSheet(); } }, '✎');
    const setKaydet = el('button', { class: 'pri setk hidden', onclick: () => setEkle() }, 'Set kaydet');
    const delBtn = el('button', { class: 'skip hidden', title: 'Bu seti sil', onclick: async () => { if (!M.isNum(d.editIdx)) return; d.detail.splice(d.editIdx, 1); d.detail.forEach((y, j) => y.n = j + 1); d.editIdx = null; if (d.yeni) Object.assign(d, d.yeni); d.yeni = null; await saveDraft(); paint(); } }, 'Sil');
    // R4-B: görünür yalnız Kaydet (+ düzenlemede Sil) ve ⋯; atla / not / hareketi bitir ⋯ menüsünde (düğmeler DOM'da gizli durur, menü onları tetikler)
    const more = el('button', { class: 'more', title: 'Diğer', onclick: () => { this.sheet = { kind: 'menu', items: [
      { t: notOf() ? '✎ Notu düzenle' : '✎ Not ekle', fn: () => notBtn.click() },
      { t: skipBtn.textContent === '↺' ? '↺ Atlamayı geri al' : '⤼ Hareketi atla', fn: () => skipBtn.click() },
      { t: kaydet.title || 'Hareketi bitir', fn: () => kaydet.click(), off: kaydet.disabled },
      ...(v.rampa && r.row_key === v.rampa.rowKey ? [{ t: 'Isınma rampası', fn: () => this.fazSet('isinma') }] : []),
      { t: '↺ Seansı sıfırla (deneme kayıtlarını sil)', fn: () => { this.sheet = { kind: 'onay', baslik: 'Seans sıfırlansın mı?', metin: `Hafta ${v.week} ${P.GUN_AD[v.day]}: bu seansta uygulamadan girilen tüm setler silinir (iz kalır), seans baştan açılır. Excel'den gelen kayıtlara dokunulmaz.`, evet: 'Evet, sıfırla', fn: async () => {
        await S.resetSession(p, def.cycle, v.week, v.day); await S.setMeta(c.seansKey, null); await S.setMeta('aktif:' + p, null); this.krono = null; clearInterval(this.kronoIv); this._aktifCommit = null; this._aktifSahip = null; this.sync?.schedule(); this.msg = 'Seans sıfırlandı.'; this.render(); } }; this.renderSheet(); } },
    ] }; this.renderSheet(); } }, '⋯');
    const acts = el('div', { class: 'acts' }, delBtn, setKaydet, kaydet, more, el('span', { class: 'gizli' }, skipBtn, notBtn)); body.append(acts, hint);
    /** Set-set: bir seti taslağa ekle; öncesindeki gerçek mola = önceki set/kayıt/ısınmadan bu yana; sayaç = bu hareketin kendi kategorisi (setler arası). */
    const setEkle = async () => {
      if (yaziyor) { d.kg = parseG(kgIn.value); yaziyor = false; }
      for (const pk of [repPk, rpePk, hbPk, hsPk]) pk.flush();
      { const t = toplamOf(d.kg); if (d.kg === null || !(t > 0) || (!bwMod() && d.kg <= 0)) { hint.textContent = d.kg === null ? 'kg gir.' : bwMod() ? 'Toplam yük 0 ya da eksi olamaz — desteği azalt.' : '0 kg set kaydedilmez — kg gir.'; hint.classList.remove('hidden'); return; } }
      if (M.isNum(d.editIdx) && d.detail[d.editIdx]) {   // T1: yığındaki sete dokunuldu → düzenle (zaman/mola/nabız korunur)
        const hx = d.detail[d.editIdx]; if (d.kg !== d.editG) { for (const f of ['kg_g', 'ekip', 'carpan', 'bw']) delete hx[f]; Object.assign(hx, setAlanlari(d.kg)); } Object.assign(hx, { reps: d.reps, rpe: d.rpe }); d.editG = null; /* kırmızı takım A28-1: kg'ya dokunulmadıysa kayıtlı toplam/çarpan/vücut aynen kalır */ if (M.isNum(d.hrBas)) hx.hr_bas = d.hrBas; else delete hx.hr_bas; if (M.isNum(d.hrSon)) hx.hr_son = d.hrSon; else delete hx.hr_son; d.editIdx = null; if (d.yeni) Object.assign(d, d.yeni); d.yeni = null; hint.classList.add('hidden'); await saveDraft(); this.geriBildirim(); paint(); return;
      }
      const now = Date.now();
      const last = d.detail.length ? new Date(d.detail[d.detail.length - 1].ts).getTime() : (c.seans?.last_save_at ? new Date(c.seans.last_save_at).getTime() : (c.seans?.isinma_bitti_at ? new Date(c.seans.isinma_bitti_at).getTime() : null));
      d.detail.push({ n: d.detail.length + 1, ...setAlanlari(d.kg), reps: d.reps, rpe: d.rpe, rest_s: last ? Math.round((now - last) / 1000) : null, rest_plan_s: P.oncesiDinlenmeSn(r), ts: new Date(now).toISOString(), ...(M.isNum(d.hrBas) ? { hr_bas: d.hrBas } : {}), ...(M.isNum(d.hrSon) ? { hr_son: d.hrSon } : {}), ...this.kronoDinlenmeVerisi(c.seansKey, r.row_key) });
      d.rpe = null; d.hrBas = null; d.hrSon = null; hint.classList.add('hidden'); await saveDraft();
      // 29 Eyl (Arda: "fazla set giremiyorum, diğer harekete geçiyor"): plan dolunca hareket OTOMATİK BİTMEZ — ek set girilebilir; bitirmek ✓ Bitir ile (ya da başka harekete geçince setler kendiliğinden kaydedilir)
      this._yeniSet = true;
      this.kronoBaslat(c.seansKey, P.oncesiDinlenmeSn(r), `${r.egzersiz} · set ${d.detail.length + 1}`, r.row_key, { bitAd: `Set ${d.detail.length}`, basAd: `Set ${d.detail.length + 1}` });
      this.geriBildirim();
      paint(); this.render();   // seans şeridindeki rozet yenilensin (çubuk yerinde kalır, taslak meta'dan gelir)
    };
    /** T1+ (28 Eyl, Arda: "yığınlar kaydırılabilir olsun, dokun-geç değil"): set yığını iOS çark gibi — native kaydırma momentumu + snap,
     *  kartlar merkeze uzaklığa göre 3D döner/küçülür/solar; hangi kart ortada durursa o seçilir (bitmiş set → düzenle, en alt → yeni set). */
    // 29 Eyl (Arda: nabız "hareketten önce ve sonra" okunmalı): kartta O SETİN nabzı — başlamadan → bitince. Veri aynı yerde (sonraki set taşır), yalnız gösterim.
    const MOL = (x, i) => { if (!x) return ''; const bas = hrBasOf(x), son = hrSonOf(i);
      return [M.isNum(x.rest_s) ? `mola ${mmss(x.rest_s)}` : '', M.isNum(bas) || M.isNum(son) ? `♥ ${bas ?? '—'} → ${son ?? '—'}` : ''].filter(Boolean).join(' · '); };
    this.cizDeck = () => {
      const deck = this.main.querySelector('#deck'); if (!deck) return;
      const ed = M.isNum(d.editIdx) && d.detail[d.editIdx] ? d.editIdx : null;
      const kart = (i, n, v, r, cls) => el('div', { class: 'wc glass ' + cls, 'data-i': i }, el('span', { class: 'n' }, n), el('span', { class: 'v tab' }, v), el('span', { class: 'r' }, r));
      const items = [...d.detail.map((x, i) => kart(i, `set ${i + 1}`, `${P.kgMetni(x)} × ${x.reps ?? '?'}${M.isNum(x.rpe) ? ' · R' + fmt(x.rpe) : ''}`, MOL(x, i) || 'kaydı', 'done')),
        kart(d.detail.length, `set ${d.detail.length + 1}`, ed !== null && d.yeni ? `${gFmt(d.yeni.kg)} × ${d.yeni.reps ?? '?'}` : `${gFmt(d.kg)} × ${d.reps ?? '?'} · ${d.rpe ? 'R' + fmt(d.rpe) : 'R?'}`, 'şimdi', 'now')];
      const track = el('div', { class: 'wheel-track' }, el('div', { class: 'wsp' }), ...items, el('div', { class: 'wsp' }));
      deck.replaceChildren(track, el('div', { class: 'wsel' }), el('div', { class: 'deckplan xs dim2' }, `plan ${r.set ?? '?'} set · ${d.detail.length} kayıtlı`));
      const sec = idx => {
        if (idx === d.detail.length) { if (M.isNum(d.editIdx)) { if (d.yeni) Object.assign(d, d.yeni); d.editIdx = null; d.yeni = null; d.editG = null; } }
        else if (d.editIdx !== idx) { yaziyor = false; if (!M.isNum(d.editIdx)) d.yeni = { kg: d.kg, reps: d.reps, rpe: d.rpe, hrBas: d.hrBas ?? null, hrSon: d.hrSon ?? null }; const x = d.detail[idx]; d.editIdx = idx; d.kg = this.girilenOf(r, E(), x, null, d.actor) ?? x.kg; d.editG = d.kg; d.reps = x.reps; d.rpe = x.rpe ?? null; d.hrBas = hrBasOf(x); d.hrSon = hrSonOf(idx); }
        this._wheelBusy = true; paint(); this._wheelBusy = false; };
      if (this._yeniSet && this.main !== this.mainEl && d.detail.length) { items[d.detail.length - 1]?.classList.add('yeni'); this._yeniSet = false; }   // (f) kaydedilen set yerine kayarak gelir
      this.carkBagla(track, items, { ilk: ed ?? d.detail.length, sec, tmr: '_wheelTmr', aci: 24 });
    };
    const paint = () => {
      if (!yaziyor) kgIn.value = d.kg === null ? '' : bwMod() ? fmt(Math.abs(d.kg)) : gFmt(d.kg);
      isRow.classList.toggle('hidden', !bwMod()); isBtns.forEach(b => b.classList.toggle('sel', Number(b.dataset.is) === isaret()));
      const pk = planKg(); const yan = r.barli && d.kg ? P.plakaMetni(d.kg)?.replace('bir tarafa ', 'yan ') : null;   // 28 Eyl (sade): plan/geçen genel görünümde
      { const e = E(); const t = toplamOf(d.kg); const has = M.isNum(d.kg);
        kgSub.textContent = e.tip === 'db' ? (has ? `${e.carpan === 2 ? 'iki dumbbell' : 'tek dumbbell'} · toplam ${fmt(t)} kg` : 'dumbbell başına kg')
          : e.tip === 'kablo' && e.carpan === 2 ? (has ? `iki kablo · toplam ${fmt(t)} kg` : 'kablo başına') 
          : e.tip === 'bw' ? (!bwMod() ? (d.actor === 'alper' ? "toplam yük · Alper'in kilosu Ayarlar'da yok" : 'toplam yük') : has ? (d.kg === 0 ? `yalnız vücut · ${fmt(t)} kg` : `vücut ${fmt(bwOf())} ${d.kg > 0 ? '+' : '−'} ${fmt(Math.abs(d.kg))} = ${fmt(t)} kg`) : `ek yük (+) ya da destek (−) · vücut ${fmt(bwOf())}`)
          : yan ?? (pk !== null && pk !== undefined && pk !== d.kg ? `plan ${fmt(pk)}` : ' '); }
      segBtns.forEach(b => b.classList.toggle('sel', b.textContent.toLowerCase() === d.actor));
      setBtns.forEach((b, i) => b.classList.toggle('sel', d.sets === i + 1));
      repBtns.forEach((b, i) => b.classList.toggle('sel', d.reps === reps[i]));
      repIn.value = d.reps !== null && !reps.includes(d.reps) ? String(d.reps) : ''; repIn.classList.toggle('sel', d.reps !== null && !reps.includes(d.reps));
      rpeBtns.forEach((b, i) => b.classList.toggle('sel', d.rpe === RPE_LIST[i]));
      { const ed0 = M.isNum(d.editIdx) && d.detail[d.editIdx] ? d.editIdx : null; const n = (ed0 ?? d.detail.length) + 1;
        repPk.ayarla(d.reps ?? null); rpePk.ayarla(d.rpe ?? null); hbPk.ayarla(M.isNum(d.hrBas) ? d.hrBas : null); hsPk.ayarla(M.isNum(d.hrSon) ? d.hrSon : null);
        hbPk.title = `set ${n} başlarken nabız`; hsPk.title = `set ${n} bitince nabız`;
        const doldu = M.isNum(r.set) ? d.detail.length >= r.set : d.detail.length >= 1; kaydet.classList.toggle('gorunur', doldu && ed0 === null); acts.classList.toggle('doldu', doldu && ed0 === null);
        setKaydet.textContent = ed0 !== null ? `Set ${ed0 + 1}'i güncelle` : `${doldu ? 'Ek set' : 'Kaydet'} · set ${n} · ${(() => { const g = yaziyor ? parseG(kgIn.value) : d.kg; return gFmt(g); })()}×${d.reps ?? r.tekrar_metin ?? '?'}${M.isNum(d.rpe) ? ' · R' + fmt(d.rpe) : ''}`; }
      notBtn.classList.toggle('sel', !!notOf()); notBtn.textContent = notOf() ? '✎ not' : '✎';
      const setMode = d.mode === 'set';
      modeBtn.textContent = setMode ? 'Set set' : 'Tek satır'; modeBtn.classList.toggle('sel', setMode);
      setFld.classList.toggle('hidden', setMode); setList.classList.add('hidden'); setKaydet.classList.toggle('hidden', !setMode);
      setList.replaceChildren(...d.detail.map((x, i) => el('div', { class: 'srow-set' }, el('span', { class: 'sn' }, `${i + 1}`), el('span', { class: 'tab', style: 'flex:1' }, `${P.kgMetni(x)} × ${x.reps ?? '?'}${M.isNum(x.rpe) ? `  R${fmt(x.rpe)}` : ''}`), el('span', { class: 'xs dim tab' }, M.isNum(x.rest_s) ? `mola ${mmss(x.rest_s)}` : ''), el('button', { class: 'x', title: 'Sil', onclick: async () => { d.detail.splice(i, 1); d.detail.forEach((y, j) => y.n = j + 1); await saveDraft(); paint(); } }, '×'))),
        setMode ? el('div', { class: 'xs dim2', style: 'margin:2px 0 4px' }, d.detail.length ? `sıradaki set ${d.detail.length + 1} · plan ${r.set ?? '?'} set` : `set ${1} · plan ${r.set ?? '?'} set · her setten sonra "Set kaydet"`) : null);
      const ed = M.isNum(d.editIdx) && d.detail[d.editIdx] ? d.editIdx : null;
 delBtn.classList.toggle('hidden', ed === null); skipBtn.classList.toggle('hidden', ed !== null);
      if (!this._wheelBusy) this.cizDeck?.();
      this.kartPlaka?.(r.row_key, d.kg ?? planKg());
      const q = cur(); kaydet.textContent = setMode ? (d.detail.length ? `✓ ${d.detail.length}` : '✓') : (q && !q.skipped ? 'Güncelle' : 'Kaydet'); kaydet.title = setMode ? (d.detail.length ? `Hareketi bitir (${d.detail.length} set)` : 'Hareketi bitir') : ''; skipBtn.textContent = q?.skipped ? '↺' : '⤼'; skipBtn.title = q?.skipped ? 'Geri al' : 'Atla';
      kaydet.disabled = (setMode && !d.detail.length) || ed !== null; kaydet.classList.toggle('bitir', setMode);
      if (setMode && !d.detail.length) kaydet.title = 'Önce en az bir set kaydet';
      ozetS.textContent = ozet();
    };
    paint(); this.kartAktor?.(r.row_key, d.actor); this.kartPlaka?.(r.row_key, d.kg);
    const commit = async ({ skipped = false, sessiz = false, hedef = null } = {}) => {
      if (yaziyor && !d.detail.length) { d.kg = parseG(kgIn.value); yaziyor = false; }
      const q = cur();
      if (skipped && q?.skipped) { await S.appendEvent(await this.deleteEvent(r.ref, d.actor)); await S.setMeta(draftKey, null); this.sync?.schedule(); return this.render(); }
      const setMode = d.mode === 'set' && d.detail.length > 0;
      if (!skipped && !setMode && (d.kg === null || !(toplamOf(d.kg) > 0))) { hint.textContent = d.kg === 0 ? '0 kg kaydedilmez — yapılmadıysa "Atla", yapıldıysa kg gir.' : 'kg gir (ya da Atla).'; hint.classList.remove('hidden'); this.logCollapsed = false; this.applyCollapse(); return; }
      // gerçek dinlenme: bu seansta önceki kayıttan bu yana geçen süre; plan: bir önceki kayıtta kurulan sayaç
      const now = Date.now(); const last = c.seans?.last_save_at ? new Date(c.seans.last_save_at).getTime() : (c.seans?.isinma_bitti_at ? new Date(c.seans.isinma_bitti_at).getTime() : null);
      const rest_s = setMode ? (d.detail[0].rest_s ?? null) : (last ? Math.round((now - last) / 1000) : null); const rest_plan_s = P.oncesiDinlenmeSn(r);   // bu hareketin ÖNCESİ (set-set: ilk setin molası)
      const data = setMode ? { kg: null, sets: null, reps: null, reps_text: null, rpe: null, note: notOf(), sets_detail: d.detail.map(x => ({ n: x.n, kg: x.kg, ...(M.isNum(x.kg_g) ? { kg_g: x.kg_g } : {}), ...(x.ekip ? { ekip: x.ekip, carpan: x.carpan ?? 1 } : {}), ...(M.isNum(x.bw) ? { bw: x.bw } : {}), reps: x.reps, rpe: x.rpe, rest_s: x.rest_s, rest_plan_s: x.rest_plan_s, ts: x.ts, ...(M.isNum(x.hr_sonra_onceki) ? { hr_sonra_onceki: x.hr_sonra_onceki } : {}), ...(M.isNum(x.hr_once) ? { hr_once: x.hr_once } : {}), ...(M.isNum(x.hazir_s) ? { hazir_s: x.hazir_s } : {}), ...(M.isNum(x.hr_bas) ? { hr_bas: x.hr_bas } : {}), ...(M.isNum(x.hr_son) ? { hr_son: x.hr_son } : {}) })) }
        : { kg: toplamOf(d.kg), sets: d.sets, reps: d.reps, reps_text: r.tekrar_metin && d.reps === null ? r.tekrar_metin : null, rpe: d.rpe, note: notOf() };
      try { await S.logSet({ ref: r.ref, actor: d.actor, ...data, skipped, supersedes: q?.event_id ?? null, rest_s: skipped ? null : rest_s, rest_plan_s: skipped ? null : rest_plan_s }); }
      catch (e) { hint.textContent = 'Kaydedilemedi: ' + e.message; hint.classList.remove('hidden'); this.logCollapsed = false; this.applyCollapse(); return; }
      d.details ??= {}; d.details[d.actor] = []; const diger = Object.entries(d.details).find(([a, x]) => a !== d.actor && x?.length);
      if (diger) { d.actor = diger[0]; d.detail = diger[1]; d.hrBas = null; d.hrSon = null; await S.setMeta(draftKey, { ...d, editIdx: null, yeni: null }); } else { d.detail = []; await S.setMeta(draftKey, null); }   // diğer kişinin bekleyen setleri kaybolmaz
      this.sync?.schedule(); this.geriBildirim(); this.odakSayfa = 0;
      const rowsAfter = v.rows.map(x => x === r ? { ...x, tamam: true } : x); const nxt = hedef ?? P.sonrakiSatir(rowsAfter, rowsAfter[v.rows.indexOf(r)]);
      // 29 Eyl: son setten beri süren dinlenme SIFIRLANMAZ — sayaç sıradaki hareketin molasına yeniden hedeflenir (başlangıç aynı)
      const k0 = this.krono; const surer = k0 && k0.key === c.seansKey && k0.rowKey === r.row_key;
      if (!skipped && nxt) { if (surer) { const sn = P.oncesiDinlenmeSn(nxt); Object.assign(k0, { sn, end: k0.start + sn * 1000, ad: nxt.egzersiz, rowKey: nxt.row_key, altSn: sn >= 180 ? 180 : 0, bitti: false }); } else if (!sessiz) this.kronoBaslat(c.seansKey, P.oncesiDinlenmeSn(nxt), nxt.egzersiz, nxt.row_key, { bitAd: r.egzersiz, basAd: nxt.egzersiz }); }
      else if (!skipped && !sessiz) { this.krono = null; clearInterval(this.kronoIv); }
      const sonTs = setMode && d.detail.length ? d.detail[d.detail.length - 1].ts : null;
      c.seans = { ...c.seans, ...(sessiz ? {} : { openKey: null }), last_save_at: skipped ? c.seans?.last_save_at ?? null : (sonTs ?? new Date(now).toISOString()) }; await S.setMeta(c.seansKey, c.seans);
      if (!sessiz) { this._kaydir = { from: v.rows.indexOf(r) }; this.render(); }
    };
    // Başka harekete / özete geçerken yerleşmiş setler kendiliğinden kaydedilir (taslakta set kalmaz — veri kaybı olmaz)
    // kırmızı takım A27-2/3: tek uçuş (çift dokunuş iki kez yazmaz) + sahiplik (eski kapanış başka seansın taslağını yazamaz)
    const sahip = draftKey; this._aktifSahip = sahip;
    this._aktifCommit = (hedef = null) => this._acUcus ??= (async () => { try {
      if (this._aktifSahip !== sahip || this.c?.seansKey !== c.seansKey || !(await S.getMeta(draftKey))) return 0;
      let n = 0, k = 0; while (d.detail?.length && k++ < 3) { const a = d.actor, once = d.detail.length; await commit({ sessiz: true, hedef }); if (d.detail?.length && d.actor === a) break; n += once; } return n;
    } finally { this._acUcus = null; } })();
    return [ttl, body];
  }
  /** A28: ekipman seçimi (kartın etiketine dokununca) — hareket için bir kez; sonraki setler buna göre toplanır, kayıtlı setler kendi çarpanıyla kalır. */
  ekipSec(r) {
    const cur = this.ekipOf(r); const SEC = [['db', 2, 'Dumbbell · iki el (sağ-sol dahil)', 'dumbbell başına kg gir'], ['db', 1, 'Dumbbell · tek dumbbell', ''], ['kablo', 1, 'Kablo · tek yük', 'pimdeki sayı'], ['kablo', 2, 'Kablo · iki ayrı yük', 'bir taraftaki sayı'], ['bw', 1, 'Vücut ağırlığı', 'ek yük (+) / destek (−)'], ['bar', 1, 'Barbell', 'toplam, plaka gösterilir'], ['makine', 1, 'Makine', 'göstergedeki sayı'], ['serbest', 1, 'Diğer', 'girdiğin = toplam']];
    this.sheet = { kind: 'menu', items: SEC.map(([tip, carpan, ad, alt]) => ({ t: `${cur.tip === tip && cur.carpan === carpan ? '✓ ' : ''}${ad}${alt ? ' — ' + alt : ''}`, fn: async () => {
      this.ekipOv = { ...(this.ekipOv ?? {}), [r.egzersiz]: { tip, carpan } }; await S.setMeta('ekip_ov', this.ekipOv); this.msg = `${r.egzersiz}: ${ad}`; this.render(); } })) };
    this.renderSheet();
  }
  async deleteEvent(ref, actor) {
    return { id: S.ulid(), ts: new Date().toISOString(), ts_kind: 'device', device: await S.deviceId(), entered_by: 'arda', type: 'set.deleted', ref, schema_v: 1, source: { kind: 'app' }, data: { actor } };
  }
  /** Geri bildirim: iOS'ta vibrate yok → kısa görsel flaş + (izin varsa) kısa bip. */
  geriBildirim(kind = 'ok') {
    try { navigator.vibrate?.(kind === 'ok' ? 12 : [80, 60, 80]); } catch {}
    if (kind !== 'alarm') return;   // 28 Eyl (Arda: "bir şey çakmasın"): yalnız sayaç bitiminde flaş; kayıt/geçişte görsel flaş yok
    const f = el('div', { class: 'flash ' + kind }); document.body.append(f); setTimeout(() => f.remove(), 420);
    // Arda 23 Eyl: sayaç bitiminde yalnız görsel flaş (bip yok)
  }
  bip() {
    try { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; this.ac ??= new AC(); const o = this.ac.createOscillator(), g = this.ac.createGain(); o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(this.ac.destination); o.start(); o.stop(this.ac.currentTime + 0.18); const o2 = this.ac.createOscillator(); o2.frequency.value = 1175; o2.connect(g); o2.start(this.ac.currentTime + 0.22); o2.stop(this.ac.currentTime + 0.4); } catch {}
  }
  /** iOS 16.4+: seans sırasında ekran uyumasın (dinlenme sayacı görünür kalsın). */
  async wakeLock(on) {
    if (this._kuru) return;
    try { if (on && !this.wl && navigator.wakeLock) { this.wl = await navigator.wakeLock.request('screen'); this.wl.addEventListener('release', () => { this.wl = null; }); } else if (!on && this.wl) { await this.wl.release(); this.wl = null; } } catch {}
  }
  /** P1 (Arda 27 Eyl): sayaç süreleri kalır; ağır/top/backoff setlerde "Hazırım" 3:00'ten önce açılmaz (alt sınır); set sonrası ve set öncesi nabız elle (isteğe bağlı).
   *  Bu dinlenme verisi bir SONRAKİ sete yazılır: {hr_sonra_onceki, hr_once, hazir_s}. Bellekte tutulur (uygulama yenilenirse bu dinlenmenin nabzı kaybolur — set kayıtları kaybolmaz). */
  kronoBaslat(key, sn, ad, rowKey = null, { bitAd = null, basAd = null } = {}) { clearInterval(this.kronoIv); this._sonHazir = null; this.krono = { key, rowKey, bitAd, basAd, end: Date.now() + sn * 1000, sn, ad, start: Date.now(), altSn: sn >= 180 ? 180 : 0, hrSonra: null, hrOnce: null, hazirS: null }; this.kronoIv = setInterval(() => this.kronoTick(), 500); }
  // kırmızı takım: nabız yalnız sayacın ait olduğu satıra yazılır
  kronoDinlenmeVerisi(key, rowKey) { const sh = this._sonHazir; this._sonHazir = null; if (!this.krono && sh && sh.key === key && sh.rowKey === rowKey) return { hazir_s: sh.hazirS }; const k = this.krono; if (!k || k.key !== key || !k.rowKey || k.rowKey !== rowKey) return {}; const o = {}; if (M.isNum(k.hrSonra)) o.hr_sonra_onceki = k.hrSonra; if (M.isNum(k.hrOnce)) o.hr_once = k.hrOnce; if (M.isNum(k.hazirS)) o.hazir_s = k.hazirS; return o; }
  kronoKalan() { const k = this.krono; return k ? Math.round((k.end - Date.now()) / 1000) : 0; }   // negatif = aşım
  kronoMetin(kalan) { return kalan >= 0 ? mmss(kalan) : '+' + mmss(-kalan); }
  bekleKapat() { this.bekle.classList.add('hidden'); this._sonDok = Date.now(); }
  bekleCiz(kalan) {
    const k = this.krono; const acik = !this.bekle.classList.contains('hidden');
    const uygun = k && this.tab === 'bugun' && this.c?.seans?.faz === 'log' && !this.sheet && document.visibilityState === 'visible';
    if (!uygun) { if (acik) this.bekle.classList.add('hidden'); return; }
    if (!acik && Date.now() - this._sonDok < 10000) return;
    if (!acik) { this.bekle.replaceChildren(el('div', { class: 'bk-t tab' }), el('div', { class: 'bk-a' }), el('div', { class: 'bk-b' }, ...this.kronoPanel().map(b => { const f = b.onclick; b.onclick = e => { e.stopPropagation(); f?.(e); this.bekleKapat(); }; return b; })), el('div', { class: 'bk-h' }, 'dokun → geri dön')); this.bekle.classList.remove('hidden'); }
    this.bekle.querySelector('.bk-t').textContent = this.kronoMetin(kalan); this.bekle.querySelector('.bk-a').textContent = `${k.ad ?? 'dinlenme'} · plan ${this.kronoMetin(k.sn)}`; this.bekle.classList.toggle('over', kalan < 0);
  }
  kronoTick() {
    const k = this.krono; if (!k) { this.bekle?.classList.add('hidden'); return clearInterval(this.kronoIv); }
    const kalan = this.kronoKalan(); this.bekleCiz(kalan);
    this.island.classList.toggle('over', kalan < 0);   // F1: süre dolunca ada kırmızı halka ile yavaşça nabız atar
    const pct = kalan >= 0 ? Math.round((1 - kalan / k.sn) * 100) : Math.min(100, Math.round((-kalan / k.sn) * 100));
    const pill = this.island.querySelector('#kpill') ?? this.foot.querySelector('#kpill') ?? this.hR.querySelector('#kpill'); if (pill) { pill.querySelector('.kt').textContent = this.kronoMetin(kalan); pill.classList.toggle('over', kalan < 0); pill.querySelector('.ring').style.setProperty('--pct', `${pct}%`); }
    const hz = this.island.querySelector('#khazir') ?? this.foot.querySelector('#khazir'); if (hz && !M.isNum(k.hazirS)) { const g = Math.round((Date.now() - k.start) / 1000); hz.disabled = g < k.altSn; hz.textContent = g < k.altSn ? `Hazırım · ${this.kronoMetin(k.altSn - g)}` : 'Hazırım'; }
    const big = this.main.querySelector('#krobig'); if (big) { big.textContent = this.kronoMetin(kalan); big.className = 'big tab ' + (kalan >= 0 ? 'on' : 'over'); }
    if (kalan === 0 && !k.bitti) { k.bitti = true; this.geriBildirim('alarm'); if (pill) { pill.classList.add('done'); setTimeout(() => { pill.classList.remove('done'); if (this.kronoBig) { this.kronoBig = false; pill.classList.remove('big'); } }, 1400); } }   // sayaç durmaz: aşım kırmızı sayar; büyükse nabız sonrası küçülür
  }
  /** Başlıktaki dinlenme rozeti: bağımsız, dokununca gizlenir (Geç). */
  kronoPill() {
    const k = this.krono; if (!k) return null; const kalan = this.kronoKalan();
    // 28 Eyl (Arda): ada BÜYÜMEZ; yalnız dokunuşta hafifçe küçülür. Pil = halka + süre (+ hareket adı)
    return el('span', { id: 'kpill', class: 'kpill' + (kalan < 0 ? ' over' : '') },
      el('span', { class: 'ring', style: `--pct:${kalan >= 0 ? Math.round((1 - kalan / k.sn) * 100) : 100}%` }),
      el('span', { class: 'kbody' }, el('span', { class: 'kt tab' }, this.kronoMetin(kalan)), el('span', { class: 'kad' }, k.ad ?? 'dinlenme')));
  }
  adaCiz() { if (this._kuru) return; const k = this.krono; this._islandSet = true; if (!k) { this.island.classList.remove('over'); this.island.replaceChildren(); this.island.classList.add('hidden'); return; } this.island.replaceChildren(this.kronoPill(), ...this.kronoPanel()); this.island.classList.remove('hidden'); }
  /** Ada düğmeleri (28 Eyl, Arda): top/ağır molalarında (plan ≥ 5 dk) önce "Hazırım" (3:00 alt sınır), basınca yerine "Molayı bitir";
   *  diğer molalarda yalnız "Molayı bitir". Bitir sayacı kapatır (set kayıtları ve ölçülen gerçek mola etkilenmez). */
  kronoPanel() {
    const k = this.krono; if (!k) return [];
    const gecen = () => Math.round((Date.now() - k.start) / 1000);
    const bitir = el('button', { class: 'abtn bitir', id: 'kbitir', onclick: () => { const k0 = this.krono; if (k0 && M.isNum(k0.hazirS)) this._sonHazir = { key: k0.key, rowKey: k0.rowKey, hazirS: k0.hazirS }; this.krono = null; clearInterval(this.kronoIv); this.adaCiz(); } }, 'Molayı bitir');   // kırmızı takım A26-3: hazir_s kaybolmaz
    if (k.sn < 300 || M.isNum(k.hazirS)) return [bitir];
    const hz = el('button', { class: 'abtn hazir', id: 'khazir', disabled: gecen() < k.altSn, onclick: () => { if (gecen() < k.altSn) return; k.hazirS = gecen(); this.adaCiz(); } }, 'Hazırım');
    return [hz];
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
    // 29 Eyl (Arda: "seansı kapatıp diğer seansa atlıyor"): kapat düğmesi açılışta 0,8 sn kilitli (üst üste dokunuş geçmesin);
    // girilmemiş hareket varsa iki adım: ilk dokunuş uyarır, 4 sn içinde ikinci dokunuş kapatır.
    const eksik = v.rows.filter(r => !r.tamam).length; const acildi = Date.now(); let onay = 0;
    if (eksik) m.prepend(el('div', { class: 'banner warn', style: 'margin:0 0 10px' }, `${eksik} hareket girilmedi. Kapatınca seans bitti sayılır ve sıradaki seansa geçilir.`));
    const kapat = el('button', { class: 'pri', style: 'flex:1', onclick: async () => {
      if (Date.now() - acildi < 800) return;
      if (eksik && Date.now() - onay > 4000) { onay = Date.now(); kapat.textContent = `Eksik ${eksik} hareket — kapatmak için tekrar dokun`; kapat.classList.add('warnb'); setTimeout(() => { if (kapat.isConnected && Date.now() - onay >= 4000) { kapat.textContent = 'Kaydet ve kapat'; kapat.classList.remove('warnb'); } }, 4100); return; }
      const dur = c.seans?.started_at ? Math.round((Date.now() - new Date(c.seans.started_at)) / 1000) : null;
      await S.logSession('finished', { program: c.p, cycle: c.def.cycle, week: v.week, day: v.day, duration_s: dur, note: (this.ozet?.note ?? '').trim() || null });
      await S.setMeta(c.seansKey, null); await S.setMeta('aktif:' + c.p, null); this.ozet = null; this.krono = null; this.sync?.schedule(); this.mainEl.scrollTop = 0;
      if (this.kilit[c.p]) { delete this.kilit[c.p]; await S.setMeta('kilit', this.kilit); }   // H5 (26 Eyl): kilitli seans bitince kilit kalkar → sıradaki seans
      if (this.needRefresh) { setTimeout(() => this.needRefresh(), 400); }
      this.render();
    } }, 'Kaydet ve kapat');
    this.footer('foot', el('button', { class: 'sec', style: 'flex:none;min-height:52px', onclick: () => this.fazSet('log') }, 'Geri'), kapat);
  }
  // ── PROGRAM (hafta × gün ızgarası) ───────────────────────────────
  async rProgram(c) {
    const { def, p, state } = c; this.head(`${def.cycle} · ${[...new Set(def.rows.map(r => r.week))].length} hafta`, 'Program');
    const ss = P.sessions(def, c.ov); const gunler = [...new Set(ss.map(s => s.day))]; const weeks = [...new Set(ss.map(s => s.week))];
    const sel = this.progSel[p] ?? c.idx;
    const m = el('div', { class: 'pop' }); this.main.append(m);
    const top = ss.reduce((a, s) => a + s.rows.filter(r => r.tamam).length, 0);
    m.append(el('div', { class: 'small mute', style: 'line-height:1.45' }, `${weeks.length} hafta · ${ss.length} seans · aktif seans ${c.idx}. Bir güne dokun: içerik altta açılır.`));
    const takvimDisi = s => { const e = c.sev.filter(x => x.week === s.week && x.day === s.day).slice(-1)[0]; return !!e && P.todayKey(new Date(e.ts)) !== s.day; };   // P6
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
          el('div', { class: 'd' }, `S${s.idx}`), el('div', { class: 'm' }, main?.egzersiz ?? ''), el('div', { class: 'kg tab' }, main?.onerilen ? `${fmt(main.onerilen)} kg` : ''), el('div', { class: 'st' }, (tam ? '✓ tamam' : dolu ? `${n}/${s.rows.length}` : s.idx === c.idx ? 'sırada' : '') + (takvimDisi(s) ? ' ↻' : ''))));
      }
      grid.append(row);
    }
    m.append(grid);
    const s = ss.find(x => x.idx === sel);
    if (s) {
      const v = P.sessionView(def, state, s.idx, c.ov, c.stateAll); const sub = { ...c, v };
      const fin = c.sev.filter(e => e.kind === 'finished' && e.week === s.week && e.day === s.day).slice(-1)[0];
      const bas = c.sev.filter(e => e.kind === 'started' && e.week === s.week && e.day === s.day).slice(-1)[0];
      const tar = fin ?? bas; if (tar) { const d = new Date(tar.ts); const gk = P.todayKey(d); const disi = gk !== s.day;
        m.append(el('div', { class: 'xs ' + (disi ? 'warn' : 'dim'), style: 'margin-top:8px' }, `${fin ? 'Yapıldı' : 'Başlandı'}: ${d.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}${disi ? ` · takvim dışı (plan ${P.GUN_AD[s.day]})` : ''}`)); }
      m.append(el('div', { class: 'h', style: 'margin-top:16px' }, el('div', { class: 'k' }, `Seans ${s.idx} · Hafta ${s.week} ${P.GUN_AD[s.day]}`), el('div', { class: 'xs dim2 tab' }, `${v.tamamlanan}/${v.rows.length}`)));
      m.append(el('div', { class: 'grid', style: 'margin-top:8px' }, ...v.rows.map(r => this.rowCard(sub, r, { open: true }))));
      if (fin?.note) m.append(el('div', { class: 'prev', style: 'margin-top:8px' }, 'Seans notu: ' + fin.note));
      m.append(el('div', { class: 'btnrow' }, s.idx !== c.idx ? el('button', { onclick: async () => { await this._aktifCommit?.(); this.kilit[p] = s.idx; await S.setMeta('kilit', this.kilit); this.tab = 'bugun'; this.render(); } }, `Bu seansı Bugün'de aç`) : el('button', { disabled: true }, 'Aktif seans'), this.kilit[p] ? el('button', { class: 'sec', onclick: async () => { delete this.kilit[p]; await S.setMeta('kilit', this.kilit); this.render(); } }, 'Kilidi kaldır') : null));
      const appN = v.rows.filter(r => r.tamam).length;
      if (appN) m.append(el('button', { class: 'sec', style: 'width:100%;margin-top:8px;color:var(--red);border-color:#6a3030', onclick: async () => {
        if (!confirm(`Seans ${s.idx} (H${s.week} ${P.GUN_AD[s.day]}) app kayıtları silinsin mi? Göç/Excel verisi silinmez; takvim bu güne geri çekilir. Silme olay olarak yazılır (geri alınabilir değil).`)) return;
        const n = await S.resetSession(p, def.cycle, s.week, s.day); await S.setMeta(`seans:${p}|${def.cycle}|${s.week}|${s.day}`, null); await S.setMeta('aktif:' + p, null); this._aktifCommit = null; this._aktifSahip = null; this.krono = null; this.sync?.schedule(); this.msg = `Seans ${s.idx}: ${n} app kaydı silindi, seans yeniden açıldı.`; this.tab = 'bugun'; delete this.kilit[p]; await S.setMeta('kilit', this.kilit); this.render();
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
  /** (j) Kart içi küçük plaka görseli (tek taraf, IWF renkleri). */
  plakaMini(kg) {
    const t = M.isNum(kg) ? P.plakaMetni(kg) : null; const m = t && /bir tarafa [\d.]+: (.*?)(?:\s*\(|$)/.exec(t); const ps = [];
    if (m) for (const x of m[1].split(' + ')) { const mm = /^(?:(\d+)×)?([\d.]+)$/.exec(x.trim()); if (mm) for (let i = 0; i < (+mm[1] || 1); i++) ps.push(+mm[2]); }
    if (!ps.length) return el('div', { class: 'kpt tab' }, t ?? '');
    const pl = w => el('i', { class: 'pl w' + String(w).replace('.', '_') }, el('b', {}, fmt(w)));
    return el('div', { class: 'kpv' }, el('div', { class: 'barviz mini' }, el('span', { class: 'sleeve l' }, ...ps.slice().reverse().map(pl)), el('span', { class: 'shaft' }), el('span', { class: 'sleeve r' }, ...ps.map(pl))), el('div', { class: 'kpt tab' }, `tek taraf ${ps.map(fmt).join(' + ')}`));
  }
  plakaBlok(kg0, onChange, aktar = null) {
    let kg = kg0; const big = el('input', { type: 'text', inputmode: 'decimal', class: 'big tab', autocomplete: 'off', enterkeyhint: 'done' }); const plates = el('div', { class: 'plates' }); const not = el('div', { class: 'xs dim2', style: 'margin-top:6px' });
    big.addEventListener('change', () => { const v = M.parseKg(big.value); if (v !== null) set(v); else paint(); }); big.addEventListener('keydown', e => { if (e.key === 'Enter') big.blur(); });
    const viz = el('div', { class: 'barviz' });
    const cizBar = t => { const m = t && /bir tarafa [\d.]+: (.*?)(?:\s*\(|$)/.exec(t); const ps = [];
      if (m) for (const x of m[1].split(' + ')) { const mm = /^(?:(\d+)×)?([\d.]+)$/.exec(x.trim()); if (mm) for (let i = 0; i < (+mm[1] || 1); i++) ps.push(+mm[2]); }
      const pl = (w, i) => el('i', { class: 'pl w' + String(w).replace('.', '_'), style: `--i:${i}` }, el('b', {}, fmt(w)));
      viz.replaceChildren(el('span', { class: 'sleeve l' }, ...ps.slice().reverse().map((w, i) => pl(w, ps.length - 1 - i))), el('span', { class: 'shaft' }, el('em', {}, `${fmt(kg)} kg`)), el('span', { class: 'sleeve r' }, ...ps.map((w, i) => pl(w, i)))); };
    const paint = () => { big.value = fmt(kg); const t = P.plakaMetni(kg); cizBar(t); plates.replaceChildren(); not.textContent = '';
      if (!t) { not.textContent = 'kg gir'; return; }
      if (t.startsWith('sadece') || t.startsWith('bar altı')) { plates.append(el('span', { class: 'p' }, t)); return; }
      const [, yan, rest] = /bir tarafa ([\d.]+): (.*)$/.exec(t) ?? []; const parts = (rest ?? '').replace(/\s*\(.*\)$/, '').split(' + ');
      plates.append(el('span', { class: 'p n' }, `tek taraf ${yan}`), ...parts.map(x => el('span', { class: 'p' }, x))); const ek = /\((.*)\)/.exec(t); not.textContent = ek ? `Tek tarafta ${ek[1].replace('−', '')} açık kalıyor (plaka seti 25/20/15/10/5/2.5/1.25).` : 'Bar 20 kg dahil.'; };
    const set = v => { kg = Math.max(0, Math.round(v * 100) / 100); onChange?.(kg); paint(); };
    paint();
    return el('div', {}, el('div', { class: 'plk' }, hold(el('button', {}, '−'), k => set(kg - KG_ADIM * k)), el('div', { class: 'mid' }, big, el('div', { class: 'sub' }, 'bar 20 kg · çift taraf · ✎ sayıya dokun-yaz')), hold(el('button', { class: 'plus' }, '+'), k => set(kg + KG_ADIM * k))), viz, plates, not,
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
    // A28: vücut ağırlığı — BW hareketlerinde toplam = vücut + ek yük (ya da − destek); sette o günkü değer saklanır, geçmiş kaymaz
    m.append(el('div', { class: 'k', style: 'margin:18px 0 8px' }, 'Vücut ağırlığı'));
    const bwList = el('div', { class: 'list' });
    for (const [a, ad] of [['arda', 'Arda'], ['alper', 'Alper']]) { const inp = el('input', { type: 'text', inputmode: 'decimal', id: 'bw-' + a, autocomplete: 'off', placeholder: '—', class: 'tab', style: 'width:72px;text-align:right' }); inp.value = M.isNum(this.vucut?.[a]) ? fmt(this.vucut[a]) : '';
      inp.addEventListener('change', async () => { const v = M.parseKg(inp.value); if (inp.value.trim() && (v === null || v < 30)) { this.msg = 'Vücut ağırlığı 30 kg\'dan büyük bir sayı olmalı.'; return this.render(); } this.vucut = { ...(this.vucut ?? {}), [a]: v, ...(a === 'alper' ? { alperElle: v === null } : {}) }; await S.setMeta('vucut_kg', this.vucut); this.msg = `${ad}: ${v === null ? 'silindi' : fmt(v) + ' kg'}`; this.render(); });
      bwList.append(el('div', { class: 'it' }, el('span', { style: 'min-width:0' }, el('span', { class: 'a' }, ad), el('span', { class: 's' }, 'barfiks, dips gibi harekette yalnız ek yükü girersin')), el('span', { class: 'v' }, inp, ' kg'))); }
    m.append(bwList);
    m.append(el('div', { class: 'k', style: 'margin:18px 0 8px' }, 'Deneme kayıtları'));
    const sifirla = el('div', { class: 'list' });
    for (const p of PROGS) { const def = this.defs[p]; if (!def) continue; const ss = await S.appSessions(p, def.cycle); const n = ss.reduce((a, x) => a + x.n, 0);
      sifirla.append(el('div', { class: 'it' }, el('span', { style: 'min-width:0' }, el('span', { class: 'a' }, PROG_AD[p]), el('span', { class: 's' }, n ? `${ss.length} seansta ${n} app kaydı (göç verisi hariç)` : 'app kaydı yok')),
        n ? el('button', { class: 'pill', style: 'color:var(--red);border-color:#6a3030', onclick: async () => {
          if (!confirm(`${PROG_AD[p]} ${def.cycle}: ${ss.length} seanstaki ${n} app kaydı silinsin, seanslar yeniden açılsın mı? Göç/Excel verisi kalır.`)) return;
          let t = 0; for (const x of ss) { t += await S.resetSession(p, def.cycle, x.week, x.day); await S.setMeta(`seans:${p}|${def.cycle}|${x.week}|${x.day}`, null); } await S.setMeta('aktif:' + p, null); this._aktifCommit = null; this._aktifSahip = null; this.krono = null; this.sync?.schedule(); this.msg = `${PROG_AD[p]}: ${t} kayıt silindi.`; this.render();
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
      box.append(el('div', { class: 'stres' }, ...[1, 2, 3, 4, 5].map(n => el('button', { class: val === n ? 'sel' : '', onclick: async () => { await S.logStress({ program: c.p, cycle: c.def.cycle, week: c.v.week, value: n }); this.sync?.schedule(); this.sheet = null; if (sh.sonra) await this.fazSet(this.baslangicFaz(c.v)); else this.render(); } }, el('b', {}, n), el('span', {}, STRES_AD[n - 1])))));
      box.append(el('div', { class: 'btnrow', style: 'margin-top:12px' }, el('button', { class: 'sec', onclick: async () => { this.sheet = null; if (sh.sonra) await this.fazSet(this.baslangicFaz(c.v)); else this.renderSheet(); } }, sh.sonra ? 'Şimdi değil' : 'Kapat')));
    } else if (sh.kind === 'onay') {
      box.classList.add('menu');
      box.append(el('div', { class: 't' }, sh.baslik), el('div', { class: 'sub' }, sh.metin),
        el('button', { class: 'mi tehlike', onclick: async () => { this.sheet = null; this.renderSheet(); await sh.fn(); } }, sh.evet),
        el('button', { class: 'mi iptal', onclick: () => { this.sheet = null; this.renderSheet(); } }, 'Vazgeç'));
    } else if (sh.kind === 'menu') {
      box.classList.add('menu');
      box.append(...sh.items.map(it => el('button', { class: 'mi', disabled: !!it.off, onclick: () => { this.sheet = null; this.renderSheet(); it.fn(); } }, it.t)),
        el('button', { class: 'mi iptal', onclick: () => { this.sheet = null; this.renderSheet(); } }, 'Vazgeç'));
    } else if (sh.kind === 'not') {
      const ta = el('textarea', { placeholder: 'his, aksaklık, gelecek haftaya…', enterkeyhint: 'done' }); ta.value = sh.deger ?? '';
      box.append(el('div', { class: 't' }, `Not · ${sh.kisi === 'alper' ? 'Alper' : 'Arda'}`), el('div', { class: 'sub' }, 'Bu harekete, bu kişiye ait. Kaydet ile birlikte olaya yazılır.'), ta,
        el('div', { class: 'btnrow' }, el('button', { class: 'sec', onclick: () => { this.sheet = null; this.renderSheet(); } }, 'Vazgeç'), el('button', { class: 'pri', style: 'flex:1', onclick: () => { sh.onSave(ta.value.trim() || null); this.sheet = null; this.renderSheet(); } }, 'Tamam')));
      setTimeout(() => ta.focus(), 50);
    } else if (sh.kind === 'plaka') {
      box.append(el('div', { class: 'h' }, el('div', { class: 't' }, 'Plaka hesabı'), el('div', { class: 'small dim' }, 'loglama çubuğundan')), this.plakaBlok(sh.kg ?? 20, null, sh.aktar));
    }
    this.veil.append(el('div', { class: 'veil', onclick: e => { if (e.target === e.currentTarget) { this.sheet = null; this.renderSheet(); } } }, box));
  }
}
