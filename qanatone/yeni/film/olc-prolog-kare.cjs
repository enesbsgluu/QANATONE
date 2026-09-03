#!/usr/bin/env node
/* PROLOG ANAHTARI — KARE BEDELI ACIK ↔ KAPALI (Enes, 6 Eyl 2026).

   Enes'in sarti iki yarimdi. Bayt yarisi olc-prolog-anahtar.cjs'te olculdu
   (kapali: -53.824 B, -%20,3). Bu betik OTEKI yarimi olcer:
   "kapatinca onun etkiledigi KASMA DEGERI dusmeli".

   YONTEM: tek degisken (`theme.motion.prolog`), her iki halde sifirdan
   derleme, ve her iki halde KAPI B'nin kendi araci (olc-soguk.cjs) —
   soguk giris, taze tarayici profili, sabit isinma dizisi. Kapi B secildi
   cunku prologun bedeli ISINMIS tarayicida degil SOGUK GIRISTE gorunur;
   ziyaretcinin gordugu de odur.

   KAPSAM: yalnizca iki ana sayfa (/yeni/ ve /yeni/en/) — prolog yalnizca
   orada. Kapi B'nin dokuz sayfalik varsayilan listesi degil, o yuzden
   cikti KISMI etiketi tasir ve HUKUM DEGILDIR; burada sorulan sey kapi
   degil FARK.

   content.json finally'de geri yuklenir ve agac yeniden derlenir.
   Kullanim: node yeni/film/olc-prolog-kare.cjs   (once: node yerel-sun.cjs)
   Cevre   : TEKRAR (varsayilan 5, olc-soguk'a gecer) */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const KOK = path.join(__dirname, '..', '..');
const YENI = path.join(KOK, 'yeni');
const C_YOL = path.join(KOK, 'content.json');
const CIKTI = path.join(__dirname, 'olc-prolog-kare.json');
const TEKRAR = process.env.TEKRAR || '5';

const derle = () => execSync('npm run build', { cwd: YENI, encoding: 'utf8', timeout: 900000, stdio: 'pipe' });

function soguk(etiket, ciktiAd) {
  const ort = { ...process.env, LISTE: '/yeni/,/yeni/en/', TEKRAR, CIKTI: ciktiAd };
  try { execSync('node film/olc-soguk.cjs', { cwd: YENI, encoding: 'utf8', timeout: 1800000, env: ort, stdio: 'pipe' }); }
  catch (e) { /* KISMI kosum cikis kodunu dusurmez; yine de yut */ }
  const j = JSON.parse(fs.readFileSync(path.join(__dirname, ciktiAd), 'utf8'));
  const s = {};
  for (const p of j.sayfa) {
    s[p.yol] = {
      kacirilan_medyan: p.kacirilan_medyan,
      kacirilan_kosumlar: p.kacirilan_kosumlar,
      p95_medyan: p.p95_medyan,
      kare_p95_medyan: p.kare_p95_medyan,
      takilma_toplam_medyan_ms: p.bilgi ? p.bilgi.takilma_toplam_medyan_ms : null,
      takilma_sayi_medyan: p.bilgi ? p.bilgi.takilma_sayi_medyan : null,
      takilma_tek_max: p.takilma_tek_max,
      tur_ms_medyan: p.bilgi ? p.bilgi.tur_ms_medyan : null,
      taban_takilma: p.taban_takilma,
    };
  }
  console.log(`\n### ${etiket}`);
  for (const [y, x] of Object.entries(s)) {
    console.log(`  ${y.padEnd(12)} kacirilan ${x.kacirilan_kosumlar.join('/')} → ${x.kacirilan_medyan} · p95 ${x.p95_medyan} ms (${x.kare_p95_medyan} tik) · takilma ${x.takilma_sayi_medyan}x${x.takilma_toplam_medyan_ms} ms · tek ${x.takilma_tek_max} ms · tur ${(x.tur_ms_medyan / 1000).toFixed(2)} sn · taban ${x.taban_takilma.join('/')}`);
  }
  return s;
}

const ham = fs.readFileSync(C_YOL, 'utf8');
const sonuc = {};
try {
  const yaz = (v) => {
    const C = JSON.parse(ham);
    C.theme = C.theme || {}; C.theme.motion = C.theme.motion || {};
    C.theme.motion.prolog = v;
    fs.writeFileSync(C_YOL, JSON.stringify(C, null, 1));
  };
  yaz(1); derle(); sonuc.acik = soguk('PROLOG ACIK', 'olc-soguk-prolog-acik.json');
  yaz(0); derle(); sonuc.kapali = soguk('PROLOG KAPALI', 'olc-soguk-prolog-kapali.json');

  console.log('\n=== FARK (acik → kapali) ===');
  const fark = {};
  for (const y of Object.keys(sonuc.acik)) {
    const a = sonuc.acik[y], k = sonuc.kapali[y];
    if (!a || !k) continue;
    fark[y] = {
      kacirilan: k.kacirilan_medyan - a.kacirilan_medyan,
      p95_ms: +(k.p95_medyan - a.p95_medyan).toFixed(1),
      takilma_toplam_ms: k.takilma_toplam_medyan_ms - a.takilma_toplam_medyan_ms,
      takilma_sayi: k.takilma_sayi_medyan - a.takilma_sayi_medyan,
      tek_ms: k.takilma_tek_max - a.takilma_tek_max,
      tur_ms: k.tur_ms_medyan - a.tur_ms_medyan,
    };
    const f = fark[y];
    console.log(`  ${y.padEnd(12)} kacirilan ${f.kacirilan >= 0 ? '+' : ''}${f.kacirilan} · p95 ${f.p95_ms >= 0 ? '+' : ''}${f.p95_ms} ms · takilma toplam ${f.takilma_toplam_ms >= 0 ? '+' : ''}${f.takilma_toplam_ms} ms (${f.takilma_sayi >= 0 ? '+' : ''}${f.takilma_sayi} adet) · tek ${f.tek_ms >= 0 ? '+' : ''}${f.tek_ms} ms · tur ${f.tur_ms >= 0 ? '+' : ''}${Math.round(f.tur_ms)} ms`);
  }
  sonuc.fark = fark;
  const dustu = Object.values(fark).every((f) => f.kacirilan <= 0 && f.takilma_toplam_ms <= 0);
  console.log(`\nKASMA DUSTU (her iki sayfada kacirilan kare ve mutlak takilma azaldi ya da esit): ${dustu ? 'EVET' : 'HAYIR'}`);
  sonuc.hukum = { kasma_dustu: dustu };
} finally {
  fs.writeFileSync(C_YOL, ham);
  derle();
  sonuc._ = 'yeni/film/olc-prolog-kare.cjs — prolog anahtarinin KARE bedeli. Kapi B araciyla (soguk giris) iki halde olculur; KISMI kapsam (yalniz iki ana sayfa) oldugu icin HUKUM DEGIL FARK olcumudur.';
  fs.writeFileSync(CIKTI, JSON.stringify(sonuc, null, 1));
  console.log(`\ncontent.json geri yuklendi (prolog ACIK) ve yeniden derlendi.\n→ ${CIKTI}`);
}
