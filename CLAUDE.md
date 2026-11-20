# CLAUDE.md — MIM Inventory Analyst Web (REA dari Warehouse-SCM)

## Tujuan
Web app statis (GitHub Pages, repo `denmas211r/<nama-repo>`) untuk proses kerja MIM / Inventory Analyst Zona 1.
Ide dan logika meniru https://github.com/StackGeefer/Warehouse-SCM. Kode ditulis sendiri, JANGAN menyalin file dari repo itu (tidak ada lisensi yang terlihat).

## Arsitektur (ikut template)
- Situs statis: HTML + CSS + JS biasa, tanpa backend, tanpa database. SPA dengan hash routing (`#/cari`, `#/kontrak`, dst).
- Data disimpan sebagai file terenkripsi AES-256 di folder `data/`, didekripsi di browser setelah login.
- Publish data lewat GitHub API memakai token yang disimpan Owner di browser (jangan pernah commit token).
- Library di `vendor/` (semua lokal, tanpa CDN, tanpa build step): SheetJS, AG Grid Community 32.3.3, Apache ECharts 5.5.1, Flatpickr 4.6.13.
- Tabel baru pakai `G.table` di `js/grid.js` (filter checkbox, date range, ekspor Excel). Warna dan ukuran ikut `css/kantor.css`. Gaya: padat, netral, ala SAP Fiori/ALV; tanpa emoji, gradien, atau teks penjelas panjang. Semua filter = checkbox multi-select, filter waktu = kalender range.
- Menu: Material Planning (Material Analysis, Material Control), Contract & Expediting, Performance & Reporting, Governance (Dokumen Aturan), Data (Sumber Data), Pengaturan (`MENU` di `js/app.js`). Tanpa teks penjelasan fitur; arti warna/tanda di tombol Info. Bahasa ID/EN: `js/i18n.js`, pilihan di Pengaturan. RKM dihapus (2026-11-20). Chatbot Governance ditunda (data TKO tidak boleh keluar).
- Filter Zona global: pemetaan plant ke zona hanya di `js/config.js`.
- Tes: `node tools/test-raw.js`.
- Struktur folder: `index.html`, `css/style.css`, `js/` (app = inti: login, routing, muat data, fungsi bersama; `js/pages/` = satu file per menu (raw.js = tab Data Mentah di Sumber Data); grid = komponen tabel AG Grid; views/optim = matriks, pop-up, deadstock; cache = hasil baca Excel terenkripsi di browser), `data/`, `tools/init-data.js`, `vendor/`, `.nojekyll`.

## ATURAN DATA (penting)
- Repo ini PUBLIK. Selama pengembangan pakai DATA DUMMY saja.
- Dilarang commit data SAP/kontrak/harga vendor asli dalam bentuk mentah. Hanya file terenkripsi, dan hanya setelah user (Digi) konfirmasi eksplisit.
- Password login harus kuat (passphrase panjang), bukan kata sederhana.

## Aturan bisnis (otak project)
- Acuan proses bisnis & rumus MRP: dokumen pedoman/TKO internal perusahaan. Ringkasannya disimpan PRIVAT di Project MIM (claude.ai), file `claude/otak-mim-aturan-bisnis.md`.
- JANGAN commit isi/kutipan/PDF dokumen internal ke repo ini (repo publik). Di kode cukup rumusnya.
- Mesin MRP punya 2 metode: `tko` (default, sesuai pedoman) dan `excel` (replika file MRP lama, untuk validasi, harus tetap cocok 100%).

## Role (tim MIM kecil)
Owner, Co-Owner, Viewer, plus role sesuai kebutuhan (mis. Planner, Procurement). Detail ada di SPEC.md.

## Cara kerja agent
- Sonnet: pekerjaan berat (kode, parser SAP, UI, export Excel).
- Opus: keputusan arsitektur, keamanan, desain data, dan review sebelum merge.
- Selalu tanya Digi sebelum mengambil keputusan yang belum ada di SPEC.md.
- Bahasa penjelasan: Indonesia, sederhana dan santai.

## Git
- Commit kecil dan sering, pesan commit jelas.
- Jangan push ke branch publish tanpa tes lokal.
