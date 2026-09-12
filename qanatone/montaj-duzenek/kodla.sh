#!/bin/sh
# mp4 varyantlari — h264_nvenc (bu makinede tek calisan H.264 kodlayici)
set -e
S="$(cd "$(dirname "$0")" && pwd)"
FF="/c/Users/Monster/AppData/Local/CapCut/Apps/8.5.0.3590/ffmpeg.exe"
OUT="$S/malzeme/video"
mkdir -p "$OUT"

kod() { # $1=klip $2=g $3=en $4=boy $5=qp
  k=$1; g=$2; en=$3; boy=$4; qp=$5
  ad="$OUT/${k}_g${g}_${boy}p.mp4"
  "$FF" -hide_banner -loglevel error -y \
    -framerate 24 -i "$S/malzeme/usta/$k/k%04d.jpg" \
    -vf "scale=${en}:${boy}" -pix_fmt yuv420p \
    -c:v h264_nvenc -preset p5 -rc constqp -qp $qp -bf 0 -g $g -profile:v high \
    -movflags +faststart "$ad"
  printf "%-28s %8s bayt\n" "$(basename $ad)" "$(stat -c %s "$ad")"
}

for k in k1 k2; do
  for g in 1 6 12 24; do kod $k $g 1920 1080 26; done
  for g in 6 24; do kod $k $g 1280 720 26; done
done
