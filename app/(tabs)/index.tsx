import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Platform,
  RefreshControl,
  TextInput,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  withSpring,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import { saveReport, getReports, type DailyReport } from "@/lib/storage";
import {
  TrendsSection,
  TweetIdeasSection,
  PostingTimesSection,
  GrowthTipSection,
  ContentAnalysisSection,
} from "@/components/ReportCard";

const QUICK_CONTEXTS = [
  "iOS app marketing",
  "AI / tech niche",
  "SaaS growth",
  "Personal brand",
  "Trending topics",
  "Indie hacker",
];

function PulseIndicator({ active }: { active: boolean }) {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    if (active) {
      opacity.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
    } else {
      opacity.value = 0.3;
    }
  }, [active]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: active ? Colors.success : Colors.textDim,
        },
        animatedStyle,
      ]}
    />
  );
}

function QuickChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
    >
      <View
        style={[
          styles.chip,
          selected && styles.chipSelected,
        ]}
      >
        <Text
          style={[
            styles.chipText,
            selected && styles.chipTextSelected,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

export default function TodayScreen() {
  const insets = useSafeAreaInsets();
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [context, setContext] = useState("");
  const [showContext, setShowContext] = useState(true);
  const buttonScale = useSharedValue(1);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  useEffect(() => {
    loadCachedReport();
  }, []);

  const loadCachedReport = async () => {
    const reports = await getReports();
    const today = new Date().toISOString().split("T")[0];
    const todayReport = reports.find((r) => r.reportDate === today);
    if (todayReport) {
      setReport(todayReport);
    }
  };

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const res = await apiRequest("POST", "/api/report/generate", {
        context: context.trim(),
      });
      const data = await res.json();

      if (data.success && data.report) {
        data.report.context = context.trim() || undefined;
        setReport(data.report);
        await saveReport(data.report);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(data.error || "Failed to generate report");
      }
    } catch (err: any) {
      setError(err.message || "Connection failed. Check your network.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [context]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    generateReport();
  }, [generateReport]);

  const handleQuickChip = (label: string) => {
    if (context === label) {
      setContext("");
    } else {
      setContext(label);
    }
  };

  const getNextRunTime = () => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(9, 0, 0, 0);
    if (now.getHours() >= 9) {
      next.setDate(next.getDate() + 1);
    }
    const diff = next.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  };

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 114 : 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.gold}
          />
        }
      >
        <Animated.View entering={FadeInDown.duration(600)}>
          <View style={styles.header}>
            <View style={styles.brandRow}>
              <Text style={styles.brandX}>X</Text>
              <Text style={styles.brandText}>MARKETER</Text>
            </View>
            <Text style={styles.dateText}>{todayFormatted}</Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <View style={styles.statusBar}>
            <View style={styles.statusLeft}>
              <PulseIndicator active={!!report} />
              <Text style={styles.statusLabel}>
                {report ? "Report Ready" : "Awaiting Generation"}
              </Text>
            </View>
            <View style={styles.statusRight}>
              <Ionicons name="timer-outline" size={14} color={Colors.textDim} />
              <Text style={styles.nextRun}>Next: {getNextRunTime()}</Text>
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).duration(600)}>
          <Pressable
            onPress={() => {
              setShowContext(!showContext);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            style={styles.contextToggle}
          >
            <View style={styles.contextToggleLeft}>
              <Ionicons name="compass-outline" size={16} color={Colors.gold} />
              <Text style={styles.contextToggleText}>
                {context ? `Focus: ${context}` : "Set your focus"}
              </Text>
            </View>
            <Feather
              name={showContext ? "chevron-up" : "chevron-down"}
              size={16}
              color={Colors.textDim}
            />
          </Pressable>

          {showContext && (
            <View style={styles.contextSection}>
              <View style={styles.contextInputWrap}>
                <TextInput
                  style={styles.contextInput}
                  placeholder="e.g. Marketing my iOS fitness app to Gen Z..."
                  placeholderTextColor={Colors.textDim}
                  value={context}
                  onChangeText={setContext}
                  multiline
                  maxLength={200}
                />
                {context.length > 0 && (
                  <Pressable
                    onPress={() => setContext("")}
                    style={styles.clearBtn}
                  >
                    <Feather name="x" size={14} color={Colors.textDim} />
                  </Pressable>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {QUICK_CONTEXTS.map((label) => (
                  <QuickChip
                    key={label}
                    label={label}
                    selected={context === label}
                    onPress={() => handleQuickChip(label)}
                  />
                ))}
              </ScrollView>
            </View>
          )}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(300).duration(600)}>
          <Pressable
            onPressIn={() => {
              buttonScale.value = withSpring(0.96);
            }}
            onPressOut={() => {
              buttonScale.value = withSpring(1);
            }}
            onPress={generateReport}
            disabled={loading}
          >
            <Animated.View
              style={[
                styles.generateButton,
                loading && styles.generateButtonLoading,
                buttonStyle,
              ]}
            >
              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={Colors.background} />
                  <Text style={styles.generateButtonText}>
                    Analyzing X Trends...
                  </Text>
                </View>
              ) : (
                <View style={styles.loadingRow}>
                  <Feather name="zap" size={18} color={Colors.background} />
                  <Text style={styles.generateButtonText}>
                    Run X Marketer Now
                  </Text>
                </View>
              )}
            </Animated.View>
          </Pressable>
        </Animated.View>

        {error && (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View style={styles.errorCard}>
              <Ionicons
                name="alert-circle-outline"
                size={18}
                color="#E85D4A"
              />
              <Text style={styles.errorText}>{error}</Text>
              <Pressable onPress={generateReport}>
                <Feather name="refresh-cw" size={16} color={Colors.gold} />
              </Pressable>
            </View>
          </Animated.View>
        )}

        {report ? (
          <Animated.View entering={FadeInDown.delay(100).duration(600)}>
            <View style={styles.reportHeader}>
              <Text style={styles.reportTitle}>TODAY'S{"\n"}REPORT</Text>
              <Text style={styles.reportTime}>
                Generated{" "}
                {new Date(report.generatedAt).toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </Text>
              {(report as any).context && (
                <View style={styles.contextTag}>
                  <Ionicons
                    name="compass-outline"
                    size={12}
                    color={Colors.gold}
                  />
                  <Text style={styles.contextTagText}>
                    {(report as any).context}
                  </Text>
                </View>
              )}
            </View>

            {report.trends && <TrendsSection trends={report.trends} />}
            {report.tweetIdeas && (
              <TweetIdeasSection ideas={report.tweetIdeas} />
            )}
            {report.postingTimes && (
              <PostingTimesSection times={report.postingTimes} />
            )}
            {report.growthTip && <GrowthTipSection tip={report.growthTip} />}
            {report.contentAnalysis && (
              <ContentAnalysisSection analysis={report.contentAnalysis} />
            )}
          </Animated.View>
        ) : !loading ? (
          <Animated.View entering={FadeInDown.delay(400).duration(600)}>
            <View style={styles.emptyState}>
              <Ionicons
                name="analytics-outline"
                size={48}
                color={Colors.textDim}
              />
              <Text style={styles.emptyTitle}>No Report Yet</Text>
              <Text style={styles.emptyDesc}>
                Set your focus above, then tap "Run X Marketer Now" to generate
                a tailored marketing intelligence report
              </Text>
            </View>
          </Animated.View>
        ) : null}
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
    marginBottom: 20,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 4,
  },
  brandX: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 48,
    color: Colors.gold,
    lineHeight: 52,
  },
  brandText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 14,
    color: Colors.creamMuted,
    letterSpacing: 6,
  },
  dateText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: Colors.textDim,
    marginTop: 2,
  },
  statusBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: Colors.cream,
  },
  statusRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  nextRun: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: Colors.textDim,
  },
  contextToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  contextToggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  contextToggleText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: Colors.cream,
  },
  contextSection: {
    marginBottom: 16,
  },
  contextInputWrap: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "flex-start",
    paddingRight: 8,
  },
  contextInput: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: Colors.cream,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 44,
    maxHeight: 80,
  },
  clearBtn: {
    paddingTop: 14,
    paddingHorizontal: 6,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    paddingBottom: 2,
  },
  chip: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  chipSelected: {
    backgroundColor: Colors.goldDim,
    borderColor: Colors.gold,
  },
  chipText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: Colors.creamMuted,
  },
  chipTextSelected: {
    color: Colors.gold,
  },
  generateButton: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  generateButtonLoading: {
    backgroundColor: Colors.goldLight,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  generateButtonText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: Colors.background,
    letterSpacing: 0.5,
  },
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(232, 93, 74, 0.08)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(232, 93, 74, 0.2)",
  },
  errorText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#E85D4A",
    flex: 1,
  },
  reportHeader: {
    marginBottom: 28,
  },
  reportTitle: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 42,
    color: Colors.cream,
    lineHeight: 46,
    marginBottom: 8,
  },
  reportTime: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.textDim,
  },
  contextTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.goldDim,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  contextTagText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: Colors.gold,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 24,
    color: Colors.creamMuted,
  },
  emptyDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: Colors.textDim,
    textAlign: "center",
    lineHeight: 21,
    paddingHorizontal: 20,
  },
});
