// Vault: kunci data per-user (PBKDF2 -> AES-GCM). Jalan di browser dan Node.
(function (root) {
  const subtle = (root.crypto || require('crypto').webcrypto).subtle;
  const rnd = (n) => (root.crypto || require('crypto').webcrypto).getRandomValues(new Uint8Array(n));
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = (u8) => { let s = ''; u8.forEach(b => s += String.fromCharCode(b)); return (root.btoa || ((x) => Buffer.from(x, 'binary').toString('base64')))(s); };
  const unb64 = (s) => Uint8Array.from((root.atob || ((x) => Buffer.from(x, 'base64').toString('binary')))(s), c => c.charCodeAt(0));
  const ITER = 250000;

  async function deriveKey(password, salt) {
    const base = await subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']);
    return subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function encryptJSON(key, obj) {
    const iv = rnd(12);
    const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj))));
    return { iv: b64(iv), ct: b64(ct) };
  }
  async function decryptJSON(key, box) {
    const pt = await subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, key, unb64(box.ct));
    return JSON.parse(dec.decode(pt));
  }
  async function newDataKey() {
    return subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  }
  // Buat entri user: dataKey dibungkus dengan kunci dari password user
  async function wrapForUser(dataKey, password, role) {
    const salt = rnd(16);
    const k = await deriveKey(password, salt);
    const raw = b64(new Uint8Array(await subtle.exportKey('raw', dataKey)));
    return { salt: b64(salt), ...(await encryptJSON(k, { role, dataKey: raw })) };
  }
  // Login: buka entri user, kembalikan {role, dataKey}
  async function login(entry, password) {
    const k = await deriveKey(password, unb64(entry.salt));
    const { role, dataKey } = await decryptJSON(k, entry); // gagal = password salah
    const key = await subtle.importKey('raw', unb64(dataKey), 'AES-GCM', false, ['decrypt']);
    return { role, key };
  }
  root.Vault = { newDataKey, wrapForUser, encryptJSON, decryptJSON, login };
  if (typeof module !== 'undefined') module.exports = root.Vault;
})(typeof window !== 'undefined' ? window : globalThis);
