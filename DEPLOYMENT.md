# Lulit Deployment

This repo is currently optimized for local development. To make it reachable by everyone all the time, split it into permanent hosted pieces:

1. `frontend/` as a static web app on a frontend host
2. `backend/` as a long-running API service
3. `ai-service/` as a long-running API service
4. a managed PostgreSQL database instead of local H2
5. deployed DAO contracts on a public chain or testnet
6. `mobile-app/` built and distributed as an installable app

## Recommended Production Shape

- Web app: Vercel, Netlify, or Render Static Site
- Backend API: Render, Railway, Fly.io, AWS App Runner, or Cloud Run
- AI service: Render, Railway, Fly.io, AWS App Runner, or Cloud Run
- Database: Neon, Supabase Postgres, Render Postgres, Railway Postgres, or RDS
- Mobile app: Expo EAS Build + Play Store / App Store distribution
- Domains:
  - `app.yourdomain.com` for frontend
  - `api.yourdomain.com` for backend
  - `ai.yourdomain.com` for AI service

## Why the Current Local Setup Is Not Enough

- `backend` defaults to a local H2 file DB, which lives on one machine.
- `mobile-app` currently points at LAN or emulator URLs.
- Expo dev server is for development only; users cannot depend on your laptop being on.
- local DAO RPC addresses like Hardhat `31337` are not public or persistent.

## Files Added For Deployment

- `backend/Dockerfile`
- `ai-service/Dockerfile`
- `mobile-app/eas.json`
- `backend/.env.production.example`
- `frontend/.env.production.example`
- `mobile-app/.env.production.example`
- `ai-service/.env.example`

## Backend Deployment

Use `backend/Dockerfile` on your host of choice.

If you deploy on Render, this repo now includes `render.yaml` for the backend and AI service so you can create services from the GitHub repo with fewer manual steps.

Required production changes:

- move `DB_URL` to PostgreSQL
- set `SPRING_PROFILES_ACTIVE=prod`
- set `COOKIE_SECURE=true`
- replace all placeholder secrets
- point `AI_*_ENDPOINT` variables at the hosted AI service
- point `DAO_*` variables at public deployed contract addresses

Example build/start behavior is already encapsulated in the Dockerfile.

## AI Service Deployment

Use `ai-service/Dockerfile`.

If you want always-on AI endpoints, do not rely on a local Ollama instance unless you also host Ollama on a server. You have two valid paths:

1. Host Ollama on a GPU/CPU VM and point `OLLAMA_URL` at it
2. Set `OLLAMA_ENABLED=false` and run with the built-in fallback behavior until you replace it with a hosted model provider

## Frontend Deployment

Deploy the built Vite app from `frontend/`.

Build command:

```bash
npm install
npm run build
```

Publish directory:

```text
dist
```

Set production env vars from `frontend/.env.production.example`.

For Vercel, import the GitHub repo, set the project root to `frontend`, use the default Vite build, and set the variables from `frontend/.env.production.example`.

## Mobile App Deployment

To make the mobile app accessible without your laptop:

1. install `eas-cli`
2. run `npx eas login`
3. run `npx eas init`
4. set app env vars from `mobile-app/.env.production.example`
5. create builds with:

```bash
npx eas build --platform android --profile production
```

and:

```bash
npx eas build --platform ios --profile production
```

Then distribute through:

- Google Play internal testing / production
- Apple TestFlight / App Store

For JS-only changes after release, use EAS Update after the project is initialized.

Before the first store build, make sure you:

1. log in with Expo
2. run `npx eas init`
3. confirm the Android package and iOS bundle identifier in `mobile-app/app.json`
4. add the production API and DAO URLs in Expo secrets or build env vars

## DAO Production Notes

For public DAO access:

- deploy contracts to Sepolia first, then mainnet or your chosen production chain
- replace all localhost contract addresses in frontend, backend, and mobile envs
- use a public RPC provider
- keep Pinata or another IPFS pinning service configured

## Recommended Rollout Order

1. Deploy PostgreSQL
2. Deploy backend
3. Deploy AI service
4. Deploy web frontend
5. Deploy DAO contracts to a public network
6. update web and backend DAO env vars
7. build and ship the mobile app with EAS

## Minimum To Go Live Fast

If you want the fastest path:

1. host frontend on Vercel
2. host backend on Render using `render.yaml`
3. host AI service on Render using `render.yaml`
4. move DB to Neon Postgres
5. build Android app with EAS and distribute the APK/AAB

That gets you from "works only on my machine" to "public and always reachable" with the fewest moving parts.
