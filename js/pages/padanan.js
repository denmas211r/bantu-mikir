// ============ Padanan KIMAP (tab di Sumber Data): material yang sepadan di satu client atau beda client ============
// Satu entri = satu KIMAP di satu WK (client 100 = PEP, 180 = PHE); stok = jumlah semua plant. Pasangan dicari dengan tiga cara:
//  1) KIMAP sama persis di dua client            -> skor 100
//  2) Kode mirip (beda <= 2 karakter) + deskripsi mirip -> skor = 50% kemiripan kode + 50% kemiripan deskripsi (minimal 80)
//  3) Deskripsi sangat mirip (Jaccard kata >= 80%) -> skor = kemiripan deskripsi
// Kemiripan deskripsi = Jaccard himpunan kata setelah dirapikan (huruf besar, tanpa tanda baca). Batas bisa diubah di THRESH.
(function () {
  const THRESH = { min: 80, descOnly: 0.8, nearDesc: 0.5, maxDist: 2, bucket: 300 };
  const norm = (d) => String(d || '').toUpperCase().replace(/[^A-Z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
  const toks = (d) => [...new Set(norm(d).split(' ').filter(Boolean))];
  const jac = (a, b) => { if (!a.length || !b.length) return 0; const sb = new Set(b); let i = 0; a.forEach((t) => sb.has(t) && i++); return i / (a.length + b.length - i); };
  const lev = (a, b) => { if (Math.abs(a.length - b.length) > THRESH.maxDist) return 99; let p = Array.from({ length: b.length + 1 }, (_, j) => j);
    for (let i = 1; i <= a.length; i++) { const c = [i]; for (let j = 1; j <= b.length; j++) c[j] = Math.min(p[j] + 1, c[j - 1] + 1, p[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); p = c; } return p[b.length]; };

  function entries() {
    const map = new Map();
    const add = (m, wk, plant, desc, uom, stock) => { if (!m) return; const k = m + '|' + wk; let e = map.get(k); if (!e) map.set(k, (e = { code: String(m), wk, desc: '', uom: '', stock: 0 })); e.desc = e.desc || desc || ''; e.uom = e.uom || uom || ''; e.stock += stock || 0; };
    if (S.mb52) S.mb52.items.forEach((i) => add(i.material, i.wk || wkOfPlant(i.plant) || 'PEP', i.plant, i.desc, i.uom, i.sohNormal != null ? i.sohNormal : i.soh));
    if (S.mrpRes) for (const r of S.mrpRes.values()) add(r.material, r.wk || 'PEP', r.plant, r.desc, r.uom, 0);
    const out = [...map.values()]; out.forEach((e) => (e.t = toks(e.desc))); return out;
  }
  function pairs() {
    if (S._pad && S._pad.ver === S.ver) return S._pad.list;
    const E = entries(), seen = new Set(), list = [];
    const put = (a, b, score, reason, kind) => { if (a.code === b.code && a.wk === b.wk) return; const k = [a.code + a.wk, b.code + b.wk].sort().join('~'); if (seen.has(k)) return; seen.add(k);
      if (a.wk > b.wk || (a.wk === b.wk && a.code > b.code)) [a, b] = [b, a]; list.push({ a, b, score, reason, kind, jenis: a.wk === b.wk ? 'Satu client' : 'Beda client' }); };
    // 1) KIMAP sama persis di client berbeda
    const byCode = new Map(); E.forEach((e) => (byCode.get(e.code) || byCode.set(e.code, []).get(e.code)).push(e));
    byCode.forEach((g) => { for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) put(g[i], g[j], 100, 'KIMAP sama persis', 'exact'); });
    // 2) kode mirip: bucket "hapus 1 karakter"
    const vr = new Map(); E.forEach((e) => { if (e.code.length < 6) return; const vs = new Set([e.code]); for (let i = 0; i < e.code.length; i++) vs.add(e.code.slice(0, i) + e.code.slice(i + 1));
      vs.forEach((v) => (vr.get(v) || vr.set(v, []).get(v)).push(e)); });
    vr.forEach((g) => { if (g.length > 40) return; for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) { const a = g[i], b = g[j]; if (a.code === b.code) continue; const d = lev(a.code, b.code); if (d > THRESH.maxDist) continue;
      const J = jac(a.t, b.t); if (J < THRESH.nearDesc) continue; const sc = Math.round(100 * (0.5 * (1 - d / Math.max(a.code.length, b.code.length)) + 0.5 * J)); if (sc >= THRESH.min) put(a, b, sc, `Kode beda ${d} karakter, deskripsi ${Math.round(J * 100)}% mirip`, 'code'); } });
    // 3) deskripsi sangat mirip: indeks kata (3 kata paling jarang per entri)
    const freq = new Map(); E.forEach((e) => e.t.forEach((w) => freq.set(w, (freq.get(w) || 0) + 1)));
    const inv = new Map(); E.forEach((e) => { if (e.t.length < 3) return; e.t.slice().sort((x, y) => freq.get(x) - freq.get(y)).slice(0, 3).forEach((w) => { if (freq.get(w) <= THRESH.bucket) (inv.get(w) || inv.set(w, []).get(w)).push(e); }); });
    inv.forEach((g) => { for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) { const a = g[i], b = g[j]; if (a.code === b.code) continue; const J = jac(a.t, b.t); if (J >= THRESH.descOnly) put(a, b, Math.round(100 * J), `Deskripsi ${Math.round(J * 100)}% mirip`, 'desc'); } });
    list.sort((x, y) => y.score - x.score || x.a.desc.localeCompare(y.a.desc));
    S._pad = { ver: S.ver, list }; return list;
  }

  PAGES.padanan = function (host) {
    MP.zonaHook = () => PAGES.data();
    if (!S.mb52 && !S.mrpRes) { host.innerHTML = needFile('MB52 atau MRP', 'Padanan KIMAP dihitung dari daftar material di MB52 dan MRP.'); return; }
    const F = (S.fpd = S.fpd || { q: '', tipe: new Set() });
    host.innerHTML = '<div id="pdF"></div><div id="pdK" style="margin-top:14px"></div><div id="pdT" style="margin-top:14px"></div>';
    const draw = () => {
      const base = pairs().filter((p) => (S.wkSel === 'all' || (p.a.wk === S.wkSel && p.b.wk === S.wkSel)) && T.match([p.a.code, p.a.desc, p.b.code, p.b.desc].join(' '), F.q));
      const n = (f) => base.filter(f).length, isT = (v, p) => (v === 'cross' ? p.jenis === 'Beda client' : v === 'same' ? p.jenis === 'Satu client' : v === 'exact' ? p.kind === 'exact' : p.kind !== 'exact');
      $('pdK').innerHTML = T.kpis([['Beda client', fmt(n((p) => p.jenis === 'Beda client'), 0), 'PEP dan PHE', '', 'cross'], ['Satu client', fmt(n((p) => p.jenis === 'Satu client'), 0), 'dalam client yang sama', '', 'same'],
        ['KIMAP sama persis', fmt(n((p) => p.kind === 'exact'), 0), 'kode identik di dua client', 'k-ok', 'exact'], ['Mirip', fmt(n((p) => p.kind !== 'exact'), 0), 'kode / deskripsi mendekati sama', 'k-min', 'near']]);
      T.bindKpis($('pdK'), F, 'tipe', draw);
      const rows = base.filter((p) => !F.tipe.size || [...F.tipe].some((v) => isT(v, p)));
      const who = (e) => T.two(e.desc || e.code, e.code + ' · WK ' + e.wk);
      T.table($('pdT'), { rows, name: 'Padanan_KIMAP', empty: 'Tidak ada padanan pada filter ini.', onRow: (p) => MP.detail(p.a.code), cols: [
        { label: 'Material A', w: 3, get: (p) => p.a.desc, html: (p) => who(p.a) }, { label: 'Stok A', type: 'num', w: 0.7, get: (p) => p.a.stock },
        { label: 'Material B', w: 3, get: (p) => p.b.desc, html: (p) => who(p.b) }, { label: 'Stok B', type: 'num', w: 0.7, get: (p) => p.b.stock },
        { label: 'Skor', type: 'status', w: 0.7, get: (p) => p.score, html: (p) => T.pill(p.score + '%', p.score >= 95 ? 'ok' : p.score >= 88 ? 'info' : 'warn') }, { label: 'Alasan', w: 2.2, get: (p) => p.reason }] });
    };
    T.filters($('pdF'), { q: 'Cari KIMAP atau deskripsi. Contoh: gasket, K180100047', selects: [{ key: 'tipe', label: 'Jenis', options: [['cross', 'Beda client'], ['same', 'Satu client'], ['exact', 'KIMAP sama persis'], ['near', 'Mirip']] }] }, F, draw);
    draw();
  };
})();
