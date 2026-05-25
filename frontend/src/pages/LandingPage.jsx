import React, { useState } from 'react';
import './LandingPage.css';
import { 
  ScanLine, 
  Sparkles, 
  Shuffle, 
  TrendingUp, 
  MapPin, 
  CreditCard, 
  ArrowRight,
  ShieldCheck,
  Zap
} from 'lucide-react';

function LandingPage({ user, onNavigate, onLogout }) {
  // Interactive Demo State
  const [selectedItems, setSelectedItems] = useState([1, 2, 3]); // IDs of checked items

  const demoCatalog = [
    { id: 1, name: 'Devondale UHT Milk 1L', category: 'Milk', colesPrice: 2.00, wooliesPrice: 2.40, colesSpecial: true, wooliesSpecial: false },
    { id: 2, name: 'Cadbury Dairy Milk 180g', category: 'Chocolate', colesPrice: 6.00, wooliesPrice: 3.00, colesSpecial: false, wooliesSpecial: true },
    { id: 3, name: 'De Cecco Spaghetti 500g', category: 'Pasta', colesPrice: 4.50, wooliesPrice: 4.80, colesSpecial: false, wooliesSpecial: false }
  ];

  const handleToggleItem = (id) => {
    if (selectedItems.includes(id)) {
      setSelectedItems(selectedItems.filter(item => item !== id));
    } else {
      setSelectedItems([...selectedItems, id]);
    }
  };

  // Calculations based on checked items
  const activeItems = demoCatalog.filter(item => selectedItems.includes(item.id));
  const colesTotal = activeItems.reduce((acc, item) => acc + item.colesPrice, 0);
  const wooliesTotal = activeItems.reduce((acc, item) => acc + item.wooliesPrice, 0);
  
  // Split total takes the cheapest price for each item
  const splitTotal = activeItems.reduce((acc, item) => acc + Math.min(item.colesPrice, item.wooliesPrice), 0);

  // Winner logic
  let winner = "None";
  let savings = 0;
  let splitExtra = 0;

  if (activeItems.length > 0) {
    if (colesTotal <= wooliesTotal) {
      winner = "Coles";
      savings = wooliesTotal - colesTotal;
      splitExtra = colesTotal - splitTotal;
    } else {
      winner = "Woolworths";
      savings = colesTotal - wooliesTotal;
      splitExtra = wooliesTotal - splitTotal;
    }
  }

  return (
    <div className="landing-container">
      <div className="container">
        {/* Navbar */}
        <header className="navbar">
          <div className="logo">
            Docket<span className="logo-dot"></span>
          </div>
          
          <ul className="nav-links">
            <li><a href="#features">Features</a></li>
            <li><a href="#demo">Try Demo</a></li>
            <li><a href="https://www.coles.com.au" target="_blank" rel="noreferrer">Coles Catalog</a></li>
            <li><a href="https://www.woolworths.com.au" target="_blank" rel="noreferrer">Woolies Catalog</a></li>
          </ul>

          <div style={{ display: 'flex', gap: '12px' }}>
            {user ? (
              <>
                <button className="btn btn-secondary" onClick={() => onNavigate('dashboard')}>
                  Go to Dashboard
                </button>
                <button className="btn btn-secondary" onClick={onLogout}>
                  Logout ({user.username})
                </button>
              </>
            ) : (
              <>
                <button className="btn btn-secondary" onClick={() => onNavigate('login')}>
                  Sign In
                </button>
                <button className="btn btn-primary" onClick={() => onNavigate('signup')}>
                  Get Started
                </button>
              </>
            )}
          </div>
        </header>

        {/* Hero Section */}
        <section className="hero">
          <div className="hero-tag">
            <span className="hero-tag-dot"></span>
            <span>Australian Grocery Price Optimizer</span>
          </div>
          <h1 className="hero-title text-gradient">
            Stop Overpaying on Groceries.<br />
            Let AI Optimize Your Basket.
          </h1>
          <p className="hero-subtitle">
            Docket automatically compares prices between Coles and Woolworths, indexes weekly specials, extracts receipt data, and computes optimal split-shopping recommendations to maximize your weekly savings.
          </p>
          <div className="hero-ctas">
            {user ? (
              <button className="btn btn-primary btn-lg" onClick={() => onNavigate('dashboard')}>
                Enter Dashboard <ArrowRight size={18} />
              </button>
            ) : (
              <>
                <button className="btn btn-primary btn-lg" onClick={() => onNavigate('signup')}>
                  Create Free Account <ArrowRight size={18} />
                </button>
                <button className="btn btn-secondary btn-lg" onClick={() => {
                  // Pre-fill login credentials or login with demo
                  onNavigate('login');
                }}>
                  Try Demo Account
                </button>
              </>
            )}
          </div>
        </section>

        {/* Interactive Demo Widget */}
        <section id="demo" className="demo-section">
          <h2 className="demo-title text-gradient">Compare Prices in Real-Time</h2>
          <p className="demo-subtitle">Select items to simulate Coles vs. Woolworths checkout baskets</p>
          
          <div className="demo-grid">
            {/* Left Card: Items */}
            <div className="glass-panel demo-card">
              <div className="demo-card-title">
                <span>Select Shopping Basket</span>
                <span className="badge badge-success">{selectedItems.length} Items</span>
              </div>
              
              <div className="demo-items-list">
                {demoCatalog.map(item => (
                  <div key={item.id} className="demo-item">
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <input 
                        type="checkbox" 
                        id={`demo-chk-${item.id}`}
                        checked={selectedItems.includes(item.id)}
                        onChange={() => handleToggleItem(item.id)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <div className="demo-item-info">
                        <span className="demo-item-name">{item.name}</span>
                        <span className="demo-item-size">{item.category}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                      {item.colesSpecial && <span className="badge badge-special">Coles 1/2 Price</span>}
                      {item.wooliesSpecial && <span className="badge badge-special">Woolies Special</span>}
                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        C: ${item.colesPrice.toFixed(2)} | W: ${item.wooliesPrice.toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                *Specials are simulated from current Coles and Woolworths catalogue deals.
              </p>
            </div>

            {/* Right Card: Results */}
            <div className="demo-results-panel">
              {activeItems.length > 0 ? (
                <>
                  <div className="demo-winner-banner animate-fade-in">
                    <span className="demo-winner-title">Recommended Store</span>
                    <span className="demo-winner-amount">{winner} is Cheaper!</span>
                    <span style={{ color: 'var(--text-charcoal)', fontSize: '0.95rem' }}>
                      You'll save <strong style={{ color: 'var(--success)' }}>${savings.toFixed(2)}</strong> this week.
                    </span>
                  </div>

                  <div className="demo-store-comparison">
                    <div className="demo-store-card coles">
                      <div className="demo-store-name">Coles Basket</div>
                      <div className="demo-store-price">${colesTotal.toFixed(2)}</div>
                    </div>
                    <div className="demo-store-card woolies">
                      <div className="demo-store-name">Woolworths Basket</div>
                      <div className="demo-store-price">${wooliesTotal.toFixed(2)}</div>
                    </div>
                  </div>

                  <div className="demo-split-box">
                    <div className="demo-split-info">
                      <span className="demo-split-title">💡 Split Shopping Recommendation</span>
                      <span className="demo-split-desc">Visit both stores (split items by cheapest)</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="demo-split-price">${splitTotal.toFixed(2)}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 'bold' }}>
                        You'll save an extra ${splitExtra.toFixed(2)}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Check some items in the basket to see savings analysis!
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="features-section">
          <h2 className="features-title text-gradient">Optimized Grocery Intelligence</h2>
          <p className="features-subtitle">Designed to remove input friction and maximize household budgets</p>
          
          <div className="features-grid">
            <div className="glass-panel feature-item-card">
              <div className="feature-icon-wrapper">
                <ScanLine size={24} />
              </div>
              <h3 className="feature-item-title">Receipt OCR Upload</h3>
              <p className="feature-item-desc">
                Simply take a photo of your Coles or Woolworths receipt. Our Python AI service processes the image, extracts the text, and populates your default shopping list instantly.
              </p>
            </div>

            <div className="glass-panel feature-item-card">
              <div className="feature-icon-wrapper">
                <Shuffle size={24} />
              </div>
              <h3 className="feature-item-title">Smart Split-Shopping</h3>
              <p className="feature-item-desc">
                Visiting two stores can increase savings. Docket calculates exactly which items to buy where and only suggests it if the extra savings exceed your fuel and travel costs.
              </p>
            </div>

            <div className="glass-panel feature-item-card">
              <div className="feature-icon-wrapper">
                <TrendingUp size={24} />
              </div>
              <h3 className="feature-item-title">Savings Tracking</h3>
              <p className="feature-item-desc">
                Visualize your shopping habits and watch your cumulative savings grow. Keep track of average savings per shop, total money spent, and log savings history.
              </p>
            </div>

            <div className="glass-panel feature-item-card">
              <div className="feature-icon-wrapper">
                <CreditCard size={24} />
              </div>
              <h3 className="feature-item-title">Rewards Valuation</h3>
              <p className="feature-item-desc">
                Factors in Flybuys and Everyday Rewards card memberships. Points are converted to cash values and deducted from basket estimates, ensuring optimal rewards optimization.
              </p>
            </div>
          </div>
        </section>

        {/* Call to action */}
        <section style={{ textAlign: 'center', padding: '60px 0 100px 0' }}>
          <h2 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '20px' }}>Start Saving on Groceries Today</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px auto' }}>
            Create an account in 10 seconds, input your shopping list manually or with a receipt upload, and get an optimized route to save.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => onNavigate('signup')}>
            Sign Up Now Free <ArrowRight size={18} />
          </button>
        </section>

        {/* Footer */}
        <footer className="footer">
          <p>© {new Date().getFullYear()} Docket Grocery Optimizer. Built with React, C#, and Python.</p>
        </footer>
      </div>
    </div>
  );
}

export default LandingPage;
