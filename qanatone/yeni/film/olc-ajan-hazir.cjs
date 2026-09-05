#!/usr/bin/env node
/* AJAN HAZIRLIGI ENVANTERI (5 Eyl 2026).
   isitagentready.com / agent-ready.dev ailesinin aradigi ucları CANLI
   sitede tek tek yoklar. Hukum vermez, ENVANTER cikarir: hangisi var,
   hangisi yok, hangisi bizim icin anlamli.

   SON SUTUN BIR KARARDIR, tahmin degil: hangi uclarin BILEREK yapilmadigi
   ve neden, `yeni/ajan-hatti.mjs` basindaki KARAR KAYDI blogunda yazili.
   Ozet: arkasinda calisan bir sey olmayan kesif dosyasi yayinlanmaz —
   bos bir well-known puani yukseltir ama YALANDIR.

   Kaynak: agent-ready.dev/specs (C1-C22, S1-S15, L1-L10) ve
   isitagentready.com'un bes kategorisi.

   Kullanim: node yeni/film/olc-ajan-hazir.cjs [konak]
*/
const https = require('https');

const KONAK = process.argv[2] || 'https://www.qanatone.com';

/* [ad, yol, yontem, beklenen tur, bizim icin anlamli mi + gerekce] */
const UCLAR = [
  ['robots.txt', '/robots.txt', 'GET', /text\/plain/, 'VAR OLMALI'],
  ['sitemap.xml', '/sitemap.xml', 'GET', /xml/, 'VAR OLMALI'],
  ['llms.txt (kok)', '/llms.txt', 'GET', /text\/plain|markdown/, 'ANLAMLI'],
  ['llms.txt (.well-known)', '/.well-known/llms.txt', 'GET', /text\/plain|markdown/, 'ANLAMLI'],
  ['llms-full.txt', '/.well-known/llms-full.txt', 'GET', /text\/plain|markdown/, 'ANLAMLI'],
  ['MCP server card', '/.well-known/mcp.json', 'GET', /json/, 'SUNUCUMUZ YOK'],
  ['A2A agent card', '/.well-known/agent-card.json', 'GET', /json/, 'AJANIMIZ YOK'],
  ['agent-permissions', '/.well-known/agent-permissions.json', 'GET', /json/, 'ANLAMLI'],
  ['UCP', '/.well-known/ucp', 'GET', /json/, 'API YOK'],
  ['ACP (ticaret)', '/.well-known/acp.json', 'GET', /json/, 'SATIS YOK'],
  ['API catalog (RFC 9727)', '/.well-known/api-catalog', 'GET', /linkset|json/, 'API YOK'],
  ['Web Bot Auth dizini', '/.well-known/http-message-signatures-directory', 'GET', /json/, 'BIZ BOT DEGILIZ'],
  ['Agent Skills', '/.well-known/agent-skills/index.json', 'GET', /json/, 'ANLAMLI (ileride)'],
  ['OAuth korumali kaynak (9728)', '/.well-known/oauth-protected-resource', 'GET', /json/, 'AUTH YOK'],
  ['OAuth yetkilendirme (8414)', '/.well-known/oauth-authorization-server', 'GET', /json/, 'AUTH YOK'],
  ['auth.md', '/auth.md', 'GET', /markdown|text\/plain/, 'AUTH YOK'],
  ['agents.md', '/agents.md', 'GET', /markdown|text\/plain/, 'ANLAMLI'],
  ['NLWeb /ask', '/ask', 'POST', /json/, 'API YOK'],
];

const iste = (yol, yontem) => new Promise((coz) => {
  const u = new URL(KONAK + yol);
  const r = https.request({ hostname: u.hostname, path: u.pathname, method: yontem,
    headers: { 'user-agent': 'QanatoneAgentReady/1.0', accept: '*/*' } }, (y) => {
    let n = 0;
    y.on('data', (c) => { n += c.length; });
    y.on('end', () => coz({ kod: y.statusCode, tur: y.headers['content-type'] || '', bayt: n,
      link: y.headers.link || '', cs: y.headers['content-signal'] || '' }));
  });
  r.on('error', () => coz({ kod: 0, tur: '', bayt: 0 }));
  r.setTimeout(15000, () => { r.destroy(); coz({ kod: 0, tur: '', bayt: 0 }); });
  r.end();
});

(async () => {
  console.log('AJAN HAZIRLIGI ENVANTERI · ' + KONAK + '\n');
  let var_ = 0, yok = 0;
  for (const [ad, yol, yontem, tur, not] of UCLAR) {
    const y = await iste(yol, yontem);
    const gecti = y.kod >= 200 && y.kod < 300 && tur.test(y.tur);
    if (gecti) var_++; else yok++;
    console.log(`${gecti ? ' VAR ' : ' YOK '} ${ad.padEnd(30)} ${String(y.kod).padEnd(4)}`
      + `${(y.tur.split(';')[0] || '-').padEnd(26)} ${not}`);
  }
  /* Ana sayfanin kendi sinyalleri */
  const ana = await iste('/', 'GET');
  console.log('\nANA SAYFA BASLIKLARI');
  console.log('  Content-Signal : ' + (ana.cs || 'YOK'));
  console.log('  Link           : ' + (ana.link ? ana.link.slice(0, 120) + '…' : 'YOK'));
  console.log(`\nOZET: ${var_} var · ${yok} yok`);
})();
