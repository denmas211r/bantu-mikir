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
    ['cari', 'Cari Material', 'search', 'Cari lintas plant dari data MB52'],
    ['rkm', 'RKM x MRP', 'chart', 'Monitoring RKM 2027 dan MRP Min/Max Zona 1', 'Tahap 3'],
  ]],
  ['Pengadaan', [
    ['kontrak', 'Kontrak (OA/RO)', 'doc', 'Utilisasi dan sisa kontrak', 'Tahap 4'],
    ['order', 'Vendor & PR/PO', 'cart', 'Kontak vendor, buat PR, PO, dan template PR', 'Tahap 4'],
    ['hps', 'HPS / OE', 'calc', 'Evaluasi penawaran vendor', 'Tahap 5'],
  ]],
  ['Laporan', [['kpi', 'KPI Inventory', 'gauge', 'Service level, TOR, slow moving & dead stock', 'Tahap 5']]],
  ['Data', [
    ['data', 'Data SAP', 'db', 'Upload MB52 dan MRP (diproses di browser)'],
    ['pengaturan', 'Pengaturan', 'gear', 'Plant yang dipantau MRP'],
  ]],
];
const ROUTES = Object.fromEntries(MENU.flatMap(([, items]) => items.map((i) => [i[0], i])));
const DEFAULT_MRP_PLANTS = ['W101', 'W102', 'W802', 'W803'];
const PLANT_NAME = { W101: 'Rantau', W102: 'Pangkalan Susu', W802: 'Jambi', W803: 'Lirik' };

let S = null; // sesi: {role, user, data, mb52, mrp, mrpPlants, ...}
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 2) => (typeof n === 'number' && isFinite(n) ? n.toLocaleString('id-ID', { maximumFractionDigits: d }) : '-');
const rp = (n) => (n >= 1e9 ? fmt(n / 1e9, 2) + ' M' : n >= 1e6 ? fmt(n / 1e6, 1) + ' jt' : fmt(n, 0));
const plantLabel = (p) => (PLANT_NAME[p] ? `${p} · ${PLANT_NAME[p]}` : p);
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

// ---------- Login ----------
$('lf').onsubmit = async (e) => {
  e.preventDefault(); $('err').textContent = ''; $('lb').disabled = true; $('lb').textContent = 'Memproses…';
  try {
    const keys = await (await fetch('data/keys.json', { cache: 'no-store' })).json();
    const entry = keys[$('u').value.trim().toLowerCase()];
    if (!entry) throw 0;
    const { role, key } = await Vault.login(entry, $('p').value);
    const data = await Vault.decryptJSON(key, await (await fetch('data/data.enc.json', { cache: 'no-store' })).json());
    S = { role, data, user: $('u').value.trim(), mb52: null, mrp: null, mrpPlants: new Set(store.get('mrpPlants') || DEFAULT_MRP_PLANTS) };
    $('login').hidden = true; $('app').hidden = false;
    $('whoName').textContent = S.user; $('whoRole').textContent = role; $('avatar').textContent = S.user[0].toUpperCase();
    buildNav(); route();
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
  const a = S.mb52, b = S.mrp;
  $('sideData').innerHTML = `<div><span class="dot ${a ? 'on' : ''}"></span>MB52: <b>${a ? fmt(a.items.length, 0) + ' item' : 'belum ada'}</b></div>
    <div><span class="dot ${b ? 'on' : ''}"></span>MRP: <b>${b ? fmt(b.map.size, 0) + ' baris' : 'belum ada'}</b></div>`;
}
function route() {
  const k = (location.hash.match(/#\/([\w-]+)/) || [, 'beranda'])[1];
  const r = ROUTES[k] || ROUTES.beranda;
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.k === r[0]));
  $('pageTitle').textContent = r[1]; $('pageSub').textContent = r[3] || ''; $('pageActions').innerHTML = '';
  $('sidebar').classList.remove('open'); sideData();
  (PAGES[r[0]] || soon)(r);
}

// ---------- Data aktif ----------
function activeItems() {
  if (S.mb52) return Parser.merge(S.mb52.items, S.mrp ? S.mrp.map : null, S.mrpPlants);
  return S.data.materials.map((m) => {
    const it = { plant: m.plant, material: m.kimap, desc: m.desc, uom: m.uom, soh: m.soh, value: 0, price: 0, transit: 0, locs: [], mrp: { min: m.min, max: m.max } };
    const st = Parser.status(it, it.mrp, S.mrpPlants); return Object.assign(it, { status: st.s, cls: st.cls });
  });
}
const expand = (q) => q.toLowerCase().split(/\s+/).filter(Boolean).map((x) => S.data.synonyms.find((s) => s.includes(x)) || [x]);
let timer; const debounce = (fn) => { clearTimeout(timer); timer = setTimeout(fn, 200); };
const demoNote = () => (S.mb52 ? '' : `<div class="card"><b>Masih memakai data contoh.</b> <span class="muted">Upload file MB52 di menu <a href="#/data">Data SAP</a> untuk melihat stok sebenarnya.</span></div>`);

// ---------- Halaman ----------
const PAGES = {
  beranda() {
    const items = activeItems();
    const c = (s) => items.filter((x) => x.status === s).length;
    const value = items.reduce((a, x) => a + (x.value || 0), 0);
    const tiles = [
      ['Total item', fmt(items.length, 0), 'info', ''], ['Nilai stok (Rp)', rp(value), 'info', ''],
      ['Kosong', fmt(c('Kosong'), 0), 'bad', 'Kosong'], ['Di bawah Min', fmt(c('Di bawah Min'), 0), 'bad', 'Di bawah Min'],
      ['Surplus (> Max)', fmt(c('Surplus'), 0), 'warn', 'Surplus'], ['Aman', fmt(c('Aman'), 0), 'ok', 'Aman'],
    ];
    const perPlant = {}; items.forEach((x) => { const p = (perPlant[x.plant] ||= { n: 0, v: 0, low: 0 }); p.n++; p.v += x.value || 0; if (x.cls === 'low') p.low++; });
    $('view').innerHTML = `${demoNote()}
      <div class="tiles">${tiles.map(([k, v, cls, st]) => `<div class="tile ${cls}" data-st="${st}"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>
      <div class="grid">
        <div class="card"><h3>Stok per plant</h3><div class="table-wrap" style="max-height:none;box-shadow:none"><table>
          <tr><th>Plant</th><th class="num">Item</th><th class="num">Nilai (Rp)</th><th class="num">Perlu perhatian</th></tr>
          ${Object.entries(perPlant).sort().map(([p, v]) => `<tr><td>${esc(plantLabel(p))}${S.mrpPlants.has(p) ? '' : ' <span class="pill mute">tanpa MRP</span>'}</td><td class="num">${fmt(v.n, 0)}</td><td class="num">${rp(v.v)}</td><td class="num">${v.low ? `<span class="pill low">${v.low}</span>` : '-'}</td></tr>`).join('')}
        </table></div></div>
        <div class="card hero"><h3>Mulai kerja</h3><ol class="steps">
          <li>Buka <b>Data SAP</b>, upload MB52 hasil bot.</li>
          <li>Upload file MRP Zona 1 untuk status Min/Max.</li>
          <li>Klik kotak status di atas untuk langsung melihat daftarnya.</li></ol>
          <a class="btn" href="#/data">Buka Data SAP →</a></div>
      </div>`;
    document.querySelectorAll('.tile[data-st]').forEach((t) => (t.onclick = () => { if (t.dataset.st) { sessionStorage.setItem('fs', t.dataset.st); location.hash = '#/cari'; } }));
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
    const draw = () => {
      const groups = expand($('q').value), fp = $('fp').value, fs = $('fs').value;
      const rows = items.filter((m) => (!fp || m.plant === fp) && (!fs || m.status === fs) &&
        groups.every((g) => g.some((t) => (m.material + ' ' + m.desc).toLowerCase().includes(t))));
      const shown = rows.slice(0, 300);
      $('cnt').textContent = `${fmt(rows.length, 0)} item${rows.length > 300 ? ' · menampilkan 300 pertama, persempit pencarian' : ''}`;
      $('res').innerHTML = rows.length ? `<div class="table-wrap"><table><tr><th>Plant</th><th>Material</th><th>Deskripsi</th><th class="num">Stok</th><th>UoM</th><th class="num">Harga/unit</th><th class="num">Nilai (Rp)</th><th class="num">Min</th><th class="num">Max</th><th>Status</th></tr>` +
        shown.map((m) => `<tr title="${esc(m.locs.map((l) => l.sloc + (l.batch ? '/' + l.batch : '') + ': ' + l.qty).join(' | '))}"><td>${esc(m.plant)}</td><td class="mono">${esc(m.material)}</td><td>${esc(m.desc)}</td>
          <td class="num">${fmt(m.soh)}</td><td>${esc(m.uom)}</td><td class="num">${fmt(m.price, 0)}</td><td class="num">${fmt(m.value, 0)}</td>
          <td class="num">${m.mrp ? fmt(m.mrp.min) : '-'}</td><td class="num">${m.mrp ? fmt(m.mrp.max) : '-'}</td><td><span class="pill ${m.cls}">${esc(m.status)}</span></td></tr>`).join('') + '</table></div>'
        : `<div class="card empty"><div class="big">🔍</div>Tidak ada material yang cocok.</div>`;
    };
    $('q').oninput = () => debounce(draw); $('fp').onchange = draw; $('fs').onchange = draw; draw(); $('q').focus();
  },

  data() {
    const box = (id, title, hint, info) => `<div class="card"><h3>${title}</h3>
      <label class="drop"><input type="file" id="${id}" accept=".xlsx,.xlsm,.xls"><div class="big">📄</div><b>Pilih file Excel</b><div class="muted">${hint}</div></label>
      <div class="status-line ${info ? 'ok' : ''}" id="${id}m">${info || 'Belum ada file.'}</div></div>`;
    $('view').innerHTML = `<div class="card"><b>🔒 Aman:</b> <span class="muted">file hanya dibaca di browser kamu dan hilang saat halaman ditutup. Tidak ada yang dikirim ke server atau repo.</span></div>
      <div class="grid">
        ${box('f1', '1. Stok MB52', 'Hasil download bot MB52 (kolom Plant, Material, Unrestricted…)', S.mb52 && `✓ ${esc(S.mb52Name)} · ${fmt(S.mb52.items.length, 0)} item · ${S.mb52.plants.length} plant`)}
        ${box('f2', '2. MRP Zona 1 (opsional)', 'File MRP yang punya sheet "MRP"', S.mrp && `✓ ${esc(S.mrpName)} · ${fmt(S.mrp.map.size, 0)} baris`)}
      </div>`;
    const load = (id, fn) => ($(id).onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return; const m = $(id + 'm'); m.className = 'status-line'; m.textContent = 'Memproses ' + f.name + '…';
      try { await new Promise((r) => setTimeout(r, 30)); fn(f, await f.arrayBuffer()); PAGES.data(); sideData(); }
      catch (err) { m.className = 'status-line bad'; m.textContent = 'Gagal: ' + err.message; }
    });
    load('f1', (f, buf) => { S.mb52 = Parser.parseMB52(XLSX, buf); S.mb52Name = f.name; });
    load('f2', (f, buf) => { S.mrp = Parser.parseMRP(XLSX, buf); S.mrpName = f.name; });
  },

  pengaturan() {
    const all = [...new Set([...(S.mb52 ? S.mb52.plants : []), ...(S.mrp ? S.mrp.plants : []), ...DEFAULT_MRP_PLANTS, ...S.mrpPlants])].sort();
    $('view').innerHTML = `<div class="card"><h3>Plant yang dipantau MRP</h3>
      <p class="muted">Semua plant di MB52 tetap bisa dicari. Status Min/Max hanya dihitung untuk plant yang dipilih. Pilihan disimpan di browser ini.</p>
      <div class="chips" id="chips">${all.map((p) => `<label class="chip ${S.mrpPlants.has(p) ? 'on' : ''}"><input type="checkbox" value="${esc(p)}" ${S.mrpPlants.has(p) ? 'checked' : ''}>${esc(plantLabel(p))}</label>`).join('')}</div>
      <div class="status-line" id="sum"></div></div>`;
    const summary = () => { const c = {}; activeItems().forEach((x) => { c[x.status] = (c[x.status] || 0) + 1; }); $('sum').textContent = 'Ringkasan: ' + Object.entries(c).map(([k, v]) => `${k} ${fmt(v, 0)}`).join(' · '); };
    $('chips').onchange = (e) => { e.target.parentElement.classList.toggle('on', e.target.checked);
      S.mrpPlants = new Set([...document.querySelectorAll('#chips input:checked')].map((i) => i.value)); store.set('mrpPlants', [...S.mrpPlants]); summary(); };
    summary();
  },
};
function soon(r) { $('view').innerHTML = `<div class="card empty"><div class="big">🚧</div><h3>${esc(r[1])}</h3><p>Sedang disiapkan (${esc(r[4] || '')}).</p></div>`; }
