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
