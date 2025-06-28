import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, AlertTriangle, Zap } from 'lucide-react';

interface TurnTimerProps {
  timeRemaining: number;
  isActive: boolean;
  hasExpired: boolean;
  isMyTurn: boolean;
  progress: number;
  formattedTime: number;
  className?: string;
}

export function TurnTimer({
  timeRemaining,
  isActive,
  hasExpired,
  isMyTurn,
  progress,
  formattedTime,
  className = ""
}: TurnTimerProps) {
  const isUrgent = formattedTime <= 10;
  const isCritical = formattedTime <= 5;

  if (!isActive && !hasExpired) {
    return null;
  }

  return (
    <AnimatePresence>
      {(isActive || hasExpired) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          className={`flex items-center space-x-3 ${className}`}
        >
          {/* Timer Circle */}
          <div className="relative">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 64 64">
              {/* Background circle */}
              <circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                className="text-gray-300"
              />
              {/* Progress circle */}
              <motion.circle
                cx="32"
                cy="32"
                r="28"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                className={`${
                  isCritical 
                    ? 'text-red-500' 
                    : isUrgent 
                      ? 'text-yellow-500' 
                      : 'text-green-500'
                }`}
                strokeDasharray={`${2 * Math.PI * 28}`}
                strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress)}`}
                animate={isCritical ? {
                  strokeDashoffset: [
                    `${2 * Math.PI * 28 * (1 - progress)}`,
                    `${2 * Math.PI * 28 * (1 - progress) + 10}`,
                    `${2 * Math.PI * 28 * (1 - progress)}`
                  ]
                } : {}}
                transition={isCritical ? {
                  duration: 0.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                } : { duration: 0.3 }}
              />
            </svg>
            
            {/* Timer content */}
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                className="text-center"
                animate={isCritical ? {
                  scale: [1, 1.1, 1]
                } : {}}
                transition={isCritical ? {
                  duration: 0.5,
                  repeat: Infinity
                } : {}}
              >
                {hasExpired ? (
                  <AlertTriangle 
                    size={20} 
                    className="text-red-500 mx-auto" 
                  />
                ) : (
                  <>
                    <div className={`text-lg font-bold ${
                      isCritical 
                        ? 'text-red-600' 
                        : isUrgent 
                          ? 'text-yellow-600' 
                          : 'text-green-600'
                    }`}>
                      {formattedTime}
                    </div>
                    <Clock 
                      size={12} 
                      className={`mx-auto ${
                        isCritical 
                          ? 'text-red-500' 
                          : isUrgent 
                            ? 'text-yellow-500' 
                            : 'text-green-500'
                      }`} 
                    />
                  </>
                )}
              </motion.div>
            </div>
          </div>

          {/* Timer info */}
          <div className="flex-1">
            <AnimatePresence mode="wait">
              {hasExpired ? (
                <motion.div
                  key="expired"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-red-600"
                >
                  <div className="font-bold text-sm">Time's Up!</div>
                  <div className="text-xs">Turn will switch automatically</div>
                </motion.div>
              ) : isMyTurn ? (
                <motion.div
                  key="my-turn"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className={`${
                    isCritical 
                      ? 'text-red-600' 
                      : isUrgent 
                        ? 'text-yellow-600' 
                        : 'text-green-600'
                  }`}
                >
                  <div className="font-bold text-sm flex items-center space-x-1">
                    <Zap size={14} />
                    <span>Your Turn</span>
                  </div>
                  <div className="text-xs">
                    {isCritical 
                      ? 'Hurry up!' 
                      : isUrgent 
                        ? 'Time running out...' 
                        : 'Play a card to continue'
                    }
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="waiting"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-gray-600"
                >
                  <div className="font-bold text-sm">Waiting...</div>
                  <div className="text-xs">Other player's turn</div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}