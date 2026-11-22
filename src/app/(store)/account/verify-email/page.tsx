import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/store/account/account-shell";
import { pageMetadata } from "@/lib/seo";
import { verifyEmail } from "@/server/auth/accounts";

export const metadata: Metadata = pageMetadata({ title: "Confirm your email", description: "Confirm your email address.", path: "/account/verify-email", noIndex: true });

async function Content({ searchParams }: { searchParams: PageProps<"/account/verify-email">["searchParams"] }) {
  const { token } = await searchParams;
  let ok = false;
  if (typeof token === "string" && token.length >= 20) ok = await verifyEmail(token).then(() => true, () => false);
  return ok
    ? <p className="text-center text-[15px]">Thank you — your email address is confirmed. <Link href="/account" className="underline">Go to your account</Link>.</p>
    : <p className="text-center text-[15px]">This confirmation link is invalid or has expired. Sign in to your account to send a new one.</p>;
}

export default function VerifyPage(props: PageProps<"/account/verify-email">) {
  return <AuthCard eyebrow="Account" title="Email confirmation"><Suspense><Content searchParams={props.searchParams} /></Suspense></AuthCard>;
}
