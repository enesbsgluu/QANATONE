#!/usr/bin/env node
/* YAYIN ENVANTERI (6 Eyl 2026, Enes: "mcp ve backend baglantilari
   envanterin disinda bir yerdeyse envantere tasi").

   NEDEN VAR. Bu depoda dagini bir surece dagilmis bilgi vardi: hangi
   Netlify fonksiyonu hangi ORTAM DEGISKENINI istiyor, hangi dis servise
   baglaniyoruz, panel zinciri hangi dosyalardan geciyor, yayin hattinin
   hangi dosyalari SART. Hicbiri tek yerde durmuyordu; kesme gunu eksik
   bir ortam degiskeni yayin hattini sessizce dusururdu.

   BU BETIK HUKUM VERIR: sart olan bir kalem eksikse cikis kodu 1.
   "Enes'te" olan kalemler (ortam degiskenlerinin DEGERLERI Netlify
   panelinde durur, depoda DURMAZ ve durmamali) EKSIK sayilmaz — ama
   ADLARIYLA listelenir ki kesme gunu kontrol edilecek liste belli olsun.

   Kullanim: node yeni/yayin-envanteri.cjs
   Cikti   : yeni/yayin-envanteri.json */
const fs = require('fs');
const path = require('path');
const KOK = path.join(__dirname, '..');
const CIKTI = path.join(__dirname, 'yayin-envanteri.json');
const varMi = (p) => fs.existsSync(path.join(KOK, p));
const oku = (p) => { try { return fs.readFileSync(path.join(KOK, p), 'utf8'); } catch (e) { return ''; } };

const kusur = [];
const env = {};

/* ---- 1 · NETLIFY FONKSIYONLARI ve ORTAM DEGISKENLERI ---- */
const FN_DIZIN = path.join(KOK, 'netlify', 'functions');
const fonksiyonlar = fs.existsSync(FN_DIZIN)
  ? fs.readdirSync(FN_DIZIN).filter((f) => f.endsWith('.js')).map((f) => {
      const kaynak = fs.readFileSync(path.join(FN_DIZIN, f), 'utf8');
      const degiskenler = [...new Set([...kaynak.matchAll(/process\.env\.([A-Z_0-9]+)/g)].map((m) => m[1]))]
        .filter((v) => v !== 'LAMBDA_TASK_ROOT');   /* Netlify'in kendi degiskeni */
      for (const d of degiskenler) (env[d] = env[d] || []).push(f);
      return {
        dosya: f, satir: kaynak.split('\n').length,
        ortam_degiskeni: degiskenler,
        ne_yapar: (kaynak.match(/^\/\*[\s\S]{0,400}?\n/) || [''])[0].split('\n').slice(1, 3).join(' ').replace(/^\s*/, '').trim().slice(0, 150),
      };
    })
  : [];
if (!fonksiyonlar.length) kusur.push('netlify/functions bos ya da yok');

/* ---- 2 · DIS SERVISLER — nereden besleniyor, degeri nerede ---- */
const icerik = (() => { try { return JSON.parse(oku('content.json')); } catch (e) { return {}; } })();
const ayar = icerik.settings || {};
const servisler = [
  { ad: 'Google Analytics / GTM', kaynak: 'panel · settings.gtm', deger: ayar.gtm ? 'DOLU' : 'bos',
    not: 'Bossa hic istek atilmaz. Doldurulunca CEREZ ONAYI gerekebilir (KVKK) — onay bandi yok, karar Enes\'te.' },
  { ad: 'Google Search Console', kaynak: 'panel · settings.gsc', deger: ayar.gsc ? 'DOLU' : 'bos',
    not: 'HTML etiketi yontemi. Bossa etiket basilmaz. Sitemap bildirimi kesme sonrasi elle.' },
  { ad: 'Google AdSense', kaynak: 'panel · settings.adsense', deger: ayar.adsense ? 'DOLU' : 'bos',
    not: 'Sahiplik meta etiketi + ads.txt uretir. Reklam BIRIMI koymaz — o ayri tasarim karari.' },
  { ad: 'WhatsApp Cloud API', kaynak: 'ortam · WA_TOKEN/WA_PHONE_ID/WA_TO/WA_TEMPLATE/WA_LANG',
    deger: 'Netlify panelinde', not: 'submission-created: form gelince bildirim. Degerler depoda DURMAZ.' },
  { ad: 'GitHub Contents API', kaynak: 'ortam · GITHUB_TOKEN', deger: 'Netlify panelinde',
    not: 'yayinla.js content.json commit eder. Panelin YAZMA yolu bu.' },
  { ad: 'Netlify Forms', kaynak: 'statik HTML · data-netlify="true"', deger: varMi('dist/index.html') && /data-netlify="true"/.test(oku('dist/index.html')) ? 'FORM URETIMDE' : 'BULUNAMADI',
    not: 'Formu DERLEME ANINDAKI statik HTML\'den tanir; kesmede HTML degisecegi icin form YENIDEN taninmali (kesme dogrulama listesi madde 5).' },
  { ad: 'IndexNow (Bing/Yandex)', kaynak: 'eski build.js', deger: /INDEXNOW/i.test(oku('build.js')) ? 'ESKI TARAFTA VAR' : 'yok',
    not: 'Kesme adimi 9: yeni tarafa tasinsin mi — Enes\'in karari.' },
  { ad: 'MCP uc noktasi', kaynak: '—', deger: 'YOK (bilincli)',
    not: 'Ajan hazirligi turunda REDDEDILDI: Content Site kapsaminda degil, ticaret/ajan protokolleri bir ajans sitesinde uygulanmaz. Bileske puan kovalanmiyor.' },
];

/* ---- 3 · YAYIN HATTI DOSYALARI ---- */
const hat = [
  { dosya: 'netlify.toml', sart: true },
  { dosya: 'yeni/public/robots.txt', sart: true },
  { dosya: 'yeni/src/pages/sitemap.xml.ts', sart: true },
  { dosya: 'yeni/src/pages/bulten/rss.xml.ts', sart: false },
  /* KESME (6 Eyl 2026): kok _headers SILINDI, kaynak yeni/public/_headers.
     Astro public/'i dist'e kendi tasir; arada kopyalayan adim yok. */
  { dosya: 'yeni/public/_headers', sart: true },

  { dosya: 'yeni/public/_redirects', sart: true, not: 'kesme adimi 4te dogdu — 59 eski adresin tasiyicisi' },
  { dosya: 'admin.html', sart: true },
  { dosya: 'content.json', sart: true },
].map((h) => ({ ...h, var: varMi(h.dosya) }));
for (const h of hat) if (h.sart && !h.var) kusur.push('yayin hatti dosyasi eksik: ' + h.dosya);

/* ---- 4 · PANEL ZINCIRI ---- */
const zincir = [
  { adim: 'admin.html', rol: 'panel arayuzu; metin haritasi gomulu (metin-harita.cjs uretir)' },
  { adim: 'netlify/functions/panel.js', rol: 'Basic Auth + admin.html servisi (PANEL_PAROLA_HASH)' },
  { adim: 'netlify/functions/yayinla.js', rol: 'panelden gelen govdeyi content.json olarak GitHub\'a commit eder (GITHUB_TOKEN)' },
  { adim: 'content.json', rol: 'TEK veri kaynagi; derleme onu okur' },
  { adim: 'yeni/ derleme', rol: 'astro build + denetim.cjs' },
];
const zincirKusur = [];
if (!/\/admin\.html\s+\/\.netlify\/functions\/panel/.test(oku('yeni/public/_redirects') + oku('dist/_redirects')))
  zincirKusur.push('_redirects: /admin.html -> panel fonksiyonu yonlendirmesi bulunamadi');
if (!/included_files\s*=\s*\[\s*"admin\.html"/.test(oku('netlify.toml')))
  zincirKusur.push('netlify.toml: [functions] included_files admin.html yok');
if (!/JSON\.stringify\(govde\.content/.test(oku('netlify/functions/yayinla.js')))
  zincirKusur.push('yayinla.js content.json yazma yolu degismis');
kusur.push(...zincirKusur);

/* ---- 5 · KESME ONCESI DOLU OLMASI GEREKEN PANEL ALANLARI ---- */
const yol = (o, p) => p.split('.').reduce((x, k) => (x == null ? x : x[k]), o);
const kesmeAlan = ['settings.whatsapp', 'settings.email', 'legal.line', 'legal.kvkk', 'founder.bio.tr', 'socials.0.url']
  .map((p) => ({ alan: p, dolu: !!String(yol(icerik, p) || '').trim() }));
const bosKesme = kesmeAlan.filter((a) => !a.dolu).map((a) => a.alan);

const rapor = {
  _: 'yeni/yayin-envanteri.cjs — yayin hattinin BAGLI OLDUGU her sey tek yerde: backend fonksiyonlari, ortam degiskenleri, dis servisler, panel zinciri, kesme oncesi dolu olmasi gereken alanlar. Ortam degiskeni DEGERLERI depoda durmaz ve durmamali; burada ADLARI listelenir.',
  olcum: new Date().toISOString(),
  fonksiyon: fonksiyonlar,
  ortam_degiskenleri: Object.entries(env).map(([ad, nerede]) => ({ ad, kullanan: nerede, deger: 'Netlify panelinde (depoda YOK)' })),
  dis_servis: servisler,
  yayin_hatti_dosyalari: hat,
  panel_zinciri: zincir,
  panel_zinciri_kusur: zincirKusur,
  kesme_oncesi_panel_alanlari: kesmeAlan,
  kesme_oncesi_bos: bosKesme,
  kusur,
};
fs.writeFileSync(CIKTI, JSON.stringify(rapor, null, 1));

console.log('YAYIN ENVANTERI');
console.log(`\n  BACKEND (${fonksiyonlar.length} Netlify fonksiyonu)`);
for (const f of fonksiyonlar) console.log(`    ${f.dosya.padEnd(24)} ${f.satir} satir · env: ${f.ortam_degiskeni.join(', ') || '—'}`);
console.log(`\n  ORTAM DEGISKENLERI (${rapor.ortam_degiskenleri.length}) — degerleri Netlify panelinde, depoda YOK`);
for (const e of rapor.ortam_degiskenleri) console.log(`    ${e.ad.padEnd(22)} ${e.kullanan.join(', ')}`);
console.log('\n  DIS SERVISLER');
for (const s of servisler) console.log(`    ${s.ad.padEnd(26)} ${String(s.deger).padEnd(18)} ${s.kaynak}`);
console.log('\n  YAYIN HATTI DOSYALARI');
for (const h of hat) console.log(`    ${h.var ? 'var' : (h.sart ? 'EKSIK' : 'yok')}  ${h.dosya}${h.not ? '  (' + h.not + ')' : ''}`);
console.log('\n  PANEL ZINCIRI');
for (const z of zincir) console.log(`    ${z.adim.padEnd(34)} ${z.rol}`);
if (zincirKusur.length) for (const k of zincirKusur) console.log(`    !! ${k}`);
console.log(`\n  KESME ONCESI DOLU OLMASI GEREKEN ALANLAR: ${kesmeAlan.filter((a) => a.dolu).length}/${kesmeAlan.length}`);
if (bosKesme.length) console.log(`    BOS (Enes doldurmali): ${bosKesme.join(', ')}`);

console.log(`\nHUKUM: ${kusur.length === 0 ? 'GECTI' : 'KALDI'}${kusur.length ? ' — ' + kusur.join(' | ') : ''}`);
console.log(`→ ${CIKTI}`);
process.exit(kusur.length === 0 ? 0 : 1);
