"use client";

import React, { useContext, useMemo, useEffect, useRef } from "react";
import { LogLevel, StatsigProvider } from "@statsig/react-bindings";
import { AuthContext } from "@/providers/auth-provider";

// Generate a persistent anonymous ID for unauthenticated users
function getOrCreateAnonymousId(): string {
  if (typeof window === 'undefined') return 'anonymous-user';
  
  const storageKey = 'statsig_anonymous_id';
  let anonymousId = localStorage.getItem(storageKey);
  
  if (!anonymousId) {
    // Generate a unique ID
    anonymousId = `anon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(storageKey, anonymousId);
  }
  
  return anonymousId;
}

export default function MyStatsig({ children }: { children: React.ReactNode }) {
  const { user } = useContext(AuthContext);
  const anonymousIdRef = useRef<string | null>(null);
  
  // Memoize the Statsig user object to prevent unnecessary re-renders
  const statsigUser = useMemo(() => {
    // Get user ID from Firebase auth user
    let userId: string;
    
    if (user?.uid) {
      // Authenticated user - use Firebase UID
      userId = user.uid;
    } else if (user?.id) {
      // Fallback to user.id if uid doesn't exist
      userId = user.id;
    } else {
      // Unauthenticated user - use persistent anonymous ID
      if (!anonymousIdRef.current) {
        anonymousIdRef.current = getOrCreateAnonymousId();
      }
      userId = anonymousIdRef.current;
    }

    const statsigUserObj = {
      userID: userId,
      // Optional additional fields:
      email: user?.email || undefined,
      // customIDs: { internalID: 'internal-123' },
      // custom: { plan: 'premium' }
    };

    // Debug logging
    console.log('[Statsig] User object:', {
      userId,
      isAuthenticated: !!user?.uid,
      email: user?.email || 'no email'
    });

    return statsigUserObj;
  }, [user?.uid, user?.id, user?.email]);
  
  // Reset anonymous ID when user logs in
  useEffect(() => {
    if (user?.uid && anonymousIdRef.current) {
      // Clear anonymous ID when user authenticates
      localStorage.removeItem('statsig_anonymous_id');
      anonymousIdRef.current = null;
    }
  }, [user?.uid]);

  const sdkKey = process.env.NEXT_PUBLIC_STATSIG_CLIENT_KEY;
  
  if (!sdkKey) {
    console.warn("Statsig client key not found. Statsig features will be disabled.");
    return <>{children}</>;
  }

  return (
    <StatsigProvider
      key={statsigUser.userID} // Force re-initialization when user ID changes
      sdkKey={sdkKey}
      user={statsigUser}
      options={{ logLevel: LogLevel.Debug }}
    >
      {children}
    </StatsigProvider>
  );
}

