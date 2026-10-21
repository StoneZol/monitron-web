/**
 * Same-origin proxy for external library images.
 * Browser fetch/TextureLoader hit CORS / hotlink 403 in prod;
 * /api/media-proxy pulls server-side and re-serves.
 */

export const MEDIA_PROXY_PATH = "/api/media-proxy";
export const MEDIA_PROXY_MAX_BYTES = 12 * 1024 * 1024;

/** Client URL that loads `remote` through our proxy (or passthrough for blob/data/relative). */
export function proxiedMediaUrl(remote: string): string {
  const t = remote.trim();
  if (!t) return t;
  if (
    t.startsWith("blob:") ||
    t.startsWith("data:") ||
    t.startsWith("/") ||
    t.startsWith("./")
  ) {
    return t;
  }
  try {
    const u = new URL(t);
    if (u.protocol !== "http:" && u.protocol !== "https:") return t;
    return `${MEDIA_PROXY_PATH}?url=${encodeURIComponent(u.toString())}`;
  } catch {
    return t;
  }
}

/** Reject private / loopback hosts (basic SSRF guard for the proxy route). */
export function assertPublicHttpUrl(raw: string): URL {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    throw new Error("Invalid URL");
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    throw new Error("Only http(s) URLs");
  }
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "metadata.google.internal" ||
    host === "metadata" ||
    /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.)/.test(host)
  ) {
    throw new Error("Blocked host");
  }
  return u;
}
