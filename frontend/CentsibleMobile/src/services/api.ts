import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { getLocalTransactions, getUnsyncedCount } from './databaseService';
import { flushSyncQueue } from './syncQueueService';

function getBaseUrl() {
    if (process.env.EXPO_PUBLIC_API_URL) {
        return process.env.EXPO_PUBLIC_API_URL;
    }
    if (__DEV__) {
        const hostUri = Constants.expoConfig?.hostUri;
        const devIp = hostUri ? hostUri.split(':')[0] : '10.0.2.2';
        return `http://${devIp}:5272/api`;
    }
    return 'https://api.centsible.app/api';
}

const BASE_URL = getBaseUrl();

const api = axios.create({
    baseURL: BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 8000,
});

api.interceptors.request.use(
    async (config) => {
        try {
            // Read JWT from SecureStore (hardware-backed encryption)
            const { getToken } = await import('./authService');
            const token = await getToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch {}
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (error.response?.status === 401) {
            try {
                // Clear SecureStore token on 401
                const { removeToken } = await import('./authService');
                await removeToken();
            } catch {}
        }
        return Promise.reject(error);
    }
);

export type DashboardTransaction = {
    id: string;
    merchantName: string;
    categoryName: string;
    amount: number;
    transactionDate: string;
    paymentMethod: string;
    source?: 'local' | 'remote';
};

export type DashboardPayload = {
    totalBalance: number;
    monthlySpending: number;
    monthlyLimit: number;
    recentTransactions: DashboardTransaction[];
    pendingSyncCount?: number;
};

const MOCK_DASHBOARD: DashboardPayload = {
    totalBalance: 45000,
    monthlySpending: 12450,
    monthlyLimit: 20000,
    recentTransactions: [
        { id: '1', merchantName: 'Swiggy', categoryName: 'Food & Drinks', amount: 320, transactionDate: new Date().toISOString(), paymentMethod: 'GPay' },
        { id: '2', merchantName: 'Uber', categoryName: 'Transport', amount: 150, transactionDate: new Date().toISOString(), paymentMethod: 'PhonePe' },
    ],
};

function txMergeKey(merchant: string, amount: number, date: string): string {
    const d = new Date(date);
    const bucket = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}-${d.getMinutes()}`;
    return `${merchant}|${amount}|${bucket}`.toLowerCase();
}

const getLocalDashboardStats = async (): Promise<DashboardPayload | null> => {
    try {
        const localTxs = await getLocalTransactions();
        const now = new Date();
        const currentMonthTxs = localTxs.filter((tx) => {
            const txDate = new Date(tx.date);
            return txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
        });

        const monthlySpending = currentMonthTxs.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
        const pendingSyncCount = await getUnsyncedCount();

        return {
            totalBalance: 0,
            monthlySpending,
            monthlyLimit: 20000,
            pendingSyncCount,
            recentTransactions: localTxs.slice(0, 15).map((tx) => ({
                id: `local-${tx.id}`,
                merchantName: tx.merchant,
                categoryName: tx.category || 'Uncategorized',
                amount: Math.abs(tx.amount),
                transactionDate: tx.date,
                paymentMethod: tx.paymentMethod,
                source: 'local' as const,
            })),
        };
    } catch {
        return null;
    }
};

function mergeDashboard(
    local: DashboardPayload | null,
    remote: DashboardPayload | null
): DashboardPayload {
    if (!local && !remote) {
        return {
            totalBalance: 0,
            monthlySpending: 0,
            monthlyLimit: 20000,
            recentTransactions: [],
            pendingSyncCount: 0,
        };
    }
    if (!local) return { ...remote!, pendingSyncCount: remote!.pendingSyncCount ?? 0 };
    if (!remote) return local;

    const map = new Map<string, DashboardTransaction>();

    for (const t of remote.recentTransactions) {
        const key = txMergeKey(t.merchantName, t.amount, t.transactionDate);
        map.set(key, { ...t, source: 'remote' });
    }
    for (const t of local.recentTransactions) {
        const key = txMergeKey(t.merchantName, t.amount, t.transactionDate);
        if (!map.has(key)) {
            map.set(key, t);
        }
    }

    const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );

    const now = new Date();
    const monthlySpending = merged
        .filter((t) => {
            const d = new Date(t.transactionDate);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        })
        .reduce((s, t) => s + Math.abs(t.amount), 0);

    return {
        totalBalance: remote.totalBalance ?? 0,
        monthlySpending: Math.max(monthlySpending, Math.abs(remote.monthlySpending)),
        monthlyLimit: remote.monthlyLimit ?? local.monthlyLimit,
        pendingSyncCount: local.pendingSyncCount ?? 0,
        recentTransactions: merged.slice(0, 10),
    };
}

export const getDashboardData = async (): Promise<DashboardPayload> => {
    await flushSyncQueue();

    const [localResult, remoteResult] = await Promise.allSettled([
        getLocalDashboardStats(),
        api.get('/Transactions/dashboard'),
    ]);

    const local =
        localResult.status === 'fulfilled' ? localResult.value : null;
    const remote =
        remoteResult.status === 'fulfilled' ? (remoteResult.value.data as DashboardPayload) : null;

    const merged = mergeDashboard(local, remote);

    if (merged.recentTransactions.length === 0) {
        if (__DEV__) {
            console.warn('Dashboard empty — using dev mock data');
            return MOCK_DASHBOARD;
        }
        return merged;
    }

    return merged;
};

export const getAnalyticsData = async (timeframe: string = 'Month') => {
    try {
        const response = await api.get(`/Transactions/analytics?timeframe=${timeframe}`);
        return response.data;
    } catch (error) {
        if (__DEV__) {
            return {
                totalSpend: 0,
                spendTrendPercentage: '0',
                categories: [],
                trends: [],
                aiInsight: 'Connect to the API or sync SMS to see analytics.',
            };
        }
        throw error;
    }
};

export const predictCategory = async (merchant: string, note?: string) => {
    try {
        const response = await api.post('/Transactions/predict-category', { merchant, note });
        // All 9 categories must match the backend seed + frontend smsParser
        const categories: Record<number, string> = {
            1: 'Transport',
            2: 'Food & Drinks',
            3: 'Shopping',
            4: 'Groceries',
            5: 'Entertainment',
            6: 'Bills & Utilities',
            7: 'Health',
            8: 'Education',
            9: 'Investment & Finance',
        };
        return categories[response.data.categoryId] || 'Uncategorized';
    } catch {
        return 'Uncategorized';
    }
};

export const saveSmsTransaction = async (amount: string, note: string, paymentMethod: string) => {
    try {
        const payload = {
            senderName: paymentMethod,
            rawMessage: note || 'Manual Expense Entry',
            extractedAmount: String(amount),
            merchantName: note || 'Manual',
            type: 'Debit',
            receivedAt: new Date().toISOString(),
        };
        const response = await api.post('/Transactions/sms', payload);
        return response.data;
    } catch {
        return { success: false };
    }
};

export const updateTransactionCategory = async (transactionId: string, categoryId: number) => {
    try {
        const response = await api.patch(`/Transactions/${transactionId}/category`, { categoryId });
        return response.data;
    } catch (error) {
        console.error('Failed to update category:', error);
        throw error;
    }
};

export default api;

