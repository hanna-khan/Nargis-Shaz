/**
 * Customer-care and policy copy. Drafted for design development — the business must have
 * these reviewed (consumer law in Pakistan, UK, EU and US) before launch.
 * Phase 2: move into Supabase-managed content.
 */

export interface PolicyDoc { slug: string; title: string; updated: string; intro: string; sections: { heading: string; body: string[] }[] }

export const policies: PolicyDoc[] = [
  {
    slug: "privacy", title: "Privacy policy", updated: "2026-11-01",
    intro: "This policy explains what personal information Nargis & Shaz collects when you visit our website or place an order, and how we use and protect it.",
    sections: [
      { heading: "Information we collect", body: ["Details you give us when you place an order or contact us: your name, email address, phone number, delivery address and order history.", "Payment details are entered directly with our payment partners and are never stored by Nargis & Shaz.", "Basic technical information such as your browser, device and pages visited, used to keep the site secure and working well."] },
      { heading: "How we use it", body: ["To process and deliver your orders, including courier confirmation for cash-on-delivery orders.", "To answer your questions and provide after-sales care.", "To send you our newsletter, only if you have subscribed. You can unsubscribe at any time from any email."] },
      { heading: "Sharing", body: ["We share only what is necessary with couriers, payment partners and service providers who help us run the store, under contracts that require them to protect your data. We never sell your personal information."] },
      { heading: "Your rights", body: ["You can ask us to access, correct or delete your personal information, or to stop marketing to you, by writing to care@nargisandshaz.com."] },
    ],
  },
  {
    slug: "terms", title: "Terms & conditions", updated: "2026-11-01",
    intro: "These terms apply to all orders placed on nargisandshaz.com. By placing an order you agree to them.",
    sections: [
      { heading: "Orders", body: ["An order is accepted when we confirm it by email (and, for cash-on-delivery orders in Pakistan, by phone). We may decline an order if an item is unavailable or a payment cannot be verified."] },
      { heading: "Prices", body: ["Prices are shown in the currency of your selected shipping region. Prices for Pakistan include GST; prices for the UK and Europe include VAT and import duties. For other destinations, import duties and local taxes may be charged by the carrier on delivery."] },
      { heading: "Made-to-order pieces", body: ["Festive and bridal sets marked ‘made to order’ or ‘made to measure’ are produced specifically for you. Production begins once measurements are confirmed and these pieces cannot be cancelled after production has started."] },
      { heading: "Liability", body: ["Nothing in these terms limits your statutory rights as a consumer."] },
    ],
  },
  {
    slug: "shipping", title: "Shipping policy", updated: "2026-11-01",
    intro: "We deliver across Pakistan and to the UK, Europe, North America, the Gulf and selected countries worldwide.",
    sections: [
      { heading: "Pakistan", body: ["Standard delivery in 2–4 working days, complimentary on orders over Rs 10,000 (otherwise Rs 250).", "Express delivery in 1–2 working days to Karachi, Lahore and Islamabad (Rs 600).", "Cash on delivery is available nationwide. Our team will call to confirm your order before dispatch."] },
      { heading: "United Kingdom & Europe", body: ["Tracked delivery in 5–9 working days, with duties and taxes paid — nothing further to pay on arrival. Express options are offered at checkout."] },
      { heading: "United States & rest of world", body: ["Tracked delivery in 6–12 working days. Import duties and local taxes may be collected by the carrier on delivery."] },
      { heading: "Made-to-order pieces", body: ["Festive and bridal sets are dispatched once complete, typically 4–10 weeks after measurements are confirmed."] },
    ],
  },
  {
    slug: "returns", title: "Return policy", updated: "2026-11-01",
    intro: "If something isn't quite right, you can return or exchange unworn pieces within 30 days of delivery.",
    sections: [
      { heading: "How to return", body: ["Email care@nargisandshaz.com with your order number. We'll send return instructions and, within Pakistan, arrange a free collection.", "Pieces must be unworn, unwashed and returned with their original tags."] },
      { heading: "Refunds", body: ["Refunds are made to your original payment method within 10 working days of your return arriving with us. Cash-on-delivery orders are refunded by bank transfer."] },
      { heading: "Exceptions", body: ["Made-to-order and made-to-measure pieces cannot be returned, but we offer complimentary alterations within 30 days of delivery."] },
    ],
  },
];

export const faqs: { q: string; a: string }[] = [
  { q: "How do I find my size?", a: "Each product page has a size guide with UK, EU and US conversions and body measurements. Our team is happy to advise — email us with your usual size and the piece you're considering." },
  { q: "Can I pay cash on delivery?", a: "Yes, within Pakistan. Our team will call to confirm your order before it is dispatched." },
  { q: "Do you ship internationally?", a: "Yes — to the UK, Europe, North America, the Gulf and selected countries worldwide. Prices are shown in your currency once you choose your shipping region." },
  { q: "How long do festive and bridal sets take?", a: "Made-to-order sets are typically ready in 4–6 weeks and bridal sets in 8–10 weeks. We'll confirm timings when we confirm your measurements." },
  { q: "Can I book a styling appointment?", a: "Yes. Appointments at our Lahore atelier are complimentary — email care@nargisandshaz.com to book." },
];
