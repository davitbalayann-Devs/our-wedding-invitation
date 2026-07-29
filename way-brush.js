/*
 * way-brush.js — draws the mobile route strokes from scratch.
 *
 * No exported artwork: the stroke is generated as a bundle of parallel
 * dry-brush filaments laid along a centreline we design, straight through the
 * point where the car sits and at exactly the car's own tilt. Because the path
 * is built in the wrap box's own pixel space there is no viewBox scaling and no
 * aspect distortion, so the road can never drift off the car.
 */
window.WayBrush = (() => {
  /* deterministic PRNG — same stroke on every load and every resize */
  function rng(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /*
   * Smooth periodic 1-D noise in [-1, 1]. Periodic matters: filaments sample it
   * at phase-shifted positions (t * 1.7 + index), and a clamped sampler would
   * hand most of them the same constant, leaving the bundle dead straight.
   */
  function noise(rand, knots) {
    const v = Array.from({ length: knots }, () => rand() * 2 - 1);
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < knots; i++) {
        v[i] = (v[(i - 1 + knots) % knots] + 2 * v[i] + v[(i + 1) % knots]) / 4;
      }
    }
    return (t) => {
      const x = (((t % 1) + 1) % 1) * knots;
      const i = Math.floor(x);
      const f = x - i;
      const e = f * f * (3 - 2 * f);
      return v[i % knots] * (1 - e) + v[(i + 1) % knots] * e;
    };
  }

  const smooth = (a, b, x) =>
    a === b ? (x < a ? 0 : 1) : (() => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
      return t * t * (3 - 2 * t);
    })();

  /* Catmull-Rom through the waypoints, then resampled to even arc length */
  function centreline(pts, step) {
    const p = [
      [2 * pts[0][0] - pts[1][0], 2 * pts[0][1] - pts[1][1]],
      ...pts,
      [
        2 * pts[pts.length - 1][0] - pts[pts.length - 2][0],
        2 * pts[pts.length - 1][1] - pts[pts.length - 2][1],
      ],
    ];
    const raw = [];
    for (let i = 1; i < p.length - 2; i++) {
      const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]];
      const n = 24;
      for (let k = 0; k < n; k++) {
        const t = k / n;
        const t2 = t * t;
        const t3 = t2 * t;
        raw.push([
          0.5 * (2 * p1[0] + (-p0[0] + p2[0]) * t +
            (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * t2 +
            (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * t3),
          0.5 * (2 * p1[1] + (-p0[1] + p2[1]) * t +
            (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * t2 +
            (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * t3),
        ]);
      }
    }
    raw.push(pts[pts.length - 1]);

    const acc = [0];
    for (let i = 1; i < raw.length; i++) {
      acc.push(acc[i - 1] + Math.hypot(raw[i][0] - raw[i - 1][0], raw[i][1] - raw[i - 1][1]));
    }
    const total = acc[acc.length - 1];
    const out = [];
    const count = Math.max(24, Math.round(total / step));
    let j = 0;
    for (let i = 0; i <= count; i++) {
      const target = (i / count) * total;
      while (j < acc.length - 2 && acc[j + 1] < target) j++;
      const span = acc[j + 1] - acc[j] || 1;
      const f = (target - acc[j]) / span;
      out.push([
        raw[j][0] + (raw[j + 1][0] - raw[j][0]) * f,
        raw[j][1] + (raw[j + 1][1] - raw[j][1]) * f,
      ]);
    }
    /* unit normals (left-hand) per sample */
    const nrm = out.map((_, i) => {
      const a = out[Math.max(0, i - 1)];
      const b = out[Math.min(out.length - 1, i + 1)];
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      return [-dy / len, dx / len];
    });
    return { pts: out, nrm, length: total };
  }

  /*
   * One filament: a ribbon between s0 and s1 of the centreline, its width
   * modulated by the brush profile so it fades in at the head, thins out
   * towards the tail and wobbles slightly along the way.
   */
  function ribbon(cl, from, to, off, wide, jitter, prof, f) {
    const n = cl.pts.length - 1;
    const a = Math.max(0, Math.round(from * n));
    const b = Math.min(n, Math.round(to * n));
    if (b - a < 2) return "";
    const left = [];
    const right = [];
    for (let i = a; i <= b; i++) {
      const t = i / n;
      const local = smooth(0, 0.16, (i - a) / (b - a)) * smooth(0, 0.22, (b - i) / (b - a));
      /* slow body swell plus a finer tremor for a ragged edge */
      const swell = 1 + 0.18 * jitter(t * 1.7 + f * 0.31) + 0.07 * jitter(t * 6.3 + f * 0.11);
      const w = wide * prof(t) * (0.7 + 0.3 * local) * swell;
      /* keep the drift small: the hairline gaps between filaments are the
         texture, and a wider wobble closes them into one flat ribbon */
      const o = off + 0.26 * jitter(t * 1.3 + f * 0.23);
      const [px, py] = cl.pts[i];
      const [nx, ny] = cl.nrm[i];
      left.push([px + nx * (o + w / 2), py + ny * (o + w / 2)]);
      right.push([px + nx * (o - w / 2), py + ny * (o - w / 2)]);
    }
    const num = (v) => Math.round(v * 100) / 100;
    let d = `M${num(left[0][0])} ${num(left[0][1])}`;
    for (let i = 1; i < left.length; i++) d += `L${num(left[i][0])} ${num(left[i][1])}`;
    for (let i = right.length - 1; i >= 0; i--) d += `L${num(right[i][0])} ${num(right[i][1])}`;
    return d + "Z";
  }

  /* Filament bundle measured off the original brush: a ~13 unit band, two broad
     core strands, hairline splitters, and ~0.5 unit dry gaps between them. */
  const BUNDLE = [
    { off: -5.8, w: 0.8 },
    { off: -4.3, w: 1.4 },
    { off: -1.5, w: 3.2 },
    { off: 2.2, w: 3.0 },
    { off: 4.4, w: 0.9 },
    { off: 5.9, w: 1.6 },
  ];

  /**
   * Shape waypoints as fractions of the wrap box (car trio is inserted later).
   * carSplice = index where near/A/far are woven in for an exact car tangent.
   */
  function defaultWaypoints(leftward) {
    if (leftward) {
      return {
        carSplice: 7,
        points: [
          [0.33, -0.02], [0.5, 0.07], [0.7, 0.16], [0.87, 0.26],
          [0.955, 0.33], [0.957, 0.4], [0.9, 0.428],
          [0.06, 0.4], [0.025, 0.49], [0.04, 0.59], [0.1, 0.7],
          [0.19, 0.81], [0.28, 0.92], [0.33, 1.02],
        ],
      };
    }
    return {
      carSplice: 8,
      points: [
        [0.8, -0.02], [0.62, 0.08], [0.38, 0.19], [0.16, 0.29],
        [0.055, 0.37], [0.035, 0.44], [0.06, 0.495], [0.115, 0.515],
        [0.9, 0.35], [0.965, 0.44], [0.97, 0.54], [0.95, 0.64],
        [0.9, 0.745], [0.83, 0.85], [0.76, 0.95], [0.72, 1.02],
      ],
    };
  }

  /**
   * @param {number} w      wrap box width in px
   * @param {number} h      wrap box height in px
   * @param {number} ax,ay  car contact point, as fractions of the box
   * @param {number} deg    car rotation in deg (negative climbs to the right)
   * @param {boolean} leftward  true when the route travels right-to-left
   * @param {number} seed
   * @param {number[][]} [waypoints] optional shape points in 0–1 space
   * @param {number} [carSplice] index to insert the car tangent trio
   */
  function stroke({
    w,
    h,
    ax,
    ay,
    deg,
    leftward,
    seed = 7,
    waypoints,
    carSplice,
  }) {
    const rand = rng(seed);
    const jitter = noise(rand, 26);
    const k = h / 380; // brush scale: keeps the original's stroke weight

    /* Traverse: three collinear waypoints so the tangent at the car is exact. */
    const run = (leftward ? 0.34 : 0.3) * w;
    const rise = run * Math.tan((deg * Math.PI) / 180);
    const A = [ax * w, ay * h];
    const near = [A[0] - run, A[1] - rise];
    const far = [A[0] + run, A[1] + rise];

    const defaults = defaultWaypoints(leftward);
    const pts = waypoints && waypoints.length >= 2 ? waypoints : defaults.points;
    const splice =
      Number.isFinite(carSplice) ? carSplice : defaults.carSplice;
    const clamped = Math.max(0, Math.min(pts.length, splice));

    const shaped = pts.map(([fx, fy]) => [fx * w, fy * h]);
    const carTrio = leftward ? [far, A, near] : [near, A, far];
    const way = [
      ...shaped.slice(0, clamped),
      ...carTrio,
      ...shaped.slice(clamped),
    ];

    const cl = centreline(way, 2.4);

    /* Weight along the stroke: fades in, holds, then thins towards the tail. */
    const prof = (t) =>
      smooth(0, 0.09, t) * (1 - 0.84 * smooth(0.66, 1.0, t)) * (1 + 0.1 * jitter(t * 2.3));

    let d = "";
    BUNDLE.forEach((fil, i) => {
      const off = fil.off * k;
      const wide = fil.w * k;
      /* ragged head: filaments don't all catch the paper at once */
      const head = 0.004 + 0.05 * rand();
      /* solid up to the point where the brush starts running dry… */
      const dry = 0.63 + 0.12 * rand();
      d += ribbon(cl, head, dry, off, wide, jitter, prof, i);
      /* …then the same filament breaks into progressively shorter dashes */
      let s = dry;
      while (s < 1) {
        const t = (s - dry) / (1 - dry);
        const len = (0.14 - 0.1 * t) * (0.45 + rand());
        const gap = (0.012 + 0.05 * t) * (0.4 + rand());
        d += ribbon(cl, s, Math.min(1, s + len), off, wide, jitter, prof, i);
        s += len + gap;
      }
    });

    /* a few loose specks trailing off the dry end */
    const num = (v) => Math.round(v * 100) / 100;
    for (let i = 0; i < 16; i++) {
      const t = 0.68 + 0.32 * rand();
      const idx = Math.min(cl.pts.length - 1, Math.round(t * (cl.pts.length - 1)));
      const o = (-6 + 13 * rand()) * k;
      const r = (0.25 + 0.5 * rand()) * k;
      const [px, py] = cl.pts[idx];
      const [nx, ny] = cl.nrm[idx];
      const cx = px + nx * o;
      const cy = py + ny * o;
      const l = r * (2 + 4 * rand());
      const [tx, ty] = [-ny, nx];
      d += `M${num(cx - tx * l)} ${num(cy - ty * l)}` +
           `L${num(cx + nx * r - tx * l * 0.2)} ${num(cy + ny * r - ty * l * 0.2)}` +
           `L${num(cx + tx * l)} ${num(cy + ty * l)}` +
           `L${num(cx - nx * r + tx * l * 0.2)} ${num(cy - ny * r + ty * l * 0.2)}Z`;
    }
    return d;
  }

  return { stroke, defaultWaypoints };
})();
