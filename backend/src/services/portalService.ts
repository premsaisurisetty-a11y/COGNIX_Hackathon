import type { DataStore, StatementDoc } from '../db/types';

const PENDING_STATEMENT_BODY =
  'The full problem description, constraints and evaluation notes will be published here when statements are released on Friday.';

export class PortalService {
  constructor(private readonly store: DataStore) {}

  async getConfig() {
    return this.store.getConfig();
  }

  async getProblems(options: { trackFilter?: string; includeUnpublished?: boolean } = {}) {
    const [config, trackRows, stmtRows] = await Promise.all([
      this.store.getConfig(),
      this.store.listTracks(),
      this.store.listStatements(),
    ]);

    const released = config.problemsReleased;
    const unmask = Boolean(options.includeUnpublished) || released;

    const byTrack = new Map<number, StatementDoc[]>();
    for (const s of stmtRows) {
      const list = byTrack.get(s.trackId) ?? [];
      list.push(s);
      byTrack.set(s.trackId, list);
    }

    const allTracks = trackRows.map((t) => {
      const stmts = (byTrack.get(t.id) ?? []).map((s) => ({
        dbId: s.id,
        id: s.code,
        code: s.code,
        trackId: s.trackId,
        title: unmask ? s.title : 'Statement title to be announced',
        body: unmask ? s.body : PENDING_STATEMENT_BODY,
        constraints: unmask ? s.constraints : '',
        evaluationNotes: unmask ? s.evaluationNotes : '',
        sortOrder: s.sortOrder,
      }));
      const countLabel =
        String(stmts.length).padStart(2, '0') + (stmts.length === 1 ? ' STATEMENT' : ' STATEMENTS');
      return {
        id: t.id,
        num: t.num,
        name: unmask ? t.name : 'Track name to be announced',
        description: unmask ? t.description : '',
        sortOrder: t.sortOrder,
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
      releaseLabel: config.releaseLabel,
      releaseDateText: config.releaseDateText,
      intro: config.problemsIntro,
      trackSummary: released
        ? `${allTracks.length} ${allTracks.length === 1 ? 'track' : 'tracks'}`
        : 'To be announced',
      chips,
      tracks: visibleTracks,
    };
  }

  async getSchedule() {
    const [config, dayRows, itemRows] = await Promise.all([
      this.store.getConfig(),
      this.store.listScheduleDays(),
      this.store.listScheduleItems(),
    ]);

    const byDay = new Map<number, typeof itemRows>();
    for (const item of itemRows) {
      const list = byDay.get(item.dayId) ?? [];
      list.push(item);
      byDay.set(item.dayId, list);
    }

    const days = dayRows.map((d) => ({
      id: d.id,
      num: d.num,
      name: d.name,
      dateLabel: d.dateLabel,
      summary: d.summary,
      sortOrder: d.sortOrder,
      items: (byDay.get(d.id) ?? []).map((item) => ({
        id: item.id,
        dayId: item.dayId,
        time: item.time,
        title: item.title,
        note: item.note,
        sortOrder: item.sortOrder,
      })),
    }));

    return {
      date: config.eventDate,
      venue: config.venue,
      intro: config.scheduleIntro,
      footerNote: config.scheduleFooterNote,
      days,
    };
  }

  async getResults(options: { includeUnpublished?: boolean } = {}) {
    const [config, podiumRows, showcaseRows] = await Promise.all([
      this.store.getConfig(),
      this.store.listPodium(),
      this.store.listShowcase(),
    ]);

    const published = config.resultsPublished;
    const unmask = Boolean(options.includeUnpublished) || published;

    const podium = podiumRows.map((p) => ({
      id: p.id,
      rank: p.rank,
      place: p.place,
      num: p.num,
      team: unmask ? p.team : 'To be announced',
      project: unmask ? p.project : 'Project title to be announced',
      trackName: unmask ? p.trackName : '',
      projectUrl: unmask ? p.projectUrl : '',
      repoUrl: unmask ? p.repoUrl : '',
    }));

    const showcase = showcaseRows.map((s) => ({
      id: s.id,
      label: s.label,
      title: unmask ? s.title : 'Project title to be announced',
      team: unmask ? s.team : 'Team name to be announced',
      description: unmask ? s.description : '',
      trackName: unmask ? s.trackName : '',
      screenshotUrl: unmask ? s.screenshotUrl : '',
      demoUrl: unmask ? s.demoUrl : '',
      repoUrl: unmask ? s.repoUrl : '',
      sortOrder: s.sortOrder,
    }));

    return {
      published,
      resultsStatus: config.resultsStatus,
      intro: config.resultsIntro,
      podium,
      showShowcase: config.showShowcase,
      showcase,
    };
  }

  async getBrief() {
    const [config, sections] = await Promise.all([
      this.store.getConfig(),
      this.store.listBriefSections(),
    ]);

    return {
      eventName: config.eventName,
      chapterLabel: config.chapterLabel,
      campusLocation: config.campusLocation,
      eventDate: config.eventDate,
      venue: config.venue,
      releaseDateText: config.releaseDateText,
      headline: config.briefHeadline,
      summary: config.briefSummary,
      sections: sections.map((s) => ({
        id: s.id,
        num: s.num,
        heading: s.heading,
        body: s.body,
        sortOrder: s.sortOrder,
      })),
    };
  }

  async getFaqs(category?: string) {
    const rows = await this.store.listFaqs();
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
        sortOrder: f.sortOrder,
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
    return this.store.getUploadedFile(filename);
  }
}
