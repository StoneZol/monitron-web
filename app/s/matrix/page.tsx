import { Matrix } from "./_components/Matrix";
import { screenMetadata } from "@/lib/seo";

export const metadata = screenMetadata("matrix");

export default function MatrixPage() {
  return <Matrix />;
}
