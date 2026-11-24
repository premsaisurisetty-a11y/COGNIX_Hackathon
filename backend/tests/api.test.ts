import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import vercelApp, { createApp } from '../src/app';
import type { DataStore } from '../src/db/types';
import { InMemoryStore } from './inMemoryStore';

describe('COGNIX 26 Hackathon Portal CMS & Admin API', () => {
  let store: DataStore;
  let app: ReturnType<typeof createApp>;

  const ADMIN_EMAIL = 'admin@acmklh.org';
  const ADMIN_NAME = 'Admin';
  const ADMIN_PASSWORD = 'ACM0206';

  beforeEach(async () => {
    store = new InMemoryStore();
    await store.init();
    await store.seedDefaultsIfEmpty({
      adminEmail: ADMIN_EMAIL,
      adminPassword: ADMIN_PASSWORD,
      adminName: ADMIN_NAME,
    });
    app = createApp({ store, enableLogging: false, enableRateLimit: false });
  });

  afterEach(async () => {
    await store.close();
  });

  async function loginAsAdmin(): Promise<string> {
    const res = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    expect(res.status).toBe(200);
    return res.body.token as string;
  }

  it('serves health check, portal UI, admin UI, and seeded portal payload', async () => {
    const home = await request(app).get('/');
    expect(home.status).toBe(200);
    expect(home.headers['content-type']).toContain('text/html');

    const adminPage = await request(app).get('/admin');
    expect(adminPage.status).toBe(200);
    expect(adminPage.text).toContain('Admin Login');

    const health = await request(app).get('/api/health');
    expect(health.status).toBe(200);
    expect(health.body.status).toBe('ok');

    const portal = await request(app).get('/api/portal');
    expect(portal.status).toBe(200);
    expect(portal.body.config.eventName).toBe('COGNIX ’26');
    expect(portal.body.problems.released).toBe(false);
    expect(portal.body.problems.tracks).toHaveLength(2);
    expect(portal.body.schedule.days).toHaveLength(2);
    expect(portal.body.results.podium).toHaveLength(3);
    expect(portal.body.results.showcase).toHaveLength(3);
    expect(portal.body.brief.sections).toHaveLength(3);
    expect(portal.body.faqs.items).toHaveLength(3);
  });

  it('enforces admin authentication and supports password change', async () => {
    const unauth = await request(app).get('/api/admin/config');
    expect(unauth.status).toBe(401);

    const badLogin = await request(app)
      .post('/api/admin/auth/login')
      .send({ username: ADMIN_NAME, password: 'wrong' });
    expect(badLogin.status).toBe(401);

    const usernameLogin = await request(app)
      .post('/api/admin/auth/login')
      .send({ username: ADMIN_NAME, password: ADMIN_PASSWORD });
    expect(usernameLogin.status).toBe(200);
    expect(usernameLogin.body.admin.name).toBe('Admin');

    const token = await loginAsAdmin();
    const me = await request(app)
      .get('/api/admin/auth/me')
      .set('Authorization', `Bearer ${token}`);
    expect(me.status).toBe(200);
    expect(me.body.admin.email).toBe(ADMIN_EMAIL);

    const changeRes = await request(app)
      .post('/api/admin/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: ADMIN_PASSWORD, newPassword: 'newSecurePassword99' });
    expect(changeRes.status).toBe(200);

    const relogin = await request(app)
      .post('/api/admin/auth/login')
      .send({ email: ADMIN_EMAIL, password: 'newSecurePassword99' });
    expect(relogin.status).toBe(200);
  });

  it('masks unpublished problem statements on public routes and exposes them once released', async () => {
    const token = await loginAsAdmin();

    const trackRes = await request(app)
      .post('/api/admin/tracks')
      .set('Authorization', `Bearer ${token}`)
      .send({ num: '03', name: 'Applied AI Systems', description: 'AI agents & RAG', sortOrder: 3 });
    expect(trackRes.status).toBe(201);

    const stmtRes = await request(app)
      .post('/api/admin/statements')
      .set('Authorization', `Bearer ${token}`)
      .send({
        code: 'PS-05',
        trackId: trackRes.body.id,
        title: 'Autonomous Campus Triage',
        body: 'Secret problem description before release.',
        constraints: 'Must run locally',
        evaluationNotes: 'Accuracy + latency',
        sortOrder: 1,
      });
    expect(stmtRes.status).toBe(201);

    const pubBefore = await request(app).get('/api/problems?track=03');
    expect(pubBefore.status).toBe(200);
    expect(pubBefore.body.released).toBe(false);
    expect(pubBefore.body.tracks).toHaveLength(1);
    expect(pubBefore.body.tracks[0].name).toBe('Track name to be announced');
    expect(pubBefore.body.tracks[0].statements[0].title).toBe('Statement title to be announced');
    expect(pubBefore.body.tracks[0].statements[0].body).not.toContain('Secret problem description');

    const adminView = await request(app)
      .get('/api/admin/tracks')
      .set('Authorization', `Bearer ${token}`);
    expect(adminView.status).toBe(200);
    const adminTrack3 = adminView.body.tracks.find((t: { num: string }) => t.num === '03');
    expect(adminTrack3.name).toBe('Applied AI Systems');
    expect(adminTrack3.statements[0].title).toBe('Autonomous Campus Triage');

    const toggle = await request(app)
      .post('/api/admin/toggles/release-problems')
      .set('Authorization', `Bearer ${token}`)
      .send({ released: true });
    expect(toggle.status).toBe(200);
    expect(toggle.body.problemsReleased).toBe(true);

    const pubAfter = await request(app).get('/api/problems?track=03');
    expect(pubAfter.status).toBe(200);
    expect(pubAfter.body.released).toBe(true);
    expect(pubAfter.body.trackSummary).toBe('3 tracks');
    expect(pubAfter.body.tracks[0].name).toBe('Applied AI Systems');
    expect(pubAfter.body.tracks[0].statements[0].title).toBe('Autonomous Campus Triage');
    expect(pubAfter.body.tracks[0].statements[0].body).toBe('Secret problem description before release.');
  });

  it('supports full Schedule, Brief, and FAQ management', async () => {
    const token = await loginAsAdmin();

    const cfg = await request(app)
      .patch('/api/admin/config')
      .set('Authorization', `Bearer ${token}`)
      .send({ eventDate: 'March 13–14, 2026', venue: 'KLH Bachupally Auditorium' });
    expect(cfg.status).toBe(200);
    expect(cfg.body.venue).toBe('KLH Bachupally Auditorium');

    const dayRes = await request(app)
      .post('/api/admin/schedule/days')
      .set('Authorization', `Bearer ${token}`)
      .send({ num: '03', name: 'Sunday', dateLabel: 'MAR 15', summary: 'Showcase expo.', sortOrder: 3 });
    expect(dayRes.status).toBe(201);

    const itemRes = await request(app)
      .post(`/api/admin/schedule/days/${dayRes.body.id}/items`)
      .set('Authorization', `Bearer ${token}`)
      .send({ time: '10:00 AM', title: 'Community Demo Day', note: 'Open booths', sortOrder: 1 });
    expect(itemRes.status).toBe(201);

    const schedule = await request(app).get('/api/schedule');
    expect(schedule.status).toBe(200);
    expect(schedule.body.date).toBe('March 13–14, 2026');
    expect(schedule.body.days).toHaveLength(3);
    expect(schedule.body.days[2].items[0].title).toBe('Community Demo Day');

    const briefAdd = await request(app)
      .post('/api/admin/brief/sections')
      .set('Authorization', `Bearer ${token}`)
      .send({ num: '04', heading: 'Team Size', body: 'Teams of 2 to 4 students.', sortOrder: 4 });
    expect(briefAdd.status).toBe(201);

    const briefRes = await request(app).get('/api/brief');
    expect(briefRes.body.sections).toHaveLength(4);

    const faqAdd = await request(app)
      .post('/api/admin/faqs')
      .set('Authorization', `Bearer ${token}`)
      .send({ question: 'Is Wi-Fi provided?', answer: 'Yes, campus Wi-Fi is available.', category: 'Logistics', sortOrder: 4 });
    expect(faqAdd.status).toBe(201);

    const faqFiltered = await request(app).get('/api/faqs?category=Logistics');
    expect(faqFiltered.status).toBe(200);
    expect(faqFiltered.body.items).toHaveLength(1);
    expect(faqFiltered.body.items[0].question).toBe('Is Wi-Fi provided?');
  });

  it('masks unpublished results, stores & serves screenshots from DB, and publishes podium & showcase', async () => {
    const token = await loginAsAdmin();

    const tinyPng = Buffer.from(
      '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
      'hex'
    );
    const uploadRes = await request(app)
      .post('/api/admin/uploads/screenshot')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', tinyPng, { filename: 'demo.png', contentType: 'image/png' });
    expect(uploadRes.status).toBe(201);
    expect(uploadRes.body.url).toMatch(/^\/uploads\/.+\.png$/);

    // Uploaded image must be served back from the database
    const fetchImg = await request(app).get(uploadRes.body.url);
    expect(fetchImg.status).toBe(200);
    expect(fetchImg.headers['content-type']).toBe('image/png');
    expect(Buffer.compare(fetchImg.body, tinyPng)).toBe(0);

    const podiumRes = await request(app)
      .put('/api/admin/results/podium/1')
      .set('Authorization', `Bearer ${token}`)
      .send({
        teamName: 'Team Quantum',
        projectTitle: 'NeuroGrid',
        trackName: 'Applied AI',
        repoUrl: 'https://github.com/example/neurogrid',
      });
    expect(podiumRes.status).toBe(200);

    const showcaseRes = await request(app)
      .post('/api/admin/results/showcase')
      .set('Authorization', `Bearer ${token}`)
      .send({
        label: 'PROJECT 04',
        title: 'NeuroGrid',
        teamName: 'Team Quantum',
        screenshotUrl: uploadRes.body.url,
        sortOrder: 4,
      });
    expect(showcaseRes.status).toBe(201);

    const pubBefore = await request(app).get('/api/results');
    expect(pubBefore.body.published).toBe(false);
    expect(pubBefore.body.podium[0].team).toBe('To be announced');

    const publish = await request(app)
      .post('/api/admin/toggles/publish-results')
      .set('Authorization', `Bearer ${token}`)
      .send({ published: true, resultsStatus: 'PUBLISHED', showShowcase: true });
    expect(publish.status).toBe(200);

    const pubAfter = await request(app).get('/api/results');
    expect(pubAfter.body.published).toBe(true);
    expect(pubAfter.body.resultsStatus).toBe('PUBLISHED');
    expect(pubAfter.body.podium[0].team).toBe('Team Quantum');
    expect(pubAfter.body.podium[0].project).toBe('NeuroGrid');
    const addedProject = pubAfter.body.showcase.find(
      (s: { label: string }) => s.label === 'PROJECT 04'
    );
    expect(addedProject.screenshotUrl).toBe(uploadRes.body.url);
  });

  it('serves static portal and admin HTML directly from the Vercel entrypoint without DB dependency', async () => {
    const home = await request(vercelApp).get('/');
    expect(home.status).toBe(200);
    expect(home.headers['content-type']).toContain('text/html');

    const adminPage = await request(vercelApp).get('/admin');
    expect(adminPage.status).toBe(200);
    expect(adminPage.text).toContain('Admin Login');
  });
});
