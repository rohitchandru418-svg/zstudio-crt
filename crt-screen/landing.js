/* ============================================================
   Zstudio — cards, wind, sound, menu
   Cards are drawn on a 2D canvas under the CRT glass.
   ============================================================ */
(function () {
  'use strict';

  var canvas   = document.getElementById('cards');
  var ctx      = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  var heroEl   = document.querySelector('.hero');
  var slotEl   = document.getElementById('slot');
  var topEl    = document.querySelector('.hud__top');
  var soundBtn = document.getElementById('soundToggle');
  var menuEl   = document.getElementById('menu');
  var menuBtn  = document.getElementById('menuOpen');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  var WORKS = [
    {
      title: 'Halcyon', year: '2026', kind: 'Web \u00b7 Identity',
      blurb: 'A slow-reading index for an architecture practice. Plans unfold as you scroll; nothing announces itself until you stop.'
    },
    {
      title: 'Meridian', year: '2026', kind: 'Web \u00b7 Product',
      blurb: 'Ticketing for a chamber music festival, built around one long scroll and a seating plan that breathes.'
    },
    {
      title: 'Vellum', year: '2025', kind: 'Web \u00b7 Editorial',
      blurb: 'A reading room for a small press. One typeface, real paper grain, and a column that never fights the text.'
    },
    {
      title: 'Quarry', year: '2025', kind: 'Web \u00b7 Archive',
      blurb: 'A materials library: 240 stone samples, each photographed under the same lamp so the comparison is honest.'
    },
    {
      title: 'Signal', year: '2024', kind: 'Web \u00b7 Audio',
      blurb: 'An archive of field recordings, played back through a waveform drawn by hand and set in motion by the sound.'
    },
    {
      title: 'Terrain', year: '2024', kind: 'Web \u00b7 Interactive',
      blurb: 'A mapping tool for walking artists. A route becomes an elevation profile you can read at a glance.'
    }
  ];

  /* ------------------------------------------------------------
     helpers
     ------------------------------------------------------------ */
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a += 0x6D2B79F5;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* ------------------------------------------------------------
     placeholder artwork — one hue, six compositions
     ------------------------------------------------------------ */
  var grain = (function () {
    var c = document.createElement('canvas');
    c.width = 128; c.height = 160;
    var g = c.getContext('2d');
    var img = g.createImageData(128, 160);
    var rnd = mulberry32(7);
    for (var i = 0; i < img.data.length; i += 4) {
      var v = (rnd() * 255) | 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  })();

  function light(a) { return 'rgba(234,229,219,' + a + ')'; }

  function finish(g, W, H) {
    var v = g.createRadialGradient(W * 0.5, H * 0.44, Math.min(W, H) * 0.18, W * 0.5, H * 0.44, Math.max(W, H) * 0.8);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.58)');
    g.fillStyle = v;
    g.fillRect(0, 0, W, H);

    var s = g.createLinearGradient(0, 0, W * 0.7, H * 0.7);
    s.addColorStop(0, 'rgba(255,248,236,0.10)');
    s.addColorStop(0.55, 'rgba(255,248,236,0)');
    g.fillStyle = s;
    g.fillRect(0, 0, W, H);

    g.save();
    g.globalAlpha = 0.06;
    g.globalCompositeOperation = 'overlay';
    g.drawImage(grain, 0, 0, W, H);
    g.restore();
  }

  function artwork(index, W, H, rnd) {
    var c = document.createElement('canvas');
    c.width = W; c.height = H;
    var g = c.getContext('2d');
    g.fillStyle = '#17140f';
    g.fillRect(0, 0, W, H);

    var i, k, x, y, d, r, rg;

    if (index === 0) {
      /* arcs */
      var cx = W * (0.14 + rnd() * 0.3);
      var cy = H * (0.74 + rnd() * 0.22);
      for (k = 16; k >= 1; k -= 1) {
        g.beginPath();
        g.arc(cx, cy, k * W * 0.052, Math.PI * 1.02, Math.PI * 1.98);
        g.lineWidth = W * 0.013;
        g.strokeStyle = light(0.05 + k * 0.016);
        g.stroke();
      }
    } else if (index === 1) {
      /* bars */
      x = -W * 0.1;
      while (x < W * 1.1) {
        var bw = W * (0.015 + rnd() * 0.085);
        g.fillStyle = light(0.03 + rnd() * 0.24);
        g.fillRect(x, 0, bw, H);
        x += bw + W * (0.008 + rnd() * 0.05);
      }
    } else if (index === 2) {
      /* sphere */
      var sx = W * 0.5, sy = H * 0.44, sr = W * 0.33;
      rg = g.createRadialGradient(sx - sr * 0.42, sy - sr * 0.46, sr * 0.06, sx, sy, sr);
      rg.addColorStop(0, light(0.62));
      rg.addColorStop(0.5, light(0.26));
      rg.addColorStop(1, 'rgba(0,0,0,0.18)');
      g.fillStyle = rg;
      g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.fill();
      g.strokeStyle = light(0.34);
      g.lineWidth = 1.2;
      g.beginPath(); g.arc(sx, sy, sr, 0, Math.PI * 2); g.stroke();
    } else if (index === 3) {
      /* lattice */
      g.strokeStyle = light(0.12);
      g.lineWidth = 1;
      for (d = -H; d < W + H; d += 17) {
        g.beginPath(); g.moveTo(d, 0); g.lineTo(d + H, H); g.stroke();
        g.beginPath(); g.moveTo(d, H); g.lineTo(d + H, 0); g.stroke();
      }
      rg = g.createRadialGradient(W * 0.5, H * 0.4, 0, W * 0.5, H * 0.4, W * 0.85);
      rg.addColorStop(0, light(0.26));
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);
    } else if (index === 4) {
      /* halftone */
      var step = W * 0.042;
      for (y = step / 2; y < H; y += step) {
        for (x = step / 2; x < W; x += step) {
          var dx = (x - W * 0.46) / W;
          var dy = (y - H * 0.42) / H;
          d = Math.sqrt(dx * dx + dy * dy);
          r = Math.max(0, (0.6 - d) * step * 0.95);
          if (r > 0.2) {
            g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
            g.fillStyle = light(0.38);
            g.fill();
          }
        }
      }
    } else {
      /* bands */
      var freq = 3 + rnd() * 3;
      var phase = rnd() * 6.28;
      for (y = 0; y < H; y += 2) {
        var t = y / H;
        var a = 0.05 + 0.2 * (0.5 + 0.5 * Math.sin(t * Math.PI * freq + phase));
        g.fillStyle = light(a);
        g.fillRect(0, y, W, 2);
      }
      g.fillStyle = light(0.62);
      g.fillRect(0, H * 0.53, W, 1.4);
    }

    finish(g, W, H);
    return c;
  }

  /* ------------------------------------------------------------
     card surface: paper, photo, caption
     ------------------------------------------------------------ */
  var DPR = Math.min(2, window.devicePixelRatio || 1);

  function buildCard(work, index, cw, ch) {
    var c = document.createElement('canvas');
    c.width = Math.round(cw * 2);
    c.height = Math.round(ch * 2);
    var g = c.getContext('2d');
    g.scale(2, 2);

    /* stock is never a flat fill: it falls warm to cool, and it has a fibre */
    var paper = g.createLinearGradient(0, 0, cw * 0.22, ch);
    paper.addColorStop(0, '#f3eee5');
    paper.addColorStop(0.55, '#e9e4da');
    paper.addColorStop(1, '#ddd7ca');
    g.fillStyle = paper;
    g.fillRect(0, 0, cw, ch);

    var fib = mulberry32(77 + index * 131);
    g.globalAlpha = 0.05;
    for (var f = 0; f < 1100; f += 1) {
      g.fillStyle = fib() > 0.5 ? '#ffffff' : '#3a342b';
      g.fillRect(fib() * cw, fib() * ch, 0.7, 0.7);
    }
    g.globalAlpha = 1;

    g.strokeStyle = 'rgba(0,0,0,0.10)';
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, cw - 1, ch - 1);

    var pad = cw * 0.055;
    var pw = cw - pad * 2;
    var ph = ch - pad - cw * 0.215;

    var rnd = mulberry32(1013 + index * 7919);
    var art = artwork(index, 640, Math.round(640 * ph / pw), rnd);

    g.save();
    g.beginPath();
    g.rect(pad, pad, pw, ph);
    g.clip();
    g.drawImage(art, pad, pad, pw, ph);
    g.restore();

    g.strokeStyle = 'rgba(0,0,0,0.16)';
    g.lineWidth = 0.8;
    g.strokeRect(pad, pad, pw, ph);

    /* the print sits a hair below the surface, so the paper shades it */
    var well = g.createLinearGradient(0, pad, 0, pad + ch * 0.045);
    well.addColorStop(0, 'rgba(12,10,8,0.34)');
    well.addColorStop(1, 'rgba(12,10,8,0)');
    g.fillStyle = well;
    g.fillRect(pad, pad, pw, ch * 0.045);

    var lip = g.createLinearGradient(0, pad + ph - ch * 0.03, 0, pad + ph);
    lip.addColorStop(0, 'rgba(255,250,240,0)');
    lip.addColorStop(1, 'rgba(255,250,240,0.20)');
    g.fillStyle = lip;
    g.fillRect(pad, pad + ph - ch * 0.03, pw, ch * 0.03);

    /* the cut edge, and the shade under it */
    g.fillStyle = 'rgba(0,0,0,0.16)';
    g.fillRect(0, ch - 1.6, cw, 1.6);

    var baseY = ch - cw * 0.105;
    g.textBaseline = 'middle';
    g.font = '500 ' + Math.max(7.5, cw * 0.05).toFixed(1) + 'px "JetBrains Mono", ui-monospace, monospace';
    g.fillStyle = '#2b2721';
    g.textAlign = 'left';
    g.fillText(work.title.toUpperCase(), pad, baseY);
    g.textAlign = 'right';
    g.fillStyle = 'rgba(43,39,33,0.5)';
    g.fillText(work.year, cw - pad, baseY);

    return c;
  }

  /* ------------------------------------------------------------
     cards
     ------------------------------------------------------------ */
  var cards = [];
  var cardCount = 6;
  var heroRect = null;
  var slotRect = null;
  var safe = null;
  var W = 0, H = 0;

  function makeCards(cw, count) {
    cards = WORKS.slice(0, count).map(function (work, i) {
      var ch = cw * 1.22;
      return {
        work: work, i: i, w: cw, h: ch,
        canvas: buildCard(work, i, cw, ch),
        shadowSoft: softRect(cw, ch, 9),
        shadowCast: softRect(cw, ch, 26),
        x: 0, y: 0, hx: 0, hy: 0,
        tx: 0, ty: 0, hrot: 0, trot: 0,
        rot: 0, tilt: 0,
        vx: 0, vy: 0, vrot: 0,
        lift: 0, liftV: 0, ax: 0, ay: 0, asway: 0, lx: 0, ly: 0, lxT: 0, lyT: 0,
        bend: 0, bendV: 0, yaw: 0, pitch: 0,
        yaw0: ((i % 3) - 1) * 0.035 + (i % 2 ? 0.012 : -0.012),
        pitch0: ((i % 4) - 1.5) * 0.018,
        hover: false, drag: false, home: true,
        grabX: 0, grabY: 0,
        reveal: 1, placed: false, openOnArrive: false
      };
    });
  }

  var ANCHORS = {
    desktop: [
      [-0.62, -0.38, -4], [-0.80, 0.30, 5],
      [ 0.62, -0.40, 3],  [ 0.80, 0.24, -5],
      [-0.20, -0.84, -2], [ 0.28, 0.86, 4]
    ],
    tablet: [
      [-0.74, -0.52, -4], [ 0.74, -0.56, 5],
      [-0.76, 0.32, 3],   [ 0.76, 0.38, -5],
      [ 0.00, -0.90, 2],  [ 0.00, 0.88, 4]
    ],
    mobile: [
      [-0.80, -0.76, -4], [ 0.80, -0.68, 5],
      [ 0.82, 0.66, -5]
    ]
  };

  function aabb(c) {
    var co = Math.abs(Math.cos(c.hrot)), si = Math.abs(Math.sin(c.hrot));
    var hw = (c.w * co + c.h * si) / 2;
    var hh = (c.w * si + c.h * co) / 2;
    return { left: c.hx - hw, right: c.hx + hw, top: c.hy - hh, bottom: c.hy + hh, cx: c.hx, cy: c.hy, hw: hw, hh: hh };
  }

  function rectOf(el, grow) {
    var r = el.getBoundingClientRect();
    return { left: r.left - grow, top: r.top - grow, right: r.right + grow, bottom: r.bottom + grow };
  }

  function layout() {
    W = window.innerWidth;
    H = window.innerHeight;

    var m = (window.crtScreen && window.crtScreen.metrics()) || { corner: 38 };
    var pad = Math.max(34, Math.min(W, H) * 0.052);
    safe = {
      left: m.corner + pad,
      top: m.corner + pad,
      right: W - m.corner - pad,
      bottom: H - m.corner - pad
    };

    var tier = W < 620 ? 'mobile' : W < 1024 ? 'tablet' : 'desktop';
    var cw = tier === 'desktop' ? clamp(150, Math.min(W, H) * 0.168, 190)
           : tier === 'tablet'  ? clamp(130, Math.min(W, H) * 0.19, 168)
           : clamp(98, W * 0.275, 136);

    document.documentElement.style.setProperty('--card-w', cw + 'px');
    document.documentElement.style.setProperty('--card-h', (cw * 1.22) + 'px');

    var count = tier === 'mobile' ? 3 : 6;
    cardCount = count;

    if (!cards.length || Math.abs(cards[0].w - cw) > 3 || cards.length !== count) {
      var old = cards;
      makeCards(cw, count);
      cards.forEach(function (c, i) {
        var o = old[i];
        if (o && o.placed) {
          c.x = o.x; c.y = o.y; c.rot = o.rot;
          c.home = o.home; c.reveal = o.reveal;
          c.placed = true;
        }
      });
    }

    var reserved = [rectOf(heroEl, 28), rectOf(topEl, 16)];
    heroRect = rectOf(heroEl, 14);
    if (slotEl && getComputedStyle(slotEl).display !== 'none') {
      reserved.push(rectOf(slotEl, 34));
    }

    var anchors = ANCHORS[tier];

    cards.forEach(function (c, i) {
      var a = anchors[i % anchors.length];
      c.hrot = (a[2] || 0) * Math.PI / 180;
      c.hx = safe.left + ((a[0] + 1) / 2) * (safe.right - safe.left);
      c.hy = safe.top + ((a[1] + 1) / 2) * (safe.bottom - safe.top);

      for (var pass = 0; pass < 4; pass += 1) {
        var b = aabb(c);
        c.hx = clamp(c.hx, safe.left + b.hw, safe.right - b.hw);
        c.hy = clamp(c.hy, safe.top + b.hh, safe.bottom - b.hh);

        for (var r = 0; r < reserved.length; r += 1) {
          var q = reserved[r];
          b = aabb(c);
          var ox = Math.min(b.right, q.right) - Math.max(b.left, q.left);
          var oy = Math.min(b.bottom, q.bottom) - Math.max(b.top, q.top);
          if (ox <= 0 || oy <= 0) continue;
          if (ox < oy) {
            c.hx += (b.cx < (q.left + q.right) / 2 ? -1 : 1) * (ox + 3);
          } else {
            c.hy += (b.cy < (q.top + q.bottom) / 2 ? -1 : 1) * (oy + 3);
          }
        }
      }

      if (c.home) {
        c.tx = c.hx; c.ty = c.hy; c.trot = c.hrot;
      }

      if (!c.placed) {
        c.x = c.tx; c.y = c.ty; c.rot = c.trot;
        c.placed = true;
      }
    });

    var frame = slotEl && slotEl.querySelector('.slot__frame');
    slotRect = null;
    if (frame && getComputedStyle(slotEl).display !== 'none') {
      var fr = frame.getBoundingClientRect();
      if (fr.width > 20) {
        slotRect = {
          cx: fr.left + fr.width / 2, cy: fr.top + fr.height / 2,
          w: fr.width, h: fr.height,
          left: fr.left, top: fr.top, right: fr.right, bottom: fr.bottom
        };
      }
    }

    cards.forEach(function (c) {
      if (c.home) return;
      if (!slotRect) { sendHome(c); return; }
      c.tx = slotRect.cx; c.ty = slotRect.cy; c.trot = 0;
    });
  }

  function resizeCanvas() {
    DPR = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    makeMotes();
  }

  /* ------------------------------------------------------------
     pointer + wind
     ------------------------------------------------------------ */
  var pointer = { x: -9999, y: -9999, vx: 0, vy: 0, t: 0 };
  var active = null;
  var WIND_R = 620;
  var AIR = 0.8;
  var AIR_PULL = 9;
  var TORQUE = 1.0;
  var K = 90, D = 8.0;
  var KR = 105, DR = 13;
  var SLOT_K = 170, SLOT_D = 16;

  function toLocal(c, px, py) {
    var dx = px - c.x, dy = py - c.y;
    var co = Math.cos(-c.rot), si = Math.sin(-c.rot);
    return { x: dx * co - dy * si, y: dx * si + dy * co };
  }

  function hit(c, px, py) {
    var p = toLocal(c, px, py);
    return Math.abs(p.x) <= c.w / 2 && Math.abs(p.y) <= c.h / 2;
  }

  function pick(px, py) {
    for (var i = 0; i < cards.length; i += 1) {
      if (!cards[i].home && hit(cards[i], px, py)) return cards[i];
    }
    for (var j = cards.length - 1; j >= 0; j -= 1) {
      if (cards[j].home && hit(cards[j], px, py)) return cards[j];
    }
    return null;
  }

  /* the conveyor: an endless strip of prints that cruises on its own.
     On the seam a card is fully off-screen both before and after, so the
     jump is never visible. */
  function stripX(c, off) {
    var period = W + c.w;
    var s = ((c.hx + off) % period + period) % period;
    if (s > W + c.w / 2) s -= period;
    return s;
  }

  function edgeFade(c) {
    var inside = Math.min(c.x + c.w / 2, W + c.w / 2 - c.x);
    return clamp(inside / (W * 0.12), 0, 1);
  }

  /* a print dissolves as it slides behind the headline, so the type never
     has to compete with it, then re-forms on the far side */
  function clearFade(c, r, gain) {
    if (!r) return 1;
    var ox = Math.min(c.x + c.w / 2, r.right) - Math.max(c.x - c.w / 2, r.left);
    var oy = Math.min(c.y + c.h / 2, r.bottom) - Math.max(c.y - c.h / 2, r.top);
    if (ox <= 0 || oy <= 0) return 1;
    return clamp(1 - (ox * oy) / (c.w * c.h) * gain, 0, 1);
  }

  function heroFade(c) { return clearFade(c, heroRect, 4.2); }

  /* the slot is a reader plate: a print passing over it dissolves rather than
     landing on top of whatever is already sitting there */
  function slotFade(c) {
    if (!slotRect) return 1;
    return clearFade(c, { left: slotRect.left - 10, right: slotRect.right + 10, top: slotRect.top - 10, bottom: slotRect.bottom + 10 }, 3.4);
  }

  function overSlot(c) {
    if (!slotRect) return false;
    var ox = Math.min(c.x + c.w / 2, slotRect.right) - Math.max(c.x - c.w / 2, slotRect.left);
    var oy = Math.min(c.y + c.h / 2, slotRect.bottom) - Math.max(c.y - c.h / 2, slotRect.top);
    if (ox <= 0 || oy <= 0) return false;
    return (ox * oy) / (c.w * c.h) > 0.22;
  }

  function sendHome(c) {
    c.home = true;
    c.tx = stripX(c, cruise); c.ty = c.hy; c.trot = c.hrot;
    c.reveal = 1;
    if (!cards.some(function (o) { return !o.home; })) slotEl.classList.remove('is-filled');
  }

  function place(c) {
    if (!slotRect) return;
    cards.forEach(function (o) { if (o !== c && !o.home) sendHome(o); });
    if (c.home) c.reveal = 0;
    c.home = false;
    c.tx = slotRect.cx; c.ty = slotRect.cy; c.trot = 0;
    c.vx *= 0.3; c.vy *= 0.3; c.vrot = 0;
    slotEl.classList.add('is-filled');
    Sound.place();
  }

  var downX = 0, downY = 0, moved = false;

  function onMove(e) {
    var now = performance.now();
    var dt = Math.max(0.008, (now - pointer.t) / 1000);
    var nx = e.clientX, ny = e.clientY;

    if (pointer.t) {
      pointer.vx = clamp((nx - pointer.x) / dt, -3000, 3000);
      pointer.vy = clamp((ny - pointer.y) / dt, -3000, 3000);
    }
    pointer.x = nx; pointer.y = ny; pointer.t = now;

    if (active) {
      if (Math.abs(nx - downX) + Math.abs(ny - downY) > 6) moved = true;
      return;
    }

    var c = pick(nx, ny);
    cards.forEach(function (card) {
      card.hover = card === c;
      card.tilt = card === c ? clamp((nx - card.x) * 0.0006, -0.075, 0.075) : 0;
      card.lxT = card === c ? clamp((nx - card.x) / (card.w * 1.7), -1, 1) : 0;
      card.lyT = card === c ? clamp((ny - card.y) / (card.h * 1.7), -1, 1) : 0;
    });
    canvas.style.cursor = c ? 'grab' : 'default';
  }

  function onDown(e) {
    var c = pick(e.clientX, e.clientY);
    if (!c) return;
    active = c;
    downX = e.clientX; downY = e.clientY; moved = false;
    c.drag = true;
    lastInput = performance.now();
    c.grabX = c.x - e.clientX;
    c.grabY = c.y - e.clientY;
    canvas.style.cursor = 'grabbing';
    try { if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId); } catch (err) {}
    Sound.select();
  }

  function onUp(e) {
    if (!active) return;
    var c = active;
    active = null;
    c.drag = false;
    canvas.style.cursor = 'default';
    if (canvas.hasPointerCapture && e && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }

    lastInput = performance.now();

    if (!moved) {
      if (c.home) { place(c); c.openOnArrive = true; }
      else { Story.open(c); }
      return;
    }

    c.vx = clamp(c.vx, -2400, 2400);
    c.vy = clamp(c.vy, -2400, 2400);

    if (overSlot(c)) {
      place(c);
      c.openOnArrive = true;
    } else {
      sendHome(c);
      cruiseFling = clamp(c.vx, -1600, 1600);
    }
  }

  function onLeave() {
    pointer.vx = 0; pointer.vy = 0;
    pointer.x = -9999; pointer.y = -9999;
    pointer.t = 0;              /* no gust when the cursor re-enters */
  }

  /* ------------------------------------------------------------
     simulate
     ------------------------------------------------------------ */
  function collide(c) {
    if (!heroRect) return;
    var b = { left: c.x - c.w / 2, right: c.x + c.w / 2, top: c.y - c.h / 2, bottom: c.y + c.h / 2, cx: c.x, cy: c.y };
    var ox = Math.min(b.right, heroRect.right) - Math.max(b.left, heroRect.left);
    var oy = Math.min(b.bottom, heroRect.bottom) - Math.max(b.top, heroRect.top);
    if (ox <= 0 || oy <= 0) return;
    if (ox < oy) {
      c.x += (b.cx < (heroRect.left + heroRect.right) / 2 ? -1 : 1) * ox;
      c.vx *= 0.4;
    } else {
      c.y += (b.cy < (heroRect.top + heroRect.bottom) / 2 ? -1 : 1) * oy;
      c.vy *= 0.4;
    }
  }

  var windEnergy = 0;
  var windPan = 0;

  /* conveyor state. the constants are the reference carousel's: cruise at 7.5%
     of the strip height per second, friction 0.95 a frame, auto-advance easing
     back in 900ms after the last touch. */
  var cruise = 0;
  var cruiseAuto = 0;
  var cruiseFling = 0;
  var lastInput = -1e9;
  var storyOpen = false;

  function updateCruise(dt, now, calm) {
    var speed = H * 0.04;
    var cruising = now - lastInput > 900 && !storyOpen && !calm && !active;
    cruiseAuto += ((cruising ? speed : 0) - cruiseAuto) * (1 - Math.exp(-2.14 * dt));
    cruiseFling *= Math.exp(-3.08 * dt);
    if (Math.abs(cruiseFling) < 1) cruiseFling = 0;
    cruise += (cruiseAuto + cruiseFling) * dt;
  }

  var frameNow = 0;
  var calmNow = false;

  function simulate(dt, now) {
    frameNow = now;
    var decay = Math.exp(-11 * dt);
    pointer.vx *= decay;
    pointer.vy *= decay;

    windEnergy = 0;
    var calm = reduceMotion.matches;
    calmNow = calm;
    updateCruise(dt, now, calm);


    cards.forEach(function (c) {
      var stiff = c.home ? K : SLOT_K;
      var damp  = c.home ? D : SLOT_D;

      if (c.drag) {
        var tx = pointer.x + c.grabX;
        var ty = pointer.y + c.grabY;
        var f = 1 - Math.exp(-30 * dt);
        var nx = c.x + (tx - c.x) * f;
        var ny = c.y + (ty - c.y) * f;
        c.vx = (nx - c.x) / dt;
        c.vy = (ny - c.y) / dt;
        c.x = nx;
        c.y = ny;
      } else {
        if (c.home) {
          var onStrip = stripX(c, cruise);
          /* crossing the seam: shift the card with the target so the spring
             never drags it back across the screen */
          if (Math.abs(onStrip - c.tx) > (W + c.w) * 0.5) c.x += onStrip - c.tx;
          c.tx = onStrip;
        }
        c.vx += (c.tx - c.x) * stiff * dt;
        c.vy += (c.ty - c.y) * stiff * dt;
        c.vx *= Math.exp(-damp * dt);
        c.vy *= Math.exp(-damp * dt);

        if (c.home) {
          var dx = c.x - pointer.x;
          var dy = c.y - pointer.y;
          var dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < WIND_R) {
            var g = (1 - dist / WIND_R) * (calm ? 0.34 : 1);
            var ff = g * Math.sqrt(g);
            c.vx += (pointer.vx * AIR * ff - c.vx) * AIR_PULL * dt;
            c.vy += (pointer.vy * AIR * ff - c.vy) * AIR_PULL * dt;
            c.vrot += clamp((dx * pointer.vy - dy * pointer.vx) * ff * TORQUE / (c.w * c.w), -16, 16) * dt;
            windEnergy = Math.max(windEnergy, Math.sqrt(pointer.vx * pointer.vx + pointer.vy * pointer.vy) * ff);
            windPan = clamp(dx / 700, -1, 1);
          }
        }

        c.vx = clamp(c.vx, -4200, 4200);
        c.vy = clamp(c.vy, -4200, 4200);
        c.x += c.vx * dt;
        c.y += c.vy * dt;

      }

      if (c.reveal < 1) c.reveal = Math.min(1, c.reveal + dt / 0.9);

      /* arrive, don't creep: an asymptotic spring never quite stops, and a
         sub-pixel drift that lasts a second is exactly what reads as weight */
      if (!c.drag) {
        var ddx = c.tx - c.x, ddy = c.ty - c.y;
        if (Math.abs(ddx) < 1.2 && Math.abs(ddy) < 1.2 &&
            Math.abs(c.vx) < 14 && Math.abs(c.vy) < 14) {
          c.x = c.tx; c.y = c.ty; c.vx = 0; c.vy = 0;
        }
      }

      if (c.openOnArrive && !c.home && c.reveal >= 1 &&
          Math.abs(c.x - c.tx) < 2.5 && Math.abs(c.y - c.ty) < 2.5) {
        c.openOnArrive = false;
        Story.open(c);
      }

      var rotTarget = c.trot + (c.home ? c.tilt : 0);
      c.vrot += (rotTarget - c.rot) * KR * dt;
      c.vrot *= Math.exp(-DR * dt);
      c.rot += c.vrot * dt;
      if (Math.abs(rotTarget - c.rot) < 0.0015 && Math.abs(c.vrot) < 0.02) {
        c.rot = rotTarget; c.vrot = 0;
      }

      var liftTarget = c.drag ? 1.15 : c.hover ? 0.45 : 0;
      c.liftV += (liftTarget - c.lift) * 230 * dt;
      c.liftV *= Math.exp(-17 * dt);
      c.lift += c.liftV * dt;
      if (Math.abs(liftTarget - c.lift) < 0.004 && Math.abs(c.liftV) < 0.06) {
        c.lift = liftTarget; c.liftV = 0;
      }

      /* a still pointer must never mean a still scene: every print drifts
         on its own phase, and the drift fades out as the card is lifted */
      var calmK = calm ? 0.34 : 1;
      var amb = c.drag ? 0 : (1 - clamp(c.lift, 0, 1)) * calmK;
      c.ax = Math.sin(now * 0.00061 + c.i * 2.13) * 7.0 * amb;
      c.ay = Math.cos(now * 0.00047 + c.i * 1.41) * 9.0 * amb;
      c.asway = Math.sin(now * 0.00039 + c.i * 2.77) * 0.022 * amb;

      var lean = 1 - Math.exp(-13 * dt);
      c.lx += (c.lxT - c.lx) * lean;
      c.ly += (c.lyT - c.ly) * lean;

      /* the sheet turns to the light: the lean it takes from the pointer,
         and the shove it takes from being thrown, both feed the pose */
      var yawT = calm ? c.yaw0 : c.yaw0 + c.lx * 0.17 + Math.sin(now * 0.00043 + c.i * 1.9) * 0.02;
      var pitchT = calm ? c.pitch0 : c.pitch0 + c.ly * 0.13 + clamp(c.vx * 0.00016, -0.06, 0.06);
      var poseEase = 1 - Math.exp(-9 * dt);
      c.yaw += (yawT - c.yaw) * poseEase;
      c.pitch += (pitchT - c.pitch) * poseEase;
    });

    stepMotes(dt, now);
  }

  /* ------------------------------------------------------------
     dust — specks suspended in the tube, lit and drifting
     ------------------------------------------------------------ */
  var motes = [];

  function makeMotes() {
    motes = [];
    var n = Math.round(clamp((W * H) / 24000, 34, 120));
    for (var i = 0; i < n; i += 1) {
      var z = 0.3 + Math.random() * 0.7;
      motes.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: z,
        r: 0.6 + z * 1.7,
        a: 0.03 + Math.random() * 0.20,
        ph: Math.random() * Math.PI * 2,
        sp: 5 + Math.random() * 22,
        vx: 0, vy: 0
      });
    }
  }

  function stepMotes(dt, now) {
    var damp = Math.exp(-2.4 * dt);
    for (var i = 0; i < motes.length; i += 1) {
      var m = motes[i];
      var dx = m.x - pointer.x;
      var dy = m.y - pointer.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d < 300) {
        var f = 1 - d / 300;
        m.vx += pointer.vx * f * f * 0.22 * m.z * dt;
        m.vy += pointer.vy * f * f * 0.22 * m.z * dt;
      }
      m.vx *= damp;
      m.vy *= damp;
      m.x += m.vx * dt + Math.sin(now * 0.0004 + m.ph) * 7 * dt * m.z;
      m.y += m.vy * dt - m.sp * m.z * dt;
      if (m.y < -14) { m.y = H + 14; m.x = Math.random() * W; m.vx = 0; m.vy = 0; }
      if (m.x < -14) m.x = W + 14;
      else if (m.x > W + 14) m.x = -14;
    }
  }

  function drawMotes(now) {
    for (var i = 0; i < motes.length; i += 1) {
      var m = motes[i];
      var tw = 0.55 + 0.45 * Math.sin(now * 0.0009 * (0.5 + m.z) + m.ph);
      ctx.fillStyle = 'rgba(246,240,230,' + (m.a * tw).toFixed(3) + ')';
      ctx.fillRect(m.x, m.y, m.r, m.r);
    }
  }

  /* ------------------------------------------------------------
     draw
     ------------------------------------------------------------ */
  /* ------------------------------------------------------------
     the print as a sheet in space

     His cards are planes under a perspective camera with a shadow map
     and a clearcoat material. This is the 2D equivalent: the sheet is a
     projected quad, it casts its own silhouette, and the gloss moves
     with the turn.
     ------------------------------------------------------------ */
  var FOCAL = 1600, CAM = 1600;

  /* soft silhouette, built once — a cast shadow is the shape of the thing */
  function softRect(cw, ch, softness) {
    var pad = Math.ceil(softness * 2.2);
    var w = cw + pad * 2, h = ch + pad * 2;
    var k = Math.max(3, Math.round(softness * 0.75));

    var small = document.createElement('canvas');
    small.width = Math.max(4, Math.round(w / k));
    small.height = Math.max(4, Math.round(h / k));
    var sg = small.getContext('2d');
    sg.fillStyle = '#000';
    sg.fillRect(pad / k, pad / k, cw / k, ch / k);

    var mid = document.createElement('canvas');
    mid.width = Math.max(8, Math.round(w / 2));
    mid.height = Math.max(8, Math.round(h / 2));
    var mg = mid.getContext('2d');
    mg.imageSmoothingEnabled = true;
    mg.imageSmoothingQuality = 'high';
    mg.drawImage(small, 0, 0, mid.width, mid.height);

    var cv = document.createElement('canvas');
    cv.width = Math.round(w * 2);
    cv.height = Math.round(h * 2);
    var g = cv.getContext('2d');
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.scale(2, 2);
    g.drawImage(mid, 0, 0, w, h);
    return cv;
  }

  /* four corners of the sheet, projected */
  function cardQuad(c, cx, cy, rot, s) {
    var hw = (c.w / 2) * s, hh = (c.h / 2) * s;
    var cyaw = Math.cos(c.yaw), syaw = Math.sin(c.yaw);
    var cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    var cr = Math.cos(rot), sr = Math.sin(rot);
    var src = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
    var out = [];

    for (var i = 0; i < 4; i += 1) {
      var x = src[i][0], y = src[i][1];
      var x1 = x * cyaw;
      var z1 = -x * syaw;
      var y2 = y * cp - z1 * sp;
      var z2 = y * sp + z1 * cp;
      var k = FOCAL / (CAM + z2);
      var px = x1 * k, py = y2 * k;
      out.push([cx + px * cr - py * sr, cy + px * sr + py * cr]);
    }
    return out;
  }

  function pathQuad(q) {
    ctx.beginPath();
    ctx.moveTo(q[0][0], q[0][1]);
    ctx.lineTo(q[1][0], q[1][1]);
    ctx.lineTo(q[2][0], q[2][1]);
    ctx.lineTo(q[3][0], q[3][1]);
    ctx.closePath();
  }

  /* affine map taking a source triangle onto a destination triangle */
  function triMap(g, sx0, sy0, sx1, sy1, sx2, sy2, u0, u1, u2) {
    var den = (sx1 - sx2) * (sy0 - sy2) - (sx0 - sx2) * (sy1 - sy2);
    if (!den) return false;
    var a = ((u1[0] - u2[0]) * (sy0 - sy2) - (u0[0] - u2[0]) * (sy1 - sy2)) / den;
    var cc = ((u0[0] - u2[0]) * (sx1 - sx2) - (u1[0] - u2[0]) * (sx0 - sx2)) / den;
    var b = ((u1[1] - u2[1]) * (sy0 - sy2) - (u0[1] - u2[1]) * (sy1 - sy2)) / den;
    var d = ((u0[1] - u2[1]) * (sx1 - sx2) - (u1[1] - u2[1]) * (sx0 - sx2)) / den;
    g.transform(a, b, cc, d, u0[0] - a * sx0 - cc * sy0, u0[1] - b * sx0 - d * sy0);
    return true;
  }

  /* a projective warp, done as two affine halves. The first half is clipped
     to the whole sheet so the diagonal can never show a hairline */
  function warpQuad(img, q) {
    var w = img.width, h = img.height;

    ctx.save();
    pathQuad(q);
    ctx.clip();
    if (triMap(ctx, 0, 0, w, 0, 0, h, q[0], q[1], q[3])) ctx.drawImage(img, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(q[1][0], q[1][1]);
    ctx.lineTo(q[2][0], q[2][1]);
    ctx.lineTo(q[3][0], q[3][1]);
    ctx.closePath();
    ctx.clip();
    if (triMap(ctx, w, 0, w, h, 0, h, q[1], q[2], q[3])) ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  function drawCastShadow(c, liftN, rot, cx, cy, s) {
    var baseA = ctx.globalAlpha;
    var off = 3 + liftN * 52;
    var ox = off * 0.55, oy = off * 0.95;
    var wide = clamp(liftN, 0, 1);

    var cw1 = (c.shadowCast.width / 2) * (1 + wide * 0.12);
    var ch1 = (c.shadowCast.height / 2) * (1 + wide * 0.12);
    var cw2 = (c.shadowSoft.width / 2) * (1.015 + wide * 0.01);
    var ch2 = (c.shadowSoft.height / 2) * (1.015 + wide * 0.01);

    ctx.save();
    ctx.translate(cx + ox, cy + oy);
    ctx.rotate(rot);
    ctx.scale(s, s);

    /* the far shadow only exists once the sheet leaves the surface */
    ctx.globalAlpha = baseA * wide * 0.30;
    ctx.drawImage(c.shadowCast, -cw1 / 2, -ch1 / 2, cw1, ch1);

    ctx.globalAlpha = baseA * 0.48 * (1 - wide * 0.55);
    ctx.drawImage(c.shadowSoft, -cw2 / 2, -ch2 / 2, cw2, ch2);

    ctx.globalAlpha = baseA;
    ctx.restore();
  }

  function drawCard(c) {
    var fade = c.home ? Math.min(edgeFade(c), heroFade(c), slotFade(c)) : 1;
    if (fade < 1) ctx.globalAlpha = fade;

    var liftN = clamp(c.lift, 0, 1.2);
    var s = 1 + liftN * 0.075;
    var rot = c.rot + (c.asway || 0);
    var cx = c.x + (c.ax || 0);
    var cy = c.y + (c.ay || 0);

    drawCastShadow(c, liftN, rot, cx, cy, s);

    var q = cardQuad(c, cx, cy, rot, s);
    warpQuad(c.canvas, q);

    /* clearcoat: as the sheet turns away it catches the tube on one edge
       and falls into shade on the other */
    var turn = clamp(Math.abs(c.yaw) * 3.4 + liftN * 0.55, 0, 1);
    if (turn > 0.02) {
      var dir = c.yaw >= 0 ? 1 : -1;
      var gl = ctx.createLinearGradient(
        cx - c.w * 0.62 * dir, cy - c.h * 0.62,
        cx + c.w * 0.62 * dir, cy + c.h * 0.62
      );
      gl.addColorStop(0, 'rgba(255,250,240,' + (0.13 * turn).toFixed(3) + ')');
      gl.addColorStop(0.40, 'rgba(255,250,240,' + (0.03 * turn).toFixed(3) + ')');
      gl.addColorStop(0.62, 'rgba(0,0,0,' + (0.05 * turn).toFixed(3) + ')');
      gl.addColorStop(1, 'rgba(0,0,0,' + (0.22 * turn).toFixed(3) + ')');

      ctx.save();
      pathQuad(q);
      ctx.clip();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = gl;
      ctx.fillRect(cx - c.w, cy - c.h, c.w * 2, c.h * 2);
      ctx.restore();
    }

    /* a slow rake of tube light travels across the gloss — the print is never still */
    if (!calmNow) {
      var sweep = ((frameNow * 0.00006 + c.i * 0.17) % 1 + 1) % 1;
      var bx = cx - c.w * 0.7 + sweep * c.w * 1.4;
      var rake = ctx.createLinearGradient(bx - c.w * 0.30, cy - c.h * 0.5, bx + c.w * 0.30, cy + c.h * 0.5);
      rake.addColorStop(0, 'rgba(255,250,240,0)');
      rake.addColorStop(0.5, 'rgba(255,250,240,0.055)');
      rake.addColorStop(1, 'rgba(255,250,240,0)');

      ctx.save();
      pathQuad(q);
      ctx.clip();
      ctx.globalCompositeOperation = 'soft-light';
      ctx.fillStyle = rake;
      ctx.fillRect(cx - c.w, cy - c.h, c.w * 2, c.h * 2);
      ctx.restore();
    }

    /* reveal — a scan line develops the print as it lands in the slot */
    if (c.reveal < 1) {
      var bandY = cy - c.h / 2 + c.reveal * c.h;

      ctx.save();
      pathQuad(q);
      ctx.clip();
      ctx.fillStyle = 'rgba(6,5,4,0.84)';
      ctx.fillRect(cx - c.w, bandY, c.w * 2, c.h);

      var bg = ctx.createLinearGradient(0, bandY - c.h * 0.14, 0, bandY + c.h * 0.02);
      bg.addColorStop(0, 'rgba(255,250,240,0)');
      bg.addColorStop(0.72, 'rgba(255,250,240,0.30)');
      bg.addColorStop(1, 'rgba(255,250,240,0)');
      ctx.fillStyle = bg;
      ctx.fillRect(cx - c.w, bandY - c.h * 0.14, c.w * 2, c.h * 0.16);
      ctx.restore();
    }

    /* the cut edge of the paper, catching the light */
    ctx.save();
    ctx.strokeStyle = 'rgba(255,250,240,' + (0.06 + liftN * 0.16).toFixed(3) + ')';
    ctx.lineWidth = 1;
    pathQuad(q);
    ctx.stroke();
    ctx.restore();

    if (fade < 1) ctx.globalAlpha = 1;
  }

  function draw(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    drawMotes(now);

    var order = cards.slice().sort(function (a, b) {
      if (a.home !== b.home) return a.home ? -1 : 1;
      if (a.drag !== b.drag) return a.drag ? 1 : -1;
      return a.y - b.y;
    });

    for (var i = 0; i < order.length; i += 1) drawCard(order[i]);
  }

  /* ------------------------------------------------------------
     loop
     ------------------------------------------------------------ */
  var last = 0;
  var perf = { t0: 0, frames: 0, step: 0 };

  function adaptQuality(now) {
    if (perf.step >= 2) return;
    perf.frames += 1;
    if (!perf.t0) { perf.t0 = now; return; }
    var waited = now - perf.t0;
    if (waited < 1500) return;
    var fps = perf.frames / (waited / 1000);
    perf.frames = 0;
    perf.t0 = now;
    if (fps >= 44) return;
    perf.step += 1;
    if (perf.step === 1) {
      document.documentElement.classList.add('is-lean');
      motes.length = Math.floor(motes.length / 2);
    } else {
      DPR = 1.5;
      resizeCanvas();
    }
  }

  function frame(t) {
    var dt = last ? Math.min(0.033, (t - last) / 1000) : 0.016;
    last = t;
    adaptQuality(t);
    simulate(dt, t);
    draw(t);
    Sound.wind(windEnergy, windPan);
    requestAnimationFrame(frame);
  }

  /* ------------------------------------------------------------
     sound — synthesised, no assets
     ------------------------------------------------------------ */
  var Sound = (function () {
    var PREF = 'zstudio:sound';
    var ac = null, master = null, ambient = null;
    var windGain = null, windPan = null, windFilter = null;
    var enabled = false, built = false;

    function noise(seconds) {
      var len = Math.floor(ac.sampleRate * seconds);
      var buf = ac.createBuffer(2, len, ac.sampleRate);
      for (var ch = 0; ch < 2; ch += 1) {
        var data = buf.getChannelData(ch);
        var b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (var i = 0; i < len; i += 1) {
          var white = Math.random() * 2 - 1;
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
        }
      }
      return buf;
    }

    function build() {
      if (built) return;
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0;
      master.connect(ac.destination);

      ambient = ac.createGain();
      ambient.gain.value = 0.9;
      ambient.connect(master);

      [55, 82.5].forEach(function (f, i) {
        var o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.value = f;
        var g = ac.createGain();
        g.gain.value = i ? 0.016 : 0.026;
        o.connect(g);
        g.connect(ambient);
        o.start();
      });

      var bed = ac.createBufferSource();
      bed.buffer = noise(6);
      bed.loop = true;
      var lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420;
      lp.Q.value = 0.4;
      var bedGain = ac.createGain();
      bedGain.gain.value = 0.05;
      bed.connect(lp);
      lp.connect(bedGain);
      bedGain.connect(ambient);
      bed.start();

      var lfo = ac.createOscillator();
      lfo.frequency.value = 0.055;
      var lfoGain = ac.createGain();
      lfoGain.gain.value = 150;
      lfo.connect(lfoGain);
      lfoGain.connect(lp.frequency);
      lfo.start();

      var src = ac.createBufferSource();
      src.buffer = noise(4);
      src.loop = true;
      windFilter = ac.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 520;
      windFilter.Q.value = 0.8;
      windGain = ac.createGain();
      windGain.gain.value = 0;
      windPan = ac.createStereoPanner ? ac.createStereoPanner() : null;
      src.connect(windFilter);
      windFilter.connect(windGain);
      if (windPan) { windGain.connect(windPan); windPan.connect(master); }
      else { windGain.connect(master); }
      src.start();

      built = true;
    }

    function blip(freq, dur, type, gain) {
      if (!built || !enabled) return;
      var t = ac.currentTime;
      var o = ac.createOscillator();
      o.type = type || 'sine';
      o.frequency.value = freq;
      var g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain || 0.05, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(master);
      o.start(t);
      o.stop(t + dur + 0.02);
    }

    function paper(gain) {
      if (!built || !enabled) return;
      var t = ac.currentTime;
      var src = ac.createBufferSource();
      src.buffer = noise(0.12);
      var bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 2400;
      bp.Q.value = 1.1;
      var g = ac.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      src.connect(bp);
      bp.connect(g);
      g.connect(master);
      src.start(t);
      src.stop(t + 0.14);
    }

    function setPressed(on) {
      soundBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    }

    function enable() {
      build();
      if (!ac) return;
      if (ac.state === 'suspended') ac.resume();
      enabled = true;
      master.gain.cancelScheduledValues(ac.currentTime);
      master.gain.setTargetAtTime(0.62, ac.currentTime, 0.5);
      try { localStorage.setItem(PREF, '1'); } catch (e) {}
      paper(0.12);
      blip(330, 0.18, 'sine', 0.05);
      setPressed(true);
    }

    function disable() {
      enabled = false;
      if (ac) master.gain.setTargetAtTime(0.0001, ac.currentTime, 0.25);
      try { localStorage.setItem(PREF, '0'); } catch (e) {}
      setPressed(false);
    }

    soundBtn.addEventListener('click', function () {
      if (enabled) disable();
      else enable();
    });

    var wants = false;
    try { wants = localStorage.getItem(PREF) === '1'; } catch (e) {}
    if (wants) {
      setPressed(true);
      var kick = function () {
        window.removeEventListener('pointerdown', kick);
        window.removeEventListener('keydown', kick);
        if (!enabled) enable();
      };
      window.addEventListener('pointerdown', kick);
      window.addEventListener('keydown', kick);
    }

    return {
      enable: enable,
      disable: disable,
      select: function () { paper(0.1); },
      place: function () { paper(0.16); blip(392, 0.16, 'sine', 0.035); },
      hover: function () { paper(0.04); },
      wind: function (energy, pan) {
        if (!built || !windGain || !ac) return;
        var amount = enabled ? clamp(energy / 1500, 0, 1) : 0;
        var t = ac.currentTime;
        windGain.gain.setTargetAtTime(amount * amount * 0.22, t, 0.12);
        if (windPan) windPan.pan.setTargetAtTime(clamp(pan, -1, 1), t, 0.15);
        if (windFilter) windFilter.frequency.setTargetAtTime(420 + amount * 520, t, 0.2);
      }
    };
  })();

  /* ------------------------------------------------------------
     menu
     ------------------------------------------------------------ */
  /* ------------------------------------------------------------
     story — the card opens as a plate: same print, larger, with the work
     ------------------------------------------------------------ */
  var Story = (function () {
    var root = document.getElementById('story');
    var titleEl = document.getElementById('storyTitle');
    var metaEl = document.getElementById('storyMeta');
    var bodyEl = document.getElementById('storyBody');
    var closeBtn = root && root.querySelector('.story__close');
    var artHost = document.getElementById('storyArt');
    var lastFocus = null;

    function open(card) {
      if (!root || !card) return;
      var work = WORKS[card.i];
      if (!work) return;

      titleEl.textContent = work.title;
      metaEl.textContent = work.kind + '  \u00b7  ' + work.year;
      bodyEl.textContent = work.blurb;

      /* rebuilt at plate size rather than upscaled, so it stays crisp */
      var plate = buildCard(work, card.i, 720, 880);
      plate.className = 'story__art';
      plate.setAttribute('aria-hidden', 'true');
      if (artHost && artHost.parentNode) {
        artHost.parentNode.replaceChild(plate, artHost);
      } else {
        root.querySelector('.story__panel').prepend(plate);
      }
      artHost = plate;

      lastFocus = document.activeElement;
      storyOpen = true;
      root.classList.add('is-open');
      root.setAttribute('aria-hidden', 'false');
      if (closeBtn) closeBtn.focus();
      Sound.select();
    }

    function close() {
      if (!root || !storyOpen) return;
      storyOpen = false;
      root.classList.remove('is-open');
      root.setAttribute('aria-hidden', 'true');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    if (root) {
      root.addEventListener('click', function (e) {
        if (e.target.closest && e.target.closest('[data-story-close]')) close();
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' || e.key === 'Esc') close();
      });
    }

    return { open: open, close: close };
  })();

  (function menu() {
    var open = false;
    var lastFocus = null;

    function setOpen(next) {
      open = next;
      menuEl.classList.toggle('is-open', open);
      menuEl.setAttribute('aria-hidden', open ? 'false' : 'true');
      menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (open) {
        lastFocus = document.activeElement;
        Sound.select();
        var first = menuEl.querySelector('.menu__close');
        if (first) first.focus();
      } else {
        Sound.hover();
        if (lastFocus && lastFocus.focus) lastFocus.focus();
      }
    }

    menuBtn.addEventListener('click', function () { setOpen(!open); });

    menuEl.addEventListener('click', function (e) {
      if (e.target.closest('[data-menu-close]')) {
        e.preventDefault();
        setOpen(false);
        return;
      }
      if (e.target.closest('[data-menu-link]')) {
        e.preventDefault();
        setOpen(false);
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) setOpen(false);
    });
  })();

  /* ------------------------------------------------------------
     boot
     ------------------------------------------------------------ */
  function start() {
    layout();
    resizeCanvas();
    requestAnimationFrame(frame);
  }

  canvas.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointerenter', onMove, { passive: true });

  var pending = 0;
  function onResize() {
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(function () {
      pending = 0;
      layout();
      resizeCanvas();
    });
  }
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });

  /* rebuild once the mono font is available so captions are not fallback */
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () {
      if (!cards.length) return;
      var cw = cards[0].w;
      var snapshot = cards.map(function (c) {
        return { x: c.x, y: c.y, rot: c.rot, placed: c.placed, home: c.home, reveal: c.reveal };
      });
      makeCards(cw, cardCount);
      cards.forEach(function (c, i) {
        var s = snapshot[i];
        if (!s) return;
        c.x = s.x; c.y = s.y; c.rot = s.rot; c.placed = s.placed; c.home = s.home; c.reveal = s.reveal;
      });
      layout();
      resizeCanvas();
    });
  }

  start();
})();
