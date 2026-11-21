import { clsx, type ClassValue } from "clsx";

export const cn = (...v: ClassValue[]) => clsx(v);

/** Renders "*emphasis*" segments from editorial copy as italic serif. */
export function splitEmphasis(text: string): { text: string; em: boolean }[] {
  return text.split(/(\*[^*]+\*)/g).filter(Boolean).map((t) => (t.startsWith("*") ? { text: t.slice(1, -1), em: true } : { text: t, em: false }));
}

export const stripEmphasis = (t: string) => t.replace(/\*/g, "");

export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }) {
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", ...opts }).format(new Date(iso));
}
