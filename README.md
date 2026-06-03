# Project-Medio
An app for finding shortest 2 way distances

# Instructions
1. Copy `backend/.env.example` to `backend/.env` and fill in real local values.
2. Copy `frontend/.env.example` to `frontend/.env` if the frontend needs a non-default API URL.
3. Start the frontend: `cd frontend && npm run dev`
4. Start the backend: `cd backend && npm run dev`
5. Start OTP:
   - Build: `java -Xmx4G -jar otp.jar --build --save otp-data`
   - Run: `java -Xmx4G -jar otp.jar --load otp-data --serve`

# Deployment

## Render backend

The backend deploy is split into two Render services in `render.yaml`:

- `medio-otp`: a private Docker service that runs `otp-project/otp.jar` with `otp-project/otp-data`.
- `medio-api`: the public Node/Express API. Render injects the OTP private address as `OTP_HOSTPORT`, and the API derives the OTP GraphQL/isochrone URLs from it.

Create a Render Blueprint from this repo and fill the synced env vars:

- `FRONTEND_URL`: your production Vercel URL, for example `https://your-app.vercel.app`.
- `ALLOWED_ORIGINS`: include the Vercel URL and any custom web domains.
- `MONGO_URI`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`: `https://your-render-api.onrender.com/api/auth/google/callback`

`CAPACITOR_ORIGINS` is already set in the blueprint for Android/iOS WebView origins.

## Vercel frontend

Deploy the `frontend` directory as the Vercel project root.

- Build command: `npm run build`
- Output directory: `dist`
- Env var: `VITE_BACKEND_URL=https://your-render-api.onrender.com`

`frontend/vercel.json` rewrites all routes to `index.html` so React Router works on refresh.

## Android and PWA

The frontend is configured as a PWA and a Capacitor app.

- Build web assets: `cd frontend && npm run build`
- Sync native assets: `npx cap sync android`
- Open Android Studio later: `npx cap open android`

For Apple devices, deploy the Vercel frontend over HTTPS and use Safari's Add to Home Screen flow.

# Clean dir of metadata files
find . -type f -name '._*' -delete
