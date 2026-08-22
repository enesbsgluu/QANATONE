# -*- coding: utf-8 -*-
"""Prolog 1. sahne — KATMAN + DERINLIK URETECI  (A yaklasimi, 22 Agu 2026).

B yaklasiminda bu betik alti alfali katman kesiyordu. A yaklasiminda ayni
kesim duruyor, bes sey ekleniyor:

  1. BULUT KENDI KATMANINDA. B'de bulutlar taban plakaya pismisti; A'da
     surukleniyorlar, o yuzden ayrilmalari VE taban plakadan SILINMELERI
     gerekiyor (yoksa suruklenen bulut, yerinde duran ikizini birakir).
     Ayirma iki denemede oturdu. (a) Duz esik: gokyuzu zaten parlak bir
     gradyan, L>0,3 gogun %78,6'sini yakaliyordu. (b) Duz yuksek
     gecirgen (L - genis bulanik L): bu sefer ufka dogru artan parlaklik
     bastan basa bir "bulut" seridi verdi — maske onizlemesinde goruldu.
     Oturan yol: bulut, gok gradyaninin AYKIRI DEGERI. Once gradyanin
     kendisi, bulutlara TIRMANMAYAN bir kestirimle cikariliyor (her
     turda "zeminden biraz parlak" tavani + yeniden bulanik), bulut o
     kestirimin uzeri. Silinen yer difuzyonla doldurulur ve silme
     maskesi gok bandiyla carpilir — yoksa difuzyon zirvenin karina
     tasip hale birakiyor (bu da onizlemede goruldu).

  2. DERINLIK HARITASI CIKTIYA BASILIYOR — vertex shader her katmani
     gercek uzakligina itiyor. 8 BIT, kayipsiz. 16 bit denendi ve
     BIRAKILDI: alt bayt tanim geregi testere disi, kayipsiz webp onu
     sikistiramiyor (mobilde 349 KB, tek basina butcenin %78'i).
     8 bitin teraslamasi vertex shader'daki 9 dokunuslu yumusatmayla
     kapaniyor — harita zaten duz, dokunus basina degisim 8 bitin
     0,17'si (olculdu), yani yumusatma gercek ayrinti silmiyor.

  3. HER KATMAN KENDI SINIR KUTUSUNA KIRPILIYOR. B'de yedi katmanin
     yedisi de tam kareydi; bulut karenin ustte %35'ini kapliyor ama
     bayti ve COZULMUS BITMAP'i tam kare kadardi. Kutu kirpma hem bayti
     hem bellegi ~yariya indiriyor. Kutu kunyeye yaziliyor, yedek yol
     (CSS) katmanlari o kutuya yuzdeyle oturtuyor — `object-fit` yerine.

  4. ALFA DISINDAKI RGB DUMDUZ EDILIYOR. Sifir alfali bolgenin rengi
     ekranda hicbir sey yapmaz ama webp onu yine de kodlar: her katman
     fotografin tam bir kopyasini tasiyordu. Ic renk disari yayilip
     (bilinear kenar cekmesin diye) gerisi duzlestiriliyor.

  5. GENISLIK ELLE SECILMIYOR, KAMERA YOLUNDAN HESAPLANIYOR. Her katman
     icin `sahne.json`daki yol boyunca ulasilan en buyuk buyutme orani
     olculur; "1 kaynak piksel = 1 cihaz pikseli" genisligi oradan cikar.
     Kalan butce katmanlara AYRINTI AGIRLIGIYLA dagitilir (agirlik da
     olculur: yuksek frekans enerjisi — yan duvarlar duz siyah siluet,
     zirvenin karli sirtiyla ayni bayti hak etmiyor). Taban genislikler
     (mobil 1600 · masaustu 2560) ALT SINIR.

MOBIL ARTIK AYNI KARE DEGIL — DIKEY KESIM. Sebep olculdu: 412x892 bir
telefonda `object-fit: cover` 1,419 oranli kareyi yukseklige oturtur,
genisligin %67'sini atar ve kalani ~4x buyutur. Yani mobilde inen baytin
ucte ikisi hic gorunmuyordu. Dikey kesim (oran 0,72 · merkez x=0,47) iki
duvarin ic kenarini, zirveyi ve nehri korur; ayni bayt EKRANDA durur.

Kosum:
    python prolog-katman.py                  # iki varyant + kunye
    python prolog-katman.py --onizleme       # + maske onizlemeleri
"""
import os, sys, json, math
import numpy as np
from PIL import Image, ImageFilter

KOK   = os.path.dirname(os.path.abspath(__file__))
# AYNALANMIS KAYNAK (23 Agu). Logo ile fotograf geometrisi olcumle
# cakismiyordu: nehir logoda SAGA akip kuyruga donusuyor, fotografta
# SOLA akiyordu. Sahne aynalandi; orijinal iki dosya yerinde duruyor
# (dag-ham.jpg / dag-derinlik.png) ki karar geri alinabilsin.
HAM   = os.path.join(KOK, "..", "gorsel-kaynak", "prolog", "dag-ham-ayna.jpg")
DER   = os.path.join(KOK, "..", "gorsel-kaynak", "prolog", "dag-derinlik-ayna.png")
CIK   = os.path.join(KOK, "public", "img", "prolog")
SAHNE = os.path.join(KOK, "src", "prolog", "sahne.json")
KUNYE = os.path.join(KOK, "src", "prolog", "kunye.json")
ONIZ  = os.path.join(KOK, "..", "gorsel-kaynak", "prolog", "onizleme")

S = json.load(open(SAHNE, encoding="utf-8"))
KALITE = {"gok": 74, "bulut": 78, "zirve": 80, "dag-sol": 76,
          "dag-sag": 76, "vadi": 76, "nehir": 84}
# ALFA KANALI AYRI KODLANIR ve Pillow'un tabani KAYIPSIZDIR. Tuylu bir
# maske kayipsiz alfada cok pahali: bulut katmani mobilde 275 KB'a ciktigi
# icin olculdu — q78'de alfa 100 -> 296 KB, alfa 70 -> 142 KB, alfa 40 ->
# 128 KB. Arazi katmanlarinin maskesi neredeyse ikili (dar bir tuy), 70
# orada gorunmuyor. BULUTTA once 90 denendi (alfasi genis ve yumusak,
# 70'te kontur basamaklari gorunuyordu) ama katman 277 KB'a cikip mobil
# butcenin %56'sini yedi ve tekduze kalite arayisi obur alti katmani
# -30'a itti. Asil sebep alfa DEGILMIS: basamaklar, alfa disindaki
# duzlestirilmis GRI RGB'nin uzerinde gorunuyordu. Bulutun alfa disi
# RGB'si taban plakanin (bulutsuz gokyuzu) kendisi yapilinca sizan alfa
# "gogun ustune gok" koyuyor ve basamak gorunmez oluyor — alfa 70'e
# geri dondu.
ALFA_KALITE = {}
ALFA_TABAN = 70
# Dosya adi oneki. ILK HARF KULLANILAMAZ: "masaustu" ve "mobil" ikisi de
# 'm' ile basliyordu ve `derinlik-m768.webp` iki varyantta AYNI ada
# dusuyordu — mobil kesim masaustu haritasini eziyordu. Hata p=0'da
# gorunmuyor (o karede kamera referans noktasinda, derinlik ne olursa
# olsun kaynak kareye geri izdusuyor), yalniz paralaksta cikiyordu.
ONEK = {"masaustu": "d", "mobil": "m"}
# BULUTUN ALFA DISI RGB'SI TABAN PLAKADAN gelir, duzlestirmeden degil.
# Duzlestirme (ic rengi disari yayip gerisini duz birakma) bayt
# kazandiriyor ama bulutta ters tepiyor: kayipli alfadan sizan her deger
# koyu gogun uzerinde GRI bir leke birakiyor. Taban plaka bulutu
# silinmis gokyuzu oldugu icin sizinti "gogun ustune gok" olur, yani
# tam olarak gorunmez; gradyan da ucuza sikisir.
TABAN_DOLGU = {"bulut"}
KUTU_PAY = 0.012          # sinir kutusuna oranli pay (tuyun disari tasmasi)
DOKU_TAVAN = 4096         # MAX_TEXTURE_SIZE tabani; ustune cikilmaz


# ============================================================
# KAMERA — `sahne.json`daki yolun python tarafi.
# gl.ts AYNI sayilari AYNI formulle uygular; ikisi de buradan okur.
# ============================================================
def kamera(p):
    """p (0..1) -> (goz_x, goz_y, goz_z, egim_radyan)."""
    y, e = S["kamera"]["yol"], S["kamera"]["egri"]
    return (y["x"] * p ** e["x"], y["y"] * p ** e["y"],
            y["z"] * p ** e["z"], math.radians(y["egim"] * p ** e["egim"]))


def uzaklik(d):
    D = S["derinlik"]
    return D["k"] / min(max(d, D["d_taban"]), D["d_tavan"])


def goruntu_tan(kare_oran, ekran):
    """(tanH_kaynak, tanV_kaynak, tanV_render). Render tani `cover`dan:
    goruntu penceresi kaynak karenin ICINDE kalmali, o yuzden MIN."""
    tanV = math.tan(math.radians(S["kamera"]["fov_y"]) / 2)
    tanH = tanV * kare_oran
    return tanH, tanV, min(tanV, tanH / (ekran[0] / ekran[1]))


def buyutme_orani(d_ornek, uv_ornek, kare_oran, ekran, adim=0.04):
    """Kamera yolu boyunca ulasilan en buyuk Z/Zc orani (98. yuzdelik).

    Tek bir kacak piksel butun genisligi belirlemesin diye TEPE degil
    98. yuzdelik alinir; kalan %2 sahnenin en yakin, en karanlik
    kosesindedir (yan duvarlarin alt kenari, ortalama parlaklik 0,05).
    """
    tanH, tanV, tanVr = goruntu_tan(kare_oran, ekran)
    tanHr = tanVr * (ekran[0] / ekran[1])
    Z = np.array([uzaklik(x) for x in d_ornek], dtype=np.float64)
    X = (uv_ornek[:, 0] * 2 - 1) * tanH * Z
    Y = (1 - uv_ornek[:, 1] * 2) * tanV * Z
    en_iyi = np.zeros_like(Z)
    p = 0.0
    while p <= 1.0001:
        gx, gy, gz, egim = kamera(p)
        qx, qy, qz = X - gx, Y - gy, -Z - gz
        c, s = math.cos(egim), math.sin(egim)
        vy, vz = c * qy + s * qz, -s * qy + c * qz
        Zc = -vz
        icerde = (Zc > 0.05) & (np.abs(qx) <= tanHr * Zc * 1.02) & (np.abs(vy) <= tanVr * Zc * 1.02)
        en_iyi = np.maximum(en_iyi, np.where(icerde, Z / np.maximum(Zc, 1e-6), 0.0))
        p += adim
    en_iyi = en_iyi[en_iyi > 0]
    return float(np.percentile(en_iyi, 98)) if len(en_iyi) else 1.0


# ============================================================
# maske yardimcilari
# ============================================================
def yumusat(m, r):
    """Kenar tuyu. Sert kesim paralaksta makasla kesilmis gibi durur."""
    if r <= 0:
        return np.clip(m, 0, 1).astype(np.float32)
    return np.asarray(Image.fromarray((np.clip(m, 0, 1) * 255).astype(np.uint8))
                      .filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255.0


def bulanik(a, r):
    return np.asarray(Image.fromarray((np.clip(a, 0, 1) * 255).astype(np.uint8))
                      .filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255.0


def bulanik_rgb(rgb, r):
    return np.dstack([bulanik(rgb[..., c] / 255.0, r) * 255.0 for c in range(3)])


def gok_dolgusu(rgb, L, zemin, gok_bant, bulut, silme):
    """Bulut silinen yeri, ZATEN HESAPLANMIS gok zeminiyle doldurur.

    Ilk surum difuzyon kullaniyordu (dusuk cozunurlukte tekrarli
    bulanik + bilinen pikselleri geri yazma) ve MOBILDE GORUNUR BIR
    DIKIS BIRAKTI: dikey kesimde bulut gogun genisligini kaplayinca
    difuzyonun yayilacagi "bilinen" gok kalmiyor, dolgu cevresinden
    koyu cikiyor ve karenin ustunde bastan basa bir bant olusuyordu.
    Oysa bulut maskesini cikarirken gogun gradyani ZATEN kestirilmisti
    (dusuk yuzdelikli sira suzgeci). Dolgu artik o kestirim.

    Kestirim 10. yuzdelik oldugu icin sistematik olarak biraz KARANLIK;
    bulutsuz gok piksellerinde olculen medyan fark geri ekleniyor.
    """
    temiz = (bulut < 0.05) & (gok_bant > 0.5)
    kayma = float(np.median(L[temiz] - zemin[temiz])) if temiz.sum() > 64 else 0.0
    dolgu = np.clip(zemin + kayma, 0, 1)[..., None] * 255.0
    a = np.clip(silme, 0, 1)[..., None]
    return (rgb.astype(np.float32) * (1 - a) + dolgu * a).astype(np.uint8)


def disari_yay(rgb, alfa, tur=5):
    """Alfa disindaki RGB'yi duzlestirir, once ic rengi disari yayarak.

    Duz sifir yazmak kenarda kara tuy birakir: bilinear ornekleme alfasi
    kismi olan piksele komsu SIFIR rengi de katar. Ic renk birkac tur
    yayildiginda kenar temiz kalir, uzagi zaten duzdur ve bedavaya
    sikisir.
    """
    bilinen = (alfa > 0.004).astype(np.float32)
    cal = rgb.astype(np.float32) * bilinen[..., None]
    for _ in range(tur):
        cal = np.where(bilinen[..., None] > 0, rgb.astype(np.float32),
                       bulanik_rgb(np.clip(cal, 0, 255).astype(np.uint8), 3.0))
    return np.clip(cal, 0, 255).astype(np.uint8)


def kesim_kutusu(varyant, W0, H0):
    k = S["kesim"][varyant]
    if not k["oran"]:
        return 0, 0, W0, H0
    cw = int(round(H0 * k["oran"]))
    return max(0, min(W0 - cw, int(round(k["merkez"] * W0 - cw / 2)))), 0, cw, H0


def sinir_kutusu(alfa):
    """Alfanin sinir kutusu (0..1, x0 y0 x1 y1), payli ve 'temiz' esikle."""
    if alfa is None:
        return [0.0, 0.0, 1.0, 1.0]
    H, W = alfa.shape
    yy, xx = np.nonzero(alfa > 0.006)
    if not len(yy):
        return [0.0, 0.0, 1.0, 1.0]
    x0, x1 = xx.min() / W, (xx.max() + 1) / W
    y0, y1 = yy.min() / H, (yy.max() + 1) / H
    px, py = (x1 - x0) * KUTU_PAY, (y1 - y0) * KUTU_PAY
    return [max(0.0, x0 - px), max(0.0, y0 - py), min(1.0, x1 + px), min(1.0, y1 + py)]


# ============================================================
# maskeler (calisma olcusunde bir kez)
# ============================================================
def maskeler(varyant, calisma_gen=1800):
    im0 = Image.open(HAM).convert("RGB")
    W0, H0 = im0.size
    sol, ust, cw, ch = kesim_kutusu(varyant, W0, H0)
    kare_oran = cw / ch
    Wg = calisma_gen
    Hg = int(round(Wg / kare_oran))

    im = im0.crop((sol, ust, sol + cw, ust + ch)).resize((Wg, Hg), Image.LANCZOS)
    d8 = Image.open(DER).crop((sol, ust, sol + cw, ust + ch))
    d = np.asarray(d8.resize((Wg, Hg), Image.BICUBIC), dtype=np.float32) / 65535.0
    rgb = np.asarray(im, dtype=np.uint8)
    L = np.asarray(im.convert("L"), dtype=np.float32) / 255.0
    ys = np.mgrid[0:Hg, 0:Wg][0] / Hg
    xn = np.mgrid[0:Hg, 0:Wg][1] / Wg
    tuy = Wg / 274.0                      # 1920'de 7 px olan tuy, olcekle buyur
    B = S["bant"]

    gok_bant = yumusat((d <= B["gok"] + 0.006).astype(np.float32), tuy * 0.8)

    # BULUT AYIRIMI — UC DENEME, UCUNCUSU TUTTU (hepsinin maskesi bakildi):
    #  (1) duz esik: gokyuzu zaten parlak bir gradyan, L>0,3 gogun
    #      %78,6'sini yakaliyordu;
    #  (2) yuksek gecirgen / "zemine tirmanmayan bulanik": ufka dogru
    #      artan parlaklik bastan basa bir bant halinde bulut cikti —
    #      bu yontem YEREL aykiri degeri bulur, genis egimli gradyani
    #      takip edemez;
    #  (3) DUSUK YUZDELIKLI SIRA SUZGECI (rank): pencerenin 10.
    #      yuzdeligi gradyani takip eder ama parlak bulutu hic secmez.
    #      Sart: pencere yalniz GOK pikselini gormeli — dag pikselleri
    #      1,0'a cekiliyor, yoksa sirt boyunca zemin asagi cekiliyor ve
    #      siluete yapisik ince beyaz bir serit cikiyordu (goruldu).
    # Sonuc: maske gogun %30'u, iki kumulus obegi; ufuk bandi yok.
    kw = 150
    kh = max(8, round(kw / kare_oran))
    kucuk = np.asarray(im.convert("L").resize((kw, kh), Image.LANCZOS), np.float32) / 255.0
    gk = np.asarray(Image.fromarray((gok_bant * 255).astype(np.uint8))
                    .resize((kw, kh), Image.BILINEAR), np.float32) / 255.0
    kaynak = Image.fromarray((np.where(gk > 0.5, kucuk, 1.0) * 255).astype(np.uint8), "L")
    zemin = np.asarray(kaynak.filter(ImageFilter.RankFilter(25, 62))
                       .filter(ImageFilter.GaussianBlur(3.0))
                       .resize((Wg, Hg), Image.BICUBIC), np.float32) / 255.0
    bulut = np.clip((L - zemin - 0.045) / 0.170, 0, 1) * gok_bant
    bulut = np.clip(yumusat(bulut, tuy * 0.42) * 1.18, 0, 1)

    # Silme maskesi GOK BANDIYLA CARPILIYOR: aksi halde difuzyon zirvenin
    # karina ve sag sirtin centigine tasip hale birakiyordu (olculdu,
    # taban plakasi onizlemesinde goruldu).
    # Silme maskesi bulutun kendisinden GENIS (kenarda hayalet halka
    # kalmasin) ama gok bandiyla CARPIK — yoksa dolgu zirvenin karina
    # tasip hale birakiyor (taban plakasi onizlemesinde goruldu).
    silme = np.clip(yumusat((bulut > 0.10).astype(np.float32), tuy * 1.3) * 1.7, 0, 1)
    silme *= yumusat((d <= B["gok"] + 0.002).astype(np.float32), tuy * 0.5)
    taban = gok_dolgusu(rgb, L, zemin, gok_bant, bulut, silme)

    def band(lo, hi, k=1.0):
        return yumusat(((d > lo) & (d <= hi)).astype(np.float32), tuy * k)

    dag = band(B["zirve"], B["dag"])
    gecis = np.clip((xn - 0.50) / 0.08 + 0.5, 0, 1)
    nehir = ((L > 0.20) & (ys > 0.52)).astype(np.float32)
    nehir = np.clip(yumusat(nehir, tuy * 0.36) * 1.35, 0, 1)

    return dict(
        kare_oran=kare_oran, d=d, L=L, rgb=rgb, taban=taban, d16=d8,
        kaynak=(sol, ust, cw, ch, W0, H0),
        alfa={"gok": None, "bulut": bulut, "zirve": band(B["gok"], B["zirve"]),
              "dag-sol": dag * (1 - gecis), "dag-sag": dag * gecis,
              "vadi": band(B["dag"], 1.01, 1.15), "nehir": nehir},
    )


def ayrinti_agirligi(L, alfa):
    """Katmanin yuksek frekans enerjisi. Yan duvarlar neredeyse duz siyah
    siluet (ortalama parlaklik 0,05) — onlara zirvenin karla kapli
    sirtiyla ayni bayti vermek bayti cope atmaktir."""
    hf = np.abs(L - bulanik(L, 1.6))
    m = np.ones_like(L) if alfa is None else alfa
    return float((hf * m).sum() / (float(m.sum()) or 1.0))


# ============================================================
# genislik hedefleri
# ============================================================
def hedefler(varyant, M):
    ekran = S["olcum"]["ekran"][varyant]
    dpr = S["olcum"]["dpr_tavan"]
    tanH, tanV, tanVr = goruntu_tan(M["kare_oran"], ekran)
    # buyutme 1 iken "1 kaynak piksel = 1 cihaz pikseli" genisligi
    dinlenme = (tanH / tanVr) * ekran[1] * dpr

    d = M["d"]
    Hg, Wg = d.shape
    gy, gx = np.mgrid[0:Hg:4, 0:Wg:4]
    uv = np.stack([(gx.ravel() + 0.5) / Wg, (gy.ravel() + 0.5) / Hg], 1)
    d_hep = d[gy.ravel(), gx.ravel()]

    sonuc = {}
    for k in S["katman"]:
        ad, alfa = k["ad"], M["alfa"][k["ad"]]
        d_ornek = np.full(len(uv), k["d"]) if k["tur"] == "duz" else d_hep
        sec = (np.ones(len(uv), bool) if alfa is None
               else alfa[gy.ravel(), gx.ravel()] > 0.06)
        if sec.sum() < 32:
            sec = np.ones(len(uv), bool)
        sonuc[ad] = dict(oran=buyutme_orani(d_ornek[sec], uv[sec], M["kare_oran"], ekran),
                         hf=ayrinti_agirligi(M["L"], alfa), kutu=sinir_kutusu(alfa))
    en_hf = max(v["hf"] for v in sonuc.values()) or 1.0
    for k in S["katman"]:
        v = sonuc[k["ad"]]
        v["agirlik"] = max(0.35, (v["hf"] / en_hf) ** 0.5) * k["detay"]
        # gerek/pay KARE genisligi cinsinden; dosya genisligi kutuyla carpilir
        v["gerek"] = dinlenme * v["oran"]
        v["pay"] = v["gerek"] * v["agirlik"]
    return sonuc, dinlenme


# ============================================================
# uretim
# ============================================================
def uret(varyant, oniz):
    print(f"\n{varyant.upper()}")
    M = maskeler(varyant)
    kare_oran = M["kare_oran"]
    hedef, dinlenme = hedefler(varyant, M)
    taban = S["olcum"]["taban_genislik"][varyant]
    butce = S["olcum"]["butce_bayt"][varyant]
    doku_tavan = S["olcum"]["doku_bayt"][varyant]
    os.makedirs(CIK, exist_ok=True)

    # --- kirpilmis, duzlestirilmis tam olcu katmanlar ---
    Hg, Wg = M["d"].shape
    tam = {}
    for k in S["katman"]:
        ad = k["ad"]
        alfa = M["alfa"][ad]
        kutu = hedef[ad]["kutu"]
        px0, py0 = int(kutu[0] * Wg), int(kutu[1] * Hg)
        px1, py1 = int(math.ceil(kutu[2] * Wg)), int(math.ceil(kutu[3] * Hg))
        kaynak = M["taban"] if ad == "gok" else M["rgb"]
        if alfa is None:
            tam[ad] = Image.fromarray(kaynak[py0:py1, px0:px1])
        else:
            a = alfa[py0:py1, px0:px1]
            r = kaynak[py0:py1, px0:px1]
            if ad in TABAN_DOLGU:
                m = np.clip(a * 3.0, 0, 1)[..., None]
                r = (r.astype(np.float32) * m
                     + M["taban"][py0:py1, px0:px1].astype(np.float32) * (1 - m)).astype(np.uint8)
            else:
                r = disari_yay(r, a)
            tam[ad] = Image.fromarray(
                np.dstack([r, (np.clip(a, 0, 1) * 255).astype(np.uint8)]), "RGBA")
        hedef[ad]["kutu_oran"] = (px1 - px0) / Wg          # kare genisliginin kaci
        hedef[ad]["kutu_yuk"] = (py1 - py0) / Hg

    # --- ONCU KARE: sahne gelene kadar duran cok kucuk poster ---
    # Sebep OLCULDU: sahne yukleme sonrasina ertelenince Lighthouse
    # Speed Index 3.780 -> 4.859 ms'ye cikti; ilk saniyelerde ekranda
    # siyah + cumleden baska bir sey yoktu. 64 px genisliginde bir kare
    # (~1 KB) tarayicinin kendi olceklemesiyle bulanik bir poster olur;
    # tuval hazir olunca uzerine yumusakca gelir. LCP adayi DEGIL:
    # piksel basina bit orani Chrome'un dusuk entropi esiginin altinda.
    oncu = f"oncu-{ONEK[varyant]}.webp"
    oy = max(8, int(round(64 / kare_oran)))
    Image.fromarray(M["rgb"]).resize((64, oy), Image.LANCZOS).save(
        os.path.join(CIK, oncu), quality=52, method=6)
    obayt = os.path.getsize(os.path.join(CIK, oncu))

    # --- derinlik haritasi: 8 bit kayipsiz, butcenin sabit parcasi ---
    dg = min(768, int(round(dinlenme * 0.6)))
    dy = int(round(dg / kare_oran))
    d8 = np.asarray(M["d16"].resize((dg, dy), Image.BICUBIC), dtype=np.uint16)
    ddosya = f"derinlik-{ONEK[varyant]}{dg}.webp"
    Image.fromarray((d8 >> 8).astype(np.uint8), "L").save(
        os.path.join(CIK, ddosya), lossless=True, method=6)
    dbayt = os.path.getsize(os.path.join(CIK, ddosya))

    # --- bayt modeli: iki dusuk cozunurluk sondasi, us cikarilir ---
    model = {}
    for k in S["katman"]:
        ad = k["ad"]
        olc = []
        for w in (520, 900):
            h = max(8, int(round(w * tam[ad].size[1] / tam[ad].size[0])))
            yol = os.path.join(CIK, "_sonda.webp")
            tam[ad].resize((w, h), Image.LANCZOS).save(
                yol, quality=KALITE[ad], alpha_quality=ALFA_KALITE.get(ad, ALFA_TABAN),
                method=4, exact=False)
            olc.append((w, os.path.getsize(yol)))
        os.remove(os.path.join(CIK, "_sonda.webp"))
        model[ad] = (olc[1][1], olc[1][0], math.log(olc[1][1] / olc[0][1]) / math.log(900 / 520))

    def genislik_seti(s):
        g = {}
        for k in S["katman"]:
            ad = k["ad"]
            v = hedef[ad]
            kare_gen = max(taban, min(v["gerek"], v["pay"] * s))
            # YUKARI yuvarla: asagi yuvarlamada dosya genisligi kare
            # olcusune geri cevrilince taban genisligin 1 px altina
            # dusuyordu (dag-sol 1599) ve R14 hakli olarak kirmizi
            # donuyordu. Taban ALT SINIR, yuvarlama onu asindiramaz.
            dosya_gen = int(math.ceil(kare_gen * v["kutu_oran"] / 2) * 2)
            g[ad] = max(16, min(DOKU_TAVAN, dosya_gen))
        return g

    def kestirim(g):
        bayt, doku = dbayt, dg * dy
        for ad, w in g.items():
            b2, w2, us = model[ad]
            bayt += b2 * (w / w2) ** us
            doku += w * (w * tam[ad].size[1] / tam[ad].size[0]) * 4
        return bayt, doku

    lo, hi = 0.02, 12.0
    for _ in range(44):
        orta = (lo + hi) / 2
        b, dk = kestirim(genislik_seti(orta))
        if b > butce or dk > doku_tavan:
            hi = orta
        else:
            lo = orta
    sec = genislik_seti(lo)

    # KALITE — IKINCI KALDIRAC. Taban genislik (mobil 1600 · masaustu 2560)
    # ALT SINIR: butun katmanlar tabana yapistiginda genislik araligi
    # tukenir ve olcek carpani butceyi artik indiremez. O noktada dusen
    # genislik degil KALITE olur; hangi rakamin dustugu kunyeye yazilir,
    # sessizce olmaz.
    olculer = {}

    def dene(ofs, yontem=4):
        t = dbayt
        for k2 in S["katman"]:
            a2 = k2["ad"]
            g2 = sec[a2]
            y2 = max(8, int(round(g2 * tam[a2].size[1] / tam[a2].size[0])))
            yol2 = os.path.join(CIK, "_kalite.webp")
            tam[a2].resize((g2, y2), Image.LANCZOS).save(
                yol2, quality=max(45, KALITE[a2] + ofs), alpha_quality=ALFA_KALITE.get(a2, ALFA_TABAN),
                method=yontem, exact=False)
            t += os.path.getsize(yol2)
        os.remove(os.path.join(CIK, "_kalite.webp"))
        return t

    kofs = 0
    if dene(0) > butce:
        alt, ust2 = -30, 0
        for _ in range(6):
            orta2 = (alt + ust2) // 2
            if dene(orta2) > butce:
                ust2 = orta2
            else:
                alt = orta2
            if ust2 - alt <= 1:
                break
        kofs = alt
        print(f"  [kalite ikinci kaldirac: butun katmanlar taban genislikte, kalite {kofs:+d}]")

    kayit, toplam, doku = [], dbayt + obayt, dg * dy
    for k in S["katman"]:
        ad = k["ad"]
        v = hedef[ad]
        gen = sec[ad]
        yuk = max(8, int(round(gen * tam[ad].size[1] / tam[ad].size[0])))
        dosya = f"{ad}-{ONEK[varyant]}{gen}.webp"
        olculer[ad] = max(45, KALITE[ad] + kofs)
        tam[ad].resize((gen, yuk), Image.LANCZOS).save(
            os.path.join(CIK, dosya), quality=olculer[ad],
            alpha_quality=ALFA_KALITE.get(ad, ALFA_TABAN), method=6, exact=False)
        bayt = os.path.getsize(os.path.join(CIK, dosya))
        toplam += bayt
        doku += gen * yuk * 4
        kare_gen = gen / v["kutu_oran"]          # kare olcusune donusturulmus genislik
        alfa = M["alfa"][ad]
        kayit.append(dict(
            ad=ad, dosya=dosya, gen=gen, yuk=yuk, bayt=bayt,
            kutu=[round(x, 5) for x in v["kutu"]],
            kare_gen=int(round(kare_gen)),
            kaplama=round(1.0 if alfa is None else float(alfa.mean()), 4),
            buyutme=round(v["oran"], 3), gerek=int(round(v["gerek"])),
            agirlik=round(v["agirlik"], 3), keskinlik=round(kare_gen / v["gerek"], 3),
            kalite=olculer[ad]))
        print(f"  {ad:8s} {gen:5d}x{yuk:<5d} kare {int(round(kare_gen)):5d}  "
              f"buyutme {v['oran']:4.2f}x  gerek {int(v['gerek']):5d}  "
              f"keskinlik {kare_gen / v['gerek']:4.2f}  {bayt / 1024:7.1f} KB")
        if oniz and alfa is not None:
            os.makedirs(ONIZ, exist_ok=True)
            Image.fromarray((alfa * 255).astype(np.uint8)) \
                 .resize((480, int(480 / kare_oran))).save(os.path.join(ONIZ, f"{varyant}-{ad}.png"))

    print(f"  derinlik {dg:5d}x{dy:<5d} 8 bit kayipsiz{' ' * 46}{dbayt / 1024:7.1f} KB")
    print(f"  oncu     {64:5d}x{oy:<5d} poster{' ' * 54}{obayt / 1024:7.1f} KB")
    print(f"  TOPLAM {toplam / 1024:7.1f} KB / butce {butce / 1024:.0f} KB"
          f"   ·  cozulmus doku {doku / 1048576:.1f} MB / tavan {doku_tavan / 1048576:.0f} MB")
    if oniz:
        os.makedirs(ONIZ, exist_ok=True)
        Image.fromarray(M["taban"]).resize((640, int(640 / kare_oran))) \
             .save(os.path.join(ONIZ, f"{varyant}-taban.png"))

    sol, ust, cw, ch, W0, H0 = M["kaynak"]
    return dict(varyant=varyant, oran=round(kare_oran, 5),
                kesim=dict(sol=round(sol / W0, 5), gen=round(cw / W0, 5)),
                dinlenme=int(round(dinlenme)), taban_genislik=taban,
                katman=kayit,
                derinlik=dict(dosya=ddosya, gen=dg, yuk=dy, bayt=dbayt),
                oncu=dict(dosya=oncu, gen=64, yuk=oy, bayt=obayt),
                toplam=toplam, butce=butce,
                doku_bayt=int(doku), doku_tavan=doku_tavan)


def veri_yaz(kunye):
    """Calisma aninin okudugu KUCUK veri (src/prolog/veri.json).

    Neden ayri dosya: `sahne.json` ve `kunye.json` gerekce ve olcum
    tasiyor — ikisi de belge. Vite bir JSON'u ice aktarirken onu OLDUGU
    GIBI paketin icine yaziyor, yani yorumlar da tarayiciya inerdi.
    Bu dosyada yalniz sahnenin kurulmasi icin gereken sayilar var.
    """
    K = {a: S["kamera"][a] for a in ("fov_y", "yol", "egri")}
    cikti = dict(
        dpr_tavan=S["olcum"]["dpr_tavan"],
        dpr_cizim=S["olcum"]["dpr_cizim"], kamera=K,
        derinlik={a: S["derinlik"][a] for a in ("k", "d_taban", "d_tavan")},
        hareket={a: v for a, v in S["hareket"].items() if a != "_"},
        soz={a: v for a, v in S["soz"].items() if a != "_"},
        sis=[{a: v for a, v in x.items() if a != "_"} for x in S["sis"]],
        varyant={},
    )
    for ad, V in kunye["varyant"].items():
        kutular = {k["ad"]: k["kutu"] for k in V["katman"]}
        dosyalar = {k["ad"]: k["dosya"] for k in V["katman"]}
        cikti["varyant"][ad] = dict(
            oran=V["oran"], derinlik=V["derinlik"]["dosya"], oncu=V["oncu"]["dosya"],
            katman=[dict(ad=k["ad"], tur=k["tur"], kutu=kutular[k["ad"]],
                         dosya=dosyalar[k["ad"]], d=k.get("d", 0),
                         genis=k.get("genis", 0), kip=k["kip"])
                    for k in S["katman"]])
    yol = os.path.join(KOK, "src", "prolog", "veri.json")
    with open(yol, "w", encoding="utf-8") as f:
        json.dump(cikti, f, ensure_ascii=False, separators=(",", ":"))
    print(f"veri  -> {os.path.relpath(yol, KOK)}  ({os.path.getsize(yol)} B)")


if __name__ == "__main__":
    if "--veri" in sys.argv:            # yalniz veri.json'u tazele, kesme yok
        veri_yaz(json.load(open(KUNYE, encoding="utf-8")))
        sys.exit(0)
    oniz = "--onizleme" in sys.argv
    if os.path.isdir(CIK):                       # ad genisligi tasiyor, eskiler kalmasin
        for f in os.listdir(CIK):
            if f.endswith(".webp"):
                os.remove(os.path.join(CIK, f))
    kunye = dict(kaynak="dag-ham.jpg", uretec="prolog-katman.py", varyant={})
    for varyant in ("masaustu", "mobil"):
        kunye["varyant"][varyant] = uret(varyant, oniz)
    with open(KUNYE, "w", encoding="utf-8") as f:
        json.dump(kunye, f, ensure_ascii=False, indent=1)
    print(f"\nkunye -> {os.path.relpath(KUNYE, KOK)}")
    veri_yaz(kunye)
