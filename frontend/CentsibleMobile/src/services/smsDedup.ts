import * as Crypto from 'expo-crypto';

/** Stable key so re-sync does not duplicate the same bank SMS. */
export async function buildSmsDedupKey(
    body: string,
    address: string,
    dateMs: number,
    amount: number
): Promise<string> {
    const norm = `${address}|${dateMs}|${amount}|${body.replace(/\s+/g, ' ').trim().toLowerCase()}`;
    return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, norm);
}
