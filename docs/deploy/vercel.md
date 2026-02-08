# Deploying to Vercel with `danycp.com`

This project is a Next.js app (App Router) with a server API route (`/api/parse-timecard`) that calls OpenAI, so it needs a host that supports **serverless/Node** (Vercel is the simplest).

## 1) Put the code in a git repo

Vercel can deploy via CLI, but the most reliable flow is GitHub + Vercel.

```bash
git init
git add .
git commit -m "Initial commit"
```

Create a GitHub repo, add it as `origin`, and push.

## 2) Create a Vercel project

- Import the GitHub repo into Vercel
- Framework preset: **Next.js**
- Build command: `npm run build`
- Output directory: (leave default)

## 3) Set environment variables (Vercel → Project → Settings → Environment Variables)

Required:

- `OPENAI_API_KEY`
- `ALLOWED_USER_IDS` (comma-separated)
- `OPENAI_VISION_MODEL` (e.g. `gpt-4o-mini`)

Optional (UI-only gate mirror):

- `NEXT_PUBLIC_ALLOWED_USER_IDS`

## 4) Add the custom domain (`danycp.com`)

In Vercel: Project → Settings → Domains → add:

- `danycp.com` (apex)
- `www.danycp.com` (optional redirect)

Vercel will show the exact DNS records it needs. Commonly:

- Apex: an `A` record to `76.76.21.21`
- `www`: a `CNAME` to `cname.vercel-dns.com`

## 5) Verify HTTPS and PWA install

PWA install requires HTTPS, which Vercel will provide once DNS is correct.

## 6) Deploy

Once connected, every push to your production branch will deploy automatically.

