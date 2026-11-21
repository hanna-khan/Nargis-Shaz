import type { ElementType, ReactNode } from "react";
import { cn, splitEmphasis } from "@/lib/utils";

/** Editorial copy with *emphasis* rendered in italic serif. */
export function Emph({ text, emClassName }: { text: string; emClassName?: string }) {
  return (
    <>
      {splitEmphasis(text).map((s, i) => (s.em ? <em key={i} className={emClassName}>{s.text}</em> : <span key={i}>{s.text}</span>))}
    </>
  );
}

const sizes = {
  hero: "text-[clamp(48px,8vw,124px)]",
  xl: "text-[clamp(40px,5.6vw,84px)]",
  lg: "text-[clamp(34px,4.4vw,64px)]",
  md: "text-[clamp(28px,3vw,42px)]",
  sm: "text-[26px]",
};

export function Display({ as: Tag = "h2", size = "lg", text, children, className, emClassName }: { as?: ElementType; size?: keyof typeof sizes; text?: string; children?: ReactNode; className?: string; emClassName?: string }) {
  return <Tag className={cn("display", sizes[size], className)}>{text ? <Emph text={text} emClassName={emClassName} /> : children}</Tag>;
}

export function Eyebrow({ children, className, as: Tag = "p" }: { children: ReactNode; className?: string; as?: ElementType }) {
  return <Tag className={cn("eyebrow", className)}>{children}</Tag>;
}

export function Container({ children, className, as: Tag = "div" }: { children: ReactNode; className?: string; as?: ElementType }) {
  return <Tag className={cn("px-[clamp(18px,3.2vw,48px)]", className)}>{children}</Tag>;
}
