// E2E — saha modu (mockup akışı): açılış · Diğer S1 · Seansa başla → stres → ısınma → log · virgüllü kg · stepper · kaydet → yenile → kalıcı ·
// Bitir → özet → kapat · Program ızgarası + kol override · Aletler plaka · uçak modu · Ayarlar sayaçları
import { chromium } from 'playwright';
const URL = 'http://localhost:4173/spor-app/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'tr-TR' });
const p = await ctx.newPage(); const logs = []; p.on('console', m => logs.push(m.type() + ': ' + m.text())); p.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
let ok = 0, fail = 0; const t = (n, c, d = '') => { c ? ok++ : (fail++, console.log('  ✗', n, d)); };
const tab = name => p.locator('.tabs button', { hasText: name }).click();
const strip = name => p.locator('.strip button', { hasText: name }).click();
const kg = () => p.locator('.log .kgrow input');
await p.goto(URL); await p.waitForSelector('.hdr .t', { timeout: 15000 });
t('alt sekme çubuğu 5 sekme', (await p.$$('.tabs button')).length === 5);
t('üstte program şeridi', (await p.$$('.strip button')).length === 3);
await strip('Diğer Günler'); await p.waitForTimeout(300);
t('başlık Hafta 1 — Salı, kicker yalnız tarih', (await p.textContent('.hdr .t')) === 'Hafta 1 — Salı' && !/Diğer|Deadlift/.test(await p.textContent('.hdr .k')), await p.textContent('.hdr .k'));
t('önizleme: 3 hareket kartı + dinlenme metni', (await p.$$('main .card.mark')).length === 3 && (await p.textContent('main .card.mark .meta')).includes('dinlenme'));
t('ısınma pili top set 120', (await p.textContent('main .pills .p.top')) === '120 kg');
t('stres girilmedi rozeti + sinyal yan yana', (await p.$$eval('main .sigrow .sig', a => a.map(x => x.textContent).join(' '))).includes('girilmedi') && (await p.$$('main .sigrow .sig')).length === 2);
t('depolama uyarısı ve "Sonraki" satırı yok', !(await p.textContent('main')).includes('Kalıcı depolama') && !(await p.textContent('main')).includes('Sonraki:'));
// Seansa başla → stres sheet → 3 → ısınma
await p.locator('.foot button.pri').click(); await p.waitForTimeout(300);
t('stres sheet açıldı', (await p.$$('.sheet .stres button')).length === 5);
await p.locator('.sheet .stres button').nth(2).click(); await p.waitForTimeout(400);
t('ısınma fazı: boş bar + 4 basamak', (await p.$$('main .isirow')).length === 5, (await p.$$('main .isirow')).length);
await p.locator('main .isirow').nth(0).click(); await p.waitForTimeout(150);
t('basamak tik', (await p.$$('main .isirow.on')).length === 1);
await p.locator('.foot button.pri').click(); await p.waitForTimeout(400);
// LOG fazı
t('log fazı: çubuk açık, Bitir görünür', (await p.$$('.log')).length === 1 && (await p.textContent('.hdr .right')).includes('Bitir'));
t('log fazında liste üstte sade (stres rozeti yok)', (await p.$$('main .sig')).length === 0);
t('kg kutusu type=text', await kg().getAttribute('type') === 'text');
await kg().fill('42,5'); await kg().dispatchEvent('change'); await p.waitForTimeout(150);
t('virgül → 42.5', await kg().inputValue() === '42.5', await kg().inputValue());
await p.locator('.log .kgrow button.plus').click(); await p.waitForTimeout(150); t('+2.5 → 45 (tek adım)', await kg().inputValue() === '45', await kg().inputValue());
await p.locator('.log .kgrow button').first().click(); await p.waitForTimeout(150); t('−2.5 → 42.5', await kg().inputValue() === '42.5');
const before = await p.$$eval('main .card.mark', a => a.length);
await p.locator('.log .fld').nth(0).locator('button', { hasText: /^4$/ }).click(); await p.waitForTimeout(100);
await p.locator('.log .fld').nth(2).locator('button', { hasText: /^7.5$/ }).click(); await p.waitForTimeout(100);
t('çip seçimi yerinde (ana liste yeniden çizilmedi)', (await p.$$eval('main .card.mark', a => a.length)) === before && (await p.locator('.log .fld').nth(0).locator('button.sel').textContent()) === '4');
await p.locator('.log .acts .pri').click(); await p.waitForTimeout(500);
let done = await p.$$eval('main .card.mark.done .yap', a => a.map(x => x.textContent)); t('Clean kaydedildi 42.5×4×3 RPE7.5', done[0]?.startsWith('42.5×4×3 · RPE7.5'), done[0]);
t('dinlenme rozeti başlıkta: sıradaki Top Single → 8:00 civarı', (await p.$$('.hdr #kpill')).length === 1 && /^7:5\d|8:00/.test(await p.textContent('.hdr #kpill .kt')), await p.textContent('.hdr #kpill'));
t('sıradaki hareket Squat Top Single açık', (await p.textContent('.log .ttl .n')).startsWith('Squat'));
// plaka sheet → aktar
await p.locator('.log .kgrow .plk-ic').click(); await p.waitForTimeout(300);
t('plaka sheet 120 kg · tek taraf 50', (await p.textContent('.sheet .big')) === '120 kg' && (await p.textContent('.sheet .plates')).includes('50'));
await p.locator('.sheet .plk button.plus').click(); await p.waitForTimeout(100); await p.locator('.sheet .btnrow .pri').click(); await p.waitForTimeout(200);
t('aktar → kg 122.5', await kg().inputValue() === '122.5', await kg().inputValue());
await p.locator('.log .chev').click(); await p.waitForTimeout(150);
t('çubuk katlandı: özet 122.5×1×1 + mini Kaydet', !(await p.locator('.log .kgrow').isVisible()) && (await p.textContent('.log .oz')).startsWith('122.5×1×1'));
await p.locator('.log .chev').click(); await p.waitForTimeout(150); t('çubuk açıldı', await p.locator('.log .kgrow').isVisible());
await p.locator('.hdr #kpill').click(); await p.waitForTimeout(200); t('dinlenme rozeti dokununca gizlendi', (await p.$$('.hdr #kpill')).length === 0);
await p.locator('.log .acts .pri').click(); await p.waitForTimeout(400);
// Atla → Top Triple
await p.locator('.log .acts .skip', { hasText: 'Atla' }).click(); await p.waitForTimeout(400);
t('atlandı işaretli, çubuk kapandı (satır kalmadı)', (await p.$$('main .card.mark.skip')).length === 1 && (await p.$$('.log')).length === 0);
// uygulama ölümü: yenile → log fazı ve kayıtlar duruyor
await p.reload(); await p.waitForSelector('.hdr .t'); await p.waitForTimeout(400);
t('yenileme sonrası Diğer + log fazında + 2 kayıt + 1 atlandı', (await p.textContent('.hdr .t')) === 'Hafta 1 — Salı' && (await p.$$('main .card.mark.done')).length === 2 && (await p.$$('main .card.mark.skip')).length === 1);
// Bitir → özet → kapat
await p.locator('.hdr .right button', { hasText: 'Bitir' }).click(); await p.waitForTimeout(400);
t('özet: 3 kutu + hacim', (await p.$$('main .grid.g3 .card')).length === 3 && (await p.textContent('main .grid.g3')).includes('Hacim'));
await p.locator('main textarea').fill('E2E seans notu'); await p.locator('.foot button.pri').click(); await p.waitForTimeout(500);
t('kapatıldı → işaretçi sonraki seansa (H1 Perşembe), "Seansa başla"', (await p.textContent('.hdr .t')) === 'Hafta 1 — Perşembe' && (await p.textContent('.foot button.pri')) === 'Seansa başla', (await p.textContent('.hdr .t')) + ' | ' + (await p.textContent('.foot')));
// kol varyantı override (Perşembe, Biceps takvim B)
t('kol çipleri takvim B', (await p.locator('main .pills button.sel').textContent()) === 'B');
const kolOnce = await p.$$eval('main .card.mark .ex', a => a.map(x => x.textContent).join(','));
await p.locator('main .pills button', { hasText: /^A$/ }).click(); await p.waitForTimeout(400);
t('varyant A → kol satırları değişti, Snatch/FS sabit', (await p.$$eval('main .card.mark .ex', a => a.map(x => x.textContent).join(','))) !== kolOnce && kolOnce.startsWith('Snatch,Front Squat'));
await p.locator('main .pills button', { hasText: /^B$/ }).click(); await p.waitForTimeout(300);
t('takvim B → geri', (await p.$$eval('main .card.mark .ex', a => a.map(x => x.textContent).join(','))) === kolOnce);
// Program ızgarası
await tab('Program'); await p.waitForTimeout(400);
t('ızgara: 6 hafta × 3 gün', (await p.$$('.pgrid .wk')).length === 6 && (await p.$$('.pgrid .cell')).length === 18);
t('S1 hücresi tamam, S2 sırada', (await p.locator('.pgrid .cell').first().getAttribute('class')).includes('done') && (await p.locator('.pgrid .cell').nth(1).getAttribute('class')).includes('now'));
await p.locator('.pgrid .cell').first().click(); await p.waitForTimeout(400);
t('S1 detayı: Salı, 3 satır, seans notu', (await p.textContent('main')).includes('Hafta 1 Salı') && (await p.$$('main .card.mark')).length === 3 && (await p.textContent('main')).includes('E2E seans notu'));
await p.locator('main button', { hasText: "Bugün'de aç" }).click(); await p.waitForTimeout(400);
t('kilit → Bugün H1 Salı (düzelt)', (await p.textContent('.hdr .t')) === 'Hafta 1 — Salı' && (await p.textContent('.foot button.pri')).includes('düzelt'));
await p.locator('main button', { hasText: 'Kaldır' }).click(); await p.waitForTimeout(300);
t('kilit kaldırıldı → Perşembe', (await p.textContent('.hdr .t')) === 'Hafta 1 — Perşembe');
// Aletler
await tab('Aletler'); await p.waitForTimeout(300);
t('Aletler: plaka 100 kg + kronometre düğmeleri', (await p.textContent('main .plk .big')) === '100 kg' && (await p.$$('main .krobox button')).length >= 4);
await p.locator('main .krobox button', { hasText: '90 sn' }).click(); await p.waitForTimeout(1300);
t('kronometre çalışıyor', /1:2\d/.test(await p.textContent('#krobig')), await p.textContent('#krobig'));
// İlerleme
await tab('İlerleme'); await p.waitForTimeout(300);
t('İlerleme: 1RM kartları + 6 çubuk', (await p.$$('main .bars .b')).length === 6 && (await p.textContent('main')).includes('Tahmini 1RM'));
// uçak modu: offline → açılış + Alper S1 kayıt
await ctx.setOffline(true); await p.reload(); await p.waitForSelector('.hdr .t', { timeout: 15000 }); await p.waitForTimeout(300);
await tab('Bugün'); await strip('Alper Günleri'); await p.waitForTimeout(300);
await p.locator('.foot button.pri').click(); await p.waitForTimeout(300); await p.locator('.sheet .btnrow button').click(); await p.waitForTimeout(400);   // stres: şimdi değil → ısınma
await p.locator('.foot button.sec').click(); await p.waitForTimeout(400);   // ısınmayı atla
await p.locator('.log .seg button', { hasText: 'Alper' }).click(); await p.waitForTimeout(200);
t('Alper segment → plan 90', await kg().inputValue() === '90', await kg().inputValue());
await p.locator('.log .acts .pri').click(); await p.waitForTimeout(400);
t('offline Alper kaydı 90×1×1', (await p.textContent('main')).includes('Alper: 90×1×1'));
await ctx.setOffline(false);
// Ayarlar
await tab('Ayarlar'); await p.waitForTimeout(300);
const txt = await p.textContent('main');
t('Ayarlar: toplam olay 240 + yerel', /Toplam olay.*?(2[5-9]\d)/s.test(txt), txt.slice(0, 120));
t('OneDrive ayarlı, giriş gerekli', txt.includes('giriş gerekli'), txt.slice(txt.indexOf('OneDrive'), txt.indexOf('OneDrive') + 60));
t('sayfa hatası yok', !logs.some(l => l.startsWith('PAGEERROR')), logs.filter(l => l.startsWith('PAGEERROR')).join(' | '));
console.log(`\n  ${ok}/${ok + fail} geçti — ${fail ? 'E2E BASARISIZ' : 'E2E GECTI'}`); if (fail) console.log(logs.filter(l => !l.includes('favicon')).slice(-8).join('\n'));
await b.close(); process.exit(fail ? 1 : 0);
