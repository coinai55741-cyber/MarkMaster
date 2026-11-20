// 煙火引擎（Canvas 2D，不用 WebGL）：三種煙火試玩版共用。
//   FW.init(canvas)                     建立夜空
//   FW.burst(x, y, {n, color, speed, size, ring, power})   在 (x,y) 炸開；power 0~1 決定大小與亮度
//   FW.dud(x, y)                        啞炮：一團煙
//   FW.launch(x, y, opts)               從地面直線升空到 (x,y) 再炸開
//   FW.flyPath(points, opts, onEnd)     沿著一串點飛行（畫出的聲調軌跡），飛完炸開
//   FW.onFrame(fn)                      每格額外畫東西：fn(ctx, timeMs, dtSec)
//   FW.W / FW.H                         畫面寬高（CSS 像素）
(function () {
  const PALETTE = ["#ffd36b", "#ff7b9c", "#7be0ff", "#b38bff", "#6fe3a1", "#ffa15e"];
  const parts = [], rockets = [], paths = [], drawers = [];
  let cv, cx, DPR = 1, last = 0;
  const stars = Array.from({ length: 90 }, () => ({ x: Math.random(), y: Math.random() * .7, r: Math.random() * 1.3 + .3, p: Math.random() * 6 }));
  const FW = { W: 0, H: 0, PALETTE };

  function resize() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    FW.W = innerWidth; FW.H = innerHeight;
    cv.width = FW.W * DPR; cv.height = FW.H * DPR;
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  FW.init = function (canvas) {
    cv = canvas; cx = cv.getContext("2d");
    addEventListener("resize", resize); resize();
    requestAnimationFrame(tick);
  };
  FW.color = () => PALETTE[Math.floor(Math.random() * PALETTE.length)];
  FW.burst = function (x, y, o = {}) {
    const power = o.power ?? 1;
    if (!o.silent && window.SFX) SFX.boom(power, x);
    const n = Math.round((o.n || 70) * (.35 + .65 * power));
    const col = o.color || FW.color(), sp = (o.speed || 3.2) * (.55 + .45 * power);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * .1, v = sp * (.6 + Math.random() * .5);
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: .5 + .5 * power, decay: .012 + Math.random() * .01, col, size: (o.size || 2.2) * (.7 + .3 * power) });
    }
    if (o.ring && power > .5) for (let i = 0; i < 36; i++) {
      const a = i / 36 * Math.PI * 2;
      parts.push({ x, y, vx: Math.cos(a) * sp * 1.4, vy: Math.sin(a) * sp * 1.4, life: 1, decay: .016, col: "#fff6d8", size: 1.6 });
    }
  };
  FW.dud = function (x, y, silent) {
    if (!silent && window.SFX) SFX.fizz(x);
    for (let i = 0; i < 16; i++) parts.push({ x, y, vx: (Math.random() - .5) * 1.2, vy: -Math.random() * 1.2, life: 1, decay: .02, col: "#8a8fa6", size: 5, smoke: true });
  };
  FW.launch = function (x, y, o) { if (window.SFX) SFX.whoosh(x, .45); rockets.push({ x, y: FW.H + 10, tx: x, ty: y, o }); };
  FW.flyPath = function (pts, o = {}, onEnd) {
    if (pts.length < 2) return;
    let len = 0; for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
    if (window.SFX) SFX.whoosh(pts[0][0], Math.max(.3, Math.min(1.2, len / 900)));
    paths.push({ pts, i: 0, t: 0, o, onEnd, trail: [] });
  };
  FW.onFrame = fn => drawers.push(fn);

  function tick(t) {
    // 開著玩法說明時 dt=0，讓移動中的東西停住
    const dt = window.FWX && FWX.paused ? 0 : Math.min(.05, (t - (last || t)) / 1000); last = t;
    const { W, H } = FW;
    cx.globalCompositeOperation = "source-over";
    cx.clearRect(0, 0, W, H);
    for (const s of stars) { cx.globalAlpha = .4 + .4 * Math.sin(t / 700 + s.p); cx.fillStyle = "#fff"; cx.beginPath(); cx.arc(s.x * W, s.y * H, s.r, 0, 7); cx.fill(); }
    cx.globalAlpha = 1;
    for (let i = rockets.length - 1; i >= 0; i--) {
      const r = rockets[i]; r.y += (r.ty - r.y) * .14; r.x += (r.tx - r.x) * .14;
      cx.fillStyle = "#ffe6a8"; cx.beginPath(); cx.arc(r.x, r.y, 2.4, 0, 7); cx.fill();
      if (Math.abs(r.y - r.ty) < 4) { FW.burst(r.tx, r.ty, r.o); rockets.splice(i, 1); }
    }
    // rockets that follow a drawn path (about 900 px per second)
    for (let i = paths.length - 1; i >= 0; i--) {
      const p = paths[i];
      let move = 900 * dt;
      while (move > 0 && p.i < p.pts.length - 1) {
        const [ax, ay] = p.pts[p.i], [bx, by] = p.pts[p.i + 1], seg = Math.hypot(bx - ax, by - ay) || 1;
        const left = seg * (1 - p.t);
        if (move >= left) { move -= left; p.i++; p.t = 0; } else { p.t += move / seg; move = 0; }
      }
      const [ax, ay] = p.pts[p.i], [bx, by] = p.pts[Math.min(p.i + 1, p.pts.length - 1)];
      const x = ax + (bx - ax) * p.t, y = ay + (by - ay) * p.t;
      p.trail.push([x, y]); if (p.trail.length > 24) p.trail.shift();
      cx.strokeStyle = p.o.trail || "#ffcf7a"; cx.lineWidth = 2.5; cx.lineCap = "round";
      cx.beginPath(); p.trail.forEach(([tx, ty], k) => (k ? cx.lineTo(tx, ty) : cx.moveTo(tx, ty))); cx.stroke();
      cx.fillStyle = "#fff3cf"; cx.beginPath(); cx.arc(x, y, 3, 0, 7); cx.fill();
      if (p.i >= p.pts.length - 1) { FW.burst(x, y, p.o); paths.splice(i, 1); p.onEnd && p.onEnd(x, y); }
    }
    for (const d of drawers) d(cx, t, dt);
    cx.globalCompositeOperation = "lighter";
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.x += p.vx; p.y += p.vy; p.vy += p.smoke ? -.01 : .045; p.vx *= .985; p.vy *= .985; p.life -= p.decay;
      if (p.life <= 0) { parts.splice(i, 1); continue; }
      cx.globalAlpha = Math.max(0, p.life) * (p.smoke ? .35 : 1); cx.fillStyle = p.col;
      cx.beginPath(); cx.arc(p.x, p.y, p.size * (p.smoke ? (2 - p.life) : 1), 0, 7); cx.fill();
    }
    cx.globalAlpha = 1; cx.globalCompositeOperation = "source-over";
    requestAnimationFrame(tick);
  }
  window.FW = FW;
})();

// 共用的小工具：洗牌、抽詞、播音
window.FWU = {
  shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; },
  /** 依字數由短到長抽詞，plan 例如 [2,3,4] */
  pick(bank, plan) {
    const used = new Set(), out = [];
    for (const n of plan) {
      const w = FWU.shuffle(bank.filter(x => x.h.length === n && !used.has(x.id)))[0];
      if (w) { used.add(w.id); out.push(w); }
    }
    return out;
  },
  /** 結算時把分數交回主遊戲 */
  report(payload) { if (new URLSearchParams(location.search).has("embedded") && parent !== window) parent.postMessage(payload, "*"); },
};
