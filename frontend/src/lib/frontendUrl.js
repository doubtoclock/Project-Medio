const CANONICAL_FRONTEND_URL = "https://www.medio.mywire.org";
const LEGACY_FRONTEND_HOST = ["project-medio-rpcz", "vercel", "app"].join(".");
const APEX_FRONTEND_HOST = "medio.mywire.org";

const trimTrailingSlash = (url) => url.replace(/\/+$/, "");

export const getFrontendBaseUrl = () => {
  const configuredUrl = import.meta.env.VITE_FRONTEND_URL || import.meta.env.VITE_SHARE_BASE_URL;
  const browserOrigin = window.location.origin;

  if (configuredUrl) {
    const configured = new URL(configuredUrl);
    if (configured.hostname === APEX_FRONTEND_HOST) {
      configured.hostname = `www.${APEX_FRONTEND_HOST}`;
    }
    return trimTrailingSlash(configured.toString());
  }

  try {
    const browserUrl = new URL(browserOrigin);
    if (browserUrl.hostname === LEGACY_FRONTEND_HOST) {
      return CANONICAL_FRONTEND_URL;
    }
    if (browserUrl.hostname === APEX_FRONTEND_HOST) {
      return CANONICAL_FRONTEND_URL;
    }
  } catch {
    return CANONICAL_FRONTEND_URL;
  }

  return browserOrigin;
};

export const getFrontendUrl = (path = "/") =>
  new URL(path, `${getFrontendBaseUrl()}/`).toString();
