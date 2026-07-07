#!/bin/zsh
# Bake live-event Seedance clips (Higgsfield seedance_2_0, mode fast, 720p,
# 7s, 9:16, image-to-video from the bundled WebP art) into the dual-format
# assets the game ships: <id>.webm (VP9, primary) + <id>.mp4 (H.264,
# fallback), both muted 720x1280 — same convention as public/alpha-promo/
# (see its README.md). Output: packages/client/public/cosmic-events/live/.
set -e
cd "$(dirname "$0")/.."

OUT_DIR="packages/client/public/cosmic-events/live"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

typeset -A SOURCES
SOURCES=(
  rogue-flyby          "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_105246_f883478a-e712-4789-94ea-33936db477fd.mp4"
  supernova-echo       "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_105313_d4a9c794-76a2-49dc-a1c9-b377e3463c9a.mp4"
  interstellar-visitor "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_105316_eec7e96a-2298-438f-aa0e-a7181f68b52c.mp4"
  aurora-storm         "https://d8j0ntlcm91z4.cloudfront.net/user_2vLjM4hkCSKSuyWNVmbRZvTdZ2u/hf_20260707_105320_fda7189b-1216-4f84-9812-b8bc3ea15306.mp4"
)

for id url in "${(@kv)SOURCES}"; do
  echo "── $id"
  raw="$TMP_DIR/$id-raw.mp4"
  curl -sS -f -o "$raw" "$url"

  # WebM / VP9, muted, capped ~1.2 Mbps
  ffmpeg -y -loglevel error -i "$raw" -an \
    -c:v libvpx-vp9 -crf 32 -b:v 1200k \
    -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" \
    -pix_fmt yuv420p -row-mt 1 \
    "$OUT_DIR/$id.webm"

  # MP4 / H.264 fallback, muted, faststart for progressive playback
  ffmpeg -y -loglevel error -i "$raw" -an \
    -c:v libx264 -preset slow -crf 24 \
    -vf "scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280" \
    -pix_fmt yuv420p -movflags +faststart \
    "$OUT_DIR/$id.mp4"

  ls -la "$OUT_DIR/$id.webm" "$OUT_DIR/$id.mp4" | awk '{print $5, $9}'
done
echo "done"
