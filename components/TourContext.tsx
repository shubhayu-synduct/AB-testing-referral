"use client";

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import steps, { guidelineTourSteps, drugTourSteps, drinfoSummaryTourSteps } from "@/lib/tourSteps";

// Dynamically import Joyride to prevent SSR issues
const Joyride = dynamic(() => import("react-joyride-next"), { ssr: false });

const TourContext = createContext<{
  startTour: () => void;
  stopTour: () => void;
  run: boolean;
  forceStartTour: () => void;
  checkTourPreference: () => boolean;
  resetTourPreference: () => void;
  shouldShowTour: () => boolean;
  saveTourPreference: (status: 'completed' | 'skipped') => void;
  isTourActive: () => boolean; // Add this method
}>({
  startTour: () => {},
  stopTour: () => {},
  run: false,
  forceStartTour: () => {},
  checkTourPreference: () => false,
  resetTourPreference: () => {},
  shouldShowTour: () => false,
  saveTourPreference: () => {},
  isTourActive: () => false, // Add this method
});

export function useTour() {
  return useContext(TourContext);
}

export const TourProvider = ({ children }: { children: React.ReactNode }) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Check localStorage for tour preference
  const checkTourPreference = useCallback(() => {
    if (typeof window !== 'undefined') {
      const preference = localStorage.getItem('dashboard-tour-completed');
      return preference === 'completed' || preference === 'skipped';
    }
    return false;
  }, []);

  // Save tour preference
  const saveTourPreference = useCallback((status: 'completed' | 'skipped') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dashboard-tour-completed', status);
    }
  }, []);

  const startTour = useCallback(() => {
    // Check if user has already completed or skipped the tour
    if (checkTourPreference()) {
      console.log('Tour already completed or skipped, not starting');
      return;
    }
    
    setStepIndex(0);
    setRun(true);
  }, [checkTourPreference]);

  const forceStartTour = useCallback(() => {
    // Force start tour regardless of preference
    setStepIndex(0);
    setRun(true);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  const handleJoyrideCallback = (data: any) => {
    const { status, index, type, action } = data;
    
    if (status === "finished") {
      saveTourPreference('completed');
      setRun(false);
    } else if (status === "skipped") {
      saveTourPreference('skipped');
      setRun(false);
    } else if (type === "step:after") {
      if (action === "prev") {
        setStepIndex(Math.max(0, index - 1));
      } else if (action === "next") {
        setStepIndex(index + 1);
      }
    }
  };

  const resetTourPreference = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('dashboard-tour-completed');
    }
  }, []);

  const shouldShowTour = useCallback(() => {
    // Don't show tour if it's already completed/skipped OR if a tour is currently running
    return !checkTourPreference() && !run;
  }, [checkTourPreference, run]);

  // Hard prevention of Joyride scrolling
  useEffect(() => {
    if (run) {
      try {
        // Prevent Joyride from scrolling by overriding scroll methods
        const originalScrollIntoView = Element.prototype.scrollIntoView;
        const originalScrollTo = window.scrollTo;
        
        // Override scrollIntoView to prevent Joyride from using it
        Element.prototype.scrollIntoView = function(options) {
          // Only allow scrolling if it's not Joyride trying to scroll
          if (!options || typeof options === 'object') {
            return; // Block Joyride's scrollIntoView calls
          }
          return originalScrollIntoView.call(this, options);
        };
        
        // Override window.scrollTo to prevent Joyride from using it
        window.scrollTo = function(options) {
          // Block Joyride's window.scrollTo calls
          return;
        };
        
        // Also prevent scroll on the content container
        const contentRef = document.querySelector('.flex-1.overflow-y-auto');
        let originalScrollTop: any = null;
        if (contentRef) {
          originalScrollTop = Object.getOwnPropertyDescriptor(contentRef, 'scrollTop');
          if (originalScrollTop) {
            Object.defineProperty(contentRef, 'scrollTop', {
              get: function() {
                return originalScrollTop.get.call(this);
              },
              set: function(value) {
                // Only allow setting if it's not Joyride trying to scroll
                if (run) {
                  return; // Block Joyride's scrollTop changes
                }
                return originalScrollTop.set.call(this, value);
              }
            });
          }
        }
        
        return () => {
          // Restore original methods when tour ends
          Element.prototype.scrollIntoView = originalScrollIntoView;
          window.scrollTo = originalScrollTo;
          if (contentRef && originalScrollTop) {
            Object.defineProperty(contentRef, 'scrollTop', originalScrollTop);
          }
        };
      } catch (error) {
        console.warn('Error setting up scroll prevention:', error);
        // If scroll prevention fails, just return a no-op cleanup function
        return () => {};
      }
    }
  }, [run]);

  // Check if current step should disable scrolling
  const currentStep = drinfoSummaryTourSteps[stepIndex];
  const shouldDisableScrolling = run && currentStep?.disableScrolling;

  // Disable body scrolling when needed
  useEffect(() => {
    if (shouldDisableScrolling) {
      document.body.style.overflow = 'hidden';
      
      // Add event listener to prevent scrolling
      const preventScroll = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      // Prevent scroll on all scrollable elements
      const scrollableElements = document.querySelectorAll('.citations-sidebar, .overflow-y-auto, .overflow-auto');
      scrollableElements.forEach(el => {
        el.addEventListener('scroll', preventScroll, { passive: false });
        el.addEventListener('wheel', preventScroll, { passive: false });
        el.addEventListener('touchmove', preventScroll, { passive: false });
      });
      
      // Prevent scroll on document
      document.addEventListener('scroll', preventScroll, { passive: false });
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
      
      return () => {
        // Cleanup event listeners
        scrollableElements.forEach(el => {
          el.removeEventListener('scroll', preventScroll);
          el.removeEventListener('wheel', preventScroll);
          el.removeEventListener('touchmove', preventScroll);
        });
        document.removeEventListener('scroll', preventScroll);
        document.removeEventListener('wheel', preventScroll);
        document.removeEventListener('touchmove', preventScroll);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [shouldDisableScrolling]);

  const isTourActive = useCallback(() => {
    return run;
  }, [run]);

  return (
    <TourContext.Provider value={{ startTour, stopTour, run, forceStartTour, checkTourPreference, resetTourPreference, shouldShowTour, saveTourPreference, isTourActive }}>
      <Joyride
        steps={steps}
        run={run}
        stepIndex={stepIndex}
        continuous
        scrollToFirstStep
        showSkipButton
        showProgress
        disableOverlayClose
        spotlightClicks
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: "#3771FE",
            textColor: "#223258",
            backgroundColor: "#fff",
            arrowColor: "#fff",
          },
          tooltip: {
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #E4ECFF",
            boxShadow: "0 4px 20px rgba(55, 113, 254, 0.15)",
          },
          buttonNext: {
            backgroundColor: "#3771FE",
            color: "#fff",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
          },
          buttonBack: {
            backgroundColor: "#E4ECFF",
            color: "#3771FE",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
            border: "1px solid #3771FE",
          },
          buttonSkip: {
            color: "#6B7280",
            fontSize: "14px",
          },
          buttonClose: {
            color: "#6B7280",
          },
        }}
      />
      {children}
    </TourContext.Provider>
  );
};

const GuidelineTourContext = createContext<{
  startTour: () => void;
  stopTour: () => void;
  run: boolean;
  isTourActive: () => boolean; // Add this method
}>({
  startTour: () => {},
  stopTour: () => {},
  run: false,
  isTourActive: () => false, // Add this method
});

export function useGuidelineTour() {
  return useContext(GuidelineTourContext);
}

export const GuidelineTourProvider = ({ children }: { children: React.ReactNode }) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  const isTourActive = useCallback(() => {
    return run;
  }, [run]);

  const handleJoyrideCallback = (data: any) => {
    const { status, index, type, action } = data;
    if (["finished", "skipped"].includes(status)) {
      setRun(false);
    } else if (type === "step:after") {
      if (action === "prev") {
        setStepIndex(Math.max(0, index - 1));
      } else if (action === "next") {
        setStepIndex(index + 1);
      }
    }
  };

  return (
    <GuidelineTourContext.Provider value={{ startTour, stopTour, run, isTourActive }}>
      <Joyride
        steps={guidelineTourSteps}
        run={run}
        stepIndex={stepIndex}
        continuous
        scrollToFirstStep
        showSkipButton
        showProgress
        disableOverlayClose
        spotlightClicks
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: "#3771FE",
            textColor: "#223258",
            backgroundColor: "#fff",
            arrowColor: "#fff",
          },
          tooltip: {
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #E4ECFF",
            boxShadow: "0 4px 20px rgba(55, 113, 254, 0.15)",
          },
          buttonNext: {
            backgroundColor: "#3771FE",
            color: "#fff",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
          },
          buttonBack: {
            backgroundColor: "#E4ECFF",
            color: "#3771FE",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
            border: "1px solid #3771FE",
          },
          buttonSkip: {
            color: "#6B7280",
            fontSize: "14px",
          },
          buttonClose: {
            color: "#6B7280",
          },
        }}
      />
      {children}
    </GuidelineTourContext.Provider>
  );
};

const DrugTourContext = createContext<{
  startTour: () => void;
  stopTour: () => void;
  run: boolean;
  isTourActive: () => boolean; // Add this method
}>({
  startTour: () => {},
  stopTour: () => {},
  run: false,
  isTourActive: () => false, // Add this method
});

export function useDrugTour() {
  return useContext(DrugTourContext);
}

export const DrugTourProvider = ({ children }: { children: React.ReactNode }) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const startTour = useCallback(() => {
    setStepIndex(0);
    setRun(true);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  const handleJoyrideCallback = (data: any) => {
    const { status, index, type, action } = data;
    if (["finished", "skipped"].includes(status)) {
      setRun(false);
    } else if (type === "step:after") {
      if (action === "prev") {
        setStepIndex(Math.max(0, index - 1));
      } else if (action === "next") {
        setStepIndex(index + 1);
      }
    }
  };

  const isTourActive = useCallback(() => {
    return run;
  }, [run]);

  return (
    <DrugTourContext.Provider value={{ startTour, stopTour, run, isTourActive }}>
      <Joyride
        steps={drugTourSteps}
        run={run}
        stepIndex={stepIndex}
        continuous
        scrollToFirstStep
        showSkipButton
        showProgress
        disableOverlayClose
        spotlightClicks
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: "#3771FE",
            textColor: "#223258",
            backgroundColor: "#fff",
            arrowColor: "#fff",
          },
          tooltip: {
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #E4ECFF",
            boxShadow: "0 4px 20px rgba(55, 113, 254, 0.15)",
          },
          buttonNext: {
            backgroundColor: "#3771FE",
            color: "#fff",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
          },
          buttonBack: {
            backgroundColor: "#E4ECFF",
            color: "#3771FE",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
            border: "1px solid #3771FE",
          },
          buttonSkip: {
            color: "#6B7280",
            fontSize: "14px",
          },
          buttonClose: {
            color: "#6B7280",
          },
        }}
      />
      {children}
    </DrugTourContext.Provider>
  );
};

const DrinfoSummaryTourContext = createContext<{
  startTour: () => void;
  stopTour: () => void;
  run: boolean;
  setStepIndex: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  handleBackButton: () => void;
  checkTourPreference: () => boolean;
  forceStartTour: () => void;
  resetTourPreference: () => void;
  shouldShowTour: () => boolean;
  saveTourPreference: (status: 'completed' | 'skipped') => void;
  isTourActive: () => boolean; // Add this method
} | undefined>(undefined);

export function useDrinfoSummaryTour() {
  return useContext(DrinfoSummaryTourContext);
}

export const DrinfoSummaryTourProvider = ({ children }: { children: React.ReactNode }) => {
  const [run, setRun] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Check localStorage for tour preference
  const checkTourPreference = useCallback(() => {
    if (typeof window !== 'undefined') {
      const preference = localStorage.getItem('drinfo-summary-tour-completed');
      return preference === 'completed' || preference === 'skipped';
    }
    return false;
  }, []);

  // Save tour preference
  const saveTourPreference = useCallback((status: 'completed' | 'skipped') => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('drinfo-summary-tour-completed', status);
    }
  }, []);

  const startTour = useCallback(() => {
    // Check if user has already completed or skipped the tour
    if (checkTourPreference()) {
      console.log('DrinfoSummary tour already completed or skipped, not starting');
      return;
    }
    
    setStepIndex(0);
    setRun(true);
  }, [checkTourPreference]);

  const forceStartTour = useCallback(() => {
    // Force start tour regardless of preference
    setStepIndex(0);
    setRun(true);
  }, []);

  const stopTour = useCallback(() => {
    setRun(false);
  }, []);

  const nextStep = useCallback(() => setStepIndex(idx => idx + 1), []);
  
  const prevStep = useCallback(() => setStepIndex(idx => Math.max(0, idx - 1)), []);

  const resetTourPreference = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('drinfo-summary-tour-completed');
    }
  }, []);

  const handleJoyrideCallback = (data: any) => {
    const { status, index, type, action } = data;
    console.log('DrinfoSummaryTour callback:', { status, index, type, action });
    
    if (status === "finished") {
      saveTourPreference('completed');
      setRun(false);
    } else if (status === "skipped") {
      saveTourPreference('skipped');
      setRun(false);
    } else if (type === "step:after") {
      if (action === "prev") {
        console.log('Back button clicked, going from step', index, 'to step', Math.max(0, index - 1));
        setStepIndex(Math.max(0, index - 1));
      } else if (action === "next") {
        console.log('Next button clicked, going from step', index, 'to step', index + 1);
        setStepIndex(index + 1);
      }
    }
  };

  // Custom back button handler
  const handleBackButton = useCallback(() => {
    console.log('Custom back button handler, current step:', stepIndex, 'going to:', Math.max(0, stepIndex - 1));
    setStepIndex(Math.max(0, stepIndex - 1));
  }, [stepIndex]);

  // Remove the event listener approach since proper callback handling should work

  // Hard prevention of Joyride scrolling
  useEffect(() => {
    if (run) {
      try {
        // Prevent Joyride from scrolling by overriding scroll methods
        const originalScrollIntoView = Element.prototype.scrollIntoView;
        const originalScrollTo = window.scrollTo;
        
        // Override scrollIntoView to prevent Joyride from using it
        Element.prototype.scrollIntoView = function(options) {
          // Only allow scrolling if it's not Joyride trying to scroll
          if (!options || typeof options === 'object') {
            return; // Block Joyride's scrollIntoView calls
          }
          return originalScrollIntoView.call(this, options);
        };
        
        // Override window.scrollTo to prevent Joyride from using it
        window.scrollTo = function(options) {
          // Block Joyride's window.scrollTo calls
          return;
        };
        
        // Also prevent scroll on the content container
        const contentRef = document.querySelector('.flex-1.overflow-y-auto');
        let originalScrollTop: any = null;
        if (contentRef) {
          originalScrollTop = Object.getOwnPropertyDescriptor(contentRef, 'scrollTop');
          if (originalScrollTop) {
            Object.defineProperty(contentRef, 'scrollTop', {
              get: function() {
                return originalScrollTop.get.call(this);
              },
              set: function(value) {
                // Only allow setting if it's not Joyride trying to scroll
                if (run) {
                  return; // Block Joyride's scrollTop changes
                }
                return originalScrollTop.set.call(this, value);
              }
            });
          }
        }
        
        return () => {
          // Restore original methods when tour ends
          Element.prototype.scrollIntoView = originalScrollIntoView;
          window.scrollTo = originalScrollTo;
          if (contentRef && originalScrollTop) {
            Object.defineProperty(contentRef, 'scrollTop', originalScrollTop);
          }
        };
      } catch (error) {
        console.warn('Error setting up scroll prevention:', error);
        // If scroll prevention fails, just return a no-op cleanup function
        return () => {};
      }
    }
  }, [run]);

  // Check if current step should disable scrolling
  const currentStep = drinfoSummaryTourSteps[stepIndex];
  const shouldDisableScrolling = run && currentStep?.disableScrolling;

  // Disable body scrolling when needed
  useEffect(() => {
    if (shouldDisableScrolling) {
      document.body.style.overflow = 'hidden';
      
      // Add event listener to prevent scrolling
      const preventScroll = (e: any) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      };
      
      // Prevent scroll on all scrollable elements
      const scrollableElements = document.querySelectorAll('.citations-sidebar, .overflow-y-auto, .overflow-auto');
      scrollableElements.forEach(el => {
        el.addEventListener('scroll', preventScroll, { passive: false });
        el.addEventListener('wheel', preventScroll, { passive: false });
        el.addEventListener('touchmove', preventScroll, { passive: false });
      });
      
      // Prevent scroll on document
      document.addEventListener('scroll', preventScroll, { passive: false });
      document.addEventListener('wheel', preventScroll, { passive: false });
      document.addEventListener('touchmove', preventScroll, { passive: false });
      
      return () => {
        // Cleanup event listeners
        scrollableElements.forEach(el => {
          el.removeEventListener('scroll', preventScroll);
          el.removeEventListener('wheel', preventScroll);
          el.removeEventListener('touchmove', preventScroll);
        });
        document.removeEventListener('scroll', preventScroll);
        document.removeEventListener('wheel', preventScroll);
        document.removeEventListener('touchmove', preventScroll);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
    }
  }, [shouldDisableScrolling]);

  const shouldShowTour = useCallback(() => {
    return !checkTourPreference();
  }, [checkTourPreference]);

  const isTourActive = useCallback(() => {
    return run;
  }, [run]);

  return (
    <DrinfoSummaryTourContext.Provider value={{ 
      startTour, 
      stopTour, 
      run, 
      setStepIndex, 
      nextStep, 
      prevStep, 
      handleBackButton,
      checkTourPreference,
      forceStartTour,
      resetTourPreference,
      shouldShowTour,
      saveTourPreference,
      isTourActive
    }}>
      <Joyride
        steps={drinfoSummaryTourSteps as any}
        run={run}
        stepIndex={stepIndex}
        continuous
        scrollToFirstStep={false} // Completely disable Joyride's scrolling
        disableScrolling={true} // Disable Joyride's internal scrolling
        showSkipButton
        showProgress
        disableOverlayClose
        spotlightClicks
        callback={handleJoyrideCallback}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: "#3771FE",
            textColor: "#223258",
            backgroundColor: "#fff",
            arrowColor: "#fff",
          },
          tooltip: {
            backgroundColor: "#fff",
            borderRadius: "8px",
            border: "1px solid #E4ECFF",
            boxShadow: "0 4px 20px rgba(55, 113, 254, 0.15)",
          },
          buttonNext: {
            backgroundColor: "#3771FE",
            color: "#fff",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
          },
          buttonBack: {
            backgroundColor: "#E4ECFF",
            color: "#3771FE",
            borderRadius: "6px",
            fontSize: "14px",
            fontWeight: "500",
            padding: "8px 16px",
            border: "1px solid #3771FE",
          },
          buttonSkip: {
            color: "#6B7280",
            fontSize: "14px",
          },
          buttonClose: {
            color: "#6B7280",
          },
        }}
      />
      {children}
    </DrinfoSummaryTourContext.Provider>
  );
}; 