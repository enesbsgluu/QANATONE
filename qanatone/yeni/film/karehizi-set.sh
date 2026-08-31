#!/bin/sh
# iki aday icin TAM masaustu seti (39 klip, uretim zinciriyle birebir)
K="C:/Users/Monster/Desktop/QANATONE SAHNELER 4K"
cd "C:/projeler2/qanatone/yeni/film"
mkdir -p karehizi/set-24g16 karehizi/set-12g8
for n in $(seq 1 39); do
  s="$K/sahne$n.mp4"
  [ -f "karehizi/set-24g16/sahne$n.mp4" ] || ffmpeg -v error -y -i "$s" -an \
    -vf "scale=-2:1080:flags=lanczos,unsharp=5:5:0.8:5:5:0.0" \
    -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -g 16 -keyint_min 16 -sc_threshold 0 \
    -movflags +faststart "karehizi/set-24g16/sahne$n.mp4"
  [ -f "karehizi/set-12g8/sahne$n.mp4" ] || ffmpeg -v error -y -i "$s" -an \
    -vf "fps=12,scale=-2:1080:flags=lanczos,unsharp=5:5:0.8:5:5:0.0" \
    -c:v libx264 -preset slow -crf 24 -pix_fmt yuv420p -g 8 -keyint_min 8 -sc_threshold 0 \
    -movflags +faststart "karehizi/set-12g8/sahne$n.mp4"
  echo "sahne$n tamam"
done
du -sb karehizi/set-24g16 karehizi/set-12g8
echo SETLER-BITTI
