// E2E — saha modu (mockup akışı): açılış · Diğer S1 · Seansa başla → stres → ısınma → log · virgüllü kg · stepper · kaydet → yenile → kalıcı ·
// Bitir → özet → kapat · Program ızgarası + kol override · Aletler plaka · uçak modu · Ayarlar sayaçları
import { chromium } from 'playwright';
const URL = 'http://localhost:4173/spor-app/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'tr-TR' });
const p = await ctx.newPage(); p.on('dialog', d => d.accept()); const logs = []; p.on('console', m => logs.push(m.type() + ': ' + m.text())); p.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
let ok = 0, fail = 0; const t = (n, c, d = '') => { c ? ok++ : (fail++, console.log('  ✗', n, d)); };
const tab = name => p.locator('.tabs button', { hasText: name }).click();
const strip = name => p.locator('.strip button', { hasText: name }).click();
const kg = () => p.locator('.log .kgrow input');
await p.goto(URL); await p.waitForSelector('.hdr .t', { timeout: 15000 });
t('alt sekme çubuğu 5 sekme', (await p.$$('.tabs button')).length === 5);
t('üstte program şeridi', (await p.$$('.strip button')).length === 3);
await strip('Diğer Günler'); await p.waitForTimeout(300);
t('başlık "Hafta 1 — Salı Seansı", üst satır yalnız tarih', (await p.textContent('.hdr .t')) === 'Hafta 1 — Salı Seansı' && !/Diğer|Deadlift/.test(await p.textContent('.hdr .k')), await p.textContent('.hdr .k'));
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
t('log fazı: çubuk açık, Bitir ve süre çubukta, başlık tek satır', (await p.$$('.log')).length === 1 && (await p.textContent('.log .srow')).includes('Bitir') && (await p.$$('.log #sure')).length === 1 && (await p.$$('.hdr.one')).length === 1);
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
await p.locator('.log .acts .pri:not(.setk)').click(); await p.waitForTimeout(500);
let done = await p.$$eval('main .card.mark.done .yap', a => a.map(x => x.textContent)); t('Clean kaydedildi 42.5×4×3 RPE7.5', done[0]?.startsWith('42.5×4×3 · RPE7.5'), done[0]);
t('dinlenme rozeti çubukta: sıradaki Top Single → 8:00 civarı', (await p.$$('.log #kpill')).length === 1 && /^7:5\d|8:00/.test(await p.textContent('.log #kpill .kt')), await p.textContent('.log #kpill'));
t('sıradaki hareket Squat Top Single açık', (await p.textContent('.log .ttl .n')).startsWith('Squat'));
// plaka sheet → aktar
await p.locator('.log .kgrow .plk-ic').click(); await p.waitForTimeout(300);
t('plaka sheet 120 kg · tek taraf 50', (await p.locator('.sheet input.big').inputValue()) === '120' && (await p.textContent('.sheet .plates')).includes('50'));
await p.locator('.sheet input.big').fill('200'); await p.locator('.sheet input.big').dispatchEvent('change'); await p.waitForTimeout(100);
t('plaka: sayı yazıldı 200 → tek taraf 90', (await p.textContent('.sheet .plates')).includes('90'));
await p.locator('.sheet input.big').fill('120'); await p.locator('.sheet input.big').dispatchEvent('change'); await p.waitForTimeout(100);
await p.locator('.sheet .plk button.plus').click(); await p.waitForTimeout(100); await p.locator('.sheet .btnrow .pri').click(); await p.waitForTimeout(200);
t('aktar → kg 122.5', await kg().inputValue() === '122.5', await kg().inputValue());
await p.locator('.log .grab').click(); await p.waitForTimeout(150);
t('çubuk katlandı: özet 122.5×1×1 + mini Kaydet, hedef gizli', !(await p.locator('.log .kgrow').isVisible()) && (await p.textContent('.log .oz')).startsWith('122.5×1×1') && await p.locator('.log .kmini').isVisible() && !(await p.locator('.log .hh').isVisible()));
await p.locator('.log .grab').click(); await p.waitForTimeout(150); t('çubuk açıldı', await p.locator('.log .kgrow').isVisible());
await p.locator('.log #kpill').click(); await p.waitForTimeout(500); t('dinlenme pili dokununca büyüdü (Dynamic Island)', await p.locator('.log #kpill.big').isVisible() && (await p.textContent('.log #kpill .kx')).trim() === 'Geç');
await p.locator('.log #kpill .kx').click(); await p.waitForTimeout(200); t('dinlenme pili Geç ile gizlendi', (await p.$$('.log #kpill')).length === 0);
await p.locator('.log .acts .pri:not(.setk)').click(); await p.waitForTimeout(400);
// SET-SET: Top Triple → 3 set ayrı (100×3 R7, 107.5×3 R8, 107.5×2 R9) → Hareketi bitir → satır 107.5×3 R9, detay metni
await p.locator('.log .modeb').click(); await p.waitForTimeout(200);
t('set-set modu açıldı: Set çipleri gizli, "Set kaydet" görünür', !(await p.locator('.log .fld').nth(0).isVisible()) && await p.locator('.log .setk').isVisible() && (await p.textContent('.log .modeb')) === 'Set set');
await kg().fill('100'); await kg().dispatchEvent('change'); await p.locator('.log .fld', { hasText: 'RPE' }).locator('button', { hasText: /^7$/ }).click(); await p.locator('.log .setk').click(); await p.waitForTimeout(400);
t('1. set listede, sayaç 3:00 (top set arası → kendi kategorisi 8:00)', (await p.$$('.log .srow-set')).length === 1 && /^7:5\d|8:00/.test(await p.textContent('.log #kpill .kt')), await p.textContent('.log #kpill'));
await kg().fill('107,5'); await kg().dispatchEvent('change'); await p.locator('.log .fld', { hasText: 'RPE' }).locator('button', { hasText: /^8$/ }).click(); await p.locator('.log .setk').click(); await p.waitForTimeout(300);
await p.locator('.log .fld', { hasText: 'Tkr' }).locator('button', { hasText: /^2$/ }).click(); await p.locator('.log .fld', { hasText: 'RPE' }).locator('button', { hasText: /^9$/ }).click(); await p.locator('.log .setk').click(); await p.waitForTimeout(300);
t('3 set listede, bitir düğmesi "(3 set)"', (await p.$$('.log .srow-set')).length === 3 && (await p.textContent('.log .acts .pri:not(.setk)')).includes('3 set'));
await p.locator('.log .acts .pri:not(.setk)').click(); await p.waitForTimeout(500);
const yapT = await p.$$eval('main .card.mark.done .yap', a => a.map(x => x.textContent));
t('Top Triple kaydı detaylı: 100×3 R7 · 107.5×3 R8 · 107.5×2 R9', yapT.some(x => x.includes('100×3 R7 · 107.5×3 R8 · 107.5×2 R9')), yapT.join(' | '));
t('tüm satırlar dolu → giriş alanı kapandı, "Seansı bitir" çıktı', (await p.$$('.log .kgrow')).length === 0 && (await p.textContent('.log')).includes('Seansı bitir'));
await p.locator('.log .modeb').count(); // yok
await p.evaluate(async () => { /* mod tercihini geri al ki sonraki adımlar tek satır çalışsın */ });
// uygulama ölümü: yenile → log fazı ve kayıtlar duruyor
await p.reload(); await p.waitForSelector('.hdr .t'); await p.waitForTimeout(400);
if (await p.locator('.strip button', { hasText: 'Diğer' }).isVisible()) { await strip('Diğer Günler'); await p.waitForTimeout(300); }
t('yenileme sonrası Diğer + log fazında + 3 kayıt', (await p.textContent('.hdr .t')) === 'Hafta 1 — Salı Seansı' && (await p.$$('main .card.mark.done')).length === 3);
// Bitir → özet → kapat
await p.locator('.log .srow button', { hasText: 'Bitir' }).click(); await p.waitForTimeout(400);
t('özet: 3 kutu + hacim + mola satırı (plan 8:00) + set molaları', (await p.$$('main .grid.g3 .card')).length === 3 && (await p.textContent('main .grid.g3')).includes('Hacim') && /öncesi mola \d:\d\d \/ plan 8:00/.test(await p.textContent('main')) && (await p.textContent('main')).includes('set molaları'), (await p.textContent('main')).slice(-300));
t('özet hacim = gerçek toplam (42.5·12 + 122.5 + 300+322.5+215 = 1470)', (await p.textContent('main .grid.g3')).includes('1470'), (await p.textContent('main .grid.g3')));
await p.locator('main textarea').fill('E2E seans notu'); await p.locator('.foot button.pri').click(); await p.waitForTimeout(500);
t('kapatıldı → işaretçi sonraki seansa (H1 Perşembe), "Seansa başla"', (await p.textContent('.hdr .t')) === 'Hafta 1 — Perşembe Seansı' && (await p.textContent('.foot button.pri')) === 'Seansa başla', (await p.textContent('.hdr .t')) + ' | ' + (await p.textContent('.foot')));
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
t('kilit → Bugün H1 Salı (düzelt)', (await p.textContent('.hdr .t')) === 'Hafta 1 — Salı Seansı' && (await p.textContent('.foot button.pri')).includes('düzelt'));
await p.locator('main button', { hasText: 'Kaldır' }).click(); await p.waitForTimeout(300);
t('kilit kaldırıldı → Perşembe', (await p.textContent('.hdr .t')) === 'Hafta 1 — Perşembe Seansı');
// SIFIRLAMA: Program → S1 → app kayıtlarını sıfırla → S1 yeniden açık, takvim Salı'ya döner
await tab('Program'); await p.waitForTimeout(300); await p.locator('.pgrid .cell').first().click(); await p.waitForTimeout(300);
await p.locator('main button', { hasText: 'app kayıtlarını sıfırla' }).click(); await p.waitForTimeout(600);
t('sıfırlama → Bugün H1 Salı, 0 kayıtlı, mesaj', (await p.textContent('.hdr .t')) === 'Hafta 1 — Salı Seansı' && (await p.textContent('main')).includes('0 kayıtlı') && (await p.textContent('main')).includes('silindi'), (await p.textContent('.hdr .t')));
await tab('Ayarlar'); await p.waitForTimeout(300);
t('Ayarlar: deneme kayıtları bölümü var, Diğer için app kaydı yok', (await p.textContent('main')).includes('Deneme kayıtları') && /Diğer Günler\s*app kaydı yok/.test(await p.textContent('main')));
await tab('Bugün'); await p.waitForTimeout(200);
// Aletler
await tab('Aletler'); await p.waitForTimeout(300);
t('Aletler: plaka 100 kg + 7 süre düğmesi (30sn…8dk)', (await p.locator('main .plk input.big').inputValue()) === '100' && (await p.$$('main .krobtns button')).length === 7);
await p.locator('main .plk button.plus').dispatchEvent('pointerdown'); await p.waitForTimeout(2000); await p.dispatchEvent('body', 'pointerup'); await p.waitForTimeout(300);
const hv = Number(await p.locator('main .plk input.big').inputValue()); await p.waitForTimeout(500);
t('basılı tut 2 sn → hızlanan artış (>120) ve bırakınca durur', hv > 120 && Number(await p.locator('main .plk input.big').inputValue()) === hv, String(hv));
await p.locator('main .krobtns button', { hasText: '30 sn' }).click(); await p.waitForTimeout(1300);
t('kronometre çalışıyor', /0:2\d/.test(await p.textContent('#krobig')), await p.textContent('#krobig'));
await p.evaluate(() => { const a = document.querySelector('#app'); }); await p.waitForTimeout(0);
// İlerleme
await tab('İlerleme'); await p.waitForTimeout(300);
t('İlerleme: 1RM kartları + 6 çubuk', (await p.$$('main .bars .b')).length === 6 && (await p.textContent('main')).includes('Tahmini 1RM'));
// uçak modu: offline → açılış + Alper S1 kayıt
await ctx.setOffline(true); await p.reload(); await p.waitForSelector('.hdr .t', { timeout: 15000 }); await p.waitForTimeout(300);
await tab('Bugün'); await strip('Alper Günleri'); await p.waitForTimeout(300);
await p.locator('.foot button.pri').click(); await p.waitForTimeout(300); await p.locator('.sheet .btnrow button').click(); await p.waitForTimeout(400);   // stres: şimdi değil → ısınma
await p.locator('.foot button.sec').click(); await p.waitForTimeout(400);   // ısınmayı atla
if ((await p.textContent('.log .modeb')) === 'Set set') { await p.locator('.log .modeb').click(); await p.waitForTimeout(150); }
await p.locator('.log .seg button', { hasText: 'Alper' }).click(); await p.waitForTimeout(200);
t('Alper segment → plan 90', await kg().inputValue() === '90', await kg().inputValue());
await p.locator('.log .acts .pri:not(.setk)').click(); await p.waitForTimeout(400);
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
