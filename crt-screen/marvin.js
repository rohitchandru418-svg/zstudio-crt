/* ============================================================
   Marvin — floating assistant.
   This file is the idle character only. The chat panel is a
   separate chunk (marvin-panel.js) fetched on first intent.
   ============================================================ */
(function () {
  if (window.__marvin) return;

  var PANEL_CSS = 'marvin-panel.css?v=36';
  var PANEL_JS = 'marvin-panel.js?v=36';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ----------------------------------------------------------
     the character
     ---------------------------------------------------------- */
  var SVG =
    '<svg viewBox="0 0 88 88" role="img" aria-hidden="true" focusable="false">' +
      '<defs>' +
        /* cabinet: charcoal with a warm cast, lit from the top-left */
        '<linearGradient id="mCase" x1=".12" y1="0" x2=".88" y2="1">' +
          '<stop offset="0" stop-color="#3f3930"/>' +
          '<stop offset=".5" stop-color="#2b2620"/>' +
          '<stop offset="1" stop-color="#1a1713"/>' +
        '</linearGradient>' +
        '<linearGradient id="mSheen" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="#fff4e2" stop-opacity=".22"/>' +
          '<stop offset="1" stop-color="#fff4e2" stop-opacity="0"/>' +
        '</linearGradient>' +
        '<linearGradient id="mEdge" x1="0" y1="0" x2="1" y2="1">' +
          '<stop offset="0" stop-color="#fff4e2" stop-opacity=".45"/>' +
          '<stop offset=".42" stop-color="#fff4e2" stop-opacity=".07"/>' +
          '<stop offset="1" stop-color="#000" stop-opacity=".35"/>' +
        '</linearGradient>' +
        /* glass: falls off to the corners */
        '<radialGradient id="mGlass" cx=".46" cy=".36" r=".78">' +
          '<stop offset="0" stop-color="#2c2118"/>' +
          '<stop offset=".58" stop-color="#151009"/>' +
          '<stop offset="1" stop-color="#050403"/>' +
        '</radialGradient>' +
        /* phosphor warmth sitting just off the glass */
        '<radialGradient id="mPhos" cx=".5" cy=".5" r=".62">' +
          '<stop offset="0" stop-color="#ff9a3c" stop-opacity=".20"/>' +
          '<stop offset="1" stop-color="#ff9a3c" stop-opacity="0"/>' +
        '</radialGradient>' +
        '<radialGradient id="mEyeGlow" cx=".5" cy=".5" r=".5">' +
          '<stop offset="0" stop-color="#ffb469" stop-opacity=".55"/>' +
          '<stop offset="1" stop-color="#ffb469" stop-opacity="0"/>' +
        '</radialGradient>' +
        /* one soft window reflection across the curved face */
        '<linearGradient id="mStreak" x1="0" y1="1" x2="1" y2="0">' +
          '<stop offset=".28" stop-color="#fff" stop-opacity="0"/>' +
          '<stop offset=".46" stop-color="#fff" stop-opacity=".09"/>' +
          '<stop offset=".53" stop-color="#fff" stop-opacity=".03"/>' +
          '<stop offset=".66" stop-color="#fff" stop-opacity="0"/>' +
        '</linearGradient>' +
        '<radialGradient id="mGround" cx=".5" cy=".5" r=".5">' +
          '<stop offset="0" stop-color="#000" stop-opacity=".62"/>' +
          '<stop offset="1" stop-color="#000" stop-opacity="0"/>' +
        '</radialGradient>' +
        '<pattern id="mScan" width="2" height="3" patternUnits="userSpaceOnUse">' +
          '<rect width="2" height="1" fill="#000" fill-opacity=".5"/>' +
        '</pattern>' +
      '</defs>' +

      /* contact shadow on the page */
      '<ellipse cx="44" cy="80" rx="26" ry="3.4" fill="url(#mGround)"/>' +

      /* whip antenna with a warm tip */
      '<circle cx="44" cy="11.6" r="5" fill="url(#mEyeGlow)" opacity=".55"/>' +
      '<line x1="44" y1="14.4" x2="44" y2="20.4" stroke="#efe8dc" stroke-opacity=".40" stroke-width="1.3" stroke-linecap="round"/>' +
      '<circle cx="44" cy="11.6" r="1.8" fill="#ffb469"/>' +

      /* cabinet */
      '<rect x="8" y="18" width="72" height="56" rx="10" fill="url(#mCase)"/>' +
      '<rect x="8.45" y="18.45" width="71.1" height="55.1" rx="9.6" fill="none" stroke="url(#mEdge)" stroke-width=".9"/>' +
      '<rect x="9" y="19" width="70" height="15" rx="9" fill="url(#mSheen)"/>' +

      /* recessed screen well */
      '<rect x="13.4" y="25" width="61.2" height="43" rx="6.6" fill="#040302"/>' +
      '<rect x="13.4" y="25" width="61.2" height="43" rx="6.6" fill="none" stroke="#000" stroke-opacity=".85" stroke-width="1.1"/>' +
      '<rect x="15.2" y="26.8" width="57.6" height="39.4" rx="5.4" fill="url(#mGlass)"/>' +
      '<rect class="marvin__glow" x="15.2" y="26.8" width="57.6" height="39.4" rx="5.4" fill="url(#mPhos)"/>' +

      /* the face — one layer per expression, swapped by data-emote */
      '<g id="mEyesTrack">' +
        '<circle cx="34.7" cy="45.2" r="7.4" fill="url(#mEyeGlow)" opacity=".42"/>' +
        '<circle cx="53.3" cy="45.2" r="7.4" fill="url(#mEyeGlow)" opacity=".42"/>' +

        '<g class="m-ex m-ex--idle marvin__eyes">' +
          '<rect x="31.4" y="39.8" width="6.6" height="10.8" rx="3.3" fill="#ffd7a4"/>' +
          '<rect x="50" y="39.8" width="6.6" height="10.8" rx="3.3" fill="#ffd7a4"/>' +
        '</g>' +

        '<g class="m-ex m-ex--happy" fill="none" stroke="#ffd7a4" stroke-width="2.6" stroke-linecap="round">' +
          '<path d="M30.6 46.4 Q34.7 40.4 38.8 46.4"/>' +
          '<path d="M49.2 46.4 Q53.3 40.4 57.4 46.4"/>' +
        '</g>' +

        '<g class="m-ex m-ex--wink">' +
          '<path d="M30.6 46.4 Q34.7 40.4 38.8 46.4" fill="none" stroke="#ffd7a4" stroke-width="2.6" stroke-linecap="round"/>' +
          '<rect x="49.9" y="44.4" width="6.8" height="2.4" rx="1.2" fill="#ffd7a4"/>' +
        '</g>' +

        '<g class="m-ex m-ex--love" fill="#ffd7a4">' +
          '<path d="M34.7 50.2c-3.4-2.4-5.2-4.1-5.2-6.1a2.8 2.8 0 0 1 5.2-1.5 2.8 2.8 0 0 1 5.2 1.5c0 2-1.8 3.7-5.2 6.1z"/>' +
          '<path d="M53.3 50.2c-3.4-2.4-5.2-4.1-5.2-6.1a2.8 2.8 0 0 1 5.2-1.5 2.8 2.8 0 0 1 5.2 1.5c0 2-1.8 3.7-5.2 6.1z"/>' +
        '</g>' +

        '<g class="m-ex m-ex--shock" fill="#ffd7a4">' +
          '<circle cx="34.7" cy="45.2" r="5.1"/>' +
          '<circle cx="53.3" cy="45.2" r="5.1"/>' +
        '</g>' +

        /* working states — the ones the chat actually uses */
        '<g class="m-ex m-ex--think" fill="#ffd7a4">' +
          '<rect x="31.6" y="38.6" width="6.2" height="7.4" rx="2.4"/>' +
          '<rect x="50.2" y="38.6" width="6.2" height="7.4" rx="2.4"/>' +
        '</g>' +

        '<g class="m-ex m-ex--scan">' +
          '<rect class="m-scanbar" x="31.4" y="43.4" width="6.6" height="2.4" rx="1.2" fill="#ffd7a4"/>' +
          '<rect class="m-scanbar m-scanbar--b" x="50" y="43.4" width="6.6" height="2.4" rx="1.2" fill="#ffd7a4"/>' +
        '</g>' +

        '<g class="m-ex m-ex--squint" fill="none" stroke="#ffd7a4" stroke-width="2.1" stroke-linecap="round">' +
          '<path d="M30.9 43.6 L38.5 46.4"/>' +
          '<path d="M57.1 43.6 L49.5 46.4"/>' +
        '</g>' +

        '<g class="m-ex m-ex--unsure" fill="#ffd7a4">' +
          '<rect x="31.6" y="41.2" width="6.2" height="8.4" rx="3.1"/>' +
          '<rect x="50.2" y="41.2" width="6.2" height="8.4" rx="3.1"/>' +
        '</g>' +

        '<g class="m-ex m-ex--ask" fill="#ffd7a4">' +
          '<circle cx="34.7" cy="44.4" r="4.5"/>' +
          '<circle cx="53.3" cy="44.4" r="4.5"/>' +
        '</g>' +

        '<g class="m-ex m-ex--focus" fill="#ffd7a4">' +
          '<rect x="30.4" y="42.4" width="8.4" height="5" rx="2.5"/>' +
          '<rect x="49.2" y="42.4" width="8.4" height="5" rx="2.5"/>' +
        '</g>' +
      '</g>' +

      '<g class="m-mouth">' +
        '<rect class="m-mouth__l m-mouth__l--idle" x="40.7" y="55.6" width="6.6" height="1.7" rx=".85" fill="#ffd7a4" fill-opacity=".36"/>' +
        '<ellipse class="m-mouth__l m-mouth__l--speak" cx="44" cy="56.4" rx="3.1" ry="2.2" fill="#ffd7a4" fill-opacity=".62"/>' +
        '<path class="m-mouth__l m-mouth__l--happy" d="M39.7 55.2 Q44 60.1 48.3 55.2" fill="none" stroke="#ffd7a4" stroke-opacity=".6" stroke-width="1.6" stroke-linecap="round"/>' +
        '<ellipse class="m-mouth__l m-mouth__l--shock" cx="44" cy="57.6" rx="2" ry="2.6" fill="#ffd7a4" fill-opacity=".55"/>' +
      '</g>' +

      /* glass thickness catching the light, and the tube's spill on the chassis */
      '<rect x="14.5" y="26.1" width="59" height="40.9" rx="6" fill="none" stroke="#fff4e2" stroke-opacity=".07"/>' +
      '<rect x="11.8" y="23.4" width="64.4" height="46.4" rx="8" fill="none" stroke="#ff9a3c" stroke-opacity=".08" stroke-width="2.2"/>' +

      /* glass furniture */
      '<rect class="marvin__scan" x="15.2" y="26.8" width="57.6" height="39.4" rx="5.4"/>' +
      '<rect x="15.2" y="26.8" width="57.6" height="39.4" rx="5.4" fill="url(#mStreak)"/>' +

      /* status LED on the chassis + vents on the other side */
      '<circle cx="70.8" cy="71.2" r="4.2" fill="url(#mEyeGlow)" opacity=".5"/>' +
      '<circle cx="70.8" cy="71.2" r="1.4" fill="#ff9236"/>' +
      '<g stroke="#efe8dc" stroke-opacity=".13" stroke-width=".9">' +
        '<line x1="17.4" y1="71.4" x2="26.4" y2="71.4"/>' +
        '<line x1="17.4" y1="73" x2="26.4" y2="73"/>' +
      '</g>' +

      /* feet */
      '<rect x="21.6" y="73.4" width="9.4" height="5.6" rx="2.4" fill="#16130f" stroke="#efe8dc" stroke-opacity=".10" stroke-width=".6"/>' +
      '<rect x="57" y="73.4" width="9.4" height="5.6" rx="2.4" fill="#16130f" stroke="#efe8dc" stroke-opacity=".10" stroke-width=".6"/>' +
    '</svg>';

  /* ----------------------------------------------------------
     mount
     ---------------------------------------------------------- */
  var dock = el('div', 'marvin-dock');
  var btn = el('button', 'marvin');
  btn.type = 'button';
  btn.id = 'marvin';
  btn.setAttribute('aria-label', 'Open Marvin assistant');
  btn.setAttribute('aria-haspopup', 'dialog');
  btn.setAttribute('aria-expanded', 'false');

  var bob = el('span', 'marvin__bob');
  var body = el('span', 'marvin__body', SVG);
  bob.appendChild(body);
  btn.appendChild(bob);

  /* ----------------------------------------------------------
     the tooltip — one bubble, two jobs: a greeting once the
     tube finishes booting, a fresh line on every hover
     ---------------------------------------------------------- */
  var bubble = el('div', 'marvin__bubble');
  bubble.setAttribute('aria-hidden', 'true');

  dock.appendChild(btn);
  dock.appendChild(bubble);
  document.body.appendChild(dock);

  var GREETING = "Hi. Tell me what's broken.";

  var LINES = [
    'Ask me about your workflow.',
    'I have opinions about spreadsheets.',
    'Stuck with manual work?',
    'Tell me what hurts.',
    'Nine tabs open? I can fix that.',
    'Where does the work pile up?',
    'I run on curiosity and heat.',
    'Say the messy part out loud.'
  ];

  /* dealt from a shuffled bag so no line repeats until all are used */
  var bag = [];

  function nextLine() {
    if (!bag.length) {
      bag = LINES.slice();
      for (var i = bag.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = bag[i]; bag[i] = bag[j]; bag[j] = t;
      }
    }
    return bag.pop();
  }

  var sayTimer = 0, hoverSay = false;

  function say(text, ms) {
    bubble.textContent = text;
    bubble.classList.add('is-on');
    clearTimeout(sayTimer);
    sayTimer = setTimeout(hide, ms);
  }

  function hide() {
    clearTimeout(sayTimer);
    bubble.classList.remove('is-on');
    hoverSay = false;
  }

  var eyesTrack = body.querySelector('#mEyesTrack');
  var eyes = body.querySelector('.marvin__eyes');
  var glow = body.querySelector('.marvin__glow');

  /* ----------------------------------------------------------
     expressions — one face layer at a time
     ---------------------------------------------------------- */
  var EMOTES = ['happy', 'wink', 'love', 'shock'];
  var EMOTE_MS = { happy: 1500, wink: 1200, love: 1700, shock: 1000 };
  var emoteTimer = 0;

  function emote(name, ms) {
    body.setAttribute('data-emote', name);
    clearTimeout(emoteTimer);
    emoteTimer = setTimeout(function () {
      body.setAttribute('data-emote', '');
    }, ms || EMOTE_MS[name] || 1200);
  }

  function anyEmote() {
    return EMOTES[Math.floor(Math.random() * EMOTES.length)];
  }

  /* ----------------------------------------------------------
     idle life: eyes follow, blink, flicker
     ---------------------------------------------------------- */
  var raf = 0, mx = 0, my = 0;

  function track() {
    raf = 0;
    var r = btn.getBoundingClientRect();
    var cx = r.left + r.width / 2;
    var cy = r.top + r.height / 2;
    var dx = mx - cx, dy = my - cy;
    var d = Math.hypot(dx, dy) || 1;
    var reach = Math.min(d / 220, 1) * 1.7;
    eyesTrack.style.transform =
      'translate(' + (dx / d * reach).toFixed(2) + 'px,' + (dy / d * reach).toFixed(2) + 'px)';
  }

  if (!reduce) {
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX; my = e.clientY;
      if (!raf) raf = requestAnimationFrame(track);
    }, { passive: true });

    (function blink() {
      setTimeout(function () {
        if (!document.hidden && !btn.matches(':hover')) {
          eyes.animate(
            [{ transform: 'scaleY(1)' }, { transform: 'scaleY(.08)' }, { transform: 'scaleY(1)' }],
            { duration: 150, easing: 'cubic-bezier(.4,0,.6,1)' }
          );
        }
        blink();
      }, 3000 + Math.random() * 2000);
    })();

    (function flicker() {
      setTimeout(function () {
        if (!document.hidden) {
          glow.animate(
            [{ opacity: 1 }, { opacity: .25 }, { opacity: 1 }, { opacity: .45 }, { opacity: 1 }],
            { duration: 260, easing: 'linear' }
          );
        }
        flicker();
      }, 7000 + Math.random() * 6000);
    })();

    /* the face idles through its moods so it never looks frozen */
    (function moods() {
      setTimeout(function () {
        if (!document.hidden && !btn.matches(':hover') &&
            btn.getAttribute('aria-expanded') !== 'true') {
          emote(anyEmote());
        }
        moods();
      }, 9000 + Math.random() * 9000);
    })();
  }

  /* ----------------------------------------------------------
     the greeting: once the boot curtain lifts
     ---------------------------------------------------------- */
  var greeted = false;

  function greet() {
    if (greeted || btn.getAttribute('aria-expanded') === 'true') return;
    greeted = true;
    say(GREETING, 12000);
    emote('happy', 2200);
    if (!reduce) {
      bob.classList.add('is-nudging');
      bob.addEventListener('animationend', function () {
        bob.classList.remove('is-nudging');
      }, { once: true });
    }
  }

  document.addEventListener('boot:done', greet);

  /* ?open=1 opens the panel without a click — used by the review reel
     and by the responsive harness; it is not linked from anywhere */
  if (/[?&]open=1/.test(location.search)) {
    setTimeout(function () { open(); }, 1200);
  }

  (function waitForBoot() {
    if (!document.getElementById('boot') || window.__bootDone) {
      setTimeout(greet, 350);
      return;
    }
    setTimeout(waitForBoot, 200);
  })();

  /* ----------------------------------------------------------
     hover: a new line and a new face each time
     ---------------------------------------------------------- */
  btn.addEventListener('pointerenter', function () {
    if (btn.getAttribute('aria-expanded') === 'true') return;
    hoverSay = true;
    say(nextLine(), 3600);
    if (!reduce) emote(anyEmote());
  });

  btn.addEventListener('pointerleave', function () {
    if (!hoverSay) return;
    hide();
  });

  btn.addEventListener('focus', function () {
    if (!btn.matches(':focus-visible')) return;
    if (btn.getAttribute('aria-expanded') === 'true') return;
    say(nextLine(), 3600);
  });

  /* ----------------------------------------------------------
     lazy chunk loading
     ---------------------------------------------------------- */
  var panelPromise = null;

  function loadPanel() {
    if (panelPromise) return panelPromise;
    panelPromise = new Promise(function (resolve, reject) {
      if (!document.querySelector('link[data-marvin-panel]')) {
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = PANEL_CSS;
        l.setAttribute('data-marvin-panel', '');
        document.head.appendChild(l);
      }
      var s = document.createElement('script');
      s.src = PANEL_JS;
      s.async = true;
      s.onload = function () {
        if (window.__marvinPanel) resolve(window.__marvinPanel);
        else reject(new Error('panel chunk loaded without export'));
      };
      s.onerror = function () { panelPromise = null; reject(new Error('panel chunk failed')); };
      document.head.appendChild(s);
    });
    return panelPromise;
  }

  function open() {
    hide();
    emote('happy', 1000);
    loadPanel().then(function (panel) {
      panel.open({ dock: dock, trigger: btn });
    }).catch(function () {
      /* if the chunk cannot load, stay idle rather than showing a dead panel */
    });
  }

  /* warm the chunk on intent, but only once */
  var warmed = false;
  function warm() {
    if (warmed) return;
    warmed = true;
    loadPanel().catch(function () { warmed = false; });
  }
  btn.addEventListener('pointerenter', warm, { once: true });
  btn.addEventListener('focus', warm, { once: true });

  btn.addEventListener('click', open);

  window.__marvin = { open: open, button: btn, dock: dock, face: function () { return SVG; } };
})();
