// ============ Auto-load dari folder lokal (File System Access API — Chrome/Edge desktop) ============
// Folder dipilih sekali; "pegangan" folder disimpan di IndexedDB browser ini (bukan isi file).
// Tiap sesi browser minta izin 1 klik. File tidak pernah dikirim ke mana pun.
(function (root) {
  const DB = 'mim-web', STORE = 'kv', KEY = 'dataFolder';
  const supported = () => typeof root.showDirectoryPicker === 'function' && typeof root.indexedDB !== 'undefined';
  function idb(mode, fn) {
    return new Promise((res, rej) => {
      const o = indexedDB.open(DB, 1);
      o.onupgradeneeded = () => o.result.createObjectStore(STORE);
      o.onerror = () => rej(o.error);
      o.onsuccess = () => { const tx = o.result.transaction(STORE, mode); const r = fn(tx.objectStore(STORE)); tx.oncomplete = () => res(r && r.result); tx.onerror = () => rej(tx.error); };
    });
  }
  const saveHandle = (h) => idb('readwrite', (s) => s.put(h, KEY));
  const loadHandle = () => idb('readonly', (s) => s.get(KEY)).catch(() => null);
  const forget = () => idb('readwrite', (s) => s.delete(KEY));

  async function pick() { const h = await root.showDirectoryPicker({ id: 'mim-data', mode: 'read' }); await saveHandle(h); return h; }
  async function permission(h, ask) {
    const opt = { mode: 'read' };
    if ((await h.queryPermission(opt)) === 'granted') return true;
    return ask ? (await h.requestPermission(opt)) === 'granted' : false;
  }
  // Kumpulkan file Excel (folder utama + 1 tingkat subfolder).
  // Khusus folder yang namanya memuat "RKM" (mis. RKM 2027/<Lapangan>/...): dibaca sampai 4 tingkat.
  const isRkmPath = (p) => /rkm/i.test(p);
  async function listExcel(h, depth = 0, prefix = '') {
    const out = [];
    for await (const [name, e] of h.entries()) {
      if (e.kind === 'file' && /\.(xlsx|xlsm|xls|md)$/i.test(name) && !name.startsWith('~$')) { const f = await e.getFile(); out.push({ name: prefix + name, file: f }); }
      else if (e.kind === 'directory' && (depth < 1 || (isRkmPath(prefix + name) && depth < 4))) out.push(...(await listExcel(e, depth + 1, prefix + name + '/')));
    }
    return out;
  }
  // File hasil rekap/olahan (bukan RKM dari user) → tidak dihitung supaya tidak dobel
  const RKM_OUTPUT = /integrated|rekap\s*(rkm|per\s*lapangan)|format\s*shu|lli\s*monitoring|rkm\s*x\s*mrp/i;
  // Pilih file berdasarkan nama: MB52 & MRP = yang terbaru; RKM = semua; .md regulasi/pedoman = yang terbaru
  function classify(files) {
    const all = files.filter((f) => !/\.md$/i.test(f.name)), md = files.filter((f) => /\.md$/i.test(f.name));
    // RKM: semua Excel yang nama file ATAU foldernya memuat "RKM", kecuali file hasil rekap
    const rkmAll = all.filter((f) => isRkmPath(f.name));
    const rkmSkip = rkmAll.filter((f) => RKM_OUTPUT.test(f.name.split('/').pop()));
    const rkm = rkmAll.filter((f) => !rkmSkip.includes(f));
    const xl = all.filter((f) => !rkmAll.includes(f)); // file RKM tidak ikut dianggap MRP/DS/SAP
    const base = (f) => f.name.split('/').pop();
    const nw = (arr, re) => arr.filter((f) => re.test(base(f))).sort((a, b) => b.file.lastModified - a.file.lastModified)[0] || null;
    // file SAP: ambil yang terbaru untuk SETIAP client (mis. _100_ = WK PEP, _180_ = WK PHE)
    const perClient = (re) => { const m = new Map(); xl.filter((f) => re.test(base(f))).sort((a, b) => b.file.lastModified - a.file.lastModified)
      .forEach((f) => { const c = (base(f).match(/_(\d{3})_/) || [, ''])[1]; if (!m.has(c)) m.set(c, f); }); return [...m.values()]; };
    return { mb52: perClient(/mb52/i), mrp: nw(xl, /mrp/i), me3n: perClient(/me3n/i), me2n: perClient(/me2n/i), mb51: xl.filter((f) => /mb51/i.test(base(f))).sort((a, b) => a.file.lastModified - b.file.lastModified), mb25: perClient(/mb25/i), // MB51: semua file (upload berkala) digabung
      ds: nw(xl.filter((f) => !/mb5[12]|me[23]n|mb25|mrp/i.test(base(f))), /deadstock|(^|[_\s-])ds([_\s.-]|$)/i),
      rkm, rkmSkip, regulasi: nw(md, /regulasi|pedoman|otak/i) };
  }
  root.Folder = { supported, pick, loadHandle, forget, permission, listExcel, classify, RKM_OUTPUT };
})(typeof window !== 'undefined' ? window : globalThis);
