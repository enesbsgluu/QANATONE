#!/usr/bin/env node
/* KAPI B — SOGUK GIRIS (Enes, 5 Eyl 2026: "IKI KAPI").
   KAPI A (olc-sayfa.cjs) 59 sayfayi TEK tarayicida arka arkaya olcer ve
   gerilemeyi yakalamanin en duyarli yoludur — ama olctugu sey 59 sayfalik
   gezinti SONRASI hal, yani EN IYI durum. Gercek ziyaretci soguk tarayicida
   TEK sayfa acar ve o durum hic olculmuyordu. 4 Eyl'de olculdu: ayni sayfa
   (/hizmetler/finans/) tam taramada 16,7 ms (2,01 tik), tek basina 25,0 ms
   (3,01 tik) — BIR TAM KARE fark, yuk yok, taban temiz.

   BU ARAC O DURUMU OLCER. Kapi A'nin yerine gecmez, YANINA gelir.

   ESIKLER (Enes, 5 Eyl 2026 — ONCE OLCULDU, SONRA KONDU). Ilk olcum esiksiz
   alindi: 9 sayfa x 3 kosum, 27 soguk tarayici acilisi. Esikler o dagilimdan
   turetildi, tahminle degil:
     kacirilan kare (medyan)  <= 2   BLOKLAYICI. Gozlenen tavan 2; 27 kosumun
                                     hicbiri 3'e cikmadi. Hedef <=1 KAPI DEGIL:
                                     bugun 9 sayfanin 4'unu duşururdu ve
                                     duşurdugu sey gerileme degil, sitenin
                                     bugunku hali.
     tek takilma              <= 250 ms  A ile ayni; gozlenen tavan 208 ms.
   TEKRAR VARSAYILANI 5 (A'da 3): ilk olcumde 9 sayfanin 4'u kosumlar arasi
   bant degistirdi (1/2/2 · 2/1/2 · 1/2/1 · 2/1/2), uc kosumun medyani o
   sayfalar icin SABIT DEGILDI. Bes kosum medyani gurultuyu yutar.

   ORAN KAPIDAN DUSTU — YANLIS BIRIM (Enes, 5 Eyl 2026 gecesi). Ilk esik
   listesinde "takilma orani (medyan) <= %8" BLOKLAYICI idi. Dusuruldu.
   Gevsetme degil, birim duzeltmesi; kare kapisinda ayni hata ms/tik olarak
   yapilmisti (bkz. CLAUDE.md "ms cinsinden esik yazma").
   ORAN TUR BOYUNA BAGIMLI BIR TUREVDIR ve kisa sayfalarda ornekleme hatasina
   doner. 5 Eyl'in 45 soguk kosumu bunu ters siralamayla gosterdi:
     /yeni/projeler/  toplam takilma 308 ms · tur 3,37 sn -> %9,13  KALDI
     /yeni/           toplam takilma 667 ms · tur 12,0 sn -> %5,63  GECTI
   Ziyaretcinin hissettigi sey 667 ms'lik sayfada DAHA COK takiliyor olmasidir;
   oran onu tersine siraliyordu. Ayni sayfa uc olcumde %2,99 / %9,13 / %11,01
   verdi — 3,4 saniyelik turda tek bir 150 ms takilma %4,45 ediyor, finansta
   ayni takilma %1,02. Payda kucukse oran gurultudur.

   UC SAYININ ISBOLUMU (yeni tanimin gerekcesi — hangisi dagilimin neresini
   gorur):
     kacirilan kare (p95)   dagilimin GOVDESI      -> KAPI, medyan <= 2
     tek takilma (max)      dagilimin TEK EN KOTU  -> KAPI, <= 250 ms
     takilma TOPLAM SURESI  p95 ile max ARASI kutle -> BILGI SATIRI, kapi degil
   p95 son %5'i gormez, tek-takilma o %5'in yalniz en tepesini gorur; aradaki
   kutleyi gosteren tek sayi mutlak toplamdir. Bu yuzden yazilir ama hukum
   VERMEZ: kapiya donerse ayni turev sorunu geri gelir. Oran da yazilir, ayni
   sebeple hukumsuzdur.
   A'NIN ESIKLERIYLE AYNI OLMAMASI KUSUR DEGIL TASARIM: A tarama kosulunu,
   B ziyaretci kosulunu olcer; ayni sayfa iki kosulda farkli okur, iki rakam
   birbirinin yerine GECMEZ. Ortak olmasi gereken SINYALDIR (neyin takilma
   sayildigi, kaydirma turu, tik kestirimi) — onu olc-esik.test.mjs sinar.

   ISINMA DIZISI v1 — SABIT, KOSUMDAN KOSUMA DEGISMEZ:
     1. HER OLCUM ICIN AYRI TARAYICI ACILIR (taze profil: puppeteer her
        acilista yeni gecici user-data-dir uretir; onbellek, golgelendirici
        onbellegi, font atlasi sifirdan). Uc kosum = uc ayri tarayici.
     2. about:blank acilir.
     3. Tazeleme olculur (200 rAF araligi, ilk 5 isinma atilir) — hem tik
        hesabi hem de kompozitorun ayaga kalkmasi.
     4. 1500 ms bosta beklenir (kompozitor durulsun).
     5. about:blank kapatilir.
     6. Olculecek sayfa acilir. SITE SAYFASI ISINMAYA GIRMEZ — kapinin
        anlami bu: ziyaretci bizim baska sayfamizi gormedi.
     7. Boyama sonrasi 1200 ms beklenir, fare bir kez oynatilir (kabuk
        efektleri kurulsun), taban 3 sn, sonra tur.
   Adim 6'daki sayfa disinda HICBIR site adresi ziyaret edilmez.

   PROLOG BAYRAKLARI KAPI A ILE AYNI (bilincli): oturumda "prolog goruldu"
   isaretlenir. Sebep (a) A ile B ayni sayfa halini olcsun, fark yalnizca
   SOGUKLUKTAN gelsin; (b) film onde dururken networkidle0 hic gelmez ve
   olcum zaman asimina duser; (c) filmin kendi kapilari ayri (FM1, olc-devir,
   olc-efekt). GERCEKTEN soguk ziyaretci prologu GORUR — o yol bu araca
   degil filmin kapilarina aittir; burada olculen SITE GOVDESIDIR.

   SINYAL kapi A ile BIREBIR AYNI, ESIKLER BILEREK FARKLI. Ayni olan: rAF
   araligi, takilmanin tanimi (> 50 ms), kaydirma turu (900 px/s, 600 px
   adim, payda her adimda tazelenir), tik kestirimi, kacirilan kare formulu
   (round(p95/tik) - 1). Farkli olan: kacirilan kapisi (A 1 / B 2) — cunku
   kosullar farkli — ve artik KAPI SAYISI (A ucu de kapi tutar, B'de oran
   bilgiye dustu). olc-esik.test.mjs ikisini de sinar: sinyalin AYNI,
   esiklerin FARKLI, ve B'de oranin kapi blogunda OLMADIGINI.
   A'NIN ORANI BU TURDE ELLENMEDI: A tarama kosulunu olcer ve oradaki gozlenen
   tavan %0,92 ile kapinin (%3) cok altinda — yani A'da oran bugun BAGLAYICI
   degil, uyuyan bir yanlis birim. Ayni duzeltmenin A'ya da uygulanmasi Enes'in
   karari; tek tarafli degistirmedim, iki birimdeki rakamlari rapora yazdim.

   Kullanim: node yeni/film/olc-soguk.cjs        (once: node yerel-sun.cjs)
   Cevre   : TEKRAR=3 · SAYFA=/yeni/ (tek sayfa) · TARAYICI=brave
             LISTE=a,b,c (varsayilan listeyi degistirir)
   KIRMIZI-ONCE: BOZ=1 (ya da BOZ_MS=<ms>) tabandan SONRA her karede yakma
   dongusu enjekte eder; kacirilan kare gorunur sekilde artmali. Duzenek
   bozulmus sayfayi ayirt edemiyorsa yesili anlamsizdir.

   MAKINE YUKU VE UCUNCU DURUM (6 Eyl 2026) — KAPI A ILE AYNI AILE.
   B de yuku hic kaydetmiyordu ve B'nin muaf olmasi icin bir sebep yok:
   ayni makinede, ayni tarayici ikilisiyle, ayni sinyali olcuyor. Artik her
   kosumda surec basina cekirdek-saniye olculur; YABANCI BIR TARAYICI
   calisiyorsa o sayfa HUKUMSUZDUR (kaldi degil — iddia sayfa hakkinda degil
   OLCUMUN kendisi hakkindadir). Kapinin doz-tepki dayanagi ve neden toplam
   CPU'nun kapi OLMADIGI: olc-sayfa.cjs'in basindaki kunye.
   Cikis kodlari: 0 gecti · 2 kaldi · 3 hukum yok. */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn } = require('child_process');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const TARAYICILAR = {
  chrome: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  brave: 'C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe',
};
const TARAYICI = process.env.TARAYICI || 'brave';
const SUNUCU = process.env.SUNUCU || 'http://127.0.0.1:8790';
const DIST = path.join(__dirname, '..', '..', 'dist');
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-soguk.json');
const TEKRAR = Number(process.env.TEKRAR || 5);
/* SINYAL — KAPI A ILE BIREBIR AYNI OLMALI (olc-esik.test.mjs sinar): neyin
   "takilma" sayildigi iki kapida ayrisirsa rakamlar kiyaslanamaz hale gelir. */
const TAKILMA_ESIK = 50;
/* KAPI B ESIKLERI — kunyeye bak: olculerek konuldu, A'dan farkli olmasi tasarim.
   BLOKLAYICI OLAN IKI TANE: kacirilan kare medyani ve tek takilma. Ikisi de
   MUTLAK birim (tik ve ms); oran/toplam bilgi satiridir, asagida ayri blok. */
const KACIRILAN_KAPI = Number(process.env.KACIRILAN_KAPI || 2);  /* BLOKLAYICI */
const KACIRILAN_HEDEF = 1;      /* HEDEF — KAPI DEGIL, yalnizca kayda gecer */
const TEK_TAKILMA_MS = 250;     /* BLOKLAYICI — A ile ayni, gozlenen tavan 208 ms */
/* BILGI SATIRLARI — HUKUM VERMEZ (Enes, 5 Eyl gecesi: "yanlis birimin
   duzeltilmesi"). Asagidaki iki sayi kayda ve konsola YAZILIR, `oz.kapi`
   nesnesine GIRMEZ. Kapiya geri koyacak olan once kunyedeki "ORAN KAPIDAN
   DUSTU" blogunu okusun: oran tur boyuna bagimli bir turevdir. */
const ORAN_ESKI_KAPI = 0.08;    /* 5 Eyl sabahi kapiydi — artik yalniz kiyas icin yazilir */
const BOZ = process.env.BOZ === '1' || !!process.env.BOZ_MS;

/* YUK KAPISI — KAPI TOPLAM CPU DEGIL, YABANCI TARAYICIDIR (6 Eyl 2026,
   olculdu; ilk yazimda toplam cekirdege kapi konmustu, OLCUM ONU CURUTTU).

   TEK DEGISKENLI DOZ-TEPKI TARAMASI (`olc-yuk-tarama.cjs`, /hizmetler/geo/,
   TEKRAR=3, ayni agac ve tarayici) — yakici surecler CPU yakar, GPU'ya
   dokunmaz:
     yabanci 0,454 cekirdek  → p95  8,5 ms · kacirilan 0
     yabanci 0,682          → p95  8,5 ms · kacirilan 0
     yabanci 1,097          → p95 16,5 ms · kacirilan 1   ] AYNI YUK,
     yabanci 1,097 (2. tur) → p95  8,5 ms · kacirilan 0   ] ZIT SONUC
     yabanci 1,731          → p95 16,6 ms · kacirilan 1
     yabanci 2,941          → p95 16,7 ms · kacirilan 1
   Yani ~3 cekirdege kadar SAF CPU yuku hukmu cevirmiyor; ayni yuk iki kez
   zit sonuc verdigine gore o bandda surukleyen sey yuk DEGIL. Ayni gun
   Defender+Nessus makineyi %99'a (7,9/8 cekirdek) cikardiginda da ana sayfa
   16,7 ms okudu — 6 Eyl'in temiz taramasindaki 16,6 ile ayni.

   BOZAN SEY OLCULDU: yabanci bir TARAYICI. Animasyonlu bir Chrome penceresi
   acilip ayni sayfa olculdugunde p95 33,4/33,3/33,4 ms = 4,02 tik, kacirilan
   3 — 6 Eyl'de saatleri yiyen yanlis kirmizinin (33,4 ms · 4,02 tik) RAKAMI
   BIREBIR. O gunku yuk de iki chrome.exe sureciydi (0,499 + 0,341 = 0,84).
   Iki bagimsiz olay ayni sayida bulusuyor. Mekanizma CPU kitligi degil:
   ayni GPU/kompozitor hattini paylasan ikinci bir tarayici.
   KUSAK: yabanci tarayici 0,03 cekirdekte (arka planda duran bos Chrome —
   bugunku butun temiz kosumlarda vardi) ZARARSIZ · 0,7-0,9'da OLDURUCU.
   Kapi ikisinin arasina, her iki yana ~5 kat payla 0,15'e konur.
   TOPLAM CPU KAPI DEGIL, BILGIDIR — ama YAZILIR: doktrin (CLAUDE.md) onu
   sart kosuyor ve kirmiziyi kimin urettigini ancak surec dokumu soyler. */
const TARAYICI_KAPI = Number(process.env.TARAYICI_KAPI || 0.15);
/* Adla taninan tarayici sinifi. BIZIM tarayicimiz zaten surec agacimizda,
   yabanci sayilmiyor. Electron uygulamalari (Chromium tasirlar) LISTEDE
   DEGIL: bugun olculen butun temiz kosumlarda claude.exe 0,05-0,17 cekirdek
   yiyordu ve hicbirini bozmadi; olculmemis bir siniri kapiya yazmayiz.
   Tam surec dokumu her sayfada kayda gectigi icin boyle bir sey cikarsa
   kayittan gorunur — NITEKIM CIKTI: 6 Eyl'in yuku yazan ilk tam taramasinda
   `msedgewebview2.exe` 0,083 cekirdekle en agir alti surecin arasindaydi
   (gomulu Chromium, adiyla tarayici degil). 61 sayfanin 61'i yesil kaldi,
   yani o bantta bozmuyor. Listeye ALINMADI: olculmemis bir siniri kapiya
   yazmayiz, ama bu satir bir daha bakildiginda kanitin nerede oldugunu
   soyler (yeni/film/olc-sayfa.json, `en_agir` alanlari). */
const YABANCI_TARAYICILAR = new Set(['chrome.exe', 'msedge.exe', 'brave.exe', 'firefox.exe', 'opera.exe', 'vivaldi.exe', 'iexplore.exe', 'thorium.exe', 'yandex.exe']);
/* KIRMIZI-ONCE, HER YENI KURAL ICIN BIR KOL:
   BOZ_TIK=<ms>   acilis tikini kaydirir       -> tik_sapma + ekran_degisti
   BOZ_TARAYICI=1 yabanci tarayici acar        -> yabanci_tarayici kapisi
   BOZ_YUK=<cek.> saf CPU yakar (GPU'ya dokunmaz) -> KAPI DEGIL: bu kolun isi
                  kapiyi yakmak degil, toplam CPU'nun kapi OLMADIGINI
                  gosteren egriyi uretmektir (olc-yuk-tarama.cjs onu kullanir) */
const BOZ_TIK = Number(process.env.BOZ_TIK || 0);
const BOZ_TARAYICI = process.env.BOZ_TARAYICI === '1';


/* KAPSAM — DAR TUTULUYOR (Enes): 59 sayfa degil. Kapi A'nin 4 Eyl tam
   taramasinda BIR KARE kaciran 8 sayfa (iki ana sayfa dahil) + bir KONTROL
   sayfasi. Kontrol, A'da SIFIR kare kaciran banttan secildi: soguk girisin
   yalnizca agir sayfalari mi yoksa her sayfayi mi bir tik oynattigini ancak
   o ayirir. Ana sayfa zaten sekizin icinde oldugu icin dokuzuncu sira
   kopyaya degil kontrole verildi. */
const VARSAYILAN = [
  '/',                                  /* ana sayfa TR   · A: 1 kare */
  '/en/',                               /* ana sayfa EN   · A: 1 kare */
  '/hizmetler/finans/',                 /*                · A: 1 kare */
  '/en/hizmetler/finans/',              /*                · A: 1 kare */
  '/hizmetler/web-sitesi-araclar/',     /*                · A: 1 kare */
  '/en/hizmetler/web-sitesi-araclar/',  /*                · A: 1 kare */
  '/otomasyon/',                        /*                · A: 1 kare */
  '/en/otomasyon/',                     /*                · A: 1 kare */
  '/projeler/',                         /* KONTROL        · A: 0 kare */
];
const secim = process.env.SAYFA ? [process.env.SAYFA]
  : (process.env.LISTE ? process.env.LISTE.split(',').map((s) => s.trim()) : VARSAYILAN);
/* KISMI KOSUM HUKUM DEGILDIR — kapi A'daki bekcinin aynisi. B'nin hukmu
   VARSAYILAN dokuz sayfanin tamami kosuldugunda kurulur; SAYFA/LISTE ile
   daraltilan kosum teshis aracidir, kapiyi dusurmez (istisna BOZ: kirmiziyi
   biz urettik, atif bizde). */
const KISMI = secim.length !== VARSAYILAN.length || secim.some((y, i) => y !== VARSAYILAN[i]);

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const medyan = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const p95 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : null; };
const p10 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.10)] : null; };

const KAYITCI = `(() => {
  window.__k = { ara: [], on: false, son: null };
  const f = (t) => { if (__k.son !== null && __k.on) __k.ara.push(+(t - __k.son).toFixed(2)); __k.son = t; requestAnimationFrame(f); };
  requestAnimationFrame(f);
  window.__kBasla = () => { __k.ara.length = 0; __k.on = true; };
  window.__kBitir = () => { __k.on = false; return __k.ara.slice(); };
})()`;

/* ============================ YUK OLCUMU ============================
   DOKTRIN (CLAUDE.md): "olc-sayfa kirmizisi MAKINE YUKU yazilmadan da hukum
   degildir · ortalama CPU yuku tek cekirdek yiyen sureci gizler — yuk
   bakarken SUREC BASINA CEKIRDEK-SANIYE olc." Kural belgede vardi, ALETTE
   YOKTU; elle kosulan bir kural kosmayan kuraldir. Artik alet olcer.

   6 EYL 2026'DA UC UCUZ SINYAL DENENDI, UCU DE YUKU GORMEDI:
   1. Sistem ortalamasi: %13,8 goruntusu altinda iki surec tek cekirdegin
      %49,9 ve %34,1'ini yiyordu. (Bu kosumda yine de yazilir — ortalamanin
      neyi gizledigi ancak yan yana konunca okunur.)
   2. BOS SAYFA (about:blank) rAF kararliligi — 6 Eyl'de OLCULDU ve CURUDU:
      makine %99 mesgulken (7,9/8 cekirdek: Defender 5,0 + Nessus 2,5)
      about:blank uc turda da 120,5 Hz, p95 1,01 tik, KACIRILAN 0, suzulen
      0/194 verdi. Bos sayfanin isi yok; zamanlayici ona dilimini veriyor.
      Yani `tazeleme` bloğunun temiz olmasi makinenin temiz oldugunu
      GOSTERMEZ — dedektor diye kullanilamaz.
   3. Sayfanin kendi TABANI (kaydirmasiz 3 sn) yuku gorur ama SAYFA
      MALIYETIYLE KARISIR (bosta donen bir suslemesi olan sayfanin tabani da
      yukselir). Ortam olcusu olamaz; bilgi olarak kalir.
   Geriye SEBEP tarafi kaldi: surecleri tek tek saymak.

   YABANCI = bizim olcum agacimizin DISINDAKI her surec: ne tarayicinin
   surec agaci (olctugumuz sey odur), ne bu node sureci ve cocuklari
   (powershell ornekleyicisi dahil — kendi olcum maliyetimizi yabanci yuk
   diye yazmak sahte kirmizi olurdu).
   BIRIM: cekirdek = delta CPU saniyesi / gecen duvar saniyesi. */
const YUK_UC = '<<YUK>>';
const YUK_SORGU = "Get-CimInstance -Query 'SELECT ProcessId,ParentProcessId,Name,KernelModeTime,UserModeTime FROM Win32_Process' | ForEach-Object { \"$($_.ProcessId) $($_.ParentProcessId) $($_.KernelModeTime) $($_.UserModeTime) $($_.Name)\" }; Write-Output '" + YUK_UC + "'";

/* KALICI PowerShell: surec acilisi ornek basina 1,2-2,3 sn tutuyordu, ayni
   sorgu acik bir kabukta 0,3 sn. Ornekler olculen pencerelerin DISINDA
   (goto oncesi / close sonrasi) alinir. */
function yukAc() {
  let ps;
  try {
    ps = spawn('powershell', ['-NoProfile', '-NonInteractive', '-Command', '-'], { stdio: ['pipe', 'pipe', 'ignore'] });
  } catch (e) { return null; }
  ps.on('error', () => { ps.olu = true; });
  ps.stdout.setEncoding('utf8');
  let tampon = '', bekleyen = null;
  ps.stdout.on('data', (d) => {
    tampon += d;
    const i = tampon.indexOf(YUK_UC);
    if (i >= 0 && bekleyen) { const g = tampon.slice(0, i); tampon = tampon.slice(i + YUK_UC.length); const c = bekleyen; bekleyen = null; c(g); }
  });
  return {
    /* ZAMAN ASIMI SARTTIR: ornekleyici asilirsa tarama sonsuza kadar
       beklerdi. null doner -> yuk OLCULEMEDI -> hukum yok (doktrin). */
    ornek: () => new Promise((coz) => {
      if (ps.olu || ps.exitCode !== null) return coz(null);
      const z = setTimeout(() => { if (bekleyen) { bekleyen = null; coz(null); } }, 8000);
      bekleyen = (g) => { clearTimeout(z); coz({ m: yukAyristir(g), an: Date.now() }); };
      try { ps.stdin.write(YUK_SORGU + '\n'); } catch (e) { clearTimeout(z); bekleyen = null; coz(null); }
    }),
    kapat: () => { try { ps.stdin.end(); ps.kill(); } catch (e) {} },
  };
}

function yukAyristir(metin) {
  const m = new Map();
  for (const s of metin.split('\n')) {
    const t = s.trim(); if (!t) continue;
    const p = t.split(' ');
    if (p.length < 5) continue;
    const pid = Number(p[0]), ppid = Number(p[1]), k = Number(p[2]), u = Number(p[3]);
    if (!Number.isFinite(pid) || !Number.isFinite(k) || !Number.isFinite(u)) continue;
    m.set(pid, { pid, ppid, ad: p.slice(4).join(' '), cpu: (k + u) / 1e7 });   /* 100 ns -> sn */
  }
  return m;
}

/* kokler + butun soylari (tarayici renderer'lari kok surecin cocugudur) */
function yukSoy(m, kokler) {
  const ic = new Set(kokler.filter((x) => Number.isFinite(x)));
  let degisti = true;
  while (degisti) {
    degisti = false;
    for (const p of m.values()) if (!ic.has(p.pid) && ic.has(p.ppid)) { ic.add(p.pid); degisti = true; }
  }
  return ic;
}

/* DUZENEGIN KENDI URETTIGI "YABANCI" SUREC — OLCULEREK AYRILDI (6 Eyl 2026).
   dwm.exe masaustu kompozitorudur ve bizim surec agacimizin disindadir, ama
   yaptigi is BIZIM: gorunur pencerede 120 Hz boyayan tarayicinin karelerini
   birlestiriyor. Uc kosulda olculdu — tarayici kapali 0,007 · tarayici acik
   bos sayfada <0,027 · tarayici sayfa kaydirirken 0,358 cekirdek. Elli kat
   fark ve tamami duzenegin isi. Yabanci sayilsaydi kapinin yarisindan
   fazlasini duzenegin kendisi yer, sessiz bir makine bile sinirda kalirdi.
   AYRILIR AMA GIZLENMEZ: `rig_cekirdek` olarak ayrica yazilir.
   Cekirdek (System, pid 4) ayrilmadi — surucu isinin bir kismi bizim ama
   atfedilemez, ve atfedilemeyen seyi kendi lehimize saymayiz. */
const RIG_SURECLERI = new Set(['dwm.exe']);

/* iki ornek arasindaki YABANCI yuk. Pencerede olen surec iki ornekte de
   toplanmaz (son ornekte yok) — bu bilincli: kapanmis bir renderer'in
   maliyeti yabanci yuk degildir. */
function yukFark(bas, son, kokler) {
  if (!bas || !son) return null;
  const gecen = (son.an - bas.an) / 1000;
  if (!(gecen > 0)) return null;
  const bizim = yukSoy(son.m, kokler);
  const surecler = [];
  let yabanci = 0, rig = 0, tarayici = 0;
  for (const [pid, p] of son.m) {
    if (pid === 0 || bizim.has(pid)) continue;              /* System Idle Process + bizim agac */
    const o = bas.m.get(pid);
    const d = o ? p.cpu - o.cpu : p.cpu;                    /* pencerede dogan surec: sifirdan */
    if (!(d > 0)) continue;
    const c = d / gecen;
    if (RIG_SURECLERI.has(p.ad)) { rig += c; continue; }
    yabanci += c;
    if (YABANCI_TARAYICILAR.has((p.ad || '').toLowerCase())) tarayici += c;
    if (c >= 0.01) surecler.push({ ad: p.ad, pid, cekirdek: +c.toFixed(3) });
  }
  surecler.sort((a, b) => b.cekirdek - a.cekirdek);
  return {
    tarayici_cekirdek: +tarayici.toFixed(3),                /* KAPI budur */
    yabanci_cekirdek: +yabanci.toFixed(3),                  /* BILGI: toplam */
    rig_cekirdek: +rig.toFixed(3),
    en_agir: surecler.slice(0, 6),
    pencere_sn: +gecen.toFixed(2),
  };
}

/* SISTEM ORTALAMASI — bedava (os.cpus deltasi) ve YALAN SOYLER; yabanci
   yukun yaninda yazilir ki farki okunabilsin. Kapi DEGIL. */
const cpuKap = () => os.cpus().map((c) => ({ ...c.times }));
function cpuFark(a, b) {
  let mesgul = 0, tum = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    const A = a[i], B = b[i];
    const ta = A.user + A.nice + A.sys + A.idle + A.irq, tb = B.user + B.nice + B.sys + B.idle + B.irq;
    mesgul += (tb - ta) - (B.idle - A.idle); tum += tb - ta;
  }
  return tum > 0 ? +(mesgul / tum * a.length).toFixed(3) : null;
}


/* ISINMA adim 2-5 + tik olcumu. Kapi A'daki tazelemeOlc ile ayni yontem. */
async function isinVeOlc(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('about:blank');
  await page.bringToFront();
  await bekle(300);
  const ara = await page.evaluate(() => new Promise((coz) => {
    const a = []; let son = null, n = 0;
    const f = (t) => { if (son !== null) a.push(+(t - son).toFixed(3)); son = t; if (++n < 200) requestAnimationFrame(f); else coz(a); };
    requestAnimationFrame(f);
  }));
  await bekle(1500);                                   /* kompozitor durulsun */
  await page.close();
  const ham = ara.slice(5);
  const m0 = medyan(ham);
  const suz = ham.filter((x) => x > m0 * 0.5 && x < m0 * 1.5);
  const sirali = [...ham].sort((a, b) => a - b);
  return {
    tik_ms: +medyan(suz).toFixed(3), hz: +(1000 / medyan(suz)).toFixed(1),
    ornek: ham.length, suzulen: ham.length - suz.length,
    min: sirali[0], p10: p10(ham), p90: sirali[Math.floor(ham.length * 0.9)],
    kararli: suz.length >= ham.length * 0.8,
  };
}

/* TEK OLCUM = TEK TARAYICI. Taze profil her cagrida yeniden dogar. */
async function sogukKosum(yol, yuk) {
  /* YUK PENCERESI olculen pencereyi SARAR. B'de tarayici HER KOSUMDA
     yeniden dogdugu icin agac kokleri de her kosumda yeniden alinir —
     A'daki tek kok listesi burada yanlis olurdu. */
  const yBas = yuk ? await yuk.ornek() : null;
  const cBas = cpuKap();
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1460,980', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 600000,
  });
  const kokler = [process.pid, browser.process() ? browser.process().pid : NaN];
  try {
    const tz = await isinVeOlc(browser);
    /* BOZ_TIK: bu kosumun boleni bilerek kaydirilir; kosumun kendi tabani
       degismedigi icin capraz kontrol %20'yi asmali ve sayfa hukumsuz olmali. */
    if (BOZ_TIK) { tz.boz_tik_oncesi = tz.tik_ms; tz.tik_ms = BOZ_TIK; tz.hz = +(1000 / BOZ_TIK).toFixed(1); }
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    const cdp = await page.target().createCDPSession();
    await page.evaluateOnNewDocument(() => {
      try {
        sessionStorage.setItem('qanat-splash-seen', '1');
        sessionStorage.setItem('qanat-prolog-atlandi', '1');
      } catch (e) {}
    });
    await page.goto(SUNUCU + yol, { waitUntil: 'networkidle0', timeout: 60000 });
    await page.evaluate(KAYITCI);
    await page.bringToFront();
    await page.mouse.move(720, 450);
    await bekle(1200);
    await page.evaluate(() => __kBasla());
    await bekle(3000);
    const tabanAra = await page.evaluate(() => __kBitir());
    const tabanTak = tabanAra.filter((a) => a > TAKILMA_ESIK);
    if (BOZ) {
      /* YAKMA SINANAN KAPIYA GORE OLCEKLENIR — kapi A ile ayni kural.
         B'nin kapisi <=2 oldugu icin yakma 3,4 tik: A'nin 2,4 tikleri B'nin
         kapisinin ICINDE kalirdi (5 Eyl'de olculdu, kol yanmadi). */
      const bozMs = Number(process.env.BOZ_MS || (tz.tik_ms * (KACIRILAN_KAPI + 1.4)).toFixed(1));
      await page.evaluate((ms) => {
        window.__bozDur = false;
        const yak = (s) => { const t0 = performance.now(); while (performance.now() - t0 < s) { /* mesgul bekle */ } };
        const g = () => { if (window.__bozDur) return; yak(ms); requestAnimationFrame(g); };
        requestAnimationFrame(g);
      }, bozMs);
    }
    /* PAYDA HER ADIMDA TAZELENIR — kapi A ile ayni kural, ayni gerekce:
       sayfa yuksekligi tur boyunca degisir (content-visibility), payda bir
       kez alinirsa tur dibe ulassa bile "%84 gezildi" yazilir. */
    let toplamPx = await page.evaluate(() => Math.max(0, document.documentElement.scrollHeight - innerHeight));
    const toplamPxBas = toplamPx;
    await page.evaluate(() => __kBasla());
    const t0 = performance.now();
    let y = 0, zamanAsimi = false;
    while (y < toplamPx - 4) {
      const adim = Math.min(600, toplamPx - y);
      await cdp.send('Input.synthesizeScrollGesture', { x: 720, y: 450, xDistance: 0, yDistance: -adim, speed: 900, gestureSourceType: 'mouse' });
      const d = await page.evaluate(() => ({ y: scrollY, max: Math.max(0, document.documentElement.scrollHeight - innerHeight) }));
      toplamPx = d.max;
      if (d.y <= y) break;
      y = d.y;
      if (performance.now() - t0 > 90000) { zamanAsimi = true; break; }
    }
    const turTam = !zamanAsimi && y >= toplamPx - 4;
    await bekle(300);
    const ara = await page.evaluate(() => __kBitir());
    const turMs = ara.reduce((a, b) => a + b, 0);
    const tak = ara.filter((a) => a > TAKILMA_ESIK);
    return {
      tazeleme: tz,
      kare: ara.length, tur_ms: Math.round(turMs), p95_ms: p95(ara), medyan_ms: medyan(ara),
      kare_p95: +(p95(ara) / tz.tik_ms).toFixed(3),
      kacirilan_kare: Math.max(0, Math.round(p95(ara) / tz.tik_ms) - 1),
      takilma_sayi: tak.length, takilma_toplam_ms: Math.round(tak.reduce((a, b) => a + b, 0)),
      takilma_tek_max_ms: tak.length ? Math.round(Math.max(...tak)) : 0,
      taban: { sure_ms: Math.round(tabanAra.reduce((a, b) => a + b, 0)), takilma_sayi: tabanTak.length, p95_ms: p95(tabanAra), tik_p10: p10(tabanAra) },
      scroll_px: y, toplam_px: toplamPx, toplam_px_bas: toplamPxBas, tur_tam: turTam,
      /* ORNEK TARAYICI DAHA KAPANMADAN alinir: kapandiktan sonra alinsa
         onun surecleri ornekte hic bulunmaz ve `kokler` bir seyi elemez —
         calisir gorunur, yanlis bir sey elemez, ama pencere olculen
         pencereden buyur. */
      yuk: yukFark(yBas, yuk ? await yuk.ornek() : null, kokler),
      sistem_cekirdek: cpuFark(cBas, cpuKap()),
    };
  } finally {
    await browser.close();
  }
}

(async () => {
  console.log(`KAPI B — SOGUK GIRIS · ${TARAYICI} · ${secim.length} sayfa · ${TEKRAR} kosum · HER KOSUM AYRI TARAYICI${BOZ ? '  [BOZ KIRMIZI-ONCE]' : ''}`);
  console.log(`KAPI     : kacirilan kare <= ${KACIRILAN_KAPI} (medyan, BLOKLAYICI) · tek takilma <= ${TEK_TAKILMA_MS} ms (BLOKLAYICI) · tur tam`);
  console.log(`BILGI    : takilma TOPLAM SURESI (ms) ve orani yazilir, HUKUM VERMEZ — oran tur boyuna bagimli turev  [HEDEF kacirilan <= ${KACIRILAN_HEDEF} — kapi degil]`);
  /* YUK OLCEYICI — ilk sorgu PowerShell acilisini tasir, dongu baslamadan
     isitilir ki kosum pencerelerine binmesin. */
  const yuk = yukAc();
  if (yuk) await yuk.ornek();
  /* KIRMIZI-ONCE, YABANCI TARAYICI KURALI ICIN — A'daki kolun aynisi.
     B'nin kurali A'nin KOPYASI oldugu icin kolu da kopyalanir: kopya
     kural, kopyalanmayan kolla dogrulanmis sayilmaz. */
  const bozTarayiciYol = path.join(os.tmpdir(), 'qanat-boz-tarayici-b.html');
  if (BOZ_TARAYICI) {
    fs.writeFileSync(bozTarayiciYol, `<!doctype html><meta charset="utf-8"><title>QANAT BOZ_TARAYICI</title>
<style>html,body{margin:0;height:100%;background:#111;overflow:hidden}canvas{position:absolute;inset:0;width:100%;height:100%}</style>
<canvas id="c"></canvas><script>
const c=document.getElementById('c'),x=c.getContext('2d');let t=0;
(function k(){c.width=innerWidth;c.height=innerHeight;
for(let i=0;i<90;i++){x.fillStyle='hsla('+((t+i*4)%360)+',70%,50%,0.10)';x.beginPath();
x.arc((Math.sin(t/40+i)*0.5+0.5)*c.width,(Math.cos(t/55+i)*0.5+0.5)*c.height,60+(i%9)*14,0,7);x.fill();}
t++;requestAnimationFrame(k);})();
</script>`);
    const oteki = TARAYICI === 'brave' ? TARAYICILAR.chrome : TARAYICILAR.brave;
    spawn('cmd', ['/c', 'start', '/b', '', oteki, '--new-window', '--window-size=900,700', '--window-position=20,20',
      'file:///' + bozTarayiciYol.replace(/\\/g, '/')], { detached: true, stdio: 'ignore' }).unref();
    await bekle(6000);
  }
  const bozTarayiciKapat = () => {
    if (!BOZ_TARAYICI) return;
    try {
      require('child_process').execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
        "Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.MainWindowTitle -like '*QANAT BOZ_TARAYICI*' } | ForEach-Object { $null = $_.CloseMainWindow() }"],
      { stdio: 'ignore', timeout: 30000 });
    } catch (e) {}
  };
  console.log(`YUK      : YABANCI TARAYICI <= ${TARAYICI_KAPI} cekirdek — ASILIRSA O SAYFA HUKUMSUZDUR. Toplam CPU KAPI DEGIL, bilgi.${yuk ? '' : '  !! OLCEYICI ACILAMADI — hicbir sayfa hukum vermeyecek'}`);
  const sonuc = [];
  for (const yol of secim) {
    const k = [];
    /* Gezinme hatasina dayaniklilik — kapi A'daki ile ayni kural ve ayni
       sebep: bir kosumun dusmesi butun kosumun kaydini yok etmemeli, ama
       yutulmamali da. Bir kez yeniden dene, olmazsa adiyla yaz ve HUKUMSUZ. */
    const kosumHatalari = [];
    for (let i = 0; i < TEKRAR; i++) {
      let r = null;
      for (let deneme = 0; deneme < 2 && !r; deneme++) {
        try { r = await sogukKosum(yol, yuk); }
        catch (e) {
          kosumHatalari.push({ kosum: i + 1, deneme: deneme + 1, hata: String((e && e.message) || e).split('\n')[0] });
          if (deneme === 0) await bekle(3000);
        }
      }
      if (r) k.push(r);
    }
    if (!k.length) {
      const oz = {
        yol, kosum: [], kosum_hatalari: kosumHatalari,
        yuk: { olculdu: false, tarayici_cekirdek_enyuksek: null, yabanci_cekirdek_medyan: null, en_agir: [] },
        hukumsuz: ['kosum_hatasi'], gecti: null, hedefte: false,
        bilgi: { takilma_toplam_medyan_ms: null, takilma_toplam_kosumlar: [], takilma_sayi_medyan: null, tur_ms_medyan: null, takilma_oran_medyan: 0 },
      };
      sonuc.push(oz);
      console.log(`HUKSZ  ${yol.padEnd(38)} HICBIR KOSUM TAMAMLANAMADI  !! ${kosumHatalari.map((h) => h.hata).join(' · ')}`);
      continue;
    }
    const oz = {
      yol, kosum: k,
      p95_medyan: medyan(k.map((x) => x.p95_ms)),
      kacirilan_medyan: medyan(k.map((x) => x.kacirilan_kare)),
      kacirilan_kosumlar: k.map((x) => x.kacirilan_kare),
      kacirilan_en_yuksek: Math.max(...k.map((x) => x.kacirilan_kare)),
      kare_p95_medyan: +medyan(k.map((x) => x.kare_p95)).toFixed(3),
      takilma_tek_max: Math.max(...k.map((x) => x.takilma_tek_max_ms)),
      taban_takilma: k.map((x) => x.taban.takilma_sayi),
      tik_kosumlar: k.map((x) => x.tazeleme.tik_ms),
    };
    /* BILGI — hukum vermez. `oz.kapi` icine GIRMEZ, `gecti` hesabina girmez.
       Mutlak toplam once yazilir cunku ziyaretcinin hissettigi odur; oran
       onun yaninda tur boyuyla birlikte durur ki turev oldugu gorunsun. */
    oz.bilgi = {
      takilma_toplam_medyan_ms: medyan(k.map((x) => x.takilma_toplam_ms)),
      takilma_toplam_kosumlar: k.map((x) => x.takilma_toplam_ms),
      takilma_sayi_medyan: medyan(k.map((x) => x.takilma_sayi)),
      tur_ms_medyan: medyan(k.map((x) => x.tur_ms)),
      takilma_oran_medyan: +medyan(k.map((x) => x.tur_ms ? x.takilma_toplam_ms / x.tur_ms : 0)).toFixed(4),
      _: 'BILGI SATIRI — KAPI DEGIL. Oran tur boyuna bagimli turevdir, mutlak toplam ziyaretcinin hissettigidir.',
    };
    oz.takilma_oran_medyan = oz.bilgi.takilma_oran_medyan;   /* geriye donuk kayit alani */
    oz.eski_oran_kapisi = oz.bilgi.takilma_oran_medyan <= ORAN_ESKI_KAPI;  /* yalniz kiyas */
    oz.tur_tam = k.every((x) => x.tur_tam);
    /* MAKINE YUKU — A ile AYNI OLCUT. B'nin bundan muaf olmasi icin bir
       sebep yok: ayni makinede, ayni tarayici ikilisiyle, ayni sinyali
       olcuyor; yabanci bir tarayici B'yi de ayni sekilde bozar. Kapinin
       kunyesi ve doz-tepki tablosu olc-sayfa.cjs'in basindadir. */
    const tCek = k.map((x) => x.yuk && x.yuk.tarayici_cekirdek).filter((x) => typeof x === 'number');
    const yCek = k.map((x) => x.yuk && x.yuk.yabanci_cekirdek).filter((x) => typeof x === 'number');
    const enAgirKosum = k.filter((x) => x.yuk).sort((a, b) => b.yuk.yabanci_cekirdek - a.yuk.yabanci_cekirdek)[0];
    oz.yuk = {
      olculdu: yCek.length === k.length,
      tarayici_cekirdek_enyuksek: tCek.length ? +Math.max(...tCek).toFixed(3) : null,
      tarayici_cekirdek_kosumlar: k.map((x) => (x.yuk ? x.yuk.tarayici_cekirdek : null)),
      yabanci_cekirdek_medyan: yCek.length ? +medyan(yCek).toFixed(3) : null,
      yabanci_cekirdek_kosumlar: k.map((x) => (x.yuk ? x.yuk.yabanci_cekirdek : null)),
      rig_cekirdek_medyan: medyan(k.map((x) => x.yuk && x.yuk.rig_cekirdek).filter((x) => typeof x === 'number')),
      en_agir: enAgirKosum ? enAgirKosum.yuk.en_agir : [],
      sistem_cekirdek_medyan: medyan(k.map((x) => x.sistem_cekirdek).filter((x) => x != null)),
      cekirdek: os.cpus().length, kapi_tarayici: TARAYICI_KAPI,
      _: 'KAPI tarayici_cekirdek. yabanci_cekirdek TOPLAM ve KAPI DEGIL — olculdu: 2,9 cekirdek saf CPU yuku hukmu cevirmedi.',
    };
    /* capraz kontrol: kosumun KENDI tabanindan cikan tik, o kosumun KENDI
       acilis tikinden %20+ ayriliyorsa bolen supheli. B'de tik her kosumda
       yeniden olculdugu icin kiyas kosum icindedir. */
    oz.tik_sapma = k.some((x) => x.taban.tik_p10 != null && x.tazeleme
      && Math.abs(x.taban.tik_p10 - x.tazeleme.tik_ms) / x.tazeleme.tik_ms > 0.20)
      ? k.map((x) => (x.taban.tik_p10 == null ? null : +x.taban.tik_p10.toFixed(3))) : false;
    oz.kapi = {
      kacirilan_kare: oz.kacirilan_medyan <= KACIRILAN_KAPI,
      takilma_tek: oz.takilma_tek_max <= TEK_TAKILMA_MS,
      tur_tam: oz.tur_tam,
    };
    /* UC DURUM — A ile ayni aile: HUKUMSUZ, KALDI DEGILDIR (iddia sayfa
       hakkinda degil OLCUM hakkindadir). */
    oz.hukumsuz = [];
    oz.kosum_hatalari = kosumHatalari;
    if (kosumHatalari.length) oz.hukumsuz.push('kosum_hatasi');
    if (oz.tik_sapma) oz.hukumsuz.push('tik_sapma');
    if (!oz.yuk.olculdu) oz.hukumsuz.push('yuk_olculemedi');
    else if (oz.yuk.tarayici_cekirdek_enyuksek > TARAYICI_KAPI) oz.hukumsuz.push('yabanci_tarayici');
    oz.gecti = oz.hukumsuz.length ? null : Object.values(oz.kapi).every(Boolean);
    oz.hedefte = oz.kacirilan_medyan <= KACIRILAN_HEDEF;   /* HEDEF — kapi degil */
    sonuc.push(oz);
    console.log(`${oz.gecti === null ? 'HUKSZ' : (oz.gecti ? 'GECTI' : 'KALDI')}${oz.gecti && !oz.hedefte ? '*' : ' '} ${yol.padEnd(38)} p95 ${k.map((x) => x.p95_ms).join('/')} → ${oz.p95_medyan} ms = ${oz.kare_p95_medyan.toFixed(2)} tik · KACIRILAN ${oz.kacirilan_kosumlar.join('/')} → ${oz.kacirilan_medyan}/${KACIRILAN_KAPI} · tek ${oz.takilma_tek_max}/${TEK_TAKILMA_MS} ms · taban ${oz.taban_takilma.join('/')}${oz.gecti === false ? '  !! ' + Object.entries(oz.kapi).filter(([, v]) => !v).map(([n]) => n).join(',') : ''}`);
    console.log(`       yabanci tarayici ${oz.yuk.tarayici_cekirdek_kosumlar.join('/')} → ${oz.yuk.tarayici_cekirdek_enyuksek}/${TARAYICI_KAPI} cekirdek [KAPI] · toplam yabanci ${oz.yuk.yabanci_cekirdek_medyan} · sistem ort. ${oz.yuk.sistem_cekirdek_medyan} (ikisi de BILGI)${oz.yuk.en_agir.length ? ' · en agir ' + oz.yuk.en_agir.slice(0, 3).map((s) => `${s.ad} ${s.cekirdek}`).join(', ') : ''}${oz.hukumsuz.length ? '  !! HUKUM YOK: ' + oz.hukumsuz.join(',') : ''}`);
    console.log(`       bilgi (kapi degil) takilma toplam ${oz.bilgi.takilma_toplam_kosumlar.join('/')} → ${oz.bilgi.takilma_toplam_medyan_ms} ms · ${oz.bilgi.takilma_sayi_medyan} takilma · tur ${(oz.bilgi.tur_ms_medyan / 1000).toFixed(2)} sn · oran %${(oz.bilgi.takilma_oran_medyan * 100).toFixed(2)}${oz.eski_oran_kapisi ? '' : `  (eski %${ORAN_ESKI_KAPI * 100} kapisini asardi)`}`);
  }
  const dagilim = {};
  for (const s of sonuc) dagilim[s.kacirilan_medyan] = (dagilim[s.kacirilan_medyan] || 0) + 1;
  /* IKI BIRIMDE SIRALAMA — her kosumda yeniden hesaplanir ki oranin turev
     oldugu gorunur kalsin. 5 Eyl'de bu iki sira BIRBIRININ TERSIYDI; birim
     tartismasi bir daha acilirsa kanit kayitta hazir dursun. */
  const sirala = (alan) => [...sonuc].sort((a, b) => b.bilgi[alan] - a.bilgi[alan]).map((s) => s.yol);
  const siralama = {
    mutlak_toplam_ms: sirala('takilma_toplam_medyan_ms'),
    oran: sirala('takilma_oran_medyan'),
    _: 'Ustteki MUTLAK sira ziyaretcinin hissettigi siradir; alttaki TUREV siradir. Ikisi ayrisiyorsa oranin paydasi (tur boyu) konusuyordur, sayfa degil.',
  };
  siralama.ayrisiyor = siralama.mutlak_toplam_ms[0] !== siralama.oran[0];
  /* UC DURUM, UC CIKIS KODU — A ile ayni: 0 gecti · 2 kaldi · 3 hukum yok. */
  const kalanlar = sonuc.filter((s) => s.gecti === false).map((s) => s.yol);
  const hukumsuzSayfa = sonuc.filter((s) => s.gecti === null);
  const ham = kalanlar.length ? `KALDI — ${kalanlar.join(', ')}`
    : hukumsuzSayfa.length ? `HUKUM YOK — ${hukumsuzSayfa.length} sayfa olculemedi (${[...new Set(hukumsuzSayfa.flatMap((s) => s.hukumsuz))].join(',')})`
      : 'GECTI';
  const hukum = KISMI ? `KISMI (${secim.length}/${VARSAYILAN.length} sayfa) — HUKUM DEGIL · ham: ${ham}` : ham;
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'yeni/film/olc-soguk.cjs — KAPI B SOGUK GIRIS: taze tarayici profili + sabit isinma dizisi + TEK sayfa. Kapi A (olc-sayfa.cjs) TARAMA kosulunu olcer ve gerileme kapisidir; bu ZIYARETCI kosulunu olcer. Iki kapinin rakamlari birbirinin yerine GECMEZ.',
    kapi: 'B — SOGUK GIRIS (ziyaretci kapisi)',
    isinma_dizisi: [
      'her olcum icin AYRI TARAYICI (taze gecici profil)',
      'about:blank acilir',
      'tazeleme olculur (200 rAF araligi, ilk 5 atilir)',
      '1500 ms bosta beklenir',
      'about:blank kapatilir',
      'olculecek sayfa acilir — SITE SAYFASI ISINMAYA GIRMEZ',
      '1200 ms + fare hareketi + taban 3 sn + tur (900 px/s gercek girdi)',
    ],
    olcum: new Date().toISOString(), tarayici: TARAYICI, tekrar: TEKRAR,
    boz: BOZ ? { ms: Number(process.env.BOZ_MS || 0) || 'tik x 2,4', _: 'KIRMIZI-ONCE kolu acikti: bu kayit olcum degil, duzenegin bozulmayi ayirt edebildiginin kanitidir' } : false,
    esik: {
      kacirilan_kare: KACIRILAN_KAPI, tek_takilma_ms: TEK_TAKILMA_MS,
      _: 'BLOKLAYICI OLAN HEPSI BU (+ tur tamligi). Ikisi de MUTLAK birim: tik ve ms. Enes, 5 Eyl — B\'nin ilk 27 soguk kosumunun dagilimindan turetildi. A\'nin esikleriyle ayni olmamasi TASARIM: A tarama, B ziyaretci kosulu.',
    },
    bilgi_kalemleri: {
      takilma_toplam_ms: 'MUTLAK — ziyaretcinin hissettigi. Kapi degil.',
      takilma_orani: 'TUREV — tur boyuna bagimli. Kapi degil.',
      oran_eski_kapi: ORAN_ESKI_KAPI,
      _: 'Enes, 5 Eyl 2026 gecesi — ORAN KAPIDAN DUSTU. Gerekce: kisa turda oran ornekleme hatasidir. 5 Eyl olcumu ters siralama gosterdi: /yeni/projeler/ 308 ms toplam takilmayla 3,37 sn turda %9,13 (KALIYORDU), /yeni/ 667 ms toplam takilmayla 12,0 sn turda %5,63 (GECIYORDU). Ziyaretcinin daha cok takildigi sayfa geciyordu. Bu bir gevsetme degil yanlis birimin duzeltilmesi — ayni hata kare kapisinda ms/tik olarak yapilmisti.',
    },
    hedef: { kacirilan_kare: KACIRILAN_HEDEF, _: 'HEDEF — KAPI DEGIL. Kayda gecer, hukmu etkilemez.' },
    sinyal: { takilma_esik_ms: TAKILMA_ESIK, _: 'Neyin takilma sayildigi kapi A ile BIREBIR ayni olmali — olc-esik.test.mjs sinar' },
    hukum, kismi: KISMI ? { olculen: secim.length, tum: VARSAYILAN.length, _: 'kismi kosum HUKUM DEGIL: B\'nin hukmu varsayilan dokuz sayfanin tamami kosuldugunda kurulur' } : false,
    hedefte_olmayan: sonuc.filter((s) => !s.hedefte).map((s) => s.yol),
    dagilim, siralama, sayfa: sonuc,
  }, null, 1));
  console.log('\nBILGI — TAKILMA SIRASI IKI BIRIMDE (hicbiri kapi degil):');
  console.log(`  mutlak (ms) : ${siralama.mutlak_toplam_ms.slice(0, 3).join('  >  ')}`);
  console.log(`  oran   (%)  : ${siralama.oran.slice(0, 3).join('  >  ')}`);
  if (siralama.ayrisiyor) console.log('  !! SIRALAR AYRISIYOR — orani okuyan payda konusuyor, sayfa degil.');
  console.log('\nDAGILIM (kacirilan kare medyani):');
  for (const k of Object.keys(dagilim).sort()) console.log(`  ${k} kare  x${dagilim[k]}`);
  const hedefsiz = sonuc.filter((s) => !s.hedefte).length;
  console.log(`\nHEDEF (kacirilan <= ${KACIRILAN_HEDEF}, KAPI DEGIL): ${sonuc.length - hedefsiz}/${sonuc.length} sayfa hedefte${hedefsiz ? ` · hedefte olmayan: ${sonuc.filter((s) => !s.hedefte).map((s) => s.yol).join(', ')}` : ''}`);
  bozTarayiciKapat();
  if (yuk) yuk.kapat();
  console.log(`\nHUKUM: ${hukum}\n→ ${CIKTI}`);
  if (KISMI) console.log(`!! KISMI KOSUM — ${secim.length}/${VARSAYILAN.length} sayfa. Bu cikti hukum degildir. Kapi icin varsayilan dokuz sayfayi koş.`);
  if (hukumsuzSayfa.length) {
    const agir = new Map();
    for (const s of hukumsuzSayfa) for (const p of s.yuk.en_agir) agir.set(p.ad, Math.max(agir.get(p.ad) || 0, p.cekirdek));
    console.log(`!! ${hukumsuzSayfa.length} sayfa HUKUMSUZ (${[...new Set(hukumsuzSayfa.flatMap((s) => s.hukumsuz))].join(',')}) — kaldi DEGIL, yeniden olculmeli.`);
    if (agir.size) console.log(`   en agir yabanci surecler: ${[...agir].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a, c]) => `${a} ${c}`).join(' · ')}`);
  }
  /* 0 = gecti · 2 = kaldi (gercek kirmizi) · 3 = hukum yok (yeniden olc) —
     A ile ayni uclu. 3'un 0 OLMAMASI sart: olculememis bir kosumu "gecti"
     saymak, bu turun kapattigi yanlis yesilin ta kendisidir. */
  /* KISMI kirmiziyi atfedemez, kapiyi dusurmez — istisna KOLLAR: orada
     kirmiziyi/hukumsuzlugu biz urettik, atif bizde ve kolun kendisi ancak
     cikis koduna dusunce kanit olur. */
  const BOZ_KOL = BOZ || !!BOZ_TIK || BOZ_TARAYICI;
  process.exit(KISMI && !BOZ_KOL ? 0 : (kalanlar.length ? 2 : hukumsuzSayfa.length ? 3 : 0));
})().catch((e) => { console.error(e); process.exit(1); });
