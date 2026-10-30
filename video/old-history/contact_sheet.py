"""python contact_sheet.py <folder of jpgs> <out.jpg> — labelled grid for reviewing assets."""
import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
src, out = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(os.path.join(src, '*.jpg')))
W, H, C = 380, 400, 6
R = (len(files) + C - 1) // C
sheet = Image.new('RGB', (W * C, H * R), 'black'); d = ImageDraw.Draw(sheet)
f = ImageFont.truetype('C:/Windows/Fonts/arial.ttf', 20)
for i, p in enumerate(files):
    im = Image.open(p).convert('RGB'); im.thumbnail((W - 10, H - 40))
    x, y = (i % C) * W, (i // C) * H
    sheet.paste(im, (x + (W - im.width) // 2, y + 5))
    d.text((x + 6, y + H - 30), os.path.basename(p), fill='yellow', font=f)
sheet.save(out, quality=85)
