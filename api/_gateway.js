// Payment gateway adapter. api/checkout.js calls createPayment(); the browser is then sent to the URL it returns.
//
// Until a gateway is connected (PAYMENT_GATEWAY unset) this runs in REQUEST mode: the order is recorded and emailed to
// the team, the buyer lands on /order?s=request, and the team calls to confirm and take payment. To connect Razorpay, PayU, Cashfree or similar, add a branch below that
//   1. creates the gateway's order or payment link from `order` (order.id, order.totals.total in rupees, order.customer),
//   2. sets the gateway's return URL to origin + '/order?o=' + order.id,
//   3. returns { mode: 'live', redirectUrl } pointing at the gateway's hosted payment page.
// Card, UPI and bank details are only ever entered on that hosted page; this site never receives them.
// Before going live also add: a datastore for orders, and a webhook that marks an order paid (the return URL alone
// proves nothing, anyone can type it).
exports.createPayment = async function (order, origin) {
  const gateway = String(process.env.PAYMENT_GATEWAY || '').toLowerCase();
  if (!gateway) return { mode: 'request', redirectUrl: '/order?o=' + encodeURIComponent(order.id) + '&s=request' };
  const e = new Error('gateway_not_implemented: ' + gateway);
  e.code = 'gateway_not_implemented';
  throw e;
};
