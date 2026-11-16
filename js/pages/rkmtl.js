// ============ RKM Timeline: stok per bulan (rolling window) per plant dan PIC ============
// Per material, tiap bulan: Kebutuhan (RKM) · Stok awal · OS PO (menurut tanggal kirim) · Reservasi (MB25, menurut tanggal butuh) · Saldo.
// Saldo bulan ini = Stok awal + OS PO − Kebutuhan − Reservasi; jadi stok awal bulan berikutnya (jendela bergulir, mulai dari bulan ini).
// PO/reservasi yang tanggalnya sudah lewat dihitung di bulan ini. Dimuat sesudah rkm27.js (memakai rkmData, RKM_YEAR, r27Label).
const TL_PAGE = 25;
const tlYM = (v) => { const d = v instanceof Date ? v : null; return d ? d.getFullYear() * 12 + d.getMonth() : null; };

// Susun timeline satu material. pic = '' (semua) atau nama PIC/fungsi.
function tlBuild(o, pic, nowIdx, endIdx, poIdx, rsIdx) {
  const n = endIdx - nowIdx + 1, z = () => new Array(n).fill(0), at = (ym) => Math.min(n - 1, Math.max(0, ym - nowIdx));
  const need = z();
  o.rows.filter((x) => !pic || (x.pic || x.fungsi) === pic).forEach((x) => {
    if (x.monthsKnown) x.months.forEach((v, k) => { const m = RKM_YEAR * 12 + k; if (v && m <= endIdx) need[at(m)] += v; });
    else need[at(RKM_YEAR * 12)] += x.total;
  });
  const key = (o.material || o.kimap) + '|' + o.plant, po = z(), rs = z();
  (poIdx.get(key) || []).forEach((l) => { po[at(l.delivery ? tlYM(l.delivery) : nowIdx)] += l.openQty; });
  (rsIdx.get(key) || []).forEach((l) => { rs[at(l.reqDate ? tlYM(l.reqDate) : nowIdx)] += l.diff; });
  const soh = z(), bal = z(); let cur = o.stock || 0;
  for (let i = 0; i < n; i++) { soh[i] = cur; bal[i] = cur + po[i] - need[i] - rs[i]; cur = bal[i]; }
  return { need, soh, po, rs, bal, firstShort: bal.findIndex((b, i) => b < 0 && need[i] + rs[i] > 0) };
}

PAGES.rkmtl = function () {
  if (!S.rkmFiles.length || !S.rkmCons) {
    $('view').innerHTML = `<div class="panel empty"><h3>Belum ada file RKM</h3><p>Taruh file RKM tiap lapangan di folder data, lalu buka lagi menu ini.</p><a class="btn primary" href="#/data">Buka Data SAP</a></div>`;
    return;
  }
  const D = rkmData(), T = (S.tl = Object.assign({ pic: '', from: '', to: '', q: '', onlyShort: false, page: 1 }, S.tl || {}));
  const plants = [...new Set(D.rows.map((g) => g.plant || '?'))].sort();
  if (S.r27p == null) S.r27p = store.get('r27p') || 'all';
  if (S.r27p === 'all' && plants.length) S.r27p = plants[0]; // satu plant dulu supaya tidak pusing; "Semua plant" tetap bisa diklik
  if (S.r27p !== 'all' && !plants.includes(S.r27p)) S.r27p = plants[0] || 'all';
  const inP = (p) => S.r27p === 'all' || (p || '?') === S.r27p;
  const base = D.rows.filter((o) => inP(o.plant));
  const pics = [...new Set(base.flatMap((o) => o.rows.map((x) => x.pic || x.fungsi)).filter(Boolean))].sort();
  if (T.pic && !pics.includes(T.pic)) T.pic = '';
  const nowIdx = D.nowIdx, endIdx = RKM_YEAR * 12 + 11;
  const ymStr = (i) => `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, '0')}`, ymNum = (s) => { const [y, m] = s.split('-').map(Number); return y * 12 + m - 1; };
  let fromIdx = T.from ? Math.max(nowIdx, ymNum(T.from)) : nowIdx, toIdx = T.to ? Math.min(endIdx, ymNum(T.to)) : endIdx; if (toIdx < fromIdx) toIdx = fromIdx;
  // indeks PO terbuka dan reservasi terbuka per Material|Plant
  const poIdx = new Map(), rsIdx = new Map(), push = (m, k, v) => (m.get(k) || m.set(k, []).get(k)).push(v);
  if (S.me2n) S.me2n.lines.forEach((l) => { if (!l.deleted && l.openQty > 0 && l.material) push(poIdx, l.material + '|' + l.plant, l); });
  if (S.mb25) S.mb25.lines.forEach((l) => { if (!l.finalIssue && l.diff > 0 && l.material) push(rsIdx, l.material + '|' + l.plant, l); });
  const q = T.q.trim() ? expand(T.q.trim()) : null;
  let list = base.filter((o) => (!pic0() || o.rows.some((x) => (x.pic || x.fungsi) === T.pic)) && (!q || hit([o.kimap, o.material, o.desc, o.pics.map((p) => p.pic).join(' ')].join(' '), q)))
    .map((o) => ({ o, t: tlBuild(o, T.pic, nowIdx, endIdx, poIdx, rsIdx) }));
  function pic0() { return T.pic; }
  if (T.onlyShort) list = list.filter((x) => x.t.firstShort >= 0);
  list.sort((a, b) => (b.t.firstShort >= 0) - (a.t.firstShort >= 0) || (a.t.firstShort < 0 ? 0 : a.t.firstShort - b.t.firstShort) || a.o.desc.localeCompare(b.o.desc));
  const cols = []; for (let m = fromIdx; m <= toIdx; m++) cols.push(m);
  const off = (m) => m - nowIdx;
  const shown = list.slice(0, T.page * TL_PAGE);
  const LAB = [['need', 'Kebutuhan (RKM)'], ['soh', 'Stok awal bulan'], ['po', 'OS PO (ETA)'], ['rs', 'Reservasi'], ['bal', 'Saldo']];
  const cell = (t, k, m) => { const v = t[k][off(m)]; return k === 'bal' ? `<td class="num tl-bal ${v < 0 ? 'neg' : 'pos'}">${fmt(v)}</td>` : `<td class="num${k === 'soh' ? ' tl-soh' : ''}">${v ? fmt(v) : k === 'soh' ? '0' : ''}</td>`; };
  const rowsHtml = shown.map((x, i) => { const { o, t } = x, mat = o.material || o.kimap;
    return LAB.map(([k, l], j) => `<tr class="tl-r tl-${k}${j === 0 ? ' tl-first' : ''}">${j === 0 ? `<td rowspan="5" class="tl-n">${i + 1}</td><td rowspan="5" class="tl-k">${o.material ? `<a class="mono mlink" href="#" data-mat="${esc(o.material)}">${esc(o.kimap || o.material)}</a>` : o.kimap ? `<span class="mono">${esc(o.kimap)}</span>` : pill('tanpa KIMAP', 'low')}</td><td rowspan="5" class="tl-d"><b>${esc(o.desc)}</b><small>${esc([o.plant, [...o.units].join('/')].filter(Boolean).join(' · '))}${t.firstShort >= 0 ? ` · ${pill('Kurang mulai ' + r27Label(nowIdx + t.firstShort), 'low')}` : ''}</small></td>` : ''}<td class="tl-l">${l}</td>${cols.map((m) => cell(t, k, m)).join('')}</tr>`).join(''); }).join('');
  $('pageActions').insertAdjacentHTML('afterbegin', '<span id="r27P"></span>');
  UI.seg($('r27P'), plants.map((p) => [p, p === '?' ? 'Plant belum diisi' : plantLabel(p)]).concat([['all', 'Semua plant']]), S.r27p, (v) => { S.r27p = v; store.set('r27p', v); T.page = 1; route(); });
  const shortN = list.filter((x) => x.t.firstShort >= 0).length;
  $('view').innerHTML = `<p class="tab-note">Stok awal bulan ini dari MRP/MB52, lalu bergulir: <b>Saldo = Stok awal + OS PO − Kebutuhan − Reservasi</b>, dan saldo jadi stok awal bulan berikutnya. OS PO dihitung di bulan tanggal kirimnya, reservasi di bulan tanggal butuhnya (yang sudah lewat masuk bulan ini). ${T.pic ? 'Dengan filter PIC, kebutuhan hanya milik PIC itu, sedangkan stok, PO, dan reservasi tetap total plant (belum dibagi per PIC).' : ''}</p>
    <div class="tl-filters"><label>PIC<select id="tlPic"><option value="">Semua PIC</option>${pics.map((p) => `<option${p === T.pic ? ' selected' : ''}>${esc(p)}</option>`).join('')}</select></label>
      <label>Dari<input type="month" id="tlFrom" min="${ymStr(nowIdx)}" max="${ymStr(endIdx)}" value="${ymStr(fromIdx)}"></label><label>Sampai<input type="month" id="tlTo" min="${ymStr(nowIdx)}" max="${ymStr(endIdx)}" value="${ymStr(toIdx)}"></label>
      <label>Cari<input type="search" id="tlQ" placeholder="KIMAP atau deskripsi" value="${esc(T.q)}"></label><label class="chk"><input type="checkbox" id="tlShort"${T.onlyShort ? ' checked' : ''}> Hanya yang kurang</label>
      <button type="button" class="btn" id="tlXls">Download Excel</button></div>
    <p class="muted small">${fmt(list.length, 0)} material, ${fmt(shortN, 0)} di antaranya saldo jadi negatif${S.me2n ? '' : ' · ME2N belum dimuat, OS PO dianggap 0'}${S.mb25 ? '' : ' · MB25 belum dimuat, reservasi dianggap 0'}.</p>
    <div class="plain-wrap tl-wrap"><table class="plain tl"><thead><tr><th>No</th><th>KIMAP</th><th>Deskripsi</th><th>Keterangan</th>${cols.map((m) => `<th class="num">${esc(r27Label(m))}</th>`).join('')}</tr></thead><tbody>${rowsHtml || `<tr><td colspan="${4 + cols.length}" class="muted">Tidak ada material untuk filter ini.</td></tr>`}</tbody></table></div>
    ${list.length > shown.length ? `<p><button type="button" class="btn" id="tlMore">Tampilkan ${fmt(Math.min(TL_PAGE, list.length - shown.length), 0)} lagi (${fmt(shown.length, 0)} dari ${fmt(list.length, 0)})</button></p>` : ''}`;
  const again = () => { T.page = 1; route(); };
  $('tlPic').onchange = (e) => { T.pic = e.target.value; again(); };
  $('tlFrom').onchange = (e) => { T.from = e.target.value; again(); }; $('tlTo').onchange = (e) => { T.to = e.target.value; again(); };
  $('tlQ').onchange = (e) => { T.q = e.target.value; again(); }; $('tlShort').onchange = (e) => { T.onlyShort = e.target.checked; again(); };
  const more = $('tlMore'); if (more) more.onclick = () => { T.page++; route(); };
  $('tlXls').onclick = () => {
    const aoa = [['No', 'Plant', 'KIMAP', 'Deskripsi', 'Keterangan'].concat(cols.map(r27Label))];
    list.forEach((x, i) => LAB.forEach(([k, l], j) => aoa.push([j ? '' : i + 1, j ? '' : x.o.plant, j ? '' : x.o.kimap || x.o.material, j ? '' : x.o.desc, l].concat(cols.map((m) => x.t[k][off(m)])))));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'RKM Timeline');
    XLSX.writeFile(wb, `RKM-Timeline-${S.r27p}${T.pic ? '-' + T.pic.replace(/[^\w]+/g, '_') : ''}.xlsx`);
  };
};
