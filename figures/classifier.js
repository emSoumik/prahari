/**
 * Classifier: a conveyor carries three parcels past a scanner arch to an
 * action press. The arch reads each parcel's surface and marks it with a lit
 * dot; the middle parcel is a hollow shell with a solid hidden inside, which
 * the arch cannot see, so it is marked like the rest. At the end the press
 * drops on whatever stands under it, the hidden one included. The pointer is
 * the belt: the middle parcel follows it along the lane on a spring, the
 * others keep their spacing, the belt ticks slide. The slider is how far the
 * belt had run at rest.
 *
 * The pattern: one continuous position on a spring, with derived states read
 * from its target; the press is a choice, so it is a tween.
 */
const {
  Cam, clamp, facing, fit, prism, proj, rings, seg, unproj,
  spring, stepS, tdone, tset, tval, tween, disposer, mk, place, pointer, put, register, solid,
} = HL;

const N = 3, GAP = 30, AX = 88, PX = 160, LY = 18, CW = 14, Z0 = 2, H = 12, LO = 32, HI = 172;
const ZUP = 42, ZDN = Z0 + H + 1;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.72);
  fit(C, [[-16, -30, -4], [216, 46, -4], [216, -30, -4], [-16, 46, -4], [AX, 40, 32], [PX, -8, 52]], 200, 166);
  const P = proj(C), front = facing(C);
  const xs = (m) => [0, 1, 2].map((i) => m - (i - 1) * GAP);

  const g = mk("g", {}, svg);
  const [gr, gi] = rings(-16, -30, 216, 46, 10, 2);
  put(solid(g), prism(P, front, gr, gi, -4, 0));
  // the belt: a low slab with ticks that slide, and the scan line under the arch
  const [br, bi] = rings(-10, 6, 206, 30, 3, 1);
  put(solid(g), prism(P, front, br, bi, 0, Z0));
  const ticks = mk("path", { class: "nf lo" }, g);
  mk("path", { d: seg(P(AX, 7, Z0), P(AX, 29, Z0)), class: "nf dash" }, g);
  const [pr, pi] = rings(PX - 10, LY - 10, PX + 10, LY + 10, 3, 1);
  put(solid(g), prism(P, front, pr, pi, Z0, Z0 + 1));

  const layer = mk("g", {}, g);
  const parcels = Array.from({ length: N }, (_, i) => {
    const el = solid(layer), lid = mk("circle", { r: 1.3, class: "dot off" }, el.g);
    let core = null;
    if (i === 1) {
      el.sil.classList.add("nf"); // a hollow shell: its inside shows
      core = solid(el.g);
      el.g.insertBefore(core.g, lid);
    }
    return { i, el, lid, core, lit: false, key: 0 };
  });

  // the arch: two posts and a lintel across the lane
  const arch = { g: mk("g", {}, layer), key: AX + LY };
  const [lr, li] = rings(AX - 3, -2, AX + 3, 38, 2.5, 0.9);
  const [p1r, p1i] = rings(AX - 3, -2, AX + 3, 4, 2, 0.8);
  const [p2r, p2i] = rings(AX - 3, 32, AX + 3, 38, 2, 0.8);
  put(solid(arch.g), prism(P, front, p1r, p1i, 0, 24));
  put(solid(arch.g), prism(P, front, p2r, p2i, 0, 24));
  const lintel = solid(arch.g);
  put(lintel, prism(P, front, lr, li, 24, 30));

  // the press: a column behind the lane, an arm over it, a ram that drops
  const press = { g: mk("g", {}, layer), key: PX + LY };
  const [cr, ci] = rings(PX - 6, -10, PX + 6, 2, 3, 1);
  put(solid(press.g), prism(P, front, cr, ci, 0, 50));
  const [ar, ai] = rings(PX - 5, -8, PX + 5, 26, 3, 1);
  put(solid(press.g), prism(P, front, ar, ai, 44, 52));
  const rod = solid(press.g), ram = solid(press.g);
  const [dr, di] = rings(PX - 2, LY - 2, PX + 2, LY + 2, 1.5, 0.6);
  const [hr, hi] = rings(PX - 8, LY - 8, PX + 8, LY + 8, 2.8, 1);
  const lift = tween(0);
  let drawnRam = NaN;

  function drawRam(f) {
    if (f === drawnRam) return;
    drawnRam = f;
    const z = ZUP + (ZDN - ZUP) * f;
    put(rod, prism(P, front, dr, di, z + 4, 46));
    put(ram, prism(P, front, hr, hi, z, z + 4));
  }

  let drawnX = NaN;
  function drawParcels(x1) {
    if (x1 === drawnX) return;
    drawnX = x1;
    const slide = ((x1 % 12) + 12) % 12;
    let d = "";
    for (let t = -12 + slide; t < 206; t += 12) if (t > -6) d += seg(P(t, 7.5, Z0), P(t, 28.5, Z0));
    ticks.setAttribute("d", d);
    xs(x1).forEach((x, i) => {
      const p = parcels[i];
      p.key = x + LY;
      const [r, inn] = rings(x - CW / 2, LY - CW / 2, x + CW / 2, LY + CW / 2, 2.4, 1);
      put(p.el, prism(P, front, r, inn, Z0, Z0 + H));
      if (p.core) {
        const [c0, c1] = rings(x - 3.5, LY - 3.5, x + 3.5, LY + 3.5, 1.6, 0.6);
        put(p.core, prism(P, front, c0, c1, Z0 + 3, Z0 + H - 3));
      }
      place(p.lid, P(x, LY, Z0 + H));
      const lit = x > AX + 4;
      if (lit !== p.lit) { p.lit = lit; p.lid.setAttribute("class", lit ? "dot m" : "dot off"); }
    });
  }

  /** Paint order follows depth: parcels, arch and press by x + y. */
  function order() {
    const items = [...parcels.map((p) => ({ key: p.key, g: p.el.g })), arch, press].sort((a, b) => a.key - b.key);
    items.forEach((it, k) => { if (layer.children[k] !== it.g) layer.append(it.g); });
  }

  const belt = spring(clamp(value, LO, HI), { eps: 0.05 });
  const R = register(stage, (dt, now) => {
    let moving = stepS(belt, dt);
    drawParcels(belt.x);
    const f = tval(lift, now);
    drawRam(f);
    if (!tdone(lift, now)) moving = true;
    order();
    return moving;
  });
  bag.add(R.unregister);

  let base = clamp(value, LO, HI), over = false, shown = "";
  /** What stands under the arch and the press is read from the belt's target, which never moves under the pointer. */
  function apply() {
    const t = over ? belt.t : base;
    const at = (x) => xs(t).findIndex((v) => Math.abs(v - x) < 8);
    const inArch = at(AX), atPress = at(PX);
    const mode = !over ? "r" : atPress >= 0 ? "p" : inArch >= 0 ? "a" : "n";
    const key = mode + (atPress >= 0 ? atPress : inArch) + (t + GAP > AX ? 1 : 0);
    if (key !== shown) {
      shown = key;
      const hid = (mode === "a" && inArch === 1) || mode === "r" || mode === "n" || (mode === "p" && atPress === 1);
      const hot = mode === "p" ? "press" : mode === "a" && inArch !== 1 ? "arch" : "core";
      ram.sil.classList.toggle("hi", hot === "press");
      lintel.sil.classList.toggle("hi", hot === "arch");
      parcels[1].core.sil.classList.toggle("hi", hot === "core");
      tset(lift, atPress >= 0 ? 1 : 0, performance.now(), 0);
      read.textContent = mode === "r" ? "rest"
        : mode === "p" ? (hid ? "action fired · injection" : "action fired")
        : mode === "a" ? (inArch === 1 ? "looks safe · injection" : "scanned · looks safe")
        : t + GAP > AX ? "passed" : "queued";
    }
    belt.t = t;
    R.wake();
  }
  apply();

  bag.add(pointer(stage, {
    move: (p) => {
      const q = unproj(C, p[0], p[1], 0);
      over = q[0] > -20 && q[0] < 220 && q[1] > -34 && q[1] < 50;
      belt.t = over ? clamp(q[0], LO, HI) : base;
      apply();
    },
    leave: () => { over = false; apply(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { base = clamp(v, LO, HI); if (!over) apply(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "classifier",
  means: "A scanner arch marks each parcel by its surface; the hidden one passes, and the press fires on it anyway.",
  rules: [1, 4, 8, 10],
  range: [48, 62, 88],
  tour: [[137, 141], [173, 159], [261, 203], null],
  mount,
});
