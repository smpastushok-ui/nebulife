import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nebulife.game',
  appName: 'Nebulife',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
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
