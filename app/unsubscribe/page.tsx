'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { logger } from '@/lib/logger';

export default function UnsubscribePage() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState<string | null>(null);
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'not_found'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Get email from URL params
    const emailParam = searchParams.get('email');
    setEmail(emailParam);

    const handleUnsubscribe = async () => {
      if (!emailParam) {
        setStatus('not_found');
        setMessage('No email address provided');
        return;
      }

      try {
        logger.info('Processing unsubscribe request for:', emailParam);
        
        const response = await fetch('/api/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: emailParam }),
        });

        const result = await response.json();

        if (response.ok) {
          setStatus('success');
          setMessage(result.message || 'You have been successfully unsubscribed');
          logger.info('Unsubscribe successful for:', emailParam);
        } else {
          setStatus('error');
          setMessage(result.error || 'Failed to unsubscribe. Please try again.');
          logger.error('Unsubscribe failed for:', emailParam, result.error);
        }
      } catch (error) {
        setStatus('error');
        setMessage('An error occurred. Please try again later.');
        logger.error('Unsubscribe error for:', emailParam, error);
      }
    };

    handleUnsubscribe();
  }, [searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <img
            className="mx-auto h-20 w-auto"
            src="https://app.drinfo.ai/login-logo.png"
            alt="DR. INFO Logo"
          />
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Unsubscribe from Emails
          </h2>
        </div>

        <div className="bg-white py-8 px-6 shadow rounded-lg sm:px-10">
          {status === 'loading' && (
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Processing your request...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Successfully Unsubscribed
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
              <p className="mt-4 text-sm text-gray-500">
                You will no longer receive any onboarding emails from us.
              </p>
              <div className="mt-6">
                <a
                  href="https://app.drinfo.ai"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Return to DR. INFO
                </a>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <svg
                  className="h-6 w-6 text-red-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Unsubscribe Failed
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
              <div className="mt-6">
                <button
                  onClick={() => window.location.reload()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {status === 'not_found' && (
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                <svg
                  className="h-6 w-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">
                Invalid Request
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {message}
              </p>
              <div className="mt-6">
                <a
                  href="https://app.drinfo.ai"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Return to DR. INFO
                </a>
              </div>
            </div>
          )}
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            If you have any questions, please contact us at{' '}
            <a
              href="mailto:info@synduct.com"
              className="text-blue-600 hover:text-blue-500"
            >
              info@synduct.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
