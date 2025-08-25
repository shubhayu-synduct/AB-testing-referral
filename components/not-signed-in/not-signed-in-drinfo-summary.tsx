"use client"

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams, usePathname, useRouter } from 'next/navigation'
import { fetchDrInfoSummary, Citation } from '@/lib/drinfo-summary-service'
import { getStatusMessage, StatusType } from '@/lib/status-messages'
import { ReferencesSidebar } from "@/components/references/ReferencesSidebar"
import { ReferenceGrid } from "@/components/references/ReferenceGrid"
import { DrugInformationModal } from "@/components/references/DrugInformationModal"
import { formatWithCitations, formatWithDummyCitations } from '@/lib/formatWithCitations'
import { createCitationTooltip } from '@/lib/citationTooltipUtils'
import { marked } from 'marked'
import Link from 'next/link'
import { logger } from '@/lib/logger'
import { Sidebar } from '@/components/dashboard/sidebar'
import { getAuth, onAuthStateChanged } from 'firebase/auth'
import { getFirebaseFirestore } from '@/lib/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
  threadId: string;
  answer?: {
    mainSummary: string;
    sections: Array<{
      id: string;
      title: string;
      content: string;
    }>;
    citations?: Record<string, Citation>;
    svg_content?: string[];
  };
}

interface DrInfoSummaryData {
  short_summary?: string;
  processed_content?: string;
  citations?: Record<string, Citation>;
  status?: string;
  thread_id?: string;
  svg_content?: string[];
}

export function NotSignedInDrInfoSummary() {
  const [query, setQuery] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [showCitationsSidebar, setShowCitationsSidebar] = useState(false)
  const [activeCitations, setActiveCitations] = useState<Record<string, Citation> | null>(null)
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null)
  const [showDrugModal, setShowDrugModal] = useState(false)
  const [followUpQuestion, setFollowUpQuestion] = useState('')
  const [activeMode, setActiveMode] = useState<'instant' | 'research'>('research')
  const [imageGenerationStatus, setImageGenerationStatus] = useState<'idle' | 'generating' | 'complete'>('idle')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isAuthChecked, setIsAuthChecked] = useState(false)
  
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const router = useRouter()
  const contentRef = useRef<HTMLDivElement>(null)
  const inputAnchorRef = useRef<HTMLDivElement>(null)

  // Read question from URL query parameter on component mount
  useEffect(() => {
    // Only proceed if authentication check is complete and user is not authenticated
    if (!isAuthChecked) return;
    
    const questionFromUrl = searchParams.get('q');
    if (questionFromUrl) {
      const decodedQuestion = decodeURIComponent(questionFromUrl);
      setQuery(decodedQuestion);
      logger.debug("Question loaded from URL:", decodedQuestion);
      
      // Auto-trigger search
      setTimeout(() => {
        if (isAuthChecked) {
          handleSearchWithContent(decodedQuestion, false, 'research');
        }
      }, 100);
    }
  }, [searchParams, isAuthChecked]);

  // Authentication check - redirect authenticated users to dashboard
  useEffect(() => {
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is authenticated, check if they have a valid session
        try {
          const db = getFirebaseFirestore();
          const userDoc = await getDoc(doc(db, "users", user.uid));
          
          if (userDoc.exists()) {
            // User has a valid profile, create new chat session and redirect
            logger.debug("User is authenticated, creating new chat session");
            
            // Get the current question from URL or state
            const currentQuestion = searchParams.get('q') || query;
            
            if (currentQuestion) {
              try {
                // Create a new chat session
                const sessionId = uuidv4();
                const userMessage = {
                  id: `user-${Date.now()}`,
                  type: 'user',
                  content: currentQuestion,
                  timestamp: Date.now(),
                  questionType: 'main'
                };
                
                const newChatSession = {
                  id: sessionId,
                  title: currentQuestion.substring(0, 100),
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  userId: user.uid,
                  messages: [userMessage],
                  status: 'pending'
                };
                
                // Add document to Firebase
                await setDoc(doc(db, "conversations", sessionId), newChatSession);
                
                // Store the query in session storage so the chat page can use it
                sessionStorage.setItem(`chat_query_${sessionId}`, currentQuestion);
                sessionStorage.setItem(`chat_needs_answer_${sessionId}`, "true");
                sessionStorage.setItem(`chat_mode_${sessionId}`, 'research');
                
                // Redirect to the new chat session
                router.push(`/dashboard/${sessionId}`);
                return;
              } catch (error) {
                logger.error("Error creating chat session:", error);
                // Fallback to dashboard if session creation fails
                router.push('/dashboard');
                return;
              }
            } else {
              // No question, just go to dashboard
              router.push('/dashboard');
              return;
            }
          }
        } catch (error) {
          logger.error("Error checking user profile:", error);
          // If there's an error checking profile, treat as unauthenticated
        }
      }
      
      // User is not authenticated or has no valid profile
      setIsAuthChecked(true);
    });

    return () => unsubscribe();
  }, [router, searchParams, query]);

  const getCitationCount = (citations?: Record<string, Citation>) => {
    if (!citations) return 0;
    const visibleCitations = Object.entries(citations).filter(([key, citation]) => {
      if (citation.source_type === 'drug_database' && citation.drug_citation_type === 'implicit') {
        return false;
      }
      return true;
    });
    return visibleCitations.length;
  }

  const handleShowAllCitations = (citations?: Record<string, Citation>) => {
    if (citations) {
      setActiveCitations(citations);
      setShowCitationsSidebar(true);
    }
  };

  const handleSearchWithContent = async (content: string, isFollowUp: boolean = false, mode?: string) => {
    if (!content.trim()) return;
    
    // Prevent API calls if authentication check is not complete or user is authenticated
    if (!isAuthChecked) {
      logger.debug("Authentication check not complete, skipping API call");
      return;
    }
    
    setIsLoading(true);
    setImageGenerationStatus('idle');
    
    // Generate unique anonymous user ID for each request
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const userId = `anonymous_user_${timestamp}_${randomString}`;
    const tempThreadId = Date.now().toString();
    
    // Generate unique session ID for each request
    const sessionId = `public_session_${timestamp}_${randomString}`;

    // Add user message
    setMessages(prev => [
      ...prev,
      {
        id: `user-${tempThreadId}`,
        type: 'user',
        content: content, 
        timestamp: Date.now(),
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
    let hasCompleted = false;

    fetchDrInfoSummary(
      content,
      (chunk: string) => {
        if (hasCompleted) return;
        streamedContent += chunk;
        setMessages(prev => prev.map((msg, idx) =>
          idx === prev.length - 1 && msg.type === 'assistant'
            ? { ...msg, content: streamedContent, answer: { ...msg.answer, mainSummary: streamedContent, sections: [] } }
            : msg
        ));
      },
      (newStatus: string, message?: string) => {
        setStatus(newStatus as StatusType);
        
        if (newStatus === 'formatting') {
          setImageGenerationStatus('generating');
        } else if (newStatus === 'complete_image') {
          setImageGenerationStatus('complete');
        }
        
        if (newStatus === 'complete_image' && message) {
          try {
            const imageData = JSON.parse(message);
            if (imageData.svg_content) {
              const svgContentArray = Array.isArray(imageData.svg_content) 
                ? imageData.svg_content.filter((content: any) => content !== null && content !== undefined)
                : [imageData.svg_content].filter((content: any) => content !== null && content !== undefined);
              
              setMessages(prev => prev.map((msg, idx) =>
                idx === prev.length - 1 && msg.type === 'assistant'
                  ? { 
                      ...msg, 
                      answer: { 
                        mainSummary: msg.answer?.mainSummary || '',
                        sections: msg.answer?.sections || [],
                        citations: msg.answer?.citations || {},
                        svg_content: svgContentArray 
                      } 
                    }
                  : msg
              ));
            }
          } catch (error) {
            // Handle error silently
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

          setMessages(prev => prev.map((msg, idx) =>
            msg.threadId === tempThreadId
              ? { ...msg, threadId: data.thread_id! }
              : msg
          ));

          setMessages(prev => {
            const updatedMessages = prev.map((msg, idx) =>
              idx === prev.length - 1 && msg.type === 'assistant'
                ? {
                    ...msg,
                    content: data?.processed_content || '',
                    answer: {
                      mainSummary: data?.processed_content || '',
                      sections: [],
                      citations: data?.citations || {},
                      svg_content: msg.answer?.svg_content || []
                    },
                  }
                : msg
            );
            return updatedMessages;
          });

          setActiveCitations(data?.citations || {});
          setStatus('complete');
          setIsLoading(false);
        } catch (error) {
          logger.error('Error updating messages:', error);
          const fallback = 'Servers are overloaded. Please try again later.';
          
          setMessages(prev => {
            if (prev.length === 0) return prev;
            const lastIndex = prev.length - 1;
            return prev.map((msg, idx) =>
              idx === lastIndex && msg.type === 'assistant'
                ? {
                    ...msg,
                    content: fallback,
                    answer: {
                      mainSummary: fallback,
                      sections: [],
                      citations: {}
                    }
                  }
                : msg
            );
          });
          setStatus('complete');
          setIsLoading(false);
        }
      },
      { 
        sessionId: sessionId, 
        userId, 
        mode: mode || 'study',
        country: 'US'
      }
    );
  };

  const handleFollowUpQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuestion.trim()) return;
    
    // Prevent follow-up questions if authentication check is not complete
    if (!isAuthChecked) {
      logger.debug("Authentication check not complete, skipping follow-up question");
      return;
    }
    
    // Redirect to signup page instead of allowing follow-up questions
    window.location.href = '/signup';
  };

  // Scroll effect for streaming content
  useEffect(() => {
    if (status !== 'complete' && status !== 'complete_image' && messages.length > 0) {
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
      });
    }
  }, [messages, status]);

  // Scroll to end after any new message
  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
      });
    }
  }, [messages]);

  // Handle citations from messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastAssistantMsg = [...messages].reverse().find(msg => msg.type === 'assistant');
      if (lastAssistantMsg?.answer?.citations) {
        setActiveCitations(lastAssistantMsg.answer.citations);
      }
    }
  }, [messages]);

  // Handle click outside citations sidebar
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

  // Set up citation tooltips and event handlers
  useEffect(() => {
    if (!activeCitations || Object.keys(activeCitations).length === 0) return;
    
    console.log('Setting up citation tooltips for:', activeCitations);

    // Find all citation references and drug names
    const citationRefs = document.querySelectorAll('.citation-reference');
    const drugNameRefs = document.querySelectorAll('.drug-name-clickable');

    // Handle citation number clicks and hovers
    citationRefs.forEach(ref => {
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
            // Only open citations sidebar for non-drug citations
            if (citationObj.source_type !== 'drug_database') {
              setSelectedCitation(citationObj);
              setShowCitationsSidebar(true);
            }
            // For drug citations, do nothing on click (keep hover tooltip only)
          }
        }
      });
      
      // Remove the click handler for desktop devices - citation numbers should only show tooltips, not open modals
      
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
          tempTooltip.style.top = '0';
          tempTooltip.style.left = '0';
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
          
          (tooltipEl as HTMLElement).style.position = 'fixed';
          (tooltipEl as HTMLElement).style.top = `${top}px`;
          (tooltipEl as HTMLElement).style.left = `${left}px`;
          (tooltipEl as HTMLElement).style.zIndex = '9999';
        }
      });
      
      // Add mouseleave event to hide tooltip
      ref.addEventListener('mouseleave', () => {
        const tooltipEl = ref.querySelector('.citation-tooltip');
        if (tooltipEl) {
          (tooltipEl as HTMLElement).style.opacity = '0';
        }
      });
    });
    
    // Handle drug name clicks
    drugNameRefs.forEach(ref => {
      const citationNumber = ref.getAttribute('data-citation-number');
      let citationObj = null;
      if (citationNumber && activeCitations && activeCitations[citationNumber]) {
        citationObj = activeCitations[citationNumber];
      }
      
      logger.debug('Found drug name span:', { citationNumber, citationObj, element: ref });
      
      // Add click handler for drug names
      ref.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (citationObj) {
          setSelectedCitation(citationObj);
          setShowDrugModal(true);
        }
      });
    });

    // Cleanup function
    return () => {
      citationRefs.forEach(ref => {
        ref.removeEventListener('click', () => {});
        ref.removeEventListener('mouseenter', () => {});
        ref.removeEventListener('mouseleave', () => {});
      });
      drugNameRefs.forEach(ref => {
        ref.removeEventListener('click', () => {});
      });
    };
  }, [activeCitations, setSelectedCitation, setShowCitationsSidebar, setShowDrugModal]);

  // Add this new useEffect after the existing useEffects
  useEffect(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      .citation-reference {
        position: relative;
        cursor: pointer;
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
      
      .citation-number:hover {
        background: #C7D7FF !important;
      }
      
      .citation-tooltip {
        position: fixed;
        z-index: 9999;
        background: white;
        border: 1px solid #E5E7EB;
        border-radius: 16px;
        padding: 16px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        font-family: 'DM Sans', sans-serif;
        max-width: 300px;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.2s ease;
        white-space: nowrap;
      }
      
      .citation-reference:hover .citation-tooltip {
        opacity: 1;
      }
      
      .drug-name-clickable {
        cursor: pointer;
        color: #3771FE;
        text-decoration: underline;
        transition: color 0.2s ease;
      }
      
      .drug-name-clickable:hover {
        color: #2B5CD9;
      }

      /* Shimmer text effect for status message */
      .shimmer-text {
        background: linear-gradient(90deg,rgba(31, 41, 55, 0.77), #E5E7EB,rgba(31, 41, 55, 0.82));
        background-size: 200% 100%;
        -webkit-background-clip: text;
        background-clip: text;
        color: transparent;
        animation: shimmer-text-move 4s ease-in-out infinite;
      }

      @keyframes shimmer-text-move {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      @media (prefers-reduced-motion: reduce) {
        .shimmer-text { animation: none; }
      }

      /* Reference grid shimmer placeholder */
      .reference-skeleton {
        position: relative;
        overflow: hidden;
        background: #EEF3FF;
        border: 1px solid #3771FE;
        border-radius: 12px;
      }
      .reference-skeleton::after {
        content: "";
        position: absolute;
        inset: 0;
        background: linear-gradient(100deg, rgba(255,255,255,0) 40%, rgba(255,255,255,0.6) 50%, rgba(255,255,255,0) 60%);
        transform: translateX(-100%);
        animation: reference-shimmer 1.4s ease-in-out infinite;
      }
      @keyframes reference-shimmer {
        100% { transform: translateX(100%); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Don't render main content until authentication is checked */}
      {!isAuthChecked ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Sidebar Toggle */}
          <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 z-40 flex items-center px-4">
            <div className="flex items-center justify-between w-full">
              <button 
                className="p-2 hover:bg-gray-100 rounded-md"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <img src="/open-sidebar.svg" alt="Open Sidebar" className="w-7 h-7" />
              </button>
              <div className="flex-1 flex justify-center">
                <h1 className="text-[#204398] font-semibold text-lg">Dr. Info</h1>
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  href="/signup"
                  className="px-3 py-1.5 bg-white border border-[#C8C8C8] text-[#223258] rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="px-3 py-1.5 bg-[#3771FE] text-white rounded-lg hover:bg-[#2B5CD9] transition-colors font-medium text-sm"
                >
                  Sign Up
                </Link>
              </div>
            </div>
          </div>

          {/* Sidebar - Using the exact same component as dashboard */}
          <Sidebar isOpen={sidebarOpen} setIsOpen={setSidebarOpen} />

          {/* Main Content */}
          <main className="flex-1 overflow-auto md:mt-0 mt-14">
            <div className="p-2 sm:p-4 md:p-6 h-[100dvh] flex flex-col relative overflow-hidden">
              {/* Desktop Top Bar with Sign Up/Login Buttons */}
              <div className="hidden md:flex justify-between items-center mb-4 px-2 sm:px-4">
                <div className="flex-1"></div>
                <div className="flex items-center space-x-3">
                  <Link
                    href="/login"
                    className="px-4 py-2 bg-white border border-[#C8C8C8] text-[#223258] rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="px-4 py-2 bg-[#3771FE] text-white rounded-lg hover:bg-[#2B5CD9] transition-colors font-medium"
                  >
                    Sign Up
                  </Link>
                </div>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden">
                {messages.length === 0 && !isLoading ? (
                  <div className="flex-1 flex flex-col items-center justify-center">
                    {!query && (
                      <div className="text-center">
                        <div className="w-8 h-8 border-2 border-[#3771FE] border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-gray-500 text-sm">Loading...</p>
                      </div>
                    )}
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
                              <div className="flex items-start gap-2 mb-3 sm:mb-4">
                                <div className="flex-shrink-0 mt-1">
                                  <div className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center">
                                    <img src="/answer-icon.svg" alt="Answer" className="w-5 h-5 sm:w-6 sm:h-6" />
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  {idx === messages.length - 1 && status !== 'complete' && status !== 'complete_image' && !msg.content ? (
                                    <span className="shimmer-text italic text-sm sm:text-base">{getStatusMessage(status as StatusType)}</span>
                                  ) : (
                                    msg.type === 'assistant' && msg.content && (
                                      <span className="font-semibold font-['DM_Sans'] mt-1 text-base text-blue-900">
                                        Answer
                                      </span>
                                    )
                                  )}
                                </div>
                              </div>
                              
                              {msg.content && (
                                <div className="mb-4 sm:mb-6">
                                  <div
                                    className="prose prose-slate prose-ul:text-black marker:text-black max-w-none text-base sm:text-base prose-h2:text-base prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold"
                                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                                    dangerouslySetInnerHTML={{
                                      __html:
                                        idx === messages.length - 1 && status !== 'complete' && status !== 'complete_image'
                                          ? formatWithDummyCitations(
                                              marked.parse(msg.content || '', { async: false })
                                            )
                                          : formatWithCitations(
                                              marked.parse(msg.content || '', { async: false }),
                                              msg.answer?.citations
                                            ),
                                    }}
                                  />
                                </div>
                              )}
                              
                              {msg.answer?.citations && Object.keys(msg.answer.citations).length > 0 && (
                                <div className="mt-4 sm:mb-6">
                                  <p className="text-slate-500 text-xs sm:text-sm">
                                    Used {getCitationCount(msg.answer.citations)} references
                                  </p>
                                  <ReferenceGrid
                                    citations={msg.answer.citations}
                                    onShowAll={handleShowAllCitations}
                                    getCitationCount={getCitationCount}
                                  />
                                </div>
                              )}
                              
                              {/* Probable references shimmer during formatting/formatting response stage (after streaming, before citations) */}
                              {idx === messages.length - 1 && (status === 'formatting' || status === 'formatting response') && (() => {
                                const hasCitations = (msg.answer?.citations && Object.keys(msg.answer.citations).length > 0) ||
                                  (activeCitations && Object.keys(activeCitations).length > 0);
                                return !hasCitations;
                              })() && (
                                <div className="mt-4 sm:mt-6">
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                    <div className="reference-skeleton col-span-2 sm:col-span-1 h-[95px] sm:h-[105px] lg:h-[125px]" />
                                    <div className="reference-skeleton hidden sm:block h-[95px] sm:h-[105px] lg:h-[125px]" />
                                    <div className="reference-skeleton hidden sm:block h-[95px] sm:h-[105px] lg:h-[125px]" />
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

                {/* Follow-up Question Input */}
                <div ref={inputAnchorRef} style={{ marginBottom: '10px' }} />
                <div className="sticky bottom-0 bg-gray-50 pt-2 pb-4 z-10">
                  <div className="max-w-4xl mx-auto px-2 sm:px-4">
                    <div className="relative w-full bg-white rounded border-2 border-[#3771fe44] shadow-[0px_0px_11px_#0000000c] p-3 md:p-4 follow-up-question-search">
                      <div className="relative">
                        <textarea
                          value={followUpQuestion}
                          onChange={(e) => {
                            setFollowUpQuestion(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          placeholder="Sign up to ask follow-up questions..."
                          className="w-full text-base md:text-[16px] text-[#223258] font-normal font-['DM_Sans'] outline-none resize-none min-h-[24px] max-h-[200px] overflow-y-auto"
                          onKeyDown={(e) => e.key === 'Enter' && handleFollowUpQuestion(e as any)}
                          rows={1}
                          style={{ height: '24px' }}
                        />
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={activeMode === 'instant'}
                            onChange={() => setActiveMode(activeMode === 'instant' ? 'research' : 'instant')}
                            className="toggle-checkbox hidden"
                          />
                          <span className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${activeMode === 'instant' ? 'bg-blue-500' : 'bg-gray-500'}`}>
                            <span className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${activeMode === 'instant' ? 'translate-x-4' : ''}`}></span>
                          </span>
                          <span className={`text-sm font-medium ${activeMode === 'instant' ? 'text-[#3771FE]' : 'text-gray-500'}`}
                                style={{ fontSize: "16px", fontFamily: 'DM Sans, sans-serif' }}>
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
                    <div className="w-full py-3 md:py-4 text-center text-xs md:text-sm text-gray-400 px-4">
                      <p>Do not insert protected health information or personal data.</p>
                      <Link href="https://synduct.com/terms-and-conditions/" className="text-black hover:text-[#3771FE] underline inline-block" target="_blank" rel="noopener noreferrer">
                        Terms and Conditions
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>

          <ReferencesSidebar
            open={showCitationsSidebar}
            citations={activeCitations}
            onClose={() => setShowCitationsSidebar(false)}
          />
          
          <DrugInformationModal
            open={showDrugModal}
            citation={selectedCitation}
            onClose={() => {
              setShowDrugModal(false);
              setSelectedCitation(null);
            }}
          />

          {/* Citation tooltip styles */}
          <style jsx global>{`
            .citation-reference {
              position: relative;
              cursor: pointer;
            }
            
            .citation-number {
              background: #E0E9FF !important;
              color: #1F2937 !important;
              padding: 2px 6px;
              border-radius: 12px;
              font-size: 12px;
              font-weight: 500;
              cursor: pointer;
              transition: background-color 0.2s ease;
            }
            
            .citation-number:hover {
              background: #C7D7FF !important;
            }
            
            .citation-tooltip {
              position: fixed;
              z-index: 9999;
              background: white;
              border: 1px solid #E5E7EB;
              border-radius: 16px;
              padding: 16px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.08);
              font-family: 'DM Sans', sans-serif;
              max-width: 300px;
              pointer-events: none;
              opacity: 0;
              transition: opacity 0.2s ease;
              white-space: nowrap;
            }
            
            .citation-reference:hover .citation-tooltip {
              opacity: 1;
            }
            
            .drug-name-clickable {
              cursor: pointer;
              color: #3771FE;
              text-decoration: underline;
              transition: color 0.2s ease;
            }
            
            .drug-name-clickable:hover {
              color: #2B5CD9;
            }
          `}</style>
        </>
      )}
    </div>
  )
}
