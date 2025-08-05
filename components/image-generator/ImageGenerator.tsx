"use client"

import React, { useState, useRef, useEffect } from 'react'
import { doc, setDoc } from 'firebase/firestore'
import { getFirebaseFirestore } from '@/lib/firebase'
import { toast } from 'sonner'

interface ImageGeneratorProps {
  user?: any;
}

export function ImageGenerator({ user }: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generatedImage, setGeneratedImage] = useState<string | null>(null)
  const [imageGenerationStatus, setImageGenerationStatus] = useState<'idle' | 'generating' | 'complete'>('idle')
  const [showFeedback, setShowFeedback] = useState(false)
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)
  const [feedbackData, setFeedbackData] = useState({
    useCase: [] as string[],
    useCaseOther: '',
    frequency: [] as string[],
    frequencyOther: '',
    valueRating: 0,
    infographicTypes: [] as string[],
    infographicOther: '',
    suggestions: ''
  })
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null)
  const feedbackRef = useRef<HTMLDivElement>(null)
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
    setFeedbackSubmitted(false)

    try {
      // Clean the prompt text to avoid Pydantic validation errors
      const cleanedPrompt = cleanTextForAPI(prompt)

      if (!cleanedPrompt) {
        throw new Error('Please enter valid text for the visual abstract')
      }

      // Use the same API base URL as DrInfoSummary but with image generation path
      const API_BASE_URL = "https://synduct-visualabstracts.drinfo.ai"
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
        // Save to Firebase
        if (user?.uid) {
          const threadId = await saveSvgToFirebase(data.svg_content, prompt, user.uid)
          setCurrentThreadId(threadId)
        }
        // Show feedback section after 5 seconds and auto-scroll
        setTimeout(() => {
          setShowFeedback(true)
          setTimeout(() => {
            feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 100)
        }, 5000)
      } else if (data.svg_content) {
        // Handle case where API returns SVG content directly without success flag
        setGeneratedImage(data.svg_content)
        setImageGenerationStatus('complete')
        // Save to Firebase
        if (user?.uid) {
          const threadId = await saveSvgToFirebase(data.svg_content, prompt, user.uid)
          setCurrentThreadId(threadId)
        }
        // Show feedback section after 5 seconds and auto-scroll
        setTimeout(() => {
          setShowFeedback(true)
          setTimeout(() => {
            feedbackRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
          }, 100)
        }, 5000)
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

  // Function to handle feedback submission
  const handleFeedbackSubmit = async () => {
    if (!currentThreadId) return

    try {
      const db = getFirebaseFirestore()
      const docId = `visual_${currentThreadId}`
      
      await setDoc(doc(db, 'visual_abstracts', user?.uid || 'guest', 'visuals', docId), {
        input_text: prompt,
        svg: {
          svg_data: generatedImage,
          timestamp: new Date().toISOString()
        },
        feedback: {
          useCase: feedbackData.useCase,
          useCaseOther: feedbackData.useCaseOther,
          frequency: feedbackData.frequency,
          frequencyOther: feedbackData.frequencyOther,
          valueRating: feedbackData.valueRating,
          infographicTypes: feedbackData.infographicTypes,
          infographicOther: feedbackData.infographicOther,
          suggestions: feedbackData.suggestions,
          timestamp: new Date().toISOString()
        }
      }, { merge: true })
      
      console.log('Feedback saved to Firebase successfully')
      setShowFeedback(false)
      setFeedbackData({
        useCase: [] as string[],
        useCaseOther: '',
        frequency: [] as string[],
        frequencyOther: '',
        valueRating: 0,
        infographicTypes: [] as string[],
        infographicOther: '',
        suggestions: ''
      })
      setCurrentThreadId(null)
      toast.success('Thank you for your feedback!')
      setFeedbackSubmitted(true)
    } catch (error) {
      console.error('Error saving feedback to Firebase:', error)
      toast.error('Failed to save feedback. Please try again.')
    }
  }

  // Function to save SVG to Firebase
  const saveSvgToFirebase = async (svgContent: string, inputText: string, userId: string): Promise<string | null> => {
    try {
      const db = getFirebaseFirestore()
      const threadId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      const docId = `visual_${threadId}`
      
      await setDoc(doc(db, 'visual_abstracts', userId, 'visuals', docId), {
        input_text: inputText,
        svg: {
          svg_data: svgContent,
          timestamp: new Date().toISOString()
        }
      })
      
      console.log('SVG saved to Firebase successfully')
      return threadId
    } catch (error) {
      console.error('Error saving SVG to Firebase:', error)
      return null
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
            Enter your text below
          </label>
          <p className="text-gray-600 text-sm md:text-base font-['DM_Sans']">
            Paste your research abstract or medical text content to convert it into a visual abstract.
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
              <p className="text-gray-500 text-sm mt-2 font-['DM_Sans'] text-center px-4">This may take a few moments to minutes...</p>
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
        
        {/* Disclaimer */}
        <div className="mt-4 p-2">
          <p className="text-md text-gray-700 font-['DM_Sans'] text-center">
            <span className="font-bold">Beta:</span> This feature is currently in testing and may contain mistakes.
          </p>
        </div>
      </div>

      {/* Feedback Toggle Button */}
      {generatedImage && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setShowFeedback(!showFeedback)}
            disabled={feedbackSubmitted}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors duration-200 font-['DM_Sans'] font-medium ${
              feedbackSubmitted 
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-[#3771FE] text-white hover:bg-[#214498]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
            </svg>
            {feedbackSubmitted 
              ? 'Feedback Submitted ✓' 
              : showFeedback 
                ? 'Hide Feedback' 
                : 'Share Your Feedback'
            }
          </button>
        </div>
      )}

      {/* Feedback Section */}
      {showFeedback && generatedImage && (
        <div ref={feedbackRef} className="mt-8 p-6 bg-white rounded-lg border-2 border-[#3771fe44] shadow-[0px_0px_11px_#0000000c]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-[#3771FE] bg-opacity-10 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-[#3771FE]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-[#214498] font-['DM_Sans'] text-lg">Your Feedback can help us improve</h3>
              </div>
            </div>
            <button
              onClick={() => setShowFeedback(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
          
          <form onSubmit={(e) => { e.preventDefault(); handleFeedbackSubmit(); }} className="space-y-4">
            {/* Use Case */}
            <div>
              <label className="block text-sm font-medium text-[#223258] mb-3 font-['DM_Sans']">
                For what purpose would you use this feature?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {[
                  { value: 'patient_education', label: 'Patient education' },
                  { value: 'clinical_documentation', label: 'Clinical notes' },
                  { value: 'medical_presentations', label: 'Medical presentations' },
                  { value: 'research_papers', label: 'Research papers' },
                  { value: 'medical_teaching', label: 'Medical teaching' },
                  { value: 'case_studies', label: 'Case studies' },
                  { value: 'protocols', label: 'Protocols' },
                  { value: 'guidelines', label: 'Guidelines' },
                  { value: 'social_media', label: 'Social media' },
                  { value: 'other', label: 'Other' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const newUseCase = feedbackData.useCase.includes(option.value)
                        ? feedbackData.useCase.filter(item => item !== option.value)
                        : [...feedbackData.useCase, option.value];
                      setFeedbackData({...feedbackData, useCase: newUseCase})
                    }}
                    className={`p-1.5 text-xs font-['DM_Sans'] rounded border transition-colors duration-200 ${
                      feedbackData.useCase.includes(option.value)
                        ? 'border-[#3771FE] text-[#3771FE] bg-blue-50'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {feedbackData.useCase.includes('other') && (
                <textarea
                  value={feedbackData.useCaseOther}
                  onChange={(e) => setFeedbackData({...feedbackData, useCaseOther: e.target.value})}
                  placeholder="Please specify..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3771FE] focus:border-[#3771FE] font-['DM_Sans'] mt-2"
                  rows={2}
                />
              )}
            </div>

            {/* Frequency */}
            <div>
              <label className="block text-sm font-medium text-[#223258] mb-3 font-['DM_Sans']">
                How often would you use this feature?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                  { value: 'rarely', label: 'Rarely' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const newFrequency = feedbackData.frequency.includes(option.value)
                        ? feedbackData.frequency.filter(item => item !== option.value)
                        : [...feedbackData.frequency, option.value];
                      setFeedbackData({...feedbackData, frequency: newFrequency})
                    }}
                    className={`p-1.5 text-xs font-['DM_Sans'] rounded border transition-colors duration-200 ${
                      feedbackData.frequency.includes(option.value)
                        ? 'border-[#3771FE] text-[#3771FE] bg-blue-50'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {feedbackData.frequency.includes('other') && (
                <textarea
                  value={feedbackData.frequencyOther}
                  onChange={(e) => setFeedbackData({...feedbackData, frequencyOther: e.target.value})}
                  placeholder="Please specify..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3771FE] focus:border-[#3771FE] font-['DM_Sans'] mt-2"
                  rows={2}
                />
              )}
            </div>

            {/* Infographic Types */}
            <div>
              <label className="block text-sm font-medium text-[#223258] mb-3 font-['DM_Sans']">
                What types of infographics would you like to see?
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5">
                {[
                  { value: 'treatment_flowcharts', label: 'Clinical pathways' },
                  { value: 'medication_comparisons', label: 'Statistical graphs' },
                  { value: 'evidence_summaries', label: 'Evidence summaries' },
                  { value: 'other', label: 'Other' }
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      const newInfographicTypes = feedbackData.infographicTypes.includes(option.value)
                        ? feedbackData.infographicTypes.filter(item => item !== option.value)
                        : [...feedbackData.infographicTypes, option.value];
                      setFeedbackData({...feedbackData, infographicTypes: newInfographicTypes})
                    }}
                    className={`p-1.5 text-xs font-['DM_Sans'] rounded border transition-colors duration-200 ${
                      feedbackData.infographicTypes.includes(option.value)
                        ? 'border-[#3771FE] text-[#3771FE] bg-blue-50'
                        : 'border-gray-300 text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              {feedbackData.infographicTypes.includes('other') && (
                <textarea
                  value={feedbackData.infographicOther}
                  onChange={(e) => setFeedbackData({...feedbackData, infographicOther: e.target.value})}
                  placeholder="Please specify..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3771FE] focus:border-[#3771FE] font-['DM_Sans'] mt-2"
                  rows={2}
                />
              )}
            </div>

            {/* Value Rating */}
            <div>
              <label className="block text-sm font-medium text-[#223258] mb-2 font-['DM_Sans']">
                How useful was this image?
              </label>
              <div className="flex items-center space-x-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setFeedbackData({...feedbackData, valueRating: star})}
                    className={`text-2xl transition-colors duration-200 ${
                      star <= feedbackData.valueRating 
                        ? 'text-yellow-400' 
                        : 'text-gray-300 hover:text-yellow-300'
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1 font-['DM_Sans']">
                {feedbackData.valueRating === 0 && 'Click to rate'}
                {feedbackData.valueRating === 1 && 'Poor'}
                {feedbackData.valueRating === 2 && 'Fair'}
                {feedbackData.valueRating === 3 && 'Good'}
                {feedbackData.valueRating === 4 && 'Very Good'}
                {feedbackData.valueRating === 5 && 'Excellent'}
              </p>
            </div>

            {/* Suggestions */}
            <div>
              <label className="block text-sm font-medium text-[#223258] mb-2 font-['DM_Sans']">
                Kindly share your suggestions/comments for improvement... (Optional)
              </label>
              <textarea
                value={feedbackData.suggestions}
                onChange={(e) => setFeedbackData({...feedbackData, suggestions: e.target.value})}
                placeholder="Share your ideas..."
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#3771FE] focus:border-[#3771FE] font-['DM_Sans']"
                rows={2}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={feedbackData.frequency.length === 0 || feedbackData.valueRating === 0 || feedbackSubmitted}
                className="w-full px-6 py-3 bg-[#3771FE] text-white rounded-lg hover:bg-[#214498] disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors duration-200 font-['DM_Sans'] font-semibold"
              >
                {feedbackSubmitted ? 'Feedback Submitted' : 'Submit Feedback'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Footer - Always at the bottom */}
      <div className="text-center text-[14px] text-gray-400 mt-8">
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