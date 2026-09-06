#!/usr/bin/env node
/* EK KAPI — BUTUN SAYFALAR (Enes, 4 Eyl 2026): "Site kasmiyor" hukmu ancak
   butun sayfalar olculunce kurulabilir. Her sayfa icin AYRI AYRI:
     1. p95'te KACIRILAN KARE <= 1 — UC KOSUM MEDYANI (TIK cinsinden, ms degil)
     2. kaydirma boyunca takilma: toplam <= turun %3'u · tek takilma <= 250 ms
     3. TABAN DAMGASI her olcumde (sayfa yuklu, kaydirmasiz 3 sn: ayni
        sinyal, ayni esik — olc-efekt ilkesi; kapi taban-goreceli DEGIL,
        talimattaki mutlak esikler; taban yalniz ortamin gurultusunu yazar)
     4. sayfa JS butcesi (J1'in olctugu ayni bayt: satir ici + src)
   Bir sayfa gecmiyorsa ADIYLA yazilir ve DURULUR (cikis kodu 2).

   KAPI TIK CINSINDEN (Enes, 4 Eyl 2026 — YENIDEN TANIM). Eski kapi "p95 <=
   20 ms" idi ve IKI KUSURU vardi: (1) p95 KUANTALI, ~tikin katlarina
   oturuyor — 8,5 / 16,7 / 25,0 — yani 20 ms iki tikle uc tik ARASINDA duran
   ikili bir kapiydi, arada deger yok; (2) degeri ekrana bagliydi: 120 Hz'de
   iki tik 16,7 ms (gecer), 60 Hz'de iki tik 33,3 ms (ayni site hic gecemez).
   Yeni kapi: p95'te KACIRILAN KARE = round(p95 / tik) - 1, kapi <= 1.
   TIK SABIT YAZILMAZ, HER KOSUMDA OLCULUR: tarayici acilisinda bos sayfada
   (about:blank) rAF araliklari toplanir, aykiri degerler atilir, medyan tik
   olur; Hz = 1000/tik. Kayitta `tazeleme` bloğu bunu yazar. Her sayfanin
   TABANINDAN da capraz kontrol cikar (taban.tik_p10); acilis tikiyle %20'den
   fazla ayrilirsa `tik_sapma` bayragi kalkar — ekran hizi kosum ortasinda
   degismis olabilir.
   TAKILMA ESIGI MS KALIYOR (50 ms, degistirilmedi): o perceptual bir esik,
   ekran hizindan bagimsiz olarak kullanicinin gordugu sicrama. Kayitta tik
   cinsinden karsiligi da yazilir ki tutarsizlik gorunur olsun.
   SINYAL: rAF araligi (ms). Takilma = ardisik iki rAF arasi > 50 ms;
   takilma suresi o aralik.
   Tur: sayfa basindan sonuna GERCEK girdi (Input.synthesizeScrollGesture,
   900 px/s, 600 px'lik adimlar) — evaluate(scrollTo) surucuyu kendi
   ritmine sokar (olc-zincir dersi). Kabuk efektleri (yildiz/imlec/damga)
   yuklu: boyama sonrasi 1,2 sn beklenir, fare bir kez oynatilir (imlec
   dongusu kurulsun). Film/deneme-react sayfalari ATLANIR: filmin kendi
   kapanis tablosu var, deneme gecici.
   UC DURUM VAR, IKI DEGIL (6 Eyl 2026): GECTI · KALDI · HUKUM YOK.
   Ucuncusu bu turda dogdu, cunku iki kusur ayni kokten geliyordu — arac
   OLCUMUN KENDISI hakkindaki suphesini HUKME cevirmeye calisiyordu:
     1. MAKINE YUKU HIC KAYDEDILMIYORDU. CLAUDE.md "olc-sayfa kirmizisi
        makine yuku yazilmadan da hukum degildir" diyor; kural belgede
        vardi, ALETTE YOKTU. 6 Eyl'de saatler tam bu yuzden yanlis kirmiziya
        gitti (yayindaki agac da ayni kirmiziyi veriyordu: gerileme yok,
        kaynak yuk). Artik her sayfa icin surec basina cekirdek-saniye
        olculur ve kayda gecer.
        KAPI, OLCULEREK, TOPLAM CPU DEGIL YABANCI TARAYICI OLDU. Ilk yazimda
        kapi toplam cekirdege konmustu; doz-tepki taramasi onu curuttu
        (2,9 cekirdek saf CPU yuku hukmu kipirdatmadi, ayni yuk iki kez zit
        sonuc verdi), animasyonlu bir yabanci Chrome ise p95'i 8,5'ten
        33,4 ms'ye tasidi — 6 Eyl'in yanlis kirmizisinin rakami birebir.
        Ayrinti ve tablo: TARAYICI_KAPI'nin kunyesi, asagida.
     2. `tik_sapma` BAYRAKTI, KAPI DEGILDI. Arac "acilis tiki 8,3 ms ama bu
        sayfanin kendi tabani 16,3 ms" diye yaziyor, sonra hukmu YINE 8,3'e
        bolerek veriyordu. Gecersiz bolenle verilen hukum hem yanlis kirmizi
        hem yanlis yesil uretir. Artik `kismi` gibi davranir: hukum yok.
   HUKUMSUZ, KALDI DEGILDIR: "kaldi" sayfa hakkinda bir iddiadir, "hukumsuz"
   olcum hakkindadir. Cikis kodu ayri (3), cunku 0 dondurmek olculememis bir
   taramayi "gecti" saymak olurdu — bu turun kapattigi yanlis yesil tam odur.
   NE OLCULMEDI, DURUSTCE: 6 Eyl tam taramasi (61/61 GECTI) "sessiz makine"
   diye kaydedildi ama YUK YAZILMADI — o taramanin sirasinda yabanci bir
   tarayici olup olmadigi bilinmiyor ve GERIYE DONUK OGRENILEMEZ. Bu turdan
   sonraki ilk tam tarama, yuku yazan ilk taramadir.

   Kullanim: node yeni/film/olc-sayfa.cjs   (once: node yerel-sun.cjs)
   Cevre  : TEKRAR=3 · SAYFA=/yeni/otomasyon/ (tek sayfa) · TARAYICI=brave
            TARAYICI_KAPI=0.15 (yabanci tarayici cekirdegi)
            BOZ_TIK=<ms> · BOZ_TARAYICI=1 · BOZ_YUK=<cekirdek>
   Yan arac: olc-yuk-tarama.cjs — TARAYICI_KAPI'nin doz-tepki dayanagi
   KIRMIZI-ONCE: BOZ=1 olculen sayfaya, TABANDAN SONRA, her karede ~2,4 tik
   yakan bir dongu enjekte eder; BOZ_MS=<ms> ile yakma suresi verilebilir.
   Kural KIRMIZI yanmalidir; yanmiyorsa duzenegin yesili anlamsizdir.
   4 Eyl 2026'da 120,5 Hz'de olculen iki kol (/hizmetler/geo/, tek kosum):
     BOZ=1     (yakma 19,9 ms) p95 41,6 ms = 5,01 tik -> KACIRILAN 4 · KALDI
     BOZ_MS=8  (yakma  8,0 ms) p95 25,0 ms = 3,01 tik -> KACIRILAN 2 · KALDI
   Ikincisi SINIR kolu: eski "25 ms bandi" yeni tanimla da kirmizidir.
   Taban BILEREK temiz birakilir (yakma tabandan sonra girer): kirmizi
   yalnizca tik kuralindan gelsin, taban gurultusunden degil. */
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
const CIKTI = path.join(__dirname, process.env.CIKTI || 'olc-sayfa.json');
const TEKRAR = Number(process.env.TEKRAR || 3);
const KACIRILAN_KAPI = Number(process.env.KACIRILAN_KAPI || 1);   /* p95'te kacirilan kare */
const P95_ESKI_MS = 20;                    /* KAPI DEGIL: eski ms esigi, kayitta kiyas icin */
const TAKILMA_ESIK = 50, TEK_TAKILMA_MS = 250, TOPLAM_ORAN = 0.03;
const BOZ = process.env.BOZ === '1' || !!process.env.BOZ_MS;      /* kirmizi-once kolu */
const TAVAN = { ana: 12.5 * 1024, film: 11 * 1024, obur: 10 * 1024 };
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
   kayittan gorunur. */
const YABANCI_TARAYICILAR = new Set(['chrome.exe', 'msedge.exe', 'brave.exe', 'firefox.exe', 'opera.exe', 'vivaldi.exe', 'iexplore.exe', 'thorium.exe', 'yandex.exe']);
/* KIRMIZI-ONCE, HER YENI KURAL ICIN BIR KOL:
   BOZ_TIK=<ms>   acilis tikini kaydirir       -> tik_sapma + ekran_degisti
   BOZ_TARAYICI=1 yabanci tarayici acar        -> yabanci_tarayici kapisi
   BOZ_YUK=<cek.> saf CPU yakar (GPU'ya dokunmaz) -> KAPI DEGIL: bu kolun isi
                  kapiyi yakmak degil, toplam CPU'nun kapi OLMADIGINI
                  gosteren egriyi uretmektir (olc-yuk-tarama.cjs onu kullanir) */
const BOZ_TIK = Number(process.env.BOZ_TIK || 0);
const BOZ_YUK = Number(process.env.BOZ_YUK || 0);
const BOZ_TARAYICI = process.env.BOZ_TARAYICI === '1';

const bekle = (ms) => new Promise((r) => setTimeout(r, ms));
const medyan = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : null; };
const p95 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * 0.95))] : null; };
/* p10 — tazeleme capraz kontrolu icin: tabanda gorulen en kisa MAKUL aralik.
   min DEGIL: rAF nadiren iki kez ust uste atesleyip sahte kisa aralik uretir,
   p10 buna dayaniklidir. */
const p10 = (a) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length * 0.10)] : null; };

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

/* YUK TABANI — TARAYICI ACIK, BOS SAYFA, KAYDIRMA YOK.
   Neden gerekli: yabanci yukun bir kismini BIZ URETIYORUZ. Duzenek gorunur
   bir pencerede kosuyor; tarayici 120 Hz boyadikca masaustu kompozitoru
   (dwm.exe) ve cekirdek (System) calisiyor, ikisi de bizim surec agacimizin
   DISINDA. 6 Eyl olcumu: tarayici kapaliyken dwm.exe 0,007 cekirdek,
   tarayici kaydirirken 0,241 — otuz kattan fazla, ve tamami bizim isimiz.
   Bu yuzden her kosum "taban + sayfa" olarak okunur: kapiyi asan yukun
   duzenekten mi disaridan mi geldigi ancak taban yazilirsa ayrilir. */
async function yukTabanOlc(browser, yuk, kokler) {
  if (!yuk) return null;
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('about:blank');
  await page.bringToFront();
  await bekle(500);
  const a = await yuk.ornek();
  await bekle(4000);
  const b = await yuk.ornek();
  await page.close();
  return yukFark(a, b, kokler);
}

/* EKRAN TAZELEME OLCUMU — TIK SABIT YAZILMAZ, HER KOSUMDA OLCULUR.
   Bos sayfada (site isi yok, kacirilacak kare yok) rAF araliklari toplanir;
   medyanin %50-150 bandi disi atilir — kacirilmis kare UZUN, cift atesleme
   KISA aralik uretir — kalanin medyani TIK olur. Hz = 1000/tik. */
async function tazelemeOlc(browser) {
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
  await page.close();
  const ham = ara.slice(5);                                  /* ilk kareler isinma */
  const m0 = medyan(ham);
  const suz = ham.filter((x) => x > m0 * 0.5 && x < m0 * 1.5);
  const tik = +medyan(suz).toFixed(3);
  const sirali = [...ham].sort((a, b) => a - b);
  return {
    tik_ms: tik, hz: +(1000 / tik).toFixed(1),
    ornek: ham.length, suzulen: ham.length - suz.length,
    min: sirali[0], p10: p10(ham), p90: sirali[Math.floor(ham.length * 0.9)],
    kararli: suz.length >= ham.length * 0.8,
  };
}

/* sayfa listesi dist'ten (film + deneme haric) */
const sayfalar = [];
(function gez(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/^(_astro|font|img|varlik|film|deneme-react)$/.test(e.name)) gez(p); }
    else if (e.name === 'index.html') sayfalar.push('/' + path.relative(DIST, p).replace(/\\/g, '/').replace(/index\.html$/, ''));
  }
})(DIST);
/* FILTRE=regex: sayfa alt kumesi (10 dakikalik parcalar halinde kosmak icin) · CIKTI=dosya adi */
const secim = process.env.SAYFA ? [process.env.SAYFA] : sayfalar.sort().filter((y) => !process.env.FILTRE || new RegExp(process.env.FILTRE).test(y));
/* KISMI KOSUM HUKUM DEGILDIR (4 Eyl 2026 — olculdu, asagida). Ayni sayfa,
   ayni makine, ayni agac: /hizmetler/finans/ TAM TARAMA icinde 16,7 ms
   (2,01 tik · kacirilan 1 · GECER), tek basina ya da uc sayfalik kesitte
   24,9-25,0 ms (3,01 tik · kacirilan 2 · KALIR). Uc kez ayri ayri olculdu,
   yuk yok, taban 0/0/0, BOZ kapali. Tarayici kendinden onceki sayfalarin
   isinmasindan faydalaniyor; TEKRAR=3 bunu KAPATMIYOR (ayni sayfayi ucuncu
   kez yuklemek yetmiyor, fayda BASKA sayfalardan geliyor). Bu yuzden kismi
   kosumun ciktisi hukum diye etiketlenmez: `kismi: true` yazilir, hukmun
   basina KISMI konur ve cikis kodu 0 olur — kirmizi bile olsa kapiyi
   dusurmez, cunku o kirmizinin sayfadan mi kosum boyundan mi geldigi
   ayrilamaz. Tam tarama (59 sayfa) tek kanonik hukumdur. */
const KISMI = secim.length < sayfalar.length;

/* J1 ile ayni bayt sayimi (denetim.cjs). IKI KALEM J1 ILE AYNI SEBEPLE
   DISARIDA (Enes onayi, 3/4 Eyl gece zinciri — "prologlu butce tavanlari
   onaylandi, sarti her tavanin gerekcesi rakamiyla dosyada dursun"):
     · LEAD FORMU BETIGI (~2,3 KB): kaynakta da her rotanin sonundaydi,
       kabuk kalemi — sayfa tavanindan dusulur, ayrica raporlanir.
     · PROLOG: ana sayfa film bolumunu tasiyorsa tavan ana + film
       (12,5 + 11 = 23,5 KB); filmin kendi kapilari ayri (FM1). */
function jsBayt(yol) {
  const f = path.join(DIST, yol.replace(/\?.*$/, '').replace(/^\/(?:yeni\/)?/, ''), 'index.html');
  const h = fs.readFileSync(f, 'utf8');
  let t = 0;
  for (const m of h.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*>/g)) { const d = path.join(DIST, m[1].replace(/^\/(?:yeni\/)?/, '')); if (fs.existsSync(d)) t += fs.statSync(d).size; }
  for (const m of h.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) if (!/ld\+json/.test(m[1]) && !/getElementById\('silForm'\)/.test(m[2])) t += Buffer.byteLength(m[2]);
  return t;
}
/* prologlu ana sayfa: film bolumu ham HTML'de mi */
const prologlu = (yol) => {
  const f = path.join(DIST, yol.replace(/\?.*$/, '').replace(/^\/(?:yeni\/)?/, ''), 'index.html');
  return fs.existsSync(f) && /<section class="fl"/.test(fs.readFileSync(f, 'utf8'));
};
const tavan = (yol) => (/^\/(en\/)?$/.test(yol.replace(/\?.*$/, ''))
  ? TAVAN.ana + (prologlu(yol) ? TAVAN.film : 0)
  : /film/.test(yol) ? TAVAN.film : TAVAN.obur);

const KAYITCI = `(() => {
  window.__k = { ara: [], on: false, son: null };
  const f = (t) => { if (__k.son !== null && __k.on) __k.ara.push(+(t - __k.son).toFixed(2)); __k.son = t; requestAnimationFrame(f); };
  requestAnimationFrame(f);
  window.__kBasla = () => { __k.ara.length = 0; __k.on = true; };
  window.__kBitir = () => { __k.on = false; return __k.ara.slice(); };
})()`;

async function kosum(browser, yol, tik, yuk, kokler) {
  /* YUK PENCERESI olculen pencereyi SARAR ve ornekleme onun DISINDA kalir:
     ornek alinirken powershell CPU yiyor, o maliyet olculen karelere
     karismamali (ve zaten `kokler` ile yabanci sayilmaz). */
  const yBas = yuk ? await yuk.ornek() : null;
  const cBas = cpuKap();
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const cdp = await page.target().createCDPSession();
  /* PROLOG ATLANMIS OTURUM (3/4 Eyl 2026): ana sayfanin onunde artik film
     var; motor klipleri surekli cektigi icin `networkidle0` HIC gelmiyor ve
     kapi zaman asimina dusuyordu. Bu kapi SITE GOVDESINI olcer — filmin
     kendi kapilari ayri (FM1 bellek/ilk kare/sinir, olc-devir, olc-efekt) ve
     /film sayfasi zaten atlaniyor. Oturum bayragi konunca ana sayfa, prologu
     bir kez gormus ziyaretcinin gordugu sayfadir. Perde bayragi da ayni
     sebeple (kapi kaydirma turunu olcer, acilis selamini degil). */
  await page.evaluateOnNewDocument(() => {
    try {
      sessionStorage.setItem('qanat-splash-seen', '1');
      sessionStorage.setItem('qanat-prolog-atlandi', '1');
    } catch (e) {}
  });
  await page.goto(SUNUCU + yol, { waitUntil: 'networkidle0', timeout: 60000 });
  /* GIZLE=secici — TESHIS KOLU: bolum gizlenip ayni tur olculur (pay atfi) */
  if (process.env.GIZLE) await page.addStyleTag({ content: `${process.env.GIZLE}{display:none!important}` });
  await page.evaluate(KAYITCI);
  await page.bringToFront();
  await page.mouse.move(720, 450);
  await bekle(1200);                                 /* kabuk efektleri kurulsun (bosta ithal) */
  /* taban: kaydirmasiz 3 sn */
  await page.evaluate(() => __kBasla());
  await bekle(3000);
  const tabanAra = await page.evaluate(() => __kBitir());
  const tabanTak = tabanAra.filter((a) => a > TAKILMA_ESIK);
  /* KIRMIZI-ONCE (BOZ): TABANDAN SONRA enjekte edilir — kirmizi yalnizca tik
     kuralindan gelsin, taban gurultusunden degil. Her karede ~2,4 tik yakan
     bir dongu: sayfa IKI kare kacirmaya baslar, kural kirmizi yanmalidir. */
  if (BOZ) {
    /* YAKMA, SINANAN KAPIYA GORE OLCEKLENIR (5 Eyl dersi): sabit yakma kapi
       degisince sinirda kalir. Kapi <=N ise yakma (N+1,4) tik — hukum esigin
       BIR USTUNE dusmeli. A'da N=1 -> 2,4 tik (eski deger, kanit korunur). */
    const bozMs = Number(process.env.BOZ_MS || (tik * (KACIRILAN_KAPI + 1.4)).toFixed(1));
    await page.evaluate((ms) => {
      window.__bozDur = false;
      const yak = (s) => { const t0 = performance.now(); while (performance.now() - t0 < s) { /* mesgul bekle */ } };
      const g = () => { if (window.__bozDur) return; yak(ms); requestAnimationFrame(g); };
      requestAnimationFrame(g);
    }, bozMs);
  }
  /* tur: gercek girdi, 900 px/s */
  /* PAYDA HER ADIMDA TAZELENIR (4 Eyl 2026, olculdu). Sayfa yuksekligi tur
     boyunca DEGISIR: ana sayfada scrollHeight 12.256 -> 10.480 px dusuyor
     (content-visibility bolumleri gorunume girince tahmini boyu birakip
     gercek boyuna oturuyor). Payda bir kez alinirsa tur dibe ULASSA BILE
     kayda "%84,4 gezildi" diye yazilir — bayat payda. Kanit: probda tur
     y=9580'de bitti, o andaki max 9580, zorla scrollTo(dip) 0 px fark verdi. */
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
    if (d.y <= y) break;                             /* ilerlemiyorsa cik */
    y = d.y;
    if (performance.now() - t0 > 90000) { zamanAsimi = true; break; }
  }
  /* TUR TAMLIGI KAPI SARTIDIR: sayfayi gezmeyen kosum o sayfayi belgeleyemez */
  const turTam = !zamanAsimi && y >= toplamPx - 4;
  await bekle(300);
  const ara = await page.evaluate(() => __kBitir());
  await page.close();
  const ySon = yuk ? await yuk.ornek() : null;
  const cSon = cpuKap();
  const turMs = ara.reduce((a, b) => a + b, 0);
  const tak = ara.filter((a) => a > TAKILMA_ESIK);
  return {
    yuk: yukFark(yBas, ySon, kokler), sistem_cekirdek: cpuFark(cBas, cSon),
    kare: ara.length, tur_ms: Math.round(turMs), p95_ms: p95(ara), medyan_ms: medyan(ara),
    takilma_sayi: tak.length, takilma_toplam_ms: Math.round(tak.reduce((a, b) => a + b, 0)), takilma_tek_max_ms: tak.length ? Math.round(Math.max(...tak)) : 0,
    taban: { sure_ms: Math.round(tabanAra.reduce((a, b) => a + b, 0)), takilma_sayi: tabanTak.length, p95_ms: p95(tabanAra), tik_p10: p10(tabanAra) },
    scroll_px: y, toplam_px: toplamPx, toplam_px_bas: toplamPxBas, tur_tam: turTam,
  };
}

(async () => {
  const browser = await pt.launch({
    executablePath: TARAYICILAR[TARAYICI] || TARAYICI, headless: false,
    args: ['--window-size=1460,980', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling'],
    defaultViewport: null, protocolTimeout: 600000,
  });
  const surum = await browser.version();
  const tz = await tazelemeOlc(browser);
  /* BOZ_TIK: acilis tikini bilerek kaydirir. Sayfanin kendi tabanindan cikan
     tik degismedigi icin capraz kontrol %20'yi asar ve HER sayfa hukumsuz
     olmali — tik_sapma kuralinin kirmizi-once kolu budur. */
  if (BOZ_TIK) { tz.boz_tik_oncesi = tz.tik_ms; tz.tik_ms = BOZ_TIK; tz.hz = +(1000 / BOZ_TIK).toFixed(1); }
  /* YUK OLCEYICI — ilk sorgu PowerShell acilisini da tasir (1-2 sn), tarama
     baslamadan isitilir ki kosum pencerelerine binmesin. */
  const yuk = yukAc();
  if (yuk) await yuk.ornek();
  /* BOZ_YUK=<cekirdek>: bilinen buyuklukte YABANCI yuk uretir (kesirli olur,
     0.5 = yarim cekirdek). Iki tuzak vardi, ikisi de olculerek gorulduu:
     1. `detached: true` sureci agactan CIKARMAZ — Windows'ta yeni surec
        grubu acar ama ppid yine bizim node'umuzdur, `yukSoy` onu BIZIM sayar
        ve kol hic yanmaz (kirmizi-once kolunun sessizce yesil kalmasi).
        Cozum: `cmd /c start` ile dogurmak — cmd hemen olur, yakici surecin
        ppid'si olu bir pid'e bakar ve agacimizda gorunmez.
     2. Pid'leri elimizde kalmadigi icin sonda komut satirindaki DAMGADAN
        bulunup oldurulurler; yoksa yakicilar makinede kalir ve bir sonraki
        olcumu bozar (yani duzenek bir dahaki turun yukunu kendisi uretir). */
  const BOZ_DAMGA = 'QANAT_BOZ_YUK';
  if (BOZ_YUK) {
    const n = Math.max(1, Math.ceil(BOZ_YUK));
    const oran = BOZ_YUK / n;                        /* surec basina gorev dongusu */
    const betik = `/*${BOZ_DAMGA}*/const o=${oran};const s=()=>{const t=Date.now();while(Date.now()-t<20*o){Math.sqrt(Math.random());}setTimeout(s,20*(1-o)||0);};s();setTimeout(()=>process.exit(0),1800000);`;
    for (let i = 0; i < n; i++)
      spawn('cmd', ['/c', 'start', '/b', '', process.execPath, '-e', betik], { detached: true, stdio: 'ignore' }).unref();
    await bekle(2000);
  }
  /* BOZ_TARAYICI: yabanci tarayici kapisinin kirmizi-once kolu. OLCTUGUMUZ
     TARAYICININ OTEKISI acilir (ayni ikiliyi ikinci kez baslatmak cogu
     zaman var olan pencereye sekme ekler ve YENI SUREC DOGMAZ — kol sessizce
     yanmazdi). Sayfa gecici bir dosyaya yazilir: ust duzey `data:` gezinmesi
     Chrome'da engelli, betik hic kosmazdi. */
  const bozTarayiciYol = path.join(os.tmpdir(), 'qanat-boz-tarayici.html');
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
  const bozYukOldur = () => {
    if (!BOZ_YUK) return;
    try {
      require('child_process').execFileSync('powershell', ['-NoProfile', '-NonInteractive', '-Command',
        `Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -like '*${BOZ_DAMGA}*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }`],
      { stdio: 'ignore', timeout: 30000 });
    } catch (e) {}
  };
  const kokler = [process.pid, browser.process() ? browser.process().pid : NaN];
  const yukTaban = await yukTabanOlc(browser, yuk, kokler);
  console.log(`TARAYICI : ${TARAYICI} · ${surum} · ${secim.length} sayfa · ${TEKRAR} kosum · ${os.cpus().length} cekirdek`);
  console.log(`TAZELEME : ${tz.hz} Hz · tik ${tz.tik_ms} ms · ornek ${tz.ornek} (suzulen ${tz.suzulen}) · min ${tz.min} p10 ${tz.p10} p90 ${tz.p90}${tz.kararli ? '' : ' !! KARARSIZ'}${BOZ_TIK ? `  [BOZ_TIK: gercek tik ${tz.boz_tik_oncesi} ms]` : ''}`);
  console.log(`YUK      : YABANCI TARAYICI <= ${TARAYICI_KAPI} cekirdek — ASILIRSA O SAYFA HUKUMSUZDUR (kirmizi de yesil de). Toplam CPU KAPI DEGIL, bilgi.${yuk ? '' : '  !! OLCEYICI ACILAMADI — hicbir sayfa hukum vermeyecek'}${BOZ_YUK ? `  [BOZ_YUK=${BOZ_YUK} egri kolu]` : ''}${BOZ_TARAYICI ? '  [BOZ_TARAYICI KIRMIZI-ONCE]' : ''}`);
  console.log(`YUK TABAN: ${yukTaban ? `${yukTaban.yabanci_cekirdek} yabanci + ${yukTaban.rig_cekirdek} rig (dwm) cekirdek — tarayici acik, bos sayfa, ${yukTaban.pencere_sn} sn · ${yukTaban.en_agir.slice(0, 4).map((s) => `${s.ad} ${s.cekirdek}`).join(', ')}` : 'OLCULEMEDI'}`);
  if (yukTaban && yukTaban.tarayici_cekirdek > TARAYICI_KAPI)
    console.log(`   !! TABANDA YABANCI TARAYICI VAR (${yukTaban.tarayici_cekirdek} cekirdek) — tarama daha baslamadan kirli. Oteki tarayiciyi kapat; bu kosumdan hukum cikmayacak.`);
  /* 4 Eyl 2026 (Enes): takilma ORANI KAPI DEGIL, BILGI. Kodda zaten
     `oz.bilgi`deydi ve `oz.kapi`ye hic girmiyordu — ama bu satir onu kapi
     diye ILAN EDIYORDU. Arac kendi olcutunu yanlis anlatirsa kayit da
     yanlis okunur: 4 Eyl'de `/en/sss/` "oran %3,52" yuzunden kirmizi
     sanildi, oysa kapiyi hic asmamisti. Gerekce Kapi B'deki ile ayni
     (kapi birimi MUTLAK olmali, oran turevdir; paydasi tur boyu ve tur
     boyu sayfadan sayfaya degisiyor). */
  console.log(`KAPI     : p95'te kacirilan kare <= ${KACIRILAN_KAPI} (yani p95 <= ${((KACIRILAN_KAPI + 1) * tz.tik_ms).toFixed(1)} ms bu ekranda) · tek takilma <= ${TEK_TAKILMA_MS} ms · JS tavani · tur tamligi${BOZ ? '  [BOZ=1 KIRMIZI-ONCE]' : ''}`);
  console.log(`BILGI    : takilma toplam orani (esik %${TOPLAM_ORAN * 100} KAPI DEGIL, kiyas icin yazilir)`);
  const sonuc = [];
  let dur = null, durSebep = null;
  for (const yol of secim) {
    const k = [];
    for (let i = 0; i < TEKRAR; i++) k.push(await kosum(browser, yol, tz.tik_ms, yuk, kokler));
    const js = jsBayt(yol), tv = tavan(yol);
    const oz = {
      yol, js_bayt: js, js_tavan: tv, kosum: k,
      p95_medyan: medyan(k.map((x) => x.p95_ms)),
      takilma_oran_medyan: +medyan(k.map((x) => x.tur_ms ? x.takilma_toplam_ms / x.tur_ms : 0)).toFixed(4),
      takilma_tek_max: Math.max(...k.map((x) => x.takilma_tek_max_ms)),
      taban_takilma: k.map((x) => x.taban.takilma_sayi),
    };
    /* TIK CINSINDEN HUKUM. kacirilan kare = round(p95 / tik) - 1: bir kare
       her zaman bir tik surer, kapi USTUNE kac tik bindigini sorar. */
    oz.kare_p95 = +(oz.p95_medyan / tz.tik_ms).toFixed(3);
    oz.kacirilan_kare = Math.max(0, Math.round(oz.kare_p95) - 1);
    /* kuantadan sapma: p95 tikin tam katina oturmuyorsa yazilir (kapi degil,
       gorunurluk — kuantali olmayan bir dagilim baska bir seyin isaretidir) */
    oz.kuanta_sapma = +Math.abs(oz.kare_p95 - Math.round(oz.kare_p95)).toFixed(3);
    oz.p95_eski_ms_kapisi = oz.p95_medyan <= P95_ESKI_MS;      /* KAPI DEGIL: kiyas */
    /* CAPRAZ KONTROL — sayfanin kendi tabanindan cikan tik (dinlenmedeki en
       kisa makul aralik) acilis tikinden %20'den fazla ayriliyor mu.
       NE OLCTUGU DURUSTCE: bu bayrak IKI sebebi ayirmaz — ekran hizi
       degismis de olabilir, makine/sayfa 120 Hz'e yetisemiyor da olabilir.
       Ayirmayi `ekran_degisti` (kapanista bos sayfada tik yeniden olculur)
       ve yuk satiri yapar; bu bayrak yalnizca "bolen supheli" der.
       KAPI OLMASI OLCULEREK GUVENLI BULUNDU: 6 Eyl tam taramasinda (61 sayfa,
       183 kosum, hukum GECTI) taban tik_p10'un TAMAMI 8,1-8,3 ms bandindaydi,
       tek bir sayfa bile bayragi yakmadi. Yani sitede kendi tabanini bir tikin
       ustune cikaran sayfa YOK; kapiya cevirmek gercek bir kirmiziyi
       hukumsuze cevirmiyor. Boyle bir sayfa dogarsa bayrak yanar ve kural o
       gun yeniden tartisilir — kaydin bunu gostermesi icin taban tik_p10
       her kosumda zaten yaziliyor. */
    const tikCapraz = medyan(k.map((x) => x.taban.tik_p10).filter((x) => x != null));
    oz.tik_sapma = (tikCapraz != null && Math.abs(tikCapraz - tz.tik_ms) / tz.tik_ms > 0.20) ? +tikCapraz.toFixed(3) : false;
    oz.tur_tam = k.every((x) => x.tur_tam);
    /* MAKINE YUKU — HER SAYFA ICIN YAZILIR (doktrin: yazilmadan hukum yok).
       Medyan alinir cunku hukum de uc kosumun medyanindan cikiyor; en agir
       kosumun sureç dokumu ayrica tasinir, cunku eyleme donusen bilgi odur
       ("MsMpEng 5,0 cekirdek" -> kapat, yeniden olc). */
    const yCek = k.map((x) => x.yuk && x.yuk.yabanci_cekirdek).filter((x) => typeof x === 'number');
    const tCek = k.map((x) => x.yuk && x.yuk.tarayici_cekirdek).filter((x) => typeof x === 'number');
    const enAgirKosum = k.filter((x) => x.yuk).sort((a, b) => b.yuk.yabanci_cekirdek - a.yuk.yabanci_cekirdek)[0];
    oz.yuk = {
      olculdu: yCek.length === k.length,
      /* KAPI: yabanci tarayici. MEDYAN DEGIL EN YUKSEK kosum alinir — yuk
         kesikli gelir (bir sekmede video baslar, biter) ve uc kosumdan
         birinde bulunan bir tarayici o kosumu zaten kirletmistir; medyan
         onu ortalar ve gizler. */
      tarayici_cekirdek_enyuksek: tCek.length ? +Math.max(...tCek).toFixed(3) : null,
      tarayici_cekirdek_kosumlar: k.map((x) => (x.yuk ? x.yuk.tarayici_cekirdek : null)),
      /* BILGI (kapi degil — ~3 cekirdege kadar saf CPU yuku hukmu cevirmedi,
         kunyedeki doz-tepki tablosuna bak) */
      yabanci_cekirdek_medyan: yCek.length ? +medyan(yCek).toFixed(3) : null,
      yabanci_cekirdek_kosumlar: k.map((x) => (x.yuk ? x.yuk.yabanci_cekirdek : null)),
      rig_cekirdek_medyan: medyan(k.map((x) => x.yuk && x.yuk.rig_cekirdek).filter((x) => typeof x === 'number')),
      en_agir: enAgirKosum ? enAgirKosum.yuk.en_agir : [],
      sistem_cekirdek_medyan: medyan(k.map((x) => x.sistem_cekirdek).filter((x) => x != null)),
      cekirdek: os.cpus().length, kapi_tarayici: TARAYICI_KAPI,
      _: 'KAPI tarayici_cekirdek (yabanci tarayici sinifi). yabanci_cekirdek TOPLAM ve KAPI DEGIL: 2,9 cekirdek saf CPU yuku hukmu cevirmedi, 0,8 cekirdek yabanci tarayici cevirdi. sistem_cekirdek ORTALAMADIR ve tek cekirdek yiyen sureci gizler.',
    };
    oz.bilgi = { takilma_oran_medyan: oz.takilma_oran_medyan, sistem_cekirdek_medyan: oz.yuk.sistem_cekirdek_medyan };
    oz.kapi = {
      kacirilan_kare: oz.kacirilan_kare <= KACIRILAN_KAPI, takilma_tek: oz.takilma_tek_max <= TEK_TAKILMA_MS,
      js: js <= tv, tur_tam: oz.tur_tam,
    };
    /* HUKUMSUZ != KALDI. Ikisini ayirmak bu turun butun mesele­sidir:
       "kaldi" sayfa hakkinda bir iddiadir, "hukumsuz" OLCUMUN kendisi
       hakkindadir. Kismi kosum bekcisiyle ayni aile — orada da cikti
       kirmizi bile olsa kapiyi dusurmez, cunku atfedilemez.
       IKI SEBEP:
       a) tik_sapma — hukum p95'i acilis tikine bolerek veriliyor; sayfanin
          kendi tabanindan cikan tik ondan %20+ ayriliyorsa BOLEN gecersiz,
          ve gecersiz bolenle hem yanlis kirmizi hem yanlis yesil uretilir.
          (Once yalnizca bayrak olarak yaziliyordu, hukum yine de veriliyordu.)
       b) yabanci_tarayici — olcum sirasinda baska bir tarayici calisiyordu.
          YESILI DE DUSURUR: "yuk altinda yesilse a fortiori yesildir" makul
          bir akil yurutmedir ama OLCUM DEGILDIR — ve zaten bugun olculdu ki
          yukun yonu her zaman ayni degil (ayni CPU yuku iki kez zit sonuc
          verdi). Kural, olculmemis bir yonu hukme cevirmez. */
    oz.hukumsuz = [];
    if (oz.tik_sapma) oz.hukumsuz.push('tik_sapma');
    if (!oz.yuk.olculdu) oz.hukumsuz.push('yuk_olculemedi');
    else if (oz.yuk.tarayici_cekirdek_enyuksek > TARAYICI_KAPI) oz.hukumsuz.push('yabanci_tarayici');
    oz.gecti = oz.hukumsuz.length ? null : Object.values(oz.kapi).every(Boolean);
    sonuc.push(oz);
    const etiket = oz.gecti === null ? 'HUKSZ' : (oz.gecti ? 'GECTI' : 'KALDI');
    console.log(`${etiket}  ${yol.padEnd(34)} p95 ${k.map((x) => x.p95_ms).join('/')} → ${oz.p95_medyan} ms = ${oz.kare_p95.toFixed(2)} tik → KACIRILAN ${oz.kacirilan_kare}/${KACIRILAN_KAPI} · takilma ${k.map((x) => x.takilma_sayi + 'x' + x.takilma_toplam_ms + 'ms').join(' ')} oran ${(oz.takilma_oran_medyan * 100).toFixed(2)}% tek ${oz.takilma_tek_max} ms · taban ${oz.taban_takilma.join('/')} · JS ${js}/${tv}${oz.kuanta_sapma > 0.25 ? ' · kuanta sapma ' + oz.kuanta_sapma : ''}${oz.tik_sapma ? ' · TIK SAPMA taban ' + oz.tik_sapma : ''}${oz.gecti === false ? ' !! ' + Object.entries(oz.kapi).filter(([, v]) => !v).map(([n]) => n).join(',') : ''}`);
    console.log(`       yabanci tarayici ${oz.yuk.tarayici_cekirdek_kosumlar.join('/')} → ${oz.yuk.tarayici_cekirdek_enyuksek}/${TARAYICI_KAPI} cekirdek [KAPI] · toplam yabanci ${oz.yuk.yabanci_cekirdek_medyan} · sistem ort. ${oz.yuk.sistem_cekirdek_medyan} (ikisi de BILGI)${oz.yuk.en_agir.length ? ' · en agir ' + oz.yuk.en_agir.slice(0, 3).map((s) => `${s.ad} ${s.cekirdek}`).join(', ') : ''}${oz.hukumsuz.length ? '  !! HUKUM YOK: ' + oz.hukumsuz.join(',') : ''}`);
    if (oz.gecti !== true && process.env.DEVAM !== '1') { dur = yol; durSebep = oz.hukumsuz.length ? oz.hukumsuz.join(',') : 'kapi'; break; }
  }
  /* EKRAN HIZI KOSUM ORTASINDA DEGISTI MI — kapanista BOS SAYFADA yeniden
     olculur. Neden bos sayfa: 6 Eyl'de olculdu, about:blank yuke KOR —
     makine %99 mesgulken (7,9/8 cekirdek) uc turda da 120,5 Hz / 0 kacirilan
     verdi. Yuke kor olmasi burada KUSUR DEGIL ERDEM: geriye tek bir sebep
     birakir, ekran hizinin kendisi. Degismisse butun kosumun BOLENI
     gecersizdir ve tek tek sayfalar degil KOSUM hukumsuzdur. */
  const tzSon = secim.length ? await tazelemeOlc(browser) : null;
  const ekranDegisti = !!(tzSon && Math.abs(tzSon.tik_ms - tz.tik_ms) / tz.tik_ms > 0.20);
  await browser.close();
  bozYukOldur();
  bozTarayiciKapat();
  if (yuk) yuk.kapat();
  if (ekranDegisti) for (const s of sonuc) { if (!s.hukumsuz.includes('ekran_degisti')) { s.hukumsuz.push('ekran_degisti'); s.gecti = null; } }
  /* UC DURUM, UC CIKIS KODU. `HUKUM YOK` sifir dondurmez: sifir "gecti"
     demektir ve olculememis bir taramayi gecmis saymak tam da bu turun
     kapattigi yanlis yesildir. Gercek kirmizi hukumsuzlugu YENER — kirli
     bir makinede bile temiz olculmus bir kirmizi kirmizidir. */
  const kirmiziSayfa = sonuc.filter((s) => s.gecti === false);
  const hukumsuzSayfa = sonuc.filter((s) => s.gecti === null);
  const ham = kirmiziSayfa.length ? `KALDI${dur && durSebep === 'kapi' ? ' — DURULDU: ' + dur : ''}`
    : hukumsuzSayfa.length ? `HUKUM YOK — ${hukumsuzSayfa.length} sayfa olculemedi (${[...new Set(hukumsuzSayfa.flatMap((s) => s.hukumsuz))].join(',')})${dur ? ' — DURULDU: ' + dur : ''}`
      : 'GECTI';
  const hukum = KISMI ? `KISMI (${secim.length}/${sayfalar.length} sayfa) — HUKUM DEGIL · ham: ${ham}` : ham;
  fs.writeFileSync(CIKTI, JSON.stringify({
    _: 'yeni/film/olc-sayfa.cjs — EK KAPI butun sayfalar: p95te KACIRILAN KARE<=1 (TIK cinsinden, tik her kosumda olculur) · takilma toplam<=%3 + tek<=250 ms · taban damgali · JS butcesi. Film/deneme-react haric.',
    kapi: 'A — TAM TARAMA (gerileme kapisi; 59 sayfa tek tarayicida). Ziyaretci olcumu KAPI B: yeni/film/olc-soguk.cjs',
    olcum: new Date().toISOString(), tarayici: `${TARAYICI} ${surum}`, tekrar: TEKRAR,
    tazeleme: tz, tazeleme_kapanis: tzSon,
    ekran_degisti: ekranDegisti ? { acilis_tik: tz.tik_ms, kapanis_tik: tzSon.tik_ms, _: 'ekran hizi kosum ortasinda degismis — butun kosumun boleni gecersiz, sayfalar degil KOSUM hukumsuz' } : false,
    yuk_taban: yukTaban ? { ...yukTaban, _: 'tarayici acik + bos sayfa + kaydirma yok. Duzenegin KENDI urettigi yabanci yuk (dwm.exe kompozitoru, cekirdek) buradadir; sayfa kosumlarindaki yuk bunun UZERINE binendir.' } : false,
    boz: BOZ ? { ms: Number(process.env.BOZ_MS || (tz.tik_ms * 2.4).toFixed(1)), _: 'KIRMIZI-ONCE kolu acikti: bu kayit hukum degil, duzenegin kirmizi yanabildiginin kanitidir' } : false,
    esik: {
      kacirilan_kare: KACIRILAN_KAPI,
      p95_esdeger_ms: +((KACIRILAN_KAPI + 1) * tz.tik_ms).toFixed(2),
      takilma_esik_ms: TAKILMA_ESIK, takilma_esik_tik: +(TAKILMA_ESIK / tz.tik_ms).toFixed(2),
      tek_takilma_ms: TEK_TAKILMA_MS,
      toplam_oran_BILGI: TOPLAM_ORAN,   /* KAPI DEGIL — 4 Eyl 2026, Enes; kiyas icin yazilir */
      p95_eski_ms: P95_ESKI_MS, _: 'p95_eski_ms KAPI DEGIL — 4 Eyl oncesi ms esigi, kiyas icin yazilir',
      yabanci_tarayici_kapi_cekirdek: TARAYICI_KAPI, cekirdek: os.cpus().length,
      toplam_cpu_KAPI_DEGIL: true,
      _yuk: 'YABANCI TARAYICI kapiyi asarsa sayfa HUKUMSUZDUR (kirmizi de yesil de) — KALDI degil, "yeniden olc". Toplam CPU yuku BILGIDIR: ~3 cekirdege kadar saf CPU yuku hukmu cevirmedi (doz-tepki: yeni/film/olc-yuk-tarama.json), 0,8 cekirdek yabanci tarayici cevirdi (p95 8,5 -> 33,4 ms).',
    },
    hukum, kismi: KISMI ? { olculen: secim.length, tum: sayfalar.length, _: 'kismi kosum HUKUM DEGIL: tarayici isinmasi sayfa basina bir tik oynatabiliyor (kunyeye bak)' } : false,
    hukumsuz: hukumsuzSayfa.length ? { sayi: hukumsuzSayfa.length, sayfalar: hukumsuzSayfa.map((s) => ({ yol: s.yol, sebep: s.hukumsuz, tarayici_cekirdek: s.yuk.tarayici_cekirdek_enyuksek, yabanci_cekirdek: s.yuk.yabanci_cekirdek_medyan, en_agir: s.yuk.en_agir.slice(0, 3) })), _: 'HUKUMSUZ != KALDI: iddia sayfa hakkinda degil OLCUM hakkindadir. Sebep giderilip yeniden olculur.' } : false,
    boz_kollari: (BOZ_TIK || BOZ_YUK || BOZ_TARAYICI) ? { boz_tik: BOZ_TIK || false, boz_yuk: BOZ_YUK || false, boz_tarayici: BOZ_TARAYICI, _: 'KIRMIZI-ONCE: bu kayit hukum degil, kurallarin yanabildiginin kanitidir (BOZ_YUK bir istisna: o kol kapiyi yakmaz, toplam CPU\'nun kapi OLMADIGINI gosteren egriyi uretir)' } : false,
    durulan: dur, durulan_sebep: durSebep, sayfa: sonuc,
  }, null, 1));
  if (tzSon) console.log(`\nTAZELEME (kapanis): ${tzSon.hz} Hz · tik ${tzSon.tik_ms} ms — acilis ${tz.tik_ms} ms${ekranDegisti ? '  !! EKRAN HIZI DEGISTI: butun kosumun boleni gecersiz' : '  (ekran degismedi: boleni ekran bozmadi)'}`);
  console.log(`\nHUKUM: ${hukum}\n→ ${CIKTI}`);
  if (KISMI) console.log(`!! KISMI KOSUM — ${secim.length}/${sayfalar.length} sayfa. Bu cikti hukum degildir (kunye: kismi kosum). Kapi icin tam tarama koş.`);
  if (hukumsuzSayfa.length) {
    const agir = new Map();
    for (const s of hukumsuzSayfa) for (const p of s.yuk.en_agir) agir.set(p.ad, Math.max(agir.get(p.ad) || 0, p.cekirdek));
    console.log(`!! ${hukumsuzSayfa.length} sayfa HUKUMSUZ (${[...new Set(hukumsuzSayfa.flatMap((s) => s.hukumsuz))].join(',')}) — kaldi DEGIL, yeniden olculmeli.`);
    if (agir.size) console.log(`   en agir yabanci surecler: ${[...agir].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a, c]) => `${a} ${c}`).join(' · ')}`);
  }
  /* KISMI kosum kirmiziyi ATFEDEMEZ, o yuzden kapiyi dusurmez — TEK ISTISNA
     BOZ: orada kirmiziyi biz urettik, atif bizde; kirmizi-once kolunun cikis
     kodu da kirmizi olmali, yoksa kolun kendisi kanit olmaz. Ayni istisna
     BOZ_TIK/BOZ_YUK icin de gecerli: onlarin urettigi HUKUMSUZLUK da
     kanittir ve cikis koduna dusmelidir (3).
     0 = gecti · 2 = kaldi (gercek kirmizi) · 3 = hukum yok (yeniden olc). */
  const BOZ_KOL = BOZ || !!BOZ_TIK || BOZ_TARAYICI;   /* BOZ_YUK haric: o kol egri uretir, kapi yakmaz */
  process.exit(KISMI && !BOZ_KOL ? 0 : (kirmiziSayfa.length ? 2 : hukumsuzSayfa.length ? 3 : 0));
})().catch((e) => { console.error(e); process.exit(1); });
