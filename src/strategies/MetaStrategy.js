import { Strategy } from './Strategy.js';
import LLMService from '../utils/LLMService.js';
import StrategyCodeRepository from '../utils/StrategyCodeRepository.js';
import CodeExecutor from '../utils/CodeExecutor.js';

const DEFAULT_CODE = `
  // Default Meta Strategy code - Tit for Tat behavior
  if (roundNumber === 0) {
    return true; // Cooperate on first move
  }

  // If we have previous interactions with this opponent, copy their last move
  const history = this.getInteractionsWithOpponent(globalHistory, opponentName);
  return history[roundNumber - 1].opponentMove;
`;

const SYSTEM_PROMPT = `You are a programmer who is an expert in game theory, whose main focus is the Iterated Prisoner's Dilemma.
You participate in an iterated prisoner's dilemma tournament. In each round between two players each can cooperate or defect.
The payoff for the player is as follows:
- Cooperate, Cooperate: 3 points
- Cooperate, Defect: 0 points
- Defect, Cooperate: 5 points
- Defect, Defect: 1 point
The winner of the tournament is the player with the most points after all rounds have been played.

Every 20 rounds, you will be given the opportunity to write code for a strategy that will decide whether to cooperate or defect for each of the next 20 rounds.
You will be provided with your history with each of the opponents so far, as well as the code that all the opponents used in the last 20 rounds.
Analyze the the strategies carefully, both their code and their behavior, to identify patterns and weaknesses.

The input will be provided in the following format:
[
  {
    "opponentName": "Tit for Tat",
    "code": "if (roundNumber === 0) { return true; } return opponentHistory[roundNumber - 1];",
    "history": [
      {"round": 0, "myMove": true, "opponentMove": true},
      {"round": 1, "myMove": false, "opponentMove": true},
      ...
    ]
  },
  ...
]
Current round: ###
Total rounds: ###

Rounds are counted from 0, meaning the last round is totalRounds - 1.

Your task is to write effective JavaScript code for a strategy that will decide whether to cooperate or defect for all opponents in the next 20 rounds.
Your code will execute in a Strategy object context with these accessible methods:
- getInteractionsWithOpponent(globalHistory, opponentName): Gets history with specific opponent - a list of objects {"round": 123, "myMove": true, "opponentMove": false, "myScore": 0, "opponentScore": 5}
- getInteractionsBetweenPlayers(globalHistory, player1, player2): Filter the global history for interactions between two players
- getPlayerCooperationRate(globalHistory, playerName): Gets cooperation rate for a player with all other players so far - a fraction between 0 and 1

Your response will fill in the body of this method in the Strategy object:
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
  YOUR CODE WILL BE PASTED HERE
}

The code must return a boolean (true/false), with true indicating cooperation and false indicating defection.
Remember that the code must work with all the strategies in the tournament, and do not hesitate to special-case some or all of them in your code.

YOUR RESPONSE MUST CONTAIN ONLY JAVASCRIPT CODE THAT ENDS WITH A RETURN STATEMENT.
DO NOT INCLUDE ANY TEXT, EXPLANATIONS, OR MARKDOWN.
DO NOT INCLUDE THE HEADER OF THE FUNCTION, ONLY THE BODY.`;

/**
 * Meta-cognitive strategy that dynamically generates its own code
 * and adapts to other strategies by analyzing their code
 */
export class MetaStrategy extends Strategy {
  static prettyName = 'Meta Strategy';

  // Static counter for naming Meta strategies
  static counter = 0;
  
  get name() {
    return this._name;
  }

  constructor() {
    super();
    this._name = `${MetaStrategy.prettyName} ${++MetaStrategy.counter}`;
    this.currentCode = null;
    this.lastCodeGenerationRound = -1;
    this.codeExpiresAfter = 20; // Generate new code after 20 rounds
    
    // Register this strategy using its name
    StrategyCodeRepository.registerStrategy(this.name);
    
    // Default strategy code (Tit for Tat behavior)
    this.currentCode = DEFAULT_CODE;
    
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
  async generateCode(roundNumber, totalRounds, globalHistory) {
    const userPrompt = this.createPrompt(roundNumber, totalRounds, globalHistory);
    
    const maxRetries = 5;
    let retryCount = 0;
    try {
      while (true) {
        // Get the generated code
        const generatedCode = await LLMService.queryLLM(SYSTEM_PROMPT, userPrompt);
        
        // Validate the code
        if (CodeExecutor.validateCode(generatedCode)) {
          return generatedCode;
        } else {
          if (retryCount++ < maxRetries) {
            console.warn('Generated code failed validation, calling LLM again');
          } else {
            console.error('Generated code failed validation, using default strategy');
            return this.defaultCode;
          }
        }
      }
    } catch (error) {
      console.error('Error generating strategy code:', error);
      return this.defaultCode;
    }
  }
  
  /**
   * Create a targeted detailing the opponents' code and the interaction history with each.
   * @param {number} roundNumber - Current round number
   * @param {number} totalRounds - Total number of rounds in the game 
   * @param {Array} globalHistory - Complete history of all interactions in the tournament.
   *                                This is a list of objects {"round": 123, "strategy1": {"name": "Strategy Name", "move": true, "score": 3}, "strategy2": {"name": "Strategy Name", "move": true, "score": 3}}
   * @returns {string} - The user prompt to pass to the LLM
   */
  createPrompt(roundNumber, totalRounds, globalHistory) {
    const opponentNames = new Set(globalHistory.flatMap(interaction => [interaction.strategy1.name, interaction.strategy2.name]));
    opponentNames.delete(this.name);
    const getHistoryWith = (name) => globalHistory.flatMap(interaction => {
      if (interaction.strategy1.name === name && interaction.strategy2.name === this.name) {
        return [`      {"round": ${interaction.round}, "myMove": ${interaction.strategy2.move}, "opponentMove": ${interaction.strategy1.move}}`];
      } else if (interaction.strategy1.name === this.name && interaction.strategy2.name === name) {
        return [`      {"round": ${interaction.round}, "myMove": ${interaction.strategy1.move}, "opponentMove": ${interaction.strategy2.move}}`];
      } else {
        return [];
      }
    });
    const opponentsInfo = Array.from(opponentNames).map(name => `  {
    "opponentName": ${JSON.stringify(name)},
    "code": ${JSON.stringify(StrategyCodeRepository.getCode(name))},
    "history": [
${getHistoryWith(name).join('\n')}
    ]
  },`);

    return `The list of opponents, their code, and the interaction history with each:
[
${opponentsInfo.join('\n')}
]
Current round: ${roundNumber}
Total rounds: ${totalRounds}

Think carefully about the best counter strategy to each opponent, and write code that will handle all of them correctly.

Remember to return Javascript code only, no explanations or text. Do not wrap your code in backticks or markdown.
Avoid complex logic that might cause errors.
End with "return true;" to cooperate or "return false;" to defect.
`;
  }
  
  async makeDecision(roundNumber, totalRounds, opponentName, globalHistory) {
    // Check if we need to generate new code
    const needNewCode = (
      roundNumber - this.lastCodeGenerationRound >= this.codeExpiresAfter
    );
    if (needNewCode) {
      this.currentCode = await this.generateCode(roundNumber, totalRounds, globalHistory);
      // Store the new code
      StrategyCodeRepository.storeCode(this.name, this.currentCode);
      this.lastCodeGenerationRound = roundNumber;
      // console.log(`Generated new code for ${this.name} against ${opponentName} on round ${roundNumber}: ${this.currentCode}`);
    }
    
    // Execute the code
    return CodeExecutor.executeStrategy(
      this.currentCode,
      this,  // Use the strategy itself as context
      { roundNumber, totalRounds, opponentName, globalHistory }
    );
  }
} 