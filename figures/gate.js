/**
 * Gate: a checkpoint on a short lane. A guard booth with a window stands to
 * one side; its post carries a striped boom with a counterweight across the
 * lane. Five action blocks wait in a queue at the boom. The pointer walks the
 * lane: over the queue the boom stays down and the head block is held; past
 * the boom it lifts on a spring, and blocks roll through one by one, the
 * farther the pointer the more, staggered from it. A cleared block carries a
 * bright stamp on its lid. The slider is how many had passed at rest.
 *
 * The pattern: discrete items on one axis, plus one continuous part (the boom)
 * on a spring. Hit test on the ground plane, which never moves.
 */
const {
  Cam, circ, clamp, facing, fillet, fit, poly, prism, proj, rad, rings, rrect, seg, unproj,
  spring, stepS, tdone, tset, tval, tween, disposer, mk, place, pointer, put, register, solid,
} = HL;

const N = 5, BX = 100, PY = -4, PZ = 15, BL = 50, CW = 12, GAP = 17, STEP = 50;
const QX = (i) => BX - 12 - i * GAP, FX = (i) => 196 - i * GAP, LY = 18;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-16, -36, -4], [216, 42, -4], [216, -36, -4], [-16, 42, -4], [BX, PY, PZ + BL], [116, -19, 34]], 200, 166);
  const P = proj(C), front = facing(C);

  const g = mk("g", {}, svg);
  // the ground: one rounded plaza holding the lane and the booth
  const [gr, gi] = rings(-16, -36, 216, 42, 10, 2);
  put(solid(g), prism(P, front, gr, gi, -4, 0));
  // the lane's two edges and the stop line under the boom
  mk("path", { d: seg(P(-10, 4, 0), P(210, 4, 0)) + seg(P(-10, 32, 0), P(210, 32, 0)), class: "nf lo" }, g);
  mk("path", { d: seg(P(BX - 3, 4, 0), P(BX - 3, 32, 0)), class: "nf dash" }, g);
  // the booth: a body, a roof that overhangs it, a window facing the lane
  const [br, bi] = rings(104, -30, 128, -9, 3, 1);
  put(solid(g), prism(P, front, br, bi, 0, 30));
  const [rr, ri] = rings(101, -33, 131, -6, 3, 1.2);
  put(solid(g), prism(P, front, rr, ri, 30, 33.5));
  mk("path", { d: poly(rrect(108, 13, 124, 24, 2, 4).map((q) => P(q.u, -9, q.v))), class: "nf" }, g);
  // the post that carries the boom
  const at = (r) => circ(r, 16).map((q) => ({ ...q, u: q.u + BX, v: q.v + PY }));
  put(solid(g), prism(P, front, at(2.6), at(1.8), 0, PZ + 2));

  const layer = mk("g", {}, g);
  const blocks = Array.from({ length: N }, (_, i) => {
    const el = solid(layer), lid = mk("circle", { r: 1.3, class: "dot off" }, el.g);
    return { i, el, lid, tw: tween(QX(i)), drawn: NaN, key: 0 };
  });
  const boom = { g: mk("g", {}, layer), key: BX + LY };
  const bBack = mk("path", { class: "lo" }, boom.g), bFace = mk("path", { class: "sil" }, boom.g);
  const bStripe = mk("path", { class: "nf lo" }, boom.g), bWeight = mk("path", { class: "sil" }, boom.g);
  const lift = spring(0, { eps: 0.002 });
  let drawnLift = NaN;

  /** The boom, raised by f (0 down across the lane, 1 upright): a thin bar with a thickness line, stripes and a counterweight. */
  function drawBoom(f) {
    const th = rad(84 * f), c = Math.cos(th), s = Math.sin(th);
    const w = (x, a, n) => P(x, PY + a * c - n * s, PZ + a * s + n * c);
    const bar = (x) => fillet([[-6, -1.7], [BL, -1.7], [BL, 1.7], [-6, 1.7]], [1.4, 1.4, 1.4, 1.4]).map(([a, n]) => w(x, a, n));
    bBack.setAttribute("d", poly(bar(BX - 1.4)));
    bFace.setAttribute("d", poly(bar(BX + 1.4)));
    bStripe.setAttribute("d", [10, 16, 26, 32, 42].map((a) => seg(w(BX + 1.4, a, -1.7), w(BX + 1.4, a + 3, 1.7))).join(""));
    bWeight.setAttribute("d", poly(fillet([[-13, -4], [-5, -4], [-5, 4], [-13, 4]], [1.5, 1.5, 1.5, 1.5]).map(([a, n]) => w(BX + 1.6, a, n))));
  }

  function drawBlock(b, x) {
    if (x === b.drawn) return;
    b.drawn = x; b.key = x + LY;
    const [r, inn] = rings(x - CW / 2, LY - CW / 2, x + CW / 2, LY + CW / 2, 2.6, 1);
    put(b.el, prism(P, front, r, inn, 0, CW - 1));
    place(b.lid, P(x, LY, CW - 1));
  }

  /** Paint order follows depth: blocks and the boom by x + y, so a block past the boom covers it. */
  function order() {
    const items = [...blocks.map((b) => ({ key: b.key, g: b.el.g })), boom].sort((a, b) => a.key - b.key);
    items.forEach((it, k) => { if (layer.children[k] !== it.g) layer.append(it.g); });
  }

  const R = register(stage, (dt, now) => {
    let moving = stepS(lift, dt);
    if (lift.x !== drawnLift) { drawnLift = lift.x; drawBoom(lift.x); }
    for (const b of blocks) { drawBlock(b, tval(b.tw, now)); if (!tdone(b.tw, now)) moving = true; }
    order();
    return moving;
  });
  bag.add(R.unregister);

  let base = Math.round(value), over = null, shown = "";
  /** c blocks cleared: they move to the far side, the rest close up behind the boom, staggered from the pointer's block. */
  function apply() {
    const x = over ? over[0] : null, held = x !== null && x < BX - 6;
    const c = x === null ? base : held ? 0 : clamp(Math.ceil((x - (BX - 6)) / 20), 1, N);
    lift.t = x === null ? 0 : clamp((x - (BX - 6)) / 16, 0, 1);
    const key = (x === null ? "r" : "p") + c;
    if (key !== shown) {
      shown = key;
      const now = performance.now();
      blocks.forEach((b, i) => {
        tset(b.tw, i < c ? FX(i) : QX(i - c), now, Math.abs(i - c) * STEP);
        b.lid.setAttribute("class", i < c ? "dot m" : "dot off");
        b.el.sil.classList.toggle("hi", x !== null && (held ? i === 0 : i === c - 1));
      });
      bFace.classList.toggle("hi", x === null);
      bFace.classList.toggle("sil", x !== null);
      read.textContent = x === null ? "rest" : c === 0 ? "action held · checking" : `cleared · ${c} of ${N} passed`;
    }
    R.wake();
  }
  apply();

  bag.add(pointer(stage, {
    move: (p) => { const q = unproj(C, p[0], p[1], 0); over = q[0] < -20 || q[0] > 220 || q[1] < -60 || q[1] > 80 ? null : q; apply(); },
    leave: () => { over = null; apply(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { base = clamp(Math.round(v), 0, N); apply(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "gate",
  means: "A checkpoint on a lane: the boom holds the queued actions, and lifts to let them through one by one.",
  rules: [1, 2, 4, 8],
  range: [0, 2, 5],
  tour: [[120, 143], [195, 180], [290, 227], null],
  mount,
});
