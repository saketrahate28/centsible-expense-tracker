# Centsible — Deployment Guide

Complete deployment options for the Centsible expense tracker.

---

## Option 1 · Emergent (recommended — one click, no setup)

1. Click **Publish** in the top-right of the Emergent editor.
2. Choose a subdomain (e.g. `centsible`).
3. Emergent builds and hosts both the **Expo web app** and the **FastAPI backend** with **MongoDB** attached automatically.
4. Share the public URL. Every subsequent code change → click Publish again to redeploy.

**Environment variables** are already wired in `/app/backend/.env`:
- `MONGO_URL` – managed automatically
- `EMERGENT_LLM_KEY` – Emergent Universal LLM key (works out of the box)
- `JWT_SECRET` – change for production

---

## Option 2 · Deploy the FastAPI backend elsewhere (Render / Railway / Fly.io)

### Render

1. Create a new **Web Service** on [render.com](https://render.com).
2. Connect the GitHub repo, point root dir to `/backend`.
3. **Build command**: `pip install -r requirements.txt`
4. **Start command**: `uvicorn server:app --host 0.0.0.0 --port $PORT`
5. Environment variables:
   - `MONGO_URL` – get a free MongoDB Atlas cluster (or Render's own Postgres alt) and paste the connection string
   - `DB_NAME=centsible_db`
   - `JWT_SECRET=<generate a 32-byte hex>`
   - `EMERGENT_LLM_KEY=<same value used in dev>`
6. Deploy. Note the public URL (e.g. `https://centsible-api.onrender.com`).

### Railway

Same idea:
```bash
railway init
railway up
railway variables set MONGO_URL=... JWT_SECRET=... EMERGENT_LLM_KEY=... DB_NAME=centsible_db
```

### Update Expo to point at the new backend

Edit `frontend/.env`:
```
EXPO_PUBLIC_BACKEND_URL=https://centsible-api.onrender.com
```
Rebuild the app or redeploy on Emergent.

---

## Option 3 · Deploy the original .NET Core backend (showcase portfolio)

Your GitHub repo (`saketrahate28/centsible-expense-tracker`) has the original **.NET Core 10 + PostgreSQL + Clean Architecture** backend. Here's how to deploy it publicly.

### Railway (easiest for .NET + Postgres)

1. Log in to [railway.app](https://railway.app) and click **New Project → Deploy from GitHub**.
2. Pick your repo. Railway auto-detects the .NET Dockerfile.
3. Add a **PostgreSQL** plugin — Railway wires `DATABASE_URL` automatically.
4. Add env variables (from `Docker Compose`):
   - `ASPNETCORE_ENVIRONMENT=Production`
   - `AllowedOrigins=*` (or your Expo web URL)
   - `Jwt__Key=<32+ byte random string>`
   - `ConnectionStrings__Postgres=<use Railway's postgres URL>`
5. Click **Deploy**. Note the public URL.

### Azure App Service (for a "resume gold" showcase)

1. Push repo to GitHub.
2. In Azure Portal → **App Services → Create → Publish: Docker Container** → link to your repo's Dockerfile.
3. Add an **Azure Database for PostgreSQL Flexible Server**.
4. In App Service **Configuration**, add:
   - `ConnectionStrings__Postgres=Host=<pg-host>;Database=centsible;Username=<user>;Password=<pw>`
   - `Jwt__Key=<random>`
   - `AllowedOrigins=*`
5. Enable **HTTPS Only** and set **Custom Domain** if desired.
6. First deploy will run EF migrations automatically via `Program.cs` startup.

### Update Expo frontend

Same as above — set `EXPO_PUBLIC_BACKEND_URL=https://your-dotnet-api.azurewebsites.net` in `frontend/.env`.

The endpoints all match (`/api/Auth/login`, `/api/Transactions/dashboard`, etc.) so the app just works.

---

## Option 4 · Deploy Expo frontend to Vercel

If you want the Expo web build separately from Emergent (e.g. custom domain, higher CDN limits):

1. `cd /app/frontend`
2. `npx expo export --platform web` — builds static site to `dist/`
3. Push `dist/` to a new GitHub repo or Vercel project.
4. In Vercel, set the build:
   - **Build command**: `yarn expo export --platform web`
   - **Output directory**: `dist`
   - **Env vars**: `EXPO_PUBLIC_BACKEND_URL=<your backend URL>`

---

## Building mobile APK / IPA

The Emergent **Publish** flow lets you also generate signed Android APK and iOS IPA builds:

1. Click Publish → **Mobile builds** tab.
2. Provide:
   - **iOS**: Apple Developer account credentials (Team ID + App-Specific Password)
   - **Android**: Nothing — Emergent handles Google Play internal signing
3. Download the artifact and upload to Play Console / App Store Connect.

For **push notifications**, `google-services.json` from Firebase is required at build time and configured via Emergent Publish dialog (feature not built in v1 — deferred per PRD).

---

## Post-deployment checklist

- [ ] Change `JWT_SECRET` from dev default in `.env`
- [ ] Rotate `EMERGENT_LLM_KEY` if repo goes public
- [ ] Set CORS `allow_origins` in `server.py` to your Expo web domain
- [ ] Enable MongoDB Atlas IP allowlist / VPC peering
- [ ] Set up a status page (StatusCake / Better Uptime) hitting `/api/health`
- [ ] Add a `robots.txt` and OG meta tags in `app.json`

---

## Rollback

Emergent commits every change; use the **Rollback** button in the editor to revert to any previous checkpoint at no cost. Never `git reset` inside the environment.
