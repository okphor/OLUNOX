import { useState, useCallback, useRef } from 'react';
import React from 'react';
import { useGeminiSummarization } from './useGeminiSummarization';
import { useElevenLabsTTS } from './useElevenLabsTTS';

interface SmartTTSState {
  isLoading: boolean;
  isPlaying: boolean;
  error: string | null;
  isAvailable: boolean;
  isSummarizing: boolean;
  lastSummary: string | null;
}

export function useSmartTTS() {
  const [state, setState] = useState<SmartTTSState>({
    isLoading: false,
    isPlaying: false,
    error: null,
    isAvailable: true,
    isSummarizing: false,
    lastSummary: null
  });

  const { summarizeText, isLoading: summarizationLoading, error: summarizationError, isAvailable: summarizationAvailable } = useGeminiSummarization();
  const { playAudio, stopAudio, isLoading: ttsLoading, isPlaying: ttsPlaying, error: ttsError, isAvailable: ttsAvailable } = useElevenLabsTTS();
  
  const lastPlayedTextRef = useRef<string | null>(null);

  // Update combined state based on individual hook states
  React.useEffect(() => {
    setState(prev => ({
      ...prev,
      isLoading: ttsLoading,
      isPlaying: ttsPlaying,
      isSummarizing: summarizationLoading,
      isAvailable: ttsAvailable && summarizationAvailable,
      error: ttsError || summarizationError
    }));
  }, [ttsLoading, ttsPlaying, summarizationLoading, ttsAvailable, summarizationAvailable, ttsError, summarizationError]);

  const playSmartAudio = useCallback(async (text: string, useSummarization: boolean = true) => {
    if (!text.trim()) {
      return;
    }

    // Prevent playing the same text multiple times
    if (text === lastPlayedTextRef.current && (state.isPlaying || state.isLoading)) {
      return;
    }

    lastPlayedTextRef.current = text;

    try {
      let textToPlay = text;
      let summary = null;

      // Only summarize if enabled and available
      if (useSummarization && summarizationAvailable && text.length > 50) {
        console.log('Summarizing text before TTS...');
        summary = await summarizeText(text);
        
        if (summary && summary.summarizedText !== text) {
          textToPlay = summary.summarizedText;
          setState(prev => ({ ...prev, lastSummary: summary.summarizedText }));
          console.log('Using summarized text for TTS:', {
            original: text.substring(0, 50) + '...',
            summarized: textToPlay.substring(0, 50) + '...',
            reduction: Math.round((1 - textToPlay.length / text.length) * 100) + '%'
          });
        }
      }

      // Play the audio (either original or summarized text)
      if (ttsAvailable) {
        await playAudio(textToPlay);
      } else {
        throw new Error('Text-to-speech service not available');
      }

    } catch (error) {
      console.error('Smart TTS error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
    }
  }, [summarizeText, playAudio, summarizationAvailable, ttsAvailable, state.isPlaying, state.isLoading]);

  const stopSmartAudio = useCallback(() => {
    stopAudio();
    lastPlayedTextRef.current = null;
    setState(prev => ({ ...prev, lastSummary: null }));
  }, [stopAudio]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  return {
    ...state,
    playSmartAudio,
    stopSmartAudio,
    clearError,
    // Expose individual service availability
    summarizationAvailable,
    ttsAvailable
  };
}