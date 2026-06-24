// @ts-ignore `.open-next/worker.js` is generated at build time
import { default as handler } from "./.open-next/worker.js";

const BASE = "https://dragline3d.com";

export default {
  fetch: handler.fetch,

  async scheduled(event: { cron: string }, env: CloudflareEnv, ctx: ExecutionContext) {
    const CRON_SECRET = (env as any).CRON_SECRET || "";
    const headers = { "Content-Type": "application/json", "x-cron-secret": CRON_SECRET };

    // Every cron run: poll Shippo for delivered packages
    ctx.waitUntil(
      fetch(`${BASE}/api/admin/shippo/poll`, { method: "POST", headers })
    );

    // Monday 10am UTC → weekly report
    // 1st of month 10am UTC → monthly report
    if (event.cron === "0 10 * * 1" || event.cron === "0 10 1 * *") {
      const type = event.cron === "0 10 1 * *" ? "monthly" : "weekly";
      ctx.waitUntil(
        fetch(`${BASE}/api/admin/reports`, {
          method: "POST",
          headers,
          body: JSON.stringify({ type }),
        })
      );
    }
  },
} satisfies ExportedHandler<CloudflareEnv>;
