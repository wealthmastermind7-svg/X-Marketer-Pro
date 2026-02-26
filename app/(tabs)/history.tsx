import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import type { DailyReport } from "@/lib/storage";
import {
  TweetIdeasSection,
  PostingTimesSection,
  GrowthTipSection,
  ContentAnalysisSection,
} from "@/components/ReportCard";

function TrendBadge({ trend }: { trend: DailyReport["trends"][0] }) {
  const color =
    trend.momentum === "rising"
      ? "#4CAF7C"
      : trend.momentum === "peaking"
        ? Colors.gold
        : "#E85D4A";
  return (
    <View style={[detailStyles.trendItem, { borderLeftColor: color }]}>
      <View style={detailStyles.trendHeader}>
        <Text style={detailStyles.trendTopic}>{trend.topic}</Text>
        <View style={[detailStyles.momentumBadge, { backgroundColor: `${color}15` }]}>
          <Feather
            name={trend.momentum === "rising" ? "trending-up" : trend.momentum === "peaking" ? "minus" : "trending-down"}
            size={11}
            color={color}
          />
          <Text style={[detailStyles.momentumText, { color }]}>{trend.momentum}</Text>
        </View>
      </View>
      <Text style={detailStyles.trendDesc}>{trend.description}</Text>
    </View>
  );
}

function ReportDetail({ report, twitterConnected }: { report: DailyReport; twitterConnected?: boolean }) {
  return (
    <Animated.View entering={FadeIn.duration(300)}>
      <View style={detailStyles.container}>
        {report.trends && report.trends.length > 0 && (
          <View style={detailStyles.section}>
            <View style={detailStyles.sectionHeader}>
              <Ionicons name="trending-up" size={16} color={Colors.gold} />
              <Text style={detailStyles.sectionTitle}>TRENDS</Text>
            </View>
            {report.trends.map((trend, i) => (
              <TrendBadge key={i} trend={trend} />
            ))}
          </View>
        )}

        {report.tweetIdeas && report.tweetIdeas.length > 0 && (
          <TweetIdeasSection ideas={report.tweetIdeas} twitterConnected={twitterConnected} />
        )}

        {report.postingTimes && report.postingTimes.length > 0 && (
          <PostingTimesSection times={report.postingTimes} />
        )}

        {report.growthTip && <GrowthTipSection tip={report.growthTip} />}

        {report.contentAnalysis && (
          <ContentAnalysisSection analysis={report.contentAnalysis} />
        )}
      </View>
    </Animated.View>
  );
}

function HistoryItem({
  report,
  index,
  expanded,
  onToggle,
  twitterConnected,
}: {
  report: DailyReport;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  twitterConnected?: boolean;
}) {
  const date = new Date(report.reportDate + "T12:00:00");
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const monthDay = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const risingCount =
    report.trends?.filter((t) => t.momentum === "rising").length || 0;
  const ideaCount = report.tweetIdeas?.length || 0;

  return (
    <Animated.View entering={FadeInDown.delay(80 * index).duration(400)}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        style={({ pressed }) => [
          styles.historyCard,
          expanded && styles.historyCardExpanded,
          pressed && !expanded && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={styles.cardHeader}>
          <View style={styles.dateCol}>
            <Text style={styles.dayName}>{dayName}</Text>
            <Text style={styles.monthDay}>{monthDay}</Text>
          </View>
          <View style={styles.infoCol}>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="trending-up" size={13} color={Colors.success} />
                <Text style={styles.statText}>{risingCount} rising</Text>
              </View>
              <View style={styles.stat}>
                <Ionicons name="create-outline" size={13} color={Colors.gold} />
                <Text style={styles.statText}>{ideaCount} ideas</Text>
              </View>
            </View>
            {report.growthTip && (
              <Text style={styles.tipPreview} numberOfLines={1}>
                {report.growthTip.title}
              </Text>
            )}
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-forward"}
            size={18}
            color={Colors.textDim}
          />
        </View>
      </Pressable>

      {expanded && <ReportDetail report={report} twitterConnected={twitterConnected} />}
    </Animated.View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [twitterConnected, setTwitterConnected] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  useFocusEffect(
    useCallback(() => {
      loadReports();
      loadTwitterStatus();
    }, [])
  );

  const loadTwitterStatus = async () => {
    try {
      const res = await apiRequest("GET", "/api/twitter/status");
      const data = await res.json();
      if (data.success) setTwitterConnected(data.connected);
    } catch {}
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("GET", "/api/reports/history");
      const data = await res.json();
      if (data.success && data.reports) {
        setReports(data.reports);
      }
    } catch (err) {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: topPadding }]}>
      <View style={styles.header}>
        <Text style={styles.title}>REPORT{"\n"}HISTORY</Text>
        <Text style={styles.subtitle}>
          {reports.length} report{reports.length !== 1 ? "s" : ""} generated
        </Text>
      </View>

      {loading && reports.length === 0 ? (
        <View style={styles.emptyState}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item, index) => `${item.reportDate}-${index}`}
          renderItem={({ item, index }) => (
            <HistoryItem
              report={item}
              index={index}
              expanded={expandedIndex === index}
              onToggle={() =>
                setExpandedIndex(expandedIndex === index ? null : index)
              }
              twitterConnected={twitterConnected}
            />
          )}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 114 : 100 },
          ]}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!reports.length}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons
                name="time-outline"
                size={48}
                color={Colors.textDim}
              />
              <Text style={styles.emptyTitle}>No Reports Yet</Text>
              <Text style={styles.emptyDesc}>
                Generated reports will appear here. Go to Today and run your
                first report.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const detailStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 12,
    color: Colors.gold,
    letterSpacing: 2,
  },
  trendItem: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 6,
    borderLeftWidth: 3,
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  trendTopic: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: Colors.cream,
    flex: 1,
    marginRight: 8,
  },
  momentumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  momentumText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    textTransform: "capitalize",
  },
  trendDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.creamMuted,
    lineHeight: 19,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
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
  listContent: {
    paddingHorizontal: 20,
  },
  historyCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  historyCardExpanded: {
    borderColor: Colors.goldDim,
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  dateCol: {
    alignItems: "center",
    minWidth: 48,
  },
  dayName: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    color: Colors.gold,
    letterSpacing: 1,
  },
  monthDay: {
    fontFamily: "DMSans_700Bold",
    fontSize: 15,
    color: Colors.cream,
    marginTop: 2,
  },
  infoCol: {
    flex: 1,
    gap: 6,
  },
  statsRow: {
    flexDirection: "row",
    gap: 14,
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: Colors.creamMuted,
  },
  tipPreview: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.textDim,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
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
    paddingHorizontal: 30,
  },
});
