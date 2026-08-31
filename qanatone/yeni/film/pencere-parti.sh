#!/bin/sh
cd "C:/projeler2/qanatone"
echo "=== KIRMIZI: 4g no-store tam x1 ==="
SENARYO=tam AG=4g ONBELLEK=0 TAVAN=2 HIZ=2 TARAYICI=brave HEADLESS=0 node yeni/film/olc-pencere.cjs
cp yeni/film/olc-pencere.json yeni/film/olcum-pencere-kirmizi-4g.json
for i in 1 2 3; do
  echo "=== YESIL 4g immutable tam #$i ==="
  SENARYO=tam AG=4g ONBELLEK=1 TAVAN=2 HIZ=2 TARAYICI=brave HEADLESS=0 node yeni/film/olc-pencere.cjs
  cp yeni/film/olc-pencere.json yeni/film/olcum-pencere-yesil-4g-$i.json
done
for i in 1 2 3; do
  echo "=== YESIL yerel immutable tam #$i ==="
  SENARYO=tam ONBELLEK=1 TAVAN=2 HIZ=2 TARAYICI=brave HEADLESS=0 node yeni/film/olc-pencere.cjs
  cp yeni/film/olc-pencere.json yeni/film/olcum-pencere-yesil-yerel-$i.json
done
echo "=== TIPIK: ileri immutable x1 ==="
SENARYO=ileri ONBELLEK=1 TAVAN=2 HIZ=2 TARAYICI=brave HEADLESS=0 node yeni/film/olc-pencere.cjs
cp yeni/film/olc-pencere.json yeni/film/olcum-pencere-tipik.json
echo "=== PARTI BITTI ==="
