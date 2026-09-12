#!/bin/sh
# TEK FILM (k1+k2 bitisik) + DIKEY 9:16 KIRPMA — mobil aday
set -e
S="$(cd "$(dirname "$0")" && pwd)"
FF="/c/Users/Monster/AppData/Local/CapCut/Apps/8.5.0.3590/ffmpeg.exe"
OUT="$S/malzeme/dikey"
mkdir -p "$OUT"

# 1920x1080 kaynaktan merkez 9:16 kirpma = 608x1080 (cift sayi)
KIRP="crop=608:1080:656:0"

tek() { # $1=ad $2=g $3=en $4=boy $5=qp $6=ekfiltre
  ad="$OUT/tekfilm_$1.mp4"
  "$FF" -hide_banner -loglevel error -y \
    -framerate 24 -i "$S/malzeme/usta/k1/k%04d.jpg" \
    -framerate 24 -i "$S/malzeme/usta/k2/k%04d.jpg" \
    -filter_complex "[0:v][1:v]concat=n=2:v=1:a=0[c];[c]${KIRP},scale=$3:$4[v]" -map "[v]" \
    -pix_fmt yuv420p -c:v h264_nvenc -preset p5 -rc constqp -qp $5 -bf 0 -g $2 -profile:v high \
    -movflags +faststart "$ad"
  printf "%-30s %10s bayt\n" "$(basename $ad)" "$(stat -c %s "$ad")"
}

# dikey merdiven: yerel kirpma (608x1080), 540x960, 432x768
tek "608x1080_g6"  6  608 1080 26
tek "608x1080_g24" 24 608 1080 26
tek "540x960_g6"   6  540  960 26
tek "540x960_g24"  24 540  960 26
tek "432x768_g6"   6  432  768 26
tek "432x768_g24"  24 432  768 26

# kiyas: yatay tek film 1280x720 (masaustu/mobil yatay)
KIRP="crop=1920:1080:0:0"
tek "1280x720_g6"  6  1280 720 26
tek "1280x720_g24" 24 1280 720 26
