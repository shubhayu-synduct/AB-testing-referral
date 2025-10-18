# Google Analytics 4 Setup Guide

## 🚀 **Complete Implementation Steps**

### **1. Environment Variables**
Add the following to your `.env.local` file:

```bash
# Google Analytics Configuration
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX

# Replace G-XXXXXXXXXX with your actual Google Analytics 4 Measurement ID
```

### **2. Get Your Google Analytics 4 Measurement ID**

1. Go to [Google Analytics](https://analytics.google.com/)
2. Create a new GA4 property or select existing one
3. Go to **Admin** → **Data Streams** → **Web**
4. Copy your **Measurement ID** (starts with G-)
5. Add it to your environment variables

### **3. Files Created/Modified**

#### **New Files:**
- `lib/gtag.ts` - Google Analytics utility functions
- `lib/analytics.ts` - Enhanced analytics (Vercel + GA4)
- `hooks/use-ga.ts` - Custom hook for GA4 tracking
- `components/GoogleAnalytics.tsx` - GA4 script component

#### **Modified Files:**
- `app/layout.tsx` - Added GoogleAnalytics component
- `app/dashboard/page.tsx` - Updated to use enhanced analytics
- `components/auth/signup-form.tsx` - Updated tracking calls
- `components/auth/signin-form.tsx` - Updated tracking calls
- `components/guidelines/guidelines.tsx` - Updated tracking calls

### **4. How to Use**

#### **Basic Event Tracking:**
```typescript
import { track } from '@/lib/analytics'

// Search tracking
track.searchQuery('diabetes treatment', 'research', true, 25)

// Authentication tracking
track.signUpAttempted('email', undefined, true)
track.signInAttempted('google', 'google')

// Page visit tracking
track.pageVisited('Dashboard', 'authenticated', 'US')

// Custom events - use specific business events instead of generic ones

// User interactions
track.userInteraction('click', 'cta_button', 'homepage', {
  button_text: 'Get Started'
})

// Conversions
track.conversion('subscription', 29.99, 'USD', {
  plan: 'pro',
  duration: 'monthly'
})
```

#### **Using the Custom Hook:**
```typescript
import { useGA } from '@/hooks/use-ga'

function MyComponent() {
  const { trackCustomEvent, trackUserAction } = useGA()

  const handleClick = () => {
    // Use specific business events instead of generic custom events
    trackUserAction('click', 'button', 'subscribe_button')
  }

  return <button onClick={handleClick}>Click me</button>
}
```

### **5. Available Event Types**

#### **Pre-built Events:**
- `searchQuery()` - Search functionality
- `signUpAttempted()` - User registration attempts
- `signInAttempted()` - User login attempts
- `pageVisited()` - Page view tracking
- `customEvent()` - Generic custom events
- `userInteraction()` - User interaction tracking
- `conversion()` - Conversion tracking
- `error()` - Error tracking

#### **Google Analytics 4 Events:**
- `search` - Search events
- `login` - Login events
- `sign_up` - Signup events
- `page_view` - Page views (automatic)
- `user_engagement` - User engagement
- `conversion` - Conversion events

### **6. Testing Your Implementation**

#### **Development Testing:**
1. Open browser DevTools → Network tab
2. Look for requests to `google-analytics.com`
3. Check Console for any GA4 errors

#### **Google Analytics DebugView:**
1. Go to GA4 → **Configure** → **DebugView**
2. Enable debug mode in your browser
3. Test your events in real-time

#### **Browser Extensions:**
- **Google Analytics Debugger** (Chrome)
- **GA4 Debug** (Chrome)
- **Google Tag Assistant** (Chrome)

### **7. Verification Steps**

1. **Check Environment Variable:**
   ```bash
   echo $NEXT_PUBLIC_GA_ID
   ```

2. **Verify Script Loading:**
   - Check Network tab for `gtag/js` requests
   - Look for `dataLayer` in Console

3. **Test Events:**
   - Perform actions that trigger events
   - Check GA4 Real-time reports
   - Verify in DebugView

### **8. Common Issues & Solutions**

#### **Issue: Events not showing in GA4**
- **Solution:** Check if `NEXT_PUBLIC_GA_ID` is set correctly
- **Solution:** Verify the Measurement ID format (G-XXXXXXXXXX)

#### **Issue: Script not loading**
- **Solution:** Check if `GoogleAnalytics` component is in layout
- **Solution:** Verify Next.js Script component is working

#### **Issue: Events showing as (not set)**
- **Solution:** Check event parameter names match GA4 requirements
- **Solution:** Use standard event names when possible

### **9. Advanced Configuration**

#### **Custom Dimensions:**
```typescript
// In gtag.ts, add custom dimensions
window.gtag('config', GA_TRACKING_ID, {
  custom_map: {
    'custom_parameter_1': 'user_type',
    'custom_parameter_2': 'subscription_status'
  }
})
```

#### **Enhanced E-commerce:**
```typescript
// Track purchases with items
track.purchase('TXN123', 99.99, 'USD', [
  {
    item_id: 'PROD001',
    item_name: 'Premium Plan',
    category: 'Subscription',
    quantity: 1,
    price: 99.99
  }
])
```

### **10. Privacy & Compliance**

- **Cookie Consent:** Already implemented in `CookieConsentBanner.tsx`
- **GDPR Compliance:** Events only track after user consent
- **Data Retention:** Configure in GA4 Admin settings

---

## ✅ **Implementation Complete!**

Your Next.js 15 app now has:
- ✅ Google Analytics 4 integration
- ✅ Dual tracking (Vercel + GA4)
- ✅ Custom event tracking
- ✅ Page view tracking
- ✅ User interaction tracking
- ✅ Privacy-compliant implementation

**Next Steps:**
1. Add your GA4 Measurement ID to environment variables
2. Test the implementation
3. Monitor events in Google Analytics console
4. Set up custom reports and goals as needed
