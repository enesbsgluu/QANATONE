#!/usr/bin/env node
/* KUR-MEDYA — film medyasini getiren KURULUM ADIMI (GECE TUR 2c, 1-2 Eyl 2026).

   NEDEN VAR: yeni/public/varlik/film (~680 MB mp4/webp) BILINCLI git
   disi; temiz klonda G2/FM1 "dosya-yok" basiyordu ve kirmizi sebebini
   adiyla soylemiyordu. Artik zincir su: bu adim kosar -> medyayi getirir
   ve sha1 ile dogrular -> damga yazar; denetim (denetim.cjs, MEDYA
   kapisi) damgayi ve dosyalari yoklar. ADIM KOSMAMISSA DENETIM KIRMIZI
   YANAR, sessiz gecmez.

   IKI MOD:
     node yeni/film/kur-medya.cjs --damgala
       Ana agacta kosulur: mevcut medya dizininden MANIFEST uretir
       (yol + bayt + sha1, takipteki yeni/film/medya-manifest.json)
       ve damgayi yazar. Medya degistiginde (yeni encode) yeniden
       kosulmali — yoksa denetim "damga-bayat" ile kirmizi doner.
     node yeni/film/kur-medya.cjs [kaynak-dizin]
       Klonda kosulur: manifesti okur, kaynaktan eksik/uyusmayan
       dosyalari kopyalar, HEPSINI sha1 ile dogrular, damga yazar.
       Kaynak sirasi: arguman -> MEDYA_KAYNAK ortam degiskeni ->
       C:\projeler2\qanatone\yeni\public\varlik\film (ana agac).

   DAMGA: yeni/film/.medya-kurulum.json (git disi, .gitignore'da).
   Icinde manifestin kendi sha1'i durur — manifest degisip damga
   tazelenmezse denetim kirmiziya doner. Damga public/ altina BILEREK
   konmadi: Astro public'i dist'e oldugu gibi kopyalar, damga yayina
   sizardi. */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const KOK = __dirname;                                   /* yeni/film */
const HEDEF = path.join(KOK, '..', 'public', 'varlik', 'film');
const MANIFEST = path.join(KOK, 'medya-manifest.json');
const DAMGA = path.join(KOK, '.medya-kurulum.json');

const sha1 = (f) => new Promise((res, rej) => {
  const h = crypto.createHash('sha1');
  fs.createReadStream(f).on('data', (c) => h.update(c))
    .on('end', () => res(h.digest('hex'))).on('error', rej);
});
const sha1Buf = (b) => crypto.createHash('sha1').update(b).digest('hex');

async function damgala() {
  if (!fs.existsSync(HEDEF)) { console.error('damgalanacak medya yok: ' + HEDEF); process.exit(1); }
  const adlar = fs.readdirSync(HEDEF).filter((f) => !f.startsWith('.')).sort();
  const dosya = [];
  let bayt = 0;
  for (const ad of adlar) {
    const p = path.join(HEDEF, ad);
    if (!fs.statSync(p).isFile()) continue;
    const b = fs.statSync(p).size;
    dosya.push({ ad, bayt: b, sha1: await sha1(p) });
    bayt += b;
  }
  const M = {
    _: 'yeni/film/kur-medya.cjs --damgala ciktisi — film medyasinin kunyesi; kurulum ve denetim (MEDYA kapisi) bunu okur',
    damga: new Date().toISOString(), dosya_sayisi: dosya.length, toplam_bayt: bayt, dosya,
  };
  const govde = JSON.stringify(M, null, 1);
  fs.writeFileSync(MANIFEST, govde);
  fs.writeFileSync(DAMGA, JSON.stringify({
    _: 'kur-medya damgasi — manifest sha1 buradakiyle tutmazsa denetim kirmizi',
    kurulum: new Date().toISOString(), yol: 'damgala', manifest_sha1: sha1Buf(Buffer.from(govde)),
  }, null, 1));
  console.log(`manifest yazildi: ${dosya.length} dosya · ${(bayt / 1048576).toFixed(1)} MiB · damga tazelendi`);
}

async function kur() {
  if (!fs.existsSync(MANIFEST)) { console.error('manifest yok (' + MANIFEST + ') — ana agacta once --damgala kosulmali'); process.exit(1); }
  /* \r ayiklanir: git autocrlf manifesti CRLF cikarabilir, damga LF
     govdenin sha1'ini tasir — normalizasyonsuz yanlis "bayat" dogar. */
  const govde = Buffer.from(fs.readFileSync(MANIFEST, 'utf8').replace(/\r/g, ''));
  const M = JSON.parse(govde.toString());
  const adaylar = [process.argv[2], process.env.MEDYA_KAYNAK,
    'C:\\projeler2\\qanatone\\yeni\\public\\varlik\\film'].filter(Boolean);
  const kaynak = adaylar.find((k) => fs.existsSync(k) && path.resolve(k) !== path.resolve(HEDEF));
  fs.mkdirSync(HEDEF, { recursive: true });

  let kopya = 0, yerinde = 0;
  const kusur = [];
  for (const d of M.dosya) {
    const h = path.join(HEDEF, d.ad);
    /* hizli yol: bayt tutuyorsa sha1 dogrula, tutuyorsa dokunma */
    if (fs.existsSync(h) && fs.statSync(h).size === d.bayt && await sha1(h) === d.sha1) { yerinde++; continue; }
    if (!kaynak) { kusur.push('kaynak-yok:' + d.ad); continue; }
    const k = path.join(kaynak, d.ad);
    if (!fs.existsSync(k)) { kusur.push('kaynakta-yok:' + d.ad); continue; }
    fs.copyFileSync(k, h);
    if (await sha1(h) !== d.sha1) { kusur.push('sha1-tutmadi:' + d.ad); continue; }
    kopya++;
  }
  if (kusur.length) {
    console.error('KURULUM YARIM: ' + kusur.slice(0, 5).join(' ') + (kusur.length > 5 ? ` (+${kusur.length - 5})` : ''));
    if (!kaynak) console.error('kaynak verin: node yeni/film/kur-medya.cjs <dizin>  ya da  MEDYA_KAYNAK=<dizin>');
    process.exit(1);                                     /* damga YAZILMAZ — denetim kirmizi kalir */
  }
  fs.writeFileSync(DAMGA, JSON.stringify({
    _: 'kur-medya damgasi — manifest sha1 buradakiyle tutmazsa denetim kirmizi',
    kurulum: new Date().toISOString(), yol: kaynak ? 'kopya:' + kaynak : 'yerinde',
    kopya, yerinde, manifest_sha1: sha1Buf(govde),
  }, null, 1));
  console.log(`medya kuruldu: ${yerinde} yerinde · ${kopya} kopyalandi · ${M.dosya.length} toplam · damga yazildi`);
}

(process.argv.includes('--damgala') ? damgala() : kur())
  .catch((e) => { console.error(e); process.exit(1); });
