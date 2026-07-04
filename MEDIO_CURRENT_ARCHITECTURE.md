# MEDIO — Complete Architecture Analysis

> Report generated: July 4, 2026
> Scope: Full-stack audit of every file in the repository
> Purpose: Enable a premium UI migration without breaking any existing functionality

---

# 1. High Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 19 SPA)                       │
│  Vite 7 · Tailwind 3 · Leaflet 1.9 · Radix UI · Framer Motion   │
│  Capacitor 8 (Android) · PWA (Workbox)                          │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTP (fetch)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Express 5 API)                        │
│  TypeScript · Mongoose · JWT (jsonwebtoken) · Zod · Turf.js      │
└─────────┬──────────────────────────────┬─────────────────────────┘
          │                              │
          ▼                              ▼
┌──────────────────┐        ┌──────────────────────────────┐
│    MongoDB        │        │  OpenTripPlanner 2.8.1      │
│  (Auth, Places,   │        │  (Java 21, GraphQL API)      │
│   History)        │        │  Mumbai transit graph        │
└──────────────────┘        └──────────────────────────────┘
          │                              │
          ▼                              ▼
  ┌────────────────┐          ┌──────────────────┐
  │  Photon (Komoot)│         │  Overpass API     │
  │  Geocoding      │         │  OSM POIs         │
  └────────────────┘          └──────────────────┘
```

**Frontend framework:** React 19 with TypeScript, built by Vite 7
**Backend framework:** Express 5 with TypeScript
**Project structure:** Monorepo with `backend/`, `frontend/`, `otp-project/`, `tools/`, `docs/`
**Build system:** Vite (frontend) + tsc (backend), bun/npm
**Deployment:** Vercel (frontend SPA), Render (backend API + OTP Docker), Google Cloud Run
**Database:** MongoDB (Mongoose 9) — 3 collections: users, places, history
**Authentication:** JWT (HS256) + Google OAuth 2.0 + localStorage token
**Maps:** Leaflet + OpenStreetMap tiles (free tier)
**API flow:** React → `apiFetch()` wrapper → Express routes → Controllers → Services → External APIs (OTP, Overpass, Photon)

---

# 2. Complete Folder Structure

```
Project-Medio/
│
├── backend/                          # Express API server
│   ├── dist/                         # Compiled JS output (gitignored)
│   ├── node_modules/                 # Dependencies
│   ├── src/
│   │   ├── app.ts                    # Express app setup, middleware pipeline, route mounting
│   │   ├── server.ts                 # Entry point: DB connect + OTP warmup + listen
│   │   ├── config/
│   │   │   └── env.ts                # Zod-validated env vars (22 vars), OTP URL construction
│   │   ├── controller/
│   │   │   ├── auth.controller.ts    # 509 lines — register, login, Google OAuth, profile CRUD, logout
│   │   │   ├── meet.controller.ts    # 49 lines — calls meet service, logs history
│   │   │   ├── place.controller.ts   # 114 lines — CRUD for saved places
│   │   │   └── route.controller.ts   # 292 lines — builds OTP GraphQL query, filters itineraries
│   │   ├── lib/
│   │   │   └── db.ts                 # Mongoose connection with retry logic
│   │   ├── middlewares/
│   │   │   ├── auth.middleware.ts     # JWT verification (cookie + Bearer header fallback)
│   │   │   ├── error.middleware.ts   # Global error handler
│   │   │   ├── security.middleware.ts # CORS, Helmet, CSRF guard, rate limiting (3 tiers), sanitizer
│   │   │   └── validation.middleware.ts # Zod body/query/params validation → res.locals.validated
│   │   ├── models/
│   │   │   ├── history.ts            # Activity log (5 action types)
│   │   │   ├── place.ts              # Saved places with lat/lng
│   │   │   └── user.ts              # Users with authProvider, role, preferences
│   │   ├── routes/
│   │   │   ├── auth.routes.ts        # 8 endpoints: register, login, Google OAuth, me, profile, logout
│   │   │   ├── meet.routes.ts        # POST /api/meet (duplicate / and /meet)
│   │   │   ├── otp.routes.ts         # POST /api/otp/route (simple OTP query, used by MeetView)
│   │   │   ├── place.routes.ts       # POST/GET/DELETE for saved places
│   │   │   ├── route.routes.ts       # POST /api/otp/route (complex, used by TravelView)
│   │   │   └── search.routes.ts      # GET /api/search with Photon geocoder + smart caching
│   │   ├── services/
│   │   │   ├── auth.service.ts       # Register + login business logic (bcrypt)
│   │   │   ├── isochrone.services.ts # Binary search in 48 directions, calls OTP per direction
│   │   │   ├── meet.services.ts      # 802 lines — CORE: seed building, POI fetching, scoring, caching
│   │   │   ├── opentripplanner.service.ts # Thin fetch wrapper for OTP isochrone REST
│   │   │   ├── osm.service.ts        # Overpass query for nearby places (simple)
│   │   │   ├── otp.services.ts       # OTP GraphQL client with duration cache
│   │   │   ├── poi.services.ts       # 447 lines — Overpass + Photon POI fetching, multi-endpoint failover
│   │   │   └── surface.services.ts   # Grid-based intersection search for fallback meet points
│   │   ├── types/
│   │   │   └── osm.ts                # OverpassElement + OverpassResponse interfaces
│   │   ├── utils/
│   │   │   ├── current-user.ts       # Helper to get full User doc from request
│   │   │   ├── distance.ts           # Haversine distance + place scoring
│   │   │   ├── grid.ts               # Turf.js grid generation + equidistant point filtering
│   │   │   ├── jwt.ts               # signToken + verifyToken (HS256, aud/iss validation)
│   │   │   ├── logger.ts            # Structured JSON logger with redaction
│   │   │   ├── midpoint.ts          # Simple lat/lng average
│   │   │   ├── otp.util.ts          # Route planning with distance fallback
│   │   │   └── password.ts          # bcrypt hash + compare wrappers
│   │   └── validators/
│   │       ├── api.validator.ts      # Zod schemas for meet, route, place, search
│   │       └── auth.validator.ts     # Zod schemas for register, login, updateProfile
│   ├── .dockerignore
│   ├── .env                          # Actual env vars (gitignored)
│   ├── .env.example                  # Template
│   ├── .gitignore
│   ├── .renderignore
│   ├── docker-compose.yml            # OTP + API local orchestration
│   ├── Dockerfile                    # Multi-stage Node 22 build
│   ├── package.json
│   ├── README.md
│   └── tsconfig.json
│
├── frontend/                         # React SPA
│   ├── dist/                         # Built output
│   ├── node_modules/
│   ├── playwright-report/
│   ├── public/                       # Static assets
│   ├── src/
│   │   ├── main.tsx                  # Entry: BrowserRouter + App
│   │   ├── index.css                 # Old global CSS (imports fonts, tailwind, leaflet)
│   │   ├── app/
│   │   │   ├── App.tsx               # Routes + ThemeToggle + ProtectedLayout
│   │   │   ├── lib/
│   │   │   │   ├── api.ts            # apiFetch wrapper with JWT + localStorage
│   │   │   │   ├── backend.ts        # Dynamic backend URL resolution
│   │   │   │   └── locationSearch.ts # Autocomplete with backend /api/search
│   │   │   └── components/
│   │   │       ├── figma/
│   │   │       │   └── ImageWithFallback.tsx  # Image error fallback component
│   │   │       ├── medio/
│   │   │       │   ├── auth/
│   │   │       │   │   ├── Login.tsx          # Google OAuth login page (web + Capacitor)
│   │   │       │   │   └── ProtectedRoute.tsx # Auth guard with /api/auth/me check
│   │   │       │   ├── travel/
│   │   │       │   │   ├── TravelSearch.tsx   # 334 lines — Location inputs, mode selector, local transport toggles
│   │   │       │   │   ├── TravelBottomSheet.tsx # 143 lines — Draggable bottom sheet with route cards
│   │   │       │   │   ├── RouteCard.tsx      # 137 lines — Individual route option card
│   │   │       │   │   ├── RouteTimeline.tsx  # 100 lines — Step-by-step leg breakdown
│   │   │       │   │   ├── RouteModeIcon.tsx  # 23 lines — Icon by transport mode
│   │   │       │   │   ├── routeUtils.ts      # 111 lines — Duration, distance, fare, metrics
│   │   │       │   │   ├── TransportLegend.tsx # 53 lines — Map color legend
│   │   │       │   │   ├── markerIcons.ts     # 95 lines — SVG pin/star markers by role
│   │   │       │   │   ├── NearbyPanel.tsx    # 159 lines — Overpass-powered 8-category places
│   │   │       │   │   └── FloatingButtons.tsx # 54 lines — Locate, sheet toggle, explore
│   │   │       │   ├── BottomNav.tsx          # 4-tab bottom navigation
│   │   │       │   ├── Map.tsx                # 351 lines — Leaflet map with multi-route, markers, legend
│   │   │       │   ├── MeetView.tsx           # 778 lines — Main meet page (inputs, results, routes, map)
│   │   │       │   ├── NotificationBell.tsx   # 165 lines — Activity feed popover
│   │   │       │   ├── otpTypes.ts            # 42 lines — OTP response TypeScript interfaces
│   │   │       │   ├── PlaceCard.tsx          # 40 lines — UNUSED legacy card component
│   │   │       │   ├── ProfileView.tsx        # 604 lines — Profile page with stats, places, history, preferences
│   │   │       │   ├── SplashScreen.tsx       # 178 lines — Animated boot screen
│   │   │       │   ├── transportColors.ts     # 96 lines — Mumbai metro/rail/bus color mappings
│   │   │       │   └── UserGuideView.tsx      # 104 lines — Static guide page
│   │   │       └── ui/                        # 52 shadcn/ui Radix primitives
│   │   │           ├── utils.ts               # cn() helper (clsx + tailwind-merge)
│   │   │           ├── use-mobile.ts          # Mobile detection hook
│   │   │           ├── accordion.tsx, alert-dialog.tsx, avatar.tsx,
│   │   │           │   badge.tsx, breadcrumb.tsx, button.tsx, calendar.tsx,
│   │   │           │   card.tsx, carousel.tsx, chart.tsx, checkbox.tsx,
│   │   │           │   collapsible.tsx, command.tsx, context-menu.tsx,
│   │   │           │   dialog.tsx, drawer.tsx, dropdown-menu.tsx,
│   │   │           │   form.tsx, hover-card.tsx, input.tsx, input-otp.tsx,
│   │   │           │   label.tsx, menubar.tsx, navigation-menu.tsx,
│   │   │           │   pagination.tsx, popover.tsx, progress.tsx,
│   │   │           │   radio-group.tsx, resizable.tsx, scroll-area.tsx,
│   │   │           │   select.tsx, separator.tsx, sheet.tsx, sidebar.tsx,
│   │   │           │   skeleton.tsx, slider.tsx, sonner.tsx, switch.tsx,
│   │   │           │   table.tsx, tabs.tsx, textarea.tsx, toggle.tsx,
│   │   │           │   toggle-group.tsx, tooltip.tsx
│   │   │           └── ...
│   │   └── styles/
│   │       ├── fonts.css              # EMPTY FILE (0 lines)
│   │       ├── index.css             # Main stylesheet (850 lines) — theme, nav, notifications, animations
│   │       ├── tailwind.css          # @tailwind directives (3 lines)
│   │       └── theme.css            # CSS variable theme tokens (shadcn/ui style, 152 lines)
│   ├── tests/                        # Playwright E2E tests
│   ├── .dockerignore
│   ├── .env
│   ├── .env.example
│   ├── .gitignore
│   ├── .vercelignore
│   ├── bun.lock
│   ├── capacitor.config.ts           # Capacitor 8 Android config
│   ├── Dockerfile                    # Node 22 build → nginx:1.27-alpine
│   ├── eslint.config.js
│   ├── index.html                    # Vite entry HTML
│   ├── nginx.conf.template           # Nginx SPA config
│   ├── package-lock.json
│   ├── package.json
│   ├── playwright.config.ts
│   ├── postcss.config.js
│   ├── README.md
│   ├── tailwind.config.js
│   ├── tsconfig.json, tsconfig.app.json, tsconfig.node.json
│   ├── vercel.json
│   └── vite.config.ts                # React + PWA plugin + aliases
│
├── otp-project/                      # OpenTripPlanner deployment
│   ├── otp-data/
│   │   ├── graph.obj                 # 42.6 MB — pre-built transit graph
│   │   ├── mumbai.osm.pbf           # 29.2 MB — OSM extract
│   │   ├── GTFS/                     # Mumbai transit schedules
│   │   ├── GTFS-bus-test/           # Synthetic bus GTFS
│   │   ├── build-config.json         # OSM + GTFS source config, 5000m linking
│   │   ├── otp-config.json          # Sandbox APIs (geocoder, travel time)
│   │   └── router-config.json       # 5 itineraries, stopTransferCost=0
│   ├── .dockerignore
│   ├── .gitignore
│   ├── Dockerfile                    # eclipse-temurin:21-jre, 700m heap
│   ├── otp.jar                       # OTP 2.8.1 binary
│   └── otp-test.html                 # Simple test page
│
├── tools/
│   └── generate-bus-gtfs.mjs        # 724 lines — scrapes TransitRun.com for BEST bus routes
│
├── docs/
│   └── google-cloud-deployment.md    # GCP deployment guide
│
├── tmp/                              # Log files (gitignored)
│   ├── codex-otp/
│   ├── codex-vite/
│   └── ...
│
├── cloudbuild.yaml                   # Google Cloud Build CI/CD
├── render.yaml                       # Render Blueprint (OTP + API)
├── otp-test.html                     # Root-level test page
├── package.json                      # Root (mostly empty)
├── bun.lock
├── .gitignore
├── .gitattributes
└── README.md
```

### Key Observations

**Obsolete files:**
- `frontend/src/index.css` — Duplicate; real entry is `frontend/src/styles/index.css`
- `frontend/src/styles/fonts.css` — Empty file (0 lines)
- `backend/src/routes/otp.routes.ts` — Duplicated by `route.routes.ts`; `otp.routes.ts` is simpler, `route.routes.ts` is richer
- `frontend/src/app/components/medio/PlaceCard.tsx` — Never imported anywhere
- `frontend/src/app/components/figma/ImageWithFallback.tsx` — Never imported anywhere

**Tightly coupled files:**
- `MeetView.tsx` ↔ `Map.tsx` (via `multiRouteData` prop)
- `TravelView.tsx` ↔ `TravelSearch.tsx`, `TravelBottomSheet.tsx`, `NearbyPanel.tsx` (complex prop drilling)
- `Map.tsx` ↔ `transportColors.ts` (Mumbai-specific line colors hardcoded)
- `meet.services.ts` ↔ `poi.services.ts`, `surface.services.ts`, `otp.services.ts` (deep import chain)
- Backend routes `otp.routes.ts` and `route.routes.ts` both mount on `/api/otp/route` — overlapping responsibility

---

# 3. Frontend Architecture

## Routing

Single `BrowserRouter` in `main.tsx`. Routes defined in `App.tsx`:

| Path | Component | Auth Required |
|------|-----------|---------------|
| `/` | `SplashScreen` | No |
| `/login` | `LoginPage` | No |
| `/meet` | `MeetView` | Yes (ProtectedRoute) |
| `/travel` | `TravelView` | Yes |
| `/guide` | `UserGuideView` | Yes |
| `/profile` | `ProfileView` | Yes |
| `*` | Redirect to `/` | No |

No React Router `createBrowserRouter` — uses legacy `<Routes>` + `<Route>`.

## Layouts

- `ProtectedLayout` in `App.tsx`: wraps protected pages with `NotificationBell` component
- Each page handles its own header, bottom nav, and layout independently
- `BottomNav` (4 tabs) rendered by each protected page individually

## Pages

- **SplashScreen** (`/`): Animated boot screen with progress bar, checks auth via `/api/auth/me`
- **LoginPage** (`/login`): Google OAuth button (web redirect + Capacitor native)
- **MeetView** (`/meet`): Dual location inputs, find meeting point, result list, map, route details
- **TravelView** (`/travel`): Route planner with mode selector, bottom sheet, nearby places
- **UserGuideView** (`/guide`): Static travel guide cards
- **ProfileView** (`/profile`): User stats, edit profile, saved places, activity log, settings

## Reusable Components (excluding shadcn/ui)

| Component | File | Used By |
|-----------|------|---------|
| `RealMap` | `Map.tsx` | MeetView, TravelView |
| `BottomNav` | `BottomNav.tsx` | MeetView, TravelView, UserGuideView, ProfileView |
| `TravelSearch` | `travel/TravelSearch.tsx` | TravelView |
| `TravelBottomSheet` | `travel/TravelBottomSheet.tsx` | TravelView |
| `RouteCard` | `travel/RouteCard.tsx` | TravelBottomSheet |
| `RouteTimeline` | `travel/RouteTimeline.tsx` | TravelBottomSheet |
| `RouteModeIcon` | `travel/RouteModeIcon.tsx` | RouteCard, RouteTimeline, TravelBottomSheet |
| `TransportLegend` | `travel/TransportLegend.tsx` | TravelBottomSheet |
| `NearbyPanel` | `travel/NearbyPanel.tsx` | TravelBottomSheet |
| `FloatingButtons` | `travel/FloatingButtons.tsx` | TravelView |
| `NotificationBell` | `NotificationBell.tsx` | ProtectedLayout |
| `SplashScreen` | `SplashScreen.tsx` | App routes |
| `LoginPage` | `auth/Login.tsx` | App routes |
| `ProtectedRoute` | `auth/ProtectedRoute.tsx` | App routes |
| `ImageWithFallback` | `figma/ImageWithFallback.tsx` | Never used |

## Hooks

No custom hooks exist. All state is managed inline in component files using `useState`, `useEffect`, `useMemo`, `useCallback`, `useRef`.

## Contexts

No React Context is used for state management. The `theme` state in `App.tsx` is managed with `useState` + `localStorage` — manually toggled and applied via `data-theme` attribute.

## Stores

No state management library (Redux, Zustand, Jotai, etc.) is used. All state is local `useState`.

## API Layer

- `api.ts`: `apiFetch()` — wraps `fetch()` with auth token injection (Bearer header), `credentials: "include"`
- `backend.ts`: `getBackendUrl()` — resolves URL from env var, Codespace detection, Capacitor detection, production fallback
- `locationSearch.ts`: `fetchLocationSuggestions()` — debounced autocomplete via `/api/search`
- Direct `fetch()` calls to Overpass API in `NearbyPanel.tsx`

## Utilities

- `otpTypes.ts`: TypeScript interfaces for OTP GraphQL responses
- `transportColors.ts`: Mumbai line color mappings (Metro L1-L9, CL/HL/WL, modes)
- `travel/routeUtils.ts`: Duration/distance formatting, fare estimation, route metrics
- `travel/markerIcons.ts`: SVG-based Leaflet marker icons for 6 roles

## Styling System

See Section 12.

## Animation System

- **CSS animations:**
  - `.medio-marker-bounce` — meeting marker bounce animation
  - `.medio-location-pulse` — current location pulse ring
  - Leaflet `flyToBounds` for map transitions
- **No Framer Motion usage** despite being a dependency (`framer-motion` in package.json but never imported)

---

# 4. Backend Architecture

## Server Startup

1. `server.ts` calls `connectDB()` (Mongoose → MongoDB)
2. Background-warms OTP service via GraphQL introspection
3. Express app listens on `env.PORT` (default 5001)

## Middleware Pipeline (order in `app.ts`)

1. `requireHttps` — redirect to HTTPS in production
2. `securityHeaders` — Helmet
3. `cors(corsOptions)` — CORS with origin whitelist
4. `generalRateLimiter` — 300 req/15min (prod) / 1200 (dev)
5. `express.json({ limit: '32kb' })`
6. `cookieParser()`
7. `requestSanitizer` — removes `__proto__`, `$` keys
8. `csrfOriginGuard` — blocks unsafe methods from unknown origins
9. Routes (`/api/auth`, `/api/meet`, `/api/places`, `/api/search`, `/api/otp`)
10. Global error handler

## Routes Structure

| Route File | Base Path | Endpoints |
|------------|-----------|-----------|
| `auth.routes.ts` | `/api/auth` | POST register, POST login, GET google, GET google/callback, POST google/native, GET me, GET profile, PATCH profile, POST logout |
| `meet.routes.ts` | `/api/meet` | POST /, POST /meet (duplicate) |
| `place.routes.ts` | `/api/places` | POST /, GET /, DELETE /:id |
| `route.routes.ts` | `/api/otp` | POST /route (complex) |
| `otp.routes.ts` | `/api/otp` | POST /route (simple, overlapping with route.routes) |
| `search.routes.ts` | `/api/search` | GET / |

**Note:** `route.routes.ts` and `otp.routes.ts` both define `POST /api/otp/route`. Both are mounted in `app.ts`:
- `app.use("/api/otp", routeRoutes)` — loads first
- `app.use("/api/otp", otpRoutes)` — loads second

Since `route.routes.ts` has the richer handler (mode selection, itinerary filtering) and `otp.routes.ts` is simpler, there is a **routing conflict**. One may shadow the other depending on load order.

## Controllers

- **auth.controller.ts** (509 lines): Register, login, Google OAuth redirect + callback, native sign-in, checkAuth, getProfile, updateProfile, logout
- **meet.controller.ts** (49 lines): Calls `findMeetPoints()`, logs history
- **place.controller.ts** (114 lines): CRUD for saved places with auth check
- **route.controller.ts** (292 lines): Constructs OTP GraphQL query with Mumbai timezone, transport mode filtering, itinerary post-filtering

## Services

- **auth.service.ts**: Register (bcrypt) + login (JWT generation)
- **meet.services.ts** (802 lines): Core meeting algorithm — seed building, POI fetching, scoring, caching, 3-tier fallback (OSM → Photon → surface → estimated)
- **poi.services.ts** (447 lines): Overpass API with 3-endpoint failover, Photon (Komoot) fallback, category filtering
- **isochrone.services.ts** (94 lines): Binary search in 48 directions for transit isochrones
- **surface.services.ts** (95 lines): Point grid + OTP queries for intersection polygon
- **otp.services.ts** (68 lines): OTP GraphQL client with in-memory duration cache
- **opentripplanner.service.ts** (14 lines): Thin isochrone REST wrapper
- **osm.service.ts** (46 lines): Simple Overpass nearby places query

## Middleware

- **auth.middleware.ts**: JWT verification from cookie or Bearer header
- **security.middleware.ts**: CORS, Helmet, CSRF, 3 rate limiters, sanitizer, HTTPS redirect
- **validation.middleware.ts**: Zod validation for body/query/params, stores in `res.locals.validated`
- **error.middleware.ts**: Global error handler

## Models

- **User**: name, email, password (select:false), authProvider, role, avatarUrl, notificationsEnabled, privacyMode, timestamps
- **Place**: userId (ref User), label, address, lat, lng, timestamps
- **History**: userId (ref User), action (enum: 5 types), value, timestamps

## Configuration

- `env.ts`: All env vars validated with Zod — MONGO_URI, JWT_SECRET (min 32 chars), GOOGLE_*, OTP_*, BCRYPT_ROUNDS (12-15), LOG_LEVEL
- OTP URLs auto-constructed from `OTP_HOSTPORT` or explicit `OTP_BASE_URL`

## Request Flow (Frontend → Backend)

```
React Component
  → apiFetch("/api/meet", { method: "POST", body: {...} })
    → getBackendUrl() resolves to Render/Vercel/Codespace
    → getAuthToken() reads JWT from localStorage
    → fetch(url, { headers: { Authorization: "Bearer <jwt>" }, credentials: "include" })
      → Express receives request
        → security middleware (CORS, CSRF, rate limit, sanitize)
        → authMiddleware verifies JWT
        → validationMiddleware validates body with Zod
        → controller calls service
          → service calls external APIs (OTP/Overpass/Photon)
          → service returns data
        → controller sends response
      → Express sends JSON
    → Component receives data and updates state
```

---

# 5. Authentication Flow

## Files Involved

**Backend:**
- `backend/src/middlewares/auth.middleware.ts` — JWT verification
- `backend/src/controller/auth.controller.ts` — All auth endpoints
- `backend/src/services/auth.service.ts` — Register + login logic
- `backend/src/utils/jwt.ts` — signToken + verifyToken
- `backend/src/utils/password.ts` — bcrypt
- `backend/src/validators/auth.validator.ts` — Zod schemas
- `backend/src/routes/auth.routes.ts` — Auth route definitions

**Frontend:**
- `frontend/src/app/lib/api.ts` — JWT storage + apiFetch wrapper
- `frontend/src/app/lib/backend.ts` — Backend URL resolution
- `frontend/src/app/components/medio/auth/Login.tsx` — Login page
- `frontend/src/app/components/medio/auth/ProtectedRoute.tsx` — Auth guard

## JWT

- **Algorithm:** HS256
- **Secret:** Min 32 chars, validated against weak list
- **Expiry:** 7 days (configurable)
- **Claims:** sub (userId), email, role, name, picture, aud, iss
- **Transport:** HTTP-only cookie (`token`) + Bearer header fallback
- **Verification:** Audience + issuer + algorithm enforced

## Google OAuth

**Web flow:**
1. User clicks "Continue with Google" on `Login.tsx`
2. `window.location.href = '/api/auth/google'`
3. Backend generates state + redirect cookie, redirects to Google
4. Google redirects to `/api/auth/google/callback`
5. Backend verifies ID token, upserts user, sets JWT cookie, redirects to frontend with `?token=<jwt>&login=success`
6. Frontend captures token from URL params, stores in localStorage, navigates to `/meet`

**Native (Capacitor) flow:**
1. `SocialLogin.login()` returns idToken
2. Posted to `/api/auth/google/native`
3. Backend verifies ID token, upserts user, returns JWT in response body
4. Frontend stores in localStorage, navigates to `/meet`

## Local Auth (Email/Password)

1. POST `/api/auth/register` — validates with Zod, checks uniqueness, bcrypt hash, creates user
2. POST `/api/auth/login` — validates, finds user with `+password`, bcrypt compare, sets JWT cookie
3. Protected routes use `authMiddleware` which reads cookie or Bearer header

## Protected Routes

- `ProtectedRoute.tsx` calls `GET /api/auth/me` on mount
- If `authenticated: false` → redirect to `/login`
- While loading → "Checking authentication..." text
- Backend `checkAuth` endpoint decodes JWT (no DB query) and returns auth status

## User Persistence

- JWT stored in localStorage key `medio_auth_token`
- JWT also set as HTTP-only cookie by backend
- On page load, `apiFetch` injects Bearer token from localStorage
- Backend verifies from cookie if Bearer absent

## Login Flow

1. User visits `/` → SplashScreen
2. SplashScreen calls `/api/auth/me` → checks auth
3. If authenticated → navigate to `/meet`
4. If not → navigate to `/login`
5. Login page shows Google OAuth button
6. On success → redirect to `/meet`

## Logout Flow

1. ProfileView calls `POST /api/auth/logout`
2. Backend clears all auth cookies
3. Frontend calls `clearAuthToken()` (removes from localStorage)
4. Navigate to `/login`

---

# 6. Database

## MongoDB Collections

### `users`
| Field | Type | Constraints |
|-------|------|-------------|
| `name` | String | required, 2-80 chars |
| `email` | String | required, unique, lowercase, 254 max |
| `password` | String | required if authProvider === "local", select: false |
| `authProvider` | String enum | "local" \| "google" |
| `role` | String enum | "user" \| "admin" |
| `avatarUrl` | String | optional, 2048 max |
| `notificationsEnabled` | Boolean | default: true |
| `privacyMode` | Boolean | default: false |
| `createdAt` | Date | auto (timestamps) |
| `updatedAt` | Date | auto (timestamps) |

### `places`
| Field | Type | Constraints |
|-------|------|-------------|
| `userId` | ObjectId | ref: User, required, indexed |
| `label` | String | required, 80 max |
| `address` | String | required, 300 max |
| `lat` | Number | optional, -90 to 90 |
| `lng` | Number | optional, -180 to 180 |
| `createdAt` | Date | auto |

### `histories`
| Field | Type | Constraints |
|-------|------|-------------|
| `userId` | ObjectId | ref: User, required, indexed |
| `action` | String enum | PLACE_CREATED \| PLACE_DELETED \| ROUTE_PLANNED \| MEET_SEARCHED \| PROFILE_UPDATED |
| `value` | String | required, 500 max |
| `createdAt` | Date | auto |

## Indexes

- `users`: `{ email: 1 }` (unique index)
- `places`: `{ userId: 1, createdAt: -1 }` (compound index)
- `histories`: `{ userId: 1, createdAt: -1 }` (compound index)

## Relationships

- User 1→N Place (via `userId` foreign key)
- User 1→N History (via `userId` foreign key)
- No cascade deletes — places/history remain orphaned if user is deleted

## Data Flow

1. **User registers** → Auth service hashes password → User.create()
2. **User logs in** → Auth service bcrypt.compare → JWT signed
3. **Place saved** → Place.create() → History.create("PLACE_CREATED")
4. **Meet searched** → findMeetPoints() → History.create("MEET_SEARCHED")
5. **Route planned** → OTP GraphQL → History.create("ROUTE_PLANNED")
6. **Profile updated** → User.save() → History.create("PROFILE_UPDATED")

---

# 7. API Documentation

## Auth

| Method | URL | Auth | Body | Response | Used By |
|--------|-----|------|------|----------|---------|
| POST | `/api/auth/register` | No | `{ name, email, password }` | `{ message, data: { id, name, email, createdAt } }` | Future use |
| POST | `/api/auth/login` | No | `{ email, password }` | `{ message }` + Set-Cookie | Future use |
| GET | `/api/auth/google` | No | query: `?redirect=url` | 302 → Google OAuth | Login.tsx |
| GET | `/api/auth/google/callback` | No | query: `code, state` | 302 → frontend with `?token=...&login=success` | Login.tsx (redirect) |
| POST | `/api/auth/google/native` | No | `{ idToken }` | `{ token, user }` | Login.tsx (Capacitor) |
| GET | `/api/auth/me` | No (JWT optional) | — | `{ authenticated: boolean, user?: {...} }` | ProtectedRoute.tsx, SplashScreen.tsx |
| GET | `/api/auth/profile` | JWT | — | `{ user, stats, savedPlaces, recentTrips, recentActivity }` | ProfileView.tsx, NotificationBell.tsx |
| PATCH | `/api/auth/profile` | JWT | `{ name?, avatarUrl?, notificationsEnabled?, privacyMode? }` | `{ message, user, stats, savedPlaces, ... }` | ProfileView.tsx |
| POST | `/api/auth/logout` | No | — | `{ message }` + clear cookies | ProfileView.tsx |

## Meet

| Method | URL | Auth | Body | Response | Used By |
|--------|-----|------|------|----------|---------|
| POST | `/api/meet` | JWT | `{ latA, lonA, latB, lonB, minutes?, fromName?, toName? }` | `ScoredPoi[]` | MeetView.tsx |
| POST | `/api/meet/meet` | JWT | same | same | (duplicate) |

## Places

| Method | URL | Auth | Body | Response | Used By |
|--------|-----|------|------|----------|---------|
| GET | `/api/places` | JWT | — | `{ count, places }` | TravelView.tsx |
| POST | `/api/places` | JWT | `{ label, address, lat?, lng? }` | `{ message, place }` | TravelView.tsx |
| DELETE | `/api/places/:id` | JWT | — | `{ message }` | TravelView.tsx, ProfileView.tsx |

## Route

| Method | URL | Auth | Body | Response | Used By |
|--------|-----|------|------|----------|---------|
| POST | `/api/otp/route` | JWT | `{ from: {lat,lng}, to: {lat,lng}, fromName?, toName?, travelMode?, localTransport? }` | `{ data: { plan: { itineraries } }, routing }` | TravelView.tsx, MeetView.tsx |

## Search

| Method | URL | Auth | Body | Response | Used By |
|--------|-----|------|------|----------|---------|
| GET | `/api/search?q=...` | No | — | `LocationSuggestion[]` | locationSearch.ts → MeetView, TravelView |

## Health

| Method | URL | Auth | Response |
|--------|-----|------|----------|
| GET | `/` | No | `{ message: "Server is running" }` |
| GET | `/health` | No | `{ status: "ok", uptime }` |
| GET | `/ready` | No | `{ status: "ready", mongo: "connected" }` |

---

# 8. Maps System

## Related Files

**Frontend:**
- `Map.tsx` (351 lines) — Core map component
- `travel/markerIcons.ts` (95 lines) — Custom SVG markers
- `transportColors.ts` (96 lines) — Mumbai transit line colors
- `travel/TransportLegend.tsx` (53 lines) — Map color legend

**Backend:**
- `services/osm.service.ts` (46 lines) — Overpass nearby places
- `services/poi.services.ts` (447 lines) — Overpass POI fetching
- `utils/otp.util.ts` — Route planning with distance fallback

## OpenStreetMap Integration

- Tiles: `https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png` (free tier)
- Leaflet 1.9 with `react-leaflet` 5.0
- Map component: `RealMap` in `Map.tsx`

## Midpoint Calculation

- Simple average in `utils/midpoint.ts`: `(a.lat + b.lat) / 2, (a.lng + b.lng) / 2`
- Also calculated in `routeUtils.ts` for TravelView's route center

## Routing

- OTP GraphQL API returns transit itineraries with leg geometry (encoded polyline)
- `@mapbox/polyline` decodes geometry for Leaflet rendering
- Multi-route support: `multiRouteData` prop allows rendering routes from both users simultaneously (MeetView)
- Single route: `routeData` prop for TravelView

## Markers

- 6 marker roles: `origin`, `destination`, `user`, `meeting`, `nearby`, `currentLocation`
- Custom SVG pin icons with color per role
- Meeting markers use star shape; bounce animation when selected
- Current location uses pulsing dot with CSS animation

## Animations

- Marker bounce: CSS `@keyframes medio-marker-bounce`
- Current location pulse: CSS `@keyframes medio-location-pulse`
- Map flyTo: Leaflet `flyToBounds` with 1s duration, 76px padding

## Clustering

No marker clustering implemented. All markers rendered individually. Could be a performance issue with 12+ meet results + routes.

## Location Permissions

- `navigator.geolocation.getCurrentPosition()` called from `TravelView.tsx` `handleLocate()`
- No permission request UI — browser handles natively
- Location displayed as `currentLocation` marker on map

## Travel Calculations

- `routeUtils.ts`: Duration formatting, distance formatting, fare estimation (₹15 bus, ₹30 metro, ₹15 rail)
- `transportColors.ts`: Mumbai-specific Metro (L1=L9), Railway (CL/HL/WL), mode colors
- `getTransportColor()`: Matches route names to Mumbai line colors via regex patterns

---

# 9. State Management

## Current Approach: Zero global state management

All state is managed via React `useState` at the component level. This is the single biggest architectural weakness.

## What exists:

| State Type | Mechanism | Location |
|-----------|-----------|----------|
| Theme | `useState` + `localStorage` | `App.tsx` |
| Auth token | `localStorage` | `api.ts` |
| Location inputs | `useState` | `MeetView.tsx`, `TravelView.tsx` |
| Meet results | `useState` | `MeetView.tsx` |
| Route data | `useState` | `MeetView.tsx`, `TravelView.tsx` |
| Suggestions | `useState` | `MeetView.tsx`, `TravelView.tsx` |
| Profile | `useState` | `ProfileView.tsx` |
| Notifications | `useState` | `NotificationBell.tsx` |
| Sidebar/sheet | `useState` | `TravelView.tsx` (`sheetState`) |

## Problems:

- **Prop drilling hell:** `TravelView.tsx` passes 15+ props to `TravelSearch.tsx`
- **No shared auth state:** Each protected page re-checks auth independently
- **No request caching:** Every component fetches independently (e.g., profile data fetched by both `ProfileView` and `NotificationBell`)
- **No optimistic updates:** Delete place → wait for API → re-fetch entire list

---

# 10. UI Components

## shadcn/ui Primitives (52 files)

All located in `frontend/src/app/components/ui/`. Standard Radix-based components with Tailwind styling. Many are unused in the actual app:

**Used:** `switch.tsx` (TravelSearch), button.tsx (indirectly)

**Available but unused in actual pages:** accordion, alert-dialog, avatar, badge, breadcrumb, calendar, card, carousel, chart, checkbox, collapsible, command, context-menu, dialog, drawer, dropdown-menu, form, hover-card, input, input-otp, label, menubar, navigation-menu, pagination, popover, progress, radio-group, resizable, scroll-area, select, separator, sheet, sidebar, skeleton, slider, sonner, table, tabs, textarea, toggle, toggle-group, tooltip

## Custom Components

### `Map.tsx` — RealMap
- **Purpose:** Leaflet map with markers, routes, legend
- **Props:** `lat, lng, zoom, markers, routeData, selectedIndex, multiRouteData, currentLocation`
- **State:** None (pure rendering)
- **Dependencies:** react-leaflet, leaflet, @mapbox/polyline, transportColors, markerIcons
- **Pages:** MeetView, TravelView

### `TravelSearch.tsx`
- **Purpose:** Location inputs, travel mode selector, local transport toggles, saved places
- **Props:** 17 props (prop drilling issue)
- **State:** Sub-components use inline state for suggestions dropdown
- **Dependencies:** api, locationSearch, Switch (shadcn/ui)
- **Pages:** TravelView

### `TravelBottomSheet.tsx`
- **Purpose:** Draggable bottom sheet (collapsed/half/full) with route cards and nearby panel
- **Props:** state, itineraries, selectedIndex, nearbyContent, onStateChange, onSelectRoute
- **Dependencies:** RouteCard, RouteTimeline, TransportLegend, routeUtils
- **Pages:** TravelView

### `RouteCard.tsx`
- **Purpose:** Individual route option card with metrics and tags
- **Props:** itinerary, index, itineraries, selected, onSelect
- **Dependencies:** routeUtils, RouteModeIcon
- **Pages:** TravelBottomSheet

### `RouteTimeline.tsx`
- **Purpose:** Step-by-step leg timeline
- **Props:** itinerary
- **Dependencies:** routeUtils, transportColors, RouteModeIcon
- **Pages:** TravelBottomSheet

### `NearbyPanel.tsx`
- **Purpose:** 8-category Overpass-powered nearby place browser
- **Props:** center, selectedCategory, onCategoryChange, onPlacesChange
- **State:** places, loading, notice (internal)
- **Dependencies:** Overpass API (direct fetch)
- **Pages:** TravelBottomSheet

### `FloatingButtons.tsx`
- **Purpose:** Map overlay buttons: locate, sheet toggle, explore nearby
- **Props:** nearbyOpen, onExplore, onLocate, onToggleSheet
- **Pages:** TravelView

### `TransportLegend.tsx`
- **Purpose:** Color legend for transport modes
- **Props:** itinerary
- **Pages:** TravelBottomSheet

### `RouteModeIcon.tsx`
- **Purpose:** Icon by mode (Footprints/BusFront/TrainFront/Car/Bike)
- **Props:** mode, className, size
- **Pages:** RouteCard, RouteTimeline, TravelBottomSheet

### `BottomNav.tsx`
- **Purpose:** 4-tab bottom navigation bar
- **Props:** active (optional, defaults to pathname)
- **Pages:** All protected pages

### `NotificationBell.tsx`
- **Purpose:** Activity feed popover with badge
- **Props:** None (fetches own data)
- **State:** open, loading, notificationsEnabled, items
- **Pages:** ProtectedLayout (all protected pages)

### `SplashScreen.tsx`
- **Purpose:** Animated boot screen with progress bar
- **Props:** None
- **State:** progress, currentStageIndex + refs
- **Pages:** `/` route

### `LoginPage.tsx`
- **Purpose:** Google OAuth login for web + Capacitor
- **Props:** None
- **State:** Refs + search params
- **Pages:** `/login`

### `ProtectedRoute.tsx`
- **Purpose:** Auth guard wrapper
- **Props:** children
- **State:** loading, authenticated
- **Pages:** Wraps /meet, /travel, /guide, /profile

### `ProfileView.tsx`
- **Purpose:** Full profile page with stats, edit, saved places, activity, preferences
- **Props:** None
- **State:** profile, loading, saving, error, successMessage, editing state
- **Pages:** `/profile`

### `UserGuideView.tsx`
- **Purpose:** Static guide page
- **Props:** None
- **Pages:** `/guide`

### `PlaceCard.tsx` (UNUSED)
- **Purpose:** Legacy place card with rating, image, time
- **Status:** NOT imported anywhere

### `ImageWithFallback.tsx` (UNUSED)
- **Purpose:** Image error fallback component
- **Status:** NOT imported anywhere

---

# 11. Pages

## SplashScreen (`/`)
- **UI:** Dark card with background image, progress bar, loading stages
- **API calls:** `GET /api/auth/me` (checks auth for redirect destination)
- **Auth:** Not required
- **Components used:** None (self-contained)
- **Navigation:** Auto-redirects to `/meet` or `/login` after 10s
- **Business logic:** Determines authenticated state → redirects appropriately

## Login Page (`/login`)
- **UI:** Centered card with Google OAuth button, glow effects
- **API calls:** `GET /api/auth/me` (check if already logged in), `POST /api/auth/google/native` (Capacitor)
- **Auth:** Not required
- **Components used:** None (self-contained)
- **Navigation:** After success → `/meet`
- **Business logic:** Web: redirect to Google. Native: SocialLogin → backend

## MeetView (`/meet`)
- **UI:** Header, 2 location inputs with autocomplete, "Find Meeting Point" button, map, category filters, result cards, route details
- **API calls:** `/api/search?q=...` (debounced), `POST /api/meet`, `POST /api/otp/route`
- **Auth:** Required
- **Components used:** RealMap, BottomNav
- **Navigation:** Uses BottomNav
- **Business logic:** Location autocomplete with debounce + abort controller, meet result scoring display, auto-fetch routes for both participants, category filtering

## TravelView (`/travel`)
- **UI:** Full-screen map, floating search panel (collapsible), mode selector, local transport toggles, saved places bar, bottom sheet, floating buttons, add-place modal
- **API calls:** `/api/search?q=...`, `POST /api/otp/route`, `GET /api/places`, `POST /api/places`, `DELETE /api/places/:id`, Overpass (direct from NearbyPanel)
- **Auth:** Required
- **Components used:** RealMap, TravelSearch, TravelBottomSheet, FloatingButtons, BottomNav
- **Navigation:** BottomNav, bottom sheet states (collapsed/half/full)
- **Business logic:** Route planning with travel mode selection, route metric calculation (fare, walking, transfers, stops), nearby places browsing

## UserGuideView (`/guide`)
- **UI:** Header, 2 guide cards with images + text
- **API calls:** None
- **Auth:** Required
- **Components used:** BottomNav
- **Navigation:** BottomNav
- **Business logic:** None (static content)

## ProfileView (`/profile`)
- **UI:** Hero section with avatar + stats, edit profile form, saved places list, recent trips, activity log, app settings toggles, logout button
- **API calls:** `GET /api/auth/profile`, `PATCH /api/auth/profile`, `DELETE /api/places/:id`, `POST /api/auth/logout`
- **Auth:** Required
- **Components used:** BottomNav
- **Navigation:** BottomNav, back button
- **Business logic:** Profile editing with unsaved changes detection, preference toggles, saved place deletion, activity logging

---

# 12. Styling System

## Tailwind CSS 3

- `tailwind.config.js`: Custom `primary` (#0d6cf2), `background-light`, `background-dark`, Inter font, custom border radii, glow shadows
- `darkMode: "class"` — toggled by adding/removing `dark` class on `<html>`
- Theme CSS variables in `theme.css` (shadcn/ui style) — light + dark tokens
- Main styles in `styles/index.css` (850 lines) — component-specific CSS

## CSS Architecture (3 files + empty file)

1. **`styles/tailwind.css`** (3 lines): `@tailwind base/components/utilities`
2. **`styles/theme.css`** (152 lines): CSS custom properties for shadcn/ui design system
3. **`styles/index.css`** (850 lines): All custom styles — bottom nav, theme toggle, notifications, transport cards, marker animations, light mode overrides, Leaflet fixes
4. **`styles/fonts.css`** (0 lines): Empty

## Entry Point Confusion

- `main.tsx` imports `"../styles/index.css"` (the 850-line file)
- `index.css` (at root `frontend/src/index.css`) also exists with 108 lines — duplicate tailwind imports, font import, Leaflet fixes
- The root `index.css` may not be loaded at all (not imported by any entry)

## Themes

- **Dark (default):** `#101722` background, `#0d6cf2` primary, slate tones
- **Light:** `#eefbff` background, `#e85d4f` primary (completely different primary color)
- Toggled via `ThemeToggle` component in `App.tsx`
- Theme stored in `localStorage` key `medio-theme`
- Light mode overrides are extensive (50+ CSS rules in `index.css` overriding Tailwind classes with `!important`)

## Colors

- Primary: `#0d6cf2` (dark) / `#e85d4f` (light)
- Background: `#101722` (dark) / `#f5f7f8` (light)
- Surface tones: slate-950/900/800 with opacity
- Accent cool: `#38bdf8`, fresh: `#2dd4bf`, warm: `#fb7185`
- Transport colors (96 mappings in `transportColors.ts`)

## Typography

- Font family: Inter (Google Fonts)
- Loading: `@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap")`
- Font weights: 400, 500, 600, 700 available
- Letter spacing: Tight tracking for headings (0.18em-0.3em uppercase)

## Spacing

- Tailwind default spacing scale
- Custom border radii: default `1rem`, `lg: 2rem`, `xl: 3rem`
- Custom shadows: `glow`, `glow-soft`

## Responsiveness

- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px)
- Bottom navigation switches from column to row on md+
- Bottom sheet uses `vh` heights: collapsed (9.5rem), half (54vh), full (82vh)
- Safe area insets via `env(safe-area-inset-*)` for notched devices

---

# 13. Performance

## Current State

**No performance optimizations implemented.** The application works but has several bottlenecks:

## Lazy Loading

- **None.** All components are eagerly loaded. The SplashScreen → Login/Meet transition loads all JS upfront.
- React.lazy() and Suspense not used anywhere.
- Vite code splitting is at default (per-entry chunk).

## Memoization

- `useMemo` used in MeetView for category counts, filtered results, available categories
- `useMemo` used in Map for marker bounds, legs, legend items
- `useCallback` used in TravelView for `handleNearbyPlacesChange`
- **No React.memo** on any component (Map rerenders on every state change)

## Code Splitting

- Vite generates a single main chunk + vendor chunk
- No route-based code splitting
- All shadcn/ui components (52 files) are importable but may be tree-shaken

## Bundle Size

- Dependencies: react 19, react-dom 19, react-router-dom 7, leaflet, react-leaflet, framer-motion (unused), recharts (unused), 30+ @radix-ui packages, lucide-react
- Full bundle likely 500KB+ gzipped
- shadcn/ui components are individually importable but their combined weight is significant

## Rendering Bottlenecks

1. **Map rerenders:** All marker/route state lives in parent components (MeetView/TravelView). Any state change (e.g., typing in inputs) causes full map rerender.
2. **No virtualization:** Meet result list and route timeline render all items. Could be slow with many itineraries.
3. **NotificationBell double-fetch:** Fetches profile data independently, duplicating ProfileView's request.
4. **Leaflet without shouldComponentUpdate:** `RealMap` receives new arrays every render (no memo on markers/routeData).
5. **Overpass API calls:** Direct from browser without backend proxy — exposes API key, blocks on DNS.

---

# 14. Current Strengths

1. **Meeting point algorithm is production-ready.** The 3-tier fallback (OSM → Photon → Surface → Estimated) is robust and gracefully degrades. The in-memory caching layer prevents redundant OTP/Overpass calls.

2. **Security middleware is excellent.** CORS whitelist, CSRF origin guard, 3-tier rate limiting, request sanitization (prototype pollution), Zod validation on every endpoint, JWT with audience/issuer verification, password strength requirements.

3. **OTP integration is solid.** Mumbai-specific transit data with metro lines, local trains, and BEST buses. GraphQL queries with leg geometry decoding. Multi-modal route planning.

4. **UI is functional and feature-complete.** Meet view, travel view with route details, saved places, profile management, activity logging, Google OAuth, light/dark theme.

5. **Deployment configurations are complete.** Docker (backend + frontend + OTP), Render Blueprint, Google Cloud Build, Vercel config, Nginx config, Capacitor config — all present and configured.

6. **Error handling is consistent.** Structured JSON logging with secret redaction, global error handler, TypeScript strict mode.

7. **The Transit color system is detailed.** 96-line mapping of Mumbai metro lines, railway lines, and transport modes to specific colors with regex-based matching.

---

# 15. Technical Debt

## Duplicated Code

1. **Route endpoints overlap:** `otp.routes.ts` and `route.routes.ts` both define `POST /api/otp/route`. `otp.routes.ts` is a simpler version without mode selection. This is a bug waiting to happen.

2. **Location search logic duplicated:** Backend `search.routes.ts` has its own dedup/normalization; frontend `locationSearch.ts` has its own dedup/normalization. Different implementations.

3. **Debounce logic duplicated:** MeetView and TravelView each implement the same debounce pattern (400ms setTimeout) for both location inputs.

4. **CSS files duplicated:** `frontend/src/index.css` and `frontend/src/styles/index.css` are both present with overlapping content.

5. **Fonts file is empty:** `styles/fonts.css` exists but has 0 lines of CSS.

6. **Legacy PlaceCard:** `PlaceCard.tsx` is never used but remains in the codebase.

7. **Unused ImageWithFallback:** `figma/ImageWithFallback.tsx` is never imported.

8. **Unused dependencies:** `framer-motion`, `recharts`, `next-themes`, `react-day-picker`, `react-hook-form`, `sonner`, `vaul`, `input-otp`, `cmdk`, `embla-carousel-react`, `react-resizable-panels` — all in package.json but never imported in actual code.

## Bad Architecture

1. **No global state management:** Zero contexts or stores. Auth state is not shared — every page independently calls `/api/auth/me`. Profile data is fetched by both ProfileView and NotificationBell.

2. **Prop drilling in TravelView:** `TravelSearch.tsx` receives 17 props. Adding a new feature requires threading props through 3+ components.

3. **Inline business logic in components:** MeetView has `fetchMeetRoute()`, `handleFindMeetingPoint()`, `resetMeetState()` all inline (778 lines). Same for TravelView (528 lines).

4. **Map component too coupled:** `RealMap` knows about transit colors, Mumbai metro lines, route rendering. Should be a pure map container.

5. **No route-based code splitting:** The entire app loads in one chunk.

6. **CSS-in-JS inconsistency:** Mix of Tailwind classes, CSS variables, raw CSS files, and inline styles in Map legend.

7. **Light theme is fragile:** Uses `!important` extensively to override dark mode styles. Adding new components requires light mode CSS overrides.

8. **Auth token management:** Stored in both localStorage and HTTP-only cookie. The localStorage token is sent as Bearer header while cookie is also sent. Redundant.

## Possible Bugs

1. **Route conflict:** `app.ts` mounts both `routeRoutes` and `otpRoutes` to `/api/otp`. Both define `POST /route`. The first one registered wins.

2. **Unused imports:** Many shadcn/ui components are installed but not used. Increases bundle size unnecessarily.

3. **Overpass API from browser:** `NearbyPanel.tsx` calls Overpass directly from the client. Exposes the endpoint, bypasses backend rate limiting, and may fail in restrictive networks.

4. **No `React.memo` on Map:** Any parent state change causes the full Leaflet map to rerender, re-creating all markers and polylines.

5. **Race condition in MeetView:** `useEffect` for auto-fetching routes runs on every `selectedMeet` change, but won't re-run if a route was already cached for a previous selection.

6. **SplashScreen redirect:** 10-second forced splash — even if user is already authenticated. Should redirect immediately on auth check.

7. **No HTTP-only refresh token:** If JWT expires, user is silently logged out with no way to refresh.

---

# 16. Migration Readiness

## Goal
Rebuild the entire frontend with a premium dark UI, cinematic animations, while keeping backend, database, authentication, APIs, and business logic intact.

## What CAN Remain Unchanged

| Component | Reason |
|-----------|--------|
| **Entire backend (`backend/`)** | Express API, controllers, services, models, middleware, validators — all untouched |
| **MongoDB schemas** | User, Place, History models remain identical |
| **JWT implementation** | signToken + verifyToken logic |
| **Google OAuth flow** | Redirect + callback + native endpoints |
| **Meeting point algorithm** | `meet.services.ts`, `poi.services.ts`, `surface.services.ts` |
| **OTP integration** | `route.controller.ts`, `otp.services.ts`, `opentripplanner.service.ts` |
| **Search endpoint** | `search.routes.ts` — Photon geocoder with cache |
| **Middleware** | Security, validation, error handling — all production-grade |
| **Environment config** | `env.ts` schema and validation |
| **All API endpoints** | URL paths, request/response shapes remain stable |
| **OTP project** | `otp-project/` — transit graph, Dockerfile, config |
| **Deployment configs** | Docker, Render, Cloud Build, Vercel — only frontend Dockerfile changes |

## What MUST Change

| Component | Reason |
|-----------|--------|
| **Styling system** | Premium dark UI requires new design tokens, new color system, new typography |
| **CSS architecture** | Current system uses 3 CSS files + `!important` overrides for light mode. Needs a clean design system |
| **Theme toggle** | Current theme uses two different primary colors. Premium UI needs a single identity |
| **Component library** | 52 shadcn/ui components with 90% unused. Needs audit and replacement or trimming |

## What MUST Be Rewritten

| Component | Reason |
|-----------|--------|
| **`MeetView.tsx`** | 778 lines of inline logic, no separation of concerns |
| **`TravelView.tsx`** | 528 lines with prop drilling, no state management |
| **`Map.tsx`** | Tightly coupled to transit colors, needs cleaner API |
| **`ProfileView.tsx`** | 604 lines with inline sub-components |
| **All styling** | Move from 3 CSS files to a proper design system |

## What CAN Be Reused

| Component | Reason |
|-----------|--------|
| **`routeUtils.ts`** | Pure utility functions — formatting, metrics, fare estimation |
| **`transportColors.ts`** | Mumbai line color mappings (data, not UI) |
| **`markerIcons.ts`** | SVG marker icons (may need restyling) |
| **`otpTypes.ts`** | TypeScript interfaces |
| **`api.ts`** | Fetch wrapper with auth (may be enhanced) |
| **`backend.ts`** | URL resolution |
| **`locationSearch.ts`** | Autocomplete logic |

---

# 17. File Mapping

| Current File | Future File | Action |
|-------------|-------------|--------|
| `frontend/src/main.tsx` | `src/main.tsx` | Keep entry, update imports |
| `frontend/src/app/App.tsx` | `src/App.tsx` | Rewrite — new routing, remove ThemeToggle |
| `frontend/src/app/lib/api.ts` | `src/lib/api.ts` | Enhance with refresh token, typed responses |
| `frontend/src/app/lib/backend.ts` | `src/lib/backend.ts` | Keep |
| `frontend/src/app/lib/locationSearch.ts` | `src/lib/locationSearch.ts` | Keep |
| `frontend/src/app/components/medio/MeetView.tsx` | `src/pages/MeetPage.tsx` | Full rewrite — extract logic to hooks |
| `frontend/src/app/components/medio/TravelView.tsx` | `src/pages/TravelPage.tsx` | Full rewrite — extract logic to hooks |
| `frontend/src/app/components/medio/ProfileView.tsx` | `src/pages/ProfilePage.tsx` | Full rewrite — extract sub-components |
| `frontend/src/app/components/medio/UserGuideView.tsx` | `src/pages/GuidePage.tsx` | Rewrite with dynamic content |
| `frontend/src/app/components/medio/SplashScreen.tsx` | `src/pages/SplashPage.tsx` | Rewrite with cinematic animation |
| `frontend/src/app/components/medio/Map.tsx` | `src/components/Map/Map.tsx` | Refactor — pure map, decouple from transit colors |
| `frontend/src/app/components/medio/BottomNav.tsx` | `src/components/layout/BottomNav.tsx` | Keep, restyle |
| `frontend/src/app/components/medio/NotificationBell.tsx` | `src/components/notifications/NotificationBell.tsx` | Keep, restyle |
| `frontend/src/app/components/medio/auth/Login.tsx` | `src/pages/LoginPage.tsx` | Rewrite with new UI |
| `frontend/src/app/components/medio/auth/ProtectedRoute.tsx` | `src/components/auth/ProtectedRoute.tsx` | Refactor — use context instead of API call |
| `frontend/src/app/components/medio/travel/TravelSearch.tsx` | `src/components/travel/TravelSearch.tsx` | Refactor — connect to state management |
| `frontend/src/app/components/medio/travel/TravelBottomSheet.tsx` | `src/components/travel/TravelBottomSheet.tsx` | Rewrite with new animations |
| `frontend/src/app/components/medio/travel/RouteCard.tsx` | `src/components/travel/RouteCard.tsx` | Keep, restyle |
| `frontend/src/app/components/medio/travel/RouteTimeline.tsx` | `src/components/travel/RouteTimeline.tsx` | Keep, restyle |
| `frontend/src/app/components/medio/travel/routeUtils.ts` | `src/lib/routeUtils.ts` | Keep |
| `frontend/src/app/components/medio/travel/transportColors.ts` | `src/lib/transportColors.ts` | Keep |
| `frontend/src/app/components/medio/travel/markerIcons.ts` | `src/lib/markers.ts` | Keep, enhance |
| `frontend/src/app/components/medio/travel/NearbyPanel.tsx` | `src/components/travel/NearbyPanel.tsx` | Refactor — proxy through backend |
| `frontend/src/app/components/medio/travel/FloatingButtons.tsx` | `src/components/travel/FloatingButtons.tsx` | Keep, restyle |
| `frontend/src/app/components/medio/travel/TransportLegend.tsx` | `src/components/travel/TransportLegend.tsx` | Keep, restyle |
| `frontend/src/app/components/medio/travel/RouteModeIcon.tsx` | `src/components/travel/RouteModeIcon.tsx` | Keep |
| `frontend/src/app/components/medio/otpTypes.ts` | `src/types/otp.ts` | Keep |
| `frontend/src/app/components/medio/PlaceCard.tsx` | — | DELETE (unused) |
| `frontend/src/app/components/figma/ImageWithFallback.tsx` | — | DELETE (unused) |
| `frontend/src/styles/index.css` | `src/styles/design-system.css` | Replace with new DS tokens |
| `frontend/src/styles/theme.css` | `src/styles/themes/dark.css`, `themes/light.css` | Split into modular files |
| `frontend/src/styles/tailwind.css` | `src/styles/tailwind.css` | Keep |
| `frontend/src/styles/fonts.css` | — | DELETE (empty) |
| `frontend/src/index.css` | — | DELETE (duplicate) |
| `frontend/src/app/components/ui/` | `src/components/ui/` | Audit — keep only used ones |
| `backend/src/routes/otp.routes.ts` | — | DELETE (duplicate of route.routes.ts) |

---

# 18. Safe Migration Order

## Phase 0: Foundation (No user-facing changes)

1. Delete `frontend/src/styles/fonts.css` (empty)
2. Delete `frontend/src/app/components/medio/PlaceCard.tsx` (unused)
3. Delete `frontend/src/app/components/figma/ImageWithFallback.tsx` (unused)
4. Resolve route conflict: delete `backend/src/routes/otp.routes.ts` and its import in `app.ts`
5. Remove unused npm dependencies from `package.json`
6. Reorganize CSS: merge duplicate `index.css` files
7. Test that nothing breaks

## Phase 1: State Management & API Layer

1. Create an auth context (React Context) to share auth state globally
2. Replace `api.ts` with typed API client using the auth context
3. Create `useAuth` hook
4. Update `ProtectedRoute.tsx` to use context instead of independent API call
5. Update `NotificationBell.tsx` to use shared auth/profile context
6. Create `useLocationSearch` hook (consolidate duplicated debounce logic)
7. Test: auth still works, pages still load

## Phase 2: New Design System

1. Create new `src/styles/` directory with design tokens
2. Set up new Tailwind config with premium dark UI colors
3. Create base component primitives (Button, Input, Card, etc.)
4. Set up animation system (Framer Motion or GSAP)
5. Build new theme toggle with unified design identity
6. Test: new components render correctly

## Phase 3: Rewrite Pages One by One

**Order (safest → least safe):**

1. **SplashScreen** — Simplest page, no API calls, pure UI
2. **LoginPage** — Self-contained, no dependencies
3. **UserGuideView** — Static content
4. **ProfileView** — Self-contained, one API pattern (GET + PATCH)
5. **TravelView** — Most complex, do after Travel sub-components
6. **MeetView** — Most API-dependent, do last

**For each page:**
1. Create new page component in `src/pages/`
2. Extract business logic into custom hooks
3. Connect to auth context and API layer
4. Add to router
5. Keep old page as fallback
6. A/B test if possible
7. Only remove old page after verification

## Phase 4: Map Refactor

1. Decouple `RealMap` from transit colors — inject as props/context
2. Add `React.memo` with proper comparison
3. Add marker clustering for large datasets
4. Create pure Map container without app logic

## Phase 5: Polish

1. Add loading skeletons
2. Add transitions between routes
3. Add error boundaries
4. Performance audit
5. Bundle size optimization

## Backend Changes Required

| Change | When | Risk |
|--------|------|------|
| Delete `otp.routes.ts` | Phase 0 | Low (confirmed duplicate) |
| Add CORS origin for new frontend URL | Phase 0 | Low |
| Proxy Overpass through backend | Phase 3 | Medium (new endpoint) |

---

# 19. Final Engineering Verdict

## Architecture Scores (out of 10)

| Category | Score | Explanation |
|----------|-------|-------------|
| **Overall Architecture** | **6.5/10** | Solid backend with clean separation, but frontend lacks state management and has massive inline components |
| **Scalability** | **7/10** | Backend is stateless and horizontally scalable. Meeting algorithm has in-memory caches (single-node limitation). Frontend has no code splitting. |
| **Maintainability** | **4/10** | 778-line inline components, prop drilling, duplicated logic, no global state, unused components, CSS duplication |
| **UI/UX Score** | **5/10** | Functional but not premium. Dark theme is good. Light theme is fragile. No animations, no page transitions, no loading states. |
| **Backend Score** | **8.5/10** | Clean Express setup, excellent security, Zod validation, structured logging, proper error handling. The meeting point algorithm is sophisticated. |
| **Production Readiness** | **7/10** | Security is strong. Deployment configs are complete. But performance bottlenecks (no code splitting, map rerenders) and technical debt (route conflict, unused code) hold it back. |

**Overall: 6.3/10** — A functional application with a production-grade backend and a frontend that needs significant architectural work before a premium UI migration.

## Best Migration Strategy

### Recommended Approach: "Parallel New Construction"

Do NOT rewrite in place. Instead:

1. **Keep the current frontend running in production** — users continue using the current UI
2. **Build the new frontend in a separate directory** (`frontend-v2/` or use monorepo packages)
3. **Use the same backend** — no backend changes (except removing `otp.routes.ts`)
4. **Deploy new frontend to a staging URL** — test with real backend
5. **Gradually redirect traffic** — use feature flags or cookie-based routing
6. **Cut over when validation passes**

### Technology Recommendations for New Frontend

| Concern | Recommendation |
|---------|---------------|
| Framework | Next.js (for SSR/SSG + API routes) OR keep Vite + React SPA |
| State | Zustand (lightweight) + React Query (server state) |
| Routing | React Router v7 (already have it) |
| Styling | Tailwind v4 + CSS Modules for component-specific styles |
| Animations | Framer Motion (already installed, use it properly) |
| Map | Keep Leaflet, but wrap in a pure container |
| Icons | Keep Lucide (good selection, tree-shakeable) |
| Auth Context | Create `useAuth` hook + AuthProvider |
| API Client | TanStack React Query for caching + dedup |
| Forms | React Hook Form (already installed) |

### Key Principles

1. **Backend is sacred** — do not modify any controller, service, model, or middleware
2. **APIs are the contract** — frontend talks to backend only through existing endpoints
3. **Incremental delivery** — rewrite one page at a time, validate each
4. **No regressions** — existing functionality must work identically
5. **Performance first** — code splitting, lazy loading, memoization from day one

---

*End of Report*
