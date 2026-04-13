import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'space.nebulife.game',
  appName: 'Nebulife',
  webDir: 'dist',
  server: {
    // In production, serve from the bundled files
    // For development, you can use: url: 'http://YOUR_IP:3000'
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#020510',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#020510',
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
    },
  },
};

export default config;
