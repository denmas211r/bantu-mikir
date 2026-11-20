// ============ Material Planning: Material Control (Overview = matriks, Detail = MRP per plant) dan panel detail material ============
// Memakai data yang sudah dimuat mesin lama (S.mb52, S.mrpRes, S.me2n, S.mb25, S.me3n). Rumus MRP tidak diubah.
// Angka di sini fakta dari file SAP/MRP; tidak ada aturan "transfer vs RO" (belum diputuskan Digi).
// Sub-fitur Overview memakai PAGES.matriks (views.js).
(function () {
  const MP = (window.MP = { zonaHook: null });
  document.addEventListener('zonachange', () => { if (MP.zonaHook) MP.zonaHook(); });
  const ok = (p) => G.zonaOk(p);
  const nrm = (i) => (i.sohNormal != null ? i.sohNormal : i.soh) || 0;
  const sum = (a, f) => a.reduce((t, x) => t + (f(x) || 0), 0);
  const uniq = (a) => [...new Set(a)];
  const fin = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
  const stCls = (v) => (/^(Terlambat|Perlu order)/.test(v) ? 'st-low' : /^(Pesan sekarang|Berlebih)/.test(v) ? 'st-warn' : /^(Tercukupi|Cukup|Aman)/.test(v) ? 'st-ok' : 'st-mute');

  // ---------- Indeks data (dihitung ulang kalau data berubah) ----------
  const memo = {};
  function idx() {
    const sig = [S.ver, S.mb52, S.me2n, S.me3n, S.mb25, S.mrpRes, S.mb51];
    if (memo.sig && memo.sig.every((x, i) => x === sig[i])) return memo;
    const add = (m, k, v) => (m.get(k) || m.set(k, []).get(k)).push(v), po = new Map(), rs = new Map(), it = new Map(), mr = new Map(), kt = new Map(), mv = new Map();
    if (S.me2n) S.me2n.lines.forEach((l) => { if (!l.deleted && l.openQty > 0 && l.material) add(po, l.material, l); });
    if (S.mb25) S.mb25.lines.forEach((l) => { if (resvOpen(l) && l.material) add(rs, l.material, l); });
    if (S.mb52) S.mb52.items.forEach((i) => add(it, i.material, i));
    if (S.mrpRes) S.mrpRes.forEach((r) => add(mr, r.material, r));
    if (S.me3n) S.me3n.items.forEach((i) => { if (i.material && i.k.aktif) add(kt, i.material, i); });
    Object.assign(memo, { sig, po, rs, it, mr, kt, mv });
    return memo;
  }
  const mvOf = (m) => (S.mb51 ? S.mb51.moves.filter((x) => x.material === m) : []);
  const zonaOfP = (p) => zonaOf(p);
  MP.idx = idx;

  // ---------- Detail material (panel samping, tab: stok per plant, OS/PO, reservasi, kontrak, transaksi) ----------
  MP.detail = function (mat, plant) {
    const X = idx(), its = X.it.get(mat) || [], mrs = X.mr.get(mat) || [], pos = X.po.get(mat) || [], rss = X.rs.get(mat) || [], kts = (S.me3n ? S.me3n.items.filter((i) => i.material === mat) : []);
    const ref = its[0] || mrs[0] || pos[0] || rss[0] || {};
    const plantsAll = uniq([...its, ...mrs, ...pos, ...rss].map((x) => x.plant)).sort();
    const body = UI.drawer(`<div class="d-head"><h2 class="mono">${esc(mat)}</h2><p class="muted">${esc(ref.desc || '')}</p><button type="button" class="btn small" id="mdFull" title="Analisis material lengkap: pemakaian, penjelasan hitungan MRP">Analisis lengkap</button></div>
      <div class="dv"><div><span>Satuan</span><b>${esc(ref.uom || '-')}</b></div><div><span>Plant ada data</span><b>${esc(plantsAll.join(', ') || '-')}</b></div>${plant ? `<div><span>Dibuka dari</span><b>${esc(plantLabel(plant))}</b></div>` : ''}</div>
      <div class="tabs" id="mdTabs" role="tablist"></div><div id="mdBody"></div>`, { wide: true, label: 'Detail material ' + mat });
    const D = (v) => (v instanceof Date ? v : null);
    const TABS = [
      ['stok', 'Stok per plant', its.length + (its.length ? 0 : mrs.length), () => {
        const L = (plantsAll.filter((p) => its.some((i) => i.plant === p) || mrs.some((r) => r.plant === p))).map((p) => { const i = its.find((x) => x.plant === p), r = mrs.find((x) => x.plant === p); return { p, i, r }; });
        return G.fromObjs(L, [['Plant', (o) => o.p], ['Zona', (o) => zonaOfP(o.p)], ['Unrestricted', (o) => (o.i ? nrm(o.i) : o.r ? o.r.stock : null)], ['Val. type lain', (o) => (o.i ? o.i.soh - nrm(o.i) : null)], ['In transit', (o) => (o.i ? o.i.transit : null)],
          ['Nilai', (o) => (o.i ? o.i.value : null)], ['Mata uang', (o) => (o.i ? stockCur(o.p) : '')], ['Lokasi', (o) => (o.i ? o.i.locs.map((l) => l.sloc + (l.batch ? '/' + l.batch : '') + ': ' + fmt(l.qty)).join('; ') : '')],
          ['Aging', (o) => (o.r ? o.r.aging : '')], ['AMU', (o) => (o.r ? o.r.amu : null)], ['LT (bln)', (o) => (o.r ? o.r.lt : null)], ['SS', (o) => (o.r ? o.r.ss : null)], ['Min', (o) => (o.r ? o.r.min2 : null)], ['Max', (o) => (o.r ? o.r.max2 : null)], ['To Order', (o) => (o.r ? o.r.toOrder : null)]]);
      }],
      ['po', 'OS PO/RO', pos.length, () => G.fromObjs(pos, [['Plant', (l) => l.plant], ['Dokumen', (l) => l.doc], ['Item', (l) => l.item], ['Jenis', (l) => l.type], ['Vendor', (l) => l.vendor], ['Tgl kirim', (l) => D(l.delivery)], ['Qty pesan', (l) => l.qty], ['Sisa kirim', (l) => l.openQty], ['Satuan', (l) => l.uom],
        ['Harga', (l) => l.price], ['Mata uang', (l) => l.currency], ['Terlambat (hari)', (l) => l.lateDays || null], ['Kontrak (OA)', (l) => l.oa], ['PR', (l) => l.pr]])],
      ['rsv', 'Reservasi', rss.length, () => G.fromObjs(rss, [['Plant', (l) => l.plant], ['Reservasi', (l) => l.resv], ['Item', (l) => l.item], ['Tgl butuh', (l) => D(l.reqDate)], ['Qty butuh', (l) => l.reqQty], ['Sudah diambil', (l) => l.removed], ['Sisa', (l) => l.diff], ['Satuan', (l) => l.uom],
        ['Mvt', (l) => l.mt], ['Cost center', (l) => l.costCenter], ['WBS', (l) => l.wbs], ['Network', (l) => l.network], ['Penerima', (l) => l.recipient], ['User', (l) => l.user]])],
      ['kon', 'Kontrak', kts.length, () => G.fromObjs(kts, [['Kontrak', (i) => i.doc], ['Item', (i) => i.item], ['Vendor', (i) => i.k.vendor], ['PIC', (i) => i.k.pic], ['Mulai', (i) => D(i.k.start)], ['Berakhir', (i) => D(i.k.end)], ['Sisa hari', (i) => i.k.sisaHari], ['Status', (i) => (i.k.aktif ? 'Aktif' : 'Habis masa')],
        ['Harga', (i) => i.price], ['Mata uang', (i) => i.k.currency], ['Target qty', (i) => i.targetQty], ['Sisa qty', (i) => i.openQty], ['Nilai target', (i) => i.k.target], ['Sisa nilai', (i) => i.k.sisa], ['% sisa', (i) => Math.round(i.k.pctSisa * 1000) / 10]])],
      ['trx', 'Transaksi (MB51)', S.mb51 ? '…' : 0, () => { const m = mvOf(mat).sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 3000);
        return G.fromObjs(m, [['Tanggal', (x) => D(x.date)], ['Plant', (x) => x.plant], ['SLoc', (x) => x.sloc], ['Mvt', (x) => x.mt], ['Keterangan Mvt', (x) => x.mtText], ['Kategori', (x) => x.cat], ['Qty', (x) => x.qty], ['Satuan', (x) => x.uom], ['Nilai', (x) => x.amount], ['Mata uang', (x) => x.cur],
          ['PO/Resv', (x) => x.po || x.resv], ['Dok. material', (x) => x.matDoc], ['Teks', (x) => x.header], ['User', (x) => x.user]]); }],
    ];
    const fb = body.querySelector('#mdFull'); if (fb) fb.onclick = () => openMaterial(mat);
    let cur = TABS.find((t) => t[2])[0] || 'stok';
    const show = (k) => {
      cur = k; const t = TABS.find((x) => x[0] === k), tabs = body.querySelector('#mdTabs');
      tabs.innerHTML = TABS.map((x) => `<button class="tab ${x[0] === k ? 'on' : ''}" role="tab" aria-selected="${x[0] === k}" data-t="${x[0]}">${x[1]}<span class="n">${x[2] === '…' ? '' : fmt(x[2], 0)}</span></button>`).join('');
      tabs.querySelectorAll('.tab').forEach((b) => (b.onclick = () => show(b.dataset.t)));
      const box = body.querySelector('#mdBody'), d = t[3]();
      if (!d.rows.length) { box.innerHTML = '<p class="muted pad">Tidak ada data.</p>'; return; }
      G.table(box, { head: d.head, rows: d.rows, name: mat + '_' + t[1].replace(/\W+/g, '_'), plantCol: -1, autoHeight: d.rows.length <= 12, source: '' });
    };
    show(cur);
  };

  // ---------- Material Control per Zona (Overview | Detail MRP per plant) ----------
  function dtRows() {
    const X = idx(), res = S.mrpRes ? [...S.mrpRes.values()].filter((r) => ok(r.plant)) : [];
    return res.map((r) => { const o = (X.it.get(r.material) || []).filter((i) => ok(i.plant) && i.plant !== r.plant), mo = (X.mr.get(r.material) || []).filter((x) => ok(x.plant) && x.plant !== r.plant);
      return { r, oStock: sum(o, nrm) || (mo.length ? sum(mo, (x) => x.stock) : 0), oSur: sum(mo, (x) => x.surplus), oN: uniq([...o.map((i) => i.plant), ...mo.map((x) => x.plant)]).length }; });
  }
  PAGES.control = function () {
    if (!S.mb52 && !S.mrpRes) { $('view').innerHTML = needFile('MB52 atau MRP', 'Material Control membaca stok (MB52), OS PO (ME2N), reservasi (MB25), kontrak (ME3N), dan hasil MRP.'); return; }
    const mode = S.ovMode || 'ov'; MP.zonaHook = () => PAGES.control();
    $('view').innerHTML = `<div class="seg-bar"><span id="ovSeg"></span></div><div id="ovBody"></div>`;
    UI.seg($('ovSeg'), [['ov', 'Overview'], ['dt', 'Detail']], mode, (v) => { S.ovMode = v; PAGES.control(); });
    const src = `Sumber: ${['MB52', 'MRP', 'ME2N (OS PO/RO)', 'MB25 (reservasi terbuka)', 'ME3N (kontrak aktif)'].filter((x, i) => [S.mb52, S.mrpRes, S.me2n, S.mb25, S.me3n][i]).join(', ')}. `;
    if (mode === 'ov') {
      PAGES.matriks($('ovBody'));
    } else {
      if (!S.mrpRes) { $('ovBody').innerHTML = '<p class="muted pad">Detail MRP butuh file MRP (WK PEP) atau MB52 + MB51 client 180 (WK PHE).</p>'; return; }
      const R = dtRows(), d = G.fromObjs(R, [['Plant', (o) => o.r.plant], ['Material', (o) => o.r.material], ['KIMAP', (o) => o.r.kimap], ['Deskripsi', (o) => o.r.desc], ['Satuan', (o) => o.r.uom], ['Kelas', (o) => o.r.cls || ''], ['Aging', (o) => o.r.aging || ''],
        ['AMU', (o) => fin(o.r.amu)], ['LT (bln)', (o) => fin(o.r.lt)], ['SS', (o) => fin(o.r.ss)], ['Min', (o) => fin(o.r.min2)], ['Max', (o) => fin(o.r.max2)], ['Stok', (o) => o.r.stock], ['OS PO/RO', (o) => o.r.ospo], ['Reservasi', (o) => o.r.mb25], ['To Order', (o) => o.r.toOrder], ['Surplus', (o) => o.r.surplus || null],
        ['Cover (bln)', (o) => fin(o.r.cover)], ['Jalur', (o) => (o.r.toOrder > 0 ? (o.r.oa ? 'RO ' + o.r.oa : 'PR') : '')], ['Stok plant lain', (o) => o.oStock || null], ['Surplus plant lain', (o) => o.oSur || null], ['Surplus lain / To Order (%)', (o) => (o.r.toOrder > 0 && o.oSur ? Math.round((o.oSur / o.r.toOrder) * 100) : null)],
        ['Posisi stok', (o) => MRP_POS[mrpPos(o.r.stock, o.r)] || ''], ['Status', (o) => (o.r.toOrder > 0 ? 'Perlu order' : o.r.berlebih ? 'Berlebih' : 'Cukup')], ['Catatan', (o) => o.r.note || '']]);
      const posCls = (v) => ({ [MRP_POS.low]: 'mx-low', [MRP_POS.min]: 'mx-min', [MRP_POS.ok]: 'mx-ok', [MRP_POS.max]: 'mx-max' }[v] || '');
      $('ovBody').innerHTML = `<div class="mx-bar"><div class="mx-leg-wrap">${mrpLegend()}</div></div><div id="dtT"></div>`;
      G.table($('dtT'), { head: d.head, rows: d.rows, name: 'MRP_per_Plant', plantCol: 0, types: { Material: 'text', KIMAP: 'text' }, hide: ['KIMAP', 'Satuan', 'Cover (bln)', 'Catatan'], pin: ['Plant', 'Material'], cellClass: { Status: stCls, 'Posisi stok': posCls }, rowClick: (o) => MP.detail(o.r.material, o.r.plant),
        source: src + 'Min/Max/SS/AMU/To Order = hasil mesin MRP (metode ' + esc(S.set.method) + '). Stok dan surplus plant lain dalam zona terpilih = fakta pembanding, bukan rekomendasi transfer.' });
    }
  };
})();
