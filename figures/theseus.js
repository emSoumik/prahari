/**
 * Theseus: a double-ended wooden hull of 22 planks in five strakes, butts
 * staggered, sitting on a long keel beam with a mast stub amidships. The
 * pointer is a sweep along the hull, bow to stern: every plank whose middle
 * lies behind it is replaced. A replaced plank lifts off, comes back clean
 * (no weathered grain, bright nails) and seats again, staggered out from the
 * pointer. The keel never moves. The slider is how many planks were already
 * replaced when nobody touches it.
 *
 * The pattern: discrete items on one axis. Tweens, a stagger by distance, and
 * a hit test on the hull's resting axis, which never moves.
 */
const {
  Cam, circ, clamp, facing, fit, open, poly, prism, proj, rings,
  tdone, tset, tval, tween, disposer, mk, place, pointer, put, register, solid,
} = HL;

const L = 180, B = 17, D = 34, SH = 16, K = 5, M = 4, OUT = 7, STEP = 40, KZ = 9;

/** Half-beam at t along the hull: pointed at both ends, full amidships. */
const beam = (t) => B * Math.pow(Math.max(0, 1 - Math.abs(2 * t - 1) ** 2.4), 0.55);
/** Gunwale height at t: the sheer rises toward bow and stern. */
const sheer = (t) => D + SH * (2 * t - 1) ** 2;

/** The planks, strake by strake from the keel up, butts staggered on alternate strakes. */
function planking() {
  const out = [];
  for (let k = 0; k < K; k++) {
    const cut = [0];
    for (let j = 0; j < M; j++) { const c = (j + (k % 2 ? 0.5 : 1)) / M; if (c < 1) cut.push(c); }
    cut.push(1);
    for (let j = 0; j + 1 < cut.length; j++) out.push({ k, ta: cut[j], tb: cut[j + 1], tc: (cut[j] + cut[j + 1]) / 2 });
  }
  return out.sort((a, b) => a.tc - b.tc || a.k - b.k);
}

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.62);
  fit(C, [[-20, -B, -KZ], [L + 20, B, -KZ], [-20, 0, D + SH], [L + 20, 0, D + SH], [L / 2, 0, D + 44], [L / 2, B + OUT, 0]], 200, 166);
  const P = proj(C), front = facing(C);
  /** A point on the hull's skin: t along it, s from keel (0) to gunwale (1), side ±1, pushed out by o. */
  const pt = (t, s, side = 1, o = 0, inset = 0) =>
    P(t * L + (2 * t - 1) * s * s * 20, side * (Math.max(0, beam(t) - inset) * s * (1.6 - 0.6 * s) + o * 0.7), sheer(t) * s + o * 0.6);
  const ts = (a, b, n) => Array.from({ length: n + 1 }, (_, i) => a + ((b - a) * i) / n);

  const g = mk("g", {}, svg);
  // the keel: a long beam under everything, standing proud of both stems
  const keel = solid(g);
  const [kr, ki] = rings(-16, -3.5, L + 16, 3.5, 3, 1.1);
  put(keel, prism(P, front, kr, ki, -KZ, 0));
  // the deck, seen from above: both gunwales, and the cap rail one plank in
  const T = ts(0, 1, 48);
  mk("path", { d: poly([...T.map((t) => pt(t, 1, 1)), ...T.slice().reverse().map((t) => pt(t, 1, -1))]), class: "sil" }, g);
  mk("path", { d: poly([...T.map((t) => pt(t, 1, 1, 0, 3.2)), ...T.slice().reverse().map((t) => pt(t, 1, -1, 0, 3.2))]), class: "nf lo" }, g);
  // the mast stub amidships, with a cap
  const mast = solid(g), mz = sheer(0.5), mx = L / 2;
  const mring = circ(3.4, 16).map((q) => ({ ...q, u: q.u + mx })), minn = circ(2.5, 16).map((q) => ({ ...q, u: q.u + mx }));
  put(mast, prism(P, front, mring, minn, mz, mz + 44));

  const layer = mk("g", {}, g);
  const planks = planking().map((p, i) => {
    const pg = mk("g", {}, layer);
    const face = mk("path", { class: "lo" }, pg);
    const grain = mk("path", { class: "nf dash" }, pg);
    const nails = [0, 1, 2, 3].map(() => mk("circle", { r: 0.95, class: "dot off" }, pg));
    return { ...p, i, pg, face, grain, nails, tw: tween(0), drawn: NaN, hi: false };
  });
  const N = planks.length;
  // the near side's outline: gunwale, stern post, keel line, stem
  const Sx = ts(0, 1, 12);
  mk("path", { d: poly([...T.map((t) => pt(t, 1)), ...Sx.slice().reverse().map((s) => pt(1, s)), ...Sx.map((s) => pt(0, s))]), class: "nf sil" }, g);
  const top = mk("g", {}, g);

  function draw(p, n) {
    if (n === p.drawn) return;
    const lifted = n > 0 && n < 1, o = Math.sin(Math.PI * n) * OUT, s0 = p.k / K, s1 = (p.k + 1) / K;
    if (lifted && p.pg.parentNode !== top) top.append(p.pg);
    if (!lifted && p.pg.parentNode !== layer) layer.append(p.pg);
    const span = ts(p.ta, p.tb, 8);
    p.face.setAttribute("d", poly([...span.map((t) => pt(t, s1, 1, o)), ...span.slice().reverse().map((t) => pt(t, s0, 1, o))]));
    const inner = ts(p.ta + 0.02, p.tb - 0.02, 6), fresh = n >= 0.5;
    p.grain.setAttribute("d", fresh || p.tb - p.ta < 0.1 ? "" : [0.28, 0.52, 0.76].map((f) => open(inner.map((t) => pt(t, s0 + (s1 - s0) * f, 1, o)))).join(""));
    const ends = [p.ta + 0.012, p.tb - 0.012];
    p.nails.forEach((el, j) => { place(el, pt(ends[j >> 1], s0 + (s1 - s0) * (j % 2 ? 0.7 : 0.3), 1, o)); el.setAttribute("class", fresh ? "dot m" : "dot off"); });
    p.face.setAttribute("class", p.hi ? "hi" : fresh ? "" : "lo");
    p.drawn = n;
  }

  const Bk = register(stage, (_dt, now) => {
    let moving = false;
    for (const p of planks) { draw(p, tval(p.tw, now)); if (!tdone(p.tw, now)) moving = true; }
    return moving;
  });
  bag.add(Bk.unregister);

  // hit: the pointer read against the hull's resting axis on screen, which never moves
  const a0 = P(0, 0, D * 0.6), a1 = P(L, 0, D * 0.6), dv = [a1[0] - a0[0], a1[1] - a0[1]], dd = dv[0] ** 2 + dv[1] ** 2;
  function hit([x, y]) {
    const qx = x - a0[0], qy = y - a0[1], t = (qx * dv[0] + qy * dv[1]) / dd;
    if (t < -0.12 || t > 1.12 || Math.abs(qx * dv[1] - qy * dv[0]) / Math.sqrt(dd) > 90) return -1;
    return planks.filter((p) => p.tc <= clamp(t, 0, 1)).length;
  }

  let base = Math.round(value), shown = -2, over = -1;
  /** Replaces the first c planks in sweep order; the stagger spreads out from the pointer's plank. */
  function setCount(c, active) {
    const now = performance.now();
    planks.forEach((p, i) => {
      tset(p.tw, i < c ? 1 : 0, now, Math.abs(i - c) * STEP);
      const hi = active && i === c - 1;
      if (hi !== p.hi) { p.hi = hi; p.drawn = NaN; }
    });
    keel.sil.classList.toggle("hi", !active || c === 0);
    read.textContent = !active ? "rest" : c === N ? `all ${N} · same ship?` : `${String(c).padStart(2, "0")} of ${N} replaced`;
    Bk.wake();
  }
  const show = () => {
    const key = over < 0 ? -1 - base : over;
    if (key === shown) return;
    shown = key;
    setCount(over < 0 ? base : over, over >= 0);
  };
  show();

  bag.add(pointer(stage, { move: (p) => { over = hit(p); show(); }, leave: () => { over = -1; show(); } }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { base = clamp(Math.round(v), 0, N); show(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "theseus",
  means: "A ship rebuilt plank by plank as the pointer sweeps its hull. The keel under it never changes.",
  rules: [1, 2, 5, 8],
  range: [0, 11, 22],
  tour: [[116, 130], [196, 178], [292, 224], null],
  mount,
});
