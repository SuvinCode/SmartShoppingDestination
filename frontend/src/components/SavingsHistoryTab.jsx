import React from 'react';

export default function SavingsHistoryTab({ savingsStats }) {
  // SVG Chart Render Helper (Zero Dependency Charting)
  const renderSavingsChart = () => {
    const history = savingsStats.history;
    if (history.length === 0) return null;

    const width = 500;
    const height = 180;
    const padding = 20;

    // Find max value
    const maxVal = Math.max(...history.map(h => h.CumulativeSavings), 20);
    const minVal = 0;

    // Map points to SVG coordinates
    const points = history.map((h, i) => {
      const x = padding + (i * (width - padding * 2)) / Math.max(1, history.length - 1);
      const y = height - padding - ((h.CumulativeSavings - minVal) * (height - padding * 2)) / (maxVal - minVal);
      return { x, y, data: h };
    });

    // Construct path line
    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    // Construct gradient area fill path
    const areaPath = points.length > 0 
      ? `${linePath} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`
      : '';

    return (
      <svg viewBox={`0 0 ${width} ${height}`} className="chart-svg-container" style={{ width: '100%' }}>
        <defs>
          <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
          const y = padding + r * (height - padding * 2);
          const gridVal = maxVal - r * (maxVal - minVal);
          return (
            <g key={i}>
              <line x1={padding} y1={y} x2={width - padding} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
              <text x={padding - 5} y={y + 4} fill="var(--text-muted)" fontSize={8} textAnchor="end">
                ${gridVal.toFixed(0)}
              </text>
            </g>
          );
        })}

        {/* Areas & Lines */}
        {areaPath && <path d={areaPath} fill="url(#chartGradient)" />}
        {linePath && <path d={linePath} fill="none" stroke="var(--primary)" strokeWidth={2.5} />}

        {/* Scatter Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="#fff" stroke="var(--primary)" strokeWidth={2} />
            {/* Minimal tooltips using SVG titles */}
            <title>{`Shop ${i + 1}: saved $${p.data.AmountSaved.toFixed(2)} (${p.data.Store})`}</title>
            <text x={p.x} y={p.y - 8} fill="var(--text-primary)" fontSize={8} fontWeight="bold" textAnchor="middle">
              ${p.data.CumulativeSavings.toFixed(0)}
            </text>
          </g>
        ))}
      </svg>
    );
  };

  return (
    <div className="view-section animate-fade-in">
      {/* Metric widgets */}
      <div className="analytics-grid">
        <div className="glass-panel analytic-metric-card">
          <span className="metric-label">Cumulative Savings</span>
          <span className="metric-value" style={{ color: 'var(--success)' }}>
            ${savingsStats.cumulativeSavings.toFixed(2)}
          </span>
        </div>
        <div className="glass-panel analytic-metric-card">
          <span className="metric-label">Total spent</span>
          <span className="metric-value">${savingsStats.totalSpent.toFixed(2)}</span>
        </div>
        <div className="glass-panel analytic-metric-card">
          <span className="metric-label">Average savings</span>
          <span className="metric-value">${savingsStats.averageSavings.toFixed(2)}</span>
        </div>
        <div className="glass-panel analytic-metric-card">
          <span className="metric-label">Grocery trips</span>
          <span className="metric-value">{savingsStats.totalShops}</span>
        </div>
      </div>

      {/* Savings SVG Line Chart */}
      {savingsStats.history.length > 0 && (
        <div className="glass-panel chart-card">
          <div className="chart-header">
            <div>
              <h3 style={{ fontSize: '1.1rem' }}>Savings Progression</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Log of money saved over successive shops</p>
            </div>
            <span className="badge badge-success">Flybuys & Rewards Optimized</span>
          </div>
          {renderSavingsChart()}
        </div>
      )}

      {/* Savings History Logs Table */}
      <div className="glass-panel breakdown-card">
        <h3 style={{ fontSize: '1.1rem', marginBottom: '16px' }}>Historical Savings Log</h3>
        <div className="breakdown-table-wrapper">
          <table className="breakdown-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Store Visited</th>
                <th>Total Spent</th>
                <th>Money Saved</th>
              </tr>
            </thead>
            <tbody>
              {savingsStats.history.slice().reverse().map((log, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 600 }}>{log.Date}</td>
                  <td>
                    <span className={`badge ${log.Store === 'Coles' ? 'badge-special' : (log.Store === 'Woolworths' ? 'badge-success' : 'badge-warning')}`} style={{ fontSize: '0.7rem' }}>
                      {log.Store}
                    </span>
                  </td>
                  <td>${log.TotalSpent.toFixed(2)}</td>
                  <td className="best-price-highlight">+${log.AmountSaved.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
