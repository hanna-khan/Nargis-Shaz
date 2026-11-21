import { OccasionPage, occasionMetadata } from "@/components/store/occasion-page";

export const generateMetadata = () => occasionMetadata("evening");

export default function Page() {
  return <OccasionPage slug="evening" />;
}
