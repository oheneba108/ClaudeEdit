#!/bin/sh
# usage: panoproc.sh <restyled_url> <room_id> <work_dir>
# -> <id>-r.png (download), <id>-fit.jpg, <id>-edges.jpg, <id>-seam.jpg, <id>-preview.jpg, rolled copies for seam repair
set -e
URL=$1; ID=$2; W=$3; T=$(dirname "$0")
curl -sS -o "$W/$ID-r.png" "$URL"
python3 -I "$T/panocheck.py" "$W/pano3d-$ID.png" "$W/$ID-r.png" "$W/$ID" > "$W/$ID-drift.txt"
python3 -I "$T/panoroll.py" roll "$W/$ID-fit.jpg" "$W/$ID-fit-rolled.jpg"
[ -f "$W/pano3d-$ID-rolled.jpg" ] || python3 -I "$T/panoroll.py" roll "$W/pano3d-$ID.png" "$W/pano3d-$ID-rolled.jpg"
python3 -I -c "
from PIL import Image
a=Image.open('$W/$ID-fit.jpg').resize((2016,864)); s=Image.open('$W/$ID-seam.jpg').resize((220,864))
o=Image.new('RGB',(2016+240,864),'white'); o.paste(a,(0,0)); o.paste(s,(2036,0)); o.save('$W/$ID-preview.jpg',quality=85)"
stat -c "%n %s" "$W/$ID-fit-rolled.jpg" "$W/pano3d-$ID-rolled.jpg"
