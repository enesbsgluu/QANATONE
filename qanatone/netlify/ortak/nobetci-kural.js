/* netlify/ortak/nobetci-kural.js — NOBETCI KURALLARI (15 Eyl 2026).
   ---------------------------------------------------------------------
   SAF fonksiyonlar: ag yok, saat disaridan gelir. netlify/functions/
   nobetci.js OLCER, bu dosya DEGERLENDIRIR; panel.js bandi buradan cizer.
   Bekci: test/nobetci.test.js (denetim T5 zincirinde).

   ESIKLER VE NEDENLERI
   - YAYIN_PAYI_DK 30: isaretsiz commit'in canliya cikmasi olculdu 1,5-23 dk
     (commit-isareti bellegi). 30 dk'dan eski ve hala canlida degilse
     derleme dusmus ya da hic baslamamistir.
   - Jeton 14 gun: GitHub ince taneli anahtari 13 Eyl'de habersiz doldu,
     panelden yayin 502 verdi. Iki hafta, yenilemek icin rahat pay.
   - Hatirlatma: kritik 6 saatte, uyari gunde bir — ayni sorun her saat
     yeniden gonderilirse bildirim gurultuye doner ve okunmaz.
   - BAYAT_SAAT 3: nobetci saatte bir calisir; 3 saattir olcum yoksa
     zamanlayicinin kendisi durmustur. */
'use strict';

const DK = 60e3, SAAT = 36e5, GUN = 864e5;
/* Netlify'in derlemeyi ATLADIGI commit isaretleri. */
const ISARET = /\[\s*(?:skip ci|ci skip|skip netlify|netlify skip)\s*\]/i;
const YAYIN_PAYI_DK = 30;
const JETON_UYARI_GUN = 14;
const BAYAT_SAAT = 3;
const HATIRLAT = { kritik: 6 * SAAT, uyari: 24 * SAAT };

/* GitHub `github-authentication-token-expiration` basligi:
   "2026-10-13 00:00:00 UTC" -> kalan tam gun (gecmisse negatif). */
function jetonGun(baslik, simdi) {
  if (!baslik) return null;
  const t = Date.parse(String(baslik).trim().replace(' UTC', 'Z').replace(' ', 'T'));
  return Number.isFinite(t) ? Math.floor((t - simdi) / GUN) : null;
}

/* commitler: [{sha, mesaj, tarih}] HEAD'den geriye; canli: surum.json commit.
   Canli, son ISARETSIZ commit ya da ondan yenisiyse sorun yok (Netlify'dan
   elle tetiklenen derleme isaretli HEAD'i de yayinlayabilir). */
function yayinSorunu(commitler, canli, simdi) {
  if (!Array.isArray(commitler) || !commitler.length || !canli) return null;
  const iHedef = commitler.findIndex((c) => !ISARET.test(String(c.mesaj || '')));
  if (iHedef < 0) return null;
  const iCanli = commitler.findIndex((c) => c.sha === canli);
  if (iCanli >= 0 && iCanli <= iHedef) return null;
  const hedef = commitler[iHedef];
  const yas = simdi - Date.parse(hedef.tarih);
  if (!(yas > YAYIN_PAYI_DK * DK)) return null;
  return { k: 'yayin', seviye: 'kritik',
    mesaj: `Son yayın ${String(hedef.sha).slice(0, 7)} ${Math.round(yas / DK)} dakikadır canlıda değil (canlı: ${String(canli).slice(0, 7)}). Netlify derlemesine bakın.` };
}

/* olcum -> sorun listesi [{k, seviye, mesaj}] */
function sorunlar(o, simdi) {
  const s = [];
  for (const p of o.sayfalar || [])
    if (p.durum !== 200)
      s.push({ k: 'sayfa:' + p.yol, seviye: 'kritik', mesaj: `${p.yol} açılmıyor (${p.durum || p.hata || 'cevap yok'})` });
  for (const f of o.fonksiyonlar || [])
    if (f.durum !== f.beklenen)
      s.push({ k: 'fonksiyon:' + f.ad, seviye: 'kritik',
        mesaj: `${f.ad} fonksiyonu beklenmeyen cevap verdi: ${f.durum || f.hata || 'cevap yok'} (beklenen ${f.beklenen})` });
  const y = o.yayin || {};
  if (y.hata) s.push({ k: 'yayin-olcum', seviye: 'uyari', mesaj: 'Yayın durumu ölçülemedi: ' + y.hata });
  else { const ys = yayinSorunu(y.commitler, y.canli, simdi); if (ys) s.push(ys); }
  const j = o.jeton || {};
  if (j.yok)
    s.push({ k: 'jeton', seviye: 'uyari', mesaj: 'GITHUB_TOKEN tanımlı değil: panelden yayın ve yayın kontrolü çalışmaz.' });
  else if (j.durum === 401 || j.durum === 403)
    s.push({ k: 'jeton', seviye: 'kritik', mesaj: `GitHub anahtarı reddedildi (${j.durum}): panelden yayın çalışmaz, anahtarı yenileyin.` });
  else if (typeof j.gun === 'number' && j.gun <= JETON_UYARI_GUN)
    s.push({ k: 'jeton', seviye: j.gun <= 3 ? 'kritik' : 'uyari',
      mesaj: j.gun < 0 ? 'GitHub anahtarının süresi doldu: panelden yayın çalışmaz.'
        : `GitHub anahtarının süresi ${j.gun} gün içinde doluyor; Netlify'da GITHUB_TOKEN'ı yenileyin.` });
  return s;
}

/* onceki durum + simdiki sorunlar -> yeni durum + gonderilecek satirlar.
   Yeni sorun hemen, suren sorun HATIRLAT araliginda, duzelen bir kez. */
function karar(simdiki, onceki, simdi) {
  const eski = new Map(((onceki && onceki.sorunlar) || []).map((x) => [x.k, x]));
  const yeni = [], hala = [], duzelen = [];
  const kayit = simdiki.map((x) => {
    const e = eski.get(x.k);
    if (!e) { yeni.push(x); return { ...x, ilk: simdi, son_uyari: simdi }; }
    const aralik = HATIRLAT[x.seviye] || HATIRLAT.uyari;
    if (e.seviye !== x.seviye || simdi - (e.son_uyari || 0) >= aralik) {
      hala.push(x); return { ...x, ilk: e.ilk, son_uyari: simdi };
    }
    return { ...x, ilk: e.ilk, son_uyari: e.son_uyari };
  });
  for (const [k, e] of eski) if (!simdiki.some((x) => x.k === k)) duzelen.push(e);
  const etiket = (x) => (x.seviye === 'kritik' ? 'SORUN: ' : 'UYARI: ');
  const satirlar = [
    ...yeni.map((x) => etiket(x) + x.mesaj),
    ...hala.map((x) => 'HÂLÂ ' + etiket(x) + x.mesaj),
    ...duzelen.map((x) => 'DÜZELDİ: ' + x.mesaj)
  ];
  return { durum: { zaman: simdi, sorunlar: kayit }, satirlar };
}

const kac = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* Panelin ustundeki bant. Sorun yoksa ve olcum tazeyse BOS (bant yok). */
function bantHtml(d, simdi) {
  const kutu = (renk, ic) => '<div id="nobetciBant" style="margin:0;padding:10px 16px;'
    + 'font:14px/1.5 system-ui,sans-serif;background:' + renk + ';color:#fff">' + ic + '</div>';
  if (!d || !d.zaman) return kutu('#444', '<b>Nöbetçi</b> · henüz ölçüm yapmadı (saatte bir çalışır).');
  const s = d.sorunlar || [];
  const parca = [];
  const yas = simdi - d.zaman;
  if (yas > BAYAT_SAAT * SAAT)
    parca.push(`Nöbetçi ${Math.floor(yas / SAAT)} saattir ölçüm yapmadı; zamanlanmış fonksiyon durmuş olabilir.`);
  for (const x of s) parca.push((x.seviye === 'kritik' ? 'SORUN: ' : 'UYARI: ') + x.mesaj);
  if (!parca.length) return '';
  if (s.length && d.wa && d.wa.ok === false) parca.push('WhatsApp uyarısı gönderilemedi: ' + (d.wa.neden || 'bilinmiyor'));
  const renk = s.some((x) => x.seviye === 'kritik') ? '#b3001b' : '#8a5a00';
  return kutu(renk, '<b>Nöbetçi</b> · ' + parca.map(kac).join('<br>'));
}

/* Bandi panel govdesinde <body>'nin hemen ardina koyar; bant bossa govde
   AYNEN doner (panel.js her acilista bundan gecer). */
function bantEkle(html, bant) {
  if (!bant) return html;
  return /<body[^>]*>/i.test(html) ? html.replace(/<body[^>]*>/i, (m) => m + bant) : bant + html;
}

module.exports = { ISARET, YAYIN_PAYI_DK, JETON_UYARI_GUN, BAYAT_SAAT, HATIRLAT,
  jetonGun, yayinSorunu, sorunlar, karar, bantHtml, bantEkle };
