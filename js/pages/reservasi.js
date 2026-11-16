// ============ Reservasi (MB25 × MB51) ============
// Satu baris per item reservasi MB25, digabung dengan pengambilan barangnya di MB51 (nomor reservasi sama).
// Terbuka = belum final issue, tidak dihapus, masih ada sisa → ini yang dipakai di hitungan MRP dan timeline.
// Selesai/ditutup = arsip (hanya catatan), tampil kalau dicentang.
PAGES.resv = function () {
  if (!S.mb25) { $('view').innerHTML = needFile('file MB25', 'Reservasi dibaca dari MB25. MB51 (opsional) dipakai untuk melihat kapan dan berapa barang reservasi sudah diambil.'); return; }
  const R = S.rf || (S.rf = { arc: false, plant: new Set() });
  const t0 = new Date(); t0.setHours(0, 0, 0, 0);
  // pengambilan per reservasi + material dari MB51
  const take = new Map();
  if (S.mb51) S.mb51.moves.forEach((m) => { if (!m.resv) return; const k = m.resv + '|' + m.material, g = take.get(k) || take.set(k, { qty: 0, n: 0, last: null, docs: [] }).get(k);
    g.qty -= m.qty; g.n++; if (m.date && (!g.last || m.date > g.last)) g.last = m.date; if (g.docs.length < 8) g.docs.push(`${dstr(m.date)} ${m.mt} ${fmt(m.qty)}`); });
  const rows = S.mb25.lines.map((l) => {
    const open = resvOpen(l), late = open && l.reqDate && l.reqDate < t0;
    const st = open ? (late ? 'Terbuka, lewat tgl butuh' : 'Terbuka') : l.deleted ? 'Dihapus' : l.finalIssue && l.diff > 0 ? 'Ditutup (final issue)' : 'Terpenuhi';
    return { l, open, st, tk: take.get(l.resv + '|' + l.material) || null };
  });
  const plants = [...new Set(rows.map((x) => x.l.plant))].filter(Boolean).sort();
  const nOpen = rows.filter((x) => x.open).length, nLate = rows.filter((x) => x.st === 'Terbuka, lewat tgl butuh').length;
  $('view').innerHTML = `<p class="tab-note">${fmt(nOpen, 0)} item terbuka (${fmt(nLate, 0)} sudah lewat tanggal butuh), ${fmt(rows.length - nOpen, 0)} item selesai/ditutup sebagai arsip. Hanya yang terbuka dihitung di MRP dan timeline.${S.mb51 ? '' : ' MB51 belum dimuat, jadi kolom pengambilan diisi dari MB25.'}</p>
    <div class="filters"><span id="rPl"></span><label class="chk"><input type="checkbox" id="rArc"${R.arc ? ' checked' : ''}> Tampilkan arsip (selesai/ditutup)</label></div><div id="rBody"></div>`;
  const draw = () => {
    const list = rows.filter((x) => (R.arc || x.open) && (!R.plant.size || R.plant.has(x.l.plant))).sort((a, b) => b.open - a.open || (a.l.reqDate || 0) - (b.l.reqDate || 0));
    UI.table($('rBody'), { id: 'mb25-reader', minWidth: 1400, rows: list, name: 'Reservasi MB25', rowKey: (x) => x.l.material, onRow: (k) => openMaterial(k),
      match: (x, q) => hit([x.l.resv, x.l.material, x.l.desc, x.l.recipient, x.l.costCenter, x.l.wbs, x.l.network, x.l.user].join(' '), expand(q)), placeholder: 'Cari reservasi, material, penerima, WBS…', cols: [
        { label: 'Status', get: (x) => x.st, html: (x) => pill(x.st, x.st === 'Terbuka' ? 'info' : x.open ? 'low' : 'mute') },
        { label: 'Reservasi', nowrap: true, get: (x) => x.l.resv, html: (x) => `<span class="mono">${esc(x.l.resv)}</span>${x.l.item ? `<span class="muted small">/${esc(x.l.item)}</span>` : ''}` },
        { label: 'Plant', get: (x) => x.l.plant },
        { label: 'Mvt', get: (x) => x.l.mt },
        { label: 'Material', nowrap: true, get: (x) => x.l.material, html: (x) => `<span class="mono">${esc(x.l.material)}</span>` },
        { label: 'Deskripsi', wide: true, get: (x) => x.l.desc },
        { label: 'Tgl butuh', nowrap: true, get: (x) => x.l.reqDate, html: (x) => dstr(x.l.reqDate) },
        { label: 'Diminta', num: true, filter: false, get: (x) => x.l.reqQty, html: (x) => fmt(x.l.reqQty) },
        { label: 'Diambil', num: true, filter: false, get: (x) => (x.tk ? x.tk.qty : x.l.removed), html: (x) => (x.tk ? `<span class="tip-u" title="${esc(x.tk.docs.join('\n'))}">${fmt(x.tk.qty)}</span>` : fmt(x.l.removed)) },
        { label: 'Sisa', num: true, filter: false, get: (x) => (x.open ? x.l.diff : 0), html: (x) => (x.open ? `<b>${fmt(x.l.diff)}</b>` : '<span class="muted">0</span>') },
        { label: 'UoM', get: (x) => x.l.uom, hide: true },
        { label: 'Terakhir diambil', nowrap: true, get: (x) => (x.tk ? x.tk.last : null), html: (x) => (x.tk ? dstr(x.tk.last) : '') },
        { label: 'Gerakan MB51', num: true, filter: false, get: (x) => (x.tk ? x.tk.n : 0), html: (x) => (x.tk ? fmt(x.tk.n, 0) : '') },
        { label: 'Penerima', get: (x) => x.l.recipient || x.l.costCenter || '' },
        { label: 'WBS / Network', get: (x) => x.l.wbs || x.l.network || '' },
        { label: 'User', get: (x) => x.l.user, hide: true },
      ] });
  };
  $('rArc').onchange = (e) => { R.arc = e.target.checked; draw(); };
  UI.multi($('rPl'), { label: 'Plant', options: plants.map((p) => ({ value: p, label: plantLabel(p) })), selected: R.plant, onChange: draw });
  draw();
};
