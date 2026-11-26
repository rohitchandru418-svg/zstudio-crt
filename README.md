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

## Deploy to Render

`render.yaml` describes a static site that publishes `./crt-screen`. There is no build
step, no dependencies, and no server — Render serves the files as they are.

1. Push this repo to GitHub.
2. Render dashboard → **New → Blueprint** → pick the repo → **Apply**.

Or create the service by hand: **New → Static Site**, connect the repo, leave
**Build Command** empty, set **Publish Directory** to `crt-screen`.

Service type: `web` · runtime: `static` · plan: Free.
