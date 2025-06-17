import { supabase } from './supabase';
import { GameState, Player, Card } from '../types/game';

// Card data
const cardPrompts = {
  Purpose: [
    "What's your main motivation for doing what you do?",
    "What gives your life meaning and direction?",
    "What would you want to be remembered for?",
    "What drives you to get up in the morning?",
    "What's your 'why' behind your biggest goals?",
    "What legacy do you want to leave behind?",
    "What makes you feel most fulfilled?",
    "What would you do if you had unlimited resources?",
    "What change would you most like to see in the world?",
    "What's your personal mission statement?"
  ],
  Problems: [
    "What's the biggest challenge you're facing right now?",
    "What obstacle keeps getting in your way?",
    "What would you change about your current situation?",
    "What's something that consistently frustrates you?",
    "What problem do you wish you could solve for everyone?",
    "What's holding you back from your goals?",
    "What's a pattern you'd like to break in your life?",
    "What's the most difficult decision you're facing?",
    "What situation makes you feel most stuck?",
    "What would you ask for help with if pride wasn't a factor?"
  ],
  Prognosis: [
    "Where do you see yourself in 5 years?",
    "What trends do you think will shape the future?",
    "How do you think your current situation will evolve?",
    "What's your prediction for your field/industry?",
    "What skills will be most valuable in the future?",
    "How do you think technology will change our daily lives?",
    "What do you think the world will look like for the next generation?",
    "Where do you see your relationships heading?",
    "What changes do you anticipate in your career?",
    "What's your outlook on achieving your biggest dream?"
  ],
  Plan: [
    "What's your strategy for reaching your next big goal?",
    "What's the first step you need to take?",
    "How do you plan to overcome your biggest obstacle?",
    "What would your ideal day look like, and how can you create it?",
    "What's your backup plan if things don't go as expected?",
    "How do you plan to grow in the next year?",
    "What resources do you need to achieve your goals?",
    "What habits would you like to develop or break?",
    "How do you plan to measure your success?",
    "What's your timeline for your most important project?"
  ],
  Perform: [
    "What's something you're proud of accomplishing recently?",
    "What action have you taken that made the biggest difference?",
    "What's the best decision you've made this year?",
    "What skill have you improved the most?",
    "What's something you've done that pushed you out of your comfort zone?",
    "What habit have you successfully implemented?",
    "What's an example of you living your values?",
    "What's something you've done to help others?",
    "What's the most meaningful progress you've made recently?",
    "What action are you taking right now to move toward your goals?"
  ]
};

function createDeck(): Card[] {
  const deck: Card[] = [];
  const colors = {
    Purpose: '#8B5CF6',
    Problems: '#EF4444', 
    Prognosis: '#06B6D4',
    Plan: '#10B981',
    Perform: '#F59E0B'
  };

  Object.entries(cardPrompts).forEach(([type, prompts]) => {
    prompts.forEach((prompt, index) => {
      deck.push({
        id: `${type}-${index}`,
        type: type as Card['type'],
        prompt,
        color: colors[type as keyof typeof colors]
      });
    });
  });

  // Shuffle the deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function checkWinCondition(hand: Card[]): boolean {
  const types = new Set(hand.map(card => card.type));
  return types.size === 5 && types.has('Purpose') && types.has('Problems') && 
         types.has('Prognosis') && types.has('Plan') && types.has('Perform');
}

function dealCards(deck: Card[], numCards: number): Card[] {
  return deck.splice(0, numCards);
}

export class GameService {
  static async createGame(gameId: string, player: Player, userId?: string): Promise<GameState> {
    const deck = createDeck();
    const playerHand = dealCards(deck, 5);

    // Create game record
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .insert({
        id: gameId,
        host_user_id: userId || null,
        game_phase: 'lobby',
        current_player_index: 0,
        deck: deck,
        discard_pile: [],
        current_prompt: null,
        winner_player_id: null
      })
      .select()
      .single();

    if (gameError) {
      console.error('Error creating game:', gameError);
      throw new Error('Failed to create game');
    }

    // Add player to game
    const { error: playerError } = await supabase
      .from('game_players')
      .insert({
        game_id: gameId,
        player_id: player.id,
        user_id: userId || null,
        name: player.name,
        hand: playerHand,
        is_host: true,
        video_enabled: player.videoEnabled,
        audio_enabled: player.audioEnabled,
        is_connected: player.isConnected
      });

    if (playerError) {
      console.error('Error adding player to game:', playerError);
      throw new Error('Failed to add player to game');
    }

    return this.getGameState(gameId);
  }

  static async joinGame(gameId: string, player: Player, userId?: string): Promise<GameState> {
    // Check if game exists and has space
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !gameData) {
      throw new Error('Game not found');
    }

    // Check current player count
    const { count } = await supabase
      .from('game_players')
      .select('*', { count: 'exact', head: true })
      .eq('game_id', gameId);

    if (count && count >= 8) {
      throw new Error('Game is full');
    }

    // Get current deck to deal cards
    const deck = [...(gameData.deck as Card[])];
    const playerHand = dealCards(deck, 5);

    // Update game with new deck
    await supabase
      .from('games')
      .update({ deck: deck })
      .eq('id', gameId);

    // Add player to game
    const { error: playerError } = await supabase
      .from('game_players')
      .insert({
        game_id: gameId,
        player_id: player.id,
        user_id: userId || null,
        name: player.name,
        hand: playerHand,
        is_host: false,
        video_enabled: player.videoEnabled,
        audio_enabled: player.audioEnabled,
        is_connected: player.isConnected
      });

    if (playerError) {
      console.error('Error adding player to game:', playerError);
      throw new Error('Failed to join game');
    }

    return this.getGameState(gameId);
  }

  static async startGame(gameId: string, playerId: string): Promise<GameState> {
    // Verify player is host
    const { data: playerData, error: playerError } = await supabase
      .from('game_players')
      .select('is_host')
      .eq('game_id', gameId)
      .eq('player_id', playerId)
      .single();

    if (playerError || !playerData?.is_host) {
      throw new Error('Only host can start game');
    }

    // Update game phase
    const { error } = await supabase
      .from('games')
      .update({ 
        game_phase: 'playing',
        current_player_index: 0
      })
      .eq('id', gameId);

    if (error) {
      console.error('Error starting game:', error);
      throw new Error('Failed to start game');
    }

    return this.getGameState(gameId);
  }

  static async playCard(gameId: string, playerId: string, card: Card): Promise<GameState> {
    // Get current game state
    const gameState = await this.getGameState(gameId);
    
    if (gameState.gamePhase !== 'playing') {
      throw new Error('Game is not in playing phase');
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      throw new Error('Not your turn');
    }

    // Remove card from player's hand
    const updatedHand = currentPlayer.hand.filter(c => c.id !== card.id);
    
    // Update player's hand
    await supabase
      .from('game_players')
      .update({ hand: updatedHand })
      .eq('game_id', gameId)
      .eq('player_id', playerId);

    // Update game with new discard pile and prompt
    const newDiscardPile = [...gameState.discardPile, card];
    await supabase
      .from('games')
      .update({ 
        discard_pile: newDiscardPile,
        current_prompt: card.prompt
      })
      .eq('id', gameId);

    return this.getGameState(gameId);
  }

  static async drawCard(gameId: string, playerId: string): Promise<GameState> {
    // Get current game state
    const gameState = await this.getGameState(gameId);
    
    if (gameState.gamePhase !== 'playing') {
      throw new Error('Game is not in playing phase');
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (currentPlayer.id !== playerId) {
      throw new Error('Not your turn');
    }

    if (gameState.deck.length === 0) {
      throw new Error('No cards left in deck');
    }

    // Draw card from deck
    const deck = [...gameState.deck];
    const newCard = deck.pop()!;
    const updatedHand = [...currentPlayer.hand, newCard];

    // Check win condition
    const hasWon = checkWinCondition(updatedHand);
    
    // Calculate next player index
    const nextPlayerIndex = hasWon ? 
      gameState.currentPlayerIndex : 
      (gameState.currentPlayerIndex + 1) % gameState.players.length;

    // Update player's hand
    await supabase
      .from('game_players')
      .update({ hand: updatedHand })
      .eq('game_id', gameId)
      .eq('player_id', playerId);

    // Update game state
    const gameUpdates: any = {
      deck: deck,
      current_player_index: nextPlayerIndex
    };

    if (hasWon) {
      gameUpdates.game_phase = 'finished';
      gameUpdates.winner_player_id = playerId;
    }

    await supabase
      .from('games')
      .update(gameUpdates)
      .eq('id', gameId);

    // Clear prompt after delay (handled by client-side timeout)
    
    return this.getGameState(gameId);
  }

  static async newGame(gameId: string): Promise<GameState> {
    // Get current players
    const { data: players, error: playersError } = await supabase
      .from('game_players')
      .select('*')
      .eq('game_id', gameId);

    if (playersError || !players) {
      throw new Error('Failed to get players');
    }

    // Create new deck and deal cards
    const deck = createDeck();
    
    // Update each player's hand
    for (const player of players) {
      const newHand = dealCards(deck, 5);
      await supabase
        .from('game_players')
        .update({ hand: newHand })
        .eq('id', player.id);
    }

    // Reset game state
    await supabase
      .from('games')
      .update({
        game_phase: 'playing',
        current_player_index: 0,
        deck: deck,
        discard_pile: [],
        current_prompt: null,
        winner_player_id: null
      })
      .eq('id', gameId);

    return this.getGameState(gameId);
  }

  static async getGameState(gameId: string): Promise<GameState> {
    // Get game data
    const { data: gameData, error: gameError } = await supabase
      .from('games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (gameError || !gameData) {
      throw new Error('Game not found');
    }

    // Get players data
    const { data: playersData, error: playersError } = await supabase
      .from('game_players')
      .select('*')
      .eq('game_id', gameId)
      .order('joined_at');

    if (playersError) {
      throw new Error('Failed to get players');
    }

    // Transform to GameState format
    const players: Player[] = playersData.map(p => ({
      id: p.player_id,
      name: p.name,
      hand: p.hand as Card[],
      isHost: p.is_host,
      videoEnabled: p.video_enabled,
      audioEnabled: p.audio_enabled,
      isConnected: p.is_connected
    }));

    return {
      id: gameData.id,
      players,
      currentPlayerIndex: gameData.current_player_index,
      deck: gameData.deck as Card[],
      discardPile: gameData.discard_pile as Card[],
      gamePhase: gameData.game_phase as 'lobby' | 'playing' | 'finished',
      winner: gameData.winner_player_id,
      currentPrompt: gameData.current_prompt
    };
  }

  static async updatePlayerConnection(gameId: string, playerId: string, isConnected: boolean): Promise<void> {
    await supabase
      .from('game_players')
      .update({ is_connected: isConnected })
      .eq('game_id', gameId)
      .eq('player_id', playerId);
  }

  static async cleanupInactiveGames(): Promise<void> {
    const { error } = await supabase.rpc('cleanup_inactive_games');
    if (error) {
      console.error('Error cleaning up inactive games:', error);
    }
  }
}