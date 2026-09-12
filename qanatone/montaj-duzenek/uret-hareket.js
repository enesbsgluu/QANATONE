// HAREKETLI SENTETIK — icerik karmasikligi USTUNU icin. Hizli dolly + parcacik akisi.
// Amac: gercek uretilmis klibin (tunelde ilerleyis, parcacik) zamansal karmasikligini ASAN bir ust sinir.
const sharp = require('C:/projeler2/qanatone/yeni/node_modules/sharp');
const fs = require('fs'), path = require('path');

const KAYNAK = 'C:/projeler2/qanatone/gorsel-kaynak/prolog/dag-ham.jpg';
const KOK = path.join(__dirname, 'malzeme', 'usta', 'h1');
const IW = 4392, IH = 3095, EN = 1920, BOY = 1080;
const N = 120;                       // 5 sn @ 24 fps — k1 ile birebir kiyas

let tohum = 12345;
const rnd = () => (tohum = (tohum * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const PARCA = Array.from({ length: 360 }, () => ({
  x: rnd(), y: rnd(), h: 0.4 + rnd() * 2.2, r: 1 + rnd() * 4, a: 0.25 + rnd() * 0.6
}));

function katman(i, u) {
  let s = '';
  // hizli akan parcacik/cizgi alani — kare basina buyuk yer degistirme
  for (const p of PARCA) {
    const y = ((p.y + u * p.h) % 1) * BOY;
    const x = ((p.x + Math.sin((u * 6 + p.y * 9)) * 0.05 + 1) % 1) * EN;
    const uz = 12 + p.h * 26;
    s += `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${p.r.toFixed(1)}" height="${uz.toFixed(1)}" fill="#fff" opacity="${p.a.toFixed(2)}"/>`;
  }
  // gezen isik + kizil tarama
  const gx = (0.5 + 0.45 * Math.sin(u * 5.1)) * EN;
  s += `<circle cx="${gx.toFixed(0)}" cy="${(BOY * (0.3 + 0.4 * Math.cos(u * 3.7))).toFixed(0)}" r="${(BOY * 0.5).toFixed(0)}" fill="url(#g)"/>`;
  // kare kimligi (usta setle ayni bicim)
  const blok = Math.round(EN / 24), yuk = Math.round(BOY / 36);
  let k = `<rect x="0" y="0" width="${EN}" height="${yuk}" fill="#000"/>`;
  for (let b = 0; b < 12; b++) k += `<rect x="${b * blok}" y="0" width="${blok - 2}" height="${yuk}" fill="${(i >> (11 - b)) & 1 ? '#fff' : '#222'}"/>`;
  const bx = Math.round((i / (N - 1)) * (EN - 10));
  k += `<rect x="${bx}" y="${yuk}" width="10" height="${BOY - yuk}" fill="#c8102e" opacity="0.85"/>`;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${EN}" height="${BOY}">
    <defs><radialGradient id="g"><stop offset="0" stop-color="#fff" stop-opacity="0.34"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs>
    ${s}${k}</svg>`);
}

(async () => {
  fs.mkdirSync(KOK, { recursive: true });
  for (let i = 0; i < N; i++) {
    const u = i / (N - 1);
    // agresif dolly: kare 1,0 -> 0,30 (k1'de 1,0 -> 0,90 idi)
    const olcek = 1 - 0.70 * u;
    const w = Math.max(320, Math.round(IW * olcek));
    const h = Math.round(w * 9 / 16);
    const x = Math.round((IW - w) * (0.5 + 0.35 * Math.sin(u * 4.2)));
    const y = Math.round(Math.min(IH - h, Math.max(0, (IH - h) * (0.45 + 0.3 * Math.cos(u * 3.1)))));
    const buf = await sharp(KAYNAK).extract({ left: x, top: y, width: w, height: h })
      .resize(EN, BOY).composite([{ input: katman(i, u), top: 0, left: 0 }])
      .jpeg({ quality: 96 }).toBuffer();
    fs.writeFileSync(path.join(KOK, `k${String(i).padStart(4, '0')}.jpg`), buf);
  }
  console.log('hareketli usta: ' + N + ' kare');
})();
