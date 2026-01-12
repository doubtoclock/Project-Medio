import React from "react";
import { Navigate } from "react-router-dom";

export const ProtectedRoute = ({
  isAuthenticated,
  children,
}: {
  isAuthenticated: boolean;
  children: React.ReactNode;
}) => {
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};