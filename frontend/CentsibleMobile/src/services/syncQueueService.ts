import api from './api';
import { getLocalTransactions, markAsSynced } from './databaseService';
import { getToken } from './authService';
import { parseSms } from './smsParser';

export async function flushSyncQueue(): Promise<{ synced: number; failed: number }> {
    const token = await getToken();
    if (!token) {
        return { synced: 0, failed: 0 };
    }

    const pending = await getLocalTransactions(true);
    let synced = 0;
    let failed = 0;

    for (const tx of pending) {
        if (!tx.id) continue;
        try {
            const parsed = tx.rawSms ? parseSms(tx.rawSms, tx.paymentMethod) : null;
            const accountRef = tx.accountReference || parsed?.accountReference || undefined;

            const res = await api.post('/Transactions/sms', {
                senderName: tx.paymentMethod || 'SMS',
                rawMessage: tx.rawSms || '',
                extractedAmount: String(tx.amount),
                merchantName: tx.merchant,
                categoryName: tx.category || 'Uncategorized',
                type: 'Debit',
                receivedAt: tx.date,
                clientDedupKey: tx.dedupKey || undefined,
                accountReference: accountRef,
            });
            const remoteId = res.data?.transactionId ?? res.data?.TransactionId ?? 'synced';
            await markAsSynced(tx.id, String(remoteId));
            synced++;
        } catch (e) {
            console.warn('[SyncQueue] Failed to upload tx', tx.id, e);
            failed++;
        }
    }

    if (synced > 0) {
        console.log(`[SyncQueue] Uploaded ${synced} transaction(s)`);
        import('react-native').then(({ DeviceEventEmitter }) => {
            DeviceEventEmitter.emit('TransactionsUpdated');
        });
    }
    return { synced, failed };
}
