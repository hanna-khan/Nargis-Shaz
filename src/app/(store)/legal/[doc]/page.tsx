import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/ui/misc";
import { content } from "@/lib/repositories";
import { pageMetadata } from "@/lib/seo";

const DOCS = ["privacy", "terms", "shipping", "returns"];

export function generateStaticParams() {
  return DOCS.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: PageProps<"/legal/[doc]">): Promise<Metadata> {
  const { doc } = await params;
  const p = DOCS.includes(doc) ? await content.policy(doc) : null;
  return p ? pageMetadata({ title: p.title, description: p.intro, path: `/legal/${p.slug}` }) : { title: "Not found" };
}

async function Doc({ params }: { params: PageProps<"/legal/[doc]">["params"] }) {
  const { doc } = await params;
  const p = DOCS.includes(doc) ? await content.policy(doc) : null;
  if (!p) notFound();
  return (
    <article className="gutter mx-auto max-w-[760px] pt-8 pb-28">
      <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Customer care", href: "/customer-care" }, { name: p.title }]} />
      <h1 className="display mt-10 text-[clamp(36px,4vw,56px)]">{p.title}</h1>
      <p className="mt-2 text-[12.5px] text-taupe">Last updated {p.updatedAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>
      {p.intro && <p className="mt-8 text-[16px]">{p.intro}</p>}
      {p.sections.map((s) => (
        <section key={s.heading} className="mt-10">
          <h2 className="font-serif text-[24px]">{s.heading}</h2>
          {s.body.map((b) => <p key={b} className="mt-3 text-chocolate/80">{b}</p>)}
        </section>
      ))}
    </article>
  );
}

export default function LegalPage(props: PageProps<"/legal/[doc]">) {
  return <Suspense fallback={<div className="min-h-screen" />}><Doc params={props.params} /></Suspense>;
}
