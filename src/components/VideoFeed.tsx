import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Video, VideoOff, Crown, Wifi, WifiOff, Maximize2, Minimize2, X } from 'lucide-react';

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
  const maximizedVideoRef = useRef<HTMLVideoElement>(null);
  const [isMaximized, setIsMaximized] = useState(false);
  const [showControls, setShowControls] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);

  // Function to setup video element with stream
  const setupVideoElement = (videoElement: HTMLVideoElement | null, isMaximizedView: boolean = false) => {
    if (!videoElement) return;

    console.log(`Setting up video for ${playerName} (maximized: ${isMaximizedView}):`, {
      hasStream: !!stream,
      streamId: stream?.id,
      streamActive: stream?.active,
      videoTracks: stream?.getVideoTracks().length || 0,
      audioTracks: stream?.getAudioTracks().length || 0
    });

    // Clear any previous error
    setVideoError(null);

    if (stream && stream.active) {
      // Clone the stream for maximized view to avoid conflicts
      let streamToUse = stream;
      if (isMaximizedView && !isLocal) {
        try {
          streamToUse = stream.clone();
          console.log('Cloned stream for maximized view:', streamToUse.id);
        } catch (error) {
          console.warn('Could not clone stream, using original:', error);
          streamToUse = stream;
        }
      }

      videoElement.srcObject = streamToUse;
      
      // Set video properties
      videoElement.autoplay = true;
      videoElement.playsInline = true;
      videoElement.muted = isLocal; // Always mute local video to prevent feedback
      
      // Add error handling
      videoElement.onerror = (error) => {
        console.error(`Video error for ${playerName}:`, error);
        setVideoError('Video playback error');
      };

      videoElement.onloadedmetadata = () => {
        console.log(`Video metadata loaded for ${playerName} (maximized: ${isMaximizedView})`);
      };

      videoElement.oncanplay = () => {
        console.log(`Video can play for ${playerName} (maximized: ${isMaximizedView})`);
      };

      const playVideo = async () => {
        try {
          await videoElement.play();
          console.log(`Video playing successfully for ${playerName} (maximized: ${isMaximizedView})`);
          setVideoError(null);
        } catch (error) {
          console.error(`Error playing video for ${playerName}:`, error);
          setVideoError('Could not play video');
          
          // Retry after a short delay
          setTimeout(async () => {
            try {
              await videoElement.play();
              console.log(`Video playing on retry for ${playerName} (maximized: ${isMaximizedView})`);
              setVideoError(null);
            } catch (retryError) {
              console.error(`Retry failed for ${playerName}:`, retryError);
              setVideoError('Video playback failed');
            }
          }, 1000);
        }
      };

      // Start playing when ready
      if (videoElement.readyState >= 2) {
        playVideo();
      } else {
        videoElement.addEventListener('loadedmetadata', playVideo, { once: true });
      }
    } else {
      videoElement.srcObject = null;
      if (!stream) {
        setVideoError('No video stream');
      } else if (!stream.active) {
        setVideoError('Stream inactive');
      }
    }
  };

  // Setup normal video element
  useEffect(() => {
    if (!isMaximized) {
      setupVideoElement(videoRef.current, false);
    }

    return () => {
      if (videoRef.current && !isMaximized) {
        const video = videoRef.current;
        video.srcObject = null;
        video.onerror = null;
        video.onloadedmetadata = null;
        video.oncanplay = null;
      }
    };
  }, [stream, playerName, isLocal, isMaximized]);

  // Setup maximized video element
  useEffect(() => {
    if (isMaximized) {
      setupVideoElement(maximizedVideoRef.current, true);
    }

    return () => {
      if (maximizedVideoRef.current && isMaximized) {
        const video = maximizedVideoRef.current;
        video.srcObject = null;
        video.onerror = null;
        video.onloadedmetadata = null;
        video.oncanplay = null;
      }
    };
  }, [stream, playerName, isLocal, isMaximized]);

  const hasValidStream = stream && stream.active && stream.getVideoTracks().length > 0;
  const shouldShowVideo = videoEnabled && hasValidStream && !videoError;
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

  const handleMaximize = () => {
    setIsMaximized(true);
  };

  const handleMinimize = () => {
    setIsMaximized(false);
  };

  // Maximized video modal
  if (isMaximized) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
        onClick={handleMinimize}
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0.8 }}
          className="relative w-full h-full max-w-4xl max-h-4xl bg-black rounded-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={handleMinimize}
            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <X size={24} />
          </button>

          {/* Minimize button */}
          <button
            onClick={handleMinimize}
            className="absolute top-4 right-16 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
          >
            <Minimize2 size={20} />
          </button>

          {/* Video content */}
          {shouldShowVideo ? (
            <video
              ref={maximizedVideoRef}
              autoPlay
              playsInline
              muted={isLocal}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
              <motion.div 
                className={`w-32 h-32 bg-gradient-to-br ${getGradientColor(playerName)} rounded-full flex items-center justify-center shadow-2xl`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                <span className="text-white text-4xl font-bold">
                  {getInitials(playerName)}
                </span>
              </motion.div>
              {videoError && (
                <div className="absolute bottom-20 text-center">
                  <p className="text-red-400 text-sm">{videoError}</p>
                </div>
              )}
            </div>
          )}

          {/* Player info overlay */}
          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
            <div className="bg-black/70 backdrop-blur-sm px-4 py-2 rounded-full">
              <span className="text-white text-lg font-medium">
                {playerName} {isLocal && '(You)'}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {isHost && (
                <div className="flex items-center space-x-1 bg-yellow-500/90 backdrop-blur-sm px-3 py-2 rounded-full">
                  <Crown size={16} className="text-white" />
                  <span className="text-white text-sm font-semibold">Host</span>
                </div>
              )}
              
              {isCurrentPlayer && (
                <div className="flex items-center space-x-1 bg-yellow-500/90 backdrop-blur-sm px-3 py-2 rounded-full">
                  <span className="text-white text-sm font-semibold">Your Turn</span>
                </div>
              )}

              <div className="flex items-center space-x-1">
                {!audioEnabled && (
                  <div className="w-8 h-8 bg-red-500/90 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <MicOff size={16} className="text-white" />
                  </div>
                )}
                
                {!videoEnabled && (
                  <div className="w-8 h-8 bg-red-500/90 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <VideoOff size={16} className="text-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div 
      className={`relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 shadow-xl cursor-pointer group ${className} ${
        isCurrentPlayer ? 'ring-4 ring-yellow-400 ring-opacity-75' : ''
      }`}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
      onClick={handleMaximize}
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
            className={`w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 bg-gradient-to-br ${getGradientColor(playerName)} rounded-full flex items-center justify-center shadow-2xl`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          >
            <span className="text-white text-sm md:text-lg lg:text-xl font-bold">
              {getInitials(playerName)}
            </span>
          </motion.div>
          {videoError && (
            <div className="absolute bottom-2 left-2 right-2">
              <p className="text-red-400 text-xs text-center bg-black/50 rounded px-2 py-1">
                {videoError}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Overlay with player info */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
      
      {/* Top indicators */}
      <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
        <div className="flex items-center space-x-1">
          {isHost && (
            <motion.div 
              className="flex items-center space-x-1 bg-yellow-500/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <Crown size={8} className="text-white md:w-3 md:h-3" />
              <span className="text-white text-xs font-semibold hidden md:inline">Host</span>
            </motion.div>
          )}
          
          {isCurrentPlayer && (
            <motion.div 
              className="flex items-center space-x-1 bg-yellow-500/90 backdrop-blur-sm px-1.5 py-0.5 rounded-full"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-white text-xs font-semibold">Turn</span>
            </motion.div>
          )}
        </div>

        {/* Connection status indicator */}
        <div className="flex items-center space-x-1">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`} />
        </div>

        {/* Maximize button - only show on hover */}
        <AnimatePresence>
          {showControls && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={(e) => {
                e.stopPropagation();
                handleMaximize();
              }}
              className="p-1 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
            >
              <Maximize2 size={12} className="md:w-4 md:h-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom info - only show player name on hover or if no video */}
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
        <AnimatePresence>
          {(showControls || !shouldShowVideo) && (
            <motion.div 
              className="bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full max-w-[120px]"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.4 }}
            >
              <span className="text-white text-xs font-medium truncate">
                {playerName} {isLocal && '(You)'}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div className="flex items-center space-x-1">
          <AnimatePresence>
            {!audioEnabled && (
              <motion.div 
                className="w-5 h-5 md:w-6 md:h-6 bg-red-500/90 backdrop-blur-sm rounded-full flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <MicOff size={8} className="text-white md:w-3 md:h-3" />
              </motion.div>
            )}
            
            {!videoEnabled && (
              <motion.div 
                className="w-5 h-5 md:w-6 md:h-6 bg-red-500/90 backdrop-blur-sm rounded-full flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
              >
                <VideoOff size={8} className="text-white md:w-3 md:h-3" />
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
                <WifiOff size={16} className="text-white mx-auto md:w-6 md:h-6" />
              </motion.div>
              <p className="text-white text-xs">Connecting...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}