// Add "type": "module" to package.json to run this script with ES modules
import GameEngine from './src/utils/GameEngine.js';
import * as Strategies from './src/strategies/Strategy.js';
import { MetaStrategy } from './src/strategies/MetaStrategy.js';

// Number of rounds to run in the tournament
const ROUNDS = 100;

// Function to run the tournament and display results
async function runTournament() {
  console.log("=== Iterated Prisoner's Dilemma Tournament ===");
  console.log(`Running ${ROUNDS} rounds for each strategy pair...\n`);

  const gameEngine = new GameEngine();
  
  // Initialize all strategies
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
    new MetaStrategy() // Add a second instance to test meta-meta interactions
  ];

  // Add distinguishable names to MetaStrategy instances
  const metaStrategies = strategies.filter(s => s instanceof MetaStrategy);
  metaStrategies.forEach((strategy, index) => {
    strategy.name = `Meta Strategy ${index + 1}`;
  });
  
  console.log("Starting tournament...");
  
  // Give MetaStrategy instances access to all strategies
  try {
    // Initialize meta strategies with all other strategies
    for (const strategy of metaStrategies) {
      // Give each meta strategy information about all strategies in the tournament
      strategy.initializeWithAllStrategies(strategies);
    }
    
    // Execute any async initialization needed for the tournament
    for (const strategy of strategies) {
      if (typeof strategy.makeDecisionAsync === 'function') {
        // Pre-generate code for the first round against a default opponent
        await strategy.makeDecisionAsync(0, ROUNDS, 'Tit for Tat', []);
      }
    }
    console.log("Strategy initialization completed.");
  } catch (error) {
    console.warn("Strategy initialization warning:", error.message);
  }
  
  // Now run the tournament
  const results = gameEngine.runTournament(strategies, ROUNDS);
  console.log("Tournament completed!\n");

  // Display rankings
  console.log("=== Final Rankings ===");
  results.rankings.forEach(rank => {
    console.log(`${rank.rank}. ${rank.name}: ${rank.score} points`);
  });

  // Display match statistics for the winner
  const winner = results.rankings[0];
  console.log(`\n=== ${winner.name} (Winner) Match Details ===`);
  
  results.matchResults.forEach(match => {
    if (match.strategy1.name === winner.name) {
      console.log(`vs ${match.strategy2.name}: ${match.strategy1.score} - ${match.strategy2.score} (Cooperation rate: ${(match.strategy1.cooperationRate * 100).toFixed(1)}%)`);
    } else if (match.strategy2.name === winner.name) {
      console.log(`vs ${match.strategy1.name}: ${match.strategy2.score} - ${match.strategy1.score} (Cooperation rate: ${(match.strategy2.cooperationRate * 100).toFixed(1)}%)`);
    }
  });

  // Display global statistics
  console.log("\n=== Strategy Cooperation Rates ===");
  const cooperationRates = {};
  
  // Calculate average cooperation rates from match results
  strategies.forEach(strategy => {
    const name = strategy.name;
    let totalCooperate = 0;
    let totalMatches = 0;
    
    results.matchResults.forEach(match => {
      if (match.strategy1.name === name) {
        totalCooperate += match.strategy1.cooperationRate;
        totalMatches++;
      } else if (match.strategy2.name === name) {
        totalCooperate += match.strategy2.cooperationRate;
        totalMatches++;
      }
    });
    
    cooperationRates[name] = totalMatches > 0 ? totalCooperate / totalMatches : 0;
  });
  
  // Display cooperation rates
  Object.entries(cooperationRates)
    .sort((a, b) => b[1] - a[1]) // Sort by cooperation rate
    .forEach(([name, rate]) => {
      console.log(`${name}: ${(rate * 100).toFixed(1)}%`);
    });
    
  // Display meta-strategy interactions specifically
  console.log("\n=== Meta Strategy Interactions ===");
  const metaNames = metaStrategies.map(s => s.name);
  
  results.matchResults.forEach(match => {
    if (metaNames.includes(match.strategy1.name) && metaNames.includes(match.strategy2.name)) {
      console.log(`${match.strategy1.name} vs ${match.strategy2.name}: ${match.strategy1.score} - ${match.strategy2.score}`);
      console.log(`  Cooperation rates: ${(match.strategy1.cooperationRate * 100).toFixed(1)}% vs ${(match.strategy2.cooperationRate * 100).toFixed(1)}%`);
    }
  });
}

// Run the tournament
runTournament().catch(error => {
  console.error("Tournament error:", error);
}); 