import { Link, useLocation } from "react-router-dom";

type NavKey = "meet" | "travel" | "guide" | "profile";

type NavItem = {
  key: NavKey;
  label: string;
  icon: string;
  to: string;
};

const navItems: NavItem[] = [
  { key: "meet", label: "Meet", icon: "map", to: "/meet" },
  { key: "travel", label: "Travel", icon: "commute", to: "/travel" },
  { key: "guide", label: "Guide", icon: "explore", to: "/guide" },
  { key: "profile", label: "Profile", icon: "person", to: "/profile" },
];

export const BottomNav = ({ active }: { active?: NavKey }) => {
  const { pathname } = useLocation();

  return (
    <nav className="medio-bottom-nav" aria-label="Primary navigation">
      <div className="medio-bottom-nav__inner">
        {navItems.map((item) => {
          const isActive = active
            ? active === item.key
            : pathname === item.to || pathname.startsWith(`${item.to}/`);

          return (
            <Link
              key={item.key}
              to={item.to}
              aria-current={isActive ? "page" : undefined}
              className={`medio-bottom-nav__item ${
                isActive ? "medio-bottom-nav__item--active" : ""
              }`}
            >
              <span
                className="material-symbols-outlined medio-bottom-nav__icon"
                style={{
                  fontVariationSettings: isActive ? "'FILL' 1" : undefined,
                }}
              >
                {item.icon}
              </span>
              <span className="medio-bottom-nav__label">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
