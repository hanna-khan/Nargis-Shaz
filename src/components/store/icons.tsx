import type { SVGProps } from "react";

const base = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.2, "aria-hidden": true } as const;

export const SearchIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5 21 21" /></svg>;
export const UserIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4-6.5 8-6.5s7 2 8 6.5" /></svg>;
export const BagIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></svg>;
export const HeartIcon = ({ filled, ...p }: SVGProps<SVGSVGElement> & { filled?: boolean }) => <svg {...base} {...p} fill={filled ? "currentColor" : "none"}><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>;
export const MenuIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M3 8h18M3 16h18" /></svg>;
export const ArrowIcon = (p: SVGProps<SVGSVGElement>) => <svg {...base} {...p}><path d="M4 12h16M14 6l6 6-6 6" /></svg>;
