#!/usr/bin/env node
/* DEVIR · EKRAN DIKDORTGENI (31 Agu 2026, PROLOG-KESIT-VE-KAPANIS 5. adim)
   DEVIR-SPESIFIKASYONU §4.2: "Son karede EKRAN DIKDORTGENININ koordinatlari
   olculur (piksel cinsinden, videonun kendi cozunurlugunde). Gercek sayfa
   o dikdortgene transform ile oturtulur."

   OLCUM GOZ KARARIYLA DEGIL: son kare (durak8-last.png) satir ve sutun
   isiklilik profilinden okunur. Monitor cercevesi neredeyse siyah, ekran
   ise kizil isikli — esik ikisini ayirir. Kenar, profilin en dik yerinden
   (turevin tepesi) alinir; esigin kendisi kenari birkac piksel kaydirir.

   KENDINI DOGRULAMA: bulunan dikdortgenin ici ile disi arasindaki ortalama
   isiklilik farki yazilir. Fark kucukse esik ayirmamis demektir ve sayi
   guvenilmez — sessiz gecmez.

   Cikti: film/ekran-dikdortgen.json
   Kullanim: node yeni/film/ekran-dikdortgen.cjs */
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const KARE = path.join(__dirname, 'kesit-dikis', 'durak8-last.png');
const CIKTI = path.join(__dirname, 'ekran-dikdortgen.json');

(async () => {
  const { data, info } = await sharp(KARE).raw().toBuffer({ resolveWithObject: true });
  const { width: W, height: H, channels: C } = info;
  const luma = new Float64Array(W * H);
  for (let i = 0, p = 0; i < W * H; i++, p += C) {
    luma[i] = 0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2];
  }
  const satirOrt = new Float64Array(H), sutunOrt = new Float64Array(W);
  for (let y = 0; y < H; y++) { let s = 0; for (let x = 0; x < W; x++) s += luma[y * W + x]; satirOrt[y] = s / W; }
  for (let x = 0; x < W; x++) { let s = 0; for (let y = 0; y < H; y++) s += luma[y * W + x]; sutunOrt[x] = s / H; }

  /* KENAR BULMA — UC YANLIS SURUMUN NOTU DURUYOR, cunku ucu de "sayi
     uretti ama yanlis yeri gosterdi" cinsindendi ve ucu de ancak KUTUYU
     KAREYE CIZDIRINCE goruldu:
       (1) turev tepesi   -> 1560x250 (en/boy 6,24): en dik kenar ekranin
           degil hero BASLIGININ bandi.
       (2) esigi asan piksel orani -> 1320x505: ekranin kendi koyu
           bolgeleri esigin altinda kalinca bant kisaldi.
       (3) satir %98 isikliligi -> 390x292: esik yuksek kalinca yalniz
           basligin parlak harfleri gecti.
     SAYILAR YONTEMI SECTI: olculdu -> cerceve L=0,1 · arka plan L=2,5 ·
     ekranin koyu bolgeleri L=4. Yani ISIKLILIK ekranla arka plani
     AYIRAMAZ. Ayiran sey DOKU: cerceve ve arka plan duz, ekran dokulu.
     Olcut yerel gradyan yogunlugu — |dx|+|dy| esigi asan piksel orani. */
  const grad = new Float64Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    const i0 = y * W + x;
    grad[i0] = Math.abs(luma[i0 + 1] - luma[i0 - 1]) + Math.abs(luma[i0 + W] - luma[i0 - W]);
  }
  const G_ESIK = 2;          /* duz alanda ~0, dokulu alanda >> 2 */
  const ORAN = 0.10;         /* satirin/sutunun en az %10'u dokulu */
  const doluluk = (n, m, al) => {
    const o = new Float64Array(n);
    for (let i = 0; i < n; i++) { let c = 0; for (let j = 0; j < m; j++) if (al(i, j) > G_ESIK) c++; o[i] = c / m; }
    return o;
  };
  /* iki gecisli: once sutun bandi (tum kare), sonra satir bandi YALNIZ
     o sutunlarda. Tek gecisli surumde ust bant, monitorun USTUNDEKI
     ortam huzmesini ve alttaki ayagi yutup 1569x1073 vermisti — kare
     boyu kadar bir "ekran". Kisit, bandi monitorun kendi genisligine
     hapsediyor. */
  /* BOSLUK TOLERANSI: ekranin ust seridi (nav bandi) ve alt bosluk
     dusuk dokuludur; toleranssiz bant orada kopuyordu ve olcum 1501x628
     veriyordu (en/boy 2,39 — 16:9 degil). Bant ICINDE en cok BOSLUK
     kadar ardisik zayif satir/sutun affedilir; bant DISINDA affedilmez,
     yoksa arka plandaki huzmeler bandi disari tasirdi. */
  const BOSLUK = 55;
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
  const dx = bant(doluluk(W, H, (x, y) => grad[y * W + x]), W);
  const dy = bant(doluluk(H, dx.uzunluk, (y, j) => grad[y * W + (dx.bas + j)]), H);
  /* sutunlari bir kez daha, bulunan satir bandi icinde daralt */
  const dx2 = bant(doluluk(W, dy.uzunluk, (x, j) => grad[(dy.bas + j) * W + x]), W);
  dx.bas = dx2.bas; dx.son = dx2.son; dx.uzunluk = dx2.uzunluk;

  /* ICE DARALTMA — GRADYAN MONITORUN DIS KENARINI BULUYOR, BIZE ICI LAZIM.
     Kutuyu cizdirince gorulду: yesil cerceve monitorun kasasini izliyordu
     (1569x936), oysa DEVIR §4.1 "kasa kenarlarda ince cerceve, EKRANDA
     sitenin giris sayfasi" diyor — gercek sayfa KASANIN ICINE, isikli
     ekrana oturmali. Kasa neredeyse siyah (L~0,1), ekranin en sonuk kenari
     bile ondan parlak; her kenardan iceri yurunup ilk "artik kasa degil"
     satiri/sutunu aliyoruz. */
  /* ISIKLILIK ORTALAMASI DA YETMEDI: kasa kenarinda ortam huzmesi var,
     ilk satirin ortalamasi zaten esigi asiyordu ve daraltma hic
     calismadi (kutu 1569x936 kaldi = monitorun DIS kenari). Daraltma da
     ayni olcutle yapilir: GRADYAN YOGUNLUGU. Kasa duz (yogunluk ~0),
     ekran dokulu; ic kenar, yogunlugun kalici olarak yukseldigi yerdir. */
  const KASA = 0.30;                  /* satirin/sutunun en az %30'u dokulu */
  const satirOrtKutu = (y) => { let c = 0; for (let x = dx.bas; x <= dx.son; x++) if (grad[y * W + x] > G_ESIK) c++; return c / (dx.son - dx.bas + 1); };
  const sutunOrtKutu = (x) => { let c = 0; for (let y = dy.bas; y <= dy.son; y++) if (grad[y * W + x] > G_ESIK) c++; return c / (dy.son - dy.bas + 1); };
  let iUst = dy.bas, iAlt = dy.son, iSol = dx.bas, iSag = dx.son;
  while (iUst < iAlt && satirOrtKutu(iUst) < KASA) iUst++;
  while (iAlt > iUst && satirOrtKutu(iAlt) < KASA) iAlt--;
  while (iSol < iSag && sutunOrtKutu(iSol) < KASA) iSol++;
  while (iSag > iSol && sutunOrtKutu(iSag) < KASA) iSag--;
  const kasa = { ust: iUst - dy.bas, alt: dy.son - iAlt, sol: iSol - dx.bas, sag: dx.son - iSag };
  dy.bas = iUst; dy.son = iAlt; dx.bas = iSol; dx.son = iSag;

  /* KENDINI DOGRULAMA: ic/dis isiklilik farki */
  /* DIS = KUTUNUN HEMEN DISINDAKI 40 PX HALKA, tum kare degil. Kutu
     buyudukce "tum kare disi" ortalamasi kutunun kendi icerigine
     yaklasiyor ve dogrulama sahte kirmizi veriyordu (fark 19,64). Kapinin
     sordugu sey "kutu kasadan ayrildi mi" — olculecek yer o halka. */
  const R = 40;
  let ic = 0, icN = 0, dis = 0, disN = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const v = luma[y * W + x];
    const icinde = y >= dy.bas && y <= dy.son && x >= dx.bas && x <= dx.son;
    const halkada = !icinde && y >= dy.bas - R && y <= dy.son + R && x >= dx.bas - R && x <= dx.son + R;
    if (icinde) { ic += v; icN++; } else if (halkada) { dis += v; disN++; }
  }
  ic /= icN; dis /= (disN || 1);

  const r = {
    _: 'yeni/film/ekran-dikdortgen.cjs — devrin oturacagi ekran dikdortgeni, durak8 SON karesinden. Kenarlar isiklilik profilinin turev tepesinden (esik secimi yok).',
    olcum: new Date().toISOString(),
    kare: 'film/kesit-dikis/durak8-last.png',
    kare_olcusu: { gen: W, yuk: H },
    dikdortgen_px: { sol: dx.bas, ust: dy.bas, sag: dx.son, alt: dy.son, gen: dx.son - dx.bas + 1, yuk: dy.son - dy.bas + 1 },
    /* Sayfaya oran olarak gecer: video `object-fit: cover` ile olceklendigi
       icin piksel degil ORAN tasinabilir olan sey. */
    oran: {
      sol: +(dx.bas / W).toFixed(5), ust: +(dy.bas / H).toFixed(5),
      gen: +((dx.son - dx.bas + 1) / W).toFixed(5), yuk: +((dy.son - dy.bas + 1) / H).toFixed(5),
    },
    en_boy: +((dx.son - dx.bas + 1) / (dy.son - dy.bas + 1)).toFixed(4),
    kasa_kalinligi_px: kasa,
    yontem: { olcut: 'yerel gradyan yogunlugu |dx|+|dy|', gradyan_esigi: G_ESIK, doluluk_orani: ORAN, bosluk_toleransi: BOSLUK, neden: 'isiklilik ayirmiyor: cerceve 0,1 · arka plan 2,5 · ekranin koyu bolgeleri 4' },
    dogrulama: { ic_isiklilik: +ic.toFixed(2), dis_isiklilik_halka: +dis.toFixed(2), fark: +(ic - dis).toFixed(2),
      hukum: ic - dis > 20 ? 'ic/dis ayrildi' : 'AYRISMADI — sayi guvenilmez' },
  };
  /* GOZLE DOGRULAMA: bulunan dikdortgen karenin uzerine cizilir. Sayi
     dogru gorunup kutu yanlis yerde olabilir — bakilmadan kapanmaz. */
  const D = r.dikdortgen_px;
  const cizgi = Buffer.from(`<svg width="${W}" height="${H}">` +
    `<rect x="${D.sol}" y="${D.ust}" width="${D.gen}" height="${D.yuk}" fill="none" stroke="#00ff88" stroke-width="6"/>` +
    `<text x="${D.sol + 12}" y="${D.ust + 44}" font-family="DejaVu Sans, Arial" font-size="34" fill="#00ff88">${D.gen}x${D.yuk}  en/boy ${r.en_boy}</text></svg>`);
  await sharp(KARE).composite([{ input: cizgi }]).png()
    .toFile(path.join(__dirname, 'kontak', 'ekran-dikdortgen-kontrol.png'));

  fs.writeFileSync(CIKTI, JSON.stringify(r, null, 1));
  console.log(`kare ${W}x${H}`);
  console.log(`ekran dikdortgeni: sol ${r.dikdortgen_px.sol} · ust ${r.dikdortgen_px.ust} · ${r.dikdortgen_px.gen}x${r.dikdortgen_px.yuk} px · en/boy ${r.en_boy}`);
  console.log(`oran: sol ${r.oran.sol} · ust ${r.oran.ust} · gen ${r.oran.gen} · yuk ${r.oran.yuk}`);
  console.log(`dogrulama: ic ${r.dogrulama.ic_isiklilik} · dis ${r.dogrulama.dis_isiklilik} · fark ${r.dogrulama.fark} -> ${r.dogrulama.hukum}`);
  console.log(`\n→ ${CIKTI}`);
})().catch((e) => { console.error(e); process.exit(1); });
