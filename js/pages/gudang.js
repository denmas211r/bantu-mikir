// ============ Analisis Warehouse: dashboard monitoring per Warehouse/Plant untuk Inventory Analyst ============
// Susunan: kartu KPI -> grafik (nilai per warehouse, persebaran aging, status stok) -> matriks Aging x ABC (nilai inventory) ->
// ringkasan per warehouse -> pergerakan (tren bulanan + tabel per plant, reservasi, OS PO/RO). Semua elemen bisa diklik (drill-down).
// Filter: Plant (checkbox) + rentang tanggal (hanya untuk Pergerakan). Ikut toggle WK kanan atas. Nilai dalam IDR (kurs di Pengaturan).
// Grafik memakai ECharts (vendor/, dimuat saat halaman ini dibuka).
(function () {
  const AG = ['FS', 'MD', 'SP', 'DS', 'PJ', ''], AGN = { FS: 'Fast', MD: 'Moderate', SP: 'Slow', DS: 'Dead stock', PJ: 'Project', '': 'Tanpa MRP' };
  const AGC = { FS: '#107e3e', MD: '#0a6ed1', SP: '#d9a000', DS: '#bb0000', PJ: '#7c4dcc', '': '#9aa5b1' };
  const STC = { low: '#bb0000', min: '#d9a000', ok: '#107e3e', max: '#0a4ea3' };
  const sum = (a, f) => a.reduce((t, x) => t + (f(x) || 0), 0);
  let echartsP = null;
  const loadEcharts = () => window.echarts ? Promise.resolve(window.echarts) : echartsP || (echartsP = new Promise((res, rej) => { const s = document.createElement('script'); s.src = 'vendor/echarts.min.js'; s.onload = () => res(window.echarts); s.onerror = () => rej(new Error('vendor/echarts.min.js tidak ditemukan')); document.head.appendChild(s); }));
  const charts = []; window.addEventListener('resize', () => charts.forEach((c) => !c.isDisposed() && c.resize()));
  const card = (id, title, sub, extra) => `<section class="dcard" id="${id}"><div class="dc-h"><h3>${esc(title)}</h3>${sub ? `<span class="muted small">${esc(sub)}</span>` : ''}${extra ? `<span class="dc-x">${extra}</span>` : ''}</div><div class="dc-b"></div></section>`;

  PAGES.gudang = function () {
    if (!S.mb52 && !S.mrpRes) { $('view').innerHTML = needFile('MB52', 'Analisis Warehouse dihitung dari stok MB52 (dan MRP untuk status serta aging).'); return; }
    MP.zonaHook = () => PAGES.gudang();
    // Mata uang tampilan (toggle kanan atas): IDR atau USD. Nilai asli per baris dikonversi dengan kurs bulanan dari Pengaturan (stok = bulan berjalan, transaksi = bulan transaksi).
    const CUR = S.cur === 'USD' ? 'USD' : 'IDR', short = (v) => money(v, CUR), cv = (v, cur, d) => (CUR === 'IDR' ? toIDRv(v, cur, d) : cur === 'USD' ? v || 0 : (v || 0) / kursFor(d));
    $('pageActions').innerHTML = '<span id="curSeg"></span>'; UI.seg($('curSeg'), [['IDR', 'IDR'], ['USD', 'USD']], CUR, (v) => { S.cur = v; store.set('cur', v); PAGES.gudang(); });
    const F = (S.fw = S.fw || { plant: new Set(), from: '', to: '' }), mrpMap = S.mrpRes || new Map();
    const R = (S.mb52 ? S.mb52.items : []).map((i) => { const r = mrpMap.get(i.material + '|' + i.plant), q = (i.sohNormal != null ? i.sohNormal : i.soh) || 0;
      return { p: i.plant, m: i.material, desc: i.desc, uom: i.uom, q, v: cv(i.value, stockCur(i.plant)), ag: r ? r.aging || '' : '', r, k: r ? MP.pos(r.stock, r) : '' }; }).filter((x) => x.q > 0 || x.v > 0);
    const plantsAll = [...new Set([...R.map((x) => x.p), ...[...mrpMap.values()].map((r) => r.plant)])].filter((p) => G.zonaOk(p)).sort();
    $('view').innerHTML = `<div id="fb"></div><div id="kp"></div><div class="dgrid">${card('cWH', 'Nilai inventory per warehouse', 'klik batang = fokus ke warehouse')}${card('cAg', 'Persebaran aging', 'berdasarkan nilai; klik = daftar material')}${card('cSt', 'Status stok', 'material x plant; klik = Material Control')}</div>
      ${card('cMx', 'Aging x ABC (nilai inventory)', 'baris = kelas ABC nilai material, kolom = aging; klik sel = daftar material', '<span id="mxSeg"></span>')}${card('cSm', 'Ringkasan per warehouse', 'klik angka status = Material Control terfilter; klik nama = fokus')}
      ${card('cMv', 'Pergerakan, reservasi, dan OS PO/RO', 'pergerakan mengikuti Dari/Sampai (kosong = semua data)')}`;
    const body = (id) => $(id).querySelector('.dc-b');
    const toCtl = (p, pos) => { S.ovMode = 'dt'; S.fc = { q: '', plant: new Set(p ? [p] : F.plant), pos: new Set(pos || []), _init: 1 }; location.hash = '#/control'; };
    const list = (title, rows, cols, name, onRow) => { const b = UI.drawer(`<div class="mhead"><h2>${esc(title)}</h2><div class="meta"><span>${fmt(rows.length, 0)} baris · ${esc(short(sum(rows, (x) => x.v)))}</span></div></div><div id="gl"></div>`, { wide: true, label: title });
      T.table(b.querySelector('#gl'), { rows: rows.slice().sort((a, b2) => b2.v - a.v), pageSize: 15, name, cols, onRow: onRow || ((x) => MP.detail(x.m, x.p)) }); };
    const matCols = [{ label: 'Material', w: 3, get: (x) => x.desc, html: (x) => T.two(x.desc || x.m, x.m + ' · ' + (x.uom || '')) }, { label: 'Plant', w: 0.6, get: (x) => x.p }, { label: 'ABC', type: 'status', w: 0.5, get: (x) => x.abc || '', html: (x) => (x.abc ? T.pill(x.abc, x.abc === 'A' ? 'low' : x.abc === 'B' ? 'warn' : 'mute') : '') },
      { label: 'Aging', type: 'status', w: 0.7, get: (x) => x.ag, html: (x) => agingPill(x.ag || '-') }, { label: 'Stok', type: 'num', w: 0.8, get: (x) => x.q }, { label: 'Nilai (' + CUR + ')', type: 'num', w: 1.1, get: (x) => x.v, html: (x) => esc(short(x.v)) },
      { label: 'Status', type: 'status', w: 1.1, get: (x) => MP.POS[x.k][0], html: (x) => MP.posPill(x.k) }];
    const mk = (el, opt, onClick) => { const ch = echarts.init(el, null, { renderer: 'svg' }); ch.setOption(Object.assign({ textStyle: { fontFamily: 'inherit' }, animationDuration: 300 }, opt)); if (onClick) ch.on('click', onClick); charts.push(ch); G.track(el, () => ch.dispose()); return ch; };

    const draw = () => {
      const P = plantsAll.filter((p) => T.has(F, 'plant', p)), Rs = R.filter((x) => P.includes(x.p));
      const M = [...mrpMap.values()].filter((r) => P.includes(r.plant) && S.mrpPlants.has(r.plant)).map((r) => ({ r, k: MP.pos(r.stock, r) }));
      const total = sum(Rs, (x) => x.v), open = (S.mb25 ? S.mb25.lines : []).filter((l) => P.includes(l.plant) && ['open', 'late'].includes(KX.rvSt(l))), po = (S.me2n ? S.me2n.lines : []).filter((l) => P.includes(l.plant) && ['open', 'late'].includes(KX.poSt(l)));
      // ABC per material (nilai gabungan plant terpilih): A = 80% teratas, B = 15% berikutnya, C = sisanya
      const byMat = new Map(); Rs.forEach((x) => { const o = byMat.get(x.m) || byMat.set(x.m, { m: x.m, v: 0 }).get(x.m); o.v += x.v; });
      const mats = [...byMat.values()].filter((o) => o.v > 0).sort((a, b) => b.v - a.v); let cum = 0; mats.forEach((o) => { const before = total ? cum / total : 0; cum += o.v; o.cls = before < 0.8 ? 'A' : before < 0.95 ? 'B' : 'C'; });
      const clsOf = new Map(mats.map((o) => [o.m, o.cls])); Rs.forEach((x) => (x.abc = clsOf.get(x.m) || 'C'));
      const ds = Rs.filter((x) => x.ag === 'DS');
      $('kp').innerHTML = T.kpis([['Nilai total inventory', esc(short(total)), fmt(P.length, 0) + ' plant · ' + fmt(byMat.size, 0) + ' material', 'k-max'], ['Perlu order', fmt(M.filter((x) => x.r.toOrder > 0).length, 0), 'material x plant dengan To Order', 'k-low'],
        ['Nilai dead stock', esc(short(sum(ds, (x) => x.v))), fmt(total ? (sum(ds, (x) => x.v) / total) * 100 : 0, 1) + '% dari nilai · ' + fmt(ds.length, 0) + ' baris', 'k-min'], ['Reservasi terbuka', fmt(open.length, 0), fmt(open.filter((l) => KX.rvSt(l) === 'late').length, 0) + ' lewat tgl butuh', 'k-min'],
        ['PO/RO berjalan', fmt(po.length, 0), fmt(po.filter((l) => KX.poSt(l) === 'late').length, 0) + ' terlambat', 'k-ok']]);

      // ---- grafik (ECharts) ----
      loadEcharts().then(() => {
        if (!$('cWH')) return; charts.length = 0;
        const byP = P.map((p) => ({ p, v: sum(Rs.filter((x) => x.p === p), (x) => x.v) })).sort((a, b) => a.v - b.v);
        body('cWH').innerHTML = byP.length ? '<div class="chart"></div>' : '<p class="muted pad">Tidak ada data.</p>';
        if (byP.length) mk(body('cWH').firstChild, { grid: { left: 8, right: 70, top: 6, bottom: 6, containLabel: true }, tooltip: { trigger: 'item', formatter: (q) => `${esc(plantLabel(q.name))}<br><b>${esc(short(q.value))}</b> (${fmt(total ? (q.value / total) * 100 : 0, 0)}%)` },
          xAxis: { type: 'value', show: false }, yAxis: { type: 'category', data: byP.map((x) => x.p), axisLine: { show: false }, axisTick: { show: false }, axisLabel: { color: '#32363a' } },
          series: [{ type: 'bar', data: byP.map((x) => ({ value: x.v, itemStyle: { color: wkOfPlant(x.p) === 'PHE' ? '#a3195b' : '#0a6ed1', borderRadius: [0, 4, 4, 0] } })), barMaxWidth: 22, label: { show: true, position: 'right', formatter: (q) => short(q.value), color: '#32363a', fontSize: 11 } }] },
          (q) => { F.plant = new Set([q.name]); if (T._repaint) T._repaint(); draw(); });
        const agData = AG.map((a) => ({ name: a ? `${a} ${AGN[a]}` : 'Tanpa MRP', value: sum(Rs.filter((x) => x.ag === a), (x) => x.v), a, itemStyle: { color: AGC[a] } })).filter((d) => d.value > 0);
        body('cAg').innerHTML = agData.length ? '<div class="chart"></div>' : '<p class="muted pad">Tidak ada data.</p>';
        if (agData.length) mk(body('cAg').firstChild, { tooltip: { trigger: 'item', formatter: (q) => `${esc(q.name)}<br><b>${esc(short(q.value))}</b> (${fmt(q.percent, 1)}%)` }, legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
          series: [{ type: 'pie', radius: ['52%', '78%'], center: ['50%', '44%'], data: agData, label: { show: false }, emphasis: { scale: true } }], graphic: [{ type: 'text', left: 'center', top: '38%', style: { text: short(total), fontSize: 15, fontWeight: 700, fill: '#1d2d3e', textAlign: 'center' } }] },
          (q) => list(`Aging ${q.name}`, Rs.filter((x) => x.ag === q.data.a), matCols, 'Aging_' + (q.data.a || 'tanpa_MRP')));
        const stData = ['low', 'min', 'ok', 'max'].map((k) => ({ name: MP.POS[k][0], value: M.filter((x) => x.k === k).length, k, itemStyle: { color: STC[k] } })).filter((d) => d.value > 0);
        body('cSt').innerHTML = stData.length ? '<div class="chart"></div>' : '<p class="muted pad">Butuh file MRP.</p>';
        if (stData.length) mk(body('cSt').firstChild, { tooltip: { trigger: 'item', formatter: (q) => `${esc(q.name)}<br><b>${fmt(q.value, 0)}</b> material x plant (${fmt(q.percent, 1)}%)` }, legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
          series: [{ type: 'pie', radius: ['52%', '78%'], center: ['50%', '44%'], data: stData, label: { show: false } }], graphic: [{ type: 'text', left: 'center', top: '38%', style: { text: fmt(M.length, 0), fontSize: 20, fontWeight: 700, fill: '#1d2d3e', textAlign: 'center' } }] },
          (q) => toCtl(null, [q.data.k]));
      }).catch((e) => ['cWH', 'cAg', 'cSt'].forEach((id) => $(id) && (body(id).innerHTML = `<p class="muted pad">Grafik gagal dimuat: ${esc(e.message)}</p>`)));

      // ---- matriks Aging x ABC ----
      const mode = S.fwAg === 'n' ? 'n' : 'v', cell = (rr) => ({ n: rr.length, v: sum(rr, (x) => x.v), rows: rr }), classes = ['A', 'B', 'C', '*'];
      const grid = classes.map((c) => AG.map((a) => cell(Rs.filter((x) => (c === '*' || x.abc === c) && (a === '*' || x.ag === a))))), tot = classes.map((c) => cell(Rs.filter((x) => c === '*' || x.abc === c)));
      const maxV = Math.max(1, ...grid.slice(0, 3).flat().map((z) => (mode === 'v' ? z.v : z.n))), colTot = AG.map((a) => cell(Rs.filter((x) => x.ag === a)));
      const rgba = (hex, al) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${al})`; };
      const show = (z) => (mode === 'v' ? (z.v ? esc(short(z.v)) : '–') : z.n ? fmt(z.n, 0) : '–'), sub = (z) => (mode === 'v' ? (z.n ? fmt(z.n, 0) + ' baris' : '') : z.v ? esc(short(z.v)) : '');
      body('cMx').innerHTML = `<div class="t-wrap"><table class="mxa"><thead><tr><th>Kelas ABC</th>${AG.map((a) => `<th><i style="background:${AGC[a]}"></i>${a ? esc(a + ' ' + AGN[a]) : 'Tanpa MRP'}</th>`).join('')}<th>Total</th></tr></thead><tbody>
        ${['A', 'B', 'C'].map((c, ci) => `<tr><th class="rh">${T.pill(c, c === 'A' ? 'low' : c === 'B' ? 'warn' : 'mute')}<small>${c === 'A' ? '80% nilai teratas' : c === 'B' ? '15% berikutnya' : '5% sisanya'}</small></th>${AG.map((a, ai) => { const z = grid[ci][ai], al = z.n ? 0.1 + 0.5 * ((mode === 'v' ? z.v : z.n) / maxV) : 0; return `<td class="mc${z.n ? ' pk' : ''}" data-c="${ci}" data-a="${ai}" style="background:${z.n ? rgba(AGC[a], al) : 'transparent'}"><b>${show(z)}</b><small>${sub(z)}</small></td>`; }).join('')}<td class="mc tt pk" data-c="${ci}" data-a="-1"><b>${show(tot[ci])}</b><small>${sub(tot[ci])}</small></td></tr>`).join('')}
        <tr class="sum"><th class="rh">Total</th>${AG.map((a, ai) => `<td class="mc tt pk" data-c="3" data-a="${ai}"><b>${show(colTot[ai])}</b><small>${sub(colTot[ai])}</small></td>`).join('')}<td class="mc tt pk" data-c="3" data-a="-1"><b>${show(tot[3])}</b><small>${sub(tot[3])}</small></td></tr></tbody></table></div>`;
      body('cMx').querySelectorAll('.mc.pk').forEach((td) => (td.onclick = () => { const c = +td.dataset.c, ai = +td.dataset.a, z = ai < 0 ? tot[c] : c === 3 ? colTot[ai] : grid[c][ai];
        list(`${c === 3 ? 'Semua kelas' : 'Kelas ' + classes[c]} · ${ai < 0 ? 'semua aging' : AG[ai] ? AG[ai] + ' ' + AGN[AG[ai]] : 'Tanpa MRP'}`, z.rows, matCols, 'Aging_ABC'); }));
      UI.seg($('mxSeg'), [['v', 'Nilai'], ['n', 'Jumlah baris']], mode, (v) => { S.fwAg = v; draw(); });

      // ---- ringkasan per warehouse ----
      const rows1 = P.map((p) => { const rr = Rs.filter((x) => x.p === p), mm = M.filter((x) => x.r.plant === p), n = (k) => mm.filter((x) => x.k === k).length;
        return { p, n: rr.length, v: sum(rr, (x) => x.v), dsV: sum(rr.filter((x) => x.ag === 'DS'), (x) => x.v), low: n('low'), min: n('min'), ok: n('ok'), max: n('max'), ord: mm.filter((x) => x.r.toOrder > 0).length }; }).sort((a, b) => b.v - a.v);
      T.table(body('cSm'), { rows: rows1, pageSize: 30, name: 'Gudang_Ringkasan', empty: 'Tidak ada data.', cols: [
        { label: 'Warehouse', w: 2, get: (x) => plantLabel(x.p), html: (x) => T.two(PLANT_NAME[x.p] || x.p, x.p + ' · WK ' + (wkOfPlant(x.p) || '-')), onCell: (x) => { F.plant = new Set([x.p]); if (T._repaint) T._repaint(); draw(); } },
        { label: 'Material', type: 'num', w: 0.7, get: (x) => x.n }, { label: 'Nilai (' + CUR + ')', type: 'num', w: 1.1, get: (x) => x.v, html: (x) => esc(short(x.v)) },
        { label: '% nilai', w: 1.3, get: (x) => (total ? x.v / total : 0), html: (x) => `<span class="bar-in"><i style="width:${total ? Math.max(1, (x.v / total) * 100).toFixed(1) : 0}%"></i></span> ${fmt(total ? (x.v / total) * 100 : 0, 0)}%` },
        { label: 'Nilai dead stock', type: 'num', w: 1.1, get: (x) => x.dsV || null, html: (x) => (x.dsV ? esc(short(x.dsV)) : ''), cls: (x) => (x.dsV ? 'mx-low' : '') },
        { label: 'Di bawah SS', type: 'num', w: 0.8, get: (x) => x.low || null, cls: (x) => (x.low ? 'mx-low' : ''), onCell: (x) => toCtl(x.p, ['low']) }, { label: 'Di bawah Min', type: 'num', w: 0.8, get: (x) => x.min || null, cls: (x) => (x.min ? 'mx-min' : ''), onCell: (x) => toCtl(x.p, ['min']) },
        { label: 'Normal', type: 'num', w: 0.7, get: (x) => x.ok || null, cls: (x) => (x.ok ? 'mx-ok' : ''), onCell: (x) => toCtl(x.p, ['ok']) }, { label: 'Di atas Max', type: 'num', w: 0.8, get: (x) => x.max || null, cls: (x) => (x.max ? 'mx-max' : ''), onCell: (x) => toCtl(x.p, ['max']) },
        { label: 'Perlu order', type: 'num', w: 0.8, get: (x) => x.ord || null, cls: () => 'b', onCell: (x) => toCtl(x.p, ['low', 'min']) }] });

      // ---- pergerakan ----
      const mv = (S.mb51 ? S.mb51.moves : []).filter((m) => m.date && P.includes(m.plant) && m.cat !== 'Not Included' && T.inRange(m.date, F)), idr = (m) => Math.abs(cv(m.amount, m.cur || stockCur(m.plant), m.date));
      const rows4 = P.map((p) => { const a = mv.filter((m) => m.plant === p), rv = open.filter((l) => l.plant === p), pp = po.filter((l) => l.plant === p);
        return { p, inn: sum(a.filter((m) => m.qty > 0), idr), out: sum(a.filter((m) => m.qty < 0), idr), use: sum(a.filter((m) => m.cat === 'Own Use'), idr), rv: rv.length, rvLate: rv.filter((l) => KX.rvSt(l) === 'late').length, po: pp.length, poLate: pp.filter((l) => KX.poSt(l) === 'late').length, poV: sum(pp, (l) => cv(l.openValue, l.currency)) }; });
      const toGerak = (p, cat) => { S.fg = { q: '', plant: new Set([p]), from: F.from, to: F.to, cat: new Set(cat || []), _init: cat ? 1 : 0 }; location.hash = '#/gerak'; };
      const toPO = (p, tab, st) => { S.psTab = tab; (tab === 'po' ? (S.fp = { q: '', plant: new Set([p]), from: '', to: '', st: new Set(st), _init: 1 }) : (S.fr = { q: '', plant: new Set([p]), from: '', to: '', st: new Set(st), _init: 1 })); location.hash = '#/po'; };
      const nm = (v) => (v ? esc(short(v)) : '');
      body('cMv').innerHTML = '<div class="chart trend"></div><div id="mvT" style="margin-top:12px"></div>';
      T.table($('mvT'), { rows: rows4, pageSize: 30, name: 'Gudang_Pergerakan', empty: 'Tidak ada data.', cols: [{ label: 'Warehouse', w: 1.8, get: (x) => plantLabel(x.p), html: (x) => T.two(PLANT_NAME[x.p] || x.p, x.p) },
        { label: 'Barang masuk', type: 'num', w: 1.1, get: (x) => x.inn || null, html: (x) => nm(x.inn), onCell: (x) => toGerak(x.p) }, { label: 'Barang keluar', type: 'num', w: 1.1, get: (x) => x.out || null, html: (x) => nm(x.out), onCell: (x) => toGerak(x.p) },
        { label: 'Pemakaian (Own Use)', type: 'num', w: 1.2, get: (x) => x.use || null, html: (x) => nm(x.use), onCell: (x) => toGerak(x.p, ['Own Use']) },
        { label: 'Reservasi terbuka', type: 'num', w: 0.9, get: (x) => x.rv || null, onCell: (x) => toPO(x.p, 'resv', ['open', 'late']) }, { label: 'Lewat tgl butuh', type: 'num', w: 0.9, get: (x) => x.rvLate || null, cls: (x) => (x.rvLate ? 'neg' : ''), onCell: (x) => toPO(x.p, 'resv', ['late']) },
        { label: 'PO/RO berjalan', type: 'num', w: 0.9, get: (x) => x.po || null, onCell: (x) => toPO(x.p, 'po', ['open', 'late']) }, { label: 'Terlambat', type: 'num', w: 0.8, get: (x) => x.poLate || null, cls: (x) => (x.poLate ? 'neg' : ''), onCell: (x) => toPO(x.p, 'po', ['late']) },
        { label: 'Sisa kirim (' + CUR + ')', type: 'num', w: 1.1, get: (x) => x.poV || null, html: (x) => nm(x.poV), onCell: (x) => toPO(x.p, 'po', ['open', 'late']) }] });
      loadEcharts().then(() => {
        const el = body('cMv') && body('cMv').querySelector('.trend'); if (!el) return;
        const mm = new Map(); mv.forEach((m) => { const k = m.date.getFullYear() + '-' + String(m.date.getMonth() + 1).padStart(2, '0'), o = mm.get(k) || mm.set(k, { inn: 0, out: 0, use: 0 }).get(k); if (m.qty > 0) o.inn += idr(m); else o.out += idr(m); if (m.cat === 'Own Use') o.use += idr(m); });
        const ks = [...mm.keys()].sort().slice(-24); if (!ks.length) { el.outerHTML = '<p class="muted pad">Tidak ada pergerakan MB51 pada rentang ini.</p>'; return; }
        mk(el, { grid: { left: 8, right: 12, top: 30, bottom: 6, containLabel: true }, tooltip: { trigger: 'axis', valueFormatter: (v) => short(v) }, legend: { top: 0, right: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11 } },
          xAxis: { type: 'category', data: ks, axisTick: { show: false } }, yAxis: { type: 'value', axisLabel: { formatter: (v) => short(v).replace(CUR + ' ', '') }, splitLine: { lineStyle: { color: '#ebebeb' } } },
          series: [{ name: 'Masuk', type: 'bar', data: ks.map((k) => mm.get(k).inn), itemStyle: { color: '#107e3e', borderRadius: [3, 3, 0, 0] }, barMaxWidth: 18 }, { name: 'Keluar', type: 'bar', data: ks.map((k) => mm.get(k).out), itemStyle: { color: '#d9a000', borderRadius: [3, 3, 0, 0] }, barMaxWidth: 18 },
            { name: 'Pemakaian (Own Use)', type: 'line', smooth: true, symbol: 'circle', data: ks.map((k) => mm.get(k).use), itemStyle: { color: '#0a6ed1' } }] });
      }).catch(() => {});
    };
    T.filters($('fb'), { plants: plantsAll, dates: true }, F, draw);
    draw();
  };
})();
