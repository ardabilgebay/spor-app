// E2E — saha modu: açılış · Diğer S1 · virgüllü kg · kaydet → yenile → kalıcı · uçak modu (offline) · Ayarlar sayıları
import { chromium } from 'playwright';
const URL = 'http://localhost:4173/spor-app/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'tr-TR' });
const p = await ctx.newPage(); const logs = []; p.on('console', m => logs.push(m.type() + ': ' + m.text())); p.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
let ok = 0, fail = 0; const t = (n, c, d = '') => { c ? ok++ : (fail++, console.log('  ✗', n, d)); };
await p.goto(URL); await p.waitForSelector('.row', { timeout: 15000 });
// Diğer'e geç (bugün Pzt: Deadlift/Alper günü; test için Diğer S1)
await p.getByRole('button', { name: 'Diğer Günler' }).click(); await p.waitForTimeout(300);
const h2 = await p.textContent('h2'); t('Diğer H1 Salı', h2.includes('Hafta 1') && h2.includes('Salı'), h2);
const rows = await p.$$eval('.row .ex', a => a.map(x => x.textContent)); t('3 satır: Clean, Squat, Squat', rows.join(',') === 'Clean,Squat,Squat', rows.join(','));
t('ısınma Squat 120', (await p.textContent('.isinma')).includes('120 kg'));
// ilk satır (Clean 40 kg 4×3) açık; virgüllü kg gir: 42,5 → 42.5
const kg = p.locator('.bar input[inputmode="decimal"]'); t('kg kutusu type=text', await kg.getAttribute('type') === 'text');
await kg.fill('42,5'); await kg.dispatchEvent('change'); await p.waitForTimeout(200);
t('virgül → 42.5', await kg.inputValue() === '42.5', await kg.inputValue());
await p.locator('.bar .chips').nth(0).getByRole('button', { name: '4', exact: true }).click(); await p.waitForTimeout(150);
await p.locator('.bar .chips').nth(1).getByRole('button', { name: '3', exact: true }).click(); await p.waitForTimeout(150);
await p.locator('.bar .chips').nth(2).getByRole('button', { name: '7.5', exact: true }).click(); await p.waitForTimeout(150);
await p.locator('.bar button.acc').click(); await p.waitForTimeout(400);
let done = await p.$$eval('.row.done .yapilan', a => a.map(x => x.textContent)); t('Clean kaydedildi 42.5×4×3 RPE7.5', done[0]?.startsWith('42.5×4×3 · RPE7.5'), done[0]);
// ✓ Aynen → Squat Top Single 120×1×1
await p.locator('.bar button.ok').click(); await p.waitForTimeout(400);
done = await p.$$eval('.row.done .yapilan', a => a.map(x => x.textContent)); t('Aynen: 120×1×1', done[1]?.startsWith('120×1×1'), done[1]);
t('Aynen sonra plaka 120', (await p.$$eval('.row .plaka', a => a.map(x => x.textContent)))[1]?.includes('bir tarafa 50: 2×25'));
// Atlandı → Top Triple
await p.locator('.bar button', { hasText: 'Atlandı' }).click(); await p.waitForTimeout(400);
t('atlandı işaretli', (await p.$$('.row.skip')).length === 1);
// uygulama ölümü: yenile → hepsi duruyor
await p.reload(); await p.waitForSelector('.row'); await p.getByRole('button', { name: 'Diğer Günler' }).click(); await p.waitForTimeout(300);
done = await p.$$eval('.row.done .yapilan', a => a.map(x => x.textContent)); t('yenileme sonrası 2 kayıt + 1 atlandı', done.length === 2 && (await p.$$('.row.skip')).length === 1, done.length);
t('seans 3/3 tamamlandı', (await p.textContent('.card .tab')).includes('3/3'));
// kol varyantı override (BUGÜN!I36): Program → S2 (H1 Per) kilitle → takvim B işaretli → A seç → satırlar değişir → B'ye dön → kilidi kaldır
await p.getByRole('button', { name: 'Program' }).click(); await p.waitForTimeout(300);
await p.locator('.row', { hasText: 'S2 · H1 Perşembe' }).click(); await p.waitForTimeout(400);
t('S2 kilitli, kol bloğu Biceps takvim B', (await p.textContent('h2')).includes('Perşembe') && (await p.locator('.card .lbl', { hasText: 'Biceps' }).count()) === 1 && (await p.textContent('.card .chips button.sel')) === 'B');
const kolOnce = await p.$$eval('.row .ex', a => a.map(x => x.textContent).join(','));
await p.locator('.card .chips').getByRole('button', { name: 'A', exact: true }).click(); await p.waitForTimeout(400);
const kolA = await p.$$eval('.row .ex', a => a.map(x => x.textContent).join(','));
t('varyant A → kol satırları değişti, Snatch/Front Squat sabit', kolA !== kolOnce && kolA.startsWith('Snatch,Front Squat,Front Squat'), kolA);
await p.locator('.card .chips').getByRole('button', { name: 'B', exact: true }).click(); await p.waitForTimeout(400);
t('takvim B → satırlar geri geldi', (await p.$$eval('.row .ex', a => a.map(x => x.textContent).join(','))) === kolOnce);
await p.getByRole('button', { name: 'Kaldır' }).click(); await p.waitForTimeout(300);
t('kilit kaldırıldı → S1 Salı', (await p.textContent('h2')).includes('Salı'), await p.textContent('h2'));
// uçak modu: offline → sayfa SW'den açılır ve loglama çalışır (Alper S1'e kayıt)
await ctx.setOffline(true); await p.reload(); await p.waitForSelector('.row', { timeout: 15000 });
await p.getByRole('button', { name: 'Alper Günleri' }).click(); await p.waitForTimeout(300);
await p.locator('.bar .seg button', { hasText: 'Alper' }).click(); await p.waitForTimeout(200);
await p.locator('.bar button.ok').click(); await p.waitForTimeout(400);
const alp = await p.$$eval('.row .yapilan', a => a.map(x => x.textContent)); t('offline Alper kaydı 90×1×1', alp.some(x => x.startsWith('Alper: 90×1×1')), alp.join(' | '));
await ctx.setOffline(false);
// Ayarlar: bekleyen olay sayısı (yerel) ve toplam
await p.getByRole('button', { name: 'Ayarlar' }).click(); await p.waitForTimeout(300);
const kv = await p.$$eval('.kv div', a => a.map(x => x.textContent)); const i = kv.indexOf('Cihazda bekleyen (senkron)'); const j = kv.indexOf('Toplam olay');
t('bekleyen = 6 yerel olay (4 set + 2 arm_variant; migrasyon uzak sayıldı)', kv[i + 1] === '6', kv[i + 1]); t('toplam = 246', kv[j + 1] === '246', kv[j + 1]);
t('OneDrive ayarlı değil (env yok)', kv[kv.indexOf('OneDrive') + 1] === 'ayarlı değil');
t('sayfa hatası yok', !logs.some(l => l.startsWith('PAGEERROR')), logs.filter(l => l.startsWith('PAGEERROR')).join(' | '));
console.log(`\n  ${ok}/${ok + fail} geçti — ${fail ? 'E2E BASARISIZ' : 'E2E GECTI'}`); if (fail) console.log(logs.slice(-8).join('\n'));
await b.close(); process.exit(fail ? 1 : 0);
