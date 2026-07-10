import * as SQLite from 'expo-sqlite';

/**
 * Centsible Offline Persistence Layer
 * Uses Expo SQLite to store transactions locally before syncing to the backend.
 */

export interface LocalTransaction {
    id?: number;
    remoteId?: string;
    dedupKey?: string;
    amount: number;
    merchant: string;
    category: string;
    date: string; // ISO string
    paymentMethod: string;
    isSynced: number; // 0 for false, 1 for true
    rawSms?: string;
    accountReference?: string;
}

const DATABASE_NAME = 'centsible.db';
const SCHEMA_VERSION = 3;

async function migrateSchema(db: SQLite.SQLiteDatabase) {
    await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS local_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            remoteId TEXT,
            dedupKey TEXT,
            amount REAL NOT NULL,
            merchant TEXT NOT NULL,
            category TEXT,
            date TEXT NOT NULL,
            paymentMethod TEXT,
            isSynced INTEGER DEFAULT 0,
            rawSms TEXT
        );
        CREATE TABLE IF NOT EXISTS app_meta (
            key TEXT PRIMARY KEY,
            value TEXT
        );
    `);

    const meta = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM app_meta WHERE key = 'schema_version'"
    );
    const version = meta ? parseInt(meta.value, 10) : 1;

    if (version < 2) {
        try {
            await db.execAsync(`ALTER TABLE local_transactions ADD COLUMN dedupKey TEXT;`);
        } catch {
            // column may already exist
        }
        try {
            await db.execAsync(
                `CREATE UNIQUE INDEX IF NOT EXISTS idx_local_tx_dedup ON local_transactions(dedupKey) WHERE dedupKey IS NOT NULL;`
            );
        } catch {
            // index may exist
        }
    }

    if (version < 3) {
        try {
            await db.execAsync(`ALTER TABLE local_transactions ADD COLUMN accountReference TEXT;`);
        } catch {
            // column may already exist
        }
        await db.runAsync(
            `INSERT OR REPLACE INTO app_meta (key, value) VALUES ('schema_version', ?)`,
            [String(SCHEMA_VERSION)]
        );
    }
}

export const initDatabase = async () => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await migrateSchema(db);
    console.log('✅ SQLite Database Initialized');
};

export type UpsertResult =
    | { status: 'inserted'; id: number }
    | { status: 'duplicate'; id: number };

export const upsertLocalTransaction = async (
    tx: LocalTransaction & { dedupKey: string }
): Promise<UpsertResult> => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

    const existing = await db.getFirstAsync<{ id: number }>(
        'SELECT id FROM local_transactions WHERE dedupKey = ?',
        [tx.dedupKey]
    );
    if (existing?.id) {
        return { status: 'duplicate', id: existing.id };
    }

    const result = await db.runAsync(
        `INSERT INTO local_transactions (remoteId, dedupKey, amount, merchant, category, date, paymentMethod, isSynced, rawSms, accountReference)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            tx.remoteId || null,
            tx.dedupKey,
            tx.amount,
            tx.merchant,
            tx.category,
            tx.date,
            tx.paymentMethod,
            tx.isSynced,
            tx.rawSms || null,
            tx.accountReference || null,
        ]
    );
    return { status: 'inserted', id: result.lastInsertRowId };
};

/** @deprecated Use upsertLocalTransaction — kept for manual dev mock inserts */
export const addLocalTransaction = async (tx: LocalTransaction) => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    const result = await db.runAsync(
        'INSERT INTO local_transactions (remoteId, dedupKey, amount, merchant, category, date, paymentMethod, isSynced, rawSms, accountReference) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
            tx.remoteId || null,
            tx.dedupKey || null,
            tx.amount,
            tx.merchant,
            tx.category,
            tx.date,
            tx.paymentMethod,
            tx.isSynced,
            tx.rawSms || null,
            tx.accountReference || null,
        ]
    );
    return result.lastInsertRowId;
};

export const getLocalTransactions = async (onlyUnsynced: boolean = false): Promise<LocalTransaction[]> => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    let query = 'SELECT * FROM local_transactions ORDER BY date DESC';
    if (onlyUnsynced) {
        query = 'SELECT * FROM local_transactions WHERE isSynced = 0 ORDER BY date DESC';
    }
    return db.getAllAsync<LocalTransaction>(query);
};

export const getUnsyncedCount = async (): Promise<number> => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    const row = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM local_transactions WHERE isSynced = 0'
    );
    return row?.count ?? 0;
};

export const markAsSynced = async (localId: number, remoteId: string) => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await db.runAsync(
        'UPDATE local_transactions SET isSynced = 1, remoteId = ? WHERE id = ?',
        [remoteId, localId]
    );
};

export const cleanupOldTransactions = async (days: number = 90) => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - days);
    await db.runAsync(
        'DELETE FROM local_transactions WHERE isSynced = 1 AND date < ?',
        [thresholdDate.toISOString()]
    );
};

export const updateLocalTransactionCategory = async (localId: number, category: string) => {
    const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
    await db.runAsync(
        'UPDATE local_transactions SET category = ? WHERE id = ?',
        [category, localId]
    );
};

export default {
    initDatabase,
    upsertLocalTransaction,
    addLocalTransaction,
    getLocalTransactions,
    getUnsyncedCount,
    markAsSynced,
    cleanupOldTransactions,
    updateLocalTransactionCategory,
};

