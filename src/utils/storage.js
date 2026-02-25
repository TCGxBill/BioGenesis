// ============================================
// BioGenesis — IndexedDB Storage Wrapper
// ============================================

const DB_NAME = 'BioGenesisDB';
const DB_VERSION = 1;
const STORE_NAME = 'workspace';

let db = null;

export async function initStorage() {
    return new Promise((resolve, reject) => {
        if (db) return resolve(db);

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('IndexedDB Error:', event.target.error);
            reject(event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;
            if (!database.objectStoreNames.contains(STORE_NAME)) {
                database.createObjectStore(STORE_NAME);
            }
        };
    });
}

export async function saveWorkspace(state) {
    if (!db) await initStorage();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            // We don't save the active tool to avoid confusing state on reload
            const dataToSave = {
                sequences: state.sequences,
                tabs: state.tabs,
                activeTabId: state.activeTabId,
                activeSequenceIdx: state.activeSequenceIdx,
                tabCounter: state.tabCounter,
                lastSaved: Date.now()
            };

            const request = store.put(dataToSave, 'currentState');

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e.target.error);
        } catch (err) {
            reject(err);
        }
    });
}

export async function loadWorkspace() {
    if (!db) await initStorage();
    return new Promise((resolve, reject) => {
        try {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get('currentState');

            request.onsuccess = () => {
                resolve(request.result || null);
            };
            request.onerror = (e) => reject(e.target.error);
        } catch (err) {
            reject(err);
        }
    });
}

export async function clearWorkspace() {
    if (!db) await initStorage();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete('currentState');
        request.onsuccess = () => resolve();
        request.onerror = (e) => reject(e.target.error);
    });
}
