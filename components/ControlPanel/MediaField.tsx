"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { FieldLabel } from "./FieldInfo";
import { fieldBlock, fieldLabelRow, fieldRoot } from "./field";
import { panelButtonClassName } from "./PanelButton";
import {
  addMediaFromUrl,
  addSessionMediaFromFiles,
  getMediaLibraryEntry,
  getMediaPreviewObjectUrl,
  getSessionMediaEntry,
  listMediaLibrary,
  listSessionMedia,
  MEDIA_LIBRARY_MAX,
  mediaLibraryCount,
  removeMediaLibraryEntry,
  removeSessionMedia,
  SESSION_MEDIA_MAX,
  sessionMediaCount,
  subscribeUserMedia,
  type MediaLibraryEntry,
  type SessionMediaEntry,
} from "@/lib/userMedia";
import {
  getSessionVideo,
  removeSessionVideo,
  SESSION_VIDEO_MAX,
  SESSION_VIDEO_MAX_BYTES,
  setSessionVideoFromFile,
  subscribeSessionVideo,
} from "@/lib/sessionVideo";
import type { StockPlaceholder } from "@/lib/stockPlaceholders";
import { cn } from "@/lib/utils";

export type MediaSelection =
  | { kind: "stock"; id: string }
  | { kind: "library"; id: string }
  | { kind: "session"; id: string }
  | { kind: "video"; id: string };

export type MediaFieldProps = {
  label: string;
  value: MediaSelection;
  onChange: (next: MediaSelection) => void;
  stocks: readonly StockPlaceholder[];
  info?: string;
  className?: string;
  disabled?: boolean;
  /** Show session video slot (Wet Glass). Mutex with still slideshow. */
  enableVideo?: boolean;
};

const EMPTY_LIB: MediaLibraryEntry[] = [];
const EMPTY_SESSION: SessionMediaEntry[] = [];

function useLibrary(): MediaLibraryEntry[] {
  return useSyncExternalStore(
    subscribeUserMedia,
    listMediaLibrary,
    () => EMPTY_LIB,
  );
}

function useSession(): SessionMediaEntry[] {
  return useSyncExternalStore(
    subscribeUserMedia,
    listSessionMedia,
    () => EMPTY_SESSION,
  );
}

function useSessionVideo() {
  return useSyncExternalStore(
    subscribeSessionVideo,
    getSessionVideo,
    () => null,
  );
}

function ThumbShell({
  src,
  title,
  active,
  disabled,
  onSelect,
  onRemove,
}: {
  src: string | null;
  title: string;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        title={title}
        aria-pressed={active}
        onClick={onSelect}
        className={cn(
          "relative aspect-video w-full overflow-hidden border bg-screen",
          active ? "border-cyan" : "border-signal hover:border-cyan/70",
          "disabled:opacity-40",
        )}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full items-center justify-center text-[8px] text-muted">
            …
          </span>
        )}
      </button>
      <button
        type="button"
        disabled={disabled}
        title="Remove"
        onClick={(e) => {
          e.stopPropagation();
          onRemove();
        }}
        className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center border border-signal bg-screen text-[9px] text-muted hover:border-danger hover:text-danger"
      >
        ×
      </button>
    </div>
  );
}

function LibraryThumb({
  id,
  active,
  disabled,
  onSelect,
  onRemove,
}: {
  id: string;
  active: boolean;
  disabled?: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const entry = getMediaLibraryEntry(id);

  useEffect(() => {
    let dead = false;
    void getMediaPreviewObjectUrl(id).then((url) => {
      if (!dead) setSrc(url);
    });
    return () => {
      dead = true;
    };
  }, [id]);

  return (
    <ThumbShell
      src={src}
      title={entry?.url ?? id}
      active={active}
      disabled={disabled}
      onSelect={onSelect}
      onRemove={onRemove}
    />
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
  enableVideo = false,
}: MediaFieldProps) {
  const urlInputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const library = useLibrary();
  const session = useSession();
  const video = useSessionVideo();
  const [urlDraft, setUrlDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoMaxMb = Math.round(SESSION_VIDEO_MAX_BYTES / (1024 * 1024));

  const stockSrc =
    value.kind === "stock"
      ? (stocks.find((s) => s.id === value.id)?.src ?? stocks[0]?.src ?? null)
      : null;

  const [libThumb, setLibThumb] = useState<string | null>(null);
  useEffect(() => {
    let dead = false;
    if (value.kind === "library") {
      void getMediaPreviewObjectUrl(value.id).then((url) => {
        if (!dead) setLibThumb(url);
      });
    } else if (value.kind === "session") {
      setLibThumb(getSessionMediaEntry(value.id)?.previewUrl ?? null);
    } else if (value.kind === "video") {
      setLibThumb(getSessionVideo()?.objectUrl ?? null);
    } else {
      setLibThumb(null);
    }
    return () => {
      dead = true;
    };
  }, [value, video]);

  const previewSrc =
    value.kind === "stock"
      ? stockSrc
      : libThumb;

  const caption =
    value.kind === "library"
      ? (getMediaLibraryEntry(value.id)?.name ?? "library")
      : value.kind === "session"
        ? `${getSessionMediaEntry(value.id)?.name ?? "file"} · session`
        : value.kind === "video"
          ? `${getSessionVideo()?.name ?? "video"} · video`
          : `stock ${value.id}`;

  const pickVideo = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    await run(async () => {
      const entry = await setSessionVideoFromFile(file);
      onChange({ kind: "video", id: entry.id });
    });
  };

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

  const loadUrl = async () => {
    const u = urlDraft.trim();
    if (!u) return;
    await run(async () => {
      const entry = await addMediaFromUrl(u);
      onChange({ kind: "library", id: entry.id });
      setUrlDraft("");
    });
  };

  const pickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    await run(async () => {
      const room = SESSION_MEDIA_MAX - sessionMediaCount();
      const added = await addSessionMediaFromFiles(files);
      const last = added[added.length - 1];
      if (last) onChange({ kind: "session", id: last.id });
      if (files.length > added.length) {
        const skipped = files.length - added.length;
        setError(
          room <= 0
            ? `Session full (${SESSION_MEDIA_MAX} max)`
            : `Added ${added.length}; skipped ${skipped} (limit ${SESSION_MEDIA_MAX} or non-images)`,
        );
      }
    });
  };

  const libCount = mediaLibraryCount();
  const sessCount = sessionMediaCount();
  const stockFallback = stocks[0]?.id ?? "1";

  return (
    <div className={cn(fieldRoot, fieldBlock, "sm:max-w-72", className)}>
      <div className={fieldLabelRow}>
        <FieldLabel label={label} info={info} />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-stretch gap-2">
          <div
            className="relative h-14 w-20 shrink-0 overflow-hidden border border-signal bg-screen"
            aria-hidden
          >
            {previewSrc && value.kind === "video" ? (
              // eslint-disable-next-line jsx-a11y/media-has-caption
              <video
                src={previewSrc}
                muted
                playsInline
                className="h-full w-full object-cover"
              />
            ) : previewSrc ? (
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
          <p className="min-w-0 flex-1 self-center truncate font-mono text-[9px] normal-case tracking-normal text-signal/80">
            {caption}
          </p>
        </div>

        {stocks.length > 0 ? (
          <div>
            <p className="mb-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
              stock
            </p>
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
                    onClick={() => onChange({ kind: "stock", id: s.id })}
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
          </div>
        ) : null}

        <div>
          <p className="mb-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
            library urls · {libCount}/{MEDIA_LIBRARY_MAX}
          </p>
          {library.length > 0 ? (
            <div className="mb-1 grid grid-cols-4 gap-1.5">
              {library.map((e) => (
                <LibraryThumb
                  key={e.id}
                  id={e.id}
                  active={value.kind === "library" && value.id === e.id}
                  disabled={disabled || busy}
                  onSelect={() => onChange({ kind: "library", id: e.id })}
                  onRemove={() =>
                    void run(async () => {
                      const was =
                        value.kind === "library" && value.id === e.id;
                      await removeMediaLibraryEntry(e.id);
                      if (was) {
                        onChange({ kind: "stock", id: stockFallback });
                      }
                    })
                  }
                />
              ))}
            </div>
          ) : null}
          <div className="flex gap-1">
            <input
              id={urlInputId}
              type="url"
              value={urlDraft}
              disabled={disabled || busy || libCount >= MEDIA_LIBRARY_MAX}
              placeholder="https://… (cors)"
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
              disabled={
                disabled ||
                busy ||
                !urlDraft.trim() ||
                libCount >= MEDIA_LIBRARY_MAX
              }
              className={cn(panelButtonClassName, "px-2 py-1 shadow-none")}
              onClick={() => void loadUrl()}
            >
              add
            </button>
          </div>
        </div>

        <div>
          <p className="mb-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
            local · session only · {sessCount}/{SESSION_MEDIA_MAX}
          </p>
          <p className="mb-1 font-mono text-[9px] normal-case leading-snug tracking-normal text-muted/80">
            Multi-select up to {SESSION_MEDIA_MAX}. Session only — cleared on
            refresh.
          </p>
          {session.length > 0 ? (
            <div className="mb-1 grid grid-cols-4 gap-1.5">
              {session.map((e) => (
                <ThumbShell
                  key={e.id}
                  src={e.previewUrl}
                  title={`${e.name} (session)`}
                  active={value.kind === "session" && value.id === e.id}
                  disabled={disabled || busy}
                  onSelect={() => onChange({ kind: "session", id: e.id })}
                  onRemove={() => {
                    const was = value.kind === "session" && value.id === e.id;
                    removeSessionMedia(e.id);
                    if (was) onChange({ kind: "stock", id: stockFallback });
                  }}
                />
              ))}
            </div>
          ) : null}
          <button
            type="button"
            disabled={disabled || busy || sessCount >= SESSION_MEDIA_MAX}
            className={cn(panelButtonClassName, "px-2 py-1 shadow-none")}
            onClick={() => fileRef.current?.click()}
          >
            upload local
          </button>
        </div>

        {enableVideo ? (
          <div>
            <p className="mb-0.5 font-mono text-[8px] uppercase tracking-[0.16em] text-muted">
              video · session · {video ? 1 : 0}/{SESSION_VIDEO_MAX}
            </p>
            <p className="mb-1 font-mono text-[9px] normal-case leading-snug tracking-normal text-muted/80">
              One clip, max {videoMaxMb} MB. Turns off slideshow / track
              change. Sync pushes the file to peer tabs (can hitch on big
              clips).
            </p>
            {video ? (
              <div className="mb-1 grid grid-cols-4 gap-1.5">
                <div className="relative">
                  <button
                    type="button"
                    disabled={disabled || busy}
                    title={`${video.name} (video)`}
                    aria-pressed={
                      value.kind === "video" && value.id === video.id
                    }
                    onClick={() =>
                      onChange({ kind: "video", id: video.id })
                    }
                    className={cn(
                      "relative aspect-video w-full overflow-hidden border bg-screen",
                      value.kind === "video" && value.id === video.id
                        ? "border-cyan"
                        : "border-signal hover:border-cyan/70",
                      "disabled:opacity-40",
                    )}
                  >
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video
                      src={video.objectUrl}
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                  </button>
                  <button
                    type="button"
                    disabled={disabled || busy}
                    title="Remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      const was =
                        value.kind === "video" && value.id === video.id;
                      removeSessionVideo(video.id);
                      if (was) {
                        onChange({ kind: "stock", id: stockFallback });
                      }
                    }}
                    className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center border border-signal bg-screen text-[9px] text-muted hover:border-danger hover:text-danger"
                  >
                    ×
                  </button>
                </div>
              </div>
            ) : null}
            <button
              type="button"
              disabled={disabled || busy}
              className={cn(panelButtonClassName, "px-2 py-1 shadow-none")}
              onClick={() => videoRef.current?.click()}
            >
              {video ? "replace video" : "upload video"}
            </button>
          </div>
        ) : null}

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
        multiple
        className="hidden"
        onChange={(e) => {
          void pickFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {enableVideo ? (
        <input
          ref={videoRef}
          type="file"
          accept="video/*,.mp4,.webm,.ogg,.mov,.m4v"
          className="hidden"
          onChange={(e) => {
            void pickVideo(e.target.files);
            e.target.value = "";
          }}
        />
      ) : null}
    </div>
  );
}
