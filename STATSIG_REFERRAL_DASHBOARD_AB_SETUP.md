# Statsig A/B Testing Setup: Referral Dashboard Variants

## Overview

This document provides step-by-step instructions for setting up A/B testing for the Referral Dashboard using Statsig. The test compares two dashboard variants:
- **Variant A**: ReferralTab component (clean, minimal design)
- **Variant B**: ReferralBTab component (bold, gradient-heavy design)

## Goal

Determine which referral dashboard design (A or B) leads to more users:
1. Generating referral links
2. Copying referral links
3. Sharing referral links via social platforms

## Prerequisites

- Statsig account with access to create experiments
- `NEXT_PUBLIC_STATSIG_CLIENT_KEY` configured in `.env.local`
- Statsig SDK already integrated in the application (see `app/my-statsig.tsx`)

## Step 1: Create the Experiment in Statsig Dashboard

1. Log in to your Statsig dashboard
2. Navigate to **Experiments** → **Create New Experiment**
3. Fill in the experiment details:

### Basic Information

- **Experiment Name**: `referral_dashboard_variant`
- **Description**: "A/B test comparing two referral dashboard designs to determine which variant drives more referral link generation, copying, and sharing"
- **Hypothesis**: 
  - Option 1: "Variant B's bold gradient design will increase engagement and lead to more referral link shares compared to Variant A's minimal design"
  - Option 2: "Variant A's clean, minimal design will reduce friction and lead to more referral link generation and copying compared to Variant B's bold design"

### Configure Groups

Create two groups:

#### Group 1: Variant A
- **Group Name**: `A`
- **Allocation**: 50% (or your desired split)
- **Parameters**:
  - Parameter Name: `dashboard_variant`
  - Parameter Type: **Object**
  - Parameter Value: 
    ```json
    {
      "variant": "A"
    }
    ```

#### Group 2: Variant B
- **Group Name**: `B`
- **Allocation**: 50% (or your desired split)
- **Parameters**:
  - Parameter Name: `dashboard_variant`
  - Parameter Type: **Object**
  - Parameter Value:
    ```json
    {
      "variant": "B"
    }
    ```

### Target Population

- **Target Users**: All authenticated users
- **ID Type**: `userID` (matches the Statsig user ID from `app/my-statsig.tsx`)

## Step 2: Configure Metrics to Monitor

In the Statsig dashboard, set up the following custom events as metrics:

### How to Add Primary Metrics in Statsig Dashboard

1. **Navigate to your experiment**: Go to **Experiments** → `referral_dashboard_variant`

2. **Find the Metrics Section**: Look for a section called "Metrics", "Primary Metrics", or "Success Metrics" in the experiment configuration page

3. **Add Custom Events as Metrics**:

   Click "Add Metric" or "Create Metric" and add the following three events:

   #### Metric 1: Referral Link Generated
   - **Metric Name**: `referral_link_generated`
   - **Event Name**: `referral_link_generated`
   - **Metric Type**: Custom Event (or Event Count)
   - **Description**: "User clicked 'Generate Referral Link' button"
   - **Aggregation**: Count (total number of events)
   - **Optional Filters**: Filter by `variant` parameter to compare A vs B

   #### Metric 2: Referral Link Copied
   - **Metric Name**: `referral_link_copied`
   - **Event Name**: `referral_link_copied`
   - **Metric Type**: Custom Event (or Event Count)
   - **Description**: "User clicked 'Copy' button to copy referral link"
   - **Aggregation**: Count (total number of events)
   - **Optional Filters**: Filter by `variant` parameter to compare A vs B

   #### Metric 3: Referral Share Clicked
   - **Metric Name**: `referral_share_clicked`
   - **Event Name**: `referral_share_clicked`
   - **Metric Type**: Custom Event (or Event Count)
   - **Description**: "User clicked any share button (WhatsApp, LinkedIn, Email, etc.)"
   - **Aggregation**: Count (total number of events)
   - **Optional Filters**: 
     - Filter by `variant` parameter to compare A vs B
     - Optionally filter by `platform` to see which platforms are most used

4. **Set as Primary Metrics**: Mark all three metrics as "Primary" or "Success Metrics" so they appear prominently in the experiment results

5. **Optional: Add Conversion Metrics**: You can also create conversion rate metrics by dividing event counts by the number of users who viewed the referral tab

### Event Metadata Available

Each event includes the following metadata that you can use for filtering/segmentation:

- **`variant`**: "A" or "B" (always included)
- **`referral_code`**: The user's referral code (always included)
- **`platform`**: Only for `referral_share_clicked` events (whatsapp, linkedin, email, twitter, facebook, sms, native_share)

### Success Criteria

- **Primary Goal**: Which variant leads to more referral link shares? (Track via `referral_share_clicked`)
- **Secondary Goals**: 
  - Which variant has higher referral link generation rate? (Track via `referral_link_generated`)
  - Which variant has higher referral link copy rate? (Track via `referral_link_copied`)

## Step 3: Code Implementation (Already Done)

The code has been implemented in the following files:

### Files Modified

1. **`app/dashboard/profile/page.tsx`**
   - Added `referral_dashboard_variant` experiment
   - Removed separate "Referral A" and "Referral B" tabs
   - Added single "Referral AB" tab with conditional rendering
   - Passes `statsigClient` and `dashboardVariant` props to components

2. **`ReferralTab.tsx`** (Variant A)
   - Added `statsigClient` and `dashboardVariant` props
   - Added event tracking for:
     - `referral_link_generated` (on generate button click)
     - `referral_link_copied` (on copy button click)
     - `referral_share_clicked` (on all share button clicks)

3. **`ReferralBTab.tsx`** (Variant B)
   - Added `statsigClient` and `dashboardVariant` props
   - Added event tracking for:
     - `referral_link_generated` (on generate button click)
     - `referral_link_copied` (on copy button click)
     - `referral_share_clicked` (on all share button clicks)

### How It Works

1. When user opens "Referral AB" tab, the code checks Statsig experiment
2. Statsig returns `dashboard_variant` parameter with value `{ "variant": "A" }` or `{ "variant": "B" }`
3. Based on the variant, either `ReferralTab` (A) or `ReferralBTab` (B) is rendered
4. All user actions (generate, copy, share) are tracked with the variant information

## Step 4: Verify the Setup

### Console Logs

When you open the "Referral AB" tab, you should see console logs:

```
[Referral Dashboard] Statsig variant: A (or B)
[Referral Dashboard] Raw value: {variant: "A"} (or {variant: "B"})
[Referral Dashboard] Extracted variant: A (or B)
```

### Event Tracking Logs

When users interact with the dashboard, you should see:

```
[Referral Tracking] Event logged: referral_link_generated { variant: "A", referral_code: "..." }
[Referral Tracking] Event logged: referral_link_copied { variant: "A", referral_code: "..." }
[Referral Tracking] Event logged: referral_share_clicked { variant: "A", platform: "whatsapp", referral_code: "..." }
```

## Step 5: Monitor Results in Statsig

1. Navigate to **Experiments** → `referral_dashboard_variant`
2. View the metrics dashboard to see:
   - Event counts per variant
   - Conversion rates
   - Statistical significance
3. Compare performance between Variant A and Variant B

## Troubleshooting

### Issue: Dashboard shows "Loading referral dashboard..."

**Solution**: 
- Check that the Statsig experiment is active and published
- Verify `dashboard_variant` parameter is correctly configured as an Object type
- Check console logs for the raw Statsig response

### Issue: Events not being tracked

**Solution**:
- Verify `statsigClient` is available (check `app/my-statsig.tsx`)
- Ensure `dashboardVariant` is not null
- Check browser console for any Statsig errors
- Verify the experiment is active in Statsig dashboard

### Issue: Wrong variant showing

**Solution**:
- Check the Statsig experiment allocation percentages
- Verify the parameter value matches exactly: `{ "variant": "A" }` or `{ "variant": "B" }`
- Check console logs to see what Statsig is returning

## Quick Reference Checklist

- [ ] Created experiment `referral_dashboard_variant` in Statsig
- [ ] Configured two groups: A (50%) and B (50%)
- [ ] Set `dashboard_variant` parameter as Object type with value `{ "variant": "A" }` or `{ "variant": "B" }`
- [ ] Set target population to all authenticated users
- [ ] Configured metrics: `referral_link_generated`, `referral_link_copied`, `referral_share_clicked`
- [ ] Published the experiment
- [ ] Verified console logs show correct variant
- [ ] Tested event tracking by generating, copying, and sharing referral links
- [ ] Verified events appear in Statsig dashboard

## Code Snippet Reference

### Getting the Variant

```typescript
const referralDashboardExperiment = useExperiment('referral_dashboard_variant')
const dashboardVariantObj = referralDashboardExperiment.get('dashboard_variant') as { variant?: string } | string | undefined

// Extract variant
let dashboardVariant: string | null = null
if (typeof dashboardVariantObj === 'string') {
  dashboardVariant = dashboardVariantObj
} else if (dashboardVariantObj && typeof dashboardVariantObj === 'object' && 'variant' in dashboardVariantObj) {
  dashboardVariant = dashboardVariantObj.variant || null
}

const showDashboardVariant: 'A' | 'B' | null = dashboardVariant === 'B' ? 'B' : dashboardVariant === 'A' ? 'A' : null
```

### Tracking Events

```typescript
// Generate Link
statsigClient.logEvent('referral_link_generated', {
  variant: dashboardVariant,
  referral_code: newCode
} as any)

// Copy Link
statsigClient.logEvent('referral_link_copied', {
  variant: dashboardVariant,
  referral_code: referralCode
} as any)

// Share Link
statsigClient.logEvent('referral_share_clicked', {
  variant: dashboardVariant,
  platform: 'whatsapp', // or 'linkedin', 'email', etc.
  referral_code: referralCode
} as any)
```

## Best Practices

1. **Run the test for at least 2-4 weeks** to gather sufficient data
2. **Monitor daily** to ensure both variants are receiving traffic
3. **Check statistical significance** before making decisions
4. **Document any external factors** that might affect results (marketing campaigns, feature launches, etc.)
5. **Set up alerts** in Statsig for significant differences between variants

