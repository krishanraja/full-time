import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  crons: [
    {
      path: "/api/public/cron/ingest",
      schedule: "15 0 * * *",
    },
    {
      path: "/api/internal/daily-rehearsal",
      schedule: "45 4 * * *",
    },
    {
      path: "/api/internal/predictions-register",
      schedule: "30 6,16 * * *",
    },
  ],
};
