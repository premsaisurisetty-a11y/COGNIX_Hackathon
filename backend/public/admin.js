(function () {
  const TOKEN_KEY = 'cognix_admin_token';
  const MAX_UPLOAD_BYTES = 4 * 1024 * 1024;
  localStorage.removeItem(TOKEN_KEY);
  let token = sessionStorage.getItem(TOKEN_KEY) || '';
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
    toastTimer = setTimeout(() => el.classList.add('hidden'), isError ? 5000 : 3200);
  }

  function formatApiError(data, status) {
    const base = data?.error?.message || `Request failed (${status})`;
    const details = data?.error?.details;
    if (Array.isArray(details) && details.length > 0) {
      const first = details[0];
      const field = first.path ? `${first.path}: ` : '';
      return `${field}${first.message || base}`;
    }
    return base;
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
      throw new Error(formatApiError(data, res.status));
    }
    return data;
  }

  async function withBusy(btn, busyLabel, fn) {
    if (!btn) return fn();
    const prev = btn.textContent;
    btn.disabled = true;
    btn.textContent = busyLabel;
    try {
      return await fn();
    } finally {
      btn.disabled = false;
      btn.textContent = prev;
    }
  }

  function openModal(title, html, onBind) {
    const backdrop = document.getElementById('edit-modal');
    document.getElementById('modal-title').textContent = title;
    const body = document.getElementById('modal-body');
    body.innerHTML = html;
    backdrop.classList.remove('hidden');
    if (onBind) onBind(body);
  }

  function closeModal() {
    document.getElementById('edit-modal').classList.add('hidden');
    document.getElementById('modal-body').innerHTML = '';
  }

  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('edit-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-modal') closeModal();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });

  function logout() {
    closeModal();
    token = '';
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    state.admin = null;
    const u = document.getElementById('login-username');
    const p = document.getElementById('login-password');
    if (u) u.value = '';
    if (p) p.value = '';
    document.getElementById('login-view').classList.remove('hidden');
    document.getElementById('dashboard-view').classList.add('hidden');
    document.getElementById('btn-logout').classList.add('hidden');
    document.getElementById('admin-user-label').textContent = 'Restricted Organizer Portal';
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

  async function uploadImageFile(file) {
    if (file.size > MAX_UPLOAD_BYTES) {
      throw new Error('Image must be smaller than 4 MB');
    }
    const fd = new FormData();
    fd.append('file', file);
    return api('/api/admin/uploads/screenshot', { method: 'POST', body: fd });
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
          <div class="field"><label>Chapter Label</label><input name="chapterLabel" value="${esc(c.chapterLabel)}" required></div>
          <div class="field"><label>Campus Location</label><input name="campusLocation" value="${esc(c.campusLocation)}" required></div>
          <div class="field"><label>Event Date</label><input name="eventDate" value="${esc(c.eventDate)}" required></div>
          <div class="field"><label>Venue</label><input name="venue" value="${esc(c.venue)}" required></div>
          <div class="field"><label>Release Kicker Label</label><input name="releaseLabel" value="${esc(c.releaseLabel)}" required></div>
          <div class="field"><label>Release Date Text</label><input name="releaseDateText" value="${esc(c.releaseDateText)}" required></div>
          <div class="field"><label>Results Status Badge</label><input name="resultsStatus" value="${esc(c.resultsStatus)}" required></div>
          <div class="field"><label>ACM Instagram URL</label><input name="acmInstagramUrl" value="${esc(c.acmInstagramUrl)}" placeholder="https://instagram.com/..."></div>
          <div class="field"><label>ACM LinkedIn URL</label><input name="acmLinkedinUrl" value="${esc(c.acmLinkedinUrl)}" placeholder="https://linkedin.com/company/..."></div>
          <div class="field"><label>ACM Website URL</label><input name="acmWebsiteUrl" value="${esc(c.acmWebsiteUrl)}" placeholder="https://www.acmklh.com"></div>
        </div>
        <div class="field"><label>Problem Statements Intro</label><textarea name="problemsIntro" required>${esc(c.problemsIntro)}</textarea></div>
        <div class="field"><label>Schedule Intro</label><textarea name="scheduleIntro" required>${esc(c.scheduleIntro)}</textarea></div>
        <div class="field"><label>Schedule Footer Note</label><input name="scheduleFooterNote" value="${esc(c.scheduleFooterNote)}"></div>
        <div class="field"><label>Results Intro</label><textarea name="resultsIntro" required>${esc(c.resultsIntro)}</textarea></div>
      </form>`;
  }

  function renderProblems() {
    const tracks = state.problems.tracks;
    const hasTracks = tracks.length > 0;
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
            ${t.description ? `<p class="muted" style="margin:6px 0 0;font-size:14px">${esc(t.description)}</p>` : ''}
          </div>
          <div class="item-row-actions">
            <button class="btn btn-sm" data-edit-track="${t.id}">EDIT TRACK</button>
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
                  <p class="muted" style="margin:0;font-size:14px;line-height:1.5;white-space:pre-line">${esc(s.body)}</p>
                  ${s.constraints ? `<p class="muted" style="margin:6px 0 0;font-size:13px;white-space:pre-line"><strong>Constraints:</strong> ${esc(s.constraints)}</p>` : ''}
                  ${s.evaluationNotes ? `<p class="muted" style="margin:4px 0 0;font-size:13px;white-space:pre-line"><strong>Evaluation:</strong> ${esc(s.evaluationNotes)}</p>` : ''}
                </div>
                <div class="item-row-actions">
                  <button class="btn btn-sm" data-edit-stmt="${s.dbId}">EDIT</button>
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
          ${!hasTracks ? '<p class="muted" style="margin:0 0 12px">Create a track first before adding statements.</p>' : ''}
          <div class="form-grid">
            <div class="field"><label>Code (e.g. PS-05)</label><input name="code" required placeholder="PS-05"></div>
            <div class="field"><label>Track</label><select name="trackId" required ${!hasTracks ? 'disabled' : ''}>${trackOptions}</select></div>
          </div>
          <div class="field"><label>Title</label><input name="title" required placeholder="Statement title"></div>
          <div class="field"><label>Full Description</label><textarea name="body" required></textarea></div>
          <div class="field"><label>Constraints (optional)</label><textarea name="constraints" style="min-height:64px"></textarea></div>
          <div class="field"><label>Evaluation Notes (optional)</label><textarea name="evaluationNotes" style="min-height:64px"></textarea></div>
          <button type="submit" class="btn btn-primary" ${!hasTracks ? 'disabled' : ''}>CREATE STATEMENT</button>
        </form>
      </div>
      ${tracksList}`;
  }

  function renderSchedule() {
    const days = state.schedule.days;
    const hasDays = days.length > 0;
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
          <div class="item-row-actions">
            <button class="btn btn-sm" data-edit-day="${d.id}">EDIT DAY</button>
            <button class="btn btn-sm btn-danger" data-delete-day="${d.id}">DELETE DAY</button>
          </div>
        </div>
        <div class="item-list">
          ${
            d.items.length === 0
              ? '<p class="muted">No timeline items for this day yet.</p>'
              : d.items
                  .map(
                    (item) => `
            <div class="item-row">
              <div style="flex:1;min-width:220px">
                <span class="mono muted" style="font-size:13px">${esc(item.time)}</span>
                <div class="display" style="font-size:19px;font-weight:500">${esc(item.title)}</div>
                <div class="muted" style="font-size:14px;white-space:pre-line">${esc(item.note)}</div>
              </div>
              <div class="item-row-actions">
                <button class="btn btn-sm" data-edit-sched-item="${item.id}">EDIT</button>
                <button class="btn btn-sm btn-danger" data-delete-sched-item="${item.id}">DELETE</button>
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
          ${!hasDays ? '<p class="muted" style="margin:0 0 12px">Create a schedule day first.</p>' : ''}
          <div class="form-grid">
            <div class="field"><label>Day</label><select name="dayId" required ${!hasDays ? 'disabled' : ''}>${dayOptions}</select></div>
            <div class="field"><label>Time</label><input name="time" required placeholder="09:00 AM"></div>
          </div>
          <div class="field"><label>Event Title</label><input name="title" required placeholder="Opening keynote"></div>
          <div class="field"><label>Note</label><input name="note" placeholder="Main auditorium"></div>
          <button type="submit" class="btn btn-primary" ${!hasDays ? 'disabled' : ''}>ADD TIMELINE ITEM</button>
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
            <span class="mono muted" style="font-size:12px">${esc(s.label)}${s.trackName ? ` / ${esc(s.trackName)}` : ''}</span>
            <div class="display" style="font-size:20px;font-weight:500">${esc(s.title)}</div>
            <div class="muted" style="font-size:14px">${esc(s.team)}</div>
          </div>
        </div>
        <div class="item-row-actions">
          <button class="btn btn-sm" data-edit-showcase="${s.id}">EDIT</button>
          <button class="btn btn-sm btn-danger" data-delete-showcase="${s.id}">DELETE</button>
        </div>
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
          <div class="field"><label>Track (optional)</label><input name="trackName" placeholder="Applied AI"></div>
          <div class="field"><label>Demo URL (optional)</label><input name="demoUrl" placeholder="https://..."></div>
          <div class="field"><label>Repo URL (optional)</label><input name="repoUrl" placeholder="https://github.com/..."></div>
        </div>
        <div class="form-grid">
          <div class="field"><label>Upload Screenshot (PNG/JPG/WEBP, max 4 MB)</label><input type="file" id="showcase-file" accept="image/png,image/jpeg,image/webp,image/gif"></div>
          <div class="field"><label>Screenshot URL (auto-filled after upload or paste URL)</label><input name="screenshotUrl" id="showcase-url" placeholder="/uploads/..."></div>
        </div>
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
              <div style="flex:1;min-width:220px">
                <span class="mono muted" style="font-size:12px">${esc(s.num)}</span>
                <div class="display" style="font-size:19px;font-weight:500">${esc(s.heading)}</div>
                <div class="muted" style="font-size:14px;white-space:pre-line">${esc(s.body)}</div>
              </div>
              <div class="item-row-actions">
                <button class="btn btn-sm" data-edit-brief="${s.id}">EDIT</button>
                <button class="btn btn-sm btn-danger" data-delete-brief="${s.id}">DELETE</button>
              </div>
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
              <div style="flex:1;min-width:220px">
                <span class="mono muted" style="font-size:12px">${esc(item.category.toUpperCase())}</span>
                <div class="display" style="font-size:19px;font-weight:500">${esc(item.question)}</div>
                <div class="muted" style="font-size:14px;white-space:pre-line">${esc(item.answer)}</div>
              </div>
              <div class="item-row-actions">
                <button class="btn btn-sm" data-edit-faq="${item.id}">EDIT</button>
                <button class="btn btn-sm btn-danger" data-delete-faq="${item.id}">DELETE</button>
              </div>
            </div>`
            )
            .join('')}
        </div>
      </div>`;
  }

  function renderAccount() {
    return `
      <form id="pw-form" class="panel" style="max-width:520px">
        <div class="panel-head"><h3>Change Organizer Password</h3></div>
        <div class="field"><label>Current Password</label><input type="password" name="currentPassword" autocomplete="off" required></div>
        <div class="field"><label>New Password (min 8 chars)</label><input type="password" name="newPassword" autocomplete="off" minlength="8" required></div>
        <div class="field"><label>Confirm New Password</label><input type="password" name="confirmPassword" autocomplete="off" minlength="8" required></div>
        <button type="submit" class="btn btn-primary">UPDATE PASSWORD</button>
      </form>`;
  }

  function bindTabEvents() {
    const root = document.getElementById('tab-content');

    const toggleProblemsBtn = document.getElementById('btn-toggle-problems');
    if (toggleProblemsBtn) {
      toggleProblemsBtn.addEventListener('click', () =>
        withBusy(toggleProblemsBtn, 'UPDATING...', async () => {
          try {
            const next = !state.config.problemsReleased;
            await api('/api/admin/toggles/release-problems', {
              method: 'POST',
              body: { released: next },
            });
            showToast(next ? 'Problem statements released live!' : 'Problem statements reverted to TBA');
            await loadAllData();
          } catch (err) {
            showToast(err.message, true);
          }
        })
      );
    }

    const toggleResultsBtn = document.getElementById('btn-toggle-results');
    if (toggleResultsBtn) {
      toggleResultsBtn.addEventListener('click', () =>
        withBusy(toggleResultsBtn, 'UPDATING...', async () => {
          try {
            const next = !state.config.resultsPublished;
            await api('/api/admin/toggles/publish-results', {
              method: 'POST',
              body: { published: next, resultsStatus: next ? 'PUBLISHED' : 'TO BE ANNOUNCED' },
            });
            showToast(next ? 'Results published live!' : 'Results hidden');
            await loadAllData();
          } catch (err) {
            showToast(err.message, true);
          }
        })
      );
    }

    const toggleShowcaseBtn = document.getElementById('btn-toggle-showcase');
    if (toggleShowcaseBtn) {
      toggleShowcaseBtn.addEventListener('click', () =>
        withBusy(toggleShowcaseBtn, 'UPDATING...', async () => {
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
        })
      );
    }

    const configForm = document.getElementById('config-form');
    if (configForm) {
      configForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = configForm.querySelector('button[type="submit"]');
        void withBusy(btn, 'SAVING...', async () => {
          try {
            const body = Object.fromEntries(new FormData(configForm).entries());
            await api('/api/admin/config', { method: 'PATCH', body });
            showToast('Event settings saved');
            await loadAllData();
          } catch (err) {
            showToast(err.message, true);
          }
        });
      });
    }

    const addTrackForm = document.getElementById('add-track-form');
    if (addTrackForm) {
      addTrackForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = addTrackForm.querySelector('button[type="submit"]');
        void withBusy(btn, 'CREATING...', async () => {
          try {
            const body = Object.fromEntries(new FormData(addTrackForm).entries());
            await api('/api/admin/tracks', { method: 'POST', body });
            showToast('Track created');
            await loadAllData();
          } catch (err) {
            showToast(err.message, true);
          }
        });
      });
    }

    const addStmtForm = document.getElementById('add-stmt-form');
    if (addStmtForm) {
      addStmtForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = addStmtForm.querySelector('button[type="submit"]');
        void withBusy(btn, 'CREATING...', async () => {
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
      });
    }

    // Edit Track modal
    root.querySelectorAll('[data-edit-track]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const track = state.problems.tracks.find((t) => String(t.id) === btn.dataset.editTrack);
        if (!track) return;
        openModal(
          `Edit Track ${track.num}`,
          `<form id="modal-edit-form">
            <div class="form-grid">
              <div class="field"><label>Track Number</label><input name="num" value="${esc(track.num)}" required></div>
              <div class="field"><label>Order</label><input type="number" min="0" name="sortOrder" value="${esc(track.sortOrder)}" required></div>
            </div>
            <div class="field"><label>Track Name</label><input name="name" value="${esc(track.name)}" required></div>
            <div class="field"><label>Description</label><textarea name="description">${esc(track.description)}</textarea></div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">SAVE CHANGES</button>
            </div>
          </form>`,
          (bodyEl) => {
            const form = bodyEl.querySelector('#modal-edit-form');
            form.addEventListener('submit', (e) => {
              e.preventDefault();
              const submitBtn = form.querySelector('button[type="submit"]');
              void withBusy(submitBtn, 'SAVING...', async () => {
                try {
                  const data = Object.fromEntries(new FormData(form).entries());
                  data.sortOrder = Number(data.sortOrder);
                  await api(`/api/admin/tracks/${track.id}`, { method: 'PATCH', body: data });
                  closeModal();
                  showToast('Track updated');
                  await loadAllData();
                } catch (err) {
                  showToast(err.message, true);
                }
              });
            });
          }
        );
      });
    });

    // Edit Statement modal
    root.querySelectorAll('[data-edit-stmt]').forEach((btn) => {
      btn.addEventListener('click', () => {
        let stmt = null;
        for (const t of state.problems.tracks) {
          const found = t.statements.find((s) => String(s.dbId) === btn.dataset.editStmt);
          if (found) {
            stmt = found;
            break;
          }
        }
        if (!stmt) return;
        const trackOpts = state.problems.tracks
          .map(
            (t) =>
              `<option value="${t.id}" ${t.id === stmt.trackId ? 'selected' : ''}>Track ${esc(t.num)} — ${esc(t.name)}</option>`
          )
          .join('');
        openModal(
          `Edit ${stmt.code}`,
          `<form id="modal-edit-form">
            <div class="form-grid">
              <div class="field"><label>Code</label><input name="code" value="${esc(stmt.code)}" required></div>
              <div class="field"><label>Track</label><select name="trackId" required>${trackOpts}</select></div>
              <div class="field"><label>Order</label><input type="number" min="0" name="sortOrder" value="${esc(stmt.sortOrder)}" required></div>
            </div>
            <div class="field"><label>Title</label><input name="title" value="${esc(stmt.title)}" required></div>
            <div class="field"><label>Full Description</label><textarea name="body" required>${esc(stmt.body)}</textarea></div>
            <div class="field"><label>Constraints</label><textarea name="constraints" style="min-height:64px">${esc(stmt.constraints)}</textarea></div>
            <div class="field"><label>Evaluation Notes</label><textarea name="evaluationNotes" style="min-height:64px">${esc(stmt.evaluationNotes)}</textarea></div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">SAVE CHANGES</button>
            </div>
          </form>`,
          (bodyEl) => {
            const form = bodyEl.querySelector('#modal-edit-form');
            form.addEventListener('submit', (e) => {
              e.preventDefault();
              const submitBtn = form.querySelector('button[type="submit"]');
              void withBusy(submitBtn, 'SAVING...', async () => {
                try {
                  const data = Object.fromEntries(new FormData(form).entries());
                  data.trackId = Number(data.trackId);
                  data.sortOrder = Number(data.sortOrder);
                  await api(`/api/admin/statements/${stmt.dbId}`, { method: 'PATCH', body: data });
                  closeModal();
                  showToast('Problem statement updated');
                  await loadAllData();
                } catch (err) {
                  showToast(err.message, true);
                }
              });
            });
          }
        );
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
        if (!window.confirm('Delete this problem statement?')) return;
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
      addDayForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = addDayForm.querySelector('button[type="submit"]');
        void withBusy(btn, 'CREATING...', async () => {
          try {
            const body = Object.fromEntries(new FormData(addDayForm).entries());
            await api('/api/admin/schedule/days', { method: 'POST', body });
            showToast('Schedule day created');
            await loadAllData();
          } catch (err) {
            showToast(err.message, true);
          }
        });
      });
    }

    const addSchedItemForm = document.getElementById('add-sched-item-form');
    if (addSchedItemForm) {
      addSchedItemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = addSchedItemForm.querySelector('button[type="submit"]');
        void withBusy(btn, 'ADDING...', async () => {
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
      });
    }

    // Edit Schedule Day modal
    root.querySelectorAll('[data-edit-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const day = state.schedule.days.find((d) => String(d.id) === btn.dataset.editDay);
        if (!day) return;
        openModal(
          `Edit Day ${day.num}`,
          `<form id="modal-edit-form">
            <div class="form-grid">
              <div class="field"><label>Day Num</label><input name="num" value="${esc(day.num)}" required></div>
              <div class="field"><label>Day Name</label><input name="name" value="${esc(day.name)}" required></div>
              <div class="field"><label>Date Label</label><input name="dateLabel" value="${esc(day.dateLabel)}" required></div>
              <div class="field"><label>Order</label><input type="number" min="0" name="sortOrder" value="${esc(day.sortOrder)}" required></div>
            </div>
            <div class="field"><label>Summary</label><input name="summary" value="${esc(day.summary)}" required></div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">SAVE CHANGES</button>
            </div>
          </form>`,
          (bodyEl) => {
            const form = bodyEl.querySelector('#modal-edit-form');
            form.addEventListener('submit', (e) => {
              e.preventDefault();
              const submitBtn = form.querySelector('button[type="submit"]');
              void withBusy(submitBtn, 'SAVING...', async () => {
                try {
                  const data = Object.fromEntries(new FormData(form).entries());
                  data.sortOrder = Number(data.sortOrder);
                  await api(`/api/admin/schedule/days/${day.id}`, { method: 'PATCH', body: data });
                  closeModal();
                  showToast('Schedule day updated');
                  await loadAllData();
                } catch (err) {
                  showToast(err.message, true);
                }
              });
            });
          }
        );
      });
    });

    // Edit Schedule Item modal
    root.querySelectorAll('[data-edit-sched-item]').forEach((btn) => {
      btn.addEventListener('click', () => {
        let item = null;
        for (const d of state.schedule.days) {
          const found = d.items.find((i) => String(i.id) === btn.dataset.editSchedItem);
          if (found) {
            item = found;
            break;
          }
        }
        if (!item) return;
        const dayOpts = state.schedule.days
          .map(
            (d) =>
              `<option value="${d.id}" ${d.id === item.dayId ? 'selected' : ''}>Day ${esc(d.num)} — ${esc(d.name)}</option>`
          )
          .join('');
        openModal(
          'Edit Schedule Item',
          `<form id="modal-edit-form">
            <div class="form-grid">
              <div class="field"><label>Day</label><select name="dayId" required>${dayOpts}</select></div>
              <div class="field"><label>Time</label><input name="time" value="${esc(item.time)}" required></div>
              <div class="field"><label>Order</label><input type="number" min="0" name="sortOrder" value="${esc(item.sortOrder)}" required></div>
            </div>
            <div class="field"><label>Title</label><input name="title" value="${esc(item.title)}" required></div>
            <div class="field"><label>Note</label><textarea name="note">${esc(item.note)}</textarea></div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">SAVE CHANGES</button>
            </div>
          </form>`,
          (bodyEl) => {
            const form = bodyEl.querySelector('#modal-edit-form');
            form.addEventListener('submit', (e) => {
              e.preventDefault();
              const submitBtn = form.querySelector('button[type="submit"]');
              void withBusy(submitBtn, 'SAVING...', async () => {
                try {
                  const data = Object.fromEntries(new FormData(form).entries());
                  data.dayId = Number(data.dayId);
                  data.sortOrder = Number(data.sortOrder);
                  await api(`/api/admin/schedule/items/${item.id}`, { method: 'PATCH', body: data });
                  closeModal();
                  showToast('Schedule item updated');
                  await loadAllData();
                } catch (err) {
                  showToast(err.message, true);
                }
              });
            });
          }
        );
      });
    });

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
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = form.querySelector('button[type="submit"]');
        void withBusy(btn, 'SAVING...', async () => {
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
    });

    const fileInput = document.getElementById('showcase-file');
    if (fileInput) {
      fileInput.addEventListener('change', async () => {
        const file = fileInput.files?.[0];
        if (!file) return;
        try {
          showToast('Uploading screenshot...');
          const uploaded = await uploadImageFile(file);
          document.getElementById('showcase-url').value = uploaded.url;
          showToast('Screenshot uploaded');
        } catch (err) {
          showToast(err.message, true);
          fileInput.value = '';
        }
      });
    }

    const addShowcaseForm = document.getElementById('add-showcase-form');
    if (addShowcaseForm) {
      addShowcaseForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = addShowcaseForm.querySelector('button[type="submit"]');
        void withBusy(btn, 'ADDING...', async () => {
          try {
            const body = Object.fromEntries(new FormData(addShowcaseForm).entries());
            await api('/api/admin/results/showcase', { method: 'POST', body });
            showToast('Showcase project added');
            await loadAllData();
          } catch (err) {
            showToast(err.message, true);
          }
        });
      });
    }

    // Edit Showcase modal
    root.querySelectorAll('[data-edit-showcase]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const proj = state.results.showcase.find((s) => String(s.id) === btn.dataset.editShowcase);
        if (!proj) return;
        openModal(
          `Edit ${proj.label}`,
          `<form id="modal-edit-form">
            <div class="form-grid">
              <div class="field"><label>Label</label><input name="label" value="${esc(proj.label)}" required></div>
              <div class="field"><label>Order</label><input type="number" min="0" name="sortOrder" value="${esc(proj.sortOrder)}" required></div>
              <div class="field"><label>Project Title</label><input name="title" value="${esc(proj.title)}" required></div>
              <div class="field"><label>Team Name</label><input name="teamName" value="${esc(proj.team)}" required></div>
              <div class="field"><label>Track</label><input name="trackName" value="${esc(proj.trackName)}"></div>
              <div class="field"><label>Demo URL</label><input name="demoUrl" value="${esc(proj.demoUrl)}" placeholder="https://..."></div>
              <div class="field"><label>Repo URL</label><input name="repoUrl" value="${esc(proj.repoUrl)}" placeholder="https://github.com/..."></div>
            </div>
            <div class="form-grid">
              <div class="field"><label>Upload New Screenshot (max 4 MB)</label><input type="file" id="modal-showcase-file" accept="image/png,image/jpeg,image/webp,image/gif"></div>
              <div class="field"><label>Screenshot URL</label><input name="screenshotUrl" id="modal-showcase-url" value="${esc(proj.screenshotUrl)}"></div>
            </div>
            <div class="field"><label>Description</label><textarea name="description">${esc(proj.description)}</textarea></div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">SAVE CHANGES</button>
            </div>
          </form>`,
          (bodyEl) => {
            const modalFile = bodyEl.querySelector('#modal-showcase-file');
            modalFile.addEventListener('change', async () => {
              const file = modalFile.files?.[0];
              if (!file) return;
              try {
                showToast('Uploading screenshot...');
                const uploaded = await uploadImageFile(file);
                bodyEl.querySelector('#modal-showcase-url').value = uploaded.url;
                showToast('Screenshot uploaded');
              } catch (err) {
                showToast(err.message, true);
                modalFile.value = '';
              }
            });
            const form = bodyEl.querySelector('#modal-edit-form');
            form.addEventListener('submit', (e) => {
              e.preventDefault();
              const submitBtn = form.querySelector('button[type="submit"]');
              void withBusy(submitBtn, 'SAVING...', async () => {
                try {
                  const data = Object.fromEntries(new FormData(form).entries());
                  data.sortOrder = Number(data.sortOrder);
                  await api(`/api/admin/results/showcase/${proj.id}`, { method: 'PATCH', body: data });
                  closeModal();
                  showToast('Showcase project updated');
                  await loadAllData();
                } catch (err) {
                  showToast(err.message, true);
                }
              });
            });
          }
        );
      });
    });

    root.querySelectorAll('[data-delete-showcase]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!window.confirm('Delete this showcase project?')) return;
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
      briefHeaderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = briefHeaderForm.querySelector('button[type="submit"]');
        void withBusy(btn, 'SAVING...', async () => {
          try {
            const body = Object.fromEntries(new FormData(briefHeaderForm).entries());
            await api('/api/admin/config', { method: 'PATCH', body });
            showToast('Brief header saved');
            await loadAllData();
          } catch (err) {
            showToast(err.message, true);
          }
        });
      });
    }

    const addBriefForm = document.getElementById('add-brief-form');
    if (addBriefForm) {
      addBriefForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = addBriefForm.querySelector('button[type="submit"]');
        void withBusy(btn, 'ADDING...', async () => {
          try {
            const body = Object.fromEntries(new FormData(addBriefForm).entries());
            await api('/api/admin/brief/sections', { method: 'POST', body });
            showToast('Brief section added');
            await loadAllData();
          } catch (err) {
            showToast(err.message, true);
          }
        });
      });
    }

    root.querySelectorAll('[data-edit-brief]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const sec = state.brief.sections.find((s) => String(s.id) === btn.dataset.editBrief);
        if (!sec) return;
        openModal(
          `Edit Brief Section ${sec.num}`,
          `<form id="modal-edit-form">
            <div class="form-grid">
              <div class="field"><label>Number</label><input name="num" value="${esc(sec.num)}" required></div>
              <div class="field"><label>Order</label><input type="number" min="0" name="sortOrder" value="${esc(sec.sortOrder)}" required></div>
            </div>
            <div class="field"><label>Heading</label><input name="heading" value="${esc(sec.heading)}" required></div>
            <div class="field"><label>Body</label><textarea name="body" required>${esc(sec.body)}</textarea></div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">SAVE CHANGES</button>
            </div>
          </form>`,
          (bodyEl) => {
            const form = bodyEl.querySelector('#modal-edit-form');
            form.addEventListener('submit', (e) => {
              e.preventDefault();
              const submitBtn = form.querySelector('button[type="submit"]');
              void withBusy(submitBtn, 'SAVING...', async () => {
                try {
                  const data = Object.fromEntries(new FormData(form).entries());
                  data.sortOrder = Number(data.sortOrder);
                  await api(`/api/admin/brief/sections/${sec.id}`, { method: 'PATCH', body: data });
                  closeModal();
                  showToast('Brief section updated');
                  await loadAllData();
                } catch (err) {
                  showToast(err.message, true);
                }
              });
            });
          }
        );
      });
    });

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
      addFaqForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = addFaqForm.querySelector('button[type="submit"]');
        void withBusy(btn, 'ADDING...', async () => {
          try {
            const body = Object.fromEntries(new FormData(addFaqForm).entries());
            await api('/api/admin/faqs', { method: 'POST', body });
            showToast('FAQ added');
            await loadAllData();
          } catch (err) {
            showToast(err.message, true);
          }
        });
      });
    }

    root.querySelectorAll('[data-edit-faq]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const faq = state.faqs.items.find((f) => String(f.id) === btn.dataset.editFaq);
        if (!faq) return;
        openModal(
          'Edit FAQ',
          `<form id="modal-edit-form">
            <div class="form-grid">
              <div class="field"><label>Category</label><input name="category" value="${esc(faq.category)}" required></div>
              <div class="field"><label>Order</label><input type="number" min="0" name="sortOrder" value="${esc(faq.sortOrder)}" required></div>
            </div>
            <div class="field"><label>Question</label><input name="question" value="${esc(faq.question)}" required></div>
            <div class="field"><label>Answer</label><textarea name="answer" required>${esc(faq.answer)}</textarea></div>
            <div class="modal-actions">
              <button type="submit" class="btn btn-primary">SAVE CHANGES</button>
            </div>
          </form>`,
          (bodyEl) => {
            const form = bodyEl.querySelector('#modal-edit-form');
            form.addEventListener('submit', (e) => {
              e.preventDefault();
              const submitBtn = form.querySelector('button[type="submit"]');
              void withBusy(submitBtn, 'SAVING...', async () => {
                try {
                  const data = Object.fromEntries(new FormData(form).entries());
                  data.sortOrder = Number(data.sortOrder);
                  await api(`/api/admin/faqs/${faq.id}`, { method: 'PATCH', body: data });
                  closeModal();
                  showToast('FAQ updated');
                  await loadAllData();
                } catch (err) {
                  showToast(err.message, true);
                }
              });
            });
          }
        );
      });
    });

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
      pwForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const btn = pwForm.querySelector('button[type="submit"]');
        void withBusy(btn, 'UPDATING...', async () => {
          try {
            const raw = Object.fromEntries(new FormData(pwForm).entries());
            if (raw.newPassword !== raw.confirmPassword) {
              showToast('New password and confirmation do not match', true);
              return;
            }
            await api('/api/admin/auth/change-password', {
              method: 'POST',
              body: { currentPassword: raw.currentPassword, newPassword: raw.newPassword },
            });
            pwForm.reset();
            showToast('Password updated');
          } catch (err) {
            showToast(err.message, true);
          }
        });
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

  document.getElementById('login-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');
    const btn = document.getElementById('btn-login-submit');
    void withBusy(btn, 'SIGNING IN...', async () => {
      try {
        const username = document.getElementById('login-username').value.trim();
        const password = document.getElementById('login-password').value;
        const res = await api('/api/admin/auth/login', {
          method: 'POST',
          body: { username, password },
        });
        token = res.token;
        sessionStorage.setItem(TOKEN_KEY, token);
        document.getElementById('login-username').value = '';
        document.getElementById('login-password').value = '';
        await loadAllData();
        showToast('Signed in successfully');
      } catch (err) {
        errEl.textContent = err.message;
        errEl.classList.remove('hidden');
      }
    });
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
