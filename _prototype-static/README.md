# Nargis & Shaz — storefront

Open `index.html` in a browser (no build step, works from file://). Pages: `index.html`, `shop.html` (filters via ?cat= / ?occ= / ?new=1), `product.html?id=...`, `story.html`.

## Where things live
- `css/style.css` — design system (palette tokens in `:root`, type, layout, motion)
- `js/data.js` — catalogue: products, colours, collections. Edit here.
- `js/art.js` — illustrated still-life placeholders (SVG) used wherever there is no photograph
- `js/silk.js` — the one WebGL moment (hero + story banner); falls back to a gradient
- `js/app.js` — header/mega menu, bag (localStorage), search, filters, reveal/parallax/tilt

## Adding real photography
Put images in `assets/img/` and add `photos:["assets/img/noor-1.jpg","assets/img/noor-2.jpg","assets/img/noor-3.jpg","assets/img/noor-4.jpg"]` to a product in `data.js`. For homepage tiles, replace the `data-art` div contents with an `<img>`. Aim for 4:5 portrait, warm natural light, one image per view.

Checkout is a demo stub (connect Shopify/Stripe/etc. in `app.js`, `#checkout`).
