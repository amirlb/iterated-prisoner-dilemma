# Iterated Prisoner's Dilemma Simulation with Meta-Cognitive Strategies

A web application that simulates the iterated prisoner's dilemma, a classic game theory scenario. This app demonstrates how different strategies perform when players repeatedly face the same decision, with advanced features including global information sharing and meta-cognitive strategies that can analyze each other's code.

## Features

- Simulate matches between two strategies with configurable number of rounds
- Run tournaments to see which strategies perform best overall
- Interactive visualizations of game results and scoring
- Implementation of various classic and modern strategies
- Educational explanations of the prisoner's dilemma concepts
- **Global information sharing**: Strategies can access complete tournament history
- **Meta-cognitive strategies**: Strategies can examine each other's source code and adapt using a language model

## What Makes This Version Special

In traditional iterated prisoner's dilemma, strategies only know about their own past interactions with specific opponents. In this enhanced version:

- All games run in parallel each round
- The complete decision history is recorded outside of the strategies
- The entire interaction history is passed to each strategy when making decisions
- New strategies can leverage this global information to make smarter decisions
- **Meta-cognitive strategies can analyze the source code of opponents and use a language model to develop optimal counter-strategies**

This mirrors real-world social dynamics where reputation, observing third-party interactions, and reasoning about others' decision-making processes influence behavior.

## Included Strategies

1. **Always Cooperate**: Always cooperates regardless of opponent's actions
2. **Always Defect**: Always defects regardless of opponent's actions
3. **Tit for Tat**: Cooperates on first move, then copies opponent's previous move
4. **Grudger**: Cooperates until opponent defects once, then always defects
5. **Random**: Randomly cooperates or defects with 50% probability
6. **Tit for Two Tats**: Only defects if opponent defected twice in a row
7. **Pavlov** (Win-Stay, Lose-Shift): If both players made the same move, repeats; otherwise switches
8. **Adaptive**: Adjusts cooperation probability based on opponent's behavior pattern
9. **Reputation Based**: Makes decisions based on how the opponent behaves with all players
10. **Majority Rule**: Copies what the most successful strategies do against the current opponent
11. **Meta Strategy**: Uses a language model to analyze opponent's source code and develop optimal counter-strategies in real-time

## Game Rules

The prisoner's dilemma uses the following payoff matrix:

- Both players cooperate: Both get 3 points
- Both players defect: Both get 1 point
- One cooperates and one defects: Defector gets 5 points, cooperator gets 0 points

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- npm (v6 or later)
- A local LLM installed (`llm` command available in the terminal)

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/iterated-prisoner-dilemma.git
   cd iterated-prisoner-dilemma
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server and LLM server together:
   ```
   npm run dev
   ```
   
   Or start them separately:
   ```
   # Start the LLM server
   npm run server
   
   # In another terminal window, start the React app
   npm start
   ```

4. Open your browser and navigate to: http://localhost:3000

### LLM Configuration

This project uses language models using the `llm` program. Please visit its website at

    https://llm.datasette.io/

for details. Note that you'll need either a local model plugin or an API key to an inference provider.

If you with to use LLMs another way, you'll need to modify the `server.js` file accordingly.

## Creating Your Own Strategies

You can create your own strategies by extending the base Strategy class. Your strategy will have access to:

- The complete history of all games in the tournament
- Helper methods to analyze interactions between specific players
- Information about the current round and opponent
- The LLM service for advanced reasoning and analysis

Example of a custom strategy:

```javascript
export class MyCustomStrategy extends Strategy {
  constructor() {
    super('My Custom Strategy');
  }
  
  makeDecision(roundNumber, totalRounds, opponentName, globalHistory) {
    // Your decision-making logic here, using the globalHistory parameter
    // Return true to cooperate, false to defect
  }
}
```

Example of a meta-cognitive strategy:

```javascript
export class MyMetaStrategy extends Strategy {
  constructor() {
    super('My Meta Strategy');
  }
  
  async initialize() {
    // Fetch the source code of all strategies
    this.strategyCode = await LLMService.getStrategiesCode();
  }
  
  async analyzeOpponent(opponentName) {
    // Use LLM to analyze opponent's strategy
    const systemPrompt = "Analyze this strategy code";
    const analysis = await LLMService.queryLLM(systemPrompt, this.strategyCode);
    return analysis;
  }
  
  makeDecision(roundNumber, totalRounds, opponentName, globalHistory) {
    // Make decisions based on code analysis
    // Return true to cooperate, false to defect
  }
}
```

## Acknowledgments

- Robert Axelrod for his seminal work on the evolution of cooperation
- Game theory pioneers like John Nash and John von Neumann 