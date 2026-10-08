// Genera automatizaciones/datos-ejemplo.json: datos DE EJEMPLO (inventados) con la misma forma
// que devuelve /.netlify/functions/tnf-ml. La página los usa mientras el monitor real de
// Mercado Libre no tenga relevamientos (o si la función no responde).
//
//   node tools/demo-data.js

const fs = require('fs');
const path = require('path');

// Aleatorio con semilla: el archivo sale igual en cada corrida
let semilla = 20261008;
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648);
const entre = (a, b) => a + azar() * (b - a);
const redondear = x => Math.round(x / 100) * 100;

const DIAS = 30;
const HOY = new Date('2026-10-08T12:00:00-03:00');
const fechaDe = d => new Date(HOY.getTime() - d * 86400000).toISOString().slice(0, 10);

const TNF = 'The North Face';
// [nombre, marca, precio base ARS]
const CATEGORIAS = [
  { id: 'MLA-DEMO-1', nombre: 'Camperas de abrigo', productos: [
    ['Campera The North Face Nuptse 1996 Retro Hombre', TNF, 689000], ['Campera Columbia Omni-Heat Infinity Hombre', 'Columbia', 455000],
    ['Campera Montagne Pluma Ultralight Hombre', 'Montagne', 239000], ['Campera The North Face Aconcagua 3 Mujer', TNF, 529000],
    ['Campera Columbia Powder Lite Mujer', 'Columbia', 298000], ['Campera Doite Inflable Liviana', 'Doite', 146000],
    ['Campera Kodiak Térmica Puffer', 'Kodiak', 119000], ['Campera Nike Sportswear Therma-FIT', 'Nike', 264000],
    ['Campera Adidas Itavic 3 Tiras', 'Adidas', 239000], ['Campera Ansilta Nimbus Pluma', 'Ansilta', 412000],
    ['Campera The North Face Thermoball Eco Hombre', TNF, 459000], ['Campera Montagne Gemini Térmica', 'Montagne', 189000],
    ['Campera Lippi Atrapa Térmica', 'Lippi', 268000], ['Campera Jack Wolfskin Helium', 'Jack Wolfskin', 349000],
    ['Campera Salomon Outline Insulated', 'Salomon', 389000], ['Campera Columbia Delta Ridge Down', 'Columbia', 389000],
    ['Campera Doite Pluma Andes', 'Doite', 215000], ['Campera Kodiak Parka Urbana', 'Kodiak', 139000],
    ['Campera Hi-Tec Puffer Hombre', 'Hi-Tec', 129000], ['Campera Topper Puffer Mujer', 'Topper', 98000],
  ] },
  { id: 'MLA-DEMO-2', nombre: 'Camperas impermeables', productos: [
    ['Campera Columbia Watertight II Impermeable', 'Columbia', 179000], ['Campera The North Face Resolve 2 Impermeable', TNF, 289000],
    ['Campera Montagne Rain Impermeable', 'Montagne', 99000], ['Campera Salomon Bonatti Waterproof', 'Salomon', 349000],
    ['Campera The North Face Venture 2 Mujer', TNF, 299000], ['Campera Doite Rompeviento Impermeable', 'Doite', 89000],
    ['Campera Ansilta Kunza Gore-Tex', 'Ansilta', 459000], ['Campera Lippi Storm Tech', 'Lippi', 229000],
    ['Campera Columbia Arcadia II Mujer', 'Columbia', 189000], ['Campera Kodiak Rompeviento', 'Kodiak', 79000],
    ['Campera Jack Wolfskin Evandale', 'Jack Wolfskin', 259000], ['Campera Adidas Terrex Multi Rain.RDY', 'Adidas', 279000],
    ['Campera Montagne Glacier 3 en 1', 'Montagne', 169000], ['Campera The North Face Dryzzle Futurelight', TNF, 619000],
    ['Campera Hi-Tec Rain Hombre', 'Hi-Tec', 89000], ['Campera Nike Storm-FIT Windrunner', 'Nike', 219000],
    ['Campera Doite Andes 3 en 1', 'Doite', 199000], ['Campera Salomon Essential Waterproof', 'Salomon', 269000],
    ['Campera Lippi Huella Impermeable', 'Lippi', 189000], ['Campera Columbia Inner Limits II', 'Columbia', 199000],
  ] },
  { id: 'MLA-DEMO-3', nombre: 'Mochilas de trekking', productos: [
    ['Mochila The North Face Borealis 28 L', TNF, 219000], ['Mochila Doite Andes 40 L', 'Doite', 89000],
    ['Mochila Osprey Talon 22', 'Osprey', 259000], ['Mochila Deuter Trail 30', 'Deuter', 239000],
    ['Mochila Montagne Explorer 35 L', 'Montagne', 79000], ['Mochila The North Face Jester 27 L', TNF, 159000],
    ['Mochila Columbia Newton Ridge 24 L', 'Columbia', 99000], ['Mochila Lippi Alpamayo 45 L', 'Lippi', 189000],
    ['Mochila Kodiak Trekking 50 L', 'Kodiak', 69000], ['Mochila Ansilta Inti 40', 'Ansilta', 219000],
    ['Mochila Osprey Kestrel 38', 'Osprey', 319000], ['Mochila The North Face Terra 55 L', TNF, 329000],
    ['Mochila Deuter Futura 26', 'Deuter', 249000], ['Mochila Wenger Urban Hiking', 'Wenger', 89000],
    ['Mochila Doite Patagonia 60 L', 'Doite', 129000], ['Mochila Salomon Trailblazer 20', 'Salomon', 129000],
    ['Mochila Montagne Andes 60 L', 'Montagne', 119000], ['Mochila Discovery Adventure 45 L', 'Discovery', 59000],
    ['Mochila Nike Hike Daypack', 'Nike', 99000], ['Mochila Jack Wolfskin Velocity 20', 'Jack Wolfskin', 139000],
  ] },
  { id: 'MLA-DEMO-4', nombre: 'Zapatillas de trekking', productos: [
    ['Zapatillas Merrell Moab 3 Hombre', 'Merrell', 219000], ['Zapatillas Salomon X Ultra 4 GTX', 'Salomon', 319000],
    ['Zapatillas Columbia Redmond III', 'Columbia', 169000], ['Zapatillas The North Face Vectiv Exploris 2', TNF, 299000],
    ['Zapatillas Hi-Tec Ravus Lite', 'Hi-Tec', 99000], ['Zapatillas Montagne Trekking Hombre', 'Montagne', 89000],
    ['Zapatillas Adidas Terrex AX4', 'Adidas', 189000], ['Zapatillas Merrell Accentor 3', 'Merrell', 169000],
    ['Zapatillas Salomon Speedcross 6', 'Salomon', 279000], ['Zapatillas The North Face Hedgehog 3 WP', TNF, 249000],
    ['Zapatillas Nike Juniper Trail 2', 'Nike', 149000], ['Zapatillas Topper Trekking Hombre', 'Topper', 69000],
    ['Zapatillas Columbia Crestwood Mid', 'Columbia', 179000], ['Zapatillas Hoka Speedgoat 6', 'Hoka', 339000],
    ['Zapatillas Timberland Sprint Trekker', 'Timberland', 239000], ['Zapatillas Caterpillar Trekking', 'Caterpillar', 159000],
    ['Zapatillas Fila Trail Hombre', 'Fila', 79000], ['Zapatillas Merrell Moab Speed 2', 'Merrell', 259000],
    ['Zapatillas Salomon XA Pro 3D v9', 'Salomon', 299000], ['Zapatillas The North Face Offtrail Hike', TNF, 339000],
  ] },
  { id: 'MLA-DEMO-5', nombre: 'Buzos polares', productos: [
    ['Buzo Polar The North Face 100 Glacier 1/4 Zip', TNF, 129000], ['Buzo Polar Columbia Steens Mountain', 'Columbia', 89000],
    ['Buzo Polar Montagne Micropolar', 'Montagne', 39000], ['Buzo Polar Doite Polartec 200', 'Doite', 59000],
    ['Buzo Polar Kodiak Térmico', 'Kodiak', 32000], ['Buzo Polar The North Face Denali Hombre', TNF, 289000],
    ['Buzo Polar Lippi Classic', 'Lippi', 79000], ['Buzo Polar Ansilta Polartec Thermal Pro', 'Ansilta', 149000],
    ['Buzo Polar Columbia Fast Trek II Mujer', 'Columbia', 99000], ['Buzo Polar Hi-Tec Hombre', 'Hi-Tec', 45000],
    ['Buzo Polar Montagne Andes Mujer', 'Montagne', 42000], ['Buzo Polar Adidas Terrex Fleece', 'Adidas', 119000],
    ['Buzo Polar Jack Wolfskin Taunus', 'Jack Wolfskin', 99000], ['Buzo Polar Doite Andes Mujer', 'Doite', 55000],
    ['Buzo Polar The North Face Cragmont Mujer', TNF, 189000], ['Buzo Polar Nike ACG Wolf Tree', 'Nike', 159000],
    ['Buzo Polar Salomon Essential Lightwarm', 'Salomon', 109000], ['Buzo Polar Kodiak Mujer', 'Kodiak', 30000],
    ['Buzo Polar Topper Hombre', 'Topper', 35000], ['Buzo Polar Lippi Huemul', 'Lippi', 89000],
  ] },
  { id: 'MLA-DEMO-6', nombre: 'Pantalones de trekking', productos: [
    ['Pantalón Montagne Desmontable Secado Rápido', 'Montagne', 49000], ['Pantalón Columbia Silver Ridge Convertible', 'Columbia', 109000],
    ['Pantalón The North Face Paramount Convertible', TNF, 149000], ['Pantalón Doite Trekking Desmontable', 'Doite', 59000],
    ['Pantalón Kodiak Cargo Trekking', 'Kodiak', 39000], ['Pantalón Salomon Wayfarer', 'Salomon', 139000],
    ['Pantalón Lippi Quilmes Desmontable', 'Lippi', 99000], ['Pantalón The North Face Exploration Mujer', TNF, 139000],
    ['Pantalón Columbia Triple Canyon', 'Columbia', 119000], ['Pantalón Ansilta Ascent Softshell', 'Ansilta', 159000],
    ['Pantalón Montagne Softshell Térmico', 'Montagne', 69000], ['Pantalón Hi-Tec Trekking', 'Hi-Tec', 45000],
    ['Pantalón Adidas Terrex Liteflex', 'Adidas', 129000], ['Pantalón Jack Wolfskin Active Track', 'Jack Wolfskin', 119000],
    ['Pantalón Doite Softshell Andes', 'Doite', 79000], ['Pantalón The North Face Horizon', TNF, 119000],
    ['Pantalón Nike ACG Trail', 'Nike', 139000], ['Pantalón Kodiak Desmontable Mujer', 'Kodiak', 42000],
    ['Pantalón Topper Outdoor', 'Topper', 39000], ['Pantalón Merrell Hayes', 'Merrell', 109000],
  ] },
];

// Vendedores ficticios (nombres genéricos, no son cuentas reales de Mercado Libre)
const VENDEDORES = ['TIENDA OFICIAL (EJEMPLO)', 'VENDEDOR A', 'VENDEDOR B', 'VENDEDOR C', 'VENDEDOR D', 'VENDEDOR E',
  'VENDEDOR F', 'VENDEDOR G', 'VENDEDOR H', 'VENDEDOR I'];

// Puestos: cada producto deriva alrededor de su puesto base día a día
const estado = {};
CATEGORIAS.forEach(c => c.productos.forEach(([n, m, p], i) => {
  const id = `${c.id}-P${String(i + 1).padStart(2, '0')}`;
  estado[id] = { id, cat: c.id, nombre: n, marca: m, base: p, puesto: i + 1, tnf: m === TNF };
}));

const historia = [];
const precioDia = (x, d) => {
  // inflación ~2,4% mensual + promos cortas de vez en cuando
  const factor = Math.pow(1.024, -d / 30);
  const promo = (x.id.charCodeAt(x.id.length - 1) + d) % 11 === 0 ? 0.85 : 1;
  return redondear(x.base * factor * promo * entre(0.985, 1.015));
};

let ultimo = null;
for (let d = DIAS - 1; d >= 0; d--) {
  const fecha = fechaDe(d);
  const r = {};
  CATEGORIAS.forEach(c => {
    const lista = Object.values(estado).filter(x => x.cat === c.id);
    lista.forEach(x => { x.score = x.puesto + entre(-1.4, 1.4) + (x.tnf ? -0.012 * (DIAS - d) : 0); });
    lista.sort((a, b) => a.score - b.score).forEach((x, i) => { x.puesto = i + 1; x.precio = precioDia(x, d); });
    r[c.id] = { n: c.nombre, t: lista.map(x => [x.puesto, x.id, d ? null : x.nombre, x.tnf ? 1 : 0, x.precio, x.marca]) };
  });
  const p = {};
  Object.values(estado).filter(x => x.tnf).forEach(x => {
    const min = redondear(x.precio * entre(0.9, 0.97));
    p[x.id] = [min, redondear(x.precio * entre(0.99, 1.04)), x.precio, 3 + Math.floor(entre(0, 9)), x.puesto, x.nombre, x.cat];
  });
  historia.push({ fecha, p, r });
  ultimo = { fecha, r };
}

// Vista del último día, con la misma forma que lib/tnf-ml.js → vista()
const mediana = xs => {
  const s = xs.filter(Number.isFinite).sort((a, b) => a - b);
  if (!s.length) return null;
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const dif = (a, b) => (a && b ? (a / b - 1) * 100 : null);

const categorias = CATEGORIAS.map(c => {
  const top = ultimo.r[c.id].t.map(([pos, id, nombre, tnf, precio, marca]) => ({
    pos, id, tipo: 'producto', nombre, marca, tnf: !!tnf, precio, vendedor: tnf ? VENDEDORES[0] : VENDEDORES[1 + (pos % 9)],
    permalink: null, foto: null,
  }));
  const tnf = top.filter(t => t.tnf), comp = top.filter(t => !t.tnf);
  const conteo = {};
  comp.forEach(t => { conteo[t.marca] = (conteo[t.marca] || 0) + 1; });
  const lider = Object.entries(conteo).sort((a, b) => b[1] - a[1])[0];
  const medianaTnf = mediana(tnf.map(t => t.precio)), medianaComp = mediana(comp.map(t => t.precio));
  return { id: c.id, nombre: c.nombre, fuente: 'ejemplo', top, resumen: {
    tnfEnTop: tnf.length, mejorPuestoTnf: tnf.length ? tnf[0].pos : null, medianaTnf, medianaComp,
    dif: dif(medianaTnf, medianaComp), lider: lider ? { marca: lider[0], n: lider[1] } : null } };
});
const compCat = new Map(categorias.map(c => [c.id, c.resumen.medianaComp]));
const ultimoP = historia[historia.length - 1].p;

const productos = Object.values(estado).filter(x => x.tnf).map(x => {
  const n = ultimoP[x.id][3];
  const vendedores = Array.from({ length: n }, (_, i) => ({
    nick: i === 0 ? VENDEDORES[0] : VENDEDORES[1 + ((i * 3 + x.puesto) % 9)],
    precio: redondear(x.precio * (i === 0 ? 1 : entre(0.88, 1.12))), tienda: i === 0, oficial: i === 0,
    full: azar() > 0.4, envioGratis: true, permalink: null,
  })).sort((a, b) => a.precio - b.precio);
  const precios = vendedores.map(v => v.precio);
  const cat = categorias.find(c => c.id === x.cat);
  return {
    id: x.id, nombre: x.nombre, permalink: null, foto: null, catId: x.cat, categoria: cat.nombre,
    posiciones: [{ cat: cat.nombre, catId: x.cat, pos: x.puesto }],
    buyBox: { precio: x.precio, vendedor: VENDEDORES[0] },
    n, min: precios[0], max: precios[precios.length - 1], mediana: mediana(precios), minVendedor: vendedores[0].nick,
    compMediana: compCat.get(x.cat), dif: dif(x.precio, compCat.get(x.cat)), vendedores,
  };
}).sort((a, b) => a.posiciones[0].pos - b.posiciones[0].pos);

const porMarca = new Map();
categorias.forEach(c => c.top.forEach(t => {
  if (!porMarca.has(t.marca)) porMarca.set(t.marca, { marca: t.marca, apariciones: 0, top3: 0, mejorPuesto: 999, tnf: t.tnf });
  const g = porMarca.get(t.marca);
  g.apariciones++;
  if (t.pos <= 3) g.top3++;
  g.mejorPuesto = Math.min(g.mejorPuesto, t.pos);
}));
const total = categorias.reduce((s, c) => s + c.top.length, 0);
const marcas = [...porMarca.values()].map(g => ({ ...g, share: g.apariciones / total * 100 }))
  .sort((a, b) => b.apariciones - a.apariciones || a.mejorPuesto - b.mejorPuesto);

const salida = {
  demo: true,
  aviso: 'Datos de ejemplo generados para mostrar el reporte. No son ventas ni precios reales de Mercado Libre.',
  vista: { marca: TNF, fecha: ultimo.fecha, listo: true, actualizado: HOY.toISOString(), categorias, productos, marcas },
  historia,
  fechas: historia.map(h => h.fecha),
};
fs.writeFileSync(path.join(__dirname, '..', 'automatizaciones', 'datos-ejemplo.json'), JSON.stringify(salida));
console.log('ok', productos.length, 'productos TNF,', marcas.length, 'marcas,', historia.length, 'días');
