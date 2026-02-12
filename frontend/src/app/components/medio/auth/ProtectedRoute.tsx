import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";

export const ProtectedRoute = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetch("http://localhost:5001/api/auth/me", {
      credentials: "include", // 🔥 REQUIRED for cookie auth
    })
      .then((res) => {
        if (!isMounted) return;
        setAuthenticated(res.ok);
      })
      .catch(() => {
        if (!isMounted) return;
        setAuthenticated(false);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // ⏳ While auth status is being checked
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center text-zinc-400">
        Checking authentication…
      </div>
    );
  }

  // 🔐 Not authenticated → go to login
  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Authenticated → render protected content
  return <>{children}</>;
};
