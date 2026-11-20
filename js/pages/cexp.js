// ============ Contract & Expediting: Kontrak, Pesanan (PO/RO + Reservasi) sebagai halaman pantau ============
// Kartu ringkas + satu kotak cari + tabel sederhana (G.listPage). Detail lengkap ada di pop-up (KX.contract, KX.resv, MP.detail); data mentah SAP ada di Sumber Data > Data.
// Memakai data mesin lama (S.me3n, S.me2n, S.mb25, S.mb51). Ambang status kontrak: <= 90 hari (kritis), <= 180 hari (hampir habis), sisa nilai < 20%.
(function () {
  const sum = (a, f) => a.reduce((t, x) => t + (f(x) || 0), 0);
  const D = (v) => (v instanceof Date ? v : null);
  const stCls = (v) => (/^(Habis|Terlambat|Terbuka, lewat|Hampir habis masa \(≤90)/.test(v) ? 'st-low' : /^(Hampir|Sisa nilai|Terbuka|Ongoing|Dihapus|Ditutup)/.test(v) ? 'st-warn' : /^(Aktif|Closed|Terpenuhi)/.test(v) ? 'st-ok' : 'st-mute');
  const seg = (id, opts, cur, fn) => UI.seg($(id), opts, cur, fn);
  const empty = (what, hint) => ($('view').innerHTML = needFile(what, hint));

  // ---------- Kontrak (ME3N) ----------
  const kStatus = (d) => (!d.aktif ? 'Habis masa' : d.sisa <= 0 ? 'Habis nilai' : d.sisaHari != null && d.sisaHari <= 90 ? 'Hampir habis masa (≤90 hari)' : d.sisaHari != null && d.sisaHari <= 180 ? 'Hampir habis masa (≤180 hari)' : d.pctSisa < 0.2 ? 'Sisa nilai < 20%' : 'Aktif');
  const kOngoing = (d) => d.aktif && d.sisa > 0;
  PAGES.kontrak = function () {
    if (!S.me3n) return empty('file kontrak ME3N', 'Upload ME3N (dan ME2N untuk histori pemanfaatan) di Sumber Data, atau taruh di folder data.');
    const scope = S.kScope || 'on', docs = [...S.me3n.docs.values()], act = docs.filter(kOngoing), txt = new Map();
    S.me3n.items.forEach((i) => txt.set(i.doc, (txt.get(i.doc) || '') + ' ' + i.material + ' ' + i.desc));
    const soon = (n) => act.filter((d) => d.sisaHari != null && d.sisaHari <= n).length;
    G.listPage({ key: 'kQ', ph: 'Cari nomor OA, vendor, atau nama barang. Contoh: laker, gasket', rows: scope === 'all' ? docs : act, name: 'Kontrak', text: (d) => [d.doc, d.vendor, d.pic, d.kel, txt.get(d.doc)].join(' '),
      top: '<div class="seg-bar"><span id="kSc"></span></div>',
      tiles: [['Kontrak aktif', fmt(act.length, 0), 'dari ' + fmt(docs.length, 0) + ' kontrak'], ['Berakhir ≤ 90 hari', fmt(soon(90), 0), '≤ 180 hari: ' + fmt(soon(180), 0), soon(90) ? 'k-low' : ''], ['Sisa nilai < 20%', fmt(act.filter((d) => d.pctSisa < 0.2).length, 0), 'kontrak aktif', 'k-min'], ['Habis masa', fmt(docs.filter((d) => !d.aktif).length, 0), 'lewat tanggal berakhir']],
      cols: [['No. OA', (d) => d.doc], ['Vendor', (d) => d.vendor], ['Kelompok barang', (d) => d.kel || ''], ['PIC', (d) => d.pic], ['Berakhir', (d) => D(d.end)], ['Sisa hari', (d) => d.sisaHari], ['Mata uang', (d) => d.currency], ['Sisa nilai', (d) => d.sisa], ['% sisa', (d) => Math.round(d.pctSisa * 1000) / 10], ['Jumlah item', (d) => d.items], ['Status', kStatus]],
      opts: { types: { 'No. OA': 'text' }, hide: ['PIC', 'Jumlah item'], cellClass: { Status: stCls, 'Sisa hari': (v) => (v != null && v <= 90 ? 'st-low' : v != null && v <= 180 ? 'st-warn' : '') }, rowClick: (d) => KX.contract(d.doc) } });
    seg('kSc', [['on', 'Ongoing'], ['all', 'Semua']], scope, (v) => { S.kScope = v; PAGES.kontrak(); });
  };
  window.KX = {};
  KX.contract = function (doc) {
    const d = S.me3n.docs.get(doc); if (!d) return;
    const its = S.me3n.items.filter((i) => i.doc === doc), calls = S.me2n ? S.me2n.lines.filter((l) => l.oa === doc).sort((a, b) => (a.docDate || 0) - (b.docDate || 0)) : null;
    const same = calls ? calls.filter((l) => !l.deleted && l.currency === d.currency) : [], tot = sum(same, (l) => l.value);
    const body = UI.drawer(`<div class="d-head"><h2 class="mono">OA ${esc(doc)}</h2><p class="muted">${esc(d.vendor)} · ${esc(d.pic)}</p></div>
      <div class="dv"><div><span>Status</span><b>${esc(kStatus(d))}</b></div><div><span>Berlaku</span><b>${esc(G.fDate(d.start))} s.d. ${esc(G.fDate(d.end))}</b></div><div><span>Nilai target</span><b>${esc(money(d.target, d.currency))}</b></div><div><span>Terpakai (ME3N)</span><b>${esc(money(d.released, d.currency))}</b></div><div><span>Sisa nilai</span><b>${esc(money(d.sisa, d.currency))} (${fmt(d.pctSisa * 100, 1)}%)</b></div>
      ${calls ? `<div><span>Jumlah call-off PO/RO (ME2N)</span><b>${fmt(calls.length, 0)}</b></div><div><span>Total nilai call-off (ME2N, ${esc(d.currency)})</span><b>${esc(money(tot, d.currency))}</b></div>` : ''}</div>
      <p><button type="button" class="btn small" id="kdSim" title="Rencana call RO dari kontrak ini dan jejak pemakaian RO sampai barang dipakai">Simulasi RO dan jejak pemakaian</button></p>
      <div class="tabs" id="kdTabs" role="tablist"></div><div id="kdBody"></div>`, { wide: true, label: 'Kontrak ' + doc });
    body.querySelector('#kdSim').onclick = () => openContract(doc);
    let cum = 0;
    const hist = calls && calls.map((l) => { const ok = !l.deleted && l.currency === d.currency; if (ok) cum += l.value; return { l, cum: ok ? cum : null }; });
    const TABS = [['item', 'List Item', its.length, () => G.fromObjs(its, [['Item', (i) => i.item], ['Material', (i) => i.material], ['Deskripsi', (i) => i.desc], ['Satuan', (i) => i.uom], ['Harga', (i) => i.price], ['Target qty', (i) => i.targetQty], ['Terpakai qty', (i) => i.releasedQty], ['Sisa qty (SAP)', (i) => i.openQty], ['% pakai', (i) => (i.targetQty ? Math.round((i.releasedQty / i.targetQty) * 1000) / 10 : null)], ['Nilai terpakai', (i) => i.released]])],
      ['his', 'Histori Pemanfaatan', calls ? calls.length : '…', () => (hist ? G.fromObjs(hist, [['Tgl dokumen', (o) => D(o.l.docDate)], ['PO/RO', (o) => o.l.doc], ['Item', (o) => o.l.item], ['Plant', (o) => o.l.plant], ['Material', (o) => o.l.material], ['Deskripsi', (o) => o.l.desc], ['Qty pesan', (o) => o.l.qty], ['Satuan', (o) => o.l.uom], ['Nilai', (o) => o.l.value], ['Mata uang', (o) => o.l.currency],
        ['Kumulatif nilai', (o) => o.cum], ['Sisa nilai kontrak', (o) => (o.cum == null ? null : d.target - o.cum)], ['Tgl kirim', (o) => D(o.l.delivery)], ['Sisa kirim', (o) => o.l.openQty], ['Status', (o) => (o.l.deleted ? 'Dihapus' : o.l.openQty > 0 ? 'Ongoing' : 'Closed')]]) : { head: [], rows: [] })]];
    const show = (k) => {
      const t = TABS.find((x) => x[0] === k), tabs = body.querySelector('#kdTabs');
      tabs.innerHTML = TABS.map((x) => `<button class="tab ${x[0] === k ? 'on' : ''}" data-t="${x[0]}">${x[1]}<span class="n">${x[2] === '…' ? '' : fmt(x[2], 0)}</span></button>`).join('');
      tabs.querySelectorAll('.tab').forEach((b) => (b.onclick = () => show(b.dataset.t)));
      const box = body.querySelector('#kdBody'), g = t[3]();
      if (!g.rows.length) { box.innerHTML = `<p class="muted pad">${k === 'his' && !calls ? 'Butuh file ME2N untuk histori pemanfaatan.' : 'Tidak ada data.'}</p>`; return; }
      G.table(box, { head: g.head, rows: g.rows, name: 'OA_' + doc + '_' + t[1].replace(/\W+/g, '_'), plantCol: -1, types: { Material: 'text', Item: 'text' }, cellClass: { Status: stCls },
        source: k === 'his' ? 'Call-off = baris ME2N yang mengacu ke OA ini, urut tanggal dokumen. Kumulatif dan sisa dihitung dari nilai ME2N (hanya mata uang sama dengan kontrak, tidak termasuk yang dihapus); angka resmi sisa nilai = ME3N di atas, bisa berbeda.' : '' });
    };
    show('item');
  };

  // ---------- Pesanan: PO / RO (ME2N) dan Reservasi (MB25 x MB51) dalam satu halaman ----------
  const poSt = (l) => (l.deleted ? 'Dihapus' : l.openQty > 0 ? (l.lateDays > 0 ? 'Terlambat' : 'Ongoing') : 'Closed');
  PAGES.po = function () {
    const tab = S.psTab === 'resv' ? 'resv' : 'po'; MP.zonaHook = null;
    const top = '<div class="seg-bar"><span id="psTab"></span><span id="psSc"></span></div>';
    const wire = (sc) => { seg('psTab', [['po', 'PO / RO'], ['resv', 'Reservasi']], tab, (v) => { S.psTab = v; PAGES.po(); });
      seg('psSc', tab === 'resv' ? [['open', 'Terbuka'], ['all', 'Semua']] : [['on', 'Berjalan'], ['closed', 'Selesai'], ['all', 'Semua']], sc, (v) => { S[tab === 'resv' ? 'rvScope' : 'poScope'] = v; PAGES.po(); }); };
    if (tab === 'resv') return resvBody(top, wire);
    const sc = S.poScope || 'on';
    if (!S.me2n) { $('view').innerHTML = top + needFile('file ME2N', 'PO dan RO dibaca dari ME2N.'); return wire(sc); }
    const all = S.me2n.lines, live = all.filter((l) => !l.deleted && l.openQty > 0), t0 = new Date(); t0.setHours(0, 0, 0, 0); const t30 = new Date(+t0 + 30 * 864e5);
    const L = all.filter((l) => (sc === 'all' ? true : sc === 'on' ? !l.deleted && l.openQty > 0 : !l.deleted && l.openQty <= 0));
    G.listPage({ key: 'pQ', ph: 'Cari nomor PO/RO, vendor, atau nama barang. Contoh: 4500012345, bearing', rows: L, name: 'PO_RO', top, text: (l) => [l.doc, l.vendor, l.material, l.desc, l.pr, l.oa].join(' '),
      tiles: [['Pesanan berjalan', fmt(live.length, 0), 'PO ' + fmt(live.filter((l) => l.type !== 'RO').length, 0) + ' · RO ' + fmt(live.filter((l) => l.type === 'RO').length, 0)], ['Terlambat', fmt(live.filter((l) => l.lateDays > 0).length, 0), 'lewat tanggal kirim', live.some((l) => l.lateDays > 0) ? 'k-low' : ''],
        ['Jatuh tempo ≤ 30 hari', fmt(live.filter((l) => l.delivery && l.delivery >= t0 && l.delivery <= t30).length, 0), 'belum diterima', 'k-min'], ['Sisa kirim', money(live.reduce((a, l) => a + toIDRv(l.openValue, l.currency), 0), 'IDR'), 'nilai, setara IDR']],
      cols: [['Plant', (l) => l.plant], ['Dokumen', (l) => l.doc], ['Jenis', (l) => l.type], ['Vendor', (l) => l.vendor], ['Material', (l) => l.material], ['Deskripsi', (l) => l.desc], ['Tgl kirim', (l) => D(l.delivery)], ['Sisa kirim', (l) => l.openQty], ['Terlambat (hari)', (l) => l.lateDays || null], ['Status', poSt],
        ['Item', (l) => l.item], ['Tgl dokumen', (l) => D(l.docDate)], ['Qty pesan', (l) => l.qty], ['Satuan', (l) => l.uom], ['Nilai sisa kirim', (l) => l.openValue], ['Mata uang', (l) => l.currency], ['Kontrak (OA)', (l) => l.oa], ['PR', (l) => l.pr]],
      opts: { plantCol: 0, types: { Dokumen: 'text', Material: 'text', Item: 'text', PR: 'text' }, hide: ['Item', 'Tgl dokumen', 'Qty pesan', 'Satuan', 'Nilai sisa kirim', 'Mata uang', 'Kontrak (OA)', 'PR'], cellClass: { Status: stCls, 'Terlambat (hari)': (v) => (v > 30 ? 'st-low' : v ? 'st-warn' : '') }, rowClick: (l) => l.material && MP.detail(l.material, l.plant) } });
    wire(sc);
  };

  // Reservasi (MB25 x MB51)
  function resvBody(top, wire) {
    const sc = S.rvScope || 'open';
    if (!S.mb25) { $('view').innerHTML = top + needFile('file MB25', 'Reservasi dibaca dari MB25. MB51 (opsional) dipakai untuk melihat pengambilan barang (GI).'); return wire(sc); }
    const t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const take = new Map(); // reservasi|material -> gerakan MB51
    if (S.mb51) S.mb51.moves.forEach((m) => { if (m.resv) { const k = m.resv + '|' + m.material; (take.get(k) || take.set(k, []).get(k)).push(m); } });
    const R = S.mb25.lines.map((l) => { const open = resvOpen(l), late = open && l.reqDate && l.reqDate < t0, mv = take.get(l.resv + '|' + l.material) || [];
      return { l, open, mv, st: open ? (late ? 'Terbuka, lewat tgl butuh' : 'Terbuka') : l.deleted ? 'Dihapus' : l.finalIssue && l.diff > 0 ? 'Ditutup (final issue)' : 'Terpenuhi', gi: sum(mv, (m) => -m.qty), last: mv.reduce((a, m) => (m.date && (!a || m.date > a) ? m.date : a), null) }; });
    const shown = sc === 'all' ? R : R.filter((x) => x.open), lateN = R.filter((x) => x.st === 'Terbuka, lewat tgl butuh').length;
    G.listPage({ key: 'rQ', ph: 'Cari nomor reservasi, penerima, atau nama barang', rows: shown, name: 'Reservasi', top, text: (x) => [x.l.resv, x.l.material, x.l.desc, x.l.recipient, x.l.costCenter, x.l.wbs].join(' '),
      tiles: [['Reservasi terbuka', fmt(R.filter((x) => x.open).length, 0), 'masih ada sisa'], ['Lewat tgl butuh', fmt(lateN, 0), 'belum diambil', lateN ? 'k-low' : ''], ['Selesai / ditutup', fmt(R.filter((x) => !x.open).length, 0), 'tidak dihitung di MRP'], ['Pengambilan (MB51)', S.mb51 ? fmt(R.filter((x) => x.mv.length).length, 0) : '–', S.mb51 ? 'reservasi sudah ada GI' : 'MB51 belum dimuat']],
      cols: [['Plant', (x) => x.l.plant], ['Reservasi', (x) => x.l.resv], ['Material', (x) => x.l.material], ['Deskripsi', (x) => x.l.desc], ['Tgl butuh', (x) => D(x.l.reqDate)], ['Qty diminta', (x) => x.l.reqQty], ['Sisa', (x) => (x.open ? x.l.diff : 0)], ['Penerima', (x) => x.l.recipient], ['Status', (x) => x.st],
        ['Item', (x) => x.l.item], ['Mvt', (x) => x.l.mt], ['Sudah diambil (MB25)', (x) => x.l.removed], ['GI di MB51', (x) => (S.mb51 ? x.gi || null : null)], ['Terakhir GI', (x) => D(x.last)], ['Cost center', (x) => x.l.costCenter], ['WBS', (x) => x.l.wbs]],
      opts: { plantCol: 0, types: { Reservasi: 'text', Material: 'text', Item: 'text', Mvt: 'text' }, hide: ['Item', 'Mvt', 'Sudah diambil (MB25)', 'GI di MB51', 'Terakhir GI', 'Cost center', 'WBS'], cellClass: { Status: stCls }, rowClick: (x) => KX.resv(x) } });
    wire(sc);
  }
  KX.resv = function (x) {
    const l = x.l, body = UI.drawer(`<div class="d-head"><h2 class="mono">Reservasi ${esc(l.resv)}/${esc(l.item)}</h2><p class="muted">${esc(l.desc)}</p></div><div class="dv"><div><span>Status</span><b>${esc(x.st)}</b></div><div><span>Plant</span><b>${esc(plantLabel(l.plant))}</b></div><div><span>Material</span><b class="mono">${esc(l.material)}</b></div><div><span>Tgl butuh</span><b>${esc(G.fDate(l.reqDate))}</b></div><div><span>Diminta / sisa</span><b>${fmt(l.reqQty)} / ${fmt(l.diff)} ${esc(l.uom)}</b></div><div><span>Penerima</span><b>${esc(l.recipient || l.costCenter || '-')}</b></div></div><div id="rvd"></div>`, { wide: true, label: 'Reservasi' });
    const box = body.querySelector('#rvd');
    if (!x.mv.length) { box.innerHTML = `<p class="muted pad">${S.mb51 ? 'Belum ada gerakan MB51 dengan nomor reservasi ini.' : 'MB51 belum dimuat.'}</p>`; return; }
    const g = G.fromObjs(x.mv.slice().sort((a, b) => (a.date || 0) - (b.date || 0)), [['Tanggal', (m) => D(m.date)], ['Plant', (m) => m.plant], ['SLoc', (m) => m.sloc], ['Mvt', (m) => m.mt], ['Keterangan Mvt', (m) => m.mtText], ['Qty', (m) => m.qty], ['Satuan', (m) => m.uom], ['Nilai', (m) => m.amount], ['Mata uang', (m) => m.cur], ['Dok. material', (m) => m.matDoc], ['Teks', (m) => m.header], ['User', (m) => m.user]]);
    G.table(box, { head: g.head, rows: g.rows, name: 'GI_Reservasi_' + l.resv, plantCol: -1, autoHeight: g.rows.length <= 12, types: { Mvt: 'text' }, source: 'Gerakan MB51 untuk reservasi ini (Qty negatif = barang keluar).' });
  };

})();
