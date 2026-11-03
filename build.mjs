// Three-phase voltage-source inverter — isometric figure.
// Every number on the page comes from model.mjs; nothing here is a measurement.
import { writeFileSync, readFileSync } from "node:fs";
import * as k from "./kit/iso-kit.mjs";
import { kitScript } from "./scripts/inline-kit.mjs";
import { PANEL_CSS, panelHtml, panelScript } from "./panel.mjs";
import { THEORY_CSS, theoryHtml } from "./theory.mjs";
import { CIRCUIT_CSS, circuitHtml } from "./circuit.mjs";

const WIDTH = 820;
const HEIGHT = 480;

// ---------------------------------------------------------------- world ----
const PLATE = { x: -190, y: -125, w: 380, d: 250, r: 12 };
const ZP = 5; // plate top
const FOOT_H = 9;

const COLD = { x: -80, y: -122, w: 276, d: 114, r: 4 };
const FIN = { x0: -70, x1: 190, y0: -118, y1: -84, z0: 16, z1: 46 };
const Z_TRAY = 27;
const Z_BOARD = 56;
const P_RAIL = { y: -76, z: 44 };
const N_RAIL = { y: -64, z: 36 };

const MW = 80;
const MY0 = -56;
const MY1 = -12;
const MODS = [
  { id: "A", x0: -64, hi: 1, lo: 2 },
  { id: "B", x0: 26, hi: 3, lo: 4 },
  { id: "C", x0: 116, hi: 5, lo: 6 },
];
const AC_LOCAL = 40;
const STUD_Y = 6;

const CAPS = [
  { x: -156, y: -92 },
  { x: -108, y: -92 },
];
const CAP_R = 22;
const CAP_Z1 = 56;

const DCIN = { x: -186, y: -52, w: 46, d: 52, z1: 30 };
const CONSOLE = { x: -80, y: 84, w: 140, d: 38, z0: ZP, z1: 41 };
const LOAD = { x: 64, y: 46, w: 104, d: 74 };

const KNOBS = [
  { id: "vdc", x: -60, y: 93, r: 8.5, label: "Vdc" },
  { id: "m", x: -30, y: 93, r: 8.5, label: "m" },
  { id: "f", x: 0, y: 93, r: 8.5, label: "f" },
];
const MODE_X = [-64, -42, -20];
const MODE_Y = 112;
const VEC = { x: 34, y: 111, r: 7.5 };
const SCREEN = { x0: -74, y0: CONSOLE.y + CONSOLE.d, w: 60, h: 26, zTop: 36 };

const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -FOOT_H, 0),
    ...k.boxCorners({ x: -80, y: -122, w: 320, d: 116, r: 4 }, 0, 64),
    ...k.boxCorners({ x: LOAD.x, y: LOAD.y, w: LOAD.w, d: LOAD.d, r: 3 }, 0, 58),
    ...k.boxCorners(CONSOLE, 0, 52),
    [-156, -92, 64],
    [-186, -52, 40],
  ],
  WIDTH,
  HEIGHT,
  { pad: 24, azimuth: 45 },
);

// ------------------------------------------------------------- helpers ----
const at = (p) => k.iso(p, P);
const S = (paths, style = {}) => k.solidSvg(paths, style);
const DEBUG_LINES = !!process.env.LINES_DEBUG;
const L = (d, tone = "lo", width = null, free = "") => {
  if (!d) return "";
  let at = "";
  if (DEBUG_LINES) {
    const f = (new Error().stack || "").split(String.fromCharCode(10))[2] || "";
    const m = f.match(/build\.mjs:(\d+):/);
    at = m ? ` data-at="${m[1]}"` : "";
  }
  return `<path class="iso-line" data-tone="${tone}"${at}${free ? ` data-free="${free}"` : ""}${width !== null ? ` style="stroke-width:${width}"` : ""} d="${d}"/>`;
};
const DN = (pts, style = {}) => k.dotsSvg(pts.map((p) => at(p.length === 2 ? [p[0], p[1], ZP] : p)), style);
const poly = (pts, closed = false) => k.pathOf(pts.map(at), closed);
const seg = (a, b) => k.segment(a, b, P);
const txt = (m, s, opts = {}) => k.faceTextSvg(m, s, opts);

// a current path: one flow group the live script finds by data-path
const flow = (id, d, width = 2.2) =>
  d
    ? `<g data-path="${id}"><path class="iso-line" data-flow="" data-tone="lit" data-free="both" style="stroke-width:${width}" d="${d}"/></g>`
    : "";

// Rectangular bar in plan (busbar, strap, rail). Axis-aligned.
function bar(a, b, z, h, w, style = {}) {
  const horiz = Math.abs(b[0] - a[0]) >= Math.abs(b[1] - a[1]);
  const len = horiz ? Math.abs(b[0] - a[0]) : Math.abs(b[1] - a[1]);
  const plan = horiz
    ? { x: Math.min(a[0], b[0]), y: a[1] - w / 2, w: Math.max(len, 0.6), d: w, r: Math.min(w * 0.3, 2) }
    : { x: a[0] - w / 2, y: Math.min(a[1], b[1]), w: w, d: Math.max(len, 0.6), r: Math.min(w * 0.3, 2) };
  return S(k.slabOf(plan, z, h, P, 5, style.bevel ?? 0.35), {
    tone: style.tone ?? "hi",
    crease: style.crease ?? "faint",
    lit: style.lit,
  });
}

// Turned terminal post: barrel + hex nut.
function post(x, y, z0, z1, r, style = {}) {
  const out = [];
  out.push(S(k.cylinder(x, y, r, z0, z1 - z0, P, 20, 0.25), { tone: style.tone ?? "hi" }));
  if (style.nut !== false) {
    const nz = style.nutZ ?? z1 - 3;
    out.push(S(k.cylinder(x, y, r * 1.5, nz, 2.4, P, 6, 0.2), { tone: style.nutTone ?? style.tone ?? "mid" }));
  }
  return out.join("");
}

// Vertical solenoid (axis z), split back/front for painter order. Also returns
// the same runs as path strings for the flow overlay (reversed, so a positive
// current draws dashes entering the top and running down the turns).
function solenoid(cx, cy, r, z0, z1, turns, tone = "hi", width = 1.6) {
  // A winding read as a stack of turns, not a helix: at this scale a helical
  // stroke turns into scribble, while evenly spaced rings read as wire.
  const step = (z1 - z0) / turns;
  const back = [];
  const front = [];
  for (let k2 = 0; k2 < turns; k2++) {
    const z = z0 + step * (k2 + 0.5);
    // split each turn at the two side tangents so the near half hides the core
    const ring = [];
    for (let s = 0; s <= 40; s++) {
      const a = (s / 40) * Math.PI * 2;
      ring.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z]);
    }
    let run = [];
    let near = null;
    for (const q of ring) {
      const f = k.depthOf(q, P) > k.depthOf([cx, cy, z], P);
      const flat = at(q);
      if (near === null) near = f;
      if (f !== near) {
        run.push(flat);
        if (run.length > 1) (near ? front : back).push(run.slice());
        run = [flat];
        near = f;
        continue;
      }
      run.push(flat);
    }
    if (run.length > 1) (near ? front : back).push(run.slice());
  }
  const strokes = (runs) => runs.map((pts) => L(k.pathOf(pts), tone, width)).join("");
  const flows = (runs) => runs.map((pts) => k.pathOf(pts)).join("");
  return { back: strokes(back), front: strokes(front), backFlow: flows(back), frontFlow: flows(front) };
}

// Sampled 3D quadratic arc (bond wires).
function wire3(a, c, b, tone = "mid", width = 0.9) {
  const pts = [];
  for (let i = 0; i <= 14; i++) {
    const t = i / 14;
    const u = 1 - t;
    pts.push([
      u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
      u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
      u * u * a[2] + 2 * u * t * c[2] + t * t * b[2],
    ]);
  }
  return L(poly(pts), tone, width, "both");
}

// Flat copper ribbon drawn as a thick line on a face.
const ribbon = (pts, tone = "hi", width = 4.4) => L(poly(pts), tone, width, "both");

// ---------------------------------------------------------------- plate ----
function plate() {
  const out = [];
  out.push(S(k.slabOf(PLATE, 0, ZP, P, 12, 1.6), { tone: "lo", halo: true, crease: "faint" }));

  const feet = [
    [-166, -106], [-20, -110], [166, -106], [-166, 104], [0, 108], [166, 104],
  ].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));
  for (const [x, y] of feet) {
    out.push(S(k.cylinder(x, y, 8.5, -FOOT_H, FOOT_H - 1.4, P, 20, 0.4), { tone: "lo" }));
    out.push(S(k.cylinder(x, y, 6.4, -1.8, 1.8, P, 20, 0.3), { tone: "mid" }));
  }

  // ruler strip on the front edge: ticks hang from the edge
  out.push(S(k.slabOf({ x: -176, y: 112, w: 352, d: 9, r: 1.5 }, ZP, 0.6, P, 5, 0.2), { tone: "lo" }));
  const ticks = k.topTicks(-170, 170, 8, 5, 121, ZP + 0.05, [-3.6, -7], P, "x");
  // graduation line closing the major ticks
  out.push(L(poly([[-176, 114, ZP + 0.06], [176, 114, ZP + 0.06]]), "lo", 0.5, "both"));
  out.push(L(ticks.minor, "lo", 0.55));
  out.push(L(ticks.major, "mid", 0.7));

  for (const [x, y] of [[-177, -113], [177, -113], [-177, 113], [177, 113]]) {
    out.push(L(k.ring(x, y, 2.6, ZP, P, 18), "lo"));
    out.push(DN([[x, y]], { size: 0.42, tone: "mid" }));
  }

  // nameplate
  const np = { x: 104, y: -120, w: 70, d: 24, r: 1.5 };
  out.push(S(k.slabOf(np, ZP, 1.4, P, 5, 0.3), { tone: "mid" }));
  out.push(L(k.planOutline(np, ZP + 1.4, P, 5), "faint"));
  // rule lines stand for printed text on a nameplate
  [54, 38, 44].forEach((w, i) => {
    const y = np.y + 7 + i * 6;
    out.push(
      L(k.lineOnTop(at([np.x + 6, y, ZP + 1.6]), at([np.x + 6 + w, y, ZP + 1.6]), ZP + 1.6, P), i === 0 ? "mid" : "lo", 0.5, "both"),
    );
  });
  return out.join("");
}

// ------------------------------------------------------- dc-link caps ----
function caps() {
  const out = [];
  CAPS.forEach((c, i) => {
    out.push(S(k.cylinder(c.x, c.y, CAP_R + 3.5, ZP, 3.5, P, 28, 0.4), { tone: "lo" }));
    out.push(S(k.cylinder(c.x, c.y, CAP_R, ZP + 3.5, CAP_Z1 - ZP - 3.5, P, 44, 0.8), { tone: "mid" }));
    const ribs = [];
    for (let r = 1; r <= 6; r++) ribs.push(k.ring(c.x, c.y, CAP_R - 0.3, 14 + r * 6, P, 40));
    out.push(L(ribs.join(""), "faint", 0.45));
    out.push(L(k.ring(c.x, c.y, CAP_R + 0.2, 34, P, 44), "mid", 0.6));
    out.push(S(k.cylinder(c.x, c.y, CAP_R - 1.6, CAP_Z1, 2, P, 44, 0.4), { tone: "mid" }));
    const tb = { x: c.x - 12, y: c.y - 15, w: 24, d: 30, r: 2 };
    out.push(S(k.slabOf(tb, CAP_Z1 + 2, 4, P, 5, 0.5), { tone: "lo" }));
    out.push(post(c.x, c.y - 7, CAP_Z1 + 6, CAP_Z1 + 12, 2.6, { nutZ: CAP_Z1 + 9.6, tone: "hi" }));
    out.push(post(c.x, c.y + 7, CAP_Z1 + 6, CAP_Z1 + 12, 2.6, { nutZ: CAP_Z1 + 9.6, tone: "hi" }));
    out.push(txt(k.topMatrix([c.x + 15, c.y], CAP_Z1 + 6.2, P, "x"), i === 0 ? "C1" : "C2", { size: 2.8, tone: "lo" }));
  });
  return out.join("");
}

// busbars: capacitor terminals -> DC rails
function dcBus() {
  const out = [];
  const pz = 62;
  const nz = 54;
  out.push(bar([CAPS[0].x - 13, -99], [CAPS[1].x + 13, -99], pz, 2.6, 10, { tone: "hi" }));
  out.push(bar([CAPS[1].x + 13, -99], [-76, -99], pz, 2.6, 10, { tone: "hi" }));
  out.push(bar([-76, -99], [-76, P_RAIL.y], pz, 2.6, 10, { tone: "hi" }));
  out.push(S(k.cylinder(-76, P_RAIL.y, 4.6, P_RAIL.z, pz - P_RAIL.z + 2.6, P, 16, 0.3), { tone: "hi" }));
  out.push(flow("pbus", poly([[-166, -99, pz + 2.7], [-78, -99, pz + 2.7], [-76, -97, pz + 2.7]])));

  out.push(bar([CAPS[0].x - 13, -85], [CAPS[1].x + 13, -85], nz, 2.6, 10, { tone: "hi" }));
  out.push(bar([CAPS[1].x + 13, -85], [-66, -85], nz, 2.6, 10, { tone: "hi" }));
  out.push(bar([-66, -85], [-66, N_RAIL.y], nz, 2.6, 10, { tone: "hi" }));
  out.push(S(k.cylinder(-66, N_RAIL.y, 4.6, N_RAIL.z, nz - N_RAIL.z + 2.6, P, 16, 0.3), { tone: "hi" }));
  out.push(flow("nbus", poly([[-166, -85, nz + 2.7], [-68, -85, nz + 2.7], [-66, -83, nz + 2.7]])));
  return out.join("");
}

// ------------------------------------------------------- dc input ----
function dcInput() {
  const out = [];
  out.push(S(k.slabOf(DCIN, ZP, 14, P, 6, 1), { tone: "mid" }));
  out.push(S(k.slabOf(k.insetPlan(DCIN, 4), ZP + 14, 2, P, 5, 0.4), { tone: "lo" }));
  const studs = [
    { x: DCIN.x + 14, y: -40, mark: "+" },
    { x: DCIN.x + 34, y: -14, mark: "\u2212" },
  ];
  for (const s of studs) {
    out.push(S(k.cylinder(s.x, s.y, 7.5, ZP + 16, 2.4, P, 22, 0.35), { tone: "lo" }));
    out.push(post(s.x, s.y, ZP + 18, ZP + 28, 3.4, { nutZ: ZP + 25 }));
    out.push(txt(k.topMatrix([s.x + 11, s.y], ZP + 16.4, P, "x"), s.mark, { size: 4, tone: "mid" }));
  }
  out.push(txt(k.topMatrix([DCIN.x + 6, -26], ZP + 16.4, P, "x"), "DC in", { size: 3, tone: "lo" }));

  // gland plates on the left edge + incoming cables
  for (const s of studs) {
    const y = s.y;
    out.push(S(k.slabOf({ x: DCIN.x - 6, y: y - 7, w: 7, d: 14, r: 2 }, ZP + 8, 16, P, 4, 0.6), { tone: "lo" }));
    out.push(L(seg([DCIN.x - 6, y, ZP + 16], [s.x, y, ZP + 22]), "mid", 3));
    out.push(L(seg([s.x, y, ZP + 22], [s.x, y, ZP + 26]), "mid", 3));
    out.push(L(seg([DCIN.x - 12, y, ZP + 14], [DCIN.x - 6, y, ZP + 16]), "mid", 3));
  }
  // links up to the capacitor terminals
  const rise = (x, y, z0, z1) => S(k.cylinder(x, y, 3.6, z0, z1 - z0, P, 12, 0.3), { tone: "hi" });
  out.push(bar([studs[0].x, studs[0].y], [-172, studs[0].y], ZP + 28, 2.4, 9, { tone: "hi" }));
  out.push(bar([-172, studs[0].y], [-172, -99], ZP + 28, 2.4, 9, { tone: "hi" }));
  out.push(rise(-172, -99, ZP + 28, 62));
  out.push(bar([-172, -99], [CAPS[0].x - 13, -99], 62, 2.4, 9, { tone: "hi" }));
  out.push(bar([studs[1].x, studs[1].y], [-158, studs[1].y], ZP + 24, 2.4, 9, { tone: "hi" }));
  out.push(bar([-158, studs[1].y], [-158, -85], ZP + 24, 2.4, 9, { tone: "hi" }));
  out.push(rise(-158, -85, ZP + 24, 54));
  out.push(bar([-158, -85], [CAPS[0].x - 13, -85], 54, 2.4, 9, { tone: "hi" }));
  return out.join("");
}

// -------------------------------------------------------- heatsink ----
function heatsink() {
  const out = [];
  out.push(S(k.slabOf(COLD, ZP, 11, P, 10, 1), { tone: "mid" }));
  const fins = [];
  for (let x = FIN.x0; x <= FIN.x1; x += 13) fins.push(x);
  fins.sort((a, b) => k.depthOf([a, -100, 30], P) - k.depthOf([b, -100, 30], P));
  for (const x of fins) {
    out.push(
      S(k.slabOf({ x, y: FIN.y0, w: 4, d: FIN.y1 - FIN.y0, r: 0.8 }, FIN.z0, FIN.z1 - FIN.z0, P, 4, 0.5), { tone: "mid" }),
    );
  }
  return out.join("");
}

// Fan duct at the right end of the heatsink, drawn in its +x face.
function fan() {
  const out = [];
  const duct = { x: 190, y: -110, w: 8, d: 74, r: 2 };
  out.push(S(k.slabOf(duct, ZP, 46, P, 5, 0.6), { tone: "lo" }));
  out.push(S(k.slabOf(k.insetPlan(duct, 1.5), ZP + 46, 2.4, P, 4, 0.3), { tone: "mid" }));
  const m = k.sideMatrix([198, -73], 34, P, "right");
  const parts = [];
  parts.push(`<circle cx="0" cy="0" r="30" fill="var(--anatomy-halo)"/>`);
  parts.push(`<circle cx="0" cy="0" r="28" fill="none" stroke="var(--anatomy-hi)" stroke-width="1.2" vector-effect="non-scaling-stroke"/>`);
  parts.push(`<circle cx="0" cy="0" r="25" fill="none" stroke="var(--anatomy-mid)" stroke-width=".6" vector-effect="non-scaling-stroke"/>`);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const p = [];
    for (let s = 0; s <= 8; s++) {
      const t = s / 8;
      const rr = 7 + t * 17;
      const ang = a + t * 0.9;
      p.push([(rr * Math.cos(ang)).toFixed(2), (rr * Math.sin(ang)).toFixed(2)]);
    }
    for (let s = 8; s >= 0; s--) {
      const t = s / 8;
      const rr = 7 + t * 10;
      const ang = a + t * 0.9 + 0.45;
      p.push([(rr * Math.cos(ang)).toFixed(2), (rr * Math.sin(ang)).toFixed(2)]);
    }
    parts.push(`<path d="M${p.map(([x, y]) => x + " " + y).join("L")}Z" fill="var(--anatomy-mid)" opacity=".85"/>`);
  }
  parts.push(`<circle cx="0" cy="0" r="7.5" fill="var(--anatomy-face)" stroke="var(--anatomy-hi)" stroke-width=".8" vector-effect="non-scaling-stroke"/>`);
  parts.push(`<circle cx="0" cy="0" r="2.4" fill="var(--anatomy-halo)"/>`);
  for (const [x, y] of [[-33, -33], [33, -33], [-33, 33], [33, 33]]) {
    parts.push(`<circle cx="${x}" cy="${y}" r="1.5" fill="var(--anatomy-mid)"/>`);
  }
  out.push(`<g transform="${m}">${parts.join("")}</g>`);
  // fan cable
  out.push(L(poly([[194, -110, 46], [194, -116, 40], [188, -120, 20], [150, -120, 17]]), "mid", 1.4));
  out.push(DN([[150, -120, 17]], { size: 1.2, tone: "mid" }));
  return out.join("");
}

// ------------------------------------------------------- dc rails ----
function rails() {
  const out = [];
  for (const x of [-70, 40, 150, 200]) {
    for (const r of [P_RAIL, N_RAIL]) {
      out.push(S(k.cylinder(x, r.y, 3.4, Z_TRAY, r.z - Z_TRAY, P, 12, 0.3), { tone: "lo" }));
    }
  }
  out.push(bar([-78, P_RAIL.y], [204, P_RAIL.y], P_RAIL.z, 3, 12, { tone: "hi" }));
  out.push(flow("pbus", poly([[-78, P_RAIL.y, P_RAIL.z + 3.1], [206, P_RAIL.y, P_RAIL.z + 3.1]])));
  out.push(bar([-78, N_RAIL.y], [204, N_RAIL.y], N_RAIL.z, 3, 12, { tone: "hi" }));
  out.push(flow("nbus", poly([[-78, N_RAIL.y, N_RAIL.z + 3.1], [206, N_RAIL.y, N_RAIL.z + 3.1]])));
  return out.join("");
}

// ------------------------------------------------------- modules ----
function module_(m) {
  const X0 = m.x0;
  const out = [];
  const wall = (x, y, w, d) => S(k.slabOf({ x, y, w, d, r: 0.8 }, ZP + 11.6, Z_TRAY - ZP - 11.6, P, 4, 0.5), { tone: "lo" });

  // copper baseplate + dark tray
  out.push(S(k.slabOf({ x: X0, y: MY0, w: MW, d: MY1 - MY0, r: 1.5 }, ZP, 1.6, P, 5, 0.3), { tone: "mid" }));
  out.push(S(k.slabOf({ x: X0 + 2, y: MY0 + 2, w: MW - 4, d: MY1 - MY0 - 4, r: 1 }, ZP + 1.6, 10, P, 6, 0.8), { tone: "mid" }));

  out.push(wall(X0, MY0, MW, 3));
  out.push(wall(X0, MY0, 3, MY1 - MY0));
  out.push(wall(X0 + MW - 3, MY0, 3, MY1 - MY0));
  out.push(S(k.slabOf({ x: X0 + 3, y: MY0 + 3, w: MW - 6, d: MY1 - MY0 - 6, r: 1 }, ZP + 11.6, 1.4, P, 4, 0.2), { tone: "faint" }));

  // DBC substrates
  const sub = (sx) => ({ x: X0 + sx, y: MY0 + 6, w: 28, d: 34, r: 1.2 });
  out.push(S(k.slabOf(sub(6), ZP + 13, 1.4, P, 4, 0.3), { tone: "hi" }));
  out.push(S(k.slabOf(sub(46), ZP + 13, 1.4, P, 4, 0.3), { tone: "hi" }));
  out.push(L(k.planOutline(sub(6), ZP + 14.4, P, 4), "faint", 0.5));
  out.push(L(k.planOutline(sub(46), ZP + 14.4, P, 4), "faint", 0.5));

  // dies: IGBT (large) and its antiparallel diode (small) on each substrate
  const die = (cx, cy, w, d, h, glowId) => {
    const plan = { x: cx - w / 2, y: cy - d / 2, w, d, r: 0.6 };
    const s1 = S(k.slabOf(plan, ZP + 14.4, h, P, 4, 0.3), { tone: "mid" });
    const top = k.slabOf(plan, ZP + 14.4 + h, 0.02, P, 4, 0).top;
    return s1 + `<g data-glow="${glowId}" opacity="0"><path class="iso-line" data-tone="lit" d="${top}" style="stroke-width:2.6" opacity=".55"/></g><path class="iso-top" d="${top}" style="fill:var(--anatomy-lit);opacity:0" data-glowtop="${glowId}"/>`;
  };
  const uy = MY0 + 16;
  const ly = MY0 + 32;
  out.push(die(X0 + 18, uy, 11, 11, 2.4, `s${m.hi}`));
  out.push(die(X0 + 18, ly, 7.5, 7.5, 1.8, `k${m.hi}`));
  out.push(die(X0 + 62, uy, 11, 11, 2.4, `s${m.lo}`));
  out.push(die(X0 + 62, ly, 7.5, 7.5, 1.8, `k${m.lo}`));

  // copper ribbons: P post -> upper collector; emitter -> AC; AC -> lower; lower -> N
  out.push(ribbon([[X0 + 12, MY0 + 3, ZP + 16], [X0 + 12, MY0 + 10, ZP + 16], [X0 + 18, MY0 + 10, ZP + 16], [X0 + 18, MY0 + 12, ZP + 16]]));
  out.push(ribbon([[X0 + 18, MY0 + 21, ZP + 16], [X0 + 18, MY0 + 40, ZP + 16], [X0 + 38, MY0 + 40, ZP + 16], [X0 + AC_LOCAL, MY0 + 43, ZP + 16]]));
  out.push(ribbon([[X0 + AC_LOCAL, MY0 + 43, ZP + 16], [X0 + 62, MY0 + 40, ZP + 16], [X0 + 62, MY0 + 38, ZP + 16]]));
  out.push(ribbon([[X0 + 62, MY0 + 34, ZP + 16], [X0 + 62, MY0 + 26, ZP + 16], [X0 + 62, MY0 + 22, ZP + 16]]));
  out.push(ribbon([[X0 + 62, MY0 + 22, ZP + 16], [X0 + 62, MY0 + 10, ZP + 16], [X0 + 68, MY0 + 10, ZP + 16], [X0 + 68, MY0 + 3, ZP + 16]]));
  out.push(ribbon([[X0 + 62, MY0 + 8, ZP + 16], [X0 + 62, MY0 + 8, ZP + 16]]));

  // bond wires
  out.push(wire3([X0 + 18, MY0 + 21, ZP + 16.8], [X0 + 18, MY0 + 26, ZP + 20], [X0 + 18, MY0 + 30, ZP + 16.4], "mid", 0.8));
  out.push(wire3([X0 + 18, MY0 + 11, ZP + 16.8], [X0 + 18, MY0 + 5, ZP + 20], [X0 + 18, MY0 + 4, ZP + 16.4], "mid", 0.8));
  out.push(wire3([X0 + 62, MY0 + 11, ZP + 16.8], [X0 + 62, MY0 + 5, ZP + 20], [X0 + 62, MY0 + 4, ZP + 16.4], "mid", 0.8));
  out.push(wire3([X0 + 62, MY0 + 21, ZP + 16.8], [X0 + 62, MY0 + 26, ZP + 20], [X0 + 62, MY0 + 30, ZP + 16.4], "mid", 0.8));

  // internal current paths
  const zf = ZP + 17.2;
  out.push(flow(`up${m.id}`, poly([[X0 + 12, MY0 + 4, zf], [X0 + 18, MY0 + 11, zf], [X0 + 18, MY0 + 29, zf], [X0 + 30, MY0 + 41, zf], [X0 + AC_LOCAL, MY0 + 43, zf]]), 3));
  out.push(flow(`lo${m.id}`, poly([[X0 + AC_LOCAL, MY0 + 43, zf], [X0 + 56, MY0 + 41, zf], [X0 + 62, MY0 + 36, zf], [X0 + 62, MY0 + 21, zf], [X0 + 68, MY0 + 4, zf]]), 3));

  // gate connector on the tray
  out.push(S(k.slabOf({ x: X0 + 32, y: MY0 + 3, w: 14, d: 6, r: 0.8 }, Z_TRAY + 0.4, 3.6, P, 4, 0.3), { tone: "mid" }));
  for (let i = 0; i < 4; i++) out.push(DN([[X0 + 35 + i * 3, MY0 + 6, Z_TRAY + 4.2]], { size: 0.34, tone: "mid" }));

  // terminals: P and N on the back wall, AC on the front wall
  for (const p of [
    { x: X0 + 12, y: MY0 + 2 },
    { x: X0 + 68, y: MY0 + 2 },
    { x: X0 + AC_LOCAL, y: MY1 - 2 },
  ]) {
    out.push(S(k.cylinder(p.x, p.y, 5, Z_TRAY, 1.4, P, 14, 0.25), { tone: "lo" }));
    out.push(post(p.x, p.y, Z_TRAY + 1.4, Z_TRAY + 7, 3.4, { nutZ: Z_TRAY + 4.4 }));
  }

  // risers to the rails
  out.push(S(k.cylinder(X0 + 12, MY0 + 2, 3.4, Z_TRAY + 7, P_RAIL.z + 3 - Z_TRAY - 7, P, 12, 0.3), { tone: "hi" }));
  out.push(bar([X0 + 12, MY0 + 2], [X0 + 12, P_RAIL.y], P_RAIL.z + 1.5, 3, 9, { tone: "hi" }));
  out.push(S(k.cylinder(X0 + 68, MY0 + 2, 3.4, Z_TRAY + 7, N_RAIL.z + 3 - Z_TRAY - 7, P, 12, 0.3), { tone: "hi" }));
  out.push(bar([X0 + 68, MY0 + 2], [X0 + 68, N_RAIL.y], N_RAIL.z + 1.5, 3, 9, { tone: "hi" }));

  // front wall (nearest), then its markings
  out.push(wall(X0, MY1 - 3, MW, 3));
  out.push(txt(k.sideMatrix([X0 + MW - 5, MY1], 20.5, P, "left"), `S${m.hi}/S${m.lo}`, { size: 3, tone: "lo", anchor: "end" }));
  out.push(txt(k.sideMatrix([X0 + 44, MY1], 21, P, "left"), m.id, { size: 5, tone: "mid" }));
  out.push(DN([[X0 + 38, MY1, 22.6]], { size: 0.5, tone: "faint" }));
  return out.join("");
}

// ------------------------------------------------------ gate driver ----
function driver() {
  const out = [];
  const board = { x: -74, y: -121, w: 268, d: 35, r: 2 };
  for (const [x, y] of [[-64, -113], [-64, -94], [184, -113], [184, -94]]) {
    out.push(S(k.cylinder(x, y, 2.8, FIN.z1, Z_BOARD - FIN.z1, P, 12, 0.25), { tone: "mid" }));
  }
  out.push(S(k.slabOf(board, Z_BOARD, 2.6, P, 6, 0.5), { tone: "lo" }));
  out.push(S(k.slabOf(k.insetPlan(board, 2.4), Z_BOARD + 2.6, 0.5, P, 5, 0.2), { tone: "faint" }));

  const chans = [];
  for (const m of MODS) {
    chans.push({ x: m.x0 + 6, sw: m.hi, id: m.id });
    chans.push({ x: m.x0 + 44, sw: m.lo, id: m.id });
  }
  chans.sort((a, b) => a.x - b.x);
  for (const c of chans) {
    const y = -106;
    out.push(S(k.slabOf({ x: c.x, y: y - 7, w: 14, d: 13, r: 0.6 }, Z_BOARD + 3.1, 2.6, P, 4, 0.3), { tone: "mid" }));
    out.push(S(k.slabOf({ x: c.x + 17, y: y - 6, w: 8, d: 10, r: 0.5 }, Z_BOARD + 3.1, 3.4, P, 4, 0.3), { tone: "mid" }));
    out.push(S(k.cylinder(c.x + 30, y - 3, 2.6, Z_BOARD + 3.1, 4.6, P, 12, 0.3), { tone: "hi" }));
    out.push(S(k.slabOf({ x: c.x + 28, y: y + 5, w: 9, d: 3.4, r: 0.4 }, Z_BOARD + 3.1, 1.8, P, 4, 0.2), { tone: "lo" }));
    const led = at([c.x + 8, y + 9, Z_BOARD + 3.4]);
    out.push(
      `<g data-led="${c.sw}" opacity=".14"><circle cx="${led[0].toFixed(1)}" cy="${led[1].toFixed(1)}" r="${(2.2 * P.scale).toFixed(2)}" style="fill:var(--anatomy-lit)"/></g>`,
    );
    out.push(txt(k.topMatrix([c.x + 1, y - 9], Z_BOARD + 3.2, P, "x"), `G${c.sw}`, { size: 2.4, tone: "lo" }));
  }

  // ribbons: board header -> down -> module gate connector
  for (const m of MODS) {
    out.push(S(k.slabOf({ x: m.x0 + 33, y: -96, w: 17, d: 7, r: 0.6 }, Z_BOARD + 3.1, 3, P, 4, 0.3), { tone: "mid" }));
    const a = [m.x0 + AC_LOCAL, -93, Z_BOARD + 5.5];
    const c = [m.x0 + AC_LOCAL, -52, Z_BOARD + 5.5];
    const b = [m.x0 + 39, MY0 + 9, Z_TRAY + 4];
    out.push(L(poly([a, [a[0], -74, a[2]], c]), "mid", 3.2));
    out.push(L(poly([c, [b[0], b[1], c[2]], b]), "mid", 3.2));
    out.push(L(poly([a, [a[0], -74, a[2]], c]), "lo", 1));
    out.push(L(poly([c, [b[0], b[1], c[2]], b]), "lo", 1));
    out.push(txt(k.topMatrix([m.x0 + 33, -99], Z_BOARD + 3.4, P, "x"), `DRIVE ${m.id}`, { size: 2.4, tone: "lo" }));
  }
  return out.join("");
}

// -------------------------------------------------- output studs ----
function studs() {
  const out = [];
  for (const m of MODS) {
    const x = m.x0 + AC_LOCAL;
    out.push(S(k.cylinder(x, MY1 - 2, 3.2, Z_TRAY + 7, 33 - Z_TRAY - 7, P, 12, 0.3), { tone: "hi" }));
    out.push(bar([x, MY1 - 2], [x, STUD_Y + 8], 33, 3, 11, { tone: "hi" }));
    out.push(flow(`ph${m.id}`, poly([[x, MY1 - 2, 34.6], [x, STUD_Y + 8, 34.6], [x, STUD_Y + 8, 30]])));
    out.push(S(k.cylinder(x, STUD_Y, 9, ZP, 3.4, P, 24, 0.4), { tone: "lo" }));
    out.push(S(k.cylinder(x, STUD_Y, 6.4, ZP + 3.4, 20, P, 24, 0.6), { tone: "hi" }));
    out.push(L(k.ring(x, STUD_Y, 6.6, ZP + 14, P, 24), "mid", 0.7));
    out.push(S(k.cylinder(x, STUD_Y, 6.6, ZP + 14, 3, P, 24, 0.4), { tone: "mid" }));
    out.push(post(x, STUD_Y, ZP + 23, ZP + 27, 3.4, { nutZ: ZP + 24.4 }));
    out.push(txt(k.topMatrix([x + 9, STUD_Y + 1], ZP + 3.6, P, "x"), m.id, { size: 4, tone: "mid" }));
  }
  out.push(txt(k.topMatrix([MODS[0].x0 + AC_LOCAL - 4, STUD_Y + 12], ZP + 3.6, P, "x"), "output", { size: 3, tone: "lo" }));
  return out.join("");
}

// ------------------------------------------------------ three-phase load ----
function load() {
  const out = [];
  const L0 = LOAD;
  out.push(S(k.slabOf({ x: L0.x, y: L0.y, w: L0.w, d: L0.d, r: 4 }, ZP, 5, P, 8, 0.8), { tone: "lo", halo: true }));
  out.push(S(k.slabOf({ x: L0.x + 8, y: L0.y + 14, w: L0.w - 16, d: L0.d - 24, r: 2.5 }, ZP + 5, 5, P, 6, 0.6), { tone: "mid" }));

  const coreY = L0.y + 24;
  const coreW = 88;
  const coreX = L0.x + 8;
  const limbs = [coreX + 16, coreX + 44, coreX + 72];

  // cooling blocks under the core
  for (const x of limbs) out.push(S(k.cylinder(x, coreY + 9, 13, ZP + 10, 8, P, 22, 0.4), { tone: "lo" }));
  // terminal box at the back of the deck — drawn before the core: it sits
  // behind it (smaller y), so the yoke/limbs must paint over it.
  const tb = { x: coreX, y: L0.y + 4, w: coreW, d: 16, r: 2 };
  out.push(S(k.slabOf(tb, ZP + 10, 14, P, 5, 0.6), { tone: "mid" }));
  out.push(S(k.slabOf(k.insetPlan(tb, 2), ZP + 24, 1.4, P, 4, 0.3), { tone: "lo" }));
  for (const x of limbs) {
    out.push(post(x, tb.y + 8, ZP + 25.4, ZP + 31, 3, { nutZ: ZP + 28.6 }));
    // riser off the lug up to the winding's top turn, then a short link onto it;
    // drawn before the core, so the yokes and the coil occlude it honestly.
    out.push(S(k.cylinder(x, tb.y + 8, 2.4, ZP + 31, ZP + 14, P, 14, 0.3), { tone: "hi" }));
    out.push(bar([x, tb.y + 8], [x, coreY - 14], ZP + 50, 2.4, 5.6, { tone: "hi" }));
    out.push(flow(`ld${x}`, poly([[x, tb.y + 8, ZP + 31], [x, tb.y + 8, ZP + 51], [x, coreY - 14, ZP + 51]]), 2));
  }
  out.push(txt(k.topMatrix([coreX + 6, tb.y + 2], ZP + 25.6, P, "x"), "star L", { size: 2.8, tone: "lo" }));

  // bottom yoke
  out.push(S(k.slabOf({ x: coreX, y: coreY, w: coreW, d: 18, r: 0.8 }, ZP + 18, 8, P, 4, 0.4), { tone: "mid" }));
  for (let i = 1; i < 9; i++) {
    out.push(L(k.lineOnTop([coreX + 0.6, coreY + i * 2], [coreX + coreW - 0.6, coreY + i * 2], ZP + 26.05, P), "lo", 0.5, "both"));
  }
  // limbs + windings, far limb first
  const order = [...limbs].sort((a, b) => k.depthOf([a, coreY, 30], P) - k.depthOf([b, coreY, 30], P));
  for (const x of order) {
    out.push(S(k.slabOf({ x: x - 7, y: coreY, w: 14, d: 18, r: 0.8 }, ZP + 26, 24, P, 4, 0.4), { tone: "mid" }));
    const sol = solenoid(x, coreY + 9, 14, ZP + 26, ZP + 50, 7, "hi", 1.7);
    out.push(sol.back);
    out.push(flow(`ld${x}`, sol.backFlow, 2));
    out.push(S(k.cylinder(x, coreY + 9, 15.4, ZP + 24.5, 2, P, 24, 0.3), { tone: "lo" }));
    out.push(S(k.cylinder(x, coreY + 9, 15.4, ZP + 50, 2, P, 24, 0.3), { tone: "lo" }));
    out.push(sol.front);
    out.push(flow(`ld${x}`, sol.frontFlow, 2));
    out.push(S(k.cylinder(x, coreY + 9, 3.2, ZP + 50, 2, P, 12, 0.3), { tone: "hi" }));
  }
  // top yoke + clamp hardware
  out.push(S(k.slabOf({ x: coreX, y: coreY, w: coreW, d: 18, r: 0.8 }, ZP + 52, 8, P, 4, 0.4), { tone: "mid" }));
  for (let i = 1; i < 9; i++) {
    out.push(L(k.lineOnTop([coreX + 0.6, coreY + i * 2], [coreX + coreW - 0.6, coreY + i * 2], ZP + 60.05, P), "lo", 0.5, "both"));
  }
  for (const z of [ZP + 26, ZP + 52]) {
    out.push(bar([coreX - 4, coreY - 3.5], [coreX + coreW + 4, coreY - 3.5], z, 5, 6, { tone: "mid" }));
    out.push(bar([coreX - 4, coreY + 21.5], [coreX + coreW + 4, coreY + 21.5], z, 5, 6, { tone: "mid" }));
    for (const x of [coreX - 2, coreX + coreW + 2]) {
      out.push(S(k.cylinder(x, coreY - 3.5, 2.2, z + 5, 3, P, 6, 0.3), { tone: "mid" }));
      out.push(S(k.cylinder(x, coreY + 21.5, 2.2, z + 5, 3, P, 6, 0.3), { tone: "mid" }));
    }
  }

  // star point bar on the front deck
  const nb = { x: limbs[0] - 6, y: L0.y + 62, w: limbs[2] - limbs[0] + 12, d: 6, r: 1 };
  out.push(S(k.slabOf(nb, ZP + 12, 2.6, P, 5, 0.3), { tone: "hi" }));
  for (const x of limbs) {
    out.push(ribbon([[x, coreY + 22, ZP + 14.4], [x, nb.y + 3, ZP + 14.4]], "hi", 4));
    out.push(S(k.cylinder(x, nb.y + 3, 2.8, ZP + 11, 4, P, 10, 0.3), { tone: "hi" }));
    out.push(DN([[x, nb.y + 3, ZP + 15.4]], { size: 0.6, tone: "lit" }));
    out.push(flow(`ld${x}`, poly([[x, coreY + 22, ZP + 16], [x, nb.y + 3, ZP + 16]]), 2));
  }
  out.push(txt(k.topMatrix([nb.x + 2, nb.y + 1], ZP + 15.4, P, "x"), "N", { size: 3.4, tone: "mid" }));

  // rating plate on the plinth's front deck
  const rp = { x: L0.x + 14, y: L0.y + 66, w: 46, d: 8, r: 1 };
  out.push(S(k.slabOf(rp, ZP + 5, 1.2, P, 4, 0.2), { tone: "mid" }));
  [34, 24, 30].forEach((w, i) => {
    const y = rp.y + 3.4 + i * 3.6;
    out.push(L(k.lineOnTop(at([rp.x + 4, y, ZP + 6.3]), at([rp.x + 4 + w, y, ZP + 6.3]), ZP + 6.3, P), i === 0 ? "mid" : "lo", 0.5, "both"));
  });
  return out.join("");
}

// -------------------------------------------------------- load cables ----
function cables() {
  const lugX = [88, 116, 144];
  const lugY = LOAD.y + 12;
  // one cubic per phase: off the stud, over a shallow apex, down onto the lug.
  // Apex height is staggered per leg so the runs stack without touching.
  const runs = MODS.map((m, i) => {
    const x = m.x0 + AC_LOCAL;
    const lx = lugX[i];
    const h = ZP + [50, 55, 60][i];
    const p0 = [x, STUD_Y, ZP + 26];
    const p1 = [x, STUD_Y + 10, h];
    const p2 = [lx, lugY - 16, h];
    const p3 = [lx, lugY, ZP + 30];
    const pts = [];
    for (let s = 0; s <= 48; s++) {
      const t = s / 48;
      const u = 1 - t;
      pts.push([
        u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
        u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
        u * u * u * p0[2] + 3 * u * u * t * p1[2] + 3 * u * t * t * p2[2] + t * t * t * p3[2],
      ]);
    }
    return { m, x, lx, pts, key: k.depthOf(pts[24], P) };
  });
  runs.sort((a, b) => a.key - b.key);
  const out = [];
  for (const { m, x, lx, pts } of runs) {
    out.push(L(poly(pts), "lo", 7.8, "both"));
    out.push(L(poly(pts), "mid", 6.2, "both"));
    out.push(`<path class="iso-line" data-tone="hi" data-free="both" style="stroke-width:1.1;opacity:.5" d="${poly(pts)}"/>`);
    out.push(flow(`ph${m.id}`, poly(pts), 2.2));
    out.push(L(k.ring(lx, lugY, 5, ZP + 31, P, 16), "mid", 0.8));
    out.push(S(k.cylinder(lx, lugY, 2.4, ZP + 29, 2.6, P, 10, 0.2), { tone: "lo" }));
    out.push(S(k.cylinder(x, STUD_Y, 5.2, ZP + 26, 3, P, 16, 0.3), { tone: "mid" }));
  }
  return out.join("");
}
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t;
  const t3 = t2 * t;
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
}

// ------------------------------------------------------------ console ----
function console_() {
  const out = [];
  const C0 = CONSOLE;
  out.push(S(k.slabOf({ x: C0.x, y: C0.y, w: C0.w, d: C0.d, r: 3 }, C0.z0, C0.z1 - C0.z0, P, 8, 1.2), { tone: "mid", halo: true }));
  out.push(S(k.slabOf(k.insetPlan({ x: C0.x, y: C0.y, w: C0.w, d: C0.d }, 3), C0.z1, 1.6, P, 6, 0.4), { tone: "lo" }));
  const ZT = C0.z1 + 1.6;

  for (const kn of KNOBS) {
    out.push(L(k.ring(kn.x, kn.y, kn.r, ZT, P, 28), "lo", 0.6));
    out.push(S(k.cylinder(kn.x, kn.y, kn.r, ZT, 6.4, P, 30, 0.6), { tone: "hi" }));
    out.push(L(k.knurl(kn.x, kn.y, kn.r, ZT + 0.4, ZT + 6.4, 26, P, 0.45), "lo", 0.5, "both"));
    out.push(S(k.cylinder(kn.x, kn.y, kn.r - 1.6, ZT + 6.4, 1.2, P, 26, 0.3), { tone: "mid" }));
    const ticks = [];
    for (let i = 0; i <= 10; i++) {
      const a = -Math.PI * 0.72 + (i / 10) * Math.PI * 1.44;
      const r0 = kn.r + 2.4;
      const r1 = kn.r + (i % 5 === 0 ? 5.2 : 3.8);
      ticks.push(seg([kn.x + Math.cos(a) * r0, kn.y + Math.sin(a) * r0, ZT + 0.1], [kn.x + Math.cos(a) * r1, kn.y + Math.sin(a) * r1, ZT + 0.1]));
    }
    out.push(L(ticks.join(""), "lo", 0.55));
    out.push(
      `<path data-knob="${kn.id}" d="${seg([kn.x, kn.y, ZT + 7.8], [kn.x + kn.r * 0.5, kn.y, ZT + 7.8])}" fill="none" stroke="var(--anatomy-lit)" stroke-width="1.3" stroke-linecap="round"/>`,
    );
    out.push(txt(k.topMatrix([kn.x, kn.y + kn.r + 7], ZT + 0.1, P, "x"), kn.label, { size: 3.2, tone: "mid", anchor: "middle" }));
  }

  // mode lever slot + detents
  out.push(S(k.slabOf({ x: MODE_X[0] - 10, y: MODE_Y - 3, w: MODE_X[2] - MODE_X[0] + 20, d: 6, r: 3 }, ZT - 0.6, 1, P, 5, 0.3), { tone: "faint" }));
  ["OFF", "PWM", "STEP"].forEach((s, i) => {
    out.push(DN([[MODE_X[i], MODE_Y, ZT + 0.45]], { size: 0.7, tone: "mid" }));
    out.push(txt(k.topMatrix([MODE_X[i], MODE_Y + 6], ZT + 0.1, P, "x"), s, { size: 2.6, tone: "lo", anchor: "middle" }));
  });
  out.push(leverSvg(MODE_X[1]));

  // vector rotary switch: six detents
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 3;
    out.push(DN([[VEC.x + Math.cos(a) * (VEC.r + 2.6), VEC.y + Math.sin(a) * (VEC.r + 2.6), ZT + 0.15]], { size: 0.6, tone: "mid" }));
  }
  out.push(S(k.cylinder(VEC.x, VEC.y, VEC.r, ZT, 6, P, 24, 0.6), { tone: "hi" }));
  out.push(L(k.knurl(VEC.x, VEC.y, VEC.r, ZT + 0.4, ZT + 6, 18, P, 0.4), "lo", 0.5, "both"));
  out.push(S(k.cylinder(VEC.x, VEC.y, VEC.r - 1.8, ZT + 6, 1.2, P, 20, 0.3), { tone: "mid" }));
  out.push(
    `<path data-knob="vec" d="${seg([VEC.x, VEC.y, ZT + 7.4], [VEC.x, VEC.y - VEC.r * 0.6, ZT + 7.4])}" fill="none" stroke="var(--anatomy-lit)" stroke-width="1.3" stroke-linecap="round"/>`,
  );
  out.push(txt(k.topMatrix([VEC.x, VEC.y - VEC.r - 7], ZT + 0.1, P, "x"), "vector", { size: 2.6, tone: "lo", anchor: "middle" }));

  // screen on the front face
  const m = k.sideMatrix([SCREEN.x0, SCREEN.y0], SCREEN.zTop, P, "left");
  const g = [];
  g.push(`<rect x="0" y="0" width="${SCREEN.w}" height="${SCREEN.h}" fill="var(--anatomy-halo)"/>`);
  g.push(`<rect x=".6" y=".6" width="${SCREEN.w - 1.2}" height="${SCREEN.h - 1.2}" fill="none" stroke="var(--anatomy-faint)" stroke-width="1.2"/>`);
  for (let i = 1; i < 4; i++) g.push(`<line x1="1" y1="${(SCREEN.h * i) / 4}" x2="${SCREEN.w - 1}" y2="${(SCREEN.h * i) / 4}" stroke="var(--anatomy-faint)" stroke-width=".5" stroke-opacity=".8"/>`);
  for (let i = 1; i < 6; i++) g.push(`<line x1="${(SCREEN.w * i) / 6}" y1="1" x2="${(SCREEN.w * i) / 6}" y2="${SCREEN.h - 1}" stroke="var(--anatomy-faint)" stroke-width=".5" stroke-opacity=".8"/>`);
  g.push(`<path class="scope-v" d="" fill="none" stroke="var(--anatomy-blue)" stroke-width="1" vector-effect="non-scaling-stroke"/>`);
  g.push(`<path class="scope-i" d="" fill="none" stroke="var(--anatomy-lit)" stroke-width="1" vector-effect="non-scaling-stroke"/>`);
  g.push(`<text x="2" y="4.4" font-size="2.6" fill="var(--anatomy-lo)">v</text>`);
  g.push(`<text x="2" y="17" font-size="2.6" fill="var(--anatomy-lo)">i</text>`);
  out.push(`<g transform="${m}">${g.join("")}</g>`);
  // bezel studs on the face
  out.push(DN([[SCREEN.x0 - 2, SCREEN.y0, SCREEN.zTop + SCREEN.h + 2], [SCREEN.x0 + SCREEN.w + 2, SCREEN.y0, SCREEN.zTop + SCREEN.h + 2]], { size: 0.5, tone: "mid" }));
  out.push(txt(k.sideMatrix([SCREEN.x0 + SCREEN.w + 4, SCREEN.y0], SCREEN.zTop - 1, P, "left"), "v\u2090  i\u2090", { size: 3, tone: "lo" }));
  return out.join("");
}

function leverSvg(x) {
  const CZ = CONSOLE.z1 + 1.6;
  return (
    `<g data-lever><path d="${seg([x, MODE_Y, CZ + 4], [x, MODE_Y, CZ + 10])}" stroke="var(--anatomy-hi)" stroke-width="2.4" fill="none" stroke-linecap="round"/>` +
    `<path d="${k.cylinder(x, MODE_Y, 3.6, CZ + 10, 3, P, 12, 0.4).top}" fill="var(--anatomy-hi)"/>` +
    `<path d="${k.cylinder(x, MODE_Y, 3.6, CZ + 10, 3, P, 12, 0.4).outline}" fill="none" stroke="var(--anatomy-mid)" stroke-width=".9"/></g>`
  );
}

// ------------------------------------------------------- hit targets ----
function hits() {
  const ZT = CONSOLE.z1 + 1.7;
  const out = [];
  for (const kn of KNOBS) {
    out.push(`<circle class="hit" data-knobhit="${kn.id}" cx="${at([kn.x, kn.y, ZT])[0].toFixed(1)}" cy="${at([kn.x, kn.y, ZT])[1].toFixed(1)}" r="${((kn.r + 7) * P.scale).toFixed(1)}"/>`);
  }
  out.push(`<circle class="hit" data-knobhit="vec" cx="${at([VEC.x, VEC.y, ZT])[0].toFixed(1)}" cy="${at([VEC.x, VEC.y, ZT])[1].toFixed(1)}" r="${((VEC.r + 8) * P.scale).toFixed(1)}"/>`);
  ["off", "pwm", "step"].forEach((mode, i) => {
    const x = MODE_X[i] - 10;
    const y = MODE_Y - 6;
    const pts = [
      [x, y, ZT], [x + 20, y, ZT], [x + 20, y + 14, ZT], [x, y + 14, ZT],
    ];
    out.push(`<path class="hit" data-modehit="${mode}" d="${poly(pts, true)}"/>`);
  });
  return out.join("");
}

// -------------------------------------------------- aux gate supply ----
// Isolated supply that feeds the six gate drivers.
function auxSupply() {
  const out = [];
  const B = { x: -124, y: 40, w: 28, d: 28, r: 2 };
  out.push(S(k.slabOf(B, ZP, 18, P, 5, 0.7), { tone: "mid" }));
  out.push(S(k.slabOf(k.insetPlan(B, 2.4), ZP + 18, 1.4, P, 5, 0.3), { tone: "lo" }));
  for (const [x, y] of [[-120, 44], [-100, 44], [-120, 64], [-100, 64]]) {
    out.push(DN([[x, y, ZP + 19.5]], { size: 1.4, tone: "mid" }));
  }
  // closed vent slots on the top face
  for (let i = 0; i < 4; i++) {
    const y = 45 + i * 5;
    out.push(S(k.slabOf({ x: -119, y, w: 18, d: 2.4, r: 1.2 }, ZP + 19.4, 1.1, P, 4, 0.2), { tone: "faint" }));
  }
  for (const x of [-116, -104]) {
    out.push(S(k.cylinder(x, 64, 4.4, ZP + 19.4, 1.2, P, 14, 0.3), { tone: "lo" }));
    out.push(post(x, 64, ZP + 20.6, ZP + 25, 2.4, { nutZ: ZP + 23 }));
  }
  out.push(L(k.planOutline(k.insetPlan(B, 0.8), ZP + 19.4, P, 5), "faint", 0.5));
  return out.join("");
}

// Flat braid grounding the plinth to the base plate.
function groundStrap() {
  const out = [];
  const a = [-14, 34, ZP + 2.4];
  const b = [64, 54, ZP + 2.4];
  out.push(S(k.slabOf({ x: -19, y: 29, w: 10, d: 10, r: 2 }, ZP, 1.6, P, 5, 0.3), { tone: "mid" }));
  out.push(post(-14, 34, ZP + 1.6, ZP + 7, 3, { nutZ: ZP + 4.4 }));
  out.push(L(seg(a, b), "mid", 8));
  out.push(`<path class="iso-line" data-tone="hi" style="stroke-width:1.2;opacity:.45" d="${seg(a, b)}"/>`);
  out.push(L(seg([b[0] - 4, b[1] - 1, b[2]], [b[0] + 4, b[1] + 1, b[2]]), "mid", 7));
  out.push(DN([[b[0], b[1], b[2] + 1]], { size: 1, tone: "mid" }));
  out.push(DN([[a[0], a[1], ZP + 8]], { size: 1, tone: "mid" }));
  return out.join("");
}

// Console -> aux supply -> gate-driver board: one routed control cable.
function controlCable() {
  const smooth = (pts, per = 12) => {
    const g = (i) => pts[Math.min(pts.length - 1, Math.max(0, i))];
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      for (let k2 = 0; k2 < per; k2++) {
        const t = k2 / per;
        out.push([0, 1, 2].map((ax) => catmull(g(i - 1)[ax], g(i)[ax], g(i + 1)[ax], g(i + 2)[ax], t)));
      }
    }
    out.push(pts[pts.length - 1].slice());
    return out;
  };
  const cable = (route, width = 3.6) => {
    const pts = smooth(route);
    return (
      L(poly(pts), "lo", width, "both") +
      L(poly(pts), "mid", width - 1.2, "both") +
      `<path class="iso-line" data-tone="hi" data-free="both" style="stroke-width:0.8;opacity:.4" d="${poly(pts)}"/>`
    );
  };
  const out = [];
  // One control harness: console -> down its left side -> along the plate edge,
  // left of the cold plate -> up a riser -> across to the driver board.
  const R = -85;
  const main = [
    [-77, 84, 28],
    [-81, 85.5, 20],
    [-84, 86.5, 12.5],
    [R, 84, 9],
    [R, 40, 9],
    [R, -10, 9],
    [R, -58, 9],
    [R, -62, 14],
    [R, -62, 30],
    [R, -62, 52],
    [R, -70, 58],
    [-80, -88, 58],
    [-74, -98, 58],
  ];
  out.push(cable(main));
  // branch to the isolated gate-drive supply, tucked behind the console
  out.push(cable([[-104, 66, 27], [-104, 70, 18], [-101, 76, 13], [-95, 82, 11], [-88, 85, 10], [R, 84, 9.5]], 3.2));

  // riser conduit carrying the harness up to the board, with clamps
  out.push(S(k.slabOf({ x: R - 3.2, y: -65.2, w: 6.4, d: 6.4, r: 1.2 }, ZP, 50, P, 4, 0.3), { tone: "mid" }));
  for (const z of [ZP + 10, ZP + 24, ZP + 38, ZP + 48]) {
    out.push(S(k.slabOf({ x: R - 5, y: -67, w: 10, d: 10, r: 2 }, z, 2.2, P, 4, 0.3), { tone: "lo" }));
  }
  // clamps holding the run down along the plate
  for (const y of [66, 40, 6, -32, -52]) {
    out.push(S(k.slabOf({ x: R - 3.6, y: y - 2.6, w: 7.2, d: 5.2, r: 1.4 }, ZP, 9.6, P, 4, 0.3), { tone: "lo" }));
  }
  // terminals
  out.push(S(k.slabOf({ x: -107, y: 63, w: 6, d: 6, r: 1 }, 29.6, 1.6, P, 4, 0.2), { tone: "mid" }));
  out.push(DN([[-104, 64, 31.4]], { size: 1.2, tone: "mid" }));
  out.push(DN([[-116, 64, 31.4]], { size: 1.2, tone: "mid" }));
  out.push(S(k.cylinder(-116, 64, 1.6, 29.6, 2.2, P, 10, 0.2), { tone: "mid" }));
  out.push(DN([[-74, -98, 58]], { size: 1.4, tone: "lit" }));
  out.push(DN([[-77, 84, 28]], { size: 1.2, tone: "mid" }));
  return out.join("");
}

// ------------------------------------------------------- assemble ----
const SIDE_CSS = `
.sd{position:fixed;top:50%;right:0;transform:translateY(-50%);z-index:40;font-family:var(--anatomy-mono)}
.sd-body{position:absolute;top:50%;right:100%;transform:translate(100%,-50%);width:262px;max-height:82vh;overflow-y:auto;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);padding:14px;visibility:hidden;transition:transform .22s var(--anatomy-ease),visibility 0s linear .22s}
.sd[data-open=true] .sd-body{transform:translate(0,-50%);visibility:visible;transition:transform .22s var(--anatomy-ease),visibility 0s}
.sd-tab{writing-mode:vertical-rl;transform:rotate(180deg);background:var(--anatomy-card);color:var(--anatomy-strong);border:0;box-shadow:-1px 0 0 1px var(--anatomy-mid);font:inherit;font-size:10px;letter-spacing:.14em;text-transform:uppercase;padding:14px 7px;cursor:pointer;display:flex;align-items:center;gap:7px;align-self:center}
.sd-tab:focus-visible{outline:1px solid var(--anatomy-hi);outline-offset:2px}
.sd-chev{width:6px;height:6px;border-right:1px solid currentColor;border-bottom:1px solid currentColor;transform:rotate(135deg)}
.sd[data-open="true"] .sd-chev{transform:rotate(-45deg)}
.sd-hint{margin:0 0 12px;font-size:11px;line-height:1.55;color:var(--anatomy-muted)}
.sd-row{display:grid;grid-template-columns:1fr auto;align-items:center;gap:4px 8px;margin:0 0 12px}
.sd-lab{display:flex;justify-content:space-between;align-items:baseline;grid-column:1/3;font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--anatomy-muted)}
.sd-lab output{font-size:11.5px;letter-spacing:0;text-transform:none;color:var(--anatomy-strong);font-variant-numeric:tabular-nums}
.sd-row input[type=range]{grid-column:1/3;width:100%;height:18px;margin:0;accent-color:var(--anatomy-hi);background:transparent;cursor:pointer}
.sd-row input[type=range]:focus-visible{outline:1px solid var(--anatomy-hi);outline-offset:3px}
.sd-group{margin:0 0 12px}
.sd-group .sd-lab{display:block;margin-bottom:5px}
.sd-btns{display:flex;flex-wrap:wrap;gap:4px}
.sd-btn{font:inherit;font-size:10px;letter-spacing:.08em;text-transform:uppercase;background:var(--anatomy-face);color:var(--anatomy-strong);border:0;box-shadow:inset 0 0 0 1px var(--anatomy-lo);padding:5px 8px;cursor:pointer}
.sd-btn:hover{box-shadow:inset 0 0 0 1px var(--anatomy-mid)}
.sd-btn[aria-pressed="true"]{box-shadow:inset 0 0 0 1px var(--anatomy-lit);color:var(--anatomy-lit)}
.sd-btn:disabled{opacity:.42;cursor:default}
.sd-btn:focus-visible{outline:1px solid var(--anatomy-hi);outline-offset:2px}
.sd-keys{margin:12px 0 0;font-size:10.5px;line-height:1.7;color:var(--anatomy-muted)}
.sd-keys b{color:var(--anatomy-text);font-weight:400}
@media (max-width:640px){
  .sd{top:auto;bottom:0;right:0;left:0;transform:none}
  .sd-body{position:fixed;top:auto;bottom:0;right:0;left:0;width:auto;max-height:62vh;transform:translateY(100%);padding:14px 14px 56px}
  .sd[data-open=true] .sd-body{transform:translateY(0)}
  .sd-tab{writing-mode:horizontal-tb;transform:none;justify-content:center;margin:0;box-shadow:0 -1px 0 1px var(--anatomy-mid)}
  .sd[data-open="true"] .sd-chev{transform:rotate(-135deg)}
  .sd-body{width:auto;max-height:62vh}
}
`;

const EXTRA_CSS = PANEL_CSS + THEORY_CSS + SIDE_CSS + CIRCUIT_CSS + `
.iso-stage{position:relative;outline:none}
.iso-stage:focus-visible .iso-canvas{box-shadow:0 0 0 1px var(--anatomy-mid);border-radius:8px}
.iso-canvas{border-radius:8px}
.iso-line[data-flow]{animation-duration:var(--flow-dur,1600ms);stroke-dasharray:2.6 7}
[data-path].rev .iso-line[data-flow]{animation-direction:reverse}
[data-path]{transition:opacity .16s linear}
[data-glowtop],[data-glow]{transition:opacity .1s linear}
[data-led]{transition:opacity .1s linear}
.hit{fill:transparent;stroke:none;cursor:grab}
.hit[data-modehit]{cursor:pointer}
[data-knob]{pointer-events:none}
/* narrow card: let the readout and the hint each have a line of their own */
@media (max-width:560px){
  .iso-plate{padding:46px 12px 104px}
  .iso-plate-corners{inset:14px 12px}
  .iso-plate-corner[data-corner="hint"]{bottom:58px;right:0;white-space:normal;line-height:1.5}
  .iso-plate-corner[data-corner="readout"]{bottom:8px;left:0;right:0;white-space:normal;line-height:1.6;font-size:10px}
  .iso-plate-corner[data-corner="title"]{font-size:9px}
}
`;

function build() {
  const body = [];
  body.push(plate());
  body.push(caps());
  body.push(dcInput());
  body.push(dcBus());
  body.push(heatsink());
  body.push(fan());
  body.push(rails());
  for (const m of MODS) body.push(module_(m));
  body.push(driver());
  body.push(studs());
  body.push(load());
  body.push(cables());
  body.push(auxSupply());
  body.push(console_());
  body.push(controlCable());
  body.push(groundStrap());
  body.push(hits());

  const svg = k.figureSvg({
    width: WIDTH,
    height: HEIGHT,
    label:
      "Isometric drawing of a three-phase voltage-source inverter: DC input terminals, two DC-link capacitors, a finned heatsink with an axial fan, three half-bridge modules showing six IGBT dies with antiparallel diodes, a gate-driver board above them, three output studs, three cables and a star-connected three-phase load reactor, with live current paths.",
    body: body.join(""),
  });

  return k.plateHtml({
    fig: "Fig 1",
    title: "Three-phase voltage-source inverter",
    hint: "drag Vdc \u00b7 m \u00b7 f \u00b7 click OFF / PWM / STEP",
    readout: `PWM \u00b7 m 0.80 \u00b7 50.0 Hz \u00b7 computing\u2026`,
    keys: [
      { mark: "switch", label: "gated IGBT, lit by 10 ms average duty" },
      { mark: "diode", label: "antiparallel diode carrying" },
      { mark: "flow", label: "current path, arrow direction = mean current" },
      { mark: "screen", label: "phase voltage and current, 40 ms window" },
    ],
    caption:
      "Model, not measurement. model.mjs solves an ideal-switch inverter: a stiff DC link Vdc with no ripple, six ideal IGBTs in three legs with complementary gates and no dead time, ideal antiparallel diodes, a star load of R = 2 \u03a9 + L = 4 mH per phase, regular-sampled sine-triangle PWM at fsw = 4 kHz (m is limited to 1.2, so above 1 the legs saturate and the panel flags it). Every number on the panel is computed from those equations at your settings \u2014 in PWM, vLL = 0.6124 \u00b7 m \u00b7 Vdc \u2014 none of it is a measurement. Lamps and paths show 10 ms averages: at 4 kHz the eye could not follow the individual pulses. The instrument panel below opens on demand and plots that same simulation from its own buffers: the carrier and the references actually sampled, S1-S6, the pole voltage, the three-phase voltages and currents, the harmonic spectrum with THD, and per-device conduction. Every figure there is computed, never measured. Keyboard: \u2191\u2193 \u2190\u2192 [ ] 1 2 3.",
    body: `<div class="iso-stage" tabindex="0" role="application" aria-label="Inverter controls" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="iso-canvas">${svg}</div></div>`,
  });
}

// ------------------------------------------------------------ sidebar ----
// A docked drawer with the same controls the knobs and keys drive, plus the two
// load values the 3D console has no knob for. One source of truth: every input
// writes ui.knobs and calls applyModel(), exactly like a knob drag.
const SIDE_KNOBS = [
  { id: "vdc", label: "DC link", unit: "V", min: 200, max: 750, step: 1, dec: 0 },
  { id: "m", label: "modulation m", unit: "", min: 0.05, max: 1.2, step: 0.01, dec: 2 },
  { id: "f", label: "frequency", unit: "Hz", min: 5, max: 100, step: 0.5, dec: 1 },
  { id: "r", label: "load R", unit: "\u03a9", min: 0.2, max: 20, step: 0.1, dec: 1 },
  { id: "l", label: "load L", unit: "mH", min: 0.1, max: 50, step: 0.1, dec: 1 },
];

function sideHtml() {
  const rows = SIDE_KNOBS.map((k) => `
      <label class="sd-row">
        <span class="sd-lab">${k.label}<output data-side-out="${k.id}"></output></span>
        <input type="range" data-side-in="${k.id}" min="${k.min}" max="${k.max}" step="${k.step}" aria-label="${k.label}">
      </label>`).join("");
  const modes = [["off", "OFF"], ["pwm", "PWM"], ["step", "STEP"]].map(([v, t]) =>
    `<button type="button" class="sd-btn" data-side-mode="${v}" aria-pressed="false">${t}</button>`).join("");
  const vecs = [1, 2, 3, 4, 5, 6].map((n) =>
    `<button type="button" class="sd-btn" data-side-vec="${n}" aria-pressed="false">V${n}</button>`).join("");
  return `
<aside class="sd" data-side data-open="false" aria-label="Controls">
  <button type="button" class="sd-tab" data-side-tab aria-expanded="false" aria-controls="sd-body"><span class="sd-chev" aria-hidden="true"></span>Controls</button>
  <div class="sd-body" id="sd-body">
    <p class="sd-hint">The same settings as the console knobs and the keys, plus the load.</p>
    ${rows}
    <div class="sd-group"><span class="sd-lab">mode</span><div class="sd-btns">${modes}</div></div>
    <div class="sd-group"><span class="sd-lab">step vector</span><div class="sd-btns">${vecs}</div></div>
    <div class="sd-group"><span class="sd-lab">run</span><div class="sd-btns">
      <button type="button" class="sd-btn" data-side-pause aria-pressed="false">Pause</button>
      <button type="button" class="sd-btn" data-side-csv>CSV</button>
      <button type="button" class="sd-btn" data-side-sweep>Sweep</button>
    </div></div>
    <p class="sd-keys">Keys: <b>1</b> <b>2</b> <b>3</b> modes, <b>\u2191\u2193</b> m, <b>\u2190\u2192</b> f, <b>[</b> <b>]</b> vector, <b>Shift+\u2191\u2193</b> Vdc.</p>
  </div>
</aside>`;
}

// --------------------------------------------------------------- live ----
function liveScript() {
  const modelSrc = readFileSync(new URL("./model.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
  const analysisSrc = readFileSync(new URL("./analysis.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
  return `
${modelSrc}
${analysisSrc}
${panelScript()}

const P = ${JSON.stringify(P)};
const SIDE_KNOBS = ${JSON.stringify(SIDE_KNOBS)};
const KNOBS = ${JSON.stringify(KNOBS)};
const MODE_X = ${JSON.stringify(MODE_X)};
const VEC = ${JSON.stringify(VEC)};
const MODS = ${JSON.stringify(MODS)};
const MODE_Y = ${MODE_Y};
const CZ = ${CONSOLE.z1 + 1.6};
const KNOB_RANGE = { vdc: [200, 750], m: [0.05, 1.2], f: [5, 100] };

const stage = document.querySelector(".iso-stage");
const readout = document.querySelector("[data-readout]");
const svg = stage.querySelector("svg");

const model = createInverter();
const ui = { mode: "pwm", vector: 1, knobs: { vdc: 400, m: 0.8, f: 50, r: 2, l: 4 }, drag: null };
// The simulation keeps running whether or not the figure is on screen: the
// panel below is a live view of the same model, so scrolling the illustration
// out of frame must not freeze the plots. Only the explicit Pause button stops
// model.advance; a hidden tab stops the frames because the browser stops
// calling requestAnimationFrame there.
const run = { last: 0, frame: 0 };

const glow = {}, glowTop = {}, led = {}, knob = {}, paths = {};
for (const el of svg.querySelectorAll("[data-glow]")) glow[el.getAttribute("data-glow")] = el;
for (const el of svg.querySelectorAll("[data-glowtop]")) glowTop[el.getAttribute("data-glowtop")] = el;
for (const el of svg.querySelectorAll("[data-led]")) led[el.getAttribute("data-led")] = el;
for (const el of svg.querySelectorAll("[data-knob]")) knob[el.getAttribute("data-knob")] = el;
for (const el of svg.querySelectorAll("[data-path]")) (paths[el.getAttribute("data-path")] ||= []).push(el);
const scopeV = svg.querySelector(".scope-v");
const scopeI = svg.querySelector(".scope-i");
const lever = svg.querySelector("[data-lever]");

function applyModel() {
  model.setVdc(ui.knobs.vdc);
  model.setM(ui.knobs.m);
  model.setFout(ui.knobs.f);
  model.setR(ui.knobs.r);
  model.setL(ui.knobs.l / 1000);
  model.setMode(ui.mode === "step" ? "six" : ui.mode);
  if (ui.mode === "step") {
    model.setSixHold(true);
    model.setVector(ui.vector);
  }
}

function drawLever() {
  const i = { off: 0, pwm: 1, step: 2 }[ui.mode];
  const x = MODE_X[i];
  const c = cylinder(x, MODE_Y, 3.6, CZ + 10, 3, P, 12, 0.4);
  lever.innerHTML =
    '<path d="' + segment([x, MODE_Y, CZ + 4], [x, MODE_Y, CZ + 10], P) + '" stroke="var(--anatomy-hi)" stroke-width="2.4" fill="none" stroke-linecap="round"/>' +
    '<path d="' + c.top + '" fill="var(--anatomy-hi)"/>' +
    '<path d="' + c.outline + '" fill="none" stroke="var(--anatomy-mid)" stroke-width=".9"/>';
}

// 40 ms of the model's window-averaged samples, in the screen's local box
function scopePaths() {
  const r = model.state.ring;
  const n = Math.min(r.filled, Math.round(0.04 / r.dt));
  if (n < 8) return null;
  const v = [], i = [];
  for (let s = 0; s < n; s++) {
    const idx = (r.at - n + s + r.v.length * 4) % r.v.length;
    v.push(r.v[idx]);
    i.push(r.ia[idx]);
  }
  const res = model.displayScope(v, i);
  const pv = res.v.map(([x, y]) => [(x / 100) * 58 + 1, 2.5 + ((y - 56) / 43) * 10]);
  const pi = res.i.map(([x, y]) => [(x / 100) * 58 + 1, 15 + ((y - 4) / 43) * 10]);
  const d = (pts) => "M" + pts.map(([x, y]) => x.toFixed(1) + " " + y.toFixed(1)).join("L");
  return { v: d(pv), i: d(pi) };
}

const ema = { vll: 0, irms: 0, p: 0, pf: 0, ready: false };
const dutyEma = [0, 0, 0, 0, 0, 0];
const LEG = { A: 0, B: 1, C: 2 };

function draw(dt) {
  const st = model.state;
  const meas = model.measure();
  const a = 1 - Math.exp(-dt / 0.14);
  ema.vll += (meas.vll - ema.vll) * a;
  ema.irms += (meas.irms - ema.irms) * a;
  ema.p += (meas.p - ema.p) * a;
  ema.pf += (meas.pf - ema.pf) * a;
  ema.ready = meas.samples > 0;

  // lamps: 10 ms persistence duty (this is what the eye sees at 4 kHz)
  const b = 1 - Math.exp(-dt / 0.03);
  for (let s = 0; s < 6; s++) {
    dutyEma[s] += (st.duty[s] - dutyEma[s]) * b;
    const on = dutyEma[s];
    if (glow["s" + (s + 1)]) glow["s" + (s + 1)].setAttribute("opacity", (0.12 + on * 0.88).toFixed(3));
    if (glowTop["s" + (s + 1)]) glowTop["s" + (s + 1)].style.opacity = (on * 0.5).toFixed(3);
    if (led[s + 1]) led[s + 1].setAttribute("opacity", (0.1 + on * 0.9).toFixed(3));
  }
  // antiparallel diodes: they carry whenever their transistor blocks the current
  for (let leg = 0; leg < 3; leg++) {
    const iAvg = st.iAvg[leg];
    const up = dutyEma[leg * 2];
    const lo = dutyEma[leg * 2 + 1];
    const hiDiode = iAvg < 0 ? 1 - lo : 0;
    const loDiode = iAvg > 0 ? 1 - up : 0;
    const kh = glow["k" + (leg * 2 + 1)];
    const kl = glow["k" + (leg * 2 + 2)];
    if (kh) kh.setAttribute("opacity", (0.08 + hiDiode * 0.9).toFixed(3));
    if (kl) kl.setAttribute("opacity", (0.08 + loDiode * 0.9).toFixed(3));
    if (glowTop["k" + (leg * 2 + 1)]) glowTop["k" + (leg * 2 + 1)].style.opacity = (hiDiode * 0.45).toFixed(3);
    if (glowTop["k" + (leg * 2 + 2)]) glowTop["k" + (leg * 2 + 2)].style.opacity = (loDiode * 0.45).toFixed(3);
  }

  const setPath = (id, cur, scale, litWhen) => {
    for (const el of paths[id] || []) {
      const mag = Math.min(1, Math.abs(cur) / scale);
      el.style.opacity = (litWhen ? 0.12 + mag * 0.88 : 0.1).toFixed(3);
      el.style.setProperty("--flow-dur", Math.round(2400 - mag * 1500) + "ms");
      el.classList.toggle("rev", cur < 0);
    }
  };
  for (let leg = 0; leg < 3; leg++) {
    const cur = st.iAvg[leg];
    setPath(["phA", "phB", "phC"][leg], cur, 42, Math.abs(cur) > 0.4);
    setPath("ld" + [88, 116, 144][leg], cur, 42, Math.abs(cur) > 0.4);
    setPath("up" + ["A", "B", "C"][leg], cur, 42, true);
    setPath("lo" + ["A", "B", "C"][leg], cur, 42, true);
  }
  const idc = st.idcAvg;
  for (const el of paths["pbus"] || []) {
    const mag = Math.min(1, Math.abs(idc) / 42);
    el.style.opacity = (0.1 + mag * 0.9).toFixed(3);
    el.style.setProperty("--flow-dur", Math.round(2400 - mag * 1500) + "ms");
    el.classList.toggle("rev", idc < 0);
  }
  for (const el of paths["nbus"] || []) {
    const mag = Math.min(1, Math.abs(idc) / 42);
    el.style.opacity = (0.1 + mag * 0.9).toFixed(3);
    el.style.setProperty("--flow-dur", Math.round(2400 - mag * 1500) + "ms");
    el.classList.toggle("rev", idc > 0);
  }

  // knob pointers
  for (const kn of KNOBS) {
    const el = knob[kn.id];
    if (!el) continue;
    const [lo, hi] = KNOB_RANGE[kn.id];
    const t = (ui.knobs[kn.id] - lo) / (hi - lo);
    const ang = -Math.PI * 0.72 + t * Math.PI * 1.44;
    el.setAttribute("d", segment([kn.x, kn.y, CZ + 7.8], [kn.x + Math.cos(ang) * kn.r * 0.6, kn.y + Math.sin(ang) * kn.r * 0.6, CZ + 7.8], P));
  }
  {
    const ang = -Math.PI / 2 + ((ui.vector - 1) * Math.PI) / 3;
    knob.vec.setAttribute("d", segment([VEC.x, VEC.y, CZ + 7.4], [VEC.x + Math.cos(ang) * VEC.r * 0.62, VEC.y + Math.sin(ang) * VEC.r * 0.62, CZ + 7.4], P));
  }

  const sp = scopePaths();
  if (sp) {
    scopeV.setAttribute("d", sp.v);
    scopeI.setAttribute("d", sp.i);
  }

  let txt;
  const vdc = ui.knobs.vdc.toFixed(0);
  if (ui.mode === "off") {
    txt = "OFF \\u00b7 gates blocked \\u00b7 " + vdc + " V dc \\u00b7 load current freewheels and decays through the diodes";
  } else if (ui.mode === "step") {
    const bits = ["100", "110", "010", "011", "001", "101"][ui.vector - 1];
    // a held vector has no fundamental: report the model's own dc line voltages
    const vv = model.state.v;
    const ii = model.state.i;
    const signed = (x, d) => (x >= 0 ? "+" : "\u2212") + Math.abs(x).toFixed(d);
    txt = "STEP \u00b7 V" + ui.vector + " (" + bits + ") \u00b7 " + vdc + " V dc \u00b7 " +
      "v ab " + (vv[0] - vv[1]).toFixed(0) + " V \u00b7 i " + ii.map((x) => signed(x, 0)).join(" / ") + " A";
  } else {
    txt = "PWM \\u00b7 m " + ui.knobs.m.toFixed(2) + " \\u00b7 " + ui.knobs.f.toFixed(1) + " Hz \\u00b7 " + vdc + " V dc \\u00b7 " +
      (ema.ready
        ? "v\\u2097\\u2097 " + ema.vll.toFixed(0) + " V \\u00b7 " + ema.irms.toFixed(1) + " A \\u00b7 " + (ema.p / 1000).toFixed(2) + " kW \\u00b7 pf " + ema.pf.toFixed(2)
        : "measuring\\u2026");
  }
  readout.textContent = txt;
  stage.setAttribute("aria-valuetext", txt);
  circuitUpdate(st);
  panelUpdate(st, ui, meas);
}

// --------------------------------------------------------- schematic ----
// The diagram is a second read-out of the same state: it keeps no numbers.
const cx = { dev: [], gate: [], v: [], i: [], vdc: null, idc: null };

function circuitInit() {
  const el = document.querySelector(".cx-svg");
  if (!el) return;
  for (const n of el.querySelectorAll("[data-dev]")) cx.dev[Number(n.getAttribute("data-dev"))] = n;
  for (const n of el.querySelectorAll("[data-gate]")) cx.gate[Number(n.getAttribute("data-gate"))] = n;
  for (const n of el.querySelectorAll("[data-phase-v]")) cx.v[Number(n.getAttribute("data-phase-v"))] = n;
  for (const n of el.querySelectorAll("[data-load-i]")) cx.i[Number(n.getAttribute("data-load-i"))] = n;
  cx.vdc = el.querySelector("[data-vdc]");
  cx.idc = el.querySelector("[data-idc]");
}

function circuitUpdate(st) {
  if (!cx.vdc) return;
  cx.vdc.textContent = model.params.vdc.toFixed(0) + " V";
  const idc = st.idc || 0;
  cx.idc.textContent = (idc >= 0 ? "+" : "\u2212") + Math.abs(idc).toFixed(1) + " A";
  for (let k = 0; k < 6; k++) {
    if (cx.dev[k]) cx.dev[k].classList.toggle("cx-on", !!(st.gate[k] || st.diode[k]));
    if (cx.gate[k]) cx.gate[k].classList.toggle("cx-gate-on", !!st.gate[k]);
  }
  for (let k = 0; k < 3; k++) {
    const v = st.v[k];
    if (cx.v[k]) cx.v[k].textContent = (v >= 0 ? "+" : "\u2212") + Math.abs(v).toFixed(0) + " V";
    const i = st.i[k];
    if (cx.i[k]) cx.i[k].textContent = (i >= 0 ? "+" : "\u2212") + Math.abs(i).toFixed(1) + " A";
  }
}

function tick(now) {
  const dt = run.last ? Math.min((now - run.last) / 1000, 1 / 30) : 1 / 60;
  run.last = now;
  if (ipBase.paused) {
    // Paused: one last frame to settle the plots, then stop asking for more.
    // play() restarts the loop when the button is pressed again or a knob moves.
    draw(dt);
    run.frame = 0;
    return;
  }
  model.advance(dt * 0.45);
  draw(dt);
  run.frame = requestAnimationFrame(tick);
}
function play() {
  if (!run.frame) {
    run.last = 0;
    run.frame = requestAnimationFrame(tick);
  }
}
function poke() {
  draw(1 / 60);
  play();
}

// ------------------------------------------------------------ sidebar ----
// The drawer is a second view of the same state: it holds no values of its
// own, it reads ui.knobs and writes ui.knobs, and sideSync() pushes changes
// made elsewhere (knob drag, key press, vector switch) back into the inputs.
const side = {
  root: document.querySelector("[data-side]"),
  tab: document.querySelector("[data-side-tab]"),
  in: {},
  out: {},
  mode: {},
  vec: {},
  pause: null,
};

function sideSync() {
  if (!side.root) return;
  for (const k of SIDE_KNOBS) {
    const v = ui.knobs[k.id];
    if (side.in[k.id]) side.in[k.id].value = String(v);
    if (side.out[k.id]) side.out[k.id].textContent = v.toFixed(k.dec) + (k.unit ? " " + k.unit : "");
  }
  for (const m of Object.keys(side.mode)) side.mode[m].setAttribute("aria-pressed", String(ui.mode === m));
  for (const n of Object.keys(side.vec)) {
    side.vec[n].setAttribute("aria-pressed", String(ui.mode === "step" && ui.vector === Number(n)));
    side.vec[n].disabled = ui.mode !== "step";
  }
  if (side.pause) {
    side.pause.textContent = ipBase.paused ? "Resume" : "Pause";
    side.pause.setAttribute("aria-pressed", String(ipBase.paused));
  }
}

function sideInit() {
  if (!side.root) return;
  const setOpen = (open) => {
    side.root.setAttribute("data-open", String(open));
    side.tab.setAttribute("aria-expanded", String(open));
  };
  side.tab.addEventListener("click", () => setOpen(side.root.getAttribute("data-open") !== "true"));
  // Escape closes the drawer, and so does a click outside it.
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && side.root.getAttribute("data-open") === "true") {
      setOpen(false);
      side.tab.focus();
    }
  });
  document.addEventListener("pointerdown", (e) => {
    if (side.root.getAttribute("data-open") === "true" && !side.root.contains(e.target)) setOpen(false);
  });
  for (const k of SIDE_KNOBS) {
    const el = side.root.querySelector('[data-side-in="' + k.id + '"]');
    side.in[k.id] = el;
    side.out[k.id] = side.root.querySelector('[data-side-out="' + k.id + '"]');
    el.addEventListener("input", () => {
      ui.knobs[k.id] = Number(el.value);
      applyModel();
      poke();
      sideSync();
    });
  }
  for (const b of side.root.querySelectorAll("[data-side-mode]")) {
    const m = b.getAttribute("data-side-mode");
    side.mode[m] = b;
    b.addEventListener("click", () => { setMode(m); poke(); sideSync(); });
  }
  for (const b of side.root.querySelectorAll("[data-side-vec]")) {
    const n = Number(b.getAttribute("data-side-vec"));
    side.vec[n] = b;
    b.addEventListener("click", () => {
      ui.vector = n;
      if (ui.mode !== "step") setMode("step");
      applyModel();
      poke();
      sideSync();
    });
  }
  side.pause = side.root.querySelector("[data-side-pause]");
  side.pause.addEventListener("click", () => {
    document.querySelector("[data-ip-pause]").click();
    sideSync();
  });
  side.root.querySelector("[data-side-csv]").addEventListener("click", () => document.querySelector("[data-ip-csv]").click());
  side.root.querySelector("[data-side-sweep]").addEventListener("click", () => document.querySelector("[data-ip-sweep]").click());
  sideSync();
}

function nudge(id, dy) {
  const [lo, hi] = KNOB_RANGE[id];
  const next = Math.min(hi, Math.max(lo, ui.knobs[id] - dy * ((hi - lo) / 240)));
  ui.knobs[id] = id === "vdc" ? Math.round(next) : +next.toFixed(3);
  applyModel();
  poke();
  sideSync();
}

svg.addEventListener("pointerdown", (e) => {
  const t = e.target.closest("[data-knobhit]");
  if (!t) return;
  const id = t.getAttribute("data-knobhit");
  if (id === "vec") {
    ui.vector = (ui.vector % 6) + 1;
    if (ui.mode !== "step") setMode("step");
    applyModel();
    poke();
    return;
  }
  ui.drag = { id, y: e.clientY };
  svg.setPointerCapture?.(e.pointerId);
  e.preventDefault();
});
svg.addEventListener("pointermove", (e) => {
  if (!ui.drag) return;
  const dy = ui.drag.y - e.clientY;
  ui.drag.y = e.clientY;
  nudge(ui.drag.id, dy);
  e.preventDefault();
});
const stop = () => (ui.drag = null);
svg.addEventListener("pointerup", stop);
svg.addEventListener("pointercancel", stop);

function setMode(mode) {
  ui.mode = mode;
  applyModel();
  model.settle();
  drawLever();
  sideSync();
}
for (const el of svg.querySelectorAll("[data-modehit]")) {
  el.addEventListener("click", (e) => {
    setMode(el.getAttribute("data-modehit"));
    poke();
    e.stopPropagation();
  });
}

stage.addEventListener("keydown", (e) => {
  const k = e.key;
  let used = true;
  if (k === "1") setMode("off");
  else if (k === "2") setMode("pwm");
  else if (k === "3") setMode("step");
  else if (k === "ArrowUp" || k === "ArrowDown") nudge(e.shiftKey ? "vdc" : "m", k === "ArrowUp" ? -7 : 7);
  else if (k === "ArrowLeft" || k === "ArrowRight") nudge("f", k === "ArrowRight" ? 7 : -7);
  else if (k === "[" || k === "]") {
    ui.vector = Math.min(6, Math.max(1, ui.vector + (k === "]" ? 1 : -1)));
    if (ui.mode !== "step") setMode("step");
    applyModel();
    poke();
    sideSync();
  } else used = false;
  if (used) e.preventDefault();
});

const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
if (reduced) {
  for (const el of svg.querySelectorAll("[data-flow]")) el.removeAttribute("data-flow");
}

applyModel();
model.settle();
drawLever();
panelInit();
sideInit();
circuitInit();
draw(1 / 60);
play();
`;
}

const page = k.pageHtml({
  title: "Three-phase voltage-source inverter",
  theme: "dark",
  width: 1040,
  body: `<style>${EXTRA_CSS}</style>${build()}${sideHtml()}${panelHtml()}${circuitHtml()}${theoryHtml()}`,
  script: kitScript() + liveScript(),
});
writeFileSync(new URL("./inverter.html", import.meta.url), page);
console.log("wrote inverter.html", (page.length / 1024).toFixed(0) + " kB");

export { load, plate, P, build };
