import { Binary, type Db, MongoClient } from 'mongodb';
import { hashPassword } from '../utils/password';
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
} from './types';

interface CounterDoc {
  _id: string;
  seq: number;
}

interface StoredConfigDoc extends EventConfigDoc {
  _id: number;
}

interface StoredUploadedFileDoc {
  filename: string;
  mimeType: string;
  size: number;
  data: Binary;
  createdAt: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

function stripMongoId<T extends object>(doc: T & { _id?: unknown }): Omit<T, '_id'> {
  const { _id: _omit, ...rest } = doc;
  return rest;
}

export class MongoStore implements DataStore {
  private readonly client: MongoClient;
  private db!: Db;
  private readonly dbName: string | undefined;

  constructor(uri: string, dbName?: string) {
    this.dbName = dbName || undefined;
    this.client = new MongoClient(uri, {
      maxPoolSize: process.env.VERCEL ? 5 : 10,
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });
  }

  async init(): Promise<void> {
    await this.client.connect();
    this.db = this.dbName ? this.client.db(this.dbName) : this.client.db();
    await this.db.command({ ping: 1 });

    await Promise.all([
      this.db.collection('tracks').createIndex({ id: 1 }, { unique: true }),
      this.db.collection('tracks').createIndex({ num: 1 }, { unique: true }),
      this.db.collection('problem_statements').createIndex({ id: 1 }, { unique: true }),
      this.db.collection('problem_statements').createIndex({ code: 1 }, { unique: true }),
      this.db.collection('problem_statements').createIndex({ trackId: 1 }),
      this.db.collection('schedule_days').createIndex({ id: 1 }, { unique: true }),
      this.db.collection('schedule_days').createIndex({ num: 1 }, { unique: true }),
      this.db.collection('schedule_items').createIndex({ id: 1 }, { unique: true }),
      this.db.collection('schedule_items').createIndex({ dayId: 1 }),
      this.db.collection('podium_results').createIndex({ rank: 1 }, { unique: true }),
      this.db.collection('showcase_projects').createIndex({ id: 1 }, { unique: true }),
      this.db.collection('brief_sections').createIndex({ id: 1 }, { unique: true }),
      this.db.collection('faqs').createIndex({ id: 1 }, { unique: true }),
      this.db.collection('admins').createIndex({ id: 1 }, { unique: true }),
      this.db.collection('admins').createIndex({ email: 1 }, { unique: true }),
      this.db.collection('uploaded_files').createIndex({ filename: 1 }, { unique: true }),
    ]);
  }

  async close(): Promise<void> {
    await this.client.close();
  }

  private async nextId(sequenceName: string): Promise<number> {
    const result = await this.db
      .collection<CounterDoc>('counters')
      .findOneAndUpdate(
        { _id: sequenceName },
        { $inc: { seq: 1 } },
        { upsert: true, returnDocument: 'after' }
      );
    return result?.seq ?? 1;
  }

  private async nextSortOrder(
    collectionName: string,
    filter: Record<string, unknown> = {}
  ): Promise<number> {
    const top = await this.db
      .collection<{ sortOrder?: number }>(collectionName)
      .find(filter)
      .sort({ sortOrder: -1 })
      .limit(1)
      .toArray();
    return (top[0]?.sortOrder ?? 0) + 1;
  }

  async seedDefaultsIfEmpty(options: SeedOptions): Promise<void> {
    const configCol = this.db.collection<StoredConfigDoc>('event_config');
    // Concurrency-safe upsert so parallel cold starts on Vercel never collide
    await configCol.updateOne(
      { _id: 1 },
      {
        $setOnInsert: {
          _id: 1,
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
          updatedAt: nowIso(),
        },
      },
      { upsert: true }
    );

    const ignoreDup = async (fn: () => Promise<void>) => {
      try {
        await fn();
      } catch (err) {
        if (!(err && typeof err === 'object' && 'code' in err && (err as { code?: unknown }).code === 11000)) {
          throw err;
        }
      }
    };

    if ((await this.db.collection('tracks').countDocuments()) === 0) {
      await ignoreDup(async () => {
        const pendingBody =
          'The full problem description, constraints and evaluation notes will be published here when statements are released on Friday.';
        const t1 = await this.createTrack({
          num: '01',
          name: 'Track name to be announced',
          description: '',
          sortOrder: 1,
        });
        await this.createStatement({
          code: 'PS-01',
          trackId: t1.id,
          title: 'Statement title to be announced',
          body: pendingBody,
          constraints: '',
          evaluationNotes: '',
          sortOrder: 1,
        });
        await this.createStatement({
          code: 'PS-02',
          trackId: t1.id,
          title: 'Statement title to be announced',
          body: pendingBody,
          constraints: '',
          evaluationNotes: '',
          sortOrder: 2,
        });

        const t2 = await this.createTrack({
          num: '02',
          name: 'Track name to be announced',
          description: '',
          sortOrder: 2,
        });
        await this.createStatement({
          code: 'PS-03',
          trackId: t2.id,
          title: 'Statement title to be announced',
          body: pendingBody,
          constraints: '',
          evaluationNotes: '',
          sortOrder: 1,
        });
        await this.createStatement({
          code: 'PS-04',
          trackId: t2.id,
          title: 'Statement title to be announced',
          body: pendingBody,
          constraints: '',
          evaluationNotes: '',
          sortOrder: 2,
        });
      });
    }

    if ((await this.db.collection('schedule_days').countDocuments()) === 0) {
      await ignoreDup(async () => {
        const d1 = await this.createScheduleDay({
          num: '01',
          name: 'Friday',
          dateLabel: 'DATE TBA',
          summary: 'Problem statements released.',
          sortOrder: 1,
        });
        await this.createScheduleItem(d1.id, {
          time: 'TBA',
          title: 'Problem statement release',
          note: 'All tracks and statements published on the Problem statements page.',
          sortOrder: 1,
        });

        const d2 = await this.createScheduleDay({
          num: '02',
          name: 'Saturday',
          dateLabel: 'DATE TBA',
          summary: 'The hackathon.',
          sortOrder: 2,
        });
        await this.createScheduleItem(d2.id, {
          time: 'TBA',
          title: 'Hacking begins',
          note: 'Further details to be announced.',
          sortOrder: 1,
        });
        await this.createScheduleItem(d2.id, {
          time: 'TBA',
          title: 'Submissions close',
          note: 'Further details to be announced.',
          sortOrder: 2,
        });
        await this.createScheduleItem(d2.id, {
          time: 'TBA',
          title: 'Results announced',
          note: 'Winners published on the Results page.',
          sortOrder: 3,
        });
      });
    }

    if ((await this.db.collection('podium_results').countDocuments()) === 0) {
      await ignoreDup(async () => {
        const defaults: Array<[number, string, string]> = [
          [1, 'FIRST PLACE', '01'],
          [2, 'SECOND PLACE', '02'],
          [3, 'THIRD PLACE', '03'],
        ];
        for (const [rank, place, num] of defaults) {
          await this.upsertPodium(rank, {
            place,
            num,
            team: 'To be announced',
            project: 'Project title to be announced',
            trackName: '',
            projectUrl: '',
            repoUrl: '',
          });
        }
      });
    }

    if ((await this.db.collection('showcase_projects').countDocuments()) === 0) {
      await ignoreDup(async () => {
        for (const idx of [1, 2, 3]) {
          await this.createShowcase({
            label: `PROJECT 0${idx}`,
            title: 'Project title to be announced',
            team: 'Team name to be announced',
            description: '',
            trackName: '',
            screenshotUrl: '',
            demoUrl: '',
            repoUrl: '',
            sortOrder: idx,
          });
        }
      });
    }

    if ((await this.db.collection('brief_sections').countDocuments()) === 0) {
      await ignoreDup(async () => {
        await this.createBriefSection({
          num: '01',
          heading: 'Format',
          body: 'Problem statements are grouped by track and published on Friday. Teams select one statement and build an intelligent full-stack application on Saturday.',
          sortOrder: 1,
        });
        await this.createBriefSection({
          num: '02',
          heading: 'Deliverables',
          body: 'A working full-stack prototype, source repository, and live demonstration presented to the judging panel before submissions close.',
          sortOrder: 2,
        });
        await this.createBriefSection({
          num: '03',
          heading: 'Evaluation',
          body: 'Projects are judged on problem fit, technical execution, usability, and real-world impact. Winning teams and featured builds are published on the Results page.',
          sortOrder: 3,
        });
      });
    }

    if ((await this.db.collection('faqs').countDocuments()) === 0) {
      await ignoreDup(async () => {
        await this.createFaq({
          question: 'When are the problem statements released?',
          answer:
            'All tracks and problem statements are published on the Problem statements page on Friday.',
          category: 'General',
          sortOrder: 1,
        });
        await this.createFaq({
          question: 'When does the hackathon take place?',
          answer:
            'Hacking, submissions, judging, and results announcement take place on Saturday. Exact timings and venue will be posted on the Schedule page.',
          category: 'Schedule',
          sortOrder: 2,
        });
        await this.createFaq({
          question: 'Where will winning teams and projects be announced?',
          answer:
            'Winners and the project showcase are published on the Results page at the close of the Saturday hackathon.',
          category: 'Results',
          sortOrder: 3,
        });
      });
    }

    if (
      (await this.db.collection('admins').countDocuments()) === 0 &&
      options.adminEmail &&
      options.adminPassword &&
      options.adminName
    ) {
      await ignoreDup(async () => {
        const id = await this.nextId('admins');
        const now = nowIso();
        await this.db.collection<AdminDoc>('admins').insertOne({
          id,
          email: options.adminEmail.toLowerCase(),
          name: options.adminName,
          passwordHash: hashPassword(options.adminPassword),
          role: 'admin',
          createdAt: now,
          updatedAt: now,
        });
      });
    }
  }

  async syncAdminCredentials(options: SeedOptions): Promise<void> {
    await this.db.collection<AdminDoc>('admins').updateOne(
      { email: options.adminEmail.toLowerCase() },
      {
        $set: {
          name: options.adminName,
          passwordHash: hashPassword(options.adminPassword),
          updatedAt: nowIso(),
        },
      }
    );
  }

  // ---- Config ----
  async getConfig(): Promise<EventConfigDoc> {
    const doc = await this.db.collection<StoredConfigDoc>('event_config').findOne({ _id: 1 });
    if (!doc) throw new Error('Event configuration is not initialized');
    return stripMongoId(doc);
  }

  async updateConfig(patch: Partial<Omit<EventConfigDoc, 'updatedAt'>>): Promise<EventConfigDoc> {
    await this.db
      .collection<StoredConfigDoc>('event_config')
      .updateOne({ _id: 1 }, { $set: { ...patch, updatedAt: nowIso() } });
    return this.getConfig();
  }

  // ---- Tracks ----
  async listTracks(): Promise<TrackDoc[]> {
    const docs = await this.db
      .collection<TrackDoc>('tracks')
      .find()
      .sort({ sortOrder: 1, num: 1, id: 1 })
      .toArray();
    return docs.map((d) => stripMongoId(d));
  }

  async getTrackById(id: number): Promise<TrackDoc | null> {
    const doc = await this.db.collection<TrackDoc>('tracks').findOne({ id });
    return doc ? stripMongoId(doc) : null;
  }

  async createTrack(input: {
    num: string;
    name: string;
    description: string;
    sortOrder?: number;
  }): Promise<TrackDoc> {
    const id = await this.nextId('tracks');
    const sortOrder = input.sortOrder ?? (await this.nextSortOrder('tracks'));
    const now = nowIso();
    const doc: TrackDoc = { id, ...input, sortOrder, createdAt: now, updatedAt: now };
    await this.db.collection<TrackDoc>('tracks').insertOne({ ...doc });
    return doc;
  }

  async updateTrack(
    id: number,
    patch: Partial<{ num: string; name: string; description: string; sortOrder: number }>
  ): Promise<TrackDoc | null> {
    const doc = await this.db
      .collection<TrackDoc>('tracks')
      .findOneAndUpdate(
        { id },
        { $set: { ...patch, updatedAt: nowIso() } },
        { returnDocument: 'after' }
      );
    return doc ? stripMongoId(doc) : null;
  }

  async deleteTrack(id: number): Promise<boolean> {
    const res = await this.db.collection<TrackDoc>('tracks').deleteOne({ id });
    if (res.deletedCount > 0) {
      await this.db.collection<StatementDoc>('problem_statements').deleteMany({ trackId: id });
      return true;
    }
    return false;
  }

  // ---- Statements ----
  async listStatements(): Promise<StatementDoc[]> {
    const docs = await this.db
      .collection<StatementDoc>('problem_statements')
      .find()
      .sort({ sortOrder: 1, code: 1, id: 1 })
      .toArray();
    return docs.map((d) => stripMongoId(d));
  }

  async getStatementById(id: number): Promise<StatementDoc | null> {
    const doc = await this.db.collection<StatementDoc>('problem_statements').findOne({ id });
    return doc ? stripMongoId(doc) : null;
  }

  async createStatement(input: {
    code: string;
    trackId: number;
    title: string;
    body: string;
    constraints: string;
    evaluationNotes: string;
    sortOrder?: number;
  }): Promise<StatementDoc> {
    const id = await this.nextId('problem_statements');
    const sortOrder =
      input.sortOrder ?? (await this.nextSortOrder('problem_statements', { trackId: input.trackId }));
    const now = nowIso();
    const doc: StatementDoc = { id, ...input, sortOrder, createdAt: now, updatedAt: now };
    await this.db.collection<StatementDoc>('problem_statements').insertOne({ ...doc });
    return doc;
  }

  async updateStatement(
    id: number,
    patch: Partial<{
      code: string;
      trackId: number;
      title: string;
      body: string;
      constraints: string;
      evaluationNotes: string;
      sortOrder: number;
    }>
  ): Promise<StatementDoc | null> {
    const doc = await this.db
      .collection<StatementDoc>('problem_statements')
      .findOneAndUpdate(
        { id },
        { $set: { ...patch, updatedAt: nowIso() } },
        { returnDocument: 'after' }
      );
    return doc ? stripMongoId(doc) : null;
  }

  async deleteStatement(id: number): Promise<boolean> {
    const res = await this.db.collection<StatementDoc>('problem_statements').deleteOne({ id });
    return res.deletedCount > 0;
  }

  // ---- Schedule Days & Items ----
  async listScheduleDays(): Promise<ScheduleDayDoc[]> {
    const docs = await this.db
      .collection<ScheduleDayDoc>('schedule_days')
      .find()
      .sort({ sortOrder: 1, num: 1, id: 1 })
      .toArray();
    return docs.map((d) => stripMongoId(d));
  }

  async getScheduleDayById(id: number): Promise<ScheduleDayDoc | null> {
    const doc = await this.db.collection<ScheduleDayDoc>('schedule_days').findOne({ id });
    return doc ? stripMongoId(doc) : null;
  }

  async createScheduleDay(input: {
    num: string;
    name: string;
    dateLabel: string;
    summary: string;
    sortOrder?: number;
  }): Promise<ScheduleDayDoc> {
    const id = await this.nextId('schedule_days');
    const sortOrder = input.sortOrder ?? (await this.nextSortOrder('schedule_days'));
    const now = nowIso();
    const doc: ScheduleDayDoc = { id, ...input, sortOrder, createdAt: now, updatedAt: now };
    await this.db.collection<ScheduleDayDoc>('schedule_days').insertOne({ ...doc });
    return doc;
  }

  async updateScheduleDay(
    id: number,
    patch: Partial<{ num: string; name: string; dateLabel: string; summary: string; sortOrder: number }>
  ): Promise<ScheduleDayDoc | null> {
    const doc = await this.db
      .collection<ScheduleDayDoc>('schedule_days')
      .findOneAndUpdate(
        { id },
        { $set: { ...patch, updatedAt: nowIso() } },
        { returnDocument: 'after' }
      );
    return doc ? stripMongoId(doc) : null;
  }

  async deleteScheduleDay(id: number): Promise<boolean> {
    const res = await this.db.collection<ScheduleDayDoc>('schedule_days').deleteOne({ id });
    if (res.deletedCount > 0) {
      await this.db.collection<ScheduleItemDoc>('schedule_items').deleteMany({ dayId: id });
      return true;
    }
    return false;
  }

  async listScheduleItems(): Promise<ScheduleItemDoc[]> {
    const docs = await this.db
      .collection<ScheduleItemDoc>('schedule_items')
      .find()
      .sort({ sortOrder: 1, id: 1 })
      .toArray();
    return docs.map((d) => stripMongoId(d));
  }

  async getScheduleItemById(id: number): Promise<ScheduleItemDoc | null> {
    const doc = await this.db.collection<ScheduleItemDoc>('schedule_items').findOne({ id });
    return doc ? stripMongoId(doc) : null;
  }

  async createScheduleItem(
    dayId: number,
    input: { time: string; title: string; note: string; sortOrder?: number }
  ): Promise<ScheduleItemDoc> {
    const id = await this.nextId('schedule_items');
    const sortOrder = input.sortOrder ?? (await this.nextSortOrder('schedule_items', { dayId }));
    const now = nowIso();
    const doc: ScheduleItemDoc = { id, dayId, ...input, sortOrder, createdAt: now, updatedAt: now };
    await this.db.collection<ScheduleItemDoc>('schedule_items').insertOne({ ...doc });
    return doc;
  }

  async updateScheduleItem(
    id: number,
    patch: Partial<{ dayId: number; time: string; title: string; note: string; sortOrder: number }>
  ): Promise<ScheduleItemDoc | null> {
    const doc = await this.db
      .collection<ScheduleItemDoc>('schedule_items')
      .findOneAndUpdate(
        { id },
        { $set: { ...patch, updatedAt: nowIso() } },
        { returnDocument: 'after' }
      );
    return doc ? stripMongoId(doc) : null;
  }

  async deleteScheduleItem(id: number): Promise<boolean> {
    const res = await this.db.collection<ScheduleItemDoc>('schedule_items').deleteOne({ id });
    return res.deletedCount > 0;
  }

  // ---- Podium ----
  async listPodium(): Promise<PodiumDoc[]> {
    const docs = await this.db
      .collection<PodiumDoc>('podium_results')
      .find()
      .sort({ rank: 1 })
      .toArray();
    return docs.map((d) => stripMongoId(d));
  }

  async upsertPodium(
    rank: number,
    input: {
      place: string;
      num: string;
      team: string;
      project: string;
      trackName: string;
      projectUrl: string;
      repoUrl: string;
    }
  ): Promise<PodiumDoc> {
    const col = this.db.collection<PodiumDoc>('podium_results');
    const existing = await col.findOne({ rank });
    const id = existing ? existing.id : await this.nextId('podium_results');
    const doc: PodiumDoc = {
      id,
      rank,
      ...input,
      updatedAt: nowIso(),
    };
    await col.updateOne({ rank }, { $set: doc }, { upsert: true });
    return doc;
  }

  async deletePodium(rank: number): Promise<boolean> {
    const res = await this.db.collection<PodiumDoc>('podium_results').deleteOne({ rank });
    return res.deletedCount > 0;
  }

  // ---- Showcase ----
  async listShowcase(): Promise<ShowcaseDoc[]> {
    const docs = await this.db
      .collection<ShowcaseDoc>('showcase_projects')
      .find()
      .sort({ sortOrder: 1, id: 1 })
      .toArray();
    return docs.map((d) => stripMongoId(d));
  }

  async getShowcaseById(id: number): Promise<ShowcaseDoc | null> {
    const doc = await this.db.collection<ShowcaseDoc>('showcase_projects').findOne({ id });
    return doc ? stripMongoId(doc) : null;
  }

  async createShowcase(input: {
    label: string;
    title: string;
    team: string;
    description: string;
    trackName: string;
    screenshotUrl: string;
    demoUrl: string;
    repoUrl: string;
    sortOrder?: number;
  }): Promise<ShowcaseDoc> {
    const id = await this.nextId('showcase_projects');
    const sortOrder = input.sortOrder ?? (await this.nextSortOrder('showcase_projects'));
    const now = nowIso();
    const doc: ShowcaseDoc = { id, ...input, sortOrder, createdAt: now, updatedAt: now };
    await this.db.collection<ShowcaseDoc>('showcase_projects').insertOne({ ...doc });
    return doc;
  }

  async updateShowcase(
    id: number,
    patch: Partial<{
      label: string;
      title: string;
      team: string;
      description: string;
      trackName: string;
      screenshotUrl: string;
      demoUrl: string;
      repoUrl: string;
      sortOrder: number;
    }>
  ): Promise<ShowcaseDoc | null> {
    const doc = await this.db
      .collection<ShowcaseDoc>('showcase_projects')
      .findOneAndUpdate(
        { id },
        { $set: { ...patch, updatedAt: nowIso() } },
        { returnDocument: 'after' }
      );
    return doc ? stripMongoId(doc) : null;
  }

  async deleteShowcase(id: number): Promise<boolean> {
    const res = await this.db.collection<ShowcaseDoc>('showcase_projects').deleteOne({ id });
    return res.deletedCount > 0;
  }

  // ---- Brief ----
  async listBriefSections(): Promise<BriefSectionDoc[]> {
    const docs = await this.db
      .collection<BriefSectionDoc>('brief_sections')
      .find()
      .sort({ sortOrder: 1, num: 1, id: 1 })
      .toArray();
    return docs.map((d) => stripMongoId(d));
  }

  async getBriefSectionById(id: number): Promise<BriefSectionDoc | null> {
    const doc = await this.db.collection<BriefSectionDoc>('brief_sections').findOne({ id });
    return doc ? stripMongoId(doc) : null;
  }

  async createBriefSection(input: {
    num: string;
    heading: string;
    body: string;
    sortOrder?: number;
  }): Promise<BriefSectionDoc> {
    const id = await this.nextId('brief_sections');
    const sortOrder = input.sortOrder ?? (await this.nextSortOrder('brief_sections'));
    const now = nowIso();
    const doc: BriefSectionDoc = { id, ...input, sortOrder, createdAt: now, updatedAt: now };
    await this.db.collection<BriefSectionDoc>('brief_sections').insertOne({ ...doc });
    return doc;
  }

  async updateBriefSection(
    id: number,
    patch: Partial<{ num: string; heading: string; body: string; sortOrder: number }>
  ): Promise<BriefSectionDoc | null> {
    const doc = await this.db
      .collection<BriefSectionDoc>('brief_sections')
      .findOneAndUpdate(
        { id },
        { $set: { ...patch, updatedAt: nowIso() } },
        { returnDocument: 'after' }
      );
    return doc ? stripMongoId(doc) : null;
  }

  async deleteBriefSection(id: number): Promise<boolean> {
    const res = await this.db.collection<BriefSectionDoc>('brief_sections').deleteOne({ id });
    return res.deletedCount > 0;
  }

  // ---- FAQs ----
  async listFaqs(): Promise<FaqDoc[]> {
    const docs = await this.db
      .collection<FaqDoc>('faqs')
      .find()
      .sort({ sortOrder: 1, id: 1 })
      .toArray();
    return docs.map((d) => stripMongoId(d));
  }

  async getFaqById(id: number): Promise<FaqDoc | null> {
    const doc = await this.db.collection<FaqDoc>('faqs').findOne({ id });
    return doc ? stripMongoId(doc) : null;
  }

  async createFaq(input: {
    question: string;
    answer: string;
    category: string;
    sortOrder?: number;
  }): Promise<FaqDoc> {
    const id = await this.nextId('faqs');
    const sortOrder = input.sortOrder ?? (await this.nextSortOrder('faqs'));
    const now = nowIso();
    const doc: FaqDoc = { id, ...input, sortOrder, createdAt: now, updatedAt: now };
    await this.db.collection<FaqDoc>('faqs').insertOne({ ...doc });
    return doc;
  }

  async updateFaq(
    id: number,
    patch: Partial<{ question: string; answer: string; category: string; sortOrder: number }>
  ): Promise<FaqDoc | null> {
    const doc = await this.db
      .collection<FaqDoc>('faqs')
      .findOneAndUpdate(
        { id },
        { $set: { ...patch, updatedAt: nowIso() } },
        { returnDocument: 'after' }
      );
    return doc ? stripMongoId(doc) : null;
  }

  async deleteFaq(id: number): Promise<boolean> {
    const res = await this.db.collection<FaqDoc>('faqs').deleteOne({ id });
    return res.deletedCount > 0;
  }

  // ---- Admins ----
  async findAdminByIdentifier(identifier: string): Promise<AdminDoc | null> {
    const normalized = identifier.toLowerCase().trim();
    const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const doc = await this.db.collection<AdminDoc>('admins').findOne({
      $or: [{ email: normalized }, { name: { $regex: `^${escaped}$`, $options: 'i' } }],
    });
    return doc ? stripMongoId(doc) : null;
  }

  async getAdminById(id: number): Promise<AdminDoc | null> {
    const doc = await this.db.collection<AdminDoc>('admins').findOne({ id });
    return doc ? stripMongoId(doc) : null;
  }

  async updateAdminPassword(id: number, passwordHash: string): Promise<void> {
    await this.db
      .collection<AdminDoc>('admins')
      .updateOne({ id }, { $set: { passwordHash, updatedAt: nowIso() } });
  }

  // ---- Uploaded Files ----
  async saveUploadedFile(input: {
    filename: string;
    mimeType: string;
    size: number;
    data: Buffer;
  }): Promise<UploadedFileDoc> {
    const createdAt = nowIso();
    await this.db.collection<StoredUploadedFileDoc>('uploaded_files').insertOne({
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      data: new Binary(input.data),
      createdAt,
    });
    return {
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      data: input.data,
      createdAt,
    };
  }

  async getUploadedFile(filename: string): Promise<UploadedFileDoc | null> {
    const doc = await this.db
      .collection<StoredUploadedFileDoc>('uploaded_files')
      .findOne({ filename });
    if (!doc) return null;
    const raw = doc.data;
    const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw.buffer);
    return {
      filename: doc.filename,
      mimeType: doc.mimeType,
      size: doc.size,
      data: buf,
      createdAt: doc.createdAt,
    };
  }
}
