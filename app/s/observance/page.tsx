import { Observance } from "./_components/Observance";
import { SensitiveScreenGate } from "@/components/SensitiveScreenGate";
import { screenMetadata } from "@/lib/seo";

export const metadata = screenMetadata("observance");

export default function ObservancePage() {
  return (
    <SensitiveScreenGate screenTitle="Observance">
      <Observance />
    </SensitiveScreenGate>
  );
}
