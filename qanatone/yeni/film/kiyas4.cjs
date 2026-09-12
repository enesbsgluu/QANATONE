#!/usr/bin/env node
/* FILM · BES TUR YAN YANA + GERCEK KULLANIM HIZLARI
     Tur 1  sonuc-oncesi.json   CRF20 native · pencere yok
     Tur 2  sonuc-tur2.json     CRF28/540 · pencere +-3 · yon/hiz sirasi
     Tur 3  sonuc-tur3.json     + acilis kopyasi + devralma      (dort olcu gecmisti)
     Tur 4  sonuc-4k.json       4K kaynak · 1440p/1080p H.264 · sonumleme
     Tur 5  sonuc.json          4K kaynak · 1080p/720p · H.265 ANA + H.264 YEDEK
                                · sonumleme · 1x/1,5x/2x/3,3x supurmeleri
   Tur 5'te kume adlari `-h265` / `-h264` ekli ve supurme adlari yeni
   (okuma-1x, gezinme-1.5x, gezinme-2x, sert-3.3x). Eski turlarla esleme:
     okuma-1x   <- okuma   ·  sert-3.3x <- sert-ileri  ·  sert-3.3x-geri <- sert-geri
   Gezinme hizlari (1,5x / 2x) yalniz tur 5'te var; eskilerde "—".
   OLCUT NOTU: tur 3'ten itibaren "hazir varis" scrub konumu uzerinden,
   "sunulan kare" yalniz ekranda olan; tur 1-2 daha gevsek olculdu.
   Kullanim: node yeni/film/kiyas4.cjs */
const fs = require('fs');
const path = require('path');
const D = path.join(__dirname, 'olcum');
const oku = (f) => { const y = path.join(D, f); return fs.existsSync(y) ? new Map(JSON.parse(fs.readFileSync(y, 'utf8')).map(({ ozet: o }) => [o.ad, o])) : null; };
const T = [
  ['tur 1', 'sonuc-oncesi.json'], ['tur 2', 'sonuc-tur2.json'], ['tur 3', 'sonuc-tur3.json'],
  ['tur 4', 'sonuc-4k.json'], ['tur 5 h265', 'sonuc.json', 'h265'], ['tur 5 h264', 'sonuc.json', 'h264'],
].map(([ad, f, kd]) => ({ ad, kd, h: oku(f) })).filter((t) => t.h);

const ESKI_AD = { 'okuma-1x': 'okuma', 'sert-3.3x': 'sert-ileri', 'sert-3.3x-geri': 'sert-geri' };
const kume = (t, ad) => t.h.get(t.kd ? `${ad}-${t.kd}` : ad) || (t.kd ? null : t.h.get(ad));
const supur = (o, ad) => o && (o.supur.find((s) => s.ad === ad) || o.supur.find((s) => s.ad === ESKI_AD[ad]));
const v = (x) => (x === null || x === undefined ? '—' : x);

console.log('## İlk kare (medyan, 3 tekrar)\n');
console.log('| küme | ' + T.map((t) => t.ad).join(' | ') + ' |');
console.log('|---|' + T.map(() => '---:').join('|') + '|');
for (const ad of ['masaustu-wifi', 'mobil-4G', 'mobil-4G-yavas'])
  console.log(`| ${ad} | ` + T.map((t) => { const o = kume(t, ad); return o ? `${o.ilk_kare_ms.medyan} ms` : '—'; }).join(' | ') + ' |');

console.log('\n## Gerçek kullanım hızları — tur 5 (sönümleme 0,18 açık)\n');
console.log('| küme | kodek | süpürme | hız | taban atlama % | **atlama %** | sunulan/istenen | max boşluk | hazır varış | takılma | kare p95 | uzun görev | bellek |');
console.log('|---|---|---|---:|---:|---:|---:|---:|---|---:|---:|---|---:|');
for (const ad of ['masaustu-wifi', 'mobil-4G', 'mobil-4G-yavas'])
  for (const kd of ['h265', 'h264']) {
    const o = T.find((t) => t.kd === kd) && kume(T.find((t) => t.kd === kd), ad);
    if (!o) continue;
    for (const s of o.supur)
      console.log(`| ${ad} | ${kd} | ${s.ad} | ${s.hiz}× | ${v(s.taban_atlama_yuzde)} | **${s.atlama_yuzde}** | ${v(s.sunulan)}/${v(s.istenen)} | ${s.max_bosluk_kare} | ${s.varis_hazir}/${s.varis} | ${s.takilma_toplam_ms} | ${s.kare_suresi_p95} | ${s.uzun_gorev_adet}/${s.uzun_gorev_max_ms} | ${v(s.bellek_mib)} |`);
  }

console.log('\n## Beş tur — ortak süpürmeler\n');
const OLC = [['atlama_yuzde', 'atlama %'], ['max_bosluk_kare', 'max boşluk'], ['varis_hazir', 'hazır varış'], ['takilma_toplam_ms', 'takılma ms'], ['kare_suresi_p95', 'kare p95'], ['bellek_mib', 'bellek MiB']];
console.log('| küme | süpürme | ölçü | ' + T.map((t) => t.ad).join(' | ') + ' |');
console.log('|---|---|---|' + T.map(() => '---:').join('|') + '|');
for (const ad of ['masaustu-wifi', 'mobil-4G', 'mobil-4G-yavas'])
  for (const sad of ['okuma-1x', 'sert-3.3x', 'sert-3.3x-geri'])
    for (const [alan, et] of OLC) {
      const satir = T.map((t) => { const s = supur(kume(t, ad), sad); if (!s) return '—'; return alan === 'varis_hazir' ? `${s.varis_hazir}/${s.varis}` : v(s[alan]); });
      if (satir.every((x) => x === '—')) continue;
      console.log(`| ${ad} | ${sad} | ${et} | ${satir.join(' | ')} |`);
    }

console.log('\n## Uzun görev / CLS\n');
for (const t of T) {
  const oz = [...t.h.values()].filter((o) => !t.kd || o.kodek === t.kd || o.ad.endsWith('-' + t.kd));
  const u = oz.flatMap((o) => o.supur.map((s) => s.uzun_gorev_adet)).reduce((a, b) => a + b, 0);
  const c = Math.max(0, ...oz.flatMap((o) => o.supur.map((s) => s.cls)));
  console.log(`- ${t.ad}: uzun görev toplam ${u} · CLS en yüksek ${c}`);
}
