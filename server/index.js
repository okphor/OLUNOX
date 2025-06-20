const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const net = require('net');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Add a basic route for the root path
app.get('/', (req, res) => {
  res.json({ 
    message: 'Olubox Live 5P\'s Card Game Server',
    status: 'running',
    version: '1.0.0'
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Game state storage
const games = new Map();
const players = new Map();

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

// Function to check if a port is available
function isPortAvailable(port) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => {
        tester.once('close', () => resolve(true)).close();
      })
      .listen(port);
  });
}

// Function to find an available port
async function findAvailablePort(startPort = 3001) {
  let port = startPort;
  while (port < startPort + 100) { // Try up to 100 ports
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }
  throw new Error('No available ports found');
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('create-game', ({ gameId, player }) => {
    console.log('Creating game:', gameId, 'for player:', player.name);
    const deck = createDeck();
    const gameState = {
      id: gameId,
      players: [{ ...player, hand: dealCards(deck, 5) }],
      currentPlayerIndex: 0,
      deck: deck,
      discardPile: [],
      gamePhase: 'lobby',
      winner: null,
      currentPrompt: null
    };

    games.set(gameId, gameState);
    players.set(socket.id, { gameId, player });
    socket.join(gameId);
    
    socket.emit('game-state', gameState);
  });

  socket.on('join-game', ({ gameId, player }) => {
    console.log('Player joining game:', gameId, player.name);
    const game = games.get(gameId);
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }

    if (game.players.length >= 8) {
      socket.emit('error', 'Game is full');
      return;
    }

    const newPlayer = { ...player, hand: dealCards(game.deck, 5) };
    game.players.push(newPlayer);
    
    players.set(socket.id, { gameId, player: newPlayer });
    socket.join(gameId);
    
    // First emit to the room about the new player
    socket.to(gameId).emit('player-joined', newPlayer);
    
    // Then emit the updated game state to everyone
    io.to(gameId).emit('game-state', game);
  });

  // WebRTC Signaling
  socket.on('webrtc-offer', ({ gameId, targetId, offer }) => {
    console.log('Relaying WebRTC offer from', socket.id, 'to', targetId);
    socket.to(targetId).emit('webrtc-offer', {
      from: socket.id,
      offer
    });
  });

  socket.on('webrtc-answer', ({ gameId, targetId, answer }) => {
    console.log('Relaying WebRTC answer from', socket.id, 'to', targetId);
    socket.to(targetId).emit('webrtc-answer', {
      from: socket.id,
      answer
    });
  });

  socket.on('webrtc-ice-candidate', ({ gameId, targetId, candidate }) => {
    console.log('Relaying ICE candidate from', socket.id, 'to', targetId);
    socket.to(targetId).emit('webrtc-ice-candidate', {
      from: socket.id,
      candidate
    });
  });

  socket.on('start-game', ({ gameId }) => {
    const game = games.get(gameId);
    if (!game) return;

    const playerData = players.get(socket.id);
    if (!playerData || !playerData.player.isHost) return;

    game.gamePhase = 'playing';
    game.currentPlayerIndex = 0;
    
    io.to(gameId).emit('game-state', game);
  });

  socket.on('play-card', ({ gameId, playerId, card }) => {
    const game = games.get(gameId);
    if (!game || game.gamePhase !== 'playing') return;

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    // Remove card from player's hand
    const cardIndex = currentPlayer.hand.findIndex(c => c.id === card.id);
    if (cardIndex === -1) return;

    currentPlayer.hand.splice(cardIndex, 1);
    game.discardPile.push(card);
    game.currentPrompt = card.prompt;

    io.to(gameId).emit('game-state', game);
  });

  socket.on('draw-card', ({ gameId, playerId }) => {
    const game = games.get(gameId);
    if (!game || game.gamePhase !== 'playing') return;

    const currentPlayer = game.players[game.currentPlayerIndex];
    if (currentPlayer.id !== playerId) return;

    if (game.deck.length > 0) {
      const newCard = game.deck.pop();
      currentPlayer.hand.push(newCard);

      // Check win condition
      if (checkWinCondition(currentPlayer.hand)) {
        game.gamePhase = 'finished';
        game.winner = currentPlayer.id;
      } else {
        // Move to next player
        game.currentPlayerIndex = (game.currentPlayerIndex + 1) % game.players.length;
      }

      // Clear the prompt after a delay to give time for discussion
      setTimeout(() => {
        if (games.has(gameId)) {
          game.currentPrompt = null;
          io.to(gameId).emit('game-state', game);
        }
      }, 30000); // Clear prompt after 30 seconds
      
      io.to(gameId).emit('game-state', game);
    }
  });

  socket.on('new-game', ({ gameId }) => {
    const game = games.get(gameId);
    if (!game) return;

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

    io.to(gameId).emit('game-state', game);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const playerData = players.get(socket.id);
    if (playerData) {
      const { gameId } = playerData;
      const game = games.get(gameId);
      
      if (game) {
        game.players = game.players.filter(p => p.id !== socket.id);
        
        // If no players left, delete the game
        if (game.players.length === 0) {
          games.delete(gameId);
        } else {
          // Transfer host to another player if needed
          const hasHost = game.players.some(p => p.isHost);
          if (!hasHost && game.players.length > 0) {
            game.players[0].isHost = true;
          }
          
          io.to(gameId).emit('game-state', game);
        }
      }
      
      players.delete(socket.id);
    }
  });
});

// Start server with automatic port finding
async function startServer() {
  try {
    const PORT = process.env.PORT || await findAvailablePort(3001);
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();