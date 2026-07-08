import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, t } from "@/src/components/ui";
import { theme } from "@/src/lib/theme";
import { useAuth } from "@/src/context/AuthContext";
import { api } from "@/src/lib/api";
import { ArrowLeft } from "lucide-react-native";

export default function Otp() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { identifier, devOtp } = useLocalSearchParams<{ identifier: string; devOtp: string }>();
  const { signInWithOtp, refresh } = useAuth();

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputs = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    // Auto-fill dev OTP for smooth dev experience
    if (devOtp && typeof devOtp === "string" && devOtp.length === 6) {
      setDigits(devOtp.split(""));
    }
    const to = setTimeout(() => inputs.current[0]?.focus(), 200);
    return () => clearTimeout(to);
  }, [devOtp]);

  const handleChange = (i: number, val: string) => {
    const clean = val.replace(/\D/g, "").slice(0, 1);
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    if (clean && i < 5) inputs.current[i + 1]?.focus();
    if (!clean && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleKey = (i: number, key: string) => {
    if (key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  const handleVerify = async () => {
    setError(null);
    const otp = digits.join("");
    if (otp.length !== 6) { setError("Enter all 6 digits"); return; }
    setLoading(true);
    try {
      await signInWithOtp(String(identifier), otp);
      await refresh();
      router.replace("/");
    } catch (e: any) {
      setError(e.message || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const r = await api.requestOtp(String(identifier));
      if (r.devOTP) setDigits(r.devOTP.split(""));
    } catch (e: any) {
      setError(e.message);
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
      >
        <TouchableOpacity testID="otp-back-btn" onPress={() => router.back()} style={styles.back}>
          <ArrowLeft color={theme.colors.text} size={22} />
        </TouchableOpacity>

        <Text style={[t.h1, { marginTop: 12 }]}>Verify it&apos;s you</Text>
        <Text style={styles.subtitle}>We sent a 6-digit code to</Text>
        <Text style={styles.identifier} testID="otp-identifier">{identifier}</Text>

        <View style={styles.boxes}>
          {digits.map((d, i) => (
            <TextInput
              testID={`otp-digit-${i}`}
              key={i}
              ref={(r) => { inputs.current[i] = r; }}
              value={d}
              onChangeText={(v) => handleChange(i, v)}
              onKeyPress={({ nativeEvent }) => handleKey(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              style={[styles.box, d ? styles.boxFilled : null]}
            />
          ))}
        </View>

        {error ? <Text testID="otp-error" style={styles.errorText}>{error}</Text> : null}

        <Button label="Verify" onPress={handleVerify} loading={loading} testID="otp-verify-btn" style={{ marginTop: 12 }} />

        <TouchableOpacity onPress={handleResend} style={{ alignSelf: "center", marginTop: 20 }} testID="otp-resend-btn">
          <Text style={styles.resend}>Didn&apos;t get it? <Text style={{ color: theme.colors.primary }}>Resend</Text></Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24 },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  subtitle: { color: theme.colors.textSecondary, fontSize: 15, marginTop: 8 },
  identifier: { color: theme.colors.text, fontSize: 16, fontWeight: "600", marginTop: 2 },
  boxes: { flexDirection: "row", justifyContent: "space-between", marginTop: 28, gap: 8 },
  box: {
    flex: 1,
    height: 60,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.borderSubtle,
    color: theme.colors.text,
    textAlign: "center",
    fontSize: 22, fontWeight: "700",
  },
  boxFilled: { borderColor: theme.colors.primary, backgroundColor: "rgba(236, 72, 153, 0.08)" },
  errorText: { color: theme.colors.danger, fontSize: 13, marginTop: 12 },
  resend: { color: theme.colors.textSecondary, fontSize: 14 },
});
