"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";

const ROWS = [
  ["XS", "6", "34", "2", "80", "62", "88"],
  ["S", "8", "36", "4", "84", "66", "92"],
  ["M", "10", "38", "6", "88", "70", "96"],
  ["L", "12", "40", "8", "93", "75", "101"],
  ["XL", "14", "42", "10", "98", "80", "106"],
  ["XXL", "16", "44", "12", "104", "86", "112"],
];

export function SizeGuideButton({ fit }: { fit?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="ulink !text-[10px]">Size guide</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Size guide">
        {fit && <p className="mb-5 text-[14px]"><span className="eyebrow mr-2 text-bronze">Fit</span>{fit}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">Size conversions and body measurements in centimetres</caption>
            <thead><tr className="border-b border-line text-[10.5px] tracking-[0.16em] text-taupe uppercase">{["Size", "UK", "EU", "US", "Bust", "Waist", "Hip"].map((h) => <th key={h} scope="col" className="py-2.5 pr-3 font-normal">{h}</th>)}</tr></thead>
            <tbody>{ROWS.map((r) => <tr key={r[0]} className="border-b border-line/60">{r.map((c, i) => (i === 0 ? <th key={i} scope="row" className="py-2.5 pr-3 font-normal">{c}</th> : <td key={i} className="py-2.5 pr-3">{c}</td>))}</tr>)}</tbody>
          </table>
        </div>
        <p className="mt-5 text-[13px] text-taupe">Measurements are body measurements in centimetres. Between sizes? Choose the larger size for tailoring and the smaller for relaxed knitwear. Festive sets are made to order — our atelier will confirm measurements with you after purchase.</p>
      </Modal>
    </>
  );
}
