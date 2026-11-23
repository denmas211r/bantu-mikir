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
PAGES.gudang = function () {
  if (!S.mb52) { $('view').innerHTML = `<div class="panel empty"><h3>Butuh MB52</h3><p>Analisis warehouse dihitung dari stok MB52 (dan MRP untuk pergerakan).</p><a class="btn primary" href="#/data">Buka Sumber Data</a></div>`; return; }
  const X = stockCtx(S.gd), { cmoney, idrOf, items, inSel, selTxt } = X;
  const pool = items.filter((i) => inSel(i.plant) && i.value > 0).sort((a, b) => idrOf(b) - idrOf(a));
  const tot = pool.reduce((a, i) => a + idrOf(i), 0); let cum = 0, nA = 0;
  pool.forEach((i) => { cum += idrOf(i); i._abc = cum / tot <= 0.8 || !nA ? 'A' : cum / tot <= 0.95 ? 'B' : 'C'; if (i._abc === 'A') nA++; });
  $('view').innerHTML = `${stockFilters('g', S.gd, X)}
    <div class="kv gd-kv"><div><span>Nilai stok</span><b>${cmoney(tot)}</b></div><div><span>Material berstok</span><b>${fmt(new Set(pool.map((i) => i.material)).size, 0)}</b></div>
      <div><span>Baris material × warehouse</span><b>${fmt(pool.length, 0)}</b></div><div><span>Warehouse</span><b>${fmt(X.selWH.size, 0)}</b></div></div>
    <section class="panel" id="abcPanel"></section>
    <section class="panel"><div class="panel-h"><h2>Material terbesar</h2><span class="sub">${esc(selTxt)}</span></div>
      <div class="filters top-f"><span id="tN"></span><span id="tBy"></span><span id="tAgg"></span></div><div id="tTop"></div></section>`;
  bindStockFilters('g', S.gd, X);
  drawABC(pool, idrOf, cmoney, selTxt);
  drawTop(pool, idrOf, cmoney);
};

// Beranda: material terbesar, bisa diatur jumlah (Top N atau Top %), ukuran (nilai total, harga per unit, qty), dan per warehouse atau gabung
// ---------- Stok per warehouse/zona (dipakai Beranda dan Analisis Warehouse) ----------
// st = { cur, wk:Set, zona:Set, wh:Set } — filter milik halaman masing-masing
function stockCtx(st) {
  const kurs = S.set.kurs || 18150, cur = st.cur;
  const conv = (idr) => (cur === 'USD' ? idr / kurs : idr);
  const f1 = (x) => x.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const cmoney = (idr) => { const v = conv(idr), p = cur === 'USD' ? 'USD ' : 'IDR ';
    return v >= 1e12 ? p + f1(v / 1e12) + ' T' : v >= 1e9 ? p + f1(v / 1e9) + ' M' : v >= 1e6 ? p + f1(v / 1e6) + ' jt' : v >= 1e3 ? p + f1(v / 1e3) + ' rb' : p + fmt(v, 0); };
  const toIDR = (v, c) => (c === 'USD' ? v * kurs : v || 0);
  const idrOf = (i) => toIDR(i.value, stockCur(i.plant));
  const items = (S.mb52 ? S.mb52.items : []).filter((i) => !st.wk.size || st.wk.has(i.wk));
  const perWH = new Map();
  items.forEach((i) => { const w = perWH.get(i.plant) || { plant: i.plant, value: 0, n: 0 }; w.value += idrOf(i); if (i.soh > 0) w.n++; perWH.set(i.plant, w); });
  const allWH = [...perWH.keys()].sort(), zonas = [...new Set(allWH.map(zonaOf))].sort((a, b) => (ZONA_LIST.indexOf(a) + 99) % 99 - (ZONA_LIST.indexOf(b) + 99) % 99 || a.localeCompare(b));
  const visWH = allWH.filter((p) => !st.zona.size || st.zona.has(zonaOf(p)));
  const selWH = new Set(st.wh.size ? visWH.filter((p) => st.wh.has(p)) : visWH);
  const selTxt = st.wh.size ? `${selWH.size} warehouse dipilih` : st.zona.size ? [...st.zona].join(', ') : 'Semua warehouse';
  return { kurs, cur, conv, cmoney, toIDR, idrOf, items, perWH, allWH, zonas, visWH, selWH, inSel: (p) => selWH.has(p), selTxt };
}
function stockFilters(px, st, X) {
  return `<div class="filters dash-f"><span id="${px}Cur" title="Kurs IDR ${fmt(X.kurs, 0)}/USD (ubah di Pengaturan)"></span><span id="${px}WK"></span><span id="${px}Zona"></span><span id="${px}WH"></span>
    ${st.wh.size || st.zona.size || st.wk.size ? `<button class="btn ghost" id="${px}Reset">Hapus pilihan</button>` : ''}</div>`;
}
function bindStockFilters(px, st, X) {
  const later = () => { clearTimeout(window._dT); window._dT = setTimeout(route, 400); };
  UI.seg($(px + 'Cur'), [['IDR', 'IDR'], ['USD', 'USD']], st.cur, (v) => { st.cur = v; route(); });
  UI.multi($(px + 'WK'), { label: 'WK', options: [...new Set((S.mb52 ? S.mb52.items : []).map((i) => i.wk))].sort().map((w) => ({ value: w, label: 'WK ' + w })), selected: st.wk, onChange: later });
  UI.multi($(px + 'Zona'), { label: 'Zona', options: X.zonas.map((z) => ({ value: z, label: z })), selected: st.zona, onChange: later });
  UI.multi($(px + 'WH'), { label: 'Warehouse', options: X.visWH.map((p) => ({ value: p, label: plantLabel(p) })), selected: st.wh, onChange: later });
  if ($(px + 'Reset')) $(px + 'Reset').onclick = () => { st.wh.clear(); st.zona.clear(); st.wk.clear(); route(); };
}
// Grafik nilai stok: batang per zona; klik zona = buka/tutup warehouse-nya (animasi); klik warehouse = pilih/lepas filter
function zonaBars(el, X, st) {
  const { cmoney, perWH, visWH, zonas, conv } = X;
  const zs = zonas.filter((z) => visWH.some((p) => zonaOf(p) === z)).map((z) => { const w = visWH.filter((p) => zonaOf(p) === z).sort((a, b) => perWH.get(b).value - perWH.get(a).value);
    return { z, w, v: w.reduce((a, p) => a + perWH.get(p).value, 0), n: w.reduce((a, p) => a + perWH.get(p).n, 0) }; });
  const tot = zs.reduce((a, z) => a + z.v, 0), zmax = Math.max(1, ...zs.map((z) => z.v));
  const anySel = st.wh.size, col = (z) => ZONA_COLOR[z] || ZONA_COLOR.Lainnya;
  const pct = (a) => (tot ? fmt((a / tot) * 100, 1) + '%' : '');
  el.innerHTML = `<div class="zb">${zs.map((z) => { const open = st.open.has(z.z), wmax = Math.max(1, ...z.w.map((p) => perWH.get(p).value));
    return `<div class="zb-z${open ? ' open' : ''}">
      <button type="button" class="zb-row zb-head" data-z="${esc(z.z)}" aria-expanded="${open}">
        <span class="zb-l"><b><span class="zdot" style="background:${col(z.z)}"></span>${esc(z.z)}</b><small>${z.w.length} WH · ${fmt(z.n, 0)} item</small></span>
        <span class="zb-t"><span class="zb-f" data-w="${((z.v / zmax) * 100).toFixed(1)}" style="background:${col(z.z)}"></span><span class="zb-v"><b>${cmoney(z.v)}</b> ${pct(z.v)}</span></span>
        <svg class="zb-chev" viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 6 6-6 6"/></svg></button>
      <div class="zb-list"><div>${z.w.map((p) => { const on = !anySel || st.wh.has(p), v = perWH.get(p).value;
        return `<button type="button" class="zb-row zb-wh${on ? '' : ' dim'}" data-p="${esc(p)}" aria-pressed="${anySel ? st.wh.has(p) : false}" title="${esc(plantLabel(p))}: ${fmt(perWH.get(p).n, 0)} item berstok. Klik untuk memilih warehouse ini.">
          <span class="zb-l"><b>${esc(p)}</b><small>${esc(PLANT_NAME[p] || '')}</small></span>
          <span class="zb-t"><span class="zb-f" data-w="${((v / wmax) * 100).toFixed(1)}" style="background:${col(z.z)}"></span><span class="zb-v">${cmoney(v)}</span></span></button>`; }).join('')}</div></div></div>`; }).join('')}</div>`;
  const barW = (f) => `calc((100% - 128px) * ${Math.max(0.006, +f.dataset.w / 100)})`; // sisakan ruang untuk label nilai
  const grow = (root) => requestAnimationFrame(() => root.querySelectorAll('.zb-f').forEach((f) => { if (!f.closest('.zb-z:not(.open) .zb-list')) f.style.width = barW(f); }));
  grow(el);
  el.querySelector('.zb').onclick = (e) => {
    const h = e.target.closest('.zb-head'), w = e.target.closest('.zb-wh');
    if (h) { const z = h.dataset.z, box = h.parentNode; st.open.has(z) ? st.open.delete(z) : st.open.add(z); box.classList.toggle('open'); h.setAttribute('aria-expanded', box.classList.contains('open'));
      box.querySelectorAll('.zb-list .zb-f').forEach((f) => (f.style.width = box.classList.contains('open') ? barW(f) : '0')); }
    if (w) { const p = w.dataset.p; st.wh.has(p) ? st.wh.delete(p) : st.wh.add(p); route(); }
  };
}

function drawTop(pool, idrOf, cmoney) {
  const T = S.dashTop || (S.dashTop = Object.assign({ n: '10', by: 'value', agg: 'wh' }, store.get('dashTop') || {}));
  const save = () => { store.set('dashTop', T); drawTop(pool, idrOf, cmoney); };
  let rows = pool.map((i) => ({ material: i.material, desc: i.desc, uom: i.uom, soh: i.soh || 0, idr: idrOf(i), plants: [i.plant], abc: i._abc }));
  if (T.agg === 'mat') {
    const m = new Map(); const rank = { A: 0, B: 1, C: 2 };
    rows.forEach((r) => { const g = m.get(r.material); if (!g) m.set(r.material, Object.assign({}, r, { plants: [...r.plants] }));
      else { g.soh += r.soh; g.idr += r.idr; g.plants.push(...r.plants); if (rank[r.abc] < rank[g.abc]) g.abc = r.abc; } });
    rows = [...m.values()];
  }
  rows.forEach((r) => (r.unit = r.soh > 0 ? r.idr / r.soh : 0));
  const key = { value: (r) => r.idr, unit: (r) => r.unit, qty: (r) => r.soh }[T.by];
  rows.sort((a, b) => key(b) - key(a));
  const n = T.n.startsWith('p') ? Math.ceil(rows.length * +T.n.slice(1) / 100) : +T.n;
  const top = rows.slice(0, n), sum = top.reduce((a, r) => a + r.idr, 0), all = rows.reduce((a, r) => a + r.idr, 0);
  const sel = (id, label, opts, v, on) => { $(id).innerHTML = `<label class="select"><span>${label}</span><select class="bare">${opts.map(([k, t]) => `<option value="${k}"${k === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`; $(id).querySelector('select').onchange = (e) => on(e.target.value); };
  sel('tN', 'Tampilkan', [['10', 'Top 10'], ['20', 'Top 20'], ['50', 'Top 50'], ['100', 'Top 100'], ['p5', 'Top 5% item'], ['p10', 'Top 10% item'], ['p20', 'Top 20% item']], T.n, (v) => { T.n = v; save(); });
  sel('tBy', 'Urut menurut', [['value', 'Nilai stok (total)'], ['unit', 'Harga per unit'], ['qty', 'Qty stok']], T.by, (v) => { T.by = v; save(); });
  UI.seg($('tAgg'), [['wh', 'Per warehouse'], ['mat', 'Gabung per material']], T.agg, (v) => { T.agg = v; save(); });
  const cols = [
    { label: 'Material', nowrap: true, get: (r) => r.material, html: (r) => `<a class="mono mlink" href="#" data-mat="${esc(r.material)}">${esc(r.material)}</a>` },
    { label: 'Deskripsi', wide: true, get: (r) => r.desc },
    { label: T.agg === 'mat' ? 'Warehouse' : 'Warehouse', get: (r) => (r.plants.length > 1 ? r.plants.length + ' warehouse' : plantLabel(r.plants[0])), title: '' },
    { label: 'Stok', num: true, filter: false, get: (r) => r.soh, html: (r) => fmt(r.soh) + ' ' + esc(r.uom) },
    { label: 'Harga per unit', num: true, filter: false, get: (r) => r.unit, html: (r) => cmoney(r.unit) },
    { label: 'Nilai stok', num: true, filter: false, get: (r) => r.idr, html: (r) => cmoney(r.idr) },
    { label: 'Porsi', num: true, filter: false, get: (r) => (all ? r.idr / all : 0), html: (r) => (all ? fmt((r.idr / all) * 100, 1) + '%' : '') },
    { label: 'Kelas', get: (r) => r.abc },
  ];
  $('tTop').innerHTML = `<p class="source">${fmt(top.length, 0)} dari ${fmt(rows.length, 0)} ${T.agg === 'mat' ? 'material' : 'baris material×warehouse'}, total ${cmoney(sum)} (${all ? fmt((sum / all) * 100, 1) : 0}% dari nilai stok terpilih).</p><div id="tTopT"></div>`;
  UI.table($('tTopT'), { id: 'dash-top-' + T.agg, rows: top, cols, name: 'Material terbesar', match: (r, q) => hit(r.material + ' ' + r.desc, expand(q)), placeholder: 'Cari di daftar ini…' });
}

// Beranda: Analisis ABC = kelas nilai × kelas pergerakan (aging), lengkap dengan insight dan tindakan sesuai Pedoman
function drawABC(pool, idrOf, cmoney, selTxt) {
  const A = S.abc || (S.abc = Object.assign({ basis: 'stok', cell: '' }, store.get('abcSet') || {}));
  const save = () => { store.set('abcSet', A); drawABC(pool, idrOf, cmoney, selTxt); };
  const AG = ['FS', 'MD', 'SP', 'DS', 'PJ', '–'], AGN = { FS: 'Fast', MD: 'Moderate', SP: 'Slow', DS: 'Dead stock', PJ: 'Project (belum terpakai)', '–': 'Belum dipantau MRP' };
  const rows = pool.map((i) => {
    const r = S.mrpRes && S.mrpRes.get(i.material + '|' + i.plant), idr = idrOf(i), unit = i.soh > 0 ? idr / i.soh : 0;
    const u12 = r && r.usageAll ? r.usageAll.slice(-12).reduce((a, v) => a + Math.abs(v || 0), 0) : 0;
    return { material: i.material, desc: i.desc, uom: i.uom, plant: i.plant, soh: i.soh, idr, unit, u12, use: u12 * unit, aging: (r && r.aging) || '–', r,
      cover: r && r.amu > 0 ? i.soh / r.amu : null, surplusV: r && r.berlebih && r.max2 != null ? Math.max(0, i.soh - r.max2) * unit : 0 };
  });
  // kelas ABC menurut dasar yang dipilih
  const val = A.basis === 'pakai' ? (x) => x.use : (x) => x.idr;
  const tot = rows.reduce((a, x) => a + val(x), 0); let cum = 0, nA = 0;
  [...rows].sort((a, b) => val(b) - val(a)).forEach((x) => { const v = val(x); if (v <= 0) { x.k = 'C'; return; } cum += v; x.k = cum / tot <= 0.8 || !nA ? 'A' : cum / tot <= 0.95 ? 'B' : 'C'; if (x.k === 'A') nA++; });
  const sum = (xs) => xs.reduce((a, x) => a + x.idr, 0), allV = sum(rows);
  const cell = (k, g) => rows.filter((x) => x.k === k && x.aging === g);
  const pc = (a, b) => (b ? fmt((a / b) * 100, 1) + '%' : '0%');
  // tindakan per baris
  const act = (x) => { const r = x.r;
    if (x.aging === 'DS') return ['bad', 'Tawarkan ke plant/WK lain, lalu usul penghapusan'];
    if (x.aging === 'SP') return ['bad', 'Cek prospek dan peralatan induk, tawarkan ke yang butuh'];
    if (r && r.berlebih) return ['warn', 'Stop order, transfer kelebihan ke plant lain'];
    if (r && r.toOrder > 0) return r.contract ? ['', 'Terbitkan RO lewat OA ' + r.contract.doc] : ['warn', 'Perlu order tanpa kontrak, usulkan OA/COO'];
    if (x.aging === 'MD') return ['', 'Pantau, konfirmasi kebutuhan ke user'];
    if (x.aging === 'PJ') return ['', 'Material project: tunggu pemakaian proyek, bukan dead stock'];
    if (x.aging === '–') return ['', 'Belum dipantau MRP'];
    return ['ok', 'Aman, pantau Min/Max']; };
  rows.forEach((x) => (x.act = act(x)));
  // insight
  const kA = rows.filter((x) => x.k === 'A'), kC = rows.filter((x) => x.k === 'C');
  const idleA = kA.filter((x) => ['MD', 'SP', 'DS'].includes(x.aging)), deadAll = rows.filter((x) => x.aging === 'DS' || x.aging === 'SP');
  const lebih = rows.filter((x) => x.k !== 'C' && x.r && x.r.berlebih), noOA = rows.filter((x) => x.k !== 'C' && x.r && x.r.toOrder > 0 && !x.r.contract);
  const unmon = rows.filter((x) => x.aging === '–'), deadC = kC.filter((x) => x.aging === 'DS');
  const ins = [];
  if (A.basis === 'pakai') ins.push(['', `<b>${fmt(kA.length, 0)} baris kelas A</b> (${pc(kA.length, rows.length)} dari semua baris) menyerap 80% nilai pemakaian 12 bulan, yaitu <b>${cmoney(kA.reduce((a, x) => a + x.use, 0))}</b> per tahun, dengan stok tertahan ${cmoney(sum(kA))}. Ini material yang paling sering dibeli: pastikan semuanya tercover OA dan Min/Max di-review tiap bulan.`]);
  else ins.push(['', `<b>${fmt(kA.length, 0)} baris kelas A</b> (${pc(kA.length, rows.length)} dari semua baris) menyimpan <b>${cmoney(sum(kA))}</b> (${pc(sum(kA), allV)} nilai stok). Kontrol paling ketat di sini: review Min/Max tiap bulan dan pastikan semua tercover OA.`]);
  if (idleA.length) ins.push(['bad', `<b>${cmoney(sum(idleA))}</b> stok kelas A (${fmt(idleA.length, 0)} baris) tidak dipakai 12 bulan terakhir. Cek prospek pemakaian dan peralatan induknya, tawarkan ke plant atau WK lain (lewat MTA), dan yang lebih dari 5 tahun diusulkan dead stock.`, 'MD,SP,DS', 'A']);
  if (deadAll.length) ins.push(['bad', `Slow moving dan dead stock di semua kelas: <b>${cmoney(sum(deadAll))}</b> (${pc(sum(deadAll), allV)} nilai stok, ${fmt(deadAll.length, 0)} baris). Ini target penyehatan persediaan (A7-003 §4.f).`]);
  if (lebih.length) ins.push(['warn', `<b>${fmt(lebih.length, 0)} baris kelas A/B berlebih</b> (stok lebih dari 12 bulan pemakaian, chemical 5 bulan). Kelebihan di atas Max bernilai <b>${cmoney(lebih.reduce((a, x) => a + x.surplusV, 0))}</b>. Jangan dipesan ulang, transfer ke plant yang butuh.`]);
  if (noOA.length) ins.push(['warn', `<b>${fmt(noOA.length, 0)} baris kelas A/B perlu order tapi belum ada kontrak</b>. Setiap order jadi PR + OE (±5,5 bulan). Usulkan masuk OA/COO jangka panjang (Kraljic bottleneck).`]);
  if (unmon.length) ins.push(['', `<b>${cmoney(sum(unmon))}</b> (${pc(sum(unmon), allV)}) ada di plant yang belum dipantau MRP, jadi aging dan tindakannya belum bisa dihitung. Tambahkan plant di <a href="#/pengaturan">Pengaturan</a> kalau perlu.`]);
  ins.push(['ok', `Kelas C: ${fmt(kC.length, 0)} baris (${pc(kC.length, rows.length)}).${A.basis === 'pakai' ? ` Termasuk semua material tanpa pemakaian 12 bulan, dengan stok tertahan ${cmoney(sum(kC))}.` : ` Hanya ${pc(sum(kC), allV)} nilai stok.`} Cukup review setahun sekali.${deadC.length ? ` ${fmt(deadC.length, 0)} di antaranya dead stock, bisa diusulkan penghapusan sekaligus.` : ''}`]);
  // cell terpilih (default: A × tidak bergerak paling bernilai)
  if (!A.cell || !A.cell.includes('|')) { const c = ['A|DS', 'A|SP', 'A|MD', 'B|DS', 'B|SP', 'A|FS'].find((c) => cell(...c.split('|')).length); A.cell = c || 'A|FS'; }
  const [ck, cg] = A.cell.split('|'), list = cell(ck, cg).sort((a, b) => b.idr - a.idr);
  const risk = (k, g) => k !== 'C' && (g === 'SP' || g === 'DS');
  $('abcPanel').innerHTML = `<div class="panel-h"><h2>Analisis ABC</h2><span class="sub">A = 80% nilai teratas, B = 15% berikutnya, C = sisanya ${infoI('Material mana yang paling mahal, dan mana yang diam di gudang.')}</span><span class="right" id="abcBasis"></span></div>
    <div class="abc-grid"><div><h4 class="sub-h">Kelas nilai × pergerakan <small class="muted">klik sel untuk melihat daftarnya</small></h4><div class="plain-wrap"><table class="plain abc-m"><tr><th>Kelas</th>${AG.map((g) => `<th class="num" title="${AGN[g]}">${g === '–' ? 'Tanpa MRP' : g}</th>`).join('')}<th class="num">Total</th></tr>
      ${['A', 'B', 'C'].map((k) => `<tr><th>${k}</th>${AG.map((g) => { const xs = cell(k, g); return `<td class="num${xs.length ? ' pick' : ''}${A.cell === k + '|' + g ? ' on' : ''}${risk(k, g) && xs.length ? ' risk' : ''}" data-c="${k}|${g}">${xs.length ? `<b>${cmoney(sum(xs))}</b><small>${fmt(xs.length, 0)} baris</small>` : '<span class="muted">–</span>'}</td>`; }).join('')}
        <td class="num"><b>${cmoney(sum(rows.filter((x) => x.k === k)))}</b><small>${fmt(rows.filter((x) => x.k === k).length, 0)} baris</small></td></tr>`).join('')}</table></div>
      <p class="muted small" style="margin-top:6px">Sel merah = nilai besar yang tidak bergerak. ${infoI(`Aging dihitung dari semua pemakaian (MRP + semua gerakan keluar MB51, termasuk GI ke proyek), bukan aging bawaan MRP. FS dipakai ≤ 12 bulan, MD ≤ 24 bulan, SP ≤ 60 bulan, DS lebih dari 60 bulan tidak dipakai (B7-004). PJ = klasifikasi Project di MRP yang belum pernah terpakai, bukan dead stock. Angka di sel = nilai stok. Sel merah = nilai besar yang tidak bergerak.${A.basis === 'pakai' ? ' Dengan dasar pemakaian, material yang tidak dipakai 12 bulan otomatis masuk kelas C.' : ''}`)}</p></div>
      <div><h4 class="sub-h">Insight dan tindakan</h4><ul class="reco abc-ins">${ins.map(([c, t]) => `<li class="${c}"><span>${brief(t)}</span></li>`).join('')}</ul></div></div>
    <h4 class="sub-h">Kelas ${esc(ck)}, ${esc(AGN[cg])}: ${fmt(list.length, 0)} baris, ${cmoney(sum(list))}</h4><div id="abcList"></div>`;
  UI.seg($('abcBasis'), [['stok', 'Dasar: nilai stok'], ['pakai', 'Dasar: nilai pemakaian 12 bln']], A.basis, (v) => { A.basis = v; A.cell = ''; save(); });
  $('abcPanel').querySelectorAll('td.pick').forEach((td) => (td.onclick = () => { A.cell = td.dataset.c; save(); }));
  UI.table($('abcList'), { id: 'dash-abc', rows: list, name: `ABC ${ck} ${cg}`, match: (x, q) => hit(x.material + ' ' + x.desc, expand(q)), placeholder: 'Cari di daftar ini…', cols: [
    { label: 'Material', nowrap: true, get: (x) => x.material, html: (x) => `<a class="mono mlink" href="#" data-mat="${esc(x.material)}">${esc(x.material)}</a>` },
    { label: 'Deskripsi', wide: true, get: (x) => x.desc },
    { label: 'Warehouse', get: (x) => plantLabel(x.plant) },
    { label: 'Stok', num: true, filter: false, get: (x) => x.soh, html: (x) => fmt(x.soh) + ' ' + esc(x.uom) },
    { label: 'Nilai stok', num: true, filter: false, get: (x) => x.idr, html: (x) => cmoney(x.idr) },
    { label: 'Pakai', sub: '12 bulan', num: true, filter: false, get: (x) => (x.r ? x.u12 : null), html: (x) => (x.r ? fmt(x.u12) : '') },
    { label: 'Cakupan', sub: 'bulan', num: true, filter: false, get: (x) => x.cover, html: (x) => (x.cover == null ? (x.r ? '∞' : '') : fmt(x.cover, 1)) },
    { label: 'Tindakan', wide: true, get: (x) => x.act[1], html: (x) => `<span class="st wrap ${x.act[0] === 'bad' ? 'low' : x.act[0] === 'warn' ? 'warn' : x.act[0] === 'ok' ? 'ok' : 'mute'}">${esc(x.act[1])}</span>` },
  ] });
}
