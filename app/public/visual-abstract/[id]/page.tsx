"use client"

import React, { useState, useEffect } from 'react'
import { getFirebaseFirestore } from '@/lib/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { Download, Calendar, X } from 'lucide-react'
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
  const [showModal, setShowModal] = useState(false)

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
    try {
      // Create a temporary container for the SVG
      const container = document.createElement('div')
      container.innerHTML = svgData
      const svgElement = container.querySelector('svg')
      
      if (!svgElement) {
        logger.error('No SVG element found in content')
        return
      }

      // Set SVG dimensions if not already set
      if (!svgElement.getAttribute('width') || !svgElement.getAttribute('height')) {
        svgElement.setAttribute('width', '800')
        svgElement.setAttribute('height', '600')
      }

      // Convert SVG to data URL using XMLSerializer
      const svgDataSerialized = new XMLSerializer().serializeToString(svgElement)
      const svgBlob = new Blob([svgDataSerialized], { type: 'image/svg+xml;charset=utf-8' })
      const svgUrl = URL.createObjectURL(svgBlob)

      // Create canvas to convert SVG to PNG
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        // Calculate dimensions for 400 DPI (assuming 96 DPI screen)
        const dpiScale = 400 / 96
        const scaledWidth = img.width * dpiScale
        const scaledHeight = img.height * dpiScale
        
        canvas.width = scaledWidth
        canvas.height = scaledHeight
        
        if (ctx) {
          // Enable high quality rendering
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          
          // Draw white background
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          
          // Draw the image scaled for 400 DPI
          ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight)
          
          // Convert to PNG and download
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `${filename}.png`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
              URL.revokeObjectURL(svgUrl)
            }
          }, 'image/png')
        }
      }

      img.onerror = () => {
        logger.error('Failed to load SVG image')
        URL.revokeObjectURL(svgUrl)
      }

      img.src = svgUrl
    } catch (error) {
      logger.error('Error downloading SVG as PNG:', error)
    }
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
          <div className="flex flex-col md:flex-row justify-center items-center mb-0 md:mb-[32px]">
            <div className="text-center mb-4 md:mb-0">
              <h1 
                className="hidden md:block text-black mb-[4px] mt-0"
                style={{ 
                  fontFamily: 'DM Sans', 
                  fontWeight: '600', 
                  fontStyle: 'normal',
                  fontSize: '20px', 
                  lineHeight: '24px', 
                  letterSpacing: '0%' 
                }}
              >
                Shared Visual Abstract from DR. INFO
              </h1>
            </div>
          </div>

          {/* Visual Abstract Content */}
          {/* Visual Abstract Image */}
          <div className="relative w-full max-w-[1000px] mx-auto">
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
          <div className="w-full max-w-[1000px] mx-auto mt-4">
            <div className="flex items-center">
              <Calendar className="w-4 h-4 mr-2" style={{ color: '#919191' }} />
              <span 
                style={{ 
                  fontFamily: 'DM Sans', 
                  fontWeight: '400', 
                  fontStyle: 'normal',
                  fontSize: '14px', 
                  lineHeight: '24px', 
                  letterSpacing: '0%',
                  color: '#919191'
                }}
              >
                {formatTimestamp(visualAbstract?.svg.timestamp)}
              </span>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center mt-8">
            <div className="bg-white rounded-lg p-4 md:p-6 w-full max-w-[1000px] mx-auto">
              <h3 
                className="mb-2"
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: '600', 
                  fontSize: '18px',
                  lineHeight: '26px', 
                  letterSpacing: '-0.75px',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  color: '#0F172A'
                }}
              >
                Create Your Own Visual Abstracts
              </h3>
              <p 
                className="mb-4 md:mb-6"
                style={{ 
                  fontFamily: 'Inter', 
                  fontWeight: '400', 
                  fontSize: '14px',
                  lineHeight: '22px', 
                  letterSpacing: '0%',
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  color: '#64748B'
                }}
              >
                Use DR.INFO to create clear, evidence-based visuals at no cost.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 md:px-6 py-3 rounded-lg transition-colors duration-200 w-full sm:w-auto"
                  style={{ 
                    backgroundColor: '#E7E7E7', 
                    fontFamily: 'DM Sans', 
                    fontWeight: '400', 
                    fontSize: '14px',
                    lineHeight: '22px', 
                    letterSpacing: '0%',
                    color: '#475569'
                  }}
                >
                  Learn More
                </button>
                <button
                  onClick={() => window.open('https://app.drinfo.ai/signup', '_blank')}
                  className="px-4 md:px-6 py-3 rounded-lg transition-colors duration-200 text-white w-full sm:w-auto"
                  style={{ 
                    backgroundColor: '#3771FE',
                    fontFamily: 'DM Sans', 
                    fontWeight: '600', 
                    fontSize: '14px',
                    lineHeight: '22px', 
                    letterSpacing: '0%'
                  }}
                >
                  Create for Free
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Learn More Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-8 max-w-md mx-4 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors duration-200"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Modal Content */}
            <div className="text-center">
              <h2 
                className="text-2xl font-semibold mb-4"
                style={{ 
                  fontFamily: 'DM Sans', 
                  fontWeight: '600', 
                  color: '#0F172A'
                }}
              >
                What is DR.INFO?
              </h2>
              
              <p 
                className="text-lg mb-6"
                style={{ 
                  fontFamily: 'DM Sans', 
                  fontWeight: '400', 
                  color: '#64748B',
                  lineHeight: '28px'
                }}
              >
                Tools that deliver clear, evidence-based answers when you need them.
              </p>
              
              <button
                onClick={() => window.open('https://app.drinfo.ai', '_blank')}
                className="px-8 py-3 rounded-lg font-medium transition-colors duration-200 text-white"
                style={{ 
                  backgroundColor: '#3771FE',
                  fontFamily: 'DM Sans', 
                  fontWeight: '600', 
                  fontSize: '16px'
                }}
              >
                VISIT NOW
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  )
}
