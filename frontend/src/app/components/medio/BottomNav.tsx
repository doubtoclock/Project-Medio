import React from "react";
import { NavLink } from "react-router-dom";
import { MapPin, Navigation, Book, User } from "lucide-react";

/* ---------------- BOTTOM NAV ---------------- */

export const BottomNav = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800 pb-safe pt-2 px-6 h-20 flex justify-around items-start z-50">
      <NavItem to="/meet" label="Meet" icon={<MapPin size={24} />} />
      <NavItem to="/travel" label="Travel" icon={<Navigation size={24} />} />
      <NavItem to="/guide" label="Guide" icon={<Book size={24} />} />
      {/* 👤 PROFILE (NEW) */}
      <NavItem to="/profile" label="Profile" icon={<User size={24} />} />
    </div>
  );
};

/* ---------------- NAV ITEM ---------------- */

const NavItem = ({
  to,
  icon,
  label,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
}) => {
  return (
    <NavLink
      to={to}
      className={({ isActive }: { isActive: boolean }) =>
        `flex flex-col items-center gap-1 transition-colors duration-300 ${
          isActive ? "text-white" : "text-zinc-600 hover:text-zinc-400"
        }`
      }
    >
      {({ isActive }: { isActive: boolean }) => (
        <>
          <div
            className={`p-1.5 rounded-full transition-all duration-300 ${
              isActive ? "bg-zinc-800 -translate-y-0.5" : ""
            }`}
          >
            {icon}
          </div>
          <span className="text-[10px] font-medium uppercase tracking-wider">
            {label}
          </span>
        </>
      )}
    </NavLink>
  );
};
