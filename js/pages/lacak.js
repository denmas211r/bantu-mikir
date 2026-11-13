// ============ Halaman Lacak Material ============
// Bagian dari web MIM. Dimuat sesudah js/app.js (fungsi bersama ada di sana) dan sebelum js/views.js.

PAGES.lacak = function () {
  const q0 = sessionStorage.getItem('lacakQ') || S.lacakQ || ''; sessionStorage.removeItem('lacakQ');
  const have = [S.me2n && 'ME2N', S.mb51 && 'MB51', S.mb25 && 'MB25', S.mb52 && 'MB52', S.mrpRes && 'MRP'].filter(Boolean);
  $('view').innerHTML = `<div class="panel"><div class="lacak-bar"><input id="lq" type="search" aria-label="Kata kunci" placeholder="Kode material, No. PO/RO, No. PR, No. OA, atau No. reservasi" value="${esc(q0)}"><button class="btn primary" id="lgo">Lacak</button></div>
    <p class="muted small">Data yang dimuat: ${have.length ? have.join(', ') : 'belum ada'}.</p></div><div id="lres"></div>`;
  const go = () => {
    const q = $('lq').value.trim(); S.lacakQ = q; if (!q) { $('lres').innerHTML = ''; return; }
    const out = [];
    // 1) dokumen PO/RO atau PR
    const poLines = S.me2n ? S.me2n.lines.filter((l) => l.doc === q || l.pr === q || l.oa === q) : [];
    poLines.sort((a, b) => (b.docDate || 0) - (a.docDate || 0));
    const isOA = !!(S.me3n && S.me3n.docs.has(q));
    const resvLines = S.mb25 ? S.mb25.lines.filter((l) => l.resv === q) : [];
    const resvMoves = S.mb51 ? S.mb51.moves.filter((m) => m.resv === q) : [];
    let mats = new Set();
    if (poLines.length) {
      const shown = poLines.slice(0, 100);
      out.push(`<div class="panel"><h3>Dokumen ${esc(q)}${isOA ? ` <a href="#" class="btn oalink" data-oa="${esc(q)}">Buka kontrak</a>` : ''}</h3>${poLines.length > shown.length ? `<p class="muted small">${fmt(poLines.length, 0)} baris, tampil 100 terbaru. Semua RO ada di pop-up kontrak (bisa dicari dan diunduh).</p>` : ''}` + plainTable(shown, [...docCols(), ['Plant', (l) => esc(l.plant)],
        ['Material', (l) => `<a href="#" class="mono lm" data-m="${esc(l.material)}">${esc(l.material)}</a>`], ['Deskripsi', (l) => esc(l.desc)], ['Qty', (l) => fmt(l.qty) + ' ' + esc(l.uom), 'num'], ['Sisa kirim', (l) => fmt(l.openQty), 'num'],
        ['Jadwal', (l) => dstr(l.delivery)], ['GR (MB51)', (l) => { const g = S.mb51 && S.mb51.gr.get(l.doc + '|' + String(+l.item || l.item)); return g ? `Tiba ${fmt(g.inQty)}, rilis ${fmt(g.relQty)}` : ''; }], ['Vendor', (l) => esc(l.vendor)]]) + '</div>');
      if (!isOA) poLines.forEach((l) => mats.add(l.material + '|' + l.plant)); // OA bisa punya ratusan RO: rinciannya di pop-up kontrak
    } else if (isOA) out.push(`<div class="panel"><h3>Kontrak ${esc(q)}</h3><p class="muted">Belum ada RO dari OA ini di ME2N. <a href="#" class="oalink" data-oa="${esc(q)}">Buka kontrak</a></p></div>`);
    if (resvLines.length || resvMoves.length) {
      out.push(`<div class="panel"><h3>Reservasi ${esc(q)}</h3>` + (resvLines.length ? plainTable(resvLines, [['Item', (l) => esc(l.item)], ['Plant', (l) => esc(l.plant)], ['Material', (l) => `<a href="#" class="mono lm" data-m="${esc(l.material)}">${esc(l.material)}</a>`], ['Deskripsi', (l) => esc(l.desc)],
        ['Butuh', (l) => dstr(l.reqDate)], ['Diminta', (l) => fmt(l.reqQty), 'num'], ['Sudah GI', (l) => fmt(l.removed), 'num'], ['Sisa', (l) => fmt(l.diff), 'num'], ['Penerima', (l) => esc(l.recipient || l.costCenter)]]) : '<p class="muted">Tidak ada di MB25 (mungkin sudah selesai).</p>') +
        (resvMoves.length ? '<h4>GI dari gudang (MB51)</h4>' + plainTable(resvMoves, [['Tanggal', (m) => dstr(m.date)], ['Mvt', (m) => esc(m.mt + ' ' + m.mtText)], ['Material', (m) => esc(m.material)], ['Qty', (m) => fmt(m.qty) + ' ' + esc(m.uom), 'num'], ['Dok. material', (m) => esc(m.matDoc)], ['Keterangan', (m) => esc(m.header)]]) : '') + '</div>');
      resvLines.forEach((l) => mats.add(l.material + '|' + l.plant));
    }
    // 2) material
    const isMat = (S.mb52 && S.mb52.items.some((i) => i.material === q)) || (S.mrpRes && [...S.mrpRes.values()].some((r) => r.material === q)) || (S.me2n && S.me2n.lines.some((l) => l.material === q)) || (S.mb51 && S.mb51.moves.some((m) => m.material === q));
    if (isMat) mats = new Set([q + '|']);
    if (!out.length && !isMat) { $('lres').innerHTML = `<div class="panel empty">Tidak ditemukan di data yang dimuat.</div>`; return; }
    const evs = [];
    for (const key of mats) {
      const [mat, plant] = key.split('|');
      const ev = Trace.traceMaterial(mat, plant || null, { me2n: S.me2n, mb51: S.mb51, mb25: S.mb25 });
      const stockRows = S.mb52 ? S.mb52.items.filter((i) => i.material === mat && (!plant || i.plant === plant)) : [];
      const mrpRows = S.mrpRes ? [...S.mrpRes.values()].filter((r) => r.material === mat && (!plant || r.plant === plant)) : [];
      const desc = (stockRows[0] && stockRows[0].desc) || (mrpRows[0] && mrpRows[0].desc) || (ev[0] && '') || '';
      const docs = !poLines.length && S.me2n ? S.me2n.lines.filter((l) => l.material === mat && (!plant || l.plant === plant) && !l.deleted).sort((a, b) => (b.docDate || 0) - (a.docDate || 0)) : [];
      out.push(`<div class="panel"><h3>Material <span class="mono">${esc(mat)}</span>${plant ? ' · ' + esc(plantLabel(plant)) : ''}</h3><p class="muted">${esc(desc)}</p>
        <div class="grid">${stockRows.length ? `<div><b>Stok sekarang (MB52)</b>${plainTable(stockRows, [['Plant', (i) => esc(i.plant)], ['Unrestricted', (i) => fmt(i.sohNormal != null ? i.sohNormal : i.soh) + ' ' + esc(i.uom), 'num'], ['Val. type lain', (i) => (i.sohOther ? fmt(i.sohOther) : ''), 'num'], ['In transit', (i) => (i.transit ? fmt(i.transit) : ''), 'num'], ['Nilai', (i) => money(i.value, stockCur(i.plant)), 'num']])}</div>` : ''}
        ${mrpRows.length ? `<div><b>MRP</b>${plainTable(mrpRows, [['Plant', (r) => esc(r.plant)], ['Aging', (r) => agingPill(r.aging)], ['Min', (r) => fmt(r.min2), 'num'], ['Max', (r) => fmt(r.max2), 'num'], ['OS PO', (r) => fmt(r.ospo), 'num'], ['Reservasi', (r) => fmt(r.mb25), 'num'], ['To Order', (r) => calcA(r, fmt(r.toOrder)), 'num'], ['Kontrak', (r) => oaLink(r.oa)]])}</div>` : ''}</div>
        ${docs.length ? `<h4>PR, PO/RO, dan OA (${fmt(docs.length, 0)})</h4>${plainTable(docs, [...docCols(), ['Plant', (l) => esc(l.plant)], ['Tgl dokumen', (l) => dstr(l.docDate)], ['Qty', (l) => fmt(l.qty) + ' ' + esc(l.uom), 'num'], ['Sisa kirim', (l) => fmt(l.openQty), 'num'], ['Jadwal', (l) => dstr(l.delivery)], ['Vendor', (l) => esc(l.vendor)]])}` : ''}
        <h4>Jejak (${fmt(ev.length, 0)} kejadian)</h4>${ev.length ? `<div class="lac-ev" data-i="${evs.push(ev) - 1}" data-k="${esc(key)}"></div>` : '<p class="muted">Belum ada kejadian di ME2N/MB51/MB25.</p>'}</div>`);
    }
    $('lres').innerHTML = out.join('');
    // jejak kejadian sebagai tabel: bisa difilter, diurutkan, dan dicari per kolom
    document.querySelectorAll('#lres .lac-ev').forEach((el) => UI.table(el, { id: 'lacak-ev:' + el.dataset.k, rows: evs[+el.dataset.i], name: 'Jejak material', pageSize: 25, sort: { i: 0, dir: -1 }, cols: [
      { label: 'Tanggal', nowrap: true, get: (e) => e.date, html: (e) => dstr(e.date) },
      { label: 'Jenis', get: (e) => e.step, html: (e) => pill(e.step, { PR: 'mute', PO: 'info', RO: 'info', 'GR (inspeksi)': 'warn', 'GR (rilis stok)': 'ok', Reservasi: 'warn', GI: 'low', Transfer: 'mute' }[e.step] || 'mute') },
      { label: 'Plant', get: (e) => e.plant },
      { label: 'Dokumen', nowrap: true, get: (e) => e.doc },
      { label: 'Keterangan', wide: true, get: (e) => e.text },
      { label: 'Qty', num: true, get: (e) => e.qty, html: (e) => `<span class="${e.qty < 0 ? 'neg' : ''}">${fmt(e.qty)}</span>` },
      { label: 'UoM', get: (e) => e.uom },
    ] }));
    document.querySelectorAll('#lres .lm').forEach((a) => (a.onclick = (e) => { e.preventDefault(); $('lq').value = a.dataset.m; go(); }));
  };
  $('lgo').onclick = go; $('lq').onkeydown = (e) => { if (e.key === 'Enter') go(); }; go();
};
