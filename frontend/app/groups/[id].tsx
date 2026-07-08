import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Modal, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Plus, User, Trash2 } from "lucide-react-native";

import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { Button, EmptyState, Chip } from "@/src/components/ui";

export default function GroupDetail() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [group, setGroup] = useState<any>(null);
  const [modal, setModal] = useState(false);
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const r = await api.getGroup(String(id));
      setGroup(r.group);
      if (!paidBy && r.group.members?.length) setPaidBy(r.group.members[0]);
    } catch {}
  }, [id, paidBy]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0 || !desc.trim() || !paidBy) return;
    setSaving(true);
    try {
      await api.addGroupExpense(String(id), {
        amount: amt, description: desc.trim(), paid_by: paidBy,
        split_between: group.members,
      });
      setModal(false); setAmount(""); setDesc("");
      load();
    } finally { setSaving(false); }
  };

  const handleDelete = () => {
    const doDelete = async () => {
      await api.deleteGroup(String(id));
      router.back();
    };
    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (window.confirm("Delete this group?")) doDelete();
    } else {
      Alert.alert("Delete group?", "This can't be undone.", [
        { text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };

  if (!group) return <View style={{ flex: 1, backgroundColor: theme.colors.bg, paddingTop: insets.top + 60 }} />;

  // Compute split summary
  const perMember: Record<string, number> = {};
  (group.members || []).forEach((m: string) => { perMember[m] = 0; });
  (group.expenses || []).forEach((e: any) => {
    const sb = e.split_between?.length ? e.split_between : group.members;
    const share = e.amount / (sb.length || 1);
    sb.forEach((m: string) => { perMember[m] = (perMember[m] || 0) + share; });
    perMember[e.paid_by] = (perMember[e.paid_by] || 0) - e.amount;
  });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity testID="gdet-back-btn" onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft color={theme.colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{group.name}</Text>
        <TouchableOpacity testID="gdet-delete-btn" onPress={handleDelete} style={styles.iconBtn}>
          <Trash2 color={theme.colors.danger} size={18} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 80 }}>
        {/* Total */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>TOTAL SPENT</Text>
          <Text style={styles.totalAmount}>₹{Math.round(group.total_spent || 0).toLocaleString("en-IN")}</Text>
          <Text style={styles.totalSub}>{group.members.length} members · {group.expense_count} expenses</Text>
        </View>

        {/* Members balances */}
        <View>
          <Text style={styles.sectionTitle}>Balances</Text>
          {Object.entries(perMember).map(([m, bal]) => {
            const owed = bal > 0.01;
            const paid = bal < -0.01;
            return (
              <View key={m} style={styles.memberRow} testID={`gdet-bal-${m}`}>
                <View style={styles.memberIcon}><User color={theme.colors.primary} size={16} /></View>
                <Text style={styles.memberName}>{m}</Text>
                <Text style={[styles.memberBal, owed ? { color: theme.colors.danger } : paid ? { color: theme.colors.success } : { color: theme.colors.textSecondary }]}>
                  {owed ? `Owes ₹${bal.toFixed(0)}` : paid ? `Gets ₹${Math.abs(bal).toFixed(0)}` : "Settled"}
                </Text>
              </View>
            );
          })}
        </View>

        {/* Expenses */}
        <View>
          <Text style={styles.sectionTitle}>Expenses</Text>
          {(!group.expenses || group.expenses.length === 0) ? (
            <EmptyState title="No expenses yet" subtitle="Tap + to log the first one." />
          ) : (
            group.expenses.slice().reverse().map((e: any) => (
              <View key={e.expense_id} style={styles.expenseRow} testID={`gdet-exp-${e.expense_id}`}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.expenseDesc}>{e.description}</Text>
                  <Text style={styles.expenseMeta}>Paid by {e.paid_by} · Split {e.split_between.length} ways</Text>
                </View>
                <Text style={styles.expenseAmt}>₹{Math.round(e.amount).toLocaleString("en-IN")}</Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      <TouchableOpacity
        testID="gdet-add-btn"
        onPress={() => setModal(true)}
        style={[styles.fab, { bottom: insets.bottom + 20 }]}
        activeOpacity={0.85}
      >
        <Plus color="#fff" size={22} />
      </TouchableOpacity>

      <Modal transparent animationType="slide" visible={modal} onRequestClose={() => setModal(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setModal(false)}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Add expense</Text>
            <Text style={styles.smallLabel}>Amount</Text>
            <TextInput
              testID="gdet-amount"
              value={amount}
              onChangeText={(v) => setAmount(v.replace(/[^\d.]/g, "").slice(0, 10))}
              keyboardType="decimal-pad"
              placeholder="0"
              placeholderTextColor={theme.colors.textDisabled}
              style={styles.input}
            />
            <Text style={styles.smallLabel}>Description</Text>
            <TextInput
              testID="gdet-desc"
              value={desc}
              onChangeText={setDesc}
              placeholder="e.g. Dinner at Toast"
              placeholderTextColor={theme.colors.textDisabled}
              style={styles.input}
            />
            <Text style={styles.smallLabel}>Paid by</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {group.members.map((m: string) => (
                <Chip key={m} testID={`gdet-paid-${m}`} label={m} active={paidBy === m} onPress={() => setPaidBy(m)} />
              ))}
            </ScrollView>
            <Button label="Save expense" onPress={handleAdd} loading={saving} testID="gdet-save-btn" style={{ marginTop: 16 }} />
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: theme.colors.bg, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center" },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: "700", flex: 1, textAlign: "center", marginHorizontal: 8 },
  totalCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 20, borderWidth: 1, borderColor: theme.colors.borderSubtle, alignItems: "center" },
  totalLabel: { color: theme.colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  totalAmount: { color: theme.colors.text, fontSize: 36, fontWeight: "800", marginTop: 6, letterSpacing: -1 },
  totalSub: { color: theme.colors.textDisabled, fontSize: 12, marginTop: 4 },
  sectionTitle: { color: theme.colors.text, fontSize: 15, fontWeight: "700", marginBottom: 8 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  memberIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(6,182,212,0.15)", alignItems: "center", justifyContent: "center" },
  memberName: { color: theme.colors.text, fontSize: 14, fontWeight: "600", flex: 1 },
  memberBal: { fontSize: 13, fontWeight: "700" },
  expenseRow: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  expenseDesc: { color: theme.colors.text, fontSize: 14, fontWeight: "600" },
  expenseMeta: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 },
  expenseAmt: { color: theme.colors.text, fontSize: 14, fontWeight: "700" },

  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", shadowColor: theme.colors.primary, shadowOpacity: 0.6, shadowRadius: 20, elevation: 12 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: theme.colors.borderStrong, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  smallLabel: { color: theme.colors.textSecondary, fontSize: 11, letterSpacing: 1.2, fontWeight: "700", textTransform: "uppercase", marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.md, padding: 12, color: theme.colors.text, fontSize: 15 },
  chipRow: { flexDirection: "row", gap: 8, paddingVertical: 4 },
});
