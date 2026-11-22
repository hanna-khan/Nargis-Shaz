import Link from "next/link";
import { Suspense } from "react";
import { AdminForm, Field } from "@/components/admin/client";
import { staffResetAction } from "../../_actions/auth";

export const metadata = { title: "Choose a password" };

async function Content({ searchParams }: { searchParams: PageProps<"/admin/reset-password">["searchParams"] }) {
  const { token, invite } = await searchParams;
  if (typeof token !== "string" || token.length < 20) return <p className="text-[14px]">This link is incomplete. <Link href="/admin/forgot-password" className="underline">Request a new one</Link>.</p>;
  return (
    <>
      <h1 className="mb-2 font-serif text-[26px]">{invite ? "Welcome to Studio" : "Choose a new password"}</h1>
      <p className="mb-6 text-[13px] text-charcoal/60">{invite ? "Set a password to activate your account." : "Your other sessions will be signed out."}</p>
      <AdminForm action={staffResetAction} submit={invite ? "Activate account" : "Set password"}>
        <input type="hidden" name="token" value={token} />
        <Field label="New password" name="password" type="password" autoComplete="new-password" hint="At least 10 characters, with letters and numbers or symbols." required />
        <Field label="Confirm password" name="confirm" type="password" autoComplete="new-password" required />
      </AdminForm>
    </>
  );
}

export default function StaffReset(props: PageProps<"/admin/reset-password">) {
  return <Suspense><Content searchParams={props.searchParams} /></Suspense>;
}
