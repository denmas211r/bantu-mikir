// ============ Komponen standar halaman: baris filter, kartu ringkas, tabel ============
// Satu gaya untuk semua halaman (kecuali Sumber Data > Data yang memakai AG Grid untuk data mentah SAP).
// Aturan tabel: teks rata kiri, angka rata kanan, tanggal & status rata tengah; judul kolom ikut rata isinya.
// Lebar kolom = persen dari bobot `w`, jadi tabel tidak pernah melebar keluar layar; isi panjang dipotong rapi (tooltip berisi teks penuh).
// Aturan filter: urutan tetap Cari | Plant | Dari | Sampai | Tahun | pilihan khusus halaman | Reset. Hanya yang dipakai halaman yang tampil.
(function (root) {
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const strip = (h) => String(h == null ? '' : h).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const ALIGN = { num: 'r', date: 'c', status: 'c' };
  const T = {};

  // ---------- warna status (satu kamus untuk seluruh web) ----------
  // low = merah (segera), warn = kuning (perhatian), ok = hijau (aman), info = biru (di atas batas / berjalan), mute = abu-abu (netral)
  T.pill = (text, cls) => (text ? `<span class="pill ${cls || 'mute'}">${esc(text)}</span>` : '');
  T.two = (main, sub) => `<span class="two"><b>${esc(main)}</b><small>${esc(sub)}</small></span>`; // sel dua baris: nama + kode

  // ---------- kartu ringkas ----------
  // tiles: [[label, nilai (html), keterangan, kelas k-low|k-min|k-ok|k-max, nilaiFilter?]]
  // Kartu dengan nilaiFilter bisa diklik: mengisi filter status halaman (klik lagi = lepas). Hubungkan dengan T.bindKpis.
  T.kpis = (tiles) => `<div class="kpis">${tiles.map(([l, v, s, c, f]) => `<div class="kpi ${c || ''}${f ? ' pick' : ''}"${f ? ` data-v="${esc(f)}" role="button" tabindex="0"` : ''}><span>${esc(l)}</span><b>${v}</b>${s ? `<small>${esc(s)}</small>` : ''}</div>`).join('')}</div>`;
  T.bindKpis = (root, st, key, onChange) => {
    const cur = st[key]; root.querySelectorAll('.kpi.pick').forEach((k) => {
      k.classList.toggle('on', cur.size === 1 && cur.has(k.dataset.v));
      const go = () => { const was = cur.size === 1 && cur.has(k.dataset.v); cur.clear(); if (!was) cur.add(k.dataset.v); if (T._repaint) T._repaint(); onChange(); };
      k.onclick = go; k.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    });
  };

  // ---------- baris filter ----------
  // spec: { q: placeholder, plants: [kode], dates: true, selects: [{ key, label, options: [[nilai, teks]], def?: [nilai terpilih awal] }] }
  // st  : state halaman. q/from/to = teks; plant dan tiap key select = Set (kosong = semua). Dropdown berisi checkbox seperti filter pivot Excel; data berubah tiap checkbox diklik.
  // Tanggal kosong = semua data; baru memfilter setelah diisi.
  T.matOk = (st, code, name) => T.has(st, 'kimap', String(code || '')) && T.has(st, 'mname', name || '');
  T.has = (st, k, v) => !st[k] || !st[k].size || st[k].has(v);
  T.filters = (el, spec, st, onChange) => {
    // spec.materials = [[kode, nama]]: tambah dua filter dropdown-checkbox, KIMAP (kode) dan Material (nama), masing-masing dengan kotak cari di dalamnya
    const mats = spec.materials ? (() => { const u = new Map(); spec.materials.forEach(([c, n]) => { if (c) u.set(String(c), n || ''); });
      return [{ key: 'kimap', label: 'KIMAP', options: [...u.keys()].sort().map((c) => [c, c]) }, { key: 'mname', label: 'Material', options: [...new Set([...u.values()].filter(Boolean))].sort().map((n) => [n, n]) }]; })() : [];
    const multi = [].concat(mats, spec.plants ? [{ key: 'plant', label: 'Plant', options: spec.plants.map((p) => [p, plantLabel(p)]) }] : [], spec.selects || []);
    multi.forEach((m) => { if (!(st[m.key] instanceof Set)) st[m.key] = new Set(st[m.key] ? [].concat(st[m.key]) : []); });
    if (!st._init) { st._init = 1; multi.forEach((m) => { if (!st[m.key].size) (m.def || []).forEach((v) => st[m.key].add(v)); }); }
    const txt = (m) => { const c = st[m.key]; if (!c.size || c.size >= m.options.length) return 'Semua'; if (c.size === 1) return (m.options.find((o) => String(o[0]) === [...c][0]) || [, [...c][0]])[1]; return c.size + ' dipilih'; };
    const paint = () => {
      el.innerHTML = `<div class="fb">${spec.q ? `<input type="search" class="fb-q" data-k="q" placeholder="${esc(spec.q)}" aria-label="Cari" value="${esc(st.q || '')}">` : ''}
        ${multi.map((m) => `<button type="button" class="fsel${st[m.key].size && st[m.key].size < m.options.length ? ' on' : ''}" data-m="${esc(m.key)}"><span>${esc(m.label)}</span><b>${esc(txt(m))}</b><i>▾</i></button>`).join('')}
        ${spec.dates ? `<label>Dari <input type="date" data-k="from" value="${esc(st.from || '')}"></label><label>Sampai <input type="date" data-k="to" value="${esc(st.to || '')}"></label>` : ''}
        <button type="button" class="btn ghost" data-k="reset">Reset</button></div>`;
      let t;
      const q = el.querySelector('[data-k=q]'); if (q) q.oninput = () => { clearTimeout(t); t = setTimeout(() => { st.q = q.value.trim(); onChange(); }, 250); };
      el.querySelectorAll('input[type=date]').forEach((x) => (x.onchange = () => { st[x.dataset.k] = x.value; onChange(); }));
      el.querySelectorAll('.fsel').forEach((b) => (b.onclick = () => { const m = multi.find((z) => z.key === b.dataset.m);
        UI.checklist(UI.openPop(b, '', 280), m.options.map(([v, l]) => ({ value: String(v), label: l })), st[m.key], () => { b.querySelector('b').textContent = txt(m); b.classList.toggle('on', st[m.key].size > 0 && st[m.key].size < m.options.length); onChange(); }); }));
      el.querySelector('[data-k=reset]').onclick = () => { st.q = st.from = st.to = ''; multi.forEach((m) => { st[m.key].clear(); (m.def || []).forEach((v) => st[m.key].add(v)); }); paint(); onChange(); };
    };
    T._repaint = paint; paint();
  };
  const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  T.inRange = (d, st) => { if (!st.from && !st.to) return true; if (!(d instanceof Date) || isNaN(d)) return false; const s = ymd(d); return (!st.from || s >= st.from) && (!st.to || s <= st.to); };
  T.match = (text, q) => !q || hit(text, expand(q)); // cari dengan sinonim (laker = bearing)

  // ---------- tabel ----------
  // o = { cols: [{ label, get(row), html?(row), type: text|num|date|status, w, dec, cls?(row) }], rows, onRow?(row), pageSize (50), name (nama file Excel; kosong = tanpa tombol), empty, sort: { i, dir } }
  const cmp = (a, b) => { const na = a == null || a === '', nb = b == null || b === ''; if (na || nb) return na - nb; if (a instanceof Date || typeof a === 'number') return a - b; return String(a).localeCompare(String(b), 'id', { numeric: true }); };
  const cell = (c, r) => { if (c.html) return c.html(r); const v = c.get(r); if (v == null || v === '') return ''; if (c.type === 'num') return typeof v === 'number' ? fmt(v, c.dec == null ? 2 : c.dec) : esc(v); if (c.type === 'date') return v instanceof Date ? dstr(v) : esc(v); return esc(v); };
  T.table = (el, o) => {
    const st = { page: 0, sort: o.sort ? Object.assign({}, o.sort) : null }, size = o.pageSize || 50, tot = o.cols.reduce((a, c) => a + (c.w || 1), 0);
    let rows = o.rows;
    const draw = () => {
      const n = rows.length, pages = Math.max(1, Math.ceil(n / size)); if (st.page >= pages) st.page = pages - 1;
      const part = rows.slice(st.page * size, st.page * size + size);
      el.innerHTML = `<div class="t-wrap"><table class="t"><colgroup>${o.cols.map((c) => `<col style="width:${(((c.w || 1) / tot) * 100).toFixed(2)}%">`).join('')}</colgroup>
        <thead><tr>${o.cols.map((c, i) => `<th class="${ALIGN[c.type] || ''}" data-i="${i}" title="${esc(c.label)}">${esc(c.label)}${st.sort && st.sort.i === i ? (st.sort.dir > 0 ? ' ▲' : ' ▼') : ''}</th>`).join('')}</tr></thead>
        <tbody>${part.length ? part.map((r, k) => `<tr data-k="${k}"${o.onRow ? ' class="click"' : ''}>${o.cols.map((c) => { const h = cell(c, r); return `<td class="${ALIGN[c.type] || ''} ${(c.cls && c.cls(r)) || ''}" title="${esc(strip(h))}">${h}</td>`; }).join('')}</tr>`).join('')
          : `<tr><td class="empty" colspan="${o.cols.length}">${esc(o.empty || 'Tidak ada data.')}</td></tr>`}</tbody></table></div>
        ${n > size || o.name ? `<div class="t-foot"><span>${n ? `${fmt(st.page * size + 1, 0)}–${fmt(Math.min(n, (st.page + 1) * size), 0)} dari ${fmt(n, 0)}` : ''}</span>${pages > 1 ? `<span class="t-pg"><button type="button" class="btn ghost small" data-p="-1" aria-label="Halaman sebelumnya"${st.page ? '' : ' disabled'}>‹</button>${st.page + 1} / ${pages}<button type="button" class="btn ghost small" data-p="1" aria-label="Halaman berikutnya"${st.page < pages - 1 ? '' : ' disabled'}>›</button></span>` : ''}${o.name ? '<button type="button" class="btn ghost small" data-x>Unduh Excel</button>' : ''}</div>` : ''}`;
      el.querySelectorAll('th').forEach((th) => (th.onclick = () => { const i = +th.dataset.i; st.sort = st.sort && st.sort.i === i ? { i, dir: -st.sort.dir } : { i, dir: o.cols[i].type === 'num' || o.cols[i].type === 'date' ? -1 : 1 };
        const c = o.cols[i]; rows = o.rows.slice().sort((a, b) => cmp(c.get(a), c.get(b)) * st.sort.dir); st.page = 0; draw(); }));
      if (o.onRow) el.querySelectorAll('tbody tr[data-k]').forEach((tr) => (tr.onclick = () => o.onRow(part[+tr.dataset.k])));
      el.querySelectorAll('[data-p]').forEach((b) => (b.onclick = () => { st.page += +b.dataset.p; draw(); }));
      const x = el.querySelector('[data-x]'); if (x) x.onclick = () => { const aoa = [o.cols.map((c) => c.label)].concat(rows.map((r) => o.cols.map((c) => c.get(r)))); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: 'dd/mm/yyyy' }), 'Data'); XLSX.writeFile(wb, o.name + '.xlsx', { cellDates: true }); };
    };
    if (st.sort) { const c = o.cols[st.sort.i]; rows = o.rows.slice().sort((a, b) => cmp(c.get(a), c.get(b)) * st.sort.dir); }
    draw();
  };
  // blok ringkas: judul + tautan "Lihat semua" + tabel pendek
  T.block = (title, n, link) => `<section class="blk"><div class="blk-h"><h3>${esc(title)} <span class="n">${fmt(n, 0)}</span></h3>${link && n ? `<a href="${link}" class="blk-a">Lihat semua</a>` : ''}</div><div class="blk-b"></div></section>`;
  root.T = T;
})(window);
