/* ============================================================
   CRT screen — convex (barrel) glass shape
   Builds one SVG path: a rounded rectangle whose four edges bow
   outward at their midpoints, so the corners pinch in and the
   glass reads as a bulging tube.
   ============================================================ */
(function () {
  'use strict';

  var root    = document.getElementById('crt');
  var screen  = document.getElementById('crtScreen');
  var bevel   = document.getElementById('crtBevel');
  var bezel   = document.getElementById('crtBezel');
  var stroke  = document.getElementById('crtStroke');
  var rimPaths = stroke.querySelectorAll('path');
  var content = document.getElementById('crtContent');

  /* Tuning knobs — also settable as data-corner / data-mid / data-radius on #crt */
  var shape = {
    corner: null,   // margin at the corners (px)
    mid:    null,   // margin at the middle of each edge (px)
    radius: null    // corner radius (px)
  };

  function clamp(v, min, max) { return Math.min(max, Math.max(min, v)); }

  function metrics(w, h) {
    var mobile = w <= 768;
    var corner = shape.corner != null ? shape.corner : (mobile ? 12 : 38);
    var mid    = shape.mid    != null ? shape.mid    : (mobile ? 4  : 8);
    var radius = shape.radius != null ? shape.radius
      : (mobile ? clamp(w * 0.030, 18, 28) : clamp(w * 0.042, 40, 70));

    // keep the window valid on very small or very wide viewports
    var short = Math.min(w, h);
    corner = clamp(corner, 0, short * 0.18);
    mid    = clamp(mid, 0, corner);
    radius = clamp(radius, 0, Math.min(short * 0.22, Math.min(w, h) / 2 - corner));

    return { corner: corner, mid: mid, radius: radius };
  }

  /* The shape. Quadratic curves only, so it stays smooth at any size. */
  function barrelPath(w, h, m) {
    var c = m.corner, d = m.mid, r = m.radius;
    var x0 = c,       x1 = w - c;      // straight-ish spans, ends of the corners
    var y0 = c,       y1 = h - c;
    var l  = c + r,   rr = w - c - r;  // where the corner arc starts
    var t  = c + r,   b  = h - c - r;

    return [
      'M ' + l + ',' + c,
      'Q ' + (w / 2) + ',' + d + ' ' + rr + ',' + c,                 // top, bows up
      'Q ' + x1 + ',' + c + ' ' + x1 + ',' + t,                       // top-right
      'Q ' + (w - d) + ',' + (h / 2) + ' ' + x1 + ',' + b,            // right, bows out
      'Q ' + x1 + ',' + y1 + ' ' + rr + ',' + y1,                     // bottom-right
      'Q ' + (w / 2) + ',' + (h - d) + ' ' + l + ',' + y1,            // bottom, bows down
      'Q ' + c + ',' + y1 + ' ' + c + ',' + b,                        // bottom-left
      'Q ' + d + ',' + (h / 2) + ' ' + c + ',' + t,                   // left, bows out
      'Q ' + c + ',' + c + ' ' + l + ',' + c,                         // top-left
      'Z'
    ].join(' ');
  }

  var frame = 0;

  function render() {
    frame = 0;

    var w = Math.round(window.innerWidth);
    var h = Math.round(window.innerHeight);
    if (!w || !h) return;

    var m = metrics(w, h);
    var inner = barrelPath(w, h, m);
    var outer = 'M 0,0 L ' + w + ',0 L ' + w + ',' + h + ' L 0,' + h + ' Z';

    // window: clipped to the barrel
    screen.style.clipPath = 'path("' + inner + '")';
    bevel.style.clipPath  = 'path("' + inner + '")';
    stroke.style.clipPath = 'path("' + inner + '")';

    // frame: everything except the barrel
    bezel.style.clipPath = 'path(evenodd, "' + outer + ' ' + inner + '")';

    stroke.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    for (var i = 0; i < rimPaths.length; i += 1) {
      rimPaths[i].setAttribute('d', inner);
    }

    // keep the content box exactly the window size
    content.style.clipPath = 'path("' + inner + '")';
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(render);
  }

  /* Public tuning hook: crtScreen.setShape({ corner, mid, radius }) */
  window.crtScreen = {
    setShape: function (next) {
      Object.keys(shape).forEach(function (key) {
        if (next && next[key] !== undefined) shape[key] = next[key];
      });
      schedule();
    },
    path: function () {
      var m = metrics(window.innerWidth, window.innerHeight);
      return barrelPath(Math.round(window.innerWidth), Math.round(window.innerHeight), m);
    },
    metrics: function () {
      return metrics(window.innerWidth, window.innerHeight);
    }
  };

  // optional test pattern
  if (/[?&]grid=1\b/.test(location.search)) {
    var grid = document.createElement('div');
    grid.className = 'crt__grid';
    content.insertBefore(grid, content.firstChild);
    root.classList.add('crt--grid');
  }

  // data-* overrides
  ['corner', 'mid', 'radius'].forEach(function (key) {
    var v = parseFloat(root.getAttribute('data-' + key));
    if (Number.isFinite(v)) shape[key] = v;
  });

  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('orientationchange', schedule, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', schedule, { passive: true });
  }

  render();
})();
