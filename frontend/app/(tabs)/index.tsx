import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Modal, TextInput } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Plus, Sparkles, ChevronDown, TrendingUp, Users, Settings2 } from "lucide-react-native";

import { theme, categoryColors } from "@/src/lib/theme";
import { api, Transaction } from "@/src/lib/api";
import { useAuth } from "@/src/context/AuthContext";
import { Card, t, SectionTitle, EmptyState, Chip } from "@/src/components/ui";

const CATEGORIES = [
  "Food & Drinks", "Groceries", "Transport", "Shopping", "Bills",
  "Entertainment", "Health", "Travel", "Other",
];

export default function Dashboard() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [data, setData] = useState<any>(null);
  const [insight, setInsight] = useState<string>("");
  const [accounts, setAccounts] = useState<any[]>([]);
  const [account, setAccount] = useState<string>("all");
  const [accountPicker, setAccountPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [categoryPicker, setCategoryPicker] = useState<Transaction | null>(null);
  const [budgetModal, setBudgetModal] = useState(false);
  const [budgetInput, setBudgetInput] = useState<string>("");

  const load = useCallback(async () => {
    try {
      const [d, i, a] = await Promise.all([
        api.dashboard(account),
        api.aiInsight().catch(() => ({ insight: "" })),
        api.accounts().catch(() => ({ accounts: [] })),
      ]);
      setData(d);
      setInsight(i.insight);
      setAccounts(a.accounts || []);
    } catch (e) {
      console.log("dashboard load error", e);
    }
  }, [account]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const handleUpdateCategory = async (id: string, category: string) => {
    try {
      await api.updateCategory(id, category);
      setCategoryPicker(null);
      load();
    } catch {}
  };

  const handleSaveBudget = async () => {
    const n = Number(budgetInput);
    if (!n || n < 100) return;
    try {
      await api.setBudget(n);
      setBudgetModal(false);
      setBudgetInput("");
      load();
    } catch {}
  };

  const monthly = data?.monthly_spend ?? 0;
  const limit = data?.budget_limit ?? 25000;
  const percent = Math.min(100, (monthly / limit) * 100);
  const remaining = Math.max(0, limit - monthly);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <ScrollView
        testID="dashboard-scroll"
        contentContainerStyle={[styles.container, { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>Hey, {user?.name?.split(" ")[0] || "friend"} 👋</Text>
            <Text style={styles.sub}>Let&apos;s see where money went.</Text>
          </View>
          <TouchableOpacity
            testID="dashboard-account-switcher"
            onPress={() => setAccountPicker(true)}
            style={styles.accountPill}
          >
            <Text style={styles.accountPillText}>
              {accounts.find(a => a.id === account)?.name?.split(" ")[0] || "All"}
            </Text>
            <ChevronDown color={theme.colors.textSecondary} size={14} />
          </TouchableOpacity>
        </View>

        {/* Hero spending card */}
        <View style={styles.heroCard} testID="dashboard-hero-card">
          <LinearGradient
            colors={["rgba(236,72,153,0.15)", "rgba(139,92,246,0.05)"]}
            style={StyleSheet.absoluteFill}
          />
          <Text style={styles.heroLabel}>MONTHLY SPEND</Text>
          <View style={styles.heroAmountRow}>
            <Text style={styles.heroCurrency}>₹</Text>
            <Text style={styles.heroAmount} testID="dashboard-monthly-amount">{monthly.toLocaleString("en-IN")}</Text>
          </View>
          <Text style={styles.heroLimit}>of ₹{limit.toLocaleString("en-IN")} budget · ₹{remaining.toLocaleString("en-IN")} left</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percent}%`, backgroundColor: percent > 90 ? theme.colors.danger : percent > 70 ? theme.colors.warning : theme.colors.primary }]} />
          </View>

          <TouchableOpacity
            testID="dashboard-set-budget-btn"
            style={styles.heroBudgetBtn}
            onPress={() => { setBudgetInput(String(limit)); setBudgetModal(true); }}
          >
            <Settings2 color={theme.colors.textSecondary} size={14} />
            <Text style={styles.heroBudgetText}>Set budget</Text>
          </TouchableOpacity>
        </View>

        {/* Quick actions */}
        <View style={styles.quickRow}>
          <QuickAction
            testID="quick-add-income"
            icon={<TrendingUp color={theme.colors.success} size={20} />}
            label="Add income"
            onPress={() => router.push("/add-income")}
          />
          <QuickAction
            testID="quick-groups"
            icon={<Users color={theme.colors.ai} size={20} />}
            label="Groups"
            onPress={() => router.push("/groups")}
          />
        </View>

        {/* AI Insight */}
        <Card style={styles.aiCard} testID="dashboard-ai-insight">
          <View style={styles.aiHeader}>
            <View style={styles.aiIconWrap}>
              <Sparkles color={theme.colors.ai} size={16} />
            </View>
            <Text style={styles.aiLabel}>CENT AI · Insight</Text>
          </View>
          <Text style={styles.aiText}>{insight || "Add a few transactions to see personalized tips."}</Text>
          <TouchableOpacity testID="ai-open-chat-btn" onPress={() => router.push("/(tabs)/chat")}>
            <Text style={styles.aiCta}>Ask Cent anything →</Text>
          </TouchableOpacity>
        </Card>

        {/* Recent transactions */}
        <View style={{ marginTop: 24 }}>
          <SectionTitle
            right={<TouchableOpacity onPress={() => router.push("/(tabs)/transactions")} testID="dashboard-see-all-btn"><Text style={styles.linkText}>See all</Text></TouchableOpacity>}
          >
            Recent
          </SectionTitle>
          {(!data?.recent || data.recent.length === 0) ? (
            <Card>
              <EmptyState title="No transactions yet" subtitle="Tap + to add your first expense." />
            </Card>
          ) : (
            <View style={{ gap: 8 }}>
              {data.recent.map((tr: Transaction) => (
                <TxnRow key={tr.id} txn={tr} onCategoryPress={() => setCategoryPicker(tr)} />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Floating add button */}
      <TouchableOpacity
        testID="fab-add-expense"
        onPress={() => router.push("/add-expense")}
        style={[styles.fab, { bottom: insets.bottom + 76 }]}
        activeOpacity={0.85}
      >
        <Plus color="#fff" size={24} strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Account picker modal */}
      <Modal transparent animationType="slide" visible={accountPicker} onRequestClose={() => setAccountPicker(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setAccountPicker(false)}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Choose account</Text>
            {accounts.map((a) => (
              <TouchableOpacity
                testID={`account-opt-${a.id}`}
                key={a.id}
                style={[styles.sheetRow, account === a.id && styles.sheetRowActive]}
                onPress={() => { setAccount(a.id); setAccountPicker(false); }}
              >
                <Text style={styles.sheetRowText}>{a.name}</Text>
                {a.last4 ? <Text style={styles.sheetRowSub}>•• {a.last4}</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Category picker modal */}
      <Modal transparent animationType="slide" visible={!!categoryPicker} onRequestClose={() => setCategoryPicker(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setCategoryPicker(null)}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Change category</Text>
            <Text style={styles.sheetSub}>{categoryPicker?.merchant || "Transaction"}</Text>
            <View style={styles.catGrid}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  testID={`cat-opt-${c}`}
                  key={c}
                  onPress={() => categoryPicker && handleUpdateCategory(categoryPicker.id, c)}
                  style={[styles.catOpt, categoryPicker?.category === c && styles.catOptActive]}
                >
                  <View style={[styles.catDot, { backgroundColor: categoryColors[c] || theme.colors.textSecondary }]} />
                  <Text style={[styles.catOptText, categoryPicker?.category === c && { color: theme.colors.text }]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Budget modal */}
      <Modal transparent animationType="slide" visible={budgetModal} onRequestClose={() => setBudgetModal(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setBudgetModal(false)}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Monthly budget</Text>
            <Text style={styles.sheetSub}>Set your comfort limit. We&apos;ll nudge you when close.</Text>
            <View style={styles.budgetInputWrap}>
              <Text style={styles.budgetCurrency}>₹</Text>
              <BudgetInput value={budgetInput} onChange={setBudgetInput} />
            </View>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              {[15000, 25000, 50000, 100000].map(v => (
                <Chip
                  testID={`budget-preset-${v}`}
                  key={v}
                  label={`₹${(v / 1000)}k`}
                  active={Number(budgetInput) === v}
                  onPress={() => setBudgetInput(String(v))}
                />
              ))}
            </View>
            <TouchableOpacity
              testID="budget-save-btn"
              onPress={handleSaveBudget}
              style={[styles.sheetPrimary, { marginTop: 20 }]}
            >
              <Text style={styles.sheetPrimaryText}>Save budget</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function BudgetInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <View style={styles.budgetInputInner}>
      <TextInput
        testID="budget-amount-input"
        value={value}
        onChangeText={(v: string) => onChange(v.replace(/\D/g, "").slice(0, 8))}
        keyboardType="number-pad"
        placeholder="25000"
        placeholderTextColor={theme.colors.textDisabled}
        style={styles.budgetInputText}
      />
    </View>
  );
}

function QuickAction({ icon, label, onPress, testID }: any) {
  return (
    <TouchableOpacity testID={testID} onPress={onPress} style={styles.quickAction} activeOpacity={0.85}>
      <View style={styles.quickIconWrap}>{icon}</View>
      <Text style={styles.quickLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function TxnRow({ txn, onCategoryPress }: { txn: Transaction; onCategoryPress: () => void }) {
  const color = categoryColors[txn.category] || theme.colors.textSecondary;
  const d = new Date(txn.date);
  const label = `${d.getDate()} ${d.toLocaleString("en-IN", { month: "short" })}`;
  return (
    <View style={styles.txnRow} testID={`txn-row-${txn.id}`}>
      <View style={[styles.txnIcon, { backgroundColor: `${color}22` }]}>
        <Text style={[styles.txnIconText, { color }]}>
          {(txn.merchant || "?").slice(0, 1).toUpperCase()}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.txnMerchant} numberOfLines={1}>{txn.merchant || "Merchant"}</Text>
        <TouchableOpacity onPress={onCategoryPress} testID={`txn-category-${txn.id}`}>
          <Text style={[styles.txnCategory, { color }]}>{txn.category} · {label}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.txnAmount}>−₹{txn.amount.toLocaleString("en-IN")}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 20, gap: 16 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  greeting: { color: theme.colors.text, fontSize: 22, fontWeight: "700" },
  sub: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 2 },
  accountPill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.colors.surface, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  accountPillText: { color: theme.colors.text, fontSize: 13, fontWeight: "600" },

  heroCard: {
    borderRadius: theme.radius.lg,
    padding: 20,
    backgroundColor: theme.colors.surface,
    borderWidth: 1, borderColor: theme.colors.borderSubtle,
    overflow: "hidden",
  },
  heroLabel: { color: theme.colors.textSecondary, fontSize: 11, letterSpacing: 1.5, fontWeight: "700" },
  heroAmountRow: { flexDirection: "row", alignItems: "flex-end", marginTop: 8, gap: 4 },
  heroCurrency: { color: theme.colors.textSecondary, fontSize: 22, fontWeight: "700", marginBottom: 6 },
  heroAmount: { color: theme.colors.text, fontSize: 42, fontWeight: "800", letterSpacing: -1 },
  heroLimit: { color: theme.colors.textSecondary, fontSize: 13, marginTop: 4 },
  progressTrack: { height: 8, borderRadius: 4, backgroundColor: theme.colors.bg, marginTop: 16, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 4 },
  heroBudgetBtn: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 14, alignSelf: "flex-start", paddingVertical: 6 },
  heroBudgetText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: "600" },

  quickRow: { flexDirection: "row", gap: 12 },
  quickAction: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  quickIconWrap: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" },
  quickLabel: { color: theme.colors.text, fontSize: 13, fontWeight: "600" },

  aiCard: {
    marginTop: 8,
    backgroundColor: "rgba(139,92,246,0.06)",
    borderColor: "rgba(139,92,246,0.25)",
  },
  aiHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  aiIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(139,92,246,0.15)", alignItems: "center", justifyContent: "center" },
  aiLabel: { color: theme.colors.ai, fontSize: 11, fontWeight: "700", letterSpacing: 1.5 },
  aiText: { color: theme.colors.text, fontSize: 15, lineHeight: 22, marginTop: 8, fontWeight: "500" },
  aiCta: { color: theme.colors.ai, fontSize: 13, fontWeight: "700", marginTop: 12 },

  linkText: { color: theme.colors.primary, fontSize: 13, fontWeight: "600" },

  txnRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  txnIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  txnIconText: { fontSize: 16, fontWeight: "800" },
  txnMerchant: { color: theme.colors.text, fontSize: 14, fontWeight: "600" },
  txnCategory: { fontSize: 11, marginTop: 2, fontWeight: "500" },
  txnAmount: { color: theme.colors.text, fontSize: 15, fontWeight: "700" },

  fab: { position: "absolute", right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center", shadowColor: theme.colors.primary, shadowOpacity: 0.6, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 12 },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, borderTopWidth: 1, borderColor: theme.colors.borderSubtle },
  sheetHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: theme.colors.borderStrong, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "700", marginBottom: 8 },
  sheetSub: { color: theme.colors.textSecondary, fontSize: 13, marginBottom: 12 },
  sheetRow: { paddingVertical: 12, paddingHorizontal: 14, borderRadius: theme.radius.md, marginTop: 4 },
  sheetRowActive: { backgroundColor: "rgba(236,72,153,0.1)" },
  sheetRowText: { color: theme.colors.text, fontSize: 14, fontWeight: "600" },
  sheetRowSub: { color: theme.colors.textSecondary, fontSize: 11, marginTop: 2 },
  sheetPrimary: { backgroundColor: theme.colors.primary, borderRadius: 999, paddingVertical: 14, alignItems: "center" },
  sheetPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  catGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  catOpt: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 14, borderRadius: theme.radius.pill, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  catOptActive: { borderColor: theme.colors.primary, backgroundColor: "rgba(236,72,153,0.1)" },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catOptText: { color: theme.colors.textSecondary, fontSize: 13, fontWeight: "600" },

  budgetInputWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.bg, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.borderSubtle, paddingHorizontal: 16, paddingVertical: 4 },
  budgetInputInner: { flex: 1 },
  budgetCurrency: { color: theme.colors.textSecondary, fontSize: 20, fontWeight: "700" },
  budgetInputText: { color: theme.colors.text, fontSize: 22, fontWeight: "800", padding: 12 },
});
