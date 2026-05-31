import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Dimensions, ActivityIndicator, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { getAnalyticsData } from '../services/api';

const { width } = Dimensions.get('window');

// ─── Financial Education Terms ───────────────────────────────────────────────
const FIN_TERMS = [
    {
        term: 'SIP 📈',
        def: 'Systematic Investment Plan — invest a fixed amount every month in mutual funds. Even ₹500/mo can 10x over 15 years.',
        color: '#22d3ee',
        bg: 'rgba(34,211,238,0.08)',
    },
    {
        term: 'CIBIL Score 💳',
        def: 'Your creditworthiness score (300-900). Above 750 = easy loans at low interest. Pay EMIs on time to protect it.',
        color: '#a78bfa',
        bg: 'rgba(167,139,250,0.08)',
    },
    {
        term: 'Emergency Fund 🛡️',
        def: 'Keep 3-6 months of expenses saved in a liquid fund. This is your financial airbag before investing anything.',
        color: '#34d399',
        bg: 'rgba(52,211,153,0.08)',
    },
    {
        term: 'Compound Interest 🔁',
        def: 'Earning returns on your returns. ₹10,000 at 12% for 20 years = ₹96,000. Time is literally money.',
        color: '#fbbf24',
        bg: 'rgba(251,191,36,0.08)',
    },
    {
        term: '50/30/20 Rule 🎯',
        def: '50% on needs, 30% on wants, 20% saved/invested. The simplest personal finance rule ever.',
        color: '#f87171',
        bg: 'rgba(248,113,113,0.08)',
    },
];

// ─── Spending Heatmap (calendar-style weekly grid) ────────────────────────────
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MOCK_HEATMAP = [
    [0, 320, 0, 780, 200, 1200, 450],
    [300, 0, 550, 100, 900, 400, 0],
    [150, 620, 0, 340, 0, 780, 290],
    [0, 450, 880, 0, 340, 110, 670],
];

function getHeatColor(amount: number): string {
    if (amount === 0) return 'rgba(255,255,255,0.04)';
    if (amount < 300) return 'rgba(34,211,238,0.18)';
    if (amount < 600) return 'rgba(34,211,238,0.38)';
    if (amount < 900) return 'rgba(34,211,238,0.6)';
    return 'rgba(34,211,238,0.9)';
}

type AnalyticsData = {
    totalSpend: number;
    spendTrendPercentage: string;
    categories: Array<{ categoryName: string; amount: number; icon: string; color: string }>;
    trends: Array<{ label: string; amount: number }>;
    aiInsight: string;
};

export default function AnalyticsScreen() {
    const [timeframe, setTimeframe] = useState<'Week' | 'Month' | 'Year'>('Month');
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [termIndex, setTermIndex] = useState(0);

    const fetchData = async (showLoading = true) => {
        try {
            if (showLoading) setIsLoading(true);
            const response = await getAnalyticsData(timeframe);
            setData(response);
        } catch (error) {
            console.error('Error fetching analytics data:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(useCallback(() => { fetchData(); }, [timeframe]));
    const onRefresh = useCallback(() => { setRefreshing(true); fetchData(false); }, [timeframe]);

    if (isLoading && !data) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#22d3ee" />
                <Text style={styles.loadingText}>Crunching your numbers… 🧮</Text>
            </SafeAreaView>
        );
    }

    const trendPct = Number(data?.spendTrendPercentage ?? 0);
    const isTrendPositive = trendPct > 0;
    const topCategory = data?.categories?.[0];
    const avgDaily = data ? Math.round(data.totalSpend / 30) : 415;

    // Local AI insight
    const localInsight = topCategory
        ? `💡 ${topCategory.categoryName} is eating ${Math.round((topCategory.amount / (data?.totalSpend || 1)) * 100)}% of your budget this ${timeframe.toLowerCase()}. ${trendPct < 0 ? `🎉 You're spending ${Math.abs(trendPct)}% less than last period — keep going!` : `Try the 50/30/20 rule to cut this by ₹${Math.round(topCategory.amount * 0.1).toLocaleString('en-IN')}.`}`
        : "Add your first expense to unlock personalised AI insights!";
    const insight = data?.aiInsight || localInsight;

    const currentTerm = FIN_TERMS[termIndex % FIN_TERMS.length];

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>Insights</Text>
                    <Text style={styles.headerSub}>Your money, decoded. 🔍</Text>
                </View>
                <TouchableOpacity style={styles.iconBtn}>
                    <MaterialCommunityIcons name="calendar-month-outline" size={20} color="#22d3ee" />
                </TouchableOpacity>
            </View>

            {/* Timeframe Toggle */}
            <View style={styles.toggleRow}>
                {(['Week', 'Month', 'Year'] as const).map(t => (
                    <TouchableOpacity
                        key={t}
                        style={[styles.toggleBtn, timeframe === t && styles.toggleBtnActive]}
                        onPress={() => setTimeframe(t)}
                    >
                        <Text style={[styles.toggleText, timeframe === t && styles.toggleTextActive]}>{t}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22d3ee" />}
            >
                {/* ── Stats Row ─────────────────────────────────────────── */}
                <View style={styles.statsRow}>
                    <LinearGradient colors={['#111218', '#0d0e18']} style={styles.statCard}>
                        <Text style={styles.statLabel}>Total Spend</Text>
                        <Text style={styles.statValue}>₹{(data?.totalSpend ?? 12450).toLocaleString('en-IN')}</Text>
                        <View style={styles.statBadge}>
                            <MaterialCommunityIcons
                                name={!isTrendPositive ? 'trending-down' : 'trending-up'}
                                size={12}
                                color={!isTrendPositive ? '#34d399' : '#f87171'}
                            />
                            <Text style={[styles.statBadgeText, { color: !isTrendPositive ? '#34d399' : '#f87171' }]}>
                                {Math.abs(trendPct)}% vs last
                            </Text>
                        </View>
                    </LinearGradient>
                    <LinearGradient colors={['#111218', '#0d0e18']} style={styles.statCard}>
                        <Text style={styles.statLabel}>Avg Daily</Text>
                        <Text style={styles.statValue}>₹{avgDaily.toLocaleString('en-IN')}</Text>
                        <Text style={[styles.statBadgeText, { color: '#34d399', marginTop: 4 }]}>within budget ✅</Text>
                    </LinearGradient>
                </View>

                {/* ── Spending Heatmap ──────────────────────────────────── */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>Spending Heatmap</Text>
                        <View style={styles.heatLegend}>
                            {['Low', 'Med', 'High'].map((l, i) => (
                                <View key={l} style={styles.heatLegendItem}>
                                    <View style={[styles.heatDot, { backgroundColor: i === 0 ? 'rgba(34,211,238,0.18)' : i === 1 ? 'rgba(34,211,238,0.5)' : 'rgba(34,211,238,0.9)' }]} />
                                    <Text style={styles.heatLegendText}>{l}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                    {/* Day headers */}
                    <View style={styles.heatDayRow}>
                        {DAYS.map((d, i) => <Text key={i} style={styles.heatDayLabel}>{d}</Text>)}
                    </View>
                    {/* Grid */}
                    {MOCK_HEATMAP.map((week, wi) => (
                        <View key={wi} style={styles.heatRow}>
                            {week.map((amt, di) => (
                                <View
                                    key={di}
                                    style={[styles.heatCell, { backgroundColor: getHeatColor(amt) }]}
                                >
                                    {amt > 0 && <Text style={styles.heatAmt}>₹{Math.round(amt / 100)}h</Text>}
                                </View>
                            ))}
                        </View>
                    ))}
                    <Text style={styles.heatNote}>Darker = more spent on that day</Text>
                </View>

                {/* ── AI Insight Box ──────────────────────────────────── */}
                <LinearGradient
                    colors={['rgba(34,211,238,0.12)', 'rgba(167,139,250,0.08)', 'rgba(14,165,233,0.04)']}
                    style={styles.insightCard}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <View style={styles.insightTopRow}>
                        <View style={styles.insightIconBox}>
                            <MaterialCommunityIcons name="brain" size={20} color="#22d3ee" />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.insightTitle}>Centsible AI</Text>
                            <Text style={styles.insightTagline}>your personal finance buddy 🤖</Text>
                        </View>
                        <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>AI</Text></View>
                    </View>
                    <Text style={styles.insightText}>{insight}</Text>
                </LinearGradient>

                {/* ── Financial Term of the Day ─────────────────────────── */}
                <View style={[styles.sectionCard, { backgroundColor: currentTerm.bg, borderColor: currentTerm.color + '30' }]}>
                    <View style={styles.termHeaderRow}>
                        <MaterialCommunityIcons name="lightbulb-on-outline" size={18} color={currentTerm.color} />
                        <Text style={[styles.termLabel, { color: currentTerm.color }]}>Finance Term #{termIndex + 1}</Text>
                        <TouchableOpacity
                            onPress={() => setTermIndex((termIndex + 1) % FIN_TERMS.length)}
                            style={[styles.nextBtn, { borderColor: currentTerm.color + '50' }]}
                        >
                            <Text style={[styles.nextBtnText, { color: currentTerm.color }]}>Next →</Text>
                        </TouchableOpacity>
                    </View>
                    <Text style={styles.termTitle}>{currentTerm.term}</Text>
                    <Text style={styles.termDef}>{currentTerm.def}</Text>
                </View>

                {/* ── Categories Breakdown ─────────────────────────────── */}
                <Text style={styles.breakdownTitle}>Category Breakdown</Text>
                <View style={styles.categoriesCard}>
                    {(data?.categories ?? []).map((cat, idx) => {
                        const pct = Math.round((cat.amount / (data?.totalSpend || 1)) * 100);
                        return (
                            <View key={idx} style={styles.catRow}>
                                <View style={[styles.catEmoji, { backgroundColor: cat.color + '22' }]}>
                                    <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
                                </View>
                                <View style={styles.catInfo}>
                                    <View style={styles.catTitleRow}>
                                        <Text style={styles.catName}>{cat.categoryName}</Text>
                                        <Text style={styles.catPct}>{pct}%</Text>
                                    </View>
                                    <View style={styles.catBar}>
                                        <View style={[styles.catBarFill, { width: `${Math.min(pct, 100)}%` as any, backgroundColor: cat.color }]} />
                                    </View>
                                </View>
                                <Text style={styles.catAmount}>₹{cat.amount.toLocaleString('en-IN')}</Text>
                            </View>
                        );
                    })}
                    {(!data?.categories || data.categories.length === 0) && (
                        <Text style={{ color: '#555', textAlign: 'center', padding: 20 }}>No category data yet — add an expense! 💸</Text>
                    )}
                </View>

                {/* ── Pro Tips Row ─────────────────────────────────────── */}
                <Text style={styles.breakdownTitle}>Quick Tips 🎓</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8, gap: 12 }}>
                    {[
                        { icon: '🧾', tip: 'Track every ₹10 chai. Small leaks sink big ships.', color: '#fbbf24' },
                        { icon: '📱', tip: 'UPI makes spending invisible. Screenshot your weekly total every Sunday.', color: '#34d399' },
                        { icon: '🏦', tip: 'Keep an FD for 6 months expenses. Sleep better at night.', color: '#a78bfa' },
                        { icon: '🎯', tip: 'Set a monthly limit per category. Discipline > motivation.', color: '#22d3ee' },
                    ].map((tip, i) => (
                        <View key={i} style={[styles.tipCard, { borderColor: tip.color + '30' }]}>
                            <Text style={styles.tipIcon}>{tip.icon}</Text>
                            <Text style={styles.tipText}>{tip.tip}</Text>
                        </View>
                    ))}
                </ScrollView>

                <View style={{ height: 100 }} />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#050508' },
    loadingText: { fontFamily: 'Inter_400Regular', color: '#555', marginTop: 12, fontSize: 14 },

    // Header
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 24, paddingTop: 12, paddingBottom: 8 },
    headerTitle: { fontFamily: 'Outfit_800ExtraBold', fontSize: 34, color: '#FFF', letterSpacing: -1 },
    headerSub: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#555', marginTop: 2 },
    iconBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#111218', borderWidth: 1, borderColor: '#2A2A35', justifyContent: 'center', alignItems: 'center' },

    // Timeframe toggle
    toggleRow: { flexDirection: 'row', marginHorizontal: 24, backgroundColor: '#0E0F1A', borderRadius: 16, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: '#1E1E2A' },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 12 },
    toggleBtnActive: { backgroundColor: '#1A1B28' },
    toggleText: { fontFamily: 'Inter_500Medium', color: '#444', fontSize: 14 },
    toggleTextActive: { color: '#22d3ee', fontFamily: 'Outfit_700Bold' },

    scrollContent: { paddingHorizontal: 20 },

    // Stats
    statsRow: { flexDirection: 'row', gap: 14, marginBottom: 20 },
    statCard: { flex: 1, borderRadius: 20, padding: 18, borderWidth: 1, borderColor: '#1E1E2A' },
    statLabel: { fontFamily: 'Inter_500Medium', color: '#666', fontSize: 13, marginBottom: 8 },
    statValue: { fontFamily: 'Outfit_800ExtraBold', color: '#FFF', fontSize: 26, letterSpacing: -0.5 },
    statBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
    statBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },

    // Section cards
    sectionCard: { backgroundColor: '#0E0F1A', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1E1E2A' },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    sectionTitle: { fontFamily: 'Outfit_700Bold', color: '#FFF', fontSize: 17 },

    // Heatmap
    heatLegend: { flexDirection: 'row', gap: 10, alignItems: 'center' },
    heatLegendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    heatDot: { width: 10, height: 10, borderRadius: 3 },
    heatLegendText: { fontFamily: 'Inter_400Regular', color: '#444', fontSize: 11 },
    heatDayRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    heatDayLabel: { fontFamily: 'Inter_600SemiBold', color: '#555', fontSize: 12, width: (width - 100) / 7, textAlign: 'center' },
    heatRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    heatCell: { width: (width - 100) / 7, height: (width - 100) / 7, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    heatAmt: { fontFamily: 'Inter_600SemiBold', color: '#1a2a3a', fontSize: 7 },
    heatNote: { fontFamily: 'Inter_400Regular', color: '#444', fontSize: 11, marginTop: 10 },

    // AI Insight
    insightCard: { borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: 'rgba(34,211,238,0.15)' },
    insightTopRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
    insightIconBox: { width: 42, height: 42, borderRadius: 14, backgroundColor: 'rgba(34,211,238,0.12)', justifyContent: 'center', alignItems: 'center' },
    insightTitle: { fontFamily: 'Outfit_700Bold', fontSize: 16, color: '#22d3ee' },
    insightTagline: { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#555' },
    insightText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: '#C8C8D8', lineHeight: 24 },
    aiBadge: { backgroundColor: 'rgba(34,211,238,0.12)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: 'rgba(34,211,238,0.3)' },
    aiBadgeText: { fontFamily: 'Outfit_700Bold', fontSize: 11, color: '#22d3ee', letterSpacing: 1 },

    // Finance term
    termHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
    termLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 12, flex: 1 },
    nextBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4 },
    nextBtnText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
    termTitle: { fontFamily: 'Outfit_800ExtraBold', fontSize: 22, color: '#FFF', marginBottom: 8 },
    termDef: { fontFamily: 'Inter_400Regular', fontSize: 14, color: '#A0A0B0', lineHeight: 22 },

    // Categories
    breakdownTitle: { fontFamily: 'Outfit_700Bold', fontSize: 20, color: '#FFF', marginBottom: 16 },
    categoriesCard: { backgroundColor: '#0E0F1A', borderRadius: 24, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#1E1E2A' },
    catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 18 },
    catEmoji: { width: 46, height: 46, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
    catInfo: { flex: 1, marginRight: 12 },
    catTitleRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
    catName: { fontFamily: 'Outfit_600SemiBold', fontSize: 15, color: '#FFF' },
    catPct: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#666' },
    catBar: { height: 5, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 4 },
    catBarFill: { height: 5, borderRadius: 4 },
    catAmount: { fontFamily: 'Outfit_700Bold', fontSize: 14, color: '#FFF' },

    // Pro Tips
    tipCard: { width: width * 0.58, backgroundColor: '#0E0F1A', borderRadius: 18, padding: 16, borderWidth: 1 },
    tipIcon: { fontSize: 28, marginBottom: 8 },
    tipText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#A0A0B0', lineHeight: 20 },
});
