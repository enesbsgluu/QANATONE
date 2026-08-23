# -*- coding: utf-8 -*-
"""============================================================
NAV LOGOSU URETECI (23 Agustos 2026).

GIRDI  gorsel-kaynak/prolog/QANAT_LOGO-seffaf-2.png
       Photoroom ile arka plani kaldirilmis surum. Onceki varliktan
       UC farki var ve ucu de olculdu:
         - ic alanlar BEYAZ DEGIL DELIK (opak beyaz piksel: 0),
         - nehrin cikisindaki duz kenarli beyaz dikdortgen YOK,
         - kuyruk ucu ~6 px daha uzun.
       Kare 1254x1254, yani `src/prolog/amblem.json`in vektor
       uzayiyla AYNI - yollar bu dosyaya birebir hizali (olculdu:
       halka+dag maskesi ile alfa maskesinin uyumu %99,50).

CIKTI  public/img/qanatone.webp + .avif

NE YAPIYOR
  1. Opak sinir kutusuna kirpar. Kaynakta kenarlarda ~0 alfali
     kirinti var, esik 8.
  2. KIZILI PALETE ESLER, GOLGEYI KORUR. Kizil piksellerin
     isikliligi (Rec.709) alinir, MEDYANI govde tonudur - modal renk
     degil medyan, cunku varlik bir degrade ve modal ton dagilimin
     ucundan gelebiliyor. f = L(piksel) / L(medyan); f<=1 ise cikti
     --red * f (golgeye dogru), f>1 ise --red ile beyaz arasinda
     karisim (parlamaya dogru). Boylece medyan govde tonu TAM --red
     olur, bevel ve iç halka golgesi aynen durur.
     Kizil OKUNUR, YAZILMAZ: `src/stil/temel.css` -> `--red`.
     Sebep olculdu: eski varligin kizili en sik rgb(168,1,3),
     ortalama isikliligi 55,3 iken paletinki rgb(239,35,60) ve 80,2;
     nav icinde ucuncu bir kizil daha vardi (QANAT yazisi
     `--red-soft`). Amblem nava otururken devir bu yuzden -15,9
     birimlik bir parlaklik kirilmasiyla kapaniyordu.
  3. Yuksekligi 293 px'e indirip webp + avif yazar. 293, nav'in
     29 px'lik logosunun 10 kati - DPR 3'te bile yeterli.
  4. `src/veri/logo-kunye.json` yazar: girdi ve ciktilarin SHA1'i,
     olcu, kizil, ve olculen renk gercekleri. DENETIM (R19) o kunyeyi
     dosyalarin gercek hash'iyle kiyaslar - boylece varlik elle
     degistirilirse ya da kunye kaynaga uymazsa kural kirmizi yanar.
     Kunye buradadir ki denetimin webp cozmesi gerekmesin (Netlify'da
     ne Python ne de garanti bir goruntu kutuphanesi var).

Kullanim:  python logo-uret.py
============================================================"""
import hashlib
import json
import os
import re

from PIL import Image

KOK = os.path.dirname(os.path.abspath(__file__))
KAYNAK = os.path.join(KOK, '..', 'gorsel-kaynak', 'prolog', 'QANAT_LOGO-seffaf-2.png')
CIKTI = os.path.join(KOK, 'public', 'img', 'qanatone')
BOY = 293
ALFA_ESIK = 8


def isik(p):
    return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2]


def kizil_oku():
    """Paletin kizili TEK KAYNAKTAN. `--red-soft`/`--red-glow`/`--red-dim`
    yakalanmasin diye iki nokta dogrudan `--red`in ardindan gelmeli."""
    yol = os.path.join(KOK, 'src', 'stil', 'temel.css')
    with open(yol, encoding='utf-8') as f:
        m = re.search(r'--red\s*:\s*(#[0-9a-fA-F]{6})', f.read())
    if not m:
        raise SystemExit('temel.css icinde --red bulunamadi')
    h = m.group(1).lstrip('#')
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def uret(yaz=True):
    RED = kizil_oku()
    im = Image.open(KAYNAK).convert('RGBA')
    ham = im.size

    # 1) opak sinir kutusuna kirp
    alfa = im.getchannel('A').point(lambda v: 255 if v > ALFA_ESIK else 0)
    kutu = alfa.getbbox()
    im = im.crop(kutu)

    # 2) kizili --red'e esle, golgeyi koru
    px = list(im.getdata())
    kizil = [i for i, p in enumerate(px)
             if p[3] > ALFA_ESIK and p[0] > 40 and p[0] - max(p[1], p[2]) > 25]
    L = sorted(isik(px[i]) for i in kizil)
    Lb = L[len(L) // 2]
    cik = list(px)
    for i in kizil:
        p = px[i]
        f = isik(p) / Lb
        if f <= 1.0:
            c = tuple(int(round(RED[k] * f)) for k in range(3))
        else:
            t = min(1.0, (f - 1.0) / ((255.0 / Lb) - 1.0))
            c = tuple(int(round(RED[k] + (255 - RED[k]) * t)) for k in range(3))
        cik[i] = c + (p[3],)
    im.putdata(cik)

    # 3) olcekle ve yaz
    en = int(round(im.width * BOY / im.height))
    im = im.resize((en, BOY), Image.LANCZOS)
    if not yaz:
        return {'olcu': (en, BOY), 'kizil': RED, 'medyan_L': round(Lb, 1)}
    im.save(CIKTI + '.webp', 'WEBP', quality=90, method=6)
    im.save(CIKTI + '.avif', 'AVIF', quality=72)

    # 4) ciktinin GERCEK piksellerinden kunye
    son = list(im.getdata())
    Ls = sorted(isik(p) for p in son
                if p[3] > 250 and p[0] > 40 and p[0] - max(p[1], p[2]) > 25)
    beyaz = sum(1 for p in son if p[3] > 250 and min(p[:3]) > 170)
    kunye = {
        '_': ('logo-uret.py tarafindan yazilir, ELLE DUZENLENMEZ. Denetim R19 '
              'buradaki hash\'leri dosyalarin gercegiyle, kizili de '
              'temel.css --red ile kiyaslar.'),
        'kaynak': os.path.basename(KAYNAK),
        'kaynak_sha1': sha1(KAYNAK),
        'opak_kutu': list(kutu),
        'olcu': [en, BOY],
        'kizil': '#%02x%02x%02x' % RED,
        'medyan_L_once': round(Lb, 1),
        'medyan_L_sonra': round(Ls[len(Ls) // 2], 1) if Ls else 0,
        'opak_beyaz_piksel': beyaz,
        'cikti': {u: {'bayt': os.path.getsize(CIKTI + '.' + u),
                      'sha1': sha1(CIKTI + '.' + u)} for u in ('webp', 'avif')},
    }
    with open(os.path.join(KOK, 'src', 'veri', 'logo-kunye.json'), 'w',
              encoding='utf-8') as f:
        json.dump(kunye, f, ensure_ascii=False, indent=1)
    return dict(kunye, ham=ham, kutu=kutu, kizil_piksel=len(kizil),
                oran=round(en / float(BOY), 4), kizil_rgb=RED)


def sha1(yol):
    h = hashlib.sha1()
    with open(yol, 'rb') as f:
        for blok in iter(lambda: f.read(65536), b''):
            h.update(blok)
    return h.hexdigest()


if __name__ == '__main__':
    b = uret()
    print('kaynak      : %dx%d' % b['ham'])
    print('opak kutu   : %s  ->  %dx%d  (oran %.4f)'
          % (tuple(b['kutu']), b['olcu'][0], b['olcu'][1], b['oran']))
    print('kizil       : rgb%s  (temel.css --red)' % (b['kizil_rgb'],))
    print('medyan govde: L=%.1f  ->  L=%.1f  (hedef %.1f)'
          % (b['medyan_L_once'], b['medyan_L_sonra'], isik(b['kizil_rgb'])))
    print('opak beyaz  : %d piksel' % b['opak_beyaz_piksel'])
    for u in ('.webp', '.avif'):
        print('yazildi     : public/img/qanatone%s  %.1f KB'
              % (u, os.path.getsize(CIKTI + u) / 1024))
