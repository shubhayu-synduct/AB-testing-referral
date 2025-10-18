"use client"

import React from 'react'
import Guidelines from "@/components/guidelines/guidelines"
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"
import { track } from '@/lib/analytics'

export default function GuidelinesPage() {
  const { user } = useAuth()
  
  // Track page view when user is available
  React.useEffect(() => {
    if (user) {
      track.guidelinesPageViewed(user.uid, 'guidelines');
    }
  }, [user]);
  
  return (
    <DashboardLayout>
      {user && <Guidelines />}
    </DashboardLayout>
  )
} 