// Vercel serverless function: POST /api/enquiry
// Env: RESEND_API_KEY (required), TO_EMAIL (default hello@onyxaura.in), FROM_EMAIL (default onboarding@resend.dev)
const esc = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  const key = process.env.RESEND_API_KEY;
  if (!key) return res.status(503).json({ ok: false, error: 'not_configured' });

  let d = req.body;
  if (typeof d === 'string') { try { d = JSON.parse(d); } catch (e) { d = null; } }
  if (!d || typeof d !== 'object') return res.status(400).json({ ok: false });
  if (d.website) return res.status(200).json({ ok: true }); // honeypot
  const em = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!d.name || !d.email || !em.test(String(d.email))) return res.status(400).json({ ok: false });

  const entries = Object.entries(d).slice(0, 30)
    .map(([k, v]) => [String(k).slice(0, 40), String(v).slice(0, 3000)]);
  const rows = entries.map(([k, v]) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#666;vertical-align:top">${esc(k)}</td><td style="padding:6px 0">${esc(v)}</td></tr>`).join('');
  const html = `<h2 style="font-family:Georgia,serif">New ONYXAURA enquiry — ${esc(d.segment || '')}</h2><table style="font-family:Arial,sans-serif;font-size:14px">${rows}</table>`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'ONYXAURA Website <' + (process.env.FROM_EMAIL || 'onboarding@resend.dev') + '>',
        to: [process.env.TO_EMAIL || 'hello@onyxaura.in'],
        reply_to: String(d.email),
        subject: 'Enquiry — ' + String(d.segment || 'general') + ' — ' + String(d.name).slice(0, 80) + (d.invitedAs ? ' (via ' + String(d.invitedAs).slice(0, 60) + ' link)' : ''),
        html
      })
    });
    if (!r.ok) return res.status(502).json({ ok: false });
    return res.status(200).json({ ok: true });
  } catch (e) { return res.status(502).json({ ok: false }); }
};
