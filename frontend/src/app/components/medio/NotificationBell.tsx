import React, { useEffect, useRef, useState } from "react";
import { Bell } from "lucide-react";
import { apiFetch } from "../../lib/api";

type NotificationItem = {
  _id: string;
  action: string;
  value: string;
  createdAt: string;
};

type NotificationPayload = {
  user: {
    notificationsEnabled: boolean;
  };
  recentActivity: NotificationItem[];
};

const getNotificationTitle = (action: string) => {
  switch (action) {
    case "PLACE_CREATED":
      return "Saved place";
    case "PLACE_DELETED":
      return "Removed place";
    case "ROUTE_PLANNED":
      return "Route planned";
    case "MEET_SEARCHED":
      return "Meet search";
    case "PROFILE_UPDATED":
      return "Profile updated";
    default:
      return "Account activity";
  }
};

const formatNotificationTime = (dateValue: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(dateValue));

export const NotificationBell: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const bellRef = useRef<HTMLDivElement | null>(null);

  const unreadCount = notificationsEnabled ? Math.min(items.length, 9) : 0;

  const loadNotifications = async () => {
    setLoading(true);

    try {
      const res = await apiFetch("/api/auth/profile", {
        credentials: "include",
      });

      if (!res.ok) return;

      const data = (await res.json()) as NotificationPayload;
      setNotificationsEnabled(Boolean(data.user.notificationsEnabled));
      setItems((data.recentActivity || []).slice(0, 5));
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadNotifications();
  }, []);

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (
        bellRef.current &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div ref={bellRef} className="medio-notification">
      <button
        type="button"
        aria-label="Open notifications"
        aria-expanded={open}
        onClick={() => {
          setOpen((current) => !current);
          if (!open) void loadNotifications();
        }}
        className="medio-notification__button"
      >
        <Bell size={19} aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="medio-notification__badge">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="medio-notification__panel" role="status">
          <div className="medio-notification__header">
            <div>
              <p className="medio-notification__eyebrow">Notifications</p>
              <h2 className="medio-notification__title">
                {notificationsEnabled ? "Recent activity" : "Alerts are off"}
              </h2>
            </div>
            <span
              className={`medio-notification__state ${
                notificationsEnabled ? "medio-notification__state--on" : ""
              }`}
            >
              {notificationsEnabled ? "On" : "Off"}
            </span>
          </div>

          {loading ? (
            <p className="medio-notification__empty">Loading updates...</p>
          ) : !notificationsEnabled ? (
            <p className="medio-notification__empty">
              Turn notifications on from Profile settings to receive alerts.
            </p>
          ) : items.length === 0 ? (
            <p className="medio-notification__empty">
              No notifications yet.
            </p>
          ) : (
            <div className="medio-notification__list">
              {items.map((item) => (
                <div key={item._id} className="medio-notification__item">
                  <div className="medio-notification__dot" />
                  <div className="medio-notification__copy">
                    <p className="medio-notification__item-title">
                      {getNotificationTitle(item.action)}
                    </p>
                    <p className="medio-notification__item-value">
                      {item.value}
                    </p>
                    <p className="medio-notification__item-time">
                      {formatNotificationTime(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
