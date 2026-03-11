import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const SplashScreen: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate("/login");
    }, 3000); // splash duration (3 seconds)

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="bg-background-light dark:bg-background-dark font-display text-slate-900 dark:text-slate-100 antialiased overflow-hidden min-h-screen">
      
      <div className="relative flex h-screen w-full flex-col items-center justify-center bg-background-light dark:bg-background-dark overflow-hidden">

        {/* Background Pattern */}
        <div className="absolute inset-0 topo-pattern pointer-events-none"></div>

        {/* Ambient Light */}
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-primary/10 rounded-full blur-[120px]"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-primary/10 rounded-full blur-[120px]"></div>

        <div className="relative z-10 flex flex-col items-center w-full max-w-md px-8">

          {/* Hero Image */}
          <div className="w-full mb-12">
            <div
              className="w-full bg-center bg-no-repeat bg-cover flex flex-col justify-end overflow-hidden bg-background-dark/50 rounded-xl min-h-64 border border-slate-800/50 shadow-2xl relative"
              style={{
                backgroundImage:
                  'url("https://lh3.googleusercontent.com/aida-public/AB6AXuD8PURMlKKo0au4r1BWDXBuqjSV7Gx-i_Ye4hzikb6m9VlmOSliLxXyxRyXrjA3zgBRWxdROlmTPnVb3ceLsPVPa2bk_hJQ54FxRXbNglMsj0xCQ3f36GYK5LtlTPi9l1Rwbl3Hdb1dSOcIWuTcBq6QLe-lRXQ-A00WWLuietoSsqWgfIBeiOpFqepJjGisZIm9sVKC35fUxg7nu9zHT7LHC_Zk5xV1wx8XIC2ZryfTj_e10UVEn-50gxx8BThvWYjA4RLnK0Ise4Q")'
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent"></div>
            </div>
          </div>

          {/* Logo */}
          <div className="text-center space-y-2">
            <h1 className="text-slate-100 tracking-[0.2em] text-[48px] font-bold leading-tight glow-effect">
              MEDIO
            </h1>

            <div className="flex items-center justify-center gap-2">
              <span className="h-[1px] w-8 bg-primary/50"></span>
              <p className="text-slate-400 text-xs font-medium uppercase tracking-[0.3em]">
                Smart Meeting Point Finder
              </p>
              <span className="h-[1px] w-8 bg-primary/50"></span>
            </div>
          </div>

          {/* Loading Section */}
          <div className="w-full max-w-[240px] mt-24 space-y-4">
            <div className="flex flex-col gap-3">

              <div className="flex gap-6 justify-center">
                <p className="text-primary text-xs font-semibold tracking-widest uppercase">
                  Syncing Navigation Data
                </p>
              </div>

              <div className="h-1 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary shadow-[0_0_10px_rgba(13,108,242,0.8)] animate-pulse"
                  style={{ width: "45%" }}
                ></div>
              </div>

            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="absolute bottom-10 left-0 w-full flex flex-col items-center justify-center gap-2 opacity-60">

          <div className="flex items-center gap-2 text-slate-400">
            <span className="material-symbols-outlined text-sm">
              location_on
            </span>
            <span className="text-[10px] tracking-widest uppercase font-medium">
              Global Network Node
            </span>
          </div>

          <p className="text-[10px] text-slate-500 font-normal">
            v2.4.0 • Encrypted Experience
          </p>

        </div>

      </div>
    </div>
  );
};

export default SplashScreen;