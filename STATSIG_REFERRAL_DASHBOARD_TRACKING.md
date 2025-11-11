# Statsig A/B Testing Setup: Referral Dashboard Event Tracking

## Overview

This document provides step-by-step instructions for setting up A/B testing for the Referral Dashboard using Statsig. The test compares two dashboard variants to determine which design drives more referral link engagement.

**Variants:**
- **Variant A**: ReferralTab component (clean, minimal design)
- **Variant B**: ReferralBTab component (bold, gradient-heavy design)

## Goal

Determine which referral dashboard design (A or B) leads to more users:
1. **Copying referral links** (`referral_link_copied`)
2. **Sharing referral links** via social platforms (`referral_share_clicked`)

## Prerequisites

- Statsig account with access to create experiments
- `NEXT_PUBLIC_STATSIG_CLIENT_KEY` configured in `.env.local`
- Statsig SDK already integrated in the application (see `app/my-statsig.tsx`)

---

## Step 1: Create the Experiment in Statsig Dashboard

1. Log in to your Statsig dashboard
2. Navigate to **Experiments** → **Create New Experiment**
3. Fill in the experiment details:

### Basic Information

- **Experiment Name**: `ab-testing-referral`
- **Description**: "A/B test comparing two referral dashboard designs to determine which variant drives more referral link copying and sharing"
- **Hypothesis**: 
  - "Variant B's bold gradient design will increase engagement and lead to more referral link shares compared to Variant A's minimal design"
  - OR
  - "Variant A's clean, minimal design will reduce friction and lead to more referral link copying and sharing compared to Variant B's bold design"

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

---

## Step 2: Configure Primary Metrics

In the Statsig dashboard, set up the following **two** custom events as primary metrics:

### How to Add Primary Metrics in Statsig Dashboard

1. **Navigate to your experiment**: Go to **Experiments** → `ab-testing-referral`

2. **Find the Metrics Section**: Look for a section called "Metrics", "Primary Metrics", or "Success Metrics" in the experiment configuration page

3. **Add Custom Events as Metrics**:

   Click "Add Metric" or "Create Metric" and add the following two events:

   #### Metric 1: Referral Link Copied
   - **Metric Name**: `referral_link_copied`
   - **Event Name**: `referral_link_copied` (exact match, case-sensitive)
   - **Metric Type**: Custom Event / Event Count
   - **Description**: "User clicked 'Copy' button to copy referral link to clipboard"
   - **Aggregation**: Count (total number of events)
   - **Optional Filters**: Filter by `variant` parameter to compare A vs B

   #### Metric 2: Referral Share Clicked
   - **Metric Name**: `referral_share_clicked`
   - **Event Name**: `referral_share_clicked` (exact match, case-sensitive)
   - **Metric Type**: Custom Event / Event Count
   - **Description**: "User clicked any share button (WhatsApp, LinkedIn, Email, Twitter, Facebook, SMS, or Native Share)"
   - **Aggregation**: Count (total number of events)
   - **Optional Filters**: 
     - Filter by `variant` parameter to compare A vs B
     - Optionally filter by `platform` to see which platforms are most used

4. **Set as Primary Metrics**: Mark both metrics as "Primary" or "Success Metrics" so they appear prominently in the experiment results

### Event Metadata Available

Each event includes the following metadata that you can use for filtering/segmentation:

**For `referral_link_copied`:**
- **`variant`**: "A" or "B" (always included)
- **`referral_code`**: The user's referral code (always included)

**For `referral_share_clicked`:**
- **`variant`**: "A" or "B" (always included)
- **`referral_code`**: The user's referral code (always included)
- **`platform`**: The sharing platform (whatsapp, linkedin, email, twitter, facebook, sms, native_share)

### Success Criteria

- **Primary Goal**: Which variant leads to more referral link shares? (Track via `referral_share_clicked`)
- **Secondary Goal**: Which variant has higher referral link copy rate? (Track via `referral_link_copied`)

---

## Step 3: Code Implementation (Already Done)

The code has been implemented in the following files:

### Files Modified

1. **`app/dashboard/profile/page.tsx`**
   - Added `ab-testing-referral` experiment
   - Single "Referral" tab with conditional rendering based on Statsig variant
   - Passes `statsigClient` and `dashboardVariant` props to components

2. **`ReferralTab.tsx`** (Variant A)
   - Added `statsigClient` and `dashboardVariant` props
   - Added event tracking for:
     - `referral_link_copied` (on copy button click)
     - `referral_share_clicked` (on all share button clicks)

3. **`ReferralBTab.tsx`** (Variant B)
   - Added `statsigClient` and `dashboardVariant` props
   - Added event tracking for:
     - `referral_link_copied` (on copy button click)
     - `referral_share_clicked` (on all share button clicks)

### How It Works

1. When user opens "Referral" tab, the code checks Statsig experiment
2. Statsig returns `dashboard_variant` parameter with value `{ "variant": "A" }` or `{ "variant": "B" }`
3. Based on the variant, either `ReferralTab` (A) or `ReferralBTab` (B) is rendered
4. All user actions (copy, share) are tracked with the variant information

---

## Step 4: Verify the Setup

### Console Logs

When you open the "Referral" tab, you should see console logs:

```
[Referral Dashboard] Statsig variant: A (or B)
[Referral Dashboard] Raw value: {variant: "A"} (or {variant: "B"})
[Referral Dashboard] Extracted variant: A (or B)
```

### Event Tracking Logs

When users interact with the dashboard, you should see:

```
[Referral Tracking] Event logged: referral_link_copied { variant: "A", referral_code: "..." }
[Referral Tracking] Event logged: referral_share_clicked { variant: "A", platform: "whatsapp", referral_code: "..." }
```

---

## Step 5: How to Calculate A/B Testing Statistics

### Understanding the Metrics

To properly measure the effectiveness of each variant, you need to calculate:

1. **Event Counts**: Total number of events per variant
2. **Conversion Rates**: Percentage of users who performed the action
3. **Statistical Significance**: Whether the difference between variants is meaningful

### Metric 1: Referral Link Copied

#### Calculation Methods

**Method 1: Raw Event Count**
- Simply count the total number of `referral_link_copied` events for each variant
- **Formula**: Count of events where `variant = "A"` vs `variant = "B"`

**Method 2: Conversion Rate (Recommended)**
- Calculate the percentage of users who copied the link
- **Formula**: 
  ```
  Conversion Rate = (Users who copied link / Total users who viewed referral tab) × 100
  ```
- **In Statsig**: Create a conversion metric by dividing `referral_link_copied` count by the number of users exposed to the experiment

**Method 3: Per-User Event Rate**
- Calculate average number of copy events per user
- **Formula**: 
  ```
  Average Copies per User = Total copy events / Total users in variant
  ```

### Metric 2: Referral Share Clicked

#### Calculation Methods

**Method 1: Raw Event Count**
- Count total number of `referral_share_clicked` events for each variant
- **Formula**: Count of events where `variant = "A"` vs `variant = "B"`

**Method 2: Conversion Rate (Recommended)**
- Calculate the percentage of users who shared the link
- **Formula**: 
  ```
  Conversion Rate = (Users who shared link / Total users who viewed referral tab) × 100
  ```

**Method 3: Per-User Event Rate**
- Calculate average number of share events per user
- **Formula**: 
  ```
  Average Shares per User = Total share events / Total users in variant
  ```

**Method 4: Platform Breakdown**
- Analyze which platforms are most used
- Filter `referral_share_clicked` events by `platform` parameter
- Compare platform distribution between Variant A and Variant B

### Statistical Significance Testing

To determine if the difference between variants is statistically significant:

#### Option 1: Use Statsig's Built-in Analysis

Statsig automatically calculates:
- **P-value**: Probability that the observed difference occurred by chance
- **Confidence Intervals**: Range of likely true values
- **Statistical Significance**: Whether p-value < 0.05 (95% confidence)

**Interpretation:**
- **P-value < 0.05**: Difference is statistically significant (95% confidence)
- **P-value < 0.01**: Difference is highly significant (99% confidence)
- **P-value ≥ 0.05**: Difference is not statistically significant (could be due to chance)

#### Option 2: Manual Calculation (Chi-Square Test)

For conversion rates, use a Chi-Square test:

**Example:**
- Variant A: 100 users viewed, 20 copied link (20% conversion)
- Variant B: 100 users viewed, 30 copied link (30% conversion)

**Chi-Square Formula:**
```
χ² = Σ [(Observed - Expected)² / Expected]
```

**Expected values** (assuming no difference):
- Expected copies for A: (50 total copies / 200 total users) × 100 = 25
- Expected copies for B: (50 total copies / 200 total users) × 100 = 25

**Calculate:**
```
χ² = [(20-25)²/25] + [(30-25)²/25] + [(80-75)²/75] + [(70-75)²/75]
   = [25/25] + [25/25] + [25/75] + [25/75]
   = 1 + 1 + 0.33 + 0.33
   = 2.67
```

**Degrees of Freedom**: (rows - 1) × (columns - 1) = (2 - 1) × (2 - 1) = 1

**Check Chi-Square Table**: For df=1, χ²=2.67 gives p-value ≈ 0.10 (not significant at 95% level)

#### Option 3: Two-Proportion Z-Test

For comparing conversion rates:

**Formula:**
```
Z = (p₁ - p₂) / √[p(1-p)(1/n₁ + 1/n₂)]
```

Where:
- `p₁` = conversion rate for Variant A
- `p₂` = conversion rate for Variant B
- `p` = pooled conversion rate = (x₁ + x₂) / (n₁ + n₂)
- `n₁` = sample size for Variant A
- `n₂` = sample size for Variant B

**Example:**
- Variant A: 20/100 = 0.20 (20%)
- Variant B: 30/100 = 0.30 (30%)
- Pooled: (20+30)/(100+100) = 0.25

```
Z = (0.20 - 0.30) / √[0.25(0.75)(1/100 + 1/100)]
  = -0.10 / √[0.25(0.75)(0.02)]
  = -0.10 / √[0.00375]
  = -0.10 / 0.0612
  = -1.63
```

**Z-Score Interpretation:**
- |Z| > 1.96: Significant at 95% level
- |Z| > 2.58: Significant at 99% level
- |Z| = 1.63: Not significant at 95% level

### Recommended Analysis Approach

1. **Week 1-2: Monitor Raw Counts**
   - Track total events per variant
   - Ensure both variants are receiving traffic
   - Look for obvious differences (>20% difference)

2. **Week 2-4: Calculate Conversion Rates**
   - Use Statsig's built-in conversion rate metrics
   - Compare: (Events / Users exposed) for each variant
   - Look for statistically significant differences (p < 0.05)

3. **Week 4+: Deep Dive Analysis**
   - Analyze platform breakdown (which platforms drive more shares)
   - Segment by user characteristics (if available)
   - Calculate per-user event rates
   - Make final decision based on statistical significance

### Sample Size Requirements

To achieve statistical significance, you typically need:

- **Minimum Sample Size**: ~100-200 users per variant for basic tests
- **Recommended Sample Size**: 500-1000 users per variant for reliable results
- **High Confidence**: 2000+ users per variant for conclusive results

**Power Analysis:**
- **Effect Size**: How big of a difference you want to detect (e.g., 10% vs 15% conversion)
- **Significance Level**: Usually 0.05 (95% confidence)
- **Power**: Usually 0.80 (80% chance of detecting a real difference)

Use online calculators or Statsig's sample size calculator to determine required sample size.

---

## Step 6: Monitor Results in Statsig

1. Navigate to **Experiments** → `ab-testing-referral`
2. View the metrics dashboard to see:
   - Event counts per variant
   - Conversion rates
   - Statistical significance (p-values)
   - Confidence intervals
3. Compare performance between Variant A and Variant B

### Key Metrics to Monitor

- **Total Events**: Raw count of `referral_link_copied` and `referral_share_clicked`
- **Conversion Rate**: Percentage of users who performed the action
- **Lift**: Percentage improvement of one variant over the other
- **P-value**: Statistical significance of the difference
- **Confidence Interval**: Range of likely true values

### Decision Criteria

**Declare a Winner When:**
1. **Statistical Significance**: P-value < 0.05 (95% confidence)
2. **Practical Significance**: Difference is meaningful for your business (e.g., >10% improvement)
3. **Consistency**: Results are consistent over time (not just a one-day spike)
4. **Sample Size**: Sufficient data collected (500+ users per variant recommended)

**Don't Declare a Winner If:**
1. P-value ≥ 0.05 (difference could be due to chance)
2. Sample size is too small (<100 users per variant)
3. Results are inconsistent or fluctuating
4. Difference is too small to matter (<5% improvement)

---

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
- Check that event names match exactly: `referral_link_copied` and `referral_share_clicked` (case-sensitive)

### Issue: Wrong variant showing

**Solution**:
- Check the Statsig experiment allocation percentages
- Verify the parameter value matches exactly: `{ "variant": "A" }` or `{ "variant": "B" }`
- Check console logs to see what Statsig is returning

### Issue: No statistical significance

**Solution**:
- Ensure you have sufficient sample size (500+ users per variant recommended)
- Run the test for at least 2-4 weeks
- Check if there are external factors affecting results (marketing campaigns, feature launches, etc.)
- Consider segmenting by user characteristics if overall results are not significant

---

## Quick Reference Checklist

- [ ] Created experiment `ab-testing-referral` in Statsig
- [ ] Configured two groups: A (50%) and B (50%)
- [ ] Set `dashboard_variant` parameter as Object type with value `{ "variant": "A" }` or `{ "variant": "B" }`
- [ ] Set target population to all authenticated users
- [ ] Configured **two** primary metrics: `referral_link_copied` and `referral_share_clicked`
- [ ] Published the experiment
- [ ] Verified console logs show correct variant
- [ ] Tested event tracking by copying and sharing referral links
- [ ] Verified events appear in Statsig dashboard
- [ ] Set up monitoring for statistical significance
- [ ] Determined sample size requirements for your test

---

## Code Snippet Reference

### Getting the Variant

```typescript
const referralDashboardExperiment = useExperiment('ab-testing-referral')
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
// Copy Link
statsigClient.logEvent('referral_link_copied', {
  variant: dashboardVariant,
  referral_code: referralCode
} as any)

// Share Link (any platform)
statsigClient.logEvent('referral_share_clicked', {
  variant: dashboardVariant,
  platform: 'whatsapp', // or 'linkedin', 'email', 'twitter', 'facebook', 'sms', 'native_share'
  referral_code: referralCode
} as any)
```

---

## Best Practices

1. **Run the test for at least 2-4 weeks** to gather sufficient data
2. **Monitor daily** to ensure both variants are receiving traffic
3. **Check statistical significance** before making decisions (p < 0.05)
4. **Document any external factors** that might affect results (marketing campaigns, feature launches, etc.)
5. **Set up alerts** in Statsig for significant differences between variants
6. **Calculate conversion rates**, not just raw event counts
7. **Consider platform breakdown** to understand which sharing methods are most effective
8. **Ensure sample size** is sufficient (500+ users per variant recommended)
9. **Don't peek at results too early** - wait for statistical significance
10. **Document your hypothesis** and decision criteria before starting the test

---

## Additional Resources

- [Statsig Documentation](https://docs.statsig.com/)
- [A/B Testing Best Practices](https://www.optimizely.com/optimization-glossary/ab-testing/)
- [Statistical Significance Calculator](https://www.surveymonkey.com/mp/ab-testing-significance-calculator/)
- [Sample Size Calculator](https://www.evanmiller.org/ab-testing/sample-size.html)

