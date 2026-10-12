const test = require('node:test');
const assert = require('node:assert/strict');

const { csvCell, encodeCSV } = require('../export-utils.js');

test('csvCell neutralizes spreadsheet formulas from user-entered labels', () => {
  assert.equal(csvCell('=HYPERLINK("https://example.test")'), "'=HYPERLINK(\"https://example.test\")");
  assert.equal(csvCell('+1+1'), "'+1+1");
  assert.equal(csvCell('-2+3'), "'-2+3");
  assert.equal(csvCell('@SUM(A1:A2)'), "'@SUM(A1:A2)");
  assert.equal(csvCell('\t=2+2'), "'\t=2+2");
  assert.equal(csvCell('  @SUM(A1:A2)'), "'  @SUM(A1:A2)");
  assert.equal(csvCell('Normal location'), 'Normal location');
});

test('encodeCSV quotes every cell and escapes embedded quotes', () => {
  assert.equal(
    encodeCSV([['Project', '=2+2'], ['Quoted', 'A "name"']]),
    '"Project","\'=2+2"\n"Quoted","A ""name"""',
  );
});
