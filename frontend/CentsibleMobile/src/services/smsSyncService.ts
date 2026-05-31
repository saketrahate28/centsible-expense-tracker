import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import SmsAndroid from 'react-native-get-sms-android';
import { ingestSmsMessage } from './smsIngestService';
import { flushSyncQueue } from './syncQueueService';
import {
    getSmsPermissionStatus,
    LAST_SMS_SYNC_KEY,
    requestSmsPermissions,
} from './smsPermissionService';

export type HistoricalSyncProgress = {
    phase: 'scanning' | 'parsing' | 'uploading' | 'done';
    scanned: number;
    parsed: number;
    saved: number;
    skipped: number;
};

export type HistoricalSyncResult = {
    saved: number;
    skipped: number;
    parsed: number;
    scanned: number;
};

const CHUNK_SIZE = 50;

export { requestSmsPermissions, getSmsPermissionStatus };

async function getMinDateForSync(daysToLookBack: number): Promise<number> {
    const last = await AsyncStorage.getItem(LAST_SMS_SYNC_KEY);
    if (last) {
        const lastMs = parseInt(last, 10);
        const overlap = 24 * 60 * 60 * 1000;
        return Math.min(lastMs - overlap, Date.now() - daysToLookBack * 24 * 60 * 60 * 1000);
    }
    return Date.now() - daysToLookBack * 24 * 60 * 60 * 1000;
}

function yieldToUi(): Promise<void> {
    return new Promise((r) => setTimeout(r, 0));
}

/**
 * Scan inbox, parse bank SMS, deduplicated upsert to SQLite, then flush API queue.
 */
export const syncHistoricalSms = async (
    daysToLookBack: number = 365,
    onProgress?: (p: HistoricalSyncProgress) => void
): Promise<HistoricalSyncResult> => {
    if (Platform.OS !== 'android') {
        console.log('[SMS] Not Android — skipping sync.');
        return { saved: 0, skipped: 0, parsed: 0, scanned: 0 };
    }

    let perm = await getSmsPermissionStatus();
    if (perm !== 'granted') {
        perm = await requestSmsPermissions();
    }
    if (perm !== 'granted') {
        console.warn('[SMS] Permission denied. Sync aborted.');
        return { saved: 0, skipped: 0, parsed: 0, scanned: 0 };
    }

    const minDate = await getMinDateForSync(daysToLookBack);
    console.log(`[SMS] Scanning inbox since ${new Date(minDate).toDateString()}...`);
    onProgress?.({ phase: 'scanning', scanned: 0, parsed: 0, saved: 0, skipped: 0 });

    const filter = {
        box: 'inbox',
        minDate,
        maxCount: 2000,
    };

    const listResult = await new Promise<any[]>((resolve) => {
        SmsAndroid.list(
            JSON.stringify(filter),
            (fail: string) => {
                console.error('[SMS] SmsAndroid.list failed:', fail);
                resolve([]);
            },
            (_count: number, smsList: string) => {
                try {
                    resolve(JSON.parse(smsList));
                } catch (e) {
                    console.error('[SMS] Failed to parse SMS list JSON:', e);
                    resolve([]);
                }
            }
        );
    });

    let parsed = 0;
    let saved = 0;
    let skipped = 0;
    const scanned = listResult.length;

    onProgress?.({ phase: 'parsing', scanned, parsed, saved, skipped });

    for (let i = 0; i < listResult.length; i += CHUNK_SIZE) {
        const chunk = listResult.slice(i, i + CHUNK_SIZE);
        for (const sms of chunk) {
            const body: string = sms.body ?? '';
            const address: string = sms.address ?? '';
            const dateMs = Number(sms.date);

            const result = await ingestSmsMessage({ body, address, date: dateMs });
            if (!result.ok) continue;

            parsed++;
            if (result.upsert.status === 'inserted') saved++;
            else skipped++;

            if (__DEV__ && result.upsert.status === 'inserted') {
                console.log(
                    `[SMS] ✅ ${address}: ₹${result.parsed.amount} → ${result.parsed.merchant}`
                );
            }
        }
        onProgress?.({ phase: 'parsing', scanned, parsed, saved, skipped });
        await yieldToUi();
    }

    await AsyncStorage.setItem(LAST_SMS_SYNC_KEY, String(Date.now()));

    onProgress?.({ phase: 'uploading', scanned, parsed, saved, skipped });
    await flushSyncQueue();

    onProgress?.({ phase: 'done', scanned, parsed, saved, skipped });
    console.log(`[SMS] Done. scanned=${scanned} parsed=${parsed} saved=${saved} skipped=${skipped}`);
    return { saved, skipped, parsed, scanned };
};

/** Incremental sync for foreground / real-time bridge (last 2 days). */
export const syncRecentSms = async (): Promise<HistoricalSyncResult> => {
    return syncHistoricalSms(2);
};
