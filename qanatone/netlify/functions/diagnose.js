/* netlify/functions/diagnose.js
   ---------------------------------------------------------------------
   Sitedeki "canlı kontrol" aracının sunucu tarafı.

   Ön yüzün beklediği cevap:
     { ok:true, host, finalUrl, score, ms, kb, items:[{k,state,v}] }
     { ok:false, reason:'timeout' | 'unreachable' | 'blocked' }

   Tarayıcı bu isteği doğrudan atamaz (CORS), o yüzden sunucudan yapılıyor.
   Başsız tarayıcı yok — HTML metin olarak alınıp inceleniyor. Bu, gerçek
   render süresini değil ilk yanıt + indirme süresini ölçer; abartmamak için
   ön yüzde "açılış" diye geçiyor, "Lighthouse skoru" demiyoruz.

   GÜVENLİK: burası herkese açık ve dışarıya istek atan bir uç nokta.
   İç ağa sızmayı (SSRF) engellemek için şema, port ve çözümlenen IP
   denetleniyor; yanıt boyutu ve süre sınırlı.
   --------------------------------------------------------------------- */

const dns = require('dns').promises;

const TIMEOUT_MS = 9000;
const MAX_REDIRECT = 3;
const MAX_BYTES = 2 * 1024 * 1024;
const UA = 'QanatoneSiteCheck/1.0 (+https://qanatone.com)';

/* --- ağırlıklar: toplam 100 --- */
const W = {
  https: 8, status: 6, speed: 8, weight: 4, title: 7, desc: 7, h1: 4,
  canonical: 4, lang: 3, schema: 10, og: 5, viewport: 8, alt: 4,
  contact: 7, whatsapp: 5, local: 4, analytics: 4, robots: 1, sitemap: 1
};

/* ---------- SSRF koruması ---------- */
function isPrivate(ip) {
  if (ip.includes(':')) {                      // IPv6
    const l = ip.toLowerCase();
    return l === '::1' || l.startsWith('fc') || l.startsWith('fd') ||
           l.startsWith('fe80') || l.startsWith('::ffff:');
  }
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p;
  return a === 0 || a === 10 || a === 127 ||
         (a === 169 && b === 254) ||
         (a === 172 && b >= 16 && b <= 31) ||
         (a === 192 && b === 168) ||
         (a === 100 && b >= 64 && b <= 127) ||
         a >= 224;
}

async function safeUrl(raw) {
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw); }
  catch (e) { return null; }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (u.port && !['80', '443', ''].includes(u.port)) return null;
  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.local') || host.endsWith('.internal')) return null;
  try {
    const addrs = await dns.lookup(host, { all: true });
    if (!addrs.length || addrs.some(a => isPrivate(a.address))) return null;
  } catch (e) { return null; }
  return u;
}

/* ---------- sınırlı, süreli indirme ---------- */
async function grab(url, method) {
  const ac = new AbortController();
  const t = setTimeout(() => ac.abort(), TIMEOUT_MS);
  const started = Date.now();
  try {
    /* GÜVENLİK — yönlendirmeler elle takip ediliyor.
       redirect:'follow' iken SSRF denetimi YALNIZCA ilk adrese uygulanıyordu:
       saldırgan kendi alan adını verip (genel IP, denetimden geçer) sunucuyu
       302 ile http://169.254.169.254/ gibi bir iç adrese yollayabiliyordu ve
       o cevabın başlık/açıklama parçaları JSON'da geri dönüyordu.
       Şimdi her adım safeUrl() ile yeniden doğrulanıyor.
       KALAN RİSK — DNS yeniden bağlama: safeUrl'in çözdüğü IP ile fetch'in
       çözdüğü IP arasında saniyeler var; saldırgan çok kısa TTL ile ikisini
       farklılaştırabilir. Tam çözüm IP'ye bağlanıp Host başlığı göndermek,
       o da TLS sertifika doğrulamasını bozuyor. Bilinçli olarak kabul edildi. */
    let hedef = url, r = null;
    for (let hop = 0; ; hop++) {
      r = await fetch(hedef, {
        method: method || 'GET', redirect: 'manual', signal: ac.signal,
        headers: { 'user-agent': UA, accept: 'text/html,*/*' }
      });
      if (r.status < 300 || r.status >= 400) break;
      const loc = r.headers.get('location');
      if (!loc) break;
      if (hop >= MAX_REDIRECT) { const e = new Error('too many redirects'); e.name = 'BlockedRedirect'; throw e; }
      let sonraki = null;
      try { sonraki = await safeUrl(new URL(loc, hedef).href); } catch (e) {}
      if (!sonraki) { const e = new Error('redirect blocked'); e.name = 'BlockedRedirect'; throw e; }
      hedef = sonraki.href;
    }
    let body = '';
    if (method !== 'HEAD') {
      const buf = await r.arrayBuffer();
      body = Buffer.from(buf.slice(0, MAX_BYTES)).toString('utf8');
      return { r, body, bytes: buf.byteLength, ms: Date.now() - started, finalUrl: hedef };
    }
    return { r, body: '', bytes: 0, ms: Date.now() - started, finalUrl: hedef };
  } finally { clearTimeout(t); }
}

/* ---------- tek bir kontrolün sonucu ---------- */
const S = (k, state, v) => ({ k, state, v: v === undefined ? '' : String(v) });
const band = (n, okMax, warnMax) => n <= okMax ? 'ok' : n <= warnMax ? 'warn' : 'fail';
const between = (n, lo, hi) => n >= lo && n <= hi;

function analyse(html, res, ms, bytes, finalUrl) {
  const h = html;
  const low = h.toLowerCase();
  const head = low.slice(0, 60000);
  const items = [];

  items.push(S('https', finalUrl.startsWith('https://') ? 'ok' : 'fail'));
  items.push(S('status', res.status >= 200 && res.status < 300 ? 'ok'
    : res.status < 400 ? 'warn' : 'fail'));
  items.push(S('speed', band(ms, 1500, 3500), ms));

  const kb = Math.round(bytes / 1024);
  items.push(S('weight', band(kb, 500, 1500), kb));

  const title = (h.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1]
    .replace(/\s+/g, ' ').trim();
  items.push(S('title', title ? (between(title.length, 25, 65) ? 'ok'
    : between(title.length, 10, 80) ? 'warn' : 'fail') : 'fail', title.length));

  const desc = (h.match(/<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)["']/i) ||
                h.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i) ||
                [, ''])[1].trim();
  items.push(S('desc', desc ? (between(desc.length, 70, 165) ? 'ok'
    : between(desc.length, 30, 200) ? 'warn' : 'fail') : 'fail', desc.length));

  const h1 = (h.match(/<h1[\s>]/gi) || []).length;
  items.push(S('h1', h1 === 1 ? 'ok' : h1 === 2 ? 'warn' : 'fail', h1));

  items.push(S('canonical', /rel=["']canonical["']/i.test(head) ? 'ok' : 'warn'));
  items.push(S('lang', /<html[^>]+lang=["'][a-z]{2}/i.test(head) ? 'ok' : 'fail'));

  const ld = /type=["']application\/ld\+json["']/i.test(low);
  items.push(S('schema', ld ? 'ok' : /itemscope|itemtype=/i.test(low) ? 'warn' : 'fail'));

  const ogT = /property=["']og:title["']/i.test(head);
  const ogI = /property=["']og:image["']/i.test(head);
  items.push(S('og', ogT && ogI ? 'ok' : (ogT || ogI) ? 'warn' : 'fail'));

  items.push(S('viewport', /name=["']viewport["'][^>]*width=device-width/i.test(head) ? 'ok' : 'fail'));

  const imgs = h.match(/<img\b[^>]*>/gi) || [];
  const noAlt = imgs.filter(t => !/\balt\s*=/i.test(t)).length;
  items.push(S('alt', imgs.length === 0 ? 'warn' : band(noAlt, 0, 2), noAlt));

  const wa = /wa\.me\/|api\.whatsapp\.com|whatsapp:\/\//i.test(low);
  const tel = /href=["']tel:/i.test(low);
  const mail = /href=["']mailto:/i.test(low);
  const form = /<form\b/i.test(low) && /type=["']email["']|name=["'](email|mail|eposta)["']/i.test(low);
  const ways = [wa, tel, mail, form].filter(Boolean).length;
  items.push(S('contact', ways >= 2 ? 'ok' : ways === 1 ? 'warn' : 'fail', ways));
  items.push(S('whatsapp', wa ? 'ok' : 'warn'));

  const local = /maps\.google|google\.com\/maps|maps\.app\.goo\.gl|"@type"\s*:\s*"[^"]*LocalBusiness/i.test(low);
  items.push(S('local', local ? 'ok' : 'warn'));

  const anal = /googletagmanager\.com|google-analytics\.com|gtag\(|plausible\.io|matomo|mc\.yandex|connect\.facebook\.net|clarity\.ms/i.test(low);
  items.push(S('analytics', anal ? 'ok' : 'fail'));

  return items;
}

function score(items) {
  let got = 0, tot = 0;
  items.forEach(i => {
    const w = W[i.k]; if (!w) return;
    tot += w;
    got += i.state === 'ok' ? w : i.state === 'warn' ? w * 0.5 : 0;
  });
  return tot ? Math.round(got / tot * 100) : 0;
}

exports.handler = async (event) => {
  const H = { 'content-type': 'application/json', 'cache-control': 'no-store' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers: H, body: '{"ok":false}' };

  let raw = '';
  try { raw = String((JSON.parse(event.body || '{}').url) || '').trim(); } catch (e) {}
  if (!raw) return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, reason: 'unreachable' }) };

  const u = await safeUrl(raw);
  if (!u) return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, reason: 'blocked' }) };

  let page;
  try { page = await grab(u.href); }
  catch (e) {
    const reason = (e && e.name === 'AbortError') ? 'timeout'
                 : (e && e.name === 'BlockedRedirect') ? 'blocked' : 'unreachable';
    return { statusCode: 200, headers: H, body: JSON.stringify({ ok: false, reason }) };
  }

  /* redirect:'manual' olduğu için r.url son adresi vermez; grab kendi takip
     ettiği son adresi finalUrl olarak döndürüyor.                        */
  const finalUrl = page.finalUrl || u.href;
  const items = analyse(page.body, page.r, page.ms, page.bytes, finalUrl);

  /* robots.txt ve site haritası — bulunamazsa uyarı, hata değil */
  const origin = new URL(finalUrl).origin;
  let robotsBody = '';
  try {
    const rb = await grab(origin + '/robots.txt');
    const okR = rb.r.ok && /user-agent/i.test(rb.body);
    robotsBody = rb.body || '';
    items.push(S('robots', okR ? 'ok' : 'warn'));
  } catch (e) { items.push(S('robots', 'warn')); }

  try {
    if (/sitemap:/i.test(robotsBody)) items.push(S('sitemap', 'ok'));
    else {
      const sm = await grab(origin + '/sitemap.xml', 'HEAD');
      items.push(S('sitemap', sm.r.ok ? 'ok' : 'warn'));
    }
  } catch (e) { items.push(S('sitemap', 'warn')); }

  return {
    statusCode: 200, headers: H,
    body: JSON.stringify({
      ok: true,
      host: u.hostname,
      finalUrl,
      score: score(items),
      ms: page.ms,
      kb: Math.round(page.bytes / 1024),
      items
    })
  };
};
