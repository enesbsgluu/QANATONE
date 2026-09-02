#!/usr/bin/env node
/* KUR-MEDYA — film medyasini getiren KURULUM ADIMI (GECE TUR 2c, 1-2 Eyl 2026).

   NEDEN VAR: yeni/public/varlik/film (~680 MB mp4/webp) BILINCLI git
   disi; temiz klonda G2/FM1 "dosya-yok" basiyordu ve kirmizi sebebini
   adiyla soylemiyordu. Artik zincir su: bu adim kosar -> medyayi getirir
   ve sha1 ile dogrular -> damga yazar; denetim (denetim.cjs, MEDYA
   kapisi) damgayi ve dosyalari yoklar. ADIM KOSMAMISSA DENETIM KIRMIZI
   YANAR, sessiz gecmez.

   UZAK KAYNAK (TUR 9, 3 Eyl 2026): CI'da (Netlify) medya diskte yok ve
   olmayacak — kaynak, manifestteki `uzak` adresi (GitHub Release
   varliklari: dosya basina <2 GiB, bant siniri yok, herkese acik, jeton
   istemez). Kaynak sirasi: [arguman dizin] -> MEDYA_KAYNAK dizin -> ana
   agac dizini (yalniz bu makinede var) -> MEDYA_URL -> manifest.uzak.
   Diskte olan ve sha1'i tutan dosyaya dokunulmaz (Netlify onbellegi
   plugins/onbellek ile bu dizini derlemeler arasi tasir: sicak derlemede
   sifir indirme, sadece ~2 sn sha1). Indirilen her dosya sha1 ile
   dogrulanir; tutmayan dosya silinir, damga YAZILMAZ, denetim kirmizi.
   Damgaya sure/bayt/hiz yazilir; zincir.cjs bunu dist/yeni/surum.json'a
   gecirir ki CI'nin ne kadar surdugu yayindan okunsun.

   MODLAR:
     node yeni/film/kur-medya.cjs --damgala [--uzak <url>]
       Ana agacta kosulur: mevcut medya dizininden MANIFEST uretir
       (yol + bayt + sha1 + uzak, takipteki yeni/film/medya-manifest.json)
       ve damgayi yazar. Medya degistiginde (yeni encode) yeniden
       kosulmali — yoksa denetim "damga-bayat" ile kirmizi doner. `--uzak`
       verilmezse manifestteki eski adres korunur. Medya degisince yeni
       bir Release etiketi gerekir (asagidaki YAYIMLAMA).
     node yeni/film/kur-medya.cjs --uzak-yokla
       Indirmeden, HEAD ile uzak varliklarin bayt sayisini manifestle
       kiyaslar (Release manifesti tasiyor mu?). Push oncesi kontrol.
     node yeni/film/kur-medya.cjs [kaynak-dizin]
       Kurulum: manifesti okur, eksik/uyusmayan dosyalari kaynaktan
       (dizin ya da uzak) getirir, HEPSINI sha1 ile dogrular, damga yazar.

   YAYIMLAMA (medya degistiginde, bir kez, gh CLI ile — elle):
     node yeni/film/kur-medya.cjs --damgala --uzak https://github.com/enesbsgluu/QANATONE/releases/download/medya-vN
     gh release create medya-vN --target <origin'de var olan commit> --prerelease --title "Film medyasi vN"
     gh release upload medya-vN yeni/public/varlik/film/*
     node yeni/film/kur-medya.cjs --uzak-yokla     (238 dosya, bayt tutuyor mu)
     git add yeni/film/medya-manifest.json && git commit

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
const ANA_AGAC = 'C:\\projeler2\\qanatone\\yeni\\public\\varlik\\film';
const PARALEL = +(process.env.MEDYA_PARALEL || 6);
const DENEME = 3;

const sha1 = (f) => new Promise((res, rej) => {
  const h = crypto.createHash('sha1');
  fs.createReadStream(f).on('data', (c) => h.update(c))
    .on('end', () => res(h.digest('hex'))).on('error', rej);
});
const sha1Buf = (b) => crypto.createHash('sha1').update(b).digest('hex');
const arg = (ad) => { const i = process.argv.indexOf(ad); return i >= 0 ? process.argv[i + 1] : undefined; };
const manifestOku = () => {
  if (!fs.existsSync(MANIFEST)) { console.error('manifest yok (' + MANIFEST + ') — ana agacta once --damgala kosulmali'); process.exit(1); }
  /* \r ayiklanir: git autocrlf manifesti CRLF cikarabilir, damga LF
     govdenin sha1'ini tasir — normalizasyonsuz yanlis "bayat" dogar. */
  const govde = Buffer.from(fs.readFileSync(MANIFEST, 'utf8').replace(/\r/g, ''));
  return { govde, M: JSON.parse(govde.toString()) };
};
const uzakUrl = (uzak, ad) => uzak.replace(/\/+$/, '') + '/' + encodeURIComponent(ad);

async function damgala() {
  if (!fs.existsSync(HEDEF)) { console.error('damgalanacak medya yok: ' + HEDEF); process.exit(1); }
  let uzak = arg('--uzak');
  if (!uzak && fs.existsSync(MANIFEST)) {
    try { uzak = JSON.parse(fs.readFileSync(MANIFEST, 'utf8').replace(/\r/g, '')).uzak; } catch (e) { /* eski manifest */ }
  }
  const adlar = fs.readdirSync(HEDEF).filter((f) => !f.startsWith('.') && !f.endsWith('.indir')).sort();
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
    damga: new Date().toISOString(), dosya_sayisi: dosya.length, toplam_bayt: bayt,
    uzak: uzak || null, dosya,
  };
  const govde = JSON.stringify(M, null, 1);
  fs.writeFileSync(MANIFEST, govde);
  fs.writeFileSync(DAMGA, JSON.stringify({
    _: 'kur-medya damgasi — manifest sha1 buradakiyle tutmazsa denetim kirmizi',
    kurulum: new Date().toISOString(), yol: 'damgala', manifest_sha1: sha1Buf(Buffer.from(govde)),
  }, null, 1));
  console.log(`manifest yazildi: ${dosya.length} dosya · ${(bayt / 1048576).toFixed(1)} MiB · uzak ${uzak || 'YOK'} · damga tazelendi`);
  if (!uzak) console.log('UYARI: manifestte uzak adres yok — CI medyayi indiremez (--uzak <url>)');
}

/* URL'den dosya indir (yonlendirmeleri izler), gecici ada yaz, sonra adlandir */
async function indir(url, hedef) {
  const gecici = hedef + '.indir';
  let sonHata;
  for (let d = 1; d <= DENEME; d++) {
    try {
      const r = await fetch(url, { redirect: 'follow' });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const { Readable } = require('stream');
      const { pipeline } = require('stream/promises');
      await pipeline(Readable.fromWeb(r.body), fs.createWriteStream(gecici));
      fs.renameSync(gecici, hedef);
      return;
    } catch (e) {
      sonHata = e;
      try { fs.rmSync(gecici, { force: true }); } catch (e2) { /* yok */ }
      if (d < DENEME) await new Promise((r) => setTimeout(r, 800 * d));
    }
  }
  throw sonHata;
}

/* sinirli paralellik */
async function havuz(isler, n) {
  const sonuc = new Array(isler.length);
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, isler.length) }, async () => {
    while (i < isler.length) { const k = i++; sonuc[k] = await isler[k](); }
  }));
  return sonuc;
}

async function kur() {
  const t0 = Date.now();
  const { govde, M } = manifestOku();
  const dizinler = [process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : null,
    process.env.MEDYA_KAYNAK, ANA_AGAC].filter(Boolean);
  const kaynak = dizinler.find((k) => fs.existsSync(k) && path.resolve(k) !== path.resolve(HEDEF));
  const uzak = process.env.MEDYA_URL || M.uzak || null;
  fs.mkdirSync(HEDEF, { recursive: true });

  let kopya = 0, yerinde = 0, indirilen = 0, indirilenBayt = 0;
  const kusur = [];
  const tIndir0 = [null];

  /* 1) yerinde olanlar (onbellekten gelen ya da onceki kurulum): sha1 dogrula */
  const eksik = [];
  for (const d of M.dosya) {
    const h = path.join(HEDEF, d.ad);
    if (fs.existsSync(h) && fs.statSync(h).size === d.bayt && await sha1(h) === d.sha1) { yerinde++; continue; }
    eksik.push(d);
  }

  /* 2) eksikler: once yerel dizin, yoksa uzak (paralel) */
  await havuz(eksik.map((d) => async () => {
    const h = path.join(HEDEF, d.ad);
    if (kaynak) {
      const k = path.join(kaynak, d.ad);
      if (fs.existsSync(k)) {
        fs.copyFileSync(k, h);
        if (await sha1(h) !== d.sha1) { kusur.push('sha1-tutmadi(kopya):' + d.ad); fs.rmSync(h, { force: true }); return; }
        kopya++; return;
      }
      if (!uzak) { kusur.push('kaynakta-yok:' + d.ad); return; }
    }
    if (!uzak) { kusur.push('kaynak-yok:' + d.ad); return; }
    if (!tIndir0[0]) tIndir0[0] = Date.now();
    try { await indir(uzakUrl(uzak, d.ad), h); }
    catch (e) { kusur.push('indirilemedi:' + d.ad + ' (' + (e && e.message) + ')'); return; }
    if (!fs.existsSync(h) || fs.statSync(h).size !== d.bayt || await sha1(h) !== d.sha1) {
      kusur.push('sha1-tutmadi(uzak):' + d.ad); fs.rmSync(h, { force: true }); return;
    }
    indirilen++; indirilenBayt += d.bayt;
  }), PARALEL);

  const sure = (Date.now() - t0) / 1000;
  const indirSn = tIndir0[0] ? (Date.now() - tIndir0[0]) / 1000 : 0;
  if (kusur.length) {
    console.error('KURULUM YARIM: ' + kusur.slice(0, 5).join(' ') + (kusur.length > 5 ? ` (+${kusur.length - 5})` : ''));
    if (!kaynak && !uzak) console.error('kaynak verin: node yeni/film/kur-medya.cjs <dizin>  ya da  MEDYA_KAYNAK=<dizin>  ya da manifestte `uzak` (--damgala --uzak <url>)');
    process.exit(1);                                     /* damga YAZILMAZ — denetim kirmizi kalir */
  }
  const damga = {
    _: 'kur-medya damgasi — manifest sha1 buradakiyle tutmazsa denetim kirmizi',
    kurulum: new Date().toISOString(),
    yol: indirilen ? 'uzak:' + uzak : (kopya ? 'kopya:' + kaynak : 'yerinde'),
    kopya, yerinde, indirilen, indirilen_bayt: indirilenBayt,
    indirme_sn: +indirSn.toFixed(1),
    indirme_mbs: indirSn ? +(indirilenBayt / 1048576 / indirSn).toFixed(1) : 0,
    toplam_sn: +sure.toFixed(1),
    manifest_sha1: sha1Buf(govde),
  };
  fs.writeFileSync(DAMGA, JSON.stringify(damga, null, 1));
  console.log(`medya kuruldu: ${yerinde} yerinde · ${kopya} kopyalandi · ${indirilen} indirildi` +
    (indirilen ? ` (${(indirilenBayt / 1048576).toFixed(1)} MiB, ${indirSn.toFixed(1)} sn, ${damga.indirme_mbs} MiB/s)` : '') +
    ` · ${M.dosya.length} toplam · ${sure.toFixed(1)} sn · damga yazildi`);
}

/* HEAD ile uzak varliklarin bayt sayisi manifestle tutuyor mu (indirme yok) */
async function uzakYokla() {
  const { M } = manifestOku();
  const uzak = process.env.MEDYA_URL || M.uzak;
  if (!uzak) { console.error('manifestte uzak adres yok (--damgala --uzak <url>)'); process.exit(1); }
  const t0 = Date.now();
  const kusur = [];
  await havuz(M.dosya.map((d) => async () => {
    try {
      const r = await fetch(uzakUrl(uzak, d.ad), { method: 'HEAD', redirect: 'follow' });
      if (!r.ok) { kusur.push(d.ad + ':HTTP ' + r.status); return; }
      const b = +(r.headers.get('content-length') || -1);
      if (b !== d.bayt) kusur.push(d.ad + ':bayt ' + b + ' ↔ ' + d.bayt);
    } catch (e) { kusur.push(d.ad + ':' + (e && e.message)); }
  }), 8);
  const sn = ((Date.now() - t0) / 1000).toFixed(1);
  if (kusur.length) { console.error(`UZAK BAYAT/EKSIK: ${kusur.length}/${M.dosya.length} · ilk: ${kusur.slice(0, 3).join(' | ')} (${sn} sn)`); process.exit(1); }
  console.log(`uzak TAZE: ${M.dosya.length}/${M.dosya.length} varlik bayt-uyumlu · ${uzak} · ${sn} sn`);
}

(process.argv.includes('--damgala') ? damgala()
  : process.argv.includes('--uzak-yokla') ? uzakYokla()
  : kur())
  .catch((e) => { console.error(e); process.exit(1); });
