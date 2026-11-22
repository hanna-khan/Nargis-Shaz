import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthCard } from "@/components/store/account/account-shell";
import { pageMetadata } from "@/lib/seo";
import { confirmSubscription } from "@/server/marketing";

export const metadata: Metadata = pageMetadata({ title: "Newsletter", description: "Confirm your subscription.", path: "/newsletter/confirm", noIndex: true });

async function Content({ searchParams }: { searchParams: PageProps<"/newsletter/confirm">["searchParams"] }) {
  const { token } = await searchParams;
  const ok = typeof token === "string" && token.length >= 20 ? await confirmSubscription(token) : false;
  return <p className="text-center text-[15px]">{ok ? "You're subscribed. Thank you for joining us." : "This link has already been used or has expired."} <Link href="/" className="underline">Return to the shop</Link>.</p>;
}

export default function Page(props: PageProps<"/newsletter/confirm">) {
  return <AuthCard eyebrow="The letter" title="Subscription"><Suspense><Content searchParams={props.searchParams} /></Suspense></AuthCard>;
}
