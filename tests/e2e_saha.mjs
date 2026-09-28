// E2E — saha modu (mockup akışı): açılış · Diğer S1 · Seansa başla → stres → ısınma → log · virgüllü kg · stepper · kaydet → yenile → kalıcı ·
// Bitir → özet → kapat · Program ızgarası + kol override · Aletler plaka · uçak modu · Ayarlar sayaçları
import { chromium } from 'playwright';
const URL = 'http://localhost:4173/spor-app/';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'tr-TR' });
// E2E sabit veriyle koşar (21 Eyl göçü, 240 olay) — yayındaki public/events.ndjson güncellense de senaryo değişmez
{ const { readFileSync } = await import('node:fs'); const fx = readFileSync(new globalThis.URL('./fixtures/e2e_events.ndjson', import.meta.url), 'utf8'); await ctx.route('**/events.ndjson', r => r.fulfill({ status: 200, contentType: 'application/x-ndjson', body: fx })); }
const p = await ctx.newPage(); p.on('dialog', d => d.accept()); const logs = []; p.on('console', m => logs.push(m.type() + ': ' + m.text())); p.on('pageerror', e => logs.push('PAGEERROR ' + e.message));
let ok = 0, fail = 0; const t = (n, c, d = '') => { c ? ok++ : (fail++, console.log('  ✗', n, d)); };
const tab = name => p.locator('.tabs button', { hasText: name }).click();
const strip = name => p.locator('.strip button', { hasText: name }).click();
const kg = () => p.locator('.log .kgrow input');
// A21: tekrar/RPE dikey seçici — kullanıcı kaydırması taklidi (dokunuş + konum), yerleşme 130 ms
const pick = async (ad, v) => { await p.locator(`.log .picker[data-ad="${ad}"] .wheel-track`).evaluate((t, v) => { const it = t.querySelector(`.pk[data-v="${v}"]`); t.dispatchEvent(new Event('touchstart')); t.scrollTop = it.offsetTop + it.offsetHeight / 2 - t.clientHeight / 2; }, String(v)); await p.waitForTimeout(400); };
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
t('H2: seans Clean ile başlıyor → rampa atlanır, doğrudan log', (await p.$$('main .isirow')).length === 0 && (await p.$$('.log')).length === 1);
// LOG fazı
t('log fazı: çubuk açık, süre çubukta, Bitir çubukta YOK (29 Eyl), başlık tek satır', (await p.$$('.log')).length === 1 && !(await p.textContent('.log .srow')).includes('Bitir') && (await p.$$('.hdr #sure')).length === 1 && (await p.$$('.hdr.one')).length === 1);
t('log fazında liste üstte sade (stres rozeti yok)', (await p.$$('main .sig')).length === 0);
t('kg kutusu type=text', await kg().getAttribute('type') === 'text');
await kg().fill('42,5'); await kg().dispatchEvent('change'); await p.waitForTimeout(150);
t('virgül → 42.5', await kg().inputValue() === '42.5', await kg().inputValue());
await p.locator('.log .kgrow button.plus').click(); await p.waitForTimeout(150); t('+2.5 → 45 (tek adım)', await kg().inputValue() === '45', await kg().inputValue());
await p.locator('.log .kgrow button').first().click(); await p.waitForTimeout(150); t('−2.5 → 42.5', await kg().inputValue() === '42.5');
const before = await p.$$eval('main .card.mark', a => a.length);
// T4 (26 Eyl): set-set TEK mod. Clean 4×3 → 4 set ayrı: 42.5×3 R7.5 · 42.5×3 · 45×3 R8 · 45×2 R9 → 4. sette (plan 4) hareket OTOMATİK biter (H3)
t('set-set tek mod: Set çipi yok, "Set kaydet" var, mod düğmesi yok', !(await p.locator('.log .fld', { hasText: 'Set' }).first().isVisible().catch(() => false)) && await p.locator('.log .setk').isVisible() && !(await p.locator('.log .modeb').isVisible()));
await pick('rpe', 7.5); await p.waitForTimeout(100);
t('çip seçimi yerinde (ana liste yeniden çizilmedi)', (await p.$$eval('main .card.mark', a => a.length)) === before && (await p.locator('.log .picker[data-ad="rpe"] .pk.on').textContent()) === '7.5');
await p.locator('.log .setk').click(); await p.waitForTimeout(400);
t('A20 nabız set ekranında: "set 2 başlarken / bitince", dinlenme panelinde nabız yok', (await p.locator('.log .hrfld input').nth(0).getAttribute('title')) === 'set 2 başlarken' && (await p.locator('.log .hrfld input').nth(1).getAttribute('title')) === 'set 2 bitince' && (await p.$$('.kpanel input')).length === 0, await p.textContent('.log .hrfld'));
{ const h = p.locator('.log .hrfld input'); await h.nth(0).fill('98'); await h.nth(0).dispatchEvent('change'); await h.nth(1).fill('151'); await h.nth(1).dispatchEvent('change'); await p.waitForTimeout(100); }
t('1. set listede, sayaç Clean kategorisi (1:30)', (await p.$$('.log .srow-set')).length === 1 && /^1:2\d|1:30/.test(await p.textContent('#island #kpill .kt')), await p.textContent('#island #kpill'));
await p.locator('.log .setk').click(); await p.waitForTimeout(300);
await kg().fill('45'); await kg().dispatchEvent('change'); await pick('rpe', 8); await p.locator('.log .setk').click(); await p.waitForTimeout(300);
t('A23 iki sayfa; sayfa 1 tek çerçevede hareket kaydırağı + set yığını, odak kart Clean, yığında 3 bitmiş set + şimdi', (await p.$$('main .pager > .pg')).length === 2 && (await p.$$('main .combo .xcar .xslide')).length === 3 && (await p.textContent('main .xslide.on .xcard .v')) === 'Clean' && (await p.$$('#deck .wc.done')).length === 3 && (await p.$$('#deck .wc.now')).length === 1);
t('A20: set 2 kartında o setin nabzı ♥ 98 → 151, set 3 alanları boşaldı', (await p.locator('#deck .wc.done').nth(1).textContent()).includes('♥ 98 → 151') && (await p.locator('.log .hrfld input').nth(0).inputValue()) === '', await p.locator('#deck .wc.done').nth(1).textContent());
await p.locator('#deck .wheel-track').evaluate(t => { t.dispatchEvent(new Event('pointerdown')); t.scrollTo({ top: 0 }); }); await p.waitForTimeout(500);   // çarkı en üste kaydır (set 1)
t('T1+: çark set 1\'de durdu → "Set 1\'i güncelle" + Sil', (await p.textContent('.log .setk')) === "Set 1'i güncelle" && await p.locator('.log .acts button[title="Bu seti sil"]').isVisible(), await p.textContent('.log .setk'));
await p.locator('#deck .wheel-track').evaluate(t => { t.dispatchEvent(new Event('pointerdown')); t.scrollTo({ top: t.scrollHeight }); }); await p.waitForTimeout(500);   // en alta (şimdi)
t('T1+: çark en altta → "Set 4\'i kaydet" (bekleyen değer geri)', (await p.textContent('.log .setk')) === "Set 4'i kaydet", await p.textContent('.log .setk'));
await p.screenshot({ path: '/tmp/claude-0/-home-claude/bea8c8c8-fd92-5557-9f37-af05fa048467/scratchpad/t1_log.png' });
t('3 set listede, bitir düğmesi "(3 set)"', (await p.$$('.log .srow-set')).length === 3 && (await p.locator('.log .acts .pri:not(.setk)').getAttribute('title')).includes('3 set'));
await pick('tkr', 2); await pick('rpe', 9); await p.locator('.log .setk').click(); await p.waitForTimeout(600);
t('H2+P5: Squat sırası gelince ısınma açıldı — Clean 45 üstünden 4 basamak, boş bar yok', (await p.$$('main .isirow')).length === 4 && !(await p.textContent('main')).includes('boş bar'), (await p.$$('main .isirow')).length);
await p.locator('main .isirow').nth(0).click(); await p.waitForTimeout(150); t('basamak tik', (await p.$$('main .isirow.on')).length === 1);
await p.locator('.foot button.pri').click(); await p.waitForTimeout(500);
let done = await p.$$eval('main .card.mark.done .yap', a => a.map(x => x.textContent));
t('H3: 4. set → hareket otomatik bitti; kayıt 42.5×3 R7.5 · 42.5×3 · 45×3 R8 · 45×2 R9', done[0]?.includes('42.5×3 R7.5 · 42.5×3 · 45×3 R8 · 45×2 R9'), done[0]);
t('dinlenme rozeti çubukta: sıradaki Top Single → 8:00 civarı', (await p.$$('#island #kpill')).length === 1 && /^7:5\d|8:00/.test(await p.textContent('#island #kpill .kt')), await p.textContent('#island #kpill'));
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
t('çubuk katlandı: özet "henüz set yok" + mini Kaydet, hedef gizli', !(await p.locator('.log .kgrow').isVisible()) && (await p.textContent('.log .oz')).includes('henüz set yok') && await p.locator('.log .kmini').isVisible() && !(await p.locator('.log .hh').isVisible()));
await p.locator('.log .grab').click(); await p.waitForTimeout(150); t('çubuk açıldı', await p.locator('.log .kgrow').isVisible());
await p.locator('#island #kpill').click(); await p.waitForTimeout(500); t('dinlenme pili dokununca büyüdü (Dynamic Island)', await p.locator('#island #kpill.big').isVisible() && (await p.textContent('#island #kpill .kx')).trim() === 'Geç');
t('P1+A21: Hazırım çubukta küçük düğme, 3:00 dolmadan pasif; panel yok', await p.locator('#island #khazir').isVisible() && await p.locator('#island #khazir').isDisabled() && (await p.$$('.log #kpanel')).length === 0);
{ const h = p.locator('.log .hrfld input'); await h.nth(0).fill('12'); await h.nth(0).dispatchEvent('change'); await h.nth(1).fill('128'); await h.nth(1).dispatchEvent('change'); await p.waitForTimeout(100);
  t('A20: nabız 30–230 dışı reddedildi (12), geçerli kaldı (128)', (await h.nth(0).inputValue()) === '' && (await h.nth(1).inputValue()) === '128'); await h.nth(0).fill('96'); await h.nth(0).dispatchEvent('change'); }
await p.locator('#island #kpill .kx').click(); await p.waitForTimeout(200); t('dinlenme pili Geç ile gizlendi', (await p.$$('#island #kpill')).length === 0);
// H1: not sheet, kişi başına
await p.locator('.log .acts button[title="Not"]').click(); await p.waitForTimeout(300);
t('not penceresi (sheet) açıldı, Arda için', await p.locator('.sheet textarea').isVisible() && (await p.textContent('.sheet .t')).includes('Arda'));
await p.locator('.sheet textarea').fill('sırt sıkı'); await p.locator('.sheet .btnrow .pri').click(); await p.waitForTimeout(200);
t('not düğmesi işaretli', (await p.textContent('.log .acts button[title="Not"]')).includes('not'));
// H4: log fazından ısınmaya dönüş ve geri
await p.locator('.log .sbar button', { hasText: 'Isınma' }).click(); await p.waitForTimeout(400);
t('H4: ısınma rampasına dönüldü', await p.locator('main .isirow').first().isVisible());
await p.locator('.foot .pri', { hasText: 'Hareketlere geç' }).click(); await p.waitForTimeout(400);
t('ısınmadan log fazına geri: taslak 122.5 duruyor', await kg().inputValue() === '122.5', await kg().inputValue());
// Top Single (1 set) → tek Set kaydet → otomatik biter (H3), notla
await pick('rpe', 9); await p.locator('.log .setk').click(); await p.waitForTimeout(600);
done = await p.$$eval('main .card.mark.done .yap', a => a.map(x => x.textContent));
t('Top Single tek setle bitti, not kayıtta: 122.5×1 R9 — sırt sıkı', done.some(x => x.includes('122.5×1 R9') && x.includes('sırt sıkı')), done.join(' | '));
// T1 kırmızı takım: bitmiş hareket (Clean) geçmiş kartından yeniden açılınca kayıtlı 4 set yığında
t('A19 hareket çarkı: ortada sıradaki (Top Triple), çarkta 3 hareket', (await p.textContent('main .xslide.on .xcard')).includes('Top Triple') && (await p.$$('main .xcar .xslide')).length === 3, await p.textContent('main .xcar'));
await p.evaluate(() => { document.querySelector('.xcar').dataset.m = 'ayni'; });
await p.locator('main .xcar').evaluate(t => { t.dispatchEvent(new Event('touchstart')); const it = t.querySelector('.xslide'); t.scrollLeft = it.offsetLeft + it.offsetWidth / 2 - t.clientWidth / 2; }); await p.waitForTimeout(900);   // kaydırağı Clean'e kaydır
t('A21: hareket değişimi yerinde (ekran yeniden çizilmedi), Clean\'de Isınma düğmesi yok', (await p.evaluate(() => document.querySelector('.xcar')?.dataset.m)) === 'ayni' && !(await p.textContent('.log .srow')).includes('Isınma'));
t('A19: çark Clean\'de durdu → Clean açıldı, yığında 4 kayıtlı set', (await p.textContent('main .xslide.on .xcard .v')) === 'Clean' && (await p.textContent('main .xslide.on .m')).includes('1/3') && (await p.$$('main .combo #deck')).length === 1 && (await p.$$('main .focus')).length === 0 && (await p.$$('#deck .wc.done')).length === 4 && (await p.textContent('#deck .deckplan')).includes('4 kayıtlı'), await p.textContent('#deck'));
await p.locator('main .pager .pg').nth(1).locator('.card', { hasText: 'Top Triple' }).click(); await p.waitForTimeout(300);
t('T1: sayfa 2\'den Top Triple açıldı, odak sayfasına dönüldü', (await p.textContent('main .xslide.on .xcard')).includes('Top Triple'), await p.textContent('main .xcar'));
// 29 Eyl: erken bitir yalnız genel görünümde; özet eksik hareket varsa iki adım, Geri ile dönülür (seans kapanmaz)
t('genel görünümde "Seansı bitir · 1 hareket girilmedi"', (await p.textContent('main .pager .pg:nth-child(2)')).includes('Seansı bitir · 1 hareket girilmedi'));
await p.locator('main .pager .pg').nth(1).locator('button', { hasText: 'Seansı bitir' }).click(); await p.waitForTimeout(300);
t('özet: eksik uyarısı', (await p.textContent('main')).includes('1 hareket girilmedi'));
await p.locator('.foot button.pri').click(); await p.waitForTimeout(100);
t('açılışta 0,8 sn kilit: ilk dokunuş yok sayıldı', (await p.textContent('.foot button.pri')) === 'Kaydet ve kapat');
await p.waitForTimeout(800); await p.locator('.foot button.pri').click(); await p.waitForTimeout(100);
t('eksikle kapatma iki adım: "tekrar dokun"', (await p.textContent('.foot button.pri')).includes('tekrar dokun'));
await p.locator('.foot button.sec', { hasText: 'Geri' }).click(); await p.waitForTimeout(400);
t('Geri → log, seans açık (Top Triple)', (await p.$$('.log .kgrow')).length === 1 && (await p.textContent('.hdr .t')) === 'Hafta 1 — Salı Seansı');
// Top Triple (1 set)
await kg().fill('107,5'); await kg().dispatchEvent('change'); await pick('rpe', 8); await p.locator('.log .setk').click(); await p.waitForTimeout(600);
const yapT = await p.$$eval('main .card.mark.done .yap', a => a.map(x => x.textContent));
t('Top Triple kaydı 107.5×3 R8', yapT.some(x => x.includes('107.5×3 R8')), yapT.join(' | '));
t('tüm satırlar dolu → giriş alanı kapandı, "Seansı bitir" çıktı', (await p.$$('.log .kgrow')).length === 0 && (await p.textContent('.log')).includes('Seansı bitir'));
// uygulama ölümü: yenile → log fazı ve kayıtlar duruyor
await p.reload(); await p.waitForSelector('.hdr .t'); await p.waitForTimeout(400);
if (await p.locator('.strip button', { hasText: 'Diğer' }).isVisible()) { await strip('Diğer Günler'); await p.waitForTimeout(300); }
t('yenileme sonrası Diğer + log fazında + 3 kayıt', (await p.textContent('.hdr .t')) === 'Hafta 1 — Salı Seansı' && (await p.$$('main .card.mark.done')).length === 3);
// Bitir → özet → kapat
await p.locator('.log .acts button.pri', { hasText: 'Seansı bitir' }).click(); await p.waitForTimeout(1000);
t('özet: 3 kutu + hacim + mola satırı (plan 8:00) + set molaları', (await p.$$('main .grid.g3 .card')).length === 3 && (await p.textContent('main .grid.g3')).includes('Hacim') && /öncesi mola \d:\d\d \/ plan 8:00/.test(await p.textContent('main')) && (await p.textContent('main')).includes('set molaları'), (await p.textContent('main')).slice(-300));
t('özet hacim = gerçek toplam (480 + 122.5 + 322.5 = 925)', (await p.textContent('main .grid.g3')).includes('925'), (await p.textContent('main .grid.g3')));
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
// 28 Eyl: parmakla sekme geçişi (touch) — İlerleme → sola kaydır → Aletler
{ const box = await p.locator('main').boundingBox(); const y = box.y + 300;
  await p.evaluate(async ({ y }) => { const m = document.querySelector('main'); const T = (type, x) => { const t = new Touch({ identifier: 1, target: m, clientX: x, clientY: y }); m.dispatchEvent(new TouchEvent(type, { touches: type === 'touchend' ? [] : [t], changedTouches: [t], bubbles: true, cancelable: true })); };
    T('touchstart', 320); for (let x = 300; x >= 150; x -= 30) { T('touchmove', x); await new Promise(r => setTimeout(r, 16)); } T('touchend', 150); }, { y });
  await p.waitForTimeout(700); t('sekme kaydırma: İlerleme → Aletler', (await p.locator('.tabs button.sel').textContent()).includes('Aletler'), await p.locator('.tabs button.sel').textContent());
  t('Aletler: bar görseli plakalarla', (await p.$$('main .barviz .pl')).length >= 2, (await p.$$('main .barviz .pl')).length);
  await tab('İlerleme'); await p.waitForTimeout(300); }
// uçak modu: offline → açılış + Alper S1 kayıt
await ctx.setOffline(true); await p.reload(); await p.waitForSelector('.hdr .t', { timeout: 15000 }); await p.waitForTimeout(300);
await tab('Bugün'); await strip('Alper Günleri'); await p.waitForTimeout(300);
await p.locator('.foot button.pri').click(); await p.waitForTimeout(300); await p.locator('.sheet .btnrow button').click(); await p.waitForTimeout(400);   // stres: şimdi değil → ısınma
await p.locator('.foot button.sec').click(); await p.waitForTimeout(400);   // ısınmayı atla
await p.locator('.log .seg button', { hasText: 'Alper' }).click(); await p.waitForTimeout(200);
t('A25: Alper seçilince ana kart Alper planına döndü (90 kg, ALPER etiketi)', (await p.$$('main .xslide.on .xcard.alper')).length === 1 && (await p.textContent('main .xslide.on .hero b')) === '90' && (await p.textContent('main .xslide.on .kim')) === 'Alper', await p.textContent('main .xslide.on .xcard'));
t('Alper segment → plan 90', await kg().inputValue() === '90', await kg().inputValue());
await p.locator('.log .setk').click(); await p.waitForTimeout(600);   // Top Single 1 set → otomatik biter (H3)
t('offline Alper kaydı 90×1', (await p.textContent('main')).includes('Alper: 90×1'), (await p.textContent('main')).slice(0, 200));
await ctx.setOffline(false);
// A19 sekme sürükleme: Bugün'den parmağı Aletler'e kaydır → baloncuk izler, sekmeler geçerken açılır
{ const bb = await p.locator('.tabs').boundingBox(); const w = (bb.width - 12) / 5; const y = bb.y + 26; const xAt = i => bb.x + 6 + w * (i + 0.5);
  await tab('Bugün'); await p.waitForTimeout(300);
  await p.mouse.move(xAt(0), y); await p.mouse.down(); for (let i = 1; i <= 12; i++) { await p.mouse.move(xAt(0) + (xAt(2) - xAt(0)) * i / 12, y); await p.waitForTimeout(25); }
  await p.waitForTimeout(300); t('A19 sürüklerken İlerleme açıldı (parmak kaldırılmadan)', (await p.$eval('.tabs button.sel', b => b.textContent)).includes('İlerleme') && (await p.$$('.tabs.scrub')).length === 1);
  for (let i = 1; i <= 6; i++) { await p.mouse.move(xAt(2) + (xAt(3) - xAt(2)) * i / 6, y); await p.waitForTimeout(25); }
  await p.mouse.up(); await p.waitForTimeout(400);
  t('A19 bırakınca Aletler, baloncuk oturdu', (await p.$eval('.tabs button.sel', b => b.textContent)).includes('Aletler') && (await p.$$('.tabs.scrub')).length === 0 && (await p.textContent('main')).includes('Plaka')); }
// Ayarlar
await tab('Ayarlar'); await p.waitForTimeout(300);
const txt = await p.textContent('main');
t('Ayarlar: toplam olay 250 + yerel', /Toplam olay.*?(2[5-9]\d)/s.test(txt), txt.slice(0, 120));
t('OneDrive ayarlı, giriş gerekli', txt.includes('giriş gerekli'), txt.slice(txt.indexOf('OneDrive'), txt.indexOf('OneDrive') + 60));
t('sayfa hatası yok', !logs.some(l => l.startsWith('PAGEERROR')), logs.filter(l => l.startsWith('PAGEERROR')).join(' | '));
console.log(`\n  ${ok}/${ok + fail} geçti — ${fail ? 'E2E BASARISIZ' : 'E2E GECTI'}`); if (fail) console.log(logs.filter(l => !l.includes('favicon')).slice(-8).join('\n'));
await b.close(); process.exit(fail ? 1 : 0);
