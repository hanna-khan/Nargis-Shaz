import { OccasionPage, occasionMetadata } from "@/components/store/occasion-page";

export const generateMetadata = () => occasionMetadata("everyday");

export default function Page(props: PageProps<"/everyday">) {
  return <OccasionPage slug="everyday" searchParams={props.searchParams} />;
}
