const MENU = [['cari','Cari Material'],['data','Data SAP & Pengaturan'],['rkm','RKM / MRP Zona 1'],['hps','HPS/OE & KPI'],['kontrak','Kontrak OA/RO & Call Order']];
const DEFAULT_MRP_PLANTS = ['W101','W102','W802','W803'];
let S = null; // {role, user, data, mb52, mrp, mrpPlants:Set, mb52Name, mrpName}
const $ = (id) => document.getElementById(id);
const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n, d = 2) => (typeof n === 'number' && isFinite(n) ? n.toLocaleString('id-ID', { maximumFractionDigits: d }) : '-');
const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };

$('lf').onsubmit = async (e) => {
  e.preventDefault(); $('err').textContent = 'Memproses…';
  try {
    const keys = await (await fetch('data/keys.json')).json();
    const entry = keys[$('u').value.trim().toLowerCase()];
    if (!entry) throw 0;
    const { role, key } = await Vault.login(entry, $('p').value);
    const data = await Vault.decryptJSON(key, await (await fetch('data/data.enc.json')).json());
    const saved = store.get('mrpPlants');
    S = { role, data, user: $('u').value, mb52: null, mrp: null, mrpPlants: new Set(saved || DEFAULT_MRP_PLANTS) };
    $('login').hidden = true; $('app').hidden = false;
    $('who').textContent = `${S.user} · ${role}`;
    $('nav').innerHTML = MENU.map(([k, t]) => `<a href="#/${k}" data-k="${k}">${t}</a>`).join('');
    route();
  } catch { $('err').textContent = 'Username/password salah'; }
};
$('out').onclick = () => location.reload();
window.addEventListener('hashchange', () => S && route());

function route() {
  const k = (location.hash.match(/#\/(\w+)/) || [, 'cari'])[1];
  document.querySelectorAll('#nav a').forEach((a) => a.classList.toggle('on', a.dataset.k === k));
  (PAGES[k] || PAGES.cari)();
}

// Data aktif: hasil upload MB52, atau dummy dari vault kalau belum upload
function activeItems() {
  if (S.mb52) return Parser.merge(S.mb52.items, S.mrp ? S.mrp.map : null, S.mrpPlants);
  const dummy = S.data.materials.map((m) => ({ plant: m.plant, material: m.kimap, desc: m.desc, uom: m.uom, soh: m.soh, value: 0, price: 0, transit: 0, locs: [], mrp: { min: m.min, max: m.max } }));
  return dummy.map((it) => { const st = Parser.status(it, it.mrp, S.mrpPlants); return Object.assign(it, { status: st.s, cls: st.cls }); });
}
const expand = (q) => q.toLowerCase().split(/\s+/).filter(Boolean).map((x) => S.data.synonyms.find((s) => s.includes(x)) || [x]);
let timer;
const debounce = (fn) => { clearTimeout(timer); timer = setTimeout(fn, 200); };

const PAGES = {
  cari() {
    const items = activeItems();
    const plants = [...new Set(items.map((x) => x.plant))].sort();
    const stats = [...new Set(items.map((x) => x.status))].sort();
    $('view').innerHTML = `<h2>Cari Material</h2>
      ${S.mb52 ? '' : '<p class="msg">Masih memakai data dummy. Upload file MB52 di menu <a href="#/data">Data SAP & Pengaturan</a>.</p>'}
      <div class="bar"><input id="q" placeholder="Kode material / deskripsi (mis. laker, packer)">
      <select id="fp"><option value="">Semua plant</option>${plants.map((p) => `<option>${esc(p)}</option>`).join('')}</select>
      <select id="fs"><option value="">Semua status</option>${stats.map((p) => `<option>${esc(p)}</option>`).join('')}</select></div>
      <div id="cnt" class="msg"></div><div id="res"></div>`;
    const draw = () => {
      const groups = expand($('q').value);
      const fp = $('fp').value, fs = $('fs').value;
      const rows = items.filter((m) => (!fp || m.plant === fp) && (!fs || m.status === fs) &&
        groups.every((g) => g.some((t) => (m.material + ' ' + m.desc).toLowerCase().includes(t))));
      const shown = rows.slice(0, 200);
      $('cnt').textContent = `${fmt(rows.length, 0)} item ditemukan${rows.length > 200 ? ' (menampilkan 200 pertama, persempit pencarian)' : ''}`;
      $('res').innerHTML = `<table><tr><th>Plant</th><th>Material</th><th>Deskripsi</th><th class="num">Stok</th><th>UoM</th><th class="num">Harga/unit</th><th class="num">Nilai (Rp)</th><th class="num">Min</th><th class="num">Max</th><th>Status</th></tr>` +
        shown.map((m) => `<tr title="${esc(m.locs.map((l) => l.sloc + (l.batch ? '/' + l.batch : '') + ': ' + l.qty).join(' | '))}"><td>${esc(m.plant)}</td><td>${esc(m.material)}</td><td>${esc(m.desc)}</td>
        <td class="num">${fmt(m.soh)}</td><td>${esc(m.uom)}</td><td class="num">${fmt(m.price, 0)}</td><td class="num">${fmt(m.value, 0)}</td>
        <td class="num">${m.mrp ? fmt(m.mrp.min) : '-'}</td><td class="num">${m.mrp ? fmt(m.mrp.max) : '-'}</td><td class="${m.cls}">${esc(m.status)}</td></tr>`).join('') + '</table>';
    };
    $('q').oninput = () => debounce(draw); $('fp').onchange = draw; $('fs').onchange = draw; draw();
  },

  data() {
    const allPlants = [...new Set([...(S.mb52 ? S.mb52.plants : []), ...(S.mrp ? S.mrp.plants : []), ...S.mrpPlants])].sort();
    $('view').innerHTML = `<h2>Data SAP & Pengaturan</h2>
      <p class="msg">File hanya dibaca di browser kamu dan hilang saat halaman ditutup. Tidak ada yang dikirim ke server atau repo.</p>
      <div class="grid">
        <div class="card"><h3>1. Stok MB52</h3><input type="file" id="f1" accept=".xlsx,.xls"><p id="m1" class="msg">${S.mb52 ? `${esc(S.mb52Name)}: ${fmt(S.mb52.items.length, 0)} item, ${S.mb52.plants.length} plant` : 'Belum ada file.'}</p></div>
        <div class="card"><h3>2. MRP (opsional)</h3><input type="file" id="f2" accept=".xlsx,.xlsm,.xls"><p id="m2" class="msg">${S.mrp ? `${esc(S.mrpName)}: ${fmt(S.mrp.map.size, 0)} baris MRP` : 'Belum ada file. Dibaca dari sheet "MRP".'}</p></div>
      </div>
      <div class="card"><h3>Plant yang dipantau MRP (Min/Max)</h3>
      <p class="msg">Semua plant di MB52 tetap bisa dicari. Status stok dibandingkan dengan Min/Max hanya untuk plant yang dicentang.</p>
      <div class="chips" id="chips">${allPlants.map((p) => `<label><input type="checkbox" value="${esc(p)}" ${S.mrpPlants.has(p) ? 'checked' : ''}> ${esc(p)}</label>`).join('')}</div>
      <div id="sum" class="msg"></div></div>`;
    const summary = () => {
      const c = {}; activeItems().forEach((x) => { c[x.status] = (c[x.status] || 0) + 1; });
      $('sum').textContent = 'Ringkasan status: ' + (Object.entries(c).map(([k, v]) => `${k} ${fmt(v, 0)}`).join(' · ') || '-');
    };
    $('chips').onchange = () => { S.mrpPlants = new Set([...document.querySelectorAll('#chips input:checked')].map((i) => i.value)); store.set('mrpPlants', [...S.mrpPlants]); summary(); };
    const load = (id, msgId, fn) => ($(id).onchange = async (e) => {
      const f = e.target.files[0]; if (!f) return; $(msgId).textContent = 'Memproses ' + f.name + '…';
      try { await new Promise((r) => setTimeout(r, 30)); fn(f, await f.arrayBuffer()); PAGES.data(); }
      catch (err) { $(msgId).textContent = 'Gagal: ' + err.message; }
    });
    load('f1', 'm1', (f, buf) => { S.mb52 = Parser.parseMB52(XLSX, buf); S.mb52Name = f.name; });
    load('f2', 'm2', (f, buf) => { S.mrp = Parser.parseMRP(XLSX, buf); S.mrpName = f.name; });
    summary();
  },

  rkm: () => soon('RKM / MRP Zona 1', 'Tahap 3'),
  hps: () => soon('HPS/OE & KPI', 'Tahap 5'),
  kontrak: () => soon('Kontrak OA/RO & Call Order', 'Tahap 4'),
};
function soon(t, tahap) { $('view').innerHTML = `<div class="card"><h2>${esc(t)}</h2><p>Belum dibangun (${tahap} di SPEC.md).</p></div>`; }
