// SENTETIK KLIP KARELERI — dag-ham.jpg uzerinde kaydirma/yakinlasma + makine okunur kare kimligi
// Gercek klipler gelmedi; entropiyi gercekci tutmak icin gercek fotograf kullanildi.
const sharp = require('C:/projeler2/qanatone/yeni/node_modules/sharp');
const fs = require('fs'), path = require('path');

const KAYNAK = 'C:/projeler2/qanatone/gorsel-kaynak/prolog/dag-ham.jpg';
const KOK = path.join(__dirname, 'malzeme');
const IW = 4392, IH = 3095;
const EN = 1920, BOY = 1080;

// klip tanimlari: gercek zincirde 5 sn ve 8 sn karisik, 24 fps varsayimi (kanon klipler gelince olculecek)
const KLIPLER = [
  { ad: 'k1', sn: 5, fps: 24, t0: 0.00, t1: 0.45 },
  { ad: 'k2', sn: 8, fps: 24, t0: 0.45, t1: 1.00 },
];

function kimlikSvg(i, N, en, boy) {
  // ust serit: 12 bitlik ikili blok (kare indisi) + hareketli kizil cubuk
  const blok = Math.round(en / 24);
  const yuk = Math.round(boy / 36);
  let r = `<rect x="0" y="0" width="${en}" height="${yuk}" fill="#000"/>`;
  for (let b = 0; b < 12; b++) {
    const bit = (i >> (11 - b)) & 1;
    r += `<rect x="${b * blok}" y="0" width="${blok - 2}" height="${yuk}" fill="${bit ? '#fff' : '#222'}"/>`;
  }
  const x = Math.round((i / Math.max(1, N - 1)) * (en - 10));
  r += `<rect x="${x}" y="${yuk}" width="10" height="${boy - yuk}" fill="#c8102e" opacity="0.85"/>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${en}" height="${boy}">${r}</svg>`);
}

async function kare(t, i, N, hedefEn, hedefBoy) {
  const w = Math.round(IW - t * 878);
  const h = Math.round(w * 9 / 16);
  const x = Math.round(t * 878 * 0.6);
  const y = Math.min(IH - h, Math.round(300 + t * 200));
  return sharp(KAYNAK)
    .extract({ left: x, top: y, width: w, height: h })
    .resize(hedefEn, hedefBoy)
    .composite([{ input: kimlikSvg(i, N, hedefEn, hedefBoy), top: 0, left: 0 }])
    .jpeg({ quality: 96 })
    .toBuffer();
}

(async () => {
  fs.mkdirSync(path.join(KOK, 'usta'), { recursive: true });
  const kunye = [];
  for (const k of KLIPLER) {
    const N = k.sn * k.fps;
    const d = path.join(KOK, 'usta', k.ad);
    fs.mkdirSync(d, { recursive: true });
    for (let i = 0; i < N; i++) {
      const t = k.t0 + (k.t1 - k.t0) * (i / Math.max(1, N - 1));
      const buf = await kare(t, i, N, EN, BOY);
      fs.writeFileSync(path.join(d, `k${String(i).padStart(4, '0')}.jpg`), buf);
    }
    kunye.push({ ad: k.ad, kare: N, sn: k.sn, fps: k.fps });
    console.log(`usta ${k.ad}: ${N} kare`);
  }
  fs.writeFileSync(path.join(KOK, 'kunye.json'), JSON.stringify({ en: EN, boy: BOY, klipler: kunye }, null, 1));
})();
