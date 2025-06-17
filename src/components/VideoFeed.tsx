import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, Crown, Wifi, WifiOff } from 'lucide-react';

interface VideoFeedProps {
  stream: MediaStream | null;
  playerName: string;
  isLocal?: boolean;
  audioEnabled?: boolean;
  videoEnabled?: boolean;
  isCurrentPlayer?: boolean;
  isHost?: boolean;
  className?: string;
}

export function VideoFeed({ 
  stream, 
  playerName, 
  isLocal = false, 
  audioEnabled = true, 
  videoEnabled = true,
  isCurrentPlayer = false,
  isHost = false,
  className = ""
}: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    console.log(`Setting up video for ${playerName}:`, {
      hasStream: !!stream,
      streamId: stream?.id,
      streamActive: stream?.active,
      videoTracks: stream?.getVideoTracks().length || 0,
      audioTracks: stream?.getAudioTracks().length || 0
    });

    if (stream && stream.active) {
      videoElement.srcObject = stream;
      
      if (!isLocal) {
        videoElement.autoplay = true;
        videoElement.playsInline = true;
        
        const playVideo = async () => {
          try {
            await videoElement.play();
            console.log(`Video playing successfully for ${playerName}`);
          } catch (error) {
            console.error(`Error playing video for ${playerName}:`, error);
            
            setTimeout(async () => {
              try {
                await videoElement.play();
                console.log(`Video playing on retry for ${playerName}`);
              } catch (retryError) {
                console.error(`Retry failed for ${playerName}:`, retryError);
              }
            }, 1000);
          }
        };

        if (videoElement.readyState >= 2) {
          playVideo();
        } else {
          videoElement.addEventListener('loadedmetadata', playVideo, { once: true });
        }
      }
    } else {
      videoElement.srcObject = null;
    }

    return () => {
      if (videoElement.srcObject) {
        videoElement.srcObject = null;
      }
    };
  }, [stream, playerName, isLocal]);

  const hasValidStream = stream && stream.active && stream.getVideoTracks().length > 0;
  const shouldShowVideo = videoEnabled && hasValidStream;
  const isConnected = hasValidStream;

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getGradientColor = (name: string) => {
    const colors = [
      'from-purple-500 to-pink-500',
      'from-blue-500 to-indigo-500',
      'from-green-500 to-emerald-500',
      'from-yellow-500 to-orange-500',
      'from-red-500 to-pink-500',
      'from-indigo-500 to-purple-500',
      'from-teal-500 to-cyan-500',
      'from-orange-500 to-red-500'
    ];
    const index = name.length % colors.length;
    return colors[index];
  };

  return (
    <motion.div 
      className={`relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl ${className} ${
        isCurrentPlayer ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''
      }`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      {shouldShowVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
          <motion.div 
            className={`w-20 h-20 bg-gradient-to-br ${getGradientColor(playerName)} rounded-full flex items-center justify-center shadow-2xl`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <span className="text-white text-2xl font-bold">
              {getInitials(playerName)}
            </span>
          </motion.div>
        </div>
      )}

      {/* Overlay with player info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      
      {/* Top indicators */}
      <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          {isHost && (
            <motion.div 
              className="flex items-center space-x-1 bg-yellow-500/90 backdrop-blur-sm px-2 py-1 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Crown size={12} className="text-white" />
              <span className="text-white text-xs font-semibold">Host</span>
            </motion.div>
          )}
          
          {isCurrentPlayer && (
            <motion.div 
              className="flex items-center space-x-1 bg-yellow-500/90 backdrop-blur-sm px-2 py-1 rounded-full"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-white text-xs font-semibold">Your Turn</span>
            </motion.div>
          )}
        </div>

        <div className="flex items-center space-x-1">
          <motion.div 
            className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            title={isConnected ? 'Connected' : 'Disconnected'}
          />
        </div>
      </div>

      {/* Bottom info */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <motion.div 
            className="bg-black/50 backdrop-blur-sm px-3 py-1 rounded-full max-w-[140px]"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <span className="text-white text-sm font-medium truncate">
              {playerName} {isLocal && '(You)'}
            </span>
          </motion.div>
        </div>
        
        <div className="flex items-center space-x-1">
          <AnimatePresence>
            {!audioEnabled && (
              <motion.div 
                className="w-7 h-7 bg-red-500/90 backdrop-blur-sm rounded-full flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <MicOff size={14} className="text-white" />
              </motion.div>
            )}
            
            {!videoEnabled && (
              <motion.div 
                className="w-7 h-7 bg-red-500/90 backdrop-blur-sm rounded-full flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <VideoOff size={14} className="text-white" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Current player highlight animation */}
      <AnimatePresence>
        {isCurrentPlayer && (
          <motion.div 
            className="absolute inset-0 border-4 border-yellow-400 rounded-2xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            exit={{ opacity: 0 }}
            transition={{ duration: 2, repeat: Infinity }}
          />
        )}
      </AnimatePresence>

      {/* Connection status overlay */}
      <AnimatePresence>
        {!isConnected && !isLocal && (
          <motion.div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="text-center">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="mb-2"
              >
                <WifiOff size={24} className="text-white mx-auto" />
              </motion.div>
              <p className="text-white text-sm">Connecting...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}