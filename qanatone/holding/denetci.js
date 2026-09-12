#!/usr/bin/env node
'use strict';
/* holding/denetci.js — bağımsız denetçi (3. savunma hattı)
   AJAN-HOLDING.md bölüm 3: "DENETÇİ ayrı bir ajan olmalı ve kendi
   departmanına bağlı olmamalı. Kendi işini denetleyen ajan denetlemiş
   olmaz." Bu modül holding/*.js OMURGA MODÜLLERİNİ İMPORT ETMEZ —
   yalnız kayit.jsonl'i ham okur, satır satır JSON.parse eder. Denetçi,
   denetlediği koda bağımlı olamaz; bu yüzden fs/path dışında hiçbir
   yerel modül gerektirmiyor.

   node holding/denetci.js [kayit-dosyasi-yolu]
   ÇIKIŞ KODU: 0 = ihlal yok · 1 = en az bir ihlal var

   Dört denetim:
   1. kararsız C ile gönderim izi — C seviyeli istek karara bağlanmamış
      ama aynı onay id'sine referans veren bir gönderim kaydı var.
   2. eksik zincir — bir gönderim kaydının taslak ve onay.verildi'si yok.
   3. maskesiz PII — kayıt satırlarındaki STRING alanlarda 11 haneli
      numara / telefon / ham e-posta deseni (sayısal alanlar taranmaz,
      jeton/para gibi büyük sayılar yanlış pozitif üretmesin diye).
   4. bütçe aşımından sonra harcama — 'butce.asildi' satırından SONRA
      aynı ajandan 'butce.harcama' satırı (gün bazlı sıfırlama burada
      ayrıştırılmıyor — literal sıra kontrolü; ihtiyaç doğarsa güne göre
      bölünebilir). */

const fs = require('fs');
const path = require('path');

const VARSAYILAN_KAYIT = path.join(__dirname, '.veri', 'kayit.jsonl');

function satirlariOku(dosyaYolu) {
  if (!fs.existsSync(dosyaYolu)) return [];
  return fs.readFileSync(dosyaYolu, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((satir, i) => {
      try { return JSON.parse(satir); }
      catch { throw new Error(`kayit.jsonl satır ${i + 1} bozuk JSON: ${satir.slice(0, 80)}`); }
    });
}

// ---- 1) kararsız C ile gönderim izi ----
function kararsizCIleGonderim(satirlar) {
  const ihlaller = [];
  const cIstekleri = satirlar.filter(s => s.tur === 'onay.beklemede' && s.seviye === 'C');
  const kararliIdler = new Set(
    satirlar.filter(s => s.tur === 'onay.verildi' || s.tur === 'onay.reddedildi').map(s => s.id)
  );
  const gonderimIzleri = satirlar.filter(s => s.tur === 'kanal.gonderildi' || s.tur === 'gonderim.yapildi');

  for (const istek of cIstekleri) {
    if (kararliIdler.has(istek.id)) continue;
    const eslesen = gonderimIzleri.find(g => g.onayId === istek.id);
    if (eslesen) {
      ihlaller.push({
        tur: 'karasiz-c-gonderim',
        ajan: istek.ajan || null,
        detay: `C seviyeli '${istek.eylem}' (onay id: ${istek.id}) için insan kararı yok ama gönderim izi var`,
      });
    }
  }
  return ihlaller;
}

// ---- 2) taslak → onay → gönderim zinciri tam mı ----
function zincirEksik(satirlar) {
  const ihlaller = [];
  const gonderimIzleri = satirlar.filter(s => s.tur === 'kanal.gonderildi' || s.tur === 'gonderim.yapildi');
  const taslaklar = new Set(
    satirlar.filter(s => typeof s.tur === 'string' && s.tur.endsWith('.taslak') && s.onayId !== undefined)
      .map(s => s.onayId)
  );
  const onaylar = new Set(satirlar.filter(s => s.tur === 'onay.verildi').map(s => s.id));

  for (const gonderim of gonderimIzleri) {
    const eksik = [];
    if (!taslaklar.has(gonderim.onayId)) eksik.push('taslak');
    if (!onaylar.has(gonderim.onayId)) eksik.push('onay');
    if (eksik.length) {
      ihlaller.push({
        tur: 'zincirsiz-gonderim',
        ajan: gonderim.ajan || null,
        detay: `gönderim (onay id: ${gonderim.onayId}) zincirde eksik: ${eksik.join(', ')}`,
      });
    }
  }
  return ihlaller;
}

// ---- 3) maskesiz PII deseni ----
const PII_KALIPLARI = [
  ['11-haneli-numara', /\b\d{11}\b/],
  ['telefon', /\b(?:\+90|0)?\s*5\d{2}[\s.-]?\d{3}[\s.-]?\d{2}[\s.-]?\d{2}\b/],
  ['ham-eposta', /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/],
];

function stringAlanlariGez(deger, yol, fn) {
  if (typeof deger === 'string') { fn(deger, yol); return; }
  if (Array.isArray(deger)) { deger.forEach((v, i) => stringAlanlariGez(v, `${yol}[${i}]`, fn)); return; }
  if (deger && typeof deger === 'object') {
    for (const [k, v] of Object.entries(deger)) stringAlanlariGez(v, yol ? `${yol}.${k}` : k, fn);
  }
}

function maskesizPii(satirlar) {
  const ihlaller = [];
  satirlar.forEach((satir, i) => {
    stringAlanlariGez(satir, '', (metin, yol) => {
      for (const [ad, kalip] of PII_KALIPLARI) {
        if (kalip.test(metin)) {
          ihlaller.push({
            tur: 'maskesiz-pii',
            ajan: satir.ajan || null,
            detay: `satır ${i + 1} (${satir.tur || '?'}), alan '${yol}': ${ad} deseni maskesiz görünüyor`,
          });
        }
      }
    });
  });
  return ihlaller;
}

// ---- 4) bütçe aşımından sonra aynı ajandan harcama ----
function asimSonrasiHarcama(satirlar) {
  const ihlaller = [];
  const ilkAsimSatiri = {};
  satirlar.forEach((satir, i) => {
    if (satir.tur === 'butce.asildi' && satir.ajan && !(satir.ajan in ilkAsimSatiri)) {
      ilkAsimSatiri[satir.ajan] = i;
    }
    if (satir.tur === 'butce.harcama' && satir.ajan && satir.ajan in ilkAsimSatiri && i > ilkAsimSatiri[satir.ajan]) {
      ihlaller.push({
        tur: 'asim-sonrasi-harcama',
        ajan: satir.ajan,
        detay: `satır ${i + 1}: bütçe aşımı bildiriminden (satır ${ilkAsimSatiri[satir.ajan] + 1}) sonra yine harcama kaydı var`,
      });
    }
  });
  return ihlaller;
}

function denetle(satirlar) {
  return [
    ...kararsizCIleGonderim(satirlar),
    ...zincirEksik(satirlar),
    ...maskesizPii(satirlar),
    ...asimSonrasiHarcama(satirlar),
  ];
}

function calistir(dosyaYolu) {
  const satirlar = satirlariOku(dosyaYolu || VARSAYILAN_KAYIT);
  const ihlaller = denetle(satirlar);

  console.log(`\nDenetçi — ${satirlar.length} kayıt satırı tarandı\n`);
  if (ihlaller.length === 0) {
    console.log('  ihlal yok.\n');
    return 0;
  }
  for (const ihlal of ihlaller) {
    console.log(`  !! [${ihlal.tur}] ${ihlal.ajan ? ihlal.ajan + ' — ' : ''}${ihlal.detay}`);
  }
  console.log(`\n  ${ihlaller.length} ihlal.\n`);
  return 1;
}

module.exports = {
  satirlariOku, denetle,
  kararsizCIleGonderim, zincirEksik, maskesizPii, asimSonrasiHarcama,
};

if (require.main === module) {
  process.exit(calistir(process.argv[2]));
}
