// Instrument panel for the inverter figure: static SVG skeleton, styles and
// the inlined script that keeps it true to model.mjs. Every number shown is a
// simulation output of the ideal model stated in the caption.

export const PANEL_CSS = `
.ip{margin:28px auto 0;max-width:1040px;color-scheme:dark;color:var(--anatomy-text);font-family:var(--anatomy-mono)}
.ip-bar{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding:10px 14px;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid)}
.ip-toggle{display:flex;align-items:center;gap:8px;background:none;border:0;color:var(--anatomy-strong);font:inherit;font-size:11px;letter-spacing:.1em;text-transform:uppercase;cursor:pointer;padding:4px 2px}
.ip-toggle:focus-visible{outline:1px solid var(--anatomy-hi);outline-offset:3px}
.ip-chev{width:7px;height:7px;border-right:1px solid currentColor;border-bottom:1px solid currentColor;transform:rotate(45deg);transition:transform .18s var(--anatomy-ease);margin-bottom:3px}
.ip-toggle[aria-expanded="false"] .ip-chev{transform:rotate(-45deg);margin-bottom:0}
.ip-mode{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--anatomy-text);padding:2px 7px;box-shadow:inset 0 0 0 1px var(--anatomy-lo)}
.ip-flag{font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--anatomy-red)}
.ip-sp{flex:1 1 auto}
.ip-tb{display:flex;align-items:center;gap:6px;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:var(--anatomy-muted)}
.ip-tb select{color-scheme:dark;appearance:none;font:inherit;font-size:10px;background:var(--anatomy-face);color:var(--anatomy-strong);border:0;box-shadow:inset 0 0 0 1px var(--anatomy-lo);padding:3px 5px;letter-spacing:.06em}
.ip-btn{font:inherit;font-size:10px;letter-spacing:.1em;text-transform:uppercase;background:var(--anatomy-face);color:var(--anatomy-strong);border:0;box-shadow:inset 0 0 0 1px var(--anatomy-lo);padding:4px 9px;cursor:pointer}
.ip-btn:hover{box-shadow:inset 0 0 0 1px var(--anatomy-mid)}
.ip-btn[aria-pressed="true"]{box-shadow:inset 0 0 0 1px var(--anatomy-lit);color:var(--anatomy-lit)}
.ip-body{display:grid;grid-template-columns:1fr;gap:20px;padding:18px;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);margin-top:-1px}
.ip-body[hidden]{display:none}
.ip-fig{margin:0;display:flex;flex-direction:column;gap:6px;min-width:0}
.ip-fig figcaption{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;font-size:12.5px;line-height:1.4}
.ip-fig figcaption b{color:var(--anatomy-strong);font-weight:400;letter-spacing:.08em;text-transform:uppercase}
.ip-fig figcaption span{color:var(--anatomy-muted)}
.ip-svg{width:100%;height:auto;display:block;background:var(--anatomy-paper);box-shadow:inset 0 0 0 1px var(--anatomy-faint);touch-action:pan-y}
.ip-svg:focus-visible{outline:1px solid var(--anatomy-hi);outline-offset:2px}
.ip-note{margin:0;font-size:12px;line-height:1.6;color:var(--anatomy-muted)}
.ip-note b{color:var(--anatomy-text);font-weight:400}
.ip-frame{fill:none;stroke:var(--anatomy-faint);stroke-width:1}
.ip-grid{fill:none;stroke:var(--anatomy-faint);stroke-width:.5;opacity:.85}
.ip-axis{fill:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:11px;letter-spacing:.04em}
.ip-lane{fill:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10px;letter-spacing:.02em}
.plot-line{fill:none;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke}
.plot-line[data-tone="lit"]{stroke:var(--anatomy-lit);stroke-width:1.15}
.plot-line[data-tone="hi"]{stroke:var(--anatomy-hi);stroke-width:1.05}
.plot-line[data-tone="mid"]{stroke:var(--anatomy-mid);stroke-width:1}
.plot-line[data-tone="lo"]{stroke:var(--anatomy-lo);stroke-width:.9}
.plot-line[data-tone="blue"]{stroke:var(--anatomy-blue);stroke-width:1.15}
.plot-line[data-tone="red"]{stroke:var(--anatomy-red);stroke-width:1.15}
.plot-line[data-tone="green"]{stroke:var(--anatomy-green);stroke-width:1.05}
.plot-line[data-dash]{stroke-dasharray:3 3}
.ip-bar-rect{stroke:none}
.ip-cursor line{stroke:var(--anatomy-hi);stroke-width:.8;stroke-dasharray:2 2}
.ip-cursor text{fill:var(--anatomy-strong);font-family:var(--anatomy-mono);font-size:11px}
.ip-cursor rect{fill:var(--anatomy-halo);stroke:var(--anatomy-lo);stroke-width:.5}
.ip-cursor[hidden]{display:none}
.ip-meters{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:2px 0 0}
.ip-meter{background:var(--anatomy-paper);box-shadow:inset 0 0 0 1px var(--anatomy-faint);padding:10px 12px}
.ip-meter b{display:block;font-size:19px;font-weight:400;color:var(--anatomy-strong);font-variant-numeric:tabular-nums}
.ip-meter span{display:block;margin-top:3px;font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--anatomy-muted)}
@media (max-width:820px){.ip-body{grid-template-columns:1fr}}
/* The plot viewBox is 1000 wide; when the panel is narrower the SVG scales
   down, so the user-unit font sizes are raised to keep ~11 px on screen. */
@media (max-width:900px){
  .ip-axis{font-size:14px}
  .ip-lane{font-size:13px}
}
@media (max-width:680px){
  .ip-axis{font-size:19px}
  .ip-lane{font-size:17px}
}
@media (max-width:480px){
  .ip-axis{font-size:26px}
  .ip-lane{font-size:23px}
  .ip-body{padding:12px;gap:16px}
}
`;

function plotBox(id, h, lanes = []) {
  const L = 84, R = 22, T = 20, B = 34, w = 1000;
  const g = [];
  g.push(`<rect class="ip-frame" x="${L}" y="${T}" width="${w - L - R}" height="${h - T - B}"/>`);
  for (let i = 1; i < 4; i++) {
    const y = T + ((h - T - B) * i) / 4;
    g.push(`<line class="ip-grid" x1="${L}" y1="${y.toFixed(1)}" x2="${w - R}" y2="${y.toFixed(1)}"/>`);
  }
  for (let i = 1; i < 6; i++) {
    const x = L + ((w - L - R) * i) / 6;
    g.push(`<line class="ip-grid" x1="${x.toFixed(1)}" y1="${T}" x2="${x.toFixed(1)}" y2="${h - B}"/>`);
  }
  for (const y of lanes) g.push(`<line class="ip-grid" x1="${L}" y1="${y}" x2="${w - R}" y2="${y}" style="stroke-dasharray:2 4"/>`);
  return {
    w, h, L, R, T, B,
    frame: g.join(""),
    inner: `<clipPath id="clip-${id}"><rect x="${L}" y="${T}" width="${w - L - R}" height="${h - T - B}"/></clipPath>`,
  };
}

export function panelHtml() {
  const pwm = plotBox("pwm", 340, [126, 226]);
  const out = plotBox("out", 350, [124, 218]);
  const spec = plotBox("spec", 290, []);
  const cond = plotBox("cond", 290, []);
  const vec = plotBox("vec", 420, []);
  const dq = plotBox("dq", 300, [150]);
  const sweepBox = plotBox("sweep", 300, []);
  const fig = (key, title, sub, box) => `
    <figure class="ip-fig">
      <figcaption><b>${title}</b><span>${sub}</span></figcaption>
      <svg class="ip-svg" viewBox="0 0 ${box.w} ${box.h}" data-plot="${key}" tabindex="0" role="img" aria-label="${title}">
        <defs>${box.inner}</defs>
        ${box.frame}
        <g clip-path="url(#clip-${key})" data-trace></g>
        <g data-bars></g>
        <g data-labels></g>
        <g class="ip-cursor" data-cursor hidden><line/><rect/><text/></g>
      </svg>
      <p class="ip-note" data-note="${key}"></p>
    </figure>`;
  return `
<section class="ip" id="instrument" aria-label="Instrument panel">
  <div class="ip-bar">
    <button class="ip-toggle" type="button" data-ip-toggle aria-expanded="true" aria-controls="ip-body">
      <span class="ip-chev" aria-hidden="true"></span> Instrument panel
    </button>
    <span class="ip-mode" data-ip-mode>PWM</span>
    <span class="ip-flag" data-ip-flag hidden>overmodulation, m &gt; 1</span>
    <span class="ip-sp"></span>
    <label class="ip-tb">time base
      <select data-ip-tb>
        <option value="2c">2 carrier periods</option>
        <option value="1" selected>1 cycle</option>
        <option value="3">3 cycles</option>
        <option value="10">10 cycles</option>
      </select>
    </label>
    <button class="ip-btn" type="button" data-ip-pause aria-pressed="false">Pause</button>
    <button class="ip-btn" type="button" data-ip-csv>Export CSV</button>
    <button class="ip-btn" type="button" data-ip-sweep>Run sweep</button>
  </div>
  <div class="ip-body" id="ip-body">
    ${fig("pwm", "Modulation", "carrier 4 kHz · regular sampling · reference held one carrier", pwm)}
    ${fig("out", "Output", "phase and line voltage, phase current · window averages", out)}
    ${fig("spec", "Spectrum", "instantaneous phase A · rectangular window over whole cycles", spec)}
    ${fig("cond", "Devices", "conduction over one fundamental period · DC-link current", cond)}
    ${fig("vec", "Space vector", "pole voltage in the alpha-beta frame · hexagon of the six active vectors", vec)}
    ${fig("dq", "Rotating frame", "Park transform aligned to the fundamental · DC in steady state", dq)}
    ${fig("sweep", "Sweep", "the same model evaluated across a parameter range · steady states only", sweepBox)}
    <figure class="ip-fig"><figcaption><b>Meters</b><span>computed from the same DFT</span></figcaption><p class="ip-meters" data-meters></p><p class="ip-note">Every figure here is computed from the model at your settings. P = 3·I_rms²·R, Q = √(S²−P²), S = 3·V_rms·I_rms, and utilisation = V_LL / (0.6124·m·Vdc) with the ideal linear-region value as the reference.</p></figure>
  </div>
</section>`;
}

export function panelScript() {
  return `
// ---------------------------------------------------------------- panel ----
const IP = {
  root: document.getElementById("instrument"),
  toggle: document.querySelector("[data-ip-toggle]"),
  body: document.getElementById("ip-body"),
  mode: document.querySelector("[data-ip-mode]"),
  flag: document.querySelector("[data-ip-flag]"),
  tb: document.querySelector("[data-ip-tb]"),
  pause: document.querySelector("[data-ip-pause]"),
  csv: document.querySelector("[data-ip-csv]"),
  plots: {},
};
for (const svgEl of IP.root.querySelectorAll("[data-plot]")) {
  const key = svgEl.getAttribute("data-plot");
  const vb = (svgEl.getAttribute("viewBox") || "0 0 720 200").split(/\\s+/).map(Number);
  IP.plots[key] = {
    svg: svgEl,
    w: vb[2], h: vb[3],
    L: 84, R: 22, T: 20, B: 34,
    trace: svgEl.querySelector("[data-trace]"),
    bars: svgEl.querySelector("[data-bars]"),
    labels: svgEl.querySelector("[data-labels]"),
    cursor: svgEl.querySelector("[data-cursor]"),
    note: document.querySelector('[data-note="' + key + '"]'),
    hover: null,
  };
}
const ipBase = { paused: false, tb: "1" };

// 1-2-5 decade ticks, labelled inside the left margin.
function ipTicks(lo, hi, count) {
  const span = Math.abs(hi - lo) || 1;
  const raw = span / Math.max(1, count || 3);
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / mag;
  const step = (n >= 5 ? 5 : n >= 2 ? 2 : 1) * mag;
  const out = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + step * 0.001; v += step) out.push(v);
  return out;
}

function ipAxisNums(p, lane, lo, hi, unit, fmt) {
  const f = fmt || ((v) => (Math.abs(v) >= 10 ? v.toFixed(0) : v.toFixed(1)));
  return ipTicks(lo, hi, 3).map((v) => {
    const y = lane[1] - ((v - lo) / ((hi - lo) || 1)) * (lane[1] - lane[0]);
    return '<text class="ip-axis" x="' + (p.L - 7) + '" y="' + (y + 4).toFixed(1) + '" text-anchor="end">' + f(v) + (unit || '') + '</text>';
  }).join("");
}

function ipMap(plot, values, lane) {
  const x0 = plot.L, x1 = plot.w - plot.R;
  const y0 = lane ? lane[0] : plot.T, y1 = lane ? lane[1] : plot.h - plot.B;
  let lo = Infinity, hi = -Infinity;
  for (const v of values) { if (v < lo) lo = v; if (v > hi) hi = v; }
  if (!isFinite(lo)) { lo = 0; hi = 1; }
  if (hi - lo < 1e-9) { hi = lo + 1; }
  const n = values.length;
  const pts = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = n > 1 ? x0 + ((x1 - x0) * i) / (n - 1) : x0;
    const y = y1 - ((values[i] - lo) / (hi - lo)) * (y1 - y0);
    pts[i] = [x, y];
  }
  return { pts, lo, hi, x0, x1, y0, y1 };
}

function ipD(pts) {
  let d = "";
  for (let i = 0; i < pts.length; i++) {
    d += (i ? "L" : "M") + pts[i][0].toFixed(1) + " " + pts[i][1].toFixed(1);
  }
  return d;
}

function ipMapFixed(plot, values, lane, lo, hi) {
  const x0 = plot.L, x1 = plot.w - plot.R;
  const y0 = lane[0], y1 = lane[1];
  const n = values.length;
  const pts = new Array(n);
  for (let i = 0; i < n; i++) {
    const x = n > 1 ? x0 + ((x1 - x0) * i) / (n - 1) : x0;
    const y = y1 - ((values[i] - lo) / (hi - lo)) * (y1 - y0);
    pts[i] = [x, y];
  }
  return { pts, lo, hi, x0, x1, y0, y1 };
}

function ipStepsFixed(plot, values, lane, lo, hi) {
  const m = ipMapFixed(plot, values, lane, lo, hi);
  const pts = [];
  for (let i = 0; i < m.pts.length; i++) {
    const q = m.pts[i];
    if (i) pts.push([q[0], pts[pts.length - 1][1]]);
    pts.push([q[0], q[1]]);
  }
  return ipD(pts);
}

function ipSteps(plot, values, lane) {
  const m = ipMap(plot, values, lane);
  const pts = [];
  for (let i = 0; i < m.pts.length; i++) {
    const p = m.pts[i];
    if (i) pts.push([p[0], pts[pts.length - 1][1]]);
    pts.push([p[0], p[1]]);
  }
  return { d: ipD(pts), lo: m.lo, hi: m.hi };
}

const ipFmt = (v, u = "") => (Math.abs(v) >= 100 ? v.toFixed(0) : Math.abs(v) >= 10 ? v.toFixed(1) : v.toFixed(2)) + u;
const ipLane = (p, x, y, text, anchor = "end") => '<text class="ip-lane" x="' + x + '" y="' + y + '" text-anchor="' + anchor + '">' + text + '</text>';
const ipAx = (p, x, y, text, anchor = "start") => '<text class="ip-axis" x="' + x + '" y="' + y + '" text-anchor="' + anchor + '">' + text + '</text>';

function ipSetNote(key, html) {
  const p = IP.plots[key];
  if (p && p.note) p.note.innerHTML = html;
}

function drawPwm() {
  const p = IP.plots.pwm;
  const tr = model.traceSeries(240).rows;
  if (tr.length < 8) { ipSetNote("pwm", "no record yet"); return; }
  const vm = model.params.vdc / 2;
  const n = tr.length;
  const g = [], lab = [];
  const car = [], ra = [], rb = [], rc = [], cont = [[], [], []];
  const dt = model.traceSeries(2).dt;
  const tEnd = model.state.t;
  for (let i = 0; i < n; i++) {
    const r = tr[i];
    car.push(carrier(r[0], 1));
    ra.push(r[1]); rb.push(r[2]); rc.push(r[3]);
    const th = 2 * Math.PI * model.params.fout * (tEnd - (n - 1 - i) * dt);
    cont[0].push(model.params.m * Math.sin(th));
    cont[1].push(model.params.m * Math.sin(th - (2 * Math.PI) / 3));
    cont[2].push(model.params.m * Math.sin(th - (4 * Math.PI) / 3));
  }
  const lane1 = [p.T + 4, 120];
  const cols = ["blue", "green", "red"];
  for (let k = 0; k < 3; k++) {
    g.push('<path class="plot-line" data-tone="' + cols[k] + '" data-dash style="opacity:.45;stroke-width:.8" d="' + ipD(ipMapFixed(p, cont[k], lane1, -1.15, 1.15).pts) + '"/>');
    g.push('<path class="plot-line" data-tone="' + cols[k] + '" d="' + ipStepsFixed(p, [ra, rb, rc][k], lane1, -1.15, 1.15) + '"/>');
  }
  g.push('<path class="plot-line" data-tone="mid" style="stroke-width:.8" d="' + ipD(ipMapFixed(p, car, lane1, -1.15, 1.15).pts) + '"/>');
  lab.push(ipLane(p, 6, p.T + 14, "carrier", "start"));
  lab.push(ipLane(p, 6, p.T + 27, "refs", "start"));

  const lane2 = [130, 222];
  const rowH = (lane2[1] - lane2[0]) / 6;
  for (let s = 0; s < 6; s++) {
    const vals = [];
    for (let i = 0; i < n; i++) vals.push((tr[i][4] & (1 << s)) ? 1 : 0);
    const top = lane2[0] + s * rowH, bot = top + rowH - 2;
    g.push('<path class="plot-line" data-tone="' + (s % 2 ? "lo" : "hi") + '" d="' + ipSteps(p, vals, [top, bot]).d + '"/>');
    lab.push(ipLane(p, p.L - 44, (top + rowH * 0.72).toFixed(1), "S" + (s + 1)));
  }

  const lane3 = [230, p.h - p.B - 6];
  const va = [];
  for (let i = 0; i < n; i++) va.push(tr[i][5]);
  g.push('<path class="plot-line" data-tone="lit" d="' + ipSteps(p, va, lane3).d + '"/>');
  lab.push(ipLane(p, p.L + 8, lane3[0] + 12, "vAN", "start"));
  lab.push(ipAxisNums(p, lane3, -vm, vm, " V", (v) => v.toFixed(0)));
  lab.push(ipAx(p, p.L + 2, p.h - p.B + 14, "6 carrier periods, " + (6000 / model.params.fsw).toFixed(2) + " ms"));
  p.trace.innerHTML = g.join("");
  p.labels.innerHTML = lab.join("");
  ipSetNote("pwm", "Thin dashed: the ideal three-phase reference. Stepped: the value the modulator sampled at the start of each carrier and held (regular sampling), so each leg's duty is fixed for a whole carrier period. S1-S6 are the gate signals and vAN the pole voltage against the DC midpoint, ±" + vm.toFixed(0) + " V here.");
}

function drawOut() {
  const p = IP.plots.out;
  const f = ui.knobs.f;
  const cycles = ipBase.tb === "2c" ? 2 : Number(ipBase.tb) || 1;
  const secs = ipBase.tb === "2c" ? 2 / model.params.fsw : cycles / f;
  const s = model.outSeries(secs);
  if (s.n < 8) { ipSetNote("out", "collecting..."); return; }
  const g = [], lab = [];
  const laneV = [p.T + 4, 122];
  const laneL = [130, 212];
  const laneI = [220, p.h - p.B - 6];
  const ph = [["A", "blue"], ["B", "green"], ["C", "red"]];
  const allV = [];
  for (let k = 0; k < 3; k++) allV.push(...s.v[k]);
  const mv = ipMap(p, allV, laneV);
  for (let k = 0; k < 3; k++) {
    g.push('<path class="plot-line" data-tone="' + ph[k][1] + '" d="' + ipD(ipMap(p, s.v[k], laneV).pts) + '"/>');
    lab.push(ipLane(p, p.w - p.R - 8, laneV[0] + 12, "v" + ph[k][0], "end"));
  }
  lab.push(ipAxisNums(p, laneV, mv.lo, mv.hi, " V"));
  const vab = s.v[0].map((x, i) => x - s.v[1][i]);
  const ml = ipMap(p, vab, laneL);
  g.push('<path class="plot-line" data-tone="lo" data-dash d="' + ipD(ml.pts) + '"/>');
  lab.push(ipLane(p, p.w - p.R - 8, laneL[0] + 12, "vAB", "end"));
  lab.push(ipAxisNums(p, laneL, ml.lo, ml.hi, " V"));
  const allI = [];
  for (let k = 0; k < 3; k++) allI.push(...s.i[k]);
  const mi = ipMap(p, allI, laneI);
  for (let k = 0; k < 3; k++) {
    g.push('<path class="plot-line" data-tone="' + ph[k][1] + '" d="' + ipD(ipMap(p, s.i[k], laneI).pts) + '"/>');
  }
  const meas = model.measure();
  lab.push(ipLane(p, p.w - p.R - 8, laneI[0] + 12, "iABC", "end"));
  lab.push(ipAxisNums(p, laneI, mi.lo, mi.hi, " A"));
  lab.push(ipAx(p, p.L + 2, p.h - p.B + 14, (ipBase.tb === "2c" ? "2 carrier periods" : cycles + " cycle" + (cycles > 1 ? "s" : "") + " at " + f.toFixed(1) + " Hz")));
  p.trace.innerHTML = g.join("");
  p.labels.innerHTML = lab.join("");
  ipSetNote("out", "Peak vAB <b>" + ipFmt(ml.hi, " V") + "</b> (rms " + ipFmt(ml.hi / Math.SQRT2, " V") + "), peak current <b>" + ipFmt(mi.hi, " A") + "</b> (rms " + ipFmt(meas.irms, " A") + "). 0.5 ms window averages, so the switching ripple is removed and the fundamental is what you see. In the linear region the phase fundamental is <b>m x Vdc/2</b> and the line-to-line value is &#8730;3 times that; each lane has its own scale so neither squashes the other. <a href='#eq-vll'>&#8594; (14)</a>");
}

function drawSpec() {
  const p = IP.plots.spec;
  const sp = model.spectrum("v", 60, 4);
  if (!sp) { ipSetNote("spec", "collecting whole cycles of instantaneous record…"); p.bars.innerHTML = ""; p.labels.innerHTML = ""; return; }
  const si = model.spectrum("i", 60, 4);
  const x0 = p.L, x1 = p.w - p.R;
  const y0 = p.T + 4, y1 = p.h - p.B - 14;
  const orders = sp.mag.length;
  const bw = (x1 - x0) / orders;
  const maxV = Math.max(sp.fund, 1e-9);
  const bars = [], lab = [];
  for (let i = 0; i < orders; i++) {
    const h = (sp.mag[i] / maxV) * (y1 - y0);
    if (h < 0.5) continue;
    const x = x0 + i * bw + bw * 0.2;
    bars.push('<rect x="' + x.toFixed(1) + '" y="' + (y1 - h).toFixed(1) + '" width="' + Math.max(0.8, bw * 0.6).toFixed(1) + '" height="' + h.toFixed(1) + '" fill="var(--anatomy-blue)" opacity="' + (i === 0 ? 0.95 : 0.6) + '"/>');
  }
  if (si) {
    const maxI = Math.max(si.fund, 1e-9);
    for (let i = 0; i < Math.min(orders, si.mag.length); i++) {
      const h = (si.mag[i] / maxI) * (y1 - y0);
      if (h < 0.8) continue;
      const x = x0 + i * bw + bw * 0.2;
      bars.push('<rect x="' + x.toFixed(1) + '" y="' + (y1 - h).toFixed(1) + '" width="' + Math.max(0.6, bw * 0.6).toFixed(1) + '" height="' + h.toFixed(1) + '" fill="var(--anatomy-lit)" opacity=".45"/>');
    }
  }
  for (let o = 1; o <= orders; o += 5) {
    lab.push('<text class="ip-axis" x="' + (x0 + (o - 0.5) * bw).toFixed(1) + '" y="' + (y1 + 11) + '" text-anchor="middle">' + o + '</text>');
  }
  lab.push(ipAx(p, p.w - p.R, y0 + 9, "1st harmonic " + ipFmt(sp.fund, " V") + " peak", "end"));
  lab.push(ipAx(p, p.w - p.R, y0 + 20, "THD " + (sp.thd * 100).toFixed(2) + "% up to order " + sp.band, "end"));
  lab.push(ipAx(p, x0 + 2, p.h - p.B + 20, "harmonic order"));
  p.bars.innerHTML = bars.join("");
  p.trace.innerHTML = "";
  p.labels.innerHTML = lab.join("");
  ipSetNote("spec", "Harmonic order on the x axis, " + sp.cycles + " whole cycle" + (sp.cycles > 1 ? "s" : "") + " of record so Δf is " + ipFmt(sp.df, " Hz") + ". Rectangular window over whole cycles, so the fundamental's harmonics are exact and the switching sidebands appear where they really are. THD counts orders up to the " + sp.band + "th (" + ipFmt(sp.band * model.params.fout, " Hz") + ") and stops below the carrier: above that the sidebands are the modulation, not distortion. <a href='#eq-thd'>&#8594; (17)</a>");
}

function drawCond() {
  const p = IP.plots.cond;
  const c = model.conduction();
  const tr = model.traceSeries(90).rows;
  const x0 = p.L, x1 = p.w - p.R;
  const bars = [], lab = [];
  const rowH = 13, top = p.T + 6;
  const span = x1 - x0 - 96;
  for (let s = 0; s < 6; s++) {
    const y = top + s * rowH;
    const w = span * Math.min(1, Math.max(0, c.pct[s]));
    const wd = span * Math.min(1, Math.max(0, c.diodePct[s]));
    bars.push('<rect x="' + (x0 + 28) + '" y="' + y.toFixed(1) + '" width="' + w.toFixed(1) + '" height="' + (rowH - 5) + '" fill="var(--anatomy-hi)" opacity=".55"/>');
    bars.push('<rect x="' + (x0 + 28) + '" y="' + (y + rowH - 7).toFixed(1) + '" width="' + wd.toFixed(1) + '" height="2.4" fill="var(--anatomy-blue)" opacity=".85"/>');
    lab.push(ipLane(p, x0 + 22, (y + rowH - 6).toFixed(1), "S" + (s + 1)));
    lab.push(ipAx(p, x0 + 32 + w, (y + rowH - 6).toFixed(1), (c.pct[s] * 100).toFixed(1) + "% · d " + (c.diodePct[s] * 100).toFixed(1) + "%"));
  }
  const lane = [top + 6 * rowH + 12, p.h - p.B - 4];
  if (tr.length > 8) {
    const idc = [];
    for (let i = 0; i < tr.length; i++) idc.push(tr[i][11]);
    lab.push('<path class="plot-line" data-tone="lit" d="' + ipSteps(p, idc, lane).d + '"/>');
    lab.push(ipLane(p, x0 - 6, lane[0] + 8, "iDC"));
    lab.push(ipAx(p, x1, lane[1] - 2, "mean " + ipFmt(model.state.idcAvg, " A"), "end"));
  }
  lab.push(ipAx(p, x0 + 2, p.h - p.B + 14, "one fundamental period" + (c.span > 0 ? " · " + (c.span * 1000).toFixed(1) + " ms" : "") + " · bar = switch, blue = antiparallel diode"));
  p.bars.innerHTML = bars.join("");
  p.trace.innerHTML = "";
  p.labels.innerHTML = lab.join("");
  ipSetNote("cond", "Conduction measured over exactly one fundamental period of the same simulation, not estimated. The antiparallel diodes carry the reactive current, so their share is not zero even at a high power factor, and iDC pulses at six times the output frequency. <a href='#eq-idc'>&#8594; (27)</a>");
}

function drawVec() {
  const p = IP.plots.vec;
  const o = model.outSeries(0.04);
  if (o.n < 2) { ipSetNote("vec", "collecting..."); return; }
  const w = p.w - p.L - p.R;
  const cx = p.L + w / 2;
  const cy = (p.T + p.h - p.B) / 2;
  const R = Math.min(w, p.h - p.T - p.B) / 2 - 30;
  const hexR = (2 / 3) * model.params.vdc;
  const scale = R / (hexR * 1.18);
  const at2 = (x, y) => [cx + x * scale, cy - y * scale];
  const g = [];
  const lab = [];
  let d = "";
  for (let k = 0; k < 7; k++) {
    const a = ((k % 6) * Math.PI) / 3;
    const q = at2(hexR * Math.cos(a), hexR * Math.sin(a));
    d += (k ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1);
  }
  g.push('<path class="plot-line" data-tone="lo" d="' + d + '"/>');
  const circR = (hexR * Math.sqrt(3)) / 2;
  g.push('<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (circR * scale).toFixed(1) + '" fill="none" stroke="var(--anatomy-faint)" stroke-dasharray="3 4"/>');
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3;
    const q = at2(hexR * Math.cos(a), hexR * Math.sin(a));
    g.push('<path class="plot-line" data-tone="faint" style="stroke-width:.8" d="M' + cx.toFixed(1) + ' ' + cy.toFixed(1) + 'L' + q[0].toFixed(1) + ' ' + q[1].toFixed(1) + '"/>');
    lab.push('<text class="ip-lane" x="' + (q[0] + Math.cos(a) * 14).toFixed(1) + '" y="' + (q[1] - Math.sin(a) * 14 + 4).toFixed(1) + '" text-anchor="middle">V' + (k + 1) + '</text>');
  }
  const n = o.n - 1;
  const sv = spaceVector([o.v[0][n], o.v[1][n], o.v[2][n]]);
  const tip = at2(sv.al, sv.be);
  const from = Math.max(0, o.n - Math.round(1 / model.params.fout / o.dt));
  const stepN = Math.max(1, Math.round((o.n - from) / 120));
  let trail = "";
  for (let i = from; i < o.n; i += stepN) {
    const q = spaceVector([o.v[0][i], o.v[1][i], o.v[2][i]]);
    const t = at2(q.al, q.be);
    trail += (trail ? "L" : "M") + t[0].toFixed(1) + " " + t[1].toFixed(1);
  }
  if (trail) g.push('<path class="plot-line" data-tone="blue" style="stroke-width:1" d="' + trail + '"/>');
  g.push('<path class="plot-line" data-tone="lit" style="stroke-width:2" d="M' + cx.toFixed(1) + ' ' + cy.toFixed(1) + 'L' + tip[0].toFixed(1) + ' ' + tip[1].toFixed(1) + '"/>');
  g.push('<circle cx="' + tip[0].toFixed(1) + '" cy="' + tip[1].toFixed(1) + '" r="4" fill="var(--anatomy-lit)"/>');
  const deg = ((sv.ang * 180) / Math.PI).toFixed(1);
  lab.push('<text class="ip-axis" x="' + (p.L + 2) + '" y="' + (p.T + 16) + '">|v| ' + sv.mag.toFixed(1) + ' V - sector ' + sv.sector + ' - ' + deg + ' deg</text>');
  lab.push('<text class="ip-axis" x="' + (p.L + 2) + '" y="' + (p.h - p.B - 8) + '">hexagon 2/3 Vdc = ' + hexR.toFixed(0) + ' V - dashed circle ' + circR.toFixed(0) + ' V</text>');
  p.trace.innerHTML = g.join("");
  p.labels.innerHTML = lab.join("");
  ipSetNote("vec", "Pole-voltage vector in the stationary alpha-beta frame, from the 0.5 ms window averages. The six active vectors sit on the hexagon at radius <b>2/3 Vdc</b>; the dashed circle is the largest balanced sine that fits inside it. The blue trail is the last fundamental period. <a href='#eq-sv'>&#8594; (10)</a>");
}

function drawDq() {
  const p = IP.plots.dq;
  const cycles = ipBase.tb === "2c" ? 1 : Number(ipBase.tb) || 1;
  const secs = Math.max(0.02, cycles / ui.knobs.f);
  const o = model.outSeries(secs);
  if (o.n < 8) { ipSetNote("dq", "collecting..."); return; }
  const meas0 = model.measure();
  const thEnd = spaceVector([o.v[0][o.n - 1], o.v[1][o.n - 1], o.v[2][o.n - 1]]).ang;
  const id = [], iq = [], vd = [], vq = [];
  for (let i = 0; i < o.n; i++) {
    const th = thEnd - 2 * Math.PI * model.params.fout * (o.n - 1 - i) * o.dt;
    const d = park([o.v[0][i], o.v[1][i], o.v[2][i]], [o.i[0][i], o.i[1][i], o.i[2][i]], th);
    vd.push(d.vd); vq.push(d.vq); id.push(d.id); iq.push(d.iq);
  }
  const g = [], lab = [];
  const laneV = [p.T + 4, 140];
  const laneI = [152, p.h - p.B - 6];
  const mv = ipMap(p, vd.concat(vq), laneV);
  g.push('<path class="plot-line" data-tone="blue" d="' + ipD(ipMap(p, vd, laneV).pts) + '"/>');
  g.push('<path class="plot-line" data-tone="lo" data-dash d="' + ipD(ipMap(p, vq, laneV).pts) + '"/>');
  lab.push(ipAxisNums(p, laneV, mv.lo, mv.hi, " V"));
  lab.push(ipLane(p, p.L + 8, laneV[0] + 12, "vd", "start"));
  lab.push(ipLane(p, p.L + 46, laneV[0] + 12, "vq dashed", "start"));
  const mi = ipMap(p, id.concat(iq), laneI);
  g.push('<path class="plot-line" data-tone="green" d="' + ipD(ipMap(p, id, laneI).pts) + '"/>');
  g.push('<path class="plot-line" data-tone="red" data-dash d="' + ipD(ipMap(p, iq, laneI).pts) + '"/>');
  lab.push(ipAxisNums(p, laneI, mi.lo, mi.hi, " A"));
  lab.push(ipLane(p, p.L + 8, laneI[0] + 12, "id", "start"));
  lab.push(ipLane(p, p.L + 46, laneI[0] + 12, "iq dashed", "start"));
  const last = o.n - 1;
  lab.push(ipAx(p, p.w - p.R, laneV[0] + 12, "vd " + vd[last].toFixed(1) + " V / vq " + vq[last].toFixed(1) + " V", "end"));
  lab.push(ipAx(p, p.w - p.R, laneI[0] + 12, "id " + id[last].toFixed(2) + " A / iq " + iq[last].toFixed(2) + " A", "end"));
  lab.push(ipAx(p, p.L + 2, p.h - p.B + 14, cycles + " cycle" + (cycles > 1 ? "s" : "") + " at " + ui.knobs.f.toFixed(1) + " Hz"));
  p.trace.innerHTML = g.join("");
  p.labels.innerHTML = lab.join("");
  ipSetNote("dq", "Park transform with the reference rotating at the fundamental. In steady state the vector is stationary in this frame, so vd and id are DC and vq, iq carry the reactive part; whatever ripple remains is the switching and the harmonics, not a steady-state quantity. <a href='#eq-park'>&#8594; (25)</a>");
}

function drawMeters() {
  const hosts = document.querySelectorAll("[data-meters]");
  if (!hosts.length) return;
  const lp = loadPower(model);
  const rp = ripple(model);
  const cells = [
    [lp.vrms.toFixed(1) + " V", "phase rms"],
    [lp.irms.toFixed(1) + " A", "current rms"],
    [(lp.p / 1000).toFixed(2) + " kW", "real power P"],
    [(lp.q / 1000).toFixed(2) + " kvar", "reactive Q"],
    [(lp.s / 1000).toFixed(2) + " kVA", "apparent S"],
    [lp.pf.toFixed(3), "power factor"],
    [(lp.utilisation * 100).toFixed(1) + " %", "Vdc utilisation"],
    [rp.pp.toFixed(2) + " A", "phase ripple p-p"],
    [(model.params.deadTime * 1e6).toFixed(2) + " us", "dead time"],
  ];
  const html = cells.map(function (c) {
    return '<div class="ip-meter"><b>' + c[0] + '</b><span>' + c[1] + '</span></div>';
  }).join("");
  for (const host of hosts) host.innerHTML = html;
}

let ipSweepRows = null;
let ipSweepBusy = false;
function runSweep() {
  if (ipSweepBusy) return;
  ipSweepBusy = true;
  ipSetNote("sweep", "computing: each point is a fresh model settled to steady state...");
  setTimeout(function () {
    const base = model.params;
    const values = [];
    for (let m = 0.2; m <= 1.2001; m += 0.1) values.push(+m.toFixed(2));
    ipSweepRows = sweep(function (mm) {
      return createInverter({ vdc: base.vdc, fout: base.fout, r: base.r, l: base.l, m: mm, modulation: base.modulation });
    }, values);
    ipSweepBusy = false;
    ipLast = 0;
    drawSweep();
  }, 40);
}

function drawSweep() {
  const p = IP.plots.sweep;
  if (!ipSweepRows) {
    p.trace.innerHTML = "";
    p.labels.innerHTML = "";
    ipSetNote("sweep", "Press <b>Run sweep</b> to evaluate the model across the modulation index. Each point is settled independently, so the curve is a family of steady states, not a transient.");
    return;
  }
  const rows = ipSweepRows;
  const g = [], lab = [];
  const laneV = [p.T + 4, 150];
  const laneT = [160, p.h - p.B - 8];
  const vll = rows.map(function (r) { return r.vll; });
  const vmax = Math.max.apply(null, vll) * 1.06;
  const mv = ipMapFixed(p, vll, laneV, 0, vmax);
  let dv = "";
  mv.pts.forEach(function (q, i) { dv += (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1); });
  g.push('<path class="plot-line" data-tone="blue" d="' + dv + '"/>');
  lab.push(ipAxisNums(p, laneV, 0, vmax, " V"));
  lab.push(ipLane(p, p.L + 8, laneV[0] + 12, "V_LL", "start"));
  const ideal = rows.map(function (r) { return 0.6124 * r.value * model.params.vdc; });
  const mi = ipMapFixed(p, ideal, laneV, 0, vmax);
  let di = "";
  mi.pts.forEach(function (q, i) { di += (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1); });
  g.push('<path class="plot-line" data-tone="lo" data-dash d="' + di + '"/>');
  const thd = rows.map(function (r) { return (r.thd || 0) * 100; });
  const tmax = Math.max(10, Math.max.apply(null, thd) * 1.1);
  const mt = ipMapFixed(p, thd, laneT, 0, tmax);
  let dt = "";
  mt.pts.forEach(function (q, i) { dt += (i ? "L" : "M") + q[0].toFixed(1) + " " + q[1].toFixed(1); });
  g.push('<path class="plot-line" data-tone="red" d="' + dt + '"/>');
  lab.push(ipAxisNums(p, laneT, 0, tmax, " %"));
  lab.push(ipLane(p, p.L + 8, laneT[0] + 12, "THD", "start"));
  rows.forEach(function (r, i) {
    if (i % 2 === 0) lab.push('<text class="ip-axis" x="' + mv.pts[i][0].toFixed(1) + '" y="' + (p.h - p.B + 12) + '" text-anchor="middle">' + r.value.toFixed(1) + '</text>');
  });
  lab.push(ipAx(p, p.L + 2, p.h - p.B + 26, "modulation index m - V_LL solid, ideal 0.6124 m Vdc dashed, THD red"));
  p.trace.innerHTML = g.join("");
  p.labels.innerHTML = lab.join("");
  const knee = rows.filter(function (r) { return r.saturated; }).length;
  ipSetNote("sweep", rows.length + " steady states, m = " + rows[0].value + " to " + rows[rows.length - 1].value + ". " + knee + " of them are past the linear region (m &gt; 1), where the legs saturate and the solid curve falls below the dashed ideal. Vdc = " + model.params.vdc.toFixed(0) + " V, f = " + model.params.fout.toFixed(0) + " Hz, R = " + model.params.r.toFixed(1) + " ohm, L = " + (model.params.l * 1000).toFixed(1) + " mH.");
}

function drawCursor(key) {
  const p = IP.plots[key];
  if (p.hover == null) { p.cursor.hidden = true; return; }
  const frac = (p.hover - p.L) / (p.w - p.L - p.R);
  let text = "";
  if (key === "out") {
    const s = model.outSeries(ipBase.tb === "2c" ? 2 / model.params.fsw : (Number(ipBase.tb) || 1) / ui.knobs.f);
    if (s.n > 1) {
      const i = Math.max(0, Math.min(s.n - 1, Math.round(frac * (s.n - 1))));
      text = "t " + ((i - (s.n - 1)) * s.dt * 1000).toFixed(2) + " ms · vA " + s.v[0][i].toFixed(1) + " V · iA " + s.i[0][i].toFixed(1) + " A";
    }
  } else if (key === "pwm") {
    const tr = model.traceSeries(90).rows;
    if (tr.length > 1) {
      const i = Math.max(0, Math.min(tr.length - 1, Math.round(frac * (tr.length - 1))));
      const r = tr[i];
      let bits = "";
      for (let s = 0; s < 6; s++) bits += (r[4] & (1 << s)) ? "1" : "0";
      text = "gates " + bits + " · vAN " + r[5].toFixed(0) + " V · ref " + r[1].toFixed(2);
    }
  } else if (key === "spec") {
    const sp = model.spectrum("v", 60, 4);
    if (sp) {
      const o = Math.max(1, Math.min(sp.mag.length, Math.round(frac * sp.mag.length + 0.5)));
      text = "order " + o + " · " + (o * model.params.fout).toFixed(0) + " Hz · " + sp.mag[o - 1].toFixed(2) + " V";
    }
  } else if (key === "cond") {
    const c = model.conduction();
    const s = Math.max(0, Math.min(5, Math.floor((p.T + 6 * 13 - p.hover * 0) / 13) - 0));
    const row = Math.max(0, Math.min(5, Math.floor((frac * 0 + s))));
    text = "S" + (row + 1) + " on " + (c.pct[row] * 100).toFixed(1) + "% · diode " + (c.diodePct[row] * 100).toFixed(1) + "%";
  }
  const g = p.cursor;
  g.hidden = false;
  const line = g.querySelector("line");
  const box = g.querySelector("rect");
  const t = g.querySelector("text");
  line.setAttribute("x1", p.hover.toFixed(1));
  line.setAttribute("x2", p.hover.toFixed(1));
  line.setAttribute("y1", p.T);
  line.setAttribute("y2", p.h - p.B);
  const tw = Math.max(80, text.length * 4.3 + 10);
  const bx = Math.min(p.w - p.R - tw, Math.max(p.L, p.hover + 6));
  box.setAttribute("x", bx.toFixed(1));
  box.setAttribute("y", (p.T + 3).toFixed(1));
  box.setAttribute("width", tw.toFixed(1));
  box.setAttribute("height", "11");
  t.setAttribute("x", (bx + 4).toFixed(1));
  t.setAttribute("y", (p.T + 11).toFixed(1));
  t.textContent = text;
}

let ipLast = 0;
function panelUpdate(st, uiState, meas) {
  if (!IP.body || IP.body.hidden) return;
  const now = performance.now();
  if (now - ipLast < 45) return;
  ipLast = now;
  IP.mode.textContent = uiState.mode.toUpperCase();
  IP.flag.hidden = !st.overmodulating;
  drawPwm();
  drawOut();
  drawSpec();
  drawCond();
  drawVec();
  drawDq();
  drawMeters();
  if (ipSweepRows) drawSweep();
  for (const key of Object.keys(IP.plots)) if (IP.plots[key].hover != null) drawCursor(key);
}

function panelInit() {
  IP.toggle.addEventListener("click", () => {
    const open = IP.toggle.getAttribute("aria-expanded") === "true";
    IP.toggle.setAttribute("aria-expanded", String(!open));
    IP.body.hidden = open;
    if (!open) { ipLast = 0; panelUpdate(model.state, ui, model.measure()); }
  });
  if (window.matchMedia("(max-width: 640px)").matches) {
    IP.toggle.setAttribute("aria-expanded", "false");
    IP.body.hidden = true;
  }
  IP.tb.addEventListener("change", () => {
    ipBase.tb = IP.tb.value;
    ipLast = 0;
    panelUpdate(model.state, ui, model.measure());
  });
  IP.pause.addEventListener("click", () => {
    ipBase.paused = !ipBase.paused;
    IP.pause.setAttribute("aria-pressed", String(ipBase.paused));
    IP.pause.textContent = ipBase.paused ? "Resume" : "Pause";
    // The render loop stops itself while paused; resume has to start it again.
    if (!ipBase.paused && typeof play === "function") play();
  });
  IP.csv.addEventListener("click", exportCsv);
  document.querySelector("[data-ip-sweep]").addEventListener("click", runSweep);
  for (const key of Object.keys(IP.plots)) {
    const p = IP.plots[key];
    const move = (e) => {
      const r = p.svg.getBoundingClientRect();
      p.hover = Math.max(p.L, Math.min(p.w - p.R, ((e.clientX - r.left) / r.width) * p.w));
      drawCursor(key);
    };
    p.svg.addEventListener("pointermove", move);
    p.svg.addEventListener("pointerdown", move);
    p.svg.addEventListener("pointerleave", () => { p.hover = null; p.cursor.hidden = true; });
    p.svg.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        const d = e.key === "ArrowLeft" ? -8 : 8;
        p.hover = Math.max(p.L, Math.min(p.w - p.R, (p.hover ?? (p.L + p.w) / 2) + d));
        drawCursor(key);
        e.preventDefault();
        e.stopPropagation();
      } else if (e.key === "Escape") {
        p.hover = null;
        p.cursor.hidden = true;
      }
    });
  }
}

function exportCsv() {
  const q = model.params;
  const rows = [];
  rows.push("# Three-phase voltage-source inverter - simulated data");
  rows.push("# model.mjs: ideal switches, no dead time, stiff DC link, star load R + L per phase");
  rows.push("# These are COMPUTED VALUES from the stated model, not measurements.");
  rows.push("# vdc_V=" + q.vdc + " m=" + q.m + " fout_Hz=" + q.fout + " fsw_Hz=" + q.fsw + " R_ohm=" + q.r + " L_H=" + q.l);
  rows.push("# trace: one row per integration step (" + (model.stepHeight * 1e6).toFixed(3) + " us)");
  rows.push("section,t_us,carrier_u,refA,refB,refC,gateMask,vA_V,vB_V,vC_V,iA_A,iB_A,iC_A,iDC_A");
  const tr = model.traceSeries(2048);
  tr.rows.forEach((r, i) => {
    const row = ["trace", (i * tr.dt * 1e6).toFixed(1)];
    for (let k = 0; k < 12; k++) row.push(Number(r[k]).toPrecision(7));
    rows.push(row.join(","));
  });
  const o = model.outSeries(4);
  rows.push("# out: 0.5 ms window averages of the three pole voltages and phase currents");
  rows.push("section,t_ms,vA_V,vB_V,vC_V,iA_A,iB_A,iC_A");
  for (let i = 0; i < o.n; i++) {
    rows.push(["out", (i * o.dt * 1000).toFixed(3), o.v[0][i], o.v[1][i], o.v[2][i], o.i[0][i], o.i[1][i], o.i[2][i]].map((x) => (typeof x === "number" ? x.toPrecision(7) : x)).join(","));
  }
  const sp = model.spectrum("v", 60, 4);
  if (sp) {
    rows.push("# spectrum: instantaneous phase A, rectangular window over " + sp.cycles + " whole cycles");
    rows.push("section,order,frequency_Hz,magnitude_V");
    sp.mag.forEach((m, i) => rows.push(["spectrum", i + 1, ((i + 1) * q.fout).toFixed(3), m.toPrecision(7)].join(",")));
  }
  const blob = new Blob([rows.join("\\n") + "\\n"], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "inverter-model-" + q.vdc.toFixed(0) + "V-m" + q.m.toFixed(2) + "-" + q.fout.toFixed(1) + "Hz.csv";
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
`;
}
