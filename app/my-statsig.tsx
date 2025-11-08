"use client";

import React, { useContext, useMemo } from "react";
import { LogLevel, StatsigProvider } from "@statsig/react-bindings";
import { AuthContext } from "@/providers/auth-provider";

export default function MyStatsig({ children }: { children: React.ReactNode }) {
  const { user } = useContext(AuthContext);
  
  // Memoize the Statsig user object to prevent unnecessary re-renders
  const statsigUser = useMemo(() => {
    // Get user ID from Firebase auth user or use anonymous ID
    const userId = user?.uid || user?.id || "anonymous-user";

    return {
      userID: userId,
      // Optional additional fields:
      email: user?.email || undefined,
      // customIDs: { internalID: 'internal-123' },
      // custom: { plan: 'premium' }
    };
  }, [user?.uid, user?.id, user?.email]);

  const sdkKey = process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY;
  
  if (!sdkKey) {
    console.warn("Statsig client key not found. Statsig features will be disabled.");
    return <>{children}</>;
  }

  return (
    <StatsigProvider
      sdkKey={sdkKey}
      user={statsigUser}
      options={{ logLevel: LogLevel.Debug }}
    >
      {children}
    </StatsigProvider>
  );
}

