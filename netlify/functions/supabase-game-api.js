const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS'
};

// For now, we'll use in-memory storage like the game-api function
// This avoids the Supabase environment variable issues
const games = new Map();

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

function createDeck() {
  const deck = [];
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
        type,
        prompt,
        color: colors[type]
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

function checkWinCondition(hand) {
  const types = new Set(hand.map(card => card.type));
  return types.size === 5 && types.has('Purpose') && types.has('Problems') && 
         types.has('Prognosis') && types.has('Plan') && types.has('Perform');
}

function dealCards(deck, numCards) {
  return deck.splice(0, numCards);
}

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const { httpMethod, body, queryStringParameters } = event;
    const data = body ? JSON.parse(body) : {};
    
    // Get the action from query parameters or body
    const action = queryStringParameters?.action || data.action;

    console.log('Received request:', { httpMethod, action, gameId: data.gameId || queryStringParameters?.gameId });

    // Route handling based on action parameter
    if (httpMethod === 'POST') {
      switch (action) {
        case 'create-game':
          return await createGame(data);
        case 'join-game':
          return await joinGame(data);
        case 'start-game':
          return await startGame(data);
        case 'play-card':
          return await playCard(data);
        case 'draw-card':
          return await drawCard(data);
        case 'new-game':
          return await newGame(data);
        default:
          return {
            statusCode: 400,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Invalid action' })
          };
      }
    } else if (httpMethod === 'GET') {
      if (action === 'game-state' && queryStringParameters?.gameId) {
        return await getGameStateHandler(queryStringParameters.gameId);
      }
    }

    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not found' })
    };
  } catch (error) {
    console.error('Function error:', error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Internal server error', details: error.message })
    };
  }
};

async function createGame(data) {
  const { gameId, player } = data;
  
  if (!gameId || !player) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing gameId or player data' })
    };
  }

  const deck = createDeck();
  
  const gameState = {
    id: gameId,
    players: [{ ...player, hand: dealCards(deck, 5) }],
    currentPlayerIndex: 0,
    deck: deck,
    discardPile: [],
    gamePhase: 'lobby',
    winner: null,
    currentPrompt: null,
    turnStartTime: null,
    turnTimeLimit: 30000, // 30 seconds
    hasPlayedCard: false,
    lastUpdated: Date.now()
  };

  games.set(gameId, gameState);
  console.log('Game created:', gameId, 'with', gameState.players.length, 'players');
  
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ success: true, gameState })
  };
}

async function joinGame(data) {
  const { gameId, player } = data;
  
  if (!gameId || !player) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing gameId or player data' })
    };
  }

  const game = games.get(gameId);
  
  if (!game) {
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Game not found' })
    };
  }

  if (game.players.length >= 8) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Game is full' })
    };
  }

  const newPlayer = { ...player, hand: dealCards(game.deck, 5) };
  game.players.push(newPlayer);
  game.lastUpdated = Date.now();
  
  console.log('Player joined game:', gameId, 'player:', player.name);
  
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ success: true, gameState: game })
  };
}

async function startGame(data) {
  const { gameId, playerId } = data;
  
  if (!gameId || !playerId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing gameId or playerId' })
    };
  }

  const game = games.get(gameId);
  
  if (!game) {
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Game not found' })
    };
  }

  const player = game.players.find(p => p.id === playerId);
  if (!player || !player.isHost) {
    return {
      statusCode: 403,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Only host can start game' })
    };
  }

  game.gamePhase = 'playing';
  game.currentPlayerIndex = 0;
  game.turnStartTime = Date.now();
  game.hasPlayedCard = false;
  game.lastUpdated = Date.now();
  
  console.log('Game started:', gameId);
  
  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ success: true, gameState: game })
  };
}

async function playCard(data) {
  const { gameId, playerId, card } = data;
  
  console.log('Play card request:', { gameId, playerId, cardId: card?.id });
  
  if (!gameId || !playerId || !card) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing gameId, playerId, or card data' })
    };
  }

  const game = games.get(gameId);
  
  if (!game) {
    console.log('Game not found:', gameId);
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Game not found' })
    };
  }

  if (game.gamePhase !== 'playing') {
    console.log('Game not in playing phase:', game.gamePhase);
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Game is not in playing phase' })
    };
  }

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (!currentPlayer) {
    console.log('No current player found');
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'No current player' })
    };
  }

  if (currentPlayer.id !== playerId) {
    console.log('Not player turn:', { currentPlayerId: currentPlayer.id, requestPlayerId: playerId });
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not your turn' })
    };
  }

  const cardIndex = currentPlayer.hand.findIndex(c => c.id === card.id);
  if (cardIndex === -1) {
    console.log('Card not in hand:', card.id);
    console.log('Player hand:', currentPlayer.hand.map(c => c.id));
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Card not in hand' })
    };
  }

  // Remove card from player's hand and add to discard pile
  currentPlayer.hand.splice(cardIndex, 1);
  game.discardPile.push(card);
  game.currentPrompt = card.prompt;
  game.hasPlayedCard = true; // Mark that player has played a card
  game.lastUpdated = Date.now();

  console.log('Card played successfully:', card.id, 'by player:', currentPlayer.name);

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ success: true, gameState: game })
  };
}

async function drawCard(data) {
  const { gameId, playerId } = data;
  
  console.log('Draw card request:', { gameId, playerId });
  
  if (!gameId || !playerId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing gameId or playerId' })
    };
  }

  const game = games.get(gameId);
  
  if (!game) {
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Game not found' })
    };
  }

  if (game.gamePhase !== 'playing') {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Game is not in playing phase' })
    };
  }

  const currentPlayer = game.players[game.currentPlayerIndex];
  if (!currentPlayer) {
    console.log('No current player found');
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'No current player' })
    };
  }

  if (currentPlayer.id !== playerId) {
    console.log('Not player turn:', { currentPlayerId: currentPlayer.id, requestPlayerId: playerId });
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Not your turn' })
    };
  }

  // Check if player has played a card first
  if (!game.hasPlayedCard) {
    console.log('Player must play a card before drawing');
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Must play a card before drawing' })
    };
  }

  if (game.deck.length === 0) {
    console.log('No cards left in deck');
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'No cards left in deck' })
    };
  }

  const newCard = game.deck.pop();
  currentPlayer.hand.push(newCard);
  console.log('Card drawn:', newCard.id, 'by player:', currentPlayer.name, 'remaining deck:', game.deck.length);

  // Check win condition
  if (checkWinCondition(currentPlayer.hand)) {
    game.gamePhase = 'finished';
    game.winner = currentPlayer.id;
    console.log('Player won:', currentPlayer.name);
  } else {
    // Move to next player and reset turn state
    game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
    game.turnStartTime = Date.now(); // Start timer for next player
    game.hasPlayedCard = false; // Reset for next player
    console.log('Next player turn:', game.players[game.currentPlayerIndex].name);
  }

  // Clear the prompt after a delay to give time for discussion
  setTimeout(() => {
    if (games.has(gameId)) {
      const currentGame = games.get(gameId);
      if (currentGame && currentGame.currentPrompt) {
        currentGame.currentPrompt = null;
        currentGame.lastUpdated = Date.now();
      }
    }
  }, 30000); // Clear prompt after 30 seconds
  
  game.lastUpdated = Date.now();
  console.log('Card drawn successfully by player:', currentPlayer.name);

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ success: true, gameState: game })
  };
}

async function newGame(data) {
  const { gameId } = data;
  
  if (!gameId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing gameId' })
    };
  }

  const game = games.get(gameId);
  
  if (!game) {
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Game not found' })
    };
  }

  const deck = createDeck();
  game.players.forEach(player => {
    player.hand = dealCards(deck, 5);
  });

  game.deck = deck;
  game.discardPile = [];
  game.gamePhase = 'playing';
  game.currentPlayerIndex = 0;
  game.winner = null;
  game.currentPrompt = null;
  game.turnStartTime = Date.now();
  game.hasPlayedCard = false;
  game.lastUpdated = Date.now();

  console.log('New game started:', gameId);

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ success: true, gameState: game })
  };
}

async function getGameStateHandler(gameId) {
  if (!gameId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Missing gameId' })
    };
  }

  const game = games.get(gameId);
  
  if (!game) {
    return {
      statusCode: 404,
      headers: corsHeaders,
      body: JSON.stringify({ error: 'Game not found' })
    };
  }

  return {
    statusCode: 200,
    headers: corsHeaders,
    body: JSON.stringify({ gameState: game })
  };
}