# Three-phase voltage-source inverter — isometric explainer

A single, self-contained page: `inverter.html`. Open it in any modern browser; it needs no
server and no network.

```
inverter-explainer/
  inverter.html      the finished page (geometry, live script and model inlined)
  build.mjs          builds inverter.html — all SVG geometry lives here
  model.mjs          the electrical model (pure module, no DOM)
  analysis.mjs       derived quantities: power, space vector, Park, ripple, sweep
  kit/iso-kit.mjs    the isometric drawing kit the build imports
  scripts/           build-side tooling: inline-kit, capture, drive, lines
  shots/             verification screenshots
```

Rebuild with `node build.mjs`. Re-check the drawing with
`node scripts/lines.mjs inverter.html` (it prints `line ends: 0`).

## What the drawing shows

A bench instrument, not a block diagram:

- **DC input** — a two-stud terminal block with heavy cables entering through glands.
- **DC link** — two screw-terminal electrolytic capacitors joined by P and N busbars.
- **Power stage** — three open half-bridge modules. Each tray holds two substrates, and on
  each substrate an IGBT die (large) with its antiparallel diode die (small), copper straps
  and aluminium bond wires. The P, N and AC posts rise to the busbars and the phase bar.
- **Gate drive** — a driver board over the fins with six channels (gate IC, optocoupler,
  bootstrap capacitor, gate resistor, status LED) and ribbons running down to each module's
  gate connector.
- **Cooling** — a finned cold plate under the modules and an axial fan on its end face.
- **Output** — three studded terminals, three cables, and a star-connected three-phase load
  reactor with three wound limbs, a laminated core and a star bar.
- **Control** — a console with Vdc / m / f knobs, an OFF-PWM-STEP lever, a six-position
  vector switch and a live scope screen showing one phase voltage and current.

Current paths light up as dashed flows whose direction follows the sign of the mean current
in that branch; the DC rails, phase bars, phase cables and windings each have their own
overlay. Switch dies and gate LEDs glow with their 10 ms average duty.

## Controls

| Input | Action |
| --- | --- |
| Drag a knob | Vdc 200-750 V, m 0.05-1.00, f 5-100 Hz |
| Click the lever | OFF / PWM / STEP |
| Click the vector switch | step V1...V6 (also switches to STEP) |
| Keys | `1` `2` `3` modes, up/down Vdc/m, left/right frequency, `[` `]` vector |
| Drawer | The **Controls** tab on the right edge opens a docked drawer with the same sliders and buttons, plus load R and load L, which the 3D console has no knob for. `Esc` or a click outside closes it; under 640 px it becomes a bottom sheet. |

## The model

`model.mjs` is a simulation, and every number on the panel comes from it:

- Stiff DC link (no ripple), six ideal switches in three legs with complementary gates and
  **no dead time**, ideal antiparallel diodes, star load R = 2 ohm + L = 4 mH per phase by default; R (0.2-20 ohm) and L (0.1-50 mH) are settable while the page runs from the Controls drawer, and the meters follow.
- PWM mode: regular-sampled sine-triangle modulation at fsw = 4 kHz. The reference is sampled
  once per carrier period and the on-fraction is solved exactly, so the leg duty is
  (1 + m·sin θ)/2 with no sample-grid quantisation.
- STEP mode: a held switching vector (classic six-step vectors), giving the DC line voltages
  and phase currents directly.
- OFF mode: all gates blocked; the diodes freewheel and the load current decays.
- Measurements: the phase-voltage and phase-current fundamentals are taken by DFT over
  exactly one fundamental period of 5e-4 s window averages, so the switching ripple cancels.
  From those the panel shows V_LL = sqrt(3)·v1/sqrt(2), I_rms, P = 3·I_rms^2·R and power factor.

In the linear region v_LL = 0.6124 · m · Vdc; the model reproduces that to about 0.1 %
(e.g. m = 0.8, Vdc = 400 V gives 195.8 V computed against 196.0 V ideal).

**These are computed values from the stated ideal model, not measurements.** Nothing here has
been validated against hardware, and the component dimensions are illustrative, not a
datasheet.## Instrument panel

Below the figure, collapsible (collapsed by default under 640 px wide). It plots the same
`model.mjs` simulation the picture runs - nothing is a stored recording and nothing is
invented for the plot.

| Plot | Window | What it shows |
| --- | --- | --- |
| **Modulation** | 6 carrier periods | The 4 kHz carrier, the ideal reference (thin dashed) against the value the modulator sampled at the start of each carrier and held, the six gate signals S1-S6, and the pole voltage vAN against the DC midpoint, +/-Vdc/2. |
| **Output** | 1, 3 or 10 cycles, or 2 carrier periods | Phase voltages vA, vB, vC, the line-to-line vAB on its own lane and scale, and the phase currents, all as 0.5 ms window averages so the switching ripple is removed. |
| **Spectrum** | 4 whole cycles (fewer at low f) | Harmonic magnitudes of the instantaneous phase-A voltage and current, with the fundamental and the THD. |
| **Devices** | one fundamental period | Conduction share per switch, the antiparallel diode share on the same row, and the pulsating DC-link current with its mean. |
| **Space vector** | last fundamental period | The pole-voltage vector in the stationary alpha-beta frame, the hexagon of the six active vectors at radius 2/3·Vdc, the largest balanced sine that fits inside it, and the trail of the last cycle. |
| **Rotating frame** | 1 cycle | Park transform of voltage and current with the reference rotating at the fundamental, so the steady-state vector is DC and the ripple is switching. |
| **Sweep** | m = 0.2 … 1.2 (on demand) | Eleven independent steady states of the same model: V_LL against the ideal 0.6124·m·Vdc line and the THD, showing where the legs saturate past m = 1. |
| **Meters** | current settings | Phase rms voltage and current, P = 3·I_rms²·R, Q = √(S²−P²), S = 3·V_rms·I_rms, power factor, Vdc utilisation against the ideal linear-region value, phase-current ripple p-p, and the dead time actually in the model (0.00 us — the switches are ideal). |

Controls: **Pause / Resume** freezes the simulation (the plots stop with it); **time base**
changes only the slice of the existing buffers that is drawn, never the simulation; **Export
CSV** downloads the recorded rows; **Run sweep** evaluates the model at eleven modulation
indices and draws the Sweep figure (until then that figure only carries its instructions);
hovering or focusing a plot with the arrow keys gives a cursor with the exact sample; the
**overmodulation** badge appears when m > 1.

### How the numbers are obtained

- Modulation and device records are written once per integration step (6.25 us), so gate
  edges and the DC-link current pulses are the model's own states, not interpolations.
- Output traces are 5e-4 s window averages of the exact integrals, which cancels the
  switching ripple and leaves the fundamental.
- The spectrum is a **rectangular-window DFT over whole fundamental periods** of the
  instantaneous record. Whole cycles make neighbouring orders exactly orthogonal, so the
  fundamental's harmonics are exact; the non-integer number of switching periods inside the
  window is the measurement's real limitation, and it is why the plot is labelled that way.
  THD counts orders up to 0.45*fsw - above that the sidebands are the modulation, not
  distortion.
- Conduction percentages are accumulated over exactly one fundamental period and reset when
  the mode or frequency changes.

### Exported CSV

`#`-prefixed header rows repeat the parameters and state plainly that these are computed
values from the ideal model, not measurements. Three sections follow: `trace` (one row per
integration step: carrier phase, references, gate mask, three pole voltages and currents,
DC-link current), `out` (0.5 ms averages of the three voltages and currents) and `spectrum`
(order, frequency, magnitude).

## Theory section

Below the instrument panel the page carries a **Theory** section: the equations the figure runs on, one per block, with the number each other part of the page cites.

| Topic | Equations |
| --- | --- |
| Symbols and conventions | the m convention (phase fundamental = m Vdc/2, hexagon limit 2/sqrt3) |
| One leg is a switch | pole voltage, complementary gates, dead time = 0 |
| Reference and regular sampling | reference, duty, carrier average |
| The load and the neutral point | phase equation, star-point voltage, line voltage, impedance and phase angle |
| Space vectors and the linear limit | Clarke vector, six active vectors, inscribed circle, m_lim = 1.1547, V_LL = 0.6124 m Vdc |
| What the spectrum contains | sidebands, Bessel weights, THD cutoff, the DFT window |
| Six-step, for comparison | fundamental 2/pi Vdc, THD = 31 percent over the 6k +/- 1 orders |
| Currents, power and ripple | I_rms, P/Q/S, pf, peak-to-peak ripple |
| The rotating frame | Park transform and the dq equations with the cross-coupling terms |
| Devices and the DC link | DC-link current, conduction share, switch RMS current |
| Worked example at the defaults | each meter reconciled against its equation |
| What this model does not contain | the assumptions, stated as assumptions |

The equations are authored in LaTeX in `theory.mjs` and converted to **MathML at build time** by `scripts/tex.mjs` - no runtime JavaScript, no web fonts, no network. Each rendered equation keeps its LaTeX source in an annotation, so copying it out of the page gives back the original. A live box at the end repeats the panel meters at the current settings.

To add an equation: one entry in the SECTIONS array in `theory.mjs` with an id, the latex source and a one-line why. The id becomes the anchor other notes link to. Anything outside the supported subset fails the build with the macro named.

Two tests keep it honest: `node --test scripts/tex.test.mjs` covers the converter, and `node --test scripts/theory.test.mjs` checks that numbering is contiguous, that every cross-reference from the panel resolves to a real equation, and that the section still sits after the instrument panel in the built page.
