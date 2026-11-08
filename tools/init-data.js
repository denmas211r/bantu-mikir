// Bikin ulang data contoh terenkripsi + daftar user.
// Pakai: buat file tools/users.local.json (TIDAK ikut ke GitHub), isi:
//   [{"name":"Owner","password":"...","role":"Owner"}]
// lalu jalankan: node tools/init-data.js
const fs = require('fs'), path = require('path');
const { webcrypto } = require('crypto');
const Vault = require('../js/vault.js');
const usersFile = path.join(__dirname, 'users.local.json');
if (!fs.existsSync(usersFile)) { console.error('Buat dulu tools/users.local.json (lihat komentar di atas).'); process.exit(1); }
const USERS = JSON.parse(fs.readFileSync(usersFile, 'utf8'));
const DATA = {
  materials: [
    { kimap: 'D0000001', desc: 'GASKET SPIRAL WOUND 4IN 150#', plant: 'W802', soh: 12, min: 4, max: 20, uom: 'EA' },
    { kimap: 'D0000002', desc: 'BEARING BALL 6205 2RS', plant: 'W803', soh: 3, min: 5, max: 15, uom: 'EA' },
    { kimap: 'D0000003', desc: 'SARUNG TANGAN KATUN', plant: 'W101', soh: 140, min: 50, max: 300, uom: 'PSG' },
    { kimap: 'D0000004', desc: 'PACKING GLAND GRAPHITE 10MM', plant: 'W102', soh: 0, min: 2, max: 10, uom: 'ROL' },
  ],
  // kelompok kata padanan untuk pencarian
  synonyms: [['gasket', 'packing', 'seal'], ['bearing', 'laker', 'bantalan'], ['packer', 'pckr'], ['coupling', 'kopling']],
};
(async () => {
  const dataKey = await Vault.newDataKey();
  const keys = {};
  for (const u of USERS) keys[u.name.toLowerCase()] = await Vault.wrapForUser(dataKey, u.password, u.role);
  const raw = await webcrypto.subtle.exportKey('raw', dataKey);
  const k = await webcrypto.subtle.importKey('raw', raw, 'AES-GCM', false, ['encrypt']);
  fs.writeFileSync(path.join(__dirname, '../data/keys.json'), JSON.stringify(keys, null, 1));
  fs.writeFileSync(path.join(__dirname, '../data/data.enc.json'), JSON.stringify(await Vault.encryptJSON(k, DATA)));
  console.log('OK. User:', USERS.map((u) => u.name + ' (' + u.role + ')').join(', '));
})();
