// ============ Contract & Expediting (Fase 3): Kontrak, PO, Reservasi, Keluar-Masuk Barang ============
// Memakai data mesin lama (S.me3n, S.me2n, S.mb25, S.mb51). Rumus contract.js/trace.js tidak diubah.
// Ambang status kontrak = yang sudah ada di halaman Kontrak lama: <= 90 hari (kritis), <= 180 hari (hampir habis), sisa nilai < 20%.
// Dimuat sesudah mplan.js; menggantikan PAGES.kontrak/resv/gerak lama (disimpan sebagai kontraklama/resvlama/geraklama).
(function () {
  const sum = (a, f) => a.reduce((t, x) => t + (f(x) || 0), 0);
  const D = (v) => (v instanceof Date ? v : null);
  const stCls = (v) => (/^(Habis|Terlambat|Terbuka, lewat|Hampir habis masa \(≤90)/.test(v) ? 'st-low' : /^(Hampir|Sisa nilai|Terbuka|Ongoing|Dihapus|Ditutup)/.test(v) ? 'st-warn' : /^(Aktif|Closed|Terpenuhi)/.test(v) ? 'st-ok' : 'st-mute');
  const seg = (id, opts, cur, fn) => UI.seg($(id), opts, cur, fn);
  const empty = (what, hint) => ($('view').innerHTML = needFile(what, hint));
  PAGES.kontraklama = PAGES.kontrak; PAGES.resvlama = PAGES.resv; PAGES.geraklama = PAGES.gerak;

  // ---------- Kontrak (ME3N) ----------
  const kStatus = (d) => (!d.aktif ? 'Habis masa' : d.sisa <= 0 ? 'Habis nilai' : d.sisaHari != null && d.sisaHari <= 90 ? 'Hampir habis masa (≤90 hari)' : d.sisaHari != null && d.sisaHari <= 180 ? 'Hampir habis masa (≤180 hari)' : d.pctSisa < 0.2 ? 'Sisa nilai < 20%' : 'Aktif');
  const kOngoing = (d) => d.aktif && d.sisa > 0;
  PAGES.kontrak = function () {
    if (!S.me3n) return empty('file kontrak ME3N', 'Upload ME3N (dan ME2N untuk histori pemanfaatan) di Sumber Data, atau taruh di folder data.');
    const mode = S.kMode || 'doc', scope = S.kScope || 'on';
    $('view').innerHTML = `<div class="seg-bar"><span id="kSeg"></span><span id="kSc"></span><span class="note">Kontrak tidak punya plant, jadi filter Zona tidak berlaku. Nilai per mata uang kontrak, tidak dijumlahkan.</span></div><div id="kBody"></div>`;
    seg('kSeg', [['doc', 'Kontrak'], ['item', 'Item kontrak']], mode, (v) => { S.kMode = v; PAGES.kontrak(); });
    seg('kSc', [['on', 'Ongoing'], ['all', 'Semua']], scope, (v) => { S.kScope = v; PAGES.kontrak(); });
    const docs = [...S.me3n.docs.values()].filter((d) => scope === 'all' || kOngoing(d)), usedBy = new Map();
    if (S.mrpRes) for (const r of S.mrpRes.values()) if (r.contract) usedBy.set(r.contract.doc, (usedBy.get(r.contract.doc) || 0) + 1);
    const src = `Sumber: ME3N ${S.src.me3n ? Object.values(S.src.me3n).map((f) => esc(f.name)).join(', ') : ''}. Status: Habis masa = lewat tanggal berakhir; Habis nilai = sisa nilai 0; Hampir habis masa = sisa <= 180 hari (<= 90 hari kritis); Sisa nilai < 20% mengikuti halaman Kontrak lama. Ongoing = masa berlaku belum lewat dan nilai masih ada. Habis qty per item belum dipisah (lihat Item kontrak, kolom % pakai).`;
    if (mode === 'doc') {
      const d = G.fromObjs(docs, [['No. OA', (x) => x.doc], ['Vendor', (x) => x.vendor], ['Kelompok barang', (x) => x.kel || ''], ['PIC', (x) => x.pic], ['Mulai', (x) => D(x.start)], ['Berakhir', (x) => D(x.end)], ['Sisa hari', (x) => x.sisaHari], ['Mata uang', (x) => x.currency],
        ['Nilai target', (x) => x.target], ['Terpakai', (x) => x.released], ['Sisa nilai', (x) => x.sisa], ['% sisa', (x) => Math.round(x.pctSisa * 1000) / 10], ['Jumlah item', (x) => x.items], ['Material dipakai MRP', (x) => usedBy.get(x.doc) || null], ['Status', kStatus]]);
      G.table($('kBody'), { head: d.head, rows: d.rows, name: 'Kontrak_ME3N', plantCol: -1, types: { 'No. OA': 'text' }, hide: ['Kelompok barang'], pin: ['No. OA'], cellClass: { Status: stCls }, rowClick: (o) => KX.contract(o.doc), source: src + ' Klik baris untuk List Item dan Histori Pemanfaatan.' });
    } else {
      const its = S.me3n.items.filter((i) => scope === 'all' || kOngoing(i.k));
      const d = G.fromObjs(its, [['No. OA', (i) => i.doc], ['Item', (i) => i.item], ['Material', (i) => i.material], ['Deskripsi', (i) => i.desc], ['Satuan', (i) => i.uom], ['Vendor', (i) => i.k.vendor], ['Berakhir', (i) => D(i.k.end)], ['Harga', (i) => i.price], ['Mata uang', (i) => i.k.currency],
        ['Target qty', (i) => i.targetQty], ['Terpakai qty', (i) => i.releasedQty], ['Sisa qty (SAP)', (i) => i.openQty], ['% pakai', (i) => (i.targetQty ? Math.round((i.releasedQty / i.targetQty) * 1000) / 10 : null)], ['Status kontrak', (i) => kStatus(i.k)]]);
      G.table($('kBody'), { head: d.head, rows: d.rows, name: 'Kontrak_Item', plantCol: -1, types: { 'No. OA': 'text', Material: 'text', Item: 'text' }, cellClass: { 'Status kontrak': stCls }, rowClick: (i) => KX.contract(i.doc), source: src });
    }
  };
  window.KX = {};
  KX.contract = function (doc) {
    const d = S.me3n.docs.get(doc); if (!d) return;
    const its = S.me3n.items.filter((i) => i.doc === doc), calls = S.me2n ? S.me2n.lines.filter((l) => l.oa === doc).sort((a, b) => (a.docDate || 0) - (b.docDate || 0)) : null;
    const same = calls ? calls.filter((l) => !l.deleted && l.currency === d.currency) : [], tot = sum(same, (l) => l.value);
    const body = UI.drawer(`<div class="d-head"><h2 class="mono">OA ${esc(doc)}</h2><p class="muted">${esc(d.vendor)} · ${esc(d.pic)}</p></div>
      <div class="dv"><div><span>Status</span><b>${esc(kStatus(d))}</b></div><div><span>Berlaku</span><b>${esc(G.fDate(d.start))} s.d. ${esc(G.fDate(d.end))}</b></div><div><span>Nilai target</span><b>${esc(money(d.target, d.currency))}</b></div><div><span>Terpakai (ME3N)</span><b>${esc(money(d.released, d.currency))}</b></div><div><span>Sisa nilai</span><b>${esc(money(d.sisa, d.currency))} (${fmt(d.pctSisa * 100, 1)}%)</b></div>
      ${calls ? `<div><span>Jumlah call-off PO/RO (ME2N)</span><b>${fmt(calls.length, 0)}</b></div><div><span>Total nilai call-off (ME2N, ${esc(d.currency)})</span><b>${esc(money(tot, d.currency))}</b></div>` : ''}</div>
      <div class="tabs" id="kdTabs" role="tablist"></div><div id="kdBody"></div>`, { wide: true, label: 'Kontrak ' + doc });
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

  // ---------- PO (ME2N) ----------
  const poSt = (l) => (l.deleted ? 'Dihapus' : l.openQty > 0 ? (l.lateDays > 0 ? 'Terlambat' : 'Ongoing') : 'Closed');
  PAGES.po = function () {
    if (!S.me2n) return empty('file ME2N', 'PO/RO dibaca dari ME2N.');
    const sc = S.poScope || 'on'; MP.zonaHook = null;
    $('view').innerHTML = `<div class="seg-bar"><span id="poSc"></span><span class="note" id="poNote"></span></div><div id="poBody"></div>`;
    seg('poSc', [['on', 'Ongoing'], ['closed', 'Closed'], ['all', 'Semua']], sc, (v) => { S.poScope = v; PAGES.po(); });
    const all = S.me2n.lines, L = all.filter((l) => (sc === 'all' ? true : sc === 'on' ? !l.deleted && l.openQty > 0 : !l.deleted && l.openQty <= 0));
    $('poNote').textContent = `${fmt(all.filter((l) => !l.deleted && l.openQty > 0).length, 0)} ongoing (${fmt(all.filter((l) => l.lateDays > 0 && !l.deleted).length, 0)} terlambat), ${fmt(all.filter((l) => !l.deleted && l.openQty <= 0).length, 0)} closed, ${fmt(all.filter((l) => l.deleted).length, 0)} dihapus.`;
    const d = G.fromObjs(L, [['Plant', (l) => l.plant], ['Dokumen', (l) => l.doc], ['Item', (l) => l.item], ['Jenis', (l) => l.type], ['Vendor', (l) => l.vendor], ['Material', (l) => l.material], ['Deskripsi', (l) => l.desc], ['Tgl dokumen', (l) => D(l.docDate)], ['Tgl kirim (due)', (l) => D(l.delivery)], ['Terlambat (hari)', (l) => l.lateDays || null],
      ['Qty pesan', (l) => l.qty], ['Still to be delivered', (l) => l.openQty], ['Satuan', (l) => l.uom], ['Harga', (l) => l.price], ['Nilai pesan', (l) => l.value], ['Nilai sisa kirim', (l) => l.openValue], ['Mata uang', (l) => l.currency], ['Status', poSt], ['Kontrak (OA)', (l) => l.oa], ['PR', (l) => l.pr], ['Purch. group', (l) => l.pg]]);
    G.table($('poBody'), { head: d.head, rows: d.rows, name: 'PO_ME2N_' + sc, plantCol: 0, types: { Dokumen: 'text', Item: 'text', Material: 'text', PR: 'text' }, hide: ['Satuan', 'Harga', 'Purch. group', 'PR'], pin: ['Plant', 'Dokumen'], cellClass: { Status: stCls, 'Terlambat (hari)': (v) => (v > 30 ? 'st-low' : v ? 'st-warn' : '') },
      rowClick: (l) => l.material && MP.detail(l.material, l.plant), source: 'Sumber: ME2N. Ongoing = Still to be delivered > 0; Closed = sisa kirim 0 (belum tentu sudah ditagih); Terlambat = tanggal kirim sudah lewat dan masih ada sisa. Jenis RO = PO yang mengacu ke kontrak (OA). Nilai per mata uang, tidak dijumlahkan. Klik baris untuk detail material.' });
  };

  // ---------- Reservasi (MB25 x MB51) ----------
  PAGES.resv = function () {
    if (!S.mb25) return empty('file MB25', 'Reservasi dibaca dari MB25. MB51 (opsional) dipakai untuk melihat pengambilan barang (GI).');
    const sc = S.rvScope || 'open', t0 = new Date(); t0.setHours(0, 0, 0, 0);
    $('view').innerHTML = `<div class="seg-bar"><span id="rvSc"></span><span class="note" id="rvNote"></span></div><div id="rvBody"></div>`;
    seg('rvSc', [['open', 'Terbuka'], ['all', 'Semua']], sc, (v) => { S.rvScope = v; PAGES.resv(); });
    const take = new Map(); // reservasi|material -> gerakan MB51
    if (S.mb51) S.mb51.moves.forEach((m) => { if (m.resv) { const k = m.resv + '|' + m.material; (take.get(k) || take.set(k, []).get(k)).push(m); } });
    const R = S.mb25.lines.map((l) => { const open = resvOpen(l), late = open && l.reqDate && l.reqDate < t0, mv = take.get(l.resv + '|' + l.material) || [];
      return { l, open, mv, st: open ? (late ? 'Terbuka, lewat tgl butuh' : 'Terbuka') : l.deleted ? 'Dihapus' : l.finalIssue && l.diff > 0 ? 'Ditutup (final issue)' : 'Terpenuhi', gi: sum(mv, (m) => -m.qty), last: mv.reduce((a, m) => (m.date && (!a || m.date > a) ? m.date : a), null) }; });
    const shown = sc === 'all' ? R : R.filter((x) => x.open);
    $('rvNote').textContent = `${fmt(R.filter((x) => x.open).length, 0)} terbuka (${fmt(R.filter((x) => x.st === 'Terbuka, lewat tgl butuh').length, 0)} lewat tanggal butuh), ${fmt(R.filter((x) => !x.open).length, 0)} selesai/ditutup.${S.mb51 ? '' : ' MB51 belum dimuat: kolom GI kosong.'}`;
    const d = G.fromObjs(shown, [['Plant', (x) => x.l.plant], ['Status', (x) => x.st], ['Reservasi', (x) => x.l.resv], ['Item', (x) => x.l.item], ['Mvt', (x) => x.l.mt], ['Material', (x) => x.l.material], ['Deskripsi', (x) => x.l.desc], ['Tgl butuh', (x) => D(x.l.reqDate)], ['Qty diminta', (x) => x.l.reqQty],
      ['Sudah diambil (MB25)', (x) => x.l.removed], ['GI di MB51', (x) => (S.mb51 ? x.gi || null : null)], ['Sisa', (x) => (x.open ? x.l.diff : 0)], ['Satuan', (x) => x.l.uom], ['Terakhir GI', (x) => D(x.last)], ['Jumlah gerakan MB51', (x) => x.mv.length || null], ['Penerima', (x) => x.l.recipient], ['Cost center', (x) => x.l.costCenter], ['WBS', (x) => x.l.wbs], ['Network', (x) => x.l.network], ['User', (x) => x.l.user]]);
    G.table($('rvBody'), { head: d.head, rows: d.rows, name: 'Reservasi_MB25_' + sc, plantCol: 0, types: { Reservasi: 'text', Item: 'text', Material: 'text', Mvt: 'text' }, hide: ['Satuan', 'Item', 'Cost center', 'Network', 'User'], pin: ['Plant', 'Reservasi'], cellClass: { Status: stCls },
      rowClick: (x) => KX.resv(x), source: 'Sumber: MB25' + (S.mb51 ? ' + MB51 (gerakan dengan nomor reservasi dan material yang sama)' : '') + '. Terbuka = belum final issue, tidak dihapus, masih ada sisa (yang dihitung di MRP). Klik baris untuk gerakan GI di MB51.' });
  };
  KX.resv = function (x) {
    const l = x.l, body = UI.drawer(`<div class="d-head"><h2 class="mono">Reservasi ${esc(l.resv)}/${esc(l.item)}</h2><p class="muted">${esc(l.desc)}</p></div><div class="dv"><div><span>Status</span><b>${esc(x.st)}</b></div><div><span>Plant</span><b>${esc(plantLabel(l.plant))}</b></div><div><span>Material</span><b class="mono">${esc(l.material)}</b></div><div><span>Tgl butuh</span><b>${esc(G.fDate(l.reqDate))}</b></div><div><span>Diminta / sisa</span><b>${fmt(l.reqQty)} / ${fmt(l.diff)} ${esc(l.uom)}</b></div><div><span>Penerima</span><b>${esc(l.recipient || l.costCenter || '-')}</b></div></div><div id="rvd"></div>`, { wide: true, label: 'Reservasi' });
    const box = body.querySelector('#rvd');
    if (!x.mv.length) { box.innerHTML = `<p class="muted pad">${S.mb51 ? 'Belum ada gerakan MB51 dengan nomor reservasi ini.' : 'MB51 belum dimuat.'}</p>`; return; }
    const g = G.fromObjs(x.mv.slice().sort((a, b) => (a.date || 0) - (b.date || 0)), [['Tanggal', (m) => D(m.date)], ['Plant', (m) => m.plant], ['SLoc', (m) => m.sloc], ['Mvt', (m) => m.mt], ['Keterangan Mvt', (m) => m.mtText], ['Qty', (m) => m.qty], ['Satuan', (m) => m.uom], ['Nilai', (m) => m.amount], ['Mata uang', (m) => m.cur], ['Dok. material', (m) => m.matDoc], ['Teks', (m) => m.header], ['User', (m) => m.user]]);
    G.table(box, { head: g.head, rows: g.rows, name: 'GI_Reservasi_' + l.resv, plantCol: -1, autoHeight: g.rows.length <= 12, types: { Mvt: 'text' }, source: 'Gerakan MB51 untuk reservasi ini (Qty negatif = barang keluar).' });
  };

  // ---------- Keluar-Masuk Barang (MB51) ----------
  const mYM = (d) => d.getFullYear() * 12 + d.getMonth();
  PAGES.gerak = function () {
    if (!S.mb51) return empty('file MB51', 'Keluar-Masuk Barang dibaca dari MB51.');
    const mode = S.gkMode || 'rekap', metric = S.gkMetric || 'n';
    $('view').innerHTML = `<div class="seg-bar"><span id="gkSeg"></span><span id="gkMet"></span><span class="note">Grafik mengikuti filter tabel. Qty antar material berbeda satuan, jadi grafik memakai jumlah gerakan atau nilai per mata uang.</span></div><div class="mp-chart" id="gkChart" role="img" aria-label="Grafik masuk dan keluar per bulan"></div><div id="gkBody"></div>`;
    seg('gkSeg', [['rekap', 'Rekap'], ['trx', 'Transaksi']], mode, (v) => { S.gkMode = v; PAGES.gerak(); });
    seg('gkMet', [['n', 'Jumlah gerakan'], ['IDR', 'Nilai IDR'], ['USD', 'Nilai USD']], metric, (v) => { S.gkMetric = v; PAGES.gerak(); });
    const ch = echarts.init($('gkChart')), rs = () => ch.resize(); window.addEventListener('resize', rs); G.track($('gkChart'), () => { window.removeEventListener('resize', rs); ch.dispose(); });
    const mv = S.mb51.moves.filter((m) => m.date && m.mt), dir = (m) => (m.qty < 0 ? 'Keluar' : 'Masuk');
    // baris rekap: per bulan, plant, movement type
    let rows, head, types = { Mvt: 'text' };
    const dirOf = (o) => o.dir, mkVal = (o) => (metric === 'n' ? o.n : o.cur === metric ? Math.abs(o.val) : 0);
    if (mode === 'rekap') {
      const g = new Map();
      mv.forEach((m) => { const ym = mYM(m.date), k = ym + '|' + m.plant + '|' + m.mt + '|' + dir(m) + '|' + m.cur; let o = g.get(k); if (!o) g.set(k, (o = { ym, plant: m.plant, mt: m.mt, txt: m.mtText, cat: m.cat || '', dir: dir(m), cur: m.cur, n: 0, mats: new Set(), val: 0 })); o.n++; o.mats.add(m.material); o.val += m.amount || 0; });
      const R = [...g.values()]; head = null; rows = G.fromObjs(R, [['Bulan', (o) => new Date(Math.floor(o.ym / 12), o.ym % 12, 1)], ['Plant', (o) => o.plant], ['Mvt', (o) => o.mt], ['Keterangan Mvt', (o) => o.txt], ['Kategori', (o) => o.cat], ['Arah', (o) => o.dir], ['Jumlah gerakan', (o) => o.n], ['Material unik', (o) => o.mats.size], ['Mata uang', (o) => o.cur], ['Nilai', (o) => o.val]]);
      rows.dates = 'Bulan';
    } else rows = G.fromObjs(mv, [['Tanggal', (m) => m.date], ['Plant', (m) => m.plant], ['SLoc', (m) => m.sloc], ['Mvt', (m) => m.mt], ['Keterangan Mvt', (m) => m.mtText], ['Kategori', (m) => m.cat || ''], ['Arah', dir], ['Material', (m) => m.material], ['Deskripsi', (m) => m.desc], ['Qty', (m) => m.qty], ['Satuan', (m) => m.uom], ['Nilai', (m) => m.amount], ['Mata uang', (m) => m.cur], ['PO', (m) => m.po], ['Reservasi', (m) => m.resv], ['Dok. material', (m) => m.matDoc], ['Teks', (m) => m.header], ['User', (m) => m.user], ['Client', (m) => (m.wk === 'PHE' ? '180' : '100')]]);
    const paint = (api) => {
      const agg = new Map(); let lo = 1e9, hi = 0;
      api.forEachNodeAfterFilterAndSort((n) => { const o = n.data.o, ym = mode === 'rekap' ? o.ym : mYM(o.date), dr = mode === 'rekap' ? o.dir : dir(o), v = mode === 'rekap' ? mkVal(o) : metric === 'n' ? 1 : o.cur === metric ? Math.abs(o.amount || 0) : 0;
        lo = Math.min(lo, ym); hi = Math.max(hi, ym); const k = ym + '|' + dr; agg.set(k, (agg.get(k) || 0) + v); });
      const ms = []; for (let i = lo; i <= hi; i++) ms.push(i); const unit = metric === 'n' ? 'jumlah gerakan' : 'nilai ' + metric;
      ch.setOption({ animation: false, color: ['#0a6ed1', '#e9730c'], grid: { left: 64, right: 16, top: 50, bottom: 40 }, tooltip: { trigger: 'axis', valueFormatter: (v) => Number(v).toLocaleString('id-ID') }, legend: { left: 'center', bottom: 0, itemWidth: 12, textStyle: { fontSize: 11 } },
        title: { text: 'Barang masuk vs keluar per bulan', subtext: `Satuan: ${unit}. Sumber: MB51. Mengikuti filter tabel.`, left: 0, textStyle: { fontSize: 13, fontWeight: 600 }, subtextStyle: { fontSize: 11 } },
        xAxis: { type: 'category', data: ms.map(mLabel), axisLabel: { fontSize: 11 } }, yAxis: { type: 'value', axisLabel: { fontSize: 11, formatter: (v) => (v >= 1e9 ? v / 1e9 + ' M' : v >= 1e6 ? v / 1e6 + ' jt' : v) } },
        series: ['Masuk', 'Keluar'].map((n) => ({ name: n, type: 'bar', data: ms.map((i) => agg.get(i + '|' + n) || 0) })) });
    };
    G.table($('gkBody'), { head: rows.head, rows: rows.rows, name: 'MB51_' + mode, plantCol: rows.head.indexOf('Plant'), types, hide: mode === 'trx' ? ['SLoc', 'Deskripsi', 'PO', 'Teks', 'User'] : ['Kategori'], onFilter: paint,
      rowClick: mode === 'trx' ? (m) => MP.detail(m.material, m.plant) : undefined, cellClass: { Arah: (v) => (v === 'Keluar' ? 'st-warn' : 'st-ok') },
      source: `Sumber: MB51 ${S.src.mb51 ? Object.values(S.src.mb51).map((f) => esc(f.name)).join(', ') : ''}. Arah dari tanda Qty (negatif = keluar). ${mode === 'rekap' ? 'Satu baris = bulan x plant x movement type x arah x mata uang.' : 'Satu baris = satu gerakan; klik untuk detail material.'}` });
  };
})();
