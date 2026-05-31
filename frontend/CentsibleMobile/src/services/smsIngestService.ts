import { parseSms } from './smsParser';
import { buildSmsDedupKey } from './smsDedup';
import { upsertLocalTransaction, UpsertResult } from './databaseService';

export type IngestSmsPayload = {
    body: string;
    address: string;
    date: number | string; // ms epoch or ISO
};

export type IngestResult =
    | { ok: false; reason: 'unparsed' }
    | { ok: true; upsert: UpsertResult; parsed: { amount: number; merchant: string; category: string } };

export async function ingestSmsMessage(payload: IngestSmsPayload): Promise<IngestResult> {
    const body = payload.body ?? '';
    const address = payload.address ?? '';
    const parsedTx = parseSms(body, address);
    if (!parsedTx) {
        return { ok: false, reason: 'unparsed' };
    }

    const dateMs =
        typeof payload.date === 'number'
            ? payload.date
            : new Date(payload.date).getTime();

    const dedupKey = await buildSmsDedupKey(body, address, dateMs, parsedTx.amount);
    const upsert = await upsertLocalTransaction({
        amount: parsedTx.amount,
        merchant: parsedTx.merchant,
        category: parsedTx.category,
        date: new Date(dateMs).toISOString(),
        paymentMethod: parsedTx.paymentMethod,
        isSynced: 0,
        rawSms: body,
        dedupKey,
        accountReference: parsedTx.accountReference,
    });

    return {
        ok: true,
        upsert,
        parsed: {
            amount: parsedTx.amount,
            merchant: parsedTx.merchant,
            category: parsedTx.category,
        },
    };
}
