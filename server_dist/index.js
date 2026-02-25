"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc2) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc2 = __getOwnPropDesc(from, key)) || desc2.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server/index.ts
var import_express = __toESM(require("express"));

// server/routes.ts
var import_node_http = require("node:http");

// server/moonshot.ts
var MOONSHOT_BASE_URL = "https://api.moonshot.ai/v1";
var MODEL_ID = "kimi-k2.5";
var JSON_FORMAT_INSTRUCTION = `You MUST respond with valid JSON only (no markdown, no code fences, no extra text before or after the JSON). The JSON structure:

{
  "reportDate": "YYYY-MM-DD",
  "trends": [
    {"topic": "string", "momentum": "rising|peaking|declining", "relevance": "high|medium|low", "description": "short description"}
  ],
  "tweetIdeas": [
    {"type": "hook|thread|tip|poll|storytelling", "content": "the actual tweet text (for single tweets)", "threadTweets": ["tweet 1 text", "tweet 2 text", "tweet 3 text"], "estimatedEngagement": "high|medium", "notes": "why this works"}
  ],
  "postingTimes": [
    {"time": "HH:MM AM/PM", "timezone": "EST", "reason": "why this time is optimal"}
  ],
  "growthTip": {
    "title": "short title",
    "description": "detailed actionable growth strategy",
    "expectedImpact": "what results to expect"
  },
  "contentAnalysis": {
    "topPerformingType": "string",
    "recommendation": "string"
  }
}

Requirements:
- 4-5 trending topics with momentum indicators relevant to the user's niche
- 3-5 tweet/thread ideas that are viral-worthy, specific, and ready to post
- For "thread" type ideas, populate "threadTweets" with 4-6 tweets (each under 280 chars). "content" = thread opener. For non-thread types, "threadTweets" = empty array
- 3 optimal posting times with reasoning
- 1 detailed growth tip
- Content type analysis`;
function extractUrls(text2) {
  const urlRegex = /https?:\/\/[^\s,'")\]]+/gi;
  const matches = text2.match(urlRegex) || [];
  return [...new Set(matches)];
}
async function callAgentAPI(apiKey, messages) {
  const body = {
    model: MODEL_ID,
    messages,
    temperature: 1,
    max_tokens: 4e3,
    tools: [
      {
        type: "builtin_function",
        function: {
          name: "$web_search"
        }
      }
    ]
  };
  const response = await fetch(`${MOONSHOT_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error("[X Marketer] API error:", response.status, errorText);
    throw new Error(`API error: ${response.status} - ${errorText}`);
  }
  return response.json();
}
async function runAgentLoop(apiKey, messages) {
  let iterations = 0;
  const maxIterations = 15;
  while (iterations < maxIterations) {
    iterations++;
    console.log(`[X Marketer] Agent call #${iterations}, messages: ${messages.length}`);
    const data = await callAgentAPI(apiKey, messages);
    const choice = data.choices?.[0];
    if (!choice) {
      throw new Error("No response from agent");
    }
    const finishReason = choice.finish_reason;
    if (finishReason === "tool_calls" && choice.message?.tool_calls) {
      console.log(`[X Marketer] Web search triggered (${choice.message.tool_calls.length} calls)`);
      messages.push(choice.message);
      for (const toolCall of choice.message.tool_calls) {
        const toolCallName = toolCall.function.name;
        const toolCallArguments = JSON.parse(toolCall.function.arguments);
        console.log(`[X Marketer] Searching: ${JSON.stringify(toolCallArguments).slice(0, 300)}`);
        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          name: toolCallName,
          content: JSON.stringify(toolCallArguments)
        });
      }
    } else {
      const content = choice.message?.content;
      if (!content) {
        throw new Error("No content in agent response");
      }
      console.log(`[X Marketer] Completed after ${iterations} agent calls`);
      return content;
    }
  }
  throw new Error("Too many tool call iterations");
}
async function generateDailyReport(context, images) {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error("MOONSHOT_API_KEY is not configured");
  }
  const today = (/* @__PURE__ */ new Date()).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });
  const hasContext = !!(context && context.trim());
  const urls = hasContext ? extractUrls(context) : [];
  console.log(`[X Marketer] Generating report via ${MODEL_ID}. Context: ${hasContext}, URLs: ${urls.length}`);
  const messages = [];
  let prompt;
  if (hasContext) {
    prompt = `${context.trim()}

Generate a complete daily X/Twitter marketing report for ${today}. Research the links and context I provided above, then deliver the report.

${JSON_FORMAT_INSTRUCTION}`;
  } else {
    prompt = `Generate today's daily X/Twitter marketing report for ${today}. Research the latest trends, draft viral tweet ideas, suggest optimal posting times, and provide a growth tip.

${JSON_FORMAT_INSTRUCTION}`;
  }
  if (images && images.length > 0) {
    const userContent = [
      { type: "text", text: prompt + `

I've attached ${images.length} image(s) for additional context. Analyze them alongside your research.` },
      ...images.map((img) => ({
        type: "image_url",
        image_url: { url: `data:${img.mimeType};base64,${img.base64}` }
      }))
    ];
    messages.push({ role: "user", content: userContent });
  } else {
    messages.push({ role: "user", content: prompt });
  }
  const rawContent = await runAgentLoop(apiKey, messages);
  let cleaned = rawContent.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.slice(7);
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.slice(3);
  }
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();
  const jsonStart = cleaned.indexOf("{");
  const jsonEnd = cleaned.lastIndexOf("}");
  if (jsonStart > 0 && jsonEnd > jsonStart) {
    cleaned = cleaned.slice(jsonStart, jsonEnd + 1);
  }
  try {
    const report = JSON.parse(cleaned);
    report.generatedAt = (/* @__PURE__ */ new Date()).toISOString();
    report.reportDate = report.reportDate || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    return report;
  } catch (parseError) {
    console.error("[X Marketer] Failed to parse response:", cleaned.slice(0, 500));
    throw new Error("Failed to parse AI response as JSON");
  }
}

// server/auth.ts
var import_bcryptjs = __toESM(require("bcryptjs"));
var import_jsonwebtoken = __toESM(require("jsonwebtoken"));

// server/db.ts
var import_serverless = require("@neondatabase/serverless");
var import_neon_serverless = require("drizzle-orm/neon-serverless");
var import_ws = __toESM(require("ws"));

// shared/schema.ts
var schema_exports = {};
__export(schema_exports, {
  reports: () => reports,
  schedules: () => schedules,
  users: () => users
});
var import_pg_core = require("drizzle-orm/pg-core");
var users = (0, import_pg_core.pgTable)("users", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  email: (0, import_pg_core.text)("email").notNull().unique(),
  password: (0, import_pg_core.text)("password").notNull(),
  displayName: (0, import_pg_core.text)("display_name").notNull(),
  defaultContext: (0, import_pg_core.text)("default_context"),
  createdAt: (0, import_pg_core.timestamp)("created_at").defaultNow().notNull()
});
var reports = (0, import_pg_core.pgTable)("reports", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").notNull().references(() => users.id),
  reportDate: (0, import_pg_core.text)("report_date").notNull(),
  context: (0, import_pg_core.text)("context"),
  reportData: (0, import_pg_core.jsonb)("report_data").notNull(),
  generatedAt: (0, import_pg_core.timestamp)("generated_at").defaultNow().notNull()
});
var schedules = (0, import_pg_core.pgTable)("schedules", {
  id: (0, import_pg_core.serial)("id").primaryKey(),
  userId: (0, import_pg_core.integer)("user_id").notNull().references(() => users.id).unique(),
  enabled: (0, import_pg_core.boolean)("enabled").default(false).notNull(),
  hour: (0, import_pg_core.integer)("hour").default(9).notNull(),
  minute: (0, import_pg_core.integer)("minute").default(0).notNull(),
  timezone: (0, import_pg_core.text)("timezone").default("America/New_York").notNull(),
  context: (0, import_pg_core.text)("context")
});

// server/db.ts
var import_serverless2 = require("@neondatabase/serverless");
import_serverless2.neonConfig.webSocketConstructor = import_ws.default;
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}
var pool = new import_serverless.Pool({ connectionString: process.env.DATABASE_URL });
var db = (0, import_neon_serverless.drizzle)(pool, { schema: schema_exports });

// server/auth.ts
var import_drizzle_orm = require("drizzle-orm");
var JWT_SECRET = process.env.SESSION_SECRET || "xmarketer-fallback-secret";
var TOKEN_EXPIRY = "30d";
function generateToken(payload) {
  return import_jsonwebtoken.default.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}
function verifyToken(token) {
  try {
    return import_jsonwebtoken.default.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authentication required" });
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
  req.user = payload;
  next();
}
function registerAuthRoutes(app2) {
  app2.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, displayName } = req.body;
      if (!email || !password || !displayName) {
        return res.status(400).json({ error: "Email, password, and display name are required" });
      }
      if (password.length < 6) {
        return res.status(400).json({ error: "Password must be at least 6 characters" });
      }
      const existing = await db.select().from(users).where((0, import_drizzle_orm.eq)(users.email, email.toLowerCase()));
      if (existing.length > 0) {
        return res.status(409).json({ error: "Email already registered" });
      }
      const hashedPassword = await import_bcryptjs.default.hash(password, 12);
      const [user] = await db.insert(users).values({
        email: email.toLowerCase(),
        password: hashedPassword,
        displayName
      }).returning();
      const token = generateToken({ userId: user.id, email: user.email });
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName
        }
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });
  app2.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
      }
      const [user] = await db.select().from(users).where((0, import_drizzle_orm.eq)(users.email, email.toLowerCase()));
      if (!user) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const valid = await import_bcryptjs.default.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }
      const token = generateToken({ userId: user.id, email: user.email });
      res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName
        }
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });
  app2.get("/api/auth/me", async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (!payload) {
      return res.status(401).json({ error: "Invalid token" });
    }
    const [user] = await db.select().from(users).where((0, import_drizzle_orm.eq)(users.id, payload.userId));
    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }
    res.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        defaultContext: user.defaultContext
      }
    });
  });
}

// server/routes.ts
var import_drizzle_orm3 = require("drizzle-orm");

// server/scheduler.ts
var import_node_cron = __toESM(require("node-cron"));
var import_drizzle_orm2 = require("drizzle-orm");
var activeCrons = /* @__PURE__ */ new Map();
function getCronExpression(minute, hour) {
  return `${minute} ${hour} * * *`;
}
async function runScheduledReport(userId, context) {
  try {
    console.log(`[Scheduler] Running report for user ${userId}`);
    const report = await generateDailyReport(context || void 0);
    const dateKey = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    await db.insert(reports).values({
      userId,
      reportDate: dateKey,
      context: context || void 0,
      reportData: report
    });
    console.log(`[Scheduler] Report saved for user ${userId}, date ${dateKey}`);
  } catch (error) {
    console.error(`[Scheduler] Failed to generate report for user ${userId}:`, error);
  }
}
function scheduleUserCron(schedule) {
  const existing = activeCrons.get(schedule.userId);
  if (existing) {
    existing.stop();
    activeCrons.delete(schedule.userId);
  }
  const expr = getCronExpression(schedule.minute, schedule.hour);
  console.log(`[Scheduler] Setting cron for user ${schedule.userId}: ${expr}`);
  const task = import_node_cron.default.schedule(expr, () => {
    runScheduledReport(schedule.userId, schedule.context);
  });
  activeCrons.set(schedule.userId, task);
}
function removeUserCron(userId) {
  const existing = activeCrons.get(userId);
  if (existing) {
    existing.stop();
    activeCrons.delete(userId);
    console.log(`[Scheduler] Removed cron for user ${userId}`);
  }
}
async function initScheduler() {
  try {
    const allSchedules = await db.select().from(schedules).where((0, import_drizzle_orm2.eq)(schedules.enabled, true));
    console.log(`[Scheduler] Loading ${allSchedules.length} active schedule(s)`);
    for (const schedule of allSchedules) {
      scheduleUserCron(schedule);
    }
  } catch (error) {
    console.error("[Scheduler] Failed to initialize:", error);
  }
}
async function updateUserSchedule(userId, updates) {
  const existing = await db.select().from(schedules).where((0, import_drizzle_orm2.eq)(schedules.userId, userId));
  let schedule;
  if (existing.length === 0) {
    [schedule] = await db.insert(schedules).values({
      userId,
      enabled: updates.enabled ?? false,
      hour: updates.hour ?? 9,
      minute: updates.minute ?? 0,
      context: updates.context ?? null
    }).returning();
  } else {
    [schedule] = await db.update(schedules).set(updates).where((0, import_drizzle_orm2.eq)(schedules.userId, userId)).returning();
  }
  if (schedule.enabled) {
    scheduleUserCron(schedule);
  } else {
    removeUserCron(userId);
  }
  return schedule;
}
async function getUserSchedule(userId) {
  const [schedule] = await db.select().from(schedules).where((0, import_drizzle_orm2.eq)(schedules.userId, userId));
  return schedule || { enabled: false, hour: 9, minute: 0, timezone: "America/New_York", context: null };
}

// server/twitter.ts
var import_twitter_api_v2 = require("twitter-api-v2");
function getClient() {
  const apiKey = process.env.X_API_KEY;
  const apiSecret = process.env.X_API_SECRET;
  const accessToken = process.env.X_ACCESS_TOKEN;
  const accessTokenSecret = process.env.X_ACCESS_TOKEN_SECRET;
  if (!apiKey || !apiSecret || !accessToken || !accessTokenSecret) {
    throw new Error("X/Twitter API credentials not configured");
  }
  return new import_twitter_api_v2.TwitterApi({
    appKey: apiKey,
    appSecret: apiSecret,
    accessToken,
    accessSecret: accessTokenSecret
  });
}
async function postTweet(content) {
  const client = getClient();
  const result = await client.v2.tweet(content);
  return { id: result.data.id, text: result.data.text };
}
async function postThread(tweets) {
  if (tweets.length === 0) throw new Error("Thread must have at least one tweet");
  const client = getClient();
  const ids = [];
  const texts = [];
  const first = await client.v2.tweet(tweets[0]);
  ids.push(first.data.id);
  texts.push(first.data.text);
  let lastId = first.data.id;
  for (let i = 1; i < tweets.length; i++) {
    const reply = await client.v2.reply(tweets[i], lastId);
    ids.push(reply.data.id);
    texts.push(reply.data.text);
    lastId = reply.data.id;
  }
  return { ids, texts };
}
async function verifyCredentials() {
  const client = getClient();
  const me = await client.v2.me();
  return { username: me.data.username, name: me.data.name };
}

// server/routes.ts
async function registerRoutes(app2) {
  registerAuthRoutes(app2);
  app2.post("/api/report/generate", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId;
      const context = req.body?.context || "";
      const images = req.body?.images || [];
      const report = await generateDailyReport(context, images);
      const dateKey = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
      await db.insert(reports).values({
        userId,
        reportDate: dateKey,
        context: context || void 0,
        reportData: report
      });
      res.json({ success: true, report });
    } catch (error) {
      console.error("Report generation error:", error);
      res.status(500).json({
        success: false,
        error: error.message || "Failed to generate report"
      });
    }
  });
  app2.get("/api/report/today", authMiddleware, async (req, res) => {
    const userId = req.user.userId;
    const dateKey = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const [todayReport] = await db.select().from(reports).where((0, import_drizzle_orm3.eq)(reports.userId, userId)).orderBy((0, import_drizzle_orm3.desc)(reports.generatedAt)).limit(1);
    if (todayReport && todayReport.reportDate === dateKey) {
      res.json({ success: true, report: todayReport.reportData, cached: true });
    } else {
      res.json({ success: true, report: null });
    }
  });
  app2.get("/api/reports/history", authMiddleware, async (req, res) => {
    try {
      const userId = req.user.userId;
      const userReports = await db.select().from(reports).where((0, import_drizzle_orm3.eq)(reports.userId, userId)).orderBy((0, import_drizzle_orm3.desc)(reports.generatedAt)).limit(30);
      const formatted = userReports.map((r) => ({
        ...r.reportData,
        reportDate: r.reportDate,
        generatedAt: r.generatedAt?.toISOString(),
        context: r.context
      }));
      res.json({ success: true, reports: formatted });
    } catch (error) {
      console.error("History fetch error:", error);
      res.status(500).json({ success: false, error: "Failed to load history" });
    }
  });
  app2.get("/api/schedule", authMiddleware, async (req, res) => {
    try {
      const schedule = await getUserSchedule(req.user.userId);
      res.json({ success: true, schedule });
    } catch (error) {
      console.error("Schedule fetch error:", error);
      res.status(500).json({ success: false, error: "Failed to load schedule" });
    }
  });
  app2.put("/api/schedule", authMiddleware, async (req, res) => {
    try {
      const { enabled, hour, minute, context } = req.body;
      const schedule = await updateUserSchedule(req.user.userId, {
        enabled,
        hour,
        minute,
        context
      });
      res.json({ success: true, schedule });
    } catch (error) {
      console.error("Schedule update error:", error);
      res.status(500).json({ success: false, error: "Failed to update schedule" });
    }
  });
  app2.post("/api/tweet/post", authMiddleware, async (req, res) => {
    try {
      const { content, threadTweets, type } = req.body;
      if (!content || typeof content !== "string") {
        return res.status(400).json({ success: false, error: "Tweet content is required" });
      }
      if (type === "thread" && threadTweets && Array.isArray(threadTweets) && threadTweets.length > 0) {
        const allTweets = [content, ...threadTweets];
        const result2 = await postThread(allTweets);
        return res.json({
          success: true,
          tweetId: result2.ids[0],
          threadIds: result2.ids,
          url: `https://x.com/i/status/${result2.ids[0]}`
        });
      }
      const result = await postTweet(content);
      res.json({
        success: true,
        tweetId: result.id,
        url: `https://x.com/i/status/${result.id}`
      });
    } catch (error) {
      console.error("Tweet post error:", error);
      const message = error?.data?.detail || error?.message || "Failed to post tweet";
      res.status(500).json({ success: false, error: message });
    }
  });
  app2.get("/api/tweet/verify", authMiddleware, async (_req, res) => {
    try {
      const user = await verifyCredentials();
      res.json({ success: true, ...user });
    } catch (error) {
      console.error("Twitter verify error:", error);
      res.status(500).json({ success: false, error: "Failed to verify X credentials" });
    }
  });
  app2.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
  });
  initScheduler().catch((err) => console.error("Scheduler init failed:", err));
  const httpServer = (0, import_node_http.createServer)(app2);
  return httpServer;
}

// server/index.ts
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var app = (0, import_express.default)();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    import_express.default.json({
      limit: "50mb",
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(import_express.default.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path2 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path2.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path2} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path.resolve(process.cwd(), "app.json");
    const appJsonContent = fs.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", import_express.default.static(path.resolve(process.cwd(), "assets")));
  app2.use(import_express.default.static(path.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  app.get("/health", (_req, res) => {
    res.status(200).send("ok");
  });
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
