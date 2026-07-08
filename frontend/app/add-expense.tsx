import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { X, Check, Delete } from "lucide-react-native";

import { theme, categoryColors } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { Chip, Button } from "@/src/components/ui";

const CATEGORIES = ["Food & Drinks", "Groceries", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Travel", "Other"];
const METHODS = ["UPI", "Card", "Cash", "Netbanking"];

export default function AddExpense() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("Food & Drinks");
  const [method, setMethod] = useState("UPI");
  const [merchant, setMerchant] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const press = (v: string) => {
    if (v === "back") setAmount(a => a.slice(0, -1));
    else if (v === ".") { if (!amount.includes(".") && amount) setAmount(a => a + "."); }
    else {
      setAmount(a => {
        if (a === "0") return v;
        // limit 8 digits
        const raw = (a + v).replace(/[^\d.]/g, "");
        return raw.length <= 10 ? raw : a;
      });
    }
  };

  const canSave = Number(amount) > 0;

  const handleSave = async () => {
    if (!canSave) return;
    setError(null); setSaving(true);
    try {
      await api.createTxn({
        amount: Number(amount),
        merchant: merchant.trim() || category,
        category,
        payment_method: method,
      });
      router.back();
    } catch (e: any) {
      setError(e.message || "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top + 8 }}>
      <View style={styles.header}>
        <TouchableOpacity testID="add-close-btn" onPress={() => router.back()} style={styles.close}>
          <X color={theme.colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.title}>Add expense</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
        <View style={styles.amountWrap}>
          <Text style={styles.currency}>₹</Text>
          <Text style={styles.amountText} testID="add-amount-display">{amount || "0"}</Text>
        </View>

        <TextInput
          testID="add-merchant-input"
          placeholder="Where? (optional, e.g. Swiggy)"
          placeholderTextColor={theme.colors.textDisabled}
          value={merchant}
          onChangeText={setMerchant}
          style={styles.merchantInput}
        />

        <Text style={styles.sectionLabel}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {CATEGORIES.map(c => (
            <Chip key={c} testID={`add-cat-${c}`} label={c} active={category === c} onPress={() => setCategory(c)} />
          ))}
        </ScrollView>

        <Text style={styles.sectionLabel}>Payment method</Text>
        <View style={styles.methodRow}>
          {METHODS.map(m => (
            <Chip key={m} testID={`add-method-${m}`} label={m} active={method === m} onPress={() => setMethod(m)} />
          ))}
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
      </ScrollView>

      {/* Numpad */}
      <View style={[styles.numpad, { paddingBottom: insets.bottom + 12 }]}>
        <NumpadGrid onPress={press} />
        <Button
          label={saving ? "Saving..." : "Save expense"}
          onPress={handleSave}
          loading={saving}
          disabled={!canSave}
          testID="add-save-btn"
          style={{ marginTop: 8 }}
          icon={<Check color="#fff" size={18} />}
        />
      </View>
    </View>
  );
}

function NumpadGrid({ onPress }: { onPress: (v: string) => void }) {
  const keys = ["1","2","3","4","5","6","7","8","9",".","0","back"];
  return (
    <View style={styles.grid}>
      {keys.map(k => (
        <TouchableOpacity
          testID={`num-${k}`}
          key={k}
          style={styles.key}
          onPress={() => onPress(k)}
          activeOpacity={0.7}
        >
          {k === "back" ? <Delete color={theme.colors.text} size={20} /> : <Text style={styles.keyText}>{k}</Text>}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingBottom: 12 },
  close: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center" },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: "700" },
  amountWrap: { flexDirection: "row", justifyContent: "center", alignItems: "flex-start", marginTop: 24, gap: 4 },
  currency: { color: theme.colors.textSecondary, fontSize: 28, fontWeight: "700", marginTop: 12 },
  amountText: { color: theme.colors.text, fontSize: 64, fontWeight: "800", letterSpacing: -2 },
  merchantInput: { backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.md, padding: 14, color: theme.colors.text, fontSize: 15, marginTop: 12 },
  sectionLabel: { color: theme.colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "700", textTransform: "uppercase", marginTop: 20, marginBottom: 10 },
  chipRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
  methodRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  errorText: { color: theme.colors.danger, fontSize: 13, marginTop: 12 },

  numpad: { paddingHorizontal: 20, paddingTop: 12, backgroundColor: theme.colors.surface, borderTopWidth: 1, borderTopColor: theme.colors.borderSubtle, gap: 8 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  key: { width: "32%", flexGrow: 1, backgroundColor: theme.colors.bg, height: 52, borderRadius: theme.radius.md, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.borderSubtle },
  keyText: { color: theme.colors.text, fontSize: 22, fontWeight: "700" },
});
