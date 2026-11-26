/* ============================================================
   Tube glow — the multi-hue rim from oryzo's "Powered by AI"
   section (their AppleEfx post pass), rewritten as a transparent
   WebGL overlay inside #crtScreen, so the barrel clip shapes it.

   Theirs is a full-screen post effect: a rotating four-corner
   colour ramp (#ff9cff / #ff9638 / #ffff22 / #54ffff), cubed for
   saturation, masked to a border band by a signed distance field,
   with a ring that leaves the right edge every two seconds and
   bends the band as it passes. Here the band's SDF is the CRT
   barrel itself, and the ring leaves the assistant.
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('crtGlow');
  if (!canvas) return;
  if (/[?&]glow=0/.test(location.search)) { canvas.remove(); return; }

  var attrs = {
    alpha: true, premultipliedAlpha: true, antialias: false,
    depth: false, stencil: false, powerPreference: 'low-power'
  };
  var gl = canvas.getContext('webgl', attrs) || canvas.getContext('experimental-webgl', attrs);
  if (!gl) { canvas.remove(); return; }

  /* half-ish resolution: a soft rim does not need full device pixels */
  var SCALE = 0.6;
  var DPR = Math.min(2, window.devicePixelRatio || 1);

  var vs = [
    'attribute vec2 position;',
    'varying vec2 v_uv;',
    'void main(){ v_uv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }'
  ].join('\n');

  var fs = [
    'precision mediump float;',
    'varying vec2 v_uv;',
    'uniform vec2  u_res;',
    'uniform float u_time;',
    'uniform float u_amount;',
    'uniform float u_pad;',
    'uniform float u_pulse;',
    'uniform vec2  u_pulseCenter;',
    'uniform vec2  u_cover;',
    'uniform vec3  u_c0;',
    'uniform vec3  u_c1;',
    'uniform vec3  u_c2;',
    'uniform vec3  u_c3;',
    'uniform float u_corner;',
    'uniform float u_mid;',
    'uniform float u_radius;',

    'float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }',

    'float sdRoundRect(vec2 p, vec2 b, float r){',
    '  vec2 q = abs(p) - b + r;',
    '  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;',
    '}',

    /* signed distance to the barrel: rounded rect, edges bowed outward at their midpoints */
    'float barrel(vec2 p){',
    '  vec2 halfSize = u_res * 0.5;',
    '  vec2 b = halfSize - u_corner;',
    '  float d = sdRoundRect(p, b, u_radius);',
    '  vec2 u = abs(p) / max(b, vec2(1.0));',
    '  float bow = (u.x > u.y) ? (1.0 - u.y * u.y) : (1.0 - u.x * u.x);',
    '  return d - (u_corner - u_mid) * clamp(bow, 0.0, 1.0);',
    '}',

    'void main(){',
    '  vec2 uv = v_uv;',
    '  vec2 p = (uv - 0.5) * u_res;',

    /* the colour field: four corners, rotated 5 rad/s, clamped, then cubed */
    '  vec2 glowUv = (uv - 0.5) * u_cover * 2.0;',
    '  float ang = u_time * -5.0;',
    '  mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));',
    '  glowUv = rot * glowUv;',
    '  glowUv = clamp(glowUv * 0.5 + 0.5, 0.0, 1.0);',
    '  vec3 cT = mix(u_c0, u_c1, glowUv.x);',
    '  vec3 cB = mix(u_c3, u_c2, glowUv.x);',
    '  vec3 hue = mix(cB, cT, glowUv.y);',
    '  hue *= hue * hue * 2.0;',

    /* the ring: leaves the assistant every ~3 s, and bends the rim on its way out */
    '  vec2 aspect = vec2(u_res.x / u_res.y, 1.0);',
    '  vec2 wp = (uv - u_pulseCenter) * aspect;',
    '  float wl = length(aspect);',
    '  float wpl = wl - length(wp);',
    '  float wsl = 0.5 * wl;',
    '  float wt = u_pulse * (wl + wl) - wl + wpl;',
    '  float w0 = smoothstep(0.0, wsl, wt);',
    '  float w1 = smoothstep(wl, wsl, wt);',
    '  float wave = w0 * w1 * u_amount;',
    '  vec2 dir = normalize(wp + vec2(1e-4));',

    '  float sd = barrel(p + dir * wave * 0.010 * u_res.x);',
    '  float inset = -sd;',

    '  float rim = 1.0 - smoothstep(0.0, u_pad, inset);',
    '  float haze = 1.0 - smoothstep(0.0, u_pad * 3.2, inset);',
    '  rim = pow(rim, 2.6);',
    '  float g = rim + haze * 0.34;',

    '  float lit = g * u_amount * 0.85 + wave * (rim * 0.45 + 0.05);',
    '  float alpha = clamp(lit, 0.0, 1.0);',
    '  vec3 col = hue * alpha;',

    /* dither, or the long falloff bands on a dark screen */
    '  float n = (hash(gl_FragCoord.xy + fract(u_time)) - 0.5) * 0.006;',
    '  gl_FragColor = vec4(col + n * alpha, alpha);',
    '}'
  ].join('\n');

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }

  var prog = gl.createProgram();
  try {
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, vs));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fs));
    gl.bindAttribLocation(prog, 0, 'position');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
  } catch (err) {
    canvas.remove();
    return;
  }
  gl.useProgram(prog);

  var buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  var U = {};
  ['u_res', 'u_time', 'u_amount', 'u_pad', 'u_pulse', 'u_pulseCenter',
   'u_cover', 'u_c0', 'u_c1', 'u_c2', 'u_c3',
   'u_corner', 'u_mid', 'u_radius'].forEach(function (n) {
    U[n] = gl.getUniformLocation(prog, n);
  });

  var toLinear = function (c) { return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  var lin = function (hex) {
    return [1, 3, 5].map(function (i) { return toLinear(parseInt(hex.slice(i, i + 2), 16) / 255); });
  };
  var PALETTE = ['#ff9cff', '#ff9638', '#ffff22', '#54ffff'].map(lin);
  gl.uniform3fv(U.u_c0, PALETTE[0]);
  gl.uniform3fv(U.u_c1, PALETTE[1]);
  gl.uniform3fv(U.u_c2, PALETTE[2]);
  gl.uniform3fv(U.u_c3, PALETTE[3]);

  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);

  /* --- geometry, mirrored from crt-screen.js ------------------------- */
  var shape = {
    metrics: function (w, h) {
      var mobile = w <= 768;
      var corner = mobile ? 12 : 38;
      var mid = mobile ? 4 : 8;
      var radius = mobile
        ? Math.min(Math.max(w * 0.030, 18), 28)
        : Math.min(Math.max(w * 0.042, 40), 70);
      var short = Math.min(w, h);
      corner = Math.min(Math.max(corner, 0), short * 0.18);
      mid = Math.min(Math.max(mid, 0), corner);
      radius = Math.min(Math.max(radius, 0), Math.min(short * 0.22, Math.min(w, h) / 2 - corner));
      return { corner: corner, mid: mid, radius: radius };
    }
  };

  var view = { w: 0, h: 0, px: 1 };
  function resize() {
    view.w = Math.max(1, Math.round(window.innerWidth));
    view.h = Math.max(1, Math.round(window.innerHeight));
    var w = Math.max(1, Math.round(view.w * DPR * SCALE));
    var h = Math.max(1, Math.round(view.h * DPR * SCALE));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    gl.viewport(0, 0, w, h);
    view.px = w / view.w;

    var m = shape.metrics(view.w, view.h);
    gl.uniform2f(U.u_res, w, h);
    gl.uniform1f(U.u_corner, m.corner * view.px);
    gl.uniform1f(U.u_mid, m.mid * view.px);
    gl.uniform1f(U.u_radius, m.radius * view.px);
    gl.uniform1f(U.u_pad, Math.min(50, Math.min(view.w, view.h) * 0.1) * view.px);

    var i = Math.min(h / w, 1) / Math.sqrt(w * w + h * h) * Math.max(w, h);
    gl.uniform2f(U.u_cover, (w / h) * i, i);

    var dock = document.querySelector('.marvin');
    if (dock) {
      var r = dock.getBoundingClientRect();
      gl.uniform2f(U.u_pulseCenter,
        (r.left + r.width / 2) / view.w,
        1 - (r.top + r.height / 2) / view.h);
    } else {
      gl.uniform2f(U.u_pulseCenter, 1.001, 0.12);
    }
  }

  window.addEventListener('resize', resize);
  resize();

  /* --- state --------------------------------------------------------- */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  var state = {
    t: 0,
    pulse: 1,
    hold: 0,
    amount: 0,
    target: 0.45,
    clock: 0
  };

  document.addEventListener('boot:done', function () {
    state.target = 0.45;
    canvas.classList.add('is-on');
  });
  if (window.__bootDone) canvas.classList.add('is-on');

  /* the assistant opens: the tube lights up and the ring leaves it */
  var crt = document.getElementById('crt');
  if (crt && window.MutationObserver) {
    var wasChat = false;
    new MutationObserver(function () {
      var chat = crt.classList.contains('is-chat');
      if (chat === wasChat) return;
      wasChat = chat;
      if (chat) {
        state.target = 1;
        state.pulse = 0;
        state.hold = 0;
      } else {
        state.target = 0.45;
      }
    }).observe(crt, { attributes: true, attributeFilter: ['class'] });
  }

  var last = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    if (!last) last = now;
    var dt = Math.min((now - last) / 1000, 1 / 20);
    last = now;
    if (document.hidden) return;

    var k = 1 - Math.pow(0.002, dt);
    state.amount += (state.target - state.amount) * k;

    if (reduce.matches) {
      state.clock += dt * 0.12;
      state.pulse = 1;
    } else {
      state.clock += dt;
      if (state.pulse < 1) {
        state.pulse = Math.min(1, state.pulse + dt * 0.5);
      } else {
        state.hold += dt;
        if (state.hold > 1.4) { state.hold = 0; state.pulse = 0; }
      }
    }

    gl.uniform1f(U.u_time, state.clock);
    gl.uniform1f(U.u_amount, state.amount);
    gl.uniform1f(U.u_pulse, state.pulse);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  requestAnimationFrame(frame);
})();
