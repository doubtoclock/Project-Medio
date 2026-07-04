import { getBackendUrl } from "./backend";

const AUTH_TOKEN_KEY = "medio_auth_token";

export const getAuthToken = () => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token) => {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {

  }
};

export const clearAuthToken = () => {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {

  }
};

export const apiFetch = (path, init = {}) => {
  const baseUrl = getBackendUrl();
  const url = `${baseUrl}${path}`;

  const headers = {
    ...(init.headers || {}),
  };

  const token = getAuthToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: "include",
  });
};
