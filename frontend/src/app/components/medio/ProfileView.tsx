import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronDown, ChevronUp, LogOut, MapPin, Settings, Star, Trash2 } from "lucide-react";
import { BottomNav } from "./BottomNav";
import { apiClient } from "../../lib/apiClient";
import { useAuth } from "../../lib/auth/AuthContext";
import { Button } from "../design/Button";
import { Card, CardBody, CardHeader } from "../design/Card";
import { Badge } from "../design/Badge";
import { Input } from "../design/Input";
import { LoadingPage } from "../design/Loading";

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
  if (score >= 20) return { label: "Gold Member", variant: "warning" as const };
  if (score >= 8) return { label: "Silver Member", variant: "accent" as const };
  return { label: "Explorer", variant: "info" as const };
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
  const { logout } = useAuth();

  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isRecentChangesOpen, setIsRecentChangesOpen] = useState(false);

  const [editedName, setEditedName] = useState("");
  const [editedAvatarUrl, setEditedAvatarUrl] = useState("");

  const syncProfileState = useCallback((payload: ProfilePayload) => {
    setProfile(payload);
    setEditedName(payload.user.name);
    setEditedAvatarUrl(payload.user.avatarUrl || "");
  }, []);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await apiClient.auth.profile();
      syncProfileState(data);
    } catch {
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  }, [syncProfileState]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

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
      const data = await apiClient.auth.updateProfile(patch);
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
      await apiClient.places.delete(placeId);
      await loadProfile();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete place");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div
        className="min-h-screen flex flex-col"
        style={{ backgroundColor: "var(--ds-bg-primary)" }}
      >
        <LoadingPage label="Loading profile..." />
        <BottomNav active="profile" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center"
        style={{ backgroundColor: "var(--ds-bg-primary)", color: "var(--ds-text-tertiary)" }}
      >
        <div
          className="size-14 rounded-[var(--ds-radius-xl)] flex items-center justify-center"
          style={{ backgroundColor: "var(--ds-error-soft)" }}
        >
          <Settings size={24} style={{ color: "var(--ds-error)" }} />
        </div>
        <div>
          <p className="text-base font-[var(--ds-weight-semibold)]" style={{ color: "var(--ds-text-primary)" }}>
            {error || "Unable to load profile"}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--ds-text-tertiary)" }}>
            Please try again later.
          </p>
        </div>
        <Button variant="secondary" size="md" onClick={() => { void loadProfile(); }}>
          Retry
        </Button>
        <BottomNav active="profile" />
      </div>
    );
  }

  const memberTier = getMemberTier(
    profile.stats.tripsCount,
    profile.stats.savedPlacesCount
  );

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--ds-bg-primary)" }}
    >
      <style>{`
        @keyframes profile-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes profile-scale-in {
          from { opacity: 0; transform: scale(0.92); }
          to   { opacity: 1; transform: scale(1); }
        }
        .profile-enter { animation: profile-fade-up 0.45s var(--ds-ease-out) both; }
        .profile-enter-d1 { animation-delay: 0.05s; }
        .profile-enter-d2 { animation-delay: 0.1s; }
        .profile-enter-d3 { animation-delay: 0.15s; }
        .profile-enter-d4 { animation-delay: 0.2s; }
        .profile-card-enter { animation: profile-scale-in 0.35s var(--ds-ease-out) both; }
      `}</style>

      {/* Header */}
      <header
        className="sticky top-0 z-[var(--ds-z-sticky)]"
        style={{
          backgroundColor: "var(--ds-bg-primary)",
          borderBottom: "1px solid var(--ds-border-primary)",
        }}
      >
        <div className="flex items-center gap-3 px-4 py-4">
          <button
            onClick={() => navigate(-1)}
            className="size-10 rounded-[var(--ds-radius-lg)] flex items-center justify-center transition-colors"
            style={{ backgroundColor: "var(--ds-bg-tertiary)", color: "var(--ds-text-secondary)" }}
            aria-label="Go back"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <h1 className="text-lg font-[var(--ds-weight-bold)]" style={{ color: "var(--ds-text-primary)" }}>
            Profile
          </h1>
        </div>
      </header>

      {/* Content */}
      <div className="px-4 py-5 space-y-5 pb-28 sm:px-6 lg:px-8 max-w-2xl mx-auto">
        {/* Profile hero */}
        <div
          className="profile-enter relative overflow-hidden rounded-[var(--ds-radius-3xl)]"
          style={{
            backgroundColor: "var(--ds-bg-secondary)",
            border: "1px solid var(--ds-border-primary)",
          }}
        >
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              background: "radial-gradient(ellipse at 30% 20%, var(--ds-accent) 0%, transparent 60%)",
            }}
          />
          <div className="relative z-10 px-6 py-8">
            <div className="flex flex-col items-center text-center">
              <div
                className="mb-4 flex size-28 items-center justify-center overflow-hidden rounded-full"
                style={{
                  border: "3px solid var(--ds-accent-soft)",
                  backgroundColor: "var(--ds-bg-tertiary)",
                }}
              >
                {profile.user.avatarUrl ? (
                  <img
                    src={profile.user.avatarUrl}
                    alt={profile.user.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-3xl font-[var(--ds-weight-bold)]" style={{ color: "var(--ds-text-secondary)" }}>
                    {getInitials(profile.user.name)}
                  </span>
                )}
              </div>

              <h2 className="text-2xl font-[var(--ds-weight-bold)]" style={{ color: "var(--ds-text-primary)" }}>
                {profile.user.name}
              </h2>
              <p className="mt-1 text-sm" style={{ color: "var(--ds-text-secondary)" }}>
                {profile.user.email}
              </p>

              <div className="mt-4">
                <Badge variant={memberTier.variant} dot>
                  <Star size={10} />
                  {memberTier.label}
                </Badge>
              </div>

              <p className="mt-3 text-xs uppercase tracking-[var(--ds-tracking-widest)]" style={{ color: "var(--ds-text-tertiary)" }}>
                Joined {formatJoinedDate(profile.user.createdAt)}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div
            className="grid grid-cols-3 gap-3 px-4 py-4"
            style={{ borderTop: "1px solid var(--ds-border-primary)" }}
          >
            <StatCard label="Trips" value={profile.stats.tripsCount} />
            <StatCard label="Saved" value={profile.stats.savedPlacesCount} />
            <StatCard label="Activity" value={profile.stats.activityCount} />
          </div>
        </div>

        {/* Messages */}
        {(error || successMessage) && (
          <div
            className={`profile-enter rounded-[var(--ds-radius-xl)] px-4 py-3 text-sm ${
              error ? "error" : "success"
            }`}
            style={{
              backgroundColor: error ? "var(--ds-error-soft)" : "var(--ds-success-soft)",
              color: error ? "var(--ds-error-text)" : "var(--ds-success-text)",
              border: error ? "1px solid var(--ds-error)20" : "1px solid var(--ds-success)20",
            }}
          >
            {error || successMessage}
          </div>
        )}

        {/* Edit profile */}
        <div className="profile-enter profile-enter-d1">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs font-[var(--ds-weight-bold)] uppercase tracking-[var(--ds-tracking-widest)]" style={{ color: "var(--ds-accent)" }}>
                  Account
                </p>
                <h3 className="text-lg font-[var(--ds-weight-semibold)] mt-1" style={{ color: "var(--ds-text-primary)" }}>
                  Edit Profile
                </h3>
                <p className="text-sm mt-0.5" style={{ color: "var(--ds-text-tertiary)" }}>
                  Update your display details and keep your profile current.
                </p>
              </div>
            </CardHeader>
            <CardBody className="flex flex-col gap-4">
              <Input
                label="Display Name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="Your name"
              />
              <Input
                label="Avatar URL"
                value={editedAvatarUrl}
                onChange={(e) => setEditedAvatarUrl(e.target.value)}
                placeholder="https://..."
              />
              <Button
                variant="primary"
                size="md"
                fullWidth
                loading={saving}
                disabled={!hasUnsavedProfileChanges}
                onClick={handleSaveProfile}
                className="mt-1"
              >
                Save Profile
              </Button>
            </CardBody>
          </Card>
        </div>

        {/* Saved places */}
        <div className="profile-enter profile-enter-d2">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs font-[var(--ds-weight-bold)] uppercase tracking-[var(--ds-tracking-widest)]" style={{ color: "var(--ds-accent)" }}>
                  Saved Places
                </p>
                <h3 className="text-lg font-[var(--ds-weight-semibold)] mt-1" style={{ color: "var(--ds-text-primary)" }}>
                  Your Shortcuts
                </h3>
                <p className="text-sm mt-0.5" style={{ color: "var(--ds-text-tertiary)" }}>
                  Manage the places you have saved for quicker planning.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              {profile.savedPlaces.length === 0 ? (
                <EmptyState
                  title="No saved places yet"
                  description="Save places from the travel page and they will show up here."
                />
              ) : (
                <div className="flex flex-col gap-3">
                  {profile.savedPlaces.map((place) => (
                    <div
                      key={place._id}
                      className="rounded-[var(--ds-radius-lg)] px-4 py-3 flex items-start justify-between gap-3"
                      style={{ backgroundColor: "var(--ds-bg-tertiary)" }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <MapPin size={14} style={{ color: "var(--ds-accent)" }} />
                          <p className="font-[var(--ds-weight-semibold)] truncate text-sm" style={{ color: "var(--ds-text-primary)" }}>
                            {place.label}
                          </p>
                        </div>
                        <p className="mt-0.5 text-xs ml-6" style={{ color: "var(--ds-text-tertiary)" }}>
                          {place.address}
                        </p>
                        <p className="mt-1 text-[10px] ml-6 uppercase tracking-[var(--ds-tracking-wider)]" style={{ color: "var(--ds-text-placeholder)" }}>
                          Saved {formatActivityDate(place.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => void handleDeletePlace(place._id)}
                        className="shrink-0 size-8 rounded-[var(--ds-radius-md)] flex items-center justify-center transition-colors"
                        style={{ color: "var(--ds-text-tertiary)" }}
                        aria-label={`Delete ${place.label}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Recent trips */}
        <div className="profile-enter profile-enter-d3">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs font-[var(--ds-weight-bold)] uppercase tracking-[var(--ds-tracking-widest)]" style={{ color: "var(--ds-accent)" }}>
                  Trips
                </p>
                <h3 className="text-lg font-[var(--ds-weight-semibold)] mt-1" style={{ color: "var(--ds-text-primary)" }}>
                  Recent Planning
                </h3>
                <p className="text-sm mt-0.5" style={{ color: "var(--ds-text-tertiary)" }}>
                  The latest route and meet searches from your account.
                </p>
              </div>
            </CardHeader>
            <CardBody>
              {profile.recentTrips.length === 0 ? (
                <EmptyState
                  title="No trips yet"
                  description="Plan a route or search a meeting point and it will appear here."
                />
              ) : (
                <div className="flex flex-col gap-2">
                  {profile.recentTrips.map((trip) => (
                    <ActivityCard key={trip._id} item={trip} />
                  ))}
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* Preferences */}
        <div className="profile-enter profile-enter-d4">
          <Card>
            <CardHeader>
              <div>
                <p className="text-xs font-[var(--ds-weight-bold)] uppercase tracking-[var(--ds-tracking-widest)]" style={{ color: "var(--ds-accent)" }}>
                  Preferences
                </p>
                <h3 className="text-lg font-[var(--ds-weight-semibold)] mt-1" style={{ color: "var(--ds-text-primary)" }}>
                  App Settings
                </h3>
                <p className="text-sm mt-0.5" style={{ color: "var(--ds-text-tertiary)" }}>
                  Control how MEDIO handles alerts and profile visibility.
                </p>
              </div>
            </CardHeader>
            <CardBody className="flex flex-col gap-3">
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
            </CardBody>
          </Card>
        </div>

        {/* Recent activity */}
        <div className="profile-enter profile-enter-d4">
          <Card>
            <button
              onClick={() => setIsRecentChangesOpen((current) => !current)}
              className="flex w-full items-center justify-between px-5 py-5 text-left transition-colors"
              style={{ color: "var(--ds-text-primary)" }}
              aria-expanded={isRecentChangesOpen}
              aria-controls="recent-changes-panel"
            >
              <div>
                <p className="text-xs font-[var(--ds-weight-bold)] uppercase tracking-[var(--ds-tracking-widest)]" style={{ color: "var(--ds-accent)" }}>
                  Activity
                </p>
                <h3 className="text-lg font-[var(--ds-weight-semibold)] mt-1" style={{ color: "var(--ds-text-primary)" }}>
                  Recent Changes
                </h3>
                <p className="text-sm mt-0.5" style={{ color: "var(--ds-text-tertiary)" }}>
                  A quick log of what has happened on your account.
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3 ml-4">
                <Badge variant="accent">
                  {profile.recentActivity.length}
                </Badge>
                {isRecentChangesOpen ? (
                  <ChevronUp size={16} style={{ color: "var(--ds-text-tertiary)" }} />
                ) : (
                  <ChevronDown size={16} style={{ color: "var(--ds-text-tertiary)" }} />
                )}
              </div>
            </button>

            {isRecentChangesOpen && (
              <div
                id="recent-changes-panel"
                className="px-5 py-5"
                style={{ borderTop: "1px solid var(--ds-border-primary)" }}
              >
                <div className="flex flex-col gap-2">
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
          </Card>
        </div>

        {/* Logout */}
        <div className="profile-enter profile-enter-d4">
          <Button
            variant="danger"
            size="lg"
            fullWidth
            onClick={() => void handleLogout()}
          >
            <LogOut size={16} />
            Log Out
          </Button>
        </div>
      </div>

      <BottomNav active="profile" />
    </div>
  );
};

const StatCard = ({ label, value }: { label: string; value: number }) => (
  <div
    className="rounded-[var(--ds-radius-lg)] px-3 py-4 text-center"
    style={{ backgroundColor: "var(--ds-bg-tertiary)" }}
  >
    <p className="text-2xl font-[var(--ds-weight-bold)]" style={{ color: "var(--ds-text-primary)" }}>
      {value}
    </p>
    <p className="mt-1 text-[11px] uppercase tracking-[var(--ds-tracking-wider)]" style={{ color: "var(--ds-text-tertiary)" }}>
      {label}
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
  <div
    className="flex items-center justify-between gap-4 rounded-[var(--ds-radius-lg)] px-4 py-3"
    style={{ backgroundColor: "var(--ds-bg-tertiary)" }}
  >
    <div className="min-w-0">
      <p className="text-sm font-[var(--ds-weight-medium)]" style={{ color: "var(--ds-text-primary)" }}>
        {title}
      </p>
      <p className="text-xs mt-0.5" style={{ color: "var(--ds-text-tertiary)" }}>
        {description}
      </p>
    </div>
    <button
      type="button"
      aria-label={`Toggle ${title}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onToggle(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-all duration-[var(--ds-duration-normal)]`}
      style={{
        backgroundColor: checked ? "var(--ds-accent)" : "var(--ds-bg-elevated)",
        border: checked ? "none" : "1px solid var(--ds-border-primary)",
      }}
    >
      <span
        className={`absolute top-1 size-5 rounded-full transition-all duration-[var(--ds-duration-normal)]`}
        style={{
          backgroundColor: checked ? "var(--ds-white)" : "var(--ds-text-tertiary)",
          left: checked ? "calc(100% - 24px)" : "4px",
        }}
      />
    </button>
  </div>
);

const ActivityCard = ({ item }: { item: ActivityItem }) => (
  <div
    className="rounded-[var(--ds-radius-lg)] px-4 py-3"
    style={{ backgroundColor: "var(--ds-bg-tertiary)" }}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-[var(--ds-weight-medium)]" style={{ color: "var(--ds-text-primary)" }}>
          {getActivityLabel(item.action)}
        </p>
        <p className="mt-0.5 text-xs" style={{ color: "var(--ds-text-tertiary)" }}>
          {item.value}
        </p>
      </div>
      <Badge variant="accent">
        {item.action.replaceAll("_", " ")}
      </Badge>
    </div>
    <p className="mt-2 text-[10px] uppercase tracking-[var(--ds-tracking-wider)]" style={{ color: "var(--ds-text-placeholder)" }}>
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
  <div
    className="rounded-[var(--ds-radius-lg)] px-4 py-6 text-center"
    style={{
      border: "1px dashed var(--ds-border-secondary)",
      backgroundColor: "var(--ds-bg-tertiary)",
    }}
  >
    <p className="text-sm font-[var(--ds-weight-semibold)]" style={{ color: "var(--ds-text-primary)" }}>
      {title}
    </p>
    <p className="mt-1 text-xs" style={{ color: "var(--ds-text-tertiary)" }}>
      {description}
    </p>
  </div>
);
