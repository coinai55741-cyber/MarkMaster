"""用 Codex imagegen 生「溫暖風」的夢境場景背景（原創，不模仿特定作者），存到 dream/gen/<場景>_NN.png。
之後用 snap_bg.py 對齊成真正的像素格子。
用法：python gen_warm_bg.py library [classroom ...]
"""
import glob, os, shutil, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
GEN = HERE / "dream" / "gen"

STYLE = (
    "Cozy, warm pixel art background for a 2D side-view adventure game. Strictly front-facing flat side view of one room "
    "(like a theatre stage seen straight on: back wall, a strip of floor at the bottom, no perspective, no vanishing point). "
    "Warm muted palette: beige and warm tan walls, warm brown wooden floor planks with darker gaps, accents in dusty rose, "
    "muted teal and soft mustard. Gentle late-afternoon sunlight, soft 3-4 tone pixel shading on every object "
    "(highlight, mid, shadow), a soft darker band where the wall meets the floor, small contact shadows under furniture, "
    "dark warm-brown outlines (never pure black). Lived-in details: framed pictures, small plants, books, cups. "
    "Keep the right quarter of the floor and the space above it fairly empty, because a character will stand there. "
    "No people, no animals, no text, no letters, no numbers, no logos, no flags or national symbols. Clean crisp pixel art with visible square pixels "
    "(about 240x150 art pixels scaled up with nearest neighbour), no anti-aliasing, no blur, no gradients, no noise. "
    "Wide landscape image; it will be cropped to 16:9 for a full-screen PC game, so keep the top 8% and bottom 8% "
    "free of important objects and put the wall/floor line at about 70% of the height. Original artwork."
)
SCENES = {
    "library": "a Taiwanese elementary school library: two or three tall wooden bookshelves full of colourful books along the back wall, a reading table with two small stools, a window with sheer curtains, a potted plant, a wall clock.",
    "classroom": "a Taiwanese elementary school classroom: a dark green chalkboard with a wooden frame and chalk tray on the back wall, two wooden student desks with chairs, a window with curtains, a small bulletin board with pinned papers (no readable text), a potted plant.",
    "corridor": "a Taiwanese school corridor: a row of windows high on the back wall, a row of small metal shoe/locker cubbies, a classroom door with a small glass window, a mop bucket, a hanging plant.",
    "nurse": "a school nurse's office: a single bed with white sheets and a pale blue blanket, a pale green privacy curtain on a rail, a white medicine cabinet with glass doors and small bottles, a small red cross sign, a potted plant, a desk lamp.",
    "playground": "an outdoor school sports field on a warm sunny afternoon, seen from the side: a warm sky with soft clouds, a row of trees in the distance, a red-orange running track with white lane lines, green grass in front, a basketball hoop on a pole at the left, colourful pennant flags on a string.",
    "auditorium": "a school auditorium stage: warm red velvet curtains on both sides, a wooden stage floor, soft warm spotlight beams, a plain mustard banner above the stage (no text), a row of simple wooden chairs in front.",
    "night": "a Taiwanese elementary school courtyard at NIGHT inside a dream: deep indigo-purple night sky with a big soft glowing moon and twinkling stars, a two-storey school building with a few warm lit windows across the back, trees with dark leaves, a paved courtyard floor, soft purple dream mist drifting near the ground, cool moonlight with a few warm window glows. Keep the centre of the courtyard open (characters will stand there).",
    "gate": "the front gate of a Taiwanese elementary school on a warm afternoon: two brick gate pillars, a metal sliding gate, a cream-coloured school building with windows behind a low wall, a big leafy tree at the right edge, a quiet road in front.",
}


def codex_path():
    p = os.environ.get("PATH", "")
    extra = os.path.expandvars(r"%APPDATA%\npm")
    return p if extra in p else p + os.pathsep + extra


def gen(scene):
    GEN.mkdir(parents=True, exist_ok=True)
    n = max([int(Path(p).stem.rsplit("_", 1)[1]) for p in glob.glob(str(GEN / f"{scene}_[0-9][0-9].png"))], default=0) + 1
    out = GEN / f"{scene}_{n:02d}.png"
    prompt = STYLE + " The room: " + SCENES[scene]
    lines = ["Use the imagegen skill with the built-in image_gen tool (do not use the CLI fallback, do not draw the image with code).",
             "Make exactly 1 image_gen call, size 1536x1024, with the PROMPT below passed verbatim.",
             f"After it finishes, copy the generated PNG from $CODEX_HOME/generated_images/ to {out} and reply with that path only.",
             "PROMPT:", prompt]
    env = dict(os.environ, PATH=codex_path())
    cmd = [shutil.which("codex", path=env["PATH"]) or "codex", "exec", "--skip-git-repo-check",
           "--sandbox", "workspace-write", "-C", str(HERE), "-o", str(GEN / f"{scene}_{n:02d}.codex.txt"), "-"]
    t0 = time.time()
    r = subprocess.run(cmd, input="\n".join(lines), text=True, encoding="utf-8", errors="replace", capture_output=True, env=env)
    print(scene, out.name, "ok" if out.exists() else "MISSING", f"{time.time() - t0:.0f}s", (r.stderr or "")[-300:] if not out.exists() else "")


if __name__ == "__main__":
    for s in sys.argv[1:] or ["library"]:
        gen(s)
