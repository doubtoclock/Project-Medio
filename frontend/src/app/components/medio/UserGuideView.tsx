import React from "react";
import { BottomNav } from "./BottomNav";

export const UserGuideView: React.FC = () => {
  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--ds-bg-primary)", color: "var(--ds-text-primary)" }}
    >
      <style>{`
        @keyframes guide-fade-up {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes guide-scale-in {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        .guide-enter {
          animation: guide-fade-up 0.5s var(--ds-ease-out) both;
        }
        .guide-enter-d1 { animation-delay: 0.1s; }
        .guide-enter-d2 { animation-delay: 0.2s; }
        .guide-card-enter {
          animation: guide-scale-in 0.4s var(--ds-ease-out) both;
        }
      `}</style>

      {/* HEADER */}
      <header
        className="sticky top-0 z-[var(--ds-z-sticky)]"
        style={{
          backgroundColor: "var(--ds-bg-primary)",
          borderBottom: "1px solid var(--ds-border-primary)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <h1
            className="text-lg font-[var(--ds-weight-bold)] tracking-tight"
            style={{ color: "var(--ds-text-primary)" }}
          >
            Travel Guide
          </h1>
          <div
            className="size-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: "var(--ds-bg-tertiary)" }}
          >
            <span className="text-sm font-[var(--ds-weight-bold)]" style={{ color: "var(--ds-accent)" }}>
              M
            </span>
          </div>
        </div>
      </header>

      {/* MAIN */}
      <main className="flex-1 w-full pb-28">
        {/* INTRO */}
        <section className="px-4 pt-8 pb-6 sm:px-6 lg:px-8 guide-enter">
          <div className="max-w-2xl">
            <p
              className="text-xs font-[var(--ds-weight-bold)] uppercase tracking-[var(--ds-tracking-widest)] mb-2"
              style={{ color: "var(--ds-accent)" }}
            >
              Getting Started
            </p>
            <h1
              className="text-3xl font-[var(--ds-weight-bold)] leading-tight tracking-tight sm:text-4xl"
              style={{ color: "var(--ds-text-primary)" }}
            >
              Travel help and tips
            </h1>
            <p
              className="mt-3 max-w-xl text-sm"
              style={{ color: "var(--ds-text-tertiary)" }}
            >
              Everything you need to navigate your next adventure like a local.
            </p>
          </div>
        </section>

        {/* GUIDE CARDS */}
        <section className="px-4 pb-8 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 guide-enter guide-enter-d1">
            <GuideCard
              tag="Navigation"
              title="City Navigation Tips"
              description="Master the art of getting around without getting lost in the urban jungle."
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuB8slzAize78CNUi8RI5FZzIAtZvKlHr0NqFAdMdVvOoGzg5_dOEPEFeoT864l-Cv9z2ZbOt31qfLvlDZD6R0FZx-iRtnPIsWTF9WpvLO3t4DKH8squDuhYWDFsvoyvXNXAHSSkzt-FqkZz7hOM7e065zY3H6DUOoIiDBtzTQeZHwn1OIIynL0KFeS_mITUfuvR76syvG7Wd1-q4ubiIDCJ8csBzJsTZhcl7C2T8qFHg9_wDJAyYUBxnWGesF2cfCdEBBbku3X_4RU"
            />
            <GuideCard
              tag="Transit"
              title="Public Transport Guide"
              description="Save money and time using local trains, buses, and metro systems worldwide."
              image="https://lh3.googleusercontent.com/aida-public/AB6AXuB_hZ9kzXYnwgGGUC2DjgZhDs559XSphtPH_mzmZeCR6uGdkKpxRiAZeyjYi2pr_iqzVZPvwOBeYV7HD5ASqeihHY6-7JqgSd8SmrGnsplAB2EVrLD5HufR51iNBNyuS2fJwqj5FD0D6yQY4Cmx4EzaTHN4W4gctawa65KJGsDtJmbCnoexugIXFgqiFchHWJFBG8_ga6HxuVPb273yTPCs66YMyhzlhRjOpSskgl6I_79yzxPCOLuilX0mFNlQxT2_vhpfCBeiG7s"
            />
          </div>
        </section>
      </main>

      <BottomNav active="guide" />
    </div>
  );
};

function GuideCard({
  tag,
  title,
  description,
  image,
}: {
  tag: string;
  title: string;
  description: string;
  image: string;
}) {
  return (
    <div
      className="guide-card-enter relative group overflow-hidden rounded-[var(--ds-radius-2xl)] aspect-[16/12] sm:aspect-[16/10] lg:aspect-[16/9] flex flex-col justify-end p-6"
      style={{
        backgroundColor: "var(--ds-bg-secondary)",
        border: "1px solid var(--ds-border-primary)",
      }}
    >
      <div
        className="absolute inset-0 bg-cover bg-center transition-transform duration-[var(--ds-duration-slower)] group-hover:scale-110"
        style={{
          backgroundImage: `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 50%, rgba(0,0,0,0) 100%), url('${image}')`,
        }}
      />

      <div className="relative z-10">
        <span
          className="inline-block px-2.5 py-1 rounded-[var(--ds-radius-md)] text-[10px] font-[var(--ds-weight-bold)] uppercase tracking-[var(--ds-tracking-wider)] mb-3"
          style={{
            backgroundColor: "var(--ds-accent)",
            color: "var(--ds-accent-text)",
          }}
        >
          {tag}
        </span>

        <h3
          className="text-xl font-[var(--ds-weight-bold)] leading-tight"
          style={{ color: "var(--ds-white)" }}
        >
          {title}
        </h3>

        <p
          className="text-sm mt-2 max-w-sm"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}
