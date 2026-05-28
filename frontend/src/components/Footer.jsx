import React from 'react';
import { Database, ShieldAlert, Terminal, Layers } from 'lucide-react';
import Logo from './Logo';

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="container footer-content">
        
        {/* Footer Top Grid */}
        <div className="footer-grid">
          
          {/* Brand and Project Info */}
          <div className="footer-brand-section">
            <div className="footer-brand">
              <Logo size={22} />
              <span>Docket</span>
            </div>
            <p className="footer-tagline">
              Smart shopping basket optimization made simple. Streamline your grocery savings by finding the cheapest stores near you.
            </p>
            <div className="mvp-disclaimer">
              <ShieldAlert size={16} className="disclaimer-icon" />
              <span>
                <strong>MVP Disclaimer:</strong> This is a Minimum Viable Product project. The catalog data is <strong>not live</strong> and is sourced from historical data available in the <code>aus_grocery_price_database</code> repository.
              </span>
            </div>
          </div>

          {/* Data and Terms */}
          <div className="footer-links-section">
            <h4 className="footer-heading">
              <Database size={16} /> Data & Policies
            </h4>
            <ul className="footer-links">
              <li>
                <strong>Data Source:</strong> Sourced from public pricing databases of leading supermarkets, updated based on historical Australian grocery datasets.
              </li>
              <li>
                <strong>Terms of Use:</strong> This platform is provided strictly for demonstration and testing purposes. Prices simulated do not represent real-time store offers.
              </li>
              <li>
                <strong>T&C:</strong> All product names, logos, and brands (including Coles and Woolworths) are property of their respective owners.
              </li>
            </ul>
          </div>

          {/* Tech Stack */}
          <div className="footer-tech-section">
            <h4 className="footer-heading">
              <Layers size={16} /> Tech Stack
            </h4>
            <div className="tech-tags">
              <span className="tech-tag"><Terminal size={12} /> React (Vite)</span>
              <span className="tech-tag"><Terminal size={12} /> C# ASP.NET Core</span>
              <span className="tech-tag"><Terminal size={12} /> Python (FastAPI)</span>
              <span className="tech-tag"><Terminal size={12} /> SQLite DB</span>
              <span className="tech-tag"><Terminal size={12} /> Entity Framework</span>
              <span className="tech-tag"><Terminal size={12} /> Render Deployment</span>
            </div>
          </div>

        </div>

        {/* Footer Bottom Divider & Copyright */}
        <div className="footer-bottom">
          <p>© 2026 Docket. All rights reserved. MVP Prototype.</p>
        </div>

      </div>
    </footer>
  );
}
