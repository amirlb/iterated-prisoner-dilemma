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
  
  console.log("Starting tournament...");
  const results = await gameEngine.runTournament(strategies, ROUNDS);
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
  const metaNames = strategies.filter(s => s instanceof MetaStrategy).map(s => s.name);
  
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