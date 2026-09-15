/* DESTE KURALI — TEK YER (15 Eyl 2026).
   Ana sayfa destesine hangi isin girecegini soyleyen kosul iki dosyada
   ayni olmak zorunda: `gorsel-uret.cjs` kunyeyi (deste-gorselleri.json)
   bu kosulla uretir, `denetim.cjs` H15 kunyeyi ve basilan desteyi ayni
   kosulla dogrular. Ayri yazilirlarsa biri degisip oteki kalinca H15
   yanlis yesil verir.

   Kosul: kapak gorseli (`image`) olan ve panelde "Ana sayfa destesinde
   goster" anahtari KAPALI olmayan is. Alan `deste`; anlam panelin `sw()`
   yardimcisiyla ayni: 0 / '0' / false kapali, alan hic yoksa ACIK.

   ONCEKI KURAL `image && !imgc` idi: kart logosu (`imgc`) tasiyan is
   destede yer almiyordu. Enes (15 Eyl 2026): "CMBlu Energy'yi kartlardan
   cikar, yerine Bab Ic Mimarlik gelsin". "Hangi is destede" sorusu artik
   logonun varligina degil kendi alanina bakiyor. Kart GORSELI ayri soru:
   `imgc` (kart logosu) varsa logo (deste + arsiv), yoksa `image`; proje
   sayfasinin kapagi her zaman `image` (Enes, ayni gun). */
const kapali = (v) => v === 0 || v === '0' || v === false;
const desteUygun = (p) => !!(p && p.image) && !kapali(p.deste);
module.exports = { desteUygun };
