# OnyxAura website: handover

Updated 3 November 2026, at launch.

## What is live
- The full site: Home, Collection and four product pages, Gold, The Source, The Craft, Partnerships, About, Journal (five essays), Private Enquiry, Privacy, Terms.
- Real product images and MRPs for Incline (₹399), Black Water (glass ₹999, can ₹299, box of six ₹1,499) and Himalayan (₹125). Coconut is listed as coming soon.
- The Gold bottle in 3D, modelled from the concept sheet, with views, take-apart, dimensions and the etched number.
- Orders are taken as requests: the team calls the buyer to confirm and takes payment then.
- A Home link in the header on every screen, and drawn rows in the phone menu.

## To do soon
1. **Receive orders and enquiries by email.** Create a free Resend account, verify onyxaura.in, and add `RESEND_API_KEY` (and `FROM_EMAIL`) in Vercel, then redeploy. Until then, buyers and enquirers are asked to send their details by email, which works but adds a step.
2. **Point onyxaura.in at Vercel.** In the Vercel project, add the domain, then add the DNS records Vercel shows at the domain's registrar.
3. **Approve the founder statement** on the About page with Kunal (it was written from his answers to the website form).
4. **Payments online, when wanted.** Choose a gateway (Razorpay, Cashfree or PayU), add its branch in `api/_gateway.js`, set `PAYMENT_GATEWAY`, and set `paymentsConnected` to `true` in `assets/catalogue.json`.

## Worth adding later
- Photographs: the source, the plant (the client has some), the founder, and finished Gold bottles. Swap them in where the site now uses drawings and renders.
- A Coconut can image and its MRP, then remove `"status": "coming"` from its entry in `assets/catalogue.json` and rebuild.
- Smaller hero and source videos (720p and WebM) for phones.
- Social handles in the footer once they exist, and a public phone or WhatsApp number once it is bought.

## Resume prompt
> The OnyxAura website is in `onyxaura-site/onyxaura-site`. Read `README.md`, then `HANDOVER.md`. It is a static site with a Node build (`node scripts/build.js`), a local server that also runs the API (`node scripts/dev.js`), and deploys to Vercel from GitHub. The shop reads `assets/catalogue.json`; the Gold bottle is `assets/gold-bottle.js`. House rules: black and ivory, gold used like jewellery, sharp corners, no blue, no health claims. Rebuild, run `node scripts/check-seo.js` on each page you touched, and check phone and desktop widths before calling it done.
