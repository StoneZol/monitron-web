import { MusicVisualBar } from "./_components/MusicVisualBar";
import { screenMetadata } from "@/lib/seo";

export const metadata = screenMetadata("music_visual_bar");

export default function MusicVisualBarPage() {
  return <MusicVisualBar />;
}
