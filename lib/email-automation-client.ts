// Client-side safe email automation functions
// These functions call the server-side API endpoints

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
   * Add a new user to the email automation system (client-side)
   * This calls the server-side API endpoint
   */
  export async function addUserToEmailAutomation(userData: UserSignupData): Promise<EmailAutomationResult> {
    try {
      const response = await fetch('/api/test-email-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'add-user',
          email: userData.email,
          name: userData.name,
          userId: userData.userId,
        }),
      });
  
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add user to email automation');
      }
  
      return result;
    } catch (error) {
      // console.error('Error adding user to email automation:', error);
      throw error;
    }
  }
  
  /**
   * Get user's email automation status (client-side)
   */
  export async function getUserEmailStatus(email: string) {
    try {
      const response = await fetch('/api/test-email-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'get-status',
          email: email,
        }),
      });
  
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to get user status');
      }
  
      return result.status;
    } catch (error) {
      // console.error('Error getting user email status:', error);
      throw error;
    }
  }
  
  /**
   * Update user's email day (client-side)
   */
  export async function updateUserEmailDay(email: string, emailDay: number): Promise<EmailAutomationResult> {
    try {
      const response = await fetch('/api/test-email-automation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'update-email-day',
          email: email,
          emailDay: emailDay,
        }),
      });
  
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to update email day');
      }
  
      return result;
    } catch (error) {
      // console.error('Error updating user email day:', error);
      throw error;
    }
  }
  
  /**
   * Remove user from email automation (client-side)
   */
  export async function removeUserFromEmailAutomation(email: string): Promise<EmailAutomationResult> {
    try {
      const response = await fetch('/api/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
        }),
      });
  
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to remove user from email automation');
      }
  
      return result;
    } catch (error) {
      // console.error('Error removing user from email automation:', error);
      throw error;
    }
  } 