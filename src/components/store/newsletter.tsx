"use client";

import { useState } from "react";
import { Display, Eyebrow } from "@/components/ui/typography";

/** Newsletter capture UI. Phase 2: submit to a Server Action that stores consent in Supabase. */
export function Newsletter() {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  return (
    <section className="bg-beige/60 px-6 py-[clamp(70px,9vw,130px)] text-center" aria-labelledby="newsletter-title">
      <Eyebrow>The letter</Eyebrow>
      <Display as="h2" size="lg" text="Stories, first *access*, and quiet *invitations*" className="mx-auto mt-4 max-w-[760px]" />
      {state === "done" ? (
        <p className="mt-9 font-serif text-[22px] italic" role="status">Thank you — your first letter is on its way.</p>
      ) : (
        <form
          className="mx-auto mt-9 flex max-w-[520px] border-b border-charcoal"
          onSubmit={(e) => {
            e.preventDefault();
            const email = new FormData(e.currentTarget).get("email") as string;
            setState(/^\S+@\S+\.\S+$/.test(email) ? "done" : "error");
          }}
        >
          <label htmlFor="newsletter-email" className="sr-only">Email address</label>
          <input id="newsletter-email" name="email" type="email" required placeholder="Your email address" className="flex-1 bg-transparent py-3.5 text-[15px] outline-none placeholder:text-charcoal/45" />
          <button className="text-[11px] tracking-[0.24em] uppercase">Subscribe</button>
        </form>
      )}
      {state === "error" && <p className="mt-3 text-[12.5px] text-danger">Please enter a valid email address.</p>}
      <p className="mx-auto mt-5 max-w-[420px] text-[12px] text-charcoal/55">By subscribing you agree to receive emails from Nargis &amp; Shaz. Unsubscribe at any time.</p>
    </section>
  );
}
