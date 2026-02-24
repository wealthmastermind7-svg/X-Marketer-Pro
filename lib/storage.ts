import AsyncStorage from "@react-native-async-storage/async-storage";

const REPORTS_KEY = "@xmarketer_reports";
const SCHEDULE_KEY = "@xmarketer_schedule";

export interface DailyReport {
  reportDate: string;
  generatedAt: string;
  trends: Array<{
    topic: string;
    momentum: "rising" | "peaking" | "declining";
    relevance: "high" | "medium" | "low";
    description: string;
  }>;
  tweetIdeas: Array<{
    type: "hook" | "thread" | "tip" | "poll" | "storytelling";
    content: string;
    estimatedEngagement: "high" | "medium";
    notes: string;
  }>;
  postingTimes: Array<{
    time: string;
    timezone: string;
    reason: string;
  }>;
  growthTip: {
    title: string;
    description: string;
    expectedImpact: string;
  };
  contentAnalysis: {
    topPerformingType: string;
    recommendation: string;
  };
}

export interface ScheduleConfig {
  enabled: boolean;
  hour: number;
  minute: number;
  notifications: boolean;
}

export async function saveReport(report: DailyReport): Promise<void> {
  const existing = await getReports();
  const filtered = existing.filter((r) => r.reportDate !== report.reportDate);
  filtered.unshift(report);
  const trimmed = filtered.slice(0, 30);
  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(trimmed));
}

export async function getReports(): Promise<DailyReport[]> {
  const data = await AsyncStorage.getItem(REPORTS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function getSchedule(): Promise<ScheduleConfig> {
  const data = await AsyncStorage.getItem(SCHEDULE_KEY);
  return data
    ? JSON.parse(data)
    : { enabled: true, hour: 9, minute: 0, notifications: true };
}

export async function saveSchedule(config: ScheduleConfig): Promise<void> {
  await AsyncStorage.setItem(SCHEDULE_KEY, JSON.stringify(config));
}
