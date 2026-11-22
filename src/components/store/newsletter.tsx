"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useTransition } from "react";
import { subscribeNewsletter } from "@/app/(store)/actions";
import { cn } from "@/lib/utils";
import { Reveal } from "@/components/ui/reveal";
import { Emph } from "@/components/ui/typography";

/** Shared sign-up form: inline validation, pending state, success/error messaging. */
export function NewsletterForm({ tone = "dark", id }: { tone?: "dark" | "light"; id: string }) {
  const [state, setState] = useState<{ status: "idle" | "done" | "error"; message?: string }>({ status: "idle" });
  const [pending, start] = useTransition();
  const light = tone === "light";
  return (
    <AnimatePresence mode="wait" initial={false}>
      {state.status === "done" ? (
        <motion.p key="done" role="status" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="font-serif text-[20px] italic">
          Thank you — please check your inbox to confirm your subscription.
        </motion.p>
      ) : (
        <motion.form
          key="form"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            start(async () => {
              const r = await subscribeNewsletter(data);
              setState(r.ok ? { status: "done" } : { status: "error", message: r.error });
            });
          }}
        >
          <div className={cn("flex border-b transition-colors", light ? "border-offwhite/50 focus-within:border-offwhite" : "border-chocolate/40 focus-within:border-chocolate", state.status === "error" && "border-danger")}>
            <label htmlFor={id} className="sr-only">Email address</label>
            <input
              id={id} name="email" type="email" autoComplete="email" placeholder="Email address" aria-invalid={state.status === "error"} aria-describedby={`${id}-msg`}
              onChange={() => state.status === "error" && setState({ status: "idle" })}
              className={cn("min-w-0 flex-1 bg-transparent py-3.5 text-[15px] outline-none", light ? "placeholder:text-offwhite/50" : "placeholder:text-taupe")}
            />
            <button disabled={pending} className="shrink-0 pl-4 text-[11px] tracking-[0.24em] uppercase disabled:opacity-50">{pending ? "Sending…" : "Subscribe"}</button>
          </div>
          <p id={`${id}-msg`} role={state.status === "error" ? "alert" : undefined} className={cn("mt-2 min-h-5 text-[12.5px]", state.status === "error" ? (light ? "text-[#f0b9ad]" : "text-danger") : light ? "text-offwhite/55" : "text-taupe")}>
            {state.status === "error" ? state.message : "Unsubscribe at any time. We never share your details."}
          </p>
        </motion.form>
      )}
    </AnimatePresence>
  );
}

/** Homepage / story newsletter section. */
export function Newsletter({ eyebrow = "The Nargis & Shaz letter", heading = "First to see each *new chapter*", body = "Early access to new collections, private appointments at our Lahore atelier and the occasional story from behind the scenes." }: { eyebrow?: string; heading?: string; body?: string }) {
  return (
    <section className="gutter bg-linen py-[clamp(72px,9vw,128px)]" aria-labelledby="newsletter-title">
      <Reveal className="mx-auto grid max-w-[1100px] items-end gap-10 md:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="eyebrow text-bronze">{eyebrow}</p>
          <h2 id="newsletter-title" className="display mt-4 text-[clamp(34px,4vw,56px)]"><Emph text={heading} /></h2>
          <p className="mt-4 max-w-[420px] text-taupe">{body}</p>
        </div>
        <NewsletterForm id="newsletter-main" />
      </Reveal>
    </section>
  );
}
