// Example integration functions for adding users to email automation
// These functions use the client-side safe version

import { addUserToEmailAutomation } from "./email-automation-client";
import { getFirebaseFirestore } from "./firebase";
import { collection, addDoc, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { logger } from "./logger";

/**
 * Example: General signup flow integration
 */
export async function handleUserSignup(userData: {
  email: string;
  name?: string;
  userId?: string;
}) {
  try {
    // Your existing signup logic here
    // console.log("User signed up:", userData);

    // Add user to email automation
    const result = await addUserToEmailAutomation({
      email: userData.email,
      name: userData.name,
      userId: userData.userId,
      signupDate: new Date(),
    });

    // console.log("Email automation result:", result);
    return result;
  } catch (error) {
    // console.error("Error in signup flow:", error);
    // Don't fail the signup if email automation fails
    return { success: false, error };
  }
}

/**
 * Example: Firebase Auth integration
 */
export async function handleFirebaseAuthSignup(user: any) {
  try {
    // Your existing Firebase Auth logic here
    // console.log("Firebase user signed up:", user);

    // Add user to email automation
    const result = await addUserToEmailAutomation({
      email: user.email,
      name: user.displayName,
      userId: user.uid,
      signupDate: new Date(),
    });

    // console.log("Email automation result:", result);
    return result;
  } catch (error) {
    // console.error("Error in Firebase Auth signup:", error);
    // Don't fail the signup if email automation fails
    return { success: false, error };
  }
}

/**
 * Example: Custom form integration
 */
export async function handleCustomFormSignup(formData: {
  email: string;
  firstName: string;
  lastName: string;
}) {
  try {
    // Your existing form processing logic here
    // console.log("Form data received:", formData);

    // Add user to email automation
    const result = await addUserToEmailAutomation({
      email: formData.email,
      name: `${formData.firstName} ${formData.lastName}`,
      signupDate: new Date(),
    });

    // console.log("Email automation result:", result);
    return result;
  } catch (error) {
    // console.error("Error in custom form signup:", error);
    // Don't fail the signup if email automation fails
    return { success: false, error };
  }
}

/**
 * Example: API route integration
 */
export async function handleApiRouteSignup(req: any, res: any) {
  try {
    const { email, name, userId } = req.body;

    // Your existing API logic here
    // console.log("API signup request:", { email, name, userId });

    // Add user to email automation
    const result = await addUserToEmailAutomation({
      email,
      name,
      userId,
      signupDate: new Date(),
    });

    // console.log("Email automation result:", result);

    // Return success response
    res.status(200).json({
      success: true,
      message: "User signed up successfully",
      emailAutomation: result,
    });
  } catch (error) {
    // console.error("Error in API route signup:", error);
    
    // Return error response
    res.status(500).json({
      success: false,
      message: "Signup failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

/**
 * Track referral - creates referral document in Firebase
 */
export async function trackReferral(referralCode: string, referredUserId: string) {
  try {
    if (!referralCode || !referredUserId) {
      logger.warn('Missing referral code or user ID for tracking');
      return { success: false, error: 'Missing required parameters' };
    }

    const db = getFirebaseFirestore();
    
    // Find the referrer by their referral code
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("referralCode", "==", referralCode));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      logger.warn(`No referrer found with referral code: ${referralCode}`);
      return { success: false, error: 'Invalid referral code' };
    }
    
    // Get the referrer's user ID
    const referrerDoc = querySnapshot.docs[0];
    const referrerUserId = referrerDoc.id;
    
    logger.info(`Referrer found: ${referrerUserId} for code: ${referralCode}`);
    
    // Create referral document
    const referralData = {
      referralCode: referralCode,
      referredUserId: referredUserId, // The user who just signed up
      referrerUserId: referrerUserId, // The user who referred them
      createdAt: new Date().toISOString(),
      status: 'active'
    };
    
    const referralRef = await addDoc(collection(db, "referrals"), referralData);
    
    logger.info(`Referral document created: ${referralRef.id}`);
    
    return { success: true, referralId: referralRef.id };
  } catch (error) {
    logger.error('Error tracking referral:', error);
    return { success: false, error };
  }
}

/**
 * Check if user is qualified for referral incentive
 */
export async function isQualifiedForIncentive(userId: string) {
  try {
    const db = getFirebaseFirestore();
    
    // Get user document
    const userRef = doc(db, "users", userId);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      logger.warn('User document does not exist');
      return {
        totalReferred: 0,
        activeUsers: 0,
        isQualified: false
      };
    }
    
    const userData = userDoc.data();
    
    // Check if subscription has expired and reset to free if not a Stripe subscription
    const userSubscription = userData.subscription || {};
    const userSubscriptionTier = userData.subscriptionTier || 'free';
    const hasStripeSubscription = userSubscription.checkoutSessionId;
    let subscriptionExpiry = userSubscription.currentPeriodEnd;
    const now = Date.now();
    
    // Convert Stripe timestamp to milliseconds if needed
    // Stripe API returns timestamps in SECONDS, but webhook stores them in MILLISECONDS
    // Check if timestamp is in seconds (less than year 2000 in milliseconds) and convert
    if (subscriptionExpiry && subscriptionExpiry < 946684800000) { // Jan 1, 2000 in milliseconds
      subscriptionExpiry = subscriptionExpiry * 1000; // Convert seconds to milliseconds
      logger.info(`User ${userId} subscription expiry converted from seconds to milliseconds: ${subscriptionExpiry}`);
    }
    
    // Check if there's a pending referral subscription that should be activated
    const pendingReferralSubscription = userData.pendingReferralSubscription;
    if (pendingReferralSubscription && hasStripeSubscription && subscriptionExpiry && subscriptionExpiry <= now) {
      // Stripe subscription has expired, activate the pending referral subscription
      await updateDoc(userRef, {
        subscriptionTier: 'clinician',
        subscription: {
          status: 'active',
          currentPeriodEnd: pendingReferralSubscription.currentPeriodEnd,
          createdAt: pendingReferralSubscription.createdAt,
          plan: pendingReferralSubscription.plan,
          interval: pendingReferralSubscription.interval,
          cancelAtPeriodEnd: false,
          source: pendingReferralSubscription.source,
          updatedAt: new Date().toISOString()
        },
        pendingReferralSubscription: null, // Clear pending subscription
        updatedAt: new Date().toISOString()
      });
      logger.info(`User ${userId} Stripe subscription expired. Activated pending referral subscription until ${new Date(pendingReferralSubscription.currentPeriodEnd).toISOString()}`);
    }
    
    // If subscription has expired and it's not a Stripe subscription, reset to free
    // Check all referral subscriptions (source: 'referral_incentive') and expired active subscriptions
    if (subscriptionExpiry && subscriptionExpiry < now && !hasStripeSubscription) {
      // Reset to free if:
      // 1. User has clinician/student tier (not free)
      // 2. OR subscription status is active (even if tier is already free, ensure status is updated)
      // 3. OR subscription is from referral incentive (should be reset when expired)
      const isReferralSubscription = userSubscription.source === 'referral_incentive';
      const shouldReset = (userSubscriptionTier !== 'free') || 
                         (userSubscription.status === 'active') || 
                         isReferralSubscription;
      
      if (shouldReset) {
        await updateDoc(userRef, {
          subscriptionTier: 'free',
          subscription: {
            status: 'expired',
            ...userSubscription,
            updatedAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        });
        logger.info(`User ${userId} subscription has expired (expiry: ${new Date(subscriptionExpiry).toISOString()}, now: ${new Date(now).toISOString()}). Reset to free tier.`);
      }
    }
    
    // Check if user has a referral code
    if (!userData.referralCode) {
      logger.info('User does not have a referral code');
      return {
        totalReferred: 0,
        activeUsers: 0,
        isQualified: false
      };
    }
    
    // Always query referrals table to get fresh data from database
    // Query referrals table to find all users referred by this user
    const referralsRef = collection(db, "referrals");
    const q = query(referralsRef, where("referrerUserId", "==", userId));
    const referralsSnapshot = await getDocs(q);
    
    if (referralsSnapshot.empty) {
      logger.info('No referrals found for user');
      return {
        totalReferred: 0,
        activeUsers: 0,
        isQualified: false
      };
    }
    
    const referredUserIds: string[] = [];
    referralsSnapshot.forEach((doc) => {
      referredUserIds.push(doc.data().referredUserId);
    });
    
    // Calculate totalReferred from database
    const totalReferred = referredUserIds.length;
    let activeUsers = 0;
    
    // Check each referred user's total_questions_asked from database
    for (const referredUserId of referredUserIds) {
      const referredUserRef = doc(db, "users", referredUserId);
      const referredUserDoc = await getDoc(referredUserRef);
      
      if (referredUserDoc.exists()) {
        const referredUserData = referredUserDoc.data();
        const totalQuestionsAsked = referredUserData.total_questions_asked || 0;
        
        // Active user = user who asked 3+ questions
        if (totalQuestionsAsked >= 3) {
          activeUsers++;
        }
      }
    }
    
    // Check if qualified (>= 3 total referred AND >= 3 active users)
    const isQualified = totalReferred >= 3 && activeUsers >= 3;
    
    // Calculate current months earned based on active users (3 active users = 1 month)
    const currentMonthsEarned = Math.floor(activeUsers / 3);
    
    // Re-fetch user data after potential expiration check
    const updatedUserDoc = await getDoc(userRef);
    const updatedUserData = updatedUserDoc.exists() ? updatedUserDoc.data() : userData;
    
    // Get previous months earned from user document
    const previousMonthsEarned = updatedUserData.referralMonthsEarned || 0;
    
    // Calculate additional months earned (only grant the difference)
    const additionalMonths = currentMonthsEarned - previousMonthsEarned;
    
    // Check current subscription status (after potential expiration reset)
    const currentSubscriptionTier = updatedUserData.subscriptionTier || 'free';
    const currentSubscription = updatedUserData.subscription || {};
    
    // Check if user has an active paid subscription (has checkoutSessionId from Stripe)
    const hasActivePaidSubscription = (currentSubscriptionTier === 'clinician' || currentSubscriptionTier === 'student') && 
                                      currentSubscription.status === 'active' && 
                                      !currentSubscription.cancelAtPeriodEnd &&
                                      currentSubscription.checkoutSessionId; // Paid subscriptions have checkoutSessionId
    
    // Check if user has an existing referral subscription
    const hasReferralSubscription = currentSubscription.source === 'referral_incentive' && 
                                    currentSubscription.status === 'active';
    
    // Update Firebase if qualified and has earned months (either first time or additional months)
    if (isQualified && currentMonthsEarned > 0) {
      const now = new Date();
      const nowTimestamp = now.getTime();
      
      let newExpiryDate: number;
      let subscriptionCreatedAt: string;
      
      if (hasReferralSubscription && !hasActivePaidSubscription) {
        // User already has referral subscription - extend it only if additional months earned
        // Check if current subscription is expired - if so, treat as new subscription starting from today
        const currentExpiry = currentSubscription.currentPeriodEnd || nowTimestamp;
        
        // Convert to milliseconds if needed
        let currentExpiryMs = currentExpiry;
        if (currentExpiryMs && currentExpiryMs < 946684800000) {
          currentExpiryMs = currentExpiryMs * 1000;
        }
        
        if (currentExpiryMs < nowTimestamp) {
          // Subscription is expired - treat as new subscription starting from today with current months earned
          const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + currentMonthsEarned);
          newExpiryDate = endDate.getTime();
          subscriptionCreatedAt = new Date().toISOString();
          
          logger.info(`User ${userId} has expired referral subscription. Creating new subscription with ${currentMonthsEarned} month(s) starting from ${startDate.toISOString()} until ${new Date(newExpiryDate).toISOString()}`);
        } else {
          // Subscription is still active - extend it only if additional months earned
          if (additionalMonths > 0) {
            // Extend subscription by additional months only
            const currentExpiryDate = new Date(currentExpiryMs);
            const newExpiry = new Date(currentExpiryDate);
            newExpiry.setMonth(newExpiry.getMonth() + additionalMonths);
            newExpiryDate = newExpiry.getTime();
            subscriptionCreatedAt = currentSubscription.createdAt || new Date().toISOString(); // Keep original createdAt
            
            logger.info(`User ${userId} earned ${additionalMonths} additional month(s) (total: ${currentMonthsEarned}, previous: ${previousMonthsEarned}). Extending subscription from ${new Date(currentExpiryMs).toISOString()} to ${new Date(newExpiryDate).toISOString()}`);
          } else {
            // No additional months earned, keep current expiry and don't update subscription
            newExpiryDate = currentExpiryMs;
            subscriptionCreatedAt = currentSubscription.createdAt || new Date().toISOString();
            
            logger.info(`User ${userId} has ${currentMonthsEarned} months earned (same as before: ${previousMonthsEarned}). No subscription changes needed.`);
            
            // Just update stats, don't modify subscription
            await updateDoc(userRef, {
              referralQualified: true,
              referralTotalReferred: totalReferred,
              referralActiveUsers: activeUsers,
              referralMonthsEarned: currentMonthsEarned
            });
            
            return {
              totalReferred,
              activeUsers,
              isQualified
            };
          }
        }
      } else if (!hasActivePaidSubscription) {
        // First time qualifying - create new subscription starting from today
        // Only grant if user has 0 previous months earned
        if (previousMonthsEarned === 0 && currentMonthsEarned > 0) {
          const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const endDate = new Date(startDate);
          endDate.setMonth(endDate.getMonth() + currentMonthsEarned);
          newExpiryDate = endDate.getTime();
          subscriptionCreatedAt = new Date().toISOString();
          
          logger.info(`User ${userId} is qualifying for the first time. Granting ${currentMonthsEarned} month(s) starting from ${startDate.toISOString()} until ${new Date(newExpiryDate).toISOString()}`);
        } else {
          // User already has months earned but no active subscription - just update stats
          await updateDoc(userRef, {
            referralQualified: true,
            referralTotalReferred: totalReferred,
            referralActiveUsers: activeUsers,
            referralMonthsEarned: currentMonthsEarned
          });
          
          logger.info(`User ${userId} has ${currentMonthsEarned} months earned but no active subscription. Stats updated.`);
          
          return {
            totalReferred,
            activeUsers,
            isQualified
          };
        }
      } else {
        // User has active paid Stripe subscription - schedule referral subscription to start after Stripe expires
        let stripeExpiry = currentSubscription.currentPeriodEnd;
        
        // Convert Stripe timestamp to milliseconds if needed (Stripe uses seconds, webhook stores milliseconds)
        if (stripeExpiry && stripeExpiry < 946684800000) { // Jan 1, 2000 in milliseconds
          stripeExpiry = stripeExpiry * 1000; // Convert seconds to milliseconds
          logger.info(`User ${userId} Stripe expiry converted from seconds to milliseconds: ${stripeExpiry}`);
        }
        
        if (stripeExpiry && stripeExpiry > nowTimestamp) {
          // Stripe subscription expires in the future - start referral subscription from that date
          const stripeExpiryDate = new Date(stripeExpiry);
          
          // Check if user already has a pending referral subscription
          const existingPending = updatedUserData.pendingReferralSubscription;
          let referralEndDate: Date;
          
          // Only update if additional months earned
          if (additionalMonths > 0) {
            if (existingPending && existingPending.status === 'pending') {
              // User already has pending subscription - extend it by additional months
              const previousEndDate = new Date(existingPending.currentPeriodEnd);
              referralEndDate = new Date(previousEndDate);
              referralEndDate.setMonth(referralEndDate.getMonth() + additionalMonths);
              
              logger.info(`User ${userId} earned ${additionalMonths} additional month(s) (total: ${currentMonthsEarned}, previous: ${previousMonthsEarned}). Extending pending referral subscription from ${previousEndDate.toISOString()} to ${referralEndDate.toISOString()}`);
            } else {
              // First time creating pending subscription
              referralEndDate = new Date(stripeExpiryDate);
              referralEndDate.setMonth(referralEndDate.getMonth() + currentMonthsEarned);
              
              logger.info(`User ${userId} creating new pending referral subscription with ${currentMonthsEarned} month(s) to start after Stripe expires on ${stripeExpiryDate.toISOString()}, will expire on ${referralEndDate.toISOString()}`);
            }
            
            newExpiryDate = referralEndDate.getTime();
            subscriptionCreatedAt = stripeExpiryDate.toISOString(); // Set createdAt to when Stripe expires
            
            // Store/update pending referral subscription info
            await updateDoc(userRef, {
              referralQualified: true,
              referralTotalReferred: totalReferred,
              referralActiveUsers: activeUsers,
              referralMonthsEarned: currentMonthsEarned, // Store total months earned
              // Store pending referral subscription that will activate after Stripe expires
              pendingReferralSubscription: {
                status: 'pending',
                currentPeriodEnd: newExpiryDate,
                createdAt: subscriptionCreatedAt,
                plan: 'clinician',
                interval: 'monthly',
                monthsEarned: currentMonthsEarned,
                source: 'referral_incentive',
                updatedAt: new Date().toISOString()
              },
              updatedAt: new Date().toISOString()
            });
            
            logger.info(`User ${userId} has active Stripe subscription. Scheduled referral subscription (${currentMonthsEarned} month(s)) to start after Stripe expires on ${stripeExpiryDate.toISOString()}, will expire on ${new Date(newExpiryDate).toISOString()}`);
          } else {
            // No additional months earned, just update stats
            await updateDoc(userRef, {
              referralQualified: true,
              referralTotalReferred: totalReferred,
              referralActiveUsers: activeUsers,
              referralMonthsEarned: currentMonthsEarned
            });
            
            logger.info(`User ${userId} has ${currentMonthsEarned} months earned (same as before: ${previousMonthsEarned}). No pending subscription changes needed.`);
            
            return {
              totalReferred,
              activeUsers,
              isQualified
            };
          }
        } else {
          // Stripe subscription has expired or no expiry date - just update stats
          await updateDoc(userRef, {
            referralQualified: true,
            referralTotalReferred: totalReferred,
            referralActiveUsers: activeUsers,
            referralMonthsEarned: currentMonthsEarned // Store total months earned
          });
          logger.info(`User ${userId} is qualified but Stripe subscription status is unclear - just updating stats`);
        }
        
        return {
          totalReferred,
          activeUsers,
          isQualified
        };
      }
      
      // Update subscription if not paid subscription and has additional months to grant
      // This upgrades user from free/expired to clinician tier OR extends existing subscription
      if (!hasActivePaidSubscription && additionalMonths > 0) {
        // Ensure we're upgrading properly - check if user was on free tier or expired
        const wasFreeOrExpired = currentSubscriptionTier === 'free' || 
                                 currentSubscription.status === 'expired' || 
                                 !currentSubscription.status;
        
        await updateDoc(userRef, {
          referralQualified: true,
          referralTotalReferred: totalReferred,
          referralActiveUsers: activeUsers,
          referralMonthsEarned: currentMonthsEarned, // Store total months earned
          subscriptionTier: 'clinician', // Upgrade to clinician tier
          subscription: {
            status: 'active', // Activate subscription
            currentPeriodEnd: newExpiryDate, // Timestamp in milliseconds (same as Stripe)
            createdAt: subscriptionCreatedAt, // ISO string
            plan: 'clinician',
            interval: 'monthly',
            cancelAtPeriodEnd: false,
            source: 'referral_incentive', // Track that this is from referral reward
            updatedAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        });
        
        if (wasFreeOrExpired) {
          logger.info(`User ${userId} upgraded from ${currentSubscriptionTier} to clinician tier. Subscription active for ${currentMonthsEarned} month(s), expires ${new Date(newExpiryDate).toISOString()}`);
        } else {
          logger.info(`User ${userId} subscription extended by ${additionalMonths} month(s) (total: ${currentMonthsEarned} months). Expires ${new Date(newExpiryDate).toISOString()}`);
        }
      } else if (!hasActivePaidSubscription && additionalMonths === 0 && currentMonthsEarned > 0) {
        // User has months earned but no additional months - just update stats, don't modify subscription
      await updateDoc(userRef, {
        referralQualified: true,
        referralTotalReferred: totalReferred,
          referralActiveUsers: activeUsers,
          referralMonthsEarned: currentMonthsEarned
      });
        
        logger.info(`User ${userId} has ${currentMonthsEarned} months earned (same as before: ${previousMonthsEarned}). No subscription changes needed.`);
      }
    } else {
      // Update stats even if not qualified yet
      await updateDoc(userRef, {
        referralTotalReferred: totalReferred,
        referralActiveUsers: activeUsers,
        referralMonthsEarned: currentMonthsEarned // Store total months earned (even if 0)
      });
    }
    
    return {
      totalReferred,
      activeUsers,
      isQualified
    };
  } catch (error) {
    logger.error('Error checking incentive qualification:', error);
    return {
      totalReferred: 0,
      activeUsers: 0,
      isQualified: false
    };
  }
} 