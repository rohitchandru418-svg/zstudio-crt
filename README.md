# Zstudio — CRT convex screen

A Zstudio landing page built inside the extracted convex-screen shape from galekto.com,
inspired by thomasgertenbach.com.

## Stack

Plain HTML, CSS and Canvas 2D. No build step, no dependencies, no framework.

- `index.html` — page structure, CRT layers, Zstudio content
- `crt-screen.css` / `crt-screen.js` — the barrel clip-path glass and its shading
- `landing.css` / `landing.js` — layout, hero, card field, drag/click, wind, dust, audio

## Local

```sh
cd crt-screen && python3 -m http.server 12000
```

## Deploy

`render.yaml` defines a static site publishing `./crt-screen`.

- Build command: none
- Publish directory: `crt-screen`
- Branch: `zstudio-crt`
