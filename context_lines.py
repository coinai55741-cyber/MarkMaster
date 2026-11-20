"""前情句：有些問句開頭是「是啊」「對啊」「那你呢」，要先聽前一句才懂。
出這些題時先播前情句，再播問句。序號是「校園情境對話」裡的句子序號（從 1 起算）。
fetch_audio.py、make_lipsync.py、build_data.py 都會讀這裡。"""
import csv
from pathlib import Path

QUIZ_DIR = Path(__file__).parent.parent / "data" / "quiz"

# 問句序號 → 前情句序號（依播放順序）
CONTEXT = {
    126: [125],        # 是啊，你有喜歡的社團嗎？
    129: [128],        # 也是，那你覺得哪種社團比較適合我？
    141: [140],        # 對呀，我也發現不少有趣的……
    150: [148, 149],   # 所以大家要輪流顧攤位啊！那你們班呢？
    159: [158],        # 真好，這麼快就有方向了……
    162: [161],        # 不錯啊！那你對客家的什麼有興趣呢？
    170: [168, 169],   # ……那你呢？
    172: [171],        # 對啊！那你決定好要申請哪些科系了嗎？
    182: [181],        # 對啊！我好想去，只是我的日語程度不好……
    192: [191],        # 那你呢？你要穿什麼出席舞會？
    208: [207],        # 對啊，我在考慮參加……你呢？
}


def dialogue_lines(dialect):
    """回傳 {序號: {客語, 華語, 拼音, MP3網址}}，只含校園情境對話。"""
    f = next(QUIZ_DIR.glob(f"*_{dialect}.csv"))
    with open(f, encoding="utf-8-sig") as fh:
        rows = [r for r in csv.DictReader(fh) if r["分類"] == "校園情境對話"]
    return {i + 1: r for i, r in enumerate(rows)}


def needed():
    return sorted({n for v in CONTEXT.values() for n in v})
