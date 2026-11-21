import type { Metadata } from "next";
import { CheckoutView } from "@/components/store/checkout/checkout-view";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({ title: "Checkout", description: "Secure checkout.", path: "/checkout", noIndex: true });

export default function CheckoutPage() {
  return <CheckoutView />;
}
