import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { generateDailyReport } from "./moonshot";

const reportCache: Map<string, { report: any; timestamp: number }> = new Map();
const CACHE_TTL = 30 * 60 * 1000;

export async function registerRoutes(app: Express): Promise<Server> {
  app.post("/api/report/generate", async (req: Request, res: Response) => {
    try {
      const context = req.body?.context || "";
      const report = await generateDailyReport(context);
      const dateKey = new Date().toISOString().split("T")[0];
      reportCache.set(dateKey, { report, timestamp: Date.now() });
      res.json({ success: true, report });
    } catch (error: any) {
      console.error("Report generation error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate report",
      });
    }
  });

  app.get("/api/report/today", async (_req: Request, res: Response) => {
    const dateKey = new Date().toISOString().split("T")[0];
    const cached = reportCache.get(dateKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      res.json({ success: true, report: cached.report, cached: true });
    } else {
      res.json({ success: true, report: null });
    }
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  const httpServer = createServer(app);
  return httpServer;
}
