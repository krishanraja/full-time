export function trustedAppOrigin(value: string | undefined): string {
  const configured = value?.trim() || "https://fulltime.fm";
  const origin = new URL(configured);
  const isLocal = origin.hostname === "localhost" || origin.hostname === "127.0.0.1";
  if (origin.protocol !== "https:" && !(isLocal && origin.protocol === "http:")) {
    throw new Error("APP_URL must use HTTPS outside local development.");
  }
  return origin.origin;
}

export function checkoutSessionBelongsToUser(
  clientReferenceId: string | null,
  userId: string,
): boolean {
  return clientReferenceId === userId;
}
