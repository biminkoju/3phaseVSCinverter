import { test } from 'node:test';
import assert from 'node:assert/strict';
import { texToMathML } from './tex.mjs';

const strip = (s) => s.replace(/<annotation[\s\S]*?<\/annotation>/, '');

test('fraction nests and keeps both arguments', () => {
  const m = texToMathML(String.raw`\frac{\sqrt{3}}{2\sqrt{2}}`);
  assert.match(m, /<mfrac><mrow><msqrt>/);
  assert.match(m, /<mn>2<\/mn><msqrt>/);
});

test('subscript and superscript on the same base become msubsup', () => {
  assert.match(texToMathML(String.raw`I_{rms}^2`), /<msubsup>/);
});

test('left/right wrap the whole group in one fence pair', () => {
  const m = strip(texToMathML(String.raw`\left(1 + m\sin\theta\right)`));
  assert.equal(m.match(/fence="true"/g).length, 2);
  assert.ok(m.indexOf('<mi>m</mi>') > m.indexOf('<mo fence'), 'content sits inside the fences');
});

test('aligned environments become one table with a row per line', () => {
  const m = texToMathML(String.raw`\begin{aligned} a &= 1 \\ b &= 2 \end{aligned}`);
  assert.equal(m.match(/<mtr>/g).length, 2);
});

test('text arguments keep their spaces and are not read as maths', () => {
  assert.match(texToMathML(String.raw`\text{real power}`), /<mtext>real power<\/mtext>/);
});

test('the LaTeX source survives in an annotation for copying', () => {
  assert.match(texToMathML(String.raw`a^2`), /<annotation encoding="application\/x-tex">a\^2<\/annotation>/);
});

test('an unknown macro fails loudly with its name', () => {
  assert.throws(() => texToMathML(String.raw`\foo{bar}`), /unknown macro/);
});

test('an unbalanced left fails instead of emitting a stray fence', () => {
  assert.throws(() => texToMathML(String.raw`\left( x`), /left without/);
});

test('markup in the source is escaped, never emitted raw', () => {
  const m = texToMathML(String.raw`\text{a < b & c}`);
  assert.match(m, /a &lt; b &amp; c/);
});
