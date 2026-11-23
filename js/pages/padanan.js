// ============ Padanan KIMAP (menu di grup Data): material yang sepadan di satu WK atau lintas WK ============
// Satu entri = satu KIMAP di satu WK (client 100 = PEP, 180 = PHE). Dua entri dianggap sepadan bila:
//  1) KIMAP sama persis di dua WK, ATAU
//  2) deskripsi sangat mirip: kata (non-angka) sama >= 80% DAN spesifikasi (token ber-angka: ukuran, grade, rating, nomor part) tidak bertentangan, ATAU
//  3) kode mirip (beda <= 2 karakter) + deskripsi mirip (kata sama >= 60%, spesifikasi tidak bertentangan).
// "Spesifikasi tidak bertentangan" = himpunan token ber-angka salah satunya kosong atau bagian dari yang lain (mis. nomor part hanya ada di satu sisi).
// 9/16X6IN lawan 9/16X4IN, K55 lawan L80, 3IN lawan 14IN = bertentangan = BUKAN padanan. Hasil akhir digabung jadi grup (pasangan yang saling terhubung).
// Diuji dengan MB52 asli (PEP 100 + PHE 180); batas ada di THRESH.
(function () {
  const THRESH = { descOnly: 0.8, nearDesc: 0.6, maxDist: 2, bucket: 300 };
  const STOP = new Set(['PN']);
  // Tokenisasi deskripsi SAP. Token ber-angka dijaga utuh (6IN, 9/16X6IN, K55, 4-1/2, R3, 153610); inch dan SCH dirapikan; kata dipisah di koma, spasi, strip, titik, garis miring.
  const toks = (d) => {
    const s = String(d || '').toUpperCase().replace(/[“”]/g, '"').replace(/(\d)\s*("|'')/g, '$1IN').replace(/(\d)\s*INCH(ES)?\b/g, '$1IN').replace(/(\d)\s+IN\b/g, '$1IN').replace(/(\d)\s+MM\b/g, '$1MM')
      .replace(/\bSCH\.?\s*(\d)/g, 'S$1').replace(/\b([A-Z])\.\s*(\d)/g, '$1$2').replace(/\bP\/N\b/g, 'PN');
    const out = []; s.split(/[\s,;()]+/).forEach((t) => { t = t.replace(/^[^A-Z0-9#]+|[^A-Z0-9#%]+$/g, ''); if (!t) return; if (/\d/.test(t)) out.push(t); else t.split(/[-\/.&+]+/).forEach((w) => w && !STOP.has(w) && out.push(w)); });
    return [...new Set(out)];
  };
  const jac = (a, b) => { if (!a.length || !b.length) return 0; const sb = new Set(b); let i = 0; a.forEach((t) => sb.has(t) && i++); return i / (a.length + b.length - i); };
  const subset = (a, b) => a.every((x) => b.includes(x));
  const compat = (a, b) => !a.length || !b.length || subset(a, b) || subset(b, a);
  // deskripsi terlalu umum (mis. "GASKET,SEAT") tidak cukup untuk menyatakan dua KIMAP sepadan: butuh >= 3 kata/token atau ada spesifikasi ber-angka
  const informative = (e) => e.t.length >= 3 || e.c.length > 0;
  const lev = (a, b) => { if (Math.abs(a.length - b.length) > THRESH.maxDist) return 99; let p = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) { const c = [i]; for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[b.length]; };

  function entries() {
    const map = new Map();
    const add = (m, wk, desc, uom) => { if (!m) return; const k = m + '|' + wk; let e = map.get(k); if (!e) map.set(k, (e = { code: String(m), wk, desc: '', uom: '' })); e.desc = e.desc || desc || ''; e.uom = e.uom || uom || ''; };
    if (S.mb52) S.mb52.items.forEach((i) => add(i.material, i.wk || wkOfPlant(i.plant) || 'PEP', i.desc, i.uom));
    if (S.mrpRes) for (const r of S.mrpRes.values()) add(r.material, r.wk || 'PEP', r.desc, r.uom);
    const out = [...map.values()]; out.forEach((e) => { e.t = toks(e.desc); e.w = e.t.filter((x) => !/\d/.test(x)); e.c = e.t.filter((x) => /\d/.test(x)); }); return out;
  }
  // kemiripan = Jaccard kata; dikurangi 10% bila spesifikasi tidak identik persis (mis. nomor part hanya di satu sisi), jadi pasangan "sebagian" selalu di bawah yang identik
  const simOf = (a, b) => Math.round(100 * jac(a.w, b.w) * (a.c.length === b.c.length && subset(a.c, b.c) ? 1 : 0.9));

  function pairs() {
    if (S._pad && S._pad.ver === S.ver) return S._pad.list;
    const E = entries(), seen = new Set(), list = [];
    const put = (a, b, reason, kind, sim) => { if (a.code === b.code && a.wk === b.wk) return; const k = [a.code + a.wk, b.code + b.wk].sort().join('~'); if (seen.has(k)) return; seen.add(k);
      if (a.wk > b.wk || (a.wk === b.wk && a.code > b.code)) [a, b] = [b, a]; list.push({ a, b, sim, reason, kind, strong: a.c.length === b.c.length && subset(a.c, b.c), jenis: a.wk === b.wk ? 'Sesama WK' : 'Lintas WK' }); };
    // 1) KIMAP sama persis di WK berbeda
    const byCode = new Map(); E.forEach((e) => (byCode.get(e.code) || byCode.set(e.code, []).get(e.code)).push(e));
    byCode.forEach((g) => { for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) put(g[i], g[j], 'KIMAP sama persis', 'exact', simOf(g[i], g[j])); });
    // 2) kode mirip: bucket "hapus 1 karakter"
    const vr = new Map(); E.forEach((e) => { if (e.code.length < 6) return; const vs = new Set([e.code]); for (let i = 0; i < e.code.length; i++) vs.add(e.code.slice(0, i) + e.code.slice(i + 1)); vs.forEach((v) => (vr.get(v) || vr.set(v, []).get(v)).push(e)); });
    vr.forEach((g) => { if (g.length > 40) return; for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) { const a = g[i], b = g[j]; if (a.code === b.code || a.w.length < 2 || !informative(a) || !informative(b) || !compat(a.c, b.c)) continue; const d = lev(a.code, b.code); if (d > THRESH.maxDist) continue;
      if (jac(a.w, b.w) >= THRESH.nearDesc) put(a, b, `Kode beda ${d} karakter`, 'code', simOf(a, b)); } });
    // 3) deskripsi sangat mirip: indeks kata (3 kata paling jarang per entri)
    const freq = new Map(); E.forEach((e) => e.t.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1)));
    const inv = new Map(); E.forEach((e) => { if (e.w.length < 2) return; e.t.slice().sort((x, y) => freq.get(x) - freq.get(y)).slice(0, 3).forEach((w) => { if (freq.get(w) <= THRESH.bucket) (inv.get(w) || inv.set(w, []).get(w)).push(e); }); });
    inv.forEach((g) => { for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) { const a = g[i], b = g[j]; if (a.code === b.code || !informative(a) || !informative(b) || !compat(a.c, b.c)) continue; if (jac(a.w, b.w) >= THRESH.descOnly) put(a, b, 'Deskripsi mirip', 'desc', simOf(a, b)); } });
    S._pad = { ver: S.ver, list }; return list;
  }
  // Grup = pasangan yang saling terhubung (union-find). Tiap grup: anggota, kemiripan terendah antar-pasangan, dasar (KIMAP sama / kode mirip / deskripsi), dan apakah lintas WK.
  function groups() {
    if (S._padG && S._padG.ver === S.ver) return S._padG.list;
    const L = pairs(), par = new Map(), find = (x) => { while (par.get(x) !== x) { par.set(x, par.get(par.get(x))); x = par.get(x); } return x; };
    // hanya pasangan dengan spesifikasi identik ("kuat") yang digabung; pasangan dengan nomor part di satu sisi saja ("sebagian") berdiri sebagai grup sendiri supaya satu deskripsi umum tidak menyedot banyak part berbeda
    const strong = L.filter((p) => p.strong), weak = L.filter((p) => !p.strong);
    strong.forEach((p) => { [p.a, p.b].forEach((e) => !par.has(e) && par.set(e, e)); par.set(find(p.a), find(p.b)); });
    const g = new Map(); strong.forEach((p) => { const r = find(p.a), o = g.get(r) || g.set(r, { members: new Set(), edges: [] }).get(r); o.members.add(p.a); o.members.add(p.b); o.edges.push(p); });
    weak.forEach((p, i) => { if (par.has(p.a) && par.has(p.b) && find(p.a) === find(p.b)) return; g.set('w' + i, { members: new Set([p.a, p.b]), edges: [p] }); });
    const list = [...g.values()].map((o) => { const m = [...o.members].sort((x, y) => (x.wk === y.wk ? x.code.localeCompare(y.code) : x.wk.localeCompare(y.wk))), wks = new Set(m.map((e) => e.wk)), kinds = new Set(o.edges.map((p) => p.kind));
      return { members: m, edges: o.edges, n: m.length, sim: Math.min(...o.edges.map((p) => p.sim)), lintas: wks.size > 1, jenis: wks.size > 1 ? 'Lintas WK' : 'Sesama WK', kind: kinds.has('exact') ? 'exact' : kinds.has('code') ? 'code' : 'desc',
        basis: kinds.has('exact') ? 'KIMAP sama persis' : kinds.has('code') ? 'Kode mirip' : o.edges.every((p) => !p.strong) ? 'Deskripsi mirip, nomor part hanya di satu sisi' : 'Deskripsi mirip', head: m[0] }; });
    list.sort((x, y) => y.sim - x.sim || y.n - x.n || (x.head.desc || '').localeCompare(y.head.desc || ''));
    S._padG = { ver: S.ver, list }; return list;
  }
  PAGES.padanan_pairs = pairs; PAGES.padanan_groups = groups; PAGES.padanan_toks = toks; // dipakai uji dengan data asli

  PAGES.padanan = function () {
    const host = $('view'); MP.zonaHook = () => PAGES.padanan();
    if (!S.mb52 && !S.mrpRes) { host.innerHTML = needFile('MB52 atau MRP', 'Padanan KIMAP dihitung dari daftar material di MB52 dan MRP.'); return; }
    const F = (S.fpd = S.fpd || { q: '', tipe: new Set() });
    host.innerHTML = '<div id="pdF"></div><div id="pdK" style="margin-top:14px"></div><div id="pdT" style="margin-top:14px"></div>';
    const G0 = groups(), inWK = (g) => S.wkSel === 'all' || g.members.every((e) => e.wk === S.wkSel);
    const draw = () => {
      const base = G0.filter((g) => inWK(g) && g.members.some((e) => T.matOk(F, e.code, e.desc)) && T.match(g.members.map((e) => e.code + ' ' + e.desc).join(' '), F.q));
      const n = (f) => base.filter(f).length, isT = (v, g) => (v === 'cross' ? g.lintas : v === 'same' ? !g.lintas : g.kind === 'exact');
      $('pdK').innerHTML = T.kpis([['Grup padanan', fmt(base.length, 0), fmt(base.reduce((a, g) => a + g.n, 0), 0) + ' KIMAP', 'k-max', ''], ['Lintas WK', fmt(n((g) => g.lintas), 0), 'PEP dengan PHE', 'k-cross', 'cross'], ['Sesama WK', fmt(n((g) => !g.lintas), 0), 'dalam satu WK', 'k-min', 'same'], ['KIMAP sama persis', fmt(n((g) => g.kind === 'exact'), 0), 'kode identik di dua WK', 'k-ok', 'exact']]);
      T.bindKpis($('pdK'), F, 'tipe', draw);
      const rows = base.filter((g) => !F.tipe.size || [...F.tipe].some((v) => isT(v, g)));
      const wk = (e) => `<span class="wk wk-${esc(e.wk)}">${esc(e.wk)}</span>`;
      T.table($('pdT'), { rows, name: 'Padanan_KIMAP', empty: 'Tidak ada padanan pada filter ini.', onRow: (g) => listGroup(g), cols: [
        { label: 'Material', w: 3.2, get: (g) => g.head.desc, html: (g) => T.two(g.head.desc || g.head.code, g.head.code + ' · WK ' + g.head.wk), cls: (g) => (g.lintas ? 'xw-cross' : 'xw-same') },
        { label: 'KIMAP padanan', w: 3.4, get: (g) => g.members.map((e) => e.code).join(' '), html: (g) => g.members.slice(0, 4).map((e) => `<span class="kc">${esc(e.code)} ${wk(e)}</span>`).join(' ') + (g.n > 4 ? ` <span class="muted">+${g.n - 4}</span>` : '') },
        { label: 'Anggota', type: 'num', w: 0.7, get: (g) => g.n },
        { label: 'Kemiripan deskripsi', type: 'status', w: 1.1, get: (g) => g.sim, html: (g) => T.pill(g.sim + '%', g.sim >= 95 ? 'ok' : g.sim >= 85 ? 'info' : 'warn') },
        { label: 'Hubungan', type: 'status', w: 1, get: (g) => g.jenis, html: (g) => T.pill(g.jenis, g.lintas ? 'cross' : 'same') }, { label: 'Dasar', w: 1.4, get: (g) => g.basis }] });
    };
    // pop-up anggota grup
    const listGroup = (g) => { const b = UI.drawer(`<div class="mhead"><h2>${esc(g.head.desc || g.head.code)}</h2><div class="meta"><span>${fmt(g.n, 0)} KIMAP</span>${T.pill(g.jenis, g.lintas ? 'cross' : 'same')}<span>kemiripan terendah ${g.sim}%</span></div></div><div id="gm"></div>`, { wide: true, label: 'Grup padanan' });
      T.table(b.querySelector('#gm'), { rows: g.members, pageSize: 15, name: 'Grup_padanan', onRow: (e) => MP.detail(e.code), cols: [{ label: 'KIMAP', w: 1.2, get: (e) => e.code }, { label: 'WK', type: 'status', w: 0.6, get: (e) => e.wk, html: (e) => `<span class="wk wk-${esc(e.wk)}">${esc(e.wk)}</span>` },
        { label: 'Deskripsi', w: 4, get: (e) => e.desc }, { label: 'Satuan', w: 0.6, get: (e) => e.uom }] }); };
    T.filters($('pdF'), { q: 'Cari KIMAP atau deskripsi. Contoh: gasket, K180100047', materials: G0.flatMap((g) => g.members.map((e) => [e.code, e.desc])), selects: [{ key: 'tipe', label: 'Hubungan', options: [['cross', 'Lintas WK'], ['same', 'Sesama WK'], ['exact', 'KIMAP sama persis']] }] }, F, draw);
    draw();
  };
})();
