import { track as vercelTrack } from '@vercel/analytics'
import { trackGA4Event, trackEngagement, trackSearch, trackLogin, trackSignUp } from './gtag'
import { doc, getDoc } from 'firebase/firestore'
import { getFirebaseFirestore } from './firebase'

// Function that requires userId parameter
export const checkUserCookieConsent = async (userId: string) => {
  try {
    const db = getFirebaseFirestore();
    const userDocRef = doc(db, "users", userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists()) {
      const userData = userDoc.data();
      const cookieConsent = userData.cookieConsent;
            
      if (cookieConsent) {
         const analytics = cookieConsent.analytics;
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
      return { analytics: false };
    }

    // Use the existing function with the current user's ID
    return await checkUserCookieConsent(currentUser.uid);
    
  } catch (error) {
    console.error("Error checking current user cookie consent:", error);
    return { analytics: false };
  }
}

// Global variable to store analytics consent
export let globalAnalyticsConsent: boolean = false;

// Function to update and get the global consent
export const updateGlobalConsent = async () => {
  const result = await checkCurrentUserCookieConsent();
  globalAnalyticsConsent = result.analytics;
  return result;
};

// Initialize on module load
updateGlobalConsent().then(() => {
  // console.log("Global analytics consent:", globalAnalyticsConsent);
});

// Helper function to check if analytics should be tracked
const shouldTrack = () => globalAnalyticsConsent;

// Clean analytics tracking - only real user behavior events
export const track = {

  // ===== AUTHENTICATION EVENTS =====
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

  userSignupCompleted: (method: string, userId: string, provider?: string) => {
    if (!shouldTrack()) return;
    
    // Vercel Analytics
    vercelTrack('UserSignupCompleted', {
      method,
      ...(provider && { provider }),
      userId
    })
    
    // Google Analytics
    trackEngagement('user_signup_completed', {
      method,
      provider,
      user_id: userId
    })
  },

  userEmailVerificationSent: (email: string, method: string) => {
    if (!shouldTrack()) return;
    
    // Vercel Analytics
    vercelTrack('UserEmailVerificationSent', {
      email,
      method
    })
    
    // Google Analytics
    trackEngagement('user_email_verification_sent', {
      email,
      method
    })
  },

  userEmailVerified: (email: string, method: string) => {
    if (!shouldTrack()) return;
    
    // Vercel Analytics
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

  userLoginSuccessful: (method: string, userId: string, provider?: string) => {
    if (!shouldTrack()) return;
    
    // Vercel Analytics
    vercelTrack('UserLoginSuccessful', {
      method,
      ...(provider && { provider }),
      userId
    })
    
    // Google Analytics
    trackEngagement('user_login_successful', {
      method,
      provider,
      user_id: userId
    })
  },

  userLogout: (method: string, userId: string) => {
    if (!shouldTrack()) return;
    
    // Vercel Analytics
    vercelTrack('UserLogout', {
      method,
      userId
    })
    
    // Google Analytics
    trackEngagement('user_logout', {
      method,
      user_id: userId
    })
  },

  userPasswordResetRequested: (email: string) => {
    if (!shouldTrack()) return;
    
    // Vercel Analytics
    vercelTrack('UserPasswordResetRequested', {
      email
    })
    
    // Google Analytics
    trackEngagement('user_password_reset_requested', {
      email
    })
  },

  userPasswordResetCompleted: (email: string) => {
    if (!shouldTrack()) return;
    
    // Vercel Analytics
    vercelTrack('UserPasswordResetCompleted', {
      email
    })
    
    // Google Analytics
    trackEngagement('user_password_reset_completed', {
      email
    })
  },


  // ===== DASHBOARD EVENTS =====
  dashboardSearchPerformed: (query: string, mode: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('dashboard_search_performed', {
      query,
      mode,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('dashboard_search_performed', {
      query,
      mode,
      user_id: userId,
      page
    })
  },

  dashboardSuggestionClicked: (suggestion: string, userId: string, page: string) => {
    if (!shouldTrack()) return;
    
    trackEngagement('dashboard_suggestion_clicked', {
      suggestion,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('dashboard_suggestion_clicked', {
      suggestion,
      user_id: userId,
      page
    })
  },

  dashboardTourPromptShown: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('dashboard_tour_prompt_shown', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('dashboard_tour_prompt_shown', {
      user_id: userId,
      page
    })
  },

  dashboardTourAccepted: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('dashboard_tour_accepted', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('dashboard_tour_accepted', {
      user_id: userId,
      page
    })
  },

  dashboardTourDeclined: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('dashboard_tour_declined', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('dashboard_tour_declined', {
      user_id: userId,
      page
    })
  },

  dashboardModeChanged: (fromMode: string, toMode: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('dashboard_mode_changed', {
      from_mode: fromMode,
      to_mode: toMode,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('dashboard_mode_changed', {
      from_mode: fromMode,
      to_mode: toMode,
      user_id: userId,
      page
    })
  },

  // ===== DRINFO SUMMARY EVENTS =====
  drinfoSummaryPageViewed: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drinfo_summary_page_viewed', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drinfo_summary_page_viewed', {
      user_id: userId,
      page
    })
  },

  drinfoSummaryQuerySubmitted: (query: string, mode: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drinfo_summary_query_submitted', {
      query,
      mode,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drinfo_summary_query_submitted', {
      query,
      mode,
      user_id: userId,
      page
    })
  },

  drinfoSummaryFollowUpAsked: (followUpQuestion: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drinfo_summary_follow_up_asked', {
      follow_up_question: followUpQuestion,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drinfo_summary_follow_up_asked', {
      follow_up_question: followUpQuestion,
      user_id: userId,
      page
    })
  },

  drinfoSummaryCitationClicked: (citationId: string, citationTitle: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drinfo_summary_citation_clicked', {
      citation_id: citationId,
      citation_title: citationTitle,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drinfo_summary_citation_clicked', {
      citation_id: citationId,
      citation_title: citationTitle,
      user_id: userId,
      page
    })
  },

  drinfoSummaryImageGenerated: (imageCount: number, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drinfo_summary_image_generated', {
      image_count: imageCount,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drinfo_summary_image_generated', {
      image_count: imageCount,
      user_id: userId,
      page
    })
  },

  drinfoSummaryFeedbackSubmitted: (feedbackType: 'positive' | 'negative', userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drinfo_summary_feedback_submitted', {
      feedback_type: feedbackType,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drinfo_summary_feedback_submitted', {
      feedback_type: feedbackType,
      user_id: userId,
      page
    })
  },

  drinfoSummaryLikedAnswer: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drinfo_summary_liked_answer', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drinfo_summary_liked_answer', {
      user_id: userId,
      page
    })
  },

  drinfoSummaryDislikedAnswer: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drinfo_summary_disliked_answer', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drinfo_summary_disliked_answer', {
      user_id: userId,
      page
    })
  },

  drinfoSummaryClickedRetry: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drinfo_summary_clicked_retry', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drinfo_summary_clicked_retry', {
      user_id: userId,
      page
    })
  },

  drinfoSummaryShared: (shareMethod: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drinfo_summary_shared', {
      share_method: shareMethod,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drinfo_summary_shared', {
      share_method: shareMethod,
      user_id: userId,
      page
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

  // ===== SPECIFIC FORM FIELD EVENTS =====
  onboardingFirstNameEntered: (userId: string, page: string) => {
    if (!shouldTrack()) return;
    
    trackEngagement('onboarding_first_name_entered', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_first_name_entered', {
      user_id: userId,
      page
    })
  },

  onboardingLastNameEntered: (userId: string, page: string) => {
    if (!shouldTrack()) return;
    
    trackEngagement('onboarding_last_name_entered', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_last_name_entered', {
      user_id: userId,
      page
    })
  },

  onboardingInstitutionEntered: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_institution_entered', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_institution_entered', {
      user_id: userId,
      page
    })
  },

  onboardingOtherProfessionEntered: (profession: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_other_profession_entered', {
      profession,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_other_profession_entered', {
      profession,
      user_id: userId,
      page
    })
  },

  onboardingOtherPlaceOfWorkEntered: (placeOfWork: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_other_place_of_work_entered', {
      place_of_work: placeOfWork,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_other_place_of_work_entered', {
      place_of_work: placeOfWork,
      user_id: userId,
      page
    })
  },

  onboardingOtherSpecialtyEntered: (specialty: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_other_specialty_entered', {
      specialty,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_other_specialty_entered', {
      specialty,
      user_id: userId,
      page
    })
  },

  // ===== DROPDOWN EVENTS =====
  onboardingProfessionDropdownOpened: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_profession_dropdown_opened', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_profession_dropdown_opened', {
      user_id: userId,
      page
    })
  },

  onboardingProfessionSelected: (profession: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_profession_selected', {
      profession,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_profession_selected', {
      profession,
      user_id: userId,
      page
    })
  },

  onboardingExperienceDropdownOpened: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_experience_dropdown_opened', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_experience_dropdown_opened', {
      user_id: userId,
      page
    })
  },

  onboardingExperienceSelected: (experience: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_experience_selected', {
      experience,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_experience_selected', {
      experience,
      user_id: userId,
      page
    })
  },

  onboardingPlaceOfWorkDropdownOpened: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_place_of_work_dropdown_opened', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_place_of_work_dropdown_opened', {
      user_id: userId,
      page
    })
  },

  onboardingPlaceOfWorkSelected: (placeOfWork: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_place_of_work_selected', {
      place_of_work: placeOfWork,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_place_of_work_selected', {
      place_of_work: placeOfWork,
      user_id: userId,
      page
    })
  },

  onboardingSpecialtiesDropdownOpened: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_specialties_dropdown_opened', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_specialties_dropdown_opened', {
      user_id: userId,
      page
    })
  },

  onboardingSpecialtySearched: (searchTerm: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_specialty_searched', {
      search_term: searchTerm,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_specialty_searched', {
      search_term: searchTerm,
      user_id: userId,
      page
    })
  },

  onboardingSpecialtyAdded: (specialty: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_specialty_added', {
      specialty,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_specialty_added', {
      specialty,
      user_id: userId,
      page
    })
  },

  onboardingSpecialtyRemoved: (specialty: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_specialty_removed', {
      specialty,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_specialty_removed', {
      specialty,
      user_id: userId,
      page
    })
  },

  onboardingCountryDropdownOpened: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_country_dropdown_opened', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_country_dropdown_opened', {
      user_id: userId,
      page
    })
  },

  onboardingCountrySearched: (searchTerm: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_country_searched', {
      search_term: searchTerm,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_country_searched', {
      search_term: searchTerm,
      user_id: userId,
      page
    })
  },

  onboardingCountrySelected: (country: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_country_selected', {
      country,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_country_selected', {
      country,
      user_id: userId,
      page
    })
  },

  // ===== CHECKBOX EVENTS =====
  onboardingHealthcareProfessionalChecked: (isChecked: boolean, profession: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_healthcare_professional_checked', {
      is_checked: isChecked,
      profession,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_healthcare_professional_checked', {
      is_checked: isChecked,
      profession,
      user_id: userId,
      page
    })
  },

  onboardingTermsAccepted: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_terms_accepted', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_terms_accepted', {
      user_id: userId,
      page
    })
  },

  // ===== VALIDATION EVENTS =====
  onboardingValidationError: (fieldName: string, errorMessage: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('onboarding_validation_error', {
      field_name: fieldName,
      error_message: errorMessage,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('onboarding_validation_error', {
      field_name: fieldName,
      error_message: errorMessage,
      user_id: userId,
      page
    })
  },

  // ===== COMPLETION EVENTS =====
  onboardingCompleted: (userId: string, specialties?: string[], timeSpent?: number) => {
    if (!shouldTrack()) return;
    
    // Vercel Analytics
    vercelTrack('OnboardingCompleted', {
      userId,
      ...(timeSpent !== undefined && { timeSpent }),
      specialtiesCount: specialties?.length || 0
    })
    
    // Google Analytics
    trackEngagement('onboarding_completed', {
      user_id: userId,
      time_spent: timeSpent,
      specialties: specialties?.join(',')
    })
  },

  // ===== PROFILE EVENTS =====
  profilePageViewed: (userId: string, page: string) => {
    if (!shouldTrack()) return;
    
    trackEngagement('profile_page_viewed', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_page_viewed', {
      user_id: userId,
      page
    })
  },

  profileTabClicked: (tab: 'profile' | 'preferences' | 'subscription', userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('profile_tab_clicked', {
      tab,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_tab_clicked', {
      tab,
      user_id: userId,
      page
    })
  },

  // ===== PROFILE FORM EVENTS =====
  profileFieldChanged: (fieldName: string, value: string, userId: string, page: string) => {
    if (!shouldTrack()) return;
    
    trackEngagement('profile_field_changed', {
      field_name: fieldName,
      value,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_field_changed', {
      field_name: fieldName,
      value,
      user_id: userId,
      page
    })
  },

  profileCountryDropdownOpened: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('profile_country_dropdown_opened', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_country_dropdown_opened', {
      user_id: userId,
      page
    })
  },

  profileCountrySearched: (searchTerm: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('profile_country_searched', {
      search_term: searchTerm,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_country_searched', {
      search_term: searchTerm,
      user_id: userId,
      page
    })
  },

  profileCountrySelected: (country: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('profile_country_selected', {
      country,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_country_selected', {
      country,
      user_id: userId,
      page
    })
  },

  profilePlaceOfWorkDropdownOpened: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('profile_place_of_work_dropdown_opened', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_place_of_work_dropdown_opened', {
      user_id: userId,
      page
    })
  },

  profilePlaceOfWorkSearched: (searchTerm: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('profile_place_of_work_searched', {
      search_term: searchTerm,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_place_of_work_searched', {
      search_term: searchTerm,
      user_id: userId,
      page
    })
  },

  profilePlaceOfWorkSelected: (placeOfWork: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('profile_place_of_work_selected', {
      place_of_work: placeOfWork,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_place_of_work_selected', {
      place_of_work: placeOfWork,
      user_id: userId,
      page
    })
  },

  profileOtherPlaceOfWorkEntered: (placeOfWork: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('profile_other_place_of_work_entered', {
      place_of_work: placeOfWork,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_other_place_of_work_entered', {
      place_of_work: placeOfWork,
      user_id: userId,
      page
    })
  },

  profileSpecialtiesDropdownOpened: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('profile_specialties_dropdown_opened', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_specialties_dropdown_opened', {
      user_id: userId,
      page
    })
  },

  profileSpecialtySearched: (searchTerm: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('profile_specialty_searched', {
      search_term: searchTerm,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_specialty_searched', {
      search_term: searchTerm,
      user_id: userId,
      page
    })
  },

  profileSpecialtyAdded: (specialty: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('profile_specialty_added', {
      specialty,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_specialty_added', {
      specialty,
      user_id: userId,
      page
    })
  },

  profileSpecialtyRemoved: (specialty: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('profile_specialty_removed', {
      specialty,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_specialty_removed', {
      specialty,
      user_id: userId,
      page
    })
  },

  profileOtherSpecialtyEntered: (specialty: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('profile_other_specialty_entered', {
      specialty,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_other_specialty_entered', {
      specialty,
      user_id: userId,
      page
    })
  },

  profileFormSubmitted: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('profile_form_submitted', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_form_submitted', {
      user_id: userId,
      page
    })
  },

  profileFormSaved: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('profile_form_saved', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('profile_form_saved', {
      user_id: userId,
      page
    })
  },

  // ===== PREFERENCES EVENTS =====
  cookiePreferenceToggled: (preferenceType: 'analytics' | 'marketing' | 'functional', isEnabled: boolean, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('cookie_preference_toggled', {
      preference_type: preferenceType,
      is_enabled: isEnabled,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('cookie_preference_toggled', {
      preference_type: preferenceType,
      is_enabled: isEnabled,
      user_id: userId,
      page
    })
  },

  preferencesFormSubmitted: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('preferences_form_submitted', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('preferences_form_submitted', {
      user_id: userId,
      page
    })
  },

  preferencesFormSaved: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('preferences_form_saved', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('preferences_form_saved', {
      user_id: userId,
      page
    })
  },

  privacyPolicyClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('privacy_policy_clicked', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('privacy_policy_clicked', {
      user_id: userId,
      page
    })
  },

  cookiePolicyClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('cookie_policy_clicked', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('cookie_policy_clicked', {
      user_id: userId,
      page
    })
  },

  // ===== SUBSCRIPTION EVENTS =====
  billingIntervalToggled: (interval: 'monthly' | 'yearly', userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('billing_interval_toggled', {
      interval,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('billing_interval_toggled', {
      interval,
      user_id: userId,
      page
    })
  },

  subscriptionPlanSelected: (plan: string, interval: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('subscription_plan_selected', {
      plan,
      interval,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('subscription_plan_selected', {
      plan,
      interval,
      user_id: userId,
      page
    })
  },

  subscriptionPlanButtonClicked: (plan: string, interval: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('subscription_plan_button_clicked', {
      plan,
      interval,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('subscription_plan_button_clicked', {
      plan,
      interval,
      user_id: userId,
      page
    })
  },

  contactSalesClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('contact_sales_clicked', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('contact_sales_clicked', {
      user_id: userId,
      page
    })
  },

  // ===== SPECIFIC SUBSCRIPTION PLAN EVENTS =====
  studentMonthlyClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('student_monthly_clicked', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('student_monthly_clicked', {
      user_id: userId,
      page
    })
  },

  studentYearlyClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('student_yearly_clicked', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('student_yearly_clicked', {
      user_id: userId,
      page
    })
  },

  clinicianMonthlyClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('clinician_monthly_clicked', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('clinician_monthly_clicked', {
      user_id: userId,
      page
    })
  },

  clinicianYearlyClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('clinician_yearly_clicked', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('clinician_yearly_clicked', {
      user_id: userId,
      page
    })
  },

  enterpriseMonthlyClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('enterprise_monthly_clicked', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('enterprise_monthly_clicked', {
      user_id: userId,
      page
    })
  },

  enterpriseYearlyClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('enterprise_yearly_clicked', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('enterprise_yearly_clicked', {
      user_id: userId,
      page
    })
  },

  cancelSubscriptionClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('cancel_subscription_clicked', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('cancel_subscription_clicked', {
      user_id: userId,
      page
    })
  },

  cancelSubscriptionConfirmed: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('cancel_subscription_confirmed', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('cancel_subscription_confirmed', {
      user_id: userId,
      page
    })
  },

  // ===== DELETE PROFILE EVENTS =====
  deleteProfileClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('delete_profile_clicked', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('delete_profile_clicked', {
      user_id: userId,
      page
    })
  },

  deleteProfileConfirmed: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('delete_profile_confirmed', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('delete_profile_confirmed', {
      user_id: userId,
      page
    })
  },

  // ===== LIBRARY EVENTS =====
  libraryPageViewed: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('library_page_viewed', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('library_page_viewed', {
      user_id: userId,
      page
    })
  },

  libraryTabClicked: (tab: 'visual-abstracts' | 'conversations' | 'saved-guidelines', userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('library_tab_clicked', {
      tab,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('library_tab_clicked', {
      tab,
      user_id: userId,
      page
    })
  },

  // ===== VISUAL ABSTRACTS EVENTS =====
  visualAbstractViewed: (abstractId: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('visual_abstract_viewed', {
      abstract_id: abstractId,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('visual_abstract_viewed', {
      abstract_id: abstractId,
      user_id: userId,
      page
    })
  },

  visualAbstractDownloaded: (abstractId: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('visual_abstract_downloaded', {
      abstract_id: abstractId,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('visual_abstract_downloaded', {
      abstract_id: abstractId,
      user_id: userId,
      page
    })
  },

  visualAbstractDeleted: (abstractId: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('visual_abstract_deleted', {
      abstract_id: abstractId,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('visual_abstract_deleted', {
      abstract_id: abstractId,
      user_id: userId,
      page
    })
  },

  visualAbstractSelectionModeToggled: (isEnabled: boolean, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('visual_abstract_selection_mode_toggled', {
      is_enabled: isEnabled,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('visual_abstract_selection_mode_toggled', {
      is_enabled: isEnabled,
      user_id: userId,
      page
    })
  },

  visualAbstractSelected: (abstractId: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('visual_abstract_selected', {
      abstract_id: abstractId,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('visual_abstract_selected', {
      abstract_id: abstractId,
      user_id: userId,
      page
    })
  },

  visualAbstractDeselected: (abstractId: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('visual_abstract_deselected', {
      abstract_id: abstractId,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('visual_abstract_deselected', {
      abstract_id: abstractId,
      user_id: userId,
      page
    })
  },

  visualAbstractSelectAllToggled: (isSelected: boolean, count: number, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('visual_abstract_select_all_toggled', {
      is_selected: isSelected,
      count,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('visual_abstract_select_all_toggled', {
      is_selected: isSelected,
      count,
      user_id: userId,
      page
    })
  },

  visualAbstractBulkDownloaded: (count: number, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('visual_abstract_bulk_downloaded', {
      count,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('visual_abstract_bulk_downloaded', {
      count,
      user_id: userId,
      page
    })
  },

  visualAbstractBulkDeleted: (count: number, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('visual_abstract_bulk_deleted', {
      count,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('visual_abstract_bulk_deleted', {
      count,
      user_id: userId,
      page
    })
  },

  createVisualAbstractClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('create_visual_abstract_clicked', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('create_visual_abstract_clicked', {
      user_id: userId,
      page
    })
  },

  // ===== CONVERSATIONS EVENTS =====
  conversationSearched: (searchTerm: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('conversation_searched', {
      search_term: searchTerm,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('conversation_searched', {
      search_term: searchTerm,
      user_id: userId,
      page
    })
  },

  conversationSearchSuggestionClicked: (suggestion: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('conversation_search_suggestion_clicked', {
      suggestion,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('conversation_search_suggestion_clicked', {
      suggestion,
      user_id: userId,
      page
    })
  },

  conversationSearchCleared: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('conversation_search_cleared', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('conversation_search_cleared', {
      user_id: userId,
      page
    })
  },

  conversationSortChanged: (sortOption: 'newest' | 'oldest' | 'alphabetical', userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('conversation_sort_changed', {
      sort_option: sortOption,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('conversation_sort_changed', {
      sort_option: sortOption,
      user_id: userId,
      page
    })
  },

  conversationClicked: (conversationId: string, title: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('conversation_clicked', {
      conversation_id: conversationId,
      title,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('conversation_clicked', {
      conversation_id: conversationId,
      title,
      user_id: userId,
      page
    })
  },

  conversationDeleted: (conversationId: string, title: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('conversation_deleted', {
      conversation_id: conversationId,
      title,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('conversation_deleted', {
      conversation_id: conversationId,
      title,
      user_id: userId,
      page
    })
  },

  // ===== SAVED GUIDELINES EVENTS =====
  savedGuidelineViewed: (guidelineId: number, title: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('saved_guideline_viewed', {
      guideline_id: guidelineId,
      title,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('saved_guideline_viewed', {
      guideline_id: guidelineId,
      title,
      user_id: userId,
      page
    })
  },

  savedGuidelineClicked: (guidelineId: number, title: string, url: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('saved_guideline_clicked', {
      guideline_id: guidelineId,
      title,
      url,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('saved_guideline_clicked', {
      guideline_id: guidelineId,
      title,
      url,
      user_id: userId,
      page
    })
  },

  savedGuidelineRemoved: (guidelineId: number, title: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('saved_guideline_removed', {
      guideline_id: guidelineId,
      title,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('saved_guideline_removed', {
      guideline_id: guidelineId,
      title,
      user_id: userId,
      page
    })
  },

  savedGuidelineAISummaryClicked: (guidelineId: number, title: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('saved_guideline_ai_summary_clicked', {
      guideline_id: guidelineId,
      title,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('saved_guideline_ai_summary_clicked', {
      guideline_id: guidelineId,
      title,
      user_id: userId,
      page
    })
  },

  browseGuidelinesClicked: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('browse_guidelines_clicked', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('browse_guidelines_clicked', {
      user_id: userId,
      page
    })
  },

  // ===== MODAL EVENTS =====
  visualAbstractModalOpened: (abstractId: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('visual_abstract_modal_opened', {
      abstract_id: abstractId,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('visual_abstract_modal_opened', {
      abstract_id: abstractId,
      user_id: userId,
      page
    })
  },

  visualAbstractModalClosed: (abstractId: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('visual_abstract_modal_closed', {
      abstract_id: abstractId,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('visual_abstract_modal_closed', {
      abstract_id: abstractId,
      user_id: userId,
      page
    })
  },


  // ===== VISUAL ABSTRACT GENERATOR EVENTS =====
  visualAbstractPageViewed: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('visual_abstract_page_viewed', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('visual_abstract_page_viewed', {
      user_id: userId,
      page
    })
  },

  visualAbstractGenerateClicked: (textLength: number, wordCount: number, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('visual_abstract_generate_clicked', {
      text_length: textLength,
      word_count: wordCount,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('visual_abstract_generate_clicked', {
      text_length: textLength,
      word_count: wordCount,
      user_id: userId,
      page
    })
  },

  // ===== DRUG INFORMATION EVENTS =====
  drugInformationPageViewed: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drug_information_page_viewed', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drug_information_page_viewed', {
      user_id: userId,
      page
    })
  },


  drugInformationAISearchPerformed: (searchTerm: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drug_information_ai_search_performed', {
      search_term: searchTerm,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drug_information_ai_search_performed', {
      search_term: searchTerm,
      user_id: userId,
      page
    })
  },

  drugInformationEMASearchPerformed: (searchTerm: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drug_information_ema_search_performed', {
      search_term: searchTerm,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drug_information_ema_search_performed', {
      search_term: searchTerm,
      user_id: userId,
      page
    })
  },

  drugInformationSearchButtonClicked: (searchTerm: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drug_information_search_button_clicked', {
      search_term: searchTerm,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drug_information_search_button_clicked', {
      search_term: searchTerm,
      user_id: userId,
      page
    })
  },

  drugInformationSuggestionClicked: (drugName: string, searchType: 'ai_suggestion' | 'ai_search' | 'direct_brand' | 'brand_option', userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drug_information_suggestion_clicked', {
      drug_name: drugName,
      search_type: searchType,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drug_information_suggestion_clicked', {
      drug_name: drugName,
      search_type: searchType,
      user_id: userId,
      page
    })
  },

  drugInformationSuggestionViewed: (drugName: string, searchType: 'ai_suggestion' | 'ai_search' | 'direct_brand' | 'brand_option', userId: string, page: string) => {
    if (!shouldTrack()) return;
    
    trackEngagement('drug_information_suggestion_viewed', {
      drug_name: drugName,
      search_type: searchType,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drug_information_suggestion_viewed', {
      drug_name: drugName,
      search_type: searchType,
      user_id: userId,
      page
    })
  },


  // ===== DICTIONARY/ALPHABET NAVIGATION EVENTS =====
  drugInformationDictionaryUsed: (letter: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drug_information_dictionary_used', {
      letter,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drug_information_dictionary_used', {
      letter,
      user_id: userId,
      page
    })
  },


  drugInformationAlphabetLetterClicked: (letter: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drug_information_alphabet_letter_clicked', {
      letter,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drug_information_alphabet_letter_clicked', {
      letter,
      user_id: userId,
      page
    })
  },

  // ===== DRUG TABLE EVENTS =====
  drugInformationDrugClicked: (drugName: string, activeSubstances: string[], userId: string, page: string) => {
    if (!shouldTrack()) return;
    
    trackEngagement('drug_information_drug_clicked', {
      drug_name: drugName,
      active_substances: activeSubstances,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drug_information_drug_clicked', {
      drug_name: drugName,
      active_substances: activeSubstances,
      user_id: userId,
      page
    })
  },

  drugInformationDrugViewed: (drugName: string, activeSubstances: string[], userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drug_information_drug_viewed', {
      drug_name: drugName,
      active_substances: activeSubstances,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drug_information_drug_viewed', {
      drug_name: drugName,
      active_substances: activeSubstances,
      user_id: userId,
      page
    })
  },


  // ===== SEARCH RESULTS EVENTS =====
  drugInformationAISearchResultsLoaded: (searchTerm: string, resultCount: number, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drug_information_ai_search_results_loaded', {
      search_term: searchTerm,
      result_count: resultCount,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drug_information_ai_search_results_loaded', {
      search_term: searchTerm,
      result_count: resultCount,
      user_id: userId,
      page
    })
  },

  drugInformationEMASearchResultsLoaded: (searchTerm: string, resultCount: number, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drug_information_ema_search_results_loaded', {
      search_term: searchTerm,
      result_count: resultCount,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drug_information_ema_search_results_loaded', {
      search_term: searchTerm,
      result_count: resultCount,
      user_id: userId,
      page
    })
  },

  drugInformationAISearchResultsEmpty: (searchTerm: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drug_information_ai_search_results_empty', {
      search_term: searchTerm,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drug_information_ai_search_results_empty', {
      search_term: searchTerm,
      user_id: userId,
      page
    })
  },

  drugInformationEMASearchResultsEmpty: (searchTerm: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('drug_information_ema_search_results_empty', {
      search_term: searchTerm,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('drug_information_ema_search_results_empty', {
      search_term: searchTerm,
      user_id: userId,
      page
    })
  },




  // ===== GUIDELINES EVENTS =====
  guidelinesPageViewed: (userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_page_viewed', {
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_page_viewed', {
      user_id: userId,
      page
    })
  },


  guidelinesSearchPerformed: (searchTerm: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_search_performed', {
      search_term: searchTerm,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_search_performed', {
      search_term: searchTerm,
      user_id: userId,
      page
    })
  },


  guidelinesPopularSearchClicked: (searchTerm: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_popular_search_clicked', {
      search_term: searchTerm,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_popular_search_clicked', {
      search_term: searchTerm,
      user_id: userId,
      page
    })
  },

  // ===== CATEGORY EVENTS =====

  guidelinesNationalCategoryViewed: (guidelineCount: number, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_national_category_viewed', {
      guideline_count: guidelineCount,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_national_category_viewed', {
      guideline_count: guidelineCount,
      user_id: userId,
      page
    })
  },

  guidelinesEuropeCategoryViewed: (guidelineCount: number, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_europe_category_viewed', {
      guideline_count: guidelineCount,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_europe_category_viewed', {
      guideline_count: guidelineCount,
      user_id: userId,
      page
    })
  },

  guidelinesInternationalCategoryViewed: (guidelineCount: number, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_international_category_viewed', {
      guideline_count: guidelineCount,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_international_category_viewed', {
      guideline_count: guidelineCount,
      user_id: userId,
      page
    })
  },

  guidelinesUSACategoryViewed: (guidelineCount: number, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_usa_category_viewed', {
      guideline_count: guidelineCount,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_usa_category_viewed', {
      guideline_count: guidelineCount,
      user_id: userId,
      page
    })
  },

  // ===== GUIDELINE EVENTS =====

  guidelinesGuidelineViewed: (guidelineId: number, guidelineTitle: string, category: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_guideline_viewed', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      category,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_guideline_viewed', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      category,
      user_id: userId,
      page
    })
  },


  guidelinesGuidelineLinkClicked: (guidelineId: number, guidelineTitle: string, url: string, category: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_guideline_link_clicked', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      url,
      category,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_guideline_link_clicked', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      url,
      category,
      user_id: userId,
      page
    })
  },

  // ===== BOOKMARK EVENTS =====
  guidelinesBookmarkToggled: (guidelineId: number, guidelineTitle: string, isBookmarked: boolean, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_bookmark_toggled', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      is_bookmarked: isBookmarked,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_bookmark_toggled', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      is_bookmarked: isBookmarked,
      user_id: userId,
      page
    })
  },

  guidelinesBookmarkSaved: (guidelineId: number, guidelineTitle: string, category: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_bookmark_saved', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      category,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_bookmark_saved', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      category,
      user_id: userId,
      page
    })
  },

  guidelinesBookmarkRemoved: (guidelineId: number, guidelineTitle: string, category: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_bookmark_removed', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      category,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_bookmark_removed', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      category,
      user_id: userId,
      page
    })
  },


  // ===== AI SUMMARY EVENTS =====
  guidelinesAISummaryClicked: (guidelineId: number, guidelineTitle: string, category: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_ai_summary_clicked', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      category,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_ai_summary_clicked', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      category,
      user_id: userId,
      page
    })
  },

  guidelinesAISummaryModalOpened: (guidelineId: number, guidelineTitle: string, category: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_ai_summary_modal_opened', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      category,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_ai_summary_modal_opened', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      category,
      user_id: userId,
      page
    })
  },

  guidelinesAISummaryModalClosed: (guidelineId: number, guidelineTitle: string, category: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_ai_summary_modal_closed', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      category,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_ai_summary_modal_closed', {
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      category,
      user_id: userId,
      page
    })
  },

  guidelinesAISummaryCitationClicked: (citationNumber: string, guidelineId: number, guidelineTitle: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_ai_summary_citation_clicked', {
      citation_number: citationNumber,
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_ai_summary_citation_clicked', {
      citation_number: citationNumber,
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      user_id: userId,
      page
    })
  },

  guidelinesAISummaryFollowupAsked: (question: string, guidelineId: number, guidelineTitle: string, userId: string, page: string) => {
    if (!shouldTrack()) return;

    trackEngagement('guidelines_ai_summary_followup_asked', {
      question,
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      user_id: userId,
      page,
      timestamp: new Date().toISOString()
    })
    
    trackGA4Event('guidelines_ai_summary_followup_asked', {
      question,
      guideline_id: guidelineId,
      guideline_title: guidelineTitle,
      user_id: userId,
      page
    })
  },



}
