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
2. **第一關 聽客語，選回答**：7 題、每題 10 分。同學（像素角色）說一句客語，從 3 個客語回答選一個；答對得一張符紙
3. **轉場**：被吸進漩渦，進入夜晚校園
4. **第二關 封印殭屍王**：先練習一個字，接著 3 波殭屍（第 3 波是殭屍王）。照拼音由左往右畫出每個字的聲調（音高線 1–5），畫對就蓋上「封」印；殭屍 15 秒內沒封印完，這個詞 0 分
5. **醒來**：回到教室（插畫，非像素）→ **成績頁**：星等、稱號、評語、名次、排行榜、題目回顧（可重聽每句）

劇本與成績星等的文字以 Google 文件「午休驅魔記 劇本」為準。
第一關的題庫、抽題、誘答與計分規則詳見 [第一關規格書.md](第一關規格書.md)；第二關見 [符咒打殭屍企劃書.md](符咒打殭屍企劃書.md)。

## 檔案
| 路徑 | 內容 |
| --- | --- |
| `dream1.html` | 遊戲本體（說明頁、前導故事、第一關、結算、排行榜都在這裡） |
| `dream/stage2.js` | 第二關：封印殭屍王（畫聲調、殭屍、殭屍王出場） |
| `dream/sfx.js` | 合成音效（Web Audio，沒有音效檔） |
| `dream/lobby.css` | 說明頁、排行榜、結算頁樣式（沿用「穿搭小達人」編譯後的樣式） |
| `dream/vector-avatar.js`、`dream/classmate.json` | 同學的向量角色引擎與資料，遊戲中即時轉成像素圖 |
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
| `build_data.py`、`context_lines.py`、`fetch_audio.py` | 產生第一關題庫、下載語音 |
| `build_fireworks_data.py` | 產生第二關詞庫 |
| `gen_ui_mock.py` | 用 Codex 生圖（背景、角色、立繪），原圖存在 `dream/gen/`（不進版本控制） |
| `snap_bg.py`、`make_dream_bg.py`、`gen_warm_bg.py` | 背景轉成像素格 |
| `make_vn.py` | 立繪去背、轉像素版 |
| `make_ui_assets.py` | 介面圖 |

## 給接手工程師
- **排行榜目前是假資料**：`dream1.html` 裡的 `leaderboardService`（`getLeaderboard`、`submitGameResult`），正式上線只要改這裡接後端，接法同「穿搭小達人」
- **成績星等**：`starOf()` 依排行榜名次百分比給星等（5 星＝排名第 1 且滿分；4 星前 20%；3 星前 21–50%；2 星前 51–80%；1 星後 20%），稱號與評語在 `RESULT_TIERS`
- **第二關時間**：`dream/stage2.js` 的 `WALK_SEC`（殭屍走到面前的秒數）
- 手機直式、橫式、桌機都有版面；`prefers-reduced-motion` 時會關掉震動、旋轉等動畫
