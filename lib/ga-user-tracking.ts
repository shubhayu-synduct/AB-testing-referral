// GA4 User-ID and User Properties Tracking Service
import { setUserData, clearUserData } from './gtag'
import type { User } from 'firebase/auth'

/**
 * Fetch user properties from Firestore and set them in GA4
 * This enables powerful user segmentation and cohort analysis
 */
export const fetchAndSetUserProperties = async (user: User) => {
  try {
    const { getFirebaseFirestore } = await import('./firebase')
    const { doc, getDoc } = await import('firebase/firestore')

    const db = await getFirebaseFirestore()
    if (!db) {
      console.warn('[GA4] Firestore not available, setting User-ID only')
      setUserData(user.uid)
      return
    }

    // Fetch user document from Firestore
    const userDocRef = doc(db, 'users', user.uid)
    const userDoc = await getDoc(userDocRef)

    if (!userDoc.exists()) {
      console.warn('[GA4] User document not found, setting User-ID only')
      setUserData(user.uid)
      return
    }

    const userData = userDoc.data()

    // Calculate account age in days
    let accountAgeDays = 0
    if (userData.createdAt) {
      const createdDate = new Date(userData.createdAt)
      const today = new Date()
      accountAgeDays = Math.floor((today.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
    }

    // Prepare user properties for GA4
    const userProperties: Record<string, any> = {
      is_medical_professional: userData.isMedicalProfessional || false,
      onboarding_completed: userData.onboardingCompleted || false,
      account_age_days: accountAgeDays,
    }

    // Add specialty (first one if multiple)
    if (userData.specialties && Array.isArray(userData.specialties) && userData.specialties.length > 0) {
      userProperties.specialty = userData.specialties[0]
      userProperties.specialty_count = userData.specialties.length
    }

    // Add country if available
    if (userData.country) {
      userProperties.country = userData.country
    }

    // Add subscription information if available
    if (userData.subscriptionStatus) {
      userProperties.subscription_status = userData.subscriptionStatus
    }

    if (userData.subscriptionTier) {
      userProperties.subscription_tier = userData.subscriptionTier
    }

    // Add email verification status
    userProperties.email_verified = user.emailVerified

    // Add authentication provider
    const providers = user.providerData.map(p => p.providerId).join(',')
    userProperties.auth_provider = providers

    // Set User-ID and all properties in GA4
    setUserData(user.uid, userProperties)

    console.log('[GA4] User tracking initialized for:', user.uid)

  } catch (error) {
    console.error('[GA4] Error fetching user properties:', error)
    // Fallback: Set User-ID only
    setUserData(user.uid)
  }
}

/**
 * Clear all GA4 user data on logout
 */
export const clearGA4UserTracking = () => {
  clearUserData()
  console.log('[GA4] User tracking cleared')
}

/**
 * Update specific user properties without refetching everything
 * Useful for real-time updates (e.g., when user subscribes)
 */
export const updateUserProperty = (propertyName: string, value: any) => {
  try {
    const { setUserProperties } = require('./gtag')
    setUserProperties({ [propertyName]: value })
    console.log(`[GA4] User property updated: ${propertyName} = ${value}`)
  } catch (error) {
    console.error('[GA4] Error updating user property:', error)
  }
}
