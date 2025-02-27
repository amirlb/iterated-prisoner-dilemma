/**
 * Base Strategy class for the Prisoner's Dilemma game
 * All strategies should extend this class
 */
export class Strategy {
  static prettyName = 'Strategy';

  get name() {
    return this.constructor.prettyName;
  }

  /**
   * Get all interactions with a specific opponent from the global history
   * @param {Array} globalHistory - Complete history of all interactions
   * @param {string} opponentName - Name of the opponent
   * @returns {Array} - History of interactions with this opponent
   */
  getInteractionsWithOpponent(globalHistory, opponentName) {
    return globalHistory.filter(record => 
      (record.strategy1.name === this.name && record.strategy2.name === opponentName) ||
      (record.strategy2.name === this.name && record.strategy1.name === opponentName)
    ).map(record => {
      // Normalize the data so that the current strategy is always strategy1
      if (record.strategy1.name === this.name) {
        return {
          round: record.round,
          myMove: record.strategy1.move,
          opponentMove: record.strategy2.move,
          myScore: record.strategy1.score,
          opponentScore: record.strategy2.score
        };
      } else {
        return {
          round: record.round,
          myMove: record.strategy2.move,
          opponentMove: record.strategy1.move,
          myScore: record.strategy2.score,
          opponentScore: record.strategy1.score
        };
      }
    });
  }

  /**
   * Get all interactions between two other players
   * @param {Array} globalHistory - Complete history of all interactions
   * @param {string} player1 - Name of first player
   * @param {string} player2 - Name of second player
   * @returns {Array} - History of interactions between these players
   */
  getInteractionsBetweenPlayers(globalHistory, player1, player2) {
    return globalHistory.filter(record => 
      (record.strategy1.name === player1 && record.strategy2.name === player2) ||
      (record.strategy1.name === player2 && record.strategy2.name === player1)
    );
  }

  /**
   * Get cooperation rate of a specific player from global history
   * @param {Array} globalHistory - Complete history of all interactions
   * @param {string} playerName - Name of the player
   * @returns {number} - Cooperation rate (0-1)
   */
  getPlayerCooperationRate(globalHistory, playerName) {
    const playerMoves = globalHistory.flatMap(record => {
      if (record.strategy1.name === playerName) {
        return [record.strategy1.move];
      } else if (record.strategy2.name === playerName) {
        return [record.strategy2.move];
      }
      return [];
    });
    
    if (playerMoves.length === 0) return 0.5; // Default if no history
    
    return playerMoves.filter(move => move === true).length / playerMoves.length;
  }

  /**
   * Make a decision for the current round
   * @param {number} roundNumber - Current round number (0-indexed)
   * @param {number} totalRounds - Total number of rounds in the game
   * @param {string} opponentName - Name of the current opponent
   * @param {Array} globalHistory - Complete history of all interactions in the tournament.
   *                                This is a list of objects {"round": 123, "strategy1": {"name": "Strategy Name", "move": true, "score": 3}, "strategy2": {"name": "Strategy Name", "move": true, "score": 3}}
   * @returns {boolean} - true to cooperate, false to defect
   */
  async makeDecision(roundNumber, totalRounds, opponentName, globalHistory) {
    throw new Error('Strategy subclasses must implement makeDecision method');
  }
}

/**
 * Always cooperate strategy
 */
export class AlwaysCooperate extends Strategy {
  static prettyName = 'Always Cooperate';

  async makeDecision() {
    return true; // Always cooperate
  }
}

/**
 * Always defect strategy
 */
export class AlwaysDefect extends Strategy {
  static prettyName = 'Always Defect';

  async makeDecision() {
    return false; // Always defect
  }
}

/**
 * Tit for Tat strategy - Start with cooperation, then copy opponent's last move
 */
export class TitForTat extends Strategy {
  static prettyName = 'Tit for Tat';

  async makeDecision(roundNumber, totalRounds, opponentName, globalHistory) {
    if (roundNumber === 0) {
      return true; // Cooperate on first move
    }
    
    // Get history with this specific opponent
    const history = this.getInteractionsWithOpponent(globalHistory, opponentName);

    // Copy the opponent's last move
    return history[roundNumber - 1].opponentMove;
  }
}

/**
 * Grudger strategy - Cooperate until opponent defects, then always defect
 */
export class Grudger extends Strategy {
  static prettyName = 'Grudger';

  async makeDecision(roundNumber, totalRounds, opponentName, globalHistory) {
    // Get history with this specific opponent
    const history = this.getInteractionsWithOpponent(globalHistory, opponentName);
    
    // Check if opponent has ever defected against us
    const hasDefected = history.some(round => round.opponentMove === false);
    
    return !hasDefected; // Cooperate until betrayed, then always defect
  }
}

/**
 * Random strategy - 50% chance to cooperate or defect
 */
export class Random extends Strategy {
  static prettyName = 'Random';

  async makeDecision() {
    return Math.random() >= 0.5;
  }
}

/**
 * Tit for Two Tats - Only defect if opponent defected twice in a row
 */
export class TitForTwoTats extends Strategy {
  static prettyName = 'Tit for Two Tats';

  async makeDecision(roundNumber, totalRounds, opponentName, globalHistory) {
    // Get history with this specific opponent
    const history = this.getInteractionsWithOpponent(globalHistory, opponentName);
    
    if (history.length < 2) {
      return true; // Cooperate on first two moves
    }
    
    // Defect only if opponent defected in the last two rounds
    const lastMove = history[roundNumber - 1].opponentMove;
    const secondLastMove = history[roundNumber - 2].opponentMove;
    
    return !(lastMove === false && secondLastMove === false);
  }
}

/**
 * Pavlov strategy - Win-Stay, Lose-Shift
 * Cooperate if both players made the same move last round, otherwise defect
 */
export class Pavlov extends Strategy {
  static prettyName = 'Pavlov';

  async makeDecision(roundNumber, totalRounds, opponentName, globalHistory) {
    if (roundNumber === 0) {
      return true; // Cooperate on first move
    }
    
    // Get history with this specific opponent
    const history = this.getInteractionsWithOpponent(globalHistory, opponentName);
    
    const lastRound = history[roundNumber - 1];
    return lastRound.myMove === lastRound.opponentMove;
  }
}

/**
 * Adaptive strategy - Adjusts based on opponent's behavior pattern
 */
export class Adaptive extends Strategy {
  static prettyName = 'Adaptive';

  constructor() {
    super();
    this.cooperationRate = 0.5; // Initial cooperation probability
  }

  async makeDecision(roundNumber, totalRounds, opponentName, globalHistory) {
    if (roundNumber === 0) {
      return true; // Start with cooperation
    }
    
    // Calculate opponent's cooperation rate from global history
    const opponentCoopRate = this.getPlayerCooperationRate(globalHistory, opponentName);
    
    // Adjust our cooperation rate based on opponent's behavior
    this.cooperationRate = 0.7 * this.cooperationRate + 0.3 * opponentCoopRate;
    
    // Decide based on probability
    return Math.random() < this.cooperationRate;
  }
}

/**
 * Reputation-based strategy - Decides based on opponent's reputation with other players
 */
export class ReputationBased extends Strategy {
  static prettyName = 'Reputation Based';
  
  async makeDecision(roundNumber, totalRounds, opponentName, globalHistory) {
    if (roundNumber === 0) {
      return true; // Cooperate on first move or if no history
    }
    
    // Calculate opponent's overall cooperation rate with all players
    const opponentOverallCoopRate = this.getPlayerCooperationRate(globalHistory, opponentName);
    
    // Cooperate if opponent generally cooperates with others, otherwise defect
    if (opponentOverallCoopRate > 0.7) {
      return true; // Opponent has good reputation
    } else if (opponentOverallCoopRate < 0.3) {
      return false; // Opponent has bad reputation
    }
    
    // For opponents with mixed reputation, use Tit for Tat
    const history = this.getInteractionsWithOpponent(globalHistory, opponentName);
    return history[roundNumber - 1].opponentMove;
  }
}

/**
 * MajorityRule - Copies what the majority of successful players do against this opponent
 */
export class MajorityRule extends Strategy {
  static prettyName = 'Majority Rule';
  
  async makeDecision(roundNumber, totalRounds, opponentName, globalHistory) {
    if (roundNumber === 0) {
      return true; // Cooperate on first move or if no history
    }
    
    // Get all players who have interacted with my current opponent
    const playersVsOpponent = globalHistory
      .filter(record => 
        record.strategy1.name === opponentName || 
        record.strategy2.name === opponentName
      )
      .map(record => 
        record.strategy1.name === opponentName ? 
          record.strategy2.name : 
          record.strategy1.name
      )
      .filter(name => name !== this.name); // Exclude self
    
    // Get unique player names
    const uniquePlayers = [...new Set(playersVsOpponent)];
    
    // If no other players have interacted with opponent, cooperate
    if (uniquePlayers.length === 0) {
      return true;
    }
    
    // Calculate success of each player against this opponent
    const playerSuccessMap = {};
    
    uniquePlayers.forEach(playerName => {
      const interactions = this.getInteractionsBetweenPlayers(globalHistory, playerName, opponentName);
      
      // Calculate total score for this player
      const totalScore = interactions.reduce((sum, record) => {
        if (record.strategy1.name === playerName) {
          return sum + record.strategy1.score;
        } else {
          return sum + record.strategy2.score;
        }
      }, 0);
      
      // Store score and most recent move
      playerSuccessMap[playerName] = {
        score: totalScore,
        recentMoves: interactions.map(record => {
          if (record.strategy1.name === playerName) {
            return record.strategy1.move;
          } else {
            return record.strategy2.move;
          }
        })
      };
    });
    
    // Sort players by success score
    const sortedPlayers = Object.entries(playerSuccessMap)
      .sort((a, b) => b[1].score - a[1].score);
    
    // Take top half of successful players
    const topPlayers = sortedPlayers.slice(0, Math.max(1, Math.floor(sortedPlayers.length / 2)));
    
    // Count cooperate vs defect in most recent moves of top players
    let cooperateCount = 0;
    let defectCount = 0;
    
    topPlayers.forEach(([_, data]) => {
      if (data.recentMoves.length > 0) {
        const lastMove = data.recentMoves[data.recentMoves.length - 1];
        if (lastMove) {
          cooperateCount++;
        } else {
          defectCount++;
        }
      }
    });
    
    // Follow majority of successful players
    return cooperateCount >= defectCount;
  }
} 