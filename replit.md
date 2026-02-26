# X Marketer

A premium React Native (Expo) multi-tenant app that serves as a daily Twitter/X marketing intelligence tool, powered by Kimi AI via the Moonshot API.

## Architecture

- **Frontend**: Expo Router with file-based routing, React Native
- **Backend**: Express server on port 5000
- **AI**: Moonshot API `kimi-k2.5` model with `$web_search` tool calling for live web research + marketing reports
- **Database**: PostgreSQL via Drizzle ORM (users, reports, schedules tables)
- **Auth**: JWT-based authentication with bcrypt password hashing
- **Storage**: PostgreSQL for persistent multi-user data, SecureStore (native) / localStorage (web) for auth tokens

## Key Features

- Multi-tenant user authentication (register/login/logout)
- Daily X/Twitter marketing intelligence reports scoped per user
- AI-powered trend analysis, tweet drafting, posting time suggestions
- Growth tips and content analysis
- User-defined focus/context for tailored reports (niche, app, subject)
- Image & file attachments (Camera, Photos, Files) sent to Kimi vision for analysis
- Report history stored in PostgreSQL per user
- Real server-side cron scheduler (node-cron) — generates reports automatically at user-configured times
- Web search enabled via `$web_search` builtin — AI can visit App Store links, websites, and research products in real-time
- Multi-turn tool calling loop handles web research automatically (up to 15 iterations)
- Model: `kimi-k2.5` (requires temperature=1), connected via Moonshot API at api.moonshot.ai

## Project Structure

```
app/
  _layout.tsx              - Root layout with fonts, providers, auth gating
  auth.tsx                 - Login/Register screen (premium dark/gold design)
  (tabs)/
    _layout.tsx            - Tab navigation (Today/History/Schedule)
    index.tsx              - Today's report dashboard
    history.tsx            - Past report history (fetched from API)
    schedule.tsx           - Cron job configuration + account/logout
components/
  ReportCard.tsx           - Report section components (Trends, Tweet Ideas, etc.)
  ErrorBoundary.tsx        - Error boundary wrapper
  ErrorFallback.tsx        - Error fallback UI
constants/
  colors.ts               - Premium dark theme with gold accents
lib/
  query-client.ts          - React Query + API utilities (with auth headers)
  auth-context.tsx         - Auth context provider (JWT, SecureStore)
  storage.ts               - Type definitions for reports/schedule
shared/
  schema.ts                - Drizzle ORM schema (users, reports, schedules)
server/
  index.ts                 - Express server setup with CORS (Authorization header)
  routes.ts                - API routes (auth, reports, schedule)
  auth.ts                  - JWT auth middleware + register/login routes
  db.ts                    - PostgreSQL database connection (Drizzle + Neon)
  moonshot.ts              - Moonshot/Kimi AI API integration
  twitter.ts               - X/Twitter API integration (post tweets/threads)
  scheduler.ts             - node-cron scheduler for daily report generation
drizzle.config.ts          - Drizzle Kit configuration
```

## Design System

- **Background**: #080808 (deep black)
- **Surface**: #111111 (dark cards)
- **Gold accent**: #C9A84C (premium gold)
- **Typography**: DM Serif Display (headings), DM Sans (body)
- **Theme**: Dark, cinematic, editorial
- **No emojis** — uses @expo/vector-icons exclusively

## Environment Variables

- `MOONSHOT_API_KEY` - Moonshot API key for Kimi AI access (secret)
- `SESSION_SECRET` - JWT signing secret (secret)
- `DATABASE_URL` - PostgreSQL connection string (auto-provisioned)
- `X_API_KEY` - X/Twitter API Consumer Key (secret)
- `X_API_SECRET` - X/Twitter API Consumer Secret (secret)
- `X_ACCESS_TOKEN` - X/Twitter Access Token (legacy, for testing only — per-user tokens now stored in DB)
- `X_ACCESS_TOKEN_SECRET` - X/Twitter Access Token Secret (legacy, for testing only)
- `EXPO_PUBLIC_DOMAIN` - Set at dev time via npm script (dev only)

## API URL Resolution (TestFlight/Production)

The app resolves the backend API URL in this priority order:
1. `EXPO_PUBLIC_DOMAIN` env var (set by npm script in dev mode)
2. `app.json > expo.extra.apiUrl` (hardcoded for production/TestFlight builds)
3. `REPLIT_DEV_DOMAIN` with :5000 port (Replit dev fallback)
4. `REPLIT_DOMAINS` (Replit deployment fallback)

**For TestFlight builds**: Update `app.json > expo.extra.apiUrl` with the deployed backend URL before building.

## API Endpoints

### Auth
- `POST /api/auth/register` - Create account (email, password, displayName)
- `POST /api/auth/login` - Login (email, password) → returns JWT token
- `GET /api/auth/me` - Get current user (requires Bearer token)

### Reports (all require auth)
- `POST /api/report/generate` - Generate report via Kimi AI (context, images)
- `GET /api/report/today` - Get today's cached report
- `GET /api/reports/history` - Get user's report history (max 30)

### Schedule (all require auth)
- `GET /api/schedule` - Get user's schedule config
- `PUT /api/schedule` - Update schedule (enabled, hour, minute, context)

### X/Twitter OAuth & Posting (all require auth)
- `GET /api/twitter/connect` - Initiate OAuth 1.0a flow, returns X authorization URL
- `GET /api/twitter/callback` - OAuth callback (saves per-user access tokens + username)
- `GET /api/twitter/status` - Check if user has linked their X account (returns username)
- `DELETE /api/twitter/disconnect` - Remove user's stored X credentials
- `POST /api/tweet/post` - Post a tweet or thread to the user's linked X account

### Other
- `GET /api/health` - Health check

## Database Schema

- **users**: id, email, password (bcrypt), display_name, default_context, twitter_access_token, twitter_access_secret, twitter_username, created_at
- **reports**: id, user_id (FK), report_date, context, report_data (jsonb), generated_at
- **schedules**: id, user_id (FK, unique), enabled, hour, minute, timezone, context
