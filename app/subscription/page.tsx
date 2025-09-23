"use client"

import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from "@/components/dashboard/dashboard-layout";
import { useAuth } from "@/hooks/use-auth";
import SubscriptionStatus from "@/components/subscription-status";

const SubscriptionPage = () => {
  const [activeTab, setActiveTab] = useState('For Students');
  const [selectedPlan, setSelectedPlan] = useState('Free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { user } = useAuth();

  const tabs = ['For Students', 'For Clinicians', 'For Enterprise'];

  const features = [
    'Unlimited access to all summaries',
    'Complete clinical guidelines and protocols',
    'Full drug database with search & filters',
    'Access to insights, expert notes & references',
    'Regular content updates and alerts'
  ];

  const getPricingForTab = (tab: string) => {
    switch (tab) {
      case 'For Students':
        return [
          { name: 'Free', price: '€0', monthly: null, popular: false, plan: 'free', interval: null },
          { name: 'Monthly Access', price: '€10', monthly: null, popular: false, plan: 'student', interval: 'monthly' },
          { name: 'Yearly', price: '€99', monthly: '€8.25 / month', popular: true, plan: 'student', interval: 'yearly' }
        ];
      case 'For Clinicians':
        return [
          { name: 'Free', price: '€0', monthly: null, popular: false, plan: 'free', interval: null },
          { name: 'Monthly Access', price: '€25', monthly: null, popular: false, plan: 'clinician', interval: 'monthly' },
          { name: 'Yearly', price: '€180', monthly: '€15 / month', popular: true, plan: 'clinician', interval: 'yearly' },
          { name: 'Two-Year', price: '€288', monthly: '€12 / month', popular: false, plan: 'clinician', interval: 'biyearly' }
        ];
      case 'For Enterprise':
        return [];
      default:
        return [];
    }
  };

  const currentPricing = getPricingForTab(activeTab);

  const handlePlanSelect = (planName: string) => {
    setSelectedPlan(planName);
  };

  const handleClose = () => {
    router.back();
  };

  const handlePayment = async () => {
    if (!user) {
      setError('Please sign in to continue');
      return;
    }

    const selectedPlanData = currentPricing.find(plan => plan.name === selectedPlan);
    
    if (!selectedPlanData || selectedPlanData.plan === 'free') {
      setError('Please select a paid plan');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get the Firebase ID token
      const idToken = await user.getIdToken();
      
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan: selectedPlanData.plan,
          interval: selectedPlanData.interval,
          idToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;
    } catch (err: any) {
      // console.error('Payment error:', err);
      setError(err.message || 'Failed to process payment');
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    const selectedPlanData = currentPricing.find(plan => plan.name === selectedPlan);
    if (selectedPlanData?.plan === 'free') {
      return 'Start Free Trial';
    }
    return 'Proceed to Pay';
  };

  const isPaidPlan = () => {
    const selectedPlanData = currentPricing.find(plan => plan.name === selectedPlan);
    return selectedPlanData?.plan !== 'free';
  };

  return (
    <DashboardLayout>
      <div className="p-2 sm:p-4 md:p-6 h-[100dvh] flex flex-col relative overflow-hidden">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto mb-4 max-w-5xl mx-auto w-full font-sans px-2 sm:px-4 flex items-center justify-center">
            <div className="bg-[#F4F7FF] rounded-lg shadow-sm border border-[#C8C8C8] px-6 py-4 sm:px-8 sm:py-6 md:px-10 md:py-8 lg:px-16 lg:py-8 w-full max-w-5xl">
              <div className="flex items-center justify-end mb-4">
                <button 
                  onClick={handleClose}
                  className="text-[#263969] hover:text-gray-600 transition-colors p-2 rounded-lg hover:bg-gray-50"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
                {/* Left Side - Features */}
                <div className="lg:col-span-2 lg:border-r lg:border-[#C8C8C8] lg:pr-6 flex flex-col">
                  <h2 className="text-2xl sm:text-3xl font-bold text-[#223258] font-['DM_Sans']">
                    Upgrade your plan
                  </h2>
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="space-y-4 sm:space-y-5">
                      {features.map((feature, index) => (
                        <div key={index} className="flex items-start space-x-3">
                          <div className="flex-shrink-0 mt-1">
                            <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                              <Check className="w-3 h-3 text-green-600" />
                            </div>
                          </div>
                          <p className="text-[#223258] leading-relaxed font-['DM_Sans'] text-sm sm:text-base">{feature}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Side - Pricing */}
                <div className="lg:col-span-3 min-h-[500px] flex flex-col justify-center lg:pl-6">
                  {/* Tabs */}
                  <div className="flex border border-[#C8C8C8] rounded-lg mb-6 overflow-hidden">
                    {tabs.map((tab) => (
                      <button
                        key={tab}
                        onClick={() => {
                          setActiveTab(tab);
                          setSelectedPlan('Free');
                        }}
                        className={`flex-1 py-3 px-4 text-center font-medium transition-colors font-['DM_Sans'] text-sm ${
                          activeTab === tab
                            ? 'bg-[#E4ECFF] text-[#223258] border-b-2 border-[#3771FE]'
                            : 'bg-white text-[#223258] hover:bg-gray-50'
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-600 text-sm font-['DM_Sans']">{error}</p>
                    </div>
                  )}

                  {/* Pricing Options */}
                  <div className="flex-1 space-y-3">
                    {activeTab === 'For Enterprise' ? (
                      <div className="text-center h-full flex flex-col justify-center">
                        <div className="bg-white border border-[#C8C8C8] rounded-lg p-6 text-center">
                          <h3 className="text-xl font-semibold text-[#223258] mb-2 font-['DM_Sans']">
                            Contact Us
                          </h3>
                          <p className="text-[#223258]/70 mb-6 font-['DM_Sans']">
                            For large teams and organizations.
                          </p>
                          <button className="w-full bg-[#3771FE] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#2B5CD9] transition-colors font-['DM_Sans']">
                            Contact Us via Email
                          </button>
                        </div>
                      </div>
                    ) : (
                      currentPricing.map((plan) => (
                        <div
                          key={plan.name}
                          className={`bg-white border rounded-lg p-4 cursor-pointer transition-colors relative ${
                            selectedPlan === plan.name
                              ? 'border-[#3771FE] bg-[#E4ECFF]'
                              : 'border-[#C8C8C8] hover:border-[#3771FE] hover:bg-gray-50'
                          }`}
                          onClick={() => handlePlanSelect(plan.name)}
                        >
                          {plan.name === 'Free' && (
                            <div className="absolute -top-2 left-4">
                              <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-lg font-['DM_Sans'] font-medium">
                                7-day free trial begins now
                              </span>
                            </div>
                          )}
                          {plan.popular && (
                            <div className="absolute -top-2 left-4">
                              <span className="bg-green-500 text-white text-xs px-2 py-1 rounded-lg font-['DM_Sans'] font-medium">
                                Most popular
                              </span>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <input
                                type="radio"
                                name="plan"
                                checked={selectedPlan === plan.name}
                                onChange={() => handlePlanSelect(plan.name)}
                                className="w-4 h-4 text-[#3771FE] border-[#C8C8C8] focus:ring-[#3771FE]"
                              />
                              <div>
                                <p className="font-medium text-[#223258] font-['DM_Sans']">{plan.name}</p>
                                {plan.monthly && (
                                  <p className="text-sm text-[#223258]/70 font-['DM_Sans']">{plan.monthly}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-[#223258] font-['DM_Sans']">{plan.price}</p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Action Button */}
                  {activeTab !== 'For Enterprise' && (
                    <button 
                      onClick={handlePayment}
                      disabled={loading || !user}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors mt-4 font-['DM_Sans'] ${
                        isPaidPlan()
                          ? 'bg-[#3771FE] text-white hover:bg-[#2B5CD9] disabled:bg-gray-400'
                          : 'bg-[#3771FE] text-white hover:bg-[#2B5CD9] disabled:bg-gray-400'
                      }`}
                    >
                      {loading ? 'Processing...' : getButtonText()}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Status for Testing */}
      <div className="mt-8 max-w-5xl mx-auto px-4">
        <SubscriptionStatus />
      </div>
    </DashboardLayout>
  );
};

export default SubscriptionPage; 