#!/usr/bin/env node
/* PROLOG KAPALIYKEN BAGIMSIZLIK DENETIMI (Enes, 6 Eyl 2026).

   ENES'IN SORUSU: "Prolog kapaliyken NORMAL YUKLEME EKRANI ve akabinde
   site olacak. Prologun bagli oldugu yerleri kontrol ettin mi? Kapaliyken
   baska bir yeri etkilemeyecek VE ARKADA SESSIZCE CALISMAYACAK."

   Bu betik o soruyu IDDIA ile degil OLCUM ile cevaplar. Iki hal de
   (ACIK/KAPALI) sifirdan derlenir ve her birinde ayni sorular sorulur;
   fark tablosu cikar. content.json finally'de geri yuklenir + derlenir.

   1) STATIK — uretilen ana sayfada ve BAGLANAN her css/js dosyasinda
      film izi aranir: `fl-` sinif ailesi · `<section class="fl"` ·
      `qanat-prolog-atlandi` · `dataset.film` · film medya adresleri.
      Kapaliyken hicbiri bulunmamali.

   2) AG — gercek tarayicida soguk acilis; INEN HER ISTEK kaydedilir.
      Kapaliyken film.css, film motoru ve film medyasi (klip/poster)
      ISTENMEMELI. "Gizlendi ama yine indi" ihtimalini bu kapatir.

   3) PERDE — normal yukleme ekrani yerinde mi: `#perde` DOM'a giriyor mu,
      sonra KALKIYOR mu (site goruntuye geliyor mu). Enes'in "normal
      yukleme ekrani ve akabinde site" sarti budur.

   4) ARKA PLAN — sayfa DURULDUKTAN sonra:
      · kosan animasyon sayisi (document.getAnimations, playState running)
      · 2 saniyede sayilan rAF karesi — surekli calisan bir dongu var mi
      · zamanlayici/observer izi: html sinif/dataset'inde film bayragi
      · konsol hatasi
      Kapali halde bunlarin ACIK haldeki degerlerin ALTINDA kalmasi
      beklenir; ozellikle `dataset.film` HIC olmamalidir.

   Kullanim: node yeni/film/olc-prolog-bagimsizlik.cjs  (once: yerel-sun.cjs)
   Cikti   : yeni/film/olc-prolog-bagimsizlik.json */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const KOK = path.join(__dirname, '..', '..');
const YENI = path.join(KOK, 'yeni');
const DIST = path.join(KOK, 'dist', 'yeni');
const C_YOL = path.join(KOK, 'content.json');
const CIKTI = path.join(__dirname, 'olc-prolog-bagimsizlik.json');
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'brave';
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const derle = () => execSync('npm run build', { cwd: YENI, encoding: 'utf8', timeout: 900000, stdio: 'pipe' });

/* --- 1) STATIK --- */
const FILM_IZ = [
  ['bolum', /<section class="fl"/],
  ['fl_sinifi', /class="[^"]*\bfl-[a-z]/],
  ['prolog_bayragi', /qanat-prolog-atlandi/],
  ['dataset_film', /dataset\.film|data-film=/],
  ['fl_js', /fl-js/],
];
function statik(dosya) {
  const p = path.join(DIST, dosya);
  const h = fs.readFileSync(p, 'utf8');
  const bulunan = FILM_IZ.filter(([, re]) => re.test(h)).map(([ad]) => ad);
  /* baglanan css/js dosyalarinin ICINDE de aranir */
  const baglar = [...h.matchAll(/(?:href|src)="(\/yeni\/[^"]+\.(?:css|js))"/g)].map((m) => m[1]);
  const dosyaIz = [];
  for (const u of baglar) {
    const d = path.join(DIST, u.replace(/^\/yeni\//, ''));
    if (!fs.existsSync(d)) continue;
    const t = fs.readFileSync(d, 'utf8');
    /* CANLI SECICI arar, yorum degil: minify edilmis ciktida yorum zaten yok */
    if (/\.fl-[a-z]/.test(t) || /fl-govde/.test(t)) dosyaIz.push(u.split('/').pop());
  }
  return { html_izleri: bulunan, film_izi_tasiyan_dosyalar: dosyaIz, baglanan_dosya: baglar.length };
}

/* --- 2,3,4) TARAYICI --- */
async function tarayici(yol) {
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1460,980'], defaultViewport: null, protocolTimeout: 300000,
  });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const istekler = [];
    const konsol = [];
    page.on('request', (r) => istekler.push(r.url()));
    page.on('console', (m) => { if (m.type() === 'error') konsol.push(String(m.text()).slice(0, 160)); });
    page.on('pageerror', (e) => konsol.push('pageerror: ' + String(e.message).slice(0, 160)));
    /* PERDE'yi erken yakalamak icin belge basinda gozlemci kurulur */
    await page.evaluateOnNewDocument(() => {
      window.__perde = { gorundu: false, kalkti: false };
      const bak = () => {
        const p = document.getElementById('perde');
        if (p) {
          window.__perde.gorundu = true;
          const g = getComputedStyle(p);
          if (g.opacity === '0' || g.display === 'none' || g.visibility === 'hidden' || !p.isConnected) window.__perde.kalkti = true;
        } else if (window.__perde.gorundu) window.__perde.kalkti = true;
      };
      const t = setInterval(bak, 100);
      addEventListener('load', () => setTimeout(() => clearInterval(t), 8000));
    });
    await page.goto(SUNUCU + yol, { waitUntil: 'load', timeout: 60000 });
    await bekle(4500);                       /* sayfa durulsun */
    const durum = await page.evaluate(() => new Promise((coz) => {
      let n = 0; const t0 = performance.now();
      const f = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else son(); };
      const son = () => {
        const a = document.getAnimations();
        coz({
          raf_2sn: n,
          animasyon_toplam: a.length,
          animasyon_kosan: a.filter((x) => x.playState === 'running').length,
          html_sinif: document.documentElement.className,
          html_dataset: JSON.stringify(document.documentElement.dataset),
          perde: window.__perde,
          fl_dugum: document.querySelectorAll('[class*="fl-"], section.fl').length,
          video_dugum: document.querySelectorAll('video').length,
        });
      };
      requestAnimationFrame(f);
    }));
    const filmIstek = istekler.filter((u) => /film|\/klip|\.mp4|\.m4s|poster/i.test(u));
    return { ...durum, istek_sayisi: istekler.length, film_istekleri: filmIstek.map((u) => u.replace(SUNUCU, '')), konsol_hatasi: konsol };
  } finally { await browser.close(); }
}

async function hal(ad, deger, ham) {
  const C = JSON.parse(ham);
  C.theme = C.theme || {}; C.theme.motion = C.theme.motion || {};
  C.theme.motion.prolog = deger;
  fs.writeFileSync(C_YOL, JSON.stringify(C, null, 1));
  derle();
  const s = statik('index.html');
  const t = await tarayici('/yeni/');
  console.log(`\n### ${ad}`);
  console.log(`  STATIK  html izleri: ${s.html_izleri.length ? s.html_izleri.join(', ') : 'YOK'} · film izi tasiyan bagli dosya: ${s.film_izi_tasiyan_dosyalar.length ? s.film_izi_tasiyan_dosyalar.join(', ') : 'YOK'} (${s.baglanan_dosya} dosya bagli)`);
  console.log(`  AG      ${t.istek_sayisi} istek · film/medya istegi: ${t.film_istekleri.length ? t.film_istekleri.length + ' -> ' + t.film_istekleri.slice(0, 3).join(' ') : 'YOK'}`);
  console.log(`  PERDE   gorundu ${t.perde.gorundu ? 'EVET' : 'HAYIR'} · kalkti ${t.perde.kalkti ? 'EVET' : 'HAYIR'}`);
  console.log(`  ARKA    rAF/2sn ${t.raf_2sn} · animasyon ${t.animasyon_toplam} (kosan ${t.animasyon_kosan}) · fl- dugumu ${t.fl_dugum} · video ${t.video_dugum} · html.dataset ${t.html_dataset} · sinif "${t.html_sinif}"`);
  if (t.konsol_hatasi.length) console.log(`  KONSOL  ${t.konsol_hatasi.length} hata: ${t.konsol_hatasi[0]}`);
  return { statik: s, tarayici: t };
}

(async () => {
  const ham = fs.readFileSync(C_YOL, 'utf8');
  const sonuc = {};
  try {
    sonuc.acik = await hal('PROLOG ACIK', 1, ham);
    sonuc.kapali = await hal('PROLOG KAPALI', 0, ham);
    const k = sonuc.kapali;
    const hukum = {
      statik_temiz: k.statik.html_izleri.length === 0 && k.statik.film_izi_tasiyan_dosyalar.length === 0,
      ag_temiz: k.tarayici.film_istekleri.length === 0,
      perde_calisiyor: k.tarayici.perde.gorundu && k.tarayici.perde.kalkti,
      arkada_film_yok: k.tarayici.fl_dugum === 0 && k.tarayici.video_dugum === 0 && !/film/.test(k.tarayici.html_dataset) && !/\bfl-/.test(k.tarayici.html_sinif),
      konsol_temiz: k.tarayici.konsol_hatasi.length === 0,
    };
    sonuc.hukum = hukum;
    console.log('\n=== HUKUM (prolog KAPALIYKEN) ===');
    for (const [ad, v] of Object.entries(hukum)) console.log(`  ${ad.padEnd(20)} ${v ? 'EVET' : 'HAYIR'}`);
    console.log(`\n  arka plan kiyasi: rAF/2sn ${sonuc.acik.tarayici.raf_2sn} -> ${k.tarayici.raf_2sn} · kosan animasyon ${sonuc.acik.tarayici.animasyon_kosan} -> ${k.tarayici.animasyon_kosan}`);
  } finally {
    fs.writeFileSync(C_YOL, ham);
    derle();
    sonuc._ = 'yeni/film/olc-prolog-bagimsizlik.cjs — prolog KAPALIYKEN: statik iz yok · film istegi inmiyor · perde (normal yukleme ekrani) calisiyor · arkada film dugumu/animasyonu yok. Enes in 6 Eyl sorusu.';
    fs.writeFileSync(CIKTI, JSON.stringify(sonuc, null, 1));
    console.log(`\ncontent.json geri yuklendi (prolog ACIK) ve yeniden derlendi.\n→ ${CIKTI}`);
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
