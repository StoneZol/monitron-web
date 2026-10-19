"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { FieldLabel } from "./FieldInfo";
import { fieldLabelRow, fieldRoot } from "./field";
import { panelButtonClassName } from "./PanelButton";
import {
  clearUserBackground,
  getUserBackgroundMeta,
  getUserBackgroundObjectUrl,
  hasUserBackground,
  setUserBackgroundFromFile,
  setUserBackgroundFromUrl,
  subscribeUserMedia,
  type UserBackgroundMeta,
} from "@/lib/userMedia";
import type { StockPlaceholder } from "@/lib/stockPlaceholders";
import { cn } from "@/lib/utils";

/** Prefs-friendly background pick — stock id is durable; user is one IDB slot. */
export type MediaSelection =
  | { kind: "stock"; id: string }
  | { kind: "user" };

export type MediaFieldProps = {
  label: string;
  value: MediaSelection;
  onChange: (next: MediaSelection) => void;
  /** Bundled placeholders shown as a thumb row. */
  stocks: readonly StockPlaceholder[];
  info?: string;
  className?: string;
  disabled?: boolean;
};

function useUserMeta(): UserBackgroundMeta | null {
  return useSyncExternalStore(
    subscribeUserMedia,
    getUserBackgroundMeta,
    () => null,
  );
}

export function MediaField({
  label,
  value,
  onChange,
  stocks,
  info,
  className,
  disabled = false,
}: MediaFieldProps) {
  const urlInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const userMeta = useUserMeta();
  const [urlDraft, setUrlDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userThumb, setUserThumb] = useState<string | null>(null);

  const stockSrc =
    value.kind === "stock"
      ? (stocks.find((s) => s.id === value.id)?.src ?? stocks[0]?.src ?? null)
      : null;

  useEffect(() => {
    let dead = false;
    if (value.kind !== "user" || !userMeta) {
      setUserThumb(null);
      return;
    }
    void getUserBackgroundObjectUrl().then((url) => {
      if (!dead) setUserThumb(url);
    });
    return () => {
      dead = true;
    };
  }, [value.kind, userMeta]);

  const previewSrc =
    value.kind === "user" ? userThumb : stockSrc;

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };

  const pickFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    await run(async () => {
      await setUserBackgroundFromFile(file);
      onChange({ kind: "user" });
    });
  };

  const loadUrl = async () => {
    const u = urlDraft.trim();
    if (!u) return;
    await run(async () => {
      await setUserBackgroundFromUrl(u);
      onChange({ kind: "user" });
      setUrlDraft("");
    });
  };

  const toStock = (id: string) => {
    onChange({ kind: "stock", id });
  };

  const useCustom = () => {
    if (hasUserBackground()) onChange({ kind: "user" });
  };

  const clearCustom = async () => {
    await run(async () => {
      await clearUserBackground();
      const fallback = stocks[0]?.id ?? "1";
      onChange({
        kind: "stock",
        id: value.kind === "stock" ? value.id : fallback,
      });
    });
  };

  return (
    <div className={cn(fieldRoot, className)}>
      <div className={fieldLabelRow}>
        <FieldLabel label={label} info={info} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-stretch gap-2">
          <div
            className="relative h-14 w-20 shrink-0 overflow-hidden border border-signal bg-screen"
            aria-hidden
          >
            {previewSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewSrc}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
                …
              </div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <p className="truncate font-mono text-[9px] normal-case tracking-normal text-signal/80">
              {value.kind === "user"
                ? userMeta
                  ? `${userMeta.name} · custom`
                  : "custom (missing)"
                : `stock ${value.id}`}
            </p>
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                disabled={disabled || busy}
                className={cn(panelButtonClassName, "px-2 py-1 shadow-none")}
                onClick={() => fileRef.current?.click()}
              >
                upload
              </button>
              <button
                type="button"
                disabled={disabled || busy || !userMeta}
                className={cn(panelButtonClassName, "px-2 py-1 shadow-none")}
                onClick={useCustom}
                title="Use the single custom slot"
              >
                custom
              </button>
              <button
                type="button"
                disabled={disabled || busy || !userMeta}
                className={cn(panelButtonClassName, "px-2 py-1 shadow-none")}
                onClick={() => void clearCustom()}
                title="Delete custom slot and return to stock"
              >
                clear custom
              </button>
            </div>
          </div>
        </div>

        {stocks.length > 0 ? (
          <div className="grid grid-cols-4 gap-1">
            {stocks.map((s) => {
              const on = value.kind === "stock" && value.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={disabled || busy}
                  title={`Stock ${s.label}`}
                  aria-pressed={on}
                  onClick={() => toStock(s.id)}
                  className={cn(
                    "relative aspect-video overflow-hidden border bg-screen",
                    on ? "border-cyan" : "border-signal hover:border-cyan/70",
                    "disabled:opacity-40",
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.src}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="flex gap-1">
          <input
            id={urlInputId}
            type="url"
            value={urlDraft}
            disabled={disabled || busy}
            placeholder="https://…"
            onChange={(e) => setUrlDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void loadUrl();
              }
            }}
            className="h-7 min-w-0 flex-1 border border-signal bg-screen px-2 font-mono text-[10px] normal-case tracking-normal text-signal placeholder:text-muted/50 focus-visible:outline focus-visible:outline-offset-1 focus-visible:outline-signal disabled:opacity-40"
          />
          <button
            type="button"
            disabled={disabled || busy || !urlDraft.trim()}
            className={cn(panelButtonClassName, "px-2 py-1 shadow-none")}
            onClick={() => void loadUrl()}
          >
            url
          </button>
        </div>

        {error ? (
          <p className="font-mono text-[9px] normal-case tracking-normal text-danger">
            {error}
          </p>
        ) : null}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void pickFile(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
