import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Colors } from "@/constants/colors";
import { useAuth } from "@/lib/auth-context";

export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError("Please fill in all fields");
      return;
    }
    if (mode === "register" && !displayName.trim()) {
      setError("Please enter your name");
      return;
    }

    setLoading(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      if (mode === "login") {
        await login(email.trim(), password);
      } else {
        await register(email.trim(), password, displayName.trim());
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setMode(mode === "login" ? "register" : "login");
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: topPadding }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <View style={styles.inner}>
        <Animated.View entering={FadeInDown.duration(600)}>
          <View style={styles.brandSection}>
            <View style={styles.brandRow}>
              <Text style={styles.brandX}>X</Text>
              <Text style={styles.brandText}>MARKETER</Text>
            </View>
            <Text style={styles.tagline}>
              {mode === "login" ? "Welcome back" : "Create your account"}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(600)}>
          <View style={styles.formCard}>
            {mode === "register" && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>NAME</Text>
                <View style={styles.inputWrap}>
                  <Ionicons name="person-outline" size={18} color={Colors.textDim} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Your name"
                    placeholderTextColor={Colors.textDim}
                    value={displayName}
                    onChangeText={setDisplayName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>EMAIL</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={Colors.textDim} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="you@example.com"
                  placeholderTextColor={Colors.textDim}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>PASSWORD</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={Colors.textDim} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Min. 6 characters"
                  placeholderTextColor={Colors.textDim}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  textContentType="password"
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={Colors.textDim}
                  />
                </Pressable>
              </View>
            </View>

            {error && (
              <View style={styles.errorRow}>
                <Ionicons name="alert-circle-outline" size={16} color="#E85D4A" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            <Pressable onPress={handleSubmit} disabled={loading} style={styles.submitBtn}>
              <View style={[styles.submitInner, loading && styles.submitLoading]}>
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.background} />
                ) : (
                  <>
                    <Feather name={mode === "login" ? "log-in" : "user-plus"} size={18} color={Colors.background} />
                    <Text style={styles.submitText}>
                      {mode === "login" ? "Sign In" : "Create Account"}
                    </Text>
                  </>
                )}
              </View>
            </Pressable>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(400).duration(600)}>
          <Pressable onPress={toggleMode} style={styles.switchBtn}>
            <Text style={styles.switchText}>
              {mode === "login" ? "Don't have an account? " : "Already have an account? "}
              <Text style={styles.switchHighlight}>
                {mode === "login" ? "Sign Up" : "Sign In"}
              </Text>
            </Text>
          </Pressable>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  inner: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  brandSection: {
    alignItems: "center",
    marginBottom: 40,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 10,
    marginBottom: 8,
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
  tagline: {
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    color: Colors.textDim,
  },
  formCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontFamily: "DMSans_700Bold",
    fontSize: 11,
    color: Colors.gold,
    letterSpacing: 2,
    paddingLeft: 4,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputIcon: {
    paddingLeft: 14,
  },
  input: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 15,
    color: Colors.cream,
    paddingHorizontal: 10,
    paddingVertical: 14,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(232, 93, 74, 0.1)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  errorText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#E85D4A",
    flex: 1,
  },
  submitBtn: {
    marginTop: 4,
  },
  submitInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 16,
  },
  submitLoading: {
    opacity: 0.8,
  },
  submitText: {
    fontFamily: "DMSans_700Bold",
    fontSize: 16,
    color: Colors.background,
  },
  switchBtn: {
    alignItems: "center",
    paddingVertical: 20,
  },
  switchText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: Colors.textDim,
  },
  switchHighlight: {
    fontFamily: "DMSans_700Bold",
    color: Colors.gold,
  },
});
