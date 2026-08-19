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
   İKİ istisna (talimatın kendi metni: "form gönderimi hariç; o kullanıcı
   eylemidir"): (1) Astro'nun gezinme prefetch betiği (_astro/page.*.js) —
   veri değil, sonraki sayfanın HTML'ini ısıtır; (2) fetch'i YALNIZ bir
   submit dinleyicisi içinde taşıyan betik (S7 teşhis aracı) — betikte
   addEventListener('submit') YOKSA fetch yine kırmızıdır. İkisi de J1
   tavanına dahildir. */
{
  const kusur = [];
  for (const p of sayfalar) {
    for (const m of oku(p).matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)) {
      if (/application\/ld\+json/.test(m[1])) continue;
      if (!/\bfetch\s*\(|XMLHttpRequest/.test(m[2])) continue;
      if (/addEventListener\(["']submit["']/.test(m[2])) continue;   /* kullanıcı eylemi */
      kusur.push(rel(p));
    }
  }
  ol('V1 · istemci veri çekme sıfır (fetch yalnız submit eyleminde yaşar)',
     kusur.length === 0, kusur.slice(0, 3).join(' '));
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

/* F1c · font kapsamı: sayfalarda GEÇEN her kod noktasının bir
   @font-face'in unicode-range'inde karşılığı olmalı. Alt küme daraltmak
   (Anayasa madde 4 "TR+Latin") baytı yarıya indirdi ama sessiz bir risk
   doğurdu: panelden yeni bir karakter gelirse (ör. "č", "≥") o glif
   sistem fontuna düşer ve satır iki yazı tipiyle karışık dizilir.
   Bu kural o riski kırmızıya çevirir — kapsam listesi font-uret.py'de,
   düzeltme oraya karakter eklemek. */
{
  const ana = path.join(KOK, 'index.html');
  let menziller = [];
  if (fs.existsSync(ana)) {
    let css = [...oku(ana).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
    for (const m of oku(ana).matchAll(/<link rel="stylesheet" href="([^"]+)"/g)) {
      const d = path.join(KOK, m[1].replace(/^\/yeni\//, ''));
      if (fs.existsSync(d)) css += '\n' + fs.readFileSync(d, 'utf8');
    }
    for (const m of css.matchAll(/unicode-range:([^;}]+)/g))
      for (const p of m[1].split(','))
        if (/U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?/.test(p.trim())) {
          const [, a, b] = p.trim().match(/U\+([0-9A-Fa-f]+)(?:-([0-9A-Fa-f]+))?/);
          menziller.push([parseInt(a, 16), parseInt(b || a, 16)]);
        }
  }
  const kapsar = c => menziller.some(([a, b]) => c >= a && c <= b);
  const eksik = new Map();
  for (const p of sayfalar) {
    const metin = oku(p)
      .replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
      .replace(/<[^>]+>/g, ' ');
    for (const ch of metin) {
      const c = ch.codePointAt(0);
      if (c < 0x20 || kapsar(c)) continue;
      if (!eksik.has(ch)) eksik.set(ch, rel(p));
    }
  }
  ol('F1c · sayfadaki her karakterin alt kümede karşılığı var',
     menziller.length > 0 && eksik.size === 0,
     eksik.size ? [...eksik].slice(0, 4).map(([c, s]) => `U+${c.codePointAt(0).toString(16).toUpperCase()}(${s})`).join(' ')
                : `${menziller.length} menzil`);
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

    /* GÖÇ ÖNEKLERİ (Göç Anayasası madde 3: "H1 yeni sahne önekleriyle
       GENİŞLETİLİR — sessizce silinmez, gevşetilmez").
         s1- s2- s3-  Faz 2 anlatı sahneleri
         sh-          S-H hero (göçün ilk sahnesi)
         st-          S-T şerit (ticker)
         sp-          S-P deste (projeler)
         sk-          S-K katman (dort katman)
         sus-         süs katmanı; H4 zaten bu öneki tanıyor — hareketin
                      yaşadığı yer burası, cihaz kısıtının söndürebildiği
                      tek yer de burası. İkisi aynı sözlüğü kullanmalı.
       Sonraki sahneler geldikçe TEK yer değişir: bu iki dizi. */
    const SAHNE_ONEK = /(^|[\s,.>(])(s[123]-|sh-|st-|sp-|sk-)/;      /* içerik sahneleri */
    const HAREKET_ONEK = /(^|[\s,.>(])(s[123]-|sh-|st-|sp-|sk-|sus-)/; /* + süs katmanı */

    /* H1 · hareket bütçesi: animation/transition yalnız sahne/süs
       öneklerinde ve etkileşim geri bildiriminde.
       BİLİNÇLİ İSTİSNA (kurala yazıldı): .dugme üzerindeki `transition`
       — hover geri bildiriminin mekanik parçası (bileşen kimliği,
       H4'ün diliyle); `animation` bu istisnaya girmez.
       `.s4-kart` istisnası KALKTI: S4 kanıt sahnesi S-P destesine
       devredildi, sınıf artık hiçbir sayfada yok (kural gevşemedi,
       daraldı). */
    {
      const kusur = [];
      for (const { sec, gov } of duzKurallar) {
        const animVar = /(?:^|[^a-z-])animation\s*:/.test(gov);
        const gecisVar = /(?:^|[^a-z-])transition\s*:/.test(gov);
        if (!animVar && !gecisVar) continue;
        const sahneli = HAREKET_ONEK.test(sec);
        const etkilesim = /:hover|:focus|:active/.test(sec);
        const kimlik = !animVar && /\.dugme\b/.test(sec);
        if (!sahneli && !etkilesim && !kimlik) kusur.push(sec.slice(0, 40));
      }
      ol('H1 · hareket bütçesi: hareket yalnız sahne/süs öneki + etkileşim',
         kusur.length === 0, kusur.slice(0, 3).join(' | '));
    }

    /* H2 · görünür doğar: İÇERİK sınıflarına (s1-/s2-/s3-/sh- öneki)
       hover dışı opacity:0 / visibility:hidden YAZILAMAZ — giriş hareketi
       keyframe from{}'dan gelir, taban her zaman opak. Savurmada boş ekran
       yok. .sus- bilinçli DIŞARIDA: süs sönük doğabilir, içerik doğamaz. */
    {
      /* BOŞ SÖZDE-ELEMAN İSTİSNASI (2026-08-19, hero turunda kural
         keskinleştirildi — gevşetilmedi): `content:''` taşıyan
         ::before/::after'ın içeriği YOKTUR; boyadığı şey zemin, çerçeve
         veya parıltıdır. .sh-void::before hover parıltısıdır ve sönük
         doğması doğru davranıştır. Kural metin ve görselin görünür
         doğmasını ölçer; içeriksiz katman ölçünün konusu değil.
         Sınır dar tutuldu: content'i boş OLMAYAN sözde-eleman (ör.
         content:'→') hâlâ kuralın içinde. Astro çıktısı tek iki nokta
         basıyor (:before) — ikisi de yakalanır. */
      const bosSozde = (sec, gov) =>
        /:{1,2}(before|after)\b/.test(sec) && /content\s*:\s*(''|"")/.test(gov);
      const kusur = [];
      for (const { sec, gov } of duzKurallar) {
        if (!SAHNE_ONEK.test(sec) || /:hover|:focus/.test(sec)) continue;
        if (bosSozde(sec, gov)) continue;
        if (/opacity\s*:\s*0(?![.\d])/.test(gov) || /visibility\s*:\s*hidden/.test(gov))
          kusur.push(sec.slice(0, 40));
      }
      ol('H2 · içerik görünür doğar (sahne sınıfında opacity:0/hidden yok)',
         kusur.length === 0, kusur.slice(0, 3).join(' | '));
    }

    /* H5 · giriş keyframe'i opaklığa dokunmaz (madde 5'in ikinci yarısı).
       H2 taban kuralı; bu onun tamamlayıcısı: İÇERİK sınıfının çağırdığı
       keyframe `opacity` taşıyorsa eleman gene animasyon payı kadar
       görünmez kalır — LCP tam o kadar itilir (2.021 ms, ölçüldü).
       Süs keyframe'leri (sh-hale, sh-yukari-sus) serbest: onları içerik
       sınıfı çağırmaz.

       KESKİNLEŞTİRME (19 Ağu, S-P destesi turunda — GEVŞETME DEĞİL):
       kural "opacity geçiyor mu" diye bakıyordu, oysa koruduğu şey
       "eleman GÖRÜNMEZ mi başlıyor". Destenin küçülme eğrisi
       `from{opacity:1} → to{opacity:.72}`: ilk kareden itibaren tam
       opak, üstelik zaman değil KAYDIRMA güdümlü (sayfa açılırken
       ilerleme 0). Kural artık başlangıç durağına bakıyor: opacity
       taşıyan bir içerik keyframe'i, `from`/`0%` durağında açıkça
       `opacity:1` yazmak zorunda. Yazmıyorsa (ya da 1'den küçükse)
       kırmızı — yani "sönük doğan içerik" hâlâ hata, "sönükleşen
       içerik" değil. Açık `from` şartı bilinçli: niyet CSS'in kendi
       metninde okunsun.
       DOĞRULANDI: dist'teki `sp-cek`in `from` durağı `opacity:1`den
       `opacity:.99`a çevrildiğinde kural kırmızıya döndü. */
    {
      const kareler = {};
      for (const m of css.matchAll(/@keyframes\s+([\w-]+)\s*\{/g)) {
        let d = 1, k = m.index + m[0].length;
        for (; k < css.length && d > 0; k++) { if (css[k] === '{') d++; else if (css[k] === '}') d--; }
        kareler[m[1]] = css.slice(m.index + m[0].length, k - 1);
      }
      /* Bir keyframe gövdesinin BAŞLANGIÇ durağı: `from` ya da `0%`.
         Duraklar `from,50%{...}` gibi birleşik yazılabildiği için
         seçici listesi parçalanarak aranır. Derleyici `from`u `0%`e
         çevirebiliyor — ikisi de kabul. */
      const opakBaslar = (govde) => {
        for (const d of govde.matchAll(/([^{}]+)\{([^}]*)\}/g)) {
          const duraklar = d[1].split(',').map(x => x.trim());
          if (!duraklar.some(x => x === 'from' || x === '0%')) continue;
          const o = d[2].match(/opacity\s*:\s*([\d.]+)/);
          if (o && Number(o[1]) >= 1) return true;
        }
        return false;
      };
      const kusur = [];
      for (const { sec, gov } of duzKurallar) {
        if (!SAHNE_ONEK.test(sec) || /:hover|:focus/.test(sec)) continue;
        for (const a of gov.matchAll(/animation\s*:\s*([^;]+)/g))
          for (const ad of a[1].split(/\s+/))
            if (kareler[ad] && /opacity\s*:/.test(kareler[ad]) && !opakBaslar(kareler[ad]))
              kusur.push(sec.slice(0, 28) + '→' + ad);
      }
      ol('H5 · içerik giriş keyframe\'i opaklığa dokunmaz (yalnız transform)',
         kusur.length === 0, kusur.slice(0, 3).join(' | '));
    }

    /* H6 · hero görsel hattı — KOŞULLU kural: hero sahnesi sayfada varsa
       ölçer, yoksa ölçecek şey yoktur (göç sırasında sahne bir commit'te
       gelir; kural sahneyle birlikte kendiliğinden devreye girer).
       Ölçtüğü: ilk ekranın iki eli mobil kaynağını taşıyor mu (kural 109
       dersi — çözülmüş bitmap ≤ 2× CSS kutusu) ve mobil ilk ekran görsel
       yükü 300 KB tavanının altında mı (Anayasa madde 3).
       Ölçü gerçek dosya boyutundan; "ürettim" demek yetmez. */
    if (/class="sh-sahne"/.test(h)) {
      const TAVAN = 300 * 1024;
      const kusur = [];
      let mobilYuk = 0;
      const eller = [...h.matchAll(/<source[^>]*media="\(max-width:900px\)"[^>]*srcset="([^"]+)"/g)]
        .map(m => m[1]);
      for (const el of ['hand-human', 'hand-robot'])
        if (!eller.some(u => u.includes(el + '-m.avif'))) kusur.push(el + ':mobil-kaynak-yok');
      /* mobil ilk ekran: her el icin EN IYI bicim (avif) sayilir */
      for (const u of eller.filter(x => x.endsWith('.avif'))) {
        const dosya = path.join(KOK, u.replace(/^\/yeni\//, ''));
        if (fs.existsSync(dosya)) mobilYuk += fs.statSync(dosya).size;
        else kusur.push('kayıp:' + u);
      }
      if (mobilYuk > TAVAN) kusur.push('mobil-yük:' + mobilYuk + 'B');
      ol(`H6 · hero elleri mobil kaynaklı + ilk ekran ≤ ${TAVAN} B`,
         kusur.length === 0, kusur.slice(0, 3).join(' ') || `mobil ilk ekran ${mobilYuk} B`);
    }

    /* H7 · tek h1: göç sırasında sahne devri iki h1 doğurabilir (S1Acilis
       ile hero aynı sözü söylüyordu — yaşandı). Parite sözleşmesinin
       (madde 5) ana sayfa ayağı. */
    {
      const sayi = (h.match(/<h1[\s>]/g) || []).length;
      ol('H7 · ana sayfada tek h1', sayi === 1, `${sayi} adet`);
    }

    /* H10 · göç sahnesinin dolgusu gerçekten uygulanıyor mu.
       ana.css'te `.ana section{padding:11vh 0}` var; özgüllüğü (0,1,1)
       düz sınıf seçicisini (0,1,0) YENER. `.sh-sahne{padding:...}` yazan
       sahne kaynakta doğru okunuyor ama tarayıcıda hiç yürürlüğe
       girmiyordu — hero'da yaşandı, ancak GERÇEK TARAYICIDA ekran
       görüntüsüyle görüldü (kaydır işareti hmeta satırının üstüne
       biniyordu). Denetim metni okuduğu için göremezdi; kural bu yüzden
       özgüllüğü ölçer, görüntüyü değil: `-sahne` ile biten bir sınıfa
       padding yazan her kural `.ana` ile nitelenmiş olmalı.
       Yanlış yeşilden korunmanın yolu: kuralı belirtiye değil SEBEBE
       bağlamak. */
    {
      const kusur = [];
      for (const { sec, gov } of duzKurallar) {
        if (!/(^|[\s,.>(])s[a-z0-9]*-sahne\b/.test(sec)) continue;
        if (!/(?:^|[^a-z-])padding(?:-(?:top|bottom|block|inline))?\s*:/.test(gov)) continue;
        /* her virgüllü parça ayrı ayrı nitelenmiş olmalı */
        for (const parca of sec.split(','))
          if (/-sahne\b/.test(parca) && !/\.ana\s/.test(parca))
            kusur.push(parca.trim().slice(0, 40));
      }
      ol('H10 · göç sahnesi dolgusu `.ana` ile nitelenmiş (özgüllük yenilmiyor)',
         kusur.length === 0, kusur.slice(0, 3).join(' | '));
    }

    /* H8 · şerit dikişi: marquee'nin tur SAYISI ile kaydırma BÖLENİ aynı
       sayı olmak zorunda — üç tur varsa kaydırma bir tur, yani -100%/3.
       İkisi ayrı yerde yaşadığı için ayrışabilir ve ayrıştığında hata
       sessizdir: şerit her turda biraz kayar, bir süre sonra boşluk
       geçer. Bu depoda "iki yerde yaşayan oran" üç kez ısırdı (tel
       birimi, halka tur süresi, şeridin kendi 84/42 sn yorumu).
       KOŞULLU: şerit sahnesi yoksa ölçecek şey yok. */
    if (/class="st-sahne"/.test(h)) {
      const tur = (h.match(/class="st-tur"/g) || []).length;
      /* NOT: derleyici (lightningcss) `translateX(...)` -> `translate(...)`
         yazıyor; kural ÇIKTIYI okuduğu için ikisini de kabul eder.
         Kaynağa göre yazılmış regex burada sessizce null döndürdü. */
      const kare = css.match(/@keyframes\s+st-akis\s*\{[^}]*translate(?:X)?\(\s*calc\(\s*-100%\s*\/\s*(\d+)\s*\)/);
      const bolen = kare ? Number(kare[1]) : null;
      ol('H8 · şerit dikişi: tur sayısı = kaydırma böleni',
         tur >= 2 && bolen === tur, `tur ${tur} · bölen ${bolen}`);
    }

    /* H11 · sonsuz hareketin durdurma sözleşmesi: `infinite` koşan her
       animasyonun `prefers-reduced-motion:reduce` altında karşılığı
       olmalı. Anayasa bunu S-T için açıkça yazıyor ("marquee ...
       prefers-reduced-motion durdurur") ama kural sahneye değil
       DAVRANIŞA bağlandı: süreklilik nerede olursa olsun kullanıcının
       beyanına uymalı. Tek seferlik giriş animasyonları kapsam dışı —
       onlar zaten biter.
       NOT: derleyici `::before` -> `:before` yazabiliyor, iki taraf da
       normalleştirilerek karşılaştırılır. */
    {
      const norm = s => s.trim().replace(/::/g, ':').replace(/\s+/g, ' ');
      const duran = new Set();
      for (const m of css.matchAll(/@media[^{]*prefers-reduced-motion[^{]*\{((?:[^{}]*\{[^}]*\})*)\}/g))
        for (const r of m[1].matchAll(/([^{}]+)\{([^}]*)\}/g))
          if (/animation(?:-play-state)?\s*:\s*(none|paused)/.test(r[2]))
            for (const p of r[1].split(',')) duran.add(norm(p));
      const kusur = [];
      for (const { sec, gov } of duzKurallar) {
        const anim = gov.match(/animation\s*:\s*([^;]+)/);
        if (!anim || /^\s*none\b/.test(anim[1])) continue;
        /* GENISLETME (19 Agu, S-P turu): kural yalniz `infinite` kosani
           olcuyordu. Deste kaydirma-gudumlu — `infinite` degil ama
           kullanici kaydirdikca surekli, ve durdurmasi OZGULLUKTE
           kaybediyordu: `.sp-govde` (0,1,0) karsi hareketi veren
           `.sp-kart:not(:last-child) .sp-govde` (0,3,0). Denetim goremedi,
           gercek Chrome'da hareket-azaltma emulasyonu gordu (+1000 px'te
           kartlar hala 0,94/0,72 okuyordu). Olcut artik: SAHNE sinifinda
           yasayan her animasyonun, hareketi VEREN seciciyle AYNI secici
           uzerinde bir `prefers-reduced-motion` karsiligi olmali.
           Gevsetme degil, H11'in kendi dersinin genellestirilmesi. */
        if (!/\binfinite\b/.test(anim[1]) && !SAHNE_ONEK.test(sec)) continue;
        for (const p of sec.split(','))
          if (!duran.has(norm(p))) kusur.push(norm(p).slice(0, 36));
      }
      ol('H11 · her sahne hareketinin AYNI seçicide reduced-motion karşılığı var',
         kusur.length === 0, kusur.slice(0, 3).join(' | ') || `${duran.size} durdurma`);
    }

    /* H9 · şeridin görsel tekrarı erişilebilirlik ağacında bir kez:
       dikiş için tur üç kez basılıyor ama isimler ÜÇ KEZ okunmamalı.
       Eski tarafta dört kopyanın dördü de alt metin taşıyordu — botlara
       ve ekran okuyucuya aynı dokuz ad dört kez gidiyordu. */
    if (/class="st-sahne"/.test(h)) {
      const bolum = h.slice(h.indexOf('class="st-sahne"'));
      const son = bolum.indexOf('</section>');
      const altlar = [...bolum.slice(0, son).matchAll(/<img[^>]*\salt="([^"]*)"/g)]
        .map(m => m[1]).filter(Boolean);
      const tekrar = altlar.filter((a, i) => altlar.indexOf(a) !== i);
      ol('H9 · şerit alt metinleri tekrarlanmıyor (tekrar turları gizli)',
         tekrar.length === 0, tekrar.slice(0, 3).join(' ') || `${altlar.length} ad`);
    }

    /* ---- S-P destesiyle gelen kurallar (H12-H15 + G2) --------------
       Sahne talimatinin kendi sartlari: "kaydirma sirasinda uzun gorev
       uretme", "ilk ekran butcesi", "mobilde pin YOK", "icerik uc halde
       de eksiksiz". Dordu de burada rakama baglandi; dordu de dist'e
       hata enjekte edilerek kirmiziya donduruldu (H8'in sessizce null
       donmesi dersi: kirmiziya donmeyen kural yesil sayilmaz). */

    /* H12 · kaydirmanin kendisi is uretmez: ana sayfanin HICBIR betigi
       kaydirma dinleyicisi kurmaz ve duzen okumaz. Eski deste tam
       tersiydi — `scroll` + rAF + kart basina `getBoundingClientRect`;
       58 sn'lik kayitta dort buyuk donmanin dordu de o bolgedeydi.
       Kural belirtiye (donma) degil SEBEBE bakar: dinleyici ve okuma
       yoksa kaydirma karesi bizden is almaz.
       Olcu hem satir ici hem dis (_astro/*.js) betikleri kapsar —
       yalniz satir icine bakmak kurali sessizce bosa dusururdu. */
    {
      const OKUMA = /getBoundingClientRect|getClientRects|\boffset(Width|Height|Top|Left)\b|\bscroll(Top|Left|Height|Width)\b|getComputedStyle/;
      const DINLEYICI = /addEventListener\s*\(\s*["']scroll["']|\bonscroll\s*=/;
      const kusur = [];
      const betikler = [];
      for (const m of h.matchAll(/<script[^>]*\bsrc="([^"]+)"[^>]*>/g)) {
        const dosya = path.join(KOK, m[1].replace(/^\/yeni\//, ''));
        if (fs.existsSync(dosya)) betikler.push([m[1], fs.readFileSync(dosya, 'utf8')]);
      }
      for (const m of h.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g))
        if (!/application\/ld\+json/.test(m[1])) betikler.push(['satir ici', m[2]]);
      for (const [ad, kod] of betikler) {
        if (DINLEYICI.test(kod)) kusur.push(ad + ':kaydirma-dinleyicisi');
        const o = kod.match(OKUMA);
        if (o) kusur.push(ad + ':duzen-okuma:' + o[0]);
      }
      ol('H12 · ana sayfa betiklerinde kaydirma dinleyicisi ve duzen okumasi yok',
         kusur.length === 0, kusur.slice(0, 3).join(' ') || `${betikler.length} betik`);
    }

    /* G2 · gorsel hatti kendi alanimizdan: yeni kabugun bastigi her
       <img src> ve <source srcset> `/yeni/` altinda olmali ve dosyasi
       diskte durmali. ACIK KALEMI KAPATIR: S4'un kart gorselleri kokteki
       `/img/pj-*-k-640.webp`e bagliydi — mobil icin pisirilmis turev
       masaustune de iniyordu ve Faz 4 kesmesinde kok yeni ciktiya
       donunce o yol kimsenin garantisi degildi. Font tarafindaki F1b'nin
       gorsel karsiligi. */
    {
      const kusur = [];
      for (const p2 of sayfalar) {
        const g = oku(p2);
        const yollar = [...g.matchAll(/<img[^>]*\bsrc="([^"]+)"/g)].map(m => m[1])
          .concat([...g.matchAll(/<source[^>]*\bsrcset="([^"]+)"/g)]
            .map(m => m[1].split(',')[0].trim().split(/\s+/)[0]));
        for (const u of yollar) {
          if (!u.startsWith('/yeni/')) { kusur.push(rel(p2) + ':yabanci:' + u); continue; }
          if (!fs.existsSync(path.join(KOK, u.replace(/^\/yeni\//, ''))))
            kusur.push(rel(p2) + ':kayip:' + u);
        }
      }
      ol('G2 · gorseller kendi alanimizdan (/yeni/) + dosyalar diskte',
         kusur.length === 0, kusur.slice(0, 3).join(' '));
    }

    /* H13 · deste gorsel hatti — KOSULLU (sahne yoksa olcecek sey yok).
       Sahne kapisinin "ilk ekran butcesi" sarti: kartlar ilk ekranin
       altinda, hepsi lazy, ve her kartin MOBIL kaynagi var (kural 109:
       cozulmus bitmap <= 2x CSS kutusu). Mobil kutu olculdu: 412 px
       ekranda kart genisligi 372 CSS px (ekran - 2x20 dolgu), tavan
       744 px. Olcu dosyanin kendi basligindan okunur, "urettim" demek
       yetmez. */
    if (/class="sp-sahne"/.test(h)) {
      const TAVAN = 744;
      const bolum0 = h.slice(h.indexOf('class="sp-deste"'));
      const deste = bolum0.slice(0, bolum0.indexOf('</section>'));
      const kusur = [];
      const kartlar = [...deste.matchAll(/<picture>([\s\S]*?)<\/picture>/g)].map(m => m[1]);
      for (const kart of kartlar) {
        const img = (kart.match(/<img[^>]*>/) || [''])[0];
        if (!/loading="lazy"/.test(img)) kusur.push('eager:' + img.slice(0, 40));
        const mob = kart.match(/<source[^>]*media="\(max-width:900px\)"[^>]*srcset="([^"]+)"/);
        if (!mob) { kusur.push('mobil-kaynak-yok'); continue; }
        const dosya = path.join(KOK, mob[1].replace(/^\/yeni\//, ''));
        if (!fs.existsSync(dosya)) { kusur.push('kayip:' + mob[1]); continue; }
        /* webp basligindan gercek piksel genisligi (VP8/VP8L/VP8X) */
        const b = fs.readFileSync(dosya);
        const tur = b.slice(12, 16).toString();
        let gen = null;
        if (tur === 'VP8 ') gen = b.readUInt16LE(26) & 0x3fff;
        else if (tur === 'VP8L') gen = (b.readUInt32LE(21) & 0x3fff) + 1;
        else if (tur === 'VP8X') gen = (b.readUIntLE(24, 3) & 0xffffff) + 1;
        if (gen === null) kusur.push('okunmadi:' + mob[1]);
        else if (gen > TAVAN) kusur.push(`genis:${mob[1]}:${gen}px`);
      }
      if (!kartlar.length) kusur.push('kart-yok');
      ol(`H13 · deste kartlari lazy + mobil kaynak <= ${TAVAN} px`,
         kusur.length === 0, kusur.slice(0, 3).join(' ') || `${kartlar.length} kart`);
    }

    /* H14 · MOBIL SAGLAMLIK: mobil baglamda PAHALI KATMAN yok.
       KURAL DEGISTI (19 Agu, Enes karari — sessizce degil, gerekcesiyle):
       onceki hali `position:sticky` yalniz `min-width:901px` icinde
       dogabilir diyordu ve mobilde pin'i tumden yasakliyordu. Enes sinirin
       yanlis yere cizildigini soyledi: Anayasa'nin "mobilde pin YOK"
       maddesi GSAP pinlerini kapsar — kaydirmayi kilitleyen, resize'da
       kendini baştan kuran, kare basina is ureten pin. CSS `position:
       sticky` o ailenin disinda: duzenin kendi isi, JS yok, dinleyici yok.
       (Eski kaynak da mobilde sticky'ydi, CSS 1287.)

       Kural o yuzden PIN'i degil MALIYETI olcuyor — mobilde kasmanin
       olculmus dort kaynagi bir daha tabana yazilamaz:
         filter / backdrop-filter  kural 109 + Anayasa madde 7
         will-change               kalici kompozit katman
         box-shadow                olceklenen katmanda her karede yeniden
                                   rasterlesiyordu (kural 111)
       "Mobil baglam" = medya sarmali olmayan taban VE telefonu disarida
       birakmayan her sarmal. `min-width:901px`, `pointer:fine` ve
       `hover:hover` telefonu disarida birakir, o yuzden gecerli kapi
       sayilir; baska her yerde bu dort ozellik kirmizidir.
       `none` degerleri serbest: kapatmak maliyet uretmez. */
    {
      const PAHALI = /(?:^|[^a-z-])(filter|backdrop-filter|will-change|box-shadow)\s*:\s*([^;]+)/g;
      const KAPI = /min-width\s*:\s*901px|pointer\s*:\s*fine|hover\s*:\s*hover/;
      const kusur = [];
      let olculen = 0;
      const yuru = (txt, kosul) => {
        let i = 0;
        while (i < txt.length) {
          const ac = txt.indexOf('{', i);
          if (ac === -1) break;
          const bas = txt.slice(i, ac).trim();
          if (/^@(media|supports)/.test(bas)) {
            let d = 1, k = ac + 1;
            for (; k < txt.length && d > 0; k++) { if (txt[k] === '{') d++; else if (txt[k] === '}') d--; }
            yuru(txt.slice(ac + 1, k - 1), kosul + ' ' + bas);
            i = k;
          } else if (bas.startsWith('@')) {
            let d = 1, k = ac + 1;
            for (; k < txt.length && d > 0; k++) { if (txt[k] === '{') d++; else if (txt[k] === '}') d--; }
            i = k;
          } else {
            const kap = txt.indexOf('}', ac);
            if (kap === -1) break;
            const gov = txt.slice(ac + 1, kap);
            if (SAHNE_ONEK.test(bas)) {
              olculen++;
              if (!KAPI.test(kosul))
                for (const m of gov.matchAll(PAHALI))
                  if (!/^\s*none\b/.test(m[2]))
                    kusur.push(bas.slice(0, 24) + ':' + m[1]);
            }
            i = kap + 1;
          }
        }
      };
      yuru(css, '');
      ol('H14 · mobil baglamda pahali katman yok (filter/backdrop/will-change/golge)',
         kusur.length === 0 && olculen > 0,
         kusur.slice(0, 3).join(' | ') || `${olculen} sahne kurali tarandi`);
    }

    /* H15 · destenin icerigi ham HTML'de TAM — sahne talimatinin
       cekirdek sarti: "bu sahnenin kartlari sitenin tek kanit yuzeyi,
       bot bos gorurse E-E-A-T kaybi olur". Eski tarafta kartlari
       `renderProjects` basiyordu; JS kosmayan bot destede hicbir is
       gormuyordu.
       Kural ayni zamanda URETEC BEKCISI: kunye (`deste-gorselleri.json`)
       content.json'un fotografli ilk alti isiyle ortusmezse kirmizi —
       panelden proje eklenip `gorsel-uret.cjs` kosmadiysa sessizce eski
       liste yayina cikmaz. */
    if (/class="sp-sahne"/.test(h)) {
      const c2 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
      const kunye = JSON.parse(fs.readFileSync(
        path.join(__dirname, 'src', 'veri', 'deste-gorselleri.json'), 'utf8'));
      /* Kunye, content.json'un fotografli isler dizisinin BASTAN
         kesilmis hali olmali (deste kurali: fotografi olan ilk N is).
         Uzunlugu kunyeden alip ayni diziyi kesmek dairesel olurdu —
         her kunye kendini dogrulardi; olculen sey SIRA ve KIMLIK. */
      const fotograflilar = (c2.projects || []).filter(x => x.image && !x.imgc);
      const beklenen = fotograflilar.slice(0, kunye.length);
      const onek = kunye.every((k, i) => beklenen[i] && beklenen[i].slug === k.slug);
      const bolum1 = h.slice(h.indexOf('class="sp-sahne"'));
      const deste = bolum1.slice(0, bolum1.indexOf('</section>'));
      /* Karsilastirma COZULMUS metinle: hangi kacis bicimi kullanildigi
         (&quot; mi &#34; mu) derleyicinin isi, kuralin degil. Once
         etiketler atilir, sonra varliklar cozulur — bot da metni boyle
         gorur. */
      const coz = (t) => String(t).replace(/<[^>]+>/g, '')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
      const T2 = (v) => (typeof v === 'string' ? v : (v && (v.tr || v.en)) || '');
      const kusur = [];
      if (!onek || kunye.length === 0)
        kusur.push('kunye != content.json onek (gorsel-uret.cjs kosmadi?)');
      const metin = coz(deste);
      for (const x of beklenen)
        for (const [ad, deger] of [['ad', x.name], ['yil', String(x.year)],
                                   ['etiket', T2(x.tag)], ['anlatim', T2(x.text)]])
          if (!metin.includes(String(deger))) kusur.push(`${x.slug}:${ad}-yok`);
      ol(`H15 · deste icerigi ham HTML'de tam (${beklenen.length} is x ad/yil/etiket/anlatim)`,
         kusur.length === 0, kusur.slice(0, 3).join(' '));
    }

    /* ---- S-K katmaniyla gelen kurallar (H16, H17) -------------------

       H16 · IC BAGLANTI BUTUNLUGU: yeni kabuktaki her `/yeni/...` baglantisi
       gercekten uretilmis bir sayfaya (ya da diskteki bir dosyaya) gitmeli.
       Sahne dokuz hizmet sayfasinin tamamina baglaniyor — sayfanin ic
       baglanti omurgasi burada. Bir slug yanlis yazilirsa ya da rota adi
       degisirse (ornek: /hizmet vs /hizmetler) hata SESSIZDIR: sayfa
       yayinlanir, baglanti 404 verir, hem kullanici hem tarayici kaybeder.
       Kural bunu derlemede kirmiziya cevirir. */
    {
      const kusur = [];
      let sayi = 0;
      for (const p2 of sayfalar) {
        for (const m of oku(p2).matchAll(/<a[^>]*\bhref="(\/yeni\/[^"#?]*)/g)) {
          sayi++;
          const yol = m[1].replace(/^\/yeni\//, '').replace(/\/$/, '');
          const adaylar = [path.join(KOK, yol), path.join(KOK, yol, 'index.html'),
                           path.join(KOK, yol + '.html')];
          if (!adaylar.some(a => fs.existsSync(a) && fs.statSync(a).isFile()))
            kusur.push(rel(p2) + ' -> ' + m[1]);
        }
      }
      ol('H16 · ic baglantilarin hepsi uretilmis bir sayfaya gidiyor',
         kusur.length === 0, kusur.slice(0, 3).join(' | ') || `${sayi} baglanti`);
    }

    /* H17 · KATMAN ICERIGI ham HTML'de tam — KOSULLU (sahne yoksa olcecek
       sey yok). Sahnenin 21 metin anahtarinin (kt0..ktg) 21'i de
       content.json'un `strings` alaninda yasiyor; sahne onlari derlemede
       basar. Panelden bir anahtar bosaltilirsa ya da bilesen bir alani
       basmayi unutursa bot eksik sayfa gorur ve bu SESSIZ bir kayiptir
       (madde 1 + madde 5). Karsilastirma cozulmus metinle yapilir:
       etiketler atilir, varliklar cozulur — bot da boyle gorur. */
    if (/class="sk-sahne"/.test(h)) {
      const c3 = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'content.json'), 'utf8'));
      const str = (c3.strings && c3.strings.tr) || {};
      const ANAHTAR = ['kt0','kt1','kt2','kt3','kt4','kt5','kt6','kt7','kt8','kt9',
                       'kta','ktb','kth','kti','ktc','ktd','kte','ktj','ktm','ktf','ktg'];
      const coz = (t) => String(t).replace(/<[^>]+>/g, '')
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
        .replace(/&quot;/g, '"').replace(/&#x27;|&apos;/g, "'")
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ');
      const bolum = h.slice(h.indexOf('class="sk-sahne"'));
      const metin = coz(bolum.slice(0, bolum.indexOf('</section>')));
      const kusur = [];
      for (const k of ANAHTAR) {
        const deger = coz(typeof str[k] === 'string' ? str[k] : (str[k] && str[k].tr) || '');
        if (!deger) { kusur.push(k + ':content.json-bos'); continue; }
        if (!metin.includes(deger.trim())) kusur.push(k + ':sayfada-yok');
      }
      ol(`H17 · katman icerigi ham HTML'de tam (${ANAHTAR.length} anahtar)`,
         kusur.length === 0, kusur.slice(0, 3).join(' '));
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
