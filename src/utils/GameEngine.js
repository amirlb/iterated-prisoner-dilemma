/**
 * Prisoner's Dilemma Game Engine
 * 
 * Payoff Matrix:
 * If both cooperate: both get 3 points
 * If both defect: both get 1 point
 * If one cooperates and one defects: defector gets 5 points, cooperator gets 0 points
 */
export default class GameEngine {
  constructor() {
    // Standard prisoner's dilemma payoffs (R, T, S, P)
    // R = Reward for mutual cooperation
    // T = Temptation to defect
    // S = Sucker's payoff
    // P = Punishment for mutual defection
    this.payoffs = {
      R: 3, // Both cooperate
      T: 5, // I defect, opponent cooperates
      S: 0, // I cooperate, opponent defects
      P: 1  // Both defect
    };
    
    // History of all rounds for all player pairs
    this.globalHistory = [];
    
    // Each round's moves for current tournament
    this.currentRoundMoves = {};
  }

  /**
   * Reset the game engine for a new simulation
   */
  reset() {
    this.globalHistory = [];
    this.currentRoundMoves = {};
  }

  /**
   * Get the payoff for a given move combination
   * @param {boolean} myMove - true for cooperate, false for defect
   * @param {boolean} opponentMove - true for cooperate, false for defect
   * @returns {number} - payoff based on the move combination
   */
  getPayoff(myMove, opponentMove) {
    if (myMove && opponentMove) {
      return this.payoffs.R; // Both cooperate
    } else if (!myMove && opponentMove) {
      return this.payoffs.T; // I defect, opponent cooperates
    } else if (myMove && !opponentMove) {
      return this.payoffs.S; // I cooperate, opponent defects
    } else {
      return this.payoffs.P; // Both defect
    }
  }

  /**
   * Generate a unique key for a pair of strategies
   * @param {string} strategy1Name - Name of first strategy
   * @param {string} strategy2Name - Name of second strategy
   * @returns {string} - Unique key for this pair
   */
  getPairKey(strategy1Name, strategy2Name) {
    return `${strategy1Name}-vs-${strategy2Name}`;
  }

  /**
   * Get all previous interactions for a specific strategy
   * @param {string} strategyName - Name of the strategy
   * @returns {Array} - All interactions involving this strategy
   */
  getStrategyHistory(strategyName) {
    return this.globalHistory.filter(record => 
      record.strategy1.name === strategyName || record.strategy2.name === strategyName
    );
  }

  /**
   * Run a tournament among multiple strategies
   * @param {Array} strategies - Array of strategy instances
   * @param {number} rounds - Number of rounds per match
   * @returns {Object} - Tournament results
   */
  runTournament(strategies, rounds) {
    // Reset game engine and all strategies
    this.reset();
    strategies.forEach(strategy => strategy.reset());
    
    const results = {};
    const scores = {};
    
    // Initialize scores and results for each strategy
    strategies.forEach(strategy => {
      scores[strategy.name] = 0;
    });
    
    // Run the tournament for specified number of rounds
    for (let round = 0; round < rounds; round++) {
      // For each round, all strategy pairs play simultaneously
      this.currentRoundMoves = {};
      
      // First phase: all strategies make decisions based on global history
      for (let i = 0; i < strategies.length; i++) {
        for (let j = i + 1; j < strategies.length; j++) {
          const strategy1 = strategies[i];
          const strategy2 = strategies[j];
          const pairKey = this.getPairKey(strategy1.name, strategy2.name);
          
          // Initialize pair history if first round
          if (round === 0) {
            results[pairKey] = {
              rounds: [],
              strategy1Name: strategy1.name,
              strategy2Name: strategy2.name
            };
          }
          
          // Get decisions from both strategies with access to complete history
          const move1 = strategy1.makeDecision(
            round, 
            rounds, 
            strategy2.name, 
            this.globalHistory
          );
          
          const move2 = strategy2.makeDecision(
            round, 
            rounds, 
            strategy1.name, 
            this.globalHistory
          );
          
          // Store moves for this round
          this.currentRoundMoves[pairKey] = {
            strategy1: {
              name: strategy1.name,
              move: move1
            },
            strategy2: {
              name: strategy2.name,
              move: move2
            }
          };
        }
      }
      
      // Second phase: calculate scores and update histories
      for (const pairKey in this.currentRoundMoves) {
        const moves = this.currentRoundMoves[pairKey];
        const strategy1Name = moves.strategy1.name;
        const strategy2Name = moves.strategy2.name;
        const move1 = moves.strategy1.move;
        const move2 = moves.strategy2.move;
        
        // Calculate payoffs
        const score1 = this.getPayoff(move1, move2);
        const score2 = this.getPayoff(move2, move1);
        
        // Record the round result
        const roundResult = {
          round,
          strategy1: {
            name: strategy1Name,
            move: move1,
            score: score1
          },
          strategy2: {
            name: strategy2Name,
            move: move2,
            score: score2
          }
        };
        
        // Add to global history
        this.globalHistory.push(roundResult);
        
        // Add to pair history
        results[pairKey].rounds.push(roundResult);
        
        // Update scores
        scores[strategy1Name] += score1;
        scores[strategy2Name] += score2;
        
        // Update local history in strategy instances
        const strategy1 = strategies.find(s => s.name === strategy1Name);
        const strategy2 = strategies.find(s => s.name === strategy2Name);
        
        if (strategy1) strategy1.recordRound(move1, move2);
        if (strategy2) strategy2.recordRound(move2, move1);
      }
    }
    
    // Calculate final statistics for each pair
    const matchResults = Object.values(results).map(pair => {
      const strategy1Score = pair.rounds.reduce((sum, round) => sum + round.strategy1.score, 0);
      const strategy2Score = pair.rounds.reduce((sum, round) => sum + round.strategy2.score, 0);
      
      const strategy1CoopRate = pair.rounds.filter(round => round.strategy1.move).length / rounds;
      const strategy2CoopRate = pair.rounds.filter(round => round.strategy2.move).length / rounds;
      
      return {
        rounds: pair.rounds,
        strategy1: {
          name: pair.strategy1Name,
          score: strategy1Score,
          cooperationRate: strategy1CoopRate
        },
        strategy2: {
          name: pair.strategy2Name,
          score: strategy2Score,
          cooperationRate: strategy2CoopRate
        },
        winner: strategy1Score > strategy2Score ? pair.strategy1Name : 
                strategy2Score > strategy1Score ? pair.strategy2Name : 'Tie'
      };
    });
    
    // Calculate rankings
    const rankings = Object.entries(scores)
      .sort((a, b) => b[1] - a[1]) // Sort by score in descending order
      .map((entry, index) => ({
        rank: index + 1,
        name: entry[0],
        score: entry[1]
      }));
    
    return {
      matchResults,
      rankings,
      globalHistory: this.globalHistory
    };
  }
  
  /**
   * Run a game between two strategies with access to global history
   * This is a simplified version that doesn't use the global history
   * @param {Strategy} strategy1 - First player's strategy
   * @param {Strategy} strategy2 - Second player's strategy
   * @param {number} rounds - Number of rounds to play
   * @returns {Object} - Game results
   */
  runGame(strategy1, strategy2, rounds) {
    // Reset strategies and game engine
    strategy1.reset();
    strategy2.reset();
    this.reset();
    
    const roundHistory = [];
    
    // Play all rounds
    for (let round = 0; round < rounds; round++) {
      // Get decisions from both strategies (without global history since this is just two players)
      const move1 = strategy1.makeDecision(round, rounds, strategy2.name, roundHistory);
      const move2 = strategy2.makeDecision(round, rounds, strategy1.name, roundHistory);
      
      // Calculate payoffs
      const score1 = this.getPayoff(move1, move2);
      const score2 = this.getPayoff(move2, move1);
      
      // Record this round for both strategies
      strategy1.recordRound(move1, move2);
      strategy2.recordRound(move2, move1);
      
      // Record this round in the game history
      const roundResult = {
        round: round,
        strategy1: {
          name: strategy1.name,
          move: move1,
          score: score1
        },
        strategy2: {
          name: strategy2.name,
          move: move2,
          score: score2
        }
      };
      roundHistory.push(roundResult);
      this.globalHistory.push(roundResult);
    }
    
    // Calculate final scores
    const strategy1Score = roundHistory.reduce((sum, round) => sum + round.strategy1.score, 0);
    const strategy2Score = roundHistory.reduce((sum, round) => sum + round.strategy2.score, 0);
    
    // Calculate cooperation rates
    const strategy1CoopRate = roundHistory.filter(round => round.strategy1.move).length / rounds;
    const strategy2CoopRate = roundHistory.filter(round => round.strategy2.move).length / rounds;
    
    return {
      rounds: roundHistory,
      strategy1: {
        name: strategy1.name,
        score: strategy1Score,
        cooperationRate: strategy1CoopRate
      },
      strategy2: {
        name: strategy2.name,
        score: strategy2Score,
        cooperationRate: strategy2CoopRate
      },
      winner: strategy1Score > strategy2Score ? strategy1.name : 
              strategy2Score > strategy1Score ? strategy2.name : 'Tie'
    };
  }
} 