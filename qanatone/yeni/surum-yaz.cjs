#!/usr/bin/env node
/* SURUM DAMGASI — dist/surum.json (TUR 9, 3 Eyl 2026).
   Netlify derleme zincirinin SON adimi (netlify.toml build.command).

   NEDEN VAR: Netlify GitHub'a derleme sonucunu yazmiyor (check-suite
   sonsuz "queued", commit status 0, deployment 0) ve bu makinede Netlify
   oturumu yok. Bir deploy'un gercekten hangi commit'ten ciktigi ve
   medya kurulumunun CI'da kac saniye surdugu yayindaki
   /yeni/surum.json'dan okunur. Sir girmez: commit, dal, baglam, Node
   surumu, tarih, medya damgasinin sayilari.

   Kaynaklar: Netlify ortam degiskenleri (COMMIT_REF, BRANCH, CONTEXT,
   DEPLOY_ID) varsa onlar; yoksa git dosyalari dogrudan okunur (komut
   kosturulmaz): <git kok>/.git/HEAD -> refs/heads/<dal> ya da
   packed-refs. */
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');                      /* qanatone/ */
const gitOku = () => {
  let dir = KOK;
  for (let i = 0; i < 4; i++) {
    const g = path.join(dir, '.git');
    if (fs.existsSync(g)) {
      try {
        const head = fs.readFileSync(path.join(g, 'HEAD'), 'utf8').trim();
        const m = head.match(/^ref: (.+)$/);
        if (!m) return { commit: head, dal: 'ayrik' };
        const refY = path.join(g, m[1]);
        let commit = fs.existsSync(refY) ? fs.readFileSync(refY, 'utf8').trim() : '';
        if (!commit && fs.existsSync(path.join(g, 'packed-refs'))) {
          const p = fs.readFileSync(path.join(g, 'packed-refs'), 'utf8').match(new RegExp('^([0-9a-f]{40}) ' + m[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'm'));
          commit = p ? p[1] : '';
        }
        return { commit, dal: m[1].replace(/^refs\/heads\//, '') };
      } catch (e) { return { commit: '', dal: '' }; }
    }
    dir = path.dirname(dir);
  }
  return { commit: '', dal: '' };
};

const git = gitOku();
let medya = null;
try {
  const D = JSON.parse(fs.readFileSync(path.join(__dirname, 'film', '.medya-kurulum.json'), 'utf8'));
  delete D._; delete D.manifest_sha1; medya = D;
} catch (e) { /* damga yok: kur-medya kosmadi (denetim zaten kirmizi) */ }

const S = {
  _: 'yeni/surum-yaz.cjs yazar — yayindaki derlemenin kimligi (CI gozlemi icin; sir icermez)',
  commit: process.env.COMMIT_REF || git.commit,
  dal: process.env.BRANCH || git.dal,
  baglam: process.env.CONTEXT || 'yerel',
  deploy_id: process.env.DEPLOY_ID || null,
  node: process.version,
  tarih: new Date().toISOString(),
  medya,
};
const y = path.join(KOK, 'dist', 'surum.json');
if (!fs.existsSync(path.dirname(y))) { console.error('dist yok — surum.json yazilamadi'); process.exit(1); }
fs.writeFileSync(y, JSON.stringify(S, null, 1));
console.log(`surum.json: ${String(S.commit).slice(0, 7)} · ${S.dal} · ${S.baglam} · node ${S.node}` +
  (medya ? ` · medya ${medya.yol}` + (medya.toplam_sn != null ? ` ${medya.toplam_sn} sn` : '') : ' · medya damgasi YOK'));
