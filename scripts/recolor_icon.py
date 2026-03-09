"""
Recolor EverProject icons:
- E + dot: neon green → warm orange #E07840
- Background (dark): → white #FFFFFF
- Border (blue): → black #000000
"""

from PIL import Image
import os

ORANGE = (224, 120, 64)   # #E07840
WHITE  = (255, 255, 255)
BLACK  = (0, 0, 0)

def is_orange_or_green(r, g, b, a=255):
    """Match existing orange (#E07840) or original neon green."""
    if a < 128:
        return False
    # Orange: red-dominant, moderate green, low blue
    is_orange = r > 150 and g > 80 and b < 100 and r > g * 1.3 and r > b * 2
    # Green fallback (original icons)
    is_green = g > 150 and g > r * 1.8 and g > b * 1.8
    return is_orange or is_green

def is_blue_border(r, g, b, a=255):
    # Blue-dominant, moderate brightness (the border)
    if a < 128:
        return False
    return b > 100 and b > r * 1.5 and b > g * 1.2

def is_dark_bg(r, g, b, a=255):
    # Dark pixels that are not orange/green/blue
    if a < 128:
        return False
    return r < 80 and g < 80 and b < 100

def recolor(src_path, dst_path):
    img = Image.open(src_path).convert("RGBA")
    pixels = img.load()
    w, h = img.size

    counts = {"orange": 0, "white": 0, "black": 0}
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if is_orange_or_green(r, g, b, a):
                pixels[x, y] = (*ORANGE, a)
                counts["orange"] += 1
            elif is_blue_border(r, g, b, a):
                pixels[x, y] = (*BLACK, a)
                counts["black"] += 1
            elif is_dark_bg(r, g, b, a):
                pixels[x, y] = (*WHITE, a)
                counts["white"] += 1

    img.save(dst_path)
    print(f"  {os.path.basename(src_path)}: {counts}")

icons_dir = os.path.join(os.path.dirname(__file__), "..", "public", "icons")

pairs = [
    ("icon-192.png",          "icon-192.png"),
    ("icon-512.png",          "icon-512.png"),
    ("icon-192-maskable.png", "icon-192-maskable.png"),
    ("icon-512-maskable.png", "icon-512-maskable.png"),
]

for src_name, dst_name in pairs:
    src = os.path.join(icons_dir, src_name)
    dst = os.path.join(icons_dir, dst_name)
    recolor(src, dst)

print("Done.")
