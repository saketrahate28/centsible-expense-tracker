import { useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Sparkles, TrendingUp, TrendingDown, RefreshCw } from "lucide-react-native";

import { theme, categoryColors } from "@/src/lib/theme";
import { api } from "@/src/lib/api";
import { Card, Chip, t, SectionTitle, EmptyState } from "@/src/components/ui";

type Timeframe = "week" | "month" | "year";
const LABELS: Record<Timeframe, string> = { week: "Week", month: "Month", year: "Year" };

export default function AnalyticsScreen() {
  const insets = useSafeAreaInsets();
  const [timeframe, setTimeframe] = useState<Timeframe>("month");
  const [data, setData] = useState<any>(null);
  const [term, setTerm] = useState<any>(null);
  const [termLoading, setTermLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const d = await api.analytics(timeframe).catch(() => null);
    setData(d);
  }, [timeframe]);

  const loadTerm = useCallback(async () => {
    setTermLoading(true);
    try {
      const t = await api.financeTerm();
      setTerm(t);
    } finally {
      setTermLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadTerm(); }, [loadTerm]);

  const onRefresh = async () => { setRefreshing(true); await Promise.all([load(), loadTerm()]); setRefreshing(false); };

  const heatmap = data?.heatmap || [];
  const maxAmt = Math.max(1, ...heatmap.map((h: any) => h.amount));
  const totalByCat = data?.by_category || [];
  const total = data?.total || 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.colors.bg }}
      contentContainerStyle={{ padding: 16, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 80, gap: 16 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />}
    >
      <Text style={styles.title}>Analytics</Text>

      {/* Timeframe toggle */}
      <View style={styles.toggle}>
        {(["week", "month", "year"] as Timeframe[]).map((k) => (
          <TouchableOpacity
            key={k}
            testID={`timeframe-${k}`}
            style={[styles.toggleBtn, timeframe === k && styles.toggleBtnActive]}
            onPress={() => setTimeframe(k)}
          >
            <Text style={[styles.toggleText, timeframe === k && styles.toggleTextActive]}>{LABELS[k]}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stat cards */}
      <View style={styles.statRow}>
        <View style={[styles.statCard, { borderColor: "rgba(6,182,212,0.3)" }]} testID="stat-total">
          <Text style={styles.statLabel}>TOTAL SPEND</Text>
          <Text style={styles.statValue}>₹{total.toLocaleString("en-IN")}</Text>
          <Text style={styles.statSub}>{LABELS[timeframe]} so far</Text>
        </View>
        <View style={[styles.statCard, { borderColor: "rgba(139,92,246,0.3)" }]} testID="stat-avg">
          <Text style={styles.statLabel}>AVG DAILY</Text>
          <Text style={styles.statValue}>₹{Math.round(data?.avg_daily || 0).toLocaleString("en-IN")}</Text>
          <Text style={styles.statSub}>over {data?.days || 0} days</Text>
        </View>
      </View>

      {/* Heatmap */}
      <Card testID="analytics-heatmap-card">
        <SectionTitle>Spending heatmap</SectionTitle>
        {heatmap.length === 0 ? (
          <EmptyState title="Nothing to plot yet" subtitle="Add a few expenses and check back." />
        ) : (
          <View>
            <View style={styles.heatGrid}>
              {heatmap.map((h: any) => {
                const intensity = h.amount / maxAmt;
                const bg = intensity === 0
                  ? theme.colors.surfaceElevated
                  : `rgba(244,63,94,${0.15 + intensity * 0.8})`;
                return (
                  <View
                    key={h.date}
                    testID={`heat-cell-${h.date}`}
                    style={[styles.heatCell, { backgroundColor: bg }]}
                  />
                );
              })}
            </View>
            <View style={styles.heatLegend}>
              <Text style={styles.legendText}>Less</Text>
              <View style={[styles.legendDot, { backgroundColor: theme.colors.surfaceElevated }]} />
              <View style={[styles.legendDot, { backgroundColor: "rgba(244,63,94,0.35)" }]} />
              <View style={[styles.legendDot, { backgroundColor: "rgba(244,63,94,0.65)" }]} />
              <View style={[styles.legendDot, { backgroundColor: "rgba(244,63,94,0.95)" }]} />
              <Text style={styles.legendText}>More</Text>
            </View>
          </View>
        )}
      </Card>

      {/* Finance Term of the Day (AI) */}
      <View style={styles.termCard} testID="finance-term-card">
        <View style={styles.termHeader}>
          <View style={styles.aiIconWrap}>
            <Sparkles color={theme.colors.ai} size={16} />
          </View>
          <Text style={styles.termHeaderText}>CENT AI · Finance term of the day</Text>
          <TouchableOpacity testID="finance-term-refresh" onPress={loadTerm} disabled={termLoading}>
            {termLoading ? <ActivityIndicator size="small" color={theme.colors.ai} /> : <RefreshCw color={theme.colors.textSecondary} size={14} />}
          </TouchableOpacity>
        </View>
        {term ? (
          <>
            <Text style={styles.termName}>{term.term}</Text>
            <Text style={styles.termDef}>{term.definition}</Text>
            <View style={styles.termBlock}>
              <Text style={styles.termBlockLabel}>Example</Text>
              <Text style={styles.termBlockText}>{term.example}</Text>
            </View>
            <View style={[styles.termBlock, { backgroundColor: "rgba(6,182,212,0.08)", borderColor: "rgba(6,182,212,0.25)" }]}>
              <Text style={[styles.termBlockLabel, { color: theme.colors.primary }]}>Personal tip</Text>
              <Text style={styles.termBlockText}>{term.tip}</Text>
            </View>
          </>
        ) : (
          <ActivityIndicator color={theme.colors.ai} style={{ marginVertical: 20 }} />
        )}
      </View>

      {/* Category breakdown */}
      <Card testID="category-breakdown-card">
        <SectionTitle>Where your money went</SectionTitle>
        {totalByCat.length === 0 ? (
          <EmptyState title="No categories yet" subtitle="Once you add expenses, they'll appear grouped here." />
        ) : (
          totalByCat.map((c: any) => (
            <View key={c.category} style={styles.catRow} testID={`breakdown-${c.category}`}>
              <View style={styles.catRowTop}>
                <View style={styles.catRowLabel}>
                  <View style={[styles.catDot, { backgroundColor: categoryColors[c.category] || theme.colors.textSecondary }]} />
                  <Text style={styles.catName}>{c.category}</Text>
                </View>
                <Text style={styles.catAmount}>₹{c.amount.toLocaleString("en-IN")}</Text>
              </View>
              <View style={styles.catBar}>
                <View style={[styles.catBarFill, { width: `${(c.amount / (total || 1)) * 100}%`, backgroundColor: categoryColors[c.category] || theme.colors.textSecondary }]} />
              </View>
            </View>
          ))
        )}
      </Card>

      {/* Quick tips */}
      <Card>
        <SectionTitle>Quick tips</SectionTitle>
        <TipRow icon={<TrendingDown color={theme.colors.success} size={18} />} text="Set a weekly food budget — small caps beat big regrets." />
        <TipRow icon={<TrendingUp color={theme.colors.primary} size={18} />} text="Automate SIP the day salary hits. Pay yourself first." />
      </Card>
    </ScrollView>
  );
}

function TipRow({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <View style={styles.tipRow}>
      <View style={styles.tipIcon}>{icon}</View>
      <Text style={styles.tipText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: theme.colors.text, fontSize: 28, fontWeight: "800", marginBottom: 4 },
  toggle: { flexDirection: "row", backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: 4, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  toggleBtn: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: theme.radius.sm },
  toggleBtnActive: { backgroundColor: "rgba(6,182,212,0.12)" },
  toggleText: { color: theme.colors.textSecondary, fontWeight: "600", fontSize: 13 },
  toggleTextActive: { color: theme.colors.primary },

  statRow: { flexDirection: "row", gap: 12 },
  statCard: { flex: 1, padding: 14, borderRadius: theme.radius.md, borderWidth: 1, backgroundColor: theme.colors.surface },
  statLabel: { color: theme.colors.textSecondary, fontSize: 10, letterSpacing: 1.5, fontWeight: "700" },
  statValue: { color: theme.colors.text, fontSize: 22, fontWeight: "800", marginTop: 6, letterSpacing: -0.5 },
  statSub: { color: theme.colors.textDisabled, fontSize: 11, marginTop: 2 },

  heatGrid: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8 },
  heatCell: { width: 14, height: 14, borderRadius: 3 },
  heatLegend: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 12, justifyContent: "flex-end" },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { color: theme.colors.textDisabled, fontSize: 10 },

  termCard: { backgroundColor: "rgba(139,92,246,0.06)", borderColor: "rgba(139,92,246,0.25)", borderWidth: 1, borderRadius: theme.radius.lg, padding: 18 },
  termHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 },
  aiIconWrap: { width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(139,92,246,0.15)", alignItems: "center", justifyContent: "center" },
  termHeaderText: { color: theme.colors.ai, fontSize: 11, fontWeight: "700", letterSpacing: 1.5, flex: 1 },
  termName: { color: theme.colors.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.3 },
  termDef: { color: theme.colors.text, fontSize: 14, marginTop: 6, lineHeight: 20 },
  termBlock: { marginTop: 12, padding: 12, borderRadius: theme.radius.md, backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.borderSubtle },
  termBlockLabel: { color: theme.colors.textSecondary, fontSize: 10, letterSpacing: 1.5, fontWeight: "700", marginBottom: 4 },
  termBlockText: { color: theme.colors.text, fontSize: 13, lineHeight: 19 },

  catRow: { marginTop: 12 },
  catRowTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 6 },
  catRowLabel: { flexDirection: "row", alignItems: "center", gap: 8 },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catName: { color: theme.colors.text, fontSize: 13, fontWeight: "600" },
  catAmount: { color: theme.colors.text, fontSize: 13, fontWeight: "700" },
  catBar: { height: 6, borderRadius: 3, backgroundColor: theme.colors.bg, overflow: "hidden" },
  catBarFill: { height: "100%", borderRadius: 3 },

  tipRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  tipIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.bg, alignItems: "center", justifyContent: "center" },
  tipText: { color: theme.colors.text, fontSize: 13, flex: 1, lineHeight: 20 },
});
