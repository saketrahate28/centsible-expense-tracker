import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, TrendingUp } from "lucide-react-native";

import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { Chip, Button } from "@/src/components/ui";

const SOURCES = ["Salary", "Freelance", "Business", "Rent", "Interest", "Gift", "Other"];

export default function AddIncome() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("Salary");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSave = Number(amount) > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setError(null); setSaving(true);
    try {
      await api.createIncome({ amount: Number(amount), source, note });
      router.back();
    } catch (e: any) {
      setError(e.message || "Couldn't save");
    } finally { setSaving(false); }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity testID="income-close-btn" onPress={() => router.back()} style={styles.close}>
          <X color={theme.colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.title}>Add income</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <TrendingUp color={theme.colors.success} size={22} />
          </View>
          <Text style={styles.heroLabel}>AMOUNT RECEIVED</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              testID="income-amount-input"
              placeholder="0"
              placeholderTextColor={theme.colors.textDisabled}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, "").slice(0, 10))}
              style={styles.amountInput}
            />
          </View>
        </View>

        <Text style={styles.sectionLabel}>Source</Text>
        <View style={styles.sourceRow}>
          {SOURCES.map(s => (
            <Chip key={s} testID={`income-src-${s}`} label={s} active={source === s} onPress={() => setSource(s)} />
          ))}
        </View>

        <Text style={styles.sectionLabel}>Note (optional)</Text>
        <TextInput
          testID="income-note-input"
          placeholder="e.g. October salary"
          placeholderTextColor={theme.colors.textDisabled}
          value={note}
          onChangeText={setNote}
          style={styles.input}
        />

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <Button
          label="Save income"
          onPress={handleSave}
          loading={saving}
          disabled={!canSave}
          testID="income-save-btn"
          style={{ marginTop: 12 }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center" },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: "700" },
  hero: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 20, borderWidth: 1, borderColor: "rgba(16,185,129,0.25)" },
  heroIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(16,185,129,0.15)", alignItems: "center", justifyContent: "center", marginBottom: 12 },
  heroLabel: { color: theme.colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  amountRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 8 },
  currency: { color: theme.colors.textSecondary, fontSize: 24, fontWeight: "700", marginBottom: 8 },
  amountInput: { color: theme.colors.text, fontSize: 40, fontWeight: "800", flex: 1, padding: 0, marginLeft: 6 },
  sectionLabel: { color: theme.colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "700", textTransform: "uppercase" },
  sourceRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  input: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.md, padding: 14, color: theme.colors.text, fontSize: 14 },
  errorText: { color: theme.colors.danger, fontSize: 13 },
});
