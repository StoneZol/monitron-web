# Sensitive content API

Opt-in unlock for channels tagged `sensitive`, plus tamper tripwires that nuke the page if DevTools yeets a hard gate.

**Default:** previews censored, sensitive routes blocked. User must flip **sensitive previews** in the header (final `HazardAlert` confirm).

---

## Mark a screen

In [`lib/placeholders.ts`](../lib/placeholders.ts) — `id` / `/s/<id>` use underscores for multi-word titles (see README **Screen id / URL slug**):

```ts
{
  id: "observance",
  // …
  tags: ["reactive", "sensitive"],
}
```

- Stamp + tone come from `PLACEHOLDER_TAG_META.sensitive`
- `isSensitivePlaceholder(meta)` → catalog card censors stills until unlocked

Wrap the page so a direct URL cannot skip the gate:

```tsx
// app/s/<id>/page.tsx
import { SensitiveScreenGate } from "@/components/SensitiveScreenGate";

export default function Page() {
  return (
    <SensitiveScreenGate screenTitle="Observance">
      <Observance />
    </SensitiveScreenGate>
  );
}
```

Children **do not mount** until `getSensitivePreviewsEnabled()` is true.

---

## Runtime (root layout)

Mounted once in `app/layout.tsx`:

| Component | Role |
| --------- | ---- |
| `PhotosensitiveAlert` | First-visit hazard; writes accept to localStorage |
| `ConsentTripwire` | Watches photosensitive portal; missing without accept → `lockdown()` |
| `SensitiveTripwire` | Watches channel gate + unlock confirm; DevTools yeet → `lockdown()` + clears photosensitive accept |

Header: `SensitivePreviewToggle` ([`components/SiteHeader.tsx`](../components/SiteHeader.tsx)).

---

## Prefs + events

### Preview unlock — [`lib/sensitivePreview.ts`](../lib/sensitivePreview.ts)

| Export | Role |
| ------ | ---- |
| `SENSITIVE_PREVIEW_KEY` | `localStorage` key (`"1"` = on) |
| `SENSITIVE_PREVIEW_CHANGE` | `window` event name on change |
| `getSensitivePreviewsEnabled()` | Read (SSR → `false`) |
| `setSensitivePreviewsEnabled(on)` | Write + notify |
| `subscribeSensitivePreview(fn)` | For `useSyncExternalStore` |

### Unlock confirm arm — [`lib/sensitiveGate.ts`](../lib/sensitiveGate.ts)

Used so `SensitiveTripwire` can tell intentional dismiss from F12 delete while the confirm portal is up.

| Export | Role |
| ------ | ---- |
| `SENSITIVE_GATE_ATTR` / `SENSITIVE_GATE_ID` | Channel lock DOM marker (`data-monitron-sensitive-gate="channel"`) |
| `SENSITIVE_GATE_SELECTOR` | Query for that node |
| `SENSITIVE_CONFIRM_GATE_ID` | `"sensitive-confirm"` — pass as `HazardAlert` `consentGate` |
| `SENSITIVE_CONFIRM_SELECTOR` | Query for confirm portal |
| `armSensitiveConfirm()` / `disarmSensitiveConfirm()` | Toggle must arm before open, disarm on Keep locked / unlock / dismiss |
| `isSensitiveConfirmArmed()` | Tripwire read |
| `subscribeSensitiveConfirm(fn)` | Re-tick tripwire on arm/disarm |

### Photosensitive consent — [`lib/photosensitiveConsent.ts`](../lib/photosensitiveConsent.ts)

| Export | Role |
| ------ | ---- |
| `PHOTOSENSITIVE_STORAGE_KEY` | Accept flag |
| `CONSENT_GATE_ID` | `"photosensitive"` — `HazardAlert` `consentGate` |
| `CONSENT_GATE_SELECTOR` | Query for first-visit portal |
| `readPhotosensitiveAccepted` / `writePhotosensitiveAccepted` / `clearPhotosensitiveAccepted` | Persist / wipe |
| `markPhotosensitiveBoot` / `isPhotosensitiveBootChecked` / `subscribePhotosensitiveBoot` | Client boot handshake for `ConsentTripwire` |

### Kill screen — [`lib/tamperLock.ts`](../lib/tamperLock.ts)

| Export | Role |
| ------ | ---- |
| `lockdown()` | Replace page with vanilla lock DOM; strike counter in localStorage |
| `isTamperLocked()` | `window.__monitronConsentLock` |
| `TAMPER_STRIKE_KEY` | First tamper = Sun Tzu copy; repeat = shorter |

Blue pill clears photosensitive accept and leaves to Google. Red pill reloads (gate returns if accept was wiped).

---

## UI pieces

| Component | Role |
| --------- | ---- |
| [`SensitivePreviewToggle`](../components/SensitivePreviewToggle.tsx) | Header / gate control; arms confirm + `HazardAlert` |
| [`SensitiveScreenGate`](../components/SensitiveScreenGate.tsx) | Full-screen channel lock; sets `SENSITIVE_GATE_*` attrs |
| [`SensitiveCensorMark`](../components/SensitiveCensorMark.tsx) | Catalog still overlay (glitch plate) |
| [`PlaceholderCard`](../components/PlaceholderCard.tsx) | Auto-censors when `sensitive` && !enabled |
| [`HazardAlert`](../components/HazardAlert.tsx) | Portal; `consentGate` → `data-monitron-consent-gate` for tripwires |

---

## Author checklist

1. Add `"sensitive"` to `tags` in `lib/placeholders.ts`.
2. Wrap `app/s/<id>/page.tsx` with `SensitiveScreenGate`.
3. Do **not** mount heavy WebGL under the gate until unlocked (gate already delays children).
4. Never remove / rename gate attrs or skip `armSensitiveConfirm` / `disarmSensitiveConfirm` on the toggle confirm — tripwires depend on them.
5. Tamper paths always call `lockdown()` from `@/lib/tamperLock` (shared kill screen).
