#!/usr/bin/env node
/* FILM · KADRAJ KAPISI — dikis.cjs sinir karelerini "contain" ile
   normalize edip olcuyor; SAYFA ise `object-fit: cover` kullaniyor
   (src/stil/film.css). Olcut sayfanin gercek uyumuyla ayni degilse
   hukum de gecerli degil (uc tanimi olcutle ayni olmali dersi).
   Bu betik her dikisi GERCEK viewport'ta, GERCEK cover kirpmasiyla
   yeniden olcer: iki kare ayni kutuya cover ile oturtulur, sonra PSNR.
   Ayrica her klibin cover altinda GORUNEN alan yuzdesini raporlar —
   klipler ayni en-boy oraninda degilse dikiste kadraj sicrar.
   Cikti: film/kirpma.json */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KOK = path.join(__dirname, '..');
const VARLIK = path.join(KOK, 'public', 'varlik', 'film');
const GECICI = path.join(__dirname, '.kirpma');
const KANON = JSON.parse(fs.readFileSync(path.join(KOK, 'src', 'film', 'kanon.json'), 'utf8'));
fs.mkdirSync(GECICI, { recursive: true });

/* olc.cjs ile ayni iki viewport */
const KUTU = [{ ad: 'masaustu', W: 1440, H: 900, mobil: false }, { ad: 'mobil', W: 412, H: 892, mobil: true }];

const ff = (a) => spawnSync('ffmpeg', a, { encoding: 'utf8' });

/* cover: kisa kenari doldur, tasani kirp — CSS object-fit:cover birebir */
function coverKare(klip, sonMu, W, H, cik) {
  const vf = `scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H}`;
  const a = sonMu
    ? ['-v', 'error', '-y', '-i', klip, '-vf', `reverse,${vf}`, '-frames:v', '1', cik]
    : ['-v', 'error', '-y', '-ss', '0', '-i', klip, '-vf', vf, '-frames:v', '1', cik];
  const r = ff(a);
  if (r.status !== 0) throw new Error(r.stderr);
}

function psnr(a, b) {
  const r = ff(['-v', 'info', '-i', a, '-i', b, '-lavfi', 'psnr', '-f', 'null', '-']);
  const m = (r.stderr || '').match(/average:([0-9.]+|inf)/);
  return m ? (m[1] === 'inf' ? 99 : Number(m[1])) : null;
}

const cikti = { _: 'yeni/film/kirpma.cjs — dikisler SAYFANIN gercek object-fit:cover kirpmasiyla olculdu (dikis.cjs contain kullaniyor).', olcum: new Date().toISOString(), kutu: [] };

for (const k of KUTU) {
  const ekranOran = k.W / k.H;
  /* her klibin cover altinda gorunen alan yuzdesi */
  const gorunen = KANON.klip.map((c) => {
    const o = c.gen / c.yuk;
    /* cover: fazla olan eksen kirpilir */
    const pay = o > ekranOran ? ekranOran / o : o / ekranOran;
    return { n: c.n, oran: +o.toFixed(3), gorunen_yuzde: +(pay * 100).toFixed(1) };
  });
  const oranlar = [...new Set(gorunen.map((g) => g.oran))];

  const dikis = [];
  for (let n = 1; n <= 38; n++) {
    const a = path.join(GECICI, `${k.ad}-${n}a.png`), b = path.join(GECICI, `${k.ad}-${n}b.png`);
    const hatA = k.mobil ? `sahne${n}-mobile.mp4` : `sahne${n}.mp4`;
    const hatB = k.mobil ? `sahne${n + 1}-mobile.mp4` : `sahne${n + 1}.mp4`;
    coverKare(path.join(VARLIK, hatA), true, k.W, k.H, a);
    coverKare(path.join(VARLIK, hatB), false, k.W, k.H, b);
    const p = psnr(a, b);
    const ga = gorunen[n - 1], gb = gorunen[n];
    dikis.push({ dikis: `${n}→${n + 1}`, psnr_cover: p,
      oran_a: ga.oran, oran_b: gb.oran,
      kadraj_sicramasi: ga.oran !== gb.oran,
      gorunen_a: ga.gorunen_yuzde, gorunen_b: gb.gorunen_yuzde });
    fs.rmSync(a, { force: true }); fs.rmSync(b, { force: true });
  }
  const kadrajSicrayan = dikis.filter((d) => d.kadraj_sicramasi);
  cikti.kutu.push({ ad: k.ad, W: k.W, H: k.H, ekran_orani: +ekranOran.toFixed(3),
    klip_oranlari: oranlar,
    en_dusuk_gorunen: Math.min(...gorunen.map((g) => g.gorunen_yuzde)),
    kadraj_sicrayan_dikis: kadrajSicrayan.map((d) => d.dikis),
    dikis });
  process.stderr.write(`${k.ad} bitti · kadraj sicrayan dikis: ${kadrajSicrayan.length}\n`);
}
fs.writeFileSync(path.join(__dirname, 'kirpma.json'), JSON.stringify(cikti, null, 1));
fs.rmSync(GECICI, { recursive: true, force: true });
for (const k of cikti.kutu) console.log(`${k.ad} (${k.W}x${k.H}, oran ${k.ekran_orani}): klip oranlari ${k.klip_oranlari.join(', ')} · en dusuk gorunen alan %${k.en_dusuk_gorunen} · kadraj sicrayan dikis ${k.kadraj_sicrayan_dikis.join(',') || 'yok'}`);
