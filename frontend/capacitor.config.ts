import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medio.app',
  appName: 'Medio',
  webDir: 'dist',
  backgroundColor: '#090909',
  server: {
    hostname: 'medio.mywire.org',
    androidScheme: 'https'
  },
  plugins: {
    SystemBars: {
      // Dark system bars with light icons so they match the app's dark background.
      style: 'DARK'
    }
  }
};

export default config;
