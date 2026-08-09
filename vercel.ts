import { defineConfig } from "@vercel/config";

export default defineConfig({
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
});
