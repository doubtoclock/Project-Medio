import { getBackendUrl } from "./backend";

const AUTH_TOKEN_KEY = "medio_auth_token";

export const getAuthToken = (): string | null => {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setAuthToken = (token: string) => {
  try {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  } catch {
    // localStorage not available
  }
};

export const clearAuthToken = () => {
  try {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  } catch {
    // localStorage not available
  }
};

export const apiFetch = (
  path: string,
  init: RequestInit = {}
): Promise<Response> => {
  const baseUrl = getBackendUrl();
  const url = `${baseUrl}${path}`;

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
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
