# ONYXAURA website

Static site with two serverless functions (`api/`), deployed on Vercel. No framework, no build step on the server: what is in the repository is what is served.

## Build and checks
```
node scripts/build.js              # builds the shop pages, injects the shared header/footer and the journal illustrations
node scripts/check-seo.js source.html journal.html   # title/description length, one h1, JSON-LD, broken internal links
node scripts/dev.js                # local server on :5175 that also runs /api/* (plain `serve` cannot run the checkout)
```
The header (mega-menu) and footer live once, in `partials/`. The build writes them between the `<!--HEADER-->` / `<!--FOOTER-->` markers of every page, marks the current page from `<body data-page="...">`, inlines `partials/art/*.svg` where a page has `<!--ART:name--><!--/ART-->`, and fills essay reading times. Run the build after editing a partial, the catalogue or a page that uses them, and commit the result.

## Pages
| Page | Notes |
|---|---|
| `/` | Home: hero film, the source, the Himalaya in numbers (sourced), the craft, the collection with MRPs, Gold in 3D |
| `/collection`, `/collection/<incline\|black\|himalayan\|coconut>` | The shop, generated from `assets/catalogue.json` |
| `/checkout`, `/order` | Order request and confirmation (both `noindex`) |
| `/gold` | Gold: the 3D bottle, the edition, the vessel inspector, the papers, how to receive one |
| `/source` | Regions, the map of sources, snowmelt and rock, the keeper's day, the proof, field notes and sources |
| `/craft` | The seven-station line, the clean room, the vessels, the seal, the batch code, what we test and how often |
| `/partnerships` | Aviation, hospitality, corporate, private label, working with us, brochures. Supports `?for=BrandName` |
| `/about` | The founder, what sets it apart, the road, the company |
| `/journal`, `/journal/<essay>` | Five essays; Essay V (Where the Water Begins) cites its sources |
| `/contact` | Private Enquiry; `?seg=gold` opens the Gold tab, `?about=coconut` pre-fills a note |
| `/privacy`, `/terms` | Plain-language privacy and terms of sale |

## The shop
- **`assets/catalogue.json` is the single source of truth**: products, copy, sources, specs, formats, packs and MRPs. The build bakes it into the pages, the browser reads it for the cart, and `api/checkout.js` re-prices every order from it (it never trusts a price from the browser). Edit it, then run the build. Do not edit `collection.html` or `collection/*.html` by hand.
- Prices are the printed MRPs from the Product Master Dossier (3 November 2026): Incline 700 ml glass ₹399; Black Water swing-top glass ₹999, 500 ml clear can ₹299, box of six ₹1,499; Himalayan 500 ml clear can ₹125. A pack may carry its own `price` (the box of six); otherwise it costs the unit price times its units. Products with `"status": "coming"` (Coconut) are shown but cannot be ordered.
- **Images**: `assets/products/<product>-<view>.jpg` are crops of the client's renders (full, plus three details, a 240 px thumbnail for the cart, and a 1200 x 630 share image). The Black Water box of six has its own gallery, shown when that pack is chosen.
- **Ordering without a payment gateway**: checkout collects contact and delivery details and `POST /api/checkout` records the order as a request (`mode: request`). The team calls to confirm the order, the delivery date and any delivery charge, and takes payment then. The order is emailed to the team through Resend when `RESEND_API_KEY` is set; without it, the order page asks the buyer to send the order by email in one tap (a prefilled `mailto:` to hello@onyxaura.in).
- **To connect a payment gateway** later, add a branch in `api/_gateway.js` (it explains the three steps), set `PAYMENT_GATEWAY`, and set `paymentsConnected` to `true` in the catalogue. Before taking money online also add a datastore for orders and the gateway's webhook.

## Gold in 3D
- `assets/gold-bottle.js` (an ES module, three.js r170 from jsDelivr) models the bottle from the concept sheet: 260 mm tall, 76 mm across the frame, 42 mm cap. Five parts: brushed gold cap with the engraved mark, crystal-cut ring, silicone seal, fluted glass body with water, and a frame of sixteen bars with the name on the front bar, a crossed lattice and a cross beneath. The bottle's number is etched under the glass.
- `mount(el, opts)` returns `{ view(front|side|top|base), explode(bool), dims(bool), light(0-100), auto(bool), number(n), settle() }`. The Gold page uses it twice (hero, inspector); the home page once.
- Until the first frame is drawn, the page shows `assets/gold/gold-render.jpg` (the render from the concept sheet). The full concept sheet is `assets/gold/gold-concept.jpg`.

## Enquiries and orders by email
Set in Vercel > Settings > Environment Variables, then redeploy:
- `RESEND_API_KEY` (from resend.com; without it the forms fall back to the visitor's email app, addressed to hello@onyxaura.in)
- `TO_EMAIL` (optional, default hello@onyxaura.in)
- `FROM_EMAIL` (optional; an address on a Resend-verified domain, e.g. website@onyxaura.in)

## Pitch links
Add `?for=BrandName` to any URL, e.g. `onyxaura.in/partnerships?for=Taj`. The name is shown in a banner and carried through internal links and the enquiry form.

## Brochures
Four PDFs on Google Drive, linked from Partnerships. IDs: Aviation `1a92tqa709yP8-LqWDKe9wRSQIh2QXDis`, Hospitality `1diGaU7V5CW3vPWaDKd58jhOUvHO3ZGLN`, Corporate `1TTJqQ65QczhIpKQdH6yO3rhHUwwENVqe`, Private Label `1m-E_tHvNI8tZ2HbKvYR2ODUrXZQ6rGyz`. The files must stay shared as "anyone with the link".
