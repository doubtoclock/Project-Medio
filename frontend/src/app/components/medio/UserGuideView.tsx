import React from "react";
import { BottomNav } from "./BottomNav";

export const UserGuideView: React.FC = () => {
  return (
    <div className="medio-page bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">

      {/* HEADER */}
      <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="medio-page-shell flex items-center justify-between gap-3 px-4 py-4 pr-36 sm:px-6 sm:pr-36 lg:px-8 lg:pr-36">

          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-slate-100">
            <span className="material-symbols-outlined">arrow_back</span>
          </div>

          <h2 className="text-lg font-bold leading-tight tracking-tight flex-1 text-center">
            Travel Guide
          </h2>

          <div className="size-10 shrink-0" aria-hidden="true" />

        </div>
      </header>

      {/* MAIN */}
      <main className="medio-page-shell flex-1 w-full pb-28">

        {/* INTRO */}
        <section className="grid gap-4 px-4 pt-8 pb-4 sm:px-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:items-end lg:px-8">
          <h1 className="max-w-xl text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Travel help and tips
          </h1>

          <p className="max-w-2xl text-slate-500 dark:text-slate-400 lg:justify-self-end">
            Everything you need to navigate your next adventure like a local.
          </p>
        </section>

        {/* GUIDE CARDS */}
        <section className="grid grid-cols-1 gap-4 px-4 pb-8 sm:px-6 md:grid-cols-2 lg:px-8">

          {/* CARD 1 */}
          <div className="guide-card relative group overflow-hidden rounded-xl aspect-[16/12] bg-slate-200 dark:bg-slate-800 flex flex-col justify-end p-6 border border-slate-200 dark:border-slate-800 sm:aspect-[16/10] lg:aspect-[16/9]">

            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{
                backgroundImage:
                  "linear-gradient(to top, rgba(16,23,34,0.9) 0%, rgba(16,23,34,0.2) 50%, rgba(16,23,34,0) 100%), url('https://lh3.googleusercontent.com/aida-public/AB6AXuB8slzAize78CNUi8RI5FZzIAtZvKlHr0NqFAdMdVvOoGzg5_dOEPEFeoT864l-Cv9z2ZbOt31qfLvlDZD6R0FZx-iRtnPIsWTF9WpvLO3t4DKH8squDuhYWDFsvoyvXNXAHSSkzt-FqkZz7hOM7e065zY3H6DUOoIiDBtzTQeZHwn1OIIynL0KFeS_mITUfuvR76syvG7Wd1-q4ubiIDCJ8csBzJsTZhcl7C2T8qFHg9_wDJAyYUBxnWGesF2cfCdEBBbku3X_4RU')",
              }}
            />

            <div className="relative z-10">
              <span className="inline-block px-2 py-1 rounded bg-primary text-[10px] font-bold uppercase tracking-wider text-white mb-2">
                Navigation
              </span>

              <h3 className="text-xl font-bold text-white leading-tight">
                City Navigation Tips
              </h3>

              <p className="text-slate-300 text-sm mt-2">
                Master the art of getting around without getting lost in the urban jungle.
              </p>
            </div>

          </div>

          {/* CARD 2 */}
          <div className="guide-card relative group overflow-hidden rounded-xl aspect-[16/12] bg-slate-200 dark:bg-slate-800 flex flex-col justify-end p-6 border border-slate-200 dark:border-slate-800 sm:aspect-[16/10] lg:aspect-[16/9]">

            <div
              className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-110"
              style={{
                backgroundImage:
                  "linear-gradient(to top, rgba(16,23,34,0.9) 0%, rgba(16,23,34,0.2) 50%, rgba(16,23,34,0) 100%), url('https://lh3.googleusercontent.com/aida-public/AB6AXuB_hZ9kzXYnwgGGUC2DjgZhDs559XSphtPH_mzmZeCR6uGdkKpxRiAZeyjYi2pr_iqzVZPvwOBeYV7HD5ASqeihHY6-7JqgSd8SmrGnsplAB2EVrLD5HufR51iNBNyuS2fJwqj5FD0D6yQY4Cmx4EzaTHN4W4gctawa65KJGsDtJmbCnoexugIXFgqiFchHWJFBG8_ga6HxuVPb273yTPCs66YMyhzlhRjOpSskgl6I_79yzxPCOLuilX0mFNlQxT2_vhpfCBeiG7s')",
              }}
            />

            <div className="relative z-10">
              <span className="inline-block px-2 py-1 rounded bg-primary text-[10px] font-bold uppercase tracking-wider text-white mb-2">
                Transit
              </span>

              <h3 className="text-xl font-bold text-white leading-tight">
                Public Transport Guide
              </h3>

              <p className="text-slate-300 text-sm mt-2">
                Save money and time using local trains, buses, and metro systems worldwide.
              </p>
            </div>

          </div>

        </section>

      </main>

      <BottomNav active="guide" />

    </div>
  );
};
