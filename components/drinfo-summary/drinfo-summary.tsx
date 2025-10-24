"use client"

import React, { useState, useEffect, useRef } from 'react'
import { ArrowRight, ChevronDown, Copy, Search, ExternalLink, X, FileEdit, ThumbsUp, ThumbsDown, Share2, Check, Mail, RotateCcw, Linkedin } from 'lucide-react'
import { fetchDrInfoSummary, sendFollowUpQuestion, Citation } from '@/lib/drinfo-summary-service'
import { getFirebaseFirestore } from '@/lib/firebase'
import { collection, addDoc, updateDoc, doc, getDoc, getDocs, query as firestoreQuery, where, orderBy, serverTimestamp, FieldPath, setDoc, deleteDoc, increment } from 'firebase/firestore'
import { v4 as uuidv4 } from 'uuid'
import { useRouter, usePathname } from 'next/navigation'
import AnswerFeedback from '../feedback/answer-feedback'
import { getStatusMessage, StatusType } from '@/lib/status-messages'
import { ReferencesSidebar } from "@/components/references/ReferencesSidebar"
import { ReferenceGrid } from "@/components/references/ReferenceGrid"
import { DrugInformationModal } from "@/components/references/DrugInformationModal"
import { formatWithCitations, formatWithDummyCitations, preprocessContentForHtml, addDummyCitations, processStreamingContent } from '@/lib/formatWithCitations'
import { createCitationTooltip } from '@/lib/citationTooltipUtils'
import { marked } from 'marked'
import Link from 'next/link'
import { MovingBorder } from "@/components/ui/moving-border"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { logger } from '@/lib/logger'
import { useDrinfoSummaryTour } from '@/components/TourContext'
import { track } from '@/lib/analytics'
import { ShareBanner } from './share-banner'
import { toast } from 'sonner'

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
    svg_content?: string[]; // Changed from string to string[]
    apiResponse?: any; // Added API response field
    questions_followed?: string[]; // Added follow-up questions field
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
    svg_content?: string[]; // Changed from string to string[]
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
  svg_content?: string[];
  responseStatus?: number;
  apiResponse?: any;
  remaining_limit?: number | string;
  questions_followed?: string[];
}

const KNOWN_STATUSES: StatusType[] = ['processing', 'searching', 'summarizing', 'formatting', 'complete', 'complete_image'];

// Helper: map backend → frontend source_type values
const normalizeSourceType = (src: string | undefined): string => {
  if (!src) return "internet";
  const s = src.toLowerCase();
  if (s.includes("guideline")) return "guidelines_database";
  if (s.includes("drug"))      return "drug_database";
  return "internet";           // journals / web
};

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
  const [showDrugModal, setShowDrugModal] = useState(false)
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
  const [expandedImage, setExpandedImage] = useState<{index: number, svgContent: string} | null>(null);
  const [remainingLimit, setRemainingLimit] = useState<number | undefined>(undefined);

  // Helper function to update remaining monthly limit in Firebase
  const updateRemainingLimitInFirebase = async (limit: number) => {
    try {
      if (!user) return;
      
      const db = getFirebaseFirestore();
      const userId = user.uid || user.id;
      const userDocRef = doc(db, "users", userId);
      
      await updateDoc(userDocRef, {
        remaining_monthly_limit: limit
      });
      
      logger.debug("Updated remaining_monthly_limit in Firebase:", limit);
    } catch (error) {
      logger.error("Error updating remaining_monthly_limit in Firebase:", error);
    }
  };

  // Helper function to atomically increment total_questions_asked in Firebase
  const incrementTotalQuestionsAsked = async () => {
    try {
      if (!user) return;
      
      const db = getFirebaseFirestore();
      const userId = user.uid || user.id;
      const userDocRef = doc(db, "users", userId);
      
      // First, try to get the current document to check if the field exists
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        // If the field doesn't exist, create it with value 1
        if (userData.total_questions_asked === undefined) {
          await setDoc(userDocRef, {
            total_questions_asked: 1
          }, { merge: true });
          logger.debug("Created total_questions_asked field in Firebase with value 1");
        } else {
          // If the field exists, use atomic increment to add 1
          await updateDoc(userDocRef, {
            total_questions_asked: increment(1)
          });
          logger.debug("Incremented total_questions_asked in Firebase by 1");
        }
      } else {
        // If document doesn't exist, create it with total_questions_asked = 1
        await setDoc(userDocRef, {
          total_questions_asked: 1
        });
        logger.debug("Created user document with total_questions_asked = 1 in Firebase");
      }
    } catch (error) {
      logger.error("Error incrementing total_questions_asked in Firebase:", error);
    }
  };
  const answerIconRef = useRef<HTMLDivElement>(null);

  // Modal state and timer
  const [showFeedbackModal, setShowFeedbackModal] = useState(false)
  const modalTimerRef = useRef<NodeJS.Timeout | null>(null)
  const [questionCount, setQuestionCount] = useState(0)
  const [hasShownInitialModal, setHasShownInitialModal] = useState(false)

  // Share banner state
  const [showShareBanner, setShowShareBanner] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)
  
  // Visual abstract share functionality state
  const [isSharing, setIsSharing] = useState(false)
  const [shareLink, setShareLink] = useState('')
  const [showSharePopup, setShowSharePopup] = useState(false)
  const [isCopied, setIsCopied] = useState(false)
  const [sharingSvgContent, setSharingSvgContent] = useState<string | null>(null)

  const contentRef = useRef<HTMLDivElement>(null)
  const inputAnchorRef = useRef<HTMLDivElement>(null)

  // Feedback modal behavior:
  // 1. Initial modal appears after 75 seconds (only once)
  // 2. Subsequent modals appear after every 4 questions (4th, 8th, 12th, 16th, etc.) with 75-second delay
  // 3. Question count is incremented only for user-initiated searches, not loaded queries

  // Modal timer effect - only show initial modal after 75 seconds
  useEffect(() => {
    if (!hasShownInitialModal) {
      modalTimerRef.current = setTimeout(() => {
        setShowFeedbackModal(true)
        setHasShownInitialModal(true)
      }, 75000)
    }

    // Cleanup function
    return () => {
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current)
      }
    }
  }, [hasShownInitialModal])

  // Handle modal close
  const handleModalClose = () => {
    setShowFeedbackModal(false)
  }

  // Function to check if feedback modal should be shown based on question count
  const shouldShowFeedbackModal = (count: number) => {
    if (count === 0) return false
    const shouldShow = count % 4 === 0 && count > 0; // Show at 4th, 8th, 12th, 16th, etc.
    logger.debug("[FEEDBACK] shouldShowFeedbackModal check:", { count, shouldShow });
    return shouldShow;
  }

  // Effect to show feedback modal based on question count with 75-second delay
  useEffect(() => {
    logger.debug("[FEEDBACK] Question count:", questionCount, "Has shown initial modal:", hasShownInitialModal);
    if (hasShownInitialModal && shouldShowFeedbackModal(questionCount)) {
      logger.debug("[FEEDBACK] Scheduling modal for question count:", questionCount, "with 75-second delay");
      // Clear any existing timer
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current)
      }
      // Set new timer for 75 seconds
      modalTimerRef.current = setTimeout(() => {
        setShowFeedbackModal(true)
      }, 75000)
    }
  }, [questionCount, hasShownInitialModal])

  // Cleanup effect to clear timers on unmount
  useEffect(() => {
    return () => {
      if (modalTimerRef.current) {
        clearTimeout(modalTimerRef.current)
      }
    }
  }, [])

  // Handle modal button clicks to open feedback forms
  const handleModalFeedbackClick = (type: 'helpful' | 'not_helpful') => {
    // Close the modal
    handleModalClose()
    
    // Find the latest assistant message with feedback
    const latestAssistantMessage = [...messages].reverse().find(msg => 
      msg.type === 'assistant' && msg.content && msg.answer?.citations
    )
    
    if (latestAssistantMessage) {
      // Scroll to the bottom to show the feedback forms
      setTimeout(() => {
        if (inputAnchorRef.current) {
          inputAnchorRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }
        
        // Find the AnswerFeedback component for the latest message and trigger the feedback form
        setTimeout(() => {
          const feedbackButtons = document.querySelectorAll('.flex.flex-row.items-center.gap-2.sm\\:gap-3.mb-3.sm\\:mb-4')
          const lastFeedbackButton = feedbackButtons[feedbackButtons.length - 1]
          
          if (lastFeedbackButton) {
            const targetButton = lastFeedbackButton.querySelector(
              type === 'helpful' 
                ? 'button[aria-label="Helpful"]' 
                : 'button[aria-label="Not helpful"]'
            ) as HTMLButtonElement
            
            if (targetButton && !targetButton.disabled) {
              targetButton.click()
            }
          }
        }, 500) // Small delay to ensure scroll is complete
      }, 100)
    }
  }

  useEffect(() => {
    logger.debug("[EFFECT] Session loading effect triggered, sessionId:", sessionId);
    
    if (sessionId) {
      loadChatSession(sessionId);
      // Read the mode from sessionStorage
      const storedMode = sessionStorage.getItem(`chat_mode_${sessionId}`);
      if (storedMode === 'instant' || storedMode === 'research') {
        setActiveMode(storedMode);
      }
    } else {
      setChatHistory([]);
      logger.debug("Ready for new chat session");
    }
  }, [sessionId]);

  useEffect(() => {
    if (user) {
      const userId = user.uid || user.id;
      logger.debug("DrInfoSummary component initialized with user:", {
        userId,
        hasUid: !!user.uid,
        hasId: !!user.id,
        authenticationType: user.uid ? "Firebase Auth" : "Custom Auth",
      });
      
      // Track page viewed
      track.drinfoSummaryPageViewed(userId, 'drinfo-summary');
    } else {
      logger.debug("DrInfoSummary component initialized with NO USER");
    }
  }, [user]);

  useEffect(() => {
    if (isChatLoading === false && chatHistory.length > 0) {
      setMessages(chatHistory);
    }
  }, [isChatLoading, chatHistory]);

  // Share banner logic
  useEffect(() => {
    // Show banner when AI is generating answer and user hasn't dismissed it
    if (isLoading && (status === 'processing' || status === 'searching' || status === 'summarizing' || status === 'formatting') && !bannerDismissed && messages.length > 0) {
      // Add a 2-second delay before showing the banner
      const timer = setTimeout(() => {
        setShowShareBanner(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    } else {
      setShowShareBanner(false);
    }
  }, [isLoading, status, bannerDismissed, messages.length]);

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
          logger.error("Error fetching user country:", error);
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
        logger.debug('[CITATIONS] Setting citations from messages:', lastAssistantMsg.answer.citations);
        setActiveCitations(lastAssistantMsg.answer.citations);
      }
    }
  }, [messages]);

  const loadChatSession = async (sessionId: string) => {
    setIsChatLoading(true);
    try {
      logger.debug("[LOAD] Loading chat session with ID:", sessionId);
      const db = getFirebaseFirestore();
      
      const sessionDocRef = doc(db, "conversations", sessionId);
      const sessionDoc = await getDoc(sessionDocRef);
      
      if (sessionDoc.exists()) {
        logger.debug("[LOAD] Session document exists, loading threads...");
        
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
        
        // Initialize question count based on loaded messages
        const userMessageCount = messages.filter(msg => msg.type === 'user').length;
        logger.debug("[FEEDBACK] Initializing question count from loaded messages:", userMessageCount);
        setQuestionCount(userMessageCount);
        
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
          
          if (lastAssistantMsg.answer.svg_content && lastAssistantMsg.answer.svg_content.length > 0) {
            setImageGenerationStatus('complete');
          }

          // Set activeCitations immediately when loading from history
          logger.debug('[LOAD] Setting citations from history:', citations);
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
            references: [],
            questions_followed: lastAssistantMsg.answer.questions_followed || []
          });
          
          if (citations && Object.keys(citations).length > 0) {
            setStatus('complete');
          }
          
          logger.debug('[LOAD] Raw assistant content:', lastAssistantMsg.answer.mainSummary);
          logger.debug('[LOAD] Raw assistant citations:', citations);
          logger.debug('[LOAD] streamedContent:', {
            mainSummary: lastAssistantMsg.answer.mainSummary,
            sections: lastAssistantMsg.answer.sections || []
          });
          logger.debug('[LOAD] completeData:', {
            processed_content: lastAssistantMsg.answer.mainSummary,
            sections: lastAssistantMsg.answer.sections || [],
            citations,
            status: 'complete',
            references: []
          });
        }
        
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.type === 'user') {
          logger.debug("[LOAD] Found user message without assistant response, will trigger API call:", lastMessage.content);
          setQuery(lastMessage.content);
          setLastQuestion(lastMessage.content);
        } else {
          const storedQuery = sessionStorage.getItem(`chat_query_${sessionId}`);
          const needsAnswer = sessionStorage.getItem(`chat_needs_answer_${sessionId}`);
          
          if (storedQuery && needsAnswer === 'true') {
            logger.debug("[LOAD] Found stored query in sessionStorage:", storedQuery);
            setQuery(storedQuery);
            setLastQuestion(storedQuery);
            sessionStorage.removeItem(`chat_query_${sessionId}`);
            sessionStorage.removeItem(`chat_needs_answer_${sessionId}`);
          }
        }
      } else {
        logger.error("[LOAD] Session not found for ID:", sessionId);
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
      logger.error("[LOAD] Error loading chat session:", err);
      setError("Failed to load chat session. Please try refreshing the page.");
    } finally {
      setIsChatLoading(false);
    }
  };

  const saveChatSession = async (messages: ChatMessage[]): Promise<string | null> => {
    logger.debug("Attempting to save chat session...");
    logger.debug("User object:", user);
    logger.debug("Current sessionId:", sessionId);
    
    const userId = user?.uid || user?.id;
    
    if (!userId || !sessionId) {
      logger.warn("User not authenticated or no session ID, chat history not saved");
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

      logger.debug("Successfully saved chat session and threads");
      return sessionId;
    } catch (err) {
      logger.error("Error saving chat session:", err);
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
    logger.debug("[SEARCH] Component state update:", {
      sessionID: sessionId,
      isChatLoading,
      query,
      hasFetched,
      chatHistory: chatHistory.length,
      lastQuestion
    });
    
    if (!isChatLoading && query && !hasFetched) {
      logger.debug("[SEARCH] Triggering search with query:", query);
      logger.debug("[SEARCH] Using mode:", activeMode === 'instant' ? 'swift' : 'study');
      setHasFetched(true);
      setTimeout(() => {
          handleSearchWithContent(query, false, activeMode === 'instant' ? 'swift' : 'study');
      }, 0);
    }
  }, [sessionId, isChatLoading, query, hasFetched, lastQuestion]);

  const [shouldUseNextScroll, setShouldUseNextScroll] = useState(true);
  
  // Scroll to end during active session (when streaming)
  useEffect(() => {
    if (lastQuestion && isStreaming) {
      setShouldUseNextScroll(false);
      // Use requestAnimationFrame for smooth performance
      requestAnimationFrame(() => {
        // Scroll the content container to bottom
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
        
        // Also scroll the window to ensure the follow-up area is visible
        const followUpArea = document.querySelector('.follow-up-question-search');
        if (followUpArea) {
          followUpArea.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end',
            inline: 'nearest'
          });
        }
      });
    }
  }, [lastQuestion, isStreaming]); // Depend on lastQuestion and isStreaming

  // Scroll to end when loading from history (not streaming)
  useEffect(() => {
    // console.log('messages.length', messages.length);
    // console.log('isStreaming', isStreaming);
    // console.log('shouldUseNextScroll', shouldUseNextScroll);
    if (messages.length > 0 && !isStreaming && shouldUseNextScroll) {
      // Use requestAnimationFrame for smooth performance
      requestAnimationFrame(() => {
        // Scroll the content container to bottom
        if (contentRef.current) {
          contentRef.current.scrollTop = contentRef.current.scrollHeight;
        }
        
        // Also scroll the window to ensure the follow-up area is visible
        const followUpArea = document.querySelector('.follow-up-question-search');
        if (followUpArea) {
          followUpArea.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'end',
            inline: 'nearest'
          });
        }
      });
    }
  }, [messages.length, isStreaming, shouldUseNextScroll]); // Depend on messages, streaming, and shouldUseNextScroll

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setLastQuestion(query);
    setQuestionCount(prev => {
      const newCount = prev + 1;
      logger.debug("[FEEDBACK] Incrementing question count from", prev, "to", newCount, "via handleSearch");
      if (newCount % 4 === 0) {
        logger.debug("[FEEDBACK] Question", newCount, "reached - modal will appear in 45 seconds");
      }
      return newCount;
    });
    handleSearchWithContent(query, false, activeMode === 'instant' ? 'swift' : 'study');
    setFollowUpQuestion(''); // Clear follow-up input after main search
  };

  const handleFollowUpQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpQuestion.trim()) return;
    
    // Track follow-up question asked
    const userId = user?.uid || user?.id;
    if (userId) {
      track.drinfoSummaryFollowUpAsked(followUpQuestion, userId, 'drinfo-summary');
    }
    
    setLastQuestion(followUpQuestion);
    setQuestionCount(prev => {
      const newCount = prev + 1;
      logger.debug("[FEEDBACK] Incrementing question count from", prev, "to", newCount, "via handleFollowUpQuestion");
      if (newCount % 4 === 0) {
        logger.debug("[FEEDBACK] Question", newCount, "reached - modal will appear in 45 seconds");
      }
      return newCount;
    });
    
    // Start the search/streaming first to create the answer icon
    handleSearchWithContent(followUpQuestion, true, activeMode === 'instant' ? 'swift' : 'study', false);
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
    logger.debug("Parsing content length:", content.length);
    
    if (!content || content.trim() === '') {
      logger.debug("Empty content received");
      return { mainSummary: '', sections: [] };
    }
    
    const sections = [];
    let mainSummary = content;
    
    try {
      const headerMatch = content.match(/#{2,3}\s.+/g);
      
      if (headerMatch && headerMatch.length > 0) {
        logger.debug("Found sections in content:", headerMatch.length);
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
        logger.debug("No sections found in content");
      }
      
      mainSummary = mainSummary.replace(/---+\s*$/, '').trim();
      
      return { mainSummary, sections };
    } catch (error) {
      logger.error("Error parsing content:", error);
      return { 
        mainSummary: content.trim(), 
        sections: [] 
      };
    }
  }

  const getCitationCount = (citations?: Record<string, Citation>) => {
    if (!citations) return 0;
    
    // Filter out implicit drug citations
    const visibleCitations = Object.entries(citations).filter(([key, citation]) => {
      // If it's a drug citation and has drug_citation_type === 'implicit', exclude it
      if (citation.source_type === 'drug_database' && citation.drug_citation_type === 'implicit') {
        return false;
      }
      // Otherwise, include it
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
        transition: all 0.2s ease;
      }
      
      .citation-number:hover {
        background-color: #0284c7;
        color: white;
        transform: scale(1.1);
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

      .drug-name-clickable {
        color: #214498 !important;
        cursor: pointer;
        transition: color 0.2s ease;
        font-weight: bold !important;
        display: inline;
      }
      
      .drug-name-clickable:hover {
        color: #3771FE !important;
      }

      /* Table styling for HTML content */
      .drinfo-answer-content table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
        font-size: 14px;
        line-height: 1.4;
      }
      
      .drinfo-answer-content th {
        background-color: #f8fafc;
        border: 1px solid #e2e8f0;
        padding: 12px 16px;
        text-align: left;
        font-weight: 600;
        color: #1e293b;
        font-family: 'DM Sans', sans-serif;
      }
      
      .drinfo-answer-content td {
        border: 1px solid #e2e8f0;
        padding: 12px 16px;
        text-align: left;
        color: #334155;
        font-family: 'DM Sans', sans-serif;
        vertical-align: top;
      }
      
      .drinfo-answer-content tr:nth-child(even) {
        background-color: #f8fafc;
      }
      
      .drinfo-answer-content tr:hover {
        background-color: #f1f5f9;
      }
      
      .drinfo-answer-content thead th {
        background-color: #e2e8f0;
        font-weight: 700;
        color: #0f172a;
      }
      
      /* Mobile responsive table styling */
      @media (max-width: 768px) {
        .drinfo-answer-content table {
          font-size: 12px;
        }
        
        .drinfo-answer-content th,
        .drinfo-answer-content td {
          padding: 8px 10px;
        }
        
        .drinfo-answer-content table {
          overflow-x: auto;
          display: block;
        }
      }

      /* Styling for markdown formatting within tables */
      .drinfo-answer-content table strong {
        font-weight: 700;
        color: #1e293b;
      }
      
      .drinfo-answer-content table em {
        font-style: italic;
        color: #475569;
      }
      
      .drinfo-answer-content table strong em {
        font-weight: 700;
        font-style: italic;
        color: #1e293b;
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

      /* SVG content in answer tab */
      .answer-svg-content {
        width: 100%;
        max-width: 100%;
        height: auto;
        display: block;
        margin: 1rem 0;
        border-radius: 8px;
        overflow: hidden;
      }
      
      .answer-svg-content svg {
        width: 100%;
        height: auto;
        max-width: 100%;
        display: block;
        background: white;
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

      /* Hide scrollbars while maintaining scroll functionality */
      .hide-scrollbar {
        -ms-overflow-style: none;  /* Internet Explorer 10+ */
        scrollbar-width: none;  /* Firefox */
      }
      
      .hide-scrollbar::-webkit-scrollbar {
        display: none;  /* Safari and Chrome */
      }

      /* Apply to main content areas */
      .overflow-y-auto {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      
      .overflow-y-auto::-webkit-scrollbar {
        display: none;
      }

      /* Apply to specific scrollable containers */
      .flex-1.overflow-y-auto {
        -ms-overflow-style: none;
        scrollbar-width: none;
      }
      
      .flex-1.overflow-y-auto::-webkit-scrollbar {
        display: none;
      }
    `;
    document.head.appendChild(style);
    
    function attachTooltips() {
      const citationRefs = document.querySelectorAll('.citation-reference');
      const drugNameRefs = document.querySelectorAll('.drug-name-clickable');
      
      // Handle citation references
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
        
        // Add click handler for all devices
        ref.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          if (citationObj) {
            // Track citation clicked
            const userId = user?.uid || user?.id;
            // if (userId) {
            //   track.drinfoSummaryCitationClicked(citationObj.id || citationNumber, citationObj.title || 'Unknown', userId, 'drinfo-summary');
            // }
            
            // Check if it's a mobile device (no hover capability)
            if (window.matchMedia('(hover: none)').matches) {
              // Only open citations sidebar for non-drug citations on mobile
              if (citationObj.source_type !== 'drug_database') {
                setSelectedCitation(citationObj);
                setShowCitationsSidebar(true);
              }
              // For drug citations, do nothing on click (keep hover tooltip only)
            } else {
              // Desktop: Open URL in new tab if available
              const url = citationObj.url;
              if (url && url !== '#') {
                window.open(url, '_blank', 'noopener,noreferrer');
              } else if (citationObj.doi) {
                // If no URL but has DOI, open DOI link
                window.open(`https://doi.org/${citationObj.doi}`, '_blank', 'noopener,noreferrer');
              }
            }
          } else {
            // Fallback: try to get URL from data attributes
            const url = ref.getAttribute('data-citation-url');
            const doi = ref.getAttribute('data-citation-doi');
            
            if (url && url !== '#') {
              window.open(url, '_blank', 'noopener,noreferrer');
            } else if (doi) {
              window.open(`https://doi.org/${doi}`, '_blank', 'noopener,noreferrer');
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
          logger.debug('Drug name clicked:', { citationNumber, citationObj });
          if (citationObj && citationObj.source_type === 'drug_database') {
            logger.debug('Opening drug modal for:', citationObj.title);
            setSelectedCitation(citationObj);
            setShowDrugModal(true);
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
          // Check if any added nodes contain citation references or drug names
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              if (element.querySelector('.citation-reference') || 
                  element.querySelector('.drug-name-clickable') ||
                  element.classList.contains('citation-reference') ||
                  element.classList.contains('drug-name-clickable')) {
                shouldAttach = true;
              }
            }
          });
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

  const handleSearchWithContent = async (content: string, isFollowUp: boolean = false, mode?: string, directImageRequest: boolean = false) => {
    let hasCompleted = false;
    if (!content.trim()) return;
    if (!sessionId) {
      setError('No session ID provided.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setImageGenerationStatus('idle'); // Reset image generation status
    setShowTourPrompt(false); // Hide tour prompt when new question is asked
    const userId = user?.uid || user?.id;
    if (!userId) {
      setError('User not authenticated.');
      setIsLoading(false);
      return;
    }

    // Track query submitted
    track.drinfoSummaryQuerySubmitted(content, mode || 'research', userId, 'drinfo-summary');

    // Determine parent_thread_id for Firebase thread-based follow-up detection
    const parentThreadId = isFollowUp && messages.length > 0 
      ? messages[messages.length - 1]?.threadId  // Get the last assistant message's thread ID
      : undefined;

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
          
          // Track image generated
          const userId = user?.uid || user?.id;
          if (userId && message) {
            try {
              const imageData = JSON.parse(message);
              if (imageData.svg_content) {
                const imageCount = Array.isArray(imageData.svg_content) 
                  ? imageData.svg_content.filter((content: any) => content !== null && content !== undefined).length
                  : 1;
                track.drinfoSummaryImageGenerated(imageCount, userId, 'drinfo-summary');
              }
            } catch (error) {
              // If parsing fails, still track with count 1
              track.drinfoSummaryImageGenerated(1, userId, 'drinfo-summary');
            }
          }
        }
        
        // Handle complete_image status independently of hasCompleted flag
        if (newStatus === 'complete_image' && message) {
          try {
            const imageData = JSON.parse(message);
            if (imageData.svg_content) {
              // Ensure svg_content is an array and filter out null/undefined values
              const svgContentArray = Array.isArray(imageData.svg_content) 
                ? imageData.svg_content.filter((content: any) => content !== null && content !== undefined)
                : [imageData.svg_content].filter((content: any) => content !== null && content !== undefined);
              
              // Update the last assistant message with SVG content
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
          // console.error('Error parsing image data:', error);
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
                      svg_content: msg.answer?.svg_content || (data?.svg_content ? 
                        (Array.isArray(data.svg_content) ? data.svg_content.filter((content: any) => content !== null && content !== undefined) : [data.svg_content])
                      : []),
                      apiResponse: data?.apiResponse, // Store the API response details
                      questions_followed: data?.questions_followed || [] // Store the follow-up questions
                    },
                  }
                : msg
            );

            // console.log('[COMPLETE] Final data received');

            return updatedMessages;
          });

          setActiveCitations(data?.citations ? Object.entries(data.citations).reduce((acc, [key, citation]) => ({
            ...acc,
            [key]: {
              ...citation,
              source_type: citation.source_type || 'internet'
            }
          }), {}) : {});
          
          // Update completeData with questions_followed
          setCompleteData(prev => ({
            ...prev,
            questions_followed: data?.questions_followed || []
          }));
          
          // Set remaining limit if available and not 'N/A'
          if (data?.remaining_limit !== undefined && data.remaining_limit !== 'N/A') {
            // Convert to number if it's a string, otherwise use as is
            const limit = typeof data.remaining_limit === 'string' ? parseInt(data.remaining_limit, 10) : data.remaining_limit;
            setRemainingLimit(isNaN(limit) ? undefined : limit);
            
            // Update Firebase with the remaining limit
            if (!isNaN(limit)) {
              updateRemainingLimitInFirebase(limit);
            }
          } else {
            setRemainingLimit(undefined);
          }
          
          // Increment total questions asked counter
          incrementTotalQuestionsAsked();
          
          // console.log('[CITATIONS_DEBUG] Setting activeCitations:', {
          //   hasCitations: !!data?.citations,
          //   citationCount: data?.citations ? Object.keys(data.citations).length : 0,
          //   status: 'complete'
          // });
          
          setStatus('complete');
          setIsLoading(false);
          setTimeout(() => {
            if (hasCompleted) {
              setIsStreaming(false);
              setStatusMessage(null);
            }
          }, 2000);
        } catch (error) {
          logger.error('Error updating messages:', error);
          
          // Check if it's an internet connection error
          let fallback = 'Servers are overloaded. Please try again later.';
          if(data?.responseStatus === 429){
            fallback = 'Too many requests. Please wait until your monthly limit resets or <a href="/dashboard/profile?tab=subscription" target="_blank" rel="noopener noreferrer" class="underline text-blue-600 hover:text-blue-800">upgrade to Pro</a> for unlimited access.';
          }
          // console.log('Internet',navigator.onLine)
          if (!navigator.onLine) {
            fallback = 'Connection lost. Please check your internet and try again.';
          }
          // Add a small randomized delay (2-3 seconds) before showing the fallback answer
          const randomDelayMs = 2000 + Math.floor(Math.random() * 1000);
          await new Promise((resolve) => setTimeout(resolve, randomDelayMs));
          // Show the error as the assistant's answer and mark as complete
          setMessages(prev => {
            if (prev.length === 0) return prev;
            const lastIndex = prev.length - 1;
            return prev.map((msg, idx) =>
              idx === lastIndex && msg.type === 'assistant'
                ? {
                    ...msg,
                    content: fallback,
                    answer: {
                      ...(msg.answer || { mainSummary: '', sections: [], citations: {} }),
                      mainSummary: fallback,
                      sections: [],
                      citations: msg.answer?.citations || {},
                      apiResponse: data?.apiResponse // Store the API response details
                    }
                  }
                : msg
            );
          });
          
          // Log the API response details for debugging
          if (data?.apiResponse) {
            // console.log('[API_RESPONSE] Response details after fallback:', data.apiResponse);
          }
          setStatus('complete');
          setIsLoading(false);
          setIsStreaming(false);
          setStatusMessage(null);
          setError(null);
        }
      },
      { 
        sessionId: sessionId, 
        userId, 
        parent_thread_id: parentThreadId, 
        mode: activeMode === 'instant' ? 'swift' : 'study',
        country: userCountry, // Add country to the options
        direct_image_request: directImageRequest // Add direct image request flag
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

  // Share functionality
  const handleShare = async () => {
    if (!sessionId || !user) {
      logger.error('Cannot share: missing sessionId or user');
      return;
    }

    // Track share initiated
    const userId = user.uid || user.id;
    track.drinfoSummaryShared('initiated', userId, 'drinfo-summary');

    setIsSharing(true);
    setShowSharePopup(true);

    try {
      const db = getFirebaseFirestore();
      const userId = user.uid || user.id;

      // Get the current chat session data
      const sessionDocRef = doc(db, "conversations", sessionId);
      const sessionDoc = await getDoc(sessionDocRef);
      
      if (!sessionDoc.exists()) {
        throw new Error('Session not found');
      }

      const sessionData = sessionDoc.data();
      
      // Get all threads for this session
      const threadsRef = collection(db, "conversations", sessionId, "threads");
      const threadsQueryRef = firestoreQuery(threadsRef, orderBy("user_message.timestamp"));
      const threadsSnapshot = await getDocs(threadsQueryRef);
      
      const threads: any[] = [];
      threadsSnapshot.forEach((threadDoc) => {
        const threadData = threadDoc.data();
        // Clean the data to remove any undefined or null values
        const cleanThread = {
          user_message: {
            content: threadData.user_message?.content || '',
            timestamp: threadData.user_message?.timestamp || Date.now()
          },
          bot_response: {
            content: threadData.bot_response?.content || '',
            citations: threadData.bot_response?.citations || {},
            search_data: threadData.bot_response?.search_data || {},
            svg_content: threadData.bot_response?.svg_content || []
          },
          context: {
            parent_thread_id: threadData.context?.parent_thread_id || null
          }
        };
        threads.push(cleanThread);
      });

      // Create public chat document
      const publicChatData = {
        original_session_id: sessionId,
        user_id: userId,
        user_email: user.email || '',
        title: sessionData.title || 'Shared Chat',
        created_at: serverTimestamp(),
        updated_at: serverTimestamp(),
        threads: threads,
        is_public: true
      };

      const publicChatRef = await addDoc(collection(db, "public_chats"), publicChatData);
      
      // Generate shareable link
      const shareableLink = `${window.location.origin}/dashboard/public/${publicChatRef.id}`;
      setShareLink(shareableLink);
      
      logger.debug('Chat shared successfully:', publicChatRef.id);
    } catch (error) {
      logger.error('Error sharing chat:', error);
      setShareLink('');
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async () => {
    if (!shareLink) return;
    
    // Track copy to clipboard
    const userId = user?.uid || user?.id;
    if (userId) {
      track.drinfoSummaryShared('copy_clipboard', userId, 'drinfo-summary');
    }
    
    try {
      await navigator.clipboard.writeText(shareLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      logger.error('Failed to copy to clipboard:', error);
    }
  };

  const shareOnLinkedIn = () => {
    if (!shareLink) return;
    
    // Track LinkedIn share
    const userId = user?.uid || user?.id;
    if (userId) {
      track.drinfoSummaryShared('linkedin', userId, 'drinfo-summary');
    }
    
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareLink)}`;
    window.open(url, '_blank');
  };

  const shareOnWhatsApp = () => {
    if (!shareLink) return;
    
    // Track WhatsApp share
    const userId = user?.uid || user?.id;
    if (userId) {
      track.drinfoSummaryShared('whatsapp', userId, 'drinfo-summary');
    }
    
    const url = `https://wa.me/?text=${encodeURIComponent(`Check out this chat: ${shareLink}`)}`;
    window.open(url, '_blank');
  };

  const shareViaEmail = () => {
    if (!shareLink) return;
    
    // Track email share
    const userId = user?.uid || user?.id;
    if (userId) {
      track.drinfoSummaryShared('email', userId, 'drinfo-summary');
    }
    
    const subject = 'Shared Chat from DrInfo';
    const body = `I wanted to share this chat with you: ${shareLink}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url);
  };

  // Share banner handlers
  const handleBannerClose = () => {
    setShowShareBanner(false);
    setBannerDismissed(true);
  };

  const handleBannerShare = async () => {
    setShowShareBanner(false);
    setBannerDismissed(true);
    
    const shareData = {
      title: 'DR. INFO - AI-Powered Medical Insights',
      text: 'Check out DR. INFO for trusted, evidence-based medical insights powered by AI.',
      url: 'https://app.drinfo.ai'
    };

    try {
      // Check if Web Share API is supported
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        // Fallback: copy URL to clipboard
        await navigator.clipboard.writeText('https://app.drinfo.ai');
        // You could also show a toast notification here
        console.log('URL copied to clipboard');
      }
    } catch (error) {
      console.error('Error sharing:', error);
      // Fallback: copy URL to clipboard
      try {
        await navigator.clipboard.writeText('https://app.drinfo.ai');
        console.log('URL copied to clipboard as fallback');
      } catch (clipboardError) {
        console.error('Failed to copy to clipboard:', clipboardError);
      }
    }
  };

  const handleBannerShareWhatsApp = () => {
    setShowShareBanner(false);
    setBannerDismissed(true);
    // Share the app URL instead of specific chat
    const appUrl = 'https://app.drinfo.ai';
    const message = `Hey there! I am really enjoying using DR. INFO. Take a look at it: ${appUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleBannerShareLinkedIn = () => {
    setShowShareBanner(false);
    setBannerDismissed(true);
    // Share the app URL instead of specific chat
    const appUrl = 'https://app.drinfo.ai';
    const message = `Hey there! I am really enjoying using DR. INFO. Take a look at it: ${appUrl}`;
    const url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(appUrl)}&summary=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleBannerShareEmail = () => {
    setShowShareBanner(false);
    setBannerDismissed(true);
    // Share the app URL instead of specific chat
    const appUrl = 'https://app.drinfo.ai';
    const subject = 'Hey there! Check out DR. INFO';
    const body = `Hey there! I am really enjoying using DR. INFO. Take a look at it: ${appUrl}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.open(url);
  };

  // Helper function to check if content is SVG
  const isSvgContent = (content: string): boolean => {
    if (!content || typeof content !== 'string') return false;
    const trimmedContent = content.trim();
    const isSvg = trimmedContent.startsWith('<svg') || trimmedContent.startsWith('<?xml');
    if (isSvg) {
      logger.debug('[SVG_DETECTION] Detected SVG content:', trimmedContent.substring(0, 100) + '...');
    }
    return isSvg;
  };

  // Helper function to count words in text content
  const countWords = (content: string): number => {
    if (!content || typeof content !== 'string') return 0;
    // Remove HTML tags and count words
    const textContent = content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return textContent.split(/\s+/).filter(word => word.length > 0).length;
  };

  // Helper function to check if answer should show infographic option
  const shouldShowInfographicOption = (content: string, msgIndex: number, totalMessages: number): boolean => {
    if (!content || isSvgContent(content)) return false;
    const wordCount = countWords(content);
    // Only show for the last assistant message and when streaming is complete
    const isLastMessage = msgIndex === totalMessages - 1;
    const isStreamingComplete = status === 'complete' || status === 'complete_image';
    // Don't show for instant mode
    const isNotInstantMode = activeMode !== 'instant';
    return wordCount > 200 && isLastMessage && isStreamingComplete && isNotInstantMode;
  };

  // Function to download SVG as PNG
  const downloadSvgAsPng = (svgContent: string, filename: string = 'generated-image') => {
    try {
      // Create a temporary container for the SVG
      const container = document.createElement('div');
      container.innerHTML = svgContent;
      const svgElement = container.querySelector('svg');
      
          if (!svgElement) {
      // console.error('No SVG element found in content');
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
        // console.error('Failed to load SVG image');
        URL.revokeObjectURL(svgUrl);
      };

      img.src = svgUrl;
    } catch (error) {
      // console.error('Error downloading SVG as PNG:', error);
    }
  };

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

  const handleShareVisualAbstract = async (svgContent: string, inputText: string = 'Visual Abstract from DR. INFO') => {
    if (!user) {
      toast.error('Please sign in to share visual abstracts')
      return
    }

    setSharingSvgContent(svgContent)
    setIsSharing(true)
    setShowSharePopup(true)

    try {
      const userId = user.uid
      const userEmail = user.email || ''

      // Create public visual abstract
      const shareableLink = await createPublicVisualAbstract(svgContent, inputText, userId, userEmail)
      
      if (shareableLink) {
        setShareLink(shareableLink)
        toast.success('Visual abstract shared successfully!')
        
        // Track sharing
        try {
          if (track.visualAbstractShared) {
            track.visualAbstractShared(userId, 'drinfo-summary')
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

  const copyVisualAbstractLink = async () => {
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

  // Auto-switch to Images tab when image generation is complete
  useEffect(() => {
    if (imageGenerationStatus === 'complete') {
      setActiveTab('images');
    }
  }, [imageGenerationStatus]);

  // Auto-switch to Images tab when images are available in the last message
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.type === 'assistant' && lastMessage.answer?.svg_content && lastMessage.answer.svg_content.length > 0) {
        setActiveTab('images');
      }
    }
  }, [messages]);

  const [reloadingMessageId, setReloadingMessageId] = useState<string | null>(null);

  const handleReload = async (assistantMessageId: string) => {
    if (!sessionId || !user) return;

    // Find the assistant message and its corresponding user message
    const assistantMsgIndex = messages.findIndex(msg => msg.id === assistantMessageId);
    if (assistantMsgIndex === -1) return;

    const assistantMsg = messages[assistantMsgIndex];
    const userMsg = messages[assistantMsgIndex - 1];
    
    if (!userMsg || userMsg.type !== 'user') return;

    setReloadingMessageId(assistantMessageId);
    logger.debug('[RELOAD] Starting complete reload - deleting thread:', assistantMsg.threadId);
    logger.debug('[RELOAD] Question to reload:', userMsg.content);
    
    try {
      const userId = user.uid || user.id;
      const db = getFirebaseFirestore();

      // Step 1: Delete the entire thread from Firebase (both question and answer)
      if (assistantMsg.threadId) {
        const threadRef = doc(db, "conversations", sessionId, "threads", assistantMsg.threadId);
        await deleteDoc(threadRef);
        logger.debug('[RELOAD] Successfully deleted thread from Firebase:', assistantMsg.threadId);
      }

      // Step 2: Remove both user and assistant messages from UI state
      setMessages(prev => prev.filter(msg => 
        msg.id !== userMsg.id && msg.id !== assistantMessageId
      ));
      logger.debug('[RELOAD] Removed messages from UI');

      // Step 3: Create fresh messages for the reload
      const tempThreadId = Date.now().toString();
      const freshUserMsg = {
        id: `user-${tempThreadId}`,
        type: 'user' as const,
        content: userMsg.content, 
        timestamp: Date.now(),
        questionType: userMsg.questionType || 'main' as const,
        threadId: tempThreadId
      };

      const freshAssistantMsg = {
        id: `assistant-${tempThreadId}`,
        type: 'assistant' as const,
        content: '',
        timestamp: Date.now() + 1,
        answer: {
          mainSummary: '',
          sections: [],
          citations: {}
        },
        threadId: tempThreadId
      };

      // Add fresh messages to UI
      setMessages(prev => [...prev, freshUserMsg, freshAssistantMsg]);
      logger.debug('[RELOAD] Added fresh messages to UI');

      // Step 4: Start fresh API call
      let hasCompleted = false;
      let streamedContent = '';

      fetchDrInfoSummary(
        userMsg.content,
        (chunk: string) => {
          if (hasCompleted) return;
          streamedContent += chunk;
          // Update the fresh assistant message with streamed content
          setMessages(prev => prev.map(msg =>
            msg.id === `assistant-${tempThreadId}`
              ? { 
                  ...msg, 
                  content: streamedContent, 
                  answer: { ...msg.answer, mainSummary: streamedContent, sections: [] }
                }
              : msg
          ));
        },
        (newStatus: string, message?: string) => {
          if (hasCompleted) return;
          setStatus(newStatus as StatusType);
          logger.debug('[RELOAD] Status update:', newStatus);
        },
        async (data: DrInfoSummaryData) => {
          if (hasCompleted) return;
          hasCompleted = true;
          
          try {
            logger.debug('[RELOAD] Received fresh data:', data);
            
            if (!data.thread_id) {
              throw new Error('Thread ID not received from backend');
            }

            // Update messages with the thread ID from backend
            setMessages(prev => prev.map(msg =>
              msg.threadId === tempThreadId
                ? { ...msg, threadId: data.thread_id! }
                : msg
            ));

            // Update the assistant message with final content
            setMessages(prev => prev.map(msg =>
              msg.id === `assistant-${tempThreadId}`
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
                          source_type: normalizeSourceType(citation.source_type)
                        }
                      }), {}) : {},
                    },
                    status: 'complete', // Reset status
                  }
                : msg
            ));

            // Update active citations
            setActiveCitations(data?.citations ? Object.entries(data.citations).reduce((acc, [key, citation]) => ({
              ...acc,
              [key]: {
                ...citation,
                source_type: normalizeSourceType(citation.source_type)
              }
            }), {}) : {});

            // Update remaining limit if available and not 'N/A'
            if (data?.remaining_limit !== undefined && data.remaining_limit !== 'N/A') {
              // Convert to number if it's a string, otherwise use as is
              const limit = typeof data.remaining_limit === 'string' ? parseInt(data.remaining_limit, 10) : data.remaining_limit;
              setRemainingLimit(isNaN(limit) ? undefined : limit);
              
              // Update Firebase with the remaining limit
              if (!isNaN(limit)) {
                updateRemainingLimitInFirebase(limit);
              }
            } else {
              setRemainingLimit(undefined);
            }

            // Increment total questions asked counter
            incrementTotalQuestionsAsked();

            setStatus('complete');
            setIsLoading(false);
            
            logger.debug('[RELOAD] Successfully completed reload with new thread:', data.thread_id);

          } catch (error) {
            logger.error('[RELOAD] Error updating messages:', error);
            setError('Failed to complete reload. Please try again.');
          } finally {
            setReloadingMessageId(null);
            setTimeout(() => {
              if (hasCompleted) {
                setIsStreaming(false);
                setStatusMessage(null);
              }
            }, 2000);
          }
        },
        { 
          sessionId: sessionId, 
          userId, 
          parent_thread_id: userMsg.questionType === 'follow-up' ? 
            messages.find(m => m.id === userMsg.id && m.type === 'user')?.threadId : undefined,
          mode: activeMode === 'instant' ? 'swift' : 'study',
          country: userCountry
        }
      );

    } catch (error) {
      logger.error('[RELOAD] Error during complete reload:', error);
      setError('Failed to reload. Please try again.');
      setReloadingMessageId(null);
    }
  };

  const tourContext = useDrinfoSummaryTour();
  const [showTourPrompt, setShowTourPrompt] = useState(false);
  
  // Custom scroll function to scroll to bottom of answer and citation grid
  const scrollToAnswerBottom = () => {
    // First, scroll to the very bottom of the answer content
    setTimeout(() => {
      // Scroll to the very bottom of the content container
      const contentRef = document.querySelector('.flex-1.overflow-y-auto');
      if (contentRef) {
        contentRef.scrollTop = contentRef.scrollHeight;
      }
      
      // Also scroll the window to the bottom
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });
      
      // Scroll to the follow-up question area to ensure we're at the very bottom
      const followUpArea = document.querySelector('.follow-up-question-search');
      if (followUpArea) {
        followUpArea.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
      
      // Additional scroll to citation grid
      const citationGrid = document.querySelector('.drinfo-citation-grid-step');
      if (citationGrid) {
        citationGrid.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  // Custom scroll function to scroll to bottom of page (steps 2-6)
  const scrollToVisualAbstractButton = () => {
    setTimeout(() => {
      // Scroll to the very bottom of the content container
      const contentRef = document.querySelector('.flex-1.overflow-y-auto');
      if (contentRef) {
        contentRef.scrollTop = contentRef.scrollHeight;
      }
      
      // Also scroll the window to the bottom
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: 'smooth'
      });
      
      // Scroll to the visual abstract button specifically
      const visualAbstractButton = document.querySelector('.drinfo-visual-abstract-step');
      if (visualAbstractButton) {
        visualAbstractButton.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center',
          inline: 'nearest'
        });
      }
    }, 100);
  };

  // Modified tour start function with 2-second delay
  const startTourWithDelay = () => {
    if (!tourContext) return;
    
    setShowTourPrompt(false);
    scrollToAnswerBottom();
    
    // Delay tour start by 2 seconds to allow scrolling to complete
    setTimeout(() => {
      tourContext.startTour();
    }, 2000);
  };

  // Show tour prompt when answer is complete and rendered
  useEffect(() => {
    // Check if tour should be shown based on saved preferences
    if (tourContext && tourContext.shouldShowTour) {
      const shouldShow = tourContext.shouldShowTour();
      if (!shouldShow) {
        setShowTourPrompt(false);
        return;
      }
    }

    // Show tour prompt when answer is complete and there are messages
    // Only show for the first answer (not follow-up questions)
    if ((status === 'complete' || status === 'complete_image') && messages.length > 0 && !isLoading && messages.length <= 2) {
      // Add a small delay to ensure the answer is fully rendered
      const timeout = setTimeout(() => {
        setShowTourPrompt(true);
      }, 1000); // 1 second delay to ensure rendering is complete
      return () => clearTimeout(timeout);
    } else {
      setShowTourPrompt(false);
    }
  }, [tourContext, status, messages.length, isLoading]);

  // Listen for tour step changes and trigger custom scroll from step 2 onwards
  useEffect(() => {
    if (tourContext && tourContext.run) {
      // Get current step index from tour context
      const currentStepIndex = tourContext.stepIndex || 0;
      
      // If we're on step 2 or later (index 1+), scroll to bottom and stay there
      if (currentStepIndex >= 1) {
        scrollToVisualAbstractButton();
      }
    }
  }, [tourContext?.run, tourContext?.stepIndex]);

  return (
    <div className="p-2 sm:p-4 md:p-6 h-[100dvh] flex flex-col relative overflow-hidden">
      
      {showTourPrompt && (
        <div className="fixed inset-0 z-[10001] flex items-center justify-center bg-black bg-opacity-40">
          <div 
            className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center border mx-4"
            style={{
              borderRadius: "8px",
              border: "1px solid #E4ECFF",
              boxShadow: "0 4px 20px rgba(55, 113, 254, 0.15)",
            }}
          >
            <h2 
              className="text-lg font-semibold mb-2"
              style={{
                color: "#223258",
                fontFamily: "DM Sans, sans-serif",
                fontWeight: "600"
              }}
            >
              Take a quick tour?
            </h2>
            <p 
              className="mb-4"
              style={{
                color: "#223258",
                fontFamily: "DM Sans, sans-serif",
                fontWeight: "400"
              }}
            >
              Would you like a quick tour of the answer and feedback features?
            </p>
            <div className="flex justify-center gap-4">
              <button 
                className="px-4 py-2 rounded transition-colors"
                onClick={startTourWithDelay}
                style={{
                  backgroundColor: "#3771FE",
                  color: "#fff",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  padding: "8px 16px",
                  border: "none",
                  fontFamily: "DM Sans, sans-serif"
                }}
              >
                Yes, show me
              </button>
              <button 
                className="px-4 py-2 rounded transition-colors"
                onClick={() => { 
                  setShowTourPrompt(false); 
                  // Save preference as skipped when user clicks "No, thanks"
                  if (tourContext && tourContext.saveTourPreference) {
                    tourContext.saveTourPreference('skipped');
                  }
                }}
                style={{
                  backgroundColor: "#E4ECFF",
                  color: "#3771FE",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: "500",
                  padding: "8px 16px",
                  border: "1px solid #3771FE",
                  fontFamily: "DM Sans, sans-serif"
                }}
              >
                No, thanks
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Top Bar with Share Button - Hidden on mobile, shown on desktop */}
      <div className="hidden md:flex justify-between items-center mb-4 px-2 sm:px-4">
        <div className="flex-1"></div>
        <button
          onClick={handleShare}
          disabled={!sessionId || messages.length === 0}
          className="flex items-center space-x-2 px-4 py-2 bg-white border border-[#C8C8C8] text-[#223258] rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium drinfo-share-step"
        >
                      <img src="/Share icon.svg" alt="Share" className="w-5 h-5" />
          <span className="hidden sm:inline">Share</span>
          <span className="sm:hidden">Share</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {isChatLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        ) : (
          <>
            {searchPosition === "middle" && !streamedContent.mainSummary && chatHistory.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center">
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto mb-4 max-w-4xl mx-auto w-full font-sans px-2 sm:px-4 relative" ref={contentRef}>
                {/* Share Banner positioned in center of content area */}
                <ShareBanner
                  isVisible={showShareBanner}
                  onClose={handleBannerClose}
                  onShare={handleBannerShare}
                  onShareWhatsApp={handleBannerShareWhatsApp}
                  onShareLinkedIn={handleBannerShareLinkedIn}
                  onShareEmail={handleBannerShareEmail}
                />
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
                          <p className="m-0">
                            {msg.content.includes('Create a visual abstract for this answer::::::') 
                              ? 'Create a visual abstract for this answer' 
                              : msg.content
                            }
                          </p>
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
                                <span className="shimmer-text italic text-sm sm:text-base">{getStatusMessage(status as StatusType)}</span>
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
                                    {/* <button
                                      onClick={() => setActiveTab('images')}
                                      className={`font-semibold font-['DM_Sans'] mt-1 text-base transition-colors duration-200 relative ${
                                        activeTab === 'images' ? 'text-blue-900' : 'text-gray-400 hover:text-blue-700'
                                      }`}
                                    >
                                      AI Infographics
                                      {imageGenerationStatus === 'complete' && (
                                        <span className="absolute -top-0.5 -right-1.5 w-1.5 h-1.5 bg-[linear-gradient(125deg,_#9BB8FF_0%,_#3771FE_45%,_#214498_100%)] rounded-full flex items-center justify-center"></span>
                                      )}
                                    </button> */}
                                  </>
                                )
                              )}
                            </div>
                          </div>
                          {/* Show content during streaming or when complete */}
                          {(msg.content || (idx === messages.length - 1 && isStreaming)) && (
                            <div className="mb-4 sm:mb-6">
                              {activeTab === 'answer' ? (
                                <>
                                  {isSvgContent(msg.content || '') ? (
                                    (() => {
                                      logger.debug('[SVG_RENDERING] Rendering SVG content for message:', msg.id);
                                      return (
                                        // Render SVG content as image
                                        <div className="flex justify-center relative group">
                                          <div 
                                            className="answer-svg-content w-full max-w-4xl"
                                            dangerouslySetInnerHTML={{ __html: msg.content || '' }}
                                          />
                                          <div className="absolute top-2 right-2 flex gap-1 opacity-30 group-hover:opacity-100 transition-all duration-200">
                                            {/* Share Button */}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleShareVisualAbstract(msg.content || '', `Visual Abstract from DR. INFO - ${msg.threadId}`);
                                              }}
                                              className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-md transition-all duration-200 hover:scale-110"
                                              title="Share Visual Abstract"
                                            >
                                              <Share2 size={16} className="text-[#223258]" />
                                            </button>
                                            
                                            {/* Download Button */}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                downloadSvgAsPng(msg.content || '', `answer-${msg.threadId}`);
                                              }}
                                              className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-md transition-all duration-200 hover:scale-110"
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
                                      );
                                    })()
                                  ) : (
                                    // Render text content as before
                                    <div
                                      className="prose prose-slate prose-ul:text-black marker:text-black max-w-none text-base sm:text-base prose-h2:text-base prose-h2:font-semibold prose-h3:text-base prose-h3:font-semibold drinfo-answer-content"
                                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                                      dangerouslySetInnerHTML={{
                                        __html:
                                          idx === messages.length - 1 && status !== 'complete' && status !== 'complete_image'
                                            ? (() => {
                                                // During streaming, check if content contains HTML
                                                const content = msg.content || '';
                                                if (content.includes('```html') || (content.includes('```') && /<[a-z][\s\S]*>/i.test(content))) {
                                                  // If HTML content detected, render it directly with citations
                                                  return formatWithDummyCitations(processStreamingContent(content));
                                                } else {
                                                  // Regular markdown content, process normally
                                                  return formatWithDummyCitations(
                                                    marked.parse(addDummyCitations(content), { async: false })
                                                  );
                                                }
                                              })()
                                            : formatWithCitations(
                                                marked.parse(preprocessContentForHtml(msg.content || ''), { async: false }),
                                                msg.answer?.citations
                                              ),
                                      }}
                                    />
                                  )}
                                  
                                  {/* Show infographic option for long text answers - MOVED BELOW FEEDBACK */}
                                </>
                              ) : (
                                <div className="prose prose-slate max-w-none text-base sm:text-base">
                                  {msg.answer?.svg_content && msg.answer.svg_content.length > 0 ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-4">
                                      {msg.answer.svg_content.map((svgContent, index) => (
                                        svgContent && (
                                          <div key={index} className="relative group cursor-pointer">
                                            <div 
                                              className="svg-content w-full transition-transform duration-200 group-hover:scale-105"
                                              dangerouslySetInnerHTML={{ __html: svgContent }}
                                              onClick={() => setExpandedImage({index, svgContent})}
                                            />
                                            <div className="absolute top-2 right-2 flex gap-1 opacity-30 group-hover:opacity-100 transition-all duration-200">
                                              {/* Share Button */}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleShareVisualAbstract(svgContent, `Visual Abstract from DR. INFO - ${msg.threadId}`);
                                                }}
                                                className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-md transition-all duration-200 hover:scale-110"
                                                title="Share Visual Abstract"
                                              >
                                                <Share2 size={16} className="text-[#223258]" />
                                              </button>
                                              
                                              {/* Download Button */}
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  downloadSvgAsPng(svgContent, `image-${msg.threadId}-${index + 1}`);
                                                }}
                                                className="p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-md transition-all duration-200 hover:scale-110"
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
                                        )
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="flex flex-col items-center py-4">
                                      <div className="w-full max-w-[800px] h-[600px] border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center bg-gray-50">
                                        {imageGenerationStatus === 'generating' ? (
                                          <>
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                            <p className="text-gray-600 font-medium text-lg font-['DM_Sans']">Generating your visuals...</p>
                                            <p className="text-gray-500 text-sm mt-2 font-['DM_Sans']">This may take a few moments to minutes...</p>
                                          </>
                                        ) : (imageGenerationStatus === 'complete' || (msg.answer?.svg_content && msg.answer.svg_content.length > 0)) ? (
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
                          {/* Probable references shimmer during formatting/formatting response stage (after streaming, before citations) */}
                          {idx === messages.length - 1 && (status === 'formatting' || status === 'formatting response') && (() => {
                            const hasCitations = (msg.answer?.citations && Object.keys(msg.answer.citations).length > 0) ||
                              (activeCitations && Object.keys(activeCitations).length > 0);
                            return !hasCitations;
                          })() && (
                            <div className="mt-4 sm:mt-6">
                              {/* Disclaimer appears before shimmer animation (formatting phase) */}
                              {/* <div className="mb-4 text-center">
                                <p className="text-sm text-gray-500 font-['DM_Sans'] italic leading-relaxed">
                                  DR.INFO is an informational and educational tool.
                                </p>
                              </div> */}
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                                <div className="reference-skeleton h-[95px] sm:h-[105px] lg:h-[125px]" />
                                <div className="reference-skeleton h-[95px] sm:h-[105px] lg:h-[125px]" />
                                <div className="reference-skeleton hidden sm:block h-[95px] sm:h-[105px] lg:h-[125px]" />
                              </div>
                            </div>
                          )}

                          {(() => {
                            const shouldShowCitations = (msg.answer?.citations && Object.keys(msg.answer.citations).length > 0) || 
                              (activeCitations && Object.keys(activeCitations).length > 0);
                                        // console.log('[CITATIONS_DISPLAY_DEBUG] Should show citations:', {
            //   hasMsgCitations: !!(msg.answer?.citations && Object.keys(msg.answer.citations).length > 0),
            //   hasActiveCitations: !!(activeCitations && Object.keys(activeCitations).length > 0),
            //   status,
            //   activeCitationsCount: activeCitations ? Object.keys(activeCitations).length : 0,
            //   msgCitationsCount: msg.answer?.citations ? Object.keys(msg.answer.citations).length : 0,
            //   shouldShow: shouldShowCitations
            // });
                            return shouldShowCitations;
                          })() && (
                            <div className="mt-4 sm:mt-6">
                              {/* Disclaimer appears above references when citations are shown (complete phase) */}
                              {/* <div className="mb-4 text-center">
                                <p className="text-sm text-gray-500 font-['DM_Sans'] italic leading-relaxed">
                                  DR.INFO is an informational and educational tool.
                                </p>
                              </div> */}
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
                                  citations={msg.answer?.citations || activeCitations || {}}
                                  // Always pass onReload for the last assistant message
                                  onReload={idx === messages.length - 1 ? () => handleReload(msg.id) : undefined}
                                  isReloading={reloadingMessageId === msg.id}
                                  messageId={msg.id}
                                  user={user}
                                />
                                
                                {/* Show follow-up questions if available - ONLY for the latest question */}
                                {idx === messages.length - 1 && completeData?.questions_followed && completeData.questions_followed.length > 0 && (
                                  <div className="mt-4 sm:mt-6">
                                    <h4 className="text-base font-semibold mb-3 flex items-center" style={{
                                      color: '#223258',
                                      fontFamily: 'DM Sans, sans-serif',
                                      fontWeight: 500,
                                      fontSize: '16px'
                                    }}>
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2" style={{ color: '#223258' }}>
                                      <path d="M7 9H17M7 13H17M21 20L17.6757 18.3378C17.4237 18.2118 17.2977 18.1488 17.1656 18.1044C17.0484 18.065 16.9277 18.0365 16.8052 18.0193C16.6672 18 16.5263 18 16.2446 18H6.2C5.07989 18 4.51984 18 4.09202 17.782C3.71569 17.5903 3.40973 17.2843 3.21799 16.908C3 16.4802 3 15.9201 3 14.8V7.2C3 6.07989 3 5.51984 3.21799 5.09202C3.40973 4.71569 3.71569 4.40973 4.09202 4.21799C4.51984 4 5.0799 4 6.2 4H17.8C18.9201 4 19.4802 4 19.908 4.21799C20.2843 4.40973 20.5903 4.71569 20.782 5.09202C21 5.51984 21 6.0799 21 7.2V20Z" />
                                      </svg>
                                      Suggested Follow-up Questions
                                    </h4>
                                    <div className="space-y-0">
                                      {completeData.questions_followed.map((question: string, questionIdx: number) => (
                                        <div key={questionIdx} className="flex items-center justify-between py-0.5 border-b border-gray-200 last:border-b-0">
                                          <button
                                            onClick={() => {
                                              // Send the question directly to backend as a follow-up
                                              handleSearchWithContent(question, true, activeMode === 'instant' ? 'swift' : 'study', false);
                                            }}
                                            className="flex-1 text-left hover:text-blue-600 transition-colors duration-200"
                                            style={{
                                              fontFamily: 'DM Sans, sans-serif',
                                              fontWeight: 400,
                                              fontSize: '14px',
                                              color: '#223258'
                                            }}
                                          >
                                            <span className="font-semibold mr-2" style={{ color: '#223258' }}>
                                              {questionIdx + 1}.
                                            </span>
                                            {question}
                                          </button>
                                          <button
                                            onClick={() => {
                                              // Send the question directly to backend as a follow-up
                                              handleSearchWithContent(question, true, activeMode === 'instant' ? 'swift' : 'study', false);
                                            }}
                                            className="w-8 h-8 flex items-center justify-center ml-3 hover:bg-gray-100 rounded-full transition-colors duration-200"
                                          >
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#223258' }}>
                                              <line x1="12" y1="5" x2="12" y2="19"></line>
                                              <line x1="5" y1="12" x2="19" y2="12"></line>
                                            </svg>
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {/* Show infographic option for long text answers - NOW BELOW FEEDBACK */}
                                {shouldShowInfographicOption(msg.content || '', idx, messages.length) && (
                                  <div className="mt-4 sm:mt-4">
                                    <button
                                      onClick={() => {
                                        const infographicRequest = `Create a visual abstract for this answer::::::${msg.content}`;
                                        // Send directly to backend without filling follow-up search bar
                                        handleSearchWithContent(infographicRequest, true, activeMode === 'instant' ? 'swift' : 'study', true);
                                      }}
                                      className="w-auto px-6 py-3 sm:px-8 sm:py-4 border rounded-lg transition-all duration-200 hover:bg-blue-50 hover:border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 drinfo-visual-abstract-step"
                                      style={{ 
                                        borderColor: 'rgba(55, 113, 254, 0.5)', 
                                        fontFamily: 'DM Sans, sans-serif', 
                                        fontWeight: 500, 
                                        fontSize: '16px', 
                                        color: '#223258', 
                                        backgroundColor: '#E4ECFF',
                                        borderRadius: '8px'
                                      }}
                                    >
                                      Create a visual abstract for this answer
                                    </button>
                                  </div>
                                )}
                                
                                {/* Show remaining limit warning - only for the latest question */}
                                {idx === messages.length - 1 && remainingLimit !== undefined && remainingLimit <= 5 && (
                                  <div className="mt-3 sm:mt-4 p-3">
                                    <p className="text-sm text-gray-600 font-['DM_Sans'] text-center">
                                      You only have <span className="font-semibold text-gray-700">{remainingLimit}</span> monthly question{remainingLimit === 1 ? '' : 's'} left!
                                    </p>
                                  </div>
                                )}
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
                <div className="sticky bottom-0 bg-gray-50 pt-2 pb-0 z-10 mt-0">
                  <div className="max-w-4xl mx-auto px-2 sm:px-4">
                    <div className="relative w-full bg-white rounded border-2 border-[#3771fe44] shadow-[0px_0px_11px_#0000000c] p-3 md:p-4 follow-up-question-search">
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
                          className={`w-full text-base md:text-[16px] font-normal font-['DM_Sans'] outline-none resize-none min-h-[24px] max-h-[200px] overflow-y-auto ${
                            isLoading || (status && status !== 'complete' && status !== 'complete_image') 
                              ? 'text-gray-400 cursor-not-allowed bg-gray-50' 
                              : 'text-[#223258]'
                          }`}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !isLoading && (status === 'complete' || status === 'complete_image')) {
                              handleFollowUpQuestion(e as any);
                            }
                          }}
                          rows={1}
                          style={{ height: '24px' }}
                          disabled={isLoading || (status !== null && status !== 'complete' && status !== 'complete_image')}
                        />
                      </div>
                      <div className="flex justify-end items-center mt-2">
                        {/* Toggle switch for Acute/Research mode - COMMENTED OUT */}
                        {/* <label className={`flex items-center gap-2 select-none ${
                          isLoading || (status && status !== 'complete' && status !== 'complete_image') 
                            ? 'cursor-not-allowed opacity-50' 
                            : 'cursor-pointer'
                        }`}>
                          <input
                            type="checkbox"
                            checked={activeMode === 'instant'}
                            onChange={() => setActiveMode(activeMode === 'instant' ? 'research' : 'instant')}
                            className="toggle-checkbox hidden"
                            disabled={isLoading || (status !== null && status !== 'complete' && status !== 'complete_image')}
                          />
                          <span className={`w-10 h-6 flex items-center rounded-full p-1 duration-300 ease-in-out ${
                            isLoading || (status && status !== 'complete' && status !== 'complete_image')
                              ? 'bg-gray-200'
                              : activeMode === 'instant' ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                                style={{ transition: 'background 0.3s' }}>
                            <span className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ease-in-out ${
                              isLoading || (status && status !== 'complete' && status !== 'complete_image')
                                ? ''
                                : activeMode === 'instant' ? 'translate-x-4' : ''
                            }`}></span>
                          </span>
                          <span className={`text-sm font-medium ${
                            isLoading || (status && status !== 'complete' && status !== 'complete_image')
                              ? 'text-gray-400'
                              : activeMode === 'instant' ? 'text-[#3771FE]' : 'text-gray-500'
                          }`}
                                style={{ fontSize: '16px', fontFamily: 'DM Sans, sans-serif' }}>
                            Acute
                          </span>
                        </label> */}
                        <button 
                          onClick={handleFollowUpQuestion} 
                          className="flex-shrink-0" 
                          disabled={isLoading || (status !== null && status !== 'complete' && status !== 'complete_image')}
                        >
                          {isLoading ? (
                            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <svg width="30" height="30" viewBox="0 0 46 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                              <rect width="46" height="46" rx="6.57143" fill="#3771FE"/>
                              <path d="M29.8594 16.5703L13.3594 33.0703" stroke="white" strokeWidth="2.25" strokeLinecap="round"/>
                              <path d="M20.4297 14.6406H31.6426V24.9263" stroke="white" strokeWidth="2.25" strokeLinecap="round"/>
                            </svg>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="w-full py-3 md:py-4 text-center text-xs text-gray-400 px-4">
                      <p>DR. INFO is an informational and educational tool.</p>
                      <p>Do not insert protected health information or personal data.</p>
                        <Link href="https://synduct.com/terms-and-conditions/" className="text-black hover:text-[#3771FE] underline inline-block" target="_blank" rel="noopener noreferrer">
                          Terms and Conditions
                        </Link>
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
      
      {/* Share Popup */}
      {showSharePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FCFDFF] rounded-lg shadow-xl max-w-xl w-full mx-4 border border-[#C8C8C8]">
            {/* Header */}
            <div className="flex items-center justify-between p-6">
              <h2 className="text-2xl font-medium text-blue-900">
                Shareable public link
              </h2>
              <button 
                onClick={() => setShowSharePopup(false)}
                className="text-[#263969] hover:text-gray-600 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Content */}
            <div className="px-6">
              {/* Link Creation Status */}
              <div className="mb-6">
                {isSharing ? (
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <span className="text-gray-500">Creating Link...</span>
                  </div>
                ) : (
                  <div className="mt-4 flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-[#C8D8FF]">
                    <input
                      type="text"
                      value={shareLink}
                      readOnly
                      className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
                    />
                    <button
                      onClick={copyToClipboard}
                      disabled={!shareLink}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-base rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCopied ? (
                        <>
                          <Check size={18} />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy size={18} />
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
            <div className="px-6">
              <div className="flex justify-center space-x-8">
                {/* LinkedIn */}
                <button 
                  onClick={shareOnLinkedIn}
                  disabled={!shareLink || isSharing}
                  className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-[#0077B5] flex items-center justify-center" style={{ borderRadius: '5px' }}>
                    <svg className="w-[70%] h-[70%] text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">LinkedIn</span>
                </button>

                {/* WhatsApp */}
                <button 
                  onClick={shareOnWhatsApp}
                  disabled={!shareLink || isSharing}
                  className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-[#25D366] flex items-center justify-center" style={{ borderRadius: '5px' }}>
                    <svg className="w-[70%] h-[70%] text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.570-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.890-5.335 11.893-11.893A11.821 11.821 0 0020.531 3.488"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-gray-700">WhatsApp</span>
                </button>

                {/* Mail */}
                <button 
                  onClick={shareViaEmail}
                  disabled={!shareLink || isSharing}
                  className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="w-10 h-10 bg-[#214498] flex items-center justify-center" style={{ borderRadius: '5px' }}>
                    <Mail className="w-[70%] h-[70%] text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Mail</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Feedback Reminder Modal */}
      {false && showFeedbackModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#FCFDFF] rounded-lg shadow-xl max-w-md w-full mx-4 transform transition-all border border-[#C8C8C8]">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 font-['DM_Sans']">
                  Feedback Reminder
                </h3>
                <button
                  onClick={handleModalClose}
                  className="text-[#223258] hover:text-gray-600 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-6">
                <p className="text-gray-700 font-['DM_Sans'] leading-relaxed mb-4">
                  This is a reminder to give your valuable feedback. Your input helps us improve our service and provide better answers to your questions.
                </p>
                
                {/* Demo buttons showing the feedback UI */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 font-['DM_Sans'] mb-3">
                    Look for these buttons below each answer to provide feedback:
                  </p>
                  <div className="flex flex-row items-center gap-2 sm:gap-3">
                    <div className="relative h-8 sm:h-10 w-24 sm:w-32 overflow-hidden bg-transparent p-[1px] rounded-lg">
                      <div className="absolute inset-0">
                        <MovingBorder duration={3000} rx="8px" ry="8px" delay={0}>
                          <div className="h-8 w-20 bg-[radial-gradient(#3771FE_40%,transparent_60%)] opacity-[0.8]" />
                        </MovingBorder>
                      </div>
                      <button
                        onClick={() => handleModalFeedbackClick('helpful')}
                        className={cn(
                          "relative flex h-full w-full items-center justify-center border border-[#C8C8C8] text-[#223258] bg-white rounded-lg transition-all hover:border-[#3771FE] hover:text-[#3771FE]"
                        )}
                      >
                        <ThumbsUp className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                        <span className="text-xs sm:text-sm">Useful...</span>
                      </button>
                    </div>

                    <div className="relative h-8 sm:h-10 w-24 sm:w-32 overflow-hidden bg-transparent p-[1px] rounded-lg">
                      <div className="absolute inset-0">
                        <MovingBorder duration={3000} rx="8px" ry="8px" delay={1500}>
                          <div className="h-8 w-20 bg-[radial-gradient(#3771FE_40%,transparent_60%)] opacity-[0.8]" />
                        </MovingBorder>
                      </div>
                      <button
                        onClick={() => handleModalFeedbackClick('not_helpful')}
                        className={cn(
                          "relative flex h-full w-full items-center justify-center border border-[#C8C8C8] text-[#223258] bg-white rounded-lg transition-all hover:border-[#3771FE] hover:text-[#3771FE]"
                        )}
                      >
                        <ThumbsDown className="inline w-3.5 h-3.5 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" />
                        <span className="text-xs sm:text-sm">Not Useful...</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleModalClose}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium font-['DM_Sans'] transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <DrugInformationModal
        open={showDrugModal}
        citation={selectedCitation}
        onClose={() => {
          setShowDrugModal(false);
          setSelectedCitation(null);
        }}
      />
      
      {/* Expanded Image Modal */}
      {expandedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          onClick={() => setExpandedImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh] overflow-auto bg-white rounded-lg">
            <button
              onClick={() => setExpandedImage(null)}
              className="absolute top-2 right-2 p-2 bg-white bg-opacity-90 hover:bg-opacity-100 rounded-full shadow-md transition-all duration-200 hover:scale-110 z-10"
              title="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            <div 
              className="svg-content w-full"
              dangerouslySetInnerHTML={{ __html: expandedImage.svgContent }}
            />
          </div>
        </div>
      )}

      {/* Share Popup */}
      {showSharePopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-[#FCFDFF] rounded-lg shadow-xl max-w-xl w-full mx-4 border border-[#C8C8C8]">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[#C8C8C8]">
              <h3 className="text-lg font-semibold text-[#223258] font-['DM_Sans']">Share Visual Abstract</h3>
              <button
                onClick={() => setShowSharePopup(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {isSharing ? (
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg border">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                  <span className="text-gray-500">Creating Shareable Link...</span>
                </div>
              ) : shareLink ? (
                <div className="mt-4 flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-[#C8D8FF]">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-gray-700 focus:outline-none"
                  />
                  <button
                    onClick={copyVisualAbstractLink}
                    disabled={!shareLink}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white text-base rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCopied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                        </svg>
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              ) : null}
            </div>

            {/* Share Options */}
            {shareLink && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 pt-0">
                {/* LinkedIn */}
                <button 
                  onClick={() => {
                    const message = `Check out this visual abstract from DR. INFO: ${shareLink}`;
                    const url = `https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(message)}`;
                    window.open(url, '_blank');
                  }}
                  className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-[#0077B5] flex items-center justify-center" style={{ borderRadius: '5px' }}>
                    <Linkedin className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-[#223258]">LinkedIn</span>
                </button>

                {/* WhatsApp */}
                <button 
                  onClick={() => {
                    const message = `Check out this visual abstract from DR. INFO: ${shareLink}`;
                    const url = `https://wa.me/?text=${encodeURIComponent(message)}`;
                    window.open(url, '_blank');
                  }}
                  className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-[#25D366] flex items-center justify-center" style={{ borderRadius: '5px' }}>
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a9.843 9.843 0 004.688 1.195h.004c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0012.05.001z"/>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-[#223258]">WhatsApp</span>
                </button>

                {/* Email */}
                <button 
                  onClick={() => {
                    const subject = 'Visual Abstract from DR. INFO';
                    const body = `Check out this visual abstract from DR. INFO: ${shareLink}`;
                    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.open(url);
                  }}
                  className="flex flex-col items-center space-y-2 p-4 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-[#214498] flex items-center justify-center" style={{ borderRadius: '5px' }}>
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-[#223258]">Email</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Print-only reference list at the bottom */}
      {activeCitations && Object.keys(activeCitations).length > 0 && (
        <div className="print-reference-list">
          <h3>References</h3>
          <ol>
            {Object.entries(activeCitations)
              .filter(([key, citation]) => {
                // Filter out implicit drug citations from print references
                if (citation.source_type === 'drug_database' && citation.drug_citation_type === 'implicit') {
                  return false;
                }
                return true;
              })
              .map(([key, citation], idx) => (
                <li key={key}>
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