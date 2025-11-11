import React, { useState, useEffect } from 'react';
import { Copy, Check, Mail, Share2, Gift, Users, MessageCircle, MoreHorizontal, Sparkles } from "lucide-react";
import { IoLogoWhatsapp } from "react-icons/io";
import { IoLogoLinkedin } from "react-icons/io5";
import { FaXTwitter, FaFacebookF, FaLink, FaUserPlus, FaComments, FaGift } from "react-icons/fa6";
import { updateDoc, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseFirestore } from "@/lib/firebase";
import EmailInviteModal from "./Modal";

interface ReferralStats {
  totalReferred: number;
  activeUsers: number;
  qualified: boolean;
  monthsEarned: number;
}

interface ReferralTabProps {
  user: any;
  profile: any;
  referralLink: string;
  setReferralLink: (link: string) => void;
  referralCode: string;
  setReferralCode: (code: string) => void;
  referralStats: ReferralStats;
  referrals: any[];
  generatingCode: boolean;
  setGeneratingCode: (loading: boolean) => void;
  setSuccess: (success: boolean) => void;
  setError: (error: string) => void;
  statsigClient?: any;
  dashboardVariant?: 'A' | 'B' | null;
}

export default function ReferralTab({
  user,
  profile,
  referralLink,
  setReferralLink,
  referralCode,
  setReferralCode,
  referralStats,
  referrals,
  generatingCode,
  setGeneratingCode,
  setSuccess,
  setError,
  statsigClient,
  dashboardVariant
}: ReferralTabProps) {
  const [copied, setCopied] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showMoreShareOptions, setShowMoreShareOptions] = useState(false);

  // Automatically fetch or create referral link when component mounts
  useEffect(() => {
    const fetchOrCreateReferralLink = async () => {
      if (!user) return;

      // If referral link already exists, don't recreate
      if (referralLink && referralCode) {
        return;
      }

      try {
        const db = getFirebaseFirestore();
        const userId = user.uid;
        const userRef = doc(db, "users", userId);
        const userDoc = await getDoc(userRef);
        
        const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          
          // If referral code exists, use it
          if (userData.referralCode) {
            const fullLink = `${baseUrl}/signup?ref=${userData.referralCode}`;
            setReferralCode(userData.referralCode);
            setReferralLink(fullLink);
            return;
          }
        }
        
        // If no referral code exists, create one automatically
        const firstName = profile?.firstName || user.displayName?.split(' ')[0] || 'user';
        const first4Letters = firstName.substring(0, 4).toLowerCase().replace(/[^a-z]/g, '').padStart(4, 'user');
        const randomString = Math.random().toString(36).substr(2, 6);
        const newCode = `${first4Letters}${randomString}`;
        const fullLink = `${baseUrl}/signup?ref=${newCode}`;
        
        // Update or create Firebase document with the new referral code
        if (userDoc.exists()) {
          await updateDoc(userRef, {
            referralCode: newCode,
            referralQualified: false,
            referralActiveUsers: 0,
            referralTotalReferred: 0
          });
        } else {
          // If document doesn't exist, create it with referral code
          await setDoc(userRef, {
            referralCode: newCode,
            referralQualified: false,
            referralActiveUsers: 0,
            referralTotalReferred: 0,
            email: user.email || '',
            createdAt: serverTimestamp()
          });
        }
        
        setReferralCode(newCode);
        setReferralLink(fullLink);
      } catch (error) {
        console.error('Error fetching/creating referral link:', error);
        setError('Failed to create referral link');
      }
    };
    
    fetchOrCreateReferralLink();
  }, [user, profile, referralLink, referralCode, setReferralCode, setReferralLink, statsigClient, dashboardVariant, setError]);


  return (
    <div>
      {/* Hero Section with Timeline */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-5 md:p-8 border border-blue-100">
          <h2 className="text-[20px] md:text-[22px] font-semibold mb-2 leading-tight text-gray-900">Earn Free Premium Membership</h2>
          <p className="text-gray-700 text-[15px] mb-4 leading-relaxed">Share DR.INFO with your colleagues and get rewarded!</p>

          <div className="flex flex-wrap items-center gap-3 md:gap-4 mb-4">
            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-blue-100">
              <Gift className="w-4 h-4 md:w-5 md:h-5 text-[#3771FE] flex-shrink-0" />
              <span className="text-[13px] md:text-[15px] text-gray-700">Unlimited invites</span>
            </div>
            <div className="flex items-center gap-2 bg-white/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-blue-100">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-[#3771FE] flex-shrink-0" />
              <span className="text-[13px] md:text-[15px] text-gray-700">1 month free when 3 users ask 3+ questions</span>
            </div>
          </div>

          {/* Visual Progress Timeline */}
          <div className="relative mt-6">
            {/* Desktop dashed line */}
            <div className="absolute left-0 right-0 top-8 h-[2px] hidden lg:block overflow-hidden">
              <div
                className="h-full w-full border-t-2 border-dashed border-gray-200"
                style={{
                  strokeDasharray: '8, 8'
                }}
              />
            </div>

            {/* Mobile: Vertical timeline */}
            <div className="lg:hidden relative">
              {/* Vertical dashed line */}
              <div className="absolute left-5 top-6 bottom-6 w-[2px] border-l-2 border-dashed border-gray-200"></div>

              <div className="space-y-4 relative z-10">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full border border-gray-200">
                    <FaLink className="w-3.5 h-3.5 text-[#3771FE]" />
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className="text-[15px] font-semibold text-gray-900 leading-snug">You Share</h4>
                    <p className="text-gray-600 text-[13px] leading-relaxed">Send your unique link</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full border border-gray-200">
                    <FaUserPlus className="w-3.5 h-3.5 text-[#3771FE]" />
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className="text-[15px] font-semibold text-gray-900 leading-snug">Friends Join</h4>
                    <p className="text-gray-600 text-[13px] leading-relaxed">They sign up with your link</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full border border-gray-200 relative">
                    <FaComments className="w-3.5 h-3.5 text-[#3771FE]" />
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#3771FE] rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-[9px] text-white font-semibold">3</span>
                    </div>
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className="text-[15px] font-semibold text-gray-900 leading-snug">They Explore</h4>
                    <p className="text-gray-600 text-[13px] leading-relaxed">Each asks 3+ questions</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full border border-gray-200">
                    <FaGift className="w-3.5 h-3.5 text-[#3771FE]" />
                  </div>
                  <div className="flex-1 pt-1">
                    <h4 className="text-[15px] font-semibold text-gray-900 leading-snug">You Earn!</h4>
                    <p className="text-gray-600 text-[13px] leading-relaxed">1 month free premium</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop: Icon grid */}
            <div className="hidden lg:grid lg:grid-cols-4 lg:gap-6 relative z-10">
              <div>
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-14 h-14 flex items-center justify-center mb-2 bg-gray-50 rounded-full border border-gray-200">
                    <FaLink className="w-4 h-4 text-[#3771FE]" />
                  </div>
                  <h4 className="text-[15px] font-semibold text-gray-900 mb-0.5 leading-snug">You Share</h4>
                  <p className="text-gray-600 text-[13px] leading-relaxed">Send your unique link</p>
                </div>
              </div>

              <div>
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-14 h-14 flex items-center justify-center mb-2 bg-gray-50 rounded-full border border-gray-200">
                    <FaUserPlus className="w-4 h-4 text-[#3771FE]" />
                  </div>
                  <h4 className="text-[15px] font-semibold text-gray-900 mb-0.5 leading-snug">Friends Join</h4>
                  <p className="text-gray-600 text-[13px] leading-relaxed">They sign up with your link</p>
                </div>
              </div>

              <div>
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-14 h-14 flex items-center justify-center mb-2 bg-gray-50 rounded-full border border-gray-200">
                    <FaComments className="w-4 h-4 text-[#3771FE]" />
                    <div className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#3771FE] rounded-full flex items-center justify-center shadow-sm">
                      <span className="text-[9px] text-white font-semibold">3</span>
                    </div>
                  </div>
                  <h4 className="text-[15px] font-semibold text-gray-900 mb-0.5 leading-snug">They Explore</h4>
                  <p className="text-gray-600 text-[13px] leading-relaxed">Each asks 3+ questions</p>
                </div>
              </div>

              <div>
                <div className="flex flex-col items-center text-center">
                  <div className="relative w-14 h-14 flex items-center justify-center mb-2 bg-gray-50 rounded-full border border-gray-200">
                    <FaGift className="w-4 h-4 text-[#3771FE]" />
                  </div>
                  <h4 className="text-[15px] font-semibold text-gray-900 mb-0.5 leading-snug">You Earn!</h4>
                  <p className="text-gray-600 text-[13px] leading-relaxed">1 month free premium</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Share Section */}
      {referralLink ? (
        <div className="mb-6">
          <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200">
            <h3 className="text-[17px] md:text-[20px] font-semibold text-[#223258] mb-3 leading-tight">Share Your Link</h3>

            {/* Mobile: Stacked, Desktop: Side by side */}
            <div className="flex flex-col md:flex-row md:items-stretch gap-2 mb-3">
              <div className="flex-1 bg-gray-50 border border-gray-200 rounded-[10px] px-3 py-3 md:px-4 md:py-2.5 flex items-center justify-between min-w-0">
                <p className="text-[13px] text-gray-800 truncate font-mono flex-1 mr-2">{referralLink}</p>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(referralLink);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                    
                    // Track event: Copy Referral Link
                    if (statsigClient && dashboardVariant) {
                      statsigClient.logEvent('referral_link_copied', {
                        variant: dashboardVariant,
                        referral_code: referralCode
                      } as any);
                      console.log('[Referral Tracking] Event logged: referral_link_copied', { variant: dashboardVariant, referral_code: referralCode });
                    }
                  }}
                  className="px-3 py-1.5 text-[#3771FE] hover:text-[#2A5CDB] font-semibold rounded-[10px] transition-all flex items-center gap-1.5 flex-shrink-0 hover:bg-blue-50"
                >
                  {copied ? (
                    <>
                      <Check size={16} />
                      <span className="text-[13px]">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={16} />
                      <span className="text-[13px] hidden sm:inline">Copy</span>
                    </>
                  )}
                </button>
              </div>
              <button
                onClick={() => setShowMoreShareOptions(!showMoreShareOptions)}
                className="w-full md:w-auto px-4 py-3 md:px-5 md:py-2.5 bg-[#3771FE] hover:bg-[#2A5CDB] text-white font-semibold rounded-[10px] transition-all flex items-center justify-center gap-2 text-[15px]"
              >
                <Share2 size={18} />
                <span>Share to</span>
              </button>
            </div>

            {showMoreShareOptions && (
              <div className="pt-3 border-t border-gray-200">
                <p className="text-[13px] font-semibold text-gray-700 mb-3">Choose where to share:</p>
                <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
                  <button
                    onClick={() => {
                      const subject = encodeURIComponent("Join me on DR.INFO");
                      const body = encodeURIComponent(`I've been using DR.INFO for faster clinical knowledge with citations I can trust. Join me using my referral link:\n\n${referralLink}`);
                      window.location.href = `mailto:?subject=${subject}&body=${body}`;
                      
                      // Track event: Share button clicked
                      if (statsigClient && dashboardVariant) {
                        statsigClient.logEvent('referral_share_clicked', {
                          variant: dashboardVariant,
                          platform: 'email',
                          referral_code: referralCode
                        } as any);
                        console.log('[Referral Tracking] Event logged: referral_share_clicked', { variant: dashboardVariant, platform: 'email', referral_code: referralCode });
                      }
                    }}
                    className="px-4 py-2.5 bg-white hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-all border border-gray-200 hover:border-gray-300"
                  >
                    <Mail className="w-5 h-5 text-gray-600" />
                    <span className="text-[13px] text-gray-700">Email</span>
                  </button>

                  <button
                    onClick={() => {
                      const text = encodeURIComponent(`Join me on DR.INFO - faster clinical knowledge with citations you can trust! ${referralLink}`);
                      window.open(`https://wa.me/?text=${text}`, '_blank');
                      
                      // Track event: Share button clicked
                      if (statsigClient && dashboardVariant) {
                        statsigClient.logEvent('referral_share_clicked', {
                          variant: dashboardVariant,
                          platform: 'whatsapp',
                          referral_code: referralCode
                        } as any);
                        console.log('[Referral Tracking] Event logged: referral_share_clicked', { variant: dashboardVariant, platform: 'whatsapp', referral_code: referralCode });
                      }
                    }}
                    className="px-4 py-2.5 bg-white hover:bg-green-50 rounded-lg flex items-center gap-2 transition-all border border-gray-200 hover:border-[#25D366]"
                  >
                    <IoLogoWhatsapp className="w-5 h-5 text-[#25D366]" />
                    <span className="text-[13px] text-gray-700">WhatsApp</span>
                  </button>

                  <button
                    onClick={() => {
                      const url = encodeURIComponent(referralLink);
                      const text = encodeURIComponent("Join me on DR.INFO - faster clinical knowledge with citations you can trust!");
                      window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}&summary=${text}`, '_blank');
                      
                      // Track event: Share button clicked
                      if (statsigClient && dashboardVariant) {
                        statsigClient.logEvent('referral_share_clicked', {
                          variant: dashboardVariant,
                          platform: 'linkedin',
                          referral_code: referralCode
                        } as any);
                        console.log('[Referral Tracking] Event logged: referral_share_clicked', { variant: dashboardVariant, platform: 'linkedin', referral_code: referralCode });
                      }
                    }}
                    className="px-4 py-2.5 bg-white hover:bg-blue-50 rounded-lg flex items-center gap-2 transition-all border border-gray-200 hover:border-[#0077B5]"
                  >
                    <IoLogoLinkedin className="w-5 h-5 text-[#0077B5]" />
                    <span className="text-[13px] text-gray-700">LinkedIn</span>
                  </button>

                  <button
                    onClick={() => {
                      const text = encodeURIComponent(`Join me on DR.INFO - faster clinical knowledge with citations you can trust! ${referralLink}`);
                      window.open(`https://twitter.com/intent/tweet?text=${text}`, '_blank');
                      
                      // Track event: Share button clicked
                      if (statsigClient && dashboardVariant) {
                        statsigClient.logEvent('referral_share_clicked', {
                          variant: dashboardVariant,
                          platform: 'twitter',
                          referral_code: referralCode
                        } as any);
                        console.log('[Referral Tracking] Event logged: referral_share_clicked', { variant: dashboardVariant, platform: 'twitter', referral_code: referralCode });
                      }
                    }}
                    className="px-4 py-2.5 bg-white hover:bg-gray-100 rounded-lg flex items-center gap-2 transition-all border border-gray-200 hover:border-gray-400"
                  >
                    <FaXTwitter className="w-5 h-5 text-gray-700" />
                    <span className="text-[13px] text-gray-700">X</span>
                  </button>

                  <button
                    onClick={() => {
                      const url = encodeURIComponent(referralLink);
                      window.open(`https://www.facebook.com/sharer/sharer.php?u=${url}`, '_blank');
                      
                      // Track event: Share button clicked
                      if (statsigClient && dashboardVariant) {
                        statsigClient.logEvent('referral_share_clicked', {
                          variant: dashboardVariant,
                          platform: 'facebook',
                          referral_code: referralCode
                        } as any);
                        console.log('[Referral Tracking] Event logged: referral_share_clicked', { variant: dashboardVariant, platform: 'facebook', referral_code: referralCode });
                      }
                    }}
                    className="px-4 py-2.5 bg-white hover:bg-blue-50 rounded-lg flex items-center gap-2 transition-all border border-gray-200 hover:border-[#1877F2]"
                  >
                    <FaFacebookF className="w-5 h-5 text-[#1877F2]" />
                    <span className="text-[13px] text-gray-700">Facebook</span>
                  </button>

                  <button
                    onClick={() => {
                      const text = encodeURIComponent(`Join me on DR.INFO - faster clinical knowledge with citations you can trust! ${referralLink}`);
                      window.location.href = `sms:?&body=${text}`;
                      
                      // Track event: Share button clicked
                      if (statsigClient && dashboardVariant) {
                        statsigClient.logEvent('referral_share_clicked', {
                          variant: dashboardVariant,
                          platform: 'sms',
                          referral_code: referralCode
                        } as any);
                        console.log('[Referral Tracking] Event logged: referral_share_clicked', { variant: dashboardVariant, platform: 'sms', referral_code: referralCode });
                      }
                    }}
                    className="px-4 py-2.5 bg-white hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-all border border-gray-200 hover:border-gray-300"
                  >
                    <MessageCircle className="w-5 h-5 text-gray-600" />
                    <span className="text-[13px] text-gray-700">SMS</span>
                  </button>

                  {navigator.share && (
                    <button
                      onClick={() => {
                        navigator.share({
                          title: 'Join me on DR.INFO',
                          text: 'Join me on DR.INFO - faster clinical knowledge with citations you can trust!',
                          url: referralLink,
                        }).catch(err => console.log('Error sharing:', err));
                        
                        // Track event: Share button clicked
                        if (statsigClient && dashboardVariant) {
                          statsigClient.logEvent('referral_share_clicked', {
                            variant: dashboardVariant,
                            platform: 'native_share',
                            referral_code: referralCode
                          } as any);
                          console.log('[Referral Tracking] Event logged: referral_share_clicked', { variant: dashboardVariant, platform: 'native_share', referral_code: referralCode });
                        }
                      }}
                      className="px-4 py-2.5 bg-white hover:bg-gray-50 rounded-lg flex items-center gap-2 transition-all border border-gray-200 hover:border-gray-300"
                    >
                      <MoreHorizontal className="w-5 h-5 text-gray-600" />
                      <span className="text-[13px] text-gray-700">More</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6">
          <div className="bg-white rounded-xl p-4 md:p-6 border border-gray-200 text-center">
            <h2 className="text-[17px] md:text-[20px] font-semibold text-[#223258] mb-2 leading-tight">Share your referral link</h2>
            <p className="text-[#747474] text-[15px] mb-5 leading-relaxed">Copy and share your referral link with your colleagues to start earning rewards.</p>
          </div>
        </div>
      )}

      {/* Progress Overview */}
      <div className="mb-6">
        <h3 className="text-[17px] md:text-[20px] font-semibold text-[#223258] mb-3 leading-tight px-1">Your Progress</h3>

        <div className="grid grid-cols-3 gap-2 md:gap-4 mb-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 md:p-4">
            <span className="text-[11px] md:text-[13px] text-gray-600 block mb-1.5 md:mb-2">Total Invites</span>
            <p className="text-[24px] md:text-[32px] font-semibold text-[#223258] leading-none">{referralStats.totalReferred}</p>
            <p className="text-[11px] md:text-[13px] text-gray-500 mt-1 md:mt-1.5 leading-relaxed">People invited</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-3 md:p-4">
            <span className="text-[11px] md:text-[13px] text-gray-600 block mb-1.5 md:mb-2">Qualified Users</span>
            <p className="text-[24px] md:text-[32px] font-semibold text-[#3771FE] leading-none">{referralStats.activeUsers}</p>
            <p className="text-[11px] md:text-[13px] text-gray-500 mt-1 md:mt-1.5 leading-relaxed">Asked 3+ questions</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-3 md:p-4">
            <span className="text-[11px] md:text-[13px] text-gray-600 block mb-1.5 md:mb-2">Rewards Earned</span>
            <p className="text-[24px] md:text-[32px] font-semibold leading-none text-[#3771FE]">{Math.floor(referralStats.activeUsers / 3)}</p>
            <p className="text-[11px] md:text-[13px] text-gray-500 mt-1 md:mt-1.5 leading-relaxed">Months free</p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2 md:mb-3">
            <span className="text-[13px] font-semibold text-gray-700">Progress to Next Reward</span>
            <span className="text-[13px] font-semibold text-[#3771FE]">
              {referralStats.activeUsers % 3}/3 qualified users
            </span>
          </div>
          <div className="w-full h-2.5 md:h-3 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#3771FE] to-[#5B8EFF] rounded-full transition-all duration-500"
              style={{ width: `${((referralStats.activeUsers % 3) / 3) * 100}%` }}
            />
          </div>
          <div className="text-center mt-2.5 md:mt-3">
            {referralStats.qualified ? (
              <span className="inline-flex items-center gap-1 text-[13px] text-green-600 font-semibold">
                <Check size={14} />
                Qualified! Your reward has been activated
              </span>
            ) : referralStats.activeUsers > 0 ? (
              <p className="text-[13px] text-gray-600 leading-relaxed">
                Just {3 - (referralStats.activeUsers % 3)} more {3 - (referralStats.activeUsers % 3) > 1 ? 'qualified users' : 'qualified user'} to your next free month!
              </p>
            ) : (
              <p className="text-[13px] text-[#747474] font-semibold">
                Share your link to start earning
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Referral Progress Cards */}
      {referralStats.totalReferred > 0 || referrals.length > 0 ? (
        <div className="mb-6">
          <h2 className="text-[17px] md:text-[20px] font-semibold text-[#223258] mb-1 leading-tight px-1">Your Referrals</h2>
          <p className="text-[#747474] text-[13px] md:text-[15px] mb-4 leading-relaxed px-1">Track each referral's progress toward becoming qualified</p>

          {referrals.filter(r => r.name).length > 0 ? (
            <div className="space-y-2.5">
              {referrals.map((referral, index) => {
                const isEmpty = !referral.name;
                const progress = Math.min((referral.questionsAsked / 3) * 100, 100);

                if (isEmpty) return null;

                return (
                  <div
                    key={referral.id || index}
                    className={`border-2 rounded-xl p-3.5 md:p-4 transition-all ${
                      referral.isComplete
                        ? 'bg-gradient-to-br from-[#F0FDF4] to-[#ECFDF5] border-[#86EFAC]'
                        : 'border-[#E5E7EB] bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 md:w-10 md:h-10 rounded-full flex items-center justify-center font-semibold text-[12px] md:text-[13px] flex-shrink-0 ${
                          referral.isComplete
                            ? 'bg-[#86EFAC] text-[#166534]'
                            : 'bg-[#F4F7FF] text-[#223258]'
                        }`}>
                          {referral.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className="font-semibold text-[#1A202C] text-[15px] truncate">
                              {referral.name}
                            </div>
                            {referral.isComplete && (
                              <span className="flex-shrink-0 inline-flex items-center gap-0.5 bg-[#D1FAE5] text-[#065F46] text-[10px] md:text-[11px] font-semibold px-1.5 py-0.5 rounded-full">
                                <Check size={10} />
                                <span className="hidden sm:inline">Qualified</span>
                              </span>
                            )}
                          </div>

                          <div className="space-y-1.5 md:space-y-2">
                            <div className="flex items-center gap-2 text-[11px] md:text-[13px] text-[#6B7280]">
                              <div className={`w-2 h-2 rounded-full ${referral.name ? 'bg-[#10B981]' : 'bg-[#D1D5DB]'}`}></div>
                              <span>Joined</span>
                            </div>

                            {!referral.isComplete && (
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] md:text-[13px] text-[#6B7280]">Questions asked</span>
                                  <span className="text-[11px] md:text-[13px] font-semibold text-[#3771FE]">
                                    {referral.questionsAsked}/3
                                  </span>
                                </div>
                                <div className="w-full h-1.5 md:h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-[#3771FE] to-[#5B8EFF] rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {referral.isComplete && (
                              <div className="flex items-center gap-1.5 text-[11px] md:text-[13px] text-[#065F46]">
                                <Check size={12} />
                                <span>Completed 3 questions</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {referral.isComplete && (
                        <div className="flex-shrink-0">
                          <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-[#86EFAC] flex items-center justify-center">
                            <Check size={16} className="text-[#166534]" strokeWidth={3} />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 px-4 bg-[#F9FAFB] rounded-xl border-2 border-dashed border-[#E5E7EB]">
              <Users className="mx-auto mb-3 text-[#9CA3AF]" size={28} />
              <p className="text-[13px] text-[#6B7280] leading-relaxed">No referrals yet. Share your link to get started!</p>
            </div>
          )}
        </div>
      ) : null}

      {/* Qualification Success Message */}
      {referralStats.qualified && (
        <div className="mt-6">
          <div className="bg-gradient-to-br from-[#F0FDF4] to-[#ECFDF5] rounded-xl p-6 md:p-8 text-center border-2 border-[#86EFAC]">
            <h3 className="text-[20px] md:text-[22px] font-semibold text-[#1F2937] mb-3 leading-tight">🎉 Congratulations!</h3>
            <p className="text-[#6B7280] text-[15px] mb-2 leading-relaxed">You've successfully referred 3 users and earned 1 month of free premium!</p>
            <p className="text-[#10B981] text-[14px] font-semibold">Your subscription has been automatically activated.</p>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {showEmailModal && (
        <EmailInviteModal
          onClose={() => setShowEmailModal(false)}
          inviteLink={referralLink}
          senderName={profile?.firstName || user?.displayName || 'A colleague'}
        />
      )}
    </div>
  );
}
