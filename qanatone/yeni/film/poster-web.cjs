#!/usr/bin/env node
/* FILM · WEB POSTERI — encode sonrasi PNG posterden (sert degismez #1 korunur:
   kaynak hala encode edilmis klibin ilk karesi) sayfanin kullandigi WebP.
   NEDEN: motor betiginin PNG'si 0,9-2 MB (olculdu, sahne39 861 KB); 39
   sahnede sayfaya inecek poster olarak kabul edilemez. PNG kanon/QA
   kaynagi olarak kalir, sayfa WebP'yi okur. Zincir uretim.json'a yazilir:
   webp.kaynak_sha1 = PNG sha1 = (uret.cjs) encode edilmis klibin karesi.
   Ayrica DEVIR §5: sahne1 ilk kare + sahne39 son kare HAM klipten yuksek
   kalite PNG -> gorsel-kaynak/film/ (gitignore'da; yeniden uretilir). */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');

const KOK = path.join(__dirname, '..');
const VARLIK = path.join(KOK, 'public', 'varlik', 'film');
/* PNG kaynak public/ DISINDA (uret.cjs ile ayni karar): ara urun yayina
   cikmaz. WebP cikti public/varlik/film icinde — sayfanin okudugu tek hat. */
const POSTER_HAM = path.join(__dirname, 'poster-ham');
const KUNYE = path.join(__dirname, 'uretim.json');
const sha1 = (f) => crypto.createHash('sha1').update(fs.readFileSync(f)).digest('hex');

(async () => {
  const U = JSON.parse(fs.readFileSync(KUNYE, 'utf8'));
  let toplam = 0;
  for (const k of U.klip) {
    if (k.hata) continue;
    for (const [alan, kalite] of [['poster', 82], ['mobil_poster', 78]]) {
      const png = path.join(POSTER_HAM, k[alan].dosya);
      const webp = path.join(VARLIK, k[alan].dosya.replace(/\.png$/, '.webp'));
      await sharp(png).webp({ quality: kalite, effort: 5 }).toFile(webp);
      const b = fs.statSync(webp).size;
      toplam += b;
      k[alan].web = { dosya: path.basename(webp), bayt: b, sha1: sha1(webp), kaynak_sha1: sha1(png), kalite };
    }
    console.log(`sahne${k.n}: poster ${(k.poster.bayt / 1024).toFixed(0)} KB png → ${(k.poster.web.bayt / 1024).toFixed(0)} KB webp · mobil ${(k.mobil_poster.web.bayt / 1024).toFixed(0)} KB`);
  }
  U.toplam.poster_web_bayt = toplam;
  fs.writeFileSync(KUNYE, JSON.stringify(U, null, 1));
  console.log(`\nweb posterler toplam ${(toplam / 1048576).toFixed(2)} MiB → uretim.json`);

  /* DEVIR §5 iki yuksek kalite kare (ham klipten) */
  const { execFileSync } = require('child_process');
  const KANON = JSON.parse(fs.readFileSync(path.join(KOK, 'src', 'film', 'kanon.json'), 'utf8'));
  const hedef = path.join(KOK, '..', 'gorsel-kaynak', 'film');
  fs.mkdirSync(hedef, { recursive: true });
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '0', '-i', path.join(KANON.kaynak, 'sahne1.mp4'), '-frames:v', '1', path.join(hedef, 'sahne1-ilk-kare.png')]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(KANON.kaynak, `sahne${KANON.klip.length}.mp4`), '-vf', 'reverse', '-frames:v', '1', path.join(hedef, `sahne${KANON.klip.length}-son-kare.png`)]);
  console.log(`DEVIR §5 kareleri → ${path.relative(process.cwd(), hedef)}`);
})().catch((e) => { console.error(e); process.exit(1); });
