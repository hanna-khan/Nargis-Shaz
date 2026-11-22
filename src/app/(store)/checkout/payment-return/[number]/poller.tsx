"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/** Re-checks the payment status a few times, then explains what happens next. */
export function PaymentPoller() {
  const router = useRouter();
  const [tries, setTries] = useState(0);
  useEffect(() => {
    if (tries >= 12) return;
    const t = setTimeout(() => { setTries((n) => n + 1); router.refresh(); }, 5000);
    return () => clearTimeout(t);
  }, [tries, router]);
  return tries >= 12
    ? <p className="mt-8 text-[14px]">Still waiting. You&apos;ll receive an email as soon as the payment is confirmed — you can safely close this page.</p>
    : <p className="mt-8 text-[13px] text-taupe" aria-live="polite">Checking… ({tries + 1})</p>;
}
