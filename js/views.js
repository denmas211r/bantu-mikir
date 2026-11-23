// ============ Tampilan Matriks (Cari Material), Kartu (Kontrak), dan panel Analisis Material ============
(function () {
  const STATUS_RANK = { 'Perlu order': -1, Kosong: 0, 'Di bawah Min': 1, Surplus: 2, Aman: 3, 'Tanpa Min/Max': 4, 'Tanpa MRP': 5, 'Tidak dipantau': 6 };
  const AGING_RANK = { FS: 0, MD: 1, SP: 2, DS: 3, PJ: 4 };
  const homePlants = () => [...S.mrpPlants].sort();

  // ---------- Indeks per material (gabungan MB52 + MRP + kontrak) ----------
  function matIndex() {
    if (S._mi && S._mi.ver === S.ver) return S._mi;
    const map = new Map();
    const g = (m) => map.get(m) || map.set(m, { material: m, desc: '', uom: '', items: [], stock: new Map(), valueIDR: 0, price: null, priceCur: '', wk: new Set(), mrp: new Map(), use: null, contract: null }).get(m);
    if (S.mb52) S.mb52.items.forEach((i) => {
      const o = g(i.material); o.desc = o.desc || i.desc; o.uom = o.uom || i.uom; o.items.push(i); o.wk.add(i.wk);
      o.stock.set(i.plant, (o.stock.get(i.plant) || 0) + (i.sohNormal != null ? i.sohNormal : i.soh)); // ZNORMAL o.valueIDR += toIDRv(i.value, stockCur(i.plant));
      if (i.soh > 0 && o.price == null) { o.price = i.price; o.priceCur = stockCur(i.plant); }
    });
    if (S.mrpRes) for (const r of S.mrpRes.values()) { const o = g(r.material); o.desc = o.desc || r.desc; o.uom = o.uom || r.uom; o.mrp.set(r.plant, r); if (r.contract && !o.contract) o.contract = r.contract; }
    // pemakaian bulanan per WK (PEP dari file MRP, PHE dari MB51)
    const labels = { PEP: S.mrpWB ? S.mrpWB.monthLabels : [], PHE: S.mrpWB_PHE ? S.mrpWB_PHE.monthLabels : [] };
    [[S.mrpWB, 'PEP'], [S.mrpWB_PHE, 'PHE']].forEach(([wb, wk]) => wb && wb.rows.forEach((r) => { const o = map.get(r.material); if (!o) return; o.useWK = o.useWK || {};
      const u = o.useWK[wk] || (o.useWK[wk] = new Array(labels[wk].length).fill(0)); r.usageAll.forEach((v, k) => (u[k] += Math.abs(v || 0))); }));
    if (S.me3n) map.forEach((o, m) => { if (!o.contract && S.me3n.pick.has(m)) o.contract = S.me3n.pick.get(m); });
    map.forEach((o) => {
      let best = 9, ag = 9;
      homePlants().forEach((p) => {
        const r = o.mrp.get(p), q = o.stock.get(p) || 0;
        if (r) { const st = Parser.status({ plant: p, soh: q }, { min: r.min2 || 0, max: r.max2 || 0 }, S.mrpPlants).s; best = Math.min(best, STATUS_RANK[st] ?? 9); ag = Math.min(ag, AGING_RANK[r.aging] ?? 9); }
        else if (q > 0) best = Math.min(best, STATUS_RANK['Tanpa MRP']);
      });
      o.status = statusFor(o, homePlants());
      o.aging = Object.keys(AGING_RANK).find((k) => AGING_RANK[k] === ag) || '';
      o.toOrder = [...o.mrp.values()].filter((r) => S.mrpPlants.has(r.plant)).reduce((a, r) => a + (r.toOrder || 0), 0);
      o.use12 = o.useWK ? Object.values(o.useWK).reduce((a, u) => a + u.slice(-12).reduce((x, y) => x + y, 0), 0) : null;
      o.kel = Master.kelompok(o.desc); o.mg = Master.mgOf(o.material);
      o.total = [...o.stock.values()].reduce((a, b) => a + b, 0);
    });
    S._mi = { ver: S.ver, map, labels };
    return S._mi;
  }
  // Warna status konsep MRP (legenda di Overview Material): merah = di bawah SS/kosong/perlu order, kuning = di bawah Min (ROP), hijau = normal, biru = di atas Max
  const statusCls = (s) => (s === 'Perlu order' || s === 'Kosong' ? 'low' : s === 'Di bawah Min' ? 'min' : s === 'Surplus' ? 'max' : s === 'Aman' ? 'ok' : 'mute');
  const MRP_POS = { low: 'Di bawah SS', min: 'Di bawah Min', ok: 'Normal', max: 'Di atas Max' };
  const mrpPos = (q, r) => { if (q == null || !r) return ''; const mn = r.min2 || 0, mx = r.max2 || 0, ss = r.ss || 0;
    return (mn > 0 && q <= 0) || (ss > 0 && q < ss) ? 'low' : mn > 0 && q < mn ? 'min' : mx > 0 && q > mx ? 'max' : 'ok'; };
  window.MRP_POS = MRP_POS; window.mrpPos = mrpPos;
  window.mrpLegend = () => `<p class="legend-line mx-legend" aria-label="Legenda warna stok">${['low', 'min', 'ok', 'max'].map((k) => `<span><i class="mx-sw mx-${k}"></i>${MRP_POS[k]}</span>`).join('')}<span><i class="mx-sw mx-none"></i>Tanpa MRP</span></p>`;
  const qtyPill = (q, r) => (q == null ? '<span class="qty na">–</span>' : `<span class="qty ${q <= 0 ? 'zero' : r && r.min2 && q < r.min2 ? 'low' : 'pos'}">${fmt(q)}</span>`);

  // ---------- Cari Material ----------
  // Satu baris per material. Kolom plant dikelompokkan per WK (client 100 = PEP, 180 = PHE).
  const plantWK = (p) => wkOfPlant(p) || 'PEP';
  // status satu material untuk plant yang tampil: Perlu order (ada To Order) → Kosong/Di bawah Min (sudah tertutup PO) → Surplus → Aman
  function statusFor(o, H) {
    if (H.some((p) => (o.mrp.get(p) || {}).toOrder > 0)) return 'Perlu order';
    let best = 9;
    H.forEach((p) => {
      const r = o.mrp.get(p), q = o.stock.get(p) || 0;
      if (r) best = Math.min(best, STATUS_RANK[Parser.status({ plant: p, soh: q }, { min: r.min2 || 0, max: r.max2 || 0 }, S.mrpPlants).s] ?? 9);
      else if (q > 0) best = Math.min(best, STATUS_RANK['Tanpa MRP']);
    });
    return Object.keys(STATUS_RANK).find((k) => STATUS_RANK[k] === best) || 'Tidak dipantau';
  }
  // sel stok per plant: warna menurut posisi terhadap SS/Min/Max (ada tooltip dan legenda, bukan warna saja)
  const qtyCell = (q, r) => { if (q == null) return ''; const k = mrpPos(q, r); return `<span class="mx-c ${k ? 'mx-' + k : 'mx-none'}"${k ? ` title="${esc(MRP_POS[k])}"` : ''}>${fmt(q)}</span>`; };
  // Satu pop-up material untuk seluruh web = MP.detail (js/pages/mplan.js). opt.calc = plant yang langsung dibuka hitungan MRP-nya.
  const openMaterial = (m, opt = {}) => MP.detail(m, opt.calc || null, opt);

  // ---------- Penjelasan hitungan MRP per material+plant (langkah demi langkah, dengan angka) ----------
  const otherStock = (r) => (r.transit || r.stockOther ? `<p class="small"><b>Stok lain (tidak dihitung di atas):</b> in transit ${fmt(r.transit || 0)}${r.stockOther ? `, valuation type lain ${fmt(r.stockOther)} (${esc(r.otherVal)})` : ''}. Pertimbangkan sebelum memesan: barang transit akan masuk, ex-terminasi/surplus mungkin bisa dipakai.</p>` : '');
  function explainMRP(r) {
    const f1 = (v) => fmt(v, 2);
    const step = (title, rumus, hasil, note) => `<li><b>${title}</b><div class="calc-f">${rumus}</div><div class="calc-r">= <b>${hasil}</b>${note ? ` <span class="muted small">${note}</span>` : ''}</div></li>`;
    const L = [];
    const stock = r.stock || 0, ospo = r.ospo || 0, res = r.mb25 || 0;
    const head = `<h4>Cara hitung ${esc(plantLabel(r.plant))} <small>metode ${r.method === 'excel' ? 'Excel lama' : 'TKO/Pedoman'}</small></h4>`;
    const stokNote = 'Stok = unrestricted valuation type ZNORMAL dari MB52 (ex-terminasi, surplus, damage, dan in transit tidak dihitung).';
    if (r.method === 'excel') {
      const yes = r.hasContract === 'Yes', u = (r.alt && r.alt.excel) || r;
      L.push(step('AMU (rata-rata pemakaian per bulan)', 'Total pemakaian 36 bulan ÷ 36', f1(r.amu)));
      L.push(step('Aging', `Frekuensi = bulan ada pemakaian ÷ 3 = ${f1(u.freq3)} → FS ≥ 1, MD ≥ 0,5, SP ≥ 0,2, selain itu DS`, esc(r.aging)));
      if (r.lt == null) return head + '<p class="muted">Lead time tidak ada di master, jadi Min/Max tidak dihitung.</p>';
      if (r.agingUsed === 'SP' || r.agingUsed === 'DS') {
        L.push(step('To Order (on demand)', `maks(0, Reservasi − Stok − OS PO) = maks(0, ${fmt(res)} − ${fmt(stock)} − ${fmt(ospo)})`, fmt(r.toOrder), 'SP/DS tidak diberi Min/Max'));
      } else {
        L.push(step('Safety stock', r.agingUsed === 'FS' ? `ROUNDUP(AMU × 3) = ROUNDUP(${f1(r.amu)} × 3)` : 'MD tidak diberi SS', fmt(r.ss)));
        L.push(step('Min', `AMU × LT + SS${yes ? '' : ' + AMU × 5 (tanpa kontrak)'} = ${f1(r.amu)} × ${fmt(r.lt, 1)} + ${fmt(r.ss)}${yes ? '' : ' + ' + f1(r.amu) + ' × 5'}`, `${f1(r.min)} → dibulatkan ${fmt(r.min2)}`));
        L.push(step('Max', `(${r.lt < 5 ? 'LT < 5 → AMU × 6' : 'LT ≥ 5 → AMU × 12'}) + SS${yes ? '' : ', lalu + AMU × 5 (tanpa kontrak)'}`, `${f1(r.max)} → ${fmt(r.max2)}`));
        const net = stock - res;
        L.push(step('Stok bersih', `Stok − Reservasi = ${fmt(stock)} − ${fmt(res)}`, fmt(net), stokNote));
        L.push(step('To Order', net <= r.min2 ? `Stok bersih ${fmt(net)} ≤ Min ${fmt(r.min2)} → Max − OS PO − stok bersih = ${fmt(r.max2)} − ${fmt(ospo)} − ${fmt(net)}` : `Stok bersih ${fmt(net)} > Min ${fmt(r.min2)} → belum perlu pesan`, fmt(r.toOrder)));
      }
      return head + `<ol class="calc-steps">${L.join('')}</ol>${otherStock(r)}`;
    }
    const P = Object.assign({}, MRP.TKO_DEFAULT, S.set.tko || {});
    const u = (r.usageAll || []).map((v) => Math.abs(v || 0)), n = r.wk === 'PHE' ? u.length : Math.min(P.amuMonths, u.length), win = u.slice(-n), sum = win.reduce((a, b) => a + b, 0);
    const div = r.amuHist > 0 ? sum / r.amuHist : n;
    L.push(step('AMU (rata-rata pemakaian per bulan)', `Total pemakaian ${n} bulan terakhir ÷ ${fmt(div, 1)} = ${fmt(sum)} ÷ ${fmt(div, 1)}`, f1(r.amuHist),
      r.wk === 'PHE' ? 'WK PHE: histori dari MB51, dibagi lama periode data' : ''));
    L.push(step('Aging', r.since === Infinity ? 'Tidak ada pemakaian di histori' : `Pemakaian terakhir ${fmt(r.since, 0)} bulan lalu → FS < 12, MD < 24, SP < 60, selain itu DS`, esc(r.aging), r.agingUsed !== r.aging ? `dihitung sebagai ${r.agingUsed}${r.aging === 'MD' ? ' (MD dianggap FS, konfirmasi user)' : ''}` : ''));
    L.push(step('Kelas', 'Project → Program · FS → rutin (chemical / maintenance) · MD → rutin slow · SP/DS → on demand', esc(r.cls)));
    if (r.cls === 'Program' || r.cls === 'On Demand') {
      L.push(step('To Order', `maks(0, Reservasi − Stok − OS PO) = maks(0, ${fmt(res)} − ${fmt(stock)} − ${fmt(ospo)})`, fmt(r.toOrder), stokNote));
      return head + `<ol class="calc-steps">${L.join('')}</ol>${otherStock(r)}`;
    }
    if (r.tEff == null) return head + `<ol class="calc-steps">${L.join('')}</ol><p class="muted">Lead time tidak ada, jadi Min/Max tidak dihitung.</p>`;
    const yes = r.hasContract === 'Yes', T = r.tEff, z = r.critical ? P.zCrit : P.z;
    L.push(step('Lead time efektif (T)', `LT ${fmt(r.lt, 1)} bln${yes ? ' (ada kontrak, tanpa tambahan)' : ` + ${fmt(P.nonContractLT, 1)} bln pengadaan (tanpa kontrak)`}`, fmt(T, 1) + ' bln'));
    if (r.cls === 'Rutin chemical') {
      L.push(step('Safety stock', `${P.chemSSMonths} bulan × AMU = ${P.chemSSMonths} × ${f1(r.amu)}`, fmt(r.ss)));
      L.push(step('Min (ROP)', `AMU × T + SS = ${f1(r.amu)} × ${fmt(T, 1)} + ${fmt(r.ss)}`, `${f1(r.min)} → ${fmt(r.min2)}`));
      L.push(step('Max', `AMU × (P + T) + SS = ${f1(r.amu)} × (${P.chemP} + ${fmt(T, 1)}) + ${fmt(r.ss)}`, `${f1(r.max)} → ${fmt(r.max2)}`));
    } else {
      const raw = z * (r.sdmi || 0) * Math.sqrt(T), cap = P.ssCapMonths * r.amu;
      L.push(step('Safety stock', `min(z × SdMI × √T, ${P.ssCapMonths} × AMU) = min(${fmt(z, 3)} × ${f1(r.sdmi)} × √${fmt(T, 1)}, ${fmt(P.ssCapMonths, 0)} × ${f1(r.amu)}) = min(${f1(raw)}, ${f1(cap)})`, fmt(r.ss), `SdMI = simpangan baku pemakaian bulanan; z = ${r.critical ? '99% (critical)' : '95%'}`));
      if (r.cls === 'Rutin slow (ROP manual)') L.push(step('Min = Max', 'Rutin slow: ROP = SS, pesan sampai SS', fmt(r.min2)));
      else {
        L.push(step('Min (ROP)', `AMU × T + SS = ${f1(r.amu)} × ${fmt(T, 1)} + ${fmt(r.ss)}`, `${f1(r.min)} → ${fmt(r.min2)}`));
        const F = P.maxFormula === 'BC' ? (yes ? 'B' : 'C') : P.maxFormula;
        const rumus = F === 'A' ? `2 × AMU × T + SS = 2 × ${f1(r.amu)} × ${fmt(T, 1)} + ${fmt(r.ss)}` : F === 'B' ? `AMU × T + 2 × SS = ${f1(r.amu)} × ${fmt(T, 1)} + 2 × ${fmt(r.ss)}` : `Min + ${P.roqMonths} × AMU = ${f1(r.min)} + ${P.roqMonths} × ${f1(r.amu)}`;
        L.push(step(`Max (rumus ${F}${P.maxFormula === 'BC' ? yes ? ', item kontrak' : ', item tanpa kontrak' : ''})`, rumus, `${f1(r.max)} → ${fmt(r.max2)}`, r.max2 > MRP.roundup(r.max) ? 'dinaikkan supaya Max ≥ Min' : ''));
      }
    }
    const avail = stock + ospo - res;
    L.push(step('Stok tersedia', `Stok + OS PO − Reservasi = ${fmt(stock)} + ${fmt(ospo)} − ${fmt(res)}`, fmt(avail), stokNote));
    L.push(step('To Order', avail < r.min2 ? `Tersedia ${fmt(avail)} < Min ${fmt(r.min2)} → Max − tersedia = ${fmt(r.max2)} − ${fmt(avail)}` : `Tersedia ${fmt(avail)} ≥ Min ${fmt(r.min2)} → belum perlu pesan`, fmt(r.toOrder)));
    if (r.cover != null && isFinite(r.cover)) L.push(step('Cakupan stok', `Stok ÷ AMU = ${fmt(stock)} ÷ ${f1(r.amu)}`, fmt(r.cover, 1) + ' bln', r.berlebih ? `berlebih (batas ${r.cls === 'Rutin chemical' ? P.excessChem : P.excessGeneral} bln)` : ''));
    return head + `<ol class="calc-steps">${L.join('')}</ol>${otherStock(r)}${r.note ? `<p class="muted small">${esc(r.note)}</p>` : ''}`;
  }

  function openContract(doc, tab) {
    const d = S.me3n && S.me3n.docs.get(doc);
    const lines = S.me2n ? S.me2n.lines.filter((l) => l.oa === doc && !l.deleted) : [];
    if (!d && !lines.length) { UI.drawer(`<div class="d-head"><h2>OA ${esc(doc)}</h2></div><div class="d-sec">Kontrak ini tidak ada di ME3N maupun ME2N yang dimuat.</div>`, { label: 'Kontrak' }); return; }
    const items = S.me3n ? S.me3n.items.filter((i) => i.doc === doc) : [];
    const cur = d ? d.currency : (lines[0] && lines[0].currency) || '';
    const plan = S.mrpRes ? [...S.mrpRes.values()].filter((r) => r.contract && r.contract.doc === doc && r.toOrder > 0 && S.mrpPlants.has(r.plant)) : [];
    const used = d && d.target ? Math.min(100, Math.max(0, (1 - d.sisa / d.target) * 100)) : 0;
    const trail = roTrail(lines);
    // pemakaian kontrak per plant (nilai RO)
    const perPlant = new Map(); lines.forEach((l) => { const g = perPlant.get(l.plant) || perPlant.set(l.plant, { plant: l.plant, n: 0, value: 0, open: 0 }).get(l.plant); g.n++; g.value += l.value; g.open += l.openValue || 0; });
    const roVal = lines.reduce((a, l) => a + l.value, 0);
    const T = { tab: tab || (items.length ? 'item' : 'ro') };
    const body = UI.drawer('', { label: 'Kontrak ' + doc, wide: true });
    // ---------- Simulasi Call RO: qty RO per material × field, dengan stok dan estimasi sesudah RO ----------
    const SIMK = 'simRO', simAll = store.get(SIMK) || {}, SIM = (simAll[doc] = simAll[doc] || { q: {}, zona: '', need: true });
    const saveSim = () => { simAll[doc] = SIM; store.set(SIMK, simAll); };
    const mb52Of = new Map(S.mb52 ? S.mb52.items.map((i) => [i.material + '|' + i.plant, i]) : []);
    const simRows = () => {
      const out = [];
      items.forEach((it) => {
        const m = it.material, plants = new Set();
        if (S.mrpRes) S.mrpRes.forEach((r) => { if (r.material === m && S.mrpPlants.has(r.plant)) plants.add(r.plant); });
        lines.forEach((l) => { if (l.material === m) plants.add(l.plant); });
        plants.forEach((p) => {
          const r = S.mrpRes ? S.mrpRes.get(m + '|' + p) : null, i = mb52Of.get(m + '|' + p), k = it.item + '|' + p;
          const stock = r ? r.stock : i ? (i.sohNormal != null ? i.sohNormal : i.soh) : 0;
          const row = { k, it, m, desc: it.desc, uom: it.uom || (r && r.uom) || '', plant: p, zona: zonaOf(p), r, stock, transit: i ? i.transit || 0 : 0, other: i ? i.sohOther || 0 : 0,
            ospo: r ? r.ospo || 0 : 0, res: r ? r.mb25 || 0 : 0, amu: r ? r.amu || 0 : 0, min: r ? r.min2 : null, max: r ? r.max2 : null, mrp: r ? r.toOrder || 0 : 0, price: it.price || 0 };
          row.qty = SIM.q[k] != null ? SIM.q[k] : row.mrp;
          row.value = row.qty * row.price; row.after = row.stock + row.ospo - row.res + row.qty; row.cover = row.amu > 0 ? row.after / row.amu : null;
          out.push(row);
        });
      });
      return out.sort((a, b) => b.mrp - a.mrp || a.m.localeCompare(b.m) || a.plant.localeCompare(b.plant));
    };
    function simHTML() {
      const all = simRows(), zonas = [...new Set(all.map((x) => x.zona))].sort();
      const rows = all.filter((x) => (!SIM.zona || x.zona === SIM.zona) && (!SIM.need || x.mrp > 0 || x.qty > 0));
      const chosen = all.filter((x) => x.qty > 0), tq = chosen.reduce((a, x) => a + x.value, 0);
      // cek batas kontrak: nilai (sisa kontrak) dan qty per item (kalau kontrak qty)
      const perItem = new Map(); chosen.forEach((x) => perItem.set(x.it, (perItem.get(x.it) || 0) + x.qty));
      const warn = [];
      if (d && tq > d.sisa) warn.push(`Total simulasi ${money(tq, cur)} melebihi sisa nilai kontrak ${money(d.sisa, cur)}.`);
      perItem.forEach((q, it) => { if (it.targetQty && q > it.openQty) warn.push(`${esc(it.material)}: qty simulasi ${fmt(q)} melebihi sisa qty kontrak ${fmt(it.openQty)}.`); });
      if (d && d.sisaHari != null && d.sisaHari < 60) warn.push(`Kontrak berakhir ${fmt(d.sisaHari, 0)} hari lagi. Pastikan jadwal kirim masih di dalam masa kontrak.`);
      const flag = (x) => (!x.r ? '<span class="muted small">tidak ada di MRP</span>' : x.qty > 0 && x.max != null && x.after > x.max ? pill('Di atas Max', 'warn') : x.min != null && x.after < x.min ? pill('Masih di bawah Min', 'low') : x.qty > 0 ? pill('Aman', 'ok') : '');
      const sel = `<label class="chk">Zona <select id="simZ" aria-label="Zona">${[['', 'Semua zona'], ...zonas.map((z) => [z, z])].map(([v, t]) => `<option value="${esc(v)}"${SIM.zona === v ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select></label>`;
      return `        <div class="filters">${sel}<label class="chk"><input type="checkbox" id="simNeed"${SIM.need ? ' checked' : ''}> Hanya yang perlu order / sudah diisi</label>
          <button class="btn" id="simMRP" type="button">Isi sesuai MRP</button><button class="btn" id="simClr" type="button">Kosongkan</button><button class="btn" id="simXls" type="button">Unduh Excel</button></div>
        <div class="kv"><div><span>Baris diisi</span><b>${fmt(chosen.length, 0)}</b></div><div><span>Field</span><b>${fmt(new Set(chosen.map((x) => x.plant)).size, 0)}</b></div><div><span>Estimasi nilai RO</span><b>${money(tq, cur)}</b></div>
          ${d ? `<div><span>Sisa kontrak</span><b>${money(d.sisa, cur)}</b></div><div><span>Sisa sesudah simulasi</span><b class="${d.sisa - tq < 0 ? 'neg' : ''}">${money(d.sisa - tq, cur)}</b></div>` : ''}</div>
        ${warn.length ? `<ul class="reco">${warn.map((w) => `<li class="bad"><span>${w}</span></li>`).join('')}</ul>` : ''}
        ${rows.length ? plainTable(rows, [['Material', (x) => `<a href="#" class="mlink" data-mat="${esc(x.m)}">${esc(x.m)}</a><div class="muted small sim-desc">${esc(x.desc)}</div>`], ['Field', (x) => `${esc(x.plant)}<div class="muted small">${esc(x.zona)}</div>`],
          ['Stok', (x) => fmt(x.stock) + (x.transit || x.other ? `<div class="muted small">${x.transit ? 'transit ' + fmt(x.transit) : ''}${x.transit && x.other ? ' · ' : ''}${x.other ? 'val. lain ' + fmt(x.other) : ''}</div>` : ''), 'num'],
          ['OS PO / Res.', (x) => fmt(x.ospo) + ' / ' + fmt(x.res), 'num'], ['AMU', (x) => fmt(x.amu, 1), 'num'], ['Min / Max', (x) => (x.r ? fmt(x.min) + ' / ' + fmt(x.max) : '-'), 'num'],
          ['MRP', (x) => (x.r ? `<a href="#" class="simcalc" data-m="${esc(x.m)}" data-p="${esc(x.plant)}" title="Lihat cara hitung">${fmt(x.mrp)}</a>` : '-'), 'num'],
          ['Qty RO', (x) => `<input class="simq" type="number" min="0" step="any" data-k="${esc(x.k)}" value="${x.qty || ''}" aria-label="Qty RO ${esc(x.m)} ${esc(x.plant)}">`, 'num'],
          ['Estimasi', (x) => (x.qty ? money(x.value, cur) : ''), 'num'], ['Sesudah RO', (x) => fmt(x.after) + `<div class="muted small">${x.cover == null ? '' : fmt(x.cover, 1) + ' bln'}</div>`, 'num'], ['Status', flag]])
          : '<p class="muted">Tidak ada material kontrak yang perlu order di zona ini. Matikan filter "Hanya yang perlu order" untuk melihat semua field.</p>'}`;
    }
    function bindSim() {
      const q = (s) => body.querySelector(s); if (!q('#simZ')) return;
      const keep = () => { const y = body.scrollTop; saveSim(); render(); body.scrollTop = y; };
      q('#simZ').onchange = (e) => { SIM.zona = e.target.value; keep(); };
      q('#simNeed').onchange = (e) => { SIM.need = e.target.checked; keep(); };
      q('#simMRP').onclick = () => { SIM.q = {}; keep(); };
      q('#simClr').onclick = () => { SIM.q = {}; simRows().forEach((x) => (SIM.q[x.k] = 0)); keep(); };
      body.querySelectorAll('.simq').forEach((inp) => (inp.onchange = () => { const v = parseFloat(inp.value); SIM.q[inp.dataset.k] = isFinite(v) && v > 0 ? v : 0; keep(); }));
      body.querySelectorAll('.simcalc').forEach((a) => (a.onclick = (e) => { e.preventDefault(); openMaterial(a.dataset.m, { calc: a.dataset.p }); }));
      q('#simXls').onclick = () => {
        const rows = simRows().filter((x) => x.qty > 0);
        const ws = XLSX.utils.json_to_sheet(rows.map((x) => ({ OA: doc, Vendor: d ? d.vendor : '', Item: x.it.item, Material: x.m, Deskripsi: x.desc, UoM: x.uom, Plant: x.plant, Zona: x.zona,
          'Stok ZNORMAL': x.stock, 'In transit': x.transit, 'Val. type lain': x.other, 'OS PO': x.ospo, Reservasi: x.res, AMU: x.amu, Min: x.min, Max: x.max, 'To Order MRP': x.mrp,
          'Qty RO': x.qty, 'Harga satuan': x.price, 'Estimasi nilai': x.value, Mata_uang: cur, 'Sesudah RO': x.after, 'Cakupan (bln)': x.cover == null ? '' : +x.cover.toFixed(1) })));
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Simulasi RO'); XLSX.writeFile(wb, `Simulasi Call RO ${doc}.xlsx`);
      };
    }
    const status = (l) => (l.openQty <= 0 ? pill('Selesai', 'ok') : l.lateDays ? pill('Telat ' + l.lateDays + ' hr', 'low') : pill('Belum tiba', 'info'));
    const render = () => {
      const tabs = [['item', `Item kontrak (${items.length})`], ['ro', `History RO (${lines.length})`], ['pakai', 'Dipakai ke mana'], ...(items.length ? [['sim', `Simulasi Call RO${plan.length ? ' (' + plan.length + ' perlu order)' : ''}`]] : [])];
      let sec = '';
      if (T.tab === 'item') sec = items.length ? `${plainTable(items.slice().sort((a, b) => b.released - a.released), [['Item', (i) => esc(i.item)], ['Material', (i) => `<a href="#" class="mlink" data-mat="${esc(i.material)}">${esc(i.material)}</a>`], ['Deskripsi', (i) => esc(i.desc)],
        ['Harga', (i) => money(i.price, cur), 'num'], ['Target qty', (i) => (i.targetQty ? fmt(i.targetQty) + ' ' + esc(i.uom) : '<span class="muted small">kontrak nilai</span>'), 'num'], ['Terpakai qty', (i) => fmt(i.releasedQty) + ' ' + esc(i.uom), 'num'],
        ['Sisa qty', (i) => (i.targetQty ? fmt(i.openQty) : '-'), 'num'], ['Terpakai', (i) => (i.targetQty ? fmt((i.releasedQty / i.targetQty) * 100, 0) + '%' : '-'), 'num'], ['Nilai terpakai', (i) => money(i.released, cur), 'num']])}
        ${items.some((i) => !i.targetQty) ? '<p class="muted small">Kontrak nilai: SAP tidak mencatat target qty per item, jadi yang dibatasi adalah nilai total kontrak (lihat Sisa di atas). Terpakai qty = nilai RO ÷ harga satuan.</p>' : ''}` : '<p class="muted">Item kontrak tidak ada di ME3N yang dimuat.</p>';
      if (T.tab === 'ro') sec = lines.length ? '<div id="kTab"></div>' : '<p class="muted">Belum ada RO dari kontrak ini di ME2N.</p>';
      if (T.tab === 'pakai') {
        const rows = []; trail.forEach((t) => t.uses.forEach((u) => rows.push({ t, u })));
        sec = `<h4 class="sub-h">Per plant penerima</h4>${plainTable([...perPlant.values()].sort((a, b) => b.value - a.value), [['Plant', (g) => esc(plantLabel(g.plant))], ['Zona', (g) => esc(zonaOf(g.plant))], ['Jumlah RO', (g) => fmt(g.n, 0), 'num'], ['Nilai RO', (g) => money(g.value, cur), 'num'], ['Belum dikirim', (g) => money(g.open, cur), 'num'], ['Porsi', (g) => (roVal ? fmt((g.value / roVal) * 100, 0) + '%' : '-'), 'num']])}
          <h4 class="sub-h">Pemakaian sesudah barang diterima <small>${fmt(rows.length, 0)} gerakan MB51</small></h4>
          <p class="muted small">Perkiraan: setelah barang RO dirilis ke stok, pemakaian material yang sama di plant itu diambil berurutan sampai qty terima habis. SAP tidak menyimpan link langsung RO ke pemakaian.</p>
          ${rows.length ? '<div id="kTab"></div>' : `<p class="muted">${S.mb51 ? 'Belum ada pemakaian yang bisa dihubungkan ke RO kontrak ini.' : 'Muat file MB51 untuk melihat penerimaan dan pemakaian.'}</p>`}`;
        T.useRows = rows;
      }
      if (T.tab === 'sim') sec = simHTML();
      body.innerHTML = `<div class="d-head"><h2>${esc(d ? d.vendor : (lines[0] && lines[0].vendor) || 'OA ' + doc)}</h2><div class="meta"><span>OA ${esc(doc)}</span>${d ? `<span>WK ${esc(d.wk || '')}</span><span>${esc((d.kels || [d.kel]).filter(Boolean).join(', '))}</span><span>PG ${esc(d.pg)} ${esc(d.pic)}</span><span>${dstr(d.start)} s.d. ${dstr(d.end)}</span>` : '<span>tidak ada di ME3N</span>'}</div></div>
        ${d ? `<div class="kv"><div><span>Nilai kontrak</span><b>${money(d.target, cur)}</b></div><div><span>Terpakai</span><b>${money(d.released, cur)}</b></div><div><span>Sisa</span><b>${money(d.sisa, cur)}</b></div><div><span>Terpakai %</span><b>${fmt(used, 1)}%</b></div><div><span>Sisa hari</span><b>${fmt(d.sisaHari, 0)}</b></div><div><span>RO di ME2N</span><b>${fmt(lines.length, 0)}</b></div></div>
        <div class="progress" title="Terpakai ${fmt(used, 0)}%"><i style="width:${used.toFixed(1)}%"></i></div>` : ''}
        <div class="seg" role="radiogroup" aria-label="Bagian kontrak">${tabs.map(([k, t]) => `<button type="button" role="radio" aria-checked="${T.tab === k}" data-t="${k}">${esc(t)}</button>`).join('')}</div>
        <section class="d-sec">${sec}</section>`;
      const el = body.querySelector('#kTab'), mat = (x) => `<a href="#" class="mlink" data-mat="${esc(x)}">${esc(x)}</a>`;
      if (el && T.tab === 'ro') UI.table(el, { id: 'k-ro', rows: trail, name: 'History RO ' + doc, rowKey: (x) => x.l.doc + '/' + x.l.item, placeholder: 'Cari RO, PR, plant, atau material…', cols: [
        { label: 'RO', nowrap: true, get: (x) => x.l.doc + '/' + x.l.item, html: (x) => `<span class="mono">${esc(x.l.doc)}</span><span class="muted small">/${esc(x.l.item)}</span>` }, { label: 'PR', get: (x) => x.l.pr }, { label: 'Tgl RO', nowrap: true, get: (x) => x.l.docDate || null, html: (x) => dstr(x.l.docDate) },
        { label: 'Plant', get: (x) => x.l.plant }, { label: 'Material', nowrap: true, get: (x) => x.l.material, html: (x) => mat(x.l.material) }, { label: 'Deskripsi', wide: true, hide: true, get: (x) => x.l.desc },
        { label: 'Qty', num: true, filter: false, get: (x) => x.l.qty, html: (x) => fmt(x.l.qty) + ' ' + esc(x.l.uom) }, { label: 'Diterima', num: true, filter: false, get: (x) => x.grQty, html: (x) => (x.grQty ? `${fmt(x.grQty)} <span class="muted small">${dstr(x.grDate)}</span>` : '') }, { label: 'Sudah dipakai', num: true, filter: false, get: (x) => x.usedQty, html: (x) => (x.usedQty ? fmt(x.usedQty) : '') },
        { label: 'Sisa kirim', num: true, filter: false, get: (x) => x.l.openQty, html: (x) => fmt(x.l.openQty) }, { label: 'Nilai', num: true, filter: false, hide: true, get: (x) => x.l.value, html: (x) => money(x.l.value, x.l.currency) },
        { label: 'Status', get: (x) => (x.l.openQty <= 0 ? 'Selesai' : x.l.lateDays ? 'Terlambat' : 'Belum tiba'), html: (x) => status(x.l) }] });
      if (el && T.tab === 'pakai') UI.table(el, { id: 'k-pakai', rows: T.useRows, name: 'Pemakaian RO ' + doc, rowKey: (r) => r.u.x.matDoc + r.t.l.doc, placeholder: 'Cari RO, plant, reservasi, atau keterangan…', cols: [
        { label: 'RO', get: (r) => r.t.l.doc }, { label: 'Plant', get: (r) => r.t.l.plant }, { label: 'Material', nowrap: true, get: (r) => r.t.l.material, html: (r) => mat(r.t.l.material) },
        { label: 'Tanggal pakai', nowrap: true, get: (r) => r.u.x.date, html: (r) => dstr(r.u.x.date) }, { label: 'Jenis', get: (r) => r.u.x.cat }, { label: 'Qty', num: true, filter: false, get: (r) => r.u.q, html: (r) => fmt(r.u.q) + ' ' + esc(r.u.x.uom || '') },
        { label: 'Reservasi', get: (r) => r.u.x.resv }, { label: 'Untuk', wide: true, get: (r) => r.u.x.header || (r.u.x.toPlant ? 'ke ' + plantLabel(r.u.x.toPlant) : '') }, { label: 'Mat. Doc', hide: true, get: (r) => r.u.x.matDoc }] });
      if (T.tab === 'sim') bindSim();
      body.querySelectorAll('.seg button').forEach((b) => (b.onclick = () => { T.tab = b.dataset.t; render(); }));
      body.querySelectorAll('.mlink').forEach((a) => (a.onclick = (e) => { e.preventDefault(); openMaterial(a.dataset.mat); }));
    };
    render();
  }

  // tautan material di mana pun → buka analisis material
  document.addEventListener('click', (e) => {
    const a = e.target.closest('.mlink, .oalink, .calclink'); if (!a || a.closest('.drawer')) return; e.preventDefault();
    if (a.classList.contains('oalink')) { if (!a.dataset.tab && window.KX && S.me3n && S.me3n.docs.has(a.dataset.oa)) KX.contract(a.dataset.oa); else openContract(a.dataset.oa, a.dataset.tab); }
    else if (a.classList.contains('calclink')) openMaterial(a.dataset.mat, { calc: a.dataset.p });
    else MP.detail(a.dataset.mat, a.dataset.p);
  });
  window.openMaterial = openMaterial; window.matIndex = matIndex; window.openContract = openContract; window.explainMRP = explainMRP;
})();

// ============ Pergerakan Material (MB51): klasifikasi Mvt, alur dari → ke, rekap bulanan ============
(function () {
  const BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const ym = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  const ymLabel = (k) => BLN[+k.slice(5) - 1] + ' ' + k.slice(0, 4);
  // urutan & penjelasan kategori dari tabel Mvt user
  const CAT = [
    ['PO/RO', 'Terima dari vendor lewat PO/RO'], ['Batal PO/RO', 'Pembatalan terima PO/RO'], ['Retur ke vendor', 'Barang dikembalikan ke vendor'],
    ['BAU Rec', 'Terima BAU (STO) dari plant lain'], ['Batal BAU Rec', 'Pembatalan terima BAU'], ['MTA Rec', 'Terima lewat MTA dari KKKS lain'], ['Batal MTA Rec', 'Pembatalan terima MTA'],
    ['Trf Rec', 'Terima transfer antar plant (301)'], ['Batal Trf Rec', 'Pembatalan terima transfer'], ['Maxter Rec', 'Stok khusus/Maxter jadi stok sendiri'], ['Batal Maxter Rec', 'Pembatalan Maxter'],
    ['Return', 'Material kembali ke gudang dari pemakai'], ['Batal Return', 'Pembatalan retur'], ['Return DS', 'Pindah dari plant DS ke plant aktif'],
    ['Own Use', 'Pemakaian sendiri (cost center, order, WBS, network)'], ['Batal Own Use', 'Pembatalan pemakaian (pengurang Own Use)'],
    ['BAU Iss', 'Kirim BAU (STO) ke plant lain'], ['Batal BAU Iss', 'Pembatalan kirim BAU'], ['MTA Iss', 'Keluar ke KKKS lain lewat MTA'], ['Batal MTA Iss', 'Pembatalan MTA'],
    ['Trf Iss', 'Kirim transfer antar plant (301)'], ['Batal Trf Iss', 'Pembatalan kirim transfer'], ['Konversi Kode', 'Ganti kode material (309), barang tidak keluar gudang'], ['Batal Konversi Kode', 'Pembatalan ganti kode'],
    ['FUPP Iss', 'Keluar untuk scrap/FUPP'], ['Batal FUPP', 'Pembatalan FUPP'], ['GI Adj', 'Penyesuaian stok'], ['Selisih Opname', 'Selisih stock opname'],
    ['Not Included', 'Tidak dihitung: blocked stock, dalam perjalanan, sisi lawan, atau pindah SLoc'], ['', 'Belum terklasifikasi (kunci Mvt belum ada di tabel)'],
  ];
  // (urutan kategori tidak dipakai lagi sejak halaman jadi pembaca MB51)
  const catName = (c) => c || 'Belum terklasifikasi';
  const PARTY = { 'MTA Iss': 'MTA (KKKS lain)', 'Batal MTA Iss': 'MTA (KKKS lain)', 'MTA Rec': 'MTA (KKKS lain)', 'Batal MTA Rec': 'MTA (KKKS lain)', 'Maxter Rec': 'Maxter (stok khusus)', 'Batal Maxter Rec': 'Maxter (stok khusus)',
    'FUPP Iss': 'FUPP/scrap', 'Batal FUPP': 'FUPP/scrap', 'Own Use': 'Pemakai (Own Use)', 'Batal Own Use': 'Pemakai (Own Use)', 'Return': 'Pemakai (retur)', 'Batal Return': 'Pemakai (retur)',
    'Return DS': 'Plant DS', 'GI Adj': 'Penyesuaian stok', 'Selisih Opname': 'Stock opname', 'Konversi Kode': 'Kode material lain', 'Batal Konversi Kode': 'Kode material lain', 'Retur ke vendor': 'Vendor' };
  const cache = new WeakMap();
  function prep() {
    if (!S.mb51) return null;
    const hitC = cache.get(S.mb51); if (hitC && hitC.v === (S.me2n ? S.me2n.lines.length : 0)) return hitC.d;
    const vendor = new Map(); (S.me2n ? S.me2n.lines : []).forEach((l) => vendor.set(l.doc, l.vendor));
    const pl = (p) => (p ? plantLabel(p) : '');
    const moves = S.mb51.moves.map((m) => {
      const cur = m.cur || stockCur(m.plant), here = pl(m.plant); let from, to;
      if (m.fromPlant || m.toPlant) { from = m.fromPlant ? pl(m.fromPlant) : '?'; to = m.toPlant ? pl(m.toPlant) : 'Dalam perjalanan'; }
      else if (PARTY[m.cat]) { const x = PARTY[m.cat]; [from, to] = m.qty < 0 ? [here, x] : [x, here]; }
      else if (m.po) { const v = vendor.get(m.po) || `Vendor PO ${m.po}`; [from, to] = m.qty < 0 ? [here, v] : [v, here]; }
      else [from, to] = m.qty < 0 ? [here, m.mtText || 'Keluar'] : [m.mtText || 'Masuk', here];
      return { m, from, to, cat: m.cat || '', idr: Math.abs(toIDRv(m.amount, cur)), cur, month: m.date ? ym(m.date) : '' };
    });
    const months = [...new Set(moves.map((x) => x.month).filter(Boolean))].sort();
    const d = { moves, months };
    cache.set(S.mb51, { v: S.me2n ? S.me2n.lines.length : 0, d }); return d;
  }

  // Keluar-Masuk Barang: filter standar (cari, plant, rentang tanggal, tahun, kategori) + kartu ringkas + tabel 7 kolom.
  PAGES.gerak = function () {
    if (!S.mb51) { $('view').innerHTML = needFile('file MB51', 'Pergerakan material dibaca dari MB51. Taruh semua file MB51 (misalnya per bulan) di folder data: web menggabungkannya dan membuang baris yang dobel.'); return; }
    const D = prep(), F = (S.fg = S.fg || { q: '', plant: new Set(), from: '', to: '', cat: new Set() });
    const all = D.moves.filter((x) => x.m.date).sort((a, b) => b.m.date - a.m.date);
    const cats = [...new Set(all.map((x) => catName(x.cat)))].sort();
    MP.zonaHook = () => PAGES.gerak();
    $('view').innerHTML = '<div id="fb"></div><div id="kp"></div><div id="tb"></div>';
    const draw = () => {
      const rows = all.filter((x) => G.zonaOk(x.m.plant) && T.has(F, 'plant', x.m.plant) && T.matOk(F, x.m.material, x.m.desc) && T.inRange(x.m.date, F) && T.has(F, 'cat', catName(x.cat))
        && T.match([x.m.material, x.m.desc, x.m.matDoc, x.m.po, x.m.resv, x.m.header].join(' '), F.q));
      const inn = rows.filter((x) => x.m.qty > 0), out = rows.filter((x) => x.m.qty < 0), use = rows.filter((x) => x.cat === 'Own Use'), v = (l) => money(l.reduce((a, x) => a + x.idr, 0), 'IDR');
      $('kp').innerHTML = T.kpis([['Gerakan', fmt(rows.length, 0), F.from || F.to ? (F.from || '…') + ' s.d. ' + (F.to || '…') : 'semua tanggal'], ['Barang masuk', v(inn), fmt(inn.length, 0) + ' gerakan'], ['Barang keluar', v(out), fmt(out.length, 0) + ' gerakan'], ['Pemakaian (Own Use)', v(use), fmt(use.length, 0) + ' gerakan']]);
      T.table($('tb'), { rows, name: 'Keluar_Masuk_Barang', empty: 'Tidak ada gerakan pada filter ini.', onRow: (x) => MP.detail(x.m.material, x.m.plant), cols: [
        { label: 'Tanggal', type: 'date', w: 0.9, get: (x) => x.m.date }, { label: 'Plant', w: 0.6, get: (x) => x.m.plant }, { label: 'Material', w: 3, get: (x) => x.m.desc, html: (x) => T.two(x.m.desc || x.m.material, x.m.material) },
        { label: 'Kategori', w: 1.2, get: (x) => catName(x.cat) }, { label: 'Qty', type: 'num', w: 0.8, get: (x) => x.m.qty, cls: (x) => (x.m.qty < 0 ? 'neg' : '') }, { label: 'Nilai', type: 'num', w: 1.1, get: (x) => x.m.amount, html: (x) => money(x.m.amount, x.cur) },
        { label: 'Dokumen', w: 1, get: (x) => x.m.matDoc }] });
    };
    T.filters($('fb'), { q: 'Cari material, dokumen, atau keterangan. Contoh: laker, 4900012345', materials: all.map((x) => [x.m.material, x.m.desc]), plants: [...new Set(all.map((x) => x.m.plant))].filter((p) => G.zonaOk(p)).sort(), dates: true,
      selects: [{ key: 'cat', label: 'Kategori', options: cats.map((c) => [c, c]), def: cats.filter((c) => c !== 'Not Included') }] }, F, draw);
    draw();
  };

})();
