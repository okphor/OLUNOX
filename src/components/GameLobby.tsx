import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, Users, Play, Mic, MicOff, Video, VideoOff, Crown, Wifi, WifiOff, CheckCircle } from 'lucide-react';
import { Player } from '../types/game';
import { VideoFeed } from './VideoFeed';

interface GameLobbyProps {
  gameId: string;
  players: Player[];
  currentPlayer: Player;
  localStream: MediaStream | null;
  remoteStreams: Map<string, MediaStream>;
  audioEnabled: boolean;
  videoEnabled: boolean;
  onToggleAudio: () => void;
  onToggleVideo: () => void;
  onStartGame: () => void;
}

export function GameLobby({
  gameId,
  players,
  currentPlayer,
  localStream,
  remoteStreams,
  audioEnabled,
  videoEnabled,
  onToggleAudio,
  onToggleVideo,
  onStartGame
}: GameLobbyProps) {
  const [copied, setCopied] = React.useState(false);

  const copyGameCode = async () => {
    try {
      await navigator.clipboard.writeText(gameId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = gameId;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto p-6">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-8"
        >
          <motion.div variants={itemVariants} className="flex items-center justify-center space-x-3 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center">
              <Users className="text-white" size={24} />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Game Lobby
            </h1>
          </motion.div>
          <motion.p variants={itemVariants} className="text-gray-600 text-lg">
            Get ready for meaningful conversations
          </motion.p>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/20 p-8 mb-8"
        >
          {/* Header with game info */}
          <div className="flex flex-col md:flex-row items-center justify-between mb-8 space-y-4 md:space-y-0">
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-gradient-to-r from-emerald-100 to-teal-100 px-4 py-2 rounded-full">
                  <Users className="text-emerald-600" size={20} />
                  <span className="text-emerald-800 font-semibold">{players.length}/8 Players</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 bg-gradient-to-r from-indigo-100 to-purple-100 px-4 py-2 rounded-full">
                <Wifi className="text-indigo-600" size={16} />
                <span className="text-indigo-800 text-sm font-medium">Connected</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-gray-600 font-medium">Room Code:</span>
              <motion.div 
                className="flex items-center space-x-2 bg-gradient-to-r from-gray-100 to-gray-200 px-4 py-2 rounded-xl"
                whileHover={{ scale: 1.02 }}
              >
                <code className="font-mono text-lg font-bold text-gray-800 tracking-wider">{gameId}</code>
                <motion.button
                  onClick={copyGameCode}
                  className="p-2 hover:bg-white/50 rounded-lg transition-all duration-200"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  title="Copy room code"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <CheckCircle size={18} className="text-green-600" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Copy size={18} className="text-gray-600" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            </div>
          </div>

          {/* Video Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <VideoFeed
                stream={localStream}
                playerName={currentPlayer.name}
                isLocal={true}
                audioEnabled={audioEnabled}
                videoEnabled={videoEnabled}
                className="aspect-video relative"
                isHost={currentPlayer.isHost}
              />
            </motion.div>
            
            {players.filter(p => p.id !== currentPlayer.id).map((player, index) => (
              <motion.div
                key={player.id}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <VideoFeed
                  stream={remoteStreams.get(player.id) || null}
                  playerName={player.name}
                  audioEnabled={player.audioEnabled}
                  videoEnabled={player.videoEnabled}
                  className="aspect-video relative"
                  isHost={player.isHost}
                />
              </motion.div>
            ))}
            
            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 8 - players.length) }, (_, index) => (
              <motion.div
                key={`empty-${index}`}
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.4 + index * 0.05 }}
                className="aspect-video bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl border-2 border-dashed border-gray-300 flex items-center justify-center"
              >
                <div className="text-center">
                  <Users className="text-gray-400 mx-auto mb-2" size={24} />
                  <p className="text-gray-500 text-sm font-medium">Waiting for player...</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Controls */}
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="flex space-x-3">
              <motion.button
                onClick={onToggleAudio}
                className={`p-4 rounded-2xl transition-all duration-300 ${
                  audioEnabled 
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg hover:shadow-xl' 
                    : 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg hover:shadow-xl'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={audioEnabled ? 'Mute microphone' : 'Unmute microphone'}
              >
                {audioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
              </motion.button>
              
              <motion.button
                onClick={onToggleVideo}
                className={`p-4 rounded-2xl transition-all duration-300 ${
                  videoEnabled 
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg hover:shadow-xl' 
                    : 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg hover:shadow-xl'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                title={videoEnabled ? 'Turn off camera' : 'Turn on camera'}
              >
                {videoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
              </motion.button>
            </div>

            <AnimatePresence>
              {currentPlayer.isHost && players.length >= 2 && (
                <motion.button
                  onClick={onStartGame}
                  className="flex items-center space-x-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold text-lg shadow-xl hover:shadow-2xl"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Play size={24} />
                  <span>Start Game</span>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  >
                    <Crown size={20} />
                  </motion.div>
                </motion.button>
              )}
            </AnimatePresence>

            {!currentPlayer.isHost && (
              <div className="flex items-center space-x-2 text-gray-600">
                <Crown size={20} className="text-yellow-500" />
                <span>Waiting for host to start the game...</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Instructions */}
        <motion.div
          variants={itemVariants}
          className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-100"
        >
          <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center space-x-2">
            <CheckCircle className="text-indigo-600" size={20} />
            <span>How to Play</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div className="space-y-2">
              <p>• <strong>Goal:</strong> Collect all 5 P's (Purpose, Problems, Prognosis, Plan, Perform)</p>
              <p>• <strong>Turn:</strong> Play a card and discuss the prompt with everyone</p>
            </div>
            <div className="space-y-2">
              <p>• <strong>Draw:</strong> Take a new card from the deck after discussion</p>
              <p>• <strong>Win:</strong> First player to collect all 5 P's wins!</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}