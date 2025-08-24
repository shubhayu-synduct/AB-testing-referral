    # DR. INFO - Complete End-to-End Testing Guide

## 🎯 **Testing Overview**
This guide provides comprehensive testing scenarios for all features, buttons, and user flows in the DR. INFO medical information platform.

---

## 🚀 **Phase 1: Authentication & Onboarding Testing**

### **1.1 Email Signup Flow**
```
1. Navigate to /signup
2. Fill out complete signup form:
   - Email address
   - Password (test with various strengths)
   - Confirm password
3. Click "Sign Up" button
4. Check email verification email received
5. Click verification link in email
6. Complete onboarding form:
   - First Name
   - Last Name
   - Occupation (test all dropdown options)
   - Other Occupation (if "Other" selected)
   - Place of Work (test all dropdown options)
   - Other Place of Work (if "Other" selected)
   - Experience Level (test all options)
   - Institution
   - Specialties (test multiple selections, search functionality)
   - Other Specialty (if "Other" selected)
   - Country (test search and selection)
7. Accept Terms and Conditions checkbox
8. Click "Let's Get Started..." button
9. Verify Day 1 welcome email received
10. Verify redirect to /dashboard
```

### **1.2 Google OAuth Flow**
```
1. Navigate to /login
2. Click "Sign in with Google" button
3. Complete Google authentication popup
4. Verify auto-fill of names from Google profile
5. Complete onboarding form (should be pre-filled)
6. Verify Day 1 email sent
7. Check dashboard access
8. Test logout and re-login
```

### **1.3 Microsoft OAuth Flow**
```
1. Navigate to /login
2. Click "Sign in with Microsoft" button
3. Complete Microsoft authentication popup
4. Verify auto-fill of names from Microsoft profile
5. Complete onboarding form (should be pre-filled)
6. Verify Day 1 email sent
7. Check dashboard access
8. Test logout and re-login
```

### **1.4 Login Flow**
```
1. Navigate to /login
2. Test with valid credentials
3. Test with invalid credentials (verify error messages)
4. Test "Forgot Password" flow
5. Test "Remember Me" functionality
6. Verify redirect after successful login
```

---

## 🏠 **Phase 2: Dashboard & Navigation Testing**

### **2.1 Sidebar Navigation**
```
1. Test sidebar collapse/expand button
2. Verify all navigation items work:
   - Home button (house icon)
   - Library button (book icon) - Collection of past generated images, conversations, and bookmarked guidelines
   - Visual Abstract button (image icon) - Image generation tool
   - Drugs button - Drug database access
   - Guidelines button - Clinical guidelines access
3. Test active state highlighting
4. Test mobile sidebar behavior
5. Verify sidebar close on mobile after navigation
```

### **2.2 Main Dashboard**
```
1. Verify welcome message displays
2. Test "New Search" button functionality
3. Type in a question and check the answer
4. Verify user status indicator
5. Test responsive layout on different screen sizes
6. Test question input and answer generation
7. Verify answer formatting and citations
```

---

## 💬 **Phase 3: Chat & Default Mode Features**

### **3.1 Default/Normal Mode**
```
1. Verify default mode is active (no mode switching)
2. Type medical questions in search bar
3. Test a few question types:
   - Drug-related questions
   - Treatment protocols
   - Diagnosis questions
   - Clinical guidelines
4. Verify answer displays with:
   - Main summary
   - Sections with details
   - Citations and references
   - Follow-up suggestions
5. Test follow-up questions
6. Test answer feedback buttons (thumbs up/down)
7. Test copy answer functionality
8. Test share functionality
9. Create a visual abstract
```

### **3.2 Chat History & Persistence**
```
1. Ask multiple questions
2. Verify conversation history saves
3. Test chat share
4. Test chat deletion
5. Verify chat saves to history
6. Test conversation continuation
```

### **3.3 Visual Generation (Floating Button)**
```
1. In any chat answer, select specific text
2. Click the floating blue button (left side, lightning bolt icon)
3. Verify loading spinner appears
4. Check if SVG image generates
5. Test image overlay functionality:
   - Download as PNG button (top left)
   - Close button (top right)
   - Image display quality
6. Test without text selection (should use last message content)
7. Test button positioning on different screen sizes
8. Verify generated images are saved to Library collection
```

---

## 📚 **Phase 4: Library, Guidelines & Drug Database**

### **4.1 Guidelines Search**
```
1. Navigate to /guidelines
2. Test search functionality:
   - Type various medical terms
   - Test with specialty-specific terms
   - Test with common abbreviations
3. Verify search results display
4. Test search filters if available
5. Test pagination if implemented
```

### **4.2 Guideline Display**
```
1. Click on guideline result
2. Verify guideline content loads
3. Test markdown rendering
4. Test guideline summary modal
5. Test mobile modal responsiveness
6. Test Guideline Followup 
7. Test Guideline Bookmark
```

### **4.3 Visual Abstract Tool**
```
1. Navigate to /image-generator
2. Test image generation from text input
3. Test different types of medical content
4. Verify generated image quality
5. Test image download functionality
6. Test image sharing if available
7. Test mobile responsiveness
```

### **4.4 Library Collection**
```
1. Navigate to /dashboard (Library section)
2. Test collection of past generated images
3. Test collection of past conversations
4. Test collection of bookmarked guidelines
5. Verify items are properly organized
6. Test search within library collections
7. Test item deletion if available
```


## 📧 **Phase 5: Email Automation Testing**

### **5.1 5-Minute Interval Testing**
```
1. Complete signup/onboarding (Day 1 email)
2. Wait 5 minutes
3. Check if Day 2 email received
4. Wait another 5 minutes
5. Check if Day 3 email received
6. Continue until Day 7 (completion):
   - Day 4 email (15 minutes)
   - Day 5 email (20 minutes)
   - Day 6 email (25 minutes)
   - Day 7 email (30 minutes)
7. Verify user status changes to 'completed'
8. Check email automation status in database
```

### **5.2 Email Content Verification**
```
1. Check each email template (Day 2-7):
   - Subject line accuracy
   - Content formatting
   - Personalization (name appears correctly)
   - Unsubscribe links work
2. Test email rendering on different email clients
3. Verify email formatting on mobile devices
4. Check spam folder (ensure deliverability)
```

## 👤 **Phase 6: User Profile & Settings**

### **6.1 Profile Management**
```
1. Navigate to /dashboard/profile
2. Test profile information display
3. Test profile editing:
   - Update personal information
   - Change profile picture
   - Update contact details
4. Test save functionality
5. Verify changes persist
```

### **6.2 Password Management**
```
1. Test "Change Password" functionality
2. Test "Forgot Password" flow:
   - Request password reset
   - Check reset email received
   - Click reset link
   - Set new password
   - Verify login with new password
3. Test password strength requirements
4. Test password confirmation matching
```

### **6.3 Account Deletion**
```
1. Navigate to account deletion section
2. Test deletion confirmation flow
3. Verify deletion email sent
4. Test account reactivation if available
5. Verify data cleanup
```

---

## 📱 **Phase 7: Cross-Platform & Responsiveness**

### **7.1 Desktop Testing**
```
1. Test on various resolutions:
   - 1920x1080 (Full HD)
   - 1366x768 (HD)
   - 1440x900 (WXGA+)
2. Test on different browsers:
   - Chrome (latest)
   - Firefox (latest)
   - Safari (latest)
   - Edge (latest)
3. Test browser compatibility
4. Test keyboard navigation
```

### **7.2 Tablet Testing**
```
1. Test on tablet resolutions:
   - 768x1024 (iPad)
   - 1024x768 (iPad landscape)
   - 800x1280 (Android tablet)
2. Test touch interactions
3. Test orientation changes
4. Verify responsive breakpoints
```

### **7.3 Mobile Testing**
```
1. Test on mobile resolutions:
   - 375x667 (iPhone SE)
   - 414x896 (iPhone XR)
   - 360x640 (Android)
2. Test touch gestures:
   - Tap, swipe, pinch
   - Long press
   - Double tap
3. Test mobile-specific features
4. Verify mobile navigation
5. Test mobile modals and overlays
```

---

## 🔍 **Phase 8: Edge Cases & Error Handling**

### **8.1 Error Scenarios**
```
1. Test with invalid email formats
2. Test with very long inputs
3. Test with special characters
4. Test with empty submissions
5. Verify error messages are user-friendly
6. Test error recovery flows
```

---

## 📊 **Phase 9: Performance & Analytics**

### **9.1 Analytics & Monitoring**
```
1. Verify analytics events are logged
2. Test error logging
3. Check performance monitoring
4. Verify user behavior tracking
5. Test conversion tracking
```

---



## 📝 **Bug Reporting Template**

When reporting bugs, include:
- **Bug Title**
- **Steps to Reproduce**
- **Expected Behavior**
- **Actual Behavior**
- **Environment** (Browser, OS, Device)
- **Screenshots/Videos**
- **Console Errors**
- **Priority Level**

---

## ✅ **Definition of Done**

A feature is considered "Done" when:
- All test cases pass
- No critical bugs remain
- Mobile responsiveness verified
- Cross-browser compatibility confirmed
- Performance requirements met
- Documentation updated
- Code reviewed and approved

---

*This testing guide covers all features, buttons, and user flows in the DR. INFO application. Use this as your comprehensive testing checklist to ensure thorough coverage of all functionality.*
