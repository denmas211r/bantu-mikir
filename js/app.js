// ============ MIM Inventory Analyst — App (routing + halaman) ============
const ICON = {
  home: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
  recycle: '<path d="M7 19H4l2.5-3.5M17 5h3l-2.5 3.5M4.5 15.5A8 8 0 0 0 18 17M19.5 8.5A8 8 0 0 0 6 7"/>',
  flow: '<path d="M4 8h14M14 4l4 4-4 4M20 16H6M10 12l-4 4 4 4"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6h.01M4 12h.01M4 18h.01" stroke-width="3"/>',
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

// Menu: [grup, [[route, label, icon]]]. Penjelasan fitur tidak ditaruh di menu; arti warna/tanda ada di tombol Info (kanan atas).
const MENU = [
  ['', [['beranda', 'Beranda', 'home']]],
  ['Material Planning', [
    ['analysis', 'Material Analysis', 'route'],
    ['control', 'Material Control', 'gauge'],
  ]],
  ['Contract & Expediting', [
    ['kontrak', 'Kontrak', 'doc'],
    ['po', 'Pesanan', 'truck'],
    ['gerak', 'Keluar-Masuk Barang', 'flow'],
  ]],
  // Performance & Reporting (Analisis Warehouse, Deadstock & BAU) disembunyikan dulu di versi basic; kodenya tetap di beranda.js dan optim.js.
  ['Governance', [['aturan', 'Dokumen Aturan', 'book']]],
  ['Data', [['data', 'Sumber Data', 'db'], ['padanan', 'Padanan KIMAP', 'list']]],
  ['Bantuan', [['pengaturan', 'Pengaturan', 'gear']]],
];
// route lama (bookmark) -> route pengganti; opsi tab diset lewat fungsi
const REDIR = { cari: 'analysis', lacak: 'analysis', carilama: 'control', overview: 'control', raw: ['data', () => (S.dataTab = 'raw')], tko: 'aturan', regulasi: 'aturan', regulasilama: 'aturan', kontraklama: 'kontrak', resv: ['po', () => (S.psTab = 'resv')], resvlama: ['po', () => (S.psTab = 'resv')], expediting: 'po', geraklama: 'gerak', gudanglama: 'gudang', optimlama: 'optim', dsbau: 'optim' };
const ROUTES = Object.fromEntries(MENU.flatMap(([, items]) => items.map((i) => [i[0], i])));
const DEFAULT_MRP_PLANTS = ['W101', 'W102', 'W802', 'W803'];
const DEFAULT_ZONA = Object.assign({}, CFG.PLANT_ZONA,
  Object.fromEntries(Object.entries(Master.PHE_PLANT).map(([p, [, , z]]) => [p, z])));
const ZONA_LIST = ['Zona 1', 'Zona 4', 'Lainnya'];
const zonaOf = (p) => { const z = (S.set.zona || {})[p]; return (ZONA_LIST.includes(z) && z) || DEFAULT_ZONA[p] || 'Lainnya'; };
const ZONA_COLOR = { 'Zona 1': 'var(--z1)', 'Zona 4': 'var(--z4)', Lainnya: 'var(--z0)' };
const PLANT_NAME = Object.assign({}, CFG.PLANT_NAME,
  Object.fromEntries(Object.entries(Master.PHE_PLANT).map(([p, [n]]) => [p, n])));
const METHOD = { tko: 'Metode TKO / Pedoman (disarankan)', excel: 'Metode Excel lama (untuk validasi)' };
const TKO_FIELDS = [['amuMonths', 'AMU dari berapa bulan terakhir', 'bln'], ['nonContractLT', 'Tambahan lead time pengadaan bila tanpa kontrak', 'bln'], ['roqMonths', 'Reorder quantity (Max = ROP + n × AMU)', 'bln'], ['ssCapMonths', 'Batas safety stock maintenance/slow', 'bln × AMU'], ['chemSSMonths', 'Safety stock chemical/catalyst', 'bln × AMU'], ['chemP', 'Periode review chemical (P)', 'bln'], ['excessGeneral', 'Batas berlebih (umum)', 'bln'], ['excessChem', 'Batas berlebih (chemical)', 'bln']];

let S = null; // sesi
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 2) => (typeof n === 'number' && isFinite(n) ? n.toLocaleString(I18N.loc(), { maximumFractionDigits: d }) : '-');
const rp = (n) => (n >= 1e9 ? fmt(n / 1e9, 2) + ' M' : n >= 1e6 ? fmt(n / 1e6, 1) + ' jt' : fmt(n, 0));
const plantLabel = (p) => (PLANT_NAME[p] ? `${p} ${PLANT_NAME[p]}` : p || '-');
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
const tick = () => new Promise((r) => setTimeout(r, 30));

// ---------- Login ----------
// Sesi disimpan per tab (sessionStorage): refresh tidak perlu login lagi, tutup tab = keluar.
const SESS = 'mimSession';
async function startSession(user, role, key, raw) {
  await Cache.init(raw);
  const data = await Vault.decryptJSON(key, await (await fetch('data/data.enc.json', { cache: 'no-store' })).json());
  S = { role, data, user, mb52: null, mrpWB: null, mrpRes: null, mrp: null,
    mrpPlants: new Set(store.get('mrpPlants') || DEFAULT_MRP_PLANTS), set: Object.assign({ lang: 'id', method: 'tko', tko: {}, kurs: 18150, zona: {}, wkCur: { PEP: 'IDR', PHE: 'USD' }, pheLT: 3 }, store.get('settings') || {}), mrpWK: store.get('mrpWK') || 'PEP', src: {}, raw: {}, dash: { cur: 'IDR', wh: new Set(), zona: new Set(), wk: new Set(), open: new Set() }, gd: { cur: 'IDR', wh: new Set(), zona: new Set(), wk: new Set() }, cariView: store.get('cariView') || 'matriks', cariWK: store.get('cariWK') || 'all', kView: store.get('kView') || 'kartu' };
  I18N.set(S.set.lang); $('login').hidden = true; $('app').hidden = false;
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
    await startSession(user, role, key, raw);
    try { sessionStorage.setItem(SESS, JSON.stringify({ user, role, raw })); } catch {}
    $('p').value = '';
  } catch { $('err').textContent = 'Username atau password salah.'; }
  $('lb').disabled = false; $('lb').textContent = 'Masuk';
};
window.addEventListener('load', async () => { // pulihkan sesi saat halaman di-refresh (setelah semua script siap)
  let s; try { s = JSON.parse(sessionStorage.getItem(SESS)); } catch {}
  if (!s || !s.raw) return;
  try { await startSession(s.user, s.role, await Vault.importRaw(s.raw), s.raw); } catch { sessionStorage.removeItem(SESS); }
});
$('out').onclick = () => { sessionStorage.removeItem(SESS); location.reload(); };
$('menuBtn').onclick = () => $('sidebar').classList.toggle('open');
const setSide = (c) => { $('app').classList.toggle('collapsed', c); const t = c ? 'Tampilkan menu' : 'Sembunyikan menu'; $('collapse').title = t; $('collapse').setAttribute('aria-label', t); };
$('collapse').onclick = () => { const c = !$('app').classList.contains('collapsed'); setSide(c); store.set('sideCollapsed', c); };
setSide(!!store.get('sideCollapsed'));
window.addEventListener('hashchange', () => S && route());

// Pengaturan jadi ikon di bawah sidebar; 5 grup lain di menu utama
function buildNav() {
  $('nav').innerHTML = MENU.filter(([g]) => g !== 'Bantuan').map(([g, items]) => (g ? `<div class="nav-group">${g}</div>` : '') +
    items.map(([k, t, ic]) => `<a href="#/${k}" data-k="${k}" title="${t}">${svg(ic)}<span>${t}</span></a>`).join('')).join('');
  $('sideHelp').innerHTML = (MENU.find(([g]) => g === 'Bantuan') || [, []])[1].map(([k, t, ic]) => `<a href="#/${k}" data-k="${k}" class="side-btn" title="${t}" aria-label="${t}">${svg(ic)}</a>`).join('');
  buildZona();
}
// Toggle WK global (kanan atas): WK PEP | WK PHE | Semua. Memfilter semua halaman lewat G.zonaOk(plant) (nama lama dipertahankan).
function buildZona() {
  S.wkSel = ['PEP', 'PHE', 'all'].includes(store.get('wkSel')) ? store.get('wkSel') : 'all';
  UI.seg($('zona'), [['PEP', 'WK PEP'], ['PHE', 'WK PHE'], ['all', 'Semua']], S.wkSel, (v) => { S.wkSel = v; store.set('wkSel', v); buildZona(); document.dispatchEvent(new Event('zonachange')); });
  G.zonaOk = (p) => S.wkSel === 'all' || wkOfPlant(p) === S.wkSel;
}
function sideData() {}
function route() {
  const k = (location.hash.match(/#\/([\w-]+)/) || [, 'beranda'])[1];
  if (REDIR[k]) { const [to, fn] = [].concat(REDIR[k]); if (fn) fn(); location.hash = '#/' + to; return; }
  const r = ROUTES[k] || ROUTES.beranda;
  document.querySelectorAll('#nav a, #sideHelp a').forEach((a) => a.classList.toggle('on', a.dataset.k === r[0]));
  $('pageTitle').textContent = r[1]; $('pageSub').textContent = r[3] || ''; $('pageActions').innerHTML = ''; document.title = I18N.t(r[1]) + ' · MIM Inventory Analyst';
  $('sidebar').classList.remove('open'); UI.closePop(); UI.closeDrawer();
  if (S.rawG) { S.rawG.destroy(); S.rawG = null; S.rawTok = (S.rawTok || 0) + 1; }
  G.cleanup(); if (window.MP) MP.zonaHook = null;
  (PAGES[r[0]] || soon)(r);
  mountTables(); G.cleanup();
}

// ---------- Hitung ulang semua (MB52 + MRP + pengaturan) ----------
// MRP per WK: PEP dari file MRP; PHE dihitung dari MB52 + MB51 client 180 (sementara, sampai file MRP PHE dibuat)
function recompute() {
  S.ver = (S.ver || 0) + 1;
  // stok MRP = unrestricted ZNORMAL (valuation type lain dan in transit tidak dihitung)
  const stockMap = S.mb52 ? new Map(S.mb52.items.map((i) => [i.material + '|' + i.plant, i.sohNormal != null ? i.sohNormal : i.soh])) : null;
  const pickOf = (wk) => (S.me3n ? (S.me3n.pickWK && S.me3n.pickWK[wk]) || new Map() : null);
  const common = { stockMap, tko: S.set.tko, ospoMap: S.me2n ? S.me2n.ospo : null, mb25Map: S.mb25 ? S.mb25.open : null, chemFn: Master.isChemMG };
  const res = new Map(); S.mrpWB_PHE = null;
  if (S.mrpWB) MRP.run(S.mrpWB, Object.assign({}, common, { method: S.set.method, contractPick: pickOf('PEP') })).forEach((v, k) => res.set(k, v));
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
  betterAging(res);
  S.mrpRes = res;
  const map = new Map();
  for (const r of S.mrpRes.values()) map.set(r.plant + '|' + r.material, { min: r.min2 || 0, max: r.max2 || 0, aging: r.aging, toOrder: r.toOrder });
  S.mrp = { map, plants: [...new Set([...S.mrpRes.values()].map((r) => r.plant))].sort() };
  S.ver = (S.ver || 0) + 1;
}
// Aging "lebih baik": hitung dari SEMUA pemakaian (histori MRP + semua gerakan keluar MB51 termasuk GI ke proyek/network),
// bukan aging bawaan MRP. Material klasifikasi Project yang belum pernah terpakai = 'PJ' (bukan dead stock).
// Aging bawaan MRP disimpan di r.agingMRP; kelas MRO/Project dari kolom Cat MRP di r.kelasMat.
const OUT_MT = new Set(['221', '949']); // GI ke network/proyek: dikeluarkan dari pemakaian MRP, tapi tetap pemakaian nyata
function betterAging(res) {
  const lastUse = new Map(), nm = (v) => Number(v) || 0;
  if (S.mb51 && S.mb51.moves) for (const m of S.mb51.moves) {
    if (!m.date || !m.material || nm(m.qty) >= 0) continue; // hanya gerakan keluar
    if (!(m.cat === 'Own Use' || OUT_MT.has(String(m.mt)))) continue;
    const k = m.plant + '|' + m.material, ym = m.date.getFullYear() * 12 + m.date.getMonth();
    if (!(lastUse.get(k) >= ym)) lastUse.set(k, ym);
  }
  const now = new Date(), nowYM = now.getFullYear() * 12 + now.getMonth();
  const wbOf = (r) => (r.wk === 'PHE' ? S.mrpWB_PHE : S.mrpWB);
  res.forEach((r) => {
    r.agingMRP = r.aging; r.kelasMat = /project/i.test(r.cat || '') ? 'Project' : r.cat ? 'MRO' : '';
    let last = lastUse.get(r.plant + '|' + r.material) ?? -1;
    const L = (wbOf(r) || {}).monthLabels || [], u = r.usageAll || [];
    for (let i = u.length - 1; i >= 0; i--) if (u[i]) { const [y, mo] = String(L[i] || '').split('-').map(Number);
      if (y && mo) last = Math.max(last, (y < 100 ? 2000 + y : y) * 12 + mo - 1); break; }
    r.lastUseYM = last >= 0 ? last : null;
    if (last < 0) { r.since = Infinity; r.aging = r.kelasMat === 'Project' ? 'PJ' : 'DS'; return; }
    r.since = Math.max(0, nowYM - last);
    r.aging = r.since < 12 ? 'FS' : r.since < 24 ? 'MD' : r.since < 60 ? 'SP' : 'DS';
  });
}
// Reservasi terbuka = belum final issue, tidak dihapus, masih ada sisa. Selain itu = selesai/arsip (hanya catatan).
const resvOpen = (l) => !l.finalIssue && !l.deleted && l.diff > 0;
// Pemakaian nyata per Material|Plant per bulan (ym = tahun×12 + bulan) dari MB51: Own Use + GI ke proyek/network, hanya gerakan keluar.
function usageByMonth() {
  if (S._ubm && S._ubm.ver === S.ver && S._ubm.src === S.mb51) return S._ubm.map;
  const map = new Map();
  if (S.mb51) for (const m of S.mb51.moves) {
    if (!m.date || !m.material || !(Number(m.qty) < 0) || !(m.cat === 'Own Use' || OUT_MT.has(String(m.mt)))) continue;
    const k = m.material + '|' + m.plant, ym = m.date.getFullYear() * 12 + m.date.getMonth(), g = map.get(k) || map.set(k, new Map()).get(k);
    g.set(ym, (g.get(ym) || 0) - m.qty);
  }
  S._ubm = { ver: S.ver, src: S.mb51, map }; return map;
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
// Stok lain = in transit + valuation type selain ZNORMAL (tidak mengurangi To Order); rinciannya di tooltip
const stokLainN = (r) => (r.transit || 0) + (r.stockOther || 0);
const stokLain = (r) => { const n = stokLainN(r); if (!n) return ''; const t = [r.transit ? 'In transit ' + fmt(r.transit) : '', r.stockOther ? r.otherVal || 'Val. type lain ' + fmt(r.stockOther) : ''].filter(Boolean).join(' · ');
  return `<span class="tip-u" title="${esc(t)}">${fmt(n)}</span>`; };
const STOK_LAIN_COL = ['Stok lain', stokLain, 'num', stokLainN];
// Nama bulan (dipakai grafik 24 bulan di views.js)
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const mrpRows = () => (S.mrpRes ? [...S.mrpRes.values()].filter((r) => r.wk === S.mrpWK && S.mrpPlants.has(r.plant)) : []);
const mrpNote = () => { if (S.mrpWK !== 'PHE' || !S.mrpWB_PHE) return ''; const w = S.mrpWB_PHE;
  return `<div class="banner warn"><span>MRP WK PHE sementara dihitung dari MB52 + MB51 client 180 (histori ${esc(w.window[0])} s.d. ${esc(w.window[1])}, ${fmt(w.monthsSpan, 1)} bulan). ${w.histShort ? 'Histori masih pendek, jadi AMU dan aging belum bisa diandalkan. ' : ''}Lead time dari master MRP PEP kalau kode materialnya sama, selain itu ${fmt(S.set.pheLT || 3, 1)} bulan (atur di <a href="#/pengaturan">Pengaturan</a>).</span></div>`; };

// ---------- Muat file (dua client SAP: 100 = WK PEP, 180 = WK PHE) ----------
const CLIENT_WK = { '100': 'PEP', '180': 'PHE' };
const clientOf = Folder.clientOf; // sama dengan deteksi di Raw Data (K-206)
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
// baca Excel lewat cache terenkripsi (file yang sama tidak dibaca ulang)
const loadStat = { hit: 0, read: 0 };
async function parseFile(kind, file, fn) { const r = await Cache.parse(kind, file, fn); loadStat[r.hit ? 'hit' : 'read']++; return r.value; }
async function loadSAP(k, file) {
  const wk = wkOfFile(file.name);
  S.raw[k] = S.raw[k] || {};
  if (k === 'mb51') { // MB51 boleh banyak file per client (upload berkala): digabung, baris dobel dibuang
    const F = (S.mb51Files = S.mb51Files || {}); F[wk] = F[wk] || new Map(); F[wk].set(file.name, (await parseFile('mb51', file, PARSE.mb51)).moves);
    S.raw.mb51[wk] = Trace.mergeMB51([...F[wk].values()]);
  } else S.raw[k][wk] = await parseFile(k, file, PARSE[k]);
  S[k] = MERGE[k](byWK(S.raw[k]));
  // berkas asli untuk halaman SAP Raw Data: MB51 semua file, jenis lain hanya yang terbaru per client
  const RF = ((S.rawFiles = S.rawFiles || {})[k] = S.rawFiles[k] || new Map());
  if (k !== 'mb51') [...RF].forEach(([n, e]) => { if (e.wk === wk) RF.delete(n); });
  RF.set(wk + '|' + file.name, { file, wk });
  srcMark(k, file, wk);
  if (k === 'mb52') { S.plantWK = new Map(); S.mb52.items.forEach((i) => S.plantWK.set(i.plant, i.wk)); }
}
const loadMB52 = (f) => loadSAP('mb52', f), loadME3N = (f) => loadSAP('me3n', f), loadME2N = (f) => loadSAP('me2n', f), loadMB51 = (f) => loadSAP('mb51', f), loadMB25 = (f) => loadSAP('mb25', f);
async function loadDS(file) { S.ds = await parseFile('ds', file, (b) => DS.parseDS(XLSX, b)); S.ver = (S.ver || 0) + 1; srcMark('ds', file); }
async function loadMRP(file) { S.mrpWB = await parseFile('mrp', file, (b) => MRP.parseWorkbook(XLSX, b)); S.mrpName = file.name; srcMark('mrp', file, 'PEP'); }
function srcMark(k, file, wk = '') { S.src[k] = S.src[k] || {}; const key = k === 'mb51' ? wk + '|' + file.name : wk || '-'; S.src[k][key] = { name: file.name, at: new Date(), wk }; }
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
  if (!h) { banner('Belum ada folder data. Pilih folder dulu di halaman Sumber Data.', 'warn'); location.hash = '#/data'; return; }
  if (await Folder.permission(h, true)) await loadFolder(h);
}
async function loadFolder(h) {
  banner(`Membaca folder <b>${esc(h.name)}</b>…`); await tick(); S.folderName = h.name;
  const log = []; loadStat.hit = loadStat.read = 0; Cache.resetUsed(); const t0 = performance.now();
  try {
    const c = Folder.classify(await Folder.listExcel(h));
    S.raw = {}; S.src = {}; S.mb51Files = {}; S.rawFiles = {}; S.ds = null; ['mb52', 'me3n', 'me2n', 'mb51', 'mb25'].forEach((k) => (S[k] = null));
    for (const k of ['mb52', 'me3n', 'me2n', 'mb51', 'mb25']) for (const f of c[k] || []) { await tick(); await loadSAP(k, f.file); log.push(f.name); }
    if (c.mrp) { await tick(); await loadMRP(c.mrp.file); log.push(c.mrp.name); }
    if (c.ds) { await tick(); try { await loadDS(c.ds.file); log.push(c.ds.name); } catch (e) { log.push('Gagal: ' + c.ds.name + ' (' + e.message + ')'); } }
    if (c.regulasi) { S.regulasi = { name: c.regulasi.name, text: await c.regulasi.file.text() }; log.push(c.regulasi.name); }
    recompute(); route();
    S.folderLoadedAt = new Date(); Cache.prune();
    const how = loadStat.read ? `${loadStat.read} dibaca ulang, ${loadStat.hit} dari cache` : 'semua dari cache';
    banner(log.length ? `Data dimuat dari folder <b>${esc(h.name)}</b>: ${log.length} file (${how}, ${fmt((performance.now() - t0) / 1000, 1)} detik). <a href="#/data">Lihat detail</a> <button class="icon-btn" id="bx" aria-label="Tutup">${UI.I.x}</button>` : `Folder <b>${esc(h.name)}</b> tidak berisi file yang dikenali. Nama file harus memuat MB52, MRP, ME3N, ME2N, MB51, atau MB25. <button class="icon-btn" id="bx" aria-label="Tutup">${UI.I.x}</button>`, log.length ? 'ok' : 'warn');
  } catch (e) { banner('Gagal membaca folder: ' + esc(e.message) + ` <button class="icon-btn" id="bx" aria-label="Tutup">${UI.I.x}</button>`, 'bad'); }
  const bx = $('bx'); if (bx) bx.onclick = () => banner('');
}

// ---------- Util tabel ----------
const expand = (q) => q.toLowerCase().split(/\s+/).filter(Boolean).map((x) => S.data.synonyms.find((s) => s.includes(x)) || [x]);
const hit = (text, groups) => groups.every((g) => g.some((t) => text.toLowerCase().includes(t)));
let timer; const debounce = (fn) => { clearTimeout(timer); timer = setTimeout(fn, 200); };
const SRC_LABEL = { ds: 'DS', mb52: 'MB52', mrp: 'MRP', me3n: 'ME3N', me2n: 'ME2N', mb51: 'MB51', mb25: 'MB25' };
const srcFiles = (k) => (S.src[k] ? Object.values(S.src[k]) : []);
// teks panjang diringkas: kalimat pertama tampil, teks lengkap di ikon ⓘ (tooltip)
const infoI = (full) => `<span class="info-i" tabindex="0" title="${esc(UI.strip(full))}" aria-label="${esc(UI.strip(full))}">ⓘ</span>`;
const brief = (html) => { const m = String(html).match(/^([\s\S]*?[.)])(\s+[A-Z(<][\s\S]*)$/); return m ? m[1] + ' ' + infoI(html) : html; };
const pill = (t, cls) => `<span class="pill ${cls}">${esc(t)}</span>`;
const agingPill = (a) => pill(a || '-', a === 'FS' ? 'ok' : a === 'MD' ? 'info' : a === 'SP' ? 'warn' : a === 'PJ' ? 'info' : 'mute');
// cols lama: [judul, fn(row)->html, kelas ('num'), fn(row)->nilai mentah, filter?]
const HIDE = {};
Object.assign(HIDE, {
  'kTab:list': ['Terpakai', 'Item', 'PIC'], 'kTab:renew': ['Terpakai', 'Item', 'Target'], 'kTab:open': ['Jenis'], 'kTab:late': ['Jenis'],
  'oTab:ro': ['Mata uang', 'PIC', 'Sisa hari', 'UoM', 'Harga kontrak'], 'oTab:pr': ['Mata uang', 'Kelas', 'Sumber harga'], 'oTab:kandidat': ['Sumber harga'], 'eTab:resv': ['Mvt'],
});
function convCols(cols, hide = []) {
  return cols.map((c) => ({ label: c[0], html: c[1], num: c[2] === 'num', get: c[3] || ((r) => UI.strip(c[1](r))), filter: c[2] !== 'num' && c[4] !== false, hide: hide.includes(c[0]), wide: /^(Deskripsi|Keterangan|Remarks|Catatan)$/.test(c[0]), w: /^Timeline/.test(c[0]) ? 2.9 : /^(Catatan)$/.test(c[0]) ? 2 : /^(Vendor|GR gudang|Status manual|Kategori|Kelas TKO|Lapangan|Penerima)/.test(c[0]) ? 1.6 : undefined }));
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
// Fungsi tiap halaman ada di js/pages/*.js (satu file per menu).
const PAGES = {};

// Kamus istilah untuk pembaca awam (tombol "Istilah" di kanan atas)
const GLOSSARY = [
  ['Data SAP', [['MB52', 'Daftar stok per gudang saat ini.'], ['MB51', 'Riwayat barang masuk dan keluar gudang.'], ['MB25', 'Reservasi: permintaan barang dari user yang belum diambil.'],
    ['ME2N', 'Daftar PO dan RO (pesanan ke vendor).'], ['ME3N', 'Daftar kontrak vendor (OA).'], ['MRP', 'Perhitungan otomatis kapan dan berapa barang harus dipesan.']]],
  ['Pengadaan', [['OA', 'Outline Agreement: kontrak payung dengan vendor, berisi daftar barang dan harga untuk beberapa tahun.'], ['RO', 'Release Order: pesanan barang yang diambil dari kontrak (OA). Cepat, karena harga sudah disepakati.'],
    ['PR', 'Purchase Requisition: permintaan pembelian baru kalau barang belum ada kontraknya. Prosesnya lama (±5–6 bulan).'], ['OE / HPS', 'Owner Estimate: perkiraan harga sebelum tender.'],
    ['PO', 'Purchase Order: pesanan resmi ke vendor.'], ['GR', 'Goods Receipt: barang sudah diterima gudang.'], ['GI', 'Goods Issue: barang dikeluarkan dari gudang untuk dipakai.'], ['Expediting', 'Memantau dan menagih pesanan supaya datang tepat waktu.']]],
  ['Perencanaan stok', [['Min / ROP', 'Batas bawah stok. Kalau stok + pesanan berjalan di bawah ini, saatnya pesan.'], ['Max', 'Batas atas stok. Pesan secukupnya sampai angka ini.'],
    ['AMU', 'Average Monthly Usage: rata-rata pemakaian per bulan.'], ['LT', 'Lead time: lama waktu dari pesan sampai barang datang.'], ['SS', 'Safety stock: stok cadangan untuk jaga-jaga.'],
    ['Berlebih', 'Stok lebih dari 12 bulan pemakaian (chemical 5 bulan). Jangan dipesan lagi.'], ['One Gate Ordering', 'Cek dulu stok di gudang lain, ex-proyek, atau KKKS lain sebelum membeli.']]],
  ['Pergerakan & deadstock', [['FS / MD / SP / DS', 'Kelas pergerakan: Fast (dipakai ≤ 1 tahun), Moderate (≤ 2 tahun), Slow (≤ 5 tahun), Dead stock (lebih dari 5 tahun tidak dipakai).'],
    ['Internal Usage / Own Use', 'Barang dipakai sendiri oleh lapangan (WO, cost center, proyek).'], ['BAU', 'Barang dikirim ke gudang/plant lain lewat STO.'], ['MTA', 'Material Transfer Agreement: barang dipindah ke KKKS lain.'],
    ['STO', 'Stock Transport Order: dokumen pindah barang antar plant (nomor berawalan 42).'], ['Mvt', 'Movement type: kode SAP jenis gerakan barang, mis. 291 = dipakai, 351 = dikirim ke plant lain.'],
    ['ABC', 'A = sedikit material yang menyerap 80% nilai, C = banyak material bernilai kecil.']]],
  ['Organisasi', [['WK PEP / PHE', 'Dua wilayah kerja di SAP: client 100 = PEP (nilai IDR), client 180 = PHE (nilai USD).'], ['Zona', 'Kelompok lapangan. Zona 1 = Rantau, P. Susu, Jambi, Lirik, PHE NSO & JM. Zona 4 = Prabumulih, Pendopo, Limau, Adera, Ramba, PHE OK & RT.'],
    ['Plant', 'Kode gudang di SAP, mis. W101 = Rantau.'], ['KIMAP', 'Kode material (10 atau 12 karakter).']]],
];
// Info = arti warna/tanda (satu-satunya penjelasan di web) + kamus singkatan
const LEGEND = [
  ['Status', [['low', 'Perlu order', 'Merah: perlu tindakan segera.'], ['warn', 'Berlebih', 'Kuning: perhatian.'], ['ok', 'Cukup', 'Hijau: aman.'], ['mute', '-', 'Abu-abu: netral atau belum ada data.']]],
  ['Pergerakan (aging)', [['ok', 'FS', 'Fast: dipakai dalam 1 tahun terakhir'], ['info', 'MD', 'Moderate: dipakai 1 sampai 2 tahun lalu'], ['warn', 'SP', 'Slow: dipakai 2 sampai 5 tahun lalu'], ['mute', 'DS', 'Dead stock: lebih dari 5 tahun tidak dipakai'], ['info', 'PJ', 'Project: material proyek yang belum pernah dipakai']]],
];
function openGlossary() {
  const legend = `<section class="d-sec"><h3>Warna dan tanda</h3><h4 class="sub-h">Matriks stok (Material Control)</h4>${window.mrpLegend ? mrpLegend() : ''}${LEGEND.map(([g, xs]) => `<h4 class="sub-h">${g}</h4>${xs.map(([c, p, t]) => `<p><span class="pill ${c}">${p}</span> <span>${t}</span></p>`).join('')}`).join('')}</section>`;
  UI.drawer(`<div class="d-head"><h2>Info</h2></div>${legend}<h3 class="sub-h" style="margin:16px 0 0">Kamus istilah</h3>${GLOSSARY.map(([g, xs]) => `<section class="d-sec"><h3>${g}</h3><dl class="gloss">${xs.map(([t, d]) => `<dt>${t}</dt><dd>${d}</dd>`).join('')}</dl></section>`).join('')}`, { label: 'Info' });
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
    if (!p.dataset.fi) { p.dataset.fi = '1'; p.classList.toggle('folded', store.get(key) ?? p.dataset.foldDefault !== '0'); }
    if (!h.querySelector('.fold-btn')) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost fold-btn'; h.appendChild(b); }
    const b = h.querySelector('.fold-btn'), lbl = p.classList.contains('folded') ? 'Tampilkan' : 'Sembunyikan'; if (b.textContent !== lbl) b.textContent = lbl;
    b.onclick = () => { const f = p.classList.toggle('folded'); store.set(key, f); b.textContent = f ? 'Tampilkan' : 'Sembunyikan'; };
  });
}
const tidyObs = new MutationObserver(() => { tidyObs.disconnect(); try { tidy($('view')); } finally { tidyObs.observe($('view'), { childList: true, subtree: true }); } });
tidyObs.observe($('view'), { childList: true, subtree: true });
$('glossBtn').onclick = openGlossary;

// ---------- Tab generik (dipakai halaman Kontrak) ----------
function tabbed(state, TABS, extraTop = '') {
  if (!TABS[S[state]]) S[state] = Object.keys(TABS)[0];
  const key = S[state], [title, rows, cols, text, note, onRender, minWidth] = TABS[key];
  $('view').innerHTML = `${extraTop}<div class="tabs" role="tablist">${Object.entries(TABS).map(([k, t]) => `<button class="tab ${k === key ? 'on' : ''}" role="tab" aria-selected="${k === key}" data-t="${k}">${esc(t[0])}<span class="n">${fmt(t[1].length, 0)}</span></button>`).join('')}</div>
    ${note ? `<p class="tab-note">${note}</p>` : ''}<div id="res"></div>`;
  UI.table($('res'), { id: state + ':' + key, rows, cols: convCols(cols, HIDE[state + ':' + key] || []), name: title, match: text ? (r, q) => hit(text(r), expand(q)) : undefined, onRender, minWidth });
  document.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { S[state] = b.dataset.t; route(); }));
}
const dstr = (d) => (d ? d.toLocaleDateString(I18N.loc(), { day: '2-digit', month: 'short', year: 'numeric' }) : '-');
const money = (v, cur = 'IDR') => { if (v == null || v === '' || !isFinite(v)) return ''; cur = cur || 'IDR'; const a = Math.abs(v);
  return cur + ' ' + (a >= 1e9 ? fmt(v / 1e9, 2) + ' M' : a >= 1e6 ? fmt(v / 1e6, 2) + ' jt' : fmt(v, cur === 'IDR' ? 0 : 2)); };
const toIDRv = (v, cur) => (cur === 'USD' ? v * (S.set.kurs || 18150) : v || 0);
const needFile = (what, hint) => `<div class="panel empty"><h3>Butuh ${what}</h3><p>${hint}</p><a class="btn primary" href="#/data">Buka Sumber Data</a></div>`;

// ---------- Lacak material ----------
// To Order yang bisa diklik → panel material langsung membuka penjelasan hitungan MRP plant tsb
const calcA = (r, html) => `<a href="#" class="calclink" data-mat="${esc(r.material)}" data-p="${esc(r.plant)}" title="Lihat cara hitung Min/Max dan To Order">${html}</a>`;
// Kolom dokumen pengadaan: PR, PO/RO, dan OA dipisah; OA bisa diklik → pop-up kontrak
const oaLink = (oa) => (oa ? `<a href="#" class="mono oalink" data-oa="${esc(oa)}">${esc(oa)}</a>` : '<span class="muted">-</span>');
const docCols = () => [['PR', (l) => (l.pr ? `<a href="#" class="mono lm" data-m="${esc(l.pr)}">${esc(l.pr)}</a>` : '<span class="muted">-</span>')],
  ['PO/RO', (l) => `<a href="#" class="mono lm" data-m="${esc(l.doc)}">${esc(l.doc)}</a><span class="muted small">/${esc(l.item)}</span> ${pill(l.type, l.type === 'RO' ? 'info' : 'mute')}`], ['OA', (l) => oaLink(l.oa)]];

function soon(r) { $('view').innerHTML = `<div class="panel empty"><h3>${esc(r[1])}</h3><p>Sedang disiapkan (${esc(r[4] || '')}).</p></div>`; }
