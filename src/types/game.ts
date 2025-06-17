export interface Card {
  id: string;
  type: 'Purpose' | 'Problems' | 'Prognosis' | 'Plan' | 'Perform';
  prompt: string;
  color: string;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  isHost: boolean;
  videoEnabled: boolean;
  audioEnabled: boolean;
  isConnected: boolean;
}

export interface GameState {
  id: string;
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  discardPile: Card[];
  gamePhase: 'lobby' | 'playing' | 'finished';
  winner?: string;
  currentPrompt?: string;
  turnStartTime?: number;
  turnTimeLimit?: number;
}

export interface GameEvent {
  type: 'player-joined' | 'player-left' | 'game-started' | 'card-played' | 'card-drawn' | 'turn-ended' | 'game-won';
  playerId: string;
  data?: any;
}