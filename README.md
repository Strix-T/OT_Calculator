# Timecard OT Calculator PWA

Screenshot → hours → OT math. Upload a timecard screenshot, parse the **Total Hours** column via OpenAI Vision, edit hours, and calculate regular/OT pay with triple/quad modes.

## Quick start

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Environment

Copy `.env.example` to `.env.local` and fill your values:

- `OPENAI_API_KEY` – server-side only
- `ALLOWED_USER_IDS` – comma list, validated on the API route
- `OPENAI_VISION_MODEL` – e.g. `gpt-4o-mini`
- `NEXT_PUBLIC_ALLOWED_USER_IDS` – optional UI gate mirror of `ALLOWED_USER_IDS`

## Deploy (Vercel + custom domain)

See `docs/deploy/vercel.md` for step-by-step instructions to deploy and point `danycp.com` at the app.

## Architecture

- Next.js App Router + TypeScript + Tailwind
- PWA via `next-pwa` (`next.config.mjs`, manifest + icons in `public/`)
- API route: `app/api/parse-timecard/route.ts` (calls OpenAI Responses API with vision)
- Calculation engine: `lib/calc.ts` (threshold 9.5h, triple=1.5×, quad=2.5×)
- Client UI: `app/page.tsx` with `TimecardUploader`, `ResultsTable`, `MoneySummary`

## Commands

- `npm run dev` – start dev server
- `npm run build` – production build
- `npm run start` – run production build
- `npm run lint` – lint sources
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
