// Three-phase voltage-source inverter — ideal-switch model.
//
// This module is the single source of truth for the figure: every number the
// page shows, every lamp that lights and every flow that runs is computed here.
// Nothing in it is a measurement. The model is stated in full so a reader can
// check it:
//
//   * DC link is an ideal source Vdc with two capacitors (its ripple is not
//     modelled), so the two rails sit at +Vdc/2 and -Vdc/2 about the midpoint.
//   * Six ideal switches in three legs (A = S1/S2, B = S3/S4, C = S5/S6).
//     Within a leg the switches are complementary; dead time is neglected.
//     With the upper switch on, the phase terminal sits at +Vdc/2, with the
//     lower switch on it sits at -Vdc/2.
//   * Antiparallel diodes are ideal. Each carries the phase current whenever
//     its own transistor is blocked in that direction, which is how reactive
//     current returns to the DC link; with every gate blocked ("off") the load
//     current freewheels through them and decays.
//   * Load is a balanced star of R + L in series per phase, star point
//     floating, so v(n) = (va + vb + vc) / 3.
//   * PWM is regular-sampled sine-triangle: the three references
//     m*sin(theta - k*2pi/3) are sampled once per carrier period and compared
//     with a unit-amplitude triangular carrier at fsw. Within a carrier period
//     the duty of leg k is exactly (1 + ref_k)/2, so the switched waveform
//     integrates to m*Vdc/2 per unit modulation, and the line-to-line
//     fundamental is (sqrt(3)/2) * m * Vdc / sqrt(2) = 0.6124 * m * Vdc.
//     m <= 1 stays in the linear region; there is no overmodulation.
//   * Reverse conduction is not modelled through the transistor channel: a
//     positive phase current uses the conducting upper transistor or the lower
//     diode, a negative one uses the lower transistor or the upper diode.
//
// The equations are integrated with a step of 1/(40*fsw). The switching state
// inside each step is applied as its exact on-fraction, so the screen trace is
// a square wave sampled at 40 points per carrier period and the RMS / DFT
// figures are window averages of the same waveform, not point samples.
//
// All values are quantities of THIS model, at the parameters shown on the
// panel — they are not bench measurements.

export const PARAMS = {
  vdc: 400, // V, DC link (settable 200..750)
  m: 0.8, // modulation index (settable 0.05..1.00)
  fout: 50, // Hz, fundamental (settable 5..100)
  fsw: 4000, // Hz, carrier (fixed for this figure)
  r: 2, // ohm per phase
  l: 0.004, // H per phase
  scopeSamples: 256, // samples in the screen buffer (6.4 carrier periods)
  scopePerCarrier: 40, // integration steps per carrier period
  measureDt: 0.0005, // s, window of the RMS / DFT sampling (2 carrier periods)
  deadTime: 0, // s, both devices of a leg off during a transition (0 = ideal)
  modulation: "sine", // "sine" | "third" | "minmax"
};

export const VECTORS = [
  { name: "V0", bits: "000" }, // all lower switches on (zero vector)
  { name: "V1", bits: "100" },
  { name: "V2", bits: "110" },
  { name: "V3", bits: "010" },
  { name: "V4", bits: "011" },
  { name: "V5", bits: "001" },
  { name: "V6", bits: "101" },
  { name: "V7", bits: "111" }, // all upper switches on (zero vector)
];

const TAU = Math.PI * 2;
const frac = (x) => x - Math.floor(x);

/** Unit-amplitude triangular carrier, symmetric about zero. */
export function carrier(t, fsw) {
  return 1 - 4 * Math.abs(frac(t * fsw) - 0.5);
}

/** Gating for a vector index 0..7: [S1..S6], lower = complement. */
export function gatingOfVector(index) {
  const bits = VECTORS[index].bits;
  const upper = [...bits].map((b) => b === "1");
  return [upper[0], !upper[0], upper[1], !upper[1], upper[2], !upper[2]];
}

const overlap = (u0, u1, lo, hi) => Math.max(0, Math.min(u1, hi) - Math.max(u0, lo));

export function createInverter(options = {}) {
  const p = { ...PARAMS, ...options };
  const PP = p.scopePerCarrier;
  const h = 1 / (p.fsw * PP); // integration step, s
  // Recomputed, not captured: R and L are settable while the page runs.
  let decay = Math.exp((-p.r * h) / p.l);
  let gain = 1 / p.r;
  const refresh = () => {
    decay = p.l > 1e-9 ? Math.exp((-p.r * h) / p.l) : 0;
    gain = 1 / p.r;
  };

  const state = {
    mode: "pwm", // "pwm" | "six" | "off"
    vector: 1, // V1 = 100 while stepping six-step vectors by hand
    sixHold: false, // six-step: true = hold the chosen vector, false = rotate at fout
    t: 0,
    step: 0, // integer integration step, t = step*h
    i: [0, 0, 0], // A per phase
    iAvg: [0, 0, 0],
    gate: [false, false, false, false, false, false], // transistor gate on
    duty: [0, 0, 0, 0, 0, 0], // recent conduction fraction per switch
    diode: [false, false, false, false, false, false],
    onNow: [0, 0, 0], // on-fraction of each leg in the current step
    v: [0, 0, 0], // phase terminal voltage about the DC midpoint, V
    idc: 0, // A, DC+ current
    idcAvg: 0,
    scope: { v: new Float32Array(p.scopeSamples), i: new Float32Array(p.scopeSamples), at: 0, filled: 0 },
    ring: {
      dt: p.measureDt,
      v: new Float32Array(1600),
      ia: new Float32Array(1600),
      at: 0,
      filled: 0,
      since: 0, // samples since the last fout change; the DFT needs a whole period
    },
    trace: {
      stride: 12,
      cap: 2048,
      dt: h,
      data: new Float32Array(2048 * 12),
      at: 0,
      filled: 0,
    },
    out: {
      stride: 6,
      cap: 8000,
      dt: p.measureDt,
      data: new Float32Array(8000 * 6),
      at: 0,
      filled: 0,
    },
    inst: {
      skip: 4,
      count: 0,
      dt: h * 4,
      cap: 8192,
      v: new Float32Array(8192),
      i: new Float32Array(8192),
      at: 0,
      filled: 0,
    },
    onTime: [0, 0, 0, 0, 0, 0],
    diodeTime: [0, 0, 0, 0, 0, 0],
    condAcc: 0,
    cond: { pct: [0, 0, 0, 0, 0, 0], diodePct: [0, 0, 0, 0, 0, 0], span: 0 },
    overmodulating: false,
  };

  const pushScope = (va, ia) => {
    const s = state.scope;
    s.v[s.at % p.scopeSamples] = va;
    s.i[s.at % p.scopeSamples] = ia;
    s.at += 1;
    s.filled = Math.min(s.filled + 1, p.scopeSamples);
  };
  const pushMeasure = (va, ia) => {
    const r = state.ring;
    r.v[r.at % r.v.length] = va;
    r.ia[r.at % r.v.length] = ia;
    r.at += 1;
    r.filled = Math.min(r.filled + 1, r.v.length);
    r.since += 1;
  };

  const pushOut = (vs, is) => {
    const o = state.out;
    const at = (o.at % o.cap) * o.stride;
    const d = o.data;
    d[at] = vs[0];
    d[at + 1] = vs[1];
    d[at + 2] = vs[2];
    d[at + 3] = is[0];
    d[at + 4] = is[1];
    d[at + 5] = is[2];
    o.at += 1;
    o.filled = Math.min(o.filled + 1, o.cap);
  };

  // References are sampled once per carrier period (regular sampling) and held
  // for that period, which is what a digital PWM peripheral does.
  let refPeriod = -1;
  let refs = [0, 0, 0];
  const refFor = (period) => {
    if (period !== refPeriod) {
      refPeriod = period;
      const t = (period * PP * h);
      const th = TAU * p.fout * t;
      const raw = [Math.sin(th), Math.sin(th - TAU / 3), Math.sin(th - TAU * (2 / 3))];
      let add = 0;
      if (p.modulation === "third") {
        // third-harmonic injection: same fundamental, 15 % more linear range
        add = Math.sin(3 * th) / 6;
      } else if (p.modulation === "minmax") {
        add = -(Math.max(...raw) + Math.min(...raw)) / 2;
      }
      refs = raw.map((x) => p.m * (x + add));
    }
    return refs;
  };

  /** Exact on-fraction of leg k over the step [u0, u1] of a carrier period. */
  function legFractions(period, u0, u1) {
    if (state.mode === "off") return [0, 0, 0];
    if (state.mode === "six") {
      const g = gatingOfVector(sixVector(period * PP + u0 * PP));
      return [g[0] ? 1 : 0, g[2] ? 1 : 0, g[4] ? 1 : 0];
    }
    const r = refFor(period);
    const on = [0, 0, 0];
    for (let k = 0; k < 3; k++) {
      const a = (1 + r[k]) / 4; // carrier falls through the reference
      const b = (3 - r[k]) / 4; // and rises through it again
      on[k] = (overlap(u0, u1, 0, a) + overlap(u0, u1, b, 1)) * PP;
    }
    return on;
  }

  /**
   * Which vector is applied at an absolute step index. Six-step holds a
   * manually chosen vector, or rotates V1..V6 through 60-degree sectors of the
   * fundamental at fout, which is the classic six-step operating mode.
   */
  function sixVector(stepIndex) {
    if (state.sixHold) return state.vector;
    const sector = Math.floor(frac((stepIndex * h) * p.fout) * 6) % 6;
    state.vector = sector + 1; // V1..V6
    return state.vector;
  }

  /** Gate states at a point u inside the carrier period. */
  function gateAt(period, u) {
    if (state.mode === "off") return [false, false, false, false, false, false];
    if (state.mode === "six") return gatingOfVector(sixVector(period * PP + u * PP));
    const r = refFor(period);
    const up = r.map((x) => u < (1 + x) / 4 || u > (3 - x) / 4);
    return [up[0], !up[0], up[1], !up[1], up[2], !up[2]];
  }

  /** One exact integration step. */
  function stepOnce() {
    const s = state;
    const period = Math.floor(s.step / PP);
    const u0 = (s.step % PP) / PP;
    const u1 = u0 + 1 / PP;
    const vm = p.vdc / 2;

    const on = legFractions(period, u0, u1);
    const g6 = gateAt(period, u0 + 0.5 / PP); // state at the step's middle
    const iBefore = s.i.slice();

    const v = [0, 0, 0];
    if (s.mode === "off") {
      // Every gate blocked: each phase current is clamped by the diode its
      // direction selects, and decays through R and L.
      for (let k = 0; k < 3; k++) v[k] = iBefore[k] > 0 ? -vm : iBefore[k] < 0 ? vm : 0;
    } else {
      for (let k = 0; k < 3; k++) v[k] = vm * (2 * on[k] - 1);
    }
    const vn = (v[0] + v[1] + v[2]) / 3;

    let idc = 0;
    for (let k = 0; k < 3; k++) {
      const target = (v[k] - vn) * gain;
      let next = target + (iBefore[k] - target) * decay;
      if (s.mode === "off" && Math.abs(v[k]) < 1e-9) next = 0;
      s.i[k] = next;
      idc += on[k] * next;
    }

    // Conduction of every device, from its gate and the current's direction.
    const diode = [false, false, false, false, false, false];
    for (let k = 0; k < 3; k++) {
      const up = g6[2 * k];
      const low = g6[2 * k + 1];
      if (iBefore[k] < 0) diode[2 * k] = !low; // upper diode carries reverse current
      if (iBefore[k] > 0) diode[2 * k + 1] = !up; // lower diode carries forward current
    }

    s.v = v;
    s.gate = g6;
    s.diode = diode;
    s.onNow = on;
    s.idc = idc;

    // Screen trace: the square wave at the step's middle, so pulses stay crisp.
    pushScope(g6[0] ? vm : -vm, s.i[0]);

    // Wide record, one row per integration step.
    {
      const tr = s.trace;
      const at = (tr.at % tr.cap) * tr.stride;
      const d = tr.data;
      d[at] = u0;
      if (s.mode === "pwm") {
        const r = refFor(period);
        d[at + 1] = r[0];
        d[at + 2] = r[1];
        d[at + 3] = r[2];
        s.overmodulating = p.m > 1.0001;
      } else {
        d[at + 1] = 2 * on[0] - 1;
        d[at + 2] = 2 * on[1] - 1;
        d[at + 3] = 2 * on[2] - 1;
        s.overmodulating = false;
      }
      let mask = 0;
      for (let k = 0; k < 6; k++) if (g6[k]) mask |= 1 << k;
      d[at + 4] = mask;
      d[at + 5] = v[0];
      d[at + 6] = v[1];
      d[at + 7] = v[2];
      d[at + 8] = s.i[0];
      d[at + 9] = s.i[1];
      d[at + 10] = s.i[2];
      d[at + 11] = idc;
      tr.at += 1;
      tr.filled = Math.min(tr.filled + 1, tr.cap);
    }

    {
      const n = s.inst;
      if (++n.count >= n.skip) {
        n.count = 0;
        n.v[n.at % n.cap] = v[0];
        n.i[n.at % n.cap] = s.i[0];
        n.at += 1;
        n.filled = Math.min(n.filled + 1, n.cap);
      }
    }

    // Conduction time per device, over exactly one fundamental period.
    for (let k = 0; k < 6; k++) {
      if (g6[k]) s.onTime[k] += h;
      if (diode[k]) s.diodeTime[k] += h;
    }
    s.condAcc += h;
    if (s.condAcc >= 1 / p.fout - 1e-12) {
      for (let k = 0; k < 6; k++) {
        s.cond.pct[k] = s.onTime[k] / s.condAcc;
        s.cond.diodePct[k] = s.diodeTime[k] / s.condAcc;
        s.onTime[k] = 0;
        s.diodeTime[k] = 0;
      }
      s.cond.span = s.condAcc;
      s.condAcc = 0;
    }

    // 10 ms averagers: what the lamps and the flow brightness show.
    const a = 1 - Math.exp(-h / 0.01);
    for (let k = 0; k < 6; k++) {
      const want = s.mode === "off" ? 0 : k % 2 === 0 ? on[k >> 1] : 1 - on[k >> 1];
      s.duty[k] += (want - s.duty[k]) * a;
    }
    for (let k = 0; k < 3; k++) s.iAvg[k] += (s.i[k] - s.iAvg[k]) * a;
    s.idcAvg += (idc - s.idcAvg) * a;

    // Measurement windows: exact integrals, never point samples.
    accT += h;
    for (let k = 0; k < 3; k++) {
      vSumK[k] += v[k] * h;
      iSumK[k] += ((iBefore[k] + s.i[k]) / 2) * h;
    }
    while (accT >= p.measureDt - 1e-15) {
      const w = p.measureDt;
      const vAvg = [vSumK[0] / accT, vSumK[1] / accT, vSumK[2] / accT];
      const iAvg = [iSumK[0] / accT, iSumK[1] / accT, iSumK[2] / accT];
      pushMeasure(vAvg[0], iAvg[0]);
      pushOut(vAvg, iAvg);
      for (let k = 0; k < 3; k++) {
        vSumK[k] -= vAvg[k] * w;
        iSumK[k] -= iAvg[k] * w;
      }
      accT -= w;
    }

    s.step += 1;
    s.t = s.step * h;
  }

  function resetConduction() {
    for (let k = 0; k < 6; k++) {
      state.onTime[k] = 0;
      state.diodeTime[k] = 0;
    }
    state.condAcc = 0;
    state.cond.span = 0;
  }

  let accT = 0; // time in the current measurement window
  let vSumK = [0, 0, 0];
  let iSumK = [0, 0, 0];
  let carry = 0; // fractional steps owed to the next advance()

  const api = {
    params: p,
    state,

    setMode(mode) {
      if (!['pwm', 'six', 'off'].includes(mode)) return;
      state.mode = mode;
      refPeriod = -1;
      resetConduction();
    },
    setVector(index) {
      state.vector = ((index % 8) + 8) % 8;
      state.sixHold = true;
    },
    /** Six-step: resume the rotation at fout, or step forward one sector. */
    setSixHold(hold) {
      state.sixHold = !!hold;
    },
    sixStepNext() {
      state.vector = (state.vector % 6) + 1;
      state.sixHold = true;
    },
    setVdc(value) {
      p.vdc = Math.min(750, Math.max(200, value));
    },
    setM(value) {
      p.m = Math.min(1.2, Math.max(0.05, value));
    },
    setFout(value) {
      p.fout = Math.min(100, Math.max(5, value));
      state.ring.since = 0;
      refPeriod = -1;
      resetConduction();
    },
    /** Load resistance per phase, ohm. The decay/gain coefficients follow. */
    setR(value) {
      p.r = Math.min(20, Math.max(0.2, value));
      refresh();
      state.ring.since = 0;
    },
    /** Load inductance per phase, H. Below 0.1 mH the current is almost purely resistive. */
    setL(value) {
      p.l = Math.min(0.05, Math.max(0.0001, value));
      refresh();
      state.ring.since = 0;
    },

    /** Advance simulated time by dt seconds (visual time, not wall time). */
    advance(dt) {
      carry += Math.min(dt, 0.12) / h;
      let n = Math.floor(carry + 1e-9);
      if (n > 400000) n = 400000;
      carry -= n;
      for (let j = 0; j < n; j++) stepOnce();
      return state;
    },

    /** Derived quantities over one fundamental period of sampled data. */
    measure() {
      const r = state.ring;
      const period = 1 / p.fout;
      const want = Math.round(period / r.dt);
      const need = Math.min(want, r.filled);
      if (need < 8 || r.since < want) return { vll: 0, irms: 0, i1: 0, p: 0, pf: 0, samples: 0, v1: 0 };
      let sv = 0;
      let cv = 0;
      let si = 0;
      let ci = 0;
      for (let n = 0; n < need; n++) {
        const idx = (r.at - need + n + r.v.length * 2) % r.v.length;
        const w = (TAU * n) / need;
        sv += r.v[idx] * Math.sin(w);
        cv += r.v[idx] * Math.cos(w);
        si += r.ia[idx] * Math.sin(w);
        ci += r.ia[idx] * Math.cos(w);
      }
      const v1 = (2 / need) * Math.hypot(sv, cv);
      const i1 = (2 / need) * Math.hypot(si, ci);
      const phaseV = Math.atan2(cv, sv);
      const phaseI = Math.atan2(ci, si);
      const irms = i1 / Math.SQRT2;
      return {
        v1,
        i1,
        irms,
        vll: (v1 * Math.sqrt(3)) / Math.SQRT2,
        p: 3 * irms * irms * p.r,
        pf: Math.cos(phaseV - phaseI),
        phaseV,
        phaseI,
        samples: need,
      };
    },

    scopeSeries() {
      const s = state.scope;
      const out = { v: [], i: [] };
      const n = s.filled;
      for (let k = 0; k < n; k++) {
        const idx = (s.at - n + k + s.v.length * 4) % s.v.length;
        out.v.push(s.v[idx]);
        out.i.push(s.i[idx]);
      }
      return out;
    },

    /** Screen points for the two traces, in a 0..100 x 0..100 box, y down. */
    displayScope(vArr, iArr, opts = {}) {
      const vMax = opts.vMax ?? p.vdc * 0.62;
      let iMax = 1e-6;
      for (const x of iArr) iMax = Math.max(iMax, Math.abs(x));
      iMax = Math.max(iMax * 1.15, 1);
      const box = (arr, lo, hi) => {
        const pts = [];
        const n = arr.length;
        for (let k = 0; k < n; k++) {
          const x = n > 1 ? (k / (n - 1)) * 100 : 0;
          const t = Math.max(-1, Math.min(1, arr[k] / (arr === vArr ? vMax : iMax)));
          const mid = (lo + hi) / 2;
          const y = mid - t * ((hi - lo) / 2) * 0.94;
          pts.push([+x.toFixed(2), +y.toFixed(2)]);
        }
        return pts;
      };
      return { v: box(vArr, 56, 99), i: box(iArr, 4, 47), iMax };
    },

    traceSeries(steps = 2048) {
      const tr = state.trace;
      const n = Math.min(steps, tr.filled);
      const out = [];
      for (let k = 0; k < n; k++) {
        const at = ((tr.at - n + k + tr.cap * 4) % tr.cap) * tr.stride;
        out.push(tr.data.subarray(at, at + tr.stride));
      }
      return { dt: tr.dt, stride: tr.stride, rows: out };
    },

    outSeries(seconds = 0.06) {
      const o = state.out;
      const n = Math.min(o.filled, Math.max(8, Math.round(seconds / o.dt)));
      const v = [[], [], []];
      const i = [[], [], []];
      for (let k = 0; k < n; k++) {
        const at = ((o.at - n + k + o.cap * 4) % o.cap) * o.stride;
        for (let ph = 0; ph < 3; ph++) {
          v[ph].push(o.data[at + ph]);
          i[ph].push(o.data[at + 3 + ph]);
        }
      }
      return { dt: o.dt, n, v, i };
    },

    conduction() {
      return { pct: state.cond.pct.slice(), diodePct: state.cond.diodePct.slice(), span: state.cond.span };
    },

    /**
     * Harmonic magnitudes of the instantaneous phase-A record over exactly
     * `cycles` fundamental periods (whole cycles, so neighbouring orders do not
     * leak into each other). Rectangular window: nothing is tapered, so a
     * sideband is neither hidden nor smeared. A non-integer number of switching
     * periods fits inside those cycles, which is the real limitation of this
     * measurement and the reason the plot is labelled as a rectangular window.
     */
    spectrum(which = "v", maxOrder = 60, cycles = 2) {
      const r = state.inst;
      const src = which === "i" ? r.i : r.v;
      const per = Math.max(8, Math.round(1 / p.fout / r.dt));
      // Whole cycles only, so neighbouring orders separate; ask for more than
      // fits and you get as many as the record holds instead of nothing.
      const whole = Math.max(1, Math.min(cycles, Math.floor(r.filled / per)));
      const n = per * whole;
      if (n > r.cap || r.filled < n) return null;
      // THD is only meaningful below the switching band: at fout 100 Hz the
      // 4 kHz carrier is only the 40th harmonic, and counting it would report
      // the carrier, not the distortion of the fundamental.
      const band = Math.max(5, Math.min(maxOrder, Math.floor(0.45 * p.fsw / p.fout)));
      const cap = Math.min(band, Math.floor(r.cap / 2 / whole) - 1);
      const at = (k) => (r.at - n + k + r.cap * 4) % r.cap;
      const mag = [];
      for (let order = 1; order <= cap; order++) {
        let sv = 0;
        let cv = 0;
        for (let k = 0; k < n; k++) {
          const w = (TAU * order * whole * k) / n;
          const x = src[at(k)];
          sv += x * Math.sin(w);
          cv += x * Math.cos(w);
        }
        mag.push((2 / n) * Math.hypot(sv, cv));
      }
      const fund = mag[0] || 1e-12;
      let sq = 0;
      for (let k = 1; k < mag.length; k++) sq += mag[k] * mag[k];
      return {
        mag,
        fund,
        thd: Math.sqrt(sq) / fund,
        orders: cap,
        n,
        cycles: whole,
        fout: p.fout,
        fsw: p.fsw,
        df: p.fout * whole,
        band,
      };
    },

    vectors() {
      return VECTORS;
    },
  };

  // Settle into periodic steady state before the first paint, so the readouts
  // do not open on a switching transient. Runs the same equations forward.
  api.settle = () => {
    // Long enough for the load transient and, at low output frequencies, for
    // two whole fundamental periods of record, so the plots and the spectrum
    // have real data on the first paint.
    // One second of record plus the transient: enough for four whole cycles
    // down to 10 Hz, so the spectrum plot has data on the first paint.
    const seconds = Math.max(0.064, 1 + 3.2 / p.fout);
    const steps = Math.ceil(seconds / 0.0002);
    for (let k = 0; k < steps; k++) api.advance(0.0002);
  };
  api.stepHeight = h;
  return api;
}
