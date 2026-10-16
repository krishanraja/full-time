import { describe, expect, it } from "vitest";
import { FEEDBACK_EMAIL, FEEDBACK_MAILTO, FEEDBACK_QUESTIONS, FEEDBACK_SUBJECT } from "./feedback";

describe("FEEDBACK_MAILTO", () => {
  const url = new URL(FEEDBACK_MAILTO);

  it("opens the product inbox", () => {
    expect(url.protocol).toBe("mailto:");
    expect(url.pathname).toBe(FEEDBACK_EMAIL);
    expect(FEEDBACK_EMAIL).toBe("krish@fulltime.fm");
  });

  it("encodes spaces as %20, which mail clients read, not +, which they print", () => {
    expect(FEEDBACK_MAILTO).toContain("subject=Full%20Time%20beta%20feedback");
    expect(FEEDBACK_MAILTO).not.toContain("+");
    expect(decodeURIComponent(url.searchParams.get("subject") ?? "")).toBe(FEEDBACK_SUBJECT);
  });

  it("carries all three tester questions, numbered, in the body", () => {
    const body = decodeURIComponent(FEEDBACK_MAILTO.split("&body=")[1] ?? "");
    expect(FEEDBACK_QUESTIONS).toHaveLength(3);
    FEEDBACK_QUESTIONS.forEach((question, index) => {
      expect(body).toContain(`${index + 1}. ${question}`);
    });
  });
});
