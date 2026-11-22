"use server";

import { redirect } from "next/navigation";
import { isProduction, siteUrl } from "@/server/lib/core";
import { handleWebhook } from "@/server/payments/service";
import { testGateway } from "@/server/payments/providers";

const sameSite = (u: string) => { try { return new URL(u).origin === new URL(siteUrl()).origin ? u : siteUrl("/cart"); } catch { return siteUrl("/cart"); } };

export async function settleTestPayment(form: FormData) {
  if (isProduction() || process.env.PAYMENTS_TEST_PROVIDER !== "1") throw new Error("Test gateway disabled");
  const ref = String(form.get("ref"));
  const outcome = form.get("outcome") === "paid" ? "paid" : "failed";
  const body = testGateway.settle(ref, outcome);
  // Deliver the signed webhook exactly as the provider would (server-to-server).
  await handleWebhook("test", body, new Headers({ "x-test-signature": testGateway.signWebhook(body) }));
  redirect(sameSite(String(form.get(outcome === "paid" ? "return" : "cancel"))));
}
