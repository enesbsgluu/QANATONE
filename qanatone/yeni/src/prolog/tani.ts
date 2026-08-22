/* ============================================================
   PROLOG · TANI — YEDEK YOLA DUSUSU GORUNUR KILAR.

   NEDEN VAR: sahne A yolundan (isci + OffscreenCanvas + WebGL2) B
   yoluna SESSIZCE dusuyordu. `pr-gl` sinifi geri aliniyor, gorsel
   olarak makul bir sey kaliyor ve gerekce hicbir yere yazilmiyordu.
   Sonuc: "Brave'de calisiyor, Chrome'da calismiyor" gozlemi elde
   varken sebebi ayirt edecek TEK BIR olcum yoktu. Bir daha kor
   kalmayalim diye her dusus dali burada adlandirilir.

   IKI IZ BIRAKIR, IKISI DE UCUZ:
     1. `console.warn('[prolog] yedek yol · <sebep>')` — telefonda ve
        uzak hata ayiklamada tek satir okunur.
     2. `<html data-prolog="<sebep>">` — DOM'da kalir, yani ekran
        goruntusunden, `dump-dom`dan, denetimden ve puppeteer'dan
        SORULABILIR. Konsol ucucu, oznitelik degil.

   YEDEK YOLUN KENDISI DE OLU OLABILIR. B yolunun surucusu saf CSS:
   `view-timeline` + `animation-timeline: view()`. Safari'ye 26 ile
   geldi; oncesinde `@supports` blogu hic uygulanmaz ve sahne tek
   SABIT kare olur (prolog.css basindaki "TABAN = BITMIS HAL" karari).
   O yuzden dususu bildirirken yedek yolun surucusunu de yokluyoruz:
   "3B acilmadi" ile "3B acilmadi VE paralaks da yok" ayri iki durum.
   ============================================================ */

/** B yolunun surucusu var mi (Safari <26'da yok). */
export function paralaksVar(): boolean {
  try { return CSS.supports('animation-timeline', 'view()'); } catch { return false; }
}

/** 3B acilmadi. Sebebi adlandir, izi konsola ve `<html>`e birak. */
export function yedek(sebep: string, ek?: unknown): void {
  try {
    document.documentElement.dataset.prolog = sebep;
    const donuk = !paralaksVar();
    console.warn(
      `[prolog] yedek yol · ${sebep}${donuk ? ' · paralaks da YOK (sabit kare)' : ''}`,
      ek ?? '',
    );
    if (donuk) document.documentElement.dataset.prologYedek = 'sabit';
  } catch { /* konsolsuz ortam: sahne yine de calisir */ }
}

/** 3B acildi — ayni oznitelik uzerinden olumlu hukum. */
export function acildi(): void {
  try { document.documentElement.dataset.prolog = '3b'; } catch { /* yoksay */ }
}
