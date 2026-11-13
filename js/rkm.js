// ============ Parser RKM + rekap (anti dobel) + pencocokan ke MRP ============
// Satu file = satu lapangan, banyak sheet (satu sheet per fungsi: WS/PE, RAM, PO, HSSE, ...).
// Format template SHU: header memuat "KIMAP" dan "MATERIAL DESCRIPTION"; kolom "TOTAL" = qty setahun;
// 12 kolom sebelum TOTAL = qty per bulan; PIC/Fungsi/Asset ada di baris atas sheet.
// Format lain (mis. list kebutuhan tanpa KIMAP): dibaca kalau ada kolom deskripsi + kolom qty.
(function (root) {
  const s = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());
  const n = (v) => { const x = typeof v === 'number' ? v : Number(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(x) ? x : 0; };
  const normDesc = (d) => s(d).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  const normKey = (t) => s(t).toUpperCase().replace(/[^A-Z0-9]+/g, ' ').trim();
  const PLANT_RULES = [[/rantau/i, 'W101'], [/p(angkalan|kl)\.?\s*susu|psu|pangsu/i, 'W102'], [/jambi/i, 'W802'], [/lirik/i, 'W803'], [/\bnso\b|north\s*sumatra\s*offshore/i, 'NSO']];
  const guessPlant = (text) => { for (const [re, p] of PLANT_RULES) if (re.test(text)) return p; return ''; };
  const MONTH_RE = /^(jan|feb|mar|apr|mei|may|jun|jul|agu|aug|sep|okt|oct|nov|des|dec)(uari|uary|ruari|ruary|et|ch|il|i|e|y|stus|ust|t|tember|ober|ember)?\.?(\W*(20)?27)?$/i;
  const MONTH_IDX = { jan: 0, feb: 1, mar: 2, apr: 3, mei: 4, may: 4, jun: 5, jul: 6, agu: 7, aug: 7, sep: 8, okt: 9, oct: 9, nov: 10, des: 11, dec: 11 };

  function labelValue(aoa, label) { // nilai di sebelah label header (mis. "Asset", "Fungsi", "PIC")
    for (const r of aoa.slice(0, 12)) { if (!r) continue; const i = r.findIndex((x) => s(x).toLowerCase() === label.toLowerCase()); if (i >= 0) return s(r[i + 1]); }
    return '';
  }
  // bulan dari sel header: tanggal Excel (serial) atau nama bulan → indeks 0..11 untuk tahun 2027
  function monthOf(v) {
    if (v instanceof Date) return v.getFullYear() === 2027 ? v.getMonth() : null;
    if (typeof v === 'number' && v > 46000 && v < 47200) { const d = new Date(Math.round((v - 25569) * 864e5)); return d.getUTCFullYear() === 2027 ? d.getUTCMonth() : null; }
    const m = s(v).match(MONTH_RE); if (m) return MONTH_IDX[m[1].toLowerCase()];
    return null;
  }

  function parseSheet(a, sn, fileName, r0 = 0) {
    const up = (r) => (r || []).map((x) => s(x).toUpperCase());
    // 1) template SHU
    let hi = a.findIndex((r) => r && up(r).includes('KIMAP') && up(r).includes('MATERIAL DESCRIPTION'));
    let mode = 'SHU';
    // 2) format lain: ada kolom deskripsi + kolom qty/total (cari di 30 baris pertama)
    const DESC = /^(MATERIAL DESCRIPTION|DESCRIPTION|DESKRIPSI|NAMA (BARANG|MATERIAL)|URAIAN|MATERIAL NAME|ITEM DESCRIPTION)/;
    const QTY = /^(TOTAL|QTY|QUANTITY|JUMLAH|KEBUTUHAN|VOLUME)/;
    if (hi < 0) { hi = a.slice(0, 30).findIndex((r) => r && up(r).some((h) => DESC.test(h)) && up(r).some((h) => QTY.test(h))); mode = 'Lain'; }
    if (hi < 0) return null;
    const H = up(a[hi]);
    const c = (re) => H.findIndex((h) => (typeof re === 'string' ? h === re || h.startsWith(re) : re.test(h)));
    const iDesc = mode === 'SHU' ? c('MATERIAL DESCRIPTION') : c(DESC);
    let iTot = c('TOTAL'); if (iTot < 0) iTot = c(QTY);
    // kolom bulan: cek baris header dan baris di bawahnya
    let iM = new Array(12).fill(-1), sub = 0;
    [a[hi], a[hi + 1]].forEach((row, k) => (row || []).forEach((v, j) => { const m = monthOf(v); if (m != null && iM[m] < 0) { iM[m] = j; if (k) sub = 1; } }));
    if (iM.every((x) => x < 0) && mode === 'SHU' && iTot >= 12) iM = Array.from({ length: 12 }, (_, k) => iTot - 12 + k);
    const hasMonths = iM.some((x) => x >= 0);
    if (iTot < 0 && !hasMonths) return null;
    const iK = mode === 'SHU' ? c('KIMAP') : c(/^(KIMAP|KODE MATERIAL|MATERIAL (NO|NUMBER|CODE)|KODE BARANG|MATERIAL$)/);
    const iPicRow = c(/^(PIC|USER|PENGGUNA)/);
    const fungsi = labelValue(a, 'Fungsi') || sn;
    const pic = labelValue(a, 'PIC'), jabatan = labelValue(a, 'Jabatan');
    const items = [];
    a.slice(hi + 1 + sub).forEach((r, k) => {
      if (!r) return;
      const desc = s(r[iDesc]); if (!desc) return;
      const months = iM.map((i) => (i >= 0 ? n(r[i]) : 0));
      const sumM = months.reduce((x, y) => x + y, 0);
      const total = iTot >= 0 ? n(r[iTot]) || sumM : sumM;
      if (!total) return;
      const kimap = iK >= 0 ? s(r[iK]).toUpperCase() : '';
      items.push({
        id: fileName + '|' + sn + '|' + (r0 + hi + 2 + sub + k), file: fileName, sheet: sn, row: r0 + hi + 2 + sub + k, mode, fungsi, pic: (iPicRow >= 0 && s(r[iPicRow])) || pic, jabatan,
        no: s(r[c('NO')]), kategori: s(r[c('KATEGORI MATERIAL')]), kimap: /^[A-Z0-9-]{6,20}$/.test(kimap) && /\d/.test(kimap) ? kimap : '', kimapRaw: kimap,
        desc, unit: s(r[c(/^(UNIT|UOM|SATUAN)/)]), driver: s(r[c('DEMAND DRIVER')]), prioritas: s(r[c('PRIORITAS')]), strategic: s(r[c('STRATEGIC ITEM')]),
        months, monthsKnown: sumM > 0, total, remarks: s(r[c(/^(REMARKS|KETERANGAN|CATATAN|JUSTIFIKASI)/)]),
      });
    });
    return { mode, fungsi, pic, jabatan, items };
  }

  function parseFile(XLSX, buf, fileName) {
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    const items = [], skipped = [], sheets = [];
    let asset = '';
    for (const sn of wb.SheetNames) {
      const ws = wb.Sheets[sn]; if (ws['!state'] && ws['!state'] !== 'visible') { skipped.push(sn + ' (tersembunyi)'); continue; }
      const a = XLSX.utils.sheet_to_json(ws, { header: 1, raw: true, defval: null });
      const p = parseSheet(a, sn, fileName, ws['!ref'] ? XLSX.utils.decode_range(ws['!ref']).s.r : 0);
      if (!p || !p.items.length) { skipped.push(sn); continue; }
      asset = asset || labelValue(a, 'Asset');
      sheets.push({ sheet: sn, mode: p.mode, fungsi: p.fungsi, pic: p.pic, rows: p.items.length });
      items.push(...p.items);
    }
    if (!items.length) throw new Error('Tidak ada tabel kebutuhan material yang terbaca' + (skipped.length ? ' (sheet dilewati: ' + skipped.join(', ') + ')' : '') + '.');
    return { fileName, asset, plant: guessPlant(asset + ' ' + fileName), items, skipped, sheets };
  }

  // ---------- Rekap anti dobel ----------
  // Aturan (disepakati 13 Nov 2026):
  // - Kebutuhan dari PIC/fungsi berbeda = tetap dicatat terpisah per PIC dan dijumlah.
  // - Item yang sama dari PIC/fungsi yang sama tapi muncul di file lain (file gabungan vs file per fungsi, Rev.0 vs Rev.1)
  //   = dobel → yang dipakai file terbaru.
  // - Item dengan isi identik (plant, KIMAP/deskripsi, qty tiap bulan) di file lain = dobel walau label PIC/fungsi beda.
  // - Muncul lebih dari sekali di sheet yang sama = tetap dihitung, diberi tanda cek.
  // keep: Set id baris yang dipaksa tetap dihitung oleh user.
  function consolidate(files, keep) {
    keep = keep || new Set();
    const rows = [];
    files.forEach((f) => f.items.forEach((it) => rows.push(Object.assign({}, it, { plant: f.plant || '', mtime: f.mtime || 0, dup: null, cek: '' }))));
    const idKey = (r) => r.kimap || 'D:' + normDesc(r.desc);
    const picKey = (r) => normKey(r.pic) || normKey(r.fungsi);
    const newer = (a, b) => (b.mtime - a.mtime) || a.file.localeCompare(b.file);
    const mark = (groups, reason) => groups.forEach((g) => {
      const live = g.filter((r) => !r.dup); const files = [...new Set(live.map((r) => r.file))];
      if (files.length < 2) return;
      const win = live.slice().sort(newer)[0].file;
      live.forEach((r) => { if (r.file !== win && !keep.has(r.id)) r.dup = { reason, keep: win }; });
    });
    const group = (fn) => { const m = new Map(); rows.forEach((r) => { if (r.dup) return; const k = fn(r); (m.get(k) || m.set(k, []).get(k)).push(r); }); return [...m.values()]; };
    mark(group((r) => [r.plant, picKey(r), normKey(r.fungsi), idKey(r)].join('|')), 'PIC dan material sama di file lain');
    mark(group((r) => [r.plant, idKey(r), r.months.join(','), r.total].join('|')), 'Isi identik (qty tiap bulan sama) di file lain');
    // dobel di sheet yang sama → tetap dihitung, beri tanda
    group((r) => [r.file, r.sheet, idKey(r)].join('|')).forEach((g) => { if (g.length > 1) g.forEach((r) => (r.cek = `Muncul ${g.length}× di sheet yang sama`)); });
    const kept = rows.filter((r) => !r.dup), dups = rows.filter((r) => r.dup);
    // rekap per plant + KIMAP (atau deskripsi kalau tanpa KIMAP)
    const by = new Map();
    kept.forEach((r) => {
      const k = r.plant + '|' + idKey(r);
      let o = by.get(k);
      if (!o) by.set(k, (o = { key: k, plant: r.plant, kimap: r.kimap, desc: r.desc, units: new Set(), months: new Array(12).fill(0), total: 0, pics: [], rows: [], monthsKnown: true, files: new Set() }));
      o.total += r.total; r.months.forEach((v, i) => (o.months[i] += v)); if (!r.monthsKnown) o.monthsKnown = false;
      if (r.unit) o.units.add(r.unit.toUpperCase()); o.files.add(r.file); o.rows.push(r);
      const p = o.pics.find((x) => x.pic === r.pic && x.fungsi === r.fungsi); if (p) p.total += r.total; else o.pics.push({ pic: r.pic, fungsi: r.fungsi, total: r.total });
    });
    return { rows, kept, dups, rekap: [...by.values()] };
  }

  // Cocokkan item RKM ke baris MRP. items = baris RKM yang dipakai (punya .plant); mrpRes = Map "Material|Plant" → hasil mesin; wb = hasil MRP.parseWorkbook
  function match(items, mrpRes, wb) {
    const byKimapPlant = new Map(), byDescPlant = new Map();
    for (const r of mrpRes.values()) {
      if (r.kimap) byKimapPlant.set(r.kimap + '|' + r.plant, r.key);
      const d = normDesc(r.desc) + '|' + r.plant; byDescPlant.set(d, byDescPlant.has(d) ? null : r.key); // null = deskripsi ganda → tidak yakin
    }
    return items.map((it) => {
      const plant = it.plant; let key = null, how = '';
      if (plant && it.kimap) {
        const viaMat = mrpRes.has(it.kimap + '|' + plant) ? it.kimap + '|' + plant : null;
        const viaKimap = byKimapPlant.get(it.kimap + '|' + plant);
        const lt = wb && (wb.lt.get(it.kimap) || wb.ltByKimap.get(it.kimap));
        const viaLT = lt && mrpRes.has(lt.material + '|' + plant) ? lt.material + '|' + plant : null;
        key = viaMat || viaKimap || viaLT; how = key ? 'KIMAP' : '';
      }
      if (!key && plant) { const k = byDescPlant.get(normDesc(it.desc) + '|' + plant); if (k) { key = k; how = 'Deskripsi'; } }
      const master = wb && it.kimap ? wb.lt.get(it.kimap) || wb.ltByKimap.get(it.kimap) : null;
      return Object.assign({}, it, { plant, key, how, master: master || null });
    });
  }

  // Total RKM per Material|Plant (untuk input mesin MRP)
  function totals(matched) { const m = new Map(); matched.forEach((x) => { if (x.key) m.set(x.key, (m.get(x.key) || 0) + x.total); }); return m; }

  // ---------- Pemenuhan per bulan ----------
  // need[12] = kebutuhan 2027 per bulan; supply = stok + PO/RO jalan (dianggap tersedia awal 2027).
  // Hasil: tertutup per bulan, kurang per bulan, bulan pertama kurang, total kurang.
  function fulfil(need, supply) {
    let left = Math.max(0, supply || 0); const cov = [], short = []; let first = -1;
    need.forEach((v, i) => { const c = Math.min(v, left); left -= c; cov.push(c); short.push(v - c); if (v - c > 0 && first < 0) first = i; });
    return { cov, short, first, shortTotal: short.reduce((a, b) => a + b, 0), sisa: left };
  }

  root.RKM = { parseFile, consolidate, match, totals, fulfil, guessPlant, normDesc };
  if (typeof module !== 'undefined') module.exports = root.RKM;
})(typeof window !== 'undefined' ? window : globalThis);
