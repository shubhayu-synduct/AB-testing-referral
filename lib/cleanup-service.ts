"use client"

import { logger } from './logger';

/**
 * Comprehensive cleanup service for complete account deletion
 * Ensures 100% removal of all authentication data and user traces
 */
export class CleanupService {
  private static readonly SESSION_COOKIE_NAME = "drinfo-session";
  private static readonly AUTH_SYNC_KEY = "auth-sync";
  private static readonly ACCOUNT_DELETED_KEY = "account-deleted";

  /**
   * Performs complete cleanup of all authentication data
   * @param userUid - The UID of the user being deleted
   * @param userEmail - The email of the user being deleted
   */
  static async performCompleteCleanup(userUid: string, userEmail: string): Promise<void> {
    try {
      logger.info(`Starting complete cleanup for user: ${userUid}`);

      // 1. Clear all cookies
      await this.clearAllCookies();

      // 2. Clear all localStorage
      this.clearAllLocalStorage();

      // 3. Clear all sessionStorage
      this.clearAllSessionStorage();

      // 4. Clear Firebase Auth data
      await this.clearFirebaseAuthData();

      // 5. Clear service worker cache
      await this.clearServiceWorkerCache();

      // 6. Notify other tabs
      this.notifyOtherTabs(userUid, userEmail);

      // 7. Clear global variables (redirect handled by caller)
      this.clearGlobalVariables();

      logger.info(`Complete cleanup finished for user: ${userUid}`);
    } catch (error) {
      logger.error('Error during complete cleanup:', error);
      throw error;
    }
  }

  /**
   * Clear all authentication-related cookies
   */
  private static async clearAllCookies(): Promise<void> {
    try {
      // Clear main session cookie
      document.cookie = `${this.SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
      document.cookie = `${this.SESSION_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;

      // Clear any other potential auth cookies
      const cookieNames = [
        'drinfo-session',
        'firebase:authUser',
        'auth-token',
        'session-token',
        'user-session'
      ];

      cookieNames.forEach(cookieName => {
        // Clear for current domain
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
        // Clear for parent domain
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${window.location.hostname};`;
        // Clear for subdomain
        document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname};`;
      });

      logger.info('All cookies cleared');
    } catch (error) {
      logger.error('Error clearing cookies:', error);
    }
  }

  /**
   * Clear all localStorage data
   */
  private static clearAllLocalStorage(): void {
    try {
      // Get all localStorage keys
      const keys = Object.keys(localStorage);
      
      // Clear all keys
      keys.forEach(key => {
        localStorage.removeItem(key);
      });

      // Clear specific auth-related keys
      const authKeys = [
        this.AUTH_SYNC_KEY,
        this.ACCOUNT_DELETED_KEY,
        'firebase:authUser',
        'auth-state',
        'user-data',
        'session-data'
      ];

      authKeys.forEach(key => {
        localStorage.removeItem(key);
      });

      logger.info('All localStorage cleared');
    } catch (error) {
      logger.error('Error clearing localStorage:', error);
    }
  }

  /**
   * Clear all sessionStorage data
   */
  private static clearAllSessionStorage(): void {
    try {
      // Get all sessionStorage keys
      const keys = Object.keys(sessionStorage);
      
      // Clear all keys
      keys.forEach(key => {
        sessionStorage.removeItem(key);
      });

      logger.info('All sessionStorage cleared');
    } catch (error) {
      logger.error('Error clearing sessionStorage:', error);
    }
  }

  /**
   * Clear Firebase Auth data
   */
  private static async clearFirebaseAuthData(): Promise<void> {
    try {
      // Clear Firebase Auth persistence
      if (typeof window !== 'undefined' && 'localStorage' in window) {
        const firebaseKeys = Object.keys(localStorage).filter(key => 
          key.includes('firebase') || key.includes('auth')
        );
        
        firebaseKeys.forEach(key => {
          localStorage.removeItem(key);
        });
      }

      logger.info('Firebase Auth data cleared');
    } catch (error) {
      logger.error('Error clearing Firebase Auth data:', error);
    }
  }

  /**
   * Clear service worker cache
   */
  private static async clearServiceWorkerCache(): Promise<void> {
    try {
      if ('serviceWorker' in navigator) {
        // Unregister all service workers
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map(registration => registration.unregister()));

        // Clear all caches
        if ('caches' in window) {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
        }
      }

      logger.info('Service worker cache cleared');
    } catch (error) {
      logger.error('Error clearing service worker cache:', error);
    }
  }

  /**
   * Notify other tabs about account deletion
   */
  private static notifyOtherTabs(userUid: string, userEmail: string): void {
    try {
      const deletionData = {
        action: 'account-deleted',
        uid: userUid,
        email: userEmail,
        timestamp: Date.now()
      };

      // Notify other tabs via localStorage
      localStorage.setItem(this.ACCOUNT_DELETED_KEY, JSON.stringify(deletionData));

      // Notify other tabs via BroadcastChannel if available
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('auth-sync');
        channel.postMessage(deletionData);
        channel.close();
      }

      logger.info('Other tabs notified of account deletion');
    } catch (error) {
      logger.error('Error notifying other tabs:', error);
    }
  }

  /**
   * Clear global variables
   */
  private static clearGlobalVariables(): void {
    try {
      // Clear global auth variables
      if (typeof globalThis !== 'undefined') {
        globalThis.__authUser = null;
        globalThis.__authLoading = false;
        globalThis.__authListenerSetup = false;
        globalThis.__firebaseAuth = null;
        globalThis.__firebaseDB = null;
        globalThis.__authPersistenceSet = false;
      }

      logger.info('Global variables cleared');
    } catch (error) {
      logger.error('Error clearing global variables:', error);
    }
  }

  /**
   * Force a clean page reload to ensure all state is reset
   */
  private static forceCleanReload(): void {
    try {
      // Clear any pending timeouts
      const highestTimeoutId = setTimeout(() => {}, 0);
      for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
      }

      // Clear any pending intervals
      const highestIntervalId = setInterval(() => {}, 0);
      for (let i = 0; i < highestIntervalId; i++) {
        clearInterval(i);
      }

      // Force reload after a short delay
      setTimeout(() => {
        window.location.href = '/signup?deleted=true';
      }, 100);

      logger.info('Clean reload initiated');
    } catch (error) {
      logger.error('Error during clean reload:', error);
    }
  }

  /**
   * Verify that cleanup was successful
   */
  static verifyCleanup(): boolean {
    try {
      // Check if any auth data remains
      const hasSessionCookie = document.cookie.includes(this.SESSION_COOKIE_NAME);
      const hasLocalStorage = Object.keys(localStorage).length > 0;
      const hasSessionStorage = Object.keys(sessionStorage).length > 0;
      const hasGlobalUser = globalThis.__authUser !== null;

      const isClean = !hasSessionCookie && !hasLocalStorage && !hasSessionStorage && !hasGlobalUser;

      logger.info('Cleanup verification:', {
        hasSessionCookie,
        hasLocalStorage,
        hasSessionStorage,
        hasGlobalUser,
        isClean
      });

      return isClean;
    } catch (error) {
      logger.error('Error verifying cleanup:', error);
      return false;
    }
  }
}
