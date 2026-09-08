#!/usr/bin/env node
/* PANEL ALAN KAPSAMASI (9 Eyl 2026).

   KURAL (Enes, panel turu): "sitenin her alanini yonetebilecek, detayli,
   eksiksiz, her sey dogru uca bagli, tam kontrollu panel."

   Bu arac o kurali OLCER: kokteki content.json'daki her yol panelde bir
   alana bagli mi? Iki liste karsilastirilir:
     KAYNAK  content.json'un duz yol listesi (a.b.c)
     PANEL   admin.html icinde gecen yol dizeleri (fld/bsw/data-p vb.)

   KAYITLI TUZAK — "panelde alan yok" olcumu iki sebeple yanilir:
     1) alanlar `data-p` tasir, govde SEKME BASINA gec kurulur; DOM'a bakan
        bir olcum kurulmamis sekmeleri goremez. Bu yuzden DOM degil KAYNAK
        METNI taranir.
     2) dizi ogeleri (`services.0.title`) panelde `services.${i}.title`
        gibi SABLONLA uretilir; duz metin karsilastirmasi bunlari kacirir.
        O yuzden dizi indisleri normalize edilir (`services.#.title`).      */
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..', '..');
const ICERIK = path.join(KOK, 'content.json');
const PANEL = path.join(KOK, 'admin.html');

/* content.json → duz yollar; dizi indisleri '#' olur */
function yollar(o, on = '', out = new Set()) {
  if (o === null || typeof o !== 'object') { if (on) out.add(on); return out; }
  if (Array.isArray(o)) {
    o.forEach((v) => yollar(v, on ? on + '.#' : '#', out));
    if (!o.length && on) out.add(on);
    return out;
  }
  for (const k of Object.keys(o)) yollar(o[k], on ? on + '.' + k : k, out);
  return out;
}

const icerik = JSON.parse(fs.readFileSync(ICERIK, 'utf8'));
const kaynak = [...yollar(icerik)].sort();

/* admin.html'de gecen yol dizeleri: tirnak icindeki a.b / a.b.c kaliplari
   + sablonlu olanlar (`services.${i}.title` → services.#.title) */
const panelMetin = fs.readFileSync(PANEL, 'utf8');
const panelYollari = new Set();
/* YOL SABLONLA DA BASLAYABILIR (9 Eyl 2026, duzeltme). Ilk yazimda desen
   yalniz HARFLE baslayan yollari yakaliyordu; oysa panel dizi ogelerini
   `data-lines="${p}.act.tr"` gibi yaziyor — yol degiskenle basliyor.
   Sonuc: `sectors.#.act.tr` PANELDE BAGLIYKEN (admin.html:453) "eksik"
   raporlandi. Ayni tuzak 22 `services.#` alaninda da vardi.
   Artik `${...}` hem basta hem ortada kabul ediliyor. */
const re = /['"`]((?:\$\{[^}]+\}|[a-zA-Z][a-zA-Z0-9_]*)(?:\.(?:\$\{[^}]+\}|[a-zA-Z0-9_]+))+)['"`]/g;
let m;
while ((m = re.exec(panelMetin))) {
  panelYollari.add(m[1].replace(/\$\{[^}]+\}/g, '#').replace(/\.\d+/g, '.#'));
}
/* q+'.frame' gibi birlestirmeler: degisken onekli parcalari da topla */
const re2 = /\+\s*['"`]\.([a-zA-Z0-9_.]+)['"`]/g;
/* `p+'.del.tr'` gibi BIRLESTIRILMIS yollar: onek bir degisken oldugu icin
   metinde yalniz son parca gorunur. Hem `*.` onekli hem CIPLAK hali eklenir
   — ciplak hali olmadan `services.#.det.del.tr.#` eslesmiyordu ve alan
   PANELDE OLMASINA ragmen (admin.html `lines(...)`) eksik raporlaniyordu. */
while ((m = re2.exec(panelMetin))) { panelYollari.add('*.' + m[1]); panelYollari.add(m[1]); }

const sonEk = (y) => y.split('.').slice(-1)[0];
const panelSonEkleri = new Set([...panelYollari].map(sonEk));

/* `strings.*` BU ARACIN KAPSAMI DISINDA — hukum vermez.
   Panelin "Sabit metinler" sekmesi admin.html'e GOMULU haritadan beslenir
   (uretici: yeni/metin-harita.cjs), yani alanlar kaynak metninde duz yol
   olarak GECMEZ. Kaba tarama bunlari "eksik" sayip 375 sahte kirmizi
   uretiyordu. O hattin kendi denetimi var: P2 (harita taze mi · anahtarsiz
   M( yok · olu bilesen listesi gecerli) ve su an geciyor.                 */
const stringsSayisi = kaynak.filter((y) => y.startsWith('strings.')).length;
const eksik = [];
for (const y of kaynak) {
  if (y.startsWith('strings.')) continue;
  const nk = y.replace(/\.\d+/g, '.#');
  if (panelYollari.has(nk)) continue;
  /* DIZI BUTUN OLARAK YONETILIYOR OLABILIR (9 Eyl duzeltmesi).
     Kaynak ELEMAN yolu verir (`sectors.#.act.tr.#`), panel ise diziyi tek
     bir cok satirli kutuda yonetir (`data-lines="${p}.act.tr"`). Eleman
     yolunun `.#` eki atilmis hali panelde varsa alan BAGLIDIR.
     Ayrica panel yolu sablonla basladigi icin onek dusebilir
     (`${p}.act.tr` -> `#.act.tr`); o yuzden SON EK esleSmesi de kabul. */
  const dizisiz = nk.replace(/(\.#)+$/, '');
  if (dizisiz && dizisiz !== nk) {
    if (panelYollari.has(dizisiz)) continue;
    if ([...panelYollari].some((p) => dizisiz === p || dizisiz.endsWith('.' + p) || p.endsWith('.' + dizisiz))) continue;
  }
  if ([...panelYollari].some((p) => nk.endsWith('.' + p))) continue;
  /* dizi ogesinin alt alani: son iki parca eslesiyorsa bagli say */
  const son2 = nk.split('.').slice(-2).join('.');
  if ([...panelYollari].some((p) => p.endsWith('.' + son2) || p === son2)) continue;
  /* `*.frame` gibi birlestirilmis alanlar */
  if (panelSonEkleri.has(sonEk(nk))) continue;
  eksik.push(y);
}

/* OLU ANAHTARLAR — PANELE EKLENMEZ (9 Eyl 2026, nobetciyle olculdu).
   Bunlar content.json'da duruyor ama SITE HIC KULLANMIYOR: her birine
   nobetci deger konup derlendi, hicbiri dist'te gorunmedi (0 dosya).
   Panele alan acmak burada YANLIS YESIL uretirdi — Enes yazar, hicbir sey
   degismez; bu tam olarak denetimin P2 kuralindaki "olu bilesen anahtari"
   tuzagi. Dogru is ya kullanima baglamak ya content.json'dan temizlemek;
   ikisi de icerik karari, Enes'te.
   Kaynak taramasi tek basina yetmez (hesaplanan anahtari goremez) — bu
   liste NOBETCI ile dogrulanmistir. [[qanatone-anahtar-kullanimi-olculur]] */
const OLU = new Set([
  /* 1. tur (temizlendi, content.json'dan silindi) */
  'settings.assistant', 'settings.demoWa',
  'projects.#.imgk6', 'projects.#.imgk', 'projects.#.imgc',
  /* 2. tur — nobetciyle olculdu, uretimde 0 dosya. Iceride DURUYORLAR ama
     hicbir sayfaya girmiyorlar; panele alan acmak yanlis yesil olurdu.
     Temizlenmeleri ya da kullanima baglanmalari icerik karari (Enes). */
  'chimg.#', 'partners.#', 'services.#.det.story.tools',
  'services.#.fam', 'theme.motion.splash']);
const oluBulunan = eksik.filter((y) => OLU.has(y.replace(/\.\d+/g, '.#')));
for (let i = eksik.length - 1; i >= 0; i--) {
  if (OLU.has(eksik[i].replace(/\.\d+/g, '.#'))) eksik.splice(i, 1);
}

/* eksikleri ust dala gore grupla — tek tek 400 satir yerine okunur ozet */
const grup = new Map();
for (const e of eksik) {
  const g = e.split('.').slice(0, 2).join('.');
  grup.set(g, (grup.get(g) || 0) + 1);
}

console.log(`content.json yol sayisi (normalize) : ${new Set(kaynak.map((y) => y.replace(/\.\d+/g, '.#'))).size}`);
console.log(`panelde gecen yol dizesi           : ${panelYollari.size}`);
console.log(`strings.* (P2 denetiminde, kapsam disi): ${stringsSayisi}`);
console.log(`OLU anahtar (nobetciyle dogrulandi)   : ${oluBulunan.length}  ${oluBulunan.join(", ")}`);
console.log(`PANELE BAGLANMAMIS yol             : ${eksik.length}`);
if (eksik.length) {
  console.log('\nust dala gore (adet · dal):');
  [...grup.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
    .forEach(([g, n]) => console.log(`  ${String(n).padStart(4)} · ${g}`));
  console.log('\nornek (ilk 15):');
  eksik.slice(0, 15).forEach((e) => console.log('  ' + e));
}
fs.writeFileSync(path.join(__dirname, '_panel-kapsama.json'),
  JSON.stringify({ _: 'olc-panel-kapsama.cjs — kaynak metni taramasi; DOM degil.', olcum: new Date().toISOString(), kaynak_yol: kaynak.length, panel_yol: panelYollari.size, eksik }, null, 1));
console.log('\n-> yeni/film/_panel-kapsama.json');
