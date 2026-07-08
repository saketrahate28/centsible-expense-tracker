import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Plus, Users } from "lucide-react-native";

import { theme } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { Card, EmptyState, Button } from "@/src/components/ui";

export default function GroupsIndex() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [groups, setGroups] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await api.listGroups();
      setGroups(r.items || []);
    } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity testID="groups-back-btn" onPress={() => router.back()} style={styles.iconBtn}>
          <ArrowLeft color={theme.colors.text} size={22} />
        </TouchableOpacity>
        <Text style={styles.title}>Shared budgets</Text>
        <TouchableOpacity testID="groups-new-btn" onPress={() => router.push("/groups/new")} style={styles.iconBtn}>
          <Plus color={theme.colors.text} size={22} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={theme.colors.primary} />}
      >
        {groups.length === 0 ? (
          <Card>
            <View style={{ alignItems: "center", padding: 24, gap: 16 }}>
              <View style={styles.emptyIcon}>
                <Users color={theme.colors.primary} size={28} />
              </View>
              <View style={{ alignItems: "center" }}>
                <Text style={styles.emptyTitle}>Split with friends</Text>
                <Text style={styles.emptySub}>Create a group for a trip, flatmates, or a night out. Track who paid what — settle up later.</Text>
              </View>
              <Button label="Create your first group" onPress={() => router.push("/groups/new")} testID="groups-cta-btn" />
            </View>
          </Card>
        ) : (
          groups.map((g) => (
            <TouchableOpacity
              key={g.id}
              testID={`group-card-${g.id}`}
              onPress={() => router.push({ pathname: "/groups/[id]", params: { id: g.id } })}
              activeOpacity={0.85}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardIcon}>
                  <Users color={theme.colors.primary} size={20} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardName}>{g.name}</Text>
                  <Text style={styles.cardMembers}>{(g.members || []).length} members · {g.expense_count} expenses</Text>
                </View>
                <Text style={styles.cardAmount}>₹{Math.round(g.total_spent || 0).toLocaleString("en-IN")}</Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, backgroundColor: theme.colors.bg, borderBottomWidth: 1, borderBottomColor: theme.colors.borderSubtle },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: theme.colors.surface, alignItems: "center", justifyContent: "center" },
  title: { color: theme.colors.text, fontSize: 17, fontWeight: "700" },

  emptyIcon: { width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(6,182,212,0.15)", alignItems: "center", justifyContent: "center" },
  emptyTitle: { color: theme.colors.text, fontSize: 17, fontWeight: "700", marginBottom: 6 },
  emptySub: { color: theme.colors.textSecondary, fontSize: 13, textAlign: "center", lineHeight: 19 },

  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: 16, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(6,182,212,0.15)", alignItems: "center", justifyContent: "center" },
  cardName: { color: theme.colors.text, fontSize: 15, fontWeight: "700" },
  cardMembers: { color: theme.colors.textSecondary, fontSize: 12, marginTop: 2 },
  cardAmount: { color: theme.colors.text, fontSize: 15, fontWeight: "700" },
});
