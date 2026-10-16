// The product inbox (Ruling, Krish, 2026-10-16: krish@fulltime.fm is the
// inbox for Full Time). Settings opens it for beta feedback and the privacy
// page names it for deletion requests, so both read the address from here.
//
// The three questions are the ones docs/22-vision-and-beta.md asks every
// tester. The third is the Sean Ellis test the December release bar reads,
// so change the wording there and here together.

export const FEEDBACK_EMAIL = "krish@fulltime.fm";

export const FEEDBACK_SUBJECT = "Full Time beta feedback";

export const FEEDBACK_QUESTIONS = [
  "Which AI Pundit did you pick, and would you pick them again tomorrow?",
  "Did anything sound wrong: a score, a name, a fact?",
  "How would you feel if Full Time went away tomorrow: very disappointed, somewhat disappointed, or not bothered?",
] as const;

const body = FEEDBACK_QUESTIONS.map((question, index) => `${index + 1}. ${question}\n\n`).join("");

// encodeURIComponent, not URLSearchParams: mail clients read "+" as a literal
// plus sign, so a form-encoded subject arrives as "Full+Time+beta+feedback".
export const FEEDBACK_MAILTO = `mailto:${FEEDBACK_EMAIL}?subject=${encodeURIComponent(
  FEEDBACK_SUBJECT,
)}&body=${encodeURIComponent(body)}`;
