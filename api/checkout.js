// Vercel serverless function: POST /api/checkout
// Validates the buyer's details, prices the order from assets/catalogue.json, records it (emailed to the team),
// asks the payment gateway adapter for a hosted payment URL and returns it for the browser to redirect to.
// Env: RESEND_API_KEY (optional, order notification), TO_EMAIL, FROM_EMAIL (same as /api/enquiry), PAYMENT_GATEWAY (see _gateway.js)
const { quote } = require('./_pricing');
const { createPayment } = require('./_gateway');
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const STATES = require('../assets/in-states.json');

const clean = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]+/g, ' ').trim().slice(0, max);

function validate(d) {
  const e = {}, c = d.customer || {}, a = d.address || {};
  const v = {
    name: clean(c.name, 80), email: clean(c.email, 120).toLowerCase(),
    phone: clean(c.phone, 20).replace(/[\s\-()]/g, '').replace(/^(\+91|91|0)(?=\d{10}$)/, ''),
    line1: clean(a.line1, 120), line2: clean(a.line2, 120), city: clean(a.city, 60), state: clean(a.state, 60), pin: clean(a.pin, 10).replace(/\s/g, ''),
    note: clean(d.note, 300), gstin: clean(d.gstin, 15).toUpperCase()
  };
  if (v.name.length < 2) e.name = 'Please add your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email)) e.email = 'Please add a valid email address.';
  if (!/^[6-9]\d{9}$/.test(v.phone)) e.phone = 'Please add a 10-digit mobile number.';
  if (v.line1.length < 5) e.line1 = 'Please add the delivery address.';
  if (v.city.length < 2) e.city = 'Please add the city.';
  if (STATES.indexOf(v.state) < 0) e.state = 'Please choose the state.';
  if (!/^[1-9]\d{5}$/.test(v.pin)) e.pin = 'Please add a 6-digit PIN code.';
  if (v.gstin && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(v.gstin)) e.gstin = 'That GSTIN does not look right.';
  if (d.terms !== true) e.terms = 'Please confirm to continue.';
  return { e, v };
}

const orderId = () => {
  const t = new Date(), p = n => String(n).padStart(2, '0');
  const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let r = '';
  for (let i = 0; i < 5; i++) r += a[Math.floor(Math.random() * a.length)];
  return 'OA-' + String(t.getUTCFullYear()).slice(2) + p(t.getUTCMonth() + 1) + p(t.getUTCDate()) + '-' + r;
};

async function notify(order) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return false;
  const inr = n => '₹' + n.toLocaleString('en-IN');
  const c = order.customer, a = order.address;
  const rows = order.totals.lines.map(l => `<tr><td style="padding:4px 14px 4px 0">${esc(l.name)}</td><td style="padding:4px 14px 4px 0">× ${l.qty}</td><td align="right">${inr(l.amount)}</td></tr>`).join('');
  const html = `<h2 style="font-family:Georgia,serif">New ONYXAURA order ${esc(order.id)} (${esc(order.mode)})</h2>
<table style="font-family:Arial,sans-serif;font-size:14px">${rows}
<tr><td colspan="2" style="padding-top:10px">Delivery</td><td align="right" style="padding-top:10px">${order.totals.shipping ? inr(order.totals.shipping) : 'To confirm on the call'}</td></tr>
<tr><td colspan="2"><b>Total</b></td><td align="right"><b>${inr(order.totals.total)}</b></td></tr></table>
<p style="font-family:Arial,sans-serif;font-size:14px;line-height:1.6">${esc(c.name)}<br>${esc(c.email)} · ${esc(c.phone)}<br>${esc(a.line1)}${a.line2 ? ', ' + esc(a.line2) : ''}<br>${esc(a.city)}, ${esc(a.state)} ${esc(a.pin)}${order.gstin ? '<br>GSTIN ' + esc(order.gstin) : ''}${order.note ? '<br><i>' + esc(order.note) + '</i>' : ''}</p>
<p style="font-family:Arial,sans-serif;font-size:12px;color:#777">${order.mode === 'request' ? 'Order request: no payment was taken. Call the customer to confirm the order, the delivery date and any delivery charge, and take payment.' : 'Awaiting payment confirmation from the gateway.'}</p>`;
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: 'ONYXAURA Website <' + (process.env.FROM_EMAIL || 'onboarding@resend.dev') + '>', to: [process.env.TO_EMAIL || 'hello@onyxaura.in'],
        reply_to: c.email, subject: 'Order ' + order.id + ' — ' + inr(order.totals.total) + ' — ' + c.name.slice(0, 60), html })
    });
    return r.ok;
  } catch (err) { return false; }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  let d = req.body;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (err) { d = null; } }
  if (!d || typeof d !== 'object') return res.status(400).json({ ok: false, error: 'bad_request' });
  if (d.website) return res.status(200).json({ ok: true }); // honeypot

  const totals = quote(d.items);
  if (!totals) return res.status(400).json({ ok: false, error: 'bad_cart' });
  const { e, v } = validate(d);
  if (Object.keys(e).length) return res.status(400).json({ ok: false, error: 'invalid', errors: e });

  const origin = (req.headers['x-forwarded-proto'] || 'https') + '://' + req.headers.host;
  const order = {
    id: orderId(), totals, note: v.note, gstin: v.gstin,
    customer: { name: v.name, email: v.email, phone: v.phone },
    address: { line1: v.line1, line2: v.line2, city: v.city, state: v.state, pin: v.pin }
  };
  let pay;
  try { pay = await createPayment(order, origin); }
  catch (err) { return res.status(err && err.code === 'gateway_not_implemented' ? 501 : 502).json({ ok: false, error: 'gateway' }); }
  order.mode = pay.mode;
  const notified = await notify(order);
  return res.status(200).json({ ok: true, orderId: order.id, mode: pay.mode, redirectUrl: pay.redirectUrl, totals, notified });
};
