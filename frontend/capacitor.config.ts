import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.mywire.medio',
  appName: 'MEDIO',
  webDir: 'dist',
  server: {
    hostname: 'medio.mywire.org',
    androidScheme: 'https'
  }
};

export default config;
