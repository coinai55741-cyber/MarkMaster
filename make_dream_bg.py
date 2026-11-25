"""第一關（夢境）的 7 個場景背景：平面像素圖，原尺寸 120×74，遊戲裡用整數倍放大。
道具（書櫃、桌子、凳子、盆栽）在 dream/props/，是方塊風模型的正面圖。
每張圖右邊 x≈80~106、地面 y≈72 留給說話的同學站。
用法：python make_dream_bg.py   → 輸出 dream/bg_<場景>.png
"""
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).parent
OUT = HERE / "dream"
PROPS = OUT / "props"
W, H = 120, 74
INK = "#221c28"


def new(color):
    im = Image.new("RGBA", (W, H), color)
    return im, ImageDraw.Draw(im)


def prop(name):
    return Image.open(PROPS / f"{name}.png").convert("RGBA")


def paste(bg, spr, x, bottom):
    bg.alpha_composite(spr, (int(x), int(bottom - spr.height)))


def box(d, x0, y0, x1, y1, fill, line=INK):
    d.rectangle((x0, y0, x1, y1), fill=line)
    d.rectangle((x0 + 1, y0 + 1, x1 - 1, y1 - 1), fill=fill)


def stripes(d, y0, y1, a, b, w=6):
    for x in range(W):
        d.line((x, y0, x, y1), a if (x // w) % 2 else b)


def tiles(d, y0, a, b, size=6):
    for y in range(y0, H):
        for x in range(W):
            d.point((x, y), a if ((x // size) + ((y - y0) // size)) % 2 else b)


def planks(d, y0):
    for y in range(y0, H):
        for x in range(W):
            c = "#b07c4a" if (y - y0) % 4 == 3 else ["#d7a46a", "#c9935b", "#e2b37a"][((x + ((y - y0) // 4) * 7) // 12) % 3]
            d.point((x, y), c)


def window(d, x0, y0, x1, y1, sky="#bfe3ff", frame="#5a3a2e"):
    d.rectangle((x0, y0, x1, y1), frame)
    d.rectangle((x0 + 2, y0 + 2, x1 - 2, y1 - 2), sky)
    mx, my = (x0 + x1) // 2, (y0 + y1) // 2
    d.rectangle((mx, y0 + 2, mx + 1, y1 - 2), frame); d.rectangle((x0 + 2, my, x1 - 2, my + 1), frame)
    d.ellipse((x0 + 4, y0 + 4, x0 + 12, y0 + 8), "#ffffff")


def classroom():
    im, d = new("#f3ead6")
    d.rectangle((0, 40, W, 51), "#d9c7a0"); d.rectangle((0, 49, W, 51), "#b99d70")     # 護牆板
    tiles(d, 52, "#c3ccb8", "#b4bea8")
    d.rectangle((8, 7, 62, 34), "#8a5a3c"); d.rectangle((10, 9, 60, 32), "#2f5e4a")    # 黑板
    for x0, y0, x1 in ((14, 14, 30), (14, 19, 40), (14, 24, 26), (44, 14, 56)):
        d.line((x0, y0, x1, y0), "#e9f3ea")
    d.rectangle((10, 33, 60, 34), "#a87a50"); d.rectangle((20, 33, 23, 33), "#ffffff")  # 粉筆槽
    d.ellipse((68, 8, 78, 18), INK); d.ellipse((69, 9, 77, 17), "#ffffff")              # 時鐘
    d.line((73, 13, 73, 10), INK); d.line((73, 13, 75, 13), INK)
    window(d, 84, 8, 112, 32)
    T, S = prop("table"), prop("stool")
    paste(im, T, 6, 66); paste(im, T, 36, 66)
    paste(im, S, 12, 73); paste(im, S, 42, 73)
    return im


def corridor():
    im, d = new("#ece6f6")
    d.rectangle((0, 38, W, 51), "#c9bfe0"); d.rectangle((0, 50, W, 51), "#a99cc8")
    for x in range(4, W - 10, 24):                                                    # 一排窗戶
        window(d, x, 6, x + 16, 20, frame="#6a5a8a")
    for i, x in enumerate(range(4, 58, 6)):                                           # 置物櫃
        c = ["#5e8fc8", "#4f7db4"][i % 2]
        box(d, x, 26, x + 6, 51, c); d.rectangle((x + 4, 37, x + 4, 39), "#dfe7f3")
    box(d, 66, 22, 82, 51, "#b5825a"); d.rectangle((69, 26, 79, 32), "#bfe3ff")       # 教室門
    d.rectangle((79, 38, 80, 39), "#f2c14e"); box(d, 66, 15, 82, 20, "#f7f3e8")        # 門牌（空白）
    tiles(d, 52, "#dcdce8", "#cacadb", 5)
    d.rectangle((60, 66, 66, 72), INK); d.rectangle((61, 67, 65, 72), "#4f8fd0")      # 水桶和拖把
    d.line((64, 52, 66, 66), "#8a5a3c"); d.line((65, 52, 67, 66), "#8a5a3c")
    return im


def library():
    return Image.open(PROPS / "_library_src.png").convert("RGBA")


def nurse():
    im, d = new("#eef6fb")
    d.rectangle((0, 44, W, 51), "#d7e9f1")
    tiles(d, 52, "#d2e6ee", "#c3dce6")
    box(d, 18, 9, 30, 21, "#ffffff"); d.rectangle((23, 11, 25, 19), "#d33a3a"); d.rectangle((20, 14, 28, 16), "#d33a3a")  # 紅十字
    d.rectangle((4, 4, 62, 5), "#9aa3b8")                                              # 簾子軌道
    for x in range(48, 62, 3):                                                         # 淡綠簾子
        d.rectangle((x, 6, x + 2, 50), "#bfe6cf" if (x // 3) % 2 else "#a9d9bd")
    box(d, 4, 44, 46, 60, "#e3e7ef"); d.rectangle((5, 45, 45, 50), "#ffffff")          # 床
    d.rectangle((5, 51, 45, 59), "#8fb5e6"); box(d, 6, 41, 16, 47, "#ffffff")          # 被子、枕頭
    d.rectangle((6, 60, 7, 66), INK); d.rectangle((43, 60, 44, 66), INK)
    box(d, 64, 20, 80, 51, "#ffffff"); d.rectangle((66, 22, 78, 34), "#d8eef7")        # 藥櫃
    for i, c in enumerate(("#e0607a", "#f2c14e", "#6fb36a", "#5e8fc8")):
        d.rectangle((67 + i * 3, 28, 68 + i * 3, 33), c)
    d.line((65, 35, 79, 35), "#9aa3b8")
    paste(im, prop("plant"), 104, 56)
    return im


def playground():
    im, d = new("#bfe3ff")
    d.rectangle((0, 0, W, 12), "#a9d8ff")
    for cx, cy in ((20, 10), (70, 7), (100, 14)):
        d.ellipse((cx - 7, cy - 3, cx + 7, cy + 3), "#ffffff")
    for x in range(0, W, 8):                                                           # 遠處的樹
        d.ellipse((x - 2, 26, x + 9, 38), "#5e9a4e")
    d.rectangle((0, 33, W, 39), "#5e9a4e")
    d.rectangle((0, 40, W, 53), "#d9774a")                                             # 跑道
    for y in (43, 47, 51):
        d.line((0, y, W, y), "#f7efe6")
    for y in range(54, H):                                                             # 草地
        for x in range(W):
            d.point((x, y), "#7cc46a" if ((x + y) // 6) % 2 else "#6db55b")
    d.rectangle((10, 12, 11, 60), "#8a8fa6")                                           # 籃球架
    box(d, 4, 10, 18, 20, "#ffffff"); d.rectangle((9, 21, 14, 22), "#d33a3a")
    for i, x in enumerate(range(24, 76, 4)):                                           # 三角旗
        d.polygon([(x, 6), (x + 3, 6), (x + 1, 10)], ["#e0607a", "#f2c14e", "#5e8fc8", "#6fb36a"][i % 4])
    d.line((22, 6, 78, 6), INK)
    return im


def auditorium():
    im, d = new("#4a3a6a")
    for i, x in enumerate((30, 58, 86)):                                               # 聚光燈的光
        d.polygon([(x, 0), (x + 4, 0), (x + 16, 44), (x - 12, 44)], "#5e4d80")
    box(d, 36, 6, 84, 13, "#f2c14e")                                                   # 橫幅（空白）
    d.rectangle((0, 42, W, 51), "#c9935b"); d.rectangle((0, 42, W, 43), "#e2b37a")     # 舞台
    d.rectangle((0, 49, W, 51), "#8a5a3c")
    for side in (0, 1):                                                                # 紅布幕
        x0 = 0 if side == 0 else 100
        for x in range(x0, x0 + 20, 3):
            d.rectangle((x, 0, x + 2, 50), "#c2413b" if (x // 3) % 2 else "#a8323a")
    d.rectangle((0, 0, W, 4), "#a8323a")
    planks(d, 52)
    S = prop("stool")
    for x in (8, 22, 36, 50, 64):
        paste(im, S, x, 73)
    return im


def school_gate():
    im, d = new("#cfe8ff")
    for cx, cy in ((26, 8), (88, 6)):
        d.ellipse((cx - 8, cy - 3, cx + 8, cy + 3), "#ffffff")
    box(d, 24, 16, 96, 44, "#f3ead6")                                                  # 遠處的校舍
    for x in range(28, 94, 10):
        d.rectangle((x, 20, x + 6, 26), "#9cc8e8"); d.rectangle((x, 32, x + 6, 38), "#9cc8e8")
    d.rectangle((0, 44, W, 51), "#c8c2b4")
    for y in range(44, 52, 2):                                                         # 圍牆
        d.line((0, y, W, y), "#b7b0a0")
    for x0 in (6, 54):                                                                 # 校門柱子
        box(d, x0, 20, x0 + 10, 52, "#9e9a92")
        for y in range(23, 52, 4):
            d.line((x0 + 1, y, x0 + 9, y), "#8c887f")
        box(d, x0 - 1, 17, x0 + 11, 20, "#7d7970")
    for x in range(17, 54, 4):                                                         # 拉門
        d.rectangle((x, 30, x + 1, 51), "#5a5a66")
    d.line((17, 30, 53, 30), "#5a5a66")
    d.rectangle((0, 52, W, H), "#a8a8b4")                                              # 路面
    d.rectangle((0, 52, W, 55), "#c9c9d2")
    for x in range(0, W, 12):
        d.rectangle((x, 63, x + 5, 64), "#e6e6ee")
    d.rectangle((110, 26, 112, 52), "#7a5236")                                         # 樹
    d.ellipse((98, 8, 120, 32), "#5e9a4e"); d.ellipse((102, 10, 114, 20), "#7cc46a")
    return im


SCENES = {"classroom": classroom, "corridor": corridor, "library": library, "nurse": nurse,
          "playground": playground, "auditorium": auditorium, "gate": school_gate}

if __name__ == "__main__":
    for name, fn in SCENES.items():
        im = fn()
        assert im.size == (W, H), (name, im.size)
        im.save(OUT / f"bg_{name}.png")
        print(name, im.size)
