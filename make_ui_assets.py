"""產生介面素材：
1. ui/icons.svg：把 ui/icons/*.svg（pixelarticons，MIT）合成一個 <symbol> sprite，頁面用 <svg><use href="ui/icons.svg#名稱"> 引用、可用 CSS color 改色。
2. ui/talisman.svg、ui/talisman_gold.svg：像素風符紙（原創）。16×32 格，一格一個 <rect>，放大後邊緣銳利。
用法：python make_ui_assets.py
"""
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
UI = HERE / "ui"


def sprite():
    out = ['<svg xmlns="http://www.w3.org/2000/svg" style="display:none">',
           '<!-- icons: pixelarticons by halfmage (MIT), see ui/icons/LICENSE-pixelarticons.txt -->']
    for f in sorted((UI / "icons").glob("*.svg")):
        body = re.search(r"<svg[^>]*>(.*)</svg>", f.read_text(encoding="utf-8"), re.S).group(1).strip()
        out.append(f'<symbol id="{f.stem}" viewBox="0 0 24 24" fill="currentColor">{body}</symbol>')
    out.append("</svg>")
    (UI / "icons.svg").write_text("\n".join(out), encoding="utf-8")


# 符紙：每列 16 個字元。. 透明  o 外框  p 紙  h 亮面  s 暗面  r 紅  d 深紅  g 金點
_R = lambda inner: ".oh" + inner + "so."          # 中間 10 格
TALISMAN = [
    "................",
    ".oooooooooooooo.",
    _R("pppppppppp"),
    ".orrrrrrrrrrrro.",
    _R("pppppppppp"),
    _R("ppdddddppp"),
    _R("pdrrrrrdpp"),
    _R("drrhprrrdp"),
    _R("drphhprrdp"),
    _R("drrprrrrdp"),
    _R("pdrrrrrdpp"),
    _R("ppdddddppp"),
    _R("pppppppgpp"),
    _R("ppprrrrppp"),
    _R("pppppprppp"),
    _R("ppprrrrrpp"),
    _R("pppppprppp"),
    _R("pppprrrppg"),
    _R("ppprrprrpp"),
    _R("pppppprppp"),
    _R("ppprrrrrpp"),
    _R("pgpppprppp"),
    _R("pppprrpppp"),
    _R("ppprrppppp"),
    _R("pprrprrppp"),
    _R("ppppppprpp"),
    _R("pppppppppp"),
    ".orrrrrrrrrrrro.",
    _R("pppppppppp"),
    ".osspsppspsppso.",
    "..o.oo.o.oo.oo..",
    "................",
]
assert all(len(r) == 16 for r in TALISMAN), [len(r) for r in TALISMAN]
PAL = {
    "plain": {"o": "#6b3a1e", "p": "#f3d36b", "h": "#fbe8a6", "s": "#d9ad45", "r": "#c0392b", "d": "#8e1f1f", "g": "#e0a83a"},
    "gold":  {"o": "#7a4a12", "p": "#ffd84d", "h": "#fff3b0", "s": "#e8b52a", "r": "#c0392b", "d": "#8e1f1f", "g": "#fff6d0"},
}


def talisman(name, pal):
    rows = [r.ljust(16, ".")[:16] for r in TALISMAN]
    rects = []
    for y, row in enumerate(rows):
        for x, c in enumerate(row):
            if c != ".":
                rects.append(f'<rect x="{x}" y="{y}" width="1" height="1" fill="{pal[c]}"/>')
    svg = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 32" width="16" height="32" shape-rendering="crispEdges">'
           + "".join(rects) + "</svg>")
    (UI / name).write_text(svg, encoding="utf-8")


if __name__ == "__main__":
    sprite()
    talisman("talisman.svg", PAL["plain"])
    talisman("talisman_gold.svg", PAL["gold"])
    print("ok")
