const CANONICAL_FRONTEND_URL = "https://medio.mywire.org";
const LEGACY_FRONTEND_HOST = ["project-medio-rpcz", "vercel", "app"].join(".");

const trimTrailingSlash = (url) => url.replace(/\/+$/, "");

export const getFrontendBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_FRONTEND_URL || import.meta.env.VITE_SHARE_BASE_URL;
  const browserOrigin = window.location.origin;

  if (configuredUrl) {
    return trimTrailingSlash(configuredUrl);
  }

  try {
    if (new URL(browserOrigin).hostname === LEGACY_FRONTEND_HOST) {
      return CANONICAL_FRONTEND_URL;
    }
  } catch {
    return CANONICAL_FRONTEND_URL;
  }

  return browserOrigin;
};

export const getFrontendUrl = (path = "/") =>
  new URL(path, `${getFrontendBaseUrl()}/`).toString();
