import { useEffect, useRef, useState, useCallback } from 'react';
import { GameState, Player } from '../types/game';
import { GameService } from '../lib/gameService';
import { useAuthContext } from '../components/AuthProvider';

interface SupabaseSocketHook {
  isConnected: boolean;
  createGame: (gameId: string, player: Player) => Promise<void>;
  joinGame: (gameId: string, player: Player) => Promise<void>;
  startGame: (gameId: string, playerId: string) => Promise<void>;
  playCard: (gameId: string, playerId: string, card: any) => Promise<void>;
  drawCard: (gameId: string, playerId: string) => Promise<void>;
  newGame: (gameId: string) => Promise<void>;
  getGameState: (gameId: string) => Promise<GameState | null>;
  onGameStateChange: (callback: (state: GameState) => void) => void;
  onPlayerJoined: (callback: (player: Player) => void) => void;
  onError: (callback: (error: string) => void) => void;
}

export function useSupabaseSocket(): SupabaseSocketHook {
  const { user } = useAuthContext();
  const [isConnected, setIsConnected] = useState(true);
  const gameStateCallback = useRef<((state: GameState) => void) | null>(null);
  const playerJoinedCallback = useRef<((player: Player) => void) | null>(null);
  const errorCallback = useRef<((error: string) => void) | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);
  const currentGameId = useRef<string | null>(null);
  const lastGameState = useRef<GameState | null>(null);

  const API_BASE = '/.netlify/functions';

  const apiCall = async (action: string, method: string = 'POST', data?: any) => {
    try {
      const url = `${API_BASE}/supabase-game-api?action=${action}`;
      
      console.log('Making API call:', { action, method, url, data });
      
      const requestData = { 
        ...data, 
        action,
        userId: user?.id // Include user ID for database operations
      };
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('API response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
          console.error('API error details:', errorData);
        } catch (e) {
          console.error('Could not parse error response');
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('API call successful:', { action, success: result.success });
      return result;
    } catch (error) {
      console.error('API call error:', { action, error: error.message });
      if (errorCallback.current) {
        errorCallback.current(error instanceof Error ? error.message : 'Unknown error');
      }
      throw error;
    }
  };

  const startPolling = useCallback((gameId: string) => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
    }

    currentGameId.current = gameId;
    console.log('Starting polling for game:', gameId);
    
    pollingInterval.current = setInterval(async () => {
      try {
        const result = await fetch(`${API_BASE}/supabase-game-api?action=game-state&gameId=${gameId}`);
        if (result.ok) {
          const data = await result.json();
          const newGameState = data.gameState;
          
          if (newGameState && gameStateCallback.current) {
            // Check if game state actually changed
            const stateChanged = !lastGameState.current || 
              JSON.stringify(lastGameState.current) !== JSON.stringify(newGameState);
            
            if (stateChanged) {
              console.log('Game state changed, updating...');
              
              // Check for new players
              if (lastGameState.current && playerJoinedCallback.current) {
                const oldPlayerIds = new Set(lastGameState.current.players.map(p => p.id));
                const newPlayers = newGameState.players.filter((p: Player) => !oldPlayerIds.has(p.id));
                newPlayers.forEach((player: Player) => {
                  console.log('New player detected:', player.name);
                  if (playerJoinedCallback.current) {
                    playerJoinedCallback.current(player);
                  }
                });
              }
              
              lastGameState.current = newGameState;
              gameStateCallback.current(newGameState);
            }
          }
        } else {
          console.error('Polling failed:', result.status, result.statusText);
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000); // Poll every 2 seconds
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
    currentGameId.current = null;
    lastGameState.current = null;
    console.log('Stopped polling');
  }, []);

  const createGame = async (gameId: string, player: Player) => {
    console.log('Creating game:', gameId, 'with player:', player.name);
    const result = await apiCall('create-game', 'POST', { gameId, player });
    if (result.success) {
      startPolling(gameId);
    }
  };

  const joinGame = async (gameId: string, player: Player) => {
    console.log('Joining game:', gameId, 'with player:', player.name);
    const result = await apiCall('join-game', 'POST', { gameId, player });
    if (result.success) {
      startPolling(gameId);
    }
  };

  const startGame = async (gameId: string, playerId: string) => {
    console.log('Starting game:', gameId, 'by player:', playerId);
    await apiCall('start-game', 'POST', { gameId, playerId });
  };

  const playCard = async (gameId: string, playerId: string, card: any) => {
    console.log('Playing card:', card.id, 'by player:', playerId, 'in game:', gameId);
    await apiCall('play-card', 'POST', { gameId, playerId, card });
  };

  const drawCard = async (gameId: string, playerId: string) => {
    console.log('Drawing card for player:', playerId, 'in game:', gameId);
    const result = await apiCall('draw-card', 'POST', { gameId, playerId });
    console.log('Draw card result:', result);
    return result;
  };

  const newGame = async (gameId: string) => {
    console.log('Starting new game:', gameId);
    await apiCall('new-game', 'POST', { gameId });
  };

  const getGameState = async (gameId: string): Promise<GameState | null> => {
    try {
      const result = await fetch(`${API_BASE}/supabase-game-api?action=game-state&gameId=${gameId}`);
      if (result.ok) {
        const data = await result.json();
        return data.gameState;
      }
      return null;
    } catch (error) {
      console.error('Error getting game state:', error);
      return null;
    }
  };

  const onGameStateChange = (callback: (state: GameState) => void) => {
    gameStateCallback.current = callback;
  };

  const onPlayerJoined = (callback: (player: Player) => void) => {
    playerJoinedCallback.current = callback;
  };

  const onError = (callback: (error: string) => void) => {
    errorCallback.current = callback;
  };

  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    isConnected,
    createGame,
    joinGame,
    startGame,
    playCard,
    drawCard,
    newGame,
    getGameState,
    onGameStateChange,
    onPlayerJoined,
    onError
  };
}