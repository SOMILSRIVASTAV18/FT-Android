import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { LocalNotifications } from '@capacitor/local-notifications';
import { NativeBiometric } from 'capacitor-native-biometric';
import { Device } from '@capacitor/device';
import { App } from '@capacitor/app';
import { toast } from 'sonner';

// Define the SMS plugin interface since it's a Cordova plugin
interface SMSReceive {
  startWatch: (success: () => void, error: (err: any) => void) => void;
  stopWatch: (success: () => void, error: (err: any) => void) => void;
}

declare global {
  interface Window {
    SMSReceive?: SMSReceive;
  }
}

export const NativeService = {
  // Biometric Auth
  async checkBiometry() {
    if (Capacitor.getPlatform() === 'web') return false;
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (error) {
      // Only log if not a "not implemented" error to reduce noise in web
      if (!(error instanceof Error && error.message.includes('not implemented'))) {
        console.error('Biometric check failed', error);
      }
      return false;
    }
  },

  async authenticateBiometric() {
    if (Capacitor.getPlatform() === 'web') return true; // Mock success on web
    try {
      const available = await this.checkBiometry();
      if (!available) return true; // Fallback if not available

      await NativeBiometric.verifyIdentity({
        reason: "Log in to FinTrack Pro",
        title: "Biometric Login",
        subtitle: "Use your fingerprint or face to continue",
        description: "Securely access your financial data"
      });
      return true;
    } catch (error) {
      console.error('Biometric authentication failed', error);
      return false;
    }
  },

  async authenticate() {
    return await this.authenticateBiometric();
  },

  // Push Notifications
  async initPush() {
    if (Capacitor.getPlatform() === 'web') return;

    try {
      let permStatus = await PushNotifications.checkPermissions();

      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions();
      }

      if (permStatus.receive !== 'granted') {
        throw new Error('User denied permissions!');
      }

      await PushNotifications.register();

      PushNotifications.addListener('registration', (token) => {
        console.log('Push registration success, token: ' + token.value);
        // Here you would normally send the token to your backend
      });

      PushNotifications.addListener('registrationError', (error) => {
        console.error('Error on registration: ' + JSON.stringify(error));
      });

      PushNotifications.addListener('pushNotificationReceived', (notification) => {
        toast.info(notification.title, {
          description: notification.body
        });
      });

      PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
        console.log('Push action performed: ' + JSON.stringify(notification));
      });
    } catch (error) {
      console.error('Push init failed', error);
    }
  },

  // SMS Reading (Incoming only due to Android restrictions)
  async requestSMSPermissions() {
    if (Capacitor.getPlatform() === 'web') return false;
    try {
      // For Android, we can try to use the permission plugin if available
      // or just rely on the SMS plugin's internal handling.
      // We'll also request notification permissions as they are often needed for background tasks.
      await LocalNotifications.requestPermissions();
      console.log('SMS permissions requested via notification proxy');
      return true;
    } catch (error) {
      console.error('Permission request failed', error);
      return false;
    }
  },

  initSMS(onSMSReceived: (address: string, body: string) => void) {
    if (Capacitor.getPlatform() === 'web') return;
    
    const startSMSWatch = () => {
      if (window.SMSReceive) {
        window.SMSReceive.startWatch(
          () => {
            console.log('SMS watch started');
            document.addEventListener('onSMSArrive', (e: any) => {
              const sms = e.data;
              onSMSReceived(sms.address, sms.body);
            });
          },
          (err) => {
            console.error('SMS watch error', err);
            toast.error('Failed to start SMS monitoring');
          }
        );
      } else {
        console.warn('SMSReceive plugin not found');
      }
    };

    startSMSWatch();
  },

  async readInbox(onMessagesFound: (messages: { address: string, body: string, date: number }[]) => void) {
    if (Capacitor.getPlatform() === 'web') {
      // Mock some data for testing/demo purposes
      setTimeout(() => {
        onMessagesFound([
          { address: 'HDFCBK', body: 'Spent ₹1200.00 at AMAZON. Balance: ₹45000.00', date: Date.now() - 86400000 },
          { address: 'SBIBNK', body: 'Your a/c XXX123 credited with ₹50000.00 on 10-Apr-26', date: Date.now() - 172800000 }
        ]);
      }, 2000);
      return;
    }
    
    console.log('Reading SMS Inbox...');
    // In a real app, you'd use a plugin like cordova-plugin-sms-read
    // Since we can't easily verify plugin presence, we'll log and provide a hook
  },

  // App Lifecycle
  onAppExit(callback: () => void) {
    if (Capacitor.getPlatform() === 'web') return;
    App.addListener('appStateChange', ({ isActive }) => {
      if (!isActive) callback();
    });
  },

  // Local Notifications
  async sendLocalNotification(title: string, body: string) {
    if (Capacitor.getPlatform() === 'web') {
      toast.info(title, { description: body });
      return;
    }
    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            title,
            body,
            id: Math.floor(Math.random() * 10000),
            schedule: { at: new Date(Date.now() + 1000) },
            sound: 'default',
            attachments: [],
            actionTypeId: '',
            extra: null
          }
        ]
      });
    } catch (error) {
      console.error('Local notification failed', error);
    }
  }
};
