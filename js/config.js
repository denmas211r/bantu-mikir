// ============ Konfigurasi bersama (satu tempat) ============
// Pemetaan plant -> zona. Ubah di sini kalau plant baru masuk atau zona berubah.
// Data Zona 4 belum dimuat; pemetaan ini hanya menyiapkan filter Zona.
(function (root) {
  root.CFG = {
    ZONA_LIST: ['Zona 1', 'Zona 4'],
    ZONA_DEFAULT: ['Zona 1'],
    PLANT_ZONA: { W101: 'Zona 1', W102: 'Zona 1', W802: 'Zona 1', W803: 'Zona 1', W105: 'Zona 4', W106: 'Zona 4', W801: 'Zona 4', W809: 'Zona 4', W811: 'Zona 4' },
    // Dokumen aturan (Governance). Jenis ditentukan dari path + nama file, urutan = prioritas pencocokan. Ubah di sini kalau penamaan folder berubah.
    DOK_JENIS: [['TKI', /(^|[\/_\s.-])tki([\/_\s.-]|$)/i], ['TKO', /(^|[\/_\s.-])tko([\/_\s.-]|$)|(^|[\/_\s.-])[BC]\d{1,2}[-_ ]\d{3}/i], ['Pedoman', /pedoman|(^|[\/_\s.-])A\d{1,2}[-_ ]\d{3}|ptk[-_ ]?\d/i], ['Regulasi', /regulasi|peraturan|permen|undang|(^|[\/_\s.-])uu[\/_\s.-]|keputusan/i]],
    DOK_LAINNYA: 'Lainnya',
    DOK_KEKUATAN: ['Pedoman', 'TKO', 'TKI'], // urutan kekuatan aturan: kiri paling kuat
    PLANT_NAME: { W101: 'Rantau', W102: 'Pangkalan Susu', W802: 'Jambi', W803: 'Lirik', W105: 'Prabumulih', W106: 'Pendopo', W801: 'Limau', W809: 'Adera', W811: 'Ramba' },
  };
})(window);
