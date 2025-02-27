import React from 'react';
import { Line } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend
);

const GameResults = ({ results }) => {
  if (!results) return <div>No results to display. Run a simulation first.</div>;

  const { rounds, strategy1, strategy2 } = results;
  
  // Prepare data for cumulative score chart
  const cumulativeScoreData = {
    labels: Array.from({ length: rounds.length }, (_, i) => i + 1),
    datasets: [
      {
        label: strategy1.name,
        data: rounds.map((_, index) => {
          // Calculate cumulative score up to this round
          return rounds.slice(0, index + 1).reduce((sum, r) => sum + r.strategy1.score, 0);
        }),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
      },
      {
        label: strategy2.name,
        data: rounds.map((_, index) => {
          return rounds.slice(0, index + 1).reduce((sum, r) => sum + r.strategy2.score, 0);
        }),
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
      }
    ]
  };

  // Chart options
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Cumulative Score Over Rounds',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Cumulative Score'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Round'
        }
      }
    }
  };

  // Prepare data for moves pattern
  const movePatternData = {
    labels: Array.from({ length: Math.min(20, rounds.length) }, (_, i) => i + 1), // Show at most 20 rounds
    datasets: [
      {
        label: `${strategy1.name} (1 = Cooperate, 0 = Defect)`,
        data: rounds.slice(0, 20).map(round => round.strategy1.move ? 1 : 0),
        borderColor: 'rgba(75, 192, 192, 1)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        stepped: true
      },
      {
        label: `${strategy2.name} (1 = Cooperate, 0 = Defect)`,
        data: rounds.slice(0, 20).map(round => round.strategy2.move ? 1 : 0),
        borderColor: 'rgba(153, 102, 255, 1)',
        backgroundColor: 'rgba(153, 102, 255, 0.2)',
        stepped: true
      }
    ]
  };

  const movePatternOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Move Patterns (First 20 Rounds)',
      },
    },
    scales: {
      y: {
        min: -0.1,
        max: 1.1,
        ticks: {
          callback: function(value) {
            return value === 0 ? 'Defect' : value === 1 ? 'Cooperate' : '';
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Round'
        }
      }
    }
  };

  return (
    <div className="game-results">
      <h2>Game Results</h2>
      
      <div className="result-summary card">
        <h3>Summary</h3>
        <p><strong>Winner:</strong> {results.winner}</p>
        <table>
          <thead>
            <tr>
              <th>Strategy</th>
              <th>Total Score</th>
              <th>Cooperation Rate</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{strategy1.name}</td>
              <td>{strategy1.score}</td>
              <td>{(strategy1.cooperationRate * 100).toFixed(1)}%</td>
            </tr>
            <tr>
              <td>{strategy2.name}</td>
              <td>{strategy2.score}</td>
              <td>{(strategy2.cooperationRate * 100).toFixed(1)}%</td>
            </tr>
          </tbody>
        </table>
      </div>
      
      <div className="chart-container card">
        <Line data={cumulativeScoreData} options={chartOptions} />
      </div>
      
      <div className="chart-container card">
        <Line data={movePatternData} options={movePatternOptions} />
      </div>
      
      <div className="rounds-table card">
        <h3>Last 10 Rounds</h3>
        <table>
          <thead>
            <tr>
              <th>Round</th>
              <th>{strategy1.name}</th>
              <th>Score</th>
              <th>{strategy2.name}</th>
              <th>Score</th>
            </tr>
          </thead>
          <tbody>
            {rounds.slice(-10).map((round) => (
              <tr key={round.round}>
                <td>{round.round + 1}</td>
                <td>{round.strategy1.move ? 'Cooperate' : 'Defect'}</td>
                <td>{round.strategy1.score}</td>
                <td>{round.strategy2.move ? 'Cooperate' : 'Defect'}</td>
                <td>{round.strategy2.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GameResults; 