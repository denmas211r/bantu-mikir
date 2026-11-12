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

  // ================= Metode TKO (disempurnakan sesuai pedoman & TKO perusahaan) =================
  // Ringkasan aturan (detail di dokumen privat Project, bukan di repo):
  //   Aging   : FS = ada pemakaian ≤12 bln · MD ≤24 bln · SP ≤60 bln · DS >60 bln (dari pemakaian terakhir)
  //   AMU     : rata-rata |pemakaian| N bulan terakhir (default 24)
  //   T       : lead time + tambahan lead time pengadaan bila item tidak punya kontrak (default 5 bln)
  //   Kategori: Project → Program (BOM − (O+S)); FS chemical/catalyst; FS maintenance; MD → rutin slow; SP/DS → on demand
  //   SS      : chemical = n bln × AMU (default 3) · maintenance & slow = z × SdMI × √T (service level 95%/99%), maks 3 bln × AMU
  //   Min(ROP): FS = AMU×T + SS · MD = SS
  //   Max     : chemical = AMU×(P+T) + SS · maintenance = ROP + ROQ×AMU (default 6) · MD = SS; Max ≥ Min, dibulatkan
  //   Order   : tersedia = Stok + OS PO − Reservasi(MB25); bila tersedia < Min → Max − tersedia
  //             Program/on demand: RKM + Reservasi − (Stok + OS PO)
  //   Berlebih: cakupan stok > batas bulan (umum 12, chemical 5)
  const TKO_DEFAULT = { amuMonths: 24, z: 1.645, zCrit: 2.326, nonContractLT: 5.5, roqMonths: 6, maxFormula: 'BC', mdAsFS: true, chemSSMonths: 3, ssCapMonths: 3, chemP: 1, excessGeneral: 12, excessChem: 5,
    chemRegex: '^(?!.*BATTERY).*(CHEMICAL|CATALYST|SULFATE|SULPHATE|KAPORIT|CHLORINE|HYPOCHLORITE|HYDROXIDE|DEMULSIFIER|CORROSION INHIBITOR|SCALE INHIBITOR|BIOCIDE|SURFACTANT|SCAVENGER|DEFOAM|SOLVENT|POLYMER|COAGULANT|FLOCCULANT|HYDROCHLORIC|CAUSTIC|SODA ASH)' };
  function stdev(a) { if (a.length < 2) return 0; const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((s, v) => s + (v - m) ** 2, 0) / (a.length - 1)); }
  function agingTKO(usageAll) {
    let last = -1; for (let i = usageAll.length - 1; i >= 0; i--) if (usageAll[i]) { last = i; break; }
    if (last < 0) return { aging: 'DS', since: Infinity };
    const since = usageAll.length - 1 - last; // 0 = bulan terakhir data
    return { aging: since < 12 ? 'FS' : since < 24 ? 'MD' : since < 60 ? 'SP' : 'DS', since };
  }
  function calcTKO(r, opt = {}) {
    const P = Object.assign({}, TKO_DEFAULT, opt.tko || {});
    const u = (r.usageAll || []).map((v) => Math.abs(v || 0));
    const win = u.slice(-P.amuMonths);
    const { aging, since } = agingTKO(u);
    const amuHist = win.reduce((a, b) => a + b, 0) / (P.amuDivisor || P.amuMonths); // amuDivisor: histori pendek (MB51) dibagi jumlah bulan sebenarnya
    const sdmi = stdev(win);
    let amu = amuHist, basis = 'Histori';
    const rkmM = r.rkmYear ? r.rkmYear / 12 : 0;
    if (opt.basis === 'max' && rkmM > amuHist) { amu = rkmM; basis = 'RKM'; }
    if (opt.basis === 'rkm-new' && !amuHist && rkmM) { amu = rkmM; basis = 'RKM'; }
    const isProject = /^project$/i.test(String(r.cat || '').trim());
    const isChem = !!r.chem || new RegExp(P.chemRegex, 'i').test(r.desc || ''); // r.chem = Material Group 89 (CHEMICALS)
    let effAging = basis === 'RKM' && (aging === 'SP' || aging === 'DS') ? 'FS' : aging; // item baru dari RKM direncanakan sebagai rutin
    const mdFS = effAging === 'MD' && P.mdAsFS; if (mdFS) effAging = 'FS';            // Moderate diperlakukan seperti FS (perlu konfirmasi user)
    const cls = isProject ? 'Program' : effAging === 'FS' ? (isChem ? 'Rutin chemical' : 'Rutin maintenance') : effAging === 'MD' ? 'Rutin slow (ROP manual)' : 'On Demand';
    const out = { method: 'tko', amu, amuHist, sdmi, aging, since, agingUsed: effAging, cls, basis, lt: r.lt, tEff: null, ss: 0, min: null, max: null, min2: null, max2: null, toOrder: 0, surplus: 0, cover: null, berlebih: false, note: '' };
    const stock = r.stock || 0, ospo = r.ospo || 0, res = r.mb25 || 0, avail = stock + ospo - res;
    out.cover = amu > 0 ? stock / amu : stock > 0 ? Infinity : 0;
    if (cls === 'Program' || cls === 'On Demand') {
      out.toOrder = roundup(Math.max(0, (r.rkmYear || 0) + res - stock - ospo));
      out.surplus = Math.max(0, stock - res - (r.rkmYear || 0));
      if (aging === 'DS' && stock > 0) out.note = r.histShort ? 'Belum ada pemakaian di histori MB51 yang tersedia' : 'Kandidat dead stock (cek prospek & peralatan induk)';
      return out;
    }
    if (r.lt == null || r.lt === '' || !isFinite(r.lt)) { out.note = 'LT tidak ada'; return out; }
    const T = r.lt + (r.hasContract === 'Yes' ? 0 : P.nonContractLT); out.tEff = T;
    const z = r.critical ? P.zCrit : P.z;
    if (cls === 'Rutin chemical') {
      out.ss = roundup(P.chemSSMonths * amu);
      out.min = amu * T + out.ss; out.max = amu * (P.chemP + T) + out.ss;
    } else if (cls === 'Rutin maintenance') {
      out.ss = roundup(Math.min(z * sdmi * Math.sqrt(T), P.ssCapMonths * amu)); // dibatasi agar tidak berlebih untuk pemakaian tak rutin
      out.min = amu * T + out.ss;
      // 3 pilihan rumus Max (lihat Pengaturan): A = 2×(AMU×T)+SS · B = AMU×T+2×SS · C = ROP + ROQ×AMU
      const fB = amu * T + 2 * out.ss, fC = out.min + P.roqMonths * amu;
      // 'BC' = segmentasi: item kontrak (RO cepat) pakai B, item non-kontrak (PR+OE 5–6 bln) pakai C
      out.max = P.maxFormula === 'A' ? 2 * amu * T + out.ss : P.maxFormula === 'B' ? fB : P.maxFormula === 'BC' ? (r.hasContract === 'Yes' ? fB : fC) : fC;
      if (r.hasContract !== 'Yes') out.kandidatKontrak = true;
    } else { // MD → rutin slow moving: ROP = SS, order lot-for-lot sampai SS
      out.ss = roundup(Math.min(z * sdmi * Math.sqrt(T), P.ssCapMonths * amu));
      out.min = out.ss; out.max = out.ss; out.note = 'ROP manual: review dengan user';
    }
    out.min2 = roundup(out.min); out.max2 = Math.max(roundup(out.max), out.min2);
    if (mdFS) out.note = 'Moderate → dihitung sebagai FS (konfirmasi user)';
    out.toOrder = avail < out.min2 ? roundup(Math.max(0, out.max2 - avail)) : 0;
    out.surplus = Math.max(0, stock - out.max2);
    out.berlebih = isFinite(out.cover) && out.cover > (cls === 'Rutin chemical' ? P.excessChem : P.excessGeneral);
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
    const dupUsage = new Map();
    rows.forEach((r) => {
      const k = r.material + '|' + r.plant; sumAvg.set(k, (sumAvg.get(k) || 0) + r.usage36.reduce((x, y) => x + y, 0) / 36);
      const prev = dupUsage.get(k); dupUsage.set(k, prev ? prev.map((v, i) => v + (r.usageAll[i] || 0)) : r.usageAll.slice());
    });
    const out = new Map();
    for (let r of rows) {
      const key = r.material + '|' + r.plant;
      if (out.has(key)) continue; // baris duplikat → satu hasil (AMU sudah dijumlah)
      const master = lt.get(r.material); const ltRow = r.kimap ? wbData.ltByKimap.get(r.kimap) : null;
      const stock = opt.stockMap && opt.stockMap.has(key) ? opt.stockMap.get(key) : opt.stockMap ? 0 : r.stock;
      const rkm = opt.rkmMap ? opt.rkmMap.get(key) || 0 : 0;
      // Kontrak & OS PO terbaru: kalau file ME3N/ME2N dimuat, pakai itu (lebih baru dari isi file MRP)
      const kp = opt.contractPick ? opt.contractPick.get(r.material) || (r.kimap && opt.contractPick.get(r.kimap)) : null;
      const ltv = ltRow ? ltRow.lt : master ? master.lt : null, hc = opt.contractPick ? (kp ? 'Yes' : 'No') : master ? master.hasContract : '';
      if (opt.ospoMap) r = Object.assign({}, r, { ospo: opt.ospoMap.get(r.material + '|' + r.plant) || 0 });
      if (opt.mb25Map) r = Object.assign({}, r, { mb25: opt.mb25Map.get(r.material + '|' + r.plant) || 0 });
      const cat = r.cat || (master && master.cat) || '';
      const ex = calc({ usage36: r.usage36, amuSum: sumAvg.get(key), lt: ltv, hasContract: hc, stock, ospo: r.ospo, mb25: r.mb25, rkmYear: rkm }, opt);
      // histori bulanan digabung untuk baris duplikat Material+Plant
      const usageAll = (dupUsage.get(key) || r.usageAll);
      const tk = calcTKO({ usageAll, lt: ltv, hasContract: hc, cat, desc: r.desc, chem: opt.chemFn ? opt.chemFn(r.material) : false, histShort: !!wbData.histShort, stock, ospo: r.ospo, mb25: r.mb25, rkmYear: rkm, critical: opt.criticalSet ? opt.criticalSet.has(key) : false }, opt);
      ex.method = 'excel';
      const res = opt.method === 'excel' ? ex : tk;
      out.set(key, Object.assign({ key, material: r.material, plant: r.plant, kimap: r.kimap, desc: r.desc, uom: r.uom, field: r.field, cat,
        stock, ospo: r.ospo, mb25: r.mb25, rkm, oa: kp ? kp.doc : opt.contractPick ? '' : master ? master.oa : '', pic: kp ? kp.pic : master ? master.pic : '', sisaHari: kp ? kp.sisaHari : master ? master.sisaHari : null,
        contract: kp || null,
        hasContract: hc, excel: r.excel, usageAll, wk: wbData.wk || 'PEP', histShort: !!wbData.histShort, ltDefault: !!(master && master.ltDefault), alt: { excel: ex, tko: tk } }, res));
    }
    return out;
  }

  // Bangun input MRP dari MB52 + MB51 (untuk WK yang belum punya file MRP, mis. WK PHE).
  // usage = gerakan yang lolos isUsage (default: Own Use + Return tanpa network/proyek), dijumlah per bulan per Material+Plant.
  // LT: dari master LeadTime file MRP lain (kalau kode material sama), selain itu ltDefault.
  function fromMoves({ items = [], moves = [], ltMaster = null, ltDefault = 3, isUsage, wk = 'PHE' }) {
    const ym = (d) => String(d.getFullYear() % 100).padStart(2, '0') + '-' + String(d.getMonth() + 1).padStart(2, '0');
    const use = moves.filter((m) => m.date && m.material && (isUsage ? isUsage(m) : false));
    const dates = moves.map((m) => m.date).filter(Boolean).sort((a, b) => a - b);
    const labels = [];
    if (dates.length) { const d = new Date(dates[0].getFullYear(), dates[0].getMonth(), 1), end = dates[dates.length - 1]; while (d <= end) { labels.push(ym(d)); d.setMonth(d.getMonth() + 1); } }
    const li = new Map(labels.map((l, i) => [l, i]));
    const rows = new Map();
    const get = (mat, plant, desc, uom) => {
      const k = mat + '|' + plant; let r = rows.get(k);
      if (!r) rows.set(k, (r = { material: mat, plant, kimap: '', desc: desc || '', uom: uom || '', field: '', cat: '', usage36: new Array(36).fill(0), usageAll: new Array(labels.length).fill(0), stock: 0, ospo: 0, mb25: 0, excel: {} }));
      if (!r.desc && desc) r.desc = desc; if (!r.uom && uom) r.uom = uom; return r;
    };
    items.forEach((i) => { const r = get(i.material, i.plant, i.desc, i.uom); r.stock += (i.sohNormal != null ? i.sohNormal : i.soh) || 0; }); // stok ZNORMAL
    use.forEach((m) => { const r = get(m.material, m.plant, m.desc, m.uom); const i = li.get(ym(m.date)); if (i != null) r.usageAll[i] += -(m.qty || 0); });
    rows.forEach((r) => { r.usageAll = r.usageAll.map((v) => Math.max(0, v)); r.usage36 = new Array(Math.max(0, 36 - labels.length)).fill(0).concat(r.usageAll.slice(-36)); });
    const lt = new Map();
    rows.forEach((r) => { if (lt.has(r.material)) return; const m = ltMaster && ltMaster.get(r.material);
      lt.set(r.material, m && m.lt != null ? { material: r.material, lt: m.lt, cat: '', hasContract: '', ltFrom: 'master' } : { material: r.material, lt: ltDefault, cat: '', hasContract: '', ltDefault: true }); });
    const span = dates.length ? Math.max(1, (dates[dates.length - 1] - dates[0]) / 86400000 / 30.44) : 1;
    return { rows: [...rows.values()], lt, ltByKimap: new Map(), monthLabels: labels, window: [labels[0] || '-', labels[labels.length - 1] || '-'], wk, source: 'MB51',
      monthsSpan: span, histShort: span < 12, usageMoves: use.length };
  }

  root.MRP = { fromMoves,  calc, calcTKO, agingTKO, TKO_DEFAULT, parseWorkbook, run, agingOf, roundup };
  if (typeof module !== 'undefined') module.exports = root.MRP;
})(typeof window !== 'undefined' ? window : globalThis);
