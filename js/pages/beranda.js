// ============ Halaman Beranda dan Analisis Warehouse ============
// Bagian dari web MIM. Dimuat sesudah js/app.js (fungsi bersama ada di sana) dan sebelum js/views.js.

// Beranda: ringkasan dari tiap menu. Kartu = angka kunci; blok = 10 baris paling mendesak dari Material Control, Pesanan (PO/RO dan Reservasi), dan Kontrak,
// masing-masing dengan "Lihat semua" yang membuka halaman fiturnya sudah terfilter. Ikut toggle WK di kanan atas.
PAGES.beranda = function () {
  if (!S.mb52 && !S.mrpRes && !S.me2n && !S.me3n) {
    $('view').innerHTML = `<div class="hint">Belum ada data. Pilih folder yang berisi file download SAP (MB52, MRP, ME3N, ME2N, MB51, MB25) di <a href="#/data">Sumber Data</a>.</div>`;
    return;
  }
  MP.zonaHook = () => PAGES.beranda();
  const ok = (p) => G.zonaOk(p), N = 10;
  const items = S.mb52 ? S.mb52.items.filter((i) => ok(i.plant)) : [];
  const low = (S.mrpRes ? [...S.mrpRes.values()] : []).filter((r) => ok(r.plant) && S.mrpPlants.has(r.plant)).map((r) => ({ r, k: MP.pos(r.stock, r) })).filter((x) => x.k === 'low').sort((a, b) => (b.r.toOrder || 0) - (a.r.toOrder || 0));
  const late = (S.me2n ? S.me2n.lines : []).filter((l) => ok(l.plant) && KX.poSt(l) === 'late').sort((a, b) => b.lateDays - a.lateDays);
  const rsv = (S.mb25 ? S.mb25.lines : []).filter((l) => ok(l.plant) && ['open', 'late'].includes(KX.rvSt(l))).sort((a, b) => (KX.rvSt(a) === 'late' ? 0 : 1) - (KX.rvSt(b) === 'late' ? 0 : 1) || (a.reqDate || 0) - (b.reqDate || 0));
  const rsvLate = rsv.filter((l) => KX.rvSt(l) === 'late').length;
  const kon = (S.me3n ? [...S.me3n.docs.values()] : []).filter((d) => ['soon', 'low'].includes(KX.kSt(d))).sort((a, b) => (a.sisaHari ?? 1e9) - (b.sisaHari ?? 1e9));
  $('view').innerHTML = T.kpis([['Di bawah SS', fmt(low.length, 0), 'material x plant', 'k-low'], ['PO/RO terlambat', fmt(late.length, 0), 'lewat jatuh tempo', 'k-low'], ['Reservasi terbuka', fmt(rsv.length, 0), fmt(rsvLate, 0) + ' lewat tgl butuh', 'k-min'], ['Kontrak mau habis', fmt(kon.length, 0), 'waktu ≤ 90 hari atau nilai < 20%', 'k-min'],
      ['Nilai stok', money(items.reduce((a, i) => a + toIDRv(i.value, stockCur(i.plant)), 0), 'IDR'), fmt(new Set(items.map((i) => i.plant)).size, 0) + ' plant, setara IDR', 'k-max']])
    + `<div class="blk-grid">${T.block('Stok di bawah SS', low.length, '#/control')}${T.block('PO/RO terlambat', late.length, '#/po')}${T.block('Reservasi terbuka', rsv.length, '#/po')}${T.block('Kontrak mau habis', kon.length, '#/kontrak')}</div>`;
  const B = $('view').querySelectorAll('.blk-b'), two = (a, b) => T.two(a || '', b || '');
  T.table(B[0], { rows: low.slice(0, N), pageSize: N, empty: 'Tidak ada stok di bawah SS.', onRow: (x) => MP.detail(x.r.material, x.r.plant), cols: [{ label: 'Material', w: 2.6, get: (x) => x.r.desc, html: (x) => two(x.r.desc, x.r.material + ' · ' + x.r.plant) },
    { label: 'Stok', type: 'num', w: 0.6, get: (x) => x.r.stock, cls: () => 'mx-low', onCell: (x) => MP.detail(x.r.material, x.r.plant, { tab: 'stok' }) }, { label: 'SS', type: 'num', w: 0.5, get: (x) => x.r.ss, cls: () => 'ref', onCell: (x) => MP.detail(x.r.material, x.r.plant, { tab: 'mrp' }) },
    { label: 'OS PO/RO', type: 'num', w: 0.7, get: (x) => x.r.ospo || null, onCell: (x) => MP.detail(x.r.material, x.r.plant, { tab: 'po' }) }, { label: 'To Order', type: 'num', w: 0.7, get: (x) => x.r.toOrder || null, cls: () => 'b', onCell: (x) => MP.detail(x.r.material, x.r.plant, { calc: x.r.plant }) }] });
  T.table(B[1], { rows: late.slice(0, N), pageSize: N, empty: 'Tidak ada PO/RO terlambat.', onRow: (l) => l.material && MP.detail(l.material, l.plant, { tab: 'po' }), cols: [{ label: 'Dokumen', w: 1.1, get: (l) => l.doc + '/' + l.item, html: (l) => two(l.doc + '/' + l.item, l.type + ' · ' + l.plant) },
    { label: 'Material', w: 2.2, get: (l) => l.desc, html: (l) => two(l.desc, l.vendor) }, { label: 'Jatuh tempo', type: 'date', w: 0.8, get: (l) => l.delivery }, { label: 'Sisa', type: 'num', w: 0.5, get: (l) => l.openQty }, { label: 'Terlambat', type: 'num', w: 0.7, get: (l) => l.lateDays, html: (l) => fmt(l.lateDays, 0) + ' hari', cls: () => 'neg' }] });
  T.table(B[2], { rows: rsv.slice(0, N), pageSize: N, empty: 'Tidak ada reservasi terbuka.', onRow: (l) => KX.resv(l), cols: [{ label: 'Reservasi', w: 1.1, get: (l) => l.resv + '/' + l.item, html: (l) => two(l.resv + '/' + l.item, l.plant) },
    { label: 'Material', w: 2.2, get: (l) => l.desc, html: (l) => two(l.desc, l.recipient || l.costCenter) }, { label: 'Tgl butuh', type: 'date', w: 0.8, get: (l) => l.reqDate }, { label: 'Sisa', type: 'num', w: 0.5, get: (l) => l.diff }, { label: 'Status', type: 'status', w: 1, get: (l) => KX.RV_ST[KX.rvSt(l)][0], html: (l) => T.pill(...KX.RV_ST[KX.rvSt(l)]) }] });
  T.table(B[3], { rows: kon.slice(0, N), pageSize: N, empty: 'Tidak ada kontrak yang mau habis.', onRow: (d) => KX.contract(d.doc), cols: [{ label: 'Kontrak', w: 2.2, get: (d) => d.doc, html: (d) => two(d.doc, d.vendor) },
    { label: 'Berakhir', type: 'date', w: 0.8, get: (d) => d.end }, { label: 'Sisa hari', type: 'num', w: 0.6, get: (d) => d.sisaHari, cls: (d) => (d.sisaHari != null && d.sisaHari <= 90 ? 'neg' : '') }, { label: 'Sisa nilai', type: 'num', w: 0.6, get: (d) => Math.round(d.pctSisa * 100), html: (d) => fmt(d.pctSisa * 100, 0) + '%', cls: (d) => (d.pctSisa < 0.2 ? 'neg' : '') },
    { label: 'Penyebab', type: 'status', w: 1, get: (d) => KX.kSt(d), html: (d) => T.pill(KX.kSt(d) === 'soon' ? 'Waktu' : 'Nilai', KX.kSt(d) === 'soon' ? 'low' : 'warn') }] });
  const A = [...$('view').querySelectorAll('.blk')].map((b) => b.querySelector('.blk-a'));
  if (A[0]) A[0].onclick = () => { S.ovMode = 'dt'; S.fc = { q: '', plant: new Set(), pos: new Set(['low']), _init: 1 }; };
  if (A[1]) A[1].onclick = () => { S.psTab = 'po'; S.fp = { q: '', plant: new Set(), from: '', to: '', st: new Set(['late']), _init: 1 }; };
  if (A[2]) A[2].onclick = () => { S.psTab = 'resv'; S.fr = { q: '', plant: new Set(), from: '', to: '', st: new Set(['open', 'late']), _init: 1 }; };
  if (A[3]) A[3].onclick = () => { S.fk = { q: '', st: new Set(['soon', 'low']), pg: new Set(), _init: 1 }; };
};
