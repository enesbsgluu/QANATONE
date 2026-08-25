# -*- coding: utf-8 -*-
"""============================================================
AMBLEM SDF URETECI (24 Agustos 2026, F3 kalem 5 / adim 0).

GIRDI  src/prolog/amblem.json  (yol.halka + yol.dag, kutu 1254)
       src/prolog/sahne.json   (durak2.yerlesim r, olcum.dpr_tavan)
       src/prolog/veri.json    (varyant oranlari)
       src/stil/temel.css      (--red; nav logosu icin)

CIKTI  public/img/prolog/amblem-sdf-d<N>.webp   masaustu SDF (L, kayipsiz)
       public/img/prolog/amblem-sdf-m<N>.webp   mobil SDF
       public/img/qanatone.webp + .avif         nav logosu, AYNI alandan
       src/veri/amblem-sdf-kunye.json           hash'ler + OLCULEN gercekler
       src/veri/logo-kunye.json                 R19'un okudugu kunye

NEDEN SDF, EKSTRUZYON DEGIL. Kilitli olan METALDI, ekstruzyon o metale
ulasma yoluydu. Olculdu: ekstruzyon agi en ucuz kullanilir halinde
(genis pah + cok kaba ucgenleme) 344 KB ham / ~241 KB gzip - mobil
prolog butcesindeki 33 KB'in yedi kati. SDF hem sigiyor hem daha iyi:
normal, uzakligin EGIMINDEN cikiyor ve egrilik SUREKLI; ucgenli pahta
egrilik ayrik, huzme kenarda basamak atlar. Karar Enes'in (24 Agu).

KURULUM - NOKTA ORNEKLEME, ORTALAMA DEGIL. Ilk olcumde 512 texel'lik
SDF kuyrugun ucunu 2,24 px geri cekiyordu ve bu cozunurluge yazildi.
Yanlisti: SDF 2048'de hesaplanip PIL ile KUCULTULUYORDU, kucultme alan
ortalamasi alir; ince ucta dis negatif uzakliklar ic pozitiflerle
karisip sifir gecisini iceri ceker. Uzaklik alani Lipschitz-1'dir,
texel MERKEZINDE nokta orneklemek dogrudur. Olculdu (bagimsiz iki
betik): ayni 512'de nokta ornekleme 0,28 px - vektorun kendi tabani.

COZUNURLUK SABIT DEGIL, VARYANT BASINA TURETILIYOR (Enes, 24 Agu):
katman kuraliyla ayni - "1 kaynak piksel = 1 cihaz pikseli", varyantin
en buyuk kh'li referans ekraninda, dpr_tavan ile:
    texel = 1254 * r * kh_azami * dpr_tavan   -> 64'e yukari yuvarla
Olcek `r` sahne.json'dan OKUNUR (masaustu r degisirse cozunurluk de
degisir - r=0,0005 -> 1344, r=0,00046 -> 1216; mobil 0,000348 -> 832).
OLCULEN DOYUM ESIGI de kunyeye yaziliyor: kafes fazi uzerinde en kotu
uc kaymasi 640-768 texel'de doyuyor (kuyruk ucu 4 birim = 768'de 2,45
texel), otesinde yalniz ortalama iyilesiyor. Doku tavani zorlarsa
inilebilecek yer 768'dir; bunun altinda uc geri cekilir (512: +2,2 px).

BANT BIRIM CINSINDEN, PIKSEL DEGIL: +-12 birim. Her varyantta ayni
fiziksel pah: prototip pahi 7 birim (ana.js bevelSize), kuyruk ucunun
yari genisligi 2 birim, pay 3. Bant pahtan darsa normal (egim) pah
icinde kirpilir ve huzme duz kalir. Nicemleme: 24 birim / 255 = 0,094
birim/adim = 0,1 texel (1344) - sifir gecisi icin fazlasiyla ince.

FAZ TESTI URETILEN DOSYANIN KENDISINDE: kunyeye yazilan uc kaymasi bu
dosyadan, 16 kafes fazinda en kotu deger. "Yesil sayi dogru seyi
olctugunun kaniti degil" - o yuzden vektor tabani da yaninda.

NAV LOGOSU AYNI ALANDAN: 293 px boy, --red duz dolgu, kenar SDF'ten
yumusatilmis (alfa = smoothstep). Boylece amblem ve nav logosu TEK
kaynaktan; malzeme geldiginde nav logosu da ayni golgelemeyle yeniden
uretilir (bkz. kunye 'nav_golgeleme').

Kullanim:  python amblem-sdf.py
============================================================"""
import hashlib
import io
import json
import math
import os
import re
import subprocess
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

KOK = os.path.dirname(os.path.abspath(__file__))
PROLOG = os.path.join(KOK, 'src', 'prolog')
CIKTI_DIZIN = os.path.join(KOK, 'public', 'img', 'prolog')
NAV_CIKTI = os.path.join(KOK, 'public', 'img', 'qanatone')
KUNYE_SDF = os.path.join(KOK, 'src', 'veri', 'amblem-sdf-kunye.json')
KUNYE_LOGO = os.path.join(KOK, 'src', 'veri', 'logo-kunye.json')
CHROME = r'C:\Program Files\Google\Chrome\Application\chrome.exe'

KAYNAK_BOY = 4096          # maske ve EDT cozunurlugu (hedefin >= 3 kati)
BANT_BIRIM = 12.0
NAV_BOY = 293
# Referans ekranlar - denetim.cjs EK listesiyle AYNI. Kirilim 760 px.
EKRAN = {'masaustu': [(768, 1024), (1440, 900)], 'mobil': [(360, 800), (412, 892)]}
UC = (1022.0, 1059.0)      # cizim2.kuyruk yolunun basi = kuyrugun ucu


def sha1(yol):
    h = hashlib.sha1()
    with open(yol, 'rb') as f:
        for blok in iter(lambda: f.read(65536), b''):
            h.update(blok)
    return h.hexdigest()


def oku_json(ad):
    return json.load(io.open(os.path.join(PROLOG, ad), encoding='utf-8'))


def kizil_oku():
    with open(os.path.join(KOK, 'src', 'stil', 'temel.css'), encoding='utf-8') as f:
        m = re.search(r'--red\s*:\s*(#[0-9a-fA-F]{6})', f.read())
    if not m:
        raise SystemExit('temel.css icinde --red bulunamadi')
    h = m.group(1).lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4)), m.group(1).lower()


def cozunurluk(varyant, S, V, r=None):
    """r verilmezse sahne.json'daki secili olcek; ADAY olcekler icin
    (durak2.olcek_adaylari) ayni formul ayri r ile."""
    if r is None:
        r = S['durak2']['yerlesim'][varyant]['r']
    oran = V['varyant'][varyant]['oran']
    dpr = S['olcum']['dpr_tavan']
    kh = max(max(H, W / oran) for (W, H) in EKRAN[varyant])
    kutu_css = 1254.0 * r * kh
    texel = kutu_css * dpr
    N = int(math.ceil(texel / 64.0) * 64)
    return N, dict(r=r, kh=round(kh, 1), kutu_css=round(kutu_css, 1), texel=round(texel, 1))


def maske_uret(A, yollar=('halka', 'dag')):
    """Amblemin alfa maskesi - Chrome'da, urunun cizdigi YOLLARDAN (ikinci
    kaynak yok: amblem.json). Beyaz = dolu; nehir yollarin icinde zaten delik.
    `yollar`: govde icin (halka, dag); beyaz ic icin ayrica ('nehir',)."""
    kutu = A['kutu']
    svg = (u'<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" '
           u'viewBox="0 0 %d %d"><rect width="100%%" height="100%%" fill="#000"/>'
           % (KAYNAK_BOY, KAYNAK_BOY, kutu, kutu)
           + u''.join(u'<path d="%s" fill="#fff"/>' % A['yol'][y] for y in yollar) + u'</svg>')
    svg_yol = os.path.join(KOK, 'amblem-maske.svg')
    png_yol = os.path.join(KOK, 'amblem-maske.png')
    io.open(svg_yol, 'w', encoding='utf-8').write(svg)
    subprocess.run([CHROME, '--headless', '--disable-gpu', '--no-sandbox',
                    '--screenshot=' + png_yol, '--window-size=%d,%d' % (KAYNAK_BOY, KAYNAK_BOY),
                    'file:///' + svg_yol.replace('\\', '/')],
                   check=True, capture_output=True, timeout=180)
    m = np.asarray(Image.open(png_yol).convert('L')) > 127
    os.remove(svg_yol); os.remove(png_yol)
    if m.shape != (KAYNAK_BOY, KAYNAK_BOY):
        raise SystemExit('maske olcusu beklenen degil: %s' % (m.shape,))
    return m


def isaretli_uzaklik(m):
    return ndimage.distance_transform_edt(m) - ndimage.distance_transform_edt(~m)


def beyaz_ic(m_govde, m_nehir):
    """BEYAZ IC (Enes, 24 Agu): ic disk + nehir beyaz = marka logosunun
    tamamlanmis hali. Ic disk = govde+nehir birlesiminde KENARA DEGMEYEN
    arka plan bilesenleri (gok bolgesi) - dag zaten govdede, cikmaz;
    nehir = `yol.nehir` dolgusu (yarik disari acildigi icin kapali
    bilesen degil, ayri veriliyor). Eski rasterden DEGIL, amblem.json'dan."""
    kapali = m_govde | m_nehir
    etiket, n = ndimage.label(~kapali)
    kenar = set(np.unique(np.concatenate([etiket[0, :], etiket[-1, :], etiket[:, 0], etiket[:, -1]])))
    ic = np.isin(etiket, [i for i in range(1, n + 1) if i not in kenar])
    return (ic | m_nehir) & ~m_govde


def sdf_ornekle(alan, N, kutu, fx=0.0, fy=0.0):
    """Texel merkezinde NOKTA ornekleme. Sonuc BIRIM cinsinden (1254'luk
    kutu), banda kirpilmis, 8-bit. fx/fy: faz testi icin kesirli kaydirma."""
    olc = KAYNAK_BOY / float(N)
    c = (np.arange(N) + 0.5 + fx) * olc - 0.5
    r = (np.arange(N) + 0.5 + fy) * olc - 0.5
    yy, xx = np.meshgrid(r, c, indexing='ij')
    d = ndimage.map_coordinates(alan, [yy, xx], order=1, mode='nearest')
    d_birim = d * (kutu / float(KAYNAK_BOY))
    q = np.clip((np.clip(d_birim, -BANT_BIRIM, BANT_BIRIM) + BANT_BIRIM)
                / (2 * BANT_BIRIM) * 255.0, 0, 255)
    return np.round(q).astype(np.uint8)


def coz(q):
    return q.astype(np.float32) / 255.0 * (2 * BANT_BIRIM) - BANT_BIRIM


def siluet_ekranda(q, N, b, fx=0.0, fy=0.0):
    """Urunun yapacagi sey: ekran pikseli merkezinde bilinear ornekleme, d>0."""
    d = coz(q)
    c = (np.arange(b) + 0.5) * N / float(b) - 0.5 - fx
    r = (np.arange(b) + 0.5) * N / float(b) - 0.5 - fy
    yy, xx = np.meshgrid(r, c, indexing='ij')
    return ndimage.map_coordinates(d, [yy, xx], order=1, mode='nearest') > 0.0


def uc_kaymasi(sil, b, kutu):
    ys, xs = np.where(sil)
    return float(np.min(np.hypot(xs - UC[0] * b / kutu, ys - UC[1] * b / kutu)))


def kuyruk_yonu(A):
    """Kuyruk ekseni: cizim2.kuyruk yolunun ilk iki noktasi (uc -> govde),
    UCA DOGRU birim vektor."""
    n = [float(v) for v in re.findall(r'-?\d+\.?\d*', A['cizim2']['kuyruk']['yol'])]
    dx, dy = n[0] - n[2], n[1] - n[3]
    h = math.hypot(dx, dy)
    return dx / h, dy / h


def uzanim(sil, b, kutu, yon, yaricap=14.0):
    """KUYRUK EKSENI BOYUNCA IMZALI UZANIM. `uc_kaymasi` en yakin dolu
    piksele uzakliktir ve UZAMAYI GOREMEZ, yana kaymayi eksik gosterir
    (karsit dogrulama, 24 Agu). Bu sayi ucun yakinindaki dolu piksellerin
    kuyruk yonune izdusumunun azamisi: vektor ucuna gore + uzama, -
    kisalma. Ucun yakininda hic dolu piksel yoksa -yaricap (kirpilmis,
    isaretli)."""
    ux, uy = UC[0] * b / kutu, UC[1] * b / kutu
    ys, xs = np.where(sil)
    d = np.hypot(xs - ux, ys - uy)
    m = d <= yaricap
    if not m.any():
        return -yaricap
    return float(np.max((xs[m] - ux) * yon[0] + (ys[m] - uy) * yon[1]))


def faz_testi(alan, N, kutu, m, ekran_enleri, A):
    """Uretilen SDF'in kendisinde, 16 kafes fazinda: en kotu uc kaymasi
    (yakinlik) VE imzali uzanim (iki yon). Yaninda vektor tabani: ayni
    ekran olceginde vektorun kendi rasteri."""
    yon = kuyruk_yonu(A)
    sonuc = {}
    for en in ekran_enleri:
        b = int(round(en / (876.6 / kutu)))
        vek = np.asarray(Image.fromarray(m.astype(np.uint8) * 255)
                         .resize((b, b), Image.LANCZOS)) > 127
        taban = uc_kaymasi(vek, b, kutu)
        e0 = uzanim(vek, b, kutu, yon)
        v, imz = [], []
        for fx in (0.0, 0.25, 0.5, 0.75):
            for fy in (0.0, 0.25, 0.5, 0.75):
                sil = siluet_ekranda(sdf_ornekle(alan, N, kutu, fx, fy), N, b, fx, fy)
                v.append(uc_kaymasi(sil, b, kutu))
                imz.append(uzanim(sil, b, kutu, yon) - e0)
        sonuc[str(int(en))] = dict(vektor_tabani=round(taban, 2), azami=round(max(v), 2),
                                   ortalama=round(float(np.mean(v)), 2),
                                   tabanin_ustu=round(max(v) - taban, 2),
                                   uzama_azami=round(max(0.0, max(imz)), 2),
                                   kisalma_azami=round(min(0.0, min(imz)), 2))
    return sonuc


def yarik_min(q, N, kutu, A):
    """Nehir yarigi: hattin ic kismindaki (ilk/son 8 nokta = kama, atilir)
    her noktada en yakin dolu texele uzaklik x2, birim cinsinden, minimum."""
    sil = coz(q) > 0
    dis = ndimage.distance_transform_edt(~sil) * (kutu / float(N))
    nok = A['nehir_hat']['nokta'][8:-8]
    return round(float(min(2.0 * dis[int(y * N / kutu), int(x * N / kutu)] for (x, y) in nok)), 2)


def nav_logo(q, N, kutu, A, RED, q_beyaz=None):
    """293 px boy, vektor kutusuna (876,6 x 996,8) kirpilmis, --red duz
    dolgu, alfa SDF'ten: 0,5 birim'lik yumusatma. `q_beyaz` verilirse
    BEYAZ IC hali: ic disk + nehir beyaz, govde ustte (iki SDF, AA'li
    kompozit)."""
    kx, ky, kw, kh = 178.75, 108.75, 876.574, 996.844
    boy = NAV_BOY
    en = int(round(boy * kw / kh))
    olc = kh / boy                                 # birim / piksel
    c = kx + (np.arange(en) + 0.5) * olc
    r = ky + (np.arange(boy) + 0.5) * olc
    yy, xx = np.meshgrid(r * N / kutu - 0.5, c * N / kutu - 0.5, indexing='ij')
    d = ndimage.map_coordinates(coz(q), [yy, xx], order=1, mode='nearest')
    alfa = np.clip(d / olc + 0.5, 0.0, 1.0)         # 1 piksellik kenar
    if q_beyaz is None:
        im = np.zeros((boy, en, 4), np.uint8)
        im[..., 0], im[..., 1], im[..., 2] = RED
        im[..., 3] = np.round(alfa * 255).astype(np.uint8)
        return Image.fromarray(im, 'RGBA')
    db = ndimage.map_coordinates(coz(q_beyaz), [yy, xx], order=1, mode='nearest')
    ab = np.clip(db / olc + 0.5, 0.0, 1.0)
    BEYAZ = (255, 255, 255)
    # once beyaz, ustune kizil (govde her yerde beyazin ustunde)
    rgb = np.zeros((boy, en, 3), np.float32)
    a = np.zeros((boy, en), np.float32)
    for renk, al in ((BEYAZ, ab), (RED, alfa)):
        for k in range(3):
            rgb[..., k] = rgb[..., k] * (1 - al) + renk[k] * al
        a = a * (1 - al) + al
    im = np.zeros((boy, en, 4), np.uint8)
    # duz alfa: renk ustuste bindirilmis, alfa birlesik
    for k in range(3):
        im[..., k] = np.round(np.where(a > 0, rgb[..., k] / np.maximum(a, 1e-6) * 0 + rgb[..., k], 0)).astype(np.uint8)
    im[..., 3] = np.round(a * 255).astype(np.uint8)
    return Image.fromarray(im, 'RGBA')


def isik(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def main():
    A, S, V = oku_json('amblem.json'), oku_json('sahne.json'), oku_json('veri.json')
    RED, red_hex = kizil_oku()
    kutu = A['kutu']
    print('maske %dx%d Chrome ile...' % (KAYNAK_BOY, KAYNAK_BOY)); sys.stdout.flush()
    m = maske_uret(A)
    print('isaretli uzaklik...'); sys.stdout.flush()
    alan = isaretli_uzaklik(m)
    os.makedirs(CIKTI_DIZIN, exist_ok=True)

    # Eski SDF dosyalarini temizle (cozunurluk adda; r degisince ad degisir)
    for f in os.listdir(CIKTI_DIZIN):
        if f.startswith('amblem-sdf-'):
            os.remove(os.path.join(CIKTI_DIZIN, f))

    kunye = {
        '_': ('amblem-sdf.py tarafindan yazilir, ELLE DUZENLENMEZ. Cozunurluk '
              'sahne.json r + veri.json oran + dpr_tavan\'dan turetilir; bant birim '
              'cinsinden. Denetim R21 hash\'leri ve turetimi kiyaslar.'),
        'kaynak': 'amblem.json', 'kaynak_sha1': sha1(os.path.join(PROLOG, 'amblem.json')),
        'kaynak_boy': KAYNAK_BOY, 'bant_birim': BANT_BIRIM, 'kutu': kutu,
        'kurulum': 'texel merkezinde nokta ornekleme (map_coordinates order=1), ortalama yok',
        'doyum_esigi_texel': 768,
        'doyum_notu': ('kafes fazi uzerinde en kotu uc kaymasi 640-768 texel\'de doyuyor '
                       '(kuyruk ucu 4 birim = 768\'de 2,45 texel); doku tavani zorlarsa '
                       'inilebilecek yer 768, altinda uc geri cekilir (512: +2,2 px)'),
        'varyant': {},
    }
    ekranlar = {'masaustu': (449.0, 413.0), 'mobil': (272.0, 244.0)}
    for varyant, harf in (('masaustu', 'd'), ('mobil', 'm')):
        N, tur = cozunurluk(varyant, S, V)
        print('%s: N=%d  (%s)' % (varyant, N, tur)); sys.stdout.flush()
        q = sdf_ornekle(alan, N, kutu)
        ad = 'amblem-sdf-%s%d.webp' % (harf, N)
        yol = os.path.join(CIKTI_DIZIN, ad)
        Image.fromarray(q, 'L').save(yol, 'WEBP', lossless=True, quality=100, method=6)
        geri = np.asarray(Image.open(yol).convert('L'))
        if not np.array_equal(geri, q):
            raise SystemExit('webp kayipsiz degil: ' + ad)
        faz = faz_testi(alan, N, kutu, m, ekranlar[varyant], A)
        kunye['varyant'][varyant] = dict(
            dosya=ad, N=N, turetim=tur, bant_texel=round(BANT_BIRIM * N / kutu, 2),
            bayt=os.path.getsize(yol), sha1=sha1(yol),
            gpu_bayt_R8=N * N, gpu_bayt_RGBA=N * N * 4,
            uc_kaymasi_px=faz, yarik_min_birim=yarik_min(q, N, kutu, A))
        print('   %s  %.1f KB  faz: %s' % (ad, os.path.getsize(yol) / 1024.0, faz)); sys.stdout.flush()
        if varyant == 'masaustu':
            qd, Nd = q, N

    # ADAY OLCEKLER (Enes, 24 Agu): olcek karari hareketli kapi shader'la
    # kosunca verilecek; iki SDF'yi birden tasimanin maliyeti yok, derleme
    # aninda uretiliyor. Aday URUNE INMEZ (kunye ayri, butceye girmez),
    # yalniz olcum icin durur; karar verilince liste bosaltilir ve dosya
    # bir sonraki uretimde silinir.
    kunye['aday'] = []
    r_secili = S['durak2']['yerlesim']['masaustu']['r']
    oran_d = V['varyant']['masaustu']['oran']
    for r in (S['durak2'].get('olcek_adaylari') or {}).get('masaustu', []):
        if abs(r - r_secili) < 1e-12:
            continue
        N2, tur2 = cozunurluk('masaustu', S, V, r)
        q2 = sdf_ornekle(alan, N2, kutu)
        ad2 = 'amblem-sdf-d%d.webp' % N2
        yol2 = os.path.join(CIKTI_DIZIN, ad2)
        Image.fromarray(q2, 'L').save(yol2, 'WEBP', lossless=True, quality=100, method=6)
        enler = tuple(876.6 * r * max(H, W / oran_d) for (W, H) in EKRAN['masaustu'])
        faz2 = faz_testi(alan, N2, kutu, m, enler, A)
        kunye['aday'].append(dict(r=r, dosya=ad2, N=N2, turetim=tur2,
                                  bayt=os.path.getsize(yol2), sha1=sha1(yol2),
                                  gpu_bayt_R8=N2 * N2, uc_kaymasi_px=faz2,
                                  yarik_min_birim=yarik_min(q2, N2, kutu, A)))
        print('   ADAY r=%g -> %s  %.1f KB  faz: %s' % (r, ad2, os.path.getsize(yol2) / 1024.0, faz2))
        sys.stdout.flush()

    # NAV LOGOSU - IKI HAL (Enes, 24 Agu), masaustu alanindan.
    #   delik : ic disk/dag/nehir oyuk - prologda devir aninda amblemle ayni sey
    #   beyaz : ic disk + nehir beyaz - marka logosu; STATIK nav (tum sayfalar)
    print('beyaz ic maskesi (nehir yolu)...'); sys.stdout.flush()
    m_nehir = maske_uret(A, ('nehir',))
    m_beyaz = beyaz_ic(m, m_nehir)
    alan_b = isaretli_uzaklik(m_beyaz)
    qb = sdf_ornekle(alan_b, Nd, kutu)
    haller = {}
    for hal, q_b, ad_c in (('delik', None, NAV_CIKTI + '-delik'), ('beyaz', qb, NAV_CIKTI)):
        im = nav_logo(qd, Nd, kutu, A, RED, q_b)
        im.save(ad_c + '.webp', 'WEBP', quality=90, method=6)
        im.save(ad_c + '.avif', 'AVIF', quality=72)
        son = list(im.getdata())
        Ls = sorted(isik(p) for p in son if p[3] > 250 and p[0] > 40 and p[0] - max(p[1], p[2]) > 25)
        beyaz = sum(1 for p in son if p[3] > 250 and min(p[:3]) > 170)
        haller[hal] = dict(
            dosya=os.path.basename(ad_c), olcu=[im.width, im.height],
            medyan_L_sonra=round(Ls[len(Ls) // 2], 1) if Ls else 0,
            opak_beyaz_piksel=beyaz,
            cikti={u: {'bayt': os.path.getsize(ad_c + '.' + u), 'sha1': sha1(ad_c + '.' + u)} for u in ('webp', 'avif')})
        print('   %-5s %s.webp %dx%d  webp %.1f KB  avif %.1f KB  medyan L %.1f  opak beyaz %d'
              % (hal, os.path.basename(ad_c), im.width, im.height,
                 haller[hal]['cikti']['webp']['bayt'] / 1024.0, haller[hal]['cikti']['avif']['bayt'] / 1024.0,
                 haller[hal]['medyan_L_sonra'], beyaz))
    # beyaz halde beyaz YALNIZ ic+nehir bolgesinde olmali: maskeyle sayim
    im_b = nav_logo(qd, Nd, kutu, A, RED, qb)
    ab = np.asarray(im_b)
    beyaz_px = (ab[..., 3] > 250) & (ab[..., :3].min(-1) > 170)
    # beyaz maskesini ayni cozunurluge indir
    kx_, ky_, kw_, kh_ = 178.75, 108.75, 876.574, 996.844
    c = kx_ + (np.arange(im_b.width) + 0.5) * (kh_ / NAV_BOY)
    r = ky_ + (np.arange(NAV_BOY) + 0.5) * (kh_ / NAV_BOY)
    yy, xx = np.meshgrid(r * KAYNAK_BOY / kutu - 0.5, c * KAYNAK_BOY / kutu - 0.5, indexing='ij')
    mb = ndimage.map_coordinates(m_beyaz.astype(np.float32), [yy, xx], order=1, mode='nearest') > 0.5
    disari = int((beyaz_px & ~ndimage.binary_dilation(mb, iterations=2)).sum())
    haller['beyaz']['beyaz_disari_piksel'] = disari
    im = im_b
    Ls = sorted(isik(p) for p in list(im.getdata()) if p[3] > 250 and p[0] > 40 and p[0] - max(p[1], p[2]) > 25)
    beyaz = haller['beyaz']['opak_beyaz_piksel']
    logo = {
        '_': ('amblem-sdf.py tarafindan yazilir, ELLE DUZENLENMEZ (eski uretec logo-uret.py '
              'kalkti, 24 Agu). Nav logosu amblemle AYNI SDF alanindan cikar; denetim R19 '
              'hash\'leri dosyalarin gercegiyle, kizili temel.css --red ile kiyaslar.'),
        'kaynak': 'amblem.json', 'kaynak_sha1': kunye['kaynak_sha1'],
        'sdf': kunye['varyant']['masaustu']['dosya'],
        'nav_golgeleme': 'duz --red dolgu; malzeme geldiginde ayni golgelemeyle yeniden uretilecek',
        'opak_kutu': [178.75, 108.75, 178.75 + 876.574, 108.75 + 996.844],
        'olcu': [im.width, im.height], 'kizil': red_hex,
        'medyan_L_once': round(isik(RED), 1),
        'medyan_L_sonra': round(Ls[len(Ls) // 2], 1) if Ls else 0,
        'opak_beyaz_piksel': beyaz,
        'cikti': haller['beyaz']['cikti'],
        'hal': haller,
        '_hal': ('IKI HAL (Enes, 24 Agu): `beyaz` = qanatone.webp/avif, ic disk + nehir beyaz, marka '
                 'logosu, STATIK nav (tum sayfalar; Temel.astro tek bilesen). `delik` = qanatone-delik, '
                 'ic alanlar oyuk - prologda amblemin son karesiyle ayni geometri, OLCUM varligi '
                 '(devir sicramasi kizil maskeyle). Ikisi de amblem.json\'dan; eski raster yok.'),
    }
    with open(KUNYE_SDF, 'w', encoding='utf-8') as f:
        json.dump(kunye, f, ensure_ascii=False, indent=1)
    with open(KUNYE_LOGO, 'w', encoding='utf-8') as f:
        json.dump(logo, f, ensure_ascii=False, indent=1)
    print('nav logosu %dx%d  webp %.1f KB  avif %.1f KB  medyan L %.1f  opak beyaz %d'
          % (im.width, im.height, logo['cikti']['webp']['bayt'] / 1024.0,
             logo['cikti']['avif']['bayt'] / 1024.0, logo['medyan_L_sonra'], beyaz))
    print('yazildi', os.path.relpath(KUNYE_SDF, KOK), '+', os.path.relpath(KUNYE_LOGO, KOK))


if __name__ == '__main__':
    main()
