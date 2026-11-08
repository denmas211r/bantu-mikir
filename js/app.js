// ============ MIM Inventory Analyst — App (routing + halaman) ============
const ICON = {
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h12L22 7H6"/>',
  calc: '<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h2M14 19h2"/>',
  gauge: '<path d="M12 14l4-4"/><path d="M3.3 17a10 10 0 1 1 17.4 0"/>',
  db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5M9 7h7M9 11h5"/>',
  truck: '<path d="M2 16V7a1 1 0 0 1 1-1h11v10"/><path d="M14 9h4l4 4v3h-2"/><circle cx="6.5" cy="17.5" r="2"/><circle cx="17.5" cy="17.5" r="2"/>',
  route: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8a3 3 0 0 0 0-6H8a3 3 0 0 1 0-6h8"/>',
  gear: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
};
const svg = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICON[k]}</svg>`;

// Menu: [grup, [route, label, icon, sub-judul, tahap belum jadi?]]
const MENU = [
  ['Ringkasan', [['beranda', 'Beranda', 'home', 'Ringkasan stok dan status Min/Max']]],
  ['Material & Stok', [
    ['cari', 'Cari Material', 'search', 'Cari lintas plant, status stok dari mesin MRP'],
    ['rkm', 'RKM x MRP', 'chart', 'MRP sebagai metode, RKM 2027 sebagai input'],
  ]],
  ['Pengadaan', [
    ['kontrak', 'Kontrak (OA/RO)', 'doc', 'Sisa nilai & masa kontrak, PO/RO berjalan, pengiriman terlambat'],
    ['order', 'Vendor & PR/PO', 'cart', 'Draft RO, draft PR + OE, kandidat kontrak, kontak vendor'],
    ['expediting', 'Expediting', 'truck', 'Progres PO/RO sampai GR gudang, dan reservasi yang belum di-GI'],
    ['lacak', 'Lacak Material', 'route', 'Jejak PR → PO/RO → GR → stok → reservasi → GI'],
    ['hps', 'HPS / OE', 'calc', 'Evaluasi penawaran vendor', 'Tahap 5'],
  ]],
  ['Laporan', [['kpi', 'KPI Inventory', 'gauge', 'Service level, TOR, slow moving & dead stock', 'Tahap 5']]],
  ['Panduan', [['regulasi', 'Regulasi & Logika', 'book', 'Aturan Pedoman/TKO, logika MRP, dan RKM yang dipakai web ini']]],
  ['Data', [
    ['data', 'Data SAP', 'db', 'Folder data, MB52, MRP, dan RKM (diproses di browser)'],
    ['pengaturan', 'Pengaturan', 'gear', 'Plant MRP, basis kebutuhan, batas Long Lead Item'],
  ]],
];
const ROUTES = Object.fromEntries(MENU.flatMap(([, items]) => items.map((i) => [i[0], i])));
const DEFAULT_MRP_PLANTS = ['W101', 'W102', 'W802', 'W803'];
const PLANT_NAME = { W101: 'Rantau', W102: 'Pangkalan Susu', W802: 'Jambi', W803: 'Lirik', W105: 'Prabumulih', W106: 'Pendopo', W801: 'Limau', W809: 'Adera', W811: 'Ramba' };
const METHOD = { tko: 'Metode TKO / Pedoman (disarankan)', excel: 'Metode Excel lama (untuk validasi)' };
const TKO_FIELDS = [['amuMonths', 'AMU dari berapa bulan terakhir', 'bln'], ['nonContractLT', 'Tambahan lead time pengadaan bila tanpa kontrak', 'bln'], ['roqMonths', 'Reorder quantity (Max = ROP + n × AMU)', 'bln'], ['ssCapMonths', 'Batas safety stock maintenance/slow', 'bln × AMU'], ['chemSSMonths', 'Safety stock chemical/catalyst', 'bln × AMU'], ['chemP', 'Periode review chemical (P)', 'bln'], ['excessGeneral', 'Batas berlebih (umum)', 'bln'], ['excessChem', 'Batas berlebih (chemical)', 'bln']];
const BASIS = { hist: 'Histori saja (sama dengan Excel)', max: 'Terbesar antara histori dan RKM', 'rkm-new': 'RKM hanya untuk item tanpa histori' };

let S = null; // sesi
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 2) => (typeof n === 'number' && isFinite(n) ? n.toLocaleString('id-ID', { maximumFractionDigits: d }) : '-');
const rp = (n) => (n >= 1e9 ? fmt(n / 1e9, 2) + ' M' : n >= 1e6 ? fmt(n / 1e6, 1) + ' jt' : fmt(n, 0));
const plantLabel = (p) => (PLANT_NAME[p] ? `${p} · ${PLANT_NAME[p]}` : p || '-');
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const tick = () => new Promise((r) => setTimeout(r, 30));

// ---------- Login ----------
$('lf').onsubmit = async (e) => {
  e.preventDefault(); $('err').textContent = ''; $('lb').disabled = true; $('lb').textContent = 'Memproses…';
  try {
    const keys = await (await fetch('data/keys.json', { cache: 'no-store' })).json();
    const entry = keys[$('u').value.trim().toLowerCase()];
    if (!entry) throw 0;
    const { role, key } = await Vault.login(entry, $('p').value);
    const data = await Vault.decryptJSON(key, await (await fetch('data/data.enc.json', { cache: 'no-store' })).json());
    S = { role, data, user: $('u').value.trim(), mb52: null, mrpWB: null, rkmFiles: [], mrpRes: null, rkmMatched: [], mrp: null,
      mrpPlants: new Set(store.get('mrpPlants') || DEFAULT_MRP_PLANTS), set: Object.assign({ basis: 'hist', lliLT: 6, method: 'tko', tko: {} }, store.get('settings') || {}), rkmTab: 'vs' };
    $('login').hidden = true; $('app').hidden = false;
    $('whoName').textContent = S.user; $('whoRole').textContent = role; $('avatar').textContent = S.user[0].toUpperCase();
    buildNav(); route(); initFolder();
  } catch { $('err').textContent = 'Username atau password salah.'; }
  $('lb').disabled = false; $('lb').textContent = 'Masuk';
};
$('out').onclick = () => location.reload();
$('menuBtn').onclick = () => $('sidebar').classList.toggle('open');
window.addEventListener('hashchange', () => S && route());

function buildNav() {
  $('nav').innerHTML = MENU.map(([g, items]) => `<div class="nav-group">${g}</div>` +
    items.map(([k, t, ic, , tahap]) => `<a href="#/${k}" data-k="${k}">${svg(ic)}<span>${t}</span>${tahap ? '<span class="soon">segera</span>' : ''}</a>`).join('')).join('');
}
function sideData() {
  const row = (on, label, val) => `<div><span class="dot ${on ? 'on' : ''}"></span>${label}: <b>${val}</b></div>`;
  $('sideData').innerHTML = row(S.mb52, 'MB52', S.mb52 ? fmt(S.mb52.items.length, 0) + ' item' : 'belum ada') +
    row(S.mrpWB, 'MRP', S.mrpWB ? fmt(S.mrpRes.size, 0) + ' item' : 'belum ada') +
    row(S.rkmFiles.length, 'RKM', S.rkmFiles.length ? S.rkmFiles.length + ' file' : 'belum ada') +
    row(S.me3n, 'Kontrak', S.me3n ? fmt(S.me3n.docs.size, 0) + ' OA' : 'belum ada') +
    row(S.me2n, 'PO/RO', S.me2n ? fmt(S.me2n.lines.length, 0) + ' baris' : 'belum ada') +
    row(S.mb51, 'MB51', S.mb51 ? fmt(S.mb51.moves.length, 0) + ' gerakan' : 'belum ada') +
    row(S.mb25, 'MB25', S.mb25 ? fmt(S.mb25.lines.length, 0) + ' reservasi' : 'belum ada');
}
function route() {
  const k = (location.hash.match(/#\/([\w-]+)/) || [, 'beranda'])[1];
  const r = ROUTES[k] || ROUTES.beranda;
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.k === r[0]));
  $('pageTitle').textContent = r[1]; $('pageSub').textContent = r[3] || ''; $('pageActions').innerHTML = '';
  $('sidebar').classList.remove('open'); sideData();
  (PAGES[r[0]] || soon)(r);
}

// ---------- Hitung ulang semua (MB52 + MRP + RKM + pengaturan) ----------
function recompute() {
  if (!S.mrpWB) { S.mrpRes = null; S.mrp = null; S.rkmMatched = []; return; }
  const stockMap = S.mb52 ? new Map(S.mb52.items.map((i) => [i.material + '|' + i.plant, i.soh])) : null;
  const o = { stockMap, method: S.set.method, tko: S.set.tko, contractPick: S.me3n ? S.me3n.pick : null, ospoMap: S.me2n ? S.me2n.ospo : null, mb25Map: S.mb25 ? S.mb25.open : null };
  const base = MRP.run(S.mrpWB, o);
  S.rkmMatched = RKM.match(S.rkmFiles, base, S.mrpWB);
  S.mrpRes = MRP.run(S.mrpWB, Object.assign({}, o, { rkmMap: RKM.totals(S.rkmMatched), basis: S.set.basis }));
  const map = new Map();
  for (const r of S.mrpRes.values()) map.set(r.plant + '|' + r.material, { min: r.min2 || 0, max: r.max2 || 0, aging: r.aging, toOrder: r.toOrder });
  S.mrp = { map, plants: [...new Set([...S.mrpRes.values()].map((r) => r.plant))].sort() };
}
function activeItems() {
  if (S.mb52) return Parser.merge(S.mb52.items, S.mrp ? S.mrp.map : null, S.mrpPlants);
  if (S.mrpRes) return Parser.merge([...S.mrpRes.values()].map((r) => ({ plant: r.plant, material: r.material, desc: r.desc, uom: r.uom, soh: r.stock, value: 0, price: 0, transit: 0, locs: [] })), S.mrp.map, S.mrpPlants);
  return S.data.materials.map((m) => {
    const it = { plant: m.plant, material: m.kimap, desc: m.desc, uom: m.uom, soh: m.soh, value: 0, price: 0, transit: 0, locs: [], mrp: { min: m.min, max: m.max } };
    const st = Parser.status(it, it.mrp, S.mrpPlants); return Object.assign(it, { status: st.s, cls: st.cls });
  });
}

// ---------- Muat file ----------
async function loadMB52(file) { S.mb52 = Parser.parseMB52(XLSX, await file.arrayBuffer()); S.mb52Name = file.name; }
async function loadMRP(file) { S.mrpWB = MRP.parseWorkbook(XLSX, await file.arrayBuffer()); S.mrpName = file.name; }
async function loadME3N(file) { S.me3n = Contract.parseME3N(XLSX, await file.arrayBuffer()); S.me3nName = file.name; }
async function loadME2N(file) { S.me2n = Contract.parseME2N(XLSX, await file.arrayBuffer()); S.me2nName = file.name; }
async function loadMB51(file) { S.mb51 = Trace.parseMB51(XLSX, await file.arrayBuffer()); S.mb51Name = file.name; }
async function loadMB25(file) { S.mb25 = Trace.parseMB25(XLSX, await file.arrayBuffer()); S.mb25Name = file.name; }
async function loadRKM(file, name) {
  const f = RKM.parseFile(XLSX, await file.arrayBuffer(), name || file.name);
  const saved = (store.get('rkmPlant') || {})[f.fileName]; if (saved) f.plant = saved;
  S.rkmFiles = S.rkmFiles.filter((x) => x.fileName !== f.fileName).concat(f);
}

// ---------- Folder lokal ----------
function banner(html, cls = '') { const b = $('banner'); b.className = 'banner ' + cls; b.innerHTML = html; b.hidden = !html; }
async function initFolder() {
  if (!Folder.supported()) return;
  const h = await Folder.loadHandle(); if (!h) return;
  if (await Folder.permission(h, false)) return loadFolder(h);
  banner(`📁 Folder data <b>${esc(h.name)}</b> sudah tersimpan. <button class="btn primary" id="fGo">Muat data sekarang</button>`);
  $('fGo').onclick = async () => { if (await Folder.permission(h, true)) loadFolder(h); };
}
async function loadFolder(h) {
  banner(`⏳ Membaca folder <b>${esc(h.name)}</b>…`); await tick();
  const log = [];
  try {
    const c = Folder.classify(await Folder.listExcel(h));
    if (c.mb52) { await loadMB52(c.mb52.file); log.push('MB52: ' + c.mb52.name); }
    if (c.mrp) { await tick(); await loadMRP(c.mrp.file); log.push('MRP: ' + c.mrp.name); }
    if (c.me3n) { await tick(); await loadME3N(c.me3n.file); log.push('Kontrak: ' + c.me3n.name); }
    if (c.me2n) { await tick(); await loadME2N(c.me2n.file); log.push('PO: ' + c.me2n.name); }
    if (c.mb51) { await tick(); await loadMB51(c.mb51.file); log.push('MB51: ' + c.mb51.name); }
    if (c.mb25) { await tick(); await loadMB25(c.mb25.file); log.push('MB25: ' + c.mb25.name); }
    if (c.regulasi) { S.regulasi = { name: c.regulasi.name, text: await c.regulasi.file.text() }; log.push('Regulasi: ' + c.regulasi.name); }
    for (const r of c.rkm) { try { await loadRKM(r.file, r.name); log.push('RKM: ' + r.name); } catch (e) { log.push('⚠ ' + r.name + ' — ' + e.message); } }
    recompute(); route();
    banner(log.length ? `✓ Dimuat dari <b>${esc(h.name)}</b>: ${log.map(esc).join(' · ')} <button class="icon-btn" id="bx">✕</button>` : `Folder <b>${esc(h.name)}</b> tidak berisi file MB52/MRP/RKM. Nama file harus memuat kata "MB52", "MRP", atau "RKM". <button class="icon-btn" id="bx">✕</button>`, log.length ? 'ok' : 'warn');
  } catch (e) { banner('Gagal membaca folder: ' + esc(e.message) + ' <button class="icon-btn" id="bx">✕</button>', 'bad'); }
  const bx = $('bx'); if (bx) bx.onclick = () => banner('');
}

// ---------- Util tabel ----------
const expand = (q) => q.toLowerCase().split(/\s+/).filter(Boolean).map((x) => S.data.synonyms.find((s) => s.includes(x)) || [x]);
const hit = (text, groups) => groups.every((g) => g.some((t) => text.toLowerCase().includes(t)));
let timer; const debounce = (fn) => { clearTimeout(timer); timer = setTimeout(fn, 200); };
const demoNote = () => (S.mb52 || S.mrpWB ? '' : `<div class="card"><b>Masih memakai data contoh.</b> <span class="muted">Buka <a href="#/data">Data SAP</a> untuk memilih folder data atau upload file.</span></div>`);
const pill = (t, cls) => `<span class="pill ${cls}">${esc(t)}</span>`;
const agingPill = (a) => pill(a || '-', a === 'FS' ? 'ok' : a === 'MD' ? 'info' : a === 'SP' ? 'warn' : 'mute');
// cols: [judul, fn(row)->html, kelas, fn(row)->nilai export]
function table(rows, cols, limit = 300) {
  if (!rows.length) return `<div class="card empty"><div class="big">🔍</div>Tidak ada data.</div>`;
  return `<div class="table-wrap"><table><tr>${cols.map((c) => `<th class="${c[2] || ''}">${c[0]}</th>`).join('')}</tr>` +
    rows.slice(0, limit).map((r) => `<tr>${cols.map((c) => `<td class="${c[2] || ''}">${c[1](r)}</td>`).join('')}</tr>`).join('') + '</table></div>';
}
function exportXLSX(name, rows, cols) {
  const aoa = [cols.map((c) => c[0])].concat(rows.map((r) => cols.map((c) => (c[3] ? c[3](r) : String(c[1](r)).replace(/<[^>]+>/g, '')))));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Data'); XLSX.writeFile(wb, name + '.xlsx');
}

// ---------- Halaman ----------
const PAGES = {
  beranda() {
    const items = activeItems();
    const c = (s) => items.filter((x) => x.status === s).length;
    const value = items.reduce((a, x) => a + (x.value || 0), 0);
    const order = S.mrpRes ? [...S.mrpRes.values()].filter((r) => S.mrpPlants.has(r.plant) && r.toOrder > 0).length : 0;
    const tiles = [
      ['Total item', fmt(items.length, 0), 'info', '', ''], ['Nilai stok (Rp)', rp(value), 'info', '', ''],
      ['Kosong', fmt(c('Kosong'), 0), 'bad', 'Kosong', 'cari'], ['Di bawah Min', fmt(c('Di bawah Min'), 0), 'bad', 'Di bawah Min', 'cari'],
      ['Perlu order (To Order)', fmt(order, 0), 'warn', 'order', 'rkm'], ['Surplus (> Max)', fmt(c('Surplus'), 0), 'warn', 'Surplus', 'cari'],
    ];
    const perPlant = {}; items.forEach((x) => { const p = (perPlant[x.plant] ||= { n: 0, v: 0, low: 0 }); p.n++; p.v += x.value || 0; if (x.cls === 'low') p.low++; });
    $('view').innerHTML = `${demoNote()}
      <div class="tiles">${tiles.map(([k, v, cls, st, to]) => `<div class="tile ${cls}" data-st="${st}" data-to="${to}"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>
      <div class="grid">
        <div class="card"><h3>Stok per plant</h3><div class="table-wrap flat"><table>
          <tr><th>Plant</th><th class="num">Item</th><th class="num">Nilai (Rp)</th><th class="num">Perlu perhatian</th></tr>
          ${Object.entries(perPlant).sort().map(([p, v]) => `<tr><td>${esc(plantLabel(p))}${S.mrpPlants.has(p) ? '' : ' ' + pill('tanpa MRP', 'mute')}</td><td class="num">${fmt(v.n, 0)}</td><td class="num">${rp(v.v)}</td><td class="num">${v.low ? pill(v.low, 'low') : '-'}</td></tr>`).join('')}
        </table></div></div>
        <div class="card hero"><h3>Mulai kerja</h3><ol class="steps">
          <li>Buka <b>Data SAP</b>, pilih folder berisi MB52, MRP, dan RKM.</li>
          <li>Login berikutnya cukup klik <b>Muat data sekarang</b>.</li>
          <li>Klik kotak di atas untuk langsung melihat daftarnya.</li></ol>
          <a class="btn" href="#/data">Buka Data SAP →</a></div>
      </div>`;
    document.querySelectorAll('.tile[data-to]').forEach((t) => (t.onclick = () => {
      if (!t.dataset.to) return;
      if (t.dataset.to === 'rkm') { S.rkmTab = 'order'; location.hash = '#/rkm'; } else { sessionStorage.setItem('fs', t.dataset.st); location.hash = '#/cari'; }
    }));
  },

  cari() {
    const items = activeItems();
    const plants = [...new Set(items.map((x) => x.plant))].sort();
    const stats = [...new Set(items.map((x) => x.status))].sort();
    const preset = sessionStorage.getItem('fs') || ''; sessionStorage.removeItem('fs');
    $('view').innerHTML = `${demoNote()}
      <div class="filters"><input id="q" placeholder="Cari kode material atau deskripsi… (mis. packer, laker)">
        <select id="fp"><option value="">Semua plant</option>${plants.map((p) => `<option value="${esc(p)}">${esc(plantLabel(p))}</option>`).join('')}</select>
        <select id="fs"><option value="">Semua status</option>${stats.map((p) => `<option ${p === preset ? 'selected' : ''}>${esc(p)}</option>`).join('')}</select></div>
      <div id="cnt" class="count"></div><div id="res"></div>`;
    const cols = [['Plant', (m) => esc(m.plant)], ['Material', (m) => `<span class="mono">${esc(m.material)}</span>`], ['Deskripsi', (m) => esc(m.desc)],
      ['Stok', (m) => fmt(m.soh), 'num'], ['UoM', (m) => esc(m.uom)], ['Harga/unit', (m) => fmt(m.price, 0), 'num'], ['Nilai (Rp)', (m) => fmt(m.value, 0), 'num'],
      ['Aging', (m) => (m.mrp && m.mrp.aging ? agingPill(m.mrp.aging) : '-')], ['Min', (m) => (m.mrp ? fmt(m.mrp.min) : '-'), 'num'], ['Max', (m) => (m.mrp ? fmt(m.mrp.max) : '-'), 'num'],
      ['Status', (m) => pill(m.status, m.cls)]];
    const draw = () => {
      const groups = expand($('q').value), fp = $('fp').value, fs = $('fs').value;
      const rows = items.filter((m) => (!fp || m.plant === fp) && (!fs || m.status === fs) && hit(m.material + ' ' + m.desc, groups));
      $('cnt').textContent = `${fmt(rows.length, 0)} item${rows.length > 300 ? ' · menampilkan 300 pertama, persempit pencarian' : ''}`;
      $('res').innerHTML = table(rows, cols);
    };
    $('q').oninput = () => debounce(draw); $('fp').onchange = draw; $('fs').onchange = draw; draw(); $('q').focus();
  },

  rkm() {
    if (!S.mrpWB) { $('view').innerHTML = `<div class="card empty"><div class="big">📊</div><h3>Butuh file MRP</h3><p>Mesin MRP butuh file MRP (sheet MRP + LeadTime). RKM opsional sebagai input.</p><a class="btn primary" href="#/data">Buka Data SAP</a></div>`; return; }
    const res = [...S.mrpRes.values()].filter((r) => S.mrpPlants.has(r.plant));
    const M = S.rkmMatched, rkmPlants = new Set(S.rkmFiles.map((f) => f.plant).filter(Boolean));
    const rkmKeys = new Set(M.filter((x) => x.key).map((x) => x.key));
    const today = new Date(); const nowIdx = today.getFullYear() * 12 + today.getMonth();
    const lt = (x) => (x.key && S.mrpRes.get(x.key) ? S.mrpRes.get(x.key).lt : x.master ? x.master.lt : null);
    const needMonth = (x) => { const i = x.months.findIndex((v) => v > 0); return i < 0 ? { i: 0, known: false } : { i, known: true }; };
    const vs = M.filter((x) => x.key).map((x) => ({ x, r: S.mrpRes.get(x.key) }));
    const noMrp = M.filter((x) => !x.key).map((x) => {
      const m = x.master; const sug = m && m.lt != null ? MRP.calc({ usage36: [], amuSum: 0, lt: m.lt, hasContract: m.hasContract, rkmYear: x.total, agingOverride: 'DS' }, { basis: 'rkm-new' }) : null;
      return { x, sug };
    });
    const noRkm = res.filter((r) => rkmPlants.has(r.plant) && !rkmKeys.has(r.key) && (r.aging === 'FS' || r.aging === 'MD'));
    const lli = M.map((x) => ({ x, lt: lt(x), r: x.key ? S.mrpRes.get(x.key) : null })).filter((o) => o.lt != null && o.lt >= S.set.lliLT).map((o) => {
      const nm = needMonth(o.x); const need = 2027 * 12 + nm.i; const due = need - Math.ceil(o.lt);
      const cover = o.r ? o.r.stock + o.r.ospo : 0; const ok = cover >= o.x.total;
      const st = ok ? ['Tercukupi stok/PO', 'ok'] : due < nowIdx ? ['Terlambat pesan', 'low'] : due - nowIdx <= 1 ? ['Pesan bulan ini', 'warn'] : ['Terjadwal', 'info'];
      return Object.assign(o, { nm, due, cover, st });
    }).sort((a, b) => a.due - b.due);
    const orders = res.filter((r) => r.toOrder > 0).sort((a, b) => b.toOrder - a.toOrder);
    const sehat = res.filter((r) => r.berlebih || (r.method === 'tko' ? r.aging === 'DS' && r.stock > 0 : false) || (r.surplus > 0 && r.stock > 0)).sort((a, b) => (b.surplus || 0) - (a.surplus || 0));
    const diffKey = (r) => { const a = r.alt.excel, b = r.alt.tko; return a.aging !== b.aging || (a.min2 || 0) !== (b.min2 || 0) || (a.max2 || 0) !== (b.max2 || 0) || a.toOrder !== b.toOrder; };
    const cmp = res.filter(diffKey);
    const mLabel = (idx) => ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][((idx % 12) + 12) % 12] + ' ' + Math.floor(idx / 12);
    const amu12 = (r) => r.amuHist * 12;

    const TABS = {
      vs: ['RKM vs MRP', vs, [['Fungsi', (o) => esc(o.x.fungsi)], ['KIMAP', (o) => `<span class="mono">${esc(o.x.kimap || o.r.material)}</span>`], ['Deskripsi', (o) => esc(o.x.desc)],
        ['RKM 2027', (o) => fmt(o.x.total), 'num', (o) => o.x.total], ['Histori/thn (AMU×12)', (o) => fmt(amu12(o.r)), 'num', (o) => amu12(o.r)],
        ['Selisih', (o) => { const d = o.x.total - amu12(o.r); return `<span class="${d > 0 ? 'warn' : ''}">${d > 0 ? '+' : ''}${fmt(d)}</span>`; }, 'num', (o) => o.x.total - amu12(o.r)],
        ['Aging', (o) => agingPill(o.r.aging), '', (o) => o.r.aging], ['Stok', (o) => fmt(o.r.stock), 'num', (o) => o.r.stock], ['OS PO/RO', (o) => fmt(o.r.ospo), 'num', (o) => o.r.ospo],
        ['Min', (o) => fmt(o.r.min2), 'num', (o) => o.r.min2], ['Max', (o) => fmt(o.r.max2), 'num', (o) => o.r.max2], ['To Order', (o) => (o.r.toOrder ? pill(fmt(o.r.toOrder), 'warn') : '0'), 'num', (o) => o.r.toOrder],
        ['Basis', (o) => esc(o.r.basis)], ['Cocok via', (o) => esc(o.x.how)]], (o) => o.x.kimap + ' ' + o.x.desc + ' ' + o.x.fungsi],
      noMrp: ['RKM tanpa MRP', noMrp, [['Fungsi', (o) => esc(o.x.fungsi)], ['KIMAP', (o) => (o.x.kimap ? `<span class="mono">${esc(o.x.kimap)}</span>` : pill('tanpa KIMAP', 'low')), '', (o) => o.x.kimap],
        ['Deskripsi', (o) => esc(o.x.desc)], ['Unit', (o) => esc(o.x.unit)], ['RKM 2027', (o) => fmt(o.x.total), 'num', (o) => o.x.total],
        ['Di master LeadTime?', (o) => (o.x.master ? pill('Ada', 'ok') : pill('Tidak', 'mute')), '', (o) => (o.x.master ? 'Ada' : 'Tidak')], ['LT (bln)', (o) => (o.x.master ? fmt(o.x.master.lt) : '-'), 'num', (o) => (o.x.master ? o.x.master.lt : '')],
        ['Usulan Min', (o) => (o.sug ? fmt(o.sug.min2) : '-'), 'num', (o) => (o.sug ? o.sug.min2 : '')], ['Usulan Max', (o) => (o.sug ? fmt(o.sug.max2) : '-'), 'num', (o) => (o.sug ? o.sug.max2 : '')],
        ['Remarks', (o) => esc(o.x.remarks)]], (o) => o.x.kimap + ' ' + o.x.desc + ' ' + o.x.fungsi],
      noRkm: ['MRP tanpa RKM', noRkm, [['Plant', (r) => esc(r.plant)], ['Material', (r) => `<span class="mono">${esc(r.material)}</span>`], ['Deskripsi', (r) => esc(r.desc)], ['Aging', (r) => agingPill(r.aging), '', (r) => r.aging],
        ['Histori/thn', (r) => fmt(amu12(r)), 'num', amu12], ['Stok', (r) => fmt(r.stock), 'num', (r) => r.stock], ['Min', (r) => fmt(r.min2), 'num', (r) => r.min2], ['Max', (r) => fmt(r.max2), 'num', (r) => r.max2],
        ['To Order', (r) => fmt(r.toOrder), 'num', (r) => r.toOrder]], (r) => r.material + ' ' + r.desc],
      lli: [`Long Lead Item (LT ≥ ${S.set.lliLT} bln)`, lli, [['Fungsi', (o) => esc(o.x.fungsi)], ['KIMAP', (o) => `<span class="mono">${esc(o.x.kimap)}</span>`], ['Deskripsi', (o) => esc(o.x.desc)],
        ['LT (bln)', (o) => fmt(o.lt), 'num', (o) => o.lt], ['RKM 2027', (o) => fmt(o.x.total), 'num', (o) => o.x.total],
        ['Butuh mulai', (o) => mLabel(2027 * 12 + o.nm.i) + (o.nm.known ? '' : ' *'), '', (o) => mLabel(2027 * 12 + o.nm.i)], ['Pesan paling lambat', (o) => `<b>${mLabel(o.due)}</b>`, '', (o) => mLabel(o.due)],
        ['Stok + PO', (o) => (o.r ? fmt(o.cover) : '-'), 'num', (o) => o.cover], ['Status', (o) => pill(o.st[0], o.st[1]), '', (o) => o.st[0]]], (o) => o.x.kimap + ' ' + o.x.desc],
      order: ['Perlu order (To Order)', orders, [['Plant', (r) => esc(r.plant)], ['Material', (r) => `<span class="mono">${esc(r.material)}</span>`], ['Deskripsi', (r) => esc(r.desc)], ['Aging', (r) => agingPill(r.aging), '', (r) => r.aging],
        ['Stok', (r) => fmt(r.stock), 'num', (r) => r.stock], ['OS PO/RO', (r) => fmt(r.ospo), 'num', (r) => r.ospo], ['MB25', (r) => fmt(r.mb25), 'num', (r) => r.mb25], ['Min', (r) => fmt(r.min2), 'num', (r) => r.min2], ['Max', (r) => fmt(r.max2), 'num', (r) => r.max2],
        ['To Order', (r) => pill(fmt(r.toOrder), 'warn'), 'num', (r) => r.toOrder], ['RKM 2027', (r) => fmt(r.rkm), 'num', (r) => r.rkm], ['Kelas', (r) => esc(r.cls || r.aging), '', (r) => r.cls || r.aging],
        ['Kontrak (OA)', (r) => (r.oa ? `<span class="mono">${esc(r.oa)}</span>` : pill('PR + OE', 'mute')), '', (r) => r.oa || 'PR + OE']], (r) => r.material + ' ' + r.desc + ' ' + r.oa],
      sehat: ['Penyehatan stok', sehat, [['Plant', (r) => esc(r.plant)], ['Material', (r) => `<span class="mono">${esc(r.material)}</span>`], ['Deskripsi', (r) => esc(r.desc)], ['Aging', (r) => agingPill(r.aging), '', (r) => r.aging],
        ['Stok', (r) => fmt(r.stock), 'num', (r) => r.stock], ['Max', (r) => fmt(r.max2), 'num', (r) => r.max2], ['Surplus', (r) => fmt(r.surplus), 'num', (r) => r.surplus],
        ['Cakupan (bln)', (r) => (r.cover == null ? '-' : isFinite(r.cover) ? fmt(r.cover, 1) : '∞'), 'num', (r) => (isFinite(r.cover) ? r.cover : '')],
        ['Kategori', (r) => (r.aging === 'DS' && r.stock > 0 ? pill('Kandidat dead stock', 'low') : r.berlebih ? pill('Berlebih', 'warn') : pill('Di atas Max', 'mute')), '', (r) => (r.aging === 'DS' && r.stock > 0 ? 'Kandidat dead stock' : r.berlebih ? 'Berlebih' : 'Di atas Max')]], (r) => r.material + ' ' + r.desc],
      cmp: ['Banding Excel vs TKO', cmp, [['Plant', (r) => esc(r.plant)], ['Material', (r) => `<span class="mono">${esc(r.material)}</span>`], ['Deskripsi', (r) => esc(r.desc)],
        ['Aging Excel→TKO', (r) => `${esc(r.alt.excel.aging)} → <b>${esc(r.alt.tko.aging)}</b>`, '', (r) => r.alt.excel.aging + '→' + r.alt.tko.aging],
        ['Min Excel', (r) => fmt(r.alt.excel.min2), 'num', (r) => r.alt.excel.min2], ['Min TKO', (r) => `<b>${fmt(r.alt.tko.min2)}</b>`, 'num', (r) => r.alt.tko.min2],
        ['Max Excel', (r) => fmt(r.alt.excel.max2), 'num', (r) => r.alt.excel.max2], ['Max TKO', (r) => `<b>${fmt(r.alt.tko.max2)}</b>`, 'num', (r) => r.alt.tko.max2],
        ['Order Excel', (r) => fmt(r.alt.excel.toOrder), 'num', (r) => r.alt.excel.toOrder], ['Order TKO', (r) => `<b>${fmt(r.alt.tko.toOrder)}</b>`, 'num', (r) => r.alt.tko.toOrder],
        ['Kelas TKO', (r) => esc(r.alt.tko.cls), '', (r) => r.alt.tko.cls], ['Catatan', (r) => esc(r.alt.tko.note), '', (r) => r.alt.tko.note]], (r) => r.material + ' ' + r.desc],
    };
    if (!TABS[S.rkmTab]) S.rkmTab = 'vs';
    const noRkmFile = !S.rkmFiles.length ? `<div class="card"><b>Belum ada file RKM.</b> <span class="muted">Tab "Perlu order" tetap jalan dari histori. Upload RKM di <a href="#/data">Data SAP</a> untuk tab lainnya.</span></div>` : '';
    $('view').innerHTML = `${noRkmFile}<div class="card info-line">Metode: <b>${esc(METHOD[S.set.method])}</b> · Data histori s.d. ${esc(S.mrpWB.window[1])} · Basis kebutuhan: <b>${esc(BASIS[S.set.basis])}</b> · <a href="#/pengaturan">ubah</a></div>
      <div class="tabs">${Object.entries(TABS).map(([k, t]) => `<button class="tab ${k === S.rkmTab ? 'on' : ''}" data-t="${k}">${esc(t[0])} <span class="n">${fmt(t[1].length, 0)}</span></button>`).join('')}</div>
      <div class="filters"><input id="q" placeholder="Saring KIMAP / deskripsi / fungsi…"><button class="btn" id="xl">⬇ Unduh Excel</button></div>
      <div id="cnt" class="count"></div><div id="res"></div>${S.rkmTab === 'lli' ? '<p class="muted small">* bulan kebutuhan tidak diisi di RKM, dianggap mulai Januari 2027.</p>' : ''}`;
    const [title, rows, cols, text] = TABS[S.rkmTab];
    let cur = rows;
    const draw = () => { const g = expand($('q').value); cur = rows.filter((o) => hit(text(o), g)); $('cnt').textContent = `${fmt(cur.length, 0)} baris${cur.length > 300 ? ' · menampilkan 300 pertama (unduh Excel untuk semua)' : ''}`; $('res').innerHTML = table(cur, cols); };
    document.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { S.rkmTab = b.dataset.t; PAGES.rkm(); }));
    $('q').oninput = () => debounce(draw); $('xl').onclick = () => exportXLSX(title.replace(/[^\w ]+/g, '').trim(), cur, cols); draw();
  },

  data() {
    const fs = Folder.supported();
    const box = (id, title, hint, info, multi) => `<div class="card"><h3>${title}</h3>
      <label class="drop"><input type="file" id="${id}" accept=".xlsx,.xlsm,.xls" ${multi ? 'multiple' : ''}><div class="big">📄</div><b>Pilih file Excel${multi ? ' (boleh banyak)' : ''}</b><div class="muted">${hint}</div></label>
      <div class="status-line ${info ? 'ok' : ''}" id="${id}m">${info || 'Belum ada file.'}</div></div>`;
    $('view').innerHTML = `<div class="card folder"><div><h3>📁 Folder data (otomatis tiap login)</h3>
        <p class="muted">${fs ? 'Pilih satu folder di laptop yang berisi file MB52, MRP, dan RKM. Web mengambil MB52, MRP, ME3N, ME2N, MB51, MB25 yang <b>paling baru</b>, serta <b>semua</b> file RKM. Nama file harus memuat kata "MB52", "MRP", "ME3N", "ME2N", "MB51", "MB25", atau "RKM". Login berikutnya cukup 1 klik.' : 'Browser ini tidak mendukung akses folder. Pakai Chrome atau Edge di laptop, atau upload manual di bawah.'}</p></div>
        ${fs ? '<div class="row"><button class="btn primary" id="fp1">Pilih folder</button><button class="btn" id="fp2">Lupakan folder</button></div>' : ''}</div>
      <div class="card"><b>🔒 Aman:</b> <span class="muted">file hanya dibaca di browser kamu dan hilang saat halaman ditutup. Tidak ada yang dikirim ke server atau repo.</span></div>
      <div class="grid">
        ${box('f1', '1. Stok MB52', 'Hasil download bot MB52', S.mb52 && `✓ ${esc(S.mb52Name)} · ${fmt(S.mb52.items.length, 0)} item · ${S.mb52.plants.length} plant`)}
        ${box('f2', '2. MRP Zona 1', 'Perlu sheet "MRP" dan "LeadTime"', S.mrpWB && `✓ ${esc(S.mrpName)} · ${fmt(S.mrpRes.size, 0)} item · histori ${esc(S.mrpWB.window.join(' s.d. '))}`)}
        ${box('f3', '3. RKM lapangan', 'Format template SHU, 1 file per lapangan', S.rkmFiles.length && `✓ ${S.rkmFiles.length} file`, true)}
        ${box('f4', '4. Kontrak ME3N', 'Download ME3N (Outline Agreement)', S.me3n && `✓ ${esc(S.me3nName)} · ${fmt(S.me3n.docs.size, 0)} kontrak · ${fmt(S.me3n.items.length, 0)} item`)}
        ${box('f5', '5. PO/RO ME2N', 'Download ME2N (PO & RO)', S.me2n && `✓ ${esc(S.me2nName)} · ${fmt(S.me2n.lines.length, 0)} baris`)}
        ${box('f6', '6. Pergerakan MB51', 'Download MB51 (GR, GI, transfer)', S.mb51 && `✓ ${esc(S.mb51Name)} · ${fmt(S.mb51.moves.length, 0)} gerakan · ${S.mb51.range ? dstr(S.mb51.range[0]) + ' s.d. ' + dstr(S.mb51.range[1]) : ''}`)}
        ${box('f7', '7. Reservasi MB25', 'Download MB25 (reservasi)', S.mb25 && `✓ ${esc(S.mb25Name)} · ${fmt(S.mb25.lines.length, 0)} baris`)}
      </div>
      ${S.rkmFiles.length ? `<div class="card"><h3>File RKM</h3><div class="table-wrap flat"><table><tr><th>File</th><th>Asset</th><th class="num">Baris</th><th>Plant</th><th class="num">Cocok ke MRP</th><th></th></tr>
        ${S.rkmFiles.map((f, i) => { const m = S.rkmMatched.filter((x) => x.file === f.fileName); return `<tr><td>${esc(f.fileName)}</td><td>${esc(f.asset)}</td><td class="num">${fmt(f.items.length, 0)}</td>
          <td><select data-i="${i}" class="rp"><option value="">— pilih —</option>${DEFAULT_MRP_PLANTS.map((p) => `<option value="${p}" ${f.plant === p ? 'selected' : ''}>${plantLabel(p)}</option>`).join('')}</select></td>
          <td class="num">${fmt(m.filter((x) => x.key).length, 0)} / ${fmt(m.length, 0)}</td><td><button class="icon-btn rx" data-i="${i}" title="Hapus">✕</button></td></tr>`; }).join('')}</table></div></div>` : ''}`;
    if (fs) {
      $('fp1').onclick = async () => { try { const h = await Folder.pick(); await loadFolder(h); } catch (e) { if (e.name !== 'AbortError') banner('Gagal: ' + esc(e.message), 'bad'); } };
      $('fp2').onclick = async () => { await Folder.forget(); banner('Folder dilupakan. Data yang sudah dimuat tetap ada sampai halaman ditutup.', 'warn'); };
    }
    const load = (id, fn) => ($(id).onchange = async (e) => {
      const files = [...e.target.files]; if (!files.length) return; const m = $(id + 'm'); m.className = 'status-line'; m.textContent = 'Memproses…'; await tick();
      try { for (const f of files) await fn(f); recompute(); PAGES.data(); sideData(); } catch (err) { m.className = 'status-line bad'; m.textContent = 'Gagal: ' + err.message; }
    });
    load('f1', loadMB52); load('f2', loadMRP); load('f3', (f) => loadRKM(f)); load('f4', loadME3N); load('f5', loadME2N); load('f6', loadMB51); load('f7', loadMB25);
    document.querySelectorAll('.rp').forEach((s) => (s.onchange = () => {
      const f = S.rkmFiles[s.dataset.i]; f.plant = s.value; const m = store.get('rkmPlant') || {}; m[f.fileName] = s.value; store.set('rkmPlant', m); recompute(); PAGES.data();
    }));
    document.querySelectorAll('.rx').forEach((b) => (b.onclick = () => { S.rkmFiles.splice(+b.dataset.i, 1); recompute(); PAGES.data(); sideData(); }));
  },

  pengaturan() {
    const all = [...new Set([...(S.mb52 ? S.mb52.plants : []), ...(S.mrp ? S.mrp.plants : []), ...DEFAULT_MRP_PLANTS, ...S.mrpPlants])].sort();
    $('view').innerHTML = `<div class="card"><h3>Plant yang dipantau MRP</h3>
      <p class="muted">Semua plant di MB52 tetap bisa dicari. Status Min/Max hanya dihitung untuk plant yang dipilih.</p>
      <div class="chips" id="chips">${all.map((p) => `<label class="chip ${S.mrpPlants.has(p) ? 'on' : ''}"><input type="checkbox" value="${esc(p)}" ${S.mrpPlants.has(p) ? 'checked' : ''}>${esc(plantLabel(p))}</label>`).join('')}</div>
      <div class="status-line" id="sum"></div></div>
      <div class="card"><h3>Metode perhitungan MRP</h3>
      <div class="radios">${Object.entries(METHOD).map(([k, t]) => `<label class="radio ${S.set.method === k ? 'on' : ''}"><input type="radio" name="method" value="${k}" ${S.set.method === k ? 'checked' : ''}>${esc(t)}</label>`).join('')}</div>
      ${S.set.method === 'tko' ? `<div class="params">${TKO_FIELDS.map(([k, t, u]) => `<label>${esc(t)}<span><input type="number" step="0.5" min="0" data-k="${k}" value="${S.set.tko[k] != null ? S.set.tko[k] : MRP.TKO_DEFAULT[k]}"> ${u}</span></label>`).join('')}
        <label>Rumus Max (maintenance)<span><select data-s="maxFormula">${[['A', 'A · 2×(AMU×T)+SS'], ['B', 'B · AMU×T+2×SS'], ['C', 'C · ROP+n×AMU'], ['BC', 'B untuk kontrak + C non-kontrak']].map(([v, t]) => `<option value="${v}" ${(S.set.tko.maxFormula || MRP.TKO_DEFAULT.maxFormula) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></span></label>
        <label>Moderate (MD) dihitung sebagai FS<span><select data-s="mdAsFS"><option value="1" ${(S.set.tko.mdAsFS ?? MRP.TKO_DEFAULT.mdAsFS) ? 'selected' : ''}>Ya (konfirmasi user)</option><option value="0" ${(S.set.tko.mdAsFS ?? MRP.TKO_DEFAULT.mdAsFS) ? '' : 'selected'}>Tidak, Min = Max = SS</option></select></span></label>
        <label>Service level non-critical<span><select data-z="z">${[[1.282, '90%'], [1.645, '95%'], [2.054, '98%'], [2.326, '99%']].map(([z, t]) => `<option value="${z}" ${(S.set.tko.z || MRP.TKO_DEFAULT.z) == z ? 'selected' : ''}>${t}</option>`).join('')}</select></span></label></div>
        <p class="muted small">Aging: FS = dipakai ≤ 12 bln · MD ≤ 24 bln · SP ≤ 60 bln · DS > 60 bln. Material Project dihitung sebagai program (RKM − stok − PO), tanpa Min/Max. <a href="#" id="tkoReset">Kembalikan default</a></p>` : ''}</div>
      <div class="card"><h3>Basis kebutuhan (input RKM ke mesin MRP)</h3>
      <p class="muted">Rumus Min/Max tetap sama dengan file MRP. Yang diatur di sini hanya angka AMU yang dipakai.</p>
      <div class="radios">${Object.entries(BASIS).map(([k, t]) => `<label class="radio ${S.set.basis === k ? 'on' : ''}"><input type="radio" name="basis" value="${k}" ${S.set.basis === k ? 'checked' : ''}>${esc(t)}</label>`).join('')}</div>
      <p class="muted small">Untuk item tanpa histori yang memakai RKM, item diperlakukan seperti Aging MD (dapat Min/Max, tanpa safety stock).</p></div>
      <div class="card"><h3>Batas Long Lead Item</h3><p class="muted">Item dengan lead time sama atau lebih dari angka ini masuk daftar LLI.</p>
      <label class="inline"><input type="number" id="lli" min="1" max="36" value="${S.set.lliLT}" style="width:90px"> bulan</label></div>`;
    const summary = () => { const c = {}; activeItems().forEach((x) => { c[x.status] = (c[x.status] || 0) + 1; }); $('sum').textContent = 'Ringkasan: ' + Object.entries(c).map(([k, v]) => `${k} ${fmt(v, 0)}`).join(' · '); };
    const saveSet = () => { store.set('settings', S.set); recompute(); };
    $('chips').onchange = (e) => { e.target.parentElement.classList.toggle('on', e.target.checked);
      S.mrpPlants = new Set([...document.querySelectorAll('#chips input:checked')].map((i) => i.value)); store.set('mrpPlants', [...S.mrpPlants]); summary(); };
    document.querySelectorAll('input[name=method]').forEach((r) => (r.onchange = () => { S.set.method = r.value; saveSet(); PAGES.pengaturan(); }));
    document.querySelectorAll('.params input[data-k]').forEach((i) => (i.onchange = () => { const v = parseFloat(i.value); if (isFinite(v) && v >= 0) { S.set.tko[i.dataset.k] = v; saveSet(); } }));
    document.querySelectorAll('.params select[data-s]').forEach((i) => (i.onchange = () => { S.set.tko[i.dataset.s] = i.dataset.s === 'mdAsFS' ? i.value === '1' : i.value; saveSet(); }));
    document.querySelectorAll('.params select[data-z]').forEach((i) => (i.onchange = () => { S.set.tko.z = parseFloat(i.value); saveSet(); }));
    if ($('tkoReset')) $('tkoReset').onclick = (e) => { e.preventDefault(); S.set.tko = {}; saveSet(); PAGES.pengaturan(); };
    document.querySelectorAll('input[name=basis]').forEach((r) => (r.onchange = () => { S.set.basis = r.value; saveSet(); PAGES.pengaturan(); }));
    $('lli').onchange = () => { const v = Math.max(1, Math.min(36, +$('lli').value || 6)); S.set.lliLT = v; saveSet(); };
    summary();
  },
};

// ---------- Tab generik (dipakai halaman Kontrak & Order) ----------
function tabbed(state, TABS, extraTop = '') {
  if (!TABS[S[state]]) S[state] = Object.keys(TABS)[0];
  const [title, rows, cols, text, note] = TABS[S[state]];
  $('view').innerHTML = `${extraTop}<div class="tabs">${Object.entries(TABS).map(([k, t]) => `<button class="tab ${k === S[state] ? 'on' : ''}" data-t="${k}">${esc(t[0])} <span class="n">${fmt(t[1].length, 0)}</span></button>`).join('')}</div>
    <div class="filters"><input id="q" placeholder="Saring…"><button class="btn" id="xl">⬇ Unduh Excel</button></div>
    ${note ? `<p class="muted small">${note}</p>` : ''}<div id="cnt" class="count"></div><div id="res"></div>`;
  let cur = rows;
  const draw = () => { const g = expand($('q').value); cur = rows.filter((o) => hit(text(o), g)); $('cnt').textContent = `${fmt(cur.length, 0)} baris${cur.length > 300 ? ' · menampilkan 300 pertama (unduh Excel untuk semua)' : ''}`; $('res').innerHTML = table(cur, cols); };
  document.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { S[state] = b.dataset.t; route(); }));
  $('q').oninput = () => debounce(draw); $('xl').onclick = () => exportXLSX(title.replace(/[^\w ]+/g, '').trim(), cur, cols); draw();
}
const dstr = (d) => (d ? d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
const money = (v, cur) => (cur && cur !== 'IDR' ? cur + ' ' + fmt(v, 2) : rp(v || 0));
const needFile = (what, hint) => `<div class="card empty"><div class="big">📄</div><h3>Butuh ${what}</h3><p>${hint}</p><a class="btn primary" href="#/data">Buka Data SAP</a></div>`;

PAGES.kontrak = function () {
  if (!S.me3n) { $('view').innerHTML = needFile('file kontrak ME3N', 'Upload download ME3N (dan ME2N untuk PO/RO) di Data SAP, atau taruh di folder data.'); return; }
  const docs = [...S.me3n.docs.values()].sort((a, b) => (a.sisaHari ?? 1e9) - (b.sisaHari ?? 1e9));
  const usedBy = new Map(), orderBy = new Map();
  if (S.mrpRes) for (const r of S.mrpRes.values()) if (r.contract) {
    usedBy.set(r.contract.doc, (usedBy.get(r.contract.doc) || 0) + 1);
    if (r.toOrder > 0) orderBy.set(r.contract.doc, (orderBy.get(r.contract.doc) || 0) + r.toOrder * r.contract.price);
  }
  const st = (d) => { const a = []; if (d.sisaHari != null && d.sisaHari <= 90) a.push(pill('Habis ≤ 90 hari', 'low')); else if (d.sisaHari != null && d.sisaHari <= 180) a.push(pill('Habis ≤ 180 hari', 'warn'));
    if (d.pctSisa < 0.2) a.push(pill('Sisa nilai < 20%', d.pctSisa < 0.05 ? 'low' : 'warn')); return a.join(' ') || pill('Aman', 'ok'); };
  const stTxt = (d) => st(d).replace(/<[^>]+>/g, ' ').trim();
  const renew = docs.filter((d) => (d.sisaHari != null && d.sisaHari <= 180) || d.pctSisa < 0.2);
  const lines = S.me2n ? S.me2n.lines.filter((l) => l.openQty > 0 && !l.deleted) : [];
  const late = lines.filter((l) => l.lateDays > 0).sort((a, b) => b.lateDays - a.lateDays);
  const kCols = [['No. OA', (d) => `<span class="mono">${esc(d.doc)}</span>`, '', (d) => d.doc], ['Vendor', (d) => esc(d.vendor)], ['PIC', (d) => esc(d.pic)],
    ['Berakhir', (d) => dstr(d.end), '', (d) => dstr(d.end)], ['Sisa hari', (d) => fmt(d.sisaHari, 0), 'num', (d) => d.sisaHari],
    ['Target', (d) => money(d.target, d.currency), 'num', (d) => d.target], ['Terpakai', (d) => money(d.released, d.currency), 'num', (d) => d.released],
    ['Sisa', (d) => money(d.sisa, d.currency), 'num', (d) => d.sisa], ['% Sisa', (d) => fmt(d.pctSisa * 100, 0) + '%', 'num', (d) => d.pctSisa],
    ['Item', (d) => fmt(d.items, 0), 'num', (d) => d.items], ['Dipakai MRP', (d) => fmt(usedBy.get(d.doc) || 0, 0), 'num', (d) => usedBy.get(d.doc) || 0],
    ['Status', st, '', stTxt]];
  const TABS = {
    list: ['Kontrak', docs, kCols, (d) => d.doc + ' ' + d.vendor + ' ' + d.pic],
    renew: ['Perlu perpanjangan / amandemen', renew, kCols.concat([['Nilai To Order MRP', (d) => money(orderBy.get(d.doc) || 0, d.currency), 'num', (d) => orderBy.get(d.doc) || 0]]), (d) => d.doc + ' ' + d.vendor,
      'Kontrak yang habis ≤ 180 hari atau sisa nilainya < 20%. "Dipakai MRP" = jumlah material yang Min/Max-nya mengandalkan kontrak ini.'],
    items: ['Item kontrak', S.me3n.items, [['No. OA', (i) => `<span class="mono">${esc(i.doc)}</span>`, '', (i) => i.doc], ['Item', (i) => esc(i.item)], ['Material', (i) => `<span class="mono">${esc(i.material)}</span>`, '', (i) => i.material],
      ['Deskripsi', (i) => esc(i.desc)], ['UoM', (i) => esc(i.uom)], ['Harga', (i) => money(i.price, i.k.currency), 'num', (i) => i.price],
      ['Target qty', (i) => fmt(i.targetQty), 'num', (i) => i.targetQty], ['Terpakai qty', (i) => fmt(i.releasedQty), 'num', (i) => i.releasedQty],
      ['% pakai', (i) => (i.targetQty ? fmt((i.releasedQty / i.targetQty) * 100, 0) + '%' : '-'), 'num', (i) => (i.targetQty ? i.releasedQty / i.targetQty : '')], ['Vendor', (i) => esc(i.k.vendor)]],
      (i) => i.doc + ' ' + i.material + ' ' + i.desc + ' ' + i.k.vendor],
  };
  if (S.me2n) {
    const lCols = (extra) => [['Dokumen', (l) => `<span class="mono">${esc(l.doc)}</span>/${esc(l.item)}`, '', (l) => l.doc + '/' + l.item], ['Jenis', (l) => pill(l.type, l.type === 'RO' ? 'info' : 'mute'), '', (l) => l.type],
      ['Plant', (l) => esc(l.plant)], ['Material', (l) => `<span class="mono">${esc(l.material)}</span>`, '', (l) => l.material], ['Deskripsi', (l) => esc(l.desc)], ['Vendor', (l) => esc(l.vendor)],
      ['Tgl kirim', (l) => dstr(l.delivery), '', (l) => dstr(l.delivery)], ['Sisa kirim', (l) => fmt(l.openQty) + ' ' + esc(l.uom), 'num', (l) => l.openQty],
      ['Nilai sisa', (l) => money(l.openValue, l.currency), 'num', (l) => l.openValue]].concat(extra);
    TABS.open = ['PO/RO berjalan', lines, lCols([['Status', (l) => (l.lateDays ? pill('Terlambat ' + l.lateDays + ' hr', 'low') : pill('Sesuai jadwal', 'ok')), '', (l) => (l.lateDays ? 'Terlambat ' + l.lateDays : 'OK')]]), (l) => l.doc + ' ' + l.material + ' ' + l.desc + ' ' + l.vendor + ' ' + l.plant];
    TABS.late = ['Pengiriman terlambat', late, lCols([['Terlambat', (l) => pill(l.lateDays + ' hari', l.lateDays > 30 ? 'low' : 'warn'), 'num', (l) => l.lateDays]]), (l) => l.doc + ' ' + l.material + ' ' + l.desc + ' ' + l.vendor + ' ' + l.plant,
      'Baris PO/RO yang tanggal kirimnya sudah lewat tetapi barang belum diterima penuh. Tindak lanjut ke vendor / PIC kontrak.'];
  }
  const sum = (a, f) => a.reduce((x, y) => x + f(y), 0);
  const tiles = `<div class="tiles">${[['Kontrak aktif', fmt(docs.filter((d) => d.aktif).length, 0), 'info'], ['Habis ≤ 90 hari', fmt(docs.filter((d) => d.sisaHari != null && d.sisaHari <= 90).length, 0), 'bad'],
    ['Sisa nilai < 20%', fmt(docs.filter((d) => d.pctSisa < 0.2).length, 0), 'warn'], ['PO/RO berjalan', S.me2n ? fmt(new Set(lines.map((l) => l.doc)).size, 0) + ' dok' : '-', 'info'],
    ['Pengiriman terlambat', S.me2n ? fmt(late.length, 0) + ' baris' : '-', 'bad'], ['Nilai sisa kirim (IDR)', S.me2n ? rp(sum(lines.filter((l) => l.currency === 'IDR'), (l) => l.openValue)) : '-', 'info']]
    .map(([k, v, c]) => `<div class="tile ${c}"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>`;
  tabbed('kTab', TABS, tiles + (S.me2n ? '' : '<div class="card"><span class="muted">Upload ME2N untuk melihat PO/RO berjalan dan pengiriman terlambat.</span></div>'));
};


// ---------- Expediting (format mengikuti sheet "Expediting" MIM Z1) ----------
const ex = { all() { return store.get('expediting') || {}; }, get(k) { return this.all()[k] || {}; }, set(k, v) { const a = this.all(); a[k] = v; store.set('expediting', a); } };
const MANUAL = ['', 'Routing Approval', 'PO/RO on delivery', 'Outstanding (late)', 'Selesai', 'Batal'];
const fieldName = (plants) => plants.split(', ').map((p) => (PLANT_NAME[p] ? 'PEP ' + PLANT_NAME[p] : p)).join(', ');
PAGES.expediting = function () {
  if (!S.me2n) { $('view').innerHTML = needFile('file ME2N', 'Expediting dibaca dari ME2N (PO/RO). Tambahkan MB51 untuk status GR gudang dan MB25 untuk reservasi.'); return; }
  const allPlants = [...new Set(S.me2n.lines.map((l) => l.plant).filter(Boolean))].sort();
  const sel = new Set(store.get('expPlants') || allPlants), stockOnly = store.get('expStockOnly') ?? true;
  const today = new Date(), t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const rows = Trace.expediting(S.me2n, S.mb51, today, { plants: sel, stockOnly }).map((e) => {
    const m = ex.get(e.doc); const kontr = m.kontrak ? new Date(m.kontrak) : null;
    let status = e.status, cls = e.cls, late = e.lateDays;
    if (e.open > 0 && kontr && kontr < t0) { late = Math.round((t0 - kontr) / 864e5); if (!e.inspeksi) { status = 'Outstanding (late)'; cls = 'low'; } }
    if (m.manual) { status = m.manual; cls = m.manual === 'Outstanding (late)' ? 'low' : m.manual === 'Selesai' ? 'ok' : m.manual === 'Batal' ? 'mute' : m.manual === 'Routing Approval' ? 'warn' : 'info'; }
    const mundur = kontr && e.deliv ? Math.round((e.deliv - kontr) / 864e5) : 0;
    return Object.assign({}, e, { status, cls, late, kontr, mundur, note: m.note || '', manual: m.manual || '' });
  });
  const aktif = rows.filter((e) => e.open > 0 && e.manual !== 'Selesai' && e.manual !== 'Batal');
  const late = aktif.filter((e) => e.status === 'Outstanding (late)');
  const done = rows.filter((e) => e.open <= 0 || e.manual === 'Selesai');
  // reservasi terbuka yang sudah jatuh tempo → cek apakah gudang sudah GI
  const stock = new Map(S.mb52 ? S.mb52.items.map((i) => [i.material + '|' + i.plant, i.soh]) : []);
  const resv = S.mb25 ? S.mb25.lines.filter((l) => !l.finalIssue && l.diff > 0 && (!sel.size || sel.has(l.plant)) && l.reqDate && l.reqDate <= t0)
    .map((l) => { const st = stock.get(l.material + '|' + l.plant); return Object.assign({}, l, { stock: st, telat: Math.round((t0 - l.reqDate) / 864e5),
      gi: st == null ? ['Stok tidak diketahui', 'mute'] : st >= l.diff ? ['Stok ada · belum GI', 'warn'] : st > 0 ? ['Stok kurang', 'low'] : ['Stok kosong', 'low'] }); })
    .sort((a, b) => b.telat - a.telat) : [];
  const grTxt = (e) => (!S.mb51 ? '-' : e.grIn || e.grRel ? `Tiba ${fmt(e.grIn)}${e.firstIn ? ' (' + dstr(e.firstIn) + ')' : ''} · Rilis ${fmt(e.grRel)}${e.lastRel ? ' (' + dstr(e.lastRel) + ')' : ''}` : 'Belum ada GR*');
  const cols = [['No. PR', (e) => `<span class="mono">${esc(e.pr || '-')}</span>`, '', (e) => e.pr], ['No. PO/RO', (e) => `<a class="mono" href="#/lacak" data-q="${esc(e.doc)}">${esc(e.doc)}</a> ${pill(e.type, e.type === 'RO' ? 'info' : 'mute')}`, '', (e) => e.doc],
    ['WK/Field', (e) => esc(fieldName(e.plant)), '', (e) => fieldName(e.plant)], ['Description', (e) => esc(e.desc)], ['Nilai', (e) => money(e.value, e.currency), 'num', (e) => e.value], ['CR', (e) => esc(e.currency)],
    ['Deliv Date (SAP)', (e) => dstr(e.deliv), '', (e) => dstr(e.deliv)],
    ['Tgl kirim kontrak', (e) => `<input type="date" class="exk" data-k="${esc(e.doc)}" value="${e.kontr ? new Date(e.kontr.getTime() - e.kontr.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) : ''}">${e.mundur > 0 ? ' ' + pill('mundur ' + e.mundur + ' hr', 'warn') : ''}`, '', (e) => (e.kontr ? dstr(e.kontr) : '')],
    ['Status', (e) => pill(e.status, e.cls) + (e.late ? ' ' + pill(e.late + ' hr', 'low') : ''), '', (e) => e.status],
    ['Status manual', (e) => `<select class="exm" data-k="${esc(e.doc)}">${MANUAL.map((m) => `<option ${m === e.manual ? 'selected' : ''} value="${m}">${m || '— otomatis —'}</option>`).join('')}</select>`, '', (e) => e.manual],
    ['Note', (e) => `<input class="exn" data-k="${esc(e.doc)}" value="${esc(e.note)}" placeholder="catatan">`, '', (e) => e.note],
    ['GR gudang (MB51)', (e) => esc(grTxt(e)), '', grTxt], ['Sisa kirim', (e) => fmt(e.open), 'num', (e) => e.open], ['Vendor', (e) => esc(e.vendor)]];
  const rCols = [['Reservasi', (l) => `<a class="mono" href="#/lacak" data-q="${esc(l.resv)}">${esc(l.resv)}</a>/${esc(l.item)}`, '', (l) => l.resv], ['Plant', (l) => esc(l.plant)], ['Material', (l) => `<a class="mono" href="#/lacak" data-q="${esc(l.material)}">${esc(l.material)}</a>`, '', (l) => l.material],
    ['Deskripsi', (l) => esc(l.desc)], ['Tgl butuh', (l) => dstr(l.reqDate), '', (l) => dstr(l.reqDate)], ['Lewat', (l) => fmt(l.telat, 0) + ' hr', 'num', (l) => l.telat], ['Sisa reservasi', (l) => fmt(l.diff) + ' ' + esc(l.uom), 'num', (l) => l.diff],
    ['Stok (MB52)', (l) => (l.stock == null ? '-' : fmt(l.stock)), 'num', (l) => l.stock], ['Status GI', (l) => pill(l.gi[0], l.gi[1]), '', (l) => l.gi[0]], ['Penerima', (l) => esc(l.recipient || l.costCenter || l.wbs)], ['Mvt', (l) => esc(l.mt)]];
  const text = (e) => e.doc + ' ' + e.pr + ' ' + e.desc + ' ' + e.vendor + ' ' + fieldName(e.plant) + ' ' + e.note;
  const note = S.mb51 ? `* MB51 yang dimuat mencakup ${S.mb51.range ? dstr(S.mb51.range[0]) + ' s.d. ' + dstr(S.mb51.range[1]) : '-'}; GR sebelum periode itu tidak terlihat. Status "Selesai" tetap dari ME2N (sisa kirim = 0).` : 'Upload MB51 untuk melihat status GR gudang (103 tiba/inspeksi, 105 rilis ke stok).';
  const TABS = {
    aktif: ['PO/RO aktif', aktif, cols, text, note], late: ['Terlambat', late, cols, text, 'Terlambat dihitung dari "Tgl kirim kontrak" kalau diisi, kalau tidak dari Deliv Date di SAP (yang bisa sudah dimundurkan).'],
    done: ['Selesai GR', done, cols, text, note], semua: ['Semua', rows, cols, text, note],
  };
  if (S.mb25) TABS.resv = ['Reservasi belum di-GI', resv, rCols, (l) => l.resv + ' ' + l.material + ' ' + l.desc + ' ' + l.recipient, 'Reservasi (MB25) yang tanggal butuhnya sudah lewat tetapi belum diambil penuh. "Stok ada · belum GI" = tindak lanjut ke warehouse.'];
  const sum = (a) => a.filter((e) => e.currency === 'IDR').reduce((x, e) => x + e.openValue, 0);
  const tiles = `<div class="tiles">${[['TOTAL PO/RO aktif', fmt(aktif.length, 0), 'info'], ['ON DELIVERY', fmt(aktif.filter((e) => /on delivery/i.test(e.status)).length, 0), 'info'],
    ['LATE', fmt(late.length, 0), 'bad'], ['TIBA · INSPEKSI', fmt(aktif.filter((e) => e.inspeksi).length, 0), 'warn'], ['APPROVAL', fmt(aktif.filter((e) => e.status === 'Routing Approval').length, 0), 'warn'],
    ['Nilai sisa kirim (IDR)', rp(sum(aktif)), 'info'], ['Reservasi belum GI', S.mb25 ? fmt(resv.length, 0) : '-', 'bad']].map(([k, v, c]) => `<div class="tile ${c}"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>`;
  const filt = `<div class="card"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:8px"><b>Plant</b>
    <label class="inline"><input type="checkbox" id="exStock" ${stockOnly ? 'checked' : ''}> hanya material stock (tanpa account assignment)</label></div>
    <div class="chips" id="exChips">${allPlants.map((p) => `<label class="chip ${sel.has(p) ? 'on' : ''}"><input type="checkbox" value="${esc(p)}" ${sel.has(p) ? 'checked' : ''}>${esc(plantLabel(p))}</label>`).join('')}</div></div>`;
  tabbed('eTab', TABS, tiles + filt);
  $('exChips').onchange = (e) => { e.target.parentElement.classList.toggle('on', e.target.checked); store.set('expPlants', [...document.querySelectorAll('#exChips input:checked')].map((i) => i.value)); route(); };
  $('exStock').onchange = (e) => { store.set('expStockOnly', e.target.checked); route(); };
  const bind = () => {
    document.querySelectorAll('.exn').forEach((i) => (i.onchange = () => { const v = ex.get(i.dataset.k); v.note = i.value.trim(); ex.set(i.dataset.k, v); }));
    document.querySelectorAll('.exm').forEach((i) => (i.onchange = () => { const v = ex.get(i.dataset.k); v.manual = i.value; ex.set(i.dataset.k, v); route(); }));
    document.querySelectorAll('.exk').forEach((i) => (i.onchange = () => { const v = ex.get(i.dataset.k); v.kontrak = i.value || null; ex.set(i.dataset.k, v); route(); }));
    document.querySelectorAll('a[data-q]').forEach((a) => (a.onclick = () => sessionStorage.setItem('lacakQ', a.dataset.q)));
  };
  bind(); new MutationObserver(bind).observe($('res'), { childList: true });
};

// ---------- Lacak material ----------
PAGES.lacak = function () {
  const q0 = sessionStorage.getItem('lacakQ') || S.lacakQ || ''; sessionStorage.removeItem('lacakQ');
  const have = [S.me2n && 'ME2N', S.mb51 && 'MB51', S.mb25 && 'MB25', S.mb52 && 'MB52', S.mrpRes && 'MRP'].filter(Boolean);
  $('view').innerHTML = `<div class="card"><div class="filters"><input id="lq" placeholder="Ketik kode material, No. PO/RO, No. PR, atau No. reservasi…" value="${esc(q0)}"><button class="btn primary" id="lgo">Lacak</button></div>
    <p class="muted small">Sumber yang dimuat: ${have.length ? have.join(', ') : 'belum ada'}. Semakin lengkap filenya, semakin lengkap jejaknya.</p></div><div id="lres"></div>`;
  const go = () => {
    const q = $('lq').value.trim(); S.lacakQ = q; if (!q) { $('lres').innerHTML = ''; return; }
    const out = [];
    // 1) dokumen PO/RO atau PR
    const poLines = S.me2n ? S.me2n.lines.filter((l) => l.doc === q || l.pr === q) : [];
    const resvLines = S.mb25 ? S.mb25.lines.filter((l) => l.resv === q) : [];
    const resvMoves = S.mb51 ? S.mb51.moves.filter((m) => m.resv === q) : [];
    let mats = new Set();
    if (poLines.length) {
      out.push(`<div class="card"><h3>Dokumen ${esc(q)}</h3>` + table(poLines, [['Dokumen', (l) => `<span class="mono">${esc(l.doc)}/${esc(l.item)}</span>`], ['PR', (l) => esc(l.pr)], ['Jenis', (l) => pill(l.type, 'info')], ['Plant', (l) => esc(l.plant)],
        ['Material', (l) => `<a href="#" class="mono lm" data-m="${esc(l.material)}">${esc(l.material)}</a>`], ['Deskripsi', (l) => esc(l.desc)], ['Qty', (l) => fmt(l.qty) + ' ' + esc(l.uom), 'num'], ['Sisa kirim', (l) => fmt(l.openQty), 'num'],
        ['Jadwal', (l) => dstr(l.delivery)], ['GR (MB51)', (l) => { const g = S.mb51 && S.mb51.gr.get(l.doc + '|' + String(+l.item || l.item)); return g ? `Tiba ${fmt(g.inQty)} · Rilis ${fmt(g.relQty)}` : '-'; }], ['Vendor', (l) => esc(l.vendor)]]) + '</div>');
      poLines.forEach((l) => mats.add(l.material + '|' + l.plant));
    }
    if (resvLines.length || resvMoves.length) {
      out.push(`<div class="card"><h3>Reservasi ${esc(q)}</h3>` + (resvLines.length ? table(resvLines, [['Item', (l) => esc(l.item)], ['Plant', (l) => esc(l.plant)], ['Material', (l) => `<a href="#" class="mono lm" data-m="${esc(l.material)}">${esc(l.material)}</a>`], ['Deskripsi', (l) => esc(l.desc)],
        ['Butuh', (l) => dstr(l.reqDate)], ['Diminta', (l) => fmt(l.reqQty), 'num'], ['Sudah GI', (l) => fmt(l.removed), 'num'], ['Sisa', (l) => fmt(l.diff), 'num'], ['Penerima', (l) => esc(l.recipient || l.costCenter)]]) : '<p class="muted">Tidak ada di MB25 (mungkin sudah selesai).</p>') +
        (resvMoves.length ? '<h4>GI dari gudang (MB51)</h4>' + table(resvMoves, [['Tanggal', (m) => dstr(m.date)], ['Mvt', (m) => esc(m.mt + ' ' + m.mtText)], ['Material', (m) => esc(m.material)], ['Qty', (m) => fmt(m.qty) + ' ' + esc(m.uom), 'num'], ['Dok. material', (m) => esc(m.matDoc)], ['Keterangan', (m) => esc(m.header)]]) : '') + '</div>');
      resvLines.forEach((l) => mats.add(l.material + '|' + l.plant));
    }
    // 2) material
    const isMat = (S.mb52 && S.mb52.items.some((i) => i.material === q)) || (S.mrpRes && [...S.mrpRes.values()].some((r) => r.material === q)) || (S.me2n && S.me2n.lines.some((l) => l.material === q)) || (S.mb51 && S.mb51.moves.some((m) => m.material === q));
    if (isMat) mats = new Set([q + '|']);
    if (!out.length && !isMat) { $('lres').innerHTML = `<div class="card empty"><div class="big">🔍</div>Tidak ditemukan di data yang dimuat.</div>`; return; }
    for (const key of mats) {
      const [mat, plant] = key.split('|');
      const ev = Trace.traceMaterial(mat, plant || null, { me2n: S.me2n, mb51: S.mb51, mb25: S.mb25 });
      const stockRows = S.mb52 ? S.mb52.items.filter((i) => i.material === mat && (!plant || i.plant === plant)) : [];
      const mrpRows = S.mrpRes ? [...S.mrpRes.values()].filter((r) => r.material === mat && (!plant || r.plant === plant)) : [];
      const desc = (stockRows[0] && stockRows[0].desc) || (mrpRows[0] && mrpRows[0].desc) || (ev[0] && '') || '';
      const stepCls = { PR: 'mute', PO: 'info', RO: 'info', 'GR (inspeksi)': 'warn', 'GR (rilis stok)': 'ok', Reservasi: 'warn', GI: 'low', Transfer: 'mute' };
      out.push(`<div class="card"><h3>Material <span class="mono">${esc(mat)}</span>${plant ? ' · ' + esc(plantLabel(plant)) : ''}</h3><p class="muted">${esc(desc)}</p>
        <div class="grid">${stockRows.length ? `<div><b>Stok sekarang (MB52)</b>${table(stockRows, [['Plant', (i) => esc(i.plant)], ['Stok', (i) => fmt(i.soh) + ' ' + esc(i.uom), 'num'], ['Nilai', (i) => rp(i.value), 'num']])}</div>` : ''}
        ${mrpRows.length ? `<div><b>MRP</b>${table(mrpRows, [['Plant', (r) => esc(r.plant)], ['Aging', (r) => agingPill(r.aging)], ['Min', (r) => fmt(r.min2), 'num'], ['Max', (r) => fmt(r.max2), 'num'], ['OS PO', (r) => fmt(r.ospo), 'num'], ['Reservasi', (r) => fmt(r.mb25), 'num'], ['To Order', (r) => fmt(r.toOrder), 'num'], ['Kontrak', (r) => esc(r.oa || '-')]])}</div>` : ''}</div>
        <h4>Jejak (${fmt(ev.length, 0)} kejadian)</h4>${ev.length ? `<ol class="timeline">${ev.map((e) => `<li><span class="when">${dstr(e.date)}</span>${pill(e.step, stepCls[e.step] || 'mute')} <span class="mono small">${esc(e.plant)}</span> ${esc(e.text)} <b class="${e.qty < 0 ? 'neg' : ''}">${fmt(e.qty)} ${esc(e.uom)}</b></li>`).join('')}</ol>` : '<p class="muted">Belum ada kejadian di ME2N/MB51/MB25.</p>'}</div>`);
    }
    $('lres').innerHTML = out.join('');
    document.querySelectorAll('.lm').forEach((a) => (a.onclick = (e) => { e.preventDefault(); $('lq').value = a.dataset.m; go(); }));
  };
  $('lgo').onclick = go; $('lq').onkeydown = (e) => { if (e.key === 'Enter') go(); }; go();
};

// ---------- Vendor & PR/PO ----------
const vc = { all() { return store.get('vendorContacts') || {}; }, get(k) { return this.all()[k] || {}; }, set(k, v) { const a = this.all(); a[k] = v; store.set('vendorContacts', a); } };
const kimapGroup = (m) => (m || '').slice(0, 4);
PAGES.order = function () {
  if (!S.mrpRes) { $('view').innerHTML = needFile('file MRP', 'Draft RO/PR dihitung dari mesin MRP. Upload file MRP (dan ME3N/ME2N agar status kontrak & PO terbaru).'); return; }
  const res = [...S.mrpRes.values()].filter((r) => S.mrpPlants.has(r.plant));
  const mbPrice = new Map(S.mb52 ? S.mb52.items.filter((i) => i.soh > 0).map((i) => [i.material + '|' + i.plant, i.price]) : []);
  const oePrice = (r) => { const lp = S.me2n && (S.me2n.lastPrice.get(r.material) || (r.kimap && S.me2n.lastPrice.get(r.kimap)));
    if (lp) return { price: lp.price, currency: lp.currency, src: 'PO terakhir ' + dstr(lp.date) }; const p = mbPrice.get(r.key); return p ? { price: p, currency: 'IDR', src: 'Harga rata-rata stok' } : { price: 0, currency: '', src: 'Belum ada harga' }; };
  const orders = res.filter((r) => r.toOrder > 0);
  const ro = orders.filter((r) => r.contract).map((r) => Object.assign({ r }, { value: r.toOrder * r.contract.price }));
  const pr = orders.filter((r) => !r.contract).map((r) => { const p = oePrice(r); return { r, p, value: r.toOrder * p.price, grp: kimapGroup(r.material) }; });
  // sisa kontrak cukup?
  const roByDoc = new Map(); ro.forEach((o) => roByDoc.set(o.r.contract.doc, (roByDoc.get(o.r.contract.doc) || 0) + o.value));
  const kand = new Map();
  res.filter((r) => !r.contract && r.alt && /^Rutin/.test(r.alt.tko.cls || '') && r.alt.tko.amu > 0).forEach((r) => {
    const k = kand.get(r.material) || { material: r.material, desc: r.desc, uom: r.uom, plants: [], qty: 0, value: 0, grp: kimapGroup(r.material), order: 0 };
    const p = oePrice(r), a = r.alt.tko.amu; k.plants.push(r.plant); k.qty += a * 12; k.value += a * 12 * (p.price || 0); k.order += r.toOrder; k.priceSrc = p.src; kand.set(r.material, k);
  });
  const kandidat = [...kand.values()].sort((a, b) => b.value - a.value);
  const ven = Contract.vendors(S.me3n, S.me2n);
  const roText = (doc) => { const its = ro.filter((o) => o.r.contract.doc === doc); const k = its[0].r.contract;
    return `Yth. ${k.vendor},\n\nBerikut rencana Release Order atas kontrak ${doc}:\n\n` + its.map((o, i) => `${i + 1}. ${o.r.material} - ${o.r.desc} : ${fmt(o.r.toOrder)} ${o.r.contract.uom || o.r.uom} (plant ${o.r.plant})`).join('\n') + `\n\nMohon konfirmasi ketersediaan dan jadwal pengiriman.\n\nTerima kasih.`; };
  const TABS = {
    ro: ['Draft RO (ada kontrak)', ro, [['No. OA', (o) => `<span class="mono">${esc(o.r.contract.doc)}</span>/${esc(o.r.contract.item)}`, '', (o) => o.r.contract.doc], ['Vendor', (o) => esc(o.r.contract.vendor)], ['PIC', (o) => esc(o.r.contract.pic)],
      ['Plant', (o) => esc(o.r.plant)], ['Material', (o) => `<span class="mono">${esc(o.r.material)}</span>`, '', (o) => o.r.material], ['Deskripsi', (o) => esc(o.r.desc)],
      ['Qty', (o) => fmt(o.r.toOrder), 'num', (o) => o.r.toOrder], ['UoM', (o) => esc(o.r.contract.uom || o.r.uom)], ['Harga kontrak', (o) => money(o.r.contract.price, o.r.contract.currency), 'num', (o) => o.r.contract.price],
      ['Nilai', (o) => money(o.value, o.r.contract.currency), 'num', (o) => o.value], ['Mata uang', (o) => esc(o.r.contract.currency)],
      ['Sisa kontrak cukup?', (o) => (roByDoc.get(o.r.contract.doc) <= o.r.contract.sisa ? pill('Cukup', 'ok') : pill('Kurang', 'low')), '', (o) => (roByDoc.get(o.r.contract.doc) <= o.r.contract.sisa ? 'Cukup' : 'Kurang')],
      ['Sisa hari', (o) => fmt(o.r.contract.sisaHari, 0), 'num', (o) => o.r.contract.sisaHari],
      ['Kontak', (o) => `<button class="btn mini mail" data-doc="${esc(o.r.contract.doc)}" data-v="${esc(o.r.contract.vendorCode || o.r.contract.vendor)}">✉ Email</button>`, '', () => '']],
      (o) => o.r.contract.doc + ' ' + o.r.contract.vendor + ' ' + o.r.material + ' ' + o.r.desc, 'Item To Order yang tercover kontrak aktif → terbitkan RO. Kontrak dipilih dengan prioritas X07 → X02 → X10 → X03.'],
    pr: ['Draft PR + OE (tanpa kontrak)', pr, [['Kelompok KIMAP', (o) => `<span class="mono">${esc(o.grp)}</span>`, '', (o) => o.grp], ['Plant', (o) => esc(o.r.plant)], ['Material', (o) => `<span class="mono">${esc(o.r.material)}</span>`, '', (o) => o.r.material],
      ['Deskripsi', (o) => esc(o.r.desc)], ['Qty', (o) => fmt(o.r.toOrder), 'num', (o) => o.r.toOrder], ['UoM', (o) => esc(o.r.uom)],
      ['Harga OE', (o) => (o.p.price ? money(o.p.price, o.p.currency) : pill('Belum ada', 'warn')), 'num', (o) => o.p.price], ['Sumber harga', (o) => esc(o.p.src)],
      ['Nilai OE', (o) => money(o.value, o.p.currency), 'num', (o) => o.value], ['Mata uang', (o) => esc(o.p.currency)], ['Kelas', (o) => esc(o.r.cls || o.r.aging)]],
      (o) => o.grp + ' ' + o.r.material + ' ' + o.r.desc, 'Item To Order tanpa kontrak → PR + Owner Estimate. Dikelompokkan per 4 digit awal KIMAP (sementara, nanti diganti Material Group). Harga OE dari PO terakhir (ME2N), atau harga rata-rata stok.'],
    kandidat: ['Kandidat kontrak', kandidat, [['Kelompok KIMAP', (k) => `<span class="mono">${esc(k.grp)}</span>`, '', (k) => k.grp], ['Material', (k) => `<span class="mono">${esc(k.material)}</span>`, '', (k) => k.material], ['Deskripsi', (k) => esc(k.desc)],
      ['Plant', (k) => esc(k.plants.join(', '))], ['Kebutuhan/thn', (k) => fmt(k.qty) + ' ' + esc(k.uom), 'num', (k) => k.qty], ['Est. nilai/thn', (k) => rp(k.value), 'num', (k) => k.value],
      ['To Order sekarang', (k) => fmt(k.order), 'num', (k) => k.order], ['Sumber harga', (k) => esc(k.priceSrc)]], (k) => k.grp + ' ' + k.material + ' ' + k.desc,
      'Material rutin (FS) yang belum punya kontrak aktif. Sesuai Pedoman, item rutin/bottleneck sebaiknya dibuatkan kontrak jangka panjang (OA/COO) agar lead time turun dan stok bisa lebih tipis.'],
    vendor: ['Vendor', ven, [['Kode', (v) => esc(v.code)], ['Vendor', (v) => esc(v.name)], ['Kontrak', (v) => fmt(v.kontrak, 0), 'num', (v) => v.kontrak], ['Dok. PO/RO', (v) => fmt(v.po, 0), 'num', (v) => v.po],
      ['Nilai sisa kirim (IDR)', (v) => rp(v.openValue), 'num', (v) => v.openValue],
      ['Email', (v) => `<input class="vc" data-k="${esc(v.code || v.name)}" data-f="email" value="${esc(vc.get(v.code || v.name).email || '')}" placeholder="email">`, '', (v) => vc.get(v.code || v.name).email || ''],
      ['Telepon', (v) => `<input class="vc" data-k="${esc(v.code || v.name)}" data-f="tel" value="${esc(vc.get(v.code || v.name).tel || '')}" placeholder="telp/WA">`, '', (v) => vc.get(v.code || v.name).tel || ''],
      ['Nama kontak', (v) => `<input class="vc" data-k="${esc(v.code || v.name)}" data-f="pic" value="${esc(vc.get(v.code || v.name).pic || '')}" placeholder="nama">`, '', (v) => vc.get(v.code || v.name).pic || '']],
      (v) => v.code + ' ' + v.name, 'Kontak vendor yang kamu isi hanya tersimpan di browser ini (tidak ke GitHub). Dipakai untuk tombol ✉ Email di Draft RO.'],
  };
  const sumV = (a) => a.filter((o) => (o.r.contract ? o.r.contract.currency : o.p.currency) === 'IDR').reduce((x, o) => x + o.value, 0);
  const tiles = `<div class="tiles">${[['Item RO', fmt(ro.length, 0), 'info'], ['Kontrak dipakai RO', fmt(roByDoc.size, 0), 'info'], ['Nilai RO (IDR)', rp(sumV(ro)), 'info'],
    ['Item PR + OE', fmt(pr.length, 0), 'warn'], ['Nilai OE (IDR)', rp(sumV(pr)), 'warn'], ['Kandidat kontrak', fmt(kandidat.length, 0), 'bad']]
    .map(([k, v, c]) => `<div class="tile ${c}"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>`;
  tabbed('oTab', TABS, tiles + (S.me3n ? '' : '<div class="card"><span class="muted">Status kontrak masih dari file MRP. Upload ME3N/ME2N supaya kontrak, harga, dan OS PO terbaru.</span></div>'));
  // event: kontak vendor & email
  const bindRes = () => {
    document.querySelectorAll('.vc').forEach((i) => (i.onchange = () => { const c = vc.get(i.dataset.k); c[i.dataset.f] = i.value.trim(); vc.set(i.dataset.k, c); }));
    document.querySelectorAll('.mail').forEach((b) => (b.onclick = () => {
      const c = vc.get(b.dataset.v); const doc = b.dataset.doc;
      if (!c.email) { alertBox('Email vendor belum diisi. Isi dulu di tab Vendor.'); return; }
      location.href = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent('Rencana Release Order kontrak ' + doc)}&body=${encodeURIComponent(roText(doc))}`;
    }));
  };
  bindRes(); new MutationObserver(bindRes).observe($('res'), { childList: true });
};
function alertBox(t) { banner(esc(t) + ' <button class="icon-btn" id="bx">✕</button>', 'warn'); $('bx').onclick = () => banner(''); }

// Markdown sederhana → HTML (teks di-escape dulu, aman)
function md(src) {
  const inline = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>').replace(/`(.+?)`/g, '<code>$1</code>');
  const L = src.replace(/\r/g, '').split('\n'); let h = '', i = 0;
  while (i < L.length) {
    const l = L[i];
    if (/^\s*\|/.test(l)) { const rows = []; while (i < L.length && /^\s*\|/.test(L[i])) rows.push(L[i++]);
      const cells = (r) => r.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const body = rows.filter((r, k) => !(k === 1 && /^[\s|:-]+$/.test(r)));
      h += `<div class="table-wrap flat"><table><tr>${cells(body[0]).map((c) => `<th>${inline(c)}</th>`).join('')}</tr>${body.slice(1).map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</table></div>`; continue; }
    if (/^#{1,4}\s/.test(l)) { const n = l.match(/^#+/)[0].length; h += `<h${n + 1}>${inline(l.replace(/^#+\s*/, ''))}</h${n + 1}>`; i++; continue; }
    if (/^\s*([-*]|\d+\.)\s/.test(l)) { const ord = /^\s*\d+\./.test(l); let it = ''; while (i < L.length && /^\s*([-*]|\d+\.)\s/.test(L[i])) { const sub = /^\s{2,}/.test(L[i]); it += `<li${sub ? ' class="sub"' : ''}>${inline(L[i].replace(/^\s*([-*]|\d+\.)\s/, ''))}</li>`; i++; } h += ord ? `<ol>${it}</ol>` : `<ul>${it}</ul>`; continue; }
    if (/^---+$/.test(l.trim())) { h += '<hr>'; i++; continue; }
    if (l.trim()) { let p = ''; while (i < L.length && L[i].trim() && !/^\s*(\||#|[-*]\s|\d+\.\s)/.test(L[i])) p += ' ' + L[i++]; h += `<p>${inline(p.trim())}</p>`; continue; }
    i++;
  }
  return h;
}

PAGES.regulasi = function () {
  const P = Object.assign({}, MRP.TKO_DEFAULT, S.set.tko || {});
  const maxTxt = { A: '2 × (AMU × T) + SS', B: 'AMU × T + 2 × SS', C: `ROP + ${P.roqMonths} × AMU`, BC: `ada kontrak: AMU × T + 2 × SS · tanpa kontrak: ROP + ${P.roqMonths} × AMU` }[P.maxFormula];
  const sl = { 1.282: '90%', 1.645: '95%', 2.054: '98%', 2.326: '99%' }[P.z] || P.z;
  const T = {
    mrp: ['Logika MRP', `
      <div class="card"><h3>Urutan hitung per material + plant</h3><ol class="steps">
        <li><b>Aging</b> dari pemakaian terakhir: FS ≤ 12 bln · MD ≤ 24 bln · SP ≤ 60 bln · DS &gt; 60 bln.${P.mdAsFS ? ' <i>MD sementara dihitung seperti FS (perlu konfirmasi user).</i>' : ''}</li>
        <li><b>Kategori stock</b>: Project → Program · FS chemical/catalyst → Rutin Chemical · FS lainnya → Rutin Maintenance · SP/DS → On Demand.</li>
        <li><b>AMU</b> = rata-rata pemakaian ${P.amuMonths} bulan terakhir.</li>
        <li><b>T (lead time efektif)</b> = lead time${' + ' + P.nonContractLT} bln bila belum ada kontrak (waktu PR → kontrak).</li>
        <li><b>Safety stock</b>: maintenance = z × SdMI × √T (service level ${sl}), maks ${P.ssCapMonths} × AMU · chemical = ${P.chemSSMonths} × AMU.</li>
        <li><b>Min (ROP)</b> = AMU × T + SS.</li>
        <li><b>Max</b> = ${esc(maxTxt)} · chemical = AMU × (${P.chemP} + T) + SS. Min dan Max dibulatkan ke atas, Max ≥ Min.</li>
        <li><b>To Order</b>: tersedia = Stok + OS PO − Reservasi. Kalau tersedia &lt; Min → pesan Max − tersedia. Program/On Demand: RKM + Reservasi − (Stok + OS PO).</li>
        <li><b>Penyehatan</b>: berlebih kalau stok &gt; ${P.excessGeneral} bln pemakaian (chemical ${P.excessChem} bln); DS dengan stok = kandidat dead stock.</li>
      </ol><p class="muted small">Angka di atas mengikuti Pengaturan saat ini. <a href="#/pengaturan">Ubah parameter</a></p></div>
      <div class="card"><h3>Coba hitung</h3><div class="params" id="sim">
        ${[['amu', 'AMU (per bulan)', 4], ['lt', 'Lead time (bln)', 3], ['sd', 'Std. deviasi pemakaian bulanan', 3], ['st', 'Stok', 10], ['po', 'OS PO/RO', 0], ['rs', 'Reservasi (MB25)', 0]].map(([k, t, v]) => `<label>${t}<span><input type="number" step="0.5" min="0" data-k="${k}" value="${v}"></span></label>`).join('')}
        <label>Kontrak<span><select data-k="kon"><option value="Yes">Ada</option><option value="No">Belum ada</option></select></span></label>
        <label>Chemical/catalyst<span><select data-k="chem"><option value="0">Bukan</option><option value="1">Ya</option></select></span></label>
      </div><div id="simOut" class="sim-out"></div></div>`],
    kat: ['Kategori & Aging', `
      <div class="card"><h3>Kategori stock dan perlakuannya di web</h3><div class="table-wrap flat"><table>
        <tr><th>Kategori</th><th>Siapa</th><th>Safety stock</th><th>Min / Max</th><th>Cara pesan</th></tr>
        <tr><td>Program</td><td>Cat = Project, kebutuhan program (TA/OH, drilling, WS)</td><td>0</td><td>Tidak ada</td><td>RKM + reservasi − (stok + PO)</td></tr>
        <tr><td>Rutin · Chemical</td><td>FS, deskripsi chemical/catalyst</td><td>${P.chemSSMonths} bln × AMU</td><td>ROP = AMU×T+SS · Max = AMU×(P+T)+SS</td><td>Isi sampai Max</td></tr>
        <tr><td>Rutin · Maintenance</td><td>FS lainnya${P.mdAsFS ? ' (+ MD)' : ''}</td><td>z × SdMI × √T</td><td>ROP = AMU×T+SS · Max = ${esc(maxTxt)}</td><td>Isi sampai Max</td></tr>
        <tr><td>Rutin · Slow</td><td>MD${P.mdAsFS ? ' (bila opsi MD→FS dimatikan)' : ''}</td><td>z × SdMI × √T</td><td>Min = Max = SS</td><td>Sampai SS</td></tr>
        <tr><td>On Demand</td><td>SP / DS</td><td>0</td><td>Tidak ada</td><td>Reservasi/RKM − (stok + PO)</td></tr>
        <tr><td>Insurance / Critical</td><td>Belum ada data</td><td>Rekomendasi user</td><td>—</td><td>Upcoming</td></tr>
      </table></div><p class="muted small">Penanda chemical sementara ditebak dari deskripsi. Nanti diganti Material Group / logika KIMAP.</p></div>
      <div class="card"><h3>Kenapa Max dibedakan kontrak vs tanpa kontrak?</h3>
        <p>Item yang punya kontrak cukup dibuatkan RO (lead time pendek), jadi stok bisa dijaga tipis (rumus B). Item tanpa kontrak harus lewat PR + OE (± ${P.nonContractLT} bln), jadi sekali pesan dibuat cukup untuk ± ${P.roqMonths} bln (rumus C) agar PR tidak terlalu sering.</p>
        <p>Item rutin yang belum punya kontrak adalah kandidat kontrak jangka panjang (OA/COO). Begitu berkontrak, lead time turun dan stok bisa lebih tipis.</p></div>`],
    rkm: ['RKM & Material', `
      <div class="card"><h3>Peran RKM</h3><ul>
        <li>MRP adalah metodenya, RKM adalah input dari user (jumlah dan bulan kebutuhan 2027).</li>
        <li>Basis kebutuhan diatur di Pengaturan: <b>${esc(BASIS[S.set.basis])}</b>.</li>
        <li>Untuk item Program / On Demand, RKM langsung jadi kebutuhan pesan (RKM − stok − PO).</li>
        <li>Long Lead Item: item dengan LT ≥ ${S.set.lliLT} bln, diberi bulan "pesan paling lambat" = bulan butuh − LT.</li></ul></div>
      <div class="card"><h3>Cara RKM dicocokkan ke MRP</h3><ol class="steps">
        <li>KIMAP RKM = Material di MRP (plant sama)</li><li>KIMAP RKM = KIMAP Final di MRP</li>
        <li>KIMAP RKM ditemukan di master LeadTime → Material → MRP</li><li>Kalau tanpa KIMAP: deskripsi persis sama dan unik di plant itu</li></ol>
        <p class="muted small">Yang tidak cocok masuk tab "RKM tanpa MRP". Kalau ada di master LeadTime, web memberi usulan Min/Max dari RKM.</p></div>`],
    pedoman: ['Pedoman / TKO', S.regulasi ? `<div class="card md"><p class="muted small">Dibaca dari file lokal <b>${esc(S.regulasi.name)}</b>. Tidak tersimpan di web/GitHub.</p>${md(S.regulasi.text)}</div>`
      : `<div class="card empty"><div class="big">📘</div><h3>Ringkasan Pedoman belum dimuat</h3>
        <p>Isi Pedoman/TKO bersifat internal, jadi tidak disimpan di web. Taruh file ringkasan (.md) yang namanya memuat kata "regulasi" di folder data, atau pilih filenya di sini.</p>
        <label class="btn primary">Pilih file .md<input type="file" id="regf" accept=".md,.txt" hidden></label></div>`],
  };
  if (!T[S.regTab]) S.regTab = 'mrp';
  $('view').innerHTML = `<div class="tabs">${Object.entries(T).map(([k, t]) => `<button class="tab ${k === S.regTab ? 'on' : ''}" data-t="${k}">${esc(t[0])}</button>`).join('')}</div>${T[S.regTab][1]}`;
  document.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { S.regTab = b.dataset.t; PAGES.regulasi(); }));
  if ($('regf')) $('regf').onchange = async (e) => { const f = e.target.files[0]; if (f) { S.regulasi = { name: f.name, text: await f.text() }; PAGES.regulasi(); } };
  if ($('sim')) {
    const v = (k) => { const el = document.querySelector(`#sim [data-k="${k}"]`); return el.tagName === 'SELECT' ? el.value : parseFloat(el.value) || 0; };
    const run = () => {
      const amu = v('amu'), sd = v('sd'), chem = v('chem') === '1', kon = v('kon');
      // usage sintetis 24 bln dengan rata-rata & sd yang diminta (supaya mesin yang sama dipakai)
      const n = P.amuMonths, usage = Array.from({ length: 120 }, () => 0);
      for (let i = 0; i < n; i++) usage[120 - n + i] = amu + (i % 2 ? sd : -sd) * Math.sqrt((n - 1) / n);
      const r = MRP.calcTKO({ usageAll: usage, lt: v('lt'), hasContract: kon, cat: 'MRO', desc: chem ? 'CHEMICAL' : 'PART', stock: v('st'), ospo: v('po'), mb25: v('rs') }, { tko: S.set.tko });
      $('simOut').innerHTML = `<div class="tiles">${[['Kategori', esc(r.cls)], ['T efektif', fmt(r.tEff) + ' bln'], ['Safety stock', fmt(r.ss)], ['Min (ROP)', fmt(r.min2)], ['Max', fmt(r.max2)], ['To Order', fmt(r.toOrder)]].map(([k, x]) => `<div class="tile info"><div class="k">${k}</div><div class="v small-v">${x}</div></div>`).join('')}</div>`;
    };
    document.querySelectorAll('#sim input, #sim select').forEach((el) => (el.oninput = el.onchange = run)); run();
  }
};

function soon(r) { $('view').innerHTML = `<div class="card empty"><div class="big">🚧</div><h3>${esc(r[1])}</h3><p>Sedang disiapkan (${esc(r[4] || '')}).</p></div>`; }
