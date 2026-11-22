import type { Metadata } from "next";

// Private area: never indexed, never followed.
export const metadata: Metadata = {
  title: { default: "Studio", template: "%s · Studio · Nargis & Shaz" },
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
};

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return children;
}
