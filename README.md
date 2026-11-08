# MIM Inventory Analyst · Zona 1

Web statis (GitHub Pages) untuk kerja Inventory Analyst MIM Zona 1.
Live: https://denmas211r.github.io/mim-inventory-web/

## Struktur
| File / folder | Isi |
|---|---|
| `index.html` | Kerangka halaman: layar login + sidebar + area konten |
| `css/style.css` | Tampilan (warna, sidebar, kartu, tabel, versi HP) |
| `js/app.js` | Otak web: menu, pindah halaman, isi tiap halaman |
| `js/parser.js` | Pembaca Excel SAP (MB52, sheet MRP) + hitung status stok |
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
