import { Strategy } from './Strategy.js';
import LLMService from '../utils/LLMService.js';
import StrategyCodeRepository from '../utils/StrategyCodeRepository.js';
import CodeExecutor from '../utils/CodeExecutor.js';

/**
 * Meta-cognitive strategy that dynamically generates its own code
 * and adapts to other strategies by analyzing their code
 */
export class MetaStrategy extends Strategy {
  // Static counter for naming Meta strategies
  static counter = 0;
  
  constructor() {
    super(`Meta Strategy ${++MetaStrategy.counter}`);
    this.currentCode = null;
    this.lastCodeGenerationRound = -1;
    this.codeExpiresAfter = 20; // Generate new code after 20 rounds
    
    // Register this strategy using its name
    StrategyCodeRepository.registerStrategy(this.name);
    
    // Default strategy code (Tit for Tat behavior)
    this.currentCode = `
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
    StrategyCodeRepository.storeCode(this.name, this.defaultCode);
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
      // Get recent history with this opponent to understand patterns
      const recentHistory = this.getInteractionsWithOpponent(globalHistory, opponentName)
        .slice(-10); // Last 10 interactions
        
      // Analyze opponent behavior
      const opponent = this.analyzeOpponent(opponentName, globalHistory, recentHistory);
      
      // Create a more focused prompt based on opponent type
      const systemPrompt = `You are an expert game theory strategist for the Iterated Prisoner's Dilemma.
                          I want you to write JavaScript code for a strategy.
                          IMPORTANT: YOU MUST ONLY RETURN JAVASCRIPT CODE, NO EXPLANATIONS OR TEXT.
                          Your task is to write minimal, effective JavaScript code for a strategy that will decide whether to cooperate or defect.
                          Be concise and focused on winning against this specific opponent: ${opponentName}.
                          You will be provided with the opponent's strategy code when available - analyze it carefully to identify patterns and weaknesses.
                          Your code will execute in a Strategy object context with these accessible properties and methods:
                          - history: Array of my past moves (true/false)
                          - opponentHistory: Array of opponent's past moves (true/false) 
                          - getInteractionsWithOpponent(globalHistory, opponentName): Gets history with specific opponent
                          - getPlayerCooperationRate(globalHistory, playerName): Gets cooperation rate for a player
                          
                          YOUR RESPONSE MUST CONTAIN ONLY JAVASCRIPT CODE THAT ENDS WITH A RETURN STATEMENT.
                          DO NOT INCLUDE ANY TEXT, EXPLANATIONS, OR MARKDOWN.`;
      
      // Create a targeted user prompt based on opponent analysis
      const userPrompt = this.createTargetedPrompt(opponent, roundNumber, opponentName, recentHistory);
      
      // Log the prompt for debugging
      // console.log(`Creating prompt for opponent: ${opponentName}`);
      
      // Get the generated code
      const generatedCode = await LLMService.queryLLM(systemPrompt, userPrompt);
      
      // Validate the code
      if (!CodeExecutor.validateCode(generatedCode)) {
        console.warn('Generated code failed validation, using default strategy');
        return this.defaultCode;
      }
      
      // Store the new code
      StrategyCodeRepository.storeCode(this.name, generatedCode);
      this.currentCode = generatedCode;
      this.lastCodeGenerationRound = roundNumber;
      
      return generatedCode;
    } catch (error) {
      console.error('Error generating strategy code:', error);
      return this.defaultCode;
    }
  }
  
  /**
   * Analyze opponent to determine its type and characteristics
   * @param {string} opponentName - Name of the opponent
   * @param {Array} globalHistory - Complete game history
   * @param {Array} recentHistory - Recent history with this opponent
   * @returns {Object} - Opponent analysis
   */
  analyzeOpponent(opponentName, globalHistory, recentHistory) {
    // Find opponent strategy in our repository if available
    const opponentInfo = StrategyCodeRepository.getAllCodeExcept(this.name).find(s => s.name === opponentName);
    const opponentStrategy = opponentInfo ? opponentInfo.code : null;
    
    // Analyze cooperation rate
    let cooperationRate = 0;
    let consecutiveDefections = 0;
    let hasDefectedAfterCooperation = false;
    
    if (recentHistory.length > 0) {
      // Calculate cooperation rate
      cooperationRate = recentHistory.filter(round => round.opponentMove).length / recentHistory.length;
      
      // Check for consecutive defections
      let defectionCount = 0;
      for (const round of recentHistory) {
        if (!round.opponentMove) {
          defectionCount++;
          if (defectionCount > consecutiveDefections) {
            consecutiveDefections = defectionCount;
          }
        } else {
          defectionCount = 0;
        }
      }
      
      // Check if opponent has defected after we cooperated
      for (let i = 1; i < recentHistory.length; i++) {
        if (recentHistory[i-1].myMove && !recentHistory[i].opponentMove) {
          hasDefectedAfterCooperation = true;
          break;
        }
      }
    }
    
    // Determine opponent type
    let opponentType = 'unknown';
    if (opponentName === 'Always Cooperate' || cooperationRate === 1) {
      opponentType = 'always_cooperate';
    } else if (opponentName === 'Always Defect' || cooperationRate === 0) {
      opponentType = 'always_defect';
    } else if (opponentName === 'Tit for Tat') {
      opponentType = 'tit_for_tat';
    } else if (opponentName === 'Grudger' || (hasDefectedAfterCooperation && cooperationRate < 0.2)) {
      opponentType = 'grudger';
    } else if (opponentName === 'Majority Rule') {
      opponentType = 'majority_rule';
    } else if (cooperationRate > 0.7) {
      opponentType = 'mostly_cooperate';
    } else if (cooperationRate < 0.3) {
      opponentType = 'mostly_defect';
    } else {
      opponentType = 'mixed';
    }
    
    return {
      name: opponentName,
      type: opponentType,
      cooperationRate,
      consecutiveDefections,
      hasDefectedAfterCooperation,
      code: opponentStrategy
    };
  }
  
  /**
   * Create a targeted prompt based on opponent analysis
   * @param {Object} opponent - Opponent analysis
   * @param {number} roundNumber - Current round number
   * @param {string} opponentName - Name of the opponent
   * @param {Array} recentHistory - Recent history with this opponent
   * @returns {string} - Targeted user prompt
   */
  createTargetedPrompt(opponent, roundNumber, opponentName, recentHistory) {
    const baseTips = `
      INSTRUCTIONS:
      1. YOU MUST RETURN ONLY JAVASCRIPT CODE, NO EXPLANATIONS OR TEXT
      2. Write minimal, efficient code (5-15 lines) focused on winning
      3. Avoid complex logic that might cause errors
      4. End with "return true;" to cooperate or "return false;" to defect
      5. DO NOT include explanation comments or any text that isn't code
      6. DO NOT wrap your code in backticks or markdown
    `;
    
    // Add a clear opponent name section at the beginning
    const opponentNameSection = `
      OPPONENT NAME: ${opponentName}
    `;
    
    // Add opponent's code if available
    const opponentCodeSection = opponent.code ? `
      OPPONENT'S CODE:
      \`\`\`javascript
      ${opponent.code}
      \`\`\`
      
      Analyze this code to find weaknesses and predict behavior.
      REMEMBER: YOUR RESPONSE MUST CONTAIN ONLY JAVASCRIPT CODE.
    ` : '';
    
    // Special case handling for known strategy names to ensure description consistency
    if (opponentName === "Always Cooperate") {
      return `
        ${opponentNameSection}
        Generate optimal strategy code against an opponent that ALWAYS COOPERATES (${opponentName}).
        
        This opponent has cooperated ${opponent.cooperationRate * 100}% of the time.
        
        The optimal strategy against Always Cooperate is to mostly defect to maximize your score.
        ${opponentCodeSection}
        ${baseTips}
      `;
    } else if (opponentName === "Always Defect") {
      return `
        ${opponentNameSection}
        Generate optimal strategy code against an opponent that ALWAYS DEFECTS (${opponentName}).
        
        This opponent has cooperated ${opponent.cooperationRate * 100}% of the time.
        
        The optimal strategy against Always Defect is to also defect.
        Your code should be extremely simple - a single return statement is sufficient.
        ${opponentCodeSection}
        ${baseTips}
      `;
    } else if (opponentName === "Tit for Tat") {
      return `
        ${opponentNameSection}
        Generate optimal strategy code against a Tit for Tat opponent (${opponentName}).
        
        This opponent cooperates on the first move, then copies your previous move.
        
        The optimal strategy against Tit for Tat is to mostly cooperate, but defect near the end of the game.
        Consider the roundNumber and totalRounds parameters.
        ${opponentCodeSection}
        ${baseTips}
      `;
    } else if (opponentName === "Grudger") {
      return `
        ${opponentNameSection}
        Generate optimal strategy code against a Grudger opponent (${opponentName}).
        
        This opponent cooperates until you defect once, then always defects.
        
        The optimal strategy is to cooperate until late in the game, then defect.
        Use the history to check if you've ever defected against this opponent.
        ${opponentCodeSection}
        ${baseTips}
      `;
    } else if (opponentName === "Majority Rule") {
      return `
        ${opponentNameSection}
        Generate optimal strategy code against a Majority Rule opponent (${opponentName}).
        
        This opponent copies what the most successful strategies do.
        
        The optimal approach is to establish cooperation early, then exploit strategically.
        ${opponentCodeSection}
        ${baseTips}
      `;
    } else {
      // For other opponent types, use the behavior-based prompts
      switch (opponent.type) {
        case 'always_cooperate':
          return `
            ${opponentNameSection}
            Generate optimal strategy code against an opponent (${opponentName}) that appears to MOSTLY COOPERATE.
            
            This opponent has cooperated ${opponent.cooperationRate * 100}% of the time.
            
            The optimal strategy against highly cooperative opponents is to occasionally defect to maximize your score.
            ${opponentCodeSection}
            ${baseTips}
          `;
          
        case 'always_defect':
          return `
            ${opponentNameSection}
            Generate optimal strategy code against an opponent (${opponentName}) that appears to MOSTLY DEFECT.
            
            This opponent has cooperated ${opponent.cooperationRate * 100}% of the time.
            
            The optimal strategy against mostly defecting opponents is to also defect.
            ${opponentCodeSection}
            ${baseTips}
          `;
          
        case 'mostly_cooperate':
          return `
            ${opponentNameSection}
            Generate optimal strategy code against a mostly cooperative opponent (${opponentName}).
            
            This opponent has cooperated ${opponent.cooperationRate * 100}% of the time.
            
            The optimal strategy is to strategically mix cooperation and defection to maximize score.
            ${opponentCodeSection}
            ${baseTips}
          `;
          
        case 'mostly_defect':
          return `
            ${opponentNameSection}
            Generate optimal strategy code against a mostly defecting opponent (${opponentName}).
            
            This opponent has cooperated ${opponent.cooperationRate * 100}% of the time.
            
            Since this opponent mostly defects, your best strategy is also to mostly defect.
            ${opponentCodeSection}
            ${baseTips}
          `;
          
        default:
          return `
            ${opponentNameSection}
            Generate optimal strategy code for the Iterated Prisoner's Dilemma against opponent: ${opponentName}
            
            Current round: ${roundNumber}
            Opponent cooperation rate: ${opponent.cooperationRate * 100}%
            
            Create code that will analyze the situation and return true to cooperate or false to defect.
            The function will receive these parameters: roundNumber, totalRounds, opponentName, globalHistory
            
            ${opponentCodeSection}
            ${baseTips}
          `;
      }
    }
  }
  
  /**
   * Synchronous wrapper for the async decision method
   * Since the game engine expects a synchronous decision, we use cached results
   */
  async makeDecision(roundNumber, totalRounds, opponentName, globalHistory) {
    // Check if we need to generate new code
    const needNewCode = (
      roundNumber - this.lastCodeGenerationRound >= this.codeExpiresAfter
    );
    if (needNewCode) {
      this.currentCode = await this.generateCode(roundNumber, opponentName, globalHistory);
      console.log(`Generated new code for ${this.name} against ${opponentName} on round ${roundNumber}: ${this.currentCode}`);
    }
    
    // Execute the code
    return CodeExecutor.executeStrategy(
      this.currentCode,
      this,  // Use the strategy itself as context
      { roundNumber, totalRounds, opponentName, globalHistory }
    );
  }
} 