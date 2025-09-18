import { getFirebaseFirestore } from './firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { logger } from './logger';

/**
 * Check if an email already exists in the users collection
 * @param email - The email address to check
 * @returns Promise<boolean> - true if email exists, false otherwise
 */
export async function checkEmailExists(email: string): Promise<boolean> {
  try {
    if (!email || !email.trim()) {
      logger.warn('Empty email provided to checkEmailExists');
      return false;
    }

    const db = await getFirebaseFirestore();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);
    
    const exists = !querySnapshot.empty;
    logger.info(`Email ${email} exists check: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
    
    return exists;
  } catch (error) {
    logger.error('Error checking if email exists:', error);
    // Return false on error to allow signup to proceed (fail open)
    return false;
  }
}

/**
 * Get user data by email if it exists
 * @param email - The email address to search for
 * @returns Promise<{exists: boolean, userData?: any, userId?: string}> - User data if found
 */
export async function getUserByEmail(email: string): Promise<{
  exists: boolean;
  userData?: any;
  userId?: string;
}> {
  try {
    if (!email || !email.trim()) {
      logger.warn('Empty email provided to getUserByEmail');
      return { exists: false };
    }

    const db = await getFirebaseFirestore();
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase().trim()));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      logger.info(`No user found with email: ${email}`);
      return { exists: false };
    }

    const userDoc = querySnapshot.docs[0];
    const userData = userDoc.data();
    const userId = userDoc.id;
    
    logger.info(`User found with email ${email}:`, { userId, displayName: userData.displayName });
    
    return {
      exists: true,
      userData,
      userId
    };
  } catch (error) {
    logger.error('Error getting user by email:', error);
    return { exists: false };
  }
}

/**
 * Check if user should be allowed to proceed with signup
 * This function checks for existing emails and provides appropriate error messages
 * @param email - The email address to check
 * @returns Promise<{allowed: boolean, error?: string, existingUser?: any}>
 */
export async function validateEmailForSignup(email: string): Promise<{
  allowed: boolean;
  error?: string;
  existingUser?: any;
}> {
  try {
    const { exists, userData, userId } = await getUserByEmail(email);
    
    if (!exists) {
      return { allowed: true };
    }

    // User exists - check if they can sign in instead
    const errorMessage = `An account with this email already exists. Please sign in instead.`;
    
    logger.warn(`Signup blocked for existing email: ${email}`, {
      existingUserId: userId,
      existingDisplayName: userData.displayName
    });

    return {
      allowed: false,
      error: errorMessage,
      existingUser: {
        userId,
        displayName: userData.displayName,
        email: userData.email,
        onboardingCompleted: userData.onboardingCompleted
      }
    };
  } catch (error) {
    logger.error('Error validating email for signup:', error);
    // Allow signup to proceed on error (fail open)
    return { allowed: true };
  }
}
