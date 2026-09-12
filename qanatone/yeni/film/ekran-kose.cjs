#!/usr/bin/env node
/* DEVIR · EKRAN KOSELERI (31 Agu 2026)
   ekran-dikdortgen.cjs'in KUTU ciktisi devir icin yetmez: kutu eksen-hizali,
   oysa devir sorusu "dortgen dikdortgen mi, perspektifli mi, donuyor mu".
   Bu duzenek KOSE olcer:

   1) Kaba kutu: ekran-dikdortgen.cjs'in kanitlanmis bant yontemi (doku =
      gradyan yogunlugu; isiklilik ayirmaz: kasa 0,1 · arka plan 2,5 ·
      ekranin koyu bolgeleri 4).
   2) Kenar noktalari: her kenar icin, kenara DIK yonde kaba sinirin
      +-PENCERE px cevresi taranir; doku yogunlugunun ilk kalici asildigi
      yer bulunur, sonra o civarda ISIKLILIK turevinin tepesiyle (parabol
      uydurma) alt-piksele inceltilir. Kenarin uc bolgeleri (kose
      yuvarlagi) taranmaz.
   3) Dogru uydurma: her kenara en kucuk kareler + 2 tur aykiri atma
      (artik > 2 px dusurulur). Kose = komsu dogrularin kesisimi.

   KENDINI DOGRULAMA (kare-yakalama-tuzaklari dersi: duzenek kendini
   dogrulamali): her kenar icin kabul edilen nokta sayisi + RMS artik
   yazilir; son kare + orta kare uzerine dortgen CIZILIR (kontak/).
   Nokta sayisi dusuk veya artik buyukse hukum 'GUVENILMEZ'.

   IZ MODU (dizi olcumu bununla yapilir): durak8 COK MONITORLU oda —
   kaba-kutu dedektoru 104'ten onceki karelerde TUM monitor duvarini
   yakaliyor (ilk dizi kosumu bunu gosterdi: 48-102 arasi ya HATA ya
   kare kenarina yapisik sayi). Ortadaki ekran ancak SON kareden geriye
   iz surerek olculur: her karenin cizgileri bir sonraki karenin
   (zamanda bir SONRAKI, iz geriye yurur) dogrulariyla tohumlanir,
   kenar araması tohumun +-IZ_PENCERE px'inde kalir. Tohumdan 6 px'ten
   uzak nokta atilir (on kesim) — telefon/klavye orta monitorun alt
   kenarini erken karelerde ortuyor, bu kesim onlari eler.

   Kullanim:
     node yeni/film/ekran-kose.cjs <kare.png>              tek kare
     node yeni/film/ekran-kose.cjs <dizin> <bas> <son>     kare dizisi (kNNN.png), karesi bagimsiz
     node yeni/film/ekran-kose.cjs iz <dizin> <son> <bas>  GERIYE iz surme (son -> bas)
   Cikti: film/ekran-kose.json + film/kontak/ekran-kose-*.png */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const G_ESIK = 2, ORAN = 0.10, BOSLUK = 55, KASA = 0.30;   /* ekran-dikdortgen.cjs ile ayni */
const DOKU_R = 4;            /* doku penceresi yaricapi (9x9) */
const DOKU_ESIK = 0.30;      /* pencere doluluk esigi */
const PENCERE = 34;          /* kaba sinir cevresinde tarama yari-genisligi */
const KENAR_ICERI = 0.10;    /* kenarin iki ucundan taranmayan pay (kose yuvarlagi) */
const ADIM = 6;              /* tarama cizgileri arasi px */

async function yukle(dosya) {
  const { data, info } = await sharp(dosya).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const luma = new Float64Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += C)
    luma[i] = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
  return { W, H, luma };
}

function dokuHaritasi(luma, W, H) {
  /* gradyan > esik ikilisi + integral goruntu -> O(1) pencere yogunlugu */
  const bin = new Uint8Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i = y * W + x;
    if (Math.abs(luma[i + 1] - luma[i - 1]) + Math.abs(luma[i + W] - luma[i - W]) > G_ESIK) bin[i] = 1;
  }
  const I = new Float64Array((W + 1) * (H + 1));
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++)
    I[(y + 1) * (W + 1) + x + 1] = bin[y * W + x] + I[y * (W + 1) + x + 1] + I[(y + 1) * (W + 1) + x] - I[y * (W + 1) + x];
  const yoğun = (x, y) => {
    const x0 = Math.max(0, x - DOKU_R), y0 = Math.max(0, y - DOKU_R);
    const x1 = Math.min(W - 1, x + DOKU_R), y1 = Math.min(H - 1, y + DOKU_R);
    const s = I[(y1 + 1) * (W + 1) + x1 + 1] - I[y0 * (W + 1) + x1 + 1] - I[(y1 + 1) * (W + 1) + x0] + I[y0 * (W + 1) + x0];
    return s / ((x1 - x0 + 1) * (y1 - y0 + 1));
  };
  return { bin, yoğun };
}

function kabaKutu(luma, bin, W, H) {
  /* ekran-dikdortgen.cjs bant yontemi, ikili doku haritasi uzerinden */
  const doluluk = (n, m, al) => {
    const o = new Float64Array(n);
    for (let i = 0; i < n; i++) { let c = 0; for (let j = 0; j < m; j++) c += al(i, j); o[i] = c / m; }
    return o;
  };
  const bant = (dol, n) => {
    let iyiBas = 0, iyiUz = 0, bas = -1, sonIyi = -1;
    for (let i = 0; i <= n; i++) {
      const ic = i < n && dol[i] >= ORAN;
      if (ic) { if (bas < 0) bas = i; sonIyi = i; }
      else if (bas >= 0 && (i - sonIyi > BOSLUK || i === n)) {
        if (sonIyi - bas + 1 > iyiUz) { iyiUz = sonIyi - bas + 1; iyiBas = bas; }
        bas = -1;
      }
    }
    return { bas: iyiBas, son: iyiBas + iyiUz - 1, uzunluk: iyiUz };
  };
  const dx = bant(doluluk(W, H, (x, y) => bin[y * W + x]), W);
  const dy = bant(doluluk(H, dx.uzunluk, (y, j) => bin[y * W + (dx.bas + j)]), H);
  const dx2 = bant(doluluk(W, dy.uzunluk, (x, j) => bin[(dy.bas + j) * W + x]), W);
  dx.bas = dx2.bas; dx.son = dx2.son;
  /* KASA daraltmasi */
  const satirD = (y) => { let c = 0; for (let x = dx.bas; x <= dx.son; x++) c += bin[y * W + x]; return c / (dx.son - dx.bas + 1); };
  const sutunD = (x) => { let c = 0; for (let y = dy.bas; y <= dy.son; y++) c += bin[y * W + x]; return c / (dy.son - dy.bas + 1); };
  let u = dy.bas, a = dy.son, s = dx.bas, g = dx.son;
  while (u < a && satirD(u) < KASA) u++;
  while (a > u && satirD(a) < KASA) a--;
  while (s < g && sutunD(s) < KASA) s++;
  while (g > s && sutunD(g) < KASA) g--;
  return { sol: s, ust: u, sag: g, alt: a };
}

/* kenara dik 1B tarama: doku esiginin ilk kalici asildigi yer + isiklilik
   turevi tepesinde parabolle alt-piksel. yon=+1 icerisi artan koordinat. */
function kenarNoktasi(luma, yoğun, W, H, sabit, kabaSinir, dikeyMi, yon) {
  const oku = (t) => dikeyMi ? luma[sabit * W + t] : luma[t * W + sabit];
  const dok = (t) => dikeyMi ? yoğun(t, sabit) : yoğun(sabit, t);
  const t0 = Math.max(2, kabaSinir - PENCERE * yon * 1 - (yon > 0 ? PENCERE : -PENCERE) * 0); /* baslangic asagida hesaplanir */
  let bas = kabaSinir - yon * PENCERE, son = kabaSinir + yon * PENCERE;
  const sinir = dikeyMi ? W - 3 : H - 3;
  bas = Math.min(Math.max(bas, 2), sinir); son = Math.min(Math.max(son, 2), sinir);
  /* 1) doku gecisi: disaridan iceriye yuru, esik 3 ardisik adimda tutunca dur */
  let gecis = -1, ust = 0;
  for (let t = bas; t !== son + yon; t += yon) {
    if (dok(t) >= DOKU_ESIK) { if (++ust >= 3) { gecis = t - yon * 2; break; } }
    else ust = 0;
  }
  if (gecis < 0) return null;
  /* 2) isiklilik turevi tepesi, gecisin +-6 px'i (yumusatilmis merkezi fark) */
  const dl = (t) => {
    let a = 0, b = 0;
    for (let k = 1; k <= 2; k++) { a += oku(t + yon * k); b += oku(t - yon * k); }
    return (a - b) / 2; /* iceri dogru artis pozitif */
  };
  let tepe = gecis, en = -1e9;
  for (let t = gecis - yon * 6; t !== gecis + yon * 7; t += yon) {
    if (t < 3 || t > sinir - 1) continue;
    const v = dl(t);
    if (v > en) { en = v; tepe = t; }
  }
  if (en < 0.8) return null;               /* kenar sinyali yok — nokta atilir */
  const ym1 = dl(tepe - yon), yp1 = dl(tepe + yon);
  const payda = ym1 - 2 * en + yp1;
  const kayma = Math.abs(payda) > 1e-9 ? Math.max(-1, Math.min(1, 0.5 * (ym1 - yp1) / payda)) : 0;
  return tepe + yon * kayma;
}

/* en kucuk kareler dogru uydurma: b = egim, a = kesisim; 2 tur aykiri atma */
function dogruUydur(noktalar) { /* [t, u]: u = a + b*t */
  let ns = noktalar;
  let a = 0, b = 0;
  for (let tur = 0; tur < 3; tur++) {
    const n = ns.length;
    if (n < 8) return null;
    let st = 0, su = 0, stt = 0, stu = 0;
    for (const [t, u] of ns) { st += t; su += u; stt += t * t; stu += t * u; }
    b = (n * stu - st * su) / (n * stt - st * st);
    a = (su - b * st) / n;
    if (tur < 2) ns = ns.filter(([t, u]) => Math.abs(u - (a + b * t)) <= 2);
  }
  let kt = 0;
  for (const [t, u] of ns) { const r = u - (a + b * t); kt += r * r; }
  return { a, b, n: ns.length, rms: Math.sqrt(kt / ns.length) };
}

const IZ_PENCERE = 15;   /* iz modunda tohum cevresi arama yari-genisligi */
const IZ_ONKESIM = 6;    /* tohum dogrusundan bundan uzak nokta atilir */

/* iz modu kenar noktasi: tohum konumunun +-IZ_PENCERE'sinde isiklilik
   turevinin EN GUCLU tepesi (iceri dogru artis). Doku kapisi yok — pencere
   dar, komsu monitorler disarida kalir. */
function izNoktasi(luma, W, H, sabit, tohumKonum, dikeyMi, yon) {
  const oku = (t) => dikeyMi ? luma[sabit * W + t] : luma[t * W + sabit];
  const sinir = dikeyMi ? W - 4 : H - 4;
  const dl = (t) => {
    let a = 0, b = 0;
    for (let k = 1; k <= 2; k++) { a += oku(t + yon * k); b += oku(t - yon * k); }
    return (a - b) / 2;
  };
  let tepe = -1, en = -1e9;
  const t0 = Math.round(tohumKonum);
  for (let t = t0 - IZ_PENCERE; t <= t0 + IZ_PENCERE; t++) {
    if (t < 4 || t > sinir) continue;
    const v = dl(t);
    if (v > en) { en = v; tepe = t; }
  }
  if (tepe < 0 || en < 0.8) return null;
  const ym1 = dl(tepe - yon), yp1 = dl(tepe + yon);
  const payda = ym1 - 2 * en + yp1;
  const kayma = Math.abs(payda) > 1e-9 ? Math.max(-1, Math.min(1, 0.5 * (ym1 - yp1) / payda)) : 0;
  return tepe + yon * kayma;
}

async function olcKare(dosya, tohum) {
  const { W, H, luma } = await yukle(dosya);
  if (tohum) return olcKareIz(luma, W, H, tohum);
  const { bin, yoğun } = dokuHaritasi(luma, W, H);
  const kutu = kabaKutu(luma, bin, W, H);
  const payY = Math.round((kutu.alt - kutu.ust) * KENAR_ICERI);
  const payX = Math.round((kutu.sag - kutu.sol) * KENAR_ICERI);
  const topla = (dikeyMi, kabaSinir, yon, bas, son) => {
    const pts = [];
    for (let s = bas; s <= son; s += ADIM) {
      const u = kenarNoktasi(luma, yoğun, W, H, s, kabaSinir, dikeyMi, yon);
      if (u !== null) pts.push([s, u]);
    }
    return pts;
  };
  /* sol/sag: satir sabit, x taranir (dikeyMi=true). ust/alt: sutun sabit, y taranir. */
  const solP = topla(true, kutu.sol, +1, kutu.ust + payY, kutu.alt - payY);
  const sagP = topla(true, kutu.sag, -1, kutu.ust + payY, kutu.alt - payY);
  const ustP = topla(false, kutu.ust, +1, kutu.sol + payX, kutu.sag - payX);
  const altP = topla(false, kutu.alt, -1, kutu.sol + payX, kutu.sag - payX);
  const sol = dogruUydur(solP), sag = dogruUydur(sagP), ust = dogruUydur(ustP), alt = dogruUydur(altP);
  if (!sol || !sag || !ust || !alt) return { hata: 'kenar uydurulamadi', kutu };
  return metrikler(sol, sag, ust, alt, W, H, kutu);
}

/* iz modu: tohum = onceki (zamanda sonraki) karenin dogrulari */
function olcKareIz(luma, W, H, tohum) {
  const kes = (dik, yat) => {
    const x = (dik.a + dik.b * yat.a) / (1 - dik.b * yat.b);
    return [x, yat.a + yat.b * x];
  };
  const koseler = { solUst: kes(tohum.sol, tohum.ust), sagUst: kes(tohum.sag, tohum.ust),
    sagAlt: kes(tohum.sag, tohum.alt), solAlt: kes(tohum.sol, tohum.alt) };
  const yUst = Math.min(koseler.solUst[1], koseler.sagUst[1]), yAlt = Math.max(koseler.solAlt[1], koseler.sagAlt[1]);
  const xSol = Math.min(koseler.solUst[0], koseler.solAlt[0]), xSag = Math.max(koseler.sagUst[0], koseler.sagAlt[0]);
  const payY = Math.round((yAlt - yUst) * KENAR_ICERI), payX = Math.round((xSag - xSol) * KENAR_ICERI);
  const topla = (dogru, dikeyMi, yon, bas, son) => {
    const pts = [];
    for (let s = Math.round(bas); s <= son; s += ADIM) {
      const beklenen = dogru.a + dogru.b * s;
      const u = izNoktasi(luma, W, H, s, beklenen, dikeyMi, yon);
      if (u !== null && Math.abs(u - beklenen) <= IZ_ONKESIM) pts.push([s, u]);
    }
    return pts;
  };
  const solP = topla(tohum.sol, true, +1, yUst + payY, yAlt - payY);
  const sagP = topla(tohum.sag, true, -1, yUst + payY, yAlt - payY);
  const ustP = topla(tohum.ust, false, +1, xSol + payX, xSag - payX);
  const altP = topla(tohum.alt, false, -1, xSol + payX, xSag - payX);
  /* kopan kenar tohum dogrusuyla TASINIR ve 'tahmin' isaretlenir — zincir
     tek zayif kenar yuzunden kopmasin (alt kenar karanlik icerikte zayif) */
  const tahmin = [];
  const uydurVeyaTasi = (pts, ad) => {
    const d = dogruUydur(pts);
    if (d) return d;
    tahmin.push(ad);
    return { a: tohum[ad].a, b: tohum[ad].b, n: 0, rms: -1 };
  };
  const sol = uydurVeyaTasi(solP, 'sol'), sag = uydurVeyaTasi(sagP, 'sag');
  const ust = uydurVeyaTasi(ustP, 'ust'), alt = uydurVeyaTasi(altP, 'alt');
  if (tahmin.length >= 3) return { hata: `iz koptu (tahmin kenar ${tahmin.join(',')})` };
  const m = metrikler(sol, sag, ust, alt, W, H, null);
  if (tahmin.length) { m.tahmin_kenar = tahmin; m.dogrulama.hukum = 'GUVENILMEZ'; }
  return m;
}

function metrikler(sol, sag, ust, alt, W, H, kutu) {
  /* sol/sag: x = a + b*y ; ust/alt: y = a + b*x. Kesisim: */
  const kes = (dik, yat) => { /* x = da + db*y ; y = ya + yb*x */
    const x = (dik.a + dik.b * yat.a) / (1 - dik.b * yat.b);
    const y = yat.a + yat.b * x;
    return [x, y];
  };
  const SU = kes(sol, ust), SGU = kes(sag, ust), SGA = kes(sag, alt), SA = kes(sol, alt);
  const uz = (p, q) => Math.hypot(q[0] - p[0], q[1] - p[1]);
  const aciDeg = (p, q) => Math.atan2(q[1] - p[1], q[0] - p[0]) * 180 / Math.PI;
  const icAci = (o, p, q) => {
    const v1 = [p[0] - o[0], p[1] - o[1]], v2 = [q[0] - o[0], q[1] - o[1]];
    return Math.acos((v1[0] * v2[0] + v1[1] * v2[1]) / (Math.hypot(...v1) * Math.hypot(...v2))) * 180 / Math.PI;
  };
  const merkez = [(SU[0] + SGU[0] + SGA[0] + SA[0]) / 4, (SU[1] + SGU[1] + SGA[1] + SA[1]) / 4];
  const r2 = (v) => +v.toFixed(2);
  return {
    kutu,
    kose: { solUst: SU.map(r2), sagUst: SGU.map(r2), sagAlt: SGA.map(r2), solAlt: SA.map(r2) },
    kenar_uzunluk: { ust: r2(uz(SU, SGU)), alt: r2(uz(SA, SGA)), sol: r2(uz(SU, SA)), sag: r2(uz(SGU, SGA)) },
    kenar_aci_deg: { ust: r2(aciDeg(SU, SGU)), alt: r2(aciDeg(SA, SGA)),
      sol: r2(aciDeg(SU, SA) - 90), sag: r2(aciDeg(SGU, SGA) - 90) }, /* dikeyden sapma */
    ic_aci_deg: { solUst: r2(icAci(SU, SGU, SA)), sagUst: r2(icAci(SGU, SU, SGA)),
      sagAlt: r2(icAci(SGA, SGU, SA)), solAlt: r2(icAci(SA, SU, SGA)) },
    merkez: merkez.map(r2),
    merkez_kayma: [r2(merkez[0] - W / 2), r2(merkez[1] - H / 2)],
    dogrulama: {
      nokta: { sol: sol.n, sag: sag.n, ust: ust.n, alt: alt.n },
      rms_px: { sol: r2(sol.rms), sag: r2(sag.rms), ust: r2(ust.rms), alt: r2(alt.rms) },
      hukum: (Math.min(sol.n, sag.n, ust.n, alt.n) >= 20 &&
              Math.max(sol.rms, sag.rms, ust.rms, alt.rms) <= 1.5) ? 'guvenilir' : 'GUVENILMEZ',
    },
    dogrular: { sol: { a: sol.a, b: sol.b }, sag: { a: sag.a, b: sag.b }, ust: { a: ust.a, b: ust.b }, alt: { a: alt.a, b: alt.b } },
    W, H,
  };
}

async function ciz(dosya, r, cikti) {
  const K = r.kose;
  const p = `${K.solUst} ${K.sagUst} ${K.sagAlt} ${K.solAlt}`.replace(/,/g, ' ');
  const svg = Buffer.from(`<svg width="${r.W}" height="${r.H}">` +
    `<polygon points="${K.solUst[0]},${K.solUst[1]} ${K.sagUst[0]},${K.sagUst[1]} ${K.sagAlt[0]},${K.sagAlt[1]} ${K.solAlt[0]},${K.solAlt[1]}" fill="none" stroke="#00ff88" stroke-width="3"/>` +
    ['solUst', 'sagUst', 'sagAlt', 'solAlt'].map(k =>
      `<circle cx="${K[k][0]}" cy="${K[k][1]}" r="7" fill="#00ff88"/>` +
      `<text x="${K[k][0] + 12}" y="${K[k][1] - 10}" font-family="DejaVu Sans, Arial" font-size="26" fill="#00ff88">${K[k][0]},${K[k][1]}</text>`).join('') +
    `<circle cx="${r.merkez[0]}" cy="${r.merkez[1]}" r="6" fill="#ffcc00"/>` +
    `<line x1="${r.W / 2 - 14}" y1="${r.H / 2}" x2="${r.W / 2 + 14}" y2="${r.H / 2}" stroke="#00aaff" stroke-width="3"/>` +
    `<line x1="${r.W / 2}" y1="${r.H / 2 - 14}" x2="${r.W / 2}" y2="${r.H / 2 + 14}" stroke="#00aaff" stroke-width="3"/></svg>`);
  await sharp(dosya).composite([{ input: svg }]).png().toFile(cikti);
}

(async () => {
  const arg = process.argv[2];
  if (!arg) { console.error('kullanim: ekran-kose.cjs <kare.png> | <dizin> <bas> <son>'); process.exit(1); }
  if (arg === 'iz') {
    const dizin = process.argv[3];
    const sonK = +process.argv[4], basK = +process.argv[5];
    const sonuc = { _: 'yeni/film/ekran-kose.cjs iz modu — ORTA ekranin koseleri, son kareden GERIYE iz surme (cok monitorlu sahnede kaba-kutu tum duvari yakalar).', olcum: new Date().toISOString(), kaynak: dizin, yon: `geriye ${sonK} -> ${basK}`, kareler: [] };
    const yol = (i) => path.join(dizin, `k${String(i).padStart(3, '0')}.png`);
    /* tohum SABIT-HIZ disdegerlemesiyle: kenarlar hizli fazda ~14 px/kare
       kayiyor, tohumu son konumda birakmak on-kesime takiliyor */
    let son1 = null, son2 = null;
    for (let i = sonK; i >= basK; i--) {
      let tohum = null;
      if (son1) {
        tohum = {};
        for (const k of ['sol', 'sag', 'ust', 'alt']) {
          const a = son2 ? 2 * son1[k].a - son2[k].a : son1[k].a;
          const b = son2 ? 2 * son1[k].b - son2[k].b : son1[k].b;
          tohum[k] = { a, b };
        }
      }
      const r = await olcKare(yol(i), tohum);
      sonuc.kareler.push({ kare: i, ...r });
      if (r.kose) {
        son2 = son1; son1 = r.dogrular;
        const K = r.kose;
        console.log(`k${i}\tSU ${K.solUst}\tSGU ${K.sagUst}\tSGA ${K.sagAlt}\tSA ${K.solAlt}\tmrk ${r.merkez}\t${r.dogrulama.hukum}${r.tahmin_kenar ? ' tahmin:' + r.tahmin_kenar : ''}`);
      } else { console.log(`k${i}\tHATA ${r.hata} — iz burada durdu`); break; }
    }
    sonuc.kareler.reverse();
    const olc = sonuc.kareler.filter(k => k.kose);
    for (const k of [olc[0], olc[Math.floor(olc.length / 2)], olc[olc.length - 1]]) {
      if (!k) continue;
      await ciz(yol(k.kare), k, path.join(__dirname, 'kontak', `ekran-kose-iz-k${String(k.kare).padStart(3, '0')}.png`));
    }
    fs.writeFileSync(path.join(__dirname, 'ekran-kose.json'), JSON.stringify(sonuc, null, 1));
    console.log(`\n→ ${path.join(__dirname, 'ekran-kose.json')}`);
    return;
  }
  const st = fs.statSync(arg);
  const sonuc = { _: 'yeni/film/ekran-kose.cjs — ekran dortgeninin DORT KOSESI dogru-kesisiminden; kutu degil kose.', olcum: new Date().toISOString(), kaynak: arg, kareler: [] };
  if (st.isDirectory()) {
    const bas = +process.argv[3], son = +process.argv[4];
    for (let i = bas; i <= son; i++) {
      const d = path.join(arg, `k${String(i).padStart(3, '0')}.png`);
      if (!fs.existsSync(d)) continue;
      const r = await olcKare(d);
      sonuc.kareler.push({ kare: i, ...r });
      const K = r.kose;
      if (K) console.log(`k${i}\tSU ${K.solUst}\tSGU ${K.sagUst}\tSGA ${K.sagAlt}\tSA ${K.solAlt}\tmrk ${r.merkez}\t${r.dogrulama.hukum}`);
      else console.log(`k${i}\tHATA ${r.hata}`);
    }
    /* kontrol gorseli: ilk + orta + son olculen kare */
    const olc = sonuc.kareler.filter(k => k.kose);
    for (const k of [olc[0], olc[Math.floor(olc.length / 2)], olc[olc.length - 1]]) {
      if (!k) continue;
      await ciz(path.join(arg, `k${String(k.kare).padStart(3, '0')}.png`), k,
        path.join(__dirname, 'kontak', `ekran-kose-k${String(k.kare).padStart(3, '0')}.png`));
    }
  } else {
    const r = await olcKare(arg);
    sonuc.kareler.push({ kare: path.basename(arg), ...r });
    console.log(JSON.stringify(r, null, 1));
    if (r.kose) await ciz(arg, r, path.join(__dirname, 'kontak', 'ekran-kose-tek.png'));
  }
  fs.writeFileSync(path.join(__dirname, 'ekran-kose.json'), JSON.stringify(sonuc, null, 1));
  console.log(`\n→ ${path.join(__dirname, 'ekran-kose.json')}`);
})().catch((e) => { console.error(e); process.exit(1); });
