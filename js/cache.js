// ============ Cache hasil baca Excel (IndexedDB browser ini, terenkripsi) ============
// Tujuan: refresh/login tidak perlu membaca ulang semua Excel. File yang sama (nama + ukuran + tanggal ubah)
// diambil dari cache; file baru atau berubah dibaca ulang. Isi cache dienkripsi AES-GCM dengan kunci turunan
// (HKDF) dari kunci data login, jadi tanpa login isinya tidak bisa dibaca. Cache tidak pernah dikirim ke mana pun.
(function (root) {
  const DB = 'mim-cache', STORE = 'parsed';
  const enc = new TextEncoder(), dec = new TextDecoder();
  // versi web (dari ?v= di index.html): kode parser berubah → cache lama otomatis tidak dipakai
  const VER = ((document.querySelector('script[src*="js/cache.js"]') || {}).src || '').replace(/.*[?&]v=/, '') || '0';
  let key = null;

  function open() {
    return new Promise((res, rej) => {
      const o = indexedDB.open(DB, 1);
      o.onupgradeneeded = () => o.result.createObjectStore(STORE);
      o.onerror = () => rej(o.error); o.onsuccess = () => res(o.result);
    });
  }
  async function tx(mode, fn) {
    const db = await open();
    return new Promise((res, rej) => { const t = db.transaction(STORE, mode); const r = fn(t.objectStore(STORE)); t.oncomplete = () => { db.close(); res(r && r.result); }; t.onerror = () => { db.close(); rej(t.error); }; });
  }

  // Simpan objek apa adanya: Map, Set, Date, NaN/undefined, dan objek yang dipakai di beberapa tempat
  // (mis. item kontrak yang menunjuk ke kontrak yang sama) tetap satu objek setelah dibuka lagi.
  function pack(root) {
    const count = new Map(), stack = [root];
    while (stack.length) {
      const v = stack.pop();
      if (v === null || typeof v !== 'object' || v instanceof Date) continue;
      const c = count.get(v); if (c) { count.set(v, c + 1); continue; } count.set(v, 1);
      if (v instanceof Map) v.forEach((x, k) => { stack.push(k); stack.push(x); });
      else if (v instanceof Set) v.forEach((x) => stack.push(x));
      else if (Array.isArray(v)) for (let i = 0; i < v.length; i++) stack.push(v[i]);
      else for (const k in v) stack.push(v[k]);
    }
    const ids = new Map(), wraps = new WeakSet();
    return JSON.stringify(root, function (k, x) {
      const o = this[k];
      if (o === undefined) return { '§u': 1 };
      if (typeof o === 'number' && !isFinite(o)) return { '§n': String(o) };
      if (o instanceof Date) return { '§d': +o };
      if (o === null || typeof o !== 'object') return x;
      if (!(k === '§v' && wraps.has(this)) && count.get(o) > 1) {
        if (ids.has(o)) return { '§r': ids.get(o) };
        const w = { '§i': ids.size, '§v': o }; ids.set(o, w['§i']); wraps.add(w); return w;
      }
      if (o instanceof Map) return { '§m': [...o] };
      if (o instanceof Set) return { '§s': [...o] };
      return x;
    });
  }
  function unpack(s) {
    const tab = [];
    return JSON.parse(s, (k, x) => {
      if (!x || typeof x !== 'object' || Array.isArray(x)) return x;
      if ('§i' in x) return (tab[x['§i']] = x['§v']);
      if ('§r' in x) return tab[x['§r']];
      if ('§d' in x) return new Date(x['§d']);
      if ('§m' in x) return new Map(x['§m']);
      if ('§s' in x) return new Set(x['§s']);
      if ('§n' in x) return Number(x['§n']);
      if ('§u' in x) return undefined;
      return x;
    });
  }

  async function gz(bytes, mode) { // gzip agar cache kecil
    if (typeof CompressionStream === 'undefined') return bytes;
    const s = new Blob([bytes]).stream().pipeThrough(mode === 'c' ? new CompressionStream('gzip') : new DecompressionStream('gzip'));
    return new Uint8Array(await new Response(s).arrayBuffer());
  }

  async function init(rawB64) {
    key = null;
    try {
      const raw = Uint8Array.from(atob(rawB64), (c) => c.charCodeAt(0));
      const base = await crypto.subtle.importKey('raw', raw, 'HKDF', false, ['deriveKey']);
      key = await crypto.subtle.deriveKey({ name: 'HKDF', hash: 'SHA-256', salt: enc.encode('mim-cache'), info: enc.encode('parsed-excel') }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
    } catch { key = null; }
  }
  const idOf = (kind, file) => [VER, kind, file.name, file.size, file.lastModified].join('|');
  const used = new Set();

  async function get(id) {
    const box = await tx('readonly', (s) => s.get(id)).catch(() => null);
    if (!box) return undefined;
    try { const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: box.iv }, key, box.ct); return unpack(dec.decode(await gz(new Uint8Array(pt), 'd'))); }
    catch { return undefined; } // kunci beda (data key diganti) atau rusak → baca ulang
  }
  async function put(id, val) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, await gz(enc.encode(pack(val)), 'c'));
    await tx('readwrite', (s) => s.put({ iv, ct, at: Date.now() }, id)).catch(() => {});
  }

  // parse(file) dari cache bila ada; jika tidak, baca Excel lalu simpan. Mengembalikan {value, hit}.
  async function parse(kind, file, fn) {
    if (!key || typeof indexedDB === 'undefined') return { value: fn(await file.arrayBuffer()), hit: false };
    const id = idOf(kind, file); used.add(id);
    const hit = await get(id);
    if (hit !== undefined) return { value: hit, hit: true };
    const value = fn(await file.arrayBuffer());
    await put(id, value);
    return { value, hit: false };
  }
  // buang entri yang tidak dipakai lagi (file sudah dihapus/diganti, atau versi web lama)
  async function prune() {
    const keys = await tx('readonly', (s) => s.getAllKeys()).catch(() => []);
    const old = (keys || []).filter((k) => !used.has(k));
    if (old.length) await tx('readwrite', (s) => old.forEach((k) => s.delete(k))).catch(() => {});
    return old.length;
  }
  async function info() {
    const all = await tx('readonly', (s) => s.getAll()).catch(() => []);
    return { files: (all || []).length, bytes: (all || []).reduce((a, b) => a + (b.ct ? b.ct.byteLength : 0), 0) };
  }
  const clear = () => { used.clear(); return tx('readwrite', (s) => s.clear()).catch(() => {}); };
  const resetUsed = () => used.clear();
  root.Cache = { init, parse, prune, info, clear, resetUsed };
})(window);
