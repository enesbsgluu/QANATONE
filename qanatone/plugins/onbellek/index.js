/* Artimli derleme onbellegi (Netlify build plugin, utils.cache).
   .onbellek: kok build.js'in sayfa onbellegi — yoksa her yayinda 58 sayfa
   bastan render edilir (~100 sn).
   yeni/public/varlik/film (TUR 9, 3 Eyl 2026): 680 MB film medyasi git
   disi; ilk derlemede kur-medya.cjs uzaktan (GitHub Release) indirir,
   sonraki derlemelerde buradan geri gelir ve kur-medya yalniz sha1
   dogrular (~2 sn). Onbellek KAYNAK DEGILDIR: bos gelirse kur-medya
   indirir; bozuk gelirse sha1 tutmaz, dosya silinir, yeniden indirilir.
   Damga (.medya-kurulum.json) bu dizinde DEGIL — her derlemede yeniden
   yazilir, onbellekten bayat damga gelmez. */
const DIZINLER = ['.onbellek', 'yeni/public/varlik/film'];
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
