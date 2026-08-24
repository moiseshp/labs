#!/usr/bin/env node
// Genera/actualiza el campo `keywords` de lib/data/product-search.json.
//
// La data de producto (productId, name, description, category) es la fuente de
// verdad y se sigue actualizando manualmente durante la PoC. `keywords` en cambio
// es 100% derivado: este script lo recalcula desde cero en cada corrida a partir
// de `name`/`description`, así que nunca debe editarse a mano en el JSON — solo
// se ajustan los diccionarios de reglas de abajo (BEVERAGE_RULES/GENERAL_RULES)
// y se vuelve a correr:
//
//   pnpm generate:search
//
// Ver conversación del PoC de búsqueda para el porqué de cada regla.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_PATH = path.join(__dirname, '../lib/data/product-search.json');

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalize(s) {
  return stripAccents(s).replace(/®/g, '').toLowerCase();
}

// Cada regla: [patrón sobre texto normalizado, keywords a agregar si matchea].
// Cubre typos frecuentes, anglicismos y sinónimos regionales (Perú) para que
// Fuse.js pueda encontrar "late" -> Latte, "sanguche" -> Sándwich, etc.
//
// Separado en dos grupos a propósito:
//
// - BEVERAGE_RULES define la IDENTIDAD de una bebida (café, espresso, latte,
//   cold brew, sabores, té, temperatura...). Nunca se aplica a items de
//   merch-cafe-en-grano (bolsas de grano, prensas, tumblers...): un producto de
//   merch puede mencionar "Cold Brew" o "café" en su nombre/descripción sin SER
//   la bebida, y si hereda esas keywords termina compitiendo (y a veces ganando)
//   contra la bebida real en el ranking — pasó con bolsas de café en "cafe" y con
//   "Prensa Cold Brew" en "cold brew". Ver GENERAL_RULES para lo que sí aplica.
// - GENERAL_RULES cubre comida, packs y objetos de merch (tumbler, prensa,
//   bolsa...) — cosas que si describen la identidad real del producto también
//   cuando aparecen en un nombre de merch (ej. "Porta galleta" debe encontrarse
//   con "galleta").
const BEVERAGE_RULES = [
  // --- café / espresso ---
  [/\bcafe\b/, ['coffee']],
  [/\bespresso\b/, ['expreso', 'espreso']],
  [/\bdecaf\b/, ['descafeinado', 'sin cafeina']],
  [/\bamericano\b/, ['cafe americano', 'cafe con agua', 'cafe negro']],
  [/\bcold brew\b/, ['coldbrew', 'cafe frio filtrado']],
  [/\bflat white\b/, ['flatwhite']],
  [/\bshaken espresso\b/, ['shaken', 'espresso agitado']],

  // --- latte / macchiato / mocha ---
  [/\blatte\b/, ['late', 'cafe con leche', 'leche con cafe']],
  [/\bmacchiato\b/, ['machiato', 'maquiato', 'macchiatto']],
  [/\bmocha\b/, ['moka']],

  // --- frappuccino ---
  [/\bfrappuccino\b/, ['frape', 'frappe', 'frapuccino', 'frapuchino', 'frappucino']],

  // --- sabores ---
  [/\bvainilla\b/, ['vainila', 'vanilla']],
  [/\bchocolate\b/, ['choco']],
  [/\bcaramel\b/, ['caramelo']],
  [/\bcaramelo\b/, ['caramel']],
  [/\bfresa\b/, ['strawberry', 'frutilla']],
  [/\bstrawberry\b/, ['fresa']],
  [/\bmanjar blanco\b/, ['dulce de leche', 'manjarblanco']],
  [/\bdulce de leche\b/, ['manjar blanco']],
  [/\balgarrobina\b/, ['algarroba']],
  [/\blucuma\b/, ['lucma']],
  [/\bpistacho\b/, ['pistachio']],
  [/\bmatcha\b/, ['mancha', 'te verde']],
  [/\bchai\b/, ['chay']],
  [/\bpumpkin spice\b/, ['calabaza especiada', 'pumpkin']],
  [/\bholiday cinnamon\b/, ['canela navidena', 'canela']],
  [/\bcanela\b/, ['cinnamon']],
  [/\bcream\b|\bcreme\b/, ['crema']],
  [/\bacai\b/, ['asai', 'acai']],
  [/\bpitahaya\b|\bdragon fruit\b/, ['pitahaya', 'fruta del dragon']],

  // --- té ---
  [/\bte\b|\bteavana\b/, ['tea', 'infusion']],
  [/\bchamomile\b/, ['manzanilla']],
  [/\bhibiscus\b/, ['jamaica', 'flor de jamaica']],
  [/\bmint\b/, ['menta', 'hierbabuena']],

  // --- temperatura ---
  [/\bhelado\b/, ['frio', 'iced', 'cold']],
  [/\bfrio\b/, ['helado', 'iced', 'cold']],
  [/\bcaliente\b/, ['hot']],

  // --- proteína / azúcar ---
  [/\bprotein\b|\bproteico\b|\bproteina\b/, ['proteina', 'protein', 'proteico']],
  [/\bsugar free\b|\bsin azucar\b/, ['sin azucar', 'sugar free']],
  [/\bavena\b/, ['oat', 'oatmilk', 'leche de avena']],

  // --- refrescos / sanpellegrino ---
  [/\brefresher\b/, ['refresco', 'bebida refrescante']],
  [/\blemonade\b|\blimonada\b|\blimonata\b/, ['limonada']],
  [/\bsanpellegrino\b/, ['san pellegrino', 'agua con gas', 'bebida gasificada']],
  [/\baranciata\b/, ['naranja']],
];

const GENERAL_RULES = [
  // --- misc ---
  [/\bcookie\b|\bcookies\b/, ['galleta', 'galletas']],
  [/\bcake\b/, ['keke', 'torta', 'queque']],
  [/\bpastel\b/, ['pie', 'tarta']],
  [/\bmanzana\b/, ['apple']],
  [/\bchristmas\b/, ['navidad']],
  [/\bmom\b/, ['mama', 'dia de la madre']],
  [/\bbear\b/, ['oso', 'peluche']],
  [/\bkychnl\b|\bkeychain\b|\bllavero\b/, ['llavero', 'keychain']],
  [/\bvidrio\b/, ['glass']],
  [/\breciclado\b/, ['recycled']],

  // --- comida ---
  [/\bsandwich\b/, ['sanguche', 'sanguchito']],
  [/\bkeke\b/, ['cake', 'queque', 'torta']],
  [/\btorta\b/, ['cake', 'keke', 'queque']],
  [/\bgalleta\b/, ['cookie', 'cookies', 'galletita']],
  [/\bmuffin\b/, ['mafin', 'panquecito']],
  [/\bempanada\b/, ['empanadita']],
  [/\bcroissant\b/, ['cruasan', 'cachito']],
  [/\bdonut\b/, ['dona', 'rosquilla']],
  [/\bcheesecake\b/, ['tarta de queso', 'pay de queso']],
  [/\bbrownie\b/, ['brawnie']],
  [/\bqueso\b/, ['cheese']],
  [/\bjamon\b/, ['ham']],
  [/\bpollo\b/, ['chicken']],
  [/\bpavo\b|\bpavita\b/, ['turkey', 'pavo']],
  [/\btocino\b/, ['bacon']],
  [/\bhuevo\b|\begg bites\b/, ['egg', 'huevo']],
  [/\byogurt\b/, ['yogur']],
  [/\bgranola\b/, ['cereal']],
  [/\bcuchareable\b/, ['postre en vaso', 'postre para compartir']],

  // --- packs (name-only, ver isPack más abajo) ---
  [/\bpack\b/, ['combo', 'paquete']],
  [/\bcombo\b/, ['pack', 'paquete']],
  [/\bdesayuno\b/, ['breakfast']],
  [/\btraveler\b/, ['termo grupal', 'cafe para grupo']],
  [/\bshare\b/, ['para compartir']],

  // --- merch (objetos) ---
  [/\btumbler\b/, ['vaso termico', 'termo']],
  [/\bstanley\b/, ['termo stanley', 'botella stanley']],
  [/\bmug\b/, ['taza']],
  [/\btaza\b/, ['mug']],
  [/\bcold cup\b/, ['vaso frio']],
  [/\bbotella\b/, ['bottle']],
  [/\bvaso\b/, ['cup']],
  [/\bprensa\b/, ['french press', 'cafetera de prensa']],
  [/\breusable\b/, ['reutilizable']],
  [/\btupper\b/, ['contenedor']],
  [/\bmanga\b/, ['funda', 'sleeve']],
];

const COFFEE_BAG_RE = /\d+\s*gr\.?/;
// El core del negocio es "café" (la bebida): las bolsas de grano son un producto
// de nicho dentro de merch y NO deben competir por "cafe"/"coffee" sueltos, solo
// por intención explícita de bolsa/grano.
const COFFEE_BAG_KEYWORDS = ['bolsa', 'bolsas', 'grano', 'granos', 'para casa'];

// Tamaños Starbucks PE: Alto (chico) < Grande (mediano) < Venti (grande/max).
// "Grande" es el tamaño mediano en la carta real, pero coloquialmente los
// clientes lo usan para pedir "el más grande" -> por eso Venti también
// hereda "grande"/"extra grande".
const SIZE_RULES = [
  [/\balto\b/, ['chico', 'pequeno', 'personal', 'tall']],
  [/\bgrande\b/, ['mediano', 'medium']],
  [/\bventi\b/, ['grande', 'extra grande', 'el mas grande']],
];

function wordsOf(text) {
  return new Set(text.split(/[^a-z0-9]+/).filter(Boolean));
}

function isMerch(item) {
  return item.category === 'merch-cafe-en-grano';
}

function isCoffeeBag(item) {
  return isMerch(item) && COFFEE_BAG_RE.test(normalize(item.name));
}

function isPack(item) {
  return item.category === 'packs-boxes';
}

function buildKeywords(item) {
  // packs-boxes describen SUS OPCIONES en la descripción ("elige entre Latte,
  // Chocolate, Mocha..."), no la identidad del producto. El merch (bolsas de
  // café, prensas, tumblers...) suele repetir en su descripción el nombre de la
  // bebida que prepara o notas de cata ("Disfruta tu café con nuestra Prensa
  // Cold Brew", "taza brillante"). En ambos casos escanear la descripción
  // contamina el item con keywords de otro producto mencionado de paso.
  const scanDescription = !isPack(item) && !isMerch(item);
  const textForRules = scanDescription ? `${item.name} ${item.description || ''}` : item.name;
  const norm = normalize(textForRules);
  const nameWords = wordsOf(normalize(item.name));

  const set = new Set();
  // El merch nunca hereda identidad de bebida (café/late/cold brew/sabores...),
  // ni siquiera desde su propio nombre: "Prensa Cold Brew" es el objeto, no la
  // bebida, y antes le ganaba en ranking a "Black Cold Brew" por tener match
  // perfecto en 3 campos (name+keywords+description) contra 2 de la bebida real.
  const rules = isMerch(item) ? GENERAL_RULES : [...BEVERAGE_RULES, ...GENERAL_RULES];
  for (const [pattern, keywords] of rules) {
    if (pattern.test(norm)) {
      for (const kw of keywords) set.add(kw);
    }
  }
  for (const [pattern, keywords] of SIZE_RULES) {
    if (pattern.test(normalize(item.name))) {
      for (const kw of keywords) set.add(kw);
    }
  }

  if (isCoffeeBag(item)) {
    for (const kw of COFFEE_BAG_KEYWORDS) set.add(kw);
  }

  if (isPack(item)) {
    set.add('combo');
    set.add('pack');
    set.add('paquete');
  }

  // no repetir una keyword que ya es literalmente una palabra del nombre
  for (const kw of [...set]) {
    if (nameWords.has(kw)) set.delete(kw);
  }

  return [...set].sort();
}

function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));

  let withKeywords = 0;
  data.items = data.items.map((item) => {
    const { productId, name, description, category } = item;
    const keywords = buildKeywords({ name, description, category });
    if (keywords.length) withKeywords++;
    return keywords.length
      ? { productId, name, keywords, description, category }
      : { productId, name, description, category };
  });

  data.version = (data.version ?? 0) + 1;
  data.updatedAt = new Date().toISOString().slice(0, 10);

  fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log(`product-search.json: ${data.items.length} items, ${withKeywords} con keywords (v${data.version})`);
}

main();
