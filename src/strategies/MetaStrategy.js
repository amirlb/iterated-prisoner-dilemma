import { Strategy } from './Strategy.js';
import LLMService from '../utils/LLMService.js';
import LLMServiceMock from '../utils/LLMServiceMock.js';
import StrategyCodeRepository from '../utils/StrategyCodeRepository.js';
import CodeExecutor from '../utils/CodeExecutor.js';

// Use the mock service when running in a Node.js environment outside the browser
const service = (typeof window === 'undefined') ? LLMServiceMock : LLMService;

/**
 * Meta-cognitive strategy that dynamically generates its own code
 * and adapts to other strategies by analyzing their code
 */
export class MetaStrategy extends Strategy {
  constructor() {
    super('Meta Strategy');
    this.strategiesInfo = [];
    this.currentCode = null;
    this.lastCodeGenerationRound = -1;
    this.codeExpiresAfter = 20; // Generate new code after 20 rounds
    this.uniqueId = StrategyCodeRepository.registerStrategy();
    this.codeContext = {
      history: this.history,
      opponentHistory: this.opponentHistory,
      name: this.name,
      id: this.uniqueId
    };
    
    // Default strategy code (Tit for Tat behavior)
    this.defaultCode = `
      // Default Meta Strategy code - Tit for Tat behavior
      if (roundNumber === 0) {
        return true; // Cooperate on first move
      }
      
      // If we have previous interactions with this opponent, copy their last move
      const history = this.getInteractionsWithOpponent(globalHistory, opponentName);
      
      if (history.length > 0) {
        return history[history.length - 1].opponentMove;
      }
      
      return true; // Default to cooperation
    `;
    
    // Store the initial code
    StrategyCodeRepository.storeCode(this.uniqueId, this.defaultCode, this.name);
  }

  /**
   * Initialize the strategy with all available strategy instances
   * This should be called before the tournament starts
   * @param {Array} allStrategies - All strategy instances in the tournament
   */
  initializeWithAllStrategies(allStrategies) {
    // Register all non-Meta strategies to the repository
    allStrategies.forEach(strategy => {
      // Skip Meta Strategies as they're already registered
      if (strategy.name !== 'Meta Strategy') {
        StrategyCodeRepository.registerStandardStrategy(strategy);
      }
    });
    
    // Update our information about all strategies
    this.updateStrategiesInfo();
  }
  
  /**
   * Update information about all registered strategies
   */
  updateStrategiesInfo() {
    this.strategiesInfo = StrategyCodeRepository.getAllCodeExcept(this.uniqueId);
  }

  /**
   * Generate new strategy code using the LLM
   * @param {number} roundNumber - Current round number
   * @param {string} opponentName - Name of the opponent
   * @param {Array} globalHistory - Complete game history
   * @returns {Promise<string>} - Generated strategy code
   */
  async generateCode(roundNumber, opponentName, globalHistory) {
    try {
      // Make sure we have the latest strategy information
      this.updateStrategiesInfo();
      
      // Get recent history with this opponent to understand patterns
      const recentHistory = this.getInteractionsWithOpponent(globalHistory, opponentName)
        .slice(-10); // Last 10 interactions
        
      // Get overall performance statistics
      const stats = this.calculatePerformanceStats(globalHistory);
      
      // Format all strategies' code for analysis
      let allStrategiesCode = '';
      this.strategiesInfo.forEach(strategy => {
        allStrategiesCode += `\n--- ${strategy.name} Strategy ---\n${strategy.code}\n`;
      });
      
      // Use the LLM to generate a new strategy
      const systemPrompt = `You are an expert game theory algorithm developer for the Iterated Prisoner's Dilemma.
                          Your task is to write JavaScript code for a strategy that will decide whether to cooperate or defect.
                          The code must be a valid JavaScript function body that returns true (cooperate) or false (defect).
                          You CAN use any standard JavaScript features.
                          You CANNOT use eval, Function constructors, or any browser/node specific APIs.
                          Your code will be executed in the context of a Strategy object with these properties and methods:
                          - history: Array of my past moves (true/false)
                          - opponentHistory: Array of opponent's past moves (true/false)
                          - name: My strategy name
                          - getInteractionsWithOpponent(globalHistory, opponentName): Gets history with specific opponent
                          - getPlayerCooperationRate(globalHistory, playerName): Gets cooperation rate for a player
                          Your code MUST end with a return statement that returns true or false.`;
      
      const userPrompt = `
        Generate optimal strategy code for the Iterated Prisoner's Dilemma based on the following:
        
        Current round: ${roundNumber}
        Current opponent: ${opponentName}
        
        Recent interactions with this opponent:
        ${JSON.stringify(recentHistory, null, 2)}
        
        My performance stats:
        ${JSON.stringify(stats, null, 2)}
        
        All known strategies' code:
        ${allStrategiesCode}
        
        Create a function body (not a complete function) that will be executed in the context of my strategy object.
        The function should analyze the situation and return true to cooperate or false to defect.
        The function will receive these parameters: roundNumber, totalRounds, opponentName, globalHistory
        
        RULES:
        1. Your code must be efficient and focused on winning
        2. Avoid overly complex code that might cause errors
        3. Include smart decision logic based on opponent behavior
        4. Consider what other strategies are doing
        5. Only include code, no explanation text
        6. End with a return statement that returns true or false
      `;
      
      // Get the generated code
      const generatedCode = await service.queryLLM(systemPrompt, userPrompt);
      
      // Clean up the code - remove markdown code blocks if present
      let cleanCode = generatedCode.replace(/```javascript|```js|```/g, '').trim();
      
      // Validate the code
      if (!CodeExecutor.validateCode(cleanCode)) {
        console.warn('Generated code failed validation, using default strategy');
        return this.defaultCode;
      }
      
      // Store the new code
      StrategyCodeRepository.storeCode(this.uniqueId, cleanCode, this.name);
      this.currentCode = cleanCode;
      this.lastCodeGenerationRound = roundNumber;
      
      return cleanCode;
    } catch (error) {
      console.error('Error generating strategy code:', error);
      return this.defaultCode;
    }
  }
  
  /**
   * Calculate performance statistics from global history
   * @param {Array} globalHistory - Complete game history
   * @returns {Object} - Performance statistics
   */
  calculatePerformanceStats(globalHistory) {
    const myInteractions = globalHistory.filter(record => 
      record.strategy1.name === this.name || record.strategy2.name === this.name
    );
    
    // Calculate total score
    let totalScore = 0;
    let wins = 0;
    let losses = 0;
    let cooperationCount = 0;
    let interactionCount = 0;
    
    myInteractions.forEach(record => {
      let myMove, myScore, opponentScore;
      
      if (record.strategy1.name === this.name) {
        myMove = record.strategy1.move;
        myScore = record.strategy1.score;
        opponentScore = record.strategy2.score;
      } else {
        myMove = record.strategy2.move;
        myScore = record.strategy2.score;
        opponentScore = record.strategy1.score;
      }
      
      totalScore += myScore;
      if (myScore > opponentScore) wins++;
      if (myScore < opponentScore) losses++;
      if (myMove) cooperationCount++;
      interactionCount++;
    });
    
    return {
      totalScore,
      winRate: interactionCount > 0 ? wins / interactionCount : 0,
      lossRate: interactionCount > 0 ? losses / interactionCount : 0,
      cooperationRate: interactionCount > 0 ? cooperationCount / interactionCount : 0,
      interactionCount
    };
  }
  
  /**
   * Make a decision based on the dynamically generated code
   * @param {number} roundNumber - Current round number
   * @param {number} totalRounds - Total number of rounds in the game
   * @param {string} opponentName - Name of the current opponent
   * @param {Array} globalHistory - Complete history of all interactions
   * @returns {boolean} - true to cooperate, false to defect
   */
  async makeDecisionAsync(roundNumber, totalRounds, opponentName, globalHistory) {
    // Check if we need to generate new code
    const needNewCode = (
      !this.currentCode || 
      roundNumber - this.lastCodeGenerationRound >= this.codeExpiresAfter
    );
    
    if (needNewCode) {
      this.currentCode = await this.generateCode(roundNumber, opponentName, globalHistory);
    }
    
    // Update the context with current state
    this.codeContext.history = this.history;
    this.codeContext.opponentHistory = this.opponentHistory;
    
    // Execute the code
    return CodeExecutor.executeStrategy(
      this.currentCode,
      this,  // Use the strategy itself as context
      { roundNumber, totalRounds, opponentName, globalHistory }
    );
  }
  
  /**
   * Synchronous wrapper for the async decision method
   * Since the game engine expects a synchronous decision, we use cached results
   */
  makeDecision(roundNumber, totalRounds, opponentName, globalHistory) {
    // For the first move or when we need new code but aren't in async context
    if (!this.currentCode) {
      // Start the code generation in the background
      this.makeDecisionAsync(roundNumber, totalRounds, opponentName, globalHistory)
        .catch(error => console.error('Background code generation failed:', error));
      
      // Use Tit for Tat for the first round
      if (roundNumber === 0) {
        return true; // Cooperate on first move
      } else {
        // Use the history for a Tit for Tat strategy
        const history = this.getInteractionsWithOpponent(globalHistory, opponentName);
        if (history.length > 0) {
          return history[history.length - 1].opponentMove;
        }
        return true;
      }
    }
    
    // Execute the current code
    return CodeExecutor.executeStrategy(
      this.currentCode,
      this,  // Use the strategy itself as context
      { roundNumber, totalRounds, opponentName, globalHistory }
    );
  }
  
  /**
   * Reset the strategy state
   */
  reset() {
    super.reset();
    this.lastCodeGenerationRound = -1;
    // Keep the current code as it's applicable across games
  }
} 