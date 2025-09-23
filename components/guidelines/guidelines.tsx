"use client"

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, BookOpen, ChevronRight, Loader2, ChevronDown, Bookmark, Star, ArrowUpRight } from 'lucide-react'
import GuidelineSummaryModal from './guideline-summary-modal'
import GuidelineSummaryMobileModal from './guideline-summary-mobile-modal'
import { useAuth } from '@/hooks/use-auth'
import { getFirebaseFirestore } from '@/lib/firebase'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { logger } from '@/lib/logger'
import { track } from '@/lib/analytics'

interface Guideline {
  id: number;
  title: string;
  description: string;
  category: string;
  last_updated: string;
  url?: string;
  publisher?: string;
  language?: string;
  pdf_saved?: boolean;
  society?: string;
  link?: string;
}

interface Bookmark {
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

interface GuidelinesProps {
  initialGuidelines?: Guideline[];
}

export default function Guidelines({ initialGuidelines = [] }: GuidelinesProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [guidelines, setGuidelines] = useState<Guideline[]>(initialGuidelines || [])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedGuideline, setSelectedGuideline] = useState<Guideline | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['National']); // Default to National
  const [isMobile, setIsMobile] = useState(false)
  const [userCountry, setUserCountry] = useState<string>('')
  const [userSpecialties, setUserSpecialties] = useState<string[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [curatedGuidelines, setCuratedGuidelines] = useState<Guideline[]>([])
  const [bookmarkedGuidelines, setBookmarkedGuidelines] = useState<Bookmark[]>([])
  const [showBookmarks, setShowBookmarks] = useState(false)
  const [bookmarkingGuidelines, setBookmarkingGuidelines] = useState<Set<number>>(new Set())
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('')

  const { user } = useAuth()

  // Dynamic category order based on user's country
  const getCategoryOrder = () => {
    if (userCountry === 'united-states') {
      return ['USA', 'Europe', 'International']; // Hide National for US users
    }
    return ['National', 'Europe', 'International', 'USA'];
  };
  
  const categoryOrder = getCategoryOrder();

  // Group guidelines by category
  const groupedGuidelines = guidelines.reduce((acc, guideline) => {
    const category = guideline.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(guideline);
    return acc;
  }, {} as Record<string, Guideline[]>);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => 
      prev.includes(category) 
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Function to update URL parameters
  const updateUrlParams = useCallback((searchQuery: string, hasSearched: boolean) => {
    const params = new URLSearchParams(searchParams.toString())
    
    if (hasSearched && searchQuery.trim()) {
      params.set('q', searchQuery.trim())
    } else {
      params.delete('q')
    }
    
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname
    router.replace(newUrl, { scroll: false })
  }, [router, searchParams])

  // Function to get search results
  const getSearchResults = useCallback(async (query: string, country: string, specialties: string[], otherSpecialty: string): Promise<Guideline[]> => {
    try {
      const response = await fetch('/api/guidelines/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          country: country || 'None',
          specialties: specialties,
          otherSpecialty: otherSpecialty
        })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || `Search failed with status: ${response.status}`)
      }
      
      const data = await response.json()
      return Array.isArray(data) ? data : []
    } catch (error) {
      logger.error('Error in getSearchResults:', error)
      throw error
    }
  }, [])

  const loadUserBookmarks = async () => {
    if (!user?.uid) return;
    
    try {
      const db = getFirebaseFirestore();
      const userId = user.uid;
      const userDoc = await getDoc(doc(db, "users", userId));
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const bookmarks = userData.bookmarks || [];
        setBookmarkedGuidelines(bookmarks);
      }
    } catch (error) {
      logger.error('Error loading user bookmarks:', error);
    }
  }

  // Handle URL parameters on component mount
  useEffect(() => {
    const urlQuery = searchParams.get('q')
    const guidelineId = searchParams.get('guideline')
    const guidelineTitle = searchParams.get('title')
    
    if (urlQuery) {
      setSearchTerm(urlQuery)
      setHasSearched(true)
      setLastSearchQuery(urlQuery)
    }
    
    // Handle guideline modal from URL
    if (guidelineId && guidelineTitle) {
      const decodedTitle = decodeURIComponent(guidelineTitle)
      const guideline: Guideline = {
        id: parseInt(guidelineId),
        title: decodedTitle,
        description: '',
        category: '',
        last_updated: new Date().toISOString(),
        url: '',
        society: '',
        link: ''
      }
      setSelectedGuideline(guideline)
      setIsModalOpen(true)
    }
  }, [searchParams])

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (user) {
        // console.log('User authenticated:', user.uid);
        try {
          const db = getFirebaseFirestore();
          const userId = user.uid;
          const userDoc = await getDoc(doc(db, "users", userId));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            const country = userData?.profile?.country;
            const specialties = userData?.profile?.specialties || [];
            const otherSpecialty = userData?.profile?.otherSpecialty || '';
            
            if (country) {
              setUserCountry(country);
              // Update expanded categories based on detected country
              if (country === 'united-states') {
                setExpandedCategories(['USA']);
              } else {
                setExpandedCategories(['National']);
              }
            }
            if (specialties && Array.isArray(specialties)) {
              setUserSpecialties(specialties);
            }
            
            // Load user bookmarks
            await loadUserBookmarks();
            
            // Check if there's a URL search parameter and perform search
            const urlQuery = searchParams.get('q')
            if (urlQuery) {
              await performSearch(urlQuery, country, specialties, otherSpecialty)
            } else {
              // Automatically fetch guidelines based on user's country and specialties
              if (country || specialties.length > 0 || otherSpecialty) {
                await fetchInitialGuidelines(country, specialties, otherSpecialty);
              }
            }
          }
        } catch (error) {
          logger.error("Error fetching user profile:", error);
        }
      } else {
        // console.log('No user authenticated');
        // Handle URL search even when not authenticated
        const urlQuery = searchParams.get('q')
        if (urlQuery) {
          performSearch(urlQuery, '', [], '')
        }
      }
    };

    fetchUserProfile();
  }, [user]); // Removed searchParams dependency to prevent re-running on modal close

  // Unified search function
  const performSearch = useCallback(async (query: string, country: string, specialties: string[], otherSpecialty: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const results = await getSearchResults(query, country, specialties, otherSpecialty);
      setGuidelines(results);
      setRetryCount(0);
    } catch (err: any) {
      logger.error('Error performing search:', err);
      setError(err.message || 'Search failed. Please try again.');
      setGuidelines([]);
    } finally {
      setIsLoading(false);
    }
  }, [getSearchResults]);

  // Separate effect to handle search parameter changes without re-fetching user profile
  useEffect(() => {
    const handleSearchFromUrl = async () => {
      const urlQuery = searchParams.get('q')
      const guidelineId = searchParams.get('guideline')
      const guidelineTitle = searchParams.get('title')
      
      // Only perform search if:
      // 1. There's a query
      // 2. No modal parameters (to avoid re-searching when closing modal)
      // 3. The query is different from the last search (to avoid duplicate searches)
      // 4. User country is loaded
      if (urlQuery && !guidelineId && !guidelineTitle && userCountry && urlQuery !== lastSearchQuery) {
        // Get the current user's otherSpecialty from the profile
        let otherSpecialty = '';
        if (user) {
          try {
            const db = getFirebaseFirestore();
            const userId = user.uid;
            const userDoc = await getDoc(doc(db, "users", userId));
            if (userDoc.exists()) {
              otherSpecialty = userDoc.data()?.profile?.otherSpecialty || '';
            }
          } catch (error) {
            // Ignore error, continue without otherSpecialty
          }
        }
        
        setLastSearchQuery(urlQuery)
        await performSearch(urlQuery, userCountry, userSpecialties, otherSpecialty)
      }
    };

    handleSearchFromUrl();
  }, [searchParams, userCountry, userSpecialties, user, performSearch, lastSearchQuery]); // Only when search params change

  useEffect(() => {
    track.pageViewed('GuidelinesPage', user ? 'authenticated' : 'unauthenticated', userCountry);
  }, [user, userCountry]);

  const fetchInitialGuidelines = async (country: string, specialties: string[], otherSpecialty: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Create a search query based on country and specialties
      let query = '';
      if (country && country !== 'united-states') {
        query += `${country} `;
      }
      if (specialties.length > 0) {
        query += specialties.join(' ');
      }
      if (otherSpecialty) {
        query += ` ${otherSpecialty}`;
      }
      
      // If no specific query, use a general term
      if (!query.trim()) {
        query = 'clinical guidelines';
      }
      
      const results = await getSearchResults(query, country, specialties, otherSpecialty);
      
      // Curate the results to show all guidelines
      const curated = curateGuidelines(results);
      setCuratedGuidelines(curated);
    } catch (err: any) {
      logger.error('Error fetching initial guidelines:', err);
      setError(err.message || 'Failed to fetch initial guidelines. Please try searching manually.');
      setCuratedGuidelines([]);
    } finally {
      setIsLoading(false);
    }
  };

  const curateGuidelines = (guidelines: Guideline[]): Guideline[] => {
    // Filter out incomplete guidelines first - only require essential fields
    const validGuidelines = guidelines.filter(guideline => 
      guideline.id && 
      guideline.title
      // Removed strict filtering for description, category, last_updated
    );
    
    if (validGuidelines.length === 0) return [];
    
    // Consider all categories, not just National
    // Group guidelines by category to ensure diversity
    const guidelinesByCategory = validGuidelines.reduce((acc, guideline) => {
      const category = guideline.category || 'Other';
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(guideline);
      return acc;
    }, {} as Record<string, Guideline[]>);
    
    // Create a curated list with guidelines from different categories
    const curated: Guideline[] = [];
    
    // Include all guidelines from all categories
    Object.keys(guidelinesByCategory).forEach(category => {
      guidelinesByCategory[category].forEach(guideline => {
        curated.push(guideline);
      });
    });
    
    return curated;
  };

  const handlePopularSearch = async (term: string) => {
    setSearchTerm(term)
    setHasSearched(true)
    setShowBookmarks(false)
    setLastSearchQuery(term)
    
    // Get the current user's otherSpecialty from the profile
    let otherSpecialty = '';
    if (user) {
      try {
        const db = getFirebaseFirestore();
        const userId = user.uid;
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          otherSpecialty = userDoc.data()?.profile?.otherSpecialty || '';
        }
      } catch (error) {
        // Ignore error, continue without otherSpecialty
      }
    }
    
    // Update URL parameters
    updateUrlParams(term, true)
    
    // Perform search
    await performSearch(term, userCountry, userSpecialties, otherSpecialty)
  }

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setGuidelines(initialGuidelines || [])
      setHasSearched(false)
      setShowBookmarks(false)
      setLastSearchQuery('')
      updateUrlParams('', false)
      return
    }
    
    setHasSearched(true)
    setShowBookmarks(false)
    setLastSearchQuery(searchTerm)
    
    // Get the current user's otherSpecialty from the profile
    let otherSpecialty = '';
    if (user) {
      try {
        const db = getFirebaseFirestore();
        const userId = user.uid;
        const userDoc = await getDoc(doc(db, "users", userId));
        if (userDoc.exists()) {
          otherSpecialty = userDoc.data()?.profile?.otherSpecialty || '';
        }
      } catch (error) {
        // Ignore error, continue without otherSpecialty
      }
    }
    
    // Update URL parameters
    updateUrlParams(searchTerm, true)
    
    // Perform search
    await performSearch(searchTerm, userCountry, userSpecialties, otherSpecialty)
  }

  const handleRetry = () => {
    setRetryCount(prev => prev + 1)
    handleSearch()
  }

  const clearSearch = () => {
    setSearchTerm('')
    setHasSearched(false)
    setGuidelines([])
    setError(null)
    setShowBookmarks(false)
    setLastSearchQuery('')
    updateUrlParams('', false)
  }

  const handleGuidelineClick = (guideline: Guideline) => {
    setSelectedGuideline(guideline)
    setIsModalOpen(true)
    
    // Update URL to include guideline modal
    const currentParams = new URLSearchParams(searchParams.toString())
    currentParams.set('guideline', guideline.id.toString())
    currentParams.set('title', encodeURIComponent(guideline.title))
    
    const newUrl = `?${currentParams.toString()}`
    router.push(newUrl, { scroll: false })
  }

  const handleModalClose = () => {
    setIsModalOpen(false)
    setSelectedGuideline(null)
    
    // Remove guideline parameters from URL when closing modal
    const currentParams = new URLSearchParams(searchParams.toString())
    currentParams.delete('guideline')
    currentParams.delete('title')
    
    const newUrl = currentParams.toString() ? `?${currentParams.toString()}` : window.location.pathname
    router.replace(newUrl, { scroll: false })
  }

  const toggleBookmark = async (guideline: Guideline) => {
    if (bookmarkingGuidelines.has(guideline.id)) {
      // console.log('Bookmark operation already in progress for guideline:', guideline.id);
      return; // Prevent multiple simultaneous operations
    }
    
    if (!user?.uid) {
      // console.log('User not authenticated');
      return;
    }
    
    try {
      // console.log('Starting bookmark operation for guideline:', guideline.id);
      setBookmarkingGuidelines(prev => new Set([...prev, guideline.id]));
      
      if (isBookmarked(guideline)) {
        // console.log('Removing bookmark');
        // Remove from bookmarks
        await removeBookmark(guideline);
      } else {
        // console.log('Adding bookmark');
        // Add to bookmarks and library
        await saveBookmark(guideline);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
      logger.error('Error toggling bookmark:', error);
      // You could add a toast notification here for user feedback
    } finally {
      // console.log('Bookmark operation completed, resetting state');
      setBookmarkingGuidelines(prev => new Set([...prev].filter(id => id !== guideline.id)));
    }
  }

  const saveBookmark = async (guideline: Guideline) => {
    try {
      // Validate required fields
      if (!guideline.id || !guideline.title) {
        throw new Error("Invalid guideline data: missing required fields");
      }
      
      // Step 1: Save to user's bookmarks
      const db = getFirebaseFirestore();
      const userId = user?.uid; // Use optional chaining
      if (!userId) {
        throw new Error("User not logged in.");
      }
      const userRef = doc(db, "users", userId);
      
      // Create bookmark data with proper defaults and no undefined values
      const bookmarkData: Bookmark = {
        guidelineId: guideline.id,
        guidelineTitle: guideline.title || 'Untitled Guideline',
        category: guideline.category || 'Other',
        url: guideline.url || '',
        society: guideline.society || '',
        lastUpdated: guideline.last_updated || new Date().toISOString(),
        savedAt: new Date().toISOString(),
        lastAccessed: new Date().toISOString(),
        notes: "",
        pdf_saved: guideline.pdf_saved || false,
        link: guideline.link || ''
      };
      
      // Filter out any remaining undefined values to prevent Firebase errors
      const cleanBookmarkData = Object.fromEntries(
        Object.entries(bookmarkData).filter(([_, value]) => value !== undefined)
      ) as Bookmark;
      
      // console.log('Saving bookmark data:', cleanBookmarkData);
      
      await updateDoc(userRef, {
        bookmarks: arrayUnion(cleanBookmarkData)
      });
      
      // Step 2: Save to library (if not already there)
      if (!guideline.pdf_saved) {
        const librarySaved = await saveToLibrary(guideline);
        if (librarySaved) {
          // Update the bookmark with new pdf_saved status
          cleanBookmarkData.pdf_saved = true;
          
          // Remove the old bookmark and add the updated one
          const userDoc = await getDoc(userRef);
          const currentBookmarks = userDoc.data()?.bookmarks || [];
          const updatedBookmarks = currentBookmarks.filter(
            (bookmark: Bookmark) => bookmark.guidelineId !== guideline.id
          );
          
          await updateDoc(userRef, {
            bookmarks: [...updatedBookmarks, cleanBookmarkData]
          });
        }
      }
      
      // Update local state
      setBookmarkedGuidelines(prev => [...prev, cleanBookmarkData]);
      
    } catch (error) {
      logger.error('Error saving bookmark:', error);
      throw error;
    }
  }

  const removeBookmark = async (guideline: Guideline) => {
    try {
      const db = getFirebaseFirestore();
      const userId = user?.uid; // Use optional chaining
      if (!userId) {
        throw new Error("User not logged in.");
      }
      const userRef = doc(db, "users", userId);
      
      // Get current bookmarks
      const userDoc = await getDoc(userRef);
      const currentBookmarks = userDoc.data()?.bookmarks || [];
      
      // Remove the specific bookmark
      const updatedBookmarks = currentBookmarks.filter(
        (bookmark: Bookmark) => bookmark.guidelineId !== guideline.id
      );
      
      // Update the document
      await updateDoc(userRef, {
        bookmarks: updatedBookmarks
      });
      
      // Update local state
      setBookmarkedGuidelines(updatedBookmarks);
      
    } catch (error) {
      logger.error('Error removing bookmark:', error);
      throw error;
    }
  }

  const saveToLibrary = async (guideline: Guideline): Promise<boolean> => {
    try {
      // Call your library API to save the guideline
      const response = await fetch('/api/library/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          guidelineId: guideline.id,
          title: guideline.title,
          category: guideline.category,
          url: guideline.url,
          society: guideline.society,
          lastUpdated: guideline.last_updated,
          link: guideline.link
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.pdf_saved || false;
      }
      
      return false;
    } catch (error) {
      logger.error('Error saving to library:', error);
      return false;
    }
  }

  const isBookmarked = (guideline: Guideline) => {
    return bookmarkedGuidelines.some(bg => bg.guidelineId === guideline.id);
  }

  useEffect(() => {
    // Use dynamic category order based on user's country
    const priorityOrder = getCategoryOrder();
    
    // Find the first category that has guidelines
    const firstCategoryWithGuidelines = priorityOrder.find(category => 
      guidelines.some(g => g.category === category)
    );

    if (firstCategoryWithGuidelines) {
      setExpandedCategories(prev => {
        // If the category is already expanded, return current state
        if (prev.includes(firstCategoryWithGuidelines)) {
          return prev;
        }
        // Otherwise, add the first category with guidelines
        return [...prev, firstCategoryWithGuidelines];
      });
    }
  }, [guidelines, userCountry]);

  useEffect(() => {
    if (selectedGuideline) {
      logger.debug('Selected guideline:', selectedGuideline);
    }
  }, [selectedGuideline]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768); // 768px is the md breakpoint in Tailwind
    };

    // Initial check
    checkMobile();
    // Add event listener for window resize
    window.addEventListener('resize', checkMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div className="container mx-auto px-6 sm:px-2 lg:px-0 py-4 sm:py-6 lg:py-8 mt-0 sm:mt-16 max-w-full sm:max-w-2xl md:max-w-4xl">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 sm:mb-8 text-center">
          <h1
            className="mb-2 px-2 hidden sm:block"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 600,
              fontSize: 'clamp(24px, 5vw, 36px)',
              color: '#214498',
              lineHeight: 1.1
            }}
          >
            Guidelines
          </h1>
          <p
            className="px-4 hidden sm:block"
            style={{
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              fontSize: 'clamp(14px, 2.5vw, 16px)',
              color: '#596C99',
              lineHeight: 1.4
            }}
          >
            Direct access to National, European, US and International Guidelines
          </p>
        </div>
        
        <div className="relative mb-6 sm:mb-8">
          <div className="relative w-full">
            <input
              type="text"
              placeholder="Search Clinical Guidelines . . ."
              className="w-full py-2 sm:py-3 px-4 sm:px-6 border text-gray-600 text-base sm:text-lg font-medium focus:outline-none focus:ring-2 focus:ring-blue-200"
              style={{ borderColor: 'rgba(55, 113, 254, 0.5)', fontSize: 'clamp(14px, 1.5vw, 16px)' }}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSearch()
                }
              }}
            />
            <div className="absolute right-1.5 sm:right-2 md:right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
              {searchTerm && (
                <button 
                  onClick={clearSearch}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  ✕
                </button>
              )}
              <button 
                onClick={handleSearch}
                disabled={isLoading}
                className="bg-blue-500 p-1.5 sm:p-2 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 sm:h-6 sm:w-6 animate-spin" />
                ) : (
                  <ArrowUpRight size={20} className="sm:w-6 sm:h-6" />
                )}
              </button>
            </div>
          </div>
          
          {/* Bookmark Button - Below search bar */}
          {!hasSearched && (
            <div className="flex justify-center mt-3">
              <button 
                onClick={() => setShowBookmarks(!showBookmarks)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                  showBookmarks 
                    ? 'bg-[#01257C] text-white border border-[#01257C]' 
                    : 'bg-[#01257C] text-white hover:bg-[#011a5c] border border-[#01257C]'
                }`}
                title={showBookmarks ? 'Hide your saved guidelines' : 'Show your saved guidelines'}
                style={{
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500,
                  fontSize: 'clamp(12px, 1.5vw, 14px)'
                }}
              >
                <Bookmark 
                  size={14} 
                  className="w-3.5 h-3.5" 
                  fill={showBookmarks ? 'currentColor' : 'none'}
                />
                <span>
                  {showBookmarks ? 'Hide Bookmarks' : 'Show Bookmarks'}
                </span>
              </button>
            </div>
          )}
        </div>

        {/* Popular Searches */}
        {!hasSearched && (
          <div className="mb-6 sm:mb-8">
            <h3 className="text-sm sm:text-base font-medium text-[#223258] mb-3 px-2 text-center" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              Popular Searches
            </h3>
            <div className="flex flex-wrap gap-2 px-2 justify-center">
              {['hypertension', 'arthritis', 'obesity', 'pneumonia', 'diabetes', 'asthma', 'cancer'].map((term) => (
                <button
                  key={term}
                  onClick={() => handlePopularSearch(term)}
                  className="px-3 py-1.5 text-xs sm:text-sm bg-[#F4F7FF] border border-[#B5C9FC] text-[#223258] rounded-[6px] hover:bg-[#E8F0FF] hover:border-[#3771FE] transition-colors"
                  style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}
                >
                  {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Bookmarks Section */}
        {!hasSearched && showBookmarks && (
          <div className="mb-4 sm:mb-6 p-3 sm:p-4" style={{ background: '#EEF3FF' }}>
            <div className="border px-0 pb-2 sm:pb-4 pt-1 sm:pt-2" style={{ borderColor: '#A2BDFF', borderWidth: 1, borderStyle: 'solid', background: '#fff' }}>
              <div className="px-3 sm:px-6 py-2 sm:py-4">
                <h2 
                  className="text-base sm:text-lg lg:text-xl text-gray-900 mb-4"
                  style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: '#263969' }}
                >
                  Your Saved Guidelines ({bookmarkedGuidelines.length})
                </h2>
                
                {bookmarkedGuidelines.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {bookmarkedGuidelines.map((guideline, index) => (
                      <div key={`bookmark-${guideline.guidelineId || 'guideline'}-${index}-${guideline.guidelineTitle?.slice(0, 10)}`}>
                        <div className="p-3 sm:p-4 shadow-sm border" style={{ background: '#fff', borderColor: '#A2BDFF' }}>
                          <div className="space-y-2 sm:space-y-3">
                            {/* Title as a link */}
                            <a 
                              href={guideline.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block"
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
                            
                            {/* Remove Bookmark and Dive In buttons */}
                            <div className="flex flex-row items-center gap-3">
                              <button 
                                onClick={() => toggleBookmark({
                                  id: guideline.guidelineId,
                                  title: guideline.guidelineTitle,
                                  description: '',
                                  category: guideline.category,
                                  last_updated: guideline.lastUpdated,
                                  url: guideline.url,
                                  society: guideline.society,
                                  link: guideline.link,
                                  pdf_saved: guideline.pdf_saved
                                } as Guideline)}
                                disabled={bookmarkingGuidelines.has(guideline.guidelineId)}
                                className={`flex items-center gap-1 text-blue-500 hover:text-blue-600 transition-colors ${bookmarkingGuidelines.has(guideline.guidelineId) ? 'opacity-50 cursor-not-allowed' : ''}`} 
                                style={{ fontSize: 'clamp(12px, 1.5vw, 14px)' }}
                              >
                                {bookmarkingGuidelines.has(guideline.guidelineId) ? (
                                  <Loader2 size={16} className="sm:w-5 sm:h-5 animate-spin" />
                                ) : (
                                  <Bookmark size={16} className="sm:w-5 sm:h-5" fill="currentColor" />
                                )}
                                <span>{bookmarkingGuidelines.has(guideline.guidelineId) ? 'Removing...' : 'Remove'}</span>
                              </button>
                              
                              <div className="flex-grow"></div>
                              
                              {/* Dive In button */}
                              <button 
                                onClick={() => handleGuidelineClick({
                                  id: guideline.guidelineId,
                                  title: guideline.guidelineTitle,
                                  description: '',
                                  category: guideline.category,
                                  last_updated: guideline.lastUpdated,
                                  url: guideline.url,
                                  society: guideline.society,
                                  link: guideline.link,
                                  pdf_saved: guideline.pdf_saved
                                } as Guideline)}
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
                ) : (
                  <div className="text-center py-8 sm:py-12">
                    <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                    <p 
                      className="text-sm sm:text-base text-gray-600"
                      style={{ fontFamily: 'DM Sans, sans-serif' }}
                    >
                      No bookmarks found
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Guidelines for Your Specialty Heading */}
        {!hasSearched && (
          <div className="mb-4 sm:mb-6 text-center">
            <h2 
              className="text-lg sm:text-xl lg:text-2xl text-gray-900"
              style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: '#263969' }}
            >
              Guidelines for Your Specialty
            </h2>
          </div>
        )}
        
        {error && (
          <div
            className="px-3 sm:px-4 py-2 sm:py-3 mb-4 sm:mb-6"
            style={{
              background: '#EEF3FF',
              border: '1px solid #A2BDFF',
              color: '#214498',
              fontFamily: 'DM Sans, sans-serif'
            }}
          >
            <div className="flex flex-col items-center justify-center gap-2">
              <div className="w-full">
                {/* <p className="font-medium" style={{ color: '#214498' }}>Notice</p> */}
                <p className="text-sm sm:text-base text-center" style={{ color: '#214498' }}>
                  {error === "Failed to connect to guidelines API service"
                    ? "Our servers are experiencing high demand. Please try again in a moment."
                    : error}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-3 sm:space-y-4 p-3 sm:p-4" style={{ background: '#EEF3FF' }}>
          {!hasSearched && (
            // Show curated guidelines when no search is performed
            <>
              {isLoading ? (
                // Show loading state for curated guidelines
                <div className="border px-0 pb-2 sm:pb-4 pt-1 sm:pt-2" style={{ borderColor: '#A2BDFF', borderWidth: 1, borderStyle: 'solid', background: '#fff' }}>
                  <div className="px-3 sm:px-6 py-2 sm:py-4">
                    <div className="flex justify-center py-6 sm:py-8">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Show actual guidelines when loaded
                <>
                  {categoryOrder
                    .map(category => {
                      // Filter curated guidelines by category and check if any exist
                      const categoryGuidelines = curatedGuidelines.filter(guideline => 
                        guideline.category === category &&
                        guideline.id && 
                        guideline.title
                      );
                      
                      // Only show buckets that have guidelines
                      if (categoryGuidelines.length === 0) {
                        return null;
                      }
                      
                      return (
                        <div key={category} className="border px-0 pb-2 sm:pb-4 pt-1 sm:pt-2" style={{ borderColor: '#A2BDFF', borderWidth: 1, borderStyle: 'solid', background: '#fff' }}>
                          <button
                            onClick={() => toggleCategory(category)}
                            className="w-full px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between text-left"
                            style={{
                              background: '#fff'
                            }}
                          >
                            <h2 
                              className="text-base sm:text-lg lg:text-xl text-gray-900"
                              style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: '#263969' }}
                            >
                              {category === 'Europe' ? 'European' : category} Guidelines
                            </h2>
                            <ChevronDown 
                              className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transition-transform ${
                                expandedCategories.includes(category) ? 'transform rotate-180' : ''
                              }`}
                            />
                          </button>
                          
                          {expandedCategories.includes(category) && (
                            <div className="p-2 sm:p-4 space-y-2 sm:space-y-4">
                              <div className="space-y-3 sm:space-y-4">
                                {categoryGuidelines.map((guideline, index) => (
                                  <div key={`${guideline.id || 'guideline'}-${index}-${guideline.title?.slice(0, 10)}`}>
                                    <div className="p-3 sm:p-4 shadow-sm border" style={{ background: '#fff', borderColor: '#A2BDFF' }}>
                                      <div className="space-y-2 sm:space-y-3">
                                        {/* Title as a link */}
                                        <a 
                                          href={guideline.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          className="block"
                                          style={{
                                            fontFamily: 'DM Sans, sans-serif',
                                            color: '#214498',
                                            fontWeight: 500,
                                            fontSize: 'clamp(14px, 1.5vw, 16px)',
                                            background: 'none',
                                            border: 'none',
                                          }}
                                        >
                                          {guideline.title}
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
                                            {new Date(guideline.last_updated).getFullYear()}
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
                                        
                                        {/* Save and Dive In buttons */}
                                        <div className="flex flex-row items-center gap-3">
                                          <button 
                                            onClick={() => toggleBookmark(guideline)}
                                            disabled={bookmarkingGuidelines.has(guideline.id)}
                                            className={`flex items-center gap-1 transition-colors ${
                                              isBookmarked(guideline) 
                                                ? 'text-blue-500 hover:text-blue-600' 
                                                : 'text-slate-500 hover:text-blue-500'
                                            } ${(bookmarkingGuidelines.has(guideline.id)) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`} 
                                            style={{ fontSize: 'clamp(12px, 1.5vw, 14px)' }}
                                            title={!user?.uid ? 'Please log in to save guidelines' : bookmarkingGuidelines.has(guideline.id) ? 'Processing...' : ''}
                                          >
                                            <Bookmark 
                                              size={16} 
                                              className="sm:w-5 sm:h-5" 
                                              fill={isBookmarked(guideline) ? 'currentColor' : 'none'}
                                            />
                                            <span>{isBookmarked(guideline) ? 'Saved' : 'Save'}</span>
                                          </button>
                                          
                                          <div className="flex-grow"></div>
                                          
                                          {/* Dive In button */}
                                          <button 
                                            onClick={() => handleGuidelineClick(guideline)}
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
                                            Guideline AI Summary
                                            <span className="flex items-center ml-1 sm:ml-2">
                                              <ChevronRight size={14} className="sm:w-4 sm:h-4" style={{marginLeft: -10}} color="#fff" />
                                              <ChevronRight size={14} className="sm:w-4 sm:h-4" style={{marginLeft: -10}} color="#fff" />
                                            </span>
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </>
              )}
            </>
          )}
          
          {hasSearched && (
            // Show categorized search results when user searches
            <>
              {categoryOrder
                .map(category => (
                  <div key={category} className="border px-0 pb-2 sm:pb-4 pt-1 sm:pt-2" style={{ borderColor: '#A2BDFF', borderWidth: 1, borderStyle: 'solid', background: '#fff' }}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full px-3 sm:px-6 py-2 sm:py-4 flex items-center justify-between text-left"
                      style={{
                        background: '#fff'
                      }}
                    >
                      <h2 
                        className="text-base sm:text-lg lg:text-xl text-gray-900"
                        style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: '#263969' }}
                      >
                        {category === 'Europe' ? 'European' : category} Guidelines
                      </h2>
                      <ChevronDown 
                        className={`h-4 w-4 sm:h-5 sm:w-5 text-gray-500 transition-transform ${
                          expandedCategories.includes(category) ? 'transform rotate-180' : ''
                        }`}
                      />
                    </button>
                    
                    {expandedCategories.includes(category) && (
                      <div className="p-2 sm:p-4 space-y-2 sm:space-y-4">
                        {isLoading ? (
                          // Show loading state for each category when searching
                          <div className="flex justify-center py-6 sm:py-8">
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                              <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                              <div className="w-2 h-2 bg-[#223258]/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                          </div>
                        ) : (groupedGuidelines[category]?.filter(guideline => 
                            guideline.id && 
                            guideline.title && 
                            guideline.description && 
                            guideline.category && 
                            guideline.last_updated
                          ).length ?? 0) > 0 ? (
                            groupedGuidelines[category]
                              .filter(guideline => 
                                guideline.id && 
                                guideline.title && 
                                guideline.description && 
                                guideline.category && 
                                guideline.last_updated
                              )
                              .map((guideline, index) => (
                          <div key={`${guideline.id || 'guideline'}-${index}-${guideline.title?.slice(0, 10)}`}>
                              <div className="p-3 sm:p-4 shadow-sm border" style={{ background: '#fff', borderColor: '#A2BDFF' }}>
                              <div className="space-y-2 sm:space-y-3">
                                {/* Title as a link */}
                                <a 
                                  href={guideline.url} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                    className="block"
                                    style={{
                                      fontFamily: 'DM Sans, sans-serif',
                                      color: '#214498',
                                      fontWeight: 500,
                                      fontSize: 'clamp(14px, 1.5vw, 16px)',
                                      background: 'none',
                                      border: 'none',
                                    }}
                                >
                                    {guideline.title}
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
                                      {new Date(guideline.last_updated).getFullYear()}
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
                                  
                                  {/* Save and Dive In buttons */}
                                  <div className="flex flex-row items-center gap-3">
                                    <button 
                                      onClick={() => toggleBookmark(guideline)}
                                      disabled={bookmarkingGuidelines.has(guideline.id)}
                                      className={`flex items-center gap-1 transition-colors ${
                                        isBookmarked(guideline) 
                                          ? 'text-blue-500 hover:text-blue-600' 
                                          : 'text-slate-500 hover:text-blue-500'
                                      } ${(bookmarkingGuidelines.has(guideline.id)) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'}`} 
                                      style={{ fontSize: 'clamp(12px, 1.5vw, 14px)' }}
                                      title={!user?.uid ? 'Please log in to save guidelines' : bookmarkingGuidelines.has(guideline.id) ? 'Processing...' : ''}
                                    >
                                      <Bookmark 
                                        size={16} 
                                        className="sm:w-5 sm:h-5" 
                                        fill={isBookmarked(guideline) ? 'currentColor' : 'none'}
                                      />
                                      <span>{isBookmarked(guideline) ? 'Saved' : 'Save'}</span>
                                    </button>
                                    
                                    <div className="flex-grow"></div>
                                    
                                    {/* Dive In button */}
                                    <button 
                                      onClick={() => handleGuidelineClick(guideline)}
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
                                        Guideline AI Summary
                                        <span className="flex items-center ml-1 sm:ml-2">
                                          <ChevronRight size={14} className="sm:w-4 sm:h-4" style={{marginLeft: -10}} color="#fff" />
                                          <ChevronRight size={14} className="sm:w-4 sm:h-4" style={{marginLeft: -10}} color="#fff" />
                                        </span>
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))
                            ) : (
                              <div className="text-center py-8 sm:py-12">
                                <BookOpen className="h-8 w-8 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
                                <p 
                                  className="text-sm sm:text-base text-gray-600"
                                  style={{ fontFamily: 'DM Sans, sans-serif' }}
                                >
                                  {`No ${category === 'Europe' ? 'European' : category} guidelines found, Try a different search term.`}
                                </p>
                              </div>
                            )}
                      </div>
                    )}
                  </div>
                ))}
            </>
          )}
          
        </div>
      </div>

      {isModalOpen && selectedGuideline && (
        isMobile ? (
          <GuidelineSummaryMobileModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            guidelineId={selectedGuideline.id}
            guidelineTitle={selectedGuideline.title}
            year={new Date(selectedGuideline.last_updated).getFullYear().toString()}
            link={selectedGuideline.link}
            url={selectedGuideline.url}
          />
        ) : (
          <GuidelineSummaryModal
            isOpen={isModalOpen}
            onClose={handleModalClose}
            guidelineId={selectedGuideline.id}
            guidelineTitle={selectedGuideline.title}
            year={new Date(selectedGuideline.last_updated).getFullYear().toString()}
            link={selectedGuideline.link}
            url={selectedGuideline.url}
          />
        )
      )}
    </div>
  )
}