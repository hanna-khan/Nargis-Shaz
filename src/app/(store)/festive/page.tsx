import { OccasionPage, occasionMetadata } from "@/components/store/occasion-page";

export const generateMetadata = () => occasionMetadata("festive");

export default function Page(props: PageProps<"/festive">) {
  return <OccasionPage slug="festive" searchParams={props.searchParams} />;
}
