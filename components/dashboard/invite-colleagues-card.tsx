"use client"

import React from 'react';
import { Gift } from 'lucide-react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface InviteColleaguesCardProps {
  isOpen?: boolean;
}

export default function InviteColleaguesCard({ isOpen = true }: InviteColleaguesCardProps) {
  const router = useRouter();

  const handleInviteClick = () => {
    // Navigate to profile page with referral tab
    router.push('/dashboard/profile?tab=referralAB');
  };

  return (
    <div className="relative rounded-[10px] overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 border border-blue-400/20">
      {/* Animated background shapes */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -30, 20, 0],
            rotate: [0, 120, 240, 360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute bottom-0 left-0 w-48 h-48 bg-blue-400/20 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"
          animate={{
            x: [0, -30, 20, 0],
            y: [0, 30, -20, 0],
            rotate: [0, -120, -240, -360],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "easeInOut",
            delay: 5
          }}
        />
      </div>

      <motion.div
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        className="relative"
      >
        <button
          onClick={handleInviteClick}
          className={`relative w-full flex items-center ${isOpen ? 'gap-3 px-3 py-3' : 'justify-center p-2'} transition-all group z-10`}
        >
          <div className={`${isOpen ? 'p-2' : 'p-1.5'} bg-white/10 backdrop-blur-sm rounded-[8px] group-hover:bg-white/20 transition-colors border border-white/10`}>
            <motion.div
              animate={{ y: [0, -3, 0] }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <Gift className={`${isOpen ? 'h-5 w-5' : 'h-5 w-5'} text-white`} />
            </motion.div>
          </div>
          {isOpen && (
            <div className="flex-1 text-left">
              <p className="text-sm text-white font-semibold">
                Invite Colleagues
              </p>
              <p className="text-xs text-white/90">Get 1 month Pro</p>
            </div>
          )}
        </button>
      </motion.div>
    </div>
  );
}

