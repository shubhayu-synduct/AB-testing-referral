"use client"

import { useState, useEffect, useRef } from "react"
import { useAuth } from "@/hooks/use-auth"
import { getFirebaseFirestore } from '@/lib/firebase'
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore'
import Link from "next/link"
import { format, isToday, isYesterday } from 'date-fns'
import React from "react"
import { MoreVertical, Trash2, Pin, PinOff } from 'lucide-react'
import { deleteDoc, doc, updateDoc } from 'firebase/firestore'

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  pinned?: boolean;
}

export function SidebarHistory() {
  const { user } = useAuth()
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [openMenu, setOpenMenu] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!user) {
      setChatSessions([])
      setLoading(false)
      return
    }
    const fetchChatSessions = async () => {
      setLoading(true)
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
          const data = doc.data() as ChatSession & { messages?: any[] }
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
            if (displayTitle.length > 40) {
              displayTitle = displayTitle.substring(0, 37) + '...'
            }
          }
          
          const sessionData = {
            id: doc.id,
            title: displayTitle,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            userId: data.userId,
            pinned: data.pinned || false // Include the pinned state from Firebase
          }
          
          // console.log('Session data from Firebase:', doc.id, sessionData)
          sessions.push(sessionData)
        })
        setChatSessions(sessions)
      } catch (err) {
        setChatSessions([])
      } finally {
        setLoading(false)
      }
    }
    fetchChatSessions()
  }, [user])

  // Handle clicks outside the menu to close it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenu(null)
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const deleteChatSession = async (sessionId: string) => {
    if (!user) return
    
    try {
      const db = getFirebaseFirestore()
      await deleteDoc(doc(db, "conversations", sessionId))
      setChatSessions(prev => prev.filter(session => session.id !== sessionId))
    } catch (err) {
      console.error("Error deleting chat session:", err)
    }
  }

  const togglePinChatSession = async (sessionId: string) => {
    if (!user) return
    
    try {
      const db = getFirebaseFirestore()
      const session = chatSessions.find(s => s.id === sessionId)
      if (!session) return
      
      const newPinnedState = !session.pinned
      // console.log('Toggling pin for session:', sessionId, 'from', session.pinned, 'to', newPinnedState)
      
      await updateDoc(doc(db, "conversations", sessionId), {
        pinned: newPinnedState
      })
      
      // console.log('Successfully updated Firebase, updating local state...')
      
      setChatSessions(prev => prev.map(s => 
        s.id === sessionId ? { ...s, pinned: newPinnedState } : s
      ))
      
      // console.log('Local state updated')
    } catch (err) {
      console.error("Error toggling pin:", err)
    }
  }

  // Group sessions by Today, Yesterday, or date
  const groups: Record<string, ChatSession[]> = {}
  
  // Separate pinned and unpinned sessions
  const pinnedSessions = chatSessions.filter(session => session.pinned === true)
  const unpinnedSessions = chatSessions.filter(session => session.pinned !== true)
  
  // console.log('Pinned sessions:', pinnedSessions.length, pinnedSessions.map(s => ({ id: s.id, title: s.title, pinned: s.pinned })))
  // console.log('Unpinned sessions:', unpinnedSessions.length)
  
  // Add pinned sessions to a special "Pinned" group
  if (pinnedSessions.length > 0) {
    groups['Pinned'] = pinnedSessions.sort((a, b) => b.updatedAt - a.updatedAt)
  }
  
  // Group unpinned sessions by date
  unpinnedSessions.forEach(session => {
    const date = new Date(session.updatedAt)
    let groupLabel = format(date, 'MMMM d, yyyy')
    if (isToday(date)) groupLabel = 'Today'
    else if (isYesterday(date)) groupLabel = 'Yesterday'
    if (!groups[groupLabel]) groups[groupLabel] = []
    groups[groupLabel].push(session)
  })
  
  // Sort groups: Pinned first, then by date
  const sortedGroups = Object.entries(groups).sort(([a], [b]) => {
    if (a === 'Pinned') return -1
    if (b === 'Pinned') return 1
    return 0
  })

  return (
    <div ref={menuRef} className="px-2 pb-16 overflow-y-auto scrollbar-hide">
      {loading ? (
        <div className="text-xs text-gray-400 py-4 text-center">Loading...</div>
      ) : chatSessions.length === 0 ? (
        <div className="text-xs text-gray-400 py-4 text-center">No history</div>
      ) : (
        sortedGroups.map(([label, sessions]) => (
          <div key={label} className="mb-2">
            <div className="text-xs font-semibold text-[#7A8CA3] mb-1 px-1">{label}</div>
            <div className="flex flex-col gap-1">
              {sessions.map((session, idx) => (
                <div key={session.id} className="group relative">
                  <div className="flex items-center justify-between">
                    <Link
                      href={`/dashboard/${session.id}`}
                      className="flex-1 px-2 py-1 rounded-md text-sm text-[#223258] hover:bg-blue-50 truncate flex items-center gap-2"
                      title={session.title}
                    >
                      {session.pinned && (
                        <Pin size={12} className="text-[#214498] flex-shrink-0" />
                      )}
                      <span className="truncate">{session.title}</span>
                    </Link>
                    
                    {/* Three-dot menu - visible on hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          setOpenMenu(openMenu === session.id ? null : session.id)
                        }}
                        className="p-1 hover:bg-blue-50 rounded-md transition-colors"
                      >
                        <MoreVertical size={14} className="text-[#223258]" />
                      </button>
                      
                      {/* Dropdown menu */}
                      {openMenu === session.id && (
                        <div className="absolute right-0 top-6 z-50 bg-white border border-gray-200 rounded-md shadow-lg py-1 min-w-[120px]">
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              togglePinChatSession(session.id)
                              setOpenMenu(null)
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-[#223258] hover:bg-blue-50 flex items-center gap-2"
                          >
                            {session.pinned ? (
                              <>
                                <PinOff size={14} className="text-[#223258]" />
                                Unpin
                              </>
                            ) : (
                              <>
                                <Pin size={14} className="text-[#223258]" />
                                Pin
                              </>
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              if (confirm('Are you sure you want to delete this chat?')) {
                                deleteChatSession(session.id)
                              }
                              setOpenMenu(null)
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-[#223258] hover:bg-blue-50 flex items-center gap-2"
                          >
                            <Trash2 size={14} className="text-[#223258]" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}

// Add this to your sidebar and ensure you have a scrollbar-hide utility or add custom CSS for it. 