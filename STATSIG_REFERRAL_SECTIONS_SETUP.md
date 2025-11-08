# Statsig Referral Sections A/B Test Setup Guide

## Overview

This document provides step-by-step instructions for setting up and managing the A/B test for the referral dashboard sections in the profile page. The experiment tests two color variants (blue vs green) for three sections:
- **Incentive Banner** ("Earn 1 Month Premium Free!")
- **Referral Link Section** ("Your Referral Link")
- **Stats Section** ("People Referred" and "Active Users")

The experiment tracks which variant drives more referral link generation and sharing behavior.

---

## Prerequisites

1. **Statsig Account**: You need an active Statsig account
2. **Client Key**: Your Statsig Client Key (already configured)
3. **Environment Setup**: The Statsig SDK is already integrated in the codebase

---

## Step 1: Create the Experiment in Statsig Dashboard

### 1.1 Navigate to Experiments

1. Log in to [Statsig Dashboard](https://console.statsig.com)
2. Click on **Experiments** in the left sidebar
3. Click the **+ New Experiment** button

### 1.2 Basic Experiment Configuration

Fill in the following details:

- **Experiment Name**: `referral_sections_variant`
  - ⚠️ **Important**: The name must match exactly `referral_sections_variant` (case-sensitive)
  
- **Description**: 
  ```
  A/B test for referral dashboard sections color variant. Tests blue (control) vs green (test) sections to measure referral link generation and sharing behavior. Tracks which variant drives more users to generate referral codes and share them.
  ```

- **Hypothesis**: 
  ```
  We hypothesize that the green variant of the referral sections will increase user engagement and referral link generation compared to the blue variant. Green's association with positive actions and growth may make users more likely to generate and share referral links. We expect to see a 15-25% increase in referral link generation and a 10-20% increase in sharing actions with the green variant.
  ```

- **Owner**: Select yourself or your team

### 1.3 Configure Experiment Groups

You need to create **2 groups** for this A/B test:

#### Group 1: Blue Variant (Control)
- **Group Name**: `blue`
- **Allocation**: `50%` (or your desired percentage)
- **Parameters**:
  ```json
  {
    "section_color": {
      "variant": "blue"
    }
  }
  ```
  ⚠️ **Important**: Make sure `section_color` is set as an **Object** type parameter with a `variant` property.

#### Group 2: Green Variant (Test)
- **Group Name**: `green`
- **Allocation**: `50%` (or your desired percentage)
- **Parameters**:
  ```json
  {
    "section_color": {
      "variant": "green"
    }
  }
  ```
  ⚠️ **Important**: Make sure `section_color` is set as an **Object** type parameter with a `variant` property.

**Note**: The total allocation should equal 100%. You can adjust the split (e.g., 70/30, 80/20) based on your testing strategy.

### 1.4 Set Target Population (Optional)

You can optionally target specific user segments:

- **All Users**: Leave default (applies to everyone)
- **Custom Segments**: 
  - Users with active subscriptions
  - New users only
  - Specific countries

### 1.5 Configure Metrics

Add metrics to track the experiment's impact:

1. **Primary Metrics**:
   - `referral_link_generated` - Number of users who generate a referral link
   - `referral_link_copied` - Number of users who copy their referral link
   - `referral_share_clicked` - Number of users who click share buttons

2. **Secondary Metrics**:
   - Conversion rate from viewing referral tab to generating link
   - Share platform distribution (WhatsApp, LinkedIn, Email, Native Share)
   - Time to first referral link generation

### 1.6 Save and Activate

1. Review all settings
2. Click **Save** or **Create Experiment**
3. **Activate** the experiment (toggle it ON)

---

## Step 2: Verify the Integration

### 2.1 Check Console Logs

1. Open your browser's Developer Console (F12)
2. Navigate to Profile → Referral tab
3. Look for Statsig initialization and experiment logs:
   ```
   [Referral Sections] Statsig variant: blue (or green)
   [Referral Sections] Section background class: bg-[#F4F7FF] (or bg-[#F4FFF4])
   [Referral Sections] Incentive banner gradient: bg-gradient-to-r from-[#3771FE] to-[#2A5CDB] (or green gradient)
   [Referral Sections] You should see BLUE (or GREEN) tinted sections
   ```

### 2.2 Test the Section Colors

1. Navigate to Profile → Referral tab
2. Check which variant is displayed:
   - **Blue Variant**: 
     - Incentive Banner: Blue gradient (`from-[#3771FE] to-[#2A5CDB]`)
     - Sections: Light blue background (`bg-[#F4F7FF]`)
   - **Green Variant**: 
     - Incentive Banner: Green gradient (`from-[#17B26A] to-[#0F8A4F]`)
     - Sections: Light green background (`bg-[#F4FFF4]`)

### 2.3 Test Event Tracking

1. **Generate Referral Link**:
   - Click "Generate Referral Link" button
   - Check console for: `[Referral Tracking] Event logged: referral_link_generated`

2. **Copy Referral Link**:
   - Click "Copy" button next to the referral link
   - Check console for: `[Referral Tracking] Event logged: referral_link_copied`

3. **Share Buttons**:
   - Click any share button (WhatsApp, LinkedIn, Email, More Share Options)
   - Check console for: `[Referral Tracking] Event logged: referral_share_clicked` with platform info

---

## Step 3: Monitor the Experiment

### 3.1 View Experiment Results

1. Go to **Experiments** in Statsig Dashboard
2. Click on `referral_sections_variant`
3. View the **Results** tab to see:
   - User allocation by group
   - Event counts by variant
   - Metric comparisons
   - Statistical significance

### 3.2 Key Metrics to Monitor

- **Referral Link Generation Rate**: % of users who generate a referral link
- **Referral Link Copy Rate**: % of users who copy their referral link
- **Share Click Rate**: % of users who click share buttons
- **Platform Distribution**: Which platforms users prefer for sharing
- **Conversion Funnel**: View → Generate → Copy → Share

### 3.3 Statistical Significance

- Wait for sufficient sample size (typically 100+ users per variant)
- Check p-value (< 0.05 indicates significance)
- Review confidence intervals
- Compare event rates between variants

---

## Technical Implementation Details

### Code Location

- **A/B Test Logic**: `webapp/app/dashboard/profile/page.tsx` (lines ~74-127)
- **Event Tracking**: Same file, integrated into button click handlers

### Experiment Hook Usage

```typescript
// In profile/page.tsx
const referralExperiment = useExperiment('referral_sections_variant')
const statsigClient = useStatsigClient()

// Get color variant from experiment
const referralColorObj = referralExperiment.get('section_color') as { variant?: string } | string | undefined

// Extract variant value
let referralColor: string | null = null
if (typeof referralColorObj === 'string') {
  referralColor = referralColorObj
} else if (referralColorObj && typeof referralColorObj === 'object' && 'variant' in referralColorObj) {
  referralColor = referralColorObj.variant || null
}

const referralVariant: 'blue' | 'green' | null = referralColor === 'green' ? 'green' : referralColor === 'blue' ? 'blue' : null
```

### Color Variants

**Blue Variant** (Control):
- Incentive Banner: `bg-gradient-to-r from-[#3771FE] to-[#2A5CDB]`
- Sections: `bg-[#F4F7FF]` (light blue)

**Green Variant** (Test):
- Incentive Banner: `bg-gradient-to-r from-[#17B26A] to-[#0F8A4F]`
- Sections: `bg-[#F4FFF4]` (light green)

### Event Tracking

**Event 1: Referral Link Generated**
```typescript
trackReferralEvent('referral_link_generated', {
  variant: referralVariant,
  referral_code: newCode
})
```

**Event 2: Referral Link Copied**
```typescript
trackReferralEvent('referral_link_copied', {
  variant: referralVariant,
  referral_code: referralCode
})
```

**Event 3: Share Button Clicked**
```typescript
trackReferralEvent('referral_share_clicked', {
  variant: referralVariant,
  platform: 'whatsapp' | 'linkedin' | 'email' | 'native_share',
  referral_code: referralCode
})
```

---

## Troubleshooting

### Issue: Sections not showing color variant

**Possible Causes:**
1. Statsig client key not set or incorrect
2. Experiment not activated in Statsig dashboard
3. Experiment name mismatch (must be exactly `referral_sections_variant`)
4. Parameter structure incorrect (should be object with `variant` property)

**Solutions:**
- Verify `.env.local` has correct `NEXT_PUBLIC_STATSIG_CLIENT_KEY`
- Check Statsig dashboard - is experiment active?
- Verify experiment name matches exactly
- Check parameter structure: `{ "section_color": { "variant": "blue" } }`

### Issue: Events not tracking

**Possible Causes:**
1. Statsig client not initialized
2. Variant is null (experiment not assigned)
3. Event name mismatch

**Solutions:**
- Check console for Statsig initialization errors
- Verify user is assigned to experiment (check console logs)
- Ensure `statsigClient` is available before tracking events

### Issue: Parameter type mismatch warning

**Warning**: `Parameter type mismatch. 'referral_sections_variant.section_color' was found to be type 'object'`

**Cause**: This is expected! The parameter is correctly configured as an object with `{ "variant": "blue" }` structure.

**Solution**: The code handles this correctly. The warning is informational and doesn't affect functionality.

---

## Experiment Configuration Summary

| Setting | Value |
|---------|-------|
| Experiment Name | `referral_sections_variant` |
| Type | A/B Test |
| Groups | 2 (blue, green) |
| Default Allocation | 50/50 |
| Parameter Key | `section_color` |
| Parameter Type | Object |
| Parameter Structure | `{ "variant": "blue" }` or `{ "variant": "green" }` |
| Target Population | All users (or customize) |

---

## Events Tracked

| Event Name | Description | Metadata |
|------------|------------|----------|
| `referral_link_generated` | User clicks "Generate Referral Link" | `variant`, `referral_code` |
| `referral_link_copied` | User clicks "Copy" button | `variant`, `referral_code` |
| `referral_share_clicked` | User clicks any share button | `variant`, `platform`, `referral_code` |

**Platform Values for `referral_share_clicked`:**
- `whatsapp`
- `linkedin`
- `email`
- `native_share`

---

## Success Metrics

The experiment aims to determine which variant (blue or green) drives:
1. **Higher referral link generation rate**
2. **Higher referral link copy rate**
3. **Higher share button click rate**
4. **Better overall referral engagement**

---

## Quick Reference Checklist

- [ ] Statsig account created
- [ ] Client Key configured in `.env.local`
- [ ] Experiment `referral_sections_variant` created in Statsig
- [ ] Two groups configured (blue, green) with proper object parameters
- [ ] Experiment activated
- [ ] Sections display correct color variant
- [ ] Event tracking verified in console
- [ ] Metrics configured in Statsig dashboard
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

