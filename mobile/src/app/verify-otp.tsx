import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { OtpInput } from "react-native-otp-entry";
import { authClient } from "@/lib/auth/auth-client";
import { useInvalidateSession } from "@/lib/auth/use-session";
import { ChevronLeft } from "lucide-react-native";

export default function VerifyOTP() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const invalidateSession = useInvalidateSession();

  const handleVerify = async (otp: string) => {
    setLoading(true);
    setError(null);
    try {
      const result = await authClient.signIn.emailOtp({
        email: email.trim(),
        otp,
      });
      if (result.error) {
        setError(result.error.message || "Invalid code. Please try again.");
        setLoading(false);
      } else {
        await invalidateSession();
        // Stack.Protected handles navigation automatically
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
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
        <Pressable onPress={() => router.back()} style={s.backBtn}>
          <ChevronLeft size={22} color="rgba(255,255,255,0.5)" />
        </Pressable>

        <View style={s.content}>
          <View style={s.logoArea}>
            <Text style={s.title}>Jugglr</Text>
          </View>

          <View style={s.card}>
            <LinearGradient colors={["#12102A", "#0E0C22"]} style={StyleSheet.absoluteFill} />
            <Text style={s.cardTitle}>Check your email</Text>
            <Text style={s.cardSubtitle}>
              Enter the 6-digit code sent to{"\n"}
              <Text style={s.emailText}>{email}</Text>
            </Text>

            <View style={s.otpContainer}>
              {loading ? (
                <View style={s.loadingWrapper}>
                  <ActivityIndicator color="#7C5CFC" size="large" />
                  <Text style={s.loadingText}>Verifying...</Text>
                </View>
              ) : (
                <OtpInput
                  numberOfDigits={6}
                  onFilled={handleVerify}
                  type="numeric"
                  focusColor="#7C5CFC"
                  theme={{
                    containerStyle: s.otpContainerStyle,
                    inputsContainerStyle: s.otpInputsContainer,
                    pinCodeContainerStyle: s.otpPinContainer,
                    pinCodeTextStyle: s.otpPinText,
                    focusedPinCodeContainerStyle: s.otpPinFocused,
                  }}
                />
              )}
            </View>

            {error ? <Text style={s.error}>{error}</Text> : null}

            <Pressable onPress={() => router.back()} style={s.resendLink}>
              <Text style={s.resendText}>Didn't get a code? Go back and try again</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#06060F" },
  star: { position: "absolute", borderRadius: 50, backgroundColor: "#fff" },
  safeArea: { flex: 1 },
  backBtn: {
    padding: 16,
    paddingLeft: 20,
    width: 56,
  },
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
    marginBottom: 8,
  },
  cardSubtitle: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 28,
    lineHeight: 20,
  },
  emailText: {
    color: "#A78BFA",
    fontFamily: "DMSans_500Medium",
  },
  otpContainer: { marginBottom: 16 },
  loadingWrapper: { alignItems: "center", paddingVertical: 20, gap: 12 },
  loadingText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
  },
  otpContainerStyle: {},
  otpInputsContainer: { gap: 10 },
  otpPinContainer: {
    width: 46,
    height: 54,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  otpPinFocused: {
    borderColor: "#7C5CFC",
    backgroundColor: "rgba(124,92,252,0.1)",
  },
  otpPinText: {
    fontFamily: "Syne_700Bold",
    fontSize: 22,
    color: "#fff",
  },
  error: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "#F87171",
    marginBottom: 12,
    textAlign: "center",
  },
  resendLink: { marginTop: 8, alignItems: "center" },
  resendText: {
    fontFamily: "DMSans_400Regular",
    fontSize: 13,
    color: "rgba(255,255,255,0.3)",
  },
});
