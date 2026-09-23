// SENKRON ORKESTRASYONU — push bekleyenler → pull tüm cihazlar → içe aktar. Loglama senkrona asla bağlı değil.
import * as S from '../store.js';

export class Sync {
  constructor(remote) { this.remote = remote; this.busy = false; this.timer = null; this.listeners = new Set(); this.last = { at: null, err: null, pushed: 0, pulled: 0 }; }
  on(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  emit() { for (const f of this.listeners) f(this.last); }
  schedule(ms = 10_000) { clearTimeout(this.timer); this.timer = setTimeout(() => this.run(), ms); }
  async run() {
    if (this.busy || !this.remote?.configured || !navigator.onLine) return;
    const st = await this.remote.status(); if (st.mode !== 'hazir') { this.last.err = st.mode; this.emit(); return; }
    this.busy = true;
    try {
      const pending = await S.pendingEvents();
      let pushed = 0;
      if (pending.length) { const ids = await this.remote.push(pending); await S.markUploaded(ids); pushed = ids.length; }
      let pulled = 0; const etags = new Map(Object.entries((await S.getMeta('od_etags')) ?? {}));
      for (const f of await this.remote.pullAll(etags)) { const r = await S.importNdjson(f.text, { fromRemote: true }); pulled += r.written; if (r.bad === 0) etags.set(f.key, f.eTag); }
      await S.setMeta('od_etags', Object.fromEntries(etags));
      this.last = { at: new Date().toISOString(), err: null, pushed, pulled, skewMs: this.remote.clockSkewMs ?? null };
      if (Math.abs(this.remote.clockSkewMs ?? 0) > 120_000) await S.setMeta('saat_sapmasi_ms', this.remote.clockSkewMs); else await S.setMeta('saat_sapmasi_ms', null);
      await S.setMeta('last_sync_at', this.last.at);
    } catch (e) { this.last = { ...this.last, err: e.message }; }
    finally { this.busy = false; this.emit(); }
  }
  attach() {
    window.addEventListener('online', () => this.schedule(1000));
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') this.schedule(1500); });
  }
}
