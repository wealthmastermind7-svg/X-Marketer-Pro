import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "expo-router";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { apiRequest } from "@/lib/query-client";
import type { DailyReport } from "@/lib/storage";

function HistoryItem({
  report,
  index,
}: {
  report: DailyReport;
  index: number;
}) {
  const date = new Date(report.reportDate + "T12:00:00");
  const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
  const monthDay = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  const trendCount = report.trends?.length || 0;
  const ideaCount = report.tweetIdeas?.length || 0;
  const risingCount =
    report.trends?.filter((t) => t.momentum === "rising").length || 0;

  return (
    <Animated.View entering={FadeInDown.delay(80 * index).duration(400)}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        style={({ pressed }) => [
          styles.historyCard,
          pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        ]}
      >
        <View style={styles.dateCol}>
          <Text style={styles.dayName}>{dayName}</Text>
          <Text style={styles.monthDay}>{monthDay}</Text>
        </View>
        <View style={styles.infoCol}>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons
                name="trending-up"
                size={13}
                color={Colors.success}
              />
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
        <Feather name="chevron-right" size={18} color={Colors.textDim} />
      </Pressable>
    </Animated.View>
  );
}

export default function HistoryScreen() {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  useFocusEffect(
    useCallback(() => {
      loadReports();
    }, [])
  );

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await apiRequest("GET", "/api/reports/history");
      const data = await res.json();
      if (data.success && data.reports) {
        setReports(data.reports);
      }
    } catch (err) {
      console.log("Failed to load history from server, using empty list");
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
            <HistoryItem report={item} index={index} />
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
                Generated reports will appear here. Go to Today and run your first report.
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
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
    textTransform: "uppercase",
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
