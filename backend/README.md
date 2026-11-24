# COGNIX '26 — Hackathon Portal Backend API (MySQL)

Node.js + Express + TypeScript + **MySQL (`mysql2/promise`)** CMS, Admin Dashboard, and Live Public Portal powering **COGNIX '26 (ACM KLH Student Chapter, Bachupally)**.

## Features
- **Live Public Portal (`/`) & Admin CMS Dashboard (`/admin`)** styled strictly to the **ACM KLH Visual Identity & Colour Reference (2026–27)**.
- **MySQL 8.0+ Storage** with connection pooling (`mysql2/promise`), automatic schema creation, and idempotent seeding on startup (standalone SQL also provided in [`src/db/schema.sql`](src/db/schema.sql)).
- **Persistent Screenshot Storage in MySQL**: Uploaded showcase screenshots (`POST /api/admin/uploads/screenshot`, up to 5 MB) are stored in the `uploaded_files` (`MEDIUMBLOB`) table and served at `GET /uploads/:filename` — zero local disk dependency, so images survive redeploys on Render, Railway, or Fly.io.
- **Pre-Release Embargo / Gating**:
  - Public `/api/problems` masks unpublished track names and statement content to `"To be announced"` until `problemsReleased` is toggled ON.
  - Public `/api/results` masks winners and showcase details until `resultsPublished` is toggled ON.
- **Admin Auth**: Bearer JWT (`scrypt` salted password hashing + login rate limiting). Accepts either `Admin` or `admin@acmklh.org`.

## MySQL Setup & Local Quick Start

### Option A: Local MySQL via Docker
```bash
cd backend
docker compose up -d
npm install
npm run dev
```

### Option B: Existing Local or Cloud MySQL (Aiven, Railway, TiDB Cloud, AWS RDS)
1. Create a MySQL database (e.g., `cognix_db`).
2. Edit `backend/.env` and set **either** `DATABASE_URL` (recommended for cloud):
   ```env
   DATABASE_URL=mysql://user:password@host:3306/cognix_db?ssl-mode=REQUIRED
   ```
   **or** discrete variables (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`).
3. Start the server (schema tables and defaults auto-initialize on startup):
   ```bash
   cd backend
   npm install
   npm run build
   npm start
   ```

## Deploying to Vercel + Cloud MySQL
1. Create a free cloud MySQL database on **TiDB Cloud Serverless** (recommended for Vercel) or **Aiven for MySQL** and copy its MySQL connection string.
2. Push your repository to GitHub and import the **`backend/`** directory as the Root Directory in Vercel (no custom build override needed — [`vercel.json`](vercel.json) and [`api/index.ts`](api/index.ts) handle routing automatically).
3. Add these Environment Variables in **Vercel → Project Settings → Environment Variables**:
   - `DATABASE_URL` = `mysql://user:password@host:4000/dbname?ssl-mode=REQUIRED`
   - `DB_SSL` = `true`
   - `DB_CONNECTION_LIMIT` = `2`
   - `JWT_SECRET` = *(a long random secret string)*
   - `ADMIN_NAME` = `Admin`
   - `ADMIN_EMAIL` = `admin@acmklh.org`
   - `ADMIN_PASSWORD` = `ACM0206` *(or your production password)*
   - `NODE_ENV` = `production`
4. Deploy! On the first request to `/api/...`, tables and default COGNIX '26 data initialize automatically in MySQL.

## Deployment Checklist (Render / Railway / VPS)
1. Provision a MySQL database (e.g., **Aiven for MySQL**, **TiDB Cloud**, or **Railway MySQL**).
2. Set environment variables on your Node host:
   - `DATABASE_URL` (or `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_SSL=true`)
   - `JWT_SECRET` (long random string)
   - `ADMIN_NAME=Admin`, `ADMIN_EMAIL=admin@acmklh.org`, `ADMIN_PASSWORD=ACM0206` (or your updated password)
   - `NODE_ENV=production`
3. Build command: `npm install && npm run build`
4. Start command: `npm start`

## Scripts
- `npm run dev` — Start development server with hot reload (`tsx watch`)
- `npm run build` — Compile TypeScript to `dist/`
- `npm start` — Run compiled production server
- `npm run seed` — Initialize MySQL schema, seed defaults, and sync admin credentials from `.env`
- `npm test` — Run Vitest + Supertest integration suite
- `npm run typecheck` — TypeScript strict type check

## Default Admin Credentials
- **Admin UI**: `http://localhost:4000/admin`
- **Username**: `Admin` (or `admin@acmklh.org`)
- **Password**: `ACM0206`
