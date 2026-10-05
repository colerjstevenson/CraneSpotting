# Crane Spotting

Crane Spotting is a mobile-first crane-spotting game. It uses Supabase email magic-link authentication, private photo storage, server-side crane analysis, and deterministic scoring. The leaderboard remains demo data until the live leaderboard step is completed.

## Requirements

- Node.js 20.9 or newer
- npm

## Run locally

In PowerShell, from the project folder:

```powershell
Copy-Item .env.example .env.local
npm.cmd install
npm.cmd run dev:vinext
```

Create a Supabase project, enable email authentication, and set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and the server-only `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. Apply the migrations in `supabase/migrations` in filename order. Add `http://localhost:3000/auth/confirm` to Supabase's allowed redirect URLs. For deployment, set `APP_URL` to the public site origin and allow its `/auth/confirm` callback URL as well. `APP_URL` is also used for metadata and magic-link redirects.

Crane analysis uses Cloudflare Workers AI's Clef vision model through the binding configured in `cloudflare.config.ts`; no separate AI API key is needed. Workers AI includes 10,000 Neurons per day on the free plan, shared across your account. Requests stop when the free daily allocation is exceeded. A 512px analysis copy is sent to Cloudflare; the full-resolution photo is stored in Supabase.

Keep `SUPABASE_SERVICE_ROLE_KEY` server-only: never prefix it with `NEXT_PUBLIC_`, expose it to the browser, or commit it. The server uses it only after authenticating the player and validating the result.

Email templates should use Supabase's standard confirmation link so the redirect returns to `/auth/confirm` with the PKCE code. The profile trigger stores the signup username and display name; public profile reads are enabled for future leaderboard use.

Before sharing the app publicly, configure Supabase Auth email rate limits and CAPTCHA to reduce magic-link abuse.

Run checks with:

```powershell
npm.cmd run lint
npm.cmd test
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

For Cloudflare Workers Builds, configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the build environment. Configure those values, `APP_URL`, and `SUPABASE_SERVICE_ROLE_KEY` in the Worker runtime environment. Set `APP_URL` to the public HTTPS origin so magic-link redirects and metadata use the deployed site. The `AI` binding is declared in `cloudflare.config.ts`; do not add AI credentials.

## Routes

- `/` - Home screen and illustrative leaderboard preview.
- `/leaderboard` - Demo standings, not live player data.
- `/signup` and `/login` - Request a magic link for a new or existing account.
- `/auth/confirm` - Verify the emailed link and establish the session.
- `/submit` - Protected camera flow; analyzes photos server-side and scores verified crane sightings.

The example standings are presentation-only data. Submission scores are calculated on the server, and completed analyses count toward the daily attempt limit; rejected photos do not become crane submissions.
