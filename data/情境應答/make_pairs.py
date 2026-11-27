import csv, sys, random
from math import comb
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))   # repo 根目錄（context_lines.py）
from context_lines import CONTEXT  # noqa: E402

DATA = Path(__file__).resolve().parents[1]   # repo 裡的 data/
OUT = DATA / "情境應答"
DIALECTS = ["四縣腔", "南四縣腔", "海陸腔", "大埔腔", "饒平腔", "詔安腔"]

# (問句序號, 答句序號) ，序號 = 校園情境對話第 n 句（1-based）
PAIRS = [
    (1, 2), (2, 3), (4, 5), (6, 7), (8, 9), (10, 11), (12, 13), (14, 15),
    (24, 25), (30, 31), (35, 36), (39, 40), (40, 41), (43, 44),
    (44, 45), (52, 53), (53, 54), (60, 61), (62, 63), (68, 69), (70, 71),
    (74, 75), (75, 76), (77, 78), (79, 80), (81, 82), (87, 88), (89, 90),
    (90, 91), (92, 93), (96, 97), (99, 100), (103, 104), (105, 106),
    (108, 109), (110, 109), (116, 117), (119, 120), (121, 122), (126, 127),
    (129, 130), (132, 133), (135, 136), (137, 138), (141, 142), (150, 151),
    (153, 154), (157, 158), (159, 160), (162, 163), (165, 166), (167, 168),
    (170, 171), (172, 173), (174, 175), (177, 178), (182, 183), (187, 188),
    (192, 193), (193, 194), (194, 195), (195, 196), (205, 206),
    (208, 209),
]

# 進階難度：每題人工挑 2 句「同情境但答非所問」的近誘答（以問句序號為鍵）
# 已排除放在該題也說得通的句子（例如問「你們班呢」時，另一班的回答）
NEAR = {
    # 2026-11-26 人工檢查後拿掉：20→21（老師對全班說話，不是回答「我們可以先說嗎」）、
    # 189→190（「去買新衣服」沒有回答「穿什麼樣式」）；110 的答句從 115 改成 109（111、115 都不像在回這句；109 同時也是 108 的答句）
    1: (3, 5), 2: (5, 1), 4: (7, 13), 6: (5, 4), 8: (10, 12), 10: (9, 13),
    12: (9, 11), 14: (17, 19), 24: (34, 30), 30: (25, 34),
    35: (34, 24), 39: (41, 38), 40: (37, 38), 43: (47, 49), 44: (46, 49),
    52: (56, 57), 53: (51, 57), 60: (63, 62), 62: (61, 59), 68: (67, 73),
    70: (72, 73), 74: (80, 78), 75: (78, 81), 77: (80, 76), 79: (78, 81),
    81: (79, 77), 87: (89, 85), 89: (86, 87), 90: (88, 85), 92: (98, 96),
    96: (98, 100), 99: (93, 102), 103: (106, 102), 105: (102, 107),
    108: (113, 118), 110: (116, 118), 116: (118, 112), 119: (124, 121),
    121: (120, 124), 126: (130, 131), 129: (127, 131), 132: (136, 138),
    135: (133, 138), 137: (136, 134), 141: (136, 143), 150: (154, 155),
    153: (151, 148), 157: (164, 165), 159: (165, 163), 162: (164, 158),
    165: (160, 159), 167: (173, 176), 170: (174, 176), 172: (167, 176),
    174: (173, 171), 177: (179, 182), 182: (178, 180), 187: (191, 189),
    192: (196, 188), 193: (190, 191), 194: (188, 191),
    195: (190, 194), 205: (210, 211), 208: (212, 211),
}

# 對話主題分段：(起, 迄, 名稱)
TOPICS = [
    (1, 3, "早安問候"), (4, 7, "去圖書館"), (8, 13, "自我介紹"), (14, 21, "上課分組"),
    (22, 36, "下課"), (37, 42, "午餐"), (43, 49, "走廊受傷"), (50, 57, "打掃"),
    (58, 65, "午休"), (66, 73, "認識校園"), (74, 82, "生病"), (83, 91, "運動會"),
    (92, 100, "圖書館借書"), (101, 107, "校外教學"), (108, 118, "成立社團"),
    (119, 124, "合唱團"), (125, 131, "選社團"), (132, 139, "演講比賽"),
    (140, 146, "多元選修"), (147, 156, "園遊會"), (157, 166, "自主學習"),
    (167, 176, "升學申請"), (177, 186, "交換學生"), (187, 196, "校慶舞會"),
    (197, 204, "服務學習"), (205, 212, "夏令營"),
]

# 萬用回答：放在別題也可能說得通，不拿來當誘答
GENERIC = {2, 7, 15, 31, 36, 54, 61, 82, 91, 93, 117, 122, 166, 195, 196}


def topic_of(n):
    for a, b, name in TOPICS:
        if a <= n <= b:
            return name
    raise ValueError(n)


def load(dialect):
    with open(DATA / "quiz" / f"客語課室用語整合版_含MP3_{dialect}.csv", encoding="utf-8-sig") as f:
        rows = [r for r in csv.DictReader(f) if r["分類"] == "校園情境對話"]
    assert len(rows) == 212, (dialect, len(rows))
    return rows


def main():
    OUT.mkdir(exist_ok=True)
    for dialect in DIALECTS:
        rows = load(dialect)
        with open(OUT / f"情境應答題庫_{dialect}.csv", "w", encoding="utf-8-sig", newline="") as f:
            w = csv.writer(f)
            w.writerow(["題號", "主題", "問句序號", "問句客語", "問句華語", "問句拼音", "問句MP3",
                        "答句序號", "答句客語", "答句華語", "答句拼音", "答句MP3", "可當誘答",
                        "近誘答1序號", "近誘答1客語", "近誘答1華語", "近誘答1拼音", "近誘答1MP3",
                        "近誘答2序號", "近誘答2客語", "近誘答2華語", "近誘答2拼音", "近誘答2MP3"])
            for i, (q, a) in enumerate(PAIRS, 1):
                Q, A = rows[q - 1], rows[a - 1]
                near = []
                for d in NEAR[q]:
                    D = rows[d - 1]
                    near += [d, D["客語"], D["華語"], D["拼音"], D["MP3網址"]]
                w.writerow([i, topic_of(q), q, Q["客語"], Q["華語"], Q["拼音"], Q["MP3網址"],
                            a, A["客語"], A["華語"], A["拼音"], A["MP3網址"],
                            "否" if a in GENERIC else "是"] + near)

    # 組合數統計
    n = len(PAIRS)
    per_q = []
    for q, a in PAIRS:
        t = topic_of(q)
        pool = {a2 for q2, a2 in PAIRS if a2 not in GENERIC and topic_of(q2) != t and a2 != a}
        per_q.append(len(pool))
    combos = [comb(p, 2) for p in per_q]
    print("題數(問答對):", n)
    print("每題可用誘答池: 最少", min(per_q), "最多", max(per_q))
    print("每題誘答組合(不計順序): 最少", min(combos), "最多", max(combos))
    print("全部不同題目(不計順序):", sum(combos))
    print("全部不同題目(含選項順序 x6):", sum(combos) * 6)
    print("一局10題的抽題組合:", f"{comb(n, 10):,}")
    print("主題數:", len({topic_of(q) for q, _ in PAIRS}))

    # 檢查近誘答
    assert set(NEAR) == {q for q, _ in PAIRS}, "每題都要有近誘答"
    for q, a in PAIRS:
        assert a not in NEAR[q] and q not in NEAR[q] and len(set(NEAR[q])) == 2, q
        # 會先播的前情句不能再當選項
        assert not set(NEAR[q]) & set(CONTEXT.get(q, [])), ("前情句當成誘答", q)
    mid = sum(2 * p for p in per_q)
    print("\n中級（1 近 + 1 遠）不同題目:", mid, "；含選項順序:", mid * 6)
    print("進階（2 近）不同題目:", n, "；含選項順序:", n * 6)

    # 示範：進階難度隨機出 3 題
    rows = load("四縣腔")
    random.seed(11)
    for q, a in random.sample(PAIRS, 3):
        opts = [a, *NEAR[q]]
        random.shuffle(opts)
        print(f"\n[進階] 🔊 {rows[q-1]['客語']}（{rows[q-1]['華語']}）")
        for k, o in zip("ABC", opts):
            print(f"  {k}. {rows[o-1]['客語']}（{rows[o-1]['華語']}）" + ("  ✅" if o == a else ""))

    # 示範：初級隨機出 3 題
    random.seed(7)
    for q, a in random.sample(PAIRS, 3):
        t = topic_of(q)
        pool = [a2 for q2, a2 in PAIRS if a2 not in GENERIC and topic_of(q2) != t and a2 != a]
        opts = [a] + random.sample(pool, 2)
        random.shuffle(opts)
        print(f"\n🔊 {rows[q-1]['客語']}（{rows[q-1]['華語']}）")
        for k, o in zip("ABC", opts):
            print(f"  {k}. {rows[o-1]['客語']}" + ("  ✅" if o == a else ""))


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
