// ============ Perencanaan: satu menu untuk RKM + MRP ============
// Sub-fitur: Timeline (stok bergulir per plant/PIC), MRP & Stok Level (Min/Max, penyehatan, RKM <-> MRP), Data RKM (realisasi vs rencana, rekap, per PIC, dobel, file).
// Isi tiap sub-fitur tetap di file masing-masing (rkmtl.js, kebutuhan.js, rkm27.js); file ini menyatukan navigasinya dan filter plant.
// Grafik tiap sub-fitur punya tombol Sembunyikan/Tampilkan (panel data-fold, pilihan disimpan di localStorage).
const REN_TABS = [['tl', 'Timeline'], ['mrp', 'MRP & Stok Level'], ['data', 'Data RKM']];
// Filter plant satu dropdown di baris navigasi Perencanaan (dipanggil oleh rkmtl.js dan rkm27.js)
function renPlantFilter(plants) { S._renPlants = plants; }
PAGES.rencana = function () {
  if (!REN_TABS.some((t) => t[0] === S.renTab)) S.renTab = store.get('renTab') || 'tl';
  S._renPlants = null;
  ({ tl: PAGES.rkmtl, mrp: PAGES.rkm, data: PAGES.rkm27 })[S.renTab]();
  $('view').insertAdjacentHTML('afterbegin', '<div class="ren-nav" id="renNav"><span id="renSeg"></span></div>');
  UI.seg($('renSeg'), REN_TABS, S.renTab, (v) => { S.renTab = v; store.set('renTab', v); route(); });
  const pl = S._renPlants;
  if (pl) {
    $('renNav').insertAdjacentHTML('beforeend', '<label class="ren-plant"><span>Plant</span><select id="r27P" aria-label="Filter plant"></select></label>');
    const sel = $('r27P');
    sel.innerHTML = [['all', 'Semua plant']].concat(pl.map((p) => [p, p === '?' ? 'Plant belum diisi' : plantLabel(p)])).map(([v, l]) => `<option value="${esc(v)}"${v === S.r27p ? ' selected' : ''}>${esc(l)}</option>`).join('');
    sel.onchange = () => { S.r27p = sel.value; store.set('r27p', sel.value); S.r27m = null; if (S.tl) S.tl.page = 1; route(); };
  }
};
