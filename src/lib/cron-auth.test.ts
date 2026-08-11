import { describe, expect, it } from "vitest";
import { isCronAuthorized } from "./cron-auth";

describe("cron authorization", () => {
  it("fails closed when the secret is missing", () => {
    expect(isCronAuthorized(new Request("https://fulltime.fm"), undefined)).toBe(false);
  });

  it("accepts only the exact bearer value", () => {
    const secret = "correct-secret";
    expect(
      isCronAuthorized(
        new Request("https://fulltime.fm", { headers: { Authorization: `Bearer ${secret}` } }),
        secret,
      ),
    ).toBe(true);
    expect(
      isCronAuthorized(new Request("https://fulltime.fm", { headers: { apikey: secret } }), secret),
    ).toBe(false);
    expect(
      isCronAuthorized(
        new Request("https://fulltime.fm", { headers: { Authorization: "Bearer wrong" } }),
        secret,
      ),
    ).toBe(false);
  });
});
