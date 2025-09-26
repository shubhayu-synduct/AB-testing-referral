import { track as vercelTrack } from '@vercel/analytics'
import { trackEvent, trackEngagement, trackSearch, trackLogin, trackSignUp } from './gtag'
import { doc, getDoc } from 'firebase/firestore'
import { getFirebaseFirestore } from './firebase'


// Function that requires userId parameter
export const checkUserCookieConsent = async (userId: string) => {
  try {
    const db = getFirebaseFirestore();
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    // console.log(`Checking cookie consent for user: ${userId}`);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const cookieConsent = userData.cookieConsent;
            
      if (cookieConsent) {
         const analytics = cookieConsent.analytics;
        //  console.log('Analytics consent:', analytics);
         return {
          analytics
        }
      } else {
        console.log('No cookie consent data found, analytics: false');
        return {
          analytics: false
        };
      }
    } else {
      console.log('User document does not exist, analytics: false');
      return {
        analytics: false
      };
    }
  } catch (error) {
    console.error("Error checking cookie consent:", error);
    return {
      analytics: false,
    };
  }
}

// Function that automatically uses the current authenticated user
export const checkCurrentUserCookieConsent = async () => {
  try {
    // Import Firebase Auth to get current user
    const { getFirebaseAuth } = await import('./firebase');
    const { onAuthStateChanged } = await import('firebase/auth');
    
    const auth = await getFirebaseAuth();
    if (!auth) {
      console.log('Auth not available');
      return { analytics: false };
    }

    // Get current user
    const currentUser = auth.currentUser;
    if (!currentUser) {
      // console.log('No authenticated user found');
      return { analytics: false };
    }

    // console.log(`Checking cookie consent for current user: ${currentUser.uid}`);
    
    // Use the existing function with the current user's ID
    return await checkUserCookieConsent(currentUser.uid);
    
  } catch (error) {
    console.error("Error checking current user cookie consent:", error);
    return { analytics: false };
  }
}

// Example usage - call this function when you need to check consent
export const getCurrentUserConsent = async () => {
  const result = await checkCurrentUserCookieConsent();
  console.log('Current user analytics consent:', result.analytics);
  return result;
};

// Global variable to store analytics consent
export let globalAnalyticsConsent: boolean = false;

// Function to update and get the global consent
export const updateGlobalConsent = async () => {
  const result = await checkCurrentUserCookieConsent();
  globalAnalyticsConsent = result.analytics;
  // console.log('Global analytics consent updated:', globalAnalyticsConsent);
  return result;
};

// Initialize on module load
updateGlobalConsent().then(() => {
  // console.log("Global analytics consent:", globalAnalyticsConsent);
});

// Helper function to check if analytics should be tracked
const shouldTrack = () => globalAnalyticsConsent;

// Enhanced analytics that tracks to both Vercel and Google Analytics
export const track = {
  // Search events
  searchQuery: (query: string, mode: string, hasUser: boolean, resultsCount?: number) => {
    if (!shouldTrack()) return;
    
    // Vercel Analytics
    vercelTrack('SearchQuerySubmitted', {
      queryLength: query.length,
      mode,
      hasUser
    })
    
    // Google Analytics
    trackSearch(query, resultsCount)
    trackEngagement('search_query', {
      search_term: query,
      mode,
      has_user: hasUser,
      query_length: query.length,
      results_count: resultsCount
    })
  },

  // Authentication events
  signUpAttempted: (method: string, provider?: string, emailProvided?: boolean) => {
    if (!shouldTrack()) return;
    
    // Vercel Analytics
    vercelTrack('SignUpAttempted', {
      method,
      ...(provider && { provider }),
      email: emailProvided ? 'provided' : 'not_provided'
    })
    
    // Google Analytics
    trackSignUp(method)
    trackEngagement('sign_up_attempted', {
      method,
      provider,
      email_provided: emailProvided
    })
  },

  signInAttempted: (method: string, provider?: string, emailProvided?: boolean) => {
    // Vercel Analytics
    if (!shouldTrack()) return;
    vercelTrack('SignInAttempted', {
      method,
      ...(provider && { provider }),
      email: emailProvided ? 'provided' : 'not_provided'
    })
    
    // Google Analytics
    trackLogin(method)
    trackEngagement('sign_in_attempted', {
      method,
      provider,
      email_provided: emailProvided
    })
  },


  // Custom events
  customEvent: (eventName: string, parameters: Record<string, any>) => {
    // Vercel Analytics
    if (!shouldTrack()) return;
    vercelTrack(eventName, parameters)
    
    // Google Analytics
    trackEngagement(eventName, parameters)
  },

  // User interaction events
  userInteraction: (interaction: string, element: string, page: string, details?: Record<string, any>) => {
    // Vercel Analytics
    if (!shouldTrack()) return;
    vercelTrack('UserInteraction', {
      interaction,
      element,
      page,
      ...details
    })
    
    // Google Analytics
    trackEngagement('user_interaction', {
      interaction_type: interaction,
      element,
      page,
      ...details
    })
  },

  // Conversion events
  conversion: (conversionType: string, value?: number, currency?: string, details?: Record<string, any>) => {
    if (!shouldTrack()) return;
    
    // Vercel Analytics
    vercelTrack('Conversion', {
      conversion_type: conversionType,
      ...(value !== undefined && { value }),
      ...(currency && { currency }),
      ...details
    })
    
    // Google Analytics
    trackEngagement('conversion', {
      conversion_type: conversionType,
      value,
      currency,
      ...details
    })
  },

  // Error tracking
  error: (errorType: string, errorMessage: string, page: string, details?: Record<string, any>) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('Error', {
      error_type: errorType,
      error_message: errorMessage,
      page,
      ...details
    })
    
    // Google Analytics
    trackEngagement('error', {
      error_type: errorType,
      error_message: errorMessage,
      page,
      ...details
    })
  },

  // ===== PAGE EVENTS =====
  pageViewed: (page: string, user: string, userCountry?: string, timestamp?: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('PageViewed', {
      page,
      user,
      userCountry: userCountry || 'unknown',
      timestamp: timestamp || new Date().toISOString()
    })
    
    // Google Analytics
    trackEngagement('page_viewed', {
      page_name: page,
      user_status: user,
      user_country: userCountry,
      timestamp: timestamp || new Date().toISOString()
    })
  },

  // ===== AUTHENTICATION EVENTS =====
  userSignupInitiated: (method: string, provider?: string, emailProvided?: boolean) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('UserSignupInitiated', {
      method,
      ...(provider && { provider }),
      email: emailProvided ? 'provided' : 'not_provided'
    })
    
    // Google Analytics
    trackEngagement('user_signup_initiated', {
      method,
      provider,
      email_provided: emailProvided
    })
  },

  userSignupCompleted: (method: string, provider?: string, userId?: string) => {
    // Vercel Analytics
    if (!shouldTrack()) return;
    vercelTrack('UserSignupCompleted', {
      method,
      ...(provider && { provider }),
      ...(userId && { userId })
    })
    
    // Google Analytics
    trackEngagement('user_signup_completed', {
      method,
      provider,
      user_id: userId
    })
  },

  userEmailVerificationSent: (email: string, method: string) => {
    // Vercel Analytics
    if (!shouldTrack()) return;
    vercelTrack('UserEmailVerificationSent', {
      email,
      method
    })
    
    // Google Analytics
    if (!shouldTrack()) return;
    trackEngagement('user_email_verification_sent', {
      email,
      method
    })
  },

  userEmailVerified: (email: string, method: string) => {
    // Vercel Analytics
    if (!shouldTrack()) return;
    vercelTrack('UserEmailVerified', {
      email,
      method
    })
    
    // Google Analytics
    trackEngagement('user_email_verified', {
      email,
      method
    })
  },

  userLoginSuccessful: (method: string, provider?: string, userId?: string) => {
    // Vercel Analytics
    if (!shouldTrack()) return;
    vercelTrack('UserLoginSuccessful', {
      method,
      ...(provider && { provider }),
      ...(userId && { userId })
    })
    
    // Google Analytics
    trackEngagement('user_login_successful', {
      method,
      provider,
      user_id: userId
    })
  },

  userLogout: (method: string, userId?: string) => {
    // Vercel Analytics
    if (!shouldTrack()) return;
    vercelTrack('UserLogout', {
      method,
      ...(userId && { userId })
    })
    
    // Google Analytics
    trackEngagement('user_logout', {
      method,
      user_id: userId
    })
  },

  userPasswordResetRequested: (email: string) => {
    // Vercel Analytics
    if (!shouldTrack()) return;
    vercelTrack('UserPasswordResetRequested', {
      email
    })
    
    // Google Analytics
    trackEngagement('user_password_reset_requested', {
      email
    })
  },

  userPasswordResetCompleted: (email: string) => {
    // Vercel Analytics
    if (!shouldTrack()) return;
    vercelTrack('UserPasswordResetCompleted', {
      email
    })
    
    // Google Analytics
    trackEngagement('user_password_reset_completed', {
      email
    })
  },

  // ===== ONBOARDING EVENTS =====
  onboardingStarted: (userId: string, method: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OnboardingStarted', {
      userId,
      method
    })
    
    // Google Analytics
    trackEngagement('onboarding_started', {
      user_id: userId,
      method
    })
  },

  onboardingStepCompleted: (step: string, userId: string, stepNumber: number) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OnboardingStepCompleted', {
      step,
      userId,
      stepNumber
    })
    
    // Google Analytics
    trackEngagement('onboarding_step_completed', {
      step,
      user_id: userId,
      step_number: stepNumber
    })
  },

  onboardingFieldFocused: (fieldName: string, userId: string, step: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OnboardingFieldFocused', {
      fieldName,
      userId,
      step
    })
    
    // Google Analytics
    trackEngagement('onboarding_field_focused', {
      field_name: fieldName,
      user_id: userId,
      step
    })
  },

  onboardingFieldChanged: (fieldName: string, userId: string, step: string, value?: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OnboardingFieldChanged', {
      fieldName,
      userId,
      step,
      ...(value && { value })
    })
    
    // Google Analytics
    trackEngagement('onboarding_field_changed', {
      field_name: fieldName,
      user_id: userId,
      step,
      value
    })
  },

  onboardingFieldCompleted: (fieldName: string, userId: string, step: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OnboardingFieldCompleted', {
      fieldName,
      userId,
      step
    })
    
    // Google Analytics
    trackEngagement('onboarding_field_completed', {
      field_name: fieldName,
      user_id: userId,
      step
    })
  },

  onboardingFieldAbandoned: (fieldName: string, userId: string, step: string, timeSpent?: number) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OnboardingFieldAbandoned', {
      fieldName,
      userId,
      step,
      ...(timeSpent && { timeSpent })
    })
    
    // Google Analytics
    trackEngagement('onboarding_field_abandoned', {
      field_name: fieldName,
      user_id: userId,
      step,
      time_spent: timeSpent
    })
  },

  onboardingDropdownOpened: (dropdownName: string, userId: string, step: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OnboardingDropdownOpened', {
      dropdownName,
      userId,
      step
    })
    
    // Google Analytics
    trackEngagement('onboarding_dropdown_opened', {
      dropdown_name: dropdownName,
      user_id: userId,
      step
    })
  },

  onboardingDropdownSelection: (dropdownName: string, selection: string, userId: string, step: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OnboardingDropdownSelection', {
      dropdownName,
      selection,
      userId,
      step
    })
    
    // Google Analytics
    trackEngagement('onboarding_dropdown_selection', {
      dropdown_name: dropdownName,
      selection,
      user_id: userId,
      step
    })
  },

  onboardingSpecialtyAdded: (specialty: string, userId: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OnboardingSpecialtyAdded', {
      specialty,
      userId
    })
    
    // Google Analytics
    trackEngagement('onboarding_specialty_added', {
      specialty,
      user_id: userId
    })
  },

  onboardingSpecialtyRemoved: (specialty: string, userId: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OnboardingSpecialtyRemoved', {
      specialty,
      userId
    })
    
    // Google Analytics
    trackEngagement('onboarding_specialty_removed', {
      specialty,
      user_id: userId
    })
  },

  onboardingTermsAccepted: (userId: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OnboardingTermsAccepted', {
      userId
    })
    
    // Google Analytics
    trackEngagement('onboarding_terms_accepted', {
      user_id: userId
    })
  },

  onboardingValidationError: (fieldName: string, errorMessage: string, userId: string, step: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OnboardingValidationError', {
      fieldName,
      errorMessage,
      userId,
      step
    })
    
    // Google Analytics
    trackEngagement('onboarding_validation_error', {
      field_name: fieldName,
      error_message: errorMessage,
      user_id: userId,
      step
    })
  },

  onboardingCompleted: (userId: string, timeSpent?: number, specialties?: string[]) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OnboardingCompleted', {
      userId,
      ...(timeSpent && { timeSpent }),
      ...(specialties && { specialties: specialties.join(',') })
    })
    
    // Google Analytics
    trackEngagement('onboarding_completed', {
      user_id: userId,
      time_spent: timeSpent,
      specialties: specialties?.join(',')
    })
  },

  onboardingSkipped: (userId: string, step?: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OnboardingSkipped', {
      userId,
      ...(step && { step })
    })
    
    // Google Analytics
    trackEngagement('onboarding_skipped', {
      user_id: userId,
      step
    })
  },

  // ===== NAVIGATION & INTERACTION EVENTS =====
  newSearchClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('NewSearchClicked', {
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('new_search_clicked', {
      user_id: userId,
      page
    })
  },

  medicalQuerySubmitted: (query: string, mode: string, userId: string, queryLength: number) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('MedicalQuerySubmitted', {
      query,
      mode,
      userId,
      queryLength
    })
    
    // Google Analytics
    trackEngagement('medical_query_submitted', {
      query,
      mode,
      user_id: userId,
      query_length: queryLength
    })
  },

  // acuteModeEnabled: (userId: string, enabled: boolean) => {
  //   if (!shouldTrack()) return;
  //   // Vercel Analytics
  //   vercelTrack('AcuteModeEnabled', {
  //     userId,
  //     enabled
  //   })
    
  //   // Google Analytics
  //   trackEngagement('acute_mode_enabled', {
  //     user_id: userId,
  //     enabled
  //   })
  // },

  libraryClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('LibraryClicked', {
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('library_clicked', {
      user_id: userId,
      page
    })
  },

  guidelinesClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('GuidelinesClicked', {
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('guidelines_clicked', {
      user_id: userId,
      page
    })
  },

  visualAbstractClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('VisualAbstractClicked', {
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('visual_abstract_clicked', {
      user_id: userId,
      page
    })
  },

  authMethodSelected: (method: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('AuthMethodSelected', {
      method,
      page
    })
    
    // Google Analytics
    trackEngagement('auth_method_selected', {
      method,
      page
    })
  },

  openReferencesSidebar: (userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OpenReferencesSidebar', {
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('open_references_sidebar', {
      user_id: userId,
      page
    })
  },

  closeReferencesSidebar: (userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('CloseReferencesSidebar', {
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('close_references_sidebar', {
      user_id: userId,
      page
    })
  },

  openGuidelineModal: (guidelineId: string, userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OpenGuidelineModal', {
      guidelineId,
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('open_guideline_modal', {
      guideline_id: guidelineId,
      user_id: userId,
      page
    })
  },

  openDrugModal: (drugName: string, userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('OpenDrugModal', {
      drugName,
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('open_drug_modal', {
      drug_name: drugName,
      user_id: userId,
      page
    })
  },

  referencesBackNavigated: (userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('ReferencesBackNavigated', {
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('references_back_navigated', {
      user_id: userId,
      page
    })
  },

  feedbackHelpfulSelected: (feedbackId: string, userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('FeedbackHelpfulSelected', {
      feedbackId,
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('feedback_helpful_selected', {
      feedback_id: feedbackId,
      user_id: userId,
      page
    })
  },

  feedbackNotHelpfulSelected: (feedbackId: string, userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('FeedbackNotHelpfulSelected', {
      feedbackId,
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('feedback_not_helpful_selected', {
      feedback_id: feedbackId,
      user_id: userId,
      page
    })
  },

  retryAnswerRequested: (queryId: string, userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('RetryAnswerRequested', {
      queryId,
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('retry_answer_requested', {
      query_id: queryId,
      user_id: userId,
      page
    })
  },

  sharePopupOpened: (contentType: string, contentId: string, userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('SharePopupOpened', {
      contentType,
      contentId,
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('share_popup_opened', {
      content_type: contentType,
      content_id: contentId,
      user_id: userId,
      page
    })
  },

  sharePopupClosed: (contentType: string, contentId: string, userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('SharePopupClosed', {
      contentType,
      contentId,
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('share_popup_closed', {
      content_type: contentType,
      content_id: contentId,
      user_id: userId,
      page
    })
  },

  // ===== ENGAGEMENT EVENTS =====
  dashboardVisited: (userId: string, userCountry?: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('DashboardVisited', {
      userId,
      userCountry: userCountry || 'unknown'
    })
    
    // Google Analytics
    trackEngagement('dashboard_visited', {
      user_id: userId,
      user_country: userCountry
    })
  },

  chatSessionStarted: (sessionId: string, userId: string, mode: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('ChatSessionStarted', {
      sessionId,
      userId,
      mode
    })
    
    // Google Analytics
    trackEngagement('chat_session_started', {
      session_id: sessionId,
      user_id: userId,
      mode
    })
  },

  messageSent: (sessionId: string, userId: string, messageType: string, messageLength: number) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('MessageSent', {
      sessionId,
      userId,
      messageType,
      messageLength
    })
    
    // Google Analytics
    trackEngagement('message_sent', {
      session_id: sessionId,
      user_id: userId,
      message_type: messageType,
      message_length: messageLength
    })
  },

  messageReceived: (sessionId: string, userId: string, responseTime?: number) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('MessageReceived', {
      sessionId,
      userId,
      ...(responseTime && { responseTime })
    })
    
    // Google Analytics
    trackEngagement('message_received', {
      session_id: sessionId,
      user_id: userId,
      response_time: responseTime
    })
  },

  chatSessionEnded: (sessionId: string, userId: string, duration?: number, messageCount?: number) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('ChatSessionEnded', {
      sessionId,
      userId,
      ...(duration && { duration }),
      ...(messageCount && { messageCount })
    })
    
    // Google Analytics
    trackEngagement('chat_session_ended', {
      session_id: sessionId,
      user_id: userId,
      duration,
      message_count: messageCount
    })
  },

  featureAccessed: (featureName: string, userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('FeatureAccessed', {
      featureName,
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('feature_accessed', {
      feature_name: featureName,
      user_id: userId,
      page
    })
  },

  formSubmitted: (formName: string, userId: string, page: string, success: boolean) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('FormSubmitted', {
      formName,
      userId,
      page,
      success
    })
    
    // Google Analytics - form_submitted event removed
    // Use specific form events instead
  },

  // ===== CONTENT EVENTS =====
  guidelineAccessed: (guidelineId: string, guidelineTitle: string, userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('GuidelineAccessed', {
      guidelineId,
      guidelineTitle,
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('guideline_accessed', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      user_id: userId,
      page
    })
  },

  drugInformationViewed: (drugName: string, drugId: string, userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('DrugInformationViewed', {
      drugName,
      drugId,
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('drug_information_viewed', {
      drug_name: drugName,
      drug_id: drugId,
      user_id: userId,
      page
    })
  },

  clinicalTrialSearched: (searchTerm: string, resultsCount: number, userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('ClinicalTrialSearched', {
      searchTerm,
      resultsCount,
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('clinical_trial_searched', {
      search_term: searchTerm,
      results_count: resultsCount,
      user_id: userId,
      page
    })
  },

  referenceClicked: (referenceId: string, referenceType: string, userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('ReferenceClicked', {
      referenceId,
      referenceType,
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('reference_clicked', {
      reference_id: referenceId,
      reference_type: referenceType,
      user_id: userId,
      page
    })
  },

  contentShared: (contentType: string, contentId: string, shareMethod: string, userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('ContentShared', {
      contentType,
      contentId,
      shareMethod,
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('content_shared', {
      content_type: contentType,
      content_id: contentId,
      share_method: shareMethod,
      user_id: userId,
      page
    })
  },

  feedbackSubmitted: (feedbackType: string, contentId: string, rating: number, userId: string, page: string) => {
    if (!shouldTrack()) return;
    // Vercel Analytics
    vercelTrack('FeedbackSubmitted', {
      feedbackType,
      contentId,
      rating,
      userId,
      page
    })
    
    // Google Analytics
    trackEngagement('feedback_submitted', {
      feedback_type: feedbackType,
      content_id: contentId,
      rating,
      user_id: userId,
      page
    })
  }
}

