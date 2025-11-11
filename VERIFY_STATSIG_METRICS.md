# Verifying Statsig Metrics Configuration

## Current Issue
Metrics showing "Metric Unavailable: Control or Test Group has no units who were eligible for this metric"

## Why This Is Happening

1. **Only 1 user exposed** - Need more users to see the split
2. **That 1 user got Group B** - So Group A has 0 users (can't calculate metrics)
3. **Metrics need users in both groups** - Statsig can't compare if one group is empty

## How to Fix

### Step 1: Wait for More Exposures

After the user ID fix, you should see:
- More users being exposed
- Users split between Group A and Group B
- Metrics will start appearing once both groups have users

### Step 2: Verify Metrics Are Configured Correctly

In Statsig Dashboard → Experiments → `referral_dashboard_variant` → Metrics:

#### Metric 1: referral_link_generated
- **Event Name**: `referral_link_generated`
- **Metric Type**: Custom Event / Event Count
- **Aggregation**: Count
- **Filters**: None (or filter by `variant` parameter)

#### Metric 2: referral_link_copied
- **Event Name**: `referral_link_copied`
- **Metric Type**: Custom Event / Event Count
- **Aggregation**: Count
- **Filters**: None (or filter by `variant` parameter)

#### Metric 3: referral_share_clicked
- **Event Name**: `referral_share_clicked`
- **Metric Type**: Custom Event / Event Count
- **Aggregation**: Count
- **Filters**: None (or filter by `variant` parameter)

### Step 3: Test Event Tracking

1. **Open the Referral tab** in your app
2. **Check browser console** for these logs:
   ```
   [Referral Tracking] Event logged: referral_link_generated { variant: "A" or "B", ... }
   [Referral Tracking] Event logged: referral_link_copied { variant: "A" or "B", ... }
   [Referral Tracking] Event logged: referral_share_clicked { variant: "A" or "B", ... }
   ```

3. **Perform actions**:
   - Generate a referral link
   - Copy the referral link
   - Click a share button (WhatsApp, LinkedIn, etc.)

4. **Check Statsig Exposure Stream**:
   - Go to Statsig Dashboard → Experiments → `referral_dashboard_variant`
   - Click "Exposure Stream"
   - You should see events appearing with user IDs (not `anonymous-user`)

### Step 4: Verify Event Names Match Exactly

The event names in your code must match exactly what's configured in Statsig:

**Code sends:**
- `referral_link_generated`
- `referral_link_copied`
- `referral_share_clicked`

**Statsig metrics must be:**
- Event Name: `referral_link_generated` (exact match)
- Event Name: `referral_link_copied` (exact match)
- Event Name: `referral_share_clicked` (exact match)

⚠️ **Case-sensitive!** Must match exactly.

## Expected Timeline

1. **Immediate**: After fix, new users will get proper user IDs
2. **Within minutes**: Exposure Stream should show different user IDs
3. **Within hours**: Should see users split between A and B
4. **Once both groups have users**: Metrics will start appearing

## Quick Test Checklist

- [ ] Clear browser cache / test in incognito
- [ ] Sign in with a test account
- [ ] Check console: `[Statsig] User object: { userId: 'firebase-uid', ... }`
- [ ] Navigate to Referral tab
- [ ] Check console: `[Referral Dashboard Debug] Experiment groupName: A or B`
- [ ] Generate a referral link
- [ ] Check console: `[Referral Tracking] Event logged: referral_link_generated`
- [ ] Check Statsig Exposure Stream - should see your Firebase UID (not `anonymous-user`)
- [ ] Check Statsig Metrics - should see events appearing

## Troubleshooting

### If metrics still show "Unavailable":

1. **Check event names match exactly** (case-sensitive)
2. **Verify events are being sent** - Check console logs
3. **Check Statsig Exposure Stream** - Do you see events?
4. **Wait a few minutes** - Statsig may take time to process events
5. **Check experiment is Published** - Not Draft mode

### If all users still get Group B:

1. **Test with different user accounts** (different emails)
2. **Clear localStorage** - `localStorage.removeItem('statsig_anonymous_id')`
3. **Check console logs** - Are user IDs unique?
4. **Verify Statsig experiment allocation** - Should be 50/50

