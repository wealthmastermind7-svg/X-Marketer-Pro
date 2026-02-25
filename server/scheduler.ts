import cron from "node-cron";
import { db } from "./db";
import { schedules, reports } from "../shared/schema";
import { eq } from "drizzle-orm";
import { generateDailyReport } from "./moonshot";

const activeCrons: Map<number, cron.ScheduledTask> = new Map();

function getCronExpression(minute: number, hour: number): string {
  return `${minute} ${hour} * * *`;
}

async function runScheduledReport(userId: number, context: string | null) {
  try {
    console.log(`[Scheduler] Running report for user ${userId}`);
    const report = await generateDailyReport(context || undefined);
    const dateKey = new Date().toISOString().split("T")[0];

    await db.insert(reports).values({
      userId,
      reportDate: dateKey,
      context: context || undefined,
      reportData: report,
    });

    console.log(`[Scheduler] Report saved for user ${userId}, date ${dateKey}`);
  } catch (error) {
    console.error(`[Scheduler] Failed to generate report for user ${userId}:`, error);
  }
}

function scheduleUserCron(schedule: { id: number; userId: number; hour: number; minute: number; context: string | null }) {
  const existing = activeCrons.get(schedule.userId);
  if (existing) {
    existing.stop();
    activeCrons.delete(schedule.userId);
  }

  const expr = getCronExpression(schedule.minute, schedule.hour);
  console.log(`[Scheduler] Setting cron for user ${schedule.userId}: ${expr}`);

  const task = cron.schedule(expr, () => {
    runScheduledReport(schedule.userId, schedule.context);
  });

  activeCrons.set(schedule.userId, task);
}

function removeUserCron(userId: number) {
  const existing = activeCrons.get(userId);
  if (existing) {
    existing.stop();
    activeCrons.delete(userId);
    console.log(`[Scheduler] Removed cron for user ${userId}`);
  }
}

export async function initScheduler() {
  try {
    const allSchedules = await db.select().from(schedules).where(eq(schedules.enabled, true));
    console.log(`[Scheduler] Loading ${allSchedules.length} active schedule(s)`);

    for (const schedule of allSchedules) {
      scheduleUserCron(schedule);
    }
  } catch (error) {
    console.error("[Scheduler] Failed to initialize:", error);
  }
}

export async function updateUserSchedule(
  userId: number,
  updates: { enabled?: boolean; hour?: number; minute?: number; context?: string | null }
) {
  const existing = await db.select().from(schedules).where(eq(schedules.userId, userId));

  let schedule;
  if (existing.length === 0) {
    [schedule] = await db
      .insert(schedules)
      .values({
        userId,
        enabled: updates.enabled ?? false,
        hour: updates.hour ?? 9,
        minute: updates.minute ?? 0,
        context: updates.context ?? null,
      })
      .returning();
  } else {
    [schedule] = await db
      .update(schedules)
      .set(updates)
      .where(eq(schedules.userId, userId))
      .returning();
  }

  if (schedule.enabled) {
    scheduleUserCron(schedule);
  } else {
    removeUserCron(userId);
  }

  return schedule;
}

export async function getUserSchedule(userId: number) {
  const [schedule] = await db.select().from(schedules).where(eq(schedules.userId, userId));
  return schedule || { enabled: false, hour: 9, minute: 0, timezone: "America/New_York", context: null };
}
