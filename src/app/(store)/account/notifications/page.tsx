import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { AccountShell } from "@/components/store/account/account-shell";
import { PrefsForm } from "@/components/store/account/forms";
import { pageMetadata } from "@/lib/seo";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { AccountFallback, requireCustomerPage } from "../_shared";

export const metadata: Metadata = pageMetadata({ title: "Notifications", description: "Email preferences.", path: "/account/notifications", noIndex: true });

async function Content() {
  const c = await requireCustomerPage("/account/notifications");
  const [p] = await db.select().from(s.customerProfiles).where(eq(s.customerProfiles.userId, c.id));
  const [sub] = await db.select({ status: s.newsletterSubscribers.status }).from(s.newsletterSubscribers).where(eq(s.newsletterSubscribers.email, c.email));
  return <AccountShell title="Notifications" active="/account/notifications" firstName={c.firstName}><PrefsForm newsletter={sub?.status === "subscribed" || sub?.status === "pending"} backInStock={p?.notificationPrefs.backInStock ?? true} /></AccountShell>;
}

export default function Page() { return <Suspense fallback={<AccountFallback />}><Content /></Suspense>; }
