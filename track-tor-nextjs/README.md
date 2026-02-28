# Fertilization Timing (UK)

Select a UK location on the map, check rain and sun weather, and determine when to fertilize. Built with Next.js, Mapbox, and shadcn UI.

## Features

- **Step 1**: Fullscreen map — click to select a location (lat/lng) in the UK
- **Step 2**: Weather check — rain (mm) and sunshine (hours) for the next 7 days
- **Step 3**: When to fertilize — overall recommendation plus day-by-day outlook for the next week

## Environment Variables

Create `.env.local`:

```bash
MAP_BOX_ACCESS_TOKEN=your_mapbox_public_token
```

Optional (for future features):

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Quality Checks

```bash
npm run lint
npm run test
npm run build
```

## API Routes

- `GET /api/weather` — Weather by `lat` and `lng` (or `farmId` for legacy)
- `POST /api/fertilize` — Fertilization recommendation for `{ lat, lng }`
