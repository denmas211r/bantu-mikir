// ============ Mesin MRP — rumus sama dengan file "MRP PEP Zona 1" (sheet MRP & Rules) ============
// Input per Material+Plant: histori pemakaian bulanan, Lead Time, Has Contract, Stock, OS PO/RO, MB25.
// Rumus (lihat sheet Rules):
//   AMU      = rata-rata pemakaian bulanan 3 tahun terakhir (36 bulan), dijumlah untuk baris Material+Plant yang sama
//   Freq.3Y  = jumlah bulan ada pemakaian dalam 36 bulan / 3
//   Aging    = FS (>=1) · MD (>=0.5) · SP (>=0.2) · DS (lainnya)
//   SS       = FS ? ROUNDUP(AMU×3) : 0
//   Min      = AMU×LT + SS + (Has Contract = Yes ? 0 : AMU×5)
//   Max      = LT<5 ? AMU×6 + SS : AMU×12 + SS
//   Min2     = FS/MD ? ROUNDUP(Min) : kosong            (Min final)
//   Max2     = FS/MD ? ROUNDUP(Max) + (Yes ? 0 : AMU×5) : kosong   (Max final)
//   To Order = SP/DS ? max(0, MB25 − Stock − OSPO)
//              : (Stock − MB25) <= Min2 ? max(0, Max2 − OSPO − (Stock − MB25)) : 0   → ROUNDUP
// Basis kebutuhan (opsional, input RKM): 'hist' = sama persis Excel; 'max' = max(AMU histori, RKM/12);
//   'rkm-new' = pakai RKM/12 hanya kalau histori kosong (AMU = 0).
(function (root) {
  const EPS = 1e-9;
  const roundup = (x) => (x > 0 ? Math.ceil(x - EPS) : x < 0 ? Math.floor(x + EPS) : 0); // ROUNDUP Excel (menjauhi nol)
  const isMonth = (h) => /^\d\d-\d\d$/.test(String(h == null ? '' : h).trim());

  function agingOf(freq3) { return freq3 >= 1 ? 'FS' : freq3 >= 0.5 ? 'MD' : freq3 >= 0.2 ? 'SP' : 'DS'; }

  // Hitung satu baris. r = {usage:[36 angka, bulan terlama→terbaru], lt, hasContract:'Yes'|'No'|'', stock, ospo, mb25, rkmYear}
  function calc(r, opt = {}) {
    const u = r.usage36 || [];
    const avg3 = u.reduce((a, b) => a + (b || 0), 0) / 36;
    const freq3 = u.filter((v) => v).length / 3;
    const aging = r.agingOverride || agingOf(r.freq3 != null ? r.freq3 : freq3);
    let amuHist = Math.abs(r.amuSum != null ? r.amuSum : avg3);
    let amu = amuHist, basis = 'Histori';
    const rkmM = r.rkmYear ? r.rkmYear / 12 : 0;
    if (opt.basis === 'max' && rkmM > amuHist) { amu = rkmM; basis = 'RKM'; }
    if (opt.basis === 'rkm-new' && !amuHist && rkmM) { amu = rkmM; basis = 'RKM'; }
    const useAging = basis === 'RKM' && (aging === 'SP' || aging === 'DS') ? 'MD' : aging; // item baru dari RKM diperlakukan seperti MD
    const lt = r.lt;
    const out = { amu, amuHist, avg3, freq3, aging, agingUsed: useAging, basis, lt, ss: 0, min: null, max: null, min2: null, max2: null, toOrder: 0, note: '' };
    if (lt == null || lt === '' || !isFinite(lt)) { out.note = 'LT tidak ada'; return out; }
    const yes = r.hasContract === 'Yes';
    out.ss = useAging === 'FS' ? roundup(amu * 3) : 0;
    out.min = amu * lt + out.ss + (yes ? 0 : amu * 5);
    out.max = (lt < 5 ? amu * 6 : amu * 12) + out.ss;
    if (useAging === 'FS' || useAging === 'MD') { out.min2 = roundup(out.min); out.max2 = roundup(out.max) + (yes ? 0 : amu * 5); }
    const stock = r.stock || 0, ospo = r.ospo || 0, mb25 = r.mb25 || 0, net = stock - mb25;
    let order;
    if (useAging === 'SP' || useAging === 'DS') order = Math.max(0, mb25 - stock - ospo);
    else order = net <= out.min2 ? Math.max(0, out.max2 - ospo - net) : 0;
    out.toOrder = roundup(order);
    out.surplus = Math.max(0, stock - (out.max2 != null ? out.max2 : amu * 24));
    return out;
  }

  // Baca file MRP: sheet MRP (histori + stock/OSPO/MB25) dan LeadTime (LT, contract, OA)
  function parseWorkbook(XLSX, buf) {
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array', sheets: ['MRP', 'LeadTime'] });
    if (!wb.Sheets.MRP) throw new Error('Sheet "MRP" tidak ditemukan.');
    const aoa = (n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, raw: true, defval: null });
    const s = (v) => (v == null ? '' : String(v).trim());
    const n = (v) => { const x = typeof v === 'number' ? v : Number(v); return isFinite(x) ? x : 0; };

    // --- LeadTime (master material) ---
    const lt = new Map(), ltByKimap = new Map();
    if (wb.Sheets.LeadTime) {
      const a = aoa('LeadTime'); const hi = a.findIndex((r) => r && r.map(s).includes('Material') && r.map(s).includes('Lead Time'));
      const H = a[hi].map(s); const c = (k) => H.indexOf(k);
      for (const r of a.slice(hi + 1)) {
        const mat = s(r[c('Material')]); if (!mat) continue;
        const rec = { material: mat, kimap: s(r[c('KIMAP Final')]), desc: s(r[c('Description')]), lt: r[c('Lead Time')] === '' || r[c('Lead Time')] == null ? null : n(r[c('Lead Time')]),
          cat: s(r[c('Mat Category')]), hasContract: s(r[c('Has Contract?')]), oa: s(r[c('No.OA')]).replace(/^#.*$/, ''), pic: s(r[c('PIC Kontrak')]).replace(/^#.*$/, ''),
          sisaHari: typeof r[c('Sisa Hari')] === 'number' ? r[c('Sisa Hari')] : null };
        if (!lt.has(mat)) lt.set(mat, rec);
        if (rec.kimap && !ltByKimap.has(rec.kimap)) ltByKimap.set(rec.kimap, rec);
      }
    }

    // --- MRP ---
    const a = aoa('MRP'); const hi = a.findIndex((r) => r && r.map(s).includes('Plnt') && r.map(s).includes('Material'));
    if (hi < 0) throw new Error('Header sheet MRP tidak ditemukan.');
    const H = a[hi].map(s); const c = (k) => H.indexOf(k);
    const monthIdx = H.map((h, i) => (isMonth(h) ? i : -1)).filter((i) => i >= 0);
    const last36 = monthIdx.slice(-36); const monthLabels = monthIdx.map((i) => H[i]);
    const rows = [];
    for (const r of a.slice(hi + 1)) {
      const mat = s(r[c('Material')]), plant = s(r[c('Plnt')]); if (!mat || !plant) continue;
      rows.push({
        material: mat, plant, kimap: s(r[c('KIMAP Final')]), desc: s(r[c('Description')]), uom: s(r[c('UoE')]), field: s(r[c('Field')]), cat: s(r[c('Cat')]),
        usage36: last36.map((i) => n(r[i])), usageAll: monthIdx.map((i) => n(r[i])),
        stock: n(r[c('Stock')]), ospo: n(r[c('OS PO/RO')]), mb25: n(r[c('MB25')]),
        excel: { amu: n(r[c('AMU')]), aging: s(r[c('Aging')]), min2: r[c('Min2')], max2: r[c('Max2')], toOrder: n(r[c('To Order')]) },
      });
    }
    return { rows, lt, ltByKimap, monthLabels, window: [H[last36[0]], H[last36[last36.length - 1]]] };
  }

  // Jalankan mesin untuk semua baris. stockMap (opsional) = stok dari MB52 upload; rkmMap = qty RKM 2027 per Material|Plant
  function run(wbData, opt = {}) {
    const { rows, lt } = wbData;
    const sumAvg = new Map();
    rows.forEach((r) => { const k = r.material + '|' + r.plant; sumAvg.set(k, (sumAvg.get(k) || 0) + r.usage36.reduce((x, y) => x + y, 0) / 36); });
    const out = new Map();
    for (const r of rows) {
      const key = r.material + '|' + r.plant;
      if (out.has(key)) continue; // baris duplikat → satu hasil (AMU sudah dijumlah)
      const master = lt.get(r.material); const ltRow = r.kimap ? wbData.ltByKimap.get(r.kimap) : null;
      const stock = opt.stockMap && opt.stockMap.has(key) ? opt.stockMap.get(key) : opt.stockMap ? 0 : r.stock;
      const rkm = opt.rkmMap ? opt.rkmMap.get(key) || 0 : 0;
      const res = calc({ usage36: r.usage36, amuSum: sumAvg.get(key), lt: ltRow ? ltRow.lt : master ? master.lt : null,
        hasContract: master ? master.hasContract : '', stock, ospo: r.ospo, mb25: r.mb25, rkmYear: rkm }, opt);
      out.set(key, Object.assign({ key, material: r.material, plant: r.plant, kimap: r.kimap, desc: r.desc, uom: r.uom, field: r.field, cat: r.cat || (master && master.cat) || '',
        stock, ospo: r.ospo, mb25: r.mb25, rkm, oa: master ? master.oa : '', pic: master ? master.pic : '', sisaHari: master ? master.sisaHari : null,
        hasContract: master ? master.hasContract : '', excel: r.excel, usageAll: r.usageAll }, res));
    }
    return out;
  }

  root.MRP = { calc, parseWorkbook, run, agingOf, roundup };
  if (typeof module !== 'undefined') module.exports = root.MRP;
})(typeof window !== 'undefined' ? window : globalThis);
