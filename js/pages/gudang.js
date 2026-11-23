// ============ Analisis Warehouse: ringkasan all-in-one per Warehouse/Plant untuk Inventory Analyst ============
// Isi: (1) nilai total inventory + status material per plant (perlu order), (2) persebaran aging (klik sel = daftar material),
// (3) analisis ABC nilai material (klik kelas = daftar), (4) pergerakan material, reservasi, dan OS PO/RO per plant (klik sel = halaman fiturnya).
// Filter: Plant (checkbox) + rentang tanggal (hanya untuk Pergerakan). Ikut toggle WK kanan atas. Nilai dalam IDR (kurs di Pengaturan).
// Menggantikan halaman lama di beranda.js (kode lama tidak dipakai lagi).
PAGES.gudang = function () {
  if (!S.mb52 && !S.mrpRes) { $('view').innerHTML = needFile('MB52', 'Analisis Warehouse dihitung dari stok MB52 (dan MRP untuk status serta aging).'); return; }
  MP.zonaHook = () => PAGES.gudang();
  const F = (S.fw = S.fw || { plant: new Set(), from: '', to: '' }), mrpMap = S.mrpRes || new Map(), sum = (a, f) => a.reduce((t, x) => t + (f(x) || 0), 0);
  const AG = ['FS', 'MD', 'SP', 'DS', 'PJ', ''], AGN = { FS: 'Fast', MD: 'Moderate', SP: 'Slow', DS: 'Dead stock', PJ: 'Project', '': 'Tanpa MRP' };
  const R = (S.mb52 ? S.mb52.items : []).map((i) => { const r = mrpMap.get(i.material + '|' + i.plant), q = (i.sohNormal != null ? i.sohNormal : i.soh) || 0;
    return { p: i.plant, m: i.material, desc: i.desc, uom: i.uom, q, v: toIDRv(i.value, stockCur(i.plant)), ag: r ? r.aging || '' : '', r, k: r ? MP.pos(r.stock, r) : '' }; }).filter((x) => x.q > 0 || x.v > 0);
  const plantsAll = [...new Set([...R.map((x) => x.p), ...[...mrpMap.values()].map((r) => r.plant)])].filter((p) => G.zonaOk(p)).sort();
  $('view').innerHTML = '<div id="fb"></div><div id="kp"></div><div id="s1"></div><div id="s2"></div><div id="s3"></div><div id="s4"></div>';
  const sec = (id, title, note, extra) => { $(id).innerHTML = `<section class="blk"><div class="blk-h"><h3>${esc(title)}</h3><span class="muted small">${esc(note || '')}</span>${extra ? `<span class="blk-a">${extra}</span>` : ''}</div><div class="blk-b"></div></section>`; return $(id).querySelector('.blk-b'); };
  const toCtl = (p, pos) => { S.ovMode = 'dt'; S.fc = { q: '', plant: new Set([p]), pos: new Set(pos || []), _init: 1 }; location.hash = '#/control'; };
  const list = (title, rows, cols, name, onRow) => { const b = UI.drawer(`<div class="mhead"><h2>${esc(title)}</h2><div class="meta"><span>${fmt(rows.length, 0)} baris · ${esc(money(sum(rows, (x) => x.v), 'IDR'))}</span></div></div><div id="gl"></div>`, { wide: true, label: title });
    T.table(b.querySelector('#gl'), { rows: rows.slice().sort((a, b2) => b2.v - a.v), pageSize: 15, name, cols, onRow: onRow || ((x) => MP.detail(x.m, x.p)) }); };
  const matCols = [{ label: 'Material', w: 3, get: (x) => x.desc, html: (x) => T.two(x.desc || x.m, x.m + ' · ' + (x.uom || '')) }, { label: 'Plant', w: 0.6, get: (x) => x.p }, { label: 'Aging', type: 'status', w: 0.7, get: (x) => x.ag, html: (x) => agingPill(x.ag || '-') },
    { label: 'Stok', type: 'num', w: 0.8, get: (x) => x.q }, { label: 'Nilai (IDR)', type: 'num', w: 1.1, get: (x) => x.v, html: (x) => esc(money(x.v, 'IDR')) }, { label: 'Status', type: 'status', w: 1.1, get: (x) => MP.POS[x.k][0], html: (x) => MP.posPill(x.k) }];
  const draw = () => {
    const P = plantsAll.filter((p) => T.has(F, 'plant', p)), Rs = R.filter((x) => P.includes(x.p));
    const M = [...mrpMap.values()].filter((r) => P.includes(r.plant) && S.mrpPlants.has(r.plant)).map((r) => ({ r, k: MP.pos(r.stock, r) }));
    const total = sum(Rs, (x) => x.v), open = (S.mb25 ? S.mb25.lines : []).filter((l) => P.includes(l.plant) && ['open', 'late'].includes(KX.rvSt(l))), po = (S.me2n ? S.me2n.lines : []).filter((l) => P.includes(l.plant) && ['open', 'late'].includes(KX.poSt(l)));
    $('kp').innerHTML = T.kpis([['Nilai total inventory', esc(money(total, 'IDR')), fmt(P.length, 0) + ' plant · ' + fmt(Rs.length, 0) + ' material', 'k-max'], ['Perlu order', fmt(M.filter((x) => x.r.toOrder > 0).length, 0), 'material x plant dengan To Order', 'k-low'],
      ['Nilai dead stock', esc(money(sum(Rs.filter((x) => x.ag === 'DS'), (x) => x.v), 'IDR')), fmt(Rs.filter((x) => x.ag === 'DS').length, 0) + ' material', 'k-min'], ['Reservasi terbuka', fmt(open.length, 0), fmt(open.filter((l) => KX.rvSt(l) === 'late').length, 0) + ' lewat tgl butuh', 'k-min'],
      ['PO/RO berjalan', fmt(po.length, 0), fmt(po.filter((l) => KX.poSt(l) === 'late').length, 0) + ' terlambat', 'k-ok']]);

    // 1) nilai + status per plant
    const rows1 = P.map((p) => { const rr = Rs.filter((x) => x.p === p), mm = M.filter((x) => x.r.plant === p), n = (k) => mm.filter((x) => x.k === k).length;
      return { p, n: rr.length, v: sum(rr, (x) => x.v), low: n('low'), min: n('min'), ok: n('ok'), max: n('max'), ord: mm.filter((x) => x.r.toOrder > 0).length }; });
    const b1 = sec('s1', '1. Nilai inventory dan status material per Warehouse', 'klik angka status = Material Control Detail terfilter; klik nama = fokus ke warehouse itu');
    T.table(b1, { rows: rows1, pageSize: 30, name: 'Gudang_Nilai_Status', empty: 'Tidak ada data.', cols: [
      { label: 'Warehouse', w: 2, get: (x) => plantLabel(x.p), html: (x) => T.two(PLANT_NAME[x.p] || x.p, x.p + ' · WK ' + (wkOfPlant(x.p) || '-')), onCell: (x) => { F.plant = new Set([x.p]); if (T._repaint) T._repaint(); draw(); } },
      { label: 'Material', type: 'num', w: 0.7, get: (x) => x.n }, { label: 'Nilai (IDR)', type: 'num', w: 1.1, get: (x) => x.v, html: (x) => esc(money(x.v, 'IDR')) },
      { label: '% nilai', w: 1.3, get: (x) => (total ? x.v / total : 0), html: (x) => `<span class="bar-in"><i style="width:${total ? Math.max(1, (x.v / total) * 100).toFixed(1) : 0}%"></i></span> ${fmt(total ? (x.v / total) * 100 : 0, 0)}%` },
      { label: 'Di bawah SS', type: 'num', w: 0.8, get: (x) => x.low || null, cls: (x) => (x.low ? 'mx-low' : ''), onCell: (x) => toCtl(x.p, ['low']) }, { label: 'Di bawah Min', type: 'num', w: 0.8, get: (x) => x.min || null, cls: (x) => (x.min ? 'mx-min' : ''), onCell: (x) => toCtl(x.p, ['min']) },
      { label: 'Normal', type: 'num', w: 0.7, get: (x) => x.ok || null, cls: (x) => (x.ok ? 'mx-ok' : ''), onCell: (x) => toCtl(x.p, ['ok']) }, { label: 'Di atas Max', type: 'num', w: 0.8, get: (x) => x.max || null, cls: (x) => (x.max ? 'mx-max' : ''), onCell: (x) => toCtl(x.p, ['max']) },
      { label: 'Perlu order', type: 'num', w: 0.8, get: (x) => x.ord || null, cls: () => 'b', onCell: (x) => toCtl(x.p, ['low', 'min']) }] });

    // 2) persebaran aging
    const mode = S.fwAg === 'v' ? 'v' : 'n';
    const b2 = sec('s2', '2. Persebaran aging material', 'klik sel = daftar material', '<span id="agSeg"></span>');
    const agRow = (p, label) => { const rr = Rs.filter((x) => p === '*' || x.p === p), o = { p, label, cells: {} }; AG.forEach((a) => { const z = rr.filter((x) => x.ag === a); o.cells[a] = { n: z.length, v: sum(z, (x) => x.v), rows: z }; }); o.n = rr.length; o.v = sum(rr, (x) => x.v); o.rows = rr; return o; };
    const rows2 = P.map((p) => agRow(p, plantLabel(p))).concat([agRow('*', 'Semua plant terpilih')]), show = (c) => (mode === 'v' ? c.v || null : c.n || null), html = (c) => (mode === 'v' ? (c.v ? esc(money(c.v, 'IDR')) : '') : c.n ? fmt(c.n, 0) : '');
    T.table(b2, { rows: rows2, pageSize: 40, name: 'Gudang_Aging', cols: [{ label: 'Warehouse', w: 1.8, get: (x) => x.label, cls: (x) => (x.p === '*' ? 'b' : '') },
      ...AG.map((a) => ({ label: a ? `${a} ${AGN[a]}` : 'Tanpa MRP', type: 'num', w: 1, get: (x) => show(x.cells[a]), html: (x) => html(x.cells[a]), cls: (x) => (a === 'DS' && x.cells[a].n ? 'mx-low' : x.p === '*' ? 'b' : ''),
        onCell: (x) => list(`Aging ${a ? a + ' ' + AGN[a] : 'Tanpa MRP'} · ${x.label}`, x.cells[a].rows, matCols, 'Aging_' + (a || 'tanpa_MRP'))})),
      { label: 'Total', type: 'num', w: 1, get: (x) => (mode === 'v' ? x.v : x.n), html: (x) => (mode === 'v' ? esc(money(x.v, 'IDR')) : fmt(x.n, 0)), cls: () => 'b', onCell: (x) => list('Semua aging · ' + x.label, x.rows, matCols, 'Aging_semua') }] });
    UI.seg($('agSeg'), [['n', 'Jumlah material'], ['v', 'Nilai']], mode, (v) => { S.fwAg = v; draw(); });

    // 3) ABC
    const byMat = new Map(); Rs.forEach((x) => { const o = byMat.get(x.m) || byMat.set(x.m, { m: x.m, desc: x.desc, uom: x.uom, v: 0, q: 0, ds: 0, plants: new Set(), p: '' }).get(x.m); o.v += x.v; o.q += x.q; if (x.ag === 'DS') o.ds += x.v; o.plants.add(x.p); });
    const mats = [...byMat.values()].filter((o) => o.v > 0).sort((a, b) => b.v - a.v); let cum = 0; mats.forEach((o) => { o.cum = total ? (cum += o.v) / total : 0; o.cls = o.cum - o.v / total < 0.8 ? 'A' : o.cum - o.v / total < 0.95 ? 'B' : 'C'; o.p = [...o.plants].length > 1 ? o.plants.size + ' plant' : [...o.plants][0]; });
    const cls = ['A', 'B', 'C'].map((c) => { const z = mats.filter((o) => o.cls === c); return { c, z, n: z.length, v: sum(z, (o) => o.v), ds: sum(z, (o) => o.ds) }; });
    const abcCols = [{ label: 'Material', w: 3, get: (x) => x.desc, html: (x) => T.two(x.desc || x.m, x.m + ' · ' + (x.uom || '')) }, { label: 'Plant', w: 0.8, get: (x) => x.p }, { label: 'Stok', type: 'num', w: 0.8, get: (x) => x.q }, { label: 'Nilai (IDR)', type: 'num', w: 1.1, get: (x) => x.v, html: (x) => esc(money(x.v, 'IDR')) },
      { label: '% kumulatif', type: 'num', w: 0.8, get: (x) => x.cum * 100, html: (x) => fmt(x.cum * 100, 1) + '%' }, { label: 'Kelas', type: 'status', w: 0.6, get: (x) => x.cls, html: (x) => T.pill(x.cls, x.cls === 'A' ? 'low' : x.cls === 'B' ? 'warn' : 'mute') }];
    T.table(sec('s3', '3. Analisis ABC (nilai material)', 'A = 80% nilai teratas, B = 15% berikutnya, C = sisanya; klik kelas = daftar material'), { rows: cls, pageSize: 5, name: 'Gudang_ABC', empty: 'Tidak ada nilai stok.', onRow: (x) => list(`Kelas ${x.c} · ${fmt(x.n, 0)} material`, x.z, abcCols, 'ABC_' + x.c, (o) => MP.detail(o.m, o.plants.size === 1 ? [...o.plants][0] : null)), cols: [
      { label: 'Kelas', type: 'status', w: 0.6, get: (x) => x.c, html: (x) => T.pill(x.c, x.c === 'A' ? 'low' : x.c === 'B' ? 'warn' : 'mute') }, { label: 'Material', type: 'num', w: 0.8, get: (x) => x.n }, { label: '% material', type: 'num', w: 0.8, get: (x) => (mats.length ? (x.n / mats.length) * 100 : 0), html: (x) => fmt(mats.length ? (x.n / mats.length) * 100 : 0, 1) + '%' },
      { label: 'Nilai (IDR)', type: 'num', w: 1.2, get: (x) => x.v, html: (x) => esc(money(x.v, 'IDR')) }, { label: '% nilai', type: 'num', w: 0.8, get: (x) => (total ? (x.v / total) * 100 : 0), html: (x) => fmt(total ? (x.v / total) * 100 : 0, 1) + '%' },
      { label: 'Nilai dead stock', type: 'num', w: 1.2, get: (x) => x.ds || null, html: (x) => (x.ds ? esc(money(x.ds, 'IDR')) : ''), cls: (x) => (x.ds ? 'mx-low' : '') }] });

    // 4) pergerakan, reservasi, OS PO/RO
    const mv = (S.mb51 ? S.mb51.moves : []).filter((m) => m.date && P.includes(m.plant) && m.cat !== 'Not Included' && T.inRange(m.date, F)), idr = (m) => Math.abs(toIDRv(m.amount, m.cur || stockCur(m.plant)));
    const rows4 = P.map((p) => { const a = mv.filter((m) => m.plant === p), rv = open.filter((l) => l.plant === p), pp = po.filter((l) => l.plant === p);
      return { p, inn: sum(a.filter((m) => m.qty > 0), idr), out: sum(a.filter((m) => m.qty < 0), idr), use: sum(a.filter((m) => m.cat === 'Own Use'), idr), rv: rv.length, rvLate: rv.filter((l) => KX.rvSt(l) === 'late').length, po: pp.length, poLate: pp.filter((l) => KX.poSt(l) === 'late').length, poV: sum(pp, (l) => toIDRv(l.openValue, l.currency)) }; });
    const toGerak = (p, cat) => { S.fg = { q: '', plant: new Set([p]), from: F.from, to: F.to, cat: new Set(cat || []), _init: cat ? 1 : 0 }; location.hash = '#/gerak'; };
    const toPO = (p, tab, st) => { S.psTab = tab; (tab === 'po' ? (S.fp = { q: '', plant: new Set([p]), from: '', to: '', st: new Set(st), _init: 1 }) : (S.fr = { q: '', plant: new Set([p]), from: '', to: '', st: new Set(st), _init: 1 })); location.hash = '#/po'; };
    const nm = (v) => (v ? esc(money(v, 'IDR')) : '');
    const t4 = sec('s4', '4. Pergerakan material, reservasi, dan OS PO/RO', 'pergerakan mengikuti Dari/Sampai (kosong = semua data); klik sel = halaman fiturnya');
    T.table(t4, { rows: rows4, pageSize: 30, name: 'Gudang_Pergerakan', empty: 'Tidak ada data.', cols: [{ label: 'Warehouse', w: 1.8, get: (x) => plantLabel(x.p), html: (x) => T.two(PLANT_NAME[x.p] || x.p, x.p) },
      { label: 'Barang masuk', type: 'num', w: 1.1, get: (x) => x.inn || null, html: (x) => nm(x.inn), onCell: (x) => toGerak(x.p) }, { label: 'Barang keluar', type: 'num', w: 1.1, get: (x) => x.out || null, html: (x) => nm(x.out), onCell: (x) => toGerak(x.p) },
      { label: 'Pemakaian (Own Use)', type: 'num', w: 1.2, get: (x) => x.use || null, html: (x) => nm(x.use), onCell: (x) => toGerak(x.p, ['Own Use']) },
      { label: 'Reservasi terbuka', type: 'num', w: 0.9, get: (x) => x.rv || null, onCell: (x) => toPO(x.p, 'resv', ['open', 'late']) }, { label: 'Lewat tgl butuh', type: 'num', w: 0.9, get: (x) => x.rvLate || null, cls: (x) => (x.rvLate ? 'neg' : ''), onCell: (x) => toPO(x.p, 'resv', ['late']) },
      { label: 'PO/RO berjalan', type: 'num', w: 0.9, get: (x) => x.po || null, onCell: (x) => toPO(x.p, 'po', ['open', 'late']) }, { label: 'Terlambat', type: 'num', w: 0.8, get: (x) => x.poLate || null, cls: (x) => (x.poLate ? 'neg' : ''), onCell: (x) => toPO(x.p, 'po', ['late']) },
      { label: 'Sisa kirim (IDR)', type: 'num', w: 1.1, get: (x) => x.poV || null, html: (x) => nm(x.poV), onCell: (x) => toPO(x.p, 'po', ['open', 'late']) }] });
  };
  T.filters($('fb'), { plants: plantsAll, dates: true }, F, draw);
  draw();
};
