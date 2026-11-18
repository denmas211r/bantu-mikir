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
| `js/grid.js` | Komponen tabel baru (AG Grid): cari, urut, pin, filter checkbox, date range (Flatpickr), unduh Excel |
| `js/pages/mplan.js` | Material Planning: Overview Material (tab Overview = matriks plant x material berwarna MRP dari views.js, tab Detail = MRP per plant), panel detail material, RKM |
| `js/pages/cexp.js` | Contract & Expediting: Kontrak (Kartu / List Kontrak / Item Kontrak, detail List Item + Histori Pemanfaatan), Pesanan (tab PO / RO / Reservasi + GI MB51). Keluar-Masuk Barang ada di views.js (grid G.table) |
| `js/pages/rencana.js` | Perencanaan: tab Timeline, MRP & Stok Level, Data RKM; filter plant satu dropdown; grafik bisa disembunyikan (panel data-fold, disimpan di localStorage) |
| `js/pages/dokumen.js` | Governance: TKO Reader dan Regulasi Reader (daftar PDF dari folder lokal, penampil per halaman, cari teks lewat indeks di browser; butuh vendor/pdf.min.mjs untuk pencarian) |
| `js/pages/raw.js` | SAP Raw Data: tab MB52, MB51, ME2N, ME3N apa adanya, file sejenis digabung |
| `js/ui.js` | Komponen lama (dipakai halaman lama, diganti bertahap): tabel (cari, urut, filter pilihan ganda, pilih kolom, halaman, unduh Excel), dropdown pilihan ganda, grafik |
| `js/contract.js`, `js/trace.js` | Kontrak ME3N, PO/RO ME2N, pergerakan MB51, reservasi MB25, expediting & pelacakan |
| `js/parser.js` | Pembaca MB52 + hitung status stok (Kosong / Di bawah Min / Surplus / Aman) |
| `js/mrp.js` | Mesin MRP: rumus sama dengan file MRP Zona 1 (AMU 3 thn, Aging, SS, Min2/Max2, To Order) |
| `js/rkm.js` | Pembaca RKM format SHU + pencocokan ke MRP (KIMAP → LeadTime → deskripsi) |
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

## Navigasi (5 grup)
Material Planning (Lacak Material, Overview Material, Perencanaan, RKM, Perlu Dipesan), Contract & Expediting (Kontrak, Pesanan, Keluar-Masuk Barang), Performance & Reporting (Analisis Warehouse, Deadstock & BAU), Governance (TKO, Regulasi), SAP Raw Data. Route lama diarahkan ke pengganti lewat REDIR di js/app.js. Filter Zona ada di pojok kanan atas; pemetaan plant ke zona di `js/config.js`. Warna status MRP dan palet grafik ada di `css/kantor.css` (token --mrp-*, --c1..--c6).

## Jalankan lokal
`python3 -m http.server 8000` lalu buka http://localhost:8000
