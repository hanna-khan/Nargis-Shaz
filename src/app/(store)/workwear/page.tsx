import { OccasionPage, occasionMetadata } from "@/components/store/occasion-page";

export const generateMetadata = () => occasionMetadata("workwear");

export default function Page() {
  return <OccasionPage slug="workwear" />;
}
