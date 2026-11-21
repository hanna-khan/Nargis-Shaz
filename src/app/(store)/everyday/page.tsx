import { OccasionPage, occasionMetadata } from "@/components/store/occasion-page";

export const generateMetadata = () => occasionMetadata("everyday");

export default function Page() {
  return <OccasionPage slug="everyday" />;
}
