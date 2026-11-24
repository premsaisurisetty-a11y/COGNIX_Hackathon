import { hashPassword } from '../utils/password';
import type { DbClient } from './types';

const MYSQL_TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS event_config (
    id INT PRIMARY KEY,
    event_name VARCHAR(120) NOT NULL,
    event_tagline VARCHAR(200) NOT NULL,
    chapter_label VARCHAR(100) NOT NULL,
    campus_location VARCHAR(160) NOT NULL,
    event_date VARCHAR(120) NOT NULL,
    venue VARCHAR(200) NOT NULL,
    release_label VARCHAR(100) NOT NULL,
    release_date_text VARCHAR(160) NOT NULL,
    problems_released TINYINT(1) NOT NULL DEFAULT 0,
    problems_intro TEXT NOT NULL,
    schedule_intro TEXT NOT NULL,
    schedule_footer_note VARCHAR(500) NOT NULL,
    results_status VARCHAR(100) NOT NULL DEFAULT 'TO BE ANNOUNCED',
    results_published TINYINT(1) NOT NULL DEFAULT 0,
    results_intro TEXT NOT NULL,
    show_showcase TINYINT(1) NOT NULL DEFAULT 1,
    brief_headline VARCHAR(300) NOT NULL,
    brief_summary TEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS tracks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    num VARCHAR(16) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS problem_statements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(32) NOT NULL UNIQUE,
    track_id INT NOT NULL,
    title VARCHAR(300) NOT NULL,
    body MEDIUMTEXT NOT NULL,
    constraints_text TEXT NOT NULL,
    evaluation_notes TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_problem_statements_track_id (track_id),
    CONSTRAINT fk_problem_statements_track FOREIGN KEY (track_id)
      REFERENCES tracks(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS schedule_days (
    id INT AUTO_INCREMENT PRIMARY KEY,
    num VARCHAR(16) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    date_label VARCHAR(100) NOT NULL,
    summary VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS schedule_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    day_id INT NOT NULL,
    time_label VARCHAR(60) NOT NULL,
    title VARCHAR(200) NOT NULL,
    note TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_schedule_items_day_id (day_id),
    CONSTRAINT fk_schedule_items_day FOREIGN KEY (day_id)
      REFERENCES schedule_days(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS podium_results (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rank_num INT NOT NULL UNIQUE,
    place_label VARCHAR(60) NOT NULL,
    num_label VARCHAR(16) NOT NULL,
    team_name VARCHAR(200) NOT NULL,
    project_title VARCHAR(250) NOT NULL,
    track_name VARCHAR(200) NOT NULL DEFAULT '',
    project_url VARCHAR(500) NOT NULL DEFAULT '',
    repo_url VARCHAR(500) NOT NULL DEFAULT '',
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS showcase_projects (
    id INT AUTO_INCREMENT PRIMARY KEY,
    label VARCHAR(60) NOT NULL,
    title VARCHAR(250) NOT NULL,
    team_name VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    track_name VARCHAR(200) NOT NULL DEFAULT '',
    screenshot_url VARCHAR(500) NOT NULL DEFAULT '',
    demo_url VARCHAR(500) NOT NULL DEFAULT '',
    repo_url VARCHAR(500) NOT NULL DEFAULT '',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS brief_sections (
    id INT AUTO_INCREMENT PRIMARY KEY,
    num VARCHAR(16) NOT NULL,
    heading VARCHAR(200) NOT NULL,
    body TEXT NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS faqs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    question VARCHAR(400) NOT NULL,
    answer TEXT NOT NULL,
    category VARCHAR(80) NOT NULL DEFAULT 'General',
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS admins (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(191) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(40) NOT NULL DEFAULT 'admin',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,

  `CREATE TABLE IF NOT EXISTS uploaded_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    filename VARCHAR(255) NOT NULL UNIQUE,
    mime_type VARCHAR(100) NOT NULL,
    size_bytes INT NOT NULL,
    data MEDIUMBLOB NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const SQLITE_TEST_TABLES: string[] = [
  `CREATE TABLE IF NOT EXISTS event_config (
    id INTEGER PRIMARY KEY,
    event_name TEXT NOT NULL,
    event_tagline TEXT NOT NULL,
    chapter_label TEXT NOT NULL,
    campus_location TEXT NOT NULL,
    event_date TEXT NOT NULL,
    venue TEXT NOT NULL,
    release_label TEXT NOT NULL,
    release_date_text TEXT NOT NULL,
    problems_released INTEGER NOT NULL DEFAULT 0,
    problems_intro TEXT NOT NULL,
    schedule_intro TEXT NOT NULL,
    schedule_footer_note TEXT NOT NULL,
    results_status TEXT NOT NULL DEFAULT 'TO BE ANNOUNCED',
    results_published INTEGER NOT NULL DEFAULT 0,
    results_intro TEXT NOT NULL,
    show_showcase INTEGER NOT NULL DEFAULT 1,
    brief_headline TEXT NOT NULL,
    brief_summary TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    num TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS problem_statements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT NOT NULL UNIQUE,
    track_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    constraints_text TEXT NOT NULL DEFAULT '',
    evaluation_notes TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS schedule_days (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    num TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    date_label TEXT NOT NULL,
    summary TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS schedule_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    day_id INTEGER NOT NULL,
    time_label TEXT NOT NULL,
    title TEXT NOT NULL,
    note TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (day_id) REFERENCES schedule_days(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS podium_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    rank_num INTEGER NOT NULL UNIQUE,
    place_label TEXT NOT NULL,
    num_label TEXT NOT NULL,
    team_name TEXT NOT NULL,
    project_title TEXT NOT NULL,
    track_name TEXT NOT NULL DEFAULT '',
    project_url TEXT NOT NULL DEFAULT '',
    repo_url TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS showcase_projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    label TEXT NOT NULL,
    title TEXT NOT NULL,
    team_name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    track_name TEXT NOT NULL DEFAULT '',
    screenshot_url TEXT NOT NULL DEFAULT '',
    demo_url TEXT NOT NULL DEFAULT '',
    repo_url TEXT NOT NULL DEFAULT '',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS brief_sections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    num TEXT NOT NULL,
    heading TEXT NOT NULL,
    body TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS admins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'admin',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS uploaded_files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    data BLOB NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
];

export async function initializeSchema(db: DbClient): Promise<void> {
  const statements = db.dialect === 'mysql' ? MYSQL_TABLES : SQLITE_TEST_TABLES;
  for (const sql of statements) {
    await db.execute(sql);
  }
}

export interface SeedOptions {
  adminEmail: string;
  adminPassword: string;
  adminName: string;
}

export async function seedDefaultsIfEmpty(db: DbClient, options: SeedOptions): Promise<void> {
  const existingConfig = await db.queryOne<{ id: number }>(
    'SELECT id FROM event_config WHERE id = 1'
  );
  if (!existingConfig) {
    await db.execute(
      `INSERT INTO event_config (
        id, event_name, event_tagline, chapter_label, campus_location,
        event_date, venue, release_label, release_date_text,
        problems_released, problems_intro, schedule_intro, schedule_footer_note,
        results_status, results_published, results_intro, show_showcase,
        brief_headline, brief_summary
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'TO BE ANNOUNCED', 0, ?, 1, ?, ?)`,
      [
        'COGNIX ’26',
        'COGNIX ’26 — WORKING EVENT NAME',
        'STUDENT CHAPTER',
        'Bachupally, Hyderabad',
        'To be announced',
        'Venue to be announced',
        'RELEASED FRIDAY',
        'Friday, date to be announced',
        'Statements are grouped by track. Pick one and build an intelligent full-stack application around it.',
        'Problem statements go out on Friday. The hackathon runs on Saturday.',
        'TIMINGS TO BE CONFIRMED. THIS PAGE WILL BE UPDATED AS THE SCHEDULE IS FINALISED.',
        'Winning teams are announced at the close of the Saturday hackathon.',
        'Build an intelligent full-stack application in one weekend.',
        'Hosted by ACM KLH Student Chapter, Bachupally, Hyderabad. Problem statements are released on Friday and teams build, submit, and demo on Saturday.',
      ]
    );
  }

  const trackCount = await db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM tracks');
  if (!trackCount || Number(trackCount.count) === 0) {
    const pendingBody =
      'The full problem description, constraints and evaluation notes will be published here when statements are released on Friday.';

    const t1 = await db.execute(
      'INSERT INTO tracks (num, name, description, sort_order) VALUES (?, ?, ?, ?)',
      ['01', 'Track name to be announced', '', 1]
    );
    await db.execute(
      'INSERT INTO problem_statements (code, track_id, title, body, constraints_text, evaluation_notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['PS-01', t1.insertId, 'Statement title to be announced', pendingBody, '', '', 1]
    );
    await db.execute(
      'INSERT INTO problem_statements (code, track_id, title, body, constraints_text, evaluation_notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['PS-02', t1.insertId, 'Statement title to be announced', pendingBody, '', '', 2]
    );

    const t2 = await db.execute(
      'INSERT INTO tracks (num, name, description, sort_order) VALUES (?, ?, ?, ?)',
      ['02', 'Track name to be announced', '', 2]
    );
    await db.execute(
      'INSERT INTO problem_statements (code, track_id, title, body, constraints_text, evaluation_notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['PS-03', t2.insertId, 'Statement title to be announced', pendingBody, '', '', 1]
    );
    await db.execute(
      'INSERT INTO problem_statements (code, track_id, title, body, constraints_text, evaluation_notes, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
      ['PS-04', t2.insertId, 'Statement title to be announced', pendingBody, '', '', 2]
    );
  }

  const dayCount = await db.queryOne<{ count: number }>(
    'SELECT COUNT(*) AS count FROM schedule_days'
  );
  if (!dayCount || Number(dayCount.count) === 0) {
    const d1 = await db.execute(
      'INSERT INTO schedule_days (num, name, date_label, summary, sort_order) VALUES (?, ?, ?, ?, ?)',
      ['01', 'Friday', 'DATE TBA', 'Problem statements released.', 1]
    );
    await db.execute(
      'INSERT INTO schedule_items (day_id, time_label, title, note, sort_order) VALUES (?, ?, ?, ?, ?)',
      [
        d1.insertId,
        'TBA',
        'Problem statement release',
        'All tracks and statements published on the Problem statements page.',
        1,
      ]
    );

    const d2 = await db.execute(
      'INSERT INTO schedule_days (num, name, date_label, summary, sort_order) VALUES (?, ?, ?, ?, ?)',
      ['02', 'Saturday', 'DATE TBA', 'The hackathon.', 2]
    );
    await db.execute(
      'INSERT INTO schedule_items (day_id, time_label, title, note, sort_order) VALUES (?, ?, ?, ?, ?)',
      [d2.insertId, 'TBA', 'Hacking begins', 'Further details to be announced.', 1]
    );
    await db.execute(
      'INSERT INTO schedule_items (day_id, time_label, title, note, sort_order) VALUES (?, ?, ?, ?, ?)',
      [d2.insertId, 'TBA', 'Submissions close', 'Further details to be announced.', 2]
    );
    await db.execute(
      'INSERT INTO schedule_items (day_id, time_label, title, note, sort_order) VALUES (?, ?, ?, ?, ?)',
      [d2.insertId, 'TBA', 'Results announced', 'Winners published on the Results page.', 3]
    );
  }

  const podiumCount = await db.queryOne<{ count: number }>(
    'SELECT COUNT(*) AS count FROM podium_results'
  );
  if (!podiumCount || Number(podiumCount.count) === 0) {
    const defaults: Array<[number, string, string]> = [
      [1, 'FIRST PLACE', '01'],
      [2, 'SECOND PLACE', '02'],
      [3, 'THIRD PLACE', '03'],
    ];
    for (const [rank, place, num] of defaults) {
      await db.execute(
        'INSERT INTO podium_results (rank_num, place_label, num_label, team_name, project_title, track_name, project_url, repo_url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [rank, place, num, 'To be announced', 'Project title to be announced', '', '', '']
      );
    }
  }

  const showcaseCount = await db.queryOne<{ count: number }>(
    'SELECT COUNT(*) AS count FROM showcase_projects'
  );
  if (!showcaseCount || Number(showcaseCount.count) === 0) {
    for (const idx of [1, 2, 3]) {
      await db.execute(
        'INSERT INTO showcase_projects (label, title, team_name, description, track_name, screenshot_url, demo_url, repo_url, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          `PROJECT 0${idx}`,
          'Project title to be announced',
          'Team name to be announced',
          '',
          '',
          '',
          '',
          '',
          idx,
        ]
      );
    }
  }

  const briefCount = await db.queryOne<{ count: number }>(
    'SELECT COUNT(*) AS count FROM brief_sections'
  );
  if (!briefCount || Number(briefCount.count) === 0) {
    const sections: Array<[string, string, string, number]> = [
      [
        '01',
        'Format',
        'Problem statements are grouped by track and published on Friday. Teams select one statement and build an intelligent full-stack application on Saturday.',
        1,
      ],
      [
        '02',
        'Deliverables',
        'A working full-stack prototype, source repository, and live demonstration presented to the judging panel before submissions close.',
        2,
      ],
      [
        '03',
        'Evaluation',
        'Projects are judged on problem fit, technical execution, usability, and real-world impact. Winning teams and featured builds are published on the Results page.',
        3,
      ],
    ];
    for (const [num, heading, body, order] of sections) {
      await db.execute(
        'INSERT INTO brief_sections (num, heading, body, sort_order) VALUES (?, ?, ?, ?)',
        [num, heading, body, order]
      );
    }
  }

  const faqCount = await db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM faqs');
  if (!faqCount || Number(faqCount.count) === 0) {
    const faqs: Array<[string, string, string, number]> = [
      [
        'When are the problem statements released?',
        'All tracks and problem statements are published on the Problem statements page on Friday.',
        'General',
        1,
      ],
      [
        'When does the hackathon take place?',
        'Hacking, submissions, judging, and results announcement take place on Saturday. Exact timings and venue will be posted on the Schedule page.',
        'Schedule',
        2,
      ],
      [
        'Where will winning teams and projects be announced?',
        'Winners and the project showcase are published on the Results page at the close of the Saturday hackathon.',
        'Results',
        3,
      ],
    ];
    for (const [q, a, cat, order] of faqs) {
      await db.execute(
        'INSERT INTO faqs (question, answer, category, sort_order) VALUES (?, ?, ?, ?)',
        [q, a, cat, order]
      );
    }
  }

  const adminCount = await db.queryOne<{ count: number }>('SELECT COUNT(*) AS count FROM admins');
  if (!adminCount || Number(adminCount.count) === 0) {
    await db.execute(
      'INSERT INTO admins (email, name, password_hash, role) VALUES (?, ?, ?, ?)',
      [options.adminEmail.toLowerCase(), options.adminName, hashPassword(options.adminPassword), 'admin']
    );
  }
}
