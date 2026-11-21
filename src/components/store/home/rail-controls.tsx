"use client";

export function RailControls({ target }: { target: string }) {
  const go = (dir: number) => {
    const el = document.getElementById(target);
    el?.scrollBy({ left: dir * el.clientWidth * 0.7, behavior: "smooth" });
  };
  return (
    <div className="flex gap-2.5">
      {[-1, 1].map((d) => (
        <button key={d} onClick={() => go(d)} aria-label={d < 0 ? "Previous products" : "Next products"} aria-controls={target}
          className="grid h-11 w-11 place-items-center rounded-full border border-charcoal transition-colors hover:bg-charcoal hover:text-ivory">
          {d < 0 ? "←" : "→"}
        </button>
      ))}
    </div>
  );
}
