import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/store/account/account-shell";
import { RegisterForm } from "@/components/store/account/forms";
import { pageMetadata } from "@/lib/seo";
import { getCustomer } from "@/server/auth/session";

export const metadata: Metadata = pageMetadata({ title: "Create an account", description: "Create a Nargis & Shaz account.", path: "/account/register", noIndex: true });

async function Content({ searchParams }: { searchParams: PageProps<"/account/register">["searchParams"] }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/account";
  if (await getCustomer()) redirect(next);
  return <RegisterForm next={next} />;
}

export default function RegisterPage(props: PageProps<"/account/register">) {
  return <AuthCard eyebrow="Join the house" title="Create an account"><Suspense><Content searchParams={props.searchParams} /></Suspense></AuthCard>;
}
