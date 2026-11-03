// scripts/tex.mjs - a LaTeX subset converted to MathML.
// Pure: no DOM, no dependencies, so build.mjs and the tests run the same code.
// Anything outside the subset throws with the macro named, so a typo fails the
// build instead of printing junk into the page.

const GREEK = {
  alpha: 'α', beta: 'β', gamma: 'γ', delta: 'δ', epsilon: 'ε', varepsilon: 'ϵ',
  zeta: 'ζ', eta: 'η', theta: 'θ', vartheta: 'ϑ', iota: 'ι', kappa: 'κ',
  lambda: 'λ', mu: 'μ', nu: 'ν', xi: 'ξ', pi: 'π', rho: 'ρ', sigma: 'σ',
  tau: 'τ', upsilon: 'υ', phi: 'φ', varphi: 'ϕ', chi: 'χ', psi: 'ψ', omega: 'ω',
  Gamma: 'Γ', Delta: 'Δ', Theta: 'Θ', Lambda: 'Λ', Xi: 'Ξ', Pi: 'Π',
  Sigma: 'Σ', Phi: 'Φ', Psi: 'Ψ', Omega: 'Ω',
};

const SYM = {
  cdot: '·', times: '×', pm: '±', mp: '∓', ast: '∗', circ: '∘',
  approx: '≈', equiv: '≡', le: '≤', leq: '≤', ge: '≥', geq: '≥', ne: '≠', neq: '≠',
  ll: '≪', gg: '≫', propto: '∝', sim: '∼', simeq: '≃', to: '→', rightarrow: '→',
  leftarrow: '←', Rightarrow: '⇒', Leftrightarrow: '⇔', infty: '∞', partial: '∂',
  nabla: '∇', sum: '∑', prod: '∏', int: '∫', angle: '∠', perp: '⊥', parallel: '∥',
  degree: '°', ldots: '…', cdots: '⋯', dots: '…', prime: '′', in: '∈',
  langle: '⟨', rangle: '⟩', therefore: '∴',
};

const FN = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'sinh', 'cosh', 'tanh',
  'arcsin', 'arccos', 'arctan', 'ln', 'log', 'exp', 'max', 'min', 'lim', 'sup',
  'inf', 'det', 'arg', 'sgn', 'Tr']);

const ACC = { vec: '→', bar: '¯', overline: '¯', hat: '^', tilde: '~', dot: '˙', ddot: '¨' };

const SP = { ',': '0.167em', ';': '0.278em', ':': '0.222em', '!': '-0.167em', ' ': '0.25em', quad: '1em', qquad: '2em' };

const LIT = new Set(['{', '}', '%', '_', '&', '#', '$', '|']);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const isAlpha = (c) => !!c && ((c >= 'a' && c <= 'z') || (c >= 'A' && c <= 'Z'));
const isDigit = (c) => !!c && c >= '0' && c <= '9';
const isSpace = (c) => c === ' ' || c === '\t' || c === '\n' || c === '\r';

export function texToMathML(src, opts = {}) {
  const body = render({ t: 'row', b: parse(src) });
  const display = opts.display !== false;
  return '<math xmlns="http://www.w3.org/1998/Math/MathML"' + (display ? ' display="block"' : '') +
    '><semantics>' + body +
    '<annotation encoding="application/x-tex">' + esc(src) + '</annotation></semantics></math>';
}

function parse(src) {
  let i = 0;
  const fail = (m) => { throw new Error('tex: ' + m + ' at char ' + i + ' of: ' + src); };

  function skip() { while (i < src.length && isSpace(src[i])) i++; }
  function atCmd(name) {
    if (!src.startsWith('\\' + name, i)) return false;
    return !isAlpha(src[i + 1 + name.length]);
  }
  function list(stop) {
    const out = [];
    for (;;) {
      skip();
      if (i >= src.length) break;
      if (stop && src[i] === stop) break;
      if (atCmd('right') || atCmd('end')) break;
      out.push(scripted());
    }
    return out;
  }
  function readName() {
    if (i >= src.length) fail('dangling backslash');
    if (isAlpha(src[i])) {
      let s = '';
      while (i < src.length && isAlpha(src[i])) s += src[i++];
      return s;
    }
    return src[i++];
  }
  function delim() {
    skip();
    let d = src[i++];
    if (d === '\\') { const dn = readName(); d = LIT.has(dn) ? dn : (SYM[dn] || dn); }
    return d === '.' ? null : d;
  }
  function rawGroup() {
    skip();
    if (src[i] !== '{') fail('expected {');
    let depth = 0;
    const start = i + 1;
    for (; i < src.length; i++) {
      const c = src[i];
      if (c === '\\') { i++; continue; }
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { const t = src.slice(start, i); i++; return t; } }
    }
    return fail('unclosed {');
  }
  function readArg() {
    skip();
    if (i >= src.length) fail('missing argument');
    if (src[i] === '{') { i++; const b = list('}'); if (src[i] !== '}') fail('expected }'); i++; return { t: 'row', b }; }
    return atom();
  }
  function readOpt() {
    skip();
    if (src[i] !== '[') return null;
    i++;
    const b = list(']');
    if (src[i] !== ']') fail('expected ]');
    i++;
    return { t: 'row', b };
  }
  function scripted() {
    let base = atom();
    let sub = null;
    let sup = null;
    for (;;) {
      skip();
      const c = src[i];
      if (c !== '^' && c !== '_') break;
      i++;
      const arg = readArg();
      if (c === '^') { if (sup) fail('double superscript'); sup = arg; }
      else { if (sub) fail('double subscript'); sub = arg; }
    }
    if (sub && sup) return { t: 'subsup', base, sub, sup };
    if (sub) return { t: 'sub', base, sub };
    if (sup) return { t: 'sup', base, sup };
    return base;
  }
  function env(name) {
    const open = '\\begin{' + name + '}';
    const close = '\\end{' + name + '}';
    let depth = 1;
    let j = i;
    while (j < src.length) {
      if (src.startsWith(close, j)) { depth--; if (!depth) break; j += close.length; continue; }
      if (src.startsWith(open, j)) { depth++; j += open.length; continue; }
      j++;
    }
    if (j >= src.length) fail('unclosed \\begin{' + name + '}');
    const inner = src.slice(i, j);
    i = j + close.length;
    return { t: 'env', env: name, s: inner };
  }
  function command(name) {
    if (name === 'frac' || name === 'dfrac' || name === 'tfrac') return { t: 'frac', a: readArg(), b: readArg() };
    if (name === 'sqrt') { const k = readOpt(); return { t: 'sqrt', a: readArg(), k };
    }
    if (name === 'text' || name === 'mathrm' || name === 'textrm' || name === 'operatorname' || name === 'mbox') {
      return { t: 'text', s: rawGroup() };
    }
    if (name === 'mathbf' || name === 'boldsymbol' || name === 'bm') return { t: 'bold', b: readArg() };
    if (ACC[name]) return { t: 'acc', k: name, a: readArg() };
    if (name === 'underline') return { t: 'under', a: readArg() };
    if (SP[name] != null) return { t: 'space', w: SP[name] };
    if (name === 'begin') return env(rawGroup());
    if (name === 'left') {
      const open = delim();
      const b = list('right');
      if (!atCmd('right')) fail('\\left without \\right');
      i += 6; // past \\right
      const close = delim();
      return { t: 'fenced', open, close, b };
    }
    if (name === 'right') fail('\\right without \\left');
    if (name === '\\') return { t: 'br' };
    if (LIT.has(name)) return { t: 'op', s: name };
    if (GREEK[name]) return { t: 'id', s: GREEK[name] };
    if (SYM[name]) return { t: 'sym', s: SYM[name] };
    if (FN.has(name)) return { t: 'fn', s: name };
    return fail('unknown macro \\' + name);
  }
  function atom() {
    skip();
    if (i >= src.length) fail('unexpected end of input');
    const c = src[i];
    if (c === '{') { i++; const b = list('}'); if (src[i] !== '}') fail('expected }'); i++; return { t: 'row', b }; }
    if (c === '\\') { i++; return command(readName()); }
    if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
      let s = '';
      while (i < src.length && (isDigit(src[i]) || src[i] === '.')) s += src[i++];
      return { t: 'num', s };
    }
    i++;
    if (isAlpha(c)) return { t: 'id', s: c };
    return { t: 'op', s: c };
  }
  return list(null);
}

function splitTop(s, sep) {
  const out = [];
  let cur = '';
  let depth = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === '\\') {
      if (depth === 0 && sep === '\\\\' && s.startsWith(sep, i)) { out.push(cur); cur = ''; i += 1; continue; }
      cur += c + (s[i + 1] || '');
      i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}') depth--;
    if (c === '&' && sep === '&' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return out;
}

function wrap(n) {
  if (n.t === 'row') return render(n);
  return '<mrow>' + render(n) + '</mrow>';
}

function render(n) {
  switch (n.t) {
    case 'row': return '<mrow>' + n.b.map(render).join('') + '</mrow>';
    case 'num': return '<mn>' + esc(n.s) + '</mn>';
    case 'id': return '<mi>' + esc(n.s) + '</mi>';
    case 'fn': return '<mi mathvariant="normal">' + esc(n.s) + '</mi>';
    case 'op': return '<mo>' + esc(n.s) + '</mo>';
    case 'sym': return '<mo>' + esc(n.s) + '</mo>';
    case 'text': return '<mtext>' + esc(n.s) + '</mtext>';
    case 'space': return '<mspace width="' + n.w + '"/>';
    case 'none': return '';
    case 'br': return '';
    case 'bold': return '<mstyle mathvariant="bold">' + render(n.b) + '</mstyle>';
    case 'frac': return '<mfrac>' + wrap(n.a) + wrap(n.b) + '</mfrac>';
    case 'sqrt': return n.k ? '<mroot>' + wrap(n.a) + wrap(n.k) + '</mroot>' : '<msqrt>' + wrap(n.a) + '</msqrt>';
    case 'sup': return '<msup>' + wrap(n.base) + wrap(n.sup) + '</msup>';
    case 'sub': return '<msub>' + wrap(n.base) + wrap(n.sub) + '</msub>';
    case 'subsup': return '<msubsup>' + wrap(n.base) + wrap(n.sub) + wrap(n.sup) + '</msubsup>';
    case 'acc': return '<mover accent="true">' + wrap(n.a) + '<mo>' + ACC[n.k] + '</mo></mover>';
    case 'under': return '<munder accentunder="true">' + wrap(n.a) + '<mo>_</mo></munder>';
    case 'fence': return '<mo fence="true" stretchy="true">' + esc(n.d) + '</mo>';
    case 'fenced':
      return '<mrow>' + (n.open ? '<mo fence="true" stretchy="true">' + esc(n.open) + '</mo>' : '') +
        '<mrow>' + n.b.map(render).join('') + '</mrow>' +
        (n.close ? '<mo fence="true" stretchy="true">' + esc(n.close) + '</mo>' : '') + '</mrow>';
    case 'env': return renderEnv(n);
  }
  throw new Error('tex: cannot render node ' + n.t);
}

function renderEnv(n) {
  const rows = splitTop(n.s, '\\\\').map((r) => splitTop(r, '&'));
  const cols = Math.max.apply(null, rows.map((r) => r.length));
  let out = '<mtable columnalign="right left" columnspacing="0.28em">';
  for (const r of rows) {
    out += '<mtr>';
    for (let c = 0; c < cols; c++) {
      out += '<mtd>' + (r[c] != null ? render({ t: 'row', b: parse(r[c]) }) : '') + '</mtd>';
    }
    out += '</mtr>';
  }
  return out + '</mtable>';
}
