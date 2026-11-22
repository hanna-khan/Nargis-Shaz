import Link from "next/link";
import { getImageProps } from "next/image";
import { Emph } from "@/components/ui/typography";
import type { HomepageContent, ProductImage } from "@/types";

/**
 * Campaign hero: full-bleed photograph with art direction (landscape crop on desktop,
 * portrait crop on mobile) via <picture>, so only one image is downloaded.
 * Copy enters with CSS keyframes — no JavaScript needed for first paint (LCP-safe).
 */
export function Hero({ content, wide, portrait }: { content: Pick<HomepageContent["hero"], "eyebrow" | "headline" | "body"> & { primaryCta: { label: string; href: string } | null; secondaryCta: { label: string; href: string } | null }; wide: ProductImage; portrait: ProductImage }) {
  const common = { alt: wide.alt, sizes: "100vw" };
  const { props: { srcSet: desktop } } = getImageProps({ ...common, src: wide.src!, width: 2400, height: 1600 });
  const { props: { srcSet: mobile, ...rest } } = getImageProps({ ...common, src: portrait.src!, width: 1000, height: 1500, loading: "eager", fetchPriority: "high" });

  return (
    <section className="relative isolate flex min-h-[100svh] items-end overflow-hidden bg-espresso text-offwhite" aria-labelledby="hero-title">
      <picture className="absolute inset-0 -z-10">
        <source media="(min-width: 768px)" srcSet={desktop} sizes="100vw" />
        <img {...rest} srcSet={mobile} alt={wide.alt} className="h-full w-full animate-kenburns object-cover object-[50%_40%]" />
      </picture>
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-chocolate/70 via-chocolate/15 to-chocolate/25 md:bg-gradient-to-r md:from-chocolate/60 md:via-chocolate/10 md:to-transparent" />

      <div className="gutter w-full pt-40 pb-[clamp(44px,7vw,96px)]">
        <div className="max-w-[620px] [&>*]:animate-rise [&>*:nth-child(2)]:[animation-delay:.15s] [&>*:nth-child(3)]:[animation-delay:.3s] [&>*:nth-child(4)]:[animation-delay:.45s]">
          <p className="eyebrow text-offwhite/85">{content.eyebrow}</p>
          <h1 id="hero-title" className="display mt-5 text-[clamp(46px,7vw,112px)] leading-[0.98]"><Emph text={content.headline} /></h1>
          <p className="mt-6 max-w-[420px] text-[15.5px] leading-relaxed text-offwhite/85">{content.body}</p>
          <div className="mt-9 flex flex-wrap items-center gap-x-8 gap-y-4">
            {content.primaryCta && <Link href={content.primaryCta.href} className="inline-flex min-h-12 items-center border border-offwhite bg-offwhite px-8 text-[11px] tracking-[0.24em] text-chocolate uppercase transition-colors duration-500 hover:bg-transparent hover:text-offwhite">{content.primaryCta.label}</Link>}
            {content.secondaryCta && <Link href={content.secondaryCta.href} className="ulink">{content.secondaryCta.label}</Link>}
          </div>
        </div>
      </div>
      <div className="absolute right-[clamp(18px,3.4vw,56px)] bottom-8 hidden flex-col items-center gap-3 text-[10px] tracking-[0.3em] uppercase opacity-80 md:flex" aria-hidden>
        <span className="[writing-mode:vertical-rl]">Scroll</span><span className="h-12 w-px animate-drip bg-current" />
      </div>
    </section>
  );
}
