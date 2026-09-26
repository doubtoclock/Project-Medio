import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medio.app',
  appName: 'Medio',
  webDir: 'dist',
  server: {
    hostname: 'medio.mywire.org',
    androidScheme: 'https'
  }
};

export default config;
