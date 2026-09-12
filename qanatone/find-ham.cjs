const fs = require('fs');
const path = require('path');
const vm = require('vm');

const KOK = '.';
const panel = fs.readFileSync(path.join(KOK, 'admin.html'), 'utf8');
const m = /\/\*BLOK-METIN-BAS\*\/([\s\S]*?)\/\*BLOK-METIN-SON\*\//.exec(panel);
const ortam = { esc: s => String(s == null ? '' : s).replace(/&/g, '&').replace(/</g, '<').replace(/"/g, '"') };
vm.createContext(ortam);
vm.runInContext(m[1], ortam);
const { htmlToBloklar } = ortam;

const bolumler = [];
for (const kol of ['yazilar', 'nedir', 'haber']) {
  const d = path.join(KOK, 'icerik', kol);
  if (!fs.existsSync(d)) continue;
  for (const a of fs.readdirSync(d).filter(x => x.endsWith('.json'))) {
    const j = JSON.parse(fs.readFileSync(path.join(d, a), 'utf8'));
    for (const dil of ['tr', 'en'])
      for (const b of ((j.body || {})[dil] || [])) bolumler.push({ ad: kol + '/' + a + '/' + dil, html: b[1] || '' });
  }
}
const c = JSON.parse(fs.readFileSync(path.join(KOK, 'content.json'), 'utf8'));
for (const pr of (c.projects || []))
  for (const dil of ['tr', 'en'])
    for (const b of ((pr.blocks || {})[dil] || [])) bolumler.push({ ad: 'proje/' + pr.slug + '/' + dil, html: b[1] || '' });

for (const b of bolumler) {
  const bl = htmlToBloklar(b.html);
  if (bl.some(x => x.t === 'ham')) {
    console.log('HAM:', b.ad);
    console.log('HTML:', b.html.substring(0, 200));
    console.log('BLOCKS:', JSON.stringify(bl, null, 2));
    console.log('---');
  }
}