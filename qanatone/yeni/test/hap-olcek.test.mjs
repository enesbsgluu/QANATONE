/* HAP DUGME DOLGU OLCEGI BEKCISI (TUR 9 T7, 3 Eyl 2026)
   MIMARI-DENETIM T7: hap (border-radius:999px) DUGME dolgusu 9 kuralda 8
   ayri degerdi, olcek yoktu. Bu tur "gorunen sonuc birebir ayni" kapisiyla
   kosuldugu icin piksel DEGISTIRILMEDI: olcek uc kademe token olarak
   temel.css :root'a girdi (cagri 14/26 · kompakt 10/18 · cip 8/16), olcekte
   ZATEN olan siniflar tokena baglandi, olcek disi kalan besi ADIYLA istisna
   listesinde duruyor (tasinmalari piksel degistirir: yan yana kare +
   Enes karari). Bekci uc seyi kilitler:
     1) :root'ta alti token var ve degerleri kademe tablosuyla ayni;
     2) OLCEKTEKI siniflar literal degil var(--hap-*) kullanir;
     3) ISTISNALAR tam olarak listedeki literali tasir — sessizce ne olcege
        girer ne baska bir degere kayar (ikisi de yazili karar ister);
     4) stil/*.css'te 999px + font-weight 600/700 tasiyan (dugme gorunumlu)
        yeni bir kural literal dolguyla dogamaz (yorumlar ayiklanir).
   Cip/rozet/demo hapları (.kdsc, .sh-rozet, .nv-lang a, .qtchip ...) T9/T10
   kalemidir, bu bekcinin konusu degil. */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const KOK = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const oku = (p) => fs.readFileSync(path.join(KOK, 'src', p), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const temel = oku('stil/temel.css');

const KADEME = { 'hap-y1': '14px', 'hap-x1': '26px', 'hap-y2': '10px', 'hap-x2': '18px', 'hap-y3': '8px', 'hap-x3': '16px' };
/* olcekteki siniflar: dosya, secici (blok basi), beklenen token cifti */
const OLCEKTE = [
  ['stil/hero.css', '.sh-btn{', 'var(--hap-y1) var(--hap-x1)'],
  ['stil/nav.css', '.nv-cta{', 'var(--hap-y2) var(--hap-x2)'],
  ['stil/nav.css', '.nv-mlg a{', 'var(--hap-y3) var(--hap-x3)'],
  ['stil/temel.css', '.atla{', 'var(--hap-y2) var(--hap-x2)'],
  ['parcalar/HizmetGovde.astro', '.sdbtns .dugme {', 'var(--hap-y1) var(--hap-x1)'],
  /* sadakat turu (3 Eyl): kaynak .btn / .btn-g 14/26 .92rem — .dugme ve .sil-ikincil olcege girdi */
  ['stil/temel.css', '.dugme{', 'var(--hap-y1) var(--hap-x1)'],
  ['stil/iletisim.css', '.sil-ikincil{', 'var(--hap-y1) var(--hap-x1)'],
];
/* olcek DISI istisnalar: literal aynen durmali (tasinmasi Enes karari) */
const ISTISNA = [
  ['stil/hero.css', '.sh-void{', '14px 30px', 'kaynak .void 14/30 birebir (sadakat)'],
  ['stil/kabuk.css', '.kb-say .acts button{', '8px 14px', 'ajan balonu dugmeleri'],
  ['stil/deste.css', '.sp-tum{', '13px 26px', 'deste "tum projeler" (kaynak .btn.btn-g)'],
  ['parcalar/HizmetGovde.astro', '.sdbtns .dugme.koyu {', '15px 32px', 'hizmet detayi koyu cagri (.shiny kaynagi)'],
];

const blok = (kaynak, secici) => {
  const i = kaynak.indexOf(secici);
  assert.ok(i >= 0, `secici bulunamadi: ${secici}`);
  return kaynak.slice(i, kaynak.indexOf('}', i));
};
const dolgu = (b) => (/padding:\s*([^;}]+)/.exec(b) || [])[1]?.trim().replace(/\s+/g, ' ');

test('hap dugme dolgusu: uc kademe token + olcektekiler tokenda + istisnalar sabit', () => {
  const kok = (/:root\{([\s\S]*?)\}/.exec(temel) || [])[1] || '';
  for (const [t, v] of Object.entries(KADEME)) {
    const m = new RegExp('--' + t + ':([^;}]+)').exec(kok);
    assert.ok(m, `token yok: --${t}`);
    assert.strictEqual(m[1].trim(), v, `token degeri ayristi: --${t}`);
  }
  console.log('  KADEME   cagri 14/26 · kompakt 10/18 · cip 8/16  (temel.css :root)');
  const dosyalar = {};
  const al = (p) => (dosyalar[p] ||= oku(p));
  for (const [p, s, beklenen] of OLCEKTE) {
    const d = dolgu(blok(al(p), s));
    console.log(`  OLCEKTE  ${s.padEnd(22)} ${String(d).padEnd(34)} ${p}`);
    assert.strictEqual(d, beklenen, `${p} ${s} dolgusu tokenda degil (literal kaldi ya da baska kademe)`);
  }
  for (const [p, s, literal, neden] of ISTISNA) {
    const d = dolgu(blok(al(p), s));
    console.log(`  ISTISNA  ${s.padEnd(22)} ${String(d).padEnd(34)} ${p} — ${neden}`);
    assert.strictEqual(d, literal, `${p} ${s} istisna degeri degisti (${d}); olcege alma ya da yeni deger yazili karar ister`);
  }
  /* yeni dugme dogmasin: stil/*.css icinde 999px + font-weight 600/700 + literal "Npx Mpx" dolgu */
  const bilinen = new Set([...OLCEKTE, ...ISTISNA].map(([p, s]) => p + s));
  const kacak = [];
  for (const f of fs.readdirSync(path.join(KOK, 'src', 'stil')).filter((x) => x.endsWith('.css'))) {
    const kaynak = oku('stil/' + f);
    for (const m of kaynak.matchAll(/([^{}]+)\{([^{}]*border-radius:\s*999px[^{}]*)\}/g)) {
      const govde = m[2];
      if (!/font-weight:\s*(600|700)/.test(govde)) continue;
      const d = dolgu(govde);
      if (!d || !/^\d+px \d+px$/.test(d)) continue;
      const secici = m[1].trim().split(/\s*,\s*/).pop() + '{';
      if (bilinen.has('stil/' + f + secici)) continue;
      kacak.push(`stil/${f} ${secici} padding:${d}`);
    }
  }
  console.log(`  KACAK    ${kacak.length ? kacak.join(' · ') : 'yok'}`);
  assert.deepStrictEqual(kacak, [], 'olcek disi yeni hap dugme dolgusu (listeye ya da tokena baglanmali)');
});
