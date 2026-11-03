/* ONYXAURA order page: where the buyer lands after placing an order (/order?o=<id>&s=<status>).
   s=request: no payment gateway yet, the team calls to confirm and takes payment then.
   The status in the address is not proof of anything (anyone can type it); once orders are stored server-side and a
   gateway webhook marks them paid, replace the wording below with a lookup of the real status. */
(function () {
  'use strict';
  var cart = window.OACart;
  var q = new URLSearchParams(location.search), id = (q.get('o') || '').replace(/[^A-Z0-9\-]/gi, '').slice(0, 24), s = (q.get('s') || '').toLowerCase();
  var $ = function (x) { return document.querySelector(x); };
  var esc = function (v) { return String(v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var inr = function (n) { return '₹' + Math.round(n).toLocaleString('en-IN'); };
  var snap = null;
  try { snap = JSON.parse(localStorage.getItem('oa-last-order') || 'null'); } catch (e) {}
  if (snap && snap.id !== id) snap = null;

  var failed = s === 'failed' || s === 'cancelled' || s === 'canceled';
  if (failed) {
    $('[data-eyebrow]').textContent = 'Payment';
    $('[data-title]').textContent = 'The payment did not complete.';
    $('[data-lead]').textContent = 'Your cart is as you left it, so you can try again. If you were charged, please write to hello@onyxaura.in and we will sort it out.';
    $('[data-primary]').textContent = 'Return to checkout'; $('[data-primary]').setAttribute('href', '/checkout');
    return;
  }
  $('[data-eyebrow]').textContent = 'Thank you';
  if (id) { var idEl = $('[data-id]'); idEl.textContent = 'Order ' + id; idEl.hidden = false; }
  var who = snap && snap.customer ? snap.customer : null;
  if (s === 'request' || s === 'test') {
    $('[data-title]').textContent = 'Order received.';
    $('[data-lead]').textContent = (who && who.name ? 'Thank you, ' + who.name.split(' ')[0] + '. ' : 'Thank you. ') +
      'A member of our team will call you' + (who && who.phone ? ' on ' + who.phone : '') + ' within one working day to confirm your order and the delivery date.';
    $('[data-test]').hidden = false;
    /* without the email service the server could not forward the order, so let the buyer send it in one tap */
    if (snap && snap.notified === false && snap.totals) {
      var t = snap.totals, a = snap.address || {}, lines = ['Order ' + id, ''];
      t.lines.forEach(function (l) { lines.push(l.name + ' x ' + l.qty + ' = ' + inr(l.amount)); });
      lines.push('', 'Total (MRP): ' + inr(t.total), '', (who && who.name) || '', (who && who.phone) || '', (who && who.email) || '',
        [a.line1, a.line2].filter(Boolean).join(', '), [a.city, a.state, a.pin].filter(Boolean).join(', '));
      if (snap.note) lines.push('', 'Note: ' + snap.note);
      var mail = $('[data-mail]');
      mail.setAttribute('href', 'mailto:hello@onyxaura.in?subject=' + encodeURIComponent('Order ' + id + ' · ' + inr(t.total)) + '&body=' + encodeURIComponent(lines.join('\n')));
      $('[data-send]').hidden = false;
    }
  } else {
    $('[data-title]').textContent = 'Thank you.';
    $('[data-lead]').textContent = 'We are confirming your payment' + (who ? ' and will write to ' + who.email : '') + '.';
  }
  if (!cart) return;

  /* the order is placed: empty the cart, then show what was ordered from the saved copy */
  if (snap && snap.totals) {
    var t2 = snap.totals, a2 = snap.address || {};
    $('[data-detail]').hidden = false;
    $('[data-addr]').innerHTML = esc((who || {}).name || '') + '<br>' + esc(a2.line1 || '') + (a2.line2 ? ', ' + esc(a2.line2) : '') + '<br>' + esc(a2.city || '') + ', ' + esc(a2.state || '') + ' ' + esc(a2.pin || '') + '<br>India';
    cart.ready().then(function () {
      $('[data-lines]').innerHTML = t2.lines.map(function (l) {
        var it = cart.item(l.id);
        var pic = it && it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy">' : '';
        return '<div class="line"><a class="line-img" href="' + (it ? '/collection/' + esc(it.productId) : '/collection') + '">' + pic + '</a>' +
          '<div class="line-main"><span class="line-name serif">' + esc(it ? it.product : l.name) + '</span><span class="line-var">' + esc(it ? it.variant.label + ' ' + it.variant.volume + ' · ' + it.packLabel : '') + ' × ' + l.qty + '</span></div>' +
          '<div class="line-end"><span class="line-amt">' + cart.fmt(l.amount) + '</span></div></div>';
      }).join('');
      $('[data-sum]').innerHTML = '<div><span>Subtotal (MRP)</span><span>' + cart.fmt(t2.subtotal) + '</span></div><div><span>Delivery</span><span>' + (t2.shipping ? cart.fmt(t2.shipping) : 'Confirmed on call') + '</span></div>';
      $('[data-total]').textContent = cart.fmt(t2.total);
      cart.clear();
    });
  } else cart.clear();
})();
