// ============ Halaman RKM 2027 ============
// Rekap RKM semua lapangan dan fungsi (tanpa dobel), daftar per PIC, dan analisis pemenuhan per bulan.
// Dimuat sesudah js/app.js (fungsi bersama ada di sana).
const RKM_YEAR = 2027;
const r27Label = (idx) => (idx == null ? '-' : MON[((idx % 12) + 12) % 12] + ' ' + String(Math.floor(idx / 12)).slice(2));

// Gabungkan rekap RKM dengan stok/PO/kontrak/lead time → pemenuhan per bulan
function rkmData() {
  const C = S.rkmCons; if (!C) return null;
  const byId = new Map((S.rkmMatched || []).map((x) => [x.id, x]));
  const mb52 = S.mb52 ? new Map(S.mb52.items.map((i) => [i.material + '|' + i.plant, i])) : null;
  const ospoMap = S.me2n && S.me2n.ospo;
  const now = new Date(), nowIdx = now.getFullYear() * 12 + now.getMonth();
  const rows = C.rekap.map((g) => {
    const mm = g.rows.map((x) => byId.get(x.id)).filter(Boolean);
    const hit = mm.find((x) => x.key); const r = hit && S.mrpRes ? S.mrpRes.get(hit.key) : null;
    const master = (mm.find((x) => x.master) || {}).master || null;
    // kebutuhan per bulan; baris tanpa rincian bulan dianggap butuh di Januari
    const need = new Array(12).fill(0); let guessed = false;
    g.rows.forEach((x) => { if (x.monthsKnown) x.months.forEach((v, i) => (need[i] += v)); else { need[0] += x.total; guessed = true; } });
    let stock = 0, ospo = 0, src = '';
    if (r) { stock = r.stock || 0; ospo = r.ospo || 0; src = 'MRP'; }
    else if (g.kimap) {
      const i = mb52 && mb52.get(g.kimap + '|' + g.plant); if (i) { stock = i.sohNormal != null ? i.sohNormal : i.soh || 0; src = 'MB52'; }
      ospo = (ospoMap && ospoMap.get(g.kimap + '|' + g.plant)) || 0; if (ospo && !src) src = 'ME2N';
    }
    const f = RKM.fulfil(need, stock + ospo);
    const lt = r && r.lt != null ? r.lt : master && master.lt != null ? master.lt : null;
    const shortIdx = f.first >= 0 ? RKM_YEAR * 12 + f.first : null;
    const due = shortIdx != null && lt != null ? shortIdx - Math.ceil(lt) : null;
    const lewat = !f.shortTotal ? '' : r && r.oa ? 'RO' : 'PR';
    const st = !f.shortTotal ? ['Tercukupi', 'ok'] : due == null ? ['LT belum ada', 'mute'] : due < nowIdx ? ['Terlambat pesan', 'low'] : due <= nowIdx + 1 ? ['Pesan sekarang', 'warn'] : ['Terjadwal', 'info'];
    return Object.assign({}, g, { r, need, guessed, stock, ospo, src, f, lt, shortIdx, due, lewat, oa: r ? r.oa : '', st, material: r ? r.material : '', unit: [...g.units].join(' / ') });
  });
  return { C, rows, nowIdx };
}

// Mini timeline satu material: dari bulan ini s.d. Des 2027
function r27Gantt(o, from, to) {
  const cells = [];
  for (let m = from; m <= to; m++) {
    const k = m - RKM_YEAR * 12; let cls = '', tip = r27Label(m);
    const inOrder = o.due != null && o.shortIdx != null && m >= Math.max(o.due, from) && m < o.shortIdx;
    if (k >= 0 && k < 12 && o.need[k] > 0) { cls = o.f.short[k] > 0 ? 's' : 'c'; tip += o.f.short[k] > 0 ? `: butuh ${fmt(o.need[k])}, kurang ${fmt(o.f.short[k])}` : `: butuh ${fmt(o.need[k])}, tertutup`; }
    else if (inOrder) { cls = 'o ' + (o.lewat === 'RO' ? 'ro' : 'pr'); tip += ': masa tunggu pengadaan'; }
    if (o.due != null && m === Math.max(o.due, from) && o.f.shortTotal) { cls += ' due'; tip += o.due < from ? ` · seharusnya dipesan ${r27Label(o.due)}` : ' · pesan paling lambat'; }
    cells.push(`<i class="g-c ${cls}" title="${esc(tip)}"></i>`);
  }
  return `<span class="g-row${o.due != null && o.due < from && o.f.shortTotal ? ' late' : ''}">${cells.join('')}</span>`;
}

// Grafik batang: jumlah item yang harus mulai dipesan per bulan (RO vs PR)
function r27Chart(rows, nowIdx, sel) {
  const end = RKM_YEAR * 12 + 11, B = [{ k: 'late', l: 'Terlambat' }];
  for (let m = nowIdx; m <= end; m++) B.push({ k: String(m), l: r27Label(m) });
  B.forEach((b) => { b.ro = 0; b.pr = 0; });
  rows.forEach((o) => { if (!o.f.shortTotal || o.due == null) return; const b = B.find((x) => x.k === (o.due < nowIdx ? 'late' : String(o.due))); if (b) b[o.lewat === 'RO' ? 'ro' : 'pr']++; });
  const max = Math.max(1, ...B.map((b) => b.ro + b.pr));
  const noLT = rows.filter((o) => o.f.shortTotal && o.due == null).length;
  return `<section class="panel r27c"><div class="panel-h"><h2>Kapan harus mulai dipesan</h2><span class="sub">Jumlah material per bulan pesan paling lambat (bulan mulai kurang − lead time). Klik batang untuk menyaring tabel.</span></div>
    <div class="r27-leg"><span><i style="background:var(--ro)"></i>Lewat kontrak (RO)</span><span><i style="background:var(--pr)"></i>Tanpa kontrak (PR)</span>${noLT ? `<span class="muted">${fmt(noLT, 0)} material kurang tapi lead time belum ada</span>` : ''}</div>
    <div class="r27-bars" role="list">${B.map((b) => { const t = b.ro + b.pr;
      return `<button type="button" role="listitem" class="r27-b${sel === b.k ? ' on' : ''}${b.k === 'late' ? ' late' : ''}" data-k="${b.k}" ${t ? '' : 'disabled'} aria-label="${esc(b.l)}: ${t} material, RO ${b.ro}, PR ${b.pr}" data-tip="${esc(`${b.k === 'late' ? 'Sudah lewat batas pesan' : 'Pesan paling lambat ' + b.l}: ${t} material · RO ${b.ro} · PR ${b.pr}`)}">
        <span class="r27-v">${t || ''}</span>
        <span class="r27-stack" style="height:${((t / max) * 100).toFixed(1)}%">${b.pr ? `<span class="pr" style="flex:${b.pr}"></span>` : ''}${b.ro ? `<span class="ro" style="flex:${b.ro}"></span>` : ''}</span>
        <span class="r27-x">${esc(b.l)}</span></button>`; }).join('')}</div><div class="r27-tip" hidden></div></section>`;
}

PAGES.rkm27 = function () {
  if (!S.rkmFiles.length || !S.rkmCons) {
    $('view').innerHTML = `<div class="panel empty"><h3>Belum ada file RKM</h3><p>Taruh file RKM tiap lapangan di folder data, boleh di subfolder (mis. <b>RKM 2027/Rantau/</b>). Semua Excel di folder yang namanya memuat "RKM" ikut dibaca, lalu digabung tanpa dobel.</p><a class="btn primary" href="#/data">Buka Data SAP</a></div>`;
    return;
  }
  const D = rkmData(), C = D.C;
  // filter plant (disimpan)
  const plants = [...new Set(C.rekap.map((g) => g.plant || '?'))].sort();
  if (S.r27p == null) S.r27p = store.get('r27p') || 'all';
  if (S.r27p !== 'all' && !plants.includes(S.r27p)) S.r27p = 'all';
  const inP = (p) => S.r27p === 'all' || (p || '?') === S.r27p;
  $('pageActions').insertAdjacentHTML('afterbegin', '<span id="r27P"></span>');
  UI.seg($('r27P'), plants.map((p) => [p, p === '?' ? 'Plant belum diisi' : plantLabel(p)]).concat([['all', 'Semua plant']]), S.r27p, (v) => { S.r27p = v; store.set('r27p', v); S.r27m = null; route(); });

  const rows = D.rows.filter((o) => inP(o.plant));
  const kept = C.kept.filter((r) => inP(r.plant)), dups = C.dups.filter((r) => inP(r.plant));
  const from = D.nowIdx, to = RKM_YEAR * 12 + 11;
  const MN = MON;
  const needTip = (o) => `Kebutuhan ${RKM_YEAR}: ${o.need.map((v, k) => (v ? MN[k] + ' ' + fmt(v) : '')).filter(Boolean).join(', ')}${o.guessed ? ' (sebagian tanpa rincian bulan, dianggap Januari)' : ''}`;
  const picTip = (o) => o.pics.map((p) => `${p.pic || '(tanpa PIC)'} · ${p.fungsi}: ${fmt(p.total)}`).join('\n');
  const kimapA = (o) => (o.material ? `<a class="mono mlink" href="#" data-mat="${esc(o.material)}">${esc(o.kimap || o.material)}</a>` : o.kimap ? `<span class="mono">${esc(o.kimap)}</span>` : pill('tanpa KIMAP', 'low'));
  const plantC = ['Plant', (o) => esc(o.plant || '?'), '', (o) => o.plant || ''];

  const monthCols = MN.map((m, k) => [m, (o) => (o.months[k] ? fmt(o.months[k]) : ''), 'num', (o) => o.months[k] || '']);
  const rekapCols = [plantC, ['KIMAP', kimapA, '', (o) => o.kimap || ''], ['Deskripsi', (o) => esc(o.desc)], ['Satuan', (o) => (o.units.size > 1 ? pill(o.unit, 'warn') : esc(o.unit)), '', (o) => o.unit],
    ['Total 2027', (o) => `<b>${fmt(o.total)}</b>`, 'num', (o) => o.total], ...monthCols,
    ['PIC', (o) => `<span class="tip-u" title="${esc(picTip(o))}">${esc(o.pics.map((p) => (p.pic || p.fungsi).split(' ').slice(0, 2).join(' ')).join(', '))}</span>`, '', (o) => o.pics.map((p) => `${p.pic} (${p.fungsi}): ${p.total}`).join('; ')],
    ['Fungsi', (o) => esc([...new Set(o.pics.map((p) => p.fungsi))].join(', '))],
    ['Di MRP', (o) => (o.r ? pill('Ya', 'ok') : pill('Belum', 'mute')), '', (o) => (o.r ? 'Ya' : 'Belum')], ['File', (o) => fmt(o.files.size, 0), 'num', (o) => [...o.files].join('; ')]];
  const src = (r) => `<span class="muted small" title="${esc(r.file)}">${esc(r.file.split('/').pop())} · ${esc(r.sheet)} · baris ${r.row}</span>`;
  const picCols = [plantC, ['Fungsi', (r) => esc(r.fungsi)], ['PIC', (r) => esc(r.pic || '-')], ['KIMAP', (r) => (r.kimap ? `<span class="mono">${esc(r.kimap)}</span>` : pill('tanpa KIMAP', 'low')), '', (r) => r.kimap],
    ['Deskripsi', (r) => esc(r.desc)], ['Satuan', (r) => esc(r.unit)], ['Total 2027', (r) => fmt(r.total) + (r.monthsKnown ? '' : '*'), 'num', (r) => r.total],
    ...MN.map((m, k) => [m, (r) => (r.months[k] ? fmt(r.months[k]) : ''), 'num', (r) => r.months[k] || '']),
    ['Demand driver', (r) => esc(r.driver)], ['Prioritas', (r) => esc(r.prioritas)], ['Remarks', (r) => esc(r.remarks)],
    ['Cek', (r) => (r.cek ? pill(r.cek, 'warn') : ''), '', (r) => r.cek], ['Sumber', src, '', (r) => `${r.file} · ${r.sheet} · ${r.row}`]];
  const keepSet = new Set(store.get('rkmKeep') || []);
  const dupCols = [plantC, ['KIMAP', (r) => (r.kimap ? `<span class="mono">${esc(r.kimap)}</span>` : pill('tanpa KIMAP', 'low')), '', (r) => r.kimap], ['Deskripsi', (r) => esc(r.desc)],
    ['PIC', (r) => esc(r.pic || '-')], ['Fungsi', (r) => esc(r.fungsi)], ['Qty', (r) => fmt(r.total), 'num', (r) => r.total],
    ['Alasan', (r) => esc(r.dup.reason)], ['Tidak dihitung dari', src, '', (r) => r.file], ['Yang dipakai', (r) => `<span class="muted small" title="${esc(r.dup.keep)}">${esc(r.dup.keep.split('/').pop())}</span>`, '', (r) => r.dup.keep],
    ['Tetap hitung?', (r) => `<input type="checkbox" class="r27k" data-id="${esc(r.id)}" aria-label="Tetap hitung baris ini">`, '', () => '']];
  // baris yang dipaksa dihitung user ditampilkan juga supaya bisa dibatalkan
  const forced = C.kept.filter((r) => keepSet.has(r.id) && inP(r.plant)).map((r) => Object.assign({}, r, { dup: { reason: 'Dipaksa tetap dihitung', keep: r.file }, forced: true }));
  dupCols[dupCols.length - 1][1] = (r) => `<input type="checkbox" class="r27k" data-id="${esc(r.id)}" ${r.forced ? 'checked' : ''} aria-label="Tetap hitung baris ini">`;

  const fileRows = S.rkmFiles.map((f) => ({ f, n: C.kept.filter((r) => r.file === f.fileName).length, d: C.dups.filter((r) => r.file === f.fileName).length }))
    .concat((S.rkmSkip || []).map((name) => ({ skip: name })), (S.rkmFail || []).map((x) => ({ fail: x })));
  const fileCols = [['File', (o) => esc(o.f ? o.f.fileName : o.skip || o.fail.name)], ['Plant', (o) => esc(o.f ? o.f.plant || '?' : '')],
    ['Sheet & PIC', (o) => (o.f ? o.f.sheets.map((s) => `${esc(s.sheet)}: ${esc(s.pic || s.fungsi)} (${fmt(s.rows, 0)})${s.mode === 'Lain' ? ' ' + pill('format lain', 'mute') : ''}`).join('<br>') : '')],
    ['Dipakai', (o) => (o.f ? fmt(o.n, 0) : ''), 'num', (o) => (o.f ? o.n : '')], ['Dobel', (o) => (o.f ? fmt(o.d, 0) : ''), 'num', (o) => (o.f ? o.d : '')],
    ['Catatan', (o) => (o.skip ? pill('Dilewati: file hasil rekap', 'mute') : o.fail ? pill('Gagal dibaca', 'low') + ' ' + esc(o.fail.why) : o.f.skipped.length ? 'Sheet dilewati: ' + esc(o.f.skipped.join(', ')) : '')]];

  // Realisasi: apakah user benar memakai sesuai rencana? Pemakaian nyata dari MB51 (Own Use + GI proyek), per material+plant
  const U = usageByMonth(), y0 = RKM_YEAR * 12, upto = Math.min(D.nowIdx, y0 + 11);
  const real = rows.map((o) => {
    const g = U.get((o.material || o.kimap) + '|' + o.plant) || new Map();
    let h12 = 0; for (let m = D.nowIdx - 12; m < D.nowIdx; m++) h12 += g.get(m) || 0;
    const act = MN.map((_, k) => g.get(y0 + k) || 0), past = upto >= y0 ? upto - y0 + 1 : 0;
    const plan = o.need.slice(0, past).reduce((a, b) => a + b, 0), done = act.slice(0, past).reduce((a, b) => a + b, 0);
    const ratio = h12 > 0 ? o.total / h12 : null;
    const vs = !S.mb51 ? ['MB51 belum dimuat', 'mute'] : h12 <= 0 ? ['Tanpa pemakaian 12 bln', 'warn'] : ratio > 2 ? ['Jauh di atas histori', 'low'] : ratio < 0.5 ? ['Jauh di bawah histori', 'warn'] : ['Wajar', 'ok'];
    return Object.assign({}, o, { h12, ratio, vs, act, past, plan, done });
  });
  const realTip = (o) => MN.map((m, k) => `${m}: rencana ${fmt(o.need[k])}${k < o.past ? ', realisasi ' + fmt(o.act[k]) : ''}`).join('\n');
  const realCols = [plantC, ['KIMAP', kimapA, '', (o) => o.kimap || o.material || ''], ['Deskripsi', (o) => esc(o.desc)], ['Satuan', (o) => esc(o.unit)],
    ['RKM 2027', (o) => `<span class="tip-u" title="${esc(realTip(o))}">${fmt(o.total)}</span>`, 'num', (o) => o.total],
    ['Pakai 12 bln terakhir', (o) => (S.mb51 ? fmt(o.h12) : ''), 'num', (o) => o.h12],
    ['RKM ÷ histori', (o) => (o.ratio == null ? '' : fmt(o.ratio, 1) + '×'), 'num', (o) => (o.ratio == null ? '' : o.ratio)],
    ['Rencana vs histori', (o) => pill(o.vs[0], o.vs[1]), '', (o) => o.vs[0]],
    ['Rencana s.d. bln ini', (o) => (o.past ? fmt(o.plan) : '<span class="muted">belum mulai</span>'), 'num', (o) => o.plan],
    ['Realisasi s.d. bln ini', (o) => (o.past ? fmt(o.done) : ''), 'num', (o) => o.done],
    ['% realisasi', (o) => (o.past && o.plan ? fmt((o.done / o.plan) * 100, 0) + '%' : ''), 'num', (o) => (o.plan ? o.done / o.plan : '')],
    ['PIC', (o) => `<span class="tip-u" title="${esc(picTip(o))}">${esc(o.pics.map((p) => (p.pic || p.fungsi).split(' ').slice(0, 2).join(' ')).join(', '))}</span>`, '', (o) => o.pics.map((p) => p.pic || p.fungsi).join('; ')]];
  const TABS = {
    real: ['Realisasi vs rencana', real, realCols, (o) => [o.kimap, o.desc, o.plant, o.pics.map((p) => p.pic + ' ' + p.fungsi).join(' ')].join(' '),
      `Apakah user memakai sesuai rencananya? Pemakaian nyata dari MB51 (Own Use + GI ke proyek/network, gerakan keluar) per material dan plant. Sebelum ${RKM_YEAR} berjalan, bandingkan dengan pemakaian 12 bulan terakhir: lebih dari 2× = rencana jauh di atas histori, kurang dari 0,5× = jauh di bawah. Realisasi tidak bisa dibagi per PIC karena MB51 tidak mencatat PIC. Arahkan kursor ke angka RKM untuk rincian per bulan.`, null, 1300],
    rekap: ['Rekap per material', rows, rekapCols, (o) => [o.kimap, o.desc, o.plant, o.pics.map((p) => p.pic + ' ' + p.fungsi).join(' ')].join(' '), 'Satu baris per material dan plant. Kebutuhan dari PIC berbeda dijumlah; rinciannya di kolom PIC dan tab Per PIC.', null, 1200],
    pic: ['Per PIC', kept, picCols, (r) => [r.kimap, r.desc, r.pic, r.fungsi, r.plant].join(' '), 'Semua baris RKM yang dihitung, apa adanya dari file. Tanda * = tanpa rincian bulan.', null, 1400],
    dup: ['Dobel', dups.concat(forced), dupCols, (r) => [r.kimap, r.desc, r.pic, r.fungsi, r.file].join(' '), 'Tidak dihitung karena sudah ada di file lain (dipakai file terbaru). Centang kalau ternyata bukan dobel.', (el) => el.querySelectorAll('.r27k').forEach((cb) => (cb.onchange = () => {
      const k = new Set(store.get('rkmKeep') || []); cb.checked ? k.add(cb.dataset.id) : k.delete(cb.dataset.id); store.set('rkmKeep', [...k]); recompute(); route(); })), 1200],
    file: ['File', fileRows, fileCols, (o) => (o.f ? o.f.fileName : o.skip || o.fail.name), 'File yang namanya memuat "rekap", "integrated", atau "format SHU" dianggap hasil olahan dan tidak dihitung.'],
  };
  if (!TABS[S.r27Tab]) S.r27Tab = 'real';
  tabbed('r27Tab', TABS, '');
};
HIDE['r27Tab:rekap'] = MON.slice();
HIDE['r27Tab:pic'] = MON.concat(['Demand driver', 'Prioritas']);
