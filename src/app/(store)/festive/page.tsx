import { OccasionPage, occasionMetadata } from "@/components/store/occasion-page";

export const generateMetadata = () => occasionMetadata("festive");

export default function Page() {
  return <OccasionPage slug="festive" />;
}
