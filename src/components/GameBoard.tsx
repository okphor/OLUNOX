import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, RotateCcw, Trophy, Clock, Zap, Target, Volume2, VolumeX, Loader2, Eye, EyeOff, Users, Info, ChevronDown, ChevronUp, Sparkles, Play, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';
import { GameState, Card } from '../types/game';
import { GameCard } from './GameCard';
import { VideoFeed } from './VideoFeed';
import { TurnTimer } from './TurnTimer';
import { useSmartTTS } from '../hooks/useSmartTTS';
import { useTurnTimer } from '../hooks/useTurnTimer';
import { useEffect, useRef } from 'react';

interface GameBoardProps {
  gameState: GameState;
  currentPlayer: any;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  onPlayCard: (card: Card) => void;
  onDrawCard: () => void;
  onNewGame: () => void;
}

export function GameBoard({
  gameState,
  currentPlayer,
  localStream,
  remoteStreams,
  onPlayCard,
  onDrawCard,
  onNewGame
}: GameBoardProps) {
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [showVideoFeeds, setShowVideoFeeds] = useState(true);
  const [showProgress, setShowProgress] = useState(true);
  const [showInstructions, setShowInstructions] = useState(false);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [focusedElement, setFocusedElement] = useState<string | null>(null);
  
  const { 
    isLoading: smartTTSLoading, 
    isPlaying: smartTTSPlaying, 
    isSummarizing,
    error: smartTTSError, 
    isAvailable: smartTTSAvailable, 
    lastSummary,
    playSmartAudio, 
    stopSmartAudio, 
    clearError,
    summarizationAvailable,
    ttsAvailable
  } = useSmartTTS();
  
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [useSummarization, setUseSummarization] = useState(true);
  const lastPlayedPromptRef = useRef<string | null>(null);
  const [isPlayingCard, setIsPlayingCard] = useState(false);
  const announcementRef = useRef<HTMLDivElement>(null);

  const currentPlayerData = gameState.players.find(p => p.id === currentPlayer.id);
  const isCurrentPlayerTurn = gameState.players[gameState.currentPlayerIndex]?.id === currentPlayer.id;
  const activePlayer = gameState.players[gameState.currentPlayerIndex];

  // Turn timer logic
  const handleTurnExpired = () => {
    if (isCurrentPlayerTurn && gameState.deck.length > 0) {
      console.log('Turn expired, automatically drawing card');
      onDrawCard();
      addAnnouncement('Time expired! Automatically drawing a card.');
    }
  };

  const {
    timeRemaining,
    isActive: timerActive,
    hasExpired: timerExpired,
    progress: timerProgress,
    formattedTime,
    resetTimer
  } = useTurnTimer(
    isCurrentPlayerTurn,
    gameState.turnStartTime,
    30000, // 30 seconds
    handleTurnExpired
  );

  // Reset timer when turn changes or card is played
  useEffect(() => {
    if (isCurrentPlayerTurn && gameState.turnStartTime) {
      resetTimer(gameState.turnStartTime);
    }
  }, [gameState.currentPlayerIndex, gameState.turnStartTime, resetTimer]);

  // Accessibility announcements
  const addAnnouncement = (message: string) => {
    setAnnouncements(prev => [...prev.slice(-2), message]); // Keep last 3 announcements
    setTimeout(() => {
      setAnnouncements(prev => prev.slice(1));
    }, 5000);
  };

  // Auto-play TTS when a new prompt appears
  useEffect(() => {
    if (
      gameState.currentPrompt && 
      autoPlayEnabled && 
      !smartTTSPlaying && 
      !smartTTSLoading && 
      smartTTSAvailable &&
      gameState.currentPrompt !== lastPlayedPromptRef.current
    ) {
      console.log('Auto-playing smart TTS for new prompt');
      lastPlayedPromptRef.current = gameState.currentPrompt;
      playSmartAudio(gameState.currentPrompt, useSummarization);
      addAnnouncement(`New conversation prompt: ${gameState.currentPrompt.substring(0, 50)}...`);
    }
  }, [gameState.currentPrompt, autoPlayEnabled, smartTTSAvailable, useSummarization, smartTTSPlaying, smartTTSLoading, playSmartAudio]);

  // Announce turn changes
  useEffect(() => {
    if (activePlayer) {
      const message = isCurrentPlayerTurn 
        ? "It's your turn to play a card" 
        : `It's ${activePlayer.name}'s turn`;
      addAnnouncement(message);
    }
  }, [gameState.currentPlayerIndex, isCurrentPlayerTurn, activePlayer?.name]);

  // Clear TTS error and reset last played prompt when prompt changes
  useEffect(() => {
    if (!gameState.currentPrompt) {
      lastPlayedPromptRef.current = null;
    }
    
    if (smartTTSError) {
      clearError();
    }
  }, [gameState.currentPrompt, smartTTSError, clearError]);

  const handleCardPlay = async (card: Card) => {
    if (isPlayingCard) return;
    
    setIsPlayingCard(true);
    addAnnouncement(`Playing ${card.type} card: ${card.prompt.substring(0, 30)}...`);
    
    try {
      await onPlayCard(card);
    } catch (error) {
      console.error('Error playing card:', error);
      addAnnouncement('Failed to play card. Please try again.');
    } finally {
      setIsPlayingCard(false);
    }
  };

  const handleCardClick = (card: Card) => {
    if (isCurrentPlayerTurn) {
      setSelectedCard(card);
      addAnnouncement(`Selected ${card.type} card. Press Enter to play or Escape to cancel.`);
    }
  };

  const confirmCardPlay = async () => {
    if (selectedCard) {
      await handleCardPlay(selectedCard);
      setSelectedCard(null);
    }
  };

  const handleDrawCard = () => {
    if (!gameState.hasPlayedCard) {
      addAnnouncement('You must play a card before drawing!');
      return;
    }
    
    if (gameState.deck.length > 0) {
      onDrawCard();
      addAnnouncement('Drawing a new card from the deck');
    } else {
      addAnnouncement('No cards left in the deck');
    }
  };

  // Get player positions around the table (7 positions for opponents)
  const getPlayerPosition = (index: number, isMobile: boolean = false) => {
    if (isMobile) {
      // Mobile layout - arrange in a more compact way
      const positions = [
        { x: -120, y: -120, position: 'top-left' },
        { x: 0, y: -140, position: 'top-center' },
        { x: 120, y: -120, position: 'top-right' },
        { x: -140, y: 0, position: 'middle-left' },
        { x: 140, y: 0, position: 'middle-right' },
        { x: -120, y: 120, position: 'bottom-left' },
        { x: 120, y: 120, position: 'bottom-right' },
      ];
      return positions[index] || { x: 0, y: 0, position: 'center' };
    }
    
    // Desktop layout
    const positions = [
      { x: -280, y: -200, position: 'top-left' },
      { x: 0, y: -240, position: 'top-center' },
      { x: 280, y: -200, position: 'top-right' },
      { x: -380, y: -20, position: 'middle-left' },
      { x: 380, y: -20, position: 'middle-right' },
      { x: -280, y: 160, position: 'bottom-left' },
      { x: 280, y: 160, position: 'bottom-right' },
    ];
    
    return positions[index] || { x: 0, y: 0, position: 'center' };
  };

  // Arrange players: current player at bottom center, others around the table
  const arrangedPlayers = React.useMemo(() => {
    const currentPlayerIndex = gameState.players.findIndex(p => p.id === currentPlayer.id);
    const otherPlayers = gameState.players.filter(p => p.id !== currentPlayer.id);
    
    return otherPlayers.map((player, index) => ({
      player,
      position: getPlayerPosition(index),
      positionMobile: getPlayerPosition(index, true),
      isCurrentUser: false
    }));
  }, [gameState.players, currentPlayer.id]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && selectedCard) {
        setSelectedCard(null);
        addAnnouncement('Card selection cancelled');
      }
      
      if (event.key === 'Enter' && selectedCard && isCurrentPlayerTurn) {
        confirmCardPlay();
      }

      // Toggle video feeds with 'V' key
      if (event.key === 'v' || event.key === 'V') {
        setShowVideoFeeds(prev => !prev);
        addAnnouncement(showVideoFeeds ? 'Video feeds hidden' : 'Video feeds shown');
      }

      // Toggle progress with 'P' key
      if (event.key === 'p' || event.key === 'P') {
        setShowProgress(prev => !prev);
        addAnnouncement(showProgress ? 'Progress panel hidden' : 'Progress panel shown');
      }

      // Show help with '?' key
      if (event.key === '?' && !showInstructions) {
        setShowInstructions(true);
        addAnnouncement('Game instructions opened');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCard, isCurrentPlayerTurn, showVideoFeeds, showProgress, showInstructions]);

  if (gameState.gamePhase === 'finished') {
    const winner = gameState.players.find(p => p.id === gameState.winner);
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Celebration background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 20 }, (_, i) => (
            <motion.div
              key={i}
              className="absolute w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full"
              initial={{ 
                x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1000),
                y: -20,
                rotate: 0,
                scale: 0
              }}
              animate={{ 
                y: (typeof window !== 'undefined' ? window.innerHeight : 800) + 20,
                rotate: 360,
                scale: [0, 1, 0]
              }}
              transition={{ 
                duration: 3 + Math.random() * 2,
                repeat: Infinity,
                delay: Math.random() * 2
              }}
            />
          ))}
        </div>

        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-6 md:p-8 text-center max-w-lg w-full border border-white/20"
          role="dialog"
          aria-labelledby="game-over-title"
          aria-describedby="game-over-description"
        >
          <motion.div
            animate={{ 
              rotate: [0, 10, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="text-4xl md:text-6xl lg:text-8xl mb-4 md:mb-6"
            role="img"
            aria-label="Celebration"
          >
            🎉
          </motion.div>
          
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <h2 id="game-over-title" className="text-xl md:text-2xl lg:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-3 md:mb-4">
              Congratulations!
            </h2>
            <p id="game-over-description" className="text-base md:text-lg lg:text-2xl text-gray-700 mb-6 md:mb-8">
              <strong>{winner?.name}</strong> completed all 5 P's!
            </p>
          </motion.div>

          <motion.button
            onClick={onNewGame}
            className="flex items-center space-x-2 md:space-x-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 md:px-6 lg:px-8 py-2 md:py-3 lg:py-4 rounded-xl md:rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold text-sm md:text-base lg:text-lg mx-auto shadow-xl hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Start a new game"
          >
            <RotateCcw size={16} className="md:w-5 md:h-5" />
            <span>Play Again</span>
            <Trophy size={16} className="md:w-5 md:h-5" />
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-800 relative overflow-hidden">
      {/* Screen reader announcements */}
      <div 
        ref={announcementRef}
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        role="status"
      >
        {announcements.map((announcement, index) => (
          <div key={index}>{announcement}</div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-40 bg-slate-900/80 backdrop-blur-sm border-b border-slate-700">
        <div className="flex items-center justify-between px-3 md:px-6 py-2 md:py-3">
          <h1 className="text-white text-sm md:text-lg font-semibold">Card Game Table</h1>
          <div className="flex items-center space-x-2 md:space-x-4">
            {/* Turn Timer */}
            {gameState.gamePhase === 'playing' && (
              <TurnTimer
                timeRemaining={timeRemaining}
                isActive={timerActive}
                hasExpired={timerExpired}
                isMyTurn={isCurrentPlayerTurn}
                progress={timerProgress}
                formattedTime={formattedTime}
                className="hidden md:flex"
              />
            )}

            {/* AI Features Controls */}
            <div className="flex items-center space-x-1 md:space-x-2">
              {smartTTSAvailable && (
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setAutoPlayEnabled(!autoPlayEnabled)}
                    className={`p-1.5 md:p-2 rounded-lg text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      autoPlayEnabled ? 'bg-green-600 hover:bg-green-700' : 'bg-slate-700 hover:bg-slate-600'
                    }`}
                    aria-label={autoPlayEnabled ? 'Disable auto TTS' : 'Enable auto TTS'}
                    title="Toggle auto text-to-speech"
                  >
                    {smartTTSPlaying ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : autoPlayEnabled ? (
                      <Volume2 size={16} />
                    ) : (
                      <VolumeX size={16} />
                    )}
                  </button>
                  
                  {summarizationAvailable && (
                    <button
                      onClick={() => setUseSummarization(!useSummarization)}
                      className={`p-1.5 md:p-2 rounded-lg text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                        useSummarization ? 'bg-blue-600 hover:bg-blue-700' : 'bg-slate-700 hover:bg-slate-600'
                      }`}
                      aria-label={useSummarization ? 'Disable summarization' : 'Enable summarization'}
                      title="Toggle AI summarization"
                    >
                      <Sparkles size={16} />
                    </button>
                  )}
                </div>
              )}
              
              {gameState.currentPrompt && smartTTSAvailable && (
                <button
                  onClick={() => playSmartAudio(gameState.currentPrompt!, useSummarization)}
                  disabled={smartTTSLoading || smartTTSPlaying}
                  className="p-1.5 md:p-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 rounded-lg text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  aria-label="Play current prompt with TTS"
                  title="Play current prompt"
                >
                  {smartTTSLoading || smartTTSPlaying ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Play size={16} />
                  )}
                </button>
              )}
            </div>

            <button
              onClick={() => setShowVideoFeeds(!showVideoFeeds)}
              className="p-1.5 md:p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label={showVideoFeeds ? 'Hide video feeds' : 'Show video feeds'}
              title="Toggle video feeds (V)"
            >
              {showVideoFeeds ? <Eye size={16} className="md:w-5 md:h-5" /> : <EyeOff size={16} className="md:w-5 md:h-5" />}
            </button>
            
            <button
              onClick={() => setShowInstructions(!showInstructions)}
              className="p-1.5 md:p-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label={showInstructions ? 'Hide game instructions' : 'Show game instructions'}
              title="Toggle instructions (?)"
            >
              <Info size={16} className="md:w-5 md:h-5" />
            </button>

            <button
              onClick={onNewGame}
              className="flex items-center space-x-1 md:space-x-2 bg-slate-700 hover:bg-slate-600 text-white px-2 md:px-4 py-1.5 md:py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <RotateCcw size={14} className="md:w-4 md:h-4" />
              <span className="text-xs md:text-sm">Reset</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Turn Timer */}
      {gameState.gamePhase === 'playing' && (
        <div className="md:hidden absolute top-16 left-4 right-4 z-30">
          <TurnTimer
            timeRemaining={timeRemaining}
            isActive={timerActive}
            hasExpired={timerExpired}
            isMyTurn={isCurrentPlayerTurn}
            progress={timerProgress}
            formattedTime={formattedTime}
            className="bg-slate-900/90 backdrop-blur-sm rounded-xl p-3"
          />
        </div>
      )}

      {/* AI Features Status */}
      {smartTTSError && (
        <div className="absolute top-16 md:top-20 left-4 right-4 bg-red-50 border border-red-200 rounded-xl p-3 md:p-4 z-30">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-red-800 text-sm">AI Features: {smartTTSError}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-600 hover:text-red-800 focus:outline-none"
              aria-label="Dismiss error"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* Instructions Panel */}
      <AnimatePresence>
        {showInstructions && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-12 md:top-16 left-2 md:left-4 right-2 md:right-4 bg-blue-50 border border-blue-200 rounded-xl md:rounded-2xl p-3 md:p-6 z-30"
            role="dialog"
            aria-labelledby="instructions-title"
          >
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <h3 id="instructions-title" className="text-sm md:text-lg font-semibold text-blue-800 flex items-center space-x-2">
                <Info size={16} className="md:w-5 md:h-5" />
                <span>Game Instructions & Keyboard Shortcuts</span>
              </h3>
              <button
                onClick={() => setShowInstructions(false)}
                className="text-blue-600 hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
                aria-label="Close instructions"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 text-xs md:text-sm text-blue-700">
              <div>
                <h4 className="font-semibold mb-2">How to Play:</h4>
                <ul className="space-y-1">
                  <li>• Goal: Collect all 5 P's (Purpose, Problems, Prognosis, Plan, Perform)</li>
                  <li>• On your turn: Play a card and discuss the prompt (30 seconds)</li>
                  <li>• After discussion: Draw a new card</li>
                  <li>• First to collect all 5 P's wins!</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Features & Shortcuts:</h4>
                <ul className="space-y-1">
                  <li>• <kbd className="bg-blue-100 px-1 rounded">V</kbd> - Toggle video feeds</li>
                  <li>• <kbd className="bg-blue-100 px-1 rounded">?</kbd> - Show this help</li>
                  <li>• <kbd className="bg-blue-100 px-1 rounded">Enter</kbd> - Play selected card</li>
                  <li>• <kbd className="bg-blue-100 px-1 rounded">Esc</kbd> - Cancel selection</li>
                  <li>• 30-second turn timer with auto-advance</li>
                  <li>• AI TTS reads prompts aloud automatically</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Game Table */}
      <div className="pt-12 md:pt-16 pb-64 md:pb-80 h-screen flex items-center justify-center px-2 md:px-4">
        <div className="relative w-full h-full max-w-6xl max-h-4xl">
          {/* Opponent Players positioned around the table */}
          {arrangedPlayers.map((item, index) => {
            const { player, position, positionMobile } = item;
            const isActivePlayer = player.id === activePlayer?.id;
            const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
            const currentPosition = isMobile ? positionMobile : position;
            
            return (
              <motion.div
                key={player.id}
                className="absolute"
                style={{
                  left: `calc(50% + ${currentPosition.x}px)`,
                  top: `calc(50% + ${currentPosition.y}px)`,
                  transform: 'translate(-50%, -50%)'
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {/* Player Area */}
                <div className="flex flex-col items-center space-y-1 md:space-y-2">
                  {/* Video Feed */}
                  {showVideoFeeds && (
                    <div className="w-12 h-10 md:w-20 md:h-16 lg:w-24 lg:h-18">
                      <VideoFeed
                        stream={remoteStreams.get(player.id) || null}
                        playerName={player.name}
                        isLocal={false}
                        isCurrentPlayer={isActivePlayer}
                        isHost={player.isHost}
                        className="w-full h-full rounded-md md:rounded-lg border border-slate-600 shadow-lg"
                      />
                    </div>
                  )}
                  
                  {/* Player Cards */}
                  <div className="flex space-x-0.5 md:space-x-1">
                    {Array.from({ length: Math.min(player.hand.length, 3) }, (_, cardIndex) => (
                      <div
                        key={cardIndex}
                        className="w-4 h-6 md:w-8 md:h-12 bg-purple-600 rounded border border-purple-500 flex items-center justify-center shadow-sm"
                      >
                        <Layers size={8} className="md:w-3 md:h-3 text-purple-200" />
                      </div>
                    ))}
                    {player.hand.length > 3 && (
                      <div className="w-4 h-6 md:w-8 md:h-12 bg-slate-600 rounded border border-slate-500 flex items-center justify-center">
                        <span className="text-slate-200 text-xs font-bold">+{player.hand.length - 3}</span>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}

          {/* Central Game Area - Properly centered */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
            <div className="flex items-center space-x-4 md:space-x-8">
              {/* Last Played Card */}
              <div className="text-center">
                <div className="text-slate-300 text-xs md:text-sm font-medium mb-1 md:mb-2">Last Played</div>
                {gameState.discardPile.length > 0 ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="w-12 h-18 md:w-20 md:h-28 lg:w-24 lg:h-36"
                  >
                    <GameCard 
                      card={gameState.discardPile[gameState.discardPile.length - 1]} 
                      className="w-full h-full shadow-xl"
                    />
                  </motion.div>
                ) : (
                  <div className="w-12 h-18 md:w-20 md:h-28 lg:w-24 lg:h-36 border-2 border-dashed border-slate-600 rounded-xl flex flex-col items-center justify-center bg-slate-700/50">
                    <div className="text-slate-400 text-sm md:text-lg mb-1">📭</div>
                    <span className="text-slate-400 text-xs">Empty</span>
                  </div>
                )}
              </div>

              {/* Draw Pile */}
              <div className="text-center">
                <div className="text-slate-300 text-xs md:text-sm font-medium mb-1 md:mb-2">Draw Pile ({gameState.deck.length})</div>
                <motion.button
                  className={`relative w-12 h-18 md:w-20 md:h-28 lg:w-24 lg:h-36 bg-gradient-to-br from-purple-600 via-purple-700 to-purple-800 rounded-xl shadow-xl flex flex-col items-center justify-center transition-all duration-300 ${
                    isCurrentPlayerTurn && gameState.hasPlayedCard ? 'cursor-pointer hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-purple-500/50' : 'cursor-not-allowed opacity-60'
                  }`}
                  whileHover={isCurrentPlayerTurn && gameState.hasPlayedCard ? { 
                    scale: 1.05, 
                    rotate: 2,
                  } : {}}
                  whileTap={isCurrentPlayerTurn && gameState.hasPlayedCard ? { scale: 0.95 } : {}}
                  onClick={isCurrentPlayerTurn && gameState.hasPlayedCard ? handleDrawCard : undefined}
                  disabled={!isCurrentPlayerTurn || gameState.deck.length === 0 || !gameState.hasPlayedCard}
                  animate={isCurrentPlayerTurn && gameState.hasPlayedCard ? { 
                    boxShadow: [
                      "0 10px 25px rgba(147, 51, 234, 0.3)",
                      "0 15px 35px rgba(147, 51, 234, 0.5)",
                      "0 10px 25px rgba(147, 51, 234, 0.3)"
                    ]
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {/* Card stack effect */}
                  <div className="absolute inset-0 bg-purple-500 rounded-xl transform translate-x-1 translate-y-1 opacity-60"></div>
                  <div className="absolute inset-0 bg-purple-600 rounded-xl transform translate-x-0.5 translate-y-0.5 opacity-80"></div>
                  
                  {/* Main card */}
                  <div className="relative z-10 text-center">
                    <Layers className="text-purple-200 mx-auto mb-1" size={12} />
                    <div className="text-purple-100 font-bold text-xs md:text-sm">{gameState.deck.length}</div>
                    <div className="text-purple-200 text-xs">cards</div>
                    
                    {isCurrentPlayerTurn && gameState.hasPlayedCard && (
                      <motion.div
                        className="flex items-center justify-center space-x-1 text-purple-200 text-xs mt-1"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Play size={6} className="md:w-2 md:h-2" />
                        <span className="hidden md:inline">Draw</span>
                      </motion.div>
                    )}

                    {isCurrentPlayerTurn && !gameState.hasPlayedCard && (
                      <div className="flex items-center justify-center space-x-1 text-red-300 text-xs mt-1">
                        <AlertCircle size={6} className="md:w-2 md:h-2" />
                        <span className="hidden md:inline">Play first</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-xl pointer-events-none"></div>
                </motion.button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Player Video Feed - Positioned at bottom */}
      <div className="fixed bottom-56 md:bottom-80 left-1/2 transform -translate-x-1/2 z-20">
        {showVideoFeeds && (
          <div className="w-20 h-16 md:w-32 md:h-24 lg:w-40 lg:h-30">
            <VideoFeed
              stream={localStream}
              playerName={currentPlayerData?.name || 'You'}
              isLocal={true}
              isCurrentPlayer={isCurrentPlayerTurn}
              isHost={currentPlayerData?.isHost || false}
              className="w-full h-full rounded-lg border-4 border-yellow-400 shadow-xl"
            />
          </div>
        )}
      </div>

      {/* Current Player's Hand - Fixed Bottom Panel */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700">
        <div className="p-2 md:p-4">
          {/* Turn Status Indicator */}
          {gameState.gamePhase === 'playing' && (
            <div className="mb-2 md:mb-3">
              <AnimatePresence mode="wait">
                {isCurrentPlayerTurn ? (
                  <motion.div
                    key="my-turn"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-center space-x-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-xl p-2"
                  >
                    <Zap className="text-green-400" size={16} />
                    <span className="text-green-300 font-semibold text-sm">
                      {gameState.hasPlayedCard ? 'Ready to draw!' : 'Play a card to continue'}
                    </span>
                    {gameState.hasPlayedCard && <CheckCircle2 className="text-green-400" size={16} />}
                    {!gameState.hasPlayedCard && <AlertCircle className="text-yellow-400" size={16} />}
                  </motion.div>
                ) : (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-center space-x-2 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-500/30 rounded-xl p-2"
                  >
                    <Clock className="text-blue-400" size={16} />
                    <span className="text-blue-300 font-semibold text-sm">
                      Waiting for {activePlayer?.name}'s turn
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Conversation Prompt */}
          <AnimatePresence>
            {gameState.currentPrompt && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-2 md:p-3 rounded-r-xl shadow-lg mb-2 md:mb-4"
              >
                <div className="flex items-center space-x-2 mb-1 md:mb-2">
                  <div className="w-4 h-4 md:w-6 md:h-6 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-lg flex items-center justify-center">
                    💭
                  </div>
                  <h3 className="text-xs md:text-sm font-bold text-yellow-800">Conversation Starter</h3>
                  {smartTTSAvailable && (
                    <button
                      onClick={() => playSmartAudio(gameState.currentPrompt!, useSummarization)}
                      disabled={smartTTSLoading || smartTTSPlaying}
                      className="p-1 bg-yellow-200 hover:bg-yellow-300 disabled:opacity-50 rounded text-yellow-800 transition-colors"
                      aria-label="Play prompt with TTS"
                    >
                      {smartTTSLoading || smartTTSPlaying ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <Volume2 size={12} />
                      )}
                    </button>
                  )}
                </div>
                <p className="text-yellow-700 text-xs md:text-sm leading-relaxed">{gameState.currentPrompt}</p>
                {lastSummary && lastSummary !== gameState.currentPrompt && (
                  <div className="mt-2 pt-2 border-t border-yellow-200">
                    <p className="text-yellow-600 text-xs italic">AI Summary: {lastSummary}</p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Hand Header */}
          <div className="flex items-center justify-center mb-2 md:mb-3">
            <h3 className="text-white text-sm md:text-lg font-bold flex items-center space-x-2">
              <span>Your Hand ({currentPlayerData?.hand.length || 0} cards)</span>
              {isCurrentPlayerTurn && (
                <motion.div 
                  className="flex items-center space-x-1 text-yellow-400"
                  animate={{ opacity: [0.7, 1, 0.7] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <Zap size={12} className="md:w-4 md:h-4" />
                  <span className="font-semibold text-xs md:text-sm">Your Turn</span>
                </motion.div>
              )}
            </h3>
          </div>
          
          {/* Cards - Responsive Grid Layout */}
          <div className="flex justify-center">
            <div className="grid grid-cols-5 md:flex md:justify-center gap-1 md:gap-3 w-full max-w-full">
              {currentPlayerData?.hand.map((card, index) => (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 20, rotate: -10 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0, 
                    rotate: 0
                  }}
                  transition={{ delay: index * 0.1 }}
                  className="flex-shrink-0"
                >
                  <GameCard
                    card={card}
                    isInHand={true}
                    onClick={() => handleCardClick(card)}
                    className={`transition-all duration-300 w-full h-20 md:w-24 md:h-36 ${
                      selectedCard?.id === card.id 
                        ? 'ring-2 ring-yellow-400 ring-opacity-75 transform scale-105' 
                        : isCurrentPlayerTurn 
                          ? 'hover:scale-105 hover:shadow-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-yellow-400' 
                          : 'opacity-75 cursor-not-allowed'
                    }`}
                    tabIndex={isCurrentPlayerTurn ? 0 : -1}
                    role="button"
                    aria-label={`${card.type} card: ${card.prompt.substring(0, 50)}...`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleCardClick(card);
                      }
                    }}
                  />
                </motion.div>
              )) || (
                <div className="text-slate-400 text-center py-4 md:py-8 w-full col-span-5">
                  No cards in hand
                </div>
              )}
            </div>
          </div>

          {/* Play Card Section */}
          <AnimatePresence>
            {selectedCard && isCurrentPlayerTurn && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="mt-2 md:mt-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-3 md:p-4 border border-indigo-200"
              >
                <div className="text-center space-y-2 md:space-y-3">
                  <h4 className="text-sm md:text-lg font-semibold text-gray-800 flex items-center justify-center space-x-2">
                    <Sparkles className="text-indigo-600" size={16} />
                    <span>Selected Card</span>
                  </h4>
                  <p className="text-gray-700 text-xs md:text-sm leading-relaxed max-w-2xl mx-auto">
                    <strong className="text-indigo-600">{selectedCard.type}:</strong> {selectedCard.prompt}
                  </p>
                  <div className="flex justify-center space-x-2 md:space-x-4">
                    <button
                      onClick={() => setSelectedCard(null)}
                      className="px-3 md:px-4 py-1.5 md:py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium rounded-lg border border-gray-200 hover:bg-gray-50 text-xs md:text-sm"
                    >
                      Cancel
                    </button>
                    <motion.button
                      onClick={confirmCardPlay}
                      disabled={isPlayingCard}
                      className="flex items-center space-x-1 md:space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-3 md:px-4 py-1.5 md:py-2 rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 text-xs md:text-sm"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span>{isPlayingCard ? 'Playing...' : 'Play Card'}</span>
                      <ArrowRight size={12} className="md:w-4 md:h-4" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}