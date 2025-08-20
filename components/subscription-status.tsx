"use client"

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';

interface SubscriptionStatus {
  subscriptionTier: string;
  subscription: any;
  email: string;
  updatedAt: string;
}

export default function SubscriptionStatus() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchSubscriptionStatus = async () => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/test-subscription?uid=${user.uid}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch subscription status');
      }

      setStatus(data);
    } catch (err: any) {
      console.error('Error fetching subscription status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSubscriptionTier = async (tier: string) => {
    if (!user) return;

    setLoading(true);
    setError('');

    try {
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/test-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          subscriptionTier: tier,
          idToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update subscription tier');
      }

      // Refresh the status
      await fetchSubscriptionStatus();
    } catch (err: any) {
      console.error('Error updating subscription tier:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSubscriptionStatus();
    }
  }, [user]);

  if (!user) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <p className="text-yellow-800">Please sign in to view subscription status</p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <h3 className="text-lg font-semibold mb-4">Subscription Status</h3>
      
      {loading && (
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading...</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {status && (
        <div className="space-y-3">
          <div>
            <strong>Current Tier:</strong> 
            <span className={`ml-2 px-2 py-1 rounded text-sm font-medium ${
              status.subscriptionTier === 'free' ? 'bg-gray-100 text-gray-800' :
              status.subscriptionTier === 'student' ? 'bg-blue-100 text-blue-800' :
              status.subscriptionTier === 'clinician' ? 'bg-green-100 text-green-800' :
              'bg-purple-100 text-purple-800'
            }`}>
              {status.subscriptionTier.toUpperCase()}
            </span>
          </div>
          
          <div>
            <strong>Email:</strong> {status.email}
          </div>
          
          {status.subscription && (
            <div>
              <strong>Subscription ID:</strong> {status.subscription.id}
            </div>
          )}
          
          <div>
            <strong>Last Updated:</strong> {new Date(status.updatedAt).toLocaleString()}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <p className="text-sm text-gray-600">Test Tier Updates:</p>
        <div className="flex flex-wrap gap-2">
          {['free', 'student', 'clinician'].map((tier) => (
            <button
              key={tier}
              onClick={() => updateSubscriptionTier(tier)}
              disabled={loading}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            >
              Set to {tier}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={fetchSubscriptionStatus}
        disabled={loading}
        className="mt-4 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 disabled:opacity-50"
      >
        Refresh Status
      </button>
    </div>
  );
} 