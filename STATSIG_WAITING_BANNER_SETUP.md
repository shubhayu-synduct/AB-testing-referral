# Statsig Waiting Banner A/B Test Setup Guide

## Overview

This document provides step-by-step instructions for setting up and managing the A/B test for the waiting banner component in the DrInfo AI summary feature. The experiment tests two variants of the share banner:
- **Blue Variant** (Control): Default blue gradient banner
- **Green Variant** (Test): Green gradient banner

---

## Prerequisites

1. **Statsig Account**: You need an active Statsig account
2. **Client Key**: Your Statsig Client Key (not Server Secret Key)
3. **Environment Setup**: The Statsig SDK is already integrated in the codebase

---

## Step 1: Get Your Statsig Client Key

1. Log in to your [Statsig Dashboard](https://console.statsig.com)
2. Navigate to **Settings** → **API Keys**
3. Copy your **Client API Key** (starts with `client-`)
4. **Important**: Use the Client Key, NOT the Server Secret Key

---

## Step 2: Configure Environment Variable

1. Open `.env.local` in the `webapp` directory
2. Find the line: `NEXT_PUBLIC_STATSIG_CLIENT_KEY=your-statsig-client-key-here`
3. Replace `your-statsig-client-key-here` with your actual Client Key:
   ```
   NEXT_PUBLIC_STATSIG_CLIENT_KEY=client-your-actual-key-here
   ```
4. Save the file
5. **Restart your development server** for the changes to take effect

---

## Step 3: Create the Experiment in Statsig Dashboard

### 3.1 Navigate to Experiments

1. Log in to [Statsig Dashboard](https://console.statsig.com)
2. Click on **Experiments** in the left sidebar
3. Click the **+ New Experiment** button

### 3.2 Basic Experiment Configuration

Fill in the following details:

- **Experiment Name**: `waiting_banner`
  - ⚠️ **Important**: The name must match exactly `waiting_banner` (case-sensitive)
  
- **Description**: 
  ```
  A/B test for waiting banner color variant. Tests blue (control) vs green (test) banner to measure engagement and sharing behavior.
  ```

- **Hypothesis**: 
  ```
  We hypothesize that the green variant of the waiting banner will increase user engagement and sharing behavior compared to the blue variant. Green is associated with positive actions and growth, which may make users more likely to share the app with their peers. We expect to see a 15-25% increase in share button clicks and a 10-20% increase in link copies with the green variant.
  ```

**Alternative Hypothesis Options:**

**Option 1 (Conservative):**
```
We hypothesize that changing the waiting banner color from blue to green will have a neutral to positive impact on user engagement. Green's association with positive actions may slightly increase sharing behavior, but we expect minimal difference (<10%) between variants.
```

**Option 2 (Bold):**
```
We hypothesize that the green variant will significantly outperform the blue variant in driving sharing actions. Green's psychological association with growth, success, and positive actions will make users 20-30% more likely to share the app, resulting in higher referral rates and user acquisition.
```

**Option 3 (Focused on Specific Metric):**
```
We hypothesize that the green waiting banner will increase share button click-through rates by 15-25% compared to the blue variant. The green color's positive psychological associations will make users more inclined to take action and share DR. INFO with their peers during the waiting period.
```

- **Owner**: Select yourself or your team

### 3.3 Configure Experiment Groups

You need to create **2 groups** for this A/B test:

#### Group 1: Blue Variant (Control)
- **Group Name**: `blue`
- **Allocation**: `50%` (or your desired percentage)
- **Parameters**:
  ```json
  {
    "banner_color": "blue"
  }
  ```
  ⚠️ **Important**: Make sure `banner_color` is set as a **String** type parameter, not an Object.

#### Group 2: Green Variant (Test)
- **Group Name**: `green`
- **Allocation**: `50%` (or your desired percentage)
- **Parameters**:
  ```json
  {
    "banner_color": "green"
  }
  ```
  ⚠️ **Important**: Make sure `banner_color` is set as a **String** type parameter, not an Object.

**Note**: The total allocation should equal 100%. You can adjust the split (e.g., 70/30, 80/20) based on your testing strategy.

### 3.4 Set Target Population (Optional)

You can optionally target specific user segments:

- **All Users**: Leave default (applies to everyone)
- **Custom Segments**: 
  - New users only
  - Specific countries
  - User properties (e.g., subscription tier)

### 3.5 Configure Metrics (Recommended)

Add metrics to track the experiment's impact:

1. **Primary Metrics**:
   - Banner visibility rate
   - Banner dismissal rate
   - Share button clicks (WhatsApp, LinkedIn, Email)
   - Copy link clicks

2. **Secondary Metrics**:
   - User engagement after banner display
   - Conversion to signup from shared links

### 3.6 Save and Activate

1. Review all settings
2. Click **Save** or **Create Experiment**
3. **Activate** the experiment (toggle it ON)

---

## Step 4: Verify the Integration

### 4.1 Check Console Logs

1. Open your browser's Developer Console (F12)
2. Look for Statsig initialization messages:
   ```
   Statsig initialized successfully
   ```

### 4.2 Test the Banner Display

1. Navigate to a chat session: `/dashboard/[chatId]`
2. Ask a question that triggers the DrInfo AI summary
3. Wait 2 seconds after the question is submitted
4. The waiting banner should appear
5. Check which variant is displayed:
   - **Blue**: Light blue gradient background (`#E2EAFF`)
   - **Green**: Light green gradient background (`#E2FFE2`)

### 4.3 Verify User Assignment

1. Open Browser DevTools → Console
2. Run this command to check your experiment assignment:
   ```javascript
   // This will show your current experiment assignment
   console.log('Check Statsig experiment assignment')
   ```
3. Or check the Network tab for Statsig API calls

### 4.4 Test Both Variants

To test both variants:

1. **Option A**: Use different user accounts (each user gets a consistent variant)
2. **Option B**: Temporarily modify the code to force a variant:
   ```typescript
   // In drinfo-summary.tsx, temporarily override:
   const bannerVariant = 'green' as 'blue' | 'green' // Force green
   // or
   const bannerVariant = 'blue' as 'blue' | 'green' // Force blue
   ```

---

## Step 5: Monitor the Experiment

### 5.1 View Experiment Results

1. Go to **Experiments** in Statsig Dashboard
2. Click on `waiting_banner`
3. View the **Results** tab to see:
   - User allocation by group
   - Metric comparisons
   - Statistical significance

### 5.2 Key Metrics to Monitor

- **Exposure Rate**: % of users who see the banner
- **Engagement Rate**: % of users who interact with the banner
- **Share Rate**: % of users who click share buttons
- **Conversion Rate**: % of users who sign up via shared links

### 5.3 Statistical Significance

- Wait for sufficient sample size (typically 100+ users per variant)
- Check p-value (< 0.05 indicates significance)
- Review confidence intervals

---

## Technical Implementation Details

### Code Location

- **Statsig Provider**: `webapp/app/my-statsig.tsx`
- **Banner Component**: `webapp/components/drinfo-summary/share-banner.tsx`
- **A/B Test Logic**: `webapp/components/drinfo-summary/drinfo-summary.tsx` (line ~253-256)

### Experiment Hook Usage

```typescript
// In drinfo-summary.tsx
const experiment = useExperiment('waiting_banner')
// Get banner color - handles both string and object types from Statsig
const bannerColorRaw = experiment.get('banner_color', 'blue')
const bannerColor: string = typeof bannerColorRaw === 'string' 
  ? bannerColorRaw 
  : String(bannerColorRaw || 'blue')
const bannerVariant = (bannerColor === 'green' ? 'green' : 'blue') as 'blue' | 'green'
```

### Variant Styling

**Blue Variant** (Default):
```css
background: linear-gradient(358.48deg, #FFFFFF -1.72%, #E2EAFF 103.93%)
```

**Green Variant**:
```css
background: linear-gradient(358.48deg, #FFFFFF -1.72%, #E2FFE2 103.93%)
```

---

## Troubleshooting

### Issue: Banner not appearing

**Possible Causes:**
1. Statsig client key not set or incorrect
2. Experiment not activated in Statsig dashboard
3. Experiment name mismatch (must be exactly `waiting_banner`)
4. User not in target population

**Solutions:**
- Verify `.env.local` has correct `NEXT_PUBLIC_STATSIG_CLIENT_KEY`
- Check Statsig dashboard - is experiment active?
- Verify experiment name matches exactly
- Check browser console for Statsig errors

### Issue: Always seeing same variant

**Possible Causes:**
1. User assignment is sticky (by design - users get consistent variant)
2. Experiment allocation is 100% to one group

**Solutions:**
- This is expected behavior - users are consistently assigned to one variant
- To test both variants, use different user accounts
- Check experiment allocation percentages in Statsig dashboard

### Issue: Statsig not initializing

**Possible Causes:**
1. Missing or invalid client key
2. Network issues
3. User not authenticated (will use "anonymous-user")

**Solutions:**
- Verify client key in `.env.local`
- Check network tab for failed API calls
- Ensure user is logged in for proper user tracking

### Issue: Experiment not found

**Error**: `Experiment 'waiting_banner' not found`

**Solutions:**
1. Verify experiment name is exactly `waiting_banner` (case-sensitive)
2. Ensure experiment is created and activated in Statsig dashboard
3. Wait a few minutes for experiment to propagate
4. Clear browser cache and reload

### Issue: Parameter type mismatch warning

**Warning**: `Parameter type mismatch. 'waiting_banner.banner_color' was found to be type 'object' but fallback/return type is 'string'`

**Cause**: The `banner_color` parameter in Statsig is configured as an Object type instead of a String type.

**Solutions:**
1. **In Statsig Dashboard**: 
   - Go to your experiment `waiting_banner`
   - Check the parameter configuration for `banner_color`
   - Ensure it's set as a **String** type, not Object
   - The value should be just `"blue"` or `"green"` (as strings), not `{ "value": "blue" }`

2. **If you can't change the parameter type**:
   - The code already handles this case by converting objects to strings
   - The warning is harmless but can be suppressed by fixing the parameter type in Statsig
   - The functionality will still work correctly

---

## Best Practices

1. **Start Small**: Begin with a small allocation (10-20%) to test
2. **Monitor Closely**: Watch metrics daily during initial rollout
3. **Gradual Rollout**: Increase allocation gradually (10% → 50% → 100%)
4. **Set Clear Success Criteria**: Define what "winning" means before starting
5. **Run for Sufficient Duration**: Typically 1-2 weeks minimum for statistical significance
6. **Document Learnings**: Record insights and decisions for future reference

---

## Experiment Configuration Summary

| Setting | Value |
|---------|-------|
| Experiment Name | `waiting_banner` |
| Type | A/B Test |
| Groups | 2 (blue, green) |
| Default Allocation | 50/50 |
| Parameter Key | `banner_color` |
| Parameter Values | `"blue"`, `"green"` |
| Target Population | All users (or customize) |

---

## Support and Resources

- **Statsig Documentation**: https://docs.statsig.com
- **Statsig Dashboard**: https://console.statsig.com
- **React SDK Docs**: https://docs.statsig.com/client/reactClientSDK
- **Experiment Best Practices**: https://docs.statsig.com/guides/experiments

---

## Quick Reference Checklist

- [ ] Statsig account created
- [ ] Client Key obtained from Statsig dashboard
- [ ] `NEXT_PUBLIC_STATSIG_CLIENT_KEY` added to `.env.local`
- [ ] Development server restarted
- [ ] Experiment `waiting_banner` created in Statsig
- [ ] Two groups configured (blue, green) with proper parameters
- [ ] Experiment activated
- [ ] Banner appears correctly in application
- [ ] Both variants tested and verified
- [ ] Metrics configured for tracking
- [ ] Experiment monitoring set up

---

## Next Steps After Setup

1. **Monitor Initial Results**: Watch for any errors or unexpected behavior
2. **Collect Baseline Metrics**: Establish baseline before making changes
3. **Analyze Results**: After sufficient data, analyze which variant performs better
4. **Make Decision**: Based on results, decide to:
   - Keep winning variant
   - Continue testing
   - Iterate with new variants
5. **Document Outcomes**: Record findings and decisions for team knowledge

---

**Last Updated**: November 2024
**Maintained By**: Development Team

