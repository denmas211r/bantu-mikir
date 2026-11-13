// ============ Halaman Pantau Pesanan ============
// Bagian dari web MIM. Dimuat sesudah js/app.js (fungsi bersama ada di sana) dan sebelum js/views.js.

// ---------- Expediting (format mengikuti sheet "Expediting" MIM Z1) ----------
const ex = { all() { return store.get('expediting') || {}; }, get(k) { return this.all()[k] || {}; }, set(k, v) { const a = this.all(); a[k] = v; store.set('expediting', a); } };
const MANUAL = ['', 'Menunggu approval', 'Dalam pengiriman', 'Terlambat', 'Selesai', 'Batal'];
const fieldName = (plants) => plants.split(', ').map((p) => (PLANT_NAME[p] ? 'PEP ' + PLANT_NAME[p] : p)).join(', ');
// Pantau Pesanan: satu tabel PO/RO (aktif + selesai) dan reservasi yang lewat tanggal butuh. Status manual, catatan,
// dan tanggal kirim kontrak diisi lewat pop-up (klik baris).
PAGES.expediting = function () {
  if (!S.me2n) { $('view').innerHTML = needFile('file ME2N', 'Expediting dibaca dari ME2N (PO/RO). Tambahkan MB51 untuk status GR gudang dan MB25 untuk reservasi.'); return; }
  const allPlants = [...new Set(S.me2n.lines.map((l) => l.plant).concat(S.mb25 ? S.mb25.lines.map((l) => l.plant) : []).filter(Boolean))].sort();
  // bawaan: plant Zona 1 (pilihan disimpan)
  const sel = new Set(store.get('expPlantsZ') || allPlants.filter((p) => zonaOf(p) === 'Zona 1')), stockOnly = store.get('expStockOnly') ?? true;
  const today = new Date(), t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const po = Trace.expediting(S.me2n, S.mb51, today, { plants: sel, stockOnly }).map((e) => {
    const m = ex.get(e.doc); const kontr = m.kontrak ? new Date(m.kontrak) : null;
    let status = e.status, cls = e.cls, late = e.lateDays;
    if (e.open > 0 && kontr && kontr < t0) { late = Math.round((t0 - kontr) / 864e5); if (!e.inspeksi) { status = 'Terlambat'; cls = 'low'; } }
    if (m.manual) { status = m.manual; cls = m.manual === 'Terlambat' ? 'low' : m.manual === 'Selesai' ? 'ok' : m.manual === 'Batal' ? 'mute' : m.manual === 'Menunggu approval' ? 'warn' : 'info'; }
    if (e.open <= 0 && !m.manual) { status = 'Selesai GR'; cls = 'ok'; }
    const mundur = kontr && e.deliv ? Math.round((e.deliv - kontr) / 864e5) : 0;
    const grTxt = !S.mb51 ? '' : e.grIn || e.grRel ? `Tiba ${fmt(e.grIn)}${e.firstIn ? ', ' + dstr(e.firstIn) : ''}; rilis ${fmt(e.grRel)}${e.lastRel ? ', ' + dstr(e.lastRel) : ''}` : 'Belum ada di MB51';
    return Object.assign({}, e, { kind: e.type, key: 'po|' + e.doc, status, cls, late, kontr, mundur, note: m.note || '', manual: m.manual || '', date: e.deliv, who: e.vendor, field: fieldName(e.plant), gr: grTxt,
      prio: status === 'Terlambat' ? 0 : e.open > 0 && m.manual !== 'Selesai' && m.manual !== 'Batal' ? 1 : 3 });
  });
  // reservasi terbuka yang sudah jatuh tempo → cek apakah gudang sudah GI
  const stock = new Map(S.mb52 ? S.mb52.items.map((i) => [i.material + '|' + i.plant, i.soh]) : []);
  const resv = S.mb25 ? S.mb25.lines.filter((l) => !l.finalIssue && l.diff > 0 && (!sel.size || sel.has(l.plant)) && l.reqDate && l.reqDate <= t0).map((l) => {
    const st = stock.get(l.material + '|' + l.plant), gi = st == null ? ['Stok tidak diketahui', 'mute'] : st >= l.diff ? ['Stok ada, belum GI', 'warn'] : st > 0 ? ['Stok kurang', 'low'] : ['Stok kosong', 'low'];
    return { kind: 'Reservasi', key: 'rs|' + l.resv + '|' + l.item, doc: l.resv, item: l.item, plant: l.plant, field: fieldName(l.plant), material: l.material, desc: l.desc, value: null, date: l.reqDate,
      status: gi[0], cls: gi[1], late: Math.round((t0 - l.reqDate) / 864e5), who: l.recipient || l.costCenter || l.wbs || '', open: l.diff, uom: l.uom, stock: st, mt: l.mt, note: '', gr: '', prio: 2 };
  }) : [];
  const rows = po.concat(resv).sort((a, b) => a.prio - b.prio || (b.late || 0) - (a.late || 0));
  const nLate = po.filter((e) => e.status === 'Terlambat').length;
  $('view').innerHTML = `<div class="filters"><span id="exPl"></span><label class="radio"><input type="checkbox" id="exStock" ${stockOnly ? 'checked' : ''}> Hanya material stock</label>
      <span class="muted small">${fmt(po.filter((e) => e.open > 0).length, 0)} PO/RO berjalan · <span class="${nLate ? 'neg' : ''}">${fmt(nLate, 0)} terlambat</span> · ${fmt(resv.length, 0)} reservasi lewat tanggal butuh</span></div><div id="res"></div>`;
  UI.table($('res'), { id: 'exp-one', rows, name: 'Pantau Pesanan', rowKey: (e) => e.key, onRow: (k) => openExp(rows.find((e) => e.key === k)), minWidth: 1250,
    match: (e, q) => hit([e.doc, e.pr, e.desc, e.who, e.field, e.note, e.material].join(' '), expand(q)), placeholder: 'Cari PO/RO, PR, reservasi, deskripsi, vendor, catatan…', cols: [
    { label: 'Jenis', get: (e) => e.kind },
    { label: 'No. dokumen', nowrap: true, get: (e) => e.doc, html: (e) => `<a class="mono" href="#/lacak" data-q="${esc(e.doc)}">${esc(e.doc)}</a>${e.kind === 'Reservasi' ? `<span class="muted small">/${esc(e.item)}</span>` : ''}` },
    { label: 'No. PR', nowrap: true, hide: true, get: (e) => e.pr || '' },
    { label: 'Lapangan', get: (e) => e.field },
    { label: 'Deskripsi', wide: true, get: (e) => e.desc },
    { label: 'Nilai', num: true, get: (e) => e.value, html: (e) => (e.value == null ? '' : money(e.value, e.currency)) },
    { label: 'Tanggal', sub: 'kirim / butuh', get: (e) => e.date, html: (e) => dstr(e.date) },
    { label: 'Status', get: (e) => e.status, html: (e) => pill(e.status, e.cls) + (e.late > 0 && e.prio < 3 ? ` <span class="small muted">${fmt(e.late, 0)} hr</span>` : '') },
    { label: 'Terlambat (hari)', num: true, hide: true, get: (e) => (e.late > 0 ? e.late : null) },
    { label: 'Catatan', get: (e) => e.note, html: (e) => (e.note ? `<span class="small">${esc(e.note)}</span>` : '') },
    { label: 'GR gudang (MB51)', get: (e) => e.gr },
    { label: 'Vendor / penerima', get: (e) => e.who },
    { label: 'Sisa', num: true, hide: true, get: (e) => e.open },
    { label: 'Tgl kirim kontrak', hide: true, get: (e) => e.kontr || null, html: (e) => (e.kontr ? dstr(e.kontr) + (e.mundur > 0 ? ' ' + pill('mundur ' + e.mundur + ' hr', 'warn') : '') : '') },
  ] });
  UI.multi($('exPl'), { label: 'Plant', options: allPlants.map((p) => ({ value: p, label: plantLabel(p) })), selected: sel, onChange: (x) => { store.set('expPlantsZ', [...x]); clearTimeout(window._exT); window._exT = setTimeout(route, 500); } });
  $('exStock').onchange = (e) => { store.set('expStockOnly', e.target.checked); route(); };
  $('res').addEventListener('click', (e) => { const a = e.target.closest('a[data-q]'); if (a) sessionStorage.setItem('lacakQ', a.dataset.q); });
};
// pop-up satu baris Pantau Pesanan: rincian + isian status manual, tanggal kirim kontrak, catatan
function openExp(e) {
  if (!e) return;
  if (e.kind === 'Reservasi') return openMaterial(e.material);
  const m = ex.get(e.doc), iso = (d) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10) : '');
  const lines = e.lines || [];
  const body = UI.drawer(`<div class="d-head"><h2>${esc(e.kind)} ${esc(e.doc)}</h2><p class="muted">${esc(e.who)} · ${esc(e.field)}${e.pr ? ' · PR ' + esc(e.pr) : ''}${e.oa ? ` · OA <a href="#" class="oalink" data-oa="${esc(e.oa)}">${esc(e.oa)}</a>` : ''}</p></div>
    <div class="kv"><div><span>Status</span><b>${pill(e.status, e.cls)}</b></div><div><span>Tgl kirim (SAP)</span><b>${dstr(e.deliv)}</b></div><div><span>Nilai</span><b>${money(e.value, e.currency)}</b></div><div><span>GR gudang</span><b class="small">${esc(e.gr || '-')}</b></div></div>
    <section class="d-sec"><h3>Catatan expediting <small>tersimpan di browser ini</small></h3><div class="params exp-form">
      <label>Status manual<span><select id="xM">${MANUAL.map((x) => `<option value="${x}" ${x === (m.manual || '') ? 'selected' : ''}>${x || 'Otomatis'}</option>`).join('')}</select></span></label>
      <label>Tgl kirim kontrak<span><input type="date" id="xK" value="${iso(m.kontrak ? new Date(m.kontrak) : null)}"></span></label>
      <label class="wide">Catatan<span><textarea id="xN" rows="3" placeholder="Mis. sudah follow up vendor 12 Nov, ETA akhir bulan">${esc(m.note || '')}</textarea></span></label></div>
      <button class="btn primary" id="xSave">Simpan</button></section>
    <section class="d-sec"><h3>Item <small>${fmt(lines.length, 0)} baris ME2N</small></h3>${plainTable(lines, [['Item', (l) => esc(l.item)], ['Material', (l) => `<a href="#" class="mono mlink" data-mat="${esc(l.material)}">${esc(l.material)}</a>`], ['Deskripsi', (l) => esc(l.desc)],
      ['Qty', (l) => fmt(l.qty), 'num'], ['Sisa kirim', (l) => fmt(l.openQty), 'num'], ['Tgl kirim', (l) => dstr(l.delivery)]])}</section>`, { label: 'Pesanan', wide: true });
  body.querySelector('#xSave').onclick = () => { ex.set(e.doc, Object.assign({}, m, { manual: body.querySelector('#xM').value, kontrak: body.querySelector('#xK').value || null, note: body.querySelector('#xN').value.trim() })); UI.closeDrawer(); route(); };
  body.querySelectorAll('.mlink').forEach((a) => (a.onclick = (ev) => { ev.preventDefault(); openMaterial(a.dataset.mat); }));
  body.querySelectorAll('.oalink').forEach((a) => (a.onclick = (ev) => { ev.preventDefault(); openContract(a.dataset.oa); }));
}
