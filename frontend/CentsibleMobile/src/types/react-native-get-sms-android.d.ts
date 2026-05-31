declare module 'react-native-get-sms-android' {
    export interface SmsFilter {
        box?: 'inbox' | 'sent' | 'draft' | 'outbox' | 'failed' | 'queued' | '';
        read?: 0 | 1;
        _id?: number;
        address?: string;
        body?: string;
        creator?: string;
        date?: number;
        date_sent?: number;
        error_code?: number;
        locked?: number;
        protocol?: number;
        person?: number;
        reply_path_present?: number;
        subject?: string;
        thread_id?: number;
        type?: number;
        minDate?: number;
        maxDate?: number;
        indexFrom?: number;
        maxCount?: number;
    }

    export default class SmsAndroid {
        static list(
            filter: string,
            fail: (error: string) => void,
            success: (count: number, smsList: string) => void
        ): void;

        static autoSend(
            phoneNumber: string,
            message: string,
            fail: (error: string) => void,
            success: (status: string) => void
        ): void;
    }
}
