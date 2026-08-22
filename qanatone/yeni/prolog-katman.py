# -*- coding: utf-8 -*-
"""Prolog 1. sahne — 6 katman kesimi.

Ayrim ELLE MASKELENMEDI: derinlik haritasi (Depth Anything V2, derinlik.py)
esiklerinden kesildi. Harita saklandi (dag-derinlik.png) — A yaklasiminda
ayni harita displacementMap olacak.

TABAN PLAKA KARARI: 1. katman (gok) TAM KARE basilir, uzerindeki bes katman
kendi bandinin ALFALI kopyasidir. Sebep: paralaksta ustteki katman kayinca
arkada delik acilmasin; delik acilan yerde tabanin kendi pikseli durur.
Bedeli hafif bir cift kenar; kare neredeyse siyah oldugu icin gorunmuyor
(olculdu: kesim kenarlarinda ortalama parlaklik < 0,07).
"""
import sys, numpy as np
from PIL import Image, ImageFilter

HAM  = r"C:/projeler2/qanatone/gorsel-kaynak/prolog/dag-ham.jpg"
DER  = r"C:/projeler2/qanatone/gorsel-kaynak/prolog/dag-derinlik.png"
CIK  = sys.argv[1] if len(sys.argv) > 1 else r"C:/projeler2/qanatone/gorsel-kaynak/prolog/katman"
GEN  = int(sys.argv[2]) if len(sys.argv) > 2 else 1920

import os
os.makedirs(CIK, exist_ok=True)

im = Image.open(HAM).convert("RGB")
W0, H0 = im.size
H = round(H0 * GEN / W0)
im = im.resize((GEN, H), Image.LANCZOS)
d  = Image.open(DER).resize((GEN, H), Image.BICUBIC)
d  = np.array(d).astype(np.float32) / 65535.0
L  = np.array(im.convert("L")).astype(np.float32) / 255.0
print("kare", im.size)

def yumusat(mask, r):
    """Kenar tuyu — sert kesim paralaksta makasla kesilmis gibi durur."""
    return np.array(Image.fromarray((mask * 255).astype(np.uint8))
                    .filter(ImageFilter.GaussianBlur(r))).astype(np.float32) / 255.0

def band(lo, hi, tuy=6.0):
    m = ((d > lo) & (d <= hi)).astype(np.float32)
    return yumusat(m, tuy)

ys, xs = np.mgrid[0:H, 0:GEN]
xn, yn = xs / GEN, ys / H

# --- esikler: derinlik yuzdeliklerinden (analiz.py ciktisi) ---
GOK_UST   = 0.070   # duz taban: karenin %30'u gokyuzu
ZIRVE_UST = 0.240   # 40. yuzdelik — zirve + uzak sirtlar
DAG_UST   = 0.500   # ~74. yuzdelik — yan siluetler
# ustu vadi

katmanlar = {}

# 1) gok — TAM KARE taban plaka (alfa yok)
katmanlar["gok"] = np.ones((H, GEN), np.float32)

# 2) zirve — ana ozne
katmanlar["zirve"] = band(GOK_UST, ZIRVE_UST, 7)

# 3-4) yan siluetler: ayni derinlik bandi, x ekseninde bolunuyor.
#      Bolme cizgisi vadinin ekseni (x=%50); gecis 8 sutunda tuylendi.
dag = band(ZIRVE_UST, DAG_UST, 7)
gecis = np.clip((xn - 0.50) / 0.08 + 0.5, 0, 1)
katmanlar["dag-sol"] = dag * (1.0 - gecis)
katmanlar["dag-sag"] = dag * gecis

# 5) vadi tabani
katmanlar["vadi"] = band(DAG_UST, 1.01, 8)

# 6) nehir — KENDI KATMANINDA, seffaf arka planla.
#    Derinlikten degil PARLAKLIKTAN cikiyor: nehir bir aydinlik seridi,
#    derinlikte vadinin icinde. Karenin alt %48'iyle sinirli, yoksa
#    zirvenin kari da nehir sayilirdi.
nehir = ((L > 0.20) & (yn > 0.52)).astype(np.float32)
nehir = yumusat(nehir, 2.5)
nehir = np.clip(nehir * 1.35, 0, 1)
katmanlar["nehir"] = nehir

rgb = np.array(im)
ozet = []
for ad, a in katmanlar.items():
    kap = float(a.mean())
    if ad == "gok":
        Image.fromarray(rgb).save(f"{CIK}/{ad}-{GEN}.webp", quality=76, method=6)
    else:
        px = np.dstack([rgb, (a * 255).astype(np.uint8)])
        Image.fromarray(px, "RGBA").save(f"{CIK}/{ad}-{GEN}.webp",
                                         quality=74, method=6, exact=False)
    b = os.path.getsize(f"{CIK}/{ad}-{GEN}.webp")
    ozet.append((ad, round(kap, 3), b))
    print(f"{ad:9s} kaplama {kap:5.3f}  {b/1024:7.1f} KB")
print("TOPLAM", round(sum(x[2] for x in ozet) / 1024, 1), "KB")
