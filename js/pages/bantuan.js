// ============ Halaman Bantuan: Sumber Data (+ Data Mentah SAP), Pengaturan ============
// Bagian dari web MIM. Dimuat sesudah js/app.js (fungsi bersama ada di sana) dan sebelum js/views.js.

function dataSources() {
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
    ['ds', 'DS', 'Daftar deadstock akhir tahun (form MA-01, sheet DS PEP/PHE) sebagai dasar optimasi DS. Nama file memuat "Deadstock" atau "DS"', S.ds && `${fmt(S.ds.rows.length, 0)} material×plant`,
      S.ds && `per ${dstr(S.ds.asOf)}, ${S.ds.sheets.map((x) => `${x.name} ${fmt(x.rows, 0)}`).join(', ')}${S.ds.kurs ? `, kurs IDR ${fmt(S.ds.kurs, 0)}/USD` : ''}`],
  ];
  $('view').innerHTML = `<section class="panel"><div class="panel-h"><h2>Folder data</h2>
      <span class="right">${fs ? `<button class="btn" id="fp1">Pilih folder</button><button class="btn ghost" id="fp2">Lupakan folder</button>` : ''}</span></div>
      <p class="muted">${fs ? `Web membaca file terbaru di folder ini setiap login; file hanya dibaca di browser ini. ${infoI(`Web membaca file terbaru di folder ini setiap login, untuk setiap client SAP: _100_ = WK PEP, _180_ = WK PHE. Khusus MB51, semua file dibaca dan digabung (cocok untuk upload berkala), baris yang sama di beberapa file dihitung sekali. Nama file harus memuat MB52, MRP, ME3N, ME2N, MB51, MB25, atau DS. File hanya dibaca di browser ini dan tidak dikirim ke mana pun.`)}` : 'Browser ini tidak mendukung akses folder. Pakai Chrome atau Edge di laptop, atau upload file satu per satu di tabel bawah.'}</p>
      ${S.folderName ? `<p class="source" style="margin-top:8px">Folder <b>${esc(S.folderName)}</b>, terakhir dimuat ${esc(t(S.folderLoadedAt))}</p>` : ''}
      <p class="source" style="margin-top:4px"><span id="cacheInfo">Cache browser: menghitung…</span> <button class="btn ghost" id="cacheClr" title="Hapus hasil baca yang tersimpan di browser ini. Login berikutnya membaca ulang semua Excel.">Hapus cache</button></p></section>
    <section class="panel"><div class="panel-h"><h2>Sumber data</h2></div>
      ${plainTable(SRC, [['Data', (r) => `<b>${r[1]}</b>`], ['Isi', (r) => esc(r[2])], ['File', (r) => srcFiles(r[0]).map((f) => (f.wk && r[0] !== 'mrp' ? `<b>WK ${esc(f.wk)}</b> ` : '') + esc(f.name)).join('<br>') || '<span class="muted">Belum dimuat</span>', 'wide'],
        ['Jumlah', (r) => esc(r[3] || ''), 'num'], ['Keterangan', (r) => esc(r[4] || '')], ['Dimuat', (r) => esc(srcFiles(r[0]).length ? t(srcFiles(r[0]).map((f) => f.at).sort((a, b) => b - a)[0]) : '')],
        ['', (r) => `<label class="btn ghost">Upload<input type="file" class="up" data-k="${r[0]}" accept=".xlsx,.xlsm,.xls" hidden></label>`]])}
      <p class="muted small" id="upMsg" style="margin-top:8px"></p></section>`;
  if (fs) {
    $('fp1').onclick = async () => { try { const h = await Folder.pick(); await loadFolder(h); } catch (e) { if (e.name !== 'AbortError') banner('Gagal: ' + esc(e.message), 'bad'); } };
    $('fp2').onclick = async () => { await Folder.forget(); S.folderName = null; banner('Folder dilupakan. Data yang sudah dimuat tetap ada sampai halaman ditutup.', 'warn'); route(); };
  }
  Cache.info().then((c) => { if ($('cacheInfo')) $('cacheInfo').textContent = c.files ? `Cache browser: ${c.files} file, ${fmt(c.bytes / 1048576, 1)} MB, terenkripsi. File yang tidak berubah tidak dibaca ulang saat login.` : 'Cache browser: kosong.'; });
  $('cacheClr').onclick = async () => { await Cache.clear(); route(); };
  const LOAD = { mb52: loadMB52, mrp: loadMRP, me3n: loadME3N, me2n: loadME2N, mb51: loadMB51, mb25: loadMB25, ds: loadDS };
  document.querySelectorAll('.up').forEach((inp) => (inp.onchange = async (e) => {
    const files = [...e.target.files]; if (!files.length) return; $('upMsg').textContent = 'Memproses ' + files.map((f) => f.name).join(', ') + '…'; await tick();
    try { for (const f of files) await LOAD[inp.dataset.k](f); recompute(); route(); } catch (err) { $('upMsg').textContent = 'Gagal membaca file: ' + err.message; $('upMsg').className = 'small neg'; }
  }));
}

// Sumber Data = 2 sub-fitur: Sumber (folder + file) dan Data Mentah (isi tarikan SAP apa adanya, dulu menu Data SAP)
PAGES.data = function () {
  const tab = S.dataTab === 'raw' ? 'raw' : 'src';
  if (S.rawG) { S.rawG.destroy(); S.rawG = null; }
  if (tab === 'src') dataSources(); else $('view').innerHTML = '<div id="dtBody"></div>';
  $('view').insertAdjacentHTML('afterbegin', '<div class="seg-bar"><span id="dtSeg"></span></div>');
  UI.seg($('dtSeg'), [['src', 'Sumber'], ['raw', 'Data']], tab, (v) => { S.dataTab = v; PAGES.data(); });
  if (tab === 'raw') PAGES.raw($('dtBody'));
};

PAGES.pengaturan = function () {
  const all = [...new Set([...(S.mb52 ? S.mb52.plants : []), ...(S.mrp ? S.mrp.plants : []), ...Object.keys(DEFAULT_ZONA), ...S.mrpPlants])].sort();
  const P = (k) => (S.set.tko[k] != null ? S.set.tko[k] : MRP.TKO_DEFAULT[k]);
  $('view').innerHTML = `<section class="panel"><div class="panel-h"><h2>Bahasa</h2></div>
      <div class="radios">${[['id', 'Bahasa Indonesia'], ['en', 'English']].map(([k, t]) => `<label class="radio"><input type="radio" name="lang" value="${k}" ${(S.set.lang || 'id') === k ? 'checked' : ''}>${t}</label>`).join('')}</div></section>
    <section class="panel"><div class="panel-h"><h2>Plant dan zona</h2></div>
      ${plainTable(all, [['Plant', (p) => `<b>${esc(p)}</b>`], ['Nama', (p) => esc(PLANT_NAME[p] || '')],
        ['Zona', (p) => `<select class="zn" data-p="${esc(p)}" aria-label="Zona ${esc(p)}">${ZONA_LIST.map((z) => `<option ${zonaOf(p) === z ? 'selected' : ''}>${z}</option>`).join('')}</select>`],
        ['Dipantau MRP', (p) => `<input type="checkbox" class="mp" value="${esc(p)}" ${S.mrpPlants.has(p) ? 'checked' : ''} aria-label="Pantau ${esc(p)}">`]])}</section>
    <section class="panel"><div class="panel-h"><h2>Mata uang dan kurs</h2></div>
      <div class="params"><label>Kurs bawaan, Rupiah per 1 USD<span><input type="number" id="kurs" min="1" step="1" value="${S.set.kurs}"></span></label>
        ${['PEP', 'PHE'].map((w) => `<label>Mata uang nilai stok MB52 WK ${w}<span><select class="wkc" data-w="${w}">${['IDR', 'USD'].map((c) => `<option ${(S.set.wkCur || {})[w] === c ? 'selected' : ''}>${c}</option>`).join('')}</select></span></label>`).join('')}</div>
      <p class="muted small" style="margin-top:8px">Nilai awal Rp 18.150 (JISDOR awal Nov 2026); sesuaikan dengan kurs kantor. ${infoI('Kurs dipakai untuk konversi IDR dan USD di dashboard dan estimasi nilai. MB52 tidak mencantumkan mata uang, jadi mata uang nilai stok diatur per WK (company code). Pastikan sesuai dengan SAP.')}</p></section>
    <section class="panel"><div class="panel-h"><h2>Kurs per bulan</h2></div>
      <p class="muted small">Isi kurs Rupiah per 1 USD untuk tiap bulan. Dipakai Analisis Warehouse saat tampil USD atau IDR: stok memakai kurs bulan berjalan, pergerakan memakai kurs bulan transaksinya. Bulan yang kosong memakai bulan terisi terdekat, lalu kurs bawaan.</p>
      <div class="params" style="margin-top:8px"><label>Bulan<span><input type="month" id="kmMon"></span></label><label>Kurs (Rp per USD)<span><input type="number" id="kmVal" min="1" step="1" placeholder="mis. 16250"></span></label><label>&nbsp;<span><button type="button" class="btn primary" id="kmAdd">Tambah / ubah</button></span></label></div>
      <div id="kmList" style="margin-top:10px"></div></section>
    <section class="panel"><div class="panel-h"><h2>Metode perhitungan MRP</h2></div>
      <div class="radios">${Object.entries(METHOD).map(([k, t]) => `<label class="radio"><input type="radio" name="method" value="${k}" ${S.set.method === k ? 'checked' : ''}>${esc(t)}</label>`).join('')}</div>
      ${S.set.method === 'tko' ? `<div class="params" style="margin-top:12px">${TKO_FIELDS.map(([k, t, u]) => `<label>${esc(t)} <span class="muted">(${u})</span><span><input type="number" step="0.5" min="0" data-k="${k}" value="${P(k)}"></span></label>`).join('')}
        <label>Rumus Max untuk maintenance<span><select data-s="maxFormula">${[['A', 'A: 2 × AMU × T + SS'], ['B', 'B: AMU × T + 2 × SS'], ['C', 'C: ROP + n × AMU'], ['BC', 'B untuk kontrak, C tanpa kontrak']].map(([v, t]) => `<option value="${v}" ${P('maxFormula') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></span></label>
        <label>Moderate (MD) dihitung sebagai FS<span><select data-s="mdAsFS"><option value="1" ${P('mdAsFS') ? 'selected' : ''}>Ya, perlu konfirmasi user</option><option value="0" ${P('mdAsFS') ? '' : 'selected'}>Tidak, Min = Max = SS</option></select></span></label>
        <label>Service level non-critical<span><select data-z="z">${[[1.282, '90%'], [1.645, '95%'], [2.054, '98%'], [2.326, '99%']].map(([z, t]) => `<option value="${z}" ${P('z') == z ? 'selected' : ''}>${t}</option>`).join('')}</select></span></label></div>
        <p class="muted small" style="margin-top:8px">Dokumen aturan ada di <a href="#/aturan">Dokumen Aturan</a>. <a href="#" id="tkoReset">Kembalikan default</a></p>` : ''}</section>
    <section class="panel"><div class="panel-h"><h2>MRP WK PHE</h2></div>
      <div class="params"><label>Lead time default bila material tidak ada di master MRP PEP<span><input type="number" id="pheLT" min="0.5" max="36" step="0.5" value="${S.set.pheLT || 3}"></span></label></div>
      <p class="muted small" style="margin-top:8px">Pemakaian dari MB51 client 180 (Own Use + Return, tanpa network/proyek). ${infoI('Pemakaian diambil dari MB51 client 180: Mvt kategori Own Use dan Return, tanpa GI ke network/proyek (221, 222, 949, 950). Aturan ini sama dengan file MRP PEP (dicek Oktober 2026, cocok 363 dari 364 material×plant).')}</p></section>`;
  document.querySelectorAll('input[name=lang]').forEach((r) => (r.onchange = () => { S.set.lang = r.value; store.set('settings', S.set); I18N.set(r.value); buildNav(); route(); }));
  const saveSet = () => { store.set('settings', S.set); recompute(); };
  document.querySelectorAll('.zn').forEach((sl) => (sl.onchange = () => { S.set.zona = Object.assign({}, S.set.zona || {}, { [sl.dataset.p]: sl.value }); saveSet(); }));
  document.querySelectorAll('.mp').forEach((c) => (c.onchange = () => { c.checked ? S.mrpPlants.add(c.value) : S.mrpPlants.delete(c.value); store.set('mrpPlants', [...S.mrpPlants]); }));
  document.querySelectorAll('.wkc').forEach((sl) => (sl.onchange = () => { S.set.wkCur = Object.assign({}, S.set.wkCur, { [sl.dataset.w]: sl.value }); saveSet(); }));
  const kmDraw = () => { const km = S.set.kursMonthly || {}, ks = Object.keys(km).sort().reverse();
    $('kmList').innerHTML = ks.length ? plainTable(ks, [['Bulan', (k) => esc(k)], ['Kurs (Rp per USD)', (k) => fmt(km[k], 2), 'num'], ['', (k) => `<button type="button" class="btn ghost small" data-del="${esc(k)}">Hapus</button>`]]) : '<p class="muted small">Belum ada kurs bulanan; dipakai kurs bawaan.</p>';
    $('kmList').querySelectorAll('[data-del]').forEach((b) => (b.onclick = () => { delete S.set.kursMonthly[b.dataset.del]; store.set('settings', S.set); kmDraw(); })); };
  $('kmAdd').onclick = () => { const m = $('kmMon').value, v = parseFloat($('kmVal').value); if (!m || !(v > 0)) return; S.set.kursMonthly = Object.assign({}, S.set.kursMonthly, { [m]: v }); store.set('settings', S.set); $('kmVal').value = ''; kmDraw(); };
  kmDraw();
  $('kurs').onchange = () => { const v = parseFloat($('kurs').value); if (v > 0) { S.set.kurs = v; saveSet(); } };
  document.querySelectorAll('input[name=method]').forEach((r) => (r.onchange = () => { S.set.method = r.value; saveSet(); route(); }));
  document.querySelectorAll('.params input[data-k]').forEach((i) => (i.onchange = () => { const v = parseFloat(i.value); if (isFinite(v) && v >= 0) { S.set.tko[i.dataset.k] = v; saveSet(); } }));
  document.querySelectorAll('.params select[data-s]').forEach((i) => (i.onchange = () => { S.set.tko[i.dataset.s] = i.dataset.s === 'mdAsFS' ? i.value === '1' : i.value; saveSet(); }));
  document.querySelectorAll('.params select[data-z]').forEach((i) => (i.onchange = () => { S.set.tko.z = parseFloat(i.value); saveSet(); }));
  if ($('tkoReset')) $('tkoReset').onclick = (e) => { e.preventDefault(); S.set.tko = {}; saveSet(); route(); };
  $('pheLT').onchange = () => { const v = parseFloat($('pheLT').value); if (v > 0) { S.set.pheLT = v; saveSet(); } };
};

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
