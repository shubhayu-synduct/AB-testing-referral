"use client"

import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getFirebaseFirestore } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, deleteDoc, doc } from 'firebase/firestore'
import Link from "next/link"
import { format, isToday, isYesterday, formatDistanceToNow } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, FolderOpen, Calendar, Clock, Loader2, Trash2, Check, Download, Search, ArrowUpDown, X, Pin } from 'lucide-react'
import { DashboardLayout } from "@/components/dashboard/dashboard-layout"

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

export default function LibraryPage() {
  const { user } = useAuth()
  const [visualAbstracts, setVisualAbstracts] = useState<VisualAbstract[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isNearBottom, setIsNearBottom] = useState(false)
  const [selectedAbstracts, setSelectedAbstracts] = useState<Set<string>>(new Set())
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [activeTab, setActiveTab] = useState<'visual-abstracts' | 'conversations'>('visual-abstracts')
  
  // Chat History State
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [chatHistoryLoading, setChatHistoryLoading] = useState(true)
  const [chatHistoryError, setChatHistoryError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('newest')
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  const fetchVisualAbstracts = async (isLoadMore = false) => {
    if (!user) {
      console.log('No user found, cannot fetch visual abstracts')
      return
    }

    console.log('Fetching visual abstracts for user:', user.uid)
    
    try {
      setLoadingMore(isLoadMore)
      const db = getFirebaseFirestore()
      
      // Log the collection path we're querying
      const collectionPath = `visual_abstracts/${user.uid}/visuals`
      console.log('Querying collection path:', collectionPath)
      
      // First, let's check if the collection exists by trying to get a simple snapshot
      try {
        const testSnapshot = await getDocs(collection(db, 'visual_abstracts', user.uid, 'visuals'))
        console.log('Collection exists, total documents:', testSnapshot.size)
      } catch (testErr) {
        console.log('Collection test failed:', testErr)
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

      console.log('Executing query...')
      const querySnapshot = await getDocs(q)
      console.log('Query result:', querySnapshot.size, 'documents found')
      
      const newAbstracts: VisualAbstract[] = []
      const seenIds = new Set<string>()
      
      querySnapshot.forEach((doc) => {
        const data = doc.data()
        console.log('Document data:', doc.id, data)
        
        // Skip if we've already seen this ID
        if (seenIds.has(doc.id)) {
          console.log('Skipping duplicate ID:', doc.id)
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

      console.log('Processed abstracts:', newAbstracts.length)

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
      console.error('Error fetching visual abstracts:', err)
      setError('Failed to load visual abstracts. Please try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    console.log('useEffect triggered, user:', user)
    if (user) {
      console.log('User authenticated, fetching visual abstracts...')
      fetchVisualAbstracts()
    } else {
      console.log('No user yet, waiting for authentication...')
    }
  }, [user])

  // Infinite scroll logic using Intersection Observer
  useEffect(() => {
    if (!hasMore || loadingMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && hasMore && !loadingMore) {
            console.log('Load more trigger detected')
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
        console.error("Error fetching chat sessions:", err)
        setChatHistoryError("Failed to load chat history")
      } finally {
        setChatHistoryLoading(false)
      }
    }

    fetchChatSessions()
  }, [user])

  // Handle clicks outside the search component
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  // Generate suggestions based on search term
  useEffect(() => {
    if (searchTerm.trim().length > 0) {
      const allTitles = chatSessions.map(session => session.title)
      const uniqueWords = new Set<string>()
      
      allTitles.forEach(title => {
        const words = title.toLowerCase().split(/\s+/)
        words.forEach(word => {
          if (word.length > 2 && word.includes(searchTerm.toLowerCase())) {
            uniqueWords.add(word)
          }
          
          if (title.toLowerCase().includes(searchTerm.toLowerCase())) {
            uniqueWords.add(title)
          }
        })
      })
      
      const exactMatches = Array.from(uniqueWords)
        .filter(word => word.toLowerCase().startsWith(searchTerm.toLowerCase()))
        .sort()
      
      const otherMatches = Array.from(uniqueWords)
        .filter(word => !word.toLowerCase().startsWith(searchTerm.toLowerCase()))
        .sort()
      
      setSuggestions([...exactMatches, ...otherMatches].slice(0, 5))
      setShowSuggestions(true)
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [searchTerm, chatSessions])

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
        console.log('Visual abstract deleted successfully')
      } catch (error) {
        console.error('Error deleting visual abstract:', error)
        alert('Failed to delete visual abstract. Please try again.')
      }
    }
  }

  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode)
    if (isSelectMode) {
      setSelectedAbstracts(new Set())
    }
  }

  const toggleSelectAll = () => {
    if (selectedAbstracts.size === visualAbstracts.length) {
      setSelectedAbstracts(new Set())
    } else {
      setSelectedAbstracts(new Set(visualAbstracts.map(abstract => abstract.id)))
    }
  }

  const toggleSelectAbstract = (abstractId: string) => {
    const newSelected = new Set(selectedAbstracts)
    if (newSelected.has(abstractId)) {
      newSelected.delete(abstractId)
    } else {
      newSelected.add(abstractId)
    }
    setSelectedAbstracts(newSelected)
  }

  // Chat History Functions
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    
    if (e.target.value.trim()) {
      setShowSuggestions(true)
    } else {
      setShowSuggestions(false)
    }
  }
  
  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion)
    setShowSuggestions(false)
  }
  
  const clearSearch = () => {
    setSearchTerm('')
    setShowSuggestions(false)
  }

  const deleteChatSession = async (sessionId: string, event: React.MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    
    if (!confirm("Are you sure you want to delete this chat?")) {
      return
    }
    
    try {
      const db = getFirebaseFirestore()
      await deleteDoc(doc(db, "conversations", sessionId))
      
      setChatSessions(prev => prev.filter(session => session.id !== sessionId))
    } catch (err) {
      console.error("Error deleting chat session:", err)
      setChatHistoryError("Failed to delete chat. Please try again.")
    }
  }

  // Filter and sort chats
  const filteredAndSortedSessions = chatSessions
    .filter(session => {
      if (searchTerm) {
        return session.title.toLowerCase().includes(searchTerm.toLowerCase())
      }
      return true
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

  const handleBulkDelete = async () => {
    if (selectedAbstracts.size === 0 || !user) return
    
    if (window.confirm(`Are you sure you want to delete ${selectedAbstracts.size} visual abstract(s)? This action cannot be undone.`)) {
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
        
        console.log('Bulk delete successful')
      } catch (error) {
        console.error('Error during bulk delete:', error)
        alert('Failed to delete some visual abstracts. Please try again.')
      }
    }
  }

  const handleBulkDownload = () => {
    if (selectedAbstracts.size === 0) return
    
    selectedAbstracts.forEach(abstractId => {
      const abstract = visualAbstracts.find(a => a.id === abstractId)
      if (abstract) {
        const blob = new Blob([abstract.svg.svg_data], { type: 'image/svg+xml' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `visual-abstract-${abstract.id}.svg`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
      }
    })
  }



  const LoadingContent = () => {
    return (
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-8 mt-0 md:mt-16 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-center items-center mb-0 md:mb-[20px]">
          <div className="text-center mb-4 md:mb-0">
            <h1 className="hidden md:block text-[36px] font-semibold text-[#214498] mb-[4px] mt-0 font-['DM_Sans'] font-[600]">Library</h1>
            <p className="hidden md:block text-gray-600 text-[16px] mt-0">Your past conversations and visuals</p>
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
      </div>
    )
  }

  const LibraryContent = () => {
    return (
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-8 mt-0 md:mt-16 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-center items-center mb-0 md:mb-[20px]">
          <div className="text-center mb-4 md:mb-0">
            <h1 className="hidden md:block text-[36px] font-semibold text-[#214498] mb-[4px] mt-0 font-['DM_Sans'] font-[600]">History</h1>
            <p className="hidden md:block text-gray-600 text-[16px] mt-0">Your past conversations and visuals</p>
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
                  onClick={() => window.location.href = '/image-generator'}
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
                      onClick={() => isSelectMode && toggleSelectAbstract(abstract.id)}
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
                      
                      {/* Download Button */}
                      <div className="absolute top-3 right-3 z-10">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 bg-white/90 backdrop-blur-sm border border-[#B5C9FC] hover:bg-white hover:border-[#223258] transition-all"
                          onClick={() => {
                            const blob = new Blob([abstract.svg.svg_data], { type: 'image/svg+xml' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `visual-abstract-${abstract.id}.svg`
                            document.body.appendChild(a)
                            a.click()
                            document.body.removeChild(a)
                            URL.revokeObjectURL(url)
                          }}
                        >
                          <Download className="h-3 w-3 text-[#223258]" />
                        </Button>
                      </div>
                      
                      <CardContent className="p-6">
                        <div className="mb-4">
                          <div 
                            className="w-full h-48 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-center overflow-hidden"
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
              <div ref={searchRef} className="relative flex-grow min-w-[320px] max-w-xl w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search chats..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => {
                    if (searchTerm) setShowSuggestions(true)
                  }}
                  className="pl-10 pr-10 h-11 w-full border rounded-[2px] focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs md:text-base border-[#3771fe44] shadow-[0px_0px_11px_#0000000c]"
                  style={{ fontFamily: 'DM Sans, sans-serif', borderColor: 'rgba(55, 113, 254, 0.5)' }}
                />
                {searchTerm && (
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
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
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
                  {searchTerm ? (
                    <p>No matching chat sessions found</p>
                  ) : (
                    <>
                      <p>No chat history found</p>
                      <p className="text-sm mt-1">Start a new conversation by clicking the New Search button</p>
                    </>
                  )}
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
                                <Link href={`/dashboard/${session.id}`} className="flex-1 min-w-0 group pr-10">
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
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="bg-[#F9FAFB] min-h-screen">
        {user && (loading ? <LoadingContent /> : <LibraryContent />)}
      </div>
    </DashboardLayout>
  )
}
