# Inventory Analyst

Web statis (GitHub Pages) untuk kerja Inventory Analyst.
Live: https://denmas211r.github.io/bantu-mikir/

## Struktur
| File / folder | Isi |
|---|---|
| `index.html` | Kerangka halaman: layar login + sidebar + area konten |
| `css/style.css` | Tampilan (warna, sidebar, kartu, tabel, versi HP) |
| `js/app.js` | Otak web: menu, pindah halaman, isi tiap halaman |
| `js/ui.js` | Komponen standar: tabel (cari, urut, filter pilihan ganda, pilih kolom, halaman, unduh Excel), dropdown pilihan ganda, grafik |
| `js/contract.js`, `js/trace.js` | Kontrak ME3N, PO/RO ME2N, pergerakan MB51, reservasi MB25, expediting & pelacakan |
| `js/parser.js` | Pembaca MB52 + hitung status stok (Kosong / Di bawah Min / Surplus / Aman) |
| `js/mrp.js` | Mesin MRP: rumus sama dengan file MRP Zona 1 (AMU 3 thn, Aging, SS, Min2/Max2, To Order) |
| `js/rkm.js` | Pembaca RKM format SHU + pencocokan ke MRP (KIMAP → LeadTime → deskripsi) |
| `js/folder.js` | Auto-load dari folder lokal (Chrome/Edge), 1 klik tiap sesi |
| `js/vault.js` | Gembok: login & buka data terenkripsi (AES-256) |
| `data/keys.json` | Daftar user (password tidak disimpan, hanya kunci terbungkus) |
| `data/data.enc.json` | Data contoh terenkripsi |
| `tools/init-data.js` | Bikin ulang user + data contoh (password dari `tools/users.local.json`, tidak di-upload) |
| `vendor/` | Library pihak ketiga (SheetJS untuk baca Excel) |
| `CLAUDE.md`, `SPEC.md` | Aturan kerja & rencana tahapan |

## Aturan data
Repo publik. File SAP asli hanya dibaca di browser, tidak pernah di-commit.

## Jalankan lokal
`python3 -m http.server 8000` lalu buka http://localhost:8000
