import { createHash, timingSafeEqual } from "node:crypto";

function digest(value: string) {
  return createHash("sha256").update(value, "utf8").digest();
}

export function isCronAuthorized(request: Request, secret = process.env.CRON_SECRET): boolean {
  if (!secret?.trim()) return false;
  const provided = request.headers.get("authorization") ?? "";
  return timingSafeEqual(digest(provided), digest(`Bearer ${secret}`));
}
