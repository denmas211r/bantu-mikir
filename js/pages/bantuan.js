// ============ Halaman Bantuan: Data SAP, Pengaturan, Panduan & Aturan ============
// Bagian dari web MIM. Dimuat sesudah js/app.js (fungsi bersama ada di sana) dan sebelum js/views.js.

PAGES.data = function () {
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
      <p class="muted">${fs ? `Web membaca file terbaru di folder ini setiap login; file hanya dibaca di browser ini. ${infoI(`Web membaca file terbaru di folder ini setiap login, untuk setiap client SAP: _100_ = WK PEP, _180_ = WK PHE. Khusus MB51, semua file dibaca dan digabung (cocok untuk upload berkala), baris yang sama di beberapa file dihitung sekali. Nama file harus memuat MB52, MRP, ME3N, ME2N, MB51, MB25, atau RKM. File hanya dibaca di browser ini dan tidak dikirim ke mana pun.`)}` : 'Browser ini tidak mendukung akses folder. Pakai Chrome atau Edge di laptop, atau upload file satu per satu di tabel bawah.'}</p>
      ${S.folderName ? `<p class="source" style="margin-top:8px">Folder <b>${esc(S.folderName)}</b>, terakhir dimuat ${esc(t(S.folderLoadedAt))}</p>` : ''}
      <p class="source" style="margin-top:4px"><span id="cacheInfo">Cache browser: menghitung…</span> <button class="btn ghost" id="cacheClr" title="Hapus hasil baca yang tersimpan di browser ini. Login berikutnya membaca ulang semua Excel.">Hapus cache</button></p></section>
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
  Cache.info().then((c) => { if ($('cacheInfo')) $('cacheInfo').textContent = c.files ? `Cache browser: ${c.files} file, ${fmt(c.bytes / 1048576, 1)} MB, terenkripsi. File yang tidak berubah tidak dibaca ulang saat login.` : 'Cache browser: kosong.'; });
  $('cacheClr').onclick = async () => { await Cache.clear(); route(); };
  const LOAD = { mb52: loadMB52, mrp: loadMRP, me3n: loadME3N, me2n: loadME2N, mb51: loadMB51, mb25: loadMB25, rkm: (f) => loadRKM(f), ds: loadDS };
  document.querySelectorAll('.up').forEach((inp) => (inp.onchange = async (e) => {
    const files = [...e.target.files]; if (!files.length) return; $('upMsg').textContent = 'Memproses ' + files.map((f) => f.name).join(', ') + '…'; await tick();
    try { for (const f of files) await LOAD[inp.dataset.k](f); recompute(); route(); } catch (err) { $('upMsg').textContent = 'Gagal membaca file: ' + err.message; $('upMsg').className = 'small neg'; }
  }));
  document.querySelectorAll('.rp').forEach((sl) => (sl.onchange = () => { const f = S.rkmFiles[sl.dataset.i]; f.plant = sl.value; const m = store.get('rkmPlant') || {}; m[f.fileName] = sl.value; store.set('rkmPlant', m); recompute(); route(); }));
  document.querySelectorAll('.rx').forEach((b) => (b.onclick = () => { S.rkmFiles.splice(+b.dataset.i, 1); recompute(); route(); }));
};

PAGES.pengaturan = function () {
  const all = [...new Set([...(S.mb52 ? S.mb52.plants : []), ...(S.mrp ? S.mrp.plants : []), ...Object.keys(DEFAULT_ZONA), ...S.mrpPlants])].sort();
  const P = (k) => (S.set.tko[k] != null ? S.set.tko[k] : MRP.TKO_DEFAULT[k]);
  $('view').innerHTML = `<section class="panel"><div class="panel-h"><h2>Plant dan zona</h2><span class="sub">Zona dipakai di dashboard. Min/Max hanya dihitung untuk plant yang dipantau MRP.</span></div>
      ${plainTable(all, [['Plant', (p) => `<b>${esc(p)}</b>`], ['Nama', (p) => esc(PLANT_NAME[p] || '')],
        ['Zona', (p) => `<select class="zn" data-p="${esc(p)}" aria-label="Zona ${esc(p)}">${ZONA_LIST.map((z) => `<option ${zonaOf(p) === z ? 'selected' : ''}>${z}</option>`).join('')}</select>`],
        ['Dipantau MRP', (p) => `<input type="checkbox" class="mp" value="${esc(p)}" ${S.mrpPlants.has(p) ? 'checked' : ''} aria-label="Pantau ${esc(p)}">`]])}</section>
    <section class="panel"><div class="panel-h"><h2>Mata uang dan kurs</h2></div>
      <div class="params"><label>Rupiah per 1 USD<span><input type="number" id="kurs" min="1" step="1" value="${S.set.kurs}"></span></label>
        ${['PEP', 'PHE'].map((w) => `<label>Mata uang nilai stok MB52 WK ${w}<span><select class="wkc" data-w="${w}">${['IDR', 'USD'].map((c) => `<option ${(S.set.wkCur || {})[w] === c ? 'selected' : ''}>${c}</option>`).join('')}</select></span></label>`).join('')}</div>
      <p class="muted small" style="margin-top:8px">Nilai awal Rp 18.150 (JISDOR awal Nov 2026); sesuaikan dengan kurs kantor. ${infoI('Kurs dipakai untuk konversi IDR dan USD di dashboard dan estimasi nilai. MB52 tidak mencantumkan mata uang, jadi mata uang nilai stok diatur per WK (company code). Pastikan sesuai dengan SAP.')}</p></section>
    <section class="panel"><div class="panel-h"><h2>Metode perhitungan MRP</h2></div>
      <div class="radios">${Object.entries(METHOD).map(([k, t]) => `<label class="radio"><input type="radio" name="method" value="${k}" ${S.set.method === k ? 'checked' : ''}>${esc(t)}</label>`).join('')}</div>
      ${S.set.method === 'tko' ? `<div class="params" style="margin-top:12px">${TKO_FIELDS.map(([k, t, u]) => `<label>${esc(t)} <span class="muted">(${u})</span><span><input type="number" step="0.5" min="0" data-k="${k}" value="${P(k)}"></span></label>`).join('')}
        <label>Rumus Max untuk maintenance<span><select data-s="maxFormula">${[['A', 'A: 2 × AMU × T + SS'], ['B', 'B: AMU × T + 2 × SS'], ['C', 'C: ROP + n × AMU'], ['BC', 'B untuk kontrak, C tanpa kontrak']].map(([v, t]) => `<option value="${v}" ${P('maxFormula') === v ? 'selected' : ''}>${t}</option>`).join('')}</select></span></label>
        <label>Moderate (MD) dihitung sebagai FS<span><select data-s="mdAsFS"><option value="1" ${P('mdAsFS') ? 'selected' : ''}>Ya, perlu konfirmasi user</option><option value="0" ${P('mdAsFS') ? '' : 'selected'}>Tidak, Min = Max = SS</option></select></span></label>
        <label>Service level non-critical<span><select data-z="z">${[[1.282, '90%'], [1.645, '95%'], [2.054, '98%'], [2.326, '99%']].map(([z, t]) => `<option value="${z}" ${P('z') == z ? 'selected' : ''}>${t}</option>`).join('')}</select></span></label></div>
        <p class="muted small" style="margin-top:8px">Penjelasan rumus ada di <a href="#/regulasi">Panduan & Aturan</a>. <a href="#" id="tkoReset">Kembalikan default</a></p>` : ''}</section>
    <section class="panel"><div class="panel-h"><h2>MRP WK PHE</h2><span class="sub">Sementara, sampai file MRP PHE dibuat</span></div>
      <div class="params"><label>Lead time default bila material tidak ada di master MRP PEP<span><input type="number" id="pheLT" min="0.5" max="36" step="0.5" value="${S.set.pheLT || 3}"></span></label></div>
      <p class="muted small" style="margin-top:8px">Pemakaian dari MB51 client 180 (Own Use + Return, tanpa network/proyek). ${infoI('Pemakaian diambil dari MB51 client 180: Mvt kategori Own Use dan Return, tanpa GI ke network/proyek (221, 222, 949, 950). Aturan ini sama dengan file MRP PEP (dicek Oktober 2026, cocok 363 dari 364 material×plant).')}</p></section>
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
    mvt: ['Aturan Movement Type', `<p class="muted small" style="margin-bottom:10px">Cara web mengelompokkan setiap baris MB51. Kunci = Movement Type + tanda qty; penerimaan 101–106 dibedakan dari 2 digit awal No. PO (42 = STO/BAU, 94 = MTA, 92 = khusus).</p><div id="regMvt"></div>`],
    pedoman: ['Pedoman / TKO', S.regulasi ? `<div class="panel md"><p class="muted small">Dibaca dari file lokal <b>${esc(S.regulasi.name)}</b>. Tidak tersimpan di web/GitHub.</p>${md(S.regulasi.text)}</div>`
      : `<div class="panel empty"><h3>Ringkasan Pedoman belum dimuat</h3>
        <p>Isi Pedoman/TKO bersifat internal, jadi tidak disimpan di web. Taruh file ringkasan (.md) yang namanya memuat kata "regulasi" di folder data, atau pilih filenya di sini.</p>
        <label class="btn primary">Pilih file .md<input type="file" id="regf" accept=".md,.txt" hidden></label></div>`],
  };
  if (!T[S.regTab]) S.regTab = 'mrp';
  $('view').innerHTML = `<div class="tabs">${Object.entries(T).map(([k, t]) => `<button class="tab ${k === S.regTab ? 'on' : ''}" data-t="${k}">${esc(t[0])}</button>`).join('')}</div>${T[S.regTab][1]}`;
  document.querySelectorAll('.tab').forEach((b) => (b.onclick = () => { S.regTab = b.dataset.t; PAGES.regulasi(); }));
  if ($('regMvt')) window.mvtRulesTable($('regMvt'));
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
