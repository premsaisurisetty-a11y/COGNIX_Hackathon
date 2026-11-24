import type { DbClient } from '../db/types';
import { notFound, unauthorized } from '../utils/httpError';
import { hashPassword, verifyPassword } from '../utils/password';
import type { PortalService } from './portalService';

interface AdminRow {
  id: number;
  email: string;
  name: string;
  password_hash: string;
  role: string;
  created_at: string | Date;
  updated_at: string | Date;
}

const DEFAULT_PLACES: Record<number, { place: string; num: string }> = {
  1: { place: 'FIRST PLACE', num: '01' },
  2: { place: 'SECOND PLACE', num: '02' },
  3: { place: 'THIRD PLACE', num: '03' },
};

function fmtDate(val: string | Date): string {
  return val instanceof Date ? val.toISOString() : val;
}

export class AdminService {
  constructor(
    private readonly db: DbClient,
    private readonly portalService: PortalService
  ) {}

  async authenticate(identifier: string, password: string) {
    const normalized = identifier.toLowerCase().trim();
    const admin = await this.db.queryOne<AdminRow>(
      'SELECT * FROM admins WHERE LOWER(email) = ? OR LOWER(name) = ?',
      [normalized, normalized]
    );
    if (!admin || !verifyPassword(password, admin.password_hash)) {
      throw unauthorized('Invalid credentials');
    }
    return {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
    };
  }

  async getAdminById(id: number) {
    const a = await this.db.queryOne<{
      id: number;
      email: string;
      name: string;
      role: string;
      created_at: string | Date;
      updated_at: string | Date;
    }>('SELECT id, email, name, role, created_at, updated_at FROM admins WHERE id = ?', [id]);
    if (!a) throw notFound('Admin account not found');
    return {
      id: a.id,
      email: a.email,
      name: a.name,
      role: a.role,
      createdAt: fmtDate(a.created_at),
      updatedAt: fmtDate(a.updated_at),
    };
  }

  async changePassword(adminId: number, currentPassword: string, newPassword: string) {
    const admin = await this.db.queryOne<AdminRow>('SELECT * FROM admins WHERE id = ?', [adminId]);
    if (!admin) throw notFound('Admin account not found');
    if (!verifyPassword(currentPassword, admin.password_hash)) {
      throw unauthorized('Current password is incorrect');
    }
    const newHash = hashPassword(newPassword);
    await this.db.execute(
      'UPDATE admins SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [newHash, adminId]
    );
  }

  async updateConfig(input: {
    eventName?: string;
    eventTagline?: string;
    chapterLabel?: string;
    campusLocation?: string;
    eventDate?: string;
    venue?: string;
    releaseLabel?: string;
    releaseDateText?: string;
    problemsReleased?: boolean;
    problemsIntro?: string;
    scheduleIntro?: string;
    scheduleFooterNote?: string;
    resultsStatus?: string;
    resultsPublished?: boolean;
    resultsIntro?: string;
    showShowcase?: boolean;
    briefHeadline?: string;
    briefSummary?: string;
  }) {
    const fieldMap: Array<[keyof typeof input, string, (v: unknown) => string | number]> = [
      ['eventName', 'event_name', (v) => String(v)],
      ['eventTagline', 'event_tagline', (v) => String(v)],
      ['chapterLabel', 'chapter_label', (v) => String(v)],
      ['campusLocation', 'campus_location', (v) => String(v)],
      ['eventDate', 'event_date', (v) => String(v)],
      ['venue', 'venue', (v) => String(v)],
      ['releaseLabel', 'release_label', (v) => String(v)],
      ['releaseDateText', 'release_date_text', (v) => String(v)],
      ['problemsReleased', 'problems_released', (v) => (v ? 1 : 0)],
      ['problemsIntro', 'problems_intro', (v) => String(v)],
      ['scheduleIntro', 'schedule_intro', (v) => String(v)],
      ['scheduleFooterNote', 'schedule_footer_note', (v) => String(v)],
      ['resultsStatus', 'results_status', (v) => String(v)],
      ['resultsPublished', 'results_published', (v) => (v ? 1 : 0)],
      ['resultsIntro', 'results_intro', (v) => String(v)],
      ['showShowcase', 'show_showcase', (v) => (v ? 1 : 0)],
      ['briefHeadline', 'brief_headline', (v) => String(v)],
      ['briefSummary', 'brief_summary', (v) => String(v)],
    ];

    const clauses: string[] = [];
    const params: Array<string | number> = [];

    for (const [key, column, transform] of fieldMap) {
      if (input[key] !== undefined) {
        clauses.push(`${column} = ?`);
        params.push(transform(input[key]));
      }
    }

    if (clauses.length > 0) {
      clauses.push('updated_at = CURRENT_TIMESTAMP');
      await this.db.execute(
        `UPDATE event_config SET ${clauses.join(', ')} WHERE id = 1`,
        params
      );
    }

    return this.portalService.getConfig();
  }

  async toggleReleaseProblems(released: boolean) {
    await this.db.execute(
      'UPDATE event_config SET problems_released = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
      [released ? 1 : 0]
    );
    return this.portalService.getConfig();
  }

  async togglePublishResults(input: {
    published: boolean;
    resultsStatus?: string;
    showShowcase?: boolean;
  }) {
    const status = input.resultsStatus ?? (input.published ? 'PUBLISHED' : 'TO BE ANNOUNCED');
    if (input.showShowcase !== undefined) {
      await this.db.execute(
        'UPDATE event_config SET results_published = ?, results_status = ?, show_showcase = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
        [input.published ? 1 : 0, status, input.showShowcase ? 1 : 0]
      );
    } else {
      await this.db.execute(
        'UPDATE event_config SET results_published = ?, results_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1',
        [input.published ? 1 : 0, status]
      );
    }
    return this.portalService.getConfig();
  }

  // ---- Tracks ----
  async createTrack(input: { num: string; name: string; description: string; sortOrder: number }) {
    const res = await this.db.execute(
      'INSERT INTO tracks (num, name, description, sort_order) VALUES (?, ?, ?, ?)',
      [input.num, input.name, input.description, input.sortOrder]
    );
    return this.getTrackById(res.insertId);
  }

  async getTrackById(id: number) {
    const t = await this.db.queryOne<{
      id: number;
      num: string;
      name: string;
      description: string;
      sort_order: number;
      created_at: string | Date;
      updated_at: string | Date;
    }>('SELECT * FROM tracks WHERE id = ?', [id]);
    if (!t) throw notFound('Track not found');
    return {
      id: t.id,
      num: t.num,
      name: t.name,
      description: t.description,
      sortOrder: t.sort_order,
      createdAt: fmtDate(t.created_at),
      updatedAt: fmtDate(t.updated_at),
    };
  }

  async updateTrack(
    id: number,
    input: { num?: string; name?: string; description?: string; sortOrder?: number }
  ) {
    await this.getTrackById(id);
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    if (input.num !== undefined) {
      clauses.push('num = ?');
      params.push(input.num);
    }
    if (input.name !== undefined) {
      clauses.push('name = ?');
      params.push(input.name);
    }
    if (input.description !== undefined) {
      clauses.push('description = ?');
      params.push(input.description);
    }
    if (input.sortOrder !== undefined) {
      clauses.push('sort_order = ?');
      params.push(input.sortOrder);
    }
    clauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    await this.db.execute(`UPDATE tracks SET ${clauses.join(', ')} WHERE id = ?`, params);
    return this.getTrackById(id);
  }

  async deleteTrack(id: number) {
    const res = await this.db.execute('DELETE FROM tracks WHERE id = ?', [id]);
    if (res.affectedRows === 0) throw notFound('Track not found');
  }

  // ---- Problem Statements ----
  async listStatements() {
    const rows = await this.db.query<{
      id: number;
      code: string;
      track_id: number;
      title: string;
      body: string;
      constraints_text: string;
      evaluation_notes: string;
      sort_order: number;
      created_at: string | Date;
      updated_at: string | Date;
    }>(
      'SELECT * FROM problem_statements ORDER BY track_id ASC, sort_order ASC, code ASC'
    );
    return rows.map((s) => ({
      id: s.id,
      code: s.code,
      trackId: s.track_id,
      title: s.title,
      body: s.body,
      constraints: s.constraints_text,
      evaluationNotes: s.evaluation_notes,
      sortOrder: s.sort_order,
      createdAt: fmtDate(s.created_at),
      updatedAt: fmtDate(s.updated_at),
    }));
  }

  async getStatementById(id: number) {
    const s = await this.db.queryOne<{
      id: number;
      code: string;
      track_id: number;
      title: string;
      body: string;
      constraints_text: string;
      evaluation_notes: string;
      sort_order: number;
      created_at: string | Date;
      updated_at: string | Date;
    }>('SELECT * FROM problem_statements WHERE id = ?', [id]);
    if (!s) throw notFound('Problem statement not found');
    return {
      id: s.id,
      code: s.code,
      trackId: s.track_id,
      title: s.title,
      body: s.body,
      constraints: s.constraints_text,
      evaluationNotes: s.evaluation_notes,
      sortOrder: s.sort_order,
      createdAt: fmtDate(s.created_at),
      updatedAt: fmtDate(s.updated_at),
    };
  }

  async createStatement(input: {
    code: string;
    trackId: number;
    title: string;
    body: string;
    constraints: string;
    evaluationNotes: string;
    sortOrder: number;
  }) {
    await this.getTrackById(input.trackId);
    const res = await this.db.execute(
      `INSERT INTO problem_statements
        (code, track_id, title, body, constraints_text, evaluation_notes, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.code,
        input.trackId,
        input.title,
        input.body,
        input.constraints,
        input.evaluationNotes,
        input.sortOrder,
      ]
    );
    return this.getStatementById(res.insertId);
  }

  async updateStatement(
    id: number,
    input: {
      code?: string;
      trackId?: number;
      title?: string;
      body?: string;
      constraints?: string;
      evaluationNotes?: string;
      sortOrder?: number;
    }
  ) {
    await this.getStatementById(id);
    if (input.trackId !== undefined) {
      await this.getTrackById(input.trackId);
    }
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    const pairs: Array<[keyof typeof input, string]> = [
      ['code', 'code'],
      ['trackId', 'track_id'],
      ['title', 'title'],
      ['body', 'body'],
      ['constraints', 'constraints_text'],
      ['evaluationNotes', 'evaluation_notes'],
      ['sortOrder', 'sort_order'],
    ];
    for (const [k, col] of pairs) {
      if (input[k] !== undefined) {
        clauses.push(`${col} = ?`);
        params.push(input[k] as string | number);
      }
    }
    clauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    await this.db.execute(
      `UPDATE problem_statements SET ${clauses.join(', ')} WHERE id = ?`,
      params
    );
    return this.getStatementById(id);
  }

  async deleteStatement(id: number) {
    const res = await this.db.execute('DELETE FROM problem_statements WHERE id = ?', [id]);
    if (res.affectedRows === 0) throw notFound('Problem statement not found');
  }

  // ---- Schedule Days & Items ----
  async getScheduleDayById(id: number) {
    const d = await this.db.queryOne<{
      id: number;
      num: string;
      name: string;
      date_label: string;
      summary: string;
      sort_order: number;
    }>('SELECT * FROM schedule_days WHERE id = ?', [id]);
    if (!d) throw notFound('Schedule day not found');
    return {
      id: d.id,
      num: d.num,
      name: d.name,
      dateLabel: d.date_label,
      summary: d.summary,
      sortOrder: d.sort_order,
    };
  }

  async createScheduleDay(input: {
    num: string;
    name: string;
    dateLabel: string;
    summary: string;
    sortOrder: number;
  }) {
    const res = await this.db.execute(
      'INSERT INTO schedule_days (num, name, date_label, summary, sort_order) VALUES (?, ?, ?, ?, ?)',
      [input.num, input.name, input.dateLabel, input.summary, input.sortOrder]
    );
    return this.getScheduleDayById(res.insertId);
  }

  async updateScheduleDay(
    id: number,
    input: {
      num?: string;
      name?: string;
      dateLabel?: string;
      summary?: string;
      sortOrder?: number;
    }
  ) {
    await this.getScheduleDayById(id);
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    const pairs: Array<[keyof typeof input, string]> = [
      ['num', 'num'],
      ['name', 'name'],
      ['dateLabel', 'date_label'],
      ['summary', 'summary'],
      ['sortOrder', 'sort_order'],
    ];
    for (const [k, col] of pairs) {
      if (input[k] !== undefined) {
        clauses.push(`${col} = ?`);
        params.push(input[k] as string | number);
      }
    }
    clauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    await this.db.execute(`UPDATE schedule_days SET ${clauses.join(', ')} WHERE id = ?`, params);
    return this.getScheduleDayById(id);
  }

  async deleteScheduleDay(id: number) {
    const res = await this.db.execute('DELETE FROM schedule_days WHERE id = ?', [id]);
    if (res.affectedRows === 0) throw notFound('Schedule day not found');
  }

  async getScheduleItemById(id: number) {
    const item = await this.db.queryOne<{
      id: number;
      day_id: number;
      time_label: string;
      title: string;
      note: string;
      sort_order: number;
    }>('SELECT * FROM schedule_items WHERE id = ?', [id]);
    if (!item) throw notFound('Schedule item not found');
    return {
      id: item.id,
      dayId: item.day_id,
      time: item.time_label,
      title: item.title,
      note: item.note,
      sortOrder: item.sort_order,
    };
  }

  async createScheduleItem(
    dayId: number,
    input: { time: string; title: string; note: string; sortOrder: number }
  ) {
    await this.getScheduleDayById(dayId);
    const res = await this.db.execute(
      'INSERT INTO schedule_items (day_id, time_label, title, note, sort_order) VALUES (?, ?, ?, ?, ?)',
      [dayId, input.time, input.title, input.note, input.sortOrder]
    );
    return this.getScheduleItemById(res.insertId);
  }

  async updateScheduleItem(
    id: number,
    input: { dayId?: number; time?: string; title?: string; note?: string; sortOrder?: number }
  ) {
    await this.getScheduleItemById(id);
    if (input.dayId !== undefined) {
      await this.getScheduleDayById(input.dayId);
    }
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    const pairs: Array<[keyof typeof input, string]> = [
      ['dayId', 'day_id'],
      ['time', 'time_label'],
      ['title', 'title'],
      ['note', 'note'],
      ['sortOrder', 'sort_order'],
    ];
    for (const [k, col] of pairs) {
      if (input[k] !== undefined) {
        clauses.push(`${col} = ?`);
        params.push(input[k] as string | number);
      }
    }
    clauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    await this.db.execute(`UPDATE schedule_items SET ${clauses.join(', ')} WHERE id = ?`, params);
    return this.getScheduleItemById(id);
  }

  async deleteScheduleItem(id: number) {
    const res = await this.db.execute('DELETE FROM schedule_items WHERE id = ?', [id]);
    if (res.affectedRows === 0) throw notFound('Schedule item not found');
  }

  // ---- Results: Podium & Showcase ----
  async upsertPodium(
    rank: number,
    input: {
      placeLabel?: string;
      numLabel?: string;
      teamName: string;
      projectTitle: string;
      trackName: string;
      projectUrl: string;
      repoUrl: string;
    }
  ) {
    const defaults = DEFAULT_PLACES[rank] ?? {
      place: `PLACE ${rank}`,
      num: String(rank).padStart(2, '0'),
    };
    const placeLabel = input.placeLabel ?? defaults.place;
    const numLabel = input.numLabel ?? defaults.num;

    const existing = await this.db.queryOne<{ id: number }>(
      'SELECT id FROM podium_results WHERE rank_num = ?',
      [rank]
    );

    if (existing) {
      await this.db.execute(
        `UPDATE podium_results
         SET place_label = ?, num_label = ?, team_name = ?, project_title = ?,
             track_name = ?, project_url = ?, repo_url = ?, updated_at = CURRENT_TIMESTAMP
         WHERE rank_num = ?`,
        [
          placeLabel,
          numLabel,
          input.teamName,
          input.projectTitle,
          input.trackName,
          input.projectUrl,
          input.repoUrl,
          rank,
        ]
      );
    } else {
      await this.db.execute(
        `INSERT INTO podium_results
          (rank_num, place_label, num_label, team_name, project_title, track_name, project_url, repo_url)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          rank,
          placeLabel,
          numLabel,
          input.teamName,
          input.projectTitle,
          input.trackName,
          input.projectUrl,
          input.repoUrl,
        ]
      );
    }

    const p = await this.db.queryOne<{
      id: number;
      rank_num: number;
      place_label: string;
      num_label: string;
      team_name: string;
      project_title: string;
      track_name: string;
      project_url: string;
      repo_url: string;
    }>('SELECT * FROM podium_results WHERE rank_num = ?', [rank]);

    if (!p) throw notFound('Podium rank not found');

    return {
      id: p.id,
      rank: p.rank_num,
      place: p.place_label,
      num: p.num_label,
      team: p.team_name,
      project: p.project_title,
      trackName: p.track_name,
      projectUrl: p.project_url,
      repoUrl: p.repo_url,
    };
  }

  async deletePodium(rank: number) {
    const res = await this.db.execute('DELETE FROM podium_results WHERE rank_num = ?', [rank]);
    if (res.affectedRows === 0) throw notFound('Podium rank not found');
  }

  async getShowcaseById(id: number) {
    const s = await this.db.queryOne<{
      id: number;
      label: string;
      title: string;
      team_name: string;
      description: string;
      track_name: string;
      screenshot_url: string;
      demo_url: string;
      repo_url: string;
      sort_order: number;
    }>('SELECT * FROM showcase_projects WHERE id = ?', [id]);
    if (!s) throw notFound('Showcase project not found');
    return {
      id: s.id,
      label: s.label,
      title: s.title,
      team: s.team_name,
      description: s.description,
      trackName: s.track_name,
      screenshotUrl: s.screenshot_url,
      demoUrl: s.demo_url,
      repoUrl: s.repo_url,
      sortOrder: s.sort_order,
    };
  }

  async createShowcase(input: {
    label: string;
    title: string;
    teamName: string;
    description: string;
    trackName: string;
    screenshotUrl: string;
    demoUrl: string;
    repoUrl: string;
    sortOrder: number;
  }) {
    const res = await this.db.execute(
      `INSERT INTO showcase_projects
        (label, title, team_name, description, track_name, screenshot_url, demo_url, repo_url, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.label,
        input.title,
        input.teamName,
        input.description,
        input.trackName,
        input.screenshotUrl,
        input.demoUrl,
        input.repoUrl,
        input.sortOrder,
      ]
    );
    return this.getShowcaseById(res.insertId);
  }

  async updateShowcase(
    id: number,
    input: {
      label?: string;
      title?: string;
      teamName?: string;
      description?: string;
      trackName?: string;
      screenshotUrl?: string;
      demoUrl?: string;
      repoUrl?: string;
      sortOrder?: number;
    }
  ) {
    await this.getShowcaseById(id);
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    const pairs: Array<[keyof typeof input, string]> = [
      ['label', 'label'],
      ['title', 'title'],
      ['teamName', 'team_name'],
      ['description', 'description'],
      ['trackName', 'track_name'],
      ['screenshotUrl', 'screenshot_url'],
      ['demoUrl', 'demo_url'],
      ['repoUrl', 'repo_url'],
      ['sortOrder', 'sort_order'],
    ];
    for (const [k, col] of pairs) {
      if (input[k] !== undefined) {
        clauses.push(`${col} = ?`);
        params.push(input[k] as string | number);
      }
    }
    clauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    await this.db.execute(
      `UPDATE showcase_projects SET ${clauses.join(', ')} WHERE id = ?`,
      params
    );
    return this.getShowcaseById(id);
  }

  async deleteShowcase(id: number) {
    const res = await this.db.execute('DELETE FROM showcase_projects WHERE id = ?', [id]);
    if (res.affectedRows === 0) throw notFound('Showcase project not found');
  }

  async saveUploadedFile(input: {
    filename: string;
    mimeType: string;
    size: number;
    buffer: Buffer;
  }) {
    await this.db.execute(
      'INSERT INTO uploaded_files (filename, mime_type, size_bytes, data) VALUES (?, ?, ?, ?)',
      [input.filename, input.mimeType, input.size, input.buffer]
    );
    return {
      filename: input.filename,
      url: `/uploads/${input.filename}`,
      mimeType: input.mimeType,
      size: input.size,
    };
  }

  // ---- Brief Sections ----
  async getBriefSectionById(id: number) {
    const b = await this.db.queryOne<{
      id: number;
      num: string;
      heading: string;
      body: string;
      sort_order: number;
    }>('SELECT * FROM brief_sections WHERE id = ?', [id]);
    if (!b) throw notFound('Brief section not found');
    return {
      id: b.id,
      num: b.num,
      heading: b.heading,
      body: b.body,
      sortOrder: b.sort_order,
    };
  }

  async createBriefSection(input: { num: string; heading: string; body: string; sortOrder: number }) {
    const res = await this.db.execute(
      'INSERT INTO brief_sections (num, heading, body, sort_order) VALUES (?, ?, ?, ?)',
      [input.num, input.heading, input.body, input.sortOrder]
    );
    return this.getBriefSectionById(res.insertId);
  }

  async updateBriefSection(
    id: number,
    input: { num?: string; heading?: string; body?: string; sortOrder?: number }
  ) {
    await this.getBriefSectionById(id);
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    const pairs: Array<[keyof typeof input, string]> = [
      ['num', 'num'],
      ['heading', 'heading'],
      ['body', 'body'],
      ['sortOrder', 'sort_order'],
    ];
    for (const [k, col] of pairs) {
      if (input[k] !== undefined) {
        clauses.push(`${col} = ?`);
        params.push(input[k] as string | number);
      }
    }
    clauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    await this.db.execute(`UPDATE brief_sections SET ${clauses.join(', ')} WHERE id = ?`, params);
    return this.getBriefSectionById(id);
  }

  async deleteBriefSection(id: number) {
    const res = await this.db.execute('DELETE FROM brief_sections WHERE id = ?', [id]);
    if (res.affectedRows === 0) throw notFound('Brief section not found');
  }

  // ---- FAQs ----
  async getFaqById(id: number) {
    const f = await this.db.queryOne<{
      id: number;
      question: string;
      answer: string;
      category: string;
      sort_order: number;
    }>('SELECT * FROM faqs WHERE id = ?', [id]);
    if (!f) throw notFound('FAQ not found');
    return {
      id: f.id,
      question: f.question,
      answer: f.answer,
      category: f.category,
      sortOrder: f.sort_order,
    };
  }

  async createFaq(input: { question: string; answer: string; category: string; sortOrder: number }) {
    const res = await this.db.execute(
      'INSERT INTO faqs (question, answer, category, sort_order) VALUES (?, ?, ?, ?)',
      [input.question, input.answer, input.category, input.sortOrder]
    );
    return this.getFaqById(res.insertId);
  }

  async updateFaq(
    id: number,
    input: { question?: string; answer?: string; category?: string; sortOrder?: number }
  ) {
    await this.getFaqById(id);
    const clauses: string[] = [];
    const params: Array<string | number> = [];
    const pairs: Array<[keyof typeof input, string]> = [
      ['question', 'question'],
      ['answer', 'answer'],
      ['category', 'category'],
      ['sortOrder', 'sort_order'],
    ];
    for (const [k, col] of pairs) {
      if (input[k] !== undefined) {
        clauses.push(`${col} = ?`);
        params.push(input[k] as string | number);
      }
    }
    clauses.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    await this.db.execute(`UPDATE faqs SET ${clauses.join(', ')} WHERE id = ?`, params);
    return this.getFaqById(id);
  }

  async deleteFaq(id: number) {
    const res = await this.db.execute('DELETE FROM faqs WHERE id = ?', [id]);
    if (res.affectedRows === 0) throw notFound('FAQ not found');
  }
}
