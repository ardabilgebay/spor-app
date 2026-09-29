// E2E — A28 ekipman: dumbbell başına giriş → toplam, vücut ağırlığına ek/destek, ekipman değiştirme, Ayarlar'da vücut kilosu, olayda kg=toplam + kg_g=girilen
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
const URL = 'http://localhost:4173/spor-app/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'tr-TR' });
const fx = readFileSync(new globalThis.URL('./fixtures/e2e_events.ndjson', import.meta.url), 'utf8');
await ctx.route('**/events.ndjson', r => r.fulfill({ status: 200, contentType: 'application/x-ndjson', body: fx }));
const p = await ctx.newPage(); p.on('dialog', d => d.accept()); const logs = []; p.on('pageerror', e => logs.push('PAGEERROR ' + e.message)); p.on('console', m => { if (m.type() === 'error') logs.push('CONSOLE ' + m.text()); });
let ok = 0, fail = 0; const t = (n, c, d = '') => { c ? ok++ : (fail++, console.log('  ✗', n, d)); };
const tab = name => p.locator('.tabs button', { hasText: name }).evaluate(b => b.click());
const kg = () => p.locator('.log .kgrow input'); const sub = () => p.textContent('.log .kgrow .sub');
const pick = async (ad, v) => { await p.locator(`.log .picker[data-ad="${ad}"] .hstrip`).evaluate((t, v) => { const it = t.querySelector(`.pk[data-v="${v}"]`); t.dispatchEvent(new Event('touchstart')); t.scrollLeft = it.offsetLeft + it.offsetWidth / 2 - t.clientWidth / 2; }, String(v)); await p.waitForTimeout(400); };
const git = async ad => { await p.waitForTimeout(1000); await p.locator('main .xcar').evaluate((t, ad) => { t.dispatchEvent(new Event('touchstart')); const it = [...t.querySelectorAll('.xslide')].find(s => s.querySelector('.v')?.textContent === ad); t.scrollLeft = it.offsetLeft + it.offsetWidth / 2 - t.clientWidth / 2; }, ad); await p.waitForTimeout(900); };
const olaylar = () => p.evaluate(() => new Promise(res => { const rq = indexedDB.open('spor'); rq.onsuccess = () => { const tx = rq.result.transaction('events'); const g = tx.objectStore('events').getAll(); g.onsuccess = () => res(g.result.filter(e => e.source?.kind === 'app' && e.type.startsWith('set.'))); }; }));
await p.goto(URL); await p.waitForSelector('.hdr .t', { timeout: 15000 });
await p.locator('.strip button', { hasText: 'Diğer Günler' }).click(); await p.waitForTimeout(300);
// Ayarlar: vücut ağırlığı varsayılan 90
await p.locator('.hdr .disli').click(); await p.waitForTimeout(400);
t('Ayarlar: vücut ağırlığı Arda 90, Alper boş', await p.locator('#bw-arda').inputValue() === '90' && await p.locator('#bw-alper').inputValue() === '');
await p.locator('#bw-arda').fill('20'); await p.locator('#bw-arda').dispatchEvent('change'); await p.waitForTimeout(300);
t('Ayarlar: 30 altı reddedildi, 90 kaldı', (await p.textContent('main')).includes('30 kg') && await p.locator('#bw-arda').inputValue() === '90');
await p.locator('.hdr .geri').click(); await p.waitForTimeout(300);
// H1 Perşembe'yi aç (Program → 2. hücre → Bugün'de aç), seansa başla
await tab('Program'); await p.waitForTimeout(400); await p.locator('.pgrid .cell').nth(1).click(); await p.waitForTimeout(400);
await p.locator('main button', { hasText: "Bugün'de aç" }).click(); await p.waitForTimeout(400);
await p.locator('.foot button.pri').click(); await p.waitForTimeout(300);
if (await p.locator('.sheet .stres button').count()) { await p.locator('.sheet .stres button').nth(2).click(); await p.waitForTimeout(400); }
if (!(await p.$$('.log')).length) { const g = p.locator('main button', { hasText: /Rampayı atla|Loga geç|Atla/ }).first(); if (await g.count()) await g.click(); await p.waitForTimeout(400); }
t('log fazı açık', (await p.$$('.log')).length === 1);
// DUMBBELL
await git('Incline Dumbbell Curl');
t('kart etiketi "⚌ dumbbell ×2"', (await p.textContent('main .xslide.on .ekt')) === '⚌ dumbbell ×2', await p.textContent('main .xslide.on .l0'));
await kg().fill('12,5'); await kg().dispatchEvent('change'); await p.waitForTimeout(150);
t('dumbbell: 12.5 girilince alt satır "iki dumbbell · toplam 25 kg"', (await sub()) === 'iki dumbbell · toplam 25 kg', await sub());
await p.locator('.log .setk').click(); await p.waitForTimeout(400);
t('yığında girilen sayı görünür (12.5 ×)', (await p.textContent('#deck .wc.done .v')).startsWith('12.5 ×'), await p.textContent('#deck'));
t('sonraki set 12.5 ile hazır gelir', await kg().inputValue() === '12.5');
// ekipmanı tek dumbbell'e çevir
await p.locator('main .xslide.on .ekt').click(); await p.waitForTimeout(250);
await p.locator('.sheet .mi', { hasText: 'tek dumbbell' }).click(); await p.waitForTimeout(500);
t('tek dumbbell seçildi → etiket ×1, alt satır "tek dumbbell · toplam 12.5 kg"', (await p.textContent('main .xslide.on .ekt')) === '⚌ dumbbell ×1' && (await sub()) === 'tek dumbbell · toplam 12.5 kg', await sub());
await p.locator('.log .setk').click(); await p.waitForTimeout(400);
// kırmızı takım A28-1: çarpan değiştikten sonra set 1'in yalnız RPE'si düzenlenirse toplamı (25) değişmez
await p.locator('#deck .wheel-track').evaluate(t => { t.dispatchEvent(new Event('pointerdown')); t.scrollTo({ top: 0 }); }); await p.waitForTimeout(600);
t('set 1 düzenlemede: kutuda 25 (yeni çarpana göre), düğme "Set 1\'i güncelle"', await kg().inputValue() === '25' && (await p.textContent('.log .setk')).startsWith("Set 1'i güncelle"), await kg().inputValue() + ' ' + await p.textContent('.log .setk'));
await pick('rpe', 8); await p.locator('.log .setk').click(); await p.waitForTimeout(400);
t('düzenleme yeni set eklemedi (yığında 2 set), düğme yeni sete döndü', (await p.$$('#deck .wc.done')).length === 2 && !(await p.textContent('.log .setk')).includes('güncelle'), await p.textContent('.log .setk'));
await p.locator('.log .acts .more').click(); await p.waitForTimeout(200); await p.locator('.sheet .mi', { hasText: 'Hareketi bitir' }).click(); await p.waitForTimeout(700);
{ const ev = (await olaylar()).filter(e => e.ref.row_key.startsWith('Incline Dumbbell Curl')).pop(); const d = ev?.data.sets_detail ?? [];
  t('olay: set 1 kg=25 (toplam) kg_g=12.5 ekip=db carpan=2', d[0]?.kg === 25 && d[0]?.kg_g === 12.5 && d[0]?.ekip === 'db' && d[0]?.carpan === 2, JSON.stringify(d[0]));
  t('olay: set 2 kg=12.5 carpan=1; set 1 RPE 8 oldu ama kg 25 / kg_g 12.5 / carpan 2 aynen', d[1]?.kg === 12.5 && d[1]?.kg_g === 12.5 && d[1]?.carpan === 1 && d[0]?.kg === 25 && d[0]?.kg_g === 12.5 && d[0]?.carpan === 2 && d[0]?.rpe === 8 && d.length === 2, JSON.stringify(d));
  t('olay: satır kg = en ağır set toplamı (25)', ev?.data.kg === 25); }
t('BW kaydı öncesi sayfa hatası yok', !logs.length, logs.join(' | '));
// VÜCUT AĞIRLIĞI
await git('Weighted Chin-Up -> Negatif Chin-Up');
t('BW etiketi "◯ vücut"', (await p.textContent('main .xslide.on .ekt')) === '◯ vücut');
await kg().fill('10'); await kg().dispatchEvent('change'); await p.waitForTimeout(150);
t('BW +10 → "vücut 90 + 10 = 100 kg", kutuda +10', (await sub()) === 'vücut 90 + 10 = 100 kg' && await kg().inputValue() === '10' && (await p.textContent('.log .bwis .sel')) === '+ ek yük', await sub());
await p.locator('.log .setk').click(); await p.waitForTimeout(400);
await kg().fill('-20'); await kg().dispatchEvent('change'); await p.waitForTimeout(150);
t('BW −20 (destek) → "vücut 90 − 20 = 70 kg"', (await sub()) === 'vücut 90 − 20 = 70 kg', await sub());
await p.locator('.log .setk').click(); await p.waitForTimeout(400);
t('−20 sonrası "− destek" seçili, kutuda 20', (await p.textContent('.log .bwis .sel')) === '− destek' && await kg().inputValue() === '20');
await p.locator('.log .bwis button', { hasText: '+ ek yük' }).click(); await p.waitForTimeout(150);
t('"+ ek yük" dokununca işaret döndü (+20 → 110 kg)', (await sub()) === 'vücut 90 + 20 = 110 kg', await sub());
await p.locator('.log .bwis button', { hasText: '− destek' }).click(); await p.waitForTimeout(150);
await kg().fill('15'); await kg().dispatchEvent('change'); await p.waitForTimeout(150);
t('"− destek" seçiliyken 15 yazınca −15 (75 kg)', (await sub()) === 'vücut 90 − 15 = 75 kg', await sub());
await kg().fill('0'); await kg().dispatchEvent('change'); await p.waitForTimeout(150);
t('BW 0 → "yalnız vücut · 90 kg" ve kaydedilebilir', (await sub()) === 'yalnız vücut · 90 kg');
await p.locator('.log .setk').click(); await p.waitForTimeout(400);
t('yığında +10 / −20 / BW', (await p.$$eval('#deck .wc.done .v', a => a.map(x => x.textContent.split(' ')[0]).join(','))) === '+10,−20,BW', await p.$$eval('#deck .wc.done .v', a => a.map(x => x.textContent).join('|')));
await p.locator('.log .acts .more').click(); await p.waitForTimeout(200); await p.locator('.sheet .mi', { hasText: 'Hareketi bitir' }).click(); await p.waitForTimeout(700);
{ const ev = (await olaylar()).filter(e => e.ref.row_key.startsWith('Weighted Chin-Up')).pop(); const d = ev?.data.sets_detail ?? [];
  t('olay BW: kg 100/70/90, kg_g 10/−20/0, bw=90', d.map(x => x.kg).join() === '100,70,90' && d.map(x => x.kg_g).join() === '10,-20,0' && d.every(x => x.bw === 90 && x.ekip === 'bw'), JSON.stringify(d)); }
t('sayfa hatası yok', !logs.length, logs.join(' | '));
console.log(`\n  ${ok}/${ok + fail} geçti — ${fail ? 'E2E EKİPMAN BAŞARISIZ' : 'E2E EKİPMAN GECTI'}`);
await b.close(); process.exit(fail ? 1 : 0);
