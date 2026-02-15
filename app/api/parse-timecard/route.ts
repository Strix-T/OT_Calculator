import { NextResponse } from "next/server";
import OpenAI from "openai";
import { isAllowedUser } from "@/lib/auth";
import { getClientIp, logRequest } from "@/lib/request-log";

export const runtime = "nodejs";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function extractFirstJsonObject(text: string) {
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }
  return text.slice(firstBrace, lastBrace + 1);
}

export async function POST(req: Request) {
  const requestId = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  try {
    const form = await req.formData();
    const userId = String(form.get("userId") ?? "").trim();

    const allowed = isAllowedUser(userId);
    const ip = getClientIp(req);
    const userAgent = req.headers.get("user-agent") ?? undefined;

    await logRequest({
      ts: new Date().toISOString(),
      event: "parse_timecard_attempt",
      requestId,
      path: "/api/parse-timecard",
      method: "POST",
      userId,
      allowed,
      ip,
      userAgent,
    });

    if (!allowed) {
      await logRequest({
        ts: new Date().toISOString(),
        event: "parse_timecard_unauthorized",
        requestId,
        path: "/api/parse-timecard",
        method: "POST",
        userId,
        allowed: false,
        ip,
        userAgent,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const file = form.get("image");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing image" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Server misconfigured: missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mime = file.type || "image/jpeg";
    const dataUrl = `data:${mime};base64,${base64}`;

    const model = process.env.OPENAI_VISION_MODEL || "gpt-4o-mini";

    const resp = await openai.responses.create({
      model,
      input: [
        {
          role: "system",
          content: [
            {
              type: "input_text",
              text:
                "You extract structured numeric data from timecard screenshots. " +
                "Return ONLY valid JSON. No markdown. No commentary.",
            },
          ],
        },
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "From this screenshot, extract the numeric values in the 'Total Hours' column " +
                "for each day row. Ignore header rows and summary sections. " +
                "Prefer rows that represent worked days; ignore rows where Total Hours is 0.00 " +
                "IF they appear to be non-worked days. Return ONLY JSON in this exact shape:\n\n" +
                '{\n  "hours": [number, ...],\n  "warnings": [string, ...]\n}\n\n' +
                "Rules:\n" +
                "- Preserve top-to-bottom order.\n" +
                "- Convert to numbers with 2 decimals when possible.\n" +
                "- If unsure about a value, still include your best guess and add a warning.\n",
            },
            { type: "input_image", image_url: dataUrl, detail: "high" },
          ],
        },
      ],
    });

    const responseOutput = (resp as { output?: { content?: { type?: string; text?: string }[] }[] }).output ?? [];
    const outputTextField = (resp as { output_text?: string }).output_text ?? "";
    const fallbackText =
      responseOutput[0]?.content?.find((c) => c.type === "output_text")?.text ??
      responseOutput[0]?.content?.find((c) => c.type === "text")?.text ??
      "";
    const text = (outputTextField || fallbackText || "").toString().trim();

    let parsed: unknown;
    let parseError: string | null = null;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      const extracted = extractFirstJsonObject(text);
      if (extracted) {
        try {
          parsed = JSON.parse(extracted);
        } catch (err2) {
          parseError = String(err2);
        }
      } else {
        parseError = String(err);
      }
    }

    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json(
        { error: "Model did not return valid JSON", raw: text, detail: parseError },
        { status: 422 }
      );
    }

    const parsedObj = parsed as Record<string, unknown>;

    const warnings: string[] = Array.isArray(parsedObj.warnings)
      ? parsedObj.warnings.filter((w): w is string => typeof w === "string")
      : [];

    const hoursRaw = Array.isArray(parsedObj.hours) ? parsedObj.hours : [];
    const cleaned: number[] = [];

    hoursRaw.forEach((value, idx) => {
      const num =
        typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
      if (!Number.isFinite(num) || num < 0) {
        warnings.push(`Row ${idx + 1}: skipped non-numeric hour "${value}"`);
        return;
      }
      if (num > 24) {
        warnings.push(`Row ${idx + 1}: capped hour ${num.toFixed(2)} to 24`);
        cleaned.push(24);
        return;
      }
      cleaned.push(Number(num.toFixed(2)));
    });

    const confidence = cleaned.length ? Math.min(0.9, 0.6 + cleaned.length * 0.05) : 0.2;

    await logRequest({
      ts: new Date().toISOString(),
      event: "parse_timecard_success",
      requestId,
      path: "/api/parse-timecard",
      method: "POST",
      userId,
      allowed: true,
      ip,
      userAgent,
      extra: {
        extractedRows: cleaned.length,
        warnings: warnings.length,
        confidence,
      },
    });

    return NextResponse.json({
      hours: cleaned,
      rawText: typeof parsedObj.rawText === "string" ? parsedObj.rawText : undefined,
      warnings,
      confidence,
    });
  } catch (err: unknown) {
    await logRequest({
      ts: new Date().toISOString(),
      event: "parse_timecard_error",
      requestId,
      path: "/api/parse-timecard",
      method: "POST",
      detail: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Server error", detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
