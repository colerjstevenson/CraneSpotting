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

Player galleries have Cranes and Not Cranes tabs. Apply `20261004000800_rejected_submission_gallery.sql` before running the updated submission flow: rejected photos are now stored on submission attempts, without adding points or cranes to the leaderboard. Older rejected attempts remain visible with an unavailable-photo placeholder because their photos were not previously stored. Owners can hide photos in either tab.

Email templates should link directly to `/auth/confirm` with Supabase's token hash so sign-in works even when the email opens in a different browser or device. The callback also supports older PKCE code links, which require the browser that requested them. The profile trigger stores the signup username and display name; public profile reads are enabled for future leaderboard use.

### Branded authentication emails

The ready-to-paste HTML templates in `supabase/templates` match the site's aqua, blue, yellow, and coral palette. They use inline styles, presentation tables, system-font fallbacks, and no external images or fonts so the message remains readable when remote assets are blocked.

In the Supabase dashboard, open **Authentication > Email Templates** and configure:

| Template | Subject | HTML body |
| --- | --- | --- |
| Confirm sign up | Confirm your email - join the Crane Spotting spotters! | [`confirm-signup.html`](supabase/templates/confirm-signup.html) |
| Magic Link | Your Crane Spotting sign-in link | [`magic-link.html`](supabase/templates/magic-link.html) |

Copy each entire HTML file into its corresponding template body and save. These files are not automatically deployed by the app or database migrations. Keep email confirmation enabled for new accounts. Supabase selects Confirm sign up for a new user and Magic Link for an existing user, including an existing user requesting a link through the signup page.

Keep `{{ .RedirectTo }}&amp;token_hash={{ .TokenHash }}&amp;type=email` unchanged in both the button and fallback link. The app always supplies a `/auth/confirm?next=...` redirect, so the template appends the token hash with `&amp;`. Supabase verifies `type=email` for both signup and sign-in tokens, without requiring the original browser's PKCE verifier cookie. Set Supabase's Site URL to your public `APP_URL` and allow `https://your-site/auth/confirm` and `https://your-site/auth/confirm?next=**` in Redirect URLs (also allow the equivalent localhost URLs for development). Disable click tracking in your SMTP provider so authentication URLs are not rewritten. The templates deliberately avoid a fixed expiry time: Supabase's configured email OTP expiry determines link lifetime.

If every link says it is invalid or expired, paste these updated bodies into **both** Supabase email templates and request a fresh email after deployment. Previously sent emails still use their original links. Callback failures log only an error code/status, never the link or token; inspect Worker logs if fresh links still fail. Email security scanners can consume single-use links, so also check the SMTP provider's link-scanning settings.

Before publishing, request a link from `/signup` with a fresh address and another from `/login` with an existing account. Check the actual delivered emails on desktop and mobile, follow fresh links in both the original browser and a different browser with no existing site cookies, and verify each establishes a session and returns to the requested page (signup defaults to `/submit`). Also check that ignored, expired, and already-used links cannot sign in. A browser HTML preview checks layout only, not email-client compatibility or delivery.

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

In the Cloudflare dashboard, select the `cranespotting` Worker. Add only `SUPABASE_SERVICE_ROLE_KEY` as a runtime secret under Settings > Variables and Secrets. The Supabase URL, publishable key, and `APP_URL` are plain-text bindings defined in `cloudflare.config.ts`; update them there when changing the Supabase project or deployed origin, and keep any dashboard variables identical to avoid strict deployment conflicts. Add the two `NEXT_PUBLIC_SUPABASE_*` values under Settings > Build > Variables and secrets as well, then rebuild and redeploy. The Supabase URL and publishable key are public and may be committed; the service-role key must remain server-only and must never be committed. Local `.env.local` values are not automatically available to hosted builds. If the hosted site says account sign-in is not configured, one or both public Supabase values are missing from its build or runtime environment.

## Routes

- `/` - Home screen and illustrative leaderboard preview.
- `/leaderboard` - Demo standings, not live player data.
- `/signup` and `/login` - Request a magic link for a new or existing account.
- `/auth/confirm` - Verify the emailed link and establish the session.
- `/submit` - Protected camera flow; analyzes photos server-side and scores verified crane sightings.

The example standings are presentation-only data. Submission scores are calculated on the server, and completed analyses count toward the daily attempt limit; rejected photos do not become crane submissions.
