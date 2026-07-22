import { apiFetch } from "./api";
import { getBackendUrl } from "./backend";

async function handleResponse(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const apiClient = {
  auth: {
    me: () =>
      apiFetch("/api/auth/me").then(handleResponse),

    profile: () =>
      apiFetch("/api/auth/profile").then(handleResponse),

    updateProfile: (patch) =>
      apiFetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then(handleResponse),

    logout: () =>
      apiFetch("/api/auth/logout", {
        method: "POST",
      }).then(() => undefined),

    deleteAccount: () =>
      apiFetch("/api/auth/account", {
        method: "DELETE",
      }).then(() => undefined),

    nativeLogin: (idToken) =>
      fetch(
        `${getBackendUrl()}/api/auth/google/native`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        }
      ).then(handleResponse),
  },

  meet: {
    find: (body) =>
      apiFetch("/api/meet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(handleResponse),
  },

  route: {
    plan: (body, init = {}) =>
      apiFetch("/api/otp/route", {
        ...init,
        method: "POST",
        headers: { "Content-Type": "application/json", ...(init.headers || {}) },
        body: JSON.stringify(body),
      }).then(handleResponse),
  },

  share: {
    create: (body) =>
      apiFetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(handleResponse),

    get: (shareId) =>
      apiFetch(`/api/share/${shareId}`).then(handleResponse),
  },

  search: {
    locations: (query, signal) =>
      apiFetch(`/api/search?q=${encodeURIComponent(query)}`, { signal }).then(handleResponse),
  },

  places: {
    list: () =>
      apiFetch("/api/places").then(handleResponse),

    create: (place) =>
      apiFetch("/api/places", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(place),
      }).then(handleResponse),

    delete: (id) =>
      apiFetch(`/api/places/${id}`, {
        method: "DELETE",
      }).then(() => undefined),
  },
};
