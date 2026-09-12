#!/bin/sh
# dist'e aday setini takar / geri alir (dist yalniz olcum-gorsel-huküm icin
# kirletilir; 'geri' asil klipleri public'ten kopyalar, build de duzeltir).
# kullanim: bash karehizi-tak.sh 24g16 | 12g8 | geri
cd "C:/projeler2/qanatone"
D=dist/yeni/varlik/film
case "$1" in
  24g16|12g8) cp yeni/film/karehizi/set-$1/sahne*.mp4 "$D/" && echo "takildi: $1 (12g8 icin sayfa ?fps=12 ile gezilir)";;
  geri) cp yeni/public/varlik/film/sahne*.mp4 "$D/" 2>/dev/null; ls yeni/public/varlik/film/sahne1.mp4 >/dev/null && echo "geri alindi";;
  *) echo "kullanim: 24g16 | 12g8 | geri"; exit 2;;
esac
