# Debugging Guide: Referral Dashboard Variant Assignment Issue

## Problem
Only variant B is being assigned to all users instead of a 50/50 split.

## Step-by-Step Debugging Process

### 1. Check Browser Console Logs

Open the browser console and navigate to the Referral tab. Look for these logs:

```
[Referral Dashboard Debug] Full experiment object: {...}
[Referral Dashboard Debug] Experiment name: referral_dashboard_variant
[Referral Dashboard Debug] Experiment groupName: A or B
[Referral Dashboard Debug] Experiment value: {...}
[Referral Dashboard Debug] Raw dashboard_variant value: {...}
[Referral Dashboard Debug] dashboard_variant type: object or string
[Referral Dashboard] Final variant decision: A or B
[Referral Dashboard] User ID: <user-id>
```

**What to check:**
- Is `groupName` always "B"?
- What does `Experiment value` show?
- What does `Raw dashboard_variant value` show?

### 2. Check Statsig Dashboard Configuration

#### A. Experiment Allocation
1. Go to Statsig Dashboard → Experiments → `referral_dashboard_variant`
2. Check the **Groups** section:
   - **Group A**: Should be 50% allocation
   - **Group B**: Should be 50% allocation
   - ⚠️ **Issue**: If Group B is 100%, that's the problem!

#### B. Parameter Configuration
1. Check **Group A** parameters:
   - Parameter Name: `dashboard_variant`
   - Parameter Type: **Object**
   - Parameter Value: `{ "variant": "A" }`
   
2. Check **Group B** parameters:
   - Parameter Name: `dashboard_variant`
   - Parameter Type: **Object**
   - Parameter Value: `{ "variant": "B" }`

#### C. Experiment Status
- Is the experiment **Published/Active**?
- Is it in **Draft** mode? (Draft experiments may not work correctly)

#### D. Target Population
- Check if there are any filters that might exclude users
- Ensure "All Users" or your target population is correctly set

### 3. Check User ID Consistency

Statsig uses user IDs to consistently assign variants. Check:

1. **Are you testing with the same user?**
   - Statsig assigns variants based on user ID
   - The same user will always get the same variant
   - **Solution**: Test with different user accounts

2. **Is the user ID being sent correctly?**
   - Check console log: `[Referral Dashboard] User ID: <user-id>`
   - Verify the user ID is not null or "anonymous-user"

### 4. Common Issues and Solutions

#### Issue 1: Experiment Not Published
**Symptom**: All users get variant B or default variant
**Solution**: 
- Go to Statsig Dashboard
- Make sure experiment is **Published** (not Draft)
- Click "Publish" if it's in draft mode

#### Issue 2: Wrong Allocation Percentages
**Symptom**: All users assigned to one variant
**Solution**:
- Check Group A and Group B allocation percentages
- Should be 50% each (or your desired split)
- Update if one is 100% and the other is 0%

#### Issue 3: Parameter Type Mismatch
**Symptom**: Variant not being read correctly
**Solution**:
- Ensure `dashboard_variant` is set as **Object** type (not String)
- Value should be: `{ "variant": "A" }` or `{ "variant": "B" }`
- Not: `"A"` or `"B"` (string)

#### Issue 4: Experiment Not Active
**Symptom**: No variant assignment, defaults to A
**Solution**:
- Check experiment status in Statsig
- Ensure it's **Active** and not paused/stopped

#### Issue 5: Caching Issue
**Symptom**: Same variant for all users
**Solution**:
- Clear browser cache
- Try incognito/private browsing
- Check if Statsig SDK is caching responses

### 5. Test with Multiple Users

1. **Create test accounts** with different user IDs
2. **Check console logs** for each user
3. **Verify** that different users get different variants
4. **Expected**: ~50% should get A, ~50% should get B

### 6. Verify Statsig SDK Connection

Check if Statsig is properly initialized:

1. Look for Statsig initialization logs in console
2. Check for any Statsig errors
3. Verify `NEXT_PUBLIC_STATSIG_CLIENT_KEY` is set correctly

### 7. Force Variant Assignment (Testing Only)

If you want to test a specific variant, you can temporarily modify the code:

```typescript
// TEMPORARY: Force variant for testing
const showDashboardVariant: 'A' | 'B' = 'A' // or 'B'
```

**⚠️ Remember to remove this after testing!**

## Quick Checklist

- [ ] Experiment is **Published** (not Draft)
- [ ] Group A allocation is **50%** (or desired %)
- [ ] Group B allocation is **50%** (or desired %)
- [ ] Parameter type is **Object** (not String)
- [ ] Parameter value is `{ "variant": "A" }` for Group A
- [ ] Parameter value is `{ "variant": "B" }` for Group B
- [ ] Experiment is **Active** (not paused)
- [ ] Testing with **different user accounts** (not same user)
- [ ] Console logs show correct variant assignment
- [ ] `NEXT_PUBLIC_STATSIG_CLIENT_KEY` is set correctly

## Expected Console Output

### For Variant A:
```
[Referral Dashboard Debug] Experiment groupName: A
[Referral Dashboard Debug] Raw dashboard_variant value: {variant: "A"}
[Referral Dashboard] Final variant decision: A
```

### For Variant B:
```
[Referral Dashboard Debug] Experiment groupName: B
[Referral Dashboard Debug] Raw dashboard_variant value: {variant: "B"}
[Referral Dashboard] Final variant decision: B
```

## Still Having Issues?

1. **Share console logs** - Copy the full console output
2. **Check Statsig Dashboard** - Screenshot the experiment configuration
3. **Verify user IDs** - Check if different users are getting different variants
4. **Check Statsig documentation** - Review Statsig's experiment setup guide

