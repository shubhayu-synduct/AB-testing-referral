"use client"

import React, { useState, useRef, useEffect } from 'react'

interface ImageGeneratorProps {
  user?: any;
}

export function ImageGenerator({ user }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [imageGenerationStatus, setImageGenerationStatus] = useState<'idle' | 'generating' | 'complete'>('idle')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
    }
  }, [prompt])

  // Helper function to clean text for API
  const cleanTextForAPI = (text: string): string => {
    return text.trim()
      .replace(/\n+/g, ' ') // Replace multiple newlines with single space
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters except basic punctuation
      .trim()
  }

  // Handle textarea input with validation
  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    setPrompt(value)
    
    // Auto-resize the textarea
    e.target.style.height = 'auto'
    e.target.style.height = e.target.scrollHeight + 'px'
  }

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!prompt.trim()) return

    // Check minimum word limit
    const wordCount = prompt.trim().split(/\s+/).length
    if (wordCount < 20) {
      setError(`Please enter at least 20 words. Current word count: ${wordCount}`)
      return
    }

    setIsLoading(true)
    setError(null)
    setImageGenerationStatus('generating')
    setGeneratedImage(null)

    try {
      // Clean the prompt text to avoid Pydantic validation errors
      const cleanedPrompt = cleanTextForAPI(prompt)

      if (!cleanedPrompt) {
        throw new Error('Please enter valid text for the visual abstract')
      }

      // Use the same API base URL as DrInfoSummary but with image generation path
      const API_BASE_URL = "https://ai-summary-test.duckdns.org"
      // const API_BASE_URL = "http://localhost:8000"
      const response = await fetch(`${API_BASE_URL}/image/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ 
          text: cleanedPrompt
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Image generation failed with status ${response.status}:`, errorText)
        throw new Error(`Image generation failed with status ${response.status}`)
      }

      const data = await response.json()
      
      if (data.status === "success" && data.svg_content) {
        setGeneratedImage(data.svg_content)
        setImageGenerationStatus('complete')
      } else if (data.svg_content) {
        // Handle case where API returns SVG content directly without success flag
        setGeneratedImage(data.svg_content)
        setImageGenerationStatus('complete')
      } else {
        throw new Error(data.message || data.error || 'Failed to generate visual abstract')
      }
    } catch (err) {
      console.error('Error generating visual abstract:', err)
      setError('Failed to generate visual abstract. Please try again.')
      setImageGenerationStatus('idle')
    } finally {
      setIsLoading(false)
    }
  }

  // Function to download SVG as PNG
  const downloadSvgAsPng = (svgContent: string, filename: string = 'generated-image') => {
    try {
      // Create a temporary container for the SVG
      const container = document.createElement('div')
      container.innerHTML = svgContent
      const svgElement = container.querySelector('svg')
      
      if (!svgElement) {
        console.error('No SVG element found in content')
        return
      }

      // Set higher resolution dimensions for better quality PNG
      const scaleFactor = 2 // Increase resolution by 2x
      const originalWidth = parseInt(svgElement.getAttribute('width') || '800')
      const originalHeight = parseInt(svgElement.getAttribute('height') || '600')
      const scaledWidth = originalWidth * scaleFactor
      const scaledHeight = originalHeight * scaleFactor

      // Set SVG dimensions for high resolution
      svgElement.setAttribute('width', scaledWidth.toString())
      svgElement.setAttribute('height', scaledHeight.toString())

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgElement)
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
      const svgUrl = URL.createObjectURL(svgBlob)

      // Create canvas to convert SVG to PNG
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()

      img.onload = () => {
        canvas.width = scaledWidth
        canvas.height = scaledHeight
        
        if (ctx) {
          // Enable high-quality rendering
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'high'
          
          // Draw white background
          ctx.fillStyle = 'white'
          ctx.fillRect(0, 0, canvas.width, canvas.height)
          
          // Draw the image at high resolution
          ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight)
          
          // Convert to PNG and download with high quality
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
            }
          }, 'image/png', 1.0) // Maximum quality (1.0)
        }
        
        URL.revokeObjectURL(svgUrl)
      }

      img.onerror = () => {
        console.error('Failed to load SVG image')
        URL.revokeObjectURL(svgUrl)
      }

      img.src = svgUrl
    } catch (error) {
      console.error('Error downloading SVG as PNG:', error)
    }
  }

  return (
    <div className="w-full max-w-[1118px] mx-auto space-y-6">
      {/* Text Input Section */}
      <div className="bg-white rounded-lg border-2 border-[#3771fe44] shadow-[0px_0px_11px_#0000000c] p-4 md:p-6">
        <div className="mb-4">
          <label htmlFor="prompt" className="block text-lg md:text-xl font-semibold text-[#214498] mb-2 font-['DM_Sans']">
            Enter your abstract text
          </label>
          <p className="text-gray-600 text-sm md:text-base font-['DM_Sans']">
            Paste your research abstract or text content to convert it into a visual poster
          </p>
        </div>
        
        <form onSubmit={handleGenerate} className="space-y-4">
          <div className="relative">
            <textarea
              ref={textareaRef}
              id="prompt"
              value={prompt}
              onChange={handlePromptChange}
              placeholder="Paste your research abstract, study summary, or text content here (minimum 20 words)... (e.g., 'This study investigated the efficacy of a new treatment protocol in 150 patients with chronic conditions. Results showed a 35% improvement in outcomes compared to standard care.')"
              className="w-full text-base text-[#223258] font-normal font-['DM_Sans'] outline-none resize-none min-h-[120px] max-h-[300px] overflow-y-auto border border-gray-300 rounded-lg p-4 focus:border-[#3771FE] focus:ring-2 focus:ring-[#3771FE] focus:ring-opacity-20"
              rows={5}
              style={{ height: '120px' }}
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !prompt.trim() || prompt.trim().split(/\s+/).length < 20}
              className="px-4 md:px-6 py-3 bg-[#3771FE] text-white font-semibold rounded-lg hover:bg-[#214498] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2 font-['DM_Sans']"
            >
              {isLoading ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="hidden sm:inline">Generating...</span>
                  <span className="sm:hidden">Generating</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7,10 12,15 17,10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  <span>Generate</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg border border-red-200">
          <p className="font-medium font-['DM_Sans']">{error}</p>
        </div>
      )}

      {/* Image Display Section */}
      <div className="bg-white rounded-lg border-2 border-[#3771fe44] shadow-[0px_0px_11px_#0000000c] p-4 md:p-6">
        <h2 className="text-xl font-semibold text-[#214498] mb-4 font-['DM_Sans']">
          Generated Visual Abstract
        </h2>
        
        <div className="flex flex-col items-center py-4 md:py-8">
          {imageGenerationStatus === 'generating' ? (
            <div className="w-full max-w-[800px] h-[400px] md:h-[600px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3771FE] mb-4"></div>
              <p className="text-gray-600 font-medium text-lg font-['DM_Sans'] text-center px-4">Creating your visual abstract...</p>
              <p className="text-gray-500 text-sm mt-2 font-['DM_Sans'] text-center px-4">This may take a few moments</p>
            </div>
          ) : generatedImage ? (
            <div className="relative w-full max-w-[800px]">
              <div 
                className="svg-content max-w-full"
                dangerouslySetInnerHTML={{ __html: generatedImage }}
              />
              <button
                onClick={() => downloadSvgAsPng(generatedImage, `visual-abstract-${Date.now()}`)}
                className="absolute top-2 md:top-4 right-2 md:right-4 p-2 md:p-3 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-md transition-all duration-200 hover:scale-110"
                title="Download as PNG"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7,10 12,15 17,10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </button>
            </div>
          ) : (
            <div className="w-full max-w-[800px] h-[400px] md:h-[600px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
              </div>
              <p className="text-gray-600 font-medium text-lg font-['DM_Sans'] text-center px-4">No visual abstract generated yet</p>
              <p className="text-gray-500 text-sm mt-2 font-['DM_Sans'] text-center px-4">Enter your abstract text above and click generate to create a visual poster</p>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-[14px] text-gray-400">
        <p className="font-['DM_Sans']">
          Generated by AI, apply professional judgment. 
          <a href="https://synduct.com/terms-and-conditions/" target="_blank" rel="noopener noreferrer" className="font-regular underline text-black hover:text-[#3771FE] transition-colors duration-200 ml-1">
            Click here
          </a> for further information.
        </p>
      </div>
    </div>
  )
} 