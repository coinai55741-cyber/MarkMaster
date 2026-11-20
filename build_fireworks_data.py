"""煙火連線的題庫：從課室用語挑「客字數 = 拼音音節數」的 2～5 字短詞，
六腔都能用的同一批詞（依原始題庫的列號對齊），輸出 fireworks_data.js。
音檔下載到 audio_fw/<腔調>/<列號>.mp3（瀏覽器不能直接播 Google Drive 連結）。

用法：python build_fireworks_data.py [--pool 60] [--no-audio]"""
import argparse, csv, json, random, re, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import requests

HERE = Path(__file__).parent
QUIZ = HERE.parent / "data" / "quiz" / "客語課室用語整合版_含MP3_{}.csv"
DIALECTS = ["四縣腔", "南四縣腔", "海陸腔", "大埔腔", "饒平腔", "詔安腔"]
TONES = "ˊˇˋ⁺ˆ"
SYL = re.compile(rf"[a-z]+[{TONES}]*")
HAN = re.compile(r"[㐀-鿿\U00020000-\U0003134f]")


def syllables(pinyin):
    """Split pinyin into syllables; None when it has anything besides letters, tone marks and spaces."""
    p = pinyin.strip().lower()
    if re.search(rf"[^a-z{TONES}\s]", p):
        return None
    return SYL.findall(p)


def candidates(rows):
    """Row index -> (chars, syllables) for short words whose char count matches the syllable count."""
    out = {}
    for i, r in enumerate(rows):
        h = r["客語"].strip()
        chars = HAN.findall(h)
        if len(chars) != len(h) or not 2 <= len(chars) <= 5:
            continue
        syl = syllables(r["拼音"])
        if syl and len(syl) == len(chars):
            out[i] = (chars, syl)
    return out


def fetch(job):
    url, out = job
    if out.exists() and out.stat().st_size > 1000:
        return True
    m = re.search(r"/d/([^/]+)", url or "")
    if not m:
        return False
    for attempt in range(4):
        try:
            r = requests.get("https://drive.google.com/uc", params={"export": "download", "id": m.group(1)}, timeout=30)
            if r.ok and r.headers.get("Content-Type", "").startswith("audio"):
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(r.content)
                return True
        except requests.RequestException:
            pass
        time.sleep(2 * (attempt + 1))
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pool", type=int, default=60, help="how many words per dialect")
    ap.add_argument("--no-audio", action="store_true")
    a = ap.parse_args()
    rows = {d: list(csv.DictReader(open(str(QUIZ).format(d), encoding="utf-8-sig"))) for d in DIALECTS}
    cands = {d: candidates(rows[d]) for d in DIALECTS}
    common = sorted(set.intersection(*(set(c) for c in cands.values())))
    # same Hakka characters in every dialect, so one picture of the word works for all
    common = [i for i in common if len({"".join(cands[d][i][0]) for d in DIALECTS}) <= 3]
    print("短詞（六腔都可用）:", len(common))
    by_len = {}
    for i in common:
        by_len.setdefault(len(cands["四縣腔"][i][0]), []).append(i)
    print("依字數:", {k: len(v) for k, v in sorted(by_len.items())})
    rnd = random.Random(42)
    want = {2: 0.25, 3: 0.35, 4: 0.3, 5: 0.1}
    pick = []
    for n, share in want.items():
        pool = by_len.get(n, [])
        pick += rnd.sample(pool, min(len(pool), round(a.pool * share)))
    pick.sort()
    data, jobs = {}, []
    for d in DIALECTS:
        items = []
        for i in pick:
            chars, syl = cands[d][i]
            r = rows[d][i]
            path = HERE / "audio_fw" / d / f"{i}.mp3"
            jobs.append((r["MP3網址"], path))
            items.append({"id": i, "h": chars, "p": syl, "m": r["華語"].strip(), "cat": r["次分類"],
                          "s": f"audio_fw/{d}/{i}.mp3"})
        data[d] = items
    if not a.no_audio:
        with ThreadPoolExecutor(6) as ex:
            ok = list(ex.map(fetch, jobs))
        print("音檔:", sum(ok), "/", len(ok))
    for d in DIALECTS:  # drop words whose audio could not be fetched
        data[d] = [x for x in data[d] if (HERE / x["s"]).exists()] if not a.no_audio else data[d]
    (HERE / "fireworks_data.js").write_text(
        "// 由 build_fireworks_data.py 產生，請勿手動修改\nwindow.FW_WORDS = " +
        json.dumps(data, ensure_ascii=False) + ";\n", encoding="utf-8")
    print({d: len(v) for d, v in data.items()})


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
