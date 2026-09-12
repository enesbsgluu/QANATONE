---
name: site-tespit
description: Bir web sitesinin teknik sağlığını ve ajan hazırlığını gerçek isteklerle ölçer; kalem kalem durum ve puan döndürür.
version: 1.0.0
license: Kullanım koşulları — https://www.qanatone.com/hukuki/
---

# Site Tespit

Verilen adresi çeker ve ölçer. Tahmin yok: her kalem gerçek bir istekten çıkar.

## Ne zaman kullanılır

- "Bu sitenin teknik durumu nedir" sorusuna sayıyla cevap gerektiğinde
- Bir sitenin yapay zekâ ajanlarına hazır olup olmadığı sorulduğunda
- Sayfa ağırlığı, yönlendirme zinciri, robots/sitemap kurulumu incelenirken

## Nasıl çağrılır

Üç yol var, **aynı ölçümü** yaparlar ve **aynı kotayı** harcarlar. Hangisini
seçeceğin ajanının konuştuğu protokole bağlıdır.

**1 · Doğrudan HTTP**

```http
POST https://www.qanatone.com/.netlify/functions/diagnose
Content-Type: application/json

{ "url": "https://example.com" }
```

**2 · MCP** (Streamable HTTP) — sunucu kartı
`/.well-known/mcp.json`, uç `https://www.qanatone.com/mcp`.
Tek araç: `site_tespit`, girdi `{ "url": "…" }`. Yanıt hem metin özeti
hem `structuredContent` taşır. Ölçüm yapılamazsa JSON-RPC hatası değil,
`isError: true` taşıyan bir araç sonucu döner — sebep `structuredContent.reason`'dadır.

**3 · A2A** (JSON-RPC) — ajan kartı
`/.well-known/agent-card.json`, uç `https://www.qanatone.com/a2a`.
`message/send` ile adres gönderilir; adresi `DataPart` içinde
`{"url": "…"}` olarak vermek en güvenilir yoldur, metin içinde geçen
açık adres de okunur. Tamamlanmış bir `Task` döner, eseri metin + veri
olarak taşır. Akış (`message/stream`) ve geri arama yoktur.

Hiçbirinde kimlik doğrulaması gerekmez. Kota IP başınadır; aşılırsa
doğrudan HTTP yolunda **429**, MCP ve A2A yollarında `reason: "kota"` döner.

## Yanıt

Başarılıysa `ok: true` ve şu alanlar gelir:

| alan | anlamı |
|---|---|
| `host`, `finalUrl` | çözümlenen alan adı ve yönlendirmelerden sonraki adres |
| `score` | 0–100 toplam puan |
| `status`, `bytes`, `redirects` | HTTP durumu, ana sayfa baytı, yönlendirme sayısı |
| `cdn`, `durum` | tespit edilen CDN ve özet durum etiketi |
| `kalan` | bu istemci için kalan analiz hakkı |
| `items[]` | ölçüm kalemleri: `k` (anahtar), `state` (`ok`/`warn`/`fail`), `v` (ölçülen), `o` (ölçüt) |

Adres okunamazsa yine **200** döner ama `ok: false` ve `reason` gelir — HTTP kodu değil, `ok` alanı okunmalıdır.

## Sınırlar — dürüstçe

- Ölçüm **ana sayfa + robots.txt + sitemap.xml** üzerinden yapılır; tüm siteyi taramaz.
- Kota vardır; toplu tarama için uygun değildir.
- Puan bir sıralama iddiası değil, kalemlerin özetidir. Karar için `items[]` okunmalıdır.

## Şema

OpenAPI 3.1: https://www.qanatone.com/.well-known/openapi.json
