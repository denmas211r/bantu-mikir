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
  // Bawah: tab tabel standar (T.table). Hanya fakta dari SAP/MRP, tanpa rekomendasi otomatis.
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
      const tbl = (spec, list, name, extra = {}) => { if (!list.length) { box.innerHTML = '<p class="muted pad">Tidak ada data.</p>'; return; }
        const cols = spec.map(([label, get]) => { const v = list.map(get).find((x) => x != null && x !== ''), f = extra.cls && extra.cls[label];
          return { label, get, type: v instanceof Date ? 'date' : typeof v === 'number' ? 'num' : 'text', w: /Deskripsi|Vendor|Keterangan|Teks|Penerima|Lokasi/.test(label) ? 2 : 1, cls: f ? (r) => f(get(r), r) : undefined }; });
        T.table(box, { cols, rows: list, name: mat + '_' + name, pageSize: extra.pageSize || 10, onRow: extra.onRow }); };
      const t = F.tab;
      if (t === 'stok') tbl([['Plant', (i) => i.plant], ['Zona', (i) => zonaOf(i.plant)], ['Unrestricted', (i) => nrm(i)], ['Val. type lain', (i) => i.soh - nrm(i) || null], ['In transit', (i) => i.transit || null], ['Nilai', (i) => i.value], ['Mata uang', (i) => stockCur(i.plant)],
        ['Lokasi', (i) => uniq(i.locs.map((l) => l.sloc)).join(', ')]], its, 'Stok');
      else if (t === 'mrp') {
        const posCls = (v, r) => 'mx-' + (MP.pos(r.stock, r) || 'none');
        tbl([['Plant', (r) => r.plant], ['Aging', (r) => r.aging || ''], ['AMU', (r) => fin(r.amu)], ['LT (bln)', (r) => fin(r.lt)], ['SS', (r) => fin(r.ss)], ['Min', (r) => fin(r.min2)], ['Max', (r) => fin(r.max2)], ['Stok', (r) => r.stock], ['OS PO/RO', (r) => r.ospo], ['Reservasi', (r) => r.mb25], ['To Order', (r) => r.toOrder]],
          mrs, 'MRP', { cls: { SS: () => 'ref', Min: () => 'ref', Max: () => 'ref', Stok: posCls, 'To Order': () => 'b' }, onRow: (r) => { F.calc = F.calc === r.plant ? '' : r.plant; render(); } });
        const cr = mrs.find((r) => r.plant === F.calc);
        box.insertAdjacentHTML('beforeend', cr ? `<div class="calc" id="mrpCalc">${explainMRP(cr)}</div>` : mrs.length ? '<p class="muted small pad">Klik satu baris untuk melihat cara hitungnya.</p>' : '');
        if (cr && opt.calc) setTimeout(() => { const c = box.querySelector('#mrpCalc'); if (c) c.scrollIntoView({ block: 'nearest' }); }, 60);
      } else if (t === 'po') tbl([['Plant', (l) => l.plant], ['Dokumen', (l) => l.doc + '/' + l.item], ['Jenis', (l) => l.type], ['Vendor', (l) => l.vendor], ['Tgl kirim', (l) => D(l.delivery)], ['Qty', (l) => l.qty], ['Sisa kirim', (l) => l.openQty], ['Terlambat (hari)', (l) => l.lateDays || null], ['Kontrak (OA)', (l) => l.oa], ['PR', (l) => l.pr]], pos, 'PO_RO');
      else if (t === 'rsv') tbl([['Plant', (l) => l.plant], ['Reservasi', (l) => l.resv + '/' + l.item], ['Tgl butuh', (l) => D(l.reqDate)], ['Qty butuh', (l) => l.reqQty], ['Sudah diambil', (l) => l.removed], ['Sisa', (l) => l.diff], ['Penerima', (l) => l.recipient || l.costCenter || l.wbs || ''], ['Mvt', (l) => l.mt]], rss, 'Reservasi');
      else if (t === 'kon') tbl([['Kontrak', (i) => i.doc], ['Vendor', (i) => i.k.vendor], ['Berakhir', (i) => D(i.k.end)], ['Sisa hari', (i) => i.k.sisaHari], ['Status', (i) => (i.k.aktif ? 'Aktif' : 'Habis masa')], ['Harga', (i) => i.price], ['Mata uang', (i) => i.k.currency], ['Target qty', (i) => i.targetQty], ['Sisa qty', (i) => i.openQty]], kts, 'Kontrak');
      else if (t === 'trx') tbl([['Tanggal', (x) => D(x.date)], ['Plant', (x) => x.plant], ['Mvt', (x) => x.mt], ['Keterangan Mvt', (x) => x.mtText], ['Kategori', (x) => x.cat], ['Qty', (x) => x.qty], ['Nilai', (x) => x.amount], ['PO/Resv', (x) => x.po || x.resv], ['Teks', (x) => x.header], ['User', (x) => x.user]],
        mv.slice().sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 3000), 'Transaksi', { pageSize: 15 });
      else {
        const mi = window.matIndex(), L = mi.labels || {}, useWK = {};
        mrs.forEach((r) => { const lab = L[r.wk] || []; if (!lab.length) return; const u = useWK[r.wk] || (useWK[r.wk] = new Array(lab.length).fill(0)); (r.usageAll || []).forEach((v, k) => (u[k] += Math.abs(v || 0))); });
        const isGI = (x) => Number(x.qty) < 0 && (x.cat === 'Own Use' || OUT_MT.has(String(x.mt))), yr = new Map();
        mv.filter((x) => x.date).forEach((x) => { const g = yr.get(x.date.getFullYear()) || yr.set(x.date.getFullYear(), { y: x.date.getFullYear(), in: 0, out: 0, gi: 0 }).get(x.date.getFullYear()); if (x.qty > 0) g.in += x.qty; else g.out -= x.qty; if (isGI(x)) g.gi -= x.qty; });
        box.innerHTML = Object.keys(useWK).map((w) => `<section class="d-sec"><h3>Pemakaian bulanan WK ${w} <small>24 bulan terakhir</small></h3><div class="dUse" data-w="${w}"></div></section>`).join('') + '<div id="mdYr"></div>' + (Object.keys(useWK).length || yr.size ? '' : '<p class="muted pad">Tidak ada data pemakaian.</p>');
        box.querySelectorAll('.dUse').forEach((el) => { const w = el.dataset.w, lab = L[w], n = Math.min(24, lab.length); UI.columns(el, lab.slice(-n).map((l) => { const [y, m] = l.split('-'); return MON[+m - 1] + ' 20' + y; }), useWK[w].slice(-n), (v) => fmt(v, 1) + ' ' + uom); });
        const ys = [...yr.values()].sort((a, b) => b.y - a.y); if (ys.length) T.table(box.querySelector('#mdYr'), { rows: ys, pageSize: 10, cols: [{ label: 'Tahun', get: (g) => String(g.y) }, { label: 'Masuk', type: 'num', get: (g) => g.in }, { label: 'Keluar', type: 'num', get: (g) => g.out }, { label: 'Pemakaian GI', type: 'num', get: (g) => g.gi }] });
      }
    };
    render();
  };

  // ---------- Material Control: Overview (satu baris per material) | Detail (satu baris per material x plant MRP) ----------
  // Satu kosakata status untuk seluruh web: posisi stok terhadap SS / Min / Max (sama dengan warna sel Stok).
  const POS = { low: ['Di bawah SS', 'low'], min: ['Di bawah Min', 'warn'], ok: ['Normal', 'ok'], max: ['Di atas Max', 'info'], '': ['Tanpa MRP', 'mute'] };
  const RANK = { low: 0, min: 1, max: 2, ok: 3, '': 4 };
  MP.POS = POS;
  MP.pos = (stock, r) => (r ? mrpPos(stock || 0, r) : '');
  MP.posPill = (k) => T.pill(POS[k || ''][0], POS[k || ''][1]);
  MP.worst = (ks) => ks.slice().sort((a, b) => RANK[a] - RANK[b])[0] || '';
  PAGES.control = function () {
    if (!S.mb52 && !S.mrpRes) { $('view').innerHTML = needFile('MB52 atau MRP', 'Material Control membaca stok (MB52) dan hasil MRP.'); return; }
    const mode = ['dt', 'oa'].includes(S.ovMode) ? S.ovMode : 'ov'; MP.zonaHook = () => PAGES.control();
    const F = (S.fc = S.fc || { q: '', plant: new Set(), pos: new Set() }), mi = matIndex().map, plants = [...S.mrpPlants].filter((p) => G.zonaOk(p)).sort();
    const oaDocs = S.me3n ? [...S.me3n.docs.values()].filter((d) => KX.kSt(d) !== 'habis') : [], oaItems = new Map();
    if (S.me3n) S.me3n.items.forEach((i) => (oaItems.get(i.doc) || oaItems.set(i.doc, []).get(i.doc)).push(i));
    const mats = mode === 'oa' ? oaDocs.flatMap((d) => (oaItems.get(d.doc) || []).map((i) => [i.material, i.desc])) : [...mi.values()].map((o) => [o.material, o.desc]);
    $('view').innerHTML = '<div class="seg-bar"><span id="ovSeg"></span></div><div id="fb"></div><div id="kp"></div><div id="tb"></div>';
    UI.seg($('ovSeg'), [['ov', 'Overview'], ['dt', 'Detail'], ['oa', 'Per OA']], mode, (v) => { S.ovMode = v; PAGES.control(); });
    const draw = () => {
      const H = plants.filter((p) => T.has(F, 'plant', p));
      let rows0, cols, name;
      if (mode === 'ov') {
        const has = (o, p) => o.stock.has(p) || o.mrp.has(p);
        rows0 = [...mi.values()].filter((o) => H.some((p) => has(o, p)) && T.matOk(F, o.material, o.desc) && T.match(o.material + ' ' + o.desc, F.q))
          .map((o) => ({ o, k: MP.worst(H.filter((p) => has(o, p)).map((p) => MP.pos(o.stock.get(p), o.mrp.get(p)))) }));
        name = 'Material_Control_Overview';
        cols = [{ label: 'Material', w: 3.4, get: (x) => x.o.desc, html: (x) => T.two(x.o.desc || x.o.material, x.o.material + ' · ' + (x.o.uom || '')) },
          ...H.map((p) => ({ label: p, type: 'num', w: 0.8, get: (x) => (has(x.o, p) ? x.o.stock.get(p) || 0 : null), cls: (x) => (has(x.o, p) ? 'mx-' + (MP.pos(x.o.stock.get(p), x.o.mrp.get(p)) || 'none') : '') })),
          { label: 'To Order', type: 'num', w: 0.8, get: (x) => H.reduce((a, p) => a + ((x.o.mrp.get(p) || {}).toOrder || 0), 0) || null, cls: () => 'b' },
          { label: 'Status', type: 'status', w: 1.2, get: (x) => POS[x.k][0], html: (x) => MP.posPill(x.k) }];
      } else if (mode === 'dt') {
        rows0 = (S.mrpRes ? [...S.mrpRes.values()] : []).filter((r) => H.includes(r.plant) && T.matOk(F, r.material, r.desc) && T.match(r.material + ' ' + (r.kimap || '') + ' ' + r.desc, F.q)).map((r) => ({ r, k: MP.pos(r.stock, r) }));
        name = 'Material_Control_Detail';
        cols = [{ label: 'Plant', w: 0.7, get: (x) => x.r.plant }, { label: 'Material', w: 3, get: (x) => x.r.desc, html: (x) => T.two(x.r.desc, x.r.material + ' · ' + (x.r.uom || '')) },
          { label: 'Aging', type: 'status', w: 0.7, get: (x) => x.r.aging, html: (x) => agingPill(x.r.aging) },
          { label: 'SS', type: 'num', w: 0.7, get: (x) => fin(x.r.ss), cls: () => 'ref' }, { label: 'Min', type: 'num', w: 0.7, get: (x) => fin(x.r.min2), cls: () => 'ref' }, { label: 'Max', type: 'num', w: 0.7, get: (x) => fin(x.r.max2), cls: () => 'ref' },
          { label: 'Stok', type: 'num', w: 0.8, get: (x) => x.r.stock, cls: (x) => 'mx-' + (x.k || 'none') }, { label: 'OS PO/RO', type: 'num', w: 0.8, get: (x) => x.r.ospo }, { label: 'Reservasi', type: 'num', w: 0.8, get: (x) => x.r.mb25 },
          { label: 'To Order', type: 'num', w: 0.8, get: (x) => x.r.toOrder || null, cls: () => 'b' }, { label: 'Status', type: 'status', w: 1.2, get: (x) => POS[x.k][0], html: (x) => MP.posPill(x.k) }];
      } else {
        // Per OA: setiap item kontrak aktif dengan posisi stoknya, untuk analisis, call RO, dan keputusan. Angka = jumlah plant terpilih (hanya fakta, tanpa rekomendasi otomatis).
        rows0 = [];
        oaDocs.forEach((d) => { if (!T.has(F, 'oa', d.doc)) return; (oaItems.get(d.doc) || []).forEach((i) => {
          const o = mi.get(i.material), rs = o ? H.map((p) => o.mrp.get(p)).filter(Boolean) : [], stock = o ? H.reduce((a, p) => a + (o.stock.get(p) || 0), 0) : 0;
          const sum = (f) => rs.reduce((a, r) => a + (f(r) || 0), 0), ss = sum((r) => r.ss), mn = sum((r) => r.min2), mx = sum((r) => r.max2);
          if (!T.matOk(F, i.material, i.desc) || !T.match([d.doc, d.vendor, i.material, i.desc].join(' '), F.q)) return;
          rows0.push({ d, i, stock, ss, mn, mx, to: sum((r) => r.toOrder), os: sum((r) => r.ospo), k: rs.length ? MP.pos(stock, { min2: mn, max2: mx, ss }) : '' }); }); });
        name = 'Material_Control_Per_OA';
        cols = [{ label: 'OA', w: 2, get: (x) => x.d.doc, html: (x) => T.two(x.d.doc, x.d.vendor || '') }, { label: 'Material', w: 3, get: (x) => x.i.desc, html: (x) => T.two(x.i.desc || x.i.material, x.i.material + ' · ' + (x.i.uom || '')) },
          { label: 'Stok', type: 'num', w: 0.7, get: (x) => x.stock, cls: (x) => 'mx-' + (x.k || 'none') }, { label: 'Min – Max', type: 'num', w: 0.9, get: (x) => (x.k ? x.mn : null), html: (x) => (x.k ? fmt(x.mn) + ' – ' + fmt(x.mx) : ''), cls: () => 'ref' },
          { label: 'To Order', type: 'num', w: 0.8, get: (x) => x.to || null, cls: () => 'b' }, { label: 'OS PO/RO', type: 'num', w: 0.8, get: (x) => x.os || null },
          { label: 'Sisa kontrak', type: 'num', w: 0.9, get: (x) => x.i.openQty, cls: (x) => (x.to > 0 && x.i.openQty < x.to ? 'neg' : '') }, { label: 'Sisa hari', type: 'num', w: 0.7, get: (x) => x.d.sisaHari, cls: (x) => (x.d.sisaHari != null && x.d.sisaHari <= 90 ? 'neg' : '') },
          { label: 'Status', type: 'status', w: 1.1, get: (x) => POS[x.k][0], html: (x) => MP.posPill(x.k) }];
      }
      const n = (k) => rows0.filter((x) => x.k === k).length;
      $('kp').innerHTML = T.kpis([['Di bawah SS', fmt(n('low'), 0), 'perlu tindakan', 'k-low', 'low'], ['Di bawah Min', fmt(n('min'), 0), 'saatnya pesan', 'k-min', 'min'], ['Normal', fmt(n('ok'), 0), 'Min sampai Max', 'k-ok', 'ok'], ['Di atas Max', fmt(n('max'), 0), 'stok berlebih', 'k-max', 'max']]);
      T.bindKpis($('kp'), F, 'pos', draw);
      const rows = rows0.filter((x) => T.has(F, 'pos', x.k)).sort((a, b) => RANK[a.k] - RANK[b.k] || (b.to || 0) - (a.to || 0));
      T.table($('tb'), { cols, rows, name, empty: mode === 'oa' && !S.me3n ? 'Butuh file kontrak ME3N.' : 'Tidak ada material pada filter ini.',
        onRow: (x) => (mode === 'oa' ? MP.detail(x.i.material) : x.o ? MP.detail(x.o.material, F.plant.size === 1 ? [...F.plant][0] : null) : MP.detail(x.r.material, x.r.plant)) });
    };
    T.filters($('fb'), { q: mode === 'oa' ? 'Cari nomor OA, vendor, atau nama barang. Contoh: laker, 4600001' : 'Cari nama atau kode material. Contoh: laker, flange 3', materials: mats, plants,
      selects: [].concat(mode === 'oa' ? [{ key: 'oa', label: 'OA', options: oaDocs.map((d) => [d.doc, d.doc + ' ' + (d.vendor || '')]) }] : [], [{ key: 'pos', label: 'Status', options: ['low', 'min', 'ok', 'max'].map((k) => [k, POS[k][0]]) }]) }, F, draw);
    draw();
  };
})();
