// Tes kecil untuk penggabungan file di js/pages/raw.js. Jalankan: node tools/test-raw.js
const vm = require('vm'), fs = require('fs'), assert = require('assert');
const ctx = { PAGES: {}, console }; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + '/../js/pages/raw.js', 'utf8'), ctx);
const d = new Date(2026, 0, 5);
const a = { client: '100', head: ['Plant', 'Qty'], rows: [['W101', 1], ['W101', 1], ['W102', 2]] };            // baris kembar dalam satu file tetap
const b = { client: '100', head: ['Qty', 'Plant', 'Extra'], rows: [[2, 'W102', 'x'], [3, 'W101', 'y']] };     // urutan kolom beda + kolom baru;
const c = ctx.PAGES.raw_compile([a, b]);
assert.strictEqual(c.head.join(","), "Client,Plant,Qty,Extra");
assert.strictEqual(c.rows.length, 5);
const same = ctx.PAGES.raw_compile([{ client: '100', head: ['P', 'D'], rows: [['W1', d]] }, { client: '100', head: ['P', 'D'], rows: [['W1', new Date(+d)]] }]);
assert.strictEqual(same.rows.length, 1); // tumpang tindih antar file dibuang
console.log('ok');
