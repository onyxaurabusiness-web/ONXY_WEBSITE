/* ONYXAURA checkout: details, review, then the order is placed through /api/checkout. Needs cart.js.
   While no payment gateway is connected the order is a request: the team calls to confirm it and takes payment then.
   Card, UPI and bank details are never collected here. */
(function () {
  'use strict';
  var cart = window.OACart;
  if (!cart) return;
  var SAVE = 'oa-co-v1', LAST = 'oa-last-order';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };

  var emptyEl = $('[data-empty]'), co = $('[data-co]'), form = $('#co-form'), step2 = $('[data-step="2"]');
  var linesEl = $('[data-lines]'), sumEl = $('[data-sum]'), totalEl = $('[data-total]');
  var payBtn = $('[data-pay]'), failEl = $('[data-fail]'), overlay = $('[data-go]'), terms = $('#f-terms');
  var states = [], cat = null, step = 1;
  var FIELDS = ['name', 'email', 'phone', 'line1', 'line2', 'city', 'pin', 'state', 'note', 'gstin'];

  /* ---------- values ---------- */
  function read() { var o = {}; FIELDS.forEach(function (f) { o[f] = (form.elements[f] ? form.elements[f].value : '').trim(); }); return o; }
  function phone(v) { return v.replace(/[\s\-()]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, ''); }
  function validate(v) {
    var e = {};
    if (v.name.length < 2) e.name = 'Please add your name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = 'Please add a valid email address.';
    if (!/^[6-9]\d{9}$/.test(phone(v.phone))) e.phone = 'Please add a 10-digit mobile number.';
    if (v.line1.length < 5) e.line1 = 'Please add the delivery address.';
    if (v.city.length < 2) e.city = 'Please add the city.';
    if (states.indexOf(v.state) < 0) e.state = 'Please choose the state.';
    if (!/^[1-9]\d{5}$/.test(v.pin.replace(/\s/g, ''))) e.pin = 'Please add a 6-digit PIN code.';
    if (v.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(v.gstin.toUpperCase())) e.gstin = 'That GSTIN does not look right.';
    return e;
  }
  function clearErrs() { $$('[data-err]').forEach(function (s) { s.hidden = true; s.textContent = ''; var f = s.closest('.field'); if (f) f.classList.remove('bad'); }); }
  function showErrs(errs) {
    clearErrs(); var first = null;
    Object.keys(errs).forEach(function (k) {
      var s = $('[data-err="' + k + '"]'); if (!s) return;
      s.textContent = errs[k]; s.hidden = false;
      var f = s.closest('.field'); if (f) f.classList.add('bad');
      if (!first && form.elements[k]) first = form.elements[k];
    });
    if (first) first.focus();
  }
  function save() { try { sessionStorage.setItem(SAVE, JSON.stringify(read())); } catch (e) {} }
  function restore() {
    try { var o = JSON.parse(sessionStorage.getItem(SAVE) || 'null'); if (o) FIELDS.forEach(function (f) { if (o[f] && form.elements[f]) form.elements[f].value = o[f]; }); } catch (e) {}
  }

  /* ---------- summary ---------- */
  function paintSummary() {
    var t = cart.totals();
    if (!t.lines.length) { co.hidden = true; emptyEl.hidden = false; return; }
    emptyEl.hidden = true; co.hidden = false;
    linesEl.innerHTML = t.lines.map(function (l) {
      var it = l.item;
      return '<div class="line" data-line="' + esc(l.id) + '"><a class="line-img" href="/collection/' + esc(it.productId) + '"><img src="' + esc(it.img) + '" alt="" loading="lazy"></a>' +
        '<div class="line-main"><a class="line-name serif" href="/collection/' + esc(it.productId) + '">' + esc(it.product) + '</a>' +
        '<span class="line-var">' + esc(it.variant.label) + ' ' + esc(it.variant.volume) + ' &middot; ' + esc(it.packLabel) + ' &middot; ' + cart.fmt(it.price) + '</span>' +
        '<div class="qty sm" role="group" aria-label="Quantity"><button type="button" data-dec aria-label="One fewer">&minus;</button><output>' + l.qty + '</output><button type="button" data-inc aria-label="One more"' + (l.qty >= cat.maxPerLine ? ' disabled' : '') + '>+</button></div></div>' +
        '<div class="line-end"><span class="line-amt">' + cart.fmt(l.amount) + '</span><button type="button" class="link" data-rm>Remove</button></div></div>';
    }).join('');
    sumEl.innerHTML = '<div><span>Subtotal (MRP)</span><span>' + cart.fmt(t.subtotal) + '</span></div><div><span>Delivery</span><span>' + esc(t.shipLabel) + '</span></div>' +
      (t.shipNote ? '<div class="small" style="text-transform:none;letter-spacing:.02em;font-size:12px;display:block;line-height:1.6">' + esc(t.shipNote) + '</div>' : '');
    totalEl.textContent = cart.fmt(t.total);
    payBtn.textContent = (cat.paymentsConnected ? 'Continue to payment · ' : 'Place order · ') + cart.fmt(t.total);
    if (step === 2) paintReview();
  }
  linesEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-inc],[data-dec],[data-rm]'); if (!b) return;
    var id = b.closest('[data-line]').dataset.line, l = cart.raw().filter(function (x) { return x.id === id; })[0]; if (!l) return;
    if (b.hasAttribute('data-inc')) cart.set(id, l.qty + 1); else if (b.hasAttribute('data-dec')) cart.set(id, l.qty - 1); else cart.remove(id);
  });

  /* ---------- steps ---------- */
  function go(n) {
    step = n;
    form.hidden = n !== 1; step2.hidden = n !== 2;
    $$('.steps li').forEach(function (li) { var s = +li.dataset.s; li.classList.toggle('on', s === n); li.classList.toggle('done', s < n); });
    if (n === 2) paintReview();
    var top = $('.steps').getBoundingClientRect().top + window.scrollY - 110;
    window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
  }
  function paintReview() {
    var v = read();
    var rows = [
      ['Contact', esc(v.name) + '<br>' + esc(v.email) + '<br>' + esc(phone(v.phone))],
      ['Deliver to', esc(v.line1) + (v.line2 ? ', ' + esc(v.line2) : '') + '<br>' + esc(v.city) + ', ' + esc(v.state) + ' ' + esc(v.pin.replace(/\s/g, '')) + '<br>India']
    ];
    if (v.note) rows.push(['Note', esc(v.note)]);
    if (v.gstin) rows.push(['GSTIN', esc(v.gstin.toUpperCase())]);
    $('[data-review]').innerHTML = rows.map(function (r) { return '<div><dt>' + r[0] + '</dt><dd>' + r[1] + '</dd><button type="button" class="link" data-edit>Edit</button></div>'; }).join('');
  }
  $('[data-review]').addEventListener('click', function (e) { if (e.target.closest('[data-edit]')) go(1); });
  $('[data-back]').addEventListener('click', function () { go(1); });

  form.addEventListener('input', function (e) { save(); var f = e.target.closest('.field'); if (f && f.classList.contains('bad')) { f.classList.remove('bad'); var s = $('[data-err]', f); if (s) s.hidden = true; } });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var v = read(), errs = validate(v);
    if (Object.keys(errs).length) { showErrs(errs); return; }
    clearErrs(); save(); go(2);
  });

  /* ---------- pay ---------- */
  payBtn.addEventListener('click', function () {
    failEl.hidden = true;
    var tf = $('[data-terms]');
    if (!terms.checked) { var s = $('[data-err="terms"]'); s.textContent = 'Please confirm to continue.'; s.hidden = false; tf.classList.add('bad'); terms.focus(); return; }
    tf.classList.remove('bad'); $('[data-err="terms"]').hidden = true;
    var t = cart.totals(); if (!t.lines.length) return;
    var v = read();
    var body = {
      items: t.lines.map(function (l) { return { id: l.id, qty: l.qty }; }),
      customer: { name: v.name, email: v.email, phone: phone(v.phone) },
      address: { line1: v.line1, line2: v.line2, city: v.city, state: v.state, pin: v.pin.replace(/\s/g, '') },
      note: v.note, gstin: v.gstin.toUpperCase(), terms: true, website: (form.elements.website || {}).value || ''
    };
    overlay.hidden = false; payBtn.disabled = true;
    fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { status: r.status, j: j }; }); })
      .then(function (res) {
        var j = res.j;
        if (res.status === 200 && j.ok && j.redirectUrl) {
          if (j.totals && j.totals.total !== t.total) { var d = new Error('price'); d.price = j.totals.total; throw d; }
          try { localStorage.setItem(LAST, JSON.stringify({ id: j.orderId, mode: j.mode, notified: !!j.notified, totals: j.totals, customer: { name: v.name, email: v.email, phone: phone(v.phone) }, address: body.address, note: v.note, ts: Date.now() })); } catch (e) {}
          $$('.steps li').forEach(function (li) { var s = +li.dataset.s; li.classList.toggle('on', s === 3); li.classList.toggle('done', s < 3); });
          location.href = j.redirectUrl; return;
        }
        throw res;
      })
      .catch(function (err) {
        overlay.hidden = true; payBtn.disabled = false;
        if (err && err.j && err.j.error === 'invalid') { go(1); showErrs(err.j.errors || {}); return; }
        failEl.textContent = err && err.message === 'price' ? 'Prices have been updated. Please refresh this page and review your order.'
          : err && err.j && err.j.error === 'bad_cart' ? 'Something in your cart has changed. Please check it and try again.'
          : 'We could not place your order. Please try again, or write to hello@onyxaura.in and we will take it from there.';
        failEl.hidden = false;
      });
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) { overlay.hidden = true; payBtn.disabled = false; } });

  /* ---------- start ---------- */
  Promise.all([cart.ready(), fetch('/assets/in-states.json').then(function (r) { return r.json(); })]).then(function (r) {
    cat = r[0]; states = r[1];
    var sel = form.elements.state;
    states.forEach(function (s) { var o = document.createElement('option'); o.value = s; o.textContent = s; sel.appendChild(o); });
    restore();
    $('[data-testnote]').style.display = cat.paymentsConnected ? 'none' : 'block';
    cart.on(paintSummary);
    paintSummary();
  }).catch(function () { emptyEl.hidden = false; $('.lead', emptyEl).textContent = 'We could not load your order. Please refresh the page.'; });
})();
