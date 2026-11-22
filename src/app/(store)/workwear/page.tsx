import { OccasionPage, occasionMetadata } from "@/components/store/occasion-page";

export const generateMetadata = () => occasionMetadata("workwear");

export default function Page(props: PageProps<"/workwear">) {
  return <OccasionPage slug="workwear" searchParams={props.searchParams} />;
}
