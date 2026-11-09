// ============ Master referensi: kunci Mvt SAP, Material Group (SKK), kelompok barang kontrak ============
// Sumber: file referensi user "MvT_DS" (sheet MG). Isinya klasifikasi umum, bukan data transaksi.
// Kunci Mvt = Movement Type + tanda qty (mis. "291-"), dengan pengecualian per jenis PO untuk penerimaan:
//   101 dengan PO berawalan 42 (STO) → "10142+" = BAU Rec, PO 94 → MTA Rec, PO 92 → Not Included (konfirmasi).
// Tabel dikoreksi 9 Nov 2026 mengikuti arti Movement Type di SAP (lihat kolom "arti" dan "koreksi").
// Material Group: kode material 12 karakter diawali kode MG (Z1–Z9, 10–96). Kode KIMAP lama (10 karakter) belum terpetakan.
(function (root) {
  // [kunci, kategori, teks SAP, arti, grup optimasi DS (OWN USE/BAU/MTA/309), catatan koreksi dari tabel lama]
  const MVT_TABLE = [
    [
    "101+",
    "PO/RO",
    "GR goods receipt",
    "Terima barang dari PO/RO langsung ke stok bebas.",
    "",
    ""
    ],
    [
    "10142+",
    "BAU Rec",
    "GR goods receipt",
    "Terima di plant tujuan atas STO (PO berawalan 42). Ini sisi terima BAU.",
    "",
    "Di tabel lama tertangkap lewat kunci 10150+; sekarang eksplisit lewat jenis PO 42."
    ],
    [
    "10192+",
    "Not Included",
    "GR goods receipt",
    "Terima atas PO berawalan 92 (jenis PO khusus).",
    "",
    "Mengikuti tabel lama. Mohon konfirmasi jenis PO 92."
    ],
    [
    "10194+",
    "MTA Rec",
    "GR goods receipt",
    "Terima atas PO MTA (berawalan 94) dari KKKS lain.",
    "",
    ""
    ],
    [
    "102-",
    "Batal PO/RO",
    "GR for PO reversal",
    "Pembatalan 101.",
    "",
    "Tabel lama: PO/RO. Diberi label pembatalan supaya jelas sebagai pengurang."
    ],
    [
    "10242-",
    "Batal BAU Rec",
    "GR for PO reversal",
    "Pembatalan terima STO di plant tujuan.",
    "",
    ""
    ],
    [
    "10292-",
    "Not Included",
    "GR for PO reversal",
    "Pembatalan 101 atas PO 92.",
    "",
    ""
    ],
    [
    "10294-",
    "Batal MTA Rec",
    "GR for PO reversal",
    "Pembatalan terima MTA.",
    "",
    "Tabel lama: MTA Rec."
    ],
    [
    "103+",
    "Not Included",
    "GR into blocked stck",
    "Terima ke GR blocked stock (menunggu inspeksi). Belum jadi stok, dihitung saat 105.",
    "",
    ""
    ],
    [
    "104-",
    "Not Included",
    "GR to blocked rev.",
    "Pembatalan 103.",
    "",
    ""
    ],
    [
    "104+",
    "Not Included",
    "GR to blocked rev.",
    "Pembatalan 103 (baris lawan).",
    "",
    ""
    ],
    [
    "105+",
    "PO/RO",
    "GR from blocked stck",
    "Rilis dari blocked stock ke stok bebas setelah inspeksi. Saat inilah barang PO/RO resmi masuk stok.",
    "",
    ""
    ],
    [
    "10592+",
    "Not Included",
    "GR from blocked stck",
    "Rilis atas PO 92.",
    "",
    "Mengikuti tabel lama. Mohon konfirmasi jenis PO 92."
    ],
    [
    "10594+",
    "MTA Rec",
    "GR from blocked stck",
    "Rilis atas PO MTA (94).",
    "",
    ""
    ],
    [
    "106-",
    "Batal PO/RO",
    "GR from blocked rev.",
    "Pembatalan 105.",
    "",
    "Tabel lama: PO/RO dan Cancel Rec. Disatukan jadi Batal PO/RO."
    ],
    [
    "106+",
    "Batal PO/RO",
    "GR from blocked rev.",
    "Pembatalan 105 (baris lawan).",
    "",
    ""
    ],
    [
    "10692-",
    "Not Included",
    "GR from blocked rev.",
    "Pembatalan 105 atas PO 92.",
    "",
    ""
    ],
    [
    "10692+",
    "Not Included",
    "GR from blocked rev.",
    "Pembatalan 105 atas PO 92 (baris lawan).",
    "",
    ""
    ],
    [
    "10694-",
    "Batal MTA Rec",
    "GR from blocked rev.",
    "Pembatalan rilis MTA.",
    "",
    "Tabel lama: MTA Rec."
    ],
    [
    "122-",
    "Retur ke vendor",
    "RE return to vendor",
    "Barang dikembalikan ke vendor. Mengurangi penerimaan PO/RO.",
    "",
    "Tabel lama: PO/RO."
    ],
    [
    "201-",
    "Own Use",
    "GI for cost center",
    "Pemakaian dibebankan ke cost center.",
    "OWN USE",
    ""
    ],
    [
    "202+",
    "Batal Own Use",
    "RE for cost center",
    "Pembatalan 201. Pengurang Own Use.",
    "OWN USE",
    "Tabel lama: Own Use (tanpa tanda pembatalan)."
    ],
    [
    "221-",
    "Own Use",
    "GI for project",
    "Pemakaian dibebankan ke WBS/proyek.",
    "OWN USE",
    ""
    ],
    [
    "222+",
    "Batal Own Use",
    "RE for project",
    "Pembatalan 221. Pengurang Own Use.",
    "OWN USE",
    "Koreksi: tabel lama \"Return\". 222 adalah pembalikan 221, bukan retur."
    ],
    [
    "261-",
    "Own Use",
    "GI for order",
    "Pemakaian dibebankan ke order (WO/maintenance order).",
    "OWN USE",
    ""
    ],
    [
    "262+",
    "Batal Own Use",
    "RE for order",
    "Pembatalan 261. Pengurang Own Use.",
    "OWN USE",
    ""
    ],
    [
    "291-",
    "Own Use",
    "GI all acc. assigmts",
    "Pemakaian ke objek akun apa saja (cost center, order, WBS). Mvt pemakaian utama di PEP.",
    "OWN USE",
    ""
    ],
    [
    "292+",
    "Batal Own Use",
    "RE all acct assigmts",
    "Pembatalan 291. Pengurang Own Use.",
    "OWN USE",
    "Koreksi: tabel lama \"Return\". Di data, header-nya \"CANCEL SALAH QTY\", jadi ini pembatalan."
    ],
    [
    "949-",
    "Own Use",
    "GI for network",
    "Mvt khusus (seri 9xx): pemakaian ke network/aktivitas proyek, mis. sumur bor atau WO. Setara 281 di SAP standar.",
    "OWN USE",
    ""
    ],
    [
    "950+",
    "Return",
    "RE for network",
    "Material dari network kembali ke gudang (dokumen sendiri, header \"RETURN …\"), bukan pembatalan.",
    "",
    ""
    ],
    [
    "957+",
    "Return",
    "GR return to stock",
    "Mvt khusus: material kembali ke stok dari pemakai.",
    "",
    ""
    ],
    [
    "958-",
    "Batal Return",
    "RE GR ret to stock",
    "Pembatalan 957.",
    "",
    "Koreksi: tabel lama \"Return\"."
    ],
    [
    "301-",
    "Trf Iss",
    "TF trfr plnt to plnt",
    "Transfer antar plant satu langkah, sisi keluar dari plant asal.",
    "",
    "Perlu konfirmasi: apakah 301 ikut dihitung sebagai BAU."
    ],
    [
    "301+",
    "Trf Rec",
    "TF trfr plnt to plnt",
    "Transfer antar plant satu langkah, sisi masuk di plant tujuan.",
    "",
    ""
    ],
    [
    "302-",
    "Batal Trf Rec",
    "TR trfr plnt to plnt",
    "Pembatalan 301 di plant tujuan.",
    "",
    "Tabel lama: Trf Rec."
    ],
    [
    "302+",
    "Batal Trf Iss",
    "TR trfr plnt to plnt",
    "Pembatalan 301 di plant asal.",
    "",
    "Tabel lama: Trf Iss."
    ],
    [
    "303-",
    "Trf Iss",
    "TF rem.fr.stor.to pl",
    "Transfer antar plant dua langkah, sisi keluar.",
    "",
    ""
    ],
    [
    "305+",
    "Trf Rec",
    "TF pl.in stor.in pl.",
    "Transfer antar plant dua langkah, sisi masuk.",
    "",
    ""
    ],
    [
    "309-",
    "Konversi Kode",
    "TF tfr ps.mat.to mat",
    "Ganti kode material (material ke material) di plant yang sama. Barang tidak keluar gudang. Di PHE dipakai memindah kode DS ke kode aktif (\"TRANSFER TO ACTIVE KIMAP\", \"Goods Issue for Resv\").",
    "309",
    "Koreksi: tabel lama \"Trf Iss\". 309 bukan transfer antar plant."
    ],
    [
    "309+",
    "Konversi Kode",
    "TF tfr ps.mat.to mat",
    "Sisi kode material baru dari 309.",
    "",
    "Koreksi: tabel lama \"Trf Rec\"."
    ],
    [
    "310-",
    "Batal Konversi Kode",
    "TR tfr ps.mat.to mat",
    "Pembatalan 309 (sisi kode baru).",
    "",
    ""
    ],
    [
    "310+",
    "Batal Konversi Kode",
    "TR tfr ps.mat.to mat",
    "Pembatalan 309 (sisi kode lama).",
    "309",
    ""
    ],
    [
    "311-",
    "Not Included",
    "TF trfr within plant",
    "Pindah storage location di plant yang sama.",
    "",
    ""
    ],
    [
    "311+",
    "Not Included",
    "TF trfr within plant",
    "Pindah storage location di plant yang sama.",
    "",
    ""
    ],
    [
    "312-",
    "Not Included",
    "TR trfr within plant",
    "Pembatalan 311.",
    "",
    ""
    ],
    [
    "312+",
    "Not Included",
    "TR trfr within plant",
    "Pembatalan 311.",
    "",
    ""
    ],
    [
    "351-",
    "BAU Iss",
    "TF to stck in trans.",
    "Kirim STO (PO berawalan 42) dari plant asal; stok jadi \"dalam perjalanan\". Ini sisi kirim BAU antar plant.",
    "BAU",
    ""
    ],
    [
    "351+",
    "Not Included",
    "TF to stck in trans.",
    "Sisi plant tujuan (stok dalam perjalanan). Dipakai untuk tahu plant tujuan; tidak dihitung supaya tidak dobel.",
    "",
    ""
    ],
    [
    "352+",
    "Batal BAU Iss",
    "TR to stck in trans.",
    "Pembatalan 351 di plant asal. Pengurang BAU.",
    "BAU",
    ""
    ],
    [
    "352-",
    "Not Included",
    "TR to stck in trans.",
    "Pembatalan 351 di plant tujuan.",
    "",
    ""
    ],
    [
    "411+",
    "Maxter Rec",
    "TF SLoc to SLoc",
    "Stok khusus (mis. konsinyasi/Maxter) dijadikan stok milik sendiri.",
    "",
    ""
    ],
    [
    "411-",
    "Not Included",
    "TF SLoc to SLoc",
    "Sisi stok khusus dari 411.",
    "",
    ""
    ],
    [
    "412-",
    "Batal Maxter Rec",
    "TR SLoc to SLoc",
    "Pembatalan 411.",
    "",
    "Koreksi: tabel lama \"Maxter Rec\"."
    ],
    [
    "412+",
    "Not Included",
    "TR SLoc to SLoc",
    "Pembatalan 411 (sisi stok khusus).",
    "",
    ""
    ],
    [
    "551-",
    "FUPP Iss",
    "GI scrapping",
    "Keluar untuk scrap/FUPP (penghapusan).",
    "",
    ""
    ],
    [
    "552+",
    "Batal FUPP",
    "RE scrapping",
    "Pembatalan 551.",
    "",
    "Koreksi: tabel lama \"FUPP Iss\"."
    ],
    [
    "701+",
    "Selisih Opname",
    "GR phys. inventory",
    "Kelebihan stok hasil stock opname.",
    "",
    ""
    ],
    [
    "702-",
    "Selisih Opname",
    "GI phys. inventory",
    "Kekurangan stok hasil stock opname.",
    "",
    ""
    ],
    [
    "916+",
    "Return DS",
    "RE GT norm plt to DS",
    "Mvt khusus: material dipindah dari plant/SLoc DS ke plant aktif (header \"RE DS Plnt to Active Plnt\").",
    "",
    ""
    ],
    [
    "963-",
    "MTA Iss",
    "GI to be charged",
    "Mvt khusus: keluar ke KKKS lain lewat MTA (Material Transfer Agreement), dibebankan ke KKKS penerima.",
    "MTA",
    "Koreksi: tabel lama 96349- = \"Own Use\"."
    ],
    [
    "964+",
    "Batal MTA Iss",
    "RE GI to be charged",
    "Pembatalan 963 (nomor reservasi sama, qty saling menghapus). Pengurang MTA.",
    "MTA",
    "Koreksi: tabel lama \"MTA Iss\" (terhitung sebagai keluar)."
    ],
    [
    "999+",
    "GI Adj",
    "GI Adjustment",
    "Mvt khusus untuk penyesuaian stok.",
    "",
    ""
    ],
    [
    "999-",
    "GI Adj",
    "GI Adjustment",
    "Mvt khusus untuk penyesuaian stok.",
    "",
    ""
    ]
    ];
  const MVT_KEY = Object.fromEntries(MVT_TABLE.map((r) => [r[0], r[1]]));
  const MVT_GRP = Object.fromEntries(MVT_TABLE.map((r) => [r[0], r[4]]));
  const MG = {"Z1":["A","DRILLING MACHINERY, MUD EQUIPMENT AND ACCESSORIES"],"Z2":["A","PRODUCTION SURFACE EQUIPMENT"],"Z3":["A","DRILLING TOOLS AND RETRIEVABLE PRODUCTION TOOLS"],"Z4":["A","CASING, TUBING AND ACCESSORIES"],"Z5":["A","CEMENTING EQUIPMENT AND LINER HANGER SYSTEMS"],"Z6":["A","FISHING AND REPAIR TOOLS (DRILLING)"],"Z7":["A","DRILLING AND MUD CONTROL INSTRUMENTS"],"Z8":["A","PRODUCTION WELL TEST AND MONITORING INSTRUMENTS"],"Z9":["A","WELLHEAD EQUIPMENT AND ACCESSORIES"],"10":["A","PRODUCTION STRING COMPONENTS AND SUBSURFACE PUMPS"],"11":["A","DERRICKS AND ACCESSORIES"],"12":["A","GEOLOGICAL AND GEOPHYSICAL OPERATING EQUIPMENT"],"13":["B","BOILERS AND ACCESSORIES"],"14":["B","ENGINES, GAS AND OIL (NOS)"],"15":["B","ENGINES, STEAM (RECIPROCATING)"],"16":["B","ENGINES, TURBINE"],"17":["B","ENGINES, GAS AND OIL (CONTINENT)"],"18":["B","ENGINES, GAS AND OIL (GB)"],"19":["B","ENGINES, GAS AND OIL (US)"],"20":["B","GAS TURBINES"],"22":["B","COMPRESSORS AND VACUUM PUMPS (CONTINENT)"],"23":["B","COMPRESSORS AND VACUUM PUMPS (GB)"],"24":["B","COMPRESSORS AND VACUUM PUMPS (US)"],"25":["B","COMPRESSORS AND VACUUM PUMPS (NOS)"],"26":["B","PUMP, RECIPROCATING (NOS)"],"27":["B","PUMP, RECIPROCATING (CONTINENT)"],"28":["B","PUMP, RECIPROCATING (GB)"],"29":["B","PUMP, RECIPROCATING (US)"],"30":["B","PUMPS, CENTRIFUGAL AND ROTARY (NOS)"],"31":["B","PUMPS, CENTRIFUGAL AND ROTARY (CONTINENT)"],"32":["B","PUMPS, CENTRIFUGAL AND ROTARY (GB)"],"33":["B","PUMPS, CENTRIFUGAL AND ROTARY (US)"],"34":["B","PUMP, OTHER TYPES"],"36":["B","HOSTING AND LIFTING EQUIPMENT"],"37":["B","ROAD MAKING, EXCAVATING AND CONSTRUCTION EQUIPMENT"],"38":["B","MINING EQUIPMENT"],"40":["B","REFINERY PLANTS AND COMPONENTS"],"41":["B","CHEMICAL INDUSTRIAL EQUIPMENTS"],"42":["B","AUXILIARY PLANTS AND COMPONENTS"],"43":["B","PLANTS ELEMENTS AND PARTS"],"44":["B","PACKING PLANT AND APPARATUS"],"45":["C","MOTOR-CARS (EUROPEAN)"],"46":["C","MOTOR-CARS (OTHER THAN EUROPEAN)"],"47":["C","TRUCK AND BUSES (EUROPEAN)"],"48":["C","TRUCK AND BUSES (OTHER THAN EUROPEAN)"],"49":["C","TRACTORS AND TRAILERS"],"50":["C","TRACTORS AND TRAILERS"],"51":["C","LOCOMOTIVES, CARS AND RAIL EQUIPMENTS"],"53":["C","MARINE AND OFFSHORE INSTALLATIONS"],"55":["C","VEHICLE AND VEHICLE ACCESSORIES (NOS)"],"56":["C","GARAGE AND RETAIL OUTLET EQUIPMENT"],"57":["C","AIRCRAFT AND AIRCRAFT FUELLING EQUIPMENT"],"58":["D","MACHINERY ACCESSORIES AND TRANSMISSIONS"],"59":["D","PROCESS INSTRUMENTS, SPARE PARTS"],"60":["D","PROCESS INSTRUMENTS"],"61":["E","BUILDINGS, STRUCTURES AND TANKS"],"62":["E","MACHINE TOOLS WITH ATTACHMENTS AND ACCESSORIES"],"63":["E","PNEUMATIC TOOLS AND ACCESSORIES"],"64":["E","GENERAL SHOP EQUIPMENTS (INCLUDING WELDING)"],"65":["F","ELECTRIC POWER SOURCES"],"66":["F","ELECTRICAL MOTORS, ACCESSORIES AND PARTS"],"67":["F","SWITCH/CONTROL GEAR AND ELECTRICAL INSTRUMENTS"],"68":["F","WIRES, CABLES AND ACCESSORIES"],"69":["F","LAMPS, LIGHTING FITTINGS AND ACCESSORIES"],"70":["F","CONDUIT & FITTINGS, FUSES & HOUSE INSTALLATION MATERIAL"],"71":["F","TELECOMMUNICATION, ALARM AND ELECTRONIC EQUIPMENT AND PARTS"],"72":["F","COMPUTERS, COMPUTERS PERIPHERALS AND ACCESSORIES"],"73":["G","HOSES AND HOSE CONNECTORS"],"74":["G","TUBULAR GOODS"],"75":["G","COCKS AND VALVES"],"76":["G","FITTINGS AND FLANGES"],"77":["G","VALVES AND ACCESSORIES"],"78":["H","METALS AND NON-METALS IN BARS, PLATES, SHEETS, WIRE PRODUCTS"],"79":["H","WIRE ROPES, CORDAGE CHAINS AND TACKLES"],"80":["H","BUILDING MATERIAL AND BUILDERS HARDWARE"],"81":["H","FASTENER, ETC."],"83":["I","SMALL TOOLS"],"85":["I","JOINTING (GASKETS), PACKING AND INSULATING MATERIALS"],"86":["J","PAINTS, VARNISHES, ETC."],"87":["J","OILS AND OIL PRODUCTS"],"88":["J","ABRASIVES, POILISHES AND COMPOUNDS GENERAL"],"89":["J","CHEMICALS"],"90":["J","LABORATORY REQUISITES AND APPARATUS"],"A0":["J",""],"91":["K","MEDICAL EQUIPMENT AND SUPPLIES"],"92":["L","FURNITURE, HOUSEHOLD AND CLUB REQUISITIES"],"93":["L","OFFICE AND WAREHOUSE EQUIPMENT AND MATERIALS"],"95":["L","TEXTILES, FABRICS, CLOTHING AND LEATHER GOODS"],"96":["L","FIRE, SAFETY AND ENVIRONMENTAL CONSERVATION EQUIPMEMENT"]};
  const MG_CAT = {"A":"Drilling and Production","B":"Plant and Machinery","C":"Transportation","D":"Machinery Accessories and Instruments","E":"Building, Tanks and Shop Equipment","F":"Electrical","G":"Tubular Goods, Valves and Fittings","H":"Building Material, Metals and Hardware","I":"Tools and Packing","J":"Paints, Oil, Chemical and Laboratory","K":"Medical","L":"Household, Office, Fire and Safety"};

  // ----- Mvt -----
  function mvtKey(m) {
    const mt = String(m.mt || ''), sg = (m.qty || 0) > 0 ? '+' : '-', po = String(m.po || '').slice(0, 2);
    for (const k of [po && mt + po + sg, mt + sg]) if (k && MVT_KEY[k]) return { key: k, cat: MVT_KEY[k], grp: MVT_GRP[k] };
    return { key: mt + sg, cat: '', grp: '' };
  }
  // Pemakaian untuk MRP = Own Use dikurangi pembatalannya, tanpa GI ke network/proyek (221/222/949/950).
  // Dicek ke file MRP PEP Zona 1 (Okt 2026): cocok 363 dari 364 material×plant (file MRP hanya menghitung 291/292).
  const MRP_EXCLUDE = new Set(['221', '222', '949', '950']);
  const isMrpUsage = (m) => (m.cat === 'Own Use' || m.cat === 'Batal Own Use') && !MRP_EXCLUDE.has(String(m.mt));

  // ----- Material Group -----
  function mgOf(material) {
    const s = String(material || '').trim(); if (s.length !== 12) return null;
    const code = s.slice(0, 2).toUpperCase(), g = MG[code]; if (!g) return null;
    return { mg: code, cat: g[0], catName: MG_CAT[g[0]] || '', mgName: g[1] };
  }
  const CHEM_MG = new Set(['89']); // MG 89 CHEMICALS
  const isChemMG = (material) => { const g = mgOf(material); return !!(g && CHEM_MG.has(g.mg)); };

  // ----- Plant WK PHE (dari file referensi) -----
  // [nama, area, zona] — PHE NSO & JM masuk Zona 1, PHE OK & RT masuk Zona 4 (konfirmasi user 9 Nov 2026)
  const PHE_PLANT = { SO02: ['NSO Point A', 'PHE NSO', 'Zona 1'], SOAG: ['NSO AG', 'PHE NSO', 'Zona 1'], JM02: ['Jambi Merang', 'PHE JM', 'Zona 1'], JM03: ['Jambi Merang 3', 'PHE JM', 'Zona 1'],
    OG02: ['Air Serdang', 'PHE OK', 'Zona 4'], OG03: ['Metur', 'PHE OK', 'Zona 4'], RT02: ['Pendopo (RT)', 'PHE RT', 'Zona 4'], RT03: ['Air Itam', 'PHE RT', 'Zona 4'] };

  // ----- Kelompok barang (untuk ringkasan kontrak) -----
  // urutan penting: aturan yang lebih spesifik di atas
  const KELOMPOK = [
    ['Cup Packer', /CUP PACKER|\bCUP,?\s*PCKR/],
    ['Sucker Rod & Aksesoris', /SUCKER ROD|PONY ROD|POLISH(ED)? ROD|ROD GUIDE|ROD COUPL|\bROD\b|ROD WHEEL|STUFFING BOX|SINKER BAR/],
    ['Pompa Subsurface (SRP/PCP)', /TUBING PUMP|INSERT PUMP|\bBARREL\b|PLUNGER|STATOR|\bROTOR\b|\bCAGE\b|STANDING VALVE|TRAVELLING VALVE|\bSRP\b|\bPCP\b/],
    ['Packer & Redress Kit', /\bPCKR\b|PACKER|REDRESS|REDSRESS|RE-DRESS|\bMANDREL\b|BRIDGE PLUG|RETAINER/],
    ['Liner Hanger', /L\.HGR|LNRHGR|LINER HANGER|\bHGR\b/],
    ['Casing & Tubing', /\bCASING\b|\bCSG\b|\bTUBING\b|\bTBG\b|PUP JOINT|X-OVER|CROSS ?OVER|\bOCTG\b/],
    ['Cementing', /FLOAT ?COLLAR|FLOAT ?SHOE|FLOATSHOE|FILL UP|\bDFU\b|DUPLEX CMT|CENTRALIZER|STOP COLLAR|STOP RING|REAMER SHOE|STAGE CMT|CEMENTING|\bDSCC\b|GUIDE SHOE|\bDV TOOL/],
    ['Wellhead & X-mas Tree', /\bWH\b|WELLHEAD|X-?MAS ?TREE|XTREE|\bBPV\b|WEAR BUSHING|BOP|TUBING HEAD|CASING HEAD|\bHANGER\b/],
    ['Bit', /\bBIT\b/],
    ['Valve', /VALVE|\bVLV\b/],
    ['Gauge & Instrumen', /GAUGE|TRANSMITTER|THERMOMETER|\bMETER\b|INDICATOR/],
    ['Flange & Fitting', /FLANGE|ELBOW|\bTEE\b|REDUCER|NIPPLE|ADAPTOR|ADAPTER|COUPLING|\bPLUG\b|\bUNION\b|SWAGE|BUSHING|\bBUSH\b|\bCAP\b|FITTING|CONNECTOR/],
    ['Pipa', /\bPIPE\b/],
    ['Gasket & Seal', /GASKET|\bSEAL\b|O-RING|ORING|PACKING/],
    ['Baut & Pengencang', /\bSTUD\b|\bBOLT\b|\bNUT\b|SCREW|WASHER/],
    ['Kelistrikan', /CABLE|BREAKER|RELAY|CONTACTOR|\bFUSE\b|\bLAMP\b|LIGHT|SWITCH|\bMCB\b|\bMCCB\b|TERMINAL|ELECTRIC/],
    ['Ban, Aki & Sparepart Kendaraan', /\bTYRE\b|\bTIRE\b|\bFLAP\b|\bTUBE\b|BATTERY|FILTER|\bELEMENT\b/],
    ['Bearing & Belt', /BEARING|V-BELT|\bBELT\b/],
    ['Perkakas', /WRENCH|SOCKET|TOOLS?\b|HAMMER|PLIER|\bJAW\b/],
    ['Wire Rope & Rigging', /WIRE ROPE|\bROPE\b|SLING|SHACKLE|CHAIN/],
    ['Cat, Chemical & Gas', /PAINT|CHEMICAL|DEMULSIFIER|POTASSIUM|ACETYLENE|OXYGEN|SULFATE|CHLORIDE|INHIBITOR|BIOCIDE|SOLVENT|FLOC+ULANT|SCAVENGER|POUR POINT|THINNER|DISTILLED|ACCU ZUUR|\bLPG\b/],
    ['Material Bangunan', /SIRTU|AGGREGATE|\bSTONE\b|\bSAND\b|CEMENT\b|SEMEN/],
    ['ATK & Kantor', /\bPEN\b|PAPER|ORDNER|BINDER|NOTES|\bTAPE\b|FOLDER|STAPLE/],
    ['K3, Medis & Seragam', /UNIFORM|GLOVE|HELMET|SAFETY|COVERALL|\bBOOT|MED\.? ?SUP|MEDICAL/],
    ['Las & Konsumabel', /ELECTRODE|WIRE BRUSH|\bBRUSH|\bDISC\b|\bDISK\b|GRINDING|CUTTING WHEEL|\bTIP\b/],
    ['Kebersihan & Rumah Tangga', /BROOM|\bMOP\b|DUSTBIN|DOORMAT|CLEANER|SOAP|TISSUE/],
    ['Repair Kit & Sparepart', /REPAIR KIT|SPARE ?PART|\bSPRING\b|BAND BRAKE|BRAKE/],
  ];
  function kelompok(desc) {
    const t = String(desc || '').toUpperCase();
    for (const [name, re] of KELOMPOK) if (re.test(t)) return name;
    return 'Lainnya';
  }

  root.Master = { MVT_KEY, MVT_TABLE, MVT_GRP, MG, MG_CAT, mvtKey, isMrpUsage, MRP_EXCLUDE, mgOf, isChemMG, PHE_PLANT, kelompok, KELOMPOK };
  if (typeof module !== 'undefined') module.exports = root.Master;
})(typeof window !== 'undefined' ? window : globalThis);
