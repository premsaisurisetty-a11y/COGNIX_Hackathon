import type { DataStore, EventConfigDoc } from '../db/types';
import { notFound, unauthorized } from '../utils/httpError';
import { hashPassword, verifyPassword } from '../utils/password';

const DEFAULT_PLACES: Record<number, { place: string; num: string }> = {
  1: { place: 'FIRST PLACE', num: '01' },
  2: { place: 'SECOND PLACE', num: '02' },
  3: { place: 'THIRD PLACE', num: '03' },
};

export class AdminService {
  constructor(private readonly store: DataStore) {}

  async authenticate(identifier: string, password: string) {
    const admin = await this.store.findAdminByIdentifier(identifier);
    if (!admin || !verifyPassword(password, admin.passwordHash)) {
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
    const a = await this.store.getAdminById(id);
    if (!a) throw notFound('Admin account not found');
    return {
      id: a.id,
      email: a.email,
      name: a.name,
      role: a.role,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    };
  }

  async changePassword(adminId: number, currentPassword: string, newPassword: string) {
    const admin = await this.store.getAdminById(adminId);
    if (!admin) throw notFound('Admin account not found');
    if (!verifyPassword(currentPassword, admin.passwordHash)) {
      throw unauthorized('Current password is incorrect');
    }
    await this.store.updateAdminPassword(adminId, hashPassword(newPassword));
  }

  async updateConfig(input: Partial<Omit<EventConfigDoc, 'updatedAt'>>) {
    return this.store.updateConfig(input);
  }

  async toggleReleaseProblems(released: boolean) {
    return this.store.updateConfig({ problemsReleased: released });
  }

  async togglePublishResults(input: {
    published: boolean;
    resultsStatus?: string;
    showShowcase?: boolean;
  }) {
    const resultsStatus = input.resultsStatus ?? (input.published ? 'PUBLISHED' : 'TO BE ANNOUNCED');
    return this.store.updateConfig({
      resultsPublished: input.published,
      resultsStatus,
      ...(input.showShowcase !== undefined ? { showShowcase: input.showShowcase } : {}),
    });
  }

  // ---- Tracks ----
  async createTrack(input: { num: string; name: string; description: string; sortOrder?: number }) {
    return this.store.createTrack(input);
  }

  async getTrackById(id: number) {
    const t = await this.store.getTrackById(id);
    if (!t) throw notFound('Track not found');
    return t;
  }

  async updateTrack(
    id: number,
    input: { num?: string; name?: string; description?: string; sortOrder?: number }
  ) {
    const updated = await this.store.updateTrack(id, input);
    if (!updated) throw notFound('Track not found');
    return updated;
  }

  async deleteTrack(id: number) {
    const deleted = await this.store.deleteTrack(id);
    if (!deleted) throw notFound('Track not found');
  }

  // ---- Problem Statements ----
  async listStatements() {
    return this.store.listStatements();
  }

  async getStatementById(id: number) {
    const s = await this.store.getStatementById(id);
    if (!s) throw notFound('Problem statement not found');
    return s;
  }

  async createStatement(input: {
    code: string;
    trackId: number;
    title: string;
    body: string;
    constraints: string;
    evaluationNotes: string;
    sortOrder?: number;
  }) {
    await this.getTrackById(input.trackId);
    return this.store.createStatement(input);
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
    if (input.trackId !== undefined) {
      await this.getTrackById(input.trackId);
    }
    const updated = await this.store.updateStatement(id, input);
    if (!updated) throw notFound('Problem statement not found');
    return updated;
  }

  async deleteStatement(id: number) {
    const deleted = await this.store.deleteStatement(id);
    if (!deleted) throw notFound('Problem statement not found');
  }

  // ---- Schedule Days & Items ----
  async getScheduleDayById(id: number) {
    const d = await this.store.getScheduleDayById(id);
    if (!d) throw notFound('Schedule day not found');
    return d;
  }

  async createScheduleDay(input: {
    num: string;
    name: string;
    dateLabel: string;
    summary: string;
    sortOrder?: number;
  }) {
    return this.store.createScheduleDay(input);
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
    const updated = await this.store.updateScheduleDay(id, input);
    if (!updated) throw notFound('Schedule day not found');
    return updated;
  }

  async deleteScheduleDay(id: number) {
    const deleted = await this.store.deleteScheduleDay(id);
    if (!deleted) throw notFound('Schedule day not found');
  }

  async createScheduleItem(
    dayId: number,
    input: { time: string; title: string; note: string; sortOrder?: number }
  ) {
    await this.getScheduleDayById(dayId);
    return this.store.createScheduleItem(dayId, input);
  }

  async updateScheduleItem(
    id: number,
    input: { dayId?: number; time?: string; title?: string; note?: string; sortOrder?: number }
  ) {
    if (input.dayId !== undefined) {
      await this.getScheduleDayById(input.dayId);
    }
    const updated = await this.store.updateScheduleItem(id, input);
    if (!updated) throw notFound('Schedule item not found');
    return updated;
  }

  async deleteScheduleItem(id: number) {
    const deleted = await this.store.deleteScheduleItem(id);
    if (!deleted) throw notFound('Schedule item not found');
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
    return this.store.upsertPodium(rank, {
      place: input.placeLabel ?? defaults.place,
      num: input.numLabel ?? defaults.num,
      team: input.teamName,
      project: input.projectTitle,
      trackName: input.trackName,
      projectUrl: input.projectUrl,
      repoUrl: input.repoUrl,
    });
  }

  async deletePodium(rank: number) {
    const deleted = await this.store.deletePodium(rank);
    if (!deleted) throw notFound('Podium rank not found');
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
    sortOrder?: number;
  }) {
    return this.store.createShowcase({
      label: input.label,
      title: input.title,
      team: input.teamName,
      description: input.description,
      trackName: input.trackName,
      screenshotUrl: input.screenshotUrl,
      demoUrl: input.demoUrl,
      repoUrl: input.repoUrl,
      sortOrder: input.sortOrder,
    });
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
    const { teamName, ...rest } = input;
    const updated = await this.store.updateShowcase(id, {
      ...rest,
      ...(teamName !== undefined ? { team: teamName } : {}),
    });
    if (!updated) throw notFound('Showcase project not found');
    return updated;
  }

  async deleteShowcase(id: number) {
    const deleted = await this.store.deleteShowcase(id);
    if (!deleted) throw notFound('Showcase project not found');
  }

  async saveUploadedFile(input: {
    filename: string;
    mimeType: string;
    size: number;
    buffer: Buffer;
  }) {
    const saved = await this.store.saveUploadedFile({
      filename: input.filename,
      mimeType: input.mimeType,
      size: input.size,
      data: input.buffer,
    });
    return {
      filename: saved.filename,
      url: `/uploads/${saved.filename}`,
      mimeType: saved.mimeType,
      size: saved.size,
    };
  }

  // ---- Brief Sections ----
  async createBriefSection(input: { num: string; heading: string; body: string; sortOrder?: number }) {
    return this.store.createBriefSection(input);
  }

  async updateBriefSection(
    id: number,
    input: { num?: string; heading?: string; body?: string; sortOrder?: number }
  ) {
    const updated = await this.store.updateBriefSection(id, input);
    if (!updated) throw notFound('Brief section not found');
    return updated;
  }

  async deleteBriefSection(id: number) {
    const deleted = await this.store.deleteBriefSection(id);
    if (!deleted) throw notFound('Brief section not found');
  }

  // ---- FAQs ----
  async createFaq(input: { question: string; answer: string; category: string; sortOrder?: number }) {
    return this.store.createFaq(input);
  }

  async updateFaq(
    id: number,
    input: { question?: string; answer?: string; category?: string; sortOrder?: number }
  ) {
    const updated = await this.store.updateFaq(id, input);
    if (!updated) throw notFound('FAQ not found');
    return updated;
  }

  async deleteFaq(id: number) {
    const deleted = await this.store.deleteFaq(id);
    if (!deleted) throw notFound('FAQ not found');
  }
}
