import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Suspense } from "react";
import { CheckoutView, type SavedAddress } from "@/components/store/checkout/checkout-view";
import { content } from "@/lib/repositories";
import { pageMetadata } from "@/lib/seo";
import { getCustomer } from "@/server/auth/session";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";

export const metadata: Metadata = pageMetadata({ title: "Checkout", description: "Secure checkout.", path: "/checkout", noIndex: true });

async function Content() {
  const [customer, settings] = await Promise.all([getCustomer(), content.settings()]);
  const addresses: SavedAddress[] = customer
    ? (await db.select().from(s.customerAddresses).where(eq(s.customerAddresses.userId, customer.id)).orderBy(desc(s.customerAddresses.isDefault))).map((a) => ({
        id: a.id, label: a.label, isDefault: a.isDefault, firstName: a.firstName, lastName: a.lastName, line1: a.line1, line2: a.line2 ?? "", city: a.city, region: a.region ?? "", postalCode: a.postalCode ?? "", countryCode: a.countryCode, phone: a.phone,
      }))
    : [];
  return <CheckoutView email={customer?.email ?? null} addresses={addresses} guestAllowed={settings.checkout.guestCheckout} />;
}

export default function CheckoutPage() {
  return <Suspense fallback={<div className="min-h-screen" aria-busy="true" />}><Content /></Suspense>;
}
