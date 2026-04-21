# 103 Tactical Training — Web Platform

Monorepo containing the public website and CMS admin panel.

```
web/
├── app/          Remix public website (SSR)
└── cms/          Payload CMS admin panel (Next.js)
```

Both services are deployed independently on **Render**.

---

## Website (`app/`)

**Stack:** Remix + Vite, server-side rendered, Node.js

**Dev commands:**
```bash
npm run dev      # start dev server on http://localhost:3000
npm run build    # production build
npm run start    # run production server (after build)
```

**Environment:** Copy `.env` and fill in values. See `ENVIRONMENT-VARIABLES.txt` at the project root for a description of every variable.

---

## CMS (`cms/`)

**Stack:** Payload CMS v3, Next.js, PostgreSQL

**Dev commands** (run from `cms/`):
```bash
npm run dev      # start CMS dev server on http://localhost:3001
npm run build    # production build
npm run start    # run production server (after build)
```

**Environment:** Copy `cms/.env` and fill in values. See `ENVIRONMENT-VARIABLES.txt` at the project root for a description of every variable.

---

## Documentation

All go-live, deployment, and configuration documentation lives at the project root:

| File | Purpose |
|------|---------|
| `GO-LIVE-CHECKLIST.txt` | Step-by-step launch checklist with completion status |
| `ENVIRONMENT-VARIABLES.txt` | Description of every env var for both services |
| `EMAIL-SETUP.txt` | Every email address used by the platform and what it does |
