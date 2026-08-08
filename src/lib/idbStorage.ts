import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface AFMSDBSchema extends DBSchema {
  app_state: {
    key: string;
    value: any;
  };
  audit_logs: {
    key: string;
    value: any;
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'afms_offline_db';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<AFMSDBSchema>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<AFMSDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('app_state')) {
          db.createObjectStore('app_state');
        }
        if (!db.objectStoreNames.contains('audit_logs')) {
          const logStore = db.createObjectStore('audit_logs', { keyPath: 'id' });
          logStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }
  return dbPromise;
}

export async function saveLocalData(key: string, data: any): Promise<void> {
  try {
    const db = await getDB();
    await db.put('app_state', data, key);
  } catch (err) {
    console.error(`IndexedDB write error for key ${key}:`, err);
    // fallback to localStorage
    try {
      localStorage.setItem(`afms_backup_${key}`, JSON.stringify(data));
    } catch (e) {
      // ignore
    }
  }
}

export async function getLocalData<T = any>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    const val = await db.get('app_state', key);
    if (val !== undefined) return val as T;
  } catch (err) {
    console.error(`IndexedDB read error for key ${key}:`, err);
  }
  // fallback
  try {
    const local = localStorage.getItem(`afms_backup_${key}`);
    if (local) return JSON.parse(local) as T;
  } catch (e) {
    // ignore
  }
  return null;
}
