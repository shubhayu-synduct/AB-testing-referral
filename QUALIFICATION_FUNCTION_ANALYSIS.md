# Qualification Function Analysis

## Function: `isQualifiedForIncentive(userId: string)`

### Current Logic Flow:

1. **Checks if user document exists**
   - ✅ Returns early if user doesn't exist

2. **Checks if user has referral code**
   - ✅ Returns early if no referral code

3. **Queries referrals collection**
   - ✅ Queries `referrals` collection where `referrerUserId == userId`
   - ✅ Gets all referred user IDs

4. **Counts total referred users**
   - ✅ `totalReferred = referredUserIds.length`

5. **Counts active users**
   - ✅ Loops through each referred user
   - ✅ Checks `total_questions_asked >= 3` for each user
   - ✅ Counts users with 3+ questions as active

6. **Qualification check**
   - ✅ `isQualified = totalReferred >= 3 && activeUsers >= 3`
   - ✅ Requires BOTH conditions: at least 3 total referred AND at least 3 active users

7. **Auto-grant subscription (if qualified)**
   - ✅ Checks if user was already qualified (`referralQualified === true`)
   - ✅ Checks if user has active paid subscription (has `checkoutSessionId`)
   - ✅ Grants subscription ONLY if:
     - User is NOT already qualified (first time)
     - User does NOT have active paid subscription
   - ✅ Grants 1 month clinician subscription with proper structure

8. **Updates stats**
   - ✅ Always updates `referralTotalReferred` and `referralActiveUsers` in user document
   - ✅ Updates `referralQualified` status if qualified

### Potential Issues Found:

1. **Claim API Route Missing**
   - ❌ The claim button calls `/api/referrals/claim` but this route doesn't exist
   - ⚠️ However, subscription is already auto-granted in `isQualifiedForIncentive`, so claim button might be redundant

2. **Subscription Grant Logic**
   - ✅ Correctly prevents overwriting paid subscriptions
   - ✅ Correctly prevents duplicate grants (checks `wasAlreadyQualified`)
   - ✅ Uses proper subscription structure matching Stripe format

3. **Active User Definition**
   - ✅ Uses `total_questions_asked >= 3` (correct based on requirements)
   - ✅ Queries fresh data from database (not cached)

4. **Qualification Criteria**
   - ✅ Requires 3+ total referred AND 3+ active users (correct)

### Recommendations:

1. **Remove or Fix Claim Button**
   - Since subscription is auto-granted, the claim button is redundant
   - Either remove the claim button OR create the API route that just refreshes the page

2. **Add Logging**
   - Add more detailed logging for debugging qualification checks
   - Log when users become qualified
   - Log when subscription is granted

3. **Error Handling**
   - Function has good error handling with try-catch
   - Returns safe defaults on error

### Testing Checklist:

- [ ] User with 0 referrals shows correct stats
- [ ] User with 1-2 referrals shows correct stats
- [ ] User with 3+ referrals but < 3 active users shows correct stats
- [ ] User with 3+ referrals AND 3+ active users becomes qualified
- [ ] Subscription is granted automatically when qualified
- [ ] Subscription is NOT granted if user already qualified
- [ ] Subscription is NOT granted if user has paid subscription
- [ ] Stats update correctly in user document
- [ ] Dashboard displays correct stats from database

