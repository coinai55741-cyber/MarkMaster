# 午休驅魔記（MarkMaster 原型）

客語聽說小遊戲：午休睡著，在夢裡用客語闖關、畫聲調封印殭屍，醒來後看成績與排行榜。
主檔是 `dream1.html`，滿分 100 分：第一關 70 分＋第二關 30 分。

## 執行
遊戲會用 `fetch` 讀角色資料，請用本機伺服器開，不能直接用 file:// 開：

```
python -m http.server 8766
```

然後開 <http://127.0.0.1:8766/dream1.html>。
線上版（GitHub Pages）：<https://coinai55741-cyber.github.io/MarkMaster/dream1.html>

## 遊戲流程
1. **前導故事**（GALGAME 樣式對話，可「跳過故事情境」）→ **說明頁**：選腔調（四縣、海陸、大埔、饒平、詔安、南四縣），按「進入夢境」
2. **第一關 聽客語，選回答**：7 題、每題 10 分。神秘同學（像素角色）說一句客語，從 3 個客語回答選一個
   - 答對：神秘同學發金光、抖一下，得一張符紙
   - 答錯：神秘同學閃幾下變成殭屍（臉的上半部黑影、看不到眼睛，皮膚發青，外圍冒紫氣），維持到下一題
   - 作答後按「下一夢」（最後一題是「看結果」）
3. **轉場**：會動的神秘同學（像素、全身金光，疑惑表情＋驚訝動作）站在中間說「糟糕！被殭屍發現了！！！……」→ 教室裂開 → 殭屍王黑剪影「是誰，擾我清夢！」→ 漩渦把整個畫面捲走，進入夜晚校園
4. **第二關 封印殭屍王**：先練習一個字，接著 3 波殭屍（第 3 波是殭屍王）。照拼音由左往右畫出每個字的聲調（音高線 1–5），畫對就蓋上「封」印；殭屍 15 秒內沒封印完，這個詞 0 分
5. **醒來**：回到教室，同學（插畫，非像素）放大站在畫面正中間（電腦版露到胸口、手機版露到腰）叫你起床，主角名牌是「你」→ **成績頁**：星等、稱號、評語、名次、排行榜、題目回顧（可重聽每句）

說話的人：醒來前（前導故事、第一關、轉場、第二關）的同學都叫「神秘同學」，只有醒來後叫你起床的是「同學」。

所有對話都是 GALGAME 樣式（點一下下一句，可跳過）；殭屍王標題字卡會在中間停 1 秒，連點可直接跳過。

## 第一關題目檢查頁
`quiz_check.html`（線上：<https://coinai55741-cyber.github.io/MarkMaster/quiz_check.html>）：不用玩遊戲，直接列出該腔全部 64 題（隨機順序），誘答用和遊戲一樣的規則抽，可聽前情句＋題目（有進度條）、每個選項單獨聽，標出正解／近誘答／遠誘答。用來檢查題目、答案、誘答合不合情境；每題可以標「這不是答案／這也可以／都不是答案／題目有問題」加備註，按「複製標記給 Claude」匯出（修正紀錄見規格書第 9 節）。
網址加 `?level=mid` 或 `?level=hard` 切難度（同遊戲）。

劇本與成績星等的文字以 Google 文件「午休驅魔記 劇本」為準。
第一關的題庫、抽題、誘答與計分規則詳見 [第一關規格書.md](第一關規格書.md)；第二關見 [符咒打殭屍企劃書.md](符咒打殭屍企劃書.md)。

## 檔案
| 路徑 | 內容 |
| --- | --- |
| `dream1.html` | 遊戲本體（說明頁、前導故事、第一關、結算、排行榜都在這裡） |
| `dream/stage2.js` | 第二關：封印殭屍王（畫聲調、殭屍、殭屍王出場） |
| `dream/sfx.js` | 合成音效（Web Audio，沒有音效檔） |
| `dream/bgm.js` | 背景音樂：`lobby` 故事／說明頁／醒來／成績頁、`stage1` 第一關（這兩首是 Web Audio 即時合成的原創曲，沒有音檔）；`stage2` 第二關、`boss` 殭屍王出場後（同一首加快 10%）用 `dream/bgm/` 的音檔；客語語音播放時自動壓小 |
| `dream/bgm/` | 第二關音樂：魔王魂「bravery heart 8bit版」ループ版（<https://maou.audio/bgm_8bit25/>）。可商用、可改編、不用申請；不可把音檔單獨轉發或販售、不可用 AI 改編。表記「音楽：魔王魂」（非必要） |
| `dream/lobby.css` | 說明頁、排行榜、結算頁樣式（沿用「穿搭小達人」編譯後的樣式） |
| `dream/vector-avatar.js`、`dream/classmate.json` | 同學的向量角色引擎與資料，遊戲中即時轉成像素圖（重建方法見下方「角色引擎」） |
| `quiz_check.html` | 第一關題目檢查頁（不用玩遊戲） |
| `engine/` | 角色引擎的改法：`markmaster_engine.patch`、原作者授權 `LICENSE_vector-avator.txt` |
| `dream/vn/` | 前導故事／醒來的立繪（主角各表情、同學、像素版） |
| `dream/bg2_*.png` | 7 個夢境場景背景（320×180 像素格） |
| `dream/lobby_bg.webp`、`dream/result_bg.webp` | 說明頁、成績頁背景（原圖） |
| `dream/zombie.png`、`dream/boss.png` 等 | 第二關殭屍、殭屍王圖 |
| `ui/` | 按鈕、獎牌、符紙等介面圖 |
| `tone.js` | 聲調調值、變調、畫線評分 |
| `data.js` | 第一關題庫（由 `build_data.py` 產生） |
| `audio/<腔>/` | 第一關語音 MP3（由 `fetch_audio.py` 下載） |
| `fireworks_data.js` | 第二關用的詞與拼音（由 `build_fireworks_data.py` 產生） |
| `audio_fw/<腔>/` | 第二關詞語音 MP3 |
| `第一關規格書.md` | 第一關的題庫來源、抽題與誘答規則、播放、計分（70 分） |
| `符咒打殭屍企劃書.md` | 第二關企劃 |

### 產生素材用的腳本（遊戲執行時不需要）
| 路徑 | 內容 |
| --- | --- |
| `data/quiz/` | 課室用語原始資料（6 腔 CSV，第一、二關題庫都從這裡來） |
| `data/情境應答/` | 第一關問答配對腳本 `make_pairs.py` 與產生的題庫 CSV |
| `build_data.py`、`context_lines.py`、`fetch_audio.py` | 產生第一關題庫、下載語音 |
| `build_fireworks_data.py` | 產生第二關詞庫 |
| `gen_ui_mock.py` | 用 Codex 生圖（背景、角色、立繪），原圖存在 `dream/gen/`（不進版本控制） |
| `snap_bg.py`、`make_dream_bg.py`、`gen_warm_bg.py` | 背景轉成像素格 |
| `make_vn.py` | 立繪去背、轉像素版（注意：`dream/vn/mate_think.webp` 是手動做的差分圖——臉用 `mate_wave` 的、手托下巴，重跑會被 Codex 原圖蓋掉） |
| `make_ui_assets.py` | 介面圖 |

## 給接手工程師
- **排行榜目前是假資料**：`dream1.html` 裡的 `leaderboardService`（`getLeaderboard`、`submitGameResult`），正式上線只要改這裡接後端，接法同「穿搭小達人」
- **成績星等**：`starOf()` 依排行榜名次百分比（名次 ÷ 參加人數）給星等：5 星＝前 5% 且排名第 1 且滿分 100（參加不到 20 人時第 1 名不在前 5%，拿不到 5 星）；4 星前 6%～20%；3 星前 21%～50%；2 星前 51%～80%；1 星後 20%。稱號與評語在 `RESULT_TIERS`。接正式排行榜時，`submitGameResult()` 只要回傳 `myEntry.rank`（名次）、`myEntry.score`、`participantCount`（參加人數），星等就會自動算，不用改 `starOf()`；如果後端自己算星等，再把 `renderResult()` 裡呼叫 `starOf()` 的地方換成後端的值
- **背景音樂**：`dream1.html` 的 `SCREEN_BGM` 決定每個畫面放哪首（`show()` 時切換）；曲子在 `dream/bgm.js` 的 `TRACKS`（合成曲是每小節 8 格的音符字串；音檔曲是 `{ file, gain, rate }`，`gain` 用來和合成曲對齊音量），整體音量 `VOL`、語音時壓到 `DUCK`。左上「音樂」按鈕只開關背景音樂（記在 localStorage），題目語音和音效不受影響
- **睜眼閉眼特效**：`dream1.html` 的 `Eyes`（`close()`、`close("fast")`、`open()`、`blink()`、`set(0～1)`、`clear()`，都回傳 Promise）。上下兩個長方形眼皮＋模糊；對話中會蓋住人物但留下對話框和主角。目前只用在前導故事「好想睡覺……」：眨眼後閉上，下一句拿掉
- **第二關時間**：`dream/stage2.js` 的 `WALK_SEC`（殭屍走到面前的秒數）
- 手機直式、橫式、桌機都有版面；`prefers-reduced-motion` 時會關掉震動、旋轉等動畫

## 角色引擎（`dream/vector-avatar.js`）
同學是用 [vector-avator](https://github.com/grmchn/vector-avator)（gear_machine，MIT 授權）做的向量角色，遊戲每格把它畫到隱藏畫布，再轉成像素圖。
`dream/vector-avatar.js` 是把引擎打包成一支 script 的結果，**有改過原版**，改法全部在 `engine/markmaster_engine.patch`。

### 重建（已實測：產生的 `vector-avatar.js`、`classmate.json` 和 repo 裡的一模一樣）
```
git clone https://github.com/grmchn/vector-avator.git
cd vector-avator
git checkout f28d35d                      # 套 patch 的基準版本
git apply <本 repo>/engine/markmaster_engine.patch
npm install
npx vite build -c vite.embed.config.ts    # 產生 dist-embed/vector-avatar.js
```
- `dist-embed/vector-avatar.js` → 複製到本 repo 的 `dream/vector-avatar.js`
- `public/characters/classmate/vector/vector.json` → 複製成 `dream/classmate.json`
- Windows 上請先 `git config --global core.autocrlf false` 再 clone，否則換行符號不同，patch 可能套不上

### patch 的內容
| 檔案 | 改了什麼 |
| --- | --- |
| `src/embed/avatar.ts`、`vite.embed.config.ts` | 新增：給遊戲用的入口（`VectorAvatar.Avatar.create(容器, { vectorUrl, width, height, idle })`）與打包設定 |
| `src/renderers/vector/vectorRenderer.ts`、`vdata.ts` | 1. 新設定 `arms.<L/R>.overRaised`：整隻上臂舉起（手肘高過肩膀 0.25 頭半徑以上、沒有橫過胸前）時，列在裡面的部件（書包肩帶）再畫一次蓋在上臂上，只畫在手臂範圍內——肩帶不會被舉起的手臂切斷<br>2. 手舉到手肘上面（例如托下巴、捧臉）時，手掌畫在前臂上面，不再被前臂蓋住 |
| `public/characters/classmate/`、`inputs/classmate/`、`data/characters/classmate.json`、`tools/vector/sheets/characters/classmate.*` | 新增：同學角色的原圖、參考圖、向量資料、角色設定 |
| `tools/lipsync/lipsync.py`、`tools/vector/sheets/make.py` | 做角色、對嘴時用的工具小修正，遊戲執行不需要 |

### 遊戲端做的事（在 `dream1.html`，不在引擎裡）
- `prepAvatar()`：背景透明、關掉向量外框；另外畫一張「手的遮罩」，轉像素時把手的邊緣描成粉紅色線，手和臉重疊時看得出手指
- `pixelize()`：k-means 收斂顏色（嘴巴的粉紅色固定保留）→ 每格取最多的顏色 → 1px 深色外框
- 場景裡的同學用 `av`；轉場時站在前面說話的神秘同學用另一份 `av2`，兩個各自動作
