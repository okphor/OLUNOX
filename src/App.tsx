import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuthContext } from './components/AuthProvider';
import { ProfileSetup } from './components/ProfileSetup';
import { HomePage } from './components/HomePage';
import { GameLobby } from './components/GameLobby';
import { GameBoard } from './components/GameBoard';
import { useSupabaseSocket } from './hooks/useSupabaseSocket';
import { useServerlessWebRTC } from './hooks/useServerlessWebRTC';
import { GameState, Player, Card } from './types/game';

type AppState = 'home' | 'profile-setup' | 'lobby' | 'playing';

function AppContent() {
  const { user, profile } = useAuthContext();
  const [appState, setAppState] = useState<AppState>('home');
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabaseSocket = useSupabaseSocket();
  const {
    localStream,
    remoteStreams,
    videoEnabled,
    audioEnabled,
    startLocalStream,
    toggleVideo,
    toggleAudio,
    initiateCall,
    establishConnections
  } = useServerlessWebRTC(gameState?.id, currentPlayer?.id);

  useEffect(() => {
    supabaseSocket.onGameStateChange((state: GameState) => {
      console.log('Received game state:', state);
      const prevGameState = gameState;
      setGameState(state);
      
      // If we just joined a lobby or the lobby updated, establish connections
      if (state.gamePhase === 'lobby' && localStream && currentPlayer) {
        const otherPlayers = state.players.filter(p => p.id !== currentPlayer.id);
        if (otherPlayers.length > 0) {
          console.log('Establishing connections with existing players:', otherPlayers.map(p => p.name));
          // Add a small delay to ensure everything is ready
          setTimeout(() => {
            establishConnections(otherPlayers.map(p => p.id));
          }, 1000);
        }
      }
      
      if (state.gamePhase === 'playing') {
        setAppState('playing');
      }
    });

    supabaseSocket.onPlayerJoined((player: Player) => {
      console.log('Player joined:', player.name, player.id);
      // Initiate WebRTC connection with new player if we have local stream
      if (localStream && player.id !== currentPlayer?.id && currentPlayer) {
        console.log('Initiating call to new player:', player.id);
        setTimeout(() => {
          initiateCall(player.id);
        }, 2000); // Increased delay to ensure both sides are ready
      }
    });

    supabaseSocket.onError((errorMessage: string) => {
      setError(errorMessage);
    });
  }, [localStream, currentPlayer, initiateCall, establishConnections, gameState]);

  const handleCreateGame = async () => {
    // Check if user needs to create account first
    if (!user || !profile?.full_name) {
      setAppState('profile-setup');
      return;
    }
    
    await createGame();
  };

  const handleJoinGame = async (gameId: string) => {
    // Check if user needs to create account first
    if (!user || !profile?.full_name) {
      setAppState('profile-setup');
      return;
    }
    
    await joinGame(gameId);
  };

  const createGame = async () => {
    if (!profile?.full_name) return;
    
    const stream = await startLocalStream();
    if (!stream) {
      setError('Could not access camera and microphone');
      return;
    }

    const gameId = Math.random().toString(36).substring(2, 8).toUpperCase();
    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const player: Player = {
      id: playerId,
      name: profile.full_name,
      hand: [],
      isHost: true,
      videoEnabled: true,
      audioEnabled: true,
      isConnected: true
    };

    console.log('Creating game with player:', { playerId, name: player.name, gameId });
    setCurrentPlayer(player);
    
    try {
      await supabaseSocket.createGame(gameId, player);
      setAppState('lobby');
    } catch (error) {
      setError('Failed to create game');
    }
  };

  const joinGame = async (gameId: string) => {
    if (!profile?.full_name) return;
    
    const stream = await startLocalStream();
    if (!stream) {
      setError('Could not access camera and microphone');
      return;
    }

    const playerId = `player_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const player: Player = {
      id: playerId,
      name: profile.full_name,
      hand: [],
      isHost: false,
      videoEnabled: true,
      audioEnabled: true,
      isConnected: true
    };

    console.log('Joining game with player:', { playerId, name: player.name, gameId });
    setCurrentPlayer(player);
    
    try {
      await supabaseSocket.joinGame(gameId, player);
      setAppState('lobby');
    } catch (error) {
      setError('Failed to join game');
    }
  };

  const handleProfileComplete = async (username: string) => {
    console.log('Profile setup completed for:', username);
    // After profile is created, go back to home
    setAppState('home');
  };

  const startGame = async () => {
    if (gameState && currentPlayer) {
      try {
        await supabaseSocket.startGame(gameState.id, currentPlayer.id);
      } catch (error) {
        setError('Failed to start game');
      }
    }
  };

  const playCard = async (card: Card) => {
    if (gameState && currentPlayer) {
      try {
        console.log('Playing card:', card.id, 'for player:', currentPlayer.id);
        console.log('Current game state:', {
          gamePhase: gameState.gamePhase,
          currentPlayerIndex: gameState.currentPlayerIndex,
          activePlayerId: gameState.players[gameState.currentPlayerIndex]?.id,
          myPlayerId: currentPlayer.id,
          isMyTurn: gameState.players[gameState.currentPlayerIndex]?.id === currentPlayer.id
        });
        await supabaseSocket.playCard(gameState.id, currentPlayer.id, card);
      } catch (error) {
        console.error('Failed to play card:', error);
        setError('Failed to play card');
        throw error; // Re-throw to handle in component
      }
    }
  };

  const drawCard = async () => {
    if (gameState && currentPlayer) {
      try {
        console.log('Drawing card for player:', currentPlayer.id, 'in game:', gameState.id);
        console.log('Current game state:', {
          gamePhase: gameState.gamePhase,
          currentPlayerIndex: gameState.currentPlayerIndex,
          activePlayerId: gameState.players[gameState.currentPlayerIndex]?.id,
          myPlayerId: currentPlayer.id,
          isMyTurn: gameState.players[gameState.currentPlayerIndex]?.id === currentPlayer.id,
          deckLength: gameState.deck.length
        });
        await supabaseSocket.drawCard(gameState.id, currentPlayer.id);
      } catch (error) {
        console.error('Failed to draw card:', error);
        setError('Failed to draw card');
      }
    }
  };

  const newGame = async () => {
    if (gameState) {
      try {
        await supabaseSocket.newGame(gameState.id);
      } catch (error) {
        setError('Failed to start new game');
      }
    }
  };

  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full text-center"
        >
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setAppState('home');
            }}
            className="bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AnimatePresence mode="wait">
        {appState === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HomePage 
              onCreateGame={handleCreateGame} 
              onJoinGame={handleJoinGame}
              hasProfile={!!(user && profile?.full_name)}
            />
          </motion.div>
        )}

        {appState === 'profile-setup' && (
          <motion.div
            key="profile-setup"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <ProfileSetup onComplete={handleProfileComplete} />
          </motion.div>
        )}

        {appState === 'lobby' && gameState && currentPlayer && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GameLobby
              gameId={gameState.id}
              players={gameState.players}
              currentPlayer={currentPlayer}
              localStream={localStream}
              remoteStreams={remoteStreams}
              audioEnabled={audioEnabled}
              videoEnabled={videoEnabled}
              onToggleAudio={toggleAudio}
              onToggleVideo={toggleVideo}
              onStartGame={startGame}
            />
          </motion.div>
        )}

        {appState === 'playing' && gameState && currentPlayer && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <GameBoard
              gameState={gameState}
              currentPlayer={currentPlayer}
              localStream={localStream}
              remoteStreams={remoteStreams}
              onPlayCard={playCard}
              onDrawCard={drawCard}
              onNewGame={newGame}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {!supabaseSocket.isConnected && (
        <div className="fixed top-4 right-4 bg-yellow-100 border border-yellow-300 text-yellow-800 px-4 py-2 rounded-lg">
          Connecting to server...
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;