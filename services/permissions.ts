import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Geolocation } from '@capacitor/geolocation';

export const requestAppPermissions = async () => {
  // Only execute native plugin checks on actual Android/iOS devices
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    const geoStatus = await Geolocation.checkPermissions();
    if (geoStatus.location !== 'granted') {
      await Geolocation.requestPermissions();
    }

    const pushStatus = await PushNotifications.checkPermissions();
    if (pushStatus.receive === 'prompt') {
      await PushNotifications.requestPermissions();
    }
  } catch (err) {
    console.warn('Native permission request notice:', err);
  }
};
