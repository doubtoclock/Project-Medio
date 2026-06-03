import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.medio.app",
  appName: "Medio",
  webDir: "dist",
  server: {
    hostname: "localhost",
    androidScheme: "https",
    iosScheme: "capacitor",
  },
  plugins: {
    SocialLogin: {
      google: true,
    },
  },
};

export default config;
