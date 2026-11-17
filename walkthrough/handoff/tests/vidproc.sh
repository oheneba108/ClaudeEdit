#!/bin/sh
# usage: vidproc.sh <video_url> <room_id> <end_frame.png> <work_dir> <site_assets_dir>
# downloads the fly-in, encodes H.264 720p (no audio, faststart), makes a 6-frame strip and checks the last frame vs the pano start view
set -e
URL=$1; ID=$2; END=$3; W=$4; A=$5
curl -sS -o "$W/fly-$ID-raw.mp4" "$URL"
ffmpeg -loglevel error -y -i "$W/fly-$ID-raw.mp4" -an -c:v libx264 -profile:v high -pix_fmt yuv420p -vf scale=1280:720 -crf 24 -preset slow -movflags +faststart "$A/fly-$ID.mp4"
for t in 0 0.6 1.2 1.8 2.4 2.95; do ffmpeg -loglevel error -y -ss $t -i "$W/fly-$ID-raw.mp4" -frames:v 1 -vf scale=480:-1 "$W/f_$t.png"; done
ffmpeg -loglevel error -y -sseof -0.05 -i "$A/fly-$ID.mp4" -frames:v 1 "$W/last-$ID.png"
python3 -I - "$W" "$ID" "$END" "$A/fly-$ID.mp4" <<'PY'
import sys, os
from PIL import Image, ImageChops, ImageStat
W, ID, END, MP4 = sys.argv[1:5]
fs = [f"{W}/f_{ID}_{t}.png".replace(f"f_{ID}_", "f_") for t in ["0","0.6","1.2","1.8","2.4","2.95"]]
fs = [f"{W}/f_{t}.png" for t in ["0","0.6","1.2","1.8","2.4","2.95"]]
ims = [Image.open(f) for f in fs]; w, h = ims[0].size
s = Image.new('RGB', (w*3, h*2))
for i, im in enumerate(ims): s.paste(im, ((i%3)*w, (i//3)*h))
s.save(f"{W}/strip-{ID}.jpg", quality=85)
a = Image.open(f"{W}/last-{ID}.png").convert('L').resize((448,256)); b = Image.open(END).convert('L').resize((448,256))
print(ID, 'mp4 %.2f MB' % (os.path.getsize(MP4)/1e6), 'last-frame mean diff %.1f/255' % ImageStat.Stat(ImageChops.difference(a,b)).mean[0])
PY
