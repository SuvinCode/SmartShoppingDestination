import React, { useState, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  ScanLine, 
  RefreshCw, 
  ShoppingBag, 
  Trophy, 
  MapPin, 
  AlertTriangle, 
  Receipt, 
  Navigation 
} from 'lucide-react';
import { API_URL } from '../App';

export default function OptimizeBasketTab({
  shoppingList,
  comparison,
  uploadedFiles,
  ocrLoading,
  loading,
  scannedReceipts,
  storeRecommendations,
  preferences,
  handleAddItem,
  handleUpdateQty,
  handleDeleteItem,
  handleClearList,
  handleFileChange,
  handleRemoveFile,
  handleScanDocuments,
  handleToggleLoyalty,
  handleCheckout,
  getStoreDisplayName,
  getStoreAddress,
  user,
  hasScannedReceipt
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const fileInputRef = useRef(null);

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

  const localCatalog = [
    { Name: 'Penne Pasta', Category: 'Pasta', PackageSize: '500g' },
    { Name: 'De Cecco Spaghetti', Category: 'Pasta', PackageSize: '500g' },
    { Name: 'Fresh Full Cream Milk', Category: 'Milk', PackageSize: '2L' },
    { Name: 'Devondale UHT Full Cream Milk', Category: 'Milk', PackageSize: '1L' },
    { Name: 'Cadbury Dairy Milk Chocolate Block', Category: 'Chocolate', PackageSize: '180g' },
    { Name: 'Heinz Baked Beans', Category: 'Beans', PackageSize: '220g' },
    { Name: 'Morning Fresh Dishwashing Liquid', Category: 'Dishwashing', PackageSize: '900ml' },
    { Name: 'Bulla Cream Classic Vanilla Ice Cream', Category: 'Ice Cream', PackageSize: '2L' },
    { Name: 'White Toast Bread', Category: 'Bread', PackageSize: '650g' },
    { Name: 'Helga\'s Traditional Wholemeal Bread', Category: 'Bread', PackageSize: '750g' },
    { Name: 'Western Star Butter Block Salted', Category: 'Butter', PackageSize: '250g' },
    { Name: 'Bega Tasty Cheese Block', Category: 'Cheese', PackageSize: '500g' },
    { Name: 'Australian Red Gala Apples', Category: 'Produce', PackageSize: '1kg' },
    { Name: 'Cavendish Bananas', Category: 'Produce', PackageSize: '1kg' }
  ];

  const handleSearchChange = async (e) => {
    const val = e.target.value;
    setSearchQuery(val);
    if (!val.trim()) {
      setAutocompleteResults([]);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/catalog/search?q=${encodeURIComponent(val)}`);
      if (!response.ok) throw new Error();
      const data = await response.json();
      setAutocompleteResults(data);
    } catch {
      const filtered = localCatalog.filter(item => 
        item.Name.toLowerCase().includes(val.toLowerCase()) || 
        item.Category.toLowerCase().includes(val.toLowerCase())
      ).slice(0, 5);
      
      setAutocompleteResults(filtered.map(f => ({ name: f.Name, category: f.Category, packageSize: f.PackageSize })));
    }
  };

  const onSelectItem = (name, packageSize) => {
    handleAddItem(name, packageSize);
    setSearchQuery('');
    setAutocompleteResults([]);
  };

  const hasItems = shoppingList.length > 0;
  const isDemo = user?.username?.toLowerCase() === 'demo';
  const showComparisonPanel = hasItems && !(isDemo && !hasScannedReceipt);

  return (
    <div className="view-section compare-grid" style={!showComparisonPanel ? { gridTemplateColumns: '1fr' } : {}}>
      {/* LEFT COLUMN: List Builder Wrapper */}
      <div className="left-column-wrapper animate-slide-up" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div className="glass-panel builder-card" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontWeight: 600 }}>Build Shopping List</span>
            {preferences?.homeAddress && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 400, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <MapPin size={12} style={{ color: 'var(--blue-500)' }} />
                Location: {preferences.homeAddress} ({preferences.region || 'Melbourne'})
              </span>
            )}
          </h3>
          
          {/* Autocomplete Input */}
          <div className="search-box-wrapper">
            <input 
              type="text" 
              className="glass-input" 
              placeholder="Search grocery item (e.g. Milk, Pasta)"
              value={searchQuery}
              onChange={handleSearchChange}
              style={{ width: '100%', paddingRight: '40px' }}
            />
            <Plus size={18} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />

            {autocompleteResults.length > 0 && (
              <div className="autocomplete-dropdown">
                {autocompleteResults.map((item, idx) => (
                  <div 
                    key={idx} 
                    className="autocomplete-item"
                    onClick={() => onSelectItem(item.name, item.packageSize)}
                  >
                    <span className="autocomplete-item-name">{item.name}</span>
                    {item.packageSize && <span className="autocomplete-item-size">{item.packageSize}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Shopping List Items */}
          <div className="shopping-list">
            {shoppingList.length > 0 ? (
              shoppingList.map((item) => (
                <div key={item.id} className="list-item">
                  <div className="list-item-left">
                    <span className="list-item-name">{item.itemName}</span>
                    {item.packageSize && <span className="list-item-size">({item.packageSize})</span>}
                  </div>
                  
                  <div className="list-item-right">
                    <div className="qty-controls">
                      <button className="qty-btn" onClick={() => handleUpdateQty(item.id, item.quantity - 1)}>-</button>
                      <span className="qty-value">{item.quantity}</span>
                      <button className="qty-btn" onClick={() => handleUpdateQty(item.id, item.quantity + 1)}>+</button>
                    </div>
                    <Trash2 className="delete-btn" size={16} onClick={() => handleDeleteItem(item.id)} />
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '30px 10px', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', border: '1px dashed var(--border-glass)', borderRadius: '10px' }}>
                Your list is currently empty.
              </div>
            )}
          </div>

          {shoppingList.length > 0 && (
            <button className="btn btn-secondary" onClick={handleClearList} style={{ width: '100%', fontSize: '0.85rem' }}>
              Clear Active List
            </button>
          )}

          {/* OCR Image Upload Dropzone */}
          <div className="ocr-dropzone">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              multiple
              style={{ display: 'none' }} 
            />
            
            {ocrLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <RefreshCw size={24} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite' }} />
                <span style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>AI OCR Scanning Receipts...</span>
              </div>
            ) : (
              <>
                <div onClick={() => fileInputRef.current && fileInputRef.current.click()} style={{ width: '100%', cursor: 'pointer' }}>
                  <ScanLine size={24} style={{ color: 'var(--primary)', marginBottom: '4px' }} />
                  <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>+ Upload Receipts</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Select multiple receipt images or documents</div>
                </div>
              </>
            )}
          </div>

          {/* Scan Actions & Queue */}
          <div className="scan-actions-container" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {uploadedFiles.length > 0 && !ocrLoading && (
              <div className="uploaded-files-queue glass-panel animate-slide-up" style={{ padding: '12px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '8px' }}>
                  Scan Queue ({uploadedFiles.length} file{uploadedFiles.length > 1 ? 's' : ''})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                  {uploadedFiles.map((file, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', background: 'rgba(255,255,255,0.03)', padding: '6px 8px', borderRadius: '4px' }}>
                      <span style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', maxWidth: '80%' }}>{file.name}</span>
                      <Trash2 
                        size={14} 
                        style={{ color: 'var(--danger)', cursor: 'pointer' }} 
                        onClick={() => handleRemoveFile(idx)} 
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button 
              className="btn btn-primary" 
              onClick={handleScanDocuments} 
              disabled={ocrLoading || uploadedFiles.length === 0}
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontWeight: 700 }}
            >
              <RefreshCw size={14} className={ocrLoading ? "animate-spin" : ""} /> 
              {ocrLoading ? "Scanning..." : "Scan Documents"}
            </button>
          </div>

          {/* Loyalty card memberships */}
          {(hasScannedReceipt || uploadedFiles.length > 0 || scannedReceipts.length > 0) && (
            <div className="loyalty-sync-box" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <span className="loyalty-title" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)' }}>Loyalty Memberships</span>
              <div className="checkbox-group" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input 
                    type="checkbox" 
                    checked={preferences.hasFlybuys || false} 
                    onChange={() => handleToggleLoyalty('hasFlybuys')}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Coles Flybuys (0.5% rebate + bonus points)</span>
                </label>
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem' }}>
                  <input 
                    type="checkbox" 
                    checked={preferences.hasEverydayRewards || false} 
                    onChange={() => handleToggleLoyalty('hasEverydayRewards')}
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                  />
                  <span>Everyday Rewards (0.5% rebate + bonus points)</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Recommendations Box */}
        {(hasScannedReceipt || scannedReceipts.length > 0) && storeRecommendations && (
          <div className="glass-panel recommendations-box animate-slide-up" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
              <Trophy size={18} style={{ color: 'var(--blue-600)' }} />
              <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--primary)' }}>Recommendations</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {renderCategoryCard(storeRecommendations.cheapestWeighted, "Cheapest Shop (Recurring)", "🏆", "var(--success)")}
              {renderCategoryCard(storeRecommendations.cheapestUnweighted, "Cheapest Overall (Average)", "💰", "var(--blue-500)")}
              {renderCategoryCard(storeRecommendations.nearestStore, "Nearest Shop", "📍", "var(--purple-500)")}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Comparison Engine Panel */}
      {showComparisonPanel && (
        <div className="comparison-panel animate-slide-up">
          {comparison ? (
            <>
              {/* Hero Savings Recommendation Banner */}
              <div className="glass-panel recommendation-banner">
                <div>
                  <span className="rec-badge">Recommended Shop</span>
                  <h2 className="rec-title">
                    Shop <span className="rec-savings">{getStoreDisplayName(comparison.winnerStore)}</span> this week
                  </h2>
                  <p className="rec-split-highlight">
                    You'll save <strong style={{ color: 'var(--success)' }}>${comparison.singleStoreSavings.toFixed(2)}</strong> this week by shopping here.
                  </p>
                </div>
                <button className="btn btn-primary" onClick={handleCheckout} disabled={loading} style={{ padding: '14px 24px' }}>
                  Checkout & Log Savings
                </button>
              </div>
  
              {/* Store cards grid */}
              <div className="store-options-grid">
                {/* Coles option */}
                <div className={`store-option-card ${comparison.winnerStore === 'Coles' ? 'winner' : ''}`}>
                  <div className="store-option-header">
                    <span className="store-option-name" style={{ color: 'var(--primary)' }}>{getStoreDisplayName('Coles')}</span>
                    {comparison.winnerStore === 'Coles' && <span className="badge badge-success">Cheapest</span>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <MapPin size={10} /> {getStoreAddress('Coles')}
                  </div>
                  <div className="store-option-total">${comparison.coles.adjustedTotal.toFixed(2)}</div>
                  <div className="store-option-breakdown">
                    <div className="breakdown-row">
                      <span>Shelf Items Total</span>
                      <span>${comparison.coles.shelfTotal.toFixed(2)}</span>
                    </div>
                    <div className="breakdown-row">
                      <span>Travel/Fuel cost</span>
                      <span>+${comparison.coles.fuelAdjustment.toFixed(2)}</span>
                    </div>
                    <div className="breakdown-row">
                      <span>Flybuys points value</span>
                      <span style={{ color: 'var(--success)' }}>-${comparison.coles.rewardsValue.toFixed(2)}</span>
                    </div>
                    <div className="breakdown-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '4px' }}>
                      <span>Out-of-stock risk</span>
                      <span className={comparison.coles.stockRiskPercentage > 10 ? 'stock-risk-indicator' : ''}>
                        {comparison.coles.stockRiskPercentage > 10 && <AlertTriangle size={10} />}
                        {comparison.coles.stockRiskPercentage}%
                      </span>
                    </div>
                  </div>
                </div>
  
                {/* Woolworths option */}
                <div className={`store-option-card ${comparison.winnerStore === 'Woolworths' ? 'winner' : ''}`}>
                  <div className="store-option-header">
                    <span className="store-option-name" style={{ color: 'var(--primary)' }}>{getStoreDisplayName('Woolworths')}</span>
                    {comparison.winnerStore === 'Woolworths' && <span className="badge badge-success">Cheapest</span>}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '6px' }}>
                    <MapPin size={10} /> {getStoreAddress('Woolworths')}
                  </div>
                  <div className="store-option-total">${comparison.woolworths.adjustedTotal.toFixed(2)}</div>
                  <div className="store-option-breakdown">
                    <div className="breakdown-row">
                      <span>Shelf Items Total</span>
                      <span>${comparison.woolworths.shelfTotal.toFixed(2)}</span>
                    </div>
                    <div className="breakdown-row">
                      <span>Travel/Fuel cost</span>
                      <span>+${comparison.woolworths.fuelAdjustment.toFixed(2)}</span>
                    </div>
                    <div className="breakdown-row">
                      <span>Rewards points value</span>
                      <span style={{ color: 'var(--success)' }}>-${comparison.woolworths.rewardsValue.toFixed(2)}</span>
                    </div>
                    <div className="breakdown-row" style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '6px', marginTop: '4px' }}>
                      <span>Out-of-stock risk</span>
                      <span className={comparison.woolworths.stockRiskPercentage > 10 ? 'stock-risk-indicator' : ''}>
                        {comparison.woolworths.stockRiskPercentage > 10 && <AlertTriangle size={10} />}
                        {comparison.woolworths.stockRiskPercentage}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
  
              {/* Item-by-item comparison table */}
              <div className="glass-panel breakdown-card">
                <h3 style={{ fontSize: '1rem', marginBottom: '16px' }}>Itemized Comparison Details</h3>
                <div className="breakdown-table-wrapper">
                  <table className="breakdown-table">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>{getStoreDisplayName('Coles')}</th>
                        <th>{getStoreDisplayName('Woolworths')}</th>
                        <th>Stock Reliability</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shoppingList.map((item, idx) => {
                        const cItem = comparison.coles.basketItems[idx];
                        const wItem = comparison.woolworths.basketItems[idx];
                        if (!cItem || !wItem) return null;
  
                        const cMatched = cItem.matchedItem || cItem.MatchedItem || {};
                        const wMatched = wItem.matchedItem || wItem.MatchedItem || {};
  
                        const colesPrice = cMatched.shelfPrice || 0;
                        const wooliesPrice = wMatched.shelfPrice || 0;
                        
                        const colesCheaper = colesPrice <= wooliesPrice;
                        const wooliesCheaper = wooliesPrice < colesPrice;
  
                        const cIsSpecial = cItem.isSpecial || cItem.IsSpecial;
                        const wIsSpecial = wItem.isSpecial || wItem.IsSpecial;
  
                        const cStockRisk = cMatched.outOfStockProbability || 0;
                        const wStockRisk = wMatched.outOfStockProbability || 0;
  
                        return (
                          <tr key={idx}>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: 600 }}>{item.itemName}</span>
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                  Qty: {item.quantity} | {cMatched.packageSize || 'ea'}
                                </span>
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span className={colesCheaper ? 'best-price-highlight' : ''}>
                                  ${(colesPrice * item.quantity).toFixed(2)}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  (${colesPrice.toFixed(2)} ea)
                                </span>
                                {cIsSpecial && <span className="badge badge-special" style={{ fontSize: '0.6rem', padding: '2px 4px', width: 'fit-content' }}>Special</span>}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span className={wooliesCheaper ? 'best-price-highlight' : ''}>
                                  ${(wooliesPrice * item.quantity).toFixed(2)}
                                </span>
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  (${wooliesPrice.toFixed(2)} ea)
                                </span>
                                {wIsSpecial && <span className="badge badge-special" style={{ fontSize: '0.6rem', padding: '2px 4px', width: 'fit-content' }}>Special</span>}
                              </div>
                            </td>
                            <td>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ fontSize: '0.8rem' }}>
                                  C: {Math.round((1 - cStockRisk) * 100)}% | W: {Math.round((1 - wStockRisk) * 100)}%
                                </div>
                                {((cIsSpecial && cStockRisk > 0.1) || (wIsSpecial && wStockRisk > 0.1)) && (
                                  <span className="stock-risk-indicator" style={{ fontSize: '0.68rem' }}>
                                    <AlertTriangle size={10} /> Special stock risk
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
  
              {/* Scanned Receipts Summary */}
              {scannedReceipts.length > 0 && (
                <div className="glass-panel breakdown-card" style={{ marginTop: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Receipt size={18} style={{ color: 'var(--blue-600)' }} />
                    <h3 style={{ margin: 0, fontSize: '1rem' }}>Scanned Receipts</h3>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {scannedReceipts.map((receipt) => (
                      <div key={receipt.id} className="glass-panel" style={{ padding: '12px', border: '1px solid var(--border-glass)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <MapPin size={14} style={{ color: 'var(--blue-500)' }} />
                            <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{receipt.storeDisplayName}</span>
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '1rem' }}>${(receipt.receiptTotal || 0).toFixed(2)}</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {receipt.items.map((item, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--text-muted)', padding: '2px 0' }}>
                              <span>{item.itemName} {item.quantity > 1 ? `x${item.quantity}` : ''}</span>
                              <span>${(item.totalPrice || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '16px' }}>
              <RefreshCw size={24} className="animate-spin" style={{ animation: 'spin 1.5s linear infinite', color: 'var(--primary)' }} />
              <div>
                <h3 style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '4px' }}>Calculating savings...</h3>
                <p style={{ fontSize: '0.9rem' }}>Fetching the latest price comparisons</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
