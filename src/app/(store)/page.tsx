import type { Metadata } from "next";
import { HomeSections } from "@/components/store/home/renderer";
import { content } from "@/lib/repositories";
import { ogImage, pageMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  const [settings, home] = await Promise.all([content.settings(), content.homepage()]);
  const heroId = home?.sections.find((x) => x.type === "hero")?.imageId;
  const media = heroId ? await content.media([heroId]) : {};
  return {
    ...pageMetadata({ title: settings.storeName, description: settings.seo.description, path: "/", image: ogImage(heroId ? media[heroId]?.src : undefined) }),
    title: { absolute: settings.seo.title },
  };
}

/** The homepage is entirely CMS-driven: Studio → Homepage edits and publishes these sections. */
export default async function HomePage() {
  const home = await content.homepage();
  if (!home?.sections.length) {
    return <section className="gutter py-40 text-center"><h1 className="display text-[clamp(40px,5vw,72px)]">Nargis &amp; Shaz</h1></section>;
  }
  return <HomeSections sections={home.sections} />;
}
