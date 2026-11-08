// Bikin data DUMMY terenkripsi. Jalankan: node tools/init-data.js
// GANTI password di bawah sebelum dipakai sungguhan.
const fs = require('fs'), path = require('path');
const Vault = require('../js/vault.js');
const USERS = [
  { name: 'owner',  password: 'Owner-Dummy-Ganti-Saya-01', role: 'Owner' },
  { name: 'viewer', password: 'Viewer-Dummy-Ganti-Saya-01', role: 'Viewer' },
];
const DATA = {
  materials: [
    { kimap: 'D0000001', desc: 'GASKET SPIRAL WOUND 4IN 150#', plant: 'W802', lapangan: 'Jambi', soh: 12, min: 4, max: 20, uom: 'EA' },
    { kimap: 'D0000002', desc: 'BEARING BALL 6205 2RS', plant: 'W803', lapangan: 'Lirik', soh: 3, min: 5, max: 15, uom: 'EA' },
    { kimap: 'D0000003', desc: 'SARUNG TANGAN KATUN', plant: 'W101', lapangan: 'Rantau', soh: 140, min: 50, max: 300, uom: 'PSG' },
    { kimap: 'D0000004', desc: 'PACKING GLAND GRAPHITE 10MM', plant: 'W102', lapangan: 'Pangkalan Susu', soh: 0, min: 2, max: 10, uom: 'ROL' },
  ],
  synonyms: [['gasket', 'packing', 'seal'], ['bearing', 'laker', 'bantalan']],
};
(async () => {
  const dataKey = await Vault.newDataKey();
  const keys = {};
  for (const u of USERS) keys[u.name] = await Vault.wrapForUser(dataKey, u.password, u.role);
  const k = await require('crypto').webcrypto.subtle.exportKey('raw', dataKey);
  const rk = await require('crypto').webcrypto.subtle.importKey('raw', k, 'AES-GCM', false, ['encrypt', 'decrypt']);
  const box = await Vault.encryptJSON(rk, DATA);
  fs.writeFileSync(path.join(__dirname, '../data/keys.json'), JSON.stringify(keys, null, 1));
  fs.writeFileSync(path.join(__dirname, '../data/data.enc.json'), JSON.stringify(box));
  console.log('OK. User dummy:', USERS.map(u => u.name + ' / ' + u.password).join(' | '));
})();
