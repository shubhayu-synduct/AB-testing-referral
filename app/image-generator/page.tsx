"use client"

import React from 'react'
import { ImageGenerator } from '@/components/image-generator/ImageGenerator'
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { useAuth } from "@/hooks/use-auth"

export default function ImageGeneratorPage() {
  const { user } = useAuth()

  const ImageGeneratorContent = () => {
    return (
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-8 mt-0 md:mt-16 relative">
        <div className="flex flex-col md:flex-row justify-center items-center mb-0 md:mb-[20px]">
          <div className="text-center mb-4 md:mb-0">
            <h1 className="hidden md:block text-[36px] font-semibold text-[#214498] mb-[4px] mt-0 font-['DM_Sans'] font-[600]">Visual Abstract Generator</h1>
            <p className="hidden md:block text-gray-600 text-[16px] mt-0">Convert medical text into professional visual posters and abstracts</p>
          </div>
        </div>
        
        <ImageGenerator user={user} />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="bg-[#F9FAFB] min-h-screen">
        {user && <ImageGeneratorContent />}
      </div>
    </DashboardLayout>
  )
} 