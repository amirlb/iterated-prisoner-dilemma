import React, { useState } from 'react';
import StrategySelector from './components/StrategySelector.js';
import GameResults from './components/GameResults.js';
import TournamentResults from './components/TournamentResults.js';
import GameEngine from './utils/GameEngine.js';
import * as Strategies from './strategies/Strategy.js';
import { MetaStrategy } from './strategies/MetaStrategy.js';
import StrategyCodeRepository from './utils/StrategyCodeRepository.js';

const App = () => {
  // Game settings
  const [rounds, setRounds] = useState(100);
  const [strategy1Name, setStrategy1Name] = useState('Tit for Tat');
  const [strategy2Name, setStrategy2Name] = useState('Always Defect');
  const [activeTab, setActiveTab] = useState('game'); // 'game' or 'tournament'
  
  // Results
  const [gameResults, setGameResults] = useState(null);
  const [tournamentResults, setTournamentResults] = useState(null);
  
  // Initialize game engine
  const gameEngine = new GameEngine();
  
  // Function to get strategy instance by name
  const getStrategyByName = (name) => {
    switch (name) {
      case Strategies.AlwaysCooperate.prettyName: return new Strategies.AlwaysCooperate();
      case Strategies.AlwaysDefect.prettyName: return new Strategies.AlwaysDefect();
      case Strategies.TitForTat.prettyName: return new Strategies.TitForTat();
      case Strategies.Grudger.prettyName: return new Strategies.Grudger();
      case Strategies.Random.prettyName: return new Strategies.Random();
      case Strategies.TitForTwoTats.prettyName: return new Strategies.TitForTwoTats();
      case Strategies.Pavlov.prettyName: return new Strategies.Pavlov();
      case Strategies.Adaptive.prettyName: return new Strategies.Adaptive();
      case Strategies.ReputationBased.prettyName: return new Strategies.ReputationBased();
      case Strategies.MajorityRule.prettyName: return new Strategies.MajorityRule();
      case MetaStrategy.prettyName: return new MetaStrategy();
      default: throw new Error(`Unknown strategy: ${name}`);
    }
  };
  
  // Run a single game simulation
  const runGame = async () => {
    const strategy1 = getStrategyByName(strategy1Name);
    const strategy2 = getStrategyByName(strategy2Name);
    
    const results = await gameEngine.runGame(strategy1, strategy2, rounds);
    setGameResults(results);
    
    // Switch to game results tab
    setActiveTab('game');
  };
  
  // Run a tournament among all strategies
  const runTournament = async () => {
    const strategies = [
      new Strategies.AlwaysCooperate(),
      new Strategies.AlwaysDefect(),
      new Strategies.TitForTat(),
      new Strategies.Grudger(),
      new Strategies.Random(),
      new Strategies.TitForTwoTats(),
      new Strategies.Pavlov(),
      new Strategies.Adaptive(),
      new Strategies.ReputationBased(),
      new Strategies.MajorityRule(),
      new MetaStrategy(),
      new MetaStrategy()
    ];
    
    // Register all non-Meta strategies once in the repository
    strategies.forEach(strategy => {
      if (!(strategy instanceof MetaStrategy)) {
        StrategyCodeRepository.registerStandardStrategy(strategy);
      }
    });
    
    const results = await gameEngine.runTournament(strategies, rounds);
    setTournamentResults(results);
    
    // Switch to tournament results tab
    setActiveTab('tournament');
  };
  
  return (
    <div className="container">
      <header>
        <h1>Iterated Prisoner's Dilemma Simulation</h1>
        <p>
          Explore different strategies in the classic game theory scenario of the prisoner's dilemma.
          In this simulation, you can see how different strategies perform when played repeatedly.
        </p>
      </header>
      
      <div className="game-controls card">
        <h2>Simulation Settings</h2>
        
        <div className="form-group">
          <label htmlFor="rounds">Number of Rounds:</label>
          <input
            id="rounds"
            type="number"
            min="10"
            max="1000"
            value={rounds}
            onChange={(e) => setRounds(parseInt(e.target.value, 10))}
          />
        </div>
        
        <div className="form-group">
          <StrategySelector
            id="strategy1"
            label="Strategy 1:"
            value={strategy1Name}
            onChange={setStrategy1Name}
          />
        </div>
        
        <div className="form-group">
          <StrategySelector
            id="strategy2"
            label="Strategy 2:"
            value={strategy2Name}
            onChange={setStrategy2Name}
          />
        </div>
        
        <div className="button-group">
          <button onClick={runGame}>Run Game</button>
          <button onClick={runTournament}>Run Tournament</button>
        </div>
      </div>
      
      <div className="tabs">
        <button 
          className={activeTab === 'game' ? 'active' : ''} 
          onClick={() => setActiveTab('game')}
        >
          Game Results
        </button>
        <button 
          className={activeTab === 'tournament' ? 'active' : ''} 
          onClick={() => setActiveTab('tournament')}
        >
          Tournament Results
        </button>
      </div>
      
      {activeTab === 'game' ? (
        <GameResults results={gameResults} />
      ) : (
        <TournamentResults results={tournamentResults} />
      )}
      
      <div className="explanation card">
        <h2>About the Prisoner's Dilemma</h2>
        <p>
          The prisoner's dilemma is a classic game theory scenario where two rational players might not cooperate, 
          even when it's in their best interest to do so. In the iterated version, players repeatedly face the same 
          opponent, learning from past interactions.
        </p>
        
        <h3>Payoff Matrix</h3>
        <table className="payoff-matrix">
          <tbody>
            <tr>
              <td></td>
              <td colSpan="2" align="center"><strong>Player 2</strong></td>
            </tr>
            <tr>
              <td></td>
              <td><strong>Cooperate</strong></td>
              <td><strong>Defect</strong></td>
            </tr>
            <tr>
              <td><strong>Player 1<br />Cooperate</strong></td>
              <td>Both get 3 points</td>
              <td>Player 1: 0 points<br />Player 2: 5 points</td>
            </tr>
            <tr>
              <td><strong>Player 1<br />Defect</strong></td>
              <td>Player 1: 5 points<br />Player 2: 0 points</td>
              <td>Both get 1 point</td>
            </tr>
          </tbody>
        </table>
        
        <h3>Strategy Descriptions</h3>
        <ul>
          <li><strong>Always Cooperate:</strong> Always cooperates regardless of what the opponent does.</li>
          <li><strong>Always Defect:</strong> Always defects regardless of what the opponent does.</li>
          <li><strong>Tit for Tat:</strong> Cooperates on the first move, then copies the opponent's previous move.</li>
          <li><strong>Grudger:</strong> Cooperates until the opponent defects once, then always defects.</li>
          <li><strong>Random:</strong> Randomly cooperates or defects with 50% probability.</li>
          <li><strong>Tit for Two Tats:</strong> Only defects if the opponent defected twice in a row.</li>
          <li><strong>Pavlov:</strong> Starts with cooperation. If both players made the same move, repeats the move; otherwise switches.</li>
          <li><strong>Adaptive:</strong> Adjusts cooperation probability based on opponent's behavior pattern.</li>
          <li><strong>Reputation Based:</strong> Makes decisions based on how the opponent behaves with all players, not just this strategy.</li>
          <li><strong>Majority Rule:</strong> Copies what the most successful strategies do against the current opponent.</li>
          <li><strong>Meta Strategy:</strong> Uses a language model to analyze opponent strategy code and develop counter-strategies in real-time.</li>
        </ul>
        
        <h3>About Global Information Sharing</h3>
        <p>
          In this version of the simulation, strategies have access to the complete interaction history of all players.
          This means they can observe how their current opponent behaves with other strategies and adapt accordingly.
          This more closely resembles real-world social situations where reputation and observation of third-party 
          interactions influence decision making.
        </p>
        <p>
          The "Reputation Based" and "Majority Rule" strategies specifically take advantage of this global information
          to make more informed decisions than would be possible in a traditional prisoner's dilemma setup.
        </p>
        
        <h3>Meta-Cognitive Strategies</h3>
        <p>
          This simulation now includes a revolutionary "Meta Strategy" that can analyze the source code of other strategies
          using a language model. This strategy can examine how other strategies work, identify their patterns and weaknesses,
          and develop optimal counter-strategies in real-time. This represents a new level of meta-cognition in game theory
          simulations where agents can reason about each other's decision-making processes.
        </p>
      </div>
    </div>
  );
};

export default App; 