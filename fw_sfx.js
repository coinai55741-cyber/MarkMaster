// 煙火小遊戲共用音效（Web Audio 即時合成，不用音檔）＋ 玩法說明／靜音按鈕
//   SFX.whoosh(x, len)     升空咻聲；x 決定左右聲道
//   SFX.boom(power, x)     炸開：低音砰＋劈啪聲，power 0~1 決定大小
//   SFX.fizz(x)            啞炮：噗嘶
//   SFX.ding(level)        答對：0 普通、1 很好、2 完美（連續完美音會越來越高）
//   SFX.buzz()             答錯
//   SFX.tap() / SFX.pop()  按鈕、選取
//   SFX.count(last)        倒數嗶，last=true 是最後一聲「開始」
//   SFX.fuse()             點引信的嘶嘶聲
//   SFX.tick()             時間快到的滴答
//   SFX.fanfare()          結算號角
//   SFX.hum.start(lvl) / .set(lvl) / .stop()   畫聲調時跟著高低變化的音（lvl 1~5）
//   FWX.mount({ title, steps, tips })          右下角放「❓ 玩法」「🔊」按鈕，回傳 { open(onClose) }
//   FWX.firstHelp(fn)      第一次開始前先跳玩法說明，按「知道了」才開始
(function () {
  let ac = null, master = null, noiseBuf = null, lastBoom = 0, streak = 0;
  let muted = false;
  try { muted = localStorage.getItem("fw-muted") === "1"; } catch (e) {}

  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ac = new AC();
      master = ac.createGain(); master.gain.value = muted ? 0 : .8;
      const comp = ac.createDynamicsCompressor();   // 很多煙火同時炸也不爆音
      master.connect(comp).connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  // 瀏覽器要使用者先互動才能出聲：第一次點擊就解鎖
  addEventListener("pointerdown", ctx, { capture: true });
  addEventListener("keydown", ctx, { capture: true });

  const panOf = x => (typeof x === "number" && window.FW && FW.W ? Math.max(-.8, Math.min(.8, (x / FW.W) * 2 - 1)) : 0);
  function out(pan) {
    if (!ac.createStereoPanner) return master;
    const p = ac.createStereoPanner(); p.pan.value = pan; p.connect(master); return p;
  }
  function env(g, t, a, peak, d) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
  }
  function noise(t, dur, filterType, f0, f1, peak, a, dest, q = 1) {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = filterType; f.Q.value = q;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); env(g, t, a, peak, dur);
    s.connect(f).connect(g).connect(dest);
    s.start(t, Math.random()); s.stop(t + a + dur + .05);
  }
  function tone(t, freq, dur, type = "sine", peak = .2, dest = master, a = .005, glideTo) {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + dur);
    const g = ac.createGain(); env(g, t, a, peak, dur);
    o.connect(g).connect(dest); o.start(t); o.stop(t + a + dur + .05);
  }

  const SFX = {
    whoosh(x, len = .55) {
      if (!ctx()) return; const t = ac.currentTime, d = out(panOf(x));
      noise(t, len, "bandpass", 500, 3200, .25, .05, d, 4);
      tone(t, 300, len, "sine", .04, d, .05, 900);
    },
    boom(power = 1, x) {
      if (!ctx()) return; const t = ac.currentTime;
      if (t - lastBoom < .04) return; lastBoom = t;
      const p = Math.max(.15, power), d = out(panOf(x));
      tone(t, 110, .5 + .5 * p, "sine", .55 * p, d, .004, 38);                // 低音砰
      noise(t, .35 + .6 * p, "lowpass", 1800 * p + 400, 120, .5 * p, .003, d);  // 爆炸氣流
      const n = Math.round(6 + 26 * p);                                         // 劈啪
      for (let i = 0; i < n; i++) {
        const tt = t + .12 + Math.random() * (.4 + .9 * p);
        noise(tt, .03 + Math.random() * .03, "highpass", 2500 + Math.random() * 4000, 2000, .12 * Math.random() + .04, .001, d);
      }
    },
    fizz(x) {
      if (!ctx()) return; const t = ac.currentTime, d = out(panOf(x));
      noise(t, .45, "bandpass", 1600, 300, .25, .01, d, 2);
      tone(t, 260, .3, "triangle", .08, d, .005, 90);
    },
    ding(level = 0) {
      if (!ctx()) return; const t = ac.currentTime;
      streak = level >= 2 ? streak + 1 : 0;
      const up = Math.pow(2, Math.min(streak, 6) / 12);   // 連續完美，一次升半音
      const notes = [[784], [659, 988], [784, 988, 1319]][Math.max(0, Math.min(2, level))];
      notes.forEach((f, i) => { tone(t + i * .07, f * up, .35, "triangle", .18); tone(t + i * .07, f * 2 * up, .2, "sine", .05); });
    },
    buzz() {
      if (!ctx()) return; streak = 0; const t = ac.currentTime;
      tone(t, 160, .28, "square", .08); tone(t, 167, .28, "square", .08);
    },
    tap() { if (!ctx()) return; tone(ac.currentTime, 1100, .05, "sine", .12); },
    pop() { if (!ctx()) return; const t = ac.currentTime; tone(t, 520, .08, "sine", .18, master, .003, 900); },
    count(last) { if (!ctx()) return; const t = ac.currentTime; last ? (tone(t, 1320, .25, "triangle", .2), tone(t, 1760, .25, "sine", .08)) : tone(t, 880, .1, "triangle", .18); },
    fuse() { if (!ctx()) return; const t = ac.currentTime; noise(t, .38, "highpass", 3000, 6000, .12, .02, master); },
    tick() { if (!ctx()) return; tone(ac.currentTime, 2000, .03, "square", .05); },
    fanfare() {
      if (!ctx()) return; const t = ac.currentTime;
      [523, 659, 784, 1047].forEach((f, i) => tone(t + i * .12, f, i === 3 ? .7 : .2, "triangle", .2));
      tone(t + .36, 1568, .7, "sine", .06);
    },
    hum: {
      o: null, g: null,
      freq: lvl => 196 * Math.pow(2, (Math.max(.5, Math.min(5.5, lvl)) - 1) / 4),   // 1~5 → 約 196~392 Hz
      start(lvl) {
        if (!ctx()) return; this.stop();
        const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
        o.type = "sawtooth"; f.type = "lowpass"; f.frequency.value = 1400;
        o.frequency.value = this.freq(lvl); g.gain.value = 0;
        g.gain.setTargetAtTime(.07, ac.currentTime, .02);
        o.connect(f).connect(g).connect(master); o.start();
        this.o = o; this.g = g;
      },
      set(lvl) { if (this.o) this.o.frequency.setTargetAtTime(this.freq(lvl), ac.currentTime, .015); },
      stop() { if (!this.o) return; const o = this.o; this.g.gain.setTargetAtTime(0, ac.currentTime, .03); setTimeout(() => o.stop(), 200); this.o = null; },
    },
    get muted() { return muted; },
    setMuted(m) {
      muted = m;
      try { localStorage.setItem("fw-muted", m ? "1" : "0"); } catch (e) {}
      if (master) master.gain.value = m ? 0 : .8;
    },
  };
  window.SFX = SFX;

  // ---- 右下角的「玩法」與「靜音」按鈕 ----
  const css = `
  .fwx-bar { position: fixed; right: 12px; bottom: 12px; display: flex; gap: 8px; z-index: 12; }
  .fwx-bar button { border: 1px solid var(--tile-line, #3f4f92); background: rgba(24,34,74,.85); color: var(--ink, #f5f1e6);
    font: inherit; font-size: 15px; height: 40px; min-width: 40px; padding: 0 12px; border-radius: 999px; cursor: pointer; }
  .fwx-bar button:hover { border-color: var(--gold, #ffd36b); }
  .fwx-help { z-index: 13; }
  .fwx-help .card { text-align: left; }
  .fwx-help h2 { margin: 0 0 10px; font-size: 22px; text-align: center; }
  .fwx-help ol { margin: 0 0 12px; padding-left: 1.4em; line-height: 1.8; }
  .fwx-help li b { color: var(--gold, #ffd36b); }
  .fwx-help .tips { font-size: 14px; color: var(--muted, #aab3d6); line-height: 1.7; margin: 0 0 16px; }
  .fwx-help .go { display: block; margin: 0 auto; }`;
  const FWX = { paused: false, _first: true };
  FWX.mount = function ({ title, steps, tips = [] }) {
    const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
    const bar = document.createElement("div"); bar.className = "fwx-bar";
    bar.innerHTML = `<button type="button" class="fwx-q" aria-label="玩法說明">❓ 玩法</button><button type="button" class="fwx-m"></button>`;
    document.body.appendChild(bar);
    const m = bar.querySelector(".fwx-m");
    const paint = () => { m.textContent = SFX.muted ? "🔇" : "🔊"; m.setAttribute("aria-label", SFX.muted ? "開啟音效" : "關閉音效"); };
    paint();
    m.onclick = e => { e.stopPropagation(); SFX.setMuted(!SFX.muted); paint(); if (!SFX.muted) SFX.tap(); };
    const panel = document.createElement("div"); panel.className = "panel fwx-help"; panel.hidden = true;
    panel.innerHTML = `<div class="card"><h2>${title}</h2><ol>${steps.map(s => `<li>${s}</li>`).join("")}</ol>` +
      (tips.length ? `<p class="tips">${tips.join("<br>")}</p>` : "") + `<button class="btn go" type="button">知道了</button></div>`;
    document.body.appendChild(panel);
    let after = null;
    const close = () => {
      if (panel.hidden) return;
      panel.hidden = true; FWX.paused = false; SFX.tap();
      FWX.onResume && FWX.onResume();
      const f = after; after = null; f && f();
    };
    panel.querySelector(".go").onclick = close;
    panel.addEventListener("pointerdown", e => { e.stopPropagation(); if (e.target === panel) close(); });
    addEventListener("keydown", e => { if (!panel.hidden && (e.code === "Escape" || e.code === "Enter" || e.code === "Space")) { e.preventDefault(); e.stopImmediatePropagation(); close(); } }, true);
    FWX.open = function (onClose) {
      after = onClose || null; panel.hidden = false; FWX.paused = true;
      FWX.onPause && FWX.onPause();
      panel.querySelector(".go").textContent = onClose ? "知道了，開始！" : "知道了";
    };
    bar.querySelector(".fwx-q").onclick = e => { e.stopPropagation(); SFX.tap(); FWX.open(); };
    return FWX;
  };
  FWX.firstHelp = function (fn) {
    return function () { if (FWX._first && FWX.open) { FWX._first = false; FWX.open(fn); } else fn(); };
  };
  window.FWX = FWX;
})();
