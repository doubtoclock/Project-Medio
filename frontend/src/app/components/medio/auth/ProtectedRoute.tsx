import React, { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { getBackendUrl } from "../../../lib/backend";

export const ProtectedRoute = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    let isMounted = true;
    const backendURL = getBackendUrl();

    fetch(`${backendURL}/api/auth/me`, {
      credentials: "include",
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        setAuthenticated(Boolean(data?.authenticated));
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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-zinc-400">
        Checking authentication...
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
