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
  // Kumpulkan file Excel (folder utama + 1 tingkat subfolder)
  async function listExcel(h, depth = 0, prefix = '') {
    const out = [];
    for await (const [name, e] of h.entries()) {
      if (e.kind === 'file' && /\.(xlsx|xlsm|xls|md)$/i.test(name) && !name.startsWith('~$')) { const f = await e.getFile(); out.push({ name: prefix + name, file: f }); }
      else if (e.kind === 'directory' && depth < 1) out.push(...(await listExcel(e, depth + 1, prefix + name + '/')));
    }
    return out;
  }
  // Pilih file berdasarkan nama: MB52 & MRP = yang terbaru; RKM = semua; .md regulasi/pedoman = yang terbaru
  function classify(files) {
    const newest = (re) => files.filter((f) => re.test(f.name.split('/').pop())).sort((a, b) => b.file.lastModified - a.file.lastModified)[0] || null;
    const xl = files.filter((f) => !/\.md$/i.test(f.name)), md = files.filter((f) => /\.md$/i.test(f.name));
    const nw = (arr, re) => arr.filter((f) => re.test(f.name.split('/').pop())).sort((a, b) => b.file.lastModified - a.file.lastModified)[0] || null;
    return { mb52: nw(xl, /mb52/i), mrp: nw(xl, /mrp/i), me3n: nw(xl, /me3n/i), me2n: nw(xl, /me2n/i), rkm: xl.filter((f) => /rkm/i.test(f.name.split('/').pop())), regulasi: nw(md, /regulasi|pedoman|otak/i) };
  }
  root.Folder = { supported, pick, loadHandle, forget, permission, listExcel, classify };
})(typeof window !== 'undefined' ? window : globalThis);
