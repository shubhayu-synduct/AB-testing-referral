"use client"

import React, { useEffect, useState, useRef } from 'react'
import { useAuth } from '@/hooks/use-auth'
import { getFirebaseFirestore } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs, limit, startAfter, QueryDocumentSnapshot, DocumentData, deleteDoc, doc } from 'firebase/firestore'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ChevronDown, FolderOpen, Calendar, Clock, Loader2, Trash2, Check, Download } from 'lucide-react'
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
            <p className="hidden md:block text-gray-600 text-[16px] mt-0">Your visual abstracts collection</p>
          </div>
        </div>

        {/* Loading Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="bg-white shadow-sm border-[#B5C9FC]">
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full mb-4" />
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-3 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const LibraryContent = () => {
    return (
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-8 mt-0 md:mt-16 relative">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-center items-center mb-0 md:mb-[20px]">
          <div className="text-center mb-4 md:mb-0">
            <h1 className="hidden md:block text-[36px] font-semibold text-[#214498] mb-[4px] mt-0 font-['DM_Sans'] font-[600]">Library</h1>
            <p className="hidden md:block text-gray-600 text-[16px] mt-0">Your visual abstracts collection</p>
          </div>
        </div>

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
              <FolderOpen className="h-12 w-12 text-[#223258]/50" />
            </div>
            <h3 className="text-xl font-semibold text-[#223258] mb-2">No visual abstracts yet</h3>
            <p className="text-[#223258]/70 mb-4">Your generated visual abstracts will appear here</p>
            <Button 
              onClick={() => window.location.href = '/image-generator'}
              className="bg-[#223258] hover:bg-[#223258]/90 text-white"
            >
              Create Your First Visual Abstract
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
