import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountShell } from "@/components/store/account/account-shell";
import { PasswordForm } from "@/components/store/account/forms";
import { pageMetadata } from "@/lib/seo";
import { AccountFallback, requireCustomerPage } from "../_shared";

export const metadata: Metadata = pageMetadata({ title: "Password", description: "Change your password.", path: "/account/password", noIndex: true });

async function Content() {
  const c = await requireCustomerPage("/account/password");
  return <AccountShell title="Password" active="/account/password" firstName={c.firstName}><PasswordForm /></AccountShell>;
}

export default function Page() { return <Suspense fallback={<AccountFallback />}><Content /></Suspense>; }
