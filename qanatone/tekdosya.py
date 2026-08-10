#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""tekdosya.py — build 109 bölünmüş kaynağından çift tıklanabilir önizleme üretir.

NE YAPAR
  1. img/ altındaki her görseli data URI olarak gömer (sabit yollar + powered şeridi)
  2. js/gsap, js/ScrollTrigger, js/lenis dosyalarını satır içine alır
     (eski çalışan tek dosyada da bu sırayla, ana betikten ÖNCE duruyorlardı)
  3. js/tubes.min.js'i ES modülünden KLASİK betiğe çevirip IIFE içine sarar
     ve yükleyiciyi window.__TUBES'e bağlar — file:// üzerinde dinamik import
     engellendiği için tek yol bu. IIFE şart: modülün üst düzey `const T`'si
     sitenin `const T`'siyle çakışıyor.

ÇIKTI  qanat-tek-dosya_110.html
"""
import base64, io, mimetypes, os, re

KAYNAK = 'index.html'
# Çıktı adı build damgasından türetiliyor — sabit yazınca sürüm
# değiştiğinde eski adla teslim ediliyordu, bir kez yaşandı.
CIKTI  = None   # aşağıda damgadan hesaplanıyor

s = io.open(KAYNAK, encoding='utf-8').read()
ilk = len(s)

def sub(a, b, etiket, adet=1):
    global s
    n = s.count(a)
    assert n == adet, f'{etiket}: {n} eslesme ({adet} olmaliydi)'
    s = s.replace(a, b)
    print(f'  ok  {etiket}')

def duri(yol):
    tip = mimetypes.guess_type(yol)[0] or 'application/octet-stream'
    with open(yol, 'rb') as f:
        return f'data:{tip};base64,' + base64.b64encode(f.read()).decode('ascii')

# ── 1) sabit görsel yolları ───────────────────────────────────────────────
sabit = sorted(set(re.findall(r'["\'(](img/[A-Za-z0-9_./-]+\.(?:webp|avif|png|jpg|svg))["\')]', s)),
               key=len, reverse=True)
gomulu = 0
for yol in sabit:
    assert os.path.exists(yol), f'{yol} diskte yok'
    s = s.replace(yol, duri(yol)); gomulu += 1
print(f'  ok  {gomulu} sabit görsel gömüldü')

# ── 2) powered şeridi (şablon içinde dinamik yol) ─────────────────────────
pw = {os.path.splitext(f)[0]: duri('img/powered/' + f)
      for f in sorted(os.listdir('img/powered'))}
# Çapa yalnız YOL parçası: şablona width/height/loading eklenince tam
# etiketi arayan eski çapa düştü ve üreteç durdu. Kısa çapa dayanıklı.
sub('''src="img/powered/${p[1]}.png"''',
    '''src="${__PW[p[1]]||''}"''',
    'powered şeridi şablonu __PW haritasına bağlandı')
sub('function renderTicker(){',
    '/* önizleme: powered logoları data URI olarak gömüldü */\n'
    'const __PW=' + repr(pw).replace("'", '"') + ';\n'
    'function renderTicker(){',
    '__PW haritası enjekte edildi')
print(f'  ok  {len(pw)} powered logosu gömüldü')

# ── 3) kütüphaneler satır içine ───────────────────────────────────────────
for lib in ['js/gsap.min.js', 'js/ScrollTrigger.min.js', 'js/lenis.min.js']:
    kod = io.open(lib, encoding='utf-8').read()
    assert '</script' not in kod, f'{lib} içinde </script dizisi var'
    sub(f'<script src="{lib}" defer></script>',
        f'<script>/* satır içi: {lib} */\n{kod}\n</script>',
        f'{lib} satır içine alındı')

# ── 4) tüpler: ES modülü → klasik betik ───────────────────────────────────
tub = io.open('js/tubes.min.js', encoding='utf-8').read()
assert tub.count('export{oB as default};') == 1
tub = tub.replace('export{oB as default};', 'window.__TUBES=oB;')
assert '</script' not in tub
sarmal = ("<script>/* satır içi: js/tubes.min.js — ES modülünden klasik betiğe.\n"
          "   IIFE şart: modülün üst düzey `const T` gibi adları sitenin\n"
          "   kendi üst düzey sabitleriyle çakışıyor. */\n"
          "(function(){'use strict';\n" + tub + "\n})();\n</script>\n")

# damga sürümden bağımsız bulunuyor — anahtar sabit yazılınca sürüm
# yükseldiğinde yama sessizce düşüyordu, bir kez yaşandı.
import re as _re
_m = _re.search(r"<script>window\.__QBUILD='[^']+';", s)
assert _m, 'build damgası betiği bulunamadı'
sub(_m.group(0), sarmal + _m.group(0), 'tubes klasik betik olarak gömüldü')

sub("""  import((location.protocol==='file:'?'':'/')+'js/tubes.min.js').then(m=>{
    const F=m.default;if(typeof F!=='function')return;""",
    """  /* önizleme sürümünde modül satır içinde: window.__TUBES.
     Dosya sürümünde eski yol korunuyor.                         */
  (window.__TUBES?Promise.resolve({default:window.__TUBES})
   :import((location.protocol==='file:'?'':'/')+'js/tubes.min.js')).then(m=>{
    const F=m.default;if(typeof F!=='function')return;""",
    'tüp yükleyicisi satır içi modüle bağlandı')

_damga = re.search(r"__QBUILD='([^']+)'", s).group(1)
CIKTI = f'qanat-tek-dosya_{_damga}.html'
io.open(CIKTI, 'w', encoding='utf-8').write(s)
son = len(s)
print(f'\n  {KAYNAK} {ilk//1024} KB  →  {CIKTI} {son//1024} KB')
