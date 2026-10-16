/**
 * Cold-boot runtime state that is NOT in screen prefs knobs.
 * Hot tab-sync uses this so ephemeral phase/pose matches a hard reload
 * without navigating (fullscreen stays).
 */

export type RuntimeSlot<T> = { current: T };

/** Refs (or any `{ current }`) keyed like the defaults object. */
export type RuntimeSlots<T extends Record<string, unknown>> = {
  [K in keyof T]: RuntimeSlot<T[K]>;
};

/** Write every default into its matching slot. */
export function resetRuntimeTo<T extends Record<string, unknown>>(
  defaults: T,
  slots: RuntimeSlots<T>,
): void {
  for (const key of Object.keys(defaults) as (keyof T)[]) {
    slots[key].current = defaults[key];
  }
}

/**
 * Bind defaults + slots once → zero-arg reset.
 *
 * @example
 * const resetRuntime = createRuntimeReset(
 *   { twinkleHue: 0, phase: 0 },
 *   { twinkleHue: twinkleHueRef, phase: phaseRef },
 * );
 */
export function createRuntimeReset<T extends Record<string, unknown>>(
  defaults: T,
  slots: RuntimeSlots<T>,
): () => void {
  return () => resetRuntimeTo(defaults, slots);
}

/**
 * Same binding, but re-seed from a factory (arrays/objects need new instances).
 */
export function createRuntimeResetFactory<T extends Record<string, unknown>>(
  defaultsFactory: () => T,
  slots: RuntimeSlots<T>,
): () => void {
  return () => resetRuntimeTo(defaultsFactory(), slots);
}

// ── Per-screen registry (Canvas owns refs; hooks fire on sync apply) ─

const resets = new Map<string, Set<() => void>>();

/** Register a cold-boot fn for a screen. Returns unregister. */
export function registerRuntimeReset(
  screenId: string,
  fn: () => void,
): () => void {
  let set = resets.get(screenId);
  if (!set) {
    set = new Set();
    resets.set(screenId, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
    if (set!.size === 0) resets.delete(screenId);
  };
}

/** Run all registered cold-boot fns for this screen. */
export function runRuntimeResets(screenId: string): void {
  const set = resets.get(screenId);
  if (!set) return;
  for (const fn of set) fn();
}
