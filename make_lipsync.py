"""每句音檔做一份客語對嘴資料：prototype/lipsync/<腔調>/<序號>.json
用 vector-avator 的 tools/lipsync/lipsync.py（--lang hak：依拼音的母音決定嘴型，時間依音檔的有聲段落）。
需要 ffmpeg。已做過的會略過。"""
import csv, importlib.util, json, subprocess, sys, tempfile
from pathlib import Path
from context_lines import dialogue_lines, needed

HERE = Path(__file__).parent
SRC = HERE.parent / "data" / "情境應答"
LIPSYNC = Path(r"D:\Yezi\G_project\vector-avator\tools\lipsync\lipsync.py")
DIALECTS = ["四縣腔", "南四縣腔", "海陸腔", "大埔腔", "饒平腔", "詔安腔"]
PREFIXES = ["問句", "答句", "近誘答1", "近誘答2"]

spec = importlib.util.spec_from_file_location("lipsync", LIPSYNC)
ls = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ls)


def main():
    made = skipped = failed = 0
    with tempfile.TemporaryDirectory() as tmp:
        for d in DIALECTS:
            lines = {}
            with open(SRC / f"情境應答題庫_{d}.csv", encoding="utf-8-sig") as f:
                for r in csv.DictReader(f):
                    for p in PREFIXES:
                        lines[r[f"{p}序號"]] = r[f"{p}拼音"]
            ctx = dialogue_lines(d)
            for n in needed():   # 前情句
                lines[str(n)] = ctx[n]["拼音"]
            for n, pinyin in lines.items():
                out = HERE / "lipsync" / d / f"{n}.json"
                mp3 = HERE / "audio" / d / f"{n}.mp3"
                if out.exists():
                    skipped += 1
                    continue
                wav = Path(tmp) / "x.wav"
                subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp3), "-ac", "1", "-ar", "22050",
                                "-c:a", "pcm_s16le", str(wav)], check=True)
                x, sr = ls.read_wav(str(wav))
                shapes = ls.hak_shapes(pinyin)
                spans = ls.voiced_spans(x, sr)
                if not shapes or not spans:
                    keys = ls.rms_keys(x, sr)      # 拼音或有聲段落抓不到時，改用音量
                    failed += 1
                else:
                    keys = ls.distribute(shapes, spans)
                keys.sort(key=lambda k: k["t"])
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_text(json.dumps({"duration": round(len(x) / sr, 3), "keys": keys}), encoding="utf-8")
                made += 1
    print(f"made {made}, skipped {skipped}, fallback to volume {failed}")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
