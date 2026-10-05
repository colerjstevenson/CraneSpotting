# Crane Spotting

## 1. Concept

Build a mobile-first web app called **Crane Spotting**.

Crane Spotting is a deliberately silly competitive game where players go out into the real world, photograph cranes using their phone camera, and submit them to the website. An AI analyzes the photograph, determines what kind of crane it contains, assigns it a score, and adds those points to the player's lifetime Crane Spotting total.

All players compete on **one global leaderboard**. There are no separate leagues.

The goal is to make crane spotting into a simple, fun, collectible competition.

The app should feel polished and playful, but not overly complicated.

---

# 2. Core Rules

### Accounts

Players must create an account before submitting cranes.

Each player has:

* username
* display name
* email/authentication information
* total Crane Points
* number of cranes submitted
* highest-scoring crane
* global leaderboard rank

### Global competition

There is only one Crane Spotting leaderboard.

A player's position is determined by the total points from all of their accepted crane submissions.

Example:

```text
1. Sarah       1,284 points
2. Mike        1,193 points
3. Cole        1,147 points
4. Jessica       871 points
```

### Daily submission limit

Each player may submit a maximum of **3 cranes per calendar day**.

The limit must be enforced server-side, not only through the frontend.

The UI should clearly show something like:

```text
2 / 3 cranes submitted today
```

After the third submission:

```text
You've used all 3 crane submissions for today.

Come back tomorrow.
```

The limit resets at 00:00 UTC.

---

# 3. Camera-Only Submission

The app is primarily designed for mobile phones.

Players should submit cranes by taking a photograph with their device's camera.

Do NOT provide a normal "Choose from Library" or gallery-upload button in the normal submission flow.

The desired flow is:

```text
Submit a Crane
       ↓
Open Camera
       ↓
Take Photograph
       ↓
Review Photograph
       ↓
Submit
       ↓
AI Analysis
       ↓
Crane Score
```

The app should request camera permission when necessary.

The submission UI should be optimized for a phone held vertically.

For the initial version, this should be a mobile-first web app/PWA rather than a native iOS or Android application.

---

# 4. Crane Types

The AI needs to distinguish between several categories.

At minimum:

### Bird crane

Examples include real crane species such as:

* Sandhill cranes
* Whooping cranes
* Grey/Gray cranes
* Demoiselle cranes
* other birds that are actually cranes

### Construction crane

Examples include:

* tower cranes
* mobile cranes

### Crane artwork

Physical paintings, sculptures, statues, illuminated installations, and other artwork depicting crane birds or construction cranes count when photographed in their real-world setting. They receive a small fixed artwork score, lower than a real crane. A screenshot or photo of a digital reproduction does not qualify as real-world artwork.


### Master Crane

Recognize **Master Crane from Kung Fu Panda** as a special category.

Master Crane should receive a very large bonus.

### Not a crane

Images that do not contain a crane should not receive points.

The AI should also try to avoid confusing unrelated birds such as herons, storks, or egrets with actual cranes.

---

# 5. AI Architecture

Do NOT train a custom machine-learning model for the first version.

Use an existing vision-capable AI service/API.

The AI's job is primarily classification and image analysis.

The AI should return structured information similar to:

```json
{
  "is_crane": true,
  "crane_type": "bird",
  "confidence": 0.94,
  "master_crane": false,
  "prominence": 0.91
}
```

For Master Crane:

```json
{
  "is_crane": true,
  "crane_type": "master_crane",
  "confidence": 0.99,
  "master_crane": true,
  "prominence": 0.95
}
```

If there is no crane:

```json
{
  "is_crane": false,
  "crane_type": "none",
  "confidence": 0.98
}
```

Keep the AI integration isolated behind an `analyzeCrane()` service/function so the vision provider can be replaced later without redesigning the application.

---

# 6. Scoring System

The AI determines what is in the image.

Normal application code determines the score.

Do NOT have the AI directly decide the final number of points.

The scoring system should be deterministic and easy to modify.

Initial example:

```text
Base crane                         +10

Bird crane                         +30
Construction crane                 +10

Large/prominent crane               +10
Full crane clearly visible          +10
Interesting composition             +10
Multiple cranes                     +5 each

Master Crane                       +100
```

The exact scoring values should be stored in one easy-to-edit scoring function/configuration rather than scattered throughout the application.

The score should NOT be capped at 100.

Master Crane should be capable of producing an absurdly high score.

The scoring system is intentionally subjective and humorous.

---

# 7. Crane Submission Record

Every accepted submission should store:

```text
id
user_id
image_url
crane_type
ai_confidence
score
score_breakdown
created_at
```

Example `score_breakdown`:

```json
{
  "base_crane": 10,
  "bird_crane_bonus": 30,
  "full_body_bonus": 10,
  "prominence_bonus": 10,
  "crane_energy_bonus": 15
}
```

The score should be saved when the crane is submitted.

If the scoring rules are changed later, old submissions should not automatically change scores.

---

# 8. User Profile

Each user should have a profile page showing:

```text
COLE STEVENSON

Global Rank
#4

Crane Points
1,147

Cranes Submitted
31

Best Crane
187 points
```

Below that, show a gallery of their submitted cranes.

Each crane should display:

* photograph
* score
* crane type
* submission date

Clicking a crane should open its Crane Report.

---

# 9. Crane Report

After submitting a crane, show a fun analysis screen.

Example:

```text
CRANE DETECTED

BIRD CRANE

93 POINTS

+10  Base crane
+30  Bird crane
+10  Full body visible
+18  Excellent crane posture
+25  Exceptional crane energy

GLOBAL RANK: #37

2 submissions remaining today
```

The wording can be humorous.

Master Crane should receive a special presentation:

```text
MASTER CRANE DETECTED

This is not merely a crane.

This is MASTER CRANE.

+100 Master Crane
+25 Kung Fu Panda
+20 Exceptional crane presence

CRANE SCORE

145
```

---

# 10. Leaderboard

The main page should prominently feature the global leaderboard.

Display:

```text
CRANE SPOTTING

GLOBAL LEADERBOARD

#    PLAYER          POINTS

1    Sarah           1,284
2    Mike            1,193
3    Cole            1,147
4    Jessica           871
5    Dave              422
```

The current user's position should be easy to find.

The leaderboard should update after a successful submission.

Also display:

* total players
* total cranes submitted
* highest-scoring crane

Potential future statistics can be added later.

---

# 11. Home Page

The home page should immediately communicate the concept.

Suggested structure:

```text
CRANE SPOTTING

Photograph cranes.
Earn points.
Climb the leaderboard.

[ JOIN CRANE SPOTTING ]

[ VIEW LEADERBOARD ]
```

If the user is logged in:

```text
[ SUBMIT A CRANE ]
[ VIEW LEADERBOARD ]
```

The design should be playful but clean.

Do not make the interface feel like a complicated enterprise dashboard.

---

# 12. Database

Use a relational database.

Recommended initial tables:

### users

```text
id
username
display_name
email/auth provider information
created_at
```

### crane_submissions

```text
id
user_id
image_url
crane_type
ai_confidence
score
score_breakdown
created_at
```

User totals and rankings can be calculated from submissions rather than maintaining duplicate counters unless there is a performance reason to add cached totals later.

---

# 13. Image Storage

Images should be stored using object storage rather than directly inside the database.

The database should store the image URL/path.

Images should be resized/compressed before or during storage to keep storage requirements low.

Set a reasonable maximum upload size.

Example:

```text
Maximum image size: 5 MB
```

---

# 14. Security and Abuse Prevention

The daily submission limit must be enforced by the backend.

Do not trust values supplied by the browser.

Before accepting a submission:

1. Authenticate the user.
2. Count that user's submissions for the current calendar day.
3. Reject the request if they already have 3.
4. Validate the image.
5. Run crane analysis.
6. Calculate score on the server.
7. Store the submission.
8. Update/display the leaderboard.

The client should never be able to submit its own score.

For example, this must NOT be trusted:

```json
{
  "score": 999999
}
```

The server must calculate the score itself.

---

# 15. Hosting Requirements

The project should be designed to run entirely on free tiers initially.

Target architecture:

```text
Frontend
→ free static/serverless hosting

Authentication
→ free authentication service

Database
→ free PostgreSQL tier

Image storage
→ free object storage tier

AI
→ external vision API
```

Do not require a dedicated GPU server.

Do not require the developer's personal computer to be online.

The site should have a public URL that can be shared with friends.

The architecture should remain inexpensive for a small group of users.

---

# 16. Mobile PWA

Build the website as a Progressive Web App where practical.

It should:

* work well on iPhone and Android
* be responsive
* support camera access
* be installable to the phone's home screen
* feel like a simple mobile application

Do not require App Store or Google Play distribution for the initial version.

---

# 17. Development Strategy

Build the application in stages.

## Step 1 — Project setup

Create the web application and establish:

* TypeScript
* frontend framework
* styling system
* environment variable configuration
* basic routing
* mobile responsive layout

Do not implement AI yet.

---

## Step 2 — Authentication

Implement:

* sign up
* login
* logout
* session handling
* protected pages

Create the user record.

---

## Step 3 — Public hosting and shareable preview (next)

Deploy the current application before building the remaining game features so it has a public HTTPS URL that can be shared with friends.

Use **Cloudflare Workers for the application** and keep **Supabase for authentication and PostgreSQL**. Target Cloudflare's free Workers tier initially, subject to its usage limits. Use Workers rather than a static Cloudflare Pages export because the current application requires server-side authentication.

Cloudflare currently recommends **vinext** for deploying Next.js-compatible applications to Workers. It is in beta, so check compatibility before migrating and verify server actions, the authentication callback, cookie handling, and `proxy.ts` in the Workers runtime. If a required feature is incompatible, resolve the deployment approach before proceeding rather than removing authentication protections to make the build pass.

Deployment checklist:

1. Run the vinext compatibility check and resolve any required-feature gaps before migrating.
2. Configure the Workers build and deployment tooling, then verify a production build in the local Workers runtime.
3. Connect the GitHub repository to Cloudflare Workers Builds and enable automatic deployments from the main branch. Create and publish the repository first if needed.
4. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, and `APP_URL` in the required build and runtime environments. Set `APP_URL` to the final public HTTPS origin. Never commit secrets or expose a Supabase service-role key to the browser. Keep any deployment credentials out of the repository.
5. Confirm the existing users migration is applied to the hosted Supabase database and its security rules are enabled.
6. Set Supabase's production Site URL and allow the exact public `/auth/confirm` callback URL. Keep the localhost callback for development; do not use broad production redirect wildcards.
7. Configure authentication email rate limits and verify CAPTCHA enforcement before opening signup broadly. Verify email delivery to the intended testers; configure a production email provider if Supabase's default sender restrictions prevent those users from signing in.
8. Run lint and the Workers production build, then deploy and test signup, emailed magic links, login, logout, session refreshing, and protected routes on the public URL, including on a phone.
9. Confirm the public site remains reachable while the developer's computer is offline, then share the URL.

This release is a **preview**, not the complete game. The leaderboard remains clearly labeled demo data, and camera capture, crane submissions, AI analysis, and scoring are not yet available. Sharing the site should not imply those features work.

Done when a friend can open the HTTPS link and sign in successfully without the local development server running. A custom domain is optional and not required for this step.

---

## Step 4 — Database

Create the `users` and `crane_submissions` tables.

Set up the relationship between users and submissions.

Add appropriate database security rules.

---

## Step 5 — Leaderboard

Build the global leaderboard using submission totals.

Implement:

* ranking
* total points
* number of submissions
* current user's rank

Use real database data.

---

## Steps 6-7 — Camera submission and image storage

Build the mobile camera interface and store each submitted photograph.

The player should:

1. Tap "Submit a Crane."
2. Open the camera.
3. Take a photograph.
4. Review or retake it.
5. Submit it.

Enforce the three-per-day limit on the server, resetting at 00:00 UTC. For development, initially allow the analysis result to be mocked.

Resize and compress photos before storage, with a maximum image size of 5 MB. Store images in private object storage and keep only the image path and submission details in PostgreSQL. Do not store full image data inside PostgreSQL.

---

## Step 8 — AI analysis and scoring

Create a dedicated crane-analysis service.

Example conceptual function:

```typescript
analyzeCrane(image): CraneAnalysis
```

Keep the implementation isolated from the rest of the application.

The service should return structured crane classification data, including:

* crane type, confidence, prominence, visibility, composition, and crane count
* crane type may be `bird`, `construction`, `artwork`, `master_crane`, or `none`
* capture context: direct real-world scene, physical display, digital reproduction, or uncertain
* whether visible evidence suggests stock or reused photography

Use visible evidence only; AI cannot prove where an image came from. Suspected stock photos and photos of existing pictures should earn reduced points. Apply an authenticity multiplier in the scoring function: 1.0 for a direct real-world scene, 0.5 for a physical display photographed in context (such as a poster), 0.25 for obvious digital/reused imagery, and 0.75 when context is uncertain.

Master Crane only qualifies when represented physically in the real world and photographed in context. A photo of a physical poster can earn a reduced Master Crane bonus; a movie screenshot or isolated digital image is not a valid Master Crane spotting and receives no Master Crane points.

Physical crane artwork (including paintings of birds or equipment and sculptures/installation art) receives a fixed +10 artwork score before the authenticity multiplier. It does not receive the normal bird or construction bonus, keeping it below real-crane scores.

The server must validate the model response and calculate every score. The model must never supply the final score.

Completed analyses that reject a photo (not a crane, confidence below 0.70, or a Master Crane digital reproduction) consume one daily attempt. Provider failures do not consume an attempt. Rejected photos are not retained and do not create a crane submission or affect player totals.

---

Implement a server-side scoring function:

```typescript
calculateCraneScore(analysis): CraneScore
```

Keep all scoring rules together and easy to modify.

The scoring engine should produce both:

* final score
* score breakdown

---

## Step 9 — Crane Report

Create the results screen showing:

* crane type
* score
* score breakdown
* humorous analysis
* user's new global rank
* remaining daily submissions

Make Master Crane visually special.

---

## Step 10 — Profiles and crane gallery

Create user profiles showing:

* total points
* global rank
* number of submissions
* best crane
* crane gallery
* the ability to hide or show each gallery photo without changing its score or the player's totals

---

## Step 11 — Polish

Add:

* loading states
* camera permission handling
* animations
* responsive design
* install-to-home-screen support, with new icon using our crane svgs
* the ability to Ch


---

# 18. Important Design Principle

Keep the application divided into three independent systems:

```text
CRANE SPOTTING WEB APP
        │
        ├── Users / Database / Leaderboard
        │
        ├── Camera / Image Submission
        │
        └── Crane Analysis
                  │
                  ▼
             Vision AI
```

The vision AI should be replaceable.

Do not tightly couple the website to a particular AI provider.

The first goal is to make the game work.

The AI can become more sophisticated later without requiring the website to be rebuilt.

---

# 19. Future Features — Do Not Build Yet

Potential future additions:

* achievements
* Crane of the Day
* weekly rankings
* all-time records
* rare crane types
* Master Crane sightings
* crane streaks
* badges
* player statistics
* crane rarity
* voting on particularly good cranes
* custom humorous AI-generated Crane Reports
* learned/ranking-based crane scoring

These should NOT be implemented in the initial version unless they are required by the core functionality.

Focus the first version on:

**Account → Camera → Crane → AI → Points → Leaderboard.**
