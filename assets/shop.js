/* ONYXAURA shop: collection (filter, quick add) and product page (gallery, configurator, origin, pH and TDS scales). Needs cart.js. */
(function () {
  'use strict';
  var cart = window.OACart;
  if (!cart) return;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var coarse = window.matchMedia && window.matchMedia('(hover: none)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var pressed = function (btns, on) { btns.forEach(function (b) { var y = b === on; b.classList.toggle('on', y); b.setAttribute('aria-pressed', y ? 'true' : 'false'); }); };
  var packPrice = function (v, pk) { return typeof pk.price === 'number' ? pk.price : v.price * pk.units; };

  function flash(btn, text) {
    var was = btn.getAttribute('data-label') || btn.textContent;
    btn.setAttribute('data-label', was); btn.textContent = text; btn.disabled = true;
    setTimeout(function () { btn.textContent = was; btn.disabled = false; }, 1500);
  }
  function whileVisible(el, on, off) {
    if (!el) return;
    if (!('IntersectionObserver' in window)) { on(); return; }
    new IntersectionObserver(function (es) { if (es[0].isIntersecting) on(); else if (off) off(); }, { rootMargin: '120px 0px' }).observe(el);
  }

  /* ================= collection ================= */
  var grid = $('.pgrid');
  if (grid) {
    var cards = $$('.pcard', grid);
    var fmtOf = function (c) { return $('.seg.mini button.on', c); };
    var pick = function (card, btn) {
      var imgs = JSON.parse(card.getAttribute('data-imgs') || '{}')[btn.dataset.format];
      pressed($$('.seg.mini button', card), btn);
      $('[data-amount]', card).textContent = cart.fmt(+btn.dataset.price);
      if (imgs) {
        var a = $('.pimg .a', card), b = $('.pimg .b', card);
        a.src = imgs[0]; b.src = imgs[1];
        a.alt = btn.dataset.alt || a.alt;
      }
    };
    cards.forEach(function (card) {
      $$('.seg.mini button', card).forEach(function (b) { b.addEventListener('click', function () { pick(card, b); }); });
      var add = $('[data-add]', card);
      if (add) add.addEventListener('click', function (e) {
        var btn = e.currentTarget, f = fmtOf(card);
        cart.add(f.dataset.sku + '.1', 1).then(function (ok) { if (ok) { flash(btn, 'Added'); cart.open(); } });
      });
    });
    var count = $('[data-count]'), empty = $('[data-empty]');
    $$('.shop-bar .seg button').forEach(function (fb) {
      fb.addEventListener('click', function () {
        var f = fb.dataset.f, n = 0;
        pressed($$('.shop-bar .seg button'), fb);
        cards.forEach(function (card) {
          var has = f === 'all' || card.dataset.formats.split(' ').indexOf(f) > -1;
          card.hidden = !has;
          if (has) { n++; if (f !== 'all') { var tb = $('.seg.mini button[data-format="' + f + '"]', card); if (tb) pick(card, tb); } }
        });
        count.textContent = n + (n === 1 ? ' piece' : ' pieces');
        empty.hidden = n > 0;
      });
    });
    if (location.hash) { var t = $(location.hash); if (t && t.classList.contains('pcard')) setTimeout(function () { t.scrollIntoView({ block: 'center' }); }, 60); }
  }

  /* ================= product ================= */
  var dataEl = $('#pdp-data');
  if (!dataEl) return;
  var D = JSON.parse(dataEl.textContent);

  /* ---------- the origin: contour lines drift behind the source facts ---------- */
  var og = $('[data-origin]');
  if (og && window.OAWire && !reduce) {
    var ocv = $('.origin-cv', og);
    var cont = window.OAWire.Contours(ocv, { fps: 24, base: '232,215,138', index: '251,240,191', baseAlpha: .1, indexAlpha: .26 });
    og.addEventListener('pointermove', function (e) { var r = og.getBoundingClientRect(); cont.setPointer(e.clientX - r.left, e.clientY - r.top, true); });
    og.addEventListener('pointerleave', function () { cont.setPointer(0, 0, false); });
    whileVisible(og, function () { cont.start(); }, function () { cont.stop(); });
  }

  cart.ready().then(function (cat) {
    var product = cat.products.filter(function (p) { return p.id === D.id; })[0];
    if (!product) return;
    if (!D.soon) buyBox(cat, product);
    phScale();
    tdsScale();
  });

  function buyBox(cat, product) {
    var state = { format: D.defaultFormat, units: 1, qty: 1, view: 0 };
    var variant = function () { return product.variants.filter(function (v) { return v.format === state.format; })[0]; };
    var pack = function () { return variant().packs.filter(function (k) { return k.units === state.units; })[0] || variant().packs[0]; };
    var itemId = function () { return variant().sku + '.' + pack().units; };

    var fmtBox = $('[data-fmt]'), packBox = $('[data-pack]'), qtyOut = $('[data-qty]');
    var decB = $('[data-dec]'), incB = $('[data-inc]');
    var totalEls = [$('[data-total]'), $('[data-total2]')], unitEl = $('[data-unit]');

    function paintPrice() {
      var v = variant(), k = pack(), pp = packPrice(v, k), total = pp * state.qty, unit = k.units === 1 ? '' : k.label.toLowerCase();
      totalEls.forEach(function (el) { if (el) el.textContent = cart.fmt(total); });
      if (k.units === 1) unitEl.textContent = cart.fmt(v.price) + ' each';
      else {
        var save = v.price * k.units - pp;
        unitEl.textContent = cart.fmt(pp) + ' per ' + unit + (save > 0 ? ' · saves ' + cart.fmt(save) + ' on ' + k.units + ' singles' : ' · ' + cart.fmt(v.price) + ' each');
      }
      qtyOut.textContent = state.qty;
      decB.disabled = state.qty <= 1; incB.disabled = state.qty >= cat.maxPerLine;
    }
    function paintPacks() {
      var v = variant();
      if (!v.packs.some(function (k) { return k.units === state.units; })) state.units = v.packs[0].units;
      packBox.innerHTML = v.packs.map(function (k) {
        var on = k.units === state.units;
        return '<button type="button" class="' + (on ? 'on' : '') + '" data-units="' + k.units + '" aria-pressed="' + on + '">' + k.label + '</button>';
      }).join('');
    }
    $$('button', fmtBox).forEach(function (b) {
      b.addEventListener('click', function () {
        state.format = b.dataset.format; pressed($$('button', fmtBox), b);
        paintPacks(); paintPrice(); buildThumbs(); setView(0);
      });
    });
    packBox.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-units]'); if (!b) return;
      var before = views();
      state.units = +b.dataset.units; pressed($$('button', packBox), b); paintPrice();
      if (views() !== before) { buildThumbs(); setView(0); }
    });
    decB.addEventListener('click', function () { state.qty = Math.max(1, state.qty - 1); paintPrice(); });
    incB.addEventListener('click', function () { state.qty = Math.min(cat.maxPerLine, state.qty + 1); paintPrice(); });
    var add = function (btn, then) { cart.add(itemId(), state.qty).then(function (ok) { if (ok) then(btn); }); };
    $('[data-add]').addEventListener('click', function (e) { add(e.currentTarget, function (b) { flash(b, 'Added'); cart.open(); }); });
    var add2 = $('[data-add2]'); if (add2) add2.addEventListener('click', function (e) { add(e.currentTarget, function (b) { flash(b, 'Added'); cart.open(); }); });
    $('[data-now]').addEventListener('click', function (e) { add(e.currentTarget, function () { location.href = '/checkout'; }); });

    /* ---------- gallery: the views follow the format, and the box of six has its own ---------- */
    var stage = $('[data-stage]'), main = $('[data-main]'), thumbs = $('[data-thumbs]'), hint = $('[data-hint]');
    var views = function () { return D.packViews[itemId()] || D.views[state.format]; };
    var restHint = coarse ? 'Tap to look closer' : 'Move over the image to look closer';
    hint.textContent = restHint;

    function buildThumbs() {
      thumbs.innerHTML = views().map(function (v, i) {
        return '<li><button type="button" data-view="' + i + '" aria-label="' + v.label + '" aria-pressed="false"><img src="' + v.src + '" alt="" width="600" height="750" loading="lazy"></button></li>';
      }).join('');
    }
    function setView(i) {
      var vs = views(); i = (i + vs.length) % vs.length; state.view = i;
      $$('button', thumbs).forEach(function (b) { var on = +b.dataset.view === i; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on ? 'true' : 'false'); });
      stage.classList.remove('zoom');
      var v = vs[i], pre = new Image();
      if (main.getAttribute('src') === v.src) { stage.classList.remove('swap'); return; }
      stage.classList.add('swap');
      pre.onload = pre.onerror = function () { main.src = v.src; main.alt = 'OnyxAura ' + D.name + ': ' + v.label.toLowerCase(); setTimeout(function () { stage.classList.remove('swap'); }, 30); };
      pre.src = v.src;
    }
    thumbs.addEventListener('click', function (e) { var b = e.target.closest('button[data-view]'); if (b) setView(+b.dataset.view); });
    buildThumbs(); setView(0);

    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); setView(state.view + 1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); setView(state.view - 1); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); stage.classList.toggle('zoom'); }
    });
    var setOrigin = function (e) {
      var r = stage.getBoundingClientRect();
      stage.style.setProperty('--zx', Math.max(0, Math.min(100, (e.clientX - r.left) / r.width * 100)) + '%');
      stage.style.setProperty('--zy', Math.max(0, Math.min(100, (e.clientY - r.top) / r.height * 100)) + '%');
    };
    var down = null;
    stage.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse' && !reduce) { setOrigin(e); stage.classList.add('zoom'); } });
    stage.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') stage.classList.remove('zoom'); });
    stage.addEventListener('pointermove', function (e) { if (stage.classList.contains('zoom')) setOrigin(e); });
    stage.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') down = { x: e.clientX, y: e.clientY, t: Date.now() }; });
    stage.addEventListener('pointerup', function (e) {
      if (e.pointerType === 'mouse' || !down) return;
      var dx = e.clientX - down.x, dy = e.clientY - down.y, quick = Date.now() - down.t < 450; down = null;
      if (!stage.classList.contains('zoom') && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) { setView(state.view + (dx < 0 ? 1 : -1)); return; }
      if (quick && Math.abs(dx) < 10 && Math.abs(dy) < 10) { setOrigin(e); stage.classList.toggle('zoom'); }
    });

    paintPacks(); paintPrice();

    /* ---------- sticky buy bar (phones and tablets) ---------- */
    var sticky = $('[data-sticky]'), row = $('[data-buyrow]'), foot = $('.foot');
    if (sticky && row) {
      sticky.hidden = false;
      var tick = false;
      var sync = function () {
        tick = false;
        var past = row.getBoundingClientRect().bottom < 0;                       // the real buy row has scrolled away above
        var atFoot = foot ? foot.getBoundingClientRect().top < window.innerHeight - 40 : false; // keep the footer links uncovered
        sticky.classList.toggle('on', past && !atFoot);
      };
      window.addEventListener('scroll', function () { if (!tick) { tick = true; requestAnimationFrame(sync); } }, { passive: true });
      window.addEventListener('resize', sync); sync();
    }
  }

  /* ---------- pH scale ---------- */
  function phScale() {
    var ph = $('[data-ph]');
    if (!ph) return;
    var track = $('[data-track]', ph), input = $('.ph-input', ph), read = $('[data-read]', ph), chips = $('[data-chips]', ph);
    var pct = function (v) { return (v / 14 * 100) + '%'; };
    var i, t;
    for (i = 0; i <= 14; i++) { t = document.createElement('span'); t.className = 'tick' + (i % 7 === 0 ? ' maj' : ''); t.style.left = pct(i); t.innerHTML = '<i>' + i + '</i>'; track.appendChild(t); }
    var bands = {};
    D.ranges.forEach(function (r) {
      var b = document.createElement('div'); b.className = 'ph-band' + (r.id === D.id ? '' : ' ghost');
      b.style.left = pct(r.range[0]); b.style.width = ((r.range[1] - r.range[0]) / 14 * 100) + '%';
      b.innerHTML = '<span><i class="n">' + r.numeral + '</i><i class="t">' + r.name + '</i></span>'; track.insertBefore(b, input); bands[r.id] = b;
      if (r.id !== D.id) {
        var c = document.createElement('button'); c.type = 'button'; c.setAttribute('aria-pressed', 'true'); c.textContent = r.name;
        c.addEventListener('click', function () { var on = c.getAttribute('aria-pressed') !== 'true'; c.setAttribute('aria-pressed', on ? 'true' : 'false'); b.classList.toggle('off', !on); layoutLabels(); update(+input.value); });
        chips.appendChild(c);
      }
    });
    var cursor = document.createElement('div'); cursor.className = 'ph-cursor'; track.insertBefore(cursor, input);
    /* labels sit at the left edge of their band; where two would overlap, flip the left one to end at its band's right edge,
       and if they still collide, drop the later one a row */
    function layoutLabels() {
      var list = D.ranges.map(function (r) { return bands[r.id]; }).filter(function (b) { return !b.classList.contains('off'); });
      list.forEach(function (b) { b.classList.remove('rt', 'lo'); });
      list.sort(function (a, b) { return a.offsetLeft - b.offsetLeft; });
      for (var k = 0; k < list.length - 1; k++) {
        var a = list[k].firstChild.getBoundingClientRect(), n = list[k + 1].firstChild.getBoundingClientRect();
        if (a.right + 6 > n.left) list[k].classList.add('rt');
        a = list[k].firstChild.getBoundingClientRect();
        if (a.right + 6 > n.left && !list[k].classList.contains('lo')) list[k + 1].classList.add('lo');
      }
    }
    layoutLabels(); window.addEventListener('resize', layoutLabels);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutLabels);
    var r2 = function (r) { return r[0].toFixed(1) + ' to ' + r[1].toFixed(1); };
    var me = D.ranges.filter(function (r) { return r.id === D.id; })[0];
    function update(v) {
      cursor.style.left = pct(v);
      var hits = D.ranges.filter(function (r) { return v >= r.range[0] - 1e-9 && v <= r.range[1] + 1e-9 && !bands[r.id].classList.contains('off'); });
      D.ranges.forEach(function (r) { bands[r.id].classList.toggle('hit', hits.indexOf(r) > -1); });
      var head = 'pH <b>' + v.toFixed(1) + '</b>. ', msg;
      if (hits.indexOf(me) > -1) msg = 'Inside ' + me.name + '’s target range of ' + r2(me.range) + '.';
      else if (hits.length) msg = 'That is ' + hits[0].name + '’s range, ' + r2(hits[0].range) + '. ' + me.name + ' sits at ' + r2(me.range) + '.';
      else msg = (v < 7 ? 'Acidic side. ' : v > 7 ? 'Alkaline side. ' : 'Neutral. ') + me.name + ' sits at ' + r2(me.range) + '.';
      read.innerHTML = head + msg;
    }
    input.addEventListener('input', function () { update(+input.value); });
    track.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var r = track.getBoundingClientRect(), v = Math.round(Math.max(0, Math.min(14, (e.clientX - r.left) / r.width * 14)) * 10) / 10;
      input.value = v; update(v);
    });
    update(+input.value);
  }

  /* ---------- TDS scale: where each water sits against the tasting bands ---------- */
  function tdsScale() {
    var box = $('[data-tdsscale]');
    if (!box || !D.tds) return;
    var track = $('[data-ttrack]', box), read = $('[data-tread]', box), MAX = 600;
    var pct = function (v) { return (v / MAX * 100) + '%'; };
    [0, 100, 200, 300, 400, 500, 600].forEach(function (n) { var t = document.createElement('span'); t.className = 'tick' + (n % 300 === 0 ? ' maj' : ''); t.style.left = pct(n); t.innerHTML = '<i>' + n + '</i>'; track.appendChild(t); });
    var bars = D.tds.map(function (r, k) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'tds-bar' + (r.id === D.id ? ' me' : '');
      b.style.left = pct(r.range[0]); b.style.width = ((r.range[1] - r.range[0]) / MAX * 100) + '%'; b.style.setProperty('--row', k);
      b.innerHTML = '<span>' + r.name + '</span>'; b.setAttribute('aria-label', r.name + ': ' + r.range[0] + ' to ' + r.range[1] + ' ppm');
      track.appendChild(b); return { el: b, r: r };
    });
    track.style.setProperty('--rows', D.tds.length);
    function say(r) {
      var band = r.range[1] <= 300 ? 'well inside the excellent band' : 'across the excellent and good bands';
      read.innerHTML = '<b>' + r.name + '</b>: ' + r.range[0] + ' to ' + r.range[1] + ' ppm, ' + band + '.';
      bars.forEach(function (x) { x.el.classList.toggle('on', x.r === r); });
    }
    bars.forEach(function (x) {
      x.el.addEventListener('click', function () { say(x.r); });
      x.el.addEventListener('mouseenter', function () { say(x.r); });
    });
    say(D.tds.filter(function (r) { return r.id === D.id; })[0] || D.tds[0]);
  }
})();
