/**
 * Valve: a tank feeds an open channel on two piers. Near the tank a wire
 * sieve stands across it, with a pennant; near the end a sluice valve, a gate
 * between two posts raised by a wheel; past it, a cup the channel spills into.
 * The pointer pulls a packet along the channel. It passes the sieve (the
 * pennant flips up: flagged, flow goes on) and stops at the closed valve;
 * only past the valve does the wheel turn, the gate lift, and the packet drop
 * into the cup. The slider is where the packet sits at rest.
 *
 * The pattern: a position on a spring (the packet), a discrete threshold on a
 * tween (the gate), a hit test on a fixed plane at the channel's rim.
 */
const {
  Cam, circ, clamp, facing, fit, lerp, open, poly, prism, proj, rad, ringAt, rings, rrect, run, seg, unproj,
  spring, stepS, tdone, tset, tval, tween, disposer, mk, pointer, put, register, solid,
} = HL;

const X0 = 18, X1 = 200, HW = 7, ZB = 10, ZT = 20, SX = 62, VX = 160, CX = 214, BR = 5, HOLD = VX - 9, OPEN = 180;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-30, -30, -4], [232, 30, -4], [232, -30, -4], [-30, 30, -4], [0, 0, 52], [VX, 0, 58]], 200, 166);
  const P = proj(C), front = facing(C);
  const at = (ring, x, y) => ring.map((q) => ({ ...q, u: q.u + x, v: q.v + y }));
  const LR = (pts) => (pts[0][0] <= pts[pts.length - 1][0] ? pts : pts.slice().reverse());

  const g = mk("g", {}, svg);
  const [gr, gi] = rings(-30, -30, 232, 30, 10, 2);
  put(solid(g), prism(P, front, gr, gi, -4, 0));
  // the tank, where the message comes from
  put(solid(g), prism(P, front, circ(20, 24), circ(18.6, 24), 0, 50));
  // two piers, then the channel: its body and its inner rim
  for (const x of [70, 140]) { const [r, i] = rings(x - 5, -5, x + 5, 5, 2, 0.8); put(solid(g), prism(P, front, r, i, 0, ZB)); }
  // the valve's post stands behind the channel, so it is painted before it
  const [pr, pi] = rings(VX - 3, -14, VX + 3, -8, 2, 0.8);
  put(solid(g), prism(P, front, pr, pi, 0, 46));
  const outer = rrect(X0, -HW, X1, HW, 2.5, 4), inner = rrect(X0 + 2, -HW + 2, X1 - 2, HW - 2, 1, 4);
  put(solid(g), prism(P, front, outer, inner, ZB, ZT));
  mk("path", { d: poly(ringAt(P, inner, ZT)), class: "nf" }, g);

  const items = mk("g", {}, g);
  // the sieve: a wire screen across the channel (open, so what is behind it shows), and its pennant
  const sieve = mk("g", {}, items), sw = (y, z) => P(SX, y, z);
  const sFrame = mk("path", { d: poly(rrect(-11, ZB + 2, 11, 38, 3, 4).map((q) => sw(q.u, q.v))), class: "nf sil" }, sieve);
  let mesh = "";
  for (let y = -8; y <= 8; y += 2.7) mesh += seg(sw(y, ZB + 4), sw(y, 36));
  for (let z = ZB + 6; z <= 35; z += 3) mesh += seg(sw(-9, z), sw(9, z));
  mk("path", { d: mesh, class: "nf lo" }, sieve);
  mk("path", { d: seg(sw(11, 38), sw(11, 50)), class: "nf" }, sieve);
  const pennant = mk("path", { class: "sil" }, sieve);
  // the valve's gate: a thick plate that slides up between the posts
  const gate = mk("g", {}, items);
  const gBack = mk("path", { class: "lo" }, gate), gFace = mk("path", { class: "sil" }, gate);
  const ball = mk("ellipse", { rx: 0, ry: 0, class: "sil" }, items);
  // the channel's near wall, over everything inside it
  const iF = LR(ringAt(P, run(inner, front), ZT)), oT = LR(ringAt(P, run(outer, front), ZT)), oB = LR(ringAt(P, run(outer, front), ZB));
  mk("path", { d: poly([...iF, oT[oT.length - 1], ...oB.slice().reverse(), oT[0]]), class: "fo" }, g);
  mk("path", { d: open(iF), class: "nf" }, g);
  mk("path", { d: open([oT[0], ...oB, oT[oT.length - 1]]), class: "nf sil" }, g);
  // the valve's crossbar over the channel, and the wheel on its stem
  const [cr, ci] = rings(VX - 3, -14, VX + 3, 3, 2, 0.8);
  put(solid(g), prism(P, front, cr, ci, 46, 50));
  mk("path", { d: seg(P(VX, 0, 50), P(VX, 0, 56)), class: "nf" }, g);
  const wheel = mk("path", { d: poly(ringAt(P, at(circ(12, 32), VX, 0), 56)), class: "nf hi" }, g);
  const spokes = mk("path", { class: "nf" }, g);
  // the cup at the end: where the action lands
  const cup = solid(g);
  put(cup, prism(P, front, at(circ(8, 24), CX, 0), at(circ(6.6, 24), CX, 0), 0, 12));
  mk("path", { d: poly(ringAt(P, at(circ(6.6, 24), CX, 0), 12)), class: "nf lo" }, g);
  const topLayer = mk("g", {}, g);

  const pk = spring(clamp(value, X0 + 8, CX), { eps: 0.05 }), lift = tween(value >= OPEN ? 1 : 0), flag = tween(value > SX + 4 ? 1 : 0);
  let want = pk.x, drawn = "";

  function draw(x, f, fl) {
    const key = [x, f, fl].map((n) => n.toFixed(3)).join();
    if (key === drawn) return;
    drawn = key;
    // the packet rides the channel, then drops into the cup past its end
    const z = x <= X1 ? ZT + 1 : lerp(ZT + 1, 13, clamp((x - X1) / (CX - X1), 0, 1));
    const c = P(x, 0, z), r = Math.abs(P(x, 0, z + BR)[1] - c[1]) / 0.866;
    ball.setAttribute("cx", c[0].toFixed(2)); ball.setAttribute("cy", c[1].toFixed(2));
    ball.setAttribute("rx", r.toFixed(2)); ball.setAttribute("ry", r.toFixed(2));
    const host = x > X1 ? topLayer : items;
    if (ball.parentNode !== host) host.append(ball);
    const ref = x < SX ? sieve : x < VX ? gate : null;
    if (host === items && ref && ball.nextSibling !== ref) ref.before(ball);
    if (host === items && !ref && items.lastChild !== ball) items.append(ball);
    const up = f * 13, plate = (xx) => poly(rrect(-HW + 1, ZB + 3 + up, HW - 1, 32 + up, 1.5, 4).map((q) => P(xx, q.u, q.v)));
    gBack.setAttribute("d", plate(VX - 1.2)); gFace.setAttribute("d", plate(VX + 1.2));
    const a = f * Math.PI * 3;
    spokes.setAttribute("d", [0, 1, 2, 3].map((k) => seg(P(VX, 0, 56), P(VX + 12 * Math.cos(a + (k * Math.PI) / 2), 12 * Math.sin(a + (k * Math.PI) / 2), 56))).join(""));
    const ph = rad(fl * 95), d = [Math.sin(ph), Math.cos(ph)];
    pennant.setAttribute("d", poly([P(SX, 11, 50), P(SX + 10 * d[0], 11, 47 - 7 * d[1]), P(SX, 11, 44)]));
  }

  const R = register(stage, (dt, now) => {
    const open_ = tval(lift, now) > 0.85;
    pk.t = open_ ? want : Math.min(want, HOLD);
    let moving = stepS(pk, dt);
    tset(flag, pk.x > SX + 4 ? 1 : 0, now, 0);
    draw(pk.x, tval(lift, now), tval(flag, now));
    if (!tdone(lift, now) || !tdone(flag, now)) moving = true;
    return moving;
  });
  bag.add(R.unregister);

  let base = value, over = null;
  function apply() {
    want = clamp(over ? over[0] : base, X0 + 8, CX);
    tset(lift, want >= OPEN ? 1 : 0, performance.now(), 0);
    const s = !over ? -1 : want < SX ? 0 : want < HOLD - 12 ? 1 : want < OPEN ? 2 : 3;
    ball.setAttribute("class", s === 0 ? "hi" : "sil");
    sFrame.setAttribute("class", s === 1 ? "nf hi" : "nf sil");
    wheel.setAttribute("class", s === 2 || s < 0 ? "nf hi" : "nf sil");
    cup.sil.classList.toggle("hi", s === 3);
    read.textContent = ["rest", "inlet · message in", "sieve: words checked", "valve: action held", "valve: authorized · executes"][s + 1];
    R.wake();
  }
  apply();

  bag.add(pointer(stage, {
    move: (p) => { const q = unproj(C, p[0], p[1], ZT); over = Math.abs(q[1]) > 60 || q[0] < -40 || q[0] > 250 ? null : q; apply(); },
    leave: () => { over = null; apply(); },
  }));
  bag.add(() => svg.replaceChildren());

  return {
    set: (v) => { base = v; if (!over) apply(); },
    destroy: bag.dispose,
  };
}

hairline({
  name: "valve",
  means: "A sieve checks what flows past; the valve decides whether anything comes out the other end.",
  rules: [1, 3, 4, 8],
  range: [36, 110, 214],
  tour: [[188, 149], [252, 181], [320, 226], null],
  mount,
});
