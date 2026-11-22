import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { isProduction } from "@/server/lib/core";
import { settleTestPayment } from "./actions";

export const metadata: Metadata = { title: "Test payment gateway", robots: { index: false, follow: false } };

/** Development-only stand-in for a hosted payment page. Disabled in production. */
async function Content({ searchParams }: PageProps<"/checkout/test-gateway">) {
  if (isProduction() || process.env.PAYMENTS_TEST_PROVIDER !== "1") notFound();
  const sp = await searchParams;
  const ref = String(sp.ref ?? "");
  return (
    <section className="gutter mx-auto max-w-[560px] py-28 text-center">
      <p className="eyebrow text-bronze">Development test gateway</p>
      <h1 className="display mt-4 text-[40px]">Simulated payment</h1>
      <p className="mt-4 text-[14px] text-taupe">No real card is charged. Choose an outcome — the gateway sends a signed webhook, exactly like a real provider.</p>
      <form action={settleTestPayment} className="mt-10 flex justify-center gap-4">
        <input type="hidden" name="ref" value={ref} />
        <input type="hidden" name="return" value={String(sp.return ?? "")} />
        <input type="hidden" name="cancel" value={String(sp.cancel ?? "")} />
        <button name="outcome" value="paid" className="min-h-12 bg-chocolate px-8 text-[11px] tracking-[0.22em] text-offwhite uppercase">Approve payment</button>
        <button name="outcome" value="failed" className="min-h-12 border border-chocolate px-8 text-[11px] tracking-[0.22em] uppercase">Decline payment</button>
      </form>
    </section>
  );
}

export default function Page(props: PageProps<"/checkout/test-gateway">) {
  return <Suspense><Content {...props} /></Suspense>;
}
