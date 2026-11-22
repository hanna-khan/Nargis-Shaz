import type { Metadata } from "next";
import { TrackForm } from "@/components/store/account/forms";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Track your order", description: "Track a Nargis & Shaz order with your order number and email.", path: "/track-order" });

export default function TrackOrderPage() {
  return (
    <section className="gutter mx-auto max-w-[1100px] py-[clamp(56px,8vw,112px)]">
      <p className="eyebrow text-bronze">Client care</p>
      <h1 className="display mt-4 mb-4 text-[clamp(34px,4vw,56px)]">Track your <em>order</em></h1>
      <p className="mb-10 max-w-[520px] text-[14px] text-taupe">Enter the order number from your confirmation email and the email address you used at checkout. Signed-in customers can see every order in their account.</p>
      <TrackForm />
    </section>
  );
}
