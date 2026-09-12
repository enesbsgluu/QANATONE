#!/usr/bin/env node
/* TESPIT ARACI ARAYUZ KAPISI (5 Eyl 2026).
   Uc sey olculur, ucu de GERCEK CHROME'da:
     1. Kalem popup'i aciliyor mu ve ICINDEKI DORT ALAN DOLU MU
        (rozet · ad · olculen · olcut · neden) — Enes: "tiklayinca pop up
        olarak acilip sebeplerini gercek bir sekilde ozetle belirtsin".
     2. Duvar yolunda ziyaretci GENEL mesaj degil DURUMA OZEL mesaj ve
        olculen gercekleri (HTTP kodu, saglayici) goruyor mu.
     3. KIRMIZI-ONCE: arayuzun TANIMADIGI bir `durum` gelince genel mesaja
        dusuyor mu — dusmuyorsa harita hic okunmuyor demektir ve 1-2'nin
        yesili anlamsizdir.

   FONKSIYON TAKLIT EDILIR (istek yakalanip sahte yanit donulur): kota
   harcanmaz, ag'a cikilmaz, yanit SABIT — kapi arayuzu olcer, agi degil.

   Kullanim: node yerel-sun.cjs &  ·  node yeni/film/olc-tespit-popup.cjs
*/
const path = require('path');
const pt = require(process.env.PUPPETEER_CORE
  || path.join(process.env.USERPROFILE || process.env.HOME, '.local', 'lib', 'film-olc', 'node_modules', 'puppeteer-core'));
const CHROME = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ADRES = process.env.ADRES || 'http://127.0.0.1:8790';
const bekle = (ms) => new Promise((r) => setTimeout(r, ms));

/* Fonksiyonun GERCEK bicimi — alanlar diagnose.js'in dondugunun aynisi. */
const ALTI = [
  { k: 'schema', state: 'fail', v: '', o: 'ld+json · microdata' },
  { k: 'alt', state: 'fail', v: '7', o: '0 · ≤2' },
  { k: 'weight', state: 'warn', v: '640', o: '≤500 · ≤1500 KB' },
  { k: 'title', state: 'ok', v: '48', o: '25-65 · 10-80' },
  { k: 'redirects', state: 'ok', v: '0', o: '≤0 · ≤1' },
  { k: 'whatsapp', state: 'ok', v: '', o: 'wa.me' },
];
/* TAM LISTE — olcek ancak GERCEK kalem sayisiyla olculur. Alti kalemle
   mobil izgara kisa gorunur ve kusur gizlenir.

   ANAHTARLAR KAYNAKTAN TURER (6 Eyl 2026). Elle yazilmis listenin bedeli
   olculdu: ajan ekseni eklendiginde fikstur guncellenmedi, kol KAPALI bir
   ikinci skorla olcup 1.267 px'e yesil yakti — oysa basarili taramada
   ziyaretcinin gordugu blok 1.594 px'ti. Artik iki eksenin anahtarlari da
   agirlik tablolarindan (diagnose.js W/WA) okunuyor: fonksiyona kalem
   eklendiginde olcek kolu onu kendiliginden gorur, sapma DOGAMAZ. */
const TESHIS = require(path.join(__dirname, '..', '..', 'netlify', 'functions', 'diagnose.js'));
const kalemler = (anahtar, olcut) => anahtar.map((k, i) => ({ k,
  state: i < 2 ? 'fail' : i < 4 ? 'warn' : 'ok',
  v: i % 3 ? String(i * 7) : '', o: olcut }));
const TAM = kalemler(Object.keys(TESHIS.W), '≤1 · ≤2');
const SAGLIKLI = {
  ok: true, host: 'ornek.com', finalUrl: 'https://ornek.com/', score: 71, kb: 640,
  kalan: 1, status: 200, bytes: 655360, redirects: 0, cdn: 'cloudflare',
  durum: 'saglikli', cfEylul: false, items: ALTI,
};
/* AJAN EKSENI FIKSTURU (6 Eyl 2026). Olcek kolu bunsuz KAPALI bir bloku
   olcuyordu: `ajan` alani yoksa `steAjan` hic acilmaz. */
const AJAN = kalemler(Object.keys(TESHIS.WA), '0 · ≤2 ajan');
const SAGLIKLI_TAM = Object.assign({}, SAGLIKLI, { items: TAM,
  ajan: { olculdu: true, skor: 48, items: AJAN,
    bilgi: { metin: 4200, engelli_ajanlar: ['gptbot'] } } });
const DUVAR = {
  ok: false, durum: 'engel', saglayici: 'cloudflare', host: 'ornek.com',
  finalUrl: 'https://ornek.com/', status: 403, bytes: 5300, redirects: 0,
  cdn: 'cloudflare', cfEylul: true,
};
const BILINMEYEN = { ok: false, durum: 'zart-zurt', host: 'ornek.com', status: 418 };

/* MOBIL KOLU (MOBIL=1): Enes mobilde "Baglanti hatasi" aldi. O mesaj
   submit govdesinin TAMAMINI saran catch'ten geliyor — yani ag hatasi da,
   sonucu EKRANA YAZARKEN cikan bir hata da ayni metni veriyor. Mobil
   kolu ikincisini yakalar: konsol hatasi da toplanir. */
const MOBIL = !!process.env.MOBIL;
async function kol(tarayici, ad, yanit, is) {
  const s = await tarayici.newPage();
  await s.setViewport(MOBIL
    ? { width: 390, height: 844, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
    : { width: 1280, height: 900 });
  if (MOBIL) await s.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  const konsol = [];
  s.on('pageerror', (e) => konsol.push('pageerror: ' + e.message));
  s.on('console', (m) => { if (m.type() === 'error') konsol.push('console: ' + m.text().slice(0, 160)); });
  s.__konsol = konsol;
  await s.setRequestInterception(true);
  s.on('request', (r) => {
    if (r.url().includes('/.netlify/functions/diagnose')) {
      /* UC OZEL KOL — uc ayri hata yolu ayri ayri olculsun:
         '__ag'    istek hic tamamlanmaz (ag kesik)
         '__yanit' 502 + HTML govde (JSON degil) — Netlify fonksiyon
                   zaman asiminda tam olarak boyle doner */
      if (yanit === '__ag') return r.abort('connectionfailed');
      if (yanit === '__yanit') return r.respond({ status: 502,
        contentType: 'text/html', body: '<html><body>Bad gateway</body></html>' });
      /* DURUM KODU GERCEGIYLE AYNI OLMALI: fonksiyon YALNIZ kota/oran'da
         429 doner; obur `ok:false` hallerinde (adres, blocked, duvar) 200
         doner. Ilk yazim hepsine 429 veriyordu ve `adres` kolu Chrome'un
         konsol kirmizisi yuzunden sahte kaldi. */
      const kod = (yanit.reason === 'kota' || yanit.reason === 'oran') ? 429 : 200;
      return r.respond({ status: kod, contentType: 'application/json', body: JSON.stringify(yanit) });
    }
    r.continue();
  });
  await s.goto(ADRES + '/', { waitUntil: 'networkidle2', timeout: 60000 });
  /* prolog masaustunde hero'yu tutuyor — tespit sahnesine gitmek icin gec */
  await s.evaluate(() => { try { sessionStorage.setItem('qanat-prolog-atlandi', '1'); } catch (e) {} });
  await s.reload({ waitUntil: 'networkidle2' });
  await bekle(800);
  await s.evaluate(() => document.getElementById('tespit').scrollIntoView({ block: 'center' }));
  await bekle(500);
  await s.evaluate(() => {
    document.getElementById('steUrl').value = 'ornek.com';
    document.getElementById('steForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
  });
  /* BEKLEME 1.500 -> 3.600 ms (5 Eyl 2026): tarama gosterimi sonucu
     ASGARI 2.600 ms tutuyor; eski bekleme sonucu hic goremezdi. */
  await bekle(3600);
  const c = await is(s);
  /* Hata kollarinda konsola yazmak DOGRU davranis (teshis edilebilsin diye
     bilerek yaziliyor); orada konsol kirmizisi kusur sayilmaz. */
  const beklenen = yanit === '__ag' || yanit === '__yanit';
  const hata = s.__konsol.length ? ' | KONSOL: ' + s.__konsol.slice(0, 1).join(' ; ').slice(0, 70) : '';
  await s.close();
  return { ad, ...c, not: (c.not || '') + hata,
    gecti: c.gecti && (beklenen || !s.__konsol.length) };
}

(async () => {
  const tarayici = await pt.launch({ executablePath: CHROME, headless: 'new',
    args: ['--no-first-run', '--no-default-browser-check'] });
  const satir = [];

  /* 1 — POPUP */
  satir.push(await kol(tarayici, 'popup (fail kalemi)', SAGLIKLI, async (s) => {
    const once = await s.evaluate(() => {
      const d = document.getElementById('stePop');
      return { acikOnce: !!(d && d.open), dugme: document.querySelectorAll('.ste-kalem-ac').length };
    });
    await s.evaluate(() => document.querySelector('.ste-kalem.fail .ste-kalem-ac').click());
    await bekle(500);
    const p = await s.evaluate(() => {
      const d = document.getElementById('stePop');
      const al = (id) => { const e = document.getElementById(id); return e ? e.textContent.trim() : null; };
      const gor = (id) => { const e = document.getElementById(id); return e ? !e.hidden : false; };
      return { acik: !!(d && d.open), rozet: al('stePopRozet'), ad: al('stePopAd'),
        deger: gor('stePopDegerSatir') ? al('stePopDeger') : null,
        olcut: gor('stePopOlcutSatir') ? al('stePopOlcut') : null,
        neden: al('stePopNeden') };
    });
    const gecti = once.dugme === 6 && !once.acikOnce && p.acik && !!p.rozet && !!p.ad
      && !!p.olcut && !!p.neden && p.neden.length > 20;
    return { gecti, not: `dugme=${once.dugme} acik=${p.acik} rozet="${p.rozet}" ad="${p.ad}"`
      + ` olculen=${p.deger} olcut="${p.olcut}" neden=${p.neden ? p.neden.length + ' harf' : 'YOK'}` };
  }));

  /* 2 — DUVAR YOLU */
  satir.push(await kol(tarayici, 'duvar yolu (engel)', DUVAR, async (s) => {
    const m = await s.evaluate(() => document.getElementById('steDurum').textContent.trim());
    const gecti = !/tamamlanamad|could not be completed/i.test(m)
      && /403/.test(m) && /cloudflare/i.test(m);
    return { gecti, not: `mesaj="${m}"` };
  }));

  /* 3 — KIRMIZI-ONCE: taninmayan durum genel mesaja dusmeli */
  satir.push(await kol(tarayici, 'KIRMIZI-ONCE (bilinmeyen durum)', BILINMEYEN, async (s) => {
    const m = await s.evaluate(() => document.getElementById('steDurum').textContent.trim());
    const gecti = /tamamlanamad|could not be completed/i.test(m);
    return { gecti, not: `mesaj="${m}"` };
  }));

  /* 3b — KONUM: popup TIKLANAN kalemin ustunde (ya da yer yoksa altinda),
     yatay olarak ona ortali ve kadrajin ICINDE.
     OLCULEN ESKI HAL: (0,0) — ekranin sol ustu. Sebep: Chrome `<dialog>`u
     `margin:auto` ile ortalar, sitenin reset'i `margin:0` yaziyor ve
     ortalama oluyordu. */
  satir.push(await kol(tarayici, 'popup konumu', SAGLIKLI, async (s) => {
    const r = await s.evaluate(() => {
      const btn = document.querySelectorAll('.ste-kalem-ac')[1];
      const b = btn.getBoundingClientRect();
      btn.click();
      const d = document.getElementById('stePop');
      const p = d.getBoundingClientRect();
      return { b: { x: b.left, y: b.top, w: b.width, alt: b.bottom },
        p: { x: p.left, y: p.top, w: p.width, h: p.height },
        g: { w: innerWidth, h: innerHeight } };
    });
    const ustte = r.p.y + r.p.h <= r.b.y + 1;
    const altta = r.p.y >= r.b.alt - 1;
    const sapma = Math.abs((r.p.x + r.p.w / 2) - (r.b.x + r.b.w / 2));
    const icinde = r.p.x >= 0 && r.p.y >= 0
      && r.p.x + r.p.w <= r.g.w + 1 && r.p.y + r.p.h <= r.g.h + 1;
    /* dar ekranda yatay ortalama kelepceye takilabilir: kadraj sarti sert,
       ortalama sarti kelepce payiyla */
    const gecti = (ustte || altta) && icinde && sapma <= r.g.w / 2;
    return { gecti, not: `${ustte ? 'USTTE' : altta ? 'ALTTA' : 'HIZASIZ'} · sapma ${Math.round(sapma)}px`
      + ` · kadrajda ${icinde} · popup(${Math.round(r.p.x)},${Math.round(r.p.y)})` };
  }));

  /* 3c — IMLEC: acik dialog icinde yerli imlec GERI GELMELI.
     OLCULEN ESKI HAL: kabuk `html.bitcursor *{cursor:none}` yaziyor ve
     ozel imleci `div.kb-bit` (z-index 140) ciziyor; `<dialog>` TOP
     LAYER'da oldugu icin imlec ONUN ALTINDA kaliyordu — ziyaretci
     imleci tumden kaybediyordu. */
  satir.push(await kol(tarayici, 'popup imleci', SAGLIKLI, async (s) => {
    const r = await s.evaluate(() => {
      document.querySelector('.ste-kalem.fail .ste-kalem-ac').click();
      const d = document.getElementById('stePop');
      const kapat = d.querySelector('.ste-pop-kapat button');
      return { govde: getComputedStyle(document.body).cursor,
        dialog: getComputedStyle(d).cursor,
        baslik: getComputedStyle(document.getElementById('stePopAd')).cursor,
        kapat: getComputedStyle(kapat).cursor };
    });
    const gecti = r.dialog !== 'none' && r.baslik !== 'none' && r.kapat === 'pointer';
    return { gecti, not: `govde=${r.govde} · dialog=${r.dialog} · baslik=${r.baslik} · kapat=${r.kapat}` };
  }));

  /* 3b — ODAK HALKASI SATIRDA (6 Eyl 2026). Dokunma hedefi yayilan bir
     ortuye (`.ste-kalem-ac::after`) tasindi; tiklanan alan artik SATIR.
     Odak halkasi dugmede kalsaydi klavyeyle gezen ziyaretciye tiklanan
     alani yanlis gosterirdi, o yuzden `:has()` ile satira alindi — ve
     `:has()` sessizce dusebilecek bir secici oldugu icin kapiya bagli.
     Odak GERCEK KLAVYEDEN gelmeli: programatik `focus()` Chrome'da
     `:focus-visible` yakmaz, o yuzden Shift+Tab/Tab ile geri gelinir. */
  satir.push(await kol(tarayici, 'odak halkasi satirda', SAGLIKLI, async (s) => {
    await s.evaluate(() => document.querySelector('.ste-kalem-ac').focus());
    await s.keyboard.down('Shift'); await s.keyboard.press('Tab'); await s.keyboard.up('Shift');
    await s.keyboard.press('Tab');
    const r = await s.evaluate(() => {
      const btn = document.querySelector('.ste-kalem-ac');
      const li = btn.closest('.ste-kalem');
      const g = getComputedStyle(li);
      return { odakli: document.activeElement === btn,
        gorunur: btn.matches(':focus-visible'),
        bicim: g.outlineStyle, kalinlik: parseFloat(g.outlineWidth) || 0,
        /* ortu de olculur: kapi ikisini birden tutmali, yoksa halka
           dogru yerde ama tiklanan alan yine metin kadar olabilir */
        ortu: getComputedStyle(btn, '::after').position };
    });
    const gecti = r.odakli && r.gorunur && r.bicim !== 'none' && r.kalinlik >= 2
      && r.ortu === 'absolute';
    return { gecti, not: `odak=${r.odakli} · focus-visible=${r.gorunur}`
      + ` · satir halkasi ${r.bicim} ${r.kalinlik}px · ortu ${r.ortu}` };
  }));

  /* 4 — ADRES COZULEMEDI (fonksiyonun `adres` sebebi) */
  satir.push(await kol(tarayici, 'adres cozulemedi', { ok: false, reason: 'adres' }, async (s) => {
    const m = await s.evaluate(() => document.getElementById('steDurum').textContent.trim());
    const gecti = /çözülemedi|could not be resolved/i.test(m) && !/engelliyor|blocks/i.test(m);
    return { gecti, not: `mesaj="${m}"` };
  }));

  /* 5 — AG KESIK: "sunucuya ulasilamadi", "sonuc goruntulenemedi" DEGIL */
  satir.push(await kol(tarayici, 'ag kesik', '__ag', async (s) => {
    const m = await s.evaluate(() => document.getElementById('steDurum').textContent.trim());
    const gecti = /ulaşılamadı|reach the server/i.test(m) && !/görüntülenemedi|displayed/i.test(m);
    return { gecti, not: `mesaj="${m}"` };
  }));

  /* 6 — JSON OLMAYAN YANIT (502 + HTML): fonksiyon zaman asiminin sekli */
  satir.push(await kol(tarayici, '502 HTML yanit', '__yanit', async (s) => {
    const m = await s.evaluate(() => document.getElementById('steDurum').textContent.trim());
    const gecti = /beklenmeyen bir yanıt|unexpected response/i.test(m);
    return { gecti, not: `mesaj="${m}"` };
  }));

  /* 7 — SURE SOZLESMESI: yanit ANINDA gelse bile sonuc ASGARI 2.600 ms
     sonra cikar (adimlar okunabilsin), ve bekleme TAVAN 8.000 ms'i asmaz.
     Enes: "8 saniye icinde sonuc tablosunu versin." Olcum: submit anindan
     `#steSonuc` gorunur olana kadar gecen sure. */
  satir.push(await (async () => {
    const s = await tarayici.newPage();
    await s.setViewport(MOBIL ? { width: 390, height: 844, isMobile: true, hasTouch: true }
      : { width: 1280, height: 900 });
    await s.setRequestInterception(true);
    s.on('request', (r) => r.url().includes('/.netlify/functions/diagnose')
      ? r.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(SAGLIKLI) })
      : r.continue());
    await s.goto(ADRES + '/', { waitUntil: 'networkidle2', timeout: 60000 });
    await s.evaluate(() => { try { sessionStorage.setItem('qanat-prolog-atlandi', '1'); } catch (e) {} });
    await s.reload({ waitUntil: 'networkidle2' });
    await bekle(800);
    const olcum = await s.evaluate(async () => {
      const sonuc = document.getElementById('steSonuc');
      const ray = document.getElementById('steTarama');
      const t0 = performance.now();
      let rayGorundu = false;
      document.getElementById('steUrl').value = 'ornek.com';
      document.getElementById('steForm').dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
      for (let i = 0; i < 200; i++) {
        if (ray && !ray.hidden) rayGorundu = true;
        if (!sonuc.hidden) break;
        await new Promise((r) => setTimeout(r, 50));
      }
      return { ms: Math.round(performance.now() - t0), rayGorundu, cikti: !sonuc.hidden,
        adim: document.getElementById('steDurum').textContent };
    });
    await s.close();
    const gecti = olcum.cikti && olcum.rayGorundu && olcum.ms >= 2500 && olcum.ms <= 8000;
    return { ad: 'sure sozlesmesi (2.6-8 sn)', gecti,
      not: `sonuc ${olcum.ms} ms · ray gorundu=${olcum.rayGorundu} · son adim="${olcum.adim}"` };
  })());

  /* 8 — MOBIL OLCEK (yalniz MOBIL=1 kolunda anlamli).
     OLCULEN ILK HAL (390x844, 26 kalem): sonuc blogu 2.151 px = 2,5
     EKRAN, tek basina izgara 1.366 px, izgara TEK sutun — cunku
     `minmax(190px,1fr)` 350 px'lik alanda ikinci sutunu kuramiyordu.
     Iki sutuna alindi: izgara 548 px, sonuc 1.332 px.

     IKI DUZELTME (6 Eyl 2026):
     a) Fikstur ajan eksenini tasimiyordu, yani kol KAPALI ikinci skorla
        olcuyordu. Acildi: sonuc 1.593,8 px = 1,89 ekran.
     b) Dokunma hedefi diye SATIR olculuyordu; tiklanan sey satir degil
        icindeki `button` (o zaman 16–18,6 px idi, satirin yarisi).

     HEDEF KUTUYLA DEGIL `elementFromPoint` ILE OLCULUR. Dugmenin hit
     alani artik yayilan bir ortu (`::after`, inset:0) — ortu akistan
     ciktigi icin dugmenin `getBoundingClientRect()`i hala 16 px gorunur
     ve KUTUYU olcen bir kapi yamayi hic gormezdi (olculdu: yamadan once
     de sonra da 16). Bu yuzden her satirin ust kenarindan alt kenarina
     1 px'lik dikey tarama yapilir ve o noktaya dokunmanin GERCEKTEN
     kendi dugmesine dustugu piksel sayilir.

     KAPI: iki izgara da >= 2 sutun · kalem sayilari 26 ve 7 · sonuc
     blogu <= 2 ekran · en kisa dokunma hedefi >= 32 px. Esik olculene
     cakili (32 px: 34 px'lik satirin ic kutusu, 1 px kenarlik dusuyor):
     WCAG 2.2 AA asgarisi 24 px, projenin kendi mobil kapisi 44 px — 44
     blogu 2 ekranin ustune tasirdi, o yuzden esik ikisinin arasinda
     gerileme bekcisi olarak duruyor. */
  if (MOBIL) satir.push(await kol(tarayici, `mobil olcek (${TAM.length}+${AJAN.length} kalem)`, SAGLIKLI_TAM, async (s) => {
    const r = await s.evaluate(() => {
      /* Bir satirin GERCEK dokunma hedefi: satiri kadraja getir, orta
         dikeyinde 1 px'lik adimlarla in, o noktadaki en ustteki ogenin
         bu satirin kendi dugmesi (ya da onun icindeki bir sey) oldugu
         piksel sayisini dondur. Kutu degil dokunus olculur. */
      const hedefYuk = (li) => {
        li.scrollIntoView({ block: 'center', behavior: 'instant' });
        const k = li.getBoundingClientRect();
        const btn = li.querySelector('.ste-kalem-ac');
        if (!btn || k.height <= 0) return 0;
        const x = Math.round(k.left + k.width / 2);
        let n = 0;
        for (let y = Math.ceil(k.top); y <= Math.floor(k.bottom); y++) {
          const el = document.elementFromPoint(x, y);
          if (el && (el === btn || btn.contains(el))) n++;
        }
        return n;
      };
      const oku = (id) => {
        const g = document.getElementById(id);
        if (!g) return { sutun: 0, yuk: 0, adet: 0, dugme: 0 };
        const li = [...g.querySelectorAll('.ste-kalem')];
        const hedef = li.map(hedefYuk);
        return { sutun: getComputedStyle(g).gridTemplateColumns.split(' ').length,
          yuk: Math.round(g.getBoundingClientRect().height), adet: li.length,
          dugme: hedef.length ? Math.min(...hedef) : 0 };
      };
      const ajan = document.getElementById('steAjan');
      /* Blok boyu TARAMADAN ONCE alinir: hedef taramasi sayfayi kaydiriyor,
         kaydirmaya bagli hicbir sey olcume karismasin. */
      const blok = { ajanAcik: !!(ajan && !ajan.hidden), ekran: innerHeight,
        sonuc: Math.round(document.getElementById('steSonuc').getBoundingClientRect().height) };
      return Object.assign(blok, { ana: oku('steIzgara'), aj: oku('steAjanIzgara') });
    });
    const ekranAdedi = +(r.sonuc / r.ekran).toFixed(2);
    const dugme = Math.min(r.ana.dugme, r.aj.dugme);
    const gecti = r.ajanAcik && ekranAdedi <= 2 && dugme >= 32
      && r.ana.sutun >= 2 && r.ana.adet === TAM.length
      && r.aj.sutun >= 2 && r.aj.adet === AJAN.length;
    return { gecti, not: `sonuc=${r.sonuc}px (${ekranAdedi} ekran) · ana ${r.ana.adet}`
      + `x${r.ana.sutun}sut ${r.ana.yuk}px · ajan ${r.aj.adet}x${r.aj.sutun}sut ${r.aj.yuk}px`
      + ` · en kisa dugme=${dugme}px` };
  }));

  await tarayici.close();
  for (const r of satir) console.log(`${r.gecti ? 'GECTI' : 'KALDI'}  ${r.ad.padEnd(30)} ${r.not}`);
  const kalan = satir.filter((r) => !r.gecti).length;
  console.log(`\nKAPI: ${satir.length - kalan}/${satir.length} gecti`);
  process.exit(kalan ? 2 : 0);
})().catch((e) => { console.error('DUZENEK HATASI:', e); process.exit(1); });
