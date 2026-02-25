import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { generateDailyReport } from "./moonshot";
import { registerAuthRoutes, authMiddleware, type AuthRequest } from "./auth";
import { db } from "./db";
import { reports } from "../shared/schema";
import { eq, desc } from "drizzle-orm";
import { initScheduler, getUserSchedule, updateUserSchedule } from "./scheduler";

export async function registerRoutes(app: Express): Promise<Server> {
  registerAuthRoutes(app);

  app.post("/api/report/generate", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const context = req.body?.context || "";
      const images = req.body?.images || [];
      const report = await generateDailyReport(context, images);
      const dateKey = new Date().toISOString().split("T")[0];

      await db.insert(reports).values({
        userId,
        reportDate: dateKey,
        context: context || undefined,
        reportData: report,
      });

      res.json({ success: true, report });
    } catch (error: any) {
      console.error("Report generation error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate report",
      });
    }
  });

  app.get("/api/report/today", authMiddleware, async (req: AuthRequest, res: Response) => {
    const userId = req.user!.userId;
    const dateKey = new Date().toISOString().split("T")[0];

    const [todayReport] = await db
      .select()
      .from(reports)
      .where(eq(reports.userId, userId))
      .orderBy(desc(reports.generatedAt))
      .limit(1);

    if (todayReport && todayReport.reportDate === dateKey) {
      res.json({ success: true, report: todayReport.reportData, cached: true });
    } else {
      res.json({ success: true, report: null });
    }
  });

  app.get("/api/reports/history", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const userId = req.user!.userId;
      const userReports = await db
        .select()
        .from(reports)
        .where(eq(reports.userId, userId))
        .orderBy(desc(reports.generatedAt))
        .limit(30);

      const formatted = userReports.map((r) => ({
        ...(r.reportData as any),
        reportDate: r.reportDate,
        generatedAt: r.generatedAt?.toISOString(),
        context: r.context,
      }));

      res.json({ success: true, reports: formatted });
    } catch (error: any) {
      console.error("History fetch error:", error);
      res.status(500).json({ success: false, error: "Failed to load history" });
    }
  });

  app.get("/api/schedule", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const schedule = await getUserSchedule(req.user!.userId);
      res.json({ success: true, schedule });
    } catch (error: any) {
      console.error("Schedule fetch error:", error);
      res.status(500).json({ success: false, error: "Failed to load schedule" });
    }
  });

  app.put("/api/schedule", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const { enabled, hour, minute, context } = req.body;
      const schedule = await updateUserSchedule(req.user!.userId, {
        enabled,
        hour,
        minute,
        context,
      });
      res.json({ success: true, schedule });
    } catch (error: any) {
      console.error("Schedule update error:", error);
      res.status(500).json({ success: false, error: "Failed to update schedule" });
    }
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  initScheduler().catch((err) => console.error("Scheduler init failed:", err));

  const httpServer = createServer(app);
  return httpServer;
}
