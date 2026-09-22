// N-VERSION — Python oracle (faz1/tools/oracle.py) ↔ JS (program.js weekly + motor satır hesapları). Aynı olaylar, aynı ProgramDef, iki bağımsız uygulama.
import 'fake-indexeddb/auto';
import { readFileSync, mkdtempSync } from 'node:fs'; import { execFileSync } from 'node:child_process'; import { tmpdir } from 'node:os'; import { join } from 'node:path';
import * as S from '../src/store.js'; import * as P from '../src/program.js'; import * as M from '../src/motor.js';
let ok = 0, fail = 0; const t = (n, c, d = '') => c ? ok++ : (fail++, console.log('  ✗', n, d));
const near = (a, b) => (a === null && b === null) || (M.isNum(a) && M.isNum(b) && Math.abs(a - b) < 1e-6);
const root = new URL('../../faz1/', import.meta.url).pathname;
const evPath = process.argv[2] ?? join(root, 'migrasyon/out/events.ndjson');
const out = join(mkdtempSync(join(tmpdir(), 'oracle-')), 'oracle_out.json');
execFileSync('python3', [join(root, 'tools/oracle.py'), '--events', evPath, '--defs', new URL('../data/', import.meta.url).pathname, '--out', out], { stdio: 'inherit' });
const O = JSON.parse(readFileSync(out, 'utf8'));
await S.importNdjson(readFileSync(evPath, 'utf8'));
for (const p of ['Deadlift', 'Alper', 'Diger']) {
  const def = JSON.parse(readFileSync(new URL(`../data/programdef_${p}.json`, import.meta.url), 'utf8'));
  const state = await S.stateFor(p, def.cycle); const cfg = M.CONFIG[p];
  const wk = P.weekly(def, state); const ow = O[p].weekly;
  t(`${p} hafta sayısı`, wk.length === ow.length, `${wk.length} vs ${ow.length}`);
  for (const o of ow) {
    const j = wk.find(w => w.week === o.week); if (!j) { t(`${p} H${o.week} JS'de yok`, false); continue; }
    for (const k of ['min', 'max', 'gercek', 'ortDeltaRpe']) t(`${p} H${o.week} ${k}`, near(j[k], o[k]), `js=${j[k]} py=${o[k]}`);
    t(`${p} H${o.week} doluGun`, j.doluGun === o.doluGun, `js=${j.doluGun} py=${o.doluGun}`);
    t(`${p} H${o.week} uyum`, j.uyum === o.uyum, `js=${j.uyum} py=${o.uyum}`);
    t(`${p} H${o.week} sinyal`, j.sinyal === o.sinyal, `js=${j.sinyal} py=${o.sinyal}`);
  }
  // satır bazında: motor fonksiyonları ↔ oracle rows
  for (const r of def.rows) {
    const o = O[p].rows.find(x => x.week === r.week && x.day === r.day && x.row_key === r.row_key);
    const s = state.find(x => x.week === r.week && x.day === r.day && x.row_key === r.row_key && x.actor === 'arda' && !x.deleted);
    const tekrar = r.tekrar ?? r.tekrar_metin;
    const ref = `${p} H${r.week} ${r.day} ${r.row_key}`;
    t(`${ref} bek`, near(M.beklenenHacim(r.onerilen, r.set, tekrar), o.beklenen_hacim));
    t(`${ref} max`, near(M.beklenenMax(r.metod, r.onerilen, r.set, tekrar, cfg.repeatMaxSets, cfg.maxSetMethods), o.beklenen_max));
    t(`${ref} ger`, near(s ? M.gercekHacim(s.kg, s.sets, s.reps) : null, o.gercek_hacim), `js=${s ? M.gercekHacim(s.kg, s.sets, s.reps) : null} py=${o.gercek_hacim}`);
    t(`${ref} dRPE`, near(s ? M.deltaRpe(s.rpe, r.hedef_rpe, r.week, r.modifier, cfg.excludedModifiersDeltaRpe) : null, o.delta_rpe));
  }
}
const keys = new Set(readFileSync(evPath, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(e => e.type.startsWith('set.')).map(e => `${e.ref.program}|${e.ref.cycle}|${e.ref.week}|${e.ref.day}|${e.ref.row_key}|${e.data.actor}`));
t('oracle set_state sayısı = olaylardaki (ref,actor) sayısı', O._meta.set_state === keys.size, `py=${O._meta.set_state} js=${keys.size}`);
console.log(`\n  ${ok}/${ok + fail} geçti — ${fail ? 'N-VERSION BASARISIZ' : 'N-VERSION GECTI'}`); process.exit(fail ? 1 : 0);
