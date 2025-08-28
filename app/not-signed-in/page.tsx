"use client"

import React, { Suspense } from 'react'
import { NotSignedInDrInfoSummary } from '@/components/not-signed-in/not-signed-in-drinfo-summary'

export default function NotSignedInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <NotSignedInDrInfoSummary />
    </Suspense>
  )
}
