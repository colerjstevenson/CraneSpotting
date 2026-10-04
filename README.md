# Crane Spotting

Crane Spotting is a mobile-first crane-spotting game. Step 2 adds Supabase email magic-link authentication and player profiles. The leaderboard remains demo data; camera capture, image storage, AI analysis, and scoring are not implemented.

## Requirements

- Node.js 20.9 or newer
- npm

## Run locally

In PowerShell, from the project folder:

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev
```

Create a Supabase project, enable email authentication, and set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Apply `supabase/migrations/20261004000000_create_users.sql` in the Supabase SQL Editor. Add `http://localhost:3000/auth/confirm` to Supabase's allowed redirect URLs. For deployment, set `APP_URL` to the public site origin and allow its `/auth/confirm` callback URL as well. `APP_URL` is also used for metadata and magic-link redirects.

Email templates should use Supabase's standard confirmation link so the redirect returns to `/auth/confirm` with the PKCE code. The profile trigger stores the signup username and display name; public profile reads are enabled for future leaderboard use.

Before sharing the app publicly, configure Supabase Auth email rate limits and CAPTCHA to reduce magic-link abuse.

Run checks with:

```powershell
npm.cmd run lint
npm.cmd run build
```

## Cloudflare Workers

The existing Next.js commands remain available. The Cloudflare deployment uses vinext alongside them:

```powershell
npx.cmd vinext check
npm.cmd run dev:vinext
npm.cmd run build:vinext
npm.cmd run start:vinext -- --host 127.0.0.1 --port 4173
```

Run the build before starting the local Workers preview. To deploy manually, use `npm.cmd run deploy:vinext`; append `-- --dry-run` to validate the deployment configuration without publishing.

For Cloudflare Workers Builds, configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the build environment. Configure those values and `APP_URL` in the Worker runtime environment as well. Set `APP_URL` to the public HTTPS origin so magic-link redirects and metadata use the deployed site. Do not add Supabase service-role keys to this app.

## Routes

- `/` - Home screen and illustrative leaderboard preview.
- `/leaderboard` - Demo standings, not live player data.
- `/signup` and `/login` - Request a magic link for a new or existing account.
- `/auth/confirm` - Verify the emailed link and establish the session.
- `/submit` - Placeholder protected by authentication; it does not access the camera or upload images.

The example standings are presentation-only data in `src/lib/demo-data.ts`. Crane submissions, camera access, AI, scoring, and PWA behavior are not connected yet.
