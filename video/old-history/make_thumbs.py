"""Dramatic 9:16 thumbnails from the real archive photos (no AI faces).

python make_thumbs.py            -> old-history/ready/<slug>/thumbnail.jpg for every clip
"""
import os, sys
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
W, H = 1080, 1920
IMPACT = "C:/Windows/Fonts/impact.ttf"
YELLOW = (255, 197, 49)

# slug: (photo, focus_y 0..1, zoom, lines, highlight line index, tint rgb, kicker)
CLIPS = {
    "yamaguchi":   ("yamaguchi-photo.jpg", 0.30, 1.0, ["SURVIVED", "BOTH", "ATOMIC BOMBS"], 1, (255, 120, 40), "TRUE STORY"),
    "hayha":       ("hayha-1942.jpg", 0.30, 1.0, ["500 KILLS?", "THE WHITE", "DEATH"], 1, (90, 160, 255), "DEADLIEST SNIPER"),
    "jessop":      ("violet-vad.jpg", 0.22, 1.1, ["SHE SURVIVED", "TITANIC", "AND 2 MORE"], 1, (60, 140, 255), "TRUE STORY"),
    "benavidez":   ("benavidez-portrait.jpg", 0.25, 1.1, ["37 WOUNDS", "BODY BAG", "STILL ALIVE"], 1, (255, 60, 40), "VIETNAM 1968"),
    "pilecki":     ("pilecki-portrait.jpg", 0.22, 1.1, ["HE WALKED INTO", "AUSCHWITZ", "ON PURPOSE"], 1, (220, 40, 40), "TRUE STORY"),
    "wake":        ("wake-1945.jpg", 0.25, 1.1, ["THE GESTAPO", "COULDN'T", "CATCH HER"], 1, (230, 50, 60), "WW2 SPY"),
    "yang":        ("pow-crop.jpg", 0.28, 1.0, ["3 ARMIES", "1 SOLDIER", "REAL?"], 0, (255, 140, 40), "REAL OR LEGEND?"),
    "poonlim":     ("poon-raft.jpg", 0.45, 1.25, ["133 DAYS", "ALONE", "AT SEA"], 0, (40, 170, 255), "TRUE STORY"),
    "alcatraz":    ("john-anglin.jpg", 0.30, 1.0, ["ESCAPED", "ALCATRAZ", "NEVER FOUND"], 1, (60, 200, 255), "UNSOLVED"),
    "lucas":       ("lucas-portrait.jpg", 0.22, 1.1, ["AGE 17", "2 GRENADES", "HE LIVED"], 1, (255, 90, 30), "IWO JIMA 1945"),
    "cooper":      ("sketch.jpg", 0.30, 1.05, ["$200,000", "ONE JUMP", "VANISHED"], 0, (40, 200, 120), "UNSOLVED"),
    "cartonwiart": ("orpen.jpg", 0.18, 1.2, ["LOST AN EYE", "& A HAND", "\"I ENJOYED IT\""], 2, (255, 70, 40), "UNKILLABLE"),
    "torni":       ("torni-1944.jpg", 0.25, 1.1, ["3 ARMIES", "1 MAN", "IT'S TRUE"], 0, (120, 170, 255), "FINLAND · SS · USA"),
    "rasputin":    ("rasputin-portrait.jpg", 0.22, 1.1, ["POISONED", "SHOT", "DROWNED?"], 2, (80, 160, 255), "LEGEND OR LIE?"),
    "sam":         ("oscar.jpg", 0.33, 1.1, ["3 SHIPS SANK", "THE CAT", "DIDN'T"], 1, (60, 150, 255), "WW2 LEGEND"),
    "shackleton":  ("endurance-glow.jpg", 0.40, 1.0, ["28 MEN", "TRAPPED IN ICE", "ALL LIVED"], 2, (120, 190, 255), "TRUE STORY"),
}


def cover_crop(img, focus_y, zoom):
    s = max(W / img.width, H / img.height) * zoom
    img = img.resize((round(img.width * s), round(img.height * s)), Image.LANCZOS)
    x = (img.width - W) // 2
    y = int(min(max(focus_y * img.height - H * 0.30, 0), img.height - H))
    return img.crop((x, y, x + W, y + H))


def grade(img, tint):
    g = ImageOps.autocontrast(img.convert("RGB"), cutoff=1)
    g = ImageEnhance.Contrast(g).enhance(1.6)
    g = ImageEnhance.Color(g).enhance(0.55)
    g = g.filter(ImageFilter.UnsharpMask(radius=3, percent=140, threshold=2))
    # split tone: tint the shadows with the accent colour
    lum = ImageOps.grayscale(g)
    shadow = ImageOps.invert(lum).point(lambda v: int(v * 0.35))
    g = Image.composite(Image.new("RGB", g.size, tint), g, shadow)
    # vignette + bottom fade for the text
    mask = Image.new("L", g.size, 0)
    d = ImageDraw.Draw(mask)
    for i in range(60):
        d.ellipse((-W * 0.35 + i * 9, -H * 0.15 + i * 13, W * 1.35 - i * 9, H * 1.05 - i * 13), fill=int(i * 4.2))
    mask = mask.filter(ImageFilter.GaussianBlur(80))
    g = Image.composite(g, Image.new("RGB", g.size, (0, 0, 0)), mask)
    fade = Image.new("L", g.size, 0)
    fd = ImageDraw.Draw(fade)
    for y in range(int(H * 0.45), H):
        fd.line((0, y, W, y), fill=int(235 * ((y - H * 0.45) / (H * 0.55)) ** 1.3))
    return Image.composite(Image.new("RGB", g.size, (0, 0, 0)), g, fade)


def fit_font(text, max_w, start):
    size = start
    while size > 60:
        f = ImageFont.truetype(IMPACT, size)
        if f.getlength(text) <= max_w:
            return f
        size -= 6
    return ImageFont.truetype(IMPACT, size)


def draw_text(img, lines, hi, tint, kicker):
    d = ImageDraw.Draw(img)
    fonts = [fit_font(t, W - 90, 290 if i == hi else 215) for i, t in enumerate(lines)]
    heights = [f.getbbox(t)[3] - f.getbbox(t)[1] for f, t in zip(fonts, lines)]
    gap = 22
    y = H - 170 - sum(heights) - gap * (len(lines) - 1)
    # kicker pill
    kf = ImageFont.truetype(IMPACT, 54)
    kw = kf.getlength(kicker)
    ky = y - 110
    d.rounded_rectangle(((W - kw) / 2 - 30, ky, (W + kw) / 2 + 30, ky + 78), radius=14, fill=tint)
    d.text((W / 2, ky + 39), kicker, font=kf, fill=(0, 0, 0), anchor="mm")
    for i, (t, f, h) in enumerate(zip(lines, fonts, heights)):
        colour = YELLOW if i == hi else (255, 255, 255)
        top = f.getbbox(t)[1]
        d.text((W / 2, y - top), t, font=f, fill=colour, anchor="ma", stroke_width=12 if i == hi else 9, stroke_fill=(0, 0, 0))
        y += h + gap
    # accent bar at the very bottom
    d.rectangle((0, H - 22, W, H), fill=tint)


def main(only=None):
    for slug, (photo, fy, zoom, lines, hi, tint, kicker) in CLIPS.items():
        if only and slug not in only:
            continue
        src = os.path.join(HERE, slug, "assets", photo)
        out_dir = os.path.join(HERE, "thumbnails")
        if not os.path.exists(src) or False:
            print("skip", slug)
            continue
        img = grade(cover_crop(Image.open(src), fy, zoom), tint)
        draw_text(img, lines, hi, tint, kicker)
        os.makedirs(out_dir, exist_ok=True); out = os.path.join(out_dir, slug + ".jpg")
        img.save(out, quality=93)
        print("ok", slug, out)




def from_script(clip_dir, out_path):
    """Thumbnail for any clip from its script.json: "thumb": {image, focus, zoom, lines, hi, tint, kicker};
    falls back to the cover (image, kicker, lines with *word* as the highlighted line)."""
    import json
    s = json.load(open(os.path.join(clip_dir, "script.json"), encoding="utf8"))
    t = s.get("thumb") or {}
    cov = s.get("cover", {})
    lines = t.get("lines") or [l.replace("*", "") for l in cov.get("lines", []) if l]
    hi = t.get("hi")
    if hi is None:
        hi = next((i for i, l in enumerate(cov.get("lines", [])) if "*" in l), 1 if len(lines) > 1 else 0)
    fy = t.get("focus", 0.3)
    img = grade(cover_crop(Image.open(os.path.join(clip_dir, "assets", t.get("image") or cov["image"])), fy, t.get("zoom", 1.0)), tuple(t.get("tint", (245, 183, 59))))
    draw_text(img, lines, hi, tuple(t.get("tint", (245, 183, 59))), t.get("kicker") or cov.get("kicker", "TRUE STORY"))
    img.save(out_path, quality=93)
    return out_path


if __name__ == "__main__":
    # python make_thumbs.py --clip <clip dir> <out.jpg>   (used by tools/make.mjs)
    # python make_thumbs.py [slug ...]                    (the 16 hand-tuned clips above)
    if len(sys.argv) > 1 and sys.argv[1] == "--clip":
        print(from_script(sys.argv[2], sys.argv[3]))
    else:
        main(sys.argv[1:] or None)
