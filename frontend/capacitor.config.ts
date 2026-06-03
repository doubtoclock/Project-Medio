import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.medio.app",
  appName: "Medio",
  webDir: "dist",
  server: {
    hostname: "localhost",
    androidScheme: "https",
    iosScheme: "capacitor",
    allowNavigation: [
      "medio-api.onrender.com",
      "medio-otp.onrender.com",
      "accounts.google.com",
      "google.com",
      "*.vercel.app",
    ],
  },
};

export default config;
