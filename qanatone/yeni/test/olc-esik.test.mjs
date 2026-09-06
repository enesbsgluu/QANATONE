/* IKI KAPI TEK SINYAL — kapi A ile kapi B ayrisirsa sessizce yanlis kiyas
   (5 Eyl 2026, "IKI KAPI" karari).

   NE OLCER: `olc-sayfa.cjs` (KAPI A — tam tarama, gerileme kapisi) ile
   `olc-soguk.cjs` (KAPI B — soguk giris, ziyaretci olcumu) ayni SINYALI
   olctugunu. Iki arac ayri dosya, cunku akislari farkli (A tek tarayicida
   59 sayfa, B her olcumde yeni tarayici). Ama olctukleri sey ayni olmali:
   takilma esigi, tek takilma tavani, toplam oran, kaydirma hizi/adimi ve
   TIK KESTIRIMI. Biri degisip oteki degismezse iki kapinin rakamlari
   KIYASLANAMAZ hale gelir ve bunu hicbir yer kirmizi yakmaz — "A'da 1
   kacirdi, B'de 2" cumlesi anlamini kaybeder.

   NEDEN TEST, NEDEN ORTAK MODUL DEGIL: olc-* araclari kasten kendi kendine
   yeter (tek dosya kopyalanip kosulabiliyor, film-olc kutuphanesi disinda
   bagimlilik yok). Ortak modul o kurali bozardi; drift'i test kapatir.

   KURAL YAZIMI: kaynak taranirken once YORUMLAR AYIKLANIR — bu dosyalarin
   yorumlarinda 50, 250, 900, 20 gibi sayilar tarihce/aciklama olarak geciyor;
   ayiklamadan bakan kural yanlis yesil de yanlis kirmizi da verir.

   Kosum: node --test yeni/test/olc-esik.test.mjs
   (dizin bicimi `node --test yeni/test/` Windows'ta yanlis kirmizi verir —
    dosya listesi ver, CLAUDE.md tuzaklar) */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const kok = dirname(fileURLToPath(import.meta.url));
const oku = (...p) => readFileSync(join(kok, '..', ...p), 'utf8');
/* /* ... *\/ ve // ... satirlarini at */
const yorumsuz = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');

const A = yorumsuz(oku('film', 'olc-sayfa.cjs'));
const B = yorumsuz(oku('film', 'olc-soguk.cjs'));

const sayi = (kaynak, ad) => {
  const m = kaynak.match(new RegExp(ad + '\\s*=\\s*(-?[0-9.]+)'));
  assert.ok(m, `${ad} kaynakta bulunamadi`);
  return Number(m[1]);
};

const varsayilan = (kaynak, ad) => {
  const m = kaynak.match(new RegExp(ad + '\\s*\\|\\|\\s*(-?[0-9.]+)'));
  assert.ok(m, `${ad} varsayilani kaynakta bulunamadi`);
  return Number(m[1]);
};

/* SINYAL ortak olmali; ESIK ortak OLMAMALI. Ayrimi bilerek yaziyorum:
   "neyin takilma sayildigi" iki kapida ayni degilse rakamlar kiyaslanamaz;
   "kac takilmaya izin verildigi" ise kosula gore FARKLI olmak zorunda. */
test('takilma SINYALI iki kapida birebir ayni (neyin takilma sayildigi)', () => {
  assert.equal(sayi(A, 'TAKILMA_ESIK'), sayi(B, 'TAKILMA_ESIK'),
    'TAKILMA_ESIK A ve B\'de farkli — iki kapinin rakamlari kiyaslanamaz');
});

/* Enes'in 5 Eyl karari koda PINLENDI: sessizce degisirse test yanar. */
test('KAPI A esikleri: kacirilan <= 1 · takilma orani %3 · tek 250 ms', () => {
  assert.equal(varsayilan(A, 'KACIRILAN_KAPI'), 1, 'A kacirilan kapisi degismis');
  assert.equal(sayi(A, 'TOPLAM_ORAN'), 0.03, 'A takilma orani esigi degismis');
  assert.equal(sayi(A, 'TEK_TAKILMA_MS'), 250, 'A tek takilma tavani degismis');
});

test('KAPI B esikleri: kacirilan <= 2 · tek 250 ms · TEKRAR 5', () => {
  assert.equal(varsayilan(B, 'KACIRILAN_KAPI'), 2, 'B kacirilan kapisi degismis');
  assert.equal(sayi(B, 'TEK_TAKILMA_MS'), 250, 'B tek takilma tavani degismis');
  assert.equal(varsayilan(B, 'TEKRAR'), 5, 'B tekrar sayisi 5 degil — uc kosum medyani bant degistiren sayfalarda sabit degildi');
});

/* ENES, 5 EYL 2026 GECESI — ORAN KAPIDAN DUSTU, YANLIS BIRIM.
   Oran tur boyuna bagimli bir turevdir: /yeni/projeler/ 308 ms toplam
   takilmayla 3,37 sn turda %9,13 verip KALIYORDU, /yeni/ 667 ms toplam
   takilmayla 12,0 sn turda %5,63 verip GECIYORDU — yani ziyaretcinin daha
   cok takildigi sayfa geciyordu. Bu testin isi, orani "sadelestirme" ya da
   "eski hali" adina kapiya geri koyan bir degisikligi KIRMIZI yakmaktir.
   Kirmizi-once sinandi: kapi blogunda takilma_oran satiri geri konunca yandi. */
test('KAPI B: takilma orani ve toplam suresi KAPI DEGIL, BILGI', () => {
  const kapiBlok = B.match(/oz\.kapi\s*=\s*\{[\s\S]*?\};/);
  assert.ok(kapiBlok, 'B kapi blogu bulunamadi');
  assert.doesNotMatch(kapiBlok[0], /oran/i,
    'B kapi bloguna ORAN geri girmis — oran tur boyuna bagimli turevdir, kisa sayfalarda ornekleme hatasidir (Enes, 5 Eyl gecesi)');
  assert.doesNotMatch(kapiBlok[0], /toplam/i,
    'B kapi bloguna takilma TOPLAM SURESI girmis — bilgi satiriydi, kapi degil');
  assert.doesNotMatch(B, /const TOPLAM_ORAN\s*=/,
    'B\'de TOPLAM_ORAN sabiti geri dogmus — kapi olarak okunacak isim tasima');
  /* Bilgi satirlari kaybolmamali: hukum vermiyor olmasi yazilmiyor demek degil.
     KURAL ALANA BAGLI, DIZGEYE DEGIL. Ilk yazimda `assert.match(B, /ad/)`
     yazmistim ve kirmizi-once kolu YANMADI: alan adi `oz.bilgi`den silinse
     bile ayni dizge dosyanin baska yerinde (siralama cagrisinda) geciyor ve
     kural yesil kaliyordu. Alanin ATANDIGI blogun icine bakiliyor. */
  const bilgiBlok = B.match(/oz\.bilgi\s*=\s*\{[\s\S]*?\n    \};/);
  assert.ok(bilgiBlok, 'B bilgi blogu yok — oran ve toplam hukumsuz ama KAYDA GECMELI');
  assert.match(bilgiBlok[0], /takilma_toplam_medyan_ms:/, 'B mutlak takilma toplami bilgi blogundan dusmus');
  assert.match(bilgiBlok[0], /takilma_oran_medyan:/, 'B takilma orani bilgi blogundan dusmus — hukumsuz ama yazilmali');
  assert.match(bilgiBlok[0], /tur_ms_medyan:/, 'B tur boyu yazilmiyor — oranin paydasi gorunmezse turev oldugu okunamaz');
});

test('KAPI B\'nin bloklayici kalemi SADECE MUTLAK birim tasir (tik ve ms)', () => {
  const kapiBlok = B.match(/oz\.kapi\s*=\s*\{[\s\S]*?\};/)[0];
  const kalemler = [...kapiBlok.matchAll(/(\w+):/g)].map((m) => m[1]).filter((a) => a !== 'kapi');
  assert.deepEqual(kalemler.sort(), ['kacirilan_kare', 'takilma_tek', 'tur_tam'],
    `B kapi kalemleri degismis: ${kalemler.join(',')} — bloklayici uc kalem disinda kalem eklendiyse birimi mutlak mi, once onu yaz`);
});

test('B\'nin esikleri A\'nınkinden FARKLI olmali (ayni olmasi kosul karisikligidir)', () => {
  assert.notEqual(varsayilan(A, 'KACIRILAN_KAPI'), varsayilan(B, 'KACIRILAN_KAPI'),
    'A ve B ayni kacirilan esigini tasiyor: biri tarama, oteki ziyaretci kosulu — esikleri ayni olamaz');
});

/* A'DA ORAN KAPIDAN DUSTU (Enes, 6 Eyl 2026 kararı ile) */
test('KAPI A\'da oran kapı değil, bilgiye düştü', () => {
  const kapiBlokA = A.match(/oz\.kapi\s*=\s*\{[\s\S]*?\};/);
  assert.ok(kapiBlokA, 'A kapi blogu bulunamadi');
  assert.doesNotMatch(kapiBlokA[0], /takilma_oran/,
    'A kapi bloguna oran geri girmis - oran tur boyuna bagimli turevdir (Enes, 6 Eyl 2026)');
});

test('kaydirma turu iki kapida birebir ayni (hiz ve adim)', () => {
  const hiz = (s) => { const m = s.match(/speed:\s*(\d+)/); assert.ok(m, 'speed bulunamadi'); return Number(m[1]); };
  const adim = (s) => { const m = s.match(/Math\.min\((\d+),\s*toplamPx/); assert.ok(m, 'adim bulunamadi'); return Number(m[1]); };
  assert.equal(hiz(A), hiz(B), 'kaydirma hizi ayrismis');
  assert.equal(adim(A), adim(B), 'kaydirma adimi ayrismis');
});

test('tik kestirimi iki kapida ayni yontem (200 rAF, ilk 5 atilir, %50-150 bandi)', () => {
  for (const [ad, s] of [['A', A], ['B', B]]) {
    assert.match(s, /n\s*<\s*200/, `${ad}: rAF ornek sayisi 200 degil`);
    assert.match(s, /\.slice\(5\)/, `${ad}: ilk 5 isinma karesi atilmiyor`);
    assert.match(s, /m0\s*\*\s*0\.5/, `${ad}: alt suzgec bandi 0,5 degil`);
    assert.match(s, /m0\s*\*\s*1\.5/, `${ad}: ust suzgec bandi 1,5 degil`);
  }
});

test('kacirilan kare formulu iki kapida ayni: round(p95/tik) - 1', () => {
  for (const [ad, s] of [['A', A], ['B', B]]) {
    assert.match(s, /Math\.round\([^)]*(kare_p95|p95\(ara\)\s*\/\s*tz\.tik_ms)[^)]*\)\s*-\s*1/,
      `${ad}: kacirilan kare formulu degismis`);
  }
});

test('B HEDEF tasir ve hedef KAPIYA KARISMAZ', () => {
  assert.match(B, /KACIRILAN_HEDEF\s*=\s*1/, 'B hedefi (kacirilan <= 1) kaybolmus');
  /* hedef, gecti hesabina giren `kapi` nesnesinde GECMEMELI */
  const kapiBlok = B.match(/oz\.kapi\s*=\s*\{[\s\S]*?\};/);
  assert.ok(kapiBlok, 'B kapi blogu bulunamadi');
  assert.doesNotMatch(kapiBlok[0], /HEDEF/, 'HEDEF kapi blogunun icine girmis — hedef kapiya donmus');
});

/* 5 Eyl: ana sayfanin scrollHeight'i tur boyunca 12.256 -> 10.480 px dusuyor
   (content-visibility). Payda bir kez alinirsa tur DIBE ULASSA BILE kayda
   "%84,4 gezildi" yazilir; tersi de mumkun — tur yarida kalir ve kimse
   gormez. Iki kapida da payda her adimda tazelenmeli ve tamlik KAPI SARTI
   olmali. */
test('tur tamligi iki kapida da olculuyor ve kapi sarti', () => {
  for (const [ad, s] of [['A', A], ['B', B]]) {
    assert.match(s, /toplamPx\s*=\s*d\.max/, `${ad}: payda her adimda tazelenmiyor (bayat payda)`);
    assert.match(s, /const turTam\s*=/, `${ad}: tur tamligi hesaplanmiyor`);
    assert.match(s, /tur_tam:\s*oz\.tur_tam/, `${ad}: tur tamligi kapi sartina baglanmamis`);
  }
});

test('kirmizi-once yakmasi sinanan kapiya gore olcekleniyor', () => {
  for (const [ad, s] of [['A', A], ['B', B]]) {
    assert.match(s, /KACIRILAN_KAPI\s*\+\s*1\.4/,
      `${ad}: BOZ yakmasi sabit — kapi degisince kol sinirda kalir ve kirmizi-once yanmaz`);
  }
});

test('kismi kosum bekcisi iki kapida da duruyor', () => {
  for (const [ad, s] of [['A', A], ['B', B]]) {
    assert.match(s, /const KISMI\s*=/, `${ad}: kismi kosum bekcisi yok`);
    assert.match(s, /KISMI\s*&&\s*!BOZ/, `${ad}: kismi kosum cikis kodunu dusurmeme kurali yok (BOZ istisnasiyla)`);
  }
});

/* ==================== MAKINE YUKU VE UCUNCU DURUM ====================
   6 Eyl 2026. Iki kusur ayni kokten geliyordu: arac OLCUMUN KENDISI
   hakkindaki suphesini HUKME cevirmeye calisiyordu. Doktrin (CLAUDE.md)
   "olc-sayfa kirmizisi makine yuku yazilmadan da hukum degildir" diyordu ve
   kural BELGEDE vardi, ALETTE YOKTU — elle kosulan kural kosmayan kuraldir.
   Bu bloktaki kurallarin isi, o kurali tekrar belgeye dusurecek bir
   degisikligi KIRMIZI YAKMAKTIR.

   Kapi degeri OLCULEREK kondu ve ilk hali CURUTULDU: once toplam CPU
   cekirdegine kapi konmustu, doz-tepki taramasi (olc-yuk-tarama.cjs) 2,9
   cekirdek saf CPU yukunun hukmu hic kipirdatmadigini, hatta AYNI yukun iki
   kez ZIT sonuc verdigini gosterdi. Bozan sey yabanci bir TARAYICI cikti:
   animasyonlu bir Chrome penceresiyle ayni sayfa p95 8,5 -> 33,4 ms
   (4,02 tik) okudu — 6 Eyl'in saatler yiyen yanlis kirmizisinin rakami
   birebir. Kusak: 0,023 cekirdek temiz, 1,077 kirli; kapi 0,15. */

test('yuk OLCULUYOR ve KAYDA GECIYOR — iki kapida da (doktrin: yazilmadan hukum yok)', () => {
  for (const [ad, s] of [['A', A], ['B', B]]) {
    assert.match(s, /function yukFark\(/, `${ad}: yuk olcumu yok — CLAUDE.md doktrini alete gecmemis`);
    assert.match(s, /KernelModeTime/, `${ad}: surec basina CPU okunmuyor (sistem ortalamasi tek cekirdek yiyen sureci gizler)`);
    const yukBlok = s.match(/oz\.yuk\s*=\s*\{[\s\S]*?\n    \};/);
    assert.ok(yukBlok, `${ad}: oz.yuk blogu yok — yuk kayda gecmiyor`);
    assert.match(yukBlok[0], /en_agir:/, `${ad}: en agir surec dokumu dusmus — "kirmizi kimden geldi" ancak o satirdan okunur`);
    assert.match(yukBlok[0], /yabanci_cekirdek_medyan:/, `${ad}: toplam yabanci yuk yazilmiyor (hukum vermez ama YAZILIR)`);
  }
});

test('KAPI yabanci TARAYICI cekirdegi, iki kapida ayni sayi', () => {
  assert.equal(varsayilan(A, 'TARAYICI_KAPI'), 0.15, 'A yabanci tarayici kapisi degismis — degeri olculdu (0,023 temiz / 1,077 kirli), degistiren once olcsun');
  assert.equal(varsayilan(B, 'TARAYICI_KAPI'), varsayilan(A, 'TARAYICI_KAPI'),
    'A ve B yabanci tarayici kapisi ayrismis — yuk MAKINENIN hali, kosulun degil; iki kapida ayni olmali');
  for (const [ad, s] of [['A', A], ['B', B]])
    assert.match(s, /YABANCI_TARAYICILAR\s*=\s*new Set\(\[[^\]]*'chrome\.exe'[^\]]*\]\)/, `${ad}: yabanci tarayici sinifi tanimsiz`);
});

/* TOPLAM CPU KAPI DEGIL — bu kural bir GEVSETME degil, olculmus bir birim
   duzeltmesidir (ayni aile: B'de takilma orani, kare kapisinda ms/tik).
   Kapiya toplam yuku geri koyan degisiklik burada yanmali. */
test('toplam CPU yuku KAPI DEGIL, BILGI — iki kapida da', () => {
  for (const [ad, s] of [['A', A], ['B', B]]) {
    const hukumsuzBlok = s.match(/oz\.hukumsuz\s*=\s*\[\][\s\S]*?oz\.gecti\s*=/);
    assert.ok(hukumsuzBlok, `${ad}: hukumsuz blogu yok`);
    assert.doesNotMatch(hukumsuzBlok[0], /yabanci_cekirdek/,
      `${ad}: toplam CPU yuku hukmu dusuruyor — olculdu ki 2,9 cekirdek saf CPU yuku hukmu cevirmiyor (olc-yuk-tarama.json)`);
    assert.match(hukumsuzBlok[0], /tarayici_cekirdek_enyuksek/, `${ad}: yabanci tarayici kapisi hukme baglanmamis`);
  }
});

/* HUKUMSUZ, KALDI DEGILDIR: "kaldi" sayfa hakkinda bir iddiadir, "hukumsuz"
   OLCUM hakkindadir. `oz.kapi` bloklayici kalemlerin yeridir ve MUTLAK birim
   tasir; hukumsuzluk sebepleri oraya girerse ucuncu durum kaybolur. */
test('hukumsuzluk sebepleri KAPI BLOGUNA girmez — iki kapida da', () => {
  for (const [ad, s] of [['A', A], ['B', B]]) {
    const kapiBlok = s.match(/oz\.kapi\s*=\s*\{[\s\S]*?\};/);
    assert.ok(kapiBlok, `${ad}: kapi blogu bulunamadi`);
    for (const sebep of ['tarayici', 'yuk', 'tik_sapma', 'hukumsuz'])
      assert.ok(!kapiBlok[0].includes(sebep), `${ad}: '${sebep}' kapi bloguna girmis — hukumsuzluk KALDI'ya donmus`);
  }
});

test('KAPI A\'nin bloklayici kalemleri SADECE MUTLAK birim tasir (B\'deki kuralin aynisi)', () => {
  const kapiBlok = A.match(/oz\.kapi\s*=\s*\{[\s\S]*?\};/)[0];
  const kalemler = [...kapiBlok.matchAll(/(\w+):/g)].map((m) => m[1]).filter((a) => a !== 'kapi');
  assert.deepEqual(kalemler.sort(), ['js', 'kacirilan_kare', 'takilma_tek', 'tur_tam'],
    `A kapi kalemleri degismis: ${kalemler.join(',')} — kalem eklendiyse birimi mutlak mi, once onu yaz`);
});

test('gecti UC DURUMLU: hukumsuz varken null (ne gecti ne kaldi)', () => {
  for (const [ad, s] of [['A', A], ['B', B]])
    assert.match(s, /oz\.gecti\s*=\s*oz\.hukumsuz\.length\s*\?\s*null\s*:/,
      `${ad}: gecti hala ikili — hukumsuz kosum "kaldi" ya da "gecti" diye etiketleniyor`);
});

/* Cikis kodu 0 DONDURMEK olculememis bir taramayi "gecti" saymaktir — bu
   turun kapattigi yanlis yesil tam odur. */
test('HUKUM YOK ayri cikis kodu (3) dondurur — 0 da 2 de degil', () => {
  for (const [ad, s] of [['A', A], ['B', B]]) {
    const cikis = s.match(/process\.exit\((?![^)]*\b1\b\s*\))[^;]*hukumsuz[^;]*\)/);
    assert.ok(cikis, `${ad}: cikis kodu hukumsuzlugu gormuyor`);
    assert.match(cikis[0], /3/, `${ad}: hukumsuz kosum 3 disinda bir kod donduruyor`);
  }
});

/* Her yeni kuralin bir kolu olmali — yanmayan kuralin yesili anlamsizdir. */
test('yeni kurallarin KIRMIZI-ONCE kollari duruyor', () => {
  assert.match(A, /BOZ_TIK\s*=\s*Number\(process\.env\.BOZ_TIK/, 'A: tik_sapma kolu yok');
  assert.match(A, /BOZ_TARAYICI\s*=\s*process\.env\.BOZ_TARAYICI/, 'A: yabanci tarayici kolu yok');
  /* Yakici surecler agactan CIKMALI: `detached` ppid'yi degistirmez, cocuk
     bizim agacimizda kalir ve kol SESSIZCE YESIL kalirdi (6 Eyl'de olculdu). */
  assert.match(A, /'cmd',\s*\['\/c',\s*'start'/, 'A: BOZ kollari cmd /c start ile dogurmuyor — surec agacimizda kalir, kol yanmaz');
});

/* Duzenegin KENDI urettigi yuk ayrilmali ama GIZLENMEMELI: dwm.exe bizim
   tarayicimizin karelerini birlestiriyor (tarayici kapali 0,007 -> kaydirirken
   0,358 cekirdek). Yabanci sayilsaydi kapinin yarisindan fazlasini duzenegin
   kendisi yerdi. */
test('duzenegin kendi urettigi yuk (dwm) ayrilir ve ayrica yazilir', () => {
  for (const [ad, s] of [['A', A], ['B', B]]) {
    assert.match(s, /RIG_SURECLERI\s*=\s*new Set\(\['dwm\.exe'\]\)/, `${ad}: rig sureci ayrimi yok`);
    assert.match(s, /rig_cekirdek:/, `${ad}: ayrilan yuk kayda gecmiyor — ayirmak gizlemek degildir`);
  }
});
