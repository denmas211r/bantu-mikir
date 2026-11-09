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
      o.stock.set(i.plant, (o.stock.get(i.plant) || 0) + i.soh); o.valueIDR += toIDRv(i.value, stockCur(i.plant));
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
        html: (o) => (o.contract ? `${esc(o.contract.doc)}<span class="k-s">${o.contract.sisaHari != null ? fmt(o.contract.sisaHari, 0) + ' hari lagi' : ''}</span>` : '<span class="muted">–</span>') },
      ...H.map((p) => ({ label: p, sub: PLANT_NAME[p] || '', title: plantLabel(p), group: `WK ${plantWK(p)} (${plantWK(p) === 'PHE' ? '180' : '100'})`, num: true, filter: false,
        get: (o) => (o.stock.has(p) || o.mrp.has(p) ? o.stock.get(p) || 0 : null), html: (o) => qtyCell(o.stock.has(p) || o.mrp.has(p) ? o.stock.get(p) || 0 : null, o.mrp.get(p)) })),
      { label: 'Plant lain', num: true, filter: false, hide: S.cariWK === 'all', get: (o) => { const v = [...o.stock].filter(([p]) => !H.includes(p)).reduce((a, [, q]) => a + q, 0); return v || null; },
        html: (o) => { const ot = [...o.stock].filter(([p, q]) => !H.includes(p) && q > 0); return ot.length ? `<span title="${esc(ot.map(([p, q]) => `${plantLabel(p)}: ${fmt(q)}`).join('\n'))}">${fmt(ot.reduce((a, [, q]) => a + q, 0))}</span><span class="k-s">${ot.length} plant</span>` : ''; } },
      { label: 'Pakai', sub: '12 bulan', num: true, filter: false, w: 1.05, get: (o) => o.use12, html: (o) => (o.use12 == null ? '' : fmt(o.use12, 0)) },
      { label: 'Order', sub: 'MRP', num: true, filter: false, w: 0.95, get: (o) => ordOf(o) || null, html: (o) => (ordOf(o) ? `<b>${fmt(ordOf(o))}</b>` : '') },
      { label: 'Status', nowrap: true, w: 1.35, get: (o) => st.get(o), html: (o) => `<span class="st ${statusCls(st.get(o))}">${esc(st.get(o))}</span>` },
      { label: 'WK', get: (o) => [...o.wk].join(', '), hide: true },
    ];
    $('view').innerHTML = srcLine('mb52', 'mrp') + `<p class="legend-line"><span>Angka = stok per plant (MB52)</span><span class="q-low">Merah = di bawah Min</span><span>Klik baris untuk analisis material</span></p><div id="mx"></div>`;
    UI.table($('mx'), { id: 'cari-mx3-' + S.cariWK, rows, cols, name: 'Cari Material', match: (o, q) => hit(o.material + ' ' + o.desc, expand(q)), sort: { i: cols.findIndex((c) => c.label === 'Pakai'), dir: -1 },
      placeholder: 'Cari deskripsi atau kode material… (mis. packer 7, laker)', rowKey: (o) => o.material, onRow: openMaterial });
  };

  // ---------- Analisis Material (panel) ----------
  function openMaterial(m) {
    const mi = matIndex(), o = mi.map.get(m);
    if (!o) { UI.drawer(`<div class="d-head"><h2>${esc(m)}</h2></div><div class="d-sec">Material tidak ada di MB52 maupun file MRP yang dimuat.</div>`); return; }
    const uom = o.uom || '', H = homePlants();
    const mrpRows = [...o.mrp.values()].sort((a, b) => a.plant.localeCompare(b.plant));
    const amu = mrpRows.filter((r) => H.includes(r.plant)).reduce((a, r) => a + (r.amu || 0), 0);
    const homeStock = H.reduce((a, p) => a + (o.stock.get(p) || 0), 0);
    const kItems = S.me3n ? S.me3n.items.filter((i) => i.material === m) : [];
    const poOpen = S.me2n ? S.me2n.lines.filter((l) => l.material === m && l.openQty > 0 && !l.deleted) : [];
    const resv = S.mb25 ? S.mb25.lines.filter((l) => l.material === m && !l.finalIssue && l.diff > 0) : [];
    const moves = S.mb51 ? S.mb51.moves.filter((x) => x.material === m).sort((a, b) => (b.date || 0) - (a.date || 0)).slice(0, 12) : [];
    const lp = S.me2n && S.me2n.lastPrice.get(m);
    const mvtMap = new Map(); (S.mb51 ? S.mb51.moves.filter((x) => x.material === m) : []).forEach((x) => { const c = x.cat || 'Tanpa kategori'; const g = mvtMap.get(c) || mvtMap.set(c, { cat: c, qty: 0, n: 0, p: new Set(), k: new Set() }).get(c); g.qty += x.qty; g.n++; g.p.add(x.plant); g.k.add(x.mkey || x.mt); });
    const mvtSum = [...mvtMap.values()].map((g) => ({ cat: g.cat, qty: g.qty, n: g.n, plants: [...g.p].sort().join(', '), keys: [...g.k].sort().join(', ') })).sort((a, b) => b.n - a.n);
    // rekomendasi
    const reco = [];
    mrpRows.filter((r) => S.mrpPlants.has(r.plant) && r.toOrder > 0).forEach((r) => {
      const sameWK = (p) => wkOfPlant(p) === wkOfPlant(r.plant);
      const otherWK = [...o.stock].filter(([p, q]) => !sameWK(p) && q > 0);
      const donors = [...o.stock].filter(([p, q]) => p !== r.plant && q > 0 && sameWK(p)).map(([p, q]) => { const rr = o.mrp.get(p); const spare = rr && S.mrpPlants.has(p) && rr.max2 != null ? Math.max(0, q - Math.max(rr.max2, rr.min2 || 0)) : q; return { p, spare, mrp: !!(rr && S.mrpPlants.has(p)) }; }).filter((d) => d.spare > 0);
      let t = `<b>${esc(plantLabel(r.plant))}</b> perlu ${fmt(r.toOrder)} ${esc(uom)} (stok ${fmt(r.stock)}, PO berjalan ${fmt(r.ospo)}, Min ${fmt(r.min2)}).`;
      if (donors.length) t += ` Cek dulu stok di ${donors.map((d) => `${esc(plantLabel(d.p))} (${fmt(d.spare)}${d.mrp ? ' di atas Max' : ''})`).join(', ')} untuk transfer.`;
      if (otherWK.length) t += ` Ada juga stok di WK lain (${otherWK.map(([p, q]) => `${esc(p)} ${fmt(q)}`).join(', ')}), tapi beda company code, jadi harus lewat MTA.`;
      t += r.contract ? ` Kalau tidak bisa ditransfer, terbitkan RO lewat OA ${esc(r.contract.doc)} (${esc(r.contract.vendor)}, ${money(r.contract.price, r.contract.currency)}/unit).` : ` Belum ada kontrak aktif, jadi buat PR + OE${lp ? ` (harga PO terakhir ${money(lp.price, lp.currency)})` : ''}.`;
      reco.push([donors.length ? 'warn' : 'bad', t]);
      if (r.contract && r.contract.sisaHari != null && r.contract.sisaHari <= 90) reco.push(['warn', `Kontrak OA ${esc(r.contract.doc)} habis dalam ${fmt(r.contract.sisaHari, 0)} hari. Siapkan perpanjangan atau amandemen.`]);
    });
    mrpRows.filter((r) => r.berlebih && r.stock > 0).forEach((r) => reco.push(['warn', `<b>${esc(plantLabel(r.plant))}</b> berlebih: stok ${fmt(r.stock)} ${esc(uom)} setara ${fmt(r.cover, 1)} bulan pemakaian. Tawarkan ke plant yang membutuhkan, jangan dipesan ulang.`]));
    mrpRows.filter((r) => r.aging === 'DS' && r.stock > 0 && !r.histShort).forEach((r) => reco.push(['bad', `<b>${esc(plantLabel(r.plant))}</b>: tidak ada pemakaian lebih dari 5 tahun. Kandidat dead stock, cek prospek pemakaian dan peralatan induknya.`]));
    if (!mrpRows.length) reco.push(['', 'Material ini tidak ada di file MRP, jadi Min/Max belum dihitung. Kalau rutin dipakai, ajukan jadi stock item.']);
    if (!reco.length) reco.push(['ok', 'Tidak ada tindakan: stok di plant yang dipantau MRP masih di antara Min dan Max.']);

    const cover = amu > 0 ? homeStock / amu : null;
    const body = UI.drawer(`
      <div class="d-head"><h2>${esc(o.desc || m)}</h2><div class="meta"><span>${esc(m)}</span><span>${esc(uom)}</span>${o.mg ? `<span>MG ${esc(o.mg.mg)} ${esc(o.mg.mgName)}</span>` : `<span>${esc(o.kel)}</span>`}${o.wk.size ? `<span>WK ${esc([...o.wk].join(', '))}</span>` : ''}${o.aging ? agingPill(o.aging) : ''}${pill(o.status, statusCls(o.status))}</div></div>
      <div class="kv"><div><span>Stok semua plant</span><b>${fmt(o.total)}</b></div><div><span>Nilai stok</span><b>${money(o.valueIDR, 'IDR')}</b></div><div><span>AMU (plant MRP)</span><b>${fmt(amu, 1)}</b></div>
        <div><span>Cakupan stok</span><b>${cover == null ? '–' : fmt(cover, 1) + ' bln'}</b></div><div><span>Perlu order</span><b>${fmt(o.toOrder || 0)}</b></div></div>
      <section class="d-sec"><h3>Rekomendasi</h3><ul class="reco">${reco.map(([c, t]) => `<li class="${c}"><span>${t}</span></li>`).join('')}</ul></section>
      <section class="d-sec"><h3>Stok per plant <small>MB52</small></h3>${plainTable(o.items.slice().sort((a, b) => b.soh - a.soh), [['Plant', (i) => esc(plantLabel(i.plant))], ['WK', (i) => esc(i.wk || '')], ['Zona', (i) => esc(zonaOf(i.plant))],
        ['Lokasi', (i) => esc(i.locs.map((l) => l.sloc + (l.batch ? '/' + l.batch : '')).join(', '))], ['Stok', (i) => fmt(i.soh) + ' ' + esc(i.uom), 'num'], ['Nilai', (i) => money(i.value, stockCur(i.plant)), 'num']])}</section>
      ${o.useWK ? Object.keys(o.useWK).map((w) => `<section class="d-sec"><h3>Pemakaian bulanan WK ${w} <small>${w === 'PEP' ? '24 bulan terakhir, dari file MRP' : 'dari MB51 (Own Use + Return)'}</small></h3><div class="dUse" data-w="${w}"></div></section>`).join('') : ''}
      ${mvtSum.length ? `<section class="d-sec"><h3>Gerakan per kategori Mvt <small>MB51 ${S.mb51 && S.mb51.range ? dstr(S.mb51.range[0]) + ' s.d. ' + dstr(S.mb51.range[1]) : ''}</small></h3>${plainTable(mvtSum, [['Kategori', (x) => esc(x.cat)], ['Plant', (x) => esc(x.plants)], ['Kunci Mvt', (x) => `<span class="muted small">${esc(x.keys)}</span>`], ['Qty', (x) => fmt(x.qty) + ' ' + esc(uom), 'num'], ['Gerakan', (x) => fmt(x.n, 0), 'num']])}</section>` : ''}
      ${mrpRows.length ? `<section class="d-sec"><h3>Parameter MRP <small>metode ${esc(S.set.method === 'tko' ? 'TKO/Pedoman' : 'Excel lama')}</small></h3>${plainTable(mrpRows, [['Plant', (r) => esc(r.plant) + (S.mrpPlants.has(r.plant) ? '' : ' <span class="muted small">tidak dipantau</span>')], ['Aging', (r) => agingPill(r.aging)],
        ['Kelas', (r) => esc(r.cls || '')], ['AMU', (r) => fmt(r.amu, 2), 'num'], ['LT', (r) => (r.tEff != null ? fmt(r.tEff, 1) : fmt(r.lt, 1)), 'num'], ['SS', (r) => fmt(r.ss), 'num'], ['Min', (r) => fmt(r.min2), 'num'], ['Max', (r) => fmt(r.max2), 'num'],
        ['OS PO', (r) => fmt(r.ospo), 'num'], ['Reservasi', (r) => fmt(r.mb25), 'num'], ['To Order', (r) => (r.toOrder ? `<b>${fmt(r.toOrder)}</b>` : '0'), 'num']])}</section>` : ''}
      ${kItems.length ? `<section class="d-sec"><h3>Kontrak <small>ME3N</small></h3>${plainTable(kItems, [['OA', (i) => `<a href="#" class="oalink" data-oa="${esc(i.doc)}">${esc(i.doc)}</a>${o.contract && o.contract.doc === i.doc ? ' <span class="pill info">dipakai</span>' : ''}`], ['Vendor', (i) => esc(i.k.vendor)],
        ['Harga', (i) => money(i.price, i.k.currency), 'num'], ['Berakhir', (i) => dstr(i.k.end)], ['Sisa hari', (i) => fmt(i.k.sisaHari, 0), 'num'], ['Sisa nilai', (i) => money(i.k.sisa, i.k.currency), 'num']])}</section>` : ''}
      ${poOpen.length ? `<section class="d-sec"><h3>PO/RO berjalan <small>ME2N</small></h3>${plainTable(poOpen, [['Dokumen', (l) => `${esc(l.doc)} <span class="muted small">${esc(l.type)}</span>`], ['Plant', (l) => esc(l.plant)], ['Vendor', (l) => esc(l.vendor)], ['Sisa kirim', (l) => fmt(l.openQty), 'num'], ['Jadwal', (l) => dstr(l.delivery)], ['Status', (l) => (l.lateDays ? pill('Terlambat ' + l.lateDays + ' hari', 'low') : pill('Dalam pengiriman', 'info'))]])}</section>` : ''}
      ${resv.length ? `<section class="d-sec"><h3>Reservasi terbuka <small>MB25</small></h3>${plainTable(resv, [['Reservasi', (l) => esc(l.resv)], ['Plant', (l) => esc(l.plant)], ['Butuh', (l) => dstr(l.reqDate)], ['Sisa', (l) => fmt(l.diff), 'num'], ['Penerima', (l) => esc(l.recipient || l.costCenter || l.wbs)]])}</section>` : ''}
      ${moves.length ? `<section class="d-sec"><h3>Gerakan terakhir <small>MB51</small></h3>${plainTable(moves, [['Tanggal', (x) => dstr(x.date)], ['Plant', (x) => esc(x.plant)], ['Gerakan', (x) => esc(x.mt + ' ' + x.mtText)], ['Qty', (x) => fmt(x.qty), 'num'], ['Keterangan', (x) => esc(x.header || x.po || '')]])}</section>` : ''}
      <div><a class="btn" href="#/lacak" id="dTrace">Lihat jejak lengkap</a></div>`, { label: 'Analisis material' });
    body.querySelectorAll('.dUse').forEach((el) => { const w = el.dataset.w, u = o.useWK[w], L = mi.labels[w];
      UI.columns(el, L.slice(-24).map((l) => { const [y, mm] = l.split('-'); return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][+mm - 1] + ' 20' + y; }), u.slice(-24), (v) => fmt(v, 1) + ' ' + uom); });
    body.querySelector('#dTrace').onclick = () => { sessionStorage.setItem('lacakQ', m); UI.closeDrawer(); };
    body.querySelectorAll('.oalink').forEach((a) => (a.onclick = (e) => { e.preventDefault(); openContract(a.dataset.oa); }));
  }

  // ---------- Kontrak: kartu ----------
  const tableKontrak = PAGES.kontrak;
  PAGES.kontrak = function () {
    if (!S.me3n) { $('view').innerHTML = needFile('file kontrak ME3N', 'Tambahkan download ME3N (WK PEP dan PHE), dan ME2N untuk PO/RO, di Data SAP atau di folder data.'); return; }
    $('pageActions').innerHTML = '<span id="vSeg"></span>';
    UI.seg($('vSeg'), [['kartu', 'Kartu'], ['tabel', 'Tabel']], S.kView, (v) => { S.kView = v; store.set('kView', v); route(); });
    if (S.kView === 'tabel') return tableKontrak();
    const F = S.kf || (S.kf = { q: '', st: new Set(), pg: new Set(), wk: new Set(), kel: new Set(), sort: 'hari', n: 60, allKel: false });
    const usedBy = new Map(); if (S.mrpRes) for (const r of S.mrpRes.values()) if (r.contract) usedBy.set(r.contract.doc, (usedBy.get(r.contract.doc) || 0) + 1);
    const stOf = (d) => { const a = []; if (d.sisaHari != null && d.sisaHari < 0) a.push('Berakhir'); else if (d.sisaHari != null && d.sisaHari <= 90) a.push('Habis ≤ 90 hari'); else if (d.sisaHari != null && d.sisaHari <= 180) a.push('Habis ≤ 180 hari'); if (d.pctSisa < 0.2) a.push('Sisa nilai < 20%'); return a.length ? a : ['Aman']; };
    const all = [...S.me3n.docs.values()];
    $('view').innerHTML = srcLine('me3n', 'me2n') + `<div class="filters"><label class="dt-search">${UI.I.search}<input type="search" id="kq" placeholder="Cari No. OA, vendor, atau material…" value="${esc(F.q)}"></label>
        <span id="kKelF"></span><span id="kSt"></span><span id="kPg"></span><span id="kWk"></span>
        <label class="select"><span class="select-k">Urut</span><select id="kSort" class="bare">${[['hari', 'Sisa hari'], ['nilai', 'Sisa nilai (%)'], ['pakai', 'Dipakai MRP'], ['oa', 'No. OA']].map(([v, l]) => `<option value="${v}" ${F.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <section class="panel"><div class="panel-h"><h2>Ringkasan kelompok barang</h2><span class="sub">Kelompok dibaca dari deskripsi item ME3N. Klik baris untuk menyaring kartu.</span></div><div id="kKel"></div></section>
      <p class="source" id="kCount"></p><div class="oa-grid" id="kGrid"></div><div class="more" id="kMore"></div>`;
    // ringkasan per kelompok barang (kontrak dihitung pada kelompok utamanya)
    const kelRows = (() => {
      const m = new Map();
      all.forEach((d) => { const k = d.kel || 'Lainnya'; const g = m.get(k) || m.set(k, { kel: k, n: 0, aktif: 0, soon: 0, items: 0, sisa: {}, end: null, used: 0 }).get(k);
        g.n++; g.items += d.items || 0; g.used += usedBy.get(d.doc) || 0; const act = d.sisaHari == null || d.sisaHari >= 0; if (act) { g.aktif++; g.sisa[d.currency || 'IDR'] = (g.sisa[d.currency || 'IDR'] || 0) + (d.sisa || 0); }
        if (d.sisaHari != null && d.sisaHari >= 0 && d.sisaHari <= 90) g.soon++; if (act && d.end && (!g.end || d.end < g.end)) g.end = d.end; });
      return [...m.values()].sort((a, b) => (a.kel === 'Lainnya') - (b.kel === 'Lainnya') || b.n - a.n);
    })();
    const drawKel = () => {
      const vis = F.allKel ? kelRows : kelRows.slice(0, 8);
      $('kKel').innerHTML = `<div class="plain-wrap"><table class="plain kel-t"><tr><th>Kelompok barang</th><th class="num">Kontrak</th><th class="num">Aktif</th><th class="num">Habis ≤ 90 hari</th><th class="num">Item</th><th class="num">Dipakai MRP</th><th class="num">Sisa nilai kontrak aktif</th><th>Berakhir paling cepat</th></tr>` +
        vis.map((g) => `<tr class="clickable${F.kel.has(g.kel) ? ' on' : ''}" data-kel="${esc(g.kel)}"><td><b>${esc(g.kel)}</b></td><td class="num">${fmt(g.n, 0)}</td><td class="num">${fmt(g.aktif, 0)}</td><td class="num">${g.soon ? `<span class="q-low">${fmt(g.soon, 0)}</span>` : '0'}</td>
          <td class="num">${fmt(g.items, 0)}</td><td class="num">${fmt(g.used, 0)}</td><td class="num">${Object.entries(g.sisa).sort().map(([c, v]) => money(v, c)).join('<br>') || '–'}</td><td>${dstr(g.end)}</td></tr>`).join('') + '</table></div>' +
        (kelRows.length > 8 ? `<button class="btn ghost" id="kKelAll" style="margin-top:8px">${F.allKel ? 'Ringkas' : `Tampilkan semua ${kelRows.length} kelompok`}</button>` : '');
      $('kKel').querySelectorAll('tr[data-kel]').forEach((tr) => (tr.onclick = () => { const k = tr.dataset.kel; F.kel.has(k) ? F.kel.delete(k) : F.kel.add(k); F.n = 60; drawKel(); kelMulti(); draw(); }));
      if ($('kKelAll')) $('kKelAll').onclick = () => { F.allKel = !F.allKel; drawKel(); };
    };
    const kelMulti = () => UI.multi($('kKelF'), { label: 'Kelompok', options: kelRows.map((g) => ({ value: g.kel, label: g.kel })), selected: F.kel, onChange: () => { F.n = 60; drawKel(); draw(); } });
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
          ${st[0] !== 'Aman' && st.some((x) => x.startsWith('Sisa')) ? `<span class="small" style="color:var(--warn)">Sisa nilai di bawah 20%</span>` : ''}</button>`;
      }).join('') || '<div class="panel empty"><h3>Tidak ada kontrak yang cocok</h3><p>Ubah kata kunci atau filter.</p></div>';
      $('kMore').innerHTML = list.length > F.n ? `<button class="btn" id="kMoreB">Tampilkan ${Math.min(60, list.length - F.n)} lagi</button>` : '';
      if ($('kMoreB')) $('kMoreB').onclick = () => { F.n += 60; draw(); };
      document.querySelectorAll('.oa-card').forEach((c) => (c.onclick = () => openContract(c.dataset.oa)));
    };
    let t; $('kq').oninput = (e) => { clearTimeout(t); t = setTimeout(() => { F.q = e.target.value; F.n = 60; draw(); }, 200); };
    $('kSort').onchange = (e) => { F.sort = e.target.value; draw(); };
    const later = () => { F.n = 60; draw(); };
    drawKel(); kelMulti();
    UI.multi($('kSt'), { label: 'Status', options: ['Aman', 'Habis ≤ 90 hari', 'Habis ≤ 180 hari', 'Sisa nilai < 20%', 'Berakhir'].map((v) => ({ value: v, label: v })), selected: F.st, onChange: later });
    UI.multi($('kPg'), { label: 'Purch. group', options: [...new Set(all.map((d) => d.pg))].sort().map((v) => ({ value: v, label: `${v} ${Contract.PIC[v] || ''}`.trim() })), selected: F.pg, onChange: later });
    UI.multi($('kWk'), { label: 'WK', options: [...new Set(all.map((d) => d.wk))].sort().map((v) => ({ value: v, label: 'WK ' + v })), selected: F.wk, onChange: later });
    draw();
  };

  function openContract(doc) {
    const d = S.me3n && S.me3n.docs.get(doc); if (!d) return;
    const items = S.me3n.items.filter((i) => i.doc === doc);
    const ro = S.me2n ? S.me2n.lines.filter((l) => l.oa === doc && !l.deleted && l.openQty > 0) : [];
    const plan = S.mrpRes ? [...S.mrpRes.values()].filter((r) => r.contract && r.contract.doc === doc && r.toOrder > 0 && S.mrpPlants.has(r.plant)) : [];
    const used = d.target ? Math.min(100, Math.max(0, (1 - d.sisa / d.target) * 100)) : 0;
    const body = UI.drawer(`<div class="d-head"><h2>${esc(d.vendor)}</h2><div class="meta"><span>OA ${esc(doc)}</span><span>WK ${esc(d.wk || '')}</span><span>${esc((d.kels || [d.kel]).join(', '))}</span><span>PG ${esc(d.pg)} ${esc(d.pic)}</span><span>${dstr(d.start)} s.d. ${dstr(d.end)}</span></div></div>
      <div class="kv"><div><span>Nilai kontrak</span><b>${money(d.target, d.currency)}</b></div><div><span>Terpakai</span><b>${money(d.released, d.currency)}</b></div><div><span>Sisa</span><b>${money(d.sisa, d.currency)}</b></div><div><span>Sisa hari</span><b>${d.sisaHari == null ? '–' : fmt(d.sisaHari, 0)}</b></div></div>
      <div class="progress" title="Terpakai ${fmt(used, 0)}%"><i style="width:${used.toFixed(1)}%"></i></div>
      ${plan.length ? `<section class="d-sec"><h3>Rencana RO dari MRP <small>${plan.length} material perlu order</small></h3>${plainTable(plan, [['Plant', (r) => esc(r.plant)], ['Material', (r) => `<a href="#" class="mlink" data-mat="${esc(r.material)}">${esc(r.material)}</a>`], ['Deskripsi', (r) => esc(r.desc)], ['Qty', (r) => fmt(r.toOrder), 'num'], ['Nilai', (r) => money(r.toOrder * r.contract.price, r.contract.currency), 'num']])}</section>` : ''}
      <section class="d-sec"><h3>Item kontrak <small>${items.length} item</small></h3>${plainTable(items, [['Item', (i) => esc(i.item)], ['Material', (i) => `<a href="#" class="mlink" data-mat="${esc(i.material)}">${esc(i.material)}</a>`], ['Deskripsi', (i) => esc(i.desc)], ['Kelompok', (i) => esc(i.kel || '')], ['UoM', (i) => esc(i.uom)],
        ['Harga', (i) => money(i.price, d.currency), 'num'], ['Target qty', (i) => fmt(i.targetQty), 'num'], ['Terpakai qty', (i) => fmt(i.releasedQty), 'num']])}</section>
      ${ro.length ? `<section class="d-sec"><h3>RO berjalan <small>ME2N</small></h3>${plainTable(ro, [['RO', (l) => esc(l.doc)], ['Plant', (l) => esc(l.plant)], ['Material', (l) => esc(l.material)], ['Sisa kirim', (l) => fmt(l.openQty), 'num'], ['Jadwal', (l) => dstr(l.delivery)], ['Status', (l) => (l.lateDays ? pill('Terlambat ' + l.lateDays + ' hari', 'low') : pill('Dalam pengiriman', 'info'))]])}</section>` : ''}`, { label: 'Detail kontrak' });
    body.querySelectorAll('.mlink').forEach((a) => (a.onclick = (e) => { e.preventDefault(); openMaterial(a.dataset.mat); }));
  }

  // tautan material di mana pun → buka analisis material
  document.addEventListener('click', (e) => { const a = e.target.closest('.mlink'); if (a && !a.closest('.drawer')) { e.preventDefault(); openMaterial(a.dataset.mat); } });
  window.openMaterial = openMaterial; window.openContract = openContract;
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
  const CAT_I = new Map(CAT.map(([c], i) => [c, i])), CAT_D = new Map(CAT);
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

  PAGES.gerak = function () {
    if (!S.mb51) { $('view').innerHTML = needFile('file MB51', 'Pergerakan material dibaca dari MB51. Taruh semua file MB51 (misalnya per bulan) di folder data: web menggabungkannya dan membuang baris yang dobel.'); return; }
    const D = prep();
    const G = S.gf || (S.gf = { from: '', to: '', wk: new Set(), plant: new Set(), cat: new Set(), q: '', ni: false, tab: 'ringkas', flow: '', dim: 'cat', meas: 'idr' });
    if (!D.months.includes(G.to)) G.to = D.months[D.months.length - 1] || '';
    if (!D.months.includes(G.from)) G.from = D.months[Math.max(0, D.months.indexOf(G.to) - 11)] || ''; // bawaan: 12 bulan terakhir
    const plants = [...new Set(D.moves.map((x) => x.m.plant))].sort();
    const unk = new Map(); D.moves.forEach((x) => { if (!x.cat) unk.set(x.m.mkey, (unk.get(x.m.mkey) || 0) + 1); });
    const opt = (v, sel) => `<option value="${v}"${v === sel ? ' selected' : ''}>${ymLabel(v)}</option>`;
    $('view').innerHTML = `${srcLine('mb51', 'me2n')}
      ${unk.size ? `<div class="banner warn"><span>Ada ${fmt([...unk.values()].reduce((a, b) => a + b, 0), 0)} gerakan dengan kunci Mvt yang belum ada di tabel referensi: ${esc([...unk].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} (${n})`).join(', '))}. Kirim kategorinya supaya bisa ditambahkan.</span></div>` : ''}
      <div class="filters"><label class="select"><span>Dari</span><select class="bare" id="gFrom">${D.months.map((m) => opt(m, G.from)).join('')}</select></label>
        <label class="select"><span>Sampai</span><select class="bare" id="gTo">${D.months.map((m) => opt(m, G.to)).join('')}</select></label>
        <span id="gWK"></span><span id="gPl"></span><span id="gCat"></span>
        <label class="chk"><input type="checkbox" id="gNI"${G.ni ? ' checked' : ''}> Tampilkan juga gerakan yang tidak dihitung</label></div>
      <div class="tabs" role="tablist" id="gTabs"></div><p class="tab-note" id="gNote"></p><div id="gBody"></div>`;
    const redraw = () => draw(D);
    $('gFrom').onchange = (e) => { G.from = e.target.value; if (G.to < G.from) G.to = G.from; route(); };
    $('gTo').onchange = (e) => { G.to = e.target.value; if (G.from > G.to) G.from = G.to; route(); };
    $('gNI').onchange = (e) => { G.ni = e.target.checked; redraw(); };
    const wks = [...new Set(D.moves.map((x) => x.m.wk))].sort();
    if (wks.length > 1) UI.multi($('gWK'), { label: 'WK', options: wks.map((w) => ({ value: w, label: 'WK ' + w })), selected: G.wk, onChange: redraw });
    UI.multi($('gPl'), { label: 'Plant', options: plants.map((p) => ({ value: p, label: plantLabel(p) })), selected: G.plant, onChange: redraw });
    UI.multi($('gCat'), { label: 'Kategori', options: CAT.map(([c]) => ({ value: c, label: catName(c) })), selected: G.cat, onChange: redraw });
    redraw();
  };

  function draw(D) {
    const G = S.gf;
    const base = D.moves.filter((x) => x.month >= G.from && x.month <= G.to && (!G.wk.size || G.wk.has(x.m.wk)) && (!G.plant.size || G.plant.has(x.m.plant))
      && (!G.cat.size || G.cat.has(x.cat)) && (G.ni || x.cat !== 'Not Included' || G.cat.has('Not Included')));
    const TABS = [['ringkas', 'Ringkasan per kategori'], ['alur', 'Alur dari → ke'], ['rekap', 'Rekap bulanan'], ['detail', 'Detail gerakan'], ['aturan', 'Aturan MvT']];
    $('gTabs').innerHTML = TABS.map(([k, t]) => `<button class="tab ${k === G.tab ? 'on' : ''}" data-t="${k}">${t}</button>`).join('');
    $('gTabs').querySelectorAll('.tab').forEach((b) => (b.onclick = () => { G.tab = b.dataset.t; draw(D); }));
    const body = $('gBody'), note = $('gNote');
    const nMat = (xs) => new Set(xs.map((x) => x.m.material)).size;
    const idr = (v) => money(v, 'IDR');

    if (G.tab === 'ringkas') {
      note.innerHTML = `${fmt(base.length, 0)} gerakan, ${ymLabel(G.from)} s.d. ${ymLabel(G.to)}. Nilai = Amount in LC (USD dikonversi ke IDR). Klik baris untuk melihat detailnya.`;
      const g = new Map(); base.forEach((x) => { const o = g.get(x.cat) || g.set(x.cat, { cat: x.cat, xs: [], keys: new Set(), inQ: 0, outQ: 0 }).get(x.cat); o.xs.push(x); o.keys.add(x.m.mkey); x.m.qty > 0 ? o.inQ++ : o.outQ++; });
      const rows = [...g.values()].sort((a, b) => (CAT_I.get(a.cat) ?? 99) - (CAT_I.get(b.cat) ?? 99));
      UI.table(body, { id: 'gerak-ringkas2', rows, name: 'Ringkasan pergerakan', rowKey: (o) => o.cat || '-', onRow: (k) => { G.cat = new Set([k === '-' ? '' : k]); G.tab = 'detail'; route(); }, cols: [
        { label: 'Kategori', get: (o) => catName(o.cat), html: (o) => `<b>${esc(catName(o.cat))}</b>` },
        { label: 'Keterangan', wide: true, get: (o) => CAT_D.get(o.cat) || '' },
        { label: 'Arah', get: (o) => (o.inQ && o.outQ ? 'Masuk & keluar' : o.inQ ? 'Masuk' : 'Keluar') },
        { label: 'Gerakan', num: true, filter: false, get: (o) => o.xs.length, html: (o) => fmt(o.xs.length, 0) },
        { label: 'Material', num: true, filter: false, get: (o) => nMat(o.xs), html: (o) => fmt(nMat(o.xs), 0) },
        { label: 'Plant', num: true, filter: false, get: (o) => new Set(o.xs.map((x) => x.m.plant)).size, html: (o) => fmt(new Set(o.xs.map((x) => x.m.plant)).size, 0) },
        { label: 'Nilai', num: true, filter: false, get: (o) => o.xs.reduce((a, x) => a + x.idr, 0), html: (o) => idr(o.xs.reduce((a, x) => a + x.idr, 0)) },
        { label: 'Kunci Mvt', hide: true, get: (o) => [...o.keys].sort().join(', '), html: (o) => `<span class="muted small">${esc([...o.keys].sort().join(', '))}</span>` },
      ] });
    } else if (G.tab === 'alur') {
      note.innerHTML = 'Asal dan tujuan disimpulkan dari MB51: transfer antar plant dipasangkan lewat Material Document yang sama (baris minus = plant asal, plus = plant tujuan); vendor diambil dari ME2N lewat nomor PO; MTA, BAU, dan Own Use dari kategori Mvt. Klik baris untuk melihat gerakannya.';
      const g = new Map(); base.forEach((x) => { const k = x.from + '→' + x.to + '→' + x.cat; const o = g.get(k) || g.set(k, { k, from: x.from, to: x.to, cat: x.cat, xs: [], last: null }).get(k); o.xs.push(x); if (x.m.date && (!o.last || x.m.date > o.last)) o.last = x.m.date; });
      const rows = [...g.values()];
      UI.table(body, { id: 'gerak-alur', rows, name: 'Alur pergerakan', sort: { i: 5, dir: -1 }, rowKey: (o) => o.k, onRow: (k) => { G.flow = k; G.tab = 'detail'; draw(D); },
        match: (o, q) => hit(o.from + ' ' + o.to + ' ' + o.cat, expand(q)), placeholder: 'Cari plant, vendor, atau kategori…', cols: [
        { label: 'Dari', get: (o) => o.from }, { label: 'Ke', get: (o) => o.to }, { label: 'Kategori', get: (o) => catName(o.cat) },
        { label: 'Gerakan', num: true, filter: false, get: (o) => o.xs.length, html: (o) => fmt(o.xs.length, 0) },
        { label: 'Material', num: true, filter: false, get: (o) => nMat(o.xs), html: (o) => fmt(nMat(o.xs), 0) },
        { label: 'Nilai', num: true, filter: false, get: (o) => o.xs.reduce((a, x) => a + x.idr, 0), html: (o) => idr(o.xs.reduce((a, x) => a + x.idr, 0)) },
        { label: 'Terakhir', get: (o) => o.last, html: (o) => dstr(o.last), filter: false },
      ] });
    } else if (G.tab === 'rekap') {
      note.innerHTML = '<span class="rk-bar"><span id="gDim"></span><span id="gMeas"></span><span class="muted">Nilai dalam IDR (rb = ribu, jt = juta, M = miliar).</span></span>';
      const months = D.months.filter((m) => m >= G.from && m <= G.to);
      const DIM = { cat: (x) => catName(x.cat), plant: (x) => plantLabel(x.m.plant), pc: (x) => plantLabel(x.m.plant) + '|' + catName(x.cat), mat: (x) => x.m.material + '|' + x.m.desc + '|' + x.m.uom };
      const val = G.meas === 'n' ? () => 1 : G.meas === 'qty' ? (x) => x.m.qty : (x) => x.idr;
      const g = new Map(); base.forEach((x) => { const k = DIM[G.dim](x); const o = g.get(k) || g.set(k, { k, by: {}, t: 0 }).get(k); const v = val(x); o.by[x.month] = (o.by[x.month] || 0) + v; o.t += v; });
      const short = (v) => { const a = Math.abs(v); return a >= 1e12 ? fmt(v / 1e12, 1) + ' T' : a >= 1e9 ? fmt(v / 1e9, 1) + ' M' : a >= 1e6 ? fmt(v / 1e6, 1) + ' jt' : a >= 1e3 ? fmt(v / 1e3, 0) + ' rb' : fmt(v, 0); };
      const show = (v) => (!v ? '' : G.meas === 'idr' ? short(v) : fmt(v, G.meas === 'n' ? 0 : 2));
      const keyCols = G.dim === 'pc' ? [{ label: 'Plant', w: 1.5, get: (o) => o.k.split('|')[0] }, { label: 'Kategori', w: 1.2, get: (o) => o.k.split('|')[1] }]
        : G.dim === 'mat' ? [{ label: 'Material', nowrap: true, get: (o) => o.k.split('|')[0], html: (o) => `<a class="mono mlink" href="#" data-mat="${esc(o.k.split('|')[0])}">${esc(o.k.split('|')[0])}</a>` }, { label: 'Deskripsi', wide: true, get: (o) => o.k.split('|')[1] }, { label: 'UoM', get: (o) => o.k.split('|')[2] }]
        : [{ label: G.dim === 'cat' ? 'Kategori' : 'Plant', w: 1.6, get: (o) => o.k }];
      UI.table(body, { id: 'gerak-rekap-' + G.dim + '-' + months.length, rows: [...g.values()], name: 'Rekap pergerakan bulanan', sort: { i: keyCols.length + months.length, dir: -1 }, cols: keyCols.concat(
        months.map((mo) => ({ label: ymLabel(mo), num: true, filter: false, get: (o) => o.by[mo] || 0, html: (o) => show(o.by[mo]) })),
        [{ label: 'Total', num: true, filter: false, get: (o) => o.t, html: (o) => `<b>${show(o.t)}</b>` }]) });
      UI.seg($('gDim'), [['cat', 'Per kategori'], ['plant', 'Per plant'], ['pc', 'Plant × kategori'], ['mat', 'Per material']], G.dim, (v) => { G.dim = v; draw(D); });
      UI.seg($('gMeas'), [['idr', 'Nilai'], ['n', 'Jumlah gerakan']].concat(G.dim === 'mat' ? [['qty', 'Qty']] : []), G.meas === 'qty' && G.dim !== 'mat' ? 'idr' : G.meas, (v) => { G.meas = v; draw(D); });
    } else if (G.tab === 'aturan') {
      note.innerHTML = 'Cara web mengklasifikasikan setiap baris MB51. Kunci = Movement Type + tanda qty; khusus penerimaan (101–106) dibedakan menurut 2 digit awal No. PO: 42 = STO (BAU), 94 = MTA, 92 = jenis khusus. Kolom "Optimasi DS" menunjukkan Mvt yang dihitung di laporan optimasi DS. Tabel dikoreksi mengikuti arti Movement Type di SAP; kolom terakhir menjelaskan bedanya dengan tabel lama.';
      const used = new Map(); D.moves.forEach((x) => used.set(x.m.mkey, (used.get(x.m.mkey) || 0) + 1));
      UI.table(body, { id: 'gerak-aturan', rows: Master.MVT_TABLE, name: 'Aturan MvT', placeholder: 'Cari Mvt, kategori, atau penjelasan…', match: (r, q) => hit(r.join(' '), expand(q)), cols: [
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
    } else {
      const fl = G.flow && base.filter((x) => x.from + '→' + x.to + '→' + x.cat === G.flow);
      const rows = (fl || base).slice().sort((a, b) => (b.m.date || 0) - (a.m.date || 0));
      note.innerHTML = G.flow ? `Alur <b>${esc(G.flow.split('→').slice(0, 2).join(' → '))}</b> (${esc(catName(G.flow.split('→')[2]))}). <a href="#" id="gClr">Tampilkan semua</a>` : `${fmt(rows.length, 0)} gerakan. Klik baris untuk analisis material.`;
      if ($('gClr')) $('gClr').onclick = (e) => { e.preventDefault(); G.flow = ''; draw(D); };
      UI.table(body, { id: 'gerak-detail', rows, name: 'Detail pergerakan material', rowKey: (x) => x.m.material, onRow: (k) => openMaterial(k),
        match: (x, q) => hit([x.m.material, x.m.desc, x.m.matDoc, x.m.po, x.m.header, x.m.resv, x.from, x.to].join(' '), expand(q)), placeholder: 'Cari material, dokumen, PO, keterangan…', cols: [
        { label: 'Tanggal', get: (x) => x.m.date, html: (x) => dstr(x.m.date), filter: false },
        { label: 'Plant', get: (x) => x.m.plant },
        { label: 'Kategori', get: (x) => catName(x.cat) },
        { label: 'Mvt', get: (x) => x.m.mt + ' ' + x.m.mtText },
        { label: 'Kunci Mvt', get: (x) => x.m.mkey, hide: true },
        { label: 'Material', nowrap: true, get: (x) => x.m.material, html: (x) => `<span class="mono">${esc(x.m.material)}</span>` },
        { label: 'Deskripsi', wide: true, get: (x) => x.m.desc },
        { label: 'Qty', num: true, filter: false, get: (x) => x.m.qty, html: (x) => fmt(x.m.qty) + ' ' + esc(x.m.uom) },
        { label: 'Nilai', num: true, filter: false, get: (x) => x.idr, html: (x) => money(x.m.amount, x.cur) },
        { label: 'Dari', get: (x) => x.from }, { label: 'Ke', get: (x) => x.to },
        { label: 'Mat. Doc', nowrap: true, get: (x) => x.m.matDoc, hide: true }, { label: 'PO/RO', nowrap: true, get: (x) => x.m.po, hide: true },
        { label: 'Reservasi', get: (x) => x.m.resv, hide: true }, { label: 'Keterangan', get: (x) => x.m.header }, { label: 'User', get: (x) => x.m.user, hide: true },
      ] });
    }
  }
})();
