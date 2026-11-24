import { z } from 'zod';

const optionalUrl = z
  .string()
  .trim()
  .refine(
    (val) => val === '' || val.startsWith('/uploads/') || /^https?:\/\/.+/.test(val),
    'Must be an empty string, /uploads/ path, or valid http(s) URL'
  );

export const loginSchema = z
  .object({
    email: z.string().trim().min(1).optional(),
    username: z.string().trim().min(1).optional(),
    password: z.string().min(1),
  })
  .refine((d) => Boolean(d.email || d.username), {
    message: 'Either username or email is required',
  });

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, 'New password must be at least 8 characters'),
});

export const updateConfigSchema = z
  .object({
    eventName: z.string().trim().min(1).max(120).optional(),
    eventTagline: z.string().trim().min(1).max(200).optional(),
    chapterLabel: z.string().trim().min(1).max(100).optional(),
    campusLocation: z.string().trim().min(1).max(160).optional(),
    eventDate: z.string().trim().min(1).max(120).optional(),
    venue: z.string().trim().min(1).max(200).optional(),
    releaseLabel: z.string().trim().min(1).max(100).optional(),
    releaseDateText: z.string().trim().min(1).max(160).optional(),
    problemsReleased: z.boolean().optional(),
    problemsIntro: z.string().trim().min(1).max(1000).optional(),
    scheduleIntro: z.string().trim().min(1).max(1000).optional(),
    scheduleFooterNote: z.string().trim().max(500).optional(),
    resultsStatus: z.string().trim().min(1).max(100).optional(),
    resultsPublished: z.boolean().optional(),
    resultsIntro: z.string().trim().min(1).max(1000).optional(),
    showShowcase: z.boolean().optional(),
    briefHeadline: z.string().trim().min(1).max(300).optional(),
    briefSummary: z.string().trim().min(1).max(2000).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided',
  });

export const toggleReleaseProblemsSchema = z.object({
  released: z.boolean(),
});

export const togglePublishResultsSchema = z.object({
  published: z.boolean(),
  resultsStatus: z.string().trim().min(1).max(100).optional(),
  showShowcase: z.boolean().optional(),
});

export const createTrackSchema = z.object({
  num: z.string().trim().min(1).max(16),
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().default(''),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateTrackSchema = createTrackSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'At least one field must be provided' }
);

export const createStatementSchema = z.object({
  code: z.string().trim().min(1).max(32),
  trackId: z.number().int().positive(),
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(10000),
  constraints: z.string().trim().max(5000).optional().default(''),
  evaluationNotes: z.string().trim().max(5000).optional().default(''),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateStatementSchema = createStatementSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'At least one field must be provided' }
);

export const createScheduleDaySchema = z.object({
  num: z.string().trim().min(1).max(16),
  name: z.string().trim().min(1).max(100),
  dateLabel: z.string().trim().min(1).max(100),
  summary: z.string().trim().min(1).max(500),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateScheduleDaySchema = createScheduleDaySchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'At least one field must be provided' }
);

export const createScheduleItemSchema = z.object({
  time: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(200),
  note: z.string().trim().max(1000).optional().default(''),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateScheduleItemSchema = createScheduleItemSchema
  .extend({ dayId: z.number().int().positive().optional() })
  .partial()
  .refine((d) => Object.keys(d).length > 0, {
    message: 'At least one field must be provided',
  });

export const upsertPodiumSchema = z.object({
  placeLabel: z.string().trim().min(1).max(60).optional(),
  numLabel: z.string().trim().min(1).max(16).optional(),
  teamName: z.string().trim().min(1).max(200),
  projectTitle: z.string().trim().min(1).max(250),
  trackName: z.string().trim().max(200).optional().default(''),
  projectUrl: optionalUrl.optional().default(''),
  repoUrl: optionalUrl.optional().default(''),
});

export const createShowcaseSchema = z.object({
  label: z.string().trim().min(1).max(60),
  title: z.string().trim().min(1).max(250),
  teamName: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().default(''),
  trackName: z.string().trim().max(200).optional().default(''),
  screenshotUrl: optionalUrl.optional().default(''),
  demoUrl: optionalUrl.optional().default(''),
  repoUrl: optionalUrl.optional().default(''),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateShowcaseSchema = createShowcaseSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'At least one field must be provided' }
);

export const createBriefSectionSchema = z.object({
  num: z.string().trim().min(1).max(16),
  heading: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(5000),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateBriefSectionSchema = createBriefSectionSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'At least one field must be provided' }
);

export const createFaqSchema = z.object({
  question: z.string().trim().min(1).max(400),
  answer: z.string().trim().min(1).max(4000),
  category: z.string().trim().min(1).max(80).optional().default('General'),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const updateFaqSchema = createFaqSchema.partial().refine(
  (d) => Object.keys(d).length > 0,
  { message: 'At least one field must be provided' }
);
