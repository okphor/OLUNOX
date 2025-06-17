import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Plus, Users, MessageCircle, Sparkles, Heart, Brain } from 'lucide-react';
import { useAuthContext } from './AuthProvider';

interface HomePageProps {
  onCreateGame: () => void;
  onJoinGame: (gameId: string) => void;
  hasProfile?: boolean;
}

export function HomePage({ onCreateGame, onJoinGame, hasProfile = false }: HomePageProps) {
  const { profile } = useAuthContext();
  const [gameId, setGameId] = useState('');
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);
    
    try {
      if (mode === 'create') {
        await onCreateGame();
      } else if (mode === 'join' && gameId.trim()) {
        await onJoinGame(gameId);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
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
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-yellow-100 to-orange-100 rounded-full opacity-10 blur-3xl"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="text-center mb-12 max-w-4xl"
        >
          <motion.div variants={itemVariants} className="mb-8">
            <motion.div
              className="w-24 h-24 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-3xl mx-auto mb-6 flex items-center justify-center shadow-2xl"
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.05, 1]
              }}
              transition={{ 
                duration: 6, 
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <MessageCircle size={48} className="text-white" />
            </motion.div>
          </motion.div>
          
          <motion.h1 
            variants={itemVariants}
            className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4"
          >
            Olubox Live
          </motion.h1>
          
          <motion.div variants={itemVariants} className="flex items-center justify-center space-x-2 mb-6">
            <Sparkles className="text-yellow-500" size={24} />
            <p className="text-2xl font-semibold text-gray-700">5P's Card Game</p>
            <Sparkles className="text-yellow-500" size={24} />
          </motion.div>
          
          <motion.p 
            variants={itemVariants}
            className="text-lg text-gray-600 mb-6 leading-relaxed max-w-3xl mx-auto"
          >
            Transform conversations into meaningful connections. Play the 5P's card game with friends, 
            family, or colleagues through immersive video chat and discover the power of authentic dialogue.
          </motion.p>

          {hasProfile && profile && (
            <motion.div 
              variants={itemVariants}
              className="flex items-center justify-center space-x-2 mb-8"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-sm">
                  {profile.full_name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-800">Welcome back!</p>
                <p className="text-xs text-gray-600">{profile.full_name}</p>
              </div>
            </motion.div>
          )}

          <motion.div 
            variants={itemVariants}
            className="flex flex-wrap justify-center gap-4 text-sm text-gray-500"
          >
            <div className="flex items-center space-x-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full">
              <Heart className="text-red-500" size={16} />
              <span>Build Deeper Connections</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full">
              <Brain className="text-blue-500" size={16} />
              <span>Spark Meaningful Conversations</span>
            </div>
            <div className="flex items-center space-x-2 bg-white/50 backdrop-blur-sm px-4 py-2 rounded-full">
              <Users className="text-green-500" size={16} />
              <span>Connect Face-to-Face</span>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-md"
        >
          <AnimatePresence mode="wait">
            {!mode ? (
              <motion.div
                key="mode-selection"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-4"
              >
                <motion.button
                  onClick={() => setMode('create')}
                  className="group w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-5 px-8 rounded-2xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    className="p-2 bg-white/20 rounded-full"
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Plus size={24} />
                  </motion.div>
                  <span>Create New Game</span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Sparkles size={20} />
                  </div>
                </motion.button>
                
                <motion.button
                  onClick={() => setMode('join')}
                  className="group w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-5 px-8 rounded-2xl hover:from-emerald-700 hover:to-teal-700 transition-all duration-300 font-semibold text-lg shadow-xl hover:shadow-2xl transform hover:-translate-y-1"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <motion.div
                    className="p-2 bg-white/20 rounded-full"
                    whileHover={{ scale: 1.1 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Users size={24} />
                  </motion.div>
                  <span>Join Game</span>
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <Heart size={20} />
                  </div>
                </motion.button>
                
                {!hasProfile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-center mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200"
                  >
                    <p className="text-blue-800 text-sm">
                      <strong>New here?</strong> Don't worry! You'll be able to create your profile when you choose to create or join a game.
                    </p>
                  </motion.div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white/80 backdrop-blur-lg rounded-3xl p-8 shadow-2xl border border-white/20"
              >
                <form onSubmit={handleSubmit} className="space-y-6">
                  {mode === 'join' && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      transition={{ duration: 0.3 }}
                    >
                      <label htmlFor="gameId" className="block text-sm font-semibold text-gray-700 mb-3">
                        Game Code
                      </label>
                      <input
                        type="text"
                        id="gameId"
                        value={gameId}
                        onChange={(e) => setGameId(e.target.value.toUpperCase())}
                        className="w-full px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all duration-300 text-lg font-mono placeholder-gray-400 text-center tracking-wider"
                        placeholder="ENTER CODE"
                        required
                        disabled={isLoading}
                        maxLength={6}
                      />
                    </motion.div>
                  )}

                  <div className="flex space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setMode(null)}
                      className="flex-1 py-4 px-6 border-2 border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-300 font-medium"
                      disabled={isLoading}
                    >
                      Back
                    </button>
                    <motion.button
                      type="submit"
                      className={`flex-1 flex items-center justify-center space-x-3 py-4 px-6 rounded-xl text-white font-semibold transition-all duration-300 ${
                        mode === 'create' 
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700' 
                          : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl`}
                      disabled={isLoading}
                      whileHover={{ scale: isLoading ? 1 : 1.02 }}
                      whileTap={{ scale: isLoading ? 1 : 0.98 }}
                    >
                      {isLoading ? (
                        <>
                          <motion.div
                            className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                          <span>Connecting...</span>
                        </>
                      ) : (
                        <>
                          <Play size={20} />
                          <span>{mode === 'create' ? 'Create New Game' : 'Join Game'}</span>
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="mt-20 text-center"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl">
            {[
              {
                icon: MessageCircle,
                title: "Meaningful Conversations",
                description: "Spark deep discussions with thoughtfully crafted prompts that reveal authentic stories",
                color: "from-blue-500 to-indigo-500"
              },
              {
                icon: Users,
                title: "Face-to-Face Connection",
                description: "Experience genuine human connection through high-quality video chat while you play",
                color: "from-emerald-500 to-teal-500"
              },
              {
                icon: Brain,
                title: "Simple Yet Profound",
                description: "Easy-to-learn rules that create space for life-changing conversations and insights",
                color: "from-purple-500 to-pink-500"
              }
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + index * 0.1 }}
                className="text-center group"
              >
                <motion.div 
                  className={`w-16 h-16 bg-gradient-to-br ${feature.color} rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                >
                  <feature.icon size={28} className="text-white" />
                </motion.div>
                <h3 className="font-bold text-gray-900 mb-3 text-lg">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}