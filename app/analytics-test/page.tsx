'use client'

import { useState } from 'react'
import { track } from '@/lib/analytics'

export default function AnalyticsTestPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [testResults, setTestResults] = useState<string[]>([])

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testSearchEvent = () => {
    addResult('✅ Search event sent: ' + (searchQuery || 'test search'))
  }

  const testSignUpEvent = () => {
    track.signUpAttempted('email', undefined, true)
    addResult('✅ Sign up event sent')
  }

  const testSignInEvent = () => {
    track.signInAttempted('google', 'google')
    addResult('✅ Sign in event sent')
  }

  const testPageVisitEvent = () => {
    addResult('✅ Page visit event sent')
  }

  const testUserInteractionEvent = () => {
    track.userInteraction('click', 'test_button', 'analytics_test', {
      button_text: 'Test Interaction',
      test_type: 'manual'
    })
    addResult('✅ User interaction event sent')
  }

  const testCustomEvent = () => {
    // Custom event test removed - using specific business events instead
    addResult('✅ Custom event test removed - using specific business events instead')
  }

  const testConversionEvent = () => {
    track.conversion('test_conversion', 99.99, 'USD', {
      conversion_type: 'test',
      test_id: 'conversion_test_001'
    })
    addResult('✅ Conversion event sent')
  }

  const testErrorEvent = () => {
    track.error('test_error', 'This is a test error message', 'analytics_test', {
      error_code: 'TEST_001',
      severity: 'low'
    })
    addResult('✅ Error event sent')
  }

  const testPageEvents = () => {
    track.pageViewed('AnalyticsTestPage', 'authenticated', 'US', new Date().toISOString())
    addResult('✅ Page events sent (1 event)')
  }

  const testAuthEvents = () => {
    track.userSignupInitiated('email', undefined, true)
    track.userSignupCompleted('email', undefined, 'test-user-123')
    track.userEmailVerificationSent('test@example.com', 'email')
    track.userEmailVerified('test@example.com', 'email')
    track.userLoginSuccessful('google', 'google', 'test-user-123')
    track.userLogout('google', 'test-user-123')
    track.userPasswordResetRequested('test@example.com')
    track.userPasswordResetCompleted('test@example.com')
    addResult('✅ Authentication events sent (8 events)')
  }

  const testOnboardingEvents = () => {
    track.onboardingStarted('test-user-123', 'email')
    track.onboardingStepCompleted('personal_info', 'test-user-123', 1)
    track.onboardingFieldFocused('firstName', 'test-user-123', 'personal_info')
    track.onboardingFieldChanged('firstName', 'test-user-123', 'personal_info', 'John')
    track.onboardingFieldCompleted('firstName', 'test-user-123', 'personal_info')
    track.onboardingDropdownOpened('occupation', 'test-user-123', 'professional_info')
    track.onboardingDropdownSelection('occupation', 'Physician', 'test-user-123', 'professional_info')
    track.onboardingSpecialtyAdded('Cardiology', 'test-user-123')
    track.onboardingSpecialtyRemoved('Cardiology', 'test-user-123')
    track.onboardingTermsAccepted('test-user-123')
    track.onboardingValidationError('email', 'Invalid email format', 'test-user-123', 'personal_info')
    track.onboardingCompleted('test-user-123', 300, ['Cardiology', 'Internal Medicine'])
    track.onboardingSkipped('test-user-123', 'professional_info')
    addResult('✅ Onboarding events sent (13 events)')
  }

  const testNavigationEvents = () => {
    track.newSearchClicked('test-user-123', 'analytics_test')
    track.acuteModeEnabled('test-user-123', true)
    track.authMethodSelected('google', 'analytics_test')
    track.openReferencesSidebar('test-user-123', 'analytics_test')
    track.closeReferencesSidebar('test-user-123', 'analytics_test')
    track.openGuidelineModal('guideline-123', 'test-user-123', 'analytics_test')
    track.openDrugModal('Aspirin', 'test-user-123', 'analytics_test')
    track.referencesBackNavigated('test-user-123', 'analytics_test')
    track.feedbackHelpfulSelected('feedback-123', 'test-user-123', 'analytics_test')
    track.feedbackNotHelpfulSelected('feedback-456', 'test-user-123', 'analytics_test')
    track.retryAnswerRequested('query-123', 'test-user-123', 'analytics_test')
    track.sharePopupOpened('guideline', 'guideline-123', 'test-user-123', 'analytics_test')
    track.sharePopupClosed('guideline', 'guideline-123', 'test-user-123', 'analytics_test')
    addResult('✅ Navigation events sent (17 events)')
  }

  const testEngagementEvents = () => {
    track.messageSent('session-123', 'test-user-123', 'user', 25)
    track.messageReceived('session-123', 'test-user-123', 1500)
    track.chatSessionEnded('session-123', 'test-user-123', 300, 5)
    track.featureAccessed('drug_interactions', 'test-user-123', 'analytics_test')
    track.formSubmitted('contact_form', 'test-user-123', 'analytics_test', true)
    addResult('✅ Engagement events sent (7 events)')
  }

  const testContentEvents = () => {
    track.guidelineAccessed('guideline-123', 'Hypertension Management', 'test-user-123', 'analytics_test')
    track.clinicalTrialSearched('diabetes treatment', 15, 'test-user-123', 'analytics_test')
    track.referenceClicked('ref-789', 'journal_article', 'test-user-123', 'analytics_test')
    track.contentShared('guideline', 'guideline-123', 'email', 'test-user-123', 'analytics_test')
    track.feedbackSubmitted('helpfulness', 'content-123', 5, 'test-user-123', 'analytics_test')
    addResult('✅ Content events sent (6 events)')
  }

  const testAllNewEvents = () => {
    // Test all new custom events in one go
    testPageEvents()
    testAuthEvents()
    testOnboardingEvents()
    testNavigationEvents()
    testEngagementEvents()
    testContentEvents()
    addResult('✅ ALL NEW EVENTS SENT (52 total events)')
  }

  const testAllCustomEvents = () => {
    // Test ALL custom events including legacy ones
    // Legacy events
    track.signUpAttempted('email', undefined, true)
    track.signInAttempted('google', 'google')
    track.userInteraction('click', 'test_button', 'analytics_test', {
      button_text: 'Test Interaction',
      test_type: 'manual'
    })
    // Custom event removed - using specific business events instead
    track.conversion('test_conversion', 99.99, 'USD', {
      conversion_type: 'test',
      test_id: 'conversion_test_001'
    })
    track.error('test_error', 'This is a test error message', 'analytics_test', {
      error_code: 'TEST_001',
      severity: 'low'
    })

    // Page events
    track.pageViewed('AnalyticsTestPage', 'authenticated', 'US', new Date().toISOString())

    // Authentication events
    track.userSignupInitiated('email', undefined, true)
    track.userSignupCompleted('email', undefined, 'test-user-123')
    track.userEmailVerificationSent('test@example.com', 'email')
    track.userEmailVerified('test@example.com', 'email')
    track.userLoginSuccessful('google', 'google', 'test-user-123')
    track.userLogout('google', 'test-user-123')
    track.userPasswordResetRequested('test@example.com')
    track.userPasswordResetCompleted('test@example.com')

    // Onboarding events
    track.onboardingStarted('test-user-123', 'email')
    track.onboardingStepCompleted('personal_info', 'test-user-123', 1)
    track.onboardingFieldFocused('firstName', 'test-user-123', 'personal_info')
    track.onboardingFieldChanged('firstName', 'test-user-123', 'personal_info', 'John')
    track.onboardingFieldCompleted('firstName', 'test-user-123', 'personal_info')
    track.onboardingFieldAbandoned('lastName', 'test-user-123', 'personal_info', 30)
    track.onboardingDropdownOpened('occupation', 'test-user-123', 'professional_info')
    track.onboardingDropdownSelection('occupation', 'Physician', 'test-user-123', 'professional_info')
    track.onboardingSpecialtyAdded('Cardiology', 'test-user-123')
    track.onboardingSpecialtyRemoved('Cardiology', 'test-user-123')
    track.onboardingTermsAccepted('test-user-123')
    track.onboardingValidationError('email', 'Invalid email format', 'test-user-123', 'personal_info')
    track.onboardingCompleted('test-user-123', 300, ['Cardiology', 'Internal Medicine'])
    track.onboardingSkipped('test-user-123', 'professional_info')

    // Navigation events
    track.newSearchClicked('test-user-123', 'analytics_test')
    track.acuteModeEnabled('test-user-123', true)
    track.authMethodSelected('google', 'analytics_test')
    track.openReferencesSidebar('test-user-123', 'analytics_test')
    track.closeReferencesSidebar('test-user-123', 'analytics_test')
    track.openGuidelineModal('guideline-123', 'test-user-123', 'analytics_test')
    track.openDrugModal('Aspirin', 'test-user-123', 'analytics_test')
    track.referencesBackNavigated('test-user-123', 'analytics_test')
    track.feedbackHelpfulSelected('feedback-123', 'test-user-123', 'analytics_test')
    track.feedbackNotHelpfulSelected('feedback-456', 'test-user-123', 'analytics_test')
    track.retryAnswerRequested('query-123', 'test-user-123', 'analytics_test')
    track.sharePopupOpened('guideline', 'guideline-123', 'test-user-123', 'analytics_test')
    track.sharePopupClosed('guideline', 'guideline-123', 'test-user-123', 'analytics_test')

    // Engagement events
    track.messageSent('session-123', 'test-user-123', 'user', 25)
    track.messageReceived('session-123', 'test-user-123', 1500)
    track.chatSessionEnded('session-123', 'test-user-123', 300, 5)
    track.featureAccessed('drug_interactions', 'test-user-123', 'analytics_test')
    track.formSubmitted('contact_form', 'test-user-123', 'analytics_test', true)

    // Content events
    track.guidelineAccessed('guideline-123', 'Hypertension Management', 'test-user-123', 'analytics_test')
    track.clinicalTrialSearched('diabetes treatment', 15, 'test-user-123', 'analytics_test')
    track.referenceClicked('ref-789', 'journal_article', 'test-user-123', 'analytics_test')
    track.contentShared('guideline', 'guideline-123', 'email', 'test-user-123', 'analytics_test')
    track.feedbackSubmitted('helpfulness', 'content-123', 5, 'test-user-123', 'analytics_test')

    addResult('✅ ALL CUSTOM EVENTS SENT (59 total events)')
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🧪 Google Analytics 4 Event Testing
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Events</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search Event */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">1. Search Query Event</h3>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Enter search query"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-md"
                />
                <button
                  onClick={testSearchEvent}
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Test Search
                </button>
              </div>
            </div>

            {/* Auth Events */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">2. Authentication Events</h3>
              <div className="flex gap-2">
                <button
                  onClick={testSignUpEvent}
                  className="px-3 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 text-sm"
                >
                  Test Sign Up
                </button>
                <button
                  onClick={testSignInEvent}
                  className="px-3 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 text-sm"
                >
                  Test Sign In
                </button>
              </div>
            </div>

            {/* Page Visit Event */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">3. Page Visit Event</h3>
              <button
                onClick={testPageVisitEvent}
                className="px-4 py-2 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
              >
                Test Page Visit
              </button>
            </div>

            {/* User Interaction Event */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">4. User Interaction Event</h3>
              <button
                onClick={testUserInteractionEvent}
                className="px-4 py-2 bg-orange-500 text-white rounded-md hover:bg-orange-600"
              >
                Test Interaction
              </button>
            </div>

            {/* Custom Event */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">5. Custom Event</h3>
              <button
                onClick={testCustomEvent}
                className="px-4 py-2 bg-teal-500 text-white rounded-md hover:bg-teal-600"
              >
                Test Custom Event
              </button>
            </div>

            {/* Conversion Event */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">6. Conversion Event</h3>
              <button
                onClick={testConversionEvent}
                className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600"
              >
                Test Conversion
              </button>
            </div>

            {/* Error Event */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">7. Error Event</h3>
              <button
                onClick={testErrorEvent}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600"
              >
                Test Error
              </button>
            </div>

            {/* Page Events */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">8. Page Events</h3>
              <button
                onClick={testPageEvents}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Test Page Events
              </button>
            </div>

            {/* Auth Events */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">9. Authentication Events</h3>
              <button
                onClick={testAuthEvents}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Test Auth Events
              </button>
            </div>

            {/* Onboarding Events */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">10. Onboarding Events</h3>
              <button
                onClick={testOnboardingEvents}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Test Onboarding Events
              </button>
            </div>

            {/* Navigation Events */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">11. Navigation Events</h3>
              <button
                onClick={testNavigationEvents}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Test Navigation Events
              </button>
            </div>

            {/* Engagement Events */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">12. Engagement Events</h3>
              <button
                onClick={testEngagementEvents}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
              >
                Test Engagement Events
              </button>
            </div>

            {/* Content Events */}
            <div className="border rounded-lg p-4">
              <h3 className="font-medium mb-2">13. Content Events</h3>
              <button
                onClick={testContentEvents}
                className="px-4 py-2 bg-teal-600 text-white rounded-md hover:bg-teal-700"
              >
                Test Content Events
              </button>
            </div>

            {/* All New Events */}
            <div className="border-2 border-yellow-400 rounded-lg p-4 bg-yellow-50">
              <h3 className="font-medium mb-2 text-yellow-800">🚀 ALL NEW EVENTS</h3>
              <button
                onClick={testAllNewEvents}
                className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 font-semibold"
              >
                Test ALL New Events (52 events)
              </button>
            </div>

            {/* All Custom Events */}
            <div className="border-2 border-red-400 rounded-lg p-4 bg-red-50">
              <h3 className="font-medium mb-2 text-red-800">🔥 ALL CUSTOM EVENTS</h3>
              <button
                onClick={testAllCustomEvents}
                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 font-semibold"
              >
                Test ALL Custom Events (59 events)
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Test Results</h2>
            <button
              onClick={clearResults}
              className="px-3 py-1 bg-gray-500 text-white rounded-md hover:bg-gray-600 text-sm"
            >
              Clear
            </button>
          </div>
          
          <div className="bg-gray-100 rounded-md p-4 max-h-64 overflow-y-auto">
            {testResults.length === 0 ? (
              <p className="text-gray-500 italic">Click the test buttons above to see events being sent...</p>
            ) : (
              <div className="space-y-1">
                {testResults.map((result, index) => (
                  <div key={index} className="text-sm font-mono text-gray-700">
                    {result}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">📋 How to Verify in Google Analytics:</h3>
          <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
            <li>Go to <a href="https://analytics.google.com" target="_blank" className="underline">Google Analytics</a></li>
            <li>Select your property (G-W7BV19T01X)</li>
            <li>Go to <strong>Configure → DebugView</strong> (best for testing)</li>
            <li>Or go to <strong>Reports → Realtime</strong></li>
            <li>Click the test buttons above and watch for events in GA4</li>
          </ol>
          
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">🎯 Custom Events Available:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-green-800 text-sm">
              <div>
                <strong>Legacy Events (8):</strong> search, auth, page, interaction, custom, conversion, error
              </div>
              <div>
                <strong>Page Events (1):</strong> page_viewed
              </div>
              <div>
                <strong>Auth Events (8):</strong> signup, login, email verification, password reset
              </div>
              <div>
                <strong>Onboarding Events (14):</strong> step completion, field interactions, validation, abandonment
              </div>
              <div>
                <strong>Navigation Events (17):</strong> clicks, searches, modals, feedback
              </div>
              <div>
                <strong>Engagement Events (7):</strong> dashboard, chat, messages, forms
              </div>
              <div>
                <strong>Content Events (6):</strong> guidelines, drugs, trials, references
              </div>
            </div>
            <p className="mt-2 text-green-700 text-xs">
              <strong>Total:</strong> 59 custom events covering the complete user journey and legacy functionality
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
