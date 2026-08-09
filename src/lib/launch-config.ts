export const PRELAUNCH_MODE = import.meta.env.VITE_PRELAUNCH_MODE !== "false";

// Checkout is deliberately fail-closed. It takes two explicit flags to make a
// paid path visible, and pre-launch mode always wins.
export const BILLING_ENABLED = !PRELAUNCH_MODE && import.meta.env.VITE_BILLING_ENABLED === "true";
