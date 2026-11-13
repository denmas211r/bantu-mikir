// ============ Halaman Perlu Dipesan ============
// Bagian dari web MIM. Dimuat sesudah js/app.js (fungsi bersama ada di sana) dan sebelum js/views.js.

// ---------- Vendor & PR/PO ----------
const vc = { all() { return store.get('vendorContacts') || {}; }, get(k) { return this.all()[k] || {}; }, set(k, v) { const a = this.all(); a[k] = v; store.set('vendorContacts', a); } };
const kimapGroup = (m) => { const g = Master.mgOf(m); return g ? `MG ${g.mg} ${g.mgName}` : 'KIMAP ' + (m || '').slice(0, 4); };
PAGES.order = function () {
  if (!S.mrpRes) { $('view').innerHTML = needFile('file MRP', 'Draft RO/PR dihitung dari mesin MRP. Upload file MRP (dan ME3N/ME2N agar status kontrak & PO terbaru).'); return; }
  mrpSwitch();
  const res = mrpRows();
  const mbPrice = new Map(S.mb52 ? S.mb52.items.filter((i) => i.soh > 0).map((i) => [i.material + '|' + i.plant, i.price]) : []);
  const oePrice = (r) => { const lp = S.me2n && (S.me2n.lastPrice.get(r.material) || (r.kimap && S.me2n.lastPrice.get(r.kimap)));
    if (lp) return { price: lp.price, currency: lp.currency, src: 'PO terakhir ' + dstr(lp.date) }; const p = mbPrice.get(r.key); return p ? { price: p, currency: stockCur(r.plant), src: 'Harga rata-rata stok' } : { price: 0, currency: '', src: 'Belum ada harga' }; };
  const orders = res.filter((r) => r.toOrder > 0);
  const ro = orders.filter((r) => r.contract).map((r) => Object.assign({ r }, { value: r.toOrder * r.contract.price }));
  const pr = orders.filter((r) => !r.contract).map((r) => { const p = oePrice(r); return { r, p, value: r.toOrder * p.price, grp: kimapGroup(r.material) }; });
  // sisa kontrak cukup?
  const roByDoc = new Map(); ro.forEach((o) => roByDoc.set(o.r.contract.doc, (roByDoc.get(o.r.contract.doc) || 0) + o.value));
  const kand = new Map();
  res.filter((r) => !r.contract && r.alt && /^Rutin/.test(r.alt.tko.cls || '') && r.alt.tko.amu > 0).forEach((r) => {
    const k = kand.get(r.material) || { material: r.material, desc: r.desc, uom: r.uom, plants: [], qty: 0, value: 0, grp: kimapGroup(r.material), order: 0 };
    const p = oePrice(r), a = r.alt.tko.amu; k.plants.push(r.plant); k.qty += a * 12; k.value += a * 12 * toIDRv(p.price || 0, p.currency); k.order += r.toOrder; k.priceSrc = p.src; kand.set(r.material, k);
  });
  const kandidat = [...kand.values()].sort((a, b) => b.value - a.value);
  const ven = Contract.vendors(S.me3n, S.me2n);
  const lli = S.mrpWK === 'PEP' ? lliRows() : [];
  const roText = (doc) => { const its = ro.filter((o) => o.r.contract.doc === doc); const k = its[0].r.contract;
    return `Yth. ${k.vendor},\n\nBerikut rencana Release Order atas kontrak ${doc}:\n\n` + its.map((o, i) => `${i + 1}. ${o.r.material} - ${o.r.desc} : ${fmt(o.r.toOrder)} ${o.r.contract.uom || o.r.uom} (plant ${o.r.plant})`).join('\n') + `\n\nMohon konfirmasi ketersediaan dan jadwal pengiriman.\n\nTerima kasih.`; };
  const TABS = {
    ro: ['Draft RO (ada kontrak)', ro, [['No. OA', (o) => `<a href="#" class="mono oalink" data-oa="${esc(o.r.contract.doc)}" data-tab="sim" title="Buka simulasi Call RO kontrak ini">${esc(o.r.contract.doc)}</a><br><span class="muted small">item ${esc(o.r.contract.item)}</span>`, '', (o) => o.r.contract.doc], ['Vendor', (o) => esc(o.r.contract.vendor)], ['PIC', (o) => esc(o.r.contract.pic)],
      ['Plant', (o) => esc(o.r.plant)], ['Material', (o) => `<a class="mono mlink" href="#" data-mat="${esc(o.r.material)}">${esc(o.r.material)}</a>`, '', (o) => o.r.material], ['Deskripsi', (o) => esc(o.r.desc)],
      ['Qty', (o) => `<a href="#" class="calclink" data-mat="${esc(o.r.material)}" data-p="${esc(o.r.plant)}" title="Lihat rumus Min/Max dan To Order">${fmt(o.r.toOrder)}</a>`, 'num', (o) => o.r.toOrder], ['UoM', (o) => esc(o.r.contract.uom || o.r.uom)], ['Harga kontrak', (o) => money(o.r.contract.price, o.r.contract.currency), 'num', (o) => o.r.contract.price],
      ['Nilai', (o) => money(o.value, o.r.contract.currency), 'num', (o) => o.value], ['Mata uang', (o) => esc(o.r.contract.currency)],
      ['Sisa kontrak cukup?', (o) => (roByDoc.get(o.r.contract.doc) <= o.r.contract.sisa ? pill('Cukup', 'ok') : pill('Kurang', 'low')), '', (o) => (roByDoc.get(o.r.contract.doc) <= o.r.contract.sisa ? 'Cukup' : 'Kurang')],
      ['Sisa hari', (o) => fmt(o.r.contract.sisaHari, 0), 'num', (o) => o.r.contract.sisaHari],
      ['Sumber', (o) => esc(orderSrc(o.r)), '', (o) => orderSrc(o.r)],
      ['Kontak', (o) => `<button class="btn ghost mail" data-doc="${esc(o.r.contract.doc)}" data-v="${esc(o.r.contract.vendorCode || o.r.contract.vendor)}">Email vendor</button>`, '', () => '', false]],
      (o) => o.r.contract.doc + ' ' + o.r.contract.vendor + ' ' + o.r.material + ' ' + o.r.desc, 'Klik No. OA untuk simulasi Call RO. Kontrak dipilih dengan prioritas X07 → X02 → X10 → X03.'],
    pr: ['Draft PR + OE (tanpa kontrak)', pr, [['Kelompok', (o) => esc(o.grp), '', (o) => o.grp], ['Plant', (o) => esc(o.r.plant)], ['Material', (o) => `<a class="mono mlink" href="#" data-mat="${esc(o.r.material)}">${esc(o.r.material)}</a>`, '', (o) => o.r.material],
      ['Deskripsi', (o) => esc(o.r.desc)], ['Qty', (o) => `<a href="#" class="calclink" data-mat="${esc(o.r.material)}" data-p="${esc(o.r.plant)}" title="Lihat rumus Min/Max dan To Order">${fmt(o.r.toOrder)}</a>`, 'num', (o) => o.r.toOrder], ['UoM', (o) => esc(o.r.uom)],
      ['Harga OE', (o) => (o.p.price ? money(o.p.price, o.p.currency) : pill('Belum ada', 'warn')), 'num', (o) => o.p.price], ['Sumber harga', (o) => esc(o.p.src)],
      ['Nilai OE', (o) => money(o.value, o.p.currency), 'num', (o) => o.value], ['Mata uang', (o) => esc(o.p.currency)], ['Kelas', (o) => esc(o.r.cls || o.r.aging)], ['Sumber', (o) => esc(orderSrc(o.r)), '', (o) => orderSrc(o.r)]],
      (o) => o.grp + ' ' + o.r.material + ' ' + o.r.desc, 'Item To Order tanpa kontrak → PR + Owner Estimate. Dikelompokkan per Material Group untuk kode material baru (12 karakter), dan per 4 digit awal KIMAP untuk kode lama. Harga OE dari PO terakhir (ME2N), atau harga rata-rata stok.'],
    kandidat: ['Kandidat kontrak', kandidat, [['Kelompok', (k) => esc(k.grp), '', (k) => k.grp], ['Material', (k) => `<a class="mono mlink" href="#" data-mat="${esc(k.material)}">${esc(k.material)}</a>`, '', (k) => k.material], ['Deskripsi', (k) => esc(k.desc)],
      ['Plant', (k) => esc(k.plants.join(', '))], ['Kebutuhan/thn', (k) => fmt(k.qty) + ' ' + esc(k.uom), 'num', (k) => k.qty], ['Est. nilai/thn', (k) => money(k.value, 'IDR'), 'num', (k) => k.value],
      ['To Order sekarang', (k) => fmt(k.order), 'num', (k) => k.order], ['Sumber harga', (k) => esc(k.priceSrc)]], (k) => k.grp + ' ' + k.material + ' ' + k.desc,
      'Material rutin (FS) yang belum punya kontrak aktif. Sesuai Pedoman, item rutin/bottleneck sebaiknya dibuatkan kontrak jangka panjang (OA/COO) agar lead time turun dan stok bisa lebih tipis.'],
    lli: [`Long Lead Item (LT ≥ ${S.set.lliLT} bln)`, lli, [['Fungsi', (o) => esc(o.x.fungsi)], ['KIMAP', (o) => `<span class="mono">${esc(o.x.kimap)}</span>`], ['Deskripsi', (o) => esc(o.x.desc)],
      ['LT (bln)', (o) => fmt(o.lt), 'num', (o) => o.lt], ['RKM 2027', (o) => fmt(o.x.total), 'num', (o) => o.x.total],
      ['Butuh mulai', (o) => mLabel(2027 * 12 + o.nm.i) + (o.nm.known ? '' : ' *'), '', (o) => mLabel(2027 * 12 + o.nm.i)], ['Pesan paling lambat', (o) => `<b>${mLabel(o.due)}</b>`, '', (o) => mLabel(o.due)],
      ['Stok + PO', (o) => (o.r ? fmt(o.cover) : '-'), 'num', (o) => o.cover], ['Status', (o) => pill(o.st[0], o.st[1]), '', (o) => o.st[0]]], (o) => o.x.kimap + ' ' + o.x.desc,
      S.rkmFiles.length ? 'Bulan bertanda * tidak diisi di RKM, dianggap mulai Januari 2027.' : 'Butuh file RKM.'],
    vendor: ['Vendor', ven, [['Kode', (v) => esc(v.code)], ['Vendor', (v) => esc(v.name)], ['Kontrak', (v) => fmt(v.kontrak, 0), 'num', (v) => v.kontrak], ['Dok. PO/RO', (v) => fmt(v.po, 0), 'num', (v) => v.po],
      ['Nilai sisa kirim', (v) => money(v.openValue, 'IDR'), 'num', (v) => v.openValue],
      ['Email', (v) => `<input class="vc" data-k="${esc(v.code || v.name)}" data-f="email" value="${esc(vc.get(v.code || v.name).email || '')}" placeholder="email">`, '', (v) => vc.get(v.code || v.name).email || ''],
      ['Telepon', (v) => `<input class="vc" data-k="${esc(v.code || v.name)}" data-f="tel" value="${esc(vc.get(v.code || v.name).tel || '')}" placeholder="telp/WA">`, '', (v) => vc.get(v.code || v.name).tel || ''],
      ['Nama kontak', (v) => `<input class="vc" data-k="${esc(v.code || v.name)}" data-f="pic" value="${esc(vc.get(v.code || v.name).pic || '')}" placeholder="nama">`, '', (v) => vc.get(v.code || v.name).pic || '']],
      (v) => v.code + ' ' + v.name, 'Kontak vendor hanya tersimpan di browser ini, tidak ke GitHub. Dipakai untuk tombol Email vendor di Draft RO.'],
  };
  // ringkasan: berapa yang dipesan, lewat RO/PR, dan dari mana kebutuhannya (Min/Max histori atau RKM + reservasi)
  const sumV = (xs) => xs.reduce((a, o) => a + toIDRv(o.value || 0, o.r.contract ? o.r.contract.currency : o.p && o.p.currency), 0);
  const all = ro.concat(pr), fromRkm = all.filter((o) => orderSrc(o.r) === 'RKM + reservasi');
  const late = lli.filter((o) => o.st[0] === 'Terlambat pesan' || o.st[0] === 'Pesan bulan ini').length;
  const summary = `<div class="kv o-kv"><div><span>Perlu dipesan</span><b>${fmt(all.length, 0)}</b><small>material × plant</small></div><div><span>Lewat RO</span><b>${fmt(ro.length, 0)}</b><small>${money(sumV(ro), 'IDR')}</small></div>
    <div><span>Lewat PR + OE</span><b>${fmt(pr.length, 0)}</b><small>${money(sumV(pr), 'IDR')}</small></div>
    <div title="Item Program/On Demand: kebutuhan = RKM + reservasi − (stok + PO). Sisanya dari Min/Max histori."><span>Dari RKM + reservasi</span><b>${fmt(fromRkm.length, 0)}</b><small>${fmt(all.length - fromRkm.length, 0)} dari Min/Max histori</small></div>
    ${S.mrpWK === 'PEP' ? `<div><span>LLI pesan bulan ini / telat</span><b class="${late ? 'neg' : ''}">${fmt(late, 0)}</b><small>dari ${fmt(lli.length, 0)} LLI</small></div>` : ''}</div>`;
  if (S.mrpWK !== 'PEP') delete TABS.lli;
  tabbed('oTab', TABS, mrpNote() + (S.me3n ? '' : '<div class="banner warn">Status kontrak masih dari file MRP. Tambahkan ME3N dan ME2N supaya kontrak, harga, dan OS PO terbaru.</div>') + summary);
  // event: kontak vendor & email
  const bindRes = () => {
    document.querySelectorAll('.vc').forEach((i) => (i.onchange = () => { const c = vc.get(i.dataset.k); c[i.dataset.f] = i.value.trim(); vc.set(i.dataset.k, c); }));
    document.querySelectorAll('.mail').forEach((b) => (b.onclick = () => {
      const c = vc.get(b.dataset.v); const doc = b.dataset.doc;
      if (!c.email) { alertBox('Email vendor belum diisi. Isi dulu di tab Vendor.'); return; }
      location.href = `mailto:${encodeURIComponent(c.email)}?subject=${encodeURIComponent('Rencana Release Order kontrak ' + doc)}&body=${encodeURIComponent(roText(doc))}`;
    }));
  };
  bindRes(); new MutationObserver(bindRes).observe($('res'), { childList: true, subtree: true });
};
function alertBox(t) { banner(esc(t) + ' <button class="icon-btn" id="bx">✕</button>', 'warn'); $('bx').onclick = () => banner(''); }
