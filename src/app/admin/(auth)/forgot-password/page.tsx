import Link from "next/link";
import { AdminForm, Field } from "@/components/admin/client";
import { staffForgotAction } from "../../_actions/auth";

export const metadata = { title: "Reset password" };

export default function StaffForgot() {
  return (
    <>
      <h1 className="mb-6 font-serif text-[26px]">Reset password</h1>
      <AdminForm action={staffForgotAction} submit="Send reset link" resetOnSuccess>
        <Field label="Email" name="email" type="email" autoComplete="username" required />
      </AdminForm>
      <Link href="/admin/login" className="mt-5 inline-block text-[12.5px] text-charcoal/60 underline underline-offset-4">Back to sign in</Link>
    </>
  );
}
