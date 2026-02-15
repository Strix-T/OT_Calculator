export type RequestLogEvent =
  | "parse_timecard_attempt"
  | "parse_timecard_unauthorized"
  | "parse_timecard_success"
  | "parse_timecard_error";

type RequestLogRecord = {
  ts: string;
  event: RequestLogEvent;
  requestId: string;
  path?: string;
  method?: string;
  userId?: string;
  allowed?: boolean;
  ip?: string;
  userAgent?: string;
  detail?: string;
  extra?: Record<string, unknown>;
};

function firstIpFromForwardedFor(value: string | null): string | undefined {
  if (!value) return undefined;
  // x-forwarded-for: client, proxy1, proxy2
  const first = value.split(",")[0]?.trim();
  return first || undefined;
}

export function getClientIp(req: Request): string | undefined {
  return (
    firstIpFromForwardedFor(req.headers.get("x-forwarded-for")) ||
    req.headers.get("x-real-ip") ||
    undefined
  );
}

async function appendToFileIfConfigured(line: string) {
  const filePath = process.env.REQUEST_LOG_FILE;
  if (!filePath) return;

  // Avoid importing fs in edge runtimes; this route uses nodejs runtime, so it's safe.
  const { appendFile } = await import("node:fs/promises");
  await appendFile(filePath, line + "\n", { encoding: "utf8" });
}

export async function logRequest(record: RequestLogRecord) {
  const line = JSON.stringify(record);
  console.info(line);
  try {
    await appendToFileIfConfigured(line);
  } catch (err) {
    // Don't fail the request due to logging issues.
    console.warn(
      JSON.stringify({
        ts: new Date().toISOString(),
        event: "request_log_write_failed",
        requestId: record.requestId,
        detail: err instanceof Error ? err.message : String(err),
      })
    );
  }
}

