import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.Thinkhat.finta',
  appName: 'FinTrack Pro',
  webDir: 'dist',
  plugins: {
    CapacitorHttp: {
      enabled: false,
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "62768434499-vlf4rhsnp00t6ea0klgsfoit16ccaeao.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#488AFF",
      sound: "beep.wav",
    },
  },
};

export default config;
