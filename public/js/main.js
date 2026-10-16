(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.round(s % 60);
    return `${m}:${String(sec).padStart(2, '0')}`;
  };

  const year = $('#year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Sample episode (scripted, not real AI output) ---------- */
  const SAMPLE = {
    title: 'Episode 42: Founders on pricing',
    duration: 3492,
    clips: [
      { start: 212, end: 261, score: 9, title: 'Why we doubled our price and lost no one', caption: 'We doubled the price. Nobody left.', reason: 'Opens with a surprising claim and resolves it in under a minute.', hue: ['#2f4bff', '#0f1f2e'] },
      { start: 604, end: 655, score: 8, title: 'The first customer call that changed the roadmap', caption: 'One call rewrote our roadmap.', reason: 'A short story with a clear turning point.', hue: ['#7a3cff', '#14123a'] },
      { start: 1180, end: 1236, score: 9, title: 'Stop giving discounts to people who did not ask', caption: 'Never discount unasked.', reason: 'A direct, quotable rule that stands on its own.', hue: ['#0e8f7e', '#0f1f2e'] },
      { start: 1710, end: 1752, score: 7, title: 'A pricing page mistake almost everyone makes', caption: 'Your pricing page hides the answer.', reason: 'Practical and specific; works without context.', hue: ['#e0592a', '#2a1410'] },
      { start: 2480, end: 2541, score: 8, title: 'How to tell if customers actually value it', caption: 'Ask what they would lose.', reason: 'Ends on a question viewers can answer themselves.', hue: ['#2f4bff', '#142e5c'] },
      { start: 3105, end: 3150, score: 6, title: 'The one metric we check every Monday', caption: 'One number. Every Monday.', reason: 'Clear takeaway, though the setup is a little slow.', hue: ['#566677', '#0f1f2e'] },
    ],
  };

  /* ---------- Hero: find clips ---------- */
  const form = $('#try');
  if (form) {
    const input = $('#video-url');
    const runBtn = $('#run');
    const demoBtn = $('#run-demo');
    const statusEl = $('#status');
    const modeNote = $('#mode-note');
    const stage = $('#stage');
    const timeline = $('#timeline');
    const ticks = $('#ticks');
    const timelineWrap = $('#timeline-wrap');
    const clipsEl = $('#clips');
    let live = false;
    let busy = false;

    const setStatus = (text, tone) => {
      statusEl.textContent = text;
      statusEl.dataset.tone = tone || '';
    };
    const setBusy = (state) => {
      busy = state;
      runBtn.disabled = state;
      demoBtn.disabled = state;
    };

    fetch('/api/status')
      .then((r) => r.json())
      .then((d) => {
        live = Boolean(d.live);
        modeNote.textContent = live ? 'Live mode is on.' : 'Live mode is off. Add an API key to .env to enable it.';
      })
      .catch(() => { modeNote.textContent = 'Server unreachable.'; });

    const clipCard = (c) => {
      const el = document.createElement('article');
      el.className = 'clip';
      const frame = document.createElement('div');
      frame.className = 'frame';
      if (c.hue) {
        frame.style.setProperty('--hue-a', c.hue[0]);
        frame.style.setProperty('--hue-b', c.hue[1]);
      }
      const badge = document.createElement('span');
      badge.className = 'badge';
      badge.textContent = `Score ${c.score}`;
      frame.append(badge);
      if (c.caption) {
        const cap = document.createElement('span');
        cap.className = 'cap';
        cap.textContent = c.caption;
        frame.append(cap);
      }
      const h = document.createElement('h3');
      h.textContent = c.title || 'Untitled clip';
      const meta = document.createElement('p');
      meta.className = 'meta';
      meta.textContent = c.meta;
      const why = document.createElement('p');
      why.className = 'why';
      why.textContent = c.reason || '';
      el.append(frame, h, meta, why);
      if (c.url) {
        const a = document.createElement('a');
        a.href = c.url;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = 'Open clip';
        el.append(a);
      }
      return el;
    };

    async function runDemo() {
      setBusy(true);
      setStatus('Reading the transcript and scoring moments…');
      stage.hidden = false;
      timelineWrap.hidden = false;
      clipsEl.replaceChildren();
      timeline.replaceChildren();
      $('#stage-title').textContent = SAMPLE.title;
      $('#stage-count').textContent = `${fmt(SAMPLE.duration)} source`;
      ticks.replaceChildren(
        ...[0, 0.25, 0.5, 0.75, 1].map((p) => {
          const s = document.createElement('span');
          s.textContent = fmt(SAMPLE.duration * p);
          return s;
        })
      );
      const marks = SAMPLE.clips.map((c, i) => {
        const m = document.createElement('div');
        m.className = 'mark';
        m.style.left = `${(c.start / SAMPLE.duration) * 100}%`;
        m.style.width = `${((c.end - c.start) / SAMPLE.duration) * 100}%`;
        const n = document.createElement('span');
        n.textContent = i + 1;
        m.append(n);
        timeline.append(m);
        return m;
      });
      stage.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
      await sleep(reduceMotion ? 0 : 500);
      for (const m of marks) {
        m.classList.add('on');
        await sleep(reduceMotion ? 0 : 260);
      }
      await sleep(reduceMotion ? 0 : 350);
      SAMPLE.clips.forEach((c) => {
        clipsEl.append(clipCard({ ...c, meta: `${fmt(c.start)} to ${fmt(c.end)} (${c.end - c.start}s)` }));
      });
      $('#stage-count').textContent = `${fmt(SAMPLE.duration)} source, ${SAMPLE.clips.length} clips`;
      setStatus(`Found ${SAMPLE.clips.length} clips. This is a scripted sample.`);
      setBusy(false);
    }

    async function pollProject(id) {
      for (let i = 0; i < 120; i++) {
        const r = await fetch(`/api/projects/${id}`);
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Clipping failed.');
        if (d.code === 2000 && d.videos.length) return d.videos;
        setStatus(`Processing… checked ${i + 1} time${i ? 's' : ''}. Long videos take a few minutes.`);
        await sleep(30000);
      }
      throw new Error('Timed out waiting for clips. Check the project in your account.');
    }

    async function runLive(url) {
      setBusy(true);
      setStatus('Submitting your video…');
      try {
        const r = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || 'Could not submit the video.');
        const videos = await pollProject(d.projectId);
        stage.hidden = false;
        timelineWrap.hidden = true;
        $('#stage-title').textContent = 'Your clips';
        $('#stage-count').textContent = `${videos.length} clips, highest score first`;
        clipsEl.replaceChildren(
          ...videos.map((v) =>
            clipCard({
              title: v.title,
              score: v.score,
              reason: v.reason,
              url: v.url,
              meta: `${Math.round((v.durationMs || 0) / 1000)}s`,
            })
          )
        );
        setStatus(`Done. ${videos.length} clips ready. Links expire after 7 days.`);
      } catch (err) {
        setStatus(err.message, 'error');
      } finally {
        setBusy(false);
      }
    }

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (busy) return;
      const url = input.value.trim();
      if (!url) {
        setStatus('Paste a video link, or run the sample episode.', 'error');
        input.focus();
        return;
      }
      if (!live) {
        setStatus('Live mode is off, so this runs the sample episode instead.');
        runDemo();
        return;
      }
      runLive(url);
    });
    demoBtn.addEventListener('click', () => { if (!busy) runDemo(); });
  }

  /* ---------- Edit by text ---------- */
  const transcript = $('#transcript');
  if (transcript) {
    const FILLERS = new Set(['um', 'uh', 'like,']);
    const TEXT =
      'So um the thing most people get wrong about pricing is, uh, they wait until they feel ready. ' +
      'Like, you are never ready. You pick a number, you watch what happens, and you adjust.';
    const readout = $('#readout');
    const words = TEXT.split(/\s+/).map((w, i) => {
      const clean = w.toLowerCase().replace(/[.]/g, '');
      return { w, i, secs: 0.35 + Math.min(w.length, 10) * 0.03, filler: FILLERS.has(clean) || clean === 'uh,' };
    });
    const total = words.reduce((a, b) => a + b.secs, 0);
    const btns = words.map((word) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'word' + (word.filler ? ' filler' : '');
      b.textContent = word.w;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', () => {
        b.setAttribute('aria-pressed', String(b.getAttribute('aria-pressed') !== 'true'));
        update();
      });
      transcript.append(b, ' ');
      return b;
    });
    function update() {
      const cut = words.reduce((a, w, i) => a + (btns[i].getAttribute('aria-pressed') === 'true' ? w.secs : 0), 0);
      readout.textContent = `${(total - cut).toFixed(1)}s kept, ${cut.toFixed(1)}s cut`;
    }
    $('#cut-fillers').addEventListener('click', () => {
      words.forEach((w, i) => { if (w.filler) btns[i].setAttribute('aria-pressed', 'true'); });
      update();
    });
    $('#reset-words').addEventListener('click', () => {
      btns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      update();
    });
    update();
  }

  /* ---------- Pricing calculator ---------- */
  const slider = $('#minutes');
  if (slider) {
    // Placeholder numbers. Replace with your own pricing.
    const TIERS = [
      { minutes: 300, creator: 9, business: 15 },
      { minutes: 600, creator: 14, business: 22 },
      { minutes: 1200, creator: 24, business: 36 },
      { minutes: 2400, creator: 44, business: 62 },
      { minutes: 4800, creator: 82, business: 110 },
      { minutes: 9600, creator: 150, business: 200 },
    ];
    const YEARLY_DISCOUNT = 0.8;
    let yearly = false;
    const money = (n) => `$${Number.isInteger(n) ? n : n.toFixed(2)}`;
    const render = () => {
      const t = TIERS[Number(slider.value)];
      const k = yearly ? YEARLY_DISCOUNT : 1;
      $('#minutes-out').textContent = `${t.minutes.toLocaleString()} minutes`;
      $('#hours-out').textContent = `${Math.round(t.minutes / 60)} hours`;
      $('#credits-creator').textContent = t.minutes.toLocaleString();
      $('#price-creator').textContent = money(Math.round(t.creator * k * 100) / 100);
      $('#price-business').textContent = money(Math.round(t.business * k * 100) / 100);
    };
    slider.max = TIERS.length - 1;
    slider.addEventListener('input', render);
    const month = $('#bill-month');
    const yr = $('#bill-year');
    const setPeriod = (isYearly) => {
      yearly = isYearly;
      month.setAttribute('aria-pressed', String(!isYearly));
      yr.setAttribute('aria-pressed', String(isYearly));
      render();
    };
    month.addEventListener('click', () => setPeriod(false));
    yr.addEventListener('click', () => setPeriod(true));
    render();
  }
})();
