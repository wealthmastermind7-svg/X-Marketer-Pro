import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons, Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import type { DailyReport } from "@/lib/storage";

function MomentumBadge({ momentum }: { momentum: string }) {
  const color =
    momentum === "rising"
      ? "#4CAF7C"
      : momentum === "peaking"
        ? Colors.gold
        : "#E85D4A";
  const icon =
    momentum === "rising"
      ? "trending-up"
      : momentum === "peaking"
        ? "minus"
        : "trending-down";

  return (
    <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
      <Feather name={icon as any} size={11} color={color} />
      <Text style={[styles.badgeText, { color }]}>{momentum}</Text>
    </View>
  );
}

function TrendItem({
  trend,
  index,
}: {
  trend: DailyReport["trends"][0];
  index: number;
}) {
  return (
    <Animated.View entering={FadeIn.delay(100 * index).duration(400)}>
      <View style={styles.trendItem}>
        <View style={styles.trendHeader}>
          <Text style={styles.trendTopic}>{trend.topic}</Text>
          <MomentumBadge momentum={trend.momentum} />
        </View>
        <Text style={styles.trendDesc}>{trend.description}</Text>
      </View>
    </Animated.View>
  );
}

function TweetIdeaItem({
  idea,
  index,
}: {
  idea: DailyReport["tweetIdeas"][0];
  index: number;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const typeColors: Record<string, string> = {
    hook: "#E8B84B",
    thread: "#6C9BF2",
    tip: "#4CAF7C",
    poll: "#B67CE8",
    storytelling: "#E88B6C",
  };

  const typeIcons: Record<string, string> = {
    hook: "flash-outline",
    thread: "layers-outline",
    tip: "bulb-outline",
    poll: "bar-chart-outline",
    storytelling: "book-outline",
  };

  return (
    <Animated.View
      entering={FadeIn.delay(150 * index).duration(400)}
      style={animatedStyle}
    >
      <Pressable
        onPressIn={() => {
          scale.value = withSpring(0.97);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }}
        onPressOut={() => {
          scale.value = withSpring(1);
        }}
      >
        <View style={styles.tweetCard}>
          <View style={styles.tweetTypeRow}>
            <View
              style={[
                styles.typeTag,
                {
                  backgroundColor: `${typeColors[idea.type] || Colors.gold}15`,
                },
              ]}
            >
              <Ionicons
                name={(typeIcons[idea.type] || "create-outline") as any}
                size={12}
                color={typeColors[idea.type] || Colors.gold}
              />
              <Text
                style={[
                  styles.typeText,
                  { color: typeColors[idea.type] || Colors.gold },
                ]}
              >
                {idea.type}
              </Text>
            </View>
            <View
              style={[
                styles.engBadge,
                {
                  backgroundColor:
                    idea.estimatedEngagement === "high"
                      ? "rgba(76, 175, 124, 0.1)"
                      : "rgba(232, 184, 75, 0.1)",
                },
              ]}
            >
              <Ionicons
                name={
                  idea.estimatedEngagement === "high"
                    ? "rocket-outline"
                    : "pulse-outline"
                }
                size={11}
                color={
                  idea.estimatedEngagement === "high" ? "#4CAF7C" : Colors.gold
                }
              />
            </View>
          </View>
          <Text style={styles.tweetContent}>{idea.content}</Text>
          <Text style={styles.tweetNotes}>{idea.notes}</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function PostingTimeItem({
  time,
  index,
}: {
  time: DailyReport["postingTimes"][0];
  index: number;
}) {
  return (
    <Animated.View entering={FadeIn.delay(100 * index).duration(400)}>
      <View style={styles.timeItem}>
        <View style={styles.timeLeft}>
          <Text style={styles.timeValue}>{time.time}</Text>
          <Text style={styles.timeZone}>{time.timezone}</Text>
        </View>
        <Text style={styles.timeReason}>{time.reason}</Text>
      </View>
    </Animated.View>
  );
}

export function TrendsSection({ trends }: { trends: DailyReport["trends"] }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="trending-up" size={18} color={Colors.gold} />
        <Text style={styles.sectionTitle}>TRENDING NOW</Text>
      </View>
      {trends.map((trend, i) => (
        <TrendItem key={i} trend={trend} index={i} />
      ))}
    </View>
  );
}

export function TweetIdeasSection({
  ideas,
}: {
  ideas: DailyReport["tweetIdeas"];
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <MaterialCommunityIcons name="lightning-bolt" size={18} color={Colors.gold} />
        <Text style={styles.sectionTitle}>TWEET IDEAS</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{ideas.length}</Text>
        </View>
      </View>
      {ideas.map((idea, i) => (
        <TweetIdeaItem key={i} idea={idea} index={i} />
      ))}
    </View>
  );
}

export function PostingTimesSection({
  times,
}: {
  times: DailyReport["postingTimes"];
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="time-outline" size={18} color={Colors.gold} />
        <Text style={styles.sectionTitle}>OPTIMAL TIMES</Text>
      </View>
      {times.map((time, i) => (
        <PostingTimeItem key={i} time={time} index={i} />
      ))}
    </View>
  );
}

export function GrowthTipSection({
  tip,
}: {
  tip: DailyReport["growthTip"];
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="sparkles" size={18} color={Colors.gold} />
        <Text style={styles.sectionTitle}>GROWTH TIP</Text>
      </View>
      <View style={styles.growthCard}>
        <Text style={styles.growthTitle}>{tip.title}</Text>
        <Text style={styles.growthDesc}>{tip.description}</Text>
        <View style={styles.impactRow}>
          <Feather name="target" size={13} color={Colors.gold} />
          <Text style={styles.impactText}>{tip.expectedImpact}</Text>
        </View>
      </View>
    </View>
  );
}

export function ContentAnalysisSection({
  analysis,
}: {
  analysis: DailyReport["contentAnalysis"];
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="pie-chart-outline" size={18} color={Colors.gold} />
        <Text style={styles.sectionTitle}>CONTENT ANALYSIS</Text>
      </View>
      <View style={styles.analysisCard}>
        <View style={styles.analysisRow}>
          <Text style={styles.analysisLabel}>Top Performing</Text>
          <Text style={styles.analysisValue}>
            {analysis.topPerformingType}
          </Text>
        </View>
        <View style={styles.analysisDivider} />
        <Text style={styles.analysisRec}>{analysis.recommendation}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 14,
  },
  sectionTitle: {
    fontFamily: "DMSans_700Bold",
    fontSize: 13,
    color: Colors.gold,
    letterSpacing: 2,
    flex: 1,
  },
  countBadge: {
    backgroundColor: Colors.goldDim,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 12,
    color: Colors.gold,
  },
  trendItem: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  trendHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  trendTopic: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 15,
    color: Colors.cream,
    flex: 1,
    marginRight: 8,
  },
  trendDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.creamMuted,
    lineHeight: 19,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  badgeText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 11,
    textTransform: "capitalize",
  },
  tweetCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tweetTypeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  typeTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  typeText: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  engBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  tweetContent: {
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: Colors.cream,
    lineHeight: 22,
    marginBottom: 10,
  },
  tweetNotes: {
    fontFamily: "DMSans_400Regular",
    fontSize: 12,
    color: Colors.creamMuted,
    fontStyle: "italic",
    lineHeight: 17,
  },
  timeItem: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  timeLeft: {
    alignItems: "center",
    minWidth: 72,
  },
  timeValue: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: Colors.gold,
  },
  timeZone: {
    fontFamily: "DMSans_400Regular",
    fontSize: 11,
    color: Colors.textDim,
    marginTop: 2,
  },
  timeReason: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.creamMuted,
    flex: 1,
    lineHeight: 19,
  },
  growthCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: Colors.borderStrong,
  },
  growthTitle: {
    fontFamily: "DMSerifDisplay_400Regular",
    fontSize: 22,
    color: Colors.gold,
    marginBottom: 10,
  },
  growthDesc: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: Colors.cream,
    lineHeight: 22,
    marginBottom: 14,
  },
  impactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.goldDim,
    padding: 10,
    borderRadius: 10,
  },
  impactText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 13,
    color: Colors.goldLight,
    flex: 1,
    lineHeight: 18,
  },
  analysisCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  analysisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  analysisLabel: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.creamMuted,
  },
  analysisValue: {
    fontFamily: "DMSans_600SemiBold",
    fontSize: 14,
    color: Colors.gold,
  },
  analysisDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  analysisRec: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.cream,
    lineHeight: 20,
  },
});
