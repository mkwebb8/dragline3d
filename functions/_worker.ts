// functions/_worker.ts
// Cloudflare Pages Worker — handles cron triggers for scheduled email reports
export default {
  async fetch(request: Request, env: any) {
    // Pass through all regular requests to the Next.js app
    return env.ASSETS.fetch(request);
  },

  async scheduled(event: ScheduledEvent, env: any, ctx: ExecutionContext) {
    const cronExpr = event.cron;
    const CRON_SECRET = env.CRON_SECRET || "";
    const REPORT_URL = "https://dragline3d.com/api/admin/reports";

    let type = "weekly";
    // "0 10 1 * *" = monthly (day-of-month = 1)
    if (cronExpr === "0 10 1 * *") type = "monthly";

    ctx.waitUntil(
      fetch(REPORT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-cron-secret": CRON_SECRET,
        },
        body: JSON.stringify({ type }),
      })
    );
  },
} satisfies ExportedHandler;
