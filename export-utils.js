(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.BandwidthExport = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function csvCell(value) {
    const text = String(value ?? '');
    return /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  }

  function encodeCSV(rows) {
    return rows.map(row => row.map(value =>
      `"${csvCell(value).replace(/"/g, '""')}"`
    ).join(',')).join('\n');
  }

  return { csvCell, encodeCSV };
});
