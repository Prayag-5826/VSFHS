import localforage from 'localforage';
import { api } from './apiService';

// Setup local phone storage for visits
const offlineVisitStore = localforage.createInstance({
  name: 'VSFHS_Offline_Storage',
  storeName: 'cached_visits'
});

// 1. Save a report locally if the user is offline
export const saveVisitOffline = async (visitPayload: any) => {
  const id = visitPayload.id || `OFFLINE-${Date.now()}`;
  await offlineVisitStore.setItem(id, visitPayload);
  console.log("Report saved safely to device storage!");
};

// 2. Upload all pending local reports to Supabase once the internet is back
export const syncOfflineDataToServer = async () => {
  if (!navigator.onLine) return; // Do nothing if still offline

  const keys = await offlineVisitStore.keys();
  if (keys.length === 0) return;

  console.log(`Found ${keys.length} pending offline reports. Initializing sync...`);

  for (const key of keys) {
    const cachedReport = await offlineVisitStore.getItem(key);
    if (cachedReport) {
      try {
        // Send to your backend API
        await api.request('/visits', {
          method: 'POST',
          body: JSON.stringify(cachedReport)
        });

        // Remove from phone storage after a successful upload
        await offlineVisitStore.removeItem(key);
        console.log(`Successfully synced report: ${key}`);
      } catch (err) {
        console.error(`Sync failed for report ${key}, will retry later:`, err);
      }
    }
  }
};

// 3. Listen for the phone to regain network access automatically
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncOfflineDataToServer);
}
