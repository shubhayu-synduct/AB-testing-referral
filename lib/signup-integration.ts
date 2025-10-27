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
    
    // Check if already qualified
    if (userData.referralQualified) {
      logger.info('User is already qualified');
      return {
        totalReferred: userData.referralTotalReferred || 0,
        activeUsers: userData.referralActiveUsers || 0,
        isQualified: true
      };
    }
    
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
    
    const totalReferred = referredUserIds.length;
    let activeUsers = 0;
    
    // Check each referred user's total_questions_asked
    for (const referredUserId of referredUserIds) {
      const referredUserRef = doc(db, "users", referredUserId);
      const referredUserDoc = await getDoc(referredUserRef);
      
      if (referredUserDoc.exists()) {
        const referredUserData = referredUserDoc.data();
        const totalQuestionsAsked = referredUserData.total_questions_asked || 0;
        
        if (totalQuestionsAsked >= 10) {
          activeUsers++;
        }
      }
    }
    
    // Check if qualified (>= 5 total referred AND >= 5 active users)
    const isQualified = totalReferred >= 5 && activeUsers >= 5;
    
    // Update Firebase if qualified
    if (isQualified) {
      await updateDoc(userRef, {
        referralQualified: true,
        referralTotalReferred: totalReferred,
        referralActiveUsers: activeUsers
      });
      logger.info(`User ${userId} is now qualified for incentive`);
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