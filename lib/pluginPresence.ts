/**
 * Live extension presence + version from `hello` bus messages.
 * Header / home read this so users see the installed plugin build.
 */

import type { AudioHello } from "@/lib/audioBus";

let version: string | null = null;
let present = false;
const listeners = new Set<() => void>();

function emit() {
  for (const fn of listeners) fn();
}

export function subscribePluginPresence(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getPluginPresent(): boolean {
  return present;
}

/** Installed extension version from last hello — null if offline / old plugin. */
export function getPluginLiveVersion(): string | null {
  return version;
}

export function notePluginHello(hello: AudioHello): void {
  present = true;
  const v = hello.version?.trim();
  if (v) version = v;
  emit();
}

export function notePluginGone(): void {
  if (!present && version == null) return;
  present = false;
  // Keep last version label briefly? Clear so UI falls back to package target.
  version = null;
  emit();
}
