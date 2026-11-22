"use server";

import { redirect } from "next/navigation";
import { loginStaff, logoutStaff, requestPasswordReset, resetPassword } from "@/server/auth/accounts";
import { AppError, toFailure, type ActionResult } from "@/server/lib/core";

export async function staffLoginAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await loginStaff(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
  } catch (e) {
    return toFailure(e);
  }
  redirect("/admin");
}

export async function staffLogoutAction() {
  await logoutStaff();
  redirect("/admin/login");
}

export async function staffForgotAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    await requestPasswordReset("staff", String(form.get("email") ?? ""));
    return { ok: true, message: "If this email belongs to an active Studio account, a reset link is on its way. It expires in 60 minutes." };
  } catch (e) {
    return toFailure(e);
  }
}

export async function staffResetAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  try {
    if (form.get("password") !== form.get("confirm")) throw new AppError("The passwords don't match.");
    const r = await resetPassword(String(form.get("token") ?? ""), String(form.get("password") ?? ""));
    if (r.subject !== "staff") throw new AppError("This link isn't for a Studio account.");
  } catch (e) {
    return toFailure(e);
  }
  redirect("/admin/login?reset=1");
}
