import React from 'react';
import * as Strategies from '../strategies/Strategy.js';
import { MetaStrategy } from '../strategies/MetaStrategy.js';

const StrategySelector = ({ onChange, value, id, label }) => {
  // Create a list of strategy classes to display
  const strategiesList = [
    Strategies.AlwaysCooperate,
    Strategies.AlwaysDefect,
    Strategies.TitForTat,
    Strategies.Grudger,
    Strategies.Random,
    Strategies.TitForTwoTats,
    Strategies.Pavlov,
    Strategies.Adaptive,
    Strategies.ReputationBased,
    Strategies.MajorityRule,
    MetaStrategy
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
          <option key={index} value={strategy.prettyName}>
            {strategy.prettyName}
          </option>
        ))}
      </select>
    </div>
  );
};

export default StrategySelector; 