#!/bin/sh
cd "C:/projeler2/qanatone"
echo "=== durulan iki nokta p95 (olc-hiz, g16 set) ==="
TAVANLAR=2 TARAYICI=brave node yeni/film/olc-hiz.cjs
cp yeni/film/olc-hiz.json yeni/film/olcum-karehizi-hiz-g16.json
echo "=== yerel tam tur (takilma 0?) g16 ==="
SENARYO=tam ONBELLEK=1 TAVAN=2 HIZ=2 TARAYICI=brave HEADLESS=0 node yeni/film/olc-pencere.cjs
cp yeni/film/olc-pencere.json yeni/film/olcum-karehizi-yerel-g16.json
for i in 1 2 3; do
  echo "=== 4G immutable tam g16 #$i ==="
  SENARYO=tam AG=4g ONBELLEK=1 TAVAN=2 HIZ=2 TARAYICI=brave HEADLESS=0 node yeni/film/olc-pencere.cjs
  cp yeni/film/olc-pencere.json yeni/film/olcum-karehizi-4g-g16-$i.json
done
echo "=== KAPI PARTISI BITTI ==="
