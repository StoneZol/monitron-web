#!/usr/bin/env node
/**
 * Decode a monitron share key → JSON prefs (for setting screen defaults).
 *
 *   node scripts/decode-share.mjs 'monitron:1:[screen]:…'
 *   node scripts/decode-share.mjs   # then paste key, Enter, Ctrl+D / Ctrl+Z
 *   npm run decode-share -- 'monitron:1:[…]:…'
 *
 * Same seal as lib/screenShare.ts (SHARE_SECRET / noiseLength 12).
 */
import { createInterface } from "node:readline";
import { libertyCore } from "liberty-core";

const SHARE_SECRET = "monitron-share-v1-easter-egg";
const NOISE_LENGTH = 12;
const HEAD = "monitron:1:";

function decode(raw) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) throw new Error("empty key");
  if (!trimmed.startsWith(HEAD)) {
    throw new Error(`expected key starting with ${HEAD}`);
  }
  const libertyPart = trimmed.slice(HEAD.length);
  const clan = /^\[([^\]]+)\]:/.exec(libertyPart);
  if (!clan) throw new Error("missing [screenId]: clan point");

  const plain = libertyCore.message.decrypt({
    message: libertyPart,
    key: SHARE_SECRET,
    noiseLength: NOISE_LENGTH,
  });
  const prefs = JSON.parse(plain);
  return { screenId: clan[1], prefs };
}

async function readStdin() {
  const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });
  const lines = [];
  for await (const line of rl) lines.push(line);
  return lines.join("\n");
}

const arg = process.argv.slice(2).join(" ").trim();
const key = arg || (await readStdin()).trim();

try {
  const { screenId, prefs } = decode(key);
  console.log(`# screen: ${screenId}`);
  console.log(JSON.stringify(prefs, null, 2));
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
