import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  email: string;
  name?: string;
  picture?: string;
}

export const ProfileView = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  fetch("http://localhost:5001/api/auth/me", {
    credentials: "include",
  })
    .then(res => res.json())
    .then(data => {
      setUser(data.user);
      setLoading(false);
    })
    .catch(() => {
      setLoading(false);
    });
}, []);

  const handleLogout = async () => {
    await fetch("http://localhost:5001/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    navigate("/login", { replace: true });
  };

  if (loading) {
  return (
    <div className="h-screen flex items-center justify-center text-zinc-400">
      Loading profile...
    </div>
  );
}

  return (
    <div className="pt-24 px-6 pb-24 text-white relative">

      {/* Logout button */}
      <button
        onClick={handleLogout}
        className="
          absolute top-6 right-6
          px-4 py-2 rounded-lg
          bg-red-500/90 text-white text-sm font-semibold
          hover:bg-red-600
          transition-all
        "
      >
        Logout
      </button>

      {/* Avatar */}
      <div className="flex justify-center mb-6">
        {user?.picture ? (
          <img
            src={user.picture}
            alt="Profile"
            referrerPolicy="no-referrer"
            className="w-24 h-24 rounded-full border border-zinc-700 object-cover"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-zinc-800" />
        )}
      </div>

      <h1 className="text-2xl font-black italic text-center mb-2">
        {user?.name || "User"}
      </h1>

      <p className="text-sm text-zinc-400 text-center mb-8">
        {user?.email}
      </p>

    </div>
  );
};