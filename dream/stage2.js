// 第二關：封印殭屍王。一隻殭屍＝一個詞，照順序畫出每個字的聲調（本調），全部畫對殭屍才消失。
// 三波：二字詞 → 三字詞 → 殭屍王自己上場（四字詞）。分數 = 30 × 每個字「第一次方向畫對」的精準度平均，算到小數點後兩位。
// 畫錯方向不扣分、要重畫，殭屍往前跳一步；計時只在作答時走（教學、動畫、對話時暫停），只拿來排名。
// 依賴：dream1.html 的 $、st、esc、IC、DSFX、timer、story、fitCanvas；tone.js 的 TONE；fireworks_data.js 的 FW_WORDS
(function () {
  const S2 = window.S2 = { words: [], wi: 0, si: 0, seals: [], miss: 0, step: 0, busy: false, active: false, practice: null };
  const TOTAL = 30, PLAN = [2, 3, 4], MAXSTEP = 3;
  const bg = new Image(), zImg = new Image(), bossImg = new Image();
  bg.src = "dream/bg2_night.png"; zImg.src = "dream/zombie.png"; bossImg.src = "dream/boss.png";   // 殭屍王只在第三波出場
  const LV = () => st.level;

  // ---------- 抽詞：依字數由短到長，各一個 ----------
  const wordKey = w => w.h.join("").normalize("NFC");
  function pickWords() {
    const bank = FW_WORDS[st.dialect] || FW_WORDS["四縣腔"];
    const ids = new Set(), words = new Set(), out = [];
    for (const n of PLAN) {
      const pool = bank.filter(w => w.h.length === n && !ids.has(w.id) && !words.has(wordKey(w)));
      const w = pool[Math.floor(Math.random() * pool.length)];
      if (w) {
        ids.add(w.id);
        words.add(wordKey(w));
        out.push(w);
      }
    }
    return out;
  }
  const sylInfo = (w, i) => {
    const sp = TONE.spoken(st.dialect, w, i);
    return { ch: w.h[i], syl: w.p[i], sp, target: TONE.contourOf(sp.base) };
  };

  // ---------- 場景繪製：夜晚校園、後方的殭屍王、前方要封印的殭屍 ----------
  const cv = () => $("s2Scene"), ctx = () => cv().getContext("2d");
  const WALK_SEC = 15;                               // 每隻殭屍（含殭屍王）走到面前都是 15 秒，不分字數、不分難度（只在作答時走）
  let zState = { x: 160, near: 168, dist: 0, alpha: 1, scale: 1, gone: false, rise: 1 };
  // 殭屍王出場特效：dark＝熄燈程度、rift＝地上的紫色裂縫張開程度、motes＝往上飄的紫色光點
  // skip＝玩家在出場動畫中點一下：剩下的動畫直接跳到結尾，不讓玩家被動畫卡住
  const ent = { dark: 0, rift: 0, motes: [], skip: false, titleAnim: null };
  const tween = (ms, fn) => new Promise(done => {
    const t0 = performance.now();
    const step = now => { const k = ent.skip ? 1 : Math.min(1, (now - t0) / ms); fn(k); if (k < 1) requestAnimationFrame(step); else done(); };
    requestAnimationFrame(step);
  });
  const easeOut = k => 1 - Math.pow(1 - k, 3);
  const wait = ms => new Promise(r => setTimeout(r, ms));
  function drawRift(c, S, t, x, foot, sc) {
    const r = ent.rift, rx = 44 * r * Math.max(.7, sc), ry = 8 * r * Math.max(.7, sc);
    const g = c.createRadialGradient(x * S, foot * S, 0, x * S, foot * S, rx * 1.6 * S);
    g.addColorStop(0, `rgba(196,140,255,${.75 * r})`); g.addColorStop(.45, `rgba(120,60,200,${.45 * r})`); g.addColorStop(1, "rgba(60,20,120,0)");
    c.fillStyle = g; c.fillRect((x - rx * 1.6) * S, (foot - rx) * S, rx * 3.2 * S, rx * 2 * S);
    // 裂縫本體：一圈一圈像素方塊
    for (let n = 0; n < 40; n++) {
      const a = n / 40 * Math.PI * 2 + t / 700;
      const px = Math.round(x + Math.cos(a) * rx), py = Math.round(foot + Math.sin(a) * ry);
      c.fillStyle = n % 3 ? "#2a1450" : "#d9b8ff"; c.fillRect(px * S, py * S, S * 2, S);
    }
    c.fillStyle = "#12061f"; c.beginPath(); c.ellipse(x * S, foot * S, rx * .8 * S, ry * .7 * S, 0, 0, Math.PI * 2); c.fill();
    // 往上飄的光點
    if (Math.random() < .5 * r) ent.motes.push({ x: x + (Math.random() - .5) * rx * 1.6, y: foot, v: 12 + Math.random() * 24, life: 1 });
    ent.motes = ent.motes.filter(m => (m.life -= .012) > 0);
    for (const m of ent.motes) { m.y -= m.v / 60; c.fillStyle = `rgba(217,184,255,${m.life.toFixed(2)})`; c.fillRect(Math.round(m.x) * S, Math.round(m.y) * S, S, S); }
  }
  function draw(t) {
    if ($("stage2").hidden || !bg.complete || !bg.naturalWidth) return;
    const dpr = window.devicePixelRatio || 1;
    const portrait = matchMedia("(orientation: portrait), (max-width: 899px)").matches;
    const S = Math.max(1, portrait ? Math.floor((innerWidth - 24) * dpr / 320) : Math.floor(Math.min(innerWidth * dpr / 320, innerHeight * dpr / 180)));
    fitCanvas(cv(), 320 * S, 180 * S, dpr);
    const c = ctx(); c.imageSmoothingEnabled = false;
    c.drawImage(bg, 0, 0, 320 * S, 180 * S);
    // 目前的殭屍（第三波換成殭屍王）：由遠到近。dist 0＝遠處（小、靠後），1＝走到前面（停住等你，不扣分）
    const isBossWave = S2.wi === 2 && S2.active;
    const img = isBossWave ? bossImg : zImg;
    const dt = Math.min(.05, (t - (zState.lastT || t)) / 1000); zState.lastT = t;
    if (S2.active && !S2.busy && timer.on && !zState.caught) {
      zState.dist = Math.min(1, zState.dist + dt * (zState.rate || 0));
      if (zState.dist >= 1 && S2.words[S2.wi]) caught();          // 走到面前還沒封印完：這隻沒分數
    }
    $("s2Stage").classList.toggle("danger", S2.active && !S2.busy && $("story").hidden && !zState.caught && !zState.gone && zState.dist > .75);
    if (ent.dark > 0) { c.fillStyle = `rgba(18,8,40,${ent.dark.toFixed(3)})`; c.fillRect(0, 0, 320 * S, 180 * S); }
    if (img.complete && !zState.gone && S2.active) {
      const d = zState.dist, hop = S2.busy ? 0 : Math.abs(Math.sin(t / 260)) * (2 + 2 * d);
      const foot = 118 + (zState.near - 118) * d;      // 腳的位置：遠處 118 → 前面 near
      const sc = (.42 + .58 * d) * zState.scale;       // 遠小近大
      const w = img.width, h = img.height;
      if (ent.rift > 0) drawRift(c, S, t, zState.x, foot, sc);
      c.save();
      if (zState.rise < 1) { c.beginPath(); c.rect(0, 0, 320 * S, Math.round(foot * S)); c.clip(); }   // 從裂縫裡升上來：地面以下不畫
      c.globalAlpha = zState.alpha * (.75 + .25 * d);
      // 被金光打到：左右抖＋一下閃白（0.45 秒）
      const hp = (t - (zState.hitT || -1e9)) / 450, hit = hp >= 0 && hp < 1;
      const hx = hit ? Math.sin(hp * Math.PI * 9) * 3.5 * (1 - hp) : 0;
      zState.hx = hx;
      c.translate(Math.round((zState.x + hx) * S), Math.round((foot - hop + (1 - zState.rise) * h * sc) * S));
      c.scale(sc, sc);
      if (hit && hp < .3) c.filter = "brightness(2.2) saturate(.4)";
      c.drawImage(img, Math.round(-w / 2 * S), -h * S, w * S, h * S);
      c.filter = "none";
      c.restore();
      // 符紙貼在額頭：位置換成畫面座標，交給 HTML 畫（字比較清楚）
      const r = cv().getBoundingClientRect(), k = r.width / 320;
      const tali = $("s2Tali");
      tali.style.left = (r.left + (zState.x + (zState.hx || 0)) * k) + "px";
      tali.style.top = (r.top + (foot - hop + (1 - zState.rise) * h * sc - h * (isBossWave ? .7 : .78) * sc) * k) + "px";
      tali.style.opacity = zState.rise < 1 ? 0 : zState.alpha;
      tali.style.setProperty("--k", Math.max(.45, Math.min(1.6, k / 4 * (.55 + .45 * d))));
    }
    // 夢境星點
    for (let n = 0; n < 18; n++) {
      const a = .5 + .5 * Math.sin(t / 600 + n * 1.3);
      c.fillStyle = `rgba(255,248,220,${(a * .8).toFixed(2)})`;
      c.fillRect(((n * 53 + 7) % 320) * S, ((n * 29 + 3) % 70) * S, S, S);
    }
  }
  function loop(t) { draw(t); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);

  // ---------- 畫面上的詞卡、符紙、HUD ----------
  function renderWord() {
    const w = S2.words[S2.wi]; if (!w) return;
    const cells = w.h.map((ch, i) => {
      const done = S2.seals[i] != null, cur = i === S2.si && !done;
      return `<div class="s2-cell ${done ? "done" : cur ? "cur" : ""}"><span class="h">${esc(ch)}</span><span class="p">${esc(w.p[i])}</span>${done ? `<span class="stamp">封</span><span class="pct">${(S2.seals[i] * 100).toFixed(1)}%</span>` : ""}</div>`;
    }).join("");
    $("s2Cells").innerHTML = cells;
    $("s2Tali").innerHTML = w.h.map((ch, i) => {
      const done = S2.seals[i] != null, cur = i === S2.si && !done;
      return `<div class="t ${done ? "done" : cur ? "cur" : ""}"><b>${esc(ch)}</b><i>${esc(w.p[i])}</i>${done ? "<em>封</em>" : ""}</div>`;
    }).join("");
    $("s2Tali").hidden = false;
    const k = S2.si, info = sylInfo(w, k);
    $("s2PadTitle").innerHTML = `第 ${k + 1} 字：<b>${esc(info.ch)}</b> <span>${esc(info.syl)}</span>`;
    hint(info);
    $("s2Sandhi").textContent = info.sp.changed ? `作答畫本調 ${info.sp.base}（整個詞唸起來會變成 ${info.sp.val}）` : "";
    $("s2Sign").textContent = `第二關・封印殭屍王・第 ${S2.wi + 1} / 3 波`;
    $("s2Prog").innerHTML = PLAN.map((_, i) => `<i class="${i < S2.wi ? "on" : i === S2.wi ? "now" : ""}"></i>`).join("");
  }
  function hint(info) {
    const t = info.target, a = t[0], b = t.at(-1), name = TONE.toneName(t);
    const chip = $("s2Hint");
    if (LV() === "hard") { chip.hidden = true; return; }
    chip.hidden = false;
    chip.textContent = LV() === "mid" ? info.sp.base : `${t.join(" → ")}　${name}`;
  }
  function score() {
    const all = S2.allSeals; if (!all.length) return 0;
    return Math.round(TOTAL * 100 * all.reduce((x, y) => x + y, 0) / S2.total) / 100;
  }
  function updScore() { $("s2Score").textContent = score().toFixed(2); }

  // ---------- 畫板 ----------
  const pad = () => $("s2PadCv");
  let PW = 280, PH = 220, stroke = [], drawing = false, showTarget = null;
  const yOf = l => PH - 18 - (l - 1) / 4 * (PH - 36), lvlOf = y => 1 + (PH - 18 - y) / (PH - 36) * 4;
  function sizePad() {
    const r = pad().getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1);
    PW = r.width || 280; PH = r.height || 220; pad().width = PW * d; pad().height = PH * d;
    pad().getContext("2d").setTransform(d, 0, 0, d, 0, 0); drawPad();
  }
  function drawPad() {
    const g = pad().getContext("2d"); g.clearRect(0, 0, PW, PH);
    for (let l = 1; l <= 5; l++) {
      g.strokeStyle = l === 1 || l === 5 ? "rgba(255,246,232,.32)" : "rgba(255,246,232,.16)"; g.lineWidth = 1;
      g.beginPath(); g.moveTo(34, yOf(l)); g.lineTo(PW - 10, yOf(l)); g.stroke();
      g.fillStyle = "rgba(255,246,232,.75)"; g.font = "bold 12px 'Noto Sans TC', sans-serif";
      g.fillText(l === 5 ? "5高" : l === 1 ? "1低" : String(l), 6, yOf(l) + 4);
    }
    if (showTarget) {
      g.strokeStyle = "rgba(111,227,161,.9)"; g.lineWidth = 5; g.setLineDash([8, 6]); g.beginPath();
      showTarget.forEach((lv, k) => { const x = 44 + (PW - 68) * k / (showTarget.length - 1); k ? g.lineTo(x, yOf(lv)) : g.moveTo(x, yOf(lv)); });
      g.stroke(); g.setLineDash([]);
    }
    if (stroke.length) {
      g.strokeStyle = "#ffd36b"; g.lineWidth = matchMedia("(pointer: coarse)").matches ? 6 : 4; g.lineCap = "round"; g.lineJoin = "round";
      g.shadowColor = "#ffd36b"; g.shadowBlur = 8; g.beginPath();
      stroke.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y)); g.stroke(); g.shadowBlur = 0;
    }
  }
  const local = e => { const r = pad().getBoundingClientRect(); return [e.clientX - r.left, Math.max(4, Math.min(PH - 4, e.clientY - r.top))]; };
  function bindPad() {
    const p = pad();
    p.addEventListener("pointerdown", e => {
      if (S2.busy || !(S2.active || S2.practice)) return;
      e.preventDefault(); p.setPointerCapture(e.pointerId); drawing = true; showTarget = null; stroke = [local(e)];
      DSFX.hum.start(lvlOf(stroke[0][1])); drawPad();
    });
    p.addEventListener("pointermove", e => { if (!drawing) return; stroke.push(local(e)); DSFX.hum.set(lvlOf(stroke.at(-1)[1])); drawPad(); });
    const end = () => { if (!drawing) return; drawing = false; DSFX.hum.stop(); judge(); };
    p.addEventListener("pointerup", end); p.addEventListener("pointercancel", () => { drawing = false; DSFX.hum.stop(); stroke = []; drawPad(); });
    addEventListener("resize", sizePad);
  }

  // ---------- 判定 ----------
  function fb(text, cls) { const f = $("s2Fb"); f.textContent = text; f.className = "s2-fb " + (cls || ""); }
  function judge() {
    const info = S2.practice || sylInfo(S2.words[S2.wi], S2.si);
    const pts = stroke.map(([x, y]) => [x, lvlOf(y)]);
    const g = TONE.grade(pts, info.target, { minSpan: PW * .35, scale: 4 });
    if (g.why) { DSFX.cancel(); fb("要由左往右畫長一點喔！", "bad"); stroke = []; drawPad(); return; }
    const t = info.target, dirT = Math.sign(t.at(-1) - t[0]);
    if (!g.dirOk || g.s <= 0) {                       // 方向錯：不計分、重畫，殭屍逼近一步
      S2.miss++; DSFX.wrong(); DSFX.shake($("s2Stage"), 1);
      if (!S2.practice) { S2.step = Math.min(MAXSTEP, S2.step + 1); zState.dist = Math.min(1, zState.dist + .18); DSFX.step(); }   // 畫錯：殭屍往前跳一大步
      const way = dirT > 0 ? "從低往高" : dirT < 0 ? "從高往低" : "平平地";
      if (S2.miss === 1) fb("方向反了，再試一次！", "bad");
      else if (S2.miss === 2) fb(`要${way}畫：${t.join(" → ")}`, "bad");
      else { fb("看綠色虛線，照著由左往右畫。", "bad"); showTarget = t; setTimeout(() => { if (!drawing) { showTarget = null; drawPad(); } }, 1600); }
      stroke = []; drawPad(); if (S2.miss >= 3) { showTarget = t; drawPad(); }
      return;
    }
    // 方向對：這個字封印
    const s = g.s, adv = TONE.advise(g, t, info.syl, info.sp.base, info.sp, tt => TONE.grade(pts, tt, { minSpan: PW * .35, scale: 4 }));
    fb(`方向正確！精準度 ${(s * 100).toFixed(1)}%${adv ? "　" + adv : ""}`, s >= .7 ? "ok" : "mid");
    showTarget = t; drawPad();
    DSFX.stamp();
    if (S2.practice) { S2.practice = null; S2.busy = true; setTimeout(() => { stroke = []; showTarget = null; drawPad(); S2.busy = false; S2.onPracticeDone && S2.onPracticeDone(); }, 900); return; }
    S2.seals[S2.si] = s; S2.allSeals.push(s); updScore();
    // 金光沿筆跡飛向額頭的符（用一道光點簡化）
    flyLight();
    S2.miss = 0; S2.busy = true; timer.pause();
    setTimeout(() => {
      stroke = []; showTarget = null; drawPad();
      const w = S2.words[S2.wi];
      S2.si++;
      if (S2.si >= w.h.length) sealZombie();
      else { S2.busy = false; timer.resume(); renderWord(); fb(""); }
    }, 750);
    renderWord();
  }
  function flyLight() {
    const pr = pad().getBoundingClientRect(), tr = $("s2Tali").getBoundingClientRect();
    const d = document.createElement("div"); d.className = "s2-light";
    d.style.left = (pr.left + pr.width / 2) + "px"; d.style.top = (pr.top + pr.height / 2) + "px";
    document.body.appendChild(d);
    d.animate([{ transform: "translate(0,0) scale(1)", opacity: 1 }, { transform: `translate(${tr.left + tr.width / 2 - pr.left - pr.width / 2}px,${tr.top + tr.height / 2 - pr.top - pr.height / 2}px) scale(.4)`, opacity: .2 }], { duration: 380, easing: "ease-in" }).onfinish = () => { d.remove(); zState.hitT = performance.now(); DSFX.shake($("s2Stage"), .5); };
  }
  // 殭屍走到面前還沒封印完：這個詞整隻不算分（已經蓋好的字也不算），換下一波
  function caught() {
    const w = S2.words[S2.wi];
    zState.caught = true; S2.busy = true; timer.pause(); drawing = false; DSFX.hum.stop(); stroke = []; showTarget = null; drawPad();
    if (S2.si > 0) S2.allSeals.splice(-S2.si);       // 這隻已經蓋好的字也收回
    updScore();
    DSFX.caught(); DSFX.flash("#ff6b6b", 280); DSFX.shake($("s2Stage"), 2); hitFrame();
    fb(`「${w.h.join("")}」沒在時間內封印……這隻沒有分數`, "bad");
    $("s2Tali").hidden = true;
    const start = performance.now(), sc0 = zState.scale;
    const anim = t => {
      const k = Math.min(1, (t - start) / 1000);
      zState.scale = sc0 * (1 + .25 * Math.sin(Math.min(1, k * 2) * Math.PI / 2));   // 往前撲
      zState.alpha = k < .5 ? 1 : 1 - (k - .5) * 2;                                   // 再變成煙消失
      if (k < 1) requestAnimationFrame(anim);
      else {
        zState.gone = true;
        S2.log.push({ w, seals: w.h.map(() => 0), failed: true });
        S2.wi++; renderProgress();
        setTimeout(nextWave, 1300);
      }
    };
    requestAnimationFrame(anim);
  }
  // 被碰到：紅框從畫面四邊往內收，再退掉
  function hitFrame() {
    const f = document.createElement("div"); f.className = "s2-hit"; $("stage2").appendChild(f);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    f.animate(reduce
      ? [{ opacity: 0 }, { opacity: 1, offset: .2 }, { opacity: 0 }]
      : [{ boxShadow: "inset 0 0 0 0 #e53935, inset 0 0 0 0 #ff8a80aa", opacity: 1 },
         { boxShadow: "inset 0 0 0 14vmin #e53935cc, inset 0 0 0 20vmin #ff8a8055", opacity: 1, offset: .35 },
         { boxShadow: "inset 0 0 0 6vmin #e5393599, inset 0 0 0 10vmin #ff8a8033", opacity: .9, offset: .6 },
         { boxShadow: "inset 0 0 0 0 #e5393500, inset 0 0 0 0 #ff8a8000", opacity: 0 }],
      { duration: 1100, easing: "ease-out" }).onfinish = () => f.remove();
  }
  // 整隻封印：符紙發金光、殭屍縮成紫煙；第一關拿到越多符紙，金光越華麗（不加分）
  function sealZombie() {
    const w = S2.words[S2.wi];
    DSFX.seal(); DSFX.flash("#fff2b0", 300);
    $("s2Tali").classList.add("glow"); $("s2Tali").style.setProperty("--fu", Math.min(7, st.fu));
    burst(Math.max(6, 6 + st.fu * 4));
    const start = performance.now();
    const anim = t => {
      const k = Math.min(1, (t - start) / 900);
      zState.alpha = 1 - k; zState.scale = 1 - k * .6;
      if (k < 1) requestAnimationFrame(anim);
      else {
        zState.gone = true; $("s2Tali").hidden = true; $("s2Tali").classList.remove("glow");
        const avg = S2.seals.reduce((a, b) => a + b, 0) / S2.seals.length;
        fb(`「${w.h.join("")}」封印成功！平均 ${(avg * 100).toFixed(2)}%`, "ok");
        S2.log.push({ w, seals: S2.seals.slice() });
        S2.wi++;
        renderProgress();
        setTimeout(nextWave, 1100);
      }
    };
    requestAnimationFrame(anim);
  }
  function burst(n) {
    const r = $("s2Tali").getBoundingClientRect();
    for (let i = 0; i < n; i++) {
      const p = document.createElement("i"); p.className = "s2-spark";
      p.style.left = (r.left + r.width / 2) + "px"; p.style.top = (r.top + r.height / 2) + "px";
      document.body.appendChild(p);
      const a = Math.random() * Math.PI * 2, d = 60 + Math.random() * 120;
      p.animate([{ transform: "translate(0,0)", opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px,${Math.sin(a) * d}px)`, opacity: 0 }], { duration: 700 + Math.random() * 400, easing: "ease-out" }).onfinish = () => p.remove();
    }
  }
  function renderProgress() { $("s2Prog").innerHTML = PLAN.map((_, i) => `<i class="${i < S2.wi ? (S2.log[i] && S2.log[i].failed ? "x" : "on") : i === S2.wi ? "now" : ""}"></i>`).join(""); }

  // ---------- 波次 ----------
  async function nextWave() {
    if (S2.wi >= S2.words.length) return S2.onDone && S2.onDone();
    const w = S2.words[S2.wi], boss = S2.wi === 2;
    S2.si = 0; S2.seals = []; S2.miss = 0; S2.step = 0; S2.busy = true;
    zState = { x: 160, near: boss ? 174 : 168, dist: 0, alpha: 1, scale: 1, gone: false, rise: 1, caught: false, rate: 0 };
    if (!boss) { ent.dark = 0; ent.rift = 0; }
    fb("");
    // 殭屍王最後才現身：前兩波只聽得到聲音（？？？），第三波才露臉、報上名字
    if (boss) await bossEntrance();
    else if (S2.wi === 0) { DSFX.wave(); await story([{ who: "？？？", text: "呼啊……被你吵醒了。去吧，小的們！" }]); }
    else { DSFX.wave(); await new Promise(r => setTimeout(r, 500)); }   // 第 2 波不再停下來講話（刷榜時比較順），只有音效
    zState.rate = (1 - zState.dist) / WALK_SEC;   // 不管從哪裡出發，走到面前的秒數都一樣
    DSFX.hop();
    renderWord(); sayWord();
    S2.busy = false; timer.resume();
  }
  // 殭屍王出場：熄燈 → 地上裂開 → 從裂縫升起 → 落地震動 → 名牌橫掃 → 開口
  async function bossEntrance() {
    const stage = $("s2Stage");
    zState.dist = .5; zState.rise = 0; ent.rift = 0; ent.motes = [];   // 一出場就比小殭屍大
    BGM.stop(.8);                                      // 熄燈：音樂先停，殭屍王報完名再放加強版
    await tween(700, k => { ent.dark = .6 * k; });
    await story([{ who: "？？？", text: "哼！小的們都不中用……" }]);
    S2.active = true;
    // 從這裡開始，點畫面（或按 Enter／空白鍵）就跳過出場動畫和字卡
    ent.skip = false;
    const skip = e => { if (e.type === "keydown" && e.key !== "Enter" && e.key !== " ") return; ent.skip = true; if (ent.titleAnim) ent.titleAnim.finish(); };
    addEventListener("pointerdown", skip); addEventListener("keydown", skip);
    DSFX.vortex(); DSFX.shake(stage, .8);
    await tween(700, k => { ent.rift = easeOut(k); });
    DSFX.boss();
    const rumble = setInterval(() => DSFX.shake(stage, .5), 260);
    await tween(1600, k => { zState.rise = easeOut(k); });
    clearInterval(rumble);
    DSFX.stamp(); DSFX.boss(); DSFX.flash("#d9b8ff", 320); DSFX.shake(stage, 2.2);
    dust();
    tween(600, k => { ent.rift = 1 - k; });
    await bossTitle();
    BGM.play("boss");
    await tween(500, k => { ent.dark = .6 - .35 * k; });
    removeEventListener("pointerdown", skip); removeEventListener("keydown", skip); ent.skip = false;
    await story([{ who: "貪睡殭屍王", text: "本王親自上場啦！" }]);
  }
  // 落地揚起的灰塵（HTML 粒子，跟封印的光點一樣做法）
  function dust() {
    const r = cv().getBoundingClientRect(), k = r.width / 320;
    const foot = 118 + (zState.near - 118) * zState.dist;
    for (let n = 0; n < 26; n++) {
      const p = document.createElement("i"); p.className = "s2-dust";
      p.style.left = (r.left + zState.x * k) + "px"; p.style.top = (r.top + foot * k) + "px";
      p.style.width = p.style.height = Math.max(4, Math.round(3 * k)) + "px"; p.style.boxShadow = `${Math.round(k)}px ${Math.round(k)}px 0 #9b86b8`;
      document.body.appendChild(p);
      const dir = n % 2 ? 1 : -1, dx = dir * (30 + Math.random() * 140), dy = -(10 + Math.random() * 50);
      p.animate([{ transform: "translate(-50%,-50%) scale(1)", opacity: .9 }, { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(2.2)`, opacity: 0 }],
        { duration: 700 + Math.random() * 500, easing: "ease-out" }).onfinish = () => p.remove();
    }
  }
  // 名牌：一條深紫色帶子從左邊掃進來，金字「貪睡殭屍王」，停一下再往右掃出去
  function bossTitle() {
    const el = document.createElement("div"); el.className = "s2-boss-title";
    el.innerHTML = `<div class="band"><div class="in"><img class="face" src="dream/boss_face.png" alt=""><div><small>夢境之主・BOSS</small><b>貪睡殭屍王</b></div></div></div>`;
    $("stage2").appendChild(el);
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const band = el.querySelector(".band");
    const a = band.animate(reduce
      ? [{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .85 }, { opacity: 0 }]
      : [{ transform: "translateX(-110%) skewX(-12deg)", easing: "cubic-bezier(.2,.8,.2,1)" },
         { transform: "translateX(0) skewX(-12deg)", offset: .24 },                                   // 0.45 秒掃到正中間
         { transform: "translateX(0) skewX(-12deg)", offset: .76, easing: "cubic-bezier(.6,0,.9,.4)" }, // 正中間停 1 秒
         { transform: "translateX(115%) skewX(-12deg)" }],                                             // 0.45 秒掃出去
      { duration: 1900 });
    ent.titleAnim = a;
    if (ent.skip) a.finish();
    else setTimeout(() => DSFX.wave(), 250);
    return a.finished.then(() => { ent.titleAnim = null; el.remove(); });
  }
  function sayWord() {
    const w = S2.words[S2.wi]; if (!w || !w.s) return;
    const a = new Audio(w.s); a.play().catch(() => {});
  }

  // ---------- 對外 ----------
  // 測試用：直接跳到第 n 波（0、1、2；2＝殭屍王），例如在主控台打 S2.debugWave(2)
  S2.debugDist = d => { zState.dist = d; };
  S2.debugHit = () => { zState.hitT = performance.now(); };   // 測試用：殭屍被金光打到的抖動   // 測試用：把殭屍直接移到某個距離（1＝走到面前）
  S2.debugWave = n => { S2.onPracticeDone = null; S2.wi = n; S2.si = 0; S2.active = true; $("s2Listen").hidden = false; nextWave(); };
  S2.start = async function (onDone) {
    S2.onDone = onDone;
    Object.assign(S2, { words: pickWords(), wi: 0, si: 0, seals: [], allSeals: [], log: [], miss: 0, step: 0, busy: true, active: false });
    S2.total = S2.words.reduce((n, w) => n + w.h.length, 0);
    $("s2FuN").textContent = st.fu; updScore(); renderProgress();
    $("s2Tali").hidden = true; $("s2Cells").innerHTML = ""; $("s2PadTitle").textContent = "練習"; fb("");
    $("s2Listen").hidden = true;                        // 練習時還沒有詞可以聽
    sizePad();
    // 教學：用一個不計分的字練習一次（計時暫停）
    await story([{ who: "神秘同學（從符紙裡傳來的聲音）", text: "別慌！聆聽聲音，把聲調畫出來，就能把殭屍封起來！" }]);
    const bank = FW_WORDS[st.dialect] || FW_WORDS["四縣腔"];
    const ids = new Set(S2.words.map(w => w.id)), words = new Set(S2.words.map(wordKey));
    const practicePool = bank.filter(w => !ids.has(w.id) && !words.has(wordKey(w)));
    const pw = practicePool.find(w => w.h.length === 2) || practicePool[0];
    if (pw) {
      S2.practice = sylInfo(pw, 0);
      $("s2PadTitle").innerHTML = `練習：<b>${esc(S2.practice.ch)}</b> <span>${esc(S2.practice.syl)}</span>`;
      hint(S2.practice);
      $("s2Sandhi").textContent = "";
      $("s2Cells").innerHTML = `<div class="s2-tip">先在<span class="pc-only">右邊</span><span class="m-only">下面</span>的框框練習一次：<br>看音高線，<b>由左往右</b>畫出這個字的聲調。</div>`;
      showTarget = S2.practice.target; drawPad();
      fb("照綠色虛線畫畫看！", "mid");
      S2.busy = false;                                   // 開放畫板（練習不計時）
      await new Promise(r => { S2.onPracticeDone = r; });
      await story([{ who: "神秘同學（從符紙裡傳來的聲音）", text: "對，就是這樣！方向畫對，就能蓋上「封」印。" }]);
    }
    S2.active = true; $("s2Listen").hidden = false;
    nextWave();
  };
  S2.score = score;
  S2.replayWord = sayWord;
  bindPad();
})();
