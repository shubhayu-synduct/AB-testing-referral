"use client"

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

const SubscriptionSuccessContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      setError('No session ID found');
      setLoading(false);
      return;
    }

    // You can verify the session here if needed
    setLoading(false);
  }, [searchParams]);

  const handleContinue = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="p-2 sm:p-4 md:p-6 h-[100dvh] flex flex-col relative overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto mb-4 max-w-5xl mx-auto w-full font-sans px-2 sm:px-4 flex items-center justify-center">
            <div className="bg-[#F4F7FF] rounded-lg shadow-sm border border-[#C8C8C8] px-6 py-4 sm:px-8 sm:py-6 md:px-10 md:py-8 lg:px-16 lg:py-8 w-full max-w-2xl">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3771FE] mx-auto"></div>
                <p className="text-[#223258]/70 mt-4 font-['DM_Sans'] text-sm">Loading...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-2 sm:p-4 md:p-6 h-[100dvh] flex flex-col relative overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto mb-4 max-w-5xl mx-auto w-full font-sans px-2 sm:px-4 flex items-center justify-center">
            <div className="bg-[#F4F7FF] rounded-lg shadow-sm border border-[#C8C8C8] px-6 py-4 sm:px-8 sm:py-6 md:px-10 md:py-8 lg:px-16 lg:py-8 w-full max-w-2xl">
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-red-600 mb-4 font-['DM_Sans']">Error</h1>
                <p className="text-[#223258]/70 mb-6 font-['DM_Sans'] text-sm sm:text-base">{error}</p>
                <button
                  onClick={() => router.push('/dashboard/profile?tab=subscription')}
                  className="bg-[#3771FE] text-white px-6 py-2 rounded-lg hover:bg-[#2B5CD9] transition-colors font-['DM_Sans']"
                >
                  Back to Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-2 sm:p-4 md:p-6 h-[100dvh] flex flex-col relative overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto mb-4 max-w-5xl mx-auto w-full font-sans px-2 sm:px-4 flex items-center justify-center">
          <div className="bg-[#F4F7FF] rounded-lg shadow-sm border border-[#C8C8C8] px-6 py-4 sm:px-8 sm:py-6 md:px-10 md:py-8 lg:px-16 lg:py-8 w-full max-w-2xl">
            <div className="text-center">
              <div className="mb-6">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
              </div>
              
              <h1 className="text-2xl sm:text-3xl font-bold text-[#223258] mb-4 font-['DM_Sans']">
                Payment Successful!
              </h1>
              
              <p className="text-[#223258]/70 mb-8 font-['DM_Sans'] text-sm sm:text-base leading-relaxed">
                Your subscription has been activated successfully. You now have access to all premium features.
              </p>
              
              <button
                onClick={handleContinue}
                className="w-full bg-[#3771FE] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#2B5CD9] transition-colors font-['DM_Sans']"
              >
                Continue to Dashboard
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SubscriptionSuccessPage = () => {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="p-2 sm:p-4 md:p-6 h-[100dvh] flex flex-col relative overflow-hidden">
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto mb-4 max-w-5xl mx-auto w-full font-sans px-2 sm:px-4 flex items-center justify-center">
              <div className="bg-[#F4F7FF] rounded-lg shadow-sm border border-[#C8C8C8] px-6 py-4 sm:px-8 sm:py-6 md:px-10 md:py-8 lg:px-16 lg:py-8 w-full max-w-2xl">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#3771FE] mx-auto"></div>
                  <p className="text-[#223258]/70 mt-4 font-['DM_Sans'] text-sm">Loading...</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      }>
        <SubscriptionSuccessContent />
      </Suspense>
    </DashboardLayout>
  );
};

export default SubscriptionSuccessPage; 