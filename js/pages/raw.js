// ============ Data Mentah SAP (tab di Sumber Data): MB52, MB51, ME2N, ME3N ============
// Isi file tarikan SAP apa adanya (nama dan urutan kolom ikut Excel). Hanya ditambah kolom "Client" (dari nama file)
// dan file sejenis digabung. File dibaca langsung di browser dari folder lokal; tidak disalin ke mana pun.
(function () {
  const TABS = [['mb52', 'MB52', 'Stok per plant dan storage location'], ['mb51', 'MB51', 'Pergerakan material'], ['me2n', 'ME2N', 'PO dan RO'], ['me3n', 'ME3N', 'Kontrak']];
  const clientOfName = (f) => ((String(f.name).match(/(?:^|[^0-9])(100|180)(?:[^0-9]|$)/) || [])[1]) || (f.wk === 'PHE' ? '180' : '100');
  const cache = {}; // kind -> { sig, head, rows, files }

  // Baca satu file: cari baris header, rapikan nama kolom, buang baris kosong
  async function readOne(file) {
    const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array', cellDates: true, dense: true, cellText: false, cellNF: false, cellFormula: false, cellHTML: false, cellStyles: false });
    const aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: true, defval: null });
    const h = aoa.findIndex((r, i) => i < 15 && (r || []).filter((c) => typeof c === 'string' && c.trim()).length >= 4);
    if (h < 0) throw new Error('Baris header tidak ditemukan di ' + file.name);
    const seen = {}, head = aoa[h].map((c, i) => { let n = String(c == null ? 'Kolom ' + (i + 1) : c).trim() || 'Kolom ' + (i + 1); seen[n] = (seen[n] || 0) + 1; return seen[n] > 1 ? n + ' (' + seen[n] + ')' : n; });
    return { head, rows: aoa.slice(h + 1).filter((r) => r && r.some((c) => c != null && c !== '')) };
  }
  // Gabung beberapa file: kolom = gabungan nama (urutan file pertama dulu), kolom depan "Client".
  // Baris yang sama persis dengan baris di file lain (tumpang tindih periode) dibuang; baris kembar dalam satu file tetap.
  function compile(parts) {
    const names = []; parts.forEach((p) => p.head.forEach((n) => { if (!names.includes(n)) names.push(n); }));
    const out = [], seen = new Set();
    parts.forEach((p, pi) => {
      const idx = names.map((n) => p.head.indexOf(n)), mine = [];
      p.rows.forEach((r) => {
        const row = [p.client, ...idx.map((i) => (i < 0 ? null : r[i]))];
        if (parts.length > 1) { const k = row.map((v) => (v instanceof Date ? +v : v)).join('\u0001'); if (seen.has(k)) return; mine.push(k); }
        out.push(row);
      });
      mine.forEach((k) => seen.add(k));
    });
    return { head: ['Client', ...names], rows: out };
  }
  async function load(kind, status) {
    const entries = [...((S.rawFiles || {})[kind] || new Map()).values()].sort((a, b) => clientOfName(a).localeCompare(clientOfName(b)) || a.file.name.localeCompare(b.file.name));
    if (!entries.length) return null;
    const sig = entries.map((e) => e.file.name + e.file.size + e.file.lastModified).join('|');
    if (cache[kind] && cache[kind].sig === sig) return cache[kind];
    const parts = [], t0 = performance.now();
    for (const [i, e] of entries.entries()) { status(`Membaca ${esc(e.file.name)} (${i + 1} dari ${entries.length})…`); await tick(); const p = await readOne(e.file); p.client = clientOfName(e); parts.push(p); }
    status('Menggabungkan…'); await tick();
    const tRead = performance.now() - t0, c = compile(parts); c.sig = sig; console.debug('[raw]', kind, 'baca', Math.round(tRead), 'ms; gabung', Math.round(performance.now() - t0 - tRead), 'ms'); c.files = entries.map((e) => ({ name: e.file.name, client: clientOfName(e), at: new Date(e.file.lastModified) }));
    return (cache[kind] = c);
  }
  const rng = (c, name) => { const j = c.head.indexOf(name); if (j < 0) return ''; let lo = null, hi = null; for (const r of c.rows) { const v = r[j]; if (v instanceof Date) { if (!lo || v < lo) lo = v; if (!hi || v > hi) hi = v; } } return lo ? `Periode ${G.fDate(lo)} s.d. ${G.fDate(hi)}. ` : ''; };

  PAGES.raw_compile = compile; // dipakai tools/test-raw.js
  PAGES.raw = async function (host) { // host = elemen tujuan (tab Data Mentah di Sumber Data)
    S.rawTab = S.rawTab || 'mb52';
    const kind = S.rawTab, tok = (S.rawTok = (S.rawTok || 0) + 1);
    host.innerHTML = `<div class="tabs" role="tablist">${TABS.map(([k, t, d]) => `<button class="tab ${k === kind ? 'on' : ''}" role="tab" aria-selected="${k === kind}" data-t="${k}" title="${d}">${t}</button>`).join('')}</div><div id="rawBody" class="raw-body"></div>`;
    host.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { S.rawTab = b.dataset.t; PAGES.raw(host); }));
    const body = $('rawBody'), status = (h) => { if (tok === S.rawTok) body.innerHTML = `<p class="muted pad">${h}</p>`; };
    let c;
    try { c = await load(kind, status); } catch (e) { return status('Gagal membaca file: ' + esc(e.message)); }
    if (tok !== S.rawTok) return;
    if (!c) return status(`Belum ada file ${kind.toUpperCase()}. Pilih folder data di tab Sumber; nama file harus memuat ${kind.toUpperCase()}.`);
    const f = c.files, src = `Sumber: ${f.map((x) => `${esc(x.name)} (client ${x.client})`).join(', ')}. ${rng(c, 'Posting Date')}Tarikan ${[...new Set(f.map((x) => G.fDate(x.at)))].join(', ')}. Client 100 = IDR (WK PEP), client 180 = USD (WK PHE); angka tidak dijumlahkan lintas client. Kolom Client ditambahkan, kolom lain apa adanya.`;
    S.rawG = G.table(body, { head: c.head, rows: c.rows, name: 'SAP_' + kind.toUpperCase(), plantCol: c.head.indexOf('Plant'), source: src });
  };
})();
