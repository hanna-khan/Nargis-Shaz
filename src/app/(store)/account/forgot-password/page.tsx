import type { Metadata } from "next";
import { AuthCard } from "@/components/store/account/account-shell";
import { ForgotForm } from "@/components/store/account/forms";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Reset your password", description: "Reset your password.", path: "/account/forgot-password", noIndex: true });

export default function ForgotPage() {
  return (
    <AuthCard eyebrow="Account" title="Forgotten password">
      <p className="mb-8 text-center text-[14px] text-taupe">Enter your email and we&apos;ll send you a link to choose a new password.</p>
      <ForgotForm />
    </AuthCard>
  );
}
