# Inventory Analyst

Web statis (GitHub Pages) untuk kerja Inventory Analyst.
Live: https://denmas211r.github.io/bantu-mikir/

## Struktur
| File / folder | Isi |
|---|---|
| `index.html` | Kerangka halaman: layar login + sidebar + area konten |
| `css/style.css` | Gaya dasar komponen lama (warna netral, tabel, panel, versi HP) |
| `css/kantor.css` | Kantor 2.0: sidebar terang 5 grup, topbar, filter bar, tema AG Grid |
| `js/app.js` | Otak web: menu 5 grup, filter Zona, pindah halaman, muat folder |
| `js/config.js` | Konfigurasi satu tempat: pemetaan plant ke zona, nama plant |
| `js/tbl.js` | Standar halaman: baris filter (Cari, Plant, Dari, Sampai, Tahun, pilihan halaman), kartu ringkas, tabel (teks kiri, angka kanan, tanggal/status tengah, lebar kolom proporsional, tidak melebar keluar layar), satu kamus warna status |
| `js/grid.js` | Komponen tabel baru (AG Grid): cari, urut, pin, filter checkbox, date range (Flatpickr), unduh Excel |
| `js/pages/mplan.js` | Material Control (Overview = matriks, Detail = MRP per plant; SS/Min/Max/Stok berwarna) dan pop-up material tunggal `MP.detail` (header, kartu ringkas, tab Stok/MRP/PO-RO/Reservasi/Kontrak/Transaksi/Pemakaian) |
| `js/pages/analysis.js` | Material Analysis: jejak material/dokumen (PR, PO/RO, OA, reservasi) dengan filter plant dan tanggal |
| `js/i18n.js` | Bahasa Indonesia/English: kamus EN (menu, judul, tombol, filter, kepala kolom); pilihan disimpan di Pengaturan |
| `js/pages/cexp.js` | Contract & Expediting sebagai halaman pantau (kartu ringkas + kotak cari + tabel sederhana lewat `G.listPage`): Kontrak, Pesanan (PO/RO dan Reservasi). Keluar-Masuk Barang ada di views.js. Detail lengkap di pop-up; data mentah SAP di Sumber Data > Data |
| `js/pages/dokumen.js` | Governance: Dokumen Aturan (Pedoman/TKO/TKI/Regulasi dalam satu daftar, filter Jenis; daftar PDF dari folder lokal, penampil per halaman, cari teks lewat indeks di browser; butuh vendor/pdf.min.mjs untuk pencarian) |
| `js/pages/raw.js` | Data Mentah (tab di Sumber Data): MB52, MB51, ME2N, ME3N apa adanya, file sejenis digabung |
| `js/ui.js` | Komponen lama (dipakai halaman lama, diganti bertahap): tabel (cari, urut, filter pilihan ganda, pilih kolom, halaman, unduh Excel), dropdown pilihan ganda, grafik |
| `js/contract.js`, `js/trace.js` | Kontrak ME3N, PO/RO ME2N, pergerakan MB51, reservasi MB25, expediting & pelacakan |
| `js/parser.js` | Pembaca MB52 + hitung status stok (Kosong / Di bawah Min / Surplus / Aman) |
| `js/mrp.js` | Mesin MRP: rumus sama dengan file MRP Zona 1 (AMU 3 thn, Aging, SS, Min2/Max2, To Order) |
| `js/folder.js` | Auto-load dari folder lokal (Chrome/Edge), 1 klik tiap sesi |
| `js/vault.js` | Gembok: login & buka data terenkripsi (AES-256) |
| `data/keys.json` | Daftar user (password tidak disimpan, hanya kunci terbungkus) |
| `data/data.enc.json` | Data contoh terenkripsi |
| `tools/init-data.js` | Bikin ulang user + data contoh (password dari `tools/users.local.json`, tidak di-upload) |
| `vendor/` | Library lokal, tanpa CDN: SheetJS (baca/tulis Excel), AG Grid Community 32.3.3 (tabel), Apache ECharts 5.5.1 (grafik, dipakai fase berikut), Flatpickr 4.6.13 (kalender). Lisensi ada di folder yang sama |
| `tools/test-raw.js` | Tes kecil penggabungan file: `node tools/test-raw.js` |
| `CLAUDE.md`, `SPEC.md` | Aturan kerja & rencana tahapan |

## Aturan data
Repo publik. File SAP asli hanya dibaca di browser, tidak pernah di-commit.

## Navigasi
Material Planning (Material Analysis, Material Control), Contract & Expediting (Kontrak, Pesanan, Keluar-Masuk Barang), Performance & Reporting (Analisis Warehouse, Deadstock & BAU), Governance (Dokumen Aturan), Data (Sumber Data: tab Sumber dan Data Mentah), Pengaturan (bahasa, plant/zona, kurs, metode MRP). RKM, Perencanaan, dan Perlu Dipesan dihapus 2026-11-20 (data RKM berantakan). Route lama diarahkan ke pengganti lewat REDIR di js/app.js. Penjelasan fitur tidak ditaruh di halaman; arti warna dan tanda ada di tombol Info. Filter Zona di pojok kanan atas; pemetaan plant ke zona di `js/config.js`.

## Jalankan lokal
`python3 -m http.server 8000` lalu buka http://localhost:8000
