import { Observance } from "./_components/Observance";
import { screenMetadata } from "@/lib/seo";

export const metadata = screenMetadata("observance");

export default function ObservancePage() {
  return <Observance />;
}
