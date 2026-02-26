import type { Express, Request, Response } from "express";
import { createServer, type Server } from "node:http";
import { generateDailyReport } from "./moonshot";
import { registerAuthRoutes, authMiddleware, type AuthRequest } from "./auth";
import { db } from "./db";
import { reports, users } from "../shared/schema";
import { eq, desc } from "drizzle-orm";
import { initScheduler, getUserSchedule, updateUserSchedule } from "./scheduler";
import {
  postTweet,
  postThread,
  getOAuthRequestToken,
  handleOAuthCallback,
  verifyUserCredentials,
  type TwitterCredentials,
} from "./twitter";

async function getUserTwitterCreds(userId: number): Promise<TwitterCredentials | null> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user?.twitterAccessToken || !user?.twitterAccessSecret) return null;
  return { accessToken: user.twitterAccessToken, accessSecret: user.twitterAccessSecret };
}

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

  app.get("/api/twitter/callback", async (req: Request, res: Response) => {
    try {
      const oauthToken = req.query.oauth_token as string;
      const oauthVerifier = req.query.oauth_verifier as string;

      if (!oauthToken || !oauthVerifier) {
        return res.status(400).send("Missing OAuth parameters");
      }

      const { accessToken, accessSecret, username } = await handleOAuthCallback(oauthToken, oauthVerifier);

      const token = req.query.state as string;
      if (!token) {
        return res.status(400).send("Missing user session");
      }

      const jwt = await import("jsonwebtoken");
      const decoded = jwt.default.verify(token, process.env.SESSION_SECRET!) as { userId: number };

      await db
        .update(users)
        .set({
          twitterAccessToken: accessToken,
          twitterAccessSecret: accessSecret,
          twitterUsername: username,
        })
        .where(eq(users.id, decoded.userId));

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { background: #080808; color: #F5F0E8; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
              .card { text-align: center; padding: 40px; }
              .check { font-size: 48px; margin-bottom: 16px; }
              h1 { color: #C9A84C; font-size: 24px; margin: 0 0 8px; }
              p { color: #999; font-size: 16px; margin: 0; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="check">&#10003;</div>
              <h1>Connected @${username}</h1>
              <p>You can close this window and return to the app.</p>
            </div>
          </body>
        </html>
      `);
    } catch (error: any) {
      console.error("Twitter callback error:", error);
      res.status(500).send("Failed to connect X account. Please try again.");
    }
  });

  app.get("/api/twitter/connect", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const protocol = req.headers["x-forwarded-proto"] || "https";
      const host = req.headers["x-forwarded-host"] || req.headers.host;
      const jwt = await import("jsonwebtoken");
      const stateToken = jwt.default.sign({ userId: req.user!.userId }, process.env.SESSION_SECRET!, { expiresIn: "10m" });
      const callbackUrl = `${protocol}://${host}/api/twitter/callback?state=${encodeURIComponent(stateToken)}`;
      const { url } = await getOAuthRequestToken(callbackUrl);
      res.json({ success: true, url });
    } catch (error: any) {
      console.error("Twitter connect error:", error);
      res.status(500).json({ success: false, error: "Failed to start X connection" });
    }
  });

  app.get("/api/twitter/status", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, req.user!.userId));
      if (user?.twitterUsername) {
        res.json({ success: true, connected: true, username: user.twitterUsername });
      } else {
        res.json({ success: true, connected: false });
      }
    } catch (error: any) {
      console.error("Twitter status error:", error);
      res.status(500).json({ success: false, error: "Failed to check X status" });
    }
  });

  app.delete("/api/twitter/disconnect", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      await db
        .update(users)
        .set({
          twitterAccessToken: null,
          twitterAccessSecret: null,
          twitterUsername: null,
        })
        .where(eq(users.id, req.user!.userId));
      res.json({ success: true });
    } catch (error: any) {
      console.error("Twitter disconnect error:", error);
      res.status(500).json({ success: false, error: "Failed to disconnect X account" });
    }
  });

  app.post("/api/tweet/post", authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
      const creds = await getUserTwitterCreds(req.user!.userId);
      if (!creds) {
        return res.status(400).json({ success: false, error: "Connect your X account first to post tweets." });
      }

      const { content, threadTweets, type } = req.body;

      if (!content || typeof content !== "string") {
        return res.status(400).json({ success: false, error: "Tweet content is required" });
      }

      if (type === "thread" && threadTweets && Array.isArray(threadTweets) && threadTweets.length > 0) {
        const allTweets = [content, ...threadTweets];
        const result = await postThread(allTweets, creds);
        return res.json({
          success: true,
          tweetId: result.ids[0],
          threadIds: result.ids,
          url: `https://x.com/i/status/${result.ids[0]}`,
        });
      }

      const result = await postTweet(content, creds);
      res.json({
        success: true,
        tweetId: result.id,
        url: `https://x.com/i/status/${result.id}`,
      });
    } catch (error: any) {
      console.error("Tweet post error:", error);
      const message = error?.data?.detail || error?.message || "Failed to post tweet";
      res.status(500).json({ success: false, error: message });
    }
  });

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  initScheduler().catch((err) => console.error("Scheduler init failed:", err));

  const httpServer = createServer(app);
  return httpServer;
}
