import { PlaceholderCard } from "@/components/PlaceholderCard";
import type { PlaceholderMeta } from "@/lib/placeholders";

type PlaceholderGridProps = {
  placeholders: PlaceholderMeta[];
  /** Global channel number offset (continues across catalog chapters). */
  indexOffset?: number;
  /** Catalog chapter (1-based) — stamped as `?via=ch-NN` on screen links. */
  catalogChapter?: number;
};

export function PlaceholderGrid({
  placeholders,
  indexOffset = 0,
  catalogChapter,
}: PlaceholderGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
      {placeholders.map((placeholder, index) => (
        <li key={placeholder.id}>
          <PlaceholderCard
            placeholder={placeholder}
            index={indexOffset + index}
            catalogChapter={catalogChapter}
          />
        </li>
      ))}
    </ul>
  );
}
