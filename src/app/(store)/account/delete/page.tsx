import type { Metadata } from "next";
import { Suspense } from "react";
import { AccountShell } from "@/components/store/account/account-shell";
import { DeleteForm } from "@/components/store/account/forms";
import { pageMetadata } from "@/lib/seo";
import { AccountFallback, requireCustomerPage } from "../_shared";

export const metadata: Metadata = pageMetadata({ title: "Delete account", description: "Request account deletion.", path: "/account/delete", noIndex: true });

async function Content() {
  const c = await requireCustomerPage("/account/delete");
  return (
    <AccountShell title="Delete your account" active="/account/delete" firstName={c.firstName}>
      <p className="mb-8 max-w-[560px] text-[14px] text-taupe">We&apos;ll remove your profile, saved addresses and wishlist. Records of past orders are kept for as long as tax and consumer law require, without your marketing data. Our team confirms each request by email.</p>
      <DeleteForm />
    </AccountShell>
  );
}

export default function Page() { return <Suspense fallback={<AccountFallback />}><Content /></Suspense>; }
