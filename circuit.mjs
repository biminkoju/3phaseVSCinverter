// Circuit diagram: the ideal topology model.mjs actually simulates. Flat SVG,
// not the isometric kit, because a schematic is read rather than looked at.
// The drawing keeps no numbers of its own: every glow and value comes from the
// live model state (s.gate, s.diode, s.v, s.i, s.idc).

export const CIRCUIT_CSS = `
.cx{margin:28px auto 0;max-width:1040px;color:var(--anatomy-text);font-family:var(--anatomy-mono)}
.cx-head{padding:10px 14px;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid)}
.cx-head h2{margin:0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--anatomy-strong);font-weight:400}
.cx-head p{margin:6px 0 0;font-size:12px;line-height:1.6;color:var(--anatomy-muted)}
.cx-head code{color:var(--anatomy-hi);font-size:11.5px}
.cx-body{padding:14px;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);margin-top:-1px}
.cx-svg{width:100%;height:auto;display:block;background:var(--anatomy-paper);box-shadow:inset 0 0 0 1px var(--anatomy-faint)}
.cx-wire{fill:none;stroke:var(--anatomy-mid);stroke-width:1.1;stroke-linecap:square}
.cx-rail{fill:none;stroke:var(--anatomy-text);stroke-width:1.7;stroke-linecap:round}
.cx-sym{fill:none;stroke:var(--anatomy-text);stroke-width:1.2;stroke-linejoin:round}
.cx-coil{fill:none;stroke:var(--anatomy-text);stroke-width:1.3;stroke-linejoin:round;stroke-linecap:round}
.cx-lab{fill:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10px;letter-spacing:.04em}
.cx-labb{fill:var(--anatomy-strong);font-family:var(--anatomy-mono);font-size:11px;letter-spacing:.07em}
.cx-v{fill:var(--anatomy-strong);font-family:var(--anatomy-mono);font-size:10px;font-variant-numeric:tabular-nums}
.cx-caption{fill:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:10px;letter-spacing:.03em}
.cx-dev .cx-dio{fill:none;stroke:var(--anatomy-text);stroke-width:1.2}
.cx-gate{stroke:var(--anatomy-mid);stroke-width:1.4;fill:none}
.cx-gatelab{fill:var(--anatomy-muted);font-family:var(--anatomy-mono);font-size:9.5px}
.cx-src{fill:none;stroke:var(--anatomy-text);stroke-linecap:round}
.cx-src-long{stroke-width:2.4}
.cx-src-short{stroke-width:3.6}
.cx-igbt{fill:none;stroke:var(--anatomy-text);stroke-width:1.4;stroke-linecap:round;stroke-linejoin:round;transition:stroke .08s linear}
.cx-igbt.cx-plate{stroke-width:2.2}
.cx-igbt-fill{fill:var(--anatomy-text);stroke:none;transition:fill .08s linear}
.cx-dio-fill{fill:var(--anatomy-text);stroke:none;transition:fill .08s linear}
.cx-dev.cx-on .cx-igbt{stroke:var(--anatomy-lit);stroke-width:2.2}
.cx-dev.cx-on .cx-igbt.cx-plate{stroke-width:3}
.cx-dev.cx-on .cx-igbt-fill{fill:var(--anatomy-lit)}
.cx-dev.cx-on .cx-dio{stroke:var(--anatomy-hi);stroke-width:1.8}
.cx-dev.cx-on .cx-dio-fill{fill:var(--anatomy-hi)}
.cx-dev.cx-on .cx-lab{fill:var(--anatomy-lit)}
.cx-gate.cx-gate-on{stroke:var(--anatomy-lit);stroke-width:2.4}
@media (max-width:680px){.cx-body{padding:8px}}
`;

const P_Y = 76;
const N_Y = 392;
const MID_Y = 234;
const X0 = 150;
const X1 = 744;
const LEG = [280, 450, 620];
const HI = [112, 192];
const LO = [276, 356];
const TAP = LEG.map((x) => x + 62);
const COIL = 452;
const STAR = 532;
const PHASE = ["A", "B", "C"];

function switchBox(x, y0, y1, id) {
  const yc = (y0 + y1) / 2;
  return `
  <g class="cx-dev" data-dev="${id}">
  <path class="cx-wire" d="M${x} ${y0 - 12} V${yc - 18}"/>
  <path class="cx-wire" d="M${x} ${y1 + 12} V${yc + 18}"/>
  <path class="cx-igbt" d="M${x - 16} ${yc - 12} V${yc + 12}"/>
  <path class="cx-igbt cx-plate" d="M${x - 11} ${yc - 12} V${yc + 12}"/>
  <path class="cx-igbt" d="M${x - 11} ${yc - 5} L${x} ${yc - 12} V${yc - 18}"/>
  <path class="cx-igbt" d="M${x - 11} ${yc + 5} L${x} ${yc + 12} V${yc + 18}"/>
  <path class="cx-igbt-fill" d="M${x - 1} ${yc + 11.2} L${x - 5.3} ${yc + 4.9} L${x - 8.5} ${yc + 9.9} Z"/>
  <text class="cx-lab" x="${x + 12}" y="${yc + 4}">S${id + 1}</text>
  </g>
  <path class="cx-gate" data-gate="${id}" d="M${x - 16} ${yc} h-14"/>
  <text class="cx-gatelab" x="${x - 34}" y="${yc + 3}" text-anchor="end">g${id + 1}</text>`;
}

// Antiparallel diode: cathode (bar) at the top, toward P, for every switch.
function diode(x, yc, id) {
  const hw = 8, hh = 10;
  return `<path class="cx-dio-fill" data-dio="${id}" d="M${x - hw} ${yc + hh} L${x + hw} ${yc + hh} L${x} ${yc - hh} Z"/>` +
  `<path class="cx-dio" data-dio="${id}" d="M${x - hw} ${yc - hh} H${x + hw}"/>`;
}

export function circuitHtml() {
  const legs = LEG.map((x, k) => {
    const dx = x + 46;
    const ycu = (HI[0] + HI[1]) / 2;
    const ycl = (LO[0] + LO[1]) / 2;
    return `
    <g data-leg="${k}">
    <path class="cx-wire" d="M${x} ${P_Y} V${HI[0] - 12}"/>
    <path class="cx-wire" d="M${x} ${HI[1] + 12} V${MID_Y}"/>
    <path class="cx-wire" d="M${x} ${MID_Y} V${LO[0] - 12}"/>
    <path class="cx-wire" d="M${x} ${LO[1] + 12} V${N_Y}"/>
    <path class="cx-wire" d="M${x} ${MID_Y} H${TAP[k]}"/>
    <path class="cx-wire" d="M${TAP[k]} ${MID_Y} V${COIL - 22}"/>
    ${switchBox(x, HI[0], HI[1], 2 * k)}
    ${switchBox(x, LO[0], LO[1], 2 * k + 1)}
    ${diode(dx, ycu, 2 * k)}
    ${diode(dx, ycl, 2 * k + 1)}
    <path class="cx-wire" d="M${x} ${HI[0] - 4} H${dx} V${ycu - 11}"/>
    <path class="cx-wire" d="M${x} ${HI[1] + 4} H${dx} V${ycu + 11}"/>
    <path class="cx-wire" d="M${x} ${LO[0] - 4} H${dx} V${ycl - 11}"/>
    <path class="cx-wire" d="M${x} ${LO[1] + 4} H${dx} V${ycl + 11}"/>
    <circle cx="${x}" cy="${MID_Y}" r="2.6" fill="var(--anatomy-text)"/>
    <circle cx="${TAP[k]}" cy="${MID_Y}" r="2.6" fill="var(--anatomy-text)"/>
    <text class="cx-labb" x="${TAP[k]}" y="${COIL - 40}" text-anchor="middle">${PHASE[k]}</text>
    <text class="cx-v" x="${TAP[k]}" y="${COIL - 26}" text-anchor="middle" data-phase-v="${k}"></text>
    </g>`;
  }).join("");

  const coils = TAP.map((x, k) => `
  <g data-load="${k}">
  <path class="cx-coil" d="M${x} ${COIL - 22} a7 5.5 0 0 1 0 11 a7 5.5 0 0 1 0 11 a7 5.5 0 0 1 0 11 a7 5.5 0 0 1 0 11"/>
  <path class="cx-wire" d="M${x} ${COIL + 22} V${STAR}"/>
  <text class="cx-v" x="${x}" y="${COIL + 52}" text-anchor="middle" data-load-i="${k}"></text>
  </g>`).join("");

  return `
  <section class="cx" id="circuit" aria-label="Circuit diagram">
  <div class="cx-head">
  <h2>Circuit</h2>
  <p>The topology <code>model.mjs</code> simulates, live at your settings: six ideal switches with
  antiparallel diodes, a stiff DC link, and a star load with a floating neutral. A lit switch is
  gated on, a lit diode carries current, and the numbers are the model's own pole voltages and
  phase currents. The phase wires leave the midpoints to the right of the bridge, and where they
  cross the N rail the crossing is drawn as a hop.</p>
  </div>
  <div class="cx-body">
  <svg class="cx-svg" viewBox="0 0 820 590" role="img" aria-label="Three-phase voltage-source inverter schematic">
  <text class="cx-labb" x="${X0 - 30}" y="${P_Y - 16}">V<tspan font-size="8" dy="2.5">dc</tspan></text>
  <text class="cx-v" x="${X0 - 30}" y="${P_Y - 1}" data-vdc></text>
  <path class="cx-rail" d="M${X0} ${P_Y} H${X1}"/>
  <path class="cx-rail" d="M${X0} ${N_Y} H${TAP[0] - 8} a8 8 0 0 1 16 0 H${TAP[1] - 8} a8 8 0 0 1 16 0 H${LEG[2]}"/>
  <path class="cx-wire" d="M${X0} ${P_Y} V${MID_Y - 36}"/>
  <path class="cx-src cx-src-long" d="M${X0 - 18} ${MID_Y - 36} H${X0 + 18}"/>
  <path class="cx-src cx-src-short" d="M${X0 - 9} ${MID_Y - 24} H${X0 + 9}"/>
  <path class="cx-src cx-src-long" d="M${X0 - 18} ${MID_Y - 10} H${X0 + 18}"/>
  <path class="cx-src cx-src-short" d="M${X0 - 9} ${MID_Y + 2} H${X0 + 9}"/>
  <path class="cx-src cx-src-long" d="M${X0 - 18} ${MID_Y + 16} H${X0 + 18}"/>
  <path class="cx-src cx-src-short" d="M${X0 - 9} ${MID_Y + 28} H${X0 + 9}"/>
  <path class="cx-wire" d="M${X0} ${MID_Y + 28} V${N_Y}"/>
  <text class="cx-lab" x="${X0 - 20}" y="${P_Y + 4}" text-anchor="end">P</text>
  <text class="cx-lab" x="${X0 - 20}" y="${N_Y + 4}" text-anchor="end">N</text>
  <text class="cx-labb" x="${X1 + 14}" y="${P_Y - 16}">i<tspan font-size="8" dy="2.5">dc</tspan></text>
  <text class="cx-v" x="${X1 + 14}" y="${P_Y - 1}" data-idc></text>
  ${legs}
  ${coils}
  <path class="cx-wire" d="M${TAP[0]} ${STAR} H${TAP[2]}"/>
  <circle cx="${TAP[1]}" cy="${STAR}" r="2.8" fill="var(--anatomy-text)"/>
  <text class="cx-lab" x="${TAP[1] + 12}" y="${STAR + 2}">n, floating</text>
  <text class="cx-caption" x="${X0}" y="${STAR + 34}">star point floats, so the three phase currents sum to zero</text>
  <text class="cx-caption" x="${X0}" y="${STAR + 50}">dead time 0 · ideal switches · stiff DC link · linear R + L · no losses</text>
  </svg>
  </div>
  </section>`;
}
