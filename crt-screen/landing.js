/* ============================================================
   Zstudio — cards, wind, sound, menu
   Cards are drawn on a 2D canvas under the CRT glass.
   ============================================================ */
(function () {
  'use strict';

  var canvas   = document.getElementById('cards');
  var ctx      = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'low';
  var heroEl   = document.querySelector('.hero');
  var slotEl   = document.getElementById('slot');
  var topEl    = document.querySelector('.hud__top');
  var soundBtn = document.getElementById('soundToggle');
  var menuEl   = document.getElementById('menu');
  var menuBtn  = document.getElementById('menuOpen');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  /* lite mode: the prints stop moving and the canvas only redraws on demand */
  var lite = document.documentElement.classList.contains('is-lite');

  var WORKS = [
    {
      about: true, art: -1,
      title: 'Zstudio', year: 'About', kind: 'Studio \u00b7 Amsterdam',
      blurb: 'Zstudio is an independent design and development studio. We build sites, products and interactive worlds for people who care how things feel. Small team, long engagements, and a bias for the tactile detail.'
    },
    {
      art: 0,
      title: 'Halcyon', year: '2026', kind: 'Web \u00b7 Identity',
      blurb: 'A slow-reading index for an architecture practice. Plans unfold as you scroll; nothing announces itself until you stop.'
    },
    {
      art: 1,
      title: 'Meridian', year: '2026', kind: 'Web \u00b7 Product',
      blurb: 'Ticketing for a chamber music festival, built around one long scroll and a seating plan that breathes.'
    },
    {
      art: 2,
      title: 'Vellum', year: '2025', kind: 'Web \u00b7 Editorial',
      blurb: 'A reading room for a small press. One typeface, real paper grain, and a column that never fights the text.'
    },
    {
      art: 3,
      title: 'Quarry', year: '2025', kind: 'Web \u00b7 Archive',
      blurb: 'A materials library: 240 stone samples, each photographed under the same lamp so the comparison is honest.'
    },
    {
      art: 4,
      title: 'Signal', year: '2024', kind: 'Web \u00b7 Audio',
      blurb: 'An archive of field recordings, played back through a waveform drawn by hand and set in motion by the sound.'
    },
    {
      art: 5,
      title: 'Terrain', year: '2024', kind: 'Web \u00b7 Interactive',
      blurb: 'A mapping tool for walking artists. A route becomes an elevation profile you can read at a glance.'
    }
  ];

  /* ------------------------------------------------------------
     helpers
     ------------------------------------------------------------ */
  function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

  /* the site's custom ease: slow to leave, quick through the middle,
     soft on arrival. Used for the drop settle. */
  function thomasEase(t) {
    t = clamp(t, 0, 1);
    if (t === 0 || t === 1) return t;
    var low = 0, high = 1, mid = t;
    for (var i = 0; i < 16; i += 1) {
      var inv = 1 - mid;
      var x = 3 * inv * inv * mid * 0.625 + mid * mid * mid;
      if (x < t) low = mid; else high = mid;
      mid = (low + high) / 2;
    }
    var u = 1 - mid;
    return 3 * u * u * mid * 0.05 + 3 * u * mid * mid + mid * mid * mid;
  }

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

    if (index === -1) {
      /* portrait — a soft head-and-shoulders silhouette in the tube light */
      var px = W * 0.5, py = H * 0.39, pr = W * 0.17;
      rg = g.createRadialGradient(W * 0.5, H * 0.28, 0, W * 0.5, H * 0.44, W * 0.78);
      rg.addColorStop(0, light(0.20));
      rg.addColorStop(0.55, light(0.07));
      rg.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = rg;
      g.fillRect(0, 0, W, H);

      g.fillStyle = 'rgba(7,6,5,0.74)';
      g.beginPath();
      g.ellipse(W * 0.5, H * 1.02, W * 0.48, H * 0.40, 0, Math.PI, 0, false);
      g.fill();

      g.fillStyle = 'rgba(10,9,7,0.86)';
      g.beginPath();
      g.ellipse(px, py, pr * 0.82, pr, 0, 0, Math.PI * 2);
      g.fill();
      g.fillRect(px - pr * 0.30, py + pr * 0.52, pr * 0.60, pr * 0.92);

      g.strokeStyle = light(0.36);
      g.lineWidth = 1.4;
      g.beginPath();
      g.ellipse(px, py, pr * 0.82, pr, 0, Math.PI * 0.70, Math.PI * 1.30);
      g.stroke();

      g.fillStyle = light(0.18);
      g.fillRect(W * 0.18, H * 0.70, W * 0.64, 1);
      g.font = '500 ' + (W * 0.034).toFixed(1) + 'px "JetBrains Mono", ui-monospace, monospace';
      g.fillStyle = light(0.42);
      g.textAlign = 'center';
      g.fillText('ZSTUDIO', W * 0.5, H * 0.78);
    } else if (index === 0) {
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
  var DPR_CAP = 1.5;
  var DPR = Math.min(DPR_CAP, window.devicePixelRatio || 1);

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
    var art = artwork(work.art === undefined ? index : work.art, 640, Math.round(640 * ph / pw), rnd);

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
  var cardCount = 7;
  var zTop = 20;
  var heroRect = null;
  var slotRect = null;
  var safe = null;
  var W = 0, H = 0;

  function makeCards(cw, count) {
    cards = WORKS.slice(0, count).map(function (work, i) {
      var ch = cw * 1.25;
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
        hover: false, drag: false, home: true, flying: false, free: false,
        about: !!work.about,
        grabX: 0, grabY: 0,
        rx: 0, ry: 0, restRot: 0,
        windMotion: createWindMotion(),
        windTiltX: 0, windTiltZ: 0, windLift: 0, windTwist: 0,
        z: i + 1, stackLift: 0, locked: false,
        settleLift: null, returnAt: 0, prevVy: 0,
        bendX: 0, bendXV: 0,
        reveal: 1, placed: false, openOnArrive: false
      };
    });
  }

  var ANCHORS = {
    desktop: [
      [-0.76, -0.74, -8], [-0.20, -0.90, 7], [ 0.74, -0.78, -6],
      [-0.80,  0.52,  8], [-0.36,  0.02, -4], [ 0.82,  0.16,  9],
      [ 0.18,  0.82, -7]
    ],
    tablet: [
      [-0.78, -0.62, -7], [ 0.00, -0.88, 6], [ 0.78, -0.60, -5],
      [-0.78,  0.38,  7], [-0.04,  0.00, -4], [ 0.78,  0.42,  8],
      [-0.06,  0.84, -6]
    ],
    mobile: [
      [-0.66, -0.72, -6], [ 0.66, -0.74, 6],
      [-0.68,  0.50,  7], [ 0.58,  0.64, -5]
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
    var cw = tier === 'desktop' ? clamp(132, Math.min(W, H) * 0.148, 172)
           : tier === 'tablet'  ? clamp(112, Math.min(W, H) * 0.165, 148)
           : clamp(88, W * 0.245, 118);

    document.documentElement.style.setProperty('--card-w', cw + 'px');
    document.documentElement.style.setProperty('--card-h', (cw * 1.25) + 'px');

    var count = tier === 'mobile' ? 4 : 7;
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
        c.rx = c.hx; c.ry = c.hy;
        c.restRot = c.hrot;
      }

      if (!c.placed) {
        c.x = c.rx; c.y = c.ry; c.rot = c.trot;
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
    DPR = Math.min(lite ? 1 : DPR_CAP, window.devicePixelRatio || 1);
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
  var K = 90, D = 8.0;
  var KR = 105, DR = 13;
  var SLOT_K = 170, SLOT_D = 16;

  /* ------------------------------------------------------------
     wind — the reference model: a gust sampled from the pointer's
     speed, an impulse per stroke, and a damped sheet that keeps the
     displacement after the air has passed.
     ------------------------------------------------------------ */
  var WIND = {
    enabled: true, strength: 6.26, dragStrength: 0.3, radius: 340,
    minSpeed: 1000, maxSpeed: 12000, speedCurve: 2, strokePause: 220,
    impulse: 0.14, drift: 1, mass: 0.7, friction: 2.75, spin: 1.55,
    lift: 0.5, tilt: 1.4, tiltX: 0.22, tiltZ: 0.16,
    response: 11.5, decay: 1.25, variation: 0.76
  };
  var windSample = createWindSample();
  var windState = {
    x: 0, z: 0, amount: 0, pointerX: -9999, pointerY: -9999,
    directionX: 0, directionY: 0, strokeId: 0, active: false
  };
  var windLastInput = performance.now();
  var inspect = { active: false, phase: 'idle', card: null, t: 0, scanT: 0, exits: [], returnAt: 0, hold: false };
  var wellHint = { found: false, count: 0, last: -1e9 };
  var lastBreeze = -1e9;

  function createWindSample(strokeId) {
    return {
      x: 0, y: 0, time: null, vx: 0, vy: 0,
      gustX: 0, gustY: 0, gustTime: null,
      strokeId: strokeId || 0, strokeArmed: true, moveTime: null, dragging: false
    };
  }

  function setWindDragging(sample, dragging, strength) {
    if (dragging && !sample.dragging) {
      var scale = clamp(strength, 0, 1);
      sample.gustX *= scale;
      sample.gustY *= scale;
    }
    sample.dragging = dragging;
  }

  function sampleWindPointer(sample, x, y, time, controls, strengthScale) {
    if (sample.time === null) {
      sample.x = x; sample.y = y; sample.time = time;
      return;
    }
    var seconds = Math.max(0.001, (time - sample.time) / 1000);
    sample.vx = (x - sample.x) / seconds;
    sample.vy = (y - sample.y) / seconds;
    if (x !== sample.x || y !== sample.y) {
      if (sample.moveTime !== null && time - sample.moveTime >= (controls.strokePause || 220)) {
        sample.strokeArmed = true;
        sample.gustX = 0;
        sample.gustY = 0;
        sample.gustTime = null;
      }
      sample.moveTime = time;
    }
    var speed = Math.hypot(sample.vx, sample.vy);
    var threshold = Math.max(0, controls.minSpeed || 0);
    var range = Math.max(1, controls.maxSpeed - threshold);
    var normalized = Math.min(1, Math.max(0, speed - threshold) / range);
    var incoming = Math.pow(normalized, Math.max(1, controls.speedCurve || 2)) * Math.max(0, Math.min(1, strengthScale === undefined ? 1 : strengthScale));
    if (incoming > 0) {
      if (sample.strokeArmed) {
        sample.strokeId += 1;
        sample.strokeArmed = false;
      }
      var retained = windEnvelope(sample, time, controls.decay, 1);
      var amount = Math.max(incoming, retained);
      sample.gustX = sample.vx / speed * amount;
      sample.gustY = sample.vy / speed * amount;
      sample.gustTime = time;
    }
    sample.x = x;
    sample.y = y;
    sample.time = time;
  }

  function windEnvelope(sample, time, decay, strength) {
    if (sample.gustTime === null) return 0;
    var age = Math.max(0, (time - sample.gustTime) / 1000);
    return Math.hypot(sample.gustX, sample.gustY) * strength * Math.exp(-decay * age);
  }

  function windFalloff(distance, radius) {
    if (radius <= 0 || distance >= radius) return 0;
    var t = Math.max(0, distance / radius);
    return 1 - t * t * (3 - 2 * t);
  }

  function createWindMotion() {
    return { vx: 0, vz: 0, spinVelocity: 0, dx: 0, dz: 0, dyaw: 0, strokeId: 0, exposure: 0 };
  }

  function applyWindStroke(state, strokeId, x, z, torque, amount, controls) {
    if (strokeId <= 0 || amount <= 0) return;
    if (state.strokeId !== strokeId) {
      state.strokeId = strokeId;
      state.exposure = 0;
    }
    var added = Math.max(0, amount - state.exposure);
    state.exposure = Math.max(state.exposure, amount);
    if (added === 0) return;
    var mass = Math.max(0.001, controls.mass || 0.7);
    var impulse = Math.max(0, controls.impulse || 0.08) * added / mass;
    state.vx += x * impulse * (controls.drift || 0.45) * 24;
    state.vz += z * impulse * (controls.drift || 0.45) * 24;
    state.spinVelocity += torque * impulse * (controls.spin || 0.65) * 24;
  }

  function advanceWindMotion(state, forceX, forceZ, torque, delta, controls) {
    var dt = Math.min(0.05, Math.max(0, delta));
    var mass = Math.max(0.001, controls.mass || 0.7);
    var damping = Math.max(0, controls.friction || 2.75) / mass;
    var decay = Math.exp(-damping * dt);
    var velocityTime = damping > 0 ? -Math.expm1(-damping * dt) / damping : dt;
    var accelerationTime = damping > 0 ? (dt - velocityTime) / damping : dt * dt * 0.5;
    var forceGain = (controls.drift || 0.2) * 24 / mass;
    var torqueGain = (controls.spin || 0.2) * 24 / mass;
    var ax = forceX * forceGain;
    var az = forceZ * forceGain;
    var angularAcceleration = torque * torqueGain;
    state.dx = state.vx * velocityTime + ax * accelerationTime;
    state.dz = state.vz * velocityTime + az * accelerationTime;
    state.dyaw = state.spinVelocity * velocityTime + angularAcceleration * accelerationTime;
    state.vx = state.vx * decay + ax * velocityTime;
    state.vz = state.vz * decay + az * velocityTime;
    state.spinVelocity = state.spinVelocity * decay + angularAcceleration * velocityTime;
    if (forceX === 0 && Math.abs(state.vx) < 1e-5) state.vx = 0;
    if (forceZ === 0 && Math.abs(state.vz) < 1e-5) state.vz = 0;
    if (torque === 0 && Math.abs(state.spinVelocity) < 1e-5) state.spinVelocity = 0;
  }

  function stopWindMotion(state) {
    state.vx = 0; state.vz = 0; state.spinVelocity = 0;
    state.dx = 0; state.dz = 0; state.dyaw = 0;
  }

  function settleWind(current, target, delta, response) {
    var next = current + (target - current) * (1 - Math.exp(-response * delta));
    return target === 0 && Math.abs(next) < 1e-5 ? 0 : next;
  }

  function windTiltClearance(width, height, tiltX, tiltZ, yaw, lift) {
    var sx = Math.sin(tiltX), cx = Math.cos(tiltX);
    var sz = Math.sin(tiltZ), cy = Math.cos(yaw), sy = Math.sin(yaw);
    var edgeDrop = Math.abs(cx * sz * cy + sx * sy) * width * 0.5 +
                   Math.abs(cx * sz * sy - sx * cy) * height * 0.5;
    return Math.max(0, edgeDrop - Math.max(0, lift) * cx * Math.cos(tiltZ));
  }

  function clampCard(x, y, c) {
    var hw = c.w / 2, hh = c.h / 2;
    x = clamp(x, safe.left + hw, safe.right - hw);
    y = clamp(y, safe.top + hh, safe.bottom - hh);
    [slotRect, heroRect].forEach(function (r) {
      if (!r) return;
      var ox = Math.min(x + hw, r.right) - Math.max(x - hw, r.left);
      var oy = Math.min(y + hh, r.bottom) - Math.max(y - hh, r.top);
      if (ox > 0 && oy > 0 && (ox * oy) / (c.w * c.h) > 0.12) {
        var cx = (r.left + r.right) / 2, cy = (r.top + r.bottom) / 2;
        if (ox < oy) x += (x < cx ? -1 : 1) * (ox + 2);
        else y += (y < cy ? -1 : 1) * (oy + 2);
        x = clamp(x, safe.left + hw, safe.right - hw);
        y = clamp(y, safe.top + hh, safe.bottom - hh);
      }
    });
    return { x: x, y: y };
  }

  function windBlocked() {
    return lite || reduceMotion.matches || storyOpen || inspect.active || document.hidden;
  }

  function resetWind() {
    windSample = createWindSample(windSample.strokeId);
    windState.amount = 0;
    windState.active = false;
    cards.forEach(function (c) { stopWindMotion(c.windMotion); });
  }

  function stepWind(dt, now) {
    windEnergy = 0;
    windPan = 0;
    var active = !windBlocked() && WIND.enabled;
    windState.active = active;
    var amount = active ? windEnvelope(windSample, now, WIND.decay, WIND.strength) : 0;
    if (amount < 1e-4) amount = 0;
    var speed = Math.hypot(windSample.gustX, windSample.gustY);
    var dirX = speed > 0 ? windSample.gustX / speed : 0;
    var dirY = speed > 0 ? windSample.gustY / speed : 0;
    windState.amount = amount;
    windState.pointerX = windSample.x;
    windState.pointerY = windSample.y;
    windState.directionX = dirX;
    windState.directionY = dirY;
    windState.strokeId = windSample.strokeId;
    windState.x = dirX * amount;
    windState.z = dirY * amount;

    var heading = Math.atan2(dirX, dirY);

    cards.forEach(function (c) {
      var motion = c.windMotion;
      var canMove = active && amount > 0 && c.home && !c.drag && !c.locked && !c.flying && !c.settleLift && !c.breeze;

      if (!canMove) {
        stopWindMotion(motion);
        c.windTiltX = settleWind(c.windTiltX, 0, dt, WIND.response);
        c.windTiltZ = settleWind(c.windTiltZ, 0, dt, WIND.response);
        c.windLift = settleWind(c.windLift, 0, dt, WIND.response);
        c.windTwist = settleWind(c.windTwist, 0, dt, WIND.response);
        return;
      }

      var cx = c.x + c.ax;
      var cy = c.y + c.ay;
      var offsetX = cx - windState.pointerX;
      var offsetY = cy - windState.pointerY;
      var distance = Math.hypot(offsetX, offsetY);
      var variation = 1 - WIND.variation * (0.5 + Math.sin(c.i * 2.39996) * 0.5);
      var exposure = 1 - clamp(c.lift + Math.abs(c.bend) / (c.h * 2), 0, 1);
      var mobility = 0.12 + exposure * 0.88;
      var influence = windFalloff(distance, WIND.radius);
      var push = (amount / WIND.strength) * influence * variation;
      var cardRadius = Math.max(1, Math.hypot(c.w, c.h) * 0.25);
      var glancing = clamp((offsetX * dirY - offsetY * dirX) / cardRadius, -1, 1);
      var alignment = Math.sin(2 * (heading - c.rot)) * 0.25;
      var unitTorque = clamp(glancing + alignment, -1, 1);
      var canAdd = windState.strokeId !== motion.strokeId || push > motion.exposure;

      if (canAdd && push > 0) {
        applyWindStroke(motion, windState.strokeId, dirX * mobility, dirY * mobility, unitTorque * mobility, push, WIND);
      }
      advanceWindMotion(motion, 0, 0, 0, dt, WIND);

      if (c.drag) {
        c.windTwist = settleWind(c.windTwist, clamp(motion.spinVelocity * 0.08, -0.18, 0.18), dt, WIND.response);
      } else {
        var dx = motion.dx, dy = motion.dz;
        var windScale = c.w / 0.58;
        if (dx || dy || motion.dyaw) {
          var nx = c.rx + dx * windScale;
          var ny = c.ry + dy * windScale;
          var cl = clampCard(nx, ny, c);
          if (Math.abs(cl.x - nx) > 1e-6) motion.vx = 0;
          if (Math.abs(cl.y - ny) > 1e-6) motion.vz = 0;
          c.rx = cl.x;
          c.ry = cl.y;
          c.x = cl.x;
          c.y = cl.y;
          c.restRot += motion.dyaw;
          c.rot += motion.dyaw;
          c.vx = 0;
          c.vy = 0;
        }

        var travelSpeed = Math.max(0.01, WIND.drift * 24 / WIND.friction);
        var momentumScale = Math.max(travelSpeed, Math.hypot(motion.vx, motion.vz));
        var mx = motion.vx / momentumScale;
        var my = motion.vz / momentumScale;
        var flutter = 0.08 + exposure * 0.92;
        var airborne = Math.hypot(mx, my) * 0.45 * flutter;
        var tipScale = WIND.tilt * flutter;
        c.windTiltX = settleWind(c.windTiltX, my * tipScale, dt, WIND.response);
        c.windTiltZ = settleWind(c.windTiltZ, -mx * tipScale, dt, WIND.response);
        var clearance = windTiltClearance(c.w, c.h, c.windTiltX * WIND.tiltX, c.windTiltZ * WIND.tiltZ, c.rot + c.windTwist, c.lift);
        c.windLift = Math.max(clearance / c.h, settleWind(c.windLift, airborne * WIND.lift, dt, WIND.response));
        c.windTwist = settleWind(c.windTwist, 0, dt, WIND.response);
        windEnergy = Math.max(windEnergy, Math.hypot(motion.vx, motion.vz) * 600);
        windPan = clamp((cx - W * 0.5) / (W * 0.5), -1, 1);
      }
    });
  }

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
    var order = cards.slice().sort(function (a, b) { return (b.z || 0) - (a.z || 0); });
    for (var i = 0; i < order.length; i += 1) {
      if (hit(order[i], px, py)) return order[i];
    }
    return null;
  }

  function bringToFront(c) { c.z = ++zTop; }

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

  function sendHome(c) {
    bringToFront(c);
    c.settleLift = { from: c.lift, to: 0, t: 0, dur: 0.4 };
    c.liftV = 0;
    c.home = true;
    c.flying = false;
    c.free = false;
    c.rx = c.hx; c.ry = c.hy;
    c.restRot = c.hrot;
    c.tx = c.hx; c.ty = c.hy; c.trot = c.hrot;
    c.liftV = 0;
    c.reveal = 1;
    if (!cards.some(function (o) { return !o.home; })) slotEl.classList.remove('is-filled');
  }

  function place(c) {
    if (!slotRect) return;
    cards.forEach(function (o) { if (o !== c && !o.home) sendHome(o); });
    if (c.home) c.reveal = lite ? 1 : 0;
    c.home = false;
    c.drag = false;
    c.free = true;
    c.tx = slotRect.cx; c.ty = slotRect.cy; c.trot = 0;
    c.vx *= 0.3; c.vy *= 0.3; c.vrot = 0;
    c.flying = true;
    bringToFront(c);
    c.settleLift = { from: c.lift, to: 0, t: 0, dur: 0.4 };
    c.liftV = 0;
    wellHint.found = true;
    slotEl.classList.add('is-filled');
    Sound.place();
  }

  /* ------------------------------------------------------------
     inspect — the well is a reader. A card dropped into it seats,
     the other prints shuffle to the side, a scan line develops the
     print, and the story opens. Closing the story sends it home.
     ------------------------------------------------------------ */
  function beginInspect(c) {
    if (!c || inspect.active) return;
    inspect.active = true;
    inspect.hold = false;
    inspect.card = c;
    inspect.t = 0;
    inspect.scanT = 0;
    inspect.exits = [];
    c.locked = true;
    c.home = false;
    c.flying = false;
    c.rx = c.tx;
    c.ry = c.ty;
    c.restRot = 0;
    c.settleLift = { from: c.lift, to: 0, t: 0, dur: 0.4 };
    c.liftV = 0;
    bringToFront(c);

    var exitX = safe.left + c.w / 2 + 10;
    var others = cards.filter(function (o) { return o !== c && o.home; });
    others.sort(function (a, b) { return a.y - b.y; });
    others.forEach(function (o, i) {
      inspect.exits.push({ card: o, rx: o.rx, ry: o.ry, restRot: o.restRot });
      o.locked = true;
      o.exitTarget = {
        x: exitX,
        y: clamp(safe.top + o.h / 2 + (i + 0.5) * (safe.bottom - safe.top) / others.length,
                 safe.top + o.h / 2, safe.bottom - o.h / 2),
        rot: o.rot
      };
      o.exitAt = performance.now() + i * 70;
    });

    if (reduceMotion.matches) {
      inspect.phase = 'open';
      Story.open(c);
    } else {
      inspect.phase = 'scan';
      Sound.scan();
    }
  }

  function endInspect() {
    if (!inspect.active) return;
    var c = inspect.card;
    if (c) {
      c.locked = true;
      sendHome(c);
    }
    inspect.exits.forEach(function (e, i) {
      e.card.exitTarget = { x: e.rx, y: e.ry, rot: e.restRot };
      e.card.exitAt = performance.now() + i * 70;
    });
    inspect.phase = 'return';
    inspect.t = 0;
    inspect.returnAt = performance.now() + 900;
  }

  function stepInspect(dt, now) {
    if (!inspect.active) return;
    inspect.t += dt;
    if (inspect.phase === 'scan' && !inspect.hold) {
      inspect.scanT += dt;
      if (inspect.scanT >= 1.15) {
        inspect.phase = 'open';
        Story.open(inspect.card);
      }
    } else if (inspect.phase === 'return' && now >= inspect.returnAt) {
      cards.forEach(function (c) { c.locked = false; });
      inspect.active = false;
      inspect.phase = 'idle';
      inspect.card = null;
      inspect.exits = [];
      kick();
    }
  }

  var downX = 0, downY = 0, moved = false, down = false;

  function onMove(e) {
    var now = performance.now();
    var dt = Math.max(0.008, (now - pointer.t) / 1000);
    var nx = e.clientX, ny = e.clientY;

    if (pointer.t) {
      pointer.vx = clamp((nx - pointer.x) / dt, -3000, 3000);
      pointer.vy = clamp((ny - pointer.y) / dt, -3000, 3000);
    }
    pointer.x = nx; pointer.y = ny; pointer.t = now;

    windLastInput = now;
    if (e.pointerType === 'mouse' && (e.buttons === 0 || (down && e.buttons === 1)) && !windBlocked()) {
      sampleWindPointer(windSample, nx, ny, now, WIND, down ? WIND.dragStrength : 1);
    }

    if (down) {
      if (!moved && Math.abs(nx - downX) + Math.abs(ny - downY) > 5) moved = true;
      kick();
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
    kick();
  }

  function onDown(e) {
    windLastInput = performance.now();
    var c = pick(e.clientX, e.clientY);
    if (!c || c.locked) return;
    down = true;
    active = c;
    downX = e.clientX; downY = e.clientY;
    moved = false;
    if (!c.home) {
      /* a print in the plate can be lifted back onto the floor */
      c.home = true;
      c.flying = false;
      c.rx = c.x; c.ry = c.y;
      c.restRot = c.rot;
      c.openOnArrive = false;
      if (!cards.some(function (o) { return !o.home; })) slotEl.classList.remove('is-filled');
    }
    c.drag = true;
    c.free = true;
    bringToFront(c);
    c.grabX = c.x - e.clientX;
    c.grabY = c.y - e.clientY;
    /* the pickup: a small upward pop and a jiggle, as if pinched by a corner */
    c.liftV += 1.7;
    c.vrot += (Math.random() - 0.5) * 1.3;
    canvas.style.cursor = 'grabbing';
    try { if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId); } catch (err) {}
    Sound.select();
    kick();
  }

  function onUp(e) {
    windLastInput = performance.now();
    if (!down) return;
    down = false;
    var c = active;
    active = null;
    canvas.style.cursor = 'default';
    if (canvas.hasPointerCapture && e && canvas.hasPointerCapture(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
    if (!c) return;

    c.drag = false;

    if (!moved) {
      if (c.about) Story.open(c);
      else { place(c); c.openOnArrive = true; }
      kick();
      return;
    }

    /* the plate is a target: a card let go over it goes in. The About
       print is a story, not a project, so it is never inspected. */
    if (!c.about && slotRect) {
      var ox = Math.min(c.x + c.w / 2, slotRect.right) - Math.max(c.x - c.w / 2, slotRect.left);
      var oy = Math.min(c.y + c.h / 2, slotRect.bottom) - Math.max(c.y - c.h / 2, slotRect.top);
      if (ox > 0 && oy > 0 && (ox * oy) / (c.w * c.h) > 0.22) {
        place(c);
        c.openOnArrive = true;
        kick();
        return;
      }
    }

    /* let go: it lands where the hand left it, then settles there */
    c.x = clamp(c.x, safe.left + c.w / 2, safe.right - c.w / 2);
    c.y = clamp(c.y, safe.top + c.h / 2, safe.bottom - c.h / 2);
    c.rx = c.x; c.ry = c.y;
    c.restRot = c.rot;
    c.vx = 0; c.vy = 0;
    c.settleLift = { from: c.lift, to: 0, t: 0, dur: 0.4 };
    c.liftV = 0;
    c.free = true;
    Sound.place();
    kick();
  }

  function onLeave() {
    resetWind();
    pointer.vx = 0; pointer.vy = 0;
    if (!down) {                /* a held card must not be thrown off-screen */
      pointer.x = -9999; pointer.y = -9999;
      pointer.t = 0;            /* no gust when the cursor re-enters */
    }
    kick();
  }

  /* ------------------------------------------------------------
     simulate
     ------------------------------------------------------------ */
  var windEnergy = 0;
  var windPan = 0;

  /* ------------------------------------------------------------
     paper physics

     Each print is a sheet lying on the floor of the tube. Moving the
     cursor moves air over it, a grab lifts it off the surface, and a drop
     lets gravity take it back down with a bounce. Nothing scrolls on its
     own: a sheet stays exactly where it was put.
     ------------------------------------------------------------ */
  var storyOpen = false;

  var frameNow = 0;
  var calmNow = false;

  function simulate(dt, now) {
    frameNow = now;
    stepInspect(dt, now);
    stepBreeze(dt, now);
    stepWellHint(now);
    var decay = Math.exp(-11 * dt);
    pointer.vx *= decay;
    pointer.vy *= decay;

    var calm = reduceMotion.matches || lite;
    calmNow = calm;
    stepWind(dt, now);

    cards.forEach(function (c) {
      if (c.breeze) {
        var b = c.breeze;
        b.t += dt;
        var bu = clamp((b.t - b.delay) / b.dur, 0, 1);
        var be = thomasEase(bu);
        var bdx = b.toX - b.fromX, bdy = b.toY - b.fromY;
        var blen = Math.hypot(bdx, bdy) || 1;
        var barc = Math.sin(Math.PI * bu) * b.curve;
        c.rx = b.fromX + bdx * be - (bdy / blen) * barc;
        c.ry = b.fromY + bdy * be + (bdx / blen) * barc;
        c.x = c.rx;
        c.y = c.ry;
        c.vx = 0;
        c.vy = 0;
        if (bu >= 1) {
          c.rx = b.toX;
          c.ry = b.toY;
          c.x = c.rx;
          c.y = c.ry;
          c.breeze = null;
        }
      }

      if (c.exitTarget && now >= c.exitAt) {
        c.rx = c.exitTarget.x;
        c.ry = c.exitTarget.y;
        c.restRot = c.exitTarget.rot;
        c.exitTarget = null;
      }

      if (!c.home) {
        /* in the slot, or flying to it */
        c.vx += (c.tx - c.x) * SLOT_K * dt;
        c.vy += (c.ty - c.y) * SLOT_K * dt;
        c.vx *= Math.exp(-SLOT_D * dt);
        c.vy *= Math.exp(-SLOT_D * dt);
        c.x += c.vx * dt;
        c.y += c.vy * dt;
        if (Math.abs(c.tx - c.x) < 1.2 && Math.abs(c.ty - c.y) < 1.2 &&
            Math.abs(c.vx) < 14 && Math.abs(c.vy) < 14) {
          c.x = c.tx; c.y = c.ty; c.vx = 0; c.vy = 0;
        }
      } else if (c.drag) {
        /* held by the cursor: it follows with a little weight, so the hand
           leads the paper rather than the paper snapping to the hand */
        var tx = pointer.x + c.grabX;
        var ty = pointer.y + c.grabY;
        var f = 1 - Math.exp(-17 * dt);
        var nx = c.x + (tx - c.x) * f;
        var ny = c.y + (ty - c.y) * f;
        nx = clamp(nx, safe.left + c.w / 2, safe.right - c.w / 2);
        ny = clamp(ny, safe.top + c.h / 2, safe.bottom - c.h / 2);
        c.vx = (nx - c.x) / Math.max(dt, 0.001);
        c.vy = (ny - c.y) / Math.max(dt, 0.001);
        c.x = nx;
        c.y = ny;
      } else {
        /* on the floor: it sits where the air left it */
        c.vx += (c.rx - c.x) * K * dt;
        c.vy += (c.ry - c.y) * K * dt;
        c.vx *= Math.exp(-D * dt);
        c.vy *= Math.exp(-D * dt);
        c.x += c.vx * dt;
        c.y += c.vy * dt;

        /* never let a sheet slide under the bezel */
        c.x = clamp(c.x, -c.w * 0.35, W + c.w * 0.35);
        c.y = clamp(c.y, safe.top + c.h * 0.5, safe.bottom - c.h * 0.5);

        if (Math.abs(c.rx - c.x) < 1.2 && Math.abs(c.ry - c.y) < 1.2 &&
            Math.abs(c.vx) < 12 && Math.abs(c.vy) < 12) {
          c.x = c.rx; c.y = c.ry; c.vx = 0; c.vy = 0;
        }
      }

      if (c.reveal < 1) c.reveal = Math.min(1, c.reveal + dt / 0.9);

      if (c.openOnArrive && !c.home && c.reveal >= 1 &&
          Math.abs(c.x - c.tx) < 2.5 && Math.abs(c.y - c.ty) < 2.5) {
        c.openOnArrive = false;
        beginInspect(c);
      }

      /* rotation: the hand tips a held sheet, the floor settles a dropped one */
      var rotTarget = c.drag ? c.restRot + clamp(c.vx * 0.00018, -0.12, 0.12)
                    : (c.hover && c.home) ? c.restRot + c.tilt
                    : c.restRot;
      c.vrot += (rotTarget - c.rot) * KR * dt;
      c.vrot *= Math.exp(-DR * dt);
      c.rot += c.vrot * dt;
      if (Math.abs(rotTarget - c.rot) < 0.0015 && Math.abs(c.vrot) < 0.02) {
        c.rot = rotTarget; c.vrot = 0;
      }

      /* elevation: the hand lifts it; letting go settles it back in 0.4s */
      if (c.drag) {
        c.liftV += (1.15 - c.lift) * 260 * dt;
        c.liftV *= Math.exp(-18 * dt);
        c.lift += c.liftV * dt;
        if (c.lift > 1.4) { c.lift = 1.4; if (c.liftV > 0) c.liftV = 0; }
        c.settleLift = null;
      } else if (c.settleLift) {
        var sl = c.settleLift;
        sl.t += dt;
        var k = clamp(sl.t / sl.dur, 0, 1);
        c.lift = sl.from + (sl.to - sl.from) * thomasEase(k);
        c.liftV = 0;
        if (k >= 1) { c.lift = sl.to; c.settleLift = null; }
      } else {
        c.lift = 0;
        c.liftV = 0;
      }

      /* paper flex: the near edge lags the sheet's motion */
      var windVx = c.windMotion.vx * (c.w / 0.58);
      var windVy = c.windMotion.vz * (c.w / 0.58);
      var bendTarget = clamp(-(c.vy + windVy) * 0.045 - c.liftV * 2.0, -c.h * 0.085, c.h * 0.085);
      c.bendV += ((bendTarget - c.bend) * 170 - c.bendV * 15) * dt;
      c.bend += c.bendV * dt;
      if (Math.abs(c.bend) < 0.05 && Math.abs(c.bendV) < 0.05) { c.bend = 0; c.bendV = 0; }
      var bendXTarget = clamp(-(c.vx + windVx) * 0.03, -c.w * 0.055, c.w * 0.055);
      c.bendXV += ((bendXTarget - c.bendX) * 150 - c.bendXV * 13) * dt;
      c.bendX += c.bendXV * dt;
      if (Math.abs(c.bendX) < 0.05 && Math.abs(c.bendXV) < 0.05) { c.bendX = 0; c.bendXV = 0; }

      var lean = 1 - Math.exp(-13 * dt);
      c.lx += (c.lxT - c.lx) * lean;
      c.ly += (c.lyT - c.ly) * lean;

      var yawT = calm ? c.yaw0 : c.yaw0 + c.lx * 0.17 + c.windTiltZ * WIND.tiltZ + Math.sin(now * 0.00043 + c.i * 1.9) * 0.02;
      var pitchT = calm ? c.pitch0 : c.pitch0 + c.ly * 0.13 + c.windTiltX * WIND.tiltX + clamp(c.vx * 0.00016, -0.06, 0.06);
      var poseEase = 1 - Math.exp(-9 * dt);
      c.yaw += (yawT - c.yaw) * poseEase;
      c.pitch += (pitchT - c.pitch) * poseEase;

      /* a sheet at rest is still: the floor does not breathe */
      c.ax = 0; c.ay = 0; c.asway = 0;
    });

    computeStack();
    if (!lite) stepMotes(dt, now);
  }

  function cardRectOf(c) {
    var co = Math.abs(Math.cos(c.rot)), si = Math.abs(Math.sin(c.rot));
    var hw = (c.w * co + c.h * si) / 2;
    var hh = (c.w * si + c.h * co) / 2;
    return { left: c.x - hw, right: c.x + hw, top: c.y - hh, bottom: c.y + hh };
  }

  /* a sheet dropped across another rests on it: rank decides who is on
     top, and each sheet above gets a small visual lift and a stronger
     shadow, so the pile reads as a pile. */
  function computeStack() {
    var list = cards.filter(function (c) {
      return c.home && !c.drag && !c.flying && !c.locked;
    });
    list.sort(function (a, b) { return (a.z || 0) - (b.z || 0); });
    list.forEach(function (c) { c.stackLift = 0; });
    for (var i = 0; i < list.length; i += 1) {
      var a = cardRectOf(list[i]);
      for (var j = i + 1; j < list.length; j += 1) {
        var b = cardRectOf(list[j]);
        var ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        var oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 2 && oy > 2) {
          list[j].stackLift = Math.max(list[j].stackLift, list[i].stackLift + 3.5);
        }
      }
    }
    list.forEach(function (c) { c.stackLift = Math.min(c.stackLift, 14); });
  }

  /* ------------------------------------------------------------
     returning breeze + well hint — the page tidies itself
     ------------------------------------------------------------ */
  function stepBreeze(dt, now) {
    if (lite || reduceMotion.matches || storyOpen || inspect.active || down || document.hidden) return;
    if (now - windLastInput < 5000) return;
    if (now - lastBreeze < 18000) return;
    lastBreeze = now;

    var selected = [];
    cards.forEach(function (c) {
      if (!c.home || c.drag || c.locked || c.breeze || c.settleLift || c.flying) return;
      var r = cardRectOf(c);
      var edge = Math.min(c.x - safe.left, safe.right - c.x, c.y - safe.top, safe.bottom - c.y);
      var hidden = false;
      [heroRect, slotRect].forEach(function (q) {
        if (!q) return;
        var ox = Math.min(r.right, q.right) - Math.max(r.left, q.left);
        var oy = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
        if (ox > 2 && oy > 2) hidden = true;
      });
      if (edge < c.w * 0.8 || hidden) selected.push(c);
    });
    if (!selected.length) return;

    selected.sort(function (a, b) { return a.x - b.x; });
    selected = selected.slice(0, 2);
    var launched = 0;

    selected.forEach(function (c, i) {
      var target = null;
      for (var tries = 0; tries < 28 && !target; tries += 1) {
        var tx = safe.left + c.w / 2 + Math.random() * (safe.right - safe.left - c.w);
        var ty = safe.top + c.h / 2 + Math.random() * (safe.bottom - safe.top - c.h);
        var rr = { left: tx - c.w / 2, right: tx + c.w / 2, top: ty - c.h / 2, bottom: ty + c.h / 2 };
        var ok = true;
        [heroRect, slotRect].forEach(function (q) {
          if (!q) return;
          var ox = Math.min(rr.right, q.right) - Math.max(rr.left, q.left);
          var oy = Math.min(rr.bottom, q.bottom) - Math.max(rr.top, q.top);
          if (ox > -4 && oy > -4) ok = false;
        });
        cards.forEach(function (o) {
          if (o === c || !o.home) return;
          var oq = cardRectOf(o);
          var ox = Math.min(rr.right, oq.right) - Math.max(rr.left, oq.left);
          var oy = Math.min(rr.bottom, oq.bottom) - Math.max(rr.top, oq.top);
          if (ox > 4 && oy > 4) ok = false;
        });
        if (ok) target = { x: tx, y: ty };
      }
      if (!target) return;
      var dx = target.x - c.rx, dy = target.y - c.ry;
      var dist = Math.hypot(dx, dy);
      if (dist < 8) return;
      c.breeze = {
        fromX: c.rx, fromY: c.ry, toX: target.x, toY: target.y,
        t: 0, dur: 1.8, delay: launched * 0.18,
        curve: (Math.random() < 0.5 ? -1 : 1) * Math.min(c.w * 0.25, dist * 0.14)
      };
      launched += 1;
    });

    if (launched) Sound.breeze();
  }

  function stepWellHint(now) {
    if (wellHint.found || wellHint.count >= 2) return;
    if (lite || reduceMotion.matches || storyOpen || inspect.active || down || document.hidden) return;
    if (!slotRect) return;
    if (now - windLastInput < 6000) return;
    if (now - wellHint.last < 16000) return;
    wellHint.last = now;

    var best = null, bestD = Infinity;
    var keepClear = {
      left: slotRect.left - 18, right: slotRect.right + 18,
      top: slotRect.top - 18, bottom: slotRect.bottom + 18
    };
    cards.forEach(function (c) {
      if (!c.home || c.drag || c.locked || c.breeze || c.settleLift) return;
      var r = cardRectOf(c);
      var blocked = false;
      [heroRect, keepClear].forEach(function (q) {
        if (!q) return;
        var ox = Math.min(r.right, q.right) - Math.max(r.left, q.left);
        var oy = Math.min(r.bottom, q.bottom) - Math.max(r.top, q.top);
        if (ox > 0 && oy > 0) blocked = true;
      });
      if (blocked) return;
      var d = Math.hypot(c.rx - slotRect.cx, c.ry - slotRect.cy);
      if (d < bestD) { bestD = d; best = c; }
    });
    if (!best || bestD < 30) return;

    var dx = slotRect.cx - best.rx, dy = slotRect.cy - best.ry;
    var dist = Math.hypot(dx, dy) || 1;
    var travel = Math.min(dist * 0.3, best.w * 0.6);
    best.breeze = {
      fromX: best.rx, fromY: best.ry,
      toX: best.rx + dx / dist * travel,
      toY: best.ry + dy / dist * travel,
      t: 0, dur: 1.4, delay: 0, curve: 0
    };
    wellHint.count += 1;
    slotEl.classList.add('is-hinting');
    setTimeout(function () { slotEl.classList.remove('is-hinting'); }, 1800);
    Sound.hover();
  }

  /* ------------------------------------------------------------
     dust — specks suspended in the tube, lit and drifting
     ------------------------------------------------------------ */
  var motes = [];

  function makeMotes() {
    motes = [];
    if (lite) return;
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

  var MOTE_STEPS = 48, MOTE_MAX = 0.24, MOTE_COLS = [];
  for (var mi = 0; mi < MOTE_STEPS + 1; mi += 1) {
    MOTE_COLS.push('rgba(246,240,230,' + ((mi / MOTE_STEPS) * MOTE_MAX).toFixed(3) + ')');
  }

  function drawMotes(now) {
    for (var i = 0; i < motes.length; i += 1) {
      var m = motes[i];
      var tw = 0.55 + 0.45 * Math.sin(now * 0.0009 * (0.5 + m.z) + m.ph);
      var step = Math.round((m.a * tw / MOTE_MAX) * MOTE_STEPS);
      ctx.fillStyle = MOTE_COLS[step < 0 ? 0 : step > MOTE_STEPS ? MOTE_STEPS : step];
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

  /* one point on the sheet, projected. Local units are unscaled;
     the sheet's scale is applied here. */
  function cardPoint(c, cx, cy, rot, s, lx, ly) {
    var x = lx * s, y = ly * s;
    var cyaw = Math.cos(c.yaw), syaw = Math.sin(c.yaw);
    var cp = Math.cos(c.pitch), sp = Math.sin(c.pitch);
    var cr = Math.cos(rot), sr = Math.sin(rot);
    var x1 = x * cyaw;
    var z1 = -x * syaw;
    var y2 = y * cp - z1 * sp;
    var z2 = y * sp + z1 * cp;
    var k = FOCAL / (CAM + z2);
    var px = x1 * k, py = y2 * k;
    return [cx + px * cr - py * sr, cy + px * sr + py * cr];
  }

  /* four corners of the sheet, projected. The near edge carries the
     paper's flex; the far edge carries a quarter of it. */
  function cardQuad(c, cx, cy, rot, s) {
    var hw = c.w / 2, hh = c.h / 2;
    var b = c.bend || 0, bx = c.bendX || 0;
    return [
      cardPoint(c, cx, cy, rot, s, -hw + bx * 0.25, -hh + b * 0.25),
      cardPoint(c, cx, cy, rot, s,  hw + bx * 0.25, -hh + b * 0.25),
      cardPoint(c, cx, cy, rot, s,  hw + bx,        hh + b),
      cardPoint(c, cx, cy, rot, s, -hw + bx,        hh + b)
    ];
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

  function warpStrip(img, q, u0, u1) {
    var w = img.width, h = img.height;
    var s0 = u0 * w, s1 = u1 * w;

    ctx.save();
    pathQuad(q);
    ctx.clip();
    if (triMap(ctx, s0, 0, s1, 0, s0, h, q[0], q[1], q[3])) ctx.drawImage(img, 0, 0);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(q[1][0], q[1][1]);
    ctx.lineTo(q[2][0], q[2][1]);
    ctx.lineTo(q[3][0], q[3][1]);
    ctx.closePath();
    ctx.clip();
    if (triMap(ctx, s1, 0, s1, h, s0, h, q[1], q[2], q[3])) ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  /* A flat sheet is one quad. A moving sheet is six vertical strips whose
     near edge follows a sine, so the paper bends instead of moving as a
     rigid card. */
  function drawCardSurface(c, cx, cy, rot, s) {
    var bend = c.bend || 0, bendX = c.bendX || 0;
    if (Math.abs(bend) < 0.8 && Math.abs(bendX) < 0.8) {
      if (Math.abs(c.yaw) < 0.085 && Math.abs(c.pitch) < 0.085) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.scale(s, s);
        ctx.drawImage(c.canvas, -c.w / 2, -c.h / 2, c.w, c.h);
        ctx.restore();
      } else {
        warpQuad(c.canvas, cardQuad(c, cx, cy, rot, s));
      }
      return;
    }

    var N = 12;
    var hw = c.w / 2, hh = c.h / 2;
    /* each strip overlaps its neighbour by a couple of pixels so the clip
       edge of one is painted over by the next; without this the anti-aliased
       clip seams read as cut lines across a flexing print */
    var overlap = 2;
    for (var i = 0; i < N; i += 1) {
      var um = (i + 0.5) / N;
      var b = bend * Math.sin(Math.PI * um);
      var bx = bendX * Math.sin(Math.PI * um);
      var lx0 = -hw + (i / N) * c.w - (i > 0 ? overlap : 0);
      var lx1 = -hw + ((i + 1) / N) * c.w + (i < N - 1 ? overlap : 0);
      var u0 = Math.max(0, (lx0 + hw) / c.w);
      var u1 = Math.min(1, (lx1 + hw) / c.w);
      var q = [
        cardPoint(c, cx, cy, rot, s, lx0 + bx * 0.25, -hh + b * 0.25),
        cardPoint(c, cx, cy, rot, s, lx1 + bx * 0.25, -hh + b * 0.25),
        cardPoint(c, cx, cy, rot, s, lx1 + bx, hh + b),
        cardPoint(c, cx, cy, rot, s, lx0 + bx, hh + b)
      ];
      warpStrip(c.canvas, q, u0, u1);
    }
  }

  function expandQuad(q, fx, fy, cx, cy) {
    return q.map(function (p) {
      return [cx + (p[0] - cx) * fx, cy + (p[1] - cy) * fy];
    });
  }

  function drawCastShadow(c, liftN, rot, cx, cy, s) {
    var baseA = ctx.globalAlpha;
    var off = 3 + liftN * 52;
    var ox = off * 0.55, oy = off * 0.95;
    var wide = clamp(liftN + Math.abs(c.bend || 0) / (c.h * 1.4), 0, 1);
    var q = cardQuad(c, cx + ox, cy + oy, rot, s * (1 + wide * 0.02));

    if (wide > 0.02) {
      var qc = expandQuad(q, (c.shadowCast.width / 2) / c.w, (c.shadowCast.height / 2) / c.h, cx + ox, cy + oy);
      ctx.globalAlpha = baseA * wide * 0.30;
      warpQuad(c.shadowCast, qc);
    }

    var qs = expandQuad(q, (c.shadowSoft.width / 2) / c.w, (c.shadowSoft.height / 2) / c.h, cx + ox, cy + oy);
    ctx.globalAlpha = baseA * 0.48 * (1 - wide * 0.55);
    warpQuad(c.shadowSoft, qs);
    ctx.globalAlpha = baseA;
  }

  function drawCard(c) {
    var lifted = c.drag || c.lift > 0.18 || c.windLift > 0.12;
    var fade = c.home && !c.free && !lifted ? Math.min(edgeFade(c), heroFade(c), slotFade(c)) : 1;
    if (fade < 0.02) return;
    if (fade < 1) ctx.globalAlpha = fade;

    var stack = c.stackLift || 0;
    var liftN = clamp(c.lift + (c.windLift || 0) + stack / c.h, 0, 1.2);
    var s = 1 + liftN * 0.075;
    var rot = c.rot + (c.asway || 0) + (c.windTwist || 0);
    var cx = c.x + (c.ax || 0);
    var cy = c.y + (c.ay || 0) - stack;
    var shadowY = c.y + (c.ay || 0);

    drawCastShadow(c, liftN, rot, cx, shadowY, s);

    drawCardSurface(c, cx, cy, rot, s);
    var q = cardQuad(c, cx, cy, rot, s);

    /* everything that lies on the sheet shares a single clip */
    var turn = clamp(Math.abs(c.yaw) * 3.4 + liftN * 0.55, 0, 1);
    var revealing = c.reveal < 1;
    if (turn > 0.02 || !calmNow || revealing) {
      ctx.save();
      pathQuad(q);
      ctx.clip();

      /* clearcoat: the edge turning away catches the tube, the other falls
         into shade */
      if (turn > 0.02) {
        var dir = c.yaw >= 0 ? 1 : -1;
        var gl = ctx.createLinearGradient(
          cx - c.w * 0.62 * dir, cy - c.h * 0.62,
          cx + c.w * 0.62 * dir, cy + c.h * 0.62
        );
        gl.addColorStop(0, 'rgba(255,250,240,' + (0.13 * turn).toFixed(3) + ')');
        gl.addColorStop(0.40, 'rgba(255,250,240,' + (0.03 * turn).toFixed(3) + ')');
        gl.addColorStop(0.62, 'rgba(0,0,0,' + (0.04 * turn).toFixed(3) + ')');
        gl.addColorStop(1, 'rgba(0,0,0,' + (0.18 * turn).toFixed(3) + ')');
        ctx.fillStyle = gl;
        ctx.fillRect(cx - c.w, cy - c.h, c.w * 2, c.h * 2);
      }

      /* a slow rake of tube light travels across the gloss */
      if (!calmNow) {
        var sweep = ((frameNow * 0.00006 + c.i * 0.17) % 1 + 1) % 1;
        var bx = cx - c.w * 0.7 + sweep * c.w * 1.4;
        var rake = ctx.createLinearGradient(bx - c.w * 0.30, cy - c.h * 0.5, bx + c.w * 0.30, cy + c.h * 0.5);
        rake.addColorStop(0, 'rgba(255,250,240,0)');
        rake.addColorStop(0.5, 'rgba(255,250,240,0.055)');
        rake.addColorStop(1, 'rgba(255,250,240,0)');
        ctx.fillStyle = rake;
        ctx.fillRect(cx - c.w, cy - c.h, c.w * 2, c.h * 2);
      }

      /* reveal — a scan line develops the print as it lands in the slot */
      if (revealing) {
        var bandY = cy - c.h / 2 + c.reveal * c.h;
        ctx.fillStyle = 'rgba(6,5,4,0.84)';
        ctx.fillRect(cx - c.w, bandY, c.w * 2, c.h);
        var bg = ctx.createLinearGradient(0, bandY - c.h * 0.14, 0, bandY + c.h * 0.02);
        bg.addColorStop(0, 'rgba(255,250,240,0)');
        bg.addColorStop(0.72, 'rgba(255,250,240,0.30)');
        bg.addColorStop(1, 'rgba(255,250,240,0)');
        ctx.fillStyle = bg;
        ctx.fillRect(cx - c.w, bandY - c.h * 0.14, c.w * 2, c.h * 0.16);
      }

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

  var liftedNow = false;

  function draw(now) {
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    ctx.clearRect(0, 0, W, H);

    var liftAny = false;
    for (var li = 0; li < cards.length; li += 1) {
      if (cards[li].drag || cards[li].lift > 0.18 || cards[li].windLift > 0.12) { liftAny = true; break; }
    }
    if (liftAny !== liftedNow) {
      liftedNow = liftAny;
      canvas.classList.toggle('is-lifting', liftAny);
    }

    if (!lite) drawMotes(now);

    var order = cards.slice().sort(function (a, b) {
      return (a.z || 0) - (b.z || 0) || a.y - b.y;
    });

    for (var i = 0; i < order.length; i += 1) drawCard(order[i]);
    if (inspect.active && inspect.phase === 'scan' && inspect.card) drawScan(inspect.card, inspect.scanT);
  }

  function drawScan(c, t) {
    var p = t < 0.52 ? t / 0.52 : 1 - clamp((t - 0.52) / 0.52, 0, 1);
    var cx = c.x + (c.ax || 0);
    var cy = c.y + (c.ay || 0) - (c.stackLift || 0);
    var top = cy - c.h / 2, left = cx - c.w / 2;
    var lineY = top + p * c.h;
    ctx.save();
    ctx.beginPath();
    ctx.rect(left, top, c.w, c.h);
    ctx.clip();
    ctx.fillStyle = 'rgba(6,5,4,0.42)';
    ctx.fillRect(left, top, c.w, Math.max(0, lineY - top));
    var g = ctx.createLinearGradient(0, lineY - 10, 0, lineY + 10);
    g.addColorStop(0, 'rgba(255,250,240,0)');
    g.addColorStop(0.45, 'rgba(255,250,240,0.20)');
    g.addColorStop(0.5, 'rgba(255,250,240,0.95)');
    g.addColorStop(0.55, 'rgba(255,250,240,0.20)');
    g.addColorStop(1, 'rgba(255,250,240,0)');
    ctx.fillStyle = g;
    ctx.fillRect(left, lineY - 10, c.w, 20);
    ctx.restore();
  }

  /* ------------------------------------------------------------
     loop
     ------------------------------------------------------------ */
  var last = 0;
  var rafId = 0;
  var forceDraw = false;
  var perf = { t0: 0, frames: 0, step: 0 };

  function adaptQuality(now) {
    if (perf.step >= 3) return;
    perf.frames += 1;
    if (!perf.t0) { perf.t0 = now; return; }
    var waited = now - perf.t0;
    if (waited < 1500) return;
    var fps = perf.frames / (waited / 1000);
    perf.frames = 0;
    perf.t0 = now;
    if (fps >= 50) return;
    perf.step += 1;
    if (perf.step === 1) {
      document.documentElement.classList.add('is-lean');
      motes.length = Math.floor(motes.length / 2);
      return;
    }
    /* the canvas is the expensive part: give back resolution, then particles */
    DPR_CAP = perf.step === 2 ? 1.25 : 1;
    motes.length = Math.floor(motes.length / 2);
    resizeCanvas();
  }

  /* in lite mode the loop parks itself as soon as nothing is moving, so a
     still page costs one paint instead of sixty a second */
  function needsFrame() {
    if (forceDraw) return true;
    for (var i = 0; i < cards.length; i += 1) {
      var c = cards[i];
      if (c.drag) return true;
      if (windState.amount > 0.001) return true;
      if (c.settleLift || c.breeze || c.exitTarget) return true;
      if (Math.abs(c.windTiltX) > 0.002 || Math.abs(c.windTiltZ) > 0.002 ||
          Math.abs(c.windLift) > 0.002 || Math.abs(c.windTwist) > 0.002) return true;
      if (Math.abs(c.bend) > 0.1 || Math.abs(c.bendV) > 0.1) return true;
      if (c.lift > 0.002 || Math.abs(c.liftV) > 0.01) return true;
      if (Math.abs(c.x - c.rx) > 0.6 || Math.abs(c.y - c.ry) > 0.6) return true;
      if (Math.abs(c.vx) > 2 || Math.abs(c.vy) > 2) return true;
      if (Math.abs(c.vrot) > 0.01) return true;
      if (Math.abs(c.rot - c.restRot) > 0.002) return true;
      if (!c.home && (Math.abs(c.x - c.tx) > 0.6 || Math.abs(c.y - c.ty) > 0.6)) return true;
      if (c.reveal < 1) return true;
    }
    return false;
  }

  function loop(t) {
    rafId = 0;
    var dt = last ? Math.min(0.033, (t - last) / 1000) : 0.016;
    last = t;
    if (!lite) adaptQuality(t);
    simulate(dt, t);
    draw(t);
    forceDraw = false;
    if (!lite) Sound.wind(windEnergy, windPan);
    if (!lite || needsFrame()) rafId = requestAnimationFrame(loop);
    else last = 0;
  }

  function kick() {
    forceDraw = true;
    if (!rafId) rafId = requestAnimationFrame(loop);
  }

  function applyLite(on) {
    lite = on;
    last = 0;
    cards.forEach(function (c) {
      if (on) {
        c.reveal = 1;
        c.drag = false;
        c.lift = 0;
        c.liftV = 0;
        c.vx = 0;
        c.vy = 0;
        c.vrot = 0;
        c.ax = 0; c.ay = 0; c.asway = 0;
      }
    });
    resizeCanvas();
    /* the wind follows the paper: with the paper still, it has to fall silent */
    if (on && Sound) Sound.wind(0, 0);
    kick();
  }

  document.addEventListener('lite:change', function (e) {
    applyLite(!!(e.detail && e.detail.on));
  });

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
      ambient.gain.value = 1;
      ambient.connect(master);

      /* the harmonic ladder is what makes this audible on laptop and phone
         speakers — a bare 55 Hz fundamental is silent on both */
      [[55, 0.042], [110, 0.026], [165, 0.015], [220, 0.008]].forEach(function (p) {
        var o = ac.createOscillator();
        o.type = 'sine';
        o.frequency.value = p[0];
        var g = ac.createGain();
        g.gain.value = p[1];
        o.connect(g);
        g.connect(ambient);
        o.start();
      });

      var bed = ac.createBufferSource();
      bed.buffer = noise(6);
      bed.loop = true;
      var lp = ac.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 900;
      lp.Q.value = 0.4;
      var bedGain = ac.createGain();
      bedGain.gain.value = 0.26;
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
      windFilter.frequency.value = 900;
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
      master.gain.setTargetAtTime(0.9, ac.currentTime, 0.5);
      try { localStorage.setItem(PREF, '1'); } catch (e) {}
      paper(0.12);
      blip(392, 0.16, 'sine', 0.09);
      setTimeout(function () { blip(587, 0.22, 'sine', 0.07); }, 90);
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
      scan: function () {
        if (!built || !enabled) return;
        var t = ac.currentTime;
        var src = ac.createBufferSource();
        src.buffer = noise(0.8);
        var bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.Q.value = 2.1;
        bp.frequency.setValueAtTime(420, t);
        bp.frequency.exponentialRampToValueAtTime(3800, t + 0.55);
        var g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.09, t + 0.08);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);
        src.connect(bp); bp.connect(g); g.connect(master);
        src.start(t); src.stop(t + 1);
      },
      breeze: function () {
        if (!built || !enabled) return;
        var t = ac.currentTime;
        var src = ac.createBufferSource();
        src.buffer = noise(0.7);
        var bp = ac.createBiquadFilter();
        bp.type = 'bandpass';
        bp.frequency.value = 900;
        bp.Q.value = 0.7;
        var g = ac.createGain();
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.05, t + 0.2);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.4);
        src.connect(bp); bp.connect(g); g.connect(master);
        src.start(t); src.stop(t + 1.5);
      },
      wind: function (energy, pan) {
        if (!built || !windGain || !ac) return;
        var amount = enabled ? clamp(energy / 1500, 0, 1) : 0;
        var t = ac.currentTime;
        windGain.gain.setTargetAtTime(amount * amount * 0.32, t, 0.12);
        if (windPan) windPan.pan.setTargetAtTime(clamp(pan, -1, 1), t, 0.15);
        if (windFilter) windFilter.frequency.setTargetAtTime(700 + amount * 700, t, 0.2);
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
      if (inspect.active) endInspect();
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
    if (window.__boot) window.__boot.set(70, 'developing prints');
    layout();
    resizeCanvas();
    kick();
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        if (window.__boot) window.__boot.done();
      });
    });
  }

  canvas.addEventListener('pointermove', onMove, { passive: true });
  canvas.addEventListener('pointerdown', onDown);
  canvas.addEventListener('pointerup', onUp);
  canvas.addEventListener('pointercancel', onUp);
  canvas.addEventListener('pointerleave', onLeave);
  canvas.addEventListener('pointerenter', onMove, { passive: true });
  window.addEventListener('blur', resetWind);
  window.addEventListener('wheel', function () { windLastInput = performance.now(); }, { passive: true });
  window.addEventListener('keydown', function () { windLastInput = performance.now(); });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) resetWind();
  });
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', resetWind);

  var pending = 0;
  function onResize() {
    if (pending) cancelAnimationFrame(pending);
    pending = requestAnimationFrame(function () {
      pending = 0;
      layout();
      resizeCanvas();
    });
  }
  if (/[?&]probe=1/.test(location.search)) {
    window.__zstudio = {
      cards: function () {
        return cards.map(function (c) {
          return {
            i: c.i, x: c.x + c.ax, y: c.y + c.ay, rx: c.rx, ry: c.ry,
            lift: c.lift, rot: c.rot, vx: c.vx, vy: c.vy, vrot: c.vrot,
            home: c.home, free: c.free, drag: c.drag, reveal: c.reveal,
            wx: c.windMotion.dx, wy: c.windMotion.dz,
            wdyaw: c.windMotion.dyaw, wspin: c.windMotion.spinVelocity,
            wvx: c.windMotion.vx, wvz: c.windMotion.vz,
            wtiltx: c.windTiltX, wtiltz: c.windTiltZ,
            wlift: c.windLift, twist: c.windTwist, bend: c.bend, ay: c.ay,
            bendX: c.bendX, stack: c.stackLift, locked: c.locked, z: c.z,
            breeze: !!c.breeze, settle: !!c.settleLift,
            fade: (c.home && !c.free) ? Math.min(edgeFade(c), heroFade(c), slotFade(c)) : 1
          };
        });
      },
      place: place,
      sendHome: sendHome,
      wind: function () {
        return {
          amount: windState.amount, active: windState.active,
          x: windState.x, y: windState.y, strokeId: windState.strokeId,
          idle: Math.round(performance.now() - windLastInput),
          sinceBreeze: Math.round(performance.now() - lastBreeze),
          gustX: windSample.gustX, gustY: windSample.gustY,
          gustTime: windSample.gustTime, svx: windSample.vx, svy: windSample.vy
        };
      },
      story: function () {
        return {
          open: storyOpen,
          title: (document.getElementById('storyTitle') || {}).textContent || ''
        };
      },
      inspect: function () {
        return {
          active: inspect.active, phase: inspect.phase,
          card: inspect.card ? inspect.card.i : -1, scanT: inspect.scanT
        };
      },
      well: function () {
        return {
          found: wellHint.found, count: wellHint.count,
          hinting: slotEl.classList.contains('is-hinting')
        };
      },
      holdScan: function (t) {
        inspect.phase = 'scan';
        inspect.scanT = t;
        inspect.hold = true;
        kick();
      }
    };
  }

  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('orientationchange', onResize, { passive: true });

  /* hold the curtain for the webfonts so captions are never drawn in fallback */
  var fontsReady = document.fonts && document.fonts.ready;
  var started = false, startedBeforeFonts = false;
  function begin() {
    if (started) return;
    started = true;
    start();
  }
  if (fontsReady) {
    if (window.__boot) window.__boot.set(35, 'loading type');
    fontsReady.then(begin);
    setTimeout(function () {
      if (!started) startedBeforeFonts = true;
      begin();
    }, 1600);
  } else {
    begin();
  }

  /* the curtain lifted on a timeout, so redraw the captions in the real face */
  if (fontsReady) {
    fontsReady.then(function () {
      if (!startedBeforeFonts || !cards.length) return;
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
})();
