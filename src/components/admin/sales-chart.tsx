"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/commerce/currency";

const fmtDay = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T12:00:00Z`).toLocaleDateString("en-GB", o);

/**
 * Single-series daily order value (PKR equivalent). 2px line, recessive grid, crosshair + tooltip,
 * table fallback for screen readers. Empty periods render a flat baseline, never invented data.
 */
export function SalesChart({ data, label }: { data: { date: string; revenue: number; orders: number }[]; label: string }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <p className="py-10 text-center text-[13px] text-charcoal/55">No days in this range.</p>;
  const W = 760, H = 240, P = { l: 64, r: 12, t: 14, b: 28 };
  const peak = Math.max(...data.map((d) => d.revenue));
  const step = peak <= 0 ? 1_000_000 : 10 ** Math.floor(Math.log10(peak)) ;
  const max = Math.max(step, Math.ceil(peak / step) * step);
  const x = (i: number) => P.l + (data.length === 1 ? 0.5 : i / (data.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.revenue).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * t);
  const every = Math.max(1, Math.ceil(data.length / 6));
  const h = hover !== null ? data[hover] : null;
  const short = (v: number) => (v >= 1e8 ? `${(v / 1e8).toFixed(1)}m` : v >= 1e5 ? `${Math.round(v / 1e5)}k` : String(Math.round(v / 100)));

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={label}
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (data.length - 1)))));
        }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="rgb(41 39 34 / .08)" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill="rgb(41 39 34 / .5)">{t === 0 ? "0" : `Rs ${short(t)}`}</text>
          </g>
        ))}
        {data.map((d, i) => i % every === 0 && <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="rgb(41 39 34 / .5)">{fmtDay(d.date, { day: "numeric", month: "short" })}</text>)}
        {data.length > 1 && <path d={`${line} L${x(data.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill="#9A8069" opacity=".1" />}
        <path d={line} fill="none" stroke="#655044" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {data.length === 1 && <circle cx={x(0)} cy={y(data[0].revenue)} r="4" fill="#655044" />}
        {hover !== null && h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="rgb(41 39 34 / .3)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.revenue)} r="5" fill="#655044" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <div className="pointer-events-none absolute top-0 rounded-[3px] bg-charcoal px-3 py-2 text-[12px] text-ivory shadow" style={{ left: `calc(${(x(hover) / W) * 100}% + ${hover > data.length * 0.7 ? -160 : 12}px)` }}>
          <p className="text-ivory/60">{fmtDay(h.date, { weekday: "short", day: "numeric", month: "short" })}</p>
          <p>{formatMoney(h.revenue, "PKR")}</p>
          <p className="text-ivory/60">{h.orders} order{h.orders === 1 ? "" : "s"}</p>
        </div>
      )}
      <table className="sr-only"><caption>{label}</caption><tbody>{data.map((d) => <tr key={d.date}><td>{d.date}</td><td>{formatMoney(d.revenue, "PKR")}</td><td>{d.orders} orders</td></tr>)}</tbody></table>
    </div>
  );
}
