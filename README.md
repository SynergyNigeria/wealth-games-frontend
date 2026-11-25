# MR Wealth’s Giveaway — frontend

React/Vite frontend for MR Wealth’s Giveaway. This folder is the root of the
frontend GitHub repository; it can be pushed and deployed independently of the
backend.

## Local development

Requires Node.js 20.19+ (or 22.12+).

```powershell
npm ci
npm run dev
```

By default, Vite proxies `/api` requests to `http://127.0.0.1:8001`. Start the
Django backend on that address, or set `VITE_API_PROXY_TARGET` to the backend
origin before starting Vite.

## Build

```powershell
npm ci
npm run build
npm run preview
```

## Deploy to Render

1. Push the contents of this folder to its own GitHub repository.
2. In Render, create a **Blueprint** from that repository and apply
   `render.yaml`. It creates a static site, builds with `npm ci && npm run
   build`, and rewrites client-side routes to `index.html`.
3. Set the required `VITE_API_BASE_URL` environment variable for the Render
   service to the backend origin, for example
   `https://your-account.pythonanywhere.com` (no trailing slash or `/api`).
4. Deploy or trigger a new deploy after changing the value. Vite embeds this
   variable at build time.
5. Add the exact deployed Render origin to the backend's
   `CORS_ALLOWED_ORIGINS` setting.

If you later move the frontend to Cloudflare Pages, configure the same
`VITE_API_BASE_URL` build variable and an SPA fallback to `/index.html`.

The `/bets` page lists open and closed numeric-range predictions. Signed-in
users can submit one final range per bet; admins close entries and settle the
result from the backend Django admin.
