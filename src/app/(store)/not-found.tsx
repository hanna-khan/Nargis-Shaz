import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <section className="px-6 py-40 text-center">
      <p className="eyebrow">Page not found</p>
      <h1 className="mt-4 font-serif text-[clamp(42px,6vw,84px)] font-light">This piece has <em>moved on</em></h1>
      <p className="mx-auto mt-4 max-w-[420px] text-charcoal/65">The page you were looking for isn&apos;t here any more. Our latest collection is.</p>
      <div className="mt-10"><ButtonLink href="/new-arrivals">Shop new arrivals</ButtonLink></div>
    </section>
  );
}
