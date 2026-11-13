// ============ MIM Inventory Analyst — App (routing + halaman) ============
const ICON = {
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  recycle: '<path d="M7 19H4l2.5-3.5M17 5h3l-2.5 3.5M4.5 15.5A8 8 0 0 0 18 17M19.5 8.5A8 8 0 0 0 6 7"/>',
  flow: '<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>',
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
// Menu mengikuti alur kerja Analyst dari awal sampai akhir: cek stok → hitung kebutuhan → pesan → pantau → laporkan.
const MENU = [
  ['Ringkasan', [['beranda', 'Beranda', 'home', 'Gambaran cepat dari stok sampai laporan']]],
  ['1. Stok', [
    ['cari', 'Cari Material', 'search', 'Cek stok sebuah material di semua gudang, lengkap dengan analisisnya'],
    ['gerak', 'Keluar-Masuk Barang', 'flow', 'Barang apa yang masuk dan keluar gudang, dari mana dan ke mana'],
  ]],
  ['2. Rencana', [
    ['rkm', 'Kebutuhan & MRP', 'chart', 'Hitung stok minimum dan maksimum, dan kapan harus pesan'],
    ['order', 'Perlu Dipesan', 'cart', 'Barang yang harus dipesan: lewat kontrak (RO) atau permintaan pembelian baru (PR)'],
  ]],
  ['3. Pengadaan', [
    ['kontrak', 'Kontrak', 'doc', 'Kontrak vendor yang masih berlaku, sisa nilainya, dan kapan habis'],
    ['expediting', 'Pantau Pesanan', 'truck', 'Pesanan yang belum datang, terlambat, atau belum diambil user'],
    ['lacak', 'Lacak Material', 'route', 'Jejak satu material atau dokumen dari permintaan sampai dipakai'],
  ]],
  ['4. Laporan', [['optim', 'Deadstock & BAU', 'recycle', 'Berapa deadstock yang sudah terpakai atau dipindah, dan laporan BAU per bulan']]],
  ['Bantuan', [
    ['regulasi', 'Panduan & Aturan', 'book', 'Aturan Pedoman/TKO dan cara web ini menghitung'],
    ['data', 'Data SAP', 'db', 'File SAP yang dibaca web ini'],
    ['pengaturan', 'Pengaturan', 'gear', 'Plant, zona, kurs, dan parameter MRP'],
  ]],
];
const ROUTES = Object.fromEntries(MENU.flatMap(([, items]) => items.map((i) => [i[0], i])));
const DEFAULT_MRP_PLANTS = ['W101', 'W102', 'W802', 'W803'];
const DEFAULT_ZONA = Object.assign({ W101: 'Zona 1', W102: 'Zona 1', W802: 'Zona 1', W803: 'Zona 1', W105: 'Zona 4', W106: 'Zona 4', W801: 'Zona 4', W809: 'Zona 4', W811: 'Zona 4' },
  Object.fromEntries(Object.entries(Master.PHE_PLANT).map(([p, [, , z]]) => [p, z])));
const ZONA_LIST = ['Zona 1', 'Zona 4', 'Lainnya'];
const zonaOf = (p) => { const z = (S.set.zona || {})[p]; return (ZONA_LIST.includes(z) && z) || DEFAULT_ZONA[p] || 'Lainnya'; };
const ZONA_COLOR = { 'Zona 1': 'var(--z1)', 'Zona 4': 'var(--z4)', Lainnya: 'var(--z0)' };
const PLANT_NAME = Object.assign({ W101: 'Rantau', W102: 'Pangkalan Susu', W802: 'Jambi', W803: 'Lirik', W105: 'Prabumulih', W106: 'Pendopo', W801: 'Limau', W809: 'Adera', W811: 'Ramba' },
  Object.fromEntries(Object.entries(Master.PHE_PLANT).map(([p, [n]]) => [p, n])));
const METHOD = { tko: 'Metode TKO / Pedoman (disarankan)', excel: 'Metode Excel lama (untuk validasi)' };
const TKO_FIELDS = [['amuMonths', 'AMU dari berapa bulan terakhir', 'bln'], ['nonContractLT', 'Tambahan lead time pengadaan bila tanpa kontrak', 'bln'], ['roqMonths', 'Reorder quantity (Max = ROP + n × AMU)', 'bln'], ['ssCapMonths', 'Batas safety stock maintenance/slow', 'bln × AMU'], ['chemSSMonths', 'Safety stock chemical/catalyst', 'bln × AMU'], ['chemP', 'Periode review chemical (P)', 'bln'], ['excessGeneral', 'Batas berlebih (umum)', 'bln'], ['excessChem', 'Batas berlebih (chemical)', 'bln']];
const BASIS = { hist: 'Histori saja (sama dengan Excel)', max: 'Terbesar antara histori dan RKM', 'rkm-new': 'RKM hanya untuk item tanpa histori' };

let S = null; // sesi
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 2) => (typeof n === 'number' && isFinite(n) ? n.toLocaleString('id-ID', { maximumFractionDigits: d }) : '-');
const rp = (n) => (n >= 1e9 ? fmt(n / 1e9, 2) + ' M' : n >= 1e6 ? fmt(n / 1e6, 1) + ' jt' : fmt(n, 0));
const plantLabel = (p) => (PLANT_NAME[p] ? `${p} ${PLANT_NAME[p]}` : p || '-');
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const tick = () => new Promise((r) => setTimeout(r, 30));

// ---------- Login ----------
// Sesi disimpan per tab (sessionStorage): refresh tidak perlu login lagi, tutup tab = keluar.
const SESS = 'mimSession';
async function startSession(user, role, key) {
  const data = await Vault.decryptJSON(key, await (await fetch('data/data.enc.json', { cache: 'no-store' })).json());
  S = { role, data, user, mb52: null, mrpWB: null, rkmFiles: [], mrpRes: null, rkmMatched: [], mrp: null,
    mrpPlants: new Set(store.get('mrpPlants') || DEFAULT_MRP_PLANTS), set: Object.assign({ basis: 'hist', lliLT: 6, method: 'tko', tko: {}, kurs: 18150, zona: {}, wkCur: { PEP: 'IDR', PHE: 'USD' }, pheLT: 3 }, store.get('settings') || {}), mrpWK: store.get('mrpWK') || 'PEP', rkmTab: 'vs', src: {}, raw: {}, dash: { cur: 'IDR', wh: new Set(), zona: new Set(), wk: new Set() }, cariView: store.get('cariView') || 'matriks', cariWK: store.get('cariWK') || 'all', kView: store.get('kView') || 'kartu' };
  $('login').hidden = true; $('app').hidden = false;
  $('whoName').textContent = S.user; $('whoRole').textContent = role; $('avatar').textContent = S.user[0].toUpperCase();
  buildNav(); route(); initFolder();
}
$('lf').onsubmit = async (e) => {
  e.preventDefault(); $('err').textContent = ''; $('lb').disabled = true; $('lb').textContent = 'Memproses…';
  try {
    const keys = await (await fetch('data/keys.json', { cache: 'no-store' })).json();
    const user = $('u').value.trim(), entry = keys[user.toLowerCase()];
    if (!entry) throw 0;
    const { role, key, raw } = await Vault.login(entry, $('p').value);
    await startSession(user, role, key);
    try { sessionStorage.setItem(SESS, JSON.stringify({ user, role, raw })); } catch {}
    $('p').value = '';
  } catch { $('err').textContent = 'Username atau password salah.'; }
  $('lb').disabled = false; $('lb').textContent = 'Masuk';
};
window.addEventListener('load', async () => { // pulihkan sesi saat halaman di-refresh (setelah semua script siap)
  let s; try { s = JSON.parse(sessionStorage.getItem(SESS)); } catch {}
  if (!s || !s.raw) return;
  try { await startSession(s.user, s.role, await Vault.importRaw(s.raw)); } catch { sessionStorage.removeItem(SESS); }
});
$('out').onclick = () => { sessionStorage.removeItem(SESS); location.reload(); };
$('menuBtn').onclick = () => $('sidebar').classList.toggle('open');
const setSide = (c) => { $('app').classList.toggle('collapsed', c); const t = c ? 'Tampilkan menu' : 'Sembunyikan menu'; $('collapse').title = t; $('collapse').setAttribute('aria-label', t); };
$('collapse').onclick = () => { const c = !$('app').classList.contains('collapsed'); setSide(c); store.set('sideCollapsed', c); };
setSide(!!store.get('sideCollapsed'));
window.addEventListener('hashchange', () => S && route());

function buildNav() {
  $('nav').innerHTML = MENU.map(([g, items]) => `<div class="nav-group">${g}</div>` +
    items.map(([k, t, ic]) => `<a href="#/${k}" data-k="${k}" title="${t}">${svg(ic)}<span>${t}</span></a>`).join('')).join('');
}
function sideData() {}
function route() {
  const k = (location.hash.match(/#\/([\w-]+)/) || [, 'beranda'])[1];
  const r = ROUTES[k] || ROUTES.beranda;
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.k === r[0]));
  $('pageTitle').textContent = r[1]; $('pageSub').textContent = r[3] || ''; $('pageActions').innerHTML = ''; document.title = r[1] + ' · MIM Inventory Analyst';
  $('sidebar').classList.remove('open'); UI.closePop(); UI.closeDrawer();
  (PAGES[r[0]] || soon)(r);
  mountTables();
}

// ---------- Hitung ulang semua (MB52 + MRP + RKM + pengaturan) ----------
// MRP per WK: PEP dari file MRP; PHE dihitung dari MB52 + MB51 client 180 (sementara, sampai file MRP PHE dibuat)
function recompute() {
  S.ver = (S.ver || 0) + 1;
  // stok MRP = unrestricted ZNORMAL (valuation type lain dan in transit tidak dihitung)
  const stockMap = S.mb52 ? new Map(S.mb52.items.map((i) => [i.material + '|' + i.plant, i.sohNormal != null ? i.sohNormal : i.soh])) : null;
  const pickOf = (wk) => (S.me3n ? (S.me3n.pickWK && S.me3n.pickWK[wk]) || new Map() : null);
  const common = { stockMap, tko: S.set.tko, ospoMap: S.me2n ? S.me2n.ospo : null, mb25Map: S.mb25 ? S.mb25.open : null, chemFn: Master.isChemMG };
  const res = new Map(); S.rkmMatched = []; S.mrpWB_PHE = null;
  if (S.mrpWB) {
    const o = Object.assign({}, common, { method: S.set.method, contractPick: pickOf('PEP') });
    const base = MRP.run(S.mrpWB, o);
    S.rkmMatched = RKM.match(S.rkmFiles, base, S.mrpWB);
    MRP.run(S.mrpWB, Object.assign({}, o, { rkmMap: RKM.totals(S.rkmMatched), basis: S.set.basis })).forEach((v, k) => res.set(k, v));
  }
  const pheStock = S.raw.mb52 && S.raw.mb52.PHE;
  if (pheStock) {
    const wb = (S.mrpWB_PHE = MRP.fromMoves({ items: pheStock.items, moves: (S.raw.mb51 && S.raw.mb51.PHE && S.raw.mb51.PHE.moves) || [], ltMaster: S.mrpWB ? S.mrpWB.lt : null,
      ltDefault: S.set.pheLT || 3, isUsage: Master.isMrpUsage, wk: 'PHE' }));
    const tko = Object.assign({}, S.set.tko, { amuMonths: Math.max(1, wb.monthLabels.length), amuDivisor: wb.monthsSpan });
    MRP.run(wb, Object.assign({}, common, { method: 'tko', tko, contractPick: pickOf('PHE') })).forEach((v, k) => res.set(k, v));
    // plant PHE otomatis dipantau MRP saat pertama kali muncul
    if (!store.get('mrpPlantsPHE')) { pheStock.items.forEach((i) => S.mrpPlants.add(i.plant)); store.set('mrpPlants', [...S.mrpPlants]); store.set('mrpPlantsPHE', true); }
  }
  if (!res.size) { S.mrpRes = null; S.mrp = null; return; }
  // info stok lain (tidak dihitung MRP, tetap ditampilkan): in transit dan valuation type selain ZNORMAL
  if (S.mb52) { const im = new Map(S.mb52.items.map((i) => [i.material + '|' + i.plant, i]));
    res.forEach((r, k) => { const i = im.get(k); r.transit = i ? i.transit || 0 : 0; r.stockOther = i ? i.sohOther || 0 : 0;
      r.otherVal = i ? Object.entries(i.byVal || {}).filter(([v, q]) => q && v !== 'ZNORMAL' && v !== '(tanpa val. type)').map(([v, q]) => v + ' ' + fmt(q)).join(', ') : ''; }); }
  S.mrpRes = res;
  const map = new Map();
  for (const r of S.mrpRes.values()) map.set(r.plant + '|' + r.material, { min: r.min2 || 0, max: r.max2 || 0, aging: r.aging, toOrder: r.toOrder });
  S.mrp = { map, plants: [...new Set([...S.mrpRes.values()].map((r) => r.plant))].sort() };
  S.ver = (S.ver || 0) + 1;
}
function activeItems() {
  if (S.mb52) return Parser.merge(S.mb52.items, S.mrp ? S.mrp.map : null, S.mrpPlants);
  if (S.mrpRes) return Parser.merge([...S.mrpRes.values()].map((r) => ({ plant: r.plant, material: r.material, desc: r.desc, uom: r.uom, soh: r.stock, value: 0, price: 0, transit: 0, locs: [] })), S.mrp.map, S.mrpPlants);
  return [];
}

// Switch MRP per WK (client 100 = WK PEP, 180 = WK PHE)
const mrpWKs = () => { const w = new Set(S.mrpRes ? [...S.mrpRes.values()].map((r) => r.wk) : []); return WK_ORDER.filter((x) => w.has(x)); };
function mrpSwitch() {
  const ws = mrpWKs(); if (!ws.includes(S.mrpWK)) S.mrpWK = ws[0] || 'PEP';
  if (ws.length < 2) return;
  $('pageActions').insertAdjacentHTML('afterbegin', '<span id="mrpWK"></span>');
  UI.seg($('mrpWK'), ws.map((w) => [w, `WK ${w} (${w === 'PEP' ? '100' : '180'})`]), S.mrpWK, (v) => { S.mrpWK = v; store.set('mrpWK', v); route(); });
}
const mrpRows = () => (S.mrpRes ? [...S.mrpRes.values()].filter((r) => r.wk === S.mrpWK && S.mrpPlants.has(r.plant)) : []);
const mrpNote = () => { if (S.mrpWK !== 'PHE' || !S.mrpWB_PHE) return ''; const w = S.mrpWB_PHE;
  return `<div class="banner warn"><span>MRP WK PHE sementara dihitung dari MB52 + MB51 client 180 (histori ${esc(w.window[0])} s.d. ${esc(w.window[1])}, ${fmt(w.monthsSpan, 1)} bulan). ${w.histShort ? 'Histori masih pendek, jadi AMU dan aging belum bisa diandalkan. ' : ''}Lead time dari master MRP PEP kalau kode materialnya sama, selain itu ${fmt(S.set.pheLT || 3, 1)} bulan (atur di <a href="#/pengaturan">Pengaturan</a>).</span></div>`; };

// ---------- Muat file (dua client SAP: 100 = WK PEP, 180 = WK PHE) ----------
const CLIENT_WK = { '100': 'PEP', '180': 'PHE' };
const clientOf = (name) => { const m = String(name).match(/_(\d{3})_/); return m ? m[1] : ''; };
const wkOfFile = (name) => CLIENT_WK[clientOf(name)] || 'PEP';
const WK_ORDER = ['PEP', 'PHE'];
const byWK = (obj) => WK_ORDER.filter((w) => obj[w]).map((w) => [w, obj[w]]).concat(Object.entries(obj).filter(([w]) => !WK_ORDER.includes(w)));
// gabung hasil per WK menjadi satu struktur yang dipakai seluruh web
const MERGE = {
  mb52(parts) {
    const items = []; parts.forEach(([wk, p]) => p.items.forEach((i) => { i.wk = wk; items.push(i); }));
    return { items, skipped: parts.reduce((a, [, p]) => a + p.skipped, 0), plants: [...new Set(items.map((i) => i.plant))].sort() };
  },
  me3n(parts) {
    const docs = new Map(), items = [], pick = new Map();
    const pickWK = {};
    parts.forEach(([wk, p]) => { p.docs.forEach((d, k) => { d.wk = wk; docs.set(k, d); }); p.items.forEach((i) => { i.wk = wk; i.kel = Master.kelompok(i.desc); items.push(i); });
      pickWK[wk] = new Map(); p.pick.forEach((v, k) => { const x = Object.assign({ wk }, v); pickWK[wk].set(k, x); if (!pick.has(k)) pick.set(k, x); }); });
    // kelompok barang per kontrak = kelompok dengan item terbanyak
    const byDoc = new Map(); items.forEach((i) => { const m = byDoc.get(i.doc) || byDoc.set(i.doc, new Map()).get(i.doc); m.set(i.kel, (m.get(i.kel) || 0) + 1); });
    docs.forEach((d, k) => { const m = byDoc.get(k) || new Map(); const ks = [...m].sort((a, b) => (a[0] === 'Lainnya') - (b[0] === 'Lainnya') || b[1] - a[1]).map(([x]) => x); d.kel = ks[0] || 'Lainnya'; d.kels = ks; });
    return { docs, items, pick, pickWK };
  },
  me2n(parts) {
    const lines = [], ospo = new Map(), lastPrice = new Map();
    parts.forEach(([wk, p]) => {
      p.lines.forEach((l) => { l.wk = wk; lines.push(l); });
      p.ospo.forEach((v, k) => ospo.set(k, (ospo.get(k) || 0) + v));
      p.lastPrice.forEach((v, k) => { const o = lastPrice.get(k); if (!o || (v.date && o.date && v.date > o.date)) lastPrice.set(k, v); });
    });
    return { lines, ospo, lastPrice };
  },
  mb51(parts) {
    const moves = [], gr = new Map(); let lo = null, hi = null;
    parts.forEach(([wk, p]) => {
      p.moves.forEach((m) => { m.wk = wk; moves.push(m); });
      p.gr.forEach((g, k) => { const o = gr.get(k); if (!o) gr.set(k, g); else { o.inQty += g.inQty; o.relQty += g.relQty; o.docs.push(...g.docs); } });
      if (p.range) { if (!lo || p.range[0] < lo) lo = p.range[0]; if (!hi || p.range[1] > hi) hi = p.range[1]; }
    });
    return { moves, gr, range: lo ? [lo, hi] : null };
  },
  mb25(parts) {
    const lines = [], open = new Map();
    parts.forEach(([wk, p]) => { p.lines.forEach((l) => { l.wk = wk; lines.push(l); }); p.open.forEach((v, k) => open.set(k, (open.get(k) || 0) + v)); });
    return { lines, open };
  },
};
const PARSE = { mb52: (b) => Parser.parseMB52(XLSX, b), me3n: (b) => Contract.parseME3N(XLSX, b), me2n: (b) => Contract.parseME2N(XLSX, b), mb51: (b) => Trace.parseMB51(XLSX, b), mb25: (b) => Trace.parseMB25(XLSX, b) };
async function loadSAP(k, file) {
  const wk = wkOfFile(file.name);
  S.raw[k] = S.raw[k] || {};
  if (k === 'mb51') { // MB51 boleh banyak file per client (upload berkala): digabung, baris dobel dibuang
    const F = (S.mb51Files = S.mb51Files || {}); F[wk] = F[wk] || new Map(); F[wk].set(file.name, PARSE.mb51(await file.arrayBuffer()).moves);
    S.raw.mb51[wk] = Trace.mergeMB51([...F[wk].values()]);
  } else S.raw[k][wk] = PARSE[k](await file.arrayBuffer());
  S[k] = MERGE[k](byWK(S.raw[k]));
  srcMark(k, file, wk);
  if (k === 'mb52') { S.plantWK = new Map(); S.mb52.items.forEach((i) => S.plantWK.set(i.plant, i.wk)); }
}
const loadMB52 = (f) => loadSAP('mb52', f), loadME3N = (f) => loadSAP('me3n', f), loadME2N = (f) => loadSAP('me2n', f), loadMB51 = (f) => loadSAP('mb51', f), loadMB25 = (f) => loadSAP('mb25', f);
async function loadDS(file) { S.ds = DS.parseDS(XLSX, await file.arrayBuffer()); S.ver = (S.ver || 0) + 1; srcMark('ds', file); }
async function loadMRP(file) { S.mrpWB = MRP.parseWorkbook(XLSX, await file.arrayBuffer()); S.mrpName = file.name; srcMark('mrp', file, 'PEP'); }
function srcMark(k, file, wk = '') { S.src[k] = S.src[k] || {}; const key = k === 'rkm' ? file.name : k === 'mb51' ? wk + '|' + file.name : wk || '-'; if (k === 'rkm') wk = file.name; S.src[k][key] = { name: file.name, at: new Date(), wk }; }
async function loadRKM(file, name) {
  const f = RKM.parseFile(XLSX, await file.arrayBuffer(), name || file.name);
  const saved = (store.get('rkmPlant') || {})[f.fileName]; if (saved) f.plant = saved;
  S.rkmFiles = S.rkmFiles.filter((x) => x.fileName !== f.fileName).concat(f); srcMark('rkm', file);
}
const wkOfPlant = (p) => (S.plantWK && S.plantWK.get(p)) || (Master.PHE_PLANT[p] ? 'PHE' : DEFAULT_ZONA[p] ? 'PEP' : '');
const stockCur = (p) => ((S.set.wkCur || {})[wkOfPlant(p)] || 'IDR');

// ---------- Folder lokal ----------
function banner(html, cls = '') { const b = $('banner'); b.className = 'banner ' + cls; b.innerHTML = html; b.hidden = !html; }
async function initFolder() {
  if (!Folder.supported()) return;
  const h = await Folder.loadHandle(); if (!h) return;
  if (await Folder.permission(h, false)) return loadFolder(h);
  banner(`Folder data <b>${esc(h.name)}</b> tersimpan. Browser perlu izin untuk membacanya. <button class="btn primary" id="fGo">Muat data</button>`);
  $('fGo').onclick = async () => { if (await Folder.permission(h, true)) loadFolder(h); };
}
async function refreshData() {
  const h = Folder.supported() ? await Folder.loadHandle() : null;
  if (!h) { banner('Belum ada folder data. Pilih folder dulu di halaman Data SAP.', 'warn'); location.hash = '#/data'; return; }
  if (await Folder.permission(h, true)) await loadFolder(h);
}
async function loadFolder(h) {
  banner(`Membaca folder <b>${esc(h.name)}</b>…`); await tick(); S.folderName = h.name;
  const log = [];
  try {
    const c = Folder.classify(await Folder.listExcel(h));
    S.raw = {}; S.src = {}; S.mb51Files = {}; S.ds = null; ['mb52', 'me3n', 'me2n', 'mb51', 'mb25'].forEach((k) => (S[k] = null));
    for (const k of ['mb52', 'me3n', 'me2n', 'mb51', 'mb25']) for (const f of c[k] || []) { await tick(); await loadSAP(k, f.file); log.push(f.name); }
    if (c.mrp) { await tick(); await loadMRP(c.mrp.file); log.push(c.mrp.name); }
    if (c.ds) { await tick(); try { await loadDS(c.ds.file); log.push(c.ds.name); } catch (e) { log.push('Gagal: ' + c.ds.name + ' (' + e.message + ')'); } }
    if (c.regulasi) { S.regulasi = { name: c.regulasi.name, text: await c.regulasi.file.text() }; log.push(c.regulasi.name); }
    for (const r of c.rkm) { try { await loadRKM(r.file, r.name); log.push(r.name); } catch (e) { log.push('Gagal: ' + r.name + ' (' + e.message + ')'); } }
    recompute(); route();
    S.folderLoadedAt = new Date();
    banner(log.length ? `Data dimuat dari folder <b>${esc(h.name)}</b> (${log.length} file). <a href="#/data">Lihat detail</a> <button class="icon-btn" id="bx" aria-label="Tutup">${UI.I.x}</button>` : `Folder <b>${esc(h.name)}</b> tidak berisi file yang dikenali. Nama file harus memuat MB52, MRP, ME3N, ME2N, MB51, MB25, atau RKM. <button class="icon-btn" id="bx" aria-label="Tutup">${UI.I.x}</button>`, log.length ? 'ok' : 'warn');
  } catch (e) { banner('Gagal membaca folder: ' + esc(e.message) + ` <button class="icon-btn" id="bx" aria-label="Tutup">${UI.I.x}</button>`, 'bad'); }
  const bx = $('bx'); if (bx) bx.onclick = () => banner('');
}

// ---------- Util tabel ----------
const expand = (q) => q.toLowerCase().split(/\s+/).filter(Boolean).map((x) => S.data.synonyms.find((s) => s.includes(x)) || [x]);
const hit = (text, groups) => groups.every((g) => g.some((t) => text.toLowerCase().includes(t)));
let timer; const debounce = (fn) => { clearTimeout(timer); timer = setTimeout(fn, 200); };
const SRC_LABEL = { ds: 'DS', mb52: 'MB52', mrp: 'MRP', me3n: 'ME3N', me2n: 'ME2N', mb51: 'MB51', mb25: 'MB25', rkm: 'RKM' };
const srcFiles = (k) => (S.src[k] ? Object.values(S.src[k]) : []);
const srcLine = (...keys) => { const t = keys.flatMap((k) => srcFiles(k).map((f) => `${SRC_LABEL[k]}${f.wk && k !== 'rkm' ? ' ' + f.wk : ''} ${f.name}`)); return t.length ? `<p class="source">Sumber: ${esc(t.join('; '))}</p>` : ''; };
const pill = (t, cls) => `<span class="pill ${cls}">${esc(t)}</span>`;
const agingPill = (a) => pill(a || '-', a === 'FS' ? 'ok' : a === 'MD' ? 'info' : a === 'SP' ? 'warn' : 'mute');
// cols lama: [judul, fn(row)->html, kelas ('num'), fn(row)->nilai mentah, filter?]
const HIDE = {};
Object.assign(HIDE, {
  'rkmTab:vs': ['Basis', 'Cocok via', 'OS PO/RO'], 'rkmTab:noMrp': ['Remarks', 'Unit'], 'rkmTab:order': ['MB25', 'RKM 2027', 'Kelas'], 'rkmTab:cmp': ['Kelas TKO', 'Catatan'],
  'kTab:list': ['Terpakai', 'Item', 'PIC'], 'kTab:renew': ['Terpakai', 'Item', 'Target'], 'kTab:open': ['Jenis'], 'kTab:late': ['Jenis'],
  'oTab:ro': ['Mata uang', 'PIC', 'Sisa hari', 'UoM', 'Harga kontrak'], 'oTab:pr': ['Mata uang', 'Kelas', 'Sumber harga'], 'oTab:kandidat': ['Sumber harga'], 'eTab:resv': ['Mvt'],
});
function convCols(cols, hide = []) {
  return cols.map((c) => ({ label: c[0], html: c[1], num: c[2] === 'num', get: c[3] || ((r) => UI.strip(c[1](r))), filter: c[2] !== 'num' && c[4] !== false, hide: hide.includes(c[0]), wide: /^(Deskripsi|Keterangan|Remarks|Catatan)$/.test(c[0]), w: /^(Catatan)$/.test(c[0]) ? 2 : /^(Vendor|GR gudang|Status manual|Kategori|Kelas TKO|Lapangan|Penerima)/.test(c[0]) ? 1.6 : undefined }));
}
const DTQ = [];
function table(rows, cols, opt = {}) { DTQ.push({ rows, cols, opt }); return `<div class="dt-mount" data-dt="${DTQ.length - 1}"></div>`; }
function mountTables(rootEl = document) {
  rootEl.querySelectorAll('.dt-mount').forEach((el) => {
    const c = DTQ[+el.dataset.dt]; el.classList.remove('dt-mount'); if (!c) return;
    UI.table(el, { id: c.opt.id || 'tbl-' + (location.hash || '#') + '-' + el.dataset.dt, rows: c.rows, cols: convCols(c.cols, c.opt.hide || []), name: c.opt.name, onRender: c.opt.onRender, rowKey: c.opt.rowKey, onRow: c.opt.onRow,
      match: c.opt.text ? (r, q) => hit(c.opt.text(r), expand(q)) : undefined, empty: c.opt.empty });
  });
  DTQ.length = 0;
}
function plainTable(rows, cols) {
  if (!rows.length) return '<p class="muted small">Tidak ada data.</p>';
  return `<div class="plain-wrap"><table class="plain"><tr>${cols.map((c) => `<th class="${c[2] || ''}">${esc(c[0])}</th>`).join('')}</tr>` +
    rows.map((r) => `<tr>${cols.map((c) => `<td class="${c[2] || ''}">${c[1](r)}</td>`).join('')}</tr>`).join('') + '</table></div>';
}

// ---------- Halaman ----------
const PAGES = {
  beranda() {
    if (!S.mb52 && !S.mrpRes && !S.me2n) {
      $('view').innerHTML = `<div class="panel empty"><h3>Belum ada data</h3><p>Pilih folder yang berisi file download SAP (MB52, MRP, ME3N, ME2N, MB51, MB25) dan RKM. Dashboard akan terisi otomatis.</p><a class="btn primary" href="#/data">Buka Data SAP</a></div>`;
      return;
    }
    const kurs = S.set.kurs || 18150, cur = S.dash.cur, today = new Date();
    const conv = (idr) => (cur === 'USD' ? idr / kurs : idr);
    const f1 = (x) => x.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const cmoney = (idr) => { const v = conv(idr), p = cur === 'USD' ? 'USD ' : 'IDR ';
      return v >= 1e12 ? p + f1(v / 1e12) + ' T' : v >= 1e9 ? p + f1(v / 1e9) + ' M' : v >= 1e6 ? p + f1(v / 1e6) + ' jt' : v >= 1e3 ? p + f1(v / 1e3) + ' rb' : p + fmt(v, 0); };
    const idrOf = (i) => toIDR(i.value, stockCur(i.plant));
    const toIDR = (v, c) => (c === 'USD' ? v * kurs : v || 0);
    const items = (S.mb52 ? S.mb52.items : []).filter((i) => !S.dash.wk.size || S.dash.wk.has(i.wk));
    const perWH = new Map();
    items.forEach((i) => { const w = perWH.get(i.plant) || { plant: i.plant, value: 0, n: 0 }; w.value += idrOf(i); if (i.soh > 0) w.n++; perWH.set(i.plant, w); });
    const allWH = [...perWH.keys()].sort(), zonas = [...new Set(allWH.map(zonaOf))].sort((a, b) => (ZONA_LIST.indexOf(a) + 99) % 99 - (ZONA_LIST.indexOf(b) + 99) % 99 || a.localeCompare(b));
    const visWH = allWH.filter((p) => !S.dash.zona.size || S.dash.zona.has(zonaOf(p)));
    const selWH = new Set(S.dash.wh.size ? visWH.filter((p) => S.dash.wh.has(p)) : visWH);
    const inSel = (p) => selWH.has(p);
    const selTxt = S.dash.wh.size ? `${selWH.size} warehouse dipilih` : S.dash.zona.size ? [...S.dash.zona].join(', ') : 'Semua warehouse';

    // ABC & top 10 (dalam warehouse terpilih)
    const pool = items.filter((i) => inSel(i.plant) && i.value > 0).sort((a, b) => idrOf(b) - idrOf(a));
    const tot = pool.reduce((a, i) => a + idrOf(i), 0); let cum = 0;
    const abc = { A: { n: 0, v: 0 }, B: { n: 0, v: 0 }, C: { n: 0, v: 0 } };
    pool.forEach((i) => { cum += idrOf(i); const k = cum / tot <= 0.8 || abc.A.n === 0 ? 'A' : cum / tot <= 0.95 ? 'B' : 'C'; i._abc = k; abc[k].n++; abc[k].v += idrOf(i); });
    const pct = (a, b) => (b ? fmt((a / b) * 100, 1) + '%' : '-');

    // Zona
    const zrows = zonas.map((z) => { const w = allWH.filter((p) => zonaOf(p) === z); return { z, wh: w.length, n: w.reduce((a, p) => a + perWH.get(p).n, 0), v: w.reduce((a, p) => a + perWH.get(p).value, 0) }; });
    const ztot = zrows.reduce((a, r) => a + r.v, 0);

    const flow = {};
    // Expediting
    let exHTML = '<p class="muted small">Tambahkan ME2N untuk melihat progres PO/RO.</p>';
    if (S.me2n) {
      const ex = Trace.expediting(S.me2n, S.mb51, today, { plants: selWH, stockOnly: store.get('expStockOnly') ?? true }).filter((e) => e.open > 0);
      const c = (st) => ex.filter((e) => e.status === st).length;
      const late = ex.filter((e) => e.status === 'Terlambat').sort((a, b) => b.lateDays - a.lateDays).slice(0, 5);
      flow.po = ex.length; flow.late = c('Terlambat');
      exHTML = `<div class="kv"><div><span>PO/RO aktif</span><b>${fmt(ex.length, 0)}</b></div><div><span>Dikirim</span><b>${fmt(c('Dalam pengiriman') + c('Diterima sebagian'), 0)}</b></div>
        <div><span>Terlambat</span><b class="${late.length ? 'neg' : ''}">${fmt(c('Terlambat'), 0)}</b></div><div><span>Sisa kirim</span><b>${cmoney(ex.reduce((a, e) => a + toIDR(e.openValue, e.currency), 0))}</b></div></div>
        <h4 class="sub-h">Paling lama terlambat</h4>${plainTable(late, [['PO/RO', (e) => `<a class="mono" href="#/lacak" data-q="${esc(e.doc)}">${esc(e.doc)}</a>`], ['Deskripsi', (e) => esc(e.desc)], ['Lapangan', (e) => esc(PLANT_NAME[e.plant] || e.plant)], ['Hari', (e) => fmt(e.lateDays, 0), 'num']])}`;
    }
    // To order
    let toHTML = '<p class="muted small">Tambahkan file MRP untuk menghitung material yang perlu dipesan.</p>';
    if (S.mrpRes) {
      const mbPrice = new Map(items.filter((i) => i.soh > 0).map((i) => [i.material + '|' + i.plant, toIDR(i.price, stockCur(i.plant))]));
      const ord = [...S.mrpRes.values()].filter((r) => S.mrpPlants.has(r.plant) && (!S.mb52 || inSel(r.plant)) && r.toOrder > 0)
        .map((r) => ({ r, v: r.contract ? r.toOrder * toIDR(r.contract.price, r.contract.currency) : r.toOrder * (mbPrice.get(r.key) || 0) })).sort((a, b) => b.v - a.v);
      const ro = ord.filter((o) => o.r.contract), pr = ord.filter((o) => !o.r.contract);
      flow.ord = ord.length; flow.ro = ro.length; flow.pr = pr.length;
      toHTML = `<div class="kv"><div><span>Perlu order</span><b>${fmt(ord.length, 0)}</b></div><div><span>Lewat RO</span><b>${fmt(ro.length, 0)}</b></div>
        <div><span>Lewat PR + OE</span><b>${fmt(pr.length, 0)}</b></div><div><span>Estimasi nilai</span><b>${cmoney(ord.reduce((a, o) => a + o.v, 0))}</b></div></div>
        <h4 class="sub-h">Nilai terbesar</h4>${plainTable(ord.slice(0, 5), [['Material', (o) => `<a class="mono mlink" href="#" data-mat="${esc(o.r.material)}">${esc(o.r.material)}</a>`], ['Deskripsi', (o) => esc(o.r.desc)], ['Plant', (o) => esc(o.r.plant)], ['Qty', (o) => fmt(o.r.toOrder), 'num'], ['Estimasi', (o) => (o.v ? cmoney(o.v) : '-'), 'num']])}`;
    }

    $('view').innerHTML = `<div class="filters dash-f"><span id="dCur"></span><span id="dWK"></span><span id="dZona"></span><span id="dWH"></span>
        ${S.dash.wh.size || S.dash.zona.size || S.dash.wk.size ? '<button class="btn ghost" id="dReset">Hapus pilihan</button>' : ''}
        <span class="source dash-src">Nilai dikonversi ke ${cur} dengan kurs IDR ${fmt(kurs, 0)}/USD</span></div>
      ${flowStrip(flow, cmoney(items.filter((i) => inSel(i.plant)).reduce((a, i) => a + idrOf(i), 0)), new Set(items.filter((i) => inSel(i.plant) && i.soh > 0).map((i) => i.material)).size)}
      <div class="grid-3">
        <section class="panel"><div class="panel-h"><h2>Nilai stok per warehouse</h2><span class="sub">Klik batang untuk memilih satu atau beberapa warehouse</span></div><div id="dBars"></div></section>
        <section class="panel"><div class="panel-h"><h2>Per zona</h2></div>
          ${plainTable(zrows, [['Zona', (r) => `<span class="nowrap"><span class="zdot" style="background:${ZONA_COLOR[r.z] || ZONA_COLOR.Lainnya}"></span>${esc(r.z)}</span>`], ['WH', (r) => fmt(r.wh, 0), 'num'], ['Item', (r) => fmt(r.n, 0), 'num'], ['Nilai', (r) => cmoney(r.v), 'num'], ['Porsi', (r) => pct(r.v, ztot), 'num']])}
          <div class="panel-h" style="margin-top:20px"><h2>Pantau pesanan</h2><span class="sub">${esc(selTxt)}</span><span class="right"><a href="#/expediting">Buka Pantau Pesanan</a></span></div>${exHTML}
        </section>
      </div>
      <section class="panel" id="abcPanel" data-fold="abc"></section>
      <section class="panel" data-fold="top"><div class="panel-h"><h2>Material terbesar</h2><span class="sub">${esc(selTxt)}</span><span class="right"><a href="#/cari">Buka Cari Material</a></span></div>
        <div class="filters top-f"><span id="tN"></span><span id="tBy"></span><span id="tAgg"></span></div><div id="tTop"></div></section>
      <section class="panel"><div class="panel-h"><h2>Material perlu order</h2><span class="sub">${esc(selTxt)}</span><span class="right"><a href="#/order">Buka Perlu Dipesan</a></span></div>${toHTML}</section>`;
    UI.seg($('dCur'), [['IDR', 'IDR'], ['USD', 'USD']], cur, (v) => { S.dash.cur = v; route(); });
    UI.multi($('dWK'), { label: 'WK', options: [...new Set((S.mb52 ? S.mb52.items : []).map((i) => i.wk))].sort().map((w) => ({ value: w, label: 'WK ' + w })), selected: S.dash.wk, onChange: () => { clearTimeout(window._dT); window._dT = setTimeout(route, 500); } });
    UI.multi($('dZona'), { label: 'Zona', options: zonas.map((z) => ({ value: z, label: z })), selected: S.dash.zona, onChange: () => { clearTimeout(window._dT); window._dT = setTimeout(route, 500); } });
    UI.multi($('dWH'), { label: 'Warehouse', options: visWH.map((p) => ({ value: p, label: plantLabel(p) })), selected: S.dash.wh, onChange: () => { clearTimeout(window._dT); window._dT = setTimeout(route, 500); } });
    if ($('dReset')) $('dReset').onclick = () => { S.dash.wh.clear(); S.dash.zona.clear(); S.dash.wk.clear(); route(); };
    if (items.length) UI.bars($('dBars'), {
      items: visWH.map((p) => ({ key: p, label: p, sub: PLANT_NAME[p] || '', value: conv(perWH.get(p).value), series: zonaOf(p), tip: `${zonaOf(p)} · ${fmt(perWH.get(p).n, 0)} item berstok` })).sort((a, b) => b.value - a.value),
      series: zonas.map((z) => ({ key: z, label: z, color: ZONA_COLOR[z] || ZONA_COLOR.Lainnya })), selected: S.dash.wh,
      fmt: (v) => cmoney(cur === 'USD' ? v * kurs : v), aria: 'Nilai stok per warehouse',
      onToggle: (k) => { S.dash.wh.has(k) ? S.dash.wh.delete(k) : S.dash.wh.add(k); route(); },
    }); else $('dBars').innerHTML = '<p class="muted small">Tambahkan MB52 untuk melihat nilai stok.</p>';
    document.querySelectorAll('a[data-q]').forEach((a) => (a.onclick = () => sessionStorage.setItem('lacakQ', a.dataset.q)));
    drawTop(pool, idrOf, cmoney);
    drawABC(pool, idrOf, cmoney, selTxt);
  },

  cari() {
    if (!S.mb52) { $('view').innerHTML = needFile('file MB52', 'Cari Material membaca stok dari MB52. Min/Max diambil dari mesin MRP kalau file MRP dimuat.'); return; }
    const items = activeItems();
    // Unrestricted = ZNORMAL (dipakai MRP); valuation type lain & in transit dipisah
    const nrm = (m) => (m.sohNormal != null ? m.sohNormal : m.soh), oth = (m) => (m.sohNormal != null ? m.soh - m.sohNormal : 0);
    const valList = (m, otherOnly) => Object.entries(m.byVal || {}).filter(([v]) => !otherOnly || (v !== 'ZNORMAL' && v !== '(tanpa val. type)')).map(([v, q]) => `${v} ${fmt(q)}`).join(', ');
    const cols = [['Plant', (m) => esc(plantLabel(m.plant)), '', (m) => plantLabel(m.plant)], ['Zona', (m) => esc(zonaOf(m.plant)), '', (m) => zonaOf(m.plant)],
      ['Material', (m) => `<a class="mono mlink" href="#" data-mat="${esc(m.material)}">${esc(m.material)}</a>`, '', (m) => m.material], ['Deskripsi', (m) => esc(m.desc), '', (m) => m.desc],
      ['Unrestricted', (m) => fmt(nrm(m)), 'num', (m) => nrm(m)],
      ['Val. type lain', (m) => (oth(m) ? `<span title="${esc(valList(m, true))}">${fmt(oth(m))}</span>` : ''), 'num', (m) => oth(m)],
      ['In transit', (m) => (m.transit ? fmt(m.transit) : ''), 'num', (m) => m.transit || 0],
      ['Val. type', (m) => esc(valList(m)), '', (m) => valList(m)], ['UoM', (m) => esc(m.uom), '', (m) => m.uom], ['Harga/unit', (m) => money(m.price, stockCur(m.plant)), 'num', (m) => m.price],
      ['Nilai', (m) => money(m.value, stockCur(m.plant)), 'num', (m) => m.value], ['WK', (m) => esc(m.wk || ''), '', (m) => m.wk || ''], ['Aging', (m) => (m.mrp && m.mrp.aging ? agingPill(m.mrp.aging) : ''), '', (m) => (m.mrp && m.mrp.aging) || ''],
      ['Min', (m) => (m.mrp ? fmt(m.mrp.min) : ''), 'num', (m) => (m.mrp ? m.mrp.min : null)], ['Max', (m) => (m.mrp ? fmt(m.mrp.max) : ''), 'num', (m) => (m.mrp ? m.mrp.max : null)],
      ['Status', (m) => pill(m.status, m.cls), '', (m) => m.status], ['Lokasi', (m) => esc(m.locs.map((l) => l.sloc + (l.batch ? '/' + l.batch : '') + ': ' + fmt(l.qty) + (l.transit ? ' (transit ' + fmt(l.transit) + ')' : '')).join('; ')), '', (m) => m.locs.map((l) => l.sloc).join(', ')]];
    $('view').innerHTML = srcLine('mb52', 'mrp') + table(items, cols, { id: 'cari', name: 'Cari Material', text: (m) => m.material + ' ' + m.desc + ' ' + m.plant, hide: ['Harga/unit', 'Zona', 'Lokasi', 'WK'], rowKey: (m) => m.material, onRow: (k) => openMaterial(k),
      onRender: (el) => el.querySelectorAll('a[data-q]').forEach((a) => (a.onclick = () => sessionStorage.setItem('lacakQ', a.dataset.q))) });
  },

  rkm() {
    if (!S.mrpRes) { $('view').innerHTML = needFile('file MRP', 'Mesin MRP butuh file MRP (sheet MRP dan LeadTime) untuk WK PEP, atau MB52 + MB51 client 180 untuk WK PHE. RKM opsional sebagai input.'); return; }
    mrpSwitch();
    const res = mrpRows();
    if (S.mrpWK === 'PHE') return rkmPHE(res);
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
      vs: ['RKM vs MRP', vs, [['Fungsi', (o) => esc(o.x.fungsi)], ['KIMAP', (o) => `<a class="mono mlink" href="#" data-mat="${esc(o.r.material)}">${esc(o.x.kimap || o.r.material)}</a>`], ['Deskripsi', (o) => esc(o.x.desc)],
        ['RKM 2027', (o) => fmt(o.x.total), 'num', (o) => o.x.total], ['Histori/thn', (o) => fmt(amu12(o.r)), 'num', (o) => amu12(o.r)],
        ['Selisih', (o) => { const d = o.x.total - amu12(o.r); return `<span class="${d > 0 ? 'warn' : ''}">${d > 0 ? '+' : ''}${fmt(d)}</span>`; }, 'num', (o) => o.x.total - amu12(o.r)],
        ['Aging', (o) => agingPill(o.r.aging), '', (o) => o.r.aging], ['Stok ZNORMAL', (o) => fmt(o.r.stock), 'num', (o) => o.r.stock], ['In transit', (o) => (o.r.transit ? fmt(o.r.transit) : ''), 'num', (o) => o.r.transit || 0], ['Val. type lain', (o) => (o.r.stockOther ? `<span title="${esc(o.r.otherVal)}">${fmt(o.r.stockOther)}</span>` : ''), 'num', (o) => o.r.stockOther || 0], ['OS PO/RO', (o) => fmt(o.r.ospo), 'num', (o) => o.r.ospo],
        ['Min', (o) => fmt(o.r.min2), 'num', (o) => o.r.min2], ['Max', (o) => fmt(o.r.max2), 'num', (o) => o.r.max2], ['To Order', (o) => calcA(o.r, o.r.toOrder ? pill(fmt(o.r.toOrder), 'warn') : '0'), 'num', (o) => o.r.toOrder],
        ['Basis', (o) => esc(o.r.basis)], ['Cocok via', (o) => esc(o.x.how)]], (o) => o.x.kimap + ' ' + o.x.desc + ' ' + o.x.fungsi],
      noMrp: ['RKM tanpa MRP', noMrp, [['Fungsi', (o) => esc(o.x.fungsi)], ['KIMAP', (o) => (o.x.kimap ? `<span class="mono">${esc(o.x.kimap)}</span>` : pill('tanpa KIMAP', 'low')), '', (o) => o.x.kimap],
        ['Deskripsi', (o) => esc(o.x.desc)], ['Unit', (o) => esc(o.x.unit)], ['RKM 2027', (o) => fmt(o.x.total), 'num', (o) => o.x.total],
        ['Di master LeadTime?', (o) => (o.x.master ? pill('Ada', 'ok') : pill('Tidak', 'mute')), '', (o) => (o.x.master ? 'Ada' : 'Tidak')], ['LT (bln)', (o) => (o.x.master ? fmt(o.x.master.lt) : '-'), 'num', (o) => (o.x.master ? o.x.master.lt : '')],
        ['Usulan Min', (o) => (o.sug ? fmt(o.sug.min2) : '-'), 'num', (o) => (o.sug ? o.sug.min2 : '')], ['Usulan Max', (o) => (o.sug ? fmt(o.sug.max2) : '-'), 'num', (o) => (o.sug ? o.sug.max2 : '')],
        ['Remarks', (o) => esc(o.x.remarks)]], (o) => o.x.kimap + ' ' + o.x.desc + ' ' + o.x.fungsi],
      noRkm: ['MRP tanpa RKM', noRkm, [['Plant', (r) => esc(r.plant)], ['Material', (r) => `<a class="mono mlink" href="#" data-mat="${esc(r.material)}">${esc(r.material)}</a>`], ['Deskripsi', (r) => esc(r.desc)], ['Aging', (r) => agingPill(r.aging), '', (r) => r.aging],
        ['Histori/thn', (r) => fmt(amu12(r)), 'num', amu12], ['Stok', (r) => fmt(r.stock), 'num', (r) => r.stock], ['Min', (r) => fmt(r.min2), 'num', (r) => r.min2], ['Max', (r) => fmt(r.max2), 'num', (r) => r.max2],
        ['To Order', (r) => calcA(r, fmt(r.toOrder)), 'num', (r) => r.toOrder]], (r) => r.material + ' ' + r.desc],
      lli: [`Long Lead Item (LT ≥ ${S.set.lliLT} bln)`, lli, [['Fungsi', (o) => esc(o.x.fungsi)], ['KIMAP', (o) => `<span class="mono">${esc(o.x.kimap)}</span>`], ['Deskripsi', (o) => esc(o.x.desc)],
        ['LT (bln)', (o) => fmt(o.lt), 'num', (o) => o.lt], ['RKM 2027', (o) => fmt(o.x.total), 'num', (o) => o.x.total],
        ['Butuh mulai', (o) => mLabel(2027 * 12 + o.nm.i) + (o.nm.known ? '' : ' *'), '', (o) => mLabel(2027 * 12 + o.nm.i)], ['Pesan paling lambat', (o) => `<b>${mLabel(o.due)}</b>`, '', (o) => mLabel(o.due)],
        ['Stok + PO', (o) => (o.r ? fmt(o.cover) : '-'), 'num', (o) => o.cover], ['Status', (o) => pill(o.st[0], o.st[1]), '', (o) => o.st[0]]], (o) => o.x.kimap + ' ' + o.x.desc],
      order: ['Perlu order (To Order)', orders, [['Plant', (r) => esc(r.plant)], ['Material', (r) => `<a class="mono mlink" href="#" data-mat="${esc(r.material)}">${esc(r.material)}</a>`], ['Deskripsi', (r) => esc(r.desc)], ['Aging', (r) => agingPill(r.aging), '', (r) => r.aging],
        ['Stok ZNORMAL', (r) => fmt(r.stock), 'num', (r) => r.stock], ['In transit', (r) => (r.transit ? fmt(r.transit) : ''), 'num', (r) => r.transit || 0], ['Val. type lain', (r) => (r.stockOther ? `<span title="${esc(r.otherVal)}">${fmt(r.stockOther)}</span>` : ''), 'num', (r) => r.stockOther || 0], ['OS PO/RO', (r) => fmt(r.ospo), 'num', (r) => r.ospo], ['MB25', (r) => fmt(r.mb25), 'num', (r) => r.mb25], ['Min', (r) => fmt(r.min2), 'num', (r) => r.min2], ['Max', (r) => fmt(r.max2), 'num', (r) => r.max2],
        ['To Order', (r) => calcA(r, pill(fmt(r.toOrder), 'warn')), 'num', (r) => r.toOrder], ['RKM 2027', (r) => fmt(r.rkm), 'num', (r) => r.rkm], ['Kelas', (r) => esc(r.cls || r.aging), '', (r) => r.cls || r.aging],
        ['Kontrak (OA)', (r) => (r.oa ? `<span class="mono">${esc(r.oa)}</span>` : pill('PR + OE', 'mute')), '', (r) => r.oa || 'PR + OE']], (r) => r.material + ' ' + r.desc + ' ' + r.oa],
      sehat: ['Penyehatan stok', sehat, [['Plant', (r) => esc(r.plant)], ['Material', (r) => `<a class="mono mlink" href="#" data-mat="${esc(r.material)}">${esc(r.material)}</a>`], ['Deskripsi', (r) => esc(r.desc)], ['Aging', (r) => agingPill(r.aging), '', (r) => r.aging],
        ['Stok', (r) => fmt(r.stock), 'num', (r) => r.stock], ['Max', (r) => fmt(r.max2), 'num', (r) => r.max2], ['Surplus', (r) => fmt(r.surplus), 'num', (r) => r.surplus],
        ['Cakupan (bln)', (r) => (r.cover == null ? '-' : isFinite(r.cover) ? fmt(r.cover, 1) : '∞'), 'num', (r) => (isFinite(r.cover) ? r.cover : '')],
        ['Kategori', (r) => (r.aging === 'DS' && r.stock > 0 ? pill('Kandidat dead stock', 'low') : r.berlebih ? pill('Berlebih', 'warn') : pill('Di atas Max', 'mute')), '', (r) => (r.aging === 'DS' && r.stock > 0 ? 'Kandidat dead stock' : r.berlebih ? 'Berlebih' : 'Di atas Max')]], (r) => r.material + ' ' + r.desc],
      cmp: ['Banding Excel vs TKO', cmp, [['Plant', (r) => esc(r.plant)], ['Material', (r) => `<a class="mono mlink" href="#" data-mat="${esc(r.material)}">${esc(r.material)}</a>`], ['Deskripsi', (r) => esc(r.desc)],
        ['Aging Excel→TKO', (r) => `${esc(r.alt.excel.aging)} → <b>${esc(r.alt.tko.aging)}</b>`, '', (r) => r.alt.excel.aging + '→' + r.alt.tko.aging],
        ['Min Excel', (r) => fmt(r.alt.excel.min2), 'num', (r) => r.alt.excel.min2], ['Min TKO', (r) => `<b>${fmt(r.alt.tko.min2)}</b>`, 'num', (r) => r.alt.tko.min2],
        ['Max Excel', (r) => fmt(r.alt.excel.max2), 'num', (r) => r.alt.excel.max2], ['Max TKO', (r) => `<b>${fmt(r.alt.tko.max2)}</b>`, 'num', (r) => r.alt.tko.max2],
        ['Order Excel', (r) => fmt(r.alt.excel.toOrder), 'num', (r) => r.alt.excel.toOrder], ['Order TKO', (r) => `<b>${fmt(r.alt.tko.toOrder)}</b>`, 'num', (r) => r.alt.tko.toOrder],
        ['Kelas TKO', (r) => esc(r.alt.tko.cls), '', (r) => r.alt.tko.cls], ['Catatan', (r) => esc(r.alt.tko.note), '', (r) => r.alt.tko.note]], (r) => r.material + ' ' + r.desc],
    };
    TABS.lli[4] = 'Bulan kebutuhan bertanda * tidak diisi di RKM, sehingga dianggap mulai Januari 2027.';
    const top = (!S.rkmFiles.length ? `<div class="banner warn">Belum ada file RKM. Tab "Perlu order" tetap dihitung dari histori pemakaian.</div>` : '') +
      `<p class="source">WK PEP. Metode ${esc(S.set.method === 'tko' ? 'TKO/Pedoman' : 'Excel lama')}, histori s.d. ${esc(S.mrpWB.window[1])}, basis kebutuhan ${esc(BASIS[S.set.basis].toLowerCase())}. <a href="#/pengaturan">Ubah</a></p>`;
    tabbed('rkmTab', TABS, top);
  },

  data() {
    const wkSplit = (k, n) => { const r = S.raw[k] ? byWK(S.raw[k]) : []; return r.length > 1 ? ' (' + r.map(([w, p]) => `${w} ${fmt(n(p), 0)}`).join(', ') + ')' : r.length === 1 ? ` (WK ${r[0][0]})` : ''; };
    const fs = Folder.supported(), t = (d) => (d ? d.toLocaleString('id-ID', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
    $('pageActions').innerHTML = fs ? `<button class="btn primary" id="tbRefresh">${UI.I.dl.replace('M12 4v11m0 0-4-4m4 4 4-4M5 20h14', 'M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3M18 3v4h-4M6 21v-4h4')}<span>Muat ulang data</span></button>` : '';
    if ($('tbRefresh')) $('tbRefresh').onclick = refreshData;
    const SRC = [
      ['mb52', 'MB52', 'Stok per plant dan storage location', S.mb52 && `${fmt(S.mb52.items.length, 0)} item`, S.mb52 && `${S.mb52.plants.length} plant` + wkSplit('mb52', (p) => p.items.length)],
      ['mrp', 'MRP', 'Histori pemakaian bulanan dan master lead time. WK PHE belum punya file MRP, jadi dihitung dari MB52 + MB51 client 180', S.mrpWB && `${fmt(S.mrpWB.rows.length, 0)} baris (WK PEP)`,
        [S.mrpWB && `WK PEP histori ${S.mrpWB.window[0]} s.d. ${S.mrpWB.window[1]}`, S.mrpWB_PHE && `WK PHE dari MB51: ${fmt(S.mrpWB_PHE.rows.length, 0)} material×plant, ${fmt(S.mrpWB_PHE.monthsSpan, 1)} bulan histori`].filter(Boolean).join('; ')],
      ['me3n', 'ME3N', 'Kontrak (outline agreement)', S.me3n && `${fmt(S.me3n.docs.size, 0)} kontrak`, S.me3n && `${fmt(S.me3n.items.length, 0)} item kontrak` + wkSplit('me3n', (p) => p.docs.size)],
      ['me2n', 'ME2N', 'PO dan RO', S.me2n && `${fmt(S.me2n.lines.length, 0)} baris`, S.me2n && `${fmt(new Set(S.me2n.lines.map((l) => l.doc)).size, 0)} dokumen` + wkSplit('me2n', (p) => p.lines.length)],
      ['mb51', 'MB51', 'Pergerakan material (GR, GI, transfer)', S.mb51 && `${fmt(S.mb51.moves.length, 0)} gerakan`, S.mb51 && S.mb51.range && `${dstr(S.mb51.range[0])} s.d. ${dstr(S.mb51.range[1])}` + wkSplit('mb51', (p) => p.moves.length)],
      ['mb25', 'MB25', 'Reservasi material', S.mb25 && `${fmt(S.mb25.lines.length, 0)} baris`, S.mb25 && `${fmt(S.mb25.open.size, 0)} material masih direservasi` + wkSplit('mb25', (p) => p.lines.length)],
      ['rkm', 'RKM', 'Rencana kebutuhan material per lapangan', S.rkmFiles.length && `${S.rkmFiles.length} file`, S.rkmFiles.length && `${fmt(S.rkmFiles.reduce((a, f) => a + f.items.length, 0), 0)} baris`],
      ['ds', 'DS', 'Daftar deadstock akhir tahun (form MA-01, sheet DS PEP/PHE) sebagai dasar optimasi DS. Nama file memuat "Deadstock" atau "DS"', S.ds && `${fmt(S.ds.rows.length, 0)} material×plant`,
        S.ds && `per ${dstr(S.ds.asOf)}, ${S.ds.sheets.map((x) => `${x.name} ${fmt(x.rows, 0)}`).join(', ')}${S.ds.kurs ? `, kurs IDR ${fmt(S.ds.kurs, 0)}/USD` : ''}`],
    ];
    $('view').innerHTML = `<section class="panel"><div class="panel-h"><h2>Folder data</h2>
        <span class="right">${fs ? `<button class="btn" id="fp1">Pilih folder</button><button class="btn ghost" id="fp2">Lupakan folder</button>` : ''}</span></div>
        <p class="muted">${fs ? `Web membaca file terbaru di folder ini setiap login, untuk setiap client SAP: _100_ = WK PEP, _180_ = WK PHE. Khusus MB51, semua file dibaca dan digabung (cocok untuk upload berkala), baris yang sama di beberapa file dihitung sekali. Nama file harus memuat MB52, MRP, ME3N, ME2N, MB51, MB25, atau RKM. File hanya dibaca di browser ini dan tidak dikirim ke mana pun.` : 'Browser ini tidak mendukung akses folder. Pakai Chrome atau Edge di laptop, atau upload file satu per satu di tabel bawah.'}</p>
        ${S.folderName ? `<p class="source" style="margin-top:8px">Folder <b>${esc(S.folderName)}</b>, terakhir dimuat ${esc(t(S.folderLoadedAt))}</p>` : ''}</section>
      <section class="panel"><div class="panel-h"><h2>Sumber data</h2><span class="sub">Semua angka di web berasal dari file ini</span></div>
        ${plainTable(SRC, [['Data', (r) => `<b>${r[1]}</b>`], ['Isi', (r) => esc(r[2])], ['File', (r) => srcFiles(r[0]).map((f) => (f.wk && r[0] !== 'rkm' && r[0] !== 'mrp' ? `<b>WK ${esc(f.wk)}</b> ` : '') + esc(f.name)).join('<br>') || '<span class="muted">Belum dimuat</span>', 'wide'],
          ['Jumlah', (r) => esc(r[3] || ''), 'num'], ['Keterangan', (r) => esc(r[4] || '')], ['Dimuat', (r) => esc(srcFiles(r[0]).length ? t(srcFiles(r[0]).map((f) => f.at).sort((a, b) => b - a)[0]) : '')],
          ['', (r) => `<label class="btn ghost">Upload<input type="file" class="up" data-k="${r[0]}" accept=".xlsx,.xlsm,.xls" ${r[0] === 'rkm' ? 'multiple' : ''} hidden></label>`]])}
        <p class="muted small" id="upMsg" style="margin-top:8px"></p></section>
      ${S.rkmFiles.length ? `<section class="panel"><div class="panel-h"><h2>File RKM</h2><span class="sub">Pastikan plant setiap file benar</span></div>
        ${plainTable(S.rkmFiles.map((f, i) => ({ f, i })), [['File', (o) => esc(o.f.fileName)], ['Asset', (o) => esc(o.f.asset)], ['Baris', (o) => fmt(o.f.items.length, 0), 'num'],
          ['Plant', (o) => `<select data-i="${o.i}" class="rp" aria-label="Plant"><option value="">Pilih plant</option>${DEFAULT_MRP_PLANTS.map((p) => `<option value="${p}" ${o.f.plant === p ? 'selected' : ''}>${plantLabel(p)}</option>`).join('')}</select>`],
          ['Cocok ke MRP', (o) => { const m = S.rkmMatched.filter((x) => x.file === o.f.fileName); return `${fmt(m.filter((x) => x.key).length, 0)} dari ${fmt(m.length, 0)}`; }, 'num'],
          ['', (o) => `<button class="btn ghost rx" data-i="${o.i}">Hapus</button>`]])}</section>` : ''}`;
    if (fs) {
      $('fp1').onclick = async () => { try { const h = await Folder.pick(); await loadFolder(h); } catch (e) { if (e.name !== 'AbortError') banner('Gagal: ' + esc(e.message), 'bad'); } };
      $('fp2').onclick = async () => { await Folder.forget(); S.folderName = null; banner('Folder dilupakan. Data yang sudah dimuat tetap ada sampai halaman ditutup.', 'warn'); route(); };
    }
    const LOAD = { mb52: loadMB52, mrp: loadMRP, me3n: loadME3N, me2n: loadME2N, mb51: loadMB51, mb25: loadMB25, rkm: (f) => loadRKM(f), ds: loadDS };
    document.querySelectorAll('.up').forEach((inp) => (inp.onchange = async (e) => {
      const files = [...e.target.files]; if (!files.length) return; $('upMsg').textContent = 'Memproses ' + files.map((f) => f.name).join(', ') + '…'; await tick();
      try { for (const f of files) await LOAD[inp.dataset.k](f); recompute(); route(); } catch (err) { $('upMsg').textContent = 'Gagal membaca file: ' + err.message; $('upMsg').className = 'small neg'; }
    }));
    document.querySelectorAll('.rp').forEach((sl) => (sl.onchange = () => { const f = S.rkmFiles[sl.dataset.i]; f.plant = sl.value; const m = store.get('rkmPlant') || {}; m[f.fileName] = sl.value; store.set('rkmPlant', m); recompute(); route(); }));
    document.querySelectorAll('.rx').forEach((b) => (b.onclick = () => { S.rkmFiles.splice(+b.dataset.i, 1); recompute(); route(); }));
  },

  pengaturan() {
    const all = [...new Set([...(S.mb52 ? S.mb52.plants : []), ...(S.mrp ? S.mrp.plants : []), ...Object.keys(DEFAULT_ZONA), ...S.mrpPlants])].sort();
    const P = (k) => (S.set.tko[k] != null ? S.set.tko[k] : MRP.TKO_DEFAULT[k]);
    $('view').innerHTML = `<section class="panel"><div class="panel-h"><h2>Plant dan zona</h2><span class="sub">Zona dipakai di dashboard. Min/Max hanya dihitung untuk plant yang dipantau MRP.</span></div>
        ${plainTable(all, [['Plant', (p) => `<b>${esc(p)}</b>`], ['Nama', (p) => esc(PLANT_NAME[p] || '')],
          ['Zona', (p) => `<select class="zn" data-p="${esc(p)}" aria-label="Zona ${esc(p)}">${ZONA_LIST.map((z) => `<option ${zonaOf(p) === z ? 'selected' : ''}>${z}</option>`).join('')}</select>`],
          ['Dipantau MRP', (p) => `<input type="checkbox" class="mp" value="${esc(p)}" ${S.mrpPlants.has(p) ? 'checked' : ''} aria-label="Pantau ${esc(p)}">`]])}</section>
      <section class="panel"><div class="panel-h"><h2>Mata uang dan kurs</h2></div>
        <div class="params"><label>Rupiah per 1 USD<span><input type="number" id="kurs" min="1" step="1" value="${S.set.kurs}"></span></label>
          ${['PEP', 'PHE'].map((w) => `<label>Mata uang nilai stok MB52 WK ${w}<span><select class="wkc" data-w="${w}">${['IDR', 'USD'].map((c) => `<option ${(S.set.wkCur || {})[w] === c ? 'selected' : ''}>${c}</option>`).join('')}</select></span></label>`).join('')}</div>
        <p class="muted small" style="margin-top:8px">Kurs dipakai untuk konversi IDR dan USD di dashboard dan estimasi nilai. MB52 tidak mencantumkan mata uang, jadi mata uang nilai stok diatur per WK (company code). Pastikan sesuai dengan SAP. Nilai awal Rp 18.150 mengikuti JISDOR awal November 2026. Sesuaikan dengan kurs yang dipakai kantor.</p></section>
      <section class="panel"><div class="panel-h"><h2>Metode perhitungan MRP</h2></div>
        <div class="radios">${Object.entries(METHOD).map(([k, t]) => `<label class="radio"><input type="radio" name="method" value="${k}" ${S.set.method === k ? 'checked' : ''}>${esc(t)}</label>`).join('')}</div>
        ${S.set.method === 'tko' ? `<div class="params" style="margin-top:12px">${TKO_FIELDS.map(([k, t, u]) => `<label>${esc(t)} <span class="muted">(${u})</span><span><input type="number" step="0.5" min="0" data-k="${k}" value="${P(k)}"></span></label>`).join('')}
          <label>Rumus Max untuk maintenance<span><select data-s="maxFormula">${[['A', 'A: 2 × AMU × T + SS'], ['B', 'B: AMU × T + 2 × SS'], ['C', 'C: ROP + n × AMU'], ['BC', 'B untuk kontrak, C tanpa kontrak']].map(([v, t]) => `<option value="${v}" ${P('maxFormula') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></span></label>
          <label>Moderate (MD) dihitung sebagai FS<span><select data-s="mdAsFS"><option value="1" ${P('mdAsFS') ? 'selected' : ''}>Ya, perlu konfirmasi user</option><option value="0" ${P('mdAsFS') ? '' : 'selected'}>Tidak, Min = Max = SS</option></select></span></label>
          <label>Service level non-critical<span><select data-z="z">${[[1.282, '90%'], [1.645, '95%'], [2.054, '98%'], [2.326, '99%']].map(([z, t]) => `<option value="${z}" ${P('z') == z ? 'selected' : ''}>${t}</option>`).join('')}</select></span></label></div>
          <p class="muted small" style="margin-top:8px">Penjelasan rumus ada di <a href="#/regulasi">Panduan & Aturan</a>. <a href="#" id="tkoReset">Kembalikan default</a></p>` : ''}</section>
      <section class="panel"><div class="panel-h"><h2>MRP WK PHE</h2><span class="sub">Sementara, sampai file MRP PHE dibuat</span></div>
        <div class="params"><label>Lead time default bila material tidak ada di master MRP PEP<span><input type="number" id="pheLT" min="0.5" max="36" step="0.5" value="${S.set.pheLT || 3}"></span></label></div>
        <p class="muted small" style="margin-top:8px">Pemakaian diambil dari MB51 client 180: Mvt kategori Own Use dan Return, tanpa GI ke network/proyek (221, 222, 949, 950). Aturan ini sama dengan file MRP PEP (dicek Oktober 2026, cocok 363 dari 364 material×plant).</p></section>
      <section class="panel"><div class="panel-h"><h2>Basis kebutuhan</h2><span class="sub">Angka AMU yang dipakai mesin MRP</span></div>
        <div class="radios">${Object.entries(BASIS).map(([k, t]) => `<label class="radio"><input type="radio" name="basis" value="${k}" ${S.set.basis === k ? 'checked' : ''}>${esc(t)}</label>`).join('')}</div></section>
      <section class="panel"><div class="panel-h"><h2>Long lead item</h2></div>
        <div class="params"><label>Lead time minimal (bulan)<span><input type="number" id="lli" min="1" max="36" value="${S.set.lliLT}"></span></label></div></section>`;
    const saveSet = () => { store.set('settings', S.set); recompute(); };
    document.querySelectorAll('.zn').forEach((sl) => (sl.onchange = () => { S.set.zona = Object.assign({}, S.set.zona || {}, { [sl.dataset.p]: sl.value }); saveSet(); }));
    document.querySelectorAll('.mp').forEach((c) => (c.onchange = () => { c.checked ? S.mrpPlants.add(c.value) : S.mrpPlants.delete(c.value); store.set('mrpPlants', [...S.mrpPlants]); }));
    document.querySelectorAll('.wkc').forEach((sl) => (sl.onchange = () => { S.set.wkCur = Object.assign({}, S.set.wkCur, { [sl.dataset.w]: sl.value }); saveSet(); }));
    $('kurs').onchange = () => { const v = parseFloat($('kurs').value); if (v > 0) { S.set.kurs = v; saveSet(); } };
    document.querySelectorAll('input[name=method]').forEach((r) => (r.onchange = () => { S.set.method = r.value; saveSet(); route(); }));
    document.querySelectorAll('.params input[data-k]').forEach((i) => (i.onchange = () => { const v = parseFloat(i.value); if (isFinite(v) && v >= 0) { S.set.tko[i.dataset.k] = v; saveSet(); } }));
    document.querySelectorAll('.params select[data-s]').forEach((i) => (i.onchange = () => { S.set.tko[i.dataset.s] = i.dataset.s === 'mdAsFS' ? i.value === '1' : i.value; saveSet(); }));
    document.querySelectorAll('.params select[data-z]').forEach((i) => (i.onchange = () => { S.set.tko.z = parseFloat(i.value); saveSet(); }));
    if ($('tkoReset')) $('tkoReset').onclick = (e) => { e.preventDefault(); S.set.tko = {}; saveSet(); route(); };
    document.querySelectorAll('input[name=basis]').forEach((r) => (r.onchange = () => { S.set.basis = r.value; saveSet(); }));
    $('pheLT').onchange = () => { const v = parseFloat($('pheLT').value); if (v > 0) { S.set.pheLT = v; saveSet(); } };
    $('lli').onchange = () => { S.set.lliLT = Math.max(1, Math.min(36, +$('lli').value || 6)); saveSet(); };
  },
};

// RKM x MRP untuk WK PHE: belum ada RKM dan file MRP, jadi hanya hasil mesin MRP dari MB52 + MB51
function rkmPHE(res) {
  const orders = res.filter((r) => r.toOrder > 0).sort((a, b) => b.toOrder - a.toOrder);
  const pakai = res.filter((r) => r.amu > 0).sort((a, b) => b.amu - a.amu);
  const sehat = res.filter((r) => r.berlebih && r.stock > 0).sort((a, b) => (b.surplus || 0) - (a.surplus || 0));
  const mat = (r) => `<a class="mono mlink" href="#" data-mat="${esc(r.material)}">${esc(r.material)}</a>`;
  const base = [['Plant', (r) => esc(plantLabel(r.plant)), '', (r) => plantLabel(r.plant)], ['Material', mat, '', (r) => r.material], ['Deskripsi', (r) => esc(r.desc)], ['Aging', (r) => agingPill(r.aging), '', (r) => r.aging],
    ['AMU', (r) => fmt(r.amu, 2), 'num', (r) => r.amu], ['LT', (r) => fmt(r.lt, 1) + (r.ltDefault ? ' *' : ''), 'num', (r) => r.lt], ['Stok ZNORMAL', (r) => fmt(r.stock), 'num', (r) => r.stock], ['In transit', (r) => (r.transit ? fmt(r.transit) : ''), 'num', (r) => r.transit || 0], ['Val. type lain', (r) => (r.stockOther ? `<span title="${esc(r.otherVal)}">${fmt(r.stockOther)}</span>` : ''), 'num', (r) => r.stockOther || 0], ['OS PO/RO', (r) => fmt(r.ospo), 'num', (r) => r.ospo],
    ['MB25', (r) => fmt(r.mb25), 'num', (r) => r.mb25], ['Min', (r) => fmt(r.min2), 'num', (r) => r.min2], ['Max', (r) => fmt(r.max2), 'num', (r) => r.max2]];
  const TABS = {
    order: ['Perlu order (To Order)', orders, base.concat([['To Order', (r) => calcA(r, pill(fmt(r.toOrder), 'warn')), 'num', (r) => r.toOrder], ['Kelas', (r) => esc(r.cls || r.aging), '', (r) => r.cls || r.aging],
      ['Kontrak (OA)', (r) => (r.oa ? `<span class="mono">${esc(r.oa)}</span>` : pill('PR + OE', 'mute')), '', (r) => r.oa || 'PR + OE']]), (r) => r.material + ' ' + r.desc, 'LT bertanda * memakai lead time default.'],
    pakai: ['Material dipakai', pakai, base.concat([['Kelas', (r) => esc(r.cls || r.aging), '', (r) => r.cls || r.aging], ['To Order', (r) => calcA(r, fmt(r.toOrder)), 'num', (r) => r.toOrder]]), (r) => r.material + ' ' + r.desc,
      'Material dengan pemakaian (Mvt Own Use + Return, tanpa network/proyek) di MB51 WK PHE.'],
    sehat: ['Penyehatan stok', sehat, base.concat([['Surplus', (r) => fmt(r.surplus), 'num', (r) => r.surplus], ['Cakupan (bln)', (r) => (isFinite(r.cover) ? fmt(r.cover, 1) : '∞'), 'num', (r) => (isFinite(r.cover) ? r.cover : '')]]), (r) => r.material + ' ' + r.desc],
  };
  tabbed('rkmPheTab', TABS, mrpNote() + srcLine('mb52', 'mb51', 'me3n', 'me2n'));
}

// Beranda: alur kerja end-to-end, satu angka kunci per langkah
function flowStrip(f, stokTxt, nMat) {
  const k = S.me3n ? [...S.me3n.docs.values()].filter((d) => d.sisaHari == null || d.sisaHari >= 0) : null;
  const soon = k ? k.filter((d) => d.sisaHari != null && d.sisaHari <= 90).length : 0;
  let dsTxt = null; try { const R = window.optimCompute && S.ds && S.mb51 ? window.optimCompute() : null;
    if (R && R.ds) { const tot = R.ds.rows.reduce((a, r) => a + r.total, 0), used = R.ds.rows.reduce((a, r) => a + r.usedUsd, 0); dsTxt = [fmt(tot ? (used / tot) * 100 : 0, 1) + '%', `${money(used, 'USD')} dari ${money(tot, 'USD')} deadstock sudah terpakai`]; } } catch (e) { /* abaikan */ }
  const step = (n, href, title, what, big, small) => `<a class="flow-step" href="${href}"><span class="fs-n">${n}</span><span class="fs-t">${title}</span><span class="fs-w">${what}</span>
    <b class="fs-v">${big == null ? '–' : big}</b><span class="fs-s">${small || ''}</span></a>`;
  return `<section class="flow"><h2 class="flow-h">Alur kerja</h2><div class="flow-row">
    ${step(1, '#/cari', 'Cek stok', 'Berapa barang yang ada di gudang', S.mb52 ? stokTxt : null, S.mb52 ? `${fmt(nMat, 0)} material berstok` : 'Butuh MB52')}
    ${step(2, '#/order', 'Hitung kebutuhan', 'Barang yang stoknya di bawah minimum', f.ord != null ? fmt(f.ord, 0) : null, f.ord != null ? `${fmt(f.ro, 0)} lewat kontrak (RO), ${fmt(f.pr, 0)} perlu PR baru` : 'Butuh file MRP')}
    ${step(3, '#/kontrak', 'Pesan lewat kontrak', 'Kontrak vendor yang masih berlaku', k ? fmt(k.length, 0) : null, k ? (soon ? `${fmt(soon, 0)} habis dalam 90 hari` : 'Tidak ada yang segera habis') : 'Butuh ME3N')}
    ${step(4, '#/expediting', 'Pantau pesanan', 'PO/RO yang belum diterima penuh', f.po != null ? fmt(f.po, 0) : null, f.po != null ? (f.late ? `<span class="neg">${fmt(f.late, 0)} terlambat</span>` : 'Tidak ada yang terlambat') : 'Butuh ME2N')}
    ${step(5, '#/optim', 'Laporkan', 'Deadstock yang sudah terpakai tahun ini', dsTxt ? dsTxt[0] : null, dsTxt ? dsTxt[1] : 'Butuh MB51 + file DS')}
  </div></section>`;
}

// Kamus istilah untuk pembaca awam (tombol "Istilah" di kanan atas)
const GLOSSARY = [
  ['Data SAP', [['MB52', 'Daftar stok per gudang saat ini.'], ['MB51', 'Riwayat barang masuk dan keluar gudang.'], ['MB25', 'Reservasi: permintaan barang dari user yang belum diambil.'],
    ['ME2N', 'Daftar PO dan RO (pesanan ke vendor).'], ['ME3N', 'Daftar kontrak vendor (OA).'], ['MRP', 'Perhitungan otomatis kapan dan berapa barang harus dipesan.']]],
  ['Pengadaan', [['OA', 'Outline Agreement: kontrak payung dengan vendor, berisi daftar barang dan harga untuk beberapa tahun.'], ['RO', 'Release Order: pesanan barang yang diambil dari kontrak (OA). Cepat, karena harga sudah disepakati.'],
    ['PR', 'Purchase Requisition: permintaan pembelian baru kalau barang belum ada kontraknya. Prosesnya lama (±5–6 bulan).'], ['OE / HPS', 'Owner Estimate: perkiraan harga sebelum tender.'],
    ['PO', 'Purchase Order: pesanan resmi ke vendor.'], ['GR', 'Goods Receipt: barang sudah diterima gudang.'], ['GI', 'Goods Issue: barang dikeluarkan dari gudang untuk dipakai.'], ['Expediting', 'Memantau dan menagih pesanan supaya datang tepat waktu.']]],
  ['Perencanaan stok', [['Min / ROP', 'Batas bawah stok. Kalau stok + pesanan berjalan di bawah ini, saatnya pesan.'], ['Max', 'Batas atas stok. Pesan secukupnya sampai angka ini.'],
    ['AMU', 'Average Monthly Usage: rata-rata pemakaian per bulan.'], ['LT', 'Lead time: lama waktu dari pesan sampai barang datang.'], ['SS', 'Safety stock: stok cadangan untuk jaga-jaga.'],
    ['RKM', 'Rencana Kebutuhan Material dari user untuk tahun depan.'], ['Berlebih', 'Stok lebih dari 12 bulan pemakaian (chemical 5 bulan). Jangan dipesan lagi.'], ['One Gate Ordering', 'Cek dulu stok di gudang lain, ex-proyek, atau KKKS lain sebelum membeli.']]],
  ['Pergerakan & deadstock', [['FS / MD / SP / DS', 'Kelas pergerakan: Fast (dipakai ≤ 1 tahun), Moderate (≤ 2 tahun), Slow (≤ 5 tahun), Dead stock (lebih dari 5 tahun tidak dipakai).'],
    ['Internal Usage / Own Use', 'Barang dipakai sendiri oleh lapangan (WO, cost center, proyek).'], ['BAU', 'Barang dikirim ke gudang/plant lain lewat STO.'], ['MTA', 'Material Transfer Agreement: barang dipindah ke KKKS lain.'],
    ['STO', 'Stock Transport Order: dokumen pindah barang antar plant (nomor berawalan 42).'], ['Mvt', 'Movement type: kode SAP jenis gerakan barang, mis. 291 = dipakai, 351 = dikirim ke plant lain.'],
    ['ABC', 'A = sedikit material yang menyerap 80% nilai, C = banyak material bernilai kecil.']]],
  ['Organisasi', [['WK PEP / PHE', 'Dua wilayah kerja di SAP: client 100 = PEP (nilai IDR), client 180 = PHE (nilai USD).'], ['Zona', 'Kelompok lapangan. Zona 1 = Rantau, P. Susu, Jambi, Lirik, PHE NSO & JM. Zona 4 = Prabumulih, Pendopo, Limau, Adera, Ramba, PHE OK & RT.'],
    ['Plant', 'Kode gudang di SAP, mis. W101 = Rantau.'], ['KIMAP', 'Kode material (10 atau 12 karakter).']]],
];
function openGlossary() {
  UI.drawer(`<div class="d-head"><h2>Kamus istilah</h2><p class="muted">Singkatan yang sering muncul di web ini.</p></div>${GLOSSARY.map(([g, xs]) => `<section class="d-sec"><h3>${g}</h3><dl class="gloss">${xs.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl></section>`).join('')}`, { label: 'Kamus istilah' });
}

// Catatan panjang diringkas jadi satu baris + tombol "Selengkapnya"; panel analisis bisa dilipat
function tidy(root) {
  root.querySelectorAll('.tab-note:not([data-t]), p.source:not([data-t])').forEach((el) => {
    el.dataset.t = '1';
    if (el.classList.contains('source')) { el.title = el.textContent; return; }
    if (el.querySelector('button, select, input, label, .neg') || el.textContent.length < 130) return;
    el.classList.add('clamp');
    const b = document.createElement('button'); b.type = 'button'; b.className = 'more-btn'; b.textContent = 'Selengkapnya';
    b.onclick = () => { const c = el.classList.toggle('clamp'); b.textContent = c ? 'Selengkapnya' : 'Ringkas'; }; el.after(b);
  });
  root.querySelectorAll('section.panel[data-fold]').forEach((p) => {
    const key = 'fold:' + p.dataset.fold, h = p.querySelector(':scope > .panel-h'); if (!h) return;
    if (!p.dataset.fi) { p.dataset.fi = '1'; p.classList.toggle('folded', store.get(key) ?? true); }
    if (!h.querySelector('.fold-btn')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost fold-btn'; h.appendChild(b); }
    const b = h.querySelector('.fold-btn'), lbl = p.classList.contains('folded') ? 'Tampilkan' : 'Sembunyikan'; if (b.textContent !== lbl) b.textContent = lbl;
    b.onclick = () => { const f = p.classList.toggle('folded'); store.set(key, f); b.textContent = f ? 'Tampilkan' : 'Sembunyikan'; };
  });
}
const tidyObs = new MutationObserver(() => { tidyObs.disconnect(); try { tidy($('view')); } finally { tidyObs.observe($('view'), { childList: true, subtree: true }); } });
tidyObs.observe($('view'), { childList: true, subtree: true });
$('glossBtn').onclick = openGlossary;

// Beranda: material terbesar, bisa diatur jumlah (Top N atau Top %), ukuran (nilai total, harga per unit, qty), dan per warehouse atau gabung
function drawTop(pool, idrOf, cmoney) {
  const T = S.dashTop || (S.dashTop = Object.assign({ n: '10', by: 'value', agg: 'wh' }, store.get('dashTop') || {}));
  const save = () => { store.set('dashTop', T); drawTop(pool, idrOf, cmoney); };
  let rows = pool.map((i) => ({ material: i.material, desc: i.desc, uom: i.uom, soh: i.soh || 0, idr: idrOf(i), plants: [i.plant], abc: i._abc }));
  if (T.agg === 'mat') {
    const m = new Map(); const rank = { A: 0, B: 1, C: 2 };
    rows.forEach((r) => { const g = m.get(r.material); if (!g) m.set(r.material, Object.assign({}, r, { plants: [...r.plants] }));
      else { g.soh += r.soh; g.idr += r.idr; g.plants.push(...r.plants); if (rank[r.abc] < rank[g.abc]) g.abc = r.abc; } });
    rows = [...m.values()];
  }
  rows.forEach((r) => (r.unit = r.soh > 0 ? r.idr / r.soh : 0));
  const key = { value: (r) => r.idr, unit: (r) => r.unit, qty: (r) => r.soh }[T.by];
  rows.sort((a, b) => key(b) - key(a));
  const n = T.n.startsWith('p') ? Math.ceil(rows.length * +T.n.slice(1) / 100) : +T.n;
  const top = rows.slice(0, n), sum = top.reduce((a, r) => a + r.idr, 0), all = rows.reduce((a, r) => a + r.idr, 0);
  const sel = (id, label, opts, v, on) => { $(id).innerHTML = `<label class="select"><span>${label}</span><select class="bare">${opts.map(([k, t]) => `<option value="${k}"${k === v ? ' selected' : ''}>${t}</option>`).join('')}</select></label>`; $(id).querySelector('select').onchange = (e) => on(e.target.value); };
  sel('tN', 'Tampilkan', [['10', 'Top 10'], ['20', 'Top 20'], ['50', 'Top 50'], ['100', 'Top 100'], ['p5', 'Top 5% item'], ['p10', 'Top 10% item'], ['p20', 'Top 20% item']], T.n, (v) => { T.n = v; save(); });
  sel('tBy', 'Urut menurut', [['value', 'Nilai stok (total)'], ['unit', 'Harga per unit'], ['qty', 'Qty stok']], T.by, (v) => { T.by = v; save(); });
  UI.seg($('tAgg'), [['wh', 'Per warehouse'], ['mat', 'Gabung per material']], T.agg, (v) => { T.agg = v; save(); });
  const cols = [
    { label: 'Material', nowrap: true, get: (r) => r.material, html: (r) => `<a class="mono mlink" href="#" data-mat="${esc(r.material)}">${esc(r.material)}</a>` },
    { label: 'Deskripsi', wide: true, get: (r) => r.desc },
    { label: T.agg === 'mat' ? 'Warehouse' : 'Warehouse', get: (r) => (r.plants.length > 1 ? r.plants.length + ' warehouse' : plantLabel(r.plants[0])), title: '' },
    { label: 'Stok', num: true, filter: false, get: (r) => r.soh, html: (r) => fmt(r.soh) + ' ' + esc(r.uom) },
    { label: 'Harga per unit', num: true, filter: false, get: (r) => r.unit, html: (r) => cmoney(r.unit) },
    { label: 'Nilai stok', num: true, filter: false, get: (r) => r.idr, html: (r) => cmoney(r.idr) },
    { label: 'Porsi', num: true, filter: false, get: (r) => (all ? r.idr / all : 0), html: (r) => (all ? fmt((r.idr / all) * 100, 1) + '%' : '') },
    { label: 'Kelas', get: (r) => r.abc },
  ];
  $('tTop').innerHTML = `<p class="source">${fmt(top.length, 0)} dari ${fmt(rows.length, 0)} ${T.agg === 'mat' ? 'material' : 'baris material×warehouse'}, total ${cmoney(sum)} (${all ? fmt((sum / all) * 100, 1) : 0}% dari nilai stok terpilih).</p><div id="tTopT"></div>`;
  UI.table($('tTopT'), { id: 'dash-top-' + T.agg, rows: top, cols, name: 'Material terbesar', match: (r, q) => hit(r.material + ' ' + r.desc, expand(q)), placeholder: 'Cari di daftar ini…' });
}

// Beranda: Analisis ABC = kelas nilai × kelas pergerakan (aging), lengkap dengan insight dan tindakan sesuai Pedoman
function drawABC(pool, idrOf, cmoney, selTxt) {
  const A = S.abc || (S.abc = Object.assign({ basis: 'stok', cell: '' }, store.get('abcSet') || {}));
  const save = () => { store.set('abcSet', A); drawABC(pool, idrOf, cmoney, selTxt); };
  const AG = ['FS', 'MD', 'SP', 'DS', '–'], AGN = { FS: 'Fast', MD: 'Moderate', SP: 'Slow', DS: 'Dead stock', '–': 'Belum dipantau MRP' };
  const rows = pool.map((i) => {
    const r = S.mrpRes && S.mrpRes.get(i.material + '|' + i.plant), idr = idrOf(i), unit = i.soh > 0 ? idr / i.soh : 0;
    const u12 = r && r.usageAll ? r.usageAll.slice(-12).reduce((a, v) => a + Math.abs(v || 0), 0) : 0;
    return { material: i.material, desc: i.desc, uom: i.uom, plant: i.plant, soh: i.soh, idr, unit, u12, use: u12 * unit, aging: (r && r.aging) || '–', r,
      cover: r && r.amu > 0 ? i.soh / r.amu : null, surplusV: r && r.berlebih && r.max2 != null ? Math.max(0, i.soh - r.max2) * unit : 0 };
  });
  // kelas ABC menurut dasar yang dipilih
  const val = A.basis === 'pakai' ? (x) => x.use : (x) => x.idr;
  const tot = rows.reduce((a, x) => a + val(x), 0); let cum = 0, nA = 0;
  [...rows].sort((a, b) => val(b) - val(a)).forEach((x) => { const v = val(x); if (v <= 0) { x.k = 'C'; return; } cum += v; x.k = cum / tot <= 0.8 || !nA ? 'A' : cum / tot <= 0.95 ? 'B' : 'C'; if (x.k === 'A') nA++; });
  const sum = (xs) => xs.reduce((a, x) => a + x.idr, 0), allV = sum(rows);
  const cell = (k, g) => rows.filter((x) => x.k === k && x.aging === g);
  const pc = (a, b) => (b ? fmt((a / b) * 100, 1) + '%' : '0%');
  // tindakan per baris
  const act = (x) => { const r = x.r;
    if (x.aging === 'DS') return ['bad', 'Tawarkan ke plant/WK lain, lalu usul penghapusan'];
    if (x.aging === 'SP') return ['bad', 'Cek prospek dan peralatan induk, tawarkan ke yang butuh'];
    if (r && r.berlebih) return ['warn', 'Stop order, transfer kelebihan ke plant lain'];
    if (r && r.toOrder > 0) return r.contract ? ['', 'Terbitkan RO lewat OA ' + r.contract.doc] : ['warn', 'Perlu order tanpa kontrak, usulkan OA/COO'];
    if (x.aging === 'MD') return ['', 'Pantau, konfirmasi kebutuhan ke user'];
    if (x.aging === '–') return ['', 'Belum dipantau MRP'];
    return ['ok', 'Aman, pantau Min/Max']; };
  rows.forEach((x) => (x.act = act(x)));
  // insight
  const kA = rows.filter((x) => x.k === 'A'), kC = rows.filter((x) => x.k === 'C');
  const idleA = kA.filter((x) => ['MD', 'SP', 'DS'].includes(x.aging)), deadAll = rows.filter((x) => x.aging === 'DS' || x.aging === 'SP');
  const lebih = rows.filter((x) => x.k !== 'C' && x.r && x.r.berlebih), noOA = rows.filter((x) => x.k !== 'C' && x.r && x.r.toOrder > 0 && !x.r.contract);
  const unmon = rows.filter((x) => x.aging === '–'), deadC = kC.filter((x) => x.aging === 'DS');
  const ins = [];
  if (A.basis === 'pakai') ins.push(['', `<b>${fmt(kA.length, 0)} baris kelas A</b> (${pc(kA.length, rows.length)} dari semua baris) menyerap 80% nilai pemakaian 12 bulan, yaitu <b>${cmoney(kA.reduce((a, x) => a + x.use, 0))}</b> per tahun, dengan stok tertahan ${cmoney(sum(kA))}. Ini material yang paling sering dibeli: pastikan semuanya tercover OA dan Min/Max di-review tiap bulan.`]);
  else ins.push(['', `<b>${fmt(kA.length, 0)} baris kelas A</b> (${pc(kA.length, rows.length)} dari semua baris) menyimpan <b>${cmoney(sum(kA))}</b> (${pc(sum(kA), allV)} nilai stok). Kontrol paling ketat di sini: review Min/Max tiap bulan dan pastikan semua tercover OA.`]);
  if (idleA.length) ins.push(['bad', `<b>${cmoney(sum(idleA))}</b> stok kelas A (${fmt(idleA.length, 0)} baris) tidak dipakai 12 bulan terakhir. Cek prospek pemakaian dan peralatan induknya, tawarkan ke plant atau WK lain (lewat MTA), dan yang lebih dari 5 tahun diusulkan dead stock.`, 'MD,SP,DS', 'A']);
  if (deadAll.length) ins.push(['bad', `Slow moving dan dead stock di semua kelas: <b>${cmoney(sum(deadAll))}</b> (${pc(sum(deadAll), allV)} nilai stok, ${fmt(deadAll.length, 0)} baris). Ini target penyehatan persediaan (A7-003 §4.f).`]);
  if (lebih.length) ins.push(['warn', `<b>${fmt(lebih.length, 0)} baris kelas A/B berlebih</b> (stok lebih dari 12 bulan pemakaian, chemical 5 bulan). Kelebihan di atas Max bernilai <b>${cmoney(lebih.reduce((a, x) => a + x.surplusV, 0))}</b>. Jangan dipesan ulang, transfer ke plant yang butuh.`]);
  if (noOA.length) ins.push(['warn', `<b>${fmt(noOA.length, 0)} baris kelas A/B perlu order tapi belum ada kontrak</b>. Setiap order jadi PR + OE (±5,5 bulan). Usulkan masuk OA/COO jangka panjang (Kraljic bottleneck).`]);
  if (unmon.length) ins.push(['', `<b>${cmoney(sum(unmon))}</b> (${pc(sum(unmon), allV)}) ada di plant yang belum dipantau MRP, jadi aging dan tindakannya belum bisa dihitung. Tambahkan plant di <a href="#/pengaturan">Pengaturan</a> kalau perlu.`]);
  ins.push(['ok', `Kelas C: ${fmt(kC.length, 0)} baris (${pc(kC.length, rows.length)}).${A.basis === 'pakai' ? ` Termasuk semua material tanpa pemakaian 12 bulan, dengan stok tertahan ${cmoney(sum(kC))}.` : ` Hanya ${pc(sum(kC), allV)} nilai stok.`} Cukup review setahun sekali.${deadC.length ? ` ${fmt(deadC.length, 0)} di antaranya dead stock, bisa diusulkan penghapusan sekaligus.` : ''}`]);
  // cell terpilih (default: A × tidak bergerak paling bernilai)
  if (!A.cell || !A.cell.includes('|')) { const c = ['A|DS', 'A|SP', 'A|MD', 'B|DS', 'B|SP', 'A|FS'].find((c) => cell(...c.split('|')).length); A.cell = c || 'A|FS'; }
  const [ck, cg] = A.cell.split('|'), list = cell(ck, cg).sort((a, b) => b.idr - a.idr);
  const risk = (k, g) => k !== 'C' && (g === 'SP' || g === 'DS');
  $('abcPanel').innerHTML = `<div class="panel-h"><h2>Analisis ABC</h2><span class="sub">Material mana yang paling mahal, dan mana yang diam di gudang. A = 80% nilai teratas, B = 15% berikutnya, C = sisanya.</span><span class="right" id="abcBasis"></span></div>
    <div class="abc-grid"><div><h4 class="sub-h">Kelas nilai × pergerakan <small class="muted">klik sel untuk melihat daftarnya</small></h4><div class="plain-wrap"><table class="plain abc-m"><tr><th>Kelas</th>${AG.map((g) => `<th class="num" title="${AGN[g]}">${g === '–' ? 'Tanpa MRP' : g}</th>`).join('')}<th class="num">Total</th></tr>
      ${['A', 'B', 'C'].map((k) => `<tr><th>${k}</th>${AG.map((g) => { const xs = cell(k, g); return `<td class="num${xs.length ? ' pick' : ''}${A.cell === k + '|' + g ? ' on' : ''}${risk(k, g) && xs.length ? ' risk' : ''}" data-c="${k}|${g}">${xs.length ? `<b>${cmoney(sum(xs))}</b><small>${fmt(xs.length, 0)} baris</small>` : '<span class="muted">–</span>'}</td>`; }).join('')}
        <td class="num"><b>${cmoney(sum(rows.filter((x) => x.k === k)))}</b><small>${fmt(rows.filter((x) => x.k === k).length, 0)} baris</small></td></tr>`).join('')}</table></div>
      <p class="muted small" style="margin-top:6px">FS dipakai ≤ 12 bulan, MD ≤ 24 bulan, SP ≤ 60 bulan, DS lebih dari 60 bulan tidak dipakai (B7-004). Angka di sel = nilai stok. Sel merah = nilai besar yang tidak bergerak.${A.basis === 'pakai' ? ' Dengan dasar pemakaian, material yang tidak dipakai 12 bulan otomatis masuk kelas C.' : ''}</p></div>
      <div><h4 class="sub-h">Insight dan tindakan</h4><ul class="reco abc-ins">${ins.map(([c, t]) => `<li class="${c}"><span>${t}</span></li>`).join('')}</ul></div></div>
    <h4 class="sub-h">Kelas ${esc(ck)}, ${esc(AGN[cg])}: ${fmt(list.length, 0)} baris, ${cmoney(sum(list))}</h4><div id="abcList"></div>`;
  UI.seg($('abcBasis'), [['stok', 'Dasar: nilai stok'], ['pakai', 'Dasar: nilai pemakaian 12 bln']], A.basis, (v) => { A.basis = v; A.cell = ''; save(); });
  $('abcPanel').querySelectorAll('td.pick').forEach((td) => (td.onclick = () => { A.cell = td.dataset.c; save(); }));
  UI.table($('abcList'), { id: 'dash-abc', rows: list, name: `ABC ${ck} ${cg}`, match: (x, q) => hit(x.material + ' ' + x.desc, expand(q)), placeholder: 'Cari di daftar ini…', cols: [
    { label: 'Material', nowrap: true, get: (x) => x.material, html: (x) => `<a class="mono mlink" href="#" data-mat="${esc(x.material)}">${esc(x.material)}</a>` },
    { label: 'Deskripsi', wide: true, get: (x) => x.desc },
    { label: 'Warehouse', get: (x) => plantLabel(x.plant) },
    { label: 'Stok', num: true, filter: false, get: (x) => x.soh, html: (x) => fmt(x.soh) + ' ' + esc(x.uom) },
    { label: 'Nilai stok', num: true, filter: false, get: (x) => x.idr, html: (x) => cmoney(x.idr) },
    { label: 'Pakai', sub: '12 bulan', num: true, filter: false, get: (x) => (x.r ? x.u12 : null), html: (x) => (x.r ? fmt(x.u12) : '') },
    { label: 'Cakupan', sub: 'bulan', num: true, filter: false, get: (x) => x.cover, html: (x) => (x.cover == null ? (x.r ? '∞' : '') : fmt(x.cover, 1)) },
    { label: 'Tindakan', wide: true, get: (x) => x.act[1], html: (x) => `<span class="st wrap ${x.act[0] === 'bad' ? 'low' : x.act[0] === 'warn' ? 'warn' : x.act[0] === 'ok' ? 'ok' : 'mute'}">${esc(x.act[1])}</span>` },
  ] });
}

// ---------- Tab generik (dipakai halaman Kontrak & Order) ----------
function tabbed(state, TABS, extraTop = '') {
  if (!TABS[S[state]]) S[state] = Object.keys(TABS)[0];
  const key = S[state], [title, rows, cols, text, note, onRender] = TABS[key];
  $('view').innerHTML = `${extraTop}<div class="tabs" role="tablist">${Object.entries(TABS).map(([k, t]) => `<button class="tab ${k === key ? 'on' : ''}" role="tab" aria-selected="${k === key}" data-t="${k}">${esc(t[0])}<span class="n">${fmt(t[1].length, 0)}</span></button>`).join('')}</div>
    ${note ? `<p class="tab-note">${note}</p>` : ''}<div id="res"></div>`;
  UI.table($('res'), { id: state + ':' + key, rows, cols: convCols(cols, HIDE[state + ':' + key] || []), name: title, match: text ? (r, q) => hit(text(r), expand(q)) : undefined, onRender });
  document.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { S[state] = b.dataset.t; route(); }));
}
const dstr = (d) => (d ? d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
const money = (v, cur = 'IDR') => { if (v == null || v === '' || !isFinite(v)) return ''; cur = cur || 'IDR'; const a = Math.abs(v);
  return cur + ' ' + (a >= 1e9 ? fmt(v / 1e9, 2) + ' M' : a >= 1e6 ? fmt(v / 1e6, 2) + ' jt' : fmt(v, cur === 'IDR' ? 0 : 2)); };
const toIDRv = (v, cur) => (cur === 'USD' ? v * (S.set.kurs || 18150) : v || 0);
const needFile = (what, hint) => `<div class="panel empty"><h3>Butuh ${what}</h3><p>${hint}</p><a class="btn primary" href="#/data">Buka Data SAP</a></div>`;

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
  const kCols = [['No. OA', (d) => `<span class="mono">${esc(d.doc)}</span>`, '', (d) => d.doc], ['Vendor', (d) => esc(d.vendor)], ['Kelompok barang', (d) => esc(d.kel || ''), '', (d) => d.kel || ''], ['PIC', (d) => esc(d.pic)],
    ['Berakhir', (d) => dstr(d.end), '', (d) => dstr(d.end)], ['Sisa hari', (d) => fmt(d.sisaHari, 0), 'num', (d) => d.sisaHari],
    ['Target', (d) => money(d.target, d.currency), 'num', (d) => d.target], ['Terpakai', (d) => money(d.released, d.currency), 'num', (d) => d.released],
    ['Sisa', (d) => money(d.sisa, d.currency), 'num', (d) => d.sisa], ['% Sisa', (d) => fmt(d.pctSisa * 100, 0) + '%', 'num', (d) => d.pctSisa],
    ['Item', (d) => fmt(d.items, 0), 'num', (d) => d.items], ['Dipakai MRP', (d) => fmt(usedBy.get(d.doc) || 0, 0), 'num', (d) => usedBy.get(d.doc) || 0],
    ['Status', st, '', stTxt]];
  const TABS = {
    list: ['Kontrak', docs, kCols, (d) => d.doc + ' ' + d.vendor + ' ' + d.pic],
    renew: ['Perlu perpanjangan / amandemen', renew, kCols.concat([['Nilai To Order MRP', (d) => money(orderBy.get(d.doc) || 0, d.currency), 'num', (d) => orderBy.get(d.doc) || 0]]), (d) => d.doc + ' ' + d.vendor,
      'Kontrak yang habis ≤ 180 hari atau sisa nilainya < 20%. "Dipakai MRP" = jumlah material yang Min/Max-nya mengandalkan kontrak ini.'],
    items: ['Item kontrak', S.me3n.items, [['No. OA', (i) => `<span class="mono">${esc(i.doc)}</span>`, '', (i) => i.doc], ['Item', (i) => esc(i.item)], ['Material', (i) => `<a class="mono mlink" href="#" data-mat="${esc(i.material)}">${esc(i.material)}</a>`, '', (i) => i.material],
      ['Deskripsi', (i) => esc(i.desc)], ['UoM', (i) => esc(i.uom)], ['Harga', (i) => money(i.price, i.k.currency), 'num', (i) => i.price],
      ['Target qty', (i) => fmt(i.targetQty), 'num', (i) => i.targetQty], ['Terpakai qty', (i) => fmt(i.releasedQty), 'num', (i) => i.releasedQty],
      ['% pakai', (i) => (i.targetQty ? fmt((i.releasedQty / i.targetQty) * 100, 0) + '%' : '-'), 'num', (i) => (i.targetQty ? i.releasedQty / i.targetQty : '')], ['Vendor', (i) => esc(i.k.vendor)]],
      (i) => i.doc + ' ' + i.material + ' ' + i.desc + ' ' + i.k.vendor],
  };
  if (S.me2n) {
    const lCols = (extra) => [['Dokumen', (l) => `<span class="mono">${esc(l.doc)}</span>/${esc(l.item)}`, '', (l) => l.doc + '/' + l.item], ['Jenis', (l) => pill(l.type, l.type === 'RO' ? 'info' : 'mute'), '', (l) => l.type],
      ['Plant', (l) => esc(l.plant)], ['Material', (l) => `<a class="mono mlink" href="#" data-mat="${esc(l.material)}">${esc(l.material)}</a>`, '', (l) => l.material], ['Deskripsi', (l) => esc(l.desc)], ['Vendor', (l) => esc(l.vendor)],
      ['Tgl kirim', (l) => dstr(l.delivery), '', (l) => dstr(l.delivery)], ['Sisa kirim', (l) => fmt(l.openQty) + ' ' + esc(l.uom), 'num', (l) => l.openQty],
      ['Nilai sisa', (l) => money(l.openValue, l.currency), 'num', (l) => l.openValue]].concat(extra);
    TABS.open = ['PO/RO berjalan', lines, lCols([['Status', (l) => (l.lateDays ? pill('Terlambat ' + l.lateDays + ' hr', 'low') : pill('Sesuai jadwal', 'ok')), '', (l) => (l.lateDays ? 'Terlambat ' + l.lateDays : 'OK')]]), (l) => l.doc + ' ' + l.material + ' ' + l.desc + ' ' + l.vendor + ' ' + l.plant];
    TABS.late = ['Pengiriman terlambat', late, lCols([['Terlambat', (l) => pill(l.lateDays + ' hari', l.lateDays > 30 ? 'low' : 'warn'), 'num', (l) => l.lateDays]]), (l) => l.doc + ' ' + l.material + ' ' + l.desc + ' ' + l.vendor + ' ' + l.plant,
      'Baris PO/RO yang tanggal kirimnya sudah lewat tetapi barang belum diterima penuh. Tindak lanjut ke vendor / PIC kontrak.'];
  }
  tabbed('kTab', TABS, srcLine('me3n', 'me2n') + (S.me2n ? '' : '<div class="banner">Tambahkan ME2N untuk melihat PO/RO berjalan dan pengiriman terlambat.</div>'));
};


// ---------- Expediting (format mengikuti sheet "Expediting" MIM Z1) ----------
const ex = { all() { return store.get('expediting') || {}; }, get(k) { return this.all()[k] || {}; }, set(k, v) { const a = this.all(); a[k] = v; store.set('expediting', a); } };
const MANUAL = ['', 'Menunggu approval', 'Dalam pengiriman', 'Terlambat', 'Selesai', 'Batal'];
const fieldName = (plants) => plants.split(', ').map((p) => (PLANT_NAME[p] ? 'PEP ' + PLANT_NAME[p] : p)).join(', ');
PAGES.expediting = function () {
  if (!S.me2n) { $('view').innerHTML = needFile('file ME2N', 'Expediting dibaca dari ME2N (PO/RO). Tambahkan MB51 untuk status GR gudang dan MB25 untuk reservasi.'); return; }
  const allPlants = [...new Set(S.me2n.lines.map((l) => l.plant).filter(Boolean))].sort();
  const sel = new Set(store.get('expPlants') || allPlants), stockOnly = store.get('expStockOnly') ?? true;
  const today = new Date(), t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const rows = Trace.expediting(S.me2n, S.mb51, today, { plants: sel, stockOnly }).map((e) => {
    const m = ex.get(e.doc); const kontr = m.kontrak ? new Date(m.kontrak) : null;
    let status = e.status, cls = e.cls, late = e.lateDays;
    if (e.open > 0 && kontr && kontr < t0) { late = Math.round((t0 - kontr) / 864e5); if (!e.inspeksi) { status = 'Terlambat'; cls = 'low'; } }
    if (m.manual) { status = m.manual; cls = m.manual === 'Terlambat' ? 'low' : m.manual === 'Selesai' ? 'ok' : m.manual === 'Batal' ? 'mute' : m.manual === 'Menunggu approval' ? 'warn' : 'info'; }
    const mundur = kontr && e.deliv ? Math.round((e.deliv - kontr) / 864e5) : 0;
    return Object.assign({}, e, { status, cls, late, kontr, mundur, note: m.note || '', manual: m.manual || '' });
  });
  const aktif = rows.filter((e) => e.open > 0 && e.manual !== 'Selesai' && e.manual !== 'Batal');
  const late = aktif.filter((e) => e.status === 'Terlambat');
  const done = rows.filter((e) => e.open <= 0 || e.manual === 'Selesai');
  // reservasi terbuka yang sudah jatuh tempo → cek apakah gudang sudah GI
  const stock = new Map(S.mb52 ? S.mb52.items.map((i) => [i.material + '|' + i.plant, i.soh]) : []);
  const resv = S.mb25 ? S.mb25.lines.filter((l) => !l.finalIssue && l.diff > 0 && (!sel.size || sel.has(l.plant)) && l.reqDate && l.reqDate <= t0)
    .map((l) => { const st = stock.get(l.material + '|' + l.plant); return Object.assign({}, l, { stock: st, telat: Math.round((t0 - l.reqDate) / 864e5),
      gi: st == null ? ['Stok tidak diketahui', 'mute'] : st >= l.diff ? ['Stok ada, belum GI', 'warn'] : st > 0 ? ['Stok kurang', 'low'] : ['Stok kosong', 'low'] }); })
    .sort((a, b) => b.telat - a.telat) : [];
  const grTxt = (e) => (!S.mb51 ? '' : e.grIn || e.grRel ? `Tiba ${fmt(e.grIn)}${e.firstIn ? ', ' + dstr(e.firstIn) : ''}; rilis ${fmt(e.grRel)}${e.lastRel ? ', ' + dstr(e.lastRel) : ''}` : 'Belum ada di MB51');
  const cols = [['No. PR', (e) => `<span class="mono">${esc(e.pr || '-')}</span>`, '', (e) => e.pr], ['No. PO/RO', (e) => `<a class="mono" href="#/lacak" data-q="${esc(e.doc)}">${esc(e.doc)}</a> <span class="muted small">${esc(e.type)}</span>${e.pr ? `<br><span class="muted small">PR ${esc(e.pr)}</span>` : ''}`, '', (e) => e.doc],
    ['Lapangan', (e) => esc(fieldName(e.plant)), '', (e) => fieldName(e.plant)], ['Deskripsi', (e) => esc(e.desc)], ['Nilai', (e) => money(e.value, e.currency), 'num', (e) => e.value], ['Mata uang', (e) => esc(e.currency)],
    ['Tgl kirim (SAP)', (e) => dstr(e.deliv), '', (e) => e.deliv],
    ['Tgl kirim kontrak', (e) => `<input type="date" class="exk" data-k="${esc(e.doc)}" value="${e.kontr ? new Date(e.kontr.getTime() - e.kontr.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) : ''}">${e.mundur > 0 ? ' ' + pill('mundur ' + e.mundur + ' hr', 'warn') : ''}`, '', (e) => (e.kontr ? dstr(e.kontr) : '')],
    ['Status', (e) => pill(e.status, e.cls) + (e.late ? ` <span class="small muted">${e.late} hari</span>` : ''), '', (e) => e.status],
    ['Terlambat (hari)', (e) => (e.late ? fmt(e.late, 0) : ''), 'num', (e) => e.late || null],
    ['Status manual', (e) => `<select class="exm" data-k="${esc(e.doc)}" aria-label="Status manual">${MANUAL.map((m) => `<option ${m === e.manual ? 'selected' : ''} value="${m}">${m || 'Otomatis'}</option>`).join('')}</select>`, '', (e) => e.manual],
    ['Catatan', (e) => `<input class="exn w-note" data-k="${esc(e.doc)}" value="${esc(e.note)}" placeholder="Tambah catatan" aria-label="Catatan">`, '', (e) => e.note],
    ['GR gudang (MB51)', (e) => esc(grTxt(e)), '', grTxt], ['Sisa kirim', (e) => fmt(e.open), 'num', (e) => e.open], ['Vendor', (e) => esc(e.vendor)]];
  HIDE['eTab:aktif'] = HIDE['eTab:late'] = HIDE['eTab:done'] = HIDE['eTab:semua'] = ['No. PR', 'Mata uang', 'Sisa kirim', 'Tgl kirim kontrak', 'Terlambat (hari)'];
  const rCols = [['Reservasi', (l) => `<a class="mono" href="#/lacak" data-q="${esc(l.resv)}">${esc(l.resv)}</a>/${esc(l.item)}`, '', (l) => l.resv], ['Plant', (l) => esc(l.plant)], ['Material', (l) => `<a class="mono mlink" href="#" data-mat="${esc(l.material)}">${esc(l.material)}</a>`, '', (l) => l.material],
    ['Deskripsi', (l) => esc(l.desc)], ['Tgl butuh', (l) => dstr(l.reqDate), '', (l) => l.reqDate], ['Lewat (hari)', (l) => fmt(l.telat, 0), 'num', (l) => l.telat], ['Sisa reservasi', (l) => fmt(l.diff) + ' ' + esc(l.uom), 'num', (l) => l.diff],
    ['Stok (MB52)', (l) => (l.stock == null ? '-' : fmt(l.stock)), 'num', (l) => l.stock], ['Status GI', (l) => pill(l.gi[0], l.gi[1]), '', (l) => l.gi[0]], ['Penerima', (l) => esc(l.recipient || l.costCenter || l.wbs)], ['Mvt', (l) => esc(l.mt)]];
  const text = (e) => e.doc + ' ' + e.pr + ' ' + e.desc + ' ' + e.vendor + ' ' + fieldName(e.plant) + ' ' + e.note;
  const note = S.mb51 ? `Data GR dari MB51 periode ${S.mb51.range ? dstr(S.mb51.range[0]) + ' s.d. ' + dstr(S.mb51.range[1]) : '-'}. Status selesai tetap dari ME2N (sisa kirim nol).` : 'Tambahkan MB51 untuk melihat kapan barang tiba (103) dan dirilis ke stok (105).';
  const TABS = {
    aktif: ['PO/RO aktif', aktif, cols, text, note], late: ['Terlambat', late, cols, text, 'Terlambat dihitung dari tanggal kirim kontrak kalau diisi (tampilkan lewat tombol Kolom), kalau tidak dari tanggal kirim di SAP.'],
    done: ['Selesai GR', done, cols, text, note], semua: ['Semua', rows, cols, text, note],
  };
  if (S.mb25) TABS.resv = ['Reservasi belum diambil', resv, rCols, (l) => l.resv + ' ' + l.material + ' ' + l.desc + ' ' + l.recipient, 'Reservasi MB25 yang tanggal butuhnya sudah lewat tetapi belum diambil penuh. Status "stok ada, belum GI" perlu ditindaklanjuti ke gudang.'];
  const filt = `<div class="filters"><span id="exPl"></span><label class="radio"><input type="checkbox" id="exStock" ${stockOnly ? 'checked' : ''}> Hanya material stock</label></div>${srcLine('me2n', 'mb51', 'mb25')}`;
  tabbed('eTab', TABS, filt);
  UI.multi($('exPl'), { label: 'Plant', options: allPlants.map((p) => ({ value: p, label: plantLabel(p) })), selected: sel, onChange: (x) => { store.set('expPlants', [...x]); clearTimeout(window._exT); window._exT = setTimeout(route, 500); } });
  $('exStock').onchange = (e) => { store.set('expStockOnly', e.target.checked); route(); };
  const bind = () => {
    document.querySelectorAll('.exn').forEach((i) => (i.onchange = () => { const v = ex.get(i.dataset.k); v.note = i.value.trim(); ex.set(i.dataset.k, v); }));
    document.querySelectorAll('.exm').forEach((i) => (i.onchange = () => { const v = ex.get(i.dataset.k); v.manual = i.value; ex.set(i.dataset.k, v); route(); }));
    document.querySelectorAll('.exk').forEach((i) => (i.onchange = () => { const v = ex.get(i.dataset.k); v.kontrak = i.value || null; ex.set(i.dataset.k, v); route(); }));
    document.querySelectorAll('a[data-q]').forEach((a) => (a.onclick = () => sessionStorage.setItem('lacakQ', a.dataset.q)));
  };
  bind(); new MutationObserver(bind).observe($('res'), { childList: true, subtree: true });
};

// ---------- Lacak material ----------
// To Order yang bisa diklik → panel material langsung membuka penjelasan hitungan MRP plant tsb
const calcA = (r, html) => `<a href="#" class="calclink" data-mat="${esc(r.material)}" data-p="${esc(r.plant)}" title="Lihat cara hitung Min/Max dan To Order">${html}</a>`;
// Kolom dokumen pengadaan: PR, PO/RO, dan OA dipisah; OA bisa diklik → pop-up kontrak
const oaLink = (oa) => (oa ? `<a href="#" class="mono oalink" data-oa="${esc(oa)}">${esc(oa)}</a>` : '<span class="muted">-</span>');
const docCols = () => [['PR', (l) => (l.pr ? `<a href="#" class="mono lm" data-m="${esc(l.pr)}">${esc(l.pr)}</a>` : '<span class="muted">-</span>')],
  ['PO/RO', (l) => `<a href="#" class="mono lm" data-m="${esc(l.doc)}">${esc(l.doc)}</a><span class="muted small">/${esc(l.item)}</span> ${pill(l.type, l.type === 'RO' ? 'info' : 'mute')}`], ['OA', (l) => oaLink(l.oa)]];
PAGES.lacak = function () {
  const q0 = sessionStorage.getItem('lacakQ') || S.lacakQ || ''; sessionStorage.removeItem('lacakQ');
  const have = [S.me2n && 'ME2N', S.mb51 && 'MB51', S.mb25 && 'MB25', S.mb52 && 'MB52', S.mrpRes && 'MRP'].filter(Boolean);
  $('view').innerHTML = `<div class="panel"><div class="lacak-bar"><input id="lq" type="search" aria-label="Kata kunci" placeholder="Kode material, No. PO/RO, No. PR, No. OA, atau No. reservasi" value="${esc(q0)}"><button class="btn primary" id="lgo">Lacak</button></div>
    <p class="muted small">Data yang dimuat: ${have.length ? have.join(', ') : 'belum ada'}.</p></div><div id="lres"></div>`;
  const go = () => {
    const q = $('lq').value.trim(); S.lacakQ = q; if (!q) { $('lres').innerHTML = ''; return; }
    const out = [];
    // 1) dokumen PO/RO atau PR
    const poLines = S.me2n ? S.me2n.lines.filter((l) => l.doc === q || l.pr === q || l.oa === q) : [];
    poLines.sort((a, b) => (b.docDate || 0) - (a.docDate || 0));
    const isOA = !!(S.me3n && S.me3n.docs.has(q));
    const resvLines = S.mb25 ? S.mb25.lines.filter((l) => l.resv === q) : [];
    const resvMoves = S.mb51 ? S.mb51.moves.filter((m) => m.resv === q) : [];
    let mats = new Set();
    if (poLines.length) {
      const shown = poLines.slice(0, 100);
      out.push(`<div class="panel"><h3>Dokumen ${esc(q)}${isOA ? ` <a href="#" class="btn oalink" data-oa="${esc(q)}">Buka kontrak</a>` : ''}</h3>${poLines.length > shown.length ? `<p class="muted small">${fmt(poLines.length, 0)} baris, tampil 100 terbaru. Semua RO ada di pop-up kontrak (bisa dicari dan diunduh).</p>` : ''}` + plainTable(shown, [...docCols(), ['Plant', (l) => esc(l.plant)],
        ['Material', (l) => `<a href="#" class="mono lm" data-m="${esc(l.material)}">${esc(l.material)}</a>`], ['Deskripsi', (l) => esc(l.desc)], ['Qty', (l) => fmt(l.qty) + ' ' + esc(l.uom), 'num'], ['Sisa kirim', (l) => fmt(l.openQty), 'num'],
        ['Jadwal', (l) => dstr(l.delivery)], ['GR (MB51)', (l) => { const g = S.mb51 && S.mb51.gr.get(l.doc + '|' + String(+l.item || l.item)); return g ? `Tiba ${fmt(g.inQty)}, rilis ${fmt(g.relQty)}` : ''; }], ['Vendor', (l) => esc(l.vendor)]]) + '</div>');
      if (!isOA) poLines.forEach((l) => mats.add(l.material + '|' + l.plant)); // OA bisa punya ratusan RO: rinciannya di pop-up kontrak
    } else if (isOA) out.push(`<div class="panel"><h3>Kontrak ${esc(q)}</h3><p class="muted">Belum ada RO dari OA ini di ME2N. <a href="#" class="oalink" data-oa="${esc(q)}">Buka kontrak</a></p></div>`);
    if (resvLines.length || resvMoves.length) {
      out.push(`<div class="panel"><h3>Reservasi ${esc(q)}</h3>` + (resvLines.length ? plainTable(resvLines, [['Item', (l) => esc(l.item)], ['Plant', (l) => esc(l.plant)], ['Material', (l) => `<a href="#" class="mono lm" data-m="${esc(l.material)}">${esc(l.material)}</a>`], ['Deskripsi', (l) => esc(l.desc)],
        ['Butuh', (l) => dstr(l.reqDate)], ['Diminta', (l) => fmt(l.reqQty), 'num'], ['Sudah GI', (l) => fmt(l.removed), 'num'], ['Sisa', (l) => fmt(l.diff), 'num'], ['Penerima', (l) => esc(l.recipient || l.costCenter)]]) : '<p class="muted">Tidak ada di MB25 (mungkin sudah selesai).</p>') +
        (resvMoves.length ? '<h4>GI dari gudang (MB51)</h4>' + plainTable(resvMoves, [['Tanggal', (m) => dstr(m.date)], ['Mvt', (m) => esc(m.mt + ' ' + m.mtText)], ['Material', (m) => esc(m.material)], ['Qty', (m) => fmt(m.qty) + ' ' + esc(m.uom), 'num'], ['Dok. material', (m) => esc(m.matDoc)], ['Keterangan', (m) => esc(m.header)]]) : '') + '</div>');
      resvLines.forEach((l) => mats.add(l.material + '|' + l.plant));
    }
    // 2) material
    const isMat = (S.mb52 && S.mb52.items.some((i) => i.material === q)) || (S.mrpRes && [...S.mrpRes.values()].some((r) => r.material === q)) || (S.me2n && S.me2n.lines.some((l) => l.material === q)) || (S.mb51 && S.mb51.moves.some((m) => m.material === q));
    if (isMat) mats = new Set([q + '|']);
    if (!out.length && !isMat) { $('lres').innerHTML = `<div class="panel empty">Tidak ditemukan di data yang dimuat.</div>`; return; }
    for (const key of mats) {
      const [mat, plant] = key.split('|');
      const ev = Trace.traceMaterial(mat, plant || null, { me2n: S.me2n, mb51: S.mb51, mb25: S.mb25 });
      const stockRows = S.mb52 ? S.mb52.items.filter((i) => i.material === mat && (!plant || i.plant === plant)) : [];
      const mrpRows = S.mrpRes ? [...S.mrpRes.values()].filter((r) => r.material === mat && (!plant || r.plant === plant)) : [];
      const desc = (stockRows[0] && stockRows[0].desc) || (mrpRows[0] && mrpRows[0].desc) || (ev[0] && '') || '';
      const docs = !poLines.length && S.me2n ? S.me2n.lines.filter((l) => l.material === mat && (!plant || l.plant === plant) && !l.deleted).sort((a, b) => (b.docDate || 0) - (a.docDate || 0)) : [];
      const stepCls = { PR: 'mute', PO: 'info', RO: 'info', 'GR (inspeksi)': 'warn', 'GR (rilis stok)': 'ok', Reservasi: 'warn', GI: 'low', Transfer: 'mute' };
      out.push(`<div class="panel"><h3>Material <span class="mono">${esc(mat)}</span>${plant ? ' · ' + esc(plantLabel(plant)) : ''}</h3><p class="muted">${esc(desc)}</p>
        <div class="grid">${stockRows.length ? `<div><b>Stok sekarang (MB52)</b>${plainTable(stockRows, [['Plant', (i) => esc(i.plant)], ['Unrestricted', (i) => fmt(i.sohNormal != null ? i.sohNormal : i.soh) + ' ' + esc(i.uom), 'num'], ['Val. type lain', (i) => (i.sohOther ? fmt(i.sohOther) : ''), 'num'], ['In transit', (i) => (i.transit ? fmt(i.transit) : ''), 'num'], ['Nilai', (i) => money(i.value, stockCur(i.plant)), 'num']])}</div>` : ''}
        ${mrpRows.length ? `<div><b>MRP</b>${plainTable(mrpRows, [['Plant', (r) => esc(r.plant)], ['Aging', (r) => agingPill(r.aging)], ['Min', (r) => fmt(r.min2), 'num'], ['Max', (r) => fmt(r.max2), 'num'], ['OS PO', (r) => fmt(r.ospo), 'num'], ['Reservasi', (r) => fmt(r.mb25), 'num'], ['To Order', (r) => calcA(r, fmt(r.toOrder)), 'num'], ['Kontrak', (r) => oaLink(r.oa)]])}</div>` : ''}</div>
        ${docs.length ? `<h4>PR, PO/RO, dan OA (${fmt(docs.length, 0)})</h4>${plainTable(docs, [...docCols(), ['Plant', (l) => esc(l.plant)], ['Tgl dokumen', (l) => dstr(l.docDate)], ['Qty', (l) => fmt(l.qty) + ' ' + esc(l.uom), 'num'], ['Sisa kirim', (l) => fmt(l.openQty), 'num'], ['Jadwal', (l) => dstr(l.delivery)], ['Vendor', (l) => esc(l.vendor)]])}` : ''}
        <h4>Jejak (${fmt(ev.length, 0)} kejadian)</h4>${ev.length ? `<ol class="timeline">${ev.map((e) => `<li><span class="when">${dstr(e.date)}</span>${pill(e.step, stepCls[e.step] || 'mute')} <span class="mono small">${esc(e.plant)}</span> ${esc(e.text)} <b class="${e.qty < 0 ? 'neg' : ''}">${fmt(e.qty)} ${esc(e.uom)}</b></li>`).join('')}</ol>` : '<p class="muted">Belum ada kejadian di ME2N/MB51/MB25.</p>'}</div>`);
    }
    $('lres').innerHTML = out.join('');
    document.querySelectorAll('#lres .lm').forEach((a) => (a.onclick = (e) => { e.preventDefault(); $('lq').value = a.dataset.m; go(); }));
  };
  $('lgo').onclick = go; $('lq').onkeydown = (e) => { if (e.key === 'Enter') go(); }; go();
};

// ---------- Vendor & PR/PO ----------
const vc = { all() { return store.get('vendorContacts') || {}; }, get(k) { return this.all()[k] || {}; }, set(k, v) { const a = this.all(); a[k] = v; store.set('vendorContacts', a); } };
const kimapGroup = (m) => { const g = Master.mgOf(m); return g ? `MG ${g.mg} ${g.mgName}` : 'KIMAP ' + (m || '').slice(0, 4); };
PAGES.order = function () {
  if (!S.mrpRes) { $('view').innerHTML = needFile('file MRP', 'Draft RO/PR dihitung dari mesin MRP. Upload file MRP (dan ME3N/ME2N agar status kontrak & PO terbaru).'); return; }
  mrpSwitch();
  const res = mrpRows();
  const mbPrice = new Map(S.mb52 ? S.mb52.items.filter((i) => i.soh > 0).map((i) => [i.material + '|' + i.plant, i.price]) : []);
  const oePrice = (r) => { const lp = S.me2n && (S.me2n.lastPrice.get(r.material) || (r.kimap && S.me2n.lastPrice.get(r.kimap)));
    if (lp) return { price: lp.price, currency: lp.currency, src: 'PO terakhir ' + dstr(lp.date) }; const p = mbPrice.get(r.key); return p ? { price: p, currency: stockCur(r.plant), src: 'Harga rata-rata stok' } : { price: 0, currency: '', src: 'Belum ada harga' }; };
  const orders = res.filter((r) => r.toOrder > 0);
  const ro = orders.filter((r) => r.contract).map((r) => Object.assign({ r }, { value: r.toOrder * r.contract.price }));
  const pr = orders.filter((r) => !r.contract).map((r) => { const p = oePrice(r); return { r, p, value: r.toOrder * p.price, grp: kimapGroup(r.material) }; });
  // sisa kontrak cukup?
  const roByDoc = new Map(); ro.forEach((o) => roByDoc.set(o.r.contract.doc, (roByDoc.get(o.r.contract.doc) || 0) + o.value));
  const kand = new Map();
  res.filter((r) => !r.contract && r.alt && /^Rutin/.test(r.alt.tko.cls || '') && r.alt.tko.amu > 0).forEach((r) => {
    const k = kand.get(r.material) || { material: r.material, desc: r.desc, uom: r.uom, plants: [], qty: 0, value: 0, grp: kimapGroup(r.material), order: 0 };
    const p = oePrice(r), a = r.alt.tko.amu; k.plants.push(r.plant); k.qty += a * 12; k.value += a * 12 * toIDRv(p.price || 0, p.currency); k.order += r.toOrder; k.priceSrc = p.src; kand.set(r.material, k);
  });
  const kandidat = [...kand.values()].sort((a, b) => b.value - a.value);
  const ven = Contract.vendors(S.me3n, S.me2n);
  const roText = (doc) => { const its = ro.filter((o) => o.r.contract.doc === doc); const k = its[0].r.contract;
    return `Yth. ${k.vendor},\n\nBerikut rencana Release Order atas kontrak ${doc}:\n\n` + its.map((o, i) => `${i + 1}. ${o.r.material} - ${o.r.desc} : ${fmt(o.r.toOrder)} ${o.r.contract.uom || o.r.uom} (plant ${o.r.plant})`).join('\n') + `\n\nMohon konfirmasi ketersediaan dan jadwal pengiriman.\n\nTerima kasih.`; };
  const TABS = {
    ro: ['Draft RO (ada kontrak)', ro, [['No. OA', (o) => `<span class="mono">${esc(o.r.contract.doc)}</span><br><span class="muted small">item ${esc(o.r.contract.item)}</span>`, '', (o) => o.r.contract.doc], ['Vendor', (o) => esc(o.r.contract.vendor)], ['PIC', (o) => esc(o.r.contract.pic)],
      ['Plant', (o) => esc(o.r.plant)], ['Material', (o) => `<a class="mono mlink" href="#" data-mat="${esc(o.r.material)}">${esc(o.r.material)}</a>`, '', (o) => o.r.material], ['Deskripsi', (o) => esc(o.r.desc)],
      ['Qty', (o) => `<a href="#" class="calclink" data-mat="${esc(o.r.material)}" data-p="${esc(o.r.plant)}" title="Lihat rumus Min/Max dan To Order">${fmt(o.r.toOrder)}</a>`, 'num', (o) => o.r.toOrder], ['UoM', (o) => esc(o.r.contract.uom || o.r.uom)], ['Harga kontrak', (o) => money(o.r.contract.price, o.r.contract.currency), 'num', (o) => o.r.contract.price],
      ['Nilai', (o) => money(o.value, o.r.contract.currency), 'num', (o) => o.value], ['Mata uang', (o) => esc(o.r.contract.currency)],
      ['Sisa kontrak cukup?', (o) => (roByDoc.get(o.r.contract.doc) <= o.r.contract.sisa ? pill('Cukup', 'ok') : pill('Kurang', 'low')), '', (o) => (roByDoc.get(o.r.contract.doc) <= o.r.contract.sisa ? 'Cukup' : 'Kurang')],
      ['Sisa hari', (o) => fmt(o.r.contract.sisaHari, 0), 'num', (o) => o.r.contract.sisaHari],
      ['Kontak', (o) => `<button class="btn ghost mail" data-doc="${esc(o.r.contract.doc)}" data-v="${esc(o.r.contract.vendorCode || o.r.contract.vendor)}">Email vendor</button>`, '', () => '', false]],
      (o) => o.r.contract.doc + ' ' + o.r.contract.vendor + ' ' + o.r.material + ' ' + o.r.desc, 'Item To Order yang tercover kontrak aktif → terbitkan RO. Kontrak dipilih dengan prioritas X07 → X02 → X10 → X03.'],
    pr: ['Draft PR + OE (tanpa kontrak)', pr, [['Kelompok', (o) => esc(o.grp), '', (o) => o.grp], ['Plant', (o) => esc(o.r.plant)], ['Material', (o) => `<a class="mono mlink" href="#" data-mat="${esc(o.r.material)}">${esc(o.r.material)}</a>`, '', (o) => o.r.material],
      ['Deskripsi', (o) => esc(o.r.desc)], ['Qty', (o) => `<a href="#" class="calclink" data-mat="${esc(o.r.material)}" data-p="${esc(o.r.plant)}" title="Lihat rumus Min/Max dan To Order">${fmt(o.r.toOrder)}</a>`, 'num', (o) => o.r.toOrder], ['UoM', (o) => esc(o.r.uom)],
      ['Harga OE', (o) => (o.p.price ? money(o.p.price, o.p.currency) : pill('Belum ada', 'warn')), 'num', (o) => o.p.price], ['Sumber harga', (o) => esc(o.p.src)],
      ['Nilai OE', (o) => money(o.value, o.p.currency), 'num', (o) => o.value], ['Mata uang', (o) => esc(o.p.currency)], ['Kelas', (o) => esc(o.r.cls || o.r.aging)]],
      (o) => o.grp + ' ' + o.r.material + ' ' + o.r.desc, 'Item To Order tanpa kontrak → PR + Owner Estimate. Dikelompokkan per Material Group untuk kode material baru (12 karakter), dan per 4 digit awal KIMAP untuk kode lama. Harga OE dari PO terakhir (ME2N), atau harga rata-rata stok.'],
    kandidat: ['Kandidat kontrak', kandidat, [['Kelompok', (k) => esc(k.grp), '', (k) => k.grp], ['Material', (k) => `<a class="mono mlink" href="#" data-mat="${esc(k.material)}">${esc(k.material)}</a>`, '', (k) => k.material], ['Deskripsi', (k) => esc(k.desc)],
      ['Plant', (k) => esc(k.plants.join(', '))], ['Kebutuhan/thn', (k) => fmt(k.qty) + ' ' + esc(k.uom), 'num', (k) => k.qty], ['Est. nilai/thn', (k) => money(k.value, 'IDR'), 'num', (k) => k.value],
      ['To Order sekarang', (k) => fmt(k.order), 'num', (k) => k.order], ['Sumber harga', (k) => esc(k.priceSrc)]], (k) => k.grp + ' ' + k.material + ' ' + k.desc,
      'Material rutin (FS) yang belum punya kontrak aktif. Sesuai Pedoman, item rutin/bottleneck sebaiknya dibuatkan kontrak jangka panjang (OA/COO) agar lead time turun dan stok bisa lebih tipis.'],
    vendor: ['Vendor', ven, [['Kode', (v) => esc(v.code)], ['Vendor', (v) => esc(v.name)], ['Kontrak', (v) => fmt(v.kontrak, 0), 'num', (v) => v.kontrak], ['Dok. PO/RO', (v) => fmt(v.po, 0), 'num', (v) => v.po],
      ['Nilai sisa kirim', (v) => money(v.openValue, 'IDR'), 'num', (v) => v.openValue],
      ['Email', (v) => `<input class="vc" data-k="${esc(v.code || v.name)}" data-f="email" value="${esc(vc.get(v.code || v.name).email || '')}" placeholder="email">`, '', (v) => vc.get(v.code || v.name).email || ''],
      ['Telepon', (v) => `<input class="vc" data-k="${esc(v.code || v.name)}" data-f="tel" value="${esc(vc.get(v.code || v.name).tel || '')}" placeholder="telp/WA">`, '', (v) => vc.get(v.code || v.name).tel || ''],
      ['Nama kontak', (v) => `<input class="vc" data-k="${esc(v.code || v.name)}" data-f="pic" value="${esc(vc.get(v.code || v.name).pic || '')}" placeholder="nama">`, '', (v) => vc.get(v.code || v.name).pic || '']],
      (v) => v.code + ' ' + v.name, 'Kontak vendor hanya tersimpan di browser ini, tidak ke GitHub. Dipakai untuk tombol Email vendor di Draft RO.'],
  };
  tabbed('oTab', TABS, mrpNote() + srcLine('mrp', 'me3n', 'me2n', 'mb51') + (S.me3n ? '' : '<div class="banner warn">Status kontrak masih dari file MRP. Tambahkan ME3N dan ME2N supaya kontrak, harga, dan OS PO terbaru.</div>'));
  // event: kontak vendor & email
  const bindRes = () => {
    document.querySelectorAll('.vc').forEach((i) => (i.onchange = () => { const c = vc.get(i.dataset.k); c[i.dataset.f] = i.value.trim(); vc.set(i.dataset.k, c); }));
    document.querySelectorAll('.mail').forEach((b) => (b.onclick = () => {
      const c = vc.get(b.dataset.v); const doc = b.dataset.doc;
      if (!c.email) { alertBox('Email vendor belum diisi. Isi dulu di tab Vendor.'); return; }
      location.href = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent('Rencana Release Order kontrak ' + doc)}&body=${encodeURIComponent(roText(doc))}`;
    }));
  };
  bindRes(); new MutationObserver(bindRes).observe($('res'), { childList: true, subtree: true });
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
      h += `<div class="plain-wrap"><table class="plain"><tr>${cells(body[0]).map((c) => `<th>${inline(c)}</th>`).join('')}</tr>${body.slice(1).map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</table></div>`; continue; }
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
      <div class="panel"><h3>Urutan hitung per material + plant</h3><ol class="steps">
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
      <div class="panel"><h3>Coba hitung</h3><div class="params" id="sim">
        ${[['amu', 'AMU (per bulan)', 4], ['lt', 'Lead time (bln)', 3], ['sd', 'Std. deviasi pemakaian bulanan', 3], ['st', 'Stok', 10], ['po', 'OS PO/RO', 0], ['rs', 'Reservasi (MB25)', 0]].map(([k, t, v]) => `<label>${t}<span><input type="number" step="0.5" min="0" data-k="${k}" value="${v}"></span></label>`).join('')}
        <label>Kontrak<span><select data-k="kon"><option value="Yes">Ada</option><option value="No">Belum ada</option></select></span></label>
        <label>Chemical/catalyst<span><select data-k="chem"><option value="0">Bukan</option><option value="1">Ya</option></select></span></label>
      </div><div id="simOut" class="sim-out"></div></div>`],
    kat: ['Kategori & Aging', `
      <div class="panel"><h3>Kategori stock dan perlakuannya di web</h3><div class="plain-wrap"><table class="plain">
        <tr><th>Kategori</th><th>Siapa</th><th>Safety stock</th><th>Min / Max</th><th>Cara pesan</th></tr>
        <tr><td>Program</td><td>Cat = Project, kebutuhan program (TA/OH, drilling, WS)</td><td>0</td><td>Tidak ada</td><td>RKM + reservasi − (stok + PO)</td></tr>
        <tr><td>Rutin chemical</td><td>FS, deskripsi chemical/catalyst</td><td>${P.chemSSMonths} bln × AMU</td><td>ROP = AMU×T+SS · Max = AMU×(P+T)+SS</td><td>Isi sampai Max</td></tr>
        <tr><td>Rutin maintenance</td><td>FS lainnya${P.mdAsFS ? ' (+ MD)' : ''}</td><td>z × SdMI × √T</td><td>ROP = AMU×T+SS · Max = ${esc(maxTxt)}</td><td>Isi sampai Max</td></tr>
        <tr><td>Rutin slow</td><td>MD${P.mdAsFS ? ' (bila opsi MD→FS dimatikan)' : ''}</td><td>z × SdMI × √T</td><td>Min = Max = SS</td><td>Sampai SS</td></tr>
        <tr><td>On Demand</td><td>SP / DS</td><td>0</td><td>Tidak ada</td><td>Reservasi/RKM − (stok + PO)</td></tr>
        <tr><td>Insurance / Critical</td><td>Belum ada data</td><td>Rekomendasi user</td><td>—</td><td>Upcoming</td></tr>
      </table></div><p class="muted small">Penanda chemical sementara ditebak dari deskripsi. Nanti diganti Material Group / logika KIMAP.</p></div>
      <div class="panel"><h3>Kenapa Max dibedakan kontrak vs tanpa kontrak?</h3>
        <p>Item yang punya kontrak cukup dibuatkan RO (lead time pendek), jadi stok bisa dijaga tipis (rumus B). Item tanpa kontrak harus lewat PR + OE (± ${P.nonContractLT} bln), jadi sekali pesan dibuat cukup untuk ± ${P.roqMonths} bln (rumus C) agar PR tidak terlalu sering.</p>
        <p>Item rutin yang belum punya kontrak adalah kandidat kontrak jangka panjang (OA/COO). Begitu berkontrak, lead time turun dan stok bisa lebih tipis.</p></div>`],
    rkm: ['RKM & Material', `
      <div class="panel"><h3>Peran RKM</h3><ul>
        <li>MRP adalah metodenya, RKM adalah input dari user (jumlah dan bulan kebutuhan 2027).</li>
        <li>Basis kebutuhan diatur di Pengaturan: <b>${esc(BASIS[S.set.basis])}</b>.</li>
        <li>Untuk item Program / On Demand, RKM langsung jadi kebutuhan pesan (RKM − stok − PO).</li>
        <li>Long Lead Item: item dengan LT ≥ ${S.set.lliLT} bln, diberi bulan "pesan paling lambat" = bulan butuh − LT.</li></ul></div>
      <div class="panel"><h3>Cara RKM dicocokkan ke MRP</h3><ol class="steps">
        <li>KIMAP RKM = Material di MRP (plant sama)</li><li>KIMAP RKM = KIMAP Final di MRP</li>
        <li>KIMAP RKM ditemukan di master LeadTime → Material → MRP</li><li>Kalau tanpa KIMAP: deskripsi persis sama dan unik di plant itu</li></ol>
        <p class="muted small">Yang tidak cocok masuk tab "RKM tanpa MRP". Kalau ada di master LeadTime, web memberi usulan Min/Max dari RKM.</p></div>`],
    pedoman: ['Pedoman / TKO', S.regulasi ? `<div class="panel md"><p class="muted small">Dibaca dari file lokal <b>${esc(S.regulasi.name)}</b>. Tidak tersimpan di web/GitHub.</p>${md(S.regulasi.text)}</div>`
      : `<div class="panel empty"><h3>Ringkasan Pedoman belum dimuat</h3>
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
      $('simOut').innerHTML = `<div class="kv">${[['Kategori', esc(r.cls)], ['T efektif', fmt(r.tEff) + ' bln'], ['Safety stock', fmt(r.ss)], ['Min (ROP)', fmt(r.min2)], ['Max', fmt(r.max2)], ['To Order', fmt(r.toOrder)]].map(([k, x]) => `<div><span>${k}</span><b>${x}</b></div>`).join('')}</div>`;
    };
    document.querySelectorAll('#sim input, #sim select').forEach((el) => (el.oninput = el.onchange = run)); run();
  }
};

function soon(r) { $('view').innerHTML = `<div class="panel empty"><h3>${esc(r[1])}</h3><p>Sedang disiapkan (${esc(r[4] || '')}).</p></div>`; }
