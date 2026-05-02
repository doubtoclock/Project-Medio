export const getBackendUrl = () => {
  const configuredUrl = import.meta.env.VITE_BACKEND_URL;

  if (configuredUrl) {
    return configuredUrl.replace(/\/+$/, "");
  }

  if (typeof window !== "undefined" && window.location.hostname.includes("github.dev")) {
    return `https://${window.location.hostname.replace("-5173", "-5001")}`;
  }

  return "http://localhost:5001";
};
