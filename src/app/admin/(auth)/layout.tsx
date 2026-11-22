import { Lockup } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center bg-[#f3eee6] px-5 py-16 text-charcoal">
      <div className="w-full max-w-[420px]">
        <div className="mb-10 flex flex-col items-center text-chocolate"><Lockup /><p className="mt-4 text-[10px] tracking-[0.3em] text-bronze uppercase">Studio</p></div>
        <div className="rounded-[4px] border border-line bg-white/80 p-8">{children}</div>
      </div>
    </div>
  );
}
