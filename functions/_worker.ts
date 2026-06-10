// functions/_worker.ts
// Cloudflare Pages Worker — handles cron triggers for scheduled email reports
export default {
  async fetch(request: Request, env: any) {
    // Pass through all regular requests to the Next.js app
    return env.ASSETS.fetch(request);
  },

  async scheduled(event: { cron: string }, env: any, ctx: { waitUntil(p: Promise<any>): void }) {
    const cronExpr = event.cron;
    const CRON_SECRET = env.CRON_SECRET || "";
    const BASE = "https://dragline3d.com";
    const headers = { "Content-Type": "application/json", "x-cron-secret": CRON_SECRET };

    // Every cron run: poll Shippo for delivered packages
    ctx.waitUntil(
      fetch(`${BASE}/api/admin/shippo/poll`, { method: "POST", headers })
    );

    // Monday 10am UTC → weekly report
    // 1st of month 10am UTC → monthly report
    if (cronExpr === "0 10 * * 1" || cronExpr === "0 10 1 * *") {
      const type = cronExpr === "0 10 1 * *" ? "monthly" : "weekly";
      ctx.waitUntil(
        fetch(`${BASE}/api/admin/reports`, {
          method: "POST",
          headers,
          body: JSON.stringify({ type }),
        })
      );
    }
  },
};
