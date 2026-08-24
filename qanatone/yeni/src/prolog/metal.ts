/* ============================================================
   PROLOG · F3 — AMBLEMIN METALI (24 Agu).

   Isci is parcaciginda, sahnenin WebGL2'sinde cizilir; `isci.ts`
   bunu DINAMIK ithal eder (ayri parca, ertelenmis yukleme - R14'un
   yardimci doku kabulu ile ayni ilke). Isci parcasinin 22 KB tavani
   var; PBR + envmap oraya sigmaz, sigdirmaya calismak da yanlis.

   NE CIZIYOR. Amblemin siluetini ve pahini TEK KANALLI ISARETLI
   UZAKLIK ALANINDAN (SDF, `amblem-sdf.py`) turetir: siluet d>0,
   kenar yumusatma d'nin kendisinden, PAH NORMALI d'nin EGIMINDEN.
   Ekstruzyon kalkti (Enes, 24 Agu): ag butceye sigmadi, ustelik
   ucgenli pahta egrilik ayrik, huzme kenarda basamak atlar; SDF'te
   egrilik surekli.

   MALZEME METAL (kilitli): metallik 1, puruz 0,15, kaplama 0,5/0,14,
   env kazanci 2,4 - prototipten (gorsel-kaynak/prototip-3b/ana.js).
   Cam ve kristal kapali: gecirgenlik gece manzarasini gecirip kizili
   yutuyor.

   ENVMAP SAHNENIN KENDI KARESINDEN, BIR KEZ. Sahne 512x256 FBO'ya
   cizilir, ustune GUNES LEKESI + kucuk gok gradyani eklenir (karanlik
   ortam uyarisi: gece manzarasindan turetilen yansima metali
   matlastirir, cam bunu bir kez kanitladi), mipmap zinciri PMREM'in
   yaklasigi olur (puruz -> lod). KARE BASINA ASLA yeniden uretilmez.
   Sahnenin kendisi degismez, yalniz yansima kaynagi.

   TEK SAAT. Huzme (env donusu + gunes yonu) ve salinim ayni acidan:
   a = 2*pi*uZaman / T, T = isik nefesinin (48,33 s, sahnedeki en
   yavas periyodik surucu) dortte biri = 12,08 s. Bagimsiz periyot
   ekranda ikinci bir saat calistirirdi. Sayilar `sahne.json`
   durak2.metal'de, burada kopyasi yok.

   SALINIM KALIYOR, DONME MERKEZI KUYRUGUN UCUNDA (Enes, 24 Agu).
   2B quad'ta uc TAM SABIT: govde ucun etrafinda cos(egim) ile
   siksiyor, normal egiliyor (isik cevabi), uc kimildamiyor.
   Genlik d_uc'un icinde olculur, ayri raporlanmaz.

   YUK: saf GPU. SDF GERCEK R8 (1 bayt/px) yuklenir - ImageBitmap'ten
   R kanali cekilir; RGBA yuklemek R14'teki sayimi yalanlardi. Yukleme
   suresi olculup ana ipe gonderilir (`data-prolog-metal`).
   ============================================================ */
import SAHNE from './sahne.json';
import KUNYE from '../veri/amblem-sdf-kunye.json';

const M = (SAHNE as any).durak2.metal as {
  periyot_s: number; env_donus: number; salinim: [number, number];
  puruz: number; kaplama: number; kaplama_puruz: number; env_kazanc: number;
  pah_birim: number; bant_birim: number; gunes_uv: [number, number];
  gunes_guc: number; renk: [number, number, number]; uc: [number, number];
  tumsek: number; dip: number; merkez: [number, number]; band_guc: number;
};
const KUTU = 1254;

export type Durum = { s: number; tx: number; ty: number; metal: number };

const VS = `#version 300 es
layout(location=0) in vec2 aG;
uniform mat3 uM; uniform vec2 uEkran;
out vec2 vUV;
void main(){
  vUV = aG;
  vec3 c = uM * vec3(aG * ${KUTU}.0, 1.0);
  vec2 n = c.xy / uEkran * 2.0 - 1.0;
  gl_Position = vec4(n.x, -n.y, 0.0, 1.0);
}`;

const FS = `#version 300 es
precision highp float;
uniform sampler2D uSDF; uniform sampler2D uEnv;
uniform float uPpb;      /* cihaz pikseli / amblem birimi */
uniform float uTexel;    /* 1 / N */
uniform float uOpak, uDonus, uPah, uBant, uPuruz, uKapla, uKaplaPuruz, uKazanc, uGunesGuc;
uniform float uTumsek, uDip;
uniform vec2 uMerkez;
uniform vec3 uRenk, uGunes;
uniform mat3 uEgim;
in vec2 vUV; out vec4 renk;
float d(vec2 uv){ return texture(uSDF, uv).r * (2.0 * uBant) - uBant; }
vec3 env(vec3 R, float lod){
  float u = atan(R.x, R.z) / 6.2831853 + 0.5 + uDonus;
  float v = 0.5 - asin(clamp(R.y, -1.0, 1.0)) / 3.1415927;
  return textureLod(uEnv, vec2(u, v), lod).rgb;
}
void main(){
  float db = d(vUV);                       /* birim */
  float dp = db * uPpb;                    /* cihaz pikseli */
  float ort = clamp(dp + 0.5, 0.0, 1.0);   /* kenar yumusatma: 1 px */
  if (ort <= 0.0) discard;
  /* PAH NORMALI UZAKLIGIN EGIMINDEN. Merkezi fark, 0,75 texel:
     bilinear alanin parca parca egimi yerine duzlestirilmis egim -
     huzme kenarda basamak atmasin. */
  float e = uTexel * 0.75;
  vec2 g = vec2(d(vUV + vec2(e, 0.0)) - d(vUV - vec2(e, 0.0)),
                d(vUV + vec2(0.0, e)) - d(vUV - vec2(0.0, e))) / (2.0 * e * ${KUTU}.0);
  /* g: birim basina birim (|g|~1). Profil z(t)=sin(pi/2 t), t=d/pah. */
  float t = clamp(db / uPah, 0.0, 1.0);
  float dz = 1.5707963 * cos(1.5707963 * t);       /* dz/dt */
  /* ON YUZE HAFIF TUMSEK (Enes, 24 Agu): duz on yuz TEK normal verir,
     envmap'in tek bir satirini yansitir ve huzme yuzeyin tamaminda
     ayni anda yanip soner. Normal govde boyunca degissin ki yansima
     EGRILIK boyunca yol alsin. Kenarda (yaricap 0,4 uv) uTumsek kadar
     egim; pahta pah normali baskin. Kaynaktan sapma: prototipte
     tumsek yok, pah 7 birim - burada pah korunuyor, tumsek eklendi;
     sapma sahne.json durak2.metal'de yazili. */
  vec2 tum = vec2(vUV.x - uMerkez.x, uMerkez.y - vUV.y) / 0.4 * uTumsek;
  vec3 n = normalize(uEgim * vec3(-g.x * dz + tum.x, g.y * dz + tum.y, 1.0));
  vec3 V = vec3(0.0, 0.0, 1.0);
  float nv = max(dot(n, V), 0.0);
  vec3 R = 2.0 * nv * n - V;
  vec3 F0 = uRenk;
  vec3 F = F0 + (1.0 - F0) * pow(1.0 - nv, 5.0);
  vec3 c = env(R, uPuruz * 6.0) * uKazanc * F;           /* metal: yansima */
  c += uRenk * uDip;                                      /* dip ton: siyaha dusmesin */
  float Fc = 0.04 + 0.96 * pow(1.0 - nv, 5.0);
  c += env(R, uKaplaPuruz * 6.0) * uKazanc * Fc * uKapla;  /* kaplama */
  vec3 H = normalize(uGunes + V);
  float sp = pow(max(dot(n, H), 0.0), 160.0);
  c += vec3(1.0, 0.86, 0.66) * sp * uGunesGuc * F;        /* gunes huzmesi */
  c = c / (1.0 + c);                                       /* Reinhard */
  c = pow(c, vec3(1.0 / 2.2));
  renk = vec4(c, ort * uOpak);
}`;

const LEKE_FS = `#version 300 es
precision highp float;
uniform vec2 uUV; uniform float uGuc, uBand;
in vec2 vUV; out vec4 renk;
void main(){
  /* KARANLIK ORTAM UYARISI (olculdu, 24 Agu): gece sahnesinin medyan
     isikligi ~0,16; ondan turetilen yansima govdeyi koyu ve mat
     birakiyor (probede gri 0,35 env ile L 84, sahne env ile ~45).
     Sahne DEGISMIYOR; yansima kaynagina iki sey ekleniyor:
       leke : gunes, genis (govde tumsegiyle birlikte cevrimin ~yarisinda
              govde boyunca yol alir - huzme bu),
       band : ekvatorda yumusak sicak ufuk bandi - dume/tumsege bakan
              normallerin gordugu bant; govde artik karanliga bakmiyor. */
  vec2 f = vUV - uUV; f.x *= 1.6;
  float leke = exp(-dot(f, f) * 40.0) * uGuc;
  float b = (vUV.y - 0.47) / 0.13;
  float band = exp(-b * b) * uBand;
  float gok = 0.30 * pow(1.0 - vUV.y, 2.0);               /* ustte kucuk HDR gradyani */
  renk = vec4(vec3(1.0, 0.86, 0.68) * leke + vec3(1.0, 0.93, 0.84) * band
            + vec3(0.55, 0.70, 1.0) * gok, 1.0);
}`;
const LEKE_VS = `#version 300 es
layout(location=0) in vec2 aG; out vec2 vUV;
void main(){ vUV = aG; gl_Position = vec4(aG * 2.0 - 1.0, 0.0, 1.0); }`;

function derle(gl: WebGL2RenderingContext, tur: number, k: string) {
  const s = gl.createShader(tur)!;
  gl.shaderSource(s, k); gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || 'metal-shader');
  return s;
}
function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, derle(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, derle(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p) || 'metal-program');
  const u: Record<string, WebGLUniformLocation | null> = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) { const ad = gl.getActiveUniform(p, i)!.name; u[ad] = gl.getUniformLocation(p, ad); }
  return { p, u };
}

/* sRGB -> dogrusal */
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

export async function kur(
  gl: WebGL2RenderingContext, kok: string, varyant: 'mobil' | 'masaustu',
  qVao: WebGLVertexArrayObject, sahneyiCiz: (fbo: WebGLFramebuffer, g: number, y: number) => void,
) {
  /* Dosya adi ve cozunurluk KUNYEDEN - amblem-sdf.py yazdi, R21 tutuyor.
     Ikinci bir kaynak yok. */
  const KV = (KUNYE as any).varyant[varyant] as { dosya: string; N: number };
  const dosya = KV.dosya, N = KV.N;
  /* ---- SDF: GERCEK R8 ---- */
  const t0 = performance.now();
  const c = await fetch(`${kok}/img/prolog/${dosya}`, { credentials: 'same-origin' });
  const bm = await createImageBitmap(await c.blob(), { premultiplyAlpha: 'none', colorSpaceConversion: 'none' });
  const oc = new OffscreenCanvas(N, N);
  const ctx = oc.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(bm, 0, 0); bm.close();
  const rgba = ctx.getImageData(0, 0, N, N).data;
  const r8 = new Uint8Array(N * N);
  for (let i = 0, j = 0; i < r8.length; i++, j += 4) r8[i] = rgba[j];
  const t1 = performance.now();
  const sdf = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, sdf);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, N, N, 0, gl.RED, gl.UNSIGNED_BYTE, r8);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.finish();
  const t2 = performance.now();

  /* ---- ENVMAP: sahne + gunes lekesi, bir kez ---- */
  const EW = 512, EH = 256;
  const env = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, env);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, EW, EH, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  const fbo = gl.createFramebuffer()!;
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, env, 0);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  sahneyiCiz(fbo, EW, EH);
  const pLeke = program(gl, LEKE_VS, LEKE_FS);
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.viewport(0, 0, EW, EH);
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE);
  gl.useProgram(pLeke.p);
  gl.uniform2f(pLeke.u.uUV, M.gunes_uv[0], M.gunes_uv[1]);
  gl.uniform1f(pLeke.u.uGuc, M.gunes_guc);
  gl.uniform1f(pLeke.u.uBand, M.band_guc);
  gl.bindVertexArray(qVao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  /* ENV IZI (bir kez, kurulumda): sekiz satir bandinin ortalama isikligi
     olcume yazilir - "yansima neden karanlik" sorusu iscinin KENDI
     dokusundan cevaplansin; ana ipteki probe dokuya ulasamaz. */
  const ep = new Uint8Array(EW * EH * 4);
  gl.readPixels(0, 0, EW, EH, gl.RGBA, gl.UNSIGNED_BYTE, ep);
  const bant = new Float64Array(8), say = new Float64Array(8);
  for (let y = 0; y < EH; y++) {
    const bi = Math.min(7, Math.floor(((EH - 1 - y) / EH) * 8));
    for (let x = 0; x < EW; x++) {
      const i = (y * EW + x) * 4;
      bant[bi] += 0.2126 * ep[i] + 0.7152 * ep[i + 1] + 0.0722 * ep[i + 2]; say[bi]++;
    }
  }
  const envBant = Array.from(bant, (v, i) => Math.round(v / say[i]));
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  /* VIEWPORT GERI (24 Agu, duman testinde yakalandi): leke gecisi
     512x256'ya cizmisti ve geri konmamisti - sahne sol alt koseye
     sikisiyordu. FBO'dan donen her yol viewport'u geri koyar. */
  gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
  gl.bindTexture(gl.TEXTURE_2D, env);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.deleteProgram(pLeke.p);
  const t3 = performance.now();

  const pm = program(gl, VS, FS);
  const renk = M.renk.map(lin) as [number, number, number];
  const olcum = { coz_ms: +(t1 - t0).toFixed(1), yukle_ms: +(t2 - t1).toFixed(1), env_ms: +(t3 - t2).toFixed(1), N, env_bant: envBant };

  function ciz(d: Durum, zaman: number, gen: number, yuk: number, dpr: number) {
    if (d.metal <= 0) return;
    const a = (zaman * 2 * Math.PI) / M.periyot_s;
    const ex = Math.sin(a) * M.salinim[0], ey = Math.sin(a * 0.8) * M.salinim[1];
    /* Affin: birim -> cihaz pikseli. Uc SABIT: govde ucun etrafinda
       cos(egim) ile siksiyor. */
    const s = d.s * dpr, tx = d.tx * dpr, ty = d.ty * dpr;
    const ux = tx + M.uc[0] * s, uy = ty + M.uc[1] * s;
    const sx = Math.cos(ey), sy = Math.cos(ex);
    const Mm = [s * sx, 0, 0, 0, s * sy, 0, ux + (tx - ux) * sx, uy + (ty - uy) * sy, 1];
    /* Normal egimi: Rx(ex) * Ry(ey), sutun-major. */
    const cx = Math.cos(ex), sxn = Math.sin(ex), cy = Math.cos(ey), syn = Math.sin(ey);
    const E = [cy, 0, -syn, sxn * syn, cx, sxn * cy, cx * syn, -sxn, cx * cy];
    const gy = Math.sin(a), gz = Math.cos(a);
    gl.useProgram(pm.p);
    gl.uniformMatrix3fv(pm.u.uM, false, Mm);
    gl.uniformMatrix3fv(pm.u.uEgim, false, E);
    gl.uniform2f(pm.u.uEkran, gen * dpr, yuk * dpr);
    gl.uniform1f(pm.u.uPpb, s);
    gl.uniform1f(pm.u.uTexel, 1 / N);
    gl.uniform1f(pm.u.uOpak, d.metal);
    gl.uniform1f(pm.u.uDonus, (a * M.env_donus) / (2 * Math.PI));
    gl.uniform1f(pm.u.uPah, M.pah_birim);
    gl.uniform1f(pm.u.uBant, M.bant_birim);
    gl.uniform1f(pm.u.uPuruz, M.puruz);
    gl.uniform1f(pm.u.uKapla, M.kaplama);
    gl.uniform1f(pm.u.uKaplaPuruz, M.kaplama_puruz);
    gl.uniform1f(pm.u.uKazanc, M.env_kazanc);
    gl.uniform1f(pm.u.uGunesGuc, M.gunes_guc);
    gl.uniform1f(pm.u.uTumsek, M.tumsek);
    gl.uniform1f(pm.u.uDip, M.dip);
    gl.uniform2f(pm.u.uMerkez, M.merkez[0], M.merkez[1]);
    gl.uniform3f(pm.u.uRenk, renk[0], renk[1], renk[2]);
    const gl_ = Math.hypot(gy * 0.8, 0.55, gz * 0.8);
    gl.uniform3f(pm.u.uGunes, (gy * 0.8) / gl_, 0.55 / gl_, (gz * 0.8) / gl_);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, sdf); gl.uniform1i(pm.u.uSDF, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, env); gl.uniform1i(pm.u.uEnv, 1);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindVertexArray(qVao); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.bindVertexArray(null);
  }
  function sok() {
    gl.deleteTexture(sdf); gl.deleteTexture(env); gl.deleteFramebuffer(fbo); gl.deleteProgram(pm.p);
  }
  /* `env` ve `sdf` disari veriliyor: olcum duzenegi (metal-yalniz) envmap'i
     geri okuyup satir satir isikligini olcuyor - "yansima neden karanlik"
     sorusu tahminle degil dokunun kendisiyle cevaplanir. */
  return { ciz, sok, olcum, env, sdf, EW, EH };
}
