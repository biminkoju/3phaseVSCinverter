// Theory section: the maths behind the figure, as LaTeX source converted to
// MathML at build time by scripts/tex.mjs. No runtime, no fonts, no network.
// Every equation has an id; the panel notes link to these ids, and the tests
// check that every link resolves.

import { texToMathML } from "./scripts/tex.mjs";

export const THEORY_CSS = `
.th{margin:28px auto 0;max-width:1040px;color:var(--anatomy-text);font-family:var(--anatomy-mono)}
.th-head{padding:10px 14px;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid)}
.th-head h2{margin:0;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--anatomy-strong);font-weight:400}
.th-head p{margin:6px 0 0;font-size:12px;line-height:1.6;color:var(--anatomy-muted)}
.th-body{padding:18px;background:var(--anatomy-card);box-shadow:0 0 0 1px var(--anatomy-mid);margin-top:-1px}
.th-nav{display:flex;flex-wrap:wrap;gap:4px 14px;margin:0 0 18px;padding:0 0 12px;border-bottom:1px solid var(--anatomy-faint)}
.th-nav a{font-size:11px;letter-spacing:.04em;color:var(--anatomy-muted);text-decoration:none;border-bottom:1px solid transparent}
.th-nav a:hover,.th-nav a:focus-visible{color:var(--anatomy-hi);border-bottom-color:var(--anatomy-hi);outline:none}
.th-sec{margin:0 0 26px;scroll-margin-top:16px}
.th-sec:last-child{margin-bottom:0}
.th-sec h3{margin:0 0 10px;font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--anatomy-strong);font-weight:400}
.th-sec p{margin:0 0 10px;font-size:12.5px;line-height:1.7;color:var(--anatomy-text)}
.th-sec p b{color:var(--anatomy-strong);font-weight:400}
.th-sec p code,.th-sec li code{font-size:12px;color:var(--anatomy-hi)}
.th-eq{display:grid;grid-template-columns:1fr auto;align-items:center;gap:0 12px;margin:0 0 12px;padding:10px 12px;background:var(--anatomy-paper);box-shadow:inset 0 0 0 1px var(--anatomy-faint);scroll-margin-top:16px}
.th-eq math{font-size:1.02em;overflow-x:auto;overflow-y:hidden}
.th-eq .th-n{font-size:11px;color:var(--anatomy-muted);font-variant-numeric:tabular-nums;white-space:nowrap}
.th-eq:target{box-shadow:inset 0 0 0 1px var(--anatomy-hi)}
.th-why{grid-column:1/3;margin:8px 0 0;font-size:11.5px;line-height:1.6;color:var(--anatomy-muted)}
.th-cite{font-size:11px;color:var(--anatomy-muted);margin:-4px 0 12px}
.th-cite a{color:var(--anatomy-muted);text-decoration:none;border-bottom:1px dotted var(--anatomy-mid)}
.th-cite a:hover{color:var(--anatomy-hi);border-bottom-color:var(--anatomy-hi)}
.th-sym{width:100%;border-collapse:collapse;margin:0 0 12px;font-size:12px}
.th-sym th,.th-sym td{text-align:left;padding:5px 10px 5px 0;border-bottom:1px solid var(--anatomy-faint);vertical-align:top}
.th-sym th{font-weight:400;font-size:10.5px;letter-spacing:.09em;text-transform:uppercase;color:var(--anatomy-muted)}
.th-sym td:first-child{white-space:nowrap;color:var(--anatomy-strong)}
.th-sym math{font-size:1em}
.th-warn{padding:10px 12px;background:var(--anatomy-paper);box-shadow:inset 0 0 0 1px var(--anatomy-lo);font-size:12px;line-height:1.65;color:var(--anatomy-text);margin:0 0 12px}
.th-warn b{color:var(--anatomy-strong);font-weight:400}
.th-live{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:10px 0 0}
.th-live .ip-meter b{font-size:17px}
@media (max-width:680px){
  .th-body{padding:12px}
  .th-eq{padding:8px 9px}
  .th-eq math{font-size:.92em}
}
`;

// Eq: an equation worth numbering. `why` is the one line that says where it
// comes from; without it the equation is decoration.
const SECTIONS = [
  {
    id: "symbols",
    title: "Symbols and conventions",
    html: `<p>One convention runs through everything below, and it is the one the model uses:
      <b>m</b> is normalised so that the ideal phase-voltage fundamental is <b>m·Vdc/2</b>.
      Half the literature writes <b>m = 2/√3</b> at the hexagon limit; here the limit is
      <b>m = 2/√3 ≈ 1.1547</b> and the panel flags anything above m = 1 as overmodulation.</p>`,
    eqs: [],
  },
  {
    id: "leg",
    title: "One leg is a switch",
    html: `<p>Each leg connects its phase to either the P or the N rail. With <b>s<sub>a</sub> ∈ {0,1}</b>
      the upper device state, the pole voltage about the DC midpoint is a two-valued function, and
      the gates are complementary so the leg is never open — the ideal model states this
      assumption rather than hiding it.</p>`,
    eqs: [
      { id: "pole", latex: String.raw`v_{aN} = \left(s_a - \tfrac{1}{2}\right) V_{dc}`,
        why: "s_a = 1 puts the pole at +Vdc/2, s_a = 0 at −Vdc/2." },
      { id: "complement", latex: String.raw`s_{a\,lower} = 1 - s_a, \qquad t_{dead} = 0`,
        why: "Complementary gates; the dead time is zero in this model, shown as 0.00 µs on the panel." },
    ],
  },
  {
    id: "reference",
    title: "Reference and regular sampling",
    html: `<p>The modulator compares a three-phase reference with a triangular carrier at
      <b>f<sub>sw</sub> = 4 kHz</b>. The model uses <b>regular sampling</b>: the reference is read
      once at the start of each carrier period and held, so the duty is exact for that period and
      there is no sample-grid quantisation error.</p>`,
    eqs: [
      { id: "ref", latex: String.raw`v_a^{*}(t) = \frac{m V_{dc}}{2}\sin\theta, \qquad \theta = \omega t = 2\pi f t`,
        why: "The reference the panel draws thin and dashed." },
      { id: "duty", latex: String.raw`d_a(k) = \frac{1}{2}\left(1 + m\sin\theta_k\right), \qquad \theta_k = \omega t_k`,
        why: "Solving carrier = reference exactly gives the on-fraction held for carrier period k." },
      { id: "average", latex: String.raw`\langle v_{aN}\rangle = d_a(k)\, V_{dc} - \frac{V_{dc}}{2} = \frac{m V_{dc}}{2}\sin\theta_k`,
        why: "Averaging the two-valued pole voltage over one carrier removes the switching, not the fundamental." },
    ],
  },
  {
    id: "load",
    title: "The load, and the neutral point",
    html: `<p>The load is star-connected, <b>R = 2 Ω + L = 4 mH</b> per phase, with no neutral wire.
      The star point therefore floats, and its voltage is whatever makes the three currents sum to
      zero. That is why the line-to-line voltages are the clean ones: the neutral term cancels.</p>`,
    eqs: [
      { id: "phase", latex: String.raw`v_{aN} - v_{nN} = R i_a + L\frac{d i_a}{dt}`,
        why: "Kirchhoff per phase, with v_nN the star-point voltage about the DC midpoint." },
      { id: "neutral", latex: String.raw`v_{nN} = \frac{1}{3}\left(v_{aN} + v_{bN} + v_{cN}\right)`,
        why: "Adding the three phase equations with i_a + i_b + i_c = 0 leaves this identity." },
      { id: "line", latex: String.raw`v_{ab} = v_{aN} - v_{bN} = R(i_a - i_b) + L\frac{d(i_a - i_b)}{dt}`,
        why: "The neutral term is absent, so v_ab is a direct function of the switching state." },
      { id: "impedance", latex: String.raw`\mathbf{Z} = R + j\omega L, \qquad \varphi = \arctan\frac{\omega L}{R}`,
        why: "At f = 50 Hz, ωL = 1.257 Ω against R = 2 Ω, so φ = 32.1° and pf = cos φ = 0.847." },
    ],
  },
  {
    id: "space-vector",
    title: "Space vectors and the linear limit",
    html: `<p>The six switch states that connect every phase to a rail give six active vectors plus two
      zero vectors. Their tips form a hexagon, and the largest circle inside it is the largest
      balanced sine the inverter can produce without distortion.</p>`,
    eqs: [
      { id: "sv", latex: String.raw`\vec{v} = \frac{2}{3}\left(v_{aN} + a\,v_{bN} + a^2 v_{cN}\right), \qquad a = e^{j 2\pi/3}`,
        why: "The amplitude-invariant Clarke transform the Space vector plot draws." },
      { id: "active", latex: String.raw`\vec{v}_k = \frac{2}{3}V_{dc}\, e^{j(k-1)\pi/3}, \qquad k = 1\ldots 6`,
        why: "Six vectors on the hexagon, radius 2/3·Vdc." },
      { id: "circle", latex: String.raw`|\vec{v}|_{max} = \frac{2}{3}V_{dc}\cos 30^{\circ} = \frac{V_{dc}}{\sqrt{3}}`,
        why: "The inscribed circle: the radius where the reference stops touching the hexagon sides." },
      { id: "linear-limit", latex: String.raw`\frac{m_{lim} V_{dc}}{2} = \frac{V_{dc}}{\sqrt{3}} \;\Rightarrow\; m_{lim} = \frac{2}{\sqrt{3}} \approx 1.1547`,
        why: "Beyond this the legs saturate; the panel's sweep shows V_LL falling below the dashed ideal there." },
      { id: "vll", latex: String.raw`V_{LL} = \frac{\sqrt{3}}{2\sqrt{2}}\, m\, V_{dc} \approx 0.6124\, m\, V_{dc}`,
        why: "Line-to-line rms of the fundamental: √3 × (m Vdc/2)/√2. At m = 0.8, Vdc = 400 V this is 196.0 V." },
    ],
  },
  {
    id: "spectrum",
    title: "What the spectrum contains",
    html: `<p>Regularly sampled PWM puts energy at the carrier and its sidebands, not at harmonics of
      the output. The fundamental is exact; everything else the panel's Spectrum plot shows is either
      a sideband or a genuine distortion product, and the THD it reports says which.</p>`,
    eqs: [
      { id: "sidebands", latex: String.raw`f = k f_{sw} \pm n f, \qquad k = 1, 2, \ldots,\; n = 0, 1, 2, \ldots`,
        why: "The sidebands sit around multiples of the carrier, spaced by the output frequency." },
      { id: "bessel", latex: String.raw`\hat{v}_{k,n} \propto J_n\!\left(\frac{n\pi m}{2}\right)`,
        why: "Bessel weights: the sideband amplitude is set by m, which is why the carrier stays put as m changes." },
      { id: "thd", latex: String.raw`\mathrm{THD} = \frac{\sqrt{\sum_{h \ge 2} V_h^2}}{V_1}, \qquad h f < 0.45 f_{sw}`,
        why: "Orders above 0.45·fsw are counted as modulation, not distortion; that cutoff is stated on the plot." },
      { id: "dft", latex: String.raw`V_h = \frac{2}{T}\left|\int_{0}^{T} v_a(t)\, e^{-j h \omega t}\, dt\right|, \qquad T = \frac{1}{f}`,
        why: "A rectangular window over whole fundamental periods, so neighbouring orders are exactly orthogonal." },
    ],
  },
  {
    id: "six-step",
    title: "Six-step, for comparison",
    html: `<p>Holding each active vector for a sixth of a cycle gives the largest fundamental a
      voltage-source inverter can make, at the cost of a staircase waveform and heavy low-order
      harmonics. The STEP mode and the vector switch drive exactly this.</p>`,
    eqs: [
      { id: "six-fund", latex: String.raw`\hat{v}_{1} = \frac{2}{\pi}V_{dc}, \qquad V_{LL,1} = \frac{\sqrt{3}}{\sqrt{2}}\cdot\frac{2}{\pi}V_{dc} \approx 0.780\, V_{dc}`,
        why: "The classic six-step fundamental, about 10 % above the linear PWM limit at the same Vdc." },
      { id: "six-thd", latex: String.raw`\mathrm{THD}_{6} = \sqrt{\frac{\pi^2}{9} - 1} \approx 0.311`,
        why: "Only 6k ± 1 orders survive; the square-wave figure √(π²/8 − 1) = 48.3 % is the single-phase case and does not apply here." },
    ],
  },
  {
    id: "power",
    title: "Currents, power and ripple",
    html: `<p>The panel's meters are these four lines evaluated at your settings, plus the
      peak-to-peak ripple that the window averages deliberately hide.</p>`,
    eqs: [
      { id: "rms", latex: String.raw`I_{rms} = \frac{V_{rms}}{|\mathbf{Z}|} = \frac{m V_{dc}/(2\sqrt{2})}{\sqrt{R^2 + (\omega L)^2}}`,
        why: "At the defaults this gives 47.8 A against the panel's 47.8 A." },
      { id: "power-eq", latex: String.raw`P = 3 I_{rms}^2 R, \qquad Q = 3 I_{rms}^2 \omega L, \qquad S = 3 V_{rms} I_{rms}`,
        why: "13.73 kW, 8.64 kvar, 16.22 kVA at the defaults; P and Q add in quadrature to S." },
      { id: "pf", latex: String.raw`\mathrm{pf} = \frac{P}{S} = \cos\varphi`,
        why: "0.847 here, and identical for a linear load in a balanced three-phase system." },
      { id: "ripple", latex: String.raw`\Delta i_{pp} \approx \frac{V_{dc}}{L f_{sw}}\, d(1-d)`,
        why: "Worst case at d = 0.5 is 400/(0.004·4000) = 25 A peak-to-peak; at the defaults the meters report 5.47 A because each phase sits nearer d = 0.2–0.8 than 0.5." },
    ],
  },
  {
    id: "dq",
    title: "The rotating frame",
    html: `<p>Park-transforming into a frame that turns with the fundamental makes the steady-state
      vector DC. The cross-coupling terms are the price: the d and q axes see each other's current.</p>`,
    eqs: [
      { id: "park", latex: String.raw`\begin{aligned} v_d &= R i_d + L\frac{d i_d}{dt} - \omega L i_q \\ v_q &= R i_q + L\frac{d i_q}{dt} + \omega L i_d \end{aligned}`,
        why: "The same phase equation, rotated; ωL i_q and ωL i_d are the cross-coupling." },
      { id: "park-def", latex: String.raw`\begin{aligned} v_d &= \tfrac{2}{3}\left(v_a\cos\theta + v_b\cos(\theta - \tfrac{2\pi}{3}) + v_c\cos(\theta + \tfrac{2\pi}{3})\right) \\ v_q &= -\tfrac{2}{3}\left(v_a\sin\theta + v_b\sin(\theta - \tfrac{2\pi}{3}) + v_c\sin(\theta + \tfrac{2\pi}{3})\right) \end{aligned}`,
        why: "Amplitude-invariant Park transform, aligned to the fundamental the panel tracks." },
    ],
  },
  {
    id: "devices",
    title: "Devices and the DC link",
    html: `<p>Every number in the Devices plot comes from these two identities over the model's own
      states, not from a lookup table.</p>`,
    eqs: [
      { id: "idc", latex: String.raw`i_{dc} = s_a i_a + s_b i_b + s_c i_c`,
        why: "The DC-link current is the sum of the phase currents the upper devices are carrying; it pulses at 6f." },
      { id: "conduction", latex: String.raw`D_{S} = \frac{1}{T}\int_{0}^{T} s\, dt, \qquad D_{D} = \frac{1}{T}\int_{0}^{T} \bar{s}\,|i| > 0\, dt`,
        why: "Conduction share per device over one fundamental period; the diode share is non-zero even at high pf." },
      { id: "switch-rms", latex: String.raw`I_{S,rms} = I_{rms}\sqrt{D_{S}}`,
        why: "The RMS current a device has to carry, which is what sizing actually needs." },
    ],
  },
  {
    id: "worked",
    title: "Worked example at the defaults",
    html: `<p>m = 0.80, V<sub>dc</sub> = 400 V, f = 50 Hz, R = 2 Ω, L = 4 mH. Each line is the
      equation above followed by the panel's own number.</p>`,
    eqs: [
      { id: "w-vll", latex: String.raw`V_{LL} = 0.6124 \times 0.80 \times 400 = 196.0\ \mathrm{V} \;\; (\text{computed } 195.8\ \mathrm{V})`,
        why: "The 0.1 % gap is the switching and the finite integration step, not a modelling error." },
      { id: "w-vph", latex: String.raw`V_{ph} = \frac{196.0}{\sqrt{3}} = 113.1\ \mathrm{V} \;\; (\text{panel } 113.0\ \mathrm{V})`,
        why: "Phase rms, the first meter cell." },
      { id: "w-i", latex: String.raw`I_{rms} = \frac{113.0}{\sqrt{2^2 + 1.2566^2}} = 47.8\ \mathrm{A}`,
        why: "Exactly the panel's current meter." },
      { id: "w-p", latex: String.raw`P = 3 \times 47.8^2 \times 2 = 13.71\ \mathrm{kW} \;\; (\text{panel } 13.73\ \mathrm{kW})`,
        why: "The two-hundredths agree to rounding in I_rms." },
    ],
  },
  {
    id: "limits",
    title: "What this model does not contain",
    html: `<p>These are the equations of an <b>ideal</b> inverter. The page states the gaps rather
      than pretending they are small, because an engineer sizing hardware needs to know which way each
      one moves the answer.</p>
      <div class="th-warn">No dead time (0.00 µs shown), no switch on-state drop, no switching loss,
      no reverse recovery, a stiff DC link with no ripple, a linear L with no saturation, no iron or
      copper loss, no thermal model, and illustrative component dimensions. <b>Computed values, not
      measurements</b> — nothing here has been validated against hardware.</div>`,
    eqs: [],
  },
];

let NUMBER = 0;

export function theoryHtml() {
  NUMBER = 0;
  const nav = SECTIONS.map((s) => `<a href="#th-${s.id}">${s.title}</a>`).join("");
  const body = SECTIONS.map((s) => {
    const eqs = s.eqs.map((e) => {
      NUMBER++;
      return `<div class="th-eq" id="eq-${e.id}">${texToMathML(e.latex)}<span class="th-n">(${NUMBER})</span>` +
        (e.why ? `<p class="th-why">${e.why}</p>` : "") + `</div>`;
    }).join("");
    return `<section class="th-sec" id="th-${s.id}"><h3>${s.title}</h3>${s.html}${eqs}</section>`;
  }).join("");
  return `
<section class="th" id="theory" aria-label="Theory">
  <div class="th-head">
    <h2>Theory</h2>
    <p>The equations this page runs on. Everything here is the ideal model in <code>model.mjs</code>;
    where a number is quoted it is the model's own output at the defaults, not a textbook value.</p>
  </div>
  <div class="th-body">
    <nav class="th-nav" aria-label="Theory sections">${nav}</nav>
    ${body}
    <section class="th-sec" id="th-live">
      <h3>At your current settings</h3>
      <p>The same meters as the instrument panel, computed live from the model you are driving above.
      Change a knob and these follow; each value is the equation it came from, evaluated now.</p>
      <div class="th-live" data-meters></div>
    </section>
  </div>
</section>`;
}

export function theoryIds() {
  return SECTIONS.flatMap((s) => s.eqs.map((e) => `eq-${e.id}`));
}
