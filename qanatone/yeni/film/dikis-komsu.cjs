#!/usr/bin/env node
/* DIKIS KOMSULUGU — "son kare = ilk kare" iddiasi kare KAYMASIYLA tutuyor mu?
   Her dikiste N'in son 4 karesi x (N+1)'in ilk 4 karesi PSNR matrisi;
   en iyi cift bildirilir. (Kayit duzenegi dersi: uc tanimi olcutle ayni
   olmali — dikis.cjs yalniz 192<->0 ciftini olcuyordu.) HAM klipler. */
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path'), os = require('os');
const KANON = require('../src/film/kanon.json');
const T = fs.mkdtempSync(path.join(os.tmpdir(), 'dikis-'));
const ff = (a) => { try { return execFileSync('ffmpeg', ['-v','error','-nostdin',...a], {encoding:'utf8'}); } catch (e) { return (e.stdout||'')+(e.stderr||''); } };
/* kare secimi -ss ile (girdiden SONRA: kare-hassas); select=eq(n,idx) virgul
   kacisi heredoc'ta yarilandi (bash_heredoc_ters_bolu dersi) */
const kare = (n, idx, out) => ff(['-y','-i', path.join(KANON.kaynak,`sahne${n}.mp4`), '-ss', (idx / KANON.fps).toFixed(5), '-frames:v','1', out]);
const psnr = (a,b,f) => { const o = ff(['-i',a,'-i',b,'-lavfi',`${f||'[0:v][1:v]'}psnr=stats_file=-`,'-f','null','-']); const v=Number((o.match(/psnr_avg:([\d.inf]+)/)||[])[1]); return isFinite(v)?v:99; };
const K = 4, rows = [];
for (let n = 1; n < KANON.klip.length; n++) {
  const a = KANON.klip[n-1], b = KANON.klip[n];
  const fit = (a.gen!==b.gen) ? `[0:v]scale=-2:${b.yuk},pad=${b.gen}:${b.yuk}:(ow-iw)/2:0[a];[a][1:v]` : '';
  const A = [], B = [];
  for (let k = 0; k < K; k++) { A.push(path.join(T,`a${n}_${k}.png`)); kare(n, a.kare-1-k, A[k]); B.push(path.join(T,`b${n}_${k}.png`)); kare(n+1, k, B[k]); }
  let best = { psnr: -1 };
  const mat = [];
  for (let i = 0; i < K; i++) { const r = []; for (let j = 0; j < K; j++) { const p = psnr(A[i], B[j], fit); r.push(p.toFixed(1)); if (p > best.psnr) best = { psnr: p, son: a.kare-1-i, ilk: j }; } mat.push(r.join(' ')); }
  rows.push({ dikis: `${n}→${n+1}`, en_iyi: `son-${best.son===a.kare-1?0:a.kare-1-best.son}↔ilk+${best.ilk}`, psnr: +best.psnr.toFixed(2), matris: mat });
  console.log(`${n}→${n+1}: en iyi ${rows[rows.length-1].en_iyi} PSNR ${best.psnr.toFixed(1)}  | ${mat.join(' / ')}`);
}
fs.writeFileSync(path.join(__dirname,'dikis-komsu.json'), JSON.stringify({ _:'yeni/film/dikis-komsu.cjs — ham klipler, son 4 x ilk 4 kare PSNR (dB); satir=N son kare geriye dogru, sutun=N+1 ilk kare ileri dogru', dikis: rows }, null, 1));
fs.rmSync(T, { recursive: true, force: true });
