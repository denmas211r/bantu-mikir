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
    ['kontrak', 'Kontrak (OA/RO)', 'doc', 'Utilisasi dan sisa kontrak', 'Tahap 4'],
    ['order', 'Vendor & PR/PO', 'cart', 'Kontak vendor, buat PR, PO, dan template PR', 'Tahap 4'],
    ['hps', 'HPS / OE', 'calc', 'Evaluasi penawaran vendor', 'Tahap 5'],
  ]],
  ['Laporan', [['kpi', 'KPI Inventory', 'gauge', 'Service level, TOR, slow moving & dead stock', 'Tahap 5']]],
  ['Data', [
    ['data', 'Data SAP', 'db', 'Folder data, MB52, MRP, dan RKM (diproses di browser)'],
    ['pengaturan', 'Pengaturan', 'gear', 'Plant MRP, basis kebutuhan, batas Long Lead Item'],
  ]],
];
const ROUTES = Object.fromEntries(MENU.flatMap(([, items]) => items.map((i) => [i[0], i])));
const DEFAULT_MRP_PLANTS = ['W101', 'W102', 'W802', 'W803'];
const PLANT_NAME = { W101: 'Rantau', W102: 'Pangkalan Susu', W802: 'Jambi', W803: 'Lirik' };
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
    row(S.rkmFiles.length, 'RKM', S.rkmFiles.length ? S.rkmFiles.length + ' file' : 'belum ada');
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
  const o = { stockMap, method: S.set.method, tko: S.set.tko };
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
        <p class="muted">${fs ? 'Pilih satu folder di laptop yang berisi file MB52, MRP, dan RKM. Web mengambil MB52 dan MRP yang <b>paling baru</b>, serta <b>semua</b> file RKM. Nama file harus memuat kata "MB52", "MRP", atau "RKM". Login berikutnya cukup 1 klik.' : 'Browser ini tidak mendukung akses folder. Pakai Chrome atau Edge di laptop, atau upload manual di bawah.'}</p></div>
        ${fs ? '<div class="row"><button class="btn primary" id="fp1">Pilih folder</button><button class="btn" id="fp2">Lupakan folder</button></div>' : ''}</div>
      <div class="card"><b>🔒 Aman:</b> <span class="muted">file hanya dibaca di browser kamu dan hilang saat halaman ditutup. Tidak ada yang dikirim ke server atau repo.</span></div>
      <div class="grid">
        ${box('f1', '1. Stok MB52', 'Hasil download bot MB52', S.mb52 && `✓ ${esc(S.mb52Name)} · ${fmt(S.mb52.items.length, 0)} item · ${S.mb52.plants.length} plant`)}
        ${box('f2', '2. MRP Zona 1', 'Perlu sheet "MRP" dan "LeadTime"', S.mrpWB && `✓ ${esc(S.mrpName)} · ${fmt(S.mrpRes.size, 0)} item · histori ${esc(S.mrpWB.window.join(' s.d. '))}`)}
        ${box('f3', '3. RKM lapangan', 'Format template SHU, 1 file per lapangan', S.rkmFiles.length && `✓ ${S.rkmFiles.length} file`, true)}
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
    load('f1', loadMB52); load('f2', loadMRP); load('f3', (f) => loadRKM(f));
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
        <label>Rumus Max (maintenance)<span><select data-s="maxFormula">${[['A', 'A · 2×(AMU×T)+SS'], ['B', 'B · AMU×T+2×SS'], ['C', 'C · ROP+n×AMU']].map(([v, t]) => `<option value="${v}" ${(S.set.tko.maxFormula || MRP.TKO_DEFAULT.maxFormula) === v ? 'selected' : ''}>${t}</option>`).join('')}</select></span></label>
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
function soon(r) { $('view').innerHTML = `<div class="card empty"><div class="big">🚧</div><h3>${esc(r[1])}</h3><p>Sedang disiapkan (${esc(r[4] || '')}).</p></div>`; }
