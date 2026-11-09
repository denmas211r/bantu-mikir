// ============ Jejak material: MB51 (pergerakan) & MB25 (reservasi) + Expediting PO/RO ============
// Rantai: PR → PO/RO (ME2N) → GR gudang (MB51 103 = terima ke blocked/inspeksi, 105 = rilis ke stok; 104/106 = batal)
//         → stok (MB52) → reservasi (MB25) → GI (MB51 291/949/963/261/201/221, nomor reservasi sama)
(function (root) {
  const s = (v) => (v == null ? '' : String(v).trim());
  const n = (v) => { const x = typeof v === 'number' ? v : Number(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(x) ? x : 0; };
  const toDate = (v, XLSX) => {
    if (v instanceof Date) return v;
    if (typeof v === 'number' && XLSX) { const d = XLSX.SSF.parse_date_code(v); return d ? new Date(d.y, d.m - 1, d.d) : null; }
    const t = s(v); if (!t) return null; const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    const d = m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(t); return isNaN(d) ? null : d;
  };
  const stripItem = (v) => String(+s(v) || s(v)); // "00010" → "10"
  function sheet(XLSX, buf, must) {
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    const a = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
    const hi = a.findIndex((r) => r && must.every((m) => r.map(s).includes(m)));
    if (hi < 0) throw new Error('Kolom wajib tidak ditemukan: ' + must.join(', '));
    const H = a[hi].map(s); return { rows: a.slice(hi + 1), c: (k) => H.indexOf(k) };
  }
  const GI_TYPES = new Set(['201', '202', '221', '222', '261', '262', '291', '292', '949', '950', '963', '964']);
  const GR_IN = { '101': 1, '102': -1, '103': 1, '104': -1 }, GR_REL = { '105': 1, '106': -1, '101': 1, '102': -1 };

  function parseMB51(XLSX, buf) {
    const { rows, c } = sheet(XLSX, buf, ['Movement Type', 'Material', 'Posting Date']);
    const moves = [];
    for (const r of rows) {
      const mt = s(r[c('Movement Type')]); if (!mt) continue;
      moves.push({ plant: s(r[c('Plant')]), sloc: s(r[c('Storage Location')]), mt, mtText: s(r[c('Movement Type Text')]), po: s(r[c('Purchase Order')]), poItem: stripItem(r[c('Item')]),
        material: s(r[c('Material')]), desc: s(r[c('Material Description')]), qty: n(r[c('Quantity')]), uom: s(r[c('Unit of Entry')]) || s(r[c('Base Unit of Measure')]), amount: n(r[c('Amount in LC')]), cur: s(r[c('Currency')]),
        date: toDate(r[c('Posting Date')], XLSX), resv: s(r[c('Reservation')]).replace(/^0$/, ''), header: s(r[c('Document Header Text')]), user: s(r[c('User name')]),
        ref: s(r[c('Reference')]), matDoc: s(r[c('Material Document')]), year: s(r[c('Material Doc. Year')]), time: s(r[c('Time of Entry')]), batch: s(r[c('Batch')]) });
    }
    return finishMB51(moves);
  }

  // Kunci unik satu baris MB51 (untuk membuang baris dobel saat beberapa file MB51 digabung)
  const mb51Key = (m) => [m.year, m.matDoc, m.material, m.plant, m.sloc, m.mt, m.qty, m.amount, m.po, m.poItem, m.time, m.batch].join('|');
  // Gabung beberapa file MB51 (mis. upload bulanan). Baris yang sama di beberapa file dihitung sekali;
  // baris kembar yang sah di satu file (jumlahnya) tetap dipertahankan.
  function mergeMB51(list) {
    const best = new Map();
    list.forEach((moves) => { const g = new Map(); moves.forEach((m) => { const k = mb51Key(m); (g.get(k) || g.set(k, []).get(k)).push(m); });
      g.forEach((arr, k) => { const o = best.get(k); if (!o || arr.length > o.length) best.set(k, arr); }); });
    return finishMB51([...best.values()].flat());
  }

  const TRF = new Set(['301', '302', '303', '304', '305', '306', '311', '312', '351', '352', '641', '642', '643', '644']);
  function finishMB51(moves) {
    // kategori Mvt (Own Use, PO/RO, Trf, MTA, BAU, Return, …) dari tabel referensi
    const MS = root.Master || (typeof Master !== 'undefined' ? Master : null);
    if (MS) moves.forEach((m) => { const k = MS.mvtKey(m); m.mkey = k.key; m.cat = k.cat; m.grp = k.grp; });
    // pasangan transfer antar plant: satu Material Document berisi baris minus (plant asal) dan plus (plant tujuan)
    const pair = new Map();
    moves.forEach((m) => { if (!TRF.has(m.mt)) return; const k = m.matDoc + '|' + m.material; const p = pair.get(k) || pair.set(k, { out: new Set(), in: new Set() }).get(k); (m.qty < 0 ? p.out : p.in).add(m.plant); });
    const stoFrom = new Map(); // PO STO → plant pengirim (dari 351 minus)
    moves.forEach((m) => { if (!TRF.has(m.mt)) return; const p = pair.get(m.matDoc + '|' + m.material);
      m.fromPlant = [...p.out][0] || ''; m.toPlant = [...p.in][0] || ''; if (m.mt === '351' && m.qty < 0 && m.po) stoFrom.set(m.po, m.plant); });
    moves.forEach((m) => { if (!TRF.has(m.mt) && m.po && stoFrom.has(m.po) && stoFrom.get(m.po) !== m.plant) m.fromPlant = stoFrom.get(m.po); });
    // GR per PO item
    const gr = new Map();
    for (const m of moves) {
      if (!m.po || !(m.mt in GR_IN || m.mt in GR_REL)) continue;
      const k = m.po + '|' + m.poItem; const g = gr.get(k) || { inQty: 0, relQty: 0, firstIn: null, lastRel: null, docs: [] };
      const q = Math.abs(m.qty);
      if (m.mt in GR_IN) { g.inQty += GR_IN[m.mt] * q; if (GR_IN[m.mt] > 0 && (!g.firstIn || m.date < g.firstIn)) g.firstIn = m.date; }
      if (m.mt in GR_REL) { g.relQty += GR_REL[m.mt] * q; if (GR_REL[m.mt] > 0 && (!g.lastRel || m.date > g.lastRel)) g.lastRel = m.date; }
      g.docs.push(m); gr.set(k, g);
    }
    const dates = moves.map((m) => m.date).filter(Boolean).sort((a, b) => a - b);
    return { moves, gr, range: dates.length ? [dates[0], dates[dates.length - 1]] : null };
  }

  function parseMB25(XLSX, buf) {
    const { rows, c } = sheet(XLSX, buf, ['Reservation', 'Material', 'Requirement Quantity']);
    const lines = [], open = new Map();
    for (const r of rows) {
      const resv = s(r[c('Reservation')]); if (!resv) continue;
      const l = { resv, item: s(r[c('Item No.Stock Transfer Reserv.')]), plant: s(r[c('Plant')]), mt: s(r[c('Movement Type')]), material: s(r[c('Material')]), desc: s(r[c('Material Description')]),
        reqDate: toDate(r[c('Requirement Date')], XLSX), reqQty: n(r[c('Requirement Quantity')]), removed: n(r[c('Removed quantity')]), diff: n(r[c('Difference Quantity')]), uom: s(r[c('Base Unit of Measure')]),
        finalIssue: s(r[c('Final Issue')]) === 'X', status: s(r[c('Reserv. status')]), wbs: s(r[c('WBS Element')]), network: s(r[c('Network')]), costCenter: s(r[c('Cost Center')]),
        recipient: s(r[c('Goods recipient')]), user: s(r[c('User name')]) };
      lines.push(l);
      if (!l.finalIssue && l.diff > 0 && l.material) { const k = l.material + '|' + l.plant; open.set(k, (open.get(k) || 0) + l.diff); }
    }
    return { lines, open };
  }

  // Expediting per dokumen PO/RO (header), dari ME2N + GR MB51
  function expediting(me2n, mb51, today = new Date(), opt = {}) {
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const byDoc = new Map();
    for (const l of me2n.lines) {
      if (l.deleted) continue;
      if (opt.plants && !opt.plants.has(l.plant)) continue;
      if (opt.stockOnly && l.acct) continue; // material stock = tanpa account assignment
      (byDoc.get(l.doc) || byDoc.set(l.doc, []).get(l.doc)).push(l);
    }
    const out = [];
    for (const [doc, L] of byDoc) {
      const qty = L.reduce((a, l) => a + l.qty, 0), open = L.reduce((a, l) => a + l.openQty, 0);
      const value = L.reduce((a, l) => a + l.value, 0), openValue = L.reduce((a, l) => a + l.openValue, 0);
      const openL = L.filter((l) => l.openQty > 0);
      const deliv = (openL.length ? openL : L).map((l) => l.delivery).filter(Boolean).sort((a, b) => a - b)[0] || null;
      let grIn = 0, grRel = 0, firstIn = null, lastRel = null;
      if (mb51) for (const l of L) { const g = mb51.gr.get(l.doc + '|' + stripItem(l.item)); if (!g) continue; grIn += g.inQty; grRel += g.relQty; if (g.firstIn && (!firstIn || g.firstIn < firstIn)) firstIn = g.firstIn; if (g.lastRel && (!lastRel || g.lastRel > lastRel)) lastRel = g.lastRel; }
      const inspeksi = grIn - grRel > 1e-9; // sudah tiba (103) tapi belum dirilis (105)
      let status, cls;
      if (open <= 1e-9) { status = 'Selesai GR'; cls = 'ok'; }
      else if (inspeksi) { status = 'Tiba, menunggu inspeksi'; cls = 'info'; }
      else if (deliv && deliv < t0) { status = 'Terlambat'; cls = 'low'; }
      else if (open < qty - 1e-9) { status = 'Diterima sebagian'; cls = 'warn'; }
      else { status = 'Dalam pengiriman'; cls = 'info'; }
      const f = L[0];
      out.push({ doc, type: f.type, pr: [...new Set(L.map((l) => l.pr).filter(Boolean))].join(', '), plant: [...new Set(L.map((l) => l.plant))].join(', '), pg: f.pg, vendor: f.vendor, vendorCode: f.vendorCode,
        oa: f.oa, desc: f.desc + (L.length > 1 ? ` (+${L.length - 1} item)` : ''), items: L.length, qty, open, value, openValue, currency: f.currency, docDate: f.docDate, deliv,
        lateDays: open > 0 && deliv && deliv < t0 ? Math.round((t0 - deliv) / 864e5) : 0, grIn, grRel, firstIn, lastRel, inspeksi, status, cls, lines: L });
    }
    return out.sort((a, b) => (b.lateDays - a.lateDays) || ((a.deliv || 0) - (b.deliv || 0)));
  }

  // Jejak satu material (opsional plant): semua kejadian dari semua sumber, urut waktu
  function traceMaterial(mat, plant, src) {
    const ev = [], hit = (m, p) => m === mat && (!plant || p === plant);
    if (src.me2n) for (const l of src.me2n.lines) if (hit(l.material, l.plant) && !l.deleted) {
      if (l.pr) ev.push({ date: l.docDate, step: 'PR', doc: l.pr, plant: l.plant, text: `PR ${l.pr} → ${l.type} ${l.doc}`, qty: l.qty, uom: l.uom });
      ev.push({ date: l.docDate, step: l.type, doc: l.doc + '/' + l.item, plant: l.plant, text: `${l.type} ${l.doc} ke ${l.vendor}, jadwal kirim ${l.delivery ? l.delivery.toLocaleDateString('id-ID') : '-'}${l.openQty > 0 ? ` · sisa ${l.openQty} ${l.uom}` : ' · lengkap'}`, qty: l.qty, uom: l.uom });
    }
    if (src.mb51) for (const m of src.mb51.moves) if (hit(m.material, m.plant)) {
      const step = m.mt in GR_IN ? 'GR (inspeksi)' : m.mt === '105' || m.mt === '106' ? 'GR (rilis stok)' : GI_TYPES.has(m.mt) ? 'GI' : 'Transfer';
      ev.push({ date: m.date, step, doc: m.matDoc, plant: m.plant, text: `${m.mt} ${m.mtText}${m.po ? ' · PO ' + m.po : ''}${m.resv ? ' · resv ' + m.resv : ''}${m.header ? ' · ' + m.header : ''}`, qty: m.qty, uom: m.uom });
    }
    if (src.mb25) for (const l of src.mb25.lines) if (hit(l.material, l.plant))
      ev.push({ date: l.reqDate, step: 'Reservasi', doc: l.resv + '/' + l.item, plant: l.plant, text: `Reservasi ${l.resv} (${l.mt}) untuk ${l.recipient || l.costCenter || l.wbs || '-'} · diambil ${l.removed}/${l.reqQty}${l.finalIssue ? ' · selesai' : l.diff > 0 ? ' · sisa ' + l.diff : ''}`, qty: l.reqQty, uom: l.uom });
    return ev.sort((a, b) => (a.date || 0) - (b.date || 0));
  }

  root.Trace = { parseMB51, mergeMB51, finishMB51, parseMB25, expediting, traceMaterial, GI_TYPES };
  if (typeof module !== 'undefined') module.exports = root.Trace;
})(typeof window !== 'undefined' ? window : globalThis);
