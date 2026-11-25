// 聲調共用邏輯：調值表、連讀變調、畫線評分、常見錯誤提示。
// fw_tone.html（畫聲調升空）和 zombie_tone.html（符咒打殭屍）共用。
//   TONE.spoken(dialect, word, i)   第 i 個字 { base: 本調, val: 實際唸的調, changed }
//   TONE.contourOf("24")            -> [2,4]
//   TONE.toneName([2,4])            -> "上升"
//   TONE.grade(pts, target, opt)    pts = [[x, 音高 1~5], ...]；回傳 { s: 0~1, err, got, dirOk } 或 { s: 0, why }
//   TONE.advise(g, target, syl, val, sp, regrade)   分數低時的提示文字
(function () {
  // ---- 調值（五度標記，1 低～5 高）：教育部《客家語拼音方案使用手冊》101 年版「聲調符號表」----
  // 舒聲（一般音節）與入聲（-b、-d、-g 結尾）分開查；題庫的 ⁺ 即手冊的 +，ˆ 即 ^
  const TONES = {
    "四縣腔":   { open: { "ˊ": "24", "ˇ": "11", "ˋ": "31", "": "55" },                       stop: { "ˋ": "2", "": "5" } },
    "海陸腔":   { open: { "ˋ": "53", "": "55", "ˊ": "24", "ˇ": "11", "⁺": "33" },            stop: { "": "5", "ˋ": "2" } },
    "大埔腔":   { open: { "⁺": "33", "ˊ": "35", "ˇ": "113", "ˆ": "31", "ˋ": "53", "": "55" }, stop: { "ˆ": "21", "ˋ": "54" } },   // 無標 55：去聲變調後才出現
    "饒平腔":   { open: { "ˇ": "11", "": "55", "ˋ": "53", "ˊ": "24", "ˆ": "31", "⁺": "33" }, stop: { "ˋ": "2", "": "5", "ˊ": "24" } },   // ˆ31、超陰入 ˊ24：手冊特殊聲調 (3)
    "詔安腔":   { open: { "ˇ": "11", "ˋ": "53", "ˆ": "31", "": "55", "ˊ": "24", "⁺": "33" }, stop: { "ˊ": "24", "ˋ": "43", "": "5" } },           // 舒聲 ˊ24：g 韻尾消失的陰入字，手冊特殊聲調 (5)
    "南四縣腔": { open: { "ˊ": "24", "⁺": "33", "ˇ": "11", "ˋ": "31", "": "55" },            stop: { "ˋ": "2", "": "5" } },
  };
  const TONE_MARK = /[ˊˇˋ⁺ˆ]$/;
  // 入聲 = -b、-d、-g 結尾；-ng 是鼻音韻尾，不是入聲
  const STOP = /(?:[bd]|[^n]g)$/;
  const markOf = syl => (syl.match(TONE_MARK) || [""])[0];
  const baseOf = syl => syl.replace(TONE_MARK, "");
  /** 聲調類別：標號，入聲再加「入」。例如 "conˊ" -> "ˊ"、"bagˋ" -> "ˋ入"、"pag" -> "入" */
  const toneKey = syl => markOf(syl) + (STOP.test(baseOf(syl)) ? "入" : "");
  function valueOf(dialect, base, m) {
    const t = TONES[dialect];
    return (STOP.test(base) ? t.stop[m] : t.open[m]) ?? t.open[m] ?? "33";
  }
  /** 本調調值 */
  const toneValue = (dialect, syl) => valueOf(dialect, baseOf(syl), markOf(syl));

  // ---- 連讀變調：依教育部《客家語拼音學習手冊》各腔「變調」課的例詞整理 ----
  // SANDHI[腔](這個字的類別, 後一字的類別) -> 變調後的標號；null 表示不變。詞的最後一個字不變調。
  const SX = (c, n) => c === "ˊ" && ["ˊ", "", "入"].includes(n) ? "ˇ" : null;   // 陰平 24 接陰平、去聲、陽入 -> 11
  const SANDHI = {
    "四縣腔": SX,
    "南四縣腔": SX,
    // 上聲 24 接任何調 -> 33；陰入 5 接任何調 -> 2
    "海陸腔": (c, n) => c === "ˊ" ? "⁺" : c === "入" ? "ˋ" : null,
    // 陰平 33 接陽平、上聲 -> 35；陽平 113 接陽平 -> 33；去聲 53 接上聲、去聲、陰入、陽入 -> 55
    "大埔腔": (c, n) => c === "⁺" && ["ˇ", "ˆ"].includes(n) ? "ˊ"
                      : c === "ˇ" && n === "ˇ" ? "⁺"
                      : c === "ˋ" && ["ˆ", "ˋ", "ˆ入", "ˋ入"].includes(n) ? "" : null,
    // 陰平 11、去聲 24 接任何調 -> 33；陽平 55 接陰平、上聲、陰入 -> 53，其他 -> 33；
    // 上聲 53 接陰平、上聲 -> 33，其他 -> 11；陰入 2 接任何調 -> 5
    "饒平腔": (c, n) => c === "ˇ" || c === "ˊ" ? "⁺"
                      : c === "" ? (["ˇ", "ˋ", "ˋ入"].includes(n) ? "ˋ" : "⁺")
                      : c === "ˋ" ? (["ˇ", "ˋ"].includes(n) ? "⁺" : "ˇ")
                      : c === "ˋ入" ? "" : null,
    // 上聲 31 接上聲 -> 55，其他 -> 11；ˊ 24（含陰入）接任何調 -> 55／5；陽平 53、去聲 55 接任何調 -> 33
    "詔安腔": (c, n) => c === "ˆ" ? (n === "ˆ" ? "" : "ˇ")
                      : c === "ˊ" || c === "ˊ入" ? ""
                      : c === "ˋ" || c === "" ? "⁺" : null,
  };
  /** 詞 w 的第 i 個字實際要唸的調：{ base: 本調, val: 實際調值, changed } */
  function spoken(dialect, w, i) {
    const syl = w.p[i], base = toneValue(dialect, syl);
    if (i === w.p.length - 1) return { base, val: base, changed: false };
    const m = SANDHI[dialect](toneKey(syl), toneKey(w.p[i + 1]));
    if (m === null || m === undefined) return { base, val: base, changed: false };
    const val = valueOf(dialect, baseOf(syl), m);
    return { base, val, changed: val !== base };
  }
  /** 調值字串 -> 音高點，例如 "24" -> [2,4]、"113" -> [1,1,3]、單一數字 "5" -> [5,5] */
  function contourOf(v) {
    const pts = [...v].map(Number);
    return pts.length === 1 ? [pts[0], pts[0]] : pts;
  }
  /** 依 0~1 的位置取目標音高（多點時分段直線） */
  const targetAt = (c, u) => { const k = Math.min(c.length - 2, Math.floor(u * (c.length - 1))), f = u * (c.length - 1) - k; return c[k] + (c[k + 1] - c[k]) * f; };
  const toneName = c => { const a = c[0], b = c.at(-1); return a === b ? (a >= 4 ? "高平" : a <= 2 ? "低平" : "中平") : b > a ? "上升" : "下降"; };

  // ---- 評分：把筆跡依 x 重新取 11 點，和目標調型比平均誤差 ----
  // opt.minSpan：筆畫至少要多寬（px）；opt.scale：平均誤差幾格算 0 分（4 = 每差一格扣 25%）
  // 升降方向（平／升／降）不同時 dirOk = false，分數再打五折
  function grade(pts, target, opt = {}) {
    const scale = opt.scale ?? 4, minSpan = opt.minSpan ?? 0;
    if (pts.length < 2) return { s: 0, why: "要由左往右畫長一點" };
    const xs = pts.map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
    if (x1 - x0 < minSpan || pts[pts.length - 1][0] < pts[0][0]) return { s: 0, why: "要由左往右畫長一點" };
    const sorted = pts.slice().sort((a, b) => a[0] - b[0]);
    const at = x => { let k = sorted.findIndex(p => p[0] >= x); if (k <= 0) return sorted[Math.max(0, k)][1]; const [ax, ay] = sorted[k - 1], [bx, by] = sorted[k]; return ay + (by - ay) * ((x - ax) / ((bx - ax) || 1)); };
    let err = 0; const N = 11, got = [];
    for (let i = 0; i < N; i++) { const u = i / (N - 1), v = at(x0 + u * (x1 - x0)), t = targetAt(target, u); got.push(v); err += Math.abs(v - t); }
    err /= N;
    let s = Math.max(0, 1 - err / scale);
    const dirT = Math.sign(target.at(-1) - target[0]), slope = got[N - 1] - got[0], dirG = Math.abs(slope) < .6 ? 0 : Math.sign(slope);
    const dirOk = dirT === dirG;
    if (!dirOk) s *= .5;
    return { s, err, got, dirOk };
  }

  // ---- 常見錯誤提示（只在分數不到 70 時出現）----
  // regrade(target)：拿同一筆畫改跟別的調型比（用來偵測「照錄音畫成變調」）
  function advise(g, target, syl, val, sp, regrade) {
    if (g.why || g.s >= .7) return "";
    if (sp && sp.changed && regrade && regrade(contourOf(sp.val)).s >= .7) return `你畫的是聽到的變調 ${sp.val}；這裡要照課本拼音的本調 ${sp.base} 畫。`;
    const got = g.got, n = got.length, a = got[0], b = got[n - 1];
    const lo = Math.min(...got), mid = got.indexOf(lo);
    const flatT = target.every(x => x === target[0]);
    const dirT = Math.sign(target.at(-1) - target[0]), slope = b - a;
    const dip = mid > 1 && mid < n - 2 && a - lo > 1 && b - lo > 1;   // 先降再升的 V 字
    const name = toneName(target);
    if (dip && markOf(syl) === "ˇ" && val === "11") return "客語的 ˇ 不是華語第三聲！這裡的 ˇ 是低平 11，畫一條低低的平線就好。";
    if (dip && flatT) return `這個字是${name}，不用先降再升，畫一條平線就好。`;
    if (dip) return `不用先降再升：${val} 是一路${dirT > 0 ? "往上" : "往下"}。`;
    if (dirT !== 0 && Math.sign(slope) === -dirT && Math.abs(slope) >= .6) return `方向反了：${val} 是由${dirT > 0 ? "低往高" : "高往低"}。`;
    if (dirT !== 0 && Math.abs(slope) < .6) return `要畫出${dirT > 0 ? "上升" : "下降"}：從 ${target[0]} 畫到 ${target.at(-1)}。`;
    if (flatT && Math.abs(slope) >= 1) return `這個字是${name}，不用升降，畫平的就好。`;
    const avgG = got.reduce((x, y) => x + y, 0) / n, avgT = target.reduce((x, y) => x + y, 0) / target.length;
    if (Math.abs(avgG - avgT) > 1) { const lo = Math.min(...target), hi = Math.max(...target); return `形狀對了，但${avgG > avgT ? "太高" : "太低"}了：這個字${lo === hi ? `在 ${lo} 那條線` : `在 ${lo}～${hi} 之間`}。`; }
    return "";
  }

  window.TONE = { TONES, SANDHI, markOf, baseOf, toneKey, toneValue, spoken, contourOf, targetAt, toneName, grade, advise };
})();
