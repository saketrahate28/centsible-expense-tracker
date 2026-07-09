import { useState } from "react";
import { View, Text, StyleSheet, TextInput, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as WebBrowser from "expo-web-browser";
import * as ExpoLinking from "expo-linking";

import { Button, t } from "@/src/components/ui";
import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/context/AuthContext";
import { Mail, Phone, ArrowLeft } from "lucide-react-native";
import { CountryPicker, DEFAULT_COUNTRY, Country } from "@/src/components/CountryPicker";

export default function SignIn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signInWithGoogleSession } = useAuth();
  const [mode, setMode] = useState<"email" | "phone">("email");
  const [email, setEmail] = useState("");
  const [phoneLocal, setPhoneLocal] = useState("");
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identifier = mode === "email" ? email : `${country.dial}${phoneLocal}`;
  const canSubmit = mode === "email"
    ? /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    : /^\d{6,13}$/.test(phoneLocal);

  const handleSubmit = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await api.requestOtp(identifier);
      router.push({ pathname: "/otp", params: { identifier, devOtp: res.devOTP || "" } });
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setLoading(true);
    try {
      const redirectUrl =
        Platform.OS === "web"
          ? (typeof window !== "undefined" ? window.location.origin + "/" : "")
          : ExpoLinking.createURL("auth");
      const authUrl = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;

      if (Platform.OS === "web") {
        window.location.href = authUrl;
        return;
      }
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUrl);
      if (result.type !== "success" || !result.url) {
        setLoading(false);
        return;
      }
      const url = result.url;
      const hash = url.split("#")[1] || "";
      const query = url.split("?")[1]?.split("#")[0] || "";
      const params = new URLSearchParams(hash || query);
      const sessionId = params.get("session_id");
      if (!sessionId) throw new Error("No session_id in redirect");
      await signInWithGoogleSession(sessionId);
      router.replace("/");
    } catch (e: any) {
      setError(e.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity testID="signin-back-btn" onPress={() => router.back()} style={styles.back}>
          <ArrowLeft color={theme.colors.text} size={22} />
        </TouchableOpacity>

        <Text style={[t.h1, styles.title]}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to keep your money moves sharp.</Text>

        <Button
          label="Continue with Google"
          onPress={handleGoogle}
          variant="secondary"
          loading={loading}
          testID="signin-google-btn"
          style={{ marginTop: 24 }}
        />

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        <View style={styles.tabs}>
          <TouchableOpacity
            testID="signin-email-tab"
            style={[styles.tab, mode === "email" && styles.tabActive]}
            onPress={() => setMode("email")}
          >
            <Mail color={mode === "email" ? theme.colors.primary : theme.colors.textSecondary} size={16} />
            <Text style={[styles.tabText, mode === "email" && styles.tabTextActive]}>Email</Text>
          </TouchableOpacity>
          <TouchableOpacity
            testID="signin-phone-tab"
            style={[styles.tab, mode === "phone" && styles.tabActive]}
            onPress={() => setMode("phone")}
          >
            <Phone color={mode === "phone" ? theme.colors.primary : theme.colors.textSecondary} size={16} />
            <Text style={[styles.tabText, mode === "phone" && styles.tabTextActive]}>Phone</Text>
          </TouchableOpacity>
        </View>

        {mode === "email" ? (
          <View style={styles.inputWrap}>
            <TextInput
              testID="signin-email-input"
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={theme.colors.textDisabled}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        ) : (
          <View style={[styles.inputWrap, styles.phoneRow]}>
            <CountryPicker value={country} onChange={setCountry} testID="signin-country-picker" />
            <TextInput
              testID="signin-phone-input"
              style={styles.phoneInput}
              placeholder="98765 43210"
              placeholderTextColor={theme.colors.textDisabled}
              value={phoneLocal}
              onChangeText={(v) => setPhoneLocal(v.replace(/\D/g, "").slice(0, 13))}
              keyboardType="phone-pad"
              autoCorrect={false}
            />
          </View>
        )}

        {error ? <Text testID="signin-error" style={styles.errorText}>{error}</Text> : null}

        <Button
          label="Send OTP"
          onPress={handleSubmit}
          disabled={!canSubmit}
          loading={loading}
          testID="signin-send-otp-btn"
          style={{ marginTop: 8 }}
        />

        <Text style={styles.footnote}>
          We send a 6-digit code. In dev, the code will be auto-filled.
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, gap: 12 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  title: { marginTop: 12 },
  subtitle: { color: theme.colors.textSecondary, fontSize: 15, marginTop: 4 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  divider: { flex: 1, height: 1, backgroundColor: theme.colors.borderSubtle },
  dividerText: { color: theme.colors.textDisabled, fontSize: 12, fontWeight: "600" },
  tabs: { flexDirection: "row", backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 4, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 12, borderRadius: theme.radius.sm },
  tabActive: { backgroundColor: theme.colors.primarySoft },
  tabText: { color: theme.colors.textSecondary, fontWeight: "600", fontSize: 14 },
  tabTextActive: { color: theme.colors.primary },
  inputWrap: { marginTop: 12 },
  phoneRow: { flexDirection: "row", alignItems: "stretch" },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16, paddingVertical: 16,
    color: theme.colors.text, fontSize: 16, fontWeight: "500",
  },
  phoneInput: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    borderTopRightRadius: theme.radius.md,
    borderBottomRightRadius: theme.radius.md,
    paddingHorizontal: 16, paddingVertical: 16,
    color: theme.colors.text, fontSize: 16, fontWeight: "500",
  },
  errorText: { color: theme.colors.danger, fontSize: 13, marginTop: 4 },
  footnote: { color: theme.colors.textDisabled, fontSize: 11, textAlign: "center", marginTop: 12 },
});
