export const site = {
  name: "Nargis & Shaz",
  shortName: "Nargis & Shaz",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.nargisandshaz.com",
  description:
    "Considered women's clothing for work, weekends and celebrations. Workwear, everyday essentials, evening and festive collections, delivered across Pakistan and worldwide.",
  locale: "en_PK",
  twitter: "@nargisandshaz",
  instagram: "https://www.instagram.com/nargisandshaz",
  email: "care@nargisandshaz.com",
  phone: "+92 42 111 627 742",
  address: { street: "21 MM Alam Road, Gulberg III", city: "Lahore", region: "Punjab", postalCode: "54660", country: "PK" },
  copyrightYear: 2026,
} as const;

export const OCCASION_ROUTES = {
  workwear: "/workwear",
  everyday: "/everyday",
  evening: "/evening",
  festive: "/festive",
} as const;
