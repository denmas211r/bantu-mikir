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

  // ---------- Pop-up material (satu untuk seluruh web) ----------
  // Atas: nama, kode, status. Tengah: kartu ringkas (stok, Min-Max, PO, reservasi, To Order, cakupan, nilai, kontrak).
  // Bawah: tab tabel dengan gaya dan ukuran seragam (G.table compact). Hanya fakta dari SAP/MRP, tanpa rekomendasi otomatis.
  const TABS_D = [['stok', 'Stok'], ['mrp', 'MRP'], ['po', 'PO/RO'], ['rsv', 'Reservasi'], ['kon', 'Kontrak'], ['trx', 'Transaksi'], ['pakai', 'Pemakaian']];
  const STAT_PILL = { 'Perlu order': 'low', Kosong: 'low', 'Di bawah Min': 'warn', Surplus: 'info', Aman: 'ok' };
  const D = (v) => (v instanceof Date ? v : null);
  MP.detail = function (mat, plant, opt = {}) {
    const X = idx(), o = window.matIndex().map.get(mat) || null;
    const its0 = X.it.get(mat) || [], mrs0 = X.mr.get(mat) || [], pos0 = X.po.get(mat) || [], rss0 = X.rs.get(mat) || [];
    const kts0 = S.me3n ? S.me3n.items.filter((i) => i.material === mat) : [], mv0 = mvOf(mat);
    const ref = its0[0] || mrs0[0] || pos0[0] || rss0[0] || {};
    const plantsAll = uniq([...its0, ...mrs0, ...pos0, ...rss0, ...mv0].map((x) => x.plant).filter(Boolean)).sort();
    const body = UI.drawer('', { wide: true, label: 'Detail material ' + mat });
    if (!o && !plantsAll.length) { body.innerHTML = `<div class="md-head"><h2 class="mono">${esc(mat)}</h2></div><p class="muted">Material tidak ada di data yang dimuat.</p>`; return; }
    const uom = (o && o.uom) || ref.uom || '';
    const F = { plant: opt.calc || (plant && plantsAll.includes(plant) ? plant : ''), tab: opt.calc ? 'mrp' : 'stok', calc: opt.calc || '' };
    const render = () => {
      const inP = (x) => !F.plant || x.plant === F.plant;
      const its = its0.filter(inP), mrs = mrs0.filter(inP), pos = pos0.filter(inP), rss = rss0.filter(inP), kts = kts0, mv = mv0.filter(inP);
      const mon = mrs.filter((r) => S.mrpPlants.has(r.plant));
      const stock = its.length ? sum(its, nrm) : sum(mrs, (r) => r.stock), other = sum(its, (i) => i.soh - nrm(i)), transit = sum(its, (i) => i.transit);
      const ss = sum(mon, (r) => r.ss), mn = sum(mon, (r) => r.min2), mx = sum(mon, (r) => r.max2), amu = sum(mon, (r) => r.amu), toOrder = sum(mon, (r) => r.toOrder);
      const posK = mon.length ? mrpPos(stock, { min2: mn, max2: mx, ss }) : '';
      const cover = amu > 0 ? stock / amu : null, value = sum(its, (i) => toIDRv(i.value, stockCur(i.plant))), kt = o && o.contract;
      const tile = (label, val, sub, cls) => `<div class="kpi ${cls || ''}"><span>${label}</span><b>${val}</b>${sub ? `<small>${sub}</small>` : ''}</div>`;
      const stockSub = [other ? 'Val. type lain ' + fmt(other) : '', transit ? 'In transit ' + fmt(transit) : ''].filter(Boolean).join(' · ') || (posK ? esc(MRP_POS[posK]) : '');
      const tabN = { stok: its.length, mrp: mrs.length, po: pos.length, rsv: rss.length, kon: kts.length, trx: mv.length };
      body.innerHTML = `<div class="md-head"><h2>${esc((o && o.desc) || ref.desc || mat)}</h2><div class="meta"><span class="mono">${esc(mat)}</span><span>${esc(uom)}</span>${o && o.mg ? `<span>MG ${esc(o.mg.mg)} ${esc(o.mg.mgName)}</span>` : ''}${o && o.aging ? agingPill(o.aging) : ''}${o && o.status ? pill(o.status, STAT_PILL[o.status] || 'mute') : ''}</div></div>
        <div class="md-bar"><span id="mdP"></span></div>
        <div class="kpis">${tile('Stok', fmt(stock) + ' <small>' + esc(uom) + '</small>', stockSub, posK ? 'k-' + posK : '')}${tile('Min – Max', mon.length ? `${fmt(mn)} – ${fmt(mx)}` : '–', mon.length ? 'SS ' + fmt(ss) : 'Tidak dipantau MRP')}
          ${tile('OS PO/RO', fmt(sum(pos, (l) => l.openQty)), fmt(pos.length, 0) + ' baris')}${tile('Reservasi', fmt(sum(rss, (l) => l.diff)), fmt(rss.length, 0) + ' baris')}
          ${tile('To Order', fmt(toOrder), mon.length ? 'metode ' + esc(S.set.method === 'tko' ? 'TKO' : 'Excel') : '', toOrder > 0 ? 'k-low' : '')}${tile('Cakupan', cover == null ? '–' : fmt(cover, 1) + ' bln', 'AMU ' + fmt(amu, 1))}
          ${tile('Nilai stok', money(value, 'IDR'))}${tile('Kontrak', kt ? esc(kt.doc) : 'Tanpa kontrak', kt && kt.sisaHari != null ? fmt(kt.sisaHari, 0) + ' hari lagi' : '')}</div>
        <div class="tabs" id="mdTabs" role="tablist">${TABS_D.map(([k, t]) => `<button class="tab ${k === F.tab ? 'on' : ''}" role="tab" aria-selected="${k === F.tab}" data-t="${k}">${t}${tabN[k] != null ? `<span class="n">${fmt(tabN[k], 0)}</span>` : ''}</button>`).join('')}</div>
        <div id="mdBody"></div>`;
      UI.seg(body.querySelector('#mdP'), [['', 'Semua plant']].concat(plantsAll.map((p) => [p, plantLabel(p)])), F.plant, (v) => { F.plant = v; F.calc = ''; render(); });
      body.querySelectorAll('#mdTabs .tab').forEach((b) => (b.onclick = () => { F.tab = b.dataset.t; render(); }));
      const box = body.querySelector('#mdBody');
      const tbl = (cols, list, name, extra = {}) => { if (!list.length) { box.innerHTML = '<p class="muted pad">Tidak ada data.</p>'; return null; }
        const d = G.fromObjs(list, cols); return G.table(box, Object.assign({ head: d.head, rows: d.rows, name: mat + '_' + name, plantCol: -1, compact: true, autoHeight: d.rows.length <= 12 }, extra)); };
      const t = F.tab;
      if (t === 'stok') tbl([['Plant', (i) => i.plant], ['Zona', (i) => zonaOf(i.plant)], ['Unrestricted', (i) => nrm(i)], ['Val. type lain', (i) => i.soh - nrm(i) || null], ['In transit', (i) => i.transit || null], ['Nilai', (i) => i.value], ['Mata uang', (i) => stockCur(i.plant)],
        ['Lokasi', (i) => uniq(i.locs.map((l) => l.sloc)).join(', ')]], its, 'Stok');
      else if (t === 'mrp') {
        const posCls = (v, r) => (r ? 'mx-' + mrpPos(r.stock, r) : '');
        tbl([['Plant', (r) => r.plant], ['Aging', (r) => r.aging || ''], ['AMU', (r) => fin(r.amu)], ['LT (bln)', (r) => fin(r.lt)], ['SS', (r) => fin(r.ss)], ['Min', (r) => fin(r.min2)], ['Max', (r) => fin(r.max2)], ['Stok', (r) => r.stock], ['OS PO/RO', (r) => r.ospo], ['Reservasi', (r) => r.mb25], ['To Order', (r) => r.toOrder]],
          mrs, 'MRP', { cellClass: { SS: (v) => (v == null ? '' : 'mx-low'), Min: (v) => (v == null ? '' : 'mx-min'), Max: (v) => (v == null ? '' : 'mx-max'), Stok: posCls, 'To Order': (v) => (v > 0 ? 'st-low' : '') }, rowClick: (r) => { F.calc = F.calc === r.plant ? '' : r.plant; render(); } });
        const cr = mrs.find((r) => r.plant === F.calc);
        box.insertAdjacentHTML('beforeend', cr ? `<div class="calc" id="mrpCalc">${explainMRP(cr)}</div>` : mrs.length ? '<p class="muted small pad">Klik satu baris untuk melihat cara hitungnya.</p>' : '');
        if (cr && opt.calc) setTimeout(() => { const c = box.querySelector('#mrpCalc'); if (c) c.scrollIntoView({ block: 'nearest' }); }, 60);
      } else if (t === 'po') tbl([['Plant', (l) => l.plant], ['Dokumen', (l) => l.doc + '/' + l.item], ['Jenis', (l) => l.type], ['Vendor', (l) => l.vendor], ['Tgl kirim', (l) => D(l.delivery)], ['Qty', (l) => l.qty], ['Sisa kirim', (l) => l.openQty], ['Terlambat (hari)', (l) => l.lateDays || null], ['Kontrak (OA)', (l) => l.oa], ['PR', (l) => l.pr]], pos, 'PO_RO', { types: { Dokumen: 'text' } });
      else if (t === 'rsv') tbl([['Plant', (l) => l.plant], ['Reservasi', (l) => l.resv + '/' + l.item], ['Tgl butuh', (l) => D(l.reqDate)], ['Qty butuh', (l) => l.reqQty], ['Sudah diambil', (l) => l.removed], ['Sisa', (l) => l.diff], ['Penerima', (l) => l.recipient || l.costCenter || l.wbs || ''], ['Mvt', (l) => l.mt]], rss, 'Reservasi', { types: { Reservasi: 'text' } });
      else if (t === 'kon') tbl([['Kontrak', (i) => i.doc], ['Vendor', (i) => i.k.vendor], ['Berakhir', (i) => D(i.k.end)], ['Sisa hari', (i) => i.k.sisaHari], ['Status', (i) => (i.k.aktif ? 'Aktif' : 'Habis masa')], ['Harga', (i) => i.price], ['Mata uang', (i) => i.k.currency], ['Target qty', (i) => i.targetQty], ['Sisa qty', (i) => i.openQty]], kts, 'Kontrak', { types: { Kontrak: 'text' } });
      else if (t === 'trx') tbl([['Tanggal', (x) => D(x.date)], ['Plant', (x) => x.plant], ['Mvt', (x) => x.mt], ['Keterangan Mvt', (x) => x.mtText], ['Kategori', (x) => x.cat], ['Qty', (x) => x.qty], ['Nilai', (x) => x.amount], ['PO/Resv', (x) => x.po || x.resv], ['Teks', (x) => x.header], ['User', (x) => x.user]],
        mv.slice().sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 3000), 'Transaksi', { types: { Mvt: 'text' }, compact: false });
      else {
        const mi = window.matIndex(), L = mi.labels || {}, useWK = {};
        mrs.forEach((r) => { const lab = L[r.wk] || []; if (!lab.length) return; const u = useWK[r.wk] || (useWK[r.wk] = new Array(lab.length).fill(0)); (r.usageAll || []).forEach((v, k) => (u[k] += Math.abs(v || 0))); });
        const isGI = (x) => Number(x.qty) < 0 && (x.cat === 'Own Use' || OUT_MT.has(String(x.mt))), yr = new Map();
        mv.filter((x) => x.date).forEach((x) => { const g = yr.get(x.date.getFullYear()) || yr.set(x.date.getFullYear(), { y: x.date.getFullYear(), in: 0, out: 0, gi: 0 }).get(x.date.getFullYear()); if (x.qty > 0) g.in += x.qty; else g.out -= x.qty; if (isGI(x)) g.gi -= x.qty; });
        box.innerHTML = Object.keys(useWK).map((w) => `<section class="d-sec"><h3>Pemakaian bulanan WK ${w} <small>24 bulan terakhir</small></h3><div class="dUse" data-w="${w}"></div></section>`).join('') + '<div id="mdYr"></div>' + (Object.keys(useWK).length || yr.size ? '' : '<p class="muted pad">Tidak ada data pemakaian.</p>');
        box.querySelectorAll('.dUse').forEach((el) => { const w = el.dataset.w, lab = L[w], n = Math.min(24, lab.length); UI.columns(el, lab.slice(-n).map((l) => { const [y, m] = l.split('-'); return MON[+m - 1] + ' 20' + y; }), useWK[w].slice(-n), (v) => fmt(v, 1) + ' ' + uom); });
        const ys = [...yr.values()].sort((a, b) => b.y - a.y); if (ys.length) { const d = G.fromObjs(ys, [['Tahun', (g) => String(g.y)], ['Masuk', (g) => g.in], ['Keluar', (g) => g.out], ['Pemakaian GI', (g) => g.gi]]); G.table(box.querySelector('#mdYr'), { head: d.head, rows: d.rows, name: mat + '_Rekap_tahunan', plantCol: -1, compact: true, autoHeight: true, types: { Tahun: 'text' } }); }
      }
    };
    render();
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
      G.table($('dtT'), { head: d.head, rows: d.rows, name: 'MRP_per_Plant', plantCol: 0, types: { Material: 'text', KIMAP: 'text' }, hide: ['KIMAP', 'Satuan', 'Cover (bln)', 'Catatan'], pin: ['Plant', 'Material'], cellClass: { SS: (v) => (v == null ? '' : 'mx-low'), Min: (v) => (v == null ? '' : 'mx-min'), Max: (v) => (v == null ? '' : 'mx-max'), Stok: (v, o) => (o ? posCls(MRP_POS[mrpPos(o.r.stock, o.r)]) : ''), Status: stCls, 'Posisi stok': posCls }, rowClick: (o) => MP.detail(o.r.material, o.r.plant),
        source: src + 'Min/Max/SS/AMU/To Order = hasil mesin MRP (metode ' + esc(S.set.method) + '). Stok dan surplus plant lain dalam zona terpilih = fakta pembanding, bukan rekomendasi transfer.' });
    }
  };
})();
