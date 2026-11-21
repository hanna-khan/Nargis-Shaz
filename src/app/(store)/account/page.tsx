import type { Metadata } from "next";
import Link from "next/link";
import { Monogram } from "@/components/brand/logo";
import { site } from "@/config/site";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Your Account", description: "Your Nargis & Shaz account.", path: "/account", noIndex: true });

/** Customer accounts arrive with authentication (Phase 2). Until then this page only links to features that work. */
export default function AccountPage() {
  return (
    <section className="gutter mx-auto max-w-[640px] py-28 text-center">
      <Monogram className="mx-auto h-14 w-14 text-bronze" />
      <h1 className="display mt-8 text-[clamp(34px,4vw,52px)]">Your <em>account</em></h1>
      <p className="mt-4 text-taupe">Customer accounts with saved addresses and order history will be available soon. In the meantime, your bag and wishlist are saved on this device, and our team can help with any order.</p>
      <div className="mt-10 grid gap-3 sm:grid-cols-3">
        <Link href="/wishlist" className="flex min-h-12 items-center justify-center border border-chocolate text-[11px] tracking-[0.22em] uppercase hover:bg-chocolate hover:text-offwhite">Wishlist</Link>
        <Link href="/cart" className="flex min-h-12 items-center justify-center border border-chocolate text-[11px] tracking-[0.22em] uppercase hover:bg-chocolate hover:text-offwhite">Your bag</Link>
        <Link href="/customer-care#track" className="flex min-h-12 items-center justify-center border border-chocolate text-[11px] tracking-[0.22em] uppercase hover:bg-chocolate hover:text-offwhite">Track an order</Link>
      </div>
      <p className="mt-8 text-[13px] text-taupe">Questions? <a href={`mailto:${site.email}`} className="underline underline-offset-4">{site.email}</a></p>
    </section>
  );
}
