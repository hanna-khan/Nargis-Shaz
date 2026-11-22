import { OccasionPage, occasionMetadata } from "@/components/store/occasion-page";

export const generateMetadata = () => occasionMetadata("evening");

export default function Page(props: PageProps<"/evening">) {
  return <OccasionPage slug="evening" searchParams={props.searchParams} />;
}
