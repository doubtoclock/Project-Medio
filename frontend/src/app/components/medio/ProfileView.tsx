import React from "react";
import { Link } from "react-router-dom";

export const ProfileView: React.FC = () => {
  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex justify-center">

      {/* Responsive container */}
      <div className="flex flex-col w-full max-w-md md:max-w-xl lg:max-w-3xl">

        {/* HEADER */}
        <header className="flex items-center justify-between px-4 md:px-6 py-5">

          <button className="flex items-center justify-center size-10 rounded-full bg-slate-200 dark:bg-slate-800">
            <span className="material-symbols-outlined">arrow_back</span>
          </button>

          <h1 className="text-lg md:text-xl font-bold">Profile</h1>

          <button className="flex items-center justify-center size-10 rounded-full bg-slate-200 dark:bg-slate-800">
            <span className="material-symbols-outlined">settings_suggest</span>
          </button>

        </header>

        {/* PROFILE HERO */}
        <div className="flex flex-col items-center px-6 py-4">

          <div className="relative">

            <div className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-primary/20 p-1">

              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuByZqK4RvFL7_yG7YaGLIejrIQ83PkCh3lY4jeRCa_5YOUsXY0UUHAX-fkEvpIr4pQGULeJow9-gw7FZdfgKJUGsYdrKbcZYGxknoTrDbIPcvI2FX9waDVHBYqyG4scjoed9lHIHCy_8rOhkvSjilMYgE1aWrgvcnK6s216cMV4LFvU_iS30lwzUMffPkl2Fq-nv84oYutGBaxcUs4myjwd_X2G2q98-RuURue4iHCG00IOp05qF0wqsFH1erR6cIgVu3AZ7Mnjouo"
                alt="User Avatar"
                className="rounded-full object-cover w-full h-full"
              />

            </div>

            <div className="absolute bottom-1 right-1 bg-primary text-white size-8 rounded-full flex items-center justify-center border-4 border-background-dark">
              <span className="material-symbols-outlined text-sm">edit</span>
            </div>

          </div>

          <div className="text-center mt-4">

            <h2 className="text-xl md:text-2xl font-bold">Alex Johnson</h2>

            <div className="inline-flex items-center gap-1 px-3 py-1 mt-2 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
              <span className="material-symbols-outlined text-xs">verified</span>
              Gold Member
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
              Joined January 2023
            </p>

          </div>

        </div>

        {/* STATS */}
        <div className="flex justify-around px-4 md:px-8 py-6 border-b border-slate-200 dark:border-slate-800">

          <div className="text-center">
            <p className="text-lg font-bold">24</p>
            <p className="text-xs text-slate-500">Trips</p>
          </div>

          <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>

          <div className="text-center">
            <p className="text-lg font-bold">128</p>
            <p className="text-xs text-slate-500">Saved</p>
          </div>

          <div className="w-px h-8 bg-slate-200 dark:bg-slate-800"></div>

          <div className="text-center">
            <p className="text-lg font-bold">4.9</p>
            <p className="text-xs text-slate-500">Rating</p>
          </div>

        </div>

        {/* MENU */}
        <div className="flex-1 px-4 md:px-8 py-6 space-y-8">

          {/* ACCOUNT */}
          <div>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Account
            </h3>

            <div className="space-y-2">

              <MenuItem icon="bookmark" label="Saved Places" />
              <MenuItem icon="map" label="Past Trips" />
              <MenuItem icon="payments" label="Payment Methods" />

            </div>

          </div>

          {/* PREFERENCES */}
          <div>

            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
              Preferences
            </h3>

            <div className="space-y-2">

              <MenuItem icon="notifications" label="Notifications" />
              <MenuItem icon="security" label="Privacy & Security" />

            </div>

          </div>

        </div>

        {/* BOTTOM NAV */}
        <nav className="sticky bottom-0 border-t border-slate-200 dark:border-slate-800 backdrop-blur-md px-4 py-2 flex justify-between">

          <Link to="/meet" className="flex flex-col items-center text-slate-400">
            <span className="material-symbols-outlined">map</span>
            <span className="text-[10px]">Meet</span>
          </Link>

          <Link to="/travel" className="flex flex-col items-center text-slate-400">
            <span className="material-symbols-outlined">commute</span>
            <span className="text-[10px]">Travel</span>
          </Link>

          <Link to="/guide" className="flex flex-col items-center text-slate-400">
            <span className="material-symbols-outlined">explore</span>
            <span className="text-[10px]">Guide</span>
          </Link>

          <Link to="/profile" className="flex flex-col items-center text-primary">
            <span className="material-symbols-outlined">person</span>
            <span className="text-[10px] font-bold">Profile</span>
          </Link>

        </nav>

      </div>

    </div>
  );
};

/* Menu item component */
const MenuItem = ({ icon, label }: { icon: string; label: string }) => (
  <button className="flex items-center justify-between w-full p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition">

    <div className="flex items-center gap-4">

      <div className="size-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
        <span className="material-symbols-outlined">{icon}</span>
      </div>

      <span className="font-medium">{label}</span>

    </div>

    <span className="material-symbols-outlined text-slate-400">
      chevron_right
    </span>

  </button>
);