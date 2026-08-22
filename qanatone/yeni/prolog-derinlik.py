# Derinlik haritasi — Depth Anything V2 (transformers), CPU, tek gorsel.
# Cikti: dag-derinlik.png (16-bit gri, ham) + dag-derinlik-8.png (onizleme)
# Harita SAKLANIR: A yaklasiminda ayni harita displacementMap olacak.
import sys, numpy as np, torch
from PIL import Image
from transformers import pipeline

KAYNAK = sys.argv[1]
CIKTI  = sys.argv[2]
MODEL  = sys.argv[3] if len(sys.argv) > 3 else "depth-anything/Depth-Anything-V2-Large-hf"

im = Image.open(KAYNAK).convert("RGB")
print("kaynak", im.size, flush=True)

# Uzun kenari 2048'e indir: model zaten 518'e olcekliyor, 4392 px girdi
# yalnizca on/arka islemede bellek yiyor. Harita sonra tam olcuye buyutulur.
tam = im.size
kucuk = im.copy()
kucuk.thumbnail((2048, 2048), Image.LANCZOS)
print("model girdisi", kucuk.size, flush=True)

pipe = pipeline("depth-estimation", model=MODEL, device="cpu",
                torch_dtype=torch.float32)
cik = pipe(kucuk)
d = np.array(cik["predicted_depth"] if "predicted_depth" in cik else cik["depth"], dtype=np.float32)
if d.ndim == 3: d = d[0]
print("ham harita", d.shape, "min", float(d.min()), "max", float(d.max()), flush=True)

d = (d - d.min()) / max(1e-6, (d.max() - d.min()))     # 0..1, 1 = YAKIN
u16 = (d * 65535.0).astype(np.uint16)
h = Image.fromarray(u16, mode="I;16").resize(tam, Image.BICUBIC)
h.save(CIKTI)
Image.fromarray((np.array(h, dtype=np.float32) / 257.0).astype(np.uint8)).save(
    CIKTI.replace(".png", "-8.png"))
print("yazildi", CIKTI, h.size, flush=True)
