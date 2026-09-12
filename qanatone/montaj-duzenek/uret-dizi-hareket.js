// Hareketli setin kare dizisi agirligi — carpan kare dizisi icin de gerekli
const sharp = require('C:/projeler2/qanatone/yeni/node_modules/sharp');
const fs = require('fs'), path = require('path');
const KOK = path.join(__dirname, 'malzeme');

const SETLER = [
  { ad: 'webp75-1280', en: 1280, boy: 720, opt: b => b.webp({ quality: 75 }) },
  { ad: 'webp60-1280', en: 1280, boy: 720, opt: b => b.webp({ quality: 60 }) },
];

(async () => {
  const rapor = {};
  for (const klip of ['k1', 'h1']) {
    for (const s of SETLER) {
      const kay = path.join(KOK, 'usta', klip);
      let toplam = 0, adet = 0;
      for (const f of fs.readdirSync(kay)) {
        const buf = await s.opt(sharp(path.join(kay, f)).resize(s.en, s.boy)).toBuffer();
        toplam += buf.length; adet++;
      }
      rapor[`${klip}/${s.ad}`] = { bayt: toplam, kare: adet, ort: Math.round(toplam / adet) };
      console.log(klip, s.ad, 'toplam', toplam, 'kare', adet, 'ort', Math.round(toplam / adet));
    }
  }
  fs.writeFileSync(path.join(KOK, 'carpan-dizi.json'), JSON.stringify(rapor, null, 1));
})();
