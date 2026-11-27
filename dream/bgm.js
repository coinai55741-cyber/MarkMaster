// 背景音樂（Web Audio 即時合成，自己寫的曲子，沒有音檔、沒有授權問題）。
// 三首（另外殭屍王出場後換成加強版）：
//   lobby  ：前導故事、說明頁、醒來、成績頁——午後教室，慢、暖、有點想睡（D 大調五聲音階，lo-fi 搖擺）
//   stage1 ：第一關夢境——神秘、飄，旋律很少，讓出空間給客語語音（A 小調五聲音階，鈴聲琶音＋長音）
//   stage2 ：第二關殭屍——緊張、往前推（D 小調，八分音符低音＋鼓）
//   boss   ：殭屍王出場後——stage2 加快、加鼓、加長音
// 用法：BGM.play("lobby")（同一首不會重來；換曲會交叉淡入淡出）、BGM.stop(秒)、BGM.setMuted(bool)
// 客語語音（任何 <audio>／new Audio() 播放）時自動把音樂壓小，播完再回來。
// 瀏覽器規定要使用者先點一下才能出聲，所以第一次點擊／按鍵後才真正開始。
(function () {
  const VOL = 0.2, DUCK = 0.3;               // 整體音量；語音播放時壓到 30%
  let ac = null, out = null, bus = null, delayIn = null, noiseBuf = null;
  let muted = false, want = null, cur = null;
  try { muted = localStorage.getItem("dream-muted") === "1"; } catch (e) {}

  // ---------- 曲子 ----------
  // 每小節 8 格（八分音符）。音符寫法：D5、F#4、Bb3；「-」延長前一個音；「.」休止
  // bass：R＝根音、O＝高八度根音、5＝五度；comp：c＝和弦；arp：數字＝和弦第幾個音（高八度）；kick／snare／hat：x＝打（h＝小聲）
  const TRACKS = {
    lobby: {
      bpm: 82, swing: .12, lead: "box", padInst: "softpad", bassInst: "bassTri", echo: .32,
      chords: ["D3 F#3 A3 C#4", "B2 D3 F#3 A3", "G2 B2 D3 F#3", "A2 C#3 E3 B3"],
      mel: `F#5 - A5 - B5 A5 F#5 -   E5 - D5 - B4 - - -   D5 - E5 F#5 A5 - F#5 E5   E5 - - - . . . .
            A5 - B5 - D6 - B5 A5    F#5 - - E5 D5 - E5 -  B4 - D5 - E5 - F#5 E5    D5 - - - - - . .`,
      bass: "R - - . . R 5 -", comp: ". . c . . . c .",
      kick: "x . . . . x . .", snare: ". . h . . . h .", hat: "h h h h h h h h",
    },
    stage1: {
      bpm: 92, swing: 0, lead: "flute", padInst: "pad", bassInst: "bassTri", echo: .4, arpInst: "bell",
      chords: ["A2 C3 E3 G3 B3", "F2 A2 C3 E3", "D3 F3 A3 C4 E4", "E2 G2 B2 D3"],
      mel: `. . E5 - - - G5 -   A5 - - - - - . .   . . D5 - E5 - G5 -   E5 - - - - - . .
            . . A5 - C6 - A5 -  G5 - - - E5 - - -  D5 - - - C5 - D5 -  E5 - - - - - - -`,
      bass: "R - - - O - - -", arp: "0 1 2 3 4 3 2 1",
      hat: ". . . h . . . h",
    },
    stage2: {
      bpm: 128, swing: 0, lead: "sq", padInst: "darkpad", bassInst: "bassSq", echo: .18,
      chords: ["D3 F3 A3", "D3 F3 A3", "Bb2 D3 F3", "A2 C#3 E3"],
      mel: `D5 - F5 - G5 - A5 -   C6 - A5 - G5 - F5 -   F5 - G5 - A5 - - -   A5 - - - E5 - C#5 -
            D6 - C6 - A5 - G5 -  A5 - F5 - G5 - D5 -   F5 - D5 - F5 - G5 -   A5 - - - . . . .`,
      bass: "R O R O R O R O",
      kick: "x . . . x . . .", snare: ". . x . . . x .", hat: ". h . h . h . h",
    },
  };
  // 殭屍王：stage2 加快、鼓更密、旋律換成鋸齒波
  TRACKS.boss = Object.assign({}, TRACKS.stage2, {
    bpm: 140, lead: "saw", padInst: "darkpad",
    kick: "x . . x x . . .", snare: ". . x . . . x x", hat: "x h x h x h x h", hat16: true,
    comp: "c . . c . . c .",
  });

  // ---------- 解析 ----------
  const PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = n => { const m = /^([A-G])([#b]?)(-?\d)$/.exec(n); return 12 * (+m[3] + 1) + PC[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0); };
  const hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const toks = s => (s || "").trim().split(/\s+/).filter(Boolean);
  for (const T of Object.values(TRACKS)) {
    T._chords = T.chords.map(c => c.split(" ").map(midi));
    T._mel = toks(T.mel);
    T.bars = T._mel.length / 8;
  }
  const holdLen = (arr, i) => { let n = 1; while (arr[(i + n) % arr.length] === "-" && n < arr.length) n++; return n; };

  // ---------- 音源 ----------
  function ctx() {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ac = new AC();
    out = ac.createGain(); out.gain.value = muted ? 0 : VOL;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    out.connect(comp).connect(ac.destination);
    bus = ac.createGain(); bus.connect(out);
    // 回音（夢的感覺）：送進來的音隔一下重複幾次
    delayIn = ac.createGain();
    const d = ac.createDelay(1), fb = ac.createGain(), lp = ac.createBiquadFilter();
    d.delayTime.value = .36; fb.gain.value = .35; lp.type = "lowpass"; lp.frequency.value = 2400;
    delayIn.connect(d); d.connect(lp).connect(fb).connect(d); lp.connect(bus);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return ac;
  }
  function env(g, t, a, peak, dur, rel) {   // 線性起音、維持、指數收尾
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a);
    g.gain.setValueAtTime(peak, Math.max(t + a, t + dur)); g.gain.exponentialRampToValueAtTime(.0001, Math.max(t + a, t + dur) + rel);
    return Math.max(t + a, t + dur) + rel;
  }
  function osc(type, f, t, end, dest, detune = 0) {
    const o = ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(end + .05); return o;
  }
  // 一個音：kind＝音色，dest＝這首曲子的音量節點，echo＝送多少到回音
  function note(kind, m, t, dur, dest, echo) {
    const f = hz(m), g = ac.createGain();
    g.connect(dest);
    if (echo) { const s = ac.createGain(); s.gain.value = echo; g.connect(s).connect(delayIn); }
    let end;
    switch (kind) {
      case "box": {            // 音樂盒：三角波＋高八度泛音，很快變小
        end = t + 1.4; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16, t + .005); g.gain.exponentialRampToValueAtTime(.0001, end);
        osc("triangle", f, t, end, g); const h = ac.createGain(); h.gain.value = .25; h.connect(g); osc("sine", f * 2, t, end, h); break;
      }
      case "flute": {          // 笛聲：正弦波＋顫音，慢慢進來
        end = env(g, t, .08, .13, dur * .95, .25);
        const o = osc("sine", f, t, end, g), lfo = ac.createOscillator(), lg = ac.createGain();
        lfo.frequency.value = 5; lg.gain.value = f * .006; lfo.connect(lg).connect(o.frequency); lfo.start(t); lfo.stop(end + .05);
        const h = ac.createGain(); h.gain.value = .15; h.connect(g); osc("triangle", f, t, end, h); break;
      }
      case "sq": case "saw": { // 8-bit 主旋律：方波（或鋸齒波）過低通
        const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = kind === "saw" ? 2200 : 2800; lp.connect(g);
        end = env(g, t, .01, kind === "saw" ? .07 : .075, dur * .85, .06);
        osc(kind === "saw" ? "sawtooth" : "square", f, t, end, lp); break;
      }
      case "bell": {           // 鈴：正弦＋不和諧泛音，短
        end = t + .9; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.07, t + .004); g.gain.exponentialRampToValueAtTime(.0001, end);
        osc("sine", f, t, end, g); const h = ac.createGain(); h.gain.value = .3; h.connect(g); osc("sine", f * 3.01, t, t + .3, h); break;
      }
      case "keys": {           // 電鋼琴感的和弦
        end = t + Math.min(dur, .9) + .3; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.045, t + .01); g.gain.exponentialRampToValueAtTime(.0001, end);
        osc("sine", f, t, end, g); const h = ac.createGain(); h.gain.value = .35; h.connect(g); osc("triangle", f * 2, t, end, h); break;
      }
      case "softpad": case "pad": case "darkpad": {   // 長音墊底
        const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = kind === "darkpad" ? 500 : kind === "pad" ? 900 : 1400; lp.connect(g);
        const peak = kind === "softpad" ? .03 : kind === "pad" ? .028 : .035;
        end = env(g, t, kind === "darkpad" ? .15 : .6, peak, dur * .9, .8);
        const type = kind === "softpad" ? "triangle" : "sawtooth";
        osc(type, f, t, end, lp, -7); osc(type, f, t, end, lp, 7); break;
      }
      case "bassTri": { end = env(g, t, .01, .16, dur * .9, .08); osc("triangle", f, t, end, g); break; }
      case "bassSq": {
        const lp = ac.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 700; lp.connect(g);
        end = env(g, t, .005, .09, dur * .6, .04); osc("square", f, t, end, lp); break;
      }
    }
  }
  function drum(kind, t, vel, dest) {
    const g = ac.createGain(); g.connect(dest);
    if (kind === "kick") {
      const o = ac.createOscillator(); o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + .14);
      g.gain.setValueAtTime(.32 * vel, t); g.gain.exponentialRampToValueAtTime(.0001, t + .2); o.connect(g); o.start(t); o.stop(t + .22);
    } else {
      const s = ac.createBufferSource(); s.buffer = noiseBuf; const f = ac.createBiquadFilter();
      const snare = kind === "snare", dur = snare ? .14 : .035;
      f.type = snare ? "bandpass" : "highpass"; f.frequency.value = snare ? 1800 : 7000;
      g.gain.setValueAtTime((snare ? .16 : .045) * vel, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
      s.connect(f).connect(g); s.start(t, Math.random() * .5); s.stop(t + dur + .02);
    }
  }

  // ---------- 播放（每 25ms 往後排 0.2 秒的音）----------
  function stepDur(T, i) { const b = 60 / T.bpm / 2; return T.swing ? b * (i % 2 ? 1 - T.swing : 1 + T.swing) : b; }
  function playStep(p, i, t) {
    const T = p.T, s = i % 8, bar = Math.floor(i / 8) % T.bars, ch = T._chords[bar % T._chords.length];
    const base = 60 / T.bpm / 2, root = ch[0] - 12;
    const span = n => n * base;
    // 旋律
    const mi = i % T._mel.length, mt = T._mel[mi];
    if (mt !== "-" && mt !== ".") note(T.lead, midi(mt), t, span(holdLen(T._mel, mi)), p.g, T.echo);
    // 長音：每小節開頭
    if (s === 0 && T.padInst) for (const m of ch) note(T.padInst, m + 12, t, span(8), p.g, 0);
    // 低音
    const bt = toks(T.bass)[s];
    if (bt && bt !== "-" && bt !== ".") note(T.bassInst, bt === "O" ? root + 12 : bt === "5" ? root + 7 : root, t, span(holdLen(toks(T.bass), s)), p.g, 0);
    // 和弦
    if (toks(T.comp)[s] === "c") for (const m of ch) note("keys", m + 12, t, span(2), p.g, T.echo * .5);
    // 琶音
    const at = toks(T.arp)[s];
    if (at && at !== ".") note(T.arpInst || "bell", ch[+at % ch.length] + 24, t, span(1), p.g, T.echo);
    // 鼓
    for (const k of ["kick", "snare", "hat"]) {
      const d = toks(T[k])[s];
      if (d === "x" || d === "h") drum(k, t, d === "x" ? 1 : .5, p.g);
    }
    if (T.hat16) drum("hat", t + base / 2, .4, p.g);
  }
  function pump(p) {
    if (!ac || ac.state !== "running") return;
    if (p.next < ac.currentTime) p.next = ac.currentTime + .05;   // 分頁切回來時不要一次補一大堆
    while (p.next < ac.currentTime + .2) { playStep(p, p.i, p.next); p.next += stepDur(p.T, p.i); p.i++; }
  }
  function startTrack(name) {
    const T = TRACKS[name]; if (!T || !ctx()) return;
    const g = ac.createGain(), t = ac.currentTime;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1, t + 1.2); g.connect(bus);
    const p = { name, T, g, i: 0, next: t + .08 };
    p.timer = setInterval(() => pump(p), 25); pump(p);
    cur = p;
  }
  function fadeOut(p, sec) {
    if (!p) return; clearInterval(p.timer);
    const t = ac.currentTime; p.g.gain.cancelScheduledValues(t); p.g.gain.setValueAtTime(p.g.gain.value, t); p.g.gain.linearRampToValueAtTime(0, t + sec);
    setTimeout(() => p.g.disconnect(), sec * 1000 + 2500);   // 等已排好的音放完
  }

  // ---------- 語音時壓小 ----------
  const speaking = new Set();
  function applyVol() {
    if (!out) return;
    const v = muted ? 0 : VOL * (speaking.size ? DUCK : 1);
    out.gain.setTargetAtTime(v, ac.currentTime, speaking.size ? .05 : .4);
  }
  const play0 = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    if (!this._bgmDuck) {
      this._bgmDuck = true;
      const off = () => { speaking.delete(this); applyVol(); };
      this.addEventListener("pause", off); this.addEventListener("ended", off); this.addEventListener("error", off); this.addEventListener("emptied", off);
    }
    speaking.add(this); applyVol();
    const r = play0.apply(this, arguments);
    if (r && r.catch) r.catch(() => { speaking.delete(this); applyVol(); });
    return r;
  };

  // ---------- 對外 ----------
  function unlock() {
    if (!ctx()) return;
    if (ac.state === "suspended" && !document.hidden) ac.resume();
    if (want && !cur) startTrack(want);
  }
  addEventListener("pointerdown", unlock, { capture: true });
  addEventListener("keydown", unlock, { capture: true });
  // 切到別的分頁就暫停，回來再繼續
  document.addEventListener("visibilitychange", () => { if (!ac) return; if (document.hidden) ac.suspend(); else if (want) ac.resume(); });

  window.BGM = {
    play(name) {
      if (!TRACKS[name]) return;
      want = name;
      if (!ac) return;                 // 還沒點過畫面：先記著，第一次點擊再開始
      if (cur && cur.name === name) return;
      if (ac.state === "suspended" && !document.hidden) ac.resume();
      fadeOut(cur, 1.2); cur = null; startTrack(name);
    },
    stop(sec = 1.2) { want = null; if (ac && cur) { fadeOut(cur, sec); cur = null; } },
    setMuted(m) { muted = m; applyVol(); },
    get current() { return cur && cur.name; },
    tracks: Object.keys(TRACKS),
  };
})();
