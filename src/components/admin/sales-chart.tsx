"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/commerce/currency";
import { formatDate } from "@/lib/utils";

/**
 * Single-series revenue line (no legend needed — the card title names it).
 * 2px line, recessive grid, crosshair + tooltip on hover, table fallback for screen readers.
 */
export function SalesChart({ data }: { data: { date: string; revenue: number; orders: number }[] }) {
  const [hover, setHover] = useState<number | null>(null);
  const W = 760, H = 240, P = { l: 56, r: 12, t: 14, b: 28 };
  const max = Math.ceil(Math.max(...data.map((d) => d.revenue)) / 1e7) * 1e7; // round to Rs 100k
  const x = (i: number) => P.l + (i / (data.length - 1)) * (W - P.l - P.r);
  const y = (v: number) => P.t + (1 - v / max) * (H - P.t - P.b);
  const line = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(d.revenue).toFixed(1)}`).join(" ");
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => max * t);
  const h = hover !== null ? data[hover] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Daily revenue for the last 30 days"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * W;
          setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - P.l) / (W - P.l - P.r)) * (data.length - 1)))));
        }}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={P.l} x2={W - P.r} y1={y(t)} y2={y(t)} stroke="rgb(41 39 34 / .08)" />
            <text x={P.l - 8} y={y(t) + 4} textAnchor="end" fontSize="10.5" fill="rgb(41 39 34 / .5)">{t === 0 ? "0" : `${(t / 1e7).toFixed(0)}00k`}</text>
          </g>
        ))}
        {data.map((d, i) => i % 7 === 0 && <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10.5" fill="rgb(41 39 34 / .5)">{formatDate(d.date, { day: "numeric", month: "short" })}</text>)}
        <path d={`${line} L${x(data.length - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} fill="#9A8069" opacity=".1" />
        <path d={line} fill="none" stroke="#655044" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && h && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={P.t} y2={H - P.b} stroke="rgb(41 39 34 / .3)" strokeDasharray="3 3" />
            <circle cx={x(hover)} cy={y(h.revenue)} r="5" fill="#655044" stroke="#fff" strokeWidth="2" />
          </g>
        )}
      </svg>
      {h && hover !== null && (
        <div className="pointer-events-none absolute top-0 rounded-[3px] bg-charcoal px-3 py-2 text-[12px] text-ivory shadow" style={{ left: `calc(${(x(hover) / W) * 100}% + ${hover > data.length * 0.7 ? -150 : 12}px)` }}>
          <p className="text-ivory/60">{formatDate(h.date, { weekday: "short", day: "numeric", month: "short" })}</p>
          <p>{formatMoney(h.revenue, "PKR")}</p>
          <p className="text-ivory/60">{h.orders} orders</p>
        </div>
      )}
      <table className="sr-only"><caption>Daily revenue</caption><tbody>{data.map((d) => <tr key={d.date}><td>{d.date}</td><td>{formatMoney(d.revenue, "PKR")}</td><td>{d.orders} orders</td></tr>)}</tbody></table>
    </div>
  );
}
