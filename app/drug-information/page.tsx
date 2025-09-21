"use client"

import { useState, useEffect, useRef } from 'react';
import { Search, ArrowUpRight, ArrowLeftRight, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import Image from 'next/image';
import { getCachedAuthStatus, UserAuthStatus } from '@/lib/background-auth';
import { logger } from '@/lib/logger';
import { SparkleIcon } from '@/components/ui/sparkle-icon';


interface Drug {
  brand_name: string;
  inn: string[];
  active_substance: string[];
  first_letter: string;
  pdf_url: string;
  search_type: string;
}

export default function DrugInformationPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [recommendations, setRecommendations] = useState<Drug[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(false);
  // Removed isAIMode state - now showing both EMA and AI suggestions
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedLetter, setSelectedLetter] = useState('A');
  
  const alphabetBarRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollAmount = 5 * 28;

  const updateScrollButtons = () => {
    if (alphabetBarRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = alphabetBarRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 1);
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const handleResize = () => updateScrollButtons();
    window.addEventListener('resize', handleResize);
    if (alphabetBarRef.current) {
      alphabetBarRef.current.addEventListener('scroll', updateScrollButtons);
    }
    return () => {
      window.removeEventListener('resize', handleResize);
      if (alphabetBarRef.current) {
        alphabetBarRef.current.removeEventListener('scroll', updateScrollButtons);
      }
    };
  }, []);

  const scrollAlphabetBar = (direction: 'left' | 'right') => {
    if (alphabetBarRef.current) {
      const { scrollLeft } = alphabetBarRef.current;
      alphabetBarRef.current.scrollTo({
        left: direction === 'left' ? scrollLeft - scrollAmount : scrollLeft + scrollAmount,
        behavior: 'smooth',
      });
    }
  };
  
  // Fetch drugs when selected letter changes
  useEffect(() => {
    const fetchDrugs = async () => {
      setIsLoading(true);
      try {
        // Get authentication status in background with fallback
        const authStatus = await getCachedAuthStatus();
        logger.debug('Using database:', authStatus.database, 'for country:', authStatus.country);
        
        const { getDrugLibrary } = await import('@/lib/authenticated-api');
        const data = await getDrugLibrary(selectedLetter, undefined, 0, authStatus.database);
        setDrugs(data.drugs);
        setIsLoading(false);
      } catch (error) {
        logger.error('Error fetching drugs:', error);
        // Fallback: try with English database
        try {
          const { getDrugLibrary } = await import('@/lib/authenticated-api');
          const data = await getDrugLibrary(selectedLetter, undefined, 0, 'english');
          setDrugs(data.drugs);
        } catch (fallbackError) {
          logger.error('Fallback also failed:', fallbackError);
        }
        setIsLoading(false);
      }
    };
    
    fetchDrugs();
  }, [selectedLetter]);
  
  // Fetch unified suggestions (both EMA drugs and AI suggestions) for autocomplete
  const fetchAISuggestions = async (term: string) => {
    logger.debug('fetchAISuggestions called with:', term);
    if (term.trim() === '') {
      setRecommendations([]);
      setShowRecommendations(false);
      return;
    }
    setShowRecommendations(true);
    
    try {
      // Fetch both EMA drugs and AI suggestions simultaneously
      const [emaResults, aiResults] = await Promise.allSettled([
        // EMA Drug Search (limited to 3 results) - Port 8002
        (async () => {
          const authStatus = await getCachedAuthStatus();
          const { enhancedSearchDrugs } = await import('@/lib/authenticated-api');
          const data = await enhancedSearchDrugs(term, 3, authStatus.database);
          
          let transformedData = [];
          
          // Handle direct brand match
          if (data.direct_match) {
            transformedData.push({
              brand_name: data.direct_match.name,
              active_substance: data.direct_match.active_substance,
              inn: [],
              search_type: 'direct_brand'
            });
          }
          
          // Handle brand options (limit to 2 to make room for AI suggestions)
          if (data.brand_options && data.brand_options.length > 0) {
            const brandOptions = data.brand_options.slice(0, 2).map((drug: any) => ({
              brand_name: drug.brand_name,
              active_substance: drug.active_substance || [],
              inn: drug.inn || [],
              search_type: drug.search_type || 'brand_option'
            }));
            transformedData = [...transformedData, ...brandOptions];
          }
          
          return transformedData.slice(0, 3); // Ensure max 3 EMA results
        })(),
        
        // Gemini Drug Suggestions (limited to 3 results)
        (async () => {
          try {
            const response = await fetch('/api/suggestions/drugs', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ query: term }),
            });
            
            if (!response.ok) {
              throw new Error(`API request failed with status ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
              throw new Error(data.error);
            }
            
            const suggestions = data.suggestions || [];
            
            return suggestions.slice(0, 3).map((suggestion: string) => ({
              brand_name: suggestion,
              active_substance: ['Drug Suggestion'],
              inn: [],
              search_type: 'ai_suggestion',
              first_letter: suggestion.charAt(0).toUpperCase(),
              pdf_url: ''
            }));
          } catch (error) {
            logger.error('Gemini drug suggestions failed:', error);
            // Fallback to real drug suggestions
            const lowerTerm = term.toLowerCase();
            let fallbackSuggestions;
            
            if (lowerTerm.includes('asp')) {
              fallbackSuggestions = ['aspirin', 'aspartame', 'asparagine'];
            } else if (lowerTerm.includes('para')) {
              fallbackSuggestions = ['paracetamol', 'paroxetine', 'paracetamol/codeine'];
            } else if (lowerTerm.includes('met')) {
              fallbackSuggestions = ['metformin', 'metoprolol', 'metronidazole'];
            } else {
              fallbackSuggestions = ['acetaminophen', 'ibuprofen', 'aspirin'];
            }
            
            return fallbackSuggestions.slice(0, 3).map(suggestion => ({
              brand_name: suggestion,
              active_substance: ['Drug Suggestion'],
              inn: [],
              search_type: 'ai_suggestion',
              first_letter: suggestion.charAt(0).toUpperCase(),
              pdf_url: ''
            }));
          }
        })()
      ]);
      
      // Combine results - mix EMA and AI suggestions
      let allRecommendations: Drug[] = [];
      
      // Add EMA results first
      if (emaResults.status === 'fulfilled' && emaResults.value.length > 0) {
        allRecommendations = [...allRecommendations, ...emaResults.value];
      }
      
      // Add AI results
      if (aiResults.status === 'fulfilled' && aiResults.value.length > 0) {
        allRecommendations = [...allRecommendations, ...aiResults.value];
      }
      
      // Limit total to 6 suggestions (3 EMA + 3 AI)
      setRecommendations(allRecommendations.slice(0, 6));
      
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    } catch (error) {
      logger.error('Error fetching unified suggestions:', error);
      
      // Fallback: try EMA search with English database + AI fallback
      try {
        const { enhancedSearchDrugs } = await import('@/lib/authenticated-api');
        const data = await enhancedSearchDrugs(term, 3, 'english');
        
        let fallbackData = [];
        if (data.direct_match) {
          fallbackData.push({
            brand_name: data.direct_match.name,
            active_substance: data.direct_match.active_substance,
            inn: [],
            search_type: 'direct_brand'
          });
        }
        if (data.brand_options && data.brand_options.length > 0) {
          const brandOptions = data.brand_options.slice(0, 2).map((drug: any) => ({
            brand_name: drug.brand_name,
            active_substance: drug.active_substance || [],
            inn: drug.inn || [],
            search_type: drug.search_type || 'brand_option'
          }));
          fallbackData = [...fallbackData, ...brandOptions];
        }
        
        // Add AI fallback suggestions
        const aiFallback = [
          `${term}`,
          `${term} generic`,
          `${term} brand`
        ].slice(0, 3).map(suggestion => ({
          brand_name: suggestion,
          active_substance: ['AI Suggestion'],
          inn: [],
          search_type: 'ai_suggestion',
          first_letter: suggestion.charAt(0).toUpperCase(),
          pdf_url: ''
        }));
        
        setRecommendations([...fallbackData.slice(0, 3), ...aiFallback]);
      } catch (fallbackError) {
        logger.error('Unified suggestions fallback also failed:', fallbackError);
        // Final fallback - just AI suggestions
        const finalFallback = [
          `${term}`,
          `${term} generic`,
          `${term} brand`
        ].map(suggestion => ({
          brand_name: suggestion,
          active_substance: ['AI Suggestion'],
          inn: [],
          search_type: 'ai_suggestion',
          first_letter: suggestion.charAt(0).toUpperCase(),
          pdf_url: ''
        }));
        setRecommendations(finalFallback);
      }
    }
  };

  // Fetch recommendations function - now fetches both EMA and AI search results (only on Enter)
  const fetchSearchResults = async (term: string) => {
    logger.debug('fetchSearchResults called with:', term);
    if (term.trim() === '') {
      setRecommendations([]);
      setShowRecommendations(false);
      return;
    }
    setShowRecommendations(true);
    
    try {
      // Fetch both EMA and AI search results simultaneously
      const [emaResults, aiResults] = await Promise.allSettled([
        // EMA Search
        (async () => {
          const authStatus = await getCachedAuthStatus();
          logger.debug('Search using database:', authStatus.database, 'for country:', authStatus.country);
          
          const { enhancedSearchDrugs } = await import('@/lib/authenticated-api');
          const data = await enhancedSearchDrugs(term, 5, authStatus.database);
          logger.debug('EMA API response data:', data);
          
          let transformedData = [];
          
          // Handle direct brand match
          if (data.direct_match) {
            transformedData.push({
              brand_name: data.direct_match.name,
              active_substance: data.direct_match.active_substance,
              inn: [],
              search_type: 'direct_brand'
            });
          }
          
          // Handle brand options
          if (data.brand_options && data.brand_options.length > 0) {
            const brandOptions = data.brand_options.slice(0, 4).map((drug: any) => ({
              brand_name: drug.brand_name,
              active_substance: drug.active_substance || [],
              inn: drug.inn || [],
              search_type: drug.search_type || 'brand_option'
            }));
            transformedData = [...transformedData, ...brandOptions];
          }
          
          return transformedData;
        })(),
        
        // AI Search - Port 8000
        (async () => {
          try {
            const authStatus = await getCachedAuthStatus();
            const { enhancedSearchDrugsAI } = await import('@/lib/authenticated-api');
            const data = await enhancedSearchDrugsAI(term, 3, authStatus.database);
            
            let transformedData = [];
            
            // Handle direct match
            if (data.direct_match) {
              transformedData.push({
                brand_name: data.direct_match.name,
                active_substance: data.direct_match.active_substance,
                inn: [],
                search_type: 'ai_search'
              });
            }
            
            // Handle brand options
            if (data.brand_options && data.brand_options.length > 0) {
              const brandOptions = data.brand_options.slice(0, 2).map((drug: any) => ({
                brand_name: drug.brand_name,
                active_substance: drug.active_substance || [],
                inn: drug.inn || [],
                search_type: 'ai_search'
              }));
              transformedData = [...transformedData, ...brandOptions];
            }
            
            return transformedData.slice(0, 3);
          } catch (error) {
            logger.error('AI search failed:', error);
            return [];
          }
        })()
      ]);
      
      // Combine results
      let allRecommendations: Drug[] = [];
      
      // Add EMA results
      if (emaResults.status === 'fulfilled' && emaResults.value.length > 0) {
        allRecommendations = [...allRecommendations, ...emaResults.value];
      }
      
      // Add AI results
      if (aiResults.status === 'fulfilled' && aiResults.value.length > 0) {
        allRecommendations = [...allRecommendations, ...aiResults.value];
      }
      
      setRecommendations(allRecommendations);
      
      logger.debug('Recommendations set:', recommendations);
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    } catch (error) {
      logger.error('Error fetching search results:', error);
      
      // Fallback: try with English database for EMA search
      try {
        const { enhancedSearchDrugs } = await import('@/lib/authenticated-api');
        const data = await enhancedSearchDrugs(term, 5, 'english');
        
        let fallbackData = [];
        if (data.direct_match) {
          fallbackData.push({
            brand_name: data.direct_match.name,
            active_substance: data.direct_match.active_substance,
            inn: [],
            search_type: 'direct_brand'
          });
        }
        if (data.brand_options && data.brand_options.length > 0) {
          const brandOptions = data.brand_options.slice(0, 4).map((drug: any) => ({
            brand_name: drug.brand_name,
            active_substance: drug.active_substance || [],
            inn: drug.inn || [],
            search_type: drug.search_type || 'brand_option'
          }));
          fallbackData = [...fallbackData, ...brandOptions];
        }
        setRecommendations(fallbackData);
      } catch (fallbackError) {
        logger.error('Search fallback also failed:', fallbackError);
        setRecommendations([]);
      }
    }
  };

  // Fetch AI suggestions when search term changes (debounced)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (searchTerm.trim() === '') {
      setRecommendations([]);
      setShowRecommendations(false);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      fetchAISuggestions(searchTerm);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Handle search action (triggered on Enter key)
  const handleSearch = () => {
    if (searchTerm.trim() === '') return;
    
    // Navigate to AI results page with the search query
    router.push(`/ai-results?q=${encodeURIComponent(searchTerm.trim())}`);
  };

  // Removed useEffect for AI mode changes since we now show unified results

  // Keep focus on search input after every keystroke
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchTerm]);
  
  // Also maintain focus when recommendations state changes
  useEffect(() => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [recommendations, showRecommendations]);

  // Function to convert drug name to URL-friendly format
  const slugify = (text: string) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/ /g, '-')
      .replace(/\//g, '-')
      .replace(/[^\w-]+/g, '');
  };
  
  // Handle clicking outside the recommendations to close them
  const searchContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowRecommendations(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const DrugInformationContent = () => {
    return (
      <div className="max-w-5xl mx-auto px-4 py-4 md:py-8 mt-0 md:mt-16 relative">
        <div className="flex flex-col md:flex-row justify-center items-center mb-0 md:mb-[20px]">
          <div className="text-center mb-4 md:mb-0">
            <h1 className="hidden md:block text-[36px] font-semibold text-[#214498] mb-[4px] mt-0 font-['DM_Sans'] font-[600]">Drug Information</h1>
            <p className="hidden md:block text-[14px] md:text-[16px] text-[#64748B] font-['DM_Sans'] mt-2">
              Drug information from EMA and AI generated summaries from trusted drug sources.
            </p>
          </div>
          <div>
            
          </div>
        </div>
        


        <div className="relative mb-6 md:mb-10" ref={searchContainerRef}>
          {/* Unified search with gradient border */}
          <div className="absolute inset-0 w-full max-w-[1118px] mx-auto rounded-lg p-[2px] pointer-events-none">
            <div className="w-full h-full rounded-lg bg-gradient-to-r from-[#3771FE]/[0.4] via-[#2563eb]/[0.6] to-[#3771FE]/[0.4] animate-[border-flow_3s_ease-in-out_infinite] bg-[length:200%_100%]" />
          </div>
          <div className="flex items-center border-[2.7px] rounded-lg h-[48px] md:h-[56px] w-full max-w-[1118px] mx-auto pr-3 md:pr-4 bg-white transition-all duration-300 relative z-10 border-[#3771FE]/[0.27] shadow-[0_0_12px_rgba(55,113,254,0.2)]">
            <div className="pl-3 md:pl-4 flex items-center">
              <Search className="stroke-[1.5] w-[18px] h-[18px] md:w-[20px] md:h-[20px] transition-colors duration-300 text-[#3771FE]" fill="none" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search drugs..."
              className="flex-1 py-2 md:py-3 px-2 md:px-3 outline-none text-[#223258] font-['DM_Sans'] font-[400] text-[14px] md:text-[16px] leading-[100%] tracking-[0%] placeholder-[#9599A8] placeholder:font-['DM_Sans'] placeholder:text-[14px] md:placeholder:text-[16px]"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => {
                if (searchTerm.trim() !== '') {
                  setShowRecommendations(true);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchTerm.trim() !== '') {
                  handleSearch();
                }
              }}
              onBlur={(e) => {
                setTimeout(() => {
                  if (searchContainerRef.current && !searchContainerRef.current.contains(document.activeElement)) {
                    setShowRecommendations(false);
                  } else {
                    if (searchInputRef.current) {
                      searchInputRef.current.focus();
                    }
                  }
                }, 100);
              }}
            />

            
            <button 
              className="flex items-center justify-center border-none bg-transparent relative ml-2 md:ml-3 hover:opacity-80 transition-opacity text-[#6366f1] p-1"
              onClick={handleSearch}
            >
              <svg 
                width="36" 
                height="36" 
                viewBox="0 0 46 46" 
                fill="none" 
                xmlns="http://www.w3.org/2000/svg"
                className="w-[36px] h-[36px] md:w-[40px] md:h-[40px]"
              >
                <rect width="46" height="46" rx="6.57143" fill="#3771FE"/>
                <path d="M29.8594 16.5703L13.3594 33.0703" stroke="white" strokeWidth="2.25" strokeLinecap="round"/>
                <path d="M20.4297 14.6406H31.6426V24.9263" stroke="white" strokeWidth="2.25" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
          
          {/* Unified Recommendations dropdown */}
          {showRecommendations && recommendations.length > 0 && (
            <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-w-[1118px] mx-auto">
              {recommendations.map((drug, index) => (
                <div 
                  key={index}
                  className={`block px-4 py-3 hover:bg-blue-50 text-[#223258] font-['DM_Sans'] font-[400] text-[16px] leading-[100%] tracking-[0%] border-b border-gray-100 last:border-b-0 relative cursor-pointer ${
                    drug.search_type === 'ai_suggestion' ? 'border-l-4 border-l-[#2196f3]' : drug.search_type === 'ai_search' ? 'border-l-4 border-l-[#ffa500]' : 'border-l-4 border-l-[#28a745]'
                  }`}
                  onClick={() => {
                    if (drug.search_type === 'ai_suggestion') {
                      // Navigate to AI results page for AI suggestions
                      router.push(`/ai-results?q=${encodeURIComponent(drug.brand_name)}`);
                    } else if (drug.search_type === 'ai_search') {
                      // Navigate to AI results page
                      router.push(`/ai-results?q=${encodeURIComponent(drug.brand_name)}`);
                    } else {
                      // Navigate to EMA drug page
                      router.push(`/drug-information/${slugify(drug.brand_name)}`);
                    }
                    setShowRecommendations(false);
                    if (searchInputRef.current) {
                      searchInputRef.current.focus();
                    }
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      {drug.search_type === 'ai_suggestion' ? (
                        <>
                          <span className="font-semibold">{drug.brand_name}</span>
                        </>
                      ) : drug.search_type !== 'direct_brand' ? (
                        <>
                          <span className="font-semibold">{drug.active_substance.join(', ')}</span> <span className="text-gray-600">(<em>Brand Name:</em> <span className="font-semibold">{drug.brand_name}</span>)</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold">{drug.brand_name}</span> <span className="text-gray-600">(<em>active substances:</em> <span className="font-semibold">{drug.active_substance.join(', ')}</span>)</span>
                        </>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded-full text-[14px] font-['DM_Sans'] font-semibold uppercase ${
                      drug.search_type === 'ai_suggestion'
                        ? 'bg-[#e3f2fd] text-[#1565c0] border border-[#bbdefb]'
                        : drug.search_type === 'ai_search'
                        ? 'bg-[#fff3cd] text-[#856404] border border-[#ffeaa7]' 
                        : 'bg-[#d4edda] text-[#155724] border border-[#c3e6cb]'
                    }`}>
                      {drug.search_type === 'ai_suggestion' ? (
                        <div className="flex items-center">
                          <span className="mr-1">AI</span>
                          <SparkleIcon className="w-[14px] h-[14px]" fill="currentColor" />
                        </div>
                      ) : drug.search_type === 'ai_search' ? (
                        <div className="flex items-center">
                          <span className="mr-1">AI</span>
                          <SparkleIcon className="w-[14px] h-[14px]" fill="currentColor" />
                        </div>
                      ) : 'EMA'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
         
         {/* Explanatory text for alphabet navigation */}
         <div className="w-full max-w-[1118px] mx-auto mb-4">
           <p className="text-[14px] md:text-[16px] text-[#64748B] font-['DM_Sans'] text-center">
             List of EMA drugs
           </p>
         </div>
        
        {/* Alphabet navigation bar */}
        <div className="flex justify-start w-full mb-8">
          <div className="w-full max-w-[1118px] mx-auto relative">
            {/* Left scroll button */}
            <button
              onClick={() => scrollAlphabetBar('left')}
              className="absolute -left-2 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-gray-300 rounded-full shadow-sm md:hidden transition-opacity duration-200"
            >
              <ChevronLeft className="w-4 h-4 text-[#263969]" />
            </button>

            {/* Right scroll button */}
            <button
              onClick={() => scrollAlphabetBar('right')}
              className="absolute -right-2 top-1/2 transform -translate-y-1/2 z-20 w-8 h-8 flex items-center justify-center bg-white/90 backdrop-blur-sm border border-gray-300 rounded-full shadow-sm md:hidden transition-opacity duration-200"
            >
              <ChevronRight className="w-4 h-4 text-[#263969]" />
            </button>

            {/* Left fade indicator */}
            <div className="absolute left-0 top-0 h-full w-4 z-10 pointer-events-none md:hidden" 
                 style={{ 
                   background: 'linear-gradient(to right, rgba(249, 250, 251, 0.8), transparent)',
                   backdropFilter: 'blur(1px)'
                 }}></div>
            
            {/* Right fade indicator */}
            <div className="absolute right-0 top-0 h-full w-4 z-10 pointer-events-none md:hidden"
                 style={{ 
                   background: 'linear-gradient(to left, rgba(249, 250, 251, 0.8), transparent)',
                   backdropFilter: 'blur(1px)'
                 }}></div>
            
            <div
              ref={alphabetBarRef}
              className="flex overflow-x-auto scrollbar-hide px-6 md:px-0"
              style={{ 
                WebkitOverflowScrolling: 'touch', 
                scrollbarWidth: 'none', 
                msOverflowStyle: 'none', 
                scrollBehavior: 'smooth',
                minWidth: 0
              }}
            >
              <style jsx>{`
                .scrollbar-hide::-webkit-scrollbar {
                  display: none;
                }
                .scrollbar-hide {
                  -ms-overflow-style: none;
                  scrollbar-width: none;
                }
              `}</style>
              {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map(letter => (
                <button
                  key={letter}
                  className={`flex-shrink-0 min-w-[28px] px-2 py-2 mx-1 text-[16px] font-['DM_Sans'] font-medium transition-colors duration-200 focus:outline-none border-none bg-transparent ${
                    selectedLetter === letter 
                      ? 'text-[#263969]' 
                      : 'text-[#878787] hover:text-[#263969]'
                  }`}
                  onClick={() => setSelectedLetter(letter)}
                >
                  {letter}
                </button>
              ))}
              <button
                key="#"
                className={`flex-shrink-0 min-w-[32px] px-2 py-2 mx-1 text-[16px] font-['DM_Sans'] font-medium transition-colors duration-200 focus:outline-none border-none bg-transparent ${
                  selectedLetter === '#' 
                    ? 'text-[#263969]' 
                    : 'text-[#878787] hover:text-[#263969]'
                }`}
                onClick={() => setSelectedLetter('#')}
              >
                #
              </button>
            </div>
          </div>
        </div>
        
        {/* Drug table */}
        <div className="w-full max-w-[1118px] mx-auto rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[65%]" />
                <col className="w-[35%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[#E1E7F0]">
                  <th className="text-left px-4 md:px-6 py-4 font-semibold text-[#263969] text-[16px] font-['DM_Sans'] font-[600]">
                    Brand Name
                  </th>
                  <th className="text-left px-4 md:px-6 py-4 font-semibold text-[#263969] text-[16px] font-['DM_Sans'] font-[600]">
                    Active Substance(s)
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={2} className="text-center py-12">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#214498]"></div>
                        <span className="ml-3 text-[#263969] font-['DM_Sans']">Loading drugs...</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {drugs.map((drug, index) => {
                      const sortedActiveSubstances = drug.active_substance ? [...drug.active_substance].sort((a, b) => a.localeCompare(b)) : [];
                      return (
                        <tr key={index} className="border-b border-[#E1E7F0] hover:bg-[#E8EDF7] transition-colors">
                          <td className="px-4 md:px-6 py-4">
                            <Link 
                              href={`/drug-information/${slugify(drug.brand_name)}`} 
                              className="text-[#263969] font-['DM_Sans'] font-normal text-[16px] hover:text-[#214498] hover:underline transition-colors"
                            >
                              {drug.brand_name}
                            </Link>
                          </td>
                          <td className="px-4 md:px-6 py-4 text-[#263969] font-['DM_Sans'] font-normal text-[16px]">
                            {sortedActiveSubstances.length > 0 ? sortedActiveSubstances.join(', ') : '-'}
                          </td>
                        </tr>
                      );
                    })}
                    {drugs.length === 0 && (
                      <tr>
                        <td colSpan={2} className="text-center py-8 text-[#263969] font-['DM_Sans']">
                          No drugs found for letter "{selectedLetter}".
                        </td>
                      </tr>
                    )}
                  </>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="bg-[#F9FAFB] min-h-screen">
        {user && <DrugInformationContent />}
      </div>
    </DashboardLayout>
  );
}
