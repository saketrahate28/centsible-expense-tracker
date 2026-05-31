import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, AppStateStatus, DeviceEventEmitter, Platform } from 'react-native';
import { SMS_ENABLED_KEY } from './smsPermissionService';
import { getSmsPermissionStatus } from './smsPermissionService';
import { syncRecentSms } from './smsSyncService';
import { flushSyncQueue } from './syncQueueService';

let appStateSubscription: { remove: () => void } | null = null;
let smsEventSubscription: { remove: () => void } | null = null;
let isRunningForegroundSync = false;

async function onSmsReceived(payload: { body?: string; address?: string; date?: number }) {
    const { ingestSmsMessage } = await import('./smsIngestService');
    if (!payload?.body) return;
    const result = await ingestSmsMessage({
        body: payload.body,
        address: payload.address ?? '',
        date: payload.date ?? Date.now(),
    });
    if (result.ok && result.upsert.status === 'inserted') {
        console.log('[SMS] Real-time expense logged:', result.parsed.merchant);
        await flushSyncQueue();
    }
}

async function runForegroundCatchUp() {
    if (isRunningForegroundSync || Platform.OS !== 'android') return;
    const enabled = await AsyncStorage.getItem(SMS_ENABLED_KEY);
    if (enabled !== 'true') return;
    const perm = await getSmsPermissionStatus();
    if (perm !== 'granted') return;

    isRunningForegroundSync = true;
    try {
        await syncRecentSms();
        await flushSyncQueue();
    } finally {
        isRunningForegroundSync = false;
    }
}

function handleAppStateChange(state: AppStateStatus) {
    if (state === 'active') {
        runForegroundCatchUp();
    }
}

/**
 * Start real-time bridge: native SMS events (if present) + foreground incremental sync.
 */
export async function startRealtimeSmsListener(): Promise<void> {
    if (Platform.OS !== 'android') return;
    stopRealtimeSmsListener();

    smsEventSubscription = DeviceEventEmitter.addListener('onSmsReceived', onSmsReceived);
    appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    if (AppState.currentState === 'active') {
        await runForegroundCatchUp();
    }
}

export function stopRealtimeSmsListener(): void {
    smsEventSubscription?.remove();
    smsEventSubscription = null;
    appStateSubscription?.remove();
    appStateSubscription = null;
}

export async function setSmsTrackingEnabled(enabled: boolean): Promise<void> {
    await AsyncStorage.setItem(SMS_ENABLED_KEY, enabled ? 'true' : 'false');
    if (enabled) {
        await startRealtimeSmsListener();
    } else {
        stopRealtimeSmsListener();
    }
}
