// OLAY DEPOSU TESTİ (fake-indexeddb) — append idempotent · LWW · import/export · 0-vs-null · rebuild
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import * as S from '../src/store.js';
let ok = 0, fail = 0;
const t = (name, cond, detay = '') => { cond ? ok++ : (fail++, console.log('  ✗', name, detay)); };

const ref = { program: 'Diger', cycle: 'C2', week: 1, day: 'Sal', row_key: 'Squat|Top Single' };
const e1 = await S.logSet({ ref, kg: 120, sets: 1, reps: 1, rpe: 8 });
t('kayıt yazıldı', (await S.setsFor('Diger', 'C2', 1, 'Sal')).length === 1);
const again = await S.appendEvent(e1); t('aynı id ikinci kez yazılmaz', again.written === false);
// LWW: düzeltme
await new Promise(r => setTimeout(r, 5));
const e2 = await S.logSet({ ref, kg: 122.5, sets: 1, reps: 1, rpe: 8.5, supersedes: e1.id });
const st = (await S.setsFor('Diger', 'C2', 1, 'Sal'))[0];
t('LWW en son kg', st.kg === 122.5, st.kg); t('count=2 (denetim izi)', st.count === 2);
t('geçmişte 2 olay', (await S.historyFor(ref, 'arda')).length === 2);
// 0 vs null
let threw = false; try { await S.logSet({ ref: { ...ref, row_key: 'X|' }, kg: 0 }); } catch { threw = true; } t('kg=0 skipped olmadan REDDEDİLİR', threw);
const sk = await S.logSet({ ref: { ...ref, row_key: 'Clean|' }, skipped: true, sets: 1, reps: 1 });
t('atlandı → kg 0 + skipped', sk.data.kg === 0 && sk.data.skipped === true);
const nl = await S.logSet({ ref: { ...ref, row_key: 'Y|' }, kg: null, rpe: 7 });
t('kg null korunur (girilmedi)', nl.data.kg === null);
// reps_text
threw = false; try { await S.logSet({ ref: { ...ref, row_key: 'Z|' }, kg: 15, reps: 5, reps_text: 'Trap Set' }); } catch { threw = true; } t('reps+reps_text birlikte REDDEDİLİR', threw);
// migrasyon import + idempotency
const nd = readFileSync(new URL('../../faz1/migrasyon/out/events.ndjson', import.meta.url), 'utf8');
const r1 = await S.importNdjson(nd); const r2 = await S.importNdjson(nd);
t('migrasyon 240 yazıldı', r1.written === 240, JSON.stringify(r1)); t('ikinci import 0 yazdı', r2.written === 0 && r2.skipped === 240, JSON.stringify(r2));
const w1 = await S.setsFor('Deadlift', 'W1', 2, 'Pzt'); t('W1 H2 Pzt setleri geldi', w1.length > 0, w1.length);
// export → yeniden import (yedek/geri yükleme)
const out = await S.exportNdjson(); t('export satır sayısı = olay sayısı', out.trim().split('\n').length === 240 + 4, out.trim().split('\n').length);
// rebuild
const n = await S.rebuildState(); const st2 = (await S.setsFor('Diger', 'C2', 1, 'Sal')).find(s => s.row_key === 'Squat|Top Single');
t('rebuild sonrası aynı LWW', st2.kg === 122.5 && st2.count === 2);
// sync durumu
const pend = await S.pendingEvents(); t('bekleyen = yerel olaylar (migrasyon dahil, uzak değil)', pend.length === 244, pend.length);
await S.markUploaded(pend.map(e => e.id)); t('işaretlendi → bekleyen 0', (await S.pendingEvents()).length === 0);
// stres
await S.logStress({ program: 'Deadlift', cycle: 'W2', week: 4, value: 2 });
t('stres haritası', (await S.stressFor('Deadlift', 'W2')).get(4) === 2);
console.log(`\n  ${ok}/${ok + fail} geçti — ${fail === 0 ? 'STORE TEST GECTI' : 'BASARISIZ'}`);
process.exit(fail ? 1 : 0);
