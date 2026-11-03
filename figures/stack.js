/**
 * Stack: seven thin slabs float one above another, joined at their side
 * corners by dashed risers. Each carries one object that says what its layer
 * does, bottom to top: a chain of linked blocks (the audit ledger), a gate
 * (execution), a grid of rule tiles with one raised (authorization), a
 * balance (decision), an eye (the LLM judge), a mesh screen (ingest filter)
 * and a chat bubble (the agent). Off the balance a dashed branch leads to a
 * seated figure (a person to escalate to); off the rule tiles, to a plank
 * swapped for a new one (a safer action). The pointer picks the slab under
 * it: it slides out like a drawer and the others part, staggered from it.
 * The slider is which layer sits forward at rest.
 *
 * The pattern: one of many, as Riffle. Tweens, a stagger by distance, a hit
 * test on the slabs' resting heights, which never move.
 */
const {
  Cam, circ, clamp, facing, fillet, fit, poly, prism, proj, ringAt, rings, rrect, seg,
  tdone, tset, tval, tween, disposer, mk, place, pointer, put, register, solid,
} = HL;

const N = 7, HS = 30, GAP = 36, TH = 3.5, OUT = 20, PART = 6, REST_OUT = 8, STEP = 45;
const OFF = [[20, 8], [20, 8], [13, 13], [18, 8], [20, 8], [20, 8], [18, 8]];
const NAMES = [
  "01 audit ledger · hash-chained log",
  "02 execution gateway · only approved actions reach APIs",
  "03 authorization · policy.yaml + compiled JSON rules",
  "04 decision · AI advises, code decides",
  "05 intelligence · LLM judge: intent, injection",
  "06 ingest filter · strips hidden text, flags commands",
  "07 agent · proposes an action",
];

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.08);
  const zTop = (N - 1) * GAP;
  fit(C, [[-HS, -HS, -PART], [HS + OUT, HS, -PART - TH], [-HS, HS + 46, 3 * GAP], [HS + 46, HS, 2 * GAP], [-HS, -HS, zTop + 34 + PART], [HS + OUT, HS, zTop + PART]], 182, 168);
  const P = proj(C), front = facing(C);
  const o0 = P(0, 0, 0), D = (dx, dz) => { const q = P(dx, 0, dz); return [q[0] - o0[0], q[1] - o0[1]]; };

  const g = mk("g", {}, svg);
  /** Q is P shifted to where the current object stands on its slab: toward the slab's near corner, so the slab above does not hide it. */
  let off = [0, 0];
  const Q = (x, y, z) => P(x + off[0], y + off[1], z);
  /** A rounded box from z0 to z1. */
  const box = (par, x0, y0, x1, y1, r, b, z0, z1) => { const [ring, inn] = rings(x0, y0, x1, y1, r, b); const s = solid(par); put(s, prism(Q, front, ring, inn, z0, z1)); return s; };
  /** A flat shape standing upright in the plane x, given as [y, z] points. */
  const up = (par, x, pts, cls) => mk("path", { d: poly(pts.map(([y, z]) => Q(x, y, z))), class: cls }, par);
  const ball = (par, x, y, z, r) => { const c = Q(x, y, z), e = mk("ellipse", { rx: r, ry: r, class: "sil" }, par); e.setAttribute("cx", c[0]); e.setAttribute("cy", c[1]); };

  /** The object on each layer, standing on z. */
  const OBJ = [
    (p, z) => { for (const y of [-15, 0, 15]) { if (y > -15) box(p, -1.3, y - 13, 1.3, y - 5, 1.2, 0.4, z + 2.5, z + 5); box(p, -6, y - 6, 6, y + 6, 2.4, 0.9, z, z + 8); } },
    (p, z) => { box(p, -2.5, -15, 2.5, -10, 1.5, 0.6, z, z + 16); box(p, -2.5, 10, 2.5, 15, 1.5, 0.6, z, z + 16); box(p, -3, -17, 3, 17, 1.5, 0.6, z + 16, z + 19); mk("path", { d: seg(Q(0, -10, z + 8), Q(0, 4, z + 8)), class: "nf" }, p); },
    (p, z) => { for (let s = 0; s <= 4; s++) for (let i = 0; i <= 2; i++) { const j = s - i; if (j < 0 || j > 2) continue; const x = (i - 1) * 10, y = (j - 1) * 10; box(p, x - 3.8, y - 3.8, x + 3.8, y + 3.8, 1.6, 0.6, z, z + (i === 1 && j === 1 ? 7 : 2.5)); } },
    (p, z) => {
      const pan = (y) => { mk("path", { d: seg(Q(0, y, z + 18), Q(0, y, z + 8)), class: "nf lo" }, p); const [r, i] = [circ(6.5, 20), circ(5.2, 20)].map((c) => c.map((q) => ({ ...q, v: q.v + y }))); put(solid(p), prism(Q, front, r, i, z + 7, z + 8.5)); };
      pan(-14); box(p, -5, -5, 5, 5, 2, 0.8, z, z + 3); box(p, -1.6, -1.6, 1.6, 1.6, 1, 0.4, z + 3, z + 18); pan(14); box(p, -1.2, -17, 1.2, 17, 1, 0.4, z + 18, z + 20);
    },
    (p, z) => {
      box(p, -2, -2, 2, 2, 1.2, 0.5, z, z + 7);
      const lid = Array.from({ length: 13 }, (_, k) => { const y = -15 + (30 * k) / 12; return [y, 6.5 * (1 - (y / 15) ** 2)]; });
      up(p, 0, [...lid.map(([y, h]) => [y, z + 13.5 + h]), ...lid.slice().reverse().map(([y, h]) => [y, z + 13.5 - h])], "sil");
      up(p, 0.1, circ(4.4, 20).map((q) => [q.u, z + 13.5 + q.v]), "nf");
      const c = mk("circle", { r: 1.6, class: "dot m" }, p); place(c, Q(0.2, 0, z + 13.5));
    },
    (p, z) => {
      box(p, -3, -16, 3, -12, 1.5, 0.6, z, z + 3); box(p, -3, 12, 3, 16, 1.5, 0.6, z, z + 3);
      up(p, 0, rrect(-14, 3, 14, 20, 2.5, 4).map((q) => [q.u, z + q.v]), "nf sil");
      let m = ""; for (let y = -11; y <= 11; y += 3.7) m += seg(Q(0, y, z + 4.5), Q(0, y, z + 18.5)); for (let h = 6; h <= 18; h += 3) m += seg(Q(0, -12.5, z + h), Q(0, 12.5, z + h));
      mk("path", { d: m, class: "nf lo" }, p);
    },
    (p, z) => {
      const pts = [[-16, 9], [-7, 9], [-11, 2], [-1, 9], [16, 9], [16, 28], [-16, 28]];
      up(p, 0, fillet(pts, [3, 0.6, 0.6, 0.6, 3, 3, 3]).map(([y, h]) => [y, z + h]), "sil");
      for (const y of [-7, 0, 7]) { const c = mk("circle", { r: 1.5, class: "dot m" }, p); place(c, Q(0.1, y, z + 18.5)); }
    },
  ];
  /** Side branches: off the balance, a seated figure; off the rule tiles, a plank swapped for a new one. */
  const BRANCH = {
    3: (p, z) => {
      mk("path", { d: seg(P(0, HS, z), P(0, HS + 18, z)), class: "nf dash" }, p);
      box(p, -11, HS + 18, 11, HS + 40, 4, 1, z - 2.5, z);
      box(p, -6, HS + 25, 4, HS + 35, 2, 0.8, z, z + 6); box(p, -8, HS + 25, -5, HS + 35, 1.2, 0.5, z + 6, z + 15);
      box(p, -4, HS + 27, 1, HS + 33, 2, 0.8, z + 6, z + 15); ball(p, -1.5, HS + 30, z + 19, 3.6);
    },
    2: (p, z) => {
      mk("path", { d: seg(P(HS, 0, z), P(HS + 18, 0, z)), class: "nf dash" }, p);
      box(p, HS + 18, -12, HS + 42, 12, 4, 1, z - 2.5, z);
      mk("path", { d: poly(ringAt(P, rrect(HS + 21, -9, HS + 39, -4, 1.5, 3), z)), class: "nf dash" }, p);
      box(p, HS + 21, 2, HS + 39, 7, 1.5, 0.6, z, z + 3);
    },
  };

  const levels = [], risers = [];
  for (let i = 0; i < N; i++) {
    if (i > 0) risers.push(mk("path", { class: "nf dash" }, g));
    const lg = mk("g", {}, g), z = i * GAP;
    off = [0, 0];
    const slab = box(lg, -HS, -HS, HS, HS, 7, 1.8, z - TH, z);
    if (BRANCH[i]) BRANCH[i](lg, z);
    off = OFF[i];
    OBJ[i](lg, z);
    levels.push({ g: lg, slab, z, o: tween(0), dz: tween(0), drawn: "" });
  }

  function draw(now) {
    let moving = false;
    const st = levels.map((L) => { if (!tdone(L.o, now) || !tdone(L.dz, now)) moving = true; return [tval(L.o, now), tval(L.dz, now)]; });
    levels.forEach((L, i) => {
      const [dx, dy] = D(st[i][0], st[i][1]), key = dx.toFixed(2) + "," + dy.toFixed(2);
      if (key !== L.drawn) { L.drawn = key; L.g.setAttribute("transform", `translate(${key})`); }
      if (i === 0) return;
      const a = levels[i - 1], s0 = st[i - 1], s1 = st[i];
      risers[i - 1].setAttribute("d", [[-HS + 5, HS - 5], [HS - 5, -HS + 5]].map(([x, y]) => seg(P(x + s0[0], y, a.z + s0[1]), P(x + s1[0], y, L.z + s1[1] - TH))).join(""));
    });
    return moving;
  }
  const R = register(stage, (_dt, now) => draw(now));
  bag.add(R.unregister);

  // hit: the slab whose RESTING height on screen is nearest the pointer
  const cy = levels.map((L) => P(0, 0, L.z)[1]), cx = o0[0];
  const hit = ([x, y]) => {
    if (Math.abs(x - cx) > 120 || y < cy[N - 1] - 40 || y > cy[0] + 40) return -1;
    let best = 0;
    cy.forEach((c, i) => { if (Math.abs(y - c) < Math.abs(y - cy[best])) best = i; });
    return best;
  };

  let base = clamp(Math.round(value), 1, N) - 1, act = -2;
  /** Pulls layer a out (-1 for rest, which nudges the base layer); the rest part away from it, staggered outwards. */
  function setActive(a) {
    if (a === act) return;
    const now = performance.now(), f = a < 0 ? base : a;
    act = a;
    levels.forEach((L, i) => {
      const delay = Math.abs(i - f) * STEP;
      tset(L.o, i === f ? (a < 0 ? REST_OUT : OUT) : 0, now, delay);
      tset(L.dz, a < 0 || i === f ? 0 : i > f ? PART : -PART, now, delay);
      L.slab.sil.classList.toggle("hi", i === f);
    });
    read.textContent = a < 0 ? "rest" : NAMES[a];
    R.wake();
  }
  setActive(-1);

  bag.add(pointer(stage, { move: (p) => setActive(hit(p)), leave: () => setActive(-1) }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { base = clamp(Math.round(v), 1, N) - 1; if (act < 0) { act = -2; setActive(-1); } },
    destroy: bag.dispose,
  };
}

hairline({
  name: "stack",
  means: "A request falls through seven layers, from the agent down to the ledger; only an approved action leaves.",
  rules: [1, 2, 4, 10],
  range: [1, 4, 7],
  tour: [[205, 77], [205, 178], [205, 245], null],
  mount,
});
