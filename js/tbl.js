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
  // tiles: [[label, nilai (html), keterangan, kelas k-low|k-min|k-ok|k-max]]
  T.kpis = (tiles) => `<div class="kpis">${tiles.map(([l, v, s, c]) => `<div class="kpi ${c || ''}"><span>${esc(l)}</span><b>${v}</b>${s ? `<small>${esc(s)}</small>` : ''}</div>`).join('')}</div>`;

  // ---------- baris filter ----------
  // spec: { q: placeholder, plants: [kode], dates: true, years: [tahun], selects: [{ key, label, options: [[nilai, teks]] }] }
  // st  : objek state halaman (q, plant, from, to, year, dan key pilihan); onChange dipanggil setiap ada perubahan
  T.filters = (el, spec, st, onChange) => {
    const sel = (k, first, opts) => `<select data-k="${k}" aria-label="${esc(first)}"><option value="">${esc(first)}</option>${opts.map(([v, t]) => `<option value="${esc(v)}"${String(st[k] || '') === String(v) ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`;
    el.innerHTML = `<div class="fb">${spec.q ? `<input type="search" class="fb-q" data-k="q" placeholder="${esc(spec.q)}" aria-label="Cari" value="${esc(st.q || '')}">` : ''}
      ${spec.plants ? sel('plant', 'Semua plant', spec.plants.map((p) => [p, plantLabel(p)])) : ''}
      ${spec.dates ? `<label>Dari <input type="date" data-k="from" value="${esc(st.from || '')}"></label><label>Sampai <input type="date" data-k="to" value="${esc(st.to || '')}"></label>` : ''}
      ${spec.years && spec.years.length ? sel('year', 'Semua tahun', spec.years.map((y) => [y, y])) : ''}
      ${(spec.selects || []).map((s) => sel(s.key, s.label, s.options)).join('')}
      <button type="button" class="btn ghost" data-k="reset">Reset</button></div>`;
    let t;
    const set = (k, v) => {
      st[k] = v;
      if (k === 'year') { st.from = v ? v + '-01-01' : ''; st.to = v ? v + '-12-31' : ''; el.querySelector('[data-k=from]') && (el.querySelector('[data-k=from]').value = st.from); el.querySelector('[data-k=to]') && (el.querySelector('[data-k=to]').value = st.to); }
      if (k === 'from' || k === 'to') { st.year = ''; const y = el.querySelector('[data-k=year]'); if (y) y.value = ''; }
    };
    el.querySelectorAll('[data-k]').forEach((x) => {
      const k = x.dataset.k;
      if (k === 'reset') x.onclick = () => { Object.keys(st).forEach((z) => (st[z] = Array.isArray(st[z]) ? [] : '')); T.filters(el, spec, st, onChange); onChange(); };
      else if (k === 'q') x.oninput = () => { clearTimeout(t); t = setTimeout(() => { set('q', x.value.trim()); onChange(); }, 250); };
      else x.onchange = () => { set(k, x.value); onChange(); };
    });
  };
  // tanggal masuk rentang filter (kosong = semua). d = Date
  const ymd = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  T.inRange = (d, st) => { if (!st.from && !st.to) return true; if (!(d instanceof Date) || isNaN(d)) return false; const s = ymd(d); return (!st.from || s >= st.from) && (!st.to || s <= st.to); };
  T.years = (dates) => [...new Set(dates.filter((d) => d instanceof Date).map((d) => d.getFullYear()))].sort((a, b) => b - a);
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
