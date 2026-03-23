import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nebulife.game',
  appName: 'Nebulife',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
    },
    AdMob: {
      // Test AdMob App ID — replace with real IDs from AdMob dashboard
      appIdAndroid: 'ca-app-pub-3940256099942544~3347511713',
      appIdIos: 'ca-app-pub-3940256099942544~1458002511',
    },
  },
  ios: {
    contentInset: 'automatic',
    backgroundColor: '#020510',
  },
  android: {
    backgroundColor: '#020510',
  },
};

export default config;
