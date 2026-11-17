// ============ Konfigurasi bersama (satu tempat) ============
// Pemetaan plant -> zona. Ubah di sini kalau plant baru masuk atau zona berubah.
// Data Zona 4 belum dimuat; pemetaan ini hanya menyiapkan filter Zona.
(function (root) {
  root.CFG = {
    ZONA_LIST: ['Zona 1', 'Zona 4'],
    ZONA_DEFAULT: ['Zona 1'],
    PLANT_ZONA: { W101: 'Zona 1', W102: 'Zona 1', W802: 'Zona 1', W803: 'Zona 1', W105: 'Zona 4', W106: 'Zona 4', W801: 'Zona 4', W809: 'Zona 4', W811: 'Zona 4' },
    PLANT_NAME: { W101: 'Rantau', W102: 'Pangkalan Susu', W802: 'Jambi', W803: 'Lirik', W105: 'Prabumulih', W106: 'Pendopo', W801: 'Limau', W809: 'Adera', W811: 'Ramba' },
  };
})(window);
