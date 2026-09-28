import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
for (const n of process.argv.slice(2)) { await p.goto('file:///home/claude/spor/mockup/loop/' + n + '.html'); await p.waitForTimeout(200); await p.screenshot({ path: '/home/claude/spor/mockup/loop/' + n + '.png' }); }
await b.close();
