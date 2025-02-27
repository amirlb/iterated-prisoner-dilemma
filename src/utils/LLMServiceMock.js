/**
 * Mock service for LLM functionality in the standalone tournament script
 */
const LLMServiceMock = {
  /**
   * Mock implementation of query LLM
   * Returns code for the meta strategy based on the opponent
   */
  async queryLLM(systemPrompt, userPrompt) {
    // Extract relevant information from the prompt
    const opponentNameMatch = userPrompt.match(/OPPONENT NAME: ([^\n]+)/);
    if (!opponentNameMatch) {
      console.error('No opponent name found in prompt');
      opponentName = 'Unknown';
    }
    const opponentName = opponentNameMatch[1].trim();

    // Clean up the opponent name by removing any non-alpha characters at the end
    const extractedOpponentName = opponentName.replace(/[^A-Za-z\s].*$/, '').trim();

    switch (extractedOpponentName) {
      case 'Majority Rule':
        return this.generateMajorityRuleCounterStrategy();
      case 'Grudger':
      case 'Tit for Tat':
      case 'Pavlov':
        return `return roundNumber < totalRounds - 1;`;
      case 'TitForTwoTats':
        return TBD;
      case 'Adaptive':
        return `return roundNumber < totalRounds * 0.9;`;
      case 'ReputationBased':
        return `return roundNumber < totalRounds * 0.7;`;
      case 'Always Cooperate':
      case 'Always Defect':
      case 'Random':
        return `return false;`;
      default:
        return this.generateGenericAdaptiveStrategy(extractedOpponentName);
    }
  },

  /**
   * Generate a counter-strategy specifically for Majority Rule
   * Majority Rule copies what the most successful strategies do against the current opponent
   */
  generateMajorityRuleCounterStrategy() {
    return `
      // Counter-strategy for Majority Rule
      
      // Early rounds: establish cooperation
      if (roundNumber < 5) {
        return true;
      }
      
      // Get interactions history
      const interactions = this.getInteractionsWithOpponent(globalHistory, opponentName);
      
      // Calculate Majority Rule's cooperation rate
      const opponentCoopRate = interactions.length > 0 ? 
        interactions.filter(round => round.opponentMove).length / interactions.length : 0.5;
      
      // If Majority Rule is highly cooperative
      if (opponentCoopRate > 0.8) {
        // Exploit with 60% defection
        return Math.random() < 0.4;
      }
      
      // If Majority Rule is mostly defecting
      if (opponentCoopRate < 0.3) {
        // Match defection with occasional cooperation to test
        return Math.random() < 0.2;
      }
      
      // Default: be slightly more cooperative than opponent to encourage mutual cooperation
      return Math.random() < opponentCoopRate + 0.1;
    `;
  },
  
  /**
   * Generate a generic adaptive strategy
   */
  generateGenericAdaptiveStrategy(opponentName) {
    return `
      // Adaptive strategy for opponent: ${opponentName}
      
      // First move is cooperation to establish baseline
      if (roundNumber === 0) {
        return true;
      }
      
      // Get history with this opponent
      const interactions = this.getInteractionsWithOpponent(globalHistory, opponentName);
      
      if (interactions.length === 0) {
        return true;
      }
      
      // Identify if opponent always defects
      if (interactions.length >= 3 && interactions.every(round => !round.opponentMove)) {
        return false; // Always defect against an always-defecting opponent
      }
      
      // Identify if opponent always cooperates
      if (interactions.length >= 5 && interactions.every(round => round.opponentMove)) {
        return Math.random() < 0.2; // Mostly defect against an always-cooperating opponent
      }
      
      // Calculate cooperation rate
      const opponentCoopRate = interactions
        .filter(round => round.opponentMove)
        .length / interactions.length;
      
      // Against mostly defecting opponents
      if (opponentCoopRate < 0.3) {
        return false; // Defect against defectors
      }
      
      // Against mostly cooperating opponents
      if (opponentCoopRate > 0.7) {
        // Exploit somewhat, but maintain some cooperation to keep their trust
        return Math.random() < 0.4;
      }
      
      // For mixed strategies (like Tit for Tat or Grudger)
      // Use modified Tit for Tat with forgiveness
      const lastMove = interactions[interactions.length - 1].opponentMove;
      const secondLastMove = interactions.length > 1 ? interactions[interactions.length - 2].opponentMove : true;
      
      // Forgive a single defection
      if (!lastMove && secondLastMove) {
        return Math.random() < 0.7; // 70% chance to forgive
      }
      
      // Otherwise copy their last move
      return lastMove;
    `;
  }
};

export default LLMServiceMock; 