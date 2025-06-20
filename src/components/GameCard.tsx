import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '../types/game';

interface GameCardProps {
  card: Card;
  isInHand?: boolean;
  onClick?: () => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  className?: string;
  tabIndex?: number;
  role?: string;
  onKeyDown?: (e: React.KeyboardEvent) => void;
}

export function GameCard({ 
  card, 
  isInHand = false, 
  onClick, 
  onDragStart, 
  onDragEnd,
  className = "",
  tabIndex,
  role,
  onKeyDown
}: GameCardProps) {
  const cardVariants = {
    hand: {
      scale: 1,
      y: 0,
      rotateX: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    hover: {
      scale: 1.05,
      y: -12,
      rotateX: 5,
      transition: { duration: 0.2, ease: "easeOut" }
    }
  };

  const getCardGradient = (type: string) => {
    const gradients = {
      Purpose: 'from-purple-500 via-purple-600 to-indigo-600',
      Problems: 'from-red-500 via-red-600 to-pink-600',
      Prognosis: 'from-cyan-500 via-blue-500 to-indigo-500',
      Plan: 'from-emerald-500 via-green-500 to-teal-600',
      Perform: 'from-yellow-500 via-orange-500 to-red-500'
    };
    return gradients[type as keyof typeof gradients] || 'from-gray-500 to-gray-600';
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      Purpose: '🎯',
      Problems: '⚡',
      Prognosis: '🔮',
      Plan: '📋',
      Perform: '🚀'
    };
    return icons[type as keyof typeof icons] || '❓';
  };

  const getTypeDescription = (type: string) => {
    const descriptions = {
      Purpose: 'Purpose - Your why and motivation',
      Problems: 'Problems - Challenges and obstacles',
      Prognosis: 'Prognosis - Future outlook and predictions',
      Plan: 'Plan - Strategy and next steps',
      Perform: 'Perform - Actions and achievements'
    };
    return descriptions[type as keyof typeof descriptions] || type;
  };

  return (
    <motion.div
      className={`relative cursor-pointer select-none ${className}`}
      variants={cardVariants}
      initial="hand"
      whileHover={isInHand ? "hover" : undefined}
      draggable={isInHand}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onKeyDown={onKeyDown}
      tabIndex={tabIndex}
      role={role}
      style={{ perspective: '1000px' }}
      aria-label={`${getTypeDescription(card.type)}: ${card.prompt}`}
    >
      <div className={`w-full h-full rounded-2xl shadow-2xl border-2 border-white/50 flex flex-col overflow-hidden bg-gradient-to-br ${getCardGradient(card.type)} relative transform-gpu`}>
        {/* Card shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/30 via-white/10 to-transparent pointer-events-none" />
        
        {/* Decorative corner elements */}
        <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-white/40 rounded-tl-lg"></div>
        <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-white/40 rounded-tr-lg"></div>
        <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-white/40 rounded-bl-lg"></div>
        <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-white/40 rounded-br-lg"></div>
        
        {/* Header */}
        <div className="p-3 flex items-center justify-between relative z-10">
          <div className="text-white text-xs font-bold bg-black/20 backdrop-blur-sm px-2 py-1 rounded-full border border-white/20">
            {card.type}
          </div>
          <div className="text-2xl drop-shadow-lg" role="img" aria-label={getTypeDescription(card.type)}>
            {getTypeIcon(card.type)}
          </div>
        </div>
        
        {/* Content */}
        <div className="flex-1 p-3 pt-0 relative z-10">
          <div className="text-white text-[10px] leading-tight overflow-hidden h-full flex items-center">
            <p className="line-clamp-6 drop-shadow-sm">
              {card.prompt.length > 120 ? `${card.prompt.substring(0, 120)}...` : card.prompt}
            </p>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-black/30 backdrop-blur-sm p-2 text-center relative z-10 border-t border-white/20">
          <div className="text-white text-lg font-bold drop-shadow-lg">
            {card.type.charAt(0)}
          </div>
        </div>

        {/* Hover glow effect */}
        {isInHand && (
          <motion.div
            className="absolute inset-0 bg-white/15 rounded-2xl opacity-0"
            whileHover={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
          />
        )}

        {/* Interactive sparkles */}
        {isInHand && (
          <motion.div
            className="absolute top-3 right-3 text-yellow-300 opacity-0 drop-shadow-lg"
            whileHover={{ 
              opacity: [0, 1, 0],
              scale: [0.8, 1.2, 0.8],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 0.6, repeat: Infinity }}
            role="img"
            aria-label="Interactive card"
          >
            ✨
          </motion.div>
        )}

        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="w-full h-full bg-gradient-to-br from-transparent via-white/5 to-transparent"></div>
        </div>

        {/* Focus indicator for keyboard navigation */}
        <div className="absolute inset-0 rounded-2xl ring-2 ring-transparent focus-within:ring-white/60 transition-all duration-200 pointer-events-none" />
      </div>
      
      {/* Enhanced card shadow with multiple layers */}
      <div className="absolute inset-0 bg-black/30 rounded-2xl -z-10 transform translate-y-2 blur-md" />
      <div className="absolute inset-0 bg-black/15 rounded-2xl -z-20 transform translate-y-4 blur-lg" />
    </motion.div>
  );
}