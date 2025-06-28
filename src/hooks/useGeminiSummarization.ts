import { useState, useCallback } from 'react';

interface SummarizationState {
  isLoading: boolean;
  error: string | null;
  isAvailable: boolean;
}

interface SummarizationResult {
  originalText: string;
  summarizedText: string;
  originalLength: number;
  summarizedLength: number;
}

export function useGeminiSummarization() {
  const [state, setState] = useState<SummarizationState>({
    isLoading: false,
    error: null,
    isAvailable: true
  });

  const summarizeText = useCallback(async (text: string): Promise<SummarizationResult | null> => {
    if (!text.trim()) {
      return null;
    }

    setState(prev => ({
      ...prev,
      isLoading: true,
      error: null
    }));

    try {
      console.log('Requesting summarization for:', text.substring(0, 50) + '...');

      // Use the deployed Netlify function URL
      const response = await fetch('/.netlify/functions/gemini-summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text })
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error cases
        if (response.status === 503) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            isAvailable: false,
            error: data.message || 'Summarization service not available'
          }));
          // Return original text as fallback
          return {
            originalText: text,
            summarizedText: text,
            originalLength: text.length,
            summarizedLength: text.length
          };
        }
        
        throw new Error(data.error || `HTTP ${response.status}`);
      }
      
      if (!data.success || !data.summarizedText) {
        throw new Error('Invalid response from summarization service');
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        error: null
      }));

      console.log('Text summarized successfully:', {
        originalLength: data.originalLength,
        summarizedLength: data.summarizedLength,
        reduction: Math.round((1 - data.summarizedLength / data.originalLength) * 100) + '%'
      });

      return {
        originalText: data.originalText,
        summarizedText: data.summarizedText,
        originalLength: data.originalLength,
        summarizedLength: data.summarizedLength
      };

    } catch (error) {
      console.error('Summarization error:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }));
      
      // Return original text as fallback
      return {
        originalText: text,
        summarizedText: text,
        originalLength: text.length,
        summarizedLength: text.length
      };
    }
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      error: null
    }));
  }, []);

  return {
    ...state,
    summarizeText,
    clearError
  };
}