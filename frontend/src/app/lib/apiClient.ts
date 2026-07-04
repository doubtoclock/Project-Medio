import { apiFetch } from "./api";

// ========== Shared response types ==========

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  notificationsEnabled: boolean;
  privacyMode: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SavedPlace {
  _id: string;
  label: string;
  address: string;
  createdAt: string;
  lat?: number;
  lng?: number;
}

export interface ActivityItem {
  _id: string;
  action: string;
  value: string;
  createdAt: string;
}

export interface ProfilePayload {
  user: UserProfile;
  stats: {
    tripsCount: number;
    savedPlacesCount: number;
    activityCount: number;
  };
  savedPlaces: SavedPlace[];
  recentTrips: ActivityItem[];
  recentActivity: ActivityItem[];
}

export interface MeetResult {
  id: number;
  name: string;
  lat: number;
  lon: number;
  category?: string;
  travelTimeA: number;
  travelTimeB: number;
  difference: number;
  average: number;
  maxTravelTime?: number;
  score?: number;
  reason?: string;
}

export interface NativeGoogleResponse {
  token?: string;
}

// ========== Typed API client ==========

async function handleResponse(res: Response): Promise<any> {
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error((body as { message?: string })?.message || `Request failed: ${res.status}`);
  }
  return res.json();
}

export const apiClient = {
  auth: {
    me: (): Promise<{ authenticated: boolean }> =>
      apiFetch("/api/auth/me", { credentials: "include" }).then(handleResponse),

    profile: (): Promise<ProfilePayload> =>
      apiFetch("/api/auth/profile", { credentials: "include" }).then(handleResponse),

    updateProfile: (patch: Record<string, unknown>): Promise<ProfilePayload & { message?: string }> =>
      apiFetch("/api/auth/profile", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      }).then(handleResponse),

    logout: (): Promise<void> =>
      apiFetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      }).then(() => undefined),

    nativeLogin: (idToken: string): Promise<NativeGoogleResponse> =>
      fetch(
        `${import.meta.env.VITE_BACKEND_URL || "https://medio-api.onrender.com"}/api/auth/google/native`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken }),
        }
      ).then(handleResponse),
  },

  meet: {
    find: (body: {
      latA: number; lonA: number; latB: number; lonB: number;
      minutes: number; fromName: string; toName: string;
    }): Promise<MeetResult[]> =>
      apiFetch("/api/meet", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(handleResponse),
  },

  route: {
    plan: (body: {
      from: { lat: number; lng: number };
      to: { lat: number; lng: number };
      fromName: string;
      toName: string;
      travelMode?: string;
      localTransport?: Record<string, boolean>;
    }): Promise<unknown> =>
      apiFetch("/api/otp/route", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(handleResponse),
  },

  search: {
    locations: (query: string, signal?: AbortSignal): Promise<unknown> =>
      apiFetch(`/api/search?q=${encodeURIComponent(query)}`, { signal }).then(handleResponse),
  },

  places: {
    list: (): Promise<{ places: SavedPlace[] }> =>
      apiFetch("/api/places", { credentials: "include" }).then(handleResponse),

    create: (place: {
      label: string; address: string; lat?: number; lng?: number;
    }): Promise<{ place: SavedPlace }> =>
      apiFetch("/api/places", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(place),
      }).then(handleResponse),

    delete: (id: string): Promise<void> =>
      apiFetch(`/api/places/${id}`, {
        method: "DELETE",
        credentials: "include",
      }).then(() => undefined),
  },
};
