"""把 Codex 生的溫暖風背景（dream/gen/<場景>_NN.png）對齊成真正的像素格子：
裁成 16:9 → 每格取出現最多的顏色（不混色）→ 320×180 → dream/bg2_<場景>.png。
另外輸出 dream/bg2_<場景>_soft.png：同一張圖縮小再放大的柔化版，給全螢幕時填滿四周（不拉伸原圖）。
用法：python snap_bg.py library_01 [classroom_01 ...]
"""
import sys
from collections import Counter
from pathlib import Path
from PIL import Image, ImageFilter

HERE = Path(__file__).resolve().parent
W, H = 320, 180          # 1920×1080 剛好 6 倍、1366×768 是 4 倍


def snap(name):
    src = Image.open(HERE / "dream" / "gen" / f"{name}.png").convert("RGB")
    sw, sh = src.size
    ch = round(sw * 9 / 16)                         # 裁成 16:9（上下各裁一半）
    top = (sh - ch) // 2
    src = src.crop((0, top, sw, top + ch))
    # 先收斂成 48 色，再每格投票取最多的顏色
    q = src.quantize(48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    pal = q.getpalette()[:48 * 3]
    px = q.load()
    out = Image.new("RGB", (W, H))
    o = out.load()
    cw, chh = sw / W, ch / H
    for y in range(H):
        for x in range(W):
            votes = Counter()
            for sy in range(int(y * chh + chh * .2), int((y + 1) * chh - chh * .2) + 1):
                for sx in range(int(x * cw + cw * .2), int((x + 1) * cw - cw * .2) + 1):
                    votes[px[min(sx, sw - 1), min(sy, ch - 1)]] += 1
            i = votes.most_common(1)[0][0]
            # 外框優先：細的深色線常常只佔一格的一小部分，單純投票會被底色蓋掉、線就斷成一截一截。
            # 只要格子裡有夠多（≥18%）明顯比多數色暗的顏色，就用那個暗色，讓物件邊線連在一起。
            total = sum(votes.values())
            lum = lambda k: 0.299 * pal[k * 3] + 0.587 * pal[k * 3 + 1] + 0.114 * pal[k * 3 + 2]
            dark = [k for k, c in votes.items() if c >= total * .22 and lum(k) < lum(i) - 55]
            if dark:
                i = min(dark, key=lum)
            o[x, y] = tuple(pal[i * 3:i * 3 + 3])
    scene = name.rsplit("_", 1)[0]
    out.save(HERE / "dream" / f"bg2_{scene}.png")
    out.resize((W // 4, H // 4), Image.BILINEAR).filter(ImageFilter.GaussianBlur(1)).save(HERE / "dream" / f"bg2_{scene}_soft.png")
    print(scene, out.size)


if __name__ == "__main__":
    for n in sys.argv[1:] or ["library_01"]:
        snap(n)
