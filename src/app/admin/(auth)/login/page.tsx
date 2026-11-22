import Link from "next/link";
import { Suspense } from "react";
import { AdminForm, Field } from "@/components/admin/client";
import { staffLoginAction } from "../../_actions/auth";

export const metadata = { title: "Sign in" };

async function Notice({ searchParams }: { searchParams: PageProps<"/admin/login">["searchParams"] }) {
  const sp = await searchParams;
  return sp.reset ? <p role="status" className="mb-4 rounded-[3px] bg-[#e3eadc] px-3.5 py-2.5 text-[13px] text-success">Password updated. Please sign in.</p> : null;
}

export default function StaffLogin(props: PageProps<"/admin/login">) {
  return (
    <>
      <h1 className="mb-6 font-serif text-[26px]">Sign in</h1>
      <Suspense><Notice searchParams={props.searchParams} /></Suspense>
      <AdminForm action={staffLoginAction} submit="Sign in">
        <Field label="Email" name="email" type="email" autoComplete="username" required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      </AdminForm>
      <Link href="/admin/forgot-password" className="mt-5 inline-block text-[12.5px] text-charcoal/60 underline underline-offset-4">Forgotten your password?</Link>
    </>
  );
}
