/* ============================================================
   Marvin — the mind.
   Stage 1 of the AI-native chat: the whole loop (intent → plan →
   research → verify → gaps → clarify → execute → deliver) is
   real as an experience. The reasoning content is scripted; the
   voice, the states, the trace and the artefacts are not.

   Loaded by marvin-panel.js after the panel chunk. If it fails
   to load, the panel keeps its old scripted responder.
   ============================================================ */
(function () {
  if (window.__marvinMind) return;

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var api = null;
  var runId = 0;

  function alive(id) { return id === runId; }
  function wait(ms) {
    return new Promise(function (r) { setTimeout(r, reduce ? Math.min(ms, 40) : ms); });
  }

  /* ----------------------------------------------------------
     voice — the browser's own speech engine, behind an interface
     a real TTS can replace later without touching the UI.
     ---------------------------------------------------------- */
  var Voice = (function () {
    var synth = window.speechSynthesis || null;
    var STORE = 'marvin.voice.v1';
    var cfg = { on: true, uri: '', rate: 0.98, pitch: 0.88 };
    var mouthRaf = 0, mouthLevel = 0, speaking = false;

    try {
      var saved = JSON.parse(localStorage.getItem(STORE) || 'null');
      if (saved && typeof saved === 'object') {
        cfg.on = saved.on !== false;
        cfg.uri = saved.uri || '';
        if (typeof saved.rate === 'number') cfg.rate = saved.rate;
        if (typeof saved.pitch === 'number') cfg.pitch = saved.pitch;
      }
    } catch (e) {}

    function save() {
      try { localStorage.setItem(STORE, JSON.stringify(cfg)); } catch (e) {}
    }

    var PREFER = [
      'Google UK English Male', 'Daniel', 'Microsoft Ryan', 'Microsoft Guy',
      'Alex', 'Google US English', 'Microsoft David'
    ];

    function voices() { return synth ? synth.getVoices() : []; }

    function current() {
      var list = voices();
      if (!list.length) return null;
      if (cfg.uri) {
        for (var i = 0; i < list.length; i++) if (list[i].voiceURI === cfg.uri) return list[i];
      }
      for (var p = 0; p < PREFER.length; p++) {
        for (var j = 0; j < list.length; j++) {
          if (list[j].name === PREFER[p]) return list[j];
        }
      }
      for (var k = 0; k < list.length; k++) if (/^en/i.test(list[k].lang)) return list[k];
      return list[0];
    }

    /* the mouth is driven by real word boundaries where the engine
       provides them, and by a synthetic envelope where it does not */
    function tick(strength) {
      mouthLevel = Math.min(1, (strength || 0.7));
      if (mouthRaf) return;
      (function decay() {
        mouthLevel *= 0.86;
        if (api) api.mouth(mouthLevel);
        if (mouthLevel > 0.04) mouthRaf = requestAnimationFrame(decay);
        else { mouthRaf = 0; if (api) api.mouth(0); }
      })();
    }

    function envelope(ms) {
      var t0 = performance.now();
      (function step() {
        if (!speaking) return;
        var t = (performance.now() - t0) / 1000;
        tick(0.55 + 0.4 * Math.abs(Math.sin(t * 11.3)));
        if (performance.now() - t0 < ms) mouthRaf = requestAnimationFrame(step);
      })();
    }

    function chunks(text) {
      var out = text.match(/[^.!?…]+[.!?…]+["')\]]*|[^.!?…]+$/g) || [text];
      return out.map(function (s) { return s.trim(); }).filter(Boolean);
    }

    function speak(text, hooks) {
      hooks = hooks || {};
      if (!synth || !cfg.on || !text) { if (hooks.end) hooks.end(); return; }
      cancel();
      var v = current();
      var parts = chunks(text);
      var done = 0;
      speaking = true;
      if (api) api.speaking(true);

      parts.forEach(function (part, i) {
        var u = new SpeechSynthesisUtterance(part);
        if (v) u.voice = v;
        u.rate = cfg.rate;
        u.pitch = cfg.pitch;
        u.volume = 1;
        if (hooks.start && i === 0) hooks.start();
        u.onboundary = function () { tick(0.9); };
        u.onstart = function () { if (!synth.__boundaryOk) envelope(900); };
        u.onend = function () {
          done++;
          if (done >= parts.length) {
            speaking = false;
            if (api) { api.speaking(false); api.mouth(0); }
            if (hooks.end) hooks.end();
          } else {
            setTimeout(function () { tick(0.5); }, 90);
          }
        };
        u.onerror = u.onend;
        synth.speak(u);
      });
    }

    function cancel() {
      if (!synth) return;
      speaking = false;
      try { synth.cancel(); } catch (e) {}
      if (api) { api.speaking(false); api.mouth(0); }
    }

    return {
      available: !!synth,
      on: function () { return cfg.on && !!synth; },
      toggle: function () {
        cfg.on = !cfg.on;
        save();
        if (!cfg.on) cancel();
        return cfg.on;
      },
      list: voices,
      current: current,
      choose: function (uri) { cfg.uri = uri; save(); },
      audition: function (uri) {
        var was = cfg.uri;
        if (uri) cfg.uri = uri;
        var v = current();
        cfg.uri = was;
        if (!synth) return;
        cancel();
        var u = new SpeechSynthesisUtterance('The numbers are rebuilt three times. That is the whole problem.');
        if (v) u.voice = v;
        u.rate = cfg.rate; u.pitch = cfg.pitch;
        synth.speak(u);
      },
      speak: speak,
      cancel: cancel
    };
  })();

  /* ----------------------------------------------------------
     the missions.
     Each one is a complete loop, written the way the real
     intelligence would be prompted — the shape stays, only the
     content is canned.
     ---------------------------------------------------------- */
  var MISSIONS = [
    {
      id: 'quotes',
      match: /quote|proposal|estimate|pricing|price|tender/i,
      intent: 'The quote is not slow to write. It is slow because three people rebuild the same numbers for it.',
      commit: 'I will trace where those numbers come from, check what your tools can give me, and come back with the shortest fix. Say stop if I have the wrong problem.',
      plan: ['Map where the numbers live', 'Check what your tools can export', 'Draft the shortest fix', 'Cost the change'],
      research: [
        { domain: 'support.google.com', title: 'IMPORTRANGE — Sheets function reference',
          excerpt: 'Imports a range from another spreadsheet. Refreshes when the file opens, then every 30 minutes while it is open.',
          verdict: 'used' },
        { domain: 'developers.pipedrive.com', title: 'Deals API — custom fields',
          excerpt: 'Custom fields come back under a 40-character hash, not their label, so the mapping has to be written down once.',
          verdict: 'used' },
        { domain: 'zapier.com', title: 'How to automate quotes from a spreadsheet',
          excerpt: 'A 2023 walkthrough built on a pricing page and a form that no longer exist.',
          verdict: 'rejected', why: 'two years old, and both tools it names have changed' }
      ],
      researchSay: 'Three pages. The third one is two years old, so I am ignoring it.',
      checks: [
        { label: 'Both sources agree the numbers can be read without a human', ok: true },
        { label: 'Volume is inside the export limit', ok: true, note: 'about 40 quotes a month against a 10M-cell ceiling' },
        { label: 'Your deal fields are standard', ok: false, note: 'I cannot see your account, so this stays open' }
      ],
      verifySay: 'Two agree. One thing I cannot check from here.',
      gaps: ['Whether your Pipedrive fields are custom', 'Who owns the price list today'],
      clarify: {
        question: 'Where do the numbers live today?',
        why: 'It decides whether the second step is a morning or a week.',
        options: [
          { label: 'Google Sheets', note: 'Cheapest. One import, no API, no mapping.' },
          { label: 'Pipedrive', note: 'Reads live, but custom fields need a mapping written down.' },
          { label: 'Both', note: 'Two sources to reconcile. I would still collapse them into one.' }
        ]
      },
      artefact: {
        title: 'Quoting without the rebuild',
        verdict: 'The quote is slow because the numbers are rebuilt three times. Take the rebuilding out and a quote takes minutes, not days.',
        meta: ['4 steps', 'about a week', 'no new tools'],
        sections: [
          { h: 'What changes', kind: 'steps', items: [
            { t: 'One price sheet', d: 'The list moves to a single Sheet the team edits in place. Everything else reads from it.', owner: 'you', effort: 'half a day' },
            { t: 'One read', d: 'The quote pulls the row it needs instead of copying the whole table in.', owner: 'you', effort: 'one day' },
            { t: 'One place to fix a price', d: 'Editing the sheet changes every future quote. Nothing is retyped.', owner: 'you', effort: 'half a day' },
            { t: 'A check before send', d: 'The total is compared with the sheet, and the quote stops if they disagree.', owner: 'Marvin', effort: 'two days' }
          ] },
          { h: 'Why this order', kind: 'text',
            body: 'Steps one and two remove the copying. Step three is what stops it coming back. Step four is the safety net, and it is only worth building once the first three exist.' }
        ],
        gaps: ['Whether your deal fields are custom — step two changes if they are'],
        followups: ['Cost it properly', 'What if we stay in Pipedrive?', 'Show me step one'],
        more: {
          'Cost it properly': {
            say: 'Two days of your time, two of mine, and nothing new to buy. That is the whole cost.',
            meta: ['2 days yours', '2 days mine', 'no licence'],
            section: { h: 'What it costs', kind: 'table',
              head: ['Item', 'Who', 'Time', 'Money'],
              rows: [
                ['Move the price list', 'you', 'half a day', '\u2014'],
                ['Write the row lookup', 'me', 'one day', '\u2014'],
                ['The pre-send check', 'me', 'two days', '\u2014'],
                ['Any new licence', 'nobody', '\u2014', '\u00a30']
              ] }
          },
          'What if we stay in Pipedrive?': {
            say: 'Then Pipedrive stays the source and the quote reads one deal from it. A little more setup, and no sheet to keep in sync.',
            verdict: 'Keep Pipedrive as the source. The quote reads one deal instead of rebuilding a table, and nothing is copied twice.',
            meta: ['3 steps', 'about two days', 'Pipedrive stays'],
            replace: [
              { h: 'What changes', kind: 'steps', items: [
                { t: 'Map the custom fields once', d: 'The forty-character hashes get readable names in one config file.', owner: 'me', effort: 'one day' },
                { t: 'Read the deal, not the table', d: 'The quote pulls its deal by id. No export, no copy, no drift.', owner: 'me', effort: 'one day' },
                { t: 'Lock the price fields', d: 'Two people can edit them, and every edit is logged.', owner: 'you', effort: 'a morning' }
              ] },
              { h: 'Why this order', kind: 'text',
                body: 'The mapping comes first because every later step depends on readable names. The read replaces the copy, and the lock is what stops the table coming back.' }
            ]
          },
          'Show me step one': {
            say: 'Step one is the whole trick: one sheet, one owner, one place to fix a price.',
            section: { h: 'Step one, in detail', kind: 'steps', items: [
              { t: 'Copy every price into one tab', d: 'One row per product, one column per tier. Nothing else lives there.', owner: 'you', effort: 'two hours' },
              { t: 'Delete the other copies', d: 'Every duplicate becomes a read from this tab. A copy is a bug waiting to happen.', owner: 'you', effort: 'two hours' },
              { t: 'Name an owner', d: 'One person can change a price. Everyone else can read it.', owner: 'you', effort: '\u2014' }
            ] }
          }
        }
      }
    },

    {
      id: 'inbox',
      match: /email|inbox|mail|ticket|request|support|queue/i,
      intent: 'The inbox has become the queue. Work arrives as email and then lives in three heads.',
      commit: 'I will map what actually arrives, where it lands, and what a single intake would have to carry. Then I will build the first version.',
      plan: ['List what arrives', 'Find where each thing lands today', 'Design one intake', 'Build the first version'],
      research: [
        { domain: 'developers.google.com', title: 'Gmail API — threads and labels',
          excerpt: 'A thread can carry labels, and a label can drive a filter. No mailbox rebuild needed to start.',
          verdict: 'used' },
        { domain: 'notion.so', title: 'Database properties and views',
          excerpt: 'One database can hold every request with a status property, and show a different view per lane.',
          verdict: 'used' },
        { domain: 'reddit.com', title: 'How we fixed our inbox',
          excerpt: 'An anecdote about one team, with no method you could repeat.',
          verdict: 'rejected', why: 'a story, not a method' }
      ],
      researchSay: 'Two usable sources. One story I am not going to build on.',
      checks: [
        { label: 'Both tools can carry the fields the intake needs', ok: true },
        { label: 'Nothing here needs a server of its own', ok: true },
        { label: 'Nobody has to change how they email you', ok: false, note: 'they will have to, slightly — flagged below' }
      ],
      verifySay: 'It holds together, with one honest cost.',
      gaps: ['Who triages the intake each morning', 'Whether invoices must stay in the inbox for audit'],
      clarify: {
        question: 'Which of these actually arrive by email?',
        why: 'It decides how many lanes the intake needs. Two lanes is a filter; five is a system.',
        multi: true,
        options: [
          { label: 'Client requests', note: 'Usually the ones with a deadline attached.' },
          { label: 'Invoices', note: 'Often kept for audit — may need to stay put.' },
          { label: 'Internal approvals', note: 'Short-lived, and easy to lose in a thread.' },
          { label: 'Support tickets', note: 'Already has a home? Then it does not need a lane.' }
        ]
      },
      artefact: {
        title: 'One intake, four lanes',
        verdict: 'One intake, one status page, and the inbox goes back to being a mailbox.',
        meta: ['3 steps', 'about two weeks', 'Gmail + Notion'],
        sections: [
          { h: 'The intake', kind: 'table',
            head: ['Lane', 'Arrives as', 'Lands in', 'Owner'],
            rows: [
              ['Client request', 'a labelled email', 'Requests database', 'whoever is on triage'],
              ['Invoice', 'forwarded', 'Finance folder', 'finance'],
              ['Approval', 'a form link', 'Approvals view', 'the approver'],
              ['Support', 'unchanged', 'existing helpdesk', 'support']
            ] },
          { h: 'What changes for people', kind: 'text',
            body: 'Nobody learns a new tool. They keep emailing. The difference is that the message now carries a label, and the label decides where it lands.' }
        ],
        gaps: ['Whether invoices must stay in the inbox for audit'],
        followups: ['Build the intake rules', 'What does triage look like?', 'What if we skip Notion?'],
        more: {
          'Build the intake rules': {
            say: 'Four rules, written as filters. They are the whole system, and you can change any of them in a minute.',
            section: { h: 'The rules', kind: 'table',
              head: ['When', 'Then', 'Lane'],
              rows: [
                ['Subject contains \u201cquote\u201d', 'label Quote, add to Requests', 'Client request'],
                ['Sender is on the supplier list', 'label Invoice, move to Finance', 'Invoice'],
                ['Message carries an approval link', 'label Approval, add to Approvals', 'Approval'],
                ['Anything else', 'leave it alone', 'Support']
              ] }
          },
          'What does triage look like?': {
            say: 'Nine minutes a day. Read the new rows, fix the labels, close what is done. That is the entire routine.',
            section: { h: 'The morning triage', kind: 'steps', items: [
              { t: 'Read what arrived overnight', d: 'Only the intake view, not the inbox. Everything is already labelled.', owner: 'whoever is on triage', effort: 'five minutes' },
              { t: 'Fix the two rules that were wrong', d: 'A misfiled message is a rule change, not a one-off fix.', owner: 'whoever is on triage', effort: 'two minutes' },
              { t: 'Close what is finished', d: 'Status moves to done. The owner sees it without a second email.', owner: 'whoever is on triage', effort: 'two minutes' }
            ] }
          },
          'What if we skip Notion?': {
            say: 'Then the intake lands in a Sheet. Fewer views, same labels, and one less tool to pay for.',
            section: { h: 'If we skip Notion', kind: 'steps', items: [
              { t: 'One tab, six columns', d: 'Received, from, lane, owner, status, age. Nothing else.', owner: 'you', effort: 'an hour' },
              { t: 'The same four filters', d: 'Gmail labels write the row. The Sheet never needs a formula.', owner: 'me', effort: 'two days' }
            ] }
          }
        }
      }
    },

    {
      id: 'reporting',
      match: /report|dashboard|metric|numbers|weekly|monday|kpi/i,
      intent: 'You spend the week assembling the numbers instead of reading them.',
      commit: 'I will compare the two ways to build this, price them honestly, and tell you which one I would pick. If I cannot verify something, I will say so.',
      plan: ['List what the report has to answer', 'Price the two approaches', 'Check the claims', 'Recommend one'],
      research: [
        { domain: 'metabase.com', title: 'Models and questions',
          excerpt: 'A model is a saved, curated query. Questions sit on top of it, so the definition of a number lives in one place.',
          verdict: 'used' },
        { domain: 'support.google.com', title: 'QUERY function',
          excerpt: 'SQL-like selection over a Sheet range. Enough for a weekly report at your size.',
          verdict: 'used' },
        { domain: 'looker.com', title: 'Pricing',
          excerpt: 'No public price. The page routes to a sales call.',
          verdict: 'rejected', why: 'cannot verify a number that is not published' }
      ],
      researchSay: 'Two usable. The third has no price on it, so I will not pretend to know one.',
      checks: [
        { label: 'Both approaches read the same source', ok: true },
        { label: 'The weekly report fits in a Sheet', ok: true, note: 'four questions, one table each' },
        { label: 'Cost of the hosted option', ok: false, note: 'the two sources disagree by an order of magnitude' }
      ],
      verifySay: 'That is a thin signal, and I would rather say so than round it up.',
      gaps: ['Seat count on the hosted option', 'Whether finance will accept a nightly refresh'],
      clarify: {
        question: 'How fresh do the numbers need to be?',
        why: 'Live is a different build from daily. Most weekly reports do not need live.',
        options: [
          { label: 'Live', note: 'Adds a sync job and a failure mode. Only worth it if people act hourly.' },
          { label: 'Daily', note: 'One refresh at 6am. The report is always yesterday, and nobody minds.' },
          { label: 'Weekly', note: 'Cheapest. The number is stable and the build is a morning.' }
        ]
      },
      artefact: {
        title: 'Two ways to stop assembling the report',
        verdict: 'Start with the sheet, not the tool. At your volume a hosted dashboard buys you a login, not an answer.',
        meta: ['comparison', 'signal: thin', 'one open question'],
        sections: [
          { h: 'The two options', kind: 'table',
            head: ['', 'Sheet + QUERY', 'Hosted dashboard'],
            rows: [
              ['Build time', 'one morning', 'two to three weeks'],
              ['Running cost', 'nothing', 'unknown — no public price'],
              ['Failure mode', 'someone breaks a formula', 'the sync silently stops'],
              ['Ceiling', 'about 50k rows', 'none that matters'],
              ['Who can change it', 'you', 'whoever has a licence']
            ] },
          { h: 'What I would do', kind: 'text',
            body: 'Build the weekly report in the sheet first. It answers the four questions, and it costs a morning. If you outgrow 50k rows, that is a good problem and the migration is a week, not a rewrite.' }
        ],
        gaps: ['Seat count on the hosted option', 'Whether finance will accept a nightly refresh'],
        followups: ['Write the queries', 'What would change your mind?', 'Show me the cost model'],
        more: {
          'Write the queries': {
            say: 'Four questions, four queries, one tab each. None of them needs a tool.',
            section: { h: 'The four questions', kind: 'table',
              head: ['Question', 'Reads', 'Refreshes'],
              rows: [
                ['What came in this week?', 'the intake tab, by date', 'on open'],
                ['What is still open?', 'status \u2260 done', 'on open'],
                ['Where is it slowest?', 'age, grouped by lane', 'daily'],
                ['What changed since Monday?', 'this week against last', 'Mondays 6am']
              ] }
          },
          'What would change your mind?': {
            say: 'Three things would move me off the sheet. None of them is true at forty rows a week.',
            section: { h: 'When I would change my answer', kind: 'table',
              head: ['Signal', 'Threshold', 'Then'],
              rows: [
                ['Rows', 'over 50,000', 'move to a database'],
                ['People editing', 'more than five', 'move to a tool with permissions'],
                ['Freshness needed', 'hourly', 'add a sync job']
              ] }
          },
          'Show me the cost model': {
            say: 'A morning to build, nothing to run, and one person who knows the formulas. That is the honest total.',
            meta: ['one morning', 'no licence', 'one owner'],
            section: { h: 'What it costs', kind: 'table',
              head: ['Item', 'Time', 'Money'],
              rows: [
                ['Write the four queries', 'one morning', '\u2014'],
                ['Wire the Monday refresh', 'an hour', '\u2014'],
                ['Licence', '\u2014', '\u00a30'],
                ['The hidden cost', 'one owner who knows it', '\u2014']
              ] }
          }
        }
      }
    },

    {
      id: 'general',
      match: /.*/,
      intent: 'Something in the handoffs is costing you time, and it is not the tools.',
      commit: 'I will narrow it to the one place it hurts, ask you the question that changes the answer, and then write the fix.',
      plan: ['Find where the work stops', 'Ask the one question that matters', 'Write the fix', 'Cost it'],
      research: [
        { domain: 'minsky.in', title: 'Notes from twelve intake projects',
          excerpt: 'In eleven of twelve, the delay was waiting for information, not waiting for work.',
          verdict: 'used' },
        { domain: 'asana.com', title: 'The anatomy of work index',
          excerpt: 'Knowledge workers report roughly 60% of time on coordination rather than the task itself.',
          verdict: 'used' }
      ],
      researchSay: 'The pattern is consistent. The wait is almost never the work.',
      checks: [
        { label: 'Both sources point at coordination, not tooling', ok: true },
        { label: 'This fits what you described', ok: true }
      ],
      verifySay: 'That is a strong signal, as far as it goes.',
      gaps: ['Which handoff costs the most', 'Who is allowed to unblock it'],
      clarify: {
        question: 'Where does the work most often stop?',
        why: 'The fix is different for each one, and I would rather build the right one.',
        options: [
          { label: 'Waiting on a person', note: 'Fix is a queue with a visible owner.' },
          { label: 'Waiting on information', note: 'Fix is one shared record instead of three.' },
          { label: 'Waiting on a decision', note: 'Fix is a default, so silence stops blocking.' },
          { label: 'It does not stop, it is just slow', note: 'Fix is removing a step, not adding one.' }
        ]
      },
      artefact: {
        title: 'The shortest fix for a stalled handoff',
        verdict: 'The work is not slow. The waiting is. One visible queue and one shared record remove most of it.',
        meta: ['3 steps', 'about a week', 'no new tools'],
        sections: [
          { h: 'What changes', kind: 'steps', items: [
            { t: 'Name the queue', d: 'Every open item sits in one list with an owner and an age.', owner: 'you', effort: 'half a day' },
            { t: 'Name the record', d: 'The facts people ask for live where the queue can read them.', owner: 'you', effort: 'one day' },
            { t: 'Name the default', d: 'If nobody answers in two days, the item moves on a stated assumption.', owner: 'you', effort: 'a morning' }
          ] },
          { h: 'Why it works', kind: 'text',
            body: 'None of these add a tool. They remove the two things that actually cost time: finding out what was asked, and finding out who is holding it.' }
        ],
        gaps: ['Which handoff costs the most — tell me and I will reorder this'],
        followups: ['Reorder it for me', 'What does the queue look like?', 'Who should own it?'],
        more: {
          'Reorder it for me': {
            say: 'Record first, then the queue, then the default. You cannot show an age you never recorded.',
            replace: { h: 'What changes', kind: 'steps', items: [
              { t: 'The record', d: 'The facts people keep asking for, written once, where the queue can read them.', owner: 'you', effort: 'one day' },
              { t: 'The queue', d: 'One list, one owner, one age per item. It only works if the record exists.', owner: 'you', effort: 'half a day' },
              { t: 'The default', d: 'Silence moves the item on a stated assumption after two days.', owner: 'you', effort: 'a morning' }
            ] }
          },
          'What does the queue look like?': {
            say: 'Six columns. If a column does not change a decision, it does not belong.',
            section: { h: 'The queue', kind: 'table',
              head: ['Column', 'Holds', 'Filled by'],
              rows: [
                ['Item', 'one line, in the asker\u2019s words', 'whoever receives it'],
                ['Owner', 'one name, never a team', 'the receiver'],
                ['Age', 'days since it arrived', 'the tool'],
                ['Waiting on', 'a person, a fact, or a decision', 'the owner'],
                ['Next step', 'the one action that unblocks it', 'the owner'],
                ['Default', 'what happens if nobody answers', 'the owner']
              ] }
          },
          'Who should own it?': {
            say: 'One person, fifteen minutes a day. A rota is fine, a committee is not.',
            section: { h: 'Who owns what', kind: 'table',
              head: ['Role', 'Owns', 'Time'],
              rows: [
                ['Triage owner', 'the queue and its ages', '15 min a day'],
                ['Record owner', 'the shared facts', 'an hour a week'],
                ['Default setter', 'the stated assumptions', 'a review a quarter']
              ] }
          }
        }
      }
    }
  ];

  function pick(text) {
    for (var i = 0; i < MISSIONS.length; i++) {
      if (MISSIONS[i].id === 'general') continue;
      if (MISSIONS[i].match.test(text)) return MISSIONS[i];
    }
    return MISSIONS[MISSIONS.length - 1];
  }

  /* a follow-up continues the artefact you are looking at instead of
     starting a new mission — the chips promise exactly that */
  var last = null;
  var STORE = 'marvin.mind.v1';

  /* the transcript and the artefact survive a reload; so must the
     follow-ups that belong to them, or a restored chip starts a
     different mission */
  function saveLast() {
    try {
      if (!last) sessionStorage.removeItem(STORE);
      else sessionStorage.setItem(STORE, JSON.stringify({ id: last.mission.id, used: last.used }));
    } catch (e) {}
  }

  function restoreLast() {
    try {
      var raw = sessionStorage.getItem(STORE);
      if (!raw) return;
      var saved = JSON.parse(raw);
      var m = null;
      for (var i = 0; i < MISSIONS.length; i++) if (MISSIONS[i].id === saved.id) m = MISSIONS[i];
      if (!m) return;
      var art = api.artefactGet ? api.artefactGet() : null;
      if (!art) return;
      last = { mission: m, artefact: art, more: art.more || m.artefact.more || {}, used: saved.used || {}, focus: null };
    } catch (e) {}
  }

  function norm(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function followupFor(text) {
    if (!last || !last.more) return null;
    var want = norm(text);
    for (var k in last.more) if (norm(k) === want) return { key: k, spec: last.more[k] };
    return null;
  }

  function followupLabels() {
    if (!last || !last.more) return [];
    return Object.keys(last.more).filter(function (k) { return !last.used[k]; });
  }

  function follow(fu, id) {
    var spec = fu.spec;
    api.status('revising the plan', 'work');
    api.portrait('think');
    api.channel(2);
    if (api.trace.revise) api.trace.revise(fu.key);
    return wait(420).then(function () {
      if (!alive(id)) return;
      api.status('rewriting that part', 'work');
      return say(spec.say);
    }).then(function () {
      if (!alive(id)) return;
      return speak(spec.say);
    }).then(function () {
      if (!alive(id)) return;
      var art = last.artefact;
      if (spec.verdict) art.verdict = spec.verdict;
      if (spec.meta) art.meta = spec.meta;
      if (spec.replace) {
        var focus = -1;
        [].concat(spec.replace).forEach(function (rep) {
          var at = -1;
          art.sections.forEach(function (sec, i) { if (sec.h === rep.h) at = i; });
          if (at === -1) { art.sections.push(rep); at = art.sections.length - 1; }
          else art.sections[at] = rep;
          if (focus === -1) focus = at;
        });
        last.focus = focus;
      } else if (spec.section) {
        art.sections.push(spec.section);
        last.focus = art.sections.length - 1;
      }
      last.used[fu.key] = true;
      saveLast();
      api.artefact(art, last.focus);
      api.channel(3);
      api.status('done', 'done');
      api.portrait('happy', 1800);
      api.chips(followupLabels());
    }).then(function () {
      if (!alive(id)) return;
      api.status('waiting on you', 'ready');
      api.portrait('');
    }).catch(function (err) {
      if (window.console && console.warn) console.warn('[marvin] follow-up error', err);
      if (alive(id)) api.status('something broke on my side', '');
    });
  }

  /* ----------------------------------------------------------
     the loop
     ---------------------------------------------------------- */
  function say(text) { return api.type('marvin', text, 12); }

  function speak(text) {
    if (!Voice.on()) return Promise.resolve();
    return new Promise(function (done) {
      Voice.speak(text, { end: done });
      setTimeout(done, Math.min(14000, 900 + text.length * 62));
    });
  }

  function intentPhase(m, id) {
    if (!alive(id)) return;
    api.channel(1);
    api.status('reading the request', 'work');
    api.portrait('think');
    api.signal(null);
    return say(m.intent).then(function () {
      if (!alive(id)) return;
      api.trace.intent(m.intent);
      return speak(m.intent);
    }).then(function () {
      if (!alive(id)) return;
      return wait(420);
    }).then(function () {
      if (!alive(id)) return;
      return say(m.commit);
    }).then(function () {
      if (!alive(id)) return;
      return speak(m.commit);
    });
  }

  function planPhase(m, id) {
    if (!alive(id)) return;
    api.status('committing to a plan', 'work');
    api.trace.plan(m.plan);
    api.channel(2);
    api.portrait('think');
    return wait(700);
  }

  function researchPhase(m, id) {
    if (!alive(id)) return;
    api.portrait('scan');
    var p = Promise.resolve();
    m.research.forEach(function (src, i) {
      p = p.then(function () {
        if (!alive(id)) return;
        api.status('reading ' + src.domain, 'work');
        api.trace.source(src, i);
        return wait(src.verdict === 'rejected' ? 900 : 1150);
      });
    });
    return p.then(function () {
      if (!alive(id)) return;
      var rej = m.research.filter(function (s) { return s.verdict === 'rejected'; }).length;
      if (rej) api.status('dropping a source that does not hold up', 'work');
      return m.researchSay ? speak(m.researchSay) : null;
    });
  }

  function verifyPhase(m, id) {
    if (!alive(id)) return;
    api.portrait('squint');
    api.status('checking what I found', 'work');
    var p = Promise.resolve();
    m.checks.forEach(function (c, i) {
      p = p.then(function () {
        if (!alive(id)) return;
        api.trace.check(c, i);
        return wait(760);
      });
    });
    return p.then(function () {
      if (!alive(id)) return;
      var failed = m.checks.filter(function (c) { return !c.ok; }).length;
      api.signal(failed ? 'thin' : 'strong', failed ? failed + ' open' : 'all clear');
      return speak(m.verifySay);
    });
  }

  function gapsPhase(m, id) {
    if (!alive(id)) return;
    api.trace.gaps(m.gaps);
    api.status('naming what I still do not know', 'work');
    return wait(560);
  }

  function clarifyPhase(m, id) {
    if (!alive(id) || !m.clarify) return;
    api.portrait('ask');
    api.status('one question, then I build', 'ask');
    api.channel(1);
    return say(m.clarify.question).then(function () {
      if (!alive(id)) return;
      return speak(m.clarify.question);
    }).then(function () {
      if (!alive(id)) return;
      return api.clarify(m.clarify);
    }).then(function (res) {
      if (!alive(id) || !res) return;
      api.portrait('think');
      api.channel(2);
      api.trace.assumption(res.decided ? res.labels[0] + ' — my call' : res.labels.join(', '));
      if (res.decided) {
        return say('You left it to me. ' + (m.clarify.decideWhy || 'I picked the option that needs the least change, and I will flag it if it stops fitting.'))
          .then(function () { return speak('I picked the one that needs the least change.'); });
      }
    });
  }

  function executePhase(m, id) {
    if (!alive(id)) return;
    api.portrait('focus');
    api.status('building it', 'work');
    api.channel(2);
    var p = Promise.resolve();
    m.plan.forEach(function (_, i) {
      p = p.then(function () {
        if (!alive(id)) return;
        api.trace.step(i, 'run');
        return wait(520).then(function () {
          if (!alive(id)) return;
          api.trace.step(i, 'done');
        });
      });
    });
    return p;
  }

  function deliverPhase(m, id) {
    if (!alive(id)) return;
    api.status('done', 'done');
    /* a copy, so a follow-up can grow this artefact without mutating
       the mission definition for the next visitor */
    var art = JSON.parse(JSON.stringify(m.artefact));
    last = {
      mission: m,
      artefact: art,
      more: art.more || {},
      used: {},
      focus: null
    };
    delete art.more;
    saveLast();
    api.artefact(last.artefact);
    api.channel(3);
    api.portrait('happy', 2200);
    return wait(420).then(function () {
      if (!alive(id)) return;
      api.signal(m.artefact.meta && /thin/.test(m.artefact.meta.join(' ')) ? 'thin' : 'strong',
                 m.artefact.meta && /thin/.test(m.artefact.meta.join(' ')) ? 'thin, and said so' : 'strong');
      return speak(m.artefact.verdict);
    }).then(function () {
      if (!alive(id)) return;
      api.chips(followupLabels());
      api.portrait('');
    });
  }

  function play(mission, id) {
    return Promise.resolve()
      .then(function () { return intentPhase(mission, id); })
      .then(function () { return planPhase(mission, id); })
      .then(function () { return researchPhase(mission, id); })
      .then(function () { return verifyPhase(mission, id); })
      .then(function () { return gapsPhase(mission, id); })
      .then(function () { return clarifyPhase(mission, id); })
      .then(function () { return executePhase(mission, id); })
      .then(function () { return deliverPhase(mission, id); });
  }

  /* ----------------------------------------------------------
     public
     ---------------------------------------------------------- */
  function handle(text) {
    var fu = followupFor(text);
    if (fu) {
      var fid = ++runId;
      Voice.cancel();
      return Promise.resolve().then(function () { return follow(fu, fid); });
    }
    var id = ++runId;
    Voice.cancel();
    last = null;
    saveLast();
    api.trace.reset();
    api.artefactClear();
    api.channel(1);
    api.status('thinking', 'work');
    api.portrait('think');
    api.signal(null);
    var mission = pick(text);
    return play(mission, id).then(function () {
      if (alive(id)) api.status('waiting on you', 'ready');
    }).catch(function (err) {
      if (window.console && console.warn) console.warn('[marvin] mind error', err);
      if (alive(id)) api.status('something broke on my side', '');
    });
  }

  function cancel() {
    runId++;
    Voice.cancel();
  }

  window.__marvinMind = {
    attach: function (a) { api = a; restoreLast(); },
    handle: handle,
    cancel: cancel,
    voice: Voice,
    missions: MISSIONS
  };
})();
