// ============ Halaman Kontrak (tampilan Tabel; tampilan Kartu ada di views.js) ============
// Bagian dari web MIM. Dimuat sesudah js/app.js (fungsi bersama ada di sana) dan sebelum js/views.js.

PAGES.kontrak = function () {
  if (!S.me3n) { $('view').innerHTML = needFile('file kontrak ME3N', 'Upload download ME3N (dan ME2N untuk PO/RO) di Data SAP, atau taruh di folder data.'); return; }
  const docs = [...S.me3n.docs.values()].sort((a, b) => (a.sisaHari ?? 1e9) - (b.sisaHari ?? 1e9));
  const usedBy = new Map(), orderBy = new Map();
  if (S.mrpRes) for (const r of S.mrpRes.values()) if (r.contract) {
    usedBy.set(r.contract.doc, (usedBy.get(r.contract.doc) || 0) + 1);
    if (r.toOrder > 0) orderBy.set(r.contract.doc, (orderBy.get(r.contract.doc) || 0) + r.toOrder * r.contract.price);
  }
  const st = (d) => { const a = []; if (d.sisaHari != null && d.sisaHari <= 90) a.push(pill('Habis ≤ 90 hari', 'low')); else if (d.sisaHari != null && d.sisaHari <= 180) a.push(pill('Habis ≤ 180 hari', 'warn'));
    if (d.pctSisa < 0.2) a.push(pill('Sisa nilai < 20%', d.pctSisa < 0.05 ? 'low' : 'warn')); return a.join(' ') || pill('Aman', 'ok'); };
  const stTxt = (d) => st(d).replace(/<[^>]+>/g, ' ').trim();
  const renew = docs.filter((d) => (d.sisaHari != null && d.sisaHari <= 180) || d.pctSisa < 0.2);
  const lines = S.me2n ? S.me2n.lines.filter((l) => l.openQty > 0 && !l.deleted) : [];
  const late = lines.filter((l) => l.lateDays > 0).sort((a, b) => b.lateDays - a.lateDays);
  const kCols = [['No. OA', (d) => `<span class="mono">${esc(d.doc)}</span>`, '', (d) => d.doc], ['Vendor', (d) => esc(d.vendor)], ['Kelompok barang', (d) => esc(d.kel || ''), '', (d) => d.kel || ''], ['PIC', (d) => esc(d.pic)],
    ['Berakhir', (d) => dstr(d.end), '', (d) => dstr(d.end)], ['Sisa hari', (d) => fmt(d.sisaHari, 0), 'num', (d) => d.sisaHari],
    ['Target', (d) => money(d.target, d.currency), 'num', (d) => d.target], ['Terpakai', (d) => money(d.released, d.currency), 'num', (d) => d.released],
    ['Sisa', (d) => money(d.sisa, d.currency), 'num', (d) => d.sisa], ['% Sisa', (d) => fmt(d.pctSisa * 100, 0) + '%', 'num', (d) => d.pctSisa],
    ['Item', (d) => fmt(d.items, 0), 'num', (d) => d.items], ['Dipakai MRP', (d) => fmt(usedBy.get(d.doc) || 0, 0), 'num', (d) => usedBy.get(d.doc) || 0],
    ['Status', st, '', stTxt]];
  const TABS = {
    list: ['Kontrak', docs, kCols, (d) => d.doc + ' ' + d.vendor + ' ' + d.pic],
    renew: ['Perlu perpanjangan / amandemen', renew, kCols.concat([['Nilai To Order MRP', (d) => money(orderBy.get(d.doc) || 0, d.currency), 'num', (d) => orderBy.get(d.doc) || 0]]), (d) => d.doc + ' ' + d.vendor,
      'Kontrak yang habis ≤ 180 hari atau sisa nilainya < 20%. "Dipakai MRP" = jumlah material yang Min/Max-nya mengandalkan kontrak ini.'],
    items: ['Item kontrak', S.me3n.items, [['No. OA', (i) => `<span class="mono">${esc(i.doc)}</span>`, '', (i) => i.doc], ['Item', (i) => esc(i.item)], ['Material', (i) => `<a class="mono mlink" href="#" data-mat="${esc(i.material)}">${esc(i.material)}</a>`, '', (i) => i.material],
      ['Deskripsi', (i) => esc(i.desc)], ['UoM', (i) => esc(i.uom)], ['Harga', (i) => money(i.price, i.k.currency), 'num', (i) => i.price],
      ['Target qty', (i) => fmt(i.targetQty), 'num', (i) => i.targetQty], ['Terpakai qty', (i) => fmt(i.releasedQty), 'num', (i) => i.releasedQty],
      ['% pakai', (i) => (i.targetQty ? fmt((i.releasedQty / i.targetQty) * 100, 0) + '%' : '-'), 'num', (i) => (i.targetQty ? i.releasedQty / i.targetQty : '')], ['Vendor', (i) => esc(i.k.vendor)]],
      (i) => i.doc + ' ' + i.material + ' ' + i.desc + ' ' + i.k.vendor],
  };
  if (S.me2n) {
    const lCols = (extra) => [['Dokumen', (l) => `<span class="mono">${esc(l.doc)}</span>/${esc(l.item)}`, '', (l) => l.doc + '/' + l.item], ['Jenis', (l) => pill(l.type, l.type === 'RO' ? 'info' : 'mute'), '', (l) => l.type],
      ['Plant', (l) => esc(l.plant)], ['Material', (l) => `<a class="mono mlink" href="#" data-mat="${esc(l.material)}">${esc(l.material)}</a>`, '', (l) => l.material], ['Deskripsi', (l) => esc(l.desc)], ['Vendor', (l) => esc(l.vendor)],
      ['Tgl kirim', (l) => dstr(l.delivery), '', (l) => dstr(l.delivery)], ['Sisa kirim', (l) => fmt(l.openQty) + ' ' + esc(l.uom), 'num', (l) => l.openQty],
      ['Nilai sisa', (l) => money(l.openValue, l.currency), 'num', (l) => l.openValue]].concat(extra);
    TABS.open = ['PO/RO berjalan', lines, lCols([['Status', (l) => (l.lateDays ? pill('Terlambat ' + l.lateDays + ' hr', 'low') : pill('Sesuai jadwal', 'ok')), '', (l) => (l.lateDays ? 'Terlambat ' + l.lateDays : 'OK')]]), (l) => l.doc + ' ' + l.material + ' ' + l.desc + ' ' + l.vendor + ' ' + l.plant];
    TABS.late = ['Pengiriman terlambat', late, lCols([['Terlambat', (l) => pill(l.lateDays + ' hari', l.lateDays > 30 ? 'low' : 'warn'), 'num', (l) => l.lateDays]]), (l) => l.doc + ' ' + l.material + ' ' + l.desc + ' ' + l.vendor + ' ' + l.plant,
      'Baris PO/RO yang tanggal kirimnya sudah lewat tetapi barang belum diterima penuh. Tindak lanjut ke vendor / PIC kontrak.'];
  }
  tabbed('kTab', TABS, (S.me2n ? '' : '<div class="banner">Tambahkan ME2N untuk melihat PO/RO berjalan dan pengiriman terlambat.</div>'));
};
