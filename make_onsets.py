"""給「跟著節拍點火」用：估計每個短詞音檔裡，每個音節開始的時間（秒）。
做法：算 10ms 的音量包絡，找出有聲段；在有聲段裡挑最深的 n-1 個音量低谷當音節分界。
結果寫回 fireworks_data.js 每個詞的 "on"（起點）與 "dur"（音檔長度）。需要 ffmpeg。"""
import json, subprocess, sys, tempfile, wave
from pathlib import Path
import numpy as np

HERE = Path(__file__).parent
DATA = HERE / "fireworks_data.js"


def load(mp3, tmp):
    wav = Path(tmp) / "x.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp3), "-ac", "1", "-ar", "16000",
                    "-c:a", "pcm_s16le", str(wav)], check=True)
    with wave.open(str(wav)) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
        return x, w.getframerate()


def onsets(x, sr, n):
    hop = sr // 100
    m = len(x) // hop
    env = np.sqrt(np.mean(x[: m * hop].reshape(m, hop) ** 2, axis=1) + 1e-12)
    db = 20 * np.log10(env)
    env_s = np.convolve(env, np.ones(5) / 5, mode="same")  # 50 ms smoothing
    on = db > max(-40, np.percentile(db, 95) - 28)
    idx = np.flatnonzero(on)
    if len(idx) == 0:
        return [], len(x) / sr
    a, b = idx[0], idx[-1]
    # valleys: local minima of the smoothed envelope inside the voiced region
    cand = [i for i in range(a + 8, b - 8) if env_s[i] <= env_s[i - 1] and env_s[i] < env_s[i + 1]]
    cand.sort(key=lambda i: env_s[i])
    cuts = []
    for i in cand:
        if all(abs(i - c) >= 12 for c in cuts):  # syllables at least 120 ms apart
            cuts.append(i)
        if len(cuts) == n - 1:
            break
    if len(cuts) < n - 1:  # not enough dips: fall back to even split of the voiced span
        cuts = [int(a + (b - a) * k / n) for k in range(1, n)]
    cuts.sort()
    return [round(a / 100, 3)] + [round(c / 100, 3) for c in cuts], round(len(x) / sr, 3)


def main():
    t = DATA.read_text(encoding="utf-8")
    head, body = t.split("window.FW_WORDS = ", 1)
    data = json.loads(body.rstrip().rstrip(";"))
    fallback = 0
    with tempfile.TemporaryDirectory() as tmp:
        for d, words in data.items():
            for w in words:
                x, sr = load(HERE / w["s"], tmp)
                w["on"], w["dur"] = onsets(x, sr, len(w["p"]))
                if len(w["on"]) != len(w["p"]):
                    fallback += 1
    DATA.write_text(head + "window.FW_WORDS = " + json.dumps(data, ensure_ascii=False) + ";\n", encoding="utf-8")
    print("done; words without onsets:", fallback)
    w = data["四縣腔"][0]
    print(w["h"], w["p"], w["on"], w["dur"])


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main()
