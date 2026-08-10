/* Netlify derlemeleri arasinda .onbellek klasorunu tasir.
   build.js oradaki manifest ve onceki dist ciktisini okuyup degismeyen
   sayfalari yeniden render etmeden kopyaliyor. */
module.exports = {
  async onPreBuild({ utils }) { await utils.cache.restore('.onbellek'); },
  async onPostBuild({ utils }) { await utils.cache.save('.onbellek'); }
};
