import localforage from 'localforage';
import { api, getActiveCredentials, getSessionToken, isNetworkError } from './apiService';

// Local phone storage for visits that could not be uploaded yet
const offlineVisitStore = localforage.createInstance({
  name: 'VSFHS_Offline_Storage',
  storeName: 'cached_visits'
});

export const OFFLINE_QUEUE_EVENT = 'vsf-offline-queue-changed';

const notifyQueueChanged = () => {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(OFFLINE_QUEUE_EVENT));
};

let syncing = false;

/** 1. Save a visit on the device when there is no connection. */
export const saveVisitOffline = async (visitPayload: any) => {
  const id = visitPayload.id || `OFFLINE-${Date.now()}`;
  await offlineVisitStore.setItem(id, { ...visitPayload, id });
  notifyQueueChanged();
};

/** How many visits are waiting to upload (for a badge or a "sync pending" message). */
export const getPendingVisitCount = async (): Promise<number> => offlineVisitStore.length();

/**
 * 2. Upload waiting visits. Safe to call often:
 *    - only one run at a time,
 *    - nothing is ever deleted unless it reached the server (or the server already had it),
 *    - a visit that fails keeps its error so it can be inspected.
 */
export const syncOfflineDataToServer = async (): Promise<{ synced: number; pending: number }> => {
  if (syncing || typeof navigator === 'undefined' || !navigator.onLine || !getSessionToken()) {
    return { synced: 0, pending: await offlineVisitStore.length() };
  }

  syncing = true;
  let synced = 0;

  try {
    const { user } = getActiveCredentials();
    const keys = await offlineVisitStore.keys();

    for (const key of keys) {
      const cached: any = await offlineVisitStore.getItem(key);
      if (!cached) {
        await offlineVisitStore.removeItem(key);
        continue;
      }

      // A visit belongs to the officer who logged it; keep it until that officer signs in.
      const owner = cached.representative_id || cached.representativeId;
      if (user?.id && owner && owner !== user.id) continue;

      const payload = { ...cached };
      delete payload.address; // not a column in the visits table
      delete payload._attempts;
      delete payload._lastError;

      try {
        await api.request('/visits', { method: 'POST', body: JSON.stringify(payload) });
        await offlineVisitStore.removeItem(key);
        synced += 1;
      } catch (err: any) {
        const code = err?.code;

        // Duplicate id: the server already has this visit, so the local copy can go.
        if (code === '23505') {
          await offlineVisitStore.removeItem(key);
          synced += 1;
          continue;
        }

        // Offline again, or the session expired: stop and try later (after re-login).
        if (isNetworkError(err) || code === '42501' || /permission|jwt|session/i.test(err?.message || '')) {
          break;
        }

        // Anything else: keep the visit and remember why.
        await offlineVisitStore.setItem(key, {
          ...cached,
          _attempts: (cached._attempts || 0) + 1,
          _lastError: String(err?.message || err).slice(0, 200)
        });
        console.error(`Offline visit ${key} could not be uploaded:`, err);
      }
    }
  } finally {
    syncing = false;
    notifyQueueChanged();
  }

  return { synced, pending: await offlineVisitStore.length() };
};

/**
 * 3. Start background syncing. Call ONCE from App and use the returned function to stop it.
 *    (The old module-level listener was removed: it ran in parallel with App's and duplicated uploads.)
 */
export const startOfflineSync = (): (() => void) => {
  if (typeof window === 'undefined') return () => {};

  const run = () => {
    void syncOfflineDataToServer();
  };

  window.addEventListener('online', run);
  const timer = window.setInterval(run, 60_000);
  run();

  return () => {
    window.removeEventListener('online', run);
    window.clearInterval(timer);
  };
};
