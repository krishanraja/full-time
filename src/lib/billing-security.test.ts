import { describe, expect, it } from "vitest";
import { checkoutSessionBelongsToUser, trustedAppOrigin } from "./billing-security";

describe("billing security", () => {
  it("uses only a configured trusted origin", () => {
    expect(trustedAppOrigin("https://fulltime.fm/path")).toBe("https://fulltime.fm");
    expect(trustedAppOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(() => trustedAppOrigin("http://fulltime.fm")).toThrow(/HTTPS/);
  });

  it("rejects checkout sessions with a missing or different owner", () => {
    expect(checkoutSessionBelongsToUser("user-1", "user-1")).toBe(true);
    expect(checkoutSessionBelongsToUser(null, "user-1")).toBe(false);
    expect(checkoutSessionBelongsToUser("user-2", "user-1")).toBe(false);
  });
});
