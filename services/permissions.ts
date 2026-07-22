import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { PushNotifications } from '@capacitor/push-notifications';

export const requestAppPermissions = async () => {
  try {
    // 1. Request Camera Access
    const cameraStatus = await Camera.checkPermissions();
    if (cameraStatus.camera !== 'granted') {
      await Camera.requestPermissions({ permissions: ['camera'] });
    }

    // 2. Request High-Accuracy GPS Location Access
    const geoStatus = await Geolocation.checkPermissions();
    if (geoStatus.location !== 'granted') {
      await Geolocation.requestPermissions({ permissions: ['location'] });
    }

    // 3. Request Push Notification Access
    const notifyStatus = await PushNotifications.checkPermissions();
    if (notifyStatus.receive !== 'granted') {
      await PushNotifications.requestPermissions();
    }
  } catch (error) {
    console.log('Permissions check or request skipped:', error);
  }
};
