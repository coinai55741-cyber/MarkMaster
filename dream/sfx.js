// 夢境關卡的音效（Web Audio 即時合成，8-bit 復古風，不用音檔、沒有授權問題）。
// 參考 RPG Maker 像素恐怖遊戲（Ib、魔女之家）的「系統音效」做法：游標、決定、取消、錯誤各一種固定的聲音，
// 重要時刻再配畫面震動／閃光；音量刻意放小，避免嚇到人或蓋過客語語音。
//   DSFX.cursor() 滑過／移動選項   DSFX.decide() 按鈕   DSFX.cancel() 返回、關閉
//   DSFX.correct() 答對   DSFX.wrong() 答錯（配合 DSFX.shake）   DSFX.paper() 符紙飄落   DSFX.collect() 符紙進計數
//   DSFX.page() 換題／對話翻頁   DSFX.dream() 夢境轉場   DSFX.crack() 夢境裂開   DSFX.vortex() 被吸走
//   DSFX.caught() 被殭屍碰到   DSFX.hop() 殭屍跳   DSFX.step() 殭屍逼近   DSFX.stamp() 蓋「封」印   DSFX.seal() 整隻封印   DSFX.boss() 殭屍王出場
//   DSFX.wave() 波次開始   DSFX.fanfare() 過關   DSFX.wake() 醒來   DSFX.type() 對話打字
//   DSFX.hum.start(lvl)/set(lvl)/stop() 畫聲調時跟著高低變化的音
//   DSFX.shake(el, power) 畫面震動（尊重「減少動態效果」設定）   DSFX.flash(color) 閃光
//   DSFX.muted / DSFX.setMuted(bool)
(function () {
  let ac = null, master = null, noiseBuf = null, muted = false;
  try { muted = localStorage.getItem("dream-muted") === "1"; } catch (e) {}
  const VOL = 0.32;                        // 整體音量（刻意小聲）
  function ctx() {
    if (!ac) {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      ac = new AC(); master = ac.createGain(); master.gain.value = muted ? 0 : VOL;
      const comp = ac.createDynamicsCompressor(); master.connect(comp).connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  addEventListener("pointerdown", ctx, { capture: true });
  addEventListener("keydown", ctx, { capture: true });
  // 方波／三角波短音（8-bit 感），freqs 可給滑音 [起, 迄]
  function tone(t, f, dur, type = "square", peak = .15, f2) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + .006); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + .02);
  }
  function noise(t, dur, f0, f1, peak = .2, type = "bandpass") {
    const s = ac.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
    const f = ac.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(peak, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(master); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
  }
  const seq = (notes, step, type, peak, dur) => { if (!ctx()) return; const t = ac.currentTime; notes.forEach((f, i) => f && tone(t + i * step, f, dur || step * 1.2, type, peak)); };
  const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

  const DSFX = {
    cursor() { seq([1568], .04, "square", .05); },
    decide() { seq([880, 1320], .05, "square", .08); },
    cancel() { seq([660, 440], .06, "square", .07); },
    type() { if (!ctx()) return; tone(ac.currentTime, 1200 + Math.random() * 300, .02, "square", .025); },
    page() { if (!ctx()) return; noise(ac.currentTime, .12, 2500, 900, .08, "highpass"); },
    correct() { seq([784, 988, 1319, 1568], .07, "triangle", .16, .18); },
    // 被殭屍碰到：重重的「咚！」＋抓到的沙沙聲＋往下滑的失落音
    caught() {
      if (!ctx()) return; const t = ac.currentTime;
      tone(t, 130, .28, "sine", .32, 38);                  // 低沉撞擊
      noise(t, .22, 900, 70, .28, "lowpass");              // 碰撞的悶響
      noise(t + .05, .18, 2400, 900, .08, "bandpass");     // 被抓住的沙沙聲
      tone(t + .22, 466, .55, "square", .08, 117);         // 往下滑「咻——」
      tone(t + .80, 147, .16, "square", .07); tone(t + .98, 110, .3, "square", .07);   // 收尾兩聲「噹、噹」
    },
    wrong() { if (!ctx()) return; const t = ac.currentTime; tone(t, 196, .22, "square", .11, 150); tone(t + .1, 185, .26, "square", .1, 120); },
    paper() { if (!ctx()) return; const t = ac.currentTime; noise(t, .5, 4000, 1500, .05, "highpass"); [1760, 2093, 2637].forEach((f, i) => tone(t + .15 + i * .09, f, .2, "triangle", .05)); },
    collect() { seq([1319, 1760], .05, "square", .07); },
    dream() { if (!ctx()) return; const t = ac.currentTime; tone(t, 220, .7, "triangle", .08, 660); tone(t + .05, 330, .7, "sine", .06, 990); },
    crack() { if (!ctx()) return; const t = ac.currentTime; noise(t, .35, 3000, 300, .25, "bandpass"); tone(t, 110, .4, "square", .12, 55); },
    vortex() { if (!ctx()) return; const t = ac.currentTime; noise(t, 1.2, 200, 3000, .14, "bandpass"); tone(t, 110, 1.2, "sawtooth", .05, 880); },
    hop() { if (!ctx()) return; tone(ac.currentTime, 330, .08, "square", .05, 220); },
    step() { if (!ctx()) return; const t = ac.currentTime; tone(t, 140, .12, "square", .1, 90); noise(t, .1, 400, 150, .1, "lowpass"); },
    stamp() { if (!ctx()) return; const t = ac.currentTime; noise(t, .08, 1200, 300, .2, "lowpass"); tone(t, 523, .12, "square", .08); tone(t + .06, 784, .14, "square", .07); },
    seal() { seq([523, 659, 784, 1047, 1319], .06, "triangle", .14, .2); if (ac) noise(ac.currentTime + .3, .6, 5000, 2000, .05, "highpass"); },
    boss() { if (!ctx()) return; const t = ac.currentTime; tone(t, 98, .5, "square", .12, 82); tone(t + .25, 92, .6, "square", .12, 70); noise(t, .6, 300, 80, .12, "lowpass"); },
    wave() { seq([392, 0, 392, 523], .09, "square", .1); },
    fanfare() { seq([523, 659, 784, 1047, 0, 784, 1047], .1, "square", .1, .16); },
    wake() { seq([1047, 1319, 1568, 2093], .16, "triangle", .08, .5); },
    hum: {
      o: null, g: null,
      freq: l => 220 * Math.pow(2, (Math.max(.5, Math.min(5.5, l)) - 1) / 4),
      start(l) { if (!ctx()) return; this.stop(); const o = ac.createOscillator(), g = ac.createGain(); o.type = "square"; o.frequency.value = this.freq(l); g.gain.value = 0; g.gain.setTargetAtTime(.035, ac.currentTime, .02); o.connect(g).connect(master); o.start(); this.o = o; this.g = g; },
      set(l) { if (this.o) this.o.frequency.setTargetAtTime(this.freq(l), ac.currentTime, .015); },
      stop() { if (!this.o) return; const o = this.o; this.g.gain.setTargetAtTime(0, ac.currentTime, .03); setTimeout(() => o.stop(), 150); this.o = null; },
    },
    // 畫面震動：只左右短暫晃動（像 RPG Maker 的 Shake Screen），開了「減少動態效果」就只閃一下
    shake(el, power = 1) {
      if (!el) return;
      if (reduced()) { el.animate([{ filter: "brightness(1.3)" }, { filter: "none" }], 150); return; }
      const a = 6 * power;
      // 用獨立的 translate 屬性，不蓋掉元素原本的 transform（例如置中用的 translate(-50%,-50%)），震動時才不會跳出原位
      el.animate([{ translate: "0 0" }, { translate: `${-a}px 0` }, { translate: `${a}px 0` }, { translate: `${-a * .6}px 0` }, { translate: `${a * .4}px 0` }, { translate: "0 0" }], { duration: 320, easing: "linear" });
    },
    flash(color = "#fff", ms = 260) {
      const d = document.createElement("div");
      d.style.cssText = `position:fixed;inset:0;z-index:99;pointer-events:none;background:${color}`;
      document.body.appendChild(d);
      d.animate([{ opacity: reduced() ? .3 : .85 }, { opacity: 0 }], { duration: ms, easing: "ease-out" }).onfinish = () => d.remove();
    },
    get muted() { return muted; },
    setMuted(m) { muted = m; try { localStorage.setItem("dream-muted", m ? "1" : "0"); } catch (e) {} if (master) master.gain.value = m ? 0 : VOL; },
  };
  window.DSFX = DSFX;
})();
