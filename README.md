# 103 Tactical – Public site (Remix + Vite, SSR)

React/Remix app with server-side rendering. Deploy to DigitalOcean App Platform from the `web` directory.

## Commands

- **`npm run dev`** – Start dev server (Vite + Remix).
- **`npm run build`** – Production build (output in `build/`).
- **`npm run start`** – Run production server (after build).

## SEO metadata

Default meta (title, description, OG, Twitter) comes from `app/data/site-metadata.json`. This file is a copy of the project’s `content/site-metadata.json` so the app is self-contained for deployment. Later, this can be driven by Payload CMS.

## Deployment (DigitalOcean)

See **`docs/DIGITALOCEAN-SETUP.md`** for:

- Creating the PostgreSQL database (for Payload).
- Creating the App (source directory: `web`, build: `npm ci && npm run build`, run: `npm run start`).
- Environment variables and credentials.
