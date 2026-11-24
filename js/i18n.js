// ============ Bahasa: Indonesia (asli) dan English ============
// Teks di web ditulis dalam Bahasa Indonesia. Mode English mengganti teks yang PERSIS sama dengan kunci di kamus EN
// (menu, judul, tombol, filter, kepala kolom) setelah halaman digambar. Teks lain (isi data, nama kolom SAP, kamus istilah) tetap.
// Pilihan bahasa disimpan di Pengaturan (S.set.lang, localStorage 'settings'). Tambah terjemahan = tambah baris di EN.
(function (root) {
  const EN = {
    // login dan kerangka
    'Masuk': 'Sign in', 'Memproses…': 'Processing…', 'Username atau password salah.': 'Wrong username or password.', 'Keluar': 'Sign out', 'Sembunyikan menu': 'Hide menu', 'Tampilkan menu': 'Show menu', 'Buka menu': 'Open menu',
    'Material Inventory Management': 'Material Inventory Management', 'Info': 'Info', 'Arti warna, tanda, dan singkatan': 'Meaning of colors, marks, and abbreviations', 'Filter zona': 'Zone filter', 'Menu utama': 'Main menu',
    // menu
    'Beranda': 'Home', 'Material Planning': 'Material Planning', 'Material Analysis': 'Material Analysis', 'Material Control': 'Material Control', 'Contract & Expediting': 'Contract & Expediting', 'Kontrak': 'Contracts', 'Pesanan': 'Orders',
    'Keluar-Masuk Barang': 'Goods Movement', 'Performance & Reporting': 'Performance & Reporting', 'Analisis Warehouse': 'Warehouse Analysis', 'Deadstock & BAU': 'Deadstock & BAU', 'Governance': 'Governance', 'Dokumen Aturan': 'Policy Documents',
    'Data': 'Data', 'Sumber Data': 'Data Sources', 'Pengaturan': 'Settings',
    // umum
    'Zona': 'Zone', 'Semua': 'All', 'Semua plant': 'All plants', 'Semua zona': 'All zones', 'Semua WK': 'All WK', 'Plant': 'Plant', 'Cari': 'Search', 'Reset filter': 'Reset filters', 'Dari tanggal': 'From date', 'Sampai': 'To',
    'Tampilkan': 'Show', 'Sembunyikan': 'Hide', 'Selengkapnya': 'More', 'Ringkas': 'Less', 'Tidak ada data.': 'No data.', 'Tutup': 'Close', 'Buka': 'Open', 'Hapus pilihan': 'Clear selection', 'Kolom': 'Columns', 'Lebarkan': 'Expand',
    'Simulasi RO': 'RO Simulation', 'Isi sesuai MRP': 'Fill from MRP', 'Kosongkan': 'Clear', 'Hanya yang perlu order atau sudah diisi': 'Only items to order or filled in', 'Sisa nilai kontrak': 'Remaining contract value', 'Nilai RO simulasi': 'Simulated RO value', 'Sisa sesudah simulasi': 'Remaining after simulation', 'Qty RO': 'RO qty', 'Harga satuan': 'Unit price', 'Nilai RO': 'RO value', 'Stok sesudah': 'Stock after',
    'Unduh Excel': 'Download Excel', 'Halaman sebelumnya': 'Previous page', 'Halaman berikutnya': 'Next page', 'Halaman': 'Page', 'dari': 'of', 'dipilih': 'selected',
    // Material Analysis
    'Lacak': 'Track', 'Data dimuat:': 'Data loaded:', 'Abu-abu = file belum dimuat, jejaknya tidak lengkap.': 'Grey = file not loaded, so the trail is incomplete.', 'Kode material, No. PO/RO, No. PR, No. OA, atau No. reservasi': 'Material code, PO/RO no., PR no., OA no., or reservation no.',
    'Analisis lengkap': 'Full analysis', 'Stok sekarang (MB52)': 'Current stock (MB52)', 'Tidak ditemukan di data yang dimuat.': 'Not found in the loaded data.', 'Tidak ada kejadian pada filter ini.': 'No events for this filter.',
    'Tanggal': 'Date', 'Jenis': 'Type', 'Dokumen': 'Document', 'Keterangan': 'Remarks', 'Jadwal': 'Schedule', 'Vendor': 'Vendor', 'Sisa kirim': 'Remaining delivery', 'Tgl dokumen': 'Document date', 'Deskripsi': 'Description', 'Satuan': 'Unit', 'Material': 'Material',
    // Material Control
    'Overview': 'Overview', 'Detail': 'Detail', 'Di bawah SS / kosong': 'Below SS / empty', 'Di bawah Min (ROP)': 'Below Min (ROP)', 'Normal (Min sampai Max)': 'Normal (Min to Max)', 'Di atas Max': 'Above Max', 'Legenda warna stok': 'Stock color legend',
    'Posisi stok': 'Stock position', 'Perlu order': 'Needs order', 'Berlebih': 'Excess', 'Cukup': 'Sufficient', 'Aman': 'Safe', 'Kelas': 'Class', 'Stok': 'Stock', 'Reservasi': 'Reservations', 'Jalur': 'Route', 'Catatan': 'Notes',
    'Stok plant lain': 'Stock in other plants', 'Surplus plant lain': 'Surplus in other plants', 'Stok per plant': 'Stock per plant', 'Nilai': 'Value', 'Mata uang': 'Currency', 'Lokasi': 'Location', 'Kategori': 'Category', 'Harga': 'Price',
    // kontrak, pesanan, gerak
    'Kartu': 'Cards', 'List Kontrak': 'Contract List', 'Item Kontrak': 'Contract Items', 'Ongoing': 'Ongoing', 'Closed': 'Closed', 'Terlambat': 'Late', 'Dihapus': 'Deleted', 'Terbuka': 'Open', 'Selesai': 'Completed',
    'Simulasi RO dan jejak pemakaian': 'RO simulation and usage trail', 'Isi sesuai MRP': 'Fill per MRP', 'Kosongkan': 'Clear', 'Kelompok': 'Group', 'Berakhir': 'Expires', 'Mulai': 'Start', 'Sisa hari': 'Days left',
    // performa
    'Per zona': 'By zone', 'Per plant': 'By plant', 'Per material': 'By material', 'Per warehouse': 'By warehouse', 'Gabung per material': 'Combined per material', 'Dihitung': 'Counted', 'Tidak dihitung': 'Not counted', 'Bulan': 'Month', 'Total': 'Total',
    'Nilai stok': 'Stock value', 'Pantau pesanan': 'Order monitoring', 'Analisis ABC': 'ABC analysis', 'PO/RO aktif': 'Active PO/RO', 'Dikirim': 'Shipped', 'Paling lama terlambat': 'Longest overdue', 'Hari': 'Days', 'Lapangan': 'Field',
    'Dasar: nilai stok': 'Basis: stock value', 'Dasar: nilai pemakaian 12 bln': 'Basis: 12-month usage value', 'Tanpa MRP': 'No MRP', 'Belum ada data': 'No data yet', 'Buka Sumber Data': 'Open Data Sources',
    // dokumen aturan
    'Daftar dokumen': 'Document list', 'Cari teks': 'Text search', 'Pilih folder dokumen': 'Choose document folder', 'Bangun / perbarui indeks': 'Build / update index', 'Judul': 'Title', 'Nomor': 'Number', 'Kekuatan aturan': 'Rule strength',
    'Tahun (dari nama)': 'Year (from name)', 'Tanggal dokumen': 'Document date', 'Ukuran (KB)': 'Size (KB)', 'Tgl ubah file': 'File modified', 'Folder': 'Folder', 'Pedoman': 'Guideline', 'Regulasi': 'Regulation', 'Lainnya': 'Other',
    // sumber data
    'Sumber': 'Sources', 'Data': 'Data', 'Folder data': 'Data folder', 'Pilih folder': 'Choose folder', 'Lupakan folder': 'Forget folder', 'Muat ulang data': 'Reload data', 'Muat data': 'Load data', 'Hapus cache': 'Clear cache',
    'Sumber data': 'Data sources', 'Isi': 'Contents', 'File': 'File', 'Jumlah': 'Count', 'Dimuat': 'Loaded', 'Belum dimuat': 'Not loaded', 'Upload': 'Upload', 'Stok per plant dan storage location': 'Stock per plant and storage location',
    'Pergerakan material': 'Material movement', 'PO dan RO': 'PO and RO', 'Reservasi material': 'Material reservations',
    // pengaturan
    'Bahasa': 'Language', 'Bahasa Indonesia': 'Bahasa Indonesia', 'English': 'English', 'Plant dan zona': 'Plants and zones', 'Nama': 'Name', 'Dipantau MRP': 'Monitored by MRP', 'Mata uang dan kurs': 'Currency and exchange rate',
    'Metode perhitungan MRP': 'MRP calculation method', 'Rupiah per 1 USD': 'Rupiah per 1 USD', 'Kembalikan default': 'Restore defaults', 'Metode TKO / Pedoman (disarankan)': 'TKO / Guideline method (recommended)', 'Metode Excel lama (untuk validasi)': 'Legacy Excel method (for validation)',
    // halaman pantau (Kontrak, Pesanan, Keluar-Masuk) dan pop-up material
    'Kontrak aktif': 'Active contracts', 'Berakhir ≤ 90 hari': 'Expiring ≤ 90 days', 'Sisa nilai < 20%': 'Remaining value < 20%', 'Habis masa': 'Expired', 'Pesanan berjalan': 'Open orders', 'Jatuh tempo ≤ 30 hari': 'Due ≤ 30 days', 'Sisa kirim': 'Remaining delivery',
    'Reservasi terbuka': 'Open reservations', 'Lewat tgl butuh': 'Past required date', 'Selesai / ditutup': 'Completed / closed', 'Gerakan': 'Movements', 'Barang masuk': 'Goods in', 'Barang keluar': 'Goods out', 'Pemakaian (Own Use)': 'Usage (Own Use)',
    'Berjalan': 'Open', 'PO / RO': 'PO / RO', 'Termasuk tidak dihitung': 'Including not counted', '3 bulan': '3 months', '12 bulan': '12 months', 'Tidak ada data yang cocok.': 'No matching data.',
    'Stok': 'Stock', 'Min – Max': 'Min – Max', 'OS PO/RO': 'Open PO/RO', 'To Order': 'To Order', 'Cakupan': 'Coverage', 'Nilai stok': 'Stock value', 'Semua plant': 'All plants', 'Transaksi': 'Transactions', 'Pemakaian': 'Usage', 'MRP': 'MRP',
    'Cari material': 'Search material', 'Tanggal ': 'Date', 'Pesanan ': 'Orders',
    // standar halaman (tbl.js)
    'Di bawah SS': 'Below SS', 'Di bawah Min': 'Below Min', 'Normal': 'Normal', 'Di atas Max': 'Above Max', 'Tanpa MRP': 'No MRP', 'Semua status': 'All statuses', 'Semua tahun': 'All years', 'Dari': 'From', 'Reset': 'Reset',
    'Semua kecuali Habis': 'All except Expired', 'Aktif': 'Active', 'Hampir habis': 'Expiring', 'Habis': 'Expired', 'Berjalan + terlambat': 'Open + late', 'Terbuka': 'Open', 'Selesai': 'Completed', 'Lewat tgl butuh': 'Past required date',
    'Jatuh tempo': 'Due date', 'Sisa': 'Remaining', 'Tgl butuh': 'Required date', 'Penerima': 'Recipient', 'Dokumen': 'Document', 'Lihat semua': 'View all', 'Buka detail': 'Open detail', 'Stok per plant': 'Stock per plant', 'Jejak waktu': 'Timeline',
    'Reservasi terbuka': 'Open reservations', 'Kontrak aktif': 'Active contracts', 'Semua kategori (dihitung)': 'All categories (counted)', 'Semua jenis': 'All types', 'Unduh Excel': 'Download Excel', 'Stok di bawah SS': 'Stock below SS', 'PO/RO terlambat': 'Late PO/RO', 'Kontrak hampir habis': 'Expiring contracts',
    'Tidak ada data.': 'No data.', 'perlu tindakan': 'needs action', 'saatnya pesan': 'time to order', 'Min sampai Max': 'Min to Max', 'stok berlebih': 'excess stock', '‹ Kembali ke hasil pencarian': '‹ Back to search results',
    'Padanan KIMAP': 'KIMAP Equivalents', 'KIMAP': 'KIMAP', 'Beda client': 'Cross client', 'Satu client': 'Same client', 'KIMAP sama persis': 'Identical KIMAP', 'Mirip': 'Similar', 'Skor': 'Score', 'Alasan': 'Reason', 'Status': 'Status', 'Jenis': 'Type', 'Plant': 'Plant',
    // Info (warna dan tanda)
    'Kamus istilah': 'Glossary', 'Warna dan tanda': 'Colors and marks', 'Matriks stok (Material Control)': 'Stock matrix (Material Control)', 'Status': 'Status', 'Pergerakan (aging)': 'Movement (aging)',
    'Merah: perlu tindakan segera.': 'Red: needs action now.', 'Kuning: perhatian.': 'Yellow: attention.', 'Hijau: aman.': 'Green: OK.', 'Biru: informasi.': 'Blue: information.', 'Abu-abu: netral atau belum ada data.': 'Grey: neutral or no data.',
    'Fast: dipakai dalam 1 tahun terakhir': 'Fast: used within the last year', 'Moderate: dipakai 1 sampai 2 tahun lalu': 'Moderate: last used 1 to 2 years ago', 'Slow: dipakai 2 sampai 5 tahun lalu': 'Slow: last used 2 to 5 years ago', 'Dead stock: lebih dari 5 tahun tidak dipakai': 'Dead stock: unused for over 5 years',
    'Project: material proyek yang belum pernah dipakai': 'Project: project material never used',
  };
  let lang = 'id';
  const nodes = new WeakMap(), attrs = new WeakMap(), ATTR = ['title', 'placeholder', 'aria-label'];
  const SKIP = /^(SCRIPT|STYLE|TEXTAREA|CODE|PRE)$/;
  const pick = (s) => { const t = s.trim(); return t && EN[t] ? s.replace(t, EN[t]) : null; };

  function text(el) {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, { acceptNode: (n) => (n.parentNode && SKIP.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT) });
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const cur = n.nodeValue, rec = nodes.get(n), base = rec && rec.t === cur ? rec.o : cur;
      const next = lang === 'en' ? pick(base) : null, to = next == null ? base : next;
      if (to !== cur) { n.nodeValue = to; if (next != null) nodes.set(n, { o: base, t: to }); else nodes.delete(n); }
    }
  }
  function attr(el) {
    const list = (el.nodeType === 1 ? [el] : []).concat([...el.querySelectorAll('[title],[placeholder],[aria-label]')]);
    for (const e of list) for (const a of ATTR) {
      if (!e.hasAttribute(a)) continue;
      const m = attrs.get(e) || attrs.set(e, {}).get(e), cur = e.getAttribute(a), rec = m[a], base = rec && rec.t === cur ? rec.o : cur;
      const next = lang === 'en' ? pick(base) : null, to = next == null ? base : next;
      if (to !== cur) { e.setAttribute(a, to); if (next != null) m[a] = { o: base, t: to }; else delete m[a]; }
    }
  }
  const apply = (el) => { if (!el || (lang === 'id' && !I18N.touched)) return; text(el); attr(el); };

  let queued = false;
  const obs = new MutationObserver(() => { if (queued || lang !== 'en') return; queued = true; setTimeout(() => { queued = false; apply(document.body); }, 30); });
  obs.observe(document.documentElement, { childList: true, subtree: true });

  const I18N = (root.I18N = {
    touched: false,
    get lang() { return lang; },
    loc: () => (lang === 'en' ? 'en-US' : 'id-ID'),
    t: (s) => (lang === 'en' && EN[s] ? EN[s] : s),
    set(l) { lang = l === 'en' ? 'en' : 'id'; document.documentElement.lang = lang; if (lang === 'en') I18N.touched = true; apply(document.body); },
  });
  try { const s = JSON.parse(localStorage.getItem('settings')); if (s && s.lang === 'en') I18N.set('en'); } catch {}
  document.addEventListener('DOMContentLoaded', () => { if (lang === 'en') apply(document.body); });
})(window);
