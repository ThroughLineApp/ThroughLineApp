# THROUGHLINE — SESSION CONTEXT
Paste this at the start of every new Claude chat to resume instantly.

## What Throughline Is
Political transparency platform. Exposes PAC/corporate donations correlated with congressional votes. Draws a literal line from donation date to vote date. Not left/right — money vs people.
Tagline: "Every vote has a price. We show you the receipt."
Business model: free app, no ads. Monetized through media licensing + premium PDF export.

## Live URLs
- Production: https://throughline-next.vercel.app
- GitHub: github.com/ThroughLineApp/ThroughLineApp

## Tech Stack
- Framework: Next.js, Pages Router ONLY (never App Router)
- Project location: C:\Users\mrhea\Projects\throughline-next
- Database: Supabase — busiguukyesnvgriktbu.supabase.co
- Anon key: sb_publishable_ISiDLfrT9y1mXTAn0IA2YA_jrGAz9fy
- Hosting: Vercel
- OS: Windows, VS Code integrated terminal
- Use Remove-Item not rm -rf
- Env variables: .env.local with NEXT_PUBLIC_ prefix

## CRITICAL DEPLOY PROCESS — NEVER SKIP STEP 4
1. git add .
2. git commit -m "message"
3. git push
4. npx vercel --prod
Step 4 is required every time. Without it, changes go to Preview only, not Production.
Branch is "master" not "main".

## File Structure
pages/
  _app.js          — wraps app with AuthProvider, imports from lib/auth
  index.jsx        — homepage
  404.jsx          — branded 404
  sitemap.xml.js   — dynamic sitemap
  quiz.jsx         — 12 question political identity quiz
  politician/
    [slug].jsx     — politician profile page, 7 tabs
  api/
    hello.js       — unused default
lib/
  auth.js          — AuthContext, useAuth, AuthProvider, all auth logic
next.config.mjs
.env.local         — NEVER commit this

## NEVER COMMIT
- pipeline_fec.js
- pipeline_congress.js
- .env files
- Any file with secret keys

## Supabase Tables
- politicians — 538 members, slugs, bioguide IDs, donor_alignment_score (all NULL)
- quiz_results — saves quiz results
- politician_matches — empty, for future use
- throughline_events — empty, waiting on FEC pipeline
- profiles — user accounts (id, email, followed_politicians[], followed_issues[], quiz_result_id)
- politician_score_sources — exists

## Auth System
- Email + password (NOT magic link)
- AuthProvider in lib/auth.js
- useAuth() hook imports from lib/auth
- Supabase email confirmation is OFF (turned off to avoid SMTP issues)
- Profiles table auto-created on signup via fetchOrCreateProfile()
- profiles_provider_check constraint was dropped (was causing 500 errors)

## Design System
- Display font: Barlow Condensed 700/800
- Body font: Inter 400/500
- Editorial font: Playfair Display italic
- Background: #0a0b0d
- Gold (primary): #c9a84c
- Parchment (text): #e8dfc8
- Green: #4ca87c
- Red: #c94c4c
- DAS score colors: green 0-33, gold 34-66, red 67-100

## Current State (March 19, 2026)
WORKING:
- Homepage with live Supabase search
- Politician profile pages — 7 tabs (1-4 mock data, 5-7 placeholder)
- Quiz at /quiz — saves to Supabase
- 404 page
- Sitemap
- Auth — sign up / sign in with email + password, modal opens correctly
- Follow system UI wired to real Supabase profiles table
- Auth context shared across all pages via lib/auth.js

NOT DONE:
- FEC pipeline (pipeline_fec.js) — paused, HTTP errors. May need outsourcing.
- Politician tabs wired to real data — blocked until FEC pipeline runs
- Sign up 422 error needs investigation (Supabase signup returning Unprocessable Content)
- Multiple GoTrueClient warning in console — need to consolidate Supabase client instances
- Phase 3: unified feed, notifications, Worth Watching — not started

## Phase 3 Next Steps (in order)
1. Fix signup 422 error
2. Fix multiple GoTrueClient warning
3. Unified feed
4. Notifications
5. Worth Watching + community submissions

## How To Work With This User
- Non-developer. Plain English only.
- Always provide complete files — never ask user to find and edit specific lines.
- Never say you're doing something when you're not actively doing it.
- Before any setup step, check what already exists first.
- File downloads go to /mnt/user-data/outputs/ — user downloads and pastes into VS Code.
- When giving files for [slug].jsx — the filename must include the square brackets.
