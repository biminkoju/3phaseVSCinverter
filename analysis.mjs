// Derived measurements for the instrument panel. Everything here is computed
// from a createInverter() instance and its own buffers.

const TAU_PI2 = Math.PI * 2;

export function loadPower(model) {
  const meas = model.measure();
  const q = model.params;
  const vrms = meas.v1 / Math.SQRT2;
  const irms = meas.irms;
  const s = 3 * vrms * irms;
  return {
    vrms, irms, s,
    p: meas.p,
    q: Math.sqrt(Math.max(0, s * s - meas.p * meas.p)),
    pf: meas.pf,
    r: q.r, l: q.l,
    xl: TAU_PI2 * q.fout * q.l,
    utilisation: q.m > 0 && q.vdc > 0 ? meas.vll / (0.6124 * q.m * q.vdc) : 0,
  };
}

export function spaceVector(v) {
  const al = (2 / 3) * (v[0] - v[1] / 2 - v[2] / 2);
  const be = (2 / 3) * (Math.sqrt(3) / 2) * (v[1] - v[2]);
  const mag = Math.hypot(al, be);
  let ang = Math.atan2(be, al);
  if (ang < 0) ang += TAU_PI2;
  const sector = Math.floor(ang / (Math.PI / 3)) + 1;
  return { al, be, mag, ang, sector };
}

export const commonMode = (v) => (v[0] + v[1] + v[2]) / 3;

export function park(v, i, th) {
  const c = [Math.cos(th), Math.cos(th - TAU_PI2 / 3), Math.cos(th + TAU_PI2 / 3)];
  const s = [Math.sin(th), Math.sin(th - TAU_PI2 / 3), Math.sin(th + TAU_PI2 / 3)];
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  return {
    vd: (2 / 3) * dot(v, c), vq: -(2 / 3) * dot(v, s),
    id: (2 / 3) * dot(i, c), iq: -(2 / 3) * dot(i, s),
  };
}

export function ripple(model) {
  const steps = Math.round(1 / model.params.fsw / model.stepHeight);
  const rows = model.traceSeries(steps).rows;
  if (rows.length < 2) return { pp: 0, mean: 0 };
  let lo = Infinity, hi = -Infinity, sum = 0;
  for (const r of rows) {
    const x = r[8];
    if (x < lo) lo = x;
    if (x > hi) hi = x;
    sum += x;
  }
  return { pp: hi - lo, mean: sum / rows.length };
}

export function sweep(makeModel, values) {
  const rows = [];
  for (const value of values) {
    const m = makeModel(value);
    m.settle();
    const meas = m.measure();
    const spec = m.spectrum('v', 60, 4);
    rows.push({
      value, vll: meas.vll, irms: meas.irms, p: meas.p,
      thd: spec ? spec.thd : null, saturated: !!m.state.overmodulating,
    });
  }
  return rows;
}

export const toDb = (x, ref) => (x <= 0 || ref <= 0 ? -120 : Math.max(-120, 20 * Math.log10(x / ref)));
