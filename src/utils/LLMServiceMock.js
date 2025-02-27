/**
 * Mock service for LLM functionality in the standalone tournament script
 */
const LLMServiceMock = {
  /**
   * Mock implementation of query LLM
   * Returns code for the meta strategy based on the opponent
   */
  async queryLLM(systemPrompt, userPrompt) {
    // If the prompt is asking to generate strategy code
    if (systemPrompt.includes('write JavaScript code for a strategy')) {
      return this.generateStrategyCode(userPrompt);
    }
    
    // For other types of queries, return a general response
    return "This appears to be a mixed strategy with both cooperative and competitive elements. Consider a balanced approach.";
  },
  
  /**
   * Generate strategy code based on analysis of opponent behavior patterns
   * @param {string} prompt - The user prompt containing opponent information
   * @returns {string} - Generated strategy code
   */
  generateStrategyCode(prompt) {
    // Extract relevant information from the prompt
    const opponentNameMatch = prompt.match(/Current opponent: ([^\n]+)/);
    const opponentName = opponentNameMatch ? opponentNameMatch[1].trim() : 'Unknown';
    const roundMatch = prompt.match(/Current round: (\d+)/);
    const currentRound = roundMatch ? parseInt(roundMatch[1]) : 0;
    
    // Special handling for different opponent types
    if (opponentName === 'Grudger') {
      return this.generateGrudgerCounterStrategy();
    } else if (opponentName === 'Majority Rule') {
      return this.generateMajorityRuleCounterStrategy();
    } else if (opponentName === 'Tit for Tat') {
      return this.generateTitForTatCounterStrategy();
    } else if (opponentName === 'Always Cooperate') {
      return this.generateAlwaysCooperateCounterStrategy();
    } else if (opponentName === 'Always Defect') {
      return this.generateAlwaysDefectCounterStrategy();
    } else if (opponentName.startsWith('Meta Strategy')) {
      return this.generateMetaStrategyCounterStrategy();
    }
    
    // Base strategy that works for any opponent
    return this.generateGenericAdaptiveStrategy(opponentName);
  },
  
  /**
   * Generate a counter-strategy specifically for Grudger
   * Grudger cooperates until defected against, then always defects
   */
  generateGrudgerCounterStrategy() {
    return `
      // Counter-strategy for Grudger
      // Grudger cooperates until defected against, then always defects
      
      // First round is always cooperation to establish good relations
      if (roundNumber === 0) {
        return true;
      }
      
      // Get our history with Grudger
      const interactions = this.getInteractionsWithOpponent(globalHistory, opponentName);
      
      if (interactions.length === 0) {
        return true; // Default to cooperation if no history
      }
      
      // Check if we've already defected
      const haveDefected = interactions.some(round => !round.myMove);
      
      // Check if Grudger is still cooperating
      const grudgerStillCooperating = interactions.slice(-3).every(round => round.opponentMove);
      
      // If we've defected and Grudger is still cooperating, it's not actually Grudger
      // or it's a different implementation
      if (haveDefected && grudgerStillCooperating) {
        // Exploit its forgiveness with occasional defection
        return Math.random() < 0.7; // 70% cooperation
      }
      
      // If we haven't defected yet, mostly cooperate but occasionally test with defection
      // in later rounds to verify it's really Grudger
      if (!haveDefected) {
        if (roundNumber > totalRounds * 0.8) {
          // In the last 20% of rounds, we can safely defect
          return false;
        }
        
        // Rarely test with defection in middle rounds to verify behavior
        if (roundNumber > 20 && Math.random() < 0.05) {
          return false;
        }
        
        // Otherwise cooperate
        return true;
      }
      
      // If Grudger has turned to all defection, mostly defect but with rare cooperation
      return Math.random() < 0.1; // 10% cooperation
    `;
  },
  
  /**
   * Generate a counter-strategy specifically for Majority Rule
   * Majority Rule copies what the most successful strategies do against the current opponent
   */
  generateMajorityRuleCounterStrategy() {
    return `
      // Counter-strategy for Majority Rule
      // Majority Rule bases decisions on what successful strategies do, so we need to be unpredictable
      
      // First round is always cooperation
      if (roundNumber === 0) {
        return true;
      }
      
      // Get our interactions with Majority Rule
      const interactions = this.getInteractionsWithOpponent(globalHistory, opponentName);
      
      if (interactions.length === 0) {
        return true; // Default to cooperation if no history
      }
      
      // Calculate Majority Rule's cooperation rate
      const opponentCoopRate = interactions
        .filter(round => round.opponentMove)
        .length / interactions.length;
      
      // See how Majority Rule responds to our defection
      const myDefections = interactions.filter(round => !round.myMove);
      const responseToDefection = myDefections.map((round, index) => {
        return index < interactions.length - 1 ? 
          interactions[index + 1].opponentMove : null;
      }).filter(response => response !== null);
      
      const forgivenessRate = responseToDefection.length > 0 ? 
        responseToDefection.filter(response => response).length / responseToDefection.length : 0.5;
      
      // Check other strategies against Majority Rule
      const allMajorityRuleInteractions = globalHistory.filter(record => 
        (record.strategy1.name === opponentName || record.strategy2.name === opponentName) &&
        (record.strategy1.name !== this.name && record.strategy2.name !== this.name)
      );
      
      // If Majority Rule is highly cooperative
      if (opponentCoopRate > 0.8) {
        // Mostly defect but maintain some cooperation to avoid triggering a shift
        return Math.random() < 0.3; // 30% cooperation
      }
      
      // If Majority Rule is balanced (adapting)
      if (opponentCoopRate > 0.4 && opponentCoopRate < 0.7) {
        // Be slightly more cooperative to try to shift its behavior
        return Math.random() < 0.7; // 70% cooperation
      }
      
      // If Majority Rule is mostly defecting
      if (opponentCoopRate < 0.3) {
        // Defect more but with occasional cooperation
        return Math.random() < 0.2; // 20% cooperation
      }
      
      // Default mixed strategy with slight bias toward cooperation
      return Math.random() < 0.55;
    `;
  },
  
  /**
   * Generate a counter-strategy specifically for Tit for Tat
   */
  generateTitForTatCounterStrategy() {
    return `
      // Counter-strategy for Tit for Tat
      // Tit for Tat copies the opponent's last move
      
      // Cooperate on first move
      if (roundNumber === 0) {
        return true;
      }
      
      // Get our history with Tit for Tat
      const interactions = this.getInteractionsWithOpponent(globalHistory, opponentName);
      
      if (interactions.length === 0) {
        return true;
      }
      
      // Verify it's actually Tit for Tat by checking its last move against our previous move
      if (interactions.length >= 2) {
        const followsTitForTat = interactions[interactions.length - 1].opponentMove === 
          interactions[interactions.length - 2].myMove;
        
        // If it's not following Tit for Tat pattern, use a different strategy
        if (!followsTitForTat && roundNumber > 5) {
          // If it's not Tit for Tat, use a more generic approach
          return Math.random() < 0.6; // Slight bias toward cooperation
        }
      }
      
      // Against true Tit for Tat, the best strategy is mostly cooperation
      // with occasional defection, but always cooperate after we defect
      const lastRound = interactions[interactions.length - 1];
      
      // If we defected last round, Tit for Tat will defect now, so we should cooperate
      if (!lastRound.myMove) {
        return true;
      }
      
      // If we're near the end of the game, defect more
      if (roundNumber > totalRounds * 0.9) {
        return false;
      }
      
      // Otherwise, mostly cooperate with occasional defection
      return Math.random() < 0.9; // 90% cooperation
    `;
  },
  
  /**
   * Generate a counter-strategy for Always Cooperate
   */
  generateAlwaysCooperateCounterStrategy() {
    return `
      // Counter-strategy for Always Cooperate
      // Since it always cooperates, we can mostly defect
      
      // Verify it's really Always Cooperate
      const interactions = this.getInteractionsWithOpponent(globalHistory, opponentName);
      
      if (interactions.length > 3) {
        const alwaysCooperates = interactions.every(round => round.opponentMove);
        
        if (!alwaysCooperates) {
          // If it's not always cooperating, use a more adaptive strategy
          return Math.random() < 0.5;
        }
      }
      
      // Against a true Always Cooperate, optimal is to mostly defect
      // But we keep some cooperation to maintain its trust in case it's not exactly Always Cooperate
      return Math.random() < 0.1; // 10% cooperation rate
    `;
  },
  
  /**
   * Generate a counter-strategy for Always Defect
   */
  generateAlwaysDefectCounterStrategy() {
    return `
      // Counter-strategy for Always Defect
      // Since it always defects, we should also mostly defect
      
      // Verify it's really Always Defect
      const interactions = this.getInteractionsWithOpponent(globalHistory, opponentName);
      
      if (interactions.length > 3) {
        const alwaysDefects = interactions.every(round => !round.opponentMove);
        
        if (!alwaysDefects) {
          // If it's not always defecting, use a more adaptive strategy
          return Math.random() < 0.5;
        }
      }
      
      // Against a true Always Defect, best to mostly defect
      // But occasionally cooperate to see if it changes (unlikely)
      return Math.random() < 0.05; // 5% cooperation rate
    `;
  },
  
  /**
   * Generate a counter-strategy for another Meta Strategy
   */
  generateMetaStrategyCounterStrategy() {
    return `
      // Counter-strategy for another Meta Strategy
      // This requires careful observation and unpredictability
      
      // First round cooperation
      if (roundNumber === 0) {
        return true;
      }
      
      // Get our history with this Meta Strategy
      const interactions = this.getInteractionsWithOpponent(globalHistory, opponentName);
      
      if (interactions.length === 0) {
        return true;
      }
      
      // Calculate how often the opponent has cooperated
      const opponentCoopRate = interactions
        .filter(round => round.opponentMove)
        .length / interactions.length;
      
      // Calculate how often we've cooperated
      const myCoopRate = interactions
        .filter(round => round.myMove)
        .length / interactions.length;
      
      // See if there's a pattern to exploit
      const recentRounds = Math.min(5, interactions.length);
      const recentInteractions = interactions.slice(-recentRounds);
      
      // Calculate if we're doing better or worse
      let myScore = 0;
      let opponentScore = 0;
      
      recentInteractions.forEach(round => {
        if (round.myMove && round.opponentMove) {
          // Both cooperate: 3 points each
          myScore += 3;
          opponentScore += 3;
        } else if (!round.myMove && round.opponentMove) {
          // I defect, opponent cooperates: 5 points for me, 0 for opponent
          myScore += 5;
          opponentScore += 0;
        } else if (round.myMove && !round.opponentMove) {
          // I cooperate, opponent defects: 0 points for me, 5 for opponent
          myScore += 0;
          opponentScore += 5;
        } else {
          // Both defect: 1 point each
          myScore += 1;
          opponentScore += 1;
        }
      });
      
      const winningScore = myScore > opponentScore;
      
      // If we're winning, keep current strategy
      if (winningScore) {
        // Continue what's working, but slightly less predictable
        return Math.random() < myCoopRate - 0.1;
      }
      
      // If opponent is highly cooperative, exploit it more
      if (opponentCoopRate > 0.7) {
        return Math.random() < 0.3; // 30% cooperation
      }
      
      // If opponent is defecting a lot, try more cooperation to break cycle
      if (opponentCoopRate < 0.3) {
        return Math.random() < 0.7; // 70% cooperation to try to reset
      }
      
      // Use a slightly unpredictable strategy
      return Math.random() < 0.5;
    `;
  },
  
  /**
   * Generate a generic adaptive strategy
   */
  generateGenericAdaptiveStrategy(opponentName) {
    return `
      // Adaptive strategy for opponent: ${opponentName}
      
      // First move is always cooperation to establish good relations
      if (roundNumber === 0) {
        return true;
      }
      
      // Get our history with this specific opponent
      const interactions = this.getInteractionsWithOpponent(globalHistory, opponentName);
      
      if (interactions.length === 0) {
        return true; // Default to cooperation if no history
      }
      
      // Analyze opponent's pattern
      // 1. Calculate overall cooperation rate
      const opponentCoopRate = interactions
        .filter(round => round.opponentMove)
        .length / interactions.length;
        
      // 2. Calculate my cooperation rate
      const myCoopRate = interactions
        .filter(round => round.myMove)
        .length / interactions.length;
        
      // 3. Check for recent changes in behavior (last 5 rounds or fewer)
      const recentRounds = Math.min(5, interactions.length);
      const recentInteractions = interactions.slice(-recentRounds);
      const recentOpponentCoopRate = recentInteractions
        .filter(round => round.opponentMove)
        .length / recentRounds;
        
      // 4. Check opponent's response to my defection
      const myDefections = interactions.filter(round => !round.myMove);
      const defectionResponses = myDefections.map((round, index) => {
        // Find if there's a next round after my defection
        return index < interactions.length - 1 ? 
          interactions[index + 1].opponentMove : null;
      }).filter(response => response !== null);
      
      const forgivenessRate = defectionResponses.length > 0 ? 
        defectionResponses.filter(response => response).length / defectionResponses.length : 1;
        
      // 5. Check if opponent consistently retaliates
      const isRetaliator = forgivenessRate < 0.2;
      
      // 6. Check if opponent is being exploited by others
      let globalExploitationRate = 0;
      const opponentGlobalInteractions = globalHistory.filter(record => 
        (record.strategy1.name === opponentName || record.strategy2.name === opponentName) &&
        (record.strategy1.name !== this.name && record.strategy2.name !== this.name)
      );
      
      if (opponentGlobalInteractions.length > 0) {
        let exploitationCount = 0;
        let totalInteractions = 0;
        
        opponentGlobalInteractions.forEach(record => {
          let opponentMove, otherMove;
          
          if (record.strategy1.name === opponentName) {
            opponentMove = record.strategy1.move;
            otherMove = record.strategy2.move;
          } else {
            opponentMove = record.strategy2.move;
            otherMove = record.strategy1.move;
          }
          
          if (opponentMove && !otherMove) {
            // Opponent cooperated while other defected
            exploitationCount++;
          }
          totalInteractions++;
        });
        
        globalExploitationRate = exploitationCount / totalInteractions;
      }
      
      // Decision logic based on opponent type
      
      // Against Always Defect - mostly defect with occasional cooperation
      if (opponentCoopRate < 0.1) {
        return Math.random() < 0.1; // 10% cooperation rate
      }
      
      // Against Always Cooperate - mostly defect with some cooperation to maintain trust
      if (opponentCoopRate > 0.9) {
        return Math.random() < 0.3; // 30% cooperation rate
      }
      
      // Against Tit for Tat or similar - be slightly more cooperative to avoid cycles of defection
      if (isRetaliator) {
        return Math.random() < 0.6; // 60% cooperation rate
      }
      
      // Against Grudger - if we've defected and they're holding a grudge, mostly defect
      if (forgivenessRate < 0.3 && myDefections.length > 0) {
        return Math.random() < 0.2; // 20% cooperation
      }
      
      // If the opponent is changing behavior recently, adapt accordingly
      if (Math.abs(recentOpponentCoopRate - opponentCoopRate) > 0.2) {
        // If they're becoming more cooperative, be slightly more cooperative
        if (recentOpponentCoopRate > opponentCoopRate) {
          return Math.random() < 0.6;
        } else {
          // If they're becoming less cooperative, be less cooperative
          return Math.random() < 0.4;
        }
      }
      
      // Default behavior - be slightly more cooperative than the opponent
      return Math.random() < (opponentCoopRate + 0.1);
    `;
  },
  
  /**
   * Get the mock source code for strategies
   * @returns {string} - The source code
   */
  getStrategiesCode() {
    return `
      export class AlwaysCooperate extends Strategy {
        constructor() {
          super('Always Cooperate');
        }
        
        makeDecision() {
          return true;
        }
      }
      
      export class AlwaysDefect extends Strategy {
        constructor() {
          super('Always Defect');
        }
        
        makeDecision() {
          return false;
        }
      }
      
      export class TitForTat extends Strategy {
        constructor() {
          super('Tit for Tat');
        }
        
        makeDecision(roundNumber, totalRounds, opponentName, globalHistory) {
          if (roundNumber === 0) {
            return true;
          }
          
          const history = this.getInteractionsWithOpponent(globalHistory, opponentName);
          if (history.length > 0) {
            return history[history.length - 1].opponentMove;
          }
          
          return true;
        }
      }
      
      export class Grudger extends Strategy {
        constructor() {
          super('Grudger');
        }
        
        makeDecision(roundNumber, totalRounds, opponentName, globalHistory) {
          const history = this.getInteractionsWithOpponent(globalHistory, opponentName);
          
          // If the opponent has ever defected, always defect
          if (history.some(round => !round.opponentMove)) {
            return false;
          }
          
          return true;
        }
      }
      
      // ... more strategies would be included here ...
    `;
  }
};

export default LLMServiceMock; 