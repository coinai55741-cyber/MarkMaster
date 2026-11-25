"""前導故事／醒來的 GALGAME 立繪：把 Codex 生的圖（紫紅底）去背、裁切，存到 dream/vn/。
像素版（神秘同學、進夢境的主角）：縮小 → 收斂顏色 → 去半透明 → 加 1px 深色外框，存小圖，網頁用 pixelated 放大。
用法：python make_vn.py
"""
from pathlib import Path
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
GEN, OUT = HERE / "dream" / "gen", HERE / "dream" / "vn"
OUT.mkdir(parents=True, exist_ok=True)

# 輸出檔名 ← 來源圖
SRC = {
    "hero_sleepy": "ui_hero_sleepy_01.png", "hero_closed": "ui_hero_closed_01.png", "hero_open": "ui_hero_open_01.png",
    "hero_surprised": "ui_hero_surprised_01.png", "hero_laugh": "ui_hero_laugh_01.png",
    "mate_wave": "ui_classmate_design_01.png", "mate_think": "ui_mate_think_01.png",
}
PIXEL = {}   # 像素版：來源、像素高度（目前沒用到）
# 神秘同學：直接用遊戲第一關同學的像素圖（從遊戲匯出的 dream/gen/ref_mate_px_smile.png，頭身比例和畫法都一樣）
_m = Image.open(GEN / "ref_mate_px_smile.png").convert("RGBA")
_m.crop(_m.getbbox()).save(OUT / "mate_px.webp", lossless=True)


def cutout(path):
    a = np.array(Image.open(path).convert("RGBA")).astype(int)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mag = (r + b) / 2 - g
    a[..., 3] = np.where(mag > 110, 0, 255)
    e = (mag > 40) & (mag <= 110)                       # 邊緣的紫紅色偏色拉回
    a[e, 0] = np.minimum(r[e], g[e] + 60); a[e, 2] = np.minimum(b[e], g[e] + 60)
    im = Image.fromarray(a.astype("uint8"))
    return im.crop(im.getbbox())


def pixelize(im, h):
    w = round(im.width * h / im.height)
    small = im.resize((w, h), Image.BOX)
    alpha = np.array(small)[..., 3] > 128
    rgb = small.convert("RGB").quantize(28, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    a = np.dstack([np.array(rgb), np.where(alpha, 255, 0)]).astype("uint8")
    # 1px 外框：透明格只要旁邊有不透明格，就塗成深色
    pad = np.pad(alpha, 1)
    near = pad[:-2, 1:-1] | pad[2:, 1:-1] | pad[1:-1, :-2] | pad[1:-1, 2:]
    edge = near & ~alpha
    a[edge] = (34, 28, 40, 255)
    return Image.fromarray(a)


done = {}
for name, src in SRC.items():
    p = GEN / src
    if not p.exists():
        print("skip", name, "(", src, "not found )"); continue
    im = cutout(p)
    im.thumbnail((900, 1300), Image.LANCZOS)
    im.save(OUT / f"{name}.webp", quality=92, method=6)
    done[name] = im
    print(name, im.size)
for name, (src, h) in PIXEL.items():
    if src in done:
        px = pixelize(done[src], h)
        px.save(OUT / f"{name}.webp", lossless=True)
        print(name, px.size)

# 進夢境的主角（像素、大頭 Q 版）：Codex 照同學像素圖的比例畫的（ui_hero_px_chibi_01），縮成跟神秘同學一樣高（198px）
_h = cutout(GEN / "ui_hero_px_chibi_01.png")
_mh = _m.crop(_m.getbbox()).height
_w = round(_h.width * _mh / _h.height)
_small = _h.resize((_w, _mh), Image.BOX)
_alpha = np.array(_small)[..., 3] > 128
_rgb = _small.convert("RGB").quantize(32, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
_px = np.dstack([np.array(_rgb), np.where(_alpha, 255, 0)]).astype("uint8")
# 嘴巴改成跟神秘同學一樣的粉紅色（嘴巴在第 82–91 行、第 50–59 欄）：裡面 #E0607A，外框深粉紅
for _y in range(82, 92):
    for _x in range(50, 60):
        r_, g_, b_, a_ = (int(v) for v in _px[_y, _x])
        if not a_: continue
        if r_ + g_ + b_ < 300: _px[_y, _x, :3] = (150, 50, 72)
        elif not (r_ > 200 and g_ > 150): _px[_y, _x, :3] = (224, 96, 122)
Image.fromarray(_px).save(OUT / "hero_surprised_px.webp", lossless=True)
print("hero_surprised_px", (_w, _mh))
