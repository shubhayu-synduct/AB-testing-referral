"use client"

import React, { useState, useEffect } from 'react'
import { getFirebaseFirestore } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { Download, Calendar } from 'lucide-react'
import { PublicLayout } from '@/components/dashboard/public-layout'
import { logger } from '@/lib/logger'

interface PublicVisualAbstractData {
  id: string
  input_text: string
  svg: {
    svg_data: string
    timestamp: any
  }
  user_id: string
  user_email: string
  created_at: any
  is_public: boolean
}

export default function PublicVisualAbstractPage({ params }: { params: Promise<{ id: string }> }) {
  const [visualAbstract, setVisualAbstract] = useState<PublicVisualAbstractData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadPublicVisualAbstract = async () => {
      try {
        const { id } = await params
        console.log("Loading public visual abstract with ID:", id)
        const db = getFirebaseFirestore()
        const visualAbstractDocRef = doc(db, "public_visual_abstracts", id)
        console.log("Document reference:", visualAbstractDocRef.path)
        
        const visualAbstractDoc = await getDoc(visualAbstractDocRef)
        console.log("Document exists:", visualAbstractDoc.exists())
        
        if (!visualAbstractDoc.exists()) {
          console.log("Document does not exist")
          setError("This shared visual abstract is not available or has been removed.")
          setLoading(false)
          return
        }

        const data = visualAbstractDoc.data() as PublicVisualAbstractData
        console.log("Document data:", data)
        setVisualAbstract(data)
        setLoading(false)
      } catch (err) {
        console.error("Error loading public visual abstract:", err)
        logger.error("Error loading public visual abstract:", err)
        setError("Failed to load visual abstract. Please try again.")
        setLoading(false)
      }
    }

    loadPublicVisualAbstract()
  }, [params])

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown date'
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Unknown date'
    }
  }

  // Function to download SVG as PNG
  const downloadAsPNG = async (svgData: string, filename: string) => {
    return new Promise<void>((resolve, reject) => {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // Calculate dimensions for 400 DPI (assuming 96 DPI screen)
        const dpiScale = 400 / 96
        const scaledWidth = img.width * dpiScale
        const scaledHeight = img.height * dpiScale
        
        // Set canvas dimensions for high DPI
        canvas.width = scaledWidth
        canvas.height = scaledHeight
        
        // Enable high quality rendering
        ctx!.imageSmoothingEnabled = true
        ctx!.imageSmoothingQuality = 'high'
        
        // Draw the image scaled for 400 DPI
        ctx?.drawImage(img, 0, 0, scaledWidth, scaledHeight)
        
        // Convert to PNG and download
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = filename
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)
            resolve()
          } else {
            reject(new Error('Failed to create PNG blob'))
          }
        }, 'image/png')
      }
      
      img.onerror = () => reject(new Error('Failed to load SVG image'))
      
      // Convert SVG to data URL
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const url = URL.createObjectURL(svgBlob)
      img.src = url
    })
  }

  if (loading) {
    return (
      <PublicLayout>
        <div className="bg-[#F9FAFB] min-h-screen">
          <div className="max-w-5xl mx-auto px-4 py-4 md:py-8 mt-0 md:mt-16 relative">
            <div className="flex items-center justify-center h-64">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        </div>
      </PublicLayout>
    )
  }

  if (error) {
    return (
      <PublicLayout>
        <div className="bg-[#F9FAFB] min-h-screen">
          <div className="max-w-5xl mx-auto px-4 py-4 md:py-8 mt-0 md:mt-16 relative">
            <div className="text-center py-12">
              <div className="h-24 w-24 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <svg className="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-[#223258] mb-2">Visual Abstract Not Found</h3>
              <p className="text-[#223258]/70 mb-4">{error}</p>
            </div>
          </div>
        </div>
      </PublicLayout>
    )
  }

  return (
    <PublicLayout>
      <div className="bg-[#F9FAFB] min-h-screen">
        <div className="max-w-5xl mx-auto px-4 py-4 md:py-8 mt-0 md:mt-16 relative">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-center items-center mb-0 md:mb-[20px]">
            <div className="text-center mb-4 md:mb-0">
              <h1 className="hidden md:block text-[36px] font-semibold text-[#214498] mb-[4px] mt-0 font-['DM_Sans']">Shared Visual Abstract</h1>
              <p className="hidden md:block text-gray-600 text-[16px] mt-0">A visual abstract shared from DR. INFO</p>
            </div>
          </div>

          {/* Visual Abstract Content */}
          <div className="bg-white rounded-lg shadow-lg p-6 md:p-8">
            {/* Visual Abstract Image */}
            <div className="relative w-full max-w-[800px] mx-auto mb-6">
              <div 
                className="svg-content max-w-full"
                dangerouslySetInnerHTML={{ __html: visualAbstract?.svg.svg_data || '' }}
              />
              
              {/* Download Button */}
              <button
                onClick={() => downloadAsPNG(visualAbstract?.svg.svg_data || '', `visual-abstract-${visualAbstract?.id || 'shared'}`)}
                className="absolute top-2 md:top-4 right-2 md:right-4 p-2 md:p-3 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-md transition-all duration-200 hover:scale-110"
                title="Download as PNG"
              >
                <Download className="w-4 h-4 text-[#223258]" />
              </button>
            </div>

            {/* Metadata */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center text-sm text-gray-600">
                <Calendar className="w-4 h-4 mr-2" />
                <span>Created: {formatTimestamp(visualAbstract?.svg.timestamp)}</span>
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center mt-8">
            <div className="bg-[#E4ECFF] rounded-lg p-6 max-w-2xl mx-auto">
              <h3 className="text-lg font-semibold text-[#214498] mb-2 font-['DM_Sans']">
                Create Your Own Visual Abstracts
              </h3>
              <p className="text-gray-600 mb-4 font-['DM_Sans']">
                Join DR. INFO to convert your medical text into professional visual posters and abstracts.
              </p>
              <a
                href="/dashboard"
                className="inline-flex items-center px-6 py-3 bg-[#3771FE] text-white rounded-lg hover:bg-[#214498] transition-colors duration-200 font-['DM_Sans'] font-medium"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  )
}
