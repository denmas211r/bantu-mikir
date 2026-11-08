// ============ Kontrak (ME3N) & PO/RO (ME2N) ============
// Logika mengikuti file MRP Zona 1:
//   PIC kontrak      : dari Purchasing Group (X07 SCM PROC ZONA 1, X02 REG1 PROC ZN 1&4, X10 SCM PROC ZONA 4, X03 REG 2 PROCUREMENT)
//   Sisa kontrak     : Target Value (header) − total Released Value semua item kontrak
//   Sisa hari        : Validity End − hari ini
//   Kontrak terpilih : per material, prioritas Purch. Group X07 → X02 → X10 → X03 → lainnya;
//                      dalam grup yang sama pilih % sisa terbesar, lalu validity paling lama
//   OS PO/RO         : ME2N "Still to be delivered (qty)" per Material+Plant, baris dihapus (L) tidak dihitung
(function (root) {
  const PIC = { X07: 'SCM PROC ZONA 1', X02: 'REG1 PROC ZN 1&4', X10: 'SCM PROC ZONA 4', X03: 'REG 2 PROCUREMENT' };
  const PRIORITY = ['X07', 'X02', 'X10', 'X03'];
  const s = (v) => (v == null ? '' : String(v).trim());
  const n = (v) => { const x = typeof v === 'number' ? v : Number(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(x) ? x : 0; };
  const toDate = (v, XLSX) => {
    if (v instanceof Date) return v;
    if (typeof v === 'number' && XLSX) { const d = XLSX.SSF.parse_date_code(v); return d ? new Date(d.y, d.m - 1, d.d) : null; }
    const t = s(v); if (!t) return null; const m = t.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/); // format SAP dd.mm.yyyy
    const d = m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(t); return isNaN(d) ? null : d;
  };
  const vendorSplit = (v) => { const m = s(v).match(/^(\d+)\s+(.*)$/); return m ? { code: m[1], name: m[2].trim() } : { code: '', name: s(v) }; };
  function sheetRows(XLSX, buf, must) {
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const a = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
    const hi = a.findIndex((r) => r && must.every((m) => r.map(s).includes(m)));
    if (hi < 0) throw new Error('Kolom wajib tidak ditemukan: ' + must.join(', '));
    const H = a[hi].map(s); return { H, rows: a.slice(hi + 1), c: (k) => H.indexOf(k) };
  }

  function parseME3N(XLSX, buf, today = new Date()) {
    const { rows, c } = sheetRows(XLSX, buf, ['Purchasing Document', 'Material', 'Validity Period End']);
    const docs = new Map(), items = [];
    for (const r of rows) {
      const doc = s(r[c('Purchasing Document')]); if (!doc) continue;
      const pg = s(r[c('Purchasing Group')]), v = vendorSplit(r[c('Vendor/supplying plant')]);
      let d = docs.get(doc);
      if (!d) {
        const end = toDate(r[c('Validity Period End')], XLSX);
        d = { doc, start: toDate(r[c('Validity Per. Start')], XLSX), end, target: n(r[c('Target Val. (Header)')]), released: 0, totalOpenSAP: n(r[c('Total open value')]),
          currency: s(r[c('Currency')]), pg, pic: PIC[pg] || pg, vendorCode: v.code, vendor: v.name, items: 0, docDate: toDate(r[c('Document Date')], XLSX) };
        docs.set(doc, d);
      }
      const it = { doc, item: s(r[c('Item')]), material: s(r[c('Material')]), desc: s(r[c('Short Text')]), uom: s(r[c('Order Unit')]), price: n(r[c('Net price')]),
        released: n(r[c('Released value')]), targetQty: n(r[c('Target Quantity')]), openQty: n(r[c('Open Target Quantity')]) };
      it.releasedQty = it.price ? it.released / it.price : 0;
      d.released += it.released; d.items++; items.push(it);
    }
    const dayMs = 864e5, t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    for (const d of docs.values()) {
      d.sisa = d.target - d.released; d.pctSisa = d.target ? d.sisa / d.target : 0;
      d.sisaHari = d.end ? Math.round((d.end - t0) / dayMs) : null; d.aktif = d.sisaHari == null || d.sisaHari >= 0;
      d.rank = d.pctSisa * 1e5 + (d.end ? d.end.getFullYear() * 1e3 + d.end.getDate() : 0); // sama dengan "Rank Kontrak" Excel
    }
    items.forEach((it) => (it.k = docs.get(it.doc)));
    // kontrak terpilih per material (hanya yang aktif)
    const byMat = new Map();
    for (const it of items) { if (!it.material || !it.k.aktif) continue; (byMat.get(it.material) || byMat.set(it.material, []).get(it.material)).push(it); }
    const pick = new Map();
    for (const [mat, list] of byMat) {
      let chosen = null;
      for (const pg of [...PRIORITY, null]) {
        const cand = list.filter((x) => (pg ? x.k.pg === pg : true)); if (!cand.length) continue;
        chosen = cand.sort((a, b) => b.k.rank - a.k.rank)[0]; break;
      }
      pick.set(mat, { doc: chosen.doc, item: chosen.item, price: chosen.price, currency: chosen.k.currency, vendor: chosen.k.vendor, vendorCode: chosen.k.vendorCode,
        pic: chosen.k.pic, sisaHari: chosen.k.sisaHari, sisa: chosen.k.sisa, pctSisa: chosen.k.pctSisa, uom: chosen.uom, alternatives: list.length });
    }
    return { docs, items, pick };
  }

  function parseME2N(XLSX, buf, today = new Date()) {
    const { rows, c } = sheetRows(XLSX, buf, ['Purchasing Document', 'Material', 'Still to be delivered (qty)']);
    const lines = [], ospo = new Map();
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    for (const r of rows) {
      const doc = s(r[c('Purchasing Document')]); if (!doc) continue;
      const v = vendorSplit(r[c('Vendor/supplying plant')]);
      const l = { doc, item: s(r[c('Item')]), plant: s(r[c('Plant')]), pg: s(r[c('Purchasing Group')]), material: s(r[c('Material')]), desc: s(r[c('Short Text')]),
        delivery: toDate(r[c('Delivery Date')], XLSX), docDate: toDate(r[c('Document Date')], XLSX), vendor: v.name, vendorCode: v.code,
        qty: n(r[c('Order Quantity')]), uom: s(r[c('Order Unit')]), price: n(r[c('Net price')]), value: n(r[c('Net Order Value')]), currency: s(r[c('Currency')]),
        openQty: n(r[c('Still to be delivered (qty)')]), openValue: n(r[c('Still to be delivered (value)')]), deleted: s(r[c('Deletion Indicator')]) === 'L',
        pr: s(r[c('Purchase Requisition')]), acct: s(r[c('Acct Assignment Cat.')]), oa: s(r[c('Outline Agreement')]) };
      l.type = l.oa ? 'RO' : 'PO';
      l.lateDays = l.openQty > 0 && !l.deleted && l.delivery && l.delivery < t0 ? Math.round((t0 - l.delivery) / 864e5) : 0;
      lines.push(l);
      if (!l.deleted && l.openQty > 0 && l.material) { const k = l.material + '|' + l.plant; ospo.set(k, (ospo.get(k) || 0) + l.openQty); }
    }
    // harga terakhir per material (PO terbaru yang tidak dihapus) → untuk estimasi OE
    const lastPrice = new Map();
    for (const l of lines) {
      if (l.deleted || !l.material || !l.price) continue;
      const p = lastPrice.get(l.material);
      if (!p || (l.docDate && p.date && l.docDate > p.date)) lastPrice.set(l.material, { price: l.price, currency: l.currency, date: l.docDate, vendor: l.vendor, doc: l.doc });
    }
    return { lines, ospo, lastPrice };
  }

  // Daftar vendor gabungan (kontrak + PO). Kontak (email/telp) diisi user, disimpan di browser.
  function vendors(k, p) {
    const m = new Map();
    const add = (code, name, f) => { const key = code || name; if (!key) return; const v = m.get(key) || { code, name, kontrak: 0, po: 0, openValue: 0 }; f(v); m.set(key, v); };
    if (k) for (const d of k.docs.values()) add(d.vendorCode, d.vendor, (v) => v.kontrak++);
    if (p) { const seen = new Set(); for (const l of p.lines) { add(l.vendorCode, l.vendor, (v) => { if (!seen.has(l.doc)) { v.po++; seen.add(l.doc); } if (!l.deleted && l.currency === 'IDR') v.openValue += l.openValue; }); } }
    return [...m.values()].sort((a, b) => b.kontrak - a.kontrak || b.po - a.po);
  }

  root.Contract = { parseME3N, parseME2N, vendors, PIC };
  if (typeof module !== 'undefined') module.exports = root.Contract;
})(typeof window !== 'undefined' ? window : globalThis);
