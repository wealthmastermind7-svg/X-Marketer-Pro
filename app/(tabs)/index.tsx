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
  Image,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
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
import type { DailyReport } from "@/lib/storage";
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

interface Attachment {
  uri: string;
  base64: string;
  mimeType: string;
  name: string;
  type: "image" | "file";
}

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
      <View style={[styles.chip, selected && styles.chipSelected]}>
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function AttachmentButton({
  icon,
  label,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={styles.attachButton}
    >
      <View style={styles.attachButtonInner}>
        <Ionicons name={icon} size={22} color={Colors.gold} />
        <Text style={styles.attachButtonLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

function AttachmentPreview({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: () => void;
}) {
  return (
    <View style={styles.attachPreview}>
      {attachment.type === "image" ? (
        <Image source={{ uri: attachment.uri }} style={styles.attachThumb} />
      ) : (
        <View style={styles.attachFileThumb}>
          <Ionicons name="document-outline" size={20} color={Colors.gold} />
        </View>
      )}
      <Text style={styles.attachName} numberOfLines={1}>
        {attachment.name}
      </Text>
      <Pressable onPress={onRemove} style={styles.attachRemove}>
        <Feather name="x" size={14} color={Colors.textDim} />
      </Pressable>
    </View>
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
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const buttonScale = useSharedValue(1);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const buttonStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  useEffect(() => {
    loadCachedReport();
  }, []);

  const loadCachedReport = async () => {
    try {
      const res = await apiRequest("GET", "/api/report/today");
      const data = await res.json();
      if (data.success && data.report) {
        setReport(data.report);
      }
    } catch {
    }
  };

  const pickFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Camera access is required to take photos.");
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.7,
      allowsEditing: true,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      if (asset.base64) {
        setAttachments((prev) => [
          ...prev,
          {
            uri: asset.uri,
            base64: asset.base64!,
            mimeType: asset.mimeType || "image/jpeg",
            name: `Photo ${prev.length + 1}`,
            type: "image",
          },
        ]);
      }
    }
  };

  const pickFromPhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission needed", "Photo library access is required.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.7,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      mediaTypes: ["images"],
    });
    if (!result.canceled && result.assets.length > 0) {
      const newAttachments: Attachment[] = result.assets
        .filter((a) => a.base64)
        .map((asset, i) => ({
          uri: asset.uri,
          base64: asset.base64!,
          mimeType: asset.mimeType || "image/jpeg",
          name: asset.fileName || `Image ${attachments.length + i + 1}`,
          type: "image" as const,
        }));
      setAttachments((prev) => [...prev, ...newAttachments]);
    }
  };

  const pickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*"],
        multiple: true,
      });
      if (!result.canceled && result.assets.length > 0) {
        const newAttachments: Attachment[] = [];
        for (const asset of result.assets) {
          try {
            const base64 = await FileSystem.readAsStringAsync(asset.uri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            newAttachments.push({
              uri: asset.uri,
              base64,
              mimeType: asset.mimeType || "image/jpeg",
              name: asset.name || `File ${attachments.length + newAttachments.length + 1}`,
              type: "image",
            });
          } catch {
            // skip files that can't be read
          }
        }
        if (newAttachments.length > 0) {
          setAttachments((prev) => [...prev, ...newAttachments]);
        }
      }
    } catch {
      // user cancelled
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const generateReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const images = attachments.map((a) => ({
        base64: a.base64,
        mimeType: a.mimeType,
      }));

      const res = await apiRequest("POST", "/api/report/generate", {
        context: context.trim(),
        images,
      });
      const data = await res.json();

      if (data.success && data.report) {
        data.report.context = context.trim() || undefined;
        data.report.attachmentCount = attachments.length;
        setReport(data.report);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        throw new Error(data.error || "Failed to generate report");
      }
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("401")) {
        setError("Please sign in to generate reports.");
      } else {
        setError(msg || "Connection failed. Check your network.");
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [context, attachments]);

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
              <Ionicons
                name="timer-outline"
                size={14}
                color={Colors.textDim}
              />
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
                {context || attachments.length > 0
                  ? `Focus${attachments.length > 0 ? ` + ${attachments.length} file${attachments.length > 1 ? "s" : ""}` : ""}`
                  : "Set your focus"}
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

              <View style={styles.attachRow}>
                <AttachmentButton
                  icon="camera-outline"
                  label="Camera"
                  onPress={pickFromCamera}
                />
                <AttachmentButton
                  icon="images-outline"
                  label="Photos"
                  onPress={pickFromPhotos}
                />
                <AttachmentButton
                  icon="folder-outline"
                  label="Files"
                  onPress={pickFromFiles}
                />
              </View>

              {attachments.length > 0 && (
                <View style={styles.attachList}>
                  {attachments.map((att, i) => (
                    <AttachmentPreview
                      key={`${att.uri}-${i}`}
                      attachment={att}
                      onRemove={() => removeAttachment(i)}
                    />
                  ))}
                </View>
              )}
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
                    {attachments.length > 0
                      ? "Analyzing Images & Trends..."
                      : "Analyzing X Trends..."}
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
              {((report as any).context || (report as any).attachmentCount > 0) && (
                <View style={styles.contextTagRow}>
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
                  {(report as any).attachmentCount > 0 && (
                    <View style={styles.contextTag}>
                      <Ionicons
                        name="attach-outline"
                        size={12}
                        color={Colors.gold}
                      />
                      <Text style={styles.contextTagText}>
                        {(report as any).attachmentCount} file{(report as any).attachmentCount > 1 ? "s" : ""} analyzed
                      </Text>
                    </View>
                  )}
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
                Set your focus above, attach screenshots or files, then tap "Run
                X Marketer Now" for a tailored marketing report
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
  attachRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
  },
  attachButton: {
    flex: 1,
  },
  attachButtonInner: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  attachButtonLabel: {
    fontFamily: "DMSans_500Medium",
    fontSize: 12,
    color: Colors.creamMuted,
  },
  attachList: {
    marginTop: 12,
    gap: 8,
  },
  attachPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 8,
  },
  attachThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.surface2,
  },
  attachFileThumb: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  attachName: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: Colors.cream,
  },
  attachRemove: {
    padding: 6,
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
  contextTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  contextTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.goldDim,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
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
