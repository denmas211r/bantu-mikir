// Parser file SAP (MB52 + MRP). Jalan di browser dan Node. Semua diproses lokal, tidak ada upload ke server.
(function (root) {
  const norm = (h) => String(h == null ? '' : h).trim().toLowerCase();
  const num = (v) => { const n = typeof v === 'number' ? v : Number(String(v == null ? '' : v).replace(/,/g, '')); return isFinite(n) ? n : 0; };
  const str = (v) => (v == null ? '' : String(v).trim());

  // cari baris header: baris yang memuat semua kata kunci
  function findHeader(aoa, must) {
    for (let i = 0; i < Math.min(aoa.length, 15); i++) {
      const cells = (aoa[i] || []).map(norm);
      if (must.every((m) => cells.includes(m))) return i;
    }
    return -1;
  }
  const colMap = (hdrRow) => { const m = {}; hdrRow.forEach((h, i) => { const k = norm(h); if (k && !(k in m)) m[k] = i; }); return m; };

  // ---------- MB52 ----------
  function parseMB52(XLSX, buf) {
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
    const h = findHeader(aoa, ['plant', 'material']);
    if (h < 0) throw new Error('Header MB52 tidak ditemukan (butuh kolom Plant dan Material).');
    const c = colMap(aoa[h]);
    const need = ['unrestricted'];
    for (const n of need) if (!(n in c)) throw new Error('Kolom "' + n + '" tidak ada di file MB52.');
    const map = new Map(); let skipped = 0;
    for (let i = h + 1; i < aoa.length; i++) {
      const r = aoa[i]; const plant = str(r[c['plant']]); const mat = str(r[c['material']]);
      if (!plant || !mat) { skipped++; continue; }
      const key = plant + '|' + mat;
      let it = map.get(key);
      if (!it) {
        it = { plant, material: mat, desc: str(r[c['material description']]), uom: str(r[c['base unit of measure']]), soh: 0, value: 0, transit: 0, locs: [] };
        map.set(key, it);
      }
      const qty = num(r[c['unrestricted']]), val = num(r[c['value unrestricted']]);
      it.soh += qty; it.value += val; it.transit += num(r[c['transit and transfer']]);
      it.locs.push({ sloc: str(r[c['storage location']]), batch: str(r[c['batch']]), qty });
    }
    const items = [...map.values()];
    items.forEach((it) => { it.price = it.soh > 0 ? it.value / it.soh : 0; });
    return { items, skipped, plants: [...new Set(items.map((x) => x.plant))].sort() };
  }

  // ---------- MRP (sheet "MRP") ----------
  function parseMRP(XLSX, buf) {
    const wb = XLSX.read(new Uint8Array(buf), { type: 'array', sheets: 'MRP' });
    const ws = wb.Sheets['MRP'];
    if (!ws) throw new Error('Sheet "MRP" tidak ditemukan di file.');
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });
    const h = findHeader(aoa, ['material', 'plnt', 'min', 'max']);
    if (h < 0) throw new Error('Header MRP tidak ditemukan (butuh Material, Plnt, Min, Max).');
    const c = colMap(aoa[h]);
    const g = (r, k) => (k in c ? r[c[k]] : null);
    const map = new Map();
    for (let i = h + 1; i < aoa.length; i++) {
      const r = aoa[i]; const plant = str(g(r, 'plnt')); const mat = str(g(r, 'material'));
      if (!plant || !mat) continue;
      map.set(plant + '|' + mat, {
        kimap: str(g(r, 'kimap final')), desc: str(g(r, 'description')), field: str(g(r, 'field')), cat: str(g(r, 'cat')),
        lt: num(g(r, 'lt')), amu: num(g(r, 'amu')), min: num(g(r, 'min')), max: num(g(r, 'max')),
        osPO: num(g(r, 'os po/ro')), toOrder: num(g(r, 'to order')),
      });
    }
    return { map, plants: [...new Set([...map.keys()].map((k) => k.split('|')[0]))].sort() };
  }

  // ---------- Gabung stok + MRP (hanya untuk plant terpilih) ----------
  function status(it, mrp, mrpPlants) {
    if (!mrpPlants.has(it.plant)) return { s: 'Tidak dipantau', cls: 'mute' };
    if (!mrp) return { s: 'Tanpa MRP', cls: 'mute' };
    if (!mrp.min && !mrp.max) return { s: 'Tanpa Min/Max', cls: 'mute' };
    if (it.soh <= 0) return { s: 'Kosong', cls: 'low' };
    if (it.soh < mrp.min) return { s: 'Di bawah Min', cls: 'low' };
    if (mrp.max && it.soh > mrp.max) return { s: 'Surplus', cls: 'warn' };
    return { s: 'Aman', cls: 'ok' };
  }
  function merge(items, mrpMap, mrpPlants) {
    return items.map((it) => {
      const mrp = mrpMap ? mrpMap.get(it.plant + '|' + it.material) : null;
      const st = status(it, mrp, mrpPlants);
      return Object.assign({}, it, { mrp: mrp || null, status: st.s, cls: st.cls });
    });
  }

  root.Parser = { parseMB52, parseMRP, merge, status };
  if (typeof module !== 'undefined') module.exports = root.Parser;
})(typeof window !== 'undefined' ? window : globalThis);
