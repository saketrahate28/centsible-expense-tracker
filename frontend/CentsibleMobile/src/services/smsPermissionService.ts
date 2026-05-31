import { Linking, PermissionsAndroid, Platform } from 'react-native';

export type SmsPermissionStatus = 'granted' | 'denied' | 'never_ask_again' | 'unavailable';

export const SMS_ENABLED_KEY = '@centsible_sms_enabled';
export const LAST_SMS_SYNC_KEY = '@centsible_last_sms_sync_at';

export async function getSmsPermissionStatus(): Promise<SmsPermissionStatus> {
    if (Platform.OS !== 'android') return 'unavailable';

    const read = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.READ_SMS);
    const receive = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECEIVE_SMS);
    if (read && receive) return 'granted';
    return 'denied';
}

export async function requestSmsPermissions(): Promise<SmsPermissionStatus> {
    if (Platform.OS !== 'android') return 'unavailable';

    try {
        const results = await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.READ_SMS,
            PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
        ]);

        const read = results[PermissionsAndroid.PERMISSIONS.READ_SMS];
        const receive = results[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS];

        if (read === PermissionsAndroid.RESULTS.GRANTED && receive === PermissionsAndroid.RESULTS.GRANTED) {
            return 'granted';
        }
        if (read === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN || receive === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
            return 'never_ask_again';
        }
        return 'denied';
    } catch (err) {
        console.warn('[SMS] Permission request failed:', err);
        return 'denied';
    }
}

export function openAppSettings(): void {
    Linking.openSettings();
}
