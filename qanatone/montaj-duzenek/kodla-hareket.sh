#!/bin/sh
# ICERIK KARMASIKLIGI CARPANI — sakin (k1) ve hareketli (h1) ayni ayarla, ayni sure, ayni kare sayisi
set -e
S="$(cd "$(dirname "$0")" && pwd)"
FF="/c/Users/Monster/AppData/Local/CapCut/Apps/8.5.0.3590/ffmpeg.exe"
OUT="$S/malzeme/karsilastirma"
mkdir -p "$OUT"

kod() { # $1=set $2=g $3=en $4=boy
  ad="$OUT/$1_g$2_$4p.mp4"
  "$FF" -hide_banner -loglevel error -y -framerate 24 -i "$S/malzeme/usta/$1/k%04d.jpg" \
    -vf "scale=$3:$4" -pix_fmt yuv420p -c:v h264_nvenc -preset p5 -rc constqp -qp 26 -bf 0 -g $2 \
    -profile:v high -movflags +faststart "$ad"
  printf "%-26s %10s bayt\n" "$(basename $ad)" "$(stat -c %s "$ad")"
}

for s in k1 h1; do
  for g in 6 24; do
    kod $s $g 1920 1080
    kod $s $g 1280 720
  done
done
