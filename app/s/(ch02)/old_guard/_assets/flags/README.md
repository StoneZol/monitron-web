# Old Guard — default flags

Drop Napoleonic-era flag art here (replace the stripe placeholders):

| File       | Empire         |
| ---------- | -------------- |
| `RI.webp`  | Russian Empire |
| `FR.webp`  | France         |
| `PR.webp`  | Prussia        |
| `AVS.webp` | Austria        |
| `ENG.webp` | England        |
| `ISP.webp` | Spain          |

**Format:** `.webp` (preferred). PNG also works if you change the imports in `../_components/Oldguard/Oldguard.flags.ts`.

These live next to the screen (not in `/public`). Next bundles them via static `import` — `TextureLoader` gets a hashed `/_next/static/media/…` URL. User uploads / URL flags still go through MediaField (session / library) like Wet Glass — any browser-decodable image (webp/png/jpeg) is fine there.
