export const getBackendUrl = () => {
  if (typeof window !== "undefined" && window.location.hostname.includes("github.dev")) {
    return `https://${window.location.hostname.replace("-5173", "-5001")}`;
  }

  return "http://localhost:5001";
};
