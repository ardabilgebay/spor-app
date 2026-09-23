// OLAY DEPOSU — IndexedDB (Dexie). Kaynak gerçek = salt-ekleme `events`; ekranlar türetilmiş tabloları okur.
// mimari.md §A/§B. Kural: "kaydedildi" = IndexedDB commit'i döndü. RAM değil.
import Dexie from 'dexie';

export const SCHEMA_V = 1;
export const db = new Dexie('spor');
db.version(1).stores({
  events: 'id, ts, type, [ref.program+ref.cycle+ref.week+ref.day], device',
  set_state: 'key, program, [program+cycle+week+day], event_id',      // key = program|cycle|week|day|row_key|actor
  sync_state: 'event_id, state',                            // state: local | uploaded
  program_defs: 'key, program',                             // key = program|cycle
  meta: 'k',
});

// ── ULID ───────────────────────────────────────────────────────────────
const B32 = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export function ulid(now = Date.now()) {
  let t = now, enc = '';
  for (let i = 0; i < 10; i++) { enc = B32[t % 32] + enc; t = Math.floor(t / 32); }
  const r = new Uint8Array(10); globalThis.crypto.getRandomValues(r);
  let rs = ''; let n = 0n; for (const b of r) n = (n << 8n) | BigInt(b);
  for (let i = 0; i < 16; i++) { rs = B32[Number(n & 31n)] + rs; n >>= 5n; }
  return enc + rs;
}

export async function deviceId() {
  const m = await db.meta.get('device_id');
  if (m) return m.v;
  const v = 'dev_' + ulid().slice(-10).toLowerCase();
  await db.meta.put({ k: 'device_id', v });
  return v;
}
const setKey = (ref, actor) => [ref.program, ref.cycle, ref.week, ref.day, ref.row_key, actor].join('|');
const tsOf = e => e.ts;

/** Bir olayı yaz (append). Aynı id varsa yazmaz (idempotent). Dönüş: {written:boolean}. Türetilmiş durumu aynı transaction'da günceller. */
export async function appendEvent(ev, { fromRemote = false } = {}) {
  return db.transaction('rw', db.events, db.set_state, db.sync_state, async () => {
    if (await db.events.get(ev.id)) return { written: false };
    await db.events.add(ev);
    await db.sync_state.put({ event_id: ev.id, state: fromRemote ? 'uploaded' : 'local' });
    await applyToState(ev);
    return { written: true };
  });
}

/** Yeni set olayı üret + yaz. Girdi sayılar önceden ayrıştırılmış olmalı (parseKg vb.). */
/** Set-set detaydan satır alanlarını türet (A6): sets = adet, kg = mod (eşitlikte büyük), reps = mod (eşitlikte küçük), rpe = son dolu set. Detay verbatim kalır. */
export function aggregateDetail(detail) {
  const d = (detail ?? []).filter(x => x && isNumber(x.kg));
  if (!d.length) return null;
  const mode = (arr, tieHigh) => { const m = new Map(); for (const v of arr) m.set(v, (m.get(v) ?? 0) + 1); return [...m].sort((a, b) => b[1] - a[1] || (tieHigh ? b[0] - a[0] : a[0] - b[0]))[0][0]; };
  const reps = d.map(x => x.reps).filter(isNumber);
  const rpes = d.map(x => x.rpe).filter(isNumber);
  // ANTRENÖR (23 Eyl): kg = top set (max) — mod, 3×100+1×120'de 120'yi gizliyordu; rpe = SON setin RPE'si (girilmemişse null; önceki setin RPE'si "son set" sayılmaz)
  return { kg: Math.max(...d.map(x => x.kg)), sets: d.length, reps: reps.length ? mode(reps, false) : null, rpe: isNumber(d[d.length - 1].rpe) ? d[d.length - 1].rpe : null };
}
const isNumber = v => typeof v === 'number' && Number.isFinite(v);
export async function logSet({ ref, actor = 'arda', kg, sets, reps, reps_text = null, rpe, note = null, skipped = false, entered_by = 'arda', supersedes = null, rest_s = null, rest_plan_s = null, sets_detail = null }) {
  if (sets_detail?.length) {
    if (sets_detail.some(x => !isNumber(x.kg) || x.kg <= 0)) throw new Error('set-set: her setin kg>0 olmalı (A6-2)');   // KIRMIZI TAKIM 4
    const a = aggregateDetail(sets_detail); if (a) { kg = a.kg; sets = a.sets; reps = a.reps; rpe = a.rpe; reps_text = null; }
  }
  if (skipped) { kg = 0; rpe = null; }   // KIRMIZI TAKIM 23 Eyl: atlanan sette RPE anlamsız (Excel'de boş) — taşınmaz; K25 freni 0 kg öneremez
  if (kg === 0 && !skipped) throw new Error('kg=0 yalnız skipped=true ile (A6-2)');
  if (reps !== null && reps !== undefined && reps_text) throw new Error('reps ve reps_text aynı anda dolu olamaz');
  const ev = {
    id: ulid(), ts: new Date().toISOString(), ts_kind: 'device', device: await deviceId(), entered_by,
    type: supersedes ? 'set.corrected' : 'set.logged', ref, schema_v: SCHEMA_V, source: { kind: 'app' },
    data: { actor, kg: kg ?? null, sets: sets ?? null, reps: reps ?? null, reps_text, rpe: rpe ?? null, note, skipped, ...(supersedes ? { supersedes } : {}), ...(rest_s !== null ? { rest_s } : {}), ...(rest_plan_s !== null ? { rest_plan_s } : {}), ...(sets_detail?.length ? { sets_detail } : {}) },
  };
  await appendEvent(ev);
  return ev;
}
export async function logStress({ program, cycle, week, value }) {
  const ev = { id: ulid(), ts: new Date().toISOString(), ts_kind: 'device', device: await deviceId(), entered_by: 'arda', type: 'stress.logged', ref: null, schema_v: SCHEMA_V, source: { kind: 'app' }, data: { program, cycle, week, value } };
  await appendEvent(ev); return ev;
}
export async function logSession(kind, { program, cycle, week, day, duration_s = null, note = null }) {
  const ev = { id: ulid(), ts: new Date().toISOString(), ts_kind: 'device', device: await deviceId(), entered_by: 'arda', type: `session.${kind}`, ref: null, schema_v: SCHEMA_V, source: { kind: 'app' }, data: { program, cycle, week, day, duration_s, note } };
  await appendEvent(ev); return ev;
}

/** Türetilmiş durum: set_state LWW (ts, sonra id). Eski olay silinmez; state yalnız en güncelini gösterir + kayıt sayısı. */
async function applyToState(ev) {
  if (!ev.type.startsWith('set.')) return;
  const key = setKey(ev.ref, ev.data.actor);
  const cur = await db.set_state.get(key);
  // KIRMIZI TAKIM 2: yanlış (ileri) saatli cihazın olayı sıralamada 'şimdi'ye kelepçelenir — olayın kendi ts'i değişmez, yalnız LWW sırası
  const nowIso = new Date().toISOString(); const effTs = tsOf(ev) > nowIso ? nowIso : tsOf(ev);
  const newer = !cur || effTs > cur.ts || (effTs === cur.ts && ev.id > cur.event_id);
  const count = (cur?.count ?? 0) + 1;
  if (ev.type === 'set.deleted') {
    if (newer) await db.set_state.put({ key, ...ev.ref, actor: ev.data.actor, deleted: true, event_id: ev.id, ts: effTs, count });
    else await db.set_state.update(key, { count });
    return;
  }
  if (newer) await db.set_state.put({ key, program: ev.ref.program, cycle: ev.ref.cycle, week: ev.ref.week, day: ev.ref.day, row_key: ev.ref.row_key, actor: ev.data.actor,
    kg: ev.data.kg, sets: ev.data.sets, reps: ev.data.reps, reps_text: ev.data.reps_text, rpe: ev.data.rpe, note: ev.data.note, skipped: ev.data.skipped, rest_s: ev.data.rest_s ?? null, rest_plan_s: ev.data.rest_plan_s ?? null, sets_detail: ev.data.sets_detail ?? null,
    ts: effTs, ts_kind: ev.ts_kind, event_id: ev.id, count, deleted: false });
  else if (cur) await db.set_state.update(key, { count });
}

/** Tüm türetilmiş durumu olaylardan yeniden kur (şema göçü / doğrulama). */
export async function rebuildState() {
  await db.set_state.clear();
  const evs = await db.events.orderBy('ts').toArray();
  for (const e of evs) await applyToState(e);
  return evs.length;
}

/** NDJSON içe aktar (migrasyon / yedekten geri yükleme / uzak cihaz dosyası). İdempotent. */
export async function importNdjson(text, { fromRemote = false } = {}) {
  let written = 0, skipped = 0, bad = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let ev; try { ev = JSON.parse(line); } catch { bad++; continue; }
    if (!ev.id || !ev.type || !ev.ts) { bad++; continue; }
    if (ev.type.startsWith('set.') && (!ev.ref?.program || !ev.ref?.row_key || !ev.data?.actor)) { bad++; continue; }   // KIRMIZI TAKIM 3: bozuk satır kalanı durdurmaz
    try { const r = await appendEvent(ev, { fromRemote }); r.written ? written++ : skipped++; } catch (e) { bad++; console.warn('importNdjson satır atlandı', ev.id, e.message); }
  }
  return { written, skipped, bad };
}
/** Dışa aktar: tüm olaylar NDJSON (ts sıralı). */
export async function exportNdjson() {
  const evs = await db.events.orderBy('ts').toArray();
  return evs.map(e => JSON.stringify(e)).join('\n') + (evs.length ? '\n' : '');
}
/** Senkron bekleyenler. */
export async function pendingEvents() {
  const ids = (await db.sync_state.where('state').equals('local').toArray()).map(s => s.event_id);
  return db.events.bulkGet(ids).then(a => a.filter(Boolean).sort((x, y) => x.ts < y.ts ? -1 : 1));
}
export async function markUploaded(ids) { await db.sync_state.bulkPut(ids.map(event_id => ({ event_id, state: 'uploaded' }))); }

/** Seans için geçerli set durumları. */
export async function setsFor(program, cycle, week, day) {
  return db.set_state.where('[program+cycle+week+day]').equals([program, cycle, week, day]).toArray();
}
/** Programın TÜM cycle'larındaki durum (önceki seans / geçmiş için). */
export async function stateAllFor(program) { return db.set_state.where('program').equals(program).toArray(); }
/** Seans olayları (started/finished) → [{kind, week, day, ts, note, duration_s}] */
export async function sessionEvents(program, cycle) {
  const evs = await db.events.where('type').anyOf('session.started', 'session.finished').filter(e => e.data.program === program && e.data.cycle === cycle).sortBy('ts');
  return evs.map(e => ({ kind: e.type.slice(8), week: e.data.week, day: e.data.day, ts: e.ts, note: e.data.note ?? null, duration_s: e.data.duration_s ?? null }));
}
export async function stateFor(program, cycle) {
  return db.set_state.where('program').equals(program).filter(s => s.cycle === cycle).toArray();
}
/** Bir ref+actor için tüm geçmiş olaylar (denetim izi). */
export async function historyFor(ref, actor) {
  return db.events.where('[ref.program+ref.cycle+ref.week+ref.day]').equals([ref.program, ref.cycle, ref.week, ref.day])
    .filter(e => e.type.startsWith('set.') && e.ref.row_key === ref.row_key && e.data.actor === actor).sortBy('ts');
}
/** Kol varyant override'ları (arm_variant.set, LWW ts) → Map<"week|day", varyant|null>. null = takvime dön. */
export async function armVariants(program, cycle) {
  const evs = await db.events.where('type').equals('arm_variant.set').filter(e => e.data.program === program && e.data.cycle === cycle).sortBy('ts');
  const m = new Map(); for (const e of evs) { const k = `${e.data.week}|${e.data.day}`; e.data.varyant ? m.set(k, e.data.varyant) : m.delete(k); } return m;
}
export async function logArmVariant({ program, cycle, week, day, varyant }) {
  const ev = { id: ulid(), ts: new Date().toISOString(), ts_kind: 'device', device: await deviceId(), entered_by: 'arda', type: 'arm_variant.set', ref: null, schema_v: SCHEMA_V, source: { kind: 'app' }, data: { program, cycle, week, day, varyant: varyant ?? null } };
  await appendEvent(ev); return ev;
}
/** Kapatılan seanslar (session.finished) → Set<"week|day">. */
export async function finishedSessions(program, cycle) {
  const evs = await db.events.where('type').anyOf('session.finished', 'session.reopened').filter(e => e.data.program === program && e.data.cycle === cycle).sortBy('ts');
  const set = new Set(); for (const e of evs) { const k = `${e.data.week}|${e.data.day}`; e.type === 'session.finished' ? set.add(k) : set.delete(k); } return set;
}
/** SIFIRLAMA (deneme kayıtları): bir seansın app kaynaklı set girişlerini set.deleted ile siler, seansı session.reopened ile açar. Göç verisine dokunmaz; denetim izi kalır. */
export async function resetSession(program, cycle, week, day, { onlyApp = true } = {}) {
  const st = await db.set_state.where('[program+cycle+week+day]').equals([program, cycle, week, day]).toArray();
  let n = 0;
  for (const s of st) {
    if (s.deleted) continue;
    const ev = await db.events.get(s.event_id); if (onlyApp && ev?.source?.kind !== 'app') continue;
    await appendEvent({ id: ulid(), ts: new Date().toISOString(), ts_kind: 'device', device: await deviceId(), entered_by: 'arda', type: 'set.deleted', ref: { program, cycle, week, day, row_key: s.row_key }, schema_v: SCHEMA_V, source: { kind: 'app', reason: 'reset' }, data: { actor: s.actor } }); n++;
  }
  await appendEvent({ id: ulid(), ts: new Date().toISOString(), ts_kind: 'device', device: await deviceId(), entered_by: 'arda', type: 'session.reopened', ref: null, schema_v: SCHEMA_V, source: { kind: 'app', reason: 'reset' }, data: { program, cycle, week, day } });
  for (const k of (await db.meta.toCollection().primaryKeys()).filter(k => String(k).startsWith(`seans:${program}|${cycle}|${week}|${day}`) || String(k).startsWith(`draft:${program}|${cycle}|${week}|${day}|`))) await db.meta.delete(k);
  return n;
}
/** Bu cycle'da app kaynaklı girişi olan seanslar → [{week, day, n}] */
export async function appSessions(program, cycle) {
  const st = await db.set_state.where('program').equals(program).filter(s => s.cycle === cycle && !s.deleted).toArray();
  const out = new Map();
  for (const s of st) { const ev = await db.events.get(s.event_id); if (ev?.source?.kind !== 'app') continue; const k = `${s.week}|${s.day}`; out.set(k, (out.get(k) ?? 0) + 1); }
  return [...out].map(([k, n]) => { const [w, d] = k.split('|'); return { week: +w, day: d, n }; });
}
export async function stressFor(program, cycle) {
  const evs = await db.events.where('type').equals('stress.logged').filter(e => e.data.program === program && e.data.cycle === cycle).sortBy('ts');
  const m = new Map(); for (const e of evs) m.set(e.data.week, e.data.value); return m;
}
export async function putProgramDef(def) { await db.program_defs.put({ key: `${def.program}|${def.cycle}`, program: def.program, cycle: def.cycle, def }); }
export async function getProgramDef(program, cycle) { return (await db.program_defs.get(`${program}|${cycle}`))?.def ?? null; }
export async function getMeta(k, dflt = null) { return (await db.meta.get(k))?.v ?? dflt; }
export async function setMeta(k, v) { await db.meta.put({ k, v }); }
