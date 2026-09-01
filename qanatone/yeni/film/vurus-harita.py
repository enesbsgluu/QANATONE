#!/usr/bin/env python3
"""yeni/film/vurus-harita.py — TUR 5 v2: 21 blok + 6 kunye yerlestirme.

Girdi : olc-kamera-hizi.json (saniyelik kare-fark egrisi, 8 ornek/sn'den)
        + src/film/kanon.json (klip sureleri -> film-sn ekseni).
Kural : vuruslar perdenin DURAN anlarina yaslanir (talimat); pencere
        uzunlugu >= PENCERE_SN (kapinin 3 sn okunurlugu + 0,4 s gecis
        payi); ayni perdede pencereler arasi >= ARA_SN; blok sirasi =
        zaman sirasi. Secim olcumle: en dusuk ortalama farkli pencereler.
Cikti : stdout markdown tablo — TUR5-METIN-HARITASI.md v2'ye islenir.
Perde->sahne bolgeleri TEMA karari (posterlerden dogrulandi: sahne9
tunel ici, sahne15 halat/liman); pencereler OLCUM."""
import json
import pathlib

B = pathlib.Path(__file__).parent
H = json.load(open(B / 'olc-kamera-hizi.json', encoding='utf-8'))
K = json.load(open(B / '..' / 'src' / 'film' / 'kanon.json', encoding='utf-8'))

ADIM = 0.25

# film-sn ekseninde birlesik fark egrisi (saniyelik; dogrusal ara deger)
bas = {}
t = 0.0
for k in K['klip']:
    bas[k['n']] = t
    t += k['sure']
TOPLAM = t

egri = {}   # klip n -> (bas_sn, sn_egrisi)
for k in H['klip']:
    egri[k['n']] = k['sn_egrisi']

def fark(T):
    """film-sn T'deki kare farki (klip icinden, saniyelik ornekten)."""
    for n, b in bas.items():
        e = egri.get(n)
        if e is None:
            continue
        yerel = T - b
        if 0 <= yerel < len(e):
            i = int(yerel)
            j = min(i + 1, len(e) - 1)
            u = yerel - i
            return e[i] * (1 - u) + e[j] * u
    return 99.0

PENCERE_SN = 3.6   # sec() cagri basina guncellenir (perde parametresi)
ARA_SN = 1.2

def pencere_skor(b0, b1):
    n = 0
    top = 0.0
    x = b0
    while x < b1:
        top += fark(x)
        n += 1
        x += ADIM
    return top / max(1, n)

def sec(bolge_bas, bolge_son, adet):
    """DP: tam `adet` pencere, toplam fark MINIMUM, baslar arasi >=
    PENCERE_SN + ARA_SN. Acgozlu surum 21 blogun 19'unu bulabildi
    (skor sirali secim aralik kisitina takiliyor) — DP kesin."""
    adaylar = []
    x = bolge_bas
    while x + PENCERE_SN <= bolge_son:
        adaylar.append((round(x, 2), pencere_skor(x, x + PENCERE_SN)))
        x += ADIM
    n = len(adaylar)
    MIN_ARA = PENCERE_SN + ARA_SN
    SONSUZ = float('inf')
    # dp[i][k] = ilk i aday icinde, i'nci SECILI, k pencere secilmis, min toplam
    dp = [[SONSUZ] * (adet + 1) for _ in range(n)]
    onceki = [[-1] * (adet + 1) for _ in range(n)]
    for i in range(n):
        dp[i][1] = adaylar[i][1]
        for k in range(2, adet + 1):
            for j in range(i):
                if adaylar[i][0] - adaylar[j][0] >= MIN_ARA and dp[j][k - 1] < SONSUZ:
                    aday = dp[j][k - 1] + adaylar[i][1]
                    if aday < dp[i][k]:
                        dp[i][k] = aday
                        onceki[i][k] = j
    en = min(range(n), key=lambda i: dp[i][adet], default=-1)
    if en < 0 or dp[en][adet] == SONSUZ:
        return []
    secilen = []
    i, k = en, adet
    while i >= 0 and k >= 1:
        secilen.append((adaylar[i][1], adaylar[i][0]))
        i, k = onceki[i][k], k - 1
    secilen.sort(key=lambda s: s[1])
    return secilen

# BOLGE TARIHI (hepsi olcumle gerekcelendi):
#   taslak 1: III 9-12 / IV 13-20 -> III'un en iyi penceresi bile 19-23
#     farkta (sahne9-10 kamera hizli), 21 blogun 19'u secilebildi.
#   taslak 2: III 9-14 / IV 15-20 (sahne15 liman posterle dogrulandi)
#     -> blok 6 hala 19,3 farkta.
#   simdiki: II 3-7 / III 8-14 — sahne8 durgun (7,9) ve tema hala
#     tunel/kuyu; "her kilometrede bir metre inis" orada oturur,
#     blok 6 farki 19,3 -> ~8. II'nin uc vurusu (20/25/40) etkilenmez.
# IS B (3 Eyl): VI'da yerel ray yavaslamasi (k=1,4) + pencereler 4,4 sn
# (ara 1,0) — 900 px/s temposunda >=3 sn okunurluk ancak ikisiyle
# birlikte saglaniyor (olcum olc-soz vi_okunurluk). Diger perdeler 3,6.
PERDELER = [
    ('I · KAYNAK',  1, 2, 2, 3.6, 1.2),
    ('II · İKİ YOL', 3, 7, 3, 3.6, 1.2),
    ('III · EĞİM',  8, 14, 4, 3.6, 1.2),
    ('IV · KANAL', 15, 20, 4, 3.6, 1.2),
    ('V · ÖLÇEK',  21, 34, 3, 3.6, 1.2),
    ('VI · KENT',  35, 39, 5, 4.4, 1.0),
]

blok = 1
for ad, s0, s1, adet, PENCERE_SN, ARA_SN in PERDELER:
    globals()['PENCERE_SN'] = PENCERE_SN
    globals()['ARA_SN'] = ARA_SN
    b0 = bas[s0] + 0.3          # perde basina nefes payi (ilk karede metin patlamasin)
    b1 = bas[s1] + (K['klip'][s1 - 1]['sure'])
    print(f"\n== {ad} · sahne{s0}-{s1} · film-sn {b0:.2f}-{b1:.2f} (kunye araligi) ==")
    for skor, x in sec(b0, b1, adet):
        # pencerenin dustugu sahne
        sn = max(n for n, b in bas.items() if b <= x)
        print(f"  blok {blok:2d}: {x:7.2f} - {x + PENCERE_SN:7.2f}  (sahne{sn}, ort fark {skor:.2f})")
        blok += 1
print(f"\ntoplam blok: {blok - 1} · film {TOPLAM:.1f} sn")
