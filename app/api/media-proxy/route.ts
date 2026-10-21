import { NextRequest, NextResponse } from "next/server";
import {
  MEDIA_PROXY_MAX_BYTES,
  assertPublicHttpUrl,
} from "@/lib/mediaProxy";

export const runtime = "nodejs";

const UA =
  "Mozilla/5.0 (compatible; MonitronMediaProxy/1.0; +https://monitron.app)";

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  if (!raw) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  let target: URL;
  try {
    target = assertPublicHttpUrl(raw);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Bad url" },
      { status: 400 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      method: "GET",
      redirect: "follow",
      headers: {
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        "User-Agent": UA,
      },
      // No Referer — many CDNs 403 hotlinks by Referer
      cache: "force-cache",
    });
  } catch {
    return NextResponse.json({ error: "Upstream fetch failed" }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Upstream ${upstream.status}` },
      { status: upstream.status === 404 ? 404 : 502 },
    );
  }

  const contentType = upstream.headers.get("content-type") || "";
  if (contentType && !contentType.startsWith("image/")) {
    return NextResponse.json(
      { error: "Not an image" },
      { status: 415 },
    );
  }

  const lenHeader = upstream.headers.get("content-length");
  if (lenHeader) {
    const n = Number(lenHeader);
    if (Number.isFinite(n) && n > MEDIA_PROXY_MAX_BYTES) {
      return NextResponse.json({ error: "Image too large" }, { status: 413 });
    }
  }

  const buf = Buffer.from(await upstream.arrayBuffer());
  if (buf.byteLength > MEDIA_PROXY_MAX_BYTES) {
    return NextResponse.json({ error: "Image too large" }, { status: 413 });
  }
  if (buf.byteLength === 0) {
    return NextResponse.json({ error: "Empty image" }, { status: 502 });
  }

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType || "application/octet-stream",
      "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
