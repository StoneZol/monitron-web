import { Blackhole } from "./_components/Blackhole";
import { screenMetadata } from "@/lib/seo";

export const metadata = screenMetadata("blackhole");

export default function BlackholePage() {
  return <Blackhole />;
}
