(function () {
  const VALID_PAGES = ['brief', 'problems', 'schedule', 'results', 'faq'];
  let portalData = null;
  let selectedTrack = 'all';
  let selectedFaqCategory = 'all';

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function currentPage() {
    const hash = (window.location.hash || '').replace('#', '').toLowerCase();
    return VALID_PAGES.includes(hash) ? hash : 'problems';
  }

  function updateNav(page) {
    document.querySelectorAll('#portal-nav a').forEach((a) => {
      a.classList.toggle('active', a.dataset.page === page);
    });
  }

  function renderBrief() {
    const { config, brief } = portalData;
    const sectionsHtml = brief.sections
      .map(
        (s) => `
      <article class="statement-card">
        <span class="statement-code">${esc(s.num)}</span>
        <div class="statement-content">
          <h3>${esc(s.heading)}</h3>
          <p>${esc(s.body)}</p>
        </div>
      </article>`
      )
      .join('');

    return `
      <section>
        <div class="kicker-row">
          <div class="kicker-left">
            <span class="accent-bar"></span>
            <span class="mono muted">${esc(config.eventName)} / THE BRIEF</span>
          </div>
          <span class="mono muted">${esc(config.campusLocation.toUpperCase())}</span>
        </div>
        <h1 class="hero-title">The brief</h1>
        <div class="hairline" style="margin-top:clamp(36px,4.5vw,72px)"></div>

        <div class="intro-grid">
          <p class="intro-lead">${esc(brief.headline)}</p>
          <div class="meta-col">
            <div class="meta-item">
              <span class="mono muted" style="font-size:13px">01 / DATE</span>
              <span class="meta-value">${esc(brief.eventDate)}</span>
            </div>
            <div class="meta-item">
              <span class="mono muted" style="font-size:13px">02 / VENUE</span>
              <span class="meta-value">${esc(brief.venue)}</span>
            </div>
          </div>
        </div>

        <p style="font-size:19px;line-height:1.65;color:var(--muted);max-width:780px;margin:0 0 36px">${esc(brief.summary)}</p>
        <div style="border-top:1px solid var(--line-strong)">${sectionsHtml}</div>
      </section>`;
  }

  function renderProblems() {
    const { config, problems } = portalData;
    const visibleTracks =
      selectedTrack === 'all'
        ? problems.tracks
        : problems.tracks.filter((t) => t.num === selectedTrack);

    const chipsHtml = problems.chips
      .map(
        (c) =>
          `<button class="chip ${selectedTrack === c.key ? 'active' : ''}" data-track-chip="${esc(c.key)}">${esc(c.label)}</button>`
      )
      .join('');

    const tracksHtml = visibleTracks
      .map(
        (t) => `
      <div class="track-block">
        <div class="track-head">
          <div>
            <span class="mono muted" style="font-size:14px">TRACK ${esc(t.num)}</span>
            <h2>${esc(t.name)}</h2>
          </div>
          <span class="mono muted" style="font-size:14px">${esc(t.countLabel)}</span>
        </div>
        ${t.description ? `<p class="muted" style="margin:18px 0 0;font-size:16px;max-width:760px">${esc(t.description)}</p>` : ''}
        ${t.statements
          .map(
            (s) => `
          <article class="statement-card">
            <span class="statement-code">${esc(s.id)}</span>
            <div class="statement-content">
              <h3>${esc(s.title)}</h3>
              <p>${esc(s.body)}</p>
              ${s.constraints ? `<div class="statement-meta"><strong class="mono" style="font-size:12px">CONSTRAINTS:</strong> ${esc(s.constraints)}</div>` : ''}
              ${s.evaluationNotes ? `<div class="statement-meta"><strong class="mono" style="font-size:12px">EVALUATION:</strong> ${esc(s.evaluationNotes)}</div>` : ''}
            </div>
          </article>`
          )
          .join('')}
      </div>`
      )
      .join('');

    return `
      <section>
        <div class="kicker-row">
          <div class="kicker-left">
            <span class="accent-bar"></span>
            <span class="mono muted">${esc(config.eventName)} / PROBLEM STATEMENTS</span>
          </div>
          <span class="mono muted">${esc(problems.releaseLabel)}</span>
        </div>
        <h1 class="hero-title">Problem statements</h1>
        <div class="hairline" style="margin-top:clamp(36px,4.5vw,72px)"></div>

        <div class="intro-grid">
          <p class="intro-lead">${esc(problems.intro)}</p>
          <div class="meta-col">
            <div class="meta-item">
              <span class="mono muted" style="font-size:13px">01 / RELEASE</span>
              <span class="meta-value">${esc(problems.releaseDateText)}</span>
            </div>
            <div class="meta-item">
              <span class="mono muted" style="font-size:13px">02 / TRACKS</span>
              <span class="meta-value">${esc(problems.trackSummary)}</span>
            </div>
          </div>
        </div>

        ${
          problems.pending
            ? `<div class="status-banner">
                <span class="status-dot"></span>
                <span class="mono" style="font-size:14px">NOT YET RELEASED</span>
                <span class="muted">The structure below shows how statements will appear. Titles and descriptions are published on Friday.</span>
              </div>`
            : ''
        }

        <div class="chip-row">
          <span class="mono muted" style="font-size:13px;margin-right:8px">FILTER</span>
          ${chipsHtml}
        </div>
        ${tracksHtml}
      </section>`;
  }

  function renderSchedule() {
    const { config, schedule } = portalData;
    const daysHtml = schedule.days
      .map(
        (d) => `
      <div class="day-block">
        <div>
          <span class="mono muted" style="font-size:14px">DAY ${esc(d.num)} / ${esc(d.dateLabel)}</span>
          <h2 class="day-title">${esc(d.name)}</h2>
          <span class="muted" style="font-size:18px;line-height:1.5">${esc(d.summary)}</span>
        </div>
        <ol class="timeline">
          ${d.items
            .map(
              (item) => `
            <li>
              <span class="mono muted" style="font-size:15px;padding-top:4px">${esc(item.time)}</span>
              <div style="display:flex;flex-direction:column;gap:8px">
                <span class="display" style="font-weight:500;font-size:clamp(22px,1.8vw,30px)">${esc(item.title)}</span>
                <span class="muted" style="font-size:16px;line-height:1.6">${esc(item.note)}</span>
              </div>
            </li>`
            )
            .join('')}
        </ol>
      </div>`
      )
      .join('');

    return `
      <section>
        <div class="kicker-row">
          <div class="kicker-left">
            <span class="accent-bar"></span>
            <span class="mono muted">${esc(config.eventName)} / SCHEDULE</span>
          </div>
          <span class="mono muted">${esc(schedule.days.length)} DAYS</span>
        </div>
        <h1 class="hero-title">Schedule</h1>
        <div class="hairline" style="margin-top:clamp(36px,4.5vw,72px)"></div>

        <div class="intro-grid">
          <p class="intro-lead">${esc(schedule.intro)}</p>
          <div class="meta-col">
            <div class="meta-item">
              <span class="mono muted" style="font-size:13px">01 / DATE</span>
              <span class="meta-value">${esc(schedule.date)}</span>
            </div>
            <div class="meta-item">
              <span class="mono muted" style="font-size:13px">02 / VENUE</span>
              <span class="meta-value">${esc(schedule.venue)}</span>
            </div>
          </div>
        </div>
        ${daysHtml}
        <p class="mono muted" style="margin:0;padding:24px 0 0;border-top:1px solid var(--line);font-size:13px">${esc(schedule.footerNote)}</p>
      </section>`;
  }

  function renderResults() {
    const { config, results } = portalData;
    const podiumHtml = results.podium
      .map(
        (p) => `
      <div class="podium-card">
        <span class="mono muted" style="font-size:14px">${esc(p.place)}</span>
        <span class="podium-num">${esc(p.num)}</span>
        <div style="display:flex;flex-direction:column;gap:8px;padding-top:12px;border-top:1px solid var(--line)">
          <span class="mono muted" style="font-size:12px;padding-top:8px">TEAM</span>
          <span class="display" style="font-weight:500;font-size:clamp(22px,1.9vw,32px)">${esc(p.team)}</span>
          <span class="mono muted" style="font-size:12px;padding-top:8px">PROJECT</span>
          <span style="font-size:18px;line-height:1.5">${esc(p.project)}</span>
          ${
            p.projectUrl || p.repoUrl
              ? `<div style="display:flex;gap:16px;padding-top:8px;font-size:13px" class="mono">
                  ${p.projectUrl ? `<a href="${esc(p.projectUrl)}" target="_blank" rel="noopener" style="text-decoration:underline">DEMO</a>` : ''}
                  ${p.repoUrl ? `<a href="${esc(p.repoUrl)}" target="_blank" rel="noopener" style="text-decoration:underline">REPO</a>` : ''}
                </div>`
              : ''
          }
        </div>
      </div>`
      )
      .join('');

    const showcaseHtml = results.showShowcase
      ? `
      <div style="padding-top:clamp(56px,5.5vw,96px)">
        <div class="track-head">
          <div>
            <span class="mono muted" style="font-size:14px">PROJECT SHOWCASE</span>
            <h2>What the teams built</h2>
          </div>
          <span class="mono muted" style="font-size:14px">${results.published ? 'FEATURED BUILDS' : 'PUBLISHED AFTER JUDGING'}</span>
        </div>
        <div class="showcase-grid">
          ${results.showcase
            .map(
              (s) => `
            <div style="display:flex;flex-direction:column;gap:14px">
              <div class="showcase-thumb">
                ${
                  s.screenshotUrl
                    ? `<img src="${esc(s.screenshotUrl)}" alt="${esc(s.title)}">`
                    : `<span class="mono muted" style="font-size:12px">PROJECT SCREENSHOT</span>`
                }
              </div>
              <span class="mono muted" style="font-size:13px">${esc(s.label)}</span>
              <span class="display" style="font-weight:500;font-size:24px">${esc(s.title)}</span>
              <span class="muted" style="font-size:16px">${esc(s.team)}</span>
              ${s.description ? `<p class="muted" style="margin:0;font-size:15px;line-height:1.5">${esc(s.description)}</p>` : ''}
            </div>`
            )
            .join('')}
        </div>
      </div>`
      : '';

    return `
      <section>
        <div class="kicker-row">
          <div class="kicker-left">
            <span class="accent-bar"></span>
            <span class="mono muted">${esc(config.eventName)} / RESULTS</span>
          </div>
          <span class="mono muted">${esc(results.resultsStatus)}</span>
        </div>
        <h1 class="hero-title">Results</h1>
        <div class="hairline" style="margin-top:clamp(36px,4.5vw,72px)"></div>
        <p class="intro-lead" style="padding:clamp(32px,3.5vw,56px) 0">${esc(results.intro)}</p>
        <div class="podium-grid">${podiumHtml}</div>
        ${showcaseHtml}
      </section>`;
  }

  function renderFaq() {
    const { config, faqs } = portalData;
    const cats = ['all', ...faqs.categories];
    const items =
      selectedFaqCategory === 'all'
        ? faqs.items
        : faqs.items.filter((f) => f.category === selectedFaqCategory);

    return `
      <section>
        <div class="kicker-row">
          <div class="kicker-left">
            <span class="accent-bar"></span>
            <span class="mono muted">${esc(config.eventName)} / FAQ</span>
          </div>
          <span class="mono muted">${faqs.items.length} QUESTIONS</span>
        </div>
        <h1 class="hero-title">FAQ</h1>
        <div class="hairline" style="margin-top:clamp(36px,4.5vw,72px)"></div>
        <div class="chip-row">
          <span class="mono muted" style="font-size:13px;margin-right:8px">CATEGORY</span>
          ${cats
            .map(
              (c) =>
                `<button class="chip ${selectedFaqCategory === c ? 'active' : ''}" data-faq-cat="${esc(c)}">${esc(c === 'all' ? 'ALL' : c.toUpperCase())}</button>`
            )
            .join('')}
        </div>
        <div style="border-top:1px solid var(--line-strong);margin-top:24px">
          ${items
            .map(
              (f, idx) => `
            <article class="statement-card">
              <span class="statement-code">Q-${String(idx + 1).padStart(2, '0')}</span>
              <div class="statement-content">
                <span class="mono muted" style="font-size:12px">${esc(f.category.toUpperCase())}</span>
                <h3>${esc(f.question)}</h3>
                <p>${esc(f.answer)}</p>
              </div>
            </article>`
            )
            .join('')}
        </div>
      </section>`;
  }

  function render() {
    if (!portalData) return;
    const page = currentPage();
    updateNav(page);

    document.getElementById('hdr-chapter').textContent = portalData.config.chapterLabel;
    document.getElementById('hdr-campus').textContent = portalData.config.campusLocation;
    document.getElementById('ftr-event').textContent = portalData.config.eventTagline;

    const root = document.getElementById('portal-root');
    if (page === 'brief') root.innerHTML = renderBrief();
    else if (page === 'schedule') root.innerHTML = renderSchedule();
    else if (page === 'results') root.innerHTML = renderResults();
    else if (page === 'faq') root.innerHTML = renderFaq();
    else root.innerHTML = renderProblems();

    root.querySelectorAll('[data-track-chip]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedTrack = btn.dataset.trackChip;
        render();
      });
    });

    root.querySelectorAll('[data-faq-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        selectedFaqCategory = btn.dataset.faqCat;
        render();
      });
    });
  }

  async function init() {
    try {
      const res = await fetch('/api/portal');
      if (!res.ok) throw new Error('Failed to load portal data');
      portalData = await res.json();
      render();
    } catch (err) {
      document.getElementById('portal-root').innerHTML =
        `<p class="mono" style="color:var(--danger)">Failed to load portal: ${esc(err.message)}</p>`;
    }
  }

  window.addEventListener('hashchange', () => {
    render();
    window.scrollTo(0, 0);
  });

  init();
})();
