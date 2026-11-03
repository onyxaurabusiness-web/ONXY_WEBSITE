/* ONYXAURA cart: state in localStorage, header count, slide-in drawer. Loaded on every page.
   Prices come from /assets/catalogue.json. The server re-prices every order from the same file (api/_pricing.js). */
(function () {
  'use strict';
  var KEY = 'oa-cart-v1';
  var listeners = [], cat = null, idx = {}, catP = null, drawer = null, lastFocus = null;
  /* a pack costs its own price when it has one (the box of six), otherwise the unit price times its units: same rule as api/_pricing.js */
  var packPrice = function (v, pk) { return typeof pk.price === 'number' ? pk.price : v.price * pk.units; };

  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var inr = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };

  /* ---------- catalogue ---------- */
  function loadCatalogue() {
    if (catP) return catP;
    catP = fetch('/assets/catalogue.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('catalogue'); return r.json(); }).then(function (c) {
      cat = c; idx = {};
      c.products.forEach(function (p) {
        if (p.status === 'coming') return;
        p.variants.forEach(function (v) {
          if (typeof v.price !== 'number') return;
          v.packs.forEach(function (pk) {
            idx[v.sku + '.' + pk.units] = { id: v.sku + '.' + pk.units, productId: p.id, product: p.name, numeral: p.numeral, variant: v, pack: pk,
              name: p.name + ' · ' + v.label + ' ' + v.volume, packLabel: pk.label, units: pk.units, price: packPrice(v, pk), img: pk.thumb || v.thumb || '' };
          });
        });
      });
      return c;
    });
    return catP;
  }

  /* ---------- store ---------- */
  function read() {
    try {
      var a = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(a) ? a.filter(function (l) { return l && typeof l.id === 'string' && Number.isInteger(l.qty) && l.qty > 0; }) : [];
    } catch (e) { return []; }
  }
  function write(a) { try { localStorage.setItem(KEY, JSON.stringify(a)); } catch (e) {} emit(); }
  function emit() { paintBadge(); listeners.forEach(function (f) { try { f(); } catch (e) {} }); if (drawer && !drawer.hidden) paintDrawer(); }
  function maxQty() { return (cat && cat.maxPerLine) || 12; }

  var api = {
    ready: loadCatalogue,
    fmt: inr,
    item: function (id) { return idx[id] || null; },
    catalogue: function () { return cat; },
    count: function () { return read().reduce(function (n, l) { return n + l.qty; }, 0); },
    raw: read,
    on: function (f) { listeners.push(f); },
    add: function (id, qty) {
      return loadCatalogue().then(function () {
        if (!idx[id]) return false;
        var a = read(), l = a.filter(function (x) { return x.id === id; })[0];
        if (l) l.qty = Math.min(maxQty(), l.qty + (qty || 1)); else a.push({ id: id, qty: Math.min(maxQty(), qty || 1) });
        write(a); return true;
      });
    },
    set: function (id, qty) {
      var a = read().map(function (l) { return l.id === id ? { id: id, qty: Math.min(maxQty(), qty) } : l; }).filter(function (l) { return l.qty > 0; });
      write(a);
    },
    remove: function (id) { write(read().filter(function (l) { return l.id !== id; })); },
    clear: function () { write([]); },
    /* lines and totals; needs the catalogue (await api.ready()). Unknown ids are dropped. */
    totals: function (lines) {
      var out = [], sub = 0;
      (lines || read()).forEach(function (l) {
        var it = idx[l.id]; if (!it) return;
        var amt = it.price * l.qty; sub += amt;
        out.push({ id: l.id, qty: l.qty, item: it, amount: amt });
      });
      var ship = !out.length ? 0 : (cat.shipping.freeAbove && sub >= cat.shipping.freeAbove ? 0 : cat.shipping.flat);
      return { lines: out, subtotal: sub, shipping: ship, total: sub + ship, freeAbove: cat.shipping.freeAbove, flat: cat.shipping.flat,
        shipLabel: ship ? inr(ship) : (cat.shipping.label || 'Included'), shipNote: cat.shipping.note || '' };
    },
    open: openDrawer, close: closeDrawer
  };
  window.OACart = api;
  window.addEventListener('storage', function (e) { if (e.key === KEY) emit(); });

  /* ---------- header badge ---------- */
  function paintBadge() {
    var n = api.count();
    document.querySelectorAll('.cart-btn').forEach(function (b) {
      var c = b.querySelector('.cc');
      if (c) { c.textContent = n ? String(n) : ''; c.hidden = !n; }
      b.setAttribute('aria-label', n ? 'Cart, ' + n + (n === 1 ? ' item' : ' items') : 'Cart, empty');
    });
  }

  /* ---------- drawer ---------- */
  function ensureStyles() {
    if (document.querySelector('link[href*="shop.css"]')) return Promise.resolve();
    return new Promise(function (res) {
      var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = '/assets/shop.css';
      l.onload = l.onerror = function () { res(); }; document.head.appendChild(l);
    });
  }
  function build() {
    var shade = document.createElement('div'); shade.className = 'drawer-shade'; shade.hidden = true;
    var d = document.createElement('aside'); d.className = 'drawer'; d.hidden = true;
    d.setAttribute('role', 'dialog'); d.setAttribute('aria-modal', 'true'); d.setAttribute('aria-label', 'Your cart');
    d.innerHTML = '<div class="drawer-head"><h2>Your cart</h2><button type="button" class="drawer-x" data-close>Close</button></div>' +
      '<div class="drawer-body" data-body></div><div class="drawer-foot" data-foot></div>';
    document.body.appendChild(shade); document.body.appendChild(d);
    shade.addEventListener('click', closeDrawer);
    d.addEventListener('click', function (e) {
      var t = e.target.closest('[data-close],[data-inc],[data-dec],[data-rm]'); if (!t) return;
      if (t.hasAttribute('data-close')) return closeDrawer();
      var id = (t.closest('[data-line]') || {}).dataset; id = id && id.line;
      var l = read().filter(function (x) { return x.id === id; })[0]; if (!l) return;
      if (t.hasAttribute('data-inc')) api.set(id, l.qty + 1);
      else if (t.hasAttribute('data-dec')) api.set(id, l.qty - 1);
      else api.remove(id);
    });
    d.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var f = d.querySelectorAll('a[href],button:not([disabled])'); if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    drawer = d; drawer._shade = shade;
  }
  function paintDrawer() {
    var body = drawer.querySelector('[data-body]'), foot = drawer.querySelector('[data-foot]');
    var t = api.totals();
    if (!t.lines.length) {
      body.innerHTML = '<div class="drawer-empty"><p class="serif">Nothing here yet.</p><p class="mute">Choose a piece from the collection.</p><a class="btn ghost" href="/collection">View the collection</a></div>';
      foot.innerHTML = ''; return;
    }
    body.innerHTML = t.lines.map(function (l) {
      var it = l.item;
      return '<div class="line" data-line="' + esc(l.id) + '">' +
        '<a class="line-img" href="/collection/' + esc(it.productId) + '"><img src="' + esc(it.img) + '" alt="" loading="lazy"></a>' +
        '<div class="line-main"><a class="line-name serif" href="/collection/' + esc(it.productId) + '">' + esc(it.product) + '</a>' +
        '<span class="line-var">' + esc(it.variant.label) + ' ' + esc(it.variant.volume) + '</span>' +
        '<span class="line-var">' + esc(it.packLabel) + ' &middot; ' + inr(it.price) + '</span>' +
        '<div class="qty sm" role="group" aria-label="Quantity"><button type="button" data-dec aria-label="One fewer">&minus;</button><output>' + l.qty + '</output><button type="button" data-inc aria-label="One more"' + (l.qty >= maxQty() ? ' disabled' : '') + '>+</button></div></div>' +
        '<div class="line-end"><span class="line-amt">' + inr(l.amount) + '</span><button type="button" class="link" data-rm>Remove</button></div></div>';
    }).join('');
    var need = t.freeAbove ? t.freeAbove - t.subtotal : 0;
    foot.innerHTML =
      '<div class="sum"><div><span>Subtotal (MRP)</span><span>' + inr(t.subtotal) + '</span></div>' +
      '<div><span>Delivery</span><span>' + esc(t.shipLabel) + '</span></div></div>' +
      (need > 0 ? '<p class="small free">Delivery is included from ' + inr(t.freeAbove) + '.</p>' : '') +
      '<p class="small">MRP, inclusive of all taxes. Pay when we call to confirm your order.</p>' +
      '<a class="btn primary wide" href="/checkout">Checkout &middot; ' + inr(t.total) + '</a>' +
      '<button type="button" class="btn ghost wide" data-close>Continue browsing</button>';
  }
  function openDrawer() {
    return Promise.all([loadCatalogue(), ensureStyles()]).then(function () {
      if (!drawer) build();
      lastFocus = document.activeElement;
      paintDrawer();
      drawer.hidden = false; drawer._shade.hidden = false;
      requestAnimationFrame(function () { drawer.classList.add('on'); drawer._shade.classList.add('on'); });
      document.documentElement.classList.add('drawer-lock');
      var x = drawer.querySelector('[data-close]'); if (x) x.focus();
    }).catch(function () { location.href = '/checkout'; });
  }
  function closeDrawer() {
    if (!drawer || drawer.hidden) return;
    drawer.classList.remove('on'); drawer._shade.classList.remove('on');
    document.documentElement.classList.remove('drawer-lock');
    setTimeout(function () { drawer.hidden = true; drawer._shade.hidden = true; }, 420);
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('.cart-btn'); if (!b) return;
    e.preventDefault(); openDrawer();
  });

  paintBadge();
  if (api.count()) loadCatalogue().catch(function () {});
})();
