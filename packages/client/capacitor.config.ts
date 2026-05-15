import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.nebulife.game',
  appName: 'Nebulife',
  webDir: 'dist',
  server: {
    // In production, serve from the bundled files
    // For development, you can use: url: 'http://YOUR_IP:3000'
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
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
    GoogleAuth: {
      scopes: ['profile', 'email'],
      iosClientId: '702900049376-hgk67iamhrretsuauhnjb0g356k626ja.apps.googleusercontent.com',
      androidClientId: '702900049376-9abfe8lpgosqdjbnos2lcl26106fst5a.apps.googleusercontent.com',
      serverClientId: '702900049376-e7k1574lfpjri29a9j3kde7pmio68h0a.apps.googleusercontent.com',
      forceCodeForRefreshToken: true,
    },
  },
};

export default config;
