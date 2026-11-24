(function () {
  const TOKEN_KEY = 'cognix_admin_token';
  let token = localStorage.getItem(TOKEN_KEY) || '';
  let activeTab = 'overview';
  let state = {
    admin: null,
    config: null,
    problems: null,
    schedule: null,
    results: null,
    brief: null,
    faqs: null,
  };

  function esc(str) {
    return String(str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  let toastTimer = null;
  function showToast(msg, isError = false) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.classList.toggle('error', isError);
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), 3200);
  }

  async function api(path, options = {}) {
    const headers = Object.assign({}, options.headers || {});
    if (token) headers.Authorization = `Bearer ${token}`;
    if (options.body && !(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const res = await fetch(path, {
      ...options,
      headers,
      body:
        options.body && !(options.body instanceof FormData)
          ? JSON.stringify(options.body)
          : options.body,
    });
    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && path !== '/api/admin/auth/login') {
        logout();
      }
      throw new Error(data?.error?.message || `Request failed (${res.status})`);
    }
    return data;
  }

  function logout() {
    token = '';
    localStorage.removeItem(TOKEN_KEY);
    state.admin = null;
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('btn-logout').classList.add('hidden');
    document.getElementById('admin-user-label').textContent = 'Sign in to manage hackathon content';
  }

  async function loadAllData() {
    const [me, config, problems, schedule, results, brief, faqs] = await Promise.all([
      api('/api/admin/auth/me'),
      api('/api/admin/config'),
      api('/api/admin/tracks'),
      api('/api/admin/schedule'),
      api('/api/admin/results'),
      api('/api/admin/brief'),
      api('/api/admin/faqs'),
    ]);
    state = { admin: me.admin, config, problems, schedule, results, brief, faqs };
    document.getElementById('admin-user-label').textContent = `Signed in as ${me.admin.name} (${me.admin.email})`;
    document.getElementById('login-view').classList.add('hidden');
    document.getElementById('dashboard-view').classList.remove('hidden');
    document.getElementById('btn-logout').classList.remove('hidden');
    renderTab();
  }

  function renderOverview() {
    const c = state.config;
    return `
      <div class="toggle-grid">
        <div class="toggle-card">
          <div>
            <span class="badge ${c.problemsReleased ? 'live' : 'embargo'}">
              ${c.problemsReleased ? 'LIVE / RELEASED' : 'EMBARGOED (TBA)'}
            </span>
            <h3 class="display" style="margin:12px 0 6px;font-size:24px">Problem Statements</h3>
            <p class="muted" style="margin:0;font-size:14px">When embargoed, public visitors only see track structure &amp; TBA placeholders.</p>
          </div>
          <button id="btn-toggle-problems" class="btn ${c.problemsReleased ? 'btn-danger' : 'btn-accent'}">
            ${c.problemsReleased ? 'HIDE (REVERT TO TBA)' : 'RELEASE STATEMENTS NOW'}
          </button>
        </div>

        <div class="toggle-card">
          <div>
            <span class="badge ${c.resultsPublished ? 'live' : 'embargo'}">
              ${c.resultsPublished ? 'PUBLISHED' : 'HIDDEN (TBA)'}
            </span>
            <h3 class="display" style="margin:12px 0 6px;font-size:24px">Results &amp; Podium</h3>
            <p class="muted" style="margin:0;font-size:14px">Status label: <strong>${esc(c.resultsStatus)}</strong>. Controls public visibility of winners &amp; showcase.</p>
          </div>
          <button id="btn-toggle-results" class="btn ${c.resultsPublished ? 'btn-danger' : 'btn-accent'}">
            ${c.resultsPublished ? 'UNPUBLISH RESULTS' : 'PUBLISH RESULTS NOW'}
          </button>
        </div>

        <div class="toggle-card">
          <div>
            <span class="badge ${c.showShowcase ? 'live' : ''}">
              ${c.showShowcase ? 'VISIBLE' : 'HIDDEN'}
            </span>
            <h3 class="display" style="margin:12px 0 6px;font-size:24px">Project Showcase</h3>
            <p class="muted" style="margin:0;font-size:14px">Show or hide the "What the teams built" gallery on the Results screen.</p>
          </div>
          <button id="btn-toggle-showcase" class="btn">
            ${c.showShowcase ? 'HIDE SHOWCASE SECTION' : 'SHOW SHOWCASE SECTION'}
          </button>
        </div>
      </div>

      <form id="config-form" class="panel">
        <div class="panel-head">
          <h2>Event Settings</h2>
          <button type="submit" class="btn btn-primary">SAVE SETTINGS</button>
        </div>
        <div class="form-grid">
          <div class="field"><label>Event Name</label><input name="eventName" value="${esc(c.eventName)}" required></div>
          <div class="field"><label>Footer Tagline</label><input name="eventTagline" value="${esc(c.eventTagline)}" required></div>
          <div class="field"><label>Event Date</label><input name="eventDate" value="${esc(c.eventDate)}" required></div>
          <div class="field"><label>Venue</label><input name="venue" value="${esc(c.venue)}" required></div>
          <div class="field"><label>Release Kicker Label</label><input name="releaseLabel" value="${esc(c.releaseLabel)}" required></div>
          <div class="field"><label>Release Date Text</label><input name="releaseDateText" value="${esc(c.releaseDateText)}" required></div>
          <div class="field"><label>Results Status Badge</label><input name="resultsStatus" value="${esc(c.resultsStatus)}" required></div>
          <div class="field"><label>Campus Location</label><input name="campusLocation" value="${esc(c.campusLocation)}" required></div>
        </div>
        <div class="field"><label>Problem Statements Intro</label><textarea name="problemsIntro">${esc(c.problemsIntro)}</textarea></div>
        <div class="field"><label>Schedule Intro</label><textarea name="scheduleIntro">${esc(c.scheduleIntro)}</textarea></div>
        <div class="field"><label>Schedule Footer Note</label><input name="scheduleFooterNote" value="${esc(c.scheduleFooterNote)}"></div>
        <div class="field"><label>Results Intro</label><textarea name="resultsIntro">${esc(c.resultsIntro)}</textarea></div>
      </form>`;
  }

  function renderProblems() {
    const tracks = state.problems.tracks;
    const trackOptions = tracks
      .map((t) => `<option value="${t.id}">Track ${esc(t.num)} — ${esc(t.name)}</option>`)
      .join('');

    const tracksList = tracks
      .map(
        (t) => `
      <div class="panel">
        <div class="panel-head">
          <div>
            <span class="mono muted" style="font-size:12px">TRACK ${esc(t.num)}</span>
            <h3>${esc(t.name)}</h3>
          </div>
          <div class="item-row-actions">
            <button class="btn btn-sm" data-rename-track="${t.id}" data-track-name="${esc(t.name)}">RENAME</button>
            <button class="btn btn-sm btn-danger" data-delete-track="${t.id}">DELETE TRACK</button>
          </div>
        </div>
        <div class="item-list">
          ${
            t.statements.length === 0
              ? '<p class="muted">No problem statements in this track yet.</p>'
              : t.statements
                  .map(
                    (s) => `
              <div class="item-row">
                <div style="flex:1;min-width:260px">
                  <span class="mono" style="font-size:12px">${esc(s.code)}</span>
                  <h4 class="display" style="margin:4px 0 6px;font-size:20px">${esc(s.title)}</h4>
                  <p class="muted" style="margin:0;font-size:14px;line-height:1.5">${esc(s.body)}</p>
                  ${s.constraints ? `<p class="muted" style="margin:6px 0 0;font-size:13px"><strong>Constraints:</strong> ${esc(s.constraints)}</p>` : ''}
                  ${s.evaluationNotes ? `<p class="muted" style="margin:4px 0 0;font-size:13px"><strong>Evaluation:</strong> ${esc(s.evaluationNotes)}</p>` : ''}
                </div>
                <div class="item-row-actions">
                  <button class="btn btn-sm btn-danger" data-delete-stmt="${s.dbId}">DELETE</button>
                </div>
              </div>`
                  )
                  .join('')
          }
        </div>
      </div>`
      )
      .join('');

    return `
      <div class="form-grid" style="margin-top:24px;align-items:start">
        <form id="add-track-form" class="panel" style="margin-top:0">
          <div class="panel-head"><h3>Add Track</h3></div>
          <div class="field"><label>Track Number (e.g. 03)</label><input name="num" required placeholder="03"></div>
          <div class="field"><label>Track Name</label><input name="name" required placeholder="Applied AI Systems"></div>
          <div class="field"><label>Description (optional)</label><textarea name="description"></textarea></div>
          <button type="submit" class="btn btn-primary">CREATE TRACK</button>
        </form>

        <form id="add-stmt-form" class="panel" style="margin-top:0">
          <div class="panel-head"><h3>Add Problem Statement</h3></div>
          <div class="form-grid">
            <div class="field"><label>Code (e.g. PS-05)</label><input name="code" required placeholder="PS-05"></div>
            <div class="field"><label>Track</label><select name="trackId" required>${trackOptions}</select></div>
          </div>
          <div class="field"><label>Title</label><input name="title" required placeholder="Statement title"></div>
          <div class="field"><label>Full Description</label><textarea name="body" required></textarea></div>
          <div class="field"><label>Constraints (optional)</label><input name="constraints"></div>
          <div class="field"><label>Evaluation Notes (optional)</label><input name="evaluationNotes"></div>
          <button type="submit" class="btn btn-primary">CREATE STATEMENT</button>
        </form>
      </div>
      ${tracksList}`;
  }

  function renderSchedule() {
    const days = state.schedule.days;
    const dayOptions = days
      .map((d) => `<option value="${d.id}">Day ${esc(d.num)} — ${esc(d.name)}</option>`)
      .join('');

    const daysList = days
      .map(
        (d) => `
      <div class="panel">
        <div class="panel-head">
          <div>
            <span class="mono muted" style="font-size:12px">DAY ${esc(d.num)} / ${esc(d.dateLabel)}</span>
            <h3>${esc(d.name)} — ${esc(d.summary)}</h3>
          </div>
          <button class="btn btn-sm btn-danger" data-delete-day="${d.id}">DELETE DAY</button>
        </div>
        <div class="item-list">
          ${d.items
            .map(
              (item) => `
            <div class="item-row">
              <div>
                <span class="mono muted" style="font-size:13px">${esc(item.time)}</span>
                <div class="display" style="font-size:19px;font-weight:500">${esc(item.title)}</div>
                <div class="muted" style="font-size:14px">${esc(item.note)}</div>
              </div>
              <button class="btn btn-sm btn-danger" data-delete-sched-item="${item.id}">DELETE</button>
            </div>`
            )
            .join('')}
        </div>
      </div>`
      )
      .join('');

    return `
      <div class="form-grid" style="margin-top:24px;align-items:start">
        <form id="add-day-form" class="panel" style="margin-top:0">
          <div class="panel-head"><h3>Add Schedule Day</h3></div>
          <div class="form-grid">
            <div class="field"><label>Day Num</label><input name="num" required placeholder="03"></div>
            <div class="field"><label>Day Name</label><input name="name" required placeholder="Sunday"></div>
          </div>
          <div class="field"><label>Date Label</label><input name="dateLabel" required placeholder="MAR 15"></div>
          <div class="field"><label>Summary</label><input name="summary" required placeholder="Demo expo & closing"></div>
          <button type="submit" class="btn btn-primary">CREATE DAY</button>
        </form>

        <form id="add-sched-item-form" class="panel" style="margin-top:0">
          <div class="panel-head"><h3>Add Schedule Item</h3></div>
          <div class="form-grid">
            <div class="field"><label>Day</label><select name="dayId" required>${dayOptions}</select></div>
            <div class="field"><label>Time</label><input name="time" required placeholder="09:00 AM"></div>
          </div>
          <div class="field"><label>Event Title</label><input name="title" required placeholder="Opening keynote"></div>
          <div class="field"><label>Note</label><input name="note" placeholder="Main auditorium"></div>
          <button type="submit" class="btn btn-primary">ADD TIMELINE ITEM</button>
        </form>
      </div>
      ${daysList}`;
  }

  function renderResults() {
    const podiumByRank = new Map(state.results.podium.map((p) => [p.rank, p]));
    const podiumForms = [1, 2, 3]
      .map((rank) => {
        const p = podiumByRank.get(rank) || {
          place: rank === 1 ? 'FIRST PLACE' : rank === 2 ? 'SECOND PLACE' : 'THIRD PLACE',
          team: '',
          project: '',
          trackName: '',
          projectUrl: '',
          repoUrl: '',
        };
        return `
        <form class="panel podium-form" data-rank="${rank}" style="margin-top:0">
          <div class="panel-head"><h3>#${rank} — ${esc(p.place)}</h3></div>
          <div class="field"><label>Team Name</label><input name="teamName" value="${esc(p.team)}" required></div>
          <div class="field"><label>Project Title</label><input name="projectTitle" value="${esc(p.project)}" required></div>
          <div class="field"><label>Track (optional)</label><input name="trackName" value="${esc(p.trackName)}"></div>
          <div class="field"><label>Demo URL (optional)</label><input name="projectUrl" value="${esc(p.projectUrl)}" placeholder="https://..."></div>
          <div class="field"><label>Repo URL (optional)</label><input name="repoUrl" value="${esc(p.repoUrl)}" placeholder="https://github.com/..."></div>
          <button type="submit" class="btn btn-primary">SAVE RANK #${rank}</button>
        </form>`;
      })
      .join('');

    const showcaseList = state.results.showcase
      .map(
        (s) => `
      <div class="item-row">
        <div style="display:flex;gap:16px;align-items:center;flex:1;min-width:260px">
          <div style="width:120px;aspect-ratio:16/10;background:var(--surface);border:1px solid var(--line);overflow:hidden;flex:none;display:flex;align-items:center;justify-content:center">
            ${s.screenshotUrl ? `<img src="${esc(s.screenshotUrl)}" style="width:100%;height:100%;object-fit:cover">` : '<span class="mono muted" style="font-size:10px">NO IMG</span>'}
          </div>
          <div>
            <span class="mono muted" style="font-size:12px">${esc(s.label)}</span>
            <div class="display" style="font-size:20px;font-weight:500">${esc(s.title)}</div>
            <div class="muted" style="font-size:14px">${esc(s.team)}</div>
          </div>
        </div>
        <button class="btn btn-sm btn-danger" data-delete-showcase="${s.id}">DELETE</button>
      </div>`
      )
      .join('');

    return `
      <h2 class="display" style="margin:28px 0 12px;font-weight:500">Podium Winners</h2>
      <div class="form-grid">${podiumForms}</div>

      <form id="add-showcase-form" class="panel">
        <div class="panel-head"><h3>Add Project Showcase Card</h3></div>
        <div class="form-grid">
          <div class="field"><label>Label (e.g. PROJECT 04)</label><input name="label" required placeholder="PROJECT 04"></div>
          <div class="field"><label>Project Title</label><input name="title" required></div>
          <div class="field"><label>Team Name</label><input name="teamName" required></div>
          <div class="field"><label>Upload Screenshot (PNG/JPG/WEBP)</label><input type="file" id="showcase-file" accept="image/png,image/jpeg,image/webp,image/gif"></div>
        </div>
        <div class="field"><label>Screenshot URL (auto-filled after upload or paste URL)</label><input name="screenshotUrl" id="showcase-url" placeholder="/uploads/..."></div>
        <div class="field"><label>Short Description</label><textarea name="description"></textarea></div>
        <button type="submit" class="btn btn-primary">ADD SHOWCASE PROJECT</button>
      </form>

      <div class="panel">
        <div class="panel-head"><h3>Showcase Entries (${state.results.showcase.length})</h3></div>
        <div class="item-list">${showcaseList}</div>
      </div>`;
  }

  function renderBriefAndFaq() {
    const b = state.brief;
    const f = state.faqs;
    return `
      <form id="brief-header-form" class="panel">
        <div class="panel-head">
          <h3>Brief Header</h3>
          <button type="submit" class="btn btn-primary">SAVE HEADER</button>
        </div>
        <div class="field"><label>Headline</label><input name="briefHeadline" value="${esc(b.headline)}" required></div>
        <div class="field"><label>Summary</label><textarea name="briefSummary" required>${esc(b.summary)}</textarea></div>
      </form>

      <div class="form-grid" style="margin-top:24px;align-items:start">
        <form id="add-brief-form" class="panel" style="margin-top:0">
          <div class="panel-head"><h3>Add Brief Section</h3></div>
          <div class="form-grid">
            <div class="field"><label>Number</label><input name="num" required placeholder="04"></div>
            <div class="field"><label>Heading</label><input name="heading" required placeholder="Team Size"></div>
          </div>
          <div class="field"><label>Body</label><textarea name="body" required></textarea></div>
          <button type="submit" class="btn btn-primary">ADD SECTION</button>
        </form>

        <form id="add-faq-form" class="panel" style="margin-top:0">
          <div class="panel-head"><h3>Add FAQ</h3></div>
          <div class="field"><label>Category</label><input name="category" value="General" required></div>
          <div class="field"><label>Question</label><input name="question" required></div>
          <div class="field"><label>Answer</label><textarea name="answer" required></textarea></div>
          <button type="submit" class="btn btn-primary">ADD FAQ</button>
        </form>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>Brief Sections (${b.sections.length})</h3></div>
        <div class="item-list">
          ${b.sections
            .map(
              (s) => `
            <div class="item-row">
              <div style="flex:1">
                <span class="mono muted" style="font-size:12px">${esc(s.num)}</span>
                <div class="display" style="font-size:19px;font-weight:500">${esc(s.heading)}</div>
                <div class="muted" style="font-size:14px">${esc(s.body)}</div>
              </div>
              <button class="btn btn-sm btn-danger" data-delete-brief="${s.id}">DELETE</button>
            </div>`
            )
            .join('')}
        </div>
      </div>

      <div class="panel">
        <div class="panel-head"><h3>FAQs (${f.items.length})</h3></div>
        <div class="item-list">
          ${f.items
            .map(
              (item) => `
            <div class="item-row">
              <div style="flex:1">
                <span class="mono muted" style="font-size:12px">${esc(item.category.toUpperCase())}</span>
                <div class="display" style="font-size:19px;font-weight:500">${esc(item.question)}</div>
                <div class="muted" style="font-size:14px">${esc(item.answer)}</div>
              </div>
              <button class="btn btn-sm btn-danger" data-delete-faq="${item.id}">DELETE</button>
            </div>`
            )
            .join('')}
        </div>
      </div>`;
  }

  function renderAccount() {
    return `
      <form id="pw-form" class="panel" style="max-width:520px">
        <div class="panel-head"><h3>Change Admin Password</h3></div>
        <div class="field"><label>Current Password</label><input type="password" name="currentPassword" required></div>
        <div class="field"><label>New Password (min 8 chars)</label><input type="password" name="newPassword" minlength="8" required></div>
        <button type="submit" class="btn btn-primary">UPDATE PASSWORD</button>
      </form>`;
  }

  function bindTabEvents() {
    const root = document.getElementById('tab-content');

    const toggleProblemsBtn = document.getElementById('btn-toggle-problems');
    if (toggleProblemsBtn) {
      toggleProblemsBtn.addEventListener('click', async () => {
        try {
          await api('/api/admin/toggles/release-problems', {
            method: 'POST',
            body: { released: !state.config.problemsReleased },
          });
          showToast(state.config.problemsReleased ? 'Problem statements reverted to TBA' : 'Problem statements released!');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    const toggleResultsBtn = document.getElementById('btn-toggle-results');
    if (toggleResultsBtn) {
      toggleResultsBtn.addEventListener('click', async () => {
        try {
          const next = !state.config.resultsPublished;
          await api('/api/admin/toggles/publish-results', {
            method: 'POST',
            body: { published: next, resultsStatus: next ? 'PUBLISHED' : 'TO BE ANNOUNCED' },
          });
          showToast(next ? 'Results published!' : 'Results hidden');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    const toggleShowcaseBtn = document.getElementById('btn-toggle-showcase');
    if (toggleShowcaseBtn) {
      toggleShowcaseBtn.addEventListener('click', async () => {
        try {
          await api('/api/admin/config', {
            method: 'PATCH',
            body: { showShowcase: !state.config.showShowcase },
          });
          showToast('Showcase visibility updated');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    const configForm = document.getElementById('config-form');
    if (configForm) {
      configForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const body = Object.fromEntries(new FormData(configForm).entries());
          await api('/api/admin/config', { method: 'PATCH', body });
          showToast('Event settings saved');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    const addTrackForm = document.getElementById('add-track-form');
    if (addTrackForm) {
      addTrackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const body = Object.fromEntries(new FormData(addTrackForm).entries());
          await api('/api/admin/tracks', { method: 'POST', body });
          showToast('Track created');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    const addStmtForm = document.getElementById('add-stmt-form');
    if (addStmtForm) {
      addStmtForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const raw = Object.fromEntries(new FormData(addStmtForm).entries());
          raw.trackId = Number(raw.trackId);
          await api('/api/admin/statements', { method: 'POST', body: raw });
          showToast('Problem statement created');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    root.querySelectorAll('[data-rename-track]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const nextName = window.prompt('New track name:', btn.dataset.trackName);
        if (!nextName || !nextName.trim()) return;
        try {
          await api(`/api/admin/tracks/${btn.dataset.renameTrack}`, {
            method: 'PATCH',
            body: { name: nextName.trim() },
          });
          showToast('Track renamed');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    root.querySelectorAll('[data-delete-track]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Delete this track and all its statements?')) return;
        try {
          await api(`/api/admin/tracks/${btn.dataset.deleteTrack}`, { method: 'DELETE' });
          showToast('Track deleted');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    root.querySelectorAll('[data-delete-stmt]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/api/admin/statements/${btn.dataset.deleteStmt}`, { method: 'DELETE' });
          showToast('Statement deleted');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    const addDayForm = document.getElementById('add-day-form');
    if (addDayForm) {
      addDayForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const body = Object.fromEntries(new FormData(addDayForm).entries());
          await api('/api/admin/schedule/days', { method: 'POST', body });
          showToast('Schedule day created');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    const addSchedItemForm = document.getElementById('add-sched-item-form');
    if (addSchedItemForm) {
      addSchedItemForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const raw = Object.fromEntries(new FormData(addSchedItemForm).entries());
          const dayId = raw.dayId;
          delete raw.dayId;
          await api(`/api/admin/schedule/days/${dayId}/items`, { method: 'POST', body: raw });
          showToast('Schedule item added');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    root.querySelectorAll('[data-delete-day]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Delete this day and its timeline items?')) return;
        try {
          await api(`/api/admin/schedule/days/${btn.dataset.deleteDay}`, { method: 'DELETE' });
          showToast('Schedule day deleted');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    root.querySelectorAll('[data-delete-sched-item]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/api/admin/schedule/items/${btn.dataset.deleteSchedItem}`, { method: 'DELETE' });
          showToast('Schedule item deleted');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    root.querySelectorAll('.podium-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const rank = form.dataset.rank;
          const body = Object.fromEntries(new FormData(form).entries());
          await api(`/api/admin/results/podium/${rank}`, { method: 'PUT', body });
          showToast(`Podium #${rank} saved`);
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    const fileInput = document.getElementById('showcase-file');
    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        try {
          const fd = new FormData();
          fd.append('file', file);
          const uploaded = await api('/api/admin/uploads/screenshot', {
            method: 'POST',
            body: fd,
          });
          document.getElementById('showcase-url').value = uploaded.url;
          showToast('Screenshot uploaded');
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    const addShowcaseForm = document.getElementById('add-showcase-form');
    if (addShowcaseForm) {
      addShowcaseForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const body = Object.fromEntries(new FormData(addShowcaseForm).entries());
          await api('/api/admin/results/showcase', { method: 'POST', body });
          showToast('Showcase project added');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    root.querySelectorAll('[data-delete-showcase]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/api/admin/results/showcase/${btn.dataset.deleteShowcase}`, { method: 'DELETE' });
          showToast('Showcase project deleted');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    const briefHeaderForm = document.getElementById('brief-header-form');
    if (briefHeaderForm) {
      briefHeaderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const body = Object.fromEntries(new FormData(briefHeaderForm).entries());
          await api('/api/admin/config', { method: 'PATCH', body });
          showToast('Brief header saved');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    const addBriefForm = document.getElementById('add-brief-form');
    if (addBriefForm) {
      addBriefForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const body = Object.fromEntries(new FormData(addBriefForm).entries());
          await api('/api/admin/brief/sections', { method: 'POST', body });
          showToast('Brief section added');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    root.querySelectorAll('[data-delete-brief]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/api/admin/brief/sections/${btn.dataset.deleteBrief}`, { method: 'DELETE' });
          showToast('Brief section deleted');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    const addFaqForm = document.getElementById('add-faq-form');
    if (addFaqForm) {
      addFaqForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const body = Object.fromEntries(new FormData(addFaqForm).entries());
          await api('/api/admin/faqs', { method: 'POST', body });
          showToast('FAQ added');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }

    root.querySelectorAll('[data-delete-faq]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await api(`/api/admin/faqs/${btn.dataset.deleteFaq}`, { method: 'DELETE' });
          showToast('FAQ deleted');
          await loadAllData();
        } catch (err) {
          showToast(err.message, true);
        }
      });
    });

    const pwForm = document.getElementById('pw-form');
    if (pwForm) {
      pwForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          const body = Object.fromEntries(new FormData(pwForm).entries());
          await api('/api/admin/auth/change-password', { method: 'POST', body });
          pwForm.reset();
          showToast('Password updated');
        } catch (err) {
          showToast(err.message, true);
        }
      });
    }
  }

  function renderTab() {
    document.querySelectorAll('#admin-tabs [data-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === activeTab);
    });
    const container = document.getElementById('tab-content');
    if (activeTab === 'overview') container.innerHTML = renderOverview();
    else if (activeTab === 'problems') container.innerHTML = renderProblems();
    else if (activeTab === 'schedule') container.innerHTML = renderSchedule();
    else if (activeTab === 'results') container.innerHTML = renderResults();
    else if (activeTab === 'brief') container.innerHTML = renderBriefAndFaq();
    else if (activeTab === 'account') container.innerHTML = renderAccount();
    bindTabEvents();
  }

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');
    try {
      const username = document.getElementById('login-username').value.trim();
      const password = document.getElementById('login-password').value;
      const res = await api('/api/admin/auth/login', {
        method: 'POST',
        body: { username, password },
      });
      token = res.token;
      localStorage.setItem(TOKEN_KEY, token);
      document.getElementById('login-password').value = '';
      await loadAllData();
      showToast('Signed in successfully');
    } catch (err) {
      errEl.textContent = err.message;
      errEl.classList.remove('hidden');
    }
  });

  document.getElementById('btn-logout').addEventListener('click', () => {
    logout();
    showToast('Signed out');
  });

  document.querySelectorAll('#admin-tabs [data-tab]').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      renderTab();
    });
  });

  if (token) {
    loadAllData().catch(() => logout());
  }
})();
