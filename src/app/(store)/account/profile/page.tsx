import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { Suspense } from "react";
import { AccountShell } from "@/components/store/account/account-shell";
import { ProfileForm } from "@/components/store/account/forms";
import { pageMetadata } from "@/lib/seo";
import { db } from "@/server/db";
import * as s from "@/server/db/schema";
import { AccountFallback, requireCustomerPage } from "../_shared";

export const metadata: Metadata = pageMetadata({ title: "Your details", description: "Your details.", path: "/account/profile", noIndex: true });

async function Content() {
  const c = await requireCustomerPage("/account/profile");
  const [u] = await db.select().from(s.users).where(eq(s.users.id, c.id));
  return <AccountShell title="Your details" active="/account/profile" firstName={c.firstName}><ProfileForm firstName={u.firstName} lastName={u.lastName} phone={u.phone ?? ""} email={u.email} /></AccountShell>;
}

export default function Page() { return <Suspense fallback={<AccountFallback />}><Content /></Suspense>; }
