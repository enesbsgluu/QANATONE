#!/usr/bin/env node
/* INDIRME TESHISI (5 Eyl 2026, Enes: "chrome hala sayfa gecislerinde indirme
   yapiyor, bu hatanin koku farkli").

   ONCEKI TESHIS OLDU: McAfee WebAdvisor `Secure Preferences` icinde
   `disable_reasons:[8192]` tasiyor — EKLENTI DEVRE DISI. Belirti devam
   ediyorsa sebep o degil.

   ONCEKI OLCUMUN KOR NOKTASI: butun testler adrese DOGRUDAN gidiyordu
   (`page.goto`) ve `curl` ile baslik okuyordu. Ikisi de sitenin gercek
   gezinme yolunu KULLANMIYOR: astro.config'te `prefetch: {prefetchAll:
   true, defaultStrategy:'viewport'}` acik, yani gorunen her ic bag
   ONCEDEN cekiliyor ve tiklama Chrome'un prefetch onbelleginden
   karsilaniyor. Bu duzenek BAGA TIKLAR — kor nokta budur.

   OLCULEN: her gecmede (1) indirme basladi mi (CDP Browser.downloadWillBegin,
   eventsEnabled), (2) belge yaniti hangi basliklarla geldi, (3) gezinme
   islendi mi yoksa sayfa BOS mu kaldi (body cocuk sayisi + baslik),
   (4) konsol hatalari.

   KIRMIZI-ONCE: `--kirmizi` kolu once bilerek bir indirme tetikler
   (`<a download>`); duzenek onu GORMEZSE yesili anlamsizdir.

   Kullanim:
     node yeni/film/olc-indirme.cjs                 (canli, temiz profil)
     ADRES=http://127.0.0.1:8790 node ...           (yerel dist)
     PROFIL=kopya node ...                          (Enes'in profilinin KOPYASI)
     TUR=8 node ...                                 (gecme sayisi)
*/
const path = require('path');
const fs = require('fs');
const os = require('os');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));

const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ADRES = process.env.ADRES || 'https://www.qanatone.com/';
const TUR = Number(process.env.TUR || 8);
const KIRMIZI = process.argv.includes('--kirmizi');
const PROFIL = process.env.PROFIL || 'temiz';
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-indirme.json');

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/* Enes'in profilinin KOPYASI: eklentiler ve ayarlar durur, orijinal
   dizine DOKUNULMAZ (Chrome acikken kilitli olur, kopya sart). */
function profilKopyala() {
  const kaynak = path.join(process.env.LOCALAPPDATA, 'Google', 'Chrome', 'User Data');
  const hedef = path.join(os.tmpdir(), 'qanatone-profil-kopya');
  fs.rmSync(hedef, { recursive: true, force: true });
  fs.mkdirSync(hedef, { recursive: true });
  for (const ad of ['Local State']) {
    try { fs.copyFileSync(path.join(kaynak, ad), path.join(hedef, ad)); } catch {}
  }
  const d = path.join(hedef, 'Default');
  fs.mkdirSync(d, { recursive: true });
  for (const ad of ['Secure Preferences', 'Preferences']) {
    try { fs.copyFileSync(path.join(kaynak, 'Default', ad), path.join(d, ad)); } catch {}
  }
  try {
    fs.cpSync(path.join(kaynak, 'Default', 'Extensions'), path.join(d, 'Extensions'),
      { recursive: true, force: true });
  } catch (e) { console.error('  eklenti kopyasi eksik:', e.message); }
  return hedef;
}

(async () => {
  const userDataDir = PROFIL === 'kopya' ? profilKopyala()
    : fs.mkdtempSync(path.join(os.tmpdir(), 'qanatone-temiz-'));
  const indirmeDizin = fs.mkdtempSync(path.join(os.tmpdir(), 'qanatone-inen-'));

  const tarayici = await pt.launch({
    executablePath: CHROME,
    headless: false,
    userDataDir,
    defaultViewport: { width: 1440, height: 900 },
    args: ['--no-first-run', '--no-default-browser-check', '--disable-features=Translate',
      '--window-position=0,0'],
  });

  const sayfa = (await tarayici.pages())[0] || await tarayici.newPage();
  const cdp = await sayfa.createCDPSession();

  /* MOBIL KOLU (MOBIL=1): Enes'in belirtisi telefonda; oykunme gercek
     cihaz degildir ama site tarafinda MOBILE OZEL bir yol varsa (farkli
     bag, farkli betik dali) onu bu kol acar. */
  if (process.env.MOBIL) {
    await sayfa.emulate({
      viewport: { width: 412, height: 915, deviceScaleFactor: 2.6, isMobile: true, hasTouch: true },
      userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36',
    });
  }

  const inenler = [];
  const belgeler = [];
  const konsol = [];
  const agHatasi = [];

  /* Indirme olaylari: tarayici seviyesinde. `allowAndName` + eventsEnabled
     olmadan `downloadWillBegin` HIC gelmez (sessiz yanlis yesil). */
  const bcdp = await tarayici.target().createCDPSession();
  await bcdp.send('Browser.setDownloadBehavior', {
    behavior: 'allowAndName', downloadPath: indirmeDizin, eventsEnabled: true,
  });
  bcdp.on('Browser.downloadWillBegin', (e) => {
    inenler.push({ url: e.url, onerilenAd: e.suggestedFilename, guid: e.guid });
    console.error('  !! INDIRME:', e.suggestedFilename, '<-', e.url);
  });

  sayfa.on('console', (m) => { if (m.type() === 'error') konsol.push(m.text().slice(0, 200)); });
  sayfa.on('requestfailed', (r) => {
    agHatasi.push({ url: r.url().slice(0, 140), hata: (r.failure() || {}).errorText });
  });
  sayfa.on('response', async (r) => {
    if (r.request().resourceType() !== 'document') return;
    const h = r.headers();
    belgeler.push({
      url: r.url(), durum: r.status(),
      tur: h['content-type'] || null,
      disposition: h['content-disposition'] || null,
      nosniff: h['x-content-type-options'] || null,
      onbellek: h['cache-status'] || null,
      kaynak: r.fromCache() ? 'onbellek' : 'ag',
    });
  });

  const gecmeler = [];

  /* --- KIRMIZI-ONCE: duzenek indirmeyi GORUYOR MU? --- */
  if (KIRMIZI) {
    await sayfa.goto('about:blank');
    await sayfa.evaluate(() => {
      const a = document.createElement('a');
      a.href = 'data:text/plain;charset=utf-8,kirmizi-once';
      a.download = 'kirmizi-once.txt';
      document.body.appendChild(a); a.click();
    });
    await bekle(1500);
    console.error('KIRMIZI-ONCE kolu: gorulen indirme =', inenler.length);
    if (!inenler.length) { console.error('DUZENEK KOR — indirme olayi gelmiyor.'); process.exit(3); }
    inenler.length = 0;
  }

  await sayfa.goto(ADRES, { waitUntil: 'networkidle2', timeout: 60000 });
  await bekle(1500);

  for (let i = 0; i < TUR; i++) {
    /* Gercek gezinme: SAYFADAKI bir ic baga TIKLA. Prefetch yolu ancak
       boyle kosar; `page.goto` onu hic kullanmaz. */
    const secim = await sayfa.evaluate((gecilen) => {
      const bagl = [...document.querySelectorAll('a[href]')].filter((a) => {
        const u = new URL(a.href, location.href);
        if (u.origin !== location.origin) return false;
        if (u.pathname === location.pathname) return false;
        if (/\.(pdf|zip|jpg|png|mp4|xml|txt)$/i.test(u.pathname)) return false;
        if (a.hasAttribute('download')) return false;
        return !gecilen.includes(u.pathname);
      });
      if (!bagl.length) return null;
      const a = bagl[Math.floor(bagl.length / 3)] || bagl[0];
      /* Gorunur olsun ki prefetch (viewport stratejisi) gercekten kossun. */
      a.scrollIntoView({ block: 'center' });
      a.setAttribute('data-olc-hedef', '1');
      return { yol: new URL(a.href, location.href).pathname, metin: (a.textContent || '').trim().slice(0, 40) };
    }, gecmeler.map((g) => g.yol));
    if (!secim) { console.error('  bag kalmadi, duruldu'); break; }

    /* Prefetch'in gerceklesmesi icin bekle (viewport stratejisi IO tabanli). */
    await bekle(1200);
    const oncekiIndirme = inenler.length;
    const oncekiUrl = sayfa.url();

    await sayfa.evaluate(() => document.querySelector('[data-olc-hedef]').click());
    /* Gezinme YA olur ya olmaz — ikisini de kayda gecir, atma. */
    let gezindi = true;
    try {
      await sayfa.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 12000 });
    } catch { gezindi = false; }
    await bekle(1200);

    const durum = await sayfa.evaluate(() => ({
      url: location.href,
      baslik: document.title,
      govdeCocuk: document.body ? document.body.children.length : -1,
      govdeMetin: document.body ? document.body.innerText.trim().length : -1,
    })).catch(() => ({ url: '?', baslik: '?', govdeCocuk: -1, govdeMetin: -1 }));

    const kayit = {
      tur: i + 1, hedef: secim.yol, metin: secim.metin, oncekiUrl,
      gezindi, indirme: inenler.length - oncekiIndirme, ...durum,
    };
    kayit.bosEkran = kayit.govdeMetin >= 0 && kayit.govdeMetin < 200;
    gecmeler.push({ ...kayit, yol: secim.yol });
    console.error(`  ${i + 1}. ${secim.yol}  gezindi=${gezindi} indirme=${kayit.indirme}` +
      ` govdeMetin=${kayit.govdeMetin} bos=${kayit.bosEkran}`);
  }

  const inenDosyalar = fs.existsSync(indirmeDizin)
    ? fs.readdirSync(indirmeDizin).map((f) => ({
        ad: f, bayt: fs.statSync(path.join(indirmeDizin, f)).size,
      })) : [];

  const rapor = {
    zaman: new Date().toISOString(), adres: ADRES, profil: PROFIL, tur: TUR,
    chrome: await tarayici.version(),
    ozet: {
      gecme: gecmeler.length,
      indirmeSayisi: inenler.length,
      gezinmeyen: gecmeler.filter((g) => !g.gezindi).length,
      bosEkran: gecmeler.filter((g) => g.bosEkran).length,
    },
    inenler, inenDosyalar, gecmeler,
    belgeYanitlari: belgeler,
    konsolHatalari: konsol.slice(0, 20),
    agHatalari: agHatasi.slice(0, 20),
  };
  fs.writeFileSync(CIKTI, JSON.stringify(rapor, null, 2));
  console.error('\nOZET:', JSON.stringify(rapor.ozet));
  console.error('kayit:', CIKTI);
  await tarayici.close();
  process.exit(rapor.ozet.indirmeSayisi > 0 || rapor.ozet.bosEkran > 0 ? 2 : 0);
})().catch((e) => { console.error('DUZENEK HATASI:', e); process.exit(1); });
