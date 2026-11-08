// ============ Tampilan Matriks (Cari Material), Kartu (Kontrak), dan panel Analisis Material ============
(function () {
  const STATUS_RANK = { Kosong: 0, 'Di bawah Min': 1, Surplus: 2, Aman: 3, 'Tanpa Min/Max': 4, 'Tanpa MRP': 5, 'Tidak dipantau': 6 };
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
    const labels = S.mrpWB ? S.mrpWB.monthLabels : [];
    if (S.mrpWB) S.mrpWB.rows.forEach((r) => { const o = map.get(r.material); if (!o) return; o.use = o.use || new Array(labels.length).fill(0); r.usageAll.forEach((v, k) => (o.use[k] += Math.abs(v || 0))); });
    if (S.me3n) map.forEach((o, m) => { if (!o.contract && S.me3n.pick.has(m)) o.contract = S.me3n.pick.get(m); });
    map.forEach((o) => {
      let best = 9, ag = 9;
      homePlants().forEach((p) => {
        const r = o.mrp.get(p), q = o.stock.get(p) || 0;
        if (r) { const st = Parser.status({ plant: p, soh: q }, { min: r.min2 || 0, max: r.max2 || 0 }, S.mrpPlants).s; best = Math.min(best, STATUS_RANK[st] ?? 9); ag = Math.min(ag, AGING_RANK[r.aging] ?? 9); }
        else if (q > 0) best = Math.min(best, STATUS_RANK['Tanpa MRP']);
      });
      o.status = Object.keys(STATUS_RANK).find((k) => STATUS_RANK[k] === best) || (o.stock.size ? 'Tidak dipantau' : 'Tanpa MRP');
      o.aging = Object.keys(AGING_RANK).find((k) => AGING_RANK[k] === ag) || '';
      o.toOrder = [...o.mrp.values()].filter((r) => S.mrpPlants.has(r.plant)).reduce((a, r) => a + (r.toOrder || 0), 0);
      o.use12 = o.use ? o.use.slice(-12).reduce((a, b) => a + b, 0) : null;
      o.total = [...o.stock.values()].reduce((a, b) => a + b, 0);
    });
    S._mi = { ver: S.ver, map, labels };
    return S._mi;
  }
  const statusCls = (s) => (s === 'Kosong' || s === 'Di bawah Min' ? 'low' : s === 'Surplus' ? 'warn' : s === 'Aman' ? 'ok' : 'mute');
  const qtyPill = (q, r) => (q == null ? '<span class="qty na">–</span>' : `<span class="qty ${q <= 0 ? 'zero' : r && r.min2 && q < r.min2 ? 'low' : 'pos'}">${fmt(q)}</span>`);

  // ---------- Cari Material ----------
  const tableCari = PAGES.cari;
  PAGES.cari = function () {
    if (!S.mb52 && !S.mrpRes) { $('view').innerHTML = needFile('file MB52', 'Cari Material membaca stok dari MB52 (WK PEP dan PHE). Min/Max diambil dari mesin MRP kalau file MRP dimuat.'); return; }
    $('pageActions').innerHTML = '<span id="vSeg"></span>';
    UI.seg($('vSeg'), [['matriks', 'Matriks'], ['tabel', 'Tabel']], S.cariView, (v) => { S.cariView = v; store.set('cariView', v); route(); });
    if (S.cariView === 'tabel') return tableCari();
    const { map } = matIndex(), H = homePlants();
    const rows = [...map.values()].filter((o) => o.total > 0 || H.some((p) => o.mrp.has(p)));
    const cols = [
      { label: 'Material', wide: true, w: 3.6, filter: false, get: (o) => o.desc + ' ' + o.material,
        html: (o) => `<div class="mat-desc">${esc(o.desc)}<span class="uom">${esc(o.uom)}</span></div><div class="mat-code">${esc(o.material)} ${o.aging ? agingPill(o.aging) : ''}</div>` },
      { label: 'Aging', get: (o) => o.aging, hide: true },
      { label: 'Harga & kontrak', w: 1.9, get: (o) => (o.contract ? 'Ada kontrak' : 'Tanpa kontrak'),
        html: (o) => { const k = o.contract; const pr = k ? money(k.price, k.currency) : o.price != null ? money(o.price, o.priceCur) : '';
          return `<div class="price-l">${pr || '<span class="muted">–</span>'}</div><div class="price-s">${k ? `OA ${esc(k.doc)}${k.sisaHari != null ? ', ' + fmt(k.sisaHari, 0) + ' hari' : ''}` : 'Tanpa kontrak'}</div>`; } },
      ...H.map((p) => ({ label: PLANT_NAME[p] || p, num: true, filter: false, get: (o) => (o.stock.has(p) || o.mrp.has(p) ? o.stock.get(p) || 0 : null), html: (o) => qtyPill(o.stock.has(p) || o.mrp.has(p) ? o.stock.get(p) || 0 : null, o.mrp.get(p)) })),
      { label: 'Plant lain', num: true, filter: false, get: (o) => [...o.stock].filter(([p]) => !H.includes(p)).reduce((a, [, q]) => a + q, 0),
        html: (o) => { const ot = [...o.stock].filter(([p, q]) => !H.includes(p) && q > 0); return ot.length ? `<span class="qty pos" title="${esc(ot.map(([p, q]) => `${plantLabel(p)}: ${fmt(q)}`).join('\n'))}">${fmt(ot.reduce((a, [, q]) => a + q, 0))}</span><div class="price-s">${ot.length} plant</div>` : '<span class="qty na">–</span>'; } },
      { label: 'Pemakaian 12 bln', num: true, filter: false, w: 1.7, get: (o) => o.use12, html: (o) => (o.use ? `<div class="use">${UI.spark(o.use.slice(-12))}<b>${fmt(o.use12, 0)}</b></div>` : '<span class="muted small">Tidak ada di MRP</span>') },
      { label: 'Perlu order', num: true, filter: false, get: (o) => o.toOrder || null, html: (o) => (o.toOrder ? `<span class="pill warn">${fmt(o.toOrder)}</span>` : '') },
      { label: 'Status', get: (o) => o.status, html: (o) => pill(o.status, statusCls(o.status)) },
      { label: 'WK', get: (o) => [...o.wk].join(', '), hide: true },
    ];
    $('view').innerHTML = srcLine('mb52', 'mrp') + `<p class="tab-note">Satu baris per material. Kolom plant mengikuti plant yang dipantau MRP (atur di Pengaturan). Hijau = ada stok, merah = di bawah Min, abu = kosong. Klik baris untuk analisis material.</p><div id="mx"></div>`;
    UI.table($('mx'), { id: 'cari-matriks', rows, cols, name: 'Cari Material', match: (o, q) => hit(o.material + ' ' + o.desc, expand(q)), sort: { i: cols.findIndex((c) => c.label === 'Pemakaian 12 bln'), dir: -1 },
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
    // rekomendasi
    const reco = [];
    mrpRows.filter((r) => S.mrpPlants.has(r.plant) && r.toOrder > 0).forEach((r) => {
      const donors = [...o.stock].filter(([p, q]) => p !== r.plant && q > 0).map(([p, q]) => { const rr = o.mrp.get(p); const spare = rr && S.mrpPlants.has(p) && rr.max2 != null ? Math.max(0, q - Math.max(rr.max2, rr.min2 || 0)) : q; return { p, spare, mrp: !!(rr && S.mrpPlants.has(p)) }; }).filter((d) => d.spare > 0);
      let t = `<b>${esc(plantLabel(r.plant))}</b> perlu ${fmt(r.toOrder)} ${esc(uom)} (stok ${fmt(r.stock)}, PO berjalan ${fmt(r.ospo)}, Min ${fmt(r.min2)}).`;
      if (donors.length) t += ` Cek dulu stok di ${donors.map((d) => `${esc(plantLabel(d.p))} (${fmt(d.spare)}${d.mrp ? ' di atas Max' : ''})`).join(', ')} untuk transfer.`;
      t += r.contract ? ` Kalau tidak bisa ditransfer, terbitkan RO lewat OA ${esc(r.contract.doc)} (${esc(r.contract.vendor)}, ${money(r.contract.price, r.contract.currency)}/unit).` : ` Belum ada kontrak aktif, jadi buat PR + OE${lp ? ` (harga PO terakhir ${money(lp.price, lp.currency)})` : ''}.`;
      reco.push([donors.length ? 'warn' : 'bad', t]);
      if (r.contract && r.contract.sisaHari != null && r.contract.sisaHari <= 90) reco.push(['warn', `Kontrak OA ${esc(r.contract.doc)} habis dalam ${fmt(r.contract.sisaHari, 0)} hari. Siapkan perpanjangan atau amandemen.`]);
    });
    mrpRows.filter((r) => r.berlebih && r.stock > 0).forEach((r) => reco.push(['warn', `<b>${esc(plantLabel(r.plant))}</b> berlebih: stok ${fmt(r.stock)} ${esc(uom)} setara ${fmt(r.cover, 1)} bulan pemakaian. Tawarkan ke plant yang membutuhkan, jangan dipesan ulang.`]));
    mrpRows.filter((r) => r.aging === 'DS' && r.stock > 0).forEach((r) => reco.push(['bad', `<b>${esc(plantLabel(r.plant))}</b>: tidak ada pemakaian lebih dari 5 tahun. Kandidat dead stock, cek prospek pemakaian dan peralatan induknya.`]));
    if (!mrpRows.length) reco.push(['', 'Material ini tidak ada di file MRP, jadi Min/Max belum dihitung. Kalau rutin dipakai, ajukan jadi stock item.']);
    if (!reco.length) reco.push(['ok', 'Tidak ada tindakan: stok di plant yang dipantau MRP masih di antara Min dan Max.']);

    const cover = amu > 0 ? homeStock / amu : null;
    const body = UI.drawer(`
      <div class="d-head"><h2>${esc(o.desc || m)}</h2><div class="meta"><span>${esc(m)}</span><span>${esc(uom)}</span>${o.wk.size ? `<span>WK ${esc([...o.wk].join(', '))}</span>` : ''}${o.aging ? agingPill(o.aging) : ''}${pill(o.status, statusCls(o.status))}</div></div>
      <div class="kv"><div><span>Stok semua plant</span><b>${fmt(o.total)}</b></div><div><span>Nilai stok</span><b>${money(o.valueIDR, 'IDR')}</b></div><div><span>AMU (plant MRP)</span><b>${fmt(amu, 1)}</b></div>
        <div><span>Cakupan stok</span><b>${cover == null ? '–' : fmt(cover, 1) + ' bln'}</b></div><div><span>Perlu order</span><b>${fmt(o.toOrder || 0)}</b></div></div>
      <section class="d-sec"><h3>Rekomendasi</h3><ul class="reco">${reco.map(([c, t]) => `<li class="${c}"><span>${t}</span></li>`).join('')}</ul></section>
      <section class="d-sec"><h3>Stok per plant <small>MB52</small></h3>${plainTable(o.items.slice().sort((a, b) => b.soh - a.soh), [['Plant', (i) => esc(plantLabel(i.plant))], ['WK', (i) => esc(i.wk || '')], ['Zona', (i) => esc(zonaOf(i.plant))],
        ['Lokasi', (i) => esc(i.locs.map((l) => l.sloc + (l.batch ? '/' + l.batch : '')).join(', '))], ['Stok', (i) => fmt(i.soh) + ' ' + esc(i.uom), 'num'], ['Nilai', (i) => money(i.value, stockCur(i.plant)), 'num']])}</section>
      ${o.use ? `<section class="d-sec"><h3>Pemakaian bulanan <small>24 bulan terakhir, semua plant di file MRP</small></h3><div id="dUse"></div></section>` : ''}
      ${mrpRows.length ? `<section class="d-sec"><h3>Parameter MRP <small>metode ${esc(S.set.method === 'tko' ? 'TKO/Pedoman' : 'Excel lama')}</small></h3>${plainTable(mrpRows, [['Plant', (r) => esc(r.plant) + (S.mrpPlants.has(r.plant) ? '' : ' <span class="muted small">tidak dipantau</span>')], ['Aging', (r) => agingPill(r.aging)],
        ['Kelas', (r) => esc(r.cls || '')], ['AMU', (r) => fmt(r.amu, 2), 'num'], ['LT', (r) => (r.tEff != null ? fmt(r.tEff, 1) : fmt(r.lt, 1)), 'num'], ['SS', (r) => fmt(r.ss), 'num'], ['Min', (r) => fmt(r.min2), 'num'], ['Max', (r) => fmt(r.max2), 'num'],
        ['OS PO', (r) => fmt(r.ospo), 'num'], ['Reservasi', (r) => fmt(r.mb25), 'num'], ['To Order', (r) => (r.toOrder ? `<b>${fmt(r.toOrder)}</b>` : '0'), 'num']])}</section>` : ''}
      ${kItems.length ? `<section class="d-sec"><h3>Kontrak <small>ME3N</small></h3>${plainTable(kItems, [['OA', (i) => `<a href="#" class="oalink" data-oa="${esc(i.doc)}">${esc(i.doc)}</a>${o.contract && o.contract.doc === i.doc ? ' <span class="pill info">dipakai</span>' : ''}`], ['Vendor', (i) => esc(i.k.vendor)],
        ['Harga', (i) => money(i.price, i.k.currency), 'num'], ['Berakhir', (i) => dstr(i.k.end)], ['Sisa hari', (i) => fmt(i.k.sisaHari, 0), 'num'], ['Sisa nilai', (i) => money(i.k.sisa, i.k.currency), 'num']])}</section>` : ''}
      ${poOpen.length ? `<section class="d-sec"><h3>PO/RO berjalan <small>ME2N</small></h3>${plainTable(poOpen, [['Dokumen', (l) => `${esc(l.doc)} <span class="muted small">${esc(l.type)}</span>`], ['Plant', (l) => esc(l.plant)], ['Vendor', (l) => esc(l.vendor)], ['Sisa kirim', (l) => fmt(l.openQty), 'num'], ['Jadwal', (l) => dstr(l.delivery)], ['Status', (l) => (l.lateDays ? pill('Terlambat ' + l.lateDays + ' hari', 'low') : pill('Dalam pengiriman', 'info'))]])}</section>` : ''}
      ${resv.length ? `<section class="d-sec"><h3>Reservasi terbuka <small>MB25</small></h3>${plainTable(resv, [['Reservasi', (l) => esc(l.resv)], ['Plant', (l) => esc(l.plant)], ['Butuh', (l) => dstr(l.reqDate)], ['Sisa', (l) => fmt(l.diff), 'num'], ['Penerima', (l) => esc(l.recipient || l.costCenter || l.wbs)]])}</section>` : ''}
      ${moves.length ? `<section class="d-sec"><h3>Gerakan terakhir <small>MB51</small></h3>${plainTable(moves, [['Tanggal', (x) => dstr(x.date)], ['Plant', (x) => esc(x.plant)], ['Gerakan', (x) => esc(x.mt + ' ' + x.mtText)], ['Qty', (x) => fmt(x.qty), 'num'], ['Keterangan', (x) => esc(x.header || x.po || '')]])}</section>` : ''}
      <div><a class="btn" href="#/lacak" id="dTrace">Lihat jejak lengkap</a></div>`, { label: 'Analisis material' });
    if (o.use && body.querySelector('#dUse')) UI.columns(body.querySelector('#dUse'), mi.labels.slice(-24).map((l) => { const [y, mm] = l.split('-'); return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][+mm - 1] + ' 20' + y; }), o.use.slice(-24), (v) => fmt(v, 1) + ' ' + uom);
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
    const F = S.kf || (S.kf = { q: '', st: new Set(), pg: new Set(), wk: new Set(), sort: 'hari', n: 60 });
    const usedBy = new Map(); if (S.mrpRes) for (const r of S.mrpRes.values()) if (r.contract) usedBy.set(r.contract.doc, (usedBy.get(r.contract.doc) || 0) + 1);
    const stOf = (d) => { const a = []; if (d.sisaHari != null && d.sisaHari < 0) a.push('Berakhir'); else if (d.sisaHari != null && d.sisaHari <= 90) a.push('Habis ≤ 90 hari'); else if (d.sisaHari != null && d.sisaHari <= 180) a.push('Habis ≤ 180 hari'); if (d.pctSisa < 0.2) a.push('Sisa nilai < 20%'); return a.length ? a : ['Aman']; };
    const all = [...S.me3n.docs.values()];
    $('view').innerHTML = srcLine('me3n', 'me2n') + `<div class="filters"><label class="dt-search">${UI.I.search}<input type="search" id="kq" placeholder="Cari No. OA, vendor, atau material…" value="${esc(F.q)}"></label>
        <span id="kSt"></span><span id="kPg"></span><span id="kWk"></span>
        <label class="select"><span class="select-k">Urut</span><select id="kSort" class="bare">${[['hari', 'Sisa hari'], ['nilai', 'Sisa nilai (%)'], ['pakai', 'Dipakai MRP'], ['oa', 'No. OA']].map(([v, l]) => `<option value="${v}" ${F.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
      <p class="source" id="kCount"></p><div class="oa-grid" id="kGrid"></div><div class="more" id="kMore"></div>`;
    const draw = () => {
      const g = expand(F.q);
      let list = all.filter((d) => (!F.pg.size || F.pg.has(d.pg)) && (!F.wk.size || F.wk.has(d.wk)) && (!F.st.size || stOf(d).some((x) => F.st.has(x))) &&
        (!F.q.trim() || hit(d.doc + ' ' + d.vendor + ' ' + d.pic, g) || S.me3n.items.some((i) => i.doc === d.doc && hit(i.material + ' ' + i.desc, g))));
      const srt = { hari: (a, b) => (a.sisaHari ?? 1e9) - (b.sisaHari ?? 1e9), nilai: (a, b) => a.pctSisa - b.pctSisa, pakai: (a, b) => (usedBy.get(b.doc) || 0) - (usedBy.get(a.doc) || 0), oa: (a, b) => a.doc.localeCompare(b.doc) }[F.sort];
      list.sort(srt);
      $('kCount').textContent = `${fmt(list.length, 0)} dari ${fmt(all.length, 0)} kontrak`;
      $('kGrid').innerHTML = list.slice(0, F.n).map((d) => {
        const st = stOf(d), used = d.target ? Math.min(100, Math.max(0, (1 - d.sisa / d.target) * 100)) : 0;
        const badge = d.sisaHari == null ? '' : d.sisaHari < 0 ? pill('Berakhir', 'low') : pill(`Aktif, ${fmt(d.sisaHari, 0)} hari`, d.sisaHari <= 90 ? 'low' : d.sisaHari <= 180 ? 'warn' : 'ok');
        return `<button type="button" class="oa-card" data-oa="${esc(d.doc)}"><div class="oa-top"><span class="oa-no">${esc(d.doc)}</span><span class="muted small">WK ${esc(d.wk || '')}</span>${badge}</div>
          <div class="oa-vendor">${esc(d.vendor)}</div>
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
    const body = UI.drawer(`<div class="d-head"><h2>${esc(d.vendor)}</h2><div class="meta"><span>OA ${esc(doc)}</span><span>WK ${esc(d.wk || '')}</span><span>PG ${esc(d.pg)} ${esc(d.pic)}</span><span>${dstr(d.start)} s.d. ${dstr(d.end)}</span></div></div>
      <div class="kv"><div><span>Nilai kontrak</span><b>${money(d.target, d.currency)}</b></div><div><span>Terpakai</span><b>${money(d.released, d.currency)}</b></div><div><span>Sisa</span><b>${money(d.sisa, d.currency)}</b></div><div><span>Sisa hari</span><b>${d.sisaHari == null ? '–' : fmt(d.sisaHari, 0)}</b></div></div>
      <div class="progress" title="Terpakai ${fmt(used, 0)}%"><i style="width:${used.toFixed(1)}%"></i></div>
      ${plan.length ? `<section class="d-sec"><h3>Rencana RO dari MRP <small>${plan.length} material perlu order</small></h3>${plainTable(plan, [['Plant', (r) => esc(r.plant)], ['Material', (r) => `<a href="#" class="mlink" data-mat="${esc(r.material)}">${esc(r.material)}</a>`], ['Deskripsi', (r) => esc(r.desc)], ['Qty', (r) => fmt(r.toOrder), 'num'], ['Nilai', (r) => money(r.toOrder * r.contract.price, r.contract.currency), 'num']])}</section>` : ''}
      <section class="d-sec"><h3>Item kontrak <small>${items.length} item</small></h3>${plainTable(items, [['Item', (i) => esc(i.item)], ['Material', (i) => `<a href="#" class="mlink" data-mat="${esc(i.material)}">${esc(i.material)}</a>`], ['Deskripsi', (i) => esc(i.desc)], ['UoM', (i) => esc(i.uom)],
        ['Harga', (i) => money(i.price, d.currency), 'num'], ['Target qty', (i) => fmt(i.targetQty), 'num'], ['Terpakai qty', (i) => fmt(i.releasedQty), 'num']])}</section>
      ${ro.length ? `<section class="d-sec"><h3>RO berjalan <small>ME2N</small></h3>${plainTable(ro, [['RO', (l) => esc(l.doc)], ['Plant', (l) => esc(l.plant)], ['Material', (l) => esc(l.material)], ['Sisa kirim', (l) => fmt(l.openQty), 'num'], ['Jadwal', (l) => dstr(l.delivery)], ['Status', (l) => (l.lateDays ? pill('Terlambat ' + l.lateDays + ' hari', 'low') : pill('Dalam pengiriman', 'info'))]])}</section>` : ''}`, { label: 'Detail kontrak' });
    body.querySelectorAll('.mlink').forEach((a) => (a.onclick = (e) => { e.preventDefault(); openMaterial(a.dataset.mat); }));
  }

  // tautan material di mana pun → buka analisis material
  document.addEventListener('click', (e) => { const a = e.target.closest('.mlink'); if (a && !a.closest('.drawer')) { e.preventDefault(); openMaterial(a.dataset.mat); } });
  window.openMaterial = openMaterial; window.openContract = openContract;
})();
