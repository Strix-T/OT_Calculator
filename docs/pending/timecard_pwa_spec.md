# Timecard OT Calculator PWA (Screenshot → Math) — Build Spec + Starter Skeleton

This is a small **PWA** that lets a user upload a timecard screenshot (like the UPSERS screenshots you’ve been sending), uses the **OpenAI API (vision)** to read the **“Total Hours” column**, computes **daily OT = max(0, hours - 9.5)**, then computes OT pay using either:

- **“Triple pay” toggle → 1.5×** (per your spec)
- **“Quad pay” toggle → 2.5×** (per your spec)

It will also show the full math: per-day hours, OT hours, subtotals, tax, and final total.

> Important: **Do not put your OpenAI key in the browser.**  
> The PWA UI runs client-side, but the OpenAI call must go through a server endpoint (Next.js Route Handler) to keep your key private.

---

## 1) Tech Stack Recommendation (simple + STRIX-friendly)

**Option A (recommended): Next.js (App Router) + Route Handler + PWA**
- You already use Next.js/Tailwind a lot.
- You get an `/api/parse-timecard` endpoint easily.
- Deploy to Vercel/Cloudflare Pages (with Functions) etc.

**Option B: Vite + Cloudflare Worker**
- Also great, slightly more wiring for the API proxy.

This spec uses **Option A**.

---

## 2) Requirements Checklist

### Access / Auth (hardcoded)
- User enters a **User ID** to unlock controls
- UI can hardcode allowed IDs, **but** the server endpoint should also validate IDs (basic gate)

### Inputs
- Normal pay rate (hourly)
- Toggle: **Triple / Quad**
- Tax percent (e.g., 22 for 22%)
- Upload screenshot (phone/PC)

### Vision Parse
- Call OpenAI with image
- Extract the **Total Hours column values** (one per row/day; ignore 0.00 rows)
- Return machine-readable JSON

### Calculation
For each day:
- `overtimeHours = max(0, hours - 9.5)`
- `regularHours = min(hours, 9.5)` (this matches your “subtract 9.5 if over 9.5” rule)

Totals:
- `totalRegularHours = sum(regularHours)`
- `totalOvertimeHours = sum(overtimeHours)`
- `regularPay = totalRegularHours * payRate`
- `overtimePay = totalOvertimeHours * payRate * multiplier`
  - multiplier = 1.5 (triple) OR 2.5 (quad)
- `grossSubtotal = regularPay + overtimePay`
- `tax = grossSubtotal * (taxPercent / 100)`
- `netTotal = grossSubtotal - tax`

### UI Output
- Show the extracted values and the math in a table:
  - Original hours | Regular hours | OT hours | OT pay for day (and/or total)
- Show:
  - Regular pay, OT pay, Gross subtotal, Tax amount, Net total
- Let user **edit extracted hours** before finalizing (OCR is never perfect)

---

## 3) Data Contracts

### Client → Server
`POST /api/parse-timecard`
- `FormData`:
  - `image` (file)
  - `userId` (string)

### Server → Client (JSON)
```json
{
  "hours": [11.45, 12.81, 12.43, 12.56, 9.88],
  "rawText": "optional excerpt",
  "warnings": ["optional warnings"],
  "confidence": 0.82
}
```

---

## 4) Prompting Strategy (make parsing reliable)

You want the model to output **strict JSON** and nothing else.

**System**:
- “You are extracting numeric values from a timecard screenshot…”

**User message**:
- “Extract the *Total Hours* column values (one per day row). Ignore any summary row(s) and ignore 0.00 rows if they represent days not worked. Return ONLY JSON…”

Also ask it to:
- Normalize to numbers with 2 decimals.
- Preserve order top-to-bottom.

---

## 5) Project Structure (Next.js App Router)

```
timecard-pwa/
  app/
    page.tsx
    layout.tsx
    api/
      parse-timecard/
        route.ts
  components/
    TimecardUploader.tsx
    ResultsTable.tsx
    MoneySummary.tsx
  lib/
    calc.ts
    auth.ts
    types.ts
  public/
    manifest.webmanifest
    icons/
  next.config.mjs
  package.json
  tailwind.config.ts
  postcss.config.mjs
  .env.local
```

---

## 6) Environment Variables

`.env.local`
```
OPENAI_API_KEY=sk-...
ALLOWED_USER_IDS=1234,9999,TRAVIS
OPENAI_VISION_MODEL=gpt-4o-mini
```

> Keep `ALLOWED_USER_IDS` both client-side (for UI) and server-side (real gate).  
> The server-side check is what matters.

---

## 7) Core Calculation Module

`lib/calc.ts`
```ts
export type PayMode = "triple" | "quad";

export function calcFromHours(params: {
  hours: number[];
  payRate: number;
  taxPercent: number;
  mode: PayMode;
  threshold?: number; // default 9.5
}) {
  const threshold = params.threshold ?? 9.5;
  const multiplier = params.mode === "triple" ? 1.5 : 2.5;

  const rows = params.hours.map((h) => {
    const regularHours = Math.min(h, threshold);
    const overtimeHours = Math.max(0, h - threshold);
    return { hours: h, regularHours, overtimeHours };
  });

  const totalRegularHours = rows.reduce((a, r) => a + r.regularHours, 0);
  const totalOvertimeHours = rows.reduce((a, r) => a + r.overtimeHours, 0);

  const regularPay = totalRegularHours * params.payRate;
  const overtimePay = totalOvertimeHours * params.payRate * multiplier;
  const grossSubtotal = regularPay + overtimePay;

  const tax = grossSubtotal * (params.taxPercent / 100);
  const netTotal = grossSubtotal - tax;

  return {
    threshold,
    multiplier,
    rows,
    totals: {
      totalRegularHours,
      totalOvertimeHours,
      regularPay,
      overtimePay,
      grossSubtotal,
      tax,
      netTotal,
    },
  };
}
```

---

## 8) Simple “Auth” Gate

`lib/auth.ts`
```ts
export function isAllowedUser(userId: string | null | undefined) {
  if (!userId) return false;
  const allowed = (process.env.ALLOWED_USER_IDS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return allowed.includes(userId.trim());
}
```

---

## 9) Server Route: Vision Parse (Next.js Route Handler)

`app/api/parse-timecard/route.ts`
```ts
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { isAllowedUser } from "@/lib/auth";

export const runtime = "nodejs"; // keep as node (or "edge" if you adapt for edge)

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const userId = String(form.get("userId") ?? "");
    if (!isAllowedUser(userId)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    // Convert to base64 data URL for OpenAI vision
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mime = file.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${base64}`;

    const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

    // ---- Vision request (Responses API style) ----
    const resp = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "text",
              text:
                "You extract structured numeric data from timecard screenshots. " +
                "Return ONLY valid JSON. No markdown. No commentary."
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text:
                "From this screenshot, extract the numeric values in the 'Total Hours' column " +
                "for each day row. Ignore header rows and summary sections. " +
                "Prefer rows that represent worked days; ignore rows where Total Hours is 0.00 " +
                "IF they appear to be non-worked days. Return ONLY JSON in this exact shape:\n\n" +
                "{\n  \"hours\": [number, ...],\n  \"warnings\": [string, ...]\n}\n\n" +
                "Rules:\n" +
                "- Preserve top-to-bottom order.\n" +
                "- Convert to numbers with 2 decimals when possible.\n" +
                "- If unsure about a value, still include your best guess and add a warning.\n"
            },
            { type: "input_image", image_url: dataUrl },
          ],
        },
      ],
    });

    const text = resp.output_text?.trim() ?? "";
    // Basic safety: ensure JSON parse
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: "Model did not return valid JSON", raw: text },
        { status: 422 }
      );
    }

    const hours = Array.isArray(parsed.hours) ? parsed.hours : [];
    const cleaned = hours
      .map((n: any) => Number(n))
      .filter((n: number) => Number.isFinite(n) && n >= 0);

    return NextResponse.json({
      hours: cleaned,
      warnings: Array.isArray(parsed.warnings) ? parsed.warnings : [],
      // optional: you can compute a crude confidence
      confidence: cleaned.length ? 0.8 : 0.3,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Server error", detail: String(err?.message ?? err) },
      { status: 500 }
    );
  }
}
```

> If you prefer the **Chat Completions** endpoint instead of `responses`, the same idea applies:  
> send `image_url` content + demand strict JSON.

---

## 10) Client UI (single page)

`app/page.tsx` (outline)
```tsx
"use client";

import { useMemo, useState } from "react";
import { calcFromHours, PayMode } from "@/lib/calc";

export default function Page() {
  const [userId, setUserId] = useState("");
  const [payRate, setPayRate] = useState<number>(45.74);
  const [taxPercent, setTaxPercent] = useState<number>(0);
  const [mode, setMode] = useState<PayMode>("triple");
  const [image, setImage] = useState<File | null>(null);

  const [parsedHours, setParsedHours] = useState<number[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const result = useMemo(() => {
    return calcFromHours({
      hours: parsedHours,
      payRate,
      taxPercent,
      mode,
      threshold: 9.5,
    });
  }, [parsedHours, payRate, taxPercent, mode]);

  async function parseImage() {
    if (!image) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("userId", userId);
      fd.append("image", image);

      const res = await fetch("/api/parse-timecard", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) throw new Error(json?.error ?? "Failed");

      setParsedHours(json.hours ?? []);
      setWarnings(json.warnings ?? []);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen p-6 max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">Timecard OT Calculator</h1>

      <section className="space-y-3">
        <label className="block">
          <span className="text-sm">User ID</span>
          <input className="w-full border rounded p-2" value={userId} onChange={(e)=>setUserId(e.target.value)} />
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-sm">Pay rate ($/hr)</span>
            <input className="w-full border rounded p-2" type="number" step="0.01"
              value={payRate} onChange={(e)=>setPayRate(Number(e.target.value))} />
          </label>

          <label className="block">
            <span className="text-sm">Tax %</span>
            <input className="w-full border rounded p-2" type="number" step="0.01"
              value={taxPercent} onChange={(e)=>setTaxPercent(Number(e.target.value))} />
          </label>
        </div>

        <div className="flex items-center gap-3">
          <button
            className={"px-3 py-2 rounded border " + (mode==="triple" ? "font-semibold" : "")}
            onClick={()=>setMode("triple")}
          >
            Triple (1.5×)
          </button>
          <button
            className={"px-3 py-2 rounded border " + (mode==="quad" ? "font-semibold" : "")}
            onClick={()=>setMode("quad")}
          >
            Quad (2.5×)
          </button>
        </div>

        <label className="block">
          <span className="text-sm">Upload timecard screenshot</span>
          <input type="file" accept="image/*" onChange={(e)=>setImage(e.target.files?.[0] ?? null)} />
        </label>

        <button
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
          onClick={parseImage}
          disabled={!userId || !image || loading}
        >
          {loading ? "Reading image…" : "Parse Screenshot"}
        </button>

        {warnings.length > 0 && (
          <div className="border rounded p-3">
            <div className="font-semibold mb-1">Warnings</div>
            <ul className="list-disc pl-5 text-sm">
              {warnings.map((w, i) => <li key={i}>{w}</li>)}
            </ul>
          </div>
        )}
      </section>

      {/* Table + Summary */}
      <section className="border rounded p-4 space-y-4">
        <h2 className="text-lg font-semibold">Math</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Day</th>
                <th className="text-right p-2">Hours</th>
                <th className="text-right p-2">Regular (≤9.5)</th>
                <th className="text-right p-2">OT (over 9.5)</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r, idx) => (
                <tr key={idx} className="border-b">
                  <td className="p-2">#{idx + 1}</td>
                  <td className="p-2 text-right">{r.hours.toFixed(2)}</td>
                  <td className="p-2 text-right">{r.regularHours.toFixed(2)}</td>
                  <td className="p-2 text-right">{r.overtimeHours.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="flex justify-between"><span>Regular pay</span><span>${result.totals.regularPay.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>OT pay</span><span>${result.totals.overtimePay.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Gross subtotal</span><span>${result.totals.grossSubtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Tax</span><span>${result.totals.tax.toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold"><span>Net total</span><span>${result.totals.netTotal.toFixed(2)}</span></div>
        </div>
      </section>
    </main>
  );
}
```

---

## 11) PWA Setup (minimal)

### `public/manifest.webmanifest`
```json
{
  "name": "Timecard OT Calculator",
  "short_name": "OT Calc",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#000000",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

### Next.js PWA approach
Use `next-pwa` or a small service worker setup. For speed, use `next-pwa`.

`next.config.mjs`
```js
import withPWA from "next-pwa";

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
})(/** @type {import('next').NextConfig} */ ({
  reactStrictMode: true,
}));
```

---

## 12) Quality & Safety Improvements (worth doing)
- **Manual correction** UI: edit any parsed hour value before calculating.
- **Image preview** + “rotate/crop” (often helps OCR).
- **Parsing guardrails**:
  - Reject if hours > 24 (unless you want to allow it)
  - Warn if fewer than 3 rows extracted
- **Audit panel**:
  - Show the raw JSON returned by the model (collapsed)
- **Caching**:
  - Store user’s pay rate/tax/mode in `localStorage`

---

## 13) Build Steps (Cursor-ready)

### Init
```bash
npx create-next-app@latest timecard-pwa --ts --tailwind --eslint --app
cd timecard-pwa
npm i openai next-pwa
```

### Add env
Create `.env.local` with your keys and allowed IDs.

### Implement files
- `lib/calc.ts`
- `lib/auth.ts`
- `app/api/parse-timecard/route.ts`
- `app/page.tsx`
- PWA manifest + icons

---

## 14) Cursor Prompts (so you can generate code fast)

### Prompt 1 (scaffold)
“Create the files exactly as described in this spec. Ensure the API route uses OpenAI vision and returns strict JSON. Add Tailwind UI.”

### Prompt 2 (robust parsing)
“Add JSON repair: if the model returns non-JSON, attempt to extract the first JSON object and parse it. Add warnings.”

### Prompt 3 (editable table)
“Make each hour cell editable; recalc on change; add ‘Reset to parsed’ button.”

---

## 15) Notes on Models
Use any vision-capable OpenAI model you prefer. Keep it configurable via:
- `OPENAI_VISION_MODEL`

If you ever switch models, the system still works because the output contract is enforced.

---

If you want, I can generate a **complete working repo skeleton** (all files filled in) you can paste straight into Cursor, including icons + manifest + next-pwa wiring.
