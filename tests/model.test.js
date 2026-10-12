const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const MODEL_PATH = path.join(__dirname, '..', 'model.js');
const MODEL_SOURCE = fs.readFileSync(MODEL_PATH, 'utf8');

function loadModel(seed = {}) {
  const values = { ...seed };
  const writes = [];
  const context = vm.createContext({
    localStorage: {
      getItem(key) { return Object.hasOwn(values, key) ? values[key] : null; },
      setItem(key, value) { values[key] = value; writes.push([key, value]); },
    },
  });
  vm.runInContext(MODEL_SOURCE, context, { filename: MODEL_PATH });
  return {
    eval(expression) { return vm.runInContext(expression, context); },
    values,
    writes,
  };
}

test('R600 timelapse adds one idle stream per video source', () => {
  const model = loadModel();
  const result = model.eval(`(() => {
    const i = CAMERAS.findIndex(c => c.model === 'R600');
    state.locations[0].cams[i].qty = 1;
    const before = totals(0).avgMbps;
    state.locations[0].cams[i].toggles.timelapse = true;
    return totals(0).avgMbps - before;
  })()`);
  assert.ok(Math.abs(result - 4.8) < 1e-9);
});

test('R600 AI overhead scales across all four video sources', () => {
  const model = loadModel();
  const overhead = model.eval(`(() => {
    const i = CAMERAS.findIndex(c => c.model === 'R600');
    return calcAIOverhead(i, 0);
  })()`);
  assert.equal(overhead, 12);
});

test('incrementQty persists button-driven quantity changes', () => {
  const model = loadModel();
  model.eval(`incrementQty(0, 2)`);
  assert.equal(model.eval('state.locations[0].cams[0].qty'), 2);
  assert.equal(JSON.parse(model.values['bw-project-v3']).locations[0].cams.DR40.qty, 2);
});

test('site features persist independently while camera settings inherit them', () => {
  const model = loadModel();
  model.eval(`setSiteFeature('lpr', true)`);
  assert.equal(model.eval(`featureFor(0, 'lpr', 0)`), true);
  assert.equal(model.eval(`state.locations[0].cams[0].toggles.lpr`), null);
  const saved = JSON.parse(model.values['bw-project-v3']);
  assert.equal(saved.locations[0].features.lpr, true);
});

test('clearing a camera override restores its site feature settings', () => {
  const model = loadModel();
  model.eval(`setSiteFeature('lpr', true); toggle(0, 'lpr'); clearOverride(0)`);
  assert.equal(model.eval(`state.locations[0].cams[0].toggles.lpr`), null);
  assert.equal(model.eval(`featureFor(0, 'lpr', 0)`), true);
});

test('v2 site-wide features migrate to v3 site defaults', () => {
  const probe = loadModel();
  const cameraModels = probe.eval('CAMERAS.map(c => c.model)');
  const cams = Object.fromEntries(cameraModels.map(model => [model, {
    qty: model === 'R410' ? 2 : 0,
    profile: null,
    archive: null,
    toggles: { timelapse: false, faceRecog: false, lpr: true, ppe: false,
      peopleocc: false, crosscount: false, aisearch: false },
  }]));
  const legacy = JSON.stringify({
    v: 2,
    title: 'Migration test',
    active: 0,
    locations: [{ name: 'HQ', profile: 'Moderate', archive: true, cams }],
  });
  const model = loadModel({ 'bw-project-v2': legacy });
  assert.equal(model.eval('load()'), true);
  assert.equal(model.eval(`state.locations[0].features.lpr`), true);
  assert.equal(model.eval(`state.locations[0].cams.every(c => c.toggles.lpr === null)`), true);
  assert.ok(model.values['bw-project-v3']);
});

test('quantities are capped to a safe integer range', () => {
  const model = loadModel();
  model.eval(`setQty(0, '999999999999999999999')`);
  assert.equal(model.eval('state.locations[0].cams[0].qty'), 100000);
});

test('single-source moderate archived sizing keeps the validated baseline', () => {
  const model = loadModel();
  const result = model.eval(`(() => {
    const i = CAMERAS.findIndex(c => c.model === 'R410');
    state.locations[0].cams[i].qty = 1;
    return totals(0);
  })()`);
  assert.equal(result.avgMbps, 1.287);
  assert.ok(Math.abs(result.peakMbps - 2.80212) < 1e-9);
  assert.equal(result.ispMbps, 50);
});

test('project roll-up keeps location circuits separate', () => {
  const model = loadModel();
  const result = model.eval(`(() => {
    state.locations[0].cams[0].qty = 1;
    addLocation('Branch');
    state.locations[1].cams[0].qty = 1;
    return grandTotals();
  })()`);
  assert.equal(result.locations, 2);
  assert.equal(result.circuits, 2);
  assert.equal(result.ispTotalMbps, 100);
});

test('v3 save and load preserve site feature defaults and camera exceptions', () => {
  const first = loadModel();
  first.eval(`setSiteFeature('lpr', true); toggle(0, 'lpr'); setQty(0, 3)`);
  const second = loadModel({ 'bw-project-v3': first.values['bw-project-v3'] });
  assert.equal(second.eval('load()'), true);
  assert.equal(second.eval(`state.locations[0].features.lpr`), true);
  assert.equal(second.eval(`featureFor(0, 'lpr', 0)`), false);
  assert.equal(second.eval(`featureFor(1, 'lpr', 0)`), true);
  assert.equal(second.eval(`state.locations[0].cams[0].qty`), 3);
});
