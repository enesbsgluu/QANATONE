# TUR 6 — Ajan hazırlığı ve başlık katmanı (2 Eylül 2026, gece zinciri)

Dört kalem, hepsi kendi sitemiz için. Teşhis aracına kalem eklenmedi (ayrı iş).

## 1. robots.txt (üretilen çıktı `dist/robots.txt`, satır satır)

```
# QANATONE
User-agent: *
Allow: /
Content-Signal: search=yes, ai-input=yes, ai-train=no
Disallow: /shell.html
Disallow: /admin.html
Disallow: /404.html

User-agent: GPTBot            Allow: /
User-agent: OAI-SearchBot     Allow: /
User-agent: ChatGPT-User      Allow: /
User-agent: ClaudeBot         Allow: /
User-agent: Claude-User       Allow: /
User-agent: Claude-SearchBot  Allow: /
User-agent: PerplexityBot     Allow: /
User-agent: Google-Extended   Allow: /
User-agent: Applebot-Extended Allow: /
User-agent: CCBot             Allow: /
User-agent: meta-externalagent Allow: /

Sitemap: https://qanatone.com/sitemap.xml
```
(Yorum satırları atlandı; bot grupları dosyada ikişer satır.) AI botları
zaten AÇIKTI (build.js `robots()`); bu turda eklenen tek satır
`Content-Signal`. Üretici: `build.js` → `robots()`.

## 2. Content Signals

- robots.txt: `Content-Signal: search=yes, ai-input=yes, ai-train=no` (`User-agent: *` grubunda)
- HTTP başlığı: `_headers` `/*` bloğunda aynı satır. Gerçek yanıt (yerel-sun,
  `_headers` uygulanıyor): `/yeni/hizmet/finans/`, `/hizmetler/finans`,
  `/robots.txt`, `/yeni/en/` → `content-signal: search=yes, ai-input=yes, ai-train=no`.
- `ai-train=no` Enes'in politika kararı; `ai-input=yes` GEO tezinin gereği.

## 3. Link başlıkları (`_headers`)

Üretici `yeni/link-basliklari.cjs`: dist kök + dist/yeni'deki 120 sayfanın
KENDİ `<head>`'inden canonical + hreflang alternate okunur, iki yol biçimiyle
(`/yol/` ve `/yol`) `_headers`'a LINK-BASLIKLARI isaretleri arasına yazılır.

| Ölçüm | Değer |
|---|---|
| Sayfa | 120 (kök 61 + yeni 59) |
| Yol girdisi | 240 |
| Alternate bağı | 348 |
| `_headers` boyutu | 83.546 B (önce ~6 KB) |

Gerçek yanıt örneği (`/yeni/hizmet/finans/`):
`link: <https://qanatone.com/hizmetler/finans>; rel="canonical", <…/hizmetler/finans>; rel="alternate"; hreflang="tr", <…/en/hizmetler/finans>; rel="alternate"; hreflang="en", <…>; rel="alternate"; hreflang="x-default"`

Tazelik kuralı (eski suite): `KONTROL=1 node yeni/link-basliklari.cjs` — ALT
KÜME denetimi: Netlify'da kök derleme (içindeki suite) astro'dan ÖNCE koşar,
o anda dist/yeni yok; kural "mevcut her sayfanın girdisi blokta var mı" diye
bakar. Kaynak değişince (yeni sayfa, canonical değişimi) üretici yeniden
koşulur ve `_headers` commit'lenir; koşulmazsa suite adıyla kırmızı.

## 4. Organization `sameAs`

`yeni/src/sema.mjs` zaten `socials[].url` → `sameAs` yazıyordu (TUR 5 kapısı
socials.0.url'yi şemada buldu). Bu turda KURAL geldi: `H25 · Organization.sameAs
= panel socials (N adres / → [])`, iki yön ölçüldü:

| content.json socials | Üretim | H25 |
|---|---|---|
| 1 adres (instagram) | `"sameAs":["https://www.instagram.com/qanatone"]` | ok, sema 1 · panel 1 |
| `[]` | `"sameAs":[]` | ok, 0 adres → [] |

Eski site (`index.html` schema()) boş listede alanı hiç yazmıyor
(`soc.length?soc:undefined`); yeni sitede boş dizi. Kesmede eski sürüm gider.

## 5. Kapı

- robots.txt üretilen çıktıda doğru: eski suite 2 kural (Content-Signal satırı; 5 AI botu Allow).
- Link başlıkları gerçek yanıtta görünüyor: 4 adreste curl ile gösterildi.
- sameAs panelden besleniyor, boş hâli sınandı (H25 iki yön).
- `_headers` desenleri: `/*` (Content-Signal + güvenlik), `/yeni/_astro/*`,
  `/yeni/varlik/*`, `/varlik/*`, `/yeni/font/*`, `/yeni/img/*`, `/yeni/404.html`,
  `/404.html`, `/admin.html`, `/shell.html` + 240 sayfa yolu. Açık kalan sınıf
  yok (kök `/img/*`, `/js/*` bilinçli: hash'siz, eski site).
- Suite: yeni 56/0, eski 135/0 (128 → 135: TUR 5 üç + TUR 6 dört kural).
- Markdown içerik müzakeresi bu turda yok (kenar fonksiyonu, ayrı iş).
