#!/usr/bin/env node
/* PROLOG ANAHTARI — AÇIK ↔ KAPALI YÜK FARKI (Enes, 6 Eyl 2026).

   ENES'IN SARTI: "Acik hali ve kapali hali AYNI YUKLENME DEGERLERINDE
   OLMAMALI — kapatinca onun etkiledigi kasma degeri DUSMELI. Yani tamamen
   bagimsiz." Bu betik o sarti OLCER; iddia etmez.

   YONTEM — TEK DEGISKEN: content.json'da yalnizca `theme.motion.prolog`
   oynatilir (1 -> 0), her iki halde SIFIRDAN derlenir ve ayni olculer
   alinir. content.json finally'de geri yuklenir ve agac yeniden derlenir;
   kosum yarida kesilse bile agac acik halde kalir.

   OLCULENLER (ikisi de ayni derlemeden):
     BAYT   ana sayfanin ham/gzip HTML'i · sayfaya BAGLANAN css ve js
            dosyalarinin diskteki boyutu (link/script src'lerinden) ·
            satir ici betik ve stil bayti. "Sayfa kuculdu mu" sorusu.
     IZ     `<section class="fl"` · film.css baglantisi · fl-govde kancasi.
            "Gercekten girmedi mi" sorusu — gizlenmedi, GIRMEDI.
     DENETIM her iki halde `node denetim.cjs` (62 kural). "Baska hicbir
            kismi bozmadi mi" sorusu. J1/H18/H24 tavanlari prolog izine
            bakip kendiliginden SIKILASIR, yani kapali hal bedava gecmez.

   KARE BEDELI AYRI OLCULUR: `olc-soguk.cjs` (Kapi B) iki halde ayri
   kosulur; burada olculmez cunku o kapi kendi isinma dizisini ister.

   Kullanim: node yeni/film/olc-prolog-anahtar.cjs
   Cikti   : yeni/film/olc-prolog-anahtar.json */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { execSync } = require('child_process');
const KOK = path.join(__dirname, '..', '..');
const YENI = path.join(KOK, 'yeni');
const DIST = path.join(KOK, 'dist', 'yeni');
const C_YOL = path.join(KOK, 'content.json');
const CIKTI = path.join(__dirname, 'olc-prolog-anahtar.json');
const SAYFALAR = ['index.html', 'en/index.html'];

const derle = () => execSync('npm run build', { cwd: YENI, encoding: 'utf8', timeout: 900000, stdio: 'pipe' });
const denetle = () => {
  try { const o = execSync('node denetim.cjs', { cwd: YENI, encoding: 'utf8', timeout: 300000 }); return { cikti: o, kod: 0 }; }
  catch (e) { return { cikti: String(e.stdout || '') + String(e.stderr || ''), kod: e.status ?? 1 }; }
};
const ozetDenetim = (r) => {
  const m = r.cikti.match(/(\d+) geçti · (\d+) kaldı/);
  return { gecti: m ? +m[1] : null, kaldi: m ? +m[2] : null, kirmizilar: r.cikti.split('\n').filter((s) => s.startsWith('  !! ')).map((s) => s.trim()) };
};

/* Sayfaya BAGLANAN varliklarin diskteki boyutu — "indirilecek bayt" sorusu.
   Satir ici stil/betik ayri sayilir: onlar HTML'in icinde geliyor. */
function olc(dosya) {
  const p = path.join(DIST, dosya);
  if (!fs.existsSync(p)) return null;
  const h = fs.readFileSync(p, 'utf8');
  const bag = (re) => [...h.matchAll(re)].map((m) => m[1]).filter((u) => u.startsWith('/yeni/'));
  const css = bag(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"/g);
  const js = bag(/<script[^>]*\bsrc="([^"]+)"/g);
  const diskte = (liste) => liste.reduce((a, u) => {
    const d = path.join(DIST, u.replace(/^\/yeni\//, ''));
    return a + (fs.existsSync(d) ? fs.statSync(d).size : 0);
  }, 0);
  const satirIciBetik = [...h.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)]
    .filter((m) => !/ld\+json/.test(m[1])).reduce((a, m) => a + Buffer.byteLength(m[2]), 0);
  const satirIciStil = [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].reduce((a, m) => a + Buffer.byteLength(m[1]), 0);
  return {
    html: Buffer.byteLength(h),
    html_gzip: zlib.gzipSync(h, { level: 9 }).length,
    css_dosya: css.length, css_bayt: diskte(css),
    js_dosya: js.length, js_bayt: diskte(js),
    satir_ici_betik: satirIciBetik, satir_ici_stil: satirIciStil,
    /* IZ — prolog gercekten girdi mi */
    iz: {
      film_bolumu: /<section class="fl"/.test(h),
      film_css: css.some((u) => /film/i.test(u)),
      fl_govde_kancasi: /class="[^"]*\bfl-govde\b/.test(h),
      fl_gizli_h1: /class="fl-gizli"/.test(h),
    },
  };
}

const toplam = (o) => o ? o.html + o.css_bayt + o.js_bayt : null;

function hal(ad) {
  derle();
  const d = ozetDenetim(denetle());
  const s = {};
  for (const y of SAYFALAR) s[y] = olc(y);
  console.log(`\n### ${ad} · denetim ${d.gecti}/${d.kaldi}${d.kirmizilar.length ? ' · ' + d.kirmizilar.join(' | ') : ''}`);
  for (const y of SAYFALAR) {
    const x = s[y];
    if (!x) { console.log(`  ${y}: YOK`); continue; }
    console.log(`  ${y.padEnd(15)} HTML ${x.html} (gzip ${x.html_gzip}) · css ${x.css_dosya} dosya ${x.css_bayt} B · js ${x.js_dosya} dosya ${x.js_bayt} B · satir ici betik ${x.satir_ici_betik} B · TOPLAM ${toplam(x)} B · film bolumu ${x.iz.film_bolumu ? 'VAR' : 'yok'} · film.css ${x.iz.film_css ? 'VAR' : 'yok'}`);
  }
  return { denetim: d, sayfa: s };
}

const ham = fs.readFileSync(C_YOL, 'utf8');
let sonuc = {};
try {
  const yaz = (v) => {
    const C = JSON.parse(ham);
    C.theme = C.theme || {}; C.theme.motion = C.theme.motion || {};
    C.theme.motion.prolog = v;
    fs.writeFileSync(C_YOL, JSON.stringify(C, null, 1));
  };
  yaz(1); sonuc.acik = hal('PROLOG ACIK (theme.motion.prolog = 1)');
  yaz(0); sonuc.kapali = hal('PROLOG KAPALI (theme.motion.prolog = 0)');

  console.log('\n=== FARK (acik -> kapali) ===');
  const fark = {};
  for (const y of SAYFALAR) {
    const a = sonuc.acik.sayfa[y], k = sonuc.kapali.sayfa[y];
    if (!a || !k) continue;
    fark[y] = {
      html: k.html - a.html, html_gzip: k.html_gzip - a.html_gzip,
      css_bayt: k.css_bayt - a.css_bayt, js_bayt: k.js_bayt - a.js_bayt,
      satir_ici_betik: k.satir_ici_betik - a.satir_ici_betik,
      toplam: toplam(k) - toplam(a),
      yuzde: +(((toplam(k) - toplam(a)) / toplam(a)) * 100).toFixed(1),
    };
    const f = fark[y];
    console.log(`  ${y.padEnd(15)} HTML ${f.html} B (gzip ${f.html_gzip}) · css ${f.css_bayt} B · js ${f.js_bayt} B · satir ici betik ${f.satir_ici_betik} B  ->  TOPLAM ${f.toplam} B (${f.yuzde}%)`);
  }
  sonuc.fark = fark;
  const izTemiz = SAYFALAR.every((y) => {
    const k = sonuc.kapali.sayfa[y];
    return k && !k.iz.film_bolumu && !k.iz.film_css && !k.iz.fl_govde_kancasi;
  });
  const bagimsiz = sonuc.acik.denetim.kaldi === 0 && sonuc.kapali.denetim.kaldi === 0;
  const kuculdu = SAYFALAR.every((y) => fark[y] && fark[y].toplam < 0);
  console.log(`\nIZ TEMIZ (kapaliyken film bolumu/film.css/fl-govde kancasi YOK): ${izTemiz ? 'EVET' : 'HAYIR'}`);
  console.log(`YUK DUSTU (her iki ana sayfada toplam bayt azaldi): ${kuculdu ? 'EVET' : 'HAYIR'}`);
  console.log(`BAGIMSIZ (denetim iki halde de 62/0): ${bagimsiz ? 'EVET' : 'HAYIR'}`);
  sonuc.hukum = { iz_temiz: izTemiz, yuk_dustu: kuculdu, bagimsiz };
} finally {
  fs.writeFileSync(C_YOL, ham);
  derle();
  console.log('\ncontent.json geri yuklendi (prolog ACIK) ve yeniden derlendi.');
  sonuc._ = 'yeni/film/olc-prolog-anahtar.cjs — panel anahtarinin ACIK/KAPALI yuk farki. Enes in sarti: "kapali hali acik haliyle ayni yuklenme degerlerinde olmamali". Tek degisken: theme.motion.prolog. Kare bedeli ayri olculur (olc-soguk.cjs).';
  fs.writeFileSync(CIKTI, JSON.stringify(sonuc, null, 1));
  console.log(`→ ${CIKTI}`);
}
