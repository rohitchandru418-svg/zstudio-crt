/* ============================================================
   Marvin — floating assistant.
   This file is the idle character only. The chat panel is a
   separate chunk (marvin-panel.js) fetched on first intent.
   ============================================================ */
(function () {
  if (window.__marvin) return;

  var PANEL_CSS = 'marvin-panel.css?v=23';
  var PANEL_JS = 'marvin-panel.js?v=23';
  var NUDGE_KEY = 'marvin.nudged';

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

      /* the face */
      '<g id="mEyesTrack">' +
        '<circle cx="34.7" cy="45.2" r="7.4" fill="url(#mEyeGlow)" opacity=".42"/>' +
        '<circle cx="53.3" cy="45.2" r="7.4" fill="url(#mEyeGlow)" opacity=".42"/>' +
        '<g class="marvin__eyes">' +
          '<rect x="31.4" y="39.8" width="6.6" height="10.8" rx="3.3" fill="#ffd7a4"/>' +
          '<rect x="50" y="39.8" width="6.6" height="10.8" rx="3.3" fill="#ffd7a4"/>' +
        '</g>' +
      '</g>' +
      '<rect x="40.7" y="55.6" width="6.6" height="1.7" rx=".85" fill="#ffd7a4" fill-opacity=".36"/>' +

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

  var label = el('span', 'marvin__label', "Hi. Tell me what's broken.");
  label.setAttribute('aria-hidden', 'true');

  var bubble = el('div', 'marvin__bubble', 'Stuck with manual work?');
  bubble.setAttribute('role', 'status');

  dock.appendChild(btn);
  dock.appendChild(label);
  dock.appendChild(bubble);
  document.body.appendChild(dock);

  var eyesTrack = body.querySelector('#mEyesTrack');
  var eyes = body.querySelector('.marvin__eyes');
  var glow = body.querySelector('.marvin__glow');

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
  }

  /* ----------------------------------------------------------
     the one nudge, once per session
     ---------------------------------------------------------- */
  var nudgeTimer = setTimeout(function () {
    if (sessionStorage.getItem(NUDGE_KEY)) return;
    if (btn.getAttribute('aria-expanded') === 'true') return;
    try { sessionStorage.setItem(NUDGE_KEY, '1'); } catch (e) {}
    bubble.classList.add('is-on');
    if (!reduce) {
      bob.classList.add('is-nudging');
      bob.addEventListener('animationend', function () {
        bob.classList.remove('is-nudging');
      }, { once: true });
    }
    setTimeout(function () { bubble.classList.remove('is-on'); }, 5200);
  }, 8000);

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
    clearTimeout(nudgeTimer);
    bubble.classList.remove('is-on');
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

  window.__marvin = { open: open, button: btn, dock: dock };
})();
