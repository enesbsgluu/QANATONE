// KARE DIZISI teslim bicimleri — (a) adayinin agirligi
const sharp = require('C:/projeler2/qanatone/yeni/node_modules/sharp');
const fs = require('fs'), path = require('path');
const KOK = path.join(__dirname, 'malzeme');

const SETLER = [
  { ad: 'webp75-1920', en: 1920, boy: 1080, uzanti: 'webp', opt: b => b.webp({ quality: 75 }), klipler: ['k1', 'k2'] },
  { ad: 'webp75-1280', en: 1280, boy: 720, uzanti: 'webp', opt: b => b.webp({ quality: 75 }), klipler: ['k1', 'k2'] },
  { ad: 'webp60-1280', en: 1280, boy: 720, uzanti: 'webp', opt: b => b.webp({ quality: 60 }), klipler: ['k1', 'k2'] },
  { ad: 'jpeg72-1920', en: 1920, boy: 1080, uzanti: 'jpg', opt: b => b.jpeg({ quality: 72, mozjpeg: true }), klipler: ['k1', 'k2'] },
  { ad: 'avif45-1280', en: 1280, boy: 720, uzanti: 'avif', opt: b => b.avif({ quality: 45 }), klipler: ['k1'] },
];

(async () => {
  const rapor = {};
  for (const s of SETLER) {
    let toplam = 0, adet = 0;
    try {
      for (const k of s.klipler) {
        const kay = path.join(KOK, 'usta', k);
        const hed = path.join(KOK, 'dizi', s.ad, k);
        fs.mkdirSync(hed, { recursive: true });
        for (const f of fs.readdirSync(kay)) {
          const out = path.join(hed, f.replace(/\.jpg$/, '.' + s.uzanti));
          const buf = await s.opt(sharp(path.join(kay, f)).resize(s.en, s.boy)).toBuffer();
          fs.writeFileSync(out, buf);
          toplam += buf.length; adet++;
        }
      }
      rapor[s.ad] = { bayt: toplam, kare: adet, ort: Math.round(toplam / adet) };
      console.log(s.ad, 'toplam', toplam, 'kare', adet, 'ort', Math.round(toplam / adet));
    } catch (e) {
      rapor[s.ad] = { hata: e.message };
      console.log(s.ad, 'HATA', e.message);
    }
  }
  fs.writeFileSync(path.join(KOK, 'dizi-agirlik.json'), JSON.stringify(rapor, null, 1));
})();
