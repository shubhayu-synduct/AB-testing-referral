"use client"

import React, { useState, useEffect, useRef } from 'react'
import { ArrowRight, ChevronDown, Copy, Search, ExternalLink, X, FileEdit } from 'lucide-react'
import { fetchDrInfoSummary, sendFollowUpQuestion, Citation } from '@/lib/drinfo-summary-service'
import { getFirebaseFirestore } from '@/lib/firebase'
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query as firestoreQuery, where, orderBy, serverTimestamp, FieldPath, setDoc } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { useRouter, usePathname } from 'next/navigation'
import AnswerFeedback from '../feedback/answer-feedback'
import { getStatusMessage, StatusType } from '@/lib/status-messages'
import { ReferencesSidebar } from "@/components/references/ReferencesSidebar"
import { ReferenceGrid } from "@/components/references/ReferenceGrid"
import { formatWithCitations, formatWithDummyCitations } from '@/lib/formatWithCitations'
import { createCitationTooltip } from '@/lib/citationTooltipUtils'
import { marked } from 'marked'
import Link from 'next/link'

interface DrInfoSummaryProps {
  user: any;
  sessionId?: string; // Optional sessionId for loading a specific chat
  onChatCreated?: () => void; // Callback when a new chat is created
  initialMode?: 'instant' | 'research'; // Add this prop
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  questionType?: 'main' | 'follow-up';
  threadId: string;
  answer?: {
    mainSummary: string;
    sections: Array<{
      id: string;
      title: string;
      content: string;
    }>;
    citations?: Record<string, Citation>;
    svg_content?: string;
  };
  feedback?: {
    likes: number;
    dislikes: number;
    userFeedback?: {
      id: string;
      userId: string;
      messageId: string;
      type: 'like' | 'dislike' | 'text';
      content?: string;
      timestamp: string;
    };
  };
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  userId: string;
  messages: ChatMessage[];
}

interface ParsedContent {
  mainSummary: string;
  sections: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  citations?: Record<string, Citation>;
}

interface ThreadData {
  user_message: {
    content: string;
    timestamp: number;
  };
  bot_response: {
    content: string;
    citations: Record<string, Citation>;
    search_data: Record<string, any>;
    svg_content?: string;
  };
  context: {
    parent_thread_id: string | null;
  };
}

interface MessageFeedback {
  likes: number;
  dislikes: number;
  userFeedback?: {
    id: string;
    userId: string;
    messageId: string;
    type: 'like' | 'dislike' | 'text';
    content?: string;
    timestamp: string;
  };
}

interface DrInfoSummaryData {
  short_summary?: string;
  processed_content?: string;
  citations?: Record<string, Citation>;
  status?: string;
  references?: any[];
  feedback?: MessageFeedback;
  thread_id?: string;
  sections?: Array<{
    id: string;
    title: string;
    content: string;
  }>;
  svg_content?: string;
}

const KNOWN_STATUSES: StatusType[] = ['processing', 'searching', 'summarizing', 'formatting', 'complete', 'complete_image'];

export function DrInfoSummary({ user, sessionId, onChatCreated, initialMode = 'research' }: DrInfoSummaryProps) {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamedContent, setStreamedContent] = useState<ParsedContent>({ mainSummary: '', sections: [] })
  const [status, setStatus] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [completeData, setCompleteData] = useState<DrInfoSummaryData | null>(null)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({})
  const [followUpQuestion, setFollowUpQuestion] = useState('')
  const [searchPosition, setSearchPosition] = useState<"middle" | "bottom">("middle")
  const [showCitationsSidebar, setShowCitationsSidebar] = useState(false)
  const [activeCitations, setActiveCitations] = useState<Record<string, Citation> | null>(null)
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null)
  const [showGuidelineModal, setShowGuidelineModal] = useState(false)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [isChatLoading, setIsChatLoading] = useState(false)
  const [hasFetched, setHasFetched] = useState(false)
  const [lastQuestion, setLastQuestion] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [userCountry, setUserCountry] = useState<string>('')
  const router = useRouter()
  const pathname = usePathname()
  const [activeMode, setActiveMode] = useState<'instant' | 'research'>(initialMode);
  const [activeTab, setActiveTab] = useState<'answer' | 'images'>('answer');
  const [imageGenerationStatus, setImageGenerationStatus] = useState<'idle' | 'generating' | 'complete'>('idle');
  const answerIconRef = useRef<HTMLDivElement>(null);

  const contentRef = useRef<HTMLDivElement>(null)
  const inputAnchorRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (sessionId) {
      loadChatSession(sessionId);
      // Read the mode from sessionStorage
      const storedMode = sessionStorage.getItem(`chat_mode_${sessionId}`);
      if (storedMode === 'instant' || storedMode === 'research') {
        setActiveMode(storedMode);
      }
    } else {
      setChatHistory([]);
      console.log("Ready for new chat session");
    }
  }, [sessionId]);

  useEffect(() => {
    if (user) {
      const userId = user.uid || user.id;
      console.log("DrInfoSummary component initialized with user:", {
        userId,
        hasUid: !!user.uid,
        hasId: !!user.id,
        authenticationType: user.uid ? "Firebase Auth" : "Custom Auth",
      });
    } else {
      console.log("DrInfoSummary component initialized with NO USER");
    }
  }, [user]);

  useEffect(() => {
    if (isChatLoading === false && chatHistory.length > 0) {
      setMessages(chatHistory);
    }
  }, [isChatLoading, chatHistory]);

  // Add useEffect to fetch user's country when component mounts
  useEffect(() => {
    const fetchUserCountry = async () => {
      if (user) {
        try {
          const db = getFirebaseFirestore();
          const userId = user.uid || user.id;
          const userDoc = await getDoc(doc(db, "users", userId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const country = userData?.profile?.country;
            if (country) {
              setUserCountry(country);
            }
          }
        } catch (error) {
          console.error("Error fetching user country:", error);
        }
      }
    };

    fetchUserCountry();
  }, [user]);

  // Add this new useEffect after the existing useEffects
  useEffect(() => {
    if (messages.length > 0) {
      const lastAssistantMsg = [...messages].reverse().find(msg => msg.type === 'assistant');
      if (lastAssistantMsg?.answer?.citations) {
        console.log('[CITATIONS] Setting citations from messages:', lastAssistantMsg.answer.citations);
        setActiveCitations(lastAssistantMsg.answer.citations);
      }
    }
  }, [messages]);

  const loadChatSession = async (sessionId: string) => {
    setIsChatLoading(true);
    try {
      console.log("[LOAD] Loading chat session with ID:", sessionId);
      const db = getFirebaseFirestore();
      
      const sessionDocRef = doc(db, "conversations", sessionId);
      const sessionDoc = await getDoc(sessionDocRef);
      
      if (sessionDoc.exists()) {
        console.log("[LOAD] Session document exists, loading threads...");
        
        const threadsRef = collection(db, "conversations", sessionId, "threads");
        const threadsQueryRef = firestoreQuery(threadsRef, orderBy("user_message.timestamp"));
        const threadsSnapshot = await getDocs(threadsQueryRef);
        
        const messages: ChatMessage[] = [];
        
        threadsSnapshot.forEach((threadDoc) => {
          const threadData = threadDoc.data() as ThreadData;
          
          messages.push({
            id: `user-${threadDoc.id}`,
            type: 'user',
            content: threadData.user_message.content,
            timestamp: threadData.user_message.timestamp,
            questionType: threadData.context.parent_thread_id ? 'follow-up' : 'main',
            threadId: threadDoc.id
          });

          if (threadData.bot_response.content) {
            messages.push({
              id: `assistant-${threadDoc.id}`,
              type: 'assistant',
              content: threadData.bot_response.content,
              timestamp: threadData.user_message.timestamp + 1,
              answer: {
                mainSummary: threadData.bot_response.content,
                sections: [],
                citations: threadData.bot_response.citations,
                svg_content: threadData.bot_response.svg_content
              },
              threadId: threadDoc.id
            });
          }
        });
        
        setChatHistory(messages);
        setSearchPosition("bottom");
        
        if (messages.length > 0) {
          const lastUserMsg = [...messages].reverse().find(msg => msg.type === 'user');
          if (lastUserMsg) {
            setLastQuestion(lastUserMsg.content);
          }
        }
        
        const lastAssistantMsg = [...messages].reverse().find(msg => msg.type === 'assistant');
        if (lastAssistantMsg && lastAssistantMsg.answer) {
          const citations = (lastAssistantMsg.answer.citations && typeof lastAssistantMsg.answer.citations === 'object')
            ? lastAssistantMsg.answer.citations
            : {};
          
          if (lastAssistantMsg.answer.svg_content) {
            setImageGenerationStatus('complete');
          }

          // Set activeCitations immediately when loading from history
          console.log('[LOAD] Setting citations from history:', citations);
          setActiveCitations(citations);
          
          setStreamedContent({
            mainSummary: lastAssistantMsg.answer.mainSummary,
            sections: lastAssistantMsg.answer.sections || []
          });
          setCompleteData({
            processed_content: lastAssistantMsg.answer.mainSummary,
            sections: lastAssistantMsg.answer.sections || [],
            citations,
            svg_content: lastAssistantMsg.answer.svg_content,
            status: 'complete',
            references: []
          });
          
          if (citations && Object.keys(citations).length > 0) {
            setStatus('complete');
          }
          
          console.log('[LOAD] Raw assistant content:', lastAssistantMsg.answer.mainSummary);
          console.log('[LOAD] Raw assistant citations:', citations);
          console.log('[LOAD] streamedContent:', {
            mainSummary: lastAssistantMsg.answer.mainSummary,
            sections: lastAssistantMsg.answer.sections || []
          });
          console.log('[LOAD] completeData:', {
            processed_content: lastAssistantMsg.answer.mainSummary,
            sections: lastAssistantMsg.answer.sections || [],
            citations,
            svg_content: lastAssistantMsg.answer.svg_content,
            status: 'complete',
            references: []
          });
        }
        
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.type === 'user') {
          console.log("[LOAD] Found user message without assistant response, will trigger API call:", lastMessage.content);
          setQuery(lastMessage.content);
          setLastQuestion(lastMessage.content);
        } else {
          const storedQuery = sessionStorage.getItem(`chat_query_${sessionId}`);
          const needsAnswer = sessionStorage.getItem(`chat_needs_answer_${sessionId}`);
          
          if (storedQuery && needsAnswer === 'true') {
            console.log("[LOAD] Found stored query in sessionStorage:", storedQuery);
            setQuery(storedQuery);
            setLastQuestion(storedQuery);
            sessionStorage.removeItem(`chat_query_${sessionId}`);
            sessionStorage.removeItem(`chat_needs_answer_${sessionId}`);
          }
        }
      } else {
        console.error("[LOAD] Session not found for ID:", sessionId);
        setError("The chat session is being created. If this message persists, please try refreshing the page.");
        
        if (typeof window !== 'undefined') {
          const storedQuery = sessionStorage.getItem(`chat_query_${sessionId}`);
          if (storedQuery) {
            setQuery(storedQuery);
            setLastQuestion(storedQuery);
            sessionStorage.removeItem(`chat_query_${sessionId}`);
          }
        }
      }
    } catch (err) {
      console.error("[LOAD] Error loading chat session:", err);
      setError("Failed to load chat session. Please try refreshing the page.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const saveChatSession = async (messages: ChatMessage[]): Promise<string | null> => {
    console.log("Attempting to save chat session...");
    console.log("User object:", user);
    console.log("Current sessionId:", sessionId);
    
    const userId = user?.uid || user?.id;
    
    if (!userId || !sessionId) {
      console.warn("User not authenticated or no session ID, chat history not saved");
      return null;
    }

    try {
      const db = getFirebaseFirestore();

      for (let i = 0; i < messages.length; i += 2) {
        const userMessage = messages[i];
        const assistantMessage = messages[i + 1];

        if (userMessage && userMessage.type === 'user') {
          const threadData = {
            user_message: {
              content: userMessage.content,
              timestamp: userMessage.timestamp
            },
            bot_response: {
              content: assistantMessage?.content || '',
              citations: assistantMessage?.answer?.citations || {},
              search_data: {}
            },
            context: {
              parent_thread_id: userMessage.questionType === 'follow-up' ? 
                messages[i - 2]?.id : null
        }
          };

          await addDoc(
            collection(db, "conversations", sessionId, "threads"),
            threadData
          );
        }
      }

      await updateDoc(doc(db, "conversations", sessionId), {
        updatedAt: serverTimestamp()
      });

      console.log("Successfully saved chat session and threads");
      return sessionId;
    } catch (err) {
      console.error("Error saving chat session:", err);
      return null;
    }
  };

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [streamedContent, chatHistory])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (showCitationsSidebar && 
          !target.closest('.citations-sidebar') && 
          !target.closest('.show-all-citations-btn')) {
        setShowCitationsSidebar(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCitationsSidebar]);

  const resetState = () => {
    setStreamedContent({ mainSummary: '', sections: [] })
    setStatus(null)
    setStatusMessage(null)
    setCompleteData(null)
    setError(null)
    setShowCitationsSidebar(false)
    setIsStreaming(true)
  }

  const toggleSection = (sectionId: string) => {
    setOpenSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }))
  }

  useEffect(() => {
    console.log("[SEARCH] Component state update:", {
      sessionID: sessionId,
      isChatLoading,
      query,
      hasFetched,
      chatHistory,
      lastQuestion
    });
    
    if (!isChatLoading && query && !hasFetched) {
      console.log("[SEARCH] Triggering search with query:", query);
      console.log("[SEARCH] Using mode:", activeMode === 'instant' ? 'swift' : 'study');
      setHasFetched(true);
      setTimeout(() => {
          handleSearchWithContent(query, false, activeMode === 'instant' ? 'swift' : 'study');
      }, 0);
    }
  }, [sessionId, isChatLoading, query, hasFetched, lastQuestion]);

  // Add new controlled scroll effect
  useEffect(() => {
    if (isStreaming && status !== 'complete') {
      // During streaming, scroll to the bottom of the content
      const contentDiv = document.querySelector('.prose');
      if (contentDiv) {
        contentDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [isStreaming, status, messages, streamedContent]);

  // Add a separate effect to handle content container scrolling
  useEffect(() => {
    if (contentRef.current && isStreaming && status !== 'complete') {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [streamedContent, isStreaming, status]);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setLastQuestion(query);
    handleSearchWithContent(query, false, activeMode === 'instant' ? 'swift' : 'study');
    setFollowUpQuestion(''); // Clear follow-up input after main search
  };

  const handleFollowUpQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuestion.trim()) return;
    setLastQuestion(followUpQuestion);
    
    // Start the search/streaming first to create the answer icon
    handleSearchWithContent(followUpQuestion, true, activeMode === 'instant' ? 'swift' : 'study');
    setFollowUpQuestion(''); // Clear follow-up input after follow-up

    // Wait for the DOM to update with the new answer icon
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Now scroll to the answer icon
    const answerIcons = document.querySelectorAll('.flex.items-start.gap-2.mb-4');
    const lastAnswerIcon = answerIcons[answerIcons.length - 1];
    if (lastAnswerIcon) {
      lastAnswerIcon.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const parseContent = (content: string) => {
    console.log("Parsing content length:", content.length);
    
    if (!content || content.trim() === '') {
      console.log("Empty content received");
      return { mainSummary: '', sections: [] };
    }
    
    const sections = [];
    let mainSummary = content;
    
    try {
      const headerMatch = content.match(/#{2,3}\s.+/g);
      
      if (headerMatch && headerMatch.length > 0) {
        console.log("Found sections in content:", headerMatch.length);
        const parts = content.split(/(?=#{2,3}\s.+)/);
        
        mainSummary = parts[0];
        
        for (let i = 1; i < parts.length; i++) {
          const section = parts[i];
          const lines = section.split('\n');
          
          const title = lines[0].replace(/^#{2,3}\s/, '');
          
          const content = lines.slice(1).join('\n').trim();
          
          if (content) {
            sections.push({ id: `section-${Date.now()}-${i}`, title, content });
          }
        }
      } else {
        console.log("No sections found in content");
      }
      
      mainSummary = mainSummary.replace(/---+\s*$/, '').trim();
      
      return { mainSummary, sections };
    } catch (error) {
      console.error("Error parsing content:", error);
      return { 
        mainSummary: content.trim(), 
        sections: [] 
      };
    }
  }

  const getCitationCount = (citations?: Record<string, Citation>) => {
    return citations ? Object.keys(citations).length : 0;
  }

  const handleShowAllCitations = (citations?: Record<string, Citation>) => {
    if (citations) {
      setActiveCitations(citations);
      setShowCitationsSidebar(true);
    }
  };

  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .citation-reference {
        position: relative;
        display: inline-block;
        cursor: pointer;
      }
      
      .citation-reference-group {
        display: inline-flex;
        align-items: baseline;
      }
      
      .citation-number {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        background-color: #e0f2fe;
        color: #0284c7;
        border-radius: 9px;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        padding: 0 4px;
        box-sizing: border-box;
      }
      
      .citation-tooltip {
        position: fixed;
        z-index: 9999;
        width: 350px;
        padding: 12px 16px;
        border-radius: 8px;
        background-color: white;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        color: #1e293b;
        font-size: 14px;
        line-height: 1.5;
        border: 1px solid #e2e8f0;
        opacity: 0;
        visibility: hidden;
        transition: opacity 0.2s ease, visibility 0.2s ease;
        pointer-events: none;
      }
      
      @media (hover: hover) {
        .citation-reference:hover .citation-tooltip {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
        }

        .citation-reference:not(:hover) .citation-tooltip {
          transition-delay: 0.4s;
        }
      }
      
      @media (hover: none) {
        .citation-tooltip {
          display: none;
        }
      }
      
      .citation-tooltip-title {
        color: #0284c7;
        font-weight: 600;
        margin-bottom: 4px;
        text-decoration: none;
        display: block;
      }
      
      .citation-tooltip-title:hover {
        text-decoration: underline;
      }
      
      .citation-tooltip-meta {
        color: #64748b;
        font-size: 12px;
        margin-bottom: 8px;
      }
      
      .citation-tooltip-source {
        color: #64748b;
        font-size: 12px;
        font-weight: 500;
      }
      
      .bullet-list {
        margin: 8px 0;
      }
      
      .bullet-item {
        margin: 4px 0;
        padding-left: 20px;
        text-indent: -20px;
      }

      .answer-fade {
        transition: opacity 0.3s;
        opacity: 1;
      }
      .answer-fade.answer-fade-out {
        opacity: 0.5;
      }

      @media print {
        body {
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        /* Hide follow-up bar and branding */
        .sticky.bottom-0,
        .w-full.py-3.text-center,
        .flex.justify-between.items-center.mt-2 {
          display: none !important;
        }
        /* Hide sidebar/modal references in print */
        .citations-sidebar, .modal, .sidebar, .ReferencesSidebar {
          display: none !important;
        }
        /* Show print-only reference list */
        .print-reference-list {
          display: block !important;
          margin-top: 2em;
          font-size: 1em;
          color: #222;
        }
        /* Ensure all main content prints, not just visible area */
        .overflow-auto,
        .flex-1,
        .max-w-4xl,
        .h-full {
          overflow: visible !important;
          height: auto !important;
          max-height: none !important;
        }
      }
      @media screen {
        .print-reference-list {
          display: none !important;
        }
      }
      
      /* SVG content styling */
      .svg-content {
        width: 100%;
        max-width: 100%;
        height: auto;
        display: block;
      }
      
      .svg-content svg {
        width: 100%;
        height: auto;
        max-width: 100%;
      }
    `;
    document.head.appendChild(style);
    
    function attachTooltips() {
      const citationRefs = document.querySelectorAll('.citation-reference');
      
      citationRefs.forEach(ref => {
        if (ref.querySelector('.citation-tooltip')) return;
        
        const citationNumber = ref.getAttribute('data-citation-number');
        let citationObj = null;
        if (citationNumber && activeCitations && activeCitations[citationNumber]) {
          citationObj = activeCitations[citationNumber];
        }

        const title = ref.getAttribute('data-citation-title');
        const authors = ref.getAttribute('data-citation-authors');
        const year = ref.getAttribute('data-citation-year');
        const source = ref.getAttribute('data-citation-source');
        const source_type = ref.getAttribute('data-citation-source-type');
        const url = ref.getAttribute('data-citation-url');
        const journal = ref.getAttribute('data-citation-journal') || undefined;
        const doi = ref.getAttribute('data-citation-doi') || undefined;
        const tooltip = citationObj
          ? createCitationTooltip({
              ...citationObj,
              authors: Array.isArray(citationObj.authors) ? citationObj.authors.join(', ') : citationObj.authors,
              journal: citationObj.journal,
              doi: citationObj.doi
            })
          : createCitationTooltip({
              source: source || undefined,
              source_type: source_type || undefined,
              title: title || undefined,
              authors: authors || undefined,
              journal: journal || undefined,
              doi: doi || undefined,
              url: url || undefined
            });
        ref.appendChild(tooltip);
        
        // Add click handler for mobile devices
        ref.addEventListener('click', (e) => {
          // Check if it's a mobile device (no hover capability)
          if (window.matchMedia('(hover: none)').matches) {
            e.preventDefault();
            e.stopPropagation();
            if (citationObj) {
              setSelectedCitation(citationObj);
              setShowCitationsSidebar(true);
            }
          }
        });
        
        ref.addEventListener('mouseenter', () => {
          // Only handle hover on devices that support hover
          if (window.matchMedia('(hover: hover)').matches) {
            const tooltipEl = ref.querySelector('.citation-tooltip');
            if (!tooltipEl) return;
            
            const rect = ref.getBoundingClientRect();
            
            let top = rect.top - 10;
            let left = rect.left;
            
            const tempTooltip = (tooltipEl as HTMLElement).cloneNode(true) as HTMLElement;
            tempTooltip.style.visibility = 'hidden';
            tempTooltip.style.position = 'absolute';
            document.body.appendChild(tempTooltip);
            const tooltipHeight = tempTooltip.offsetHeight;
            const tooltipWidth = tempTooltip.offsetWidth;
            document.body.removeChild(tempTooltip);
            
            top = rect.top - tooltipHeight - 10;
            
            left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
            
            if (left < 10) left = 10;
            if (left + tooltipWidth > window.innerWidth - 10) {
              left = window.innerWidth - tooltipWidth - 10;
            }
            
            if (top < 10) {
              top = rect.bottom + 10;
            }
            
            (tooltipEl as HTMLElement).style.top = `${top}px`;
            (tooltipEl as HTMLElement).style.left = `${left}px`;
          }
        });
      });
    }
    
    const handleMouseMove = (e: MouseEvent) => {
      const hoveredElement = e.target as Element;
      const activeTooltip = document.querySelector('.citation-tooltip[style*="opacity: 1"]');
      
      if (activeTooltip) {
        if (hoveredElement.closest('.citation-tooltip') === activeTooltip || 
            hoveredElement.closest('.citation-reference')?.contains(activeTooltip)) {
          (activeTooltip as HTMLElement).style.pointerEvents = 'auto';
        } else {
          // Add timeout to close tooltip after 1 second
          setTimeout(() => {
            const currentTooltip = document.querySelector('.citation-tooltip[style*="opacity: 1"]');
            if (currentTooltip && !currentTooltip.matches(':hover')) {
              (currentTooltip as HTMLElement).style.opacity = '0';
              (currentTooltip as HTMLElement).style.visibility = 'hidden';
              (currentTooltip as HTMLElement).style.pointerEvents = 'none';
            }
          }, 1000);
        }
      }
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    
    const observer = new MutationObserver((mutations) => {
      let shouldAttach = false;
      
      mutations.forEach(mutation => {
        if (mutation.type === 'childList' && 
            mutation.addedNodes.length > 0) {
          shouldAttach = true;
        }
      });
      
      if (shouldAttach) {
        attachTooltips();
      }
    });
    
    observer.observe(document.body, { 
      childList: true, 
      subtree: true 
    });
    
    attachTooltips();
    
    return () => {
      document.head.removeChild(style);
      observer.disconnect();
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [activeCitations]);

  const handleSearchWithContent = async (content: string, isFollowUp: boolean = false, mode?: string) => {
    let hasCompleted = false;
    if (!content.trim()) return;
    if (!sessionId) {
      setError('No session ID provided.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setImageGenerationStatus('idle'); // Reset image generation status
    const userId = user?.uid || user?.id;
    if (!userId) {
      setError('User not authenticated.');
      setIsLoading(false);
      return;
    }

    // Add user message
    const tempThreadId = Date.now().toString();
    setMessages(prev => [
      ...prev,
      {
        id: `user-${tempThreadId}`,
        type: 'user',
        content: content, 
        timestamp: Date.now(),
        questionType: isFollowUp ? 'follow-up' : 'main',
        threadId: tempThreadId
      }
    ]);

    // Add assistant message placeholder
    setMessages(prev => [
      ...prev,
      {
        id: `assistant-${tempThreadId}`,
        type: 'assistant',
        content: '',
        timestamp: Date.now() + 1,
        answer: {
          mainSummary: '',
          sections: [],
          citations: {}
        },
        threadId: tempThreadId
      }
    ]);
    let streamedContent = '';
    fetchDrInfoSummary(
      content,
      (chunk: string) => {
        if (hasCompleted) return;
        streamedContent += chunk;
        // Update the last assistant message with streamed content
        setMessages(prev => prev.map((msg, idx) =>
          idx === prev.length - 1 && msg.type === 'assistant'
            ? { ...msg, content: streamedContent, answer: { ...msg.answer, mainSummary: streamedContent, sections: [] } }
            : msg
        ));
      },
      (newStatus: string, message?: string) => {
        setStatus(newStatus as StatusType);
        
        // Track image generation status
        if (newStatus === 'formatting') {
          setImageGenerationStatus('generating');
        } else if (newStatus === 'complete_image') {
          setImageGenerationStatus('complete');
        }
        
        // Handle complete_image status independently of hasCompleted flag
        if (newStatus === 'complete_image' && message) {
          try {
            const imageData = JSON.parse(message);
            if (imageData.svg_content) {
              // Update the last assistant message with SVG content
              setMessages(prev => prev.map((msg, idx) =>
                idx === prev.length - 1 && msg.type === 'assistant'
                  ? { 
                      ...msg, 
                      answer: { 
                        mainSummary: msg.answer?.mainSummary || '',
                        sections: msg.answer?.sections || [],
                        citations: msg.answer?.citations || {},
                        svg_content: imageData.svg_content 
                      } 
                    }
                  : msg
              ));
            }
          } catch (error) {
            console.error('Error parsing image data:', error);
          }
        }
      },
      async (data: DrInfoSummaryData) => {
        if (hasCompleted) return;
        hasCompleted = true;
        
        try {
          if (!data.thread_id) {
            throw new Error('Thread ID not received from backend');
          }

          // Update messages with the thread ID from backend
          setMessages(prev => prev.map((msg, idx) =>
            msg.threadId === tempThreadId
              ? { ...msg, threadId: data.thread_id! }
              : msg
          ));

          // Update the last assistant message with final content, citations, etc.
          setMessages(prev => {
            const updatedMessages = prev.map((msg, idx) =>
              idx === prev.length - 1 && msg.type === 'assistant'
                ? {
                    ...msg,
                    content: data?.processed_content || '',
                    answer: {
                      mainSummary: data?.processed_content || '',
                      sections: [],
                      citations: data?.citations ? Object.entries(data.citations).reduce((acc, [key, citation]) => ({
                        ...acc,
                        [key]: {
                          ...citation,
                          source_type: citation.source_type || 'internet'
                        }
                      }), {}) : {},
                      svg_content: msg.answer?.svg_content || data?.svg_content
                    },
                  }
                : msg
            );

            console.log('[COMPLETE] Final data received');

            return updatedMessages;
          });

          setActiveCitations(data?.citations ? Object.entries(data.citations).reduce((acc, [key, citation]) => ({
            ...acc,
            [key]: {
              ...citation,
              source_type: citation.source_type || 'internet'
            }
          }), {}) : {});
          
          console.log('[CITATIONS_DEBUG] Setting activeCitations:', {
            hasCitations: !!data?.citations,
            citationCount: data?.citations ? Object.keys(data.citations).length : 0,
            status: 'complete'
          });
          
          setStatus('complete');
          setIsLoading(false);
          setTimeout(() => {
            if (hasCompleted) {
              setIsStreaming(false);
              setStatusMessage(null);
            }
          }, 2000);
        } catch (error) {
          console.error('Error updating messages:', error);
          setError('Failed to update messages. Please try again.');
          setIsLoading(false);
        }
      },
      { 
        sessionId: sessionId, 
        userId, 
        is_follow_up: isFollowUp, 
        mode: activeMode === 'instant' ? 'swift' : 'study',
        country: userCountry // Add country to the options
      }
    );
  };

  const handleFeedbackUpdate = (feedback: MessageFeedback) => {
    if (completeData) {
      setCompleteData({
        ...completeData,
        feedback
      });
    }
  };


  const addDummyCitations = (content: string) => {
    // Add dummy citation numbers in the format [1], [2], etc.
    let citationCount = 1;
    return content.replace(/\[citation\]/g, () => `[${citationCount++}]`);
  };

  // Function to download SVG as PNG
  const downloadSvgAsPng = (svgContent: string, filename: string = 'generated-image') => {
    try {
      // Create a temporary container for the SVG
      const container = document.createElement('div');
      container.innerHTML = svgContent;
      const svgElement = container.querySelector('svg');
      
      if (!svgElement) {
        console.error('No SVG element found in content');
        return;
      }

      // Set SVG dimensions if not already set
      if (!svgElement.getAttribute('width') || !svgElement.getAttribute('height')) {
        svgElement.setAttribute('width', '800');
        svgElement.setAttribute('height', '600');
      }

      // Convert SVG to data URL
      const svgData = new XMLSerializer().serializeToString(svgElement);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const svgUrl = URL.createObjectURL(svgBlob);

      // Create canvas to convert SVG to PNG
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        if (ctx) {
          // Draw white background
          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          
          // Draw the image
          ctx.drawImage(img, 0, 0);
          
          // Convert to PNG and download
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `${filename}.png`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }
          }, 'image/png');
        }
        
        URL.revokeObjectURL(svgUrl);
      };

      img.onerror = () => {
        console.error('Failed to load SVG image');
        URL.revokeObjectURL(svgUrl);
      };

      img.src = svgUrl;
    } catch (error) {
      console.error('Error downloading SVG as PNG:', error);
    }
  };

  // Auto-switch to Images tab when image generation is complete
  useEffect(() => {
    if (imageGenerationStatus === 'complete') {
      setActiveTab('images');
    }
  }, [imageGenerationStatus]);

  return (
    <div className="p-2 sm:p-4 md:p-6 h-[100dvh] flex flex-col relative overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        {isChatLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="text-blue-600 font-medium">Loading ...</span>
            </div>
          </div>
        ) : (
          <>
            {searchPosition === "middle" && !streamedContent.mainSummary && chatHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto mb-4 max-w-4xl mx-auto w-full font-sans px-2 sm:px-4" ref={contentRef}>
                {error && (
                  <div className="bg-red-50 text-red-600 p-3 sm:p-4 rounded-lg mb-4">
                    {error}
                  </div>
                )}
                <div className="space-y-6 sm:space-y-8">
                  {messages.map((msg, idx) => (
                    <div key={msg.id} className="mb-4">
                      {msg.type === 'user' ? (
                        <div className="p-3 sm:p-4 border rounded-5px" style={{ borderColor: 'rgba(55, 113, 254, 0.5)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500, fontSize: '16px sm:text-[18px]', color: '#223258', backgroundColor: '#E4ECFF' }}>
                          <p className="m-0">{msg.content}</p>
                        </div>
                      ) : (
                        <>
                          <div ref={idx === messages.length - 1 ? answerIconRef : null} className="flex items-start gap-2 mb-3 sm:mb-4">
                            <div className="flex-shrink-0 mt-1">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                                <img src="/answer-icon.svg" alt="Answer" className="w-5 h-5 sm:w-6 sm:h-6" />
                              </div>
                            </div>
                            <div className="flex items-center gap-4">
                              {idx === messages.length - 1 && status !== 'complete' && status !== 'complete_image' && !msg.content ? (
                                <span className="text-gray-500 italic text-sm sm:text-base">{getStatusMessage(status as StatusType)}</span>
                              ) : (
                                msg.type === 'assistant' && msg.content && (
                                  <>
                                    <button
                                      onClick={() => setActiveTab('answer')}
                                      className={`font-semibold font-['DM_Sans'] mt-1 text-base transition-colors duration-200 ${
                                        activeTab === 'answer' ? 'text-blue-900' : 'text-gray-400 hover:text-blue-700'
                                      }`}
                                    >
                                      Answer
                                    </button>
                                    <button
                                      onClick={() => setActiveTab('images')}
                                      className={`font-semibold font-['DM_Sans'] mt-1 text-base transition-colors duration-200 relative ${
                                        activeTab === 'images' ? 'text-blue-900' : 'text-gray-400 hover:text-blue-700'
                                      }`}
                                    >
                                      Images
                                      {imageGenerationStatus === 'complete' && (
                                        <span className="absolute -top-0.5 -right-1.5 w-1.5 h-1.5 bg-[linear-gradient(125deg,_#9BB8FF_0%,_#3771FE_45%,_#214498_100%)] rounded-full flex items-center justify-center"></span>
                                      )}
                                    </button>
                                  </>
                                )
                              )}
                            </div>
                          </div>
                          {msg.content && (
                            <div className="mb-4 sm:mb-6">
                              {activeTab === 'answer' ? (
                                <div
                                  className="prose prose-slate prose-ul:text-black marker:text-black max-w-none text-base sm:text-base prose-h2:text-base prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold"
                                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                                  dangerouslySetInnerHTML={{
                                    __html:
                                      idx === messages.length - 1 && status !== 'complete' && status !== 'complete_image'
                                        ? formatWithDummyCitations(
                                            marked.parse(addDummyCitations(msg.content), { async: false })
                                          )
                                        : formatWithCitations(
                                            marked.parse(msg.content, { async: false }),
                                            msg.answer?.citations
                                          ),
                                  }}
                                />
                              ) : (
                                <div className="prose prose-slate max-w-none text-base sm:text-base">
                                  {msg.answer?.svg_content ? (
                                    <div className="flex flex-col items-center py-4">
                                      <div className="relative">
                                        <div 
                                          className="svg-content max-w-full"
                                          dangerouslySetInnerHTML={{ __html: msg.answer.svg_content }}
                                        />
                                        <button
                                          onClick={() => msg.answer?.svg_content && downloadSvgAsPng(msg.answer.svg_content, `image-${msg.threadId}`)}
                                          className="absolute top-2 right-2 p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-md transition-all duration-200 hover:scale-110"
                                          title="Download as PNG"
                                        >
                                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                            <polyline points="7,10 12,15 17,10"/>
                                            <line x1="12" y1="15" x2="12" y2="3"/>
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center py-4">
                                      <div className="w-full max-w-[800px] h-[600px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
                                        {imageGenerationStatus === 'generating' ? (
                                          <>
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                            <p className="text-gray-600 font-medium text-lg font-['DM_Sans']">Generating your image...</p>
                                            <p className="text-gray-500 text-sm mt-2 font-['DM_Sans']">This may take a few moments</p>
                                          </>
                                        ) : imageGenerationStatus === 'complete' ? (
                                          <div className="text-center">
                                            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                                              </svg>
                                            </div>
                                            <p className="text-gray-600 font-medium text-lg font-['DM_Sans']">Image generated successfully!</p>
                                            <p className="text-gray-500 text-sm mt-2 font-['DM_Sans']">Your image is ready to view</p>
                                          </div>
                                        ) : (
                                          <div className="text-center">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                                              </svg>
                                            </div>
                                            <p className="text-gray-600 font-medium text-lg font-['DM_Sans']">No images available</p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                          {(() => {
                            const shouldShowCitations = (msg.answer?.citations && Object.keys(msg.answer.citations).length > 0) || 
                              (activeCitations && Object.keys(activeCitations).length > 0);
                            console.log('[CITATIONS_DISPLAY_DEBUG] Should show citations:', {
                              hasMsgCitations: !!(msg.answer?.citations && Object.keys(msg.answer.citations).length > 0),
                              hasActiveCitations: !!(activeCitations && Object.keys(activeCitations).length > 0),
                              status,
                              activeCitationsCount: activeCitations ? Object.keys(activeCitations).length : 0,
                              msgCitationsCount: msg.answer?.citations ? Object.keys(msg.answer.citations).length : 0,
                              shouldShow: shouldShowCitations
                            });
                            return shouldShowCitations;
                          })() && (
                            <div className="mt-4 sm:mt-6">
                              <p className="text-slate-500 text-xs sm:text-sm">
                                Used {getCitationCount(msg.answer?.citations || activeCitations || {})} references
                              </p>
                              <ReferenceGrid
                                citations={msg.answer?.citations || activeCitations || {}}
                                onShowAll={handleShowAllCitations}
                                getCitationCount={getCitationCount}
                              />
                              <div className="mt-3 sm:mt-4">
                                <AnswerFeedback
                                  conversationId={sessionId || ''}
                                  threadId={msg.threadId}
                                  answerText={msg.content || ''}
                                />
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(searchPosition === "bottom" || chatHistory.length > 0 || streamedContent.mainSummary) && (
              <>
                <div ref={inputAnchorRef} style={{ marginBottom: '120px sm:140px' }} />
                <div className="sticky bottom-0 bg-gray-50 pt-2 pb-4 z-10">
                  <div className="max-w-4xl mx-auto px-2 sm:px-4">
                    <div className="relative w-full bg-white rounded border-2 border-[#3771fe44] shadow-[0px_0px_11px_#0000000c] p-3 md:p-4">
                      <div className="relative">
                        <textarea
                          value={followUpQuestion}
                          onChange={(e) => {
                            setFollowUpQuestion(e.target.value);
                            // Auto-resize the textarea
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          placeholder="Ask a follow-up question..."
                          className="w-full text-base md:text-[16px] text-[#223258] font-normal font-['DM_Sans'] outline-none resize-none min-h-[24px] max-h-[200px] overflow-y-auto"
                          onKeyDown={(e) => e.key === 'Enter' && handleFollowUpQuestion(e as any)}
                          rows={1}
                          style={{ height: '24px' }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        {/* Toggle switch for Acute/Research mode */}
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={activeMode === 'instant'}
                            onChange={() => setActiveMode(activeMode === 'instant' ? 'research' : 'instant')}
                            className="toggle-checkbox hidden"
                          />
                          <span className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${activeMode === 'instant' ? 'bg-blue-500' : 'bg-gray-300'}`}
                                style={{ transition: 'background 0.3s' }}>
                            <span className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${activeMode === 'instant' ? 'translate-x-4' : ''}`}></span>
                          </span>
                          <span className={`text-sm font-medium ${activeMode === 'instant' ? 'text-[#3771FE]' : 'text-gray-500'}`}
                                style={{ fontSize: '16px', fontFamily: 'DM Sans, sans-serif' }}>
                            Acute
                          </span>
                        </label>
                        <button onClick={handleFollowUpQuestion} className="flex-shrink-0" disabled={isLoading}>
                          {isLoading ? (
                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <img src="/search.svg" alt="Search" width={30} height={30} />
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="w-full py-3 text-center text-[14px] text-gray-400">
                      <p>Generated by AI, apply professional/physicians' judgment. <a href="https://synduct.com/terms-and-conditions/" target="_blank" rel="noopener noreferrer" className="font-regular underline text-black hover:text-[#3771FE] transition-colors duration-200">Click here</a> for further information.</p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>

      <ReferencesSidebar
        open={showCitationsSidebar}
        citations={activeCitations}
        onClose={() => setShowCitationsSidebar(false)}
      />
      {/* Print-only reference list at the bottom */}
      {activeCitations && Object.keys(activeCitations).length > 0 && (
        <div className="print-reference-list">
          <h3>References</h3>
          <ol>
            {Object.values(activeCitations).map((citation, idx) => (
              <li key={idx}>
                {citation.title}
                {citation.authors ? `, ${Array.isArray(citation.authors) ? citation.authors.join(', ') : citation.authors}` : ''}
                {citation.year ? `, ${citation.year}` : ''}
                {citation.url ? (
                  <>
                    {', '}
                    <span style={{wordBreak: 'break-all'}}>{citation.url}</span>
                  </>
                ) : ''}
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  )
} 