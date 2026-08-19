#!/usr/bin/env python3
"""yeni/font-uret.py — yayin fontlarini uretir (Goc Anayasasi madde 4).

  font-kaynak/*.woff2   (Google'dan inen ham altkumeler, ELLE DEGISMEZ)
        |
        |  1) Nunito degisken fontunu 300-800 agirligina ve opsz 12'ye indirge
        |  2) her yuzu TR+EN karakter kumesine kirp
        v
  public/font/*.woff2   (yayina cikan dosyalar)

NEDEN (19 Agu 2026, S-H hero turunda Lighthouse ile olculdu):
  Ana sayfada font trafigi 123 KB'ti ve LCP'yi tasiyan eleman hero'nun
  lede'siydi. Kontrollu deney: Playfair+JetBrains yuzleri cikarilinca
  (70 KB, 5 istek) LCP 2.191 -> 1.663 ms. Yani LCP dogrudan font
  baytina bagli; kilo vermek tek gercek kaldirac.

  Uc olcum karari:
  · Nunito Sans DEGISKEN (fvar wght 200-1000 + opsz 6-12). Google'in
    '400' ve '700' adresleri BAYT BAYT ayni dosyaydi (md5 esit) — ayni
    49,6 KB iki kez iniyordu. Tek dosyaya toplandi, agirlik araligi
    bildirimde. Ustune eksen daraltma: 300-800 + opsz 12 sabitlendi.
  · Google'in 'latin' altkumesi 229 glif tasiyor; bu site Turkce+
    Ingilizce. TR+EN kumesine kirpildi (asagidaki liste).
  · 'latin-ext' dosyasi 43,6 KB'ti ve sayfada YALNIZ BES glif icin
    iniyordu (G g I S s). Bes glife indirildi.

  Sonuc: 123 KB / 7 istek  ->  ~71 KB / 7 istek. Fidelity kaybi yok:
  atilan gliflerin hicbiri sayfalarda kullanilmiyor (denetim F1c bunu
  her derlemede olcer — yeni bir karakter girerse kirmizi verir).

Kosum:  python font-uret.py        (yeni/ icinde)
Gerek:  pip install fonttools brotli
"""
import pathlib
import subprocess
import sys

BURASI = pathlib.Path(__file__).parent
KAYNAK = BURASI / 'font-kaynak'
HEDEF = BURASI / 'public' / 'font'

# TR+EN kumesi. ASCII + Turkce alfabe + sapkali unluler + sayfalarda
# gercekten gecen noktalama. Genis tutuldu: panelden gelen metin
# degisebilir, kume karakter karakter degil BLOK olarak secildi.
TREN = ','.join([
    'U+0020-007E',                      # ASCII yazdirilabilir
    'U+00A0', 'U+00AB', 'U+00B0', 'U+00B7', 'U+00BB',   # nbsp « ° · »
    'U+00C0-00C7', 'U+00C9', 'U+00CE', 'U+00D6', 'U+00DB', 'U+00DC',
    'U+00E0-00E7', 'U+00E9', 'U+00EE', 'U+00F6', 'U+00FB', 'U+00FC',
    'U+0131', 'U+011E-011F', 'U+0130', 'U+015E-015F',   # Turkce
    'U+2013', 'U+2014',                 # – —
    'U+2018', 'U+2019', 'U+201C', 'U+201D',             # tirnaklar
    'U+2022', 'U+2026', 'U+2039', 'U+203A',             # • … ‹ ›
    'U+20AC', 'U+2122', 'U+2190-2193', 'U+2212',        # € ™ oklar −
])

# 'latin-ext' kaynaklarindan yalnizca bunlar tasinir (olculdu: sayfalarda
# latin disinda gecen TEK kume bu). Yenisi cikarsa denetim F1c kirmizi verir.
# U+20BA (lira isareti) S-SE sektor panosuyla geldi: para rakamlari
# govde fontuyla basiliyor ve bu glif YALNIZ 'latin-ext' kaynaginda
# var (olculdu: latin altkumesinde yok). Denetimdeki F1c yakaladi.
TR_GLIF = 'U+011E-011F,U+0130,U+015E-015F,U+20BA'

# (kaynak, hedef, kume, eksen daraltma)
ISLER = [
    ('nunito-sans-200-1000-latin.woff2',     'nunito-sans-latin.woff2',     TREN,    ['wght=300:800', 'opsz=12']),
    ('nunito-sans-200-1000-latin-ext.woff2', 'nunito-sans-tr.woff2',        TR_GLIF, ['wght=300:800', 'opsz=12']),
    ('playfair-display-500-latin.woff2',     'playfair-display-500-latin.woff2',  TREN,    []),
    ('playfair-display-500-latin-ext.woff2', 'playfair-display-500-tr.woff2',     TR_GLIF, []),
    ('playfair-display-500i-latin.woff2',    'playfair-display-500i-latin.woff2', TREN,    []),
    ('playfair-display-500i-latin-ext.woff2', 'playfair-display-500i-tr.woff2',   TR_GLIF, []),
    ('jetbrains-mono-400-latin.woff2',       'jetbrains-mono-400-latin.woff2', TREN,    []),
    ('jetbrains-mono-400-latin-ext.woff2',   'jetbrains-mono-400-tr.woff2',    TR_GLIF, []),
]


def kb(p):
    return f'{p.stat().st_size / 1024:.1f} KB'


def main():
    HEDEF.mkdir(parents=True, exist_ok=True)
    # eski uretim temizlenir: adi degisen dosya sessizce yayinda kalmasin
    for eski in HEDEF.glob('*.woff2'):
        eski.unlink()
    ara = BURASI / '.font-ara'
    ara.mkdir(exist_ok=True)
    toplam_k = toplam_h = 0
    for kaynak, hedef, kume, eksen in ISLER:
        k = KAYNAK / kaynak
        if not k.exists():
            sys.exit(f'kaynak yok: {k}  (font-kaynak/ Google altkumeleri)')
        girdi = k
        if eksen:
            girdi = ara / ('daraltilmis-' + kaynak)
            subprocess.run([sys.executable, '-m', 'fontTools.varLib.instancer',
                            str(k), *eksen, '-o', str(girdi)],
                           check=True, stdout=subprocess.DEVNULL)
        h = HEDEF / hedef
        subprocess.run([sys.executable, '-m', 'fontTools.subset', str(girdi),
                        '--unicodes=' + kume, '--layout-features=*',
                        '--flavor=woff2', '--output-file=' + str(h)], check=True)
        toplam_k += k.stat().st_size
        toplam_h += h.stat().st_size
        print(f'  {hedef:<38} {kb(k):>9} -> {kb(h):>9}')
    for f in ara.glob('*'):
        f.unlink()
    ara.rmdir()
    print(f'  {"TOPLAM":<38} {toplam_k / 1024:>6.1f} KB -> {toplam_h / 1024:>6.1f} KB')


if __name__ == '__main__':
    main()
