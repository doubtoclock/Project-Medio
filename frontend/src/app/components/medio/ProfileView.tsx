import { useState } from "react";

export const ProfileView = () => {
  const [name, setName] = useState("Your Name");

  const handleSave = () => {
    alert("Profile updated (frontend only)");
  };

  return (
    <div className="pt-24 px-6 pb-24 text-white">

      {/* Avatar */}
      <div className="flex justify-center mb-6">
        <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center border border-zinc-700">
          <svg
            className="w-12 h-12 text-zinc-400"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5.121 17.804A4 4 0 019 16h6a4 4 0 013.879 1.804M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-black italic text-center mb-8">
        Profile
      </h1>

      {/* Name input */}
      <div className="max-w-sm mx-auto space-y-4">
        <div>
          <label className="text-xs text-zinc-400 mb-1 block">
            Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="
              w-full px-4 py-3 rounded-xl
              bg-zinc-900 border border-zinc-700
              focus:outline-none focus:border-emerald-500
            "
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="
            w-full py-3 rounded-xl
            bg-emerald-500/90 text-black font-semibold
            hover:bg-emerald-500
            transition-all
          "
        >
          Save Changes
        </button>
      </div>

    </div>
  );
};
