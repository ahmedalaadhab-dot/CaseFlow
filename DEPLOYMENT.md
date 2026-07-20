# Deploying CaseFlow (free tier)

This stack costs $0 and needs no credit card anywhere:

- **Backend** — [Render](https://render.com) free web service (Docker). Spins down after 15 min idle; the next request takes 30-60s to wake it back up. That's the tradeoff for staying free.
- **Database** — [Neon](https://neon.tech) free Postgres. Persistent (no 30-day expiry like Render's own free Postgres), autosuspends after 5 min idle and wakes in ~1s.
- **File storage** — [Cloudflare R2](https://developers.cloudflare.com/r2/) (10GB free, S3-compatible, $0 egress). Documents here are passport/CPR scans, so the backend hands out short-lived signed URLs rather than a public bucket.
- **Frontend** — [Cloudflare Pages](https://pages.cloudflare.com) free static hosting for the Vite build.

Each of these needs an account only you can create (email verification / OAuth) — I can't do that part for you. Everything else (code, configs, the render.yaml blueprint) is already prepared in this repo.

## 1. Neon (database)

1. Sign up at neon.tech, create a project (any region close to your users).
2. Copy the connection string it gives you — it looks like `postgresql://user:pass@ep-xxx.region.aws.neon.tech/dbname?sslmode=require`. Keep the `?sslmode=require` suffix.
3. That's it for now — you'll paste this into Render in step 3.

## 2. Cloudflare R2 (file storage)

1. Sign up at cloudflare.com, go to **R2 Object Storage** in the dashboard, create a bucket (e.g. `caseflow-documents`). No public access needed.
2. Go to **R2 -> Manage API Tokens -> Create API Token**, give it read/write access to that bucket. Save the **Access Key ID** and **Secret Access Key** — shown once.
3. Note your account's R2 **endpoint URL**, shown on the R2 overview page: `https://<account-id>.r2.cloudflarestorage.com`.

## 3. Render (backend)

1. Sign up at render.com, connect your GitHub account, and create a new **Blueprint** pointing at this repo (`caseflow-backend` as the root directory). Render will read `caseflow-backend/render.yaml` and set most config automatically.
2. In the service's **Environment** tab, fill in the vars marked "sync: false" in render.yaml:
   - `DATABASE_URL` — the Neon connection string from step 1
   - `CLIENT_URL` — leave a placeholder for now (`https://example.com`); you'll update it after step 4
   - `S3_BUCKET` — your R2 bucket name
   - `S3_ENDPOINT` — your R2 endpoint URL from step 2
   - `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` — from step 2
   - `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — Render auto-generates these (`generateValue: true`), no action needed
3. Deploy. Render builds the Docker image and runs `prisma migrate deploy` automatically on container start (see `Dockerfile`).
4. Once it's live, open the Render **Shell** tab for the service and bootstrap the real owner account (skip this if you already ran it locally against this same database):
   ```
   OWNER_FIRST_NAME="Habib" OWNER_LAST_NAME="Qasimi" OWNER_EMAIL="ahmedalaadhab@gmail.com" OWNER_PASSWORD="<your password>" npm run seed:production
   ```
5. Note the service's URL, e.g. `https://caseflow-backend.onrender.com`.

## 4. Cloudflare Pages (frontend)

1. In the Cloudflare dashboard, go to **Workers & Pages -> Create -> Pages -> Connect to Git**, pick this repo.
2. Set:
   - **Root directory**: `caseflow-frontend`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment variable**: `VITE_API_URL` = `https://caseflow-backend.onrender.com/api` (your Render URL from step 3, with `/api` appended). Vite bakes this in at build time, so it must be set here, not just in a local `.env`.
3. Deploy. Cloudflare gives you a URL like `https://caseflow.pages.dev` (or attach a custom domain in Pages settings).

## 5. Wire the two together

Go back to Render, update `CLIENT_URL` to the exact Cloudflare Pages URL from step 4 (no trailing slash), and let it redeploy. This is what the backend's CORS check compares against.

## 6. Verify

- Visit the Pages URL, log in with the owner account from step 3.4.
- Create a test case, upload a document, confirm it appears (this round-trips through R2).
- Deactivate/reactivate a user, create a service template — confirms the full stack is wired correctly.
- Expect the *first* request after a period of inactivity to take 30-60s (Render cold start) — that's expected on the free tier, not a bug.

## Local development

Nothing here changes local dev — `STORAGE_DRIVER=local` and a local Postgres still work exactly as before (see each project's own README).
