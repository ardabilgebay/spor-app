import { chromium } from 'playwright'; import { readFileSync } from 'node:fs';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'tr-TR', timezoneId: 'Europe/Istanbul' });
const fx = readFileSync('../faz1/fixtures/telefon_20260928_aksam.ndjson', 'utf8');
await ctx.route('**/events.ndjson', r => r.fulfill({ status: 200, contentType: 'application/x-ndjson', body: fx }));
const p = await ctx.newPage(); p.on('pageerror', e => console.log('PAGEERROR', e.message));
await p.clock.setFixedTime(new Date('2026-09-29T07:05:00+03:00'));
await p.goto('http://localhost:4173/spor-app/'); await p.waitForSelector('.hdr .t'); await p.waitForTimeout(800);
console.log('açılış', await p.textContent('.hdr .t'), await p.textContent('.strip button.sel'));
await p.locator('.strip button', { hasText: 'Diğer' }).click(); await p.waitForTimeout(400);
console.log('diğer', await p.textContent('.hdr .t'));
await p.locator('.foot button.pri').click(); await p.waitForTimeout(400);
if (await p.locator('.sheet .stres button').count()) { await p.locator('.sheet .stres button').nth(2).click(); await p.waitForTimeout(500); }
for (let i = 0; i < 5; i++) { if (await p.locator('main .isirow').count()) { console.log('ısınma'); break; }
  const k = p.locator('.log .kgrow input'); if (!(await k.count())) { console.log('kg yok'); break; }
  await p.locator('.log .setk').click(); await p.waitForTimeout(700); console.log('set', i + 1, '|', await p.textContent('.hdr .t'), '|', (await p.textContent('main .xslide.on .xcard').catch(() => '')).slice(0, 60)); }
for (const btn of ['pri']) { await p.locator('.foot button.'+btn).click(); await p.waitForTimeout(700); console.log('ısınma sonrası', await p.textContent('.hdr .t'), '|', (await p.textContent('main .xslide.on .xcard').catch(()=>'')).slice(0,60)); }
for (let i = 0; i < 3; i++) { const k = p.locator('.log .kgrow input'); if (!(await k.count())) { console.log('kg yok', await p.textContent('.hdr .t'), (await p.textContent('main')).slice(0,120)); break; }
  await p.locator('.log .setk').click(); await p.waitForTimeout(700); console.log('set+', i + 1, '|', await p.textContent('.hdr .t'), '|', (await p.textContent('main .xslide.on .xcard').catch(() => '')).slice(0, 60)); }
await p.reload(); await p.waitForTimeout(1500); console.log('yenile', await p.textContent('.hdr .t'), await p.textContent('.strip button.sel').catch(()=>'-'));
await b.close();
