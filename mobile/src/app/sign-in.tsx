import React, { useState, useRef } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import { authClient } from "@/lib/auth/auth-client";
import { useInvalidateSession } from "@/lib/auth/use-session";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react-native";

export default function SignIn() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const invalidateSession = useInvalidateSession();

  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) return;
    if (mode === "signup" && !name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      if (mode === "signin") {
        const result = await authClient.signIn.email({
          email: email.trim().toLowerCase(),
          password,
        });
        if (result.error) {
          setError(result.error.message || "Invalid email or password");
        } else {
          invalidateSession();
        }
      } else {
        const result = await authClient.signUp.email({
          email: email.trim().toLowerCase(),
          password,
          name: name.trim(),
        });
        if (result.error) {
          setError(result.error.message || "Failed to create account");
        } else {
          invalidateSession();
        }
      }
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const isValid = email.trim() && password.trim() && (mode === "signin" || name.trim());

  return (
    <View style={s.container}>
      <LinearGradient colors={["#06060F", "#0A0A1A", "#0D0B1F"]} style={StyleSheet.absoluteFill} />

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
            <View style={s.logoArea}>
              <Text style={s.title}>Jugglr</Text>
              <Text style={s.subtitle}>keep all your balls in the air</Text>
            </View>

            <View style={s.card}>
              <LinearGradient colors={["#12102A", "#0E0C22"]} style={StyleSheet.absoluteFill} />

              {/* Mode toggle */}
              <View style={s.toggle}>
                <Pressable
                  onPress={() => { setMode("signin"); setError(null); }}
                  style={[s.toggleBtn, mode === "signin" && s.toggleBtnActive]}
                >
                  <Text style={[s.toggleText, mode === "signin" && s.toggleTextActive]}>Sign in</Text>
                </Pressable>
                <Pressable
                  onPress={() => { setMode("signup"); setError(null); }}
                  style={[s.toggleBtn, mode === "signup" && s.toggleBtnActive]}
                >
                  <Text style={[s.toggleText, mode === "signup" && s.toggleTextActive]}>Create account</Text>
                </Pressable>
              </View>

              {mode === "signup" && (
                <View style={s.inputWrapper}>
                  <User size={18} color="rgba(255,255,255,0.3)" style={s.inputIcon} />
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Your name"
                    placeholderTextColor="rgba(255,255,255,0.25)"
                    style={s.input}
                    autoCapitalize="words"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    testID="name-input"
                  />
                </View>
              )}

              <View style={s.inputWrapper}>
                <Mail size={18} color="rgba(255,255,255,0.3)" style={s.inputIcon} />
                <TextInput
                  ref={emailRef}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="your@email.com"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  style={s.input}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  returnKeyType="next"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                  testID="email-input"
                />
              </View>

              <View style={[s.inputWrapper, s.inputWrapperLast]}>
                <Lock size={18} color="rgba(255,255,255,0.3)" style={s.inputIcon} />
                <TextInput
                  ref={passwordRef}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Password"
                  placeholderTextColor="rgba(255,255,255,0.25)"
                  style={s.input}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  returnKeyType="go"
                  onSubmitEditing={handleSubmit}
                  testID="password-input"
                />
                <Pressable onPress={() => setShowPassword(v => !v)} hitSlop={8}>
                  {showPassword
                    ? <EyeOff size={18} color="rgba(255,255,255,0.3)" />
                    : <Eye size={18} color="rgba(255,255,255,0.3)" />}
                </Pressable>
              </View>

              {error ? <Text style={s.error}>{error}</Text> : null}

              <Pressable
                onPress={handleSubmit}
                disabled={!isValid || loading}
                style={({ pressed }) => [s.button, pressed && s.buttonPressed, (!isValid || loading) && s.buttonDisabled]}
                testID="submit-button"
              >
                <LinearGradient
                  colors={isValid && !loading ? ["#7C5CFC", "#5B6EF5"] : ["#2A2840", "#2A2840"]}
                  style={s.buttonGradient}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Text style={[s.buttonText, !isValid && s.buttonTextDisabled]}>
                        {mode === "signin" ? "Sign in" : "Create account"}
                      </Text>
                      <ArrowRight size={18} color={isValid ? "#fff" : "rgba(255,255,255,0.3)"} />
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
  toggle: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 9,
  },
  toggleBtnActive: {
    backgroundColor: "rgba(124,92,252,0.3)",
  },
  toggleText: {
    fontFamily: "DMSans_500Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
  },
  toggleTextActive: {
    color: "#fff",
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
  inputWrapperLast: { marginBottom: 0 },
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
    marginTop: 12,
    marginBottom: 4,
  },
  button: {
    borderRadius: 14,
    overflow: "hidden",
    marginTop: 16,
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
