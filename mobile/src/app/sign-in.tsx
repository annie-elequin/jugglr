import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth/auth-client";
import { Mail, ArrowRight } from "lucide-react-native";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async () => {
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "sign-in",
      });
      if (result.error) {
        setError(result.error.message || "Failed to send code");
      } else {
        router.push({ pathname: "/verify-otp" as any, params: { email: email.trim().toLowerCase() } });
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={s.container}>
      <LinearGradient colors={["#06060F", "#0A0A1A", "#0D0B1F"]} style={StyleSheet.absoluteFill} />

      {/* Stars */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: 40 }).map((_, i) => (
          <View
            key={i}
            style={[
              s.star,
              {
                left: `${(i * 37 + 7) % 100}%` as any,
                top: `${(i * 53 + 13) % 100}%` as any,
                opacity: 0.15 + (i % 5) * 0.07,
                width: i % 3 === 0 ? 2 : 1,
                height: i % 3 === 0 ? 2 : 1,
              },
            ]}
          />
        ))}
      </View>

      <SafeAreaView style={s.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={s.keyboardView}
        >
          <View style={s.content}>
            {/* Logo area */}
            <View style={s.logoArea}>
              <Text style={s.title}>Jugglr</Text>
              <Text style={s.subtitle}>keep all your balls in the air</Text>
            </View>

            {/* Card */}
            <View style={s.card}>
              <LinearGradient
                colors={["#12102A", "#0E0C22"]}
                style={StyleSheet.absoluteFill}
              />
              <Text style={s.cardTitle}>Sign in</Text>
              <Text style={s.cardSubtitle}>We'll send a code to your email</Text>

              <View style={s.inputWrapper}>
                <Mail size={18} color="rgba(255,255,255,0.3)" style={s.inputIcon} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  style={s.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="send"
                  onSubmitEditing={handleSendCode}
                  testID="email-input"
                />
              </View>

              {error ? <Text style={s.error}>{error}</Text> : null}

              <Pressable
                onPress={handleSendCode}
                disabled={!email.trim() || loading}
                style={({ pressed }) => [s.button, pressed && s.buttonPressed, (!email.trim() || loading) && s.buttonDisabled]}
                testID="send-code-button"
              >
                <LinearGradient
                  colors={email.trim() && !loading ? ["#7C5CFC", "#5B6EF5"] : ["#2A2840", "#2A2840"]}
                  style={s.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={[s.buttonText, (!email.trim()) && s.buttonTextDisabled]}>Send code</Text>
                      <ArrowRight size={18} color={email.trim() ? "#fff" : "rgba(255,255,255,0.3)"} />
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#06060F" },
  star: { position: "absolute", borderRadius: 50, backgroundColor: "#fff" },
  safeArea: { flex: 1 },
  keyboardView: { flex: 1 },
  content: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  logoArea: { alignItems: "center", marginBottom: 48 },
  title: {
    fontFamily: "Syne_800ExtraBold",
    fontSize: 52,
    color: "#fff",
    letterSpacing: -2,
    textShadowColor: "rgba(124, 92, 252, 0.6)",
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 24,
  },
  subtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.35)",
    letterSpacing: 0.5,
    marginTop: 4,
  },
  card: {
    borderRadius: 24,
    overflow: "hidden",
    padding: 28,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  cardTitle: {
    fontFamily: "Syne_700Bold",
    fontSize: 22,
    color: "#fff",
    marginBottom: 6,
  },
  cardSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  inputIcon: { marginRight: 10 },
  input: {
    flex: 1,
    fontFamily: "DMSans_400Regular",
    fontSize: 16,
    color: "#fff",
    paddingVertical: 15,
  },
  error: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#F87171",
    marginBottom: 12,
    marginTop: 4,
  },
  button: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 12,
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.6 },
  buttonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  buttonText: {
    fontFamily: "Syne_700Bold",
    fontSize: 16,
    color: "#fff",
  },
  buttonTextDisabled: { color: "rgba(255,255,255,0.4)" },
});
