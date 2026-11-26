/* ============================================================
   Marvin — chat panel chunk.
   Loaded on first intent. Owns the CRT power-off, the panel,
   the streamed conversation and the session.
   ============================================================ */
(function () {
  if (window.__marvinPanel) return;

  var STORE = 'marvin.session.v1';
  var GREETING = "Hi. I'm Marvin. What's slowing your team down right now?";
  var CHIPS = ['Email overload', 'Spreadsheet chaos', 'Custom software', 'Not sure yet'];
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

  var head = el('div', 'mv-head');
  var headId = el('div', 'mv-head__id');
  headId.appendChild(el('span', 'mv-dot'));
  headId.appendChild(el('span', null, 'Marvin'));
  var headMeta = el('div', 'mv-head__meta', 'Zstudio // Assistant');
  head.appendChild(headId);
  head.appendChild(headMeta);

  var body = el('div', 'mv-body');

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

  body.appendChild(log);

  var chips = el('div', 'mv-chips');
  CHIPS.forEach(function (label) {
    var b = el('button', 'mv-chip');
    b.type = 'button';
    b.textContent = label;
    b.addEventListener('click', function () {
      input.value = label;
      placeCaret();
      send(label);
    });
    chips.appendChild(b);
  });

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

  var sendBtn = el('button', 'mv-send', 'Send');
  sendBtn.type = 'button';

  inputRow.appendChild(fld);
  inputRow.appendChild(sendBtn);

  var foot = el('div', 'mv-foot');
  var human = el('a', null, 'Talk to a human');
  human.href = HUMAN_LINK;
  var closeBtn = el('button', 'mv-close');
  closeBtn.type = 'button';
  var kbd = el('kbd', null, 'Esc');
  closeBtn.appendChild(kbd);
  closeBtn.appendChild(document.createTextNode(' Close'));
  foot.appendChild(human);
  foot.appendChild(closeBtn);

  panel.appendChild(head);
  panel.appendChild(greet);
  panel.appendChild(body);
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
    var dt = Math.min(0.05, (now - pulseLast) / 1000);
    pulseLast = now;
    pulseRatio = Math.min(1, pulseRatio + dt * 0.5);

    var t = (now - pulseT0) / 1000;
    var v = pulseRatio * (0.5 + 0.25 * (Math.sin(0.25 * t * Math.PI * 2) + 1));
    overlay.style.setProperty('--pulse', v.toFixed(4));
    pulseRaf = requestAnimationFrame(pulseFrame);
  }

  function pulseStart() {
    pulseCancel();
    pulseT0 = pulseLast = performance.now();
    if (reduceMQ.matches) {
      overlay.style.setProperty('--pulse', '0.75');
      return;
    }
    pulseRaf = requestAnimationFrame(pulseFrame);
  }

  function pulseCancel() {
    if (pulseRaf) { cancelAnimationFrame(pulseRaf); pulseRaf = 0; }
  }

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
  function typeInto(node, text, speed) {
    return new Promise(function (done) {
      if (reduce) { node.textContent = text; done(); return; }
      var i = 0;
      (function step() {
        if (!isOpen) { node.textContent = text; done(); return; }
        i++;
        node.textContent = text.slice(0, i);
        if (i >= text.length) { done(); return; }
        setTimeout(step, speed);
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
    body.scrollTop = body.scrollHeight;
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

  function send(text) {
    text = (text == null ? input.value : text).trim();
    if (!text || busy) return;

    input.value = '';
    placeCaret();
    chips.classList.add('is-gone');

    addLine('user', text, true);
    session.messages.push({ role: 'user', text: text });
    saveSession();
    activate();

    busy = true;
    sendBtn.disabled = true;

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

  window.__marvinPanel = {
    open: open,
    close: close,
    isOpen: function () { return isOpen; }
  };
})();
