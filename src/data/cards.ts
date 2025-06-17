import { Card } from '../types/game';

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

export function createDeck(): Card[] {
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