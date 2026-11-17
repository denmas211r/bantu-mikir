// ============ Material Planning (Fase 2): Cari Material, Overview/Detail MRP, Timeline & Horizon, RKM ============
// Memakai data yang sudah dimuat mesin lama (S.mb52, S.mrpRes, S.me2n, S.mb25, S.me3n, S.rkmCons). Rumus MRP tidak diubah.
// Angka di sini fakta dari file SAP/MRP; tidak ada aturan "transfer vs RO" (belum diputuskan Digi).
// Dimuat paling akhir (sesudah views.js) karena menggantikan PAGES.cari lama (tampilan matriks dipindah ke PAGES.carilama).
(function () {
  const MP = (window.MP = { zonaHook: null });
  document.addEventListener('zonachange', () => { if (MP.zonaHook) MP.zonaHook(); });
  const ok = (p) => G.zonaOk(p);
  const nrm = (i) => (i.sohNormal != null ? i.sohNormal : i.soh) || 0;
  const sum = (a, f) => a.reduce((t, x) => t + (f(x) || 0), 0);
  const uniq = (a) => [...new Set(a)];
  const fin = (v) => (typeof v === 'number' && isFinite(v) ? v : null);
  const stCls = (v) => (/^(Terlambat|Perlu order)/.test(v) ? 'st-low' : /^(Pesan sekarang|Berlebih)/.test(v) ? 'st-warn' : /^(Tercukupi|Cukup|Aman)/.test(v) ? 'st-ok' : 'st-mute');
  const nowIdx = () => { const d = new Date(); return d.getFullYear() * 12 + d.getMonth(); };
  const ymOf = (d) => (d instanceof Date ? d.getFullYear() * 12 + d.getMonth() : null);

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

  // ---------- Detail material (panel samping, tab: stok per plant, OS/PO, reservasi, kontrak, transaksi) ----------
  MP.detail = function (mat, plant) {
    const X = idx(), its = X.it.get(mat) || [], mrs = X.mr.get(mat) || [], pos = X.po.get(mat) || [], rss = X.rs.get(mat) || [], kts = (S.me3n ? S.me3n.items.filter((i) => i.material === mat) : []);
    const ref = its[0] || mrs[0] || pos[0] || rss[0] || {};
    const plantsAll = uniq([...its, ...mrs, ...pos, ...rss].map((x) => x.plant)).sort();
    const body = UI.drawer(`<div class="d-head"><h2 class="mono">${esc(mat)}</h2><p class="muted">${esc(ref.desc || '')}</p></div>
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

  // ---------- Cari Material ----------
  const oldCari = PAGES.cari; PAGES.carilama = oldCari;
  PAGES.cari = function () {
    if (!S.mb52) { $('view').innerHTML = needFile('file MB52', 'Cari Material membaca stok dari MB52. Min/Max dari mesin MRP kalau file MRP dimuat.'); return; }
    const X = idx(), items = activeItems();
    const rows = items.map((m) => { const pl = (X.po.get(m.material) || []).filter((l) => l.plant === m.plant), rl = (X.rs.get(m.material) || []).filter((l) => l.plant === m.plant);
      return { m, po: S.me2n ? sum(pl, (l) => l.openQty) : null, rs: S.mb25 ? sum(rl, (l) => l.diff) : null }; });
    const d = G.fromObjs(rows, [['Plant', (o) => o.m.plant], ['Material', (o) => o.m.material], ['Deskripsi', (o) => o.m.desc], ['Unrestricted', (o) => nrm(o.m)], ['Stok lain', (o) => o.m.soh - nrm(o.m) + (o.m.transit || 0) || null], ['Satuan', (o) => o.m.uom],
      ['Harga/unit', (o) => o.m.price], ['Nilai', (o) => o.m.value], ['Mata uang', (o) => stockCur(o.m.plant)], ['OS PO/RO', (o) => o.po], ['Reservasi', (o) => o.rs], ['Min', (o) => (o.m.mrp ? o.m.mrp.min : null)], ['Max', (o) => (o.m.mrp ? o.m.mrp.max : null)], ['Aging', (o) => (o.m.mrp ? o.m.mrp.aging : '')], ['Status', (o) => o.m.status]]);
    $('view').innerHTML = '<div id="cBody"></div>';
    G.table($('cBody'), { head: d.head, rows: d.rows, name: 'Cari_Material', plantCol: 0, types: { Material: 'text' }, hide: ['Harga/unit'], cellClass: { Status: (v) => (/Kosong|Di bawah/.test(v) ? 'st-low' : v === 'Surplus' ? 'st-warn' : v === 'Aman' ? 'st-ok' : 'st-mute') },
      rowClick: (o) => MP.detail(o.m.material, o.m.plant), source: `Sumber: MB52 ${S.src.mb52 ? Object.values(S.src.mb52).map((f) => esc(f.name)).join(', ') : ''}${S.mrpRes ? ', MRP' : ''}${S.me2n ? ', ME2N' : ''}${S.mb25 ? ', MB25' : ''}. Satu baris = material per plant. Klik baris untuk detail. Unrestricted = valuation ZNORMAL. Nilai per client (IDR/USD), tidak dijumlahkan.` });
  };

  // ---------- Overview Material per Zona (Overview | Detail MRP per plant) ----------
  function ovRows() {
    const X = idx(), mats = new Set([...X.it.keys(), ...X.mr.keys(), ...X.po.keys(), ...X.rs.keys()]), out = [];
    mats.forEach((m) => {
      const its = (X.it.get(m) || []).filter((i) => ok(i.plant)), mrs = (X.mr.get(m) || []).filter((r) => ok(r.plant)), pos = (X.po.get(m) || []).filter((l) => ok(l.plant)), rss = (X.rs.get(m) || []).filter((l) => ok(l.plant));
      if (!its.length && !mrs.length && !pos.length && !rss.length) return;
      const ref = its[0] || mrs[0] || pos[0] || rss[0], kts = X.kt.get(m) || [], docs = uniq(kts.map((i) => i.doc)), pick = S.me3n && S.me3n.pick.get(m), pd = pick && S.me3n.docs.get(pick.doc);
      const stock = its.length ? sum(its, nrm) : sum(mrs, (r) => r.stock);
      out.push({ m, desc: ref.desc || '', uom: ref.uom || '', plants: uniq([...its, ...mrs, ...pos, ...rss].map((x) => x.plant)).sort(), stock, other: sum(its, (i) => i.soh - nrm(i) + (i.transit || 0)),
        ospo: S.me2n ? sum(pos, (l) => l.openQty) : null, rs: S.mb25 ? sum(rss, (l) => l.diff) : null, mrs, toOrder: S.mrpRes ? sum(mrs, (r) => r.toOrder) : null, surplus: S.mrpRes ? sum(mrs, (r) => r.surplus) : null,
        need: mrs.filter((r) => r.toOrder > 0).map((r) => r.plant), sur: mrs.filter((r) => r.surplus > 0).map((r) => r.plant), nKon: S.me3n ? docs.length : null, kts, pick, pd });
    });
    return out;
  }
  function dtRows() {
    const X = idx(), res = S.mrpRes ? [...S.mrpRes.values()].filter((r) => ok(r.plant)) : [];
    return res.map((r) => { const o = (X.it.get(r.material) || []).filter((i) => ok(i.plant) && i.plant !== r.plant), mo = (X.mr.get(r.material) || []).filter((x) => ok(x.plant) && x.plant !== r.plant);
      return { r, oStock: sum(o, nrm) || (mo.length ? sum(mo, (x) => x.stock) : 0), oSur: sum(mo, (x) => x.surplus), oN: uniq([...o.map((i) => i.plant), ...mo.map((x) => x.plant)]).length }; });
  }
  PAGES.overview = function () {
    if (!S.mb52 && !S.mrpRes) { $('view').innerHTML = needFile('MB52 atau MRP', 'Overview Material membaca stok (MB52), OS PO (ME2N), reservasi (MB25), kontrak (ME3N), dan hasil MRP.'); return; }
    const mode = S.ovMode || 'ov'; MP.zonaHook = () => PAGES.overview();
    $('view').innerHTML = `<div class="seg-bar"><span id="ovSeg"></span><span class="note">Zona terpilih di kanan atas. Angka agregat lintas plant terpilih; satuan material sama, nilai uang tidak dijumlahkan lintas mata uang.</span></div><div id="ovBody"></div>`;
    UI.seg($('ovSeg'), [['ov', 'Overview'], ['dt', 'Detail (MRP per plant)']], mode, (v) => { S.ovMode = v; PAGES.overview(); });
    const src = `Sumber: ${['MB52', 'MRP', 'ME2N (OS PO/RO)', 'MB25 (reservasi terbuka)', 'ME3N (kontrak aktif)'].filter((x, i) => [S.mb52, S.mrpRes, S.me2n, S.mb25, S.me3n][i]).join(', ')}. `;
    if (mode === 'ov') {
      const R = ovRows(), d = G.fromObjs(R, [['Material', (o) => o.m], ['Deskripsi', (o) => o.desc], ['Satuan', (o) => o.uom], ['Plant ada data', (o) => o.plants.join(', ')], ['Stok', (o) => o.stock], ['Stok lain', (o) => o.other || null], ['OS PO/RO', (o) => o.ospo], ['Reservasi terbuka', (o) => o.rs],
        ['Stok + OS − Reservasi', (o) => (o.ospo == null && o.rs == null ? null : o.stock + (o.ospo || 0) - (o.rs || 0))], ['To Order MRP', (o) => o.toOrder], ['Surplus (di atas Max)', (o) => o.surplus], ['Plant perlu order', (o) => o.need.join(', ')], ['Plant surplus', (o) => o.sur.join(', ')],
        ['Kontrak aktif', (o) => o.nKon], ['Kontrak terpilih', (o) => (o.pick ? o.pick.doc : '')], ['Vendor', (o) => (o.pick ? o.pick.vendor : '')], ['Berlaku s.d.', (o) => (o.pd ? o.pd.end : null)], ['Sisa hari', (o) => (o.pick ? o.pick.sisaHari : null)], ['Sisa qty kontrak', (o) => (o.kts.length ? sum(o.kts, (i) => i.openQty) : null)],
        ['Sisa nilai kontrak', (o) => (o.pick ? o.pick.sisa : null)], ['Mata uang kontrak', (o) => (o.pick ? o.pick.currency : '')]]);
      G.table($('ovBody'), { head: d.head, rows: d.rows, name: 'Overview_Material', plantCol: -1, types: { Material: 'text' }, hide: ['Satuan', 'Plant surplus', 'Mata uang kontrak'], rowClick: (o) => MP.detail(o.m), source: src + 'Satu baris = material lintas plant dalam zona terpilih. Klik baris untuk detail.' });
    } else {
      if (!S.mrpRes) { $('ovBody').innerHTML = '<p class="muted pad">Detail MRP butuh file MRP (WK PEP) atau MB52 + MB51 client 180 (WK PHE).</p>'; return; }
      const R = dtRows(), d = G.fromObjs(R, [['Plant', (o) => o.r.plant], ['Material', (o) => o.r.material], ['KIMAP', (o) => o.r.kimap], ['Deskripsi', (o) => o.r.desc], ['Satuan', (o) => o.r.uom], ['Kelas', (o) => o.r.cls || ''], ['Aging', (o) => o.r.aging || ''],
        ['AMU', (o) => fin(o.r.amu)], ['LT (bln)', (o) => fin(o.r.lt)], ['SS', (o) => fin(o.r.ss)], ['Min', (o) => fin(o.r.min2)], ['Max', (o) => fin(o.r.max2)], ['Stok', (o) => o.r.stock], ['OS PO/RO', (o) => o.r.ospo], ['Reservasi', (o) => o.r.mb25], ['To Order', (o) => o.r.toOrder], ['Surplus', (o) => o.r.surplus || null],
        ['Cover (bln)', (o) => fin(o.r.cover)], ['Jalur', (o) => (o.r.toOrder > 0 ? (o.r.oa ? 'RO ' + o.r.oa : 'PR') : '')], ['Stok plant lain', (o) => o.oStock || null], ['Surplus plant lain', (o) => o.oSur || null], ['Surplus lain / To Order (%)', (o) => (o.r.toOrder > 0 && o.oSur ? Math.round((o.oSur / o.r.toOrder) * 100) : null)],
        ['Status', (o) => (o.r.toOrder > 0 ? 'Perlu order' : o.r.berlebih ? 'Berlebih' : 'Cukup')], ['Catatan', (o) => o.r.note || '']]);
      G.table($('ovBody'), { head: d.head, rows: d.rows, name: 'MRP_per_Plant', plantCol: 0, types: { Material: 'text', KIMAP: 'text' }, hide: ['KIMAP', 'Satuan', 'Cover (bln)', 'Catatan'], pin: ['Plant', 'Material'], cellClass: { Status: stCls }, rowClick: (o) => MP.detail(o.r.material, o.r.plant),
        source: src + 'Min/Max/SS/AMU/To Order = hasil mesin MRP (metode ' + esc(S.set.method) + '). Stok dan surplus plant lain dalam zona terpilih = fakta pembanding, bukan rekomendasi transfer.' });
    }
  };

  // ---------- Timeline & Horizon ----------
  function hzRows() {
    const X = idx(), now = nowIdx(), end = Math.max(RKM_YEAR * 12 + 11, now + 11), n = end - now + 1, at = (d) => Math.min(n - 1, Math.max(0, (ymOf(d) == null ? now : ymOf(d)) - now)), Z = () => new Array(n).fill(0);
    const E = new Map(), get = (k, p, m) => E.get(k) || E.set(k, { k, plant: p, material: m, need: Z(), po: Z(), rs: Z(), hasR: false, hasP: false, hasS: false }).get(k);
    const D = S.rkmCons ? rkmData() : null;
    if (D) D.rows.forEach((o) => { const m = o.material || o.kimap; if (!m || !o.plant) return; const e = get(m + '|' + o.plant, o.plant, m); e.hasR = true; e.rk = o; o.need.forEach((v, i) => { if (v) e.need[at(new Date(RKM_YEAR, i, 1))] += v; }); });
    X.po.forEach((ls, m) => ls.forEach((l) => { const e = get(m + '|' + l.plant, l.plant, m); e.hasP = true; e.po[at(l.delivery)] += l.openQty; }));
    X.rs.forEach((ls, m) => ls.forEach((l) => { const e = get(m + '|' + l.plant, l.plant, m); e.hasS = true; e.rs[at(l.reqDate)] += l.diff; }));
    if (S.mrpRes) S.mrpRes.forEach((r) => { if (r.toOrder > 0) get(r.material + '|' + r.plant, r.plant, r.material); });
    const mb = S.mb52 ? new Map(S.mb52.items.map((i) => [i.material + '|' + i.plant, i])) : new Map(), out = [];
    E.forEach((e) => {
      const r = S.mrpRes ? S.mrpRes.get(e.k) : null, it = mb.get(e.k), stock = r ? r.stock || 0 : it ? nrm(it) : 0, desc = (r && r.desc) || (it && it.desc) || (e.rk && e.rk.desc) || '', lt = r && r.lt != null ? r.lt : e.rk && e.rk.lt != null ? e.rk.lt : null;
      const soh = Z(), bal = Z(); let c = stock; for (let i = 0; i < n; i++) { soh[i] = c; bal[i] = c + e.po[i] - e.need[i] - e.rs[i]; c = bal[i]; }
      const fs = bal.findIndex((b, i) => b < 0 && e.need[i] + e.rs[i] > 0), sIdx = fs >= 0 ? now + fs : null, due = sIdx != null && lt != null ? sIdx - Math.ceil(lt) : null;
      const st = sIdx == null ? 'Tercukupi' : due == null ? 'LT belum ada' : due < now ? 'Terlambat pesan' : due <= now + 1 ? 'Pesan sekarang' : 'Terjadwal';
      out.push(Object.assign(e, { r, desc, uom: (r && r.uom) || (it && it.uom) || '', lt, stock, bal, sIdx, due, st, lewat: sIdx == null ? '' : r && r.oa ? 'RO' : 'PR', src: [e.hasR && 'RKM', e.hasP && 'PO/RO', e.hasS && 'Reservasi', r && r.toOrder > 0 && 'MRP'].filter(Boolean).join(' + ') }));
    });
    return { rows: out, now, n };
  }
  PAGES.horizon = function () {
    if (!S.mb52 && !S.mrpRes && !S.me2n && !S.mb25) { $('view').innerHTML = needFile('file SAP', 'Timeline & Horizon memakai MB52, ME2N (tanggal kirim PO), MB25 (tanggal butuh reservasi), MRP, dan RKM kalau ada.'); return; }
    MP.zonaHook = () => PAGES.horizon();
    const H = hzRows(), lab = (i) => mLabel(i), months = Array.from({ length: H.n }, (_, i) => H.now + i);
    const d = G.fromObjs(H.rows.filter((e) => ok(e.plant)), [['Plant', (e) => e.plant], ['Material', (e) => e.material], ['Deskripsi', (e) => e.desc], ['Satuan', (e) => e.uom], ['Sumber', (e) => e.src], ['LT (bln)', (e) => e.lt], ['Stok', (e) => e.stock], ['Total RKM', (e) => sum(e.need, (v) => v) || null], ['Total reservasi', (e) => sum(e.rs, (v) => v) || null], ['Total OS PO/RO', (e) => sum(e.po, (v) => v) || null],
      ['Mulai kurang', (e) => (e.sIdx != null ? lab(e.sIdx) : '')], ['Pesan paling lambat', (e) => (e.due != null ? lab(e.due) : '')], ['Jalur', (e) => e.lewat], ['Status', (e) => e.st], ['To Order MRP', (e) => (e.r ? e.r.toOrder : null)], ['Min', (e) => (e.r ? fin(e.r.min2) : null)], ['Max', (e) => (e.r ? fin(e.r.max2) : null)],
      ...months.map((m, i) => ['Saldo ' + lab(m), (e) => e.bal[i]])]);
    $('view').innerHTML = `<div class="mp-chart" id="hzChart" role="img" aria-label="Grafik jumlah material per bulan"></div><div id="hzBody"></div>`;
    const ch = echarts.init($('hzChart')), rs = () => ch.resize(); window.addEventListener('resize', rs);
    G.track($('hzChart'), () => { window.removeEventListener('resize', rs); ch.dispose(); });
    const CAT = ['Terlambat pesan', 'Pesan sekarang', 'Terjadwal', 'LT belum ada'], COL = ['#bb0000', '#e9730c', '#0a6ed1', '#8a8d91'];
    const paint = (api) => {
      const rows = []; api.forEachNodeAfterFilterAndSort((n) => rows.push(n.data.o));
      const cnt = (f) => months.map((_, i) => rows.filter((e) => f(e, i)).length);
      ch.setOption({ animation: false, color: COL.concat(['#107e3e', '#5b4fb5', '#32363a']), grid: { left: 48, right: 16, top: 56, bottom: 52 }, tooltip: { trigger: 'axis' },
        title: { text: 'Jumlah material-plant per bulan', subtext: `Satuan: jumlah baris material-plant. Batang = bulan mulai kurang per status; garis = PO/RO tiba, reservasi jatuh tempo, kebutuhan RKM. Mengikuti filter tabel (${rows.length.toLocaleString('id-ID')} baris).`, left: 0, textStyle: { fontSize: 13, fontWeight: 600 }, subtextStyle: { fontSize: 11 } },
        legend: { left: 'center', bottom: 0, itemWidth: 12, textStyle: { fontSize: 11 } }, xAxis: { type: 'category', data: months.map(lab), axisLabel: { fontSize: 11 } }, yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        series: [...CAT.map((c, k) => ({ name: c, type: 'bar', stack: 'k', data: cnt((e, i) => e.sIdx === H.now + i && e.st === c) })),
          { name: 'PO/RO tiba', type: 'line', data: cnt((e, i) => e.po[i] > 0) }, { name: 'Reservasi jatuh tempo', type: 'line', data: cnt((e, i) => e.rs[i] > 0) }, { name: 'Kebutuhan RKM', type: 'line', data: cnt((e, i) => e.need[i] > 0) }] });
    };
    G.table($('hzBody'), { head: d.head, rows: d.rows, name: 'Timeline_Horizon', plantCol: 0, types: { Material: 'text' }, hide: ['Satuan', 'Min', 'Max'], pin: ['Plant', 'Material'], cellClass: { Status: stCls, 'To Order MRP': (v) => (v > 0 ? 'st-low' : '') },
      rowClick: (o) => MP.detail(o.material, o.plant), onFilter: paint,
      source: `Saldo bulan = saldo bulan lalu + OS PO/RO (menurut tanggal kirim) − kebutuhan RKM − reservasi terbuka (menurut tanggal butuh); yang tanggalnya sudah lewat masuk bulan ini. Mulai dari stok ZNORMAL (MRP/MB52). Pesan paling lambat = bulan mulai kurang − lead time; jalur RO bila ada kontrak aktif, selain itu PR. Rekomendasi MRP (To Order, Min, Max) dari mesin MRP; ${S.rkmCons ? 'RKM ' + RKM_YEAR + ' ikut dihitung' : 'RKM belum dimuat'}. Satuan per material, jangan dijumlahkan antar baris.` });
  };

  // ---------- RKM ----------
  PAGES.rkmx = function () {
    if (!S.rkmFiles.length || !S.rkmCons) { $('view').innerHTML = `<div class="panel empty"><h3>Belum ada file RKM</h3><p>Taruh file RKM tiap lapangan di folder data (boleh di subfolder, mis. RKM 2027/Rantau/), lalu muat ulang.</p><a class="btn primary" href="#/data">Buka Sumber Data</a></div>`; return; }
    const tab = S.rkmxTab || 'mat', D = rkmData(), now = D.nowIdx;
    $('view').innerHTML = `<div class="seg-bar"><span id="rxSeg"></span><span class="note" id="rxSum"></span></div><div id="rxBody"></div>`;
    UI.seg($('rxSeg'), [['mat', 'Per material'], ['row', 'Baris RKM']], tab, (v) => { S.rkmxTab = v; PAGES.rkmx(); });
    if (tab === 'mat') {
      const R = D.rows, noK = R.filter((o) => !o.kimap).length, noM = R.filter((o) => !o.r).length, kur = R.filter((o) => o.f.shortTotal > 0).length;
      $('rxSum').textContent = `${fmt(R.length, 0)} material-plant, ${fmt(noK, 0)} tanpa KIMAP, ${fmt(noM, 0)} tidak cocok ke MRP, ${fmt(kur, 0)} belum tertutup stok + PO/RO.`;
      const mo = Array.from({ length: 12 }, (_, i) => 'RKM ' + MON[i] + ' ' + RKM_YEAR);
      const d = G.fromObjs(R, [['Plant', (o) => o.plant], ['KIMAP', (o) => o.kimap], ['Material MRP', (o) => o.material], ['Deskripsi', (o) => o.desc], ['Satuan', (o) => o.unit], ['PIC', (o) => uniq(o.pics.map((p) => p.pic || p.fungsi).filter(Boolean)).join(', ')], ['File', (o) => o.files.size],
        ['Total RKM', (o) => o.total], ['Stok', (o) => o.stock], ['OS PO/RO', (o) => o.ospo], ['Tertutup', (o) => o.total - o.f.shortTotal], ['Kurang', (o) => o.f.shortTotal || null], ['Mulai kurang', (o) => (o.shortIdx != null ? mLabel(o.shortIdx) : '')], ['LT (bln)', (o) => o.lt],
        ['Pesan paling lambat', (o) => (o.due != null ? mLabel(o.due) : '')], ['Jalur', (o) => o.lewat], ['Status', (o) => o.st[0]], ['Cocok ke MRP', (o) => (!o.r ? 'Tidak cocok' : o.r.material === o.kimap || o.r.kimap === o.kimap ? 'KIMAP' : 'Deskripsi')], ['Tanpa KIMAP', (o) => (o.kimap ? 'Tidak' : 'Ya')],
        ['Min', (o) => (o.r ? fin(o.r.min2) : null)], ['Max', (o) => (o.r ? fin(o.r.max2) : null)], ['To Order MRP', (o) => (o.r ? o.r.toOrder : null)], ['Sumber stok', (o) => o.src], ...mo.map((h, i) => [h, (o) => o.need[i] || null])]);
      G.table($('rxBody'), { head: d.head, rows: d.rows, name: 'RKM_per_Material', plantCol: 0, types: { KIMAP: 'text', 'Material MRP': 'text' }, hide: ['Satuan', 'File', 'Sumber stok', ...mo], pin: ['Plant', 'KIMAP'], cellClass: { Status: stCls, Kurang: (v) => (v > 0 ? 'st-low' : ''), 'Cocok ke MRP': (v) => (v === 'Tidak cocok' ? 'st-warn' : ''), 'Tanpa KIMAP': (v) => (v === 'Ya' ? 'st-warn' : '') },
        rowClick: (o) => { const m = o.material || o.kimap; if (m) MP.detail(m, o.plant); },
        source: `RKM ${RKM_YEAR} dari file lapangan (baris dobel antar file tidak dihitung). Pemenuhan = stok ZNORMAL + OS PO/RO dianggap tersedia awal ${RKM_YEAR}, dipakai berurutan menurut bulan kebutuhan. Pesan paling lambat = bulan mulai kurang − lead time. Cocok ke MRP: KIMAP dulu, lalu deskripsi.` });
    } else {
      const C = S.rkmCons; $('rxSum').textContent = `${fmt(C.kept.length, 0)} baris dipakai, ${fmt(C.dups.length, 0)} baris dobel antar file tidak dihitung.`;
      const d = G.fromObjs(C.rows, [['File', (r) => r.file], ['Sheet', (r) => r.sheet], ['Plant', (r) => r.plant], ['PIC', (r) => r.pic], ['Fungsi', (r) => r.fungsi], ['KIMAP', (r) => r.kimap], ['Deskripsi', (r) => r.desc], ['Satuan', (r) => r.unit], ['Total', (r) => r.total], ['Rincian bulan', (r) => (r.monthsKnown ? 'Ada' : 'Tidak ada')],
        ['Status baris', (r) => (r.dup ? 'Dobel, tidak dihitung' : 'Dipakai')], ['Alasan dobel', (r) => (r.dup ? r.dup.reason : '')], ['Catatan', (r) => r.cek || '']]);
      G.table($('rxBody'), { head: d.head, rows: d.rows, name: 'RKM_Baris', plantCol: 2, types: { KIMAP: 'text' }, cellClass: { 'Status baris': (v) => (v === 'Dipakai' ? 'st-ok' : 'st-warn') }, source: 'Satu baris = satu baris di file RKM. File hasil rekap (Integrated, Rekap, Format SHU) tidak dibaca.' });
    }
  };
})();
