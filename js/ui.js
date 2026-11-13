// ============ Komponen UI standar (dipakai semua halaman) ============
// UI.table   : tabel data — cari, urut per kolom, filter pilihan ganda per kolom, pilih kolom, halaman, unduh Excel
// UI.multi   : dropdown pilihan ganda (untuk filter halaman, mis. plant/zona)
// UI.seg     : tombol pilihan tunggal (mis. IDR / USD)
// UI.bars    : grafik batang horizontal yang bisa diklik (multi-pilih)
(function (root) {
  const esc = (t) => String(t == null ? '' : t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const nf = (n, d = 0) => (typeof n === 'number' && isFinite(n) ? n.toLocaleString('id-ID', { maximumFractionDigits: d }) : '');
  const strip = (h) => String(h == null ? '' : h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  const store = { get(k) { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} } };
  const I = {
    search: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    funnel: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18l-7 8v6l-4 2v-8z"/></svg>',
    sort: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 9 4-4 4 4M8 15l4 4 4-4"/></svg>',
    up: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 14 5-5 5 5"/></svg>',
    down: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>',
    cols: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16M15 4v16"/></svg>',
    dl: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11m0 0-4-4m4 4 4-4M5 20h14"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    chev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>',
    left: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 7-5 5 5 5"/></svg>',
    right: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 7 5 5-5 5"/></svg>',
  };

  // ---------- Popover tunggal ----------
  let pop = null, popOwner = null;
  function closePop() { if (pop) { pop.remove(); pop = null; popOwner = null; } }
  document.addEventListener('mousedown', (e) => { if (pop && !pop.contains(e.target) && !(popOwner && popOwner.contains(e.target))) closePop(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closePop(); });
  window.addEventListener('resize', closePop);
  function openPop(anchor, html, width = 280) {
    closePop(); pop = document.createElement('div'); pop.className = 'pop'; pop.style.width = width + 'px'; pop.innerHTML = html; popOwner = anchor;
    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect(), vw = document.documentElement.clientWidth;
    pop.style.top = r.bottom + window.scrollY + 6 + 'px';
    pop.style.left = Math.max(8, Math.min(r.left + window.scrollX, vw - width - 8)) + 'px';
    return pop;
  }
  // daftar centang dengan cari + pilih semua/kosongkan
  function checklist(p, values, selected, onChange) {
    p.innerHTML = `<div class="pop-search">${I.search}<input placeholder="Cari nilai…" aria-label="Cari nilai"></div>
      <div class="pop-actions"><button type="button" data-a="all">Pilih semua</button><button type="button" data-a="none">Kosongkan</button></div>
      <div class="pop-list" role="listbox" aria-multiselectable="true"></div>`;
    const list = p.querySelector('.pop-list'), inp = p.querySelector('input');
    const draw = () => {
      const q = inp.value.toLowerCase();
      const vis = values.filter((v) => !q || v.label.toLowerCase().includes(q)).slice(0, 500);
      list.innerHTML = vis.map((v) => `<label class="opt"><input type="checkbox" value="${esc(v.value)}" ${selected.has(v.value) ? 'checked' : ''}><span class="opt-l">${esc(v.label)}</span>${v.count != null ? `<span class="opt-n">${nf(v.count)}</span>` : ''}</label>`).join('') ||
        '<div class="pop-empty">Tidak ada nilai</div>';
    };
    list.onchange = (e) => { const v = e.target.value; e.target.checked ? selected.add(v) : selected.delete(v); onChange(selected); };
    p.querySelector('[data-a=all]').onclick = () => { const q = inp.value.toLowerCase(); values.filter((v) => !q || v.label.toLowerCase().includes(q)).forEach((v) => selected.add(v.value)); draw(); onChange(selected); };
    p.querySelector('[data-a=none]').onclick = () => { selected.clear(); draw(); onChange(selected); };
    inp.oninput = draw; draw(); setTimeout(() => inp.focus(), 0);
  }

  // ---------- Tabel ----------
  const states = {};
  const keyOf = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v == null || v === '' ? '' : String(v));
  const labelOf = (v) => (v instanceof Date ? v.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : v == null || v === '' ? '(kosong)' : typeof v === 'number' ? nf(v, 2) : String(v));
  const cmp = (a, b) => {
    if (a == null || a === '') return b == null || b === '' ? 0 : 1; if (b == null || b === '') return -1;
    if (a instanceof Date || b instanceof Date) return (+a || 0) - (+b || 0);
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), 'id', { numeric: true, sensitivity: 'base' });
  };
  // cols: { label, get(r)→nilai mentah, html(r)→isi sel (opsional), num:true, filter:false, hide:true, wide:true }
  function table(el, o) {
    const cols = o.cols.map((c, i) => Object.assign({ i, get: (r) => strip(c.html ? c.html(r) : '') }, c));
    const st = states[o.id] || (states[o.id] = { q: '', f: {}, sort: o.sort || null, page: 0, size: o.pageSize || 50 });
    const savedHide = store.get('cols:' + o.id);
    st.hide = new Set(savedHide || cols.filter((c) => c.hide).map((c) => c.label));
    const search = o.search || ((r) => cols.map((c) => keyOf(c.get(r))).join(' '));
    const matchQ = o.match || ((r, q) => search(r).toLowerCase().includes(q));
    el.innerHTML = `<div class="dt">
      <div class="dt-bar">
        <label class="dt-search">${I.search}<input type="search" placeholder="${esc(o.placeholder || 'Cari di tabel ini…')}" value="${esc(st.q)}" aria-label="Cari"></label>
        <div class="dt-tools"><span class="dt-count" aria-live="polite"></span>
          <button type="button" class="btn ghost" data-a="reset" hidden>${I.x}<span>Hapus filter</span></button>
          <button type="button" class="btn ghost" data-a="cols">${I.cols}<span>Kolom</span></button>
          <button type="button" class="btn ghost" data-a="xl">${I.dl}<span>Unduh Excel</span></button></div>
      </div>
      <div class="dt-chips"></div>
      <div class="dt-scroll"><table><thead></thead><tbody></tbody></table></div>
      <div class="dt-foot"><span class="dt-range"></span><div class="dt-pager">
        <label class="dt-size">Baris <select>${[25, 50, 100, 250].map((n) => `<option ${n === st.size ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <button type="button" class="icon-btn" data-a="prev" aria-label="Sebelumnya">${I.left}</button><button type="button" class="icon-btn" data-a="next" aria-label="Berikutnya">${I.right}</button></div></div></div>`;
    const $q = el.querySelector('.dt-search input'), thead = el.querySelector('thead'), tbody = el.querySelector('tbody');
    if (o.minWidth) { el.querySelector('table').style.minWidth = o.minWidth + 'px'; el.querySelector('.dt-scroll').style.overflowX = 'auto'; } // tabel lebar (banyak kolom): geser ke samping, jangan dipadatkan
    let filtered = [];
    const passFilters = (r, skip) => Object.entries(st.f).every(([i, set]) => +i === skip || !set.size || set.has(keyOf(cols[i].get(r))));
    const visCols = () => cols.filter((c) => !st.hide.has(c.label));
    // perkiraan lebar kolom dari panjang judul & isi (sampel), dalam "karakter"
    const sample = o.rows.slice(0, 60), estCache = new Map();
    const est = (c) => {
      if (estCache.has(c.i)) return estCache.get(c.i);
      const vals = sample.map((r) => String(c.html ? strip(c.html(r)) : labelOf(c.get(r))));
      const lens = vals.map((v) => v.length).sort((a, b) => a - b);
      const p80 = lens.length ? lens[Math.floor(lens.length * 0.8)] : 6;
      // kolom kode: isi tanpa spasi (No. dokumen, KIMAP, plant) → jangan dipatahkan
      const words = vals.map((v) => Math.max(0, ...v.split(/\s+/).map((w) => w.length))).sort((a, b) => a - b);
      c.code = !!c.nowrap || !c.num && !c.wide && words.length && words[Math.floor(words.length * 0.9)] >= p80 * 0.8 && p80 <= 16;
      const longestWord = Math.max(...c.label.split(/\s+/).map((w) => w.length));
      const maxWord = words.length ? words[Math.floor(words.length * 0.9)] : 0;
      let e = Math.max(longestWord + 1, Math.min(p80, c.wide ? 44 : 24), Math.min(maxWord, 16), c.num ? 6 : 5) + 3;
      if (c.code) e = Math.max(e, maxWord + 4); if (c.wide) e = Math.max(e, 26); if (c.w) e = Math.max(e, c.w * 10);
      estCache.set(c.i, e); return e;
    };
    function compute() {
      const q = st.q.trim().toLowerCase();
      filtered = o.rows.filter((r) => (!q || matchQ(r, q)) && passFilters(r, -1));
      if (st.sort) { const c = cols[st.sort.i]; if (c) { const d = st.sort.dir, emp = (v) => v == null || v === '' || (typeof v === 'number' && !isFinite(v));
        filtered = filtered.map((r, k) => [r, k, c.get(r)]).sort((a, b) => { const ea = emp(a[2]), eb = emp(b[2]); if (ea || eb) return ea === eb ? a[1] - b[1] : ea ? 1 : -1; return cmp(a[2], b[2]) * d || a[1] - b[1]; }).map((x) => x[0]); } }
    }
    function head() {
      // lebar kolom proporsional → tabel selalu muat selebar layar, teks panjang turun baris
      const vc = visCols(), avail = Math.max(40, Math.max(el.clientWidth || 1000, o.minWidth || 0) / 8.3);
      let need = vc.reduce((a, c) => a + est(c), 0);
      const shrink = new Map();
      if (need > avail) { // kecilkan kolom lebar (deskripsi) dulu, jangan kode/angka
        const soft = vc.filter((c) => !c.code && !c.num), floor = (c) => (c.wide ? 18 : 12), extra = need - avail;
        const room = soft.reduce((a, c) => a + Math.max(0, est(c) - floor(c)), 0);
        soft.forEach((c) => shrink.set(c.i, est(c) - (room ? (Math.max(0, est(c) - floor(c)) / room) * Math.min(extra, room) : 0)));
      }
      const wt = (c) => (shrink.has(c.i) ? shrink.get(c.i) : est(c)), tot = vc.reduce((a, c) => a + wt(c), 0);
      let cg = el.querySelector('colgroup'); if (!cg) { cg = document.createElement('colgroup'); thead.parentNode.insertBefore(cg, thead); }
      cg.innerHTML = vc.map((c) => `<col style="width:${((wt(c) / tot) * 100).toFixed(2)}%">`).join('');
      const th = (c, attr = '') => {
        const s = st.sort && st.sort.i === c.i ? st.sort.dir : 0, f = st.f[c.i] && st.f[c.i].size;
        return `<th ${attr} class="${c.num ? 'num' : ''}${c.wide ? ' wide' : ''}${c.gStart ? ' g-start' : ''}" aria-sort="${s > 0 ? 'ascending' : s < 0 ? 'descending' : 'none'}"${c.title ? ` title="${esc(c.title)}"` : ''}><div class="th">
          <button type="button" class="th-sort" data-i="${c.i}"><span class="th-l">${esc(c.label)}${c.sub ? `<small>${esc(c.sub)}</small>` : ''}</span><span class="ico ${s ? 'on' : ''}">${s > 0 ? I.up : s < 0 ? I.down : I.sort}</span></button>
          ${c.filter === false ? '' : `<button type="button" class="th-filter ${f ? 'on' : ''}" data-i="${c.i}" aria-label="Filter ${esc(c.label)}">${I.funnel}</button>`}</div></th>`;
      };
      // header bertingkat: kolom dengan properti group yang berurutan digabung di baris atas (mis. plant per WK)
      vc.forEach((c, k) => (c.gStart = !!c.group && (k === 0 || vc[k - 1].group !== c.group)));
      if (!vc.some((c) => c.group)) thead.innerHTML = '<tr>' + vc.map((c) => th(c)).join('') + '</tr>';
      else {
        let r1 = '', r2 = '';
        for (let k = 0; k < vc.length;) {
          const c = vc[k]; if (!c.group) { r1 += th(c, 'rowspan="2"'); k++; continue; }
          let n = 0; while (k + n < vc.length && vc[k + n].group === c.group) n++;
          r1 += `<th colspan="${n}" class="grp g-start">${esc(c.group)}</th>`; for (let j = 0; j < n; j++) r2 += th(vc[k + j]); k += n;
        }
        thead.innerHTML = `<tr>${r1}</tr><tr class="r2">${r2}</tr>`;
        const g = thead.querySelector('th.grp'); const top = g ? g.offsetHeight : 0;
        thead.querySelectorAll('tr.r2 th').forEach((x) => (x.style.top = top + 'px'));
      }
    }
    function body() {
      const n = filtered.length, pages = Math.max(1, Math.ceil(n / st.size)); st.page = Math.min(st.page, pages - 1);
      const from = st.page * st.size, rows = filtered.slice(from, from + st.size), vc = visCols();
      tbody.innerHTML = rows.length ? rows.map((r) => (o.rowKey ? `<tr class="clickable" data-k="${esc(o.rowKey(r))}">` : '<tr>') + vc.map((c) => `<td class="${c.num ? 'num' : ''}${c.wide ? ' wide' : ''}${c.code ? ' code' : ''}${c.gStart ? ' g-start' : ''}">${c.html ? c.html(r) : esc(labelOf(c.get(r)) === '(kosong)' ? '' : labelOf(c.get(r)))}</td>`).join('') + '</tr>').join('')
        : `<tr><td class="dt-empty" colspan="${vc.length}">${o.rows.length ? 'Tidak ada baris yang cocok dengan pencarian atau filter.' : esc(o.empty || 'Belum ada data.')}</td></tr>`;
      el.querySelector('.dt-count').textContent = n === o.rows.length ? `${nf(n)} baris` : `${nf(n)} dari ${nf(o.rows.length)} baris`;
      el.querySelector('.dt-range').textContent = n ? `${nf(from + 1)}–${nf(Math.min(from + st.size, n))} dari ${nf(n)}` : '';
      el.querySelector('[data-a=prev]').disabled = st.page === 0; el.querySelector('[data-a=next]').disabled = st.page >= pages - 1;
      const active = Object.entries(st.f).filter(([, s]) => s.size);
      el.querySelector('[data-a=reset]').hidden = !active.length && !st.q;
      el.querySelector('.dt-chips').innerHTML = active.map(([i, s]) => { const vals = [...s].map((v) => (v === '' ? '(kosong)' : v)); return `<span class="chip-f"><b>${esc(cols[i].label)}</b> ${esc(vals.slice(0, 3).join(', '))}${vals.length > 3 ? ` +${vals.length - 3}` : ''}<button type="button" data-clear="${i}" aria-label="Hapus filter ${esc(cols[i].label)}">${I.x}</button></span>`; }).join('');
      if (o.onRender) o.onRender(el);
    }
    const refresh = (resetPage = true) => { if (resetPage) st.page = 0; compute(); head(); body(); };
    let t; $q.oninput = () => { clearTimeout(t); t = setTimeout(() => { st.q = $q.value; refresh(); }, 180); };
    thead.onclick = (e) => {
      const sb = e.target.closest('.th-sort'), fb = e.target.closest('.th-filter');
      if (sb) { const i = +sb.dataset.i; st.sort = !st.sort || st.sort.i !== i ? { i, dir: 1 } : st.sort.dir === 1 ? { i, dir: -1 } : null; refresh(false); }
      if (fb) {
        const i = +fb.dataset.i, c = cols[i], counts = new Map();
        const q = st.q.trim().toLowerCase();
        o.rows.forEach((r) => { if ((!q || matchQ(r, q)) && passFilters(r, i)) { const v = c.get(r), k = keyOf(v); const e2 = counts.get(k) || { value: k, label: labelOf(v), count: 0, raw: v }; e2.count++; counts.set(k, e2); } });
        const values = [...counts.values()].sort((a, b) => cmp(a.raw, b.raw));
        const sel = st.f[i] || (st.f[i] = new Set());
        checklist(openPop(fb, '', 300), values, sel, () => { compute(); body(); head(); });
      }
    };
    if (o.onRow) tbody.onclick = (e) => { if (e.target.closest('a,button,input,select,label')) return; const tr = e.target.closest('tr[data-k]'); if (tr) o.onRow(tr.dataset.k); };
    el.querySelector('.dt-chips').onclick = (e) => { const b = e.target.closest('[data-clear]'); if (b) { delete st.f[b.dataset.clear]; refresh(); } };
    el.querySelector('[data-a=reset]').onclick = () => { st.f = {}; st.q = ''; $q.value = ''; refresh(); };
    el.querySelector('[data-a=prev]').onclick = () => { st.page--; body(); el.querySelector('.dt-scroll').scrollTop = 0; };
    el.querySelector('[data-a=next]').onclick = () => { st.page++; body(); el.querySelector('.dt-scroll').scrollTop = 0; };
    el.querySelector('.dt-size select').onchange = (e) => { st.size = +e.target.value; refresh(); };
    el.querySelector('[data-a=cols]').onclick = (e) => {
      const p = openPop(e.currentTarget, '', 260);
      p.innerHTML = `<div class="pop-title">Tampilkan kolom</div><div class="pop-list">${cols.map((c) => `<label class="opt"><input type="checkbox" value="${c.i}" ${st.hide.has(c.label) ? '' : 'checked'}><span class="opt-l">${esc(c.label)}</span></label>`).join('')}</div>
        <div class="pop-actions"><button type="button" data-a="def">Kembalikan default</button></div>`;
      p.querySelector('.pop-list').onchange = (ev) => { const c = cols[ev.target.value]; ev.target.checked ? st.hide.delete(c.label) : st.hide.add(c.label); store.set('cols:' + o.id, [...st.hide]); head(); body(); };
      p.querySelector('[data-a=def]').onclick = () => { localStorage.removeItem('cols:' + o.id); st.hide = new Set(cols.filter((c) => c.hide).map((c) => c.label)); closePop(); head(); body(); };
    };
    el.querySelector('[data-a=xl]').onclick = () => {
      const vc = visCols(); const aoa = [vc.map((c) => c.label)].concat(filtered.map((r) => vc.map((c) => { const v = c.get(r); return v instanceof Date ? v : v == null ? '' : v; })));
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa, { cellDates: true }), 'Data');
      XLSX.writeFile(wb, (o.name || 'data').replace(/[^\w\- ]+/g, '').trim() + '.xlsx');
    };
    refresh(false);
    return { refresh };
  }

  // ---------- Dropdown pilihan ganda ----------
  function multi(el, o) {
    const sel = o.selected; const all = o.options.length;
    const label = () => (sel.size === 0 || sel.size === all ? (o.allLabel || 'Semua') : sel.size === 1 ? (o.options.find((x) => x.value === [...sel][0]) || {}).label || [...sel][0] : `${sel.size} dipilih`);
    el.innerHTML = `<button type="button" class="select"><span class="select-k">${esc(o.label)}</span><span class="select-v"></span>${I.chev}</button>`;
    const btn = el.firstChild, upd = () => { btn.querySelector('.select-v').textContent = label(); };
    btn.onclick = () => checklist(openPop(btn, '', 280), o.options.map((x) => ({ value: x.value, label: x.label, count: x.count })), sel, () => { upd(); o.onChange(sel); });
    upd();
  }
  function seg(el, options, value, onChange) {
    el.innerHTML = `<div class="seg" role="radiogroup">${options.map(([v, l]) => `<button type="button" role="radio" aria-checked="${v === value}" data-v="${esc(v)}">${esc(l)}</button>`).join('')}</div>`;
    el.querySelector('.seg').onclick = (e) => { const b = e.target.closest('button'); if (b) onChange(b.dataset.v); };
  }

  // ---------- Grafik batang horizontal (klik = pilih/lepas, bisa banyak) ----------
  // items: [{key, label, sub, value, series}], series: [{key, label, color}]
  function bars(el, o) {
    const max = Math.max(1, ...o.items.map((x) => x.value));
    const anySel = o.selected && o.selected.size;
    el.innerHTML = `<div class="bars-legend">${o.series.map((s) => `<span><i style="background:${s.color}"></i>${esc(s.label)}</span>`).join('')}</div>
      <div class="bars" role="group" aria-label="${esc(o.aria || 'Grafik')}">${o.items.map((x) => {
        const s = o.series.find((z) => z.key === x.series) || o.series[0], on = !anySel || o.selected.has(x.key);
        return `<button type="button" class="bar-row ${on ? '' : 'dim'}" data-k="${esc(x.key)}" aria-pressed="${anySel ? o.selected.has(x.key) : false}">
          <span class="bar-l"><b>${esc(x.label)}</b>${x.sub ? `<small>${esc(x.sub)}</small>` : ''}</span>
          <span class="bar-t"><span class="bar-f" style="width:${Math.max(0.6, (x.value / max) * 100)}%;background:${s.color}"></span><span class="bar-v">${esc(o.fmt(x.value))}</span></span>
          <span class="tip" role="tooltip">${esc(x.label)}${x.sub ? ' · ' + esc(x.sub) : ''}<br>${esc(o.fmt(x.value))}${x.tip ? '<br>' + esc(x.tip) : ''}</span></button>`;
      }).join('')}</div>`;
    el.querySelector('.bars').onclick = (e) => { const b = e.target.closest('.bar-row'); if (b) o.onToggle(b.dataset.k); };
  }

  // ---------- Panel samping (detail) ----------
  let drawerEl = null;
  function drawer(html, opt = {}) {
    closeDrawer();
    drawerEl = document.createElement('div'); drawerEl.className = 'drawer-wrap';
    drawerEl.innerHTML = `<div class="drawer-back"></div><aside class="drawer${opt.wide ? ' wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(opt.label || 'Detail')}">
      <button type="button" class="icon-btn drawer-x" aria-label="Tutup">${I.x}</button><div class="drawer-body">${html}</div></aside>`;
    document.body.appendChild(drawerEl); document.body.classList.add('noscroll');
    drawerEl.querySelector('.drawer-back').onclick = closeDrawer; drawerEl.querySelector('.drawer-x').onclick = closeDrawer;
    setTimeout(() => drawerEl && drawerEl.classList.add('open'), 10);
    return drawerEl.querySelector('.drawer-body');
  }
  function closeDrawer() { if (drawerEl) { drawerEl.remove(); drawerEl = null; document.body.classList.remove('noscroll'); } }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && drawerEl && !pop) closeDrawer(); });
  // batang mini (pemakaian bulanan)
  function spark(vals, w = 96, h = 24) {
    const max = Math.max(1, ...vals), n = vals.length || 1, bw = w / n;
    return `<svg class="spark" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" aria-hidden="true">${vals.map((v, i) => { const hh = v > 0 ? Math.max(2, (v / max) * h) : 1;
      return `<rect x="${(i * bw + 0.5).toFixed(1)}" y="${(h - hh).toFixed(1)}" width="${Math.max(1, bw - 1.5).toFixed(1)}" height="${hh.toFixed(1)}" rx="1" class="${v > 0 ? 'on' : 'off'}"/>`; }).join('')}</svg>`;
  }
  // grafik kolom bulanan dengan tooltip (untuk panel detail)
  function columns(el, labels, vals, fmtv) {
    const max = Math.max(1, ...vals);
    el.innerHTML = `<div class="cols">${vals.map((v, i) => `<div class="col" tabindex="0"><span class="col-f" style="height:${v > 0 ? Math.max(3, (v / max) * 100) : 0}%"></span><span class="tip">${esc(labels[i])}<br>${esc(fmtv(v))}</span></div>`).join('')}</div>
      <div class="cols-x"><span>${esc(labels[0] || '')}</span><span>${esc(labels[labels.length - 1] || '')}</span></div>`;
  }
  root.UI = { table, multi, seg, bars, esc, strip, closePop, I, drawer, closeDrawer, spark, columns };
})(window);
