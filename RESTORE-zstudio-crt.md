# Zstudio CRT — restore / handoff

Recovered 2026-11-26 19:30 from conversation
`92af42f6a4c24d3597abbcf6a9c09c4e` ("Thomas Gertenbach About Page Recovery"),
which had itself recovered `ab365c021e544cd2973d9c126b844275` ("Understanding Thomas
Gertenbach's About Page") after that sandbox was removed mid-task.

## What is here

`/workspace/project` is the git repo `rohitchandru418-svg/zstudio-crt`.

```
ac49a2d glow: confine the tube rim to the Marvin screen, fire one ring per reply
5c5dba5 papers: a standalone port of the print stack
6ab64a8 Give the tube a rim that turns
3971f60 Tooltip lines, oryzo's exact glow, faces for Marvin
fb4d947 Open the assistant inside the tube
9e22ff4 Keep the glass off the repaint, and hold a curtain while it boots
b69c2de Give the paper a material                             <- what main/onrender.com serve
```

Everything after `b69c2de` existed only locally until this push: GitHub `main` and
https://zstudio-crt.onrender.com were still at the 09:48 state (no Marvin panel, no
perf work, no oryzo glow). Pushing `master` to `main` and triggering a Render deploy
publishes it.

Untracked, kept as reference: `.oryzo-ref/` (oryzo's `hoisted.js` + CSS, the shader
source the tube rim is derived from).

## Publish it

```sh
git push https://<classic-PAT-with-repo-scope>@github.com/rohitchandru418-svg/zstudio-crt.git master:main
# then clear the CDN, else static assets stay stale for ~5 min:
curl -s -X POST https://api.render.com/v1/services/srv-dc3tiolg1s2s73cmmdf0/deploys \
  -H "Authorization: Bearer <render-key>" -H "Content-Type: application/json" \
  -d '{"clearCache":"clear"}'
```

The `GITHUB_TOKEN` in this sandbox is a read-only GitHub App token: `git push` and
`POST /git/refs` both return `403`, even though the REST API advertises
`permissions.push: true`. A classic PAT is required.

## Artifacts on this volume

- `zstudio-crt.bundle` — `git bundle --all`, verified by cloning and diffing.
- `zstudio-crt-site.zip` — the deployable files (`crt-screen/*` + `render.yaml`).

`crt-screen/_papers.html` is the standalone port of thomasgertenbach.com's print stack
(WebGL2 + three.js r170; his scene is WebGPU). Constants and material values are copied
from his `sceneControlDefaults`; see the header comment in the file.

## Run it

```sh
cd crt-screen && setsid nohup python3 -m http.server 12000 --bind 0.0.0.0 \
  > /tmp/crt-server.log 2>&1 < /dev/null &
```

No build step, no dependencies. `?_applefx` and `_papers.html` are standalone probes,
linked from nowhere; `crt-screen/vendor/three.module.js` is only there for `_papers.html`
(the site itself is dependency-free).
