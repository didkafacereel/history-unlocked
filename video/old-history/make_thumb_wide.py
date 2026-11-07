"""16:9 (1280x720) thumbnail for the long videos, from the real archive picture (no AI faces).

python make_thumb_wide.py --clip <clip dir> <out.jpg>      (used by tools/make-wide.mjs)

script.json "thumb": { "image", "fx", "fy" (0..1, where the picture is centred), "zoom", "lines": [2-3],
                       "hi": index of the gold line, "tint": [r,g,b], "kicker", "side": "left"|"right" }
The text sits on the `side`; the picture's subject should be on the other one.
"""
import json, os, sys
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

W, H = 1280, 720
IMPACT = "C:/Windows/Fonts/impact.ttf"
YELLOW = (255, 197, 49)


def cover_crop(img, fx, fy, zoom):
    s = max(W / img.width, H / img.height) * zoom
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    x = int(min(max(fx * img.width - W / 2, 0), img.width - W))
    y = int(min(max(fy * img.height - H / 2, 0), img.height - H))
    return img.crop((x, y, x + W, y + H))


def grade(img, tint, side):
    g = ImageOps.autocontrast(img.convert("RGB"), cutoff=1)
    g = ImageEnhance.Contrast(g).enhance(1.45)
    g = ImageEnhance.Color(g).enhance(0.7)
    g = g.filter(ImageFilter.UnsharpMask(radius=2, percent=130, threshold=2))
    lum = ImageOps.grayscale(g)
    shadow = ImageOps.invert(lum).point(lambda v: int(v * 0.30))
    g = Image.composite(Image.new("RGB", g.size, tint), g, shadow)
    # darken the side the text sits on
    fade = Image.new("L", g.size, 0)
    fd = ImageDraw.Draw(fade)
    for x in range(W):
        t = x / W if side == "left" else 1 - x / W
        fd.line((x, 0, x, H), fill=int(max(0, 235 * (1 - t / 0.62)) ** 1.0))
    g = Image.composite(Image.new("RGB", g.size, (0, 0, 0)), g, fade)
    # vignette
    vm = Image.new("L", g.size, 0)
    vd = ImageDraw.Draw(vm)
    for i in range(40):
        vd.ellipse((-W * 0.2 + i * 7, -H * 0.2 + i * 5, W * 1.2 - i * 7, H * 1.2 - i * 5), fill=int(i * 6.2))
    vm = vm.filter(ImageFilter.GaussianBlur(60))
    return Image.composite(g, Image.new("RGB", g.size, (0, 0, 0)), vm)


def fit_font(text, max_w, start):
    size = start
    while size > 50:
        f = ImageFont.truetype(IMPACT, size)
        if f.getlength(text) <= max_w:
            return f
        size -= 4
    return ImageFont.truetype(IMPACT, size)


def draw_text(img, lines, hi, tint, kicker, side):
    d = ImageDraw.Draw(img)
    box_w = 700
    x0 = 50 if side == "left" else W - 50 - box_w
    anchor = "la" if side == "left" else "ra"
    xt = x0 if side == "left" else W - 50
    fonts = [fit_font(t, box_w, 170 if i == hi else 130) for i, t in enumerate(lines)]
    heights = [f.getbbox(t)[3] - f.getbbox(t)[1] for f, t in zip(fonts, lines)]
    gap = 14
    total = sum(heights) + gap * (len(lines) - 1)
    y = (H - total) / 2 + 36
    kf = ImageFont.truetype(IMPACT, 40)
    kw = kf.getlength(kicker)
    kx = xt if side == "left" else xt - kw - 40
    ky = y - 84
    d.rounded_rectangle((kx, ky, kx + kw + 40, ky + 58), radius=10, fill=tint)
    d.text((kx + 20, ky + 29), kicker, font=kf, fill=(0, 0, 0), anchor="lm")
    for i, (t, f, h) in enumerate(zip(lines, fonts, heights)):
        colour = YELLOW if i == hi else (255, 255, 255)
        top = f.getbbox(t)[1]
        d.text((xt, y - top), t, font=f, fill=colour, anchor=anchor, stroke_width=9 if i == hi else 7, stroke_fill=(0, 0, 0))
        y += h + gap
    d.rectangle((0, H - 14, W, H), fill=tint)


def from_script(clip_dir, out_path):
    s = json.load(open(os.path.join(clip_dir, "script.json"), encoding="utf8"))
    t = s.get("thumb") or {}
    tint = tuple(t.get("tint", (245, 183, 59)))
    side = t.get("side", "left")
    name = t["image"]
    src = os.path.join(clip_dir, "assets", name if os.path.splitext(name)[1] else name + ".jpg")
    photo = Image.open(src).convert("RGB")
    if t.get("mode") == "contain":
        # the whole picture (a bust, a portrait) on the side away from the text, over a blurred copy of itself
        base = cover_crop(photo, 0.5, 0.5, 1.0).filter(ImageFilter.GaussianBlur(28))
        base = ImageEnhance.Brightness(base).enhance(0.55)
        fh = H - 24
        fw = round(photo.width * fh / photo.height)
        fg = photo.resize((fw, fh), Image.LANCZOS)
        x = W - fw - 40 if side == "left" else 40
        base.paste(fg, (x, 12))
        photo = base
        img = grade(photo, tint, side)
    else:
        img = grade(cover_crop(photo, t.get("fx", 0.5), t.get("fy", 0.5), t.get("zoom", 1.0)), tint, side)
    draw_text(img, t["lines"], t.get("hi", 1), tint, t.get("kicker", "TRUE STORY"), side)
    img.save(out_path, quality=93)
    return out_path


if __name__ == "__main__":
    if len(sys.argv) >= 4 and sys.argv[1] == "--clip":
        print(from_script(sys.argv[2], sys.argv[3]))
    else:
        print(__doc__)
