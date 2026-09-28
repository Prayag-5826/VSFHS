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
  console.log('Report saved safely to device storage!');
};

// 2. Upload all pending local reports to Supabase once internet is back
export const syncOfflineDataToServer = async () => {
  if (!navigator.onLine) return;

  const keys = await offlineVisitStore.keys();
  if (keys.length === 0) return;

  console.log(`Found ${keys.length} pending offline reports. Initializing sync...`);

  for (const key of keys) {
    const cachedReport: any = await offlineVisitStore.getItem(key);
    if (cachedReport) {
      try {
        // Sanitize: lead_id must only be passed if it belongs to the leads table
        const cleanPayload = { ...cachedReport };
        if (cleanPayload.lead_id && !String(cleanPayload.lead_id).startsWith('LEAD-')) {
          cleanPayload.lead_id = null;
        }
        delete cleanPayload.address; // Exclude non-schema columns

        // Send to backend API
        await api.request('/visits', {
          method: 'POST',
          body: JSON.stringify(cleanPayload)
        });

        // Remove from local storage after successful upload
        await offlineVisitStore.removeItem(key);
        console.log(`Successfully synced report: ${key}`);
      } catch (err: any) {
        console.error(`Sync failed for report ${key}:`, err);

        // Auto-heal foreign key errors: if lead_id was rejected by DB, retry with null and purge
        if (err?.message?.includes('visits_lead_id_fkey') || err?.code === '23503') {
          try {
            const healedPayload = { ...cachedReport, lead_id: null };
            delete healedPayload.address;

            await api.request('/visits', {
              method: 'POST',
              body: JSON.stringify(healedPayload)
            });
            await offlineVisitStore.removeItem(key);
            console.log(`Auto-healed and synced report ${key} without invalid lead_id.`);
          } catch (healErr) {
            // Remove corrupted record to prevent infinite error spamming
            await offlineVisitStore.removeItem(key);
            console.warn(`Purged unrecoverable offline visit ${key}`);
          }
        }
      }
    }
  }
};

// 3. Listen for the device to regain network access automatically
if (typeof window !== 'undefined') {
  window.addEventListener('online', syncOfflineDataToServer);
}
