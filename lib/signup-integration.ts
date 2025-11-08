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
    
    // Check if user was already qualified before (to avoid granting subscription multiple times)
    const wasAlreadyQualified = userData.referralQualified === true;
    
    // Update Firebase if qualified
    if (isQualified) {
      // Calculate 1 month from now for subscription expiry - using same logic as Stripe webhook
      // currentPeriodEnd should be a timestamp in milliseconds, not an ISO string
      const now = new Date();
      const expiryDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate()).getTime();
      
      // Check current subscription status - don't overwrite existing paid subscriptions
      const currentSubscriptionTier = userData.subscriptionTier || 'free';
      const currentSubscription = userData.subscription || {};
      
      // Check if user has an active paid subscription (has checkoutSessionId from Stripe)
      // Support both 'clinician' and 'student' paid subscriptions
      const hasActivePaidSubscription = (currentSubscriptionTier === 'clinician' || currentSubscriptionTier === 'student') && 
                                        currentSubscription.status === 'active' && 
                                        !currentSubscription.cancelAtPeriodEnd &&
                                        currentSubscription.checkoutSessionId; // Paid subscriptions have checkoutSessionId
      
      // Grant clinician subscription if:
      // 1. User was not already qualified (first time qualifying)
      // 2. User doesn't have an active paid subscription (don't overwrite paid subscriptions)
      if (!wasAlreadyQualified && !hasActivePaidSubscription) {
        // Grant 1 month of clinician subscription as reward - matching structure from Stripe purchase
        await updateDoc(userRef, {
          referralQualified: true,
          referralTotalReferred: totalReferred,
          referralActiveUsers: activeUsers,
          subscriptionTier: 'clinician',
          subscription: {
            status: 'active',
            currentPeriodEnd: expiryDate, // Timestamp in milliseconds (same as Stripe)
            plan: 'clinician', // Match the subscriptionTier
            interval: 'monthly', // Use 'monthly' not 'month' (same as Stripe)
            cancelAtPeriodEnd: false,
            source: 'referral_incentive', // Track that this is from referral reward
            updatedAt: new Date().toISOString()
          },
          updatedAt: new Date().toISOString()
        });
        logger.info(`User ${userId} is now qualified for incentive and has been granted 1 month of clinician subscription`);
      } else {
        // Already qualified or has paid subscription - just update the qualification status
        await updateDoc(userRef, {
          referralQualified: true,
          referralTotalReferred: totalReferred,
          referralActiveUsers: activeUsers
        });
        if (wasAlreadyQualified) {
          logger.info(`User ${userId} is already qualified for incentive`);
        } else {
          logger.info(`User ${userId} is qualified but already has an active paid subscription`);
        }
      }
    } else {
      // Update stats even if not qualified yet
      await updateDoc(userRef, {
        referralTotalReferred: totalReferred,
        referralActiveUsers: activeUsers
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