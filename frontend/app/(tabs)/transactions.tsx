import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, RefreshControl, Alert, ScrollView, Linking, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Search, Filter, Trash2, Pencil, Download, X } from "lucide-react-native";

import { theme, categoryColors } from "@/src/lib/theme";
import { api, Transaction, getToken } from "@/src/lib/api";
import { Chip, EmptyState, Button } from "@/src/components/ui";

const CATEGORIES = ["All", "Food & Drinks", "Groceries", "Transport", "Shopping", "Bills", "Entertainment", "Health", "Travel", "Other"];

export default function TransactionsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<Transaction[]>([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [editTarget, setEditTarget] = useState<Transaction | null>(null);
  const [editAmount, setEditAmount] = useState("");
  const [editMerchant, setEditMerchant] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.listTxns({ q: q || undefined, category: cat === "All" ? undefined : cat, limit: 200 });
      setItems(r.items || []);
      setTotal(r.total || 0);
    } catch (e) {
      console.log("txns load error", e);
    }
  }, [q, cat]);

  useEffect(() => {
    const to = setTimeout(load, 250);
    return () => clearTimeout(to);
  }, [load]);

  const onRefresh = async () => { setRefreshing(true); await load(); setRefreshing(false); };

  const handleDelete = (tr: Transaction) => {
    if (Platform.OS === "web") {
      // eslint-disable-next-line no-alert
      if (!window.confirm(`Delete "${tr.merchant || "transaction"}"?`)) return;
      api.deleteTxn(tr.id).then(load).catch(() => {});
    } else {
      Alert.alert("Delete transaction?", tr.merchant || "This entry will be gone forever.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: async () => { await api.deleteTxn(tr.id); load(); } },
      ]);
    }
  };

  const openEdit = (tr: Transaction) => {
    setEditTarget(tr);
    setEditAmount(String(tr.amount));
    setEditMerchant(tr.merchant || "");
    setEditCategory(tr.category);
  };
  const handleSaveEdit = async () => {
    if (!editTarget) return;
    const amt = Number(editAmount);
    if (!amt || amt <= 0) return;
    await api.updateTxn(editTarget.id, {
      amount: amt,
      merchant: editMerchant,
      category: editCategory,
    });
    setEditTarget(null);
    load();
  };

  const handleExport = async () => {
    setDownloading(true);
    try {
      const token = await getToken();
      const url = api.exportUrl();
      if (Platform.OS === "web") {
        // Download via fetch to include auth header
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        const blob = await res.blob();
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "centsible-transactions.csv";
        a.click();
      } else {
        Linking.openURL(`${url}?token=${token}`).catch(() => {});
      }
    } finally { setDownloading(false); }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      {/* Sticky header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Transactions</Text>
          <TouchableOpacity testID="txn-export-btn" onPress={handleExport} style={styles.exportBtn} disabled={downloading}>
            <Download color={theme.colors.textSecondary} size={16} />
            <Text style={styles.exportText}>Export</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.searchWrap}>
          <Search color={theme.colors.textSecondary} size={16} />
          <TextInput
            testID="txn-search-input"
            style={styles.searchInput}
            placeholder="Search merchant or note..."
            placeholderTextColor={theme.colors.textDisabled}
            value={q}
            onChangeText={setQ}
          />
          {q ? (
            <TouchableOpacity testID="txn-search-clear" onPress={() => setQ("")}>
              <X color={theme.colors.textSecondary} size={16} />
            </TouchableOpacity>
          ) : null}
        </View>

        <ScrollView
          testID="txn-category-scroller"
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              testID={`txn-cat-${c}`}
              label={c}
              active={cat === c}
              onPress={() => setCat(c)}
            />
          ))}
        </ScrollView>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{total} {total === 1 ? "transaction" : "transactions"}</Text>
        </View>
      </View>

      <FlatList
        testID="txn-list"
        data={items}
        keyExtractor={(x) => x.id}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 80, gap: 8 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
        ListEmptyComponent={<EmptyState title="Nothing here yet" subtitle="Try changing filters or add a new expense." testID="txn-empty" />}
        renderItem={({ item }) => (
          <TxnRow tr={item} onEdit={() => openEdit(item)} onDelete={() => handleDelete(item)} />
        )}
      />

      {/* Edit modal */}
      <Modal transparent animationType="slide" visible={!!editTarget} onRequestClose={() => setEditTarget(null)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setEditTarget(null)}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onStartShouldSetResponder={() => true}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Edit transaction</Text>
            <Text style={styles.inputLabel}>Amount</Text>
            <TextInput
              testID="edit-amount-input"
              value={editAmount}
              onChangeText={(v) => setEditAmount(v.replace(/[^\d.]/g, ""))}
              keyboardType="decimal-pad"
              style={styles.input}
            />
            <Text style={styles.inputLabel}>Merchant</Text>
            <TextInput
              testID="edit-merchant-input"
              value={editMerchant}
              onChangeText={setEditMerchant}
              style={styles.input}
            />
            <Text style={styles.inputLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {CATEGORIES.slice(1).map((c) => (
                <Chip
                  key={c}
                  testID={`edit-cat-${c}`}
                  label={c}
                  active={editCategory === c}
                  onPress={() => setEditCategory(c)}
                />
              ))}
            </ScrollView>
            <Button label="Save changes" onPress={handleSaveEdit} testID="edit-save-btn" style={{ marginTop: 20 }} />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function TxnRow({ tr, onEdit, onDelete }: { tr: Transaction; onEdit: () => void; onDelete: () => void }) {
  const color = categoryColors[tr.category] || theme.colors.textSecondary;
  const d = new Date(tr.date);
  return (
    <View style={styles.row} testID={`txn-row-${tr.id}`}>
      <View style={[styles.rowIcon, { backgroundColor: `${color}22` }]}>
        <Text style={[styles.rowIconText, { color }]}>{(tr.merchant || "?").slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowMerchant} numberOfLines={1}>{tr.merchant || "Merchant"}</Text>
        <Text style={[styles.rowMeta, { color }]}>{tr.category} · {d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</Text>
      </View>
      <Text style={styles.rowAmount}>−₹{tr.amount.toLocaleString("en-IN")}</Text>
      <View style={styles.rowActions}>
        <TouchableOpacity testID={`txn-edit-${tr.id}`} onPress={onEdit} style={styles.rowBtn}>
          <Pencil color={theme.colors.textSecondary} size={14} />
        </TouchableOpacity>
        <TouchableOpacity testID={`txn-delete-${tr.id}`} onPress={onDelete} style={styles.rowBtn}>
          <Trash2 color={theme.colors.danger} size={14} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 16, paddingBottom: 12, backgroundColor: theme.colors.bg, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle },
  headerTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { color: theme.colors.text, fontSize: 24, fontWeight: "800" },
  exportBtn: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.colors.surface, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  exportText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: "600" },
  searchWrap: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, paddingHorizontal: 14, paddingVertical: 4, marginTop: 12, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  searchInput: { flex: 1, color: theme.colors.text, fontSize: 14, paddingVertical: 12 },
  chipRow: { flexDirection: "row", gap: 8, paddingHorizontal: 0, paddingVertical: 10 },
  metaRow: { marginTop: 4 },
  metaText: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: "600" },

  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 12, backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  rowIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  rowIconText: { fontSize: 16, fontWeight: "800" },
  rowMerchant: { color: theme.colors.text, fontSize: 14, fontWeight: "600" },
  rowMeta: { fontSize: 11, marginTop: 2, fontWeight: "500" },
  rowAmount: { color: theme.colors.text, fontSize: 14, fontWeight: "700" },
  rowActions: { flexDirection: "row", gap: 4 },
  rowBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  sheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  sheetHandle: { width: 44, height: 4, borderRadius: 2, backgroundColor: theme.colors.borderStrong, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { color: theme.colors.text, fontSize: 18, fontWeight: "700", marginBottom: 12 },
  inputLabel: { color: theme.colors.textSecondary, fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 12, marginBottom: 6 },
  input: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.borderSubtle, borderRadius: theme.radius.md, paddingHorizontal: 14, paddingVertical: 12, color: theme.colors.text, fontSize: 16, fontWeight: "600" },
});
