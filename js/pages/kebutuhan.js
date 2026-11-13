// ============ Halaman Kebutuhan & MRP ============
// Bagian dari web MIM. Dimuat sesudah js/app.js (fungsi bersama ada di sana) dan sebelum js/views.js.

PAGES.rkm = function () {
  if (!S.mrpRes) { $('view').innerHTML = needFile('file MRP', 'Mesin MRP butuh file MRP (sheet MRP dan LeadTime) untuk WK PEP, atau MB52 + MB51 client 180 untuk WK PHE. RKM opsional sebagai input.'); return; }
  mrpSwitch();
  const res = mrpRows();
  if (S.mrpWK === 'PHE') return rkmPHE(res);
  const M = S.rkmMatched, rkmPlants = new Set(S.rkmFiles.map((f) => f.plant).filter(Boolean));
  const rkmKeys = new Set(M.filter((x) => x.key).map((x) => x.key));
  const vs = M.filter((x) => x.key).map((x) => ({ x, r: S.mrpRes.get(x.key) }));
  const noMrp = M.filter((x) => !x.key).map((x) => {
    const m = x.master; const sug = m && m.lt != null ? MRP.calc({ usage36: [], amuSum: 0, lt: m.lt, hasContract: m.hasContract, rkmYear: x.total, agingOverride: 'DS' }, { basis: 'rkm-new' }) : null;
    return { x, sug };
  });
  const noRkm = res.filter((r) => rkmPlants.has(r.plant) && !rkmKeys.has(r.key) && (r.aging === 'FS' || r.aging === 'MD'));
  const sehat = res.filter((r) => r.berlebih || (r.method === 'tko' ? r.aging === 'DS' && r.stock > 0 : false) || (r.surplus > 0 && r.stock > 0)).sort((a, b) => (b.surplus || 0) - (a.surplus || 0));
  const amu12 = (r) => r.amuHist * 12;
  const V = mrpView();
  // RKM per Material|Plant: total + rincian bulan (untuk tooltip)
  const rkmBy = new Map(); M.filter((x) => x.key).forEach((x) => { const o = rkmBy.get(x.key) || rkmBy.set(x.key, { total: 0, months: new Array(12).fill(0), fungsi: new Set() }).get(x.key); o.total += x.total; x.months.forEach((v, k) => (o.months[k] += v || 0)); if (x.fungsi) o.fungsi.add(x.fungsi); });
  const MN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  const rkmTip = (o) => (o ? `RKM 2027: ${o.months.map((v, k) => (v ? MN[k] + ' ' + fmt(v) : '')).filter(Boolean).join(', ') || 'bulan tidak diisi'}${o.fungsi.size ? ' · ' + [...o.fungsi].join(', ') : ''}` : '');
  const selisih = (d) => (d == null ? '' : `<span class="${d > 0 ? 'warn' : ''}">${d > 0 ? '+' : ''}${fmt(d)}</span>`);
  const matA = (r) => `<a class="mono mlink" href="#" data-mat="${esc(r.material)}">${esc(r.material)}</a>`;
  const oaCol = ['Kontrak (OA)', (r) => (r.oa ? `<a href="#" class="mono oalink" data-oa="${esc(r.oa)}">${esc(r.oa)}</a>` : pill('PR + OE', 'mute')), '', (r) => r.oa || 'PR + OE'];
  const rkmCols = V.rkm ? [['RKM 2027', (r) => { const o = rkmBy.get(r.key); return o ? `<span class="tip-u" title="${esc(rkmTip(o))}">${fmt(o.total)}</span>` : ''; }, 'num', (r) => (rkmBy.get(r.key) || {}).total || ''],
    ['Selisih', (r) => { const o = rkmBy.get(r.key); return o ? selisih(o.total - amu12(r)) : ''; }, 'num', (r) => { const o = rkmBy.get(r.key); return o ? o.total - amu12(r) : ''; }]] : [];
  const one = [['Min', (r) => fmt(r.min2), 'num', (r) => r.min2], ['Max', (r) => fmt(r.max2), 'num', (r) => r.max2], ['To Order', (r) => calcA(r, r.toOrder ? pill(fmt(r.toOrder), 'warn') : '0'), 'num', (r) => r.toOrder]];
  const E = (r) => r.alt.excel, K = (r) => r.alt.tko;
  const beda = (r) => E(r).aging !== K(r).aging || (E(r).min2 || 0) !== (K(r).min2 || 0) || (E(r).max2 || 0) !== (K(r).max2 || 0) || E(r).toOrder !== K(r).toOrder;
  const two = [['Aging Excel → TKO', (r) => (E(r).aging === K(r).aging ? esc(K(r).aging) : `${esc(E(r).aging)} → <b>${esc(K(r).aging)}</b>`), '', (r) => E(r).aging + '→' + K(r).aging],
    ['Min Excel', (r) => fmt(E(r).min2), 'num', (r) => E(r).min2], ['Min TKO', (r) => `<b>${fmt(K(r).min2)}</b>`, 'num', (r) => K(r).min2],
    ['Max Excel', (r) => fmt(E(r).max2), 'num', (r) => E(r).max2], ['Max TKO', (r) => `<b>${fmt(K(r).max2)}</b>`, 'num', (r) => K(r).max2],
    ['Order Excel', (r) => fmt(E(r).toOrder), 'num', (r) => E(r).toOrder], ['Order TKO', (r) => `<b>${fmt(K(r).toOrder)}</b>`, 'num', (r) => K(r).toOrder],
    ['Beda?', (r) => (beda(r) ? pill('Beda', 'warn') : ''), '', (r) => (beda(r) ? 'Beda' : 'Sama')], ['Catatan TKO', (r) => esc(K(r).note || ''), '', (r) => K(r).note || '']];
  const mrpCols = [['Plant', (r) => esc(r.plant)], ['Material', matA, '', (r) => r.material], ['Deskripsi', (r) => esc(r.desc)], ['Aging', (r) => agingPill(r.aging), '', (r) => r.aging],
    ['Pakai/thn', (r) => fmt(amu12(r)), 'num', amu12], ...rkmCols,
    ['Stok ZNORMAL', (r) => fmt(r.stock), 'num', (r) => r.stock], STOK_LAIN_COL, ['OS PO/RO', (r) => fmt(r.ospo), 'num', (r) => r.ospo],
    ...(V.cmp ? two : one), ...(V.cmp ? [] : [oaCol])];

  // RKM: satu tabel, status Cocok / RKM tanpa MRP / MRP tanpa RKM
  const rkmRows = vs.map((o) => ({ st: 'Cocok', x: o.x, r: o.r })).concat(noMrp.map((o) => ({ st: 'RKM tanpa MRP', x: o.x, sug: o.sug })), noRkm.map((r) => ({ st: 'MRP tanpa RKM', r })));
  const stPill = { Cocok: 'ok', 'RKM tanpa MRP': 'warn', 'MRP tanpa RKM': 'mute' };
  const rk = [['Status', (o) => pill(o.st, stPill[o.st]), '', (o) => o.st], ['Fungsi', (o) => esc(o.x ? o.x.fungsi : '')], ['Plant', (o) => esc(o.r ? o.r.plant : o.x.plant || '')],
    ['KIMAP', (o) => (o.r ? `<a class="mono mlink" href="#" data-mat="${esc(o.r.material)}">${esc((o.x && o.x.kimap) || o.r.material)}</a>` : o.x.kimap ? `<span class="mono">${esc(o.x.kimap)}</span>` : pill('tanpa KIMAP', 'low')), '', (o) => (o.x && o.x.kimap) || (o.r && o.r.material) || ''],
    ['Deskripsi', (o) => esc(o.x ? o.x.desc : o.r.desc)],
    ['RKM 2027', (o) => (o.x ? fmt(o.x.total) : ''), 'num', (o) => (o.x ? o.x.total : '')], ['Pakai/thn', (o) => (o.r ? fmt(amu12(o.r)) : ''), 'num', (o) => (o.r ? amu12(o.r) : '')],
    ['Selisih', (o) => (o.x && o.r ? selisih(o.x.total - amu12(o.r)) : ''), 'num', (o) => (o.x && o.r ? o.x.total - amu12(o.r) : '')],
    ['Aging', (o) => (o.r ? agingPill(o.r.aging) : ''), '', (o) => (o.r ? o.r.aging : '')], ['Stok ZNORMAL', (o) => (o.r ? fmt(o.r.stock) : ''), 'num', (o) => (o.r ? o.r.stock : '')],
    ['Min', (o) => (o.r ? fmt(o.r.min2) : o.sug ? `<span class="muted" title="Usulan dari RKM (belum ada di MRP)">${fmt(o.sug.min2)}</span>` : ''), 'num', (o) => (o.r ? o.r.min2 : o.sug ? o.sug.min2 : '')],
    ['Max', (o) => (o.r ? fmt(o.r.max2) : o.sug ? `<span class="muted" title="Usulan dari RKM (belum ada di MRP)">${fmt(o.sug.max2)}</span>` : ''), 'num', (o) => (o.r ? o.r.max2 : o.sug ? o.sug.max2 : '')],
    ['To Order', (o) => (o.r ? calcA(o.r, o.r.toOrder ? pill(fmt(o.r.toOrder), 'warn') : '0') : ''), 'num', (o) => (o.r ? o.r.toOrder : '')],
    ['Di master LeadTime?', (o) => (o.st === 'RKM tanpa MRP' ? (o.x.master ? 'Ada' : 'Tidak') : ''), '', (o) => (o.st === 'RKM tanpa MRP' ? (o.x.master ? 'Ada' : 'Tidak') : '')],
    ['Cocok via', (o) => esc(o.x ? o.x.how || '' : '')], ['Remarks', (o) => esc(o.x ? o.x.remarks || '' : '')]];

  const TABS = {
    mrp: ['MRP', res, mrpCols, (r) => r.material + ' ' + r.desc + ' ' + (r.oa || ''), '', null, V.cmp ? 1750 : V.rkm ? 1350 : 0],
    // (lebar minimum: tabel geser ke samping kalau kolom banyak)
    rkm: ['RKM', rkmRows, rk, (o) => [o.x && o.x.kimap, o.x && o.x.desc, o.x && o.x.fungsi, o.r && o.r.material, o.r && o.r.desc].filter(Boolean).join(' '), '', null, 1300],
    sehat: ['Penyehatan stok', sehat, [['Plant', (r) => esc(r.plant)], ['Material', matA, '', (r) => r.material], ['Deskripsi', (r) => esc(r.desc)], ['Aging', (r) => agingPill(r.aging), '', (r) => r.aging],
      ['Stok', (r) => fmt(r.stock), 'num', (r) => r.stock], ['Max', (r) => fmt(r.max2), 'num', (r) => r.max2], ['Surplus', (r) => fmt(r.surplus), 'num', (r) => r.surplus],
      ['Cakupan (bln)', (r) => (r.cover == null ? '-' : isFinite(r.cover) ? fmt(r.cover, 1) : '∞'), 'num', (r) => (isFinite(r.cover) ? r.cover : '')],
      ['Kategori', (r) => (r.aging === 'DS' && r.stock > 0 ? pill('Kandidat dead stock', 'low') : r.berlebih ? pill('Berlebih', 'warn') : pill('Di atas Max', 'mute')), '', (r) => (r.aging === 'DS' && r.stock > 0 ? 'Kandidat dead stock' : r.berlebih ? 'Berlebih' : 'Di atas Max')]], (r) => r.material + ' ' + r.desc],
  };
  if (S.rkmTab === 'vs' || S.rkmTab === 'noMrp' || S.rkmTab === 'noRkm') S.rkmTab = 'rkm';
  const top = !S.rkmFiles.length && V.rkm ? `<div class="banner warn">Belum ada file RKM. Taruh file RKM di folder data atau upload di Data SAP.</div>` : '';
  tabbed('rkmTab', TABS, top);
};

// RKM x MRP untuk WK PHE: belum ada RKM dan file MRP, jadi hanya hasil mesin MRP dari MB52 + MB51
function rkmPHE(res) {
  const pakai = res.filter((r) => r.amu > 0).sort((a, b) => b.amu - a.amu);
  const sehat = res.filter((r) => r.berlebih && r.stock > 0).sort((a, b) => (b.surplus || 0) - (a.surplus || 0));
  const mat = (r) => `<a class="mono mlink" href="#" data-mat="${esc(r.material)}">${esc(r.material)}</a>`;
  const base = [['Plant', (r) => esc(plantLabel(r.plant)), '', (r) => plantLabel(r.plant)], ['Material', mat, '', (r) => r.material], ['Deskripsi', (r) => esc(r.desc)], ['Aging', (r) => agingPill(r.aging), '', (r) => r.aging],
    ['AMU', (r) => fmt(r.amu, 2), 'num', (r) => r.amu], ['LT', (r) => fmt(r.lt, 1) + (r.ltDefault ? ' *' : ''), 'num', (r) => r.lt], ['Stok ZNORMAL', (r) => fmt(r.stock), 'num', (r) => r.stock], STOK_LAIN_COL, ['OS PO/RO', (r) => fmt(r.ospo), 'num', (r) => r.ospo],
    ['MB25', (r) => fmt(r.mb25), 'num', (r) => r.mb25], ['Min', (r) => fmt(r.min2), 'num', (r) => r.min2], ['Max', (r) => fmt(r.max2), 'num', (r) => r.max2]];
  const TABS = {
    pakai: ['Material dipakai', pakai, base.concat([['Kelas', (r) => esc(r.cls || r.aging), '', (r) => r.cls || r.aging], ['To Order', (r) => calcA(r, fmt(r.toOrder)), 'num', (r) => r.toOrder]]), (r) => r.material + ' ' + r.desc,
      'Material dengan pemakaian (Mvt Own Use + Return, tanpa network/proyek) di MB51 WK PHE.'],
    sehat: ['Penyehatan stok', sehat, base.concat([['Surplus', (r) => fmt(r.surplus), 'num', (r) => r.surplus], ['Cakupan (bln)', (r) => (isFinite(r.cover) ? fmt(r.cover, 1) : '∞'), 'num', (r) => (isFinite(r.cover) ? r.cover : '')]]), (r) => r.material + ' ' + r.desc],
  };
  tabbed('rkmPheTab', TABS, mrpNote());
}
