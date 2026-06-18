type CapacitorWindow = Window & {
  Capacitor?: {
    isNativePlatform?: () => boolean;
  };
};

export const getBackendUrl = () => {
  const configuredUrl = import.meta.env.VITE_BACKEND_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined") {
    if (window.location.hostname.includes("github.dev")) {
      return `https://${window.location.hostname.replace("-5173", "-5001")}`;
    }

    if ((window as CapacitorWindow).Capacitor?.isNativePlatform?.()) {
      return "https://medio-api.onrender.com";
    }
  }

  return "https://medio-api.onrender.com";
};
