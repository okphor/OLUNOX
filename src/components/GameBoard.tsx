import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, RotateCcw, Trophy, Clock, Zap, Target, Volume2, VolumeX, Loader2, Eye, EyeOff, Users, Info, ChevronDown, ChevronUp } from 'lucide-react';
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
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
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <main id="main-game-content" className="relative z-10 max-w-7xl mx-auto p-3 md:p-4 space-y-4 md:space-y-6">
        {/* Instructions Panel */}
        <AnimatePresence>
          {showInstructions && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-blue-50 border border-blue-200 rounded-2xl p-4 md:p-6"
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

        {/* Video Feeds - Collapsible */}
        <AnimatePresence>
          {showVideoFeeds && (
            <motion.div 
              className="space-y-3"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
                  <Users size={20} />
                  <span>Players ({gameState.players.length})</span>
                </h2>
                <button
                  onClick={() => setShowVideoFeeds(false)}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded p-1"
                  aria-label="Hide video feeds"
                >
                  <ChevronUp size={20} />
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                <VideoFeed
                  stream={localStream}
                  playerName={currentPlayer.name}
                  isLocal={true}
                  isCurrentPlayer={isCurrentPlayerTurn}
                  className="aspect-video border-2 border-white shadow-lg rounded-xl"
                />
                {gameState.players.filter(p => p.id !== currentPlayer.id).map(player => (
                  <VideoFeed
                    key={player.id}
                    stream={remoteStreams.get(player.id) || null}
                    playerName={player.name}
                    isCurrentPlayer={player.id === activePlayer?.id}
                    className="aspect-video border-2 border-white shadow-lg rounded-xl"
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Turn Indicator */}
        <motion.div 
          className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-4 md:p-6 border border-white/20"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          role="region"
          aria-labelledby="turn-indicator"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between space-y-3 sm:space-y-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <Target className="text-white" size={20} />
              </div>
              <div className="text-center sm:text-left">
                <h3 id="turn-indicator" className="text-base md:text-lg font-bold text-gray-800">
                  {activePlayer?.name}'s Turn
                </h3>
                <p className="text-xs md:text-sm text-gray-600">
                  {isCurrentPlayerTurn ? "It's your turn!" : "Waiting for their move"}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {isCurrentPlayerTurn && (
                <motion.div 
                  className="flex items-center space-x-2 bg-gradient-to-r from-green-100 to-emerald-100 px-3 py-2 rounded-full"
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  role="status"
                  aria-label="It's your turn to play"
                >
                  <Zap className="text-green-600" size={14} />
                  <span className="text-green-800 font-semibold text-xs md:text-sm">Your Turn</span>
                </motion.div>
              )}
              
              <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-indigo-100 px-3 py-2 rounded-full">
                <Clock className="text-blue-600" size={14} />
                <span className="text-blue-800 font-medium text-xs md:text-sm">
                  {gameState.deck.length} cards left
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Conversation Prompt */}
        <AnimatePresence>
          {gameState.currentPrompt && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="bg-gradient-to-r from-yellow-50 to-orange-50 border-l-4 border-yellow-400 p-4 md:p-6 rounded-r-2xl shadow-lg"
              role="region"
              aria-labelledby="conversation-prompt"
            >
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-orange-400 rounded-xl flex items-center justify-center flex-shrink-0">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      💭
                    </motion.div>
                  </div>
                  <h3 id="conversation-prompt" className="text-lg md:text-xl font-bold text-yellow-800">
                    Conversation Starter
                  </h3>
                </div>
                
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0">
                  <div className="flex flex-wrap items-center gap-2">
                    {smartTTSAvailable ? (
                      <motion.button
                        onClick={() => playSmartAudio(gameState.currentPrompt!, useSummarization)}
                        disabled={smartTTSLoading || isSummarizing}
                        className="flex items-center space-x-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white px-3 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-md focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title={useSummarization ? "Play AI-summarized audio" : "Play original audio"}
                        aria-label={`${isSummarizing ? 'Summarizing' : smartTTSLoading ? 'Loading' : smartTTSPlaying ? 'Playing' : 'Play'} conversation prompt audio`}
                      >
                        {smartTTSLoading || isSummarizing ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <Volume2 size={14} />
                        )}
                        <span className="font-medium">
                          {isSummarizing ? 'Summarizing...' : smartTTSLoading ? 'Loading...' : smartTTSPlaying ? 'Playing' : 'Play'}
                        </span>
                        {useSummarization && summarizationAvailable && (
                          <span className="text-xs bg-white/20 px-1 rounded">AI</span>
                        )}
                      </motion.button>
                    ) : (
                      <div className="flex items-center space-x-2 bg-gray-400 text-white px-3 py-2 rounded-lg opacity-50 text-sm">
                        <VolumeX size={14} />
                        <span className="font-medium">Audio Off</span>
                      </div>
                    )}
                    
                    {smartTTSPlaying && (
                      <motion.button
                        onClick={stopSmartAudio}
                        className="flex items-center space-x-2 bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50"
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="Stop audio"
                        aria-label="Stop audio playback"
                      >
                        <VolumeX size={14} />
                        <span className="font-medium">Stop</span>
                      </motion.button>
                    )}
                  </div>
                  
                  {smartTTSAvailable && (
                    <fieldset className="flex flex-col space-y-2">
                      <legend className="sr-only">Audio Settings</legend>
                      <label className="flex items-center space-x-2 text-yellow-700 text-sm">
                        <input
                          type="checkbox"
                          checked={autoPlayEnabled}
                          onChange={(e) => setAutoPlayEnabled(e.target.checked)}
                          className="rounded border-yellow-300 text-yellow-500 focus:ring-yellow-500"
                        />
                        <span>Auto-play new prompts</span>
                      </label>
                      {summarizationAvailable && (
                        <label className="flex items-center space-x-2 text-yellow-700 text-sm">
                          <input
                            type="checkbox"
                            checked={useSummarization}
                            onChange={(e) => setUseSummarization(e.target.checked)}
                            className="rounded border-yellow-300 text-yellow-500 focus:ring-yellow-500"
                          />
                          <span>Use AI Summary for audio</span>
                        </label>
                      )}
                    </fieldset>
                  )}
                </div>
                
                <p className="text-yellow-700 text-base md:text-lg leading-relaxed">
                  {gameState.currentPrompt}
                </p>
                
                {lastSummary && useSummarization && lastSummary !== gameState.currentPrompt && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-blue-50 border border-blue-200"
                  >
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-blue-600 text-sm font-medium">🤖 AI Summary:</span>
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded-full">
                        {Math.round((1 - lastSummary.length / gameState.currentPrompt.length) * 100)}% shorter
                      </span>
                    </div>
                    <p className="text-blue-700 text-sm italic">"{lastSummary}"</p>
                  </motion.div>
                )}
                
                {smartTTSError && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-3 rounded-lg ${
                      !smartTTSAvailable 
                        ? 'bg-blue-100 border border-blue-200' 
                        : 'bg-red-100 border border-red-200'
                    }`}
                    role="alert"
                  >
                    <p className={`text-sm ${!smartTTSAvailable ? 'text-blue-600' : 'text-red-600'}`}>
                      {!smartTTSAvailable ? 'ℹ️ ' : '⚠️ '}{smartTTSError}
                      {!ttsAvailable && summarizationAvailable && <span className="block mt-1">Note: AI summarization is available, but text-to-speech is not configured.</span>}
                    </p>
                  </motion.div>
                )}
                
                <div className="flex items-center space-x-2 text-yellow-600">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">
                    {smartTTSPlaying 
                      ? 'Listen and discuss together' 
                      : isSummarizing
                      ? 'AI is preparing audio summary...'
                      : 'Discuss this prompt together'
                    }
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Draw Pile */}
        <motion.div 
          className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-4 md:p-6 border border-white/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          role="region"
          aria-labelledby="draw-pile"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 id="draw-pile" className="text-lg md:text-xl font-bold text-gray-800 flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm">🎴</span>
              </div>
              <span>Draw Pile</span>
            </h3>
            
            {isCurrentPlayerTurn && (
              <motion.div 
                className="flex items-center space-x-2 text-indigo-600"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap size={16} />
                <span className="font-semibold text-sm">Click to draw</span>
              </motion.div>
            )}
          </div>
          
          <div className="flex justify-center">
            <motion.button
              className={`w-20 h-28 md:w-24 md:h-36 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-xl flex items-center justify-center ${
                isCurrentPlayerTurn ? 'cursor-pointer hover:shadow-2xl focus:outline-none focus:ring-4 focus:ring-indigo-500/50' : 'cursor-not-allowed opacity-50'
              }`}
              whileHover={isCurrentPlayerTurn ? { scale: 1.05, rotate: 2 } : {}}
              whileTap={isCurrentPlayerTurn ? { scale: 0.95 } : {}}
              onClick={isCurrentPlayerTurn ? handleDrawCard : undefined}
              disabled={!isCurrentPlayerTurn || gameState.deck.length === 0}
              animate={isCurrentPlayerTurn ? { 
                boxShadow: [
                  "0 10px 25px rgba(99, 102, 241, 0.3)",
                  "0 15px 35px rgba(99, 102, 241, 0.5)",
                  "0 10px 25px rgba(99, 102, 241, 0.3)"
                ]
              } : {}}
              transition={{ duration: 2, repeat: Infinity }}
              aria-label={`Draw pile with ${gameState.deck.length} cards remaining. ${isCurrentPlayerTurn ? 'Click to draw a card' : 'Wait for your turn'}`}
            >
              <div className="text-center">
                <span className="text-white font-bold text-xl md:text-2xl block">{gameState.deck.length}</span>
                <span className="text-white/80 text-xs">cards</span>
              </div>
            </motion.button>
          </div>
        </motion.div>

        {/* Last Played */}
        <motion.div 
          className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-4 border border-white/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          role="region"
          aria-labelledby="last-played"
        >
          <h3 id="last-played" className="text-base md:text-lg font-bold text-gray-800 mb-3 flex items-center space-x-2">
            <div className="w-6 h-6 md:w-8 md:h-8 bg-gradient-to-br from-gray-500 to-gray-600 rounded-lg flex items-center justify-center">
              <span className="text-white text-xs md:text-sm">📚</span>
            </div>
            <span>Last Played Card</span>
          </h3>
          <div className="flex justify-center">
            {gameState.discardPile.length > 0 ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-16 h-24 md:w-20 md:h-28"
              >
                <GameCard 
                  card={gameState.discardPile[gameState.discardPile.length - 1]} 
                  className="w-full h-full"
                />
              </motion.div>
            ) : (
              <div className="w-16 h-24 md:w-20 md:h-28 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50">
                <span className="text-gray-400 text-xs font-medium">Empty</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Play Card Section */}
        <AnimatePresence>
          {selectedCard && isCurrentPlayerTurn && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 md:p-6 border border-indigo-200 shadow-lg"
              role="dialog"
              aria-labelledby="selected-card-title"
              aria-describedby="selected-card-description"
            >
              <div className="text-center space-y-4">
                <h4 id="selected-card-title" className="text-lg md:text-xl font-semibold text-gray-800">Selected Card</h4>
                <div className="flex justify-center">
                  <GameCard card={selectedCard} />
                </div>
                <p id="selected-card-description" className="text-gray-700 text-sm md:text-base leading-relaxed">
                  <strong>{selectedCard.type}:</strong> {selectedCard.prompt}
                </p>
                <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <button
                    onClick={() => setSelectedCard(null)}
                    className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-colors font-medium rounded-xl border border-gray-200 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    aria-label="Cancel card selection"
                  >
                    Cancel
                  </button>
                  <motion.button
                    onClick={confirmCardPlay}
                    disabled={isPlayingCard}
                    className="flex items-center justify-center space-x-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold shadow-lg hover:shadow-xl disabled:opacity-50 focus:outline-none focus:ring-4 focus:ring-indigo-500/50"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    aria-label={`Play ${selectedCard.type} card`}
                  >
                    <span>{isPlayingCard ? 'Playing...' : 'Play Card'}</span>
                    <ArrowRight size={18} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Player Hand */}
        <motion.div 
          className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-4 md:p-6 border border-white/20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          role="region"
          aria-labelledby="player-hand"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between mb-4 space-y-2 sm:space-y-0">
            <h3 id="player-hand" className="text-lg md:text-xl font-bold text-gray-800 flex items-center space-x-2">
              <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
                <span className="text-white text-sm md:text-base">🃏</span>
              </div>
              <span>Your Hand ({currentPlayerData?.hand.length || 0} cards)</span>
            </h3>
            {isCurrentPlayerTurn && (
              <motion.div 
                className="flex items-center space-x-2 text-indigo-600"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap size={16} />
                <span className="font-semibold text-sm">Click a card to select</span>
              </motion.div>
            )}
          </div>
          
          <div 
            className="grid grid-cols-3 sm:grid-cols-5 gap-2 md:gap-3 justify-items-center"
            role="group"
            aria-label="Your cards"
          >
            {currentPlayerData?.hand.map((card, index) => (
              <motion.div
                key={card.id}
                initial={{ opacity: 0, y: 20, rotate: -10 }}
                animate={{ 
                  opacity: 1, 
                  y: 0, 
                  rotate: 0
                }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="w-full max-w-[100px]"
              >
                <GameCard
                  card={card}
                  isInHand={true}
                  onClick={() => handleCardClick(card)}
                  className={`transition-all duration-300 w-full ${
                    selectedCard?.id === card.id 
                      ? 'ring-2 ring-indigo-500 ring-opacity-75 transform scale-105' 
                      : isCurrentPlayerTurn 
                        ? 'hover:scale-105 hover:shadow-xl cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500' 
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

        {/* Progress Tracker - Collapsible */}
        <AnimatePresence>
          {showProgress && (
            <motion.div 
              className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-4 md:p-6 border border-white/20"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              role="region"
              aria-labelledby="progress-tracker"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 id="progress-tracker" className="text-lg md:text-xl font-bold text-gray-800 flex items-center space-x-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <Trophy className="text-white" size={16} />
                  </div>
                  <span>Your Progress</span>
                </h3>
                <button
                  onClick={() => setShowProgress(false)}
                  className="text-gray-500 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 rounded p-1"
                  aria-label="Hide progress panel"
                >
                  <ChevronUp size={20} />
                </button>
              </div>
              
              {/* Progress bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>Progress to Victory</span>
                  <span>{Math.round(getProgressPercentage())}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3" role="progressbar" aria-valuenow={getProgressPercentage()} aria-valuemin={0} aria-valuemax={100}>
                  <motion.div 
                    className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${getProgressPercentage()}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {['Purpose', 'Problems', 'Prognosis', 'Plan', 'Perform'].map((type, index) => {
                  const hasCard = currentPlayerData?.hand.some(card => card.type === type);
                  return (
                    <motion.div 
                      key={type} 
                      className="flex items-center space-x-3"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.4 + index * 0.1 }}
                    >
                      <motion.div 
                        className={`w-3 h-3 md:w-4 md:h-4 rounded-full ${hasCard ? 'bg-green-500' : 'bg-gray-300'}`}
                        animate={hasCard ? { scale: [1, 1.2, 1] } : {}}
                        transition={{ duration: 0.5 }}
                        role="img"
                        aria-label={hasCard ? `${type} completed` : `${type} needed`}
                      />
                      <span className={`text-sm font-medium ${hasCard ? 'text-green-700' : 'text-gray-500'}`}>
                        {type}
                      </span>
                      {hasCard && (
                        <motion.span 
                          className="text-green-500 text-sm"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          aria-label="Completed"
                        >
                          ✓
                        </motion.span>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Show collapsed progress button when hidden */}
        {!showProgress && (
          <motion.button
            onClick={() => setShowProgress(true)}
            className="w-full bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-3 border border-white/20 flex items-center justify-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            aria-label="Show progress panel"
          >
            <Trophy size={16} />
            <span>Show Progress ({Math.round(getProgressPercentage())}%)</span>
            <ChevronDown size={16} />
          </motion.button>
        )}
      </main>
    </div>
  );
}