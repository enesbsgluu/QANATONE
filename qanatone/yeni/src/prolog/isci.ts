/* ============================================================
   PROLOG · 1. DURAK — SAHNE, ISCI IS PARCACIGINDA.

   NEDEN ISCI (olculdu, 22 Agu). Sahne once ana is parcaciginda
   kosuyordu ve calisiyordu; kapiyi kiran sey gorunen kare degil,
   ANA IS PARCACIGININ MESGULIYETIYDI. Lighthouse mobil, ayni
   pencerede donusumlu, dort tur ortancasi:
       taban (B yaklasimi)          96 · LCP 2.499 · TBT   69
       yeni varliklar, 3B KAPALI    92 · LCP 3.039 · TBT   45
       yeni varliklar, 3B ANA IPTE  68 · LCP 3.322 · TBT  861
   Yani 3B'nin bedeli neredeyse tamamen TBT: doku yuklemesi, ag
   kurulumu ve gorsel cozumu ana ipte 800 ms'i asan bir engelleme
   birakiyordu. Sahne buraya tasininca ana ip yalnizca `scrollY`
   okuyup bir sayi gonderiyor.

   NE YAPAR
   Depth Anything V2 haritasini DISPLACEMENT olarak kullanip
   fotografi 3B bir araziye acar, sonra kamerayi vadiye INDIRIR.
   B yaklasiminda (CSS) hareket tek bir seydi: katmanlar farkli
   hizda dikey kayiyordu — yani olcek degisiyordu, perspektif
   degil. Burada kamera gercekten yol aliyor: on plan 2,4x
   buyurken zirve 1,08x buyuyor, siluetler birbirinin onunden
   geciyor, vadi agzi aciliyor.

   AG BIR KEZ KURULUR. Butun derinlik katmanlari AYNI arazinin
   parcalari oldugu icin tek bir konum+normal tamponu var; katman
   basina degisen yalniz doku ve INDIS ARALIGI (her katman kendi
   sinir kutusundaki hucreleri cizer). Kamera hareket ederken
   vertex shader'in isi tek bir mat4 carpimi.

   DERINLIK GPU'YA HIC CIKMAZ: harita bir kez cozulur, ag burada
   kurulur, harita birakilir. Hem doku bellegi hem her karedeki
   dokuz dokunusluk vertex ornekleme boylece yok.

   GORSELLER SAYFADAN DEGIL BURADAN INIYOR. Sayfadaki `<img>`ler
   3B yolunda `display:none` — yani hic indirilmiyorlar (tembel
   gorsel goruse girmezse istek atilmaz). Ayni yedi dosyayi isci
   `fetch` + `createImageBitmap` ile aliyor: cozme de yukleme de
   ana ipin disinda. Yedek yolda (WebGL yok / hareket azaltma /
   JS yok) tam tersi olur ve isci hic acilmaz.

   SAHNEDE DURAN HICBIR SEY YOK (talimat): bulutlar surukleniyor,
   iki sis perdesi nefes alip akiyor, nehir parliyor, isik ray
   boyunca gun dogumuna doniyor (renk rampasi + normalden gelen
   yon isigi + gokte yukselen gunes). Bunlarin hicbiri kaydirmaya
   bagli degil; kaydirma dururken de sahne yasiyor.

   CUMLE SAHNENIN ICINDE. Ekrana yapisik bir yazi degil, vadi
   agzinin onunde duran bir DUNYA NESNESI: kamera inerken yaklasir,
   buyur, paralaksla kayar ve yan duvarlar onunden gecer. Dokusu
   ANA IPTE ciziliyor (marka fontu orada yukludur) ve buraya
   `ImageBitmap` olarak aktariliyor — sifir bayt iner, keskinlik
   tam. HTML'deki `<p>` silinmiyor, gorunmez erisilebilir kaliyor.
   ============================================================ */
import VERI from './veri.json';

/* kip = [parilti, gunes diski, sis payi, yon isigi] — sahne.json'dan */
type Kip = number[];
type KatmanV = { ad: string; tur: string; kutu: number[]; d: number; genis: number; kip: Kip };

/* ---------- kucuk 4x4 (sutun sirali, WebGL duzeni) ---------- */
function izdusum(tanV: number, oran: number, yakin: number, uzak: number) {
  const f = 1 / tanV;
  return new Float32Array([
    f / oran, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (uzak + yakin) / (yakin - uzak), -1,
    0, 0, (2 * uzak * yakin) / (yakin - uzak), 0,
  ]);
}
/* Kamera yalniz X ekseninde donuyor (egim); genel bir bakis
   matrisine gerek yok, ucgen fonksiyonlar dogrudan yaziliyor. */
function bakis(ex: number, ey: number, ez: number, a: number) {
  const c = Math.cos(a), s = Math.sin(a);
  return new Float32Array([
    1, 0, 0, 0,
    0, c, -s, 0,
    0, s, c, 0,
    -ex, -(c * ey + s * ez), -(-s * ey + c * ez), 1,
  ]);
}
function carp(a: Float32Array, b: Float32Array) {
  const o = new Float32Array(16);
  for (let i = 0; i < 4; i++)
    for (let j = 0; j < 4; j++) {
      let s = 0;
      for (let k = 0; k < 4; k++) s += a[k * 4 + j] * b[i * 4 + k];
      o[i * 4 + j] = s;
    }
  return o;
}

/* ---------- ortak GLSL parcalari ---------- */
const ORTAK_FS = `
precision highp float;
uniform float uIsi;        /* 0..1 gun dogumu ilerlemesi */
uniform float uZaman;
uniform vec3  uGunes;      /* dunya uzayinda gunes yonu */
uniform vec4  uKip;        /* x parilti · y gunes diski · z sis payi · w yon isigi */
uniform float uSisK, uSisBas, uNefes;
uniform float uSonuk;      /* sahne sonmesi (amblem cizilirken) - 3B yolunda CSS degil burada */

/* Karistirici SIN'SIZ. Ilk surumde fract(sin(dot(..))*43758) vardi
   ve sis perdeleri iki kez uc oktavli gurultu cagirdigi icin fragment
   basina 24 sinus dusuyordu. Carpma-fract karistirici ayni dagilimi
   cok daha ucuza veriyor, oktav da uce degil ikiye indi. */
float karis(vec2 p){
  vec3 q = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}
float gurultu(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(karis(i), karis(i + vec2(1,0)), f.x),
             mix(karis(i + vec2(0,1)), karis(i + vec2(1,1)), f.x), f.y);
}
float katmanli(vec2 p){
  return gurultu(p) * 0.66 + gurultu(p * 2.17 + 7.1) * 0.34;
}

/* Kaynak siyah-beyaz. Renk parlaklik rampasindan geliyor; rampanin
   sicak ucu ray boyunca kayiyor — "isik gun dogumuna doniyor" bu.
   p=0'da rampa notr-soguk, yani sahne acilista monokrom duruyor. */
vec3 rampa(float l){
  vec3 golge = mix(vec3(0.012,0.017,0.030), vec3(0.030,0.024,0.030), uIsi);
  vec3 orta  = mix(vec3(0.330,0.360,0.425), vec3(0.400,0.352,0.330), uIsi);
  vec3 isik  = mix(vec3(0.930,0.950,1.000), vec3(1.000,0.880,0.680), uIsi);
  return l < 0.5 ? mix(golge, orta, l * 2.0) : mix(orta, isik, (l - 0.5) * 2.0);
}
vec3 yonIsigi(vec3 n, float l){
  float nl = max(0.0, dot(normalize(n), uGunes));
  vec3 renk = mix(vec3(0.05,0.07,0.11), vec3(0.44,0.25,0.10), uIsi);
  return uKip.w * pow(nl, 2.8) * renk * (0.18 + l);
}
vec3 sisle(vec3 c, float z){
  float s = 1.0 - exp(-uSisK * max(0.0, z - uSisBas));
  s *= uKip.z * (0.86 + 0.14 * sin(uZaman * 6.2831853 / uNefes));
  vec3 renk = mix(vec3(0.075,0.095,0.140), vec3(0.215,0.165,0.155), uIsi);
  return mix(c, renk, clamp(s, 0.0, 0.78));
}
vec3 gunesi(vec3 c, vec3 yon){
  /* Gunes yalniz gok ve bulutta var; obur bes katmanda uc pow'u bosuna
     kosturmamak icin dallanma basta. */
  if (uKip.y <= 0.0) return c;
  float k = max(0.0, dot(normalize(yon), uGunes));
  float k2 = k * k; float k4 = k2 * k2;
  /* Genis hale ILK DENEMEDE COK GUCLUYDU: p=0,25'te bile sag ust kose
     duz beyaza patliyordu (kare-e-md-050'de goruldu). Uc terim de
     kisildi ve butun katki uIsi ile buyuyor — gunes rayin basinda
     ufkun ALTINDA, parlamasi da oraya ait degil. */
  float g = k4 * k4 * k4 * k4 * 1.2 + k4 * k4 * 0.13 + k4 * k * 0.018;
  return c + g * uKip.y * (0.22 + 0.78 * uIsi)
           * mix(vec3(0.45,0.52,0.70), vec3(1.00,0.70,0.36), uIsi);
}
`;

/* Konumlar ACIK yaziliyor. Baglayicinin kendi atamasina guvenmek
   calisiyor gibi gorunuyordu (bildirim sirasiyla ayni cikiyor) ama
   sozlesme degil: baska bir suruculde ag tamponlari yanlis niteliklere
   baglanabilirdi. */
const ARAZI_VS = `#version 300 es
layout(location=0) in vec3 aKonum;
layout(location=1) in vec3 aNormal;
layout(location=2) in vec2 aUV;
uniform mat4 uMVP; uniform vec3 uGoz; uniform vec4 uKutu;
out vec2 vTUV; out vec3 vN; out float vZ; out vec3 vYon;
void main(){
  vTUV = (aUV - uKutu.xy) / (uKutu.zw - uKutu.xy);
  vN = aNormal;
  vYon = aKonum - uGoz;
  vZ = length(vYon);
  gl_Position = uMVP * vec4(aKonum, 1.0);
}`;

const QUAD_VS = `#version 300 es
layout(location=0) in vec2 aG;
uniform mat4 uMVP; uniform vec3 uGoz;
uniform vec4 uKutu;      /* kare uv kutusu (duz katman) */
uniform vec2 uTan;       /* tanH, tanV */
uniform float uZ;        /* duz katmanin uzakligi */
uniform float uGenis;    /* kutu disina tasma payi */
uniform vec3 uMerkez;    /* dunya dortgeni (metin) */
uniform vec2 uYari;
uniform float uDunya;    /* 1 = dunya dortgeni, 0 = kare dortgeni */
uniform vec2 uKaydir;
out vec2 vTUV; out vec3 vN; out float vZ; out vec3 vYon;
void main(){
  vec2 g = aG * (1.0 + 2.0 * uGenis) - uGenis;
  vec3 k;
  if (uDunya > 0.5) {
    k = uMerkez + vec3((g.x * 2.0 - 1.0) * uYari.x, (1.0 - g.y * 2.0) * uYari.y, 0.0);
  } else {
    vec2 f = mix(uKutu.xy, uKutu.zw, g);
    k = vec3((f.x * 2.0 - 1.0) * uTan.x * uZ, (1.0 - f.y * 2.0) * uTan.y * uZ, -uZ);
  }
  vTUV = g + uKaydir;
  vN = vec3(0.0, 0.0, 1.0);
  vYon = k - uGoz;
  vZ = length(vYon);
  gl_Position = uMVP * vec4(k, 1.0);
}`;

const DOKU_FS = `#version 300 es
${ORTAK_FS}
uniform sampler2D uDoku;
uniform float uHam;        /* 1 = dokuyu oldugu gibi kullan (metin) */
uniform float uParHiz;
uniform float uSoluk;      /* dokunun kendi alfasini olcekler (cumle sonmesi) */
uniform vec3  uDalga;      /* x genlik · y frekans · z hiz — yavas yatay esneme */
uniform float uSalinim;    /* yogunluk salinimi (yalniz bulut) */
uniform float uNefesIsik;  /* butun sahneye cok yavas parlaklik nefesi */
uniform vec2  uParEsik;    /* pariltinin gorundugu parlaklik penceresi */
uniform float uNefesHiz;   /* isik nefesinin acisal hizi */
in vec2 vTUV; in vec3 vN; in float vZ; in vec3 vYon;
out vec4 renk;
void main(){
  /* Yavas yatay esneme: bulutlar duz kaymasin. Tek bir sinus; genlik 0
     iken dal bedelsiz. */
  vec2 uv = vTUV;
  uv.x += uDalga.x * sin(uv.y * uDalga.y + uZaman * uDalga.z);
  vec4 t = texture(uDoku, uv);
  if (t.a < 0.004) discard;
  vec3 c;
  if (uHam > 0.5) {
    c = t.rgb * mix(vec3(0.97,0.98,1.0), vec3(1.0,0.93,0.82), uIsi);
  } else {
    float l = t.r;
    c = rampa(l) + yonIsigi(vN, l);
    /* nehir: parlak seride akan bir parilti — kaynak zaten aydinlik
       bir serit, parilti onun uzerinde geziyor, yeni sekil uydurmuyor */
    if (uKip.x > 0.0) {
      float par = smoothstep(uParEsik.x, uParEsik.y, l);
      float n = katmanli(vTUV * vec2(7.0, 21.0) + vec2(0.0, -uZaman * uParHiz));
      c += uKip.x * par * (0.28 + 0.72 * n)
           * mix(vec3(0.42,0.52,0.74), vec3(1.00,0.80,0.52), uIsi);
    }
    c = gunesi(c, vYon);
  }
  /* ISIK NEFESI: kaydirma dururken isik olu kalmasin diye butun
     sahneye uygulanan +-%3'luk cok yavas salinim. */
  c *= 1.0 + uNefesIsik * sin(uZaman * uNefesHiz);
  c = sisle(c, vZ);
  /* Yogunluk salinimi yalniz bulutta acik; arazi katmanlarinda 0,
     yoksa daglar titrerdi. */
  renk = vec4(c * uSonuk, t.a * uSoluk * (1.0 + uSalinim * sin(uZaman * 0.19 + vTUV.x * 3.0)));
}`;

/* Sis perdesi: dokusuz. Alfa katmanli gurultuden geliyor, iki eksende
   birden akiyor ve nefes aliyor; vadinin agzini dolduruyor. */
const SIS_FS = `#version 300 es
${ORTAK_FS}
uniform float uYogun, uAkis;
in vec2 vTUV; in vec3 vN; in float vZ; in vec3 vYon;
out vec4 renk;
void main(){
  vec2 uv = vTUV;
  float n = katmanli(uv * vec2(2.9, 1.9) + vec2(uZaman * uAkis, uZaman * uAkis * 0.32));
  float perde = smoothstep(0.02, 0.32, uv.y) * smoothstep(1.0, 0.62, uv.y)
              * smoothstep(0.0, 0.18, uv.x) * smoothstep(1.0, 0.82, uv.x);
  float a = smoothstep(0.34, 0.86, n) * perde * uYogun
          * (0.62 + 0.38 * sin(uZaman * 6.2831853 / uNefes + uv.x * 1.7));
  if (a < 0.004) discard;
  vec3 c = mix(vec3(0.10,0.125,0.180), vec3(0.44,0.33,0.29), uIsi);
  c = gunesi(c, vYon);
  renk = vec4(c * uSonuk, clamp(a, 0.0, 0.62));
}`;

function derle(gl: WebGL2RenderingContext, tur: number, kaynak: string) {
  const s = gl.createShader(tur)!;
  gl.shaderSource(s, kaynak);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
    throw new Error(gl.getShaderInfoLog(s) || 'shader');
  return s;
}
function program(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const p = gl.createProgram()!;
  gl.attachShader(p, derle(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, derle(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS))
    throw new Error(gl.getProgramInfoLog(p) || 'program');
  const u: Record<string, WebGLUniformLocation | null> = {};
  const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < n; i++) {
    const ad = gl.getActiveUniform(p, i)!.name.replace(/\[0\]$/, '');
    u[ad] = gl.getUniformLocation(p, ad);
  }
  return { p, u };
}

const G = self as unknown as {
  requestAnimationFrame?: (f: (t: number) => void) => number;
  cancelAnimationFrame?: (h: number) => void;
};
/* Isci is parcaciginda `requestAnimationFrame` OffscreenCanvas ile
   birlikte geliyor; olmayan tarayicida zamanlayiciya dusuluyor. */
const kareIste = (f: (t: number) => void): number =>
  (G.requestAnimationFrame ? G.requestAnimationFrame(f)
    : (setTimeout(() => f(performance.now()), 16) as unknown as number));
const kareIptal = (h: number) => {
  if (G.cancelAnimationFrame) G.cancelAnimationFrame(h); else clearTimeout(h);
};

type Kurulum = {
  tuval: OffscreenCanvas; varyant: 'mobil' | 'masaustu'; kok: string;
  dpr: number; gen: number; yuk: number; soz: ImageBitmap | null;
};

let sok: (() => void) | null = null;

/* ============ ILERLEMEYI ONGORME ============
   Sahne kaydirmayi bir tik geriden takip ediyordu. Sebep FPS degil
   GECIKME: ilerleme ana ipte uretilip `postMessage` ile geliyor,
   isci onu KENDI karesinde kullaniyor - arada en az bir kuyruk ve bir
   kare var. Olculdu (412x892, CPU 4x): degerin yasi ortalama 23-41 ms.

   Cozum: son iki ornekten HIZ kestirilip cizim anina kadar ilerleme
   ongoruluyor. Olculen sonuc, konum hatasi (cizilen kare ile o anin
   gercek ilerlemesi arasindaki fark, piksel):
       gonderim karede, ongoru YOK     6,4 px ort · p95 25,9
       gonderim karede, ongoru VAR     2,4 px ort · p95 12,0
   Durusta sicrama YOK: en buyuk hata da dusuyor (38,1 -> 26,5 px).

   UC KORUMA:
     - hiz EMA ile yumusatilir (tek ornegin gurultusu sahneyi
       titretmesin),
     - ongoru YAS_TAVANI ile sinirlidir,
     - o tavanin otesinde kademeli SONER; ustelik ana ip kaydirma
       bitince `dur` gonderir ve hiz sifirlanir. */
const YAS_TAVAN = 50;      /* ms — bu kadar oteye ongoru yok */
const SONUM = 50;          /* ms — tavandan sonra bu surede sifirlanir */
let anaFark = 0;
let pSon = 0, tSon = 0, pHiz = 0;

async function kur(K0: Kurulum) {
  const V = (VERI as any).varyant[K0.varyant];
  const K = (VERI as any).kamera, D = (VERI as any).derinlik, H = (VERI as any).hareket;
  const gl = K0.tuval.getContext('webgl2', {
    alpha: false, antialias: false, depth: false, stencil: false,
    premultipliedAlpha: false, powerPreference: 'high-performance',
  }) as WebGL2RenderingContext | null;
  if (!gl) throw new Error('webgl2 yok');

  const tanV = Math.tan((K.fov_y * Math.PI) / 180 / 2);
  const tanH = tanV * V.oran;
  const uzaklik = (d: number) => D.k / Math.min(Math.max(d, D.d_taban), D.d_tavan);

  /* ---------------- varliklar ---------------- */
  const bit = async (dosya: string) => {
    const c = await fetch(`${K0.kok}/img/prolog/${dosya}`, { credentials: 'same-origin' });
    if (!c.ok) throw new Error(dosya);
    return createImageBitmap(await c.blob(), {
      premultiplyAlpha: 'none', colorSpaceConversion: 'none',
    });
  };
  /* Yedi katman + harita AYNI ANDA yola cikiyor: hepsi ana ipin
     disinda cozuluyor, sira beklemeye gerek yok. */
  const haritaSozu = (async () => {
    const im = await bit(V.derinlik);
    const w = im.width, h = im.height;
    const c = new OffscreenCanvas(w, h).getContext('2d')!;
    c.drawImage(im, 0, 0);
    const px = c.getImageData(0, 0, w, h).data;
    const A = new Float32Array(w * h);
    for (let i = 0, j = 0; i < A.length; i++, j += 4) A[i] = px[j] / 255;
    im.close();
    return { D: A, w, h };
  })();
  const katmanSozu = (V.katman as KatmanV[]).map((k) => bit((k as any).dosya));

  /* ---------------- ag ---------------- */
  /* AG COZUNURLUGU MOBILDE DUSURULMEDI - OLCUM REDDETTI (23 Agu).
     Talimat "yuzey bozma cozunurlugunu mobilde dusur" diyordu; olcum
     bunun kare kazandirmadigini gosterdi. DPR 1'de tam sahne, sis
     kapali ve ARAZI KAPALI uc kosumun ucu de 8,63 ms verdi: mobilde
     maliyetin tamami DOLUM (fragment) isi, vertex isi degil. 17.024
     hucrelik ag bu GPU'da bedava; dusurmek yalniz siluet kalitesini
     kaybettirirdi. Kazanc DPR'da ve sis perdesinde alindi.
     (Mobil ag masaustunden BUYUK: 128x133 vs 176x93 - sebep mobil
     kesimin dikey olmasi, oran 0,72. Bu da bilerek birakildi.) */
  const N = K0.varyant === 'mobil' ? 128 : 176;
  const M = Math.round(N / V.oran / 1.34);
  let vao: WebGLVertexArrayObject | null = null;
  const indisler: Record<string, { tampon: WebGLBuffer; adet: number }> = {};
  const nefes = () => new Promise<void>((r) => kareIste(() => r()));

  async function agKur(harita: { D: Float32Array; w: number; h: number }) {
    const { D: dd, w: dw, h: dh } = harita;
    /* Harita 8 bit. Teraslamayi 3x3 gauss kapatiyor; dokunus basina
       gercek degisim 8 bitin 0,17'si oldugu icin bu yumusatma gercek
       ayrinti silmiyor, yalniz basamaklari eritiyor. */
    const ornek = (u: number, v: number) => {
      const x = Math.min(dw - 1.001, Math.max(0, u * dw - 0.5));
      const y = Math.min(dh - 1.001, Math.max(0, v * dh - 0.5));
      const x0 = x | 0, y0 = y | 0, fx = x - x0, fy = y - y0;
      const i = y0 * dw + x0;
      return dd[i] * (1 - fx) * (1 - fy) + dd[i + 1] * fx * (1 - fy)
           + dd[i + dw] * (1 - fx) * fy + dd[i + dw + 1] * fx * fy;
    };
    const tx = 1 / dw, ty = 1 / dh;
    const yumusak = (u: number, v: number) => (
      ornek(u, v) * 4
      + (ornek(u + tx, v) + ornek(u - tx, v) + ornek(u, v + ty) + ornek(u, v - ty)) * 2
      + (ornek(u + tx, v + ty) + ornek(u - tx, v - ty)
         + ornek(u + tx, v - ty) + ornek(u - tx, v + ty))
    ) / 16;

    const nx = N + 1, ny = M + 1;
    const pay = 0.045;                                 // kare disina tasma
    const pos = new Float32Array(nx * ny * 3);
    const uvs = new Float32Array(nx * ny * 2);
    const konum = (u: number, v: number, d: number) => {
      const Z = uzaklik(d);
      return [(u * 2 - 1) * tanH * Z, (1 - v * 2) * tanV * Z, -Z];
    };
    for (let j = 0, i = 0; j < ny; j++)
      for (let k = 0; k < nx; k++, i++) {
        const u = (k / N) * (1 + 2 * pay) - pay;
        const v = (j / M) * (1 + 2 * pay) - pay;
        const d = yumusak(Math.min(1, Math.max(0, u)), Math.min(1, Math.max(0, v)));
        uvs[i * 2] = u; uvs[i * 2 + 1] = v;
        const q = konum(u, v, d);
        pos[i * 3] = q[0]; pos[i * 3 + 1] = q[1]; pos[i * 3 + 2] = q[2];
      }
    /* Normal komsu koselerden — ayri bir doku ornekleme turu daha
       acmadan, zaten elimizde olan agdan. */
    const nrm = new Float32Array(nx * ny * 3);
    for (let j = 0, i = 0; j < ny; j++)
      for (let k = 0; k < nx; k++, i++) {
        const a = (j * nx + Math.min(nx - 1, k + 1)) * 3;
        const b = (j * nx + Math.max(0, k - 1)) * 3;
        const c = (Math.min(ny - 1, j + 1) * nx + k) * 3;
        const e = (Math.max(0, j - 1) * nx + k) * 3;
        const ux = pos[a] - pos[b], uy = pos[a + 1] - pos[b + 1], uz = pos[a + 2] - pos[b + 2];
        const vx = pos[c] - pos[e], vy = pos[c + 1] - pos[e + 1], vz = pos[c + 2] - pos[e + 2];
        let X = uy * vz - uz * vy, Y = uz * vx - ux * vz, Z2 = ux * vy - uy * vx;
        const L = Math.hypot(X, Y, Z2) || 1;
        if (Z2 < 0) { X = -X; Y = -Y; Z2 = -Z2; }
        nrm[i * 3] = X / L; nrm[i * 3 + 1] = Y / L; nrm[i * 3 + 2] = Z2 / L;
      }

    vao = gl!.createVertexArray();
    gl!.bindVertexArray(vao);
    const bagla = (veri: Float32Array, yer: number, boy: number) => {
      const t = gl!.createBuffer();
      gl!.bindBuffer(gl!.ARRAY_BUFFER, t);
      gl!.bufferData(gl!.ARRAY_BUFFER, veri, gl!.STATIC_DRAW);
      gl!.enableVertexAttribArray(yer);
      gl!.vertexAttribPointer(yer, boy, gl!.FLOAT, false, 0, 0);
    };
    bagla(pos, 0, 3); bagla(nrm, 1, 3); bagla(uvs, 2, 2);
    gl!.bindVertexArray(null);

    /* Katman basina INDIS: yalniz kendi sinir kutusuna denk gelen
       hucreler. Yedi tam ekran gecisi yerine her katman kendi
       bandini ciziyor — hem vertex hem dolum isi dusuyor. */
    for (const kt of V.katman as KatmanV[]) {
      if (kt.tur !== 'derinlik') continue;
      const [x0, y0, x1, y1] = kt.kutu;
      const dz: number[] = [];
      for (let j = 0; j < M; j++)
        for (let k = 0; k < N; k++) {
          const u0 = (k / N) * (1 + 2 * pay) - pay, u1 = ((k + 1) / N) * (1 + 2 * pay) - pay;
          const v0 = (j / M) * (1 + 2 * pay) - pay, v1 = ((j + 1) / M) * (1 + 2 * pay) - pay;
          if (u1 < x0 || u0 > x1 || v1 < y0 || v0 > y1) continue;
          const a = j * nx + k, b = a + 1, c = a + nx, e = c + 1;
          dz.push(a, c, b, b, c, e);
        }
      const t = gl!.createBuffer()!;
      gl!.bindVertexArray(vao);
      gl!.bindBuffer(gl!.ELEMENT_ARRAY_BUFFER, t);
      gl!.bufferData(gl!.ELEMENT_ARRAY_BUFFER, new Uint32Array(dz), gl!.STATIC_DRAW);
      gl!.bindVertexArray(null);
      indisler[kt.ad] = { tampon: t, adet: dz.length };
    }
  }

  /* ---------------- dortgen ag ---------------- */
  const qVao = gl.createVertexArray();
  gl.bindVertexArray(qVao);
  const qBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, qBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  /* ---------------- dokular ---------------- */
  const dokular: Record<string, WebGLTexture> = {};
  function doku(kaynak: ImageBitmap, tekrar = false) {
    const t = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, t);
    gl!.pixelStorei(gl!.UNPACK_FLIP_Y_WEBGL, false);
    gl!.pixelStorei(gl!.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, kaynak);
    /* BULUTUN IZ BIRAKMASI BUYDU. Kayan katmanin UV'si 0'in altina
       inince CLAMP_TO_EDGE kenar sutununu butun kareye yayiyor - ekranda
       bulutun arkasindan cekilen bir iz gibi goruluyordu. Suru ancak
       kayan katmani sarmalayarak durur; `MIRRORED_REPEAT` secildi cunku
       doku dosyasi dizilebilir (tileable) DEGIL, duz REPEAT sert bir
       dikis birakirdi. WebGL2 NPOT dokuda tekrar + mipmap destekliyor. */
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S,
      tekrar ? gl!.MIRRORED_REPEAT : gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    /* Mipmap: DPR 1 ekranda katmanlar 2x kucultuluyor, mipmapsiz
       kenarlar titriyor. Uretim maliyeti olculdu, ihmal edilebilir —
       agirlik `texImage2D`nin kendisinde. */
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR);
    gl!.generateMipmap(gl!.TEXTURE_2D);
    return t;
  }

  const pArazi = program(gl, ARAZI_VS, DOKU_FS);
  const pQuad = program(gl, QUAD_VS, DOKU_FS);
  const pSis = program(gl, QUAD_VS, SIS_FS);

  /* F3 METAL - DINAMIK ITHAL (24 Agu). Amblemin metali `metal.ts`te,
     ayri parcada: isci parcasinin 22 KB tavani var, PBR + envmap oraya
     sigmaz. Ithal amblem dogmadan once (`on`), yukleme ertelenmis -
     R14'un yardimci doku kabuluyle ayni ilke. Sessiz cikis YOK: hata
     da basari da ana ipe mesajla gidiyor (`data-prolog-metal`). */
  let metal: Awaited<ReturnType<typeof import('./metal').kur>> | null = null;
  let metalYol: 'yok' | 'yukleniyor' | 'var' | 'hata' = 'yok';
  let amblemD: (import('./metal').Durum & { on?: boolean }) | null = null;

  /* ---------------- durum ---------------- */
  let p = 0, gen = K0.gen, yuk = K0.yuk, dpr = K0.dpr, sonuk = 1;
  let tanVr = tanV, oran = 1;
  let calisiyor = false, sokuldu = false, t0 = 0, cerceve = 0;
  const kareSure: number[] = [];
  let sonKare = 0;
  let sozDoku: { doku: WebGLTexture; oran: number } | null = null;

  function boyutla() {
    const g = Math.max(1, Math.round(gen * dpr)), y = Math.max(1, Math.round(yuk * dpr));
    if (g === K0.tuval.width && y === K0.tuval.height) return;
    K0.tuval.width = g; K0.tuval.height = y;
    gl!.viewport(0, 0, g, y);
  }

  const yol = K.yol, egri = K.egri;
  function kamera(pp: number) {
    return [
      yol.x * Math.pow(pp, egri.x), yol.y * Math.pow(pp, egri.y),
      yol.z * Math.pow(pp, egri.z),
      (yol.egim * Math.pow(pp, egri.egim) * Math.PI) / 180,
    ];
  }

  function ciz(zaman: number, hedef?: { fbo: WebGLFramebuffer; g: number; y: number }) {
    if (sokuldu) return;
    boyutla();
    /* `hedef`: sahne bir FBO'ya ciziliyor (metalin envmap'i icin, BIR
       KEZ). Ayni kod yolu, ayni kamera; yalniz viewport ve oran farkli. */
    if (hedef) { gl!.bindFramebuffer(gl!.FRAMEBUFFER, hedef.fbo); gl!.viewport(0, 0, hedef.g, hedef.y); }
    oran = hedef ? hedef.g / hedef.y : K0.tuval.width / K0.tuval.height;
    /* `cover`: goruntu penceresi kaynak karenin ICINDE kalmali. */
    tanVr = Math.min(tanV, tanH / oran);
    const t = (zaman - t0) / 1000;
    const [ex, ey, ez, egim] = kamera(p);
    const MVP = carp(izdusum(tanVr, oran, 0.4, 420), bakis(ex, ey, ez, egim));
    /* Isik ray boyunca yukseliyor: azimut merkeze kayarken yukseklik
       ufkun altindan cikiyor. Sahnenin rengi de bu ilerlemeyle donuyor. */
    const S = H.gunes;
    const az = S.azimut[0] + (S.azimut[1] - S.azimut[0]) * p;
    const yk = S.yukseklik[0] + (S.yukseklik[1] - S.yukseklik[0]) * p;
    const gunes = [Math.sin(az) * Math.cos(yk), Math.sin(yk), -Math.cos(az) * Math.cos(yk)];
    /* Sahne monokrom aciliyor, gun dogumu rayin ikinci yarisinda
       oturuyor; 0,88 tavani "tamamen sicak" olmayi engelliyor. */
    const q = Math.min(1, Math.max(0, (p - 0.08) / 0.80));
    const isi = q * q * (3 - 2 * q) * 0.88;

    gl!.clearColor(0.019, 0.019, 0.021, 1);
    gl!.clear(gl!.COLOR_BUFFER_BIT);
    gl!.enable(gl!.BLEND);
    gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA);
    gl!.disable(gl!.CULL_FACE);

    const ortak = (u: Record<string, WebGLUniformLocation | null>, kip: Kip) => {
      gl!.uniformMatrix4fv(u.uMVP, false, MVP);
      gl!.uniform3f(u.uGoz, ex, ey, ez);
      gl!.uniform1f(u.uIsi, isi);
      gl!.uniform1f(u.uZaman, t);
      gl!.uniform3f(u.uGunes, gunes[0], gunes[1], gunes[2]);
      gl!.uniform4f(u.uKip, kip[0], kip[1], kip[2], kip[3]);
      gl!.uniform1f(u.uSisK, 0.0090 + 0.0040 * p);
      gl!.uniform1f(u.uSisBas, 6.0);
      gl!.uniform1f(u.uNefes, H.sis_nefes);
      /* SONME ISCIDE (24 Agu). Eskiden tuvale `filter: brightness(--pr-sonuk)`
         uygulaniyordu; metal tuvalin ICINDE oldugu icin sahneyle birlikte
         sonuyordu - olculdu: govde L 111 -> 42 (0,55 carpani). Katmanlar
         burada soner, metal muaf. Yedek yolda CSS degiskeni oldugu gibi. */
      gl!.uniform1f(u.uSonuk, sonuk);
      /* Varsayilan TAM OPAK; yalniz cumle bunu asagi cekiyor. Konum
         yoksa (sis programinda `uSoluk` tanimli degil) cagri sessizce
         yok sayilir - WebGL null konumu gormezden gelir. */
      gl!.uniform1f(u.uSoluk, 1);
      /* Varsayilan: esneme yok, salinim yok. Nefes GLOBAL. */
      gl!.uniform3f(u.uDalga, 0, 0, 0);
      gl!.uniform1f(u.uSalinim, 0);
      gl!.uniform1f(u.uNefesIsik, H.isik_nefes || 0);
      const PE = H.nehir_esik || [0.40, 0.92];
      gl!.uniform2f(u.uParEsik, PE[0], PE[1]);
      gl!.uniform1f(u.uNefesHiz, H.isik_nefes_hiz || 0.13);
    };

    function sisCiz(i: number) {
      const s = (VERI as any).sis[i];
      /* Perde mobilde kapali olabilir (`sahne.json` -> sis[].mobil).
         Olculdu: iki perde 412x892/DPR2'de kare basina 4,26 ms ve
         p95'i 11,5 -> 30,7 ms'ye cikaran tek isti. */
      if (s.mobil === false && K0.varyant === 'mobil') return;
      gl!.useProgram(pSis.p);
      ortak(pSis.u, [0, 0.10, 0.25, 0]);
      gl!.uniform4f(pSis.u.uKutu, s.kutu[0], s.kutu[1], s.kutu[2], s.kutu[3]);
      gl!.uniform2f(pSis.u.uTan, tanH, tanV);
      gl!.uniform1f(pSis.u.uZ, uzaklik(s.d));
      gl!.uniform1f(pSis.u.uGenis, 0.14);
      gl!.uniform1f(pSis.u.uDunya, 0);
      gl!.uniform2f(pSis.u.uKaydir, 0, 0);
      gl!.uniform1f(pSis.u.uYogun, s.yogun);
      gl!.uniform1f(pSis.u.uAkis, H.sis_suruklenme);
      gl!.bindVertexArray(qVao);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      gl!.bindVertexArray(null);
    }

    function sozCiz() {
      if (!sozDoku) return;
      const SZ = (VERI as any).soz;
      /* CUMLE AMBLEM GELIRKEN SONUYOR. Sebep olculdu (23 Agu, dort
         genislik): amblemin cizilen sinir kutusu ekranda 599-998 px,
         cumle ise ORTALANMIS ve 248-1064 px - amblem cumleyi %66 ile
         %100 arasinda ortuyor ve bunu kacinacak bir yerlesim YOK
         (yolu kaydirmak denendi, kutu her halukarda cumlenin uzerine
         geliyor). O yuzden cozum yolda degil ZAMANDA: cumle, halka
         kapanirken cekiliyor ve dolgu baslamadan gidiyor.
         Aralik `sahne.json` -> soz.sonme. */
      const sn = SZ.sonme as [number, number] | undefined;
      let soluk = 1;
      if (sn) {
        const u = Math.min(1, Math.max(0, (p - sn[0]) / (sn[1] - sn[0])));
        soluk = 1 - u * u * (3 - 2 * u);
        if (soluk <= 0.002) return;   /* sonduyse hic cizilmiyor */
      }
      const Z = uzaklik(SZ.d);
      /* Genislik EKRANIN gorunur genisligine baglaniyor (vw gibi), kare
         genisligine degil: mobilde kare yanlardan kirpiliyor, cumle o
         kirpilmis pencereye gore olculmezse tasar. */
      const yariG = tanVr * oran * Z * SZ.genislik;
      const yariY = yariG / sozDoku.oran;
      gl!.useProgram(pQuad.p);
      ortak(pQuad.u, [0, 0, 0.45, 0]);
      gl!.uniform1f(pQuad.u.uDunya, 1);
      gl!.uniform3f(pQuad.u.uMerkez, SZ.merkez[0] * tanH * Z, SZ.merkez[1] * tanV * Z, -Z);
      gl!.uniform2f(pQuad.u.uYari, yariG, yariY);
      gl!.uniform1f(pQuad.u.uGenis, 0);
      gl!.uniform1f(pQuad.u.uHam, 1);
      gl!.uniform1f(pQuad.u.uParHiz, 0);
      gl!.uniform2f(pQuad.u.uKaydir, 0, 0);
      gl!.uniform1f(pQuad.u.uSoluk, soluk);
      gl!.activeTexture(gl!.TEXTURE0);
      gl!.bindTexture(gl!.TEXTURE_2D, sozDoku.doku);
      gl!.uniform1i(pQuad.u.uDoku, 0);
      gl!.bindVertexArray(qVao);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      gl!.bindVertexArray(null);
    }

    for (const kt of V.katman as KatmanV[]) {
      const dk = dokular[kt.ad];
      if (!dk) continue;
      if (kt.tur === 'derinlik') {
        const ix = indisler[kt.ad];
        if (!ix) continue;
        gl!.useProgram(pArazi.p);
        ortak(pArazi.u, kt.kip);
        gl!.uniform4f(pArazi.u.uKutu, kt.kutu[0], kt.kutu[1], kt.kutu[2], kt.kutu[3]);
        gl!.uniform1f(pArazi.u.uHam, 0);
        gl!.uniform1f(pArazi.u.uParHiz, H.nehir_parilti);
        gl!.activeTexture(gl!.TEXTURE0);
        gl!.bindTexture(gl!.TEXTURE_2D, dk);
        gl!.uniform1i(pArazi.u.uDoku, 0);
        gl!.bindVertexArray(vao);
        gl!.bindBuffer(gl!.ELEMENT_ARRAY_BUFFER, ix.tampon);
        gl!.drawElements(gl!.TRIANGLES, ix.adet, gl!.UNSIGNED_INT, 0);
        gl!.bindVertexArray(null);
      } else {
        gl!.useProgram(pQuad.p);
        ortak(pQuad.u, kt.kip);
        gl!.uniform4f(pQuad.u.uKutu, kt.kutu[0], kt.kutu[1], kt.kutu[2], kt.kutu[3]);
        gl!.uniform2f(pQuad.u.uTan, tanH, tanV);
        gl!.uniform1f(pQuad.u.uZ, uzaklik(kt.d));
        gl!.uniform1f(pQuad.u.uGenis, kt.genis || 0);
        gl!.uniform1f(pQuad.u.uDunya, 0);
        gl!.uniform1f(pQuad.u.uHam, 0);
        gl!.uniform1f(pQuad.u.uParHiz, 0);
        /* bulut suruklenmesi — kaydirmadan bagimsiz, zamanla */
        /* IKI GOK KATMANI FARKLI HIZDA: tek hizda kaydiklarinda
           gokyuzu tek parca bir afis gibi duruyordu. */
        const kayHiz = kt.ad === 'bulut' ? H.bulut_hiz
          : kt.ad === 'gok' ? (H.gok_hiz || 0) : 0;
        gl!.uniform2f(pQuad.u.uKaydir, -t * kayHiz, 0);
        if (kt.ad === 'bulut') {
          const D = H.bulut_dalga || [0, 0, 0];
          gl!.uniform3f(pQuad.u.uDalga, D[0], D[1], D[2]);
          gl!.uniform1f(pQuad.u.uSalinim, H.bulut_salinim || 0);
        }
        gl!.activeTexture(gl!.TEXTURE0);
        gl!.bindTexture(gl!.TEXTURE_2D, dk);
        gl!.uniform1i(pQuad.u.uDoku, 0);
        gl!.bindVertexArray(qVao);
        gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
        gl!.bindVertexArray(null);
      }

      /* SIRA. Derinlik tamponu yok, ressam sirasi var.
         CUMLE ILK DENEMEDE YAN DUVARLARIN ARDINA konmustu; gercekten
         gomuluydu ama DURUSTA OKUNMUYORDU — iki sirt cumlenin bas ve
         son harflerini kesiyordu ve vadi agzinin acikligi o yukseklikte
         cumleyi almiyor. Cumle simdi duvarlarin ONUNDE, vadi tabaninin
         ARDINDA: durusta tam okunur, kamera inerken once uzak perde
         ardindan geciyor, sonra yukselen vadi tabani ve nehir onune
         giriyor, en sonda yakin sis perdesi uzerinden akiyor. */
      if (kt.ad === 'zirve') sisCiz(0);
      if (kt.ad === 'dag-sag') sozCiz();
      if (kt.ad === 'nehir') sisCiz(1);
    }
    if (hedef) {
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, null);
      gl!.viewport(0, 0, K0.tuval.width, K0.tuval.height);
      return;
    }
    /* F3: amblemin metali EN USTTE - ressam sirasinin sonu. Donusum
       ana ipten geliyor (halka.ts hesapliyor, `p` mesajina ekleniyor);
       formul iki yere kopyalanmadi. */
    if (metal && amblemD) metal.ciz(amblemD, t, gen, yuk, dpr);
  }

  function dongu(zaman: number) {
    if (!calisiyor || sokuldu) return;
    if (!t0) t0 = zaman;
    /* ONGORU: cizilen kare, ilerlemenin CIZIM ANINDAKI degerini
       kullansin - geldigi andaki degerini degil. */
    if (tSon && pHiz) {
      const yas = performance.now() + anaFark - tSon;
      const sinir = Math.min(Math.max(yas, 0), YAS_TAVAN);
      const sonum = yas > YAS_TAVAN ? Math.max(0, 1 - (yas - YAS_TAVAN) / SONUM) : 1;
      sahneRef?.p(Math.min(1, Math.max(0, pSon + pHiz * sinir * sonum)));
    }
    /* KARE RITMI SONDASI (F3 kapisi: "mobilde kare suresi olculecek,
       metalin tam kalitede gidecegi varsayilmayacak"). ILK SURUM YANLIS
       OLCUYORDU: ciz() etrafinda performance.now() yalnizca CPU'nun komut
       GONDERME suresini verir (0,2 ms), GPU baska is parcaciginda calisir.
       Dogru olcu KARE ARALIGI: rAF damgalari arasi sure - GPU'ya bagli
       kaldiginda uzar. 90 karede bir p50/p95 ana ipe gider
       (`data-prolog-kare`). Yine de SwiftShader'da MUTLAK degil GORELI;
       gercek cihaz Enes'in telefonunda. */
    if (sonKare) kareSure.push(zaman - sonKare);
    sonKare = zaman;
    ciz(zaman);
    cerceve = kareIste(dongu);
    if (kareSure.length >= 90) {
      const d = kareSure.slice().sort((a, b) => a - b);
      (self as any).postMessage({ tip: 'kare', p50: +d[45].toFixed(2), p95: +d[85].toFixed(2), n: d.length, p });
      kareSure.length = 0;
    }
  }

  /* ---------------- kurulum: KADEMELI ----------------
     Yedi katmanin hepsini beklemek Speed Index'e 1 saniye yaziyordu
     (olculdu: taban 3.806 -> yeni 4.885). Ilk gelen katman TABAN
     PLAKA ve o tek basina fotografin tamami; ustelik p=0'da her
     katman kaynak kareye geri izdustugu icin gerisi eklendikce
     GORUNUR BIR SICRAMA OLMUYOR — sahne "once bulanik sonra net"
     degil, "once duz sonra derin" doluyor. */
  const harita = await haritaSozu;
  await agKur(harita);
  if (K0.soz) {
    sozDoku = { doku: doku(K0.soz), oran: K0.soz.width / K0.soz.height };
    K0.soz.close();
  }
  let ilkKare = false;
  await Promise.all((V.katman as KatmanV[]).map((kt, i) => katmanSozu[i].then((bm) => {
    if (sokuldu) { bm.close(); return; }
    dokular[kt.ad] = doku(bm, kt.ad === 'bulut');
    bm.close();
    if (kt.ad === 'gok') {
      ilkKare = true;
      boyutla();
      ciz(performance.now());
      (self as any).postMessage({ tip: 'hazir' });
    } else if (ilkKare && !calisiyor) {
      ciz(performance.now());
    }
  })));
  if (!ilkKare) { boyutla(); ciz(performance.now()); }

  sok = () => {
    if (sokuldu) return;
    sokuldu = true; calisiyor = false;
    kareIptal(cerceve);
    /* Dokular birakiliyor (mobilde ~40 MB, masaustunde ~96 MB). */
    metal?.sok(); metal = null;
    for (const k in dokular) gl!.deleteTexture(dokular[k]);
    if (sozDoku) gl!.deleteTexture(sozDoku.doku);
    gl!.getExtension('WEBGL_lose_context')?.loseContext();
  };

  return {
    p: (v: number) => { p = v; },
    amblem: (d: import('./metal').Durum & { on?: boolean }) => {
      amblemD = d;
      sonuk = (d as any).sonuk ?? 1;
      if ((d.on || d.metal > 0) && metalYol === 'yok') {
        metalYol = 'yukleniyor';
        import('./metal')
          .then((Mm) => Mm.kur(gl!, K0.kok, K0.varyant, qVao,
            (fbo, g, y) => ciz(performance.now(), { fbo, g, y })))
          .then((m) => {
            if (sokuldu) { m.sok(); return; }
            metal = m; metalYol = 'var';
            (self as any).postMessage({ tip: 'metal', olcum: m.olcum });
          })
          .catch((h) => {
            metalYol = 'hata';
            (self as any).postMessage({ tip: 'metal', hata: String(h) });
          });
      }
    },
    boyut: (g: number, y: number, d: number) => { gen = g; yuk = y; dpr = d; },
    oynat: (a: boolean) => {
      if (sokuldu || a === calisiyor) return;
      calisiyor = a;
      if (a) cerceve = kareIste(dongu); else kareIptal(cerceve);
    },
  };
}

let sahne: Awaited<ReturnType<typeof kur>> | null = null;
let sahneRef: { p: (v: number) => void } | null = null;

self.onmessage = async (e: MessageEvent) => {
  const m = e.data;
  if (m.tip === 'kur') {
    try {
      if ((m as any).anaKok) anaFark = performance.timeOrigin - (m as any).anaKok;
      sahne = await kur(m as Kurulum);
      sahneRef = sahne;
    } catch (hata) {
      (self as any).postMessage({ tip: 'hata', mesaj: String(hata) });
    }
  } else if (!sahne) {
    return;
  } else if (m.tip === 'p') {
    /* Hiz: ilerleme birimi / ms. 120 ms'den uzun arali iki ornek
       arasinda hiz kestirilmez - o bir kaydirma degil, yeni bir
       baslangictir. */
    if (m.t) {
      const dt = m.t - tSon;
      if (m.dur) pHiz = 0;
      else if (tSon && dt > 0 && dt < 120) pHiz = pHiz * 0.6 + ((m.v - pSon) / dt) * 0.4;
      else pHiz = 0;
      pSon = m.v; tSon = m.t;
    }
    sahne.p(m.v);
    if (m.a) sahne.amblem(m.a);
  } else if (m.tip === 'boyut') {
    sahne.boyut(m.g, m.y, m.d);
  } else if (m.tip === 'oynat') {
    sahne.oynat(m.a);
  } else if (m.tip === 'sok') {
    sok?.();
    sahne = null;
  }
};
