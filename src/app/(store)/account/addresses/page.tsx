import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { Suspense } from "react";
import { AccountShell } from "@/components/store/account/account-shell";
import { AddressBook } from "@/components/store/account/forms";
import { commerce } from "@/lib/repositories";
import { pageMetadata } from "@/lib/seo";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { AccountFallback, requireCustomerPage } from "../_shared";

export const metadata: Metadata = pageMetadata({ title: "Addresses", description: "Your delivery addresses.", path: "/account/addresses", noIndex: true });

async function Content() {
  const c = await requireCustomerPage("/account/addresses");
  const [rows, cfg] = await Promise.all([db.select().from(s.customerAddresses).where(eq(s.customerAddresses.userId, c.id)).orderBy(desc(s.customerAddresses.isDefault)), commerce.load()]);
  const addresses = rows.map((a) => ({ id: a.id, label: a.label, isDefault: a.isDefault, firstName: a.firstName, lastName: a.lastName, line1: a.line1, line2: a.line2 ?? "", city: a.city, region: a.region ?? "", postalCode: a.postalCode ?? "", countryCode: a.countryCode, phone: a.phone }));
  return <AccountShell title="Addresses" active="/account/addresses" firstName={c.firstName}><AddressBook addresses={addresses} countries={cfg.countries} defaultCountry="PK" /></AccountShell>;
}

export default function Page() { return <Suspense fallback={<AccountFallback />}><Content /></Suspense>; }
