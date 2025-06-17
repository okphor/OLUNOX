import { useState, useCallback, useRef } from 'react';

// Add React import for useEffect
import React from 'react';

interface TTSState {
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  isAvailable: boolean;
}

export function useElevenLabsTTS() {
  const [state, setState] = useState<TTSState>({
    isLoading: false,
    isPlaying: false,
    error: null,
    isAvailable: true
  });

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const playAudio = useCallback(async (text: string) => {
    // Prevent multiple simultaneous requests for the same text
    if (state.isLoading || (state.isPlaying && audioRef.current)) {
      return;
    }

    // Stop any currently playing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    // Abort any ongoing request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this request
    abortControllerRef.current = new AbortController();

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null,
      isPlaying: false
    }));

    try {
      console.log('Requesting TTS for:', text.substring(0, 50) + '...');

      const response = await fetch('/.netlify/functions/elevenlabs-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
        signal: abortControllerRef.current.signal
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 503) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            isPlaying: false,
            isAvailable: false,
            error: data.message || 'TTS service not available'
          }));
          return;
        }
        
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      if (!data.success || !data.audio) {
        throw new Error('Invalid response from TTS service');
      }

      // Create audio element from base64 data
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audio), c => c.charCodeAt(0))],
        { type: data.contentType || 'audio/mpeg' }
      );
      
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      audioRef.current = audio;

      // Set up event listeners
      audio.addEventListener('loadstart', () => {
        setState(prev => ({
          ...prev,
          isLoading: false,
          isPlaying: true
        }));
      });

      audio.addEventListener('ended', () => {
        setState(prev => ({
          ...prev,
          isPlaying: false
        }));
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      });

      audio.addEventListener('error', (e) => {
        console.error('Audio playback error:', e);
        setState(prev => ({
          ...prev,
          isLoading: false,
          isPlaying: false,
          error: 'Failed to play audio'
        }));
        URL.revokeObjectURL(audioUrl);
        audioRef.current = null;
      });

      // Start playing
      await audio.play();
      console.log('TTS audio started playing');

    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('TTS request was aborted');
        return;
      }

      console.error('TTS error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        isPlaying: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  }, []);

  const stopAudio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setState(prev => ({
      ...prev,
      isLoading: false,
      isPlaying: false
    }));
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  return {
    ...state,
    playAudio,
    stopAudio,
    clearError
  };
}