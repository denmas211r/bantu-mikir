// ============ Governance: Dokumen Aturan (Pedoman, TKO, TKI, Regulasi dalam satu daftar; filter Jenis di tabel) ============
// Dokumen PDF dibaca dari folder lokal pilihan user (Folder.docs, terpisah dari folder data SAP). Tidak ada file/teks yang disalin ke repo atau dikirim keluar.
// Daftar dokumen = tabel; viewer per halaman = penampil PDF bawaan browser; pencarian teks = indeks di browser (pdf.js di vendor/, cache IndexedDB lokal).
// Pembagian jenis (Pedoman/TKO/TKI/Regulasi) dan urutan kekuatan aturan ada di js/config.js.
(function () {
  const DOCR = (window.DOCR = { files: [], rows: [], folder: '', idx: new Map(), url: null });
  const jenisOf = (path) => { const j = CFG.DOK_JENIS.find(([, re]) => re.test(path)); return j ? j[0] : CFG.DOK_LAINNYA; };
  const NOM = /(?:^|[^A-Za-z0-9])([A-Z]\d{1,2})[-_ ](\d{3})(?!\d)/i;
  const nomorOf = (n) => { const m = n.match(NOM); return m ? m[1].toUpperCase() + '-' + m[2] : ''; };
  const tahunOf = (n) => (n.match(/(?:^|[^0-9])((?:19|20)\d{2})(?:[^0-9]|$)/) || [])[1] || '';
  const judulOf = (n) => n.replace(/\.pdf$/i, '').replace(NOM, ' ').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const rankOf = (j) => { const i = CFG.DOK_KEKUATAN.indexOf(j); return i < 0 ? '' : i + 1; };
  const toRows = (files) => files.map((f) => { const j = jenisOf(f.path), d = f.path.includes('/') ? f.path.slice(0, f.path.lastIndexOf('/')) : '';
    return { f, jenis: j, nomor: nomorOf(f.name), judul: judulOf(f.name), tahun: tahunOf(f.name), folder: d, kb: Math.round(f.file.size / 1024), mod: new Date(f.file.lastModified), rank: rankOf(j), key: f.path + '|' + f.file.size + '|' + f.file.lastModified }; });
  DOCR.setFiles = (files, name) => { DOCR.files = files; DOCR.rows = toRows(files); DOCR.folder = name || ''; DOCR.idx = new Map(); };
  DOCR.classify = jenisOf;

  // ---------- cache indeks (IndexedDB lokal) ----------
  const idb = (mode, fn) => new Promise((res, rej) => { const o = indexedDB.open('mim-docs', 1); o.onupgradeneeded = () => o.result.createObjectStore('idx'); o.onerror = () => rej(o.error); o.onsuccess = () => { const tx = o.result.transaction('idx', mode), r = fn(tx.objectStore('idx')); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); }; });
  const cacheGet = (k) => idb('readonly', (s) => s.get(k)).catch(() => null), cachePut = (k, v) => idb('readwrite', (s) => s.put(v, k)).catch(() => null);
  async function lib() {
    if (DOCR.lib) return DOCR.lib;
    const L = await import(new URL('vendor/pdf.min.mjs', document.baseURI).href);
    L.GlobalWorkerOptions.workerSrc = new URL('vendor/pdf.worker.min.mjs', document.baseURI).href; return (DOCR.lib = L);
  }
  async function indexOne(r) {
    if (DOCR.idx.has(r.key)) return DOCR.idx.get(r.key);
    let v = await cacheGet(r.key);
    if (!v) {
      const L = await lib(), pdf = await L.getDocument({ data: new Uint8Array(await r.f.file.arrayBuffer()) }).promise, pages = [];
      for (let p = 1; p <= pdf.numPages; p++) { const t = await (await pdf.getPage(p)).getTextContent(); pages.push(t.items.map((i) => i.str).join(' ').replace(/\s+/g, ' ').trim()); }
      let date = null; try { const m = await pdf.getMetadata(); const c = (m.info && (m.info.CreationDate || m.info.ModDate)) || '', d = String(c).match(/D:(\d{4})(\d{2})(\d{2})/); if (d) date = new Date(+d[1], +d[2] - 1, +d[3]); } catch {}
      v = { pages, date }; await cachePut(r.key, v); pdf.destroy();
    }
    DOCR.idx.set(r.key, v); return v;
  }

  // ---------- viewer per halaman ----------
  function openViewer(r, page = 1) {
    if (DOCR.url) URL.revokeObjectURL(DOCR.url);
    DOCR.url = URL.createObjectURL(r.f.file);
    const body = UI.drawer(`<div class="d-head"><h2>${esc(r.judul || r.f.name)}</h2><p class="muted">${esc(r.jenis)}${r.nomor ? ' · ' + esc(r.nomor) : ''}${r.rank ? ' · kekuatan aturan ' + r.rank + ' dari ' + CFG.DOK_KEKUATAN.length : ''}</p></div>
      <div class="seg-bar"><button class="btn" id="pvPrev">Halaman sebelumnya</button><label>Halaman <input type="number" id="pvPg" min="1" value="${page}" style="width:70px"></label><button class="btn" id="pvNext">Halaman berikutnya</button></div>
      <iframe id="pvFrame" class="pdf-frame" title="Penampil PDF"></iframe>`, { wide: true, label: 'Dokumen' });
    const go = (n) => { n = Math.max(1, n | 0 || 1); body.querySelector('#pvPg').value = n; body.querySelector('#pvFrame').src = DOCR.url + '#page=' + n + '&zoom=page-width'; };
    body.querySelector('#pvPrev').onclick = () => go(+body.querySelector('#pvPg').value - 1); body.querySelector('#pvNext').onclick = () => go(+body.querySelector('#pvPg').value + 1);
    body.querySelector('#pvPg').onchange = (e) => go(+e.target.value); go(page);
  }
  DOCR.openViewer = openViewer;

  // ---------- halaman ----------
  async function loadFrom(h) { DOCR.setFiles(await Folder.docs.listPdf(h), h.name); }
  function render() {
    const tab = S.dkTab || 'list';
    $('view').innerHTML = `<div class="seg-bar"><span id="dkSeg"></span><span id="dkFold"></span></div><div id="dkBody"></div>`;
    UI.seg($('dkSeg'), [['list', 'Daftar dokumen'], ['cari', 'Cari teks']], tab, (v) => { S.dkTab = v; render(); });
    const fold = $('dkFold'); fold.innerHTML = Folder.supported() ? `<button class="btn" id="dkPick">Pilih folder dokumen</button> <button class="btn" id="dkLoad" hidden></button> <span class="note" id="dkInfo"></span>` : '<span class="note">Browser ini tidak mendukung pemilih folder (pakai Chrome/Edge desktop).</span>';
    const info = () => { if ($('dkInfo')) $('dkInfo').textContent = DOCR.rows.length ? `Folder ${DOCR.folder}: ${DOCR.rows.length} PDF` : 'Belum ada folder dokumen.'; };
    const body = $('dkBody');
    const draw = () => { info(); tab === 'list' ? drawList(body) : drawSearch(body); };
    if ($('dkPick')) {
      $('dkPick').onclick = async () => { try { const h = await Folder.docs.pick(); await loadFrom(h); draw(); } catch (e) { if (e.name !== 'AbortError') body.innerHTML = `<p class="muted pad">Gagal membuka folder: ${esc(e.message)}</p>`; } };
      Folder.docs.load().then(async (h) => {
        if (!h || DOCR.rows.length) return draw();
        if ((await h.queryPermission({ mode: 'read' })) === 'granted') { await loadFrom(h); draw(); } else { const b = $('dkLoad'); b.hidden = false; b.textContent = 'Muat folder ' + h.name; b.onclick = async () => { if ((await h.requestPermission({ mode: 'read' })) === 'granted') { await loadFrom(h); b.hidden = true; draw(); } }; draw(); }
      });
    }
    draw();
  }
  function drawList(body) {
    if (!DOCR.rows.length) { body.innerHTML = '<div class="hint">Pilih folder yang berisi dokumen PDF (boleh bersubfolder).</div>'; return; }
    const F = (S.fd = S.fd || { q: '', jenis: new Set() });
    body.innerHTML = '<div id="dkF"></div><div id="dkT" style="margin-top:14px"></div>';
    const draw = () => T.table($('dkT'), { rows: DOCR.rows.filter((r) => T.has(F, 'jenis', r.jenis) && T.match([r.jenis, r.nomor, r.judul, r.tahun, r.folder].join(' '), F.q)).sort((a, b) => (a.rank || 9) - (b.rank || 9) || a.judul.localeCompare(b.judul)),
      name: 'Daftar_Dokumen_Aturan', onRow: (r) => openViewer(r, 1), empty: 'Tidak ada dokumen pada filter ini.', cols: [{ label: 'Jenis', w: 0.8, get: (r) => r.jenis }, { label: 'Nomor', w: 0.8, get: (r) => r.nomor },
        { label: 'Judul', w: 4, get: (r) => r.judul }, { label: 'Tahun', type: 'date', w: 0.6, get: (r) => r.tahun }, { label: 'Ukuran (KB)', type: 'num', w: 0.8, get: (r) => r.kb }] });
    T.filters($('dkF'), { q: 'Cari judul atau nomor dokumen', selects: [{ key: 'jenis', label: 'Jenis', options: [...new Set(DOCR.rows.map((r) => r.jenis))].sort().map((j) => [j, j]) }] }, F, draw);
    draw();
  }
  function drawSearch(body) {
    body.innerHTML = `<div class="seg-bar"><input type="search" id="dsQ" placeholder="Cari kata di semua dokumen" aria-label="Cari teks" style="width:320px"><button class="btn primary" id="dsGo">Cari</button><button class="btn" id="dsIdx">Bangun / perbarui indeks</button><span class="note" id="dsSt"></span></div><div id="dsRes"></div>`;
    const st = (t) => ($('dsSt').textContent = t), have = () => DOCR.rows.filter((r) => DOCR.idx.has(r.key)).length;
    st(DOCR.rows.length ? `${have()} dari ${DOCR.rows.length} dokumen sudah diindeks.` : 'Pilih folder dokumen dulu.');
    $('dsIdx').onclick = async () => {
      let n = 0; try { for (const r of DOCR.rows) { st(`Mengindeks ${++n} dari ${DOCR.rows.length}: ${r.f.name}`); await new Promise((x) => setTimeout(x, 0)); await indexOne(r); } st(`Indeks selesai: ${have()} dokumen. Disimpan di browser ini (IndexedDB), tidak dikirim ke mana pun.`); }
      catch (e) { st('Gagal membuat indeks: ' + e.message + (/pdf\.min|import|fetch/i.test(e.message) ? ' (pastikan vendor/pdf.min.mjs dan vendor/pdf.worker.min.mjs ada)' : '')); }
    };
    const go = async () => {
      const q = $('dsQ').value.trim().toLowerCase(); if (!q) return; const terms = q.split(/\s+/).filter(Boolean), out = [];
      DOCR.rows.forEach((r) => { const v = DOCR.idx.get(r.key); if (!v) return; v.pages.forEach((t, i) => { const lo = t.toLowerCase(); if (!terms.every((w) => lo.includes(w))) return; const at = lo.indexOf(terms[0]), a = Math.max(0, at - 90), e = Math.min(t.length, at + terms[0].length + 90);
        out.push({ r, page: i + 1, snip: (a ? '… ' : '') + t.slice(a, e) + (e < t.length ? ' …' : ''), hits: terms.reduce((s, w) => s + lo.split(w).length - 1, 0) }); }); });
      out.sort((x, y) => y.hits - x.hits); const res = $('dsRes');
      if (!out.length) { res.innerHTML = `<p class="muted pad">${have() ? 'Tidak ada hasil.' : 'Belum ada dokumen yang diindeks. Klik "Bangun / perbarui indeks".'}</p>`; return; }
      T.table(res, { rows: out.slice(0, 3000), name: 'Hasil_cari_dokumen', onRow: (o) => openViewer(o.r, o.page), cols: [{ label: 'Jenis', w: 0.7, get: (o) => o.r.jenis }, { label: 'Dokumen', w: 2.4, get: (o) => o.r.judul || o.r.f.name },
        { label: 'Halaman', type: 'num', w: 0.6, get: (o) => o.page }, { label: 'Kemunculan', type: 'num', w: 0.7, get: (o) => o.hits }, { label: 'Kutipan', w: 4, get: (o) => o.snip }] });
    };
    $('dsGo').onclick = go; $('dsQ').onkeydown = (e) => { if (e.key === 'Enter') go(); };
  }
  PAGES.aturan = render;
})();
