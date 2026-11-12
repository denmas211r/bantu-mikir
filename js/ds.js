// ============ Optimasi Deadstock (DS): daftar DS akhir tahun (form MA-01) + alokasi pemakaian dari MB51 ============
// Cara hitung meniru workbook "Deadstock PEP PHE Z1-4 – Internal Usage dan BAU":
//  • Qty DS per Plant×Material = kuota. Gerakan sesudah tanggal DS diurutkan menurut tanggal (lalu urutan baris).
//  • Qty efektif = −qty untuk grup yang dihitung: Internal Usage (Own Use dan pembatalannya), BAU yang SAH, MTA (963/964).
//  • Klaim = MIN(kuota, MAX(0, kumulatif + efektif)) − MIN(kuota, MAX(0, kumulatif)). Nilai = klaim × harga satuan USD di daftar DS.
//  • BAU sah kalau zona plant asal ≠ zona plant tujuan. Plant tujuan: isian manual, lalu baris pasangan di Material Document
//    yang sama (351+ untuk BAU; sisi tujuan 352− untuk pembatalan), lalu kata kunci di Document Header Text. MTA selalu sah.
//  • BAU sesama zona (opsi o.sameZona): 'skip' = tidak dihitung, 'bau' = dihitung sebagai BAU, 'iu' = dihitung sebagai Internal Usage.
//  • Tujuan tidak ketemu = penerimaan di luar MB51 (tidak terdeteksi di dalam zona) → dihitung BAU.
(function (root) {
  const s = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());
  const n = (v) => { const x = typeof v === 'number' ? v : Number(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(x) ? x : 0; };

  // Kata kunci plant di header text (dari tabel plant workbook user). Plant di luar Zona 1 & 4 → 'LUAR'.
  const KEYWORDS = [['FIELD RANTAU', 'W101'], ['RANTAU', 'W101'], ['PKL SUSU', 'W102'], ['PANGKALAN SUSU', 'W102'], ['FIELD JAMBI', 'W802'], ['LIRIK', 'W803'],
    ['PRABUMULIH', 'W105'], ['FIELD PENDOPO', 'W106'], ['LIMAU', 'W801'], ['ADERA', 'W809'], ['RAMBA', 'W811'], ['NSO-POINT A', 'SO02'], ['POINT A', 'SO02'],
    ['ARUN GAS', 'SOAG'], ['NSO-AG', 'SOAG'], ['JAMBI MERANG', 'JM02'], ['AIR SERDANG', 'OG02'], ['METUR', 'OG03'], ['GD PENDOPO', 'RT02'], ['AIR ITAM', 'RT03'],
    ['JATIBARANG', 'LUAR'], ['JATI BARANG', 'LUAR'], ['TAMBUN', 'LUAR'], ['SANGASANGA', 'LUAR'], ['SANGA SANGA', 'LUAR'], ['CEPU', 'LUAR'], ['SUBANG', 'LUAR'],
    ['TARAKAN', 'LUAR'], ['BUNYU', 'LUAR'], ['SANGATTA', 'LUAR'], ['PAPUA', 'LUAR'], ['SOROWAKO', 'LUAR']];
  const guessPlant = (text) => { const t = ' ' + String(text || '').toUpperCase() + ' '; for (const [k, p] of KEYWORDS) if (t.includes(k)) return p; return ''; };

  // ---- Baca workbook DS: semua sheet yang punya header "Kode Material KKKS" + "Harga Satuan US$" ----
  function parseDS(XLSX, buf) {
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    const rows = [], sheets = []; let asOf = null, kurs = 0;
    // pakai sheet bernama DS/Deadstock kalau ada (workbook bisa berisi sheet stok lain seperti MP02)
    const dsNames = wb.SheetNames.filter((x) => /(^|[^A-Z])DS([^A-Z]|$)|dead/i.test(x));
    for (const name of dsNames.length ? dsNames : wb.SheetNames) {
      const a = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: true, defval: null });
      const hi = a.findIndex((r) => r && r.map(s).includes('Kode Material KKKS') && r.map(s).some((x) => /^Harga Satuan US\$/i.test(x)));
      if (hi < 0) continue;
      const H = a[hi].map(s), c = (re) => H.findIndex((x) => re.test(x));
      const ci = { mat: c(/^Kode Material KKKS$/), desc: c(/^Full Description$/), qty: c(/^Quantity$/), uom: c(/^Satuan$/), unit: c(/^Harga Satuan US\$/), total: c(/^Total Nilai Persedian US\$/),
        plant: c(/^Plant$/), lok: c(/^Lokasi$/), status: c(/^Notes$/) };
      // sub-header (2 baris di bawah) memuat Aging, MRO, Project, dll
      const sub = (a[hi + 2] || []).map(s); const ag = sub.indexOf('Aging'), mro = sub.indexOf('MRO'), prj = sub.indexOf('Project');
      // Bulan/Tahun laporan & kurs di baris atas
      for (const r of a.slice(0, hi)) { if (!r) continue; const t = r.map(s);
        const b = t.indexOf('Bulan :'), y = t.indexOf('Tahun :'); if (b >= 0 && y >= 0) { const mo = n(r[b + 3] ?? r[b + 1]) || n(r.slice(b + 1, y).find((v) => n(v))), yr = n(r[y + 1]); if (mo && yr) asOf = new Date(yr, mo, 0); }
        r.forEach((v) => { if (typeof v === 'number' && Number.isInteger(v) && v >= 10000 && v <= 25000 && !kurs) kurs = v; }); } // kurs IDR/USD laporan
      const wkSheet = /PHE/i.test(name) ? 'PHE' : 'PEP'; let cnt = 0;
      for (const r of a.slice(hi + 1)) {
        if (!r) continue; const mat = s(r[ci.mat]), q = n(r[ci.qty]); if (!mat || !q || /^\d+$/.test(mat) && mat.length < 3) continue;
        let plant = s(r[ci.plant]); if (!/^[A-Z0-9]{4}$/.test(plant)) plant = guessPlant(r[ci.lok]) || plant;
        rows.push({ wk: wkSheet, sheet: name, plant, material: mat, desc: s(r[ci.desc]), qty: q, uom: s(r[ci.uom]), unit: n(r[ci.unit]), total: n(r[ci.total]) || q * n(r[ci.unit]),
          lokasi: s(r[ci.lok]), aging: ag >= 0 ? s(r[ag]) : '', cls: mro >= 0 && n(r[mro]) ? 'MRO' : prj >= 0 && n(r[prj]) ? 'Project' : '' }); cnt++;
      }
      sheets.push({ name, wk: wkSheet, rows: cnt });
    }
    if (!rows.length) throw new Error('Tidak menemukan sheet DS (header "Kode Material KKKS" dan "Harga Satuan US$").');
    // gabung baris dobel Plant×Material (kuota = jumlah qty)
    const m = new Map(); rows.forEach((r) => { const k = r.plant + '|' + r.material; const o = m.get(k); if (!o) m.set(k, Object.assign({ key: k, dup: 1 }, r)); else { o.qty += r.qty; o.total += r.total; o.dup++; } });
    // target & input manual di sheet Summary (opsional)
    const targets = {};
    const sum = wb.Sheets.Summary || wb.Sheets[wb.SheetNames.find((x) => /summary|ringkas/i.test(x))];
    if (sum) {
      const a = XLSX.utils.sheet_to_json(sum, { header: 1, raw: true, defval: null }); const rng = XLSX.utils.decode_range(sum['!ref']);
      a.forEach((r, i) => { const z = s(r && r[1]); if (!/^Zona \d$/.test(z) || targets[z]) return; const cell = (cc) => sum[XLSX.utils.encode_cell({ r: i + rng.s.r, c: cc + rng.s.c })];
        const inp = (cc) => { const x = cell(cc); return x && !x.f && typeof x.v === 'number' ? x.v : 0; };
        targets[z] = { target: n(r[2]), mta: inp(4), fupp: inp(6) }; });
    }
    return { rows: [...m.values()], sheets, asOf, kurs, targets };
  }

  // ---- Tujuan & validitas BAU/MTA untuk setiap gerakan grup BAU/MTA ----
  const moveId = (m) => [m.matDoc, m.material, m.plant, m.mt, m.qty].join('|');
  function bauInfo(m, o) {
    if (m.grp === 'MTA') return { dest: 'KKKS lain', zFrom: o.zonaOf(m.plant), zTo: 'KKKS lain', valid: true, how: 'MTA', status: 'Sah (MTA ke KKKS lain)' };
    const manual = o.manual && o.manual[moveId(m)];
    // isian manual menang; lalu pasangan: BAU (qty −) tujuannya di baris + (toPlant), pembatalan (qty +) tujuannya di baris − (fromPlant)
    const pair = m.qty > 0 ? m.fromPlant : m.toPlant;
    let dest = '', how = '';
    if (manual) { dest = manual; how = 'Manual'; }
    if (!dest && pair && pair !== m.plant) { dest = pair; how = 'Pasangan 351/352'; }
    if (!dest) { const g = guessPlant(m.header); if (g) { dest = g; how = 'Header text'; } }
    const zFrom = o.zonaOf(m.plant), zTo = dest === 'LUAR' ? 'Luar Zona 1 & 4' : dest ? o.zonaOf(dest) : '';
    const mode = o.sameZona || (o.bauSameZona ? 'bau' : 'skip');
    let valid = true, asIU = false, status;
    if (!dest) { how = 'Di luar MB51'; status = 'Sah (tujuan di luar MB51, dihitung BAU)'; }
    else if (zFrom !== zTo) status = `Sah (${zFrom} → ${zTo})`;
    else if (mode === 'iu') { asIU = true; status = `Dihitung Internal Usage (sesama ${zFrom})`; }
    else if (mode === 'bau') status = `Sah (sesama ${zFrom}, dihitung BAU)`;
    else { valid = false; status = `Tidak dihitung (sesama ${zFrom})`; }
    return { dest, how, zFrom, zTo, valid, asIU, status };
  }

  // ---- Alokasi kuota DS ----
  function optimize(ds, moves, o) {
    moves.forEach((m) => { delete m._bau; });
    const cutoff = o.cutoff || (ds.asOf ? new Date(ds.asOf.getFullYear(), ds.asOf.getMonth(), ds.asOf.getDate() + 1) : null);
    const rows = ds.rows.map((r) => Object.assign({}, r, { iu: 0, bau: 0, mta: 0, k309: 0, ret: 0, iuUsd: 0, bauUsd: 0, mtaUsd: 0, k309Usd: 0, last: null }));
    const byKey = new Map(rows.map((r) => [r.key, r]));
    const list = moves.map((m, i) => ({ m, i })).filter((x) => x.m.date && (!cutoff || x.m.date >= cutoff)).sort((a, b) => a.m.date - b.m.date || a.i - b.i);
    const cum = new Map(), claims = new Map();
    for (const { m } of list) {
      let g = m.grp;
      if (g === 'BAU' || g === 'MTA') { const b = bauInfo(m, o); m._bau = b; if (!b.valid) continue; if (b.asIU) g = 'OWN USE'; }
      if (g === '309' && !o.include309) continue;
      const r = byKey.get(m.plant + '|' + m.material);
      if (m.cat === 'Return' && r) r.ret += m.qty;
      if (!g || !r) continue;
      const eff = -m.qty, c0 = cum.get(r.key) || 0, Q = r.qty;
      const cl = Math.min(Q, Math.max(0, c0 + eff)) - Math.min(Q, Math.max(0, c0)); cum.set(r.key, c0 + eff);
      if (!cl) continue;
      const f = g === 'OWN USE' ? 'iu' : g === 'BAU' ? 'bau' : g === 'MTA' ? 'mta' : 'k309';
      r[f] += cl; r[f + 'Usd'] += cl * r.unit; if (cl > 0 && (!r.last || m.date > r.last)) r.last = m.date;
      claims.set(m, { qty: cl, usd: cl * r.unit, ds: r });
    }
    rows.forEach((r) => { r.used = r.iu + r.bau + r.mta + r.k309; r.usedUsd = r.iuUsd + r.bauUsd + r.mtaUsd + r.k309Usd; r.sisa = Math.max(0, r.qty - r.used); r.sisaUsd = r.sisa * r.unit;
      r.status = r.used <= 0 ? 'Belum bergerak' : r.used >= r.qty - 1e-4 ? 'Habis' : 'Sebagian'; });
    // gerakan BAU/MTA lain (bukan DS / tidak lolos periode) tetap diberi info tujuan untuk laporan
    moves.forEach((m) => { if ((m.grp === 'BAU' || m.grp === 'MTA') && !m._bau) m._bau = bauInfo(m, o); });
    return { rows, claims, cutoff };
  }

  root.DS = { parseDS, optimize, bauInfo, guessPlant, moveId, KEYWORDS };
  if (typeof module !== 'undefined') module.exports = root.DS;
})(typeof window !== 'undefined' ? window : globalThis);
