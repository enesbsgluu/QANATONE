#!/usr/bin/env node
/* AJAN HAZIRLIGI — SAHA DAGILIMI (6 Eyl 2026).

   NICIN VAR: araca ikinci bir skor (ajan hazirligi ekseni) konacak ve bu
   deponun kurali "olcmedigin rakami yazma". Kalemleri ve bantlari
   sahadaki dagilimdan turetmek icin gercek sitelerde OLCUM gerekiyor —
   kapi B'nin esiklerinin 27 soguk kosumdan turetilmesiyle ayni yontem.
   Bu arac HUKUM VERMEZ, dagilim cikarir.

   NEYI OLCER (her biri, ajanin gercekten yaptigi bir seye karsilik gelir):
     jssiz   · ham HTML'de gorunur metin — AI tarayicilarinin cogu JS
               KOSTURMAZ (GPTBot, ClaudeBot, Perplexity; istisna Gemini).
               Bir SPA kabugu ajana bos sayfa gosterir.
     aibot   · robots.txt AI ajanlarini engelliyor mu (en agir sinyal:
               engelliyorsa oteki her sey anlamsiz)
     csignal · Content-Signal (baslik ya da robots.txt satiri)
     mdlink  · markdown esi ILAN EDILIYOR mu (Link basligi ya da <link>)
     mdesi   · ilan edilen (ya da tahmin edilen) .md esi GERCEKTEN iniyor mu
     llms    · llms.txt (kok ya da .well-known) ve ICI DOLU mu
     agents  · agents.md ve ici dolu mu
     schema  · ham HTML'de ld+json
     sitemap · robots.txt'de bildirilmis ya da /sitemap.xml var

   ILAN != VARLIK: her uc icin hem "ilan" hem "gercekten iniyor" ayri
   yazilir. Bos bir well-known puani yukseltir ama YALANDIR — eksen bunu
   odullendirmemeli, ve odullendirip odullendirmedigi ancak ikisi ayri
   olculurse gorulur.

   Kullanim: node yeni/film/olc-ajan-saha.cjs [> olc-ajan-saha.json]
   Cevre   : ESZAMAN=5 · ZAMAN_ASIMI=12000 · LISTE=a.com,b.com
*/
const fs = require('fs');
const path = require('path');

const ESZAMAN = Number(process.env.ESZAMAN || 5);
const ZAMAN_ASIMI = Number(process.env.ZAMAN_ASIMI || 12000);
const UA = 'QanatoneAgentReady/1.0 (+https://qanatone.com)';

/* Ornek: aracin gercek kitlesi TURK KOBI'si, ama eksenin UST UCU da
   gorunmeli — llms.txt'i gercekten olan siteler ayri bir kumede. */
const TURK = [
  'hepsiburada.com', 'trendyol.com', 'n11.com', 'ciceksepeti.com', 'migros.com.tr',
  'a101.com.tr', 'yemeksepeti.com', 'arcelik.com.tr', 'vestel.com.tr', 'turkcell.com.tr',
  'thy.com', 'isbank.com.tr', 'garantibbva.com.tr', 'acibadem.com.tr', 'memorial.com.tr',
  'koctas.com.tr', 'defacto.com.tr', 'teknosa.com', 'mediamarkt.com.tr', 'eksisozluk.com',
  'webrazzi.com', 'sahibinden.com', 'r10.net', 'sabah.com.tr',
];
const REFERANS = [
  'anthropic.com', 'stripe.com', 'vercel.com', 'cloudflare.com', 'supabase.com',
  'zapier.com', 'github.com', 'wikipedia.org',
];
const BIZ = ['qanatone.com'];

const AI_BOTLAR = ['gptbot', 'claudebot', 'perplexitybot', 'ccbot', 'google-extended', 'anthropic-ai', 'bytespider', 'applebot-extended'];

async function al(url, yontem = 'GET') {
  const ac = new AbortController();
  const z = setTimeout(() => ac.abort(), ZAMAN_ASIMI);
  try {
    const r = await fetch(url, { method: yontem, redirect: 'follow', signal: ac.signal,
      headers: { 'user-agent': UA, accept: '*/*' } });
    const govde = yontem === 'HEAD' ? '' : (await r.text()).slice(0, 400000);
    return { kod: r.status, tur: r.headers.get('content-type') || '', link: r.headers.get('link') || '',
      cs: r.headers.get('content-signal') || '', govde, son: r.url };
  } catch (e) {
    return { kod: 0, tur: '', link: '', cs: '', govde: '', hata: String((e && e.message) || e).slice(0, 60) };
  } finally { clearTimeout(z); }
}

/* HAM HTML'DE GORUNUR METIN — betikler, stiller ve etiketler dusuldukten
   sonra kalan karakter. Ajanin JS kosturmadan GORDUGU sey budur. */
function gorunurMetin(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length;
}

/* Ici dolu mu: bos bir dosya "var" sayilmamali. Olcut iki sart —
   makul bir boy VE en az bir baglanti/baslik satiri. */
function iciDolu(metin) {
  const t = (metin || '').trim();
  return t.length >= 200 && (/\]\(|https?:\/\//.test(t) || /^#/m.test(t));
}

async function siteOlc(konak) {
  const kok = 'https://' + konak;
  const ana = await al(kok + '/');
  if (!ana.kod) return { konak, ulasilamadi: ana.hata || 'ag' };

  const html = ana.govde || '';
  const metin = gorunurMetin(html);
  const bayt = Buffer.byteLength(html);

  const rb = await al(kok + '/robots.txt');
  const robots = rb.kod >= 200 && rb.kod < 300 ? rb.govde : '';

  /* robots.txt'de AI botu engeli: ilgili user-agent blogunda Disallow: / */
  let aiEngel = [];
  if (robots) {
    const bloklar = robots.split(/\n(?=\s*user-agent:)/i);
    for (const b of bloklar) {
      const ua = (b.match(/user-agent:\s*([^\n\r]+)/i) || [, ''])[1].trim().toLowerCase();
      if (!AI_BOTLAR.includes(ua) && ua !== '*') continue;
      if (/disallow:\s*\/\s*$/im.test(b)) aiEngel.push(ua);
    }
  }

  /* markdown esi ILANI — Link basligi ya da <link rel=alternate> */
  const mdIlanBaslik = /type="?text\/markdown"?/i.test(ana.link) || /text\/markdown/i.test(ana.link);
  const mdIlanHtml = /<link[^>]+rel=["']?alternate["']?[^>]*type=["']?text\/markdown/i.test(html)
    || /<link[^>]+type=["']?text\/markdown[^>]*rel=["']?alternate/i.test(html);
  /* ilan edilen adresi cikarmaya calis; yoksa /index.md dene */
  let mdAdres = null;
  const mLink = ana.link.match(/<([^>]+)>[^,]*text\/markdown/i);
  const mHtml = html.match(/<link[^>]+type=["']?text\/markdown["']?[^>]*href=["']([^"']+)["']/i)
    || html.match(/<link[^>]+href=["']([^"']+)["'][^>]*type=["']?text\/markdown/i);
  if (mLink) mdAdres = mLink[1];
  else if (mHtml) mdAdres = new URL(mHtml[1], kok + '/').href;
  const mdDenenen = mdAdres || (kok + '/index.md');
  const md = await al(mdDenenen);
  const mdIner = md.kod >= 200 && md.kod < 300 && /markdown|text\/plain/i.test(md.tur) && md.govde.trim().length > 100;

  const llmsKok = await al(kok + '/llms.txt');
  let llms = llmsKok;
  if (!(llms.kod >= 200 && llms.kod < 300)) llms = await al(kok + '/.well-known/llms.txt');
  const llmsVar = llms.kod >= 200 && llms.kod < 300 && /text\/plain|markdown/i.test(llms.tur);
  const llmsDolu = llmsVar && iciDolu(llms.govde);

  const ag = await al(kok + '/agents.md');
  const agentsVar = ag.kod >= 200 && ag.kod < 300 && /markdown|text\/plain/i.test(ag.tur);
  const agentsDolu = agentsVar && iciDolu(ag.govde);

  return {
    konak,
    kod: ana.kod,
    html_bayt: bayt,
    gorunur_metin: metin,
    metin_orani: bayt ? +(metin / bayt).toFixed(4) : 0,
    ai_engel: aiEngel,
    content_signal: ana.cs || (/content-signal:/i.test(robots) ? 'robots' : ''),
    schema: /application\/ld\+json/i.test(html),
    robots_var: !!robots,
    sitemap: /sitemap:/i.test(robots),
    md_ilan: !!(mdIlanBaslik || mdIlanHtml),
    md_adres: mdAdres,
    md_iner: mdIner,
    md_kod: md.kod,
    llms_var: llmsVar, llms_dolu: llmsDolu, llms_bayt: llmsVar ? llms.govde.length : 0,
    agents_var: agentsVar, agents_dolu: agentsDolu,
  };
}

(async () => {
  const liste = process.env.LISTE ? process.env.LISTE.split(',').map((s) => s.trim())
    : [...TURK, ...REFERANS, ...BIZ];
  const sonuc = [];
  let i = 0;
  async function isci() {
    while (i < liste.length) {
      const k = liste[i++];
      const t = Date.now();
      const r = await siteOlc(k);
      r.ms = Date.now() - t;
      sonuc.push(r);
      const e = r.ulasilamadi ? 'ULASILAMADI ' + r.ulasilamadi
        : `${String(r.kod).padEnd(4)} metin ${String(r.gorunur_metin).padStart(6)} (%${(r.metin_orani * 100).toFixed(1)})`
          + ` · aiEngel ${r.ai_engel.length ? r.ai_engel.join('/') : '-'} · md ${r.md_ilan ? 'ilan' : '-'}/${r.md_iner ? 'iner' : '-'}`
          + ` · llms ${r.llms_dolu ? 'DOLU' : r.llms_var ? 'bos' : '-'} · agents ${r.agents_dolu ? 'DOLU' : r.agents_var ? 'bos' : '-'}`
          + ` · cs ${r.content_signal || '-'} · schema ${r.schema ? '+' : '-'}`;
      console.log(k.padEnd(22) + e);
    }
  }
  await Promise.all(Array.from({ length: ESZAMAN }, isci));
  sonuc.sort((a, b) => liste.indexOf(a.konak) - liste.indexOf(b.konak));
  const cikti = path.join(__dirname, process.env.CIKTI || 'olc-ajan-saha.json');
  fs.writeFileSync(cikti, JSON.stringify({
    _: 'AJAN HAZIRLIGI SAHA DAGILIMI — ikinci skorun kalemleri ve bantlari bu dagilimdan turetilir. Hukum yok, envanter.',
    olcum: new Date().toISOString(), ua: UA,
    kume: { turk: TURK.length, referans: REFERANS.length, biz: BIZ.length },
    site: sonuc,
  }, null, 1));
  console.log('\n→ ' + cikti);
})();
