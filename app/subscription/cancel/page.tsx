"use client"

import React from 'react';
import { useRouter } from 'next/navigation';
import { XCircle } from 'lucide-react';
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";

const SubscriptionCancelPage = () => {
  const router = useRouter();

  const handleBackToSubscription = () => {
    router.push('/dashboard/profile?tab=subscription');
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
  };

  return (
    <DashboardLayout>
      <div className="p-2 sm:p-4 md:p-6 h-[100dvh] flex flex-col relative overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto mb-4 max-w-5xl mx-auto w-full font-sans px-2 sm:px-4 flex items-center justify-center">
            <div className="bg-[#F4F7FF] rounded-lg shadow-sm border border-[#C8C8C8] px-6 py-4 sm:px-8 sm:py-6 md:px-10 md:py-8 lg:px-16 lg:py-8 w-full max-w-2xl">
              <div className="text-center">
                <div className="mb-6">
                  <XCircle className="w-16 h-16 text-red-500 mx-auto" />
                </div>
                
                <h1 className="text-2xl sm:text-3xl font-bold text-[#223258] mb-4 font-['DM_Sans']">
                  Payment Cancelled
                </h1>
                
                <p className="text-[#223258]/70 mb-8 font-['DM_Sans'] text-sm sm:text-base leading-relaxed">
                  Your payment was cancelled. You can try again anytime or continue with the free plan.
                </p>
                
                <div className="space-y-3">
                  <button
                    onClick={handleBackToSubscription}
                    className="w-full bg-[#3771FE] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#2B5CD9] transition-colors font-['DM_Sans']"
                  >
                    Try Again
                  </button>
                  
                  <button
                    onClick={handleBackToDashboard}
                    className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors font-['DM_Sans']"
                  >
                    Back to Dashboard
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionCancelPage; 