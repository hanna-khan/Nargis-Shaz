"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/modal";

export interface SizeGuideData { rows: { size: string; uk?: string; eu?: string; us?: string; bust: string; waist: string; hip: string }[]; notes: string }

/** Size guide from Studio (size_guides table). */
export function SizeGuideButton({ fit, guide }: { fit?: string; guide: SizeGuideData }) {
  const [open, setOpen] = useState(false);
  const cols: [string, keyof SizeGuideData["rows"][number]][] = [["Size", "size"], ["UK", "uk"], ["EU", "eu"], ["US", "us"], ["Bust", "bust"], ["Waist", "waist"], ["Hip", "hip"]];
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="ulink !text-[10px]">Size guide</button>
      <Modal open={open} onClose={() => setOpen(false)} title="Size guide">
        {fit && <p className="mb-5 text-[14px]"><span className="eyebrow mr-2 text-bronze">Fit</span>{fit}</p>}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <caption className="sr-only">Size conversions and body measurements in centimetres</caption>
            <thead><tr className="border-b border-line text-[10.5px] tracking-[0.16em] text-taupe uppercase">{cols.map(([h]) => <th key={h} scope="col" className="py-2.5 pr-3 font-normal">{h}</th>)}</tr></thead>
            <tbody>{guide.rows.map((r) => <tr key={r.size} className="border-b border-line/60">{cols.map(([, k], i) => (i === 0 ? <th key={k} scope="row" className="py-2.5 pr-3 font-normal">{r[k]}</th> : <td key={k} className="py-2.5 pr-3">{r[k] ?? "—"}</td>))}</tr>)}</tbody>
          </table>
        </div>
        {guide.notes && <p className="mt-5 text-[13px] text-taupe">{guide.notes}</p>}
      </Modal>
    </>
  );
}
