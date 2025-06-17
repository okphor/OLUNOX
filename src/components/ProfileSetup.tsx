import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Sparkles, RefreshCw, Check } from 'lucide-react';
import { useAuthContext } from './AuthProvider';

interface ProfileSetupProps {
  onComplete: (username: string) => void;
}

export function ProfileSetup({ onComplete }: ProfileSetupProps) {
  const { generateUsername, createAccount, profile } = useAuthContext();
  const [username, setUsername] = useState(profile?.full_name || generateUsername());
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateNew = async () => {
    setIsGenerating(true);
    await new Promise(resolve => setTimeout(resolve, 500)); // Small delay for UX
    setUsername(generateUsername());
    setIsGenerating(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Creating account with username:', username.trim());
      await createAccount(username.trim());
      console.log('Account created, calling onComplete');
      
      // Small delay to ensure everything is processed
      setTimeout(() => {
        onComplete(username.trim());
      }, 500);
      
    } catch (error) {
      console.error('Error creating account:', error);
      setError('Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200 to-pink-200 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-blue-200 to-indigo-200 rounded-full opacity-20 blur-3xl"></div>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl p-8 max-w-md w-full border border-white/20"
      >
        <div className="text-center mb-8">
          <motion.div
            className="w-20 h-20 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl mx-auto mb-4 flex items-center justify-center"
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <User size={40} className="text-white" />
          </motion.div>
          
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            Welcome to Olubox Live!
          </h1>
          <p className="text-gray-600">
            Let's set up your profile to get started
          </p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"
          >
            <p className="text-red-600 text-sm text-center">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-3">
              Your Display Name
            </label>
            <div className="relative">
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-6 py-4 pr-16 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 text-lg"
                placeholder="Enter your name"
                required
                disabled={isLoading}
                maxLength={50}
              />
              <motion.button
                type="button"
                onClick={handleGenerateNew}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 text-gray-400 hover:text-indigo-600 transition-colors"
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                disabled={isGenerating || isLoading}
                title="Generate new name"
              >
                <motion.div
                  animate={isGenerating ? { rotate: 360 } : {}}
                  transition={{ duration: 0.5 }}
                >
                  <RefreshCw size={20} />
                </motion.div>
              </motion.button>
            </div>
            <p className="text-xs text-gray-500 mt-2 flex items-center space-x-1">
              <Sparkles size={12} />
              <span>Don't like it? Click the refresh button for a new suggestion!</span>
            </p>
          </div>

          <motion.button
            type="submit"
            className="w-full flex items-center justify-center space-x-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 px-6 rounded-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 font-semibold text-lg shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isLoading || !username.trim()}
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
                <span>Setting up...</span>
              </>
            ) : (
              <>
                <Check size={20} />
                <span>Continue to Game</span>
              </>
            )}
          </motion.button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            Your profile is saved locally and you can change your name anytime
          </p>
        </div>
      </motion.div>
    </div>
  );
}