import { useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView, KeyboardAvoidingView, Platform, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, t } from "@/src/components/ui";
import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { useAuth } from "@/src/context/AuthContext";
import { ArrowLeft, Check } from "lucide-react-native";

const STEPS = ["Your name", "Your age", "Bank accounts"] as const;

export default function Onboarding() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { refresh } = useAuth();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [bankCount, setBankCount] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canNext =
    step === 0 ? name.trim().length >= 2 :
    step === 1 ? /^\d{1,2}$/.test(age) && Number(age) >= 13 && Number(age) <= 99 :
    bankCount >= 1;

  const handleNext = async () => {
    setError(null);
    if (step < 2) { setStep(step + 1); return; }
    setLoading(true);
    try {
      await api.onboarding({ name: name.trim(), age: Number(age), bank_count: bankCount });
      await refresh();
      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          testID="onboarding-back-btn"
          onPress={() => (step > 0 ? setStep(step - 1) : router.back())}
          style={styles.back}
        >
          <ArrowLeft color={theme.colors.text} size={22} />
        </TouchableOpacity>

        <View style={styles.progress}>
          {STEPS.map((_, i) => (
            <View key={i} style={[styles.progressDot, i <= step && styles.progressDotActive]} />
          ))}
        </View>

        <Text style={styles.stepLabel}>Step {step + 1} of {STEPS.length}</Text>
        <Text style={[t.h1, { marginTop: 8 }]}>{STEPS[step]}</Text>

        {step === 0 && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.hint}>What should we call you?</Text>
            <TextInput
              testID="onb-name-input"
              style={styles.input}
              placeholder="e.g. Saket"
              placeholderTextColor={theme.colors.textDisabled}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>
        )}

        {step === 1 && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.hint}>We personalize tips to your life stage.</Text>
            <TextInput
              testID="onb-age-input"
              style={styles.input}
              placeholder="25"
              placeholderTextColor={theme.colors.textDisabled}
              value={age}
              onChangeText={(v) => setAge(v.replace(/\D/g, "").slice(0, 2))}
              keyboardType="number-pad"
            />
          </View>
        )}

        {step === 2 && (
          <View style={{ marginTop: 24 }}>
            <Text style={styles.hint}>How many bank accounts do you actively use?</Text>
            <View style={styles.bankGrid}>
              {[1, 2, 3, 4, 5].map((n) => (
                <TouchableOpacity
                  testID={`onb-bank-${n}`}
                  key={n}
                  style={[styles.bankOpt, bankCount === n && styles.bankOptActive]}
                  onPress={() => setBankCount(n)}
                >
                  <Text style={[styles.bankOptText, bankCount === n && styles.bankOptTextActive]}>{n}{n === 5 ? "+" : ""}</Text>
                  {bankCount === n ? <Check size={14} color={theme.colors.primary} /> : null}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {error ? <Text testID="onb-error" style={styles.errorText}>{error}</Text> : null}

        <View style={{ flex: 1 }} />

        <Button
          label={step === 2 ? "Finish setup" : "Continue"}
          onPress={handleNext}
          disabled={!canNext}
          loading={loading}
          testID="onb-continue-btn"
          style={{ marginTop: 32 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, minHeight: "100%" },
  back: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center" },
  progress: { flexDirection: "row", gap: 6, marginTop: 20 },
  progressDot: { flex: 1, height: 4, borderRadius: 2, backgroundColor: theme.colors.surfaceElevated },
  progressDotActive: { backgroundColor: theme.colors.primary },
  stepLabel: { color: theme.colors.textDisabled, fontSize: 12, letterSpacing: 1.5, fontWeight: "700", textTransform: "uppercase", marginTop: 20 },
  hint: { color: theme.colors.textSecondary, fontSize: 14, marginBottom: 12 },
  input: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.borderSubtle,
    borderRadius: theme.radius.md,
    paddingHorizontal: 16, paddingVertical: 16,
    color: theme.colors.text, fontSize: 18, fontWeight: "600",
  },
  bankGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  bankOpt: {
    flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: 6,
    minWidth: 80, paddingVertical: 16, paddingHorizontal: 20,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.borderSubtle,
  },
  bankOptActive: { borderColor: theme.colors.primary, backgroundColor: "rgba(236,72,153,0.1)" },
  bankOptText: { color: theme.colors.text, fontSize: 18, fontWeight: "700" },
  bankOptTextActive: { color: theme.colors.primary },
  errorText: { color: theme.colors.danger, fontSize: 13, marginTop: 12 },
});
