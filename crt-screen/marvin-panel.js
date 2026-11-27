/* ============================================================
   Marvin — chat panel chunk.
   Loaded on first intent. Owns the CRT power-off, the panel,
   the streamed conversation and the session.
   ============================================================ */
(function () {
  if (window.__marvinPanel) return;

  var STORE = 'marvin.session.v1';
  var GREETING = "Hi. I'm Marvin. What's slowing your team down right now?";
  var CHIPS = ['Quotes take a week', 'Inbox is the queue', 'Reporting is manual', 'Something else'];
  var HUMAN_LINK = 'mailto:hello@zstudio.dev';
  var ENDPOINT = '/api/marvin';

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }

  /* ----------------------------------------------------------
     session
     ---------------------------------------------------------- */
  var session = { messages: [], lit: false };

  function loadSession() {
    try {
      var raw = sessionStorage.getItem(STORE);
      if (!raw) return;
      var s = JSON.parse(raw);
      if (s && Array.isArray(s.messages)) session = s;
    } catch (e) {}
  }

  function saveSession() {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(session));
    } catch (e) {}
  }

  loadSession();

  /* ----------------------------------------------------------
     markup
     ---------------------------------------------------------- */
  var glow = el('div', 'mv-glow');
  glow.setAttribute('aria-hidden', 'true');
  var rim = el('div', 'mv-rim');
  rim.setAttribute('aria-hidden', 'true');

  var panel = el('div', 'mv-panel');

  /* ---- presence: the same character, at panel scale ---- */
  var head = el('div', 'mv-head');
  var headId = el('div', 'mv-head__id');

  var face = el('span', 'mv-face');
  face.setAttribute('aria-hidden', 'true');
  var faceBody = el('span', 'marvin__body');
  faceBody.innerHTML = (window.__marvin && window.__marvin.face) ? window.__marvin.face() : '';
  face.appendChild(faceBody);

  var statusWord = el('span', 'mv-head__state', 'idle');
  headId.appendChild(face);
  headId.appendChild(el('span', 'mv-dot'));
  headId.appendChild(el('span', 'mv-head__name', 'Marvin'));
  headId.appendChild(statusWord);

  var headRight = el('div', 'mv-head__right');

  var channels = el('div', 'mv-channels');
  channels.setAttribute('role', 'tablist');
  channels.setAttribute('aria-label', 'Marvin channels');
  var chBtns = {};
  [{ n: 1, label: 'Talk' }, { n: 2, label: 'Work' }, { n: 3, label: 'Result' }].forEach(function (c) {
    var b = el('button', 'mv-ch');
    b.type = 'button';
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', c.n === 1 ? 'true' : 'false');
    b.innerHTML = '<i>0' + c.n + '</i>' + c.label;
    b.disabled = c.n !== 1;
    b.addEventListener('click', function () { if (!b.disabled) setChannel(c.n, true); });
    chBtns[c.n] = b;
    channels.appendChild(b);
  });

  var headMeta = el('div', 'mv-head__meta', 'Zstudio // Assistant');
  headRight.appendChild(channels);
  headRight.appendChild(headMeta);

  head.appendChild(headId);
  head.appendChild(headRight);

  /* ---- stage: three channels, one tube ---- */
  var body = el('div', 'mv-body');

  var talk = el('div', 'mv-pane mv-pane--talk is-on');
  talk.setAttribute('data-pane', 'talk');
  var talkScroll = el('div', 'mv-pane__scroll');
  talk.appendChild(talkScroll);

  var work = el('div', 'mv-pane');
  work.setAttribute('data-pane', 'work');
  var workScroll = el('div', 'mv-pane__scroll');
  work.appendChild(workScroll);

  var result = el('div', 'mv-pane');
  result.setAttribute('data-pane', 'result');
  var resultScroll = el('div', 'mv-pane__scroll');
  result.appendChild(resultScroll);

  body.appendChild(talk);
  body.appendChild(work);
  body.appendChild(result);

  var greet = el('p', 'mv-greet');
  greet.id = 'mvTitle';
  var greetVis = el('span', null);
  greetVis.setAttribute('aria-hidden', 'true');
  var greetSr = el('span', 'mv-sr', GREETING);
  greet.appendChild(greetVis);
  greet.appendChild(greetSr);

  var log = el('div', 'mv-log');
  log.setAttribute('role', 'log');
  log.setAttribute('aria-live', 'polite');
  log.setAttribute('aria-relevant', 'additions text');

  /* the thread is one block so it can sit against the input even when
     the greeting is hidden and the log is empty */
  var thread = el('div', 'mv-thread');
  thread.appendChild(greet);
  thread.appendChild(log);
  talkScroll.appendChild(thread);

  /* ---- the live line: what he is doing, right now ---- */
  var statusRow = el('div', 'mv-status');
  statusRow.setAttribute('title', 'Stop him');
  var statusText = el('span', 'mv-status__text', 'idle');
  var signal = el('span', 'mv-signal');
  signal.setAttribute('aria-label', 'confidence');
  for (var si = 0; si < 3; si++) signal.appendChild(el('i'));
  statusRow.appendChild(statusText);
  statusRow.appendChild(signal);

  /* ---- chips: rebuilt per turn ---- */
  var chips = el('div', 'mv-chips');

  function setChips(list) {
    chips.textContent = '';
    var items = list || CHIPS;
    items.forEach(function (label) {
      var b = el('button', 'mv-chip');
      b.type = 'button';
      b.textContent = label;
      b.addEventListener('click', function () { send(label); });
      chips.appendChild(b);
    });
    chips.classList.remove('is-gone');
    session.chips = items.slice();
    saveSession();
  }
  setChips(session.chips && session.chips.length ? session.chips : null);

  var inputRow = el('div', 'mv-inputrow');
  var fld = el('div', 'mv-field');
  var measure = el('span', 'mv-measure');
  var input = el('input', 'mv-input');
  input.type = 'text';
  input.placeholder = 'Tell me about the problem...';
  input.setAttribute('aria-label', 'Your message to Marvin');
  input.setAttribute('autocomplete', 'off');
  input.setAttribute('spellcheck', 'false');
  var caret = el('span', 'mv-caret--input');
  caret.setAttribute('aria-hidden', 'true');
  fld.appendChild(measure);
  fld.appendChild(input);
  fld.appendChild(caret);
  fld.addEventListener('click', function () { input.focus(); });

  var micBtn = el('button', 'mv-mic');
  micBtn.type = 'button';
  micBtn.setAttribute('aria-label', 'Talk to Marvin');
  micBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/></svg>';

  var sendBtn = el('button', 'mv-send', 'Send');
  sendBtn.type = 'button';

  inputRow.appendChild(fld);
  inputRow.appendChild(micBtn);
  inputRow.appendChild(sendBtn);

  var foot = el('div', 'mv-foot');
  var human = el('a', null, 'Talk to a human');
  human.href = HUMAN_LINK;

  var voiceSel = el('select', 'mv-voice');
  voiceSel.setAttribute('aria-label', 'Marvin voice');
  var muteBtn = el('button', 'mv-mute');
  muteBtn.type = 'button';
  muteBtn.setAttribute('aria-pressed', 'true');
  muteBtn.setAttribute('aria-label', 'Marvin voice on or off');
  muteBtn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4z"/><path class="mv-mute__wave" d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11"/></svg>';

  var closeBtn = el('button', 'mv-close');
  closeBtn.type = 'button';
  var kbd = el('kbd', null, 'Esc');
  closeBtn.appendChild(kbd);
  closeBtn.appendChild(document.createTextNode(' Close'));

  foot.appendChild(human);
  foot.appendChild(voiceSel);
  foot.appendChild(muteBtn);
  foot.appendChild(closeBtn);

  panel.appendChild(head);
  panel.appendChild(body);
  panel.appendChild(statusRow);
  panel.appendChild(chips);
  panel.appendChild(inputRow);
  panel.appendChild(foot);

  var overlay = el('div', 'mv');
  overlay.id = 'mv';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'mvTitle');
  overlay.setAttribute('aria-hidden', 'true');
  var stage = el('div', 'mv-stage');
  stage.appendChild(glow);
  stage.appendChild(panel);
  stage.appendChild(rim);
  overlay.appendChild(stage);

  var line = el('div', 'mv-crtline');
  line.setAttribute('aria-hidden', 'true');
  document.body.appendChild(line);
  /* the chat lives inside the tube, not in a floating sheet over it */
  (document.getElementById('crtScreen') || document.body).appendChild(overlay);

  /* ----------------------------------------------------------
     --pulse, exactly as oryzo drives theirs:
       pulse   = saturate(pulse + dt * .5)          (0 → 1 on open)
       breath  = .5 + .25 * (sin(.25 * t * 2π) + 1) (4 s cycle)
       value   = pulse * breath
     ---------------------------------------------------------- */
  var pulseRatio = 0;
  var pulseRaf = 0;
  var pulseLast = 0;
  var pulseT0 = 0;
  var reduceMQ = window.matchMedia('(prefers-reduced-motion: reduce)');

  function pulseFrame(now) {
    if (liteOn()) {
      pulseRaf = 0;
      overlay.style.setProperty('--pulse', '0.75');
      return;
    }
    var dt = Math.min(0.05, (now - pulseLast) / 1000);
    pulseLast = now;
    pulseRatio = Math.min(1, pulseRatio + dt * 0.5);

    var t = (now - pulseT0) / 1000;
    var v = pulseRatio * (0.5 + 0.25 * (Math.sin(0.25 * t * Math.PI * 2) + 1));
    overlay.style.setProperty('--pulse', v.toFixed(4));
    pulseRaf = requestAnimationFrame(pulseFrame);
  }

  function liteOn() { return document.documentElement.classList.contains('is-lite'); }

  function pulseStart() {
    pulseCancel();
    pulseT0 = pulseLast = performance.now();
    /* lite mode: a still ring instead of a per-frame filter on a 700px blur */
    if (reduceMQ.matches || liteOn()) {
      overlay.style.setProperty('--pulse', '0.75');
      return;
    }
    pulseRaf = requestAnimationFrame(pulseFrame);
  }

  function pulseCancel() {
    if (pulseRaf) { cancelAnimationFrame(pulseRaf); pulseRaf = 0; }
  }

  document.addEventListener('lite:change', function () {
    if (isOpen) pulseStart();
  });

  var isOpen = false;
  var busy = false;
  var trigger = null;
  var dock = null;
  var lastFocus = null;

  /* ----------------------------------------------------------
     the CRT
     ---------------------------------------------------------- */
  function crt() { return document.getElementById('crtContent'); }

  function setChatLayer(on) {
    var set = document.getElementById('crt');
    if (set) set.classList.toggle('is-chat', on);
  }

  function powerOff() {
    var c = crt();
    if (!c) return Promise.resolve();
    if (reduce) {
      c.style.opacity = '0';
      return Promise.resolve();
    }
    return new Promise(function (done) {
      var a = c.animate([
        { transform: 'scale(1,1)', filter: 'brightness(1)', opacity: 1 },
        { transform: 'scale(1,.006)', filter: 'brightness(2.6)', opacity: 1, offset: .42 },
        { transform: 'scale(.008,.006)', filter: 'brightness(3)', opacity: 1, offset: .74 },
        { transform: 'scale(.008,.006)', filter: 'brightness(3)', opacity: 0, offset: 1 }
      ], { duration: 680, easing: 'cubic-bezier(.45,0,.25,1)', fill: 'forwards' });

      line.animate([
        { opacity: 0, transform: 'translate(-50%,-50%) scaleX(.12)' },
        { opacity: 1, transform: 'translate(-50%,-50%) scaleX(1)', offset: .44 },
        { opacity: 1, transform: 'translate(-50%,-50%) scaleX(.08)', offset: .8 },
        { opacity: 0, transform: 'translate(-50%,-50%) scaleX(0)', offset: 1 }
      ], { duration: 680, easing: 'linear', fill: 'forwards' });

      a.onfinish = function () { done(); };
    });
  }

  function powerOn() {
    var c = crt();
    if (!c) return;
    if (reduce) { c.style.opacity = ''; return; }
    c.animate([
      { transform: 'scale(.008,.006)', opacity: 0, filter: 'brightness(3)' },
      { transform: 'scale(1,.006)', opacity: 1, filter: 'brightness(2.4)', offset: .5 },
      { transform: 'scale(1,1)', opacity: 1, filter: 'brightness(1)', offset: 1 }
    ], { duration: 640, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'forwards' }).onfinish = function () {
      c.style.opacity = '';
      /* release both fills so the page is left with no transform of its own */
      if (c.getAnimations) c.getAnimations().forEach(function (a) { a.cancel(); });
    };
  }

  function panelOn() {
    if (reduce) return;
    panel.animate([
      { transform: 'scaleY(.015)', opacity: 0 },
      { transform: 'scaleY(.015)', opacity: .9, offset: .16 },
      { transform: 'scaleY(.015)', opacity: .25, offset: .26 },
      { transform: 'scaleY(.5)', opacity: .9, offset: .55 },
      { transform: 'scaleY(1)', opacity: 1, offset: 1 }
    ], { duration: 540, easing: 'cubic-bezier(.2,.9,.2,1)' });
  }

  /* ----------------------------------------------------------
     typing
     ---------------------------------------------------------- */
  /* time-based, not tick-based: a throttled timer still lands the
     right character count, so a backgrounded tab catches up instead
     of crawling one character per second */
  function typeInto(node, text, speed) {
    return new Promise(function (done) {
      if (reduce) { node.textContent = text; done(); return; }
      var t0 = performance.now();
      var shown = -1;
      (function step() {
        if (!isOpen) { node.textContent = text; done(); return; }
        var want = Math.min(text.length, Math.floor((performance.now() - t0) / speed));
        if (want !== shown) {
          shown = want;
          node.textContent = text.slice(0, want);
        }
        if (want >= text.length) { done(); return; }
        setTimeout(step, 16);
      })();
    });
  }

  /* ----------------------------------------------------------
     the block caret in the input
     ---------------------------------------------------------- */
  function placeCaret() {
    var v = input.value;
    var pos = input.selectionStart == null ? v.length : input.selectionStart;
    measure.textContent = v.slice(0, pos);
    caret.style.transform = 'translate(' + measure.offsetWidth + 'px,-50%)';
    caret.style.visibility = v.length ? 'visible' : 'visible';
  }

  input.addEventListener('input', placeCaret);
  input.addEventListener('keyup', placeCaret);
  input.addEventListener('click', placeCaret);
  input.addEventListener('focus', placeCaret);
  input.addEventListener('select', placeCaret);

  /* ----------------------------------------------------------
     open / close
     ---------------------------------------------------------- */
  function renderHistory() {
    log.textContent = '';
    session.messages.forEach(function (m) {
      addLine(m.role, m.text, true);
    });
    scrollEnd();
  }

  function open(opts) {
    if (isOpen) return;
    isOpen = true;
    dock = opts && opts.dock;
    trigger = opts && opts.trigger;
    lastFocus = document.activeElement;

    setChatLayer(true);
    if (dock) dock.classList.add('is-away');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('mv-lock');

    powerOff().then(function () {
      overlay.classList.add('is-open');
      overlay.setAttribute('aria-hidden', 'false');
      panelOn();

      pulseStart();

      if (session.messages.length) {
        greet.style.display = 'none';
        renderHistory();
        if (session.art) {
          showArtefact(session.art);
          chBtns[3].disabled = false;
          setStatus('waiting on you', 'ready');
        }
      } else if (session.greeted) {
        greetVis.textContent = GREETING;
        greetSr.textContent = GREETING;
      } else {
        session.greeted = true;
        typeInto(greetVis, GREETING, 28).then(function () {
          greetSr.textContent = GREETING;
          saveSession();
        });
      }

      setTimeout(function () {
        input.focus({ preventScroll: true });
        placeCaret();
      }, reduce ? 40 : 220);

      /* the mind is a second chunk: the panel works without it */
      loadMind().then(function (m) {
        mind = m;
        m.attach(mindApi);
        syncVoice();
        /* ?reel=1 plays one full mission, for reviewing the experience */
        if (/[?&]reel=1/.test(location.search)) {
          session.messages = [];
          session.greeted = true;
          saveSession();
          artefactClear();
          setChips();
          log.textContent = '';
          greet.style.display = 'none';
          var demo = new URLSearchParams(location.search).get('say') ||
            'Our quotes take about a week to go out.';
          setTimeout(function () { send(demo); }, 900);
        }
      }).catch(function (err) {
        if (window.console && console.info) {
          console.info('[marvin] ' + err.message + ' — keeping the scripted responder');
        }
      });
    });
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    saveSession();

    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    pulseCancel();

    setTimeout(function () {
      setChatLayer(false);
      if (dock) dock.classList.remove('is-away');
      if (trigger) {
        trigger.setAttribute('aria-expanded', 'false');
        trigger.focus({ preventScroll: true });
      }
      document.documentElement.classList.remove('mv-lock');
      powerOn();
    }, reduce ? 0 : 300);
  }

  /* focus stays inside the panel */
  overlay.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = overlay.querySelectorAll('button, [href], input, [tabindex]:not([tabindex="-1"])');
    var list = Array.prototype.filter.call(f, function (n) {
      return !n.disabled && n.offsetParent !== null;
    });
    if (!list.length) return;
    var first = list[0];
    var last = list[list.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) {
      e.preventDefault();
      close();
    }
  });

  closeBtn.addEventListener('click', close);

  /* ----------------------------------------------------------
     the log
     ---------------------------------------------------------- */
  function scrollEnd() {
    talkScroll.scrollTop = talkScroll.scrollHeight;
  }

  function addLine(role, text, instant) {
    var p = el('p', 'mv-line mv-line--' + role);
    var vis = el('span', null);
    var sr = el('span', 'mv-sr');
    vis.setAttribute('aria-hidden', 'true');
    if (instant) {
      paint(vis, text);
      sr.textContent = text.replace(/\*\*/g, '');
    }
    p.appendChild(vis);
    p.appendChild(sr);
    log.appendChild(p);
    if (!instant) scrollEnd();
    return { node: p, vis: vis, sr: sr };
  }

  /* a very small markdown-ish renderer: paragraphs, bullets, bold */
  function paint(node, text) {
    node.textContent = '';
    var blocks = text.split(/\n{2,}/);

    blocks.forEach(function (block, bi) {
      var lines = block.split('\n');
      var ul = null;
      var run = [];

      function flush() {
        if (!run.length) return;
        var s = el('span');
        s.innerHTML = run.map(inline).join('<br>');
        node.appendChild(s);
        run = [];
      }

      if (bi) node.appendChild(el('br'));

      lines.forEach(function (l) {
        if (/^\s*[-*]\s+/.test(l)) {
          flush();
          if (!ul) { ul = el('ul'); node.appendChild(ul); }
          var li = el('li');
          li.innerHTML = inline(l.replace(/^\s*[-*]\s+/, ''));
          ul.appendChild(li);
        } else {
          ul = null;
          run.push(l);
        }
      });

      flush();
    });
  }

  function inline(s) {
    return s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  }

  /* ----------------------------------------------------------
     the stage — channels, the live line, the trace, the artefact
     ---------------------------------------------------------- */
  var channelNow = 1;
  var pinned = false;
  var portraitTimer = 0;
  var mind = null;

  function paneFor(n) { return n === 2 ? work : n === 3 ? result : talk; }

  function setChannel(n, manual) {
    if (manual && n === 1) pinned = true;
    if (n === channelNow && !manual) return;
    channelNow = n;
    var next = paneFor(n);
    [talk, work, result].forEach(function (p) { p.classList.toggle('is-on', p === next); });
    Object.keys(chBtns).forEach(function (k) {
      chBtns[k].setAttribute('aria-selected', +k === n ? 'true' : 'false');
    });
    if (n >= 2) chBtns[2].disabled = false;
    if (n >= 3) chBtns[3].disabled = false;
    if (n === 2) workScroll.scrollTop = workScroll.scrollHeight;
    if (!reduce && body.animate) {
      body.animate([
        { opacity: 1, transform: 'scaleX(1)', filter: 'brightness(1)' },
        { opacity: .12, transform: 'scaleX(.01)', filter: 'brightness(2.6)', offset: .46 },
        { opacity: .12, transform: 'scaleX(.01)', filter: 'brightness(2.6)', offset: .56 },
        { opacity: 1, transform: 'scaleX(1)', filter: 'brightness(1)' }
      ], { duration: 400, easing: 'cubic-bezier(.3,0,.2,1)' });
    }
  }

  function setStatus(text, tone) {
    statusText.textContent = text;
    statusRow.dataset.tone = tone || '';
    statusWord.textContent = tone === 'work' ? 'working'
      : tone === 'ask' ? 'asking'
      : tone === 'done' ? 'done'
      : tone === 'ready' ? 'ready' : 'idle';
    overlay.classList.toggle('is-thinking', tone === 'work' || tone === 'ask');
  }

  function setSignal(level, note) {
    signal.dataset.level = level || '';
    signal.title = note || '';
    signal.setAttribute('aria-label', 'confidence: ' + (level || 'unknown') + (note ? ', ' + note : ''));
  }

  function portrait(name, ms) {
    faceBody.setAttribute('data-emote', name || '');
    clearTimeout(portraitTimer);
    if (name && ms) {
      portraitTimer = setTimeout(function () {
        if (faceBody.getAttribute('data-emote') === name) faceBody.setAttribute('data-emote', '');
      }, ms);
    }
  }

  function mouth(v) {
    var m = faceBody.querySelector('.m-mouth');
    if (m) m.style.setProperty('--mouth', (0.16 + Math.min(1, v) * 0.84).toFixed(3));
  }

  function speaking(on) {
    panel.classList.toggle('is-speaking', !!on);
    if (on) faceBody.setAttribute('data-emote', 'speak');
    else if (faceBody.getAttribute('data-emote') === 'speak') faceBody.setAttribute('data-emote', '');
  }

  /* ---- the trace ---- */
  var traceEl = null;
  var traceSecs = {};
  var planEls = [];
  var srcCount = 0;
  var rejCount = 0;

  function traceReset() {
    workScroll.textContent = '';
    traceEl = el('div', 'tr');
    workScroll.appendChild(traceEl);
    traceSecs = {};
    planEls = [];
    srcCount = 0;
    rejCount = 0;
  }

  function traceSec(key, title, extra) {
    if (traceSecs[key]) return traceSecs[key];
    var s = el('section', 'tr__sec');
    s.setAttribute('data-key', key);
    var h = el('h4', 'tr__h');
    h.appendChild(document.createTextNode(title));
    if (extra) {
      var sp = el('span', 'tr__h-meta');
      sp.textContent = extra;
      h.appendChild(sp);
    }
    s.appendChild(h);
    traceEl.appendChild(s);
    requestAnimationFrame(function () { s.classList.add('is-in'); });
    traceSecs[key] = s;
    return s;
  }

  var trace = {
    reset: traceReset,
    intent: function (text) {
      var s = traceSec('intent', 'Intent');
      var p = el('p', 'tr__intent');
      p.textContent = text;
      s.appendChild(p);
    },
    plan: function (list) {
      var s = traceSec('plan', 'Plan', list.length + ' steps');
      var ol = el('ol', 'tr__plan');
      list.forEach(function (label, i) {
        var li = el('li', 'stp');
        li.setAttribute('data-state', 'todo');
        var n = el('span', 'stp__n');
        n.textContent = ('0' + (i + 1)).slice(-2);
        var l = el('span', 'stp__l');
        l.textContent = label;
        var g = el('span', 'stp__s', '\u00b7');
        li.appendChild(n); li.appendChild(l); li.appendChild(g);
        ol.appendChild(li);
        planEls.push(li);
      });
      s.appendChild(ol);
    },
    step: function (i, state) {
      var li = planEls[i];
      if (!li) return;
      li.setAttribute('data-state', state);
      li.querySelector('.stp__s').textContent = state === 'done' ? '\u2713' : '\u203a';
    },
    source: function (src, i) {
      var s = traceSec('sources', 'Sources');
      srcCount++;
      if (src.verdict === 'rejected') rejCount++;
      var meta = s.querySelector('.tr__h-meta');
      if (meta) meta.textContent = srcCount + ' read' + (rejCount ? ' \u00b7 ' + rejCount + ' rejected' : '');

      var d = el('details', 'src');
      d.setAttribute('data-verdict', src.verdict);
      var sum = el('summary', 'src__sum');
      var dom = el('span', 'src__d'); dom.textContent = src.domain;
      var v = el('span', 'src__v'); v.textContent = src.verdict === 'rejected' ? 'rejected' : 'used';
      var t = el('span', 'src__t'); t.textContent = src.title;
      sum.appendChild(dom); sum.appendChild(t); sum.appendChild(v);
      d.appendChild(sum);

      var bodyEl = el('div', 'src__body');
      var ex = el('p', 'src__x'); ex.textContent = src.excerpt;
      bodyEl.appendChild(ex);
      if (src.why) {
        var why = el('p', 'src__why');
        why.textContent = 'Dropped: ' + src.why;
        bodyEl.appendChild(why);
      }
      d.appendChild(bodyEl);
      s.appendChild(d);
      if (i === 0) d.open = false;
    },
    check: function (c, i) {
      var s = traceSec('checks', 'Checks');
      var ul = s.querySelector('.tr__checks');
      if (!ul) { ul = el('ul', 'tr__checks'); s.appendChild(ul); }
      var li = el('li', 'chk');
      li.setAttribute('data-ok', c.ok ? '1' : '0');
      var g = el('span', 'chk__g', c.ok ? '\u2713' : '!');
      var l = el('span', 'chk__l');
      l.textContent = c.label;
      li.appendChild(g); li.appendChild(l);
      if (c.note) {
        var em = el('em', 'chk__n');
        em.textContent = c.note;
        li.appendChild(em);
      }
      ul.appendChild(li);
    },
    gaps: function (list) {
      var s = traceSec('gaps', 'What I still do not know');
      var ul = el('ul', 'tr__gaps');
      list.forEach(function (g) {
        var li = el('li');
        li.textContent = g;
        ul.appendChild(li);
      });
      s.appendChild(ul);
    },
    assumption: function (text) {
      var p = el('p', 'tr__assume');
      var b = el('b', null, 'Assumption');
      p.appendChild(b);
      p.appendChild(document.createTextNode(' ' + text));
      traceEl.appendChild(p);
    },
    revise: function (text) {
      /* after a reload the trace has not been built yet */
      if (!traceEl) traceReset();
      var p = el('p', 'tr__revise');
      var b = el('b', null, 'You asked');
      p.appendChild(b);
      p.appendChild(document.createTextNode(' \u201c' + text + '\u201d \u2014 reopening the plan'));
      traceEl.appendChild(p);
      workScroll.scrollTop = workScroll.scrollHeight;
    }
  };

  /* ---- the artefact ---- */
  function toMarkdown(a) {
    var out = ['# ' + a.title, '', a.verdict, ''];
    (a.sections || []).forEach(function (s) {
      out.push('## ' + s.h, '');
      if (s.kind === 'steps') {
        s.items.forEach(function (it, i) {
          out.push((i + 1) + '. **' + it.t + '** — ' + it.d + (it.owner ? ' _(' + it.owner + ', ' + it.effort + ')_' : ''));
        });
      } else if (s.kind === 'table') {
        out.push('| ' + s.head.join(' | ') + ' |');
        out.push('|' + s.head.map(function () { return '---'; }).join('|') + '|');
        s.rows.forEach(function (r) { out.push('| ' + r.join(' | ') + ' |'); });
      } else if (s.body) {
        out.push(s.body);
      }
      out.push('');
    });
    if (a.gaps && a.gaps.length) {
      out.push('## Open', '');
      a.gaps.forEach(function (g) { out.push('- ' + g); });
      out.push('');
    }
    out.push('— Marvin, Zstudio');
    return out.join('\n');
  }

  function showArtefact(a, focus) {
    resultScroll.textContent = '';
    var art = el('article', 'ar');

    var hd = el('header', 'ar__head');
    hd.appendChild(el('p', 'ar__kicker', 'Deliverable'));
    var h = el('h3', 'ar__t'); h.textContent = a.title;
    hd.appendChild(h);
    if (a.meta && a.meta.length) {
      var ul = el('ul', 'ar__meta');
      a.meta.forEach(function (m) { var li = el('li'); li.textContent = m; ul.appendChild(li); });
      hd.appendChild(ul);
    }
    art.appendChild(hd);

    var v = el('p', 'ar__verdict'); v.textContent = a.verdict;
    art.appendChild(v);

    (a.sections || []).forEach(function (s) {
      var sec = el('section', 'ar__sec');
      var hh = el('h4'); hh.textContent = s.h; sec.appendChild(hh);

      if (s.kind === 'steps') {
        var ol = el('ol', 'ar__steps');
        s.items.forEach(function (it, i) {
          var li = el('li');
          var n = el('span', 'ar__n'); n.textContent = ('0' + (i + 1)).slice(-2);
          var d = el('div', 'ar__sb');
          var b = el('b'); b.textContent = it.t;
          var p = el('p'); p.textContent = it.d;
          d.appendChild(b); d.appendChild(p);
          li.appendChild(n); li.appendChild(d);
          if (it.owner) {
            var tag = el('span', 'ar__tag');
            tag.textContent = it.owner + ' \u00b7 ' + it.effort;
            li.appendChild(tag);
          }
          ol.appendChild(li);
        });
        sec.appendChild(ol);
      } else if (s.kind === 'table') {
        var tbl = el('table', 'ar__table');
        var thead = el('thead');
        var trh = el('tr');
        s.head.forEach(function (c) { var th = el('th'); th.textContent = c; trh.appendChild(th); });
        thead.appendChild(trh); tbl.appendChild(thead);
        var tb = el('tbody');
        s.rows.forEach(function (r) {
          var tr = el('tr');
          r.forEach(function (c, ci) {
            var td = el(ci === 0 ? 'th' : 'td');
            td.textContent = c;
            tr.appendChild(td);
          });
          tb.appendChild(tr);
        });
        tbl.appendChild(tb);
        var tw = el('div', 'ar__tablewrap');
        tw.appendChild(tbl);
        sec.appendChild(tw);
      } else if (s.body) {
        var p = el('p', 'ar__body'); p.textContent = s.body;
        sec.appendChild(p);
      }
      art.appendChild(sec);
    });

    if (a.gaps && a.gaps.length) {
      var gs = el('section', 'ar__gaps');
      var gh = el('h4', null, 'Open');
      gs.appendChild(gh);
      var gul = el('ul');
      a.gaps.forEach(function (g) { var li = el('li'); li.textContent = g; gul.appendChild(li); });
      gs.appendChild(gul);
      art.appendChild(gs);
    }

    var act = el('footer', 'ar__act');
    var copy = el('button', 'ar__btn', 'Copy');
    copy.type = 'button';
    copy.addEventListener('click', function () {
      var md = toMarkdown(a);
      var done = function () { copy.textContent = 'Copied'; setTimeout(function () { copy.textContent = 'Copy'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(md).then(done, done);
      else done();
    });

    var dl = el('button', 'ar__btn', 'Download .md');
    dl.type = 'button';
    dl.addEventListener('click', function () {
      var blob = new Blob([toMarkdown(a)], { type: 'text/markdown' });
      var url = URL.createObjectURL(blob);
      var link = document.createElement('a');
      link.href = url;
      link.download = a.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') + '.md';
      link.click();
      setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
    });

    var mail = el('a', 'ar__btn', 'Send to a human');
    mail.href = 'mailto:hello@zstudio.dev?subject=' + encodeURIComponent('Marvin — ' + a.title) +
      '&body=' + encodeURIComponent(toMarkdown(a).slice(0, 1800));

    act.appendChild(copy); act.appendChild(dl); act.appendChild(mail);
    art.appendChild(act);

    resultScroll.appendChild(art);
    session.art = a;
    saveSession();

    /* a follow-up appends a section; land on it instead of the top */
    if (typeof focus === 'number') {
      var secs = art.querySelectorAll('.ar__sec');
      if (secs[focus]) {
        resultScroll.scrollTop = secs[focus].getBoundingClientRect().top -
          resultScroll.getBoundingClientRect().top + resultScroll.scrollTop - 16;
        return;
      }
    }
    resultScroll.scrollTop = 0;
  }

  function artefactClear() {
    resultScroll.textContent = '';
    session.art = null;
    saveSession();
  }

  /* ---- the decision card ---- */
  function clarify(spec) {
    return new Promise(function (resolve) {
      var card = el('div', 'mv-ask');
      var q = el('p', 'mv-ask__q'); q.textContent = spec.question;
      var why = el('p', 'mv-ask__why'); why.textContent = 'Why it matters: ' + spec.why;
      card.appendChild(q); card.appendChild(why);

      var opts = el('div', 'mv-ask__opts');
      var buttons = [];
      var picked = [];
      var multi = !!spec.multi;

      function mark() {
        buttons.forEach(function (b) {
          b.classList.toggle('is-pick', picked.indexOf(b.dataset.label) !== -1);
        });
        go.disabled = !picked.length;
      }

      function commit(labels, decided) {
        card.classList.add('is-done');
        buttons.forEach(function (b) { b.disabled = true; });
        customInput.disabled = true;
        customBtn.disabled = true;
        go.disabled = true;
        card.querySelectorAll('.mv-opt').forEach(function (b) {
          b.classList.toggle('is-pick', labels.indexOf(b.dataset.label) !== -1);
        });
        var summary = (decided ? 'You decide \u2014 ' : 'Chose: ') + labels.join(', ');
        addLine('user', summary, true);
        session.messages.push({ role: 'user', text: summary });
        saveSession();
        document.removeEventListener('keydown', onKey);
        resolve({ labels: labels, decided: !!decided });
      }

      function choose(btn) {
        var label = btn.dataset.label;
        if (btn.dataset.decide) { commit([label], true); return; }
        if (multi) {
          var at = picked.indexOf(label);
          if (at === -1) picked.push(label); else picked.splice(at, 1);
          mark();
          return;
        }
        commit([label], false);
      }

      var autoPick = (new URLSearchParams(location.search).get('pick') || '')
        .split(',').map(function (x) { return parseInt(x, 10); })
        .filter(function (x) { return x > 0; });

      spec.options.forEach(function (o, i) {
        var b = el('button', 'mv-opt');
        b.type = 'button';
        b.dataset.label = o.label;
        var k = el('span', 'mv-opt__k'); k.textContent = String(i + 1);
        var body = el('span', 'mv-opt__b');
        var l = el('b'); l.textContent = o.label;
        var n = el('em'); n.textContent = o.note;
        body.appendChild(l); body.appendChild(n);
        b.appendChild(k); b.appendChild(body);
        b.addEventListener('click', function () { choose(b); });
        buttons.push(b);
        opts.appendChild(b);
      });

      var decide = el('button', 'mv-opt mv-opt--decide');
      decide.type = 'button';
      decide.dataset.label = 'You decide';
      decide.dataset.decide = '1';
      var dk = el('span', 'mv-opt__k', '\u2192');
      var dbody = el('span', 'mv-opt__b');
      var dl = el('b', null, 'You decide');
      var dn = el('em', null, 'I will pick the one that needs the least change, and say why.');
      dbody.appendChild(dl); dbody.appendChild(dn);
      decide.appendChild(dk); decide.appendChild(dbody);
      decide.addEventListener('click', function () { choose(decide); });
      buttons.push(decide);
      opts.appendChild(decide);

      card.appendChild(opts);

      var form = el('form', 'mv-ask__custom');
      var customInput = el('input', 'mv-ask__input');
      customInput.type = 'text';
      customInput.placeholder = 'Something else\u2026';
      customInput.setAttribute('aria-label', 'Another answer');
      var customBtn = el('button', 'mv-ask__use', 'Use');
      customBtn.type = 'submit';
      form.appendChild(customInput); form.appendChild(customBtn);

      var go = el('button', 'mv-ask__go', 'Continue');
      go.type = 'button';
      go.disabled = true;
      go.addEventListener('click', function () { if (picked.length) commit(picked, false); });
      if (multi) card.appendChild(go);

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var v = customInput.value.trim();
        if (v) commit([v], false);
      });
      card.appendChild(form);

      function onKey(e) {
        if (!isOpen) return;
        if (document.activeElement === customInput) return;
        var n = parseInt(e.key, 10);
        if (n >= 1 && n <= buttons.length) { e.preventDefault(); choose(buttons[n - 1]); }
      }
      document.addEventListener('keydown', onKey);

      log.appendChild(card);
      talkScroll.scrollTop = talkScroll.scrollHeight;
      setTimeout(function () { if (isOpen) customInput.focus({ preventScroll: true }); }, 60);

      /* ?pick=1,2 answers the card for you, so ?reel=1 can play unattended */
      if (autoPick.length) {
        setTimeout(function () {
          autoPick.forEach(function (n) {
            if (buttons[n - 1] && !card.classList.contains('is-done')) choose(buttons[n - 1]);
          });
          if (multi && picked.length) {
            setTimeout(function () {
              if (!card.classList.contains('is-done')) commit(picked, false);
            }, 700);
          }
        }, 2600);
      }
    });
  }

  /* ---- the api the mind talks to ---- */
  function remember(role, text) {
    session.messages.push({ role: role, text: text });
    saveSession();
  }

  var mindApi = {
    reduce: reduce,
    line: function (role, text) { remember(role, text); return addLine(role, text, true); },
    type: function (role, text, speed) {
      var t = addLine(role, '', true);
      return typeInto(t.vis, text, speed || 14).then(function () {
        t.sr.textContent = text;
        talkScroll.scrollTop = talkScroll.scrollHeight;
        remember(role, text);
      });
    },
    status: setStatus,
    signal: setSignal,
    channel: function (n) { if (!pinned) setChannel(n, false); },
    portrait: portrait,
    mouth: mouth,
    speaking: speaking,
    chips: setChips,
    trace: trace,
    clarify: clarify,
    artefact: showArtefact,
    artefactGet: function () { return session.art; },
    artefactClear: artefactClear,
    scroll: function () { talkScroll.scrollTop = talkScroll.scrollHeight; }
  };

  var mindPromise = null;

  function loadMind() {
    if (window.__marvinMind) return Promise.resolve(window.__marvinMind);
    if (mindPromise) return mindPromise;
    mindPromise = new Promise(function (resolve, reject) {
      if (!document.querySelector('link[data-marvin-mind]')) {
        var l = document.createElement('link');
        l.rel = 'stylesheet';
        l.href = 'marvin-mind.css?v=8';
        l.setAttribute('data-marvin-mind', '');
        document.head.appendChild(l);
      }
      var s = document.createElement('script');
      s.src = 'marvin-mind.js?v=13';
      s.async = true;
      s.onload = function () {
        if (window.__marvinMind) resolve(window.__marvinMind);
        else reject(new Error('mind chunk loaded without export'));
      };
      s.onerror = function () { mindPromise = null; reject(new Error('mind chunk failed')); };
      document.head.appendChild(s);
    });
    return mindPromise;
  }

  /* ----------------------------------------------------------
     the conversation
     ---------------------------------------------------------- */
  function activate() {
    if (session.lit) return;
    session.lit = true;
    saveSession();
  }

  function apiMessages() {
    return session.messages.map(function (m) {
      return { role: m.role === 'user' ? 'user' : 'assistant', content: m.text };
    });
  }

  var turnId = 0;

  function endTurn() {
    busy = false;
    sendBtn.disabled = false;
    if (isOpen) input.focus({ preventScroll: true });
  }

  function send(text) {
    text = (text == null ? input.value : text).trim();
    if (!text) return;

    /* talking over him stops him — that is the whole point of a voice */
    if (mind) mind.cancel();

    input.value = '';
    placeCaret();
    chips.classList.add('is-gone');
    greet.style.display = 'none';
    pinned = false;
    chBtns[2].disabled = true;
    chBtns[3].disabled = true;
    setChannel(1, false);

    addLine('user', text, true);
    session.messages.push({ role: 'user', text: text });
    saveSession();
    activate();

    busy = true;
    sendBtn.disabled = true;

    if (mind) {
      var mine = ++turnId;
      mind.handle(text).then(function () { if (mine === turnId) endTurn(); },
                            function () { if (mine === turnId) endTurn(); });
      return;
    }

    /* a beat before he answers — long enough to read as thought */
    setTimeout(function () { reply(text); }, 400 + Math.round(Math.random() * 500));
  }

  function reply() {
    var pending = el('div', 'mv-line mv-typing');
    pending.innerHTML = '<i></i><i></i><i></i>';
    log.appendChild(pending);
    scrollEnd();
    overlay.classList.add('is-thinking');

    var target = null;
    var acc = '';
    var dead = false;

    function begin() {
      if (target) return;
      if (pending.parentNode) pending.parentNode.removeChild(pending);
      target = addLine('marvin', '', true);
      scrollEnd();
    }

    function onDelta(chunk) {
      if (dead) return;
      begin();
      acc += chunk;
      target.vis.textContent = acc;
      scrollEnd();
    }

    function finish() {
      if (dead) return;
      dead = true;
      overlay.classList.remove('is-thinking');
      if (pending.parentNode) pending.parentNode.removeChild(pending);
      if (!acc.trim()) {
        acc = localFallback();
        begin();
      }
      if (target) {
        paint(target.vis, acc);
        target.sr.textContent = acc;
      }
      session.messages.push({ role: 'assistant', text: acc });
      saveSession();
      busy = false;
      sendBtn.disabled = false;
      scrollEnd();
      if (isOpen) input.focus({ preventScroll: true });
    }

    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: apiMessages(),
        context: { turn: session.messages.filter(function (m) { return m.role === 'user'; }).length }
      })
    }).then(function (res) {
      if (!res.ok || !res.body) throw new Error('endpoint ' + res.status);
      var ctype = res.headers.get('content-type') || '';
      if (ctype.indexOf('text/event-stream') !== -1) return readSSE(res, onDelta);
      return readPlain(res, onDelta);
    }).then(finish).catch(function (err) {
      /* no backend in this build: fall back to the scripted consultant */
      if (window.console && console.info) {
        console.info('[marvin] ' + err.message + ' — using the local scripted responder');
      }
      finish();
    });
  }

  function readPlain(res, onDelta) {
    var reader = res.body.getReader();
    var dec = new TextDecoder();
    return (function pump() {
      return reader.read().then(function (r) {
        if (r.done) return;
        if (r.value) onDelta(dec.decode(r.value, { stream: true }));
        return pump();
      });
    })();
  }

  function readSSE(res, onDelta) {
    var reader = res.body.getReader();
    var dec = new TextDecoder();
    var buf = '';
    return (function pump() {
      return reader.read().then(function (r) {
        if (r.done) return;
        buf += dec.decode(r.value, { stream: true });
        var parts = buf.split('\n\n');
        buf = parts.pop();
        parts.forEach(function (ev) {
          ev.split('\n').forEach(function (l) {
            if (l.indexOf('data:') !== 0) return;
            var d = l.slice(5).trim();
            if (!d || d === '[DONE]') return;
            try {
              var j = JSON.parse(d);
              if (j && typeof j.delta === 'string') onDelta(j.delta);
              else if (j && typeof j.text === 'string') onDelta(j.text);
            } catch (e) {
              onDelta(d);
            }
          });
        });
        return pump();
      });
    })();
  }

  /* ----------------------------------------------------------
     the local responder.
     Stand-in only: it keeps the demo honest when /api/marvin is
     not deployed. The real voice comes from the system prompt on
     the server.
     ---------------------------------------------------------- */
  function localFallback() {
    var mine = session.messages.filter(function (m) { return m.role === 'user'; });
    var all = mine.map(function (m) { return m.text; }).join(' ').toLowerCase();
    var turn = mine.length;

    var topic = null;
    if (/email|inbox|mail/.test(all)) topic = 'email';
    else if (/spreadsheet|excel|sheet|tracker/.test(all)) topic = 'spreadsheet';
    else if (/report|dashboard|numbers|metric/.test(all)) topic = 'reporting';
    else if (/client|customer|support|ticket/.test(all)) topic = 'requests';
    else if (/manual|copy|paste|retype/.test(all)) topic = 'manual';

    var seeds = {
      email: {
        reflect: 'So the inbox has become the queue — work arrives as email and gets pushed along from there.',
        insight: 'That usually means the same fact lives in three places by the end of the week: the thread, someone\'s notes, and the sheet nobody updated.',
        question: 'When something changes, how does the rest of the team find out?'
      },
      spreadsheet: {
        reflect: 'It sounds like the spreadsheet has quietly become your production system.',
        insight: 'The cost rarely shows up as errors. It shows up as the hour a day someone spends reconciling two versions of the same list.',
        question: 'Who holds the version everyone else trusts?'
      },
      reporting: {
        reflect: 'You are spending time assembling the numbers rather than reading them.',
        insight: 'When reporting is manual, the first question in a meeting is usually "is this current?" rather than "what does it mean?"',
        question: 'How long does it take to answer a simple question about last month?'
      },
      requests: {
        reflect: 'Requests come in from several directions and land wherever the person happens to be.',
        insight: 'Most of the delay is not the work itself — it is waiting to find out what was actually asked for.',
        question: 'Where do those requests currently land?'
      },
      manual: {
        reflect: 'The same steps are being repeated by hand, and it sounds like nobody is sure how much time they take.',
        insight: 'Manual steps are rarely the expensive part. The expensive part is that they only work while a specific person is available.',
        question: 'What happens to that work when you are away?'
      }
    };

    var s = seeds[topic] || {
      reflect: 'Sounds like the friction is in the handoffs rather than in any one tool.',
      insight: 'Most teams hit this around the point where the work outgrows the way it was first organised — nothing is broken, it just stops scaling.',
      question: 'Where does work most often stall?'
    };

    if (turn === 1) {
      return s.reflect + ' ' + s.insight + ' ' + s.question;
    }

    if (turn === 2) {
      return 'That fits. ' + s.question.replace(/\?$/, '') + ' tends to be where the fix starts, because it decides what is worth automating. ' +
        'If it helps, I can sketch what the first version would look like.';
    }

    if (turn === 3) {
      return 'Based on what you have told me, here is how I would start:\n\n' +
        '- **One intake point**: requests land in a single queue instead of four inboxes, tagged on arrival\n' +
        '- **One shared record**: the facts people currently keep in their heads live in the same place the queue reads from\n' +
        '- **One weekly digest**: the summary writes itself from that record instead of being assembled by hand\n\n' +
        'This typically removes the reconciliation step entirely. The exact scope depends on your workflow and what you already run.';
    }

    if (turn === 4) {
      return 'Similar project: a twelve-person studio was routing client work through a shared inbox and rebuilding the same status sheet every Monday. ' +
        'We built an intake queue with automatic tagging and a shared status view. ' +
        'The Monday sheet disappeared, and the studio stopped asking "where is this?" in stand-up.\n\n' +
        'Want me to send the longer version?';
    }

    return 'Happy to go deeper on any of those pieces, or I can put you in front of the team — ' +
      'they will ask better questions about your setup than I can. ' +
      'You can reach them from the "Talk to a human" link below.';
  }

  /* ----------------------------------------------------------
     wiring
     ---------------------------------------------------------- */
  sendBtn.addEventListener('click', function () { send(); });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      send();
    }
  });

  window.addEventListener('resize', function () {
    if (isOpen) placeCaret();
  });

  /* ----------------------------------------------------------
     voice: the system engine today, any engine later
     ---------------------------------------------------------- */
  function syncVoice() {
    if (!mind) return;
    var v = mind.voice;
    var on = v.on();
    muteBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    panel.classList.toggle('is-muted', !on);

    voiceSel.textContent = '';
    if (!v.available) {
      var o0 = document.createElement('option');
      o0.textContent = 'voice unavailable';
      voiceSel.appendChild(o0);
      voiceSel.disabled = true;
      muteBtn.disabled = true;
      return;
    }
    var list = v.list().filter(function (vo) { return /^en/i.test(vo.lang); });
    if (!list.length) {
      var o1 = document.createElement('option');
      o1.textContent = 'system voice';
      voiceSel.appendChild(o1);
      return;
    }
    var cur = v.current();
    list.forEach(function (vo) {
      var o = document.createElement('option');
      o.value = vo.voiceURI;
      o.textContent = vo.name.replace(/^(Microsoft|Google)\s+/, '').replace(/ Online.*$/, '');
      if (cur && vo.voiceURI === cur.voiceURI) o.selected = true;
      voiceSel.appendChild(o);
    });
  }

  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = syncVoice;
    window.speechSynthesis.getVoices();
  }

  voiceSel.addEventListener('change', function () {
    if (!mind) return;
    mind.voice.choose(voiceSel.value);
    mind.voice.audition(voiceSel.value);
    setStatus('that is the voice', '');
  });

  muteBtn.addEventListener('click', function () {
    if (!mind) return;
    var on = mind.voice.toggle();
    muteBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    panel.classList.toggle('is-muted', !on);
    setStatus(on ? 'voice on' : 'voice off', '');
  });

  /* ----------------------------------------------------------
     microphone — real recognition where the browser has it,
     an honest explanation where it does not
     ---------------------------------------------------------- */
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  var recog = null;

  function stopMic() {
    micBtn.classList.remove('is-live');
    if (recog) { try { recog.stop(); } catch (e) {} }
  }

  function startMic() {
    if (!SR) {
      setStatus('voice input needs Chrome or Edge — type instead', '');
      return;
    }
    if (panel.classList.contains('is-speaking') || busy) {
      if (mind) mind.cancel();
      setStatus('go ahead', '');
    }
    if (!recog) {
      recog = new SR();
      recog.lang = 'en-GB';
      recog.interimResults = true;
      recog.continuous = false;
      recog.maxAlternatives = 1;

      recog.onresult = function (e) {
        var interim = '', final = '';
        for (var i = e.resultIndex; i < e.results.length; i++) {
          var r = e.results[i];
          if (r.isFinal) final += r[0].transcript;
          else interim += r[0].transcript;
        }
        if (interim) setStatus('\u201c' + interim.trim() + '\u201d', '');
        if (final.trim()) { stopMic(); send(final.trim()); }
      };
      recog.onerror = function (e) {
        stopMic();
        setStatus(e.error === 'not-allowed'
          ? 'microphone blocked — allow it in the browser'
          : 'I did not catch that', '');
      };
      recog.onend = function () { micBtn.classList.remove('is-live'); };
    }
    try {
      recog.start();
      micBtn.classList.add('is-live');
      setStatus('listening', 'ask');
    } catch (e) {}
  }

  micBtn.addEventListener('click', function () {
    if (micBtn.classList.contains('is-live')) stopMic();
    else startMic();
  });

  /* the live line doubles as the stop button */
  statusRow.addEventListener('click', function () {
    if (!busy) return;
    if (mind) mind.cancel();
    setStatus('stopped', '');
    endTurn();
  });

  /* typing over him stops the voice, not the work */
  input.addEventListener('input', function () {
    if (mind && panel.classList.contains('is-speaking')) mind.voice.cancel();
  });

  window.__marvinPanel = {
    open: open,
    close: close,
    isOpen: function () { return isOpen; }
  };
})();
