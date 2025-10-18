'use client'

import { useState } from 'react'
import { trackGA4Event } from '@/lib/gtag'

export default function GA4TestPage() {
  const [testResults, setTestResults] = useState<string[]>([])

  const addResult = (message: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`])
  }

  const testStandardEvents = () => {
    // Test standard GA4 events
    trackGA4Event('page_view', {
      page_title: 'GA4 Test Page',
      page_location: window.location.href
    })
    addResult('✅ page_view event sent')

    trackGA4Event('search', {
      search_term: 'test search query'
    })
    addResult('✅ search event sent')

    trackGA4Event('login', {
      method: 'email'
    })
    addResult('✅ login event sent')

    trackGA4Event('sign_up', {
      method: 'email'
    })
    addResult('✅ sign_up event sent')

    trackGA4Event('purchase', {
      transaction_id: 'test_123',
      value: 29.99,
      currency: 'USD'
    })
    addResult('✅ purchase event sent')

    trackGA4Event('add_to_cart', {
      currency: 'USD',
      value: 19.99,
      items: [{
        item_id: 'test_item',
        item_name: 'Test Product',
        category: 'Test Category',
        quantity: 1,
        price: 19.99
      }]
    })
    addResult('✅ add_to_cart event sent')
  }

  const testCustomEvents = () => {
    // Test custom events - removed generic custom events
    addResult('✅ Custom events test removed - using specific business events instead')
  }

  const clearResults = () => {
    setTestResults([])
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          🔬 GA4 Standard Events Test
        </h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Test Standard GA4 Events</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={testStandardEvents}
              className="px-6 py-3 bg-blue-500 text-white rounded-md hover:bg-blue-600 font-medium"
            >
              Test Standard GA4 Events
            </button>
            
            <button
              onClick={testCustomEvents}
              className="px-6 py-3 bg-green-500 text-white rounded-md hover:bg-green-600 font-medium"
            >
              Test Custom Events
            </button>
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
        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h3 className="font-semibold text-yellow-900 mb-2">⚠️ Why Events Overview Might Be Blank:</h3>
          <ul className="list-disc list-inside space-y-1 text-yellow-800 text-sm">
            <li><strong>Data Processing Delay:</strong> Events can take 4-24 hours to appear in standard reports</li>
            <li><strong>Debug Mode:</strong> Debug events might not count toward standard reports</li>
            <li><strong>Data Thresholds:</strong> GA4 may not show data if volume is too low</li>
            <li><strong>Real-time vs Processed:</strong> Realtime shows immediate data, Events Overview shows processed data</li>
          </ul>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-2">✅ How to Verify Events:</h3>
          <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
            <li><strong>DebugView:</strong> Go to GA4 → Configure → DebugView (shows events in real-time)</li>
            <li><strong>Realtime Reports:</strong> Go to Reports → Realtime (shows current activity)</li>
            <li><strong>Events Overview:</strong> Wait 4-24 hours for processed data to appear</li>
            <li><strong>Custom Reports:</strong> Create custom reports to see specific events</li>
          </ol>
        </div>
      </div>
    </div>
  )
}
