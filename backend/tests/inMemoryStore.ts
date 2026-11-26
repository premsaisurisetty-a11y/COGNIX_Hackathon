import type {
  AdminDoc,
  BriefSectionDoc,
  DataStore,
  EventConfigDoc,
  FaqDoc,
  PodiumDoc,
  ScheduleDayDoc,
  ScheduleItemDoc,
  SeedOptions,
  ShowcaseDoc,
  StatementDoc,
  TrackDoc,
  UploadedFileDoc,
} from '../src/db/types';
import { conflict } from '../src/utils/httpError';
import { hashPassword } from '../src/utils/password';

function nowIso(): string {
  return new Date().toISOString();
}

export class InMemoryStore implements DataStore {
  private seq = new Map<string, number>();
  private config: EventConfigDoc | null = null;
  private tracks: TrackDoc[] = [];
  private statements: StatementDoc[] = [];
  private days: ScheduleDayDoc[] = [];
  private items: ScheduleItemDoc[] = [];
  private podium: PodiumDoc[] = [];
  private showcase: ShowcaseDoc[] = [];
  private briefSections: BriefSectionDoc[] = [];
  private faqs: FaqDoc[] = [];
  private admins: AdminDoc[] = [];
  private files = new Map<string, UploadedFileDoc>();

  private nextId(name: string): number {
    const val = (this.seq.get(name) ?? 0) + 1;
    this.seq.set(name, val);
    return val;
  }

  async init(): Promise<void> {}
  async close(): Promise<void> {}

  async seedDefaultsIfEmpty(options: SeedOptions): Promise<void> {
    if (!this.config) {
      this.config = {
        eventName: 'COGNIX ’26',
        eventTagline: 'COGNIX ’26 — WORKING EVENT NAME',
        chapterLabel: 'STUDENT CHAPTER',
        campusLocation: 'Bachupally, Hyderabad',
        eventDate: 'To be announced',
        venue: 'Venue to be announced',
        releaseLabel: 'RELEASED FRIDAY',
        releaseDateText: 'Friday, date to be announced',
        problemsReleased: false,
        problemsIntro:
          'Statements are grouped by track. Pick one and build an intelligent full-stack application around it.',
        scheduleIntro: 'Problem statements go out on Friday. The hackathon runs on Saturday.',
        scheduleFooterNote:
          'TIMINGS TO BE CONFIRMED. THIS PAGE WILL BE UPDATED AS THE SCHEDULE IS FINALISED.',
        resultsStatus: 'TO BE ANNOUNCED',
        resultsPublished: false,
        resultsIntro: 'Winning teams are announced at the close of the Saturday hackathon.',
        showShowcase: true,
        briefHeadline: 'Build an intelligent full-stack application in one weekend.',
        briefSummary:
          'Hosted by ACM KLH Student Chapter, Bachupally, Hyderabad. Problem statements are released on Friday and teams build, submit, and demo on Saturday.',
        acmInstagramUrl: '',
        acmLinkedinUrl: '',
        acmWebsiteUrl: 'https://www.acmklh.com',
        updatedAt: nowIso(),
      };
    }

    if (this.tracks.length === 0) {
      const body =
        'The full problem description, constraints and evaluation notes will be published here when statements are released on Friday.';
      const t1 = await this.createTrack({ num: '01', name: 'Track name to be announced', description: '', sortOrder: 1 });
      await this.createStatement({ code: 'PS-01', trackId: t1.id, title: 'Statement title to be announced', body, constraints: '', evaluationNotes: '', sortOrder: 1 });
      await this.createStatement({ code: 'PS-02', trackId: t1.id, title: 'Statement title to be announced', body, constraints: '', evaluationNotes: '', sortOrder: 2 });
      const t2 = await this.createTrack({ num: '02', name: 'Track name to be announced', description: '', sortOrder: 2 });
      await this.createStatement({ code: 'PS-03', trackId: t2.id, title: 'Statement title to be announced', body, constraints: '', evaluationNotes: '', sortOrder: 1 });
      await this.createStatement({ code: 'PS-04', trackId: t2.id, title: 'Statement title to be announced', body, constraints: '', evaluationNotes: '', sortOrder: 2 });
    }

    if (this.days.length === 0) {
      const d1 = await this.createScheduleDay({ num: '01', name: 'Friday', dateLabel: 'DATE TBA', summary: 'Problem statements released.', sortOrder: 1 });
      await this.createScheduleItem(d1.id, { time: 'TBA', title: 'Problem statement release', note: 'All tracks and statements published on the Problem statements page.', sortOrder: 1 });
      const d2 = await this.createScheduleDay({ num: '02', name: 'Saturday', dateLabel: 'DATE TBA', summary: 'The hackathon.', sortOrder: 2 });
      await this.createScheduleItem(d2.id, { time: 'TBA', title: 'Hacking begins', note: 'Further details to be announced.', sortOrder: 1 });
      await this.createScheduleItem(d2.id, { time: 'TBA', title: 'Submissions close', note: 'Further details to be announced.', sortOrder: 2 });
      await this.createScheduleItem(d2.id, { time: 'TBA', title: 'Results announced', note: 'Winners published on the Results page.', sortOrder: 3 });
    }

    if (this.podium.length === 0) {
      for (const [rank, place, num] of [[1, 'FIRST PLACE', '01'], [2, 'SECOND PLACE', '02'], [3, 'THIRD PLACE', '03']] as const) {
        await this.upsertPodium(rank, { place, num, team: 'To be announced', project: 'Project title to be announced', trackName: '', projectUrl: '', repoUrl: '' });
      }
    }

    if (this.showcase.length === 0) {
      for (const idx of [1, 2, 3]) {
        await this.createShowcase({ label: `PROJECT 0${idx}`, title: 'Project title to be announced', team: 'Team name to be announced', description: '', trackName: '', screenshotUrl: '', demoUrl: '', repoUrl: '', sortOrder: idx });
      }
    }

    if (this.briefSections.length === 0) {
      await this.createBriefSection({ num: '01', heading: 'Format', body: 'Format details', sortOrder: 1 });
      await this.createBriefSection({ num: '02', heading: 'Deliverables', body: 'Deliverables details', sortOrder: 2 });
      await this.createBriefSection({ num: '03', heading: 'Evaluation', body: 'Evaluation details', sortOrder: 3 });
    }

    if (this.faqs.length === 0) {
      await this.createFaq({ question: 'When are statements released?', answer: 'Friday.', category: 'General', sortOrder: 1 });
      await this.createFaq({ question: 'When is the hackathon?', answer: 'Saturday.', category: 'Schedule', sortOrder: 2 });
      await this.createFaq({ question: 'Where are results published?', answer: 'Results page.', category: 'Results', sortOrder: 3 });
    }

    if (this.admins.length === 0) {
      const now = nowIso();
      this.admins.push({
        id: this.nextId('admins'),
        email: options.adminEmail.toLowerCase(),
        name: options.adminName,
        passwordHash: hashPassword(options.adminPassword),
        role: 'admin',
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  async syncAdminCredentials(options: SeedOptions): Promise<void> {
    const admin = this.admins.find((a) => a.email === options.adminEmail.toLowerCase());
    if (admin) {
      admin.name = options.adminName;
      admin.passwordHash = hashPassword(options.adminPassword);
      admin.updatedAt = nowIso();
    }
  }

  async getConfig(): Promise<EventConfigDoc> {
    if (!this.config) throw new Error('Config not initialized');
    return { ...this.config };
  }

  async updateConfig(patch: Partial<Omit<EventConfigDoc, 'updatedAt'>>): Promise<EventConfigDoc> {
    if (!this.config) throw new Error('Config not initialized');
    this.config = { ...this.config, ...patch, updatedAt: nowIso() };
    return { ...this.config };
  }

  async listTracks(): Promise<TrackDoc[]> {
    return [...this.tracks].sort((a, b) => a.sortOrder - b.sortOrder || a.num.localeCompare(b.num) || a.id - b.id);
  }

  async getTrackById(id: number): Promise<TrackDoc | null> {
    return this.tracks.find((t) => t.id === id) ?? null;
  }

  async createTrack(input: { num: string; name: string; description: string; sortOrder?: number }): Promise<TrackDoc> {
    if (this.tracks.some((t) => t.num === input.num)) throw conflict('Track number already exists');
    const sortOrder = input.sortOrder ?? (this.tracks.reduce((m, t) => Math.max(m, t.sortOrder), 0) + 1);
    const now = nowIso();
    const doc: TrackDoc = { id: this.nextId('tracks'), ...input, sortOrder, createdAt: now, updatedAt: now };
    this.tracks.push(doc);
    return { ...doc };
  }

  async updateTrack(id: number, patch: Partial<{ num: string; name: string; description: string; sortOrder: number }>): Promise<TrackDoc | null> {
    const t = this.tracks.find((x) => x.id === id);
    if (!t) return null;
    Object.assign(t, patch, { updatedAt: nowIso() });
    return { ...t };
  }

  async deleteTrack(id: number): Promise<boolean> {
    const idx = this.tracks.findIndex((t) => t.id === id);
    if (idx === -1) return false;
    this.tracks.splice(idx, 1);
    this.statements = this.statements.filter((s) => s.trackId !== id);
    return true;
  }

  async listStatements(): Promise<StatementDoc[]> {
    return [...this.statements].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code) || a.id - b.id);
  }

  async getStatementById(id: number): Promise<StatementDoc | null> {
    return this.statements.find((s) => s.id === id) ?? null;
  }

  async createStatement(input: { code: string; trackId: number; title: string; body: string; constraints: string; evaluationNotes: string; sortOrder?: number }): Promise<StatementDoc> {
    if (this.statements.some((s) => s.code === input.code)) throw conflict('Statement code already exists');
    const sameTrack = this.statements.filter((s) => s.trackId === input.trackId);
    const sortOrder = input.sortOrder ?? (sameTrack.reduce((m, s) => Math.max(m, s.sortOrder), 0) + 1);
    const now = nowIso();
    const doc: StatementDoc = { id: this.nextId('statements'), ...input, sortOrder, createdAt: now, updatedAt: now };
    this.statements.push(doc);
    return { ...doc };
  }

  async updateStatement(id: number, patch: Partial<{ code: string; trackId: number; title: string; body: string; constraints: string; evaluationNotes: string; sortOrder: number }>): Promise<StatementDoc | null> {
    const s = this.statements.find((x) => x.id === id);
    if (!s) return null;
    Object.assign(s, patch, { updatedAt: nowIso() });
    return { ...s };
  }

  async deleteStatement(id: number): Promise<boolean> {
    const idx = this.statements.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.statements.splice(idx, 1);
    return true;
  }

  async listScheduleDays(): Promise<ScheduleDayDoc[]> {
    return [...this.days].sort((a, b) => a.sortOrder - b.sortOrder || a.num.localeCompare(b.num) || a.id - b.id);
  }

  async getScheduleDayById(id: number): Promise<ScheduleDayDoc | null> {
    return this.days.find((d) => d.id === id) ?? null;
  }

  async createScheduleDay(input: { num: string; name: string; dateLabel: string; summary: string; sortOrder?: number }): Promise<ScheduleDayDoc> {
    const sortOrder = input.sortOrder ?? (this.days.reduce((m, d) => Math.max(m, d.sortOrder), 0) + 1);
    const now = nowIso();
    const doc: ScheduleDayDoc = { id: this.nextId('days'), ...input, sortOrder, createdAt: now, updatedAt: now };
    this.days.push(doc);
    return { ...doc };
  }

  async updateScheduleDay(id: number, patch: Partial<{ num: string; name: string; dateLabel: string; summary: string; sortOrder: number }>): Promise<ScheduleDayDoc | null> {
    const d = this.days.find((x) => x.id === id);
    if (!d) return null;
    Object.assign(d, patch, { updatedAt: nowIso() });
    return { ...d };
  }

  async deleteScheduleDay(id: number): Promise<boolean> {
    const idx = this.days.findIndex((d) => d.id === id);
    if (idx === -1) return false;
    this.days.splice(idx, 1);
    this.items = this.items.filter((i) => i.dayId !== id);
    return true;
  }

  async listScheduleItems(): Promise<ScheduleItemDoc[]> {
    return [...this.items].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }

  async getScheduleItemById(id: number): Promise<ScheduleItemDoc | null> {
    return this.items.find((i) => i.id === id) ?? null;
  }

  async createScheduleItem(dayId: number, input: { time: string; title: string; note: string; sortOrder?: number }): Promise<ScheduleItemDoc> {
    const sameDay = this.items.filter((i) => i.dayId === dayId);
    const sortOrder = input.sortOrder ?? (sameDay.reduce((m, i) => Math.max(m, i.sortOrder), 0) + 1);
    const now = nowIso();
    const doc: ScheduleItemDoc = { id: this.nextId('items'), dayId, ...input, sortOrder, createdAt: now, updatedAt: now };
    this.items.push(doc);
    return { ...doc };
  }

  async updateScheduleItem(id: number, patch: Partial<{ dayId: number; time: string; title: string; note: string; sortOrder: number }>): Promise<ScheduleItemDoc | null> {
    const item = this.items.find((x) => x.id === id);
    if (!item) return null;
    Object.assign(item, patch, { updatedAt: nowIso() });
    return { ...item };
  }

  async deleteScheduleItem(id: number): Promise<boolean> {
    const idx = this.items.findIndex((i) => i.id === id);
    if (idx === -1) return false;
    this.items.splice(idx, 1);
    return true;
  }

  async listPodium(): Promise<PodiumDoc[]> {
    return [...this.podium].sort((a, b) => a.rank - b.rank);
  }

  async upsertPodium(rank: number, input: { place: string; num: string; team: string; project: string; trackName: string; projectUrl: string; repoUrl: string }): Promise<PodiumDoc> {
    const existing = this.podium.find((p) => p.rank === rank);
    if (existing) {
      Object.assign(existing, input, { updatedAt: nowIso() });
      return { ...existing };
    }
    const doc: PodiumDoc = { id: this.nextId('podium'), rank, ...input, updatedAt: nowIso() };
    this.podium.push(doc);
    return { ...doc };
  }

  async deletePodium(rank: number): Promise<boolean> {
    const idx = this.podium.findIndex((p) => p.rank === rank);
    if (idx === -1) return false;
    this.podium.splice(idx, 1);
    return true;
  }

  async listShowcase(): Promise<ShowcaseDoc[]> {
    return [...this.showcase].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }

  async getShowcaseById(id: number): Promise<ShowcaseDoc | null> {
    return this.showcase.find((s) => s.id === id) ?? null;
  }

  async createShowcase(input: { label: string; title: string; team: string; description: string; trackName: string; screenshotUrl: string; demoUrl: string; repoUrl: string; sortOrder?: number }): Promise<ShowcaseDoc> {
    const sortOrder = input.sortOrder ?? (this.showcase.reduce((m, s) => Math.max(m, s.sortOrder), 0) + 1);
    const now = nowIso();
    const doc: ShowcaseDoc = { id: this.nextId('showcase'), ...input, sortOrder, createdAt: now, updatedAt: now };
    this.showcase.push(doc);
    return { ...doc };
  }

  async updateShowcase(id: number, patch: Partial<{ label: string; title: string; team: string; description: string; trackName: string; screenshotUrl: string; demoUrl: string; repoUrl: string; sortOrder: number }>): Promise<ShowcaseDoc | null> {
    const s = this.showcase.find((x) => x.id === id);
    if (!s) return null;
    Object.assign(s, patch, { updatedAt: nowIso() });
    return { ...s };
  }

  async deleteShowcase(id: number): Promise<boolean> {
    const idx = this.showcase.findIndex((s) => s.id === id);
    if (idx === -1) return false;
    this.showcase.splice(idx, 1);
    return true;
  }

  async listBriefSections(): Promise<BriefSectionDoc[]> {
    return [...this.briefSections].sort((a, b) => a.sortOrder - b.sortOrder || a.num.localeCompare(b.num) || a.id - b.id);
  }

  async getBriefSectionById(id: number): Promise<BriefSectionDoc | null> {
    return this.briefSections.find((b) => b.id === id) ?? null;
  }

  async createBriefSection(input: { num: string; heading: string; body: string; sortOrder?: number }): Promise<BriefSectionDoc> {
    const sortOrder = input.sortOrder ?? (this.briefSections.reduce((m, b) => Math.max(m, b.sortOrder), 0) + 1);
    const now = nowIso();
    const doc: BriefSectionDoc = { id: this.nextId('brief'), ...input, sortOrder, createdAt: now, updatedAt: now };
    this.briefSections.push(doc);
    return { ...doc };
  }

  async updateBriefSection(id: number, patch: Partial<{ num: string; heading: string; body: string; sortOrder: number }>): Promise<BriefSectionDoc | null> {
    const b = this.briefSections.find((x) => x.id === id);
    if (!b) return null;
    Object.assign(b, patch, { updatedAt: nowIso() });
    return { ...b };
  }

  async deleteBriefSection(id: number): Promise<boolean> {
    const idx = this.briefSections.findIndex((b) => b.id === id);
    if (idx === -1) return false;
    this.briefSections.splice(idx, 1);
    return true;
  }

  async listFaqs(): Promise<FaqDoc[]> {
    return [...this.faqs].sort((a, b) => a.sortOrder - b.sortOrder || a.id - b.id);
  }

  async getFaqById(id: number): Promise<FaqDoc | null> {
    return this.faqs.find((f) => f.id === id) ?? null;
  }

  async createFaq(input: { question: string; answer: string; category: string; sortOrder?: number }): Promise<FaqDoc> {
    const sortOrder = input.sortOrder ?? (this.faqs.reduce((m, f) => Math.max(m, f.sortOrder), 0) + 1);
    const now = nowIso();
    const doc: FaqDoc = { id: this.nextId('faqs'), ...input, sortOrder, createdAt: now, updatedAt: now };
    this.faqs.push(doc);
    return { ...doc };
  }

  async updateFaq(id: number, patch: Partial<{ question: string; answer: string; category: string; sortOrder: number }>): Promise<FaqDoc | null> {
    const f = this.faqs.find((x) => x.id === id);
    if (!f) return null;
    Object.assign(f, patch, { updatedAt: nowIso() });
    return { ...f };
  }

  async deleteFaq(id: number): Promise<boolean> {
    const idx = this.faqs.findIndex((f) => f.id === id);
    if (idx === -1) return false;
    this.faqs.splice(idx, 1);
    return true;
  }

  async findAdminByIdentifier(identifier: string): Promise<AdminDoc | null> {
    const norm = identifier.toLowerCase().trim();
    return this.admins.find((a) => a.email.toLowerCase() === norm || a.name.toLowerCase() === norm) ?? null;
  }

  async getAdminById(id: number): Promise<AdminDoc | null> {
    return this.admins.find((a) => a.id === id) ?? null;
  }

  async updateAdminPassword(id: number, passwordHash: string): Promise<void> {
    const a = this.admins.find((x) => x.id === id);
    if (a) {
      a.passwordHash = passwordHash;
      a.updatedAt = nowIso();
    }
  }

  async saveUploadedFile(input: { filename: string; mimeType: string; size: number; data: Buffer }): Promise<UploadedFileDoc> {
    const doc: UploadedFileDoc = { ...input, createdAt: nowIso() };
    this.files.set(input.filename, doc);
    return doc;
  }

  async getUploadedFile(filename: string): Promise<UploadedFileDoc | null> {
    return this.files.get(filename) ?? null;
  }
}
