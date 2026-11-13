// ============ Tampilan Matriks (Cari Material), Kartu (Kontrak), dan panel Analisis Material ============
(function () {
  const STATUS_RANK = { 'Perlu order': -1, Kosong: 0, 'Di bawah Min': 1, Surplus: 2, Aman: 3, 'Tanpa Min/Max': 4, 'Tanpa MRP': 5, 'Tidak dipantau': 6 };
  const AGING_RANK = { FS: 0, MD: 1, SP: 2, DS: 3 };
  const homePlants = () => [...S.mrpPlants].sort();

  // ---------- Indeks per material (gabungan MB52 + MRP + kontrak) ----------
  function matIndex() {
    if (S._mi && S._mi.ver === S.ver) return S._mi;
    const map = new Map();
    const g = (m) => map.get(m) || map.set(m, { material: m, desc: '', uom: '', items: [], stock: new Map(), valueIDR: 0, price: null, priceCur: '', wk: new Set(), mrp: new Map(), use: null, contract: null }).get(m);
    if (S.mb52) S.mb52.items.forEach((i) => {
      const o = g(i.material); o.desc = o.desc || i.desc; o.uom = o.uom || i.uom; o.items.push(i); o.wk.add(i.wk);
      o.stock.set(i.plant, (o.stock.get(i.plant) || 0) + (i.sohNormal != null ? i.sohNormal : i.soh)); // ZNORMAL o.valueIDR += toIDRv(i.value, stockCur(i.plant));
      if (i.soh > 0 && o.price == null) { o.price = i.price; o.priceCur = stockCur(i.plant); }
    });
    if (S.mrpRes) for (const r of S.mrpRes.values()) { const o = g(r.material); o.desc = o.desc || r.desc; o.uom = o.uom || r.uom; o.mrp.set(r.plant, r); if (r.contract && !o.contract) o.contract = r.contract; }
    // pemakaian bulanan per WK (PEP dari file MRP, PHE dari MB51)
    const labels = { PEP: S.mrpWB ? S.mrpWB.monthLabels : [], PHE: S.mrpWB_PHE ? S.mrpWB_PHE.monthLabels : [] };
    [[S.mrpWB, 'PEP'], [S.mrpWB_PHE, 'PHE']].forEach(([wb, wk]) => wb && wb.rows.forEach((r) => { const o = map.get(r.material); if (!o) return; o.useWK = o.useWK || {};
      const u = o.useWK[wk] || (o.useWK[wk] = new Array(labels[wk].length).fill(0)); r.usageAll.forEach((v, k) => (u[k] += Math.abs(v || 0))); }));
    if (S.me3n) map.forEach((o, m) => { if (!o.contract && S.me3n.pick.has(m)) o.contract = S.me3n.pick.get(m); });
    map.forEach((o) => {
      let best = 9, ag = 9;
      homePlants().forEach((p) => {
        const r = o.mrp.get(p), q = o.stock.get(p) || 0;
        if (r) { const st = Parser.status({ plant: p, soh: q }, { min: r.min2 || 0, max: r.max2 || 0 }, S.mrpPlants).s; best = Math.min(best, STATUS_RANK[st] ?? 9); ag = Math.min(ag, AGING_RANK[r.aging] ?? 9); }
        else if (q > 0) best = Math.min(best, STATUS_RANK['Tanpa MRP']);
      });
      o.status = statusFor(o, homePlants());
      o.aging = Object.keys(AGING_RANK).find((k) => AGING_RANK[k] === ag) || '';
      o.toOrder = [...o.mrp.values()].filter((r) => S.mrpPlants.has(r.plant)).reduce((a, r) => a + (r.toOrder || 0), 0);
      o.use12 = o.useWK ? Object.values(o.useWK).reduce((a, u) => a + u.slice(-12).reduce((x, y) => x + y, 0), 0) : null;
      o.kel = Master.kelompok(o.desc); o.mg = Master.mgOf(o.material);
      o.total = [...o.stock.values()].reduce((a, b) => a + b, 0);
    });
    S._mi = { ver: S.ver, map, labels };
    return S._mi;
  }
  const statusCls = (s) => (s === 'Perlu order' || s === 'Kosong' || s === 'Di bawah Min' ? 'low' : s === 'Surplus' ? 'warn' : s === 'Aman' ? 'ok' : 'mute');
  const qtyPill = (q, r) => (q == null ? '<span class="qty na">–</span>' : `<span class="qty ${q <= 0 ? 'zero' : r && r.min2 && q < r.min2 ? 'low' : 'pos'}">${fmt(q)}</span>`);

  // ---------- Cari Material ----------
  // Satu baris per material. Kolom plant dikelompokkan per WK (client 100 = PEP, 180 = PHE).
  const plantWK = (p) => wkOfPlant(p) || 'PEP';
  // status satu material untuk plant yang tampil: Perlu order (ada To Order) → Kosong/Di bawah Min (sudah tertutup PO) → Surplus → Aman
  function statusFor(o, H) {
    if (H.some((p) => (o.mrp.get(p) || {}).toOrder > 0)) return 'Perlu order';
    let best = 9;
    H.forEach((p) => {
      const r = o.mrp.get(p), q = o.stock.get(p) || 0;
      if (r) best = Math.min(best, STATUS_RANK[Parser.status({ plant: p, soh: q }, { min: r.min2 || 0, max: r.max2 || 0 }, S.mrpPlants).s] ?? 9);
      else if (q > 0) best = Math.min(best, STATUS_RANK['Tanpa MRP']);
    });
    return Object.keys(STATUS_RANK).find((k) => STATUS_RANK[k] === best) || 'Tidak dipantau';
  }
  const qtyCell = (q, r) => (q == null ? '' : `<span class="${q <= 0 ? 'q-zero' : r && r.min2 && q < r.min2 ? 'q-low' : 'q-pos'}">${fmt(q)}</span>`);
  const tableCari = PAGES.cari;
  PAGES.cari = function () {
    if (!S.mb52 && !S.mrpRes) { $('view').innerHTML = needFile('file MB52', 'Cari Material membaca stok dari MB52 (WK PEP dan PHE). Min/Max diambil dari mesin MRP.'); return; }
    const wks = WK_ORDER.filter((w) => homePlants().some((p) => plantWK(p) === w));
    if (S.cariWK !== 'all' && !wks.includes(S.cariWK)) S.cariWK = 'all';
    $('pageActions').innerHTML = `${wks.length > 1 ? '<span id="wkSeg"></span>' : ''}<span id="vSeg"></span>`;
    if (wks.length > 1) UI.seg($('wkSeg'), [['all', 'Semua WK']].concat(wks.map((w) => [w, `WK ${w}`])), S.cariWK, (v) => { S.cariWK = v; store.set('cariWK', v); route(); });
    UI.seg($('vSeg'), [['matriks', 'Matriks'], ['tabel', 'Tabel']], S.cariView, (v) => { S.cariView = v; store.set('cariView', v); route(); });
    if (S.cariView === 'tabel') return tableCari();
    const { map } = matIndex();
    const showWK = S.cariWK === 'all' ? wks : [S.cariWK];
    const H = homePlants().filter((p) => showWK.includes(plantWK(p))).sort((a, b) => WK_ORDER.indexOf(plantWK(a)) - WK_ORDER.indexOf(plantWK(b)) || a.localeCompare(b));
    const rows = [...map.values()].filter((o) => H.some((p) => o.stock.get(p) > 0 || o.mrp.has(p)) || (S.cariWK === 'all' && o.total > 0));
    const st = new Map(rows.map((o) => [o, statusFor(o, H)]));
    const ordOf = (o) => H.reduce((a, p) => a + ((o.mrp.get(p) || {}).toOrder || 0), 0);
    const priceOf = (o) => (o.contract ? [o.contract.price, o.contract.currency] : o.price != null ? [o.price, o.priceCur] : null);
    const cols = [
      { label: 'Material', wide: true, w: 3.8, filter: false, get: (o) => o.desc,
        html: (o) => `<div class="m-desc">${esc(o.desc)}</div><div class="m-code"><span>${esc(o.material)}</span><span>${esc(o.uom)}</span>${o.aging ? `<span>${esc(o.aging)}</span>` : ''}</div>` },
      { label: 'Kelompok', get: (o) => (o.mg ? o.mg.mgName : o.kel), hide: true },
      { label: 'Aging', get: (o) => o.aging, hide: true },
      { label: 'Harga', num: true, filter: false, get: (o) => { const p = priceOf(o); return p ? toIDRv(p[0], p[1]) : null; }, html: (o) => { const p = priceOf(o); return p ? money(p[0], p[1]) : ''; } },
      { label: 'Kontrak', nowrap: true, w: 1.25, get: (o) => (o.contract ? 'Ada kontrak' : 'Tanpa kontrak'),
        html: (o) => (o.contract ? `<a href="#" class="oalink" data-oa="${esc(o.contract.doc)}">${esc(o.contract.doc)}</a><span class="k-s">${o.contract.sisaHari != null ? fmt(o.contract.sisaHari, 0) + ' hari lagi' : ''}</span>` : '<span class="muted">–</span>') },
      ...H.map((p) => ({ label: p, title: plantLabel(p), group: `WK ${plantWK(p)} (${plantWK(p) === 'PHE' ? '180' : '100'})`, num: true, filter: false,
        get: (o) => (o.stock.has(p) || o.mrp.has(p) ? o.stock.get(p) || 0 : null), html: (o) => qtyCell(o.stock.has(p) || o.mrp.has(p) ? o.stock.get(p) || 0 : null, o.mrp.get(p)) })),
      { label: 'Plant lain', num: true, filter: false, hide: S.cariWK === 'all', get: (o) => { const v = [...o.stock].filter(([p]) => !H.includes(p)).reduce((a, [, q]) => a + q, 0); return v || null; },
        html: (o) => { const ot = [...o.stock].filter(([p, q]) => !H.includes(p) && q > 0); return ot.length ? `<span title="${esc(ot.map(([p, q]) => `${plantLabel(p)}: ${fmt(q)}`).join('\n'))}">${fmt(ot.reduce((a, [, q]) => a + q, 0))}</span><span class="k-s">${ot.length} plant</span>` : ''; } },
      { label: 'Pakai', sub: '12 bulan', num: true, filter: false, w: 1.05, get: (o) => o.use12, html: (o) => (o.use12 == null ? '' : fmt(o.use12, 0)) },
      { label: 'Order', sub: 'MRP', num: true, filter: false, w: 0.95, get: (o) => ordOf(o) || null, html: (o) => (ordOf(o) ? `<b>${fmt(ordOf(o))}</b>` : '') },
      { label: 'Status', nowrap: true, w: 1.35, get: (o) => st.get(o), html: (o) => `<span class="st ${statusCls(st.get(o))}">${esc(st.get(o))}</span>` },
      { label: 'WK', get: (o) => [...o.wk].join(', '), hide: true },
    ];
    $('view').innerHTML = `<p class="legend-line"><span>Angka = stok per plant (MB52)</span><span class="q-low">Merah = di bawah Min</span><span>Klik baris untuk analisis material</span></p><div id="mx"></div>`;
    UI.table($('mx'), { id: 'cari-mx3-' + S.cariWK, rows, cols, name: 'Cari Material', match: (o, q) => hit(o.material + ' ' + o.desc, expand(q)), sort: { i: cols.findIndex((c) => c.label === 'Pakai'), dir: -1 },
      placeholder: 'Cari deskripsi atau kode material… (mis. packer 7, laker)', rowKey: (o) => o.material, onRow: openMaterial });
  };

  // ---------- Analisis Material (panel) ----------
  // ---------- Panel analisis material: MB52, ME2N, MRP, MB51 dengan filter zona / plant / periode ----------
  // opt.calc = plant yang langsung dibuka penjelasan hitungan MRP-nya
  const PERIODS = [[3, '3 bulan'], [6, '6 bulan'], [12, '12 bulan'], [24, '24 bulan'], [0, 'Semua data']];
  function openMaterial(m, opt = {}) {
    const mi = matIndex(), o = mi.map.get(m);
    if (!o) { UI.drawer(`<div class="d-head"><h2>${esc(m)}</h2></div><div class="d-sec">Material tidak ada di MB52 maupun file MRP yang dimuat.</div>`); return; }
    const F = (S.matF = Object.assign({ zona: '', plant: '', months: 12 }, S.matF || {}));
    if (opt.calc) { F.plant = opt.calc; F.zona = ''; }
    let calcPlant = opt.calc || '';
    const uom = o.uom || '';
    // semua plant yang punya data untuk material ini
    const allPlants = [...new Set([...o.items.map((i) => i.plant), ...o.mrp.keys(),
      ...(S.me2n ? S.me2n.lines.filter((l) => l.material === m).map((l) => l.plant) : []),
      ...(S.mb51 ? S.mb51.moves.filter((x) => x.material === m).map((x) => x.plant) : [])])].filter(Boolean).sort();
    const body = UI.drawer('', { label: 'Analisis material', wide: true });
    const render = () => {
      if (F.plant && !allPlants.includes(F.plant)) F.plant = '';
      if (F.plant && F.zona && zonaOf(F.plant) !== F.zona) F.plant = '';
      const okP = (p) => (!F.zona || zonaOf(p) === F.zona) && (!F.plant || p === F.plant);
      const since = F.months ? new Date(new Date().getFullYear(), new Date().getMonth() - F.months + 1, 1) : null;
      const okD = (d) => !since || (d && d >= since);
      const zonas = [...new Set(allPlants.map(zonaOf))].sort();
      const items = o.items.filter((i) => okP(i.plant)).sort((a, b) => b.soh - a.soh);
      const mrpRows = [...o.mrp.values()].filter((r) => okP(r.plant)).sort((a, b) => a.plant.localeCompare(b.plant));
      const nrm = (i) => (i.sohNormal != null ? i.sohNormal : i.soh);
      const stockN = items.reduce((a, i) => a + nrm(i), 0), stockO = items.reduce((a, i) => a + (i.soh - nrm(i)), 0), stockT = items.reduce((a, i) => a + (i.transit || 0), 0);
      const valIDR = items.reduce((a, i) => a + toIDRv(i.value, stockCur(i.plant)), 0);
      const amu = mrpRows.filter((r) => S.mrpPlants.has(r.plant)).reduce((a, r) => a + (r.amu || 0), 0);
      const toOrder = mrpRows.filter((r) => S.mrpPlants.has(r.plant)).reduce((a, r) => a + (r.toOrder || 0), 0);
      const cover = amu > 0 ? stockN / amu : null;
      const kItems = S.me3n ? S.me3n.items.filter((i) => i.material === m) : [];
      const po = S.me2n ? S.me2n.lines.filter((l) => l.material === m && !l.deleted && okP(l.plant) && (l.openQty > 0 || okD(l.docDate))).sort((a, b) => (b.docDate || 0) - (a.docDate || 0)) : [];
      const resv = S.mb25 ? S.mb25.lines.filter((l) => l.material === m && !l.finalIssue && l.diff > 0 && okP(l.plant)) : [];
      const mv = S.mb51 ? S.mb51.moves.filter((x) => x.material === m && okP(x.plant) && okD(x.date)).sort((a, b) => (b.date || 0) - (a.date || 0)) : [];
      const lp = S.me2n && S.me2n.lastPrice.get(m);
      const mvtMap = new Map(); mv.forEach((x) => { const c = x.cat || 'Tanpa kategori'; const g = mvtMap.get(c) || mvtMap.set(c, { cat: c, qty: 0, n: 0, p: new Set() }).get(c); g.qty += x.qty; g.n++; g.p.add(x.plant); });
      const mvtSum = [...mvtMap.values()].map((g) => ({ cat: g.cat, qty: g.qty, n: g.n, plants: [...g.p].sort().join(', ') })).sort((a, b) => b.n - a.n);
      // pemakaian bulanan per WK dari baris MRP plant terpilih
      const useWK = {};
      mrpRows.forEach((r) => { const L = mi.labels[r.wk] || []; if (!L.length) return; const u = useWK[r.wk] || (useWK[r.wk] = new Array(L.length).fill(0)); (r.usageAll || []).forEach((v, k) => (u[k] += Math.abs(v || 0))); });
      // rekomendasi (plant terpilih)
      const reco = [];
      mrpRows.filter((r) => S.mrpPlants.has(r.plant) && r.toOrder > 0).forEach((r) => {
        const sameWK = (p) => wkOfPlant(p) === wkOfPlant(r.plant);
        const otherWK = [...o.stock].filter(([p, q]) => !sameWK(p) && q > 0);
        const donors = [...o.stock].filter(([p, q]) => p !== r.plant && q > 0 && sameWK(p)).map(([p, q]) => { const rr = o.mrp.get(p); const spare = rr && S.mrpPlants.has(p) && rr.max2 != null ? Math.max(0, q - Math.max(rr.max2, rr.min2 || 0)) : q; return { p, spare, mrp: !!rr }; }).filter((d) => d.spare > 0);
        let t = `<b>${esc(plantLabel(r.plant))}</b> perlu ${fmt(r.toOrder)} ${esc(uom)} (stok ${fmt(r.stock)}, PO berjalan ${fmt(r.ospo)}, Min ${fmt(r.min2)}).`;
        if (donors.length) t += ` Cek dulu stok di ${donors.map((d) => `${esc(plantLabel(d.p))} (${fmt(d.spare)}${d.mrp ? ' di atas Max' : ''})`).join(', ')} untuk transfer.`;
        if (otherWK.length) t += ` Ada juga stok di WK lain (${otherWK.map(([p, q]) => `${esc(p)} ${fmt(q)}`).join(', ')}), tapi beda company code, jadi harus lewat MTA.`;
        t += r.contract ? ` Kalau tidak bisa ditransfer, terbitkan RO lewat OA ${esc(r.contract.doc)} (${esc(r.contract.vendor)}, ${money(r.contract.price, r.contract.currency)}/unit).` : ` Belum ada kontrak aktif, jadi buat PR + OE${lp ? ` (harga PO terakhir ${money(lp.price, lp.currency)})` : ''}.`;
        reco.push([donors.length ? 'warn' : 'bad', t]);
        if (r.contract && r.contract.sisaHari != null && r.contract.sisaHari <= 90) reco.push(['warn', `Kontrak OA ${esc(r.contract.doc)} habis dalam ${fmt(r.contract.sisaHari, 0)} hari. Siapkan perpanjangan atau amandemen.`]);
      });
      mrpRows.filter((r) => r.berlebih && r.stock > 0).forEach((r) => reco.push(['warn', `<b>${esc(plantLabel(r.plant))}</b> berlebih: stok ${fmt(r.stock)} ${esc(uom)} setara ${fmt(r.cover, 1)} bulan pemakaian. Tawarkan ke plant yang membutuhkan, jangan dipesan dulu.`]));
      mrpRows.filter((r) => r.aging === 'DS' && r.stock > 0 && !r.histShort).forEach((r) => reco.push(['bad', `<b>${esc(plantLabel(r.plant))}</b>: tidak ada pemakaian lebih dari 5 tahun. Kandidat dead stock, cek prospek pemakaian dan peralatan induknya.`]));
      if (stockO > 0) reco.push(['', `Ada ${fmt(stockO)} ${esc(uom)} dengan valuation type selain ZNORMAL (ex-terminasi, surplus, atau damage). Stok ini tidak dihitung di MRP; cek apakah bisa dipakai sebelum memesan.`]);
      if (!o.mrp.size) reco.push(['', 'Material ini tidak ada di file MRP, jadi Min/Max belum dihitung. Kalau rutin dipakai, ajukan jadi stock item.']);
      if (!reco.length) reco.push(['ok', 'Tidak ada tindakan: stok di plant yang dipantau MRP masih di antara Min dan Max.']);
      const sel = (id, list, v, lbl) => `<label class="chk">${lbl} <select id="${id}" aria-label="${lbl}">${list.map(([k, t]) => `<option value="${esc(k)}"${String(v) === String(k) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
      const vt = (i) => Object.entries(i.byVal || {}).map(([k, q]) => `${k} ${fmt(q)}`).join(', ');
      const calcR = calcPlant ? o.mrp.get(calcPlant) : null;
      body.innerHTML = `
      <div class="d-head"><h2>${esc(o.desc || m)}</h2><div class="meta"><span>${esc(m)}</span><span>${esc(uom)}</span>${o.mg ? `<span>MG ${esc(o.mg.mg)} ${esc(o.mg.mgName)}</span>` : `<span>${esc(o.kel)}</span>`}${o.wk.size ? `<span>WK ${esc([...o.wk].join(', '))}</span>` : ''}${o.aging ? agingPill(o.aging) : ''}${pill(o.status, statusCls(o.status))}</div></div>
      <div class="filters">${sel('mfZ', [['', 'Semua zona'], ...zonas.map((z) => [z, z])], F.zona, 'Zona')}${sel('mfP', [['', 'Semua plant'], ...allPlants.filter((p) => !F.zona || zonaOf(p) === F.zona).map((p) => [p, plantLabel(p)])], F.plant, 'Plant')}${sel('mfM', PERIODS, F.months, 'Periode')}</div>
      <p class="muted small">Periode berlaku untuk ME2N (tanggal dokumen; PO/RO yang masih berjalan selalu tampil) dan MB51 (tanggal posting). MB52 dan MRP adalah kondisi terakhir.</p>
      <div class="kv"><div><span>Stok ZNORMAL</span><b>${fmt(stockN)}</b></div><div><span>Val. type lain</span><b>${fmt(stockO)}</b></div><div><span>In transit</span><b>${fmt(stockT)}</b></div><div><span>Nilai stok</span><b>${money(valIDR, 'IDR')}</b></div>
        <div><span>AMU (plant MRP)</span><b>${fmt(amu, 1)}</b></div><div><span>Cakupan stok</span><b>${cover == null ? '–' : fmt(cover, 1) + ' bln'}</b></div><div><span>Perlu order</span><b>${fmt(toOrder)}</b></div></div>
      <section class="d-sec"><h3>Rekomendasi</h3><ul class="reco">${reco.map(([c, t]) => `<li class="${c}"><span>${brief(t)}</span></li>`).join('')}</ul></section>
      <section class="d-sec"><h3>Stok per plant <small>MB52</small></h3>${items.length ? plainTable(items, [['Plant', (i) => esc(plantLabel(i.plant))], ['Zona', (i) => esc(zonaOf(i.plant))], ['Val. type', (i) => esc(vt(i))],
        ['Unrestricted', (i) => fmt(nrm(i)) + ' ' + esc(i.uom), 'num'], ['Val. type lain', (i) => (i.soh - nrm(i) ? fmt(i.soh - nrm(i)) : ''), 'num'], ['In transit', (i) => (i.transit ? fmt(i.transit) : ''), 'num'], ['Lokasi', (i) => esc(i.locs.map((l) => l.sloc).filter((x, k, a) => a.indexOf(x) === k).join(', '))], ['Nilai', (i) => money(i.value, stockCur(i.plant)), 'num']]) : '<p class="muted">Tidak ada stok di plant terpilih.</p>'}</section>
      ${mrpRows.length ? `<section class="d-sec"><h3>MRP <small>metode ${esc(S.set.method === 'tko' ? 'TKO/Pedoman' : 'Excel lama')} · klik "Cara hitung" untuk melihat rumusnya</small></h3>${plainTable(mrpRows, [['Plant', (r) => esc(r.plant) + (S.mrpPlants.has(r.plant) ? '' : ' <span class="muted small">tidak dipantau</span>')], ['Aging', (r) => agingPill(r.aging)],
        ['Kelas', (r) => esc(r.cls || '')], ['AMU', (r) => fmt(r.amu, 2), 'num'], ['LT', (r) => (r.tEff != null ? fmt(r.tEff, 1) : fmt(r.lt, 1)), 'num'], ['SS', (r) => fmt(r.ss), 'num'], ['Min', (r) => fmt(r.min2), 'num'], ['Max', (r) => fmt(r.max2), 'num'],
        ['Stok ZNORMAL', (r) => fmt(r.stock), 'num'], ['Stok lain', stokLain, 'num'],
        ['OS PO', (r) => fmt(r.ospo), 'num'], ['Reservasi', (r) => fmt(r.mb25), 'num'], ['To Order', (r) => (r.toOrder ? `<b>${fmt(r.toOrder)}</b>` : '0'), 'num'],
        ['', (r) => `<a href="#" class="calcLink" data-p="${esc(r.plant)}">${calcPlant === r.plant ? 'Tutup' : 'Cara hitung'}</a>`]])}
        ${calcR ? `<div class="calc" id="mrpCalc">${explainMRP(calcR)}</div>` : ''}</section>` : ''}
      ${Object.keys(useWK).map((w) => `<section class="d-sec"><h3>Pemakaian bulanan WK ${w} <small>${F.months ? F.months + ' bulan terakhir' : 'semua histori'}, ${w === 'PEP' ? 'dari file MRP' : 'dari MB51 (Own Use + Return)'}</small></h3><div class="dUse" data-w="${w}"></div></section>`).join('')}
      ${kItems.length ? `<section class="d-sec"><h3>Kontrak <small>ME3N</small></h3>${plainTable(kItems, [['OA', (i) => `<a href="#" class="oalink" data-oa="${esc(i.doc)}">${esc(i.doc)}</a>${o.contract && o.contract.doc === i.doc ? ' <span class="pill info">dipakai</span>' : ''}`], ['Vendor', (i) => esc(i.k.vendor)],
        ['Harga', (i) => money(i.price, i.k.currency), 'num'], ['Terpakai qty', (i) => fmt(i.releasedQty), 'num'], ['Sisa qty', (i) => fmt(i.openQty), 'num'], ['Berakhir', (i) => dstr(i.k.end)], ['Sisa hari', (i) => fmt(i.k.sisaHari, 0), 'num'], ['Sisa nilai', (i) => money(i.k.sisa, i.k.currency), 'num']])}</section>` : ''}
      <section class="d-sec"><h3>PR, PO/RO, dan OA <small>ME2N · ${fmt(po.length, 0)} baris</small></h3>${po.length ? plainTable(po, [['PR', (l) => esc(l.pr || '-')], ['PO/RO', (l) => `${esc(l.doc)} ${pill(l.type, l.type === 'RO' ? 'info' : 'mute')}`], ['OA', (l) => (l.oa ? `<a href="#" class="oalink" data-oa="${esc(l.oa)}">${esc(l.oa)}</a>` : '-')], ['Plant', (l) => esc(l.plant)],
        ['Tgl dokumen', (l) => dstr(l.docDate)], ['Qty', (l) => fmt(l.qty), 'num'], ['Sisa kirim', (l) => fmt(l.openQty), 'num'], ['Jadwal', (l) => dstr(l.delivery)], ['Vendor', (l) => esc(l.vendor)],
        ['Status', (l) => (l.openQty <= 0 ? pill('Selesai', 'ok') : l.lateDays ? pill('Terlambat ' + l.lateDays + ' hari', 'low') : pill('Dalam pengiriman', 'info'))]]) : '<p class="muted">Tidak ada PO/RO di plant dan periode ini.</p>'}</section>
      ${resv.length ? `<section class="d-sec"><h3>Reservasi terbuka <small>MB25</small></h3>${plainTable(resv, [['Reservasi', (l) => esc(l.resv)], ['Plant', (l) => esc(l.plant)], ['Butuh', (l) => dstr(l.reqDate)], ['Sisa', (l) => fmt(l.diff), 'num'], ['Penerima', (l) => esc(l.recipient || l.costCenter || l.wbs)]])}</section>` : ''}
      <section class="d-sec"><h3>Gerakan per kategori <small>MB51 · ${fmt(mv.length, 0)} gerakan</small></h3>${mvtSum.length ? plainTable(mvtSum, [['Kategori', (x) => esc(x.cat)], ['Plant', (x) => esc(x.plants)], ['Qty', (x) => fmt(x.qty) + ' ' + esc(uom), 'num'], ['Gerakan', (x) => fmt(x.n, 0), 'num']]) : '<p class="muted">Tidak ada gerakan di plant dan periode ini.</p>'}</section>
      ${mv.length ? `<section class="d-sec"><h3>Daftar gerakan <small>MB51${mv.length > 100 ? ', 100 terbaru' : ''}</small></h3>${plainTable(mv.slice(0, 100), [['Tanggal', (x) => dstr(x.date)], ['Plant', (x) => esc(x.plant)], ['Mvt', (x) => esc(x.mt + ' ' + x.mtText)], ['Kategori', (x) => esc(x.cat || '')], ['Qty', (x) => fmt(x.qty), 'num'], ['Reservasi', (x) => esc(x.resv || '')], ['Keterangan', (x) => esc(x.header || x.po || '')]])}</section>` : ''}
      <div><a class="btn" href="#/lacak" id="dTrace">Lihat jejak lengkap</a></div>`;
      body.querySelectorAll('.dUse').forEach((el) => { const w = el.dataset.w, L = mi.labels[w], n = F.months || L.length;
        UI.columns(el, L.slice(-n).map((l) => { const [y, mm] = l.split('-'); return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][+mm - 1] + ' 20' + y; }), useWK[w].slice(-n), (v) => fmt(v, 1) + ' ' + uom); });
      body.querySelector('#mfZ').onchange = (e) => { F.zona = e.target.value; render(); };
      body.querySelector('#mfP').onchange = (e) => { F.plant = e.target.value; render(); };
      body.querySelector('#mfM').onchange = (e) => { F.months = +e.target.value; render(); };
      body.querySelectorAll('.calcLink').forEach((a) => (a.onclick = (e) => { e.preventDefault(); calcPlant = calcPlant === a.dataset.p ? '' : a.dataset.p; render(); const c = body.querySelector('#mrpCalc'); if (c) c.scrollIntoView({ block: 'nearest' }); }));
      body.querySelector('#dTrace').onclick = () => { sessionStorage.setItem('lacakQ', m); UI.closeDrawer(); };
      body.querySelectorAll('.oalink').forEach((a) => (a.onclick = (e) => { e.preventDefault(); openContract(a.dataset.oa); }));
    };
    render();
    if (opt.calc) { const c = body.querySelector('#mrpCalc'); if (c) setTimeout(() => c.scrollIntoView({ block: 'start' }), 60); }
  }

  // ---------- Penjelasan hitungan MRP per material+plant (langkah demi langkah, dengan angka) ----------
  const otherStock = (r) => (r.transit || r.stockOther ? `<p class="small"><b>Stok lain (tidak dihitung di atas):</b> in transit ${fmt(r.transit || 0)}${r.stockOther ? `, valuation type lain ${fmt(r.stockOther)} (${esc(r.otherVal)})` : ''}. Pertimbangkan sebelum memesan: barang transit akan masuk, ex-terminasi/surplus mungkin bisa dipakai.</p>` : '');
  function explainMRP(r) {
    const f1 = (v) => fmt(v, 2);
    const step = (title, rumus, hasil, note) => `<li><b>${title}</b><div class="calc-f">${rumus}</div><div class="calc-r">= <b>${hasil}</b>${note ? ` <span class="muted small">${note}</span>` : ''}</div></li>`;
    const L = [];
    const stock = r.stock || 0, ospo = r.ospo || 0, res = r.mb25 || 0;
    const head = `<h4>Cara hitung ${esc(plantLabel(r.plant))} <small>metode ${r.method === 'excel' ? 'Excel lama' : 'TKO/Pedoman'}</small></h4>`;
    const stokNote = 'Stok = unrestricted valuation type ZNORMAL dari MB52 (ex-terminasi, surplus, damage, dan in transit tidak dihitung).';
    if (r.method === 'excel') {
      const yes = r.hasContract === 'Yes', u = (r.alt && r.alt.excel) || r;
      L.push(step('AMU (rata-rata pemakaian per bulan)', 'Total pemakaian 36 bulan ÷ 36', f1(r.amu), r.basis === 'RKM' ? 'memakai RKM ÷ 12 karena lebih besar' : ''));
      L.push(step('Aging', `Frekuensi = bulan ada pemakaian ÷ 3 = ${f1(u.freq3)} → FS ≥ 1, MD ≥ 0,5, SP ≥ 0,2, selain itu DS`, esc(r.aging)));
      if (r.lt == null) return head + '<p class="muted">Lead time tidak ada di master, jadi Min/Max tidak dihitung.</p>';
      if (r.agingUsed === 'SP' || r.agingUsed === 'DS') {
        L.push(step('To Order (on demand)', `maks(0, Reservasi − Stok − OS PO) = maks(0, ${fmt(res)} − ${fmt(stock)} − ${fmt(ospo)})`, fmt(r.toOrder), 'SP/DS tidak diberi Min/Max'));
      } else {
        L.push(step('Safety stock', r.agingUsed === 'FS' ? `ROUNDUP(AMU × 3) = ROUNDUP(${f1(r.amu)} × 3)` : 'MD tidak diberi SS', fmt(r.ss)));
        L.push(step('Min', `AMU × LT + SS${yes ? '' : ' + AMU × 5 (tanpa kontrak)'} = ${f1(r.amu)} × ${fmt(r.lt, 1)} + ${fmt(r.ss)}${yes ? '' : ' + ' + f1(r.amu) + ' × 5'}`, `${f1(r.min)} → dibulatkan ${fmt(r.min2)}`));
        L.push(step('Max', `(${r.lt < 5 ? 'LT < 5 → AMU × 6' : 'LT ≥ 5 → AMU × 12'}) + SS${yes ? '' : ', lalu + AMU × 5 (tanpa kontrak)'}`, `${f1(r.max)} → ${fmt(r.max2)}`));
        const net = stock - res;
        L.push(step('Stok bersih', `Stok − Reservasi = ${fmt(stock)} − ${fmt(res)}`, fmt(net), stokNote));
        L.push(step('To Order', net <= r.min2 ? `Stok bersih ${fmt(net)} ≤ Min ${fmt(r.min2)} → Max − OS PO − stok bersih = ${fmt(r.max2)} − ${fmt(ospo)} − ${fmt(net)}` : `Stok bersih ${fmt(net)} > Min ${fmt(r.min2)} → belum perlu pesan`, fmt(r.toOrder)));
      }
      return head + `<ol class="calc-steps">${L.join('')}</ol>${otherStock(r)}`;
    }
    const P = Object.assign({}, MRP.TKO_DEFAULT, S.set.tko || {});
    const u = (r.usageAll || []).map((v) => Math.abs(v || 0)), n = r.wk === 'PHE' ? u.length : Math.min(P.amuMonths, u.length), win = u.slice(-n), sum = win.reduce((a, b) => a + b, 0);
    const div = r.amuHist > 0 ? sum / r.amuHist : n;
    L.push(step('AMU (rata-rata pemakaian per bulan)', `Total pemakaian ${n} bulan terakhir ÷ ${fmt(div, 1)} = ${fmt(sum)} ÷ ${fmt(div, 1)}`, f1(r.amuHist),
      r.basis === 'RKM' ? `dipakai RKM ÷ 12 = ${f1(r.amu)} karena lebih besar` : r.wk === 'PHE' ? 'WK PHE: histori dari MB51, dibagi lama periode data' : ''));
    L.push(step('Aging', r.since === Infinity ? 'Tidak ada pemakaian di histori' : `Pemakaian terakhir ${fmt(r.since, 0)} bulan lalu → FS < 12, MD < 24, SP < 60, selain itu DS`, esc(r.aging), r.agingUsed !== r.aging ? `dihitung sebagai ${r.agingUsed}${r.aging === 'MD' ? ' (MD dianggap FS, konfirmasi user)' : ''}` : ''));
    L.push(step('Kelas', 'Project → Program · FS → rutin (chemical / maintenance) · MD → rutin slow · SP/DS → on demand', esc(r.cls)));
    if (r.cls === 'Program' || r.cls === 'On Demand') {
      L.push(step('To Order', `maks(0, RKM + Reservasi − Stok − OS PO) = maks(0, ${fmt(r.rkm || 0)} + ${fmt(res)} − ${fmt(stock)} − ${fmt(ospo)})`, fmt(r.toOrder), stokNote));
      return head + `<ol class="calc-steps">${L.join('')}</ol>${otherStock(r)}`;
    }
    if (r.tEff == null) return head + `<ol class="calc-steps">${L.join('')}</ol><p class="muted">Lead time tidak ada, jadi Min/Max tidak dihitung.</p>`;
    const yes = r.hasContract === 'Yes', T = r.tEff, z = r.critical ? P.zCrit : P.z;
    L.push(step('Lead time efektif (T)', `LT ${fmt(r.lt, 1)} bln${yes ? ' (ada kontrak, tanpa tambahan)' : ` + ${fmt(P.nonContractLT, 1)} bln pengadaan (tanpa kontrak)`}`, fmt(T, 1) + ' bln'));
    if (r.cls === 'Rutin chemical') {
      L.push(step('Safety stock', `${P.chemSSMonths} bulan × AMU = ${P.chemSSMonths} × ${f1(r.amu)}`, fmt(r.ss)));
      L.push(step('Min (ROP)', `AMU × T + SS = ${f1(r.amu)} × ${fmt(T, 1)} + ${fmt(r.ss)}`, `${f1(r.min)} → ${fmt(r.min2)}`));
      L.push(step('Max', `AMU × (P + T) + SS = ${f1(r.amu)} × (${P.chemP} + ${fmt(T, 1)}) + ${fmt(r.ss)}`, `${f1(r.max)} → ${fmt(r.max2)}`));
    } else {
      const raw = z * (r.sdmi || 0) * Math.sqrt(T), cap = P.ssCapMonths * r.amu;
      L.push(step('Safety stock', `min(z × SdMI × √T, ${P.ssCapMonths} × AMU) = min(${fmt(z, 3)} × ${f1(r.sdmi)} × √${fmt(T, 1)}, ${fmt(P.ssCapMonths, 0)} × ${f1(r.amu)}) = min(${f1(raw)}, ${f1(cap)})`, fmt(r.ss), `SdMI = simpangan baku pemakaian bulanan; z = ${r.critical ? '99% (critical)' : '95%'}`));
      if (r.cls === 'Rutin slow (ROP manual)') L.push(step('Min = Max', 'Rutin slow: ROP = SS, pesan sampai SS', fmt(r.min2)));
      else {
        L.push(step('Min (ROP)', `AMU × T + SS = ${f1(r.amu)} × ${fmt(T, 1)} + ${fmt(r.ss)}`, `${f1(r.min)} → ${fmt(r.min2)}`));
        const F = P.maxFormula === 'BC' ? (yes ? 'B' : 'C') : P.maxFormula;
        const rumus = F === 'A' ? `2 × AMU × T + SS = 2 × ${f1(r.amu)} × ${fmt(T, 1)} + ${fmt(r.ss)}` : F === 'B' ? `AMU × T + 2 × SS = ${f1(r.amu)} × ${fmt(T, 1)} + 2 × ${fmt(r.ss)}` : `Min + ${P.roqMonths} × AMU = ${f1(r.min)} + ${P.roqMonths} × ${f1(r.amu)}`;
        L.push(step(`Max (rumus ${F}${P.maxFormula === 'BC' ? yes ? ', item kontrak' : ', item tanpa kontrak' : ''})`, rumus, `${f1(r.max)} → ${fmt(r.max2)}`, r.max2 > MRP.roundup(r.max) ? 'dinaikkan supaya Max ≥ Min' : ''));
      }
    }
    const avail = stock + ospo - res;
    L.push(step('Stok tersedia', `Stok + OS PO − Reservasi = ${fmt(stock)} + ${fmt(ospo)} − ${fmt(res)}`, fmt(avail), stokNote));
    L.push(step('To Order', avail < r.min2 ? `Tersedia ${fmt(avail)} < Min ${fmt(r.min2)} → Max − tersedia = ${fmt(r.max2)} − ${fmt(avail)}` : `Tersedia ${fmt(avail)} ≥ Min ${fmt(r.min2)} → belum perlu pesan`, fmt(r.toOrder)));
    if (r.cover != null && isFinite(r.cover)) L.push(step('Cakupan stok', `Stok ÷ AMU = ${fmt(stock)} ÷ ${f1(r.amu)}`, fmt(r.cover, 1) + ' bln', r.berlebih ? `berlebih (batas ${r.cls === 'Rutin chemical' ? P.excessChem : P.excessGeneral} bln)` : ''));
    return head + `<ol class="calc-steps">${L.join('')}</ol>${otherStock(r)}${r.note ? `<p class="muted small">${esc(r.note)}</p>` : ''}`;
  }

  // ---------- Kontrak: kartu ----------
  const tableKontrak = PAGES.kontrak;
  PAGES.kontrak = function () {
    if (!S.me3n) { $('view').innerHTML = needFile('file kontrak ME3N', 'Tambahkan download ME3N (WK PEP dan PHE), dan ME2N untuk PO/RO, di Data SAP atau di folder data.'); return; }
    $('pageActions').innerHTML = '<span id="vSeg"></span>';
    UI.seg($('vSeg'), [['kartu', 'Kartu'], ['tabel', 'Tabel']], S.kView, (v) => { S.kView = v; store.set('kView', v); route(); });
    if (S.kView === 'tabel') return tableKontrak();
    // bawaan: utamakan kontrak Zona 1 (PG X07) dan Regional 1 Zona 1&4 (PG X02); PG lain bisa ditambah lewat filter
    const F = S.kf || (S.kf = { q: '', st: new Set(), pg: new Set(store.get('kPg') || ['X07', 'X02']), wk: new Set(), kel: new Set(), sort: 'hari', n: 60 });
    const usedBy = new Map(); if (S.mrpRes) for (const r of S.mrpRes.values()) if (r.contract) usedBy.set(r.contract.doc, (usedBy.get(r.contract.doc) || 0) + 1);
    const stOf = (d) => { const a = []; if (d.sisaHari != null && d.sisaHari < 0) a.push('Berakhir'); else if (d.sisaHari != null && d.sisaHari <= 90) a.push('Habis ≤ 90 hari'); else if (d.sisaHari != null && d.sisaHari <= 180) a.push('Habis ≤ 180 hari'); if (d.pctSisa < 0.2) a.push('Sisa nilai < 20%'); return a.length ? a : ['Aman']; };
    const all = [...S.me3n.docs.values()];
    $('view').innerHTML = `<div class="filters"><label class="dt-search">${UI.I.search}<input type="search" id="kq" placeholder="Cari No. OA, vendor, atau material…" value="${esc(F.q)}"></label>
        <span id="kKelF"></span><span id="kSt"></span><span id="kPg"></span><span id="kWk"></span>
        <label class="select"><span class="select-k">Urut</span><select id="kSort" class="bare">${[['hari', 'Sisa hari'], ['nilai', 'Sisa nilai (%)'], ['pakai', 'Dipakai MRP'], ['oa', 'No. OA']].map(([v, l]) => `<option value="${v}" ${F.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <p class="source" id="kCount"></p><div class="oa-grid" id="kGrid"></div><div class="more" id="kMore"></div>`;
    // ringkasan per kelompok barang (kontrak dihitung pada kelompok utamanya)
    const kelRows = (() => {
      const m = new Map();
      all.forEach((d) => { const k = d.kel || 'Lainnya'; const g = m.get(k) || m.set(k, { kel: k, n: 0, aktif: 0, soon: 0, items: 0, sisa: {}, end: null, used: 0 }).get(k);
        g.n++; g.items += d.items || 0; g.used += usedBy.get(d.doc) || 0; const act = d.sisaHari == null || d.sisaHari >= 0; if (act) { g.aktif++; g.sisa[d.currency || 'IDR'] = (g.sisa[d.currency || 'IDR'] || 0) + (d.sisa || 0); }
        if (d.sisaHari != null && d.sisaHari >= 0 && d.sisaHari <= 90) g.soon++; if (act && d.end && (!g.end || d.end < g.end)) g.end = d.end; });
      return [...m.values()].sort((a, b) => (a.kel === 'Lainnya') - (b.kel === 'Lainnya') || b.n - a.n);
    })();
    const kelMulti = () => UI.multi($('kKelF'), { label: 'Kelompok', options: kelRows.map((g) => ({ value: g.kel, label: g.kel })), selected: F.kel, onChange: () => { F.n = 60; draw(); } });
    const draw = () => {
      const g = expand(F.q);
      let list = all.filter((d) => (!F.kel.size || F.kel.has(d.kel)) && (!F.pg.size || F.pg.has(d.pg)) && (!F.wk.size || F.wk.has(d.wk)) && (!F.st.size || stOf(d).some((x) => F.st.has(x))) &&
        (!F.q.trim() || hit(d.doc + ' ' + d.vendor + ' ' + d.pic, g) || S.me3n.items.some((i) => i.doc === d.doc && hit(i.material + ' ' + i.desc, g))));
      const srt = { hari: (a, b) => (a.sisaHari ?? 1e9) - (b.sisaHari ?? 1e9), nilai: (a, b) => a.pctSisa - b.pctSisa, pakai: (a, b) => (usedBy.get(b.doc) || 0) - (usedBy.get(a.doc) || 0), oa: (a, b) => a.doc.localeCompare(b.doc) }[F.sort];
      list.sort(srt);
      $('kCount').textContent = `${fmt(list.length, 0)} dari ${fmt(all.length, 0)} kontrak`;
      $('kGrid').innerHTML = list.slice(0, F.n).map((d) => {
        const st = stOf(d), used = d.target ? Math.min(100, Math.max(0, (1 - d.sisa / d.target) * 100)) : 0;
        const badge = d.sisaHari == null ? '' : d.sisaHari < 0 ? pill('Berakhir', 'low') : pill(`Aktif, ${fmt(d.sisaHari, 0)} hari`, d.sisaHari <= 90 ? 'low' : d.sisaHari <= 180 ? 'warn' : 'ok');
        return `<button type="button" class="oa-card" data-oa="${esc(d.doc)}"><div class="oa-top"><span class="oa-no">${esc(d.doc)}</span><span class="muted small">WK ${esc(d.wk || '')}</span>${badge}</div>
          <div class="oa-vendor">${esc(d.vendor)}</div>
          <div class="oa-kel">${esc(d.kel || 'Lainnya')}${(d.kels || []).length > 1 ? `<span class="muted"> dan ${d.kels.length - 1} kelompok lain</span>` : ''}</div>
          <div class="oa-meta"><span><b>${fmt(d.items, 0)}</b> item</span><span><b>${fmt(usedBy.get(d.doc) || 0, 0)}</b> dipakai MRP</span><span>PG <b>${esc(d.pg)}</b></span><span>s.d. <b>${dstr(d.end)}</b></span></div>
          <div class="oa-meta"><span>Sisa nilai <b>${money(d.sisa, d.currency)}</b> dari ${money(d.target, d.currency)}</span></div>
          <div class="progress ${d.pctSisa < 0.05 ? 'bad' : d.pctSisa < 0.2 ? 'warn' : ''}" title="Terpakai ${fmt(used, 0)}%"><i style="width:${used.toFixed(1)}%"></i></div>
          <div class="oa-foot">${st[0] !== 'Aman' && st.some((x) => x.startsWith('Sisa')) ? `<span class="small" style="color:var(--warn)">Sisa nilai di bawah 20%</span>` : '<span></span>'}${d.sisaHari == null || d.sisaHari >= 0 ? `<span class="oa-sim" data-sim="${esc(d.doc)}" role="button" tabindex="0" title="Rencanakan Call RO dari kontrak ini">Simulasi RO</span>` : ''}</div></button>`;
      }).join('') || '<div class="panel empty"><h3>Tidak ada kontrak yang cocok</h3><p>Ubah kata kunci atau filter.</p></div>';
      $('kMore').innerHTML = list.length > F.n ? `<button class="btn" id="kMoreB">Tampilkan ${Math.min(60, list.length - F.n)} lagi</button>` : '';
      if ($('kMoreB')) $('kMoreB').onclick = () => { F.n += 60; draw(); };
      document.querySelectorAll('.oa-card').forEach((c) => (c.onclick = (e) => openContract(c.dataset.oa, e.target.closest('.oa-sim') ? 'sim' : undefined)));
    };
    let t; $('kq').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { F.q = e.target.value; F.n = 60; draw(); }, 200); };
    $('kSort').onchange = (e) => { F.sort = e.target.value; draw(); };
    const later = () => { F.n = 60; draw(); };
    kelMulti();
    UI.multi($('kSt'), { label: 'Status', options: ['Aman', 'Habis ≤ 90 hari', 'Habis ≤ 180 hari', 'Sisa nilai < 20%', 'Berakhir'].map((v) => ({ value: v, label: v })), selected: F.st, onChange: later });
    UI.multi($('kPg'), { label: 'Purch. group', options: [...new Set(all.map((d) => d.pg))].sort().map((v) => ({ value: v, label: `${v} ${Contract.PIC[v] || ''}`.trim() })), selected: F.pg, onChange: () => { store.set('kPg', [...F.pg]); later(); } });
    UI.multi($('kWk'), { label: 'WK', options: [...new Set(all.map((d) => d.wk))].sort().map((v) => ({ value: v, label: 'WK ' + v })), selected: F.wk, onChange: later });
    draw();
  };

  // ---------- Pop-up kontrak: pemakaian kontrak, qty terpakai & sisa per item, history RO sampai pemakaian ----------
  const USE_CATS = new Set(['Own Use', 'BAU Iss', 'MTA Iss', 'Trf Iss']);
  function roTrail(lines) {
    // Per baris RO: barang diterima (MB51 101/103 lalu rilis 105 ke stok, dengan No. PO ini), lalu pemakaian material itu di plant penerima
    // sesudah tanggal terima, diambil berurutan (FIFO) sampai qty terima habis. Ini perkiraan, bukan link langsung di SAP.
    const moves = S.mb51 ? S.mb51.moves : [];
    const usedBy = new Map(); // moves yang sudah "dipakai" oleh RO lain (supaya tidak dobel)
    const out = [];
    lines.slice().sort((a, b) => (a.docDate || 0) - (b.docDate || 0)).forEach((l) => {
      const g = S.mb51 && S.mb51.gr ? S.mb51.gr.get(l.doc + '|' + String(+l.item || l.item)) : null;
      const grQty = g ? g.relQty || 0 : 0, grDate = g ? g.lastRel || g.firstIn : null; // qty yang sudah dirilis ke stok
      const uses = [];
      if (grQty > 0 && grDate) {
        let left = grQty;
        moves.filter((x) => x.material === l.material && x.plant === l.plant && x.date && x.date >= grDate && USE_CATS.has(x.cat) && x.qty < 0)
          .sort((a, b) => a.date - b.date).forEach((x) => {
            if (left <= 0) return; const taken = usedBy.get(x) || 0, free = Math.abs(x.qty) - taken; if (free <= 0) return;
            const q = Math.min(free, left); left -= q; usedBy.set(x, taken + q); uses.push({ x, q });
          });
      }
      out.push({ l, grQty, grDate, uses, usedQty: uses.reduce((a, u) => a + u.q, 0) });
    });
    return out.sort((a, b) => (b.l.docDate || 0) - (a.l.docDate || 0));
  }
  function openContract(doc, tab) {
    const d = S.me3n && S.me3n.docs.get(doc);
    const lines = S.me2n ? S.me2n.lines.filter((l) => l.oa === doc && !l.deleted) : [];
    if (!d && !lines.length) { UI.drawer(`<div class="d-head"><h2>OA ${esc(doc)}</h2></div><div class="d-sec">Kontrak ini tidak ada di ME3N maupun ME2N yang dimuat.</div>`, { label: 'Kontrak' }); return; }
    const items = S.me3n ? S.me3n.items.filter((i) => i.doc === doc) : [];
    const cur = d ? d.currency : (lines[0] && lines[0].currency) || '';
    const plan = S.mrpRes ? [...S.mrpRes.values()].filter((r) => r.contract && r.contract.doc === doc && r.toOrder > 0 && S.mrpPlants.has(r.plant)) : [];
    const used = d && d.target ? Math.min(100, Math.max(0, (1 - d.sisa / d.target) * 100)) : 0;
    const trail = roTrail(lines);
    // pemakaian kontrak per plant (nilai RO)
    const perPlant = new Map(); lines.forEach((l) => { const g = perPlant.get(l.plant) || perPlant.set(l.plant, { plant: l.plant, n: 0, value: 0, open: 0 }).get(l.plant); g.n++; g.value += l.value; g.open += l.openValue || 0; });
    const roVal = lines.reduce((a, l) => a + l.value, 0);
    const T = { tab: tab || (items.length ? 'item' : 'ro') };
    const body = UI.drawer('', { label: 'Kontrak ' + doc, wide: true });
    // ---------- Simulasi Call RO: qty RO per material × field, dengan stok dan estimasi sesudah RO ----------
    const SIMK = 'simRO', simAll = store.get(SIMK) || {}, SIM = (simAll[doc] = simAll[doc] || { q: {}, zona: '', need: true });
    const saveSim = () => { simAll[doc] = SIM; store.set(SIMK, simAll); };
    const mb52Of = new Map(S.mb52 ? S.mb52.items.map((i) => [i.material + '|' + i.plant, i]) : []);
    const simRows = () => {
      const out = [];
      items.forEach((it) => {
        const m = it.material, plants = new Set();
        if (S.mrpRes) S.mrpRes.forEach((r) => { if (r.material === m && S.mrpPlants.has(r.plant)) plants.add(r.plant); });
        lines.forEach((l) => { if (l.material === m) plants.add(l.plant); });
        plants.forEach((p) => {
          const r = S.mrpRes ? S.mrpRes.get(m + '|' + p) : null, i = mb52Of.get(m + '|' + p), k = it.item + '|' + p;
          const stock = r ? r.stock : i ? (i.sohNormal != null ? i.sohNormal : i.soh) : 0;
          const row = { k, it, m, desc: it.desc, uom: it.uom || (r && r.uom) || '', plant: p, zona: zonaOf(p), r, stock, transit: i ? i.transit || 0 : 0, other: i ? i.sohOther || 0 : 0,
            ospo: r ? r.ospo || 0 : 0, res: r ? r.mb25 || 0 : 0, amu: r ? r.amu || 0 : 0, min: r ? r.min2 : null, max: r ? r.max2 : null, mrp: r ? r.toOrder || 0 : 0, price: it.price || 0 };
          row.qty = SIM.q[k] != null ? SIM.q[k] : row.mrp;
          row.value = row.qty * row.price; row.after = row.stock + row.ospo - row.res + row.qty; row.cover = row.amu > 0 ? row.after / row.amu : null;
          out.push(row);
        });
      });
      return out.sort((a, b) => b.mrp - a.mrp || a.m.localeCompare(b.m) || a.plant.localeCompare(b.plant));
    };
    function simHTML() {
      const all = simRows(), zonas = [...new Set(all.map((x) => x.zona))].sort();
      const rows = all.filter((x) => (!SIM.zona || x.zona === SIM.zona) && (!SIM.need || x.mrp > 0 || x.qty > 0));
      const chosen = all.filter((x) => x.qty > 0), tq = chosen.reduce((a, x) => a + x.value, 0);
      // cek batas kontrak: nilai (sisa kontrak) dan qty per item (kalau kontrak qty)
      const perItem = new Map(); chosen.forEach((x) => perItem.set(x.it, (perItem.get(x.it) || 0) + x.qty));
      const warn = [];
      if (d && tq > d.sisa) warn.push(`Total simulasi ${money(tq, cur)} melebihi sisa nilai kontrak ${money(d.sisa, cur)}.`);
      perItem.forEach((q, it) => { if (it.targetQty && q > it.openQty) warn.push(`${esc(it.material)}: qty simulasi ${fmt(q)} melebihi sisa qty kontrak ${fmt(it.openQty)}.`); });
      if (d && d.sisaHari != null && d.sisaHari < 60) warn.push(`Kontrak berakhir ${fmt(d.sisaHari, 0)} hari lagi. Pastikan jadwal kirim masih di dalam masa kontrak.`);
      const flag = (x) => (!x.r ? '<span class="muted small">tidak ada di MRP</span>' : x.qty > 0 && x.max != null && x.after > x.max ? pill('Di atas Max', 'warn') : x.min != null && x.after < x.min ? pill('Masih di bawah Min', 'low') : x.qty > 0 ? pill('Aman', 'ok') : '');
      const sel = `<label class="chk">Zona <select id="simZ" aria-label="Zona">${[['', 'Semua zona'], ...zonas.map((z) => [z, z])].map(([v, t]) => `<option value="${esc(v)}"${SIM.zona === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
      return `<p class="tab-note">Isi qty RO per material dan field. Qty awal = To Order dari MRP; ubah sesuai rencana. Sesudah RO = Stok ZNORMAL + OS PO − Reservasi + qty RO. Stok in transit dan valuation type lain ditampilkan sebagai pertimbangan, tidak ikut dihitung. Isian tersimpan di browser ini.</p>
        <div class="filters">${sel}<label class="chk"><input type="checkbox" id="simNeed"${SIM.need ? ' checked' : ''}> Hanya yang perlu order / sudah diisi</label>
          <button class="btn" id="simMRP" type="button">Isi sesuai MRP</button><button class="btn" id="simClr" type="button">Kosongkan</button><button class="btn" id="simXls" type="button">Unduh Excel</button></div>
        <div class="kv"><div><span>Baris diisi</span><b>${fmt(chosen.length, 0)}</b></div><div><span>Field</span><b>${fmt(new Set(chosen.map((x) => x.plant)).size, 0)}</b></div><div><span>Estimasi nilai RO</span><b>${money(tq, cur)}</b></div>
          ${d ? `<div><span>Sisa kontrak</span><b>${money(d.sisa, cur)}</b></div><div><span>Sisa sesudah simulasi</span><b class="${d.sisa - tq < 0 ? 'neg' : ''}">${money(d.sisa - tq, cur)}</b></div>` : ''}</div>
        ${warn.length ? `<ul class="reco">${warn.map((w) => `<li class="bad"><span>${w}</span></li>`).join('')}</ul>` : ''}
        ${rows.length ? plainTable(rows, [['Material', (x) => `<a href="#" class="mlink" data-mat="${esc(x.m)}">${esc(x.m)}</a><div class="muted small sim-desc">${esc(x.desc)}</div>`], ['Field', (x) => `${esc(x.plant)}<div class="muted small">${esc(x.zona)}</div>`],
          ['Stok', (x) => fmt(x.stock) + (x.transit || x.other ? `<div class="muted small">${x.transit ? 'transit ' + fmt(x.transit) : ''}${x.transit && x.other ? ' · ' : ''}${x.other ? 'val. lain ' + fmt(x.other) : ''}</div>` : ''), 'num'],
          ['OS PO / Res.', (x) => fmt(x.ospo) + ' / ' + fmt(x.res), 'num'], ['AMU', (x) => fmt(x.amu, 1), 'num'], ['Min / Max', (x) => (x.r ? fmt(x.min) + ' / ' + fmt(x.max) : '-'), 'num'],
          ['MRP', (x) => (x.r ? `<a href="#" class="simcalc" data-m="${esc(x.m)}" data-p="${esc(x.plant)}" title="Lihat cara hitung">${fmt(x.mrp)}</a>` : '-'), 'num'],
          ['Qty RO', (x) => `<input class="simq" type="number" min="0" step="any" data-k="${esc(x.k)}" value="${x.qty || ''}" aria-label="Qty RO ${esc(x.m)} ${esc(x.plant)}">`, 'num'],
          ['Estimasi', (x) => (x.qty ? money(x.value, cur) : ''), 'num'], ['Sesudah RO', (x) => fmt(x.after) + `<div class="muted small">${x.cover == null ? '' : fmt(x.cover, 1) + ' bln'}</div>`, 'num'], ['Status', flag]])
          : '<p class="muted">Tidak ada material kontrak yang perlu order di zona ini. Matikan filter "Hanya yang perlu order" untuk melihat semua field.</p>'}`;
    }
    function bindSim() {
      const q = (s) => body.querySelector(s); if (!q('#simZ')) return;
      const keep = () => { const y = body.scrollTop; saveSim(); render(); body.scrollTop = y; };
      q('#simZ').onchange = (e) => { SIM.zona = e.target.value; keep(); };
      q('#simNeed').onchange = (e) => { SIM.need = e.target.checked; keep(); };
      q('#simMRP').onclick = () => { SIM.q = {}; keep(); };
      q('#simClr').onclick = () => { SIM.q = {}; simRows().forEach((x) => (SIM.q[x.k] = 0)); keep(); };
      body.querySelectorAll('.simq').forEach((inp) => (inp.onchange = () => { const v = parseFloat(inp.value); SIM.q[inp.dataset.k] = isFinite(v) && v > 0 ? v : 0; keep(); }));
      body.querySelectorAll('.simcalc').forEach((a) => (a.onclick = (e) => { e.preventDefault(); openMaterial(a.dataset.m, { calc: a.dataset.p }); }));
      q('#simXls').onclick = () => {
        const rows = simRows().filter((x) => x.qty > 0);
        const ws = XLSX.utils.json_to_sheet(rows.map((x) => ({ OA: doc, Vendor: d ? d.vendor : '', Item: x.it.item, Material: x.m, Deskripsi: x.desc, UoM: x.uom, Plant: x.plant, Zona: x.zona,
          'Stok ZNORMAL': x.stock, 'In transit': x.transit, 'Val. type lain': x.other, 'OS PO': x.ospo, Reservasi: x.res, AMU: x.amu, Min: x.min, Max: x.max, 'To Order MRP': x.mrp,
          'Qty RO': x.qty, 'Harga satuan': x.price, 'Estimasi nilai': x.value, Mata_uang: cur, 'Sesudah RO': x.after, 'Cakupan (bln)': x.cover == null ? '' : +x.cover.toFixed(1) })));
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Simulasi RO'); XLSX.writeFile(wb, `Simulasi Call RO ${doc}.xlsx`);
      };
    }
    const status = (l) => (l.openQty <= 0 ? pill('Selesai', 'ok') : l.lateDays ? pill('Telat ' + l.lateDays + ' hr', 'low') : pill('Belum tiba', 'info'));
    const render = () => {
      const tabs = [['item', `Item kontrak (${items.length})`], ['ro', `History RO (${lines.length})`], ['pakai', 'Dipakai ke mana'], ...(items.length ? [['sim', `Simulasi Call RO${plan.length ? ' (' + plan.length + ' perlu order)' : ''}`]] : [])];
      let sec = '';
      if (T.tab === 'item') sec = items.length ? `${plainTable(items.slice().sort((a, b) => b.released - a.released), [['Item', (i) => esc(i.item)], ['Material', (i) => `<a href="#" class="mlink" data-mat="${esc(i.material)}">${esc(i.material)}</a>`], ['Deskripsi', (i) => esc(i.desc)],
        ['Harga', (i) => money(i.price, cur), 'num'], ['Target qty', (i) => (i.targetQty ? fmt(i.targetQty) + ' ' + esc(i.uom) : '<span class="muted small">kontrak nilai</span>'), 'num'], ['Terpakai qty', (i) => fmt(i.releasedQty) + ' ' + esc(i.uom), 'num'],
        ['Sisa qty', (i) => (i.targetQty ? fmt(i.openQty) : '-'), 'num'], ['Terpakai', (i) => (i.targetQty ? fmt((i.releasedQty / i.targetQty) * 100, 0) + '%' : '-'), 'num'], ['Nilai terpakai', (i) => money(i.released, cur), 'num']])}
        ${items.some((i) => !i.targetQty) ? '<p class="muted small">Kontrak nilai: SAP tidak mencatat target qty per item, jadi yang dibatasi adalah nilai total kontrak (lihat Sisa di atas). Terpakai qty = nilai RO ÷ harga satuan.</p>' : ''}` : '<p class="muted">Item kontrak tidak ada di ME3N yang dimuat.</p>';
      if (T.tab === 'ro') sec = lines.length ? '<div id="kTab"></div>' : '<p class="muted">Belum ada RO dari kontrak ini di ME2N.</p>';
      if (T.tab === 'pakai') {
        const rows = []; trail.forEach((t) => t.uses.forEach((u) => rows.push({ t, u })));
        sec = `<h4 class="sub-h">Per plant penerima</h4>${plainTable([...perPlant.values()].sort((a, b) => b.value - a.value), [['Plant', (g) => esc(plantLabel(g.plant))], ['Zona', (g) => esc(zonaOf(g.plant))], ['Jumlah RO', (g) => fmt(g.n, 0), 'num'], ['Nilai RO', (g) => money(g.value, cur), 'num'], ['Belum dikirim', (g) => money(g.open, cur), 'num'], ['Porsi', (g) => (roVal ? fmt((g.value / roVal) * 100, 0) + '%' : '-'), 'num']])}
          <h4 class="sub-h">Pemakaian sesudah barang diterima <small>${fmt(rows.length, 0)} gerakan MB51</small></h4>
          <p class="muted small">Perkiraan: setelah barang RO dirilis ke stok, pemakaian material yang sama di plant itu diambil berurutan sampai qty terima habis. SAP tidak menyimpan link langsung RO ke pemakaian.</p>
          ${rows.length ? '<div id="kTab"></div>' : `<p class="muted">${S.mb51 ? 'Belum ada pemakaian yang bisa dihubungkan ke RO kontrak ini.' : 'Muat file MB51 untuk melihat penerimaan dan pemakaian.'}</p>`}`;
        T.useRows = rows;
      }
      if (T.tab === 'sim') sec = simHTML();
      body.innerHTML = `<div class="d-head"><h2>${esc(d ? d.vendor : (lines[0] && lines[0].vendor) || 'OA ' + doc)}</h2><div class="meta"><span>OA ${esc(doc)}</span>${d ? `<span>WK ${esc(d.wk || '')}</span><span>${esc((d.kels || [d.kel]).filter(Boolean).join(', '))}</span><span>PG ${esc(d.pg)} ${esc(d.pic)}</span><span>${dstr(d.start)} s.d. ${dstr(d.end)}</span>` : '<span>tidak ada di ME3N</span>'}</div></div>
        ${d ? `<div class="kv"><div><span>Nilai kontrak</span><b>${money(d.target, cur)}</b></div><div><span>Terpakai</span><b>${money(d.released, cur)}</b></div><div><span>Sisa</span><b>${money(d.sisa, cur)}</b></div><div><span>Terpakai %</span><b>${fmt(used, 1)}%</b></div><div><span>Sisa hari</span><b>${fmt(d.sisaHari, 0)}</b></div><div><span>RO di ME2N</span><b>${fmt(lines.length, 0)}</b></div></div>
        <div class="progress" title="Terpakai ${fmt(used, 0)}%"><i style="width:${used.toFixed(1)}%"></i></div>` : ''}
        <div class="seg" role="radiogroup" aria-label="Bagian kontrak">${tabs.map(([k, t]) => `<button type="button" role="radio" aria-checked="${T.tab === k}" data-t="${k}">${esc(t)}</button>`).join('')}</div>
        <section class="d-sec">${sec}</section>`;
      const el = body.querySelector('#kTab'), mat = (x) => `<a href="#" class="mlink" data-mat="${esc(x)}">${esc(x)}</a>`;
      if (el && T.tab === 'ro') UI.table(el, { id: 'k-ro', rows: trail, name: 'History RO ' + doc, rowKey: (x) => x.l.doc + '/' + x.l.item, placeholder: 'Cari RO, PR, plant, atau material…', cols: [
        { label: 'RO', nowrap: true, get: (x) => x.l.doc + '/' + x.l.item, html: (x) => `<span class="mono">${esc(x.l.doc)}</span><span class="muted small">/${esc(x.l.item)}</span>` }, { label: 'PR', get: (x) => x.l.pr }, { label: 'Tgl RO', nowrap: true, get: (x) => x.l.docDate || null, html: (x) => dstr(x.l.docDate) },
        { label: 'Plant', get: (x) => x.l.plant }, { label: 'Material', nowrap: true, get: (x) => x.l.material, html: (x) => mat(x.l.material) }, { label: 'Deskripsi', wide: true, hide: true, get: (x) => x.l.desc },
        { label: 'Qty', num: true, filter: false, get: (x) => x.l.qty, html: (x) => fmt(x.l.qty) + ' ' + esc(x.l.uom) }, { label: 'Diterima', num: true, filter: false, get: (x) => x.grQty, html: (x) => (x.grQty ? `${fmt(x.grQty)} <span class="muted small">${dstr(x.grDate)}</span>` : '') }, { label: 'Sudah dipakai', num: true, filter: false, get: (x) => x.usedQty, html: (x) => (x.usedQty ? fmt(x.usedQty) : '') },
        { label: 'Sisa kirim', num: true, filter: false, get: (x) => x.l.openQty, html: (x) => fmt(x.l.openQty) }, { label: 'Nilai', num: true, filter: false, hide: true, get: (x) => x.l.value, html: (x) => money(x.l.value, x.l.currency) },
        { label: 'Status', get: (x) => (x.l.openQty <= 0 ? 'Selesai' : x.l.lateDays ? 'Terlambat' : 'Belum tiba'), html: (x) => status(x.l) }] });
      if (el && T.tab === 'pakai') UI.table(el, { id: 'k-pakai', rows: T.useRows, name: 'Pemakaian RO ' + doc, rowKey: (r) => r.u.x.matDoc + r.t.l.doc, placeholder: 'Cari RO, plant, reservasi, atau keterangan…', cols: [
        { label: 'RO', get: (r) => r.t.l.doc }, { label: 'Plant', get: (r) => r.t.l.plant }, { label: 'Material', nowrap: true, get: (r) => r.t.l.material, html: (r) => mat(r.t.l.material) },
        { label: 'Tanggal pakai', nowrap: true, get: (r) => r.u.x.date, html: (r) => dstr(r.u.x.date) }, { label: 'Jenis', get: (r) => r.u.x.cat }, { label: 'Qty', num: true, filter: false, get: (r) => r.u.q, html: (r) => fmt(r.u.q) + ' ' + esc(r.u.x.uom || '') },
        { label: 'Reservasi', get: (r) => r.u.x.resv }, { label: 'Untuk', wide: true, get: (r) => r.u.x.header || (r.u.x.toPlant ? 'ke ' + plantLabel(r.u.x.toPlant) : '') }, { label: 'Mat. Doc', hide: true, get: (r) => r.u.x.matDoc }] });
      if (T.tab === 'sim') bindSim();
      body.querySelectorAll('.seg button').forEach((b) => (b.onclick = () => { T.tab = b.dataset.t; render(); }));
      body.querySelectorAll('.mlink').forEach((a) => (a.onclick = (e) => { e.preventDefault(); openMaterial(a.dataset.mat); }));
    };
    render();
  }

  // tautan material di mana pun → buka analisis material
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.mlink, .oalink, .calclink'); if (!a || a.closest('.drawer')) return; e.preventDefault();
    if (a.classList.contains('oalink')) openContract(a.dataset.oa, a.dataset.tab);
    else if (a.classList.contains('calclink')) openMaterial(a.dataset.mat, { calc: a.dataset.p });
    else openMaterial(a.dataset.mat);
  });
  window.openMaterial = openMaterial; window.openContract = openContract; window.explainMRP = explainMRP;
})();

// ============ Pergerakan Material (MB51): klasifikasi Mvt, alur dari → ke, rekap bulanan ============
(function () {
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const ym = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  const ymLabel = (k) => BLN[+k.slice(5) - 1] + ' ' + k.slice(0, 4);
  // urutan & penjelasan kategori dari tabel Mvt user
  const CAT = [
    ['PO/RO', 'Terima dari vendor lewat PO/RO'], ['Batal PO/RO', 'Pembatalan terima PO/RO'], ['Retur ke vendor', 'Barang dikembalikan ke vendor'],
    ['BAU Rec', 'Terima BAU (STO) dari plant lain'], ['Batal BAU Rec', 'Pembatalan terima BAU'], ['MTA Rec', 'Terima lewat MTA dari KKKS lain'], ['Batal MTA Rec', 'Pembatalan terima MTA'],
    ['Trf Rec', 'Terima transfer antar plant (301)'], ['Batal Trf Rec', 'Pembatalan terima transfer'], ['Maxter Rec', 'Stok khusus/Maxter jadi stok sendiri'], ['Batal Maxter Rec', 'Pembatalan Maxter'],
    ['Return', 'Material kembali ke gudang dari pemakai'], ['Batal Return', 'Pembatalan retur'], ['Return DS', 'Pindah dari plant DS ke plant aktif'],
    ['Own Use', 'Pemakaian sendiri (cost center, order, WBS, network)'], ['Batal Own Use', 'Pembatalan pemakaian (pengurang Own Use)'],
    ['BAU Iss', 'Kirim BAU (STO) ke plant lain'], ['Batal BAU Iss', 'Pembatalan kirim BAU'], ['MTA Iss', 'Keluar ke KKKS lain lewat MTA'], ['Batal MTA Iss', 'Pembatalan MTA'],
    ['Trf Iss', 'Kirim transfer antar plant (301)'], ['Batal Trf Iss', 'Pembatalan kirim transfer'], ['Konversi Kode', 'Ganti kode material (309), barang tidak keluar gudang'], ['Batal Konversi Kode', 'Pembatalan ganti kode'],
    ['FUPP Iss', 'Keluar untuk scrap/FUPP'], ['Batal FUPP', 'Pembatalan FUPP'], ['GI Adj', 'Penyesuaian stok'], ['Selisih Opname', 'Selisih stock opname'],
    ['Not Included', 'Tidak dihitung: blocked stock, dalam perjalanan, sisi lawan, atau pindah SLoc'], ['', 'Belum terklasifikasi (kunci Mvt belum ada di tabel)'],
  ];
  // (urutan kategori tidak dipakai lagi sejak halaman jadi pembaca MB51)
  const catName = (c) => c || 'Belum terklasifikasi';
  const PARTY = { 'MTA Iss': 'MTA (KKKS lain)', 'Batal MTA Iss': 'MTA (KKKS lain)', 'MTA Rec': 'MTA (KKKS lain)', 'Batal MTA Rec': 'MTA (KKKS lain)', 'Maxter Rec': 'Maxter (stok khusus)', 'Batal Maxter Rec': 'Maxter (stok khusus)',
    'FUPP Iss': 'FUPP/scrap', 'Batal FUPP': 'FUPP/scrap', 'Own Use': 'Pemakai (Own Use)', 'Batal Own Use': 'Pemakai (Own Use)', 'Return': 'Pemakai (retur)', 'Batal Return': 'Pemakai (retur)',
    'Return DS': 'Plant DS', 'GI Adj': 'Penyesuaian stok', 'Selisih Opname': 'Stock opname', 'Konversi Kode': 'Kode material lain', 'Batal Konversi Kode': 'Kode material lain', 'Retur ke vendor': 'Vendor' };
  const cache = new WeakMap();
  function prep() {
    if (!S.mb51) return null;
    const hitC = cache.get(S.mb51); if (hitC && hitC.v === (S.me2n ? S.me2n.lines.length : 0)) return hitC.d;
    const vendor = new Map(); (S.me2n ? S.me2n.lines : []).forEach((l) => vendor.set(l.doc, l.vendor));
    const pl = (p) => (p ? plantLabel(p) : '');
    const moves = S.mb51.moves.map((m) => {
      const cur = m.cur || stockCur(m.plant), here = pl(m.plant); let from, to;
      if (m.fromPlant || m.toPlant) { from = m.fromPlant ? pl(m.fromPlant) : '?'; to = m.toPlant ? pl(m.toPlant) : 'Dalam perjalanan'; }
      else if (PARTY[m.cat]) { const x = PARTY[m.cat]; [from, to] = m.qty < 0 ? [here, x] : [x, here]; }
      else if (m.po) { const v = vendor.get(m.po) || `Vendor PO ${m.po}`; [from, to] = m.qty < 0 ? [here, v] : [v, here]; }
      else [from, to] = m.qty < 0 ? [here, m.mtText || 'Keluar'] : [m.mtText || 'Masuk', here];
      return { m, from, to, cat: m.cat || '', idr: Math.abs(toIDRv(m.amount, cur)), cur, month: m.date ? ym(m.date) : '' };
    });
    const months = [...new Set(moves.map((x) => x.month).filter(Boolean))].sort();
    const d = { moves, months };
    cache.set(S.mb51, { v: S.me2n ? S.me2n.lines.length : 0, d }); return d;
  }

  // Keluar-Masuk Barang = pembaca MB51: satu tabel semua baris, setiap kolom bisa difilter, diurutkan, dan dicari
  PAGES.gerak = function () {
    if (!S.mb51) { $('view').innerHTML = needFile('file MB51', 'Pergerakan material dibaca dari MB51. Taruh semua file MB51 (misalnya per bulan) di folder data: web menggabungkannya dan membuang baris yang dobel.'); return; }
    const D = prep();
    const G = S.gf || (S.gf = { from: '', to: '', wk: new Set(), plant: new Set(), ni: false });
    if (!D.months.includes(G.to)) G.to = D.months[D.months.length - 1] || '';
    if (!D.months.includes(G.from)) G.from = D.months[Math.max(0, D.months.indexOf(G.to) - 11)] || ''; // bawaan: 12 bulan terakhir
    const plants = [...new Set(D.moves.map((x) => x.m.plant))].sort();
    const unk = new Map(); D.moves.forEach((x) => { if (!x.cat) unk.set(x.m.mkey, (unk.get(x.m.mkey) || 0) + 1); });
    const opt = (v, sel) => `<option value="${v}"${v === sel ? ' selected' : ''}>${ymLabel(v)}</option>`;
    $('view').innerHTML = `
      ${unk.size ? `<div class="banner warn"><span>Ada ${fmt([...unk.values()].reduce((a, b) => a + b, 0), 0)} gerakan dengan kunci Mvt yang belum ada di tabel referensi: ${esc([...unk].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} (${n})`).join(', '))}. Kirim kategorinya supaya bisa ditambahkan.</span></div>` : ''}
      <div class="filters"><label class="select"><span>Dari</span><select class="bare" id="gFrom">${D.months.map((m) => opt(m, G.from)).join('')}</select></label>
        <label class="select"><span>Sampai</span><select class="bare" id="gTo">${D.months.map((m) => opt(m, G.to)).join('')}</select></label>
        <span id="gWK"></span><span id="gPl"></span>
        <label class="chk"><input type="checkbox" id="gNI"${G.ni ? ' checked' : ''}> Tampilkan juga gerakan yang tidak dihitung</label></div>
      <div id="gBody"></div>`;
    const redraw = () => reader(D);
    $('gFrom').onchange = (e) => { G.from = e.target.value; if (G.to < G.from) G.to = G.from; redraw(); };
    $('gTo').onchange = (e) => { G.to = e.target.value; if (G.from > G.to) G.from = G.to; redraw(); };
    $('gNI').onchange = (e) => { G.ni = e.target.checked; redraw(); };
    const wks = [...new Set(D.moves.map((x) => x.m.wk))].sort();
    if (wks.length > 1) UI.multi($('gWK'), { label: 'WK', options: wks.map((w) => ({ value: w, label: 'WK ' + w })), selected: G.wk, onChange: redraw });
    UI.multi($('gPl'), { label: 'Plant', options: plants.map((p) => ({ value: p, label: plantLabel(p) })), selected: G.plant, onChange: redraw });
    redraw();
  };

  function reader(D) {
    const G = S.gf;
    const rows = D.moves.filter((x) => x.month >= G.from && x.month <= G.to && (!G.wk.size || G.wk.has(x.m.wk)) && (!G.plant.size || G.plant.has(x.m.plant))
      && (G.ni || x.cat !== 'Not Included')).sort((a, b) => (b.m.date || 0) - (a.m.date || 0));
    UI.table($('gBody'), { id: 'mb51-reader', minWidth: 1500, rows, name: 'MB51 ' + G.from + ' sd ' + G.to, rowKey: (x) => x.m.material, onRow: (k) => openMaterial(k),
      match: (x, q) => hit([x.m.material, x.m.desc, x.m.matDoc, x.m.po, x.m.header, x.m.resv, x.m.mt, x.m.mtText, x.from, x.to].join(' '), expand(q)), placeholder: 'Cari material, deskripsi, dokumen, PO, Mvt, keterangan…', cols: [
      { label: 'Tanggal', nowrap: true, w: 1.1, get: (x) => x.m.date, html: (x) => dstr(x.m.date) },
      { label: 'Plant', get: (x) => x.m.plant, title: '' },
      { label: 'SLoc', get: (x) => x.m.sloc },
      { label: 'Mvt', get: (x) => x.m.mt, html: (x) => `<span title="${esc(x.m.mtText)}">${esc(x.m.mt)}</span>` },
      { label: 'Teks Mvt', get: (x) => x.m.mtText, hide: true },
      { label: 'Kategori', get: (x) => catName(x.cat) },
      { label: 'Material', nowrap: true, w: 1.4, get: (x) => x.m.material, html: (x) => `<span class="mono">${esc(x.m.material)}</span>` },
      { label: 'Deskripsi', wide: true, get: (x) => x.m.desc },
      { label: 'Qty', num: true, get: (x) => x.m.qty, html: (x) => fmt(x.m.qty) },
      { label: 'UoM', get: (x) => x.m.uom },
      { label: 'Nilai', num: true, get: (x) => x.m.amount, html: (x) => money(x.m.amount, x.cur) },
      { label: 'Mata uang', get: (x) => x.cur, hide: true },
      { label: 'PO/RO', nowrap: true, get: (x) => x.m.po },
      { label: 'Item', get: (x) => x.m.poItem, hide: true },
      { label: 'Dari', get: (x) => x.from }, { label: 'Ke', get: (x) => x.to },
      { label: 'Header text', get: (x) => x.m.header },
      { label: 'Mat. Doc', nowrap: true, get: (x) => x.m.matDoc, hide: true },
      { label: 'Val. type', get: (x) => x.m.batch, hide: true },
      { label: 'Reservasi', get: (x) => x.m.resv, hide: true },
      { label: 'User', get: (x) => x.m.user, hide: true },
      { label: 'Reference', get: (x) => x.m.ref, hide: true },
    ] });
  }

  // Tabel aturan Movement Type → kategori (ditampilkan di Panduan & Aturan)
  window.mvtRulesTable = function (el) {
    const used = new Map(); (S.mb51 ? S.mb51.moves : []).forEach((m) => used.set(m.mkey, (used.get(m.mkey) || 0) + 1));
    UI.table(el, { id: 'gerak-aturan', rows: Master.MVT_TABLE, name: 'Aturan MvT', placeholder: 'Cari Mvt, kategori, atau penjelasan…', match: (r, q) => hit(r.join(' '), expand(q)), cols: [
      { label: 'Kunci', nowrap: true, get: (r) => r[0], html: (r) => `<b class="mono">${esc(r[0])}</b>` },
      { label: 'Mvt', get: (r) => r[0].slice(0, 3) },
      { label: 'Arah', get: (r) => (r[0].endsWith('+') ? 'Masuk (+)' : 'Keluar (−)') },
      { label: 'Teks SAP', get: (r) => r[2] },
      { label: 'Kategori', get: (r) => r[1], html: (r) => `<b>${esc(r[1])}</b>` },
      { label: 'Arti di SAP', wide: true, w: 3, get: (r) => r[3] },
      { label: 'Optimasi DS', get: (r) => r[4] === 'OWN USE' ? 'Internal Usage' : r[4] === 'BAU' ? 'BAU' : r[4] === 'MTA' ? 'MTA' : r[4] === '309' ? 'Opsional (309)' : 'Tidak dihitung' },
      { label: 'Baris di data', num: true, filter: false, get: (r) => used.get(r[0]) || 0, html: (r) => fmt(used.get(r[0]) || 0, 0) },
      { label: 'Koreksi dari tabel lama', wide: true, w: 2.2, get: (r) => r[5], html: (r) => (r[5] ? `<span class="muted">${esc(r[5])}</span>` : '') },
    ] });
  };
})();
