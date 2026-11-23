# SPEC — MIM Inventory Analyst Web (v0.1)

Pemilik: Digi (Inventory Analyst, MIM Zona 1). Status: draft, siap dibawa ke Claude Code.

## 1. Prioritas modul
1. Cari Material + stok SAP
2. Monitoring RKM / MRP Zona 1
3. HPS/OE + KPI dashboard
4. Kontrak OA/RO + Call Order (versi MIM, beda dari template asal)

Modul asal yang tidak dipakai dulu: Pass Keluar, Penerimaan Barang, Armada. Bisa menyusul.

## 2. Modul 1 — Cari Material + stok SAP
- Input data: hasil tarikan SAP (MB52, MRP, MB25) dalam Excel; di-parse di browser (SheetJS).
- Cari berdasarkan KIMAP, kode material, deskripsi; dukung synonym/singkatan (file synonyms terpisah).
- Tampilkan stok per plant: W802 Jambi, W803 Lirik, W101 Rantau, W102 Pangkalan Susu.
- Info per item: SOH, min/max, AMU, lead time, status stok, kontrak OA/RO terkait.
- Catatan data: ada KIMAP duplikat di MRP; satuan RKM vs MRP perlu dicek.

## 3. Modul 2 — Monitoring RKM / MRP Zona 1
- Lanjutan dari file "Rekap RKM 2027 Zona 1" dan "Integrated RKM x MRP".
- Tampilan: rekap per lapangan, RKM vs MRP per KIMAP-plant, MRP tanpa RKM.
- Match: KIMAP + plant; tanpa KIMAP pakai deskripsi, hanya keyakinan HIGH yang otomatis.
- Rumus Min/Max/AMU/LT mengikuti aturan MRP yang sudah dipakai Digi.
- Export ke Excel.

## 4. Modul 3 — HPS/OE + KPI dashboard
- HPS/OE: input penawaran vendor, Last OA/PO, inflasi; skenario Rata-rata vs Minimum; harga bisa di-exclude (centang), outlier ditandai.
- KPI (sesuai uraian jabatan): Inventory Service Level Ratio, Akurasi Perencanaan, Rasio Nilai Persediaan vs Produksi, Rasio Carrying Cost, Inventory Turnover, Rasio Slow Moving & Dead Stock.
- Dashboard dengan grafik sederhana.

## 5. Modul 4 — Kontrak OA/RO + Call Order (versi MIM)
- Kontrak: daftar OA/RO, nilai, sisa kuantitas/nilai, masa berlaku, utilisasi.
- Call Order versi baru (diganti dari template asal) berisi 3 aksi:
  1. Kontak vendor (simpan data kontak, buat pesan/permintaan ke vendor)
  2. Buat PR
  3. Buat PO / template PR
- Export ke format Excel template yang dipakai MIM (template perlu dikirim Digi).

## 6. Role dan akses
- Owner: semua, termasuk upload data dan publish.
- Co-Owner: kelola data dan modul, tanpa ganti pengaturan keamanan.
- Viewer: hanya lihat.
- Role lain (Planner/Procurement): ditentukan nanti.

## 7. Keamanan (ikut template, dengan catatan)
- Repo publik, data terenkripsi AES-256, dekripsi di browser.
- Risiko: file terenkripsi bisa diunduh siapa saja dan ditebak offline. Karena itu: data dummy dulu, passphrase kuat, dan keputusan unggah data asli diambil Digi setelah cek aturan kerahasiaan perusahaan.
- Token GitHub hanya di browser Owner, tidak pernah di repo.

## 8. Tahapan build
1. Scaffold repo + halaman login + vault (enkripsi/dekripsi) dengan data dummy.
2. Parser Excel SAP + Cari Material.
3. RKM x MRP.
4. Kontrak OA/RO + Call Order versi MIM.
5. HPS/OE + KPI dashboard.
6. Review keamanan oleh Opus sebelum data asli dipertimbangkan.

## 9. Pertanyaan terbuka untuk Digi
- Nama repo di `denmas211r`?
- Contoh template PR/PO dan Call Order MIM yang dipakai?
- Daftar role final dan siapa saja anggota tim?
- Kolom wajib dari tiap tarikan SAP (MB52/MRP/MB25)?

## 10. Web Kantor 2.0 (keputusan Digi 2026-11-17)
Fondasi: AG Grid Community, ECharts, Flatpickr (lokal di `vendor/`). Mesin hitung lama (mrp, rkm, contract, trace, parser) dipertahankan; yang ditulis ulang adalah lapisan tampilan. Filter = checkbox multi-select, filter waktu = kalender range, filter Zona (Zona 1 / Zona 4 / Semua, default Zona 1).

- **Fase 1 (selesai, belum di-push):** fondasi (grid, filter bar, layout 5 grup, CSS) dan SAP Raw Data (MB52, MB51, ME2N, ME3N).
- **Fase 2 Material Planning (selesai a-e, lokal; Perencanaan lama dan matriks stok lama masih ada di menu sampai fiturnya dipindah):** a) cari material tampilan ala SAP; b) overview per zona: stok, OS/PO, reservasi, kontrak available; c) MRP per plant (toggle Overview/Detail) untuk rekomendasi material transfer/BAU vs RO baru; d) timeline/horizon sesuai SAP + RKM, per plant atau keseluruhan; e) sub-fitur RKM. Lanjutan: komparasi RO baru vs material transfer di Replenishment Decision.
- **Fase 3 Contract & Expediting (selesai a-d, lokal; Pantau Pesanan, Lacak Material, dan halaman lama lain tetap di menu berlabel (lama)):** a) kontrak ongoing + status + item + histori pemanfaatan (ME3N); b) PO ongoing/closed (ME2N); c) open reservation (MB25); d) keluar masuk barang (MB51). Lanjutan: penyusun HPS/OE dari histori + proyeksi.
- **Fase 4 Performance & Reporting (selesai a-b, lokal; halaman lama tetap berlabel (lama); KPI TOR/slow moving belum ditampilkan karena rumusnya belum ada):** a) analisis warehouse; b) deadstock & BAU optimization. Lanjutan: laporan bulanan sesuai template.
- **Fase 5 Governance (daftar + penampil + label kekuatan selesai lokal; pencarian teks menunggu vendor/pdf.js 4.10.38 yang belum bisa diunduh):** TKO reader dan Regulasi reader (dokumen dibaca dari folder lokal, tidak di-commit). Chatbot ditunda.
- **Fase 6 Gabung halaman lama (K-213, selesai lokal):** menu tanpa label (lama). Cari Material dan Timeline & Horizon dihapus; Overview Material = matriks lama + Detail MRP dengan warna konsep MRP; Perencanaan (timeline) dipertahankan; Kontrak satu halaman (Kartu/List/Item); Pesanan = PO/RO/Reservasi; Keluar-Masuk = grid baru, kolom lama, tanpa grafik; Analisis Warehouse dan Deadstock & BAU memakai versi lama (perf.js dihapus); Panduan & Aturan lama dihapus. Mesin hitung tidak diubah.
- **Fase 7 Perbaikan (2026-11-20, lokal):** hapus RKM, Perencanaan, Perlu Dipesan (fitur, data, akses, pengaturan Basis/LLI; mesin MRP kini murni histori); Lacak Material jadi Material Analysis + filter plant/tanggal; Overview Material jadi Material Control (Overview + Detail); Data SAP digabung ke Sumber Data (tab Data Mentah); TKO + Regulasi digabung jadi Dokumen Aturan; teks penjelasan dihapus, arti warna/tanda di tombol Info; bahasa ID/EN di Pengaturan.
- **Fase 8 UI konsisten (2026-11-20, lokal):** pop-up material tunggal (Analisis lengkap dihapus); Material Analysis: cari nama + sinonim, filter chip plant/tanggal; Contract & Expediting jadi halaman pantau (kartu ringkas + cari + tabel sederhana); tab Data Mentah jadi Data; Detail Material Control berwarna SS/Min/Max/Stok.
- **Fase 9 Basic dan konsisten (2026-11-20, lokal):** semua halaman inti memakai js/tbl.js (satu pola: filter -> kartu ringkas -> tabel/kartu). Status stok satu kosakata (Di bawah SS, Di bawah Min, Normal, Di atas Max). Material Analysis all-in-one dengan blok ringkas + Lihat semua. Kontrak kartu + filter Status. Pesanan tabel 7 kolom. Keluar-Masuk rentang tanggal + tahun. Analisis Warehouse dan Deadstock & BAU disembunyikan dulu.
- **Fase 10 (2026-11-23, lokal):** filter dropdown checkbox ala pivot (data berubah tiap klik), tanggal opsional (kosong = semua), filter Tahun dihapus, kartu ringkas bisa diklik sebagai filter status (Control, Kontrak, Pesanan, Padanan), filter Zona diganti toggle WK PEP | PHE | Semua di kanan atas, tab baru Padanan KIMAP di Sumber Data.
- Push ke GitHub per fase, setelah Digi cek lokal dan memberi izin.

- Aturan rekomendasi transfer/BAU vs RO baru belum diputuskan Digi: halaman Overview/Detail hanya menampilkan angka fakta (stok dan surplus plant lain vs To Order), tanpa rekomendasi otomatis.
