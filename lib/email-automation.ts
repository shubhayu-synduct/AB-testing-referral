// Server-side only - prevent client-side imports
if (typeof window !== 'undefined') {
    throw new Error('This module can only be used on the server side');
  }
  
  import admin from "firebase-admin";
  
  // Initialize Firebase Admin SDK if not already initialized
  if (!admin.apps.length) {
    // Use the specified environment variables
    const serviceAccount: admin.ServiceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    };
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  
  const db = admin.firestore();
  
  export interface UserSignupData {
    email: string;
    name?: string;
    userId?: string;
    signupDate?: Date;
  }
  
  export interface EmailAutomationResult {
    success: boolean;
    message: string;
    userId?: string;
    error?: any;
  }
  
  /**
   * Add a new user to the email automation system
   * This should be called when a user signs up for your platform
   */
  export async function addUserToEmailAutomation(userData: UserSignupData): Promise<EmailAutomationResult> {
    try {
      // Validate input
      if (!userData.email || !userData.email.includes('@')) {
        throw new Error('Invalid email address');
      }
  
      // Check if user already exists and is enrolled in email automation
      const existingUser = await getUserEmailStatus(userData.email);
      if (existingUser && existingUser.status === 'active') {
        console.log(`User ${userData.email} already enrolled in email automation system`);
        return {
          success: true,
          message: "User already enrolled in email automation",
          userId: existingUser.userId
        };
      }
  
      // Find the existing user document by email
      const userRef = db.collection("users").where("email", "==", userData.email.toLowerCase().trim());
      const snapshot = await userRef.get();
  
      if (snapshot.empty) {
        throw new Error(`User with email ${userData.email} not found in main users collection`);
      }
  
      const userDoc = snapshot.docs[0];
      const userId = userDoc.id;
  
      // Check if user already has email automation fields
      const existingData = userDoc.data();
      if (existingData.emailDay !== undefined && existingData.emailAutomationStatus === 'active') {
        console.log(`User ${userData.email} already has active email automation fields`);
        return {
          success: true,
          message: "User already has active email automation fields",
          userId: userId
        };
      }
  
      // Update the existing user document with email automation fields
      await userDoc.ref.update({
        emailDay: 0, // Track which email day they're on (0 = no emails sent yet)
        emailAutomationSignupDate: admin.firestore.Timestamp.fromDate(userData.signupDate || new Date()),
        lastEmailSent: null,
        totalEmailsSent: 0,
        emailAutomationStatus: 'active', // active, unsubscribed, bounced
        emailPreferences: {
          marketing: true,
          transactional: true
        },
        updatedAt: admin.firestore.Timestamp.fromDate(new Date())
      });
  
      console.log(`User ${userData.email} added to email automation system with ID: ${userId}`);
      
      // Log analytics event
      await logAnalyticsEvent('user_added_to_email_automation', {
        email: userData.email,
        userId: userId,
        timestamp: new Date()
      });
  
      return { 
        success: true, 
        message: "User added to email automation",
        userId: userId
      };
    } catch (error) {
      console.error("Error adding user to email automation:", error);
      
      // Log error for monitoring
      await logError('add_user_to_email_automation', error, {
        email: userData.email,
        userId: userData.userId
      });
      
      throw error;
    }
  }
  
  /**
   * Update user's email day (useful for testing or manual adjustments)
   */
  export async function updateUserEmailDay(email: string, emailDay: number): Promise<EmailAutomationResult> {
    try {
      if (emailDay < 0 || emailDay > 7) {
        throw new Error('Email day must be between 0 and 7');
      }
  
      const userRef = db.collection("users").where("email", "==", email.toLowerCase().trim());
      const snapshot = await userRef.get();
  
      if (snapshot.empty) {
        throw new Error("User not found");
      }
  
      const userDoc = snapshot.docs[0];
      await userDoc.ref.update({
        emailDay: emailDay,
        updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
        lastEmailSent: emailDay > 0 ? admin.firestore.Timestamp.fromDate(new Date()) : null
      });
  
      console.log(`Updated email day to ${emailDay} for user ${email}`);
      
      return { success: true, message: "Email day updated" };
    } catch (error) {
      console.error("Error updating user email day:", error);
      throw error;
    }
  }
  
  /**
   * Get user's current email automation status
   */
  export async function getUserEmailStatus(email: string) {
    try {
      const userRef = db.collection("users").where("email", "==", email.toLowerCase().trim());
      const snapshot = await userRef.get();
  
      if (snapshot.empty) {
        return null;
      }
  
      const userData = snapshot.docs[0].data();
      
      // Check if user has email automation fields
      if (userData.emailDay === undefined || !userData.emailAutomationStatus) {
        return {
          email: userData.email,
          signupDate: null,
          emailDay: 0,
          daysSinceSignup: 0,
          nextEmailDay: 1,
          isActive: false,
          status: 'not_enrolled',
          totalEmailsSent: 0,
          lastEmailSent: null,
          userId: snapshot.docs[0].id
        };
      }
  
      // Handle signupDate safely - it might be a Firestore Timestamp, Date, or string
      let signupDate: Date;
      if (userData.emailAutomationSignupDate) {
        if (userData.emailAutomationSignupDate.toDate) {
          // Firestore Timestamp
          signupDate = userData.emailAutomationSignupDate.toDate();
        } else if (userData.emailAutomationSignupDate instanceof Date) {
          // Already a Date object
          signupDate = userData.emailAutomationSignupDate;
        } else {
          // String or other format
          signupDate = new Date(userData.emailAutomationSignupDate);
        }
      } else {
        // Fallback to current date if signupDate is missing
        signupDate = new Date();
        console.warn(`Missing emailAutomationSignupDate for user ${email}, using current date as fallback`);
      }
  
      const daysSinceSignup = Math.floor(
        (Date.now() - signupDate.getTime()) /
          (1000 * 60 * 60 * 24)
      ) + 1;
  
      return {
        email: userData.email,
        signupDate: userData.emailAutomationSignupDate,
        emailDay: userData.emailDay || 0,
        daysSinceSignup,
        nextEmailDay: (userData.emailDay || 0) + 1,
        isActive: daysSinceSignup <= 7 && userData.emailAutomationStatus === 'active',
        status: userData.emailAutomationStatus || 'active',
        totalEmailsSent: userData.totalEmailsSent || 0,
        lastEmailSent: userData.lastEmailSent,
        userId: snapshot.docs[0].id
      };
    } catch (error) {
      console.error("Error getting user email status:", error);
      throw error;
    }
  }
  
  /**
   * Remove user from email automation (for unsubscribes)
   */
  export async function removeUserFromEmailAutomation(email: string): Promise<EmailAutomationResult> {
    try {
      const userRef = db.collection("users").where("email", "==", email.toLowerCase().trim());
      const snapshot = await userRef.get();
  
      if (snapshot.empty) {
        throw new Error("User not found");
      }
  
      const userDoc = snapshot.docs[0];
      await userDoc.ref.update({
        emailAutomationStatus: 'unsubscribed',
        emailDay: -1, // Mark as unsubscribed
        updatedAt: admin.firestore.Timestamp.fromDate(new Date()),
        unsubscribedAt: admin.firestore.Timestamp.fromDate(new Date())
      });
  
      console.log(`User ${email} removed from email automation`);
      
      // Log analytics event
      await logAnalyticsEvent('user_unsubscribed', {
        email: email,
        timestamp: new Date()
      });
      
      return { success: true, message: "User removed from email automation" };
    } catch (error) {
      console.error("Error removing user from email automation:", error);
      throw error;
    }
  }
  
  /**
   * Get email automation statistics
   */
  export async function getEmailAutomationStats() {
    try {
      const usersSnapshot = await db.collection("users").get();
      const users = usersSnapshot.docs.map(doc => doc.data());
      
      const stats = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.emailAutomationStatus === 'active').length,
        unsubscribedUsers: users.filter(u => u.emailAutomationStatus === 'unsubscribed').length,
        totalEmailsSent: users.reduce((sum, u) => sum + (u.totalEmailsSent || 0), 0),
        usersByDay: {} as Record<number, number>
      };
  
      // Count users by email day
      for (let i = 0; i <= 7; i++) {
        stats.usersByDay[i] = users.filter(u => u.emailDay === i).length;
      }
  
      return stats;
    } catch (error) {
      console.error("Error getting email automation stats:", error);
      throw error;
    }
  }
  
  /**
   * Clean up old or inactive users (maintenance function)
   */
  export async function cleanupInactiveUsers() {
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
      const inactiveUsers = await db.collection("users")
        .where("emailAutomationStatus", "==", "unsubscribed")
        .where("unsubscribedAt", "<", admin.firestore.Timestamp.fromDate(thirtyDaysAgo))
        .get();
  
      const batch = db.batch();
      inactiveUsers.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
  
      await batch.commit();
      console.log(`Cleaned up ${inactiveUsers.docs.length} inactive users`);
      
      return { success: true, message: `Cleaned up ${inactiveUsers.docs.length} inactive users` };
    } catch (error) {
      console.error("Error cleaning up inactive users:", error);
      throw error;
    }
  }
  
  /**
   * Log analytics events for monitoring
   */
  async function logAnalyticsEvent(eventName: string, data: any) {
    try {
      await db.collection("analytics").add({
        event: eventName,
        data: data,
        timestamp: admin.firestore.Timestamp.fromDate(new Date()),
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (error) {
      console.error("Error logging analytics event:", error);
      // Don't throw - analytics logging shouldn't break main functionality
    }
  }
  
  /**
   * Log errors for monitoring
   */
  async function logError(errorType: string, error: any, context: any) {
    try {
      // Clean up context to remove undefined values
      const cleanContext = Object.fromEntries(
        Object.entries(context || {}).filter(([_, value]) => value !== undefined)
      );
  
      await db.collection("errors").add({
        type: errorType,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        context: cleanContext,
        timestamp: admin.firestore.Timestamp.fromDate(new Date()),
        environment: process.env.NODE_ENV || 'development'
      });
    } catch (logError) {
      console.error("Error logging error:", logError);
      // Don't throw - error logging shouldn't break main functionality
    }
  } 