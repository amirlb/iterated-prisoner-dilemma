import React from 'react';
import { Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';

// Register Chart.js components
ChartJS.register(
  CategoryScale, 
  LinearScale, 
  BarElement, 
  Title, 
  Tooltip, 
  Legend
);

const TournamentResults = ({ results }) => {
  if (!results) return <div>No tournament results to display. Run a tournament first.</div>;

  const { rankings } = results;
  
  // Prepare data for the bar chart
  const rankingsData = {
    labels: rankings.map(r => r.name),
    datasets: [
      {
        label: 'Total Score',
        data: rankings.map(r => r.score),
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
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
        text: 'Tournament Rankings',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Total Score'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Strategy'
        }
      }
    }
  };

  return (
    <div className="tournament-results">
      <h2>Tournament Results</h2>
      
      <div className="chart-container card">
        <Bar data={rankingsData} options={chartOptions} />
      </div>
      
      <div className="rankings-table card">
        <h3>Rankings</h3>
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Strategy</th>
              <th>Total Score</th>
            </tr>
          </thead>
          <tbody>
            {rankings.map((rank) => (
              <tr key={rank.name}>
                <td>{rank.rank}</td>
                <td>{rank.name}</td>
                <td>{rank.score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="tournament-explanation card">
        <h3>How the Tournament Works</h3>
        <p>
          Each strategy plays against every other strategy for the specified number of rounds.
          The scores from all matches are tallied to determine the overall winner.
        </p>
        <p>
          The tournament helps identify which strategies perform best across a variety of opponents,
          rather than just in head-to-head matchups.
        </p>
      </div>
    </div>
  );
};

export default TournamentResults; 