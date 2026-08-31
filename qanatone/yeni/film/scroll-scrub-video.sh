#!/usr/bin/env bash
# Deterministic boundary-frame extraction and scroll-scrub encoding.
#
# QANATONE SAPMASI (27 Agu 2026, Enes karari). Kapi toplam bayt DEGIL; uc
# olcu: 4G ilk kare < 1,5 sn · savurmada sinir hazirligi 4/4 · bellek tavani.
#
# KAYNAK DEGISTI: "QANATONE SAHNELER 4K" — 39 klip Topaz ile 2160p'ye
# cikarildi, H.265/HEVC, 3840x2160, 24 fps. Sureler ve kare sayilari eski
# kaynakla birebir ayni (8,042 / 5,042 sn). Eski klasor yedek, okunmuyor.
#   NOT: en-boy orani degisti — eski 1284x716 (1,7933), yeni 3840x2160
#   (1,7778, tam 16:9). Topaz normalize etmis.
#
# HAT (bu tur, Enes 27 Agu aksam): H.265 ANA, H.264 YEDEK.
#   desktop : 1080p · mobile : 720p — kaynak 4K, olcekleme gercek.
#   Her klip IKI kodekle uretilir; tarayici `canPlayType` ile secer
#   (motor.ts). AV1 KAPANDI: tek klip olcumunde savurmada %99,2 atlama
#   (kodek-olcum.json) — decode seek'e yetisemiyor.
#   H.265 olcumu (sahne20, 1440p, ayni CRF): boyut H.264'un %70'i, PSNR
#   +1 dB, decode bosluk H.264 ile ayni bant. CRF sayilari iki kodekte de
#   AYNI tutuldu (24/26) — olculen kiyas bu ayarla yapildi, degistirmek
#   olcumu gecersiz kilar.
#   QSS_KODEK   : h264 (varsayilan) | h265. Cikti dosya adi sarmalayicida
#                 (uret.cjs) ayrisir, betik yalniz encoder'i degistirir.
#   QSS_PREVF   : encode oncesi ek filtre zinciri (env). Acilis kopyasinin
#                 `trim`i bununla gecer — tek encode, ara dosya yok.
#   QSS_CRF_ARTI: bu encode'un CRF'ine eklenecek fark. Acilis kopyasi ana
#                 hattan +4 ile uretilir; ana hat CRF'i tek yerde kalir.
# Kalan her parametre (preset, GOP, sc_threshold, unsharp, faststart,
# pix_fmt) Higgsfield'in ozgun betigindeki gibidir.
usage() {
  echo "Usage:" >&2
  echo "  $0 bounds <input.mp4> <output-prefix>" >&2
  echo "  $0 desktop <input.mp4> <output.mp4>" >&2
  echo "  $0 mobile <input.mp4> <output.mp4>" >&2
  echo "  $0 poster <input.mp4> <output.png>" >&2
  exit 2
}
require_command() { command -v "$1" >/dev/null 2>&1 || { echo "Missing required command: $1" >&2; exit 127; }; }
require_input() { [ -f "$1" ] || { echo "Input file does not exist: $1" >&2; exit 2; }; }
ensure_parent() { mkdir -p "$(dirname "$1")"; }
[ "$#" -eq 3 ] || usage
require_command ffmpeg
action=$1; input=$2; output=$3
# QSS_PREVF: encode oncesi ek filtre (orn. sahne1 kadraj duzeltmesi).
# Bos ise zincire hicbir sey eklenmez — obur 38 klip icin yol degismez.
prevf() { [ -n "${QSS_PREVF:-}" ] && printf '%s,' "$QSS_PREVF"; }
# QSS_CRF_ARTI: bu encode'un CRF'ine eklenecek fark. ACILIS KOPYASI icin var
# (Enes, 27 Agu): acilis ana hattan 4 birim daha yuksek CRF ile uretilir —
# amaci ilk kareyi erken boyamak, tam kopyaya gecis zaten AYNI kareye
# sarilarak yapildigi icin kalite farki gorunmez. Ana hat CRF'i tek yerde
# (asagida) kalir; acilis onu izler, ayri sayi tutulmaz.
arti() { echo $(( $1 + ${QSS_CRF_ARTI:-0} )); }
# kodek(): CRF ve GOP alir, encoder argumanlarini basar. H.265'te GOP
# x265-params icinden verilir (libx265 -g'yi okur ama keyint'i kendi
# ayari ezer); scenecut=0 = H.264'teki sc_threshold 0. hvc1 etiketi
# Safari/Chrome'un MP4 icinde HEVC'yi tanimasi icin sart.
kodek() {
  case "${QSS_KODEK:-h264}" in
    h265) printf '%s' "-c:v libx265 -preset fast -crf $(arti $1) -pix_fmt yuv420p -x265-params keyint=$2:min-keyint=$2:scenecut=0:log-level=error -tag:v hvc1" ;;
    *)    printf '%s' "-c:v libx264 -preset slow -crf $(arti $1) -pix_fmt yuv420p -g $2 -keyint_min $2 -sc_threshold 0" ;;
  esac
}
require_input "$input"
case "$action" in
  bounds)
    ensure_parent "$output-first.png"
    ffmpeg -v error -y -ss 0 -i "$input" -frames:v 1 -q:v 2 "$output-first.png"
    ffmpeg -v error -y -i "$input" -vf reverse -frames:v 1 -q:v 2 "$output-last.png"
    ;;
  desktop)
    ensure_parent "$output"
    # shellcheck disable=SC2046  (kodek ciktisi bilerek bolunur)
    ffmpeg -v error -y -i "$input" -an -vf "$(prevf)scale=-2:1080:flags=lanczos,unsharp=5:5:0.8:5:5:0.0" \
      $(kodek 24 8) -movflags +faststart "$output"
    ;;
  mobile)
    ensure_parent "$output"
    # shellcheck disable=SC2046
    ffmpeg -v error -y -i "$input" -an -vf "$(prevf)scale=-2:720:flags=lanczos,unsharp=5:5:0.6:5:5:0.0" \
      $(kodek 26 4) -movflags +faststart "$output"
    ;;
  poster)
    ensure_parent "$output"
    ffmpeg -v error -y -ss 0 -i "$input" -frames:v 1 -q:v 2 "$output"
    ;;
  *) usage ;;
esac
