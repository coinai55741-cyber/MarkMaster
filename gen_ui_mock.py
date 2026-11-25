"""用 Codex imagegen 畫介面示意圖（只是給人看的設計稿，不放進遊戲），存到 dream/gen/ui_<名稱>_NN.png。
用法：python gen_ui_mock.py stage2
"""
import glob, os, shutil, subprocess, sys, time
from pathlib import Path

HERE = Path(__file__).resolve().parent
GEN = HERE / "dream" / "gen"

MOCKS = {
    "stage2": (
        "A polished UI mockup screenshot of a 2D pixel-art educational web game for Taiwanese elementary school kids, "
        "full-screen 16:9 PC layout (1920x1080). Warm cozy pixel art. "
        "BACKGROUND: a Taiwanese elementary school courtyard at night in a dream: dark indigo-purple sky with a big soft moon "
        "and twinkling stars, school building silhouettes with a few warm lit windows, a paved courtyard, faint purple dream mist, "
        "crisp pixel art with continuous dark-brown outlines. No flags, no flagpole, no national symbols, no signboards, no school name plates, no text anywhere in the background. "
        "CHARACTERS: in the back centre, a big cute chibi 'sleepy jiangshi king' (Chinese hopping vampire boss): round face, "
        "tilted Qing official hat, small cute fangs, half-closed sleepy eyes, sitting on a wooden coffin, kid-friendly, not scary. "
        "In front centre, one smaller cute hopping jiangshi zombie (teal Qing robe, arms stretched forward) with a tall yellow paper "
        "talisman hanging on its forehead that shows the WHOLE word written vertically: '圖' then '書' then '館', each with small pinyin beside it "
        "('tuˇ', 'suˊ', 'gonˋ'); the first character '圖' has a small red seal stamp, the second character '書' glows with a soft gold halo "
        "(current one), the third '館' is plain. "
        "UI (flat clean UI drawn over the scene, cream #FFF6E8 panels with 3-4px dark purple #4C355C borders, small rounded "
        "corners, mustard #F2C14E accents, consistent with a warm cozy game): "
        "top-left a small 'back' pill button; top-centre a cream sign panel with the text '第二關・封印殭屍王・第 2 / 3 波'; "
        "top-right a timer pill '02:18.42' and a gold talisman counter '× 6'; under the top sign a progress bar labelled "
        "'封印進度' made of three square slots, two filled gold and one empty. "
        "Bottom-left a wide card titled '目前要封印' showing three syllable boxes in a row: '圖 tuˇ' (pale green with a small red "
        "seal stamp 封 and '92.6%'), '書 suˊ' (highlighted mustard yellow, current), '館 gonˋ' (cream, waiting). "
        "Bottom-right a drawing-pad card: title '第 2 字：書 suˊ' with a small hint chip '2 → 4 上升', a dark navy drawing pad "
        "with five thin horizontal pitch lines numbered 5 (high) to 1 (low), a glowing yellow hand-drawn rising stroke on it, "
        "and below a small label '聲調 18.42 / 30'. "
        "Readable large Traditional Chinese text, clean layout, plenty of breathing room, no other text, no watermark."
    ),
}


# 說明頁、結算頁的全螢幕背景（穿搭小達人的卡片會蓋在畫面中間，重點放在左右兩側）
_BG_STYLE = (
    "Cozy, warm pixel art background for a 2D game, front-facing flat side view of a Taiwanese elementary school classroom "
    "(back wall, a strip of wooden floor at the bottom, no perspective). Warm muted palette: beige and warm tan walls, warm brown "
    "wooden floor planks, accents in dusty rose, muted teal and soft mustard; soft 3-4 tone pixel shading, continuous dark "
    "warm-brown outlines (never pure black), crisp square pixels (about 320x180 art pixels scaled up with nearest neighbour), "
    "no anti-aliasing, no blur. Wide 16:9 composition: a large cream UI card will cover the CENTRE of the image, so put the "
    "interesting details on the LEFT third and RIGHT third, keep the centre calm (plain wall, chalkboard). "
    "No text, no letters, no numbers, no logos, no flags or national symbols, no signboards. Original artwork. "
)
MOCKS["lobby_bg"] = _BG_STYLE + (
    "SCENE: recess break on a beautiful sunny day, late morning. On the LEFT, a big open window full of bright blue sky, fluffy "
    "white clouds and green tree leaves; through it, tiny distant kids playing on the sunny school playground (small, simple, "
    "running and jumping). A wide warm patch of sunlight falls through the window onto an EMPTY patch of wooden floor "
    "by the window (lower-left area): leave that sunlit floor spot completely empty, NO desk, NO chair, NO backpack there "
    "(a student with their own desk will be added later as a separate layer). "
    "NO PEOPLE INSIDE THE CLASSROOM at all (no student, no teacher, no sleeping kid, no 'zzz'); the classroom is empty and TIDY: identical small wooden school desks "
    "arranged in neat straight rows with even spacing, every desk facing the chalkboard on the back wall, every chair tucked "
    "neatly under/behind its own desk on the viewer's side (we see the chair backs), no chairs turned around, no chairs floating "
    "in the aisle, no overlapping desks; desks in the back row are drawn a bit higher and slightly smaller than the front row, "
    "and the front row is cut off by the bottom edge; the rows start to the right of the empty sunlit spot. No backpacks anywhere. "
    "Leave clear empty wall space above the sunlit spot (no objects, no talismans, no paper there). On the RIGHT, a bookshelf, a potted plant, a wall clock and a water bottle on a "
    "cabinet. Bright, cheerful, warm and lazy mood; no purple haze.")
MOCKS["result_bg"] = _BG_STYLE + (
    "SCENE: the same classroom just after waking up, late afternoon sunset: warm orange sunset light streaming through the window "
    "on the right, long soft shadows across the floor. On the LEFT, an empty wooden desk and chair with one small yellow paper "
    "talisman with red markings lying on the desk, glowing faintly with a few tiny sparkles (a hint that the dream was real). "
    "Calm, warm, happy mood; a potted plant and a shelf with books; a few faint dust motes floating in the sunbeams. No people.")

# 說明頁的主角（另外生，之後去背、轉像素，疊到背景窗邊那張桌子上）
MOCKS["lobby_kid"] = (
    "A single game character sprite, 2D pixel art (chunky crisp square pixels, about 80x80 art pixels scaled up with nearest "
    "neighbour, no anti-aliasing, no blur), continuous dark warm-brown 1-pixel outlines, warm cozy palette, soft 3-4 tone shading. "
    "CHARACTER: a cute Taiwanese elementary school kid (gender-neutral, short black hair) in a white short-sleeve school shirt and "
    "navy shorts, SITTING and dozing off, leaning forward with the head resting on folded arms, face hidden in the arms, peaceful. "
    "Viewed from the side (facing right), seen at the same flat front-facing angle as a side-view 2D game. Draw ONLY the kid: no desk, "
    "no chair, no backpack, no 'zzz', no props; the folded arms rest on an invisible flat surface at elbow height and the body sits "
    "on an invisible seat, legs bent down. "
    "BACKGROUND: one flat solid pure magenta colour #FF00FF everywhere, no shadow, no floor, no scenery, no text, no watermark, no border.")

# 說明頁的主角＋自己的桌椅（一整組，去背後疊到背景 07 左下角的陽光地板上）
MOCKS["lobby_kid_desk"] = (
    "A single game prop sprite in cozy, warm 2D pixel art (same style as a cosy classroom background: crisp pixel art, continuous "
    "dark warm-brown outlines, soft 3-4 tone shading, warm muted palette). SUBJECT: one complete set, full view, nothing cut off: "
    "a small wooden Taiwanese elementary school desk (light orange wooden top, grey metal legs) with its matching chair (wooden "
    "seat and wooden back panel on a grey metal frame), and a cute elementary school kid (gender-neutral, short black hair, white "
    "short-sleeve school shirt, navy shorts, white socks, dark sneakers) sitting on the chair and sleeping on the desk: leaning "
    "forward, head resting on folded arms on the desktop, face hidden, peaceful. FULL BODY visible: head, back, arms, both legs and "
    "feet on the floor. A two-strap school backpack hangs on the side of the chair. VIEW: three-quarter view from behind-left and "
    "slightly above, like the other desks in a classroom seen from the back of the room (we see the kid's back and the chair back, "
    "the desk is in front of the kid), the desk faces up-right. Kid-friendly and cute. No 'zzz', no text. "
    "BACKGROUND: one flat solid pure magenta colour #FF00FF everywhere, no shadow on the ground, no floor, no scenery, no text, "
    "no watermark, no border.")

# 前導故事／醒來的立繪（GALGAME 風、非像素）：主角、同學。參考圖用 codex exec -i 附上
_VN = ("Character sprite for a cosy visual-novel (galgame) style dialogue scene in a Taiwanese educational game for elementary school kids. Clean soft anime illustration: crisp clean lineart, soft cel shading with gentle gradients, warm natural lighting, NOT pixel art. Kid-friendly, wholesome, about 10 years old, cute but natural proportions (not chibi). No text, no logos, no flags or national symbols. ")
MOCKS["hero_design"] = _VN + (
    "CHARACTER: the PROTAGONIST, a Taiwanese elementary school kid (gender-neutral look), messy dark-brown hair with a small "
    "cowlick, warm brown eyes, white short-sleeve school shirt, navy shorts, white socks, dark sneakers, the same kid as in the attached "
    "reference picture (sleeping at the desk). Waist-up portrait (from the waist to the top of the head), body turned three-quarters to "
    "the right, looking to the right, calm neutral expression, one hand lightly on the chin like thinking. "
    "BACKGROUND: one flat solid pure magenta colour #FF00FF everywhere, no shadow, no scenery, no border.")
MOCKS["classmate_design"] = _VN + (
    "CHARACTER: the CLASSMATE, exactly the same character design as the attached reference picture (keep the same hairstyle: spiky black "
    "hair with bangs; white short-sleeve school shirt with a navy collar and three grey buttons; green backpack straps on both shoulders; "
    "navy shorts; white socks; black shoes), redrawn as a clean anime illustration. Full body, standing, front view facing slightly left, "
    "friendly happy smile, one hand waving. "
    "BACKGROUND: one flat solid pure magenta colour #FF00FF everywhere, no shadow on the ground, no floor, no scenery, no border.")
REFS = {"hero_design": ["dream/gen/ui_lobby_kid_desk_01.png"], "classmate_design": ["dream/gen/ref_classmate.png"]}

# 定案造型：主角＝hero_design_02、同學＝classmate_design_01。下面是各表情（同一個人、同一個角度，只換表情）
_HERO = _VN + (
    "CHARACTER: exactly the same protagonist as the attached reference picture (same face, messy dark-brown hair with a cowlick, "
    "brown eyes, white short-sleeve school shirt with a chest pocket, navy shorts), same art style, same waist-up framing and the same "
    "three-quarter view turned to the right. ")
_BG_MAG = "BACKGROUND: one flat solid pure magenta colour #FF00FF everywhere, no shadow, no scenery, no border, no text."
MOCKS["hero_sleepy"] = _HERO + "EXPRESSION: very sleepy, heavy half-closed droopy eyes, a small yawn, head tilting a little, relaxed shoulders, both arms down. " + _BG_MAG
MOCKS["hero_closed"] = _HERO + "EXPRESSION: dozing off, eyes fully closed, peaceful sleeping face, head drooping forward a little, both arms down. " + _BG_MAG
MOCKS["hero_open"] = _HERO + "EXPRESSION: just woke up, eyes open wide and blinking, puzzled curious look, eyebrows slightly raised, as if asking 'who are you?', both arms down. " + _BG_MAG
MOCKS["hero_surprised"] = _HERO + "EXPRESSION: very surprised and startled, eyes wide open, small round open mouth, eyebrows up, leaning back a little, both hands raised in front of the chest. " + _BG_MAG
MOCKS["hero_laugh"] = _HERO + ("EXPRESSION: laughing happily with a big open smile and eyes squeezed shut, holding up a small yellow paper talisman with "
                              "red brush markings in one hand and looking at it. " + _BG_MAG)
MOCKS["mate_think"] = _VN + (
    "CHARACTER: exactly the same classmate as the attached reference picture (spiky black hair with bangs, white short-sleeve school shirt "
    "with a navy collar and grey buttons, green backpack straps, navy shorts, white socks, black shoes), same art style, full body, standing, "
    "same front view facing slightly left. EXPRESSION: amused curious smile, head tilted, one finger on the chin, wondering what you were doing. "
    "BACKGROUND: one flat solid pure magenta colour #FF00FF everywhere, no shadow on the ground, no floor, no scenery, no border, no text.")
for _k in ("hero_sleepy", "hero_closed", "hero_open", "hero_surprised", "hero_laugh"):
    REFS[_k] = ["dream/gen/ui_hero_design_02.png"]
REFS["mate_think"] = ["dream/gen/ui_classmate_design_01.png"]

# 進夢境後的主角（像素、大頭 Q 版）：比例和畫法照遊戲裡同學的像素圖（第 1 張參考），長相照主角造型（第 2 張參考）
MOCKS["hero_px_chibi"] = (
    "A single game character sprite in flat pixel art, matching EXACTLY the style and body proportions of the FIRST attached reference "
    "picture (a chibi kid about 2.5 heads tall: very big round head, small body, flat colours with only 1-2 shade tones, thin dark outlines, "
    "simple dot-like eyes and blush, crisp square pixels). CHARACTER: the protagonist from the SECOND attached reference picture: messy "
    "dark-brown hair with a small cowlick, white short-sleeve school shirt with a chest pocket (no backpack), navy shorts, white socks, dark "
    "sneakers. Full body, front view, standing, feet at the bottom. EXPRESSION: very surprised, eyes wide open, small round open mouth, both "
    "hands raised in front of the chest. Same size on the canvas as the kid in the first reference. "
    "BACKGROUND: one flat solid pure magenta colour #FF00FF everywhere, no shadow, no floor, no scenery, no text, no border.")
REFS["hero_px_chibi"] = ["dream/gen/ref_mate_px_smile.png", "dream/gen/ui_hero_design_02.png"]

# 第二關的殭屍王（大隻版）：直式、單色背景，之後去背再轉像素
SIZES = {"boss_king": "1024x1536", "lobby_kid": "1024x1024", "lobby_kid_desk": "1024x1024", "hero_design": "1024x1536", "classmate_design": "1024x1536", "hero_sleepy": "1024x1536", "hero_closed": "1024x1536", "hero_open": "1024x1536", "hero_surprised": "1024x1536", "hero_laugh": "1024x1536", "mate_think": "1024x1536", "hero_px_chibi": "1024x1024"}
MOCKS["boss_king"] = (
    "A single game character sprite, 2D pixel art (chunky crisp square pixels, about 90x150 art pixels scaled up with nearest "
    "neighbour, no anti-aliasing, no blur), continuous dark purple-brown 1-pixel outlines. Full body, front view, standing, feet "
    "at the bottom, centred, filling most of the image height. CHARACTER: 'the Sleepy Jiangshi King', the final boss of a "
    "kid-friendly game: a BIG, wide, chubby, imposing Chinese hopping-vampire king, clearly larger and grander than a normal "
    "jiangshi. Pale mint-green skin, round face, heavy half-closed sleepy eyes with dark eye bags, a big yawning open mouth with two "
    "small cute fangs, rosy cheeks. A very tall grand Qing-dynasty official hat with a wide brim, gold crown trim, a large red jewel "
    "finial on top and a long dangling sleepy tassel. Royal deep purple robe with gold cloud and dragon embroidery, a wide gold belt "
    "with a jade buckle, a square gold rank badge on the chest, very long wide sleeves with both arms stretched straight forward, "
    "and a flowing dark indigo cape with a gold lining behind him. Leave the FOREHEAD under the hat brim clear and visible (nothing "
    "on the forehead). Cute and funny rather than scary. "
    "BACKGROUND: one flat solid pure magenta colour #FF00FF everywhere, no shadow on the ground, no floor, no scenery, no text, "
    "no watermark, no border.")


def codex_path():
    p = os.environ.get("PATH", "")
    extra = os.path.expandvars(r"%APPDATA%\npm")
    return p if extra in p else p + os.pathsep + extra


def gen(name):
    GEN.mkdir(parents=True, exist_ok=True)
    n = max([int(Path(p).stem.rsplit("_", 1)[1]) for p in glob.glob(str(GEN / f"ui_{name}_[0-9][0-9].png"))], default=0) + 1
    out = GEN / f"ui_{name}_{n:02d}.png"
    lines = ["Use the imagegen skill with the built-in image_gen tool (do not use the CLI fallback, do not draw the image with code).",
             f"Make exactly 1 image_gen call, size {SIZES.get(name, '1536x1024')}, with the PROMPT below passed verbatim.",
             f"After it finishes, copy the generated PNG from $CODEX_HOME/generated_images/ to {out} and reply with that path only.",
             *(["The attached image is the character reference: keep the same character design (pass it to image_gen as a reference image if the tool supports it)."] if REFS.get(name) else []),
             "PROMPT:", MOCKS[name]]
    env = dict(os.environ, PATH=codex_path())
    cmd = [shutil.which("codex", path=env["PATH"]) or "codex", "exec", "--skip-git-repo-check",
           "--sandbox", "workspace-write", "-C", str(HERE), "-o", str(GEN / f"ui_{name}_{n:02d}.codex.txt"),
           *[a for r in REFS.get(name, []) for a in ("-i", str(HERE / r))], "-"]
    t0 = time.time()
    r = subprocess.run(cmd, input="\n".join(lines), text=True, encoding="utf-8", errors="replace", capture_output=True, env=env)
    print(name, out.name, "ok" if out.exists() else "MISSING", f"{time.time() - t0:.0f}s", (r.stderr or "")[-300:] if not out.exists() else "")


if __name__ == "__main__":
    for s in sys.argv[1:] or ["stage2"]:
        gen(s)
