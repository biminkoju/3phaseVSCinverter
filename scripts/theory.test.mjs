import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { theoryHtml, theoryIds } from '../theory.mjs';

const html = theoryHtml();

test('ids are unique and numbered contiguously', () => {
  const ids = theoryIds();
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 33);
  const n = html.split('<span class="th-n">').length - 1;
  assert.equal(n, ids.length);
});

test('every math element carries its LaTeX source', () => {
  const m = html.split('<math ').length - 1;
  const a = html.split('application/x-tex').length - 1;
  assert.ok(m > 20);
  assert.equal(m, a);
});

test('panel cross-references resolve to real equations', () => {
  const ids = new Set(theoryIds());
  const panel = readFileSync(new URL('../panel.mjs', import.meta.url), 'utf8');
  const links = panel.split("href='#").slice(1).map((s) => s.slice(0, s.indexOf("'")));
  assert.ok(links.length >= 5);
  for (const id of links) assert.ok(ids.has(id), id);
});

test('theory follows the instrument panel in the built page', () => {
  const page = readFileSync(new URL('../inverter.html', import.meta.url), 'utf8');
  const p = page.indexOf('id="instrument"');
  const t = page.indexOf('id="theory"');
  assert.ok(p > 0 && t > p);
});
