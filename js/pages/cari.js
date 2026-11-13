// ============ Halaman Cari Material (tampilan Tabel; tampilan Matriks ada di views.js) ============
// Bagian dari web MIM. Dimuat sesudah js/app.js (fungsi bersama ada di sana) dan sebelum js/views.js.

PAGES.cari = function () {
  if (!S.mb52) { $('view').innerHTML = needFile('file MB52', 'Cari Material membaca stok dari MB52. Min/Max diambil dari mesin MRP kalau file MRP dimuat.'); return; }
  const items = activeItems();
  // Unrestricted = ZNORMAL (dipakai MRP); valuation type lain & in transit dipisah
  const nrm = (m) => (m.sohNormal != null ? m.sohNormal : m.soh), oth = (m) => (m.sohNormal != null ? m.soh - m.sohNormal : 0);
  const valList = (m, otherOnly) => Object.entries(m.byVal || {}).filter(([v]) => !otherOnly || (v !== 'ZNORMAL' && v !== '(tanpa val. type)')).map(([v, q]) => `${v} ${fmt(q)}`).join(', ');
  const cols = [['Plant', (m) => esc(plantLabel(m.plant)), '', (m) => plantLabel(m.plant)], ['Zona', (m) => esc(zonaOf(m.plant)), '', (m) => zonaOf(m.plant)],
    ['Material', (m) => `<a class="mono mlink" href="#" data-mat="${esc(m.material)}">${esc(m.material)}</a>`, '', (m) => m.material], ['Deskripsi', (m) => esc(m.desc), '', (m) => m.desc],
    ['Unrestricted', (m) => fmt(nrm(m)), 'num', (m) => nrm(m)],
    ['Val. type lain', (m) => (oth(m) ? `<span title="${esc(valList(m, true))}">${fmt(oth(m))}</span>` : ''), 'num', (m) => oth(m)],
    ['In transit', (m) => (m.transit ? fmt(m.transit) : ''), 'num', (m) => m.transit || 0],
    ['Val. type', (m) => esc(valList(m)), '', (m) => valList(m)], ['UoM', (m) => esc(m.uom), '', (m) => m.uom], ['Harga/unit', (m) => money(m.price, stockCur(m.plant)), 'num', (m) => m.price],
    ['Nilai', (m) => money(m.value, stockCur(m.plant)), 'num', (m) => m.value], ['WK', (m) => esc(m.wk || ''), '', (m) => m.wk || ''], ['Aging', (m) => (m.mrp && m.mrp.aging ? agingPill(m.mrp.aging) : ''), '', (m) => (m.mrp && m.mrp.aging) || ''],
    ['Min', (m) => (m.mrp ? fmt(m.mrp.min) : ''), 'num', (m) => (m.mrp ? m.mrp.min : null)], ['Max', (m) => (m.mrp ? fmt(m.mrp.max) : ''), 'num', (m) => (m.mrp ? m.mrp.max : null)],
    ['Status', (m) => pill(m.status, m.cls), '', (m) => m.status], ['Lokasi', (m) => esc(m.locs.map((l) => l.sloc + (l.batch ? '/' + l.batch : '') + ': ' + fmt(l.qty) + (l.transit ? ' (transit ' + fmt(l.transit) + ')' : '')).join('; ')), '', (m) => m.locs.map((l) => l.sloc).join(', ')]];
  $('view').innerHTML = table(items, cols, { id: 'cari', name: 'Cari Material', text: (m) => m.material + ' ' + m.desc + ' ' + m.plant, hide: ['Harga/unit', 'Zona', 'Lokasi', 'WK'], rowKey: (m) => m.material, onRow: (k) => openMaterial(k),
    onRender: (el) => el.querySelectorAll('a[data-q]').forEach((a) => (a.onclick = () => sessionStorage.setItem('lacakQ', a.dataset.q))) });
};
