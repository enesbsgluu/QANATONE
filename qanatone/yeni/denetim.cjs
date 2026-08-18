#!/usr/bin/env node
/* yeni/denetim.js — Astro çıktısının denetimi (Faz 1, kova 3).
   Referans dersleri KURAL hâlinde: F1 yazı tipi zinciri, G1 görsel hattı,
   V1 veri derlemede pişer, J1 sayfa başına JS tavanı, S1 baş sözleşmesi,
   N1 göç bekçisi (noindex). Astro derlemesinden SONRA koşar (netlify.toml);
   kırmızı → deploy düşer. Eski suite (test/denetim.js) kök siteyi
   denetlemeye devam eder — kovalar: DENETIM-GOC-KOVALARI.md. */
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..', 'dist', 'yeni');
let gecti = 0, kaldi = 0;
const ol = (ad, ok, not) => {
  console.log(`  ${ok ? 'ok ' : '!! '} ${ad}${not ? '  ' + not : ''}`);
  ok ? gecti++ : kaldi++;
};

if (!fs.existsSync(KOK)) {
  console.log('dist/yeni yok — önce astro build.');
  process.exit(1);
}

/* sayfaları topla */
const sayfalar = [];
(function tara(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) tara(p);
    else if (f.endsWith('.html')) sayfalar.push(p);
  }
})(KOK);
const oku = p => fs.readFileSync(p, 'utf8');
const rel = p => path.relative(KOK, p).replace(/\\/g, '/');

console.log(`\nQANATONE yeni kabuk denetimi — ${sayfalar.length} sayfa\n`);

/* sayfa sayısı content.json'dan türetilir — rota sessiz düşmesin */
{
  const c = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
  const beklenen = c.services.length * 2 + c.posts.length * 2 + 3; /* +hukuki +404 +ana */
  ol('sayfa sayısı content.json ile örtüşüyor', sayfalar.length === beklenen,
     `${sayfalar.length}/${beklenen}`);
}

/* F1 · yazı tipi zinciri: üçüncü parti font sunucusu SIFIR; engelleyici
   stylesheet yalnız kendi alandan. Faz 2'de marka fontu gelince bu kural
   onu varlik/font/ + preload + swap yoluna zorlar. */
{
  const kirli = sayfalar.filter(p => /fonts\.(googleapis|gstatic)\.com/.test(oku(p)));
  const yabanciCss = sayfalar.filter(p =>
    [...oku(p).matchAll(/<link rel="stylesheet" href="([^"]+)"/g)]
      .some(m => /^https?:\/\//.test(m[1])));
  ol('F1 · üçüncü parti font/CSS sunucusu yok', kirli.length === 0 && yabanciCss.length === 0,
     [...kirli, ...yabanciCss].slice(0, 3).map(rel).join(' '));
}

/* G1 · görsel hattı: her <img> width+height (kayma yok); ilk ekran
   dışındakiler lazy — eager kalan fetchpriority=high taşımalı. */
{
  const kusur = [];
  for (const p of sayfalar) {
    for (const m of oku(p).matchAll(/<img[^>]*>/g)) {
      const t = m[0];
      if (!/\bwidth=/.test(t) || !/\bheight=/.test(t)) kusur.push(rel(p) + ':olcusuz');
      else if (!/loading="lazy"/.test(t) && !/fetchpriority="high"/.test(t))
        kusur.push(rel(p) + ':eager-isaretsiz');
    }
  }
  ol('G1 · her <img> ölçülü + lazy/öncelik işaretli', kusur.length === 0,
     kusur.slice(0, 3).join(' ') || 'görsel yok (Faz 1 sayfaları metin)');
}

/* V1 · veri derlemede pişer: sayfa içi çalışan betiklerde fetch/XHR yok.
   İstisna: Astro'nun gezinme prefetch betiği (_astro/page.*.js) — veri
   değil, sonraki sayfanın HTML'ini ısıtır; J1 tavanına dahildir. */
{
  const kusur = [];
  for (const p of sayfalar) {
    for (const m of oku(p).matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/application\/ld\+json/.test(m[1])) continue;
      if (/\bfetch\s*\(|XMLHttpRequest/.test(m[2])) kusur.push(rel(p));
    }
  }
  ol('V1 · istemci tarafı veri çekme sıfır (satır içi)', kusur.length === 0,
     kusur.slice(0, 3).join(' '));
}

/* J1 · sayfa başına JS tavanı. ÖLÇÜLDÜ (18 Ağu 2026): prefetch betiği
   2.253 B + Astro modül yükleyici satırı — sayfa toplamı ~2,7 KB.
   Tavan 10 KB (talimat: içerikte 0 hedef, kaçınılmazsa <10 KB; buradaki
   tek JS gezinme prefetch'i). Tavana yaklaşan her artış bilinçli olmalı. */
{
  const TAVAN = 10 * 1024;
  const kusur = [];
  let enBuyuk = 0;
  for (const p of sayfalar) {
    let toplam = 0;
    const h = oku(p);
    for (const m of h.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*>/g)) {
      const dosya = path.join(KOK, m[1].replace(/^\/yeni\//, ''));
      if (fs.existsSync(dosya)) toplam += fs.statSync(dosya).size;
      else kusur.push(rel(p) + ':kayıp-js:' + m[1]);
    }
    for (const m of h.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g))
      if (!/application\/ld\+json/.test(m[1])) toplam += Buffer.byteLength(m[2]);
    if (toplam > TAVAN) kusur.push(rel(p) + ':' + toplam + 'B');
    enBuyuk = Math.max(enBuyuk, toplam);
  }
  ol(`J1 · sayfa başına JS ≤ ${TAVAN} B`, kusur.length === 0,
     kusur.slice(0, 3).join(' ') || `en büyük ${enBuyuk} B`);
}

/* S1 · baş sözleşmesi: title/description menzilde, canonical var,
   hizmet+bülten sayfalarında hreflang çifti + geçerli şema. */
{
  const kusur = [];
  for (const p of sayfalar) {
    const h = oku(p), r = rel(p);
    const t = (h.match(/<title>([^<]*)<\/title>/) || [, ''])[1];
    const d = (h.match(/name="description" content="([^"]*)"/) || [, ''])[1];
    if (t.length < 10 || t.length > 75) kusur.push(r + ':title(' + t.length + ')');
    if (d.length < 50 || d.length > 165) kusur.push(r + ':desc(' + d.length + ')');
    if (!/<link rel="canonical" href="https:\/\//.test(h)) kusur.push(r + ':canonical');
    if (/^(en\/)?(hizmet|bulten)\//.test(r)) {
      if (!/hreflang="tr"/.test(h) || !/hreflang="en"/.test(h) || !/hreflang="x-default"/.test(h))
        kusur.push(r + ':hreflang');
      const ld = h.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
      let sema = null;
      try { sema = ld && JSON.parse(ld[1]); } catch (e) {}
      if (!sema || !sema['@type']) kusur.push(r + ':şema');
    }
  }
  ol('S1 · title/desc menzilde + canonical + hreflang çifti + şema',
     kusur.length === 0, kusur.slice(0, 4).join(' '));
}

/* N1 · göç bekçisi: kesmeye (Faz 4) kadar her sayfa noindex — canlı kök
   siteyle kopya içerik doğmaz. Faz 4'te bu kural TERSİNE çevrilir. */
{
  const kusur = sayfalar.filter(p => !/name="robots" content="noindex"/.test(oku(p)));
  ol('N1 · göç bekçisi: her sayfa noindex (Faz 4\'te tersine döner)',
     kusur.length === 0, kusur.slice(0, 3).map(rel).join(' '));
}

/* ---- FAZ 2 · ana sayfa kuralları (H ailesi) ------------------------- */
{
  const ana = path.join(KOK, 'index.html');
  const anaVar = fs.existsSync(ana);
  ol('H0 · ana sayfa üretilmiş (/yeni/)', anaVar, anaVar ? '' : 'index.html yok');
  if (anaVar) {
    const h = oku(ana);
    /* CSS iki yerde yaşayabilir: satır içi <style> + bağlı _astro/*.css
       (Astro eşiği aşınca dışarı çıkarır) — İKİSİ de okunur; yalnız
       satır içine bakmak H kurallarını sessizce boşa düşürür (yaşandı). */
    let css = [...h.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
    for (const m of h.matchAll(/<link rel="stylesheet" href="([^"]+)"/g)) {
      const dosya = path.join(KOK, m[1].replace(/^\/yeni\//, ''));
      if (fs.existsSync(dosya)) css += '\n' + fs.readFileSync(dosya, 'utf8');
    }

    /* düzleştirici: @media/@supports sarmalları AÇILIR (iç kurallar düz
       listeye iner — parantez sayarak, [^}]* tuzağı değil), @keyframes/
       @font-face bütünüyle atlanır. H1/H2 düz kural listesinde ölçer. */
    const duzlestir = txt => {
      const out = [];
      let i = 0;
      while (i < txt.length) {
        const ac = txt.indexOf('{', i);
        if (ac === -1) break;
        const bas = txt.slice(i, ac).trim();
        if (/^@(media|supports)/.test(bas)) {
          let d = 1, k = ac + 1;
          for (; k < txt.length && d > 0; k++) { if (txt[k] === '{') d++; else if (txt[k] === '}') d--; }
          out.push(...duzlestir(txt.slice(ac + 1, k - 1)));
          i = k;
        } else if (bas.startsWith('@')) {
          let d = 1, k = ac + 1;
          for (; k < txt.length && d > 0; k++) { if (txt[k] === '{') d++; else if (txt[k] === '}') d--; }
          i = k;
        } else {
          const kap = txt.indexOf('}', ac);
          if (kap === -1) break;
          out.push({ sec: bas, gov: txt.slice(ac + 1, kap) });
          i = kap + 1;
        }
      }
      return out;
    };
    const duzKurallar = duzlestir(css);

    /* H1 · hareket bütçesi: animation/transition yalnız S1-S3 sahne
       sınıflarında (s1- s2- s3- öneki) ve etkileşim geri bildiriminde.
       BİLİNÇLİ İSTİSNA (kurala yazıldı): .dugme ve .s4-kart üzerindeki
       `transition` — hover geri bildiriminin mekanik parçası (bileşen
       kimliği, H4'ün diliyle); `animation` bu istisnaya girmez. */
    {
      const kusur = [];
      for (const { sec, gov } of duzKurallar) {
        const animVar = /(?:^|[^a-z-])animation\s*:/.test(gov);
        const gecisVar = /(?:^|[^a-z-])transition\s*:/.test(gov);
        if (!animVar && !gecisVar) continue;
        const sahneli = /(^|[\s,.>(])s[123]-/.test(sec);
        const etkilesim = /:hover|:focus|:active/.test(sec);
        const kimlik = !animVar && /\.(dugme|s4-kart)\b/.test(sec);
        if (!sahneli && !etkilesim && !kimlik) kusur.push(sec.slice(0, 40));
      }
      ol('H1 · hareket bütçesi: hareket yalnız S1-S3 + etkileşim geri bildirimi',
         kusur.length === 0, kusur.slice(0, 3).join(' | '));
    }

    /* H2 · görünür doğar: içerik sınıflarına (s\d- öneki) hover dışı
       opacity:0 / visibility:hidden YAZILAMAZ — giriş hareketi keyframe
       from{}'dan gelir, taban her zaman opak. Savurmada boş ekran yok. */
    {
      const kusur = [];
      for (const { sec, gov } of duzKurallar) {
        if (!/(^|[\s,.>(])s\d-/.test(sec) || /:hover|:focus/.test(sec)) continue;
        if (/opacity\s*:\s*0(?![.\d])/.test(gov) || /visibility\s*:\s*hidden/.test(gov))
          kusur.push(sec.slice(0, 40));
      }
      ol('H2 · içerik görünür doğar (sahne sınıfında opacity:0/hidden yok)',
         kusur.length === 0, kusur.slice(0, 3).join(' | '));
    }

    /* H3 · sahne bütçesi: ana sayfa toplam JS ≤ 50 KB (bugünkü kökte 496 KB).
       Ölçü: dış src dosyaları + ld+json dışı satır içi gömüler. */
    {
      const TAVAN = 50 * 1024;
      let toplam = 0;
      for (const m4 of h.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*>/g)) {
        const dosya = path.join(KOK, m4[1].replace(/^\/yeni\//, ''));
        if (fs.existsSync(dosya)) toplam += fs.statSync(dosya).size;
      }
      for (const m4 of h.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g))
        if (!/application\/ld\+json/.test(m4[1])) toplam += Buffer.byteLength(m4[2]);
      ol(`H3 · ana sayfa toplam JS ≤ ${TAVAN} B`, toplam <= TAVAN && toplam >= 0,
         `ölçülen ${toplam} B`);
    }

    /* H4 · süs/kimlik ayrımı: cihaz-yeteneği medya blokları (pointer/
       width) animation:none'ı yalnız .sus- önekli süs sınıflarına
       basabilir; bileşen kimliği her cihazda yaşar. prefers-reduced-motion
       kullanıcı TERCİHİDİR, istisna. */
    {
      const kusur = [];
      for (const m5 of css.matchAll(/@media([^{]*)\{((?:[^{}]*\{[^}]*\})*)\}/g)) {
        if (/prefers-reduced-motion/.test(m5[1])) continue;
        if (!/pointer|hover|max-width|min-width/.test(m5[1])) continue;
        for (const r of m5[2].matchAll(/([^{}]+)\{([^}]*)\}/g))
          if (/animation\s*:\s*none/.test(r[2]) && !/(^|[\s,.])sus-/.test(r[1]))
            kusur.push(r[1].trim().slice(0, 40));
      }
      ol('H4 · süs/kimlik ayrı: cihaz kısıtı yalnız .sus- söndürür',
         kusur.length === 0, kusur.slice(0, 3).join(' | '));
    }

    /* fontlar: yalnız kendi alandan (F1 zaten üçüncü partiyi yasaklıyor);
       burada marka fontunun GERÇEKTEN yerelden geldiği kilitlenir. */
    {
      const yuzler = [...css.matchAll(/@font-face\{[^}]*src:url\(([^)]+)\)/g)].map(m => m[1]);
      const yerel = yuzler.length > 0 && yuzler.every(u => u.startsWith('/yeni/font/'));
      const dosyalar = yuzler.every(u =>
        fs.existsSync(path.join(KOK, u.replace(/^\/yeni\//, ''))));
      ol('F1b · marka fontları kendi alandan + dosyalar diskte',
         yerel && dosyalar, `${yuzler.length} yüz`);
    }
  }
}

console.log(`\n  ${gecti} geçti · ${kaldi} kaldı`);
if (kaldi > 0) { console.log('  YENİ KABUK DENETİMİ KALDI — yayın çıkmamalı.'); process.exit(1); }
console.log('  yeni kabuk temiz.\n');
