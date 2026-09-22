// BOOT — sıra: depolama izni → program tanımları → migrasyon (ilk açılış) → uzak → UI → SW
import './style.css';
import * as S from './store.js';
import { App } from './ui/app.js';
import { OneDriveRemote } from './sync/onedrive.js';
import { Sync } from './sync/sync.js';
import defD from '../data/programdef_Deadlift.json';
import defA from '../data/programdef_Alper.json';
import defG from '../data/programdef_Diger.json';

const VERSION = __APP_VERSION__;
const CFG = { clientId: import.meta.env.VITE_MSAL_CLIENT_ID ?? '', tenantId: import.meta.env.VITE_MSAL_TENANT_ID ?? '', redirectUri: new URL(import.meta.env.BASE_URL, location.origin).href };

async function boot() {
  // 1) kalıcı depolama (iOS best-effort silmeye karşı) — sonucu kaydet, UI uyarır
  if (navigator.storage?.persist) { try { const ok = await navigator.storage.persist(); await S.setMeta('persist_granted', ok); } catch { await S.setMeta('persist_granted', false); } }
  // 2) program tanımları (paketle gelen; sürüm hash'i farklıysa güncelle)
  const defs = { Deadlift: defD, Alper: defA, Diger: defG };
  for (const d of Object.values(defs)) { const cur = await S.getProgramDef(d.program, d.cycle); if (!cur || cur.source?.sha256 !== d.source?.sha256) await S.putProgramDef(d); }
  // 3) ilk açılışta migrasyon olaylarını yükle (paketle gelir; idempotent)
  if (!(await S.getMeta('migrasyon_yuklendi'))) {
    try { const r = await fetch(new URL('events.ndjson', new URL(import.meta.env.BASE_URL, location.origin))).then(x => x.ok ? x.text() : ''); if (r) { const res = await S.importNdjson(r, { fromRemote: true }); await S.setMeta('migrasyon_yuklendi', res); } } catch {}
  }
  // 4) uzak + senkron
  const remote = new OneDriveRemote({ ...CFG, deviceId: await S.deviceId() });
  let signed = false; try { signed = await remote.init(); } catch (e) { console.warn('msal init', e); }
  const sync = new Sync(remote); sync.attach(); if (signed) sync.schedule(1500);
  // 5) UI
  const app = new App({ root: document.getElementById('app'), defs, sync, remote, version: VERSION });
  await app.start();
  // 6) SW — güncelleme yalnız kullanıcı isteğiyle (seans ortasında uygulanmaz)
  if ('serviceWorker' in navigator) {
    try { const { registerSW } = await import('virtual:pwa-register'); const updateSW = registerSW({ immediate: true, onNeedRefresh() { app.needRefresh = () => updateSW(true); if (app.tab === 'ayarlar') app.render(); } }); } catch {}
  }
}
boot().catch(e => { document.getElementById('app').textContent = 'Açılış hatası: ' + e.message; console.error(e); });
