// ============ Komponen tabel baru (Kantor 2.0): AG Grid + filter bar checkbox + date range ============
// G.table(el, { head, rows, name, plantCol, source }) -> { api, destroy }
//  head  : nama kolom (urutan = urutan Excel asli)
//  rows  : array of array (nilai mentah; tanggal = Date, angka = number)
// Filter bar: kolom teks dengan <= 100 nilai unik jadi checkbox; kolom tanggal jadi date range (Flatpickr).
// Zona: G.zonaOk(plant) diisi app.js. Event 'zonachange' memicu filter ulang.
(function (root) {
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const pad = (n) => String(n).padStart(2, '0');
  const fDate = (d) => (d instanceof Date && !isNaN(d) ? pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + '/' + d.getFullYear() : '');
  const fNum = (v) => (typeof v === 'number' ? v.toLocaleString('id-ID', { maximumFractionDigits: 3 }) : v == null ? '' : String(v));
  const key = (v) => (v == null ? '' : String(v));
  const MAX_CAT = 100;
  const G = { fDate, fNum, zonaOk: () => true };

  // jenis kolom dari 300 nilai pertama yang terisi + daftar nilai unik (jika <= MAX_CAT)
  function analyze(head, rows, types) {
    const n = head.length, seen = Array(n).fill(0), isD = Array(n).fill(true), isN = Array(n).fill(true), dist = Array.from({ length: n }, () => new Map());
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      for (let j = 0; j < n; j++) {
        const v = r[j], m = dist[j];
        if (v == null || v === '') { if (m) m.set('', (m.get('') || 0) + 1); if (m && m.size > MAX_CAT) dist[j] = null; continue; }
        if (seen[j] < 300) { seen[j]++; if (!(v instanceof Date)) isD[j] = false; if (typeof v !== 'number') isN[j] = false; }
        if (m) { const k = key(v); m.set(k, (m.get(k) || 0) + 1); if (m.size > MAX_CAT) dist[j] = null; }
      }
    }
    return head.map((h, j) => {
      const type = (types && types[h]) || (!seen[j] ? 'text' : isD[j] ? 'date' : isN[j] ? 'num' : 'text');
      const d = dist[j];
      return { name: h, type, cat: type === 'text' && d && d.size > 1 && d.size <= MAX_CAT ? [...d].sort((a, b) => a[0].localeCompare(b[0], 'id', { numeric: true })).map(([v, c]) => ({ value: v, label: v === '' ? '(kosong)' : v, count: c })) : null };
    });
  }
  const widthOf = (c) => (/description|short text|text|name|vendor|header/i.test(c.name) ? 260 : c.type === 'date' ? 100 : Math.min(220, Math.max(84, c.name.length * 8 + 40)));

  function table(el, o) {
    G.cleanup();
    const t0 = performance.now(), cols = analyze(o.head, o.rows, o.types), rows = o.rows; console.debug('[grid] analisis kolom', Math.round(performance.now() - t0), 'ms');
    const catSel = new Map(), dateSel = new Map(); // j -> Set / [from,to]
    const plantCol = o.plantCol >= 0 ? o.plantCol : -1;
    el.innerHTML = `<div class="gt${o.autoHeight ? ' gt-auto' : ''}"><div class="gt-bar"><label class="gt-search"><input type="search" placeholder="Cari di semua kolom" aria-label="Cari di semua kolom"></label>
        <span class="gt-count" role="status"></span><span class="gt-tools"><button class="btn" data-a="cols">Kolom</button><button class="btn" data-a="fit">Lebarkan</button><button class="btn" data-a="reset">Reset filter</button><button class="btn primary" data-a="xls">Unduh Excel</button></span></div>
      <div class="gt-filters"></div><div class="gt-grid ag-theme-quartz"></div><div class="gt-foot">${o.source || ''}</div></div>`;
    const $q = (s) => el.querySelector(s), fbar = $q('.gt-filters');
    const colDefs = cols.map((c, j) => ({
      colId: 'c' + j, headerName: c.name, valueGetter: (p) => p.data[j], width: widthOf(c),
      filter: c.type === 'num' ? 'agNumberColumnFilter' : c.cat || c.type === 'date' ? false : 'agTextColumnFilter',
      cellClass: c.type === 'num' ? 'ag-right-aligned-cell' : undefined, headerClass: c.type === 'num' ? 'ag-right-aligned-header' : undefined,
      valueFormatter: c.type === 'date' ? (p) => fDate(p.value) : c.type === 'num' ? (p) => fNum(p.value) : undefined,
      getQuickFilterText: c.type === 'date' ? (p) => fDate(p.value) : undefined,
      hide: !!(o.hide && o.hide.includes(c.name)), pinned: o.pin && o.pin.includes(c.name) ? 'left' : undefined,
    }));
    colDefs.forEach((d, j) => { const f = o.cellClass && o.cellClass[cols[j].name]; if (f) d.cellClass = (p) => [cols[j].type === 'num' ? 'ag-right-aligned-cell' : '', f(p.value, p.data && p.data.o)].filter(Boolean).join(' '); });
    const pass = (r) => {
      if (plantCol >= 0 && r[plantCol] && !G.zonaOk(String(r[plantCol]))) return false;
      for (const [j, s] of catSel) if (s.size && !s.has(key(r[j]))) return false;
      for (const [j, [a, b]] of dateSel) { const v = r[j]; if (!(v instanceof Date) || v < a || v > b) return false; }
      return true;
    };
    let ft, api, active = () => plantCol >= 0 || catSel.size > 0 || dateSel.size > 0;
    const refresh = () => api && api.onFilterChanged();
    const gridEl = $q('.gt-grid');
    api = root.agGrid.createGrid(gridEl, {
      columnDefs: colDefs, rowData: rows, rowHeight: 26, headerHeight: 30, animateRows: false, enableCellTextSelection: true, suppressColumnVirtualisation: true,
      defaultColDef: { sortable: true, resizable: true, minWidth: 70 }, tooltipShowDelay: 600, domLayout: o.autoHeight ? 'autoHeight' : 'normal',
      onRowClicked: o.rowClick ? (e) => o.rowClick(e.data.o, e.data) : undefined, rowClass: o.rowClick ? 'gt-click' : undefined,
      isExternalFilterPresent: () => active(), doesExternalFilterPass: (node) => pass(node.data),
      onModelUpdated: () => { clearTimeout(ft); ft = setTimeout(() => o.onFilter && api && !api.isDestroyed() && o.onFilter(api), 120); const sh = api.getDisplayedRowCount(); $q('.gt-count').textContent = `${sh.toLocaleString('id-ID')} dari ${rows.length.toLocaleString('id-ID')} baris`; },
    });

    // ---- filter bar ----
    const chipText = (j) => { const s = catSel.get(j); if (!s || !s.size) return 'Semua'; return s.size === 1 ? [...s][0] || '(kosong)' : s.size + ' dipilih'; };
    cols.forEach((c, j) => {
      if (c.cat) {
        const b = document.createElement('button'); b.type = 'button'; b.className = 'fchip'; b.dataset.j = j;
        const paint = () => { b.innerHTML = `<span>${esc(c.name)}</span><b>${esc(chipText(j))}</b>`; b.classList.toggle('on', !!(catSel.get(j) && catSel.get(j).size)); };
        paint();
        b.onclick = () => { const sel = catSel.get(j) || new Set(); catSel.set(j, sel); const p = UI.openPop(b, '', 280);
          UI.checklist(p, c.cat, sel, () => { if (!sel.size) catSel.delete(j); paint(); refresh(); }); };
        fbar.appendChild(b);
      } else if (c.type === 'date') {
        const w = document.createElement('label'); w.className = 'fchip fdate'; w.innerHTML = `<span>${esc(c.name)}</span><input readonly placeholder="Semua tanggal" aria-label="${esc(c.name)}"><button type="button" class="fx" title="Hapus" aria-label="Hapus filter ${esc(c.name)}" hidden>&times;</button>`;
        const inp = w.querySelector('input'), x = w.querySelector('.fx');
        const fp = root.flatpickr(inp, { mode: 'range', dateFormat: 'd/m/Y', locale: 'id', allowInput: false,
          onClose: (d) => { if (d.length === 1) fp.setDate([d[0], d[0]], true); },
          onChange: (d) => { if (d.length === 2) { const a = new Date(d[0]); a.setHours(0, 0, 0, 0); const b = new Date(d[1]); b.setHours(23, 59, 59, 999); dateSel.set(j, [a, b]); x.hidden = false; w.classList.add('on'); refresh(); } } });
        x.onclick = (e) => { e.preventDefault(); fp.clear(); dateSel.delete(j); x.hidden = true; w.classList.remove('on'); refresh(); };
        w._clear = () => { fp.clear(); dateSel.delete(j); x.hidden = true; w.classList.remove('on'); };
        fbar.appendChild(w);
      }
    });
    if (!fbar.children.length) fbar.hidden = true;

    // ---- toolbar ----
    let qt; $q('.gt-search input').oninput = (e) => { clearTimeout(qt); qt = setTimeout(() => api.setGridOption('quickFilterText', e.target.value), 200); };
    const idOf = (c) => +c.getColId().slice(1);
    el.querySelector('[data-a=fit]').onclick = () => api.autoSizeAllColumns();
    el.querySelector('[data-a=reset]').onclick = () => {
      catSel.clear(); dateSel.clear(); fbar.querySelectorAll('.fchip').forEach((b) => { if (b._clear) b._clear(); else { b.classList.remove('on'); b.querySelector('b').textContent = 'Semua'; } });
      $q('.gt-search input').value = ''; api.setGridOption('quickFilterText', ''); api.setFilterModel(null); refresh(); };
    el.querySelector('[data-a=xls]').onclick = () => {
      const dc = api.getAllDisplayedColumns(), aoa = [dc.map((c) => c.getColDef().headerName)];
      api.forEachNodeAfterFilterAndSort((n) => { if (aoa.length < 1048576) aoa.push(dc.map((c) => n.data[idOf(c)])); });
      const ws = XLSX.utils.aoa_to_sheet(aoa, { cellDates: true, dateNF: 'dd/mm/yyyy' }), wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Data');
      XLSX.writeFile(wb, (o.name || 'data') + '.xlsx', { cellDates: true });
    };
    el.querySelector('[data-a=cols]').onclick = (e) => {
      const st = new Map(api.getColumnState().map((s) => [s.colId, s]));
      const p = UI.openPop(e.currentTarget, `<div class="pop-list cm">${cols.map((c, j) => { const s = st.get('c' + j) || {}; return `<div class="cm-row"><label class="opt"><input type="checkbox" data-id="c${j}" ${s.hide ? '' : 'checked'}><span class="opt-l">${esc(c.name)}</span></label><button type="button" class="cm-pin${s.pinned ? ' on' : ''}" data-id="c${j}" title="Sematkan di kiri" aria-pressed="${!!s.pinned}">Pin</button></div>`; }).join('')}</div>`, 280);
      p.onchange = (ev) => { if (ev.target.dataset.id) api.setColumnsVisible([ev.target.dataset.id], ev.target.checked); };
      p.onclick = (ev) => { const b = ev.target.closest('.cm-pin'); if (!b) return; const on = !b.classList.contains('on'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', on); api.setColumnsPinned([b.dataset.id], on ? 'left' : null); };
    };
    const onZona = () => { if (api.isDestroyed()) document.removeEventListener('zonachange', onZona); else refresh(); };
    document.addEventListener('zonachange', onZona);
    const h = { api, el, destroy: () => { if (h.dead) return; h.dead = true; document.removeEventListener('zonachange', onZona); api.destroy(); } };
    G.live.push(h); return h;
  }
  // objek -> baris array (nilai di kolom sesuai spec); objek asli di row.o (untuk klik baris)
  G.fromObjs = (list, spec) => ({ head: spec.map((x) => x[0]), rows: list.map((o) => { const r = spec.map((x) => x[1](o)); r.o = o; return r; }) });
  // grid/grafik yang elemennya sudah dilepas dari halaman dibersihkan (dipanggil tiap pindah halaman)
  G.live = [];
  G.track = (el, destroy) => { const h = { el, destroy: () => { if (!h.dead) { h.dead = true; destroy(); } } }; G.live.push(h); return h; };
  G.cleanup = () => { G.live = G.live.filter((h) => { if (h.dead) return false; if (document.body.contains(h.el)) return true; h.destroy(); return false; }); };
  G.table = table;
  root.G = G;
})(window);
