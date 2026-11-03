// Shared by api/checkout.js. Prices every order from assets/catalogue.json, never from the browser.
// The browser (assets/cart.js) mirrors this arithmetic for display only; keep the two in step.
const cat = require('../assets/catalogue.json');

// a pack costs its own price when it has one (the box of six), otherwise the unit price times its units
const packPrice = (v, pk) => (typeof pk.price === 'number' ? pk.price : v.price * pk.units);

const items = {};
cat.products.forEach(p => {
  if (p.status === 'coming') return; // shown, but not on sale yet
  p.variants.forEach(v => {
    if (typeof v.price !== 'number') return;
    v.packs.forEach(pk => {
      items[v.sku + '.' + pk.units] = {
        id: v.sku + '.' + pk.units, sku: v.sku, product: p.name,
        name: p.name + ' · ' + v.label + ' ' + v.volume + ' · ' + pk.label,
        units: pk.units, price: packPrice(v, pk)
      };
    });
  });
});

// lines: [{ id, qty }] -> { lines, subtotal, shipping, total } or null when anything is invalid
function quote(lines) {
  if (!Array.isArray(lines) || !lines.length || lines.length > 20) return null;
  const seen = new Set(), out = [];
  let subtotal = 0;
  for (const l of lines) {
    const it = l && items[String(l.id)];
    const qty = l && l.qty; // must already be an integer: no coercion of strings
    if (!it || !Number.isInteger(qty) || qty < 1 || qty > cat.maxPerLine || seen.has(it.id)) return null;
    seen.add(it.id);
    out.push({ id: it.id, sku: it.sku, name: it.name, units: it.units, unitPrice: it.price, qty, amount: it.price * qty });
    subtotal += it.price * qty;
  }
  const shipping = cat.shipping.freeAbove && subtotal >= cat.shipping.freeAbove ? 0 : cat.shipping.flat;
  return { lines: out, subtotal, shipping, total: subtotal + shipping, currency: cat.currency };
}

module.exports = { quote, packPrice, catalogue: cat };
