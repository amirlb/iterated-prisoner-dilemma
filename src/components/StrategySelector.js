import React from 'react';
import * as Strategies from '../strategies/Strategy.js';
import { MetaStrategy } from '../strategies/MetaStrategy.js';

const StrategySelector = ({ onChange, value, id, label }) => {
  // Create an instance of each strategy class to display
  const strategiesList = [
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
    new MetaStrategy()
  ];

  return (
    <div className="strategy-selector">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {strategiesList.map((strategy, index) => (
          <option key={index} value={strategy.name}>
            {strategy.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StrategySelector; 