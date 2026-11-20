"""把 data/情境應答 的六腔題庫轉成原型網頁用的 data.js。
題庫有改（重跑 make_pairs.py）之後，再跑一次這支。"""
import csv, json, re
from pathlib import Path

HERE = Path(__file__).parent
SRC = HERE.parent / "data" / "情境應答"
DIALECTS = ["四縣腔", "南四縣腔", "海陸腔", "大埔腔", "饒平腔", "詔安腔"]


def audio(dialect, n):
    # 音檔由 fetch_audio.py 下載到本機；瀏覽器無法直接播 Google Drive 連結
    p = HERE / "audio" / dialect / f"{n}.mp3"
    return f"audio/{dialect}/{n}.mp3" if p.exists() else ""


def lipsync(dialect, n):
    # 對嘴資料由 make_lipsync.py 產生；只留時間與嘴型，縮小檔案
    p = HERE / "lipsync" / dialect / f"{n}.json"
    if not p.exists():
        return []
    return [[k["t"], k["mouth"]] for k in json.loads(p.read_text(encoding="utf-8"))["keys"]]


def line(r, prefix):
    n = r[f"{prefix}序號"]
    return {"h": r[f"{prefix}客語"], "m": r[f"{prefix}華語"], "p": r[f"{prefix}拼音"],
            "s": audio(CUR, n), "k": lipsync(CUR, n)}


data = {}
for d in DIALECTS:
    CUR = d
    with open(SRC / f"情境應答題庫_{d}.csv", encoding="utf-8-sig") as f:
        data[d] = [{
            "id": int(r["題號"]), "topic": r["主題"],
            "q": line(r, "問句"), "a": line(r, "答句"),
            "decoy": r["可當誘答"] == "是",
            "near": [line(r, "近誘答1"), line(r, "近誘答2")],
        } for r in csv.DictReader(f)]

(HERE / "data.js").write_text(
    "// 由 build_data.py 產生，請勿手動修改\nwindow.QUIZ = " +
    json.dumps(data, ensure_ascii=False, indent=0) + ";\n", encoding="utf-8")
print({d: len(v) for d, v in data.items()})
