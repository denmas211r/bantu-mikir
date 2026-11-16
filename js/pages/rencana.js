// ============ Perencanaan: satu menu untuk RKM + MRP ============
// Sub-fitur: Timeline (stok bergulir per plant/PIC), MRP & Stok Level (Min/Max, penyehatan, RKM ↔ MRP), Data RKM (realisasi vs rencana, rekap, per PIC, dobel, file).
// Isi tiap sub-fitur tetap di file masing-masing (rkmtl.js, kebutuhan.js, rkm27.js); file ini hanya menyatukan navigasinya.
const REN_TABS = [['tl', 'Timeline'], ['mrp', 'MRP & Stok Level'], ['data', 'Data RKM']];
PAGES.rencana = function () {
  if (!REN_TABS.some((t) => t[0] === S.renTab)) S.renTab = store.get('renTab') || 'tl';
  ({ tl: PAGES.rkmtl, mrp: PAGES.rkm, data: PAGES.rkm27 })[S.renTab]();
  $('view').insertAdjacentHTML('afterbegin', '<div class="ren-nav" id="renNav"></div>');
  UI.seg($('renNav'), REN_TABS, S.renTab, (v) => { S.renTab = v; store.set('renTab', v); route(); });
};
