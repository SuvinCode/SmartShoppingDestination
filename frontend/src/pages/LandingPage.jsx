import React, { useState } from 'react';
import { motion } from 'framer-motion';
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
  Zap,
  Receipt,
  UserPlus,
  UploadCloud,
  ListPlus,
  Sliders,
  Navigation,
  Sun,
  Moon
} from 'lucide-react';

import Logo from '../components/Logo';
import Footer from '../components/Footer';

function LandingPage({ user, onNavigate, onLogout, onDemoLogin, theme, setTheme }) {
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

  // Animation Variants
  const navContainerVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 80,
        damping: 15,
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const navItemVariants = {
    hidden: { opacity: 0, y: -10 },
    visible: { opacity: 1, y: 0 }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.12,
        delayChildren: 0.2
      }
    }
  };

  const fadeUpVariants = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 90, damping: 14 }
    }
  };

  const gridVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: 'spring', stiffness: 80, damping: 15 }
    }
  };

  return (
    <div className="landing-container">
      <div className="container">
        {/* Navbar */}
        <motion.header 
          className="navbar"
          variants={navContainerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            className="logo" 
            style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
            variants={navItemVariants}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.98 }}
          >
            <Logo size={28} />
            <span>Docket</span>
          </motion.div>
          
          <ul className="nav-links">
            <motion.li variants={navItemVariants}>
              <motion.a href="#features" whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>Features</motion.a>
            </motion.li>
            <motion.li variants={navItemVariants}>
              <motion.a href="#how-to-use" whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>How to Use</motion.a>
            </motion.li>
            <motion.li variants={navItemVariants}>
              <motion.a href="#" onClick={(e) => { e.preventDefault(); onDemoLogin(); }} whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>Try Demo</motion.a>
            </motion.li>
            <motion.li variants={navItemVariants}>
              <motion.a href="https://www.coles.com.au" target="_blank" rel="noreferrer" whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>Coles Catalog</motion.a>
            </motion.li>
            <motion.li variants={navItemVariants}>
              <motion.a href="https://www.woolworths.com.au" target="_blank" rel="noreferrer" whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>Woolies Catalog</motion.a>
            </motion.li>
          </ul>

          <motion.div className="navbar-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center' }} variants={navItemVariants}>
            {user ? (
              <>
                <motion.button 
                  className="btn btn-secondary" 
                  onClick={() => onNavigate('dashboard')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Go to Dashboard
                </motion.button>
                <motion.button 
                  className="btn btn-secondary" 
                  onClick={onLogout}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Logout ({user.username})
                </motion.button>
              </>
            ) : (
              <>
                <motion.button 
                  className="btn btn-secondary btn-signin" 
                  onClick={() => onNavigate('login')}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Sign In
                </motion.button>
                <motion.button 
                  className="btn btn-primary" 
                  onClick={() => onNavigate('signup')}
                  whileHover={{ scale: 1.05, boxShadow: "0 4px 14px rgba(89, 165, 232, 0.3)" }}
                  whileTap={{ scale: 0.95 }}
                >
                  Get Started
                </motion.button>
              </>
            )}

            {/* Dark mode toggle */}
            <motion.button 
              className="theme-toggle-btn"
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              whileHover={{ scale: 1.1, rotate: 12, backgroundColor: 'rgba(89, 165, 232, 0.15)' }}
              whileTap={{ scale: 0.9 }}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-charcoal)',
                cursor: 'pointer',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                backgroundColor: 'var(--divider)',
                width: '38px',
                height: '38px',
                marginLeft: '6px',
                transition: 'background-color var(--transition-fast)'
              }}
            >
              {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
            </motion.button>
          </motion.div>
        </motion.header>

        {/* Hero Section */}
        <motion.section 
          className="hero"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div 
            variants={fadeUpVariants}
            className="hero-tag"
          >
            <span className="hero-tag-dot"></span>
            <span>Australian Grocery Price Optimizer (MVP Demo - Simulated Data)</span>
          </motion.div>
          <motion.h1 
            variants={fadeUpVariants}
            className="hero-title text-gradient"
          >
            Stop Overpaying on Groceries.<br />
            Optimize Your Shopping Efficiently.
          </motion.h1>
          <motion.p 
            variants={fadeUpVariants}
            className="hero-subtitle"
          >
            Docket automatically compares prices between Coles and Woolworths, indexes weekly specials, extracts receipt data, and recommends the cheapest store to maximize your weekly savings.
          </motion.p>
          <motion.div 
            variants={fadeUpVariants}
            className="hero-ctas"
          >
            {user ? (
              <motion.button 
                className="btn btn-primary btn-lg" 
                onClick={() => onNavigate('dashboard')}
                whileHover={{ scale: 1.05, boxShadow: "0 6px 20px rgba(89, 165, 232, 0.4)" }}
                whileTap={{ scale: 0.96 }}
              >
                Enter Dashboard <ArrowRight size={18} style={{ marginLeft: '4px' }} />
              </motion.button>
            ) : (
              <>
                <motion.button 
                  className="btn btn-primary btn-lg" 
                  onClick={() => onNavigate('signup')}
                  whileHover={{ scale: 1.05, boxShadow: "0 6px 20px rgba(89, 165, 232, 0.4)" }}
                  whileTap={{ scale: 0.96 }}
                >
                  Create Free Account <ArrowRight size={18} style={{ marginLeft: '4px' }} />
                </motion.button>
                <motion.button 
                  className="btn btn-secondary btn-lg" 
                  onClick={onDemoLogin}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.96 }}
                >
                  Try Demo Account
                </motion.button>
              </>
            )}
          </motion.div>
        </motion.section>

        {/* Interactive Demo Widget with Floating Animation */}
        <motion.section 
          id="demo" 
          className="demo-section"
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, type: 'spring', stiffness: 60 }}
        >
          <h2 className="demo-title text-gradient">Compare Prices in Real-Time</h2>
          <p className="demo-subtitle">Select items to simulate Coles vs. Woolworths checkout baskets</p>
          
          <motion.div 
            className="demo-grid"
            animate={{ y: [0, -6, 0] }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {/* Left Card: Items */}
            <div className="glass-panel demo-card">
              <div className="demo-card-title">
                <span>Select Shopping Basket</span>
                <span className="badge badge-success">{selectedItems.length} Items</span>
              </div>
              
              <div className="demo-items-list">
                {demoCatalog.map(item => (
                  <motion.div 
                    key={item.id} 
                    className="demo-item"
                    whileHover={{ x: 4, backgroundColor: 'rgba(89, 165, 232, 0.05)' }}
                    transition={{ duration: 0.2 }}
                  >
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
                  </motion.div>
                ))}
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                *All grocery prices, discounts, and weekly specials are simulated mock data for this MVP demonstration.
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
                </>
              ) : (
                <div className="glass-panel" style={{ padding: '60px', textAlign: 'center', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                  Check some items in the basket to see savings analysis!
                </div>
              )}
            </div>
          </motion.div>
        </motion.section>

        {/* Features Section */}
        <section id="features" className="features-section">
          <h2 className="features-title text-gradient">Optimized Grocery Intelligence</h2>
          <p className="features-subtitle">Designed to remove input friction and maximize household budgets</p>
          
          <motion.div 
            className="features-grid"
            variants={gridVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.div 
              className="glass-panel feature-item-card"
              variants={cardVariants}
              whileHover={{ y: -8, boxShadow: "0 12px 24px rgba(89, 165, 232, 0.12)" }}
            >
              <div className="feature-icon-wrapper">
                <ScanLine size={24} />
              </div>
              <h3 className="feature-item-title">Receipt Upload & Extraction</h3>
              <p className="feature-item-desc">
                Simply upload your receipt. Our OCR extracts item details, while ML normalizes text (e.g., "WW CHKN BRST" to "Chicken Breast") and builds your personalized shopping profile.
              </p>
            </motion.div>

            <motion.div 
              className="glass-panel feature-item-card"
              variants={cardVariants}
              whileHover={{ y: -8, boxShadow: "0 12px 24px rgba(89, 165, 232, 0.12)" }}
            >
              <div className="feature-icon-wrapper">
                <TrendingUp size={24} />
              </div>
              <h3 className="feature-item-title">Price Intelligence Layer</h3>
              <p className="feature-item-desc">
                Compares weekly Coles and Woolworths specials to calculate your personal basket cost. Predicts future specials, detects substitutes, and spots historical pricing patterns.
              </p>
            </motion.div>

            <motion.div 
              className="glass-panel feature-item-card"
              variants={cardVariants}
              whileHover={{ y: -8, boxShadow: "0 12px 24px rgba(89, 165, 232, 0.12)" }}
            >
              <div className="feature-icon-wrapper">
                <MapPin size={24} />
              </div>
              <h3 className="feature-item-title">Regional Location Awareness</h3>
              <p className="feature-item-desc">
                Intelligent location detection maps your coordinates or address to local regions (Melbourne, Sydney, Brisbane). Ensures store distance profiles are accurate and relevant to your physical location.
              </p>
            </motion.div>

            <motion.div 
              className="glass-panel feature-item-card"
              variants={cardVariants}
              whileHover={{ y: -8, boxShadow: "0 12px 24px rgba(89, 165, 232, 0.12)" }}
            >
              <div className="feature-icon-wrapper">
                <TrendingUp size={24} />
              </div>
              <h3 className="feature-item-title">Coles vs. Woolworths Comparison</h3>
              <p className="feature-item-desc">
                Our recommendation engine uses a 6-phase scoring system to rank Coles and Woolworths based on your purchase frequency, catalog prices, weekly half-price specials, and travel distances.
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* How to Use Section */}
        <section id="how-to-use" className="how-to-use-section">
          <h2 className="features-title text-gradient">How to Use Docket</h2>
          <p className="features-subtitle">Get optimized grocery savings in 5 simple steps</p>
          
          <motion.div 
            className="how-to-use-steps"
            variants={gridVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
          >
            <motion.div 
              className="glass-panel step-card"
              variants={cardVariants}
              whileHover={{ y: -8, boxShadow: "0 12px 24px rgba(89, 165, 232, 0.12)" }}
            >
              <div className="step-badge">Step 1</div>
              <div className="step-icon-wrapper">
                <UserPlus size={22} />
              </div>
              <h3 className="step-title">Access the Dashboard</h3>
              <p className="step-desc">
                Click <strong>Get Started</strong> to create an account, or <strong>Try Demo</strong> in the header to login instantly.
              </p>
            </motion.div>

            <motion.div 
              className="glass-panel step-card"
              variants={cardVariants}
              whileHover={{ y: -8, boxShadow: "0 12px 24px rgba(89, 165, 232, 0.12)" }}
            >
              <div className="step-badge">Step 2</div>
              <div className="step-icon-wrapper">
                <UploadCloud size={22} />
              </div>
              <h3 className="step-title">Upload Receipts</h3>
              <p className="step-desc">
                Upload grocery receipts in the dashboard. The AI OCR extracts products and builds your profile.
              </p>
            </motion.div>

            <motion.div 
              className="glass-panel step-card"
              variants={cardVariants}
              whileHover={{ y: -8, boxShadow: "0 12px 24px rgba(89, 165, 232, 0.12)" }}
            >
              <div className="step-badge">Step 3</div>
              <div className="step-icon-wrapper">
                <ListPlus size={22} />
              </div>
              <h3 className="step-title">Build Shopping List</h3>
              <p className="step-desc">
                Search the catalog to add items or select from your personalized purchase history.
              </p>
            </motion.div>

            <motion.div 
              className="glass-panel step-card"
              variants={cardVariants}
              whileHover={{ y: -8, boxShadow: "0 12px 24px rgba(89, 165, 232, 0.12)" }}
            >
              <div className="step-badge">Step 4</div>
              <div className="step-icon-wrapper">
                <Sliders size={22} />
              </div>
              <h3 className="step-title">Set Preferences</h3>
              <p className="step-desc">
                Input your home address, fuel cost, travel limits, and toggle loyalty memberships.
              </p>
            </motion.div>

            <motion.div 
              className="glass-panel step-card"
              variants={cardVariants}
              whileHover={{ y: -8, boxShadow: "0 12px 24px rgba(89, 165, 232, 0.12)" }}
            >
              <div className="step-badge">Step 5</div>
              <div className="step-icon-wrapper">
                <Navigation size={22} />
              </div>
              <h3 className="step-title">Optimize & Save</h3>
              <p className="step-desc">
                Let Docket find the cheapest store basket. Click the Google Maps route and save!
              </p>
            </motion.div>
          </motion.div>
        </section>

        {/* Call to action */}
        <section style={{ textAlign: 'center', padding: '60px 0 100px 0' }}>
          <h2 className="text-gradient" style={{ fontSize: '2.5rem', marginBottom: '20px' }}>Start Saving on Groceries Today</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '600px', margin: '0 auto 32px auto' }}>
            Create an account in 10 seconds, input your shopping list manually or with a receipt upload, and get an optimized route to save.
          </p>
          <motion.button 
            className="btn btn-primary btn-lg" 
            onClick={() => onNavigate('signup')}
            whileHover={{ scale: 1.05, boxShadow: "0 6px 20px rgba(89, 165, 232, 0.4)" }}
            whileTap={{ scale: 0.96 }}
          >
            Sign Up Now Free <ArrowRight size={18} style={{ marginLeft: '4px' }} />
          </motion.button>
        </section>
      </div>
      <Footer />
    </div>
  );
}

export default LandingPage;
