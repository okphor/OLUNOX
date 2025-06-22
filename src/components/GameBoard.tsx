import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, RotateCcw, Trophy, Clock, Zap, Target, Volume2, VolumeX, Loader2, Eye, EyeOff, Users, Info, ChevronDown, ChevronUp, Sparkles, Play } from 'lucide-react';
import { GameState, Card } from '../types/game';
import { GameCard } from './GameCard';
import { VideoFeed } from './VideoFeed';
import { useSmartTTS } from '../hooks/useSmartTTS';
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
    if (gameState.deck.length > 0) {
      onDrawCard();
      addAnnouncement('Drawing a new card from the deck');
    } else {
      addAnnouncement('No cards left in the deck');
    }
  };

  const getProgressPercentage = () => {
    if (!currentPlayerData) return 0;
    const uniqueTypes = new Set(currentPlayerData.hand.map(card => card.type));
    return (uniqueTypes.size / 5) * 100;
  };

  // Get player positions around the table
  const getPlayerPosition = (index: number, total: number) => {
    const angle = (index * 360) / total;
    const radius = 280; // Distance from center
    const x = Math.cos((angle - 90) * Math.PI / 180) * radius;
    const y = Math.sin((angle - 90) * Math.PI / 180) * radius;
    return { x, y, angle };
  };

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
                x: Math.random() * window.innerWidth,
                y: -20,
                rotate: 0,
                scale: 0
              }}
              animate={{ 
                y: window.innerHeight + 20,
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
          className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-2xl p-8 text-center max-w-lg w-full border border-white/20"
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
            className="text-6xl md:text-8xl mb-6"
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
            <h2 id="game-over-title" className="text-2xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-4">
              Congratulations!
            </h2>
            <p id="game-over-description" className="text-lg md:text-2xl text-gray-700 mb-8">
              <strong>{winner?.name}</strong> completed all 5 P's!
            </p>
          </motion.div>

          <motion.button
            onClick={onNewGame}
            className="flex items-center space-x-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 md:px-8 py-3 md:py-4 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold text-base md:text-lg mx-auto shadow-xl hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            aria-label="Start a new game"
          >
            <RotateCcw size={20} />
            <span>Play Again</span>
            <Trophy size={20} />
          </motion.button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
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

      {/* Skip to main content link */}
      <a 
        href="#main-game-content" 
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 bg-indigo-600 text-white px-4 py-2 rounded-lg z-50"
      >
        Skip to main game content
      </a>

      {/* Accessibility controls */}
      <div className="absolute top-4 right-4 z-40 flex flex-col space-y-2">
        <button
          onClick={() => setShowVideoFeeds(!showVideoFeeds)}
          className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label={showVideoFeeds ? 'Hide video feeds' : 'Show video feeds'}
          title="Toggle video feeds (V)"
        >
          {showVideoFeeds ? <Eye size={20} /> : <EyeOff size={20} />}
        </button>
        
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="p-2 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg hover:bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label={showInstructions ? 'Hide game instructions' : 'Show game instructions'}
          title="Toggle instructions (?)"
        >
          <Info size={20} />
        </button>
      </div>

      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-3xl"></div>
      </div>

      <main id="main-game-content" className="relative z-10 h-screen flex flex-col">
        {/* Instructions Panel */}
        <AnimatePresence>
          {showInstructions && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute top-16 left-4 right-4 bg-blue-50 border border-blue-200 rounded-2xl p-4 md:p-6 z-30"
              role="dialog"
              aria-labelledby="instructions-title"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 id="instructions-title" className="text-lg font-semibold text-blue-800 flex items-center space-x-2">
                  <Info size={20} />
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-blue-700">
                <div>
                  <h4 className="font-semibold mb-2">How to Play:</h4>
                  <ul className="space-y-1">
                    <li>• Goal: Collect all 5 P's (Purpose, Problems, Prognosis, Plan, Perform)</li>
                    <li>• On your turn: Play a card and discuss the prompt</li>
                    <li>• After discussion: Draw a new card</li>
                    <li>• First to collect all 5 P's wins!</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Keyboard Shortcuts:</h4>
                  <ul className="space-y-1">
                    <li>• <kbd className="bg-blue-100 px-1 rounded">V</kbd> - Toggle video feeds</li>
                    <li>• <kbd className="bg-blue-100 px-1 rounded">P</kbd> - Toggle progress panel</li>
                    <li>• <kbd className="bg-blue-100 px-1 rounded">?</kbd> - Show this help</li>
                    <li>• <kbd className="bg-blue-100 px-1 rounded">Enter</kbd> - Play selected card</li>
                    <li>• <kbd className="bg-blue-100 px-1 rounded">Esc</kbd> - Cancel selection</li>
                  </ul>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Game Table Layout */}
        <div className="flex-1 relative">
          {/* Players positioned around the table */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full max-w-6xl max-h-6xl">
              {gameState.players.map((player, index) => {
                const position = getPlayerPosition(index, gameState.players.length);
                const isCurrentUser = player.id === currentPlayer.id;
                const isActivePlayer = player.id === activePlayer?.id;
                
                return (
                  <motion.div
                    key={player.id}
                    className="absolute"
                    style={{
                      left: `calc(50% + ${position.x}px)`,
                      top: `calc(50% + ${position.y}px)`,
                      transform: 'translate(-50%, -50%)'
                    }}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {/* Player Area */}
                    <div className="flex flex-col items-center space-y-3">
                      {/* Video Feed */}
                      {showVideoFeeds && (
                        <div className="w-24 h-24 md:w-32 md:h-32">
                          <VideoFeed
                            stream={isCurrentUser ? localStream : remoteStreams.get(player.id) || null}
                            playerName={player.name}
                            isLocal={isCurrentUser}
                            isCurrentPlayer={isActivePlayer}
                            isHost={player.isHost}
                            className="w-full h-full rounded-xl border-2 border-white/20 shadow-lg"
                          />
                        </div>
                      )}
                      
                      {/* Player Name */}
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        isActivePlayer 
                          ? 'bg-yellow-400 text-yellow-900 shadow-lg' 
                          : 'bg-white/20 text-white backdrop-blur-sm'
                      }`}>
                        {player.name} {isCurrentUser && '(You)'}
                      </div>
                      
                      {/* Player Cards */}
                      <div className="flex space-x-1">
                        {isCurrentUser ? (
                          // Show actual cards for current user
                          player.hand.slice(0, 3).map((card, cardIndex) => (
                            <motion.div
                              key={card.id}
                              className="w-12 h-16 md:w-16 md:h-20"
                              whileHover={{ scale: 1.1, y: -5 }}
                              onClick={() => handleCardClick(card)}
                            >
                              <GameCard
                                card={card}
                                isInHand={true}
                                className={`w-full h-full cursor-pointer transition-all ${
                                  selectedCard?.id === card.id ? 'ring-2 ring-yellow-400' : ''
                                }`}
                              />
                            </motion.div>
                          ))
                        ) : (
                          // Show card backs for other players
                          Array.from({ length: Math.min(player.hand.length, 3) }, (_, cardIndex) => (
                            <div
                              key={cardIndex}
                              className="w-12 h-16 md:w-16 md:h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-lg shadow-lg border border-white/20 flex items-center justify-center"
                            >
                              <div className="text-white text-xs">🎴</div>
                            </div>
                          ))
                        )}
                        {player.hand.length > 3 && (
                          <div className="w-12 h-16 md:w-16 md:h-20 bg-white/20 backdrop-blur-sm rounded-lg border border-white/30 flex items-center justify-center">
                            <span className="text-white text-xs font-bold">+{player.hand.length - 3}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Center Game Area */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center space-x-8 pointer-events-auto">
              {/* Last Played Card */}
              <div className="text-center">
                <div className="text-white text-sm font-medium mb-2">Last Played</div>
                {gameState.discardPile.length > 0 ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -10 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    className="relative w-24 h-32 md:w-32 md:h-44"
                  >
                    <GameCard 
                      card={gameState.discardPile[gameState.discardPile.length - 1]} 
                      className="w-full h-full shadow-2xl"
                    />
                    <motion.div
                      className="absolute inset-0 bg-yellow-400/20 rounded-2xl blur-lg"
                      animate={{ 
                        opacity: [0.3, 0.6, 0.3],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                  </motion.div>
                ) : (
                  <div className="w-24 h-32 md:w-32 md:h-44 border-2 border-dashed border-white/30 rounded-2xl flex flex-col items-center justify-center bg-white/10 backdrop-blur-sm">
                    <div className="text-white/60 text-2xl mb-1">📭</div>
                    <span className="text-white/60 text-xs">Empty</span>
                  </div>
                )}
              </div>

              {/* Draw Pile */}
              <div className="text-center">
                <div className="text-white text-sm font-medium mb-2">Draw Pile</div>
                <motion.button
                  className={`relative w-24 h-32 md:w-32 md:h-44 bg-gradient-to-br from-indigo-600 via-purple-600 to-indigo-800 rounded-2xl shadow-2xl flex flex-col items-center justify-center transition-all duration-300 ${
                    isCurrentPlayerTurn ? 'cursor-pointer hover:shadow-3xl focus:outline-none focus:ring-4 focus:ring-indigo-500/50' : 'cursor-not-allowed opacity-60'
                  }`}
                  whileHover={isCurrentPlayerTurn ? { 
                    scale: 1.05, 
                    rotate: 2,
                    boxShadow: "0 25px 50px rgba(99, 102, 241, 0.4)"
                  } : {}}
                  whileTap={isCurrentPlayerTurn ? { scale: 0.95 } : {}}
                  onClick={isCurrentPlayerTurn ? handleDrawCard : undefined}
                  disabled={!isCurrentPlayerTurn || gameState.deck.length === 0}
                  animate={isCurrentPlayerTurn ? { 
                    boxShadow: [
                      "0 15px 35px rgba(99, 102, 241, 0.3)",
                      "0 20px 45px rgba(99, 102, 241, 0.5)",
                      "0 15px 35px rgba(99, 102, 241, 0.3)"
                    ]
                  } : {}}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {/* Card stack effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-700 rounded-2xl transform translate-x-1 translate-y-1 opacity-60"></div>
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-purple-600 rounded-2xl transform translate-x-0.5 translate-y-0.5 opacity-80"></div>
                  
                  {/* Main card */}
                  <div className="relative z-10 text-center">
                    <div className="text-white font-bold text-xl md:text-2xl mb-1">{gameState.deck.length}</div>
                    <div className="text-white/90 text-xs font-medium mb-2">cards</div>
                    
                    {isCurrentPlayerTurn && (
                      <motion.div
                        className="flex items-center justify-center space-x-1 text-white/80 text-xs"
                        animate={{ opacity: [0.7, 1, 0.7] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Play size={10} />
                        <span>Draw</span>
                      </motion.div>
                    )}
                  </div>
                  
                  {/* Shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent rounded-2xl pointer-events-none"></div>
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom UI */}
        <div className="p-4 space-y-4">
          {/* Conversation Prompt */}
          <AnimatePresence>
            {gameState.currentPrompt && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 rounded-r-2xl shadow-lg"
              >
                <div className="flex items-center space-x-3 mb-3">
                  <div className="w-8 h-8 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-xl flex items-center justify-center">
                    💭
                  </div>
                  <h3 className="text-lg font-bold text-yellow-800">Conversation Starter</h3>
                </div>
                <p className="text-yellow-700 text-base leading-relaxed">{gameState.currentPrompt}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Current Player Hand (if current user) */}
          {currentPlayerData && (
            <motion.div 
              className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="text-white text-lg font-bold mb-3 flex items-center space-x-2">
                <span>Your Hand ({currentPlayerData.hand.length} cards)</span>
                {isCurrentPlayerTurn && (
                  <motion.div 
                    className="flex items-center space-x-1 text-yellow-400"
                    animate={{ opacity: [0.7, 1, 0.7] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Zap size={16} />
                    <span className="font-semibold text-sm">Your Turn</span>
                  </motion.div>
                )}
              </h3>
              
              <div className="grid grid-cols-5 gap-2 justify-items-center">
                {currentPlayerData.hand.map((card, index) => (
                  <motion.div
                    key={card.id}
                    initial={{ opacity: 0, y: 20, rotate: -10 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0, 
                      rotate: 0
                    }}
                    transition={{ delay: index * 0.1 }}
                    className="w-full max-w-[120px]"
                  >
                    <GameCard
                      card={card}
                      isInHand={true}
                      onClick={() => handleCardClick(card)}
                      className={`transition-all duration-300 w-full ${
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
                ))}
              </div>
            </motion.div>
          )}

          {/* Play Card Section */}
          <AnimatePresence>
            {selectedCard && isCurrentPlayerTurn && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-200 shadow-lg"
              >
                <div className="text-center space-y-4">
                  <h4 className="text-lg font-semibold text-gray-800 flex items-center justify-center space-x-2">
                    <Sparkles className="text-indigo-600" size={20} />
                    <span>Selected Card</span>
                  </h4>
                  <p className="text-gray-700 text-sm leading-relaxed max-w-2xl mx-auto">
                    <strong className="text-indigo-600">{selectedCard.type}:</strong> {selectedCard.prompt}
                  </p>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => setSelectedCard(null)}
                      className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium rounded-xl border border-gray-200 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <motion.button
                      onClick={confirmCardPlay}
                      disabled={isPlayingCard}
                      className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <span>{isPlayingCard ? 'Playing...' : 'Play Card'}</span>
                      <ArrowRight size={18} />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}