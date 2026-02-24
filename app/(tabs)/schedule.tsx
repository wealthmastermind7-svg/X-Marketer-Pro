import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { getSchedule, saveSchedule, type ScheduleConfig } from "@/lib/storage";

function SettingRow({
  icon,
  iconColor,
  label,
  value,
  trailing,
}: {
  icon: string;
  iconColor?: string;
  label: string;
  value?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <View
          style={[
            styles.iconBox,
            { backgroundColor: `${iconColor || Colors.gold}15` },
          ]}
        >
          <Ionicons
            name={icon as any}
            size={18}
            color={iconColor || Colors.gold}
          />
        </View>
        <View>
          <Text style={styles.settingLabel}>{label}</Text>
          {value && <Text style={styles.settingValue}>{value}</Text>}
        </View>
      </View>
      {trailing}
    </View>
  );
}

export default function ScheduleScreen() {
  const insets = useSafeAreaInsets();
  const [config, setConfig] = useState<ScheduleConfig>({
    enabled: true,
    hour: 9,
    minute: 0,
    notifications: true,
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const saved = await getSchedule();
    setConfig(saved);
  };

  const updateConfig = async (updates: Partial<ScheduleConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    await saveSchedule(newConfig);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? "PM" : "AM";
    const h = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h}:${minute.toString().padStart(2, "0")} ${period}`;
  };

  const getNextRunDate = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(config.hour, config.minute, 0, 0);
    if (now >= next) {
      next.setDate(next.getDate() + 1);
    }
    return next.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
    });
  };

  const tasks = [
    {
      icon: "trending-up",
      text: "Checks Twitter/X trends and viral patterns",
      color: "#4CAF7C",
    },
    {
      icon: "bar-chart-outline",
      text: "Analyzes high-performing content types",
      color: "#6C9BF2",
    },
    {
      icon: "create-outline",
      text: "Drafts 3-5 tweet/thread ideas for you",
      color: Colors.gold,
    },
    {
      icon: "time-outline",
      text: "Suggests optimal posting times",
      color: "#B67CE8",
    },
    {
      icon: "sparkles",
      text: "Provides one actionable growth tip",
      color: "#E88B6C",
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 114 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(600)}>
          <View style={styles.header}>
            <Text style={styles.title}>DAILY{"\n"}SCHEDULE</Text>
            <Text style={styles.subtitle}>
              Automated X marketing intelligence
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(600)}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons
                name="clock-check-outline"
                size={18}
                color={Colors.gold}
              />
              <Text style={styles.cardTitle}>CRON JOB</Text>
              <View
                style={[
                  styles.statusPill,
                  {
                    backgroundColor: config.enabled
                      ? "rgba(76, 175, 124, 0.12)"
                      : "rgba(245, 237, 214, 0.08)",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    {
                      color: config.enabled ? "#4CAF7C" : Colors.textDim,
                    },
                  ]}
                >
                  {config.enabled ? "ACTIVE" : "PAUSED"}
                </Text>
              </View>
            </View>

            <SettingRow
              icon="power-outline"
              label="Enabled"
              value={config.enabled ? "Running daily" : "Paused"}
              trailing={
                <Switch
                  value={config.enabled}
                  onValueChange={(v) => updateConfig({ enabled: v })}
                  trackColor={{
                    false: Colors.surface2,
                    true: Colors.goldDim,
                  }}
                  thumbColor={config.enabled ? Colors.gold : Colors.textDim}
                />
              }
            />

            <View style={styles.divider} />

            <SettingRow
              icon="alarm-outline"
              label="Schedule"
              value={`Every day at ${formatTime(config.hour, config.minute)}`}
            />

            <View style={styles.divider} />

            <SettingRow
              icon="calendar-outline"
              iconColor="#6C9BF2"
              label="Next Run"
              value={`${getNextRunDate()} at ${formatTime(config.hour, config.minute)}`}
            />

            <View style={styles.divider} />

            <SettingRow
              icon="notifications-outline"
              iconColor="#B67CE8"
              label="Notifications"
              value={
                config.notifications
                  ? "Enabled"
                  : "Disabled"
              }
              trailing={
                <Switch
                  value={config.notifications}
                  onValueChange={(v) => updateConfig({ notifications: v })}
                  trackColor={{
                    false: Colors.surface2,
                    true: Colors.goldDim,
                  }}
                  thumbColor={
                    config.notifications ? Colors.gold : Colors.textDim
                  }
                />
              }
            />

            <View style={styles.divider} />

            <SettingRow
              icon="hourglass-outline"
              iconColor="#E88B6C"
              label="Timeout"
              value="5 minutes"
            />
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons
                name="lightning-bolt"
                size={18}
                color={Colors.gold}
              />
              <Text style={styles.cardTitle}>WHAT IT DOES EACH MORNING</Text>
            </View>

            {tasks.map((task, i) => (
              <View key={i} style={styles.taskRow}>
                <View
                  style={[
                    styles.taskIcon,
                    { backgroundColor: `${task.color}15` },
                  ]}
                >
                  <Ionicons
                    name={task.icon as any}
                    size={16}
                    color={task.color}
                  />
                </View>
                <Text style={styles.taskText}>{task.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <View style={styles.agentCard}>
            <View style={styles.agentHeader}>
              <Feather name="cpu" size={16} color={Colors.gold} />
              <Text style={styles.agentTitle}>X MARKETER ENGINE</Text>
            </View>
            <Text style={styles.agentId}>
              AI-Powered Marketing Intelligence
            </Text>
            <View style={styles.agentStatus}>
              <View style={styles.agentDot} />
              <Text style={styles.agentStatusText}>Connected & Ready</Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 38,
    color: Colors.cream,
    lineHeight: 42,
    marginBottom: 6,
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: Colors.textDim,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  cardTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: Colors.gold,
    letterSpacing: 2,
    flex: 1,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 10,
    letterSpacing: 1,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  settingLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 15,
    color: Colors.cream,
  },
  settingValue: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: Colors.textDim,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  taskRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  taskIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  taskText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: Colors.cream,
    flex: 1,
    lineHeight: 20,
  },
  agentCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  agentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  agentTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: Colors.gold,
    letterSpacing: 2,
  },
  agentId: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: Colors.textDim,
    marginBottom: 10,
  },
  agentStatus: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  agentDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  agentStatusText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: Colors.success,
  },
});
