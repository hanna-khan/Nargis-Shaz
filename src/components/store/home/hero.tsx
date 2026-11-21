import { ButtonLink } from "@/components/ui/button";
import { Tilt } from "@/components/ui/parallax";
import { Emph } from "@/components/ui/typography";
import { EditorialImage } from "@/components/media/editorial-image";
import { SilkBackdrop } from "../silk/silk-backdrop";
import type { HomepageContent, ProductImage } from "@/types";

/** Campaign hero. Entrance uses CSS keyframes (no JS needed for first paint). */
export function Hero({ content, frames }: { content: HomepageContent["hero"]; frames: [ProductImage, ProductImage] }) {
  return (
    <section className="relative grid min-h-[100svh] items-end overflow-hidden bg-mocha text-ivory" aria-labelledby="hero-title">
      <SilkBackdrop palette={["#7d6552", "#c7b49d", "#f5ecdf"]} gradient="radial-gradient(120% 90% at 70% 20%, #E7DCCB, #C7B49D 50%, #9A8069)" />
      <div className="relative z-10 grid w-full items-end gap-10 px-[clamp(18px,3.2vw,48px)] pt-[150px] pb-[clamp(40px,6vw,80px)] md:grid-cols-[1.05fr_.95fr]">
        <div className="max-w-[640px] [&>*]:animate-[rise_1.4s_var(--ease-editorial)_both] [&>*:nth-child(2)]:[animation-delay:.18s] [&>*:nth-child(3)]:[animation-delay:.36s] [&>*:nth-child(4)]:[animation-delay:.52s]">
          <p className="eyebrow">{content.eyebrow}</p>
          <h1 id="hero-title" className="display mt-6 mb-8 text-[clamp(52px,8vw,128px)]"><Emph text={content.headline} /></h1>
          <p className="mb-10 max-w-[430px] text-[16px] opacity-90">{content.body}</p>
          <div className="flex flex-wrap items-center gap-6">
            <ButtonLink href={content.primaryCta.href} variant="light">{content.primaryCta.label}</ButtonLink>
            <ButtonLink href={content.secondaryCta.href} variant="ghost-light" className="!px-0">{content.secondaryCta.label}</ButtonLink>
          </div>
        </div>
        <div className="flex items-end justify-end gap-[18px] max-md:justify-start">
          <Tilt className="w-[min(34vw,420px)] animate-[rise_1.6s_var(--ease-editorial)_.5s_both] max-md:w-[56vw]">
            <EditorialImage image={frames[0]} className="arch aspect-[3/4.4] shadow-[0_40px_80px_-40px_rgba(41,39,34,.5)]" priority sizes="(max-width:768px) 56vw, 34vw" />
          </Tilt>
          <Tilt className="mb-12 w-[min(18vw,230px)] animate-[rise_1.6s_var(--ease-editorial)_.8s_both] max-md:w-[30vw]">
            <EditorialImage image={frames[1]} className="arch aspect-[3/4]" sizes="(max-width:768px) 30vw, 18vw" />
          </Tilt>
        </div>
      </div>
      <div className="absolute bottom-5 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2.5 text-[10px] tracking-[0.3em] uppercase opacity-80 max-md:hidden" aria-hidden>
        Scroll<span className="h-10 w-px animate-drip bg-current" />
      </div>
      <style>{`@keyframes rise{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:none}}`}</style>
    </section>
  );
}
