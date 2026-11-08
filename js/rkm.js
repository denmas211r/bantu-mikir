// ============ Parser RKM (format template SHU) + pencocokan ke MRP ============
// Satu file = satu lapangan, banyak sheet (satu sheet per fungsi: WS/PE, RAM, PO, HSSE, ...).
// Header tabel: baris yang memuat "KIMAP" dan "MATERIAL DESCRIPTION"; kolom "TOTAL" = qty setahun;
// 12 kolom sebelum TOTAL = qty per bulan.
(function (root) {
  const s = (v) => (v == null ? '' : String(v).trim());
  const n = (v) => { const x = typeof v === 'number' ? v : Number(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(x) ? x : 0; };
  const normDesc = (d) => s(d).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  const PLANT_RULES = [[/rantau/i, 'W101'], [/p(angkalan|kl)\.?\s*susu|psu|pangsu/i, 'W102'], [/jambi/i, 'W802'], [/lirik/i, 'W803']];
  const guessPlant = (text) => { for (const [re, p] of PLANT_RULES) if (re.test(text)) return p; return ''; };

  function labelValue(aoa, label) { // cari nilai di sebelah label header (mis. "Asset", "Fungsi")
    for (const r of aoa.slice(0, 10)) { if (!r) continue; const i = r.findIndex((x) => s(x).toLowerCase() === label.toLowerCase()); if (i >= 0) return s(r[i + 1]); }
    return '';
  }

  function parseFile(XLSX, buf, fileName) {
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    const items = [], skipped = [];
    let asset = '';
    for (const sn of wb.SheetNames) {
      const ws = wb.Sheets[sn]; if (ws['!state'] && ws['!state'] !== 'visible') continue;
      const a = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
      const hi = a.findIndex((r) => r && r.map((x) => s(x).toUpperCase()).includes('KIMAP') && r.map((x) => s(x).toUpperCase()).includes('MATERIAL DESCRIPTION'));
      if (hi < 0) { skipped.push(sn); continue; }
      const H = a[hi].map((x) => s(x).toUpperCase().replace(/\s+/g, ' '));
      const c = (k) => H.findIndex((h) => h === k || h.startsWith(k));
      const iTot = c('TOTAL'); if (iTot < 0) { skipped.push(sn); continue; }
      const iM = Array.from({ length: 12 }, (_, k) => iTot - 12 + k);
      asset = asset || labelValue(a, 'Asset');
      const fungsi = labelValue(a, 'Fungsi') || sn;
      for (const r of a.slice(hi + 1)) {
        const desc = s(r[c('MATERIAL DESCRIPTION')]); const total = n(r[iTot]);
        if (!desc || !total) continue;
        items.push({
          file: fileName, sheet: sn, fungsi, no: s(r[c('NO')]), kategori: s(r[c('KATEGORI MATERIAL')]), kimap: s(r[c('KIMAP')]),
          desc, unit: s(r[c('UNIT')]), driver: s(r[c('DEMAND DRIVER')]), prioritas: s(r[c('PRIORITAS')]), strategic: s(r[c('STRATEGIC ITEM')]),
          months: iM.map((i) => n(r[i])), total, remarks: s(r[c('REMARKS')]),
        });
      }
    }
    if (!items.length) throw new Error('Tidak ada tabel RKM format SHU di file ini' + (skipped.length ? ' (sheet dilewati: ' + skipped.join(', ') + ')' : '') + '.');
    return { fileName, asset, plant: guessPlant(asset + ' ' + fileName), items, skipped };
  }

  // Cocokkan item RKM ke baris MRP. mrpRes = Map "Material|Plant" → hasil mesin; wb = hasil MRP.parseWorkbook
  function match(rkmFiles, mrpRes, wb) {
    const byKimapPlant = new Map(), byDescPlant = new Map();
    for (const r of mrpRes.values()) {
      if (r.kimap) byKimapPlant.set(r.kimap + '|' + r.plant, r.key);
      const d = normDesc(r.desc) + '|' + r.plant; byDescPlant.set(d, byDescPlant.has(d) ? null : r.key); // null = deskripsi ganda → tidak yakin
    }
    const out = [];
    for (const f of rkmFiles) for (const it of f.items) {
      const plant = f.plant; let key = null, how = '';
      if (plant && it.kimap) {
        const viaMat = mrpRes.has(it.kimap + '|' + plant) ? it.kimap + '|' + plant : null;
        const viaKimap = byKimapPlant.get(it.kimap + '|' + plant);
        const lt = wb && (wb.lt.get(it.kimap) || wb.ltByKimap.get(it.kimap));
        const viaLT = lt && mrpRes.has(lt.material + '|' + plant) ? lt.material + '|' + plant : null;
        key = viaMat || viaKimap || viaLT; how = key ? 'KIMAP' : '';
      }
      if (!key && plant) { const k = byDescPlant.get(normDesc(it.desc) + '|' + plant); if (k) { key = k; how = 'Deskripsi'; } }
      const master = wb && it.kimap ? wb.lt.get(it.kimap) || wb.ltByKimap.get(it.kimap) : null;
      out.push(Object.assign({}, it, { plant, key, how, master: master || null }));
    }
    return out;
  }

  // Total RKM per Material|Plant (untuk input mesin MRP)
  function totals(matched) { const m = new Map(); matched.forEach((x) => { if (x.key) m.set(x.key, (m.get(x.key) || 0) + x.total); }); return m; }

  root.RKM = { parseFile, match, totals, guessPlant, normDesc };
  if (typeof module !== 'undefined') module.exports = root.RKM;
})(typeof window !== 'undefined' ? window : globalThis);
