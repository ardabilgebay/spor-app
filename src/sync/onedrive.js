// UZAK DEPO — OneDrive AppFolder (Microsoft Graph) · cihaz-başına NDJSON · MSAL SPA/PKCE (mimari.md §B2-B4)
// Arayüz (Remote): login(), status(), push(events) → yüklenen id'ler, pullAll() → NDJSON metinleri. Başka uzak (Supabase) aynı arayüzü uygular.
import { PublicClientApplication, InteractionRequiredAuthError } from '@azure/msal-browser';

const SCOPES = ['User.Read', 'Files.ReadWrite.AppFolder'];
const GRAPH = 'https://graph.microsoft.com/v1.0';

export class OneDriveRemote {
  constructor({ clientId, tenantId, redirectUri, deviceId }) {
    this.cfg = { clientId, tenantId, redirectUri }; this.deviceId = deviceId; this.pca = null; this.account = null;
  }
  get configured() { return !!(this.cfg.clientId && this.cfg.tenantId); }
  async init() {
    if (!this.configured) return false;
    this.pca = new PublicClientApplication({
      auth: { clientId: this.cfg.clientId, authority: `https://login.microsoftonline.com/${this.cfg.tenantId}`, redirectUri: this.cfg.redirectUri, navigateToLoginRequestUrl: false },
      cache: { cacheLocation: 'localStorage' },       // iOS standalone: sessionStorage yönlendirmede kaybolabiliyor
    });
    await this.pca.initialize();
    const res = await this.pca.handleRedirectPromise();     // yönlendirmeden dönüş
    this.account = res?.account ?? this.pca.getAllAccounts()[0] ?? null;
    return !!this.account;
  }
  async login() { await this.pca.loginRedirect({ scopes: SCOPES, prompt: 'select_account' }); }   // popup değil — iOS standalone
  async logout() { await this.pca.logoutRedirect({ account: this.account }); }
  async token() {
    if (!this.account) throw new Error('not_signed_in');
    try { return (await this.pca.acquireTokenSilent({ scopes: SCOPES, account: this.account })).accessToken; }
    catch (e) { if (e instanceof InteractionRequiredAuthError) throw new Error('reauth_required'); throw e; }
  }
  async graph(path, opts = {}) {
    const tok = await this.token();
    const r = await fetch(GRAPH + path, { ...opts, headers: { Authorization: `Bearer ${tok}`, ...(opts.headers ?? {}) } });
    const srv = r.headers.get('date'); if (srv) { const skew = Date.parse(srv) - Date.now(); if (Number.isFinite(skew)) this.clockSkewMs = skew; }   // KIRMIZI TAKIM 2: cihaz saati sapması
    if (r.status === 404) return null;
    if (r.status === 412) throw Object.assign(new Error('precondition_failed'), { code: 412 });
    if (!r.ok) throw new Error(`graph_${r.status}: ${await r.text().catch(() => '')}`);
    return r.status === 204 ? null : (r.headers.get('content-type')?.includes('json') ? r.json() : r.text());
  }
  monthKey(ts) { return String(ts).slice(0, 7); }
  filePath(month) { return `/me/drive/special/approot:/events/${this.deviceId}/${month}.ndjson`; }

  /** Bekleyen olayları cihazın aylık dosyalarına ekler. Dosya tamamen yeniden PUT edilir (mevcut içerik + yeni). 4 MB altı tek PUT (atomik). */
  async push(events) {
    const byMonth = new Map();
    for (const e of events) { const m = this.monthKey(e.ts); if (!byMonth.has(m)) byMonth.set(m, []); byMonth.get(m).push(e); }
    const uploaded = [];
    for (const [m, evs] of byMonth) {
      // KIRMIZI TAKIM 5: kayıp güncellemeye karşı ETag + If-Match; 412'de yeniden oku ve tekrar dene (en çok 3)
      for (let deneme = 0; ; deneme++) {
        const meta = await this.graph(this.filePath(m) + '?$select=eTag,size');
        const cur = meta ? ((await this.graph(this.filePath(m) + ':/content')) ?? '') : '';
        const have = new Set(cur.split('\n').filter(Boolean).map(l => { try { return JSON.parse(l).id; } catch { return null; } }));
        const add = evs.filter(e => !have.has(e.id));
        if (!add.length) break;
        const body = cur + (cur && !cur.endsWith('\n') ? '\n' : '') + add.map(e => JSON.stringify(e)).join('\n') + '\n';
        if (new Blob([body]).size > 4 * 1024 * 1024) throw new Error('file_too_large_use_upload_session');
        try { await this.graph(this.filePath(m) + ':/content', { method: 'PUT', headers: { 'Content-Type': 'text/plain', ...(meta?.eTag ? { 'If-Match': meta.eTag } : {}) }, body }); break; }
        catch (e) { if (e.code === 412 && deneme < 3) continue; throw e; }
      }
      uploaded.push(...evs.map(e => e.id));
    }
    return uploaded;
  }
  /** Tüm cihazların tüm dosyalarını indir → NDJSON metinleri (id ile birleştirme store'da). */
  /** MİMAR: yalnız eTag'i değişen dosyaları indir (etags: Map<"dev/dosya", eTag>, çağıran saklar). */
  async pullAll(etags = new Map()) {
    const root = await this.graph('/me/drive/special/approot:/events:/children?$select=name,id');
    const out = [];
    for (const d of root?.value ?? []) {
      const files = await this.graph(`/me/drive/special/approot:/events/${d.name}:/children?$select=name,eTag`);
      for (const f of files?.value ?? []) {
        if (!f.name.endsWith('.ndjson')) continue;
        const k = `${d.name}/${f.name}`; if (etags.get(k) === f.eTag) continue;
        out.push({ device: d.name, name: f.name, eTag: f.eTag, key: k, text: await this.graph(`/me/drive/special/approot:/events/${d.name}/${f.name}:/content`) ?? '' });
      }
    }
    return out;
  }
  async status() {
    if (!this.configured) return { mode: 'yok', account: null };
    if (!this.account) return { mode: 'giris_gerekli', account: null };
    try { await this.token(); return { mode: 'hazir', account: this.account.username }; }
    catch (e) { return { mode: e.message === 'reauth_required' ? 'yeniden_giris' : 'hata', account: this.account.username, err: e.message }; }
  }
}
