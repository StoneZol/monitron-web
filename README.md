# Monitron

Generative placeholders for idle monitors — techno abstractions you leave running on a screen.

**Stack:** Next.js (App Router) · React 19 · Tailwind CSS 4

Optional Chrome extension (planned) can feed live tab-audio bands into any screen for reactive visuals.

---

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

| Route       | What                |
| ----------- | ------------------- |
| `/`         | Library of screens  |
| `/s/matrix` | Matrix rain example |

---

## Architecture

```
/                         catalog (static preview images)
/s/<id>                   fullscreen generative screen
  └─ canvas / WebGL
  └─ ScreensOverlay       idle-hide HUD (ControlPanel + back)
       └─ ControlPanel    per-screen knobs (bootleg AV chrome)
       └─ visualizer*     extension / reactive / band meters
```

\*Driven by `useAudioReactive` — only bands listed in the screen’s `bands` mask are shown.

### Data flow (audio → visualizer)

```
┌─────────────────────┐         window.postMessage            ┌──────────────────────┐
│  Chrome extension   │  hello / audio-frame (bands[32], rms, peak)│  Monitron page       │
│  tabCapture → FFT   │ ─────────────────────────────────────────► │  subscribeAudioBus   │
│  (raw spectrum)     │ ◄───────────────────────────────────────── │  visualizer-toggle   │
└─────────────────────┘                                            └──────────┬───────────┘
                                                                              │
                                                                              ▼
                                                                     useAudioReactive
                                                                     ├─ AudioDeriver (EQ/onset)
                                                                     ├─ meters (UI, throttled)
                                                                     └─ vizRef (rAF-safe)
                                                                         │
                                                                         ▼
                                                                screen draw loop
                                                                reads vizRef.current
```

**Not** `localStorage`. High-rate audio goes through `postMessage` → refs. Panel meters are throttled (~4fps); the screen reads `vizRef` every frame.

Without the extension the site still works — visualizer UI stays dormant, screens run on their own ControlPanel knobs.

---

## Contributing a placeholder

### 1. Register in the catalog

[`lib/placeholders.ts`](lib/placeholders.ts):

```ts
{
  id: "waves",
  title: "Waves",
  href: "/s/waves",
  previewSrc: "/s/waves.webp", // optional screenshot for the home card
}
```

Put preview images under `public/s/`.

### 2. Create the screen

```
app/s/<id>/
  page.tsx
  _components/<Name>/
    index.ts
    <Name>.tsx          # client UI: canvas + ScreensOverlay + ControlPanel
    <Name>.hooks.ts     # animation + state + visualizer
    <Name>.types.ts
```

Mirror [`app/s/matrix`](app/s/matrix) — keep logic in the hook, keep the page thin.

### 3. Wire shared chrome

```tsx
"use client";
import { ScreensOverlay } from "@/components/ScreensOverlay";
import {
  ControlPanel,
  ControlSection,
  PanelButton,
  Slider,
} from "@/components/ControlPanel";
import useWavesHook from "./Waves.hooks";

export default function Waves() {
  const { canvasRef, controls, visualizer } = useWavesHook();
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
      <ScreensOverlay>
        <ControlPanel title="waves">
          <ControlSection label="look">
            <Slider
              label="Speed"
              value={controls.speed}
              min={0.1}
              max={5}
              step={0.1}
              onChange={controls.setSpeed}
            />
          </ControlSection>
          <ControlSection label="actions">
            <PanelButton onClick={controls.reset}>reset</PanelButton>
          </ControlSection>
        </ControlPanel>
      </ScreensOverlay>
    </div>
  );
}
```

`ScreensOverlay` handles idle HUD hide + `NavBackButton` (`← library`).

### 4. Controls + visualizer (in the hook)

```ts
const [speed, setSpeed] = useState(1);
const visualizer = useAudioReactive({ bands: { bass: true, beat: true } });
const { vizRef } = visualizer;

// inside requestAnimationFrame / draw:
const viz = vizRef.current;
if (viz.enabled) {
  // use viz.bass / viz.mid / viz.high / viz.beat  (all 0..1)
}
```

**Rules of thumb**

- Own ControlPanel knobs = your screen’s look.
- Visualizer bands = shared audio bus; pass a `bands` mask so unused meters stay hidden.
- Never `setState` per audio frame — read `vizRef.current` in the render loop.
- Prefer `previewSrc` screenshots on the home page, not a live full-screen mount in the card.

### 5. Shared helpers

| Module                                                     | Role                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------- |
| [`lib/audioBus.ts`](lib/audioBus.ts)                       | Message protocol + subscribe / `postVisualizerToggle` |
| [`hooks/useAudioReactive.ts`](hooks/useAudioReactive.ts)   | Extension handshake + `vizRef` + meters               |
| [`lib/fullscreen.ts`](lib/fullscreen.ts)                   | `toggleFullscreen()`                                  |
| [`components/ControlPanel`](components/ControlPanel)       | Bootleg AV knobs / meters / buttons                   |
| [`components/ScreensOverlay`](components/ScreensOverlay)   | Idle-hide HUD shell                                   |
| [`components/NavBackButton`](components/NavBackButton.tsx) | Back to library                                       |

**UI reference:** props and usage for every shared control → [`docs/ui.md`](docs/ui.md).

---

## Audio bus API

Authoritative types live in [`lib/audioBus.ts`](lib/audioBus.ts). Derivation (bass/mid/high/beat/BPM) lives in [`lib/audioDerive.ts`](lib/audioDerive.ts) — the plugin only ships raw spectrum.

### Extension → page

**Presence**

```ts
{ source: "monitron-extension", type: "hello" }
```

Shows the ControlPanel visualizer section (sets **extension** = true).

**Frame** (raw analyser dump)

```ts
{
  source: "monitron-extension",
  type: "audio-frame",
  t: number,            // ms since capture start
  sampleRate: number,
  bands: number[],      // length 32, log-spaced 20Hz→16kHz, each 0..1
  rms: number,          // time-domain RMS 0..1
  peak: number,         // time-domain peak 0..1
}
```

A frame also implies the extension is present. The page derives `bass` / `mid` / `high` / `beat` / `bpm` for screens.

### Page → extension

**Hello request** (page remount / missed initial hello):

```ts
{ source: "monitron-page", type: "hello-request" }
```

Content script must reply with `hello` again.

**Visualizer toggle**

```ts
{
  source: "monitron-page",
  type: "visualizer-toggle",
  enabled: boolean
}
```

Sent when the user flips **reactive** in the ControlPanel. Extension should start/stop analysis (capture can stay open).

### Dev console smoke test

```js
const bands = Array.from({ length: 32 }, (_, i) =>
  i < 8 ? 0.9 : i < 16 ? 0.4 : 0.15,
);

postMessage(
  { source: "monitron-extension", type: "hello" },
  "*",
);

postMessage(
  {
    source: "monitron-extension",
    type: "audio-frame",
    t: performance.now(),
    sampleRate: 48000,
    bands,
    rms: 0.4,
    peak: 0.7,
  },
  "*",
);
```

Then enable **reactive** under **visualizer** on `/s/matrix` — rain should react (columns follow spectrum left→lows / right→highs).

### `VizBands` (what screens read)

```ts
type VizBands = {
  enabled: boolean;
  bands: number[]; // live spectrum
  bass: number;    // derived
  mid: number;
  high: number;
  beat: number;
  rms: number;
  peak: number;
  bpm: number;
};
```

---

## UX notes

- Idle ~6s without mouse → HUD fades (`ScreensOverlay`); move mouse to bring it back.
- System cursor is left alone (browser won’t redraw `cursor: none` without movement).
- Fullscreen = ControlPanel **fullscreen** button (`Fullscreen` API), not OS F11 injection.

---

## Scripts

```bash
npm run dev      # local
npm run build    # production build
npm run start    # serve build
npm run lint     # eslint
npm run convert     # convert prew in webp
```
