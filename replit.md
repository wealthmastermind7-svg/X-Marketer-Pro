# X Marketer

A premium React Native (Expo) app that serves as a daily Twitter/X marketing intelligence tool, powered by Kimi AI via the Moonshot API.

## Architecture

- **Frontend**: Expo Router with file-based routing, React Native
- **Backend**: Express server on port 5000
- **AI**: Moonshot API (Kimi) for generating daily marketing reports
- **Storage**: AsyncStorage for local report persistence

## Key Features

- Daily X/Twitter marketing intelligence reports
- AI-powered trend analysis, tweet drafting, posting time suggestions
- Growth tips and content analysis
- Report history with local persistence
- Configurable cron schedule (daily at 9 AM default)
- Connected to Kimi AI sub-agent via Moonshot API

## Project Structure

```
app/
  _layout.tsx              - Root layout with fonts + providers
  (tabs)/
    _layout.tsx            - Tab navigation (Today/History/Schedule)
    index.tsx              - Today's report dashboard
    history.tsx            - Past report history
    schedule.tsx           - Cron job configuration
components/
  ReportCard.tsx           - Report section components (Trends, Tweet Ideas, etc.)
  ErrorBoundary.tsx        - Error boundary wrapper
  ErrorFallback.tsx        - Error fallback UI
constants/
  colors.ts               - Premium dark theme with gold accents
lib/
  query-client.ts          - React Query + API utilities
  storage.ts               - AsyncStorage helpers for reports/schedule
server/
  index.ts                 - Express server setup
  routes.ts                - API routes (/api/report/generate, /api/report/today)
  moonshot.ts              - Moonshot/Kimi AI API integration
  storage.ts               - Server-side storage
```

## Design System

- **Background**: #080808 (deep black)
- **Surface**: #111111 (dark cards)
- **Gold accent**: #C9A84C (premium gold)
- **Typography**: DM Serif Display (headings), DM Sans (body)
- **Theme**: Dark, cinematic, editorial

## Environment Variables

- `MOONSHOT_API_KEY` - Moonshot API key for Kimi AI access (secret)

## API Endpoints

- `POST /api/report/generate` - Generate a new daily report via Kimi AI
- `GET /api/report/today` - Get cached today's report
- `GET /api/health` - Health check
