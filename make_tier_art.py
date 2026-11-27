"""成績頁的通關圖（5 個星等）：把 Codex 生的圖（紫紅底，dream/gen/ui_tier<N>_01.png）去背，
疊到第二關的夜晚校園背景（dream/bg2_night.png）上，存成 1024×1024 正方形 PNG：ui/result_tier<N>.png。
用法：python make_tier_art.py
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance

HERE = Path(__file__).resolve().parent
GEN, OUT = HERE / "dream" / "gen", HERE / "ui"
SIZE = 1024


def background():
    bg = Image.open(HERE / "dream" / "bg2_night.png").convert("RGB")     # 320×180 像素圖
    w, h = bg.size
    x0 = (w - h) // 2 + 20                                               # 正方形，往右一點把月亮留在畫面裡
    sq = bg.crop((x0, 0, x0 + h, h)).resize((SIZE, SIZE), Image.NEAREST)
    return ImageEnhance.Brightness(sq).enhance(.8)                       # 稍微壓暗，人物比較突出


def cutout(path):
    """紫紅底去背：用「多紫紅」算半透明（光暈、邊緣比較柔），再把混到的紫紅色扣掉。"""
    a = np.array(Image.open(path).convert("RGB")).astype(float)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # 「多像亮紫紅底」：紫紅程度 × 亮度。純紫紅約 255；殭屍王的暗紫袍雖然偏紫但不亮（約 30），不會被去掉；
    # 光暈混到紫紅底的地方很亮，會變半透明
    k = ((r + b) / 2 - g) * np.minimum(r, b) / 255
    alpha = 1 - np.clip((k - 45) / (200 - 45), 0, 1)
    al = np.maximum(alpha, 1e-3)[..., None]
    rgb = (a - (1 - al) * np.array([255, 0, 255])) / al                  # 去掉混進來的紫紅
    rgb = np.clip(rgb, 0, 255)
    out = np.dstack([rgb, alpha * 255]).astype("uint8")
    im = Image.fromarray(out, "RGBA")
    return im.resize((SIZE, SIZE), Image.LANCZOS)


def main():
    bg = background()
    for n in range(1, 6):
        src = GEN / f"ui_tier{n}_01.png"
        if not src.exists():
            print("missing", src.name); continue
        im = bg.convert("RGBA")
        im.alpha_composite(cutout(src))
        im.convert("RGB").save(OUT / f"result_tier{n}.png", optimize=True)
        print("ok", f"result_tier{n}.png")


if __name__ == "__main__":
    main()
