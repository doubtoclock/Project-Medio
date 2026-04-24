import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getBackendUrl } from "../../lib/backend";

type SavedPlace = {
  _id: string;
  label: string;
  address: string;
  createdAt: string;
};

type ActivityItem = {
  _id: string;
  action: string;
  value: string;
  createdAt: string;
};

type ProfilePayload = {
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    notificationsEnabled: boolean;
    privacyMode: boolean;
    createdAt: string;
    updatedAt: string;
  };
  stats: {
    tripsCount: number;
    savedPlacesCount: number;
    activityCount: number;
  };
  savedPlaces: SavedPlace[];
  recentTrips: ActivityItem[];
  recentActivity: ActivityItem[];
};

const formatJoinedDate = (dateValue: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(new Date(dateValue));

const formatActivityDate = (dateValue: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateValue));

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "M";

const getMemberTier = (tripsCount: number, savedPlacesCount: number) => {
  const score = tripsCount * 2 + savedPlacesCount;

  if (score >= 20) return "Gold Member";
  if (score >= 8) return "Silver Member";
  return "Explorer";
};

const getActivityLabel = (action: string) => {
  switch (action) {
    case "PLACE_CREATED":
      return "Saved place";
    case "PLACE_DELETED":
      return "Removed place";
    case "ROUTE_PLANNED":
      return "Planned route";
    case "MEET_SEARCHED":
      return "Searched meet point";
    case "PROFILE_UPDATED":
      return "Updated profile";
    default:
      return "Activity";
  }
};

export const ProfileView: React.FC = () => {
  const navigate = useNavigate();
  const backendURL = getBackendUrl();

  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isRecentChangesOpen, setIsRecentChangesOpen] = useState(false);

  const [editedName, setEditedName] = useState("");
  const [editedAvatarUrl, setEditedAvatarUrl] = useState("");

  const syncProfileState = (payload: ProfilePayload) => {
    setProfile(payload);
    setEditedName(payload.user.name);
    setEditedAvatarUrl(payload.user.avatarUrl || "");
  };

  const loadProfile = async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${backendURL}/api/auth/profile`, {
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to load profile");
      }

      const data = (await res.json()) as ProfilePayload;
      syncProfileState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProfile();
  }, []);

  const hasUnsavedProfileChanges = useMemo(() => {
    if (!profile) return false;

    return (
      editedName.trim() !== profile.user.name ||
      editedAvatarUrl.trim() !== (profile.user.avatarUrl || "")
    );
  }, [editedAvatarUrl, editedName, profile]);

  const updateProfile = async (patch: Record<string, unknown>) => {
    setSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const res = await fetch(`${backendURL}/api/auth/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(patch),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.message || "Failed to update profile");
      }

      const data = (await res.json()) as ProfilePayload & { message?: string };
      syncProfileState(data);
      setSuccessMessage(data.message || "Profile updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    await updateProfile({
      name: editedName.trim(),
      avatarUrl: editedAvatarUrl.trim() || null,
    });
  };

  const handleTogglePreference = async (
    key: "notificationsEnabled" | "privacyMode",
    value: boolean
  ) => {
    await updateProfile({ [key]: value });
  };

  const handleDeletePlace = async (placeId: string) => {
    try {
      const res = await fetch(`${backendURL}/api/places/${placeId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error("Failed to delete place");
      }

      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete place");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${backendURL}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      navigate("/login", { replace: true });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light text-slate-500 dark:bg-background-dark dark:text-slate-300">
        Loading profile...
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background-light px-6 text-center text-slate-500 dark:bg-background-dark dark:text-slate-300">
        {error || "Unable to load profile right now."}
      </div>
    );
  }

  const memberTier = getMemberTier(
    profile.stats.tripsCount,
    profile.stats.savedPlacesCount
  );

  return (
    <div className="min-h-screen bg-background-light font-display text-slate-900 dark:bg-background-dark dark:text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col pb-24">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-background-light/90 px-4 py-4 backdrop-blur-md dark:border-slate-800 dark:bg-background-dark/90">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="flex size-10 items-center justify-center rounded-full bg-slate-200 text-slate-700 transition hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>

            <h1 className="text-lg font-bold">Profile</h1>

            <button
              onClick={handleSaveProfile}
              disabled={!hasUnsavedProfileChanges || saving}
              className="rounded-full bg-primary px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white transition disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving" : "Save"}
            </button>
          </div>
        </header>

        <main className="flex-1 space-y-5 px-4 py-5">
          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="bg-[linear-gradient(135deg,rgba(13,108,242,0.18),rgba(8,15,30,0.96))] px-6 py-8">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex size-28 items-center justify-center overflow-hidden rounded-full border-4 border-white/20 bg-slate-950/50 text-3xl font-bold text-white">
                  {profile.user.avatarUrl ? (
                    <img
                      src={profile.user.avatarUrl}
                      alt={profile.user.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span>{getInitials(profile.user.name)}</span>
                  )}
                </div>

                <h2 className="text-2xl font-bold text-white">
                  {profile.user.name}
                </h2>
                <p className="mt-1 text-sm text-slate-200">
                  {profile.user.email}
                </p>

                <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan-100">
                  <span className="material-symbols-outlined text-sm">
                    verified
                  </span>
                  {memberTier}
                </div>

                <p className="mt-3 text-xs uppercase tracking-[0.22em] text-slate-300">
                  Joined {formatJoinedDate(profile.user.createdAt)}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 px-4 py-4">
              <StatCard label="Trips" value={profile.stats.tripsCount} />
              <StatCard label="Saved" value={profile.stats.savedPlacesCount} />
              <StatCard label="Activity" value={profile.stats.activityCount} />
            </div>
          </section>

          {(error || successMessage) && (
            <div
              className={`rounded-2xl border px-4 py-3 text-sm ${
                error
                  ? "border-red-500/30 bg-red-500/10 text-red-200"
                  : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {error || successMessage}
            </div>
          )}

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionTitle
              eyebrow="Account"
              title="Edit Profile"
              description="Update your display details and keep your profile current."
            />

            <div className="mt-5 space-y-4">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Display Name
                </span>
                <input
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="Your name"
                />
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Avatar URL
                </span>
                <input
                  value={editedAvatarUrl}
                  onChange={(e) => setEditedAvatarUrl(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-primary dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                  placeholder="https://..."
                />
              </label>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionTitle
              eyebrow="Saved Places"
              title="Your Shortcuts"
              description="Manage the places you have saved for quicker planning."
            />

            <div className="mt-5 space-y-3">
              {profile.savedPlaces.length === 0 ? (
                <EmptyState
                  title="No saved places yet"
                  description="Save places from the travel page and they will show up here."
                />
              ) : (
                profile.savedPlaces.map((place) => (
                  <div
                    key={place._id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">
                          {place.label}
                        </p>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                          {place.address}
                        </p>
                        <p className="mt-2 text-xs uppercase tracking-[0.18em] text-slate-400">
                          Saved {formatActivityDate(place.createdAt)}
                        </p>
                      </div>

                      <button
                        onClick={() => void handleDeletePlace(place._id)}
                        className="rounded-full border border-red-500/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-red-300 transition hover:bg-red-500/10"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionTitle
              eyebrow="Trips"
              title="Recent Planning"
              description="The latest route and meet searches from your account."
            />

            <div className="mt-5 space-y-3">
              {profile.recentTrips.length === 0 ? (
                <EmptyState
                  title="No trips yet"
                  description="Plan a route or search a meeting point and it will appear here."
                />
              ) : (
                profile.recentTrips.map((trip) => (
                  <ActivityCard key={trip._id} item={trip} />
                ))
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <SectionTitle
              eyebrow="Preferences"
              title="App Settings"
              description="Control how MEDIO handles alerts and profile visibility."
            />

            <div className="mt-5 space-y-3">
              <PreferenceRow
                title="Notifications"
                description="Keep travel reminders and route updates enabled."
                checked={profile.user.notificationsEnabled}
                onToggle={(value) =>
                  void handleTogglePreference("notificationsEnabled", value)
                }
              />
              <PreferenceRow
                title="Private Profile"
                description="Hide your profile details when privacy mode is enabled."
                checked={profile.user.privacyMode}
                onToggle={(value) =>
                  void handleTogglePreference("privacyMode", value)
                }
              />
            </div>
          </section>

          <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <button
              onClick={() => setIsRecentChangesOpen((current) => !current)}
              className="flex w-full items-center justify-between px-5 py-5 text-left transition hover:bg-slate-50 dark:hover:bg-slate-800/40"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
                  Activity
                </p>
                <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                  Recent Changes
                </h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  A quick log of what has happened on your account.
                </p>
              </div>

              <div className="ml-4 flex shrink-0 items-center gap-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
                  {profile.recentActivity.length}
                </span>
                <span className="material-symbols-outlined text-slate-400">
                  {isRecentChangesOpen ? "expand_less" : "expand_more"}
                </span>
              </div>
            </button>

            {isRecentChangesOpen && (
              <div className="border-t border-slate-200 px-5 py-5 dark:border-slate-800">
                <div className="space-y-3">
                  {profile.recentActivity.length === 0 ? (
                    <EmptyState
                      title="No activity yet"
                      description="Start using Medio and your latest account actions will show up here."
                    />
                  ) : (
                    profile.recentActivity.map((item) => (
                      <ActivityCard key={item._id} item={item} />
                    ))
                  )}
                </div>
              </div>
            )}
          </section>

          <button
            onClick={() => void handleLogout()}
            className="w-full rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-4 text-sm font-semibold uppercase tracking-[0.18em] text-red-200 transition hover:bg-red-500/20"
          >
            Log Out
          </button>
        </main>

        <nav className="fixed bottom-0 left-0 right-0 z-30 flex items-center border-t border-slate-200 bg-background-light/90 px-6 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/85">
          <Link to="/meet" className="flex flex-1 flex-col items-center text-slate-400">
            <span className="material-symbols-outlined">map</span>
            <span className="text-[10px]">Meet</span>
          </Link>

          <Link to="/travel" className="flex flex-1 flex-col items-center text-slate-400">
            <span className="material-symbols-outlined">commute</span>
            <span className="text-[10px]">Travel</span>
          </Link>

          <Link to="/guide" className="flex flex-1 flex-col items-center text-slate-400">
            <span className="material-symbols-outlined">explore</span>
            <span className="text-[10px]">Guide</span>
          </Link>

          <Link to="/profile" className="flex flex-1 flex-col items-center text-primary">
            <span className="material-symbols-outlined">person</span>
            <span className="text-[10px] font-bold">Profile</span>
          </Link>
        </nav>
      </div>
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div className="rounded-2xl bg-slate-50 px-3 py-4 text-center dark:bg-slate-800">
    <p className="text-xl font-bold text-slate-900 dark:text-white">{value}</p>
    <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-slate-400">
      {label}
    </p>
  </div>
);

const SectionTitle = ({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary/80">
      {eyebrow}
    </p>
    <h3 className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
      {title}
    </h3>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
      {description}
    </p>
  </div>
);

const PreferenceRow = ({
  title,
  description,
  checked,
  onToggle,
}: {
  title: string;
  description: string;
  checked: boolean;
  onToggle: (value: boolean) => void;
}) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
    <div>
      <p className="font-medium text-slate-900 dark:text-white">{title}</p>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>

    <button
      onClick={() => onToggle(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition ${
        checked ? "bg-primary" : "bg-slate-300 dark:bg-slate-700"
      }`}
    >
      <span
        className={`absolute top-1 size-5 rounded-full bg-white transition ${
          checked ? "left-6" : "left-1"
        }`}
      />
    </button>
  </div>
);

const ActivityCard = ({ item }: { item: ActivityItem }) => (
  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="font-semibold text-slate-900 dark:text-white">
          {getActivityLabel(item.action)}
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {item.value}
        </p>
      </div>
      <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">
        {item.action.replaceAll("_", " ")}
      </span>
    </div>

    <p className="mt-3 text-xs uppercase tracking-[0.18em] text-slate-400">
      {formatActivityDate(item.createdAt)}
    </p>
  </div>
);

const EmptyState = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-center dark:border-slate-700">
    <p className="font-semibold text-slate-900 dark:text-white">{title}</p>
    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
      {description}
    </p>
  </div>
);
