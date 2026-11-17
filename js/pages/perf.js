// ============ Performance & Reporting (Fase 4): Analisis Warehouse dan Deadstock & BAU ============
// Analisis Warehouse memakai MB52 + hasil MRP (aging, Min/Max) + MB51. Deadstock & BAU memakai hasil DS.optimize lewat optimCompute()
// (js/optim.js), jadi hitungannya sama dengan halaman lama. Rumus mesin tidak diubah. Dimuat paling akhir.
// Nilai uang per mata uang (IDR client 100, USD client 180), tidak dijumlahkan lintas mata uang.
(function () {
  const sum = (a, f) => a.reduce((t, x) => t + (f(x) || 0), 0);
  const D = (v) => (v instanceof Date ? v : null);
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const ymK = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  const ymLab = (k) => BLN[+k.slice(5) - 1] + ' ' + k.slice(0, 4);
  const seg = (id, opts, cur, fn) => UI.seg($(id), opts, cur, fn);
  const mk = (el) => { const c = echarts.init(el), rs = () => c.resize(); window.addEventListener('resize', rs); G.track(el, () => { window.removeEventListener('resize', rs); c.dispose(); }); return c; };
  const base = (title, sub) => ({ animation: false, tooltip: { trigger: 'axis', valueFormatter: (v) => Number(v).toLocaleString('id-ID', { maximumFractionDigits: 2 }) }, legend: { left: 'center', bottom: 0, itemWidth: 12, textStyle: { fontSize: 11 } }, grid: { left: 70, right: 16, top: 52, bottom: 48 },
    title: { text: title, subtext: sub, left: 0, textStyle: { fontSize: 13, fontWeight: 600 }, subtextStyle: { fontSize: 11 } }, yAxis: { type: 'value', axisLabel: { fontSize: 11, formatter: (v) => (Math.abs(v) >= 1e12 ? v / 1e12 + ' T' : Math.abs(v) >= 1e9 ? v / 1e9 + ' M' : Math.abs(v) >= 1e6 ? v / 1e6 + ' jt' : v) } } });
  const COL = ['#0a6ed1', '#e9730c', '#107e3e', '#bb0000', '#5b4fb5', '#8a8d91'];
  PAGES.gudanglama = PAGES.gudang; PAGES.optimlama = PAGES.optim;

  // =====================  ANALISIS WAREHOUSE  =====================
  const AGE = ['FS', 'MD', 'SP', 'DS', 'PJ', 'Tanpa MRP'];
  function whRows() {
    return activeItems().filter((i) => G.zonaOk(i.plant)).map((i) => { const r = S.mrpRes ? S.mrpRes.get(i.material + '|' + i.plant) : null;
      return { i, r, cur: stockCur(i.plant), aging: r && r.aging ? r.aging : 'Tanpa MRP', val: i.value || 0, berlebih: !!(r && r.berlebih) }; });
  }
  function byPlant(rows, keyF, init) { const m = new Map(); rows.forEach((x) => { const k = x.i.plant + '|' + x.cur + (keyF ? '|' + keyF(x) : ''); const g = m.get(k) || m.set(k, Object.assign({ plant: x.i.plant, cur: x.cur, n: 0, val: 0, nAll: 0, ber: 0 }, init ? init(x) : {})).get(k); g.nAll++; if (x.i.soh > 0) g.n++; g.val += x.val; if (x.berlebih) g.ber++; }); return [...m.values()]; }
  PAGES.gudang = function () {
    if (!S.mb52) { $('view').innerHTML = needFile('file MB52', 'Analisis Warehouse dihitung dari stok MB52, hasil MRP, dan MB51.'); return; }
    const tab = S.whTab || 'nilai'; MP.zonaHook = () => PAGES.gudang();
    $('view').innerHTML = `<div class="seg-bar"><span id="whSeg"></span><span id="whCur"></span><span class="note" id="whNote"></span></div><div class="ch-row" id="whCh"></div><div id="whBody"></div>`;
    seg('whSeg', [['nilai', 'Nilai persediaan'], ['aging', 'Aging'], ['mm', 'Stok vs Min/Max'], ['tren', 'Tren MB51']], tab, (v) => { S.whTab = v; PAGES.gudang(); });
    const rows = whRows(), curs = [...new Set(rows.map((x) => x.cur))].sort(), src = 'Sumber: MB52' + (S.mrpRes ? ', MRP (aging, Min/Max)' : ' (MRP belum dimuat: aging dan Min/Max kosong)') + (S.mb51 ? ', MB51' : '') + '. Zona terpilih di kanan atas. Nilai per mata uang: IDR client 100, USD client 180, tidak dijumlahkan.';
    const charts = (el, specs) => { el.innerHTML = specs.map((_, i) => `<div class="mp-chart half" id="whc${i}" role="img"></div>`).join(''); return specs.map((_, i) => mk($('whc' + i))); };
    let d, name, types = {}, cc = {}, hide = [];
    if (tab === 'nilai') {
      const R = byPlant(rows, null, (x) => ({ zona: zonaOf(x.i.plant), wk: x.i.wk || '', tr: 0 })); rows.forEach((x) => { const g = R.find((q) => q.plant === x.i.plant && q.cur === x.cur); if (g) g.tr += x.i.transitValue || 0; });
      d = G.fromObjs(R, [['Plant', (g) => g.plant], ['Nama plant', (g) => PLANT_NAME[g.plant] || ''], ['Zona', (g) => g.zona], ['WK', (g) => g.wk], ['Mata uang', (g) => g.cur], ['Item berstok', (g) => g.n], ['Item total', (g) => g.nAll], ['Nilai persediaan', (g) => g.val], ['Nilai in transit', (g) => g.tr || null]]); name = 'Warehouse_Nilai';
      $('whNote').textContent = curs.map((c) => `Total ${c}: ${money(sum(R.filter((g) => g.cur === c), (g) => g.val), c)}`).join(' · ');
      const cs = charts($('whCh'), curs);
      curs.forEach((c, k) => { const L = R.filter((g) => g.cur === c).sort((a, b) => b.val - a.val); cs[k].setOption(Object.assign(base('Nilai persediaan per plant (' + c + ')', 'Satuan: ' + c + '. Sumber: MB52.'), { xAxis: { type: 'category', data: L.map((g) => g.plant), axisLabel: { fontSize: 11 } }, series: [{ name: 'Nilai persediaan', type: 'bar', data: L.map((g) => g.val), itemStyle: { color: COL[0] } }] })); });
    } else if (tab === 'aging') {
      const R = byPlant(rows, (x) => x.aging, (x) => ({ aging: x.aging })), tot = new Map(); R.forEach((g) => tot.set(g.plant + '|' + g.cur, (tot.get(g.plant + '|' + g.cur) || 0) + g.val));
      d = G.fromObjs(R, [['Plant', (g) => g.plant], ['Zona', (g) => zonaOf(g.plant)], ['Mata uang', (g) => g.cur], ['Aging', (g) => g.aging], ['Item', (g) => g.nAll], ['Item berstok', (g) => g.n], ['Nilai persediaan', (g) => g.val], ['% nilai plant', (g) => { const t = tot.get(g.plant + '|' + g.cur); return t ? Math.round((g.val / t) * 1000) / 10 : null; }]]); name = 'Warehouse_Aging';
      $('whNote').textContent = 'Aging dari mesin MRP (dihitung dari semua pemakaian): FS <= 1 tahun, MD <= 2 tahun, SP <= 5 tahun, DS > 5 tahun tidak dipakai, PJ = project belum terpakai.';
      const cs = charts($('whCh'), curs);
      curs.forEach((c, k) => { const ps = [...new Set(R.filter((g) => g.cur === c).map((g) => g.plant))].sort(); cs[k].setOption(Object.assign(base('Komposisi aging per plant (' + c + ')', 'Satuan: ' + c + ', nilai persediaan.'), { color: COL, xAxis: { type: 'category', data: ps, axisLabel: { fontSize: 11 } },
        series: AGE.map((a) => ({ name: a, type: 'bar', stack: 'a', data: ps.map((p) => sum(R.filter((g) => g.cur === c && g.plant === p && g.aging === a), (g) => g.val)) })) })); });
    } else if (tab === 'mm') {
      const R = byPlant(rows, (x) => x.i.status, (x) => ({ st: x.i.status }));
      d = G.fromObjs(R, [['Plant', (g) => g.plant], ['Zona', (g) => zonaOf(g.plant)], ['Mata uang', (g) => g.cur], ['Status stok', (g) => g.st], ['Item', (g) => g.nAll], ['Nilai persediaan', (g) => g.val], ['Item berlebih (cover > batas TKO)', (g) => g.ber || null]]); name = 'Warehouse_MinMax';
      $('whNote').textContent = 'Status mengikuti halaman Cari Material: Kosong / Di bawah Min / Aman / Surplus (di atas Max), stok = ZNORMAL. "Tanpa MRP" dan "Tanpa Min/Max" = belum ada Min/Max.';
      const STS = ['Kosong', 'Di bawah Min', 'Aman', 'Surplus', 'Tanpa Min/Max', 'Tanpa MRP', 'Tidak dipantau'], cs = charts($('whCh'), ['n']), ps = [...new Set(R.map((g) => g.plant))].sort();
      cs[0].setOption(Object.assign(base('Jumlah item per status stok per plant', 'Satuan: jumlah item (material x plant).'), { color: ['#bb0000', '#e9730c', '#107e3e', '#0a6ed1', '#8a8d91', '#b5b9bd', '#d9d9d9'], xAxis: { type: 'category', data: ps, axisLabel: { fontSize: 11 } }, yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
        series: STS.map((s) => ({ name: s, type: 'bar', stack: 's', data: ps.map((p) => sum(R.filter((g) => g.plant === p && g.st === s), (g) => g.nAll)) })) }));
      cc = { 'Status stok': (v) => (/Kosong|Di bawah/.test(v) ? 'st-low' : v === 'Surplus' ? 'st-warn' : v === 'Aman' ? 'st-ok' : 'st-mute') };
    } else {
      if (!S.mb51) { $('whBody').innerHTML = '<p class="muted pad">Tren butuh file MB51.</p>'; return; }
      const cur = S.whCur || curs[0] || 'IDR'; seg('whCur', curs.map((c) => [c, 'Nilai ' + c]), cur, (v) => { S.whCur = v; PAGES.gudang(); });
      const m = new Map(); S.mb51.moves.forEach((x) => { if (!x.date || !G.zonaOk(x.plant)) return; const c = x.cur || stockCur(x.plant), k = ymK(x.date) + '|' + x.plant + '|' + c, g = m.get(k) || m.set(k, { mo: ymK(x.date), plant: x.plant, cur: c, n: 0, inV: 0, outV: 0 }).get(k); g.n++; if (x.qty < 0) g.outV += Math.abs(x.amount || 0); else g.inV += Math.abs(x.amount || 0); });
      d = G.fromObjs([...m.values()], [['Bulan', (g) => new Date(+g.mo.slice(0, 4), +g.mo.slice(5) - 1, 1)], ['Plant', (g) => g.plant], ['Mata uang', (g) => g.cur], ['Jumlah gerakan', (g) => g.n], ['Nilai masuk', (g) => g.inV], ['Nilai keluar', (g) => g.outV], ['Net (masuk - keluar)', (g) => g.inV - g.outV]]); name = 'Warehouse_Tren_MB51'; types = {};
      $('whNote').textContent = 'Nilai gerakan MB51 (Amount in LC) per bulan; arah dari tanda qty. Bukan saldo persediaan: saldo per periode butuh tarikan MB52 tiap periode.';
      const cs = charts($('whCh'), ['t']);
      d.paint = (api) => { const a = new Map(); api.forEachNodeAfterFilterAndSort((n) => { const o = n.data.o; if (o.cur !== cur) return; const x = a.get(o.mo) || a.set(o.mo, { i: 0, o: 0 }).get(o.mo); x.i += o.inV; x.o += o.outV; }); const ks = [...a.keys()].sort();
        cs[0].setOption(Object.assign(base('Nilai barang masuk vs keluar per bulan (' + cur + ')', 'Satuan: ' + cur + '. Sumber: MB51. Mengikuti filter tabel.'), { color: COL, xAxis: { type: 'category', data: ks.map(ymLab), axisLabel: { fontSize: 11 } }, series: [{ name: 'Masuk', type: 'bar', data: ks.map((k) => a.get(k).i) }, { name: 'Keluar', type: 'bar', data: ks.map((k) => a.get(k).o) }] }), true); };
    }
    G.table($('whBody'), { head: d.head, rows: d.rows, name, plantCol: -1, types, hide, cellClass: cc, autoHeight: d.rows.length <= 40 && tab !== 'tren', onFilter: d.paint, source: src });
  };

  // =====================  DEADSTOCK & BAU (pindahan halaman lama optim.js)  =====================
  const kursDS = () => (S.ds && S.ds.kurs) || S.set.kurs || 18150;
  const usd = (v) => money(v, 'USD');
  const usdOf = (m) => { const cur = m.cur || stockCur(m.plant), v = Math.abs(m.amount || 0); return cur === 'USD' ? v : v / kursDS(); };
  const pl = (p) => (p === 'LUAR' ? 'Luar Zona 1 & 4' : p === 'KKKS lain' ? 'KKKS lain (MTA)' : p ? plantLabel(p) : '');
  const untilDate = (k) => (k ? new Date(+k.slice(0, 4), +k.slice(5), 1) : null);
  const destOpts = () => [...new Set(Object.keys(DEFAULT_ZONA).concat(S.mb52 ? S.mb52.plants || [] : []))].sort().concat(['LUAR']);
  const stC = (v) => (/^(Habis|Sah)/.test(v) ? 'st-ok' : /^(Sebagian)/.test(v) ? 'st-warn' : /^(Tidak|Belum|Bukan)/.test(v) ? 'st-low' : 'st-mute');
  PAGES.dsbau = function () {
    if (!S.mb51) { $('view').innerHTML = needFile('file MB51', 'Optimasi DS dan laporan BAU dibaca dari MB51 dan daftar DS akhir tahun (file bernama "Deadstock ...").'); return; }
    const R = optimCompute(), o = S.opt; MP.zonaHook = () => PAGES.dsbau();
    const TABS = [['ringkas', 'Ringkasan'], ['daftar', 'Daftar DS'], ['pivot', 'Pivot bulan'], ['bau', 'Laporan BAU']];
    let tab = S.dsTab || 'ringkas'; if (!R.ds && tab !== 'bau') tab = 'bau';
    const save = () => store.set('optSet', { include309: o.include309, sameZona: o.sameZona, until: o.until, v2: true });
    const months = [...new Set(R.moves.filter((m) => m.date).map((m) => ymK(m.date)))].sort();
    $('view').innerHTML = `${R.ds ? '' : '<div class="banner warn"><span>File DS belum dimuat. Laporan BAU tetap bisa dipakai; Ringkasan, Daftar DS, dan Pivot butuh file daftar DS akhir tahun (sheet "DS PEP"/"DS PHE") di folder data.</span></div>'}
      <div class="seg-bar"><span id="dsSeg"></span><label class="chk" title="309 = ganti kode material"><input type="checkbox" id="o309"${o.include309 ? ' checked' : ''}> Hitung 309 sebagai pemakaian DS</label>
        <label class="chk">BAU sesama zona <select id="oSame">${[['iu', 'sebagai Internal Usage'], ['bau', 'sebagai BAU'], ['skip', 'tidak dihitung']].map(([v, t]) => `<option value="${v}"${o.sameZona === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
        <label class="chk">Sampai bulan <select id="oUntil"><option value="">Semua data</option>${months.map((k) => `<option value="${k}"${o.until === k ? ' selected' : ''}>${ymLab(k)}</option>`).join('')}</select></label></div>
      <div id="dsMid"></div><div class="mp-chart" id="dsCh" role="img"></div><div id="dsBody"></div>`;
    seg('dsSeg', TABS.map(([k, t]) => [k, t]), tab, (v) => { S.dsTab = v; PAGES.dsbau(); });
    $('o309').onchange = (e) => { o.include309 = e.target.checked; save(); PAGES.dsbau(); };
    $('oSame').onchange = (e) => { o.sameZona = e.target.value; save(); PAGES.dsbau(); };
    $('oUntil').onchange = (e) => { o.until = e.target.value; save(); PAGES.dsbau(); };
    const ch = mk($('dsCh')), body = $('dsBody');
    const asOf = R.ds ? `DS per ${dstr(S.ds.asOf)}, gerakan MB51 mulai ${dstr(R.ds.cutoff)}${o.until ? ' sampai akhir ' + ymLab(o.until) : ' sampai data terbaru'}. ` : '';
    const table = (rows, spec, opt) => { const d = G.fromObjs(rows, spec); return G.table(body, Object.assign({ head: d.head, rows: d.rows }, opt)); };
    if (tab === 'ringkas') {
      const rows = R.ds.rows, T = Object.assign({}, S.ds.targets || {}, store.get('optTargets') || {}), pct = (a, b) => (b ? fmt((a / b) * 100, 1) + '%' : '-');
      const z = ['Zona 1', 'Zona 4'].map((zn) => { const xs = rows.filter((r) => zonaOf(r.plant) === zn), t = T[zn] || {}, s = (f) => sum(xs, (r) => r[f]); const x = { zn, target: t.target || 0, iu: s('iuUsd'), bau: s('bauUsd'), k309: s('k309Usd'), mtaIn: t.mta || 0, fuppIn: t.fupp || 0 }; x.tot = x.iu + x.bau + x.k309 + x.mtaIn + x.fuppIn; return x; });
      const inp = (zn, f, v) => `<input type="number" class="oin" data-z="${zn}" data-f="${f}" value="${Math.round(v * 100) / 100}" step="any" aria-label="${f} ${zn}">`;
      $('dsMid').innerHTML = `<p class="note-line">${asOf}Nilai USD memakai harga satuan di daftar DS. BAU sudah termasuk MTA antar KKKS (Mvt 963/964). Target, MTA, dan FUPP diambil dari sheet Summary file DS dan bisa diubah (tersimpan di browser ini, sama dengan halaman lama).</p>
        <div class="plain-wrap"><table class="plain opt-z"><tr><th>Zona</th><th class="num">Target</th><th class="num">Internal Usage (DS)</th><th class="num">BAU (DS)</th>${o.include309 ? '<th class="num">Ganti kode 309 (DS)</th>' : ''}<th class="num">MTA (input)</th><th class="num">FUPP (input)</th><th class="num">Total optimasi</th><th class="num">Capaian</th></tr>
        ${z.map((x) => `<tr><th>${x.zn}</th><td class="num">${inp(x.zn, 'target', x.target)}</td><td class="num">${usd(x.iu)}</td><td class="num">${usd(x.bau)}</td>${o.include309 ? `<td class="num">${usd(x.k309)}</td>` : ''}<td class="num">${inp(x.zn, 'mta', x.mtaIn)}</td><td class="num">${inp(x.zn, 'fupp', x.fuppIn)}</td><td class="num"><b>${usd(x.tot)}</b></td><td class="num"><b>${pct(x.tot, x.target)}</b></td></tr>`).join('')}${(() => { const t = { target: sum(z, (x) => x.target), iu: sum(z, (x) => x.iu), bau: sum(z, (x) => x.bau), k309: sum(z, (x) => x.k309), mtaIn: sum(z, (x) => x.mtaIn), fuppIn: sum(z, (x) => x.fuppIn), tot: sum(z, (x) => x.tot) };
          return `<tr class="tot"><th>Total</th><td class="num"><b>${usd(t.target)}</b></td><td class="num">${usd(t.iu)}</td><td class="num">${usd(t.bau)}</td>${o.include309 ? `<td class="num">${usd(t.k309)}</td>` : ''}<td class="num">${usd(t.mtaIn)}</td><td class="num">${usd(t.fuppIn)}</td><td class="num"><b>${usd(t.tot)}</b></td><td class="num"><b>${pct(t.tot, t.target)}</b></td></tr>`; })()}</table></div>`;
      $('dsMid').querySelectorAll('.oin').forEach((i) => (i.onchange = () => { const t = store.get('optTargets') || {}, zn = i.dataset.z; t[zn] = Object.assign({}, (S.ds.targets || {})[zn] || {}, t[zn] || {}, { [i.dataset.f]: parseFloat(i.value) || 0 }); store.set('optTargets', t); PAGES.dsbau(); }));
      ch.setOption(Object.assign(base('Capaian optimasi DS vs target per zona', 'Satuan: USD. Sumber: daftar DS + MB51.'), { color: COL, xAxis: { type: 'category', data: z.map((x) => x.zn) },
        series: [['Internal Usage', 'iu'], ['BAU', 'bau'], ['Ganti kode 309', 'k309'], ['MTA (input)', 'mtaIn'], ['FUPP (input)', 'fuppIn']].filter((s) => o.include309 || s[1] !== 'k309').map(([n, f]) => ({ name: n, type: 'bar', stack: 'o', data: z.map((x) => x[f]) })).concat([{ name: 'Target', type: 'line', data: z.map((x) => x.target), lineStyle: { type: 'dashed', color: '#32363a' }, itemStyle: { color: '#32363a' } }]) }));
      const pl2 = new Map(); rows.forEach((r) => { const k = r.wk + '|' + r.plant, g = pl2.get(k) || pl2.set(k, { wk: r.wk, plant: r.plant, n: 0, ds: 0, iu: 0, bau: 0, k309: 0, sisa: 0, habis: 0, seb: 0, diam: 0 }).get(k); g.n++; g.ds += r.total; g.iu += r.iuUsd; g.bau += r.bauUsd; g.k309 += r.k309Usd; g.sisa += r.sisaUsd; g[r.status === 'Habis' ? 'habis' : r.status === 'Sebagian' ? 'seb' : 'diam']++; });
      table([...pl2.values()], [['WK', (g) => g.wk], ['Zona', (g) => zonaOf(g.plant)], ['Plant', (g) => g.plant], ['Item DS', (g) => g.n], ['Nilai DS awal (USD)', (g) => g.ds], ['Internal Usage', (g) => g.iu], ['BAU', (g) => g.bau], ...(o.include309 ? [['Ganti kode 309', (g) => g.k309]] : []), ['% DS teroptimasi', (g) => (g.ds ? Math.round(((g.iu + g.bau + g.k309) / g.ds) * 1000) / 10 : null)], ['Sisa DS (USD)', (g) => g.sisa], ['Item habis', (g) => g.habis], ['Item sebagian', (g) => g.seb], ['Item belum', (g) => g.diam]],
        { name: 'Optimasi_DS_per_plant', plantCol: 2, autoHeight: pl2.size <= 40, source: asOf + 'Per plant. Zona terpilih di kanan atas memfilter tabel ini.' });
    } else if (tab === 'daftar') {
      const mkd = (api) => { const a = new Map(); api.forEachNodeAfterFilterAndSort((n) => { const r = n.data.o, g = a.get(r.plant) || a.set(r.plant, { ds: 0, u: 0, s: 0 }).get(r.plant); g.ds += r.total; g.u += r.usedUsd; g.s += r.sisaUsd; }); const ks = [...a.keys()].sort();
        ch.setOption(Object.assign(base('Nilai DS: teroptimasi vs sisa per plant', 'Satuan: USD. Mengikuti filter tabel.'), { color: ['#107e3e', '#bb0000'], xAxis: { type: 'category', data: ks }, series: [{ name: 'Teroptimasi', type: 'bar', stack: 'd', data: ks.map((k) => a.get(k).u) }, { name: 'Sisa DS', type: 'bar', stack: 'd', data: ks.map((k) => a.get(k).s) }] }), true); };
      table(R.ds.rows, [['WK', (r) => r.wk], ['Plant', (r) => r.plant], ['Material', (r) => r.material], ['Deskripsi', (r) => r.desc], ['Qty DS', (r) => r.qty], ['Satuan', (r) => r.uom], ['Harga satuan (USD)', (r) => r.unit], ['Nilai DS (USD)', (r) => r.total], ['Internal Usage (qty)', (r) => r.iu || null], ['BAU (qty)', (r) => r.bau || null],
        ...(o.include309 ? [['309 (qty)', (r) => r.k309 || null]] : []), ['Teroptimasi (USD)', (r) => r.usedUsd || null], ['Sisa DS (USD)', (r) => r.sisaUsd], ['Status', (r) => r.status], ['Gerak terakhir', (r) => D(r.last)]],
        { name: 'Daftar_DS', plantCol: 1, types: { Material: 'text' }, hide: ['Harga satuan (USD)', 'Satuan'], pin: ['Plant', 'Material'], cellClass: { Status: stC }, onFilter: mkd, rowClick: (r) => MP.detail(r.material, r.plant),
          source: asOf + 'Satu baris per Plant x Material di daftar DS (baris dobel digabung). Kuota DS dipakai berurutan oleh gerakan sesudah tanggal DS. Klik baris untuk detail material.' });
    } else if (tab === 'pivot') {
      const P = o.pv || (o.pv = { by: 'material', grp: 'all', unit: 'usd' }); if (P.by !== 'material') P.unit = 'usd';
      $('dsMid').innerHTML = `<div class="seg-bar"><span id="pvBy"></span><span id="pvGrp"></span>${P.by === 'material' ? '<span id="pvUnit"></span>' : ''}</div>`;
      seg('pvBy', [['zona', 'Per zona'], ['plant', 'Per plant'], ['material', 'Per material']], P.by, (v) => { P.by = v; PAGES.dsbau(); }); seg('pvGrp', [['all', 'Semua'], ['iu', 'Internal Usage'], ['bau', 'BAU']], P.grp, (v) => { P.grp = v; PAGES.dsbau(); });
      if (P.by === 'material') seg('pvUnit', [['usd', 'USD'], ['qty', 'Qty']], P.unit, (v) => { P.unit = v; PAGES.dsbau(); });
      const gOf = (mv) => (mv.grp === 'OWN USE' ? 'iu' : mv.grp === '309' ? 'k309' : 'bau'), items = [];
      R.ds.claims.forEach((c, mv) => { if (mv.date) items.push({ mv, c, g: gOf(mv), mo: ymK(mv.date) }); });
      const use = items.filter((x) => P.grp === 'all' || x.g === P.grp), ms = [...new Set(items.map((x) => x.mo))].sort(), val = (x) => (P.unit === 'usd' ? x.c.usd : x.c.qty);
      const keyOf = (x) => (P.by === 'zona' ? zonaOf(x.c.ds.plant) : P.by === 'plant' ? x.c.ds.plant : x.c.ds.key), rows = new Map();
      use.forEach((x) => { const k = keyOf(x), d = x.c.ds, r = rows.get(k) || rows.set(k, { key: k, zona: zonaOf(d.plant), plant: d.plant, material: d.material, desc: d.desc, m: {}, total: 0, n: 0 }).get(k); const v = val(x); r.m[x.mo] = (r.m[x.mo] || 0) + v; r.total += v; r.n++; });
      const lead = P.by === 'zona' ? [['Zona', (r) => r.zona]] : P.by === 'plant' ? [['Zona', (r) => r.zona], ['Plant', (r) => r.plant]] : [['Zona', (r) => r.zona], ['Plant', (r) => r.plant], ['Material', (r) => r.material], ['Deskripsi', (r) => r.desc]];
      const unit = P.unit === 'usd' ? 'USD' : 'qty per satuan material (tidak dijumlahkan lintas material)';
      const mkp = (api) => { const a = {}; api.forEachNodeAfterFilterAndSort((n) => ms.forEach((k) => (a[k] = (a[k] || 0) + (n.data.o.m[k] || 0)))); ch.setOption(Object.assign(base('Nilai DS terpakai per bulan', 'Satuan: ' + unit + '. Mengikuti filter tabel.'), { color: COL, xAxis: { type: 'category', data: ms.map(ymLab) }, series: [{ name: P.grp === 'all' ? 'Semua' : P.grp === 'iu' ? 'Internal Usage' : 'BAU', type: 'bar', data: ms.map((k) => a[k] || 0) }] }), true); };
      table([...rows.values()], [...lead, ...ms.map((k) => [ymLab(k), (r) => r.m[k] || null]), ['Total', (r) => r.total], ['Jumlah gerakan', (r) => r.n]],
        { name: 'Pivot_DS_' + P.by, plantCol: P.by === 'zona' ? -1 : 1, types: { Material: 'text' }, onFilter: mkp, rowClick: (r) => dsMoves(r, use, keyOf, P, ms),
          source: asOf + `Nilai DS terpakai per ${P.by} dan bulan (${unit}). Klik baris untuk semua pergerakan MB51 di balik angkanya.` });
    } else {
      const grp = S.bauView || 'rekap', valid = S.bauValid || 'sah', MBAU = R.moves.filter((m) => (m.grp === 'BAU' || m.grp === 'MTA') && m.date && (!o.until || m.date < untilDate(o.until)));
      $('dsMid').innerHTML = `<div class="seg-bar"><span id="bvSeg"></span><span id="bvVal"></span><span class="note">BAU = kirim barang ke plant lain lewat STO (Mvt 351) dan keluar ke KKKS lain (963), dikurangi pembatalan (352/964). BAU sesama zona mengikuti pilihan di atas.</span></div>`;
      seg('bvSeg', [['rekap', 'Rekap per bulan'], ['det', 'Detail per material']], grp, (v) => { S.bauView = v; PAGES.dsbau(); }); seg('bvVal', [['sah', 'Dihitung'], ['belum', 'Tidak dihitung'], ['semua', 'Semua']], valid, (v) => { S.bauValid = v; PAGES.dsbau(); });
      const list = MBAU.filter((m) => valid === 'semua' || (valid === 'sah' ? m._bau && m._bau.valid : !(m._bau && m._bau.valid))), claim = (m) => (R.ds && R.ds.claims.get(m)) || null;
      const nUnk = MBAU.filter((m) => m._bau && !m._bau.dest).length;
      const sub = (nUnk ? `${fmt(nUnk, 0)} baris tujuannya tidak ada di MB51 (dihitung BAU). ` : '') + asOf;
      if (grp === 'rekap') {
        const g = new Map(); list.forEach((m) => { const b = m._bau || {}, k = [ymK(m.date), m.plant, b.dest || '', b.status || ''].join('|'), x = g.get(k) || g.set(k, { mo: ymK(m.date), from: m.plant, to: b.dest || '', zf: b.zFrom || zonaOf(m.plant), zt: b.zTo || '', st: b.status || '', n: 0, mats: new Set(), v: 0, ds: 0 }).get(k); x.n++; x.mats.add(m.material); x.v += Math.sign(-m.qty) * usdOf(m); const c = claim(m); if (c) x.ds += c.usd; });
        const mkb = (api) => { const a = {}; api.forEachNodeAfterFilterAndSort((n) => { const x = n.data.o; a[x.mo] = (a[x.mo] || 0) + x.v; }); const ks = Object.keys(a).sort(); ch.setOption(Object.assign(base('Nilai BAU per bulan', 'Satuan: USD (MB51, IDR dikonversi dengan kurs DS). Mengikuti filter tabel.'), { color: COL, xAxis: { type: 'category', data: ks.map(ymLab) }, series: [{ name: 'Nilai BAU', type: 'bar', data: ks.map((k) => a[k]) }] }), true); };
        table([...g.values()], [['Bulan', (x) => new Date(+x.mo.slice(0, 4), +x.mo.slice(5) - 1, 1)], ['Dari', (x) => pl(x.from)], ['Zona asal', (x) => x.zf], ['Ke', (x) => pl(x.to) || 'Belum diketahui'], ['Zona tujuan', (x) => x.zt], ['Baris', (x) => x.n], ['Material', (x) => x.mats.size], ['Nilai MB51 (USD)', (x) => x.v], ['Klaim DS (USD)', (x) => x.ds || null], ['Status', (x) => x.st]],
          { name: 'Rekap_BAU', plantCol: -1, cellClass: { Status: stC }, onFilter: mkb, source: sub + 'Satu baris = bulan x dari x ke x status.' });
      } else {
        const gr = (m) => { const a = m.po && R.gr.get(m.po); if (!a) return null; const b = a.filter((x) => !m._bau || !m._bau.dest || x.plant === m._bau.dest); return (b.length ? b : a).sort((x, y) => x.date - y.date)[0]; };
        const mkb = (api) => { const a = {}; api.forEachNodeAfterFilterAndSort((n) => { const m = n.data.o, k = ymK(m.date); a[k] = (a[k] || 0) + Math.sign(-m.qty) * usdOf(m); }); const ks = Object.keys(a).sort(); ch.setOption(Object.assign(base('Nilai BAU per bulan', 'Satuan: USD. Mengikuti filter tabel.'), { color: COL, xAxis: { type: 'category', data: ks.map(ymLab) }, series: [{ name: 'Nilai BAU', type: 'bar', data: ks.map((k) => a[k]) }] }), true); };
        table(list.slice().sort((a, b) => a.date - b.date), [['Tanggal', (m) => m.date], ['Dari', (m) => m.plant], ['Ke', (m) => (m.grp === 'MTA' ? 'KKKS lain' : pl(m._bau && m._bau.dest) || 'Belum diketahui')], ['Sumber tujuan', (m) => (m._bau && m._bau.how) || ''], ['Status', (m) => (m._bau ? m._bau.status : '')], ['Mvt', (m) => m.mt + (m.qty > 0 ? ' (batal)' : '')], ['Material', (m) => m.material], ['Deskripsi', (m) => m.desc], ['Qty', (m) => -m.qty], ['Satuan', (m) => m.uom],
          ['Nilai MB51 (USD)', (m) => Math.sign(-m.qty) * usdOf(m)], ['Klaim DS (USD)', (m) => (claim(m) ? claim(m).usd : null)], ['STO/PO', (m) => m.po], ['Tgl diterima', (m) => { const r = gr(m); return r ? r.date : null; }], ['Plant penerima', (m) => { const r = gr(m); return r ? r.plant : ''; }], ['Mat. Doc', (m) => m.matDoc], ['Keterangan', (m) => m.header]],
          { name: 'Laporan_BAU', plantCol: 1, types: { Material: 'text', Mvt: 'text' }, hide: ['Sumber tujuan', 'Satuan', 'Mat. Doc'], cellClass: { Status: stC }, onFilter: mkb, rowClick: (m) => dsDest(m),
            source: sub + 'Klik baris untuk memilih tujuan manual (tersimpan di browser ini). Tujuan dibaca dari isian manual, lalu baris pasangan di Material Document yang sama, lalu kata kunci di header text; kalau tidak ketemu dianggap diterima di luar MB51 dan dihitung BAU.' });
      }
    }
  };
  function dsDest(m) {
    const b = m._bau || {}, manual = store.get('bauDest') || {}, id = DS.moveId(m);
    const body = UI.drawer(`<div class="d-head"><h2 class="mono">${esc(m.material)}</h2><p class="muted">${esc(m.desc)}</p></div><div class="dv"><div><span>Tanggal</span><b>${esc(G.fDate(m.date))}</b></div><div><span>Dari</span><b>${esc(plantLabel(m.plant))}</b></div><div><span>Qty</span><b>${fmt(-m.qty)} ${esc(m.uom)}</b></div><div><span>Status</span><b>${esc(b.status || '')}</b></div><div><span>Tujuan terbaca</span><b>${esc(pl(b.dest) || 'Belum diketahui')} ${b.how ? '(' + esc(b.how) + ')' : ''}</b></div></div>
      <label class="chk">Tujuan manual <select id="bd"><option value="">Pilih tujuan...</option>${destOpts().map((p) => `<option value="${p}"${manual[id] === p ? ' selected' : ''}>${esc(pl(p))}</option>`).join('')}</select></label>`, { label: 'Tujuan BAU' });
    body.querySelector('#bd').onchange = (e) => { const d = store.get('bauDest') || {}; if (e.target.value) d[id] = e.target.value; else delete d[id]; store.set('bauDest', d); UI.closeDrawer(); PAGES.dsbau(); };
  }
  function dsMoves(r, use, keyOf, P, ms) {
    const mv = use.filter((x) => keyOf(x) === r.key).sort((a, b) => a.mv.date - b.mv.date), usdv = (v) => money(v, 'USD');
    const body = UI.drawer(`<div class="d-head"><h2>${esc(P.by === 'material' ? r.material + ' · ' + plantLabel(r.plant) : r.key)}</h2><p class="muted">${esc(P.by === 'material' ? r.desc : '')}</p></div><div class="dv">${ms.filter((x) => r.m[x]).map((x) => `<div><span>${ymLab(x)}</span><b>${P.unit === 'usd' ? usdv(r.m[x]) : fmt(r.m[x])}</b></div>`).join('')}</div><div id="dm"></div>`, { wide: true, label: 'Pergerakan DS' });
    const d = G.fromObjs(mv, [['Tanggal', (x) => x.mv.date], ['Plant', (x) => x.mv.plant], ['Material', (x) => x.mv.material], ['Mvt', (x) => x.mv.mt + (x.mv.qty > 0 ? ' (batal)' : '')], ['Jenis', (x) => (x.g === 'iu' ? 'Internal Usage' : x.g === 'bau' ? 'BAU' : '309')], ['Gerakan', (x) => -x.mv.qty], ['Klaim DS (qty)', (x) => x.c.qty], ['Satuan', (x) => x.mv.uom], ['USD', (x) => x.c.usd], ['Tujuan', (x) => (x.g === 'bau' && x.mv._bau ? (x.mv._bau.dest ? pl(x.mv._bau.dest) : 'Di luar MB51') : '')], ['Keterangan', (x) => x.mv.header], ['Mat. Doc', (x) => x.mv.matDoc]]);
    G.table(body.querySelector('#dm'), { head: d.head, rows: d.rows, name: 'Pergerakan_DS', plantCol: -1, types: { Material: 'text', Mvt: 'text' }, autoHeight: d.rows.length <= 12, source: '' });
  }
})();
