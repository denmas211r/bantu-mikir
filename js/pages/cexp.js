// ============ Contract & Expediting: Kontrak (kartu), Pesanan (PO/RO dan Reservasi) ============
// Pola halaman standar (js/tbl.js): baris filter -> kartu ringkas -> daftar. Detail lengkap di pop-up; data mentah SAP di Sumber Data > Data.
// Memakai data mesin lama (S.me3n, S.me2n, S.mb25, S.mb51). Ambang: kontrak hampir habis <= 90 hari, sisa nilai < 20%.
(function () {
  const empty = (what, hint) => ($('view').innerHTML = needFile(what, hint));
  const t0 = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  window.KX = {};

  // ---------- Kontrak (ME3N) ----------
  // Status kontrak (warna: Hampir habis = merah, Sisa nilai < 20% = kuning, Aktif = hijau, Habis = abu-abu)
  const K_ST = { aktif: ['Aktif', 'ok'], soon: ['Hampir habis', 'low'], low: ['Sisa nilai < 20%', 'warn'], habis: ['Habis', 'mute'] };
  const kSt = (d) => (!d.aktif || d.sisa <= 0 ? 'habis' : d.sisaHari != null && d.sisaHari <= 90 ? 'soon' : d.pctSisa < 0.2 ? 'low' : 'aktif');
  Object.assign(KX, { K_ST, kSt });
  PAGES.kontrak = function () {
    if (!S.me3n) return empty('file kontrak ME3N', 'Taruh file ME3N di folder data, atau upload di Sumber Data.');
    const F = (S.fk = S.fk || { q: '', st: new Set() }), docs = [...S.me3n.docs.values()], txt = new Map();
    S.me3n.items.forEach((i) => txt.set(i.doc, (txt.get(i.doc) || '') + ' ' + i.material + ' ' + i.desc));
    $('view').innerHTML = '<div id="fb"></div><div id="kp"></div><div id="tb"></div>';
    let shown = 60; MP.zonaHook = () => PAGES.kontrak();
    const draw = () => {
      const base = docs.filter((d) => T.match([d.doc, d.vendor, d.pic, d.kel, txt.get(d.doc)].join(' '), F.q)), n = (k) => base.filter((d) => kSt(d) === k).length;
      $('kp').innerHTML = T.kpis([['Aktif', fmt(n('aktif'), 0), 'masih berlaku', 'k-ok', 'aktif'], ['Hampir habis', fmt(n('soon'), 0), 'berakhir ≤ 90 hari', 'k-low', 'soon'], ['Sisa nilai < 20%', fmt(n('low'), 0), 'perlu amandemen', 'k-min', 'low'], ['Habis', fmt(n('habis'), 0), 'lewat masa / nilai habis', '', 'habis']]);
      T.bindKpis($('kp'), F, 'st', () => { shown = 60; draw(); });
      const list = base.filter((d) => T.has(F, 'st', kSt(d))).sort((a, b) => (a.sisaHari ?? 1e9) - (b.sisaHari ?? 1e9));
      if (!list.length) { $('tb').innerHTML = '<div class="hint">Tidak ada kontrak pada filter ini.</div>'; return; }
      $('tb').innerHTML = `<div class="kcards">${list.slice(0, shown).map((d) => { const s = K_ST[kSt(d)], used = d.target > 0 ? Math.max(0, Math.min(100, (1 - d.pctSisa) * 100)) : 0;
        return `<button type="button" class="kcard" data-oa="${esc(d.doc)}"><div class="k1"><b>${esc(d.doc)}</b>${T.pill(s[0], s[1])}</div><div class="kv2" title="${esc(d.vendor)}">${esc(d.vendor || '-')}</div><div class="kg">${esc(d.kel || '')}${d.pic ? ' · ' + esc(d.pic) : ''}</div>
          <div class="bar" title="Terpakai ${fmt(used, 0)}%"><i style="width:${used.toFixed(1)}%"></i></div>
          <div class="k3"><span>Sisa <b>${esc(money(d.sisa, d.currency))}</b> (${fmt(d.pctSisa * 100, 0)}%)</span><span>${d.end ? esc(dstr(d.end)) : '-'}${d.sisaHari != null && d.aktif ? ' · <b>' + fmt(d.sisaHari, 0) + ' hari</b>' : ''}</span></div></button>`; }).join('')}</div>
        ${list.length > shown ? `<button type="button" class="btn more" id="kMore">Tampilkan ${fmt(Math.min(60, list.length - shown), 0)} lagi (dari ${fmt(list.length, 0)})</button>` : ''}`;
      $('tb').querySelectorAll('.kcard').forEach((c) => (c.onclick = () => KX.contract(c.dataset.oa)));
      if ($('kMore')) $('kMore').onclick = () => { shown += 60; draw(); };
    };
    T.filters($('fb'), { q: 'Cari nomor OA, vendor, atau nama barang. Contoh: laker, gasket', selects: [{ key: 'st', label: 'Status', def: ['aktif', 'soon', 'low'], options: [['aktif', 'Aktif'], ['soon', 'Hampir habis'], ['low', 'Sisa nilai < 20%'], ['habis', 'Habis']] }] }, F, () => { shown = 60; draw(); });
    draw();
  };
  KX.contract = function (doc) {
    const d = S.me3n && S.me3n.docs.get(doc); if (!d) return;
    const its = S.me3n.items.filter((i) => i.doc === doc), calls = S.me2n ? S.me2n.lines.filter((l) => l.oa === doc && !l.deleted).sort((a, b) => (b.docDate || 0) - (a.docDate || 0)) : null, s = K_ST[kSt(d)];
    const body = UI.drawer(`<div class="mhead"><h2>${esc(d.vendor || 'OA ' + doc)}</h2><div class="meta"><span class="mono">OA ${esc(doc)}</span>${d.pic ? `<span>${esc(d.pic)}</span>` : ''}${T.pill(s[0], s[1])}</div></div>
      ${T.kpis([['Nilai kontrak', esc(money(d.target, d.currency)), dstr(d.start) + ' s.d. ' + dstr(d.end)], ['Terpakai', esc(money(d.released, d.currency)), fmt((1 - d.pctSisa) * 100, 0) + '%'], ['Sisa nilai', esc(money(d.sisa, d.currency)), fmt(d.pctSisa * 100, 0) + '%', d.pctSisa < 0.2 ? 'k-min' : ''], ['Sisa hari', d.sisaHari != null ? fmt(d.sisaHari, 0) : '–', 'sampai berakhir', d.sisaHari != null && d.sisaHari <= 90 ? 'k-low' : '']])}
      <div class="seg-bar"><span id="kdSeg"></span></div><div id="kdBody"></div>`, { wide: true, label: 'Kontrak ' + doc });
    const show = (k) => {
      UI.seg(body.querySelector('#kdSeg'), [['item', `Item (${fmt(its.length, 0)})`], ['his', `PO/RO dari kontrak (${calls ? fmt(calls.length, 0) : '–'})`]], k, show);
      const box = body.querySelector('#kdBody');
      if (k === 'item') T.table(box, { rows: its, pageSize: 10, name: 'OA_' + doc + '_Item', onRow: (i) => i.material && MP.detail(i.material), cols: [{ label: 'Item', w: 0.6, get: (i) => i.item }, { label: 'Material', w: 3, get: (i) => i.desc, html: (i) => T.two(i.desc, i.material + ' · ' + (i.uom || '')) },
        { label: 'Harga', type: 'num', w: 1.1, get: (i) => i.price, html: (i) => esc(money(i.price, d.currency)) }, { label: 'Target qty', type: 'num', w: 0.9, get: (i) => i.targetQty }, { label: 'Terpakai', type: 'num', w: 0.9, get: (i) => i.releasedQty }, { label: 'Sisa qty', type: 'num', w: 0.9, get: (i) => i.openQty }] });
      else if (!calls) box.innerHTML = '<div class="hint">Butuh file ME2N untuk melihat PO/RO dari kontrak ini.</div>';
      else T.table(box, { rows: calls, pageSize: 10, name: 'OA_' + doc + '_PO_RO', onRow: (l) => l.material && MP.detail(l.material, l.plant), cols: [{ label: 'Tgl dokumen', type: 'date', w: 0.9, get: (l) => l.docDate }, { label: 'Dokumen', w: 1.1, get: (l) => l.doc + '/' + l.item },
        { label: 'Plant', w: 0.6, get: (l) => l.plant }, { label: 'Material', w: 2.6, get: (l) => l.desc, html: (l) => T.two(l.desc, l.material) }, { label: 'Nilai', type: 'num', w: 1.1, get: (l) => l.value, html: (l) => esc(money(l.value, l.currency)) }, { label: 'Sisa kirim', type: 'num', w: 0.8, get: (l) => l.openQty },
        { label: 'Status', type: 'status', w: 1, get: (l) => PO_ST[poSt(l)][0], html: (l) => T.pill(...PO_ST[poSt(l)]) }] });
    };
    show('item');
  };

  // ---------- Pesanan: PO/RO (ME2N) dan Reservasi (MB25) ----------
  const PO_ST = { late: ['Terlambat', 'low'], open: ['Berjalan', 'info'], done: ['Selesai', 'ok'], del: ['Dihapus', 'mute'] };
  const poSt = (l) => (l.deleted ? 'del' : l.openQty > 0 ? (l.lateDays > 0 ? 'late' : 'open') : 'done');
  const RV_ST = { late: ['Lewat tgl butuh', 'low'], open: ['Terbuka', 'info'], done: ['Selesai', 'ok'], del: ['Dihapus', 'mute'] };
  const rvSt = (l) => (l.deleted ? 'del' : resvOpen(l) ? (l.reqDate && l.reqDate < t0() ? 'late' : 'open') : 'done');
  Object.assign(KX, { PO_ST, poSt, RV_ST, rvSt });
  PAGES.po = function () {
    const tab = S.psTab === 'resv' ? 'resv' : 'po'; MP.zonaHook = () => PAGES.po();
    $('view').innerHTML = '<div class="seg-bar"><span id="psTab"></span></div><div id="fb"></div><div id="kp"></div><div id="tb"></div>';
    UI.seg($('psTab'), [['po', 'PO / RO'], ['resv', 'Reservasi']], tab, (v) => { S.psTab = v; PAGES.po(); });
    const isPO = tab === 'po', src = isPO ? S.me2n && S.me2n.lines : S.mb25 && S.mb25.lines;
    if (!src) { $('tb').innerHTML = needFile(isPO ? 'file ME2N' : 'file MB25', isPO ? 'PO dan RO dibaca dari ME2N.' : 'Reservasi dibaca dari MB25.'); return; }
    const F = isPO ? (S.fp = S.fp || { q: '', plant: new Set(), from: '', to: '', st: new Set() }) : (S.fr = S.fr || { q: '', plant: new Set(), from: '', to: '', st: new Set() });
    const ST = isPO ? PO_ST : RV_ST, stOf = isPO ? poSt : rvSt, dOf = isPO ? (l) => l.delivery : (l) => l.reqDate;
    const draw = () => {
      const base = src.filter((l) => G.zonaOk(l.plant) && T.has(F, 'plant', l.plant) && T.inRange(dOf(l), F) && T.match(isPO ? [l.doc, l.vendor, l.material, l.desc, l.pr, l.oa].join(' ') : [l.resv, l.material, l.desc, l.recipient, l.costCenter, l.wbs].join(' '), F.q));
      const soon = new Date(+t0() + 30 * 864e5), dueSoon = (l) => stOf(l) === 'open' && l.delivery && l.delivery <= soon, n = (k) => base.filter((l) => stOf(l) === k).length;
      $('kp').innerHTML = T.kpis(isPO
        ? [['Berjalan', fmt(n('open'), 0), 'belum diterima penuh', '', 'open'], ['Terlambat', fmt(n('late'), 0), 'lewat jatuh tempo', 'k-low', 'late'], ['Jatuh tempo ≤ 30 hari', fmt(base.filter(dueSoon).length, 0), 'segera dipantau', 'k-min', 'due'], ['Selesai', fmt(n('done'), 0), 'sudah diterima', 'k-ok', 'done']]
        : [['Terbuka', fmt(n('open'), 0), 'belum diambil', '', 'open'], ['Lewat tgl butuh', fmt(n('late'), 0), 'belum diambil', 'k-low', 'late'], ['Selesai', fmt(n('done'), 0), 'sudah diambil / ditutup', 'k-ok', 'done'], ['Dihapus', fmt(n('del'), 0), 'tidak dihitung', '', 'del']]);
      T.bindKpis($('kp'), F, 'st', draw);
      const rows = base.filter((l) => !F.st.size || [...F.st].some((k) => (k === 'due' ? dueSoon(l) : stOf(l) === k))).sort((a, b) => (dOf(a) || 0) - (dOf(b) || 0));
      const stCol = { label: 'Status', type: 'status', w: 1.1, get: (l) => ST[stOf(l)][0], html: (l) => T.pill(...ST[stOf(l)]) }, mat = { label: 'Material', w: 2.8, get: (l) => l.desc, html: (l) => T.two(l.desc || l.material, l.material) };
      T.table($('tb'), isPO
        ? { rows, name: 'PO_RO', empty: 'Tidak ada PO/RO pada filter ini.', onRow: (l) => l.material && MP.detail(l.material, l.plant), cols: [{ label: 'Dokumen', w: 1.2, get: (l) => l.doc + '/' + l.item, html: (l) => T.two(l.doc + '/' + l.item, l.type) }, mat,
          { label: 'Vendor', w: 2, get: (l) => l.vendor }, { label: 'Plant', w: 0.6, get: (l) => l.plant }, { label: 'Jatuh tempo', type: 'date', w: 0.9, get: (l) => l.delivery }, { label: 'Sisa', type: 'num', w: 0.7, get: (l) => l.openQty }, stCol] }
        : { rows, name: 'Reservasi', empty: 'Tidak ada reservasi pada filter ini.', onRow: (l) => KX.resv(l), cols: [{ label: 'Reservasi', w: 1.1, get: (l) => l.resv + '/' + l.item }, mat, { label: 'Plant', w: 0.6, get: (l) => l.plant },
          { label: 'Tgl butuh', type: 'date', w: 0.9, get: (l) => l.reqDate }, { label: 'Sisa', type: 'num', w: 0.7, get: (l) => (resvOpen(l) ? l.diff : 0) }, { label: 'Penerima', w: 1.8, get: (l) => l.recipient || l.costCenter || l.wbs || '' }, stCol] });
    };
    T.filters($('fb'), { q: isPO ? 'Cari nomor PO/RO, vendor, atau nama barang. Contoh: 4500012345, bearing' : 'Cari nomor reservasi, penerima, atau nama barang', plants: [...new Set(src.map((l) => l.plant))].filter((p) => G.zonaOk(p)).sort(), dates: true,
      selects: [{ key: 'st', label: 'Status', def: ['open', 'late'], options: Object.entries(ST).map(([k, v]) => [k, v[0]]).concat(isPO ? [['due', 'Jatuh tempo ≤ 30 hari']] : []) }] }, F, draw);
    draw();
  };
  KX.resv = function (l) {
    const s = RV_ST[rvSt(l)], mv = S.mb51 ? S.mb51.moves.filter((m) => m.resv === l.resv && m.material === l.material).sort((a, b) => (b.date || 0) - (a.date || 0)) : null;
    const body = UI.drawer(`<div class="mhead"><h2>${esc(l.desc || l.material)}</h2><div class="meta"><span class="mono">Reservasi ${esc(l.resv)}/${esc(l.item)}</span><span>${esc(plantLabel(l.plant))}</span>${T.pill(s[0], s[1])}</div></div>
      ${T.kpis([['Diminta', fmt(l.reqQty) + ' <small>' + esc(l.uom || '') + '</small>', 'tgl butuh ' + dstr(l.reqDate)], ['Sudah diambil', fmt(l.removed), 'MB25'], ['Sisa', fmt(resvOpen(l) ? l.diff : 0), '', resvOpen(l) ? 'k-min' : ''], ['Penerima', esc(l.recipient || l.costCenter || '-'), l.wbs || '']])}
      <div class="blk-h"><h3>Pengambilan di MB51</h3></div><div id="rvd"></div>`, { wide: true, label: 'Reservasi' });
    const box = body.querySelector('#rvd');
    if (!mv) { box.innerHTML = '<div class="hint">MB51 belum dimuat.</div>'; return; }
    T.table(box, { rows: mv, pageSize: 10, empty: 'Belum ada gerakan MB51 untuk reservasi ini.', cols: [{ label: 'Tanggal', type: 'date', w: 0.9, get: (m) => m.date }, { label: 'Plant', w: 0.6, get: (m) => m.plant }, { label: 'Mvt', w: 1.6, get: (m) => m.mt + ' ' + (m.mtText || '') },
      { label: 'Qty', type: 'num', w: 0.8, get: (m) => m.qty }, { label: 'Dokumen', w: 1, get: (m) => m.matDoc }, { label: 'Keterangan', w: 2, get: (m) => m.header }] });
  };
})();
