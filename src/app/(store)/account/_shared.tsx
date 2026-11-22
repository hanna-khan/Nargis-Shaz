import { redirect } from "next/navigation";
import { getCustomer, type CustomerSession } from "@/server/auth/session";

/** Resolves the signed-in customer or redirects to sign-in (call inside <Suspense>). */
export async function requireCustomerPage(path: string): Promise<CustomerSession> {
  const c = await getCustomer();
  if (!c) redirect(`/account/login?next=${encodeURIComponent(path)}`);
  return c;
}

export const AccountFallback = () => <div className="min-h-[70vh]" aria-busy="true" />;
