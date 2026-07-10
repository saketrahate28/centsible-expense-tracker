import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, RefreshControl, ActivityIndicator, Alert, Platform, DeviceEventEmitter, ActionSheetIOS, Modal, FlatList, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { RootStackParamList } from '../../App';
import { getDashboardData, updateTransactionCategory } from '../services/api';
import { syncHistoricalSms } from '../services/smsSyncService';
import { getStoredUser, AuthUser } from '../services/authService';
import { flushSyncQueue } from '../services/syncQueueService';
import api from '../services/api';

const { width } = Dimensions.get('window');

const CATEGORIES_LIST = [
    { id: 1, name: "Transport", icon: "car-outline", color: "#60a5fa" },
    { id: 2, name: "Food & Drinks", icon: "fast-food-outline", color: "#f87171" },
    { id: 3, name: "Shopping", icon: "cart-outline", color: "#a78bfa" },
    { id: 4, name: "Groceries", icon: "cart-outline", color: "#34d399" },
    { id: 5, name: "Entertainment", icon: "movie-open-outline", color: "#fbbf24" },
    { id: 6, name: "Bills & Utilities", icon: "receipt", color: "#94a3b8" },
    { id: 7, name: "Health", icon: "heart-pulse", color: "#f43f5e" },
    { id: 8, name: "Education", icon: "school-outline", color: "#22d3ee" },
    { id: 9, name: "Investment & Finance", icon: "trending-up", color: "#a3e635" },
];

type DashboardData = {
    totalBalance: number;
    monthlySpending: number;
    monthlyLimit: number;
    pendingSyncCount?: number;
    recentTransactions: Array<{
        id: string;
        merchantName: string;
        categoryName: string;
        amount: number;
        transactionDate: string;
        paymentMethod: string;
    }>;
    user?: {
        fullName: string;
        email: string;
    } | null;
};

type Props = {
    navigation: NativeStackNavigationProp<RootStackParamList, 'Dashboard'>;
};

type Account = { id: string; name: string; bankName?: string; maskedNumber?: string; type: string; balance: number };

export default function DashboardScreen({ navigation }: Props) {
    const [activeAccount, setActiveAccount] = useState<Account | null>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [showAccountPicker, setShowAccountPicker] = useState(false);
    const [showLimitModal, setShowLimitModal] = useState(false);
    const [limitInput, setLimitInput] = useState('');
    const [data, setData] = useState<DashboardData | null>(null);
    const [user, setUser] = useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [syncProgress, setSyncProgress] = useState<string | null>(null);
    const [pendingSync, setPendingSync] = useState(0);
    const [aiInsight, setAiInsight] = useState('');
    const [selectedTxId, setSelectedTxId] = useState<string | null>(null);
    const [showCategoryPicker, setShowCategoryPicker] = useState(false);

    const handleCategoryUpdate = async (categoryId: number, categoryName: string) => {
        if (!selectedTxId) return;
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (selectedTxId.startsWith('local-')) {
                const localId = parseInt(selectedTxId.replace('local-', ''), 10);
                const { updateLocalTransactionCategory } = require('../services/databaseService');
                await updateLocalTransactionCategory(localId, categoryName);
            } else {
                await updateTransactionCategory(selectedTxId, categoryId);
            }
            setShowCategoryPicker(false);
            setSelectedTxId(null);
            fetchData(false);
        } catch (e) {
            Alert.alert("Error", "Could not update category. Please try again.");
        }
    };

    const handleSmsSync = async () => {
        if (Platform.OS !== 'android') {
            Alert.alert("Not Supported", "Auto SMS sync is only available on Android.");
            return;
        }

        setSyncProgress('Scanning SMS inbox…');
        try {
            const result = await syncHistoricalSms(365, (p) => {
                if (p.phase === 'parsing') {
                    setSyncProgress(`Processing… ${p.saved} new, ${p.skipped} skipped`);
                } else if (p.phase === 'uploading') {
                    setSyncProgress('Uploading to cloud…');
                }
            });

            await fetchData(false);

            if (result.saved > 0) {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert(
                    "✅ Sync Complete",
                    `Imported ${result.saved} new transaction(s).${result.skipped > 0 ? ` ${result.skipped} duplicate(s) skipped.` : ''}`
                );
            } else if (result.parsed > 0) {
                Alert.alert("Already Up to Date", `All ${result.parsed} matched SMS were already imported.`);
            } else {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                Alert.alert(
                    "No Transactions Found",
                    "We scanned your SMS but couldn't match bank transaction messages. Check Expo logs for [SMS] entries.",
                    [{ text: "OK" }]
                );
            }
        } catch (e) {
            console.error("SMS Sync failed:", e);
            Alert.alert("Sync Failed", "An error occurred while syncing your SMS. Check the logs.");
        } finally {
            setSyncProgress(null);
        }
    };


    const fetchData = async (showLoading = true) => {
        try {
            if (showLoading) setIsLoading(true);

            const storedUser = await getStoredUser();
            setUser(storedUser);

            // Fetch real accounts for account switcher
            try {
                const accountsRes = await api.get('/Users/me/accounts');
                const accs: Account[] = accountsRes.data;
                setAccounts(accs);
                // Keep active account if still valid, else default to first
                if (accs.length > 0) {
                    setActiveAccount(prev => {
                        const stillValid = prev && accs.find(a => a.id === (prev as Account).id);
                        return stillValid ? prev : accs[0];
                    });
                }
            } catch {
                // Non-fatal: account switcher will show default
            }

            await flushSyncQueue();
            const response = await getDashboardData();
            setData(response);
            setPendingSync(response.pendingSyncCount ?? 0);

            // Fetch AI insight from analytics
            try {
                const analyticsRes = await api.get('/Transactions/analytics?timeframe=Month');
                if (analyticsRes.data.aiInsight) setAiInsight(analyticsRes.data.aiInsight);
            } catch {
                setAiInsight('Sync your SMS messages to get personalised spending insights.');
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        } finally {
            setIsLoading(false);
            setRefreshing(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('TransactionsUpdated', () => {
            console.log('[Dashboard] TransactionsUpdated event received, fetching data...');
            fetchData(false);
        });
        return () => subscription.remove();
    }, []);

    const onRefresh = useCallback(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setRefreshing(true);
        fetchData(false);
    }, []);

    const getCategoryIcon = (name: string) => {
        const map: Record<string, string> = {
            'Food & Drinks': 'food-outline',
            'Transport': 'car-outline',
            'Entertainment': 'movie-open-outline',
            'Shopping': 'shopping-outline',
            'Groceries': 'cart-outline',
            'Health': 'heart-pulse',
            'Bills & Utilities': 'receipt',
            'Bills': 'receipt',
            'Education': 'school-outline',
            'Investment & Finance': 'trending-up',
            'Travel': 'airplane-outline',
        };
        return map[name] ?? 'cash-multiple';
    };

    // Account switcher handler
    const handleAccountSwitch = () => {
        if (accounts.length === 0) return;
        if (Platform.OS === 'ios') {
            ActionSheetIOS.showActionSheetWithOptions(
                {
                    options: [...accounts.map(a => `${a.bankName || a.name}${a.maskedNumber ? ` ····${a.maskedNumber}` : ''}`), 'Cancel'],
                    cancelButtonIndex: accounts.length,
                    title: 'Switch Account',
                },
                (idx) => {
                    if (idx < accounts.length) {
                        setActiveAccount(accounts[idx]);
                        Haptics.selectionAsync();
                    }
                }
            );
        } else {
            setShowAccountPicker(true);
        }
    };

    // Returns a perfectly circular, brand-colored icon — no PNG logos needed
    const getPaymentIcon = (method: string, category: string) => {
        const m = (method || '').toLowerCase();

        // Brand-colored circles with initials/icons — crisp, no white background ever
        if (m.includes('gpay') || m.includes('google pay')) {
            return (
                <View style={[styles.txIconContainer, { backgroundColor: '#4285F4' }]}>
                    <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 18, color: '#FFF', letterSpacing: -1 }}>G</Text>
                </View>
            );
        }
        if (m.includes('phonepe') || m.includes('phone pe')) {
            return (
                <View style={[styles.txIconContainer, { backgroundColor: '#5F259F' }]}>
                    <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 14, color: '#FFF' }}>Pe</Text>
                </View>
            );
        }
        if (m.includes('paytm')) {
            return (
                <View style={[styles.txIconContainer, { backgroundColor: '#00BAF2' }]}>
                    <Text style={{ fontFamily: 'Outfit_800ExtraBold', fontSize: 14, color: '#FFF' }}>P</Text>
                </View>
            );
        }
        if (m.includes('upi')) {
            return (
                <View style={[styles.txIconContainer, { backgroundColor: '#16a34a' }]}>
                    <Text style={{ fontFamily: 'Outfit_700Bold', fontSize: 13, color: '#FFF' }}>UPI</Text>
                </View>
            );
        }
        if (m.includes('credit') || m.includes('card') || m.includes('debit')) {
            return (
                <View style={[styles.txIconContainer, { backgroundColor: '#dc2626' }]}>
                    <MaterialCommunityIcons name="credit-card-outline" size={22} color="#FFF" />
                </View>
            );
        }
        // Default: category-colored icon
        return (
            <View style={[styles.txIconContainer, { backgroundColor: '#1E2030' }]}>
                <MaterialCommunityIcons name={getCategoryIcon(category) as any} size={22} color="#22d3ee" />
            </View>
        );
    };

    if (isLoading && !data) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#22d3ee" />
            </SafeAreaView>
        );
    }

    const spendingProgress = data ? (data.monthlySpending / data.monthlyLimit) * 100 : 0;
    const remainingBudget = data ? data.monthlyLimit - data.monthlySpending : 0;

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#22d3ee" />
                }
            >

                {/* Header with Account Switcher */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Hey, {user?.fullName?.split(' ')[0] || 'User'} 👋</Text>
                        <TouchableOpacity style={styles.accountSwitcher} onPress={handleAccountSwitch}>
                            <MaterialCommunityIcons name="bank-outline" size={13} color="#22d3ee" style={{ marginRight: 6 }} />
                            <Text style={styles.accountText} numberOfLines={1}>
                                {activeAccount
                                    ? `${(activeAccount as Account).bankName || (activeAccount as Account).name}${(activeAccount as Account).maskedNumber ? ` ····${(activeAccount as Account).maskedNumber}` : ''}`
                                    : 'All Accounts'}
                            </Text>
                            <MaterialCommunityIcons name="chevron-down" size={14} color="#22d3ee" style={{ marginLeft: 4 }} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.headerRight}>
                        <TouchableOpacity
                            style={styles.profileBtn}
                            onPress={() => navigation.navigate('MainTabs', { screen: 'ProfileTab' })}
                            accessibilityLabel="Profile"
                        >
                            <Text style={styles.profileText}>{user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Main Spending Card with Glassmorphism feel */}
                <TouchableOpacity
                    activeOpacity={0.95}
                    onPress={() => {
                        setLimitInput(data?.monthlyLimit ? String(data.monthlyLimit) : '');
                        setShowLimitModal(true);
                    }}
                >
                    <LinearGradient
                        colors={['#171923', '#0d0e14']}
                        style={styles.card}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Text style={styles.cardHeader}>Total Spent in {activeAccount ? activeAccount.bankName || activeAccount.name : 'All Accounts'}</Text>
                        <Text style={styles.amountText}>₹{data?.monthlySpending.toLocaleString('en-IN')}</Text>
                        <Text style={styles.limitText}>of ₹{data?.monthlyLimit.toLocaleString('en-IN')} monthly limit</Text>

                        <View style={styles.progressBarBg}>
                            <LinearGradient
                                colors={['#22d3ee', '#3b82f6']}
                                style={[styles.progressBarFill, { width: `${Math.min(spendingProgress, 100)}%` }]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            />
                        </View>

                        <View style={styles.cardFooter}>
                            <MaterialCommunityIcons name="lightning-bolt" size={14} color="#22d3ee" />

                            <Text style={styles.footerInfo}>₹{remainingBudget.toLocaleString('en-IN')} left • {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate()} days remaining</Text>
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                {/* Quick Actions */}
                <View style={styles.quickActionsContainer}>
                    {/* SMS Sync — Android only: SMS reading is not possible on iOS */}
                    {Platform.OS === 'android' && (
                        <TouchableOpacity style={styles.actionBox} onPress={handleSmsSync}>
                            <LinearGradient colors={['#a855f7', '#7c3aed']} style={styles.actionIconBg} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                                <MaterialCommunityIcons name="sync" size={22} color="#FFF" />
                            </LinearGradient>
                            <Text style={styles.actionText} numberOfLines={1}>
                                {syncProgress || 'Sync SMS'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity style={styles.actionBox} onPress={() => navigation.navigate('SharedBudget')}>
                        <View style={[styles.actionIconBg, { backgroundColor: '#1E1E28' }]}>
                            <MaterialCommunityIcons name="account-group-outline" size={22} color="#A0A0A0" />
                        </View>
                        <Text style={styles.actionText}>Shared</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.actionBox}
                        onPress={() => {
                            setLimitInput(data?.monthlyLimit ? String(data.monthlyLimit) : '');
                            setShowLimitModal(true);
                        }}
                    >
                        <View style={[styles.actionIconBg, { backgroundColor: '#1E1E28' }]}>
                            <MaterialCommunityIcons name="wallet-outline" size={22} color="#A0A0A0" />
                        </View>
                        <Text style={styles.actionText}>Budgets</Text>
                    </TouchableOpacity>

                    {/* Dev-only mock transaction button */}
                    {__DEV__ && (
                        <TouchableOpacity 
                            style={styles.actionBox} 
                            onPress={async () => {
                                const { addLocalTransaction } = require('../services/databaseService');
                                try {
                                    await addLocalTransaction({
                                        amount: 1250,
                                        merchant: 'SWIGGY',
                                        category: 'Food & Drinks',
                                        date: new Date().toISOString(),
                                        paymentMethod: 'HDFC Bank',
                                        isSynced: 0,
                                        rawSms: 'Spent Rs.1250.00 on HDFC Bank Card ending 1234 at SWIGGY.'
                                    });
                                    Alert.alert("Dev Mode", "Simulated Swiggy transaction added!");
                                    fetchData(false);
                                } catch (e) {
                                    console.error(e);
                                }
                            }}
                        >
                            <View style={[styles.actionIconBg, { backgroundColor: '#1E1E28' }]}>
                                <MaterialCommunityIcons name="flask-outline" size={22} color="#ff4444" />
                            </View>
                            <Text style={[styles.actionText, { color: '#ff4444' }]}>Mock</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {pendingSync > 0 && (
                    <View style={styles.pendingBadge}>
                        <MaterialCommunityIcons name="cloud-upload-outline" size={16} color="#22d3ee" />
                        <Text style={styles.pendingBadgeText}>
                            {pendingSync} expense{pendingSync === 1 ? '' : 's'} waiting to sync
                        </Text>
                    </View>
                )}

                {/* AI Insight Box */}
                <View style={styles.insightBox}>
                    <View style={styles.insightIconContainer}>
                        <MaterialCommunityIcons name="creation-outline" size={16} color="#22d3ee" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.insightTitle}>PennyWise Insight</Text>
                        <Text style={styles.insightText}>
                            {aiInsight || 'Sync your transactions to get personalised spending insights.'}
                        </Text>
                    </View>
                </View>

                {/* Recent Transactions Preview */}
                <View style={styles.transactionsHeader}>
                    <Text style={styles.sectionTitle}>Recent Spending</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('AnalyticsTab')}>
                        <Text style={styles.seeAll}>See All</Text>
                    </TouchableOpacity>
                </View>

                {data?.recentTransactions.map((t) => {
                    const isUncategorized = t.categoryName === 'Uncategorized';
                    return (
                        <TouchableOpacity
                            key={t.id}
                            style={styles.transactionRow}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setSelectedTxId(t.id);
                                setShowCategoryPicker(true);
                            }}
                        >
                            {/* Brand-colored payment icon — much cleaner than PNG logos */}
                            {getPaymentIcon(t.paymentMethod, t.categoryName)}
                            <View style={styles.txDetails}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                    <Text style={styles.txMerchant}>{t.merchantName || t.categoryName}</Text>
                                    {isUncategorized && (
                                        <View style={styles.uncategorizedBadge}>
                                            <Text style={styles.uncategorizedBadgeText}>Assign Category</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.txCategory}>
                                    {t.categoryName}{t.paymentMethod ? ` · ${t.paymentMethod}` : ''}
                                </Text>
                            </View>
                            <View style={styles.txAmountContainer}>
                                <Text style={styles.txAmount}>-₹{t.amount.toLocaleString('en-IN')}</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}


                {data?.recentTransactions.length === 0 && (
                    <View style={{ alignItems: 'center', marginTop: 20 }}>
                        <Text style={{ color: '#666', fontFamily: 'Inter_400Regular' }}>No recent expenses yet.</Text>
                    </View>
                )}

            </ScrollView>

            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    navigation.navigate('AddExpense');
                }}
                activeOpacity={0.8}
            >
                <LinearGradient
                    colors={['#22d3ee', '#0ea5e9']}
                    style={styles.fabGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <MaterialCommunityIcons name="plus" size={32} color="#080810" />
                </LinearGradient>

            </TouchableOpacity>

            {/* Account Picker Modal for Android */}
            <Modal
                visible={showAccountPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAccountPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Select Account</Text>
                            <TouchableOpacity onPress={() => setShowAccountPicker(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={accounts}
                            keyExtractor={(item) => item.id}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.accountItem,
                                        activeAccount?.id === item.id && styles.activeAccountItem
                                    ]}
                                    onPress={() => {
                                        setActiveAccount(item);
                                        setShowAccountPicker(false);
                                        Haptics.selectionAsync();
                                    }}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <View>
                                            <Text style={styles.accountItemName}>{item.bankName || item.name}</Text>
                                            {item.maskedNumber && (
                                                <Text style={styles.accountItemNumber}>•••• {item.maskedNumber}</Text>
                                            )}
                                        </View>
                                        {activeAccount?.id === item.id && (
                                            <MaterialCommunityIcons name="check" size={20} color="#22d3ee" />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    </View>
                </View>
            </Modal>

            {/* Limit Input Modal */}
            <Modal
                visible={showLimitModal}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowLimitModal(false)}
            >
                <View style={styles.promptOverlay}>
                    <View style={styles.promptContent}>
                        <Text style={styles.promptTitle}>Update Monthly Limit</Text>
                        <Text style={styles.promptSubtitle}>Set your monthly spending target limit.</Text>
                        <TextInput
                            style={styles.promptInput}
                            placeholder="e.g. 25000"
                            placeholderTextColor="#555"
                            keyboardType="number-pad"
                            value={limitInput}
                            onChangeText={setLimitInput}
                            autoFocus
                        />
                        <View style={styles.promptActions}>
                            <TouchableOpacity style={styles.promptCancelBtn} onPress={() => setShowLimitModal(false)}>
                                <Text style={styles.promptCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.promptSaveBtn} 
                                onPress={async () => {
                                    const limit = parseFloat(limitInput);
                                    if (isNaN(limit) || limit <= 0) {
                                        Alert.alert("Invalid Limit", "Please enter a valid positive number.");
                                        return;
                                    }
                                    try {
                                        await api.post('/Users/me/budget', { limit });
                                        setShowLimitModal(false);
                                        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                        Alert.alert("✅ Limit Updated", `Monthly limit set to ₹${limit.toLocaleString('en-IN')}`);
                                        fetchData(false);
                                    } catch {
                                        Alert.alert("Error", "Failed to update monthly limit.");
                                    }
                                }}
                            >
                                <Text style={styles.promptSaveText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Category Picker Modal */}
            <Modal
                visible={showCategoryPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowCategoryPicker(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Choose Category</Text>
                            <TouchableOpacity onPress={() => setShowCategoryPicker(false)}>
                                <MaterialCommunityIcons name="close" size={24} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={CATEGORIES_LIST}
                            keyExtractor={(item) => String(item.id)}
                            numColumns={2}
                            renderItem={({ item }) => (
                                <TouchableOpacity
                                    style={[
                                        styles.categoryGridItem,
                                        { borderColor: item.color + '40' }
                                    ]}
                                    onPress={() => handleCategoryUpdate(item.id, item.name)}
                                >
                                    <MaterialCommunityIcons name={item.icon as any} size={24} color={item.color} style={{ marginBottom: 8 }} />
                                    <Text style={styles.categoryGridItemText}>{item.name}</Text>
                                </TouchableOpacity>
                            )}
                            contentContainerStyle={{ paddingBottom: 30 }}
                        />
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050508',
    },
    scrollContent: {
        padding: 24,
        paddingBottom: 120, // Crucial fix for the FAB overlapping issue
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
    },
    greeting: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 26,
        color: '#FFF',
        letterSpacing: -0.5,
    },
    accountSwitcher: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        backgroundColor: '#14141c',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#2A2A35'
    },
    accountText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 13,
        color: '#22d3ee',
    },
    headerRight: {
        flexDirection: 'row',
        gap: 12,
        alignItems: 'center',
    },
    iconBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#14141c',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2A2A35'
    },
    profileBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#22d3ee',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#22d3ee',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    profileText: {
        fontFamily: 'Outfit_800ExtraBold',
        fontSize: 18,
        color: '#080810',
    },
    card: {
        borderRadius: 28,
        padding: 28,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#2A2A35',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    cardHeader: {
        fontFamily: 'Inter_500Medium',
        fontSize: 15,
        color: '#A0A0A0',
        marginBottom: 8,
    },
    amountText: {
        fontFamily: 'Outfit_800ExtraBold',
        fontSize: 44,
        color: '#FFF',
        letterSpacing: -1.2,
    },
    limitText: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: '#666',
        marginTop: 2,
        marginBottom: 28,
    },
    progressBarBg: {
        height: 8,
        backgroundColor: '#1E1E28',
        borderRadius: 4,
        marginBottom: 16,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    footerInfo: {
        fontFamily: 'Inter_500Medium',
        fontSize: 13,
        color: '#A0A0A0',
        letterSpacing: 0.2,
    },
    quickActionsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    actionBox: {
        alignItems: 'center',
        gap: 8,
        width: (width - 48) / 3.3,
    },
    actionIconBg: {
        width: 56,
        height: 56,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 13,
        color: '#A0A0A0',
    },
    pendingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 16,
        backgroundColor: 'rgba(34, 211, 238, 0.08)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(34, 211, 238, 0.2)',
    },
    pendingBadgeText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 13,
        color: '#22d3ee',
    },
    insightBox: {
        flexDirection: 'row',
        padding: 20,
        backgroundColor: '#0a101f', // Subdued cyan-tinted dark background
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(34, 211, 238, 0.15)',
        alignItems: 'flex-start',
        marginBottom: 32,
        gap: 12,
    },
    insightIconContainer: {
        marginTop: 2,
        padding: 8,
        backgroundColor: 'rgba(34, 211, 238, 0.1)',
        borderRadius: 12,
    },
    insightTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 14,
        color: '#22d3ee',
        marginBottom: 4,
    },
    insightText: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: '#A0A0A0',
        lineHeight: 20,
    },
    insightHighlight: {
        color: '#FFF',
        fontFamily: 'Inter_600SemiBold',
    },
    transactionsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 20,
        color: '#FFF',
    },
    seeAll: {
        fontFamily: 'Inter_500Medium',
        fontSize: 14,
        color: '#22d3ee',
    },
    transactionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#111218',
        padding: 16,
        borderRadius: 20,
        marginBottom: 12,
    },
    txIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,          // fully circular — half of width/height
        backgroundColor: '#1E1E28',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    txDetails: {
        flex: 1,
    },
    txMerchant: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        color: '#FFF',
        marginBottom: 4,
    },
    txCategory: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: '#888',
    },
    txAmountContainer: {
        alignItems: 'flex-end',
    },
    txAmount: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 16,
        color: '#FFF',
    },

    fab: {
        position: 'absolute',
        bottom: 100,
        right: 24,
        width: 68,
        height: 68,
        borderRadius: 34,
        shadowColor: '#5C6BC0',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 8,
    },
    fabGradient: {
        flex: 1,
        borderRadius: 34,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#0F1017',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        maxHeight: '50%',
        borderWidth: 1,
        borderColor: '#2A2A35',
        borderBottomWidth: 0,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 20,
        color: '#FFF',
    },
    accountItem: {
        padding: 16,
        backgroundColor: '#161722',
        borderRadius: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#2A2A35',
    },
    activeAccountItem: {
        borderColor: '#22d3ee',
        backgroundColor: 'rgba(34, 211, 238, 0.05)',
    },
    accountItemName: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 16,
        color: '#FFF',
    },
    accountItemNumber: {
        fontFamily: 'Inter_400Regular',
        fontSize: 13,
        color: '#888',
        marginTop: 4,
    },
    promptOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    promptContent: {
        backgroundColor: '#0F1017',
        borderRadius: 24,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        borderWidth: 1,
        borderColor: '#2A2A35',
    },
    promptTitle: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 20,
        color: '#FFF',
        marginBottom: 8,
    },
    promptSubtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: 14,
        color: '#888',
        marginBottom: 20,
    },
    promptInput: {
        backgroundColor: '#161722',
        borderWidth: 1,
        borderColor: '#2A2A35',
        borderRadius: 12,
        padding: 16,
        color: '#FFF',
        fontFamily: 'Outfit_700Bold',
        fontSize: 22,
        marginBottom: 20,
    },
    promptActions: {
        flexDirection: 'row',
        gap: 12,
    },
    promptCancelBtn: {
        flex: 1,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#1E1E28',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2A2A35',
    },
    promptCancelText: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: 15,
        color: '#888',
    },
    promptSaveBtn: {
        flex: 1.5,
        padding: 14,
        borderRadius: 12,
        backgroundColor: '#22d3ee',
        alignItems: 'center',
    },
    promptSaveText: {
        fontFamily: 'Outfit_700Bold',
        fontSize: 15,
        color: '#080810',
    },
    uncategorizedBadge: {
        backgroundColor: 'rgba(251,191,36,0.12)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(251,191,36,0.25)',
    },
    uncategorizedBadgeText: {
        fontFamily: 'Inter_600SemiBold',
        fontSize: 9,
        color: '#fbbf24',
    },
    categoryGridItem: {
        flex: 1,
        backgroundColor: '#1E1E28',
        borderRadius: 16,
        padding: 16,
        margin: 6,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
    },
    categoryGridItemText: {
        fontFamily: 'Inter_500Medium',
        fontSize: 12,
        color: '#FFF',
        textAlign: 'center',
    }
});
