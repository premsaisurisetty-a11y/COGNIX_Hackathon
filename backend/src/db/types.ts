export interface EventConfigDoc {
  eventName: string;
  eventTagline: string;
  chapterLabel: string;
  campusLocation: string;
  eventDate: string;
  venue: string;
  releaseLabel: string;
  releaseDateText: string;
  problemsReleased: boolean;
  problemsIntro: string;
  scheduleIntro: string;
  scheduleFooterNote: string;
  resultsStatus: string;
  resultsPublished: boolean;
  resultsIntro: string;
  showShowcase: boolean;
  briefHeadline: string;
  briefSummary: string;
  acmInstagramUrl: string;
  acmLinkedinUrl: string;
  acmWebsiteUrl: string;
  updatedAt: string;
}

export interface TrackDoc {
  id: number;
  num: string;
  name: string;
  description: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface StatementDoc {
  id: number;
  code: string;
  trackId: number;
  title: string;
  body: string;
  constraints: string;
  evaluationNotes: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleDayDoc {
  id: number;
  num: string;
  name: string;
  dateLabel: string;
  summary: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleItemDoc {
  id: number;
  dayId: number;
  time: string;
  title: string;
  note: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface PodiumDoc {
  id: number;
  rank: number;
  place: string;
  num: string;
  team: string;
  project: string;
  trackName: string;
  projectUrl: string;
  repoUrl: string;
  updatedAt: string;
}

export interface ShowcaseDoc {
  id: number;
  label: string;
  title: string;
  team: string;
  description: string;
  trackName: string;
  screenshotUrl: string;
  demoUrl: string;
  repoUrl: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface BriefSectionDoc {
  id: number;
  num: string;
  heading: string;
  body: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface FaqDoc {
  id: number;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDoc {
  id: number;
  email: string;
  name: string;
  passwordHash: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadedFileDoc {
  filename: string;
  mimeType: string;
  size: number;
  data: Buffer;
  createdAt: string;
}

export interface SeedOptions {
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

export interface DataStore {
  init(): Promise<void>;
  seedDefaultsIfEmpty(options: SeedOptions): Promise<void>;
  syncAdminCredentials(options: SeedOptions): Promise<void>;
  close(): Promise<void>;

  // Config
  getConfig(): Promise<EventConfigDoc>;
  updateConfig(patch: Partial<Omit<EventConfigDoc, 'updatedAt'>>): Promise<EventConfigDoc>;

  // Tracks
  listTracks(): Promise<TrackDoc[]>;
  getTrackById(id: number): Promise<TrackDoc | null>;
  createTrack(input: { num: string; name: string; description: string; sortOrder?: number }): Promise<TrackDoc>;
  updateTrack(id: number, patch: Partial<{ num: string; name: string; description: string; sortOrder: number }>): Promise<TrackDoc | null>;
  deleteTrack(id: number): Promise<boolean>;

  // Problem Statements
  listStatements(): Promise<StatementDoc[]>;
  getStatementById(id: number): Promise<StatementDoc | null>;
  createStatement(input: {
    code: string;
    trackId: number;
    title: string;
    body: string;
    constraints: string;
    evaluationNotes: string;
    sortOrder?: number;
  }): Promise<StatementDoc>;
  updateStatement(
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
  ): Promise<StatementDoc | null>;
  deleteStatement(id: number): Promise<boolean>;

  // Schedule
  listScheduleDays(): Promise<ScheduleDayDoc[]>;
  getScheduleDayById(id: number): Promise<ScheduleDayDoc | null>;
  createScheduleDay(input: {
    num: string;
    name: string;
    dateLabel: string;
    summary: string;
    sortOrder?: number;
  }): Promise<ScheduleDayDoc>;
  updateScheduleDay(
    id: number,
    patch: Partial<{ num: string; name: string; dateLabel: string; summary: string; sortOrder: number }>
  ): Promise<ScheduleDayDoc | null>;
  deleteScheduleDay(id: number): Promise<boolean>;

  listScheduleItems(): Promise<ScheduleItemDoc[]>;
  getScheduleItemById(id: number): Promise<ScheduleItemDoc | null>;
  createScheduleItem(
    dayId: number,
    input: { time: string; title: string; note: string; sortOrder?: number }
  ): Promise<ScheduleItemDoc>;
  updateScheduleItem(
    id: number,
    patch: Partial<{ dayId: number; time: string; title: string; note: string; sortOrder: number }>
  ): Promise<ScheduleItemDoc | null>;
  deleteScheduleItem(id: number): Promise<boolean>;

  // Podium
  listPodium(): Promise<PodiumDoc[]>;
  upsertPodium(
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
  ): Promise<PodiumDoc>;
  deletePodium(rank: number): Promise<boolean>;

  // Showcase
  listShowcase(): Promise<ShowcaseDoc[]>;
  getShowcaseById(id: number): Promise<ShowcaseDoc | null>;
  createShowcase(input: {
    label: string;
    title: string;
    team: string;
    description: string;
    trackName: string;
    screenshotUrl: string;
    demoUrl: string;
    repoUrl: string;
    sortOrder?: number;
  }): Promise<ShowcaseDoc>;
  updateShowcase(
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
  ): Promise<ShowcaseDoc | null>;
  deleteShowcase(id: number): Promise<boolean>;

  // Brief
  listBriefSections(): Promise<BriefSectionDoc[]>;
  getBriefSectionById(id: number): Promise<BriefSectionDoc | null>;
  createBriefSection(input: {
    num: string;
    heading: string;
    body: string;
    sortOrder?: number;
  }): Promise<BriefSectionDoc>;
  updateBriefSection(
    id: number,
    patch: Partial<{ num: string; heading: string; body: string; sortOrder: number }>
  ): Promise<BriefSectionDoc | null>;
  deleteBriefSection(id: number): Promise<boolean>;

  // FAQs
  listFaqs(): Promise<FaqDoc[]>;
  getFaqById(id: number): Promise<FaqDoc | null>;
  createFaq(input: {
    question: string;
    answer: string;
    category: string;
    sortOrder?: number;
  }): Promise<FaqDoc>;
  updateFaq(
    id: number,
    patch: Partial<{ question: string; answer: string; category: string; sortOrder: number }>
  ): Promise<FaqDoc | null>;
  deleteFaq(id: number): Promise<boolean>;

  // Admins
  findAdminByIdentifier(identifier: string): Promise<AdminDoc | null>;
  getAdminById(id: number): Promise<AdminDoc | null>;
  updateAdminPassword(id: number, passwordHash: string): Promise<void>;

  // Uploaded files
  saveUploadedFile(input: {
    filename: string;
    mimeType: string;
    size: number;
    data: Buffer;
  }): Promise<UploadedFileDoc>;
  getUploadedFile(filename: string): Promise<UploadedFileDoc | null>;
}
