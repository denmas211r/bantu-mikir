// ============ Halaman Optimasi DS & BAU ============
// Ringkasan capaian optimasi DS per zona, daftar DS per material, dan laporan BAU/MTA per bulan (dari → ke, material, nilai).
(function () {
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const ym = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  const ymLabel = (k) => BLN[+k.slice(5) - 1] + ' ' + k.slice(0, 4);
  const usd = (v) => money(v, 'USD');
  const kursDS = () => (S.ds && S.ds.kurs) || S.set.kurs || 18150;
  const usdOf = (m) => { const cur = m.cur || stockCur(m.plant), v = Math.abs(m.amount || 0); return cur === 'USD' ? v : v / kursDS(); };
  const pl = (p) => (p === 'LUAR' ? 'Luar Zona 1 & 4' : p === 'KKKS lain' ? 'KKKS lain (MTA)' : p ? plantLabel(p) : '');
  const DEST_OPTS = () => [...new Set(Object.keys(DEFAULT_ZONA).concat(S.mb52 ? S.mb52.plants || [] : []))].sort().concat(['LUAR']);

  const O = () => S.opt || (S.opt = Object.assign({ tab: 'ringkas', kind: 'BAU', months: new Set(), wk: new Set(), valid: 'sah' }, { include309: false, sameZona: 'skip' }, store.get('optSet') || {}));
  let cache = { key: '', res: null };
  function compute() {
    const o = O(), manual = store.get('bauDest') || {}, moves = S.mb51 ? S.mb51.moves : [];
    const key = [S.ver, moves.length, S.ds ? S.ds.rows.length : 0, o.include309, o.sameZona, JSON.stringify(manual)].join('|');
    if (cache.key === key) return cache.res;
    const opt = { zonaOf, include309: o.include309, sameZona: o.sameZona, manual };
    const ds = S.ds ? DS.optimize(S.ds, moves, opt) : null;
    if (!ds) moves.forEach((m) => { m._bau = m.grp === 'BAU' || m.grp === 'MTA' ? DS.bauInfo(m, opt) : undefined; });
    const gr = new Map(); moves.forEach((m) => { if (m.mkey === '10142+' && m.po) (gr.get(m.po) || gr.set(m.po, []).get(m.po)).push(m); });
    cache = { key, res: { ds, moves, gr } }; return cache.res;
  }
  window.optimCompute = compute;
  const saveOpt = () => { const o = O(); store.set('optSet', { include309: o.include309, sameZona: o.sameZona }); };

  PAGES.optim = function () {
    if (!S.mb51) { $('view').innerHTML = needFile('file MB51', 'Optimasi DS dan laporan BAU dibaca dari MB51 (semua file digabung) dan daftar DS akhir tahun (file bernama "Deadstock …").'); return; }
    const o = O(), R = compute();
    const TABS = [['ringkas', 'Ringkasan optimasi DS'], ['daftar', 'Daftar DS'], ['bulan', 'Optimasi per bulan'], ['bau', 'Laporan BAU & MTA']];
    if (!R.ds && o.tab !== 'bau') o.tab = 'bau';
    $('view').innerHTML = `${srcLine('ds', 'mb51')}
      ${R.ds ? '' : '<div class="banner warn"><span>File DS belum dimuat. Laporan BAU & MTA tetap bisa dipakai; ringkasan optimasi DS butuh file daftar DS akhir tahun (sheet "DS PEP"/"DS PHE", form MA-01) di folder data atau lewat <a href="#/data">Data SAP</a>.</span></div>'}
      <div class="filters"><span id="oWK"></span>
        <label class="chk" title="309 = ganti kode material. Di PHE dipakai memindah kode DS ke kode aktif sebelum dipakai."><input type="checkbox" id="o309"${o.include309 ? ' checked' : ''}> Hitung 309 (ganti kode DS ke kode aktif) sebagai pemakaian DS</label>
        <label class="chk">BAU sesama zona <select id="oSame" aria-label="Perlakuan BAU sesama zona">${[['skip', 'tidak dihitung'], ['iu', 'dihitung sebagai Internal Usage'], ['bau', 'dihitung sebagai BAU']].map(([v, t]) => `<option value="${v}"${o.sameZona === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label></div>
      <div class="tabs" role="tablist">${TABS.map(([k, t]) => `<button class="tab ${k === o.tab ? 'on' : ''}" data-t="${k}" ${!R.ds && k !== 'bau' ? 'disabled' : ''}>${t}</button>`).join('')}</div>
      <div id="oBody"></div>`;
    document.querySelectorAll('.tabs .tab').forEach((b) => (b.onclick = () => { o.tab = b.dataset.t; route(); }));
    $('o309').onchange = (e) => { o.include309 = e.target.checked; saveOpt(); route(); };
    $('oSame').onchange = (e) => { o.sameZona = e.target.value; saveOpt(); route(); };
    const wks = [...new Set((R.ds ? R.ds.rows.map((r) => r.wk) : []).concat(R.moves.map((m) => m.wk)))].filter(Boolean).sort();
    if (wks.length > 1) UI.multi($('oWK'), { label: 'WK', options: wks.map((w) => ({ value: w, label: 'WK ' + w })), selected: o.wk, onChange: () => route() });
    ({ ringkas, daftar, bulan, bau })[o.tab](R, $('oBody'));
  };
  const inWK = (wk) => !O().wk.size || O().wk.has(wk);

  // ---------- Ringkasan per zona vs target ----------
  function ringkas(R, el) {
    const o = O(), rows = R.ds.rows.filter((r) => inWK(r.wk)), T = Object.assign({}, S.ds.targets || {}, store.get('optTargets') || {});
    const zonas = ['Zona 1', 'Zona 4'];
    const z = zonas.map((zn) => { const xs = rows.filter((r) => zonaOf(r.plant) === zn); const t = T[zn] || {}; const sum = (f) => xs.reduce((a, r) => a + r[f], 0);
      const x = { zn, target: t.target || 0, iu: sum('iuUsd'), bau: sum('bauUsd'), mta: sum('mtaUsd'), k309: sum('k309Usd'), mtaIn: t.mta || 0, fuppIn: t.fupp || 0, ds: sum('total') };
      x.tot = x.iu + x.bau + x.mta + x.k309 + x.mtaIn + x.fuppIn; return x; });
    const tot = { zn: 'Total', target: 0, iu: 0, bau: 0, mta: 0, k309: 0, mtaIn: 0, fuppIn: 0, ds: 0, tot: 0 }; z.forEach((x) => Object.keys(tot).forEach((k) => k !== 'zn' && (tot[k] += x[k])));
    const inp = (zn, f, v) => (zn === 'Total' ? `<b>${usd(v)}</b>` : `<input type="number" class="oin" data-z="${zn}" data-f="${f}" value="${Math.round(v * 100) / 100}" step="any" aria-label="${f} ${zn}">`);
    const pct = (a, b) => (b ? fmt((a / b) * 100, 1) + '%' : '–');
    const plants = new Map(); rows.forEach((r) => { const k = r.wk + '|' + r.plant; const g = plants.get(k) || plants.set(k, { wk: r.wk, plant: r.plant, n: 0, ds: 0, iu: 0, bau: 0, mta: 0, k309: 0, sisa: 0, habis: 0, sebagian: 0, diam: 0 }).get(k);
      g.n++; g.ds += r.total; g.iu += r.iuUsd; g.bau += r.bauUsd; g.mta += r.mtaUsd; g.k309 += r.k309Usd; g.sisa += r.sisaUsd; g[r.status === 'Habis' ? 'habis' : r.status === 'Sebagian' ? 'sebagian' : 'diam']++; });
    el.innerHTML = `<p class="tab-note">DS per ${dstr(S.ds.asOf)}, gerakan MB51 mulai ${dstr(R.ds.cutoff)}. Nilai memakai harga satuan USD di daftar DS. Target, MTA lain, dan FUPP diambil dari sheet Summary file DS dan bisa diubah di sini (tersimpan di browser ini).</p>
      <div class="plain-wrap"><table class="plain opt-z"><tr><th>Zona</th><th class="num">Target</th><th class="num">Internal Usage (DS)</th><th class="num">BAU (DS)</th><th class="num">MTA (DS)</th>${o.include309 ? '<th class="num">Ganti kode 309 (DS)</th>' : ''}<th class="num">MTA lain (input)</th><th class="num">FUPP (input)</th><th class="num">Total optimasi</th><th class="num">Capaian</th></tr>
      ${z.concat([tot]).map((x) => `<tr class="${x.zn === 'Total' ? 'tot' : ''}"><th>${x.zn}</th><td class="num">${inp(x.zn, 'target', x.target)}</td><td class="num">${usd(x.iu)}</td><td class="num">${usd(x.bau)}</td><td class="num">${usd(x.mta)}</td>${o.include309 ? `<td class="num">${usd(x.k309)}</td>` : ''}
        <td class="num">${inp(x.zn, 'mta', x.mtaIn)}</td><td class="num">${inp(x.zn, 'fupp', x.fuppIn)}</td><td class="num"><b>${usd(x.tot)}</b></td><td class="num"><b class="${x.target && x.tot >= x.target ? 'pos' : ''}">${pct(x.tot, x.target)}</b></td></tr>`).join('')}</table></div>
      <h4 class="sub-h">Per plant</h4><div id="oPl"></div>`;
    el.querySelectorAll('.oin').forEach((i) => (i.onchange = () => { const t = store.get('optTargets') || {}; const zn = i.dataset.z; t[zn] = Object.assign({}, (S.ds.targets || {})[zn] || {}, t[zn] || {}, { [i.dataset.f]: parseFloat(i.value) || 0 }); store.set('optTargets', t); route(); }));
    UI.table($('oPl'), { id: 'opt-plant' + (o.include309 ? '-309' : ''), rows: [...plants.values()], name: 'Optimasi DS per plant', sort: { i: 5, dir: -1 }, cols: [
      { label: 'WK', get: (g) => g.wk }, { label: 'Zona', get: (g) => zonaOf(g.plant) }, { label: 'Plant', get: (g) => plantLabel(g.plant) },
      { label: 'Item DS', num: true, filter: false, get: (g) => g.n, html: (g) => fmt(g.n, 0) },
      { label: 'Nilai DS awal', num: true, filter: false, get: (g) => g.ds, html: (g) => usd(g.ds) },
      { label: 'Internal Usage', num: true, filter: false, get: (g) => g.iu, html: (g) => usd(g.iu) },
      { label: 'BAU', num: true, filter: false, get: (g) => g.bau, html: (g) => usd(g.bau) },
      { label: 'MTA', num: true, filter: false, get: (g) => g.mta, html: (g) => usd(g.mta) },
      ...(o.include309 ? [{ label: 'Ganti kode 309', num: true, filter: false, get: (g) => g.k309, html: (g) => usd(g.k309) }] : []),
      { label: '% DS teroptimasi', num: true, filter: false, get: (g) => (g.ds ? (g.iu + g.bau + g.mta + g.k309) / g.ds : 0), html: (g) => pct(g.iu + g.bau + g.mta + g.k309, g.ds) },
      { label: 'Sisa DS', num: true, filter: false, get: (g) => g.sisa, html: (g) => usd(g.sisa) },
      { label: 'Habis / sebagian / belum', filter: false, get: (g) => g.habis, html: (g) => `${fmt(g.habis, 0)} / ${fmt(g.sebagian, 0)} / ${fmt(g.diam, 0)}` },
    ] });
  }

  // ---------- Daftar DS per material ----------
  function daftar(R, el) {
    const o = O(), rows = R.ds.rows.filter((r) => inWK(r.wk));
    el.innerHTML = `<p class="tab-note">Satu baris per Plant×Material di daftar DS (baris dobel di file digabung). Kuota DS dipakai berurutan oleh gerakan sesudah tanggal DS. Klik baris untuk analisis material.</p><div id="oDs"></div>`;
    UI.table($('oDs'), { id: 'opt-ds' + (o.include309 ? '-309' : ''), rows, name: 'Daftar DS dan pemakaiannya', rowKey: (r) => r.material, onRow: (k) => openMaterial(k), sort: { i: 9, dir: -1 },
      match: (r, q) => hit(r.material + ' ' + r.desc + ' ' + r.plant, expand(q)), placeholder: 'Cari material, deskripsi, atau plant…', cols: [
      { label: 'WK', get: (r) => r.wk, hide: true }, { label: 'Zona', get: (r) => zonaOf(r.plant), hide: true }, { label: 'Plant', get: (r) => r.plant },
      { label: 'Material', nowrap: true, get: (r) => r.material, html: (r) => `<span class="mono">${esc(r.material)}</span>` },
      { label: 'Deskripsi', wide: true, get: (r) => r.desc },
      { label: 'Qty DS', num: true, filter: false, get: (r) => r.qty, html: (r) => fmt(r.qty) + ' ' + esc(r.uom) },
      { label: 'Harga satuan', num: true, filter: false, get: (r) => r.unit, html: (r) => usd(r.unit), hide: true },
      { label: 'Nilai DS', num: true, filter: false, get: (r) => r.total, html: (r) => usd(r.total) },
      { label: 'Internal Usage', num: true, filter: false, get: (r) => r.iu, html: (r) => (r.iu ? fmt(r.iu) : '') },
      { label: 'BAU', num: true, filter: false, get: (r) => r.bau, html: (r) => (r.bau ? fmt(r.bau) : '') },
      { label: 'MTA', num: true, filter: false, get: (r) => r.mta, html: (r) => (r.mta ? fmt(r.mta) : '') },
      ...(o.include309 ? [{ label: '309', num: true, filter: false, get: (r) => r.k309, html: (r) => (r.k309 ? fmt(r.k309) : '') }] : []),
      { label: 'Teroptimasi', num: true, filter: false, get: (r) => r.usedUsd, html: (r) => (r.usedUsd ? `<b>${usd(r.usedUsd)}</b>` : '') },
      { label: 'Sisa DS', num: true, filter: false, get: (r) => r.sisaUsd, html: (r) => usd(r.sisaUsd) },
      { label: 'Status', get: (r) => r.status, html: (r) => `<span class="st ${r.status === 'Habis' ? 'ok' : r.status === 'Sebagian' ? 'warn' : 'mute'}">${esc(r.status)}</span>` },
      { label: 'Gerak terakhir', get: (r) => r.last, html: (r) => (r.last ? dstr(r.last) : ''), filter: false },
    ] });
  }

  // ---------- Optimasi per bulan ----------
  function bulan(R, el) {
    const o = O(), m = new Map();
    R.ds.claims.forEach((c, mv) => { if (!inWK(c.ds.wk)) return; const k = ym(mv.date) + '|' + zonaOf(c.ds.plant); const g = m.get(k) || m.set(k, { mo: ym(mv.date), zn: zonaOf(c.ds.plant), iu: 0, bau: 0, mta: 0, k309: 0, mats: new Set() }).get(k);
      const f = mv.grp === 'OWN USE' ? 'iu' : mv.grp === 'BAU' ? 'bau' : mv.grp === 'MTA' ? 'mta' : 'k309'; g[f] += c.usd; g.mats.add(c.ds.key); });
    el.innerHTML = `<p class="tab-note">Nilai DS yang terpakai per bulan dan zona (USD, harga satuan DS). Angka ini yang dilaporkan sebagai capaian optimasi DS bulanan.</p><div id="oMo"></div>`;
    UI.table($('oMo'), { id: 'opt-bulan' + (o.include309 ? '-309' : ''), rows: [...m.values()], name: 'Optimasi DS per bulan', sort: { i: 0, dir: 1 }, cols: [
      { label: 'Bulan', get: (g) => g.mo, html: (g) => ymLabel(g.mo) }, { label: 'Zona', get: (g) => g.zn },
      { label: 'Material DS', num: true, filter: false, get: (g) => g.mats.size, html: (g) => fmt(g.mats.size, 0) },
      { label: 'Internal Usage', num: true, filter: false, get: (g) => g.iu, html: (g) => usd(g.iu) },
      { label: 'BAU', num: true, filter: false, get: (g) => g.bau, html: (g) => usd(g.bau) },
      { label: 'MTA', num: true, filter: false, get: (g) => g.mta, html: (g) => usd(g.mta) },
      ...(o.include309 ? [{ label: 'Ganti kode 309', num: true, filter: false, get: (g) => g.k309, html: (g) => usd(g.k309) }] : []),
      { label: 'Total', num: true, filter: false, get: (g) => g.iu + g.bau + g.mta + g.k309, html: (g) => `<b>${usd(g.iu + g.bau + g.mta + g.k309)}</b>` },
    ] });
  }

  // ---------- Laporan BAU & MTA (untuk klaim bulanan) ----------
  function bau(R, el) {
    const o = O(), grp = o.kind;
    const all = R.moves.filter((m) => m.grp === grp && m.date && inWK(m.wk));
    const months = [...new Set(all.map((m) => ym(m.date)))].sort();
    if (![...o.months].every((x) => months.includes(x))) o.months.clear();
    const list = all.filter((m) => (!o.months.size || o.months.has(ym(m.date))) && (o.valid === 'semua' || (o.valid === 'sah' ? m._bau && m._bau.valid : !(m._bau && m._bau.valid))));
    const claim = (m) => (R.ds && R.ds.claims.get(m)) || null;
    const grOf = (m) => { const a = m.po && R.gr.get(m.po); if (!a) return null; const b = a.filter((x) => !m._bau || !m._bau.dest || x.plant === m._bau.dest); return (b.length ? b : a).sort((x, y) => x.date - y.date)[0]; };
    const nUnknown = all.filter((m) => m._bau && !m._bau.dest).length;
    el.innerHTML = `<div class="filters"><span id="oKind"></span><span id="oValid"></span><span id="oMon"></span></div>
      ${nUnknown ? `<p class="tab-note"><b>${fmt(nUnknown, 0)} baris tujuannya tidak ada di MB51</b> (penerimaan di luar data), tetap dihitung BAU. Isi kolom Ke kalau tujuannya diketahui.</p>` : ''}
      <p class="tab-note">${grp === 'BAU' ? 'BAU = kirim barang ke plant lain lewat STO (Mvt 351), dikurangi pembatalannya (352). BAU lintas zona selalu dihitung. BAU sesama zona mengikuti pilihan di atas. Tujuan dibaca dari isian manual, lalu baris pasangan di Material Document yang sama, lalu kata kunci di header text; kalau tidak ketemu, dianggap diterima di luar MB51 dan dihitung BAU.' : 'MTA = barang keluar ke KKKS lain (Mvt 963), dikurangi pembatalannya (964). Selalu sah.'} Nilai USD dari MB51 (IDR ÷ kurs ${fmt(kursDS(), 0)}). "Klaim DS" = bagian yang memakai kuota deadstock.</p>
      <h4 class="sub-h">Rekap per bulan</h4><div id="oSum"></div><h4 class="sub-h">Detail per material</h4><div id="oDet"></div>`;
    UI.seg($('oKind'), [['BAU', 'BAU'], ['MTA', 'MTA']], grp, (v) => { o.kind = v; o.months.clear(); route(); });
    UI.seg($('oValid'), [['sah', 'Dihitung'], ['belum', 'Tidak dihitung'], ['semua', 'Semua']], o.valid, (v) => { o.valid = v; route(); });
    UI.multi($('oMon'), { label: 'Bulan', options: months.map((x) => ({ value: x, label: ymLabel(x) })), selected: o.months, onChange: () => route() });
    // rekap
    const g = new Map(); list.forEach((m) => { const b = m._bau || {}; const k = [ym(m.date), m.plant, b.dest || '', b.status || ''].join('|');
      const x = g.get(k) || g.set(k, { mo: ym(m.date), from: m.plant, to: b.dest || '', zf: b.zFrom || zonaOf(m.plant), zt: b.zTo || '', st: b.status || '', n: 0, mats: new Set(), v: 0, ds: 0 }).get(k);
      x.n++; x.mats.add(m.material); x.v += Math.sign(-m.qty) * usdOf(m); const c = claim(m); if (c) x.ds += c.usd; });
    UI.table($('oSum'), { id: 'opt-bau-sum-' + grp, rows: [...g.values()], name: `Rekap ${grp} per bulan`, sort: { i: 0, dir: 1 }, cols: [
      { label: 'Bulan', get: (x) => x.mo, html: (x) => ymLabel(x.mo) }, { label: 'Dari', get: (x) => pl(x.from) }, { label: 'Zona asal', get: (x) => x.zf },
      { label: 'Ke', get: (x) => pl(x.to) || 'Belum diketahui' }, { label: 'Zona tujuan', get: (x) => x.zt },
      { label: 'Baris', num: true, filter: false, get: (x) => x.n, html: (x) => fmt(x.n, 0) }, { label: 'Material', num: true, filter: false, get: (x) => x.mats.size, html: (x) => fmt(x.mats.size, 0) },
      { label: 'Nilai (MB51)', num: true, filter: false, get: (x) => x.v, html: (x) => usd(x.v) }, { label: 'Klaim DS', num: true, filter: false, get: (x) => x.ds, html: (x) => (x.ds ? usd(x.ds) : '') },
      { label: 'Status', get: (x) => x.st, html: (x) => `<span class="st ${/^Sah/.test(x.st) ? 'ok' : 'low'} wrap">${esc(x.st)}</span>` },
    ] });
    // detail
    const opts = DEST_OPTS();
    UI.table($('oDet'), { id: 'opt-bau-det-' + grp, rows: list.slice().sort((a, b) => a.date - b.date), name: `Laporan ${grp} per material`, match: (m, q) => hit([m.material, m.desc, m.header, m.po, m.matDoc, m.plant, m._bau && m._bau.dest].join(' '), expand(q)),
      placeholder: 'Cari material, plant, PO, atau keterangan…', cols: [
      { label: 'Tanggal', get: (m) => m.date, html: (m) => dstr(m.date), filter: false }, { label: 'Bulan', get: (m) => ymLabel(ym(m.date)), hide: true },
      { label: 'Dari', get: (m) => pl(m.plant) },
      { label: 'Ke', get: (m) => pl(m._bau && m._bau.dest) || 'Belum diketahui', html: (m) => { const b = m._bau || {}; if (grp === 'MTA') return 'KKKS lain';
          if (b.dest && b.how !== 'Manual') return esc(pl(b.dest));
          return `<select class="bdest" data-id="${esc(DS.moveId(m))}" aria-label="Plant tujuan"><option value="">Pilih tujuan…</option>${opts.map((p) => `<option value="${p}"${b.dest === p ? ' selected' : ''}>${esc(pl(p))}</option>`).join('')}</select>`; } },
      { label: 'Sumber tujuan', get: (m) => (m._bau && m._bau.how) || '', hide: true },
      { label: 'Status', get: (m) => (m._bau ? m._bau.status : ''), html: (m) => `<span class="st ${m._bau && m._bau.valid ? 'ok' : 'low'} wrap">${esc(m._bau ? m._bau.status : '')}</span>` },
      { label: 'Mvt', get: (m) => m.mt + (m.qty > 0 ? ' (batal)' : '') },
      { label: 'Material', nowrap: true, w: 1.3, get: (m) => m.material, html: (m) => `<a class="mono mlink" href="#" data-mat="${esc(m.material)}">${esc(m.material)}</a>` },
      { label: 'Deskripsi', wide: true, get: (m) => m.desc },
      { label: 'Qty', num: true, filter: false, get: (m) => -m.qty, html: (m) => fmt(-m.qty) + ' ' + esc(m.uom) },
      { label: 'Nilai (MB51)', num: true, filter: false, get: (m) => Math.sign(-m.qty) * usdOf(m), html: (m) => usd(Math.sign(-m.qty) * usdOf(m)) },
      { label: 'Klaim DS', num: true, filter: false, get: (m) => (claim(m) ? claim(m).usd : null), html: (m) => (claim(m) ? `${usd(claim(m).usd)}<span class="k-s">${fmt(claim(m).qty)} ${esc(m.uom)}</span>` : '') },
      { label: 'STO/PO', nowrap: true, get: (m) => m.po },
      { label: 'Diterima', get: (m) => { const r = grOf(m); return r ? r.date : null; }, html: (m) => { const r = grOf(m); return r ? `${dstr(r.date)}<span class="k-s">${esc(r.plant)}</span>` : grp === 'BAU' ? '<span class="muted">Belum GR</span>' : ''; }, filter: false },
      { label: 'Mat. Doc', nowrap: true, get: (m) => m.matDoc, hide: true }, { label: 'Keterangan', get: (m) => m.header }, { label: 'User', get: (m) => m.user, hide: true },
    ] });
    $('oDet').addEventListener('change', (e) => { const s = e.target.closest('select.bdest'); if (!s) return; const d = store.get('bauDest') || {}; if (s.value) d[s.dataset.id] = s.value; else delete d[s.dataset.id]; store.set('bauDest', d); route(); });
  }
})();
