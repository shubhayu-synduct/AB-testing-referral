"use client"

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getFirebaseFirestore } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, deleteDoc, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore'
import Link from "next/link"
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, FolderOpen, Calendar, Clock, Loader2, Trash2, Check, Download, ArrowUpDown, X, Pin, ChevronRight, Share2, Linkedin, Copy } from 'lucide-react'
import { FaLinkedin, FaWhatsapp, FaEnvelope } from 'react-icons/fa'
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import GuidelineSummaryModal from '@/components/guidelines/guideline-summary-modal'
import GuidelineSummaryMobileModal from '@/components/guidelines/guideline-summary-mobile-modal'
import { useIsMobile } from '@/components/ui/use-mobile'
import { track } from '@/lib/analytics'
import { toast } from 'sonner'

interface VisualAbstract {
  id: string
  input_text: string
  svg: {
    svg_data: string
    timestamp: any
  }
  userId: string
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  questionType?: 'main' | 'follow-up';
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  messages?: ChatMessage[];
  pinned?: boolean;
}

type SortOption = 'newest' | 'oldest' | 'alphabetical';

interface SavedGuideline {
  guidelineId: number;
  guidelineTitle: string;
  category: string;
  url: string;
  society: string;
  lastUpdated: string;
  savedAt: string;
  lastAccessed: string;
  notes: string;
  pdf_saved: boolean;
  link: string;
}

export default function LibraryPage() {
  const { user } = useAuth()
  const isMobile = useIsMobile()
  const [visualAbstracts, setVisualAbstracts] = useState<VisualAbstract[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isNearBottom, setIsNearBottom] = useState(false)
  const [selectedAbstracts, setSelectedAbstracts] = useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [activeTab, setActiveTab] = useState<'visual-abstracts' | 'conversations' | 'saved-guidelines'>('visual-abstracts')
  
  // Saved Guidelines State
  const [savedGuidelines, setSavedGuidelines] = useState<SavedGuideline[]>([])
  const [savedGuidelinesLoading, setSavedGuidelinesLoading] = useState(true)
  const [savedGuidelinesError, setSavedGuidelinesError] = useState<string | null>(null)
  
  // Guideline AI Summary Modal State
  const [selectedGuideline, setSelectedGuideline] = useState<SavedGuideline | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Visual Abstract Modal State
  const [selectedAbstract, setSelectedAbstract] = useState<VisualAbstract | null>(null)
  const [isAbstractModalOpen, setIsAbstractModalOpen] = useState(false)
  
  // Share functionality state
  const [isSharing, setIsSharing] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [showSharePopup, setShowSharePopup] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [sharingAbstractId, setSharingAbstractId] = useState<string | null>(null)
  
  // Chat History State
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [chatHistoryLoading, setChatHistoryLoading] = useState(true)
  const [chatHistoryError, setChatHistoryError] = useState<string | null>(null)
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [searchQuery, setSearchQuery] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Generate suggestions based on chat session titles
  const generateSuggestions = useCallback((query: string) => {
    if (!query.trim() || query.length < 2) {
      setSuggestions([])
      return
    }

    const queryLower = query.toLowerCase()
    const uniqueSuggestions = new Set<string>()
    
    chatSessions.forEach(session => {
      const title = session.title.toLowerCase()
      if (title.includes(queryLower)) {
        // Add the full title as a suggestion
        uniqueSuggestions.add(session.title)
        
        // Add individual words that match
        const words = session.title.split(' ')
        words.forEach(word => {
          if (word.toLowerCase().includes(queryLower) && word.length > 2) {
            uniqueSuggestions.add(word)
          }
        })
      }
    })

    // Convert to array and limit to 5 suggestions
    const suggestionArray = Array.from(uniqueSuggestions).slice(0, 5)
    setSuggestions(suggestionArray)
  }, [chatSessions])

  // Stable search handler to prevent re-renders
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    generateSuggestions(value)
    setShowSuggestions(value.length > 0)
    
    // Track search
    if (user && value.trim()) {
      track.conversationSearched(value, user.uid, 'library')
    }
  }, [generateSuggestions, user])

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: string) => {
    setSearchQuery(suggestion)
    setShowSuggestions(false)
    setSuggestions([])
    
    // Track suggestion click
    if (user) {
      track.conversationSearchSuggestionClicked(suggestion, user.uid, 'library')
    }
  }, [user])

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setShowSuggestions(false)
    setSuggestions([])
    
    // Track search clear
    if (user) {
      track.conversationSearchCleared(user.uid, 'library')
    }
  }, [user])

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchVisualAbstracts = async (isLoadMore = false) => {
    if (!user) {
      // console.log('No user found, cannot fetch visual abstracts')
      return
    }

    // console.log('Fetching visual abstracts for user:', user.uid)
    
    try {
      setLoadingMore(isLoadMore)
      const db = getFirebaseFirestore()
      
      // Log the collection path we're querying
      const collectionPath = `visual_abstracts/${user.uid}/visuals`
      // console.log('Querying collection path:', collectionPath)
      
      // First, let's check if the collection exists by trying to get a simple snapshot
      try {
        const testSnapshot = await getDocs(collection(db, 'visual_abstracts', user.uid, 'visuals'))
        // console.log('Collection exists, total documents:', testSnapshot.size)
      } catch (testErr) {
        // console.log('Collection test failed:', testErr)
      }
      
      let q = query(
        collection(db, 'visual_abstracts', user.uid, 'visuals'),
        orderBy('svg.timestamp', 'desc'),
        limit(12)
      )

      if (isLoadMore && lastDoc) {
        q = query(
          collection(db, 'visual_abstracts', user.uid, 'visuals'),
          orderBy('svg.timestamp', 'desc'),
          startAfter(lastDoc),
          limit(12)
        )
      }

      // console.log('Executing query...')
      const querySnapshot = await getDocs(q)
      // console.log('Query result:', querySnapshot.size, 'documents found')
      
      const newAbstracts: VisualAbstract[] = []
      const seenIds = new Set<string>()
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        // console.log('Document data:', doc.id, data)
        
        // Skip if we've already seen this ID
        if (seenIds.has(doc.id)) {
          // console.log('Skipping duplicate ID:', doc.id)
          return
        }
        
        seenIds.add(doc.id)
        
        // Extract the nested svg data structure
        const svgData = data.svg || {}
        newAbstracts.push({
          id: doc.id,
          input_text: data.input_text || '',
          svg: {
            svg_data: svgData.svg_data || '',
            timestamp: svgData.timestamp || null
          },
          userId: user.uid
        } as VisualAbstract)
      })

      // console.log('Processed abstracts:', newAbstracts.length)

      if (isLoadMore) {
        setVisualAbstracts(prev => {
          // Create a Map to ensure unique IDs
          const uniqueMap = new Map()
          
          // Add existing abstracts
          prev.forEach(abstract => uniqueMap.set(abstract.id, abstract))
          
          // Add new abstracts (this will overwrite any duplicates)
          newAbstracts.forEach(abstract => uniqueMap.set(abstract.id, abstract))
          
          // Convert back to array
          return Array.from(uniqueMap.values())
        })
      } else {
        setVisualAbstracts(newAbstracts)
      }

      setLastDoc(querySnapshot.docs[querySnapshot.docs.length - 1] || null)
      setHasMore(querySnapshot.docs.length === 12)
      setError(null)
    } catch (err) {
      // console.error('Error fetching visual abstracts:', err)
      setError('Failed to load visual abstracts. Please try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    // console.log('useEffect triggered, user:', user)
    if (user) {
      // Track library page view
      track.libraryPageViewed(user.uid, 'library')
      
      // console.log('User authenticated, fetching visual abstracts...')
      fetchVisualAbstracts()
    } else {
      // console.log('No user yet, waiting for authentication...')
    }
  }, [user])

  // Infinite scroll logic using Intersection Observer
  useEffect(() => {
    if (!hasMore || loadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !loadingMore) {
            // console.log('Load more trigger detected')
            fetchVisualAbstracts(true)
          }
        })
      },
      {
        rootMargin: '300px', // Trigger 300px before reaching the bottom
        threshold: 0.1
      }
    )

    // Observe the last item in the grid
    const lastItem = document.querySelector('.grid > *:last-child')
    if (lastItem) {
      observer.observe(lastItem)
    }

    return () => observer.disconnect()
  }, [hasMore, loadingMore, visualAbstracts.length])

  // Chat History useEffect hooks
  useEffect(() => {
    if (!user) {
      setChatSessions([])
      setChatHistoryLoading(false)
      return
    }

    const fetchChatSessions = async () => {
      setChatHistoryLoading(true)
      try {
        const db = getFirebaseFirestore()
        const chatSessionQuery = query(
          collection(db, "conversations"),
          where("userId", "==", user.uid),
          orderBy("updatedAt", "desc")
        )

        const querySnapshot = await getDocs(chatSessionQuery)
        
        const sessions: ChatSession[] = []

        querySnapshot.forEach((doc) => {
          const data = doc.data() as ChatSession
          
          let displayTitle = data.title || "New chat"
          
          if (data.messages && data.messages.length > 0) {
            const mainQuestion = data.messages.find(msg => 
              msg.type === 'user' && msg.questionType === 'main'
            )
            
            if (mainQuestion) {
              displayTitle = mainQuestion.content
            } else {
              const firstUserMessage = data.messages.find(msg => msg.type === 'user')
              if (firstUserMessage) {
                displayTitle = firstUserMessage.content
              }
            }
            
            if (displayTitle.length > 60) {
              displayTitle = displayTitle.substring(0, 57) + '...'
            }
          }
          
          sessions.push({
            id: doc.id,
            title: displayTitle,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            userId: data.userId,
            pinned: data.pinned || false
          })
        })

        setChatSessions(sessions)
      } catch (err) {
        // console.error("Error fetching chat sessions:", err)
        setChatHistoryError("Failed to load chat history")
      } finally {
        setChatHistoryLoading(false)
      }
    }

    fetchChatSessions()
  }, [user])

  // Load Saved Guidelines
  useEffect(() => {
    if (!user) {
      setSavedGuidelines([])
      setSavedGuidelinesLoading(false)
      return
    }

    const fetchSavedGuidelines = async () => {
      setSavedGuidelinesLoading(true)
      try {
        const db = getFirebaseFirestore()
        const userDoc = await getDoc(doc(db, "users", user.uid))
        
        if (userDoc.exists()) {
          const userData = userDoc.data()
          const bookmarks = userData.bookmarks || []
          setSavedGuidelines(bookmarks)
        }
      } catch (err) {
        // console.error("Error fetching saved guidelines:", err)
        setSavedGuidelinesError("Failed to load saved guidelines")
      } finally {
        setSavedGuidelinesLoading(false)
      }
    }

    fetchSavedGuidelines()
  }, [user])


  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown date'
    
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    } catch {
      return 'Unknown date'
    }
  }

  const handleDelete = async (abstractId: string) => {
    if (!user) return
    
    if (window.confirm('Are you sure you want to delete this visual abstract? This action cannot be undone.')) {
      try {
        const db = getFirebaseFirestore()
        await deleteDoc(doc(db, 'visual_abstracts', user.uid, 'visuals', abstractId))
        
        // Remove from local state
        setVisualAbstracts(prev => prev.filter(abstract => abstract.id !== abstractId))
        
        // Show success message (you can add a toast notification here)
        // console.log('Visual abstract deleted successfully')
      } catch (error) {
        // console.error('Error deleting visual abstract:', error)
        alert('Failed to delete visual abstract. Please try again.')
      }
    }
  }

  const toggleSelectMode = () => {
    const newMode = !isSelectMode
    setIsSelectMode(newMode)
    if (isSelectMode) {
      setSelectedAbstracts(new Set())
    }
    
    // Track selection mode toggle
    if (user) {
      track.visualAbstractSelectionModeToggled(newMode, user.uid, 'library')
    }
  }

  const toggleSelectAll = () => {
    const isCurrentlyAllSelected = selectedAbstracts.size === visualAbstracts.length
    if (isCurrentlyAllSelected) {
      setSelectedAbstracts(new Set())
    } else {
      setSelectedAbstracts(new Set(visualAbstracts.map(abstract => abstract.id)))
    }
    
    // Track select all toggle
    if (user) {
      track.visualAbstractSelectAllToggled(!isCurrentlyAllSelected, visualAbstracts.length, user.uid, 'library')
    }
  }

  const toggleSelectAbstract = (abstractId: string) => {
    const newSelected = new Set(selectedAbstracts)
    const wasSelected = newSelected.has(abstractId)
    if (wasSelected) {
      newSelected.delete(abstractId)
    } else {
      newSelected.add(abstractId)
    }
    setSelectedAbstracts(newSelected)
    
    // Track individual selection/deselection
    if (user) {
      if (wasSelected) {
        track.visualAbstractDeselected(abstractId, user.uid, 'library')
      } else {
        track.visualAbstractSelected(abstractId, user.uid, 'library')
      }
    }
  }

  // Chat History Functions

  const deleteChatSession = async (sessionId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    if (!confirm("Are you sure you want to delete this chat?")) {
      return
    }
    
    // Find the session to get its title for tracking
    const session = chatSessions.find(s => s.id === sessionId)
    const sessionTitle = session?.title || 'Unknown'
    
    // Track conversation deletion
    if (user) {
      track.conversationDeleted(sessionId, sessionTitle, user.uid, 'library')
    }
    
    try {
      const db = getFirebaseFirestore()
      await deleteDoc(doc(db, "conversations", sessionId))
      
      setChatSessions(prev => prev.filter(session => session.id !== sessionId))
    } catch (err) {
      // console.error("Error deleting chat session:", err)
      setChatHistoryError("Failed to delete chat. Please try again.")
    }
  }

  // Filter and sort chats with useMemo to prevent unnecessary re-renders
  const filteredAndSortedSessions = useMemo(() => {
    return chatSessions
      .filter(session => {
        if (!searchQuery.trim()) return true
        return session.title.toLowerCase().includes(searchQuery.toLowerCase())
      })
      .sort((a, b) => {
    switch (sortOption) {
      case 'newest':
        return b.updatedAt - a.updatedAt
      case 'oldest':
        return a.updatedAt - b.updatedAt
      case 'alphabetical':
        return a.title.localeCompare(b.title)
      default:
        return 0
    }
  })
  }, [chatSessions, searchQuery, sortOption])

  const handleBulkDelete = async () => {
    if (selectedAbstracts.size === 0 || !user) return
    
    if (window.confirm(`Are you sure you want to delete ${selectedAbstracts.size} visual abstract(s)? This action cannot be undone.`)) {
      // Track bulk delete
      track.visualAbstractBulkDeleted(selectedAbstracts.size, user.uid, 'library')
      
      try {
        const db = getFirebaseFirestore()
        const deletePromises = Array.from(selectedAbstracts).map(abstractId =>
          deleteDoc(doc(db, 'visual_abstracts', user.uid, 'visuals', abstractId))
        )
        
        await Promise.all(deletePromises)
        
        // Remove from local state
        setVisualAbstracts(prev => prev.filter(abstract => !selectedAbstracts.has(abstract.id)))
        setSelectedAbstracts(new Set())
        setIsSelectMode(false)
        
        // console.log('Bulk delete successful')
      } catch (error) {
        // console.error('Error during bulk delete:', error)
        alert('Failed to delete some visual abstracts. Please try again.')
      }
    }
  }

  // Helper function to convert SVG to PNG and download at 400 DPI
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

  const handleBulkDownload = async () => {
    if (selectedAbstracts.size === 0) return
    
    // Track bulk download
    if (user) {
      track.visualAbstractBulkDownloaded(selectedAbstracts.size, user.uid, 'library')
    }
    
    for (const abstractId of selectedAbstracts) {
      const abstract = visualAbstracts.find(a => a.id === abstractId)
      if (abstract) {
        await downloadAsPNG(abstract.svg.svg_data, `visual-abstract-${abstract.id}.png`)
      }
    }
  }

  // Share functionality functions
  const createPublicVisualAbstract = async (svgContent: string, inputText: string, userId: string, userEmail: string): Promise<string | null> => {
    try {
      const db = getFirebaseFirestore()
      
      const publicVisualAbstractData = {
        input_text: inputText,
        svg: {
          svg_data: svgContent,
          timestamp: new Date().toISOString()
        },
        user_id: userId,
        user_email: userEmail,
        created_at: serverTimestamp(),
        is_public: true
      }

      console.log('Creating public visual abstract with data:', publicVisualAbstractData)
      const publicVisualAbstractRef = await addDoc(collection(db, "public_visual_abstracts"), publicVisualAbstractData)
      console.log('Public visual abstract created with ID:', publicVisualAbstractRef.id)
      
      // Generate shareable link
      const shareableLink = `${window.location.origin}/public/visual-abstract/${publicVisualAbstractRef.id}`
      console.log('Generated shareable link:', shareableLink)
      return shareableLink
    } catch (error) {
      console.error('Error creating public visual abstract:', error)
      return null
    }
  }

  const handleShare = async (abstract: VisualAbstract) => {
    if (!user || !abstract) {
      toast.error('Please sign in to share visual abstracts')
      return
    }

    setSharingAbstractId(abstract.id)
    setIsSharing(true)
    setShowSharePopup(true)

    try {
      const userId = user.uid
      const userEmail = user.email || ''

      // Create public visual abstract
      const shareableLink = await createPublicVisualAbstract(abstract.svg.svg_data, abstract.input_text, userId, userEmail)
      
      if (shareableLink) {
        setShareLink(shareableLink)
        toast.success('Visual abstract shared successfully!')
        
        // Track sharing
        try {
          if (track.visualAbstractShared) {
            track.visualAbstractShared(userId, 'library')
          } else {
            console.warn('visualAbstractShared tracking function not available')
          }
        } catch (error) {
          console.error('Error tracking visual abstract sharing:', error)
        }
      } else {
        throw new Error('Failed to create shareable link')
      }
    } catch (error) {
      console.error('Error sharing visual abstract:', error)
      toast.error('Failed to share visual abstract. Please try again.')
      setShareLink('')
    } finally {
      setIsSharing(false)
    }
  }

  const copyToClipboard = async () => {
    if (!shareLink) return
    
    try {
      await navigator.clipboard.writeText(shareLink)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
      toast.success('Link copied to clipboard!')
    } catch (error) {
      console.error('Error copying to clipboard:', error)
      toast.error('Failed to copy link')
    }
  }

  // Guideline AI Summary Functions
  const handleGuidelineClick = (guideline: SavedGuideline) => {
    setSelectedGuideline(guideline)
    setIsModalOpen(true)
    
    // Track guideline view and modal open
    if (user) {
      track.savedGuidelineViewed(guideline.guidelineId, guideline.guidelineTitle, user.uid, 'library')
      // track.guidelineSummaryModalOpened(guideline.guidelineId, guideline.guidelineTitle, user.uid, 'library')
    }
  }

  const handleModalClose = () => {
    const guidelineId = selectedGuideline?.guidelineId
    const guidelineTitle = selectedGuideline?.guidelineTitle
    setIsModalOpen(false)
    setSelectedGuideline(null)
    
    // Track modal close
    // if (user && guidelineId && guidelineTitle) {
    //   track.guidelineSummaryModalClosed(guidelineId, guidelineTitle, user.uid, 'library')
    // }
  }

  const handleAbstractClick = (abstract: VisualAbstract) => {
    if (!isSelectMode) {
      setSelectedAbstract(abstract)
      setIsAbstractModalOpen(true)
      
      // Track abstract view and modal open
      if (user) {
        track.visualAbstractViewed(abstract.id, user.uid, 'library')
        track.visualAbstractModalOpened(abstract.id, user.uid, 'library')
      }
    }
  }

  const handleAbstractModalClose = () => {
    const abstractId = selectedAbstract?.id
    setIsAbstractModalOpen(false)
    setSelectedAbstract(null)
    
    // Track modal close
    if (user && abstractId) {
      track.visualAbstractModalClosed(abstractId, user.uid, 'library')
    }
  }

  const removeBookmark = async (guideline: SavedGuideline) => {
    if (!user) return
    
    // Track guideline removal
    track.savedGuidelineRemoved(guideline.guidelineId, guideline.guidelineTitle, user.uid, 'library')
    
    try {
      const db = getFirebaseFirestore()
      const userRef = doc(db, "users", user.uid)
      
      // Get current bookmarks
      const userDoc = await getDoc(userRef)
      const currentBookmarks = userDoc.data()?.bookmarks || []
      
      // Remove the specific guideline
      const updatedBookmarks = currentBookmarks.filter(
        (bookmark: SavedGuideline) => bookmark.guidelineId !== guideline.guidelineId
      )
      
      // Update user document
      await updateDoc(userRef, {
        bookmarks: updatedBookmarks
      })
      
      // Update local state
      setSavedGuidelines(updatedBookmarks)
      
      // console.log('Bookmark removed successfully')
    } catch (error) {
      // console.error('Error removing bookmark:', error)
      alert('Failed to remove bookmark. Please try again.')
    }
  }

  const LoadingContent = () => {
    return (
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-8 mt-0 md:mt-16 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-center items-center mb-0 md:mb-[20px]">
          <div className="text-center mb-4 md:mb-0">
            <h1 className="hidden md:block text-[36px] font-semibold text-[#214498] mb-[4px] mt-0 font-['DM_Sans'] font-[600]">Library</h1>
            <p className="hidden md:block text-gray-600 text-[16px] mt-0">Your past conversations, visuals, and saved guidelines</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6 flex justify-center">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('visual-abstracts')}
              className={`pb-2 px-1 text-base font-medium transition-colors ${
                activeTab === 'visual-abstracts'
                  ? 'text-[#214498] border-b-2 border-[#214498]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontSize: '16px' }}
            >
              Visual Abstracts
            </button>
            <button
              onClick={() => setActiveTab('conversations')}
              className={`pb-2 px-1 text-base font-medium transition-colors ${
                activeTab === 'conversations'
                  ? 'text-[#214498] border-b-2 border-[#214498]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontSize: '16px' }}
            >
              Conversations
            </button>
            <button
              onClick={() => setActiveTab('saved-guidelines')}
              className={`pb-2 px-1 text-base font-medium transition-colors ${
                activeTab === 'saved-guidelines'
                  ? 'text-[#214498] border-b-2 border-[#214498]'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              style={{ fontSize: '16px' }}
            >
              Saved Guidelines
            </button>
          </div>
        </div>

        {/* Loading Content based on active tab */}
        {activeTab === 'visual-abstracts' && (
          <div className="flex items-center justify-center h-32">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        {activeTab === 'conversations' && (
          <div className="flex items-center justify-center h-32">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}

        {activeTab === 'saved-guidelines' && (
          <div className="flex items-center justify-center h-32">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        )}
      </div>
    )
  }


  return (
    <DashboardLayout>
      <div className="bg-[#F9FAFB] min-h-screen">
        {user && (loading ? <LoadingContent /> : (
          <div className="max-w-5xl mx-auto px-4 py-4 md:py-8 mt-0 md:mt-16 relative">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-center items-center mb-0 md:mb-[20px]">
              <div className="text-center mb-4 md:mb-0">
                <h1 className="hidden md:block text-[36px] font-semibold text-[#214498] mb-[4px] mt-0 font-['DM_Sans'] font-[600]">Library</h1>
                <p className="hidden md:block text-gray-600 text-[16px] mt-0">Your past conversations, visuals, and saved guidelines</p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="mb-6 flex justify-center">
              <div className="flex space-x-8">
                <button
                  onClick={() => {
                    setActiveTab('visual-abstracts');
                    if (user) {
                      track.libraryTabClicked('visual-abstracts', user.uid, 'library');
                    }
                  }}
                  className={`pb-2 px-1 text-base font-medium transition-colors ${
                    activeTab === 'visual-abstracts'
                      ? 'text-[#214498] border-b-2 border-[#214498]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={{ fontSize: '16px' }}
                >
                  Visual Abstracts
                </button>
                <button
                  onClick={() => {
                    setActiveTab('conversations');
                    if (user) {
                      track.libraryTabClicked('conversations', user.uid, 'library');
                    }
                  }}
                  className={`pb-2 px-1 text-base font-medium transition-colors ${
                    activeTab === 'conversations'
                      ? 'text-[#214498] border-b-2 border-[#214498]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={{ fontSize: '16px' }}
                >
                  Conversations
                </button>
                <button
                  onClick={() => {
                    setActiveTab('saved-guidelines');
                    if (user) {
                      track.libraryTabClicked('saved-guidelines', user.uid, 'library');
                    }
                  }}
                  className={`pb-2 px-1 text-base font-medium transition-colors ${
                    activeTab === 'saved-guidelines'
                      ? 'text-[#214498] border-b-2 border-[#214498]'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                  style={{ fontSize: '16px' }}
                >
                  Saved Guidelines
                </button>
              </div>
            </div>

            {/* Tab Content */}
            {activeTab === 'visual-abstracts' && (
              <>
                {error && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {error}
                  </div>
                )}

                {/* Selection Controls */}
                {visualAbstracts.length > 0 && (
                  <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={toggleSelectMode}
                        className={`flex flex-row items-center justify-center gap-x-2 rounded-[5px] px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 text-white !text-white transition-colors ${
                          isSelectMode 
                            ? 'bg-[#002A7C] hover:bg-[#1B3B8B] border-[#002A7C]' 
                            : 'bg-[#002A7C] hover:bg-[#1B3B8B] border-[#002A7C]'
                        }`}
                      >
                        {isSelectMode ? 'Cancel Selection' : 'Select Items'}
                      </Button>
                      
                      {isSelectMode && (
                        <div className="flex items-center space-x-3">
                          <label className="flex items-center space-x-2 cursor-pointer">
                            <div className="relative">
                              <input
                                type="checkbox"
                                checked={selectedAbstracts.size === visualAbstracts.length}
                                onChange={toggleSelectAll}
                                className="sr-only"
                              />
                              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                                selectedAbstracts.size === visualAbstracts.length
                                  ? 'bg-white border-[#B5C9FC]'
                                  : 'bg-white border-[#B5C9FC]'
                              }`}>
                                {selectedAbstracts.size === visualAbstracts.length && (
                                  <Check className="w-3 h-3 text-[#3771FE] stroke-[2.5]" />
                                )}
                              </div>
                            </div>
                            <span className="text-sm text-[#223258]">Select All</span>
                          </label>
                          
                          <span className="text-sm text-[#223258]/70">
                            {selectedAbstracts.size} of {visualAbstracts.length} selected
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {isSelectMode && selectedAbstracts.size > 0 && (
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleBulkDownload}
                          className="flex flex-row items-center justify-center gap-x-2 rounded-[5px] px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 bg-[#002A7C] hover:bg-[#1B3B8B] border-[#002A7C] text-white !text-white transition-colors"
                        >
                          <Download className="h-4 w-4" />
                          Download Selected
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleBulkDelete}
                          className="flex flex-row items-center justify-center gap-x-2 rounded-[5px] px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-2.5 bg-[#002A7C] hover:bg-[#1B3B8B] border-[#002A7C] text-white !text-white transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete Selected
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {visualAbstracts.length === 0 && !loading ? (
                  <div className="text-center py-12">
                    <div className="h-24 w-24 rounded-full bg-[#E4ECFF] flex items-center justify-center mx-auto mb-4">
                      <svg className="h-12 w-12 text-[#223258]/50" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1z"/>
                        <path d="M8 7h8v2H8zm0 4h8v2H8zm0 4h5v2H8z"/>
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-[#223258] mb-2">No visual abstracts yet</h3>
                    <p className="text-[#223258]/70 mb-4">Your generated visual abstracts will appear here</p>
                    <Button 
                      onClick={() => {
                        if (user) {
                          track.createVisualAbstractClicked(user.uid, 'library')
                        }
                        window.location.href = '/image-generator'
                      }}
                      className="bg-[#223258] hover:bg-[#223258]/90 text-white"
                    >
                      Create a visual abstract
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Visual Abstracts Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                      {visualAbstracts.map((abstract) => (
                        <Card 
                          key={abstract.id} 
                          className={`bg-white shadow-sm border-[#B5C9FC] hover:shadow-md transition-shadow relative cursor-pointer ${isSelectMode ? 'ring-2 ring-[#223258]/20' : ''}`}
                          onClick={() => isSelectMode ? toggleSelectAbstract(abstract.id) : handleAbstractClick(abstract)}
                        >
                          {/* Selection Checkbox */}
                          {isSelectMode && (
                            <div className="absolute top-3 left-3 z-10">
                              <div className="relative">
                                <input
                                  type="checkbox"
                                  checked={selectedAbstracts.has(abstract.id)}
                                  onChange={() => toggleSelectAbstract(abstract.id)}
                                  className="sr-only"
                                />
                                <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                                  selectedAbstracts.has(abstract.id)
                                    ? 'bg-white border-[#B5C9FC]'
                                    : 'bg-white border-[#B5C9FC]'
                                }`}>
                                  {selectedAbstracts.has(abstract.id) && (
                                    <Check className="w-4 h-4 text-[#3771FE] stroke-[3]" />
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="absolute top-3 right-3 z-10 flex gap-1">
                            {/* Share Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 bg-white/90 backdrop-blur-sm border border-[#B5C9FC] hover:bg-white hover:border-[#223258] transition-all"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleShare(abstract)
                              }}
                              title="Share Visual Abstract"
                            >
                              <Share2 className="h-3 w-3 text-[#223258]" />
                            </Button>
                            
                            {/* Download Button */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 bg-white/90 backdrop-blur-sm border border-[#B5C9FC] hover:bg-white hover:border-[#223258] transition-all"
                              onClick={(e) => {
                                e.stopPropagation()
                                if (user) {
                                  track.visualAbstractDownloaded(abstract.id, user.uid, 'library')
                                }
                                downloadAsPNG(abstract.svg.svg_data, `visual-abstract-${abstract.id}.png`)
                              }}
                              title="Download as PNG"
                            >
                              <Download className="h-3 w-3 text-[#223258]" />
                            </Button>
                          </div>
                          
                          <CardContent className="p-6">
                            <div className="mb-4">
                              <div 
                                className="w-full h-56 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden"
                                dangerouslySetInnerHTML={{ __html: abstract.svg.svg_data }}
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <div className="flex items-center text-sm text-[#223258]/70">
                                <Calendar className="h-4 w-4 mr-2" />
                                {formatTimestamp(abstract.svg.timestamp)}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Infinite Scroll Loading Indicator */}
                    {hasMore && (
                      <div className="text-center py-6">
                        {loadingMore && (
                          <div className="flex items-center justify-center space-x-2 text-[#223258]/70">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                            <span className="text-sm">Loading more...</span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}

            {activeTab === 'conversations' && (
              <div className="w-full">
                {/* Search and Filters */}
                <div className="mb-6 w-full flex flex-col sm:flex-row gap-4 max-w-3xl mx-auto items-center justify-between">
                  <div ref={searchInputRef} className="relative flex-grow min-w-[320px] max-w-xl w-full">
                    <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search conversations..."
                      value={searchQuery}
                      onChange={handleSearchChange}
                      onFocus={() => {
                        if (searchQuery) setShowSuggestions(true)
                      }}
                      className="pl-10 pr-10 h-11 w-full border rounded-[2px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-base border-[#3771fe44] shadow-[0px_0px_11px_#0000000c]"
                      style={{ fontFamily: 'DM Sans, sans-serif', borderColor: 'rgba(55, 113, 254, 0.5)' }}
                    />
                    {searchQuery && (
                      <button 
                        onClick={clearSearch}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={16} />
                      </button>
                    )}
                    {/* Autocomplete suggestions */}
                    {showSuggestions && suggestions.length > 0 && (
                      <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-[2px] shadow-lg max-w-xl w-full" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        <ul className="py-1">
                          {suggestions.map((suggestion, index) => (
                            <li 
                              key={index} 
                              className="px-4 py-2 hover:bg-blue-50 cursor-pointer truncate text-base"
                              onClick={() => handleSuggestionClick(suggestion)}
                            >
                              {suggestion}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  <div className="relative min-w-[180px]">
                    <select
                      value={sortOption}
                      onChange={(e) => {
                        const newSortOption = e.target.value as SortOption
                        setSortOption(newSortOption)
                        if (user) {
                          track.conversationSortChanged(newSortOption, user.uid, 'library')
                        }
                      }}
                      className="appearance-none pl-10 pr-10 h-11 w-full border rounded-[2px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-base text-[#214498] font-normal"
                      style={{ fontFamily: 'DM Sans, sans-serif', color: '#214498', fontWeight: 400, borderColor: 'rgba(55, 113, 254, 0.5)' }}
                    >
                      <option value="newest" style={{ color: '#214498', fontFamily: 'DM Sans, sans-serif', fontWeight: 'regular' }}>Newest First</option>
                      <option value="oldest" style={{ color: '#214498', fontFamily: 'DM Sans, sans-serif', fontWeight: 'regular' }}>Oldest First</option>
                      <option value="alphabetical" style={{ color: '#214498', fontFamily: 'DM Sans, sans-serif', fontWeight: 'regular' }}>Alphabetical</option>
                    </select>
                    <ArrowUpDown className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                  </div>
                </div>

                {/* Chat History Content */}
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {chatHistoryLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  ) : chatHistoryError ? (
                    <div className="p-4 text-red-600">{chatHistoryError}</div>
                  ) : !user ? (
                    <div className="p-4 text-center text-gray-500">
                      <p>Please log in to see your chat history</p>
                    </div>
                  ) : filteredAndSortedSessions.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <p>{searchQuery.trim() ? 'No conversations found matching your search' : 'No chat history found'}</p>
                      <p className="text-sm mt-1">
                        {searchQuery.trim() ? 'Try a different search term' : 'Start a new conversation by clicking the New Search button'}
                      </p>
                    </div>
                  ) : (
                    (() => {
                      const groups: Record<string, typeof filteredAndSortedSessions> = {};
                      
                      // Separate pinned and unpinned sessions
                      const pinnedSessions = filteredAndSortedSessions.filter(session => session.pinned === true);
                      const unpinnedSessions = filteredAndSortedSessions.filter(session => session.pinned !== true);
                      
                      // Add pinned sessions to a special "Pinned" group
                      if (pinnedSessions.length > 0) {
                        groups['Pinned'] = pinnedSessions.sort((a, b) => b.updatedAt - a.updatedAt);
                      }
                      
                      // Group unpinned sessions by date
                      unpinnedSessions.forEach(session => {
                        const date = new Date(session.updatedAt);
                        let groupLabel = format(date, 'MMMM d, yyyy');
                        if (isToday(date)) groupLabel = 'Today';
                        else if (isYesterday(date)) groupLabel = 'Yesterday';
                        if (!groups[groupLabel]) groups[groupLabel] = [];
                        groups[groupLabel].push(session);
                      });
                      
                      // Sort groups: Pinned first, then by date
                      const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
                        if (a === 'Pinned') return -1;
                        if (b === 'Pinned') return 1;
                        return 0;
                      });
                      
                      return (
                        <div className="space-y-8 max-w-4xl mx-auto">
                          {sortedGroups.map(([label, sessions]) => (
                            <div key={label}>
                              <div className="text-lg font-semibold text-[#214498] mb-3" style={{ fontFamily: 'DM Sans, sans-serif', fontSize: '16px' }}>{label}</div>
                              <div className="space-y-4">
                                {sessions.map(session => (
                                  <div key={session.id} className="bg-[#F4F7FF] rounded-[2px] p-4 flex items-start shadow-sm hover:shadow-md transition-shadow relative border" style={{ borderColor: 'rgba(55, 113, 254, 0.5)' }}>
                                    <Link 
                                      href={`/dashboard/${session.id}`} 
                                      className="flex-1 min-w-0 group pr-10"
                                      onClick={() => {
                                        if (user) {
                                          track.conversationClicked(session.id, session.title, user.uid, 'library')
                                        }
                                      }}
                                    >
                                      <div className="text-base font-medium mb-2 group-hover:underline truncate overflow-hidden whitespace-nowrap" style={{ fontFamily: 'DM Sans, sans-serif', color: '#223258', fontSize: '16px' }}>
                                        {label === 'Pinned' && (
                                          <Pin size={14} className="inline mr-2 text-[#214498]" />
                                        )}
                                        {session.title}
                                      </div>
                                      <div className="flex items-center text-xs text-[#7A8CA3] font-['DM_Sans']">
                                        <Clock size={14} className="mr-1" />
                                        {formatDistanceToNow(new Date(session.updatedAt), { addSuffix: true })}
                                      </div>
                                    </Link>
                                    <button
                                      onClick={e => deleteChatSession(session.id, e)}
                                      className="ml-4 p-2 rounded-[2px] transition-colors text-[#223258] absolute top-3 right-3 bg-transparent hover:bg-red-50"
                                      aria-label="Delete chat"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()
                  )}
                </div>
              </div>
            )}

            {activeTab === 'saved-guidelines' && (
              <div className="w-full">
                {savedGuidelinesError && (
                  <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                    {savedGuidelinesError}
                  </div>
                )}

                {savedGuidelinesLoading ? (
                  <div className="flex items-center justify-center h-32">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  </div>
                ) : !user ? (
                  <div className="p-4 text-center text-gray-500">
                    <p>Please log in to see your saved guidelines</p>
                  </div>
                ) : savedGuidelines.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="h-24 w-24 rounded-full bg-[#E4ECFF] flex items-center justify-center mx-auto mb-4">
                      <svg className="h-12 w-12 text-[#223258]/50" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-1 16H6c-.55 0-1-.45-1-1V6c0-.55.45-1 1-1h12c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1z"/>
                        <path d="M8 7h8v2H8zm0 4h8v2H8zm0 4h5v2H8z"/>
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-[#223258] mb-2">No saved guidelines yet</h3>
                    <p className="text-[#223258]/70 mb-4">Your bookmarked guidelines will appear here</p>
                    <Button 
                      onClick={() => {
                        if (user) {
                          track.browseGuidelinesClicked(user.uid, 'library')
                        }
                        window.location.href = '/guidelines'
                      }}
                      className="bg-[#223258] hover:bg-[#223258]/90 text-white"
                    >
                      Browse Guidelines
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4 p-3 sm:p-4" style={{ background: '#EEF3FF' }}>
                    {savedGuidelines.map((guideline, index) => (
                      <div key={`saved-${guideline.guidelineId}-${index}`} className="border px-0 pb-2 sm:pb-4 pt-1 sm:pt-2" style={{ borderColor: '#A2BDFF', borderWidth: 1, borderStyle: 'solid', background: '#fff' }}>
                        <div className="px-3 sm:px-6 py-2 sm:py-4">
                          <div className="space-y-2 sm:space-y-3">
                            {/* Title as a link */}
                            <a 
                              href={guideline.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block"
                              onClick={() => {
                                if (user) {
                                  track.savedGuidelineClicked(guideline.guidelineId, guideline.guidelineTitle, guideline.url, user.uid, 'library')
                                }
                              }}
                              style={{
                                fontFamily: 'DM Sans, sans-serif',
                                color: '#214498',
                                fontWeight: 500,
                                fontSize: 'clamp(14px, 1.5vw, 16px)',
                                background: 'none',
                                border: 'none',
                              }}
                            >
                              {guideline.guidelineTitle}
                            </a>
                            
                            {/* Year and Publisher badges */}
                            <div className="flex flex-wrap items-center gap-2">
                              {/* Year badge */}
                              <span 
                                className="px-2 sm:px-3 py-1 text-xs sm:text-sm"
                                style={{
                                  fontFamily: 'DM Sans, sans-serif',
                                  color: '#3771FE',
                                  background: 'rgba(148, 167, 214, 0.2)',
                                  fontWeight: 400,
                                  border: 'none',
                                  marginRight: 4,
                                }}
                              >
                                {new Date(guideline.lastUpdated).getFullYear()}
                              </span>
                              
                              {/* Publisher badge */}
                              {guideline.society && (
                                <span 
                                  className="px-2 sm:px-3 py-1 text-xs sm:text-sm break-words max-w-full"
                                  style={{
                                    fontFamily: 'DM Sans, sans-serif',
                                    color: '#3771FE',
                                    background: 'rgba(148, 167, 214, 0.2)',
                                    fontWeight: 400,
                                    border: 'none',
                                    display: 'inline-block',
                                    wordBreak: 'break-word'
                                  }}
                                >
                                  {guideline.society}
                                </span>
                              )}
                            </div>
                            
                            {/* Remove Bookmark and Guideline AI Summary buttons */}
                            <div className="flex flex-row items-center gap-3">
                              <button 
                                onClick={() => removeBookmark(guideline)}
                                className="flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors"
                                style={{ fontSize: 'clamp(12px, 1.5vw, 14px)' }}
                              >
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
                                </svg>
                                <span>Remove</span>
                              </button>
                              
                              <div className="flex-grow"></div>
                              
                              {/* Guideline AI Summary Button */}
                              <button 
                                onClick={() => {
                                  if (user) {
                                    track.savedGuidelineAISummaryClicked(guideline.guidelineId, guideline.guidelineTitle, user.uid, 'library')
                                  }
                                  handleGuidelineClick(guideline)
                                }}
                                disabled={!guideline.pdf_saved}
                                className={`flex items-center gap-1 px-3 sm:px-4 py-1.5 sm:py-2 transition-colors text-xs sm:text-sm
                                ${guideline.pdf_saved 
                                    ? '' 
                                    : 'cursor-not-allowed'}
                                `}
                                style={{
                                  background: guideline.pdf_saved ? '#01257C' : 'rgba(1, 37, 124, 0.5)',
                                  color: '#fff',
                                  fontFamily: 'DM Sans, sans-serif',
                                  fontWeight: 500,
                                  border: 'none',
                                  boxShadow: 'none',
                                  opacity: guideline.pdf_saved ? 1 : 0.5,
                                  minWidth: '10px',
                                  fontSize: 'clamp(12px, 1.5vw, 14px)'
                                }}
                              >
                                {guideline.pdf_saved ? 'Guideline AI Summary' : 'Processing for AI Summary...'}
                                {guideline.pdf_saved && (
                                  <span className="flex items-center ml-1 sm:ml-2">
                                    <ChevronRight size={14} className="sm:w-4 sm:h-4" style={{marginLeft: -10}} color="#fff" />
                                    <ChevronRight size={14} className="sm:w-4 sm:h-4" style={{marginLeft: -10}} color="#fff" />
                                  </span>
                                )}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      {selectedGuideline && (
        isMobile ? (
          <GuidelineSummaryMobileModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            guidelineId={selectedGuideline.guidelineId}
            guidelineTitle={selectedGuideline.guidelineTitle}
            year={new Date(selectedGuideline.lastUpdated).getFullYear().toString()}
            link={selectedGuideline.link}
            url={selectedGuideline.url}
          />
        ) : (
          <GuidelineSummaryModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            guidelineId={selectedGuideline.guidelineId}
            guidelineTitle={selectedGuideline.guidelineTitle}
            year={new Date(selectedGuideline.lastUpdated).getFullYear().toString()}
            society={selectedGuideline.society}
            link={selectedGuideline.link}
            url={selectedGuideline.url}
          />
        )
      )}

      {/* Visual Abstract Modal */}
      {selectedAbstract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-lg relative max-w-[95vw] max-h-[95vh] overflow-auto">
            {/* Close button positioned absolutely */}
            <button
              onClick={handleAbstractModalClose}
              className="absolute top-2 right-2 z-10 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-lg hover:bg-white transition-colors"
            >
              <X className="h-5 w-5 text-gray-700" />
            </button>
            
            {/* Scrollable image container */}
            <div className="flex items-center justify-center p-2 min-h-full overflow-auto">
              <div 
                className="bg-gray-50 rounded-lg border border-gray-200 overflow-hidden min-w-max"
                dangerouslySetInnerHTML={{ __html: selectedAbstract.svg.svg_data }}
              />
            </div>
            
            {/* Bottom info bar */}
            <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between sticky bottom-0">
              <div className="flex items-center text-sm text-[#223258]/70">
                <Calendar className="h-4 w-4 mr-2" />
                {formatTimestamp(selectedAbstract.svg.timestamp)}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (user) {
                    track.visualAbstractDownloaded(selectedAbstract.id, user.uid, 'library')
                  }
                  downloadAsPNG(selectedAbstract.svg.svg_data, `visual-abstract-${selectedAbstract.id}.png`)
                }}
                className="bg-[#002A7C] hover:bg-[#1B3B8B] border-[#002A7C] text-white"
              >
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Share Popup */}
      {showSharePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50">
          <div className="bg-[#FCFDFF] rounded-lg shadow-xl max-w-xl w-full mx-2 sm:mx-4 border border-[#C8C8C8] max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-4 sm:p-6">
              <h2 className="text-xl sm:text-2xl font-medium text-blue-900">
                Share Visual Abstract
              </h2>
              <button
                onClick={() => setShowSharePopup(false)}
                className="text-[#263969] hover:text-gray-600 transition-colors"
              >
                <X size={20} className="sm:w-6 sm:h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="px-4 sm:px-6">
              {/* Link Creation Status */}
              <div className="mb-4 sm:mb-6">
                {isSharing ? (
                  <div className="flex items-center space-x-3 p-3 sm:p-4 bg-gray-50 rounded-lg border">
                    <div className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-blue-600"></div>
                    <span className="text-sm sm:text-base text-gray-500">Creating Link...</span>
                  </div>
                ) : (
                  <div className="mt-2 sm:mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-0 sm:space-x-2 p-2 sm:p-3 bg-gray-50 rounded-lg border border-[#C8D8FF]">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 bg-transparent text-xs sm:text-sm text-gray-700 focus:outline-none px-2 py-2 sm:py-0"
                    />
                    <button
                      onClick={copyToClipboard}
                      disabled={!shareLink}
                      className="flex items-center justify-center space-x-2 px-3 sm:px-4 py-2 bg-blue-600 text-white text-sm sm:text-base rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
                    >
                      {isCopied ? (
                        <>
                          <Check size={16} className="sm:w-[18px] sm:h-[18px]" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={16} className="sm:w-[18px] sm:h-[18px]" />
                          <span>Copy link</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Border line */}
            <div className="border-t border-gray-200"></div>

            {/* Share Options */}
            <div className="px-4 sm:px-6 pb-4 sm:pb-6">
              <div className="flex justify-center space-x-4 sm:space-x-6 md:space-x-8">
                {/* LinkedIn */}
                <button 
                  onClick={() => {
                    const message = `Check out this visual abstract from DR. INFO: ${shareLink}`;
                    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(message)}`;
                    window.open(url, '_blank');
                  }}
                  disabled={!shareLink || isSharing}
                  className="flex flex-col items-center space-y-1 sm:space-y-2 p-2 sm:p-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#0077B5] flex items-center justify-center" style={{ borderRadius: '5px' }}>
                    <FaLinkedin className="w-[70%] h-[70%] text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">LinkedIn</span>
                </button>

                {/* WhatsApp */}
                <button 
                  onClick={() => {
                    const message = `Check out this visual abstract from DR. INFO: ${shareLink}`;
                    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
                    window.open(url, '_blank');
                  }}
                  disabled={!shareLink || isSharing}
                  className="flex flex-col items-center space-y-1 sm:space-y-2 p-2 sm:p-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#25D366] flex items-center justify-center" style={{ borderRadius: '5px' }}>
                    <FaWhatsapp className="w-[70%] h-[70%] text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">WhatsApp</span>
                </button>

                {/* Mail */}
                <button 
                  onClick={() => {
                    const subject = 'Visual Abstract from DR. INFO';
                    const body = `Check out this visual abstract from DR. INFO: ${shareLink}`;
                    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.open(url);
                  }}
                  disabled={!shareLink || isSharing}
                  className="flex flex-col items-center space-y-1 sm:space-y-2 p-2 sm:p-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-[#214498] flex items-center justify-center" style={{ borderRadius: '5px' }}>
                    <FaEnvelope className="w-[70%] h-[70%] text-white" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-gray-700">Mail</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
