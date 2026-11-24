import type { DbClient } from '../db/types';

const PENDING_STATEMENT_BODY =
  'The full problem description, constraints and evaluation notes will be published here when statements are released on Friday.';

interface ConfigRow {
  id: number;
  event_name: string;
  event_tagline: string;
  chapter_label: string;
  campus_location: string;
  event_date: string;
  venue: string;
  release_label: string;
  release_date_text: string;
  problems_released: number;
  problems_intro: string;
  schedule_intro: string;
  schedule_footer_note: string;
  results_status: string;
  results_published: number;
  results_intro: string;
  show_showcase: number;
  brief_headline: string;
  brief_summary: string;
  updated_at: string | Date;
}

interface TrackRow {
  id: number;
  num: string;
  name: string;
  description: string;
  sort_order: number;
  created_at: string | Date;
  updated_at: string | Date;
}

interface StatementRow {
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
}

interface ScheduleDayRow {
  id: number;
  num: string;
  name: string;
  date_label: string;
  summary: string;
  sort_order: number;
}

interface ScheduleItemRow {
  id: number;
  day_id: number;
  time_label: string;
  title: string;
  note: string;
  sort_order: number;
}

interface PodiumRow {
  id: number;
  rank_num: number;
  place_label: string;
  num_label: string;
  team_name: string;
  project_title: string;
  track_name: string;
  project_url: string;
  repo_url: string;
  updated_at: string | Date;
}

interface ShowcaseRow {
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
}

interface BriefSectionRow {
  id: number;
  num: string;
  heading: string;
  body: string;
  sort_order: number;
}

interface FaqRow {
  id: number;
  question: string;
  answer: string;
  category: string;
  sort_order: number;
}

interface UploadedFileRow {
  filename: string;
  mime_type: string;
  size_bytes: number;
  data: Buffer | Uint8Array;
}

export class PortalService {
  constructor(private readonly db: DbClient) {}

  async getConfigRow(): Promise<ConfigRow> {
    const row = await this.db.queryOne<ConfigRow>('SELECT * FROM event_config WHERE id = 1');
    if (!row) {
      throw new Error('Event configuration is not initialized');
    }
    return row;
  }

  async getConfig() {
    const c = await this.getConfigRow();
    return {
      eventName: c.event_name,
      eventTagline: c.event_tagline,
      chapterLabel: c.chapter_label,
      campusLocation: c.campus_location,
      eventDate: c.event_date,
      venue: c.venue,
      releaseLabel: c.release_label,
      releaseDateText: c.release_date_text,
      problemsReleased: Boolean(c.problems_released),
      problemsIntro: c.problems_intro,
      scheduleIntro: c.schedule_intro,
      scheduleFooterNote: c.schedule_footer_note,
      resultsStatus: c.results_status,
      resultsPublished: Boolean(c.results_published),
      resultsIntro: c.results_intro,
      showShowcase: Boolean(c.show_showcase),
      briefHeadline: c.brief_headline,
      briefSummary: c.brief_summary,
      updatedAt: c.updated_at instanceof Date ? c.updated_at.toISOString() : c.updated_at,
    };
  }

  async getProblems(options: { trackFilter?: string; includeUnpublished?: boolean } = {}) {
    const [config, trackRows, stmtRows] = await Promise.all([
      this.getConfigRow(),
      this.db.query<TrackRow>('SELECT * FROM tracks ORDER BY sort_order ASC, num ASC, id ASC'),
      this.db.query<StatementRow>(
        'SELECT * FROM problem_statements ORDER BY sort_order ASC, code ASC, id ASC'
      ),
    ]);

    const released = Boolean(config.problems_released);
    const unmask = Boolean(options.includeUnpublished) || released;

    const byTrack = new Map<number, StatementRow[]>();
    for (const s of stmtRows) {
      const list = byTrack.get(s.track_id) ?? [];
      list.push(s);
      byTrack.set(s.track_id, list);
    }

    const allTracks = trackRows.map((t) => {
      const stmts = (byTrack.get(t.id) ?? []).map((s) => ({
        dbId: s.id,
        id: s.code,
        code: s.code,
        trackId: s.track_id,
        title: unmask ? s.title : 'Statement title to be announced',
        body: unmask ? s.body : PENDING_STATEMENT_BODY,
        constraints: unmask ? s.constraints_text : '',
        evaluationNotes: unmask ? s.evaluation_notes : '',
        sortOrder: s.sort_order,
      }));
      const countLabel =
        String(stmts.length).padStart(2, '0') + (stmts.length === 1 ? ' STATEMENT' : ' STATEMENTS');
      return {
        id: t.id,
        num: t.num,
        name: unmask ? t.name : 'Track name to be announced',
        description: unmask ? t.description : '',
        sortOrder: t.sort_order,
        countLabel,
        statements: stmts,
      };
    });

    const filter = options.trackFilter?.trim();
    const visibleTracks =
      filter && filter.toLowerCase() !== 'all'
        ? allTracks.filter((t) => t.num === filter)
        : allTracks;

    const chips = [
      { key: 'all', label: 'ALL TRACKS' },
      ...allTracks.map((t) => ({ key: t.num, label: `TRACK ${t.num}` })),
    ];

    return {
      released,
      pending: !released,
      releaseLabel: config.release_label,
      releaseDateText: config.release_date_text,
      intro: config.problems_intro,
      trackSummary: released
        ? `${allTracks.length} ${allTracks.length === 1 ? 'track' : 'tracks'}`
        : 'To be announced',
      chips,
      tracks: visibleTracks,
    };
  }

  async getSchedule() {
    const [config, dayRows, itemRows] = await Promise.all([
      this.getConfigRow(),
      this.db.query<ScheduleDayRow>(
        'SELECT * FROM schedule_days ORDER BY sort_order ASC, num ASC, id ASC'
      ),
      this.db.query<ScheduleItemRow>(
        'SELECT * FROM schedule_items ORDER BY sort_order ASC, id ASC'
      ),
    ]);

    const byDay = new Map<number, ScheduleItemRow[]>();
    for (const item of itemRows) {
      const list = byDay.get(item.day_id) ?? [];
      list.push(item);
      byDay.set(item.day_id, list);
    }

    const days = dayRows.map((d) => ({
      id: d.id,
      num: d.num,
      name: d.name,
      dateLabel: d.date_label,
      summary: d.summary,
      sortOrder: d.sort_order,
      items: (byDay.get(d.id) ?? []).map((item) => ({
        id: item.id,
        dayId: item.day_id,
        time: item.time_label,
        title: item.title,
        note: item.note,
        sortOrder: item.sort_order,
      })),
    }));

    return {
      date: config.event_date,
      venue: config.venue,
      intro: config.schedule_intro,
      footerNote: config.schedule_footer_note,
      days,
    };
  }

  async getResults(options: { includeUnpublished?: boolean } = {}) {
    const [config, podiumRows, showcaseRows] = await Promise.all([
      this.getConfigRow(),
      this.db.query<PodiumRow>('SELECT * FROM podium_results ORDER BY rank_num ASC'),
      this.db.query<ShowcaseRow>('SELECT * FROM showcase_projects ORDER BY sort_order ASC, id ASC'),
    ]);

    const published = Boolean(config.results_published);
    const unmask = Boolean(options.includeUnpublished) || published;

    const podium = podiumRows.map((p) => ({
      id: p.id,
      rank: p.rank_num,
      place: p.place_label,
      num: p.num_label,
      team: unmask ? p.team_name : 'To be announced',
      project: unmask ? p.project_title : 'Project title to be announced',
      trackName: unmask ? p.track_name : '',
      projectUrl: unmask ? p.project_url : '',
      repoUrl: unmask ? p.repo_url : '',
    }));

    const showcase = showcaseRows.map((s) => ({
      id: s.id,
      label: s.label,
      title: unmask ? s.title : 'Project title to be announced',
      team: unmask ? s.team_name : 'Team name to be announced',
      description: unmask ? s.description : '',
      trackName: unmask ? s.track_name : '',
      screenshotUrl: unmask ? s.screenshot_url : '',
      demoUrl: unmask ? s.demo_url : '',
      repoUrl: unmask ? s.repo_url : '',
      sortOrder: s.sort_order,
    }));

    return {
      published,
      resultsStatus: config.results_status,
      intro: config.results_intro,
      podium,
      showShowcase: Boolean(config.show_showcase),
      showcase,
    };
  }

  async getBrief() {
    const [config, sectionRows] = await Promise.all([
      this.getConfigRow(),
      this.db.query<BriefSectionRow>(
        'SELECT * FROM brief_sections ORDER BY sort_order ASC, num ASC, id ASC'
      ),
    ]);

    return {
      eventName: config.event_name,
      chapterLabel: config.chapter_label,
      campusLocation: config.campus_location,
      eventDate: config.event_date,
      venue: config.venue,
      releaseDateText: config.release_date_text,
      headline: config.brief_headline,
      summary: config.brief_summary,
      sections: sectionRows.map((s) => ({
        id: s.id,
        num: s.num,
        heading: s.heading,
        body: s.body,
        sortOrder: s.sort_order,
      })),
    };
  }

  async getFaqs(category?: string) {
    const rows = await this.db.query<FaqRow>(
      'SELECT * FROM faqs ORDER BY sort_order ASC, id ASC'
    );
    const categories = Array.from(new Set(rows.map((r) => r.category)));
    const filtered =
      category && category.toLowerCase() !== 'all'
        ? rows.filter((r) => r.category.toLowerCase() === category.toLowerCase())
        : rows;

    return {
      categories,
      items: filtered.map((f) => ({
        id: f.id,
        question: f.question,
        answer: f.answer,
        category: f.category,
        sortOrder: f.sort_order,
      })),
    };
  }

  async getFullPortal() {
    const [config, brief, problems, schedule, results, faqs] = await Promise.all([
      this.getConfig(),
      this.getBrief(),
      this.getProblems(),
      this.getSchedule(),
      this.getResults(),
      this.getFaqs(),
    ]);
    return { config, brief, problems, schedule, results, faqs };
  }

  async getUploadedFile(filename: string) {
    const row = await this.db.queryOne<UploadedFileRow>(
      'SELECT filename, mime_type, size_bytes, data FROM uploaded_files WHERE filename = ?',
      [filename]
    );
    if (!row) return null;
    return {
      filename: row.filename,
      mimeType: row.mime_type,
      size: row.size_bytes,
      data: Buffer.isBuffer(row.data) ? row.data : Buffer.from(row.data),
    };
  }
}
