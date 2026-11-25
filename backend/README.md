# COGNIX '26 — Hackathon Portal Backend API (MongoDB)

Node.js + Express + TypeScript + **MongoDB** CMS, Admin Dashboard, and Live Public Portal powering **COGNIX '26 (ACM KLH Student Chapter, Bachupally)**.

## Features
- **Live Public Portal (`/`) & Admin CMS Dashboard (`/admin`)** styled strictly to the **ACM KLH Visual Identity & Colour Reference (2026–27)**.
- **MongoDB / MongoDB Atlas Storage**: Uses the official `mongodb` Node driver with automatic index creation, auto-increment integer IDs (`counters` collection), and idempotent default seeding on startup.
- **Persistent Screenshot Storage in MongoDB**: Uploaded showcase screenshots (`POST /api/admin/uploads/screenshot`) are stored in the `uploaded_files` collection (`Binary`) and served at `GET /uploads/:filename` — zero local disk dependency, fully compatible with Vercel Serverless.
- **Pre-Release Embargo / Gating**:
  - Public `/api/problems` masks unpublished track names and statement content until `problemsReleased` is toggled ON.
  - Public `/api/results` masks winners and showcase details until `resultsPublished` is toggled ON.
- **Admin Auth**: Bearer JWT (`scrypt` salted password hashing + login rate limiting). Accepts `Admin` or `admin@acmklh.org`.

## Deploying to Vercel + MongoDB Atlas
1. Create a free M0 cluster at **https://cloud.mongodb.com** (MongoDB Atlas):
   - Create a database user & password.
   - Under **Network Access**, add IP `0.0.0.0/0` (required so Vercel serverless IPs can connect).
   - Click **Connect → Drivers → Node.js** and copy your `mongodb+srv://...` connection string.
2. In **Vercel → Project Settings → Environment Variables**, add:
   - `MONGODB_URI` = `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/cognix_db?retryWrites=true&w=majority`
   - `MONGODB_DB_NAME` = `cognix_db`
   - `JWT_SECRET` = *(long random secret string)*
   - `ADMIN_NAME` = *(your organizer username)*
   - `ADMIN_EMAIL` = *(your organizer email)*
   - `ADMIN_PASSWORD` = *(strong private password)*
   - `NODE_ENV` = `production`
3. Set **Root Directory** to `backend` and **Redeploy**.

## Local Quick Start
```bash
cd backend
docker compose up -d   # Optional: starts local MongoDB 7 on 127.0.0.1:27017
npm install
npm run dev
```

## Scripts
- `npm run dev` — Start dev server with hot reload (`tsx watch`)
- `npm run build` — Compile TypeScript to `dist/`
- `npm start` — Run compiled production server
- `npm run seed` — Initialize MongoDB indexes, seed defaults, and sync admin credentials from `.env`
- `npm test` — Run Vitest + Supertest integration suite
- `npm run typecheck` — TypeScript strict type check

## Organizer CMS
Access the organizer portal directly at `/admin` using the credentials configured in your environment variables (password can be rotated anytime under **Account**).
