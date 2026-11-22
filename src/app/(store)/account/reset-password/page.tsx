import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/store/account/account-shell";
import { ResetForm } from "@/components/store/account/forms";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Choose a new password", description: "Choose a new password.", path: "/account/reset-password", noIndex: true });

async function Content({ searchParams }: { searchParams: PageProps<"/account/reset-password">["searchParams"] }) {
  const { token } = await searchParams;
  if (typeof token !== "string" || token.length < 20) return <p className="text-center text-[14px]">This link is incomplete. <Link href="/account/forgot-password" className="underline">Request a new one</Link>.</p>;
  return <ResetForm token={token} />;
}

export default function ResetPage(props: PageProps<"/account/reset-password">) {
  return <AuthCard eyebrow="Account" title="Choose a new password"><Suspense><Content searchParams={props.searchParams} /></Suspense></AuthCard>;
}
