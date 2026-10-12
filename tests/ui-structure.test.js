const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

test('page loads focused CSS, export, model, and UI assets', () => {
  assert.match(html, /<link rel="stylesheet" href="app\.css">/);
  assert.match(html, /<script src="export-utils\.js"><\/script>/);
  assert.match(html, /<script src="model\.js"><\/script>/);
  assert.match(html, /<script src="ui\.js"><\/script>/);
  assert.doesNotMatch(html, /<style>/);
  assert.doesNotMatch(html, /<script>\s/);
});

test('calculated results are announced to assistive technology', () => {
  assert.match(html, /id="result"[^>]*aria-live="polite"[^>]*aria-atomic="true"/);
  assert.match(html, /id="theme"[^>]*aria-pressed="false"/);
});

test('UI routes persistent actions through model mutations', () => {
  const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
  assert.match(ui, /incrementQty\(i, d\)/);
  assert.match(ui, /setSiteFeature\(k,/);
  assert.match(ui, /setAttribute\('aria-pressed'/);
  assert.match(ui, /aria-controls="drawer\$\{i\}"/);
});

test('CSV export uses the hardened shared encoder', () => {
  const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
  assert.match(ui, /BandwidthExport\.encodeCSV\(rows\)/);
  assert.doesNotMatch(ui, /rows\.map\(r => r\.map/);
});

test('camera search escapes user-controlled empty-state text', () => {
  const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
  assert.match(ui, /No models match “\$\{esc\(filter\)\}”/);
});

test('editorial direction uses a semantic application shell', () => {
  assert.match(html, /<a class="skip-link" href="#main-content">/);
  assert.match(html, /<header class="appbar">/);
  assert.match(html, /<main class="shell" id="main-content">/);
  assert.match(html, /class="card[^\"]*camera-card/);
  assert.match(html, /class="card[^\"]*assumptions-card/);
  assert.match(html, /class="technical-details"/);
});

test('editorial direction makes the recommendation the visual anchor', () => {
  const css = fs.readFileSync(path.join(root, 'app.css'), 'utf8');
  const ui = fs.readFileSync(path.join(root, 'ui.js'), 'utf8');
  assert.match(css, /--result-bg:\s*#173f3c/);
  assert.match(css, /\.card--result\s*\{[^}]*background:\s*var\(--result-bg\)/s);
  assert.match(css, /\.assumptions-grid\s*\{/);
  assert.match(ui, /class="result-eyebrow">Recommended upload/);
  assert.match(ui, />Print customer estimate</);
});
