// ============ Material Analysis: satu halaman ringkas per material ============
// Cari nama/kode material atau nomor dokumen (PO/RO, PR, OA, reservasi). Hasil: kartu ringkas + blok pendek Stok, PO/RO, Reservasi, Kontrak
// (maks 5 baris, "Lihat semua" membuka halaman fiturnya dengan pencarian terisi) + jejak waktu. Filter Plant dan rentang tanggal berlaku untuk semua blok
// yang punya plant/tanggal (stok MB52 = posisi terkini, tidak ikut filter tanggal; kontrak tidak punya plant/tanggal).
PAGES.analysis = function () {
  const F = (S.fa = S.fa || { q: '', plant: '', from: '', to: '', year: '' });
  const pre = sessionStorage.getItem('lacakQ'); if (pre) { F.q = pre; sessionStorage.removeItem('lacakQ'); }
  if (!S.mb52 && !S.mrpRes && !S.me2n) { $('view').innerHTML = needFile('MB52, MRP, atau ME2N', 'Material Analysis membaca stok, PO/RO, reservasi, kontrak, dan gerakan material.'); return; }
  const all = (k, f) => (S[k] ? S[k][k === 'mb52' ? 'items' : k === 'mb51' ? 'moves' : 'lines'].map(f) : []);
  const plants = [...new Set([...all('mb52', (i) => i.plant), ...all('me2n', (l) => l.plant), ...all('mb25', (l) => l.plant)])].filter((p) => p && G.zonaOk(p)).sort();
  const years = T.years([...all('me2n', (l) => l.delivery), ...all('mb25', (l) => l.reqDate), ...all('mb51', (m) => m.date)]);
  $('view').innerHTML = '<div id="fb"></div><div id="ar" class="view-root"></div>';
  const draw = () => {
    const q = F.q, ar = $('ar');
    if (S.faQ !== q) { S.faQ = q; S.faMat = null; }
    if (!q) { ar.innerHTML = '<div class="hint">Ketik nama atau kode material, atau nomor PO/RO, PR, OA, atau reservasi.</div>'; return; }
    const mi = matIndex().map, mats = new Set();
    if (mi.has(q)) mats.add(q);
    if (S.me2n) S.me2n.lines.forEach((l) => { if (l.doc === q || l.pr === q || l.oa === q) mats.add(l.material); });
    if (S.mb25) S.mb25.lines.forEach((l) => { if (l.resv === q) mats.add(l.material); });
    if (S.me3n) S.me3n.items.forEach((i) => { if (i.doc === q) mats.add(i.material); });
    mats.delete(''); mats.delete(undefined);
    const cand = mats.size ? [...mats] : [...mi.values()].filter((o) => T.match(o.material + ' ' + o.desc, q)).map((o) => o.material);
    if (!cand.length) { ar.innerHTML = '<div class="hint">Tidak ditemukan di data yang dimuat.</div>'; return; }
    if (cand.length === 1 || (S.faMat && cand.includes(S.faMat))) return one(S.faMat || cand[0], cand.length > 1);
    ar.innerHTML = `<div class="blk-h"><h3>${fmt(cand.length, 0)} material cocok dengan "${esc(q)}"</h3></div><div id="cand"></div>`;
    T.table($('cand'), { rows: cand.map((m) => mi.get(m) || { material: m, desc: '', uom: '', stock: new Map(), mrp: new Map() }), pageSize: 15, onRow: (o) => { S.faMat = o.material; draw(); }, cols: [
      { label: 'Material', w: 3.4, get: (o) => o.desc, html: (o) => T.two(o.desc || o.material, o.material) }, { label: 'Satuan', w: 0.6, get: (o) => o.uom },
      { label: 'Stok', type: 'num', w: 0.8, get: (o) => [...o.stock.values()].reduce((a, b) => a + b, 0) }, { label: 'Plant', type: 'num', w: 0.6, get: (o) => o.stock.size },
      { label: 'Status', type: 'status', w: 1.2, get: (o) => MP.POS[st(o)][0], html: (o) => MP.posPill(st(o)) }] });
  };
  const st = (o) => MP.worst([...o.mrp.values()].filter((r) => S.mrpPlants.has(r.plant)).map((r) => MP.pos(r.stock, r)));
  const one = (m, back) => {
    const o = matIndex().map.get(m) || null, inP = (x) => G.zonaOk(x.plant) && (!F.plant || x.plant === F.plant), nrm = (i) => (i.sohNormal != null ? i.sohNormal : i.soh) || 0;
    const its = o ? o.items.filter(inP) : [], mrs = o ? [...o.mrp.values()].filter(inP) : [];
    const pos = S.me2n ? S.me2n.lines.filter((l) => l.material === m && !l.deleted && inP(l) && T.inRange(l.delivery, F)).sort((a, b) => KX.poSt(a).localeCompare(KX.poSt(b)) || (a.delivery || 0) - (b.delivery || 0)) : [];
    const rsv = S.mb25 ? S.mb25.lines.filter((l) => l.material === m && !l.deleted && inP(l) && T.inRange(l.reqDate, F)).sort((a, b) => KX.rvSt(a).localeCompare(KX.rvSt(b)) || (a.reqDate || 0) - (b.reqDate || 0)) : [];
    const kts = S.me3n ? S.me3n.items.filter((i) => i.material === m).sort((a, b) => KX.kSt(a.k).localeCompare(KX.kSt(b.k))) : [];
    const ev = Trace.traceMaterial(m, null, { me2n: S.me2n, mb51: S.mb51, mb25: S.mb25 }).filter((e) => inP(e) && T.inRange(e.date, F)).reverse();
    const ref = its[0] || mrs[0] || pos[0] || rsv[0] || kts[0] || {}, desc = (o && o.desc) || ref.desc || m, uom = (o && o.uom) || ref.uom || '';
    const openPO = pos.filter((l) => l.openQty > 0), openRv = rsv.filter((l) => resvOpen(l)), aktif = kts.filter((i) => KX.kSt(i.k) !== 'habis'), k = st(o || { mrp: new Map() });
    const ar = $('ar');
    ar.innerHTML = `${back ? '<a href="#" id="aBack">‹ Kembali ke hasil pencarian</a>' : ''}
      <div class="mhead"><h2>${esc(desc)}</h2><div class="meta"><span class="mono">${esc(m)}</span><span>${esc(uom)}</span>${o && o.aging ? agingPill(o.aging) : ''}${MP.posPill(k)}<a href="#" id="aPop">Buka detail</a></div></div>
      ${T.kpis([['Stok', fmt(its.reduce((a, i) => a + nrm(i), 0)) + ' <small>' + esc(uom) + '</small>', fmt(its.length, 0) + ' plant'], ['OS PO/RO', fmt(openPO.reduce((a, l) => a + l.openQty, 0)), fmt(openPO.length, 0) + ' dokumen berjalan'],
        ['Reservasi terbuka', fmt(openRv.reduce((a, l) => a + l.diff, 0)), fmt(openRv.length, 0) + ' reservasi', openRv.some((l) => KX.rvSt(l) === 'late') ? 'k-low' : ''], ['Kontrak aktif', fmt(aktif.length, 0), aktif[0] ? 'OA ' + aktif[0].doc : 'tanpa kontrak']])}
      <div class="blk-grid">${T.block('Stok per plant', its.length || mrs.length, '#/control')}${T.block('PO/RO', pos.length, '#/po')}${T.block('Reservasi', rsv.length, '#/po')}${T.block('Kontrak', kts.length, '#/kontrak')}</div>
      ${T.block('Jejak waktu', ev.length, '')}`;
    const B = ar.querySelectorAll('.blk-b'), short = (el, rows, cols, onRow) => T.table(el, { rows: rows.slice(0, 5), pageSize: 5, cols, onRow, empty: 'Tidak ada data pada filter ini.' });
    const stRows = its.length ? its.map((i) => ({ p: i.plant, q: nrm(i), r: o.mrp.get(i.plant) })) : mrs.map((r) => ({ p: r.plant, q: r.stock, r }));
    short(B[0], stRows, [{ label: 'Plant', w: 1.4, get: (x) => plantLabel(x.p) }, { label: 'Stok', type: 'num', w: 0.8, get: (x) => x.q, cls: (x) => 'mx-' + (MP.pos(x.q, x.r) || 'none') },
      { label: 'Min – Max', type: 'num', w: 1, get: (x) => (x.r ? fmt(x.r.min2) + ' – ' + fmt(x.r.max2) : ''), cls: () => 'ref' }, { label: 'Status', type: 'status', w: 1.1, get: (x) => MP.POS[MP.pos(x.q, x.r)][0], html: (x) => MP.posPill(MP.pos(x.q, x.r)) }], (x) => MP.detail(m, x.p));
    short(B[1], pos, [{ label: 'Dokumen', w: 1.3, get: (l) => l.doc + '/' + l.item, html: (l) => T.two(l.doc + '/' + l.item, l.type + ' · ' + (l.vendor || '')) }, { label: 'Plant', w: 0.6, get: (l) => l.plant }, { label: 'Jatuh tempo', type: 'date', w: 0.9, get: (l) => l.delivery },
      { label: 'Sisa', type: 'num', w: 0.6, get: (l) => l.openQty }, { label: 'Status', type: 'status', w: 1, get: (l) => KX.PO_ST[KX.poSt(l)][0], html: (l) => T.pill(...KX.PO_ST[KX.poSt(l)]) }]);
    short(B[2], rsv, [{ label: 'Reservasi', w: 1.1, get: (l) => l.resv + '/' + l.item }, { label: 'Plant', w: 0.6, get: (l) => l.plant }, { label: 'Tgl butuh', type: 'date', w: 0.9, get: (l) => l.reqDate },
      { label: 'Sisa', type: 'num', w: 0.6, get: (l) => (resvOpen(l) ? l.diff : 0) }, { label: 'Status', type: 'status', w: 1.1, get: (l) => KX.RV_ST[KX.rvSt(l)][0], html: (l) => T.pill(...KX.RV_ST[KX.rvSt(l)]) }], (l) => KX.resv(l));
    short(B[3], kts, [{ label: 'Kontrak', w: 1, get: (i) => i.doc }, { label: 'Vendor', w: 1.8, get: (i) => i.k.vendor }, { label: 'Berakhir', type: 'date', w: 0.9, get: (i) => i.k.end },
      { label: 'Sisa qty', type: 'num', w: 0.7, get: (i) => i.openQty }, { label: 'Status', type: 'status', w: 1.1, get: (i) => KX.K_ST[KX.kSt(i.k)][0], html: (i) => T.pill(...KX.K_ST[KX.kSt(i.k)]) }], (i) => KX.contract(i.doc));
    const EV = { PR: 'mute', PO: 'info', RO: 'info', 'GR (inspeksi)': 'warn', 'GR (rilis stok)': 'ok', Reservasi: 'warn', GI: 'low', Transfer: 'mute' };
    T.table(B[4], { rows: ev, pageSize: 10, name: 'Jejak_' + m, empty: 'Tidak ada kejadian pada filter ini.', cols: [{ label: 'Tanggal', type: 'date', w: 0.9, get: (e) => e.date }, { label: 'Jenis', type: 'status', w: 1.1, get: (e) => e.step, html: (e) => T.pill(e.step, EV[e.step]) },
      { label: 'Plant', w: 0.6, get: (e) => e.plant }, { label: 'Dokumen', w: 1.2, get: (e) => e.doc }, { label: 'Keterangan', w: 3.4, get: (e) => e.text }, { label: 'Qty', type: 'num', w: 0.7, get: (e) => e.qty, cls: (e) => (e.qty < 0 ? 'neg' : '') }] });
    // "Lihat semua" membuka halaman fitur dengan pencarian = kode material dan filter yang sama
    const go = [() => { S.fc = { q: m, plant: F.plant, pos: '' }; }, () => { S.psTab = 'po'; S.fp = { q: m, plant: F.plant, from: F.from, to: F.to, year: F.year, st: 'all' }; },
      () => { S.psTab = 'resv'; S.fr = { q: m, plant: F.plant, from: F.from, to: F.to, year: F.year, st: 'all' }; }, () => { S.fk = { q: m, st: 'all' }; }];
    ar.querySelectorAll('.blk').forEach((b, i) => { const a = b.querySelector('.blk-a'); if (a && go[i]) a.onclick = () => go[i](); });
    $('aPop').onclick = (e) => { e.preventDefault(); MP.detail(m, F.plant); };
    if ($('aBack')) $('aBack').onclick = (e) => { e.preventDefault(); S.faMat = null; S.faQ = F.q; draw(); };
  };
  T.filters($('fb'), { q: 'Nama atau kode material, No. PO/RO, PR, OA, atau reservasi. Contoh: laker, flange 3', plants, dates: true, years }, F, draw);
  draw();
};
