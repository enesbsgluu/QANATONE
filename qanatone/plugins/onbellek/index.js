/* Artimli derleme onbellegi (Netlify build plugin, utils.cache).

   `.onbellek` DUSTU (5 Eyl 2026). Kok `build.js`in sayfa onbellegiydi,
   ama KESME Adim 2'de (6 Eyl planı, uygulandi) `node build.js` derleme
   zincirinden cikti — netlify.toml'un YURURLUKTEKI komutunda 0 gecis
   (olculdu). Yani her derlemede 4,6 MB / 59 dosya, koşmayan bir adim
   icin geri yuklenip yeniden kaydediliyordu. Tek tuketicisi build.js
   oldugu icin dusurmek guvenli; build.js ELDE kosulursa sayfalari
   bastan render eder, bedeli yalniz o manuel kosumdadir.

   yeni/public/varlik/film (TUR 9, 3 Eyl 2026): 680 MB film medyasi git
   disi; ilk derlemede kur-medya.cjs uzaktan (GitHub Release) indirir,
   sonraki derlemelerde buradan geri gelir ve kur-medya yalniz sha1
   dogrular (~2 sn). Onbellek KAYNAK DEGILDIR: bos gelirse kur-medya
   indirir; bozuk gelirse sha1 tutmaz, dosya silinir, yeniden indirilir.
   Damga (.medya-kurulum.json) bu dizinde DEGIL — her derlemede yeniden
   yazilir, onbellekten bayat damga gelmez. */
const DIZINLER = ['yeni/public/varlik/film'];
module.exports = {
  async onPreBuild({ utils }) {
    for (const d of DIZINLER) {
      const t = Date.now();
      const ok = await utils.cache.restore(d);
      console.log(`onbellek: ${d} ${ok ? 'geri yuklendi' : 'yok (ilk derleme ya da temizlenmis)'} · ${((Date.now() - t) / 1000).toFixed(1)} sn`);
    }
  },
  async onPostBuild({ utils }) {
    for (const d of DIZINLER) {
      const t = Date.now();
      const ok = await utils.cache.save(d);
      console.log(`onbellek: ${d} ${ok ? 'kaydedildi' : 'kaydedilmedi'} · ${((Date.now() - t) / 1000).toFixed(1)} sn`);
    }
  },
};
