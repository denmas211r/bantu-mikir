const MENU = [['cari','Cari Material'],['rkm','RKM / MRP Zona 1'],['hps','HPS/OE & KPI'],['kontrak','Kontrak OA/RO & Call Order']];
let S = null; // {role, data}
const $ = (id) => document.getElementById(id);

$('lf').onsubmit = async (e) => {
  e.preventDefault(); $('err').textContent = 'Memproses…';
  try {
    const keys = await (await fetch('data/keys.json')).json();
    const entry = keys[$('u').value.trim().toLowerCase()];
    if (!entry) throw 0;
    const { role, key } = await Vault.login(entry, $('p').value);
    const data = await Vault.decryptJSON(key, await (await fetch('data/data.enc.json')).json());
    S = { role, data, user: $('u').value }; $('login').hidden = true; $('app').hidden = false;
    $('who').textContent = `${S.user} · ${role}`;
    $('nav').innerHTML = MENU.map(([k, t]) => `<a href="#/${k}" data-k="${k}">${t}</a>`).join('');
    route();
  } catch { $('err').textContent = 'Username/password salah'; }
};
$('out').onclick = () => location.reload();
window.addEventListener('hashchange', () => S && route());

function route() {
  const k = (location.hash.match(/#\/(\w+)/) || [, 'cari'])[1];
  document.querySelectorAll('#nav a').forEach(a => a.classList.toggle('on', a.dataset.k === k));
  (PAGES[k] || PAGES.cari)();
}
const expand = (q) => { // synonym: kata -> semua padanannya
  const w = q.toLowerCase().split(/\s+/).filter(Boolean);
  return w.map(x => { const g = S.data.synonyms.find(s => s.includes(x)); return g || [x]; });
};
const PAGES = {
  cari() {
    $('view').innerHTML = `<h2>Cari Material</h2><input id="q" placeholder="KIMAP / deskripsi (mis. laker)" style="width:100%;margin-bottom:12px"><div id="res"></div>`;
    const draw = () => {
      const groups = expand($('q').value);
      const rows = S.data.materials.filter(m => groups.every(g => g.some(t => (m.kimap + ' ' + m.desc).toLowerCase().includes(t))));
      $('res').innerHTML = `<table><tr><th>KIMAP</th><th>Deskripsi</th><th>Plant</th><th>Lapangan</th><th>SOH</th><th>Min</th><th>Max</th><th>Status</th></tr>` +
        rows.map(m => `<tr><td>${m.kimap}</td><td>${m.desc}</td><td>${m.plant}</td><td>${m.lapangan}</td><td>${m.soh} ${m.uom}</td><td>${m.min}</td><td>${m.max}</td>
        <td class="${m.soh < m.min ? 'low' : 'ok'}">${m.soh < m.min ? 'Di bawah Min' : 'Aman'}</td></tr>`).join('') + `</table>`;
    };
    $('q').oninput = draw; draw();
  },
  rkm: () => soon('RKM / MRP Zona 1', 'Tahap 3'),
  hps: () => soon('HPS/OE & KPI', 'Tahap 5'),
  kontrak: () => soon('Kontrak OA/RO & Call Order', 'Tahap 4'),
};
function soon(t, tahap) { $('view').innerHTML = `<div class="card"><h2>${t}</h2><p>Belum dibangun (${tahap} di SPEC.md).</p></div>`; }
