import React from 'react';
import { 
  RefreshCw, 
  Sparkles, 
  Trophy, 
  Star, 
  MapPin, 
  Navigation 
} from 'lucide-react';

export default function ComparisonTab({
  recommendationsLoading,
  storeRecommendations,
  loadStoreRecommendations,
  getStoreDisplayName,
  getStoreAddress,
  preferences
}) {
  const renderCategoryCard = (rec, title, emoji, themeColor) => {
    if (!rec || !rec.storeName) return null;
    return (
      <div className="category-rec-card glass-panel animate-slide-up" style={{ borderLeft: `4px solid ${themeColor}`, padding: '12px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1rem' }}>{emoji}</span>
              <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{title}</span>
            </div>
            <h4 style={{ margin: '4px 0 0 0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--primary)' }}>
              {getStoreDisplayName(rec.storeName)}
            </h4>
          </div>
          <span className="savings-chip" style={{ background: 'rgba(59,130,246,0.1)', color: 'var(--blue-500)', fontSize: '0.75rem', padding: '3px 6px', borderRadius: '4px', fontWeight: 700, whiteSpace: 'nowrap' }}>
            {rec.metricValue}
          </span>
        </div>
        
        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-charcoal)', lineHeight: '1.4' }}>
          {rec.explanation}
        </p>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <MapPin size={10} style={{ color: 'var(--blue-500)', flexShrink: 0 }} />
            <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{getStoreAddress(rec.storeName)}</span>
          </div>
        </div>

        {rec.winningProducts && rec.winningProducts.length > 0 && (
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Cheapest Items:</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {rec.winningProducts.slice(0, 3).map(p => (
                <span key={p} className="product-win-tag" style={{ fontSize: '0.65rem', padding: '1px 4px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', border: '1px solid var(--border-glass)' }}>{p}</span>
              ))}
              {rec.winningProducts.length > 3 && (
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>+{rec.winningProducts.length - 3} more</span>
              )}
            </div>
          </div>
        )}

        <a 
          className="btn btn-secondary" 
          target="_blank" 
          rel="noopener noreferrer"
          href={`https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(preferences.homeAddress || 'Richmond VIC')}&destination=${encodeURIComponent(getStoreDisplayName(rec.storeName) + ', ' + getStoreAddress(rec.storeName))}`}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '5px 0', fontSize: '0.75rem', textDecoration: 'none', marginTop: '4px' }}
        >
          <Navigation size={10} /> View in Google Maps
        </a>
      </div>
    );
  };

  return (
    <div className="view-section animate-fade-in">
      {recommendationsLoading ? (
        <div style={{ textAlign: 'center', padding: '60px', color: 'var(--text-muted)' }}>
          <RefreshCw size={32} style={{ animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '12px' }}>Running store analysis…</p>
        </div>
      ) : storeRecommendations ? (
        <div className="recommendations-tab">

          {/* Trade-Off Banner */}
          {storeRecommendations.tradeOffNarrative && (
            <div className="tradeoff-banner glass-panel animate-slide-up">
              <Sparkles size={20} style={{ color: 'var(--blue-600)', flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--blue-700)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Smart Trade-Off Analysis</div>
                <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-charcoal)' }}>{storeRecommendations.tradeOffNarrative}</p>
              </div>
            </div>
          )}

          {/* Itemized Price Comparison Table for Recommended Shops */}
          {storeRecommendations.itemComparisons && storeRecommendations.itemComparisons.length > 0 ? (
            <div className="glass-panel breakdown-card" style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Itemized Comparison</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Price comparison for your most-purchased items across all recommended stores. Cheapest price per item is highlighted.
              </p>
              <div className="breakdown-table-wrapper">
                <table className="breakdown-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      {storeRecommendations.topByWeightedSavings.map(s => (
                        <th key={s.storeName}>{getStoreDisplayName(s.storeName)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {storeRecommendations.itemComparisons.map((item, idx) => {
                      const cheapest = item.cheapestStore;
                      return (
                        <tr key={idx}>
                          <td>
                            <span style={{ fontWeight: 600 }}>{item.productName}</span>
                          </td>
                          {storeRecommendations.topByWeightedSavings.map(s => {
                            const priceData = item.storePrices?.[s.storeName];
                            const isCheapest = s.storeName === cheapest;
                            return (
                              <td key={s.storeName}>
                                {priceData ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    <span className={isCheapest ? 'best-price-highlight' : ''}>
                                      ${priceData.price.toFixed(2)}
                                    </span>
                                    {priceData.packageSize && (
                                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
                                        {priceData.packageSize}
                                      </span>
                                    )}
                                    {priceData.isSpecial && (
                                      <span className="badge badge-special" style={{ fontSize: '0.6rem', padding: '2px 4px', width: 'fit-content' }}>
                                        {priceData.specialDetails || 'Special'}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>—</span>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="glass-panel breakdown-card" style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Itemized Comparison</h3>
              <div className="breakdown-table-wrapper">
                <table className="breakdown-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      {storeRecommendations.topByWeightedSavings.map(s => (
                        <th key={s.storeName}>{getStoreDisplayName(s.storeName)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {storeRecommendations.productRankings.slice(0, 8).map((p, idx) => {
                      const storeNames = storeRecommendations.topByWeightedSavings.map(s => s.storeName);
                      return (
                        <tr key={idx}>
                          <td><span style={{ fontWeight: 600 }}>{p.productName}</span></td>
                          {storeNames.map(sn => {
                            const isWinner = storeRecommendations.topByWeightedSavings
                              .find(s => s.storeName === sn)?.winningProducts
                              ?.some(wp => wp.toLowerCase().includes(p.productName.toLowerCase().split(' ')[0]));
                            return (
                              <td key={sn}>
                                <span className={isWinner ? 'best-price-highlight' : ''} style={{ fontSize: '0.82rem' }}>
                                  {isWinner ? 'Best' : '—'}
                                </span>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Product Rankings breakdown */}
          <div className="glass-panel" style={{ marginTop: '24px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <Star size={18} style={{ color: 'var(--blue-600)' }} />
              <h3 style={{ margin: 0, fontSize: '1rem' }}>Your Product Purchase Rankings</h3>
            </div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
              Based on your shopping history. Equal frequency = same rank. Rank 1 drives the recommendation most.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {storeRecommendations.productRankings.slice(0, 8).map(p => (
                <div key={p.productName} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--blue-50)', borderRadius: '8px', border: '1px solid var(--divider)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className={`rank-badge rank-badge--${Math.min(p.rank, 5)}`}>#{p.rank}</span>
                    <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-charcoal)' }}>{p.productName}</span>
                  </div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{p.occurrences} purchase{p.occurrences !== 1 ? 's' : ''}</span>
                </div>
              ))}
            </div>
            <button
              className="btn btn-secondary"
              style={{ marginTop: '16px', fontSize: '0.85rem', height: '36px', padding: '0 16px' }}
              onClick={loadStoreRecommendations}
              disabled={recommendationsLoading}
            >
              <RefreshCw size={14} /> Refresh Analysis
            </button>
          </div>

        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: '80px', color: 'var(--text-muted)' }}>
          <Trophy size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
          <p>Upload receipts to generate your personalised store ranking.</p>
        </div>
      )}
    </div>
  );
}
