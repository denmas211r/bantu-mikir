// ============ Master referensi: kunci Mvt SAP, Material Group (SKK), kelompok barang kontrak ============
// Sumber: file referensi user "MvT_DS" (sheet MG). Isinya klasifikasi umum, bukan data transaksi.
// Kunci Mvt = Movement Type + 2 digit awal No. PO (41/43/45/92/94) ATAU 2 digit awal Material Document (49/50) + tanda qty.
//   contoh: 105 dari RO 43xxxxxxxx → "10543+" = PO/RO · 291 matdoc 49xxxxxxxx qty negatif → "29149-" = Own Use
// Material Group: kode material 12 karakter diawali kode MG (Z1–Z9, 10–96). Kode KIMAP lama (10 karakter) belum terpetakan.
(function (root) {
  const MVT_KEY = {"10143+":"PO/RO","10145+":"PO/RO","10192+":"Not Included","10194+":"MTA Rec","10243-":"PO/RO","10294-":"MTA Rec","10343+":"Not Included","10345+":"Not Included","10392+":"Not Included","10394+":"Not Included","10443-":"Not Included","10445-":"Not Included","10445+":"Not Included","10492-":"Not Included","10494-":"Not Included","10543+":"PO/RO","10545+":"PO/RO","10592+":"Not Included","10594+":"MTA Rec","10643-":"PO/RO","10645-":"PO/RO","10645+":"PO/RO","10692-":"Not Included","10694-":"MTA Rec","12243-":"PO/RO","201-":"Own Use","202+":"Own Use","221-":"Own Use","222+":"Return","261-":"Own Use","262+":"Own Use","301-":"Trf Iss","301+":"Trf Rec","302-":"Trf Rec","302+":"Trf Iss","309-":"Trf Iss","309+":"Trf Rec","310-":"Trf Rec","310+":"Trf Iss","311-":"Not Included","311+":"Not Included","411-":"Not Included","411+":"Maxter Rec","412-":"Maxter Rec","412+":"Not Included","551-":"FUPP Iss","552+":"FUPP Iss","957+":"Return","958-":"Return","963-":"MTA Iss","964+":"MTA Iss","10492+":"Not Included","10692+":"Not Included","99994+":"GI Adj","99994-":"GI Adj","10150+":"BAU Rec","10250-":"Cancel BAU Rec","10350+":"Not Included","10450-":"Not Included","10550+":"PO/RO","10650-":"Cancel Rec","20149-":"Own Use","29149-":"Own Use","29249+":"Return","30149-":"Not Included","30149+":"Not Included","31149-":"Not Included","31149+":"Not Included","35149-":"BAU Iss","35149+":"Not Included","35249-":"Not Included","35249+":"Cancel BAU Iss","91649+":"Return DS","94949-":"Own Use","95049+":"Return","96349-":"Own Use"};
  const MG = {"Z1":["A","DRILLING MACHINERY, MUD EQUIPMENT AND ACCESSORIES"],"Z2":["A","PRODUCTION SURFACE EQUIPMENT"],"Z3":["A","DRILLING TOOLS AND RETRIEVABLE PRODUCTION TOOLS"],"Z4":["A","CASING, TUBING AND ACCESSORIES"],"Z5":["A","CEMENTING EQUIPMENT AND LINER HANGER SYSTEMS"],"Z6":["A","FISHING AND REPAIR TOOLS (DRILLING)"],"Z7":["A","DRILLING AND MUD CONTROL INSTRUMENTS"],"Z8":["A","PRODUCTION WELL TEST AND MONITORING INSTRUMENTS"],"Z9":["A","WELLHEAD EQUIPMENT AND ACCESSORIES"],"10":["A","PRODUCTION STRING COMPONENTS AND SUBSURFACE PUMPS"],"11":["A","DERRICKS AND ACCESSORIES"],"12":["A","GEOLOGICAL AND GEOPHYSICAL OPERATING EQUIPMENT"],"13":["B","BOILERS AND ACCESSORIES"],"14":["B","ENGINES, GAS AND OIL (NOS)"],"15":["B","ENGINES, STEAM (RECIPROCATING)"],"16":["B","ENGINES, TURBINE"],"17":["B","ENGINES, GAS AND OIL (CONTINENT)"],"18":["B","ENGINES, GAS AND OIL (GB)"],"19":["B","ENGINES, GAS AND OIL (US)"],"20":["B","GAS TURBINES"],"22":["B","COMPRESSORS AND VACUUM PUMPS (CONTINENT)"],"23":["B","COMPRESSORS AND VACUUM PUMPS (GB)"],"24":["B","COMPRESSORS AND VACUUM PUMPS (US)"],"25":["B","COMPRESSORS AND VACUUM PUMPS (NOS)"],"26":["B","PUMP, RECIPROCATING (NOS)"],"27":["B","PUMP, RECIPROCATING (CONTINENT)"],"28":["B","PUMP, RECIPROCATING (GB)"],"29":["B","PUMP, RECIPROCATING (US)"],"30":["B","PUMPS, CENTRIFUGAL AND ROTARY (NOS)"],"31":["B","PUMPS, CENTRIFUGAL AND ROTARY (CONTINENT)"],"32":["B","PUMPS, CENTRIFUGAL AND ROTARY (GB)"],"33":["B","PUMPS, CENTRIFUGAL AND ROTARY (US)"],"34":["B","PUMP, OTHER TYPES"],"36":["B","HOSTING AND LIFTING EQUIPMENT"],"37":["B","ROAD MAKING, EXCAVATING AND CONSTRUCTION EQUIPMENT"],"38":["B","MINING EQUIPMENT"],"40":["B","REFINERY PLANTS AND COMPONENTS"],"41":["B","CHEMICAL INDUSTRIAL EQUIPMENTS"],"42":["B","AUXILIARY PLANTS AND COMPONENTS"],"43":["B","PLANTS ELEMENTS AND PARTS"],"44":["B","PACKING PLANT AND APPARATUS"],"45":["C","MOTOR-CARS (EUROPEAN)"],"46":["C","MOTOR-CARS (OTHER THAN EUROPEAN)"],"47":["C","TRUCK AND BUSES (EUROPEAN)"],"48":["C","TRUCK AND BUSES (OTHER THAN EUROPEAN)"],"49":["C","TRACTORS AND TRAILERS"],"50":["C","TRACTORS AND TRAILERS"],"51":["C","LOCOMOTIVES, CARS AND RAIL EQUIPMENTS"],"53":["C","MARINE AND OFFSHORE INSTALLATIONS"],"55":["C","VEHICLE AND VEHICLE ACCESSORIES (NOS)"],"56":["C","GARAGE AND RETAIL OUTLET EQUIPMENT"],"57":["C","AIRCRAFT AND AIRCRAFT FUELLING EQUIPMENT"],"58":["D","MACHINERY ACCESSORIES AND TRANSMISSIONS"],"59":["D","PROCESS INSTRUMENTS, SPARE PARTS"],"60":["D","PROCESS INSTRUMENTS"],"61":["E","BUILDINGS, STRUCTURES AND TANKS"],"62":["E","MACHINE TOOLS WITH ATTACHMENTS AND ACCESSORIES"],"63":["E","PNEUMATIC TOOLS AND ACCESSORIES"],"64":["E","GENERAL SHOP EQUIPMENTS (INCLUDING WELDING)"],"65":["F","ELECTRIC POWER SOURCES"],"66":["F","ELECTRICAL MOTORS, ACCESSORIES AND PARTS"],"67":["F","SWITCH/CONTROL GEAR AND ELECTRICAL INSTRUMENTS"],"68":["F","WIRES, CABLES AND ACCESSORIES"],"69":["F","LAMPS, LIGHTING FITTINGS AND ACCESSORIES"],"70":["F","CONDUIT & FITTINGS, FUSES & HOUSE INSTALLATION MATERIAL"],"71":["F","TELECOMMUNICATION, ALARM AND ELECTRONIC EQUIPMENT AND PARTS"],"72":["F","COMPUTERS, COMPUTERS PERIPHERALS AND ACCESSORIES"],"73":["G","HOSES AND HOSE CONNECTORS"],"74":["G","TUBULAR GOODS"],"75":["G","COCKS AND VALVES"],"76":["G","FITTINGS AND FLANGES"],"77":["G","VALVES AND ACCESSORIES"],"78":["H","METALS AND NON-METALS IN BARS, PLATES, SHEETS, WIRE PRODUCTS"],"79":["H","WIRE ROPES, CORDAGE CHAINS AND TACKLES"],"80":["H","BUILDING MATERIAL AND BUILDERS HARDWARE"],"81":["H","FASTENER, ETC."],"83":["I","SMALL TOOLS"],"85":["I","JOINTING (GASKETS), PACKING AND INSULATING MATERIALS"],"86":["J","PAINTS, VARNISHES, ETC."],"87":["J","OILS AND OIL PRODUCTS"],"88":["J","ABRASIVES, POILISHES AND COMPOUNDS GENERAL"],"89":["J","CHEMICALS"],"90":["J","LABORATORY REQUISITES AND APPARATUS"],"A0":["J",""],"91":["K","MEDICAL EQUIPMENT AND SUPPLIES"],"92":["L","FURNITURE, HOUSEHOLD AND CLUB REQUISITIES"],"93":["L","OFFICE AND WAREHOUSE EQUIPMENT AND MATERIALS"],"95":["L","TEXTILES, FABRICS, CLOTHING AND LEATHER GOODS"],"96":["L","FIRE, SAFETY AND ENVIRONMENTAL CONSERVATION EQUIPMEMENT"]};
  const MG_CAT = {"A":"Drilling and Production","B":"Plant and Machinery","C":"Transportation","D":"Machinery Accessories and Instruments","E":"Building, Tanks and Shop Equipment","F":"Electrical","G":"Tubular Goods, Valves and Fittings","H":"Building Material, Metals and Hardware","I":"Tools and Packing","J":"Paints, Oil, Chemical and Laboratory","K":"Medical","L":"Household, Office, Fire and Safety"};

  // ----- Mvt -----
  function mvtKey(m) {
    const mt = String(m.mt || ''), sg = (m.qty || 0) > 0 ? '+' : '-', po = String(m.po || '').slice(0, 2), md = String(m.matDoc || '').slice(0, 2);
    for (const k of [po && mt + po + sg, md && mt + md + sg, mt + sg]) if (k && MVT_KEY[k]) return { key: k, cat: MVT_KEY[k] };
    return { key: mt + (po || md) + sg, cat: '' };
  }
  // Pemakaian untuk MRP = Own Use + Return, tanpa GI ke network/proyek (221/222/949/950).
  // Dicek ke file MRP PEP Zona 1 (Okt 2026): cocok 363 dari 364 material×plant (file MRP hanya menghitung 291/292).
  const MRP_EXCLUDE = new Set(['221', '222', '949', '950']);
  const isMrpUsage = (m) => (m.cat === 'Own Use' || m.cat === 'Return') && !MRP_EXCLUDE.has(String(m.mt));

  // ----- Material Group -----
  function mgOf(material) {
    const s = String(material || '').trim(); if (s.length !== 12) return null;
    const code = s.slice(0, 2).toUpperCase(), g = MG[code]; if (!g) return null;
    return { mg: code, cat: g[0], catName: MG_CAT[g[0]] || '', mgName: g[1] };
  }
  const CHEM_MG = new Set(['89']); // MG 89 CHEMICALS
  const isChemMG = (material) => { const g = mgOf(material); return !!(g && CHEM_MG.has(g.mg)); };

  // ----- Plant WK PHE (dari file referensi) -----
  const PHE_PLANT = { SO02: ['NSO Point A', 'PHE NSO'], SOAG: ['NSO AG', 'PHE NSO'], JM02: ['Jambi Merang', 'PHE JM'], JM03: ['Jambi Merang 3', 'PHE JM'],
    OG02: ['Air Serdang', 'PHE OK'], OG03: ['Metur', 'PHE OK'], RT02: ['Pendopo (RT)', 'PHE RT'], RT03: ['Air Itam', 'PHE RT'] };

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

  root.Master = { MVT_KEY, MG, MG_CAT, mvtKey, isMrpUsage, MRP_EXCLUDE, mgOf, isChemMG, PHE_PLANT, kelompok, KELOMPOK };
  if (typeof module !== 'undefined') module.exports = root.Master;
})(typeof window !== 'undefined' ? window : globalThis);
