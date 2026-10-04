# UI kit

Shared chrome for Monitron screens and the library. Prefer these over one-off controls so panels stay consistent.

**Import ControlPanel pieces from one place:**

```ts
import {
  ControlPanel,
  ControlSection,
  PanelButton,
  Toggle,
  Slider,
  ColorInput,
  ColorField,
  ColorTable,
  Select,
  Meter,
  TwinkleControls,
} from "@/components/ControlPanel";
```

Shell / nav:

```ts
import { ScreensOverlay } from "@/components/ScreensOverlay";
import { NavBackButton } from "@/components/NavBackButton";
import { PlaceholderCard } from "@/components/PlaceholderCard";
```

---

## Layout hierarchy

```
ScreensOverlay          full-screen HUD (hide button / tap to wake)
  └─ ControlPanel       titled box
       ├─ title
       ├─ actions*      fixed: back / reset / fullscreen (outside scroll)
       └─ scroll body
            └─ ControlSection …
            └─ VisualizerSection   shared bus chrome + Peak gain
                 └─ children       screen-only knobs (drive / channels…)
```

`AudioSpectrum` (`components/AudioSpectrum`) is the HUD-sized canvas deck module. The full-screen saver lives at `/s/spectrum`.

Typical screen:

```tsx
<div className="relative h-screen w-screen overflow-hidden bg-black">
  {/* canvas / R3F */}
  <ScreensOverlay>
    <ControlPanel
      title="my_screen"
      actions={
        <div className="flex gap-2">
          <NavBackButton className="flex-1" />
          <PanelButton onClick={reset} className="flex-1">reset</PanelButton>
          <PanelButton onClick={fullscreen} className="flex-1">fullscreen</PanelButton>
        </div>
      }
    >
      <ControlSection label="look">{/* knobs */}</ControlSection>
      <VisualizerSection visualizer={visualizer}>
        {/* optional screen-specific reactive knobs */}
      </VisualizerSection>
    </ControlPanel>
  </ScreensOverlay>
</div>
```

**Rule of thumb:** hide controls that don’t apply (don’t leave them `disabled` forever). Use `disabled` only for short-lived “can’t touch this yet” states.

Field rhythm is shared via `components/ControlPanel/field.ts`: label row `h-4` + control row `h-7` + `min-h-[48px]` / `gap-1` so Slider / ColorField / Toggle / Meter don’t jump when swapping. Section stack uses `gap-1.5`.

---

## `ControlPanel`

Shell for screen knobs. Fixed max height + internal scroll.

| Prop        | Type        | Default | Notes                          |
| ----------- | ----------- | ------- | ------------------------------ |
| `title`     | `string`    | —       | Header label (usually screen id) |
| `actions`   | `ReactNode?`| —       | Fixed under title (back / reset / fullscreen) |
| `children`  | `ReactNode` | —       | Scrollable sections / controls |
| `className` | `string?`   | —       | Optional layout override       |

```tsx
<ControlPanel title="hexagons">{/* … */}</ControlPanel>
```

---

## `ControlSection`

One job per section. Label is muted uppercase.

| Prop        | Type        | Default | Notes                |
| ----------- | ----------- | ------- | -------------------- |
| `label`     | `string`    | —       | e.g. `look`, `fog`   |
| `children`  | `ReactNode` | —       | Stack of controls    |
| `info`      | `string?`   | —       | Optional "?" tip     |
| `className` | `string?`   | —       |                      |

```tsx
<ControlSection label="camera">
  <Slider label="Zoom" … />
</ControlSection>
```

---

## `Slider`

Numeric range with **− / +** steppers on the sides (same chrome as Select’s ‹ ›). Each click nudges by `step` and snaps to the min-aligned grid. Wheel blurs the input so the panel keeps scrolling.

| Prop        | Type                         | Default        | Notes                    |
| ----------- | ---------------------------- | -------------- | ------------------------ |
| `label`     | `string`                     | —              |                          |
| `value`     | `number`                     | —              |                          |
| `min`       | `number`                     | —              |                          |
| `max`       | `number`                     | —              |                          |
| `step`      | `number?`                    | `1`            | Range drag + ±/decrement |
| `onChange`  | `(value: number) => void`    | —              |                          |
| `disabled`  | `boolean?`                   | `false`        | Dim + non-interactive    |
| `format`    | `(value: number) => string?` | `String(v)`    | Cyan value on the right  |
| `info`      | `string?`                    | —              | Optional "?" tip         |
| `className` | `string?`                    | —              |                          |

```tsx
<Slider
  label="Spin speed"
  value={spinSpeed}
  min={0.1}
  max={4}
  step={0.05}
  onChange={setSpinSpeed}
  format={(v) => v.toFixed(2)}
/>
```

---

## `Toggle`

Boolean switch (`role="switch"`).

| Prop        | Type                      | Default | Notes                                      |
| ----------- | ------------------------- | ------- | ------------------------------------------ |
| `label`     | `string`                  | —       |                                            |
| `checked`   | `boolean`                 | —       |                                            |
| `onChange`  | `(value: boolean) => void`| —       | Toggles to `!checked`                      |
| `disabled`  | `boolean?`                | `false` | Non-interactive + faded                    |
| `readOnly`  | `boolean?`                | `false` | Looks on, doesn’t toggle (status display)  |
| `info`      | `string?`                 | —       | Optional "?" tip                           |
| `className` | `string?`                 | —       |                                            |

```tsx
<Toggle label="Spin" checked={spin} onChange={setSpin} />
```

Pair toggles in a row when they’re alternatives:

```tsx
<div className="flex gap-2 py-1">
  <Toggle label="Fixed" checked={fogFixed} onChange={setFogFixed} />
  <Toggle label="Parallel" checked={fogParallel} onChange={setFogParallel} />
</div>
```

---

## `TwinkleControls`

Framed HSL hue-walk block: master toggle + speed / S / L. Canvas owns the hue phase via [`lib/twinkleHsl.ts`](../lib/twinkleHsl.ts) (`advanceTwinkleHue` → `resolveTwinkleColor` → optional `pulseTwinkleLight`).

| Prop              | Type                        | Default | Notes |
| ----------------- | --------------------------- | ------- | ----- |
| `title`           | `string`                    | —       | Pref identity — must read as twinkle (`"twinkle"`, `"sky twinkle"`) |
| `checked`         | `boolean`                   | —       | Master on/off |
| `onCheckedChange` | `(value: boolean) => void`  | —       | |
| `speed`           | `number`                    | —       | × multiplier (1 ≈ full hue lap in ~6s) |
| `onSpeedChange`   | `(value: number) => void`   | —       | Range `0…4` |
| `s` / `l`         | `number`                    | —       | Saturation / lightness % `0…100` |
| `onSChange` / `onLChange` | `(value: number) => void` | — | |
| `info` / `speedInfo` / `sInfo` / `lInfo` | `string?` | — | Optional "?" tips |
| `className`       | `string?`                   | —       | |

```tsx
<TwinkleControls
  title="twinkle"
  checked={twinkle}
  onCheckedChange={setTwinkle}
  speed={twinkleSpeed}
  onSpeedChange={setTwinkleSpeed}
  s={twinkleS}
  onSChange={setTwinkleS}
  l={twinkleL}
  onLChange={setTwinkleL}
/>
{!twinkle ? (
  <ColorTable /* idle / peak palette */ />
) : null}
```

**Rules of thumb**

- Hide object color pickers while twinkle is on (S/L come from the framed sliders).
- Color / twinkle audio punch stays on a short drive `0…2`; motion drives stay `0…8`.
- Prefer shared pulse helpers from `lib/twinkleHsl` over hand-rolled L flashes.
- Bus channels / idle→peak tint: use defaults from [`lib/visualAudio.ts`](../lib/visualAudio.ts) (`channelLevel`, `drivenLevel`, `lerpHex`, …) — do not fork per-screen `*.audio.ts`. Full table → [README § Shared helpers](../README.md#5-shared-helpers).

---

## `Select`

Custom combobox in panel rhythm (label row + control).

| Prop        | Type                         | Default | Notes                |
| ----------- | ---------------------------- | ------- | -------------------- |
| `label`     | `string`                     | —       |                      |
| `value`     | `T extends string`           | —       |                      |
| `options`   | `{ value: T; label: string }[]` | —    |                      |
| `onChange`  | `(value: T) => void`         | —       |                      |
| `disabled`  | `boolean?`                   | `false` |                      |
| `info`      | `string?`                    | —       | Optional "?" tip     |
| `className` | `string?`                    | —       |                      |

```tsx
<Select
  label="Channel"
  value={channel}
  options={[
    { value: "edge", label: "edge" },
    { value: "beat", label: "beat" },
  ]}
  onChange={setChannel}
/>
```

---

## `ColorInput`

Atomic color control — one implementation, two layouts.

| Prop          | Type                      | Default | Notes                                              |
| ------------- | ------------------------- | ------- | -------------------------------------------------- |
| `value`       | `string`                  | —       | `#rrggbb`                                          |
| `onChange`    | `(value: string) => void` | —       |                                                    |
| `label`       | `string?`                 | —       | Set → described field; omit → compact table cell   |
| `disabled`    | `boolean?`                | `false` |                                                    |
| `info`        | `string?`                 | —       | Optional "?" tip (labeled variant only)            |
| `aria-label`  | `string?`                 | —       | Falls back to `label` / `value`                    |
| `className`   | `string?`                 | —       |                                                    |

**With label** (panel field — title above, swatch + hex as one control):

```tsx
<ColorInput label="Edge" value={edgeColor} onChange={setEdgeColor} />
```

**Without label** (table cell — hex above swatch):

```tsx
<ColorInput value={fogIdle} onChange={setFogIdle} aria-label="fog idle" />
```

### `ColorField`

Thin alias: same as `ColorInput` but `label` is required. Prefer this in screen panels for clarity.

```tsx
<ColorField label="Edge" value={edgeColor} onChange={setEdgeColor} />
```

---

## `ColorTable`

Grid of compact `ColorInput`s (e.g. idle / peak palettes). Prefer this over a pile of `ColorField`s when you have a matrix of related colors.

| Prop        | Type              | Default | Notes                                      |
| ----------- | ----------------- | ------- | ------------------------------------------ |
| `label`     | `string?`         | —       | Optional title inside the box              |
| `columns`   | `string[]`        | —       | Header cells (one per color column)        |
| `rows`      | `ColorTableRow[]` | —       | Row label + cells aligned to `columns`     |
| `disabled`  | `boolean?`        | `false` | Whole table inert                          |
| `lockedColumns` | `string[]?`       | `[]`    | Column keys disabled (e.g. `["peak"]`)     |
| `columnStamps`  | `Record<string, string>?` | — | Stamp on header, e.g. `{ peak: "reactive" }` |
| `className` | `string?`         | —       |                                            |

```ts
type ColorTableCell = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

type ColorTableRow = {
  label: string;
  cells: ColorTableCell[];
};
```

```tsx
<ColorTable
  label="fog"
  columns={["idle", "peak"]}
  rows={[
    {
      label: "",
      cells: [
        { value: fogIdle, onChange: setFogIdle },
        { value: fogPeak, onChange: setFogPeak },
      ],
    },
  ]}
/>
```

`cells.length` should match `columns.length`. Row `label` may be `""` when the section title is enough.

---

## `Meter`

Read-only `0..1` level bar (audio bands, etc.).

| Prop        | Type     | Default | Notes              |
| ----------- | -------- | ------- | ------------------ |
| `label`     | `string` | —       |                    |
| `value`     | `number` | —       | Clamped to `0..1`  |
| `info`      | `string?`| —       | Optional "?" tip   |
| `className` | `string?`| —       |                    |

```tsx
<Meter label="bass" value={meters.bass} />
```

---

## `PanelButton`

Action button inside the panel (reset, fullscreen, …).

| Prop        | Type                              | Default    | Notes        |
| ----------- | --------------------------------- | ---------- | ------------ |
| `children`  | `ReactNode`                       | —          | Label text   |
| `onClick`   | `(() => void)?`                   | —          |              |
| `disabled`  | `boolean?`                        | `false`    |              |
| `type`      | `"button" \| "submit" \| "reset"?`| `"button"` |              |
| `className` | `string?`                         | —          | e.g. `flex-1`|

```tsx
<div className="flex gap-2">
  <PanelButton onClick={reset} className="flex-1">reset</PanelButton>
  <PanelButton onClick={fullscreen} className="flex-1">fullscreen</PanelButton>
</div>
```

---

## `ScreensOverlay`

Fullscreen HUD wrapper for a screen. Centers the panel. **hide** sits in the `ControlPanel` title row (opposite the name); tap anywhere to wake (no idle timer).

| Prop       | Type        | Default | Notes                          |
| ---------- | ----------- | ------- | ------------------------------ |
| `children` | `ReactNode` | —       | Usually a single `ControlPanel`|

```tsx
<ScreensOverlay>
  <ControlPanel title="matrix" actions={/* back / reset / fullscreen */}>
    {/* … */}
  </ControlPanel>
</ScreensOverlay>
```

Put `NavBackButton` in `ControlPanel.actions` (fixed under the title) — not as a floating corner control.

### Optional `info` tips

`Slider` / `Toggle` / `Select` / `ColorInput` / `ColorField` / `Meter` / `ControlSection` accept optional `info?: string`. When set, a small **?** opens a tip popover. Wire copy only where useful (Matrix is the debug surface for now).

---

## `NavBackButton`

Link back to the library (or elsewhere).

| Prop        | Type     | Default  | Notes        |
| ----------- | -------- | -------- | ------------ |
| `href`      | `string?`| `"/"`    |              |
| `label`     | `string?`| `"back"` |              |
| `className` | `string?`| —        | Layout       |

```tsx
<NavBackButton className="flex-1 justify-center shadow-none" />
```

Pass it via `ControlPanel.actions` alongside reset / fullscreen.

---

## `PlaceholderCard`

Home catalog card. Data comes from [`lib/placeholders.ts`](../lib/placeholders.ts).

| Prop          | Type              | Default | Notes                    |
| ------------- | ----------------- | ------- | ------------------------ |
| `placeholder` | `PlaceholderMeta` | —       | `id`, `title`, `href`, … |
| `index`       | `number?`         | `0`     | Channel number `CH-01`   |

```ts
type PlaceholderMeta = {
  id: string;
  title: string;
  href: string;
  previewSrc?: string; // public/s/….webp
  reactive?: boolean;  // “reactive” stamp
};
```

```tsx
{placeholders.map((p, i) => (
  <PlaceholderCard key={p.id} placeholder={p} index={i} />
))}
```

---

## Conventions

1. **Sections first** — group knobs (`look`, `fog`, `camera`, `actions`, `visualizer`). Don’t dump everything in one list.
2. **Conditional render > permanent disable** — if Caps owns fog colors, hide the fog table instead of greying it out.
3. **Mono / uppercase labels** — kit already styles this; don’t invent a second type scale in the panel.
4. **Colors as `#rrggbb` strings** — store in prefs as CSS hex; convert to Three ints only in the draw path.
5. **No custom panel chrome** — new control types go into `components/ControlPanel` and this doc, not into a single screen folder.
