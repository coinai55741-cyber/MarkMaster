"""把題庫用到的 MP3 從 Google Drive 下載到 prototype/audio/<腔調>/<序號>.mp3。
瀏覽器不能直接播 Drive 連結，所以原型改用本機音檔。已下載的會略過。"""
import csv, re, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import requests

HERE = Path(__file__).parent
SRC = HERE.parent / "data" / "情境應答"
DIALECTS = ["四縣腔", "南四縣腔", "海陸腔", "大埔腔", "饒平腔", "詔安腔"]
PREFIXES = ["問句", "答句", "近誘答1", "近誘答2"]


def jobs():
    for d in DIALECTS:
        seen = {}
        with open(SRC / f"情境應答題庫_{d}.csv", encoding="utf-8-sig") as f:
            for r in csv.DictReader(f):
                for p in PREFIXES:
                    seen[r[f"{p}序號"]] = r[f"{p}MP3"]
        for n, url in seen.items():
            yield d, n, url


def fetch(job):
    d, n, url = job
    out = HERE / "audio" / d / f"{n}.mp3"
    if out.exists() and out.stat().st_size > 1000:
        return "skip"
    m = re.search(r"/d/([^/]+)", url)
    if not m:
        return f"no-url {d} {n}"
    for attempt in range(4):
        try:
            r = requests.get("https://drive.google.com/uc", params={"export": "download", "id": m.group(1)}, timeout=30)
            if r.ok and r.headers.get("Content-Type", "").startswith("audio"):
                out.parent.mkdir(parents=True, exist_ok=True)
                out.write_bytes(r.content)
                return "ok"
        except requests.RequestException:
            pass
        time.sleep(2 * (attempt + 1))
    return f"fail {d} {n}"


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    js = list(jobs())
    print("需要的音檔:", len(js))
    with ThreadPoolExecutor(6) as ex:
        res = list(ex.map(fetch, js))
    print({k: sum(1 for x in res if x == k) for k in ("ok", "skip")})
    for x in res:
        if x not in ("ok", "skip"):
            print(x)
