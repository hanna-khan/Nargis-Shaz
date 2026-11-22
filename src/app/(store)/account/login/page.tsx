import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthCard } from "@/components/store/account/account-shell";
import { LoginForm } from "@/components/store/account/forms";
import { pageMetadata } from "@/lib/seo";
import { getCustomer } from "@/server/auth/session";

export const metadata: Metadata = pageMetadata({ title: "Sign in", description: "Sign in to your Nargis & Shaz account.", path: "/account/login", noIndex: true });

async function Content({ searchParams }: { searchParams: PageProps<"/account/login">["searchParams"] }) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : "/account";
  if (await getCustomer()) redirect(next);
  return <LoginForm next={next} notice={sp.reset ? "Your password has been changed. Please sign in." : undefined} />;
}

export default function LoginPage(props: PageProps<"/account/login">) {
  return <AuthCard eyebrow="Welcome back" title="Sign in"><Suspense><Content searchParams={props.searchParams} /></Suspense></AuthCard>;
}
